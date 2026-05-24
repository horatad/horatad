// Version 3.0.4 | 2026-05-21 — Horatad Interpretation Pipeline
// ห้าม hardcode ข้อความพยากรณ์ — text ต้องมาจาก kb_context.json เท่านั้น
// ES Module

import {
  get_lagna,
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
import {
  count_evil_lagna_aspects,
} from './master_dict.js';

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

// ── M8: Keyword Composition Engine ───────────────────────────────────────────
// Deterministic prediction from KB rules — ไม่ใช้ LLM, 100% anti-hallucination

// แยก phrases จาก rule.p (Thai phrase-separated text)
function _extractKeywords(text){
  if(!text)return[];
  const s=text
    .replace(/\([^)]*\)/g,'')
    .replace(/（[^）]*）/g,'')
    .replace(/[—→=+|[\]]/g,' ');
  return s.split(/[\s,，]+/)
    .map(p=>p.trim())
    .filter(p=>p.length>=3&&/[ก-๙]/.test(p));
}

// house → domain label สำหรับ tagged phrase cluster
const HOUSE_DOMAIN = {
  1:'ตัวตน',2:'การเงิน',3:'การสื่อสาร',4:'ครอบครัว',
  5:'ความรัก',6:'สุขภาพ',7:'ความสัมพันธ์',8:'วิกฤต',
  9:'ปัญญา',10:'การงาน',11:'มิตร',12:'ความสูญเสีย',
};

// ดู polarity จาก t[] tags + conditions[] (เชื่อถือกว่า text analysis)
function _classifyRulePolarity(rule){
  const ts=rule.t||[];
  if(ts.includes('ดี')||ts.includes('ดีมาก'))return'+';
  if(ts.includes('เสีย')||ts.includes('ร้าย'))return'-';
  for(const c of(rule.conditions||[])){
    if(c.quality_required==='ดี'||c.quality_required==='อุจ'||c.quality_required==='เกษตร')return'+';
    if(c.quality_required==='เสีย'||c.quality_required==='นิจ')return'-';
  }
  return'~';
}

/**
 * classify_rule_polarity(rule) — exported version of _classifyRulePolarity
 * ใช้ใน typhoon.js build_prompt() สำหรับ tagged phrase cluster format
 */
export function classify_rule_polarity(rule){ return _classifyRulePolarity(rule); }

/**
 * get_rule_domain(rule, natal_payload) → domain string (Thai)
 * ดู house ของ planet หลักใน rule conditions → แปลงเป็น domain label
 * ใช้สร้าง tag [+ตัวตน] [-การเงิน] ฯลฯ
 */
export function get_rule_domain(rule, natal_payload){
  if(!natal_payload)return'';
  const hMap={};
  for(const e of(natal_payload._effects_sorted||[]))hMap[e.idx]=e.house;
  for(const e of(natal_payload._potentials_sorted||[]))hMap[e.idx]=e.house;
  for(const c of(rule.conditions||[])){
    const pid=parseInt(c.planet_id);
    if(pid&&hMap[pid])return HOUSE_DOMAIN[hMap[pid]]||'';
  }
  return'';
}

/**
 * evaluate_applies_when(expr, natalPos, transitPos, ascSign, natalPayload)
 * V2.4 mini-DSL for predictions[].applies_when
 * grammar:
 *   "default" | "principle"                         → always true
 *   <op> <cmp> <N>   where op in (evil_count)
 *   <flag>           where flag in (no_friend_aspect, has_friend_aspect, tanu_strong, tanu_weak)
 * unknown → true (forward-compat, don't filter)
 */
