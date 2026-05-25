#!/usr/bin/env node
// kb_apply_review_decisions.mjs — Apply user review decisions to merged KB → production KB
// Memory ref: handoffs/bible_memory/LOG.md "2026-05-25 PINNED v2"
//
// Pipeline step (Step 5 of triangulation):
//   v3/kb_merged.json + kb_review_decisions_*.json  →  v3/kb_v24-final.json
//
// Decision semantics (per merged rule_id):
//   merge     → keep grouping, mark production-ready (user confirmed same rule)
//   separate  → split back to N rules using source_rule_ids (re-read source files)
//   skip      → keep as-is, not production-ready (deferred for later review)
//   (none)    → keep as-is; production_ready derived from verification_status
//
// production_ready rules:
//   AUTO_VERIFIED                                  → true  (≥2 sources agree)
//   CONFLICT  + merge                              → true  (user resolved polarity)
//   INTERNAL_DUPE + merge                          → true  (user confirmed)
//   * + separate  → emit N rules, each UNIQUE     → false (need more triangulation)
//   * + skip                                      → false
//   UNIQUE                                        → false (1 source only)
//
// Usage:
//   node workers/kb_apply_review_decisions.mjs <decisions.json> [out.json] [src1.json src2.json ...]
//     decisions.json : exported from tools/kb_review.html
//     out.json       : default v3/kb_v24-final.json
//     src*.json      : kb_v24-3_fp.json (etc) — needed for "separate" decisions to rebuild
//
// Examples:
//   node workers/kb_apply_review_decisions.mjs kb_review_decisions_2026-05-26.json
//   node workers/kb_apply_review_decisions.mjs decisions.json v3/kb_v24-final.json v3/kb_v24-3_fp.json

import fs from 'node:fs';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node workers/kb_apply_review_decisions.mjs <decisions.json> [out.json] [src1.json ...]');
  process.exit(1);
}

const DECISIONS_PATH = args[0];
const OUT_PATH = args[1] || 'v3/kb_v24-final.json';
const SRC_PATHS = args.slice(2);
const MERGED_PATH = 'v3/kb_merged.json';

// ---------- Load inputs ----------
const decisionsFile = JSON.parse(fs.readFileSync(DECISIONS_PATH, 'utf8'));
const decisions = decisionsFile.decisions || decisionsFile; // tolerate both shapes
const merged = JSON.parse(fs.readFileSync(MERGED_PATH, 'utf8'));

console.log(`Loaded:`);
console.log(`  decisions    : ${DECISIONS_PATH} (${Object.keys(decisions).length} decisions)`);
console.log(`  merged KB    : ${MERGED_PATH} (${merged.rules.length} merged rules)`);

// Build source lookup: "sourceName:ruleId" → original rule
const srcLookup = new Map();
const srcFiles = [];
for (const p of SRC_PATHS) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const name = j._meta?.source || p.split('/').pop().replace(/\.json$/, '');
  srcFiles.push({ name, path: p, rule_count: (j.rules || []).length });
  for (const r of (j.rules || [])) {
    srcLookup.set(`${name}:${r.rule_id}`, r);
  }
  console.log(`  source       : ${name} (${j.rules?.length || 0} rules from ${p})`);
}

// ---------- Apply decisions ----------
let finalId = 1;
const nextId = () => 'RF' + String(finalId++).padStart(3, '0');
const finalRules = [];
const summary = {
  decisions_applied: { merge: 0, separate: 0, skip: 0 },
  no_decision: 0,
  production_ready: 0,
  needs_more_sources: 0,
  rules_in: merged.rules.length,
  rules_out: 0,
  separate_misses: 0   // separate requested but source not loaded
};

const NEEDS_REVIEW = new Set(['CONFLICT', 'INTERNAL_DUPE']);

