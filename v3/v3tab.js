// Version 3.0.14 | 2026-05-28
// v3/v3tab.js — V3 Tab Bridge (V2 ↔ V3 integration)
// สองปุ่ม: 1) ดูกฎ local  2) Typhoon AI
// V3.0.4 (sync app V2.2.39):
//   - toast "กำลังโหลด..." ย้ายไปหลัง guard (_v3Running + _getNatal) → ไม่ขึ้นซ้อน
//     ตอน user ยังไม่ผูกดวง
//   - KB_PATH ใส่ ?v=APP_VERSION ให้ตรงกับ SW CORE_ASSETS key → offline ทำงาน

import { get_lagna, buildNatalState, ZODIAC_TH } from './engine.js';
import { matchRulesV24, matchTransitRules } from './matcher.js';
import { build_natal_payload, compose_local_prediction } from './interpretation.js';
import { match_rules, send_to_typhoon, send_chat, _ruleId } from './typhoon.js';
import { speak as nokSpeak, stop as nokStop, isSpeaking as nokIsSpeaking, hasThaiVoice as nokHasThaiVoice, preload as nokPreload } from './tts.js';
import { getEmpiricalP } from './julian_adapter.js';

// ── M8: แปลง compose_local_prediction() output → display text ──────────────
function _renderComposed(predictions) {
  if (!predictions.length) return '[ไม่พบกฎที่ตรงกับดวง]';
  // group by polarity+domain
  const groups = {};
  for (const p of predictions) {
    const icon = p.polarity === '+' ? '✅' : p.polarity === '-' ? '⚠️' : '📋';
    const key = icon + (p.domain ? ' ' + p.domain : '');
    if (!groups[key]) groups[key] = [];
    groups[key].push(p.text);
  }
  const lines = [];
  for (const [header, texts] of Object.entries(groups)) {
    lines.push(header);
    texts.forEach(t => lines.push('• ' + t));
    lines.push('');
  }
  return lines.join('\n').trim();
}

// ── V24 renderer — แสดง r.meaning จาก NATAL_ATOMIC/NATAL_COMBINATION/TRANSIT_NATAL ─
function _renderV24(matched) {
  const pred = matched.filter(r =>
    r.type === 'NATAL_ATOMIC' || r.type === 'NATAL_COMBINATION' || r.type === 'TRANSIT_NATAL'
  );
  if (!pred.length) return '[ไม่พบกฎที่ตรงกับดวง]';
  const groups = {};
  for (const r of pred) {
    const icon = r.polarity === '+' ? '✅' : r.polarity === '-' ? '⚠️' : '📋';
    const key = icon + (r.domain ? ' ' + r.domain : '');
    if (!groups[key]) groups[key] = [];
    groups[key].push(r.meaning);
  }
  const lines = [];
  for (const [header, texts] of Object.entries(groups)) {
    lines.push(header);
    texts.forEach(t => lines.push('• ' + t));
    lines.push('');
  }
  return lines.join('\n').trim();
}

// ── Config ────────────────────────────────────────────────
const KB_PATH = './v3/kb.json?v=' + (window.APP_VERSION || '0');
const KB_PATH_V24 = './v3/kb_tals.json?v=' + (window.APP_VERSION || '0');
const KB_PATH_TRANSIT = './v3/kb_transit.json?v=' + (window.APP_VERSION || '0');

// ── State ─────────────────────────────────────────────────
let _v3KbRules = null;
let _v3KbRulesV24 = null;
let _v3KbTransit = null;
let _v3Running = false;

// ── Speech rate ────────────────────────────────────────────
const _RATE_STEPS = [1.0, 1.25, 1.5, 1.75];
let _v3SpeakRate = (() => {
  const r = parseFloat(localStorage.getItem('v3_speak_rate') || '1');
  return _RATE_STEPS.includes(r) ? r : 1.0;
})();

function _syncRateBtn() {
  const btn = _el('v3-rate-btn');
  if (!btn) return;
  btn.textContent = _v3SpeakRate === 1.0 ? '1×' : _v3SpeakRate + '×';
  btn.classList.toggle('active', _v3SpeakRate !== 1.0);
}

window.v3CycleRate = function() {
  const idx = _RATE_STEPS.indexOf(_v3SpeakRate);
  _v3SpeakRate = _RATE_STEPS[(idx + 1) % _RATE_STEPS.length];
  localStorage.setItem('v3_speak_rate', String(_v3SpeakRate));
  _syncRateBtn();
};

// ── Voice Chat ─────────────────────────────────────────────
let _vcHistory = [];   // [{role:'user'|'assistant', content:string}]
let _vcRecog = null;   // SpeechRecognition instance
let _vcPanelOpen = false;
let _vcRulesCtx = '';     // formatted all-rules string (fallback)
let _vcAllRules = [];     // raw rule objects for domain filtering
let _predPool = [];       // [{rule_id,text,domain,polarity,tier,_isTransit,final_score}] — Typhoon-generated

