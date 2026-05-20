#!/usr/bin/env node
// parse_yaml_kb.mjs — แปลง suriyart_knowledge_base.yaml → kb_yaml_import.json
// Usage: node scripts/parse_yaml_kb.mjs <path-to-yaml> [output.json]
// Output: JSON array ของ rule objects พร้อม import เข้า dictionary_builder_v3.html

import fs from 'fs';
import path from 'path';

const yamlPath = process.argv[2];
const outPath  = process.argv[3] ?? 'v3/kb_yaml_import.json';

if (!yamlPath) {
  console.error('Usage: node scripts/parse_yaml_kb.mjs <yaml-file> [output.json]');
  process.exit(1);
}

const raw = fs.readFileSync(yamlPath, 'utf8');

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

const PLANET_MAP = {
  '0': 'มฤตยู', '1': 'อาทิตย์', '2': 'จันทร์', '3': 'อังคาร',
  '4': 'พุธ',   '5': 'พฤหัส',   '6': 'ศุกร์',  '7': 'เสาร์',
  '8': 'ราหู',  '9': 'เกตุ',
};

// แปลชื่อดาวไทย → planet_id
const PLANET_NAME_TO_ID = {};
for (const [id, name] of Object.entries(PLANET_MAP)) PLANET_NAME_TO_ID[name] = id;

/** ดึง planet_id ทั้งหมดที่ปรากฏในข้อความ */
function extractPlanetIds(text) {
  const ids = new Set();
  // "ดาว 3" / "ดาว ๓" / "(3)" / "ดาว3"
  // ข้ามรูปแบบ range เช่น "ดาว 1-8" หรือ "ดาว 1–9"
  const textNoRange = text.replace(/ดาว\s*[0-9๐-๙]+\s*[-–]\s*[0-9๐-๙]+/g, '');
  for (const m of textNoRange.matchAll(/ดาว\s*([0-9๐-๙]+)/g)) {
    const n = toArabic(m[1]);
    if (n in PLANET_MAP) ids.add(n);
  }
  for (const m of textNoRange.matchAll(/\(([0-9๐-๙]+)\)/g)) {
    const n = toArabic(m[1]);
    if (n in PLANET_MAP) ids.add(n);
  }
  // ชื่อดาวตรงๆ
  for (const [name, id] of Object.entries(PLANET_NAME_TO_ID)) {
    if (textNoRange.includes(name)) ids.add(id);
  }
  return [...ids];
}

/** แปลงเลขไทย → อารบิค */
function toArabic(s) {
  const map = {'๐':'0','๑':'1','๒':'2','๓':'3','๔':'4','๕':'5','๖':'6','๗':'7','๘':'8','๙':'9'};
  return s.replace(/[๐-๙]/g, c => map[c]);
}

/** ดึง quality_required จาก segment ข้อความ */
function extractQuality(seg) {
  if (/อุจจาวิลาส/.test(seg))  return 'อุจจาวิลาส';
  if (/อุจจาภิมุข/.test(seg))  return 'อุจจาภิมุข';
  if (/มหาจักร/.test(seg))     return 'มหาจักร';
  if (/จุลจักร/.test(seg))     return 'จุลจักร';
  if (/ราชาโชค/.test(seg))     return 'ราชาโชค';
  if (/เทวีโชค/.test(seg))     return 'เทวีโชค';
  if (/ประเกษตร/.test(seg))    return 'ประเกษตร';
  if (/เกษตร/.test(seg))       return 'เกษตร';
  if (/อุจ/.test(seg))         return 'อุจ';
  if (/นิจ/.test(seg))         return 'นิจ';
  if (/(?:ดี|แรง|ดีมาก|ดีสัมพันธ์)/.test(seg) && !/เสีย/.test(seg)) return 'ดี';
  if (/เสีย/.test(seg))        return 'เสีย';
  return 'ANY';
}

