#!/usr/bin/env node
/**
 * julian_age_confound_test.mjs
 * Skeptic Test 5: Orbital Period Age Confound for MR (มฤตยู)
 *
 * KEY FINDING: MR (มฤตยู) in สุริยยาตร์ has an ~83-year orbital period.
 * Therefore transit_MR × natal_MR "aspects" are simply AGE PROXIES:
 *   dist=0 (conjunction)  → person is ~83 years old  → death elevated (old age)
 *   dist=6 (opposition)   → person is ~41 years old  → career events elevated (midlife)
 *   dist=5                → person is ~48 years old  → career events elevated
 *   etc.
 *
 * Test: verify that median age at event matches age predicted by MR period
 * for each dist value. If they match, the lift is a demographic artifact.
 *
 * IMPORTANT DISTINCTION:
 *   มฤตยู (MR) in TALS/สุริยยาตร์ is NOT "Uranus" — different name and calculation
 *   basis — but its ~83yr period produces the same age-proxy problem.
 *
 * Implication for JULIAN rules:
 *   - MR×MR transit findings: INVALIDATED (all are age proxies)
 *   - SU×SA findings: still valid (SU period = 1yr, returns every year, NOT age proxy)
 *
 * Usage: node workers/julian_age_confound_test.mjs
 */

import { readFileSync } from 'fs';
import { get_data } from '../v3/engine.js';

const JD_EPOCH_VAL = 730428;
const JD_EPOCH_MS  = Date.UTC(2000, 0, 1);

function jdToDate(jd) {
  const ms = JD_EPOCH_MS + (jd - JD_EPOCH_VAL) * 86400000;
  const d = new Date(ms);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth()+1, d: d.getUTCDate() };
}

const jdCache = new Map();
function getSigns(jd) {
  if (jdCache.has(jd)) return jdCache.get(jd);
  const { y, m, d } = jdToDate(jd);
  try {
    const raw = get_data(d, m, y, 6, 0);
    if (!Array.isArray(raw) || raw.length < 11) return null;
    const signs = raw.slice(1).map(v => Math.trunc(v/1800)%12);
    jdCache.set(jd, signs);
    return signs;
  } catch(_) { return null; }
}

// MR period from engine formula analysis
// get_s(star=10): my_o = (klp/84 + klp/7224) mod 21600
// rate = 21600*(1/84 + 1/7224) = 260.13 units/yr → period = 21600/260.13 = 83.03 years
const MR_PERIOD = 83.03;
const MR_PER_SIGN = MR_PERIOD / 12;  // ~6.92 years per sign
const MR_IDX = 9;  // index in signs[] = sp[10] = MR (slice from sp[1])

console.log('═══════════════════════════════════════════════════════════════');
console.log(' JULIAN SKEPTIC TEST 5: MR Orbital Period Age Confound');
console.log('═══════════════════════════════════════════════════════════════\n');
console.log(` MR (มฤตยู) period in สุริยยาตร์ engine: ${MR_PERIOD} years`);
console.log(` MR per sign: ${MR_PER_SIGN.toFixed(2)} years (~${(MR_PER_SIGN*12).toFixed(0)}yr orbit)\n`);
console.log(' Expected ages when transit_MR is at dist N from natal_MR:');
for (let d = 0; d <= 6; d++) {
  const early = (d * MR_PER_SIGN).toFixed(1);
  const late  = (MR_PERIOD - d * MR_PER_SIGN).toFixed(1);
  console.log(`   dist=${d}: age ~${early.padStart(4)} (early orbit) or ~${late.padStart(4)} (late orbit)`);
}
console.log('');

// Load and compute
console.log('Loading events...');
const lines  = readFileSync('data/julian_events.jsonl', 'utf8').split('\n').filter(Boolean);
const byDist = {};  // dist -> { et -> ages[] }