const _VC_DOMAIN_KEYWORDS = {
  'อาชีพ':         ['งาน', 'อาชีพ', 'การงาน', 'ทำงาน', 'หน้าที่', 'ธุรกิจ', 'เงินเดือน', 'ตำแหน่ง', 'เจ้านาย', 'บริษัท', 'เลื่อน', 'ลาออก'],
  'การเงิน':       ['เงิน', 'การเงิน', 'รายได้', 'หนี้', 'ทรัพย์', 'ลงทุน', 'ร่ำรวย', 'มั่งคั่ง', 'ขาดทุน', 'กำไร', 'หุ้น', 'ซื้อ', 'ขาย'],
  'ความสัมพันธ์':  ['ความรัก', 'แฟน', 'คู่ครอง', 'แต่งงาน', 'สามี', 'ภรรยา', 'ความสัมพันธ์', 'ครอบครัว', 'ลูก', 'หย่า', 'เลิก', 'รัก', 'เพื่อน'],
  'สุขภาพ':        ['สุขภาพ', 'เจ็บป่วย', 'โรค', 'หมอ', 'รักษา', 'ร่างกาย', 'บาดเจ็บ', 'อุบัติเหตุ', 'ป่วย', 'เจ็บ'],
  'โชคลาภ':        ['โชค', 'ลาภ', 'โชคลาภ', 'เสี่ยงโชค', 'หวย', 'รางวัล', 'ดวง', 'โชคดี', 'โชคร้าย'],
};

function _vcDetectDomain(userText) {
  const t = userText;
  let best = null, bestCount = 0;
  for (const [domain, kws] of Object.entries(_VC_DOMAIN_KEYWORDS)) {
    const count = kws.filter(kw => t.includes(kw)).length;
    if (count > bestCount) { bestCount = count; best = domain; }
  }
  return bestCount > 0 ? best : null;
}

function _vcFormatRule(r, i) {
  const rid = r.id || ('R' + String(i + 1).padStart(3, '0'));
  const pol = r.polarity === '+' ? '[ดี]' : r.polarity === '-' ? '[ร้าย]' : '[กลาง]';
  const dom = r.domain ? `[${r.domain}]` : '';
  return `• [${rid}]${pol}${dom} ${r.meaning}`;
}

function _vcGetRulesForDomain(domain) {
  // Prefer Typhoon-generated text (_predPool) over raw KB keywords
  if (_predPool.length) {
    const domFiltered = domain ? _predPool.filter(p => p.domain === domain) : [];
    const src = domFiltered.length ? domFiltered : _predPool;
    return src.map(p => {
      const pol = p.polarity === '+' ? '[ดี]' : p.polarity === '-' ? '[ร้าย]' : '[กลาง]';
      const dom = p.domain ? `[${p.domain}]` : '';
      const trn = p._isTransit ? '[ดวงจร]' : '[ดวงเดิม]';
      return `• [${p.rule_id}]${pol}${dom}${trn} ${p.text}`;
    }).join('\n');
  }
  // Fallback: raw KB keywords
  if (!domain || !_vcAllRules.length) return _vcRulesCtx;
  const filtered = _vcAllRules.filter(r => r.domain === domain);
  if (!filtered.length) return _vcRulesCtx;
  return filtered.map(_vcFormatRule).join('\n');
}

function _vcSystemPrompt(domainRulesStr) {
  const natal = typeof getNatal === 'function' ? getNatal() : null;
  const rulesStr = domainRulesStr !== undefined ? domainRulesStr : _vcRulesCtx;
  const hasRules = !!rulesStr;

  let prompt = 'คุณคือ "นก" หมอดูหญิงผู้เชี่ยวชาญโหราศาสตร์ไทยระบบ TALS ' +
               'ตอบภาษาไทยกระชับเป็นธรรมชาติ ไม่เกิน 60 คำ พูดเป็นกันเองเหมือนหมอดูที่คุ้นเคย';

  if (hasRules) {
    prompt += '\nใช้เฉพาะข้อมูลกฎที่ให้มาตอบ ถ้าคำถามเกินขอบเขตกฎเหล่านี้ ให้บอกว่า "ดวงนี้ไม่มีข้อมูลในส่วนนั้น"';
  }

  prompt += '\nถ้าตอบจากความรู้โหราศาสตร์ทั่วไปที่ไม่มีในกฎ TALS ที่ให้มา ให้ขึ้นต้นด้วย "หมอดูบางคนคิดว่า" — แต่เฉพาะครั้งแรกที่ออกนอก TALS ในบทสนทนานี้เท่านั้น';

  if (natal && natal.pos) {
    const asc = get_lagna(natal.pos);
    prompt += '\n\nดวงชาตา: ลัคนา' + ZODIAC_TH[asc] + (natal.name ? ' ชื่อ' + natal.name : '');
  }

  if (hasRules) {
    prompt += '\n\nกฎโหราศาสตร์ที่ตรงกับดวง:\n' + rulesStr;
  }

  return prompt;
}

