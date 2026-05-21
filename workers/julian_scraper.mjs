#!/usr/bin/env node
// JULIAN Scraper — Node.js CLI (รันโดย GitHub Actions หรือ cron ท้องถิ่น)
// ดึงข้อมูลจาก Wikidata SPARQL → JSONL (Internet Table format)
// ไม่ต้องพึ่ง browser, ไม่ต้องพึ่ง Claude

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { CONFIG } from './julian_config.mjs';

const PROGRESS_FILE  = new URL('./julian_progress.json', import.meta.url).pathname;
const OVERRIDE_FILE  = new URL('./julian_override.json', import.meta.url).pathname;
const WIKIDATA_URL   = 'https://query.wikidata.org/sparql';
const USER_AGENT     = 'JULIAN-bot/1.0 (horatad.com; empirical-astro-research)';

// ── JD ────────────────────────────────────────────────────────────────────────
// ต้องตรงกับ engine.js get_j() — Jan 1 2000 CE = 730428
const JD_EPOCH_VAL = 730428;
const JD_EPOCH_MS  = Date.UTC(2000, 0, 1);

function get_j(d, m, y) {
  return JD_EPOCH_VAL + Math.round((Date.UTC(y, m - 1, d) - JD_EPOCH_MS) / 86400000);
}

function parseISODate(iso) {
  if (!iso) return null;
  const m = iso.match(/^([+-]?\d{4,})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]);
  if (y < 200 || y > 2200 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, m: mo, d, jd: get_j(d, mo, y) };
}

// ── Progress ──────────────────────────────────────────────────────────────────
function loadProgress() {
  if (existsSync(PROGRESS_FILE)) {
    try { return JSON.parse(readFileSync(PROGRESS_FILE, 'utf8')); } catch (_) {}
  }
  return { total: 0, done_queries: [], seen_qids: [], runs: [], daily_writes: {} };
}

// คำนวณ records ที่รันได้วันนี้ตาม 85% safety rule + override
function calcRunLimit(progress) {
  const today        = new Date().toISOString().slice(0, 10);
  const writesToday  = progress.daily_writes?.[today] || 0;
  const dailyBudget  = Math.floor(CONFIG.D1_WRITES_DAILY_LIMIT * CONFIG.D1_WRITES_SAFETY_PCT);
  const remaining    = Math.max(0, dailyBudget - writesToday);

  // อ่าน override (user ลดได้ แต่ขยายไม่ได้เกิน 1.0)
  let rateMult = 1.0;
  if (existsSync(OVERRIDE_FILE)) {
    try {
      const ov = JSON.parse(readFileSync(OVERRIDE_FILE, 'utf8'));
      rateMult  = Math.min(1.0, Math.max(0.01, ov.rate_multiplier ?? 1.0));
    } catch (_) {}
  }

  const limit = Math.min(CONFIG.MAX_PER_RUN, Math.floor(remaining * rateMult));
  console.log(`Budget today: ${writesToday} used / ${dailyBudget} (85%) / ${CONFIG.D1_WRITES_DAILY_LIMIT} limit`);
  console.log(`Rate multiplier: ${rateMult} → this run: max ${limit} records`);
  return { limit, writesToday, dailyBudget, today };
}

function saveProgress(p) {
  writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2));
}

// ── GitHub Actions output ─────────────────────────────────────────────────────
function ghOutput(key, val) {
  const gho = process.env.GITHUB_OUTPUT;
  if (gho) appendFileSync(gho, `${key}=${val}\n`);
}

