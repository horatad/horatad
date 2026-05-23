#!/usr/bin/env node
// JULIAN Manual Seed Merge
// รวม data/julian_thai_seed.json → data/julian_all.json
// Policy: manual seed > scraped (accuracy A/B/C ของ user เอง trump Wikidata)

import { readFileSync, writeFileSync, existsSync } from 'fs';

const SEED_FILE = 'data/julian_thai_seed.json';
const DATA_FILE = 'data/julian_all.json';

function main() {
  if (!existsSync(SEED_FILE)) {
    console.error(`Seed file not found: ${SEED_FILE}`);
    process.exit(0);
  }

  const seed = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
  const seedRecords = Array.isArray(seed?.records) ? seed.records : [];

  if (!seedRecords.length) {
    console.log('No seed records to merge — skip');
    process.exit(0);
  }

  if (!existsSync(DATA_FILE)) {
    console.error(`Data file not found: ${DATA_FILE}`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(DATA_FILE, 'utf8'));
  if (!Array.isArray(data)) {
    console.error('Data file invalid (not array)');
    process.exit(1);
  }

  // Validate seed records
  const valid = [];
  const invalid = [];
  for (const r of seedRecords) {
    if (!r || typeof r !== 'object') { invalid.push({reason:'not object', record:r}); continue; }
    if (!Number.isInteger(r.jd) || r.jd < 1) { invalid.push({reason:'invalid jd', record:r}); continue; }
    if (!r.name || typeof r.name !== 'string') { invalid.push({reason:'invalid name', record:r}); continue; }
    if (r.accuracy && !'ABCDF'.includes(r.accuracy)) { invalid.push({reason:'invalid accuracy', record:r}); continue; }
    if (r.time_utc && !/^\d{2}:\d{2}$/.test(r.time_utc)) { invalid.push({reason:'invalid time_utc', record:r}); continue; }
    valid.push(r);
  }
  if (invalid.length) {
    console.error(`Skipped ${invalid.length} invalid records:`);
    for (const i of invalid) console.error(`  ${i.reason}: ${JSON.stringify(i.record).slice(0,120)}`);
  }

  // Index existing by jd+name
  const map = new Map();
  for (const r of data) if (r?.jd && r?.name) map.set(`${r.jd}|${r.name}`, r);

  let replaced = 0, added = 0;
  for (const r of valid) {
    const key = `${r.jd}|${r.name}`;
    if (map.has(key)) {
      // Manual seed overrides — fill normalized defaults
      map.set(key, {
        ...map.get(key),
        ...r,
        source: r.source || 'manual:thai_seed',
        source_type: r.source_type || 'manual',
        accuracy: r.accuracy || 'C',
        confidence: r.confidence ?? 0.90,
        validated_count: r.validated_count ?? 0,
        notes: r.notes ?? null,
      });
      replaced++;
    } else {
      map.set(key, {
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
      added++;
    }
  }

  const merged = [...map.values()].sort((a, b) => (b.jd || 0) - (a.jd || 0));
  writeFileSync(DATA_FILE, JSON.stringify(merged));

  console.log(`Seed merge: ${valid.length} valid (${added} added, ${replaced} replaced) | ${invalid.length} skipped`);
  console.log(`Total records: ${merged.length}`);

  // GitHub Actions output
  if (process.env.GITHUB_OUTPUT) {
    const fs = require('fs');
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `seed_merged=${added + replaced}\n`);
  }
}

main();
