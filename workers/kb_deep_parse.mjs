#!/usr/bin/env node
// kb_deep_parse.mjs — Enrich elements{} by extracting discriminators from condition_text
// Memory ref: handoffs/bible_memory/LOG.md "2026-05-25 PINNED v2"
//
// Reads schema v2.0-fingerprint file → parses condition_text for inline vocabulary →
// adds structured fields to elements{} → recomputes fingerprint with richer discrimination
//
// New fields added to elements{}:
//   lagna_relation : KUM_LAKKANA | RELATES_LAKKANA | NO_RELATE_LAKKANA | TANUSESH | TANULAGN
//   ruler_of_house : 1..12 (when 'เจ้า<houseName>' detected)
//   inline_house   : 1..12 (when 'ภพ N' or 'ภพ<name>' detected — not as ruler)
//   inline_sign    : 1..12 (when 'ราศี<name>' or 'ใน<signName>' detected)
//   inline_quality : อุจ/นิจ/เกษตร/...  (when quality term detected inline)
//
// Usage:
//   node workers/kb_deep_parse.mjs INPUT [OUTPUT]
//   default OUTPUT = INPUT (overwrite — idempotent)

import fs from 'node:fs';

const INPUT = process.argv[2];
const OUTPUT = process.argv[3] || INPUT;
if (!INPUT) {
  console.error('Usage: node workers/kb_deep_parse.mjs INPUT.json [OUTPUT.json]');
  process.exit(1);
}

const HOUSE_BY_NAME = {
  'ตนุ': 1, 'กฎุมพะ': 2, 'สหัชชะ': 3, 'พันธุ': 4, 'ปุตตะ': 5, 'อริ': 6,
  'ปัตนิ': 7, 'มรณะ': 8, 'ศุภะ': 9, 'กัมมะ': 10, 'ลาภะ': 11, 'วินาศ': 12
};
const SIGN_BY_NAME = {
  'เมษ': 1, 'พฤษภ': 2, 'มิถุน': 3, 'กรกฎ': 4, 'สิงห์': 5, 'กันย์': 6,
  'ตุล': 7, 'พิจิก': 8, 'ธนู': 9, 'มกร': 10, 'มังกร': 10, 'กุมภ์': 11, 'มีน': 12
};
// longest-first to prevent prefix collision (อุจจาวิลาส before อุจ, ประเกษตร before เกษตร)
const QUALITY_KEYWORDS = [
  'อุจจาวิลาส', 'อุจจาภิมุข', 'มหาจักร', 'จุลจักร', 'ราชาโชค', 'เทวีโชค',
  'ประเกษตร', 'อนุเกษตร', 'เกษตร', 'อุจ', 'นิจ'
];

function parseConditionText(c) {
  if (!c) return {};
  const out = {};

  // Lagna relation — order matters (negation first)
  if (/ไม่สัมพันธ์(ถึง)?ลัคนา/.test(c))            out.lagna_relation = 'NO_RELATE_LAKKANA';
  else if (/กุมลัคนา/.test(c))                      out.lagna_relation = 'KUM_LAKKANA';
  else if (/สัมพันธ์(ถึง)?ลัคนา/.test(c))          out.lagna_relation = 'RELATES_LAKKANA';
  else if (/(เป็น)?ตนุเศษ/.test(c))                 out.lagna_relation = 'TANUSESH';
  else if (/(เป็น)?ตนุลัคน์/.test(c))               out.lagna_relation = 'TANULAGN';

  // Ruler of house: 'เจ้า<houseName>'
  for (const [name, id] of Object.entries(HOUSE_BY_NAME)) {
    if (c.includes('เจ้า' + name)) { out.ruler_of_house = id; break; }
  }

  // Inline house (ภพ N / เรือน N / ภพ<name>)
  const houseNum = c.match(/(?:ภพ|เรือน)\s*(\d+)/);
  if (houseNum) out.inline_house = parseInt(houseNum[1]);
  else for (const [name, id] of Object.entries(HOUSE_BY_NAME)) {
    if (c.includes('ภพ' + name)) { out.inline_house = id; break; }
  }

  // Inline sign
  for (const [name, id] of Object.entries(SIGN_BY_NAME)) {
    if (new RegExp('ราศี' + name + '|ใน' + name + '|อยู่' + name).test(c)) {
      out.inline_sign = id;
      break;
    }
  }

  // Inline quality (longest-first)
  for (const q of QUALITY_KEYWORDS) {
    if (c.includes(q)) { out.inline_quality = q; break; }
  }

  return out;
}