// ── Wikidata SPARQL ───────────────────────────────────────────────────────────
async function sparqlQuery(sparql) {
  const url = `${WIKIDATA_URL}?query=${encodeURIComponent(sparql.trim())}&format=json`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' },
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`Wikidata HTTP ${resp.status}: ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.results.bindings;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const progress = loadProgress();

  // ตรวจ target
  if (progress.total >= CONFIG.TARGET_RECORDS) {
    console.log(`✓ Target reached: ${progress.total}/${CONFIG.TARGET_RECORDS} — stopping`);
    ghOutput('status', 'target_reached');
    process.exit(0);
  }

  // เลือก query ถัดไปที่ยังไม่เสร็จ
  const nextQuery = CONFIG.QUERY_SERIES.find(q => !progress.done_queries.includes(q.id));
  if (!nextQuery) {
    console.log('All queries exhausted. Add more queries to CONFIG.QUERY_SERIES to continue.');
    ghOutput('status', 'queries_exhausted');
    process.exit(0);
  }

  const { limit, writesToday, dailyBudget, today } = calcRunLimit(progress);
  if (limit === 0) {
    console.log(`Daily budget exhausted (${writesToday}/${dailyBudget}) — รอพรุ่งนี้`);
    ghOutput('status', 'budget_exhausted');
    process.exit(0);
  }

  console.log(`\nQuery: ${nextQuery.id} — ${nextQuery.label}`);
  console.log(`Progress: ${progress.total}/${CONFIG.TARGET_RECORDS}`);

  await sleep(CONFIG.WIKIDATA_DELAY_MS); // polite delay

  let bindings;
  try {
    bindings = await sparqlQuery(nextQuery.sparql);
    console.log(`Wikidata returned ${bindings.length} results`);
  } catch (e) {
    console.error('Wikidata query failed:', e.message);
    ghOutput('status', 'error');
    process.exit(1);
  }

  // กรองและแปลงเป็น Internet Table records
  const seenSet = new Set(progress.seen_qids);
  const records  = [];

  for (const b of bindings) {
    if (records.length >= limit) break;

    const qid  = b.person?.value?.split('/').pop();
    if (!qid || seenSet.has(qid)) continue;

    const name = b.personLabel?.value?.trim();
    // ข้ามถ้าไม่มี label หรือ label เป็น QID (Wikidata ยังไม่มีชื่อ EN)
    if (!name || /^Q\d+$/.test(name)) continue;

    const birth = parseISODate(b.birth?.value);
    if (!birth) continue;

    const death       = parseISODate(b.death?.value);
    const countryCode = nextQuery.country || b.countryCode?.value || null;
    const relate_id   = death ? [death.jd] : null;

    records.push({
      jd:              birth.jd,
      name,
      event_label:     nextQuery.label,
      type:            'human',
      country:         countryCode?.toUpperCase().slice(0, 2) || null,
      tier:            nextQuery.tier,
      lat:             null,
      lng:             null,
      time_utc:        null,
      lagna_sign:      null,
      relate_id,
      source:          `wikidata:${qid}`,
      source_type:     'internet',
      validated_count: 0,
      confidence:      0.85,
      notes:           null,
    });

    seenSet.add(qid);
  }

  if (records.length === 0) {
    console.log('No new records in this query — marking done');
    progress.done_queries.push(nextQuery.id);
    saveProgress(progress);
    ghOutput('status', 'no_new_records');
    process.exit(0);
  }

  // เขียน JSONL
  const date    = new Date().toISOString().slice(0, 10);
  const outFile = `workers/julian_scraped_${date}_${nextQuery.id}.jsonl`;
  writeFileSync(outFile, records.map(r => JSON.stringify(r)).join('\n') + '\n');
  console.log(`Saved ${records.length} records → ${outFile}`);

  // อัปเดต progress
  progress.total    += records.length;
  progress.seen_qids = [...seenSet];
  progress.runs.push({ date, query: nextQuery.id, count: records.length });

  // นับ daily writes (เพื่อตรวจสอบ 85% budget)
  if (!progress.daily_writes) progress.daily_writes = {};
  progress.daily_writes[today] = (progress.daily_writes[today] || 0) + records.length;
  // ลบข้อมูลเกิน 7 วัน ไม่ให้ progress.json บวม
  const cutoff = new Date(Date.now() - 7*86400000).toISOString().slice(0,10);
  for (const day of Object.keys(progress.daily_writes)) {
    if (day < cutoff) delete progress.daily_writes[day];
  }

  // ถ้า query ดึงมาน้อยกว่า RECORDS_PER_RUN แสดงว่า exhausted แล้ว
  const exhausted = bindings.filter(b => {
    const qid = b.person?.value?.split('/').pop();
    return qid && !new Set(progress.seen_qids.slice(0, -records.length)).has(qid);
  }).length <= records.length;

  if (exhausted || bindings.length < CONFIG.RECORDS_PER_RUN) {
    progress.done_queries.push(nextQuery.id);
    console.log(`Query "${nextQuery.id}" exhausted → marked done`);
  }

  saveProgress(progress);

  console.log(`\nTotal: ${progress.total}/${CONFIG.TARGET_RECORDS} records`);
  console.log(`Remaining: ${CONFIG.TARGET_RECORDS - progress.total}`);

  ghOutput('out_file',     outFile);
  ghOutput('record_count', records.length.toString());
  ghOutput('total',        progress.total.toString());
  ghOutput('status',       'ok');
}

main().catch(e => {
  console.error('Fatal:', e);
  ghOutput('status', 'error');
  process.exit(1);
});
