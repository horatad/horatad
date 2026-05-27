#!/usr/bin/env node
/**
 * julian_skeptic_analysis.mjs
 * Skeptical test: is transit_MR conjunction natal_MR real signal or artifact?
 *
 * Hypothesis to NEGATE astrological evidence:
 *   H0: MR high lift = orbital period coincidence with death age distribution
 *       (any slow planet with period ≈ life-expectancy would show same lift)
 *
 * Tests:
 *   1. Self-conjunction lift for ALL 10 planets vs death
 *      → if SA, JU, RA etc. also show lift ≥ 2.0, it's demographic artifact
 *   2. Age-at-death distribution (peak age)
 *      → if peak ≈ n × MR_period, lift is life-expectancy confound
 *   3. MR estimated period from data
 *      → derive implied period from sign-cycle speed
 *   4. Cross-aspect control: does MR conjunction natal_SA (unrelated pair)
 *      also show high death lift? If yes → MR transit has generic death signal
 *      regardless of what natal planet it hits
 *
 * Input:  data/julian_events.jsonl
 * Usage:  node workers/julian_skeptic_analysis.mjs
 */

import { readFileSync } from 'fs';
import { get_data } from '../v3/engine.js';

const EVENTS_FILE = 'data/julian_events.jsonl';
const PLANET_NAMES = ['SU','MO','MA','ME','JU','VE','SA','RA','KE','MR'];
const JD_EPOCH_VAL = 730428;
const JD_EPOCH_MS  = Date.UTC(2000, 0, 1);
const CONFIDENCE_MIN = 0.85;

function jdToDate(jd) {
  const ms = JD_EPOCH_MS + (jd - JD_EPOCH_VAL) * 86400000;
  const dt  = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// ── Load events ───────────────────────────────────────────────────────────────
const lines  = readFileSync(EVENTS_FILE, 'utf8').split('\n').filter(Boolean);
const events = [];
for (const l of lines) {
  try {
    const ev = JSON.parse(l);
    if ((ev.confidence ?? 0.9) >= CONFIDENCE_MIN) events.push(ev);
  } catch (_) {}
}
console.log(`Events loaded: ${events.length}`);

// ── JD position cache ─────────────────────────────────────────────────────────
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

// ── Build feature records ─────────────────────────────────────────────────────
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
  const age = (ev.event_jd - ev.birth_jd) / 365.25;
  records.push({ event_type: ev.event_type, natal, transit, age,
                 birth_jd: ev.birth_jd, event_jd: ev.event_jd });
}
console.log(`Records computed: ${records.length}`);

const deaths = records.filter(r => r.event_type === 'death');
console.log(`Death events: ${deaths.length}\n`);

// ── TEST 1: Self-conjunction lift for ALL planets ─────────────────────────────
console.log('═══ TEST 1: Self-conjunction lift — ALL planets vs death ═══');
console.log('(Hypothesis: if SA/JU/RA also lift ≥ 2.0, MR is not special)\n');
console.log('Planet  Period est  Death-conj  All-conj  Death-rate  All-rate     Lift');
console.log('─'.repeat(75));

const planetLifts = [];
for (let p = 0; p < 10; p++) {
  // Count self-conjunction (sign dist = 0)
  let deathConj = 0, allConj = 0;
  for (const r of deaths)  if (Math.abs(r.natal[p] - r.transit[p]) % 12 === 0 ||
                                (12 - Math.abs(r.natal[p] - r.transit[p])) % 12 === 0) {
    if (r.natal[p] === r.transit[p]) deathConj++;
  }
  for (const r of records) if (r.natal[p] === r.transit[p]) allConj++;

  const deathRate = deathConj / deaths.length;
  const allRate   = allConj   / records.length;
  const lift      = allRate > 0 ? deathRate / allRate : 0;

  // Rough period estimate from how often self-conjunction occurs per year
  // fraction of records with self-conj ≈ 1/12 if slow, higher if fast
  const conjFrac = allConj / records.length;
  const periodEst = conjFrac > 0 ? `~${(1 / (conjFrac * 12)).toFixed(0)}y` : '?';

  planetLifts.push({ name: PLANET_NAMES[p], lift, periodEst, deathConj, allConj, deathRate, allRate });
  const marker = lift >= 1.5 ? ' ◄ HIGH' : lift >= 1.2 ? ' ◄' : '';
  console.log(
    `${PLANET_NAMES[p].padEnd(7)} ${periodEst.padEnd(11)}` +
    ` ${String(deathConj).padStart(10)}  ${String(allConj).padStart(8)}` +
    `  ${(deathRate * 100).toFixed(1).padStart(9)}%  ${(allRate * 100).toFixed(1).padStart(7)}%` +
    `  ${lift.toFixed(3).padStart(6)}${marker}`
  );
}

// ── TEST 2: Age-at-death distribution ─────────────────────────────────────────
console.log('\n═══ TEST 2: Age-at-death distribution ═══');
console.log('(Hypothesis: if peak age ≈ n × MR_period, lift is life-expectancy confound)\n');

const ageBuckets = new Array(14).fill(0); // 0-9, 10-19, ..., 120-129, 130+
const validAges = deaths.filter(r => r.age > 0 && r.age < 130);
for (const r of validAges) {
  const bucket = Math.min(Math.floor(r.age / 10), 13);
  ageBuckets[bucket]++;
}

