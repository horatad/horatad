#!/usr/bin/env node
/**
 * julian_uranus_control.mjs
 * Demographic confound control test using natal Uranus sign.
 *
 * Hypothesis: If birth-year distribution in the sample is non-uniform, any
 * slow-moving planet's natal sign position will correlate with event types —
 * not because of astrology, but because certain birth cohorts have more deaths
 * or awards recorded.
 *
 * Control choice: Uranus (~84yr period, ~7yr per sign).
 *   - NOT in TALS framework — any correlation found = demographic confound
 *   - Slow enough that each sign covers ~7 years of births = large birth cohorts
 *   - Unlike MR (~1yr period, ~1mo per sign) — MR natal sign changes monthly,
 *     so it is NOT correlated with multi-year birth-cohort demographics
 *
 * Conclusion interpretation:
 *   If Uranus signs show lift > 1.3 in any event type → demographic confound
 *   confirmed. This does NOT invalidate MR×MR transit finding (explained below).
 *
 * Why MR×MR is robust despite this confound:
 *   1. natal_MR sign changes every ~30 days → no correlation with birth year
 *   2. transit_MR sign changes every ~30 days → no correlation with event year
 *   3. Therefore MR×MR conjunction cannot arise from birth-year demographics
 *   4. Specificity test (julian_skeptic_analysis.mjs) shows: non-MR transits
 *      hitting natal_MR → lift ~1.0, MR transit hitting non-MR natal → lift ~1.0
 *      Only MR×MR shows elevated lift → cannot be explained by demographic confound
 *
 * Input:  data/julian_all.json          (birth_jd for each person)
 *         data/julian_events.jsonl       (event_type + birth_jd)
 * Output: console report (no engine needed)
 *
 * Usage:
 *   node workers/julian_uranus_control.mjs
 *   node workers/julian_uranus_control.mjs --verbose
 */

import { readFileSync, existsSync } from 'fs';

const VERBOSE = process.argv.includes('--verbose');

// ── Uranus historical sign ingress table ──────────────────────────────────────
// (year, month, sign 0-11)  — approximate, retrograde motion simplified to
// primary direction entry. Accuracy: ±1 month per sign, sufficient for a 7-year
// block control test.
const URANUS_INGRESS = [
  // Covers 1700-2026 (one Uranus period per sign entry, forward only)
  [1702,  7, 4],  // Leo (4)
  [1709, 10, 5],  // Virgo
  [1716, 11, 6],  // Libra
  [1723, 12, 7],  // Scorpio
  [1730, 12, 8],  // Sagittarius
  [1737,  1, 9],  // Capricorn
  [1744,  1,10],  // Aquarius
  [1751,  3,11],  // Pisces
  [1758,  5, 0],  // Aries
  [1765,  6, 1],  // Taurus
  [1772,  6, 2],  // Gemini
  [1779,  6, 3],  // Cancer
  [1786,  8, 4],  // Leo
  [1793,  9, 5],  // Virgo
  [1800,  9, 6],  // Libra
  [1806, 12, 7],  // Scorpio
  [1813, 12, 8],  // Sagittarius
  [1821,  2, 9],  // Capricorn
  [1828,  3,10],  // Aquarius
  [1836,  3,11],  // Pisces
  [1843,  5, 0],  // Aries
  [1849,  5, 1],  // Taurus
  [1856,  7, 2],  // Gemini
  [1863,  7, 3],  // Cancer
  [1870,  8, 4],  // Leo
  [1877,  9, 5],  // Virgo
  [1884,  9, 6],  // Libra
  [1890, 12, 7],  // Scorpio
  [1897, 12, 8],  // Sagittarius
  [1904, 12, 9],  // Capricorn
  [1912,  4,10],  // Aquarius
  [1920,  4,11],  // Pisces
  [1927,  3, 0],  // Aries
  [1934,  5, 1],  // Taurus
  [1941,  6, 2],  // Gemini
  [1948,  6, 3],  // Cancer
  [1955,  6, 4],  // Leo
  [1961,  8, 5],  // Virgo
  [1968,  9, 6],  // Libra
  [1974, 11, 7],  // Scorpio
  [1981, 11, 8],  // Sagittarius
  [1988, 12, 9],  // Capricorn
  [1996,  1,10],  // Aquarius
  [2003,  3,11],  // Pisces
  [2011,  3, 0],  // Aries
  [2018,  5, 1],  // Taurus
  [2025,  7, 2],  // Gemini (future)
];

const JD_EPOCH_VAL = 730428;
const JD_EPOCH_MS  = Date.UTC(2000, 0, 1);

function jdToYearMonth(jd) {
  const ms = JD_EPOCH_MS + (jd - JD_EPOCH_VAL) * 86400000;
  const dt  = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1 };
}

function uranusSign(jd) {
  const { y, m } = jdToYearMonth(jd);
  // Walk backward through ingress table to find the most recent entry <= (y,m)
  let sign = URANUS_INGRESS[0][2]; // default: very old
  for (const [iy, im, sg] of URANUS_INGRESS) {
    if (y > iy || (y === iy && m >= im)) sign = sg;
    else break;
  }
  return sign;
}

const ZODIAC_TH = ['เมษ','พฤษภ','มิถุน','กรกฎ','สิงห์','กันย์','ตุลย์','พิจิก','ธนู','มกร','กุมภ์','มีน'];
const ZODIAC_EN = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                   'Libra','Scorpio','Sagitt','Capri','Aquar','Pisces'];

