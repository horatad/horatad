#!/usr/bin/env node
/**
 * julian_pantheon.mjs
 * ดาวน์โหลด Pantheon 2.0 dataset (MIT/Harvard) → เพิ่ม hpi field ใน julian_all.json
 *
 * Pantheon = Historical Popularity Index สำหรับบุคคลสำคัญในประวัติศาสตร์ ~11K คน
 * License: CC-BY 4.0 — ใช้ได้ฟรี ไม่มี ToS issue
 * Source: https://pantheon.world/data/datasets
 *
 * Matching: name (normalized) + birthyear → ถ้า match → เพิ่ม hpi + boost importance
 * Input:  data/julian_all.json
 * Output: data/julian_all.json (in-place update)
 *
 * Usage: node workers/julian_pantheon.mjs [--dry-run]
 */

import { readFileSync, writeFileSync } from 'fs';

const DRY_RUN = process.argv.includes('--dry-run');

const PANTHEON_URLS = [
  'https://raw.githubusercontent.com/cid-harvard/pantheon-dataset/main/data/person.csv',
  'https://pantheon.world/api/v2/person/?returns=csv&hpi_min=0&hpi_max=100',
];
const USER_AGENT = 'JULIAN-bot/1.0 (horatad.com; pantheon-enrichment)';
const INPUT_FILE = 'data/julian_all.json';

// normalize name for fuzzy match: lowercase, remove accents, punctuation
function normName(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

// parse CSV line respecting quoted fields
function parseCSVLine(line) {
  const fields = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { fields.push(cur); cur = ''; continue; }
    cur += c;
  }
  fields.push(cur);
  return fields;
}

function parseCSV(text) {
  const lines  = text.split('\n').filter(l => l.trim());
  const header = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj  = {};
    header.forEach((h, i) => { obj[h] = (vals[i] ?? '').trim(); });
    return obj;
  });
}

async function downloadCSV() {
  for (const url of PANTHEON_URLS) {
    try {
      console.log(`Trying: ${url}`);
      const resp = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(60000),
      });
      if (!resp.ok) { console.log(`  HTTP ${resp.status} — trying next`); continue; }
      const text = await resp.text();
      if (!text.includes('hpi') && !text.includes('name')) { console.log('  Bad content — trying next'); continue; }
      console.log(`  Downloaded ${Math.round(text.length/1024)}KB`);
      return text;
    } catch (e) {
      console.log(`  Error: ${e.message} — trying next`);
    }
  }
  throw new Error('All Pantheon URLs failed');
}

// importance boost: weight HPI into existing importance score
// hpi 0-100 → normalized 0-1 → blended 80% existing + 20% hpi
function blendImportance(existing, hpi) {
  const hpiNorm = Math.min(1.0, hpi / 100);
  return Math.round((0.80 * (existing ?? 0.5) + 0.20 * hpiNorm) * 100) / 100;
}

async function main() {
  const csvText  = await downloadCSV();
  const pantheon = parseCSV(csvText);
  console.log(`Pantheon records: ${pantheon.length}`);

  // Build lookup: normName+birthyear → hpi
  const lookup = new Map();
  for (const p of pantheon) {
    const hpi  = parseFloat(p.hpi || p.historical_popularity_index || '0');
    const year = parseInt(p.birthyear || p.birth_year || '0');
    const name = normName(p.name || p.full_name || '');
    if (!name || !year || !hpi) continue;
    const key = `${name}|${year}`;
    if (!lookup.has(key) || lookup.get(key).hpi < hpi) {
      lookup.set(key, { hpi, name: p.name, occupation: p.occupation || '' });
    }
  }
  console.log(`Lookup entries: ${lookup.size}`);

  const records = JSON.parse(readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Julian records: ${records.length}`);

  let matched = 0, updated = 0;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.hpi != null) continue; // already enriched

    // Extract birthyear from jd
    const birthYear = jdToYear(r.jd);
    const key       = `${normName(r.name || '')}|${birthYear}`;
    const entry     = lookup.get(key);
    if (!entry) continue;

    matched++;
    const newImportance = blendImportance(r.importance, entry.hpi);
    if (newImportance !== r.importance || r.hpi == null) {
      records[i] = { ...r, hpi: entry.hpi, importance: newImportance };
      updated++;
    }
  }

  console.log(`Matched: ${matched} | Updated: ${updated}`);

  if (!DRY_RUN) {
    writeFileSync(INPUT_FILE, JSON.stringify(records));
    console.log(`✅ Saved ${INPUT_FILE}`);
  } else {
    const samples = records.filter(r => r.hpi != null).slice(0, 5);
    console.log('Sample matches (dry-run):');
    samples.forEach(r => console.log(`  ${r.name} (${jdToYear(r.jd)}) HPI=${r.hpi} importance=${r.importance}`));
  }
}

// approximate year from Julian Day Number
function jdToYear(jd) {
  const JD_EPOCH_VAL = 730428; // JD of 2000-01-01
  const daysSince2000 = jd - JD_EPOCH_VAL;
  return Math.floor(2000 + daysSince2000 / 365.25);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
