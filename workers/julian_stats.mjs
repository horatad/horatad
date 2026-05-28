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

// ── genealogy + succession (research asset อันดับ 1) ───────────────────────
// in-DB links = ความเชื่อมโยงที่ "ทั้งสองฝั่งอยู่ใน DB" → ใช้ทำ relational astrology ได้จริง
// (raw = ดึงมาทั้งหมด, in_db = นับเฉพาะที่ปลายทางก็อยู่ใน DB — เหมือน index_builder)
const dbQIDs = new Set(
  records
    .map(r => r.qid || (r.source?.startsWith('wikidata:') ? r.source.slice(9) : null))
    .filter(Boolean)
);

function statFamily(file) {
  if (!existsSync(file)) return { status: 'missing', raw_persons: 0, in_db_persons: 0, in_db_links: 0, by_relation: { father: 0, mother: 0, spouse: 0, child: 0, sibling: 0 } };
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  const by_relation = { father: 0, mother: 0, spouse: 0, child: 0, sibling: 0 };
  let in_db_persons = 0, in_db_links = 0;
  for (const rel of Object.values(raw)) {
    let personHas = 0;
    if (rel.p && dbQIDs.has(rel.p)) { by_relation.father++; personHas++; }
    if (rel.m && dbQIDs.has(rel.m)) { by_relation.mother++; personHas++; }
    for (const q of (rel.sp || [])) if (dbQIDs.has(q)) { by_relation.spouse++;  personHas++; }
    for (const q of (rel.ch || [])) if (dbQIDs.has(q)) { by_relation.child++;   personHas++; }
    for (const q of (rel.si || [])) if (dbQIDs.has(q)) { by_relation.sibling++; personHas++; }
    if (personHas) { in_db_persons++; in_db_links += personHas; }
  }
  return { status: 'ok', raw_persons: Object.keys(raw).length, in_db_persons, in_db_links, by_relation };
}

function statSuccession(file) {
  if (!existsSync(file)) return { status: 'missing', raw_persons: 0, in_db_persons: 0, in_db_links: 0 };
  const raw = JSON.parse(readFileSync(file, 'utf8'));
  let in_db_persons = 0, in_db_links = 0;
  for (const rel of Object.values(raw)) {
    let personHas = 0;
    for (const e of (rel.prev || [])) if (dbQIDs.has(e.q)) { personHas++; }
    for (const e of (rel.next || [])) if (dbQIDs.has(e.q)) { personHas++; }
    if (personHas) { in_db_persons++; in_db_links += personHas; }
  }
  return { status: 'ok', raw_persons: Object.keys(raw).length, in_db_persons, in_db_links };
}

const genealogy  = statFamily('data/julian_family.json');
const succession = statSuccession('data/julian_succession.json');

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
  // genealogy + succession = research asset อันดับ 1 (รายงานก่อน record count เสมอ)
  genealogy,
  succession,
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

// genealogy/succession รายงานก่อนเสมอ (research asset อันดับ 1)
const g = genealogy, s = succession;
console.log(`🧬 Genealogy : ${g.in_db_links.toLocaleString()} in-DB links · ${g.in_db_persons.toLocaleString()} persons (raw ${g.raw_persons.toLocaleString()})${g.status === 'missing' ? ' ⚠️ data/julian_family.json ไม่พบ' : ''}`);
console.log(`👑 Succession: ${s.in_db_links.toLocaleString()} in-DB links · ${s.in_db_persons.toLocaleString()} persons (raw ${s.raw_persons.toLocaleString()})${s.status === 'missing' ? ' ⚠️ data/julian_succession.json ไม่พบ' : ''}`);
console.log(`✅ julian_stats.json updated: ${total.toLocaleString()} records (${stats.pct}% of target)`);

if (VERBOSE) {
  if (g.status === 'ok') console.log('\nGenealogy by relation (in-DB):', JSON.stringify(g.by_relation));
  console.log('\nBy source:');
  Object.entries(by_source).forEach(([k,v]) => v > 0 && console.log(`  ${k}: ${v.toLocaleString()}`));
  console.log('\nBy accuracy:', JSON.stringify(by_accuracy));
  console.log('By tier:', JSON.stringify(by_tier));
  console.log(`With HPI: ${with_hpi} | With importance: ${with_importance}`);
  if (delta_today !== null) console.log(`Delta today: ${delta_today >= 0 ? '+' : ''}${delta_today}`);
}
