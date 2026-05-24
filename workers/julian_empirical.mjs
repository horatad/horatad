#!/usr/bin/env node
// JULIAN Empirical Validator — Background Job (ไม่มีมนุษย์ใน loop)
// รันโดย GitHub Actions ทุกสัปดาห์หลังมีข้อมูลพอ (>= MIN_SAMPLES)
//
// Flow:
//   1. query D1: internet JOIN master_key (records ที่มี confidence >= 0.85)
//   2. match rules จาก kb.json กับ planets ของแต่ละคน
//   3. นับ hit/miss ต่อ rule
//   4. คำนวณ empirical_p = hits / (hits + miss)
//   5. เขียนกลับ kb.json อัตโนมัติ
//   6. commit กลับ repo
// ไม่ต้องมีมนุษย์ approve ทุกขั้นตอน

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const KB_FILE          = new URL('../v3/kb.json',           import.meta.url).pathname;
const MIN_SAMPLES      = 30;   // rule ต้องมี >= 30 samples จึงมี statistical significance
const MIN_CONFIDENCE   = 0.85; // ใช้เฉพาะ records ที่เชื่อถือได้
const MIN_TIER         = 2;    // tier 1-2 เท่านั้น

// ── Planet index ─────────────────────────────────────────────────────────────
const PLANET_IDX = { su:0, mo:1, ma:2, me:3, ju:4, ve:5, sa:6, ra:7, ke:8, mr:9 };
const SIGN_SIZE  = 30; // degrees per sign

function degToSign(deg)  { return Math.floor(((deg % 360) + 360) % 360 / SIGN_SIZE); } // 0-11
function degToHouse(deg, lagnaSign) {
  return ((degToSign(deg) - lagnaSign + 12) % 12) + 1; // 1-12
}

// ── Match single condition ────────────────────────────────────────────────────
function matchCondition(cond, planets, lagnaSign) {
  const p = planets[PLANET_IDX[cond.planet]];
  if (p === undefined || p === null) return false;

  const sign  = degToSign(p);
  const house = lagnaSign != null ? degToHouse(p, lagnaSign) : null;

  switch (cond.type) {
    case 'sign':
      return Array.isArray(cond.value)
        ? cond.value.includes(sign)
        : sign === cond.value;
    case 'house':
      if (house == null) return false;
      return Array.isArray(cond.value)
        ? cond.value.includes(house)
        : house === cond.value;
    case 'aspect': {
      const p2 = planets[PLANET_IDX[cond.planet2]];
      if (p2 === undefined || p2 === null) return false;
      const diff = Math.abs(((p - p2) % 360 + 360) % 360);
      const orb  = cond.orb ?? 8;
      const angles = Array.isArray(cond.value) ? cond.value : [cond.value];
      return angles.some(a => diff <= a + orb || diff >= 360 - a - orb);
    }
    case 'exalt':
    case 'debi':
    case 'own':
      // special dignity — handled by sign membership
      return Array.isArray(cond.value)
        ? cond.value.includes(sign)
        : sign === cond.value;
    default:
      return false;
  }
}

// ── Match all conditions of a rule ───────────────────────────────────────────
function matchRule(rule, planets, lagnaSign) {
  if (!rule.conditions?.length) return false;
  const op = rule.condition_op ?? 'AND';
  if (op === 'OR')  return rule.conditions.some(c  => matchCondition(c, planets, lagnaSign));
  return rule.conditions.every(c => matchCondition(c, planets, lagnaSign));
}

