#!/usr/bin/env node
/**
 * julian_compound_rules.mjs
 * Find compound TALS rules: pairs where two aspects occurring simultaneously
 * produce higher lift than each aspect alone (synergy > independence).
 *
 * Method:
 *   Under independence assumption: lift(A∧B) ≈ lift(A) × lift(B)
 *   Actual counting from event data gives true lift(A∧B)
 *   Synergy = actual / expected — if > 1.2 → compound rule candidate
 *
 * Input:  data/julian_events.jsonl + v3/engine.js (for planet positions)
 *         ml/models/julian_full_scan.json (for pre-screened significant pairs)
 * Output: ml/models/julian_compound_rules.json
 * Usage:  node workers/julian_compound_rules.mjs [--min-lift 1.5] [--top 20]
 */

import { readFileSync, writeFileSync } from 'fs';
import { get_data } from '../v3/engine.js';

const args     = process.argv.slice(2);
const MIN_LIFT = parseFloat(args[args.indexOf('--min-lift') + 1] || '1.5');
const TOP_N    = parseInt(args[args.indexOf('--top')   + 1] || '20', 10);
const OUT_FILE = 'ml/models/julian_compound_rules.json';

const PLANET_NAMES  = ['SU','MO','MA','ME','JU','VE','SA','RA','KE','MR'];
const PLANET_IDX    = Object.fromEntries(PLANET_NAMES.map((n,i)=>[n,i]));
const JD_EPOCH_VAL  = 730428;
const JD_EPOCH_MS   = Date.UTC(2000, 0, 1);
const CONFIDENCE_MIN = 0.85;

function jdToDate(jd) {
  const ms = JD_EPOCH_MS + (jd - JD_EPOCH_VAL) * 86400000;
  const dt  = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth()+1, d: dt.getUTCDate() };
}

// ── Load events + compute positions ──────────────────────────────────────────
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

console.log(`Computing positions for ${events.length} events...`);
const records = [];
const seen = new Set();
for (const ev of events) {
  const key = `${ev.person_key}|${ev.event_type}|${ev.event_jd}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const natal   = getSigns(ev.birth_jd);
  const transit = getSigns(ev.event_jd);
  if (!natal || !transit) continue;
  records.push({ event_type: ev.event_type, natal, transit });
}
console.log(`Records ready: ${records.length}`);

// ── Load significant singles from full scan ───────────────────────────────────
const scanData = JSON.parse(readFileSync('ml/models/julian_full_scan.json', 'utf8'));

// Pull significant rules (FDR q<0.05, lift≥1.2) per event type
const sigByType = {};
for (const r of scanData.all_results) {
  if (r.p_adj >= 0.05 || r.lift < 1.2 || r.class_n < 50) continue;
  (sigByType[r.event_type] ||= []).push(r);
}

for (const [et, rules] of Object.entries(sigByType)) {
  console.log(`  ${et}: ${rules.length} significant singles`);
}

// ── Compound rule counting ────────────────────────────────────────────────────
console.log('\nTesting compound pairs...');

function hasAspect(rec, rule) {
  const ti = PLANET_IDX[rule.transit_planet];
  const ni = PLANET_IDX[rule.natal_planet];
  const raw = Math.abs(rec.natal[ni] - rec.transit[ti]);
  return Math.min(raw, 12 - raw) === rule.dist;
}

const allCompounds = [];

for (const [eventType, singles] of Object.entries(sigByType)) {
  const classRecs = records.filter(r => r.event_type === eventType);
  const N_class   = classRecs.length;
  const N_all     = records.length;

  // Only test pairs that include MR×MR or SU×SA (proven anchors) to keep manageable
  const anchors = singles.filter(r =>
    (r.transit_planet === 'MR' && r.natal_planet === 'MR') ||
    (r.transit_planet === 'SU' && r.natal_planet === 'SA')
  );
  const partners = singles.filter(r =>
    !(r.transit_planet === 'MR' && r.natal_planet === 'MR' &&
      r.transit_planet === 'SU' && r.natal_planet === 'SA')
  );

  for (const A of anchors) {
    for (const B of singles) {
      // Skip self-pair
      if (A.transit_planet === B.transit_planet &&
          A.natal_planet   === B.natal_planet   &&
          A.dist           === B.dist) continue;

      // Count co-occurrence
      let classAB = 0, allAB = 0;
      for (const r of classRecs) if (hasAspect(r, A) && hasAspect(r, B)) classAB++;
      for (const r of records)   if (hasAspect(r, A) && hasAspect(r, B)) allAB++;

      if (allAB < 30) continue; // too few to be meaningful

      const liftAB   = allAB > 0 ? (classAB / N_class) / (allAB / N_all) : 0;
      const expected = A.lift * B.lift;            // under independence
      const synergy  = liftAB / expected;          // >1 = positive interaction

      allCompounds.push({
        event_type:  eventType,
        rule_A:      A.tals_rule,
        rule_B:      B.tals_rule,
        lift_A:      A.lift,
        lift_B:      B.lift,
        lift_AB:     +liftAB.toFixed(4),
        expected_AB: +expected.toFixed(4),
        synergy:     +synergy.toFixed(3),
        class_n_AB:  classAB,
        all_n_AB:    allAB,
      });
    }
  }
}

// Sort by actual lift_AB
allCompounds.sort((a, b) => b.lift_AB - a.lift_AB);
const top = allCompounds.slice(0, TOP_N);

// ── Save ─────────────────────────────────────────────────────────────────────
writeFileSync(OUT_FILE, JSON.stringify({ meta: { records: records.length,
  generated: new Date().toISOString() }, top_compounds: top }, null, 2));

// ── Report ───────────────────────────────────────────────────────────────────
console.log(`\n═══ TOP ${TOP_N} COMPOUND RULES ═══\n`);
console.log('  ' + 'Event'.padEnd(16) + 'Lift_A'.padStart(7) + ' × ' +
            'Lift_B'.padStart(6) + ' → ' + 'Lift_AB'.padStart(7) +
            '  Synergy'.padStart(9) + '  N');
console.log('  ' + '─'.repeat(72));
for (const c of top) {
  const tag = c.synergy >= 1.3 ? ' ⚡SYNERGY' : c.synergy >= 1.1 ? ' ↑' :
              c.synergy <= 0.8 ? ' ↓overlap' : '';
  console.log(
    `  ${c.event_type.padEnd(16)}` +
    `${c.lift_A.toFixed(2).padStart(7)} × ${c.lift_B.toFixed(2).padStart(6)}` +
    ` → ${c.lift_AB.toFixed(3).padStart(7)}` +
    `  ${c.synergy.toFixed(2).padStart(8)}×${tag}`
  );
  console.log(`    A: ${c.rule_A}`);
  console.log(`    B: ${c.rule_B}  (n=${c.class_n_AB}/${c.all_n_AB})`);
}

const synergetic = allCompounds.filter(c => c.synergy >= 1.3);
console.log(`\n  Synergetic pairs (synergy ≥ 1.3): ${synergetic.length}`);
console.log(`✅ Saved → ${OUT_FILE}`);
