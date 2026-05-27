#!/usr/bin/env node
/**
 * julian_ml_correlate.mjs
 * Phase 3: Correlate CNN-derived rules against raw feature data.
 *
 * Input:  ml/models/julian_rules.json  (from julian_cnn_explain.py)
 *         data/julian_ml_features.jsonl
 * Output: ml/models/julian_ml_report.json  — enriched rules with per-aspect lift
 *         Console: TALS-format rule candidates ranked by lift
 *
 * Usage: node workers/julian_ml_correlate.mjs [--min-lift 1.2] [--top 5]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const RULES_FILE    = 'ml/models/julian_rules.json';
const FEATURES_FILE = 'data/julian_ml_features.jsonl';
const REPORT_FILE   = 'ml/models/julian_ml_report.json';

const args        = process.argv.slice(2);
const MIN_LIFT    = parseFloat(args[args.indexOf('--min-lift') + 1] || '1.2');
const TOP_N       = parseInt(args[args.indexOf('--top') + 1] || '5', 10);

const PLANET_NAMES = ['SU','MO','MA','ME','JU','VE','SA','RA','KE','MR'];
const PLANET_IDX   = Object.fromEntries(PLANET_NAMES.map((n, i) => [n, i]));
const ASPECT_NAMES = { 0:'conjunction', 2:'sextile', 3:'square', 4:'trine', 6:'opposition' };

// ── Load data ─────────────────────────────────────────────────────────────────
if (!existsSync(RULES_FILE)) {
  console.error(`ERROR: ${RULES_FILE} not found — run julian_cnn_explain.py first`);
  process.exit(1);
}
if (!existsSync(FEATURES_FILE)) {
  console.error(`ERROR: ${FEATURES_FILE} not found — run julian_ml_features.mjs first`);
  process.exit(1);
}

const allRules = JSON.parse(readFileSync(RULES_FILE, 'utf8'));
console.log(`Rules loaded for ${Object.keys(allRules).length} event types`);

const features = [];
for (const line of readFileSync(FEATURES_FILE, 'utf8').split('\n').filter(Boolean)) {
  try { features.push(JSON.parse(line)); } catch (_) {}
}
console.log(`Feature records: ${features.length}`);

// ── Group by event_type ───────────────────────────────────────────────────────
const byType = {};
for (const f of features) {
  (byType[f.event_type] ||= []).push(f);
}

// ── Enrich each rule with per-aspect-distance lift ────────────────────────────
const report = {};

for (const [eventType, ruleList] of Object.entries(allRules)) {
  const classFeats = byType[eventType] || [];
  if (classFeats.length === 0) continue;

  report[eventType] = [];

  for (const rule of ruleList) {
    const ni = PLANET_IDX[rule.natal_planet];
    const ti = PLANET_IDX[rule.transit_planet];
    if (ni === undefined || ti === undefined) continue;

    const classDist = new Array(7).fill(0);
    const allDist   = new Array(7).fill(0);

    for (const f of classFeats) {
      const raw  = Math.abs(f.natal[ni] - f.transit[ti]);
      const dist = Math.min(raw, 12 - raw);
      if (dist <= 6) classDist[dist]++;
    }
    for (const f of features) {
      const raw  = Math.abs(f.natal[ni] - f.transit[ti]);
      const dist = Math.min(raw, 12 - raw);
      if (dist <= 6) allDist[dist]++;
    }

    const distBreakdown = [];
    for (let d = 0; d <= 6; d++) {
      const classRate = classDist[d] / classFeats.length;
      const allRate   = allDist[d]   / features.length;
      const lift      = allRate > 0 ? classRate / allRate : 0;
      distBreakdown.push({
        dist:        d,
        aspect:      ASPECT_NAMES[d] || `dist_${d}`,
        class_n:     classDist[d],
        all_n:       allDist[d],
        class_rate:  +classRate.toFixed(4),
        all_rate:    +allRate.toFixed(4),
        lift:        +lift.toFixed(3),
      });
    }

    // Best: highest lift among distances with ≥20 class occurrences
    const candidates = distBreakdown.filter(d => d.class_n >= 20);
    const best = candidates.length
      ? candidates.reduce((a, b) => a.lift > b.lift ? a : b)
      : distBreakdown.reduce((a, b) => a.lift > b.lift ? a : b);

    report[eventType].push({
      natal_planet:   rule.natal_planet,
      transit_planet: rule.transit_planet,
      cnn_importance: rule.importance,
      cnn_hit_rate:   rule.hit_rate,
      best_aspect:    best.aspect,
      best_dist:      best.dist,
      best_lift:      best.lift,
      best_class_n:   best.class_n,
      tals_rule:      `transit_${rule.transit_planet} ${best.aspect} natal_${rule.natal_planet}`,
      dist_breakdown: distBreakdown,
    });
  }

  // Sort by lift × importance
  report[eventType].sort((a, b) =>
    (b.best_lift * b.cnn_importance) - (a.best_lift * a.cnn_importance));
}

// ── Save report ───────────────────────────────────────────────────────────────
writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
console.log(`\n✅ Saved → ${REPORT_FILE}`);

// ── Print summary ─────────────────────────────────────────────────────────────
console.log(`\n── Top ${TOP_N} TALS Rule Candidates (per event type) ──`);
for (const [eventType, ruleList] of Object.entries(report)) {
  console.log(`\n${eventType} (${(byType[eventType]||[]).length} records):`);
  console.log(
    '  ' + 'Rule'.padEnd(52) + 'Imp'.padStart(7) + 'Lift'.padStart(7) + 'N(class)'.padStart(10)
  );
  console.log('  ' + '─'.repeat(76));
  for (const r of ruleList.slice(0, TOP_N)) {
    console.log(
      `  ${r.tals_rule.padEnd(52)}` +
      ` ${r.cnn_importance.toFixed(3).padStart(6)}` +
      ` ${r.best_lift.toFixed(2).padStart(6)}` +
      ` ${String(r.best_class_n).padStart(9)}`
    );
  }
}

// ── High-lift rules (potential TALS candidates) ───────────────────────────────
const highLift = [];
for (const [eventType, ruleList] of Object.entries(report)) {
  for (const r of ruleList) {
    if (r.best_lift >= MIN_LIFT) {
      highLift.push({ eventType, ...r });
    }
  }
}
highLift.sort((a, b) => b.best_lift - a.best_lift);

console.log(`\n── High-lift rules (lift ≥ ${MIN_LIFT}) — ${highLift.length} found ──`);
if (highLift.length === 0) {
  console.log('  (none above threshold — try --min-lift 1.1)');
} else {
  for (const r of highLift) {
    console.log(
      `  [${r.eventType}]` +
      ` lift=${r.best_lift.toFixed(2)}` +
      ` imp=${r.cnn_importance.toFixed(3)}` +
      `  ${r.tals_rule}` +
      `  (n=${r.best_class_n})`
    );
  }
}

console.log('\nNext step: review ml/models/julian_ml_report.json → BIBLE session to update empirical_p in kb.json');
