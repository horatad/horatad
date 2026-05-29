/**
 * julian_genealogy_expand.mjs
 * ────────────────────────────────────────────────────────────────────────────
 * Ancestor/relative frontier expansion — ขยายเครือญาติให้ "สายยาวต่อเนื่อง" ขึ้น
 *
 * ปัญหาที่แก้: julian_genealogy_backfill เก็บ "ความสัมพันธ์" ของคนใน DB (p/m/sp/ch/si)
 * แต่ตัวญาติเองหลายคน *ไม่อยู่ใน DB* → genealogy.json (in-DB only) ตัดทิ้ง → สายขาด
 * worker นี้ดึงญาติที่ถูกอ้างถึงแต่ยังไม่อยู่ใน DB เข้ามาเป็น record เต็ม
 * → in-DB links เพิ่ม → สายเครือญาติ/ราชวงศ์ traverse ได้ลึกขึ้น (research asset #1)
 *
 * Frontier = QID ที่ปรากฏใน julian_family.json (p/m/sp/ch/si) แต่ไม่อยู่ใน dbQIDs
 * Iterative deepening: รันซ้ำ → ญาติใหม่ที่เพิ่งเข้ามามี family ของตัวเอง = frontier รอบถัดไป
 *
 * Guardrails:
 *   - precision >= 11 (วัน) เท่านั้น — ไม่มีวันเกิดระดับวัน = ข้าม (กัน record ขยะ)
 *   - source = "genealogy_expansion:Q..." — provenance แยกชัด (track DB growth จาก expansion)
 *   - bound ต่อ run ด้วย --limit + --time-budget (กัน frontier ระเบิด)
 *   - เขียนลง raw bucket genealogy_expansion.jsonl → merge fold เข้า julian_all (low priority)
 *
 * Usage:
 *   node workers/julian_genealogy_expand.mjs [--limit N] [--time-budget N] [--resume] [--dry-run]
 *   node workers/julian_genealogy_expand.mjs --from-bindings <file.json>   # offline test (no network)
 * ────────────────────────────────────────────────────────────────────────────
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { appendRawBatch } from './julian_raw_writer.mjs';

const DRY_RUN      = process.argv.includes('--dry-run');
const RESUME       = process.argv.includes('--resume');
const LIMIT        = (() => { const i = process.argv.indexOf('--limit');        return i >= 0 ? parseInt(process.argv[i+1]) : 3000; })();
const TIME_BUDGET  = (() => { const i = process.argv.indexOf('--time-budget');  return i >= 0 ? parseInt(process.argv[i+1]) : 1500; })();
const FROM_BIND    = (() => { const i = process.argv.indexOf('--from-bindings'); return i >= 0 ? process.argv[i+1] : null; })();

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT        = 'JULIAN-bot/1.0 (horatad.com; genealogy-expansion)';
const BATCH_SIZE        = 50;
const DELAY_MS          = 2000;
const CHECKPOINT_FILE   = 'workers/julian_genealogy_expand_checkpoint.json';
const ALL_FILE          = 'data/julian_all.json';
const FAMILY_FILE       = 'data/julian_family.json';
const RAW_BUCKET        = 'genealogy_expansion';

// ── JD — ต้องตรงกับ engine.js get_j() / julian_scraper.mjs (Jan 1 2000 CE = 730428) ──
const JD_EPOCH_VAL = 730428;
const JD_EPOCH_MS  = Date.UTC(2000, 0, 1);
function get_j(d, m, y) {
  return JD_EPOCH_VAL + Math.round((Date.UTC(y, m - 1, d) - JD_EPOCH_MS) / 86400000);
}
function parseISODate(iso) {
  if (!iso) return null;
  const m = iso.match(/^([+-]?\d{4,})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]);
  if (y < 200 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d, jd: get_j(d, mo, y) };
}

const START_TIME = Date.now();
const sleep      = ms => new Promise(r => setTimeout(r, ms));
const elapsed    = () => Math.round((Date.now() - START_TIME) / 1000);
const budgetLeft = () => TIME_BUDGET - elapsed();

const qidOf = r => r.qid || (typeof r.source === 'string' && r.source.startsWith('wikidata:') ? r.source.slice(9) : null);
const qidUri = uri => uri?.split('/').pop();

/**
 * รวบรวม frontier QIDs จาก family map — ญาติทุกคนที่ถูกอ้างถึง (p/m/sp/ch/si)
 * @param {object} familyMap  { QID: {p,m,sp[],ch[],si[]} }
 * @param {Set}    dbQIDs     QID ที่อยู่ใน DB แล้ว
 * @returns {string[]} frontier QIDs (ไม่อยู่ใน DB, unique, valid)
 */
