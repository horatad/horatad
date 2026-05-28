// Version 3.0.8 | 2026-05-21
// v3/typhoon.js — Typhoon API Connector
// ห้าม hardcode ข้อความพยากรณ์
// ห้าม hallucinate — ข้อความต้องมาจาก kb_context rules เท่านั้น
// ES Module

import {
  compute_lagna_aspect,
  describe_planet_for_prompt,
  classify_rule_polarity,
  get_rule_domain,
} from './interpretation.js';
import {
  getStandards,
  PLANET_NAMES_TH,
  ZODIAC_TH,
  KASET_MAP,
  get_tanu_lagna,
} from './engine.js';
import {
  planet_relation,
  aspect_to_planet,
  transit_to_natal_aspect,
  count_evil_lagna_aspects,
  house_name_to_idx,
} from './master_dict.js';

// ── Config ────────────────────────────────────────────────────────────────
const TYPHOON_WORKER_URL = 'https://horatad-ai.uchujaro5.workers.dev';
const TYPHOON_MODEL = 'typhoon-v2.5-30b-a3b-instruct';
const MAX_TOKENS = 2800;
const MAX_RULES = 120;
const MIN_MANIFESTATION = 0.10; // ตาม tb_predictions threshold

// ── Rule matching (V3 — manifestation-aware) ──────────────────────────────

// QUAL_MAP: getStandards() → kb tag
const QUAL_MAP = {'ประ':'ประเกษตร','มหาอุจ':'อุจ'};
const QLABELS = {
  'เกษตร':1,'ประเกษตร':1,'อุจ':1,'อุจจาวิลาส':1,
  'อุจจาภิมุข':1,'มหาจักร':1,'จุลจักร':1,'ราชาโชค':1,'เทวีโชค':1,'นิจ':1,
};
const SCORE_MAP = {
  'อุจ':5,'เกษตร':4,'มหาจักร':4,'ราชาโชค':3,
  'อุจจาวิลาส':3,'อุจจาภิมุข':3,'จุลจักร':2,'เทวีโชค':2,
  'ประเกษตร':-3,'นิจ':-5,
};

// KB_NAME_MAP: engine name → kb tag name (verified จาก kb.json)
const KB_NAME_MAP = {'พฤหัสบดี':'พฤหัส'};
function _kbName(n){return KB_NAME_MAP[n]||n;}

// aspect label ภาษาไทยสำหรับ tag matching
const ASP_TH = {KUM:'กุม',LENG:'เล็ง',YOK:'โยค',TRI:'ตรีโกณ',NONE:''};

// ── Condition-based rule matching helpers (M1 + V2.4) ─────────────────────

// แปลง lagna_aspect_req เก่า (ไทย) → ENG canonical
const LAR_NORMALIZE = {
  'กุมลัคนา':'KUM','เล็งลัคนา':'LENG','โยคลัคนา':'YOK','ตรีโกณลัคนา':'TRI',
  'สัมพันธ์ลัคนา':'ANY_ASPECT','ไม่สัมพันธ์ลัคนา':'NONE',
  'none':'NONE',
};

// ใน V2.4 condition.planet_id อาจเป็น object {type:'tanu_lagna'|'h10_owner'}
function _resolvePlanetId(cond,ascSign){
  if(cond.house_lord_of!==undefined){
    return KASET_MAP[(ascSign+cond.house_lord_of-1)%12];
  }
  const pid=cond.planet_id;
  if(pid==null||pid==='ANY')return null;       // null = skip (match any)
  if(typeof pid==='object'){
    if(pid.type==='tanu_lagna')return KASET_MAP[ascSign];
    if(pid.type==='h10_owner')return KASET_MAP[(ascSign+9)%12];
    return null;
  }
  const n=parseInt(pid);
  return(isNaN(n)||n<0)?null:n;
}

// คำนวณ aspect ของ planet ใน pos → ลัคนา
function _aspectToLagna(pos,pid,ascSign){
  const h=(Math.trunc(pos[pid]/1800)-ascSign+12)%12+1;
  if(h===1)return'KUM';
  if(h===7)return'LENG';
  if(h===4||h===10)return'YOK';
  if(h===5||h===9)return'TRI';
  return'NONE';
}

