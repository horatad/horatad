// Version 1.0.0 | 2026-05-22 — Horatad Master Dictionary
// rules-tier domain constants + helpers
// เลเยอร์ระหว่าง engine.js (ancient computation) และ interpretation.js (pipeline)
// import จาก engine.js ได้ — ห้าม engine import ย้อนกลับ
// ES Module

import {
  KASET_MAP,
  EXALT_MAP,
} from './engine.js';

// ── Planet Relations (ground truth: kb chapter_08) ────────────────────────
// คู่มิตร — ส่งเสริมกัน มีกำลังมากยิ่งขึ้น
export const FRIEND_PAIRS  = [[1,5],[2,4],[3,6],[7,8]];
// คู่ศัตรู — บ่อนทำลายกัน อ่อนกำลังทั้งคู่
export const ENEMY_PAIRS   = [[1,3],[2,5],[4,8],[6,7]];
// คู่สมพล — ส่งเสริมกันคล้ายคู่มิตร
export const SAMPHON_PAIRS = [[1,6],[2,8],[3,5],[4,7]];

// ── Planet Elements (ground truth: kb chapter_08 section 8.2) ─────────────
// ธาตุไฟ / ลม / น้ำ / ดิน — ดาวธาตุเดียวกันสัมพันธ์กันเข้ากันสนิท
export const ELEMENT_MAP = {
  1:'ไฟ',  7:'ไฟ',
  3:'ลม',  8:'ลม',
  4:'น้ำ', 6:'น้ำ',
  2:'ดิน', 5:'ดิน',
};

// บาปเคราะห์ตำราไทย — อังคาร(3) เสาร์(7) ราหู(8) มฤตยู(10)
export const EVIL_PLANETS = [3,7,8,10];

// ชื่อภพไทย index 1-12 (index 0 ไม่ใช้)
export const HOUSE_NAMES_TH = ['','ตนุ','กฎุมพะ','สหัชชะ','พันธุ','ปุตตะ','อริ','ปัตนิ','มรณะ','ศุภะ','กัมมะ','ลาภะ','วินาศ'];

// ── Planet relationship helpers ───────────────────────────────────────────

/**
 * planet_relation(p1, p2) → 'มิตร' | 'ศัตรู' | 'สมพล' | 'ตน' | 'ปกติ'
 * เกตุ(9), มฤตยู(10) ไม่อยู่ในระบบคู่ → 'ปกติ'
 */
export function planet_relation(p1,p2){
  if(p1===p2)return'ตน';
  const has=pairs=>pairs.some(([a,b])=>(a===p1&&b===p2)||(a===p2&&b===p1));
  if(has(FRIEND_PAIRS))return'มิตร';
  if(has(ENEMY_PAIRS))return'ศัตรู';
  if(has(SAMPHON_PAIRS))return'สมพล';
  return'ปกติ';
}

/**
 * element_relation(p1, p2) → 'SAME' | 'DIFFERENT' | 'UNKNOWN'
 * ใช้ดาวธาตุเดียวกันเช็ค — เกตุ(9), มฤตยู(10) ไม่มีธาตุในตำรา → UNKNOWN
 */
export function element_relation(p1,p2){
  const e1=ELEMENT_MAP[p1],e2=ELEMENT_MAP[p2];
  if(!e1||!e2)return'UNKNOWN';
  return e1===e2?'SAME':'DIFFERENT';
}

// ── Aspect helpers (geometry, but used by rules) ──────────────────────────

// helper: distance signs → aspect (กุม/เล็ง/โยค/ตรีโกณ)
function _aspectFromDist(dist){
  if(dist===0)return'KUM';
  if(dist===6)return'LENG';
  if(dist===3||dist===9)return'YOK';
  if(dist===4||dist===8)return'TRI';
  return'NONE';
}

/**
 * aspect_to_planet(pos, p1, p2) → 'KUM'|'LENG'|'YOK'|'TRI'|'NONE'
 * คำนวณ aspect ของ p1 เทียบกับ p2 ใน chart เดียวกัน (natal-natal)
 */