async function _vcBuildRulesCtx() {
  const natal = typeof getNatal === 'function' ? getNatal() : null;
  if (!natal || !natal.pos) return;
  try {
    const v24Rules = await _loadKbV24();
    const natalState = buildNatalState(natal.pos);
    const matched = matchRulesV24(natalState, v24Rules)
      .filter(r => r.type === 'NATAL_ATOMIC' || r.type === 'NATAL_COMBINATION')
      .sort((a, b) => (a.tier || 9) - (b.tier || 9))
      .slice(0, 20);
    _vcAllRules = matched;
    _vcRulesCtx = matched.map(_vcFormatRule).join('\n');
  } catch(_) { _vcAllRules = []; _vcRulesCtx = ''; }
}

function _vcSendGreeting() {
  if (!_vcAllRules.length && !_predPool.length) return;
  const natal = typeof getNatal === 'function' ? getNatal() : null;
  const name = natal && natal.name ? natal.name : '';
  const asc = natal && natal.pos ? ZODIAC_TH[get_lagna(natal.pos)] : '';

  const nameStr = name ? `คุณ${name}` : 'คุณ';
  const lagnaStr = asc ? `ลัคนา${asc} ` : '';
  let body;
  if (_predPool.length) {
    // ใช้ Typhoon text ที่ผ่านการแปลแล้ว
    const top = _predPool[0];
    const domStr = top.domain ? `เรื่อง${top.domain} ` : '';
    body = `ดวง${lagnaStr}${domStr}— ${top.text}`;
  } else {
    const top = _vcAllRules[0];
    body = top
      ? (top.domain ? `ดวง${lagnaStr}เด่นเรื่อง${top.domain} — ${top.meaning}` : `${lagnaStr}${top.meaning}`)
      : `${lagnaStr}มีอะไรอยากถามไหมคะ`;
  }
  const reply = `สวัสดีค่ะ ${nameStr} ฉันนก ${body} มีอะไรอยากถามเพิ่มไหมคะ?`;

  _vcHistory.push({ role: 'assistant', content: reply });
  _vcAppendBubble('assistant', reply);
  _vcSetStatus('กำลังพูด...');
  _vcSetMicState('speaking');
  nokSpeak(reply, {
    rate: _v3SpeakRate,
    onState: (event) => {
      if (event === 'end' || event === 'error') {
        _vcSetStatus('กดไมค์เพื่อพูด');
        _vcSetMicState('idle');
      }
    },
  });
}

function _vcSetStatus(text) {
  const el = _el('v3-vc-status');
  if (el) el.textContent = text;
}

function _vcSetMicState(state) {
  const btn = _el('v3-vc-mic');
  if (!btn) return;
  btn.classList.remove('listening', 'thinking', 'speaking');
  if (state !== 'idle') btn.classList.add(state);
  btn.disabled = state === 'thinking';
  btn.textContent = state === 'listening' ? '⏹' : state === 'speaking' ? '🔊' : '🎤';
}