export function collectFrontier(familyMap, dbQIDs) {
  const frontier = new Set();
  const add = q => { if (q && /^Q\d+$/.test(q) && !dbQIDs.has(q)) frontier.add(q); };
  for (const rel of Object.values(familyMap)) {
    add(rel.p); add(rel.m);
    for (const q of (rel.sp || [])) add(q);
    for (const q of (rel.ch || [])) add(q);
    for (const q of (rel.si || [])) add(q);
  }
  return [...frontier];
}

/**
 * แปลง SPARQL bindings → records (pure — test ได้ offline ไม่ต้อง network)
 * @param {Array} bindings  json.results.bindings จาก Wikidata
 * @returns {{records:Array, skipped:object}}
 */
export function bindingsToRecords(bindings) {
  // group ตาม person (label/img/sitelinks อาจซ้ำหลายแถวจาก OPTIONAL fan-out)
  const byQid = new Map();
  for (const b of bindings) {
    const q = qidUri(b.person?.value);
    if (!q) continue;
    if (!byQid.has(q)) byQid.set(q, b);
  }

  const records = [];
  const skipped = { no_name: 0, no_birth: 0, low_prec: 0 };

  for (const [qid, b] of byQid.entries()) {
    const name = b.personLabel?.value?.trim();
    if (!name || /^Q\d+$/.test(name)) { skipped.no_name++; continue; }

    const prec = parseInt(b.birthPrec?.value || '0');
    if (prec < 11) { skipped.low_prec++; continue; }   // guardrail: ต้องมีวันเกิดระดับวัน

    const birth = parseISODate(b.birth?.value);
    if (!birth) { skipped.no_birth++; continue; }

    const death       = parseISODate(b.death?.value);
    const birthVal     = b.birth?.value || '';
    const tIdx         = birthVal.indexOf('T');
    const time_utc     = (prec >= 13 && tIdx >= 0) ? birthVal.slice(tIdx + 1, tIdx + 6) : null;
    const accuracy     = (time_utc && prec >= 14) ? 'C' : 'D';
    const sitelinks    = b.links?.value ? parseInt(b.links.value) : null;

    records.push({
      qid,
      jd: birth.jd,
      name,
      type: 'human',
      country: b.countryCode?.value ? b.countryCode.value.toUpperCase().slice(0, 2) : null,
      tier: 3,                       // frontier relatives = tier ต่ำ (ไม่ใช่ query เป้าหมายหลัก)
      lat: null, lng: null,
      time_utc, lagna_sign: null,
      relate_id: death ? [death.jd] : null,
      source: `${RAW_BUCKET}:${qid}`,
      source_type: 'internet',
      accuracy,
      sitelinks,
      img: b.img?.value ? decodeURIComponent(b.img.value.split('/').pop()).replace(/_/g, ' ') : null,
      validated_count: 0,
      confidence: time_utc ? 0.95 : 0.85,
      notes: 'genealogy frontier expansion',
    });
  }
  return { records, skipped };
}

