#!/usr/bin/env node
/**
 * julian_title_lineage.mjs
 * สร้าง "สายผู้ครองตำแหน่ง/แชมป์รายปี" (title lineage) จากรางวัล P166 + ปี P585
 *
 * ต่างจาก julian_succession_backfill.mjs:
 *   - succession = office ที่มี P1365/P1366 ชัด (นายกฯ/กษัตริย์/แชมป์หมากรุกโลก)
 *   - title lineage = ตำแหน่งที่ไม่มี prev/next qualifier แต่เรียงตามปีได้
 *     (นางงามจักรวาล, แชมป์มวยบางสาย, รางวัลประจำปี) → sequence เองจากปีที่ได้รับ
 *
 * Output: data/julian_title_lineage.json  { QID: { prev:[{q,pos}], next:[{q,pos}] } }
 *         (รูปแบบเดียวกับ succession → analyzer อ่านรวมได้เลย)
 *
 * Usage:
 *   node workers/julian_title_lineage.mjs [--resume] [--limit N] [--time-budget S] [--dry-run]
 *   node workers/julian_title_lineage.mjs --from-tuples <file.json>   # offline test
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const DRY_RUN     = process.argv.includes('--dry-run');
const RESUME      = process.argv.includes('--resume');
const LIMIT       = (() => { const i = process.argv.indexOf('--limit');       return i >= 0 ? parseInt(process.argv[i+1]) : Infinity; })();
const TIME_BUDGET = (() => { const i = process.argv.indexOf('--time-budget'); return i >= 0 ? parseInt(process.argv[i+1]) : 1500;    })();
const FROM_TUPLES = (() => { const i = process.argv.indexOf('--from-tuples'); return i >= 0 ? process.argv[i+1] : null; })();

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT        = 'JULIAN-bot/1.0 (horatad.com; title-lineage)';
const BATCH_SIZE        = 80;
const DELAY_MS          = 2000;
const CHECKPOINT_FILE   = 'workers/julian_title_lineage_checkpoint.json';
const OUTPUT_FILE       = 'data/julian_title_lineage.json';
const ALL_FILE          = 'data/julian_all.json';

const START_TIME = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const elapsed    = () => Math.round((Date.now() - START_TIME) / 1000);
const budgetLeft = () => TIME_BUDGET - elapsed();

// ── normalize ชื่อตำแหน่ง: ตัดปี 4 หลักท้าย/ต้น ออก เพื่อรวมกลุ่ม ───────────────
// "Miss Universe 1990" + "Miss Universe 1991" → "Miss Universe"
export function normalizeTitle(label) {
  if (!label) return null;
  return label
    .replace(/\b(1[5-9]\d{2}|20\d{2})\b/g, '')   // ตัดปี ค.ศ.
    .replace(/\s{2,}/g, ' ')
    .replace(/[\s\-–—,:]+$/g, '')
    .replace(/^[\s\-–—,:]+/g, '')
    .trim() || null;
}

/**
 * buildLineages — pure: tuples → succession-shaped map (testable offline)
 * @param tuples [{ person, title, year }]  (person/title = QID หรือ label, year = number)
 * @param dbQIDs Set<QID>  (กรองเฉพาะคนใน DB)
 * @returns { map: {QID:{prev,next}}, stats: {titles, edges} }
 */
export function buildLineages(tuples, dbQIDs) {
  // group by normalized title
  const byTitle = new Map();   // titleKey → [{ person, year }]
  for (const t of tuples) {
    if (!t.person || t.year == null) continue;
    if (dbQIDs && !dbQIDs.has(t.person)) continue;
    const key = normalizeTitle(t.title) || t.titleQ || t.title;
    if (!key) continue;
    if (!byTitle.has(key)) byTitle.set(key, []);
    byTitle.get(key).push({ person: t.person, year: t.year });
  }

  const map = {};   // QID → { prev: [{q,pos}], next: [{q,pos}] }
  let edges = 0, titles = 0;
  const ensure = q => (map[q] ||= { prev: [], next: [] });
  const hasEdge = (arr, q, pos) => arr.some(e => e.q === q && e.pos === pos);

  for (const [title, holdersRaw] of byTitle.entries()) {
    // เรียงตามปี + dedup คนซ้ำปีเดียวกัน (เก็บครั้งแรก) + ตัดคนเดิมติดกัน
    const holders = holdersRaw
      .slice()
      .sort((a, b) => a.year - b.year);
    // ลำดับผู้ครองที่ "แตกต่าง" เรียงเวลา (ข้ามปีที่เป็นคนเดิมซ้ำ)
    const seq = [];
    for (const h of holders) {
      if (seq.length && seq[seq.length - 1].person === h.person) continue;
      seq.push(h);
    }
    if (seq.length < 2) continue;   // ต้องมีอย่างน้อย 2 คนจึงเป็น "สาย"
    titles++;
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i].person, b = seq[i + 1].person;
      if (a === b) continue;
      const ea = ensure(a), eb = ensure(b);
      if (!hasEdge(ea.next, b, title)) { ea.next.push({ q: b, pos: title }); edges++; }
      if (!hasEdge(eb.prev, a, title)) { eb.prev.push({ q: a, pos: title }); }
    }
  }
  return { map, stats: { titles, edges } };
}

