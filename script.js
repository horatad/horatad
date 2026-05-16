// Version 2.2.2 | 2026-05-17
// Changes: [V2.2.0] Pass 1
//   - Bug fix: share image ลบ logo overlay ซ้ำซ้อน (chart-canvas มี logo อยู่แล้ว)
//   - Bug fix: outer label สี unified — ลบ OUTER_LABEL_V2 ใช้ OUTER_LABEL_V1 เสมอ
//   - Bug fix: canvas/report bg คงที่ — ลบ dynamic bg ใน _redraw + drawChart + share
//   - Feature: prov sound — _playBeep เมื่อเลือกจังหวัดจาก dropdown
// Changes: [V2.1.9]
//   - Bug fix: pre-2484 warning shown only when buf.length===4 (full year)
//   - Bug fix: lunar info refresh on transit toggle (auto-recalc transit on toggle ON)
//   - Bug fix: time input width mobile (CSS grid 1.3fr + min-width:0)
//   - Feature: split save/share — saveChart() = download, shareChart() = Web Share API
//   - Feature: keyboard sound — Web Audio beep, toggle in About (_soundEnabled)
//   - Feature: numpad validate on commit — 3 strikes → revert to last valid value
//   - Feature: memory cycle — ◀▶ buttons cycle through memory list (cycleMemory)
//   - Feature: About logo 746 + hide H1 logo when About active (body.about-active)
//   - Feature: memory list long-press delete (existing × button + touchstart 600ms)
//   - Feature: memory + event sort — toggle 🕐 ล่าสุด / ก-ฮ / ฮ-ก (Thai locale)
//   - Toast helper for inline feedback
// Changes: [V2.1.8]
//   - Labels: OUTER ['ชื่อราศี','ชื่อภพเรือน','แสดงดาวจร','ดาวจรช้า','ไม่แสดง'],
//             REPORT_TRANSIT ['ดวงเดิม','ดาวจร'], CHART_TYPE ['ราศี','ตรียางค์','นวางค์']
//   - calculateTransit: เพิ่ม vel calc (mirror calculateChart1) → _transitDate.vel
//   - _redraw: branch _reportTransitShow=true → render transit table แทน natal table
//   - buildReport: aspect "ดาวจรสัมพันธ์ ณ" แสดงเสมอเมื่อมี tpos (ลบ _reportTransitShow guard)
//   - Share image: ลบเส้นขอบบน/ล่างชื่อ, ลบ logo+brand footer, เพิ่ม logo overlay 200×200 ขวาบน
//   - Mobile UI: H1 brand layout, tab nav font/padding (style.css)
//   - Button heights: btn-share 36→32, btn-sm 22→28 (style.css)
// Changes: [V2.1.7] logo size 160 (was 240) — ไม่ทับ ring 480 + label "มีน";
//          ราศี font 30px (was 36px) — เท่ากับภพเรือน
// Changes: [V2.1.6] logo: source horatad_500x500.png (solid black bg, gold lines only),
//          alpha 1.0 (was 0.70), ctx.filter 'brightness(1.25) saturate(1.15)' →
//          เส้นทองสว่าง+อิ่มสีขึ้น เด่นเหมือนบนพื้นขาว
// Changes: [V2.1.5] sw.js CACHE_NAME bump to v2.1.5;
//          script.js controllerchange listener → auto-reload เมื่อ SW ใหม่ activate
//          (user เก่าได้ของใหม่อัตโนมัติ ไม่ต้อง hard refresh เอง);
//          index.html YouTube URL update
// Changes: [V2.1.4] Thai font fallback (Noto Sans Thai + Tahoma)
//          fix shaping bug on mobile webview (ยย+า rendering)
// Changes: [V2.1.3] logo: source horatad_746x746.png, size 240 (was 168),
//          position top-right corner (margin 0), alpha 0.70 (was 0.35),
//          circular clip (ctx.arc + clip) before drawImage
// Changes: [V2.0] Share as Image (1080×1080 PNG, Web Share API + fallback download,
//           brand footer, _viewMode-aware bg, btn-share-row ใต้ btn-chart-row)
// Changes: [V1.9] memory icon button (long-press bug fix); dynamic popup title;
//          Esc closes modals; prov empty state; .btn-custom-lng min-width;
//          debounced save (mobile safety); time fields → type="time" native;
//          year smart prefix (BE 25xx / CE 20xx for 2-digit input);
//          lng numpad left-to-right display + parse; remove era label; btn-era 30px
// Changes: [V1.8] localStorage persist (state + memory list 10);
//          long-press name field → memory popup; beforeunload safety
// Changes: [V1.7] searchable prov dropdown; "สถานที่อื่น" label;
//          numpad backspace → clear all (label ล้าง);
//          revert canvas identity (visible in report instead)
// Changes: [V1.6] canvas identity (gender+name+dmy+time+prov top-left);
//          logo 168 closer to corner; report prefix ดวง→removed;
//          cleanup _lastEdited/calculateSmart/chart-date dead code
// Changes: [V1.5] canvas logo: top-right, size 140 (2x)
// Changes: [V1.4] unified ผูกดวง button (calc 1+2) in era-row;
//          removed individual section-1/2 calc buttons
// Changes: [V1.3] gender prefix in report header (ดวงชาย/หญิง/เหตุการณ์)
// Changes: [V1.2] mobile prov scrollIntoView (datalist visible above keyboard)
// Changes: [V1.1] calculateSmart _lastEdited, กำหนดเอง toggle lng↔prov,
//          remove canvas name/date, CHART_TYPE_LABELS จักร, transit self-ref fix,
//          startup viewMode=0, section-transit+btn-cust ids, _updateLngUI
//          [8]transit arabic 44px [9]ดวงที่2 bg purple [10]report no [ดวงที่N] label
//          [11]Thai lunar numerals [12]transit for both views [13]ดาวจรสัมพันธ์ ณ

const PROVINCES={
"กรุงเทพมหานคร":100.50,"กระบี่":98.91,"กาญจนบุรี":99.53,"กาฬสินธุ์":103.51,
"กำแพงเพชร":99.52,"ขอนแก่น":102.83,"จันทบุรี":102.10,"ฉะเชิงเทรา":101.07,
"ชลบุรี":100.98,"ชัยนาท":100.12,"ชัยภูมิ":102.03,"ชุมพร":99.18,
"เชียงราย":99.83,"เชียงใหม่":98.98,"ตรัง":99.61,"ตราด":102.51,
"ตาก":99.12,"นครนายก":101.21,"นครปฐม":100.06,"นครพนม":104.78,
"นครราชสีมา":102.10,"นครศรีธรรมราช":99.96,"นครสวรรค์":100.12,"นนทบุรี":100.51,
"นราธิวาส":101.82,"น่าน":100.78,"บึงกาฬ":103.65,"บุรีรัมย์":103.10,
"ปทุมธานี":100.53,"ประจวบคีรีขันธ์":99.80,"ปราจีนบุรี":101.37,"ปัตตานี":101.25,
"พระนครศรีอยุธยา":100.56,"พะเยา":99.90,"พังงา":98.53,"พัทลุง":100.08,
"พิจิตร":100.35,"พิษณุโลก":100.26,"เพชรบุรี":99.94,"เพชรบูรณ์":101.16,
"แพร่":100.14,"ภูเก็ต":98.40,"มหาสารคาม":103.30,"มุกดาหาร":104.72,
"แม่ฮ่องสอน":97.97,"ยโสธร":104.15,"ยะลา":101.28,"ร้อยเอ็ด":103.65,
"ระนอง":98.63,"ระยอง":101.28,"ราชบุรี":99.82,"ลพบุรี":100.62,
"ลำปาง":99.50,"ลำพูน":99.00,"เลย":101.73,"ศรีสะเกษ":104.33,
"สกลนคร":104.15,"สงขลา":100.60,"สตูล":100.07,"สมุทรปราการ":100.60,
"สมุทรสงคราม":100.00,"สมุทรสาคร":100.27,"สระแก้ว":102.07,"สระบุรี":100.91,
"สิงห์บุรี":100.40,"สุโขทัย":99.82,"สุพรรณบุรี":100.12,"สุราษฎร์ธานี":99.33,
"สุรินทร์":103.49,"หนองคาย":102.74,"หนองบัวลำภู":102.43,"อ่างทอง":100.45,
"อุดรธานี":102.79,"อุทัยธานี":100.03,"อุตรดิตถ์":100.09,"อุบลราชธานี":104.85,"อำนาจเจริญ":104.63
};
const Z_NAMES=["เมษ","พฤษภ","มิถุน","กรกฎ","สิงห์","กันย์","ตุลย์","พิจิก","ธนู","มกร","กุมภ์","มีน"];
const H_SHORT=["ตนุ","กดุมพ","สหัช","พันธุ","ปุตต","อริ","ปัตนิ","มรณ","ศุภ","กัมม","ลาภ","วินาศ"];
const ST=["ล","๑","๒","๓","๔","๕","๖","๗","๘","๙","๐"];
const R_NAMES=["ทลิทโท","มหัทธโณ","โจโร","ภูมิปาโล","เทศาตรี","เทวี","เพชฌฆาต","ราชา","สมโณ"];
const NK_NAMES=["อัศวินี","ภรณี","กฤตติกา","โรหิณี","มฤคศิระ","อารทรา","ปุนรวสุ","ปุษยะ","อสิเลษะ",
"มาฆะ","บุรพผลคุนี","อุตรผลคุนี","หัสตะ","จิตรา","สวาติ","วิสาขะ","อนุราธะ","เชษฐะ",
"มูละ","บุรพาษาฒ","อุตราษาฒ","ศรวณะ","ธนิษฐะ","ศตภิษก","บุรพภัทรบท","อุตรภัทรบท","เรวดี"];
const KASET_MAP={0:3,1:6,2:4,3:2,4:1,5:4,6:6,7:3,8:5,9:7,10:8,11:5};
const EXALT_MAP={1:0,2:1,3:9,4:5,5:3,6:11,7:6,8:7};
const MAHACHAK_MAP={1:6,2:0,3:5,4:4,5:7,6:8,7:1,8:9};
const RACHA_MAP={1:2,2:5,3:1,4:4,5:0,6:3,7:7,8:6};
const MEAN_SPEEDS={1:59,2:790,3:31,4:59,5:5,6:59,7:2,8:3};
const HOUSE_SCORE={1:4,4:3,7:3,10:3,5:2,9:2,11:2,2:1,3:1,6:-2,8:-3,12:-3};
const STD_SCORE={"เกษตร":4,"มหาอุจ":5,"ประ":-3,"นิจ":-5};
const UNTO=[0,5,9,12,17,23,30,37,43,48,51,55,60];
const Y_SUN=[0,35,67,94,116,129,134,134,134];
const Y_MON=[0,77,148,209,256,286,296,296,296];
const Y_OTH=[0,244,427,488,488,488];
const WEEKDAYS_TH=["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"];
const NAKSATRA_THAI=["ชวด","ฉลู","ขาล","เถาะ","มะโรง","มะเส็ง","มะเมีย","มะแม","วอก","ระกา","จอ","กุน"];
const NAKSATRA_OFFSET=5;

// ── State ─────────────────────────────────────────────────
let _era='BE';
let _natal=null;   // {name,gender,pos,vel,d,m,y_be,t,prov,lng}
let _natal2=null;  // outer ring chart (state 5)
let _transit=null; // {name,gender,pos,vel,d,m,y_be,t,prov,lng}
let _viewMode=0;   // 0=ดวงที่1, 1=ดวงที่2
// V2.1: 5-state 0=ราศี 1=ภพ 2=จรทั้งหมด 3=จรช้า 4=ไม่แสดง
let _outerState=0;
let _chartTypeState=0; // 0=ราศี 1=ตรียางค์ 2=นวางค์
let _reportTransitShow=false; // V2.1 toggle transit section in report
let _activeTab=1;
let _calc1Done=false,_calc2Done=false;
let _customLng1=null,_customLng2=null,_customLngT=null;
let _transitDate=null;
let _donateAmount=50;
let _donateInitialized=false;
let _confirmCallback=null;
let _deferredInstallPrompt=null; // V2.1 PWA install
let _swRefreshing=false; // V2.1.5 prevent double reload on SW update
// V2.1.9
let _soundEnabled=false;
let _audioCtx=null;
let _memSort='recent'; // 'recent' | 'asc' | 'desc'
let _evtSort='recent';
let _numpadPrevValue='';
let _numpadInvalidCount=0;
let _toastTimer=null;
let _memLongPressTimer=null;
let _evtLongPressTimer=null;

