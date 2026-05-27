#!/usr/bin/env node
/**
 * julian_full_scan.mjs
 * Full 2,100-combination lift scan with statistical significance testing.
 *
 * Tests ALL: 10 transit × 10 natal × 7 aspects × 3 event_types
 * Applies Benjamini-Hochberg FDR correction to prevent false discovery.
 * Goal: rigorously determine if MR-MR is a genuine outlier or one of many flukes.
 *
 * Output: ml/models/julian_full_scan.json + console report
 * Usage:  node workers/julian_full_scan.mjs [--min-n 50] [--top 30]
 */

import { readFileSync, writeFileSync } from 'fs';
import { get_data } from '../v3/engine.js';

const args     = process.argv.slice(2);
const MIN_N    = parseInt(args[args.indexOf('--min-n') + 1]  || '50',  10);
const TOP_N    = parseInt(args[args.indexOf('--top')   + 1]  || '30',  10);
const OUT_FILE = 'ml/models/julian_full_scan.json';

const PLANET_NAMES  = ['SU','MO','MA','ME','JU','VE','SA','RA','KE','MR'];
const ASPECT_NAMES  = {0:'conj',1:'dist1',2:'sext',3:'squa',4:'trin',5:'dist5',6:'oppo'};
const EVENT_TYPES   = ['award_received','death','position_start'];
const JD_EPOCH_VAL  = 730428;
const JD_EPOCH_MS   = Date.UTC(2000, 0, 1);
const CONFIDENCE_MIN = 0.85;

// ── erfc approximation (Abramowitz & Stegun 7.1.26) ──────────────────────────
function erfc(x) {
  const t = 1 / (1 + 0.3275911 * x);
  const y = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741
             + t * (-1.453152027 + t * 1.061405429))));
  return y * Math.exp(-x * x);
}

// Chi-square p-value (df=1)
function chiSqP(chi2) {
  if (chi2 <= 0) return 1;
  return erfc(Math.sqrt(chi2 / 2) / Math.sqrt(2));
}