let loaded = 0, skipped = 0;
for (const l of lines) {
  let ev;
  try { ev = JSON.parse(l); } catch(_) { skipped++; continue; }
  const age = (ev.event_jd - ev.birth_jd) / 365.25;
  if (!Number.isFinite(age) || age < 0 || age > 130) { skipped++; continue; }

  const natal   = getSigns(ev.birth_jd);
  const transit = getSigns(ev.event_jd);
  if (!natal || !transit) { skipped++; continue; }

  const raw  = Math.abs(natal[MR_IDX] - transit[MR_IDX]);
  const dist = Math.min(raw, 12 - raw);

  if (!byDist[dist]) byDist[dist] = {};
  if (!byDist[dist][ev.event_type]) byDist[dist][ev.event_type] = [];
  byDist[dist][ev.event_type].push(age);
  loaded++;
}
console.log(`  Processed: ${loaded} | Skipped: ${skipped}\n`);

function median(arr) {
  if (!arr || !arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

// Primary report: does observed median match expected age?
const etList = ['death','position_start','award_received'];
const etLabels = { death:'death', position_start:'pos_start', award_received:'award' };

console.log('── Observed median age vs period-predicted age ──\n');
console.log('dist  ExpectedAge  ' + etList.map(e => etLabels[e].padStart(11)).join('  ') + '  Verdict');
console.log('─'.repeat(70));

let allMatch = true;
for (let d = 0; d <= 6; d++) {
  const expectedLate  = MR_PERIOD - d * MR_PER_SIGN;
  const dd = byDist[d] || {};
  const medians = etList.map(et => {
    const m = median(dd[et]);
    return m !== null ? m.toFixed(1) : ' n/a';
  });

  // Check if all medians cluster around expectedLate (±6 years)
  const medNums = etList.map(et => median(dd[et])).filter(v => v !== null);
  const avgMed  = medNums.length > 0 ? medNums.reduce((a,b)=>a+b,0)/medNums.length : null;
  const deviation = avgMed !== null ? Math.abs(avgMed - expectedLate) : 999;

  let verdict;
  if (deviation <= 6)      { verdict = '⚠ MATCH → AGE PROXY'; }
  else if (deviation <= 12) { verdict = '~ near match'; }
  else                      { verdict = '✅ genuine signal?'; allMatch = false; }

  console.log(
    `   ${d}    ~${expectedLate.toFixed(1).padStart(5)}yr  ` +
    medians.map(m => m.padStart(11)).join('  ') +
    `  ${verdict}`
  );
}

console.log('');
console.log('── Age histogram: dist=0 (MR conjunction) death events ──');
const conjDeaths = (byDist[0] || {}).death || [];
const buckets = new Array(13).fill(0);
for (const a of conjDeaths) buckets[Math.min(12, Math.floor(a/10))]++;
const total = conjDeaths.length;
for (let b = 0; b < 13; b++) {
  const pct = total > 0 ? (buckets[b]/total*100).toFixed(1) : '0.0';
  const bar = '█'.repeat(Math.round(buckets[b]/total*40));
  const lo = b*10, hi = lo+9;
  console.log(`  ${lo.toString().padStart(3)}-${hi}  ${buckets[b].toString().padStart(5)} (${pct.padStart(4)}%)  ${bar}`);
}
console.log(`  Median: ${median(conjDeaths)?.toFixed(1)} years (MR period = ${MR_PERIOD} years)\n`);

console.log('═══════════════════════════════════════════════════════════════');
console.log(' CONCLUSION');
console.log('═══════════════════════════════════════════════════════════════\n');

if (allMatch) {
  console.log(' ⛔ ALL MR×MR transit aspects are AGE PROXIES:');
  console.log('    MR period = 83yr → dist=N = person at age (83 - N×6.9) years');
  console.log('    Events cluster at predicted age, not due to astrological signal');
  console.log('    lift=2.264 for MR-conj death = natural death rate at age ~83');
  console.log('    lift=1.729 for MR-oppo position_start = career events at age ~42\n');
  console.log(' ⛔ MR×MR rules must be REMOVED from JULIAN valid findings');
  console.log('    Remaining valid signal: SU×SA polarity (SU period = 1yr, not age proxy)\n');
} else {
  console.log(' Some MR aspects may have genuine signal — investigate further.');
}

console.log(' WHY SU×SA IS DIFFERENT:');
console.log('   transit_SU returns to every aspect once per year (~1yr period)');
console.log('   Not an age proxy — a person at any age can have SU conj natal_SA');
console.log('   Lift ~1.1-1.18 for SU×SA (hard→death, soft→award) is potentially real\n');
