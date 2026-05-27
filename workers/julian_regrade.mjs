/**
 * julian_regrade.mjs
 * Re-compute accuracy for all records using julian_evidence.mjs rules.
 *
 * Run this after:
 *   - julian_p3447_backfill.mjs (updates source → astrotheme:...)
 *   - julian_astrotheme.mjs enrichment (adds time_utc for astrotheme: records)
 *   - Any change to evidence scoring rules in julian_evidence.mjs
 *
 * This is the "apply rules" step — safe to run repeatedly (idempotent).
 * Accuracy field is always COMPUTED, never manually edited.
 *
 * Usage: node workers/julian_regrade.mjs [--dry-run] [--verbose]
 */

import { readFileSync, writeFileSync } from 'fs';
import { deriveAccuracy, checkPlaceholder } from './julian_evidence.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const records = JSON.parse(readFileSync('data/julian_all.json', 'utf8'));
console.log(`Loaded ${records.length} records`);
console.log(DRY_RUN ? '[DRY RUN]' : '[APPLY]');

// Extract Wikidata precision from source (stored in Wikidata records during scrape)
// We need to reconstruct _evidence from available fields
function buildEvidence(rec) {
  const evidence = {};

  // Wikidata precision: stored indirectly — precision=14 records have non-placeholder time_utc
  // We can infer from accuracy field left by scraper (C = prec>=14, D = prec<14)
  // But since we're redesigning — use time_utc as proxy:
  //   - Non-null, non-placeholder time_utc from wikidata: → might be prec=13 or 14
  //   - Without stored precision we can't be sure → rely on source rules instead
  if (rec.source?.startsWith('wikidata:') && rec.time_utc && !checkPlaceholder(rec.time_utc)) {
    // If original accuracy was C, it means scraper detected prec=14
    evidence.wikidata_precision = rec.accuracy === 'C' ? 14 : 13;
  }

  return Object.keys(evidence).length > 0 ? evidence : undefined;
}

const before = { A: 0, B: 0, C: 0, D: 0, F: 0 };
const after  = { A: 0, B: 0, C: 0, D: 0, F: 0 };
const changes = [];

const regraded = records.map((rec, idx) => {
  before[rec.accuracy] = (before[rec.accuracy] || 0) + 1;

  const enriched = { ...rec, _evidence: buildEvidence(rec) };
  const { grade, reason } = deriveAccuracy(enriched);

  after[grade] = (after[grade] || 0) + 1;

  if (grade !== rec.accuracy) {
    changes.push({ idx, name: rec.name, source: rec.source, old: rec.accuracy, new: grade, reason });
  }

  const result = { ...rec, accuracy: grade };
  // Remove internal evidence field from output
  delete result._evidence;
  return result;
});

// ── Report ────────────────────────────────────────────────────────────────────
console.log('\n── Accuracy Distribution ──');
console.log('Grade  Before  →  After  (diff)');
for (const g of ['A', 'B', 'C', 'D', 'F']) {
  const b = before[g] || 0, a = after[g] || 0;
  const diff = a - b;
  const sign = diff > 0 ? '+' : '';
  console.log(`  ${g}:   ${String(b).padStart(5)}  →  ${String(a).padStart(5)}  (${sign}${diff})`);
}
console.log(`\nTotal changes: ${changes.length} records`);

if (VERBOSE && changes.length > 0) {
  console.log('\n── Changes ──');
  for (const c of changes.slice(0, 20)) {
    console.log(`  [${c.old}→${c.new}] ${c.name} (${c.source}) — ${c.reason}`);
  }
  if (changes.length > 20) console.log(`  ... and ${changes.length - 20} more`);
}

if (!DRY_RUN && changes.length > 0) {
  writeFileSync('data/julian_all.json', JSON.stringify(regraded, null, 0));
  console.log(`\nWrote data/julian_all.json (${regraded.length} records)`);
} else if (DRY_RUN) {
  console.log('\n[Dry run — run without --dry-run to apply]');
} else {
  console.log('\nNo changes needed — all records already correctly graded');
}
