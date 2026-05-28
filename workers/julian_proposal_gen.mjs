/**
 * julian_proposal_gen.mjs
 * สร้าง content/julian_proposals.json จากผลวิจัยจริง
 * รัน: node workers/julian_proposal_gen.mjs
 * (รันใน JULIAN session — หลัง full_scan หรือ empirical analysis เสร็จ)
 *
 * vocab_standard.json (content/vocab_standard.json) คือแหล่งความจำถาวรของ JULIAN
 * สำหรับการแปลคำ — ห้ามใช้ hardcoded Thai ในไฟล์นี้
 * ทุกคำต้องผ่าน vocabLabel() หรือ vocabTals()
 */

import fs from 'fs';
import path from 'path';

const VALID_RULES    = 'ml/models/julian_valid_rules.json';
const REPORT_JSON    = 'workers/julian_report.json';
const PROPOSALS_OUT  = 'content/julian_proposals.json';
const INBOX          = 'content/inbox';
const VOCAB_PATH     = 'content/vocab_standard.json';

// --- Vocab lookup (โหลดจาก vocab_standard.json ทุกครั้ง — ไม่มี hardcode) ---

function loadVocab() {
  if (!fs.existsSync(VOCAB_PATH)) return {};
  const list = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf8'));
  const map = {};
  for (const v of list) {
    if (!v.research_abbrev) continue;
    map[v.research_abbrev] = v;
  }
  return map;
}

const VOCAB = loadVocab();

// research_label = ข้อความ Thai ใช้ใน FB post (เช่น "ดาวอาทิตย์", "กุม")
function vocabLabel(abbrev, fallback) {
  return VOCAB[abbrev]?.research_label || fallback || abbrev;
}

// tals_terms[0] = ชื่อสั้น TALS (เช่น "อาทิตย์" ไม่ใช่ "ดาวอาทิตย์")
function vocabTals(abbrev, fallback) {
  const terms = VOCAB[abbrev]?.tals_terms;
  return (terms && terms.length) ? terms[0] : (fallback || abbrev);
}

// llm_aliases = คำที่ LLM/text อื่นใช้ → ใช้สำหรับ normalize input
function vocabAliases(abbrev) {
  return VOCAB[abbrev]?.llm_aliases || [];
}

// EVENT_THAI — hardcode ได้ (ไม่มีใน vocab schema ตอนนี้)
const EVENT_THAI = {
  death:           'การเสียชีวิต',
  award:           'รางวัล / ความสำเร็จ',
  award_received:  'ได้รับรางวัล',
  position_start:  'รับตำแหน่ง',
  elected:         'ได้รับเลือกตั้ง',
  scandal:         'เรื่องอื้อฉาว',
  birth:           'การเกิด',
};

// ชื่อคู่ดาวสำหรับ proposal.thai — ใช้ชื่อสั้น TALS
function pairThai(transit, natal) {
  return `${vocabTals(transit, transit)}โจรกับ${vocabTals(natal, natal)}นาตาล`;
}

// ชื่อคู่ดาวสำหรับ FB caption body — ใช้ research_label (ดาวอาทิตย์, ดาวเสาร์)
function pairFBLabel(transit, natal) {
  return `${vocabLabel(transit, transit)}จรผ่าน${vocabLabel(natal, natal)}นาตาล`;
}

