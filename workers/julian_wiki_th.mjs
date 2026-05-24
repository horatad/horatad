#!/usr/bin/env node
// JULIAN Wikipedia TH Enrichment
//
// เป้าหมาย: เติม time_utc + ข้อมูลสถานที่เกิด จาก Wikipedia ภาษาไทย
// โฟกัส: tier 1 country=TH records ที่ accuracy=D (Wikidata มีแค่วัน)
//
// Flow:
//   1. Filter records: tier=1, country=TH, no time_utc, source=wikidata:Q*
//   2. ดึง Q-ID → query Wikidata sitelinks API → Thai page title
//   3. Fetch Thai Wikipedia page (REST API)
//   4. Parse Thai infobox + body หา "เวลาเกิด" pattern
//   5. Output JSONL enriched
//
// วิธีใช้:
//   node julian_wiki_th.mjs [input.jsonl] > enriched.jsonl
//   node julian_wiki_th.mjs --test                  # offline parser test

import { readFileSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import { appendRaw } from './julian_raw_writer.mjs';

const USER_AGENT  = 'JULIAN-bot/1.0 (horatad.com; empirical-astro-research)';
const DELAY_MS    = 1500;   // polite gap — Wikimedia limit ~200/min
const MAX_PER_RUN = 200;

const WD_API      = 'https://www.wikidata.org/w/api.php';
const WIKI_REST   = 'https://th.wikipedia.org/api/rest_v1/page/html/';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── แปลงตัวเลขไทย → อารบิก ───────────────────────────────────────────────────
const THAI_DIGITS = { '๐':'0','๑':'1','๒':'2','๓':'3','๔':'4','๕':'5','๖':'6','๗':'7','๘':'8','๙':'9' };
function thaiToArabic(s) {
  return s.replace(/[๐-๙]/g, d => THAI_DIGITS[d] || d);
}

// ── Parse Thai birth time จาก HTML/wikitext ──────────────────────────────────
// Pattern ที่พบใน wiki ภาษาไทย:
//   - "เวลา HH:MM น."
//   - "เวลา HH.MM น."
//   - "เวลา HH นาฬิกา MM นาที"
//   - "เวลา HH นาฬิกา"  (ไม่มีนาที → MM=00)
//   - "เกิดเวลา HH:MM"
export function parseBirthTimeTh(text) {
  if (!text) return null;
  const t = thaiToArabic(text);

  // Pattern A: เวลา HH:MM น. (หรือ HH.MM น.)
  let m = t.match(/เวลา\s*(\d{1,2})[:.](\d{1,2})\s*(?:น\.|นาฬิกา|น)/);
  if (m) return formatTime(m[1], m[2]);

  // Pattern B: เกิดเวลา HH:MM
  m = t.match(/เกิด(?:เมื่อ)?(?:วันที่[^เ]{0,50})?เวลา\s*(\d{1,2})[:.](\d{1,2})/);
  if (m) return formatTime(m[1], m[2]);

  // Pattern C: HH นาฬิกา MM นาที
  m = t.match(/(\d{1,2})\s*นาฬิกา\s*(\d{1,2})\s*นาที/);
  if (m) return formatTime(m[1], m[2]);

  // Pattern D: HH นาฬิกา (ไม่มีนาที)
  m = t.match(/เวลา\s*(\d{1,2})\s*นาฬิกา(?!\s*\d)/);
  if (m) return formatTime(m[1], '0');

  // Pattern E: เวลา HH น. (ไม่มีนาที)
  m = t.match(/เวลา\s*(\d{1,2})\s*น\./);
  if (m) return formatTime(m[1], '0');

  return null;
}

function formatTime(h, m) {
  const hh = parseInt(h);
  const mm = parseInt(m);
  if (isNaN(hh) || isNaN(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

// ── Parse Thai birth place (จังหวัด) ─────────────────────────────────────────
// ส่งกลับเฉพาะชื่อจังหวัด — ไม่ geocode (ผู้ใช้กรอกหน้าจอเอง)
const TH_PROVINCES = [
  'กรุงเทพ','กรุงเทพมหานคร','กระบี่','กาญจนบุรี','กาฬสินธุ์','กำแพงเพชร',
  'ขอนแก่น','จันทบุรี','ฉะเชิงเทรา','ชลบุรี','ชัยนาท','ชัยภูมิ','ชุมพร',
  'เชียงราย','เชียงใหม่','ตรัง','ตราด','ตาก','นครนายก','นครปฐม','นครพนม',
  'นครราชสีมา','นครศรีธรรมราช','นครสวรรค์','นนทบุรี','นราธิวาส','น่าน',
  'บึงกาฬ','บุรีรัมย์','ปทุมธานี','ประจวบคีรีขันธ์','ปราจีนบุรี','ปัตตานี',
  'พระนครศรีอยุธยา','พะเยา','พังงา','พัทลุง','พิจิตร','พิษณุโลก','เพชรบุรี',
  'เพชรบูรณ์','แพร่','ภูเก็ต','มหาสารคาม','มุกดาหาร','แม่ฮ่องสอน','ยโสธร',
  'ยะลา','ร้อยเอ็ด','ระนอง','ระยอง','ราชบุรี','ลพบุรี','ลำปาง','ลำพูน','เลย',
  'ศรีสะเกษ','สกลนคร','สงขลา','สตูล','สมุทรปราการ','สมุทรสงคราม','สมุทรสาคร',
  'สระแก้ว','สระบุรี','สิงห์บุรี','สุโขทัย','สุพรรณบุรี','สุราษฎร์ธานี','สุรินทร์',
  'หนองคาย','หนองบัวลำภู','อ่างทอง','อำนาจเจริญ','อุดรธานี','อุตรดิตถ์','อุทัยธานี',
  'อุบลราชธานี',
];
export function parseBirthProvinceTh(text) {
  if (!text) return null;
  for (const p of TH_PROVINCES) {
    if (text.includes(p)) return p;
  }
  return null;
}

// ── Strip HTML → plain text สำหรับ regex ─────────────────────────────────────
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Get Thai wiki page title จาก Q-ID ────────────────────────────────────────
async function getThPageTitle(qid) {
  const url = `${WD_API}?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=thwiki&format=json&origin=*`;
  try {
    const resp = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
    if (!resp.ok) return null;
    const json = await resp.json();
    const site = json?.entities?.[qid]?.sitelinks?.thwiki;
    return site?.title || null;
  } catch (e) {
    console.error(`  getThPageTitle ${qid}: ${e.message}`);
    return null;
  }
}

// ── Fetch Thai wiki page HTML ────────────────────────────────────────────────
async function fetchWikiThPage(title) {
  const encoded = encodeURIComponent(title.replace(/ /g, '_'));
  const url = `${WIKI_REST}${encoded}`;
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch (e) {
    console.error(`  fetchWikiTh ${title}: ${e.message}`);
    return null;
  }
}

// ── Enrich 1 record ───────────────────────────────────────────────────────────
async function enrichOne(record) {
  const m = record.source?.match(/wikidata:(Q\d+)/);
  if (!m) return null;
  const qid = m[1];

  const title = await getThPageTitle(qid);
  if (!title) {
    console.log(`  no thwiki: ${record.name} (${qid})`);
    return null;
  }
  await sleep(DELAY_MS);

  const html = await fetchWikiThPage(title);
  if (!html) {
    console.log(`  no page: ${record.name} → ${title}`);
    return null;
  }

  const text = stripHtml(html);
  const time_utc = parseBirthTimeTh(text);
  const province = parseBirthProvinceTh(text);

  if (!time_utc && !province) {
    console.log(`  no infobox data: ${record.name} → ${title}`);
    return null;
  }

  console.log(`  ✓ ${record.name}: time=${time_utc ?? '-'} prov=${province ?? '-'}`);

  return {
    jd:              record.jd,
    name:            record.name,
    event_label:     record.event_label ?? null,
    type:            record.type ?? 'human',
    country:         record.country ?? 'TH',
    tier:            record.tier ?? 1,
    lat:             null,
    lng:             null,
    time_utc:        time_utc,
    lagna_sign:      null,
    relate_id:       record.relate_id ?? null,
    source:          `wikipedia_th:${title}|${record.source}`,
    source_type:     'internet',
    accuracy:        time_utc ? 'C' : (record.accuracy ?? 'D'),
    validated_count: 0,
    confidence:      time_utc ? 0.92 : 0.85,
    notes:           province ? `birth_province:${province}` : null,
  };
}

// ── Offline parser test ──────────────────────────────────────────────────────
function runTests() {
  const cases = [
    { text: 'เกิดเมื่อวันที่ 17 กรกฎาคม พ.ศ. 2530 เวลา 09:30 น. ที่กรุงเทพมหานคร',
      expected: '09:30', province: 'กรุงเทพ' },
    { text: 'เกิดเวลา ๑๔.๒๕ น. ที่จังหวัดเชียงใหม่',
      expected: '14:25', province: 'เชียงใหม่' },
    { text: '15 นาฬิกา 45 นาที ของวันที่ 1 มกราคม 2500',
      expected: '15:45', province: null },
    { text: 'เกิดเมื่อปี พ.ศ. 2480 ที่อำเภอเมือง จังหวัดขอนแก่น',
      expected: null, province: 'ขอนแก่น' },
    { text: 'เวลา 7 นาฬิกา ของเช้าวันนั้น เกิดที่จังหวัดภูเก็ต',
      expected: '07:00', province: 'ภูเก็ต' },
    { text: 'เวลา 8 น. ที่นครราชสีมา',
      expected: '08:00', province: 'นครราชสีมา' },
    { text: 'ไม่มีข้อมูลเวลาเกิด เกิดที่กรุงเทพ',
      expected: null, province: 'กรุงเทพ' },
  ];

  let pass = 0, fail = 0;
  for (const c of cases) {
    const t = parseBirthTimeTh(c.text);
    const p = parseBirthProvinceTh(c.text);
    const ok = t === c.expected && p === c.province;
    if (ok) { pass++; console.log(`  ✓ time=${t} prov=${p}`); }
    else    { fail++; console.error(`  ✗ expected time=${c.expected} prov=${c.province} got time=${t} prov=${p} | text="${c.text}"`); }
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

  // Filter: tier 1 country=TH no time_utc มี wikidata source
  const records = lines
    .map(l => { try { return JSON.parse(l); } catch (_) { return null; } })
    .filter(r => r && !r.time_utc && r.tier === 1 && r.country === 'TH'
                 && r.source?.startsWith('wikidata:'))
    .slice(0, MAX_PER_RUN);

  console.error(`Wikipedia TH enrichment: ${records.length} records (max ${MAX_PER_RUN})`);

  let enriched = 0;
  for (const record of records) {
    await sleep(DELAY_MS);
    const result = await enrichOne(record);
    if (result) {
      process.stdout.write(JSON.stringify(result) + '\n');
      appendRaw('wikipedia_th', result);
      enriched++;
    }
  }

  console.error(`Done: ${enriched}/${records.length} enriched`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
