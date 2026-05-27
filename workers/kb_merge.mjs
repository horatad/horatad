#!/usr/bin/env node
// kb_merge.mjs — validate + merge new rules into kb_tals.json
// usage: node workers/kb_merge.mjs <new_rules.json>
//        cat rules.json | node workers/kb_merge.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const KB_PATH = 'v3/kb_tals.json';
const REQUIRED = [
  'id','ch','rule_use','type','tier','c','meaning','polarity',
  'planet_ids','contexts','domain','db','source_level','source_ref',
  'score','source_type','source_chapter','source_quote',
];
const VALID_TYPES = ['REFERENCE','DEFINITION','PRINCIPLE','NATAL_ATOMIC','NATAL_COMBINATION','TRANSIT_NATAL'];
const VALID_RULE_USE = ['reference','match','principle'];
const VALID_POLARITY = ['+','-','~'];
const VALID_SOURCE_TYPE = ['PRIMARY','INFERRED'];
const VALID_DOMAINS = [
  'ทั่วไป','ตัวตน','นิสัย','ลักษณะนิสัย','หลักการ',
  'อาชีพ','หน้าที่การงาน','การเงิน','ทรัพย์',
  'ความสัมพันธ์','ปัตนิ','สุขภาพ','สุขภาพจิต',
  'โชคลาภ','โชคชะตา','ดาวจร','ความสูญเสีย','ชื่อเสียง',
  'methodology','อ้างอิง',
];

function loadInput() {
  const file = process.argv[2];
  if (file) return readFileSync(file, 'utf8');
  // stdin
  return new Promise(resolve => {
    let data = '';
    const rl = createInterface({ input: process.stdin });
    rl.on('line', l => data += l + '\n');
    rl.on('close', () => resolve(data));
  });
}

function validate(rule, existingIds, existingMeanings) {
  const errors = [];
  const warnings = [];

  // Required fields
  for (const f of REQUIRED) {
    if (rule[f] === undefined) errors.push(`missing field: ${f}`);
  }
  if (errors.length) return { errors, warnings };

  // Enum checks
  if (!VALID_TYPES.includes(rule.type)) errors.push(`invalid type: ${rule.type}`);
  if (!VALID_RULE_USE.includes(rule.rule_use)) errors.push(`invalid rule_use: ${rule.rule_use}`);
  if (!VALID_POLARITY.includes(rule.polarity)) errors.push(`invalid polarity: ${rule.polarity}`);
  if (!VALID_SOURCE_TYPE.includes(rule.source_type)) errors.push(`invalid source_type: ${rule.source_type}`);
  if (!VALID_DOMAINS.includes(rule.domain)) errors.push(`invalid domain: "${rule.domain}" — ใช้ค่าจาก enum เท่านั้น`);

  // Fixed values
  if (rule.db !== 'kb_tals') errors.push(`db must be "kb_tals", got "${rule.db}"`);
  if (rule.source_level !== 1) errors.push(`source_level must be 1`);
  if (rule.source_ref !== rule.ch) warnings.push(`source_ref "${rule.source_ref}" ≠ ch "${rule.ch}"`);
  if (rule.source_chapter !== rule.ch) warnings.push(`source_chapter "${rule.source_chapter}" ≠ ch "${rule.ch}"`);

  // ID format
  if (!/^R\d+$/.test(rule.id)) errors.push(`id must be R<number>, got "${rule.id}"`);
  if (existingIds.has(rule.id)) errors.push(`duplicate id: ${rule.id} already exists in kb_tals.json`);

  // planet_ids type
  if (!Array.isArray(rule.planet_ids)) errors.push('planet_ids must be array');
  else {
    const bad = rule.planet_ids.filter(p => typeof p !== 'number' || p < 0 || p > 9);
    if (bad.length) errors.push(`invalid planet_ids: ${bad} (must be 0-9)`);
  }

  // contexts
  if (!Array.isArray(rule.contexts) || rule.contexts.length === 0)
    errors.push('contexts must be non-empty array');

  // Duplicate meaning check (fuzzy)
  const norm = rule.meaning.trim().substring(0, 40);
  if (existingMeanings.has(norm))
    warnings.push(`possible duplicate meaning: "${norm}..." — ตรวจสอบกับ rule ที่มีอยู่แล้ว`);

  return { errors, warnings };
}

async function main() {
  const raw = await loadInput();
  let newRules;
  try {
    newRules = JSON.parse(raw.trim());
    if (!Array.isArray(newRules)) newRules = [newRules];
  } catch (e) {
    console.error('❌ JSON parse error:', e.message);
    process.exit(1);
  }

  const kb = JSON.parse(readFileSync(KB_PATH, 'utf8'));
  const existingIds = new Set(kb.rules.map(r => r.id));
  const existingMeanings = new Set(kb.rules.map(r => r.meaning.trim().substring(0, 40)));

  // Auto-assign ids for rules with placeholder "RXXX" or missing id
  const maxId = Math.max(...[...existingIds].map(id => parseInt(id.replace('R',''))));
  let nextId = maxId + 1;

  let totalErrors = 0;
  let totalWarnings = 0;
  const validated = [];

  for (let i = 0; i < newRules.length; i++) {
    const rule = { ...newRules[i] };

    // Auto-assign id if placeholder or missing
    if (!rule.id || rule.id === 'RXXX' || existingIds.has(rule.id)) {
      if (existingIds.has(rule.id)) {
        // will be caught as error — don't auto-fix
      } else {
        rule.id = `R${nextId++}`;
      }
    }

    const { errors, warnings } = validate(rule, existingIds, existingMeanings);

    if (errors.length) {
      console.error(`\n❌ Rule ${i+1} (${rule.id || '?'}) — ${errors.length} error(s):`);
      errors.forEach(e => console.error(`   • ${e}`));
      totalErrors += errors.length;
    }
    if (warnings.length) {
      console.warn(`\n⚠ Rule ${i+1} (${rule.id}) — ${warnings.length} warning(s):`);
      warnings.forEach(w => console.warn(`   • ${w}`));
      totalWarnings += warnings.length;
    }
    if (!errors.length) {
      validated.push(rule);
      existingIds.add(rule.id);
      existingMeanings.add(rule.meaning.trim().substring(0, 40));
    }
  }

  console.log(`\n─────────────────────────────────`);
  console.log(`Input    : ${newRules.length} rules`);
  console.log(`Valid    : ${validated.length} rules`);
  console.log(`Errors   : ${totalErrors}`);
  console.log(`Warnings : ${totalWarnings}`);

  if (totalErrors > 0) {
    console.error(`\n❌ Merge ยกเลิก — แก้ errors ก่อน`);
    process.exit(1);
  }

  // Merge
  kb.rules.push(...validated);
  kb._meta.rule_count = kb.rules.length;
  kb._meta.last_merge = new Date().toISOString().split('T')[0];

  writeFileSync(KB_PATH, JSON.stringify(kb, null, 2), 'utf8');
  console.log(`\n✅ Merged ${validated.length} rules → kb_tals.json (total: ${kb.rules.length})`);
  if (totalWarnings > 0) console.warn(`⚠ ตรวจ warnings ด้านบนก่อน commit`);
}

main().catch(e => { console.error(e); process.exit(1); });
