#!/usr/bin/env node
// pre_push_check.mjs — ตรวจก่อน push ทุกครั้ง
// รัน: node scripts/verify/pre_push_check.mjs
// ผ่านทั้งหมด → push ได้ | fail → แก้ก่อน

import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../');
const read = f => readFileSync(resolve(ROOT, f), 'utf8');

// ── อ่านไฟล์หลักครั้งเดียว (shared across all checks) ─────────
const HTML     = read('index.html');
const SCRIPT   = read('script.js');
const V3TAB    = read('v3/v3tab.js');

// รวม window exports จาก module scripts
const WINDOW_EXPORTS = new Set();
for (const m of (SCRIPT + '\n' + V3TAB).matchAll(/window\.([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g)) {
  WINDOW_EXPORTS.add(m[1]);
}
// non-module scripts (auth-pin.js ฯลฯ) — top-level functions เป็น global อัตโนมัติ
for (const sm of HTML.matchAll(/<script\s+src="([^"]+)"(?![^>]*type="module")[^>]*>/gi)) {
  const src = sm[1].split('?')[0];
  if (!existsSync(resolve(ROOT, src))) continue;
  for (const fm of read(src).matchAll(/^function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm)) {
    WINDOW_EXPORTS.add(fm[1]);
  }
}

// ── Helpers ────────────────────────────────────────────────────
let passed = 0, failed = 0;
const warnings = [];

function pass(label) { console.log(`  ✅ ${label}`); passed++; }
function fail(label, detail) {
  console.log(`  ❌ ${label}`);
  if (detail) detail.forEach(d => console.log(`       ${d}`));
  failed++;
}
function warn(label) { console.log(`  ⚠️  ${label}`); warnings.push(label); }

// ──────────────────────────────────────────────────────────────
// 1. Version sync
// ──────────────────────────────────────────────────────────────
console.log('\n📌 1. Version sync');
{
  const vJson = JSON.parse(read('version.json'));
  const V = vJson.v;
  if (!/^\d+\.\d+\.\d+$/.test(V)) {
    fail('version.json semver', [`"v": "${V}" ไม่ใช่ semver`]);
  } else {
    const checks = [
      ['script.js',  /HORATAD:SCRIPT:(\d+\.\d+\.\d+)/,              'HORATAD:SCRIPT'],
      ['script.js',  /^const APP_VERSION='(\d+\.\d+\.\d+)'/m,       'APP_VERSION'],
      ['sw.js',      /HORATAD:SW:(\d+\.\d+\.\d+)/,                  'HORATAD:SW'],
      ['sw.js',      /const CACHE_NAME='horatad-v(\d+\.\d+\.\d+)'/, 'CACHE_NAME'],
      ['style.css',  /HORATAD:STYLE:(\d+\.\d+\.\d+)/,               'HORATAD:STYLE'],
      ['index.html', /HORATAD:INDEX:(\d+\.\d+\.\d+)/,               'HORATAD:INDEX'],
      ['index.html', /style\.css\?v=(\d+\.\d+\.\d+)/,               'style.css?v='],
      ['index.html', /script\.js\?v=(\d+\.\d+\.\d+)/,               'script.js?v='],
      ['index.html', /v3tab\.js\?v=(\d+\.\d+\.\d+)/,                'v3tab.js?v='],
    ];
    const mismatches = [];
    for (const [file, pattern, label] of checks) {
      const m = read(file).match(pattern);
      if (!m) mismatches.push(`${file}: ${label} — pattern ไม่พบ`);
      else if (m[1] !== V) mismatches.push(`${file}: ${label} = ${m[1]} (ควรเป็น ${V})`);
    }
    if (mismatches.length) fail(`Version sync (canonical = ${V})`, mismatches);
    else pass(`ทุกไฟล์ตรงกัน (v${V})`);
  }
}

// ──────────────────────────────────────────────────────────────
// 2. JS Syntax check
// ──────────────────────────────────────────────────────────────
console.log('\n📌 2. JS Syntax check');
{
  const jsFiles = [
    'script.js', 'sw.js', 'auth-pin.js',
    'v3/v3tab.js', 'v3/engine.js', 'v3/interpretation.js',
    'v3/typhoon.js', 'v3/matcher.js', 'v3/standards.js', 'v3/tts.js',
  ];
  const syntaxErrors = [];
  for (const f of jsFiles) {
    const fullPath = resolve(ROOT, f);
    if (!existsSync(fullPath)) { warn(`ไม่พบไฟล์: ${f}`); continue; }
    try {
      execSync(`node --check "${fullPath}"`, { stdio: 'pipe' });
    } catch (e) {
      syntaxErrors.push(`${f}: ${e.stderr?.toString().split('\n')[0] || 'syntax error'}`);
    }
  }
  if (syntaxErrors.length) fail('JS syntax errors', syntaxErrors);
  else pass(`ทุกไฟล์ผ่าน syntax check (${jsFiles.length} ไฟล์)`);
}

// ──────────────────────────────────────────────────────────────
// 3. Window exports audit — onclick/onchange ใน HTML → window.xxx
// ──────────────────────────────────────────────────────────────
console.log('\n📌 3. Window exports audit (onclick/onchange → window.xxx)');
{
  const EVENT_ATTRS = ['onclick','onchange','oninput','onsubmit','onkeydown','onkeyup',
                       'onfocus','onblur','ontouchstart','onmousedown'];
  const handlerRe = new RegExp(`(?:${EVENT_ATTRS.join('|')})="([^"]*)"`, 'gi');

  const SKIP = new Set([
    'if','for','while','do','switch','return','typeof','instanceof','new','delete','void','throw',
    'alert','confirm','prompt','console','document','window','location','history',
    'setTimeout','setInterval','clearTimeout','clearInterval','fetch','Promise',
    'parseInt','parseFloat','isNaN','isFinite','encodeURIComponent','decodeURIComponent',
    'JSON','Math','Date','Array','Object','String','Boolean','Number','Error',
  ]);

  const missing = [];
  const seen = new Set();
  for (const m of HTML.matchAll(handlerRe)) {
    const fnMatch = m[1].trim().match(/^([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/);
    if (!fnMatch) continue;
    const fn = fnMatch[1];
    if (SKIP.has(fn) || seen.has(fn)) continue;
    seen.add(fn);
    if (!WINDOW_EXPORTS.has(fn)) {
      missing.push(`"${fn}" — ใช้ใน HTML แต่ไม่มี window.${fn}`);
    }
  }
  if (missing.length) fail(`Window exports ขาด (${missing.length} รายการ)`, missing);
  else pass(`ทุก handler มี window export ครบ (${seen.size} handlers ตรวจแล้ว)`);
}

// ──────────────────────────────────────────────────────────────
// 4. Cross-module globals — typeof xxx === 'function' ใน v3tab.js
//    จับ bug แบบ V3.3.53: getNatal/getTransit ขาด window export
// ──────────────────────────────────────────────────────────────
console.log('\n📌 4. Cross-module globals (v3tab.js → window.xxx)');
{
  const crossMissing = [];
  const crossSeen = new Set();
  for (const m of V3TAB.matchAll(/typeof\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*===\s*['"]function['"]/g)) {
    const name = m[1];
    if (crossSeen.has(name)) continue;
    crossSeen.add(name);
    if (!WINDOW_EXPORTS.has(name)) {
      crossMissing.push(`v3tab.js: typeof ${name} === 'function' แต่ไม่มี window.${name}`);
    }
  }
  if (crossMissing.length) fail('Cross-module globals ขาด', crossMissing);
  else pass('Cross-module globals ครบ');
}

// ──────────────────────────────────────────────────────────────
// 5. KB JSON validity
// ──────────────────────────────────────────────────────────────
console.log('\n📌 5. KB JSON validity');
{
  const kbFiles = [
    'v3/kb.json', 'v3/kb_v24-3.json', 'v3/kb_embedded.json',
    'v3/kb_tals.json', 'v3/kb_transit.json',
  ];
  const jsonErrors = [];
  for (const f of kbFiles) {
    if (!existsSync(resolve(ROOT, f))) { warn(`ไม่พบ: ${f}`); continue; }
    try { JSON.parse(read(f)); }
    catch (e) { jsonErrors.push(`${f}: ${e.message}`); }
  }
  if (jsonErrors.length) fail('KB JSON parse errors', jsonErrors);
  else pass(`ทุก KB JSON valid (${kbFiles.length} ไฟล์)`);
}

// ── Summary ────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50));
const total = passed + failed;
if (failed === 0) {
  console.log(`✅ ผ่านทั้งหมด ${total}/${total} checks${warnings.length ? ` (⚠️ ${warnings.length} warnings)` : ''}`);
  console.log('→ พร้อม push ✓\n');
  process.exit(0);
} else {
  console.log(`❌ ไม่ผ่าน ${failed}/${total} checks`);
  console.log('→ แก้ก่อน แล้วรัน script นี้ใหม่\n');
  process.exit(1);
}