function makeFingerprintV3(el, ruleType) {
  const parts = [];
  if (el.planet_ids?.length) parts.push('p' + [...el.planet_ids].sort((a,b)=>a-b).join(','));
  if (el.sign_id != null) parts.push('s' + el.sign_id);
  else if (el.sign_ids?.length) parts.push('s' + [...el.sign_ids].sort((a,b)=>a-b).join(','));
  if (el.quality) parts.push('q:' + el.quality);
  if (el.quality_req) parts.push('qr:' + el.quality_req);
  if (el.aspect) parts.push('a:' + el.aspect);
  if (el.condition_type) parts.push('cnd:' + el.condition_type);
  if (el.contexts?.length) parts.push('ctx:' + [...el.contexts].sort().join(','));
  if (el.domain) parts.push('d:' + el.domain);
  // Deep fields
  if (el.lagna_relation) parts.push('lr:' + el.lagna_relation);
  if (el.ruler_of_house != null) parts.push('rh:' + el.ruler_of_house);
  if (el.inline_sign != null) parts.push('is:' + el.inline_sign);
  if (el.inline_quality) parts.push('iq:' + el.inline_quality);
  if (el.inline_house != null) parts.push('ih:' + el.inline_house);
  parts.push('t:' + (el.type || ruleType));
  return parts.join('+') || 'EMPTY';
}

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const rules = data.rules || [];

let enrichedCount = 0;
const deepFieldCounts = {
  lagna_relation: 0, ruler_of_house: 0,
  inline_house: 0, inline_sign: 0, inline_quality: 0
};

const enriched = rules.map(r => {
  const c = r.condition_text || '';
  const deep = parseConditionText(c);
  if (Object.keys(deep).length > 0) enrichedCount++;
  for (const k of Object.keys(deep)) deepFieldCounts[k]++;
  const newElements = { ...r.elements, ...deep, domain: r.domain };
  newElements.fingerprint = makeFingerprintV3(newElements, r.elements?.type);
  return { ...r, elements: newElements };
});

const fpCounts = {};
enriched.forEach(r => fpCounts[r.elements.fingerprint] = (fpCounts[r.elements.fingerprint] || 0) + 1);
const dupes = Object.entries(fpCounts).filter(([_,n]) => n > 1).sort((a,b) => b[1] - a[1]);
const uniqueCount = Object.keys(fpCounts).length - dupes.length;

console.log(`Input  : ${INPUT}`);
console.log(`Output : ${OUTPUT}`);
console.log(`Rules  : ${rules.length}`);
console.log(`\nEnrichment: ${enrichedCount} / ${rules.length} rules got ≥1 deep field`);
console.log(`Deep field hits:`);
for (const [k, v] of Object.entries(deepFieldCounts)) console.log(`  ${k.padEnd(16)}: ${v}`);

console.log(`\nFingerprint stats:`);
console.log(`  Unique fingerprints   : ${Object.keys(fpCounts).length}`);
console.log(`  Perfectly-unique rules: ${uniqueCount}`);
console.log(`  Dupe groups           : ${dupes.length}`);
if (dupes.length) {
  console.log(`\nTop 10 dupes after deep-parse:`);
  dupes.slice(0, 10).forEach(([fp, n]) => console.log(`  ${String(n).padStart(2)}x  ${fp.length > 90 ? fp.slice(0,87)+'...' : fp}`));
}

const out = {
  _meta: {
    ...data._meta,
    deep_parsed: true,
    deep_parsed_at: new Date().toISOString(),
    deep_parse_stats: {
      enriched_count: enrichedCount,
      field_hits: deepFieldCounts,
      unique_fingerprints: Object.keys(fpCounts).length,
      perfectly_unique_rules: uniqueCount,
      dupe_groups: dupes.length
    }
  },
  rules: enriched
};
fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2));
console.log(`\n✓ Written: ${OUTPUT}`);