// ascSign ส่งผ่านมาเพื่อคำนวณ house_lord_of + V2.4 fields ใหม่
function _checkCondition(cond,natalPos,transitPos,effectsMap,potentialsMap,ascSign){
  const context=cond.context||'natal';
  if(context==='transit'&&!transitPos)return false;
  const pos=context==='transit'?transitPos:natalPos;

  const pid=_resolvePlanetId(cond,ascSign);
  if(pid==null)return true;  // ANY — skip checks

  // manifestation gate (เฉพาะ natal เพราะ transit ไม่มี manifestation map)
  if(context==='natal'){
    const entry=effectsMap[pid]||potentialsMap[pid];
    if(entry&&entry.manifestation<MIN_MANIFESTATION&&entry.aspect==='NONE')return false;
  }

  // quality_required
  const pQualRaw=getStandards(pos,pid);
  const pQuals=pQualRaw
    ?pQualRaw.split('/').map(q=>QUAL_MAP[q]||q).filter(q=>QLABELS[q])
    :[];
  const pScore=pQuals.length>0?Math.max(...pQuals.map(q=>SCORE_MAP[q]||0)):0;
  const qr=cond.quality_required;
  if(qr&&qr!=='any'&&qr!=='ANY'&&qr!==''){
    if(typeof qr==='object'){
      if(qr.std_score_min!==undefined&&pScore<qr.std_score_min)return false;
      if(Array.isArray(qr.in)&&!qr.in.some(q=>pQuals.includes(q)))return false;
    } else {
      if(qr==='ดี'&&pScore<=0)return false;
      if(qr==='เสีย'&&pScore>=0)return false;
      if(qr==='ปกติ'&&pScore!==0)return false;
      if(QLABELS[qr]&&!pQuals.includes(qr))return false;
    }
  }

  // lagna_aspect_req
  const asp=context==='natal'
    ?(effectsMap[pid]?.aspect||potentialsMap[pid]?.aspect||'NONE')
    :_aspectToLagna(pos,pid,ascSign);
  const lar=cond.lagna_aspect_req;
  if(lar&&lar!=='any'&&lar!=='ANY'&&lar!==''){
    if(typeof lar==='object'&&Array.isArray(lar.in)){
      const norm=lar.in.map(x=>LAR_NORMALIZE[x]||x);
      if(!norm.includes(asp))return false;
    } else {
      const larN=LAR_NORMALIZE[lar]||lar;
      if(larN==='ANY_ASPECT'&&asp==='NONE')return false;
      else if(larN==='NONE'&&asp!=='NONE')return false;
      else if(larN!=='ANY_ASPECT'&&larN!=='NONE'&&asp!==larN)return false;
    }
  }

  // V2.4: house_required / house_name
  let houseIdx=cond.house_required;
  if(!houseIdx&&cond.house_name)houseIdx=house_name_to_idx(cond.house_name);
  if(houseIdx){
    const h=(Math.trunc(pos[pid]/1800)-ascSign+12)%12+1;
    if(h!==houseIdx)return false;
  }

  // V2.4: sign_required
  if(cond.sign_required!==undefined){
    const s=Math.trunc(pos[pid]/1800);
    if(s!==cond.sign_required)return false;
  }

  // V2.4: aspect_to_planet
  if(cond.aspect_to_planet){
    const at=cond.aspect_to_planet;
    let targetId;
    if(typeof at.id==='object'){
      if(at.id.type==='tanu_lagna')targetId=KASET_MAP[ascSign];
      else if(at.id.type==='h10_owner')targetId=KASET_MAP[(ascSign+9)%12];
      else return false;
    } else {
      targetId=parseInt(at.id);
      if(isNaN(targetId))return false;
    }
    const targetPos=at.scope==='transit'?transitPos:natalPos;
    if(!targetPos)return false;
    const sP=Math.trunc(pos[pid]/1800),sT=Math.trunc(targetPos[targetId]/1800);
    const dist=((sP-sT)+12)%12;
    const asp2=dist===0?'KUM':dist===6?'LENG':(dist===3||dist===9)?'YOK':(dist===4||dist===8)?'TRI':'NONE';
    if(at.type==='ANY_ASPECT'){if(asp2==='NONE')return false;}
    else if(asp2!==at.type)return false;
  }

  // V2.4: relation_to
  if(cond.relation_to){
    const rt=cond.relation_to;
    const targetId=parseInt(rt.id);
    if(isNaN(targetId))return false;
    const rel=planet_relation(pid,targetId);
    if(rt.type==='ANY_FRIEND'){if(rel!=='มิตร')return false;}
    else if(rt.type==='ANY_ENEMY'){if(rel!=='ศัตรู')return false;}
    else if(rel!==rt.type)return false;
  }

  return true;
}