// ── Tab switching ─────────────────────────────────────────
function switchTab(n){
  _activeTab=n;
  const wrap=document.getElementById('chart-wrap');
  if(n===0){
    document.getElementById('preview-panel').appendChild(wrap);
  }else if(n===1){
    const ph=document.getElementById('canvas-placeholder');
    if(ph)ph.style.display='none';
    document.getElementById('canvas-slot').appendChild(wrap);
  }else if(n===2){
    // About tab — lazy init donate QR on first visit
    if(!_donateInitialized){_updateDonateQR(_donateAmount);_donateInitialized=true;}
  }
  // V2.1.9: hide H1 logo when About active
  document.body.classList.toggle('about-active',n===2);
  document.querySelectorAll('.tab-content').forEach((el,i)=>el.classList.toggle('hidden',i!==n));
  document.querySelectorAll('.tab-btn').forEach((el,i)=>el.classList.toggle('tab-active',i===n));
}

// ── Era toggle ────────────────────────────────────────────
function _applyEraStyle(){
  const isBE=(_era==='BE');
  const btn=document.getElementById('btn-era');
  btn.style.background=isBE?'#1a6b3c':'#5b3fa0';
  btn.textContent=isBE?'พ.ศ.':'ค.ศ.';
  const yBg=isBE?'#e6f4ec':'#ede8f7';
  ['y1','y2'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.background=yBg;});
}
function toggleEra(){
  const y1El=document.getElementById('y1'),y2El=document.getElementById('y2');
  let v1=parseInt(y1El.value)||2509,v2=parseInt(y2El.value)||2569;
  if(_era==='BE'){_era='CE';y1El.value=v1-543;y2El.value=v2-543;}
  else{_era='BE';y1El.value=v1+543;y2El.value=v2+543;}
  _applyEraStyle();
}

// ── Input colors ──────────────────────────────────────────
function _applyInputColors(section,state){
  const bg=state==='done'?'#fffde7':'#f0f0f0';
  const ids=section==='1'?['d1','m1','t1','prov1']:['d2','m2','t2','prov2'];
  ids.forEach(id=>{const el=document.getElementById(id);if(el)el.style.background=bg;});
  const nameId=section==='1'?'name-1':'name-2';
  const nameEl=document.getElementById(nameId);if(nameEl)nameEl.style.background=bg;
  _applyEraStyle();
}

// ── Reset to today ─────────────────────────────────────────
function _nowStr(){
  const now=new Date();
  return{
    d:String(now.getDate()),
    m:String(now.getMonth()+1),
    y:String(_era==='BE'?now.getFullYear()+543:now.getFullYear()),
    t:String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0')
  };
}
function resetChart1(){
  const n=_nowStr();
  _setField('d1',n.d);_setField('m1',n.m);_setField('y1',n.y);_setField('t1',n.t);
  _customLng1=null;
  _applyInputColors('1','init');
}
function resetChart2(){
  const n=_nowStr();
  _setField('d2',n.d);_setField('m2',n.m);_setField('y2',n.y);_setField('t2',n.t);
  _customLng2=null;
  _applyInputColors('2','init');
}
function resetTransit(){
  const n=_nowStr();
  _setField('dt',n.d);_setField('mt',n.m);_setField('yt',n.y);_setField('tt',n.t);
  _customLngT=null;
}

// ── V2.1.9: Sound (Web Audio beep) ────────────────────────
const SOUND_KEY='horatad_sound_v1';
function _initSound(){
  const stored=localStorage.getItem(SOUND_KEY);
  _soundEnabled=stored==='1';
  const cb=document.getElementById('sound-toggle');
  if(cb)cb.checked=_soundEnabled;
}
function toggleSound(on){
  _soundEnabled=!!on;
  try{localStorage.setItem(SOUND_KEY,_soundEnabled?'1':'0');}catch{}
  if(_soundEnabled)_playBeep(800);
}
function _playBeep(freq){
  if(!_soundEnabled)return;
  try{
    if(!_audioCtx)_audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    if(_audioCtx.state==='suspended')_audioCtx.resume();
    const ac=_audioCtx;
    const osc=ac.createOscillator();
    const gain=ac.createGain();
    osc.type='sine';
    osc.frequency.value=freq||700;
    gain.gain.setValueAtTime(0.08,ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001,ac.currentTime+0.04);
    osc.connect(gain);gain.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime+0.05);
  }catch{}
}

// ── V2.1.9: Toast ─────────────────────────────────────────
function _showToast(msg,warn){
  const t=document.getElementById('toast');
  if(!t)return;
  t.textContent=msg;
  t.classList.toggle('toast-warn',!!warn);
  t.classList.add('toast-show');
  if(_toastTimer)clearTimeout(_toastTimer);
  _toastTimer=setTimeout(()=>t.classList.remove('toast-show'),2200);
}

// logo preload
const _logoImg=new Image();
_logoImg.src='horatad_500x500.png';

// ── Engine (unchanged logic) ──────────────────────────────
function tr(x,r){return((x%r)+r)%r}
function get_j(d,m,y){
  let yt,mt;if(m>=3){yt=y;mt=m-3}else{yt=y-1;mt=m+9}
  return 365*yt+d+Math.trunc(30.6*mt+0.5)+Math.trunc(yt/4)-Math.trunc(yt/100)+Math.trunc(yt/400)+2;
}
function get_pk(a){
  a=tr(a,21600);
  if(a<5400)return[a,5400-a,-1,1];if(a<10800)return[10800-a,a-5400,-1,-1];
  if(a<16200)return[a-10800,16200-a,1,-1];return[21600-a,a-16200,1,1];
}
function get_s(star,ravi,klp){
  klp=parseFloat(klp);let my_o,a;
  if(star===3){my_o=tr(Math.trunc(klp/2+klp*16/505+5420),21600);a=my_o-7620}
  else if(star===4){my_o=tr(Math.trunc(klp*7/46+klp*4+10642),21600);a=ravi-13200}
  else if(star===5){my_o=tr(Math.trunc(klp/12+klp/1032+14297),21600);a=my_o-10320}
  else if(star===6){my_o=tr(Math.trunc(klp*5/3-klp*10/243+10944),21600);a=ravi-4800}
  else if(star===7){my_o=tr(Math.trunc(klp/30+klp*6/10000+11944),21600);a=my_o-14820}
  else if(star===10){my_o=tr(Math.trunc(klp/84+klp/7224+16277),21600);a=my_o-7440}
  else return 0;
  a=tr(a,21600);let[p,k,sp_s,sk_s]=get_pk(a);
  let u_p=Math.trunc(p/1800);
  let mon_p=Math.trunc(((p/1800-u_p)*(Y_OTH[u_p+1]-Y_OTH[u_p])+Y_OTH[u_p])*60);
  let u_k=Math.trunc(k/1800);
  let mon_k=Math.trunc((k/1800-u_k)*(Y_OTH[u_k+1]-Y_OTH[u_k])+Y_OTH[u_k]);
  let mon_sd,mon_pyt;
  if(star===3){mon_sd=2700+sk_s*Math.trunc(mon_k/2);mon_pyt=Math.trunc(mon_sd*4/15)}
  else if(star===4){mon_sd=6000+sk_s*Math.trunc(mon_k/2);mon_pyt=1260}
  else if(star===5){mon_sd=5520+sk_s*Math.trunc(mon_k/2);mon_pyt=Math.trunc(mon_sd*3/7)}
  else if(star===6){mon_sd=19200+sk_s*Math.trunc(mon_k/2);mon_pyt=660}
  else if(star===7){mon_sd=3780+sk_s*Math.trunc(mon_k/2);mon_pyt=Math.trunc(mon_sd*7/6)}
  else{mon_sd=38640+sk_s*Math.trunc(mon_k/2);mon_pyt=Math.trunc(mon_sd*21/49)}
  let r=Math.trunc(mon_p*60/mon_sd),isMyO=[3,5,7,10].includes(star);
  let mon_sp=(isMyO?my_o:ravi)+r*sp_s,a_f=tr(mon_sp-(isMyO?ravi:my_o),21600);
  let[pf,,spf,skf]=get_pk(a_f),u_pf=Math.trunc(pf/1800);
  let sing_p=Math.trunc(((pf/1800-u_pf)*(Y_OTH[u_pf+1]-Y_OTH[u_pf])+Y_OTH[u_pf])*60);
  let[,kf2]=get_pk(a_f),u_kf=Math.trunc(kf2/1800);
  let sing_k=Math.trunc((kf2/1800-u_kf)*(Y_OTH[u_kf+1]-Y_OTH[u_kf])+Y_OTH[u_kf]);
  let pol_h=Math.trunc(sing_p/60/3+sing_k*skf+mon_pyt);
  return tr(mon_sp+Math.trunc(sing_p*60/pol_h)*spf,21600);
}
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
function get_data(d,m,y,hr,mn,lng){return _core(d,m,y,hr-(105-lng)*4/60,mn);}

// ── Pre-2484 BE→CE conversion helper ─────────────────────
// ก่อน พ.ศ.2484 ปีไทยเริ่ม 1 เม.ย. → ม.ค.-มี.ค. ต้องบวก 1 ปี
function _beToce(y_be,m){
  return(y_be<=2483&&m<=3)?y_be-542:y_be-543;
}

// ── Gateway ───────────────────────────────────────────────
function getHouse(pos,i,ascSign){return(Math.trunc(pos[i]/1800)-ascSign+12)%12+1;}
function getMotion(vel,i){
  if(i===0||i>=8)return"";let v=vel[i],mean=MEAN_SPEEDS[i]||0;
  if(v>15000)return"พ";if(v<mean*0.8)return"ม";if(v>mean*1.2)return"ส";return"";
}
function getStandards(pos,i){
  if(i===0)return"";let s=Math.trunc(pos[i]/1800),res=[],ex=EXALT_MAP[i];
  if(KASET_MAP[s]===i)res.push("เกษตร");
  if(ex!==undefined&&ex===s)res.push("มหาอุจ");
  if(ex!==undefined&&(ex+1)%12===s)res.push("อุจจาวิลาส");
  if(ex!==undefined&&((ex-1+12)%12)===s)res.push("อุจจาภิมุข");
  if(KASET_MAP[(s+6)%12]===i)res.push("ประ");
  if(ex!==undefined&&(ex+6)%12===s)res.push("นิจ");
  let mc=MAHACHAK_MAP[i];if(mc!==undefined&&mc===s)res.push("มหาจักร");
  if(mc!==undefined&&(mc+6)%12===s)res.push("จุลจักร");
  let rc=RACHA_MAP[i];if(rc!==undefined&&rc===s)res.push("ราชาโชค");
  if(rc!==undefined&&(rc+6)%12===s)res.push("เทวีโชค");
  return res.join("/");
}
function getStrength(pos,vel,i,ascSign){
  if(i===0)return[0,"-"];let score=0,std=getStandards(pos,i);
  for(let k of Object.keys(STD_SCORE))if(std.includes(k))score+=STD_SCORE[k];
  score+=(HOUSE_SCORE[getHouse(pos,i,ascSign)]||0);
  if(getMotion(vel,i)==="พ")score-=2;
  let label=score>=6?"แข็งแกร่งมาก ⭐⭐⭐":score>=3?"แข็งแกร่ง ⭐⭐":score>=0?"ปานกลาง ⭐":score>=-3?"อ่อนแอ ⚠️":"อ่อนแอมาก ❌";
  return[score,label];
}
function analyzePairs(pos){
  const PD={'มิตร':[[1,5],[2,4],[3,6],[7,8]],'สมพล':[[1,6],[2,8],[3,5],[4,7]],'ธาตุ':[[1,7],[2,5],[3,8],[4,6]],'ศัตรู':[[1,6],[2,5],[3,8],[4,7]]};
  let groups={};
  for(let i=1;i<=10;i++){let z=Math.trunc(pos[i]/1800);if(!groups[z])groups[z]=[];groups[z].push(i);}
  let found=[];
  for(let stars of Object.values(groups)){
    if(stars.length<2)continue;
    for(let a=0;a<stars.length;a++)for(let b=a+1;b<stars.length;b++){
      let p1=stars[a],p2=stars[b],matched=null;
      for(let type of['มิตร','สมพล','ธาตุ','ศัตรู'])
        if(PD[type].some(([x,y])=>(x===p1&&y===p2)||(x===p2&&y===p1))){matched=type;break;}
      if(matched)found.push('['+matched+' '+ST[p1]+ST[p2]+']');
    }
  }
  return found.length?found.join(' '):'ไม่พบ';
}
function getIdentity(pos){
  let asc=Math.trunc(pos[0]/1800),tl=KASET_MAP[asc];
  let tls=Math.trunc(pos[tl]/1800),da=(tls-asc+12)%12+1,htl=KASET_MAP[tls];
  let db=(Math.trunc(pos[htl]/1800)-tls+12)%12+1,ts=(da*db)%7;
  return[tl,ts===0?7:ts];
}

