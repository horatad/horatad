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

import { readFileSync, existsSync, appendFileSync } from 'fs';
import { createInterface } from 'readline';

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

// ── parse HTML → { time_utc, lat, lng, confidence, rejected_reasons } ───────
// นโยบาย: unsure → null (skip ดีกว่า save ผิด)
// Validation layers:
//   1. Context-aware — ต้องมี keyword "birth time" ใกล้ๆ ก่อน match
//   2. Cross-validate — ลอง 3 formats, ถ้าได้ time ต่างกัน → reject
//   3. Blacklist — กรอง default times (12:00, 00:00, 11:00) ที่บอกว่า "unknown"
//   4. Range check — hour 0-23, min 0-59
const TIME_KEYWORDS = /(birth\s+time|time\s+of\s+birth|heure\s+de\s+naissance|hora\s+de\s+nacimiento|nato\s+il|geboren\s+um|born\s+at|เวลาเกิด)/i;
const COORD_KEYWORDS = /(latitude|coordinates|coord(onn[eé]es|\.)?\s*g[eé]ographiques|พิกัด)/i;
const DEFAULT_TIME_BLACKLIST = new Set(['12:00', '00:00', '11:00', '12:30']);

function parseAstrotheme(html, name) {
  const result = {
    time_utc: null,
    lat: null,
    lng: null,
    confidence: 0,
    rejected_reasons: [],
  };

  // Strip HTML tags + collapse whitespace สำหรับ context analysis
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

  // ── Birth time: context-aware extraction ─────────────────────────────────
  const ctxMatch = plain.match(TIME_KEYWORDS);

  if (!ctxMatch) {
    result.rejected_reasons.push('no_birth_keyword');
  } else {
    const ctxStart = Math.max(0, ctxMatch.index);
    const ctxEnd   = Math.min(plain.length, ctxMatch.index + 300);
    const window   = plain.slice(ctxStart, ctxEnd);

    // ลอง 3 formats แล้ว cross-validate
    const candidates = [];

    // Format 1: European "7h24" / "07h24"
    let m = window.match(/\b(\d{1,2})h(\d{2})\b/);
    if (m && +m[1] <= 23 && +m[2] <= 59) {
      candidates.push({ fmt: 'euro', t: `${m[1].padStart(2,'0')}:${m[2]}` });
    }

    // Format 2: 12-hour "7:24 AM"
    m = window.match(/\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i);
    if (m && +m[1] >= 1 && +m[1] <= 12 && +m[2] <= 59) {
      candidates.push({ fmt: 'ampm', t: to24h(m[1], m[2], m[3]) });
    }

    // Format 3: 24-hour "at 07:24" (no AM/PM)
    m = window.match(/\b(\d{1,2}):(\d{2})(?!\s*(?:AM|PM))/i);
    if (m && +m[1] <= 23 && +m[2] <= 59) {
      const t = to24h(m[1], m[2], null);
      if (!candidates.find(c => c.t === t)) candidates.push({ fmt: '24h', t });
    }

    if (candidates.length === 0) {
      result.rejected_reasons.push('no_time_pattern_in_context');
    } else {
      // Blacklist common defaults
      const filtered = candidates.filter(c => !DEFAULT_TIME_BLACKLIST.has(c.t));

      if (filtered.length === 0) {
        result.rejected_reasons.push(`blacklist_default: ${candidates[0].t}`);
      } else {
        // Cross-validate: ถ้าหลาย format ต้องตรงกัน
        const unique = [...new Set(filtered.map(c => c.t))];
        if (unique.length > 1) {
          result.rejected_reasons.push(`format_disagreement: ${unique.join('|')}`);
        } else {
          result.time_utc   = filtered[0].t;
          result.confidence = filtered.length > 1 ? 0.92 : 0.85;
        }
      }
    }
  }

  // ── Coordinates: context-aware + lat+lng must come together ──────────────
  const coordCtx = plain.match(COORD_KEYWORDS);

  if (coordCtx) {
    const window = plain.slice(
      Math.max(0, coordCtx.index - 50),
      Math.min(plain.length, coordCtx.index + 500)
    );

    // Try decimal format: "Latitude: 21.30° N"
    let latM = window.match(/[Ll]atitude[^\d-]*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([NS])?/);
    let lngM = window.match(/[Ll]ongitude[^\d-]*(-?\d{1,3}(?:\.\d+)?)\s*°?\s*([EW])?/);

    // Try degree-minute: "21°30'N"
    if (!latM) latM = window.match(/(\d{1,2})\s*°\s*(\d{1,2})['′]?\s*([NS])/);
    if (!lngM) lngM = window.match(/(\d{1,3})\s*°\s*(\d{1,2})['′]?\s*([EW])/);

    if (latM && lngM) {
      let lat, lng;

      // Degree-minute หรือ decimal?
      const latIsDM = latM[2] && /^\d+$/.test(latM[2]) && +latM[2] < 60;
      const lngIsDM = lngM[2] && /^\d+$/.test(lngM[2]) && +lngM[2] < 60;

      lat = latIsDM ? parseFloat(latM[1]) + parseFloat(latM[2]) / 60 : parseFloat(latM[1]);
      lng = lngIsDM ? parseFloat(lngM[1]) + parseFloat(lngM[2]) / 60 : parseFloat(lngM[1]);

      const latDir = latIsDM ? latM[3] : latM[2];
      const lngDir = lngIsDM ? lngM[3] : lngM[2];
      if (latDir === 'S') lat = -lat;
      if (lngDir === 'W') lng = -lng;

      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        result.lat = parseFloat(lat.toFixed(4));
        result.lng = parseFloat(lng.toFixed(4));
      } else {
        result.rejected_reasons.push(`coord_out_of_range: ${lat},${lng}`);
      }
    } else if (latM || lngM) {
      result.rejected_reasons.push('partial_coords_only');  // มีแค่อันเดียว → ข้ามทั้งคู่
    }
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
      const reasons = parsed.rejected_reasons.join(', ') || 'no_data';
      console.log(`  ⊘ skip ${record.name}: ${reasons}`);
      return null;
    }

    console.log(`  ✓ ${record.name}: time=${parsed.time_utc ?? '-'} lat=${parsed.lat ?? '-'} lng=${parsed.lng ?? '-'} (conf=${parsed.confidence})`);

    // return enrichment record (COALESCE ใน import จะเติม NULL fields เท่านั้น)
    return {
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
      confidence:      parsed.confidence || 0.5,
      notes:           parsed.rejected_reasons.length ? `partial: ${parsed.rejected_reasons.join('|')}` : null,
    };

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
  const batchTimes = {};       // collect time_utc values สำหรับ batch-level cluster detection
  const batchResults = [];

  for (const record of records) {
    await sleep(DELAY_MS);
    const result = await enrichOne(record);
    if (result) {
      batchResults.push(result);
      if (result.time_utc) batchTimes[result.time_utc] = (batchTimes[result.time_utc] || 0) + 1;
      enriched++;
    }
  }

  // ── Batch-level scan: drop time_utc ที่ซ้ำเกิน 3 ครั้งใน batch ───────────
  // pattern นี้บอกว่า parser อาจจับ timestamp ของ scraper run ไม่ใช่ birth time
  const SUSPICIOUS_THRESHOLD = 3;
  let batchDropped = 0;
  for (const r of batchResults) {
    if (r.time_utc && batchTimes[r.time_utc] > SUSPICIOUS_THRESHOLD) {
      console.error(`  ⚠ batch_cluster: ${r.name} time=${r.time_utc} (${batchTimes[r.time_utc]}x in batch) → drop time`);
      r.notes = `${r.notes ? r.notes + '|' : ''}batch_cluster_${batchTimes[r.time_utc]}x`;
      r.time_utc = null;
      r.confidence = Math.min(r.confidence, 0.6);
      batchDropped++;
    }
    process.stdout.write(JSON.stringify(r) + '\n');
  }

  console.error(`Done: ${enriched}/${records.length} parsed | batch-dropped: ${batchDropped}`);
  if (Object.keys(batchTimes).length) {
    console.error(`Time distribution in batch:`);
    for (const [t, c] of Object.entries(batchTimes).sort((a,b)=>b[1]-a[1]).slice(0, 5)) {
      console.error(`  ${t}: ${c}x${c > SUSPICIOUS_THRESHOLD ? ' ⚠' : ''}`);
    }
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
