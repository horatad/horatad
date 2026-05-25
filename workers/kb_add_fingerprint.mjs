#!/usr/bin/env node
// kb_add_fingerprint.mjs — Migrate KB to schema v2 (triangulation-ready)
// Memory ref: handoffs/bible_memory/LOG.md "2026-05-25 PINNED v2"
//
// Adds: elements{fingerprint}, wordings[], verification_status, memory_ref
// Preserves: rule_id, polarity, domain, rule_use, tier, condition_text (was 'c')
// Wraps existing 'meaning' as wordings[0].text with source provenance
//
// Usage:
//   node workers/kb_add_fingerprint.mjs [INPUT] [OUTPUT] [SOURCE_NAME] [SOURCE_TYPE]
//   default: v3/kb_v24-3.json → v3/kb_v24-3_fp.json (source=kb_v24-3, type=IN_BOOK)

import fs from 'node:fs';

const INPUT = process.argv[2] || 'v3/kb_v24-3.json';
const OUTPUT = process.argv[3] || 'v3/kb_v24-3_fp.json';
const SOURCE_NAME = process.argv[4] || 'kb_v24-3';
const SOURCE_TYPE = process.argv[5] || 'IN_BOOK';
const EXTRACTED_BY = `claude-session-2026-05-23-batch-3`;

// Fingerprint formula (memory_ref: LOG 2026-05-25 v2):
// includes structured discriminators from schema
// EXCLUDES polarity (polarity diff = CONFLICT detector, not separator)
// LIMITATION v1: lagna_relation / ruler_of_house / inline sign / inline quality
// are buried in condition_text — not yet extracted. Adds noise (31 dupes in kb_v24-3).
// Future v3: deep-parse condition_text for these discriminators.
function makeFingerprint(rule) {
  const parts = [];
  if (rule.planet_ids?.length) {
    parts.push('p' + [...rule.planet_ids].sort((a,b)=>a-b).join(','));
  }
  if (rule.sign_id != null) parts.push('s' + rule.sign_id);
  else if (rule.sign_ids?.length) parts.push('s' + [...rule.sign_ids].sort((a,b)=>a-b).join(','));
  if (rule.quality) parts.push('q:' + rule.quality);
  if (rule.quality_req) parts.push('qr:' + rule.quality_req);
  if (rule.aspect) parts.push('a:' + rule.aspect);
  if (rule.condition_type) parts.push('cnd:' + rule.condition_type);
  if (rule.contexts?.length) parts.push('ctx:' + [...rule.contexts].sort().join(','));
  if (rule.domain) parts.push('d:' + rule.domain);
  parts.push('t:' + rule.type);
  return parts.join('+') || 'EMPTY';
}

function migrate(rule) {
  const fp = makeFingerprint(rule);
  return {
    rule_id: rule.id,
    elements: {
      planet_ids: rule.planet_ids || [],
      sign_id: rule.sign_id ?? null,
      sign_ids: rule.sign_ids || null,
      quality: rule.quality || null,
      quality_req: rule.quality_req || null,
      aspect: rule.aspect || null,
      contexts: rule.contexts || [],
      condition_type: rule.condition_type || null,
      type: rule.type,
      fingerprint: fp
    },
    polarity: rule.polarity,
    domain: rule.domain,
    rule_use: rule.rule_use,
    tier: rule.tier,
    condition_text: rule.c,
    wordings: [{
      text: rule.meaning,
      source: rule.ch,
      source_type: SOURCE_TYPE,
      extracted_by: EXTRACTED_BY,
      notes: rule.notes || null,
      quality_condition: rule.quality_condition || null
    }],
    verification_status: 'UNIQUE',
    verification_sources: 1,
    memory_ref: 'LOG 2026-05-25 v2'
  };
}

const data = JSON.parse(fs.readFileSync(INPUT, 'utf8'));
const rules = data.rules || data;
if (!Array.isArray(rules)) {
  console.error('ERROR: input has no rules array');
  process.exit(1);
}

const migrated = rules.map(migrate);

const fpCounts = {};
migrated.forEach(r => {
  fpCounts[r.elements.fingerprint] = (fpCounts[r.elements.fingerprint] || 0) + 1;
});
const duplicates = Object.entries(fpCounts)
  .filter(([_,n]) => n>1)
  .sort((a,b) => b[1]-a[1]);

console.log(`Input  : ${INPUT}`);
console.log(`Output : ${OUTPUT}`);
console.log(`Rules  : ${rules.length} → ${migrated.length}`);
console.log(`Unique fingerprints   : ${Object.keys(fpCounts).length}`);
console.log(`Duplicate fingerprints: ${duplicates.length} (same elements, multiple rules — expected for combo/principle rules)`);
if (duplicates.length) {
  console.log('Top 10 duplicate fingerprints (for inspection):');
  duplicates.slice(0,10).forEach(([fp,n]) => console.log(`  ${String(n).padStart(2)}x  ${fp}`));
}

const outData = {
  _meta: {
    schema_version: '2.0-fingerprint',
    source: SOURCE_NAME,
    source_type: SOURCE_TYPE,
    migrated_from: INPUT,
    migrated_at: new Date().toISOString(),
    memory_ref: 'LOG 2026-05-25 v2',
    rule_count: migrated.length,
    unique_fingerprints: Object.keys(fpCounts).length,
    duplicate_fingerprint_count: duplicates.length
  },
  rules: migrated
};

fs.writeFileSync(OUTPUT, JSON.stringify(outData, null, 2));
console.log(`\n✓ Written: ${OUTPUT}`);