export function aspect_to_planet(pos,p1,p2){
  if(p1===p2||p1==null||p2==null)return'NONE';
  const s1=Math.trunc(pos[p1]/1800),s2=Math.trunc(pos[p2]/1800);
  return _aspectFromDist(((s1-s2)+12)%12);
}

/**
 * transit_to_natal_aspect(natalPos, transitPos, transitIdx, natalIdx)
 * → 'KUM'|'LENG'|'YOK'|'TRI'|'NONE'
 */
export function transit_to_natal_aspect(natalPos,transitPos,transitIdx,natalIdx){
  const sT=Math.trunc(transitPos[transitIdx]/1800);
  const sN=Math.trunc(natalPos[natalIdx]/1800);
  return _aspectFromDist(((sT-sN)+12)%12);
}

const ASPECT_RANK={KUM:5,LENG:4,YOK:3,TRI:2,NONE:0};

/**
 * count_evil_lagna_aspects(pos, ascSign, minStrength='LENG')
 * นับดาวร้าย (อังคาร เสาร์ ราหู มฤตยู) ที่สัมพันธ์ลัคนา ≥ minStrength
 */
export function count_evil_lagna_aspects(pos,ascSign,minStrength='LENG'){
  const min=ASPECT_RANK[minStrength]||0;
  let count=0;
  for(const p of EVIL_PLANETS){
    const h=(Math.trunc(pos[p]/1800)-ascSign+12)%12+1;
    let asp='NONE';
    if(h===1)asp='KUM';
    else if(h===7)asp='LENG';
    else if(h===4||h===10)asp='YOK';
    else if(h===5||h===9)asp='TRI';
    if(ASPECT_RANK[asp]>=min)count++;
  }
  return count;
}

// ── House name helpers ───────────────────────────────────────────────────

/**
 * house_name_to_idx(name) → 1-12 หรือ null
 */
export function house_name_to_idx(name){
  const idx=HOUSE_NAMES_TH.indexOf(name);
  return idx>0?idx:null;
}

/**
 * house_idx_to_name(idx) → 'ตนุ' | 'กฎุมพะ' | ... | ''
 */
export function house_idx_to_name(idx){
  return HOUSE_NAMES_TH[idx]||'';
}

// ════════════════════════════════════════════════════════════════════════════
// EXTRACTION VOCABULARY — ใช้โดย extraction pipeline (Groq / Typhoon / Claude)
// Source of truth สำหรับ domain language ทั้งหมด
// buildExtractionContext() → string พร้อมใส่ใน LLM system prompt
// ════════════════════════════════════════════════════════════════════════════

// ── Planet Aliases ───────────────────────────────────────────────────────────
// ทุก alias ที่ปรากฏในตำราสุริยยาตร์ → map กลับไปที่ planet_id
export const PLANET_ALIASES = {
  1:  ['อาทิตย์','พระอาทิตย์','สุริยะ','สุริยน','รวิ','ทิวากร','สุริยา'],
  2:  ['จันทร์','พระจันทร์','จันทรา','จันทรมา','ศศิ','ศศิธร','นิศากร','โสม','โสมะ'],
  3:  ['อังคาร','พระอังคาร','โลหิต','ภูมิ','ภอม','มังกล'],
  4:  ['พุธ','พระพุธ','โสมย','สอม','โสมบุตร'],
  5:  ['พฤหัสบดี','พระพฤหัส','พฤหัส','คุรุ','ครู','ชีโว','ไชโว','เทวคุรุ','วาจสบดี'],
  6:  ['ศุกร์','พระศุกร์','ศุกรา','ภาร์กว','ภาร์กวะ','ภาร์กวี'],
  7:  ['เสาร์','พระเสาร์','สนิ','สนีศวร','มันท','กฤษณ'],
  8:  ['ราหู','พระราหู'],
  9:  ['เกตุ','พระเกตุ'],
  10: ['มฤตยู','พระมฤตยู','มฤตยูราช'],
};

