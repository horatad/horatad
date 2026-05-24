#!/usr/bin/env node
// JULIAN Raw Bucket Writer
//
// แต่ละ scraper เรียก appendRaw() / appendRawBatch() เพื่อ persist
// record ลง bucket ของตัวเอง — append-only, source-pure
//
// Layout (data/julian_raw/):
//   wikidata.jsonl       ← julian_scraper.mjs
//   astrotheme.jsonl     ← julian_astrotheme.mjs
//   wikipedia_th.jsonl   ← julian_wiki_th.mjs
//
// (Manual seed = data/julian_thai_seed.json ของเดิม — ไม่ต้อง duplicate)
//
// Meta fields ที่ helper เติม:
//   _scraped_at : ISO timestamp ของรอบ scrape
//   _bucket     : ชื่อ bucket (= source key)
//
// merge step (julian_merge.mjs) อ่าน raw + apply rules → julian_all.json
// validate step (julian_validate.mjs) cross-source check → validation.json

import { existsSync, mkdirSync, appendFileSync } from 'fs';

const RAW_DIR = 'data/julian_raw';

function ensureDir() {
  if (!existsSync(RAW_DIR)) mkdirSync(RAW_DIR, { recursive: true });
}

export function appendRaw(bucket, record) {
  if (!record) return;
  ensureDir();
  const path = `${RAW_DIR}/${bucket}.jsonl`;
  const enriched = {
    _scraped_at: new Date().toISOString(),
    _bucket: bucket,
    ...record,
  };
  appendFileSync(path, JSON.stringify(enriched) + '\n');
}

export function appendRawBatch(bucket, records) {
  if (!records || !records.length) return;
  ensureDir();
  const path = `${RAW_DIR}/${bucket}.jsonl`;
  const ts = new Date().toISOString();
  const lines = records
    .map(r => JSON.stringify({ _scraped_at: ts, _bucket: bucket, ...r }))
    .join('\n') + '\n';
  appendFileSync(path, lines);
}

export const RAW_PATH = RAW_DIR;