export function evaluate_applies_when(expr, natalPos, transitPos, ascSign, natalPayload){
  if(!expr||expr==='default'||expr==='principle')return true;

  // op comparator number
  const m=expr.match(/^(evil_count)\s*(>=|<=|>|<|==)\s*(\d+)$/);
  if(m){
    const[,op,cmp,nStr]=m;
    const n=parseInt(nStr);
    let val=0;
    if(op==='evil_count'){
      val=count_evil_lagna_aspects(transitPos||natalPos,ascSign,'LENG');
    }
    if(cmp==='>=')return val>=n;
    if(cmp==='<=')return val<=n;
    if(cmp==='>') return val>n;
    if(cmp==='<') return val<n;
    if(cmp==='==')return val===n;
  }

  if(expr==='tanu_strong'||expr==='tanu_weak'){
    const mn=natalPayload?.tanu_lagna?.manifestation||0;
    return expr==='tanu_strong'?mn>=0.4:mn<0.25;
  }

  // no_friend_aspect / has_friend_aspect — not yet implemented
  // unknown → true (don't filter)
  return true;
}

/**
 * compose_local_prediction(matched_rules, natal_payload?, opts?)
 * Keyword composition engine — deterministic, no LLM
 * คืน structured array ของ predictions จาก KB rules โดยตรง
 *
 * V2.4: ถ้า rule มี predictions[] → ใช้ entry ที่ applies_when ผ่าน
 * ถ้าไม่มี predictions[] → fallback อ่าน rule.p (V2.3)
 *
 * @param {Object[]} matched_rules - output จาก match_rules()
 * @param {Object|null} natal_payload - จาก build_natal_payload()
 * @param {Object} opts - {natalPos, transitPos, ascSign} สำหรับ DSL evaluate
 * @returns {Array<{rule_id,text,keywords,polarity,domain,chapter,source,applies_when?}>}
 */
export function compose_local_prediction(matched_rules, natal_payload=null, opts={}){
  if(!matched_rules?.length)return[];
  const{natalPos,transitPos,ascSign}=opts;
  const out=[];
  matched_rules.forEach((r,i)=>{
    const rid='R'+String(i+1).padStart(2,'0');
    const dom=get_rule_domain(r,natal_payload);
    const ch=r.ch||'';

    // V2.4: predictions[] array
    if(Array.isArray(r.predictions)&&r.predictions.length>0){
      for(const pred of r.predictions){
        const applies=natalPos
          ?evaluate_applies_when(pred.applies_when,natalPos,transitPos,ascSign,natal_payload)
          :pred.applies_when==='default'||!pred.applies_when;
        if(!applies)continue;
        out.push({
          rule_id:rid,
          text:pred.text,
          keywords:_extractKeywords(pred.text),
          polarity:pred.polarity||_classifyRulePolarity(r),
          domain:pred.domain||dom,
          chapter:ch,
          applies_when:pred.applies_when||'default',
          source:'local',
        });
      }
      return;
    }

    // V2.3 fallback: rule.p blob
    if(r.p){
      out.push({
        rule_id:rid,
        text:r.p,
        keywords:_extractKeywords(r.p),
        polarity:_classifyRulePolarity(r),
        domain:dom,
        chapter:ch,
        source:'local',
      });
    }
  });
  return out;
}

/**
 * compose_summary_text(predictions)
 * สร้าง summary text จาก compose_local_prediction() output
 * เรียง: positive traits → negative traits (พร้อม connector)
 *
 * @param {Array} predictions - จาก compose_local_prediction()
 * @returns {string} คำสรุปภาษาไทย deterministic
 */
export function compose_summary_text(predictions){
  if(!predictions?.length)return'[ไม่พบข้อมูล]';
  const pos=[],neg=[],neu=[];
  for(const pred of predictions){
    const kws=(pred.keywords||[]).slice(0,3);
    if(pred.polarity==='+')pos.push(...kws);
    else if(pred.polarity==='-')neg.push(...kws);
    else neu.push(...kws);
  }
  const dedup=arr=>[...new Set(arr)].slice(0,5);
  const uPos=dedup(pos),uNeg=dedup(neg),uNeu=dedup(neu);
  const parts=[];
  if(uPos.length)parts.push(uPos.join(' '));
  if(uNeg.length)parts.push((parts.length?'แต่มีแนวโน้ม ':'มีแนวโน้ม ')+uNeg.join(' '));
  if(!parts.length&&uNeu.length)parts.push(uNeu.join(' '));
  return parts.join(' ')||'[ไม่พบคำสำคัญ]';
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
