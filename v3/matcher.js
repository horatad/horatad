// v3/matcher.js — BIBLE rule matching layer
// แยกออกจาก engine.js เพื่อให้ calculator (engine.js) เป็น pure position calculator
//
// Input:  natalState  ← buildNatalState(pos)          จาก engine.js
//         rules       ← kb_tals.json array             จาก BIBLE KB
//         transitState ← buildNatalState(transitPos)  optional
// Output: matched[]   ← rules ที่ fire — ส่งต่อไป predict / _augmentWithJulian

import { get_tanu_lagna } from './engine.js';

// planet index ของ 5 ดาวจรหนัก: MR(10), SA(7), MA(3), RA(8), JU(5)
const TRANSIT_PLANET_IDX = {MR:10, SA:7, MA:3, RA:8, JU:5};

/**
 * getAspect(tSign, targetSign) → 'KUM'|'LENG'|'YOK'|'TRI'|null
 * KUM=0, LENG=6, YOK=4|8, TRI=2|10
 */
export function getAspect(tSign, targetSign){
  const diff=((tSign-targetSign)+12)%12;
  if(diff===0)return'KUM';
  if(diff===6)return'LENG';
  if(diff===4||diff===8)return'YOK';
  if(diff===2||diff===10)return'TRI';
  return null;
}

/**
 * matchTransitRules(natalPos, transitPos, kbTransit) → matched rules[]
 * Phase 2: kb_transit.json — จรกุม/เล็ง/โยค/ตรีโกณ ลัคนา หรือ ตนุลัคนา
 */
export function matchTransitRules(natalPos, transitPos, kbTransit){
  const lagnaSign=Math.trunc(natalPos[0]/1800);
  const tanuIdx=get_tanu_lagna(lagnaSign);
  const tanuSign=Math.trunc(natalPos[tanuIdx]/1800);
  const matched=[];
  for(const rule of kbTransit){
    const pIdx=TRANSIT_PLANET_IDX[rule.transit_planet];
    if(pIdx===undefined)continue;
    const tSign=Math.trunc(transitPos[pIdx]/1800);
    const targetSign=rule.natal_target==='LA'?lagnaSign:tanuSign;
    const asp=getAspect(tSign,targetSign);
    if(asp!==null&&asp===rule.aspect){
      matched.push({...rule,_isTransit:true});
    }
  }
  return matched;
}

/**
 * matchRulesV24(natalState, rules, transitState?) → matched rules[]
 * natalState: from buildNatalState(natalPos)
 * transitState: from buildNatalState(transitPos, null, natalState.ascSign)
 * rules: array from kb_tals.json (BIBLE structured schema, Multi-DB 2.1)
 */
export function matchRulesV24(natalState,rules,transitState=null){
  const matched=[];
  for(const r of rules){
    if(r.rule_use==='case_study')continue;

    const pids=r.planet_ids||[];
    const rtype=r.type||'';
    const ctx=r.contexts||['natal'];

    // DEFINITION / PRINCIPLE / REFERENCE — include unconditionally (no planet trigger)
    if(rtype==='DEFINITION'||rtype==='PRINCIPLE'||rtype==='REFERENCE'){
      if(pids.length===0)matched.push(r);
      continue;
    }

    if(rtype==='NATAL_ATOMIC'||rtype==='NATAL_COMBINATION'){
      if(!ctx.includes('natal'))continue;
      if(pids.length===0){matched.push(r);continue;}
      // ALL planet_ids must have a lagna aspect (กุม/เล็ง/โยค/ตรีโกณ)
      if(pids.every(pid=>{
        const ps=natalState.planets[pid];
        return ps&&ps.lagnaAsp!=='NONE';
      }))matched.push(r);

    }else if(rtype==='TRANSIT_NATAL'){
      if(!transitState)continue;
      if(!ctx.includes('transit'))continue;
      if(pids.length===0){matched.push(r);continue;}
      // ALL transit planet_ids must aspect natal lagna from transit positions
      if(pids.every(pid=>{
        const ts=transitState.planets[pid];
        return ts&&ts.lagnaAsp!=='NONE';
      }))matched.push(r);
    }
  }
  return matched;
}
