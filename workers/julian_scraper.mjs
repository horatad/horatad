#!/usr/bin/env node
// JULIAN Scraper — Node.js CLI (รันโดย GitHub Actions หรือ cron ท้องถิ่น)
// ดึงข้อมูลจาก Wikidata SPARQL → JSONL (Internet Table format)
// ไม่ต้องพึ่ง browser, ไม่ต้องพึ่ง Claude

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { CONFIG } from './julian_config.mjs';
import { appendRawBatch } from './julian_raw_writer.mjs';

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
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function sparqlQuery(sparql) {
  const url  = `${WIKIDATA_URL}?query=${encodeURIComponent(sparql.trim())}&format=json`;
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const t0   = Date.now();
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' },
    });
    const ms = Date.now() - t0;
    console.log(`Wikidata: HTTP ${resp.status} in ${ms}ms`);

    // rate-limited → ถาม Retry-After หรือ exponential backoff
    if (resp.status === 429 || resp.status === 503) {
      const retryAfterSec = parseInt(resp.headers.get('Retry-After') || '0') || 60;
      const backoff       = 2000 * Math.pow(2, attempt);          // 2s / 4s / 8s
      const wait          = Math.max(retryAfterSec * 1000, backoff);
      console.log(`Rate limited (${resp.status}) — retry ${attempt + 1}/${MAX_RETRIES} after ${Math.round(wait/1000)}s`);
      await sleep(wait);
      continue;
    }

    if (!resp.ok) {
      const txt = await resp.text().catch(() => '');
      throw new Error(`Wikidata HTTP ${resp.status}: ${txt.slice(0, 200)}`);
    }

    // adaptive: ถ้า response ช้า (>3s) แสดงว่า Wikidata โหลด → พักเพิ่มก่อน process ต่อ
    if (ms > 3000) {
      const extra = Math.min(ms, 8000);
      console.log(`Slow response (${ms}ms) — adaptive delay ${extra}ms`);
      await sleep(extra);
    }

    const data = await resp.json();
    return data.results?.bindings ?? [];
  }

  throw new Error(`Wikidata query failed after ${MAX_RETRIES} retries`);
}

