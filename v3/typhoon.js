// Version 3.0.4 | 2026-05-21
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
} from './engine.js';

// ── Config ────────────────────────────────────────────────────────────────
const TYPHOON_WORKER_URL = 'https://horatad-ai.uchujaro5.workers.dev';
const TYPHOON_MODEL = 'typhoon-v2.5-30b-a3b-instruct';
const MAX_TOKENS = 1200;
const MAX_RULES = 28;
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

// ── Condition-based rule matching helpers (M1) ────────────────────────────

function _checkCondition(cond,pos,effectsMap,potentialsMap){
  const{planet_id,quality_required,lagna_aspect_req}=cond;
  const pid=parseInt(planet_id)||0;
  if(!pid)return true;
  const entry=effectsMap[pid]||potentialsMap[pid];
  if(entry&&entry.manifestation<MIN_MANIFESTATION&&entry.aspect==='NONE')return false;
  const pQualRaw=getStandards(pos,pid);
  const pQuals=pQualRaw
    ?pQualRaw.split('/').map(q=>QUAL_MAP[q]||q).filter(q=>QLABELS[q])
    :[];
  const pScore=pQuals.length>0?Math.max(...pQuals.map(q=>SCORE_MAP[q]||0)):0;
  const qr=quality_required;
  if(qr&&qr!=='any'&&qr!==''){
    if(qr==='ดี'&&pScore<=0)return false;
    if(qr==='เสีย'&&pScore>=0)return false;
    if(qr==='ปกติ'&&pScore!==0)return false;
    if(QLABELS[qr]&&!pQuals.includes(qr))return false;
  }
  const asp=entry?entry.aspect:'NONE';
  const lar=lagna_aspect_req;
  if(lar&&lar!=='any'&&lar!==''){
    if(lar==='none'&&asp!=='NONE')return false;
    if(lar!=='none'&&asp==='NONE')return false;
    if(lar!=='none'&&asp!==lar)return false;
  }
  return true;
}

// ตรวจ conditions[] ของ rule — null=ใช้ tag matching, true=match, false=no match
function _matchByConditions(r,pos,effectsMap,potentialsMap){
  const conds=r.conditions||[];
  if(!conds.length)return null;
  for(const c of conds){
    if(c.required!==false&&!_checkCondition(c,pos,effectsMap,potentialsMap))return false;
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

  function addRule(r){
    const k=r.c+(r.ch||'');
    if(!seen.has(k)){seen.add(k);res.push(r);}
  }

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
    const pSign=Math.trunc(pos[i]/1800);
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

    kbRules.forEach(r=>{
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

  // ── conditions-based matching (M1 — natal rules ที่มี conditions[]) ─────
  kbRules
    .filter(r=>r.conditions&&r.conditions.length>0&&!(r.t||[]).includes('จร'))
    .forEach(r=>{
      if(_matchByConditions(r,pos,effectsMap,potentialsMap))addRule(r);
    });

  // ── transit matching (Q&A mode) ───────────────────────────────────────
  if(transitPos&&natalPayload?._is_qa_mode){
    const TRANSIT_PLANETS=[10,7,3,8,5]; // MR,SA,MA,RA,JU
    for(const i of TRANSIT_PLANETS){
      const pName=PLANET_NAMES_TH[i];
      const pNameKB=_kbName(pName);
      const asp=compute_lagna_aspect(transitPos,i,ascSign);
      if(asp==='NONE')continue;
      const aspTH=ASP_TH[asp];
      kbRules
        .filter(r=>{
          const ts=(r.t||[]).join(' ');
          return ts.includes('จร')&&ts.includes(pNameKB);
        })
        .forEach(r=>addRule(r));
    }
  }

  // foundation rules (priority 1 + core chapters)
  kbRules
    .filter(r=>r.pr===1&&['chapter_04','chapter_06','chapter_08','chapter_09','chapter_13'].includes(r.ch))
    .slice(0,6)
    .forEach(r=>addRule(r));

  res.sort((a,b)=>(a.pr||99)-(b.pr||99));
  return res.slice(0,MAX_RULES);
}

// ── Prompt builder ─────────────────────────────────────────────────────────

/**
 * build_prompt(natalPayload, matchedRules, isQA)
 * สร้าง prompt สำหรับ Typhoon
 * ห้ามใส่ข้อความพยากรณ์ใน prompt — rules จาก kb_context เท่านั้น
 */
function build_prompt(natalPayload, matchedRules, isQA=false){
  // M8: tagged phrase cluster format — [polarity+domain] keywords
  const rulesText=matchedRules
    .map((r,i)=>{
      const pol=classify_rule_polarity(r);
      const domain=get_rule_domain(r,natalPayload);
      const tag=`[${pol}${domain?domain:'ทั่วไป'}]`;
      const kws=r.p
        .replace(/\([^)]*\)/g,'')
        .replace(/[—→=+|[\]]/g,' ')
        .split(/[\s,，]+/)
        .filter(p=>p.length>=3&&/[ก-๙]/.test(p))
        .join(', ');
      return `• [R${String(i+1).padStart(2,'0')}]${tag} ${kws}`;
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
`คุณคือโหราจารย์ไทยระบบ Horatad ที่พยากรณ์ตามกฎโหราศาสตร์สุริยยาตร์ไทยเท่านั้น

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

  const body=JSON.stringify({
    model:TYPHOON_MODEL,
    max_tokens:MAX_TOKENS,
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
  }catch(err){
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
  const ruleIds=new Set(matchedRules.map((_,i)=>'R'+String(i+1).padStart(2,'0')));
  try{
    const m=raw.match(/\{[\s\S]*\}/);
    const parsed=JSON.parse(m?m[0]:raw);
    if(parsed.predictions&&Array.isArray(parsed.predictions)){
      const texts=parsed.predictions
        .filter(p=>ruleIds.has(p.rule_id)&&p.text)
        .map(p=>p.text.trim());
      if(texts.length>0)return texts.join('\n\n');
    }
  }catch(_){}
  return raw; // fallback: แสดง raw text ถ้า JSON parse ไม่ได้
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
