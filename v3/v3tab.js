// Version 3.0.1 | 2026-05-18
// v3/v3tab.js — V3 Tab Bridge (V2 ↔ V3 integration)
// deploy ที่: v3/v3tab.js (ES module, โหลดจาก index.html)
// อ่าน _natal จาก V2 global ผ่าน getNatal()
// ไม่แตะ V2 state โดยตรง

import { get_lagna, get_all_houses, ZODIAC_TH } from './engine.js';
import { build_natal_payload } from './interpretation.js';
import { interpret, match_rules } from './typhoon.js';

// ── Config ────────────────────────────────────────────────
const KB_PATH = './v3/kb.json'; // path จาก root (index.html อยู่ root)

// ── State ─────────────────────────────────────────────────
let _v3KbRules = null;  // cached kb rules
let _v3Running = false; // ป้องกัน double-click

// ── Init ───────────────────────────────────────────────────
/**
 * โหลด kb.json ครั้งเดียว — cache ไว้ใน _v3KbRules
 */
async function _loadKb() {
  if (_v3KbRules) return _v3KbRules;
  const resp = await fetch(KB_PATH);
  if (!resp.ok) throw new Error(`kb.json โหลดไม่ได้: HTTP ${resp.status}`);
  const data = await resp.json();
  // รองรับ {rules:[]} หรือ array โดยตรง
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

/**
 * อัปเดต natal info bar ตาม _natal ปัจจุบัน
 * เรียกทุกครั้งที่ switch มา tab-3
 */
function _refreshNatalBar() {
  // getNatal() exposed โดย script.js (non-module global)
  const natal = typeof getNatal === 'function' ? getNatal() : null;
  const bar = _el('v3-natal-bar');
  const noNatal = _el('v3-no-natal');
  const btn = _el('v3-btn-predict');

  if (natal && natal.pos) {
    // แสดง info bar
    _el('v3-natal-name').textContent = natal.name || '(ไม่ระบุชื่อ)';
    const dateStr = natal.d && natal.m && natal.y_be
      ? `${natal.d}/${natal.m}/${natal.y_be} · ${natal.t || ''}`
      : '';
    _el('v3-natal-date').textContent = dateStr;
    bar.classList.remove('hidden');
    noNatal.classList.add('hidden');
    btn.disabled = false;
  } else {
    bar.classList.add('hidden');
    noNatal.classList.remove('hidden');
    btn.disabled = true;
  }
  _clearResult();
}

// ── Main predict ────────────────────────────────────────────
/**
 * v3Predict() — เรียกจาก onclick บน tab-3 button
 * expose ไว้บน window เพื่อให้ HTML onclick ใช้ได้
 */
async function v3Predict() {
  if (_v3Running) return;
  const natal = typeof getNatal === 'function' ? getNatal() : null;
  if (!natal || !natal.pos) {
    _showToastV3('ยังไม่มีข้อมูลดวง — กรุณาผูกดวงก่อน');
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

/**
 * v3Copy() — คัดลอกผลพยากรณ์
 */
function v3Copy() {
  const text = _el('v3-result')?.textContent || '';
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(() => _showToastV3('คัดลอกแล้ว ✓'))
    .catch(() => _showToastV3('คัดลอกไม่ได้'));
}

/**
 * _showToastV3 — ใช้ V2 toast ถ้ามี, ไม่งั้น alert
 */
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
/**
 * ดัก switchTab ของ V2 เพื่อ refresh natal bar ทุกครั้งที่มาแท็บ 3
 * ใช้ MutationObserver แทนการแก้ script.js เพิ่มเติม
 */
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

// ── Expose to global (for HTML onclick) ─────────────────────
window.v3Predict = v3Predict;
window.v3Copy = v3Copy;

// ── Bootstrap ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _watchTab3();
  // preload kb.json in background (ไม่ต้องรอ)
  _loadKb().catch(err => console.warn('[v3tab] kb preload failed:', err));
});
