#!/usr/bin/env node
// JULIAN Merge — รวม raw buckets → data/julian_all.json
//
// Priority (สูง → ต่ำ):
//   1. data/julian_thai_seed.json              (manual A/B/C — full override per field)
//   2. data/julian_raw/wikipedia_th.jsonl      (enrichment — COALESCE empty fields)
//   3. data/julian_raw/astrotheme.jsonl        (enrichment — COALESCE empty fields)
//   4. data/julian_raw/wikidata_coord.jsonl    (enrichment — COALESCE lat/lng/notes)
//   5. data/julian_raw/wikidata.jsonl          (base — last-write-wins per (jd,name))
//   6. existing data/julian_all.json           (preserve เดิม — Phase 0 skip)
//
// Dedup ภายใน bucket: latest by _scraped_at ชนะ
// Output: data/julian_all.json + stats
//
// วิธีใช้:
//   node workers/julian_merge.mjs           # merge ทุก bucket → julian_all.json
//   node workers/julian_merge.mjs --dry     # preview ไม่เขียนไฟล์

import { readFileSync, writeFileSync, existsSync } from 'fs';

const RAW_DIR    = 'data/julian_raw';
const MAIN_FILE  = 'data/julian_all.json';
const SEED_FILE  = 'data/julian_thai_seed.json';
const DRY        = process.argv.includes('--dry');

const key = r => `${r.jd}|${r.name}`;

// ── load helpers ─────────────────────────────────────────────────────────────
function loadJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch (_) { return null; } })
    .filter(r => r && r.jd && r.name);
}

function loadJsonArray(path) {
  if (!existsSync(path)) return [];
  try {
    const j = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(j) ? j : [];
  } catch (_) { return []; }
}

function loadSeed(path) {
  if (!existsSync(path)) return [];
  try {
    const j = JSON.parse(readFileSync(path, 'utf8'));
    return Array.isArray(j?.records) ? j.records.filter(r => r?.jd && r?.name) : [];
  } catch (_) { return []; }
}

// dedup within bucket: latest by _scraped_at ชนะ
function dedupLatest(records) {
  const m = new Map();
  for (const r of records) {
    const k = key(r);
    const prev = m.get(k);
    if (!prev || (r._scraped_at && r._scraped_at > (prev._scraped_at || ''))) {
      m.set(k, r);
    }
  }
  return [...m.values()];
}

// ── merge logic ──────────────────────────────────────────────────────────────

// last-write-wins: ทับทั้ง record (Wikidata base level)
function applyBase(main, records, stats) {
  for (const r of records) {
    const k = key(r);
    const existed = main.has(k);
    // strip _ meta fields (don't pollute main DB)
    const clean = {};
    for (const [kk, vv] of Object.entries(r)) {
      if (!kk.startsWith('_')) clean[kk] = vv;
    }
    main.set(k, clean);
    if (existed) stats.updated++; else stats.added++;
  }
}

// COALESCE fill empty fields เท่านั้น + max(confidence)
function applyEnrich(main, records, stats) {
  for (const r of records) {
    const k = key(r);
    const cur = main.get(k);
    if (!cur) { stats.no_target++; continue; }
    let touched = false;
    if (!cur.time_utc && r.time_utc) { cur.time_utc = r.time_utc; touched = true; }
    if ((!cur.lat || cur.lat === 0) && r.lat) { cur.lat = r.lat; touched = true; }
    if ((!cur.lng || cur.lng === 0) && r.lng) { cur.lng = r.lng; touched = true; }
    if (!cur.notes && r.notes) { cur.notes = r.notes; touched = true; }
    if (r.confidence && r.confidence > (cur.confidence || 0)) {
      cur.confidence = r.confidence; touched = true;
    }
    // upgrade accuracy ถ้า enrich บอก grade ดีกว่า
    const order = { A:5, B:4, C:3, D:2, F:1 };
    if (r.accuracy && (order[r.accuracy] || 0) > (order[cur.accuracy] || 0)) {
      cur.accuracy = r.accuracy; touched = true;
    }
    if (touched) stats.enriched++;
  }
}

