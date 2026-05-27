// v3/matcher.js — BIBLE rule matching layer
// แยกออกจาก engine.js เพื่อให้ calculator (engine.js) เป็น pure position calculator
//
// Input:  natalState  ← buildNatalState(pos)          จาก engine.js
//         rules       ← kb_tals.json array             จาก BIBLE KB
//         transitState ← buildNatalState(transitPos)  optional
// Output: matched[]   ← rules ที่ fire — ส่งต่อไป predict / _augmentWithJulian

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