// ── Lunar helpers ─────────────────────────────────────────
function toThaiNum(n){
  return String(n).replace(/[0-9]/g,d=>'๐๑๒๓๔๕๖๗๘๙'[d]);
}
function getWeekdayTH(d,m,y_ce){return WEEKDAYS_TH[new Date(y_ce,m-1,d).getDay()];}
function getTithi(pos){
  const raw=(pos[2]-pos[1]+21600)%21600,t=Math.floor(raw/720)+1;
  return t<=15?{side:'ขึ้น',day:t}:{side:'แรม',day:t-15};
}
function getLunarMonthNum(pos){return(Math.floor(pos[1]/1800)+4)%12+1;}
function getNaksatraYear(y_be){return NAKSATRA_THAI[(y_be+NAKSATRA_OFFSET)%12];}
function buildLunarInfo(d,m,y_be,y_ce,pos){
  const ti=getTithi(pos);
  return`วัน${getWeekdayTH(d,m,y_ce)} ${ti.side} ${toThaiNum(ti.day)} ค่ำเดือน ${toThaiNum(getLunarMonthNum(pos))} ปี${getNaksatraYear(y_be)}`;
}

// ── HTML escape (V2.1 XSS protection) ─────────────────────
function _escHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ── Report ────────────────────────────────────────────────
function aspectNarrativeShort(pos,targetIdx){
  let s_t=Math.trunc(pos[targetIdx]/1800);
  let g={"กุม":[],"เล็ง":[],"โยค":[],"โกณ":[]};
  for(let i=0;i<11;i++){
    if(i===targetIdx)continue;
    let d=(Math.trunc(pos[i]/1800)-s_t+12)%12;
    if(d===0)g["กุม"].push(ST[i]);else if(d===6)g["เล็ง"].push(ST[i]);
    else if(d===2||d===10)g["โยค"].push(ST[i]);else if(d===4||d===8)g["โกณ"].push(ST[i]);
  }
  let res=[];for(let[k,v]of Object.entries(g))if(v.length)res.push('['+k+' '+v.join('')+']');
  return res.length?res.join(' '):'—';
}
function aspectTransit(tpos,ns){
  let g={"กุม":[],"เล็ง":[],"โยค":[],"โกณ":[]};
  for(let i=1;i<=10;i++){
    let d=(Math.trunc(tpos[i]/1800)-ns+12)%12;
    if(d===0)g["กุม"].push(String(i===10?0:i));else if(d===6)g["เล็ง"].push(String(i===10?0:i));
    else if(d===2||d===10)g["โยค"].push(String(i===10?0:i));else if(d===4||d===8)g["โกณ"].push(String(i===10?0:i));
  }
  let res=[];for(let[k,v]of Object.entries(g))if(v.length)res.push('['+k+' '+v.join('')+']');
  return res.length?res.join(' '):'—';
}

// [12][15] buildReport: no [ดวงที่N] label; transit for both views; ดาวจรสัมพันธ์ ณ
function buildReport(name,gender,d,m,y_be,t,prov,pos,vel,tpos,isView2){
  const asc=Math.trunc(pos[0]/1800),y_ce=_beToce(y_be,m);
  const[tl_id,ts_id]=getIdentity(pos);
  const SEP='<tr><td colspan="7" style="padding:0"><hr style="border:none;border-top:0.5px solid #bbb;margin:3px 0"></td></tr>';
  const CL='style="color:#888;font-size:0.9em;white-space:nowrap;vertical-align:top;padding-right:8px"';
  let h='<table style="width:auto;margin:0;border-collapse:collapse;line-height:1.3;border-spacing:0">';
  h+=SEP;
  // [12] removed [ดวงที่N] label
  h+=`<tr><td colspan="7" style="padding:2px 0;color:#555;font-size:0.95em">${_escHtml(gender)} ${_escHtml(name)}  ${d}/${m}/${y_be} (${y_ce})  ${t}  ${_escHtml(prov)}</td></tr>`;
  h+=`<tr><td colspan="7" style="padding:1px 0 2px;color:#8b949e;font-size:0.85em">${buildLunarInfo(d,m,y_be,y_ce,pos)}</td></tr>`;
  h+=SEP;
  h+=`<tr style="color:#888;font-size:0.9em"><td style="padding:0 3px 0 0">ดาว</td><td style="padding:0 6px 0 0">ราศี</td><td style="padding:0 5px 0 0">องศา</td><td style="padding:0 4px 0 0"> </td><td style="padding:0 4px 0 0">ฤกษ์หลัก</td><td style="padding:0 4px 0 0">ฤกษ์ย่อย</td><td>มาตรฐาน</td></tr>`;
  for(let i=0;i<11;i++){
    let p=pos[i],sign=Z_NAMES[Math.trunc(p/1800)];
    let dg=Math.trunc((p%1800)/60),mn2=p%60,mo=getMotion(vel,i),nk=Math.trunc(p/800)%27;
    let std=getStandards(pos,i);
    let sh=std?`<span style="color:#b8860b">${std.split('/').join('  ')}</span>`:'';
    let mh=mo?`<span style="color:#f85149">${mo}</span>`:'';
    h+=`<tr><td style="font-weight:500;padding:0 3px 0 0;white-space:nowrap">${ST[i]}</td><td style="padding:0 6px 0 0;white-space:nowrap">${sign}</td><td style="font-variant-numeric:tabular-nums;white-space:nowrap;padding:0 4px 0 0">${String(dg).padStart(2,'0')}°${String(mn2).padStart(2,'0')}'</td><td style="padding:0 4px 0 0;white-space:nowrap">${mh}</td><td style="padding:0 4px 0 0;white-space:nowrap">${R_NAMES[nk%9]}</td><td style="padding:0 4px 0 0;white-space:nowrap">${NK_NAMES[nk]}</td><td style="padding:0;white-space:nowrap">${sh}</td></tr>`;
  }
  h+=SEP+'</table>';
  const av=Math.trunc(pos[0]/1800),tv=Math.trunc(pos[tl_id]/1800),sv=Math.trunc(pos[ts_id]/1800);
  let h2='<table style="width:100%;margin:2px 0 0;border-collapse:collapse;line-height:1.3;font-size:inherit;border-spacing:0">';
  h2+=`<tr><td ${CL}>ลัคนา ${Z_NAMES[av]}</td><td>${aspectNarrativeShort(pos,0)}</td></tr>`;
  h2+=`<tr><td ${CL}>ตนุลัคน์ ${ST[tl_id]}</td><td>${aspectNarrativeShort(pos,tl_id)}</td></tr>`;
  h2+=`<tr><td ${CL}>ตนุเศษ ${ST[ts_id]}</td><td>${aspectNarrativeShort(pos,ts_id)}</td></tr>`;
  h2+=`<tr><td ${CL}>ดาวคู่</td><td>${analyzePairs(pos)}</td></tr>`;
  // V2.1.8: aspect บรรทัด "ดาวจรสัมพันธ์ ณ" แสดงเสมอเมื่อมี tpos
  if(tpos&&tpos!==pos){
    const td2=_transitDate||_transit;
    const td_str=td2?`${td2.d}/${td2.m}/${td2.y_be}(${_beToce(td2.y_be,td2.m)})  ${td2.t}`:'—';
    // [15] "ดาวจรสัมพันธ์ ณ"
    h2+=`<tr><td colspan="2" style="color:#888;font-size:0.85em;padding-top:4px">ดาวจรสัมพันธ์ ณ ${td_str}</td></tr>`;
    h2+=`<tr><td ${CL}>ลัคนา ${Z_NAMES[av]}</td><td>${aspectTransit(tpos,av)}</td></tr>`;
    h2+=`<tr><td ${CL}>ตนุลัคน์ ${ST[tl_id]}</td><td>${aspectTransit(tpos,tv)}</td></tr>`;
    h2+=`<tr><td ${CL}>ตนุเศษ ${ST[ts_id]}</td><td>${aspectTransit(tpos,sv)}</td></tr>`;
  }
  let total=0;for(let i=1;i<=8;i++)total+=getStrength(pos,vel,i,asc)[0];
  let ov=total>=15?'ดวงชะตาแข็งแกร่งโดยรวม 🌟':total>=5?'ดวงชะตาระดับปานกลาง ⭐':total>=-5?'ดวงชะตาที่ต้องระวัง ⚠️':'ดวงชะตาที่อ่อนแอ ❌';
  let tc=total>=5?'#2ea043':total>=-5?'#b8860b':'#f85149';
  h2+=`<tr><td colspan="2"><hr style="border:none;border-top:0.5px solid #bbb;margin:3px 0"></td></tr>`;
  h2+=`<tr><td ${CL}>คะแนนรวม</td><td style="color:${tc};font-weight:500">${(total>=0?'+':'')+total}  ${ov}</td></tr>`;
  return h+h2+'</table>';
}

// ── Renderer ──────────────────────────────────────────────
const LINE_COLOR='#b8860b';
const Z_REFS=[90,120,150,180,210,240,270,300,330,0,30,60];
const OFFSETS={90:[0,-4],120:[-28,-60],150:[-54,-42],180:[0,14],210:[-56,20],240:[-30,22],270:[0,-16],300:[28,22],330:[58,18],0:[0,14],30:[54,-38],60:[26,-56]};
const Z_SPECS={90:[2,2,2,2],120:[3,3,2],150:[2,3,3],180:[4,4,0],210:[3,3,2],240:[2,3,3],270:[2,2,2,2],300:[2,3,3],330:[3,3,2],0:[4,4,0],30:[2,3,3],60:[3,3,2]};
const C=500,R=450,G=87,NATAL_GAP=50.9;
const OUTER_R_LABEL=468;
const OUTER_R_TRANSIT=480;
const NATAL_COLOR_ASC='#ffd966',NATAL_COLOR_STAR='#ffffff',TRANSIT_RED='#f85149';
const TRANSIT_SLOW=[10,8,7,5,3],TRANSIT_FAST=[9,6,4,2,1];
const TRANSIT_LABEL={1:'1',2:'2',3:'3',4:'4',5:'5',6:'6',7:'7',8:'8',9:'9',10:'0'};
// V2.2: 6-state 0=ราศี 1=ภพ 2=จรทั้งหมด 3=จรช้า 4=ไม่แสดง 5=ดาววงนอก
const OUTER_LABELS=['ชื่อราศี','ชื่อภพเรือน','แสดงดาวจร','ดาวจรช้า','ไม่แสดง','ดาววงนอก'];
const REPORT_TRANSIT_LABELS=['ดวงเดิม','ดาวจร'];
const CHART_TYPE_LABELS=['ราศี','ตรียางค์','นวางค์'];
const VIEW_LABELS=['ดวงที่ 1','ดวงที่ 2'];
// [9] ดวงที่ 2 bg: purple matching btn-calc-2
const BG_V1='#0d1117', BG_V2='#160b28';
const OUTER_LABEL_V1='#c9d1d9';

function deg2rad(d){return d*Math.PI/180}

