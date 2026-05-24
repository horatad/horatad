#!/usr/bin/env node
// JULIAN Wikidata Coord Enricher
//
// เป้าหมาย: เติม lat + lng จาก Wikidata P19 (place of birth) + P625 (coord location)
// ทดแทน Astrotheme lat/lng parser ที่ broken (lat/lng=0 ทั้ง 599 C-grade records)
//
// Flow:
//   1. Filter records: !lat || lat==0 && source=wikidata:Q*
//   2. Batch SPARQL VALUES query (BATCH_SIZE QIDs ต่อ batch)
//   3. Parse Point(lng lat) WKT → lat/lng decimal
//   4. Validate ranges + drop (0,0) "null island"
//   5. Output JSONL enriched + append raw bucket
//
// วิธีใช้:
//   node julian_wikidata_coord.mjs [input.jsonl] > enriched.jsonl
//   node julian_wikidata_coord.mjs --test                  # offline parser test
//
// Notes:
//   - Wikidata SPARQL endpoint block sandbox (403) — รันใน GHA workflow เท่านั้น
//   - Source field คงไว้ wikidata:Q* (coord = enrichment, ไม่สร้าง source ใหม่)
//   - notes field เก็บ birthplace label เพื่อ audit trail

import { readFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { appendRaw } from './julian_raw_writer.mjs';

const USER_AGENT     = 'JULIAN-bot/1.0 (horatad.com; empirical-astro-research)';
const WIKIDATA_URL   = 'https://query.wikidata.org/sparql';
const BATCH_SIZE     = 50;    // QIDs per SPARQL query — balance request size vs round-trips
const MAX_PER_RUN    = 500;
const BATCH_DELAY_MS = 1500;  // polite gap between batches

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Parse WKT Point format → { lat, lng } ────────────────────────────────────
// Wikidata P625 stores as WKT: Point(longitude latitude) — lng FIRST
export function parsePoint(wkt) {
  if (!wkt) return null;
  const m = wkt.match(/Point\(\s*(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s*\)/);
  if (!m) return null;
  const lng = parseFloat(m[1]);
  const lat = parseFloat(m[2]);
  if (isNaN(lat) || isNaN(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  // Drop "null island" (0,0) — Wikidata placeholder for unknown
  if (lat === 0 && lng === 0) return null;
  return {
    lat: parseFloat(lat.toFixed(4)),
    lng: parseFloat(lng.toFixed(4)),
  };
}

// ── Fetch coords for QID batch ───────────────────────────────────────────────
async function fetchCoords(qids) {
  if (!qids.length) return new Map();
  const values = qids.map(q => `wd:${q}`).join(' ');
  const sparql = `
    SELECT ?person ?coord ?birthplaceLabel WHERE {
      VALUES ?person { ${values} }
      ?person wdt:P19 ?birthplace.
      ?birthplace wdt:P625 ?coord.
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
  `.trim();

  const url = `${WIKIDATA_URL}?query=${encodeURIComponent(sparql)}&format=json`;

  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/sparql-results+json',
      },
    });

    if (!resp.ok) {
      console.error(`  Wikidata HTTP ${resp.status} batch ${qids.length} QIDs`);
      return new Map();
    }

    const j = await resp.json();
    const m = new Map();
    for (const b of (j?.results?.bindings || [])) {
      const qid = b.person?.value?.split('/').pop();
      if (!qid) continue;
      const parsed = parsePoint(b.coord?.value);
      if (!parsed) continue;
      // ใช้ entry แรกที่เจอ — กรณี multiple birthplaces, Wikidata อาจส่งหลายแถว
      if (!m.has(qid)) {
        m.set(qid, {
          ...parsed,
          birthplace: b.birthplaceLabel?.value || null,
        });
      }
    }
    return m;
  } catch (e) {
    console.error(`  fetch error: ${e.message}`);
    return new Map();
  }
}