// ── Sign Names (ราศี) ─────────────────────────────────────────────────────────
// index 1-12 พร้อม alias ที่ใช้ในตำรา
export const SIGN_NAMES = [
  null,
  {id:1,  name:'เมษ',    aliases:['ราศีเมษ','เมษราศี','แกะ']},
  {id:2,  name:'พฤษภ',   aliases:['ราศีพฤษภ','พฤษภราศี','วัว']},
  {id:3,  name:'เมถุน',  aliases:['ราศีเมถุน','เมถุนราศี','คู่']},
  {id:4,  name:'กรกฎ',   aliases:['ราศีกรกฎ','กรกฎราศี','ปู']},
  {id:5,  name:'สิงห์',  aliases:['ราศีสิงห์','สิงห์ราศี','สิงโต']},
  {id:6,  name:'กันย์',  aliases:['ราศีกันย์','กันย์ราศี','กันยา','สาว']},
  {id:7,  name:'ตุล',    aliases:['ราศีตุล','ตุลราศี','ตาชั่ง']},
  {id:8,  name:'พิจิก',  aliases:['ราศีพิจิก','พิจิกราศี','แมงป่อง']},
  {id:9,  name:'ธนู',    aliases:['ราศีธนู','ธนูราศี','คนยิงธนู']},
  {id:10, name:'มกร',    aliases:['ราศีมกร','มกรราศี','แพะ','มังกร']},
  {id:11, name:'กุมภ์',  aliases:['ราศีกุมภ์','กุมภ์ราศี','หม้อน้ำ']},
  {id:12, name:'มีน',    aliases:['ราศีมีน','มีนราศี','ปลา']},
];

// ── Position Predicates ───────────────────────────────────────────────────────
// กริยา/วลีที่บ่งบอก spatial relationship ระหว่างดาว
// ใช้ match pattern ใน text เพื่อ classify ประเภท condition
export const POSITION_PREDICATES = {
  // ดาวอยู่ใน sign/house → context: natal หรือ transit
  in_sign:     ['อยู่ใน','เสวย','ครอง','สถิตใน','อยู่ประจำ','ประจำ','สถิต','ตั้งอยู่ใน'],
  // ดาวอยู่ร่วม sign เดียวกัน (0°)
  conjunction: ['ทับ','ร่วม','รวม','อยู่ด้วยกัน','สถิตร่วม','อยู่ร่วม','กุม','อยู่กุม','สถิตกุม'],
  // ดาวตรงข้าม (180°) — 6 ราศี
  opposition:  ['เล็ง','เผชิญ','ตรงข้าม','เล็งถึง'],
  // ดาวโยค (90°/270°) — 3/9 ราศี
  square:      ['โยค','ยก','สี่เหลี่ยม'],
  // ดาวตรีโกณ (120°/240°) — 4/8 ราศี
  trine:       ['ตรีโกณ','ไตรโกณ','สามเหลี่ยม','ตรีโกณาสน์'],
  // ดาว transit เคลื่อนที่
  transiting:  ['เดิน','ผ่าน','โคจร','โคจรผ่าน','เดินผ่าน','เดินทาง','เดินมา','เดินถึง'],
  // ดาวเป็นเจ้าเรือน
  rules_house: ['เป็นเจ้าเรือน','เจ้าเรือน','ปกครอง','เป็นเจ้าของ','ครองเรือน'],
};

