#!/usr/bin/env node
// JULIAN Astrotheme Enrichment — เพิ่ม time_utc + lat + lng จาก astrotheme.com
// ดึงเฉพาะ records ที่ยังไม่มี time_utc → ไม่ดึงซ้ำ
//
// วิธีใช้:
//   node julian_astrotheme.mjs [input.jsonl]
//   input.jsonl = JSONL จาก D1 export (field: jd, name, source)
//   ถ้าไม่ระบุ → อ่าน stdin
//
// Output: JSONL enriched → pipe เข้า julian_import.mjs
//   node julian_astrotheme.mjs input.jsonl | node julian_import.mjs /dev/stdin > enrich.sql

import { readFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { appendRaw } from './julian_raw_writer.mjs';
import { deriveAccuracy } from './julian_evidence.mjs';

const USER_AGENT  = 'JULIAN-bot/1.0 (horatad.com; empirical-astro-research)';
const DELAY_MS    = 2500;   // polite gap — astrotheme อนุญาต crawl แต่ไม่ควรถี่
const MAX_PER_RUN = 200;    // จำกัดต่อครั้ง
const BASE_URL    = 'https://www.astrotheme.com/astrology/';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── แปลงชื่อเป็น astrotheme URL path ─────────────────────────────────────────
function nameToPath(name) {
  return name
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // ลบ accent
    .replace(/[^\w\s-]/g, '')                           // ลบอักขระพิเศษ
    .trim()
    .replace(/\s+/g, '_');                              // space → _
}

// ── แปลง 12h → 24h HH:MM ──────────────────────────────────────────────────────
function to24h(h, m, ampm) {
  let hour = parseInt(h);
  const min = m.padStart(2, '0');
  if (ampm) {
    const ap = ampm.toUpperCase();
    if (ap === 'PM' && hour !== 12) hour += 12;
    if (ap === 'AM' && hour === 12) hour = 0;
  }
  return `${String(hour).padStart(2, '0')}:${min}`;
}

// ── parse HTML → { time_utc, lat, lng } ──────────────────────────────────────
function parseAstrotheme(html, _name) {
  const result = { time_utc: null, lat: null, lng: null };

  // ── Birth time patterns ────────────────────────────────────────────────────
  // Format 1: "7h24" หรือ "07h24" (European/French)
  let m = html.match(/\b(\d{1,2})h(\d{2})\b/);
  if (m) {
    result.time_utc = `${m[1].padStart(2,'0')}:${m[2]}`;
  }

  // Format 2: "7:24 AM" หรือ "07:24 PM"
  if (!result.time_utc) {
    m = html.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
    if (m) result.time_utc = to24h(m[1], m[2], m[3]);
  }

  // Format 3: "at 07:24" (24h, no AM/PM)
  if (!result.time_utc) {
    m = html.match(/\bat\s+(\d{1,2}):(\d{2})(?!\s*(?:AM|PM))/i);
    if (m) {
      const h = parseInt(m[1]);
      if (h >= 0 && h <= 23) result.time_utc = to24h(m[1], m[2], null);
    }
  }

  // ── Coordinates ────────────────────────────────────────────────────────────
  // "Latitude: 21.30° N" หรือ "-21.30"
  m = html.match(/[Ll]atitude[^\d-]*(-?\d+\.?\d*)[^\d]*([NS])?/);
  if (m) {
    let lat = parseFloat(m[1]);
    if (m[2] === 'S') lat = -lat;
    if (lat >= -90 && lat <= 90) result.lat = parseFloat(lat.toFixed(4));
  }

  m = html.match(/[Ll]ongitude[^\d-]*(-?\d+\.?\d*)[^\d]*([EW])?/);
  if (m) {
    let lng = parseFloat(m[1]);
    if (m[2] === 'W') lng = -lng;
    if (lng >= -180 && lng <= 180) result.lng = parseFloat(lng.toFixed(4));
  }

  return result;
}

// ── Fetch + parse 1 person ────────────────────────────────────────────────────
async function enrichOne(record) {
  // ถ้า source มี astrotheme: prefix → ใช้ path ตรงจาก Wikidata P3447 (แม่นกว่า guess ชื่อ)
  const path = record.source?.startsWith('astrotheme:')
    ? record.source.slice('astrotheme:'.length)
    : nameToPath(record.name);
  if (!path) return null;

  const url = `${BASE_URL}${encodeURIComponent(path)}`;

  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
    });

    if (resp.status === 404) {
      console.error(`  404: ${record.name}`);
      return null;
    }
    if (!resp.ok) {
      console.error(`  HTTP ${resp.status}: ${record.name}`);
      return null;
    }

    const html    = await resp.text();
    const parsed  = parseAstrotheme(html, record.name);

    if (!parsed.time_utc && !parsed.lat) {
      console.log(`  no data: ${record.name}`);
      return null;
    }

    console.log(`  ✓ ${record.name}: time=${parsed.time_utc ?? '-'} lat=${parsed.lat ?? '-'} lng=${parsed.lng ?? '-'}`);

    const enriched = {
      jd:              record.jd,
      name:            record.name,
      event_label:     record.event_label ?? null,
      type:            record.type ?? 'human',
      country:         record.country ?? null,
      tier:            record.tier ?? null,
      lat:             parsed.lat,
      lng:             parsed.lng,
      time_utc:        parsed.time_utc,
      lagna_sign:      null,
      relate_id:       record.relate_id ?? null,
      source:          record.source ?? `astrotheme:${path}`,
      source_type:     'internet',
      validated_count: 0,
      confidence:      parsed.time_utc ? 0.97 : 0.87,
      notes:           null,
    };
    // Accuracy derived from evidence — never hardcoded
    const { grade } = deriveAccuracy(enriched);
    return { ...enriched, accuracy: grade };

  } catch (e) {
    console.error(`  error: ${record.name} — ${e.message}`);
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  // อ่าน JSONL จาก file หรือ stdin
  let lines = [];
  const inputFile = process.argv[2];

  if (inputFile && existsSync(inputFile)) {
    lines = readFileSync(inputFile, 'utf8').trim().split('\n').filter(Boolean);
  } else {
    // อ่านจาก stdin
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) {
      if (line.trim()) lines.push(line.trim());
    }
  }

  if (!lines.length) {
    console.error('No input records');
    process.exit(1);
  }

  // เฉพาะ records ที่ยังไม่มี time_utc
  const records = lines
    .map(l => { try { return JSON.parse(l); } catch (_) { return null; } })
    .filter(r => r && !r.time_utc)
    .slice(0, MAX_PER_RUN);

  console.log(`Astrotheme enrichment: ${records.length} records to enrich (max ${MAX_PER_RUN})`);

  let enriched = 0;
  for (const record of records) {
    await sleep(DELAY_MS);
    const result = await enrichOne(record);
    if (result) {
      process.stdout.write(JSON.stringify(result) + '\n');
      appendRaw('astrotheme', result);
      enriched++;
    }
  }

  console.error(`Done: ${enriched}/${records.length} enriched`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