// V2.4: rule-level global conditions (ไม่ผูก planet เฉพาะ)
function _checkGlobalCondition(gc,natalPos,transitPos,ascSign,natalPayload){
  if(gc.type==='evil_planet_count'){
    const pos=gc.scope==='transit'?transitPos:natalPos;
    if(!pos)return false;
    const min=gc.min||1;
    const aspectMin=gc.aspect_min==='ANY_ASPECT'?'TRI':(gc.aspect_min||'LENG');
    return count_evil_lagna_aspects(pos,ascSign,aspectMin)>=min;
  }
  if(gc.type==='overall_strength'){
    const labels=['อ่อนแอมาก','อ่อนแอ','ปานกลาง','แข็งแกร่ง','แข็งแกร่งมาก'];
    const cur=natalPayload?.overall?.strength;
    if(!cur)return false;
    return labels.indexOf(cur)>=labels.indexOf(gc.min);
  }
  return true;   // unknown type → pass (forward-compat)
}

// ตรวจ conditions[] + global_conditions[] ของ rule
function _matchByConditions(r,natalPos,transitPos,effectsMap,potentialsMap,ascSign,natalPayload){
  const conds=r.conditions||[];
  if(!conds.length)return null;
  for(const c of conds){
    if(c.required!==false&&!_checkCondition(c,natalPos,transitPos,effectsMap,potentialsMap,ascSign))return false;
  }
  // V2.4: global_conditions[]
  for(const gc of(r.global_conditions||[])){
    if(!_checkGlobalCondition(gc,natalPos,transitPos,ascSign,natalPayload))return false;
  }
  return true;
}

/**
 * match_rules(pos, ascSign, kbRules, transitPos?)
 * คืน array ของ rules ที่ตรงกับดวง เรียงตาม priority
 * ใช้ manifestation เป็น gate (>= MIN_MANIFESTATION เท่านั้น)
 *
 * @param {number[]} pos - natal sp[]
 * @param {number} ascSign - ราศีลัคนา
 * @param {Object[]} kbRules - array จาก kb_context.json
 * @param {number[]|null} transitPos - transit sp[] (Q&A mode)
 * @param {Object} natalPayload - จาก build_natal_payload()
 * @returns {Object[]} matched rules
 */
