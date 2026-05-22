// Version 3.0.0 | 2026-05-18
// v3/engine.js — Horatad Core Engine
// Source: copied from script.js (V2 production) — ห้ามแก้ logic คำนวณดาว
// ES Module export สำหรับ V3 pipeline

// ── Constants (copied verbatim from script.js) ────────────────────────────
const KASET_MAP  = {0:3,1:6,2:4,3:2,4:1,5:4,6:6,7:3,8:5,9:7,10:8,11:5};
const EXALT_MAP  = {1:0,2:1,3:9,4:5,5:3,6:11,7:6,8:7};
const MAHACHAK_MAP = {1:6,2:0,3:5,4:4,5:7,6:8,7:1,8:9};
const RACHA_MAP  = {1:2,2:5,3:1,4:4,5:0,6:3,7:7,8:6};
const MEAN_SPEEDS = {1:59,2:790,3:31,4:59,5:5,6:59,7:2,8:3};
const HOUSE_SCORE = {1:4,4:3,7:3,10:3,5:2,9:2,11:2,2:1,3:1,6:-2,8:-3,12:-3};
const STD_SCORE  = {'เกษตร':4,'มหาอุจ':5,'ประ':-3,'นิจ':-5};
const UNTO = [0,5,9,12,17,23,30,37,43,48,51,55,60];
const Y_SUN = [0,35,67,94,116,129,134,134,134];
const Y_MON = [0,77,148,209,256,286,296,296,296];
const Y_OTH = [0,244,427,488,488,488];

// Planet index labels (sp[0]=lagna, sp[1]=SU ... sp[10]=MR)
export const PLANET_KEYS = ['LA','SU','MO','MA','ME','JU','VE','SA','RA','KE','MR'];
export const PLANET_NAMES_TH = ['ลัคนา','อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์','ราหู','เกตุ','มฤตยู'];
export const ZODIAC_TH = ['เมษ','พฤษภ','มิถุน','กรกฎ','สิงห์','กันย์','ตุลย์','พิจิก','ธนู','มกร','กุมภ์','มีน'];

// ── Low-level helpers (copied verbatim) ───────────────────────────────────
function tr(x,r){return((x%r)+r)%r;}

function get_j(d,m,y){
  let yt,mt;if(m>=3){yt=y;mt=m-3;}else{yt=y-1;mt=m+9;}
  return 365*yt+d+Math.trunc(30.6*mt+0.5)+Math.trunc(yt/4)-Math.trunc(yt/100)+Math.trunc(yt/400)+2;
}

function get_pk(a){
  a=tr(a,21600);
  if(a<5400)return[a,5400-a,-1,1];if(a<10800)return[10800-a,a-5400,-1,-1];
  if(a<16200)return[a-10800,16200-a,1,-1];return[21600-a,a-16200,1,1];
}