// ── Load & compute ────────────────────────────────────────────────────────────
function jdToDate(jd) {
  const ms = JD_EPOCH_MS + (jd - JD_EPOCH_VAL) * 86400000;
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

const jdCache = new Map();
function getSigns(jd) {
  if (jdCache.has(jd)) return jdCache.get(jd);
  const { y, m, d } = jdToDate(jd);
  let raw;
  try { raw = get_data(d, m, y, 6, 0); } catch (_) { return null; }
  if (!Array.isArray(raw) || raw.length < 11) return null;
  const signs = [];
  for (let i = 1; i <= 10; i++) signs.push(Math.trunc(raw[i] / 1800) % 12);
  jdCache.set(jd, signs);
  return signs;
}

console.log('Loading events...');
const lines  = readFileSync('data/julian_events.jsonl', 'utf8').split('\n').filter(Boolean);
const events = [];
for (const l of lines) {
  try {
    const ev = JSON.parse(l);
    if ((ev.confidence ?? 0.9) >= CONFIDENCE_MIN) events.push(ev);
  } catch (_) {}
}
console.log(`Events: ${events.length}`);

console.log('Computing planet positions...');
const records = [];
const seen = new Set();
for (const ev of events) {
  const key = `${ev.person_key}|${ev.event_type}|${ev.event_jd}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const natal   = getSigns(ev.birth_jd);
  const transit = getSigns(ev.event_jd);
  if (!natal || !transit) continue;
  records.push({
    event_type: ev.event_type,
    natal,
    transit,
    age: (ev.event_jd - ev.birth_jd) / 365.25,
  });
}
console.log(`Records: ${records.length}`);

// Group by event type
const byType = {};
for (const et of EVENT_TYPES) byType[et] = records.filter(r => r.event_type === et);
for (const et of EVENT_TYPES) console.log(`  ${et}: ${byType[et].length}`);

// ── Full 2,100 combination scan ───────────────────────────────────────────────
console.log('\nScanning 2,100 combinations...');
const results = [];

for (const eventType of EVENT_TYPES) {
  const classRecs = byType[eventType];
  const N_class   = classRecs.length;
  const N_all     = records.length;

  for (let ti = 0; ti < 10; ti++) {        // transit planet
    for (let ni = 0; ni < 10; ni++) {      // natal planet
      for (let dist = 0; dist <= 6; dist++) { // aspect distance

        // Count occurrences
        let a = 0; // class WITH aspect
        for (const r of classRecs) {
          const raw = Math.abs(r.natal[ni] - r.transit[ti]);
          if (Math.min(raw, 12 - raw) === dist) a++;
        }
        let c = 0; // non-class WITH aspect
        for (const r of records) {
          if (r.event_type === eventType) continue;
          const raw = Math.abs(r.natal[ni] - r.transit[ti]);
          if (Math.min(raw, 12 - raw) === dist) c++;
        }

        const b = N_class - a;            // class WITHOUT aspect
        const d = (N_all - N_class) - c;  // non-class WITHOUT aspect
        const N = a + b + c + d;

        const classRate = a / N_class;
        const allRate   = (a + c) / N_all;
        const lift      = allRate > 0 ? classRate / allRate : 0;

        // Chi-square (2×2 contingency table, Yates correction for small cells)
        const expected_a = (a + b) * (a + c) / N;
        const chi2 = N * Math.pow(Math.abs(a * d - b * c) - N / 2, 2) /
                     ((a + b) * (c + d) * (a + c) * (b + d) + 1e-10);
        const pRaw = chiSqP(chi2);

        results.push({
          event_type:     eventType,
          transit_planet: PLANET_NAMES[ti],
          natal_planet:   PLANET_NAMES[ni],
          aspect:         ASPECT_NAMES[dist],
          dist,
          class_n:        a,
          all_n:          a + c,
          class_total:    N_class,
          all_total:      N_all,
          lift:           +lift.toFixed(4),
          p_raw:          pRaw,
          tals_rule:      `transit_${PLANET_NAMES[ti]} ${ASPECT_NAMES[dist]} natal_${PLANET_NAMES[ni]}`,
        });
      }
    }
  }
}

// ── Benjamini-Hochberg FDR correction ─────────────────────────────────────────
// Sort by p_raw ascending, assign rank, compute p_adj = p_raw × m / rank
const m = results.length;
const sorted = [...results].sort((a, b) => a.p_raw - b.p_raw);
sorted.forEach((r, i) => {
  r.bh_rank   = i + 1;
  r.p_adj     = Math.min(1, r.p_raw * m / (i + 1));
});
// Propagate: p_adj must be monotone (enforce step-down)
for (let i = sorted.length - 2; i >= 0; i--) {
  sorted[i].p_adj = Math.min(sorted[i].p_adj, sorted[i + 1].p_adj);
}
// Copy p_adj back to results
const adjMap = new Map(sorted.map(r =>
  [`${r.event_type}|${r.transit_planet}|${r.natal_planet}|${r.dist}`, r.p_adj]));
for (const r of results) {
  r.p_adj = +(adjMap.get(`${r.event_type}|${r.transit_planet}|${r.natal_planet}|${r.dist}`) ?? 1).toFixed(6);
}

// ── Significant results (FDR q < 0.05, min sample) ───────────────────────────
const significant = results
  .filter(r => r.p_adj < 0.05 && r.class_n >= MIN_N)
  .sort((a, b) => b.lift - a.lift);

const highLift = results
  .filter(r => r.lift >= 1.5 && r.class_n >= MIN_N)
  .sort((a, b) => b.lift - a.lift);

// ── Find MR-MR death rank ─────────────────────────────────────────────────────
const allByLift = results
  .filter(r => r.class_n >= MIN_N)
  .sort((a, b) => b.lift - a.lift);
const mrMrRank = allByLift.findIndex(
  r => r.event_type === 'death' && r.transit_planet === 'MR' &&
       r.natal_planet === 'MR' && r.dist === 0) + 1;

// ── Lift distribution histogram ───────────────────────────────────────────────
const validResults = results.filter(r => r.class_n >= MIN_N);
const liftBins = new Array(20).fill(0); // 0.0-0.1, 0.1-0.2, ..., 1.9-2.0, 2.0+
for (const r of validResults) {
  const bin = Math.min(Math.floor(r.lift / 0.1), 19);
  liftBins[bin]++;
}

// ── Save ─────────────────────────────────────────────────────────────────────
writeFileSync(OUT_FILE, JSON.stringify({
  meta: { total_combinations: results.length, min_n: MIN_N, fdr_q: 0.05,
          records: records.length, generated: new Date().toISOString() },
  significant,
  high_lift: highLift,
  all_results: results,
}, null, 2));

// ── Console report ────────────────────────────────────────────────────────────
console.log('\n═══ LIFT DISTRIBUTION (all combinations, class_n ≥ ' + MIN_N + ') ═══');
console.log('(Expected: normal around 1.0 — outliers are genuine signals)\n');
for (let i = 0; i < 20; i++) {
  const lo = (i * 0.1).toFixed(1), hi = ((i + 1) * 0.1).toFixed(1);
  const bar = '█'.repeat(Math.round(liftBins[i] / 5));
  const marker = i >= 15 ? ' ◄ HIGH' : i <= 4 ? ' ◄ LOW' : '';
  if (liftBins[i] > 0)
    console.log(`  ${lo}-${hi}  ${String(liftBins[i]).padStart(4)}  ${bar}${marker}`);
}

console.log(`\n  Total with class_n ≥ ${MIN_N}: ${validResults.length} / 2,100`);
console.log(`  Significant after FDR (q<0.05): ${significant.length}`);
console.log(`  High-lift (≥1.5): ${highLift.length}`);

console.log(`\n═══ MR conjunction natal_MR (death) — RANK in full scan ═══`);
console.log(`  Rank: ${mrMrRank} / ${allByLift.length} (higher = more extreme)`);
const mrMr = results.find(r =>
  r.event_type === 'death' && r.transit_planet === 'MR' &&
  r.natal_planet === 'MR' && r.dist === 0);
if (mrMr) {
  console.log(`  Lift: ${mrMr.lift}  |  class_n: ${mrMr.class_n}  |  p_adj: ${mrMr.p_adj}`);
}

console.log(`\n═══ TOP ${TOP_N} HIGH-LIFT (class_n ≥ ${MIN_N}, sorted by lift) ═══\n`);
console.log('  ' + 'Rule'.padEnd(48) + 'Event'.padEnd(17) +
            'Lift'.padStart(6) + '  N(class)' + '  p_adj');
console.log('  ' + '─'.repeat(90));

for (const r of allByLift.slice(0, TOP_N)) {
  const sig = r.p_adj < 0.001 ? '***' : r.p_adj < 0.01 ? '** ' : r.p_adj < 0.05 ? '*  ' : '   ';
  console.log(
    `  ${r.tals_rule.padEnd(48)}` +
    `${r.event_type.padEnd(17)}` +
    `${r.lift.toFixed(3).padStart(6)}` +
    `  ${String(r.class_n).padStart(8)}` +
    `  ${r.p_adj.toExponential(1)} ${sig}`
  );
}

// ── Significant results that are NOT MR-MR ────────────────────────────────────
const otherSig = significant.filter(r =>
  !(r.transit_planet === 'MR' && r.natal_planet === 'MR' && r.dist === 0));
console.log(`\n═══ SIGNIFICANT non-MR-MR-conj combinations (q<0.05, n≥${MIN_N}) — ${otherSig.length} found ═══\n`);
if (otherSig.length === 0) {
  console.log('  None — MR-MR conjunction is the only significant finding');
} else {
  console.log('  ' + 'Rule'.padEnd(48) + 'Event'.padEnd(17) + 'Lift'.padStart(6) + '  p_adj');
  console.log('  ' + '─'.repeat(80));
  for (const r of otherSig.slice(0, 20)) {
    console.log(
      `  ${r.tals_rule.padEnd(48)}${r.event_type.padEnd(17)}` +
      `${r.lift.toFixed(3).padStart(6)}  ${r.p_adj.toExponential(1)}`
    );
  }
}

console.log(`\n✅ Full scan saved → ${OUT_FILE}`);
console.log(`   ${results.length} combinations | ${significant.length} significant (FDR q<0.05)`);
