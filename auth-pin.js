// HORATAD:AUTH-PIN:3.3.19
// PIN flow ที่ unlock V3 tab — แยกออกจาก index.html เพื่อให้ CSP `script-src 'self'` block inline ได้
// Reviewed in docs/cia/horatad_auth_audit_2026-05-23.md (T-06)
// NOTE: ปัจจุบัน gate เป็น CSS class manipulation เท่านั้น — server-side authz ต้องอยู่ที่ horatad-ai Worker
//       ดู GUARD handoff: cross-link incoming → HORATAD intent decision

var _v3Code='';

function _v3DevPopup(){
  _v3Code='';
  _v3UpdateDisplay();
  document.getElementById('v3-dev-overlay').style.display='flex';
}
function _v3DevClose(){
  document.getElementById('v3-dev-overlay').style.display='none';
  _v3Code='';
  _v3UpdateDisplay();
}
function _v3UpdateDisplay(){
  const d=document.getElementById('v3-dev-display');
  if(d)d.textContent=_v3Code?'●'.repeat(_v3Code.length):' ';
}
function _v3NumPress(n){
  if(_v3Code.length>=6)return;
  _v3Code+=n;
  _v3UpdateDisplay();
  if(_v3Code.length===6){
    const code=_v3Code;
    setTimeout(function(){
      fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:code})})
        .then(function(r){return r.ok;})
        .catch(function(){return false;})
        .then(function(ok){
          if(ok){
            _v3DevClose();
            var btn=document.getElementById('tab-btn-3');
            if(btn)btn.classList.remove('hidden');
            if(typeof switchTab==='function')switchTab(3);
          }
          _v3Code='';
          _v3UpdateDisplay();
        });
    },150);
  }
}
function _v3NumBack(){
  _v3Code=_v3Code.slice(0,-1);
  _v3UpdateDisplay();
}
// V2.2.36: exit prediction tab — ซ่อนปุ่ม tab + กลับไปแท็บกราฟิก
function _v3Exit(){
  var btn=document.getElementById('tab-btn-3');
  if(btn)btn.classList.add('hidden');
  if(typeof switchTab==='function')switchTab(1);
}

document.addEventListener('DOMContentLoaded',function(){
  const overlay=document.getElementById('v3-dev-overlay');
  if(overlay){
    overlay.addEventListener('click',function(e){
      if(e.target===this)_v3DevClose();
    });
  }
});
