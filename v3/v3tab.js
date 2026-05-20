// Version 3.0.4 | 2026-05-20
// v3/v3tab.js — V3 Tab Bridge (V2 ↔ V3 integration)
// สองปุ่ม: 1) ดูกฎ local  2) Typhoon AI
// V3.0.4 (sync app V2.2.39):
//   - toast "กำลังโหลด..." ย้ายไปหลัง guard (_v3Running + _getNatal) → ไม่ขึ้นซ้อน
//     ตอน user ยังไม่ผูกดวง
//   - KB_PATH ใส่ ?v=APP_VERSION ให้ตรงกับ SW CORE_ASSETS key → offline ทำงาน

import { get_lagna } from './engine.js';
import { build_natal_payload } from './interpretation.js';
import { match_rules, render_fallback, send_to_typhoon } from './typhoon.js';

// ── Config ────────────────────────────────────────────────
const KB_PATH = './v3/kb.json?v=' + (window.APP_VERSION || '0');

// ── State ─────────────────────────────────────────────────
let _v3KbRules = null;
let _v3Running = false;

// ── KB loader ─────────────────────────────────────────────
async function _loadKb() {
  if (_v3KbRules) return _v3KbRules;
  const resp = await fetch(KB_PATH);
  if (!resp.ok) throw new Error('kb.json โหลดไม่ได้: HTTP ' + resp.status);
  const data = await resp.json();
  _v3KbRules = Array.isArray(data) ? data : (data.rules || []);
  return _v3KbRules;
}

// ── DOM helpers ─────────────────────────────────────────────
function _el(id) { return document.getElementById(id); }

function _showSpinner(show) {
  _el('v3-spinner').classList.toggle('hidden', !show);
}

function _showResult(text, isFallback, label) {
  const wrap = _el('v3-result-wrap');
  const resultEl = _el('v3-result');
  const badge = _el('v3-fallback-badge');
  const srcLabel = _el('v3-source-label');
  resultEl.textContent = text;
  resultEl.classList.toggle('fallback', isFallback);
  badge.classList.toggle('hidden', !isFallback);
  if (srcLabel) srcLabel.textContent = label || '';
  wrap.classList.remove('hidden');
  _el('v3-copy-btn').disabled = false;
}

function _clearResult() {
  _el('v3-result-wrap').classList.add('hidden');
  _el('v3-copy-btn').disabled = true;
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
    const kbRules = await _loadKb();
    const pos = natal.pos;
    const ascSign = get_lagna(pos);
    const payload = build_natal_payload(pos, ascSign);
    const matched = match_rules(pos, ascSign, kbRules, null, payload);
    const text = render_fallback(payload, matched);
    _showSpinner(false);
    _showResult(text, false, '📋 กฎที่ตรงดวง (' + matched.length + ' กฎ) — ไม่ใช้ AI');
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

  try {
    const kbRules = await _loadKb();
    const pos = natal.pos;
    const ascSign = get_lagna(pos);
    const payload = build_natal_payload(pos, ascSign);
    const matched = match_rules(pos, ascSign, kbRules, null, payload);
    const text = await send_to_typhoon(payload, matched);
    _showSpinner(false);
    _showResult(text, false, '🤖 พยากรณ์โดย Typhoon AI');
  } catch (err) {
    _showSpinner(false);
    console.warn('[v3tab] typhoon error:', err);
    _showToastV3('Typhoon ไม่ตอบ: ' + err.message);
  } finally {
    _v3Running = false;
    _el('v3-btn-typhoon').disabled = false;
  }
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
  }).observe(tab3, { attributes: true, attributeFilter: ['class'] });
}

// ── Expose globals ───────────────────────────────────────────
window.v3Local = v3Local;
window.v3Typhoon = v3Typhoon;
window.v3Copy = v3Copy;

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _watchTab3();
  _loadKb().catch(err => console.warn('[v3tab] kb preload failed:', err));
});