export function match_rules(pos, ascSign, kbRules, transitPos=null, natalPayload=null){
  if(!kbRules||!pos)return[];
  const seen=new Set(), res=[];

  function addRule(r,isTransit=false){
    const k=r.c+(r.ch||'');
    if(!seen.has(k)){seen.add(k);res.push({...r,_isTransit:isTransit});}
  }

  // กรอง REFERENCE + V2.4 rule_use=case_study/reference ออก + แนบ _kbIdx
  const predRules=kbRules
    .map((r,i)=>({...r,_kbIdx:i}))
    .filter(r=>r.rule_type!=='REFERENCE')
    .filter(r=>{
      const ru=r.rule_use;
      // V2.4 explicit filter
      if(ru==='case_study'||ru==='reference')return false;
      return true;
    });

  // build planet aspect map จาก natalPayload ถ้ามี (เร็วกว่า re-compute)
  const effectsMap={};
  const potentialsMap={};
  if(natalPayload){
    (natalPayload._effects_sorted||[]).forEach(e=>effectsMap[e.idx]=e);
    (natalPayload._potentials_sorted||[]).forEach(e=>potentialsMap[e.idx]=e);
  }

  // ── natal planet matching ──────────────────────────────────────────────
  for(let i=1;i<=10;i++){
    const entry=effectsMap[i]||potentialsMap[i];
    // manifestation gate — ตัดดาวที่ influence น้อยมากออก
    if(entry&&entry.manifestation<MIN_MANIFESTATION&&entry.aspect==='NONE')continue;

    const pName=PLANET_NAMES_TH[i];
    const pNameKB=_kbName(pName);
    const pQualRaw=getStandards(pos,i);
    const pQuals=pQualRaw
      ?pQualRaw.split('/').map(q=>QUAL_MAP[q]||q).filter(q=>QLABELS[q])
      :[];
    const pScore=pQuals.length>0?Math.max(...pQuals.map(q=>SCORE_MAP[q]||0)):0;
    const pIsBad=pScore<0;
    const pIsGood=pScore>0;
    const pIsNormal=pScore===0;
    const asp=entry?ASP_TH[entry.aspect]:'';
    const hasAsp=asp!=='';

    predRules.forEach(r=>{
      // M1: rules ที่มี conditions[] (ไม่ใช่ transit) จัดการโดย conditions pass แยก
      if(r.conditions&&r.conditions.length>0&&!(r.t||[]).includes('จร'))return;
      const ts=(r.t||[]).join(' ');
      const rtags=r.t||[];
      if(!ts.includes(pNameKB))return;

      // quality gate
      const rBad=rtags.includes('เสีย');
      const rGood=rtags.includes('ดี')||rtags.includes('ดีมาก')||rtags.includes('ดีรอง');
      const rNormal=rtags.includes('ปกติ');
      const rSpecific=rtags.filter(t=>QLABELS[t]);
      if(rBad&&!pIsBad)return;
      if(rGood&&!pIsGood)return;
      if(rNormal&&!pIsNormal)return;
      if(rSpecific.length>0&&!rSpecific.some(q=>pQuals.includes(q)))return;

      // aspect gate
      const hasL=ts.includes('ลัคนา');
      const hasNL=ts.includes('ไม่สัมพันธ์ลัคนา');
      if(hasL||hasNL){
        if(hasAsp&&hasL&&!hasNL)addRule(r);
        if(!hasAsp&&hasNL)addRule(r);
      } else {
        addRule(r);
      }
    });
  }

  // ── conditions-based matching (M1 + V2.4 — natal rules ที่มี conditions[]) ─
  predRules
    .filter(r=>r.conditions&&r.conditions.length>0&&!(r.t||[]).includes('จร'))
    .forEach(r=>{
      if(_matchByConditions(r,pos,transitPos,effectsMap,potentialsMap,ascSign,natalPayload))addRule(r);
    });

  // ── V2.4 transit rules ที่มี conditions[] (context:'transit') ────────────
  if(transitPos){
    predRules
      .filter(r=>r.conditions&&r.conditions.some(c=>c.context==='transit'))
      .forEach(r=>{
        if(_matchByConditions(r,pos,transitPos,effectsMap,potentialsMap,ascSign,natalPayload))addRule(r,true);
      });
  }

  // ── transit matching (Q&A mode หรือ _include_transit) — legacy tag-based ──
  if(transitPos&&(natalPayload?._is_qa_mode||natalPayload?._include_transit)){
    const TRANSIT_PLANETS=[10,7,3,8,5]; // MR,SA,MA,RA,JU
    for(const i of TRANSIT_PLANETS){
      const pName=PLANET_NAMES_TH[i];
      const pNameKB=_kbName(pName);
      const asp=compute_lagna_aspect(transitPos,i,ascSign);
      if(asp==='NONE')continue;
      predRules
        .filter(r=>{
          const ts=(r.t||[]).join(' ');
          return ts.includes('จร')&&ts.includes(pNameKB);
        })
        .forEach(r=>addRule(r,true));
    }
  }

  // foundation rules (priority 1 + core chapters)
  predRules
    .filter(r=>r.pr===1&&['chapter_04','chapter_06','chapter_08','chapter_09','chapter_13'].includes(r.ch))
    .slice(0,6)
    .forEach(r=>addRule(r));

  res.sort((a,b)=>(a.pr||99)-(b.pr||99));
  return res.slice(0,MAX_RULES);
}

