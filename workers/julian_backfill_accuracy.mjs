#!/usr/bin/env node
// JULIAN Backfill Accuracy — re-grade C records จาก wikidata source
//
// บริบท:
//   scraper.mjs:166 (2026-05-24) เปลี่ยนกฎ accuracy grading:
//     เดิม: time_utc → C (precision >= 13 ก็ C)
//     ใหม่: time_utc && precision >= 14 → C (precision = 13 = round-hour editor guess)
//   records เดิม 588 records เคย graded ตอนกฎเก่า → ต้อง re-query precision + re-grade
//
// วิธีใช้:
//   node workers/julian_backfill_accuracy.mjs              # dry-run (default)
//   node workers/julian_backfill_accuracy.mjs --apply      # เขียนทับ julian_all.json
//   node workers/julian_backfill_accuracy.mjs --limit 50   # ทดสอบ batch เดียว
//
// Sandbox: 403 (Wikidata not in allowlist) — ต้องรันใน GHA workflow
//
// Side effect ตอน downgrade C → D:
//   - accuracy: 'C' → 'D'
//   - time_utc: เก็บไว้ (round-hour editor guess) — ใช้กับ accuracy=D เพื่อ flag noise
//   - confidence: 0.95 → 0.85 (ตาม scraper.mjs:178)
//   - notes: 'backfill-2026-05-25: wikidata precision<14 downgrade'

import { readFileSync, writeFileSync } from 'fs';

const DATA_FILE  = 'data/julian_all.json';
const WIKIDATA_URL = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'JULIAN-backfill/1.0 (horatad.com; accuracy-regrade)';
const BATCH_SIZE = 50;

const ARGS  = process.argv.slice(2);
const APPLY = ARGS.includes('--apply');
const LIMIT = (() => {
  const i = ARGS.indexOf('--limit');
  return i >= 0 ? parseInt(ARGS[i + 1]) : Infinity;
})();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sparqlPrecision(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  const sparql = `
    SELECT ?qid ?prec WHERE {
      VALUES ?qid { ${values} }
      ?qid p:P569 ?st.
      ?st psv:P569 ?v.
      ?v wikibase:timePrecision ?prec.
    }
  `;
  const url = `${WIKIDATA_URL}?query=${encodeURIComponent(sparql.trim())}&format=json`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'User-Agent': USER_AGENT },
      });
      if (res.status === 429 || res.status === 503) {
        const wait = (attempt + 1) * 5000;
        console.error(`  retry ${attempt + 1}/3 after ${wait}ms (status ${res.status})`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.results.bindings;
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(2000);
    }
  }
  return [];
}

// ── Main ──────────────────────────────────────────────────────────────────────
const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
const records = Array.isArray(data) ? data : data.records || data.data || [];

const targets = records.filter(r =>
  r.accuracy === 'C' && /^wikidata:Q\d+$/.test(r.source || '')
);

console.log(`Loaded ${records.length} records | C from wikidata: ${targets.length}`);
const sliced = targets.slice(0, LIMIT);
if (sliced.length < targets.length) console.log(`--limit ${LIMIT} → ${sliced.length} records`);

const precisionMap = new Map();  // QID → max precision found

for (let i = 0; i < sliced.length; i += BATCH_SIZE) {
  const batch = sliced.slice(i, i + BATCH_SIZE);
  const qids  = batch.map(r => r.source.split(':')[1]);
  console.log(`Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(sliced.length / BATCH_SIZE)} (${qids.length} qids)`);

  const bindings = await sparqlPrecision(qids);
  for (const b of bindings) {
    const qid  = b.qid?.value?.split('/').pop();
    const prec = parseInt(b.prec?.value || '0');
    if (!qid) continue;
    // เก็บ max precision (คนคนหนึ่งอาจมีหลาย P569 statement)
    if (!precisionMap.has(qid) || precisionMap.get(qid) < prec) {
      precisionMap.set(qid, prec);
    }
  }
  await sleep(1000);  // เคารพ Wikidata rate limit
}

// ── Apply re-grade ────────────────────────────────────────────────────────────
let keepC = 0, downgrade = 0, notFound = 0;
const changes = [];

for (const r of sliced) {
  const qid  = r.source.split(':')[1];
  const prec = precisionMap.get(qid);

  if (prec === undefined) {
    notFound++;
    continue;
  }
  if (prec >= 14) {
    keepC++;
    continue;
  }
  // Downgrade
  downgrade++;
  changes.push({
    qid, name: r.name, jd: r.jd, time_utc: r.time_utc, precision: prec,
    before: { accuracy: r.accuracy, confidence: r.confidence },
  });
  if (APPLY) {
    r.accuracy   = 'D';
    r.confidence = 0.85;
    r.notes      = (r.notes ? r.notes + '; ' : '') + 'backfill-2026-05-25:wikidata-prec<14';
  }
}

console.log('\n━━━ Summary ━━━');
console.log(`Targets       : ${sliced.length}`);
console.log(`Keep C (≥14)  : ${keepC}`);
console.log(`Downgrade → D : ${downgrade}`);
console.log(`Not found     : ${notFound}`);

if (changes.length > 0) {
  console.log('\n━━━ Sample downgrades (first 5) ━━━');
  for (const c of changes.slice(0, 5)) {
    console.log(`  ${c.qid} ${c.name} | jd=${c.jd} time=${c.time_utc} prec=${c.precision} → D`);
  }
}

if (APPLY) {
  writeFileSync(DATA_FILE, JSON.stringify(records));
  console.log(`\n✓ wrote ${DATA_FILE} (${records.length} records, ${downgrade} downgraded)`);
} else {
  console.log('\n(dry-run — รัน --apply เพื่อเขียนทับไฟล์)');
}
