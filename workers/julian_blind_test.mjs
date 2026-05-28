#!/usr/bin/env node
/**
 * julian_blind_test.mjs
 * Blind group cross-validation สำหรับ SU×SA polarity finding
 *
 * วิธี: แบ่ง persons เป็น K กลุ่มด้วย deterministic hash (QID-based)
 * แล้ว compute SU×SA lift แยกในแต่ละกลุ่ม — ถ้า pattern สม่ำเสมอ = robust
 *
 * ยังเพิ่ม stratified analysis:
 *   --era     แบ่งตาม birth decade (before/after 1950)
 *   --country แบ่งตาม birth country (US/EU/TH/other)
 *   --kfold N (default 5) จำนวน random groups
 *
 * Input:  data/julian_events.jsonl
 * Usage:  node workers/julian_blind_test.mjs [--kfold 5] [--era] [--country]
 */

import { readFileSync } from 'fs';
import { get_data } from '../v3/engine.js';

const EVENTS_FILE    = 'data/julian_events.jsonl';
const JD_EPOCH_VAL   = 730428;
const JD_EPOCH_MS    = Date.UTC(2000, 0, 1);
const CONFIDENCE_MIN = 0.85;
const K              = (() => { const i = process.argv.indexOf('--kfold'); return i>=0 ? parseInt(process.argv[i+1]) : 5; })();
const DO_ERA         = process.argv.includes('--era');
const DO_COUNTRY     = process.argv.includes('--country');

// SU=0, SA=6 (planet index in signs array, 0-based, engineIdx-1)
const SU_IDX = 0;
const SA_IDX = 6;
const HARD   = new Set([1, 3, 5]); // dist1=30°, squa=90°, dist5=150°
const SOFT   = new Set([0, 2, 4, 6]); // conj=0°, sext=60°, trin=120°, oppo=180°
const ASPECT_NAMES = {0:'conj',1:'dist1',2:'sext',3:'squa',4:'trin',5:'dist5',6:'oppo'};

function jdToDate(jd) {
  const ms = JD_EPOCH_MS + (jd - JD_EPOCH_VAL) * 86400000;
  const dt  = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth()+1, d: dt.getUTCDate() };
}

const jdCache = new Map();
function getSigns(jd) {
  if (jdCache.has(jd)) return jdCache.get(jd);
  const { y, m, d } = jdToDate(jd);
  let raw;
  try { raw = get_data(d, m, y, 6, 0); } catch (_) { jdCache.set(jd,null); return null; }
  if (!Array.isArray(raw) || raw.length < 11) { jdCache.set(jd,null); return null; }
  const signs = [];
  for (let i = 1; i <= 10; i++) signs.push(Math.trunc(raw[i] / 1800) % 12);
  jdCache.set(jd, signs);
  return signs;
}

// Deterministic hash ของ string → 0..K-1
function hashGroup(str, k) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h % k;
}

// ── Load events ───────────────────────────────────────────────────────────────
console.log('Loading events...');
const lines  = readFileSync(EVENTS_FILE, 'utf8').split('\n').filter(Boolean);
const events = [];
for (const l of lines) {
  try {
    const ev = JSON.parse(l);
    if ((ev.confidence ?? 0.9) >= CONFIDENCE_MIN) events.push(ev);
  } catch (_) {}
}
console.log(`Events: ${events.length}`);

