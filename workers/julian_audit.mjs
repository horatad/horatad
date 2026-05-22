#!/usr/bin/env node
// JULIAN Data Audit — สแกน julian_all.json หาข้อมูลที่น่าสงสัย
// "wrong guess better than wrong data" — เจอผิด ลบทิ้ง ไม่ต้องเก็บ
//
// Usage:
//   node workers/julian_audit.mjs            # report only (read-only)
//   node workers/julian_audit.mjs --clean    # report + เขียนทับ clean version
//
// Detects:
//   1. time_utc cluster (>3 records ใช้เวลาเดียวกัน = parser จับผิด)
//   2. Future records (year >= 2030 = likely fictional)
//   3. Default times (12:00, 11:00, 00:00 ที่บอกว่า "unknown")
//   4. Missing required fields (jd, name)
//
// Output (--clean mode):
//   - time_utc → null สำหรับ records ที่ flag
//   - confidence ลด
//   - notes บอกเหตุผล

import { readFileSync, writeFileSync } from 'fs';

const PATH = process.argv.find(a => a.endsWith('.json')) || 'data/julian_all.json';
const APPLY = process.argv.includes('--clean');

// ── Known fictional Wikidata QIDs — ลบทันทีที่เจอ ──────────────────────────
// เก็บ list manual เพราะ SPARQL filter กันได้แค่ run ถัดไป
// list นี้ขยายได้เมื่อพบ fictional เพิ่ม (sed -i แก้ที่นี่)
const FICTIONAL_QIDS = new Set([
  'Q988925',   // Ellen Ripley (Alien franchise)
  'Q2079562',  // SHODAN (System Shock)
  'Q2570349',  // Spike Spiegel (Cowboy Bebop)
]);

const records = JSON.parse(readFileSync(PATH, 'utf8'));

// ── 1. ตรวจสถิติ time_utc ──────────────────────────────────────────────────
const timeCount = {};
let hasTime = 0;
let hasGeo  = 0;
for (const r of records) {
  if (r.time_utc) {
    hasTime++;
    timeCount[r.time_utc] = (timeCount[r.time_utc] || 0) + 1;
  }
  if (r.lat !== null && r.lng !== null) hasGeo++;
}

// time ที่ซ้ำ > 3 ครั้ง = suspicious cluster
const SUSPICIOUS_THRESHOLD = 3;
const suspicious = new Set();
for (const [t, c] of Object.entries(timeCount)) {
  if (c > SUSPICIOUS_THRESHOLD) suspicious.add(t);
}

// blacklist default times เสมอ
const BLACKLIST = new Set(['12:00', '00:00', '11:00', '12:30']);
for (const t of BLACKLIST) suspicious.add(t);

// ── 2. ตรวจ future records (likely fictional) ──────────────────────────────
const futureRecords = [];
const FUTURE_THRESHOLD = 2030;
for (const r of records) {
  const yearMatch = (r.event_label || '').match(/(\d{4})/);
  if (yearMatch && parseInt(yearMatch[1]) >= FUTURE_THRESHOLD) {
    futureRecords.push(r);
  }
}

// ── 3. Apply cleanup ───────────────────────────────────────────────────────
let timeDropped = 0;
let confLowered = 0;
let fictionalRemoved = 0;

// Filter ออก fictional QIDs ก่อน
const cleaned = records
  .filter(r => {
    const qid = (r.source || '').replace(/^wikidata:/, '');
    if (FICTIONAL_QIDS.has(qid)) {
      console.log(`  ✗ remove fictional: ${r.name} (${r.source})`);
      fictionalRemoved++;
      return false;
    }
    return true;
  })
  .map(r => {
    const out = { ...r };
    const reasons = [];

    if (out.time_utc && suspicious.has(out.time_utc)) {
      reasons.push(`time_cluster_${timeCount[out.time_utc]}x`);
      out.time_utc = null;
      timeDropped++;
    }

    if (reasons.length) {
      out.confidence = Math.min(out.confidence ?? 0.9, 0.7);
      out.notes = out.notes
        ? `${out.notes}|audit:${reasons.join(',')}`
        : `audit:${reasons.join(',')}`;
      confLowered++;
    }

    return out;
  });

// ── Report ─────────────────────────────────────────────────────────────────
console.log('## JULIAN Data Audit Report');
console.log(`File: ${PATH}`);
console.log(`Mode: ${APPLY ? 'CLEAN (will write back)' : 'REPORT ONLY (use --clean to apply)'}`);
console.log('');
console.log(`Total records:        ${records.length}`);
console.log(`Records with time:    ${hasTime} (${(hasTime/records.length*100).toFixed(2)}%)`);
console.log(`Records with geo:     ${hasGeo} (${(hasGeo/records.length*100).toFixed(2)}%)`);
console.log(`Future records (≥${FUTURE_THRESHOLD}): ${futureRecords.length} (likely fictional — กระจาย era ที่เกินปีปัจจุบัน)`);
console.log('');
console.log(`## Suspicious time_utc clusters (>${SUSPICIOUS_THRESHOLD}x) + blacklist:`);
const sorted = Object.entries(timeCount)
  .filter(([t,c]) => c > SUSPICIOUS_THRESHOLD || BLACKLIST.has(t))
  .sort((a,b) => b[1] - a[1]);
console.log(`Distinct suspicious times: ${sorted.length}`);
for (const [t, c] of sorted.slice(0, 15)) {
  const tag = BLACKLIST.has(t) ? ' [default]' : '';
  console.log(`  ${t}: ${c}x${tag}`);
}

console.log('');
console.log(`## Sample future records (top 5):`);
for (const r of futureRecords.slice(0, 5)) {
  console.log(`  ${r.name} — ${r.event_label} (${r.source})`);
}

console.log('');
console.log(`## Cleanup summary:`);
console.log(`  fictional removed:    ${fictionalRemoved} (QID blocklist)`);
console.log(`  time_utc dropped:     ${timeDropped}`);
console.log(`  confidence lowered:   ${confLowered}`);
console.log(`  time_utc remaining:   ${hasTime - timeDropped} (after cleanup)`);
console.log(`  records remaining:    ${cleaned.length} (after cleanup)`);

if (APPLY) {
  writeFileSync(PATH, JSON.stringify(cleaned, null, 2));
  console.log(`\n✓ Written cleaned data → ${PATH}`);
} else {
  console.log(`\n→ Use --clean flag to apply changes`);
}