// ── Query D1 via wrangler ─────────────────────────────────────────────────────
function queryD1(sql) {
  try {
    const out = execSync(
      `wrangler d1 execute julian --command="${sql.replace(/"/g, '\\"')}" --json --remote`,
      { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }
    );
    const parsed = JSON.parse(out);
    return parsed[0]?.results ?? [];
  } catch (e) {
    console.error('D1 query failed:', e.message);
    return [];
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('JULIAN Empirical Validator');
  console.log(`Min samples: ${MIN_SAMPLES} | Min confidence: ${MIN_CONFIDENCE}`);

  // 1. โหลด kb.json
  let kb;
  try {
    kb = JSON.parse(readFileSync(KB_FILE, 'utf8'));
  } catch (e) {
    console.error('Cannot read kb.json:', e.message);
    process.exit(1);
  }
  const rules = Array.isArray(kb) ? kb : kb.rules ?? [];
  console.log(`Loaded ${rules.length} rules from kb.json`);

  // 2. ดึง records จาก D1 (internet JOIN master_key)
  console.log('\nQuerying D1...');
  const rows = queryD1(`
    SELECT i.jd, i.name, i.lagna_sign, i.tier,
           m.su, m.mo, m.ma, m.me, m.ju, m.ve, m.sa, m.ra, m.ke, m.mr
    FROM internet i
    JOIN master_key m ON i.jd = m.jd
    WHERE i.confidence >= ${MIN_CONFIDENCE}
      AND i.tier <= ${MIN_TIER}
      AND i.type = 'human'
    LIMIT 5000
  `);

  if (rows.length === 0) {
    console.log('No records found — D1 ยังไม่มีข้อมูลพอ รอ automation scrape ก่อน');
    process.exit(0);
  }
  console.log(`Got ${rows.length} records for empirical testing`);

  // 3. match rules ต่อคน — นับ hit/miss
  const stats = {}; // ruleId → { hits, total }
  for (const rule of rules) {
    if (!rule.conditions?.length) continue;
    stats[rule.id] = { hits: 0, total: 0 };
  }

  for (const row of rows) {
    const planets    = [row.su, row.mo, row.ma, row.me, row.ju, row.ve, row.sa, row.ra, row.ke, row.mr];
    const lagnaSign  = row.lagna_sign ?? null;

    for (const rule of rules) {
      if (!stats[rule.id]) continue;
      const hit = matchRule(rule, planets, lagnaSign);
      stats[rule.id].total++;
      if (hit) stats[rule.id].hits++;
    }
  }

  // 4. คำนวณ empirical_p และอัปเดต kb.json
  let updated = 0;
  for (const rule of rules) {
    const s = stats[rule.id];
    if (!s || s.total < MIN_SAMPLES) continue; // ไม่พอ sample → ข้าม

    const empirical_p = parseFloat((s.hits / s.total).toFixed(4));
    if (rule.empirical_p === empirical_p && rule.empirical_n === s.total) continue;

    rule.empirical_p   = empirical_p;
    rule.empirical_n   = s.total;
    rule.empirical_updated = new Date().toISOString().slice(0, 10);
    updated++;
  }

  console.log(`\nUpdated empirical_p for ${updated} rules`);
  console.log(`Skipped (< ${MIN_SAMPLES} samples): ${rules.filter(r => stats[r.id] && stats[r.id].total < MIN_SAMPLES).length} rules`);

  if (updated === 0) {
    console.log('No changes — kb.json unchanged');
    process.exit(0);
  }

  // 5. เขียน kb.json กลับ
  const kbOut = Array.isArray(kb) ? rules : { ...kb, rules };
  writeFileSync(KB_FILE, JSON.stringify(kbOut, null, 2));
  console.log('kb.json updated');

  // 6. Summary stats
  const withEmp = rules.filter(r => r.empirical_p != null);
  const strong  = withEmp.filter(r => r.empirical_p >= 0.70);
  const weak    = withEmp.filter(r => r.empirical_p < 0.45);
  console.log(`\nSummary:`);
  console.log(`  Rules with empirical data: ${withEmp.length}/${rules.length}`);
  console.log(`  Strong rules (p >= 0.70):  ${strong.length}`);
  console.log(`  Weak rules   (p < 0.45):   ${weak.length}`);
  if (weak.length > 0) {
    console.log(`  Weak rule IDs: ${weak.map(r => r.id).join(', ')}`);
  }
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
