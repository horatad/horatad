// Version 3.0.1 | 2026-05-18 — Horatad Interpretation Pipeline
// ห้าม hardcode ข้อความพยากรณ์ — text ต้องมาจาก kb_context.json เท่านั้น
// ES Module

import {
  get_lagna,
  get_all_houses,
  getHouse,
  getStandards,
  getStrength,
  compute_std_score,
  get_tanu_lagna,
  PLANET_KEYS,
  PLANET_NAMES_TH,
  ZODIAC_TH,
  KASET_MAP,
} from './engine.js';

// ── Constants ─────────────────────────────────────────────────────────────

// aspect_strength ตาม SYSTEM_INSTRUCTION
const ASPECT_STRENGTH = {KUM:1.0,LENG:0.8,YOK:0.6,TRI:0.5,NONE_ACTIVE:0.3};

// house_importance ตาม SYSTEM_INSTRUCTION
const HOUSE_IMPORTANCE = {
  1:1.0, 7:0.8, 2:0.7,
  3:0.5, 4:0.5, 5:0.5, 9:0.5, 10:0.5, 11:0.5,
  6:0.2, 8:0.2, 12:0.2,
};

// transit_weight — กรองเฉพาะ 5 ดาว
const TRANSIT_WEIGHT = {MA:1.0,SA:0.9,MA_:0.7,RA:0.6,JU:0.5};
// map index → weight (MR=idx10=1.0, SA=idx7=0.9, MA=idx3=0.7, RA=idx8=0.6, JU=idx5=0.5)
const TRANSIT_IDX_WEIGHT = {10:1.0,7:0.9,3:0.7,8:0.6,5:0.5};

// ── Step 3: compute_lagna_aspect ─────────────────────────────────────────
/**
 * คำนวณความสัมพันธ์ของดาว i กับลัคนา
 * @param {number[]} pos - sp array
 * @param {number} i - planet index 1-10
 * @param {number} ascSign - ราศีลัคนา 0-11
 * @returns {'KUM'|'LENG'|'YOK'|'TRI'|'NONE'}
 *
 * กุม  (KUM)  = อยู่ราศีเดียวกับลัคนา (house 1)
 * เล็ง (LENG) = อยู่ตรงข้าม (house 7)
 * โยค  (YOK)  = อยู่ house 4 หรือ 10 (square)
 * ตรี  (TRI)  = อยู่ house 5 หรือ 9 (trine)
 * NONE        = ไม่สัมพันธ์ลัคนา
 */
export function compute_lagna_aspect(pos,i,ascSign){
  if(i===0)return 'NONE';
  const h=getHouse(pos,i,ascSign);
  if(h===1)return 'KUM';
  if(h===7)return 'LENG';
  if(h===4||h===10)return 'YOK';
  if(h===5||h===9)return 'TRI';
  return 'NONE';
}

// ── Step 4: compute_standard ──────────────────────────────────────────────
// re-exported from engine, kept here for pipeline clarity
export {compute_std_score};

// ── Step 5: compute_manifestation ─────────────────────────────────────────
/**
 * คำนวณ manifestation score ของดาว i
 * formula:
 *   manifestation = aspect_strength × house_importance × chart_strength
 *   chart_strength = tanu_lagna_aspect × clamp(0.1, (std_score+5)/10, 1.0)
 *   tanu_lagna_aspect = aspect_strength ของเจ้าราศีลัคนา
 *
 * @param {number[]} pos
 * @param {number} i - planet index 1-10
 * @param {number} ascSign - ราศีลัคนา 0-11
 * @returns {number} 0.0–1.0
 */
export function compute_manifestation(pos,i,ascSign){
  if(i===0)return 0;

  // aspect_strength ของดาว i
  const aspect=compute_lagna_aspect(pos,i,ascSign);
  const a_str=aspect==='NONE'?ASPECT_STRENGTH.NONE_ACTIVE:ASPECT_STRENGTH[aspect];

  // house_importance
  const h=getHouse(pos,i,ascSign);
  const h_imp=HOUSE_IMPORTANCE[h]||0.2;

  // std_score → clamp
  const std=compute_std_score(pos,i);
  const std_factor=Math.max(0.1,Math.min(1.0,(std+5)/10));

  // tanu_lagna planet = เจ้าราศีลัคนา
  const tanuIdx=get_tanu_lagna(ascSign);
  const tanuAspect=compute_lagna_aspect(pos,tanuIdx,ascSign);
  const tanu_str=tanuAspect==='NONE'?ASPECT_STRENGTH.NONE_ACTIVE:ASPECT_STRENGTH[tanuAspect];

  const chart_strength=tanu_str*std_factor;
  const manifestation=a_str*h_imp*chart_strength;
  return Math.min(1.0,Math.max(0.0,manifestation));
}