// [2] FIX toggle bug: guard _viewMode=1 when no transit data
function toggleView(){
  const newMode=(_viewMode+1)%2;
  if(newMode===1&&!_transit)return; // ดวงที่ 2 not yet calculated
  _viewMode=newMode;
  document.getElementById('btn-view').textContent=VIEW_LABELS[_viewMode];
  _playBeep(700);
  _redraw();
  _updateShareButton();
}
function toggleOuter(){
  _outerState=(_outerState+1)%6;
  if(_outerState===5&&!_natal2&&_natal)_natal2={..._natal};
  document.getElementById('btn-outer').textContent=OUTER_LABELS[_outerState];
  _playBeep(700);
  _redraw();
}
function toggleChartType(){
  _chartTypeState=(_chartTypeState+1)%3;
  document.getElementById('btn-chart-type').textContent=CHART_TYPE_LABELS[_chartTypeState];
  _playBeep(700);
  _redraw();
}
// V2.1: toggle transit section visibility in report (replaces toggleTransit)
// V2.1.9: auto-recalc transit on toggle ON so lunar info matches latest inputs
function toggleReportTransit(){
  _reportTransitShow=!_reportTransitShow;
  const btn=document.getElementById('btn-transit');
  if(btn){
    btn.textContent=REPORT_TRANSIT_LABELS[_reportTransitShow?1:0];
    btn.classList.toggle('btn-active',_reportTransitShow);
  }
  _playBeep(700);
  if(_reportTransitShow){
    calculateTransit();
  }else{
    _redraw();
  }
}

// V2.1.9: cycle memory items into current viewMode slot
// dir: -1=prev, +1=next
function cycleMemory(dir){
  const mem=_loadJSON(MEM_KEY)||[];
  if(!mem.length){_showToast('ยังไม่มีดวงในความทรงจำ');return;}
  // _outerState===5: cycle outer ring (_natal2) ไม่แตะ _natal
  if(_outerState===5){
    const curKey=_natal2?`${_natal2.name}|${_natal2.d}/${_natal2.m}/${_natal2.y_be}`:'';
    const key=m=>`${m.name}|${m.d}/${m.m}/${m.y_be}`;
    let idx=mem.findIndex(m=>key(m)===curKey);
    if(idx===-1)idx=dir>0?-1:mem.length;
    const next=(idx+dir+mem.length*2)%mem.length;
    const m=mem[next];
    const y_be=m.y_be||0;
    const lng=(typeof m.lng==='number')?m.lng:(PROVINCES[m.prov||'']||100.50);
    const y_ce=_beToce(y_be,m.m);
    const[hr,mn2]=(m.t||'00:00').split(':').map(Number);
    const pos=get_data(m.d,m.m,y_ce,hr,mn2,lng);
    _natal2={name:m.name,gender:m.gender||'ชาย',pos,vel:[],d:m.d,m:m.m,y_be,t:m.t,prov:m.prov||'กรุงเทพมหานคร'};
    _playBeep(700);
    _showToast(`วงนอก ${next+1}/${mem.length} · ${m.name||'—'}`);
    _redraw();
    return;
  }
  const slot=_viewMode===1?'2':'1';
  const curName=_viewMode===1?(_transit?.name||''):(_natal?.name||'');
  const curDmy=_viewMode===1
    ?(_transit?`${_transit.d}/${_transit.m}/${_transit.y_be}`:'')
    :(_natal?`${_natal.d}/${_natal.m}/${_natal.y_be}`:'');
  const key=m=>`${m.name}|${m.d}/${m.m}/${m.y_be}`;
  const curKey=`${curName}|${curDmy}`;
  let idx=mem.findIndex(m=>key(m)===curKey);
  if(idx===-1)idx=dir>0?-1:mem.length;
  const next=(idx+dir+mem.length*2)%mem.length;
  const m=mem[next];
  const y_use=_era==='BE'?m.y_be:m.y_be-543;
  if(slot==='1'){
    _setField('name-1',m.name||'');
    const g=document.getElementById('gender1');if(g)g.value=m.gender||'ชาย';
    _setField('d1',m.d);_setField('m1',m.m);_setField('y1',y_use);_setField('t1',m.t);
    document.getElementById('prov1').value=m.prov||'กรุงเทพมหานคร';
    _customLng1=(typeof m.lng==='number')?m.lng:null;
    _updateLngUI('1');
    calculateChart1();
  }else{
    _setField('name-2',m.name||'');
    const g=document.getElementById('gender2');if(g)g.value=m.gender||'ชาย';
    _setField('d2',m.d);_setField('m2',m.m);_setField('y2',y_use);_setField('t2',m.t);
    document.getElementById('prov2').value=m.prov||'กรุงเทพมหานคร';
    _customLng2=(typeof m.lng==='number')?m.lng:null;
    _updateLngUI('2');
    calculateChart2();
  }
  _playBeep(700);
  _showToast(`${next+1}/${mem.length} · ${m.name||'—'}`);
  _saveState();
}

function _redraw(){
  const isV2=_viewMode===1;
  const active=isV2?_transit:_natal;
  if(!active)return;
  const{pos,vel,d,m,y_be,t,prov,gender='ชาย'}=active;
  const displayName=isV2?(_transit?.name||'ดวงที่ 2'):(_natal?.name||'ไม่ระบุ');
  // identity from active chart
  const[,ts_id]=getIdentity(pos);
  // transit source: _transitDate (วันที่จร) takes priority over _transit (ดวงที่2)
  const transitSrc=_transitDate||_transit||null;
  const tposForOuter=isV2?(_natal?.pos||null):(transitSrc?.pos||null);
  drawChart(pos,vel,ts_id,tposForOuter,pos,isV2);
  // V2.1.8: _reportTransitShow=true → render transit table แทน natal table
  if(_reportTransitShow&&_transitDate&&_transitDate.vel){
    const td=_transitDate;
    document.getElementById('report').innerHTML=buildReport(
      'ดาวจร','',td.d,td.m,td.y_be,td.t,td.prov,td.pos,td.vel,null,isV2
    );
  }else{
    document.getElementById('report').innerHTML=buildReport(
      displayName,gender,d,m,y_be,t,prov,pos,vel,transitSrc?.pos,isV2
    );
  }
}

// Varga
function calcNavamsa(pos){return pos.map(p=>{let s=Math.trunc(p/1800),sl=Math.trunc((p%1800)/200),r=p%200;return((s*9+sl)%12*1800+Math.trunc(r*9))%21600;});}
function calcDrekkana(pos){return pos.map(p=>{let s=Math.trunc(p/1800),sl=Math.trunc((p%1800)/600),r=p%600;return((s+sl*4)%12*1800+Math.trunc(r*3))%21600;});}

// [6][7][9][10][11] drawChart: name+date on canvas; LINE_COLOR for zodiac/house; 44px transit; purple bg
function drawChart(pos,vel,ts_id,tpos,natalPos,isV2){
  const cv=document.getElementById('chart-canvas');
  const ctx=cv.getContext('2d');
  ctx.clearRect(0,0,1000,1000);
  // bg
  ctx.fillStyle=BG_V1;
  ctx.fillRect(0,0,1000,1000);
  // structure
  ctx.strokeStyle=LINE_COLOR;ctx.lineWidth=5;
  ctx.beginPath();ctx.arc(C,C,R,0,2*Math.PI);ctx.stroke();
  for(let dx of[-G,G]){
    let dy=Math.sqrt(Math.max(0,R*R-dx*dx));
    ctx.beginPath();ctx.moveTo(C+dx,C-dy);ctx.lineTo(C+dx,C+dy);ctx.stroke();
    ctx.beginPath();ctx.moveTo(C-dy,C+dx);ctx.lineTo(C+dy,C+dx);ctx.stroke();
  }
  let de=Math.round(R/Math.sqrt(2));
  for(let[sx,sy]of[[-1,1],[1,1],[-1,-1],[1,-1]]){
    ctx.beginPath();ctx.moveTo(C+sx*G,C+sy*G);ctx.lineTo(C+sx*de,C+sy*de);ctx.stroke();
  }
  // effective positions
  let ePos=_chartTypeState===1?calcDrekkana(pos):_chartTypeState===2?calcNavamsa(pos):pos;
  let eTpos=tpos?(_chartTypeState===1?calcDrekkana(tpos):_chartTypeState===2?calcNavamsa(tpos):tpos):null;
  const eAscSign=Math.trunc((natalPos||pos)[0]/1800);
  // star colors
  function sc(i){if(i===0)return NATAL_COLOR_ASC;return NATAL_COLOR_STAR;}
  // build model
  let model=Array.from({length:12},()=>[]);
  for(let i=0;i<11;i++){let z=Math.trunc(ePos[i]/1800);if(z>=0&&z<12)model[z].push({ch:ST[i],col:sc(i),idx:i});}
  // draw stars
  ctx.font='bold 72px Sarabun,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  const cW=62;
  for(let iz=0;iz<12;iz++){
    let items=model[iz];if(!items.length)continue;
    let ang=Z_REFS[iz],spec=Z_SPECS[ang]||[3,3,2],rad=deg2rad(ang);
    let dist=ang%90===0?Math.round(((G+R)/2)*1.02):Math.round(((G*1.414+R)/2)*1.02);
    let[ox,oy]=OFFSETS[ang]||[0,0];
    let tx=C+Math.round(dist*Math.cos(rad))+ox,ty=C-Math.round(dist*Math.sin(rad))+oy;
    let gap=Math.round(NATAL_GAP),rows=[],yo=[];
    if(spec.length===4){rows=[items.slice(0,spec[0]),items.slice(spec[0],spec[0]+spec[1]),items.slice(spec[0]+spec[1],spec[0]+spec[1]+spec[2]),items.slice(spec[0]+spec[1]+spec[2])];yo=[-1.5*gap,-0.5*gap,0.5*gap,1.5*gap];}
    else{rows=[items.slice(0,spec[0]),items.slice(spec[0],spec[0]+spec[1]),items.slice(spec[0]+spec[1])];yo=[-gap,0,gap];}
    for(let ri=0;ri<rows.length;ri++){
      if(!rows[ri].length)continue;
      let ri_items=rows[ri],sx2=tx-(ri_items.length-1)*cW/2;
      for(let ci=0;ci<ri_items.length;ci++){ctx.fillStyle=ri_items[ci].col;ctx.fillText(ri_items[ci].ch,sx2+ci*cW,ty+yo[ri]);}
    }
  }
  // X mark ts_id
  if(ts_id!=null){
    let tsign=Math.trunc(ePos[ts_id]/1800),ang=Z_REFS[tsign],spec=Z_SPECS[ang]||[3,3,2];
    let rad=deg2rad(ang),dist=ang%90===0?Math.round(((G+R)/2)*1.02):Math.round(((G*1.414+R)/2)*1.02);
    let[ox,oy]=OFFSETS[ang]||[0,0];
    let tx=C+Math.round(dist*Math.cos(rad))+ox,ty=C-Math.round(dist*Math.sin(rad))+oy;
    let items=model[tsign],idx=items.findIndex(it=>it.idx===ts_id);
    let gap=Math.round(NATAL_GAP),rows=[],yo=[];
    if(spec.length===4){rows=[items.slice(0,spec[0]),items.slice(spec[0],spec[0]+spec[1]),items.slice(spec[0]+spec[1],spec[0]+spec[1]+spec[2]),items.slice(spec[0]+spec[1]+spec[2])];yo=[-1.5*gap,-0.5*gap,0.5*gap,1.5*gap];}
    else{rows=[items.slice(0,spec[0]),items.slice(spec[0],spec[0]+spec[1]),items.slice(spec[0]+spec[1])];yo=[-gap,0,gap];}
    let sx2=tx,sy2=ty,counted=0;
    for(let ri=0;ri<rows.length;ri++){let ri_i=rows[ri],sx3=tx-(ri_i.length-1)*cW/2;for(let ci=0;ci<ri_i.length;ci++){if(counted===idx){sx2=sx3+ci*cW;sy2=ty+yo[ri];}counted++;}}
    ctx.font='bold 44px sans-serif';ctx.fillStyle=NATAL_COLOR_ASC;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('x',sx2,sy2+36);
  }
  // center label (sun degree)
  ctx.textAlign='center';ctx.textBaseline='middle';
  if(_chartTypeState===0){
    let sg=Math.trunc((ePos[1]%1800)/60),sm=ePos[1]%60;
    ctx.font='bold 40px Sarabun,sans-serif';ctx.fillStyle='#b8860b';
    ctx.fillText(String(sg).padStart(2,'0')+'°'+String(sm).padStart(2,'0')+"'",C,C);
  }else{
    ctx.font='bold 44px Sarabun,sans-serif';ctx.fillStyle='#b8860b';
    ctx.fillText(_chartTypeState===1?'ตรียางค์':'นวางค์',C,C);
  }
  // outer ring — V2.1 5-state
  ctx.textAlign='center';ctx.textBaseline='middle';
  const outerLabelColor=OUTER_LABEL_V1;
  if(_outerState===0){
    ctx.font='bold 30px Sarabun,sans-serif';ctx.fillStyle=outerLabelColor;
    for(let iz=0;iz<12;iz++){let rad=deg2rad(Z_REFS[iz]);ctx.fillText(Z_NAMES[iz],C+OUTER_R_LABEL*Math.cos(rad),C-OUTER_R_LABEL*Math.sin(rad));}
  }else if(_outerState===1){
    ctx.font='bold 30px Sarabun,sans-serif';ctx.fillStyle=outerLabelColor;
    for(let iz=0;iz<12;iz++){
      let hIdx=(iz-eAscSign+12)%12,rad=deg2rad(Z_REFS[iz]);
      ctx.fillText(H_SHORT[hIdx],C+OUTER_R_LABEL*Math.cos(rad),C-OUTER_R_LABEL*Math.sin(rad));
    }
  }else if((_outerState===2||_outerState===3)&&eTpos){
    // 2=จรทั้งหมด 3=จรช้า
    let showIdx=_outerState===3?TRANSIT_SLOW:[...TRANSIT_SLOW,...TRANSIT_FAST];
    let tGroups=Array.from({length:12},()=>[]);
    for(let i of showIdx){let z=Math.trunc(eTpos[i]/1800);if(z>=0&&z<12)tGroups[z].push({lbl:TRANSIT_LABEL[i]||String(i),deg:eTpos[i]%1800});}
    ctx.font='bold 44px sans-serif';
    const SLOT_GAP=38;
    for(let iz=0;iz<12;iz++){
      let its=tGroups[iz];if(!its.length)continue;
      its.sort((a,b)=>a.deg-b.deg);
      let rad=deg2rad(Z_REFS[iz]);
      let cx0=C+OUTER_R_TRANSIT*Math.cos(rad),cy0=C-OUTER_R_TRANSIT*Math.sin(rad);
      let pr=rad+Math.PI/2,px=Math.cos(pr),py=-Math.sin(pr);
      for(let k=0;k<its.length;k++){
        let off=(k-(its.length-1)/2)*SLOT_GAP;
        ctx.fillStyle=TRANSIT_RED;ctx.fillText(its[k].lbl,cx0+px*off,cy0+py*off);
      }
    }
  }
  // _outerState===4: ไม่แสดง (nothing)
  // _outerState===5: ดาววงนอก — _natal2.pos, เลขไทย, สีม่วง
  if(_outerState===5&&_natal2&&_natal2.pos){
    const THAI_NUM=['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙','๑๐'];
    const n2pos=_chartTypeState===1?calcDrekkana(_natal2.pos):_chartTypeState===2?calcNavamsa(_natal2.pos):_natal2.pos;
    const showIdx=[...TRANSIT_SLOW,...TRANSIT_FAST];
    let groups=Array.from({length:12},()=>[]);
    for(let i of showIdx){let z=Math.trunc(n2pos[i]/1800);if(z>=0&&z<12)groups[z].push({lbl:THAI_NUM[i]||String(i),deg:n2pos[i]%1800});}
    ctx.font='bold 44px Sarabun,sans-serif';
    const SLOT_GAP=38;
    for(let iz=0;iz<12;iz++){
      let its=groups[iz];if(!its.length)continue;
      its.sort((a,b)=>a.deg-b.deg);
      let rad=deg2rad(Z_REFS[iz]);
      let cx0=C+OUTER_R_TRANSIT*Math.cos(rad),cy0=C-OUTER_R_TRANSIT*Math.sin(rad);
      let pr=rad+Math.PI/2,px=Math.cos(pr),py=-Math.sin(pr);
      for(let k=0;k<its.length;k++){
        let off=(k-(its.length-1)/2)*SLOT_GAP;
        ctx.fillStyle='#5b3fa0';ctx.fillText(its[k].lbl,cx0+px*off,cy0+py*off);
      }
    }
  }
  // logo top-right on canvas (size 160, margin 0, circular clip, alpha 1.0 + brightness)
  if(_logoImg.complete&&_logoImg.naturalWidth>0){
    const ls=160;
    const lx=1000-ls;
    const ly=0;
    ctx.save();
    ctx.beginPath();
    ctx.arc(lx+ls/2,ly+ls/2,ls/2,0,Math.PI*2);
    ctx.clip();
    ctx.filter='brightness(1.25) saturate(1.15)';
    ctx.drawImage(_logoImg,lx,ly,ls,ls);
    ctx.filter='none';
    ctx.restore();
  }
} // end drawChart ──────────────────────────────────────────────
function sanitizeInt(val,min,max,def){let n=parseInt(val);return(isNaN(n)||n<min||n>max)?def:Math.min(max,Math.max(min,n));}
function sanitizeTime(val){
  if(!val||typeof val!=='string')return[6,30];
  let p=val.trim().split(':');if(p.length<2)return[6,30];
  let hr=parseInt(p[0]),mn=parseInt(p[1]);
  if(isNaN(hr))hr=6;if(isNaN(mn))mn=0;
  return[Math.min(23,Math.max(0,hr)),Math.min(59,Math.max(0,mn))];
}
function _setField(id,val){const el=document.getElementById(id);if(el)el.value=val;}

