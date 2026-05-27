// v3/standards.js — TALS evaluation layer
// แยกออกจาก engine.js เพื่อให้ engine.js เป็น pure calculator
// standards.js = "รู้ว่าดาวอยู่ที่ไหน → บอกได้ว่าดีหรือไม่ดีตาม TALS"
//
// dependency: import getHouse จาก engine.js (calculator ส่ง pos[] มา)

import { getHouse } from './engine.js';

// ── TALS quality maps (single source of truth) ───────────────────────────
// กุมภ์→ราหู(8) corrected 2026-05-28: เจ้าเกษตร≠ตนุเศษ ราหูเป็นเจ้าเรือนได้ แต่ไม่ใช่ผลตนุเศษ
export const KASET_MAP   = {0:3,1:6,2:4,3:2,4:1,5:4,6:6,7:3,8:5,9:7,10:8,11:5};
export const EXALT_MAP   = {1:0,2:1,3:9,4:5,5:3,6:11,7:6,8:7};
// อาทิตย์: 6(ตุล)→3(กรกฎ) corrected per user 2026-05-26
export const MAHACHAK_MAP= {1:3,2:0,3:5,4:4,5:7,6:8,7:1,8:9};
// verified 2026-05-28 จาก 100CH (ปีเตอร์): อา→มิ,จ→กัน,อัง→พฤ,พุ→สิ,พฤ→เม,ศุ→กร,เส→พิ,รา→ตุ
export const RACHA_MAP   = {1:2,2:5,3:1,4:4,5:0,6:3,7:7,8:6};
export const STD_SCORE   = {'เกษตร':4,'มหาอุจ':5,'ประ':-3,'นิจ':-5};
export const HOUSE_SCORE = {1:4,4:3,7:3,10:3,5:2,9:2,11:2,2:1,3:1,6:-2,8:-3,12:-3};
export const MEAN_SPEEDS = {1:59,2:790,3:31,4:59,5:5,6:59,7:2,8:3};

// ── Private helpers ───────────────────────────────────────────────────────

function _lagnaAspect(house){
  if(house===1)return'KUM';                      // กุมลัคนา
  if(house===7)return'LENG';                     // เล็ง
  if(house===4||house===10)return'YOK';          // โยค
  if(house===5||house===9)return'TRI';           // ตรีโกณ
  return'NONE';
}

// ── TALS evaluator functions ──────────────────────────────────────────────

/**
 * getStandards(pos, i) → string eg "เกษตร/มหาอุจ" or ""
 */
export function getStandards(pos,i){
  if(i===0)return '';
  let s=Math.trunc(pos[i]/1800),res=[],ex=EXALT_MAP[i];
  if(KASET_MAP[s]===i)res.push('เกษตร');
  if(ex!==undefined&&ex===s)res.push('มหาอุจ');
  if(ex!==undefined&&((ex-1+12)%12)===s)res.push('อุจจาวิลาส');  // ราศีก่อนอุจ
  if(ex!==undefined&&(ex+1)%12===s)res.push('อุจจาภิมุข');        // ราศีหลังอุจ
  if(KASET_MAP[(s+6)%12]===i)res.push('ประ');
  if(ex!==undefined&&(ex+6)%12===s)res.push('นิจ');
  let mc=MAHACHAK_MAP[i];if(mc!==undefined&&mc===s)res.push('มหาจักร');
  if(mc!==undefined&&(mc+6)%12===s)res.push('จุลจักร');
  let rc=RACHA_MAP[i];if(rc!==undefined&&rc===s)res.push('ราชาโชค');
  if(rc!==undefined&&(rc+6)%12===s)res.push('เทวีโชค');
  return res.join('/');
}

/**
 * getStrength(pos, vel, i, ascSign) → [score, label]
 * vel = velocity array (same index as pos), pass same pos if vel unavailable
 */
export function getStrength(pos,vel,i,ascSign){
  if(i===0)return[0,'-'];
  let score=0,std=getStandards(pos,i);
  for(let k of Object.keys(STD_SCORE))if(std.includes(k))score+=STD_SCORE[k];
  score+=(HOUSE_SCORE[getHouse(pos,i,ascSign)]||0);
  if(vel&&vel[i]>15000)score-=2;
  let label=score>=6?'แข็งแกร่งมาก':score>=3?'แข็งแกร่ง':score>=0?'ปานกลาง':score>=-3?'อ่อนแอ':'อ่อนแอมาก';
  return[score,label];
}

/**
 * compute_std_score(pos, i) → numeric score -5..+5 สำหรับ manifestation
 */
export function compute_std_score(pos,i){
  if(i===0)return 0;
  let std=getStandards(pos,i),score=0;
  if(std.includes('มหาอุจ'))score+=5;
  else if(std.includes('เกษตร'))score+=4;
  else if(std.includes('อุจจาวิลาส')||std.includes('อุจจาภิมุข'))score+=2;
  if(std.includes('นิจ'))score-=5;
  else if(std.includes('ประ'))score-=3;
  return Math.max(-5,Math.min(5,score));
}

/**
 * get_tanu_lagna(ascSign) → planet index ที่เป็นเจ้าของลัคนา (1-10)
 */
export function get_tanu_lagna(ascSign){
  return KASET_MAP[ascSign];
}

/**
 * buildNatalState(pos, vel?, ascSignOverride?) → planet state map
 * Returns { ascSign, planets: { [1..10]: { sign, quality, qualScore, house, lagnaAsp, strength } } }
 */
export function buildNatalState(pos,vel=null,ascSignOverride=null){
  const ascSign=ascSignOverride!==null?ascSignOverride:Math.trunc(pos[0]/1800);
  const planets={};
  for(let i=1;i<=10;i++){
    const sign=Math.trunc(pos[i]/1800);
    const quality=getStandards(pos,i);
    const qualScore=compute_std_score(pos,i);
    const house=getHouse(pos,i,ascSign);
    const lagnaAsp=_lagnaAspect(house);
    const[strength]=getStrength(pos,vel,i,ascSign);
    planets[i]={sign,quality,qualScore,house,lagnaAsp,strength};
  }
  return{ascSign,planets};
}