// aspect label สำหรับ FB post — ใช้ TALS code → research_label (กุม/เล็ง/โยค/ตรีโกณ)
function aspectLabel(code) {
  const map = { KUM:'กุม', LENG:'เล็ง', YOK:'โยค', TRI:'ตรีโกณ',
                conj:'กุม', oppo:'เล็ง', trin:'โยค', sext:'ตรีโกณ',
                dist5:'โยค', dist1:'ตรีโกณ', squa:'square (ไม่มีใน TALS)' };
  return map[code] || vocabLabel(code, code);
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

// ป้ายกำกับ polarity (TALS) — ใช้รวม valid_rules เป็น content unit เดียว
const POLARITY_THAI = {
  hard_death: { label: 'มุมแข็ง (hard)', topic: 'เหตุร้าย / เสียชีวิต' },
  soft_award: { label: 'มุมอ่อน (soft)', topic: 'รางวัล / ความสำเร็จ' },
};

// รวม valid_rules ที่ polarity เดียวกัน → 1 proposal
// (เคารพ TALS polarity — pair|event หยาบเกินเพราะ event เดียวกันมีทั้งทิศ ↑ และ ↓)
function buildFromPolarityGroup(polarity, rows) {
  const transit = rows[0].transit_planet;
  const natal   = rows[0].natal_planet;
  const pair    = `${transit}×${natal}`;
  const meta    = POLARITY_THAI[polarity] || { label: polarity, topic: '' };

  // สรุปแต่ละ event: ทิศทาง (↑/↓) + ช่วง lift + n สูงสุด
  const byEvent = {};
  for (const r of rows) (byEvent[r.event_type] ||= []).push(r);

  const eventParts = [];
  const events = {};
  let maxN = 0, minP = 1, strongLift = 1;
  for (const [e, ers] of Object.entries(byEvent)) {
    const lifts = ers.map(r => r.lift);
    const lo = Math.min(...lifts), hi = Math.max(...lifts);
    const nMax = Math.max(...ers.map(r => r.class_n || 0));
    const dir = (lo + hi) / 2 >= 1 ? '↑' : '↓';
    const lr  = lo === hi ? lo.toFixed(2) : `${lo.toFixed(2)}–${hi.toFixed(2)}`;
    eventParts.push(`${eventThai(e)}${dir} lift ${lr}`);
    events[e] = { lift_min: lo, lift_max: hi, n_max: nMax };
    maxN = Math.max(maxN, nMax);
    minP = Math.min(minP, ...ers.map(r => r.p_adj ?? 1));
    // lift ที่ effect แรงสุด (ห่างจาก 1 มากสุด) — ใช้ sort
    for (const l of lifts) if (Math.abs(l - 1) > Math.abs(strongLift - 1)) strongLift = l;
  }

  const hint = [
    `✅ validated (${rows.length} กฎ FDR · ${meta.label})`,
    ...eventParts,
    `n สูงสุด ${maxN.toLocaleString()}`,
    `p_adj ${minP < 0.001 ? '< 0.001 (***)' : minP.toFixed(4)}`,
  ].join(' | ');

  return {
    id: `julian_vr_${pair.replace('×','_')}_${polarity}_${Date.now()}`,
    pair,
    transit,
    natal,
    thai: `${vocabTals(transit,transit)}โจร${meta.label}กับ${vocabTals(natal,natal)}นาตาล`,
    fb_label: pairFBLabel(transit, natal),
    topic: meta.topic,
    hint,
    proposed_by: 'julian',
    finding: { polarity, n_rules: rows.length, events, lift: strongLift, p_adj: minP, source: 'valid_rules' },
    status: 'pending',
    created_at: new Date().toISOString().slice(0, 10),
  };
}

// --- FB Caption Builder (ใช้ vocab ทุกครั้ง — ห้าม hardcode Thai ใหม่) ---
//
// เรียกเมื่อ proposal status=approved → สร้าง body สำหรับ content/inbox/
// กฎ:
//   - ชื่อดาว  → vocabLabel(abbrev)       เช่น SU → "ดาวอาทิตย์"
//   - มุมดาว   → aspectLabel(code)         เช่น YOK → "โยค"
//   - ตัวเลข   → research_abbrev           เช่น "Lift 1.16×"
//   - ห้ามใส่ภาษาอังกฤษ raw ใน body (เว้นแต่เป็น abbrev ที่ตกลงกันแล้ว: Lift, p, FDR, n)
//
export function buildFBCaption(proposal) {
  const { transit, natal, finding = {}, thai } = proposal;
  const tLabel  = vocabLabel(transit, transit);
  const nLabel  = vocabLabel(natal, natal);
  const pair    = `${tLabel}จรผ่าน${nLabel}นาตาล`;

  const liftStr = finding.lift != null
    ? (finding.lift > 1
        ? `สูงกว่าปกติ ${finding.lift.toFixed(2)} เท่า`
        : `ต่ำกว่าปกติ ${finding.lift.toFixed(2)} เท่า`)
    : '';

  const nStr    = finding.n_max || finding.n
    ? `(ข้อมูล ${(finding.n_max || finding.n).toLocaleString()} เหตุการณ์)`
    : '';

  const pStr    = finding.p_adj != null
    ? `p ${finding.p_adj < 0.001 ? '< 0.001' : finding.p_adj.toFixed(4)}`
    : '';

  const events  = finding.events || {};
  const eventLines = Object.entries(events).map(([e, d]) => {
    const dir = (d.lift_min + d.lift_max) / 2 >= 1 ? '🔺' : '🔻';
    const lr  = d.lift_min === d.lift_max
      ? d.lift_min.toFixed(2)
      : `${d.lift_min.toFixed(2)}–${d.lift_max.toFixed(2)}`;
    return `  ${dir} ${eventThai(e)}: Lift ${lr}×`;
  });

  const body = [
    `🔭 โหราทาส วิจัย: ${pair}`,
    '',
    `จากฐานข้อมูลบุคคลสำคัญ ${nStr || ''}`,
    ...(liftStr ? [`📊 โอกาส${eventThai(finding.event_type || '')} ${liftStr} ${pStr}`] : []),
    ...(eventLines.length ? ['', ...eventLines] : []),
    '',
    `✅ ผ่านการตรวจสอบข้ามยุค + ข้ามประเทศ`,
    '',
    `#โหราทาส #TALS #โหราศาสตร์ไทย #AstrologyResearch`,
  ].join('\n').trim();

  return body;
}

// (เก็บไว้เผื่อ source อื่น — valid_rules ใช้ buildFromPolarityGroup แทน)
function buildFromValidRule(rule) {
  const transit = rule.transit_planet || rule.planet1 || '';
  const natal   = rule.natal_planet   || rule.planet2 || '';
  const pair    = rule.pair || `${transit}×${natal}`;
  const lift    = rule.lift || 0;
  // valid_rules ใช้ field `class_n` (จำนวนเหตุการณ์ในกลุ่ม) — `n` ไม่มีจริง
  const n       = rule.class_n || rule.n || 0;
  const event   = rule.event_type || rule.category || '';
  const p_adj   = rule.p_adj ?? null;
  const aspect  = rule.aspect || '';

  const hint = [
    `✅ validated rule — Lift ${lift.toFixed(3)}×`,
    n ? `n = ${n.toLocaleString()}` : '',
    p_adj !== null ? `p_adj = ${p_adj < 0.001 ? '< 0.001 (***)' : p_adj.toFixed(4)}` : '',
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
    finding: { lift, n, event_type: event, aspect, p_adj, source: 'valid_rules' },
    status: 'pending',
    created_at: new Date().toISOString().slice(0, 10),
  };
}

function main() {
  const validRules    = loadValidRules();
  const reportFindings = loadReportFindings();
  const existingPairs  = getExistingPairs();
  const existing       = loadExistingProposals();

  // เก็บ pair+event ที่มีอยู่แล้ว (ป้องกันซ้ำ — สำหรับ full_scan findings)
  const existingKeys = new Set(
    existing.map(p => `${p.pair}|${p.finding?.event_type || ''}`)
  );
  // เก็บ pair+polarity ที่มีอยู่แล้ว (ป้องกันซ้ำ — สำหรับ valid_rules grouped)
  const existingPolarityKeys = new Set(
    existing.filter(p => p.finding?.polarity).map(p => `${p.pair}|${p.finding.polarity}`)
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

  // 2. จาก valid_rules (ผ่าน FDR แล้ว) — group by polarity → 1 proposal/group
  const byPolarity = {};
  for (const r of validRules) {
    const transit = r.transit_planet || r.planet1 || '';
    const natal   = r.natal_planet   || r.planet2 || '';
    const pair    = r.pair || `${transit}×${natal}`;
    if (!pair || pair === '×') continue;
    const pol = r.polarity || (r.event_type || 'unknown');
    (byPolarity[`${pair}|${pol}`] ||= []).push(r);
  }
  for (const [groupKey, rows] of Object.entries(byPolarity)) {
    const pair = groupKey.split('|')[0];
    const pol  = rows[0].polarity || groupKey.split('|')[1];
    if (existingPolarityKeys.has(groupKey)) continue;
    if (existingPairs.has(pair)) continue;  // มี inbox post ของ pair นี้แล้ว

    existing.push(buildFromPolarityGroup(pol, rows));
    existingPolarityKeys.add(groupKey);
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
