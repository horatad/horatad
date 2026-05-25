#!/usr/bin/env node
// kb_wording_prompt_poc.mjs — Proof-of-concept: KB equalizer test
// Memory ref: handoffs/bible_memory/LOG.md "2026-05-25 PINNED v2"
//
// Purpose: Prove that KB-augmented prompts produce similar outputs across LLM vendors.
// Output: a single prompt that user can paste into Gemini / Typhoon / Claude.web to compare.
//
// Pipeline:
//   1. Take a chart context (planet positions per house) — synthetic by default
//   2. Match relevant KB rules from kb_v24-3_fp.json (or any v2.0-fingerprint KB)
//   3. Assemble prompt = chart context + matched rules (+wordings) + instruction
//   4. Print prompt to stdout (or write to file)
//
// Usage:
//   node workers/kb_wording_prompt_poc.mjs                    # default sample chart
//   node workers/kb_wording_prompt_poc.mjs --chart chart.json # custom chart
//   node workers/kb_wording_prompt_poc.mjs --kb v3/kb_v24-final.json
//   node workers/kb_wording_prompt_poc.mjs --out prompt.txt
//   node workers/kb_wording_prompt_poc.mjs --max-rules 30
//
// Chart JSON format:
//   {
//     "lagna": <house-number 1-12>,     // ลัคนา
//     "planets": { "1": <house 1-12>, "2": <house>, ... }   // planet_id → house
//   }

import fs from 'node:fs';

const argv = process.argv.slice(2);
const opts = { kb: 'v3/kb_v24-3_fp.json', chart: null, out: null, maxRules: 40 };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--kb') opts.kb = argv[++i];
  else if (a === '--chart') opts.chart = argv[++i];
  else if (a === '--out') opts.out = argv[++i];
  else if (a === '--max-rules') opts.maxRules = +argv[++i];
}

// Default synthetic chart (used if --chart not provided)
const DEFAULT_CHART = {
  description: 'ดวงสมมุติ — ทดสอบ KB equalizer',
  lagna: 1,                 // ลัคนาภพตนุ (เมษลัคน์ ตามสมมุติ)
  planets: {
    '1': 5,  // อาทิตย์ภพปุตตะ
    '2': 4,  // จันทร์ภพพันธุ
    '3': 1,  // อังคารภพตนุ
    '4': 10, // พุธภพกรรม
    '5': 9,  // พฤหัสภพศุภะ
    '6': 7,  // ศุกร์ภพปัตนิ
    '7': 12, // เสาร์ภพวินาศ
    '8': 3,  // ราหูภพสหัชชะ
    '0': 11  // เกตุภพลาภะ
  }
};

const PLANET_NAMES = {
  '1':'อาทิตย์','2':'จันทร์','3':'อังคาร','4':'พุธ','5':'พฤหัสบดี',
  '6':'ศุกร์','7':'เสาร์','8':'ราหู','0':'เกตุ','9':'มฤตยู'
};
const HOUSE_NAMES = ['ตนุ','กฎุมพะ','สหัชชะ','พันธุ','ปุตตะ','อริ','ปัตนิ','มรณะ','ศุภะ','กรรม','ลาภะ','วินาศ'];

// ---------- Load ----------
const chart = opts.chart
  ? JSON.parse(fs.readFileSync(opts.chart, 'utf8'))
  : DEFAULT_CHART;
const kb = JSON.parse(fs.readFileSync(opts.kb, 'utf8'));

// ---------- Match relevant rules ----------
// Strategy: a rule is "relevant" if any element in chart matches the rule's elements
// Match criteria (any):
//   - planet_id matches chart.planets keys
//   - planet_id + house_id pair matches (planet, chart.planets[planet])
//   - involves lagna (house 1)
const chartPlanets = Object.keys(chart.planets || {});
const chartPlanetSet = new Set(chartPlanets);
const planetToHouse = chart.planets || {};