// manual seed: full override per field ที่ seed กำหนด
function applySeed(main, records, stats) {
  for (const r of records) {
    const k = key(r);
    if (main.has(k)) {
      main.set(k, {
        ...main.get(k),
        ...r,
        source: r.source || 'manual:thai_seed',
        source_type: r.source_type || 'manual',
        accuracy: r.accuracy || 'C',
        confidence: r.confidence ?? 0.90,
      });
      stats.replaced++;
    } else {
      main.set(k, {
        type: 'human',
        country: r.country || null,
        tier: r.tier ?? 1,
        lat: r.lat ?? null,
        lng: r.lng ?? null,
        time_utc: r.time_utc ?? null,
        lagna_sign: r.lagna_sign ?? null,
        relate_id: r.relate_id ?? null,
        source: 'manual:thai_seed',
        source_type: 'manual',
        accuracy: r.accuracy || 'C',
        validated_count: 0,
        confidence: r.confidence ?? 0.90,
        notes: r.notes ?? null,
        event_label: r.event_label ?? null,
        ...r,
      });
      stats.added++;
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
function main() {
  console.log('JULIAN merge — raw buckets → julian_all.json' + (DRY ? ' [DRY-RUN]' : ''));

  const existing  = loadJsonArray(MAIN_FILE);
  const wikidata  = dedupLatest(loadJsonl(`${RAW_DIR}/wikidata.jsonl`));
  const geneExp   = dedupLatest(loadJsonl(`${RAW_DIR}/genealogy_expansion.jsonl`));
  const coord     = dedupLatest(loadJsonl(`${RAW_DIR}/wikidata_coord.jsonl`));
  const astro     = dedupLatest(loadJsonl(`${RAW_DIR}/astrotheme.jsonl`));
  const wikiTh    = dedupLatest(loadJsonl(`${RAW_DIR}/wikipedia_th.jsonl`));
  const seed      = loadSeed(SEED_FILE);

  console.log(`Inputs:
  existing main      : ${existing.length}
  wikidata raw       : ${wikidata.length} (dedup'd)
  gene_expansion raw : ${geneExp.length} (dedup'd)
  wikidata_coord raw : ${coord.length}
  astrotheme raw     : ${astro.length}
  wiki_th raw        : ${wikiTh.length}
  manual seed        : ${seed.length}`);

  // build map starting from existing
  const m = new Map();
  for (const r of existing) m.set(key(r), r);

  // priority: low → high (later overrides earlier where applicable)
  const stats = {
    geneExp: { added:0, updated:0 },
    base:    { added:0, updated:0 },
    coord:   { enriched:0, no_target:0 },
    astro:   { enriched:0, no_target:0 },
    wikiTh:  { enriched:0, no_target:0 },
    seed:    { added:0, replaced:0 },
  };

  // genealogy_expansion = base level priority ต่ำสุด — apply ก่อน wikidata
  // เพื่อให้ canonical wikidata scrape override ได้ถ้าภายหลัง person เดียวกันถูก scrape ตรง
  applyBase(m, geneExp, stats.geneExp);
  applyBase(m, wikidata, stats.base);
  applyEnrich(m, coord, stats.coord);
  applyEnrich(m, astro, stats.astro);
  applyEnrich(m, wikiTh, stats.wikiTh);
  applySeed(m, seed, stats.seed);

  const merged = [...m.values()].sort((a, b) => (b.jd || 0) - (a.jd || 0));

  console.log(`\nMerge stats:
  Gene expansion  : +${stats.geneExp.added} new / ${stats.geneExp.updated} updated
  Wikidata base   : +${stats.base.added} new / ${stats.base.updated} updated
  Wikidata coord  : ${stats.coord.enriched} enriched / ${stats.coord.no_target} no-target
  Astrotheme      : ${stats.astro.enriched} enriched / ${stats.astro.no_target} no-target
  Wikipedia TH    : ${stats.wikiTh.enriched} enriched / ${stats.wikiTh.no_target} no-target
  Manual seed     : +${stats.seed.added} new / ${stats.seed.replaced} replaced
  Total final     : ${merged.length}`);

  if (DRY) {
    console.log('\n[DRY-RUN] not writing julian_all.json');
    return;
  }

  writeFileSync(MAIN_FILE, JSON.stringify(merged));
  console.log(`\n✓ Written ${MAIN_FILE}`);

  if (process.env.GITHUB_OUTPUT) {
    const fs = require('fs');
    fs.appendFileSync(process.env.GITHUB_OUTPUT,
      `total=${merged.length}\nbase_added=${stats.base.added}\nenriched=${stats.astro.enriched + stats.wikiTh.enriched}\n`);
  }
}

main();