// ── Quality Terms → Polarity ──────────────────────────────────────────────────
// คำคุณศัพท์/นาม ที่บ่งบอก polarity ของ rule
export const QUALITY_TERMS = {
  negative: [
    'บาป','บาปเคราะห์','ร้าย','ทำลาย','เคราะห์','โทษ','ทุกข์','ทุกขลาภ',
    'เสีย','แย่','ต่ำ','ถดถอย','เสื่อม','หายนะ','วิบัติ','อับเฉา','ซบเซา',
    'พินาศ','สูญเสีย','โศกเศร้า','อันตราย','ภัย','ชะตาร้าย',
  ],
  positive: [
    'สุภ','สุภเคราะห์','ดี','มงคล','เมตตา','งาม','โชค','ศุภ','สง่า',
    'รุ่งเรือง','เจริญ','ก้าวหน้า','ลาภ','ยศ','อำนาจ','ความสำเร็จ',
    'ความสุข','ร่ำรวย','มั่งมี','โชคดี','โชคลาภ','ชัยชนะ',
  ],
  neutral: ['กลาง','ปานกลาง','ทั่วไป','เป็นกลาง','ผสม','คละ'],
};

// ── Case Study Markers ────────────────────────────────────────────────────────
// วลีที่บ่งบอกว่าข้อความนั้นเป็นตัวอย่าง/กรณีศึกษา (→ rule_use: "case_study")
// ห้าม extract เป็น match rule
export const CASE_STUDY_MARKERS = [
  'กรณีที่','กรณีศึกษา','ตัวอย่างเช่น','ตัวอย่าง','เช่น','อย่างเช่น',
  'ดังเช่น','ดังตัวอย่าง','ยกตัวอย่าง','ดูตัวอย่าง','เปรียบเทียบ','ดังกรณี',
  'คนที่เกิด','บุคคลสำคัญ','ในกรณีของ','ดังบุคคล','ดังผู้ที่','เช่นบุคคล',
];

// ── Principle Markers ─────────────────────────────────────────────────────────
// วลีที่บ่งบอก abstract principle (→ rule_use: "principle")
// มักอยู่หลังกรณีศึกษาหลายข้อ
export const PRINCIPLE_MARKERS = [
  'โดยทั่วไป','หลักการ','กฎทั่วไป','โดยหลักการ','โดยสรุป','สรุปว่า',
  'กล่าวคือ','หมายความว่า','นั่นคือ','ดังนั้น','จึงสรุปได้ว่า','จะเห็นว่า',
  'แสดงให้เห็นว่า','จากตัวอย่างข้างต้น','จากกรณีเหล่านี้','สรุปได้ว่า',
];

// ── Transit Context Markers ───────────────────────────────────────────────────
// วลีที่บ่งบอกว่าเป็น transit (ดาวเดิน) ไม่ใช่ natal (ดาวกำเนิด)
// → rule_type: TRANSIT_NATAL, context: "transit"
export const TRANSIT_MARKERS = [
  'เมื่อ','ขณะที่','ตอนที่','ในปีที่','ในช่วงที่','ในขณะที่',
  'เมื่อดาว','เมื่อพระ','ขณะดาว','ตอนดาว','เมื่อโคจร',
  'ดาวเดิน','ดาวโคจร','ดาวผ่าน','โคจรมา','เดินมาถึง',
  'ปีนั้น','ช่วงนั้น','ขณะนั้น',
];

// ── Domain Compound Words ──────────────────────────────────────────────────────
// คำประสมที่ต้องไม่ตัดแยก — LLM ต้องเห็นเป็น 1 token ความหมาย
export const DOMAIN_COMPOUNDS = [
  // planet quality
  'บาปเคราะห์','สุภเคราะห์','เคราะห์ร้าย','เคราะห์ดี',
  // lagna
  'ตนุลัคน์','ลัคนา','เจ้าเรือน','เจ้าลัคน์',
  // relationship
  'คู่มิตร','คู่ศัตรู','คู่สมพล','ดาวมิตร','ดาวศัตรู',
  // outcome domain
  'ทุกขลาภ','โชคลาภ','เรือนชะตา','ดาวเรือน','ชะตาชีวิต',
  // house names (already in HOUSE_NAMES_TH but listed as compounds)
  'เรือนมรณะ','เรือนลาภ','เรือนกรรม','เรือนตนุ','เรือนอริ',
];