// ── Calculate ─────────────────────────────────────────────
function calculateChart1(){
  const name=document.getElementById('name-1').value||'ไม่ระบุ';
  const gender=document.getElementById('gender1').value||'ชาย';
  let d=sanitizeInt(document.getElementById('d1').value,1,31,1);
  let m=sanitizeInt(document.getElementById('m1').value,1,12,1);
  let y=sanitizeInt(document.getElementById('y1').value,1,9999,_era==='BE'?2509:1966);
  let[hr,mn]=sanitizeTime(document.getElementById('t1').value);
  _setField('d1',d);_setField('m1',m);_setField('y1',y);
  _setField('t1',String(hr).padStart(2,'0')+':'+String(mn).padStart(2,'0'));
  const provVal=document.getElementById('prov1').value||'กรุงเทพมหานคร';
  const lng=_customLng1!==null?_customLng1:(PROVINCES[provVal]||100.50);
  const y_ce=_era==='BE'?_beToce(y,m):y,y_be=_era==='BE'?y:y+543;
  const pos=get_data(d,m,y_ce,hr,mn,lng);
  const pos2=get_data(d,m,y_ce,hr+24,mn,lng);
  const vel=pos2.map((v,i)=>((v-pos[i])+21600)%21600);
  const t=String(hr).padStart(2,'0')+':'+String(mn).padStart(2,'0');
  _natal={name,gender,pos,vel,d,m,y_be,t,prov:provVal};
  _calc1Done=true;
  _updateShareButton();
  _applyInputColors('1','done');
  _viewMode=0;document.getElementById('btn-view').textContent=VIEW_LABELS[0];
  switchTab(1);_redraw();
}

function calculateChart2(){
  const name=document.getElementById('name-2').value||'ดวงที่ 2';
  const gender=document.getElementById('gender2').value||'ชาย';
  let d=sanitizeInt(document.getElementById('d2').value,1,31,1);
  let m=sanitizeInt(document.getElementById('m2').value,1,12,1);
  let y=sanitizeInt(document.getElementById('y2').value,1,9999,_era==='BE'?2569:2026);
  let[hr,mn]=sanitizeTime(document.getElementById('t2').value);
  _setField('d2',d);_setField('m2',m);_setField('y2',y);
  _setField('t2',String(hr).padStart(2,'0')+':'+String(mn).padStart(2,'0'));
  const provVal=document.getElementById('prov2').value||'กรุงเทพมหานคร';
  const lng=_customLng2!==null?_customLng2:(PROVINCES[provVal]||100.50);
  const y_ce=_era==='BE'?_beToce(y,m):y,y_be=_era==='BE'?y:y+543;
  const pos=get_data(d,m,y_ce,hr,mn,lng);
  const pos2=get_data(d,m,y_ce,hr+24,mn,lng);
  const vel=pos2.map((v,i)=>((v-pos[i])+21600)%21600);
  const t=String(hr).padStart(2,'0')+':'+String(mn).padStart(2,'0');
  _transit={name,gender,pos,vel,d,m,y_be,t,prov:provVal};
  _calc2Done=true;
  _updateShareButton();
  _applyInputColors('2','done');
  _viewMode=1;document.getElementById('btn-view').textContent=VIEW_LABELS[1];
  switchTab(1);_redraw();
}

function calculateTransit(){
  let d=sanitizeInt(document.getElementById('dt').value,1,31,1);
  let m=sanitizeInt(document.getElementById('mt').value,1,12,1);
  let y=sanitizeInt(document.getElementById('yt').value,1,9999,_era==='BE'?2569:2026);
  let[hr,mn]=sanitizeTime(document.getElementById('tt').value);
  _setField('dt',d);_setField('mt',m);_setField('yt',y);
  _setField('tt',String(hr).padStart(2,'0')+':'+String(mn).padStart(2,'0'));
  const provVal=document.getElementById('provt').value||'กรุงเทพมหานคร';
  const lng=_customLngT!==null?_customLngT:(PROVINCES[provVal]||100.50);
  const y_ce=_era==='BE'?_beToce(y,m):y,y_be=_era==='BE'?y:y+543;
  const pos=get_data(d,m,y_ce,hr,mn,lng);
  const pos2=get_data(d,m,y_ce,hr+24,mn,lng);
  const vel=pos2.map((v,i)=>((v-pos[i])+21600)%21600);
  const t=String(hr).padStart(2,'0')+':'+String(mn).padStart(2,'0');
  _transitDate={pos,vel,d,m,y_be,t,prov:provVal};
  switchTab(1);_redraw();
}
let _numpadField=null,_numpadBuf='';
const _NUMPAD_CFG={
  'd1':{type:'int',min:1,max:31,def:1,label:'วัน (1-31)'},
  'm1':{type:'int',min:1,max:12,def:1,label:'เดือน (1-12)'},
  'y1':{type:'int',min:1,max:9999,def:2509,label:'ปี ดวงที่ 1'},
  'd2':{type:'int',min:1,max:31,def:1,label:'วัน (1-31)'},
  'm2':{type:'int',min:1,max:12,def:1,label:'เดือน (1-12)'},
  'y2':{type:'int',min:1,max:9999,def:2569,label:'ปี ดวงที่ 2'},
  'dt':{type:'int',min:1,max:31,def:1,label:'วัน (1-31)'},
  'mt':{type:'int',min:1,max:12,def:1,label:'เดือน (1-12)'},
  'yt':{type:'int',min:1,max:9999,def:2569,label:'ปีวันจร'},
};
// ── Longitude toggle UI ───────────────────────────────────
function _updateLngUI(chartNum){
  const custom=chartNum==='1'?_customLng1:chartNum==='2'?_customLng2:_customLngT;
  const provId=chartNum==='t'?'provt':'prov'+chartNum;
  const btnId='btn-cust'+chartNum;
  const provEl=document.getElementById(provId),btnEl=document.getElementById(btnId);
  if(!provEl||!btnEl)return;
  if(custom!==null){
    provEl.style.display='none';
    btnEl.textContent=custom.toFixed(2)+'°';
    btnEl.style.background='#1a6b3c';btnEl.style.minWidth='72px';
  }else{
    provEl.style.display='';
    btnEl.textContent='สถานที่อื่น';
    btnEl.style.background='';btnEl.style.minWidth='';
  }
}
// ── Smart calculate ────────────────────────────────────────
// ── Unified calculate (calc 1+2) ──────────────────────────
// JS is single-thread → browser paints only after function returns → no flash.
// calc 2 first then 1 so final _viewMode=0 (ดวง 1).
function calculateBoth(){
  _playBeep(900);
  calculateChart2();
  calculateChart1();
  // V1.8: persist + history
  _saveState();
  if(_natal){const r=_addMemory({name:_natal.name,gender:_natal.gender,d:_natal.d,m:_natal.m,y_be:_natal.y_be,t:_natal.t,prov:_natal.prov,lng:_customLng1});if(r==='updated')_showToast(`อัปเดตดวง ${_natal.name} แล้ว`);else if(r==='saved')_showToast(`บันทึกดวง ${_natal.name} แล้ว`);}
  if(_transit){const r=_addMemory({name:_transit.name,gender:_transit.gender,d:_transit.d,m:_transit.m,y_be:_transit.y_be,t:_transit.t,prov:_transit.prov,lng:_customLng2});if(r==='updated')_showToast(`อัปเดตดวง ${_transit.name} แล้ว`);else if(r==='saved')_showToast(`บันทึกดวง ${_transit.name} แล้ว`);}
  _renderQuickMemory();
}
// ── Share as Image (V2.0) ─────────────────────────────────────────────
// V2.1.9: split into saveChart() = direct download, shareChart() = Web Share API
function _updateShareButton(){
  const hasData=(_viewMode===1&&_transit)||(_viewMode===0&&_natal);
  const btnS=document.getElementById('btn-share');
  const btnSv=document.getElementById('btn-save');
  if(btnS)btnS.disabled=!hasData;
  if(btnSv)btnSv.disabled=!hasData;
}