// ── Process one query — returns records written (0 = exhausted/skip) ──────────
async function processQuery(query, progress, batchFile, today) {
  const { limit } = calcRunLimit(progress);
  if (limit === 0) return { done: false, budgetExhausted: true };

  console.log(`\n── ${query.id}: ${query.label} ──`);
  await sleep(CONFIG.WIKIDATA_DELAY_MS);

  let bindings;
  try {
    bindings = await sparqlQuery(query.sparql);
    console.log(`Wikidata: ${bindings.length} results`);
  } catch (e) {
    console.error(`Query ${query.id} failed: ${e.message} — skipping`);
    return { done: false, budgetExhausted: false };
  }

  const seenSet = new Set(progress.seen_qids);
  const records = [];
  let skipNoName = 0, skipNoBirth = 0, skipSeen = 0;

  for (const b of bindings) {
    if (records.length >= limit) break;
    const qid = b.person?.value?.split('/').pop();
    if (!qid || seenSet.has(qid)) { skipSeen++; continue; }
    const name = b.personLabel?.value?.trim();
    if (!name || /^Q\d+$/.test(name)) { skipNoName++; continue; }
    const birth = parseISODate(b.birth?.value);
    if (!birth) { skipNoBirth++; continue; }

    const death       = parseISODate(b.death?.value);
    const countryCode = query.country || b.countryCode?.value || null;
    // เอาเวลาเกิดจาก Wikidata เฉพาะเมื่อ precision >= 13 (ระดับชั่วโมง/นาที)
    // precision 11 = วัน, 12 = เดือน, 13 = ชั่วโมง, 14 = นาที
    // ถ้า precision 11 → birth value เป็น T00:00:00Z ซึ่งหมายถึง "ไม่รู้เวลา" ไม่ใช่เที่ยงคืน
    const birthPrecNum = parseInt(b.birthPrec?.value || '0');
    const birthVal     = b.birth?.value || '';
    const tIdx         = birthVal.indexOf('T');
    const time_utc     = (birthPrecNum >= 13 && tIdx >= 0)
      ? birthVal.slice(tIdx + 1, tIdx + 6)
      : null;

    const astroId = b.astroId?.value || null;
    // accuracy: D = date only (Wikidata precision=day, no time)
    //          C = time present (Wikidata precision>=13 with hour/minute)
    // Astrotheme enrichment step จะ upgrade เป็น C ถ้าเจอเวลามี cited source
    const accuracy = time_utc ? 'C' : 'D';
    records.push({
      jd: birth.jd, name,
      event_label: query.label, type: 'human',
      country: countryCode?.toUpperCase().slice(0, 2) || null,
      tier: query.tier, lat: null, lng: null,
      time_utc, lagna_sign: null,
      relate_id: death ? [death.jd] : null,
      source: astroId ? `astrotheme:${astroId}` : `wikidata:${qid}`,
      source_type: 'internet',
      accuracy,
      validated_count: 0,
      confidence: time_utc ? 0.95 : 0.85,
      notes: null,
    });
    seenSet.add(qid);
  }

  console.log(`Filter: ${records.length} kept | seen=${skipSeen} noName=${skipNoName} noBirth=${skipNoBirth}`);

  if (records.length > 0) {
    appendFileSync(batchFile, records.map(r => JSON.stringify(r)).join('\n') + '\n');
    appendRawBatch('wikidata', records);
    progress.total    += records.length;
    progress.seen_qids = [...seenSet];
    progress.runs.push({ date: today, query: query.id, count: records.length });
    if (!progress.daily_writes) progress.daily_writes = {};
    progress.daily_writes[today] = (progress.daily_writes[today] || 0) + records.length;
    const cutoff = new Date(Date.now() - 7*86400000).toISOString().slice(0,10);
    for (const day of Object.keys(progress.daily_writes)) {
      if (day < cutoff) delete progress.daily_writes[day];
    }
  }

  const queryExhausted = bindings.length < CONFIG.MAX_PER_RUN || records.length === 0;
  if (queryExhausted) {
    progress.done_queries.push(query.id);
    console.log(`"${query.id}" exhausted → marked done`);
  }

  saveProgress(progress); // บันทึกทุก query — ถ้า timeout จะไม่สูญหาย
  return { done: queryExhausted, budgetExhausted: false, count: records.length };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const progress = loadProgress();

  if (progress.total >= CONFIG.TARGET_RECORDS) {
    console.log(`✓ Target reached: ${progress.total}/${CONFIG.TARGET_RECORDS}`);
    ghOutput('status', 'target_reached');
    process.exit(0);
  }

  const pending = CONFIG.QUERY_SERIES.filter(q => !progress.done_queries.includes(q.id));
  if (pending.length === 0) {
    console.log('All queries exhausted.');
    ghOutput('status', 'queries_exhausted');
    process.exit(0);
  }

  const { writesToday, dailyBudget } = calcRunLimit(progress);
  if (calcRunLimit(progress).limit === 0) {
    console.log(`Daily budget exhausted (${writesToday}/${dailyBudget}) — รอพรุ่งนี้`);
    ghOutput('status', 'budget_exhausted');
    process.exit(0);
  }

  console.log(`\nProgress: ${progress.total}/${CONFIG.TARGET_RECORDS} | pending queries: ${pending.length}`);

  const today     = new Date().toISOString().slice(0, 10);
  const batchFile = `workers/julian_scraped_${today}_batch.jsonl`;
  let totalThisRun = 0;

  for (const query of pending) {
    if (progress.total >= CONFIG.TARGET_RECORDS) break;

    const result = await processQuery(query, progress, batchFile, today);
    totalThisRun += result.count ?? 0;

    if (result.budgetExhausted) {
      console.log('Daily budget exhausted — stopping run');
      break;
    }
  }

  console.log(`\n── Run complete: ${totalThisRun} records this run | total: ${progress.total}/${CONFIG.TARGET_RECORDS}`);

  if (totalThisRun === 0) {
    ghOutput('status', 'no_new_records');
  } else {
    ghOutput('out_file',     batchFile);
    ghOutput('record_count', totalThisRun.toString());
    ghOutput('total',        progress.total.toString());
    ghOutput('status',       'ok');
  }
}

main().catch(e => {
  console.error('Fatal:', e);
  ghOutput('status', 'error');
  process.exit(1);
});