for (const r of merged.rules) {
  const decision = decisions[r.rule_id] || null;
  const status = r.verification_status;

  if (decision) summary.decisions_applied[decision] = (summary.decisions_applied[decision] || 0) + 1;
  else summary.no_decision++;

  if (decision === 'separate') {
    const sourceRuleIds = r.source_rule_ids || [];
    const recovered = [];
    const missing = [];
    for (const sid of sourceRuleIds) {
      const orig = srcLookup.get(sid);
      if (orig) recovered.push({ sid, orig });
      else missing.push(sid);
    }

    if (recovered.length === 0) {
      // No sources loaded — fall back: split by wordings (1 rule per wording)
      summary.separate_misses += sourceRuleIds.length;
      console.warn(`⚠ ${r.rule_id}: separate requested but no sources loaded → falling back to per-wording split`);
      for (const w of (r.wordings || [])) {
        finalRules.push({
          rule_id: nextId(),
          elements: r.elements,
          polarity: r.polarity,
          domain: r.domain,
          rule_use: r.rule_use,
          tier: r.tier,
          condition_text: w.text,
          wordings: [w],
          verification_status: 'UNIQUE',
          verification_sources: 1,
          production_ready: false,
          decision_applied: 'separate (fallback: per-wording)',
          memory_ref: 'LOG 2026-05-25 v2',
          parent_merged_id: r.rule_id
        });
      }
      continue;
    }

    if (missing.length) {
      summary.separate_misses += missing.length;
      console.warn(`⚠ ${r.rule_id}: separate — ${missing.length}/${sourceRuleIds.length} source IDs missing: ${missing.join(', ')}`);
    }

    for (const { sid, orig } of recovered) {
      finalRules.push({
        rule_id: nextId(),
        elements: orig.elements || r.elements,
        polarity: orig.polarity,
        domain: orig.domain,
        rule_use: orig.rule_use,
        tier: orig.tier,
        condition_text: orig.condition_text,
        wordings: orig.wordings || [],
        verification_status: 'UNIQUE',
        verification_sources: 1,
        production_ready: false,
        decision_applied: 'separate',
        memory_ref: 'LOG 2026-05-25 v2',
        parent_merged_id: r.rule_id,
        origin_source_rule_id: sid
      });
    }
    continue;
  }

  // merge / skip / no-decision → keep as one rule
  let production_ready = false;
  if (status === 'AUTO_VERIFIED') production_ready = true;
  else if (decision === 'merge' && NEEDS_REVIEW.has(status)) production_ready = true;

  finalRules.push({
    rule_id: nextId(),
    elements: r.elements,
    polarity: r.polarity,
    polarity_breakdown: r.polarity_breakdown,
    domain: r.domain,
    rule_use: r.rule_use,
    tier: r.tier,
    condition_texts: r.condition_texts,
    wordings: r.wordings || [],
    verification_status: status,
    verification_sources: r.verification_sources,
    production_ready,
    decision_applied: decision || null,
    source_rule_ids: r.source_rule_ids,
    memory_ref: 'LOG 2026-05-25 v2',
    parent_merged_id: r.rule_id
  });
}

// ---------- Tally + write ----------
summary.rules_out = finalRules.length;
summary.production_ready = finalRules.filter(r => r.production_ready).length;
summary.needs_more_sources = finalRules.length - summary.production_ready;

const out = {
  _meta: {
    schema_version: '2.0-final',
    derived_from: MERGED_PATH,
    decisions_from: DECISIONS_PATH,
    decisions_reviewed_at: decisionsFile._meta?.reviewed_at || null,
    sources_used_for_separate: srcFiles,
    apply_timestamp: new Date().toISOString(),
    memory_ref: 'LOG 2026-05-25 v2',
    summary
  },
  rules: finalRules
};

fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

// ---------- Report ----------
console.log(`\n=== Apply Report ===`);
console.log(`Decisions applied : merge=${summary.decisions_applied.merge} · separate=${summary.decisions_applied.separate} · skip=${summary.decisions_applied.skip}`);
console.log(`No decision       : ${summary.no_decision} (kept as-is)`);
console.log(`Rules in          : ${summary.rules_in}`);
console.log(`Rules out         : ${summary.rules_out}  (${summary.rules_out > summary.rules_in ? '+' : ''}${summary.rules_out - summary.rules_in})`);
console.log(`Production-ready  : ${summary.production_ready}  (${(100*summary.production_ready/summary.rules_out).toFixed(1)}%)`);
console.log(`Needs more sources: ${summary.needs_more_sources}`);
if (summary.separate_misses) console.log(`⚠ Separate misses : ${summary.separate_misses} source IDs not found (load source files for proper split)`);
console.log(`\n✓ Written: ${OUT_PATH}`);
