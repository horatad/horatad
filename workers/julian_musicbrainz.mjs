#!/usr/bin/env node
/**
 * julian_musicbrainz.mjs
 * ดึงนักดนตรี + วันเกิดจาก MusicBrainz API → เพิ่มใน julian_all.json
 *
 * License: CC-BY 4.0 — ใช้ได้ฟรี, ToS อนุญาต scraping ที่ polite (1 req/sec)
 * Strategy: ดึงศิลปินที่มี Wikidata QID relation (= notable) + birth date day-precision
 * Input:  data/julian_all.json
 * Output: data/julian_all.json (append new records)
 *
 * Usage: node workers/julian_musicbrainz.mjs [--dry-run] [--limit N] [--time-budget N]
 *   --limit N      : process only first N artist pages (testing)
 *   --time-budget N: stop after N seconds (default 1800)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const DRY_RUN     = process.argv.includes('--dry-run');
const LIMIT       = (() => { const i = process.argv.indexOf('--limit');       return i >= 0 ? parseInt(process.argv[i+1]) : Infinity; })();
const TIME_BUDGET = (() => { const i = process.argv.indexOf('--time-budget'); return i >= 0 ? parseInt(process.argv[i+1]) : 1800; })();

const MB_BASE    = 'https://musicbrainz.org/ws/2';
const USER_AGENT = 'JULIAN-bot/1.0 (horatad.com; julian-musicbrainz)';
const DELAY_MS   = 1100; // MusicBrainz requires >= 1 req/sec
const CHECKPOINT = 'workers/julian_mb_checkpoint.json';
const INPUT_FILE = 'data/julian_all.json';
const PAGE_SIZE  = 100;

const JD_EPOCH_VAL = 730428;
const JD_EPOCH_MS  = Date.UTC(2000, 0, 1);
const START_TIME   = Date.now();

function sleep(ms)    { return new Promise(r => setTimeout(r, ms)); }
function elapsed()    { return Math.round((Date.now() - START_TIME) / 1000); }
function budgetLeft() { return TIME_BUDGET - elapsed(); }

function get_j(d, m, y) {
  return JD_EPOCH_VAL + Math.round((Date.UTC(y, m - 1, d) - JD_EPOCH_MS) / 86400000);
}

function parseMBDate(str) {
  if (!str) return null;
  const parts = str.split('-');
  if (parts.length < 3) return null;
  const y = parseInt(parts[0]), m = parseInt(parts[1]), d = parseInt(parts[2]);
  if (!y || y < 200 || y > 2200 || !m || m < 1 || m > 12 || !d || d < 1 || d > 31) return null;
  return { y, m, d, jd: get_j(d, m, y) };
}

function computeImportance(tier, sitelinks, accuracy) {
  const tierScore = tier === 1 ? 1.0 : 0.6;
  const slScore   = sitelinks ? Math.min(1.0, Math.log(1 + sitelinks) / Math.log(1001)) : 0.05;
  const accScore  = { A: 1.0, B: 0.9, C: 0.7, D: 0.4, F: 0.1 }[accuracy] ?? 0.4;
  return Math.round((0.30 * tierScore + 0.40 * slScore + 0.30 * accScore) * 100) / 100;
}

async function mbFetch(path) {
  const url  = `${MB_BASE}${path}&fmt=json`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/json' },
    signal: AbortSignal.timeout(30000),
  });
  if (resp.status === 503) throw new Error('MB 503 — rate limited');
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

async function main() {
  const allRecords = JSON.parse(readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${allRecords.length} records`);

  // Build seen QID set
  const seenQids = new Set();
  for (const r of allRecords) {
    if (r.source?.startsWith('wikidata:')) seenQids.add(r.source.slice(9));
  }
  console.log(`Seen QIDs: ${seenQids.size}`);

  // Load checkpoint
  let offset = 0;
  if (existsSync(CHECKPOINT)) {
    const cp = JSON.parse(readFileSync(CHECKPOINT, 'utf8'));
    offset = cp.offset || 0;
    console.log(`Resuming from offset ${offset}`);
  }

  const newRecords = [];
  let total = 0, processed = 0;

  // Browse MusicBrainz artists with Wikidata relation (= notable)
  // Use browse by tag doesn't give QIDs easily, so search persons with has_wikidata relation
  // MusicBrainz search: type=person AND disambiguation relation
  while (budgetLeft() > 30 && processed < LIMIT) {
    const path = `/artist?query=type:person+gender:male+gender:female&limit=${PAGE_SIZE}&offset=${offset}&inc=url-rels`;
    let data;
    try {
      data = await mbFetch(path);
    } catch (e) {
      console.error(`Fetch error at offset ${offset}: ${e.message}`);
      await sleep(DELAY_MS * 3);
      continue;
    }

    const artists = data.artists || [];
    if (artists.length === 0) {
      console.log('No more artists — complete');
      break;
    }

    for (const artist of artists) {
      if (!artist['life-span']?.begin) continue;
      const birth = parseMBDate(artist['life-span'].begin);
      if (!birth) continue;

      // Find Wikidata QID from url relations
      const wdRel   = artist.relations?.find(r => r.url?.resource?.includes('wikidata.org/wiki/Q'));
      const wikidataQid = wdRel ? wdRel.url.resource.split('/').pop() : null;

      // Skip if already in our DB
      if (wikidataQid && seenQids.has(wikidataQid)) continue;

      const name    = artist.name;
      const country = artist.country || null;
      const source  = wikidataQid ? `wikidata:${wikidataQid}` : `musicbrainz:${artist.id}`;

      newRecords.push({
        jd: birth.jd, name,
        event_label: 'MusicBrainz musician',
        type: 'human',
        country: country?.slice(0, 2).toUpperCase() || null,
        tier: 2,
        lat: null, lng: null,
        time_utc: null, lagna_sign: null,
        relate_id: null,
        source,
        source_type: 'internet',
        accuracy: 'D',
        sitelinks: null,
        importance: computeImportance(2, null, 'D'),
        validated_count: 0,
        confidence: 0.85,
        notes: `musicbrainz:${artist.id}`,
      });

      if (wikidataQid) seenQids.add(wikidataQid);
      total++;
    }

    process.stderr.write(`  offset=${offset} artists=${artists.length} new_this_page=${newRecords.length - total + artists.filter(a => a['life-span']?.begin).length} total_new=${newRecords.length} (${elapsed()}s)\n`);
    offset += PAGE_SIZE;
    processed += artists.length;
    await sleep(DELAY_MS);
  }

  console.log(`\n── Summary ──`);
  console.log(`New records: ${newRecords.length}`);
  console.log(`Offset reached: ${offset}`);

  if (!DRY_RUN && newRecords.length > 0) {
    const merged = [...allRecords, ...newRecords];
    writeFileSync(INPUT_FILE, JSON.stringify(merged));
    console.log(`✅ Saved ${merged.length} total records to ${INPUT_FILE}`);
  }

  // Save checkpoint
  const done = budgetLeft() > 30 || processed >= LIMIT;
  if (!done && !DRY_RUN) {
    writeFileSync(CHECKPOINT, JSON.stringify({ offset, saved_at: new Date().toISOString() }));
    console.log(`Checkpoint saved at offset ${offset}`);
    console.log('\nSTATUS=partial');
  } else {
    console.log('\nSTATUS=complete');
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