// ── Offline parser test ──────────────────────────────────────────────────────
function runTests() {
  const cases = [
    // valid WKT Point
    { input: 'Point(100.5018 13.7563)',           expected: { lat: 13.7563, lng: 100.5018 } },
    { input: 'Point(-73.9857 40.7484)',           expected: { lat: 40.7484, lng: -73.9857 } },
    { input: 'Point(2.3522 48.8566)',             expected: { lat: 48.8566, lng: 2.3522 } },
    // truncate to 4 decimals
    { input: 'Point(98.9817567 18.7882345)',      expected: { lat: 18.7882, lng: 98.9818 } },
    // negative coords (south/west)
    { input: 'Point(-58.3816 -34.6037)',          expected: { lat: -34.6037, lng: -58.3816 } },
    // whitespace tolerance
    { input: 'Point( 100.5  13.75 )',             expected: { lat: 13.75, lng: 100.5 } },
    // (0,0) null island → reject
    { input: 'Point(0 0)',                        expected: null },
    // out of range → reject
    { input: 'Point(200 50)',                     expected: null },
    { input: 'Point(50 95)',                      expected: null },
    // not WKT → reject
    { input: '13.7563,100.5018',                  expected: null },
    { input: null,                                expected: null },
    { input: '',                                  expected: null },
  ];
  let pass = 0, fail = 0;
  for (const c of cases) {
    const r = parsePoint(c.input);
    const ok = JSON.stringify(r) === JSON.stringify(c.expected);
    if (ok) { pass++; console.log(`  ✓ ${JSON.stringify(c.input)} → ${JSON.stringify(r)}`); }
    else    { fail++; console.error(`  ✗ ${JSON.stringify(c.input)} → ${JSON.stringify(r)} (expected ${JSON.stringify(c.expected)})`); }
  }
  console.log(`\nTests: ${pass}/${cases.length} passed`);
  process.exit(fail ? 1 : 0);
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (process.argv.includes('--test')) {
    runTests();
    return;
  }

  let lines = [];
  const inputFile = process.argv[2];

  if (inputFile && existsSync(inputFile)) {
    lines = readFileSync(inputFile, 'utf8').trim().split('\n').filter(Boolean);
  } else {
    const rl = createInterface({ input: process.stdin });
    for await (const line of rl) {
      if (line.trim()) lines.push(line.trim());
    }
  }

  if (!lines.length) {
    console.error('No input records');
    process.exit(1);
  }

  // Filter: records without coords + has Wikidata source
  const records = lines
    .map(l => { try { return JSON.parse(l); } catch (_) { return null; } })
    .filter(r => r && r.jd && r.name)
    .filter(r => (!r.lat || r.lat === 0) && (!r.lng || r.lng === 0))
    .filter(r => r.source?.startsWith('wikidata:'))
    .slice(0, MAX_PER_RUN);

  console.error(`Wikidata coord enrichment: ${records.length} records (max ${MAX_PER_RUN}, batch ${BATCH_SIZE})`);

  if (!records.length) return;

  let enriched = 0;
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    const qids = batch.map(r => r.source.split(':')[1]);

    console.error(`  Batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(records.length/BATCH_SIZE)} (${qids.length} QIDs)`);
    const coords = await fetchCoords(qids);
    console.error(`  → ${coords.size}/${qids.length} found coords`);

    for (const record of batch) {
      const qid = record.source.split(':')[1];
      const c = coords.get(qid);
      if (!c) continue;

      const out = {
        jd:              record.jd,
        name:            record.name,
        event_label:     record.event_label ?? null,
        type:            record.type ?? 'human',
        country:         record.country ?? null,
        tier:            record.tier ?? null,
        lat:             c.lat,
        lng:             c.lng,
        time_utc:        record.time_utc ?? null,
        lagna_sign:      null,
        relate_id:       record.relate_id ?? null,
        source:          record.source,  // preserve — coord is enrichment, not new source
        source_type:     'internet',
        accuracy:        record.accuracy ?? 'D',
        validated_count: 0,
        confidence:      Math.max(record.confidence ?? 0, 0.90),
        notes:           record.notes || (c.birthplace ? `birthplace:${c.birthplace}` : null),
      };
      process.stdout.write(JSON.stringify(out) + '\n');
      appendRaw('wikidata_coord', out);
      enriched++;
    }

    if (i + BATCH_SIZE < records.length) await sleep(BATCH_DELAY_MS);
  }

  console.error(`Done: ${enriched}/${records.length} enriched with lat/lng`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
