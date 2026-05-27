#!/usr/bin/env node
/**
 * julian_event_scraper.mjs
 * Scrape life events from Wikidata for ML training labels.
 *
 * Phase 1C: death | position_start | award_received | marriage | graduation | child_birth
 *
 * Input:  data/julian_all.json (QIDs from wikidata: sources)
 * Output: data/julian_events.jsonl (append-only)
 * State:  workers/julian_events_checkpoint.json
 *
 * Usage: node workers/julian_event_scraper.mjs [--dry-run] [--limit N] [--time-budget N] [--resume]
 *   --dry-run      : print summary only, do not write
 *   --limit N      : process only first N QIDs (testing)
 *   --time-budget N: stop after N seconds (default 1500), save checkpoint
 *   --resume       : continue from last checkpoint
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync, unlinkSync } from 'fs';

const DRY_RUN     = process.argv.includes('--dry-run');
const RESUME      = process.argv.includes('--resume');
const LIMIT       = (() => { const i = process.argv.indexOf('--limit');       return i >= 0 ? parseInt(process.argv[i + 1]) : Infinity; })();
const TIME_BUDGET = (() => { const i = process.argv.indexOf('--time-budget'); return i >= 0 ? parseInt(process.argv[i + 1]) : 1500; })();

const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT        = 'JULIAN-bot/1.0 (horatad.com; event-scraper)';
const BATCH_SIZE        = 50;
const DELAY_MS          = 2000;
const CHECKPOINT_FILE   = 'workers/julian_events_checkpoint.json';
const OUTPUT_FILE       = 'data/julian_events.jsonl';

const JD_EPOCH_VAL = 730428;
const JD_EPOCH_MS  = Date.UTC(2000, 0, 1);
const START_TIME   = Date.now();

function sleep(ms)    { return new Promise(r => setTimeout(r, ms)); }
function elapsed()    { return Math.round((Date.now() - START_TIME) / 1000); }
function budgetLeft() { return TIME_BUDGET - elapsed(); }

function get_j(d, m, y) {
  return JD_EPOCH_VAL + Math.round((Date.UTC(y, m - 1, d) - JD_EPOCH_MS) / 86400000);
}

// Parse Wikidata xsd:dateTime → {y,m,d,jd} or null
// Rejects month=0 or day=0 (unknown precision — day-level required for transit calc)
function parseWikidate(str) {
  if (!str) return null;
  const match = str.match(/^([+-]?\d{4,})-(\d{2})-(\d{2})T/);
  if (!match) return null;
  const y = parseInt(match[1]), mo = parseInt(match[2]), d = parseInt(match[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  if (y < 200 || y > 2200) return null;
  return { y, m: mo, d, jd: get_j(d, mo, y) };
}

function buildSparql(qids) {
  const values = qids.map(q => `wd:${q}`).join(' ');
  return `
SELECT DISTINCT ?person ?event_type ?date WHERE {
  VALUES ?person { ${values} }
  {
    ?person wdt:P570 ?date.
    BIND("death" AS ?event_type)
  } UNION {
    ?person p:P39 ?s.
    { ?s pq:P580 ?date. } UNION { ?s pq:P585 ?date. }
    BIND("position_start" AS ?event_type)
  } UNION {
    ?person p:P166 ?s.
    ?s pq:P585 ?date.
    BIND("award_received" AS ?event_type)
  } UNION {
    ?person p:P26 ?s.
    { ?s pq:P580 ?date. } UNION { ?s pq:P585 ?date. }
    BIND("marriage" AS ?event_type)
  } UNION {
    ?person p:P69 ?s.
    ?s pq:P582 ?date.
    BIND("graduation" AS ?event_type)
  } UNION {
    ?person wdt:P40 ?child.
    ?child p:P569/psv:P569 [wikibase:timeValue ?date; wikibase:timePrecision ?datePrec].
    FILTER(?datePrec >= 11)
    BIND("child_birth" AS ?event_type)
  }
}
LIMIT 8000`;
}

async function fetchEvents(qids) {
  const sparql = buildSparql(qids);
  const url    = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sparql)}&format=json`;
  const resp   = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json' },
    signal: AbortSignal.timeout(55000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

  const json   = await resp.json();
  const events = [];
  const seen   = new Set();

  for (const b of json.results.bindings) {
    const qid        = b.person.value.split('/').pop();
    const event_type = b.event_type.value;
    const parsed     = parseWikidate(b.date?.value);
    if (!parsed) continue;
    const key = `${qid}|${event_type}|${parsed.jd}`;
    if (seen.has(key)) continue;
    seen.add(key);
    events.push({ qid, event_type, date: parsed });
  }
  return events;
}

async function main() {
  const records = JSON.parse(readFileSync('data/julian_all.json', 'utf8'));
  console.log(`Loaded ${records.length} records`);

  // Extract unique QIDs from wikidata: sources
  const qidMap = new Map();
  for (const r of records) {
    if (!r.source?.startsWith('wikidata:')) continue;
    const qid = r.source.slice(9);
    if (/^Q\d+$/.test(qid) && !qidMap.has(qid)) {
      qidMap.set(qid, { person_key: `${r.jd}|${r.name}`, birth_jd: r.jd });
    }
  }

  const allQids = [...qidMap.keys()].slice(0, LIMIT);
  console.log(`Unique QIDs: ${allQids.length}`);
  console.log(`Time budget: ${TIME_BUDGET}s | DRY_RUN: ${DRY_RUN} | RESUME: ${RESUME}`);

  const batches = [];
  for (let i = 0; i < allQids.length; i += BATCH_SIZE) {
    batches.push(allQids.slice(i, i + BATCH_SIZE));
  }
  console.log(`Batches: ${batches.length} (${BATCH_SIZE} QIDs each)`);

  let startBatch = 0;
  if (RESUME && existsSync(CHECKPOINT_FILE)) {
    const cp = JSON.parse(readFileSync(CHECKPOINT_FILE, 'utf8'));
    startBatch = cp.batch_index || 0;
    console.log(`Resuming from batch ${startBatch}/${batches.length} (saved ${cp.saved_at})`);
  }

  if (!DRY_RUN) {
    mkdirSync('data', { recursive: true });
    if (!existsSync(OUTPUT_FILE)) writeFileSync(OUTPUT_FILE, '');
  }

  let totalEvents = 0;
  let lastBatchDone = startBatch - 1;

  for (let bi = startBatch; bi < batches.length; bi++) {
    if (budgetLeft() < 30) {
      console.log(`\n⏱ Budget exhausted (${elapsed()}s) — saving checkpoint at batch ${bi}`);
      if (!DRY_RUN) {
        writeFileSync(CHECKPOINT_FILE, JSON.stringify({
          batch_index: bi, total_batches: batches.length, saved_at: new Date().toISOString(),
        }, null, 2));
      }
      break;
    }

    const batch = batches[bi];
    process.stderr.write(`  batch ${bi + 1}/${batches.length} (${batch.length} QIDs, ${elapsed()}s)...`);

    let events;
    try {
      events = await fetchEvents(batch);
    } catch (e) {
      process.stderr.write(` ERROR: ${e.message}\n`);
      await sleep(DELAY_MS * 2);
      continue;
    }
    process.stderr.write(` ${events.length} events\n`);

    if (!DRY_RUN && events.length > 0) {
      const now   = new Date().toISOString();
      const lines = events.map(ev => {
        const info = qidMap.get(ev.qid);
        return JSON.stringify({
          person_key: info.person_key,
          birth_jd:   info.birth_jd,
          event_jd:   ev.date.jd,
          event_type: ev.event_type,
          source:     `wikidata:${ev.qid}`,
          confidence: ev.event_type === 'death' ? 0.98
                    : ev.event_type === 'child_birth' ? 0.92
                    : ev.event_type === 'marriage' ? 0.88
                    : ev.event_type === 'graduation' ? 0.85
                    : 0.90,
          scraped_at: now,
        });
      });
      appendFileSync(OUTPUT_FILE, lines.join('\n') + '\n');
    }

    totalEvents   += events.length;
    lastBatchDone  = bi;
    await sleep(DELAY_MS);
  }

  const allDone = lastBatchDone >= batches.length - 1;

  if (!DRY_RUN && allDone && existsSync(CHECKPOINT_FILE)) {
    try { unlinkSync(CHECKPOINT_FILE); } catch (_) {}
    console.log('Checkpoint cleared (all done)');
  }

  console.log(`\n── Summary ──`);
  console.log(`Events scraped this run: ${totalEvents}`);
  console.log(`Batches done: ${lastBatchDone + 1 - startBatch}/${batches.length}`);
  console.log(allDone ? '✅ Complete' : `⏸ Partial — ${batches.length - lastBatchDone - 1} batches remaining`);
  console.log(`\nSTATUS=${allDone ? 'complete' : 'partial'}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
