#!/usr/bin/env node
// แปลง CSV/JSONL → SQL สำหรับ import เข้า CF D1
//
// วิธีใช้:
//   node julian_import.mjs julian_mk_1700-2100.csv > import_master.sql
//   node julian_import.mjs julian_scraped_2026-05-21.jsonl > import_internet.sql
//   wrangler d1 execute julian --file=import_master.sql --remote

import { readFileSync } from 'fs';
import { basename } from 'path';

const BATCH = 500;

const file = process.argv[2];
if (!file) {
  console.error('Usage: node julian_import.mjs <file.csv|file.jsonl>');
  process.exit(1);
}

const content = readFileSync(file, 'utf8').trim();
if (file.endsWith('.jsonl')) importInternet(content);
else importMasterKey(content);

// ── Master Key (CSV) ──────────────────────────────────────────────────────────

function importMasterKey(csv) {
  const lines = csv.split('\n');
  console.log('-- Master Key import');
  console.log(`-- Source: ${basename(file)}`);
  console.log(`-- Rows: ${lines.length - 1}\n`);

  const rows = lines.slice(1).filter(Boolean);
  for (let i = 0; i < rows.length; i += BATCH) {
    const values = rows.slice(i, i + BATCH).map(line => {
      const parts = line.split(',');
      const jd = parts[0];
      const planets = parts.slice(2).map(v => parseFloat(v).toFixed(4));
      return `(${jd},${planets.join(',')})`;
    }).join(',\n  ');
    console.log(`INSERT OR IGNORE INTO master_key (jd,su,mo,ma,me,ju,ve,sa,ra,ke,mr) VALUES\n  ${values};\n`);
  }
}

// ── Internet Table (JSONL) ────────────────────────────────────────────────────
// ใช้ UPSERT: ถ้า jd+name ซ้ำ → อัปเดต confidence + validated_count อัตโนมัติ
// validated_count = จำนวน independent sources ที่ยืนยัน JD เดียวกัน (ไม่ใช่มนุษย์)

function autoConfidence(r) {
  // Auto-confidence formula — ไม่ต้องมีมนุษย์ตัดสิน
  let c = 0.80;
  if (r.source?.startsWith('wikidata:'))   c = 0.85; // Wikidata: date มักแม่น
  if (r.source?.startsWith('horatad_db')) c = 0.82; // Hora DB: user-entered
  if (r.relate_id?.length)                c += 0.05; // มี death date → ยืนยันตัวตน
  if (r.tier === 1)                        c += 0.03; // tier 1 = ข้อมูลสาธารณะชัดเจน
  if (r.time_utc)                          c += 0.04; // มีเวลาเกิด → แม่นกว่า
  return Math.min(0.98, parseFloat(c.toFixed(2)));
}

function importInternet(jsonl) {
  const records = jsonl.split('\n').filter(Boolean).map(line => JSON.parse(line));

  console.log('-- Internet Table import (UPSERT — dedup by jd+name)');
  console.log(`-- Source: ${basename(file)}`);
  console.log(`-- Rows: ${records.length}\n`);

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const values = batch.map(r => {
      const relate  = r.relate_id?.length ? JSON.stringify(r.relate_id) : null;
      const conf    = r.confidence ?? autoConfidence(r);
      return `(${[
        r.jd,
        sql(r.name),
        sql(r.event_label),
        sql(r.type),
        sql(r.country ?? null),
        r.tier ?? 'NULL',
        r.lat  ?? 'NULL',
        r.lng  ?? 'NULL',
        sql(r.time_utc),
        r.lagna_sign ?? 'NULL',
        sql(relate),
        sql(r.source),
        sql(r.source_type ?? 'internet'),
        r.validated_count ?? 0,
        conf,
        sql(r.notes),
      ].join(',')})`;
    }).join(',\n  ');

    // ON CONFLICT: jd+name ซ้ำ → survivorship rules
    // - COALESCE: เติม NULL field จาก record ใหม่ (ถ้า record เก่ายังไม่มีข้อมูล)
    // - MAX(confidence): เก็บค่าสูงสุด
    // - source: append ถ้าไม่ซ้ำ (เก็บ audit trail)
    // - validated_count++: นับว่า source อื่นเห็นคนเดียวกัน
    console.log(
      `INSERT INTO internet (jd,name,event_label,type,country,tier,lat,lng,time_utc,lagna_sign,relate_id,source,source_type,validated_count,confidence,notes) VALUES\n  ${values}\n` +
      `ON CONFLICT(jd,name) DO UPDATE SET\n` +
      `  time_utc        = COALESCE(internet.time_utc,   excluded.time_utc),\n` +
      `  lagna_sign      = COALESCE(internet.lagna_sign, excluded.lagna_sign),\n` +
      `  lat             = COALESCE(internet.lat,         excluded.lat),\n` +
      `  lng             = COALESCE(internet.lng,         excluded.lng),\n` +
      `  relate_id       = COALESCE(internet.relate_id,  excluded.relate_id),\n` +
      `  notes           = COALESCE(internet.notes,       excluded.notes),\n` +
      `  country         = COALESCE(internet.country,     excluded.country),\n` +
      `  tier            = COALESCE(internet.tier,        excluded.tier),\n` +
      `  confidence      = MAX(internet.confidence, excluded.confidence),\n` +
      `  validated_count = internet.validated_count + 1,\n` +
      `  source          = CASE\n` +
      `    WHEN internet.source LIKE '%' || excluded.source || '%' THEN internet.source\n` +
      `    ELSE internet.source || '|' || excluded.source END;\n`
    );
  }
}

function sql(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}