function _buildShareFilename(active){
  const now=new Date();
  const ts=now.getFullYear()+
    String(now.getMonth()+1).padStart(2,'0')+
    String(now.getDate()).padStart(2,'0')+'_'+
    String(now.getHours()).padStart(2,'0')+
    String(now.getMinutes()).padStart(2,'0')+
    String(now.getSeconds()).padStart(2,'0');
  return `horatad_${ts}.png`;
}

async function saveChart(){
  const active=_viewMode===1?_transit:_natal;
  if(!active)return;
  _playBeep(700);
  const blob=await _generateShareImage(active);
  if(!blob){_showToast('ไม่สามารถสร้างรูปได้',true);return;}
  const filename=_buildShareFilename(active);
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  _showToast('บันทึกรูปแล้ว');
}

async function shareChart(){
  const active=_viewMode===1?_transit:_natal;
  if(!active)return;
  _playBeep(700);
  const blob=await _generateShareImage(active);
  if(!blob){_showToast('ไม่สามารถสร้างรูปได้',true);return;}
  const filename=_buildShareFilename(active);
  const file=new File([blob],filename,{type:'image/png'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    try{
      await navigator.share({files:[file],title:'ดวงชะตา Horatad',text:`${active.name} ${active.d}/${active.m}/${active.y_be}`});
      return;
    }catch(e){
      if(e.name==='AbortError')return;
      // fall through to download fallback
    }
  }
  // Fallback: download
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=filename;
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  _showToast('เบราว์เซอร์ไม่รองรับแชร์ — บันทึกไฟล์แทน');
}

async function _generateShareImage(active){
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  const SZ=1080;
  const c=document.createElement('canvas');
  c.width=SZ;c.height=SZ;
  const ctx=c.getContext('2d');
  ctx.fillStyle=BG_V1;
  ctx.fillRect(0,0,SZ,SZ);
  const chart=document.getElementById('chart-canvas');
  const chartSize=780;
  const chartX=(SZ-chartSize)/2;
  ctx.drawImage(chart,chartX,40,chartSize,chartSize);
  ctx.fillStyle='#ffffff';
  ctx.font='bold 32px Sarabun,sans-serif';
  ctx.textAlign='center';ctx.textBaseline='top';
  ctx.fillText(`${active.gender} ${active.name}`,SZ/2,845);
  ctx.fillStyle='#8b949e';
  ctx.font='400 22px Sarabun,sans-serif';
  const y_ce=_beToce(active.y_be,active.m);
  ctx.fillText(`${active.d}/${active.m}/${active.y_be} (${y_ce}) ${active.t} ${active.prov}`,SZ/2,888);
  const asc=Math.trunc(active.pos[0]/1800);
  let total=0;
  for(let i=1;i<=8;i++)total+=getStrength(active.pos,active.vel,i,asc)[0];
  const scoreColor=total>=5?'#2ea043':total>=-5?'#b8860b':'#f85149';
  const scoreLabel=total>=15?'ดวงชะตาแข็งแกร่งโดยรวม 🌟':total>=5?'ดวงชะตาระดับปานกลาง ⭐':total>=-5?'ดวงชะตาที่ต้องระวัง ⚠️':'ดวงชะตาที่อ่อนแอ ❌';
  ctx.fillStyle=scoreColor;
  ctx.font='bold 88px Sarabun,sans-serif';
  ctx.fillText((total>=0?'+':'')+total,SZ/2,940);
  ctx.fillStyle='#c9d1d9';
  ctx.font='500 28px Sarabun,sans-serif';
  ctx.fillText(scoreLabel,SZ/2,1050);
  return new Promise(resolve=>c.toBlob(resolve,'image/png',0.95));
}

// ── [6] Longitude numpad toggle ───────────────────────────
function openLngPad(fieldId){
  const chartNum=fieldId==='lng1'?'1':fieldId==='lng2'?'2':'t';
  const custom=chartNum==='1'?_customLng1:chartNum==='2'?_customLng2:_customLngT;
  if(custom!==null){
    if(chartNum==='1')_customLng1=null;
    else if(chartNum==='2')_customLng2=null;
    else _customLngT=null;
    _updateLngUI(chartNum);return;
  }
  _numpadField={id:fieldId};
  _numpadBuf='';
  _numpadPrevValue=(custom!==null)?String(custom):'';
  _numpadInvalidCount=0;
  const label=chartNum==='t'?'จร':chartNum;
  document.getElementById('numpad-label').textContent=`ลองติจูด ดวงที่ ${label}  (เช่น 10050 = 100.50°)`;
  document.getElementById('numpad-display').textContent='—';
  document.getElementById('numpad').classList.remove('hidden');
  document.getElementById('numpad-backdrop').classList.remove('hidden');
}
function _numpadOpen(id){
  _numpadField=document.getElementById(id);if(!_numpadField)return;
  const cfg=_NUMPAD_CFG[id]||{type:'int',min:1,max:9999,def:1,label:id};
  _numpadBuf='';
  // V2.1.9: remember current value for revert on 3 invalid strikes
  _numpadPrevValue=_numpadField.value||'';
  _numpadInvalidCount=0;
  document.getElementById('numpad-label').textContent=cfg.label||id;
  document.getElementById('numpad-display').textContent='—';
  document.getElementById('numpad').classList.remove('hidden');
  document.getElementById('numpad-backdrop').classList.remove('hidden');
  _updatePre2484Warning();
}
function _numpadKey(k){
  const id=_numpadField?(_numpadField.id||''):'';
  const isLng=(id==='lng1'||id==='lng2'||id==='lngt');
  const cfg=isLng?{type:'lng'}:(_NUMPAD_CFG[id]||{type:'int',min:1,max:9999,def:1});
  const mx=isLng?5:(cfg.type==='time'?4:String(cfg.max||9999).length);
  if(k==='ล้าง'){_numpadBuf='';_playBeep(550);}
  else if(k==='✓'){_playBeep(900);_numpadConfirm();return;}
  else{if(_numpadBuf.length<mx){_numpadBuf+=k;_playBeep(700);}}
  let disp=_numpadBuf||'—';
  if(isLng){
    // [V1.9] left-to-right display "_ _ _ . _ _" matches user mental model
    if(_numpadBuf.length===0){
      disp='_ _ _ . _ _';
    }else{
      let s=_numpadBuf;
      let intPart=s.slice(0,3).padEnd(3,'_').split('').join(' ');
      let decPart=s.slice(3,5).padEnd(2,'_').split('').join(' ');
      disp=intPart+' . '+decPart;
    }
  }else if(cfg.type==='time'&&_numpadBuf.length>=3){
    disp=_numpadBuf.slice(0,2)+':'+_numpadBuf.slice(2);
  }
  document.getElementById('numpad-display').textContent=disp;
  _updatePre2484Warning();
}
// V2.1.9: validate buffer on confirm; revert to prev value after 3 invalid attempts
function _numpadConfirm(){
  if(_numpadField&&_numpadBuf){
    const id=_numpadField.id||'';
    const isLng=(id==='lng1'||id==='lng2'||id==='lngt');
    let invalid=false;
    if(isLng){
      let s=_numpadBuf.padEnd(5,'0');
      let intPart=parseInt(s.slice(0,3))||0;
      let decPart=parseInt(s.slice(3,5))||0;
      let lng=intPart+decPart/100;
      if(lng>=0&&lng<=180){
        if(id==='lng1')_customLng1=lng;
        else if(id==='lng2')_customLng2=lng;
        else _customLngT=lng;
        const cn=id==='lng1'?'1':id==='lng2'?'2':'t';
        _updateLngUI(cn);
      }else{
        invalid=true;
      }
    }else{
      const cfg=_NUMPAD_CFG[id]||{type:'int',min:1,max:9999,def:1};
      // [V1.9] year smart prefix: BE="25"+2 digits, CE="20"+2 digits
      let buf=_numpadBuf;
      if((id==='y1'||id==='y2'||id==='yt')&&buf.length===2){
        buf=(_era==='BE'?'25':'20')+buf;
      }
      let n=parseInt(buf);
      if(isNaN(n)||n<cfg.min||n>cfg.max){
        invalid=true;
      }else{
        _setField(id,String(n));
      }
    }
    if(invalid){
      _numpadInvalidCount++;
      _playBeep(380);
      if(_numpadInvalidCount>=3){
        // Revert to last valid value
        if(isLng){
          // clear custom lng (revert to province)
          if(id==='lng1')_customLng1=null;
          else if(id==='lng2')_customLng2=null;
          else _customLngT=null;
          const cn=id==='lng1'?'1':id==='lng2'?'2':'t';
          _updateLngUI(cn);
          _showToast(`ผิด 3 ครั้ง — ใช้ลองติจูดจังหวัด`,true);
        }else{
          _setField(id,_numpadPrevValue);
          _showToast(`ผิด 3 ครั้ง — ใช้ค่าเดิม: ${_numpadPrevValue||'—'}`,true);
        }
      }else{
        // Allow another attempt — don't close numpad
        _showToast(`ค่าไม่ถูกต้อง (${_numpadInvalidCount}/3)`,true);
        _numpadBuf='';
        const dispEl=document.getElementById('numpad-display');
        if(dispEl)dispEl.textContent=isLng?'_ _ _ . _ _':'—';
        return; // KEEP numpad open
      }
    }
  }
  _numpadBuf='';
  document.getElementById('numpad').classList.add('hidden');
  document.getElementById('numpad-backdrop').classList.add('hidden');
  const warn=document.getElementById('numpad-warning');
  if(warn)warn.classList.add('hidden');
  _numpadField=null;
}

// ── localStorage persistence ──────────────────────────────
const STATE_KEY='horatad_state_v1';
const MEM_KEY='horatad_memory_v1';
const MEM_MAX=200;
const EVENT_KEY='horatad_events_v1';
const EVENT_MAX=20;
const PROMPTPAY_ID='3102001951829';
const PROMPTPAY_NAME='นายสิทธิเดช ประเสริฐรุ่งเรือง';

function _loadJSON(k){try{return JSON.parse(localStorage.getItem(k));}catch{return null;}}
function _saveJSON(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}

function _saveState(){
  const g=id=>document.getElementById(id)?.value;
  _saveJSON(STATE_KEY,{
    era:_era,
    c1:{name:g('name-1'),gender:g('gender1'),d:g('d1'),m:g('m1'),y:g('y1'),t:g('t1'),prov:g('prov1'),lng:_customLng1},
    c2:{name:g('name-2'),gender:g('gender2'),d:g('d2'),m:g('m2'),y:g('y2'),t:g('t2'),prov:g('prov2'),lng:_customLng2}
  });
}
function _applyState(s){
  if(!s||typeof s!=='object')return false;
  _era=s.era==='CE'?'CE':'BE';
  const set=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v;};
  if(s.c1){set('name-1',s.c1.name);set('gender1',s.c1.gender);set('d1',s.c1.d);set('m1',s.c1.m);set('y1',s.c1.y);set('t1',s.c1.t);set('prov1',s.c1.prov);_customLng1=(typeof s.c1.lng==='number')?s.c1.lng:null;}
  if(s.c2){set('name-2',s.c2.name);set('gender2',s.c2.gender);set('d2',s.c2.d);set('m2',s.c2.m);set('y2',s.c2.y);set('t2',s.c2.t);set('prov2',s.c2.prov);_customLng2=(typeof s.c2.lng==='number')?s.c2.lng:null;}
  return true;
}

