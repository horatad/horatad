/**
 * julian_proposal_gen.mjs
 * สร้าง content/julian_proposals.json จากผลวิจัยจริง
 * รัน: node workers/julian_proposal_gen.mjs
 * (รันใน JULIAN session — หลัง full_scan หรือ empirical analysis เสร็จ)
 */

import fs from 'fs';
import path from 'path';

const VALID_RULES    = 'ml/models/julian_valid_rules.json';
const REPORT_JSON    = 'workers/julian_report.json';   // ผล full_scan
const PROPOSALS_OUT  = 'content/julian_proposals.json';
const INBOX          = 'content/inbox';

const PLANET_THAI = {
  SU: 'อาทิตย์', MO: 'จันทร์', MA: 'อังคาร', ME: 'พุธ',
  JU: 'พฤหัส',  VE: 'ศุกร์',  SA: 'เสาร์',  RA: 'ราหู',
  KE: 'เกตุ',   MR: 'มฤตยู',  LA: 'ลัคนา',
};

const EVENT_THAI = {
  death:   'การเสียชีวิต',
  award:   'รางวัล / ความสำเร็จ',
  elected: 'ได้รับเลือกตั้ง',
  scandal: 'เรื่องอื้อฉาว',
  birth:   'การเกิด',
};

function pairThai(transit, natal) {
  return `${PLANET_THAI[transit] || transit}โจรกับ${PLANET_THAI[natal] || natal}นาตาล`;
}

function eventThai(eventType) {
  return EVENT_THAI[eventType] || eventType;
}

// โหลด valid rules จริง
function loadValidRules() {
  if (!fs.existsSync(VALID_RULES)) return [];
  const data = JSON.parse(fs.readFileSync(VALID_RULES, 'utf8'));
  return data.valid_rules || data || [];
}

// โหลด full_scan report (ถ้ามี)
function loadReportFindings() {
  if (!fs.existsSync(REPORT_JSON)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(REPORT_JSON, 'utf8'));
    // รองรับทั้ง array และ object
    if (Array.isArray(data)) return data;
    if (data.findings) return data.findings;
    if (data.results)  return data.results;
    return [];
  } catch { return []; }
}

function getExistingPairs() {
  const files = fs.readdirSync(INBOX).filter(f => f.endsWith('.json'));
  const pairs = new Set();
  for (const f of files) {
    try {
      const d = JSON.parse(fs.readFileSync(path.join(INBOX, f), 'utf8'));
      if (d.meta?.julian_pair) pairs.add(d.meta.julian_pair);
    } catch {}
  }
  return pairs;
}

function loadExistingProposals() {
  if (!fs.existsSync(PROPOSALS_OUT)) return [];
  return JSON.parse(fs.readFileSync(PROPOSALS_OUT, 'utf8'));
}

// สร้าง proposal จากผลวิจัยจริง
function buildFromFinding(finding) {
  const transit = finding.transit_planet || finding.planet1 || '';
  const natal   = finding.natal_planet   || finding.planet2 || '';
  const pair    = `${transit}×${natal}`;
  const lift    = finding.lift || finding.lift_ratio || 0;
  const n       = finding.n   || finding.count || 0;
  const event   = finding.event_type || finding.event || '';
  const aspect  = finding.aspect || finding.rule_type || 'conjunction';
  const p_adj   = finding.p_adj ?? finding.p_value ?? null;

  const hint = [
    `Lift ${lift.toFixed(3)}× — ${eventThai(event)}`,
    n   ? `n = ${n.toLocaleString()} เหตุการณ์` : '',
    p_adj !== null ? `p_adj = ${p_adj < 0.001 ? '< 0.001 (***)' : p_adj.toFixed(4)}` : '',
    `มุม: ${aspect}`,
  ].filter(Boolean).join(' | ');

  return {
    id: `julian_${pair.replace('×','_')}_${Date.now()}`,
    pair,
    transit,
    natal,
    thai: pairThai(transit, natal),
    topic: eventThai(event),
    hint,
    proposed_by: 'julian',
    finding: { lift, n, event_type: event, aspect, p_adj },
    status: 'pending',
    created_at: new Date().toISOString().slice(0, 10),
  };
}

// สร้าง proposal จาก valid_rules
function buildFromValidRule(rule) {
  const transit = rule.transit_planet || rule.planet1 || '';
  const natal   = rule.natal_planet   || rule.planet2 || '';
  const pair    = rule.pair || `${transit}×${natal}`;
  const lift    = rule.lift || 0;
  const n       = rule.n   || 0;
  const event   = rule.event_type || rule.category || '';

  const hint = [
    `✅ validated rule — Lift ${lift.toFixed(3)}×`,
    n ? `n = ${n.toLocaleString()}` : '',
    event ? eventThai(event) : '',
  ].filter(Boolean).join(' | ');

  return {
    id: `julian_vr_${pair.replace('×','_')}_${Date.now()}`,
    pair,
    transit,
    natal,
    thai: pairThai(transit, natal),
    topic: eventThai(event),
    hint,
    proposed_by: 'julian',
    finding: { lift, n, event_type: event, source: 'valid_rules' },
    status: 'pending',
    created_at: new Date().toISOString().slice(0, 10),
  };
}

function main() {
  const validRules    = loadValidRules();
  const reportFindings = loadReportFindings();
  const existingPairs  = getExistingPairs();
  const existing       = loadExistingProposals();

  // เก็บ pair+event ที่มีอยู่แล้ว (ป้องกันซ้ำ)
  const existingKeys = new Set(
    existing.map(p => `${p.pair}|${p.finding?.event_type || ''}`)
  );

  let added = 0;

  // 1. จาก full_scan report findings (ข้อมูลจริงครบที่สุด)
  for (const f of reportFindings) {
    const transit = f.transit_planet || f.planet1 || '';
    const natal   = f.natal_planet   || f.planet2 || '';
    const pair    = `${transit}×${natal}`;
    const event   = f.event_type || f.event || '';
    const key     = `${pair}|${event}`;
    const lift    = f.lift || f.lift_ratio || 0;

    if (existingKeys.has(key)) continue;
    if (existingPairs.has(pair)) continue;
    if (lift < 1.3) continue;  // กรอง signal อ่อนเกิน

    existing.push(buildFromFinding(f));
    existingKeys.add(key);
    added++;
  }

  // 2. จาก valid_rules (ผ่าน FDR แล้ว)
  for (const r of validRules) {
    const transit = r.transit_planet || r.planet1 || '';
    const natal   = r.natal_planet   || r.planet2 || '';
    const pair    = r.pair || `${transit}×${natal}`;
    const event   = r.event_type || r.category || '';
    const key     = `${pair}|${event}`;

    if (!pair || pair === '×') continue;
    if (existingKeys.has(key)) continue;
    if (existingPairs.has(pair)) continue;

    existing.push(buildFromValidRule(r));
    existingKeys.add(key);
    added++;
  }

  // เรียงตาม lift สูงสุดก่อน (pending เท่านั้น)
  existing.sort((a, b) => {
    if (a.status !== 'pending' || b.status !== 'pending') return 0;
    return (b.finding?.lift || 0) - (a.finding?.lift || 0);
  });

  fs.writeFileSync(PROPOSALS_OUT, JSON.stringify(existing, null, 2));
  console.log(`✅ proposals: ${existing.length} รายการ (เพิ่มจากข้อมูลจริง ${added} ใหม่)`);
  console.log(`   จาก full_scan: ${reportFindings.length} findings`);
  console.log(`   จาก valid_rules: ${validRules.length} rules`);
  console.log(`→ ${PROPOSALS_OUT}`);
}

main();
