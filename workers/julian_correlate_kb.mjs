#!/usr/bin/env node
/**
 * julian_correlate_kb.mjs
 * Query JULIAN records by natal quality condition → empirical support for KB rules.
 *
 * Input:  data/julian_all.json
 *         data/julian_positions_by_jd.json
 *         data/julian_events.jsonl  (optional — เพิ่ม event breakdown)
 *
 * Usage:
 *   node workers/julian_correlate_kb.mjs --planet SU --quality มหาอุจ
 *   node workers/julian_correlate_kb.mjs --planet JU --quality เกษตร
 *   node workers/julian_correlate_kb.mjs --rule "SU:มหาอุจ,JU:เกษตร"
 *   node workers/julian_correlate_kb.mjs --stats
 *   node workers/julian_correlate_kb.mjs --planet SU --quality มหาอุจ --json
 *
 * Output: human-readable table, or JSON (--json) for BIBLE empirical_p pipeline
 */

import { readFileSync, existsSync } from 'fs';
import { getStandards } from '../v3/engine.js';

// planets ใน positions_by_jd.json — index 0=SU..9=MR (ไม่มี LA)
const PLANET_ORDER = ['SU','MO','MA','ME','JU','VE','SA','RA','KE','MR'];
const PLANET_TO_IDX = Object.fromEntries(PLANET_ORDER.map((p, i) => [p, i]));

// ── CLI args ──────────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const getArg  = flag => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };
const hasFlag = flag => args.includes(flag);

const PLANET     = getArg('--planet');   // SU / MO / MA ...
const QUALITY    = getArg('--quality');  // มหาอุจ / เกษตร / นิจ ...
const RULE_STR   = getArg('--rule');     // "SU:มหาอุจ,JU:เกษตร"
const SHOW_STATS = hasFlag('--stats');
const JSON_OUT   = hasFlag('--json');
const TOP_N      = parseInt(getArg('--top') || '5');

// ── Load data ─────────────────────────────────────────────────────────────────
if (!existsSync('data/julian_positions_by_jd.json')) {
  console.error('ERROR: data/julian_positions_by_jd.json not found');
  process.exit(1);
}
const records   = JSON.parse(readFileSync('data/julian_all.json', 'utf8'));
const posData   = JSON.parse(readFileSync('data/julian_positions_by_jd.json', 'utf8'));
const positions = posData.positions;  // { "730428": [sign0..sign9] }

// Optional events
const eventsMap = new Map();  // birth_jd → [event_type, ...]
if (existsSync('data/julian_events.jsonl')) {
  for (const line of readFileSync('data/julian_events.jsonl', 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line);
      if (!eventsMap.has(ev.birth_jd)) eventsMap.set(ev.birth_jd, []);
      eventsMap.get(ev.birth_jd).push(ev.event_type);
    } catch (_) {}
  }
}

// ── Quality helper ────────────────────────────────────────────────────────────
// positions_by_jd เก็บ sign index 0-11 → สร้าง synthetic rawPos สำหรับ getStandards
// engine rawPos: pos[i]/1800 = sign → rawPos[i] = sign * 1800 ทำให้ getStandards ถูกต้อง
// engine planet order: LA(0) SU(1)..MR(10) — offset +1 จาก feature order
function signsToQualities(signs) {
  // signs = [SU_sign, MO_sign, ..., MR_sign] (10 ค่า)
  const rawPos = new Array(11).fill(0);
  for (let i = 0; i < 10; i++) rawPos[i + 1] = signs[i] * 1800;

  const result = {};
  for (let i = 0; i < 10; i++) {
    if (i >= 8) { result[PLANET_ORDER[i]] = ''; continue; }  // KE, MR ไม่มี quality ใน TALS
    result[PLANET_ORDER[i]] = getStandards(rawPos, i + 1) || '';
  }
  return result;
}

// ── Parse rule string "SU:มหาอุจ,JU:เกษตร" → [{planet, quality}] ──────────────
function parseRule(str) {
  return str.split(',').map(part => {
    const [planet, quality] = part.trim().split(':');
    return { planet: planet?.trim(), quality: quality?.trim() };
  });
}

// ── --stats mode ──────────────────────────────────────────────────────────────
if (SHOW_STATS) {
  const dist = Object.fromEntries(PLANET_ORDER.map(p => [p, {}]));
  let counted = 0;

  for (const rec of records) {
    const signs = positions[rec.jd];
    if (!signs) continue;
    const quals = signsToQualities(signs);
    for (const [planet, q] of Object.entries(quals)) {
      if (!q) continue;
      for (const name of q.split('/')) {
        dist[planet][name] = (dist[planet][name] || 0) + 1;
      }
    }
    counted++;
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ total: counted, distribution: dist }, null, 2));
  } else {
    console.log(`\n── Quality Distribution (${counted} records with position data) ──\n`);
    for (const planet of PLANET_ORDER) {
      const entries = Object.entries(dist[planet]).sort((a, b) => b[1] - a[1]);
      if (!entries.length) { console.log(`${planet}: (ไม่มี quality mapping)`); continue; }
      console.log(`${planet}:`);
      for (const [name, cnt] of entries) {
        const pct = (cnt / counted * 100).toFixed(1);
        const bar = '█'.repeat(Math.round(pct / 2));
        console.log(`  ${name.padEnd(14)} ${String(cnt).padStart(6)}  (${pct}%)  ${bar}`);
      }
    }
  }
  process.exit(0);
}

