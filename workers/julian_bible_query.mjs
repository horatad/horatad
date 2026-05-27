#!/usr/bin/env node
/**
 * julian_bible_query.mjs
 * Query JULIAN natal planet positions for BIBLE rule validation.
 *
 * Answers questions like:
 *   "How many people have natal_MR in sign X?"
 *   "Among people with natal_MR conj natal_SA, what is their event distribution?"
 *   "What fraction of deaths had transit_MR in same sign as natal_MR?"
 *
 * Input:  data/julian_positions_by_jd.json  (pre-computed, no engine needed)
 *         data/julian_all.json              (person metadata)
 *         data/julian_events.jsonl          (life events)
 * Output: console report + data/julian_bible_query_cache.json
 *
 * Usage:
 *   node workers/julian_bible_query.mjs --natal MR --sign 0-11
 *   node workers/julian_bible_query.mjs --natal MR --quality conjunction --natal2 SA
 *   node workers/julian_bible_query.mjs --stats
 *   node workers/julian_bible_query.mjs --rule "MR_self_conj"
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const PLANET_NAMES = ['SU','MO','MA','ME','JU','VE','SA','RA','KE','MR'];
const PLANET_IDX   = Object.fromEntries(PLANET_NAMES.map((n,i)=>[n,i]));
const ZODIAC_TH    = ['เมษ','พฤษภ','มิถุน','กรกฎ','สิงห์','กันย์','ตุลย์','พิจิก','ธนู','มกร','กุมภ์','มีน'];
const ZODIAC_EN    = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                      'Libra','Scorpio','Sagitt','Capri','Aquar','Pisces'];

const args = process.argv.slice(2);
const MODE_STATS = args.includes('--stats');
const MODE_RULE  = args[args.indexOf('--rule')  + 1];
const NATAL_P    = args[args.indexOf('--natal') + 1];
const SIGN_FILTER = args[args.indexOf('--sign') + 1];

// ── Load data ─────────────────────────────────────────────────────────────────
console.log('Loading positions cache...');
const byJd = JSON.parse(readFileSync('data/julian_positions_by_jd.json', 'utf8'));
const positions = byJd.positions;   // { jd: [SU,MO,MA,ME,JU,VE,SA,RA,KE,MR] sign 0-11 }
const meta      = byJd.meta;

console.log('Loading person records...');
const people = JSON.parse(readFileSync('data/julian_all.json', 'utf8'));
console.log(`  People: ${people.length} | JD cache: ${Object.keys(positions).length} unique`);

// Attach positions to people
const peopleWithPos = people.filter(p => p.jd && positions[p.jd]);
console.log(`  People with natal positions: ${peopleWithPos.length}`);

// Load events if available
let events = [];
if (existsSync('data/julian_events.jsonl')) {
  const lines = readFileSync('data/julian_events.jsonl','utf8').split('\n').filter(Boolean);
  for (const l of lines) {
    try { events.push(JSON.parse(l)); } catch(_) {}
  }
  console.log(`  Events: ${events.length}`);
}

// ── Utility ───────────────────────────────────────────────────────────────────
function getNatalSigns(person) {
  return positions[person.jd];  // [SU,MO,...,MR] sign 0-11
}

function signDist(s1, s2) {
  const raw = Math.abs(s1 - s2);
  return Math.min(raw, 12 - raw);
}

// ── MODE: --stats ─────────────────────────────────────────────────────────────
if (MODE_STATS) {
  console.log('\n═══ JULIAN Bible Stats ═══\n');

  // Planet sign distribution (natal)
  console.log('Natal planet sign distribution (n=' + peopleWithPos.length + '):');
  console.log('Planet  ' + ZODIAC_EN.map(z=>z.slice(0,4).padStart(5)).join(''));
  console.log('─'.repeat(8 + 12*5));

  for (const pName of PLANET_NAMES) {
    const pi = PLANET_IDX[pName];
    const counts = new Array(12).fill(0);
    for (const p of peopleWithPos) counts[getNatalSigns(p)[pi]]++;
    const total = counts.reduce((a,b)=>a+b, 0);
    const row = counts.map(c => {
      const pct = total > 0 ? c/total*100 : 0;
      return (pct.toFixed(0)+'%').padStart(5);
    }).join('');
    console.log(pName.padEnd(7) + ' ' + row);
  }

  // Event type distribution
  if (events.length > 0) {
    console.log('\nEvent type distribution:');
    const evDist = {};
    for (const ev of events) evDist[ev.event_type] = (evDist[ev.event_type]||0)+1;
    for (const [type, cnt] of Object.entries(evDist).sort((a,b)=>b[1]-a[1])) {
      console.log(`  ${type.padEnd(20)} ${cnt.toString().padStart(6)}`);
    }
  }

  process.exit(0);
}

// ── MODE: --rule ──────────────────────────────────────────────────────────────
if (MODE_RULE === 'MR_self_conj') {
  console.log('\n═══ Empirical check: natal_MR sign distribution in death events ═══\n');

  // Group people by natal_MR sign
  const mrSignCounts = new Array(12).fill(0);
  const mrSignDeaths = new Array(12).fill(0);

  for (const p of peopleWithPos) {
    const pos = getNatalSigns(p);
    const mrSign = pos[PLANET_IDX['MR']];
    mrSignCounts[mrSign]++;
  }

  // For each death event, find person's natal_MR sign
  const deathEvents = events.filter(e => e.event_type === 'death');
  for (const ev of deathEvents) {
    const pos = positions[ev.birth_jd];
    if (!pos) continue;
    mrSignDeaths[pos[PLANET_IDX['MR']]]++;
  }

  console.log('Sign         Natal_MR  Death events  Rate vs avg');
  console.log('─'.repeat(50));
  const avgRate = deathEvents.length / peopleWithPos.length;
  for (let s = 0; s < 12; s++) {
    const rate = mrSignCounts[s] > 0 ? mrSignDeaths[s] / mrSignCounts[s] : 0;
    const bar  = '█'.repeat(Math.round(rate / avgRate * 5));
    console.log(
      `${ZODIAC_TH[s].padEnd(7)} (${ZODIAC_EN[s].slice(0,6).padEnd(6)})` +
      `  ${mrSignCounts[s].toString().padStart(8)}` +
      `  ${mrSignDeaths[s].toString().padStart(12)}` +
      `  ${(rate/avgRate).toFixed(2).padStart(8)}×  ${bar}`
    );
  }
  process.exit(0);
}

// ── MODE: --natal PLANET [--sign N] ──────────────────────────────────────────
if (NATAL_P) {
  const pi = PLANET_IDX[NATAL_P];
  if (pi === undefined) { console.error(`Unknown planet: ${NATAL_P}`); process.exit(1); }

  let filtered = peopleWithPos;
  if (SIGN_FILTER !== undefined) {
    const sign = parseInt(SIGN_FILTER, 10);
    filtered = peopleWithPos.filter(p => getNatalSigns(p)[pi] === sign);
    console.log(`\nPeople with natal_${NATAL_P} in ${ZODIAC_TH[sign]} (${ZODIAC_EN[sign]}): ${filtered.length}`);
  } else {
    console.log(`\nNatal_${NATAL_P} distribution across signs:`);
    const counts = new Array(12).fill(0);
    for (const p of peopleWithPos) counts[getNatalSigns(p)[pi]]++;
    const total = counts.reduce((a,b)=>a+b,0);
    for (let s = 0; s < 12; s++) {
      const bar = '█'.repeat(Math.round(counts[s]/total*60));
      console.log(`  ${ZODIAC_TH[s].padEnd(7)} ${counts[s].toString().padStart(5)} (${(counts[s]/total*100).toFixed(1)}%)  ${bar}`);
    }
  }

  // Cross with events
  if (events.length > 0 && SIGN_FILTER !== undefined) {
    const personKeys = new Set(filtered.map(p => p.wikidata_id || p.name));
    const relEvents  = events.filter(ev => {
      const pos = positions[ev.birth_jd];
      return pos && pos[pi] === parseInt(SIGN_FILTER, 10);
    });
    const evDist = {};
    for (const ev of relEvents) evDist[ev.event_type] = (evDist[ev.event_type]||0)+1;
    console.log(`\nEvent distribution for these people (${relEvents.length} events):`);
    for (const [type, cnt] of Object.entries(evDist).sort((a,b)=>b[1]-a[1])) {
      console.log(`  ${type.padEnd(20)} ${cnt.toString().padStart(6)}`);
    }
  }

  process.exit(0);
}

// ── DEFAULT: show usage ───────────────────────────────────────────────────────
console.log(`
julian_bible_query.mjs — JULIAN natal query tool for BIBLE validation

Usage:
  node workers/julian_bible_query.mjs --stats
    → planet sign distribution + event type counts

  node workers/julian_bible_query.mjs --natal MR
    → distribution of natal_MR across 12 signs

  node workers/julian_bible_query.mjs --natal MR --sign 3
    → people with natal_MR in sign 3 (กรกฎ) + event cross-reference

  node workers/julian_bible_query.mjs --rule MR_self_conj
    → natal_MR sign distribution in death events (empirical MR×MR check)

Planet codes: ${PLANET_NAMES.join(', ')}
Sign numbers: 0=เมษ 1=พฤษภ 2=มิถุน 3=กรกฎ 4=สิงห์ 5=กันย์
             6=ตุลย์ 7=พิจิก 8=ธนู 9=มกร 10=กุมภ์ 11=มีน
`);