// ── Extraction Rule Type Grammar ──────────────────────────────────────────────
// แต่ละ rule_type มี linguistic pattern ที่แตกต่างกัน
// ใช้เป็น guide สำหรับ LLM ในการ classify
export const RULE_TYPE_GRAMMAR = {
  NATAL_ATOMIC: {
    description: 'ดาวดวงเดียวส่งผลต่อชะตาของเจ้าชะตา (คงที่ตลอดชีวิต)',
    pattern: '[planet] [position_predicate] [sign/house/quality] → [outcome]',
    example: 'ดาวอาทิตย์อยู่ในราศีสิงห์ → เจ้าชะตามีบารมี',
    tier: 1,
    contexts: ['natal'],
  },
  NATAL_COMBINATION: {
    description: 'ดาวสองดวงขึ้นไปร่วมกันสร้างความหมายใหม่ที่ไม่มีในดาวดวงเดียว',
    pattern: '[planet A] [relationship] [planet B] [ใน natal] → [emergent outcome]',
    example: 'ดาวอาทิตย์ทับดาวพฤหัส (natal) → อำนาจและปัญญาพร้อมกัน',
    tier: 2,
    contexts: ['natal'],
    note: 'ทดสอบ: ถ้าเอาดาวใดดาวหนึ่งออก rule ยังมีความหมายไหม? ถ้าใช่ = tier ต่ำกว่า',
  },
  TRANSIT_NATAL: {
    description: 'ดาวโคจร (transit) สัมพันธ์กับดาวกำเนิด (natal) → timing ของเหตุการณ์',
    pattern: '[transit marker] [transit planet] [transit predicate] [natal planet/position] → [event]',
    example: 'เมื่อดาวเสาร์โคจรทับดาวอาทิตย์ natal → อุปสรรคใหญ่',
    tier: 2,
    contexts: ['natal','transit'],
    note: 'สัญญาณ: คำว่า เมื่อ/ขณะ/ตอนที่/เดิน/โคจร/ผ่าน',
  },
};

// ── Planet Standard Positions (ดวงมาตรฐาน) ───────────────────────────────────
// ที่มา: ch006 — ตำแหน่งที่ดาวได้คุณภาพพิเศษตามหลักสุริยยาตร์ไทย
// sign IDs: เมษ=0 พฤษภ=1 มิถุน=2 กรกฎ=3 สิงห์=4 กันย์=5 ตุล=6 พิจิก=7 ธนู=8 มังกร=9 กุมภ์=10 มีน=11

export const UCH_POSITIONS = {
  // อุจ = จุดสูงสุด ให้คุณแรงสม่ำเสมอ (กราฟแนวนอนระดับสูง)
  1: 0,   // อาทิตย์ อุจ in เมษ
  2: 1,   // จันทร์  อุจ in พฤษภ
  6: 11,  // ศุกร์   อุจ in มีน
  5: 3,   // พฤหัส  อุจ in กรกฎ
  3: 9,   // อังคาร  อุจ in มังกร
  4: 5,   // พุธ     อุจ in กันย์
  7: 6,   // เสาร์   อุจ in ตุล
  8: 1,   // ราหู    อุจ in พฤษภ
  // เกตุ(9) มฤตยู(0) ไม่มีตำแหน่งอุจ
};

export const NIT_POSITIONS = {
  // นิจ = ราศีตรงข้ามอุจ (sign_id + 6) % 12
  1: 6,   // อาทิตย์ นิจ in ตุล
  2: 7,   // จันทร์  นิจ in พิจิก
  6: 5,   // ศุกร์   นิจ in กันย์
  5: 9,   // พฤหัส  นิจ in มังกร
  3: 3,   // อังคาร  นิจ in กรกฎ
  4: 11,  // พุธ     นิจ in มีน
  7: 0,   // เสาร์   นิจ in เมษ
  8: 7,   // ราหู    นิจ in พิจิก
};