// ── Wikidata fetch: P166 award + P585 point-in-time ───────────────────────────
async function fetchAwards(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  const sparql = `
    SELECT DISTINCT ?person ?award ?awardLabel ?when WHERE {
      VALUES ?person { ${values} }
      ?person p:P166 ?stmt.
      ?stmt ps:P166 ?award.
      OPTIONAL { ?stmt pq:P585 ?when. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
  const url  = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparql.trim())}&format=json`;
  const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' } });
  if (!resp.ok) throw new Error(`SPARQL HTTP ${resp.status}`);
  const json = await resp.json();
  const qid = uri => uri?.split('/').pop();
  const tuples = [];
  for (const b of json.results.bindings) {
    const person = qid(b.person?.value);
    const titleQ = qid(b.award?.value);
    const title  = b.awardLabel?.value || titleQ;
    const yr = b.when?.value ? parseInt(b.when.value.slice(0, 4)) : null;
    if (person && title && yr) tuples.push({ person, title, titleQ, year: yr });
  }
  return tuples;
}

async function main() {
  // ── offline test path ───────────────────────────────────────────────────
  if (FROM_TUPLES) {
    const tuples = JSON.parse(readFileSync(FROM_TUPLES, 'utf8'));
    const dbQIDs = new Set(tuples.map(t => t.person));
    const { map, stats } = buildLineages(tuples, dbQIDs);
    console.log(`(offline) titles=${stats.titles} edges=${stats.edges}`);
    if (!DRY_RUN) writeFileSync(OUTPUT_FILE, JSON.stringify(map, null, 2));
    return;
  }

  const records = JSON.parse(readFileSync(ALL_FILE, 'utf8'));
  const qidList = records
    .map(r => r.qid || (r.source?.startsWith('wikidata:') ? r.source.slice(9) : null))
    .filter(q => q && /^Q\d+$/.test(q));
  const dbQIDs = new Set(qidList);
  const uniqueQIDs = [...dbQIDs].slice(0, LIMIT);
  console.log(`Loaded ${records.length} records | unique QIDs ${uniqueQIDs.length} | budget ${TIME_BUDGET}s`);

  const batches = [];
  for (let i = 0; i < uniqueQIDs.length; i += BATCH_SIZE) batches.push(uniqueQIDs.slice(i, i + BATCH_SIZE));

  let startBatch = 0;
  let allTuples = [];
  if (RESUME && existsSync(CHECKPOINT_FILE)) {
    const cp = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
    startBatch = cp.batch_index || 0;
    allTuples = cp.tuples || [];
    console.log(`Resuming from batch ${startBatch}/${batches.length} (${allTuples.length} tuples)`);
  }

  for (let bi = startBatch; bi < batches.length; bi++) {
    if (budgetLeft() < 30) {
      if (!DRY_RUN) writeFileSync(CHECKPOINT_FILE, JSON.stringify({ batch_index: bi, total_batches: batches.length, tuples: allTuples, saved_at: new Date().toISOString() }));
      console.log('STATUS=partial');
      flush(allTuples, dbQIDs);
      return;
    }
    process.stderr.write(`  batch ${bi+1}/${batches.length} (${elapsed()}s)...`);
    await sleep(DELAY_MS);
    try {
      const tuples = await fetchAwards(batches[bi]);
      allTuples.push(...tuples);
      process.stderr.write(` +${tuples.length} award-tuples\n`);
    } catch (e) {
      process.stderr.write(` ERROR: ${e.message} — skip\n`);
    }
  }

  // เสร็จครบ → ลบ checkpoint + เขียน output
  if (!DRY_RUN && existsSync(CHECKPOINT_FILE)) writeFileSync(CHECKPOINT_FILE, JSON.stringify({ done: true, saved_at: new Date().toISOString() }));
  flush(allTuples, dbQIDs);
  console.log('STATUS=complete');
}

function flush(tuples, dbQIDs) {
  const { map, stats } = buildLineages(tuples, dbQIDs);
  console.log(`✅ title lineage: ${stats.titles} ตำแหน่ง · ${stats.edges} edges · จาก ${tuples.length} award-tuples`);
  if (!DRY_RUN) { writeFileSync(OUTPUT_FILE, JSON.stringify(map)); console.log(`→ ${OUTPUT_FILE}`); }
}

// รันเฉพาะเมื่อเรียกตรง (ไม่ใช่ import)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error(e); process.exit(1); });
}
