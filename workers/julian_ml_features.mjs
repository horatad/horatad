#!/usr/bin/env node
/**
 * julian_ml_features.mjs
 * Build sign-level ML feature vectors for CNN training.
 *
 * Input:  data/julian_events.jsonl + v3/engine.js
 * Output: data/julian_ml_features.jsonl
 *
 * Feature per event (compact — ~100 bytes each):
 *   natal[10]    — natal planet sign indices 0-11 (SU,MO,MA,ME,JU,VE,SA,RA,KE,MR)
 *   transit[10]  — transit planet sign indices at event_jd
 *   natal_q[10]  — quality score -2..3 for each natal planet
 *   transit_q[10]— quality score for each transit planet
 *
 * In Python/CNN: build 10×10 interaction matrix from natal × transit sign distances.
 * KE and MR have no quality mapping in engine.js → quality = 0.
 *
 * Usage: node workers/julian_ml_features.mjs [--verbose]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { get_data, getStandards } from '../v3/engine.js';

const VERBOSE = process.argv.includes('--verbose');

const JD_EPOCH_VAL = 730428;
const JD_EPOCH_MS  = Date.UTC(2000, 0, 1);

// Quality name → numeric score for ML (-2..3)
const QUALITY_SCORE = {
  'มหาอุจ':      3,
  'อุจจาวิลาส':  2,
  'อุจจาภิมุข':  1,
  'เกษตร':       1,
  'ประ':          0,
  'นิจ':         -2,
  'มหาจักร':     2,
  'จุลจักร':     1,
  'ราชาโชค':     2,
  'เทวีโชค':     2,
};

function jdToDate(jd) {
  const ms = JD_EPOCH_MS + (jd - JD_EPOCH_VAL) * 86400000;
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

// Cache JD → {signs[10], qualities[10]} — 28K unique JDs already explored
const jdCache = new Map();

function getPlanetData(jd) {
  if (jdCache.has(jd)) return jdCache.get(jd);

  const { y, m, d } = jdToDate(jd);
  let planets;
  try {
    planets = get_data(y, m, d, 6, 100.5);  // h=6 สุริยยาตร์ convention, lng=100.5 Bangkok
  } catch (_) {
    return null;
  }
  if (!Array.isArray(planets) || planets.length < 10) return null;

  const signs     = [];
  const qualities = [];

  for (let i = 0; i < 10; i++) {
    const p    = planets[i];
    // sign: prefer p.sign, fallback to degree/30
    const sign = typeof p?.sign === 'number'
      ? p.sign
      : Math.floor(((p?.longitude ?? p?.deg ?? 0) % 360 + 360) % 360 / 30);
    signs.push(sign & 0xf); // clamp 0-11

    // quality: KE (8) and MR (9) have no mapping → 0
    let q = 0;
    if (i < 8) {
      try {
        const stds = getStandards(i, sign);
        if (stds && typeof stds === 'object') {
          let bestVal = -Infinity, bestKey = null;
          for (const [k, v] of Object.entries(stds)) {
            if (typeof v === 'number' && v > bestVal) { bestVal = v; bestKey = k; }
          }
          q = QUALITY_SCORE[bestKey] ?? 0;
        }
      } catch (_) {}
    }
    qualities.push(q);
  }

  const result = { signs, qualities };
  jdCache.set(jd, result);
  return result;
}

function main() {
  if (!existsSync('data/julian_events.jsonl')) {
    console.error('data/julian_events.jsonl not found — run julian_event_scraper.mjs first');
    process.exit(1);
  }

  const rawLines = readFileSync('data/julian_events.jsonl', 'utf8').split('\n').filter(Boolean);
  console.log(`Event lines: ${rawLines.length}`);

  // Deduplicate (person_key, event_type, event_jd)
  const seen    = new Set();
  const events  = [];
  for (const line of rawLines) {
    try {
      const ev  = JSON.parse(line);
      const key = `${ev.person_key}|${ev.event_type}|${ev.event_jd}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push(ev);
    } catch (_) {}
  }
  console.log(`Unique events: ${events.length}`);

  let ok = 0, skip = 0;
  const output = [];

  for (const ev of events) {
    const natal   = getPlanetData(ev.birth_jd);
    const transit = getPlanetData(ev.event_jd);
    if (!natal || !transit) { skip++; continue; }

    output.push(JSON.stringify({
      person_key: ev.person_key,
      event_type: ev.event_type,
      confidence: ev.confidence ?? 0.9,
      natal:      natal.signs,
      transit:    transit.signs,
      natal_q:    natal.qualities,
      transit_q:  transit.qualities,
    }));
    ok++;

    if (VERBOSE && ok % 5000 === 0) process.stderr.write(`  ${ok}/${events.length} features\r`);
  }

  writeFileSync('data/julian_ml_features.jsonl', output.join('\n') + '\n');
  console.log(`\nWrote data/julian_ml_features.jsonl (${ok} features, ${skip} skipped)`);

  // Label distribution
  const dist = {};
  for (const line of output) {
    const f = JSON.parse(line);
    dist[f.event_type] = (dist[f.event_type] || 0) + 1;
  }
  console.log('\n── Label Distribution ──');
  for (const [type, count] of Object.entries(dist).sort((a, b) => b[1] - a[1])) {
    const bar = '█'.repeat(Math.round(count / 500));
    console.log(`  ${type.padEnd(20)} ${String(count).padStart(6)}  ${bar}`);
  }
}

main();
