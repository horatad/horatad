/**
 * julian_p3447_backfill.mjs
 * Backfill Wikidata P3447 (Astrotheme identifier) for existing records.
 *
 * Problem this solves:
 *   ASTROTHEME_SERIES queries ran after ERA_SERIES had already inserted the same QIDs.
 *   Because seen_qids dedup prevents re-inserting, those records never got
 *   their source updated to "astrotheme:{id}" — they remain "wikidata:Q...".
 *   The Astrotheme enricher only fetches time_utc for records with "astrotheme:" source.
 *   Result: all ASTROTHEME_SERIES data is wasted, nobody gets B-grade birth times.
 *
 * Fix:
 *   1. Read all existing records with source="wikidata:Q..."
 *   2. Batch-query Wikidata SPARQL for their P3447 values
 *   3. Update source → "astrotheme:{id}" for those that have P3447
 *   4. Write updated data/julian_all.json
 *   5. (Next run) Astrotheme enricher fetches birth times → B-grade automatically
 *
 * Usage:
 *   node workers/julian_p3447_backfill.mjs [--dry-run] [--limit N]
 *   --dry-run  : print summary only, do not write
 *   --limit N  : process only first N QIDs (for testing)
 */

import { readFileSync, writeFileSync } from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT   = (() => {
  const i = process.argv.indexOf('--limit');
  return i >= 0 ? parseInt(process.argv[i + 1]) : Infinity;
})();

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT        = 'JULIAN-bot/1.0 (horatad.com; p3447-backfill)';
const BATCH_SIZE        = 100;   // VALUES batch per SPARQL query
const DELAY_MS          = 1500;  // polite gap between requests

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── SPARQL: batch-query P3447 for QIDs ────────────────────────────────────────
async function fetchP3447(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  const sparql  = `
    SELECT ?person ?astroId WHERE {
      VALUES ?person { ${values} }
      ?person wdt:P3447 ?astroId.
    }`;

  const url = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' }
  });
  if (!resp.ok) throw new Error(`SPARQL HTTP ${resp.status}`);

  const json = await resp.json();
  const map  = new Map(); // QID → astroId
  for (const b of json.results.bindings) {
    const qid     = b.person.value.split('/').pop();
    const astroId = b.astroId.value;
    map.set(qid, astroId);
  }
  return map;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const records = JSON.parse(readFileSync('data/julian_all.json', 'utf8'));
  console.log(`Loaded ${records.length} records`);

  // Extract Wikidata QIDs from records with wikidata: source
  const wikiRecords = records
    .map((r, i) => ({ idx: i, qid: r.source?.startsWith('wikidata:') ? r.source.slice(9) : null }))
    .filter(r => r.qid && /^Q\d+$/.test(r.qid))
    .slice(0, LIMIT);

  console.log(`Records with wikidata: source: ${wikiRecords.length}`);
  console.log(DRY_RUN ? '[DRY RUN — no changes written]' : '[APPLY mode]');

  // Batch-query Wikidata
  let updated = 0;
  const batches = [];
  for (let i = 0; i < wikiRecords.length; i += BATCH_SIZE) {
    batches.push(wikiRecords.slice(i, i + BATCH_SIZE));
  }
  console.log(`\nQuerying Wikidata in ${batches.length} batches of ${BATCH_SIZE}...`);

  const updatedRecords = [...records];

  for (let bi = 0; bi < batches.length; bi++) {
    const batch    = batches[bi];
    const qids     = batch.map(r => r.qid);
    process.stderr.write(`  batch ${bi + 1}/${batches.length} (${qids.length} QIDs)...`);

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
      // Only update source — accuracy will be recomputed by Astrotheme enricher
      // when it fetches birth time (sets B via julian_evidence.mjs rules)
      updatedRecords[idx] = {
        ...rec,
        source: `astrotheme:${astroId}`,
        // Clear placeholder times that came from Wikidata timestamps
        time_utc: ['07:16', '07:17', '07:18'].includes(rec.time_utc) ? null : rec.time_utc,
      };
      updated++;
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n── Summary ──`);
  console.log(`Records updated: ${updated} / ${wikiRecords.length} Wikidata records`);
  console.log(`These records now have source="astrotheme:{id}"`);
  console.log(`Next: Astrotheme enricher will fetch birth times → automatic B-grade`);

  if (!DRY_RUN && updated > 0) {
    writeFileSync('data/julian_all.json', JSON.stringify(updatedRecords, null, 0));
    console.log(`\nWrote data/julian_all.json (${updatedRecords.length} records)`);

    // Count new astrotheme: sources
    const astroCount = updatedRecords.filter(r => r.source?.startsWith('astrotheme:')).length;
    console.log(`Total astrotheme: sources now: ${astroCount}`);
  } else if (DRY_RUN) {
    console.log('\n[Dry run — run without --dry-run to apply]');
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
