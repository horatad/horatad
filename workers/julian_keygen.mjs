#!/usr/bin/env node
// JULIAN Master Key Generator — Node.js CLI
// สร้าง CSV สำหรับ import เข้า master_key table ใน CF D1
//
// วิธีใช้:
//   node workers/julian_keygen.mjs [start_year] [end_year] > julian_mk_1700-2100.csv
//   node workers/julian_keygen.mjs 2000 2001 > test_mk.csv
//
// ค่า default: 1700-2100 CE (~146,000 rows)
// output: jd,date_ce,su,mo,ma,me,ju,ve,sa,ra,ke,mr  (degrees 0-360, 4 decimal)

import { get_j, get_data } from '../v3/engine.js';

const START_YEAR = parseInt(process.argv[2]) || 1700;
const END_YEAR   = parseInt(process.argv[3]) || 2100;
const LNG        = 100.5; // Bangkok meridian (ตรงกับ master_key spec)

if (START_YEAR > END_YEAR || START_YEAR < 200 || END_YEAR > 2400) {
  process.stderr.write('Error: year range invalid (200-2400)\n');
  process.exit(1);
}

const isLeap = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const DAYS   = [31,28,31,30,31,30,31,31,30,31,30,31];

function daysInMonth(y, m) {
  return (m === 2 && isLeap(y)) ? 29 : DAYS[m - 1];
}

function pad2(n) { return String(n).padStart(2, '0'); }

// ── Generate ──────────────────────────────────────────────────────────────────
process.stdout.write('jd,date_ce,su,mo,ma,me,ju,ve,sa,ra,ke,mr\n');

let rows = 0;
for (let y = START_YEAR; y <= END_YEAR; y++) {
  for (let m = 1; m <= 12; m++) {
    const days = daysInMonth(y, m);
    for (let d = 1; d <= days; d++) {
      const jd = get_j(d, m, y);
      const sp = get_data(d, m, y, 0, 0, LNG);
      // sp[1..10] = SU MO MA ME JU VE SA RA KE MR (unit: 21600/circle → ÷60 = degrees)
      const planets = [];
      for (let i = 1; i <= 10; i++) {
        planets.push((sp[i] / 60).toFixed(4));
      }
      const date_ce = `${y}-${pad2(m)}-${pad2(d)}`;
      process.stdout.write(`${jd},${date_ce},${planets.join(',')}\n`);
      rows++;
    }
  }
  // progress เฉพาะ stderr (ไม่กวน CSV output)
  if (y % 50 === 0 || y === END_YEAR) {
    process.stderr.write(`  ${y}/${END_YEAR} (${rows.toLocaleString()} rows)\n`);
  }
}
process.stderr.write(`Done: ${rows.toLocaleString()} rows written\n`);
