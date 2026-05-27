#!/usr/bin/env node
/**
 * julian_importance_backfill.mjs
 * เติม sitelinks + importance score ให้ records ใน julian_all.json ที่ยังไม่มี field นี้
 *
 * Strategy:
 *   - Records ที่มี source=wikidata:QXX → lookup sitelinks จาก Wikidata SPARQL (batch 100)
 *   - Records ที่มี source=astrotheme:XX → sitelinks=null (ไม่รู้จาก Astrotheme ID)
 *   - คำนวณ importance จาก tier + sitelinks + accuracy
 *
 * Usage: node workers/julian_importance_backfill.mjs [--dry-run] [--batch-size N]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const DRY_RUN    = process.argv.includes('--dry-run');
const BATCH_SIZE = (() => { const i = process.argv.indexOf('--batch-size'); return i >= 0 ? parseInt(process.argv[i+1]) : 100; })();

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT        = 'JULIAN-bot/1.0 (horatad.com; importance-backfill)';
const DELAY_MS          = 1500;
const INPUT_FILE        = 'data/julian_all.json';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function computeImportance(tier, sitelinks, accuracy) {
  const tierScore = tier === 1 ? 1.0 : tier === 2 ? 0.6 : 0.3;
  const slScore   = sitelinks ? Math.min(1.0, Math.log(1 + sitelinks) / Math.log(1001)) : 0.05;
  const accScore  = { A: 1.0, B: 0.9, C: 0.7, D: 0.4, F: 0.1 }[accuracy] ?? 0.4;
  return Math.round((0.30 * tierScore + 0.40 * slScore + 0.30 * accScore) * 100) / 100;
}

async function fetchSitelinks(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  const sparql = `
SELECT ?person ?links WHERE {
  VALUES ?person { ${values} }
  ?person wikibase:sitelinks ?links.
}`;
  const url  = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
  const resp = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' },
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  const map  = new Map();
  for (const b of json.results.bindings) {
    const qid   = b.person.value.split('/').pop();
    const links = parseInt(b.links.value);
    map.set(qid, links);
  }
  return map;
}

async function main() {
  const records = JSON.parse(readFileSync(INPUT_FILE, 'utf8'));
  console.log(`Loaded ${records.length} records`);

  const needsUpdate = records.filter(r => r.importance == null);
  console.log(`Records needing importance update: ${needsUpdate.length}`);

  if (needsUpdate.length === 0) {
    console.log('✅ All records already have importance score');
    return;
  }

  // Build QID list for wikidata-sourced records
  const qidToIdx = new Map();
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.importance != null) continue;
    if (r.source?.startsWith('wikidata:')) {
      const qid = r.source.slice(9);
      if (/^Q\d+$/.test(qid)) qidToIdx.set(qid, i);
    }
  }
  console.log(`QIDs to lookup: ${qidToIdx.size}`);

  // Fetch sitelinks in batches
  const qids     = [...qidToIdx.keys()];
  const slinkMap = new Map();
  let fetched    = 0;

  for (let i = 0; i < qids.length; i += BATCH_SIZE) {
    const batch = qids.slice(i, i + BATCH_SIZE);
    process.stderr.write(`  sitelinks batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(qids.length/BATCH_SIZE)}...`);
    try {
      const map = await fetchSitelinks(batch);
      for (const [qid, sl] of map) slinkMap.set(qid, sl);
      fetched += map.size;
      process.stderr.write(` ${map.size} found\n`);
    } catch (e) {
      process.stderr.write(` ERROR: ${e.message}\n`);
      await sleep(DELAY_MS * 3);
    }
    await sleep(DELAY_MS);
  }
  console.log(`Sitelinks fetched: ${fetched}/${qids.size}`);

  // Apply importance to all records needing update
  let updated = 0;
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    if (r.importance != null) continue;

    let sitelinks = r.sitelinks ?? null;
    if (sitelinks == null && r.source?.startsWith('wikidata:')) {
      const qid = r.source.slice(9);
      sitelinks = slinkMap.get(qid) ?? null;
    }

    const tier     = r.tier ?? 2;
    const accuracy = r.accuracy ?? 'D';
    records[i] = { ...r, sitelinks, importance: computeImportance(tier, sitelinks, accuracy) };
    updated++;
  }

  console.log(`Updated: ${updated} records`);

  if (!DRY_RUN) {
    writeFileSync(INPUT_FILE, JSON.stringify(records));
    console.log(`✅ Saved to ${INPUT_FILE}`);
  } else {
    const sample = records.filter(r => r.importance != null).slice(0, 3);
    console.log('Sample (dry-run):', JSON.stringify(sample.map(r => ({ name: r.name, sitelinks: r.sitelinks, importance: r.importance })), null, 2));
  }
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
