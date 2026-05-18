// Version 3.0.1 | 2026-05-18
// v3/typhoon.js — Typhoon API Connector
// ห้าม hardcode ข้อความพยากรณ์
// ห้าม hallucinate — ข้อความต้องมาจาก kb_context rules เท่านั้น
// ES Module

import {
  compute_lagna_aspect,
  describe_planet_for_prompt,
  describe_natal_payload,
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
  const rulesText=matchedRules
    .map(r=>`• [${r.ch||'?'}] ${r.c} → ${r.p}`)
    .join('\n');

  const chartSummary=describe_natal_payload(natalPayload);

  const transitSection=isQA&&natalPayload.transit_context
    ?'\nดาวจร (เรียงตาม transit_weight):\n'+
      natalPayload.transit_context
        .map(t=>`• ${t.name}(${t.sign_name}) H${t.house} ${ASP_TH[t.aspect]||'-'}`)
        .join('\n')
    :'';

  const modeNote=isQA
    ?'(โหมด Q&A: พยากรณ์พื้นดวง + ดาวจร)'
    :'(โหมดพื้นดวง: พยากรณ์เฉพาะนาตาล)';

  // SYSTEM INSTRUCTION ฝั่ง Typhoon — anti-hallucination rules
  const systemPrompt=
`คุณคือโหราจารย์ไทยระบบ Horatad ที่พยากรณ์ตามกฎโหราศาสตร์สุริยยาตร์ไทยเท่านั้น

กฎเหล็ก:
- ห้ามใส่ตัวเลข เลขลำดับ หรือเครื่องหมาย # นำหน้าทุกประโยคหรือหัวข้อ
- ห้ามแสดงค่าตัวเลขทางเทคนิคใดๆ เช่น manifestation score, weight, index ในคำพยากรณ์
- ห้ามสร้างข้อความพยากรณ์ใหม่ที่ไม่ได้มาจากกฎที่ให้มา
- ห้ามปลอบโยน ห้าม validate ความรู้สึก ห้ามสร้างความหวังเกินกฎ
- เรียงพยากรณ์จากดาวที่แสดงออกมากที่สุดไปน้อยที่สุด ไม่ต้องระบุลำดับ
- ถ้ากฎบอก "เชื่อคนง่าย" ให้บอกตรงๆ ไม่อ้อมค้อม
- ใช้ภาษาไทยกระชับ ไม่เกิน 350 คำ ไม่ต้องระบุหมายเลขดาวหรือ index
- ไม่ต้องมีคำนำหรือคำส่งท้ายเชิงสวัสดีหรืออวยพร`;

  const userPrompt=
`${modeNote}

ข้อมูลดวงชาตา:
${chartSummary}${transitSection}

กฎโหราศาสตร์ที่ตรงกับดวง (${matchedRules.length} กฎ):
${rulesText}

เรียบเรียงคำพยากรณ์จากกฎเหล่านี้โดยเริ่มจากจุดที่แสดงออกเด่นชัดที่สุดก่อน`;

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
  if(data.choices&&data.choices[0]?.message?.content){
    return data.choices[0].message.content.trim();
  }
  // fallback format
  if(data.content&&data.content[0]?.text){
    return data.content[0].text.trim();
  }

  const msg=data.error?.message||JSON.stringify(data).slice(0,100);
  throw new Error('[Typhoon] response format ไม่รู้จัก: '+msg);
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