function _addMemory(entry){
  if(!entry||!entry.name)return null;
  const skip=['ดวงที่ 2','ไม่ระบุ',''];
  if(skip.includes(entry.name.trim()))return null;
  let mem=_loadJSON(MEM_KEY)||[];
  const key=m=>`${m.name}|${m.d}/${m.m}/${m.y_be}|${m.t}|${m.prov}`;
  const k=key(entry);
  const isDup=mem.some(m=>key(m)===k);
  mem=mem.filter(m=>key(m)!==k);
  mem.unshift({...entry,savedAt:Date.now()});
  _saveJSON(MEM_KEY,mem.slice(0,MEM_MAX));
  return isDup?'updated':'saved';
}

// ── Memory popup ──────────────────────────────────────────
let _memSection='1';
let _memCache=[];

// V2.1.9: sort memory by current mode
const _MEM_SORT_LABELS={'recent':'🕐 ล่าสุด','asc':'ก-ฮ','desc':'ฮ-ก'};
function cycleMemorySort(){
  _memSort=_memSort==='recent'?'asc':_memSort==='asc'?'desc':'recent';
  const btn=document.getElementById('memory-sort-btn');
  if(btn)btn.textContent=_MEM_SORT_LABELS[_memSort];
  _playBeep(700);
  _renderMemory(document.getElementById('memory-search')?.value||'');
}
function _sortByMode(arr,mode){
  if(mode==='recent')return arr.slice().sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));
  if(mode==='asc')return arr.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||'','th'));
  if(mode==='desc')return arr.slice().sort((a,b)=>(b.name||'').localeCompare(a.name||'','th'));
  return arr;
}

function _renderMemory(filter){
  const raw=_loadJSON(MEM_KEY)||[];
  _memCache=_sortByMode(raw,_memSort);
  const list=document.getElementById('memory-list');
  const f=(filter||'').trim().toLowerCase();
  const items=[];
  _memCache.forEach((m,i)=>{
    if(!f||(m.name||'').toLowerCase().includes(f)||(m.prov||'').toLowerCase().includes(f)){
      const y_ce=_beToce(m.y_be,m.m);
      items.push(`<div class="memory-item" data-i="${i}"><div>${_escHtml(m.gender||'')} ${_escHtml(m.name||'')}</div><div class="meta">${m.d}/${m.m}/${m.y_be} (${y_ce})  ${m.t}  ${_escHtml(m.prov||'')}</div><button class="memory-del" data-i="${i}" title="ลบ">×</button></div>`);
    }
  });
  if(items.length===0){
    list.innerHTML=`<div class="memory-empty">${f?'ไม่พบรายการ':'ยังไม่มีรายการในความทรงจำ'}</div>`;
  }else{
    list.innerHTML=items.join('');
  }
}

function openMemory(section){
  _memSection=section;
  document.querySelector('.memory-title').textContent=`เลือกสำหรับ ดวง ${section}`;
  const s=document.getElementById('memory-search');
  if(s)s.value='';
  _renderMemory('');
  document.getElementById('memory-backdrop').classList.remove('hidden');
  document.getElementById('memory-modal').classList.remove('hidden');
  if(s)setTimeout(()=>s.focus(),100);
}
function closeMemory(){
  document.getElementById('memory-backdrop').classList.add('hidden');
  document.getElementById('memory-modal').classList.add('hidden');
  const s=document.getElementById('memory-search');
  if(s)s.value='';
}
function _pickMemory(i){
  const m=_memCache[i];if(!m)return;
  const y_use=_era==='BE'?m.y_be:m.y_be-543;
  const section=_memSection;
  if(section==='1'){
    _setField('name-1',m.name||'');
    document.getElementById('gender1').value=m.gender||'ชาย';
    _setField('d1',m.d);_setField('m1',m.m);_setField('y1',y_use);_setField('t1',m.t);
    document.getElementById('prov1').value=m.prov||'กรุงเทพมหานคร';
    _customLng1=(typeof m.lng==='number')?m.lng:null;
    _updateLngUI('1');_applyInputColors('1','init');
  }else{
    _setField('name-2',m.name||'');
    document.getElementById('gender2').value=m.gender||'ชาย';
    _setField('d2',m.d);_setField('m2',m.m);_setField('y2',y_use);_setField('t2',m.t);
    document.getElementById('prov2').value=m.prov||'กรุงเทพมหานคร';
    _customLng2=(typeof m.lng==='number')?m.lng:null;
    _updateLngUI('2');_applyInputColors('2','init');
  }
  closeMemory();
}
function _confirmDeleteMemory(i){
  const m=_memCache[i];if(!m)return;
  _showConfirm('ลบรายการ',`ลบ "${m.name}" จากความทรงจำ?`,()=>{
    // V2.1.9: key-based delete (safe after sort)
    const key=v=>`${v.name}|${v.d}/${v.m}/${v.y_be}|${v.t}|${v.prov}`;
    const mk=key(m);
    const mem=(_loadJSON(MEM_KEY)||[]).filter(v=>key(v)!==mk);
    _saveJSON(MEM_KEY,mem);
    _renderMemory(document.getElementById('memory-search')?.value||'');
  });
}
function confirmClearMemory(){
  _showConfirm('ล้างความทรงจำทั้งหมด','ลบทุกรายการ? ไม่สามารถกู้คืนได้',()=>{
    _saveJSON(MEM_KEY,[]);
    _renderMemory('');
  });
}
function exportMemory(){
  const mem=_loadJSON(MEM_KEY)||[];
  const data={version:'2.1',exportedAt:Date.now(),memories:mem};
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const ts=new Date().toISOString().slice(0,10);
  a.href=url;a.download=`horatad_memory_${ts}.json`;
  document.body.appendChild(a);a.click();
  document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function importMemory(event){
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      let imported=Array.isArray(data)?data:Array.isArray(data.memories)?data.memories:null;
      if(!imported){alert('รูปแบบไฟล์ไม่ถูกต้อง');return;}
      const valid=imported.filter(m=>m&&m.name&&m.d&&m.m&&m.y_be);
      if(!valid.length){alert('ไม่พบรายการที่ถูกต้องในไฟล์');return;}
      const existing=_loadJSON(MEM_KEY)||[];
      const key=m=>`${m.name}|${m.d}/${m.m}/${m.y_be}|${m.t}|${m.prov}`;
      const map=new Map();
      for(const m of existing)map.set(key(m),m);
      for(const m of valid){const k=key(m);const ex=map.get(k);if(!ex||(m.savedAt||0)>(ex.savedAt||0))map.set(k,m);}
      const merged=[...map.values()].sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)).slice(0,MEM_MAX);
      _saveJSON(MEM_KEY,merged);
      _renderMemory(document.getElementById('memory-search')?.value||'');
      alert(`นำเข้าสำเร็จ ${valid.length} รายการ\nรวมในความทรงจำ ${merged.length} รายการ`);
    }catch(err){console.warn('Memory import failed:',err);alert('ไม่สามารถอ่านไฟล์ได้');}
  };
  reader.readAsText(file);
  event.target.value='';
}

// ── Events (เหตุการณ์จร) ─────────────────────────────────
function _loadEvents(){return _loadJSON(EVENT_KEY)||[];}
function _saveEvents(evs){_saveJSON(EVENT_KEY,evs.slice(0,EVENT_MAX));}

function saveEvent(){
  const name=(document.getElementById('name-event')?.value||'').trim();
  if(!name){alert('กรุณาตั้งชื่อเหตุการณ์ก่อนบันทึก');return;}
  let d=sanitizeInt(document.getElementById('dt').value,1,31,1);
  let m=sanitizeInt(document.getElementById('mt').value,1,12,1);
  let y=sanitizeInt(document.getElementById('yt').value,1,9999,_era==='BE'?2569:2026);
  const[hr,mn]=sanitizeTime(document.getElementById('tt').value);
  const prov=document.getElementById('provt').value||'กรุงเทพมหานคร';
  const y_be=_era==='BE'?y:y+543;
  const t=String(hr).padStart(2,'0')+':'+String(mn).padStart(2,'0');
  const entry={name,d,m,y_be,t,prov,lng:_customLngT,savedAt:Date.now()};
  const key=v=>`${v.name}|${v.d}/${v.m}/${v.y_be}|${v.t}|${v.prov}`;
  const isDup=_loadEvents().some(v=>key(v)===key(entry));
  const _doSave=()=>{
    let updated=_loadEvents().filter(v=>key(v)!==key(entry));
    updated.unshift(entry);
    _saveEvents(updated);
    _showToast(`บันทึกเหตุการณ์ "${name}" แล้ว`);
  };
  if(isDup){
    _showConfirm('บันทึกทับเหตุการณ์',`"${name}" มีอยู่แล้ว ทับข้อมูลเดิม?`,_doSave);
  }else{
    _doSave();
  }
}

let _evtCache=[];

// V2.1.9: event sort
const _EVT_SORT_LABELS={'recent':'🕐 ล่าสุด','asc':'ก-ฮ','desc':'ฮ-ก'};
function cycleEventSort(){
  _evtSort=_evtSort==='recent'?'asc':_evtSort==='asc'?'desc':'recent';
  const btn=document.getElementById('event-sort-btn');
  if(btn)btn.textContent=_EVT_SORT_LABELS[_evtSort];
  _playBeep(700);
  _renderEvents(document.getElementById('event-search')?.value||'');
}

function _renderEvents(filter){
  const raw=_loadEvents();
  _evtCache=_sortByMode(raw,_evtSort);
  const list=document.getElementById('event-list');
  const f=(filter||'').trim().toLowerCase();
  const items=[];
  _evtCache.forEach((ev,i)=>{
    if(!f||(ev.name||'').toLowerCase().includes(f)){
      const y_ce=_beToce(ev.y_be,ev.m);
      items.push(`<div class="memory-item" data-i="${i}"><div>${_escHtml(ev.name||'')}</div><div class="meta">${ev.d}/${ev.m}/${ev.y_be} (${y_ce})  ${ev.t}  ${_escHtml(ev.prov||'')}</div><button class="memory-del" data-i="${i}" title="ลบ">×</button></div>`);
    }
  });
  list.innerHTML=items.length?items.join(''):`<div class="memory-empty">${f?'ไม่พบรายการ':'ยังไม่มีเหตุการณ์ที่บันทึก'}</div>`;
}

function openEvents(){
  const s=document.getElementById('event-search');
  if(s)s.value='';
  _renderEvents('');
  document.getElementById('event-backdrop').classList.remove('hidden');
  document.getElementById('event-modal').classList.remove('hidden');
}
function closeEvents(){
  document.getElementById('event-backdrop').classList.add('hidden');
  document.getElementById('event-modal').classList.add('hidden');
}
function _pickEvent(i){
  // V2.1.9: pick from sorted _evtCache
  const ev=_evtCache[i];if(!ev)return;
  const y_use=_era==='BE'?ev.y_be:ev.y_be-543;
  _setField('dt',ev.d);_setField('mt',ev.m);_setField('yt',y_use);_setField('tt',ev.t);
  if(ev.prov)document.getElementById('provt').value=ev.prov;
  _customLngT=(typeof ev.lng==='number')?ev.lng:null;
  _updateLngUI('t');
  closeEvents();
  calculateTransit();
}
function _deleteEvent(i){
  const ev=_evtCache[i];if(!ev)return;
  // V2.1.9: key-based delete (sort-safe)
  const key=v=>`${v.name}|${v.d}/${v.m}/${v.y_be}|${v.t}|${v.prov}`;
  const mk=key(ev);
  _showConfirm('ลบเหตุการณ์',`ลบ "${ev.name}"?`,()=>{
    const evs=_loadEvents().filter(v=>key(v)!==mk);
    _saveEvents(evs);
    _renderEvents(document.getElementById('event-search')?.value||'');
  });
}

