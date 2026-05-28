#!/usr/bin/env node
/**
 * julian_index_builder.mjs
 * สร้าง multi-tier index จาก data/julian_all.json → data/index/
 *
 * Output structure:
 *   data/index/
 *     meta.json                   — routing map + stats
 *     planet_sign/{PL}/{SIGN}.json — 10 planets × 12 signs (mini records)
 *     by_year/{YYYY}.json          — 1900–2030 (full records)
 *     by_decade/{NNNN}s.json       — 1700–1899
 *     by_50yr/{NNNN}-{NNNN}.json   — <1700
 *
 * Usage:
 *   node workers/julian_index_builder.mjs [--dry-run] [--verbose]
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { get_data } from '../v3/engine.js';

// ─── Args ─────────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE  = process.argv.includes('--verbose');

if (DRY_RUN) console.error('[DRY-RUN] ไม่เขียนไฟล์จริง');

// ─── Constants ────────────────────────────────────────────────────────────────
const JD_EPOCH_VAL = 730428;
const JD_EPOCH_MS  = Date.UTC(2000, 0, 1);

// engineIdx = array index + 1 (skip LA at 0)
const PLANET_KEYS  = ['SU', 'MO', 'MA', 'ME', 'JU', 'VE', 'SA', 'RA', 'KE', 'MR'];

// ไฟล์ planet_sign: top 3000 ต่อ bucket (mobile budget)
const PLANET_SIGN_TOP_N = 3000;

// ขนาดไฟล์ที่ยอมรับก่อน split (bytes)
const SPLIT_THRESHOLD = 600_000;

const INPUT_FILE  = 'data/julian_all.json';
const OUTPUT_DIR  = 'data/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** แปลง Julian Day → { y, m, d } */
function jdToDate(jd) {
  const ms = JD_EPOCH_MS + (jd - JD_EPOCH_VAL) * 86400000;
  const dt  = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/**
 * คำนวณ signs[10] จาก JD — cache ผลลัพธ์เพื่อประหยัด compute
 * หลายคนเกิดวันเดียวกัน → hit cache บ่อยมาก
 */
const jdSignCache = new Map();

function getSignsForJD(jd) {
  if (jdSignCache.has(jd)) return jdSignCache.get(jd);

  const { y, m, d } = jdToDate(jd);
  let rawPos;
  try {
    // hr=6 = สุริยยาตร์ convention (เวลา 06:00 เสมอ เว้นแต่มี time_utc)
    rawPos = get_data(d, m, y, 6, 0);
  } catch (err) {
    process.stderr.write(`[engine error] JD=${jd} date=${y}-${m}-${d}: ${err.message}\n`);
    jdSignCache.set(jd, null);
    return null;
  }

  if (!Array.isArray(rawPos) || rawPos.length < 11) {
    process.stderr.write(`[engine error] JD=${jd}: bad output length ${rawPos?.length}\n`);
    jdSignCache.set(jd, null);
    return null;
  }

  // engine[0] = LA (lagna), engine[1..10] = SU..MR
  // unit: 1800 steps per sign → Math.trunc(val/1800) % 12 = sign index 0-11
  const signs = [];
  for (let i = 0; i < 10; i++) {
    const engineIdx = i + 1; // skip LA
    signs.push(Math.trunc(rawPos[engineIdx] / 1800) % 12);
  }

  jdSignCache.set(jd, signs);
  return signs;
}

/**
 * year → file path ตาม tier
 *   ≥1900 → by_year/YYYY.json
 *   1700-1899 → by_decade/NNNNs.json
 *   <1700 → by_50yr/NNNN-NNNN.json
 */
function yearToFilePath(year) {
  if (year >= 1900) return `by_year/${year}.json`;
  if (year >= 1700) return `by_decade/${Math.floor(year / 10) * 10}s.json`;
  return `by_50yr/${Math.floor(year / 50) * 50}-${Math.floor(year / 50) * 50 + 49}.json`;
}

/** สร้าง mini record สำหรับ planet_sign buckets (short keys = ลด bytes) */
function toMiniRecord(rec, signs) {
  const mini = {
    q: rec.qid        ?? null,
    n: rec.name       ?? '',
    j: rec.jd         ?? null,
    y: rec.birthYear  ?? null,
    a: rec.accuracy   ?? null,
    i: rec.importance ?? 0,
    c: rec.country    ?? null,
    s: signs,
  };
  if (rec.img) mini.g = rec.img; // g = image filename (omit if null ลด bytes)
  return mini;
}

/** สร้าง full record — original + signs field */
function toFullRecord(rec, signs) {
  return { ...rec, signs };
}

/** เขียนไฟล์หรือแค่ print (dry-run) */
function writeFile(filePath, data) {
  const json = JSON.stringify(data);
  if (DRY_RUN) {
    console.log(`[dry-run] would write ${filePath} (${(json.length / 1024).toFixed(1)} KB)`);
    return { path: filePath, size: json.length };
  }
  const fullPath = `${OUTPUT_DIR}/${filePath}`;
  // mkdirSync ทำ recursive สำหรับ subdirs ทั้งหมด
  mkdirSync(fullPath.substring(0, fullPath.lastIndexOf('/')), { recursive: true });
  writeFileSync(fullPath, json, 'utf8');
  if (VERBOSE) process.stderr.write(`  wrote ${fullPath} (${(json.length / 1024).toFixed(1)} KB)\n`);
  return { path: filePath, size: json.length };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const t0 = Date.now();

  // ── Load input ──────────────────────────────────────────────────────────────
  if (!existsSync(INPUT_FILE)) {
    console.error(`[error] ไม่พบ ${INPUT_FILE} — รัน JULIAN sync ก่อน`);
    process.exit(1);
  }

  process.stderr.write(`Loading ${INPUT_FILE}...\n`);
  let records;
  try {
    records = JSON.parse(readFileSync(INPUT_FILE, 'utf8'));
  } catch (err) {
    console.error(`[error] parse ${INPUT_FILE}: ${err.message}`);
    process.exit(1);
  }
  if (!Array.isArray(records)) {
    console.error(`[error] ${INPUT_FILE} ไม่ใช่ array`);
    process.exit(1);
  }
  process.stderr.write(`Loaded ${records.length.toLocaleString()} records\n`);

  // ── Prepare accumulators ────────────────────────────────────────────────────
  // planet_sign[planetIdx 0-9][sign 0-11] = MiniRecord[]
  const planetSignBuckets = Array.from({ length: 10 }, () =>
    Array.from({ length: 12 }, () => [])
  );

  // timeBuckets[filepath] = FullRecord[]
  const timeBuckets = new Map();

  // track stats
  let okCount    = 0;
  let skipCount  = 0;
  let minYear    = Infinity;
  let maxYear    = -Infinity;

  // ── Process records ─────────────────────────────────────────────────────────
  process.stderr.write(`Processing records...\n`);

  for (let idx = 0; idx < records.length; idx++) {
    if (idx > 0 && idx % 10_000 === 0) {
      process.stderr.write(
        `  ${idx.toLocaleString()} / ${records.length.toLocaleString()} ` +
        `(ok=${okCount.toLocaleString()} skip=${skipCount.toLocaleString()} ` +
        `jd_cache=${jdSignCache.size.toLocaleString()})\n`
      );
    }

    const rec = records[idx];

    // ── Validate record ──────────────────────────────────────────────────────
    if (!rec || typeof rec !== 'object') {
      skipCount++;
      if (VERBOSE) process.stderr.write(`  [skip] idx=${idx}: not an object\n`);
      continue;
    }
    if (!rec.jd || typeof rec.jd !== 'number') {
      skipCount++;
      if (VERBOSE) process.stderr.write(`  [skip] idx=${idx} name=${rec.name}: missing jd\n`);
      continue;
    }

    // ── Compute planet signs ─────────────────────────────────────────────────
    const signs = getSignsForJD(rec.jd);
    if (signs === null) {
      skipCount++;
      continue; // engine error already logged inside getSignsForJD
    }

    // ── Extract birth year ───────────────────────────────────────────────────
    const { y: birthYear } = jdToDate(rec.jd);

    // เติม birthYear ใน record object เพื่อใช้ใน mini record
    // (ไม่แก้ original — clone ใน toMiniRecord/toFullRecord)
    const recWithYear = { ...rec, birthYear };

    // ── Accumulate planet_sign buckets ───────────────────────────────────────
    const mini = toMiniRecord(recWithYear, signs);
    for (let pi = 0; pi < 10; pi++) {
      planetSignBuckets[pi][signs[pi]].push(mini);
    }

    // ── Accumulate time buckets ──────────────────────────────────────────────
    const timePath = yearToFilePath(birthYear);
    if (!timeBuckets.has(timePath)) timeBuckets.set(timePath, []);
    timeBuckets.get(timePath).push(toFullRecord(recWithYear, signs));

    // track range
    if (birthYear < minYear) minYear = birthYear;
    if (birthYear > maxYear) maxYear = birthYear;

    okCount++;
  }

  process.stderr.write(
    `Processing done: ok=${okCount.toLocaleString()} skip=${skipCount.toLocaleString()} ` +
    `jd_cache_size=${jdSignCache.size.toLocaleString()}\n`
  );

  // ── Ensure output dir ────────────────────────────────────────────────────────
  if (!DRY_RUN) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // ── Write planet_sign files ───────────────────────────────────────────────────
  process.stderr.write(`Writing planet_sign files...\n`);
  const writtenFiles = [];

  for (let pi = 0; pi < 10; pi++) {
    const planetKey = PLANET_KEYS[pi];
    for (let sign = 0; sign < 12; sign++) {
      const bucket = planetSignBuckets[pi][sign];
      // sort by importance desc
      bucket.sort((a, b) => (b.i ?? 0) - (a.i ?? 0));

      const total  = bucket.length;
      const shown  = Math.min(total, PLANET_SIGN_TOP_N);
      const sliced = bucket.slice(0, shown);

      const payload = { total, shown, records: sliced };
      const result  = writeFile(`planet_sign/${planetKey}/${sign}.json`, payload);
      writtenFiles.push(result);

      if (VERBOSE) {
        process.stderr.write(
          `  planet_sign/${planetKey}/${sign}.json: total=${total} shown=${shown} ` +
          `size=${(result.size / 1024).toFixed(1)}KB\n`
        );
      }
    }
  }

  // ── Write time-bucket files ──────────────────────────────────────────────────
  process.stderr.write(`Writing time-bucket files (${timeBuckets.size} buckets)...\n`);

  // year_map: { "1990" → "by_year/1990.json" } หรือ "by_year/1990_a.json" + "_b.json"
  const yearMap  = {};  // year (string) → filepath(s)
  const splitLog = []; // { year, parts } สำหรับ meta

  for (const [timePath, recs] of timeBuckets) {
    // sort by importance desc
    recs.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));

    // probe size
    const testJson = JSON.stringify(recs);

    if (testJson.length <= SPLIT_THRESHOLD) {
      // ไม่ต้อง split
      const result = writeFile(timePath, recs);
      writtenFiles.push(result);

      // register in yearMap (ใช้ key = ปีหรือ decade หรือ 50yr label)
      const pathKey = timePath.replace(/^(by_year\/|by_decade\/|by_50yr\/)/, '').replace('.json', '');
      yearMap[pathKey] = timePath;
    } else {
      // split เป็น _a + _b
      const half     = Math.ceil(recs.length / 2);
      const partsA   = recs.slice(0, half);
      const partsB   = recs.slice(half);
      const pathA    = timePath.replace('.json', '_a.json');
      const pathB    = timePath.replace('.json', '_b.json');

      const rA = writeFile(pathA, partsA);
      const rB = writeFile(pathB, partsB);
      writtenFiles.push(rA, rB);

      const pathKey = timePath.replace(/^(by_year\/|by_decade\/|by_50yr\/)/, '').replace('.json', '');
      yearMap[pathKey] = [pathA, pathB]; // array = split file
      splitLog.push({ key: pathKey, original: timePath, parts: [pathA, pathB], records: recs.length });

      if (VERBOSE || !DRY_RUN) {
        process.stderr.write(
          `  SPLIT ${timePath} → ${pathA} (${partsA.length}) + ${pathB} (${partsB.length})\n`
        );
      }
    }
  }

  // ── Write images.json — QID→filename สำหรับ notable persons ─────────────────
  // threshold: sitelinks >= 20 หรือ importance >= 0.4 (คาดประมาณ 5-15K records)
  process.stderr.write(`Building images.json...\n`);
  const IMAGE_MIN_SITELINKS = 20;
  const IMAGE_MIN_IMPORTANCE = 0.4;
  const imageMap = {};
  let imgCount = 0;
  for (const rec of records) {
    if (!rec.img || !rec.qid) continue;
    const sl = rec.sitelinks ?? 0;
    const im = rec.importance ?? 0;
    if (sl >= IMAGE_MIN_SITELINKS || im >= IMAGE_MIN_IMPORTANCE) {
      imageMap[rec.qid] = rec.img;
      imgCount++;
    }
  }
  const imgResult = writeFile('images.json', imageMap);
  writtenFiles.push(imgResult);
  process.stderr.write(`images.json: ${imgCount} notable persons with images\n`);

  // ── Write meta.json ──────────────────────────────────────────────────────────
  process.stderr.write(`Writing meta.json...\n`);

  const meta = {
    generated         : new Date().toISOString(),
    version           : 2,
    total             : okCount,
    skipped           : skipCount,
    planets           : PLANET_KEYS,
    year_range        : { min: minYear, max: maxYear },
    year_map          : yearMap,
    planet_sign_top_n : PLANET_SIGN_TOP_N,
    split_log         : splitLog,
    images_count      : imgCount,
    file_types        : {
      planet_sign : 'planet_sign/{PLANET}/{SIGN}.json — mini records sorted by importance',
      by_year     : 'by_year/{YYYY}.json — full records ≥1900',
      by_decade   : 'by_decade/{NNNN}s.json — full records 1700-1899',
      by_50yr     : 'by_50yr/{NNNN}-{NNNN}.json — full records <1700',
      images      : 'images.json — { QID: filename } สำหรับ notable persons (sitelinks≥20 หรือ importance≥0.4)',
    },
  };

  const metaResult = writeFile('meta.json', meta);
  writtenFiles.push(metaResult);

  // ── Summary ──────────────────────────────────────────────────────────────────
  const elapsed    = ((Date.now() - t0) / 1000).toFixed(1);
  const totalBytes = writtenFiles.reduce((s, f) => s + (f.size ?? 0), 0);

  console.log(`\n═══════════════════════════════════════`);
  console.log(`JULIAN Index Builder — Complete`);
  console.log(`═══════════════════════════════════════`);
  console.log(`Records processed : ${okCount.toLocaleString()} (skip: ${skipCount.toLocaleString()})`);
  console.log(`Files written     : ${writtenFiles.length}`);
  console.log(`  planet_sign     : ${10 * 12} files`);
  console.log(`  time-bucket     : ${timeBuckets.size} buckets → ${writtenFiles.length - 10 * 12 - 1} files (${splitLog.length} splits)`);
  console.log(`  meta.json       : 1 file`);
  console.log(`Estimated size    : ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`JD cache entries  : ${jdSignCache.size.toLocaleString()}`);
  console.log(`Year range        : ${minYear} – ${maxYear}`);
  console.log(`Elapsed           : ${elapsed}s`);
  if (DRY_RUN) console.log(`[DRY-RUN] ไม่มีการเขียนไฟล์จริง`);
  console.log(`═══════════════════════════════════════`);
}

main();
