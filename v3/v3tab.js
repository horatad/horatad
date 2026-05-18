// Version 3.0.2 | 2026-05-18
// v3/v3tab.js — V3 Tab Bridge (V2 ↔ V3 integration)
// deploy ที่: v3/v3tab.js (ES module, โหลดจาก index.html)
// อ่าน _natal จาก V2 global ผ่าน getNatal()

import { get_lagna } from './engine.js';
import { build_natal_payload } from './interpretation.js';
import { interpret } from './typhoon.js';

// ── Config ────────────────────────────────────────────────
const KB_PATH = './v3/kb.json';

// ── State ─────────────────────────────────────────────────
let _v3KbRules = null;
let _v3Running = false;

// ── Init ───────────────────────────────────────────────────
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

function _setSpinner(show) {
  _el('v3-spinner').classList.toggle('hidden', !show);
}

function _setResult(text, isFallback) {
  const wrap = _el('v3-result-wrap');
  const resultEl = _el('v3-result');
  const badge = _el('v3-fallback-badge');
  const copyBtn = _el('v3-copy-btn');
  resultEl.textContent = text;
  resultEl.classList.toggle('fallback', isFallback);
  badge.classList.toggle('hidden', !isFallback);
  wrap.classList.remove('hidden');
  copyBtn.disabled = false;
}

function _clearResult() {
  _el('v3-result-wrap').classList.add('hidden');
  _el('v3-copy-btn').disabled = true;
}

// อัปเดต natal info bar — ปุ่มเปิดตลอด ไม่ขึ้นกับ natal
function _refreshNatalBar() {
  const natal = typeof getNatal === 'function' ? getNatal() : null;
  const bar = _el('v3-natal-bar');
  const noNatal = _el('v3-no-natal');

  if (natal && natal.pos) {
    _el('v3-natal-name').textContent = natal.name || '(ไม่ระบุชื่อ)';
    const dateStr = natal.d && natal.m && natal.y_be
      ? natal.d + '/' + natal.m + '/' + natal.y_be + ' · ' + (natal.t || '')
      : '';
    _el('v3-natal-date').textContent = dateStr;
    bar.classList.remove('hidden');
    noNatal.classList.add('hidden');
  } else {
    bar.classList.add('hidden');
    noNatal.classList.remove('hidden');
  }
  _clearResult();
}

// ── Main predict ────────────────────────────────────────────
async function v3Predict() {
  if (_v3Running) return;

  // เช็ค natal ตอนกด — ไม่ lock ปุ่มล่วงหน้า
  const natal = typeof getNatal === 'function' ? getNatal() : null;
  if (!natal || !natal.pos) {
    _showToastV3('กรุณาผูกดวงที่แท็บ "กรอกข้อมูล" ก่อน');
    return;
  }

  _v3Running = true;
  const btn = _el('v3-btn-predict');
  btn.disabled = true;
  _clearResult();
  _setSpinner(true);

  try {
    const kbRules = await _loadKb();
    const pos = natal.pos;
    const ascSign = get_lagna(pos);
    const payload = build_natal_payload(pos, ascSign);

    const { text, fallback } = await interpret(
      pos, ascSign, kbRules, payload,
      { transitPos: null, signal: null }
    );

    _setSpinner(false);
    _setResult(text, fallback);
  } catch (err) {
    _setSpinner(false);
    console.warn('[v3tab] predict error:', err);
    _showToastV3('พยากรณ์ไม่สำเร็จ: ' + err.message);
  } finally {
    _v3Running = false;
    btn.disabled = false;
  }
}

function v3Copy() {
  const text = _el('v3-result') ? _el('v3-result').textContent : '';
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => _showToastV3('คัดลอกแล้ว ✓'))
    .catch(() => _showToastV3('คัดลอกไม่ได้'));
}

function _showToastV3(msg) {
  if (typeof _showToast === 'function') {
    _showToast(msg);
  } else {
    const t = _el('toast');
    if (t) {
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }
  }
}

// ── Tab switch hook ──────────────────────────────────────────
function _watchTab3() {
  const tab3 = _el('tab-3');
  if (!tab3) return;
  const obs = new MutationObserver(() => {
    if (!tab3.classList.contains('hidden')) {
      _refreshNatalBar();
    }
  });
  obs.observe(tab3, { attributes: true, attributeFilter: ['class'] });
}

// ── Expose to global ─────────────────────────────────────────
window.v3Predict = v3Predict;
window.v3Copy = v3Copy;

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _watchTab3();
  _loadKb().catch(err => console.warn('[v3tab] kb preload failed:', err));
});
