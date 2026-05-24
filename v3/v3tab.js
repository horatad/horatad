// Version 3.0.10 | 2026-05-22
// v3/v3tab.js — V3 Tab Bridge (V2 ↔ V3 integration)
// สองปุ่ม: 1) ดูกฎ local  2) Typhoon AI
// V3.0.4 (sync app V2.2.39):
//   - toast "กำลังโหลด..." ย้ายไปหลัง guard (_v3Running + _getNatal) → ไม่ขึ้นซ้อน
//     ตอน user ยังไม่ผูกดวง
//   - KB_PATH ใส่ ?v=APP_VERSION ให้ตรงกับ SW CORE_ASSETS key → offline ทำงาน

import { get_lagna, buildNatalState, matchRulesV24 } from './engine.js';
import { build_natal_payload, compose_local_prediction } from './interpretation.js';
import { match_rules, send_to_typhoon, _ruleId } from './typhoon.js';
import { speak as nokSpeak, stop as nokStop, isSpeaking as nokIsSpeaking, hasThaiVoice as nokHasThaiVoice, preload as nokPreload } from './tts.js';

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
const KB_PATH_V24 = './v3/kb_v24-3.json?v=' + (window.APP_VERSION || '0');

// ── State ─────────────────────────────────────────────────
let _v3KbRules = null;
let _v3KbRulesV24 = null;
let _v3Running = false;
let _v3Mode = 'natal'; // 'natal' | 'transit' | 'both'

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
  if (bd) bd.classList.remove('hidden');
  if (md) md.classList.remove('hidden');
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

// กรอง matched rules ตาม mode
function _filterByMode(matched) {
  if (_v3Mode === 'natal')   return matched.filter(r => !r._isTransit);
  if (_v3Mode === 'transit') return matched.filter(r =>  r._isTransit);
  return matched; // 'both'
}

// อัปเดต toggle button UI
function v3SetMode(mode) {
  _v3Mode = mode;
  ['natal','transit','both'].forEach(m => {
    const b = _el('v3-m-' + m);
    if (b) b.classList.toggle('on', m === mode);
  });
  _clearResult();
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
    const v24Rules = await _loadKbV24();
    const pos = natal.pos;
    const natalState = buildNatalState(pos);
    const transit = typeof getTransit === 'function' ? getTransit() : null;
    const transitPos = transit?.pos || null;
    const transitState = transitPos ? buildNatalState(transitPos, null, natalState.ascSign) : null;
    if (_v3Mode !== 'natal' && !transitPos) {
      _showToastV3('ไม่มีข้อมูลดาวจร — กรุณาตั้งวันดาวจรที่แท็บ "วันนี้" ก่อน');
    }
    const allMatched = matchRulesV24(natalState, v24Rules, transitState)
      .map(r => ({...r, _isTransit: r.type === 'TRANSIT_NATAL'}));
    const matched = _filterByMode(allMatched);
    _showSpinner(false);
    _showRulesPanel(matched, null);
    _setInputPanelLocal();
    const modeLabel = _v3Mode === 'transit' ? '🌐 ดวงจร' : _v3Mode === 'both' ? '⚡ ทั้งคู่' : '🏠 ดวงเดิม';
    _showResult(_renderV24(matched), false, `📋 กฎท้องถิ่น V24 (${matched.length} กฎ) ${modeLabel}`);
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

  // M2: payload + matched ต้องอยู่นอก try เพื่อให้ fallback เข้าถึงได้
  let payload = null, matched = null;
  try {
    const kbRules = await _loadKb();
    const pos = natal.pos;
    const ascSign = get_lagna(pos);
    payload = build_natal_payload(pos, ascSign);
    const transit = typeof getTransit === 'function' ? getTransit() : null;
    const transitPos = transit?.pos || null;
    if (transitPos) payload._include_transit = true;
    if (_v3Mode !== 'natal' && !transitPos) {
      _showToastV3('ไม่มีข้อมูลดาวจร — กรุณาตั้งวันดาวจรที่แท็บ "วันนี้" ก่อน');
    }
    const allMatched = match_rules(pos, ascSign, kbRules, transitPos, payload);
    matched = _filterByMode(allMatched);
    _showRulesPanel(matched, payload);
    const modeLabel = _v3Mode === 'transit' ? '🌐 ดวงจร' : _v3Mode === 'both' ? '⚡ ทั้งคู่' : '🏠 ดวงเดิม';
    const text = await send_to_typhoon(payload, matched, {
      onPromptReady: (sys, user) => _showInputPanel(sys, user)
    });
    _showSpinner(false);
    _showResult(text, false, `🤖 Typhoon AI ${modeLabel}`);
  } catch (err) {
    _showSpinner(false);
    console.warn('[v3tab] typhoon error:', err);
    if (payload && matched) {
      const fallbackText = _renderComposed(compose_local_prediction(matched, payload));
      _showResult(fallbackText, true, '⚠️ Typhoon ไม่ตอบ — ใช้ keyword engine');
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
  const text = _el('v3-result') ? _el('v3-result').textContent : '';
  if (!text) return;

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
window.v3SetMode = v3SetMode;

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _watchTab3();
  _loadKb().catch(err => console.warn('[v3tab] kb preload failed:', err));
  nokPreload(); // NOK: pre-warm voice list (iOS Safari load async)
});