/** ดึง lagna_aspect_req จาก segment ข้อความ */
function extractAspect(seg) {
  if (/ไม่สัมพันธ์ลัคนา/.test(seg) || /ไม่สัมพันธ์/.test(seg)) return 'ไม่สัมพันธ์ลัคนา';
  if (/กุมลัคนา/.test(seg))    return 'กุมลัคนา';
  if (/เล็งลัคนา/.test(seg))   return 'เล็งลัคนา';
  if (/ตรีโกณลัคนา/.test(seg)) return 'ตรีโกณลัคนา';
  if (/โยคลัคนา/.test(seg))    return 'โยคลัคนา';
  if (/สัมพันธ์ลัคนา/.test(seg) || /สัมพันธ์ถึงลัคนา/.test(seg)) return 'สัมพันธ์ลัคนา';
  return 'ANY';
}

/**
 * แปลง condition text → conditions[]
 * แยก segment ด้วย AND / + แล้วหา planet + quality + aspect ต่อ segment
 */
function parseConditions(condText) {
  // แยก segment ด้วย " + " หรือ " AND "
  const segments = condText.split(/\s*(?:\+|AND)\s*/);
  const conditions = [];
  const seen = new Set();

  for (const seg of segments) {
    const ids = extractPlanetIds(seg);
    const quality = extractQuality(seg);
    const aspect  = extractAspect(seg);

    if (ids.length === 0) continue;

    for (const pid of ids) {
      const key = `${pid}|${quality}|${aspect}`;
      if (seen.has(key)) continue;
      seen.add(key);
      conditions.push({
        planet_id:        pid,
        quality_required: quality,
        lagna_aspect_req: aspect,
        required:         true,
      });
    }
  }
  return conditions;
}

// ────────────────────────────────────────────────────────────────
// Rule type classification (best-effort จาก chapter pattern)
// ────────────────────────────────────────────────────────────────

function classifyRuleType(chNum, title, tags) {
  const titleLower = title || '';
  if (/กรณีศึกษา|ตัวอย่าง/.test(titleLower)) return 'CASE_STUDY';
  if (/จร/.test(tags.join('') + titleLower))   return 'TRANSIT_RULE';
  if (/หลักการ|นิยาม|สรุป|มาตรฐาน|ภาพรวม/.test(titleLower)) return 'DEFINITION';
  if (chNum >= 38 && chNum <= 50)               return 'CASE_STUDY';
  if (chNum >= 70 && chNum <= 99)               return 'HOUSE_CONCEPT';
  return 'TRUE_RULE';
}

// ────────────────────────────────────────────────────────────────
// Category tag mapping (best-effort)
// ────────────────────────────────────────────────────────────────

function guessCategory(tags) {
  const t = tags.join('|');
  if (/การเงิน|กฎุมพะ|ทรัพย์|รวย|จน/.test(t))          return 'การเงิน';
  if (/คู่|ปัตนิ|สมพงศ์|คู่ครอง/.test(t))               return 'คู่ครอง';
  if (/อาชีพ|ถูกโฉลก|กัมมะ/.test(t))                    return 'อาชีพ';
  if (/สุขภาพ|อุบัติเหตุ|เจ็บป่วย/.test(t))             return 'สุขภาพ';
  if (/ลัคนา|นิสัย|อัจฉริยภาพ|ขยัน|พูด/.test(t))       return 'นิสัย';
  if (/โชคใหญ่|โชคลาภ|ลาภะ/.test(t))                   return 'โชคลาภ';
  if (/จร|ดาวจร|ทับ|เล็ง.*จร/.test(t))                  return 'ดาวจร';
  if (/ถึงฆาต|ล้มทั้งยืน|ตาย|มรณะ/.test(t))            return 'อายุ/เคราะห์ใหญ่';
  return '(ยังไม่ระบุ)';
}

// ────────────────────────────────────────────────────────────────
// YAML parser (regex-based, no library)
// ────────────────────────────────────────────────────────────────

