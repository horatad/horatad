#!/usr/bin/env node
/**
 * julian_coverage_probe.mjs
 * วัด "ความครบถ้วน" ของแต่ละแกน lineage ก่อนตัดสินใจสร้าง collector
 *
 * คำถามที่ตอบ: แต่ละ relation property มีกี่คนใน DB ที่มี + ปลายทางอยู่ใน DB ด้วย?
 * (both_in_db = คู่ที่ "ใช้วิจัย relational ได้จริง" — ตัวเลขที่ใช้ตัดสิน)
 *
 * ไม่สร้าง collector — แค่ probe แล้ว rank ว่าแกนไหนคุ้มลงแรง
 *
 * Output: data/julian_coverage_report.json
 *
 * Usage:
 *   node workers/julian_coverage_probe.mjs [--resume] [--limit N] [--time-budget S] [--dry-run]
 *   node workers/julian_coverage_probe.mjs --from-rows <file.json>   # offline test
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const DRY_RUN     = process.argv.includes('--dry-run');
const RESUME      = process.argv.includes('--resume');
const LIMIT       = (() => { const i = process.argv.indexOf('--limit');       return i >= 0 ? parseInt(process.argv[i+1]) : Infinity; })();
const TIME_BUDGET = (() => { const i = process.argv.indexOf('--time-budget'); return i >= 0 ? parseInt(process.argv[i+1]) : 1500;    })();
const FROM_ROWS   = (() => { const i = process.argv.indexOf('--from-rows');   return i >= 0 ? process.argv[i+1] : null; })();

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT        = 'JULIAN-bot/1.0 (horatad.com; coverage-probe)';
const BATCH_SIZE        = 60;
const DELAY_MS          = 2000;
const CHECKPOINT_FILE   = 'workers/julian_coverage_checkpoint.json';
const OUTPUT_FILE       = 'data/julian_coverage_report.json';
const ALL_FILE          = 'data/julian_all.json';

// แกนที่ probe — direct wdt: properties (person → target person)
export const LINEAGE_PROPS = {
  P22:   { axis: 'family',  th: 'พ่อ' },
  P25:   { axis: 'family',  th: 'แม่' },
  P26:   { axis: 'family',  th: 'คู่สมรส' },
  P40:   { axis: 'family',  th: 'ลูก' },
  P3373: { axis: 'family',  th: 'พี่น้อง' },
  P184:  { axis: 'academic',th: 'อาจารย์ที่ปรึกษา (advisor)' },
  P185:  { axis: 'academic',th: 'ลูกศิษย์ปริญญาเอก (doctoral student)' },
  P1066: { axis: 'teacher', th: 'เป็นศิษย์ของ (student of)' },
  P802:  { axis: 'teacher', th: 'ลูกศิษย์ (student)' },
  P1038: { axis: 'kin_ext', th: 'ญาติ (relative)' },
};

const START_TIME = Date.now();
const sleep = ms => new Promise(r => setTimeout(r, ms));
const elapsed    = () => Math.round((Date.now() - START_TIME) / 1000);
const budgetLeft = () => TIME_BUDGET - elapsed();

/**
 * aggregate — pure: rows + dbQIDs → per-property stats (testable offline)
 * @param rows [{ person, prop, target }]
 * @param dbQIDs Set<QID>
 */
export function aggregate(rows, dbQIDs) {
  const stats = {};
  const ensure = p => (stats[p] ||= { persons: new Set(), links_total: 0, links_both_in_db: 0, partners_in_db: new Set() });
  for (const r of rows) {
    if (!r.person || !r.prop || !r.target) continue;
    const s = ensure(r.prop);
    s.persons.add(r.person);
    s.links_total++;
    if (dbQIDs.has(r.target)) { s.links_both_in_db++; s.partners_in_db.add(r.target); }
  }
  // serialize Sets → counts
  const out = {};
  for (const [p, s] of Object.entries(stats)) {
    out[p] = {
      prop: p,
      axis: LINEAGE_PROPS[p]?.axis || '?',
      th: LINEAGE_PROPS[p]?.th || p,
      persons_with: s.persons.size,
      links_total: s.links_total,
      links_both_in_db: s.links_both_in_db,      // ← ตัวเลขตัดสินใจ
      distinct_partners_in_db: s.partners_in_db.size,
    };
  }
  return out;
}

