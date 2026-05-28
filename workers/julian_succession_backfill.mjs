/**
 * julian_succession_backfill.mjs
 * Query Wikidata position succession (P39 + P1365/P1366) สำหรับทุก QID ใน julian_all.json
 *
 * P1365 = replaces (บุคคลนี้เข้ามาแทนใคร)
 * P1366 = replaced by (ใครเข้ามาแทนบุคคลนี้)
 * P39   = position held (ตำแหน่งที่ดำรง — เพื่อ label ว่าเป็นตำแหน่งอะไร)
 *
 * Output: data/julian_succession.json
 *   { QID: { prev: [{ q, pos }], next: [{ q, pos }] } }
 *   prev = คนที่บุคคลนี้เข้ามาแทน (P1365)
 *   next = คนที่เข้ามาแทนบุคคลนี้ (P1366)
 *   pos  = QID ของตำแหน่ง (เช่น Q11696 = President of the United States)
 *
 * Usage:
 *   node workers/julian_succession_backfill.mjs [--dry-run] [--limit N] [--time-budget N] [--resume]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const DRY_RUN     = process.argv.includes('--dry-run');
const RESUME      = process.argv.includes('--resume');
const LIMIT       = (() => { const i = process.argv.indexOf('--limit');       return i >= 0 ? parseInt(process.argv[i+1]) : Infinity; })();
const TIME_BUDGET = (() => { const i = process.argv.indexOf('--time-budget'); return i >= 0 ? parseInt(process.argv[i+1]) : 1500;    })();

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT        = 'JULIAN-bot/1.0 (horatad.com; succession-backfill)';
const BATCH_SIZE        = 50;
const DELAY_MS          = 2000;
const CHECKPOINT_FILE   = 'workers/julian_succession_checkpoint.json';
const OUTPUT_FILE       = 'data/julian_succession.json';

const START_TIME = Date.now();
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function elapsed()    { return Math.round((Date.now() - START_TIME) / 1000); }
function budgetLeft() { return TIME_BUDGET - elapsed(); }

async function fetchSuccession(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  // Query 1: P39 statement-level — P1365/P1366 as qualifiers (main source)
  const sparql = `
    SELECT DISTINCT ?person ?posLabel ?prev ?next WHERE {
      VALUES ?person { ${values} }
      ?person p:P39 ?stmt.
      ?stmt ps:P39 ?pos.
      OPTIONAL { ?stmt pq:P1365 ?prev. }
      OPTIONAL { ?stmt pq:P1366 ?next. }
      FILTER(?prev != ?person && ?next != ?person)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }`;
  const url  = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparql.trim())}&format=json`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' }
  });
  if (!resp.ok) throw new Error(`SPARQL HTTP ${resp.status}`);
  const json = await resp.json();

  const map  = new Map(); // QID → { prev: Map<prevQID, posQID>, next: Map<nextQID, posQID> }
  const qid  = uri => uri?.split('/').pop();

  for (const b of json.results.bindings) {
    const pq  = qid(b.person?.value);
    if (!pq) continue;
    if (!map.has(pq)) map.set(pq, { prev: new Map(), next: new Map() });
    const entry = map.get(pq);
    const posQ  = qid(b.pos?.value) ?? null;
    if (b.prev?.value) entry.prev.set(qid(b.prev.value), posQ);
    if (b.next?.value) entry.next.set(qid(b.next.value), posQ);
  }
  return map;
}

async function main() {
  const records = JSON.parse(readFileSync('data/julian_all.json', 'utf8'));
  console.log(`Loaded ${records.length} records`);

  const qidList = records
    .map(r => r.qid || (r.source?.startsWith('wikidata:') ? r.source.slice(9) : null))
    .filter(q => q && /^Q\d+$/.test(q));
  const uniqueQIDs = [...new Set(qidList)].slice(0, LIMIT);
  console.log(`Unique QIDs: ${uniqueQIDs.length} | Time budget: ${TIME_BUDGET}s`);

  // โหลด existing succession data
  let succMap = {};
  if (existsSync(OUTPUT_FILE)) {
    try { succMap = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8')); }
    catch (e) { console.warn('Could not parse existing succession file — starting fresh'); }
  }

  const todo = RESUME ? uniqueQIDs.filter(q => !(q in succMap)) : uniqueQIDs;
  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH_SIZE) batches.push(todo.slice(i, i + BATCH_SIZE));
  console.log(`Batches todo: ${batches.length} (${todo.length} QIDs)`);

  let startBatch = 0;
  if (RESUME && existsSync(CHECKPOINT_FILE)) {
    const cp = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
    startBatch = cp.batch_index || 0;
    console.log(`Resuming from batch ${startBatch}/${batches.length} (saved ${cp.saved_at})`);
  }

  let newLinks = 0;
  let lastBatchDone = startBatch - 1;

  for (let bi = startBatch; bi < batches.length; bi++) {
    if (budgetLeft() < 30) {
      console.log(`\n⏱ Time budget almost exhausted (${elapsed()}s) — saving checkpoint`);
      if (!DRY_RUN) {
        writeFileSync(CHECKPOINT_FILE, JSON.stringify({ batch_index: bi, total_batches: batches.length, saved_at: new Date().toISOString() }, null, 2));
        writeFileSync(OUTPUT_FILE, JSON.stringify(succMap));
      }
      console.log('STATUS=partial');
      return;
    }

    const batch = batches[bi];
    process.stderr.write(`  batch ${bi+1}/${batches.length} (${batch.length} QIDs, ${elapsed()}s)...`);
    await sleep(DELAY_MS);

    let batchMap;
    try {
      batchMap = await fetchSuccession(batch);
    } catch (e) {
      process.stderr.write(` ERROR: ${e.message} — skip\n`);
      continue;
    }

    let batchLinks = 0;
    for (const [qid, rel] of batchMap.entries()) {
      // แปลง Map → Array of { q, pos }
      const prev = [...rel.prev.entries()].map(([q, pos]) => pos ? { q, pos } : { q });
      const next = [...rel.next.entries()].map(([q, pos]) => pos ? { q, pos } : { q });
      if (prev.length || next.length) {
        succMap[qid] = { prev, next };
        batchLinks++;
        newLinks++;
      }
    }
    process.stderr.write(` ${batchLinks} with succession\n`);

    if (DRY_RUN) continue;
    if ((bi + 1) % 10 === 0) writeFileSync(OUTPUT_FILE, JSON.stringify(succMap));
    lastBatchDone = bi;
  }

  if (!DRY_RUN) {
    writeFileSync(OUTPUT_FILE, JSON.stringify(succMap));
    if (existsSync(CHECKPOINT_FILE)) {
      const { unlinkSync } = await import('fs');
      unlinkSync(CHECKPOINT_FILE);
    }
  }

  const total = Object.keys(succMap).length;
  console.log(`\n═══════════════════════════════════════`);
  console.log(`Succession Backfill — Complete`);
  console.log(`New links found  : ${newLinks}`);
  console.log(`Total in map     : ${total}`);
  console.log(`Output           : ${OUTPUT_FILE}`);
  console.log(`Elapsed          : ${elapsed()}s`);
  console.log(`═══════════════════════════════════════`);
  console.log('STATUS=complete');
}

main().catch(e => { console.error(e); process.exit(1); });
