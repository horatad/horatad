/**
 * julian_planet_positions.mjs
 * Pre-compute natal planet signs + TALS qualities for all records in julian_all.json
 *
 * Output:
 *   data/julian_natal_stats.json      — aggregate counts (quality, sign distribution)
 *   data/julian_positions_by_jd.json  — compact JD → signs[10] lookup (28K entries, ~1MB)
 *                                       enables BIBLE batch lookup: O(1) per person
 *
 * Usage: node workers/julian_planet_positions.mjs [--verbose]
 */

import { readFileSync, writeFileSync } from 'fs';
import { get_data, getStandards, PLANET_KEYS, ZODIAC_TH } from '../v3/engine.js';

const JD_EPOCH_VAL = 730428;                    // Jan 1 2000 CE
const JD_EPOCH_MS  = Date.UTC(2000, 0, 1);

function jdToDate(jd) {
  const ms = JD_EPOCH_MS + (jd - JD_EPOCH_VAL) * 86400000;
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// TALS quality labels (from engine.js getStandards return values)
const QUALITY_KEYS = [
  'มหาอุจ', 'อุจจาวิลาส', 'อุจจาภิมุข',
  'เกษตร', 'ประ', 'นิจ',
  'มหาจักร', 'จุลจักร', 'ราชาโชค', 'เทวีโชค'
];

const VERBOSE = process.argv.includes('--verbose');

// ── Load data ────────────────────────────────────────────────────────────────
const records = JSON.parse(readFileSync('data/julian_all.json', 'utf8'));
process.stderr.write(`Loaded ${records.length} records\n`);

// ── Cache positions by JD (28K unique JDs vs 66K records) ───────────────────
const jdCache = new Map();
function getPos(jd) {
  if (jdCache.has(jd)) return jdCache.get(jd);
  const { y, m, d } = jdToDate(jd);
  const pos = get_data(d, m, y, 6, 0); // 06:00 default — Lagna excluded
  jdCache.set(jd, pos);
  return pos;
}

// ── Accumulators ─────────────────────────────────────────────────────────────
// by_sign[planet_key][0..11] = record count
// by_quality[planet_key][quality_label] = record count
// jd_positions[jd] = [SU_sign, MO_sign, MA_sign, ME_sign, JU_sign,
//                     VE_sign, SA_sign, RA_sign, KE_sign, MR_sign]  (indices 1-10)
const by_sign         = {};
const by_quality      = {};
const jd_positions    = {};

for (let pid = 1; pid <= 10; pid++) {
  const key = PLANET_KEYS[pid];
  by_sign[key]    = new Array(12).fill(0);
  by_quality[key] = {};
  for (const q of QUALITY_KEYS) by_quality[key][q] = 0;
  by_quality[key]['—'] = 0;  // no special quality
}

// ── Main loop ────────────────────────────────────────────────────────────────
let i = 0;
for (const rec of records) {
  const pos = getPos(rec.jd);

  // Build JD positions entry (once per unique JD)
  if (!jd_positions[rec.jd]) {
    jd_positions[rec.jd] = [];
    for (let pid = 1; pid <= 10; pid++) {
      jd_positions[rec.jd].push(Math.floor(pos[pid] / 1800));
    }
  }

  for (let pid = 1; pid <= 10; pid++) {
    const key  = PLANET_KEYS[pid];
    const sign = jd_positions[rec.jd][pid - 1];
    by_sign[key][sign]++;

    const qualStr = getStandards(pos, pid);
    const matched = QUALITY_KEYS.filter(q => qualStr.includes(q));

    if (matched.length > 0) {
      for (const q of matched) by_quality[key][q]++;
    } else {
      by_quality[key]['—']++;
    }
  }
  if (++i % 10000 === 0) process.stderr.write(`  ${i}/${records.length} (${jdCache.size} unique JDs)\n`);
}

process.stderr.write(`Done. Unique JDs cached: ${jdCache.size}\n`);

// ── Write outputs ─────────────────────────────────────────────────────────────
const stats = {
  meta: {
    records     : records.length,
    unique_jds  : jdCache.size,
    computed_at : new Date().toISOString().slice(0, 10),
    time_default: '06:00',
    note: 'Lagna excluded (requires birth time). Planet order: SU,MO,MA,ME,JU,VE,SA,RA,KE,MR'
  },
  planets     : PLANET_KEYS.slice(1),
  zodiac_th   : ZODIAC_TH,
  quality_keys: QUALITY_KEYS,
  by_sign,
  by_quality
};

// Compact positions: {jd: [SU_sign,...MR_sign]}  ~1MB for 28K JDs
const positions_output = {
  meta: {
    unique_jds  : Object.keys(jd_positions).length,
    planet_order: PLANET_KEYS.slice(1),  // [SU,MO,MA,ME,JU,VE,SA,RA,KE,MR]
    sign_range  : '0-11 (เมษ=0 ... มีน=11)',
    zodiac_th   : ZODIAC_TH,
    computed_at : new Date().toISOString().slice(0, 10)
  },
  positions: jd_positions
};

writeFileSync('data/julian_natal_stats.json',     JSON.stringify(stats, null, 2));
writeFileSync('data/julian_positions_by_jd.json', JSON.stringify(positions_output));

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n=== Natal Quality Distribution (' + records.length + ' records) ===');
for (let pid = 1; pid <= 10; pid++) {
  const key   = PLANET_KEYS[pid];
  const q     = by_quality[key];
  const parts = QUALITY_KEYS.filter(k => q[k] > 0).map(k => `${k}=${q[k]}`);
  const none  = q['—'];
  console.log(`${key}: ${parts.join(' | ')} | ไม่มีคุณสมบัติ=${none}`);
}

if (VERBOSE) {
  console.log('\n=== Sign Distribution ===');
  for (let pid = 1; pid <= 10; pid++) {
    const key = PLANET_KEYS[pid];
    const row = by_sign[key].map((n, s) => `${ZODIAC_TH[s]}=${n}`).join(' ');
    console.log(`${key}: ${row}`);
  }
}

console.log(`\nJD positions table: ${Object.keys(jd_positions).length} unique JDs`);
console.log('Output: data/julian_natal_stats.json  data/julian_positions_by_jd.json');