export const KASED_POSITIONS = {
  // เกษตร = ดาวเจ้าเรือน (รายละเอียดในบท ch006)
  // planet_id → sign_id[] (ราศีที่ดาวนั้นเป็นเกษตร)
  1: [4],       // อาทิตย์ เกษตร in สิงห์
  2: [3],       // จันทร์  เกษตร in กรกฎ
  3: [0, 7],    // อังคาร  เกษตร in เมษ, พิจิก
  4: [2, 5],    // พุธ     เกษตร in มิถุน, กันย์
  5: [8, 11],   // พฤหัส  เกษตร in ธนู, มีน
  6: [1, 6],    // ศุกร์   เกษตร in พฤษภ, ตุล
  7: [9, 10],   // เสาร์   เกษตร in มังกร(หลัก), กุมภ์(รอง)
  8: [10],      // ราหู    เกษตร in กุมภ์ (เจ้าเรือนหลัก)
  // 9, 0 ไม่มีเกษตร
};

export const MAHACHAK_PAIRS = [
  // มหาจักร = planet อยู่ในเรือนเกษตรของ partner (memory code ch006: ๗๒ ๑๘ ๔๓ ๕๖)
  // แต่ละ pair: [planet_A, planet_B] — A อยู่ใน sign เกษตรของ B หรือกลับกัน
  [7, 2],  // เสาร์ ↔ จันทร์
  [1, 8],  // อาทิตย์ ↔ ราหู
  [4, 3],  // พุธ ↔ อังคาร
  [5, 6],  // พฤหัส ↔ ศุกร์
];

// ── Number Disambiguation Rules ───────────────────────────────────────────────
// ⚠️ CRITICAL: ตัวเลขในตำราโหราศาสตร์ไทยมีความหมายต่างกันตามบริบท
// ทั้งตัวเลขอารบิก (1,2,3...) และตัวเลขไทย (๑,๒,๓...) ใช้แทนดาวได้เหมือนกัน
// แต่ต้องดูบริบทก่อนเสมอ

export const NUMBER_DISAMBIGUATION = {
  planet_id_signals: [
    // สัญญาณว่าตัวเลขหมายถึง planet_id (ไม่ใช่เลขทั่วไป)
    'ดาว N', 'ดวง N',           // "ดาว ๑", "ดวง ๒"
    'N กุมลัคนา',               // "๑ กุมลัคนา"
    'N อยู่ราศี', 'N สถิต',     // "๑ อยู่ราศีสิงห์"
    '(N)',                       // ตามหลังชื่อดาว: "อาทิตย์ (๑)"
    'N เป็นเกษตร', 'N เป็นอุจ', // คุณภาพ
    'N + N', 'N และ N',          // คู่ดาว: "๑ และ ๕", "๗+๘"
  ],
  non_planet_signals: [
    // สัญญาณว่าตัวเลขไม่ใช่ planet_id
    'บทที่ N', 'ข้อ N', 'ตอนที่ N', 'หัวข้อ N',  // chapter/section
    'ที่ N', 'อันดับ N', 'ลำดับ N',               // ranking
    'N %', 'N วัน', 'N ปี', 'N เดือน',           // unit/measure
    'ราศี N', 'ภพ N', 'เรือน N',                  // sign/house index
    'N ข้อ', 'N กรณี', 'N ดวง',                  // count
  ],
  example: {
    sentence: 'คนชื่อ 1 สอบได้ที่ 1 เพราะมี 1 ได้ตำแหน่งอุจในดวงชะตา',
    analysis: [
      { token: '1 (แรก)', role: 'ชื่อคน — ไม่ใช่ planet_id' },
      { token: '1 (สอง)', role: 'ranking "ที่ 1" — ไม่ใช่ planet_id' },
      { token: '1 (สาม)', role: 'planet_id = อาทิตย์ — บริบท "มี...ได้ตำแหน่งอุจในดวงชะตา"' },
    ],
  },
  safe_rule: 'ถ้าไม่มีสัญญาณ planet_id ที่ชัดเจน → ถือว่าไม่ใช่ planet_id และไม่ extract เป็น rule',
};

