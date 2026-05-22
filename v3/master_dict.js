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
