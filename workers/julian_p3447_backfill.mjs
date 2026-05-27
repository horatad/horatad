/**
 * julian_p3447_backfill.mjs
 * Backfill Wikidata P3447 (Astrotheme identifier) for existing records.
 *
 * Supports checkpoint/resume — safe to run repeatedly until all records done.
 * Saves progress before timeout and continues from where it left off next run.
 *
 * Usage:
 *   node workers/julian_p3447_backfill.mjs [--dry-run] [--limit N] [--time-budget N] [--resume]
 *   --dry-run      : print summary only, do not write
 *   --limit N      : process only first N QIDs (for testing)
 *   --time-budget N: stop after N seconds (default 1500 = 25min), save checkpoint
 *   --resume       : continue from last checkpoint (workers/julian_p3447_checkpoint.json)
 */

import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';

const DRY_RUN     = process.argv.includes('--dry-run');
const RESUME      = process.argv.includes('--resume');
const LIMIT       = (() => { const i = process.argv.indexOf('--limit');       return i >= 0 ? parseInt(process.argv[i + 1]) : Infinity; })();
const TIME_BUDGET = (() => { const i = process.argv.indexOf('--time-budget'); return i >= 0 ? parseInt(process.argv[i + 1]) : 1500; })();

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT        = 'JULIAN-bot/1.0 (horatad.com; p3447-backfill)';
const BATCH_SIZE        = 100;
const DELAY_MS          = 1500;
const CHECKPOINT_FILE   = 'workers/julian_p3447_checkpoint.json';

const START_TIME = Date.now();

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function elapsed() { return Math.round((Date.now() - START_TIME) / 1000); }
function budgetLeft() { return TIME_BUDGET - elapsed(); }

async function fetchP3447(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  const sparql  = `SELECT ?person ?astroId WHERE { VALUES ?person { ${values} } ?person wdt:P3447 ?astroId. }`;
  const url = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' }
  });
  if (!resp.ok) throw new Error(`SPARQL HTTP ${resp.status}`);
  const json = await resp.json();
  const map  = new Map();
  for (const b of json.results.bindings) {
    map.set(b.person.value.split('/').pop(), b.astroId.value);
  }
  return map;
}

function saveCheckpoint(batchIndex, totalBatches) {
  writeFileSync(CHECKPOINT_FILE, JSON.stringify({ batch_index: batchIndex, total_batches: totalBatches, saved_at: new Date().toISOString() }, null, 2));
}

async function main() {
  const records = JSON.parse(readFileSync('data/julian_all.json', 'utf8'));
  console.log(`Loaded ${records.length} records`);
  console.log(`Time budget: ${TIME_BUDGET}s | DRY_RUN: ${DRY_RUN} | RESUME: ${RESUME}`);

  const wikiRecords = records
    .map((r, i) => ({ idx: i, qid: r.source?.startsWith('wikidata:') ? r.source.slice(9) : null }))
    .filter(r => r.qid && /^Q\d+$/.test(r.qid))
    .slice(0, LIMIT);

  console.log(`Records with wikidata: source: ${wikiRecords.length}`);

  // Build batches
  const batches = [];
  for (let i = 0; i < wikiRecords.length; i += BATCH_SIZE) {
    batches.push(wikiRecords.slice(i, i + BATCH_SIZE));
  }
  console.log(`Total batches: ${batches.length}`);

  // Resume from checkpoint
  let startBatch = 0;
  if (RESUME && existsSync(CHECKPOINT_FILE)) {
    const cp = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
    startBatch = cp.batch_index || 0;
    console.log(`Resuming from batch ${startBatch}/${batches.length} (saved ${cp.saved_at})`);
  } else if (RESUME) {
    console.log('No checkpoint found — starting from beginning');
  }

  const updatedRecords = [...records];
  let updated = 0;
  let lastBatchDone = startBatch - 1;

  for (let bi = startBatch; bi < batches.length; bi++) {
    // Check time budget before each batch (leave 30s buffer for commit)
    if (budgetLeft() < 30) {
      console.log(`\n⏱ Time budget almost exhausted (${elapsed()}s elapsed, ${budgetLeft()}s left) — saving checkpoint`);
      if (!DRY_RUN) saveCheckpoint(bi, batches.length);
      break;
    }

    const batch = batches[bi];
    const qids  = batch.map(r => r.qid);
    process.stderr.write(`  batch ${bi + 1}/${batches.length} (${qids.length} QIDs, ${elapsed()}s elapsed)...`);

    let p3447Map;
    try {
      p3447Map = await fetchP3447(qids);
    } catch (e) {
      process.stderr.write(` ERROR: ${e.message}\n`);
      continue;
    }
    process.stderr.write(` found ${p3447Map.size} P3447 links\n`);

    for (const { idx, qid } of batch) {
      const astroId = p3447Map.get(qid);
      if (!astroId) continue;
      const rec = updatedRecords[idx];
      updatedRecords[idx] = {
        ...rec,
        source: `astrotheme:${astroId}`,
        time_utc: ['07:16', '07:17', '07:18'].includes(rec.time_utc) ? null : rec.time_utc,
      };
      updated++;
    }

    lastBatchDone = bi;
    await sleep(DELAY_MS);
  }

  const allDone = lastBatchDone >= batches.length - 1;

  console.log(`\n── Summary ──`);
  console.log(`Records updated: ${updated}`);
  console.log(`Batches done: ${lastBatchDone + 1 - startBatch} (${startBatch}→${lastBatchDone + 1} of ${batches.length})`);
  console.log(allDone ? '✅ All batches complete' : `⏸ Partial — ${batches.length - lastBatchDone - 1} batches remaining`);

  if (!DRY_RUN && updated > 0) {
    writeFileSync('data/julian_all.json', JSON.stringify(updatedRecords, null, 0));
    console.log(`Wrote data/julian_all.json`);
  }

  if (!DRY_RUN && allDone && existsSync(CHECKPOINT_FILE)) {
    unlinkSync(CHECKPOINT_FILE);
    console.log('Checkpoint cleared (all done)');
  }

  // Signal for workflow
  const status = allDone ? 'complete' : 'partial';
  console.log(`\nSTATUS=${status}`);
  process.exitCode = 0;
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
