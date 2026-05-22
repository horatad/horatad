#!/usr/bin/env node
// enrich_skeletons.mjs
// Enrich kb_skeletons.json ด้วย metadata ที่ช่วย expert review เร็วขึ้น
// - _duplicate_of: rule_id ถ้า planet+quality เดียวกันมีใน kb อยู่แล้ว
// - _reference_rules: rules ของ planet เดียวกัน (คุณภาพอื่น) สำหรับ derive
// - _priority: 'duplicate' | 'derivable' | 'cold_start'
// Output: v3/kb_skeletons_enriched.json

import { readFile, writeFile } from 'fs/promises';

const kb = JSON.parse(await readFile('v3/kb.json', 'utf-8'));
const sk = JSON.parse(await readFile('v3/kb_skeletons.json', 'utf-8'));

const PLANET_NAMES = {
  '1': 'อาทิตย์', '2': 'จันทร์', '3': 'อังคาร', '4': 'พุธ', '5': 'พฤหัสบดี',
  '6': 'ศุกร์', '7': 'เสาร์', '8': 'ราหู', '9': 'เกตุ', '10': 'มฤตยู'
};

// Rules ใน kb.json ไม่มี id — ใช้ index → R001 = rules[0], R342 = rules[341]
const rid = i => 'R' + String(i + 1).padStart(3, '0');

function planetRules(planetId) {
  return kb.rules
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.conditions && r.conditions.some(c => c.planet_id === planetId))
    .map(({ r, i }) => ({ ...r, _rid: rid(i) }));
}

function exactMatch(planetId, quality) {
  return kb.rules
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.conditions && r.conditions.some(c =>
      c.planet_id === planetId && c.quality_required === quality
    ))
    .map(({ r, i }) => ({ ...r, _rid: rid(i) }));
}

const enriched = sk.skeletons.map(s => {
  const c = s.conditions[0];
  const planetId = c.planet_id;
  const quality = c.quality_required;
  const planetName = PLANET_NAMES[planetId] || `planet_${planetId}`;

  const dupes = exactMatch(planetId, quality);
  const dupeRids = new Set(dupes.map(d => d._rid));
  const planetRefs = planetRules(planetId)
    .filter(r => !dupeRids.has(r._rid))
    .map(r => ({ rid: r._rid, c: r.c, p: (r.p || '').substring(0, 100) }));

  let priority;
  let metadata = {};

  if (dupes.length > 0) {
    priority = 'duplicate';
    metadata._duplicate_of = dupes.map(d => d._rid);
    metadata._note = `ซ้ำ rule ที่มี planet+quality เดียวกัน — expert ตัดสิน: ลบ skeleton หรือ specialize`;
  } else if (planetRefs.length > 0) {
    priority = 'derivable';
    metadata._reference_rules = planetRefs.slice(0, 5).map(r => r.rid);
    metadata._reference_sample = planetRefs.slice(0, 3);
    metadata._note = `derive ความหมาย "${planetName} ${quality}" จาก reference rules — ปรับ polarity ตามคุณภาพ`;
  } else {
    priority = 'cold_start';
    metadata._no_reference = true;
    metadata._note = `${planetName} ไม่มีกฎใดใน kb — expert ต้อง draft จากศูนย์`;
  }

  return {
    ...s,
    _priority: priority,
    ...metadata,
  };
});

// sort: cold_start (ทำก่อน expert ตัดสิน) → derivable → duplicate (ตัดทิ้งได้ก่อน)
const order = { cold_start: 0, derivable: 1, duplicate: 2 };
enriched.sort((a, b) => order[a._priority] - order[b._priority]);

const stats = {
  cold_start: enriched.filter(x => x._priority === 'cold_start').length,
  derivable: enriched.filter(x => x._priority === 'derivable').length,
  duplicate: enriched.filter(x => x._priority === 'duplicate').length,
};

const output = {
  count: enriched.length,
  generated: new Date().toISOString().split('T')[0],
  source: 'v3/kb_skeletons.json',
  enriched_by: 'scripts/enrich_skeletons.mjs',
  stats,
  legend: {
    cold_start: 'ไม่มี rule ของ planet ใน kb — expert draft จากศูนย์ (priority สูงสุด)',
    derivable: 'มี rule ของ planet (คุณภาพอื่น) — derive ความหมายได้ ดู _reference_rules',
    duplicate: 'มี rule ที่มี planet+quality ตรงกันใน kb — พิจารณาลบ skeleton หรือ specialize',
  },
  skeletons: enriched,
};

await writeFile('v3/kb_skeletons_enriched.json', JSON.stringify(output, null, 2));

console.log('Output: v3/kb_skeletons_enriched.json');
console.log('Stats:', stats);
console.log('Total:', enriched.length);