function _vcAppendBubble(role, text) {
  const el = _el('v3-vc-history');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'v3-vc-bubble ' + (role === 'user' ? 'v3-vc-user' : 'v3-vc-ai');
  div.textContent = text;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

async function _vcSendMessage(userText) {
  _vcHistory.push({ role: 'user', content: userText });
  _vcAppendBubble('user', userText);
  _vcSetStatus('กำลังคิด...');
  _vcSetMicState('thinking');

  const domain = _vcDetectDomain(userText);
  const domainRules = domain ? _vcGetRulesForDomain(domain) : undefined;

  const recent = _vcHistory.slice(-10); // keep last 5 exchanges
  try {
    const reply = await send_chat([
      { role: 'system', content: _vcSystemPrompt(domainRules) },
      ...recent,
    ]);
    _vcHistory.push({ role: 'assistant', content: reply });
    _vcAppendBubble('assistant', reply);
    _vcSetStatus('กำลังพูด...');
    _vcSetMicState('speaking');
    nokSpeak(reply, {
      rate: _v3SpeakRate,
      onState: (event) => {
        if (event === 'end' || event === 'error') {
          _vcSetStatus('กดไมค์เพื่อพูด');
          _vcSetMicState('idle');
        }
      },
    });
  } catch(err) {
    console.warn('[VC]', err);
    _vcSetStatus('เกิดข้อผิดพลาด — ลองอีกครั้ง');
    _vcSetMicState('idle');
  }
}

window.v3MicToggle = function() {
  // กดขณะพูดอยู่ → หยุดพูด
  if (nokIsSpeaking()) {
    nokStop();
    _vcSetMicState('idle');
    _vcSetStatus('กดไมค์เพื่อพูด');
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    _vcSetStatus('เบราว์เซอร์นี้ไม่รองรับการฟังเสียง');
    return;
  }

  // กดขณะฟังอยู่ → ยกเลิก
  if (_vcRecog) {
    _vcRecog.abort();
    _vcRecog = null;
    _vcSetMicState('idle');
    _vcSetStatus('กดไมค์เพื่อพูด');
    return;
  }

  const r = new SR();
  r.lang = 'th-TH';
  r.continuous = false;
  r.interimResults = false;
  _vcRecog = r;

  let _handled = false;

  r.onstart = () => { _vcSetMicState('listening'); _vcSetStatus('ฟังอยู่...'); };

  r.onresult = (e) => {
    _handled = true;
    _vcRecog = null;
    const text = e.results[0][0].transcript.trim();
    if (text) _vcSendMessage(text);
    else { _vcSetMicState('idle'); _vcSetStatus('กดไมค์เพื่อพูด'); }
  };

  r.onerror = (e) => {
    _handled = true;
    _vcRecog = null;
    _vcSetMicState('idle');
    _vcSetStatus(e.error === 'no-speech' ? 'ไม่ได้ยินเสียง — ลองอีกครั้ง' : 'เกิดข้อผิดพลาด: ' + e.error);
  };

  r.onend = () => {
    if (!_handled) { _vcRecog = null; _vcSetMicState('idle'); _vcSetStatus('กดไมค์เพื่อพูด'); }
  };

  r.start();
};

window.v3VcClear = function() {
  _vcHistory = [];
  const el = _el('v3-vc-history');
  if (el) el.innerHTML = '';
  if (nokIsSpeaking()) nokStop();
  if (_vcRecog) { _vcRecog.abort(); _vcRecog = null; }
  _vcSetMicState('idle');
  _vcSetStatus('กดไมค์เพื่อพูด');
};

window.v3VcTogglePanel = function() {
  const body = _el('v3-vc-body');
  const toggle = _el('v3-vc-toggle');
  const arrow = _el('v3-vc-arrow');
  if (!body) return;
  _vcPanelOpen = !_vcPanelOpen;
  body.classList.toggle('hidden', !_vcPanelOpen);
  if (toggle) toggle.classList.toggle('open', _vcPanelOpen);
  if (arrow) arrow.textContent = _vcPanelOpen ? '▲' : '▼';
  if (_vcPanelOpen) {
    if (!_vcRulesCtx) {
      _vcBuildRulesCtx().then(() => {
        if (_vcHistory.length === 0) _vcSendGreeting();
      });
    } else if (_vcHistory.length === 0) {
      _vcSendGreeting();
    }
  }
  if (!_vcPanelOpen) {
    if (_vcRecog) { _vcRecog.abort(); _vcRecog = null; }
    if (nokIsSpeaking()) nokStop();
    _vcSetMicState('idle');
  }
};

// ── KB loader ─────────────────────────────────────────────
async function _loadKb() {
  if (_v3KbRules) return _v3KbRules;
  const resp = await fetch(KB_PATH);
  if (!resp.ok) throw new Error('kb.json โหลดไม่ได้: HTTP ' + resp.status);
  const data = await resp.json();
  _v3KbRules = Array.isArray(data) ? data : (data.rules || []);
  return _v3KbRules;
}

async function _loadKbV24() {
  if (_v3KbRulesV24) return _v3KbRulesV24;
  const resp = await fetch(KB_PATH_V24);
  if (!resp.ok) throw new Error('kb_v24.json โหลดไม่ได้: HTTP ' + resp.status);
  const data = await resp.json();
  _v3KbRulesV24 = Array.isArray(data) ? data : (data.rules || []);
  return _v3KbRulesV24;
}

async function _loadKbTransit() {
  if (_v3KbTransit) return _v3KbTransit;
  const resp = await fetch(KB_PATH_TRANSIT);
  if (!resp.ok) throw new Error('kb_transit.json โหลดไม่ได้: HTTP ' + resp.status);
  const data = await resp.json();
  _v3KbTransit = data.rules || [];
  return _v3KbTransit;
}

// ── _predPool builder — cross-ref Typhoon validPreds กับ matchedRules ────────
// Sort: natal ก่อน → final_score สูงก่อน → tier ต่ำก่อน → ร้าย > ดี > กลาง
function _buildPredPool(matchedRules, validPreds) {
  const ruleMap = new Map(matchedRules.map(r => [_ruleId(r), r]));
  return validPreds.map(p => {
    const rule = ruleMap.get(p.rule_id) || {};
    return {
      rule_id:     p.rule_id,
      text:        p.text.trim(),
      domain:      rule.domain     || '',
      polarity:    rule.polarity   || '0',
      tier:        rule.tier       || 9,
      _isTransit:  rule._isTransit || false,
      final_score: rule.final_score || 0,
    };
  }).sort((a, b) => {
    if (a._isTransit !== b._isTransit) return a._isTransit ? 1 : -1;
    if ((b.final_score||0) !== (a.final_score||0)) return (b.final_score||0) - (a.final_score||0);
    if (a.tier !== b.tier) return a.tier - b.tier;
    const polOrder = { '-': 0, '+': 1, '0': 2 };
    return (polOrder[a.polarity]??2) - (polOrder[b.polarity]??2);
  });
}

// ── JULIAN plug-in: เพิ่ม empirical_p + final_score ให้ matched rules ──────
// JULIAN session จะ implement getEmpiricalP() จริง — ตอนนี้ return null (no-op)
function _augmentWithJulian(matched) {
  return matched.map(r => {
    const ep = getEmpiricalP(r.id);
    return ep === null ? r : { ...r, empirical_p: ep, final_score: (r.score || 1) * ep };
  });
}

// ── V24 chart context สำหรับ Typhoon prompt ─────────────────────────────────
function _buildV24Context(natalState) {
  return {
    lagna: { name: ZODIAC_TH[natalState.ascSign] },
    overall: { strength: 'ตาม BIBLE rules' },
  };
}

// ── DOM helpers ─────────────────────────────────────────────
function _el(id) { return document.getElementById(id); }

function _showSpinner(show) {
  _el('v3-spinner').classList.toggle('hidden', !show);
}

function _showResult(text, isFallback, label) {
  const resultEl = _el('v3-result');
  const badge = _el('v3-fallback-badge');
  const srcLabel = _el('v3-source-label');
  resultEl.textContent = text;
  resultEl.classList.toggle('fallback', isFallback);
  badge.classList.toggle('hidden', !isFallback);
  if (srcLabel) srcLabel.textContent = label || '';
  _el('v3-result-wrap').classList.remove('hidden');
  _el('v3-copy-btn').disabled = false;
  _refreshSpeakBtn();
}

function _clearResult() {
  _el('v3-result-wrap').classList.add('hidden');
  _el('v3-copy-btn').disabled = true;
  nokStop();
  const sb = _el('v3-speak-btn');
  if (sb) {
    sb.disabled = true;
    sb.textContent = '🔊 ฟังคำพยากรณ์';
    sb.classList.remove('speaking');
  }
}

// NOK: enable ปุ่ม ฟัง ตามความพร้อมของ Thai voice บนเครื่อง
function _refreshSpeakBtn() {
  const btn = _el('v3-speak-btn');
  if (!btn) return;
  if (nokHasThaiVoice()) {
    btn.disabled = false;
    btn.classList.remove('no-voice');
    btn.title = '';
  } else {
    btn.disabled = false;
    btn.classList.add('no-voice');
    btn.title = 'แตะเพื่อดูวิธีเปิดเสียงภาษาไทย';
  }
}

function _showTTSGuide() {
  const bd = document.getElementById('v3-tts-guide-backdrop');
  const md = document.getElementById('v3-tts-guide');
  if (!md) return;

  // Detect platform
  const ua = navigator.userAgent;
  const pl = (typeof navigator.platform === 'string' ? navigator.platform : '');
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad/i.test(ua);
  const isWindows = !isAndroid && !isIOS && (/Win/i.test(pl) || /Windows NT/i.test(ua));
  const isMac = !isAndroid && !isIOS && /Mac/i.test(pl) && !/Windows/i.test(ua);

  let html = '';
  if (isAndroid) {
    html = `
      <p class="tts-guide-desc">เครื่องนี้ยังไม่มีชุดเสียงภาษาไทย ติดตั้งได้ใน 3 ขั้นตอน</p>
      <ol class="tts-guide-steps">
        <li>ตั้งค่า → การช่วยเหลือ → <strong>การอ่านออกเสียง (TTS)</strong></li>
        <li>กด ⚙ ข้าง "เครื่องมือ TTS" → ติดตั้งข้อมูลเสียง → เลือก <strong>ภาษาไทย</strong></li>
        <li>กลับมาที่แอปแล้วกดปุ่ม 🔊 อีกครั้ง</li>
      </ol>
      <p class="tts-guide-note">Samsung: ตั้งค่า → การจัดการทั่วไป → ภาษา → การอ่านออกเสียง</p>`;
  } else if (isWindows) {
    html = `
      <p class="tts-guide-desc">เพิ่มเสียงภาษาไทยผ่าน Windows Settings ใน 3 ขั้นตอน</p>
      <ol class="tts-guide-steps">
        <li>กด <strong>Start</strong> → พิมพ์ค้นหา <strong>"Speech settings"</strong> → เปิด</li>
        <li>เลื่อนหา "Manage voices" → <strong>Add voices</strong> → ค้นหา <strong>Thai</strong></li>
        <li>กลับมาที่แอปแล้วกดปุ่ม ✓ ตรวจสอบอีกครั้ง</li>
      </ol>
      <p class="tts-guide-note">⚠️ Chrome/Opera ไม่อนุญาตลิงค์ตรงไปที่ตั้งค่า — ต้องเปิด Settings เอง</p>
      <p class="tts-guide-note">ทางเลือก: ใช้ Microsoft Edge (มีเสียงไทยในตัว)</p>`;
  } else if (isMac) {
    html = `
      <p class="tts-guide-desc">เพิ่มเสียงภาษาไทยผ่าน macOS System Settings</p>
      <ol class="tts-guide-steps">
        <li>เปิด <strong>System Settings</strong> → Accessibility → <strong>Spoken Content</strong></li>
        <li>คลิก "Manage Voices..." → ค้นหา <strong>Thai</strong> → กด ดาวน์โหลด</li>
        <li>กลับมาที่แอปแล้วกดปุ่ม ✓ ตรวจสอบอีกครั้ง</li>
      </ol>
      <p class="tts-guide-note">⚠️ Chrome/Opera ไม่อนุญาตลิงค์ตรงไปที่ตั้งค่า — ต้องเปิด System Settings เอง</p>
      <p class="tts-guide-note">ทางเลือก: ใช้ Microsoft Edge (มีเสียงไทยในตัว)</p>`;
  } else if (isIOS) {
    html = `
      <p class="tts-guide-desc">iOS: เสียงภาษาไทยสำหรับ Safari</p>
      <ol class="tts-guide-steps">
        <li>Settings → Accessibility → <strong>Spoken Content</strong></li>
        <li>Voices → เพิ่ม <strong>Thai</strong></li>
        <li>กลับมาที่แอปแล้วกดปุ่ม ✓ ตรวจสอบอีกครั้ง</li>
      </ol>`;
  } else {
    html = `
      <p class="tts-guide-desc">เบราว์เซอร์นี้ยังไม่มีชุดเสียงภาษาไทย</p>
      <ol class="tts-guide-steps">
        <li>ลองใช้ <strong>Microsoft Edge</strong> (มีเสียงไทยในตัว)</li>
        <li>หรือติดตั้งเสียงภาษาไทยผ่านระบบปฏิบัติการของคุณ</li>
        <li>กลับมาที่แอปแล้วกดปุ่ม ✓ ตรวจสอบอีกครั้ง</li>
      </ol>`;
  }

  const content = document.getElementById('v3-tts-guide-content');
  if (content) content.innerHTML = html;
  if (bd) bd.classList.remove('hidden');
  md.classList.remove('hidden');
}

window.closeTTSGuide = function() {
  const bd = document.getElementById('v3-tts-guide-backdrop');
  const md = document.getElementById('v3-tts-guide');
  if (bd) bd.classList.add('hidden');
  if (md) md.classList.add('hidden');
};

// ── Panel helpers ────────────────────────────────────────────
function v3TogglePanel(id) {
  const bd = _el(id);
  const hd = bd && bd.previousElementSibling;
  if (!bd) return;
  const open = bd.classList.toggle('open');
  if (hd) hd.classList.toggle('open', open);
}

function _showRulesPanel(matched, payload) {
  _el('v3-rules-count').textContent = matched.length + ' กฎ';
  const list = _el('v3-rules-list');
  list.innerHTML = '';
  if (!matched.length) {
    list.innerHTML = '<div style="color:#475569;font-size:.78rem">ไม่พบกฎที่ตรงดวง</div>';
    return;
  }
  // use predictions for polarity+domain already computed
  const preds = compose_local_prediction(matched, payload);
  matched.forEach((r, i) => {
    const p = preds[i] || {};
    const pol = p.polarity || r.polarity || '~';
    const domain = p.domain || r.domain || '';
    const polClass = pol === '+' ? 'pol-pos' : pol === '-' ? 'pol-neg' : 'pol-neu';
    const polLabel = pol === '+' ? '+' : pol === '-' ? '−' : '~';
    const rid = _ruleId(r);
    const row = document.createElement('div');
    row.className = 'v3-rule-row' + (r._isTransit ? ' transit-rule' : '');
    row.innerHTML =
      `<span class="v3-rule-id">${_esc(rid)}</span>` +
      `<span class="v3-rule-pol ${polClass}">${polLabel}</span>` +
      `<span class="v3-rule-text">${_esc(r.c || '')}</span>` +
      (r._isTransit ? '<span class="v3-rule-transit">จร</span>' : '') +
      (domain ? `<span class="v3-rule-domain">${_esc(domain)}</span>` : '');
    list.appendChild(row);
  });
  // auto-open rules panel
  const bd = _el('v3-pd-rules');
  const hd = bd && bd.previousElementSibling;
  bd.classList.add('open');
  if (hd) hd.classList.add('open');
}

function _showInputPanel(sysPrompt, userPrompt) {
  const box = _el('v3-prompt-box');
  if (!box) return;
  // แสดงแค่ rule IDs ที่ส่งไป Typhoon — ดูรายละเอียดใน Panel 1
  const ruleIds = [...userPrompt.matchAll(/\[(R\d{3})\]/g)].map(m => m[1]);
  box.innerHTML =
    '<span class="v3-prompt-section">── Rule IDs ที่ส่งไป Typhoon ──</span>\n' +
    (ruleIds.length
      ? _esc(ruleIds.join('  '))
      : '(ไม่มี rule IDs)') +
    '\n\n<span class="v3-prompt-section">── MODE ──</span>\n' +
    _esc(userPrompt.match(/\(โหมด[^)]+\)/)?.[0] || '');
}