function get_s(star,ravi,klp){
  klp=parseFloat(klp);let my_o,a;
  if(star===3){my_o=tr(Math.trunc(klp/2+klp*16/505+5420),21600);a=my_o-7620;}
  else if(star===4){my_o=tr(Math.trunc(klp*7/46+klp*4+10642),21600);a=ravi-13200;}
  else if(star===5){my_o=tr(Math.trunc(klp/12+klp/1032+14297),21600);a=my_o-10320;}
  else if(star===6){my_o=tr(Math.trunc(klp*5/3-klp*10/243+10944),21600);a=ravi-4800;}
  else if(star===7){my_o=tr(Math.trunc(klp/30+klp*6/10000+11944),21600);a=my_o-14820;}
  else if(star===10){my_o=tr(Math.trunc(klp/84+klp/7224+16277),21600);a=my_o-7440;}
  else return 0;
  a=tr(a,21600);let[p,k,sp_s,sk_s]=get_pk(a);
  let u_p=Math.trunc(p/1800);
  let mon_p=Math.trunc(((p/1800-u_p)*(Y_OTH[u_p+1]-Y_OTH[u_p])+Y_OTH[u_p])*60);
  let u_k=Math.trunc(k/1800);
  let mon_k=Math.trunc((k/1800-u_k)*(Y_OTH[u_k+1]-Y_OTH[u_k])+Y_OTH[u_k]);
  let mon_sd,mon_pyt;
  if(star===3){mon_sd=2700+sk_s*Math.trunc(mon_k/2);mon_pyt=Math.trunc(mon_sd*4/15);}
  else if(star===4){mon_sd=6000+sk_s*Math.trunc(mon_k/2);mon_pyt=1260;}
  else if(star===5){mon_sd=5520+sk_s*Math.trunc(mon_k/2);mon_pyt=Math.trunc(mon_sd*3/7);}
  else if(star===6){mon_sd=19200+sk_s*Math.trunc(mon_k/2);mon_pyt=660;}
  else if(star===7){mon_sd=3780+sk_s*Math.trunc(mon_k/2);mon_pyt=Math.trunc(mon_sd*7/6);}
  else{mon_sd=38640+sk_s*Math.trunc(mon_k/2);mon_pyt=Math.trunc(mon_sd*21/49);}
  let r=Math.trunc(mon_p*60/mon_sd),isMyO=[3,5,7,10].includes(star);
  let mon_sp=(isMyO?my_o:ravi)+r*sp_s,a_f=tr(mon_sp-(isMyO?ravi:my_o),21600);
  let[pf,,spf,skf]=get_pk(a_f),u_pf=Math.trunc(pf/1800);
  let sing_p=Math.trunc(((pf/1800-u_pf)*(Y_OTH[u_pf+1]-Y_OTH[u_pf])+Y_OTH[u_pf])*60);
  let[,kf2]=get_pk(a_f),u_kf=Math.trunc(kf2/1800);
  let sing_k=Math.trunc((kf2/1800-u_kf)*(Y_OTH[u_kf+1]-Y_OTH[u_kf])+Y_OTH[u_kf]);
  let pol_h=Math.trunc(sing_p/60/3+sing_k*skf+mon_pyt);
  return tr(mon_sp+Math.trunc(sing_p*60/pol_h)*spf,21600);
}