// ── Principle Derivation Rule ─────────────────────────────────────────────────
// หัวใจของ extraction — ถ้าตำรามีกรณีศึกษาหลายข้อ ต้อง abstract เป็น principle
export const PRINCIPLE_RULE = {
  description: 'ถ้าตำรายกกรณีศึกษา N ข้อที่มี pattern เดียวกัน → สกัด principle 1 ข้อ + case_study N ข้อ',
  fail_pattern: 'copy กรณีแต่ละข้อเป็น match rule แยก (ผิด)',
  pass_pattern:  'หา common abstract pattern แล้วเขียนเป็น principle (ถูก)',
  test_case: {
    chapter: 'CH036',
    input_pattern: 'transit X → natal Y (คู่มิตร) โชค × 5 กรณีต่างดาว',
    correct_principle: 'N คู่มิตร activated พร้อมกัน → โชคใหญ่ (N≥3), N=2 โชค',
    fail_output: '5 match rules ที่ copy แต่ละกรณีทีละอัน',
  },
};

// ── buildExtractionContext() ──────────────────────────────────────────────────
// Generate system prompt section สำหรับใส่ใน LLM extraction prompt
// ใช้ได้ทั้ง Groq, Typhoon, Claude extraction
export function buildExtractionContext() {
  const aliases = Object.entries(PLANET_ALIASES)
    .map(([id, names]) => `${id}=${names[0]} (${names.slice(1).join('/')})`)
    .join(' | ');

  const posIn     = POSITION_PREDICATES.in_sign.join('/');
  const posConj   = POSITION_PREDICATES.conjunction.join('/');
  const posOpp    = POSITION_PREDICATES.opposition.join('/');
  const posTri    = POSITION_PREDICATES.trine.join('/');
  const posTrans  = POSITION_PREDICATES.transiting.join('/');

  const negTerms  = QUALITY_TERMS.negative.slice(0,8).join('/');
  const posTerms  = QUALITY_TERMS.positive.slice(0,8).join('/');

  const csMarkers = CASE_STUDY_MARKERS.slice(0,8).join('/');
  const trMarkers = TRANSIT_MARKERS.slice(0,6).join('/');
  const compounds = DOMAIN_COMPOUNDS.join('/');

  const uchStr = Object.entries(UCH_POSITIONS)
    .map(([p, s]) => `${p}→${s}`).join(' ');
  const nitStr = Object.entries(NIT_POSITIONS)
    .map(([p, s]) => `${p}→${s}`).join(' ');

  return `
## Planet IDs + Aliases (ใช้ตัวเลขอารบิกเท่านั้นใน output)
${aliases}
ลัคนา/ตนุลัคน์/เจ้าเรือน1 → {"type":"tanu_lagna"}
ตัวเลขไทย ๑-๑๐ และอารบิก 1-10 → แปลงเป็นอารบิกเสมอ

## ⚠️ Number Disambiguation (สำคัญมาก)
ตัวเลข 1-10 / ๑-๑๐ ในตำรา = planet_id ได้ BUT ต้องดูบริบทก่อนเสมอ
สัญญาณว่าเป็น planet_id: "ดาว N" / "(N)" หลังชื่อดาว / "N กุมลัคนา" / "N อยู่ราศี" / "N เป็นเกษตร"
ไม่ใช่ planet_id ถ้า: "บทที่ N" / "ที่ N" (ranking) / "N วัน/ปี" / "ราศี N" / "N %" / ชื่อคน
ตัวอย่าง: "มี ๑ ได้ตำแหน่งอุจ" → planet_id=1(อาทิตย์) ✅ | "สอบได้ที่ 1" → ranking ❌

## Planet Standard Positions (ดวงมาตรฐาน ch006)
อุจ sign_id (planet→sign): ${uchStr}
นิจ sign_id (planet→sign): ${nitStr}
เกษตร: 1→[4] 2→[3] 3→[0,7] 4→[2,5] 5→[8,11] 6→[1,6] 7→[9,10] 8→[10]
ประเกษตร: ราศีตรงข้ามเกษตรเสมอ (sign+6)%12
มหาจักร pairs (planet อยู่ใน sign เกษตรของ partner): [7,2][1,8][4,3][5,6]

## Planet Relations (ground truth)
คู่มิตร: (1,5)(2,4)(3,6)(7,8)
คู่ศัตรู: (1,3)(2,5)(4,8)(6,7)
คู่สมพล: (1,6)(2,8)(3,5)(4,7)
บาปเคราะห์: [3,7,8,10]

## Position Predicates (กริยาที่บ่งบอก spatial relation)
อยู่ใน/ใน sign-house: ${posIn}
ทับ/conjunction (0°): ${posConj}
เล็ง/opposition (180°): ${posOpp}
ตรีโกณ/trine (120°): ${posTri}
เดิน/transit: ${posTrans}

## Quality Terms → Polarity
negative (polarity:"-"): ${negTerms}
positive (polarity:"+"): ${posTerms}

## Domain Compounds (อย่าตัดคำเหล่านี้)
${compounds}

## Transit Markers (→ context:"transit", type:TRANSIT_NATAL)
ถ้าเห็นคำเหล่านี้ = กำลังพูดถึง transit ไม่ใช่ natal: ${trMarkers}

## Anti-Pattern: Case Study ≠ Match Rule
ถ้าเห็น "${csMarkers}" → rule_use:"case_study" ห้ามเป็น "match"
ถ้าตำรายกกรณี 1,2,3... → สกัด principle 1 ข้อ + case_study N ข้อ
อย่า copy กรณีแต่ละข้อเป็น match rule แยก

## Principle Derivation (CH036 ground truth)
Input: transit X → natal Y (คู่มิตร) N กรณีต่างดาว
Output ถูก: principle "N คู่มิตร activated พร้อมกัน → โชคใหญ่"
Output ผิด: N match rules copy กรณีทีละอัน
`.trim();
}