// ── Load data ─────────────────────────────────────────────────────────────────
console.log('Loading person records...');
const people = JSON.parse(readFileSync('data/julian_all.json', 'utf8'));
const withBirth = people.filter(p => p.jd);
console.log(`  People with birth JD: ${withBirth.length}`);

// Natal Uranus sign distribution
const natalDist = new Array(12).fill(0);
for (const p of withBirth) natalDist[uranusSign(p.jd)]++;

// Load events
let events = [];
if (existsSync('data/julian_events.jsonl')) {
  const lines = readFileSync('data/julian_events.jsonl', 'utf8').split('\n').filter(Boolean);
  for (const l of lines) try { events.push(JSON.parse(l)); } catch (_) {}
  console.log(`  Events: ${events.length}`);
}

const eventTypes = [...new Set(events.map(e => e.event_type))].sort();

// Per-sign × per-event counts (keyed by birth_jd → Uranus sign)
const signEventCounts = {};
for (let s = 0; s < 12; s++) signEventCounts[s] = {};

for (const ev of events) {
  if (!ev.birth_jd) continue;
  const sg = uranusSign(ev.birth_jd);
  signEventCounts[sg][ev.event_type] = (signEventCounts[sg][ev.event_type] || 0) + 1;
}

// Total events per type (baseline)
const totalByType = {};
for (const ev of events) totalByType[ev.event_type] = (totalByType[ev.event_type] || 0) + 1;
const N_all = events.length;

// ── Report ─────────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════════');
console.log(' JULIAN SKEPTIC TEST 4: Uranus Demographic Confound Control');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log(' Uranus is NOT in TALS — any lift >1.3 = demographic confound.\n');

// Birth cohort distribution
console.log('── Natal Uranus sign distribution (birth cohort proxy) ──');
const totalPeople = withBirth.length;
for (let s = 0; s < 12; s++) {
  const pct  = (natalDist[s] / totalPeople * 100).toFixed(1);
  const bar  = '█'.repeat(Math.round(natalDist[s] / totalPeople * 50));
  const yrs  = URANUS_INGRESS.find(([,, sg]) => sg === s);
  const yLabel = yrs ? `~${yrs[0]}s` : '';
  console.log(`  ${ZODIAC_TH[s].padEnd(7)} (${ZODIAC_EN[s].padEnd(8)}) ${natalDist[s].toString().padStart(6)} (${pct}%)  ${bar} ${yLabel}`);
}

// Lift table
console.log('\n── Lift ratios by natal Uranus sign (⚠ = confound suspect >1.3) ──');
const warnSigns = {};  // sign → { event, lift }

const etCols = eventTypes.slice(0, 4);  // max 4 types for readability
console.log('\n  Sign          People  ' + etCols.map(t => t.slice(0,10).padStart(12)).join(''));
console.log('  ' + '─'.repeat(24 + etCols.length * 12));

for (let s = 0; s < 12; s++) {
  const n     = natalDist[s];
  if (n < 30) continue;
  const label = `${ZODIAC_TH[s]}(${ZODIAC_EN[s].slice(0,5)})`.padEnd(18);
  const liftCols = etCols.map(et => {
    const evN     = signEventCounts[s][et] || 0;
    const classRate = evN / n;
    const baseRate  = (totalByType[et] || 0) / N_all;
    const lift = baseRate > 0 ? classRate / baseRate : 0;
    const flag = lift >= 1.3 ? '⚠' : lift <= 0.7 ? '↓' : ' ';
    if (lift >= 1.3) {
      (warnSigns[s] ||= []).push({ et, lift: +lift.toFixed(3) });
    }
    return `${flag}${lift.toFixed(3)}`.padStart(12);
  });
  console.log(`  ${label} ${n.toString().padStart(6)}  ${liftCols.join('')}`);
}

console.log('\n── Confound signals (Uranus sign lift ≥ 1.30) ──');
let foundConfound = false;
for (const [sg, warnings] of Object.entries(warnSigns)) {
  foundConfound = true;
  for (const { et, lift } of warnings) {
    const yrs = URANUS_INGRESS.find(([,,s]) => s === +sg);
    console.log(`  ⚠ natal Uranus ${ZODIAC_EN[+sg].padEnd(9)} → ${et} lift=${lift} (birth cohort ~${yrs?yrs[0]:'?'})`);
  }
}
if (!foundConfound) console.log('  None detected at ≥1.30 threshold.');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(' CONCLUSION');
console.log('═══════════════════════════════════════════════════════════════\n');

if (foundConfound) {
  console.log(' ✅ Demographic confound CONFIRMED for slow-moving natal planets.');
  console.log('    Birth-year distribution in sample is non-uniform → birth cohorts');
  console.log('    in some signs have higher event rates (unrelated to astrology).\n');
  console.log(' ✅ MR×MR transit finding is NOT invalidated by this confound:');
  console.log('    • natal_MR sign changes every ~30 days (not years)');
  console.log('      → not correlated with birth-year cohort demographics');
  console.log('    • transit_MR sign changes every ~30 days (not years)');
  console.log('      → not correlated with event-year demographics');
  console.log('    • Specificity test: non-MR transits → natal_MR ≈ 1.0');
  console.log('      and transit_MR → non-MR natal ≈ 1.0');
  console.log('      (demographic confound would elevate ALL planets, not just MR×MR)\n');
} else {
  console.log(' No significant demographic confound detected at this threshold.');
}

console.log(' RECOMMENDATION: Add birth-year stratification to full scan in future');
console.log('   to fully decouple transit×natal effects from cohort effects.\n');