// ── Step 6: sort_by_manifestation ─────────────────────────────────────────
/**
 * คืน array ของ planet index 1-10 เรียงจาก manifestation สูง → ต่ำ
 * แยก 2 กลุ่ม:
 *   effects   = ดาวที่สัมพันธ์ลัคนา (KUM/LENG/YOK/TRI) — manifestation จริง
 *   potentials = ดาว NONE → inner_potential (คงที่ 0.3 × h_imp)
 */
export function sort_by_manifestation(pos,ascSign){
  const effects=[],potentials=[];
  for(let i=1;i<=10;i++){
    const aspect=compute_lagna_aspect(pos,i,ascSign);
    const score=compute_manifestation(pos,i,ascSign);
    const h=getHouse(pos,i,ascSign);
    const std=getStandards(pos,i);
    const stdScore=compute_std_score(pos,i);
    const entry={
      idx:i,
      key:PLANET_KEYS[i],
      name:PLANET_NAMES_TH[i],
      aspect,
      house:h,
      manifestation:score,
      std,
      stdScore,
      sign:Math.trunc(pos[i]/1800),
    };
    if(aspect==='NONE')potentials.push(entry);
    else effects.push(entry);
  }
  effects.sort((a,b)=>b.manifestation-a.manifestation);
  potentials.sort((a,b)=>b.manifestation-a.manifestation);
  return{effects,potentials};
}

// ── Step 7: build_natal_payload ────────────────────────────────────────────
/**
 * สร้าง payload สำหรับส่ง Typhoon ตาม output_order
 * ไม่ใส่ข้อความพยากรณ์ — เป็นแค่ structured data
 *
 * @param {number[]} pos - sp array จาก get_data()
 * @param {number} ascSign - ราศีลัคนา (get_lagna(pos))
 * @returns {Object} natal_payload
 */
export function build_natal_payload(pos,ascSign){
  const houses=get_all_houses(pos,ascSign);
  const tanuIdx=get_tanu_lagna(ascSign);
  const tanuSignIdx=Math.trunc(pos[tanuIdx]/1800);
  const tanuOfTanuIdx=KASET_MAP[tanuSignIdx]; // เจ้าเรือนของตนุลัคน์
  const {effects,potentials}=sort_by_manifestation(pos,ascSign);

  // ดาวกุมลัคนา (house 1)
  const kumLagna=effects.filter(e=>e.aspect==='KUM');

  // ตนุลัคน์ entry
  const tanuEntry=effects.find(e=>e.idx===tanuIdx)||potentials.find(e=>e.idx===tanuIdx);

  // ตนุเศษ = เจ้าของตนุลัคน์
  const tanuSetEntry=effects.find(e=>e.idx===tanuOfTanuIdx)||potentials.find(e=>e.idx===tanuOfTanuIdx);

  // ดาวเล็ง/โยค/ตรีโกณ (ไม่ใช่กุม)
  const otherAspects=effects.filter(e=>e.aspect!=='KUM'&&e.idx!==tanuIdx);

  // H10 กัมมะ
  const h10Planets=[...effects,...potentials].filter(e=>e.house===10);
  const h10Owner=KASET_MAP[Math.trunc(pos[0]/1800+9)%12]; // เจ้าเรือน H10 (ascSign+9)%12
  const h10OwnerSign=(ascSign+9)%12;
  const h10OwnerEntry=[...effects,...potentials].find(e=>e.idx===KASET_MAP[h10OwnerSign]);

  // ภพอื่นๆ (H2,H3,H4,H5,H6,H7,H8,H9,H11,H12)
  const houseMap={};
  for(let h=2;h<=12;h++){
    houseMap[h]=[...effects,...potentials].filter(e=>e.house===h);
  }

  // overall strength — weighted average manifestation ของ effects
  const totalManifestation=effects.reduce((s,e)=>s+e.manifestation,0);
  const avgManifestation=effects.length?totalManifestation/effects.length:0;
  const overallStrength=
    avgManifestation>=0.6?'แข็งแกร่งมาก':
    avgManifestation>=0.4?'แข็งแกร่ง':
    avgManifestation>=0.25?'ปานกลาง':
    avgManifestation>=0.1?'อ่อนแอ':'อ่อนแอมาก';

  return {
    // Step 1
    lagna:{
      sign:ascSign,
      name:ZODIAC_TH[ascSign],
    },
    // Step 2
    kum_lagna:kumLagna,
    // Step 3 (tanu_lagna planet)
    tanu_lagna:{
      ...tanuEntry,
      sign_name:ZODIAC_TH[tanuSignIdx],
      tanu_set_planet:tanuSetEntry,
    },
    // Step 4
    overall:{
      strength:overallStrength,
      avg_manifestation:+avgManifestation.toFixed(3),
      effect_count:effects.length,
    },
    // Step 5 (tanu_set — นิสัยโดยรวม)
    tanu_set:tanuSetEntry,
    // Step 6
    other_aspects:otherAspects,
    // Step 7
    potentials,
    // Step 8 — ภพต่างๆ พร้อม planet list
    houses:houseMap,
    // Step 9 — อาชีพ: ดาวที่ถูกโฉลก (สัมพันธ์ลัคนา std_score >= 0)
    career:{
      favorable:effects.filter(e=>e.stdScore>=0),
      unfavorable:effects.filter(e=>e.stdScore<0),
    },
    // metadata
    _order:[
      'lagna','kum_lagna','tanu_lagna','overall',
      'tanu_set','other_aspects','potentials',
      'houses','career',
    ],
    _effects_sorted:effects,
    _potentials_sorted:potentials,
  };
}

