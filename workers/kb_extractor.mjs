#!/usr/bin/env node
/**
 * workers/kb_extractor.mjs
 * สร้าง v3/kb_v24.json จาก source/CH*.docx โดยใช้ Claude API
 *
 * รัน: ANTHROPIC_API_KEY=xxx node workers/kb_extractor.mjs
 * Resume: ถ้า workers/kb_extractor_progress.json มีอยู่ จะ skip บทที่ทำแล้ว
 * ลบ progress แล้วรันใหม่: rm workers/kb_extractor_progress.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');

const SOURCE_DIR    = join(ROOT, 'source');
const PROGRESS_FILE = join(__dir, 'kb_extractor_progress.json');
const FINAL_OUTPUT  = join(ROOT, 'v3', 'kb_v24.json');
const PY_HELPER     = join(__dir, '_read_docx.py');
const API_KEY       = process.env.ANTHROPIC_API_KEY;

const MODEL         = 'claude-haiku-4-5-20251001'; // เร็ว + ถูก สำหรับ extraction
const MAX_TOKENS    = 8192;
const RATE_DELAY_MS = 1200;

if (!API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set');
  process.exit(1);
}

// ── Progress ──────────────────────────────────────────────────────────────────
let progress = existsSync(PROGRESS_FILE)
  ? JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
  : { done: {}, rules: [] };

function saveProgress() {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ── Read docx ─────────────────────────────────────────────────────────────────
function readDocx(filepath) {
  return execFileSync('python3', [PY_HELPER, filepath], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024
  }).trim();
}

// ── System Prompt (cached) ────────────────────────────────────────────────────
const SYSTEM_PROMPT = `\
คุณคือ AI ผู้ช่วย extract กฎและหลักการโหราศาสตร์ไทย (สุริยยาตร์) จากตำราภาษาไทย
ให้ output เป็น JSON array ของ rules ตาม V2.4 schema ด้านล่าง

## Planet IDs (ใช้เลขอารบิก string)
1=อาทิตย์, 2=จันทร์, 3=อังคาร, 4=พุธ, 5=พฤหัสบดี,
6=ศุกร์, 7=เสาร์, 8=ราหู, 9=เกตุ, 10=มฤตยู
ลัคนา/ตนุลัคน์ = {"type":"tanu_lagna"}
เจ้าเรือนภพ N = {"type":"lord_of","house":N}
(ตัวเลขในตำราใช้ทั้งอารบิกและไทย ๑-๑๐ — แปลงเป็นอารบิกใน output)

## บาปเคราะห์ (evil planets) = [3,7,8,10]
## คู่มิตร: 1-5, 2-4, 3-6, 7-8
## คู่สมพล: 1-6, 2-8, 3-5, 4-7
## คู่ศัตรู: 1-3, 2-5, 4-8, 6-7

## rule_use — บทบาทหลักของ rule
- "match"      → กฎที่ใช้พยากรณ์จริง (trigger จาก condition matching)
- "reference"  → นิยาม/หลักการทั่วไป (ไม่ match ดวง)
- "case_study" → กรณีศึกษาจริง ตัวอย่างประวัติศาสตร์ (ไม่ match ดวง)
- "principle"  → กฎสากล เช่น "ดาวร้ายให้โทษทุกกรณี" (match แต่ tag พิเศษ)

## rule_type — semantic tag (เดิม ยังใช้อยู่)
NATAL_RULE | TRANSIT_RULE | CASE_STUDY | DEFINITION | HOUSE_CONCEPT | REFERENCE | PRINCIPLE

## lagna_aspect_req values
"KUM"=กุม, "LENG"=เล็ง, "YOK"=โยค, "TRI"=ตรีโกณ,
"ANY_ASPECT"=สัมพันธ์ถึงลัคนา (ทุกแบบยกเว้น NONE),
"NONE"=ไม่สัมพันธ์ลัคนา, "ANY"=ไม่สนใจ

## context ของ planet condition
"natal"=ดาวเดิม/พื้นดวง, "transit"=ดาวจร, "ANY"=ไม่สนใจ

## quality_required values
"ANY" | "ดี" | "เสีย" | "ปกติ" | "เกษตร" | "อุจ" | "มหาอุจ" | "อุจจาวิลาส" |
"อุจจาภิมุข" | "ประ" | "ประเกษตร" | "นิจ" | "มหาจักร" | "จุลจักร" |
"ราชาโชค" | "เทวีโชค"

## applies_when (DSL สำหรับ predictions[])
"default" | "principle" |
"evil_count>=N" | "evil_count<N" | "no_friend_aspect" | "has_friend_aspect" |
"tanu_strong" | "tanu_weak"

## polarity
"+" = ดี/เป็นประโยชน์, "-" = เสีย/ให้โทษ, "~" = กลางๆ/ขึ้นกับปัจจัย

## V2.4 Rule Schema (JSON)
{
  "rule_use": "match"|"reference"|"case_study"|"principle",
  "rule_type": "...",
  "ct": "หัวข้อหรือหมวดหมู่ของกฎ",
  "c": "เงื่อนไขสั้นๆ ภาษาไทย (1 ประโยค)",
  "conditions": [
    {
      "planet_id": "1"-"10" | {"type":"tanu_lagna"} | {"type":"lord_of","house":N},
      "context": "natal"|"transit"|"ANY",
      "quality_required": "...",
      "lagna_aspect_req": "KUM"|"LENG"|"YOK"|"TRI"|"ANY_ASPECT"|"NONE"|"ANY",
      "house_required": 1-12,       // ถ้าระบุ ภพ
      "sign_required": 0-11,        // ถ้าระบุ ราศี (เมษ=0..มีน=11)
      "aspect_to_planet": {         // ถ้าระบุว่าสัมพันธ์กับดาวอื่น
        "id": "1"-"10",
        "scope": "natal"|"transit",
        "type": "KUM"|"LENG"|"YOK"|"TRI"|"ANY_ASPECT"
      },
      "relation_to": {              // ถ้าระบุ คู่มิตร/ศัตรู/สมพล
        "id": "1"-"10",
        "type": "มิตร"|"ศัตรู"|"สมพล"|"ANY_FRIEND"|"ANY_ENEMY"
      },
      "required": true|false
    }
  ],
  "global_conditions": [            // ถ้ามีเงื่อนไขระดับ rule เช่น ดาวร้ายครบ N
    {
      "type": "evil_planet_count",
      "scope": "natal"|"transit",
      "min": N,
      "aspect_min": "LENG"|"ANY_ASPECT"
    }
  ],
  "predictions": [
    {
      "text": "คำพยากรณ์ภาษาไทย",
      "polarity": "+"|"-"|"~",
      "domain": "ตัวตน"|"การเงิน"|"ความรัก"|"สุขภาพ"|"หน้าที่การงาน"|"ความสูญเสีย"|"ทั่วไป",
      "applies_when": "default"|"..."
    }
  ],
  "t": ["คีย์เวิร์ด1", "คีย์เวิร์ด2"],
  "rule_source": "major"|"minor",
  "weight": 1|2|3
}

## หลักการ extract
1. แยก rule ทีละ "กฎ" — 1 กฎ = เงื่อนไขชัดเจน + คำพยากรณ์ชัดเจน
2. ถ้าตำราพูดถึงหลายกรณี → หลาย rule object (ไม่รวม blob เดียว)
3. นิยาม/ความหมายทั่วไป → rule_use="reference"
4. กรณีศึกษา บุคคลจริง เหตุการณ์จริง → rule_use="case_study"
5. กฎที่ apply ทุกกรณี ไม่มีเงื่อนไขเฉพาะ → rule_use="principle"
6. กฎที่มีเงื่อนไข trigger ชัดเจน → rule_use="match"
7. conditions[] ต้องครบตามตำรา — อย่า simplify ทิ้งเงื่อนไข
8. predictions[].text ต้องเป็นภาษาไทยที่ user เข้าใจ ไม่ใช่ technical
9. "ดาว" ในตำราหมายถึง planet, "ภพ" หมายถึง house, "ราศี" หมายถึง sign
10. ถ้าบทไม่มีกฎที่ extract ได้ (เช่น บทสรุปหรือบทนำ) → return []

## Output
ส่ง JSON array เท่านั้น ไม่มี prose อื่น:
\`\`\`json
[
  { ...rule1... },
  { ...rule2... }
]
\`\`\`
ถ้าไม่มีกฎ: \`\`\`json\n[]\n\`\`\``;

// ── Claude API ────────────────────────────────────────────────────────────────
async function extractRules(chapterKey, text, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31'
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          system: [{
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' }
          }],
          messages: [{
            role: 'user',
            content: `บทนี้: ${chapterKey}\n\nเนื้อหา:\n${text}`
          }]
        })
      });

      if (resp.status === 429 || resp.status === 529) {
        const wait = Math.pow(2, attempt + 1) * 3000;
        console.log(`  ⏳ rate limit, รอ ${wait / 1000}s...`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`API ${resp.status}: ${err.slice(0, 200)}`);
      }

      const data = await resp.json();
      const usage = data.usage || {};
      const cacheRead  = usage.cache_read_input_tokens || 0;
      const cacheWrite = usage.cache_creation_input_tokens || 0;
      const inputTok   = usage.input_tokens || 0;
      const outputTok  = usage.output_tokens || 0;
      console.log(`  tokens: in=${inputTok} out=${outputTok} cache_read=${cacheRead} cache_write=${cacheWrite}`);

      const raw = data.content[0]?.text || '';
      const jsonMatch = raw.match(/```json\n([\s\S]+?)\n```/);
      const jsonStr   = jsonMatch ? jsonMatch[1] : raw.trim();
      const rules     = JSON.parse(jsonStr);
      if (!Array.isArray(rules)) return [];
      return rules;

    } catch (err) {
      if (attempt === retries - 1) throw err;
      const wait = Math.pow(2, attempt + 1) * 1000;
      console.log(`  ⚠️  ${err.message.slice(0, 80)}, retry in ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  return [];
}

// ── Main ──────────────────────────────────────────────────────────────────────
const allFiles = readdirSync(SOURCE_DIR)
  .filter(f => /^CH\d{3}\.docx$/.test(f))
  .sort();

console.log(`📚 พบ ${allFiles.length} บท | model: ${MODEL}`);
console.log(`📄 progress: ${Object.keys(progress.done).length} บทเสร็จแล้ว\n`);

let totalRules = 0;
let newRules   = 0;

for (const file of allFiles) {
  const chNum      = parseInt(file.replace('CH', '').replace('.docx', ''), 10);
  const chapterKey = `chapter_${String(chNum).padStart(2, '0')}`;

  if (progress.done[chapterKey] !== undefined) {
    console.log(`✓ ${file} (${progress.done[chapterKey]} rules) — skip`);
    totalRules += progress.done[chapterKey];
    continue;
  }

  const filepath = join(SOURCE_DIR, file);
  const text     = readDocx(filepath);

  if (text.length < 80) {
    console.log(`⏭ ${file} — สั้นเกินไป (${text.length} chars)`);
    progress.done[chapterKey] = 0;
    saveProgress();
    continue;
  }

  process.stdout.write(`📖 ${file} (${text.length} chars)... `);

  try {
    const rules  = await extractRules(chapterKey, text);
    const tagged = rules.map(r => ({ ch: chapterKey, ...r }));
    progress.rules.push(...tagged);
    progress.done[chapterKey] = rules.length;
    saveProgress();
    console.log(`✓ ${rules.length} rules`);
    totalRules += rules.length;
    newRules   += rules.length;
  } catch (err) {
    console.error(`\n  ❌ ${err.message.slice(0, 120)}`);
    // ไม่หยุด — ทำบทต่อไป
  }

  await new Promise(r => setTimeout(r, RATE_DELAY_MS));
}

// ── Compile output ────────────────────────────────────────────────────────────
console.log(`\n📊 rules ทั้งหมด: ${progress.rules.length} (ใหม่ session นี้: ${newRules})`);

if (progress.rules.length === 0) {
  console.log('⚠️  ไม่มี rules — ตรวจสอบ ANTHROPIC_API_KEY');
  process.exit(1);
}

const allRules = progress.rules.map((r, i) => ({
  id: `R${String(i + 1).padStart(3, '0')}`,
  ...r
}));

const kb_v24 = {
  version:            '2.4.0',
  updated:            new Date().toISOString().slice(0, 10),
  total:              allRules.length,
  engine_min_version: '3.1.0',
  source:             'extracted from source/CH*.docx via Claude API',
  rules:              allRules
};

writeFileSync(FINAL_OUTPUT, JSON.stringify(kb_v24, null, 2));
console.log(`✅ เขียน ${allRules.length} rules → ${FINAL_OUTPUT}`);