// ── Build conditions ──────────────────────────────────────────────────────────
let conditions = [];
if (RULE_STR) {
  conditions = parseRule(RULE_STR);
} else if (PLANET && QUALITY) {
  conditions = [{ planet: PLANET, quality: QUALITY }];
} else {
  console.error([
    'Usage:',
    '  --planet SU --quality มหาอุจ',
    '  --rule "SU:มหาอุจ,JU:เกษตร"',
    '  --stats',
  ].join('\n'));
  process.exit(1);
}

for (const { planet } of conditions) {
  if (!(planet in PLANET_TO_IDX)) {
    console.error(`Unknown planet: "${planet}". Valid: ${PLANET_ORDER.join(', ')}`);
    process.exit(1);
  }
}

// ── Filter records ────────────────────────────────────────────────────────────
const matching = [];
let total = 0;

for (const rec of records) {
  const signs = positions[rec.jd];
  if (!signs) continue;
  total++;
  const quals = signsToQualities(signs);
  const ok = conditions.every(({ planet, quality }) =>
    (quals[planet] || '').split('/').includes(quality)
  );
  if (ok) matching.push(rec);
}

const hitRate = total > 0 ? matching.length / total : 0;

// ── Event breakdown ───────────────────────────────────────────────────────────
const eventMatch = {};   // event_type → count among matching
const eventAll   = {};   // event_type → count among all (with positions)

if (eventsMap.size > 0) {
  for (const rec of records) {
    if (!positions[rec.jd]) continue;
    for (const et of eventsMap.get(rec.jd) || []) {
      eventAll[et] = (eventAll[et] || 0) + 1;
    }
  }
  for (const rec of matching) {
    for (const et of eventsMap.get(rec.jd) || []) {
      eventMatch[et] = (eventMatch[et] || 0) + 1;
    }
  }
}

// ── Output ────────────────────────────────────────────────────────────────────
const ruleDesc = conditions.map(c => `${c.planet}=${c.quality}`).join(' + ');

if (JSON_OUT) {
  // empirical_p per event type: P(condition | person has this event)
  const empirical = {};
  for (const [et, cnt] of Object.entries(eventMatch)) {
    empirical[et] = +(cnt / (eventAll[et] || 1)).toFixed(4);
  }
  console.log(JSON.stringify({
    rule:          ruleDesc,
    conditions,
    total_records: total,
    matching:      matching.length,
    hit_rate:      +hitRate.toFixed(4),
    empirical_p:   empirical,
    event_counts:  eventMatch,
    baseline:      Object.fromEntries(
      Object.entries(eventAll).map(([et, cnt]) => [et, +(cnt / total).toFixed(4)])
    ),
    samples: matching.slice(0, TOP_N).map(r => ({
      name: r.name, jd: r.jd, accuracy: r.accuracy, country: r.country,
    })),
  }, null, 2));

} else {
  console.log(`\n── JULIAN KB Correlation: ${ruleDesc} ──`);
  console.log(`Records with position data : ${total}`);
  console.log(`Matching "${ruleDesc}"     : ${matching.length}  (${(hitRate * 100).toFixed(1)}%)`);

  if (Object.keys(eventMatch).length > 0) {
    console.log(`\n── Event Breakdown ──`);
    console.log(`${'Event Type'.padEnd(22)} ${'Match'.padStart(6)} ${'All'.padStart(6)} ${'P(cond|event)'.padStart(14)} ${'Baseline'.padStart(10)}`);
    console.log('─'.repeat(62));
    for (const [et, cnt] of Object.entries(eventMatch).sort((a, b) => b[1] - a[1])) {
      const allCnt    = eventAll[et] || 0;
      const condProb  = allCnt > 0 ? (cnt / allCnt).toFixed(3) : '–';
      const baseline  = allCnt > 0 ? (allCnt / total).toFixed(3) : '–';
      console.log(`${et.padEnd(22)} ${String(cnt).padStart(6)} ${String(allCnt).padStart(6)} ${String(condProb).padStart(14)} ${String(baseline).padStart(10)}`);
    }
  } else if (eventsMap.size === 0) {
    console.log('\n(ยังไม่มี data/julian_events.jsonl — event breakdown ไม่พร้อม)');
  }

  if (matching.length > 0) {
    console.log(`\n── Sample Matches (${Math.min(TOP_N, matching.length)}/${matching.length}) ──`);
    for (const r of matching.slice(0, TOP_N)) {
      const evStr = eventsMap.get(r.jd)?.join(', ') || '–';
      console.log(`  [${r.accuracy}] ${r.name.padEnd(35)} events: ${evStr}`);
    }
  }
}