function ruleScore(rule) {
  const e = rule.elements || {};
  const pids = e.planet_ids || (e.planet_id ? [e.planet_id] : []);
  let score = 0;

  // planet present in chart
  for (const pid of pids) {
    if (chartPlanetSet.has(String(pid))) score += 2;
  }

  // planet+house pair match
  const houseField = e.house_id || (e.house_ids && e.house_ids[0]) || null;
  for (const pid of pids) {
    if (chartPlanetSet.has(String(pid)) && houseField && +planetToHouse[pid] === +houseField) {
      score += 5;   // strong signal
    }
  }

  // sign matches sign_id? — we'd need planet→sign mapping in chart. skip for now (chart is house-only)

  // lagna rules
  if (e.context === 'lagna' || (e.contexts || []).includes('lagna')) score += 1;

  return score;
}

const scored = kb.rules
  .map(r => ({ rule: r, score: ruleScore(r) }))
  .filter(x => x.score > 0)
  .sort((a, b) => b.score - a.score);

const selected = scored.slice(0, opts.maxRules).map(x => x.rule);

// ---------- Format prompt ----------
function describeChart(c) {
  const lines = [`ลัคนา: ภพ ${c.lagna} (${HOUSE_NAMES[c.lagna-1]})`];
  for (const [pid, house] of Object.entries(c.planets || {})) {
    lines.push(`${PLANET_NAMES[pid] || pid}: ภพ ${house} (${HOUSE_NAMES[house-1]})`);
  }
  return lines.join('\n');
}

function formatRule(r, idx) {
  const cond = r.condition_text || (r.condition_texts || []).join(' | ');
  const wordings = (r.wordings || []).map(w => `  • ${w.text}  [${w.source_type || 'src'}: ${w.source || '?'}]`).join('\n');
  const elem = r.elements || {};
  return `[${idx}] ${r.rule_id}  polarity=${r.polarity}  domain=${r.domain}  fp=${elem.fingerprint || '-'}
  เงื่อนไข: ${cond || '-'}
  wordings:
${wordings || '  • (no wordings)'}`;
}

const SYSTEM_INSTRUCTION = `คุณเป็นนักโหราศาสตร์ไทยตำราสุริยยาตร์
คุณ **ห้าม** ใช้ความรู้นอกเหนือจาก KB rules ที่ให้ไว้ด้านล่าง
ใช้เฉพาะ wordings ใน KB เป็น authoritative source — paraphrase ได้ ห้ามเพิ่มเติมความหมายใหม่`;

const TASK = `งาน: เขียนคำพยากรณ์ดวงนี้ ความยาว 3-5 ย่อหน้า
- เริ่มด้วยภาพรวม
- ตามด้วยจุดเด่น (จาก rule polarity=+)
- ตามด้วยจุดที่ต้องระวัง (จาก rule polarity=-)
- ปิดด้วยคำแนะนำ
- อ้าง rule_id ในวงเล็บ เช่น (R013) ทุกประโยคที่ใช้ rule
- ห้ามเพิ่มข้อมูลที่ไม่มีใน KB`;

const prompt = `${SYSTEM_INSTRUCTION}

═══════════════════════════════════════════
ดวงชาตา (${chart.description || 'ดวงทดสอบ'})
═══════════════════════════════════════════
${describeChart(chart)}

═══════════════════════════════════════════
KB Rules ที่เกี่ยวข้อง (${selected.length} ข้อ จากทั้งหมด ${kb.rules.length})
═══════════════════════════════════════════
${selected.map(formatRule).join('\n\n')}

═══════════════════════════════════════════
${TASK}
═══════════════════════════════════════════`;

// ---------- Output ----------
if (opts.out) {
  fs.writeFileSync(opts.out, prompt);
  console.error(`✓ Written: ${opts.out} (${prompt.length} chars, ${selected.length}/${kb.rules.length} rules selected)`);
} else {
  console.log(prompt);
  console.error(`\n--- meta ---\nKB: ${opts.kb} (${kb.rules.length} rules)\nSelected: ${selected.length} (top-${opts.maxRules})\nPrompt length: ${prompt.length} chars`);
}
