/**
 * julian_proposal_gen.mjs
 * สร้าง content/julian_proposals.json — รายการหัวข้อรอ user อนุมัติ
 * รัน: node workers/julian_proposal_gen.mjs
 * (รันใน JULIAN session ทุกสัปดาห์)
 */

import fs from 'fs';
import path from 'path';

const VALID_RULES   = 'ml/models/julian_valid_rules.json';
const PROPOSALS_OUT = 'content/julian_proposals.json';
const INBOX         = 'content/inbox';

// Planet pairs ที่ยังไม่ได้วิเคราะห์ครบ (เพิ่มเติมได้)
const PLANET_PAIRS = [
  { pair: 'SU×JU', transit: 'SU', natal: 'JU', thai: 'อาทิตย์โจรกับพฤหัสนาตาล', topic: 'โชค ความสำเร็จ การเงิน' },
  { pair: 'SU×SA', transit: 'SU', natal: 'SA', thai: 'อาทิตย์โจรกับเสาร์นาตาล', topic: 'อุปสรรค วินัย ความล้มเหลว' },
  { pair: 'SU×KE', transit: 'SU', natal: 'KE', thai: 'อาทิตย์โจรกับเกตุนาตาล', topic: 'จิตวิญญาณ การสูญเสีย' },
  { pair: 'SA×JU', transit: 'SA', natal: 'JU', thai: 'เสาร์โจรกับพฤหัสนาตาล', topic: 'บทเรียนชีวิต การเติบโต' },
  { pair: 'SA×KE', transit: 'SA', natal: 'KE', thai: 'เสาร์โจรกับเกตุนาตาล', topic: 'กรรม การปล่อยวาง' },
  { pair: 'JU×SA', transit: 'JU', natal: 'SA', thai: 'พฤหัสโจรกับเสาร์นาตาล', topic: 'โชคพลิกผัน การฟื้นตัว' },
  { pair: 'JU×MR', transit: 'JU', natal: 'MR', thai: 'พฤหัสโจรกับมฤตยูนาตาล', topic: 'ความตาย การเปลี่ยนแปลงใหญ่' },
  { pair: 'MO×SA', transit: 'MO', natal: 'SA', thai: 'จันทร์โจรกับเสาร์นาตาล', topic: 'อารมณ์ ความเศร้า' },
  { pair: 'MO×MR', transit: 'MO', natal: 'MR', thai: 'จันทร์โจรกับมฤตยูนาตาล', topic: 'อุบัติเหตุ ความรุนแรง' },
  { pair: 'RA×MR', transit: 'RA', natal: 'MR', thai: 'ราหูโจรกับมฤตยูนาตาล', topic: 'ความตายกะทันหัน โชคร้าย' },
];

// โหลด valid rules ที่มีอยู่แล้ว
function loadValidRules() {
  if (!fs.existsSync(VALID_RULES)) return [];
  const data = JSON.parse(fs.readFileSync(VALID_RULES, 'utf8'));
  return data.valid_rules || data || [];
}

// โหลด inbox เพื่อเช็คว่า pair ไหนมีอยู่แล้ว
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

// โหลด proposals เดิม
function loadExistingProposals() {
  if (!fs.existsSync(PROPOSALS_OUT)) return [];
  return JSON.parse(fs.readFileSync(PROPOSALS_OUT, 'utf8'));
}

function buildProposal(pairDef, validRules) {
  // หา rules ที่เกี่ยวกับ pair นี้จาก valid_rules
  const related = validRules.filter(r =>
    r.rule?.includes(pairDef.transit) || r.planet1 === pairDef.transit
  );
  const topRule = related.sort((a, b) => (b.lift || 0) - (a.lift || 0))[0];

  const hint = topRule
    ? `พบ signal เบื้องต้น: lift ${topRule.lift?.toFixed(2)}× (${topRule.event_type || 'event'})`
    : 'ยังไม่มีข้อมูล — รัน full scan';

  return {
    id: `julian_${pairDef.pair.replace('×', '_')}_${Date.now()}`,
    pair: pairDef.pair,
    transit: pairDef.transit,
    natal: pairDef.natal,
    thai: pairDef.thai,
    topic: pairDef.topic,
    hint,
    status: 'pending',   // pending | approved | processing | done | skipped
    created_at: new Date().toISOString().slice(0, 10),
  };
}

function main() {
  const validRules     = loadValidRules();
  const existingPairs  = getExistingPairs();
  const existing       = loadExistingProposals();
  const existingIds    = new Set(existing.map(p => p.pair));

  let added = 0;
  for (const def of PLANET_PAIRS) {
    if (existingIds.has(def.pair)) continue;          // มีอยู่แล้ว
    if (existingPairs.has(def.pair)) continue;        // อยู่ใน inbox แล้ว
    existing.push(buildProposal(def, validRules));
    added++;
  }

  fs.writeFileSync(PROPOSALS_OUT, JSON.stringify(existing, null, 2));
  console.log(`✅ proposals: ${existing.length} รายการ (เพิ่ม ${added} ใหม่)`);
  console.log(`→ ${PROPOSALS_OUT}`);
}

main();