function _setInputPanelLocal() {
  const box = _el('v3-prompt-box');
  if (box) box.textContent = '— โหมดกฎท้องถิ่น ไม่ส่ง Typhoon —';
}

// เรียงลำดับ: natal ก่อน → transit ทีหลัง
function _sortResults(matched) {
  return [...matched.filter(r => !r._isTransit), ...matched.filter(r => r._isTransit)];
}

function _hasNatal() {
  const n = typeof getNatal === 'function' ? getNatal() : null;
  return !!(n && n.pos);
}

// transit label สำหรับ toast/badge
function _transitLabel() {
  const t = typeof getTransit === 'function' ? getTransit() : null;
  if (!t) return null;
  return (t.d && t.m && t.y_be) ? t.d + '/' + t.m + '/' + t.y_be : 'ดาวจร';
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _refreshNatalBar() {
  const natal = typeof getNatal === 'function' ? getNatal() : null;
  const bar = _el('v3-natal-bar');
  const noNatal = _el('v3-no-natal');
  if (natal && natal.pos) {
    _el('v3-natal-name').textContent = natal.name || '(ไม่ระบุชื่อ)';
    _el('v3-natal-date').textContent = natal.d && natal.m && natal.y_be
      ? natal.d + '/' + natal.m + '/' + natal.y_be + ' · ' + (natal.t || '') : '';
    bar.classList.remove('hidden');
    noNatal.classList.add('hidden');
  } else {
    bar.classList.add('hidden');
    noNatal.classList.remove('hidden');
  }
  _clearResult();
}

// ── getNatal helper ──────────────────────────────────────────
function _getNatal() {
  const natal = typeof getNatal === 'function' ? getNatal() : null;
  if (!natal || !natal.pos) {
    _showToastV3('กรุณาผูกดวงที่แท็บ "กรอกข้อมูล" ก่อน');
    return null;
  }
  return natal;
}

// ── Button 1: ดูกฎ local ────────────────────────────────────
async function v3Local() {
  if (_v3Running) return;
  const natal = _getNatal();
  if (!natal) return;
  _showToastV3('กำลังโหลดกฎ...');

  _v3Running = true;
  _el('v3-btn-local').disabled = true;
  _clearResult();
  _showSpinner(true);

  try {
    const [v24Rules, kbTransit] = await Promise.all([_loadKbV24(), _loadKbTransit()]);
    const pos = natal.pos;
    const natalState = buildNatalState(pos);
    const transit = typeof getTransit === 'function' ? getTransit() : null;
    const transitPos = transit?.pos || null;
    const transitState = transitPos ? buildNatalState(transitPos, null, natalState.ascSign) : null;
    const allMatched = matchRulesV24(natalState, v24Rules, transitState)
      .map(r => ({...r, _isTransit: r.type === 'TRANSIT_NATAL'}));
    const phase2 = transitPos ? matchTransitRules(natal.pos, transitPos, kbTransit) : [];
    const matched = _sortResults([...allMatched, ...phase2]);
    _showSpinner(false);
    _showRulesPanel(matched, null);
    _setInputPanelLocal();
    _showResult(_renderV24(matched), false, `📋 กฎท้องถิ่น V24 (${matched.length} กฎ)`);
  } catch (err) {
    _showSpinner(false);
    console.warn('[v3tab] local error:', err);
    _showToastV3('เกิดข้อผิดพลาด: ' + err.message);
  } finally {
    _v3Running = false;
    _el('v3-btn-local').disabled = false;
  }
}

// ── Button 2: Typhoon AI ─────────────────────────────────────
async function v3Typhoon() {
  if (_v3Running) return;
  const natal = _getNatal();
  if (!natal) return;
  _showToastV3('กำลังส่งข้อมูลไป Typhoon...');

  _v3Running = true;
  _el('v3-btn-typhoon').disabled = true;
  _clearResult();
  _showSpinner(true);

  // V24 pipeline: matched ต้องอยู่นอก try เพื่อให้ fallback เข้าถึงได้
  let matched = null, ctx = null;
  try {
    const [v24Rules, kbTransit] = await Promise.all([_loadKbV24(), _loadKbTransit()]);
    const pos = natal.pos;
    const natalState = buildNatalState(pos);
    const transit = typeof getTransit === 'function' ? getTransit() : null;
    const transitPos = transit?.pos || null;
    const transitState = transitPos ? buildNatalState(transitPos, null, natalState.ascSign) : null;
    const allMatched = matchRulesV24(natalState, v24Rules, transitState)
      .map(r => ({ ...r, _isTransit: r.type === 'TRANSIT_NATAL' }));
    const phase2 = transitPos ? matchTransitRules(natal.pos, transitPos, kbTransit) : [];
    matched = _augmentWithJulian(_sortResults([...allMatched, ...phase2]));
    ctx = _buildV24Context(natalState);
    _showRulesPanel(matched, null);
    _predPool = []; // clear ก่อน — natal อาจเปลี่ยน
    const text = await send_to_typhoon(ctx, matched, {
      onPromptReady: (sys, user) => _showInputPanel(sys, user),
      onPredictions: (validPreds) => { _predPool = _buildPredPool(matched, validPreds); },
    });
    _showSpinner(false);
    _showResult(text, false, `🤖 Typhoon AI V24`);
    // Auto-TTS: พูดคำพยากรณ์สำคัญ 3 อันดับแรกทันทีโดยไม่รอกดปุ่ม
    if (_predPool.length && nokHasThaiVoice()) {
      const topText = _predPool.slice(0, 3).map(p => p.text).join(' ');
      nokSpeak(topText, { rate: _v3SpeakRate });
    }
  } catch (err) {
    _showSpinner(false);
    console.warn('[v3tab] typhoon error:', err);
    if (matched) {
      _showResult(_renderV24(matched), true, '⚠️ Typhoon ไม่ตอบ — ใช้กฎ BIBLE ดิบ');
      _showToastV3('Typhoon ไม่ตอบ — ใช้กฎดิบแทน');
    } else {
      _showToastV3('เกิดข้อผิดพลาด: ' + err.message);
    }
  } finally {
    _v3Running = false;
    _el('v3-btn-typhoon').disabled = false;
  }
}

// ── NOK: Speak (Text-to-Speech) ──────────────────────────────
function v3Speak() {
  const btn = _el('v3-speak-btn');
  const raw = _el('v3-result') ? _el('v3-result').textContent : '';
  if (!raw) return;
  // ตัด rule ID เช่น [R01] ออกก่อนพูด — user ไม่ต้องได้ยินหมายเลขกฎ
  const text = raw.replace(/\[R\d+\]\s*/g, '');

  // กดซ้ำขณะกำลังพูด → หยุด
  if (nokIsSpeaking()) {
    nokStop();
    if (btn) {
      btn.textContent = '🔊 ฟังคำพยากรณ์';
      btn.classList.remove('speaking');
    }
    return;
  }

  if (!nokHasThaiVoice()) {
    _showTTSGuide();
    return;
  }

  nokSpeak(text, {
    rate: _v3SpeakRate,
    onState: (event, detail) => {
      if (!btn) return;
      if (event === 'start') {
        btn.textContent = '⏸ หยุด';
        btn.classList.add('speaking');
      } else if (event === 'end') {
        btn.textContent = '🔊 ฟังคำพยากรณ์';
        btn.classList.remove('speaking');
      } else if (event === 'error') {
        btn.textContent = '🔊 ฟังคำพยากรณ์';
        btn.classList.remove('speaking');
        if (detail === 'no-thai-voice') _showToastV3('เครื่องนี้ไม่มีเสียงไทย');
        else if (detail === 'not-supported') _showToastV3('เบราว์เซอร์นี้ไม่รองรับเสียงพูด');
        else _showToastV3('เล่นเสียงไม่ได้');
      }
    }
  });
}

// ── Copy ─────────────────────────────────────────────────────
function v3Copy() {
  const text = _el('v3-result') ? _el('v3-result').textContent : '';
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => _showToastV3('คัดลอกแล้ว ✓'))
    .catch(() => _showToastV3('คัดลอกไม่ได้'));
}

