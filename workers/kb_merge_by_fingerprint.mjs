#!/usr/bin/env node
// kb_merge_by_fingerprint.mjs — Triangulate KB sources by element fingerprint
// Memory ref: handoffs/bible_memory/LOG.md "2026-05-25 PINNED v2"
//
// Input : N x kb_*_fp.json files (schema v2.0-fingerprint)
// Output: v3/kb_merged.json + report
//
// Verification states per merged rule group:
//   AUTO_VERIFIED  — ≥2 sources agree on fingerprint+polarity     → trust ↑↑↑
//   CONFLICT       — ≥2 sources agree on fingerprint, polarity ต่าง → user picks
//   INTERNAL_DUPE  — same source has ≥2 rules same fingerprint    → user reviews
//   UNIQUE         — only 1 source has this fingerprint           → user reviews
//
// Usage:
//   node workers/kb_merge_by_fingerprint.mjs [out.json] [in1.json] [in2.json] ...
//   default: out=v3/kb_merged.json, in=v3/kb_v24-3_fp.json (single source — produces UNIQUE + INTERNAL_DUPE only)

import fs from 'node:fs';

const args = process.argv.slice(2);
const OUTPUT = args[0] || 'v3/kb_merged.json';
const INPUTS = args.slice(1);
if (INPUTS.length === 0) INPUTS.push('v3/kb_v24-3_fp.json');

// Load + validate
const sources = INPUTS.map(p => {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (j._meta?.schema_version !== '2.0-fingerprint') {
    console.warn(`⚠ ${p} schema_version=${j._meta?.schema_version} (expected 2.0-fingerprint) — proceeding anyway`);
  }
  return {
    path: p,
    name: j._meta?.source || p,
    rules: j.rules || []
  };
});

console.log(`Sources: ${sources.length}`);
sources.forEach(s => console.log(`  - ${s.name}: ${s.rules.length} rules from ${s.path}`));

// Group by fingerprint
const groups = new Map(); // fingerprint → [{source, rule}]
sources.forEach(s => {
  s.rules.forEach(r => {
    const fp = r.elements?.fingerprint || 'EMPTY';
    if (!groups.has(fp)) groups.set(fp, []);
    groups.get(fp).push({ source: s.name, rule: r });
  });
});

console.log(`Total fingerprint groups: ${groups.size}`);

// Determine status per group
let merged_id = 1;
const mergedRules = [];
const stats = { AUTO_VERIFIED: 0, CONFLICT: 0, INTERNAL_DUPE: 0, UNIQUE: 0 };
const conflictsReport = [];
const internalDupesReport = [];

for (const [fp, members] of groups) {
  const sourcesInGroup = new Set(members.map(m => m.source));
  const polarities = new Set(members.map(m => m.rule.polarity));
  let status;
  if (sourcesInGroup.size >= 2) {
    status = polarities.size === 1 ? 'AUTO_VERIFIED' : 'CONFLICT';
  } else if (members.length >= 2) {
    status = 'INTERNAL_DUPE'; // 1 source, multiple rules same fingerprint
  } else {
    status = 'UNIQUE';
  }
  stats[status]++;

  // Build merged rule
  const allWordings = members.flatMap(m => m.rule.wordings || []);
  const conditionTexts = [...new Set(members.map(m => m.rule.condition_text).filter(Boolean))];
  const sourceRuleIds = members.map(m => `${m.source}:${m.rule.rule_id}`);
  const polarityBreakdown = {};
  members.forEach(m => {
    const p = m.rule.polarity || '?';
    polarityBreakdown[p] = (polarityBreakdown[p] || 0) + 1;
  });
  const dominantPolarity = Object.entries(polarityBreakdown).sort((a,b)=>b[1]-a[1])[0][0];

  const sample = members[0].rule;
  const out = {
    rule_id: 'RM' + String(merged_id++).padStart(3, '0'),
    elements: sample.elements,
    polarity: status === 'CONFLICT' ? '?' : dominantPolarity,
    polarity_breakdown: polarityBreakdown,
    domain: sample.domain,
    rule_use: sample.rule_use,
    tier: sample.tier,
    condition_texts: conditionTexts,
    wordings: allWordings,
    verification_status: status,
    verification_sources: sourcesInGroup.size,
    source_rule_ids: sourceRuleIds,
    memory_ref: 'LOG 2026-05-25 v2'
  };
  mergedRules.push(out);

  if (status === 'CONFLICT') {
    conflictsReport.push({
      merged_id: out.rule_id,
      fingerprint: fp,
      polarities: polarityBreakdown,
      source_rule_ids: sourceRuleIds,
      condition_texts: conditionTexts
    });
  }
  if (status === 'INTERNAL_DUPE') {
    internalDupesReport.push({
      merged_id: out.rule_id,
      fingerprint: fp,
      source: [...sourcesInGroup][0],
      count: members.length,
      source_rule_ids: sourceRuleIds,
      condition_texts: conditionTexts
    });
  }
}

const outData = {
  _meta: {
    schema_version: '2.0-merged',
    sources: sources.map(s => ({ name: s.name, path: s.path, rule_count: s.rules.length })),
    merge_timestamp: new Date().toISOString(),
    memory_ref: 'LOG 2026-05-25 v2',
    stats: {
      total_merged_rules: mergedRules.length,
      ...stats,
      note: sources.length === 1 ? 'single source — AUTO_VERIFIED impossible, CONFLICT impossible. Re-run with ≥2 sources for triangulation.' : null
    }
  },
  rules: mergedRules,
  conflicts_report: conflictsReport,
  internal_dupes_report: internalDupesReport
};

fs.writeFileSync(OUTPUT, JSON.stringify(outData, null, 2));

console.log(`\n=== Merge Report ===`);
console.log(`Total merged rules: ${mergedRules.length}`);
console.log(`  AUTO_VERIFIED : ${stats.AUTO_VERIFIED}`);
console.log(`  CONFLICT      : ${stats.CONFLICT}    ${stats.CONFLICT ? '⚠️ user review' : ''}`);
console.log(`  INTERNAL_DUPE : ${stats.INTERNAL_DUPE} ${stats.INTERNAL_DUPE ? '🔍 user review (may be true dupes)' : ''}`);
console.log(`  UNIQUE        : ${stats.UNIQUE}    (1 source only)`);
console.log(`\n✓ Written: ${OUTPUT}`);
if (conflictsReport.length) console.log(`   See ${OUTPUT}#conflicts_report for ${conflictsReport.length} polarity conflicts`);
if (internalDupesReport.length) console.log(`   See ${OUTPUT}#internal_dupes_report for ${internalDupesReport.length} same-source duplicates`);