// ── Helpers ────────────────────────────────────────────────────────────────

// สร้าง rule ID — ใช้ r.id (V24 format) → r._kbIdx (legacy kb.json) → R???
export function _ruleId(r){
  if(r.id)return r.id;
  if(r._kbIdx!=null)return'R'+String(r._kbIdx+1).padStart(3,'0');
  return'R???';
}

// ── Prompt builder ─────────────────────────────────────────────────────────

/**
 * build_prompt(natalPayload, matchedRules, isQA)
 * สร้าง prompt สำหรับ Typhoon
 * ห้ามใส่ข้อความพยากรณ์ใน prompt — rules จาก kb_context เท่านั้น
 */
function build_prompt(natalPayload, matchedRules, isQA=false){
  // รองรับทั้ง V24 format (r.meaning + r.keywords[]) และ old KB format (r.p)
  const rulesText=matchedRules
    .map(r=>{
      const rid=_ruleId(r);
      const isV24=r.meaning!==undefined;
      const pol=isV24?(r.polarity||'~'):classify_rule_polarity(r);
      const domain=isV24?(r.domain||'ทั่วไป'):get_rule_domain(r,natalPayload);
      const tag=`[${pol}${domain}]`;
      const kws=isV24
        ?(r.keywords||[]).map(k=>k.k||k).filter(Boolean).join(', ')||r.meaning
        :r.p.replace(/\([^)]*\)/g,'').replace(/[—→=+|[\]]/g,' ').split(/[\s,，]+/).filter(p=>p.length>=3&&/[ก-๙]/.test(p)).join(', ');
      const transitMark=r._isTransit?'[จร]':'';
      return `• [${rid}]${transitMark}${tag} ${kws}`;
    })
    .join('\n');

  // M2: ย่อ chart context เหลือแค่ lagna + overall strength
  const chartSummary=
    `ลัคนา: ${natalPayload?.lagna?.name||'?'}\n`+
    `กำลังโดยรวม: ${natalPayload?.overall?.strength||'?'}`;

  const transitSection=isQA&&natalPayload.transit_context
    ?'\nดาวจร (เรียงตาม transit_weight):\n'+
      natalPayload.transit_context
        .map(t=>`• ${t.name}(${t.sign_name}) H${t.house} ${ASP_TH[t.aspect]||'-'}`)
        .join('\n')
    :'';

  const modeNote=isQA
    ?'(โหมด Q&A: พยากรณ์พื้นดวง + ดาวจร)'
    :'(โหมดพื้นดวง: พยากรณ์เฉพาะนาตาล)';

  // SYSTEM INSTRUCTION ฝั่ง Typhoon — anti-hallucination + M3 structured output
  const systemPrompt=
`คุณคือโหราจารย์ไทยระบบ Horatad ที่พยากรณ์ตามกฎโหราศาสตร์ไทยแนวตรรกะ (TALS) เท่านั้น

กฎเหล็ก:
- ตอบในรูปแบบ JSON เท่านั้น: {"predictions":[{"rule_id":"R01","text":"คำพยากรณ์"},…]}
- rule_id ต้องมาจากรหัสกฎที่ให้มาเท่านั้น ห้ามสร้าง rule_id ที่ไม่มีในรายการ
- ใช้ keywords เป็นแกนหลัก ห้ามเพิ่มเนื้อหานอก keywords
- craft เป็นประโยคภาษาไทยตาม domain ของกฎนั้น ไม่ข้ามบริบท
- ห้ามแสดงค่าตัวเลขทางเทคนิคใดๆ ในข้อความ text
- ห้ามปลอบโยน ห้าม validate ความรู้สึก ห้ามสร้างความหวังเกินกฎ
- text แต่ละรายการไม่เกิน 40 คำ ภาษาไทยกระชับ ไม่มีคำนำ-คำส่งท้าย`;

  const userPrompt=