let peakBucket = 0, peakCount = 0;
for (let i = 0; i < 13; i++) {
  const bar = '█'.repeat(Math.round(ageBuckets[i] / 100));
  const label = `${i * 10}-${i * 10 + 9}`;
  console.log(`  ${label.padEnd(7)} ${String(ageBuckets[i]).padStart(5)}  ${bar}`);
  if (ageBuckets[i] > peakCount) { peakCount = ageBuckets[i]; peakBucket = i; }
}
const peakAgeRange = `${peakBucket * 10}-${peakBucket * 10 + 9}`;
const medianAge = validAges.map(r => r.age).sort((a, b) => a - b)[Math.floor(validAges.length / 2)];
console.log(`\n  Peak decade: ${peakAgeRange}  |  Median age at death: ${medianAge.toFixed(1)}`);

// MR period (from Test 1)
const mrData = planetLifts.find(p => p.name === 'MR');
const mrPeriodNum = mrData ? parseFloat(mrData.periodEst.replace('~', '').replace('y', '')) : NaN;
if (!isNaN(mrPeriodNum)) {
  const returnsNearDeath = [mrPeriodNum, mrPeriodNum * 2, mrPeriodNum / 2]
    .map(x => x.toFixed(1)).join(' / ');
  console.log(`  MR returns occur at age: ${returnsNearDeath}`);
  const peakMid = peakBucket * 10 + 5;
  const overlap = [mrPeriodNum, mrPeriodNum * 2].some(x => Math.abs(x - peakMid) < 10);
  console.log(`  Overlap with peak death decade? ${overlap ? '⚠️  YES → CONFOUND POSSIBLE' : '✅ NO → less likely artifact'}`);
}

// ── TEST 3: MR transit vs ALL natal planets (control) ────────────────────────
console.log('\n═══ TEST 3: transit_MR conjunction natal_X — all X (control) ═══');
console.log('(Hypothesis: if MR transit is generically "death-y", ALL natal planets show high lift)\n');
console.log('Natal planet  Death-conj  All-conj  Lift');
console.log('─'.repeat(45));

const MR_IDX = 9;
for (let p = 0; p < 10; p++) {
  let deathConj = 0, allConj = 0;
  for (const r of deaths)  if (r.transit[MR_IDX] === r.natal[p]) deathConj++;
  for (const r of records) if (r.transit[MR_IDX] === r.natal[p]) allConj++;
  const lift = allConj > 0 ? (deathConj / deaths.length) / (allConj / records.length) : 0;
  const marker = p === MR_IDX ? ' ◄ (self)' : '';
  console.log(
    `  natal_${PLANET_NAMES[p].padEnd(5)}   ${String(deathConj).padStart(10)}` +
    `  ${String(allConj).padStart(8)}  ${lift.toFixed(3)}${marker}`
  );
}

// ── TEST 4: natal_MR transit vs ALL transit planets (control) ─────────────────
console.log('\n═══ TEST 4: transit_X conjunction natal_MR — all X (control) ═══');
console.log('(Hypothesis: if natal_MR is generically "death-prone", all transit planets show high lift)\n');
console.log('Transit planet  Death-conj  All-conj  Lift');
console.log('─'.repeat(47));

for (let p = 0; p < 10; p++) {
  let deathConj = 0, allConj = 0;
  for (const r of deaths)  if (r.transit[p] === r.natal[MR_IDX]) deathConj++;
  for (const r of records) if (r.transit[p] === r.natal[MR_IDX]) allConj++;
  const lift = allConj > 0 ? (deathConj / deaths.length) / (allConj / records.length) : 0;
  const marker = p === MR_IDX ? ' ◄ (self)' : '';
  console.log(
    `  transit_${PLANET_NAMES[p].padEnd(5)} ${String(deathConj).padStart(10)}` +
    `  ${String(allConj).padStart(8)}  ${lift.toFixed(3)}${marker}`
  );
}

// ── VERDICT ───────────────────────────────────────────────────────────────────
console.log('\n═══ SKEPTIC VERDICT ═══\n');
const topPlanets = [...planetLifts].sort((a, b) => b.lift - a.lift).slice(0, 3);
console.log(`Top self-conjunction lifts for death:`);
topPlanets.forEach((p, i) => console.log(`  ${i + 1}. ${p.name}  lift=${p.lift.toFixed(3)}  (period≈${p.periodEst})`));

const mrLift   = planetLifts.find(p => p.name === 'MR')?.lift ?? 0;
const saLift   = planetLifts.find(p => p.name === 'SA')?.lift ?? 0;
const raLift   = planetLifts.find(p => p.name === 'RA')?.lift ?? 0;
const nonMrMax = Math.max(saLift, raLift,
  ...planetLifts.filter(p => p.name !== 'MR').map(p => p.lift));

console.log(`\nMR self-conj lift: ${mrLift.toFixed(3)}`);
console.log(`Best non-MR lift:  ${nonMrMax.toFixed(3)}`);

if (mrLift / nonMrMax >= 1.5) {
  console.log('\n✅ MR uniquely dominant — harder to explain as pure artifact');
  console.log('   Orbital period confound does not fully explain the signal');
} else if (mrLift / nonMrMax >= 1.2) {
  console.log('\n⚠️  MR moderately above others — partial signal, partial confound');
  console.log('   Need age-distribution normalization to separate cleanly');
} else {
  console.log('\n❌ MR NOT uniquely dominant — other slow planets show similar lift');
  console.log('   Evidence consistent with orbital period / life-expectancy artifact');
  console.log('   → Do NOT use this as empirical proof of TALS MR theory');
}