// ── Build records ─────────────────────────────────────────────────────────────
console.log('Computing positions...');
const records = [];
const seen = new Set();
for (const ev of events) {
  const key = `${ev.person_key}|${ev.event_type}|${ev.event_jd}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const natal   = getSigns(ev.birth_jd);
  const transit = getSigns(ev.event_jd);
  if (!natal || !transit) continue;
  const birthYear = jdToDate(ev.birth_jd).y;
  records.push({
    event_type: ev.event_type,
    natal, transit,
    birth_year: birthYear,
    country: ev.country ?? 'unknown',
    person_key: ev.person_key ?? String(ev.birth_jd),
  });
}
console.log(`Records: ${records.length}\n`);

// ── Core lift function ────────────────────────────────────────────────────────
function computeSUsaLift(subset, all) {
  // Returns { aspect → { event_type → lift } }
  const result = {};
  const eventTypes = ['death','award_received','position_start'];

  for (let asp = 0; asp <= 6; asp++) {
    result[asp] = {};
    for (const et of eventTypes) {
      const classRecs = subset.filter(r => r.event_type === et);
      const allRecs   = all;
      if (classRecs.length < 30 || allRecs.length < 30) continue;

      let classN = 0, allN = 0;
      for (const r of classRecs) {
        const dist = Math.min(Math.abs(r.transit[SU_IDX] - r.natal[SA_IDX]),
                              12 - Math.abs(r.transit[SU_IDX] - r.natal[SA_IDX]));
        if (dist === asp) classN++;
      }
      for (const r of allRecs) {
        const dist = Math.min(Math.abs(r.transit[SU_IDX] - r.natal[SA_IDX]),
                              12 - Math.abs(r.transit[SU_IDX] - r.natal[SA_IDX]));
        if (dist === asp) allN++;
      }
      if (allN === 0) continue;
      const lift = (classN / classRecs.length) / (allN / allRecs.length);
      result[asp][et] = { lift, classN, classTotal: classRecs.length, allN, allTotal: allRecs.length };
    }
  }
  return result;
}

// Summarize: hard→death, soft→award consistency
function summarizePolarity(liftMap) {
  const hardDeathOk   = [1,3,5].filter(asp => (liftMap[asp]?.death?.lift ?? 1) > 1.0).length;
  const softAwardOk   = [0,2,4,6].filter(asp => (liftMap[asp]?.award_received?.lift ?? 1) > 1.0).length;
  const hardAwardDown = [1,3,5].filter(asp => (liftMap[asp]?.award_received?.lift ?? 1) < 1.0).length;
  const softDeathDown = [0,2,4,6].filter(asp => (liftMap[asp]?.death?.lift ?? 1) < 1.0).length;
  return {
    hard_death_up  : `${hardDeathOk}/3`,
    soft_award_up  : `${softAwardOk}/4`,
    hard_award_down: `${hardAwardDown}/3`,
    soft_death_down: `${softDeathDown}/4`,
    score: hardDeathOk + softAwardOk + hardAwardDown + softDeathDown,
    max  : 14,
  };
}

// ── TEST 1: K-fold random split ───────────────────────────────────────────────
console.log(`═══ TEST 1: ${K}-fold random split (QID hash) ═══`);
console.log('ถ้า pattern สม่ำเสมอทุก fold = ไม่ใช่ artifact จาก subsample\n');
console.log('fold  n_records  hard→death(3/3)  soft→award(4/4)  hard→award↓(3/3)  soft→death↓(4/4)  score');
console.log('─'.repeat(100));

const foldScores = [];
for (let k = 0; k < K; k++) {
  const fold = records.filter(r => hashGroup(r.person_key, K) === k);
  if (fold.length < 100) { console.log(`fold ${k}: n=${fold.length} (too small)`); continue; }
  const liftMap = computeSUsaLift(fold, fold);
  const s = summarizePolarity(liftMap);
  foldScores.push(s.score);
  const pct = Math.round(s.score / s.max * 100);
  console.log(
    `  ${k}   ${String(fold.length).padStart(8)}    ${s.hard_death_up.padEnd(14)}   ${s.soft_award_up.padEnd(14)}   ${s.hard_award_down.padEnd(16)}   ${s.soft_death_down.padEnd(16)}   ${s.score}/${s.max} (${pct}%)`
  );
}
const avgScore = foldScores.reduce((a,b)=>a+b,0) / foldScores.length;
console.log(`\n  Average score: ${avgScore.toFixed(1)}/14`);
console.log(avgScore >= 12 ? '  ✅ Pattern consistent across all folds' :
            avgScore >= 10 ? '  ⚠️  Pattern mostly consistent, some noise' :
                             '  ❌ Pattern inconsistent — may be artifact');

// ── TEST 2: Era split ─────────────────────────────────────────────────────────
if (DO_ERA) {
  console.log('\n═══ TEST 2: Era split (before/after 1950) ═══');
  console.log('ถ้า pattern ตรงกันทั้ง 2 ยุค = ไม่ใช่ cohort effect จาก SA orbit\n');

  const eras = { 'pre-1950': records.filter(r=>r.birth_year<1950),
                 '1950+':    records.filter(r=>r.birth_year>=1950) };
  for (const [era, group] of Object.entries(eras)) {
    if (group.length < 100) { console.log(`${era}: n=${group.length} (too small)`); continue; }
    const liftMap = computeSUsaLift(group, group);
    const s = summarizePolarity(liftMap);
    console.log(`${era.padEnd(12)} n=${group.length.toString().padStart(6)}  score=${s.score}/${s.max}  ` +
      `hard→death:${s.hard_death_up}  soft→award:${s.soft_award_up}  ` +
      `hard→award↓:${s.hard_award_down}  soft→death↓:${s.soft_death_down}`);
  }
}

// ── TEST 3: Country split ─────────────────────────────────────────────────────
if (DO_COUNTRY) {
  console.log('\n═══ TEST 3: Geographic split ═══');
  console.log('ถ้า pattern ตรงกันทุกภูมิภาค = ไม่ใช่ cultural/reporting bias\n');

  const regions = {};
  for (const r of records) {
    const c = r.country ?? 'unknown';
    const region = ['US','GB','CA','AU'].includes(c) ? 'Anglo' :
                   ['DE','FR','IT','ES','NL','PL'].includes(c) ? 'Europe' :
                   ['TH','JP','CN','KR','IN'].includes(c) ? 'Asia' : 'Other';
    (regions[region] ||= []).push(r);
  }
  for (const [region, group] of Object.entries(regions).sort((a,b)=>b[1].length-a[1].length)) {
    if (group.length < 100) { console.log(`${region}: n=${group.length} (too small)`); continue; }
    const liftMap = computeSUsaLift(group, group);
    const s = summarizePolarity(liftMap);
    console.log(`${region.padEnd(8)} n=${group.length.toString().padStart(6)}  score=${s.score}/${s.max}  ` +
      `hard→death:${s.hard_death_up}  soft→award:${s.soft_award_up}`);
  }
}

// ── VERDICT ───────────────────────────────────────────────────────────────────
console.log('\n═══ BLIND TEST VERDICT ═══');
console.log(`K=${K} folds | avg consistency score: ${avgScore?.toFixed(1)}/14`);
if (avgScore >= 12) {
  console.log('✅ SU×SA polarity pattern ROBUST across random blind groups');
  console.log('   Selection bias / sample fluke explanation is unlikely');
} else if (avgScore >= 9) {
  console.log('⚠️  Pattern partially robust — some folds show deviation');
  console.log('   May need larger dataset or tighter aspect orb');
} else {
  console.log('❌ Pattern NOT robust — fails blind group test');
  console.log('   Original finding may be overfitted to full dataset');
}