// ── Core engine (copied verbatim from script.js) ──────────────────────────
function _core(d,m,y,hr,mn){
  let sp=new Array(11).fill(0),j=get_j(d,m,y),h0=j-233051,time_dec=(hr+mn/60)/24;
  let js_local=Math.trunc(((h0+time_dec)*800-373)/292207);
  let kp=Math.trunc((h0*800+time_dec*800)-(js_local*292207+373));
  let z=Math.trunc(kp/24350),kl=tr(kp,24350),dd=Math.trunc(kl/811);
  let l_val=Math.trunc(tr(kl,811)/14)-3,ms=tr(z*1800+dd*60+l_val,21600);
  let ap=tr(ms-4800,21600),[pk_ap,,pk_asp]=get_pk(ap),u_p=Math.trunc(pk_ap/900);
  let r_sun=Math.trunc((pk_ap/900-u_p)*(Y_SUN[u_p+1]-Y_SUN[u_p])+Y_SUN[u_p]);
  sp[1]=tr(ms+r_sun*pk_asp,21600);
  let mr=tr(ms-23,21600),s_up=js_local-610-(kp<364?1:0),klp=s_up*21600+mr;
  let aw_mp=Math.trunc(h0*703+650+time_dec*703),aw_ml=tr(aw_mp,20760),dithi=Math.trunc(aw_ml/692);
  let mm=Math.trunc(dithi*720+(1.04*tr(aw_ml,692))-40+ms);
  let ud0=tr(h0-621,3232),mud=Math.trunc((ud0+time_dec)*21600/3232)+2,amp=tr(mm-mud,21600);
  let[pk_amp,,pk_amsp]=get_pk(amp),u_m=Math.trunc(pk_amp/900);
  let r_mon=Math.trunc((pk_amp/900-u_m)*(Y_MON[u_m+1]-Y_MON[u_m])+Y_MON[u_m]);
  sp[2]=tr(mm+r_mon*pk_amsp,21600);
  sp[9]=tr(21600-Math.trunc((tr(h0-344,679)+time_dec)*21600/679),21600);
  sp[8]=tr(15150-Math.trunc(klp/20+klp/265),21600);
  for(let s of[3,4,5,6,7,10])sp[s]=get_s(s,mr,klp);
  let tf6=(hr+mn/60)-6;if(tf6<0)tf6+=24;
  let rs=Math.trunc(sp[1]/1800);
  let un=((sp[1]/1800-rs)*(UNTO[rs+1]-UNTO[rs])+UNTO[rs]+tf6*2.5)%60;
  let idx=0;while(idx<12&&UNTO[idx]<=un)idx++;
  sp[0]=Math.trunc(((un-UNTO[idx-1])/(UNTO[idx]-UNTO[idx-1])+idx-1)*1800);
  return sp;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * get_data(d, m, y, hr, mn, lng) → sp[0..10]
 * lng = longitude of birthplace (degrees east), default 100.5 (Bangkok)
 * sp[0]=lagna, sp[1]=SU, sp[2]=MO, sp[3]=MA, sp[4]=ME,
 * sp[5]=JU, sp[6]=VE, sp[7]=SA, sp[8]=RA, sp[9]=KE, sp[10]=MR
 * unit: 21600 = full circle
 */
export function get_data(d,m,y,hr,mn,lng=100.5){
  return _core(d,m,y,hr-(105-lng)*4/60,mn);
}

/**
 * get_lagna(pos) → ราศีลัคนา 0-11
 */
export function get_lagna(pos){
  return Math.trunc(pos[0]/1800);
}

/**
 * getHouse(pos, i, ascSign) → house 1-12
 * i = planet index (1-10), ascSign = ราศีลัคนา 0-11
 */
export function getHouse(pos,i,ascSign){
  return(Math.trunc(pos[i]/1800)-ascSign+12)%12+1;
}

/**
 * get_all_houses(pos, ascSign) → { LA:1, SU:h, MO:h, ... MR:h }
 */
export function get_all_houses(pos,ascSign){
  const h={LA:1};
  for(let i=1;i<=10;i++){
    h[PLANET_KEYS[i]]=getHouse(pos,i,ascSign);
  }
  return h;
}

/**
 * getStandards(pos, i) → string eg "เกษตร/มหาอุจ" or ""
 */
export function getStandards(pos,i){
  if(i===0)return '';
  let s=Math.trunc(pos[i]/1800),res=[],ex=EXALT_MAP[i];
  if(KASET_MAP[s]===i)res.push('เกษตร');
  if(ex!==undefined&&ex===s)res.push('มหาอุจ');
  if(ex!==undefined&&(ex+1)%12===s)res.push('อุจจาวิลาส');
  if(ex!==undefined&&((ex-1+12)%12)===s)res.push('อุจจาภิมุข');
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
  // retrograde penalty: vel[i] > 15000 = retrograde (วक्र)
  if(vel&&vel[i]>15000)score-=2;
  let label=score>=6?'แข็งแกร่งมาก':score>=3?'แข็งแกร่ง':score>=0?'ปานกลาง':score>=-3?'อ่อนแอ':'อ่อนแอมาก';
  return[score,label];
}

/**
 * compute_std_score(pos, i) → numeric score -5..+5 สำหรับ manifestation
 * map: มหาอุจ=+5, เกษตร=+4, อุจจาวิลาส/อุจจาภิมุข=+2, นิจ=-5, ประ=-3, others=0
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
 * คือ KASET_MAP[ascSign] = planet owning that sign
 */
export function get_tanu_lagna(ascSign){
  return KASET_MAP[ascSign];
}

export {KASET_MAP,EXALT_MAP,STD_SCORE,HOUSE_SCORE,MEAN_SPEEDS,get_j};