function _showToastV3(msg) {
  if (typeof _showToast === 'function') { _showToast(msg); return; }
  const t = _el('toast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2500);
  }
}

// ── Tab switch observer ──────────────────────────────────────
function _watchTab3() {
  const tab3 = _el('tab-3');
  if (!tab3) return;
  new MutationObserver(() => {
    if (!tab3.classList.contains('hidden')) _refreshNatalBar();
    else nokStop(); // NOK: หยุดเสียงเมื่อ user สลับ tab ออก
  }).observe(tab3, { attributes: true, attributeFilter: ['class'] });
}

// ── Expose globals ───────────────────────────────────────────
window.v3Local = v3Local;
window.v3Typhoon = v3Typhoon;
window.v3Copy = v3Copy;
window.v3Speak = v3Speak;
window.v3TogglePanel = v3TogglePanel;
// voice chat (already assigned as window.* above)
// window.v3MicToggle, window.v3VcClear, window.v3VcTogglePanel

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _watchTab3();
  _syncRateBtn();
  _loadKb().catch(err => console.warn('[v3tab] kb preload failed:', err));
  nokPreload(_refreshSpeakBtn); // NOK: pre-warm, update btn when voices load
});

window.v3RecheckVoice = function() {
  if (nokHasThaiVoice()) {
    window.closeTTSGuide();
    _refreshSpeakBtn();
    _showToastV3('พบเสียงไทย พร้อมใช้งาน ✓');
  } else {
    _showToastV3('ยังไม่พบเสียงไทย — ลองปิดแล้วเปิดแอปใหม่หลังติดตั้ง');
  }
};