`${modeNote}

ข้อมูลดวงชาตา:
${chartSummary}${transitSection}

กฎโหราศาสตร์ที่ตรงกับดวง (${matchedRules.length} กฎ):
${rulesText}

ตอบในรูปแบบ JSON: {"predictions":[{"rule_id":"R01","text":"..."},…]}`;

  return{systemPrompt,userPrompt};
}

// ── API call ───────────────────────────────────────────────────────────────

/**
 * send_to_typhoon(natalPayload, matchedRules, options?)
 * @param {Object} natalPayload - จาก build_natal_payload() หรือ overlay_transit()
 * @param {Object[]} matchedRules - จาก match_rules()
 * @param {Object} options - { onStream?, signal? }
 * @returns {Promise<string>} ข้อความพยากรณ์ภาษาไทย
 */
export async function send_to_typhoon(natalPayload, matchedRules, options={}){
  if(!natalPayload||!matchedRules?.length){
    throw new Error('[Typhoon] payload หรือ rules ว่างเปล่า');
  }

  const isQA=!!(natalPayload._is_qa_mode);
  const {systemPrompt,userPrompt}=build_prompt(natalPayload,matchedRules,isQA);
  // แจ้ง caller ให้ดู prompt ก่อน call API
  if(typeof options.onPromptReady==='function') options.onPromptReady(systemPrompt,userPrompt);

  const body=JSON.stringify({
    model:TYPHOON_MODEL,
    max_tokens:MAX_TOKENS,
    response_format:{type:'json_object'},
    messages:[
      {role:'system',content:systemPrompt},
      {role:'user',content:userPrompt},
    ],
    stream:false,
  });

  let resp;
  try{
    resp=await fetch(TYPHOON_WORKER_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body,
      signal:options.signal||null,
    });
  }catch(err){
    console.warn('[Typhoon] fetch error:',err);
    throw new Error('[Typhoon] เชื่อมต่อ API ไม่ได้: '+err.message);
  }

  if(!resp.ok){
    const errText=await resp.text().catch(()=>'');
    console.warn('[Typhoon] HTTP',resp.status,errText);
    throw new Error(`[Typhoon] HTTP ${resp.status}`);
  }

  let data;
  try{
    data=await resp.json();
  }catch(_err){
    throw new Error('[Typhoon] parse response ไม่ได้');
  }

  // รองรับ OpenAI-compatible format
  let raw=null;
  if(data.choices&&data.choices[0]?.message?.content){
    raw=data.choices[0].message.content.trim();
  }else if(data.content&&data.content[0]?.text){
    raw=data.content[0].text.trim();
  }
  if(!raw){
    const msg=data.error?.message||JSON.stringify(data).slice(0,100);
    throw new Error('[Typhoon] response format ไม่รู้จัก: '+msg);
  }

  // M3: parse structured JSON + validate rule_ids ต้านการ hallucinate
  const ruleIds=new Set(matchedRules.map(r=>_ruleId(r)));
  const _parsePredictions=(txt)=>{
    const m=txt.match(/\{[\s\S]*\}/);
    const parsed=JSON.parse(m?m[0]:txt); // throws ถ้าไม่ใช่ JSON
    if(!parsed.predictions||!Array.isArray(parsed.predictions)) return null;
    const valid=parsed.predictions.filter(p=>ruleIds.has(p.rule_id)&&p.text);
    if(!valid.length) return null;
    if(typeof options.onPredictions==='function') options.onPredictions(valid);
    return valid.map(p=>`[${p.rule_id}] ${p.text.trim()}`).join('\n\n');
  };
  try{ const r=_parsePredictions(raw); if(r) return r; }catch(_){}

  // retry 1 ครั้ง — Typhoon ไม่ follow JSON format → ลองอีกครั้งก่อน fallback
  try{
    const r2=await fetch(TYPHOON_WORKER_URL,{method:'POST',headers:{'Content-Type':'application/json'},body,signal:options.signal||null});
    if(r2.ok){
      const d2=await r2.json();
      const raw2=(d2.choices?.[0]?.message?.content||d2.content?.[0]?.text||'').trim();
      if(raw2){ try{ const r=_parsePredictions(raw2); if(r) return r; }catch(_){} }
    }
  }catch(_){}
  throw new Error('[Typhoon] ตอบไม่ใช่ JSON หลัง retry');
}