// ── Step 8: overlay_transit ────────────────────────────────────────────────
/**
 * overlay transit data เข้า natal payload (Q&A mode เท่านั้น)
 * กรองเฉพาะ 5 ดาว: MR SA MA RA JU
 * Transit = separate context channel — ไม่รวม natal score
 *
 * @param {Object} natalPayload - จาก build_natal_payload()
 * @param {number[]} transitPos - sp[] ของดาวจร ณ วันถาม
 * @param {number} ascSign - ราศีลัคนา (natal)
 * @returns {Object} natalPayload พร้อม transit_context
 */
export function overlay_transit(natalPayload,transitPos,ascSign){
  const TRANSIT_PLANETS=[10,7,3,8,5]; // MR,SA,MA,RA,JU
  const transit_context=[];

  for(const i of TRANSIT_PLANETS){
    const weight=TRANSIT_IDX_WEIGHT[i];
    const sign=Math.trunc(transitPos[i]/1800);
    const h=getHouse(transitPos,i,ascSign);
    const aspect=compute_lagna_aspect(transitPos,i,ascSign);
    const std=getStandards(transitPos,i);
    transit_context.push({
      idx:i,
      key:PLANET_KEYS[i],
      name:PLANET_NAMES_TH[i],
      transit_weight:weight,
      sign,
      sign_name:ZODIAC_TH[sign],
      house:h,
      aspect,
      std,
    });
  }

  return{
    ...natalPayload,
    transit_context,
    _is_qa_mode:true,
  };
}

// ── Utility: describe_planet_for_prompt ───────────────────────────────────
/**
 * สร้าง structured text สั้นๆ เพื่อใส่ใน Typhoon prompt
 * ใช้ใน typhoon.js เท่านั้น
 */
export function describe_planet_for_prompt(entry){
  if(!entry)return'';
  const asp_th={KUM:'กุม',LENG:'เล็ง',YOK:'โยค',TRI:'ตรีโกณ',NONE:'ไม่สัมพันธ์'};
  return (`${entry.name}(${ZODIAC_TH[entry.sign]}) H${entry.house} `+
    `${asp_th[entry.aspect]||''} ${entry.std||''}`).trim();
}

/**
 * describe_natal_payload(payload) → compact text สำหรับ debug หรือ log
 */
export function describe_natal_payload(payload){
  if(!payload)return'[null payload]';
  const lines=[
    `ลัคนา: ${payload.lagna?.name}`,
    `กุมลัคนา: ${payload.kum_lagna?.map(e=>describe_planet_for_prompt(e)).join(', ')||'ไม่มี'}`,
    `ตนุลัคน์: ${describe_planet_for_prompt(payload.tanu_lagna)}`,
    `กำลังโดยรวม: ${payload.overall?.strength}`,
    `ตนุเศษ: ${describe_planet_for_prompt(payload.tanu_set)}`,
    `ดาวอื่นสัมพันธ์ลัคนา: ${payload.other_aspects?.map(e=>describe_planet_for_prompt(e)).join(' | ')||'ไม่มี'}`,
    `อัจฉริยภาพภายใน: ${payload.potentials?.map(e=>describe_planet_for_prompt(e)).join(' | ')||'ไม่มี'}`,
  ];
  return lines.join('\n');
}
