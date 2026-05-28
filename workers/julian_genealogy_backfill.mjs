/**
 * julian_genealogy_backfill.mjs
 * Query Wikidata family relations (P22/P25/P26/P40/P3373) สำหรับทุก QID ใน julian_all.json
 * Output: data/julian_family.json — raw family map { QID: { p, m, sp, ch, si } }
 *
 * Usage:
 *   node workers/julian_genealogy_backfill.mjs [--dry-run] [--limit N] [--time-budget N] [--resume]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const DRY_RUN     = process.argv.includes('--dry-run');
const RESUME      = process.argv.includes('--resume');
const LIMIT       = (() => { const i = process.argv.indexOf('--limit');       return i >= 0 ? parseInt(process.argv[i+1]) : Infinity; })();
const TIME_BUDGET = (() => { const i = process.argv.indexOf('--time-budget'); return i >= 0 ? parseInt(process.argv[i+1]) : 1500;    })();

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT        = 'JULIAN-bot/1.0 (horatad.com; genealogy-backfill)';
const BATCH_SIZE        = 50;   // P22/P25/P26/P40/P3373 query หนักกว่า P3447 — ลด batch
const DELAY_MS          = 2000; // conservative delay ป้องกัน 429
const CHECKPOINT_FILE   = 'workers/julian_genealogy_checkpoint.json';
const OUTPUT_FILE       = 'data/julian_family.json';

const START_TIME = Date.now();
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function elapsed()    { return Math.round((Date.now() - START_TIME) / 1000); }
function budgetLeft() { return TIME_BUDGET - elapsed(); }

async function fetchFamily(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  const sparql = `
    SELECT ?person ?father ?mother ?spouse ?child ?sibling WHERE {
      VALUES ?person { ${values} }
      OPTIONAL { ?person wdt:P22   ?father.  }
      OPTIONAL { ?person wdt:P25   ?mother.  }
      OPTIONAL { ?person wdt:P26   ?spouse.  }
      OPTIONAL { ?person wdt:P40   ?child.   }
      OPTIONAL { ?person wdt:P3373 ?sibling. }
    }`;
  const url  = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparql.trim())}&format=json`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' }
  });
  if (!resp.ok) throw new Error(`SPARQL HTTP ${resp.status}`);
  const json = await resp.json();

  const map = new Map(); // QID → { p, m, sp:Set, ch:Set, si:Set }
  const qid = uri => uri?.split('/').pop();

  for (const b of json.results.bindings) {
    const pq = qid(b.person?.value);
    if (!pq) continue;
    if (!map.has(pq)) map.set(pq, { p: null, m: null, sp: new Set(), ch: new Set(), si: new Set() });
    const entry = map.get(pq);
    if (b.father?.value)  entry.p = qid(b.father.value);
    if (b.mother?.value)  entry.m = qid(b.mother.value);
    if (b.spouse?.value)  entry.sp.add(qid(b.spouse.value));
    if (b.child?.value)   entry.ch.add(qid(b.child.value));
    if (b.sibling?.value) entry.si.add(qid(b.sibling.value));
  }
  return map;
}

async function main() {
  const records = JSON.parse(readFileSync('data/julian_all.json', 'utf8'));
  console.log(`Loaded ${records.length} records`);

  // ดึงเฉพาะ records ที่มี QID (wikidata: source หรือ qid field)
  const qidList = records
    .map(r => r.qid || (r.source?.startsWith('wikidata:') ? r.source.slice(9) : null))
    .filter(q => q && /^Q\d+$/.test(q));

  const uniqueQIDs = [...new Set(qidList)].slice(0, LIMIT);
  console.log(`Unique QIDs: ${uniqueQIDs.length} | Time budget: ${TIME_BUDGET}s`);

  // โหลด existing family data (ถ้ามี)
  let familyMap = {};
  if (existsSync(OUTPUT_FILE)) {
    try { familyMap = JSON.parse(readFileSync(OUTPUT_FILE, 'utf8')); }
    catch (e) { console.warn('Could not parse existing family file — starting fresh'); }
  }

  // สร้าง batches เฉพาะ QIDs ที่ยังไม่มีข้อมูล
  const todo = RESUME
    ? uniqueQIDs.filter(q => !(q in familyMap))
    : uniqueQIDs;

  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH_SIZE) batches.push(todo.slice(i, i + BATCH_SIZE));
  console.log(`Batches todo: ${batches.length} (${todo.length} QIDs)`);

  // Resume: หา startBatch จาก checkpoint
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
        writeFileSync(OUTPUT_FILE, JSON.stringify(familyMap));
      }
      console.log('STATUS=partial');
      return;
    }

    const batch = batches[bi];
    process.stderr.write(`  batch ${bi+1}/${batches.length} (${batch.length} QIDs, ${elapsed()}s)...`);
    await sleep(DELAY_MS);

    let batchMap;
    try {
      batchMap = await fetchFamily(batch);
    } catch (e) {
      process.stderr.write(` ERROR: ${e.message} — skip\n`);
      continue;
    }

    let batchLinks = 0;
    for (const [qid, rel] of batchMap.entries()) {
      // แปลง Set → Array สำหรับ JSON
      const entry = {
        p:  rel.p || null,
        m:  rel.m || null,
        sp: [...rel.sp],
        ch: [...rel.ch],
        si: [...rel.si],
      };
      // บันทึกเฉพาะที่มี relation จริง
      const hasAny = entry.p || entry.m || entry.sp.length || entry.ch.length || entry.si.length;
      if (hasAny) {
        familyMap[qid] = entry;
        batchLinks++;
        newLinks++;
      }
    }
    process.stderr.write(` ${batchLinks} with relations\n`);

    if (DRY_RUN) { process.stderr.write('[dry-run] ไม่เขียนไฟล์\n'); continue; }

    // flush ทุก 10 batches
    if ((bi + 1) % 10 === 0) writeFileSync(OUTPUT_FILE, JSON.stringify(familyMap));

    lastBatchDone = bi;
  }

  // เสร็จครบ — ลบ checkpoint + save final
  if (!DRY_RUN) {
    writeFileSync(OUTPUT_FILE, JSON.stringify(familyMap));
    if (existsSync(CHECKPOINT_FILE)) {
      const { unlinkSync } = await import('fs');
      unlinkSync(CHECKPOINT_FILE);
    }
  }

  const total = Object.keys(familyMap).length;
  console.log(`\n═══════════════════════════════════════`);
  console.log(`Genealogy Backfill — Complete`);
  console.log(`QIDs processed   : ${lastBatchDone < 0 ? 0 : (lastBatchDone + 1) * BATCH_SIZE}`);
  console.log(`New links found  : ${newLinks}`);
  console.log(`Total in family  : ${total}`);
  console.log(`Output           : ${OUTPUT_FILE}`);
  console.log(`Elapsed          : ${elapsed()}s`);
  console.log(`═══════════════════════════════════════`);
  console.log('STATUS=complete');
}

main().catch(e => { console.error(e); process.exit(1); });