async function fetchFrontier(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  const sparql = `
    SELECT ?person ?personLabel ?birth ?birthPrec ?death ?countryCode ?img ?links WHERE {
      VALUES ?person { ${values} }
      ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
      FILTER(?birthPrec >= 11)
      OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
      OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
      OPTIONAL { ?person wdt:P18 ?img. }
      OPTIONAL { ?person wikibase:sitelinks ?links. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
    }`;
  const url  = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparql.trim())}&format=json`;
  const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' } });
  if (!resp.ok) throw new Error(`SPARQL HTTP ${resp.status}`);
  const json = await resp.json();
  return json.results.bindings;
}

async function main() {
  // ── offline test mode ───────────────────────────────────────────────────────
  if (FROM_BIND) {
    const bindings = JSON.parse(readFileSync(FROM_BIND, 'utf8'));
    const { records, skipped } = bindingsToRecords(Array.isArray(bindings) ? bindings : bindings.results.bindings);
    console.log(`[from-bindings] records=${records.length} skipped=${JSON.stringify(skipped)}`);
    console.log(JSON.stringify(records.slice(0, 5), null, 2));
    return;
  }

  if (!existsSync(ALL_FILE))    { console.error(`✗ ${ALL_FILE} not found (checkout julian-data ก่อน)`); process.exit(1); }
  if (!existsSync(FAMILY_FILE)) { console.error(`✗ ${FAMILY_FILE} not found (รัน genealogy_backfill ก่อน)`); process.exit(1); }

  const records   = JSON.parse(readFileSync(ALL_FILE, 'utf8'));
  const familyMap = JSON.parse(readFileSync(FAMILY_FILE, 'utf8'));
  const dbQIDs    = new Set();
  for (const r of records) { const q = qidOf(r); if (q) dbQIDs.add(q); }

  const frontier = collectFrontier(familyMap, dbQIDs).slice(0, LIMIT);
  console.log(`DB: ${dbQIDs.size} ดวง | family entries: ${Object.keys(familyMap).length} | frontier (ญาติยังไม่อยู่ใน DB): ${frontier.length} | budget ${TIME_BUDGET}s`);

  if (!frontier.length) { console.log('ไม่มี frontier — DB ครอบคลุมญาติทั้งหมดแล้ว'); console.log('STATUS=complete'); return; }

  const batches = [];
  for (let i = 0; i < frontier.length; i += BATCH_SIZE) batches.push(frontier.slice(i, i + BATCH_SIZE));

  let startBatch = 0;
  if (RESUME && existsSync(CHECKPOINT_FILE)) {
    try { startBatch = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8')).batch_index || 0; } catch (_) {}
    console.log(`Resuming from batch ${startBatch}/${batches.length}`);
  }

  const collected = [];
  const totalSkip = { no_name: 0, no_birth: 0, low_prec: 0 };

  for (let bi = startBatch; bi < batches.length; bi++) {
    if (budgetLeft() < 30) {
      console.log(`\n⏱ Time budget almost exhausted (${elapsed()}s) — saving checkpoint @ batch ${bi}`);
      if (!DRY_RUN) {
        writeFileSync(CHECKPOINT_FILE, JSON.stringify({ batch_index: bi, total_batches: batches.length, saved_at: new Date().toISOString() }, null, 2));
        if (collected.length) appendRawBatch(RAW_BUCKET, collected);
      }
      console.log(`STATUS=partial added=${collected.length}`);
      return;
    }

    process.stderr.write(`  batch ${bi+1}/${batches.length} (${batches[bi].length} QIDs, ${elapsed()}s)...`);
    await sleep(DELAY_MS);

    let bindings;
    try { bindings = await fetchFrontier(batches[bi]); }
    catch (e) { process.stderr.write(` ERROR: ${e.message} — skip\n`); continue; }

    const { records: recs, skipped } = bindingsToRecords(bindings);
    for (const k in totalSkip) totalSkip[k] += skipped[k];
    collected.push(...recs);
    process.stderr.write(` +${recs.length} new records\n`);
  }

  // เสร็จครบ — flush + ลบ checkpoint
  if (!DRY_RUN) {
    if (collected.length) appendRawBatch(RAW_BUCKET, collected);
    if (existsSync(CHECKPOINT_FILE)) { const { unlinkSync } = await import('fs'); unlinkSync(CHECKPOINT_FILE); }
  }

  console.log(`\n═══════════════════════════════════════`);
  console.log(`Genealogy Expansion — Complete`);
  console.log(`Frontier processed : ${frontier.length}`);
  console.log(`New records added  : ${collected.length}`);
  console.log(`Skipped            : ${JSON.stringify(totalSkip)}`);
  console.log(`Raw bucket         : data/julian_raw/${RAW_BUCKET}.jsonl  (รัน julian_merge.mjs → fold เข้า julian_all)`);
  console.log(`Elapsed            : ${elapsed()}s`);
  console.log(`═══════════════════════════════════════`);
  console.log(`STATUS=complete added=${collected.length}`);
}

// รันเฉพาะเมื่อเรียกตรง (ไม่ใช่ import เพื่อ test)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error(e); process.exit(1); });
}
