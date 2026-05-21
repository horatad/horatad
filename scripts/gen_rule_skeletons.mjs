#!/usr/bin/env node
// scripts/gen_rule_skeletons.mjs
// สร้าง skeleton rules สำหรับ planet×quality combinations ที่ยังไม่มีใน kb.json
// Output: v3/kb_skeletons.json — import เข้า dictionary_builder_v3.html ได้

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const kbPath = join(__dir, '../v3/kb.json');
const outPath = join(__dir, '../v3/kb_skeletons.json');

const kb = JSON.parse(readFileSync(kbPath, 'utf8'));
const rules = kb.rules;

// คุณภาพหลักที่ควรมีกฎครบทุกดาว
const KEY_QUALITIES = [
  'เกษตร', 'ประเกษตร', 'อุจ', 'นิจ',
  'มหาจักร', 'จุลจักร', 'ราชาโชค', 'เทวีโชค',
  'อุจจาวิลาส', 'อุจจาภิมุข',
];

const PLANET_NAMES = {
  '1':'อาทิตย์','2':'จันทร์','3':'อังคาร','4':'พุธ',
  '5':'พฤหัส','6':'ศุกร์','7':'เสาร์','8':'ราหู','9':'เกตุ','10':'มฤตยู',
};

const LAGNA_ASPECTS_TH = ['กุมลัคนา','เล็งลัคนา','โยคลัคนา','ตรีโกณลัคนา'];

// ── รวบรวม combinations ที่มีอยู่แล้วใน TRUE_RULE ──────────────────────────
const existing = new Set();
for (const r of rules) {
  if (r.rule_type !== 'TRUE_RULE') continue;
  for (const c of (r.conditions || [])) {
    if (!c.planet_id || c.planet_id === 'ANY') continue;
    if (!c.quality_required || c.quality_required === 'ANY') continue;
    const asp = c.lagna_aspect_req || 'ANY';
    existing.add(`${c.planet_id}|${c.quality_required}|${asp}`);
    existing.add(`${c.planet_id}|${c.quality_required}|ANY`); // any = covered
  }
}

// ── สร้าง skeletons สำหรับ combinations ที่หายไป ─────────────────────────
const skeletons = [];
let skeletonId = 9000;

for (const [pid, pname] of Object.entries(PLANET_NAMES)) {
  for (const quality of KEY_QUALITIES) {
    const coveredByAny = existing.has(`${pid}|${quality}|ANY`);
    const coveredBySpecific = LAGNA_ASPECTS_TH.some(
      asp => existing.has(`${pid}|${quality}|${asp}`)
    );
    if (!coveredByAny && !coveredBySpecific) {
      skeletons.push({
        id: skeletonId++,
        ch: 'chapter_skeleton',
        ct: `[SKELETON] ${pname} คุณภาพ ${quality}`,
        c: `ดาว${pname} คุณภาพ ${quality}`,
        p: '',  // ว่าง — รอ expert กรอก
        pr: 3,
        t: [pname, quality],
        conditions: [{
          planet_id: pid,
          quality_required: quality,
          lagna_aspect_req: 'ANY',
          required: true,
        }],
        rule_type: 'TRUE_RULE',
        empirical_p: null,
        empirical_n: null,
        empirical_refs: [],
        secondary_obs: [],
        _skeleton: true,
        _generated: '2026-05-21',
      });
    }
  }
}

writeFileSync(outPath, JSON.stringify({ count: skeletons.length, generated: '2026-05-21', skeletons }, null, 2), 'utf8');

// ── Summary report ─────────────────────────────────────────────────────────
console.log(`\n📋 Rule Skeleton Generator`);
console.log(`   Input: kb.json v${kb.version} (${rules.length} rules)`);
console.log(`   Existing TRUE_RULE planet×quality pairs: ${existing.size / 2 | 0}`);
console.log(`   Missing combinations: ${skeletons.length}`);
console.log(`   Output: v3/kb_skeletons.json\n`);

// per-planet summary
for (const [pid, pname] of Object.entries(PLANET_NAMES)) {
  const missing = skeletons.filter(s => s.conditions[0].planet_id === pid);
  if (missing.length) {
    console.log(`   ${pname}: missing ${missing.length} → ${missing.map(s => s.conditions[0].quality_required).join(', ')}`);
  }
}
console.log('\n✅ Done');