// ── Extraction System Prompt ──────────────────────────────────────────────────
// Full system prompt สำหรับ extraction — ใช้ buildExtractionContext() + schema
export function buildExtractionSystemPrompt() {
  return `คุณคือผู้เชี่ยวชาญ extract กฎจากตำราโหราศาสตร์ไทย (สุริยยาตร์) ให้เป็น JSON

${buildExtractionContext()}

## rule_use
"match"      = กฎพยากรณ์จริง มีเงื่อนไข trigger ชัดเจน
"principle"  = abstract pattern derive จากหลายกรณีรวมกัน
"case_study" = กรณีเฉพาะ/ตัวอย่างที่ตำรายกมา (ห้ามเป็น match)
"reference"  = นิยาม concept

## Rule type
"NATAL_ATOMIC" = ดาวเดียวส่งผลคงที่
"NATAL_COMBINATION" = 2+ ดาวสร้าง emergent meaning
"TRANSIT_NATAL" = transit × natal = timing เหตุการณ์
"DEFINITION" | "REFERENCE" | "PRINCIPLE"

## Tier
1 = ดาวเดียวอธิบายได้เอง
2 = 2 ดวงสร้างความหมายใหม่ (test: เอาดาวหนึ่งออก rule ยังมีความหมายไหม?)
3 = 3 ดวงขึ้นไป

## Output (JSON array เท่านั้น)
\`\`\`json
[{
  "rule_use": "match",
  "type": "NATAL_ATOMIC",
  "tier": 1,
  "c": "เงื่อนไข 1 ประโยค",
  "meaning": "ความหมาย/คำพยากรณ์",
  "polarity": "+",
  "planet_ids": [1],
  "contexts": ["natal"],
  "domain": "ตัวตน|การเงิน|ความรัก|สุขภาพ|หน้าที่การงาน|ความสูญเสีย|ทั่วไป"
}]
\`\`\`
ถ้าไม่มีกฎ: \`\`\`json\n[]\n\`\`\``;
}
