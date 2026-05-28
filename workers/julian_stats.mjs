#!/usr/bin/env node
/**
 * julian_stats.mjs
 * อ่าน data/julian_all.json → สร้าง workers/julian_stats.json (commit ไป main repo)
 * ใช้โดย session-start hook เพื่อแสดงรายงานทุก session JULIAN
 *
 * Usage: node workers/julian_stats.mjs [--verbose]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const VERBOSE  = process.argv.includes('--verbose');
const IN_FILE  = 'data/julian_all.json';
const OUT_FILE = 'workers/julian_stats.json';
const TARGET   = 500000;

function classifySource(r) {
  const n = r.notes || '';
  if (n.startsWith('astrotheme:'))   return 'astrotheme';
  if (n.startsWith('musicbrainz:'))  return 'musicbrainz';
  if (n.startsWith('astrodatabank:')) return 'astrodatabank';
  return 'wikidata';
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

if (!existsSync(IN_FILE)) {
  console.error(`ไม่พบ ${IN_FILE} — ต้อง checkout horatad/julian-data ก่อน`);
  process.exit(1);
}

const records = JSON.parse(readFileSync(IN_FILE, 'utf8'));
const total   = records.length;

// ── by_source ──────────────────────────────────────────────
const by_source = { wikidata: 0, astrotheme: 0, musicbrainz: 0, astrodatabank: 0 };
for (const r of records) {
  const src = classifySource(r);
  by_source[src] = (by_source[src] || 0) + 1;
}

// ── by_accuracy ────────────────────────────────────────────
const by_accuracy = { A: 0, B: 0, C: 0, D: 0, F: 0, '?': 0 };
for (const r of records) {
  const acc = r.accuracy || '?';
  by_accuracy[acc] = (by_accuracy[acc] || 0) + 1;
}

// ── by_tier ────────────────────────────────────────────────
const by_tier = { 1: 0, 2: 0, 3: 0 };
for (const r of records) {
  const t = r.tier || 3;
  by_tier[t] = (by_tier[t] || 0) + 1;
}

// ── aggregates ─────────────────────────────────────────────
const with_hpi        = records.filter(r => r.hpi  != null).length;
const with_importance = records.filter(r => r.importance != null).length;
const with_sitelinks  = records.filter(r => r.sitelinks  != null).length;
const imp_vals = records.filter(r => r.importance != null).map(r => r.importance);
const avg_importance  = imp_vals.length
  ? Math.round(imp_vals.reduce((s,v) => s+v, 0) / imp_vals.length * 1000) / 1000
  : null;

// ── history: preserve existing + append today ──────────────
let history = [];
if (existsSync(OUT_FILE)) {
  try {
    const prev = JSON.parse(readFileSync(OUT_FILE, 'utf8'));
    history = prev.history || [];
  } catch {}
}
const today = todayISO();
// อัปเดต entry ของวันนี้ (หรือ append ถ้ายังไม่มี)
const todayIdx = history.findIndex(h => h.date === today);
const todayEntry = { date: today, total, by_source: { ...by_source } };
if (todayIdx >= 0) {
  history[todayIdx] = todayEntry;
} else {
  history.push(todayEntry);
}
// เก็บแค่ 90 วันล่าสุด
history = history.slice(-90);

// ── compute daily delta ────────────────────────────────────
const prev = history.length >= 2 ? history[history.length - 2] : null;
const delta_today = prev ? total - prev.total : null;

// ── output ─────────────────────────────────────────────────
const stats = {
  generated: new Date().toISOString(),
  total,
  target: TARGET,
  pct: Math.round(total / TARGET * 1000) / 10,
  delta_today,
  by_source,
  by_accuracy,
  by_tier,
  with_hpi,
  with_importance,
  with_sitelinks,
  avg_importance,
  history,
};

writeFileSync(OUT_FILE, JSON.stringify(stats, null, 2));
console.log(`✅ julian_stats.json updated: ${total.toLocaleString()} records (${stats.pct}% of target)`);

if (VERBOSE) {
  console.log('\nBy source:');
  Object.entries(by_source).forEach(([k,v]) => v > 0 && console.log(`  ${k}: ${v.toLocaleString()}`));
  console.log('\nBy accuracy:', JSON.stringify(by_accuracy));
  console.log('By tier:', JSON.stringify(by_tier));
  console.log(`With HPI: ${with_hpi} | With importance: ${with_importance}`);
  if (delta_today !== null) console.log(`Delta today: ${delta_today >= 0 ? '+' : ''}${delta_today}`);
}