// ── Donate (PromptPay dynamic QR) ────────────────────────
function setDonateAmount(btn,amount){
  document.querySelectorAll('.donate-btn').forEach(b=>b.classList.remove('donate-active'));
  btn.classList.add('donate-active');
  const customRow=document.getElementById('donate-custom-row');
  if(amount===0){
    if(customRow)customRow.classList.remove('hidden');
    setTimeout(()=>document.getElementById('donate-custom-input')?.focus(),50);
    _updateDonateQR(null);
  }else{
    if(customRow)customRow.classList.add('hidden');
    _donateAmount=amount;
    _updateDonateQR(amount);
  }
}
function applyDonateCustom(){
  const input=document.getElementById('donate-custom-input');
  const val=parseInt(input?.value||'');
  if(!val||val<1||val>100000){alert('กรอกจำนวนเงิน 1–100,000 บาท');return;}
  _donateAmount=val;
  _updateDonateQR(val);
}
function _updateDonateQR(amount){
  const img=document.getElementById('donate-qr');
  const fallback=document.getElementById('donate-fallback');
  if(!img)return;
  const url=amount
    ?`https://promptpay.io/${PROMPTPAY_ID}/${amount}.png`
    :`https://promptpay.io/${PROMPTPAY_ID}.png`;
  img.classList.remove('hidden');
  if(fallback)fallback.classList.add('hidden');
  img.onerror=()=>{img.classList.add('hidden');if(fallback)fallback.classList.remove('hidden');};
  img.src=url;
}

// ── Confirm dialog ────────────────────────────────────────
function _showConfirm(title,message,onYes){
  _confirmCallback=onYes;
  const t=document.getElementById('confirm-title');
  const m=document.getElementById('confirm-message');
  if(t)t.textContent=title;
  if(m)m.textContent=message;
  document.getElementById('confirm-backdrop').classList.remove('hidden');
  document.getElementById('confirm-modal').classList.remove('hidden');
}
function closeConfirm(){
  document.getElementById('confirm-backdrop').classList.add('hidden');
  document.getElementById('confirm-modal').classList.add('hidden');
  _confirmCallback=null;
}
function _confirmYes(){
  const cb=_confirmCallback;
  closeConfirm();
  if(typeof cb==='function')cb();
}

// ── Pre-2484 warning (numpad year) ────────────────────────
// V2.1.9: only show when buf is full 4-digit year (avoid flash during partial typing)
function _updatePre2484Warning(){
  const warn=document.getElementById('numpad-warning');
  if(!warn)return;
  if(!_numpadField||_era!=='BE'){warn.classList.add('hidden');return;}
  const id=_numpadField.id||_numpadField||'';
  const fid=typeof id==='string'?id:(id.id||'');
  if(!['y1','y2','yt'].includes(fid)){warn.classList.add('hidden');return;}
  // V2.1.9: require full 4-digit buffer before evaluating
  if(_numpadBuf.length<4){warn.classList.add('hidden');return;}
  const mId=fid==='y1'?'m1':fid==='y2'?'m2':'mt';
  const mVal=parseInt(document.getElementById(mId)?.value||'',10);
  const yVal=parseInt(_numpadBuf||'',10);
  if(yVal>0&&yVal<=2483&&mVal>=1&&mVal<=3){
    warn.textContent='⚠ ก่อน พ.ศ.2484 ปีไทยเริ่ม 1 เม.ย. — ม.ค.–มี.ค. ปีที่แสดงจะเทียบ ค.ศ. ปีถัดไป';
    warn.classList.remove('hidden');
  }else{
    warn.classList.add('hidden');
  }
}

// ── PWA Install ───────────────────────────────────────────
function showContactPage(){
  document.getElementById('about-main').classList.add('hidden');
  document.getElementById('about-contact').classList.remove('hidden');
}
function hideContactPage(){
  document.getElementById('about-contact').classList.add('hidden');
  document.getElementById('about-main').classList.remove('hidden');
}
function _renderQuickMemory(){
  const el=document.getElementById('quick-memory-chips');
  if(!el)return;
  const mem=(_loadJSON(MEM_KEY)||[]).slice().sort((a,b)=>(b.savedAt||0)-(a.savedAt||0)).slice(0,5);
  el.innerHTML=mem.map((m,i)=>`<button class="qm-chip" onclick="_quickLoad(${i})">${_escHtml(m.name||'—')}</button>`).join('');
}
function _quickLoad(i){
  const mem=(_loadJSON(MEM_KEY)||[]).slice().sort((a,b)=>(b.savedAt||0)-(a.savedAt||0));
  const m=mem[i];if(!m)return;
  const y_use=_era==='BE'?m.y_be:m.y_be-543;
  _setField('name-1',m.name);_setField('gender1',m.gender||'');_setField('d1',m.d);_setField('m1',m.m);_setField('y1',y_use);_setField('t1',m.t);
  if(m.prov)document.getElementById('prov1').value=m.prov;
  _customLng1=(typeof m.lng==='number')?m.lng:null;
  _updateLngUI('1');
  calculateBoth();
}
async function installPWA(){
  if(!_deferredInstallPrompt)return;
  _deferredInstallPrompt.prompt();
  const{outcome}=await _deferredInstallPrompt.userChoice;
  if(outcome==='accepted')_deferredInstallPrompt=null;
  const btn=document.getElementById('btn-install-pwa');
  if(btn&&outcome==='accepted')btn.classList.add('hidden');
}

// ── Searchable province dropdown ──────────────────────────
function setupProvDropdown(inputId,listId){
  const input=document.getElementById(inputId);
  const list=document.getElementById(listId);
  if(!input||!list)return;
  function render(filter=''){
    const f=filter.trim().toLowerCase();
    const items=Object.keys(PROVINCES).filter(p=>!f||p.toLowerCase().includes(f));
    if(items.length===0){
      list.innerHTML='<div class="prov-empty">ไม่พบจังหวัด</div>';
      list.classList.add('active');
      return;
    }
    list.innerHTML=items.map(p=>`<div class="prov-item">${p}</div>`).join('');
    list.classList.add('active');
  }
  input.addEventListener('focus',()=>render(input.value));
  input.addEventListener('input',()=>render(input.value));
  list.addEventListener('mousedown',e=>{
    if(e.target.classList.contains('prov-item')){
      input.value=e.target.textContent;
      list.classList.remove('active');
      _playBeep(700);
      e.preventDefault();
    }
  });
  input.addEventListener('blur',()=>setTimeout(()=>list.classList.remove('active'),150));
}

// ── Init ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  setupProvDropdown('prov1','prov-list-1');
  setupProvDropdown('prov2','prov-list-2');
  setupProvDropdown('provt','prov-list-t');

  // V2.1.9: init sound state
  _initSound();

  // memory list click + long-press delete delegation
  const memList=document.getElementById('memory-list');
  memList.addEventListener('click',e=>{
    if(e.target.classList.contains('memory-del')){
      e.stopPropagation();
      _confirmDeleteMemory(parseInt(e.target.dataset.i));
      return;
    }
    const it=e.target.closest('.memory-item');
    if(it)_pickMemory(parseInt(it.dataset.i));
  });
  // Feature 10: long-press on memory-item → delete (mobile)
  memList.addEventListener('touchstart',e=>{
    const it=e.target.closest('.memory-item');
    if(!it||e.target.classList.contains('memory-del'))return;
    _memLongPressTimer=setTimeout(()=>{
      _confirmDeleteMemory(parseInt(it.dataset.i));
    },600);
  },{passive:true});
  memList.addEventListener('touchend',()=>{if(_memLongPressTimer){clearTimeout(_memLongPressTimer);_memLongPressTimer=null;}});
  memList.addEventListener('touchmove',()=>{if(_memLongPressTimer){clearTimeout(_memLongPressTimer);_memLongPressTimer=null;}});

  // memory search
  document.getElementById('memory-search')?.addEventListener('input',e=>{
    _renderMemory(e.target.value);
  });

  // event list click + long-press delete delegation
  const evList=document.getElementById('event-list');
  evList?.addEventListener('click',e=>{
    if(e.target.classList.contains('memory-del')){
      e.stopPropagation();
      _deleteEvent(parseInt(e.target.dataset.i));
      return;
    }
    const it=e.target.closest('.memory-item');
    if(it)_pickEvent(parseInt(it.dataset.i));
  });
  evList?.addEventListener('touchstart',e=>{
    const it=e.target.closest('.memory-item');
    if(!it||e.target.classList.contains('memory-del'))return;
    _evtLongPressTimer=setTimeout(()=>{
      _deleteEvent(parseInt(it.dataset.i));
    },600);
  },{passive:true});
  evList?.addEventListener('touchend',()=>{if(_evtLongPressTimer){clearTimeout(_evtLongPressTimer);_evtLongPressTimer=null;}});
  evList?.addEventListener('touchmove',()=>{if(_evtLongPressTimer){clearTimeout(_evtLongPressTimer);_evtLongPressTimer=null;}});

  // event search
  document.getElementById('event-search')?.addEventListener('input',e=>{
    _renderEvents(e.target.value);
  });

  // donate custom input Enter key
  document.getElementById('donate-custom-input')?.addEventListener('keydown',e=>{
    if(e.key==='Enter')applyDonateCustom();
  });

  // persist state on tab close
  window.addEventListener('beforeunload',_saveState);

  // Esc closes all modals
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      closeMemory();
      closeEvents();
      closeConfirm();
      document.getElementById('numpad').classList.add('hidden');
      document.getElementById('numpad-backdrop').classList.add('hidden');
      const warn=document.getElementById('numpad-warning');
      if(warn)warn.classList.add('hidden');
      _numpadField=null;_numpadBuf='';
    }
  });

  // debounced save on input change
  let _saveTimer=null;
  const _scheduleSave=()=>{if(_saveTimer)clearTimeout(_saveTimer);_saveTimer=setTimeout(_saveState,500);};
  ['name-1','gender1','d1','m1','y1','t1','prov1','name-2','gender2','d2','m2','y2','t2','prov2'].forEach(id=>{
    const el=document.getElementById(id);
    if(el){el.addEventListener('input',_scheduleSave);el.addEventListener('change',_scheduleSave);}
  });

  // attach numpad to numeric inputs only (time fields use native type=time)
  ['d1','m1','y1','d2','m2','y2','dt','mt','yt'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    el.setAttribute('readonly','readonly');el.style.cursor='pointer';
    el.addEventListener('click',()=>_numpadOpen(id));
    el.addEventListener('focus',()=>_numpadOpen(id));
  });

  // V2.1.9: sound on main action buttons (ผูกดวง, ผูกดวงจร, วันนี้, บันทึก)
  ['btn-era'].forEach(id=>{
    const el=document.getElementById(id);
    if(el)el.addEventListener('click',()=>_playBeep(700));
  });

  // mobile: scroll prov field to top on focus
  ['prov1','prov2','provt'].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    el.addEventListener('focus',()=>{
      if(window.matchMedia('(max-width:768px)').matches){
        setTimeout(()=>el.scrollIntoView({block:'start',behavior:'smooth'}),300);
      }
    });
  });

  // init button labels
  document.getElementById('btn-outer').textContent=OUTER_LABELS[_outerState];
  document.getElementById('btn-transit').textContent=REPORT_TRANSIT_LABELS[0];
  document.getElementById('btn-chart-type').textContent=CHART_TYPE_LABELS[_chartTypeState];

  // restore saved state; if none reset to today
  const restored=_applyState(_loadJSON(STATE_KEY));
  if(!restored){resetChart1();resetChart2();}
  resetTransit();
  _applyEraStyle();
  switchTab(1);
  calculateChart1();calculateChart2();calculateTransit();
  _viewMode=0;
  document.getElementById('btn-view').textContent=VIEW_LABELS[0];
  _redraw();
  _updateShareButton();
  _renderQuickMemory();

  // PWA service worker register + auto-reload เมื่อ SW ใหม่ activate (V2.1.5)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
      if(_swRefreshing)return;
      _swRefreshing=true;
      location.reload();
    });
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(()=>{});
    });
  }
  // PWA install prompt
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    _deferredInstallPrompt=e;
    const btn=document.getElementById('btn-install-pwa');
    if(btn)btn.classList.remove('hidden');
  });
  window.addEventListener('appinstalled',()=>{
    _deferredInstallPrompt=null;
    const btn=document.getElementById('btn-install-pwa');
    if(btn)btn.classList.add('hidden');
  });
  // Offline banner
  const _offlineBanner=document.getElementById('offline-banner');
  const _setOffline=()=>{if(_offlineBanner)_offlineBanner.classList.remove('hidden');};
  const _setOnline=()=>{if(_offlineBanner)_offlineBanner.classList.add('hidden');};
  window.addEventListener('offline',_setOffline);
  window.addEventListener('online',_setOnline);
  if(!navigator.onLine)_setOffline();
});