// ── Fallback renderer ──────────────────────────────────────────────────────

/**
 * render_fallback(natalPayload, matchedRules)
 * แสดงผลเมื่อ Typhoon API ล้มเหลว
 * เรียงตาม manifestation — ใช้ rule.p (predict_text จาก kb_context) โดยตรง
 * ห้ามสร้างข้อความเอง
 */
export function render_fallback(natalPayload, matchedRules){
  if(!matchedRules?.length)return'[ไม่พบกฎที่ตรงกับดวง]';

  const lines=[
    `ลัคนา${natalPayload?.lagna?.name||'?'}`,
    `(แสดงกฎดิบ — Typhoon API ไม่พร้อมใช้งาน)`,
    '',
  ];

  // group by chapter
  const groups={};
  matchedRules.forEach(r=>{
    const g=r.ch||'ทั่วไป';
    if(!groups[g])groups[g]=[];
    groups[g].push(r);
  });

  for(const[ch,rules] of Object.entries(groups)){
    lines.push(`【${ch}】`);
    rules.forEach(r=>lines.push(`• ${r.p}`));
    lines.push('');
  }

  return lines.join('\n').trim();
}

// ── Main entry point ───────────────────────────────────────────────────────

/**
 * interpret(pos, ascSign, kbRules, natalPayload, options?)
 * Entry point หลักของ V3 pipeline — Step 9
 *
 * @param {number[]} pos - natal sp[]
 * @param {number} ascSign
 * @param {Object[]} kbRules - จาก kb_context.json (array)
 * @param {Object} natalPayload - จาก build_natal_payload() หรือ overlay_transit()
 * @param {Object} options - { transitPos?, onFallback?, signal? }
 * @returns {Promise<{text:string, rules:Object[], fallback:boolean}>}
 */
export async function interpret(pos, ascSign, kbRules, natalPayload, options={}){
  const{transitPos=null, onFallback=null, signal=null}=options;

  // match rules
  const matched=match_rules(pos,ascSign,kbRules,transitPos,natalPayload);

  // call Typhoon
  let text='', fallback=false;
  try{
    text=await send_to_typhoon(natalPayload,matched,{signal});
  }catch(e){
    console.warn('[interpret] Typhoon failed, using fallback:',e.message);
    text=render_fallback(natalPayload,matched);
    fallback=true;
    if(typeof onFallback==='function')onFallback(e);
  }

  return{text,rules:matched,fallback};
}

/**
 * send_chat(messages, options?) — conversational mode (voice chat)
 * messages: [{role:'system'|'user'|'assistant', content:string}]
 */
export async function send_chat(messages,options={}){
  const body=JSON.stringify({
    model:TYPHOON_MODEL,
    max_tokens:400,
    messages,
    stream:false,
  });
  let resp;
  try{
    resp=await fetch(TYPHOON_WORKER_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body,
      signal:options.signal||null,
    });
  }catch(err){
    throw new Error('[Chat] เชื่อมต่อ API ไม่ได้: '+err.message);
  }
  if(!resp.ok)throw new Error(`[Chat] HTTP ${resp.status}`);
  let data;
  try{data=await resp.json();}catch(_err){throw new Error('[Chat] parse response ไม่ได้');}
  const raw=data.choices?.[0]?.message?.content?.trim()||data.content?.[0]?.text?.trim();
  if(!raw)throw new Error('[Chat] response ว่างเปล่า');
  return raw;
}