async function fetchRelations(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  const props  = Object.keys(LINEAGE_PROPS).map(p => `wdt:${p}`).join(' ');
  const sparql = `
    SELECT ?person ?prop ?target WHERE {
      VALUES ?person { ${values} }
      VALUES ?prop { ${props} }
      ?person ?prop ?target.
      FILTER(STRSTARTS(STR(?target), "http://www.wikidata.org/entity/Q"))
    }`;
  const url  = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparql.trim())}&format=json`;
  const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' } });
  if (!resp.ok) throw new Error(`SPARQL HTTP ${resp.status}`);
  const json = await resp.json();
  const qid = uri => uri?.split('/').pop();
  const propOf = uri => uri?.split('/').pop();  // wdt:P184 → "P184" via direct/ ; handle below
  const rows = [];
  for (const b of json.results.bindings) {
    const person = qid(b.person?.value);
    const target = qid(b.target?.value);
    // ?prop binding คือ http://www.wikidata.org/prop/direct/P184 → เอา P184
    const prop   = b.prop?.value?.split('/').pop();
    if (person && target && prop) rows.push({ person, prop, target });
  }
  return rows;
}

function report(allRows, dbQIDs, partial) {
  const perProp = aggregate(allRows, dbQIDs);
  // รวมตาม axis
  const perAxis = {};
  for (const s of Object.values(perProp)) {
    const a = (perAxis[s.axis] ||= { axis: s.axis, links_both_in_db: 0, persons_with: 0 });
    a.links_both_in_db += s.links_both_in_db;
    a.persons_with += s.persons_with;
  }
  const ranked = Object.values(perProp).sort((a, b) => b.links_both_in_db - a.links_both_in_db);
  const out = {
    generated: new Date().toISOString(),
    partial: !!partial,
    db_size: dbQIDs.size,
    sampled_rows: allRows.length,
    by_property: ranked,
    by_axis: Object.values(perAxis).sort((a, b) => b.links_both_in_db - a.links_both_in_db),
  };
  if (!DRY_RUN) writeFileSync(OUTPUT_FILE, JSON.stringify(out, null, 2));
  console.log(`\n📊 Coverage probe — DB ${dbQIDs.size.toLocaleString()} ดวง${partial ? ' (partial)' : ''}`);
  console.log(`property            แกน        คนที่มี   คู่(both in DB)`);
  for (const s of ranked) {
    console.log(`  ${s.prop.padEnd(6)} ${s.th.slice(0,18).padEnd(20)} ${String(s.persons_with).padStart(7)} ${String(s.links_both_in_db).padStart(10)}`);
  }
  console.log('\nby axis (คู่ใช้วิจัยได้):');
  for (const a of out.by_axis) console.log(`  ${a.axis.padEnd(10)} ${String(a.links_both_in_db).padStart(8)}`);
  if (!DRY_RUN) console.log(`→ ${OUTPUT_FILE}`);
  return out;
}

async function main() {
  if (FROM_ROWS) {
    const rows = JSON.parse(readFileSync(FROM_ROWS, 'utf8'));
    const dbQIDs = new Set(rows.map(r => r.person).concat(rows.filter(r => r._in_db).map(r => r.target)));
    report(rows, dbQIDs, false);
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

  let startBatch = 0, allRows = [];
  if (RESUME && existsSync(CHECKPOINT_FILE)) {
    const cp = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
    startBatch = cp.batch_index || 0;
    allRows = cp.rows || [];
    console.log(`Resuming from batch ${startBatch}/${batches.length} (${allRows.length} rows)`);
  }

  for (let bi = startBatch; bi < batches.length; bi++) {
    if (budgetLeft() < 30) {
      if (!DRY_RUN) writeFileSync(CHECKPOINT_FILE, JSON.stringify({ batch_index: bi, total_batches: batches.length, rows: allRows, saved_at: new Date().toISOString() }));
      console.log('STATUS=partial');
      report(allRows, dbQIDs, true);
      return;
    }
    process.stderr.write(`  batch ${bi+1}/${batches.length} (${elapsed()}s)...`);
    await sleep(DELAY_MS);
    try {
      const rows = await fetchRelations(batches[bi]);
      allRows.push(...rows);
      process.stderr.write(` +${rows.length} rows\n`);
    } catch (e) {
      process.stderr.write(` ERROR: ${e.message} — skip\n`);
    }
  }
  if (!DRY_RUN && existsSync(CHECKPOINT_FILE)) writeFileSync(CHECKPOINT_FILE, JSON.stringify({ done: true, saved_at: new Date().toISOString() }));
  report(allRows, dbQIDs, false);
  console.log('STATUS=complete');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(e => { console.error(e); process.exit(1); });
}