/** แยก value จาก YAML scalar: ตัด quotes, trim */
function yamlValue(v) {
  if (!v) return '';
  v = v.trim();
  if ((v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'")))
    v = v.slice(1, -1);
  return v.trim();
}

/** แยก array ออกจาก YAML inline: [a, b, c] */
function yamlArray(v) {
  if (!v) return [];
  v = v.trim();
  if (v.startsWith('[') && v.endsWith(']')) {
    return v.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
  }
  return [v];
}

function parseRulesFromBlock(block) {
  const rules = [];
  // แยก rule blocks ที่เริ่มด้วย "    - condition:"
  const ruleChunks = block.split(/\n\s{4}-\s+condition:/);

  for (let i = 1; i < ruleChunks.length; i++) {
    const chunk = ruleChunks[i];
    const lines = chunk.split('\n');

    let condition = yamlValue(lines[0]);  // บรรทัดแรกคือค่า condition (หลัง "- condition:")
    let prediction = '';
    let priority = 2;
    let tags = [];

    for (const line of lines.slice(1)) {
      const mPred = line.match(/^\s+prediction:\s*(.*)/);
      if (mPred) { prediction = yamlValue(mPred[1]); continue; }

      const mPrio = line.match(/^\s+priority:\s*(\d+)/);
      if (mPrio) { priority = parseInt(mPrio[1]); continue; }

      const mTags = line.match(/^\s+tags:\s*(.*)/);
      if (mTags) { tags = yamlArray(mTags[1]); continue; }
    }

    if (!condition || !prediction) continue;
    rules.push({ condition, prediction, priority, tags });
  }
  return rules;
}

// ────────────────────────────────────────────────────────────────
// Main parsing loop
// ────────────────────────────────────────────────────────────────

// แยก chapter blocks: เริ่มต้นด้วย "^chapter_"
const lines = raw.split('\n');
const chapters = [];
let curChapter = null;
let curLines = [];

for (const line of lines) {
  const mCh = line.match(/^chapter_([0-9]+[a-z]?):\s*$/);
  if (mCh) {
    if (curChapter !== null) chapters.push({ key: curChapter, text: curLines.join('\n') });
    curChapter = mCh[1];
    curLines = [];
  } else if (curChapter !== null) {
    curLines.push(line);
  }
}
if (curChapter !== null) chapters.push({ key: curChapter, text: curLines.join('\n') });

// แปลง chapter key → number  (38a → 38, 42a → 42)
function chKey2Num(key) {
  return parseInt(key.replace(/[a-z]/g, ''));
}

// สร้าง rule objects
const allRules = [];
let idCounter = 5001;  // เริ่มจาก 5001 เพื่อไม่ชนกับ master dictionary (1xxx-3xxx)

for (const ch of chapters) {
  const chNum = chKey2Num(ch.key);
  const titleMatch = ch.text.match(/title:\s*(.*)/);
  const title = titleMatch ? yamlValue(titleMatch[1]) : `Chapter ${ch.key}`;

  const rulesMatch = ch.text.match(/rules:([\s\S]*?)(?=\n\s{2}\w|\n```|$)/);
  if (!rulesMatch) continue;  // chapter ไม่มี rules block (free-form) → skip

  const rawRules = parseRulesFromBlock(rulesMatch[1]);
  if (rawRules.length === 0) continue;

  for (const r of rawRules) {
    const ruleType = classifyRuleType(chNum, title, r.tags);
    const category = guessCategory(r.tags);
    const conditions = parseConditions(r.condition);

    allRules.push({
      id:             idCounter++,
      c:              chNum,
      p:              r.prediction,
      t:              r.tags,
      ch:             chNum,
      pr:             r.priority,
      rule_type:      ruleType,
      category:       category,
      condition_raw:  r.condition,   // เก็บ text เดิมไว้สำหรับ human review
      conditions:     conditions,
    });
  }
}

// ────────────────────────────────────────────────────────────────
// Output
// ────────────────────────────────────────────────────────────────

const outDir = path.dirname(outPath);
if (outDir && outDir !== '.' && !fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(outPath, JSON.stringify(allRules, null, 2), 'utf8');

// สถิติ
const byType = {};
for (const r of allRules) byType[r.rule_type] = (byType[r.rule_type] ?? 0) + 1;

const withConditions = allRules.filter(r => r.conditions.length > 0).length;

console.log(`\nแปลงสำเร็จ → ${outPath}`);
console.log(`Rules ทั้งหมด : ${allRules.length}`);
console.log(`มี conditions : ${withConditions} (${Math.round(100*withConditions/allRules.length)}%)`);
console.log(`\nจำแนกตามประเภท:`);
for (const [type, count] of Object.entries(byType))
  console.log(`  ${type}: ${count}`);

const noPlanet = allRules.filter(r => r.conditions.length === 0).length;
console.log(`\nไม่ได้ดาว (ต้องแก้ manual): ${noPlanet}`);
