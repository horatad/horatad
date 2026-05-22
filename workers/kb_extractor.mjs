#!/usr/bin/env node
/**
 * workers/kb_extractor.mjs  —  BIBLE KB V2.4 extraction pipeline
 *
 * รัน:    ANTHROPIC_API_KEY=xxx node workers/kb_extractor.mjs
 * Resume: ถ้า workers/kb_extractor_progress.json มีอยู่ จะ skip บทที่ทำแล้ว
 * Reset:  rm workers/kb_extractor_progress.json
 *
 * Future Typhoon integration:
 *   TYPHOON_API_KEY=xxx node workers/kb_extractor.mjs
 *   → Pass 1: Typhoon segment Thai prose → rule units
 *   → Pass 2: Claude derive + structure V2.4 JSON  (current path)
 *   → Pass 3: Typhoon validate Thai meaning
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readdirSync }                              from 'fs';
import { execFileSync }                             from 'child_process';
import { fileURLToPath }                            from 'url';
import { dirname, join }                            from 'path';

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');

const SOURCE_DIR    = join(ROOT, 'source');
const PROGRESS_FILE = join(__dir, 'kb_extractor_progress.json');
const FINAL_OUTPUT  = join(ROOT, 'v3', 'kb_v24.json');
const PY_HELPER     = join(__dir, '_read_docx.py');

const ANTHROPIC_KEY  = process.env.ANTHROPIC_API_KEY;
const TYPHOON_KEY    = process.env.TYPHOON_API_KEY;
const TYPHOON_ENABLED = !!TYPHOON_KEY;

// Sonnet: reasoning + principle derivation (ไม่ใช้ Haiku เพราะต้อง reason ข้าม case studies)
const CLAUDE_MODEL  = 'claude-sonnet-4-6';
const MAX_TOKENS    = 8192;
const RATE_DELAY_MS = 1000;

if (!ANTHROPIC_KEY) {
  console.error('❌ ANTHROPIC_API_KEY not set');
  process.exit(1);
}

if (TYPHOON_ENABLED) {
  console.log('🌊 Typhoon enabled — Pass 1 (segment) + Pass 3 (validate) active');
} else {
  console.log('🤖 Claude-only mode (Typhoon not configured)');
}

// ── Progress ──────────────────────────────────────────────────────────────────
let progress = existsSync(PROGRESS_FILE)
  ? JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
  : { done: {}, rules: [], cost_usd: 0 };

if (!progress.cost_usd) progress.cost_usd = 0;

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

// ── Cost tracking (Sonnet 4.6 pricing) ───────────────────────────────────────
function estimateCost(inputTok, outputTok, cacheRead, cacheWrite) {
  // Sonnet 4.6: $3/M input, $15/M output, $0.30/M cache-read, $3.75/M cache-write
  const cost = (inputTok / 1e6)    * 3.00
             + (outputTok / 1e6)   * 15.00
             + (cacheRead / 1e6)   * 0.30
             + (cacheWrite / 1e6)  * 3.75;
  return cost;
}

// ── System Prompt ─────────────────────────────────────────────────────────────
// ⚠️  เปลี่ยน prompt นี้ต้อง reset progress (cache invalidate ทั้งหมด)
const SYSTEM_PROMPT = `\
คุณคือผู้เชี่ยวชาญด้านการ extract กฎจากตำราโหราศาสตร์ไทย (สุริยยาตร์)

## สถาปัตยกรรมกฎ — อ่านให้เข้าใจก่อน extract

### Rule Taxonomy (3 ประเภท)
ประเภท 1: Natal Atomic
  ดาว X พื้นดวง คุณภาพ Y → ลักษณะ/ศักยภาพ (คงที่ตลอดชีวิต)

ประเภท 2: Natal Combination
  ดาว X พื้นดวง + ดาว Y พื้นดวง → ศักยภาพที่เกิดเฉพาะเมื่อรวมกัน (emergent)

ประเภท 3: Transit × Natal
  ดาวจร pattern → ดาวเดิม pattern → เหตุการณ์ "เมื่อไหร่" (เปลี่ยนตามเวลา)

### Tier = ระดับ semantic independence
Tier 1: ดาวเดียวเป็น core (อธิบายได้โดยไม่ต้องมีดาวอื่น)
Tier 2: 2 ดวงประกอบกัน → ความหมายใหม่ (ถ้าเอาดาวหนึ่งออกความหมายหายไป)
Tier 3: 3 ดวง → ความหมายใหม่อีกชั้น
ทดสอบ: "ถ้าเอา planet X ออก rule ยังมีความหมายไหม?" → ถ้าใช่ = tier ต่ำกว่า

### Rules ไม่ลบล้างกัน (Color Mixing)
Blue + Red = Purple — Blue และ Red ยังคงอยู่ Purple เป็นของใหม่
→ Atomic rules ยัง fire เสมอ Combination เพิ่มความหมายขึ้น ไม่ยกเลิกของเดิม

### Lagna = จุดอ้างอิงทุก rule
ลัคนา = screen ที่ทุก prediction ฉายผ่าน
ตนุลัคน์ = คุณภาพของ screen (ขยายหรือลด expression ทุก rule)
rules ที่ไม่มี lagna reference → classify เป็น reference หรือ principle เท่านั้น

## Planet IDs (string อารบิก)
1=อาทิตย์ 2=จันทร์ 3=อังคาร 4=พุธ 5=พฤหัสบดี
6=ศุกร์ 7=เสาร์ 8=ราหู 9=เกตุ 10=มฤตยู
ลัคนา/ตนุลัคน์ = {"type":"tanu_lagna"}
เจ้าเรือนภพ N = {"type":"lord_of","house":N}
(ตัวเลขไทย ๑-๑๐ ในตำรา → แปลงเป็นอารบิกใน output เสมอ)

## บาปเคราะห์ = [3,7,8,10]
## คู่มิตร: (1,5) (2,4) (3,6) (7,8)
## คู่สมพล: (1,6) (2,8) (3,5) (4,7)
## คู่ศัตรู: (1,3) (2,5) (4,8) (6,7)

## rule_use — บทบาทของ rule
"match"      → กฎพยากรณ์จริง มีเงื่อนไข trigger ชัดเจน (conditions[] ครบ)
"principle"  → กฎ abstract ที่ derive จาก pattern ของหลายกรณี (สรุปจาก case studies)
"case_study" → กรณีเฉพาะ/ตัวอย่างที่ตำรายกมา (ห้าม classify เป็น match)
"reference"  → นิยาม concept ทั่วไป ไม่ใช่ prediction rule

⚠️  กฎสำคัญ: ถ้าตำรายกกรณีที่ 1-5 → extract principle 1 ข้อ + case_study N ข้อ
    อย่า copy แต่ละกรณีเป็น match rule แยก — นั่นคือ extraction ที่ผิด

## rule_type
NATAL_RULE | TRANSIT_RULE | CASE_STUDY | DEFINITION | HOUSE_CONCEPT | REFERENCE | PRINCIPLE

## lagna_aspect_req
"KUM"=กุม "LENG"=เล็ง "YOK"=โยค "TRI"=ตรีโกณ
"ANY_ASPECT"=สัมพันธ์ถึงลัคนาทุกแบบยกเว้น NONE
"NONE"=ไม่สัมพันธ์ลัคนา "ANY"=ไม่สนใจ

## context ของ planet condition
"natal"=ดาวเดิม/พื้นดวง "transit"=ดาวจร "ANY"=ไม่สนใจ

## quality_required values
"ANY" | "ดี" | "เสีย" | "ปกติ" | "เกษตร" | "อุจ" | "มหาอุจ" | "อุจจาวิลาส" |
"อุจจาภิมุข" | "ประ" | "ประเกษตร" | "นิจ" | "มหาจักร" | "จุลจักร" |
"ราชาโชค" | "เทวีโชค"

## applies_when
"default" | "principle" |
"evil_count>=N" | "evil_count<N" | "no_friend_aspect" | "has_friend_aspect" |
"tanu_strong" | "tanu_weak"

## polarity
"+" ดี/เป็นประโยชน์ | "-" เสีย/ให้โทษ | "~" กลางๆ/ขึ้นอยู่กับปัจจัย

## V2.4 Rule Schema
{
  "rule_use": "match"|"reference"|"case_study"|"principle",
  "rule_type": "...",
  "tier": 1|2|3,
  "type": "NATAL_ATOMIC"|"NATAL_COMBINATION"|"TRANSIT_NATAL",
  "ct": "หัวข้อหรือหมวดหมู่ของกฎ",
  "c": "เงื่อนไขสั้นๆ ภาษาไทย 1 ประโยค",
  "conditions": [
    {
      "planet_id": "1"-"10" | {"type":"tanu_lagna"} | {"type":"lord_of","house":N},
      "context": "natal"|"transit"|"ANY",
      "quality_required": "...",
      "lagna_aspect_req": "KUM"|"LENG"|"YOK"|"TRI"|"ANY_ASPECT"|"NONE"|"ANY",
      "house_required": 1-12,
      "sign_required": 0-11,
      "aspect_to_planet": {
        "id": "1"-"10",
        "scope": "natal"|"transit",
        "type": "KUM"|"LENG"|"YOK"|"TRI"|"ANY_ASPECT"
      },
      "relation_to": {
        "id": "1"-"10",
        "type": "มิตร"|"ศัตรู"|"สมพล"|"ANY_FRIEND"|"ANY_ENEMY"
      },
      "required": true|false
    }
  ],
  "global_conditions": [
    {
      "type": "friend_pair_count"|"enemy_pair_count"|"evil_planet_count",
      "scope": "natal"|"transit",
      "min": N,
      "aspect_type": "KUM"|"LENG"|"ANY_ASPECT"
    }
  ],
  "predictions": [
    {
      "text": "คำพยากรณ์ภาษาไทยที่ user เข้าใจ",
      "polarity": "+"|"-"|"~",
      "domain": "ตัวตน"|"การเงิน"|"ความรัก"|"สุขภาพ"|"หน้าที่การงาน"|"ความสูญเสีย"|"ทั่วไป",
      "applies_when": "default"|"..."
    }
  ],
  "t": ["คีย์เวิร์ด"],
  "rule_source": "major"|"minor",
  "weight": 1|2|3
}

## หลักการ extract

1. **Principle derivation (สำคัญที่สุด)**
   ถ้าตำรายกหลายกรณี → หา pattern ร่วม → extract เป็น principle 1 ข้อ
   แต่ละกรณีเป็น case_study แยก (ไม่มี conditions[] ละเอียด)
   CH036 ตัวอย่าง: 5 กรณี → principle "คู่มิตรจร N คู่ → โชคใหญ่"

2. **Atomic ก่อน Combination**
   ถ้าดาวเดียวมีความหมายอยู่แล้ว → extract atomic rule ก่อน
   จากนั้น extract combination rule ถ้ามีความหมายใหม่เกิดขึ้น

3. **Transit × Natal แยกจาก Natal**
   "ดาวจร" = transit context | "ดาวเดิม/พื้นดวง" = natal context
   อย่า mix context ใน condition เดียว

4. **Conditions ต้องครบตามตำรา**
   อย่า simplify ทิ้งเงื่อนไข — ถ้าตำราบอก 3 เงื่อนไข ต้องมี 3 conditions[]

5. **Lagna requirement**
   rules ที่ไม่มี lagna reference → rule_use="reference" หรือ "principle" เท่านั้น
   rules พยากรณ์จริงต้องมี lagna connection

6. **บทที่ไม่มีกฎ** (บทนำ, คำอธิบาย, ประวัติ) → return []

## Output
ส่ง JSON array เท่านั้น ไม่มี prose อื่น:
\`\`\`json
[
  { ...rule1... },
  { ...rule2... }
]
\`\`\`
ถ้าไม่มีกฎ: \`\`\`json\n[]\n\`\`\``;

// ── Claude API (Pass 2 — derive + structure) ──────────────────────────────────
async function claudeExtract(chapterKey, text, segmented = null, retries = 4) {
  const userContent = segmented
    ? `บทนี้: ${chapterKey}\n\n[Typhoon segmentation]\n${segmented}\n\n[Source text]\n${text}`
    : `บทนี้: ${chapterKey}\n\nเนื้อหา:\n${text}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'prompt-caching-2024-07-31'
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: MAX_TOKENS,
          system: [{
            type: 'text',
            text: SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' }
          }],
          messages: [{ role: 'user', content: userContent }]
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
        throw new Error(`Claude API ${resp.status}: ${err.slice(0, 200)}`);
      }

      const data   = await resp.json();
      const usage  = data.usage || {};
      const inTok  = usage.input_tokens || 0;
      const outTok = usage.output_tokens || 0;
      const cacheR = usage.cache_read_input_tokens || 0;
      const cacheW = usage.cache_creation_input_tokens || 0;
      const cost   = estimateCost(inTok, outTok, cacheR, cacheW);

      process.stdout.write(` [in=${inTok} out=${outTok} cr=${cacheR} $${cost.toFixed(4)}]`);
      progress.cost_usd += cost;

      const raw       = data.content[0]?.text || '';
      const jsonMatch = raw.match(/```json\n([\s\S]+?)\n```/);
      const jsonStr   = jsonMatch ? jsonMatch[1] : raw.trim();
      const rules     = JSON.parse(jsonStr);
      return Array.isArray(rules) ? rules : [];

    } catch (err) {
      if (attempt === retries - 1) throw err;
      const wait = Math.pow(2, attempt + 1) * 1000;
      console.log(`\n  ⚠️  ${err.message.slice(0, 80)}, retry ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
  return [];
}

// ── Typhoon Pass 1: segment Thai prose → rule units (future) ──────────────────
async function typhoonSegment(text) {
  if (!TYPHOON_ENABLED) return null;

  const TYPHOON_SEGMENT_PROMPT = `\
คุณคือผู้เชี่ยวชาญโหราศาสตร์ไทย ช่วย segment ข้อความต่อไปนี้เป็น "หน่วยกฎ" แยกกัน
แต่ละหน่วยให้บอก:
- type: "principle"|"case_study"|"atomic_rule"|"definition"|"no_rule"
- text: ข้อความต้นฉบับ
- note: สิ่งที่สังเกตเห็น (เช่น planet IDs, pattern ที่เห็น)

ส่ง JSON array เท่านั้น`;

  try {
    const resp = await fetch('https://api.opentyphoon.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TYPHOON_KEY}`
      },
      body: JSON.stringify({
        model: 'typhoon-v2.5-30b-a3b-instruct',
        max_tokens: 4096,
        temperature: 0.1,
        messages: [
          { role: 'system',  content: TYPHOON_SEGMENT_PROMPT },
          { role: 'user',    content: text }
        ]
      })
    });

    if (!resp.ok) {
      console.log(` [Typhoon ${resp.status} — skip Pass 1]`);
      return null;
    }

    const data = await resp.json();
    return data.choices?.[0]?.message?.content || null;

  } catch (e) {
    console.log(` [Typhoon error: ${e.message.slice(0, 60)} — skip Pass 1]`);
    return null;
  }
}

// ── Typhoon Pass 3: validate Thai meaning (future) ────────────────────────────
async function typhoonValidate(rules) {
  if (!TYPHOON_ENABLED || rules.length === 0) return rules;
  // TODO: ส่ง predictions[].text ให้ Typhoon ตรวจว่าภาษาไทยถูกต้อง
  // Flag rules ที่ Typhoon ไม่เห็นด้วย → ambiguous[]
  return rules;
}

// ── Main ──────────────────────────────────────────────────────────────────────
const allFiles = readdirSync(SOURCE_DIR)
  .filter(f => /^CH\d{3}\.docx$/.test(f))
  .sort();

console.log(`\n📚 พบ ${allFiles.length} บท | model: ${CLAUDE_MODEL}`);
console.log(`📄 progress: ${Object.keys(progress.done).length} บทเสร็จแล้ว`);
console.log(`💰 cost สะสม: $${(progress.cost_usd || 0).toFixed(4)}\n`);

let newRules = 0;

for (const file of allFiles) {
  const chNum      = parseInt(file.replace('CH', '').replace('.docx', ''), 10);
  const chapterKey = `chapter_${String(chNum).padStart(2, '0')}`;

  if (progress.done[chapterKey] !== undefined) {
    process.stdout.write(`✓ ${file} (${progress.done[chapterKey]} rules) skip\n`);
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

  process.stdout.write(`📖 ${file} (${text.length} chars)...`);

  try {
    // Pass 1: Typhoon segment (ถ้า enabled)
    const segmented = await typhoonSegment(text);

    // Pass 2: Claude extract + structure
    const rules  = await claudeExtract(chapterKey, text, segmented);

    // Pass 3: Typhoon validate (ถ้า enabled)
    const validated = await typhoonValidate(rules);

    const tagged = validated.map(r => ({ ch: chapterKey, ...r }));
    progress.rules.push(...tagged);
    progress.done[chapterKey] = validated.length;
    saveProgress();
    console.log(` ✓ ${validated.length} rules`);
    newRules += validated.length;

  } catch (err) {
    console.error(`\n  ❌ ${err.message.slice(0, 120)}`);
    // ไม่หยุด — ทำบทต่อไป
  }

  await new Promise(r => setTimeout(r, RATE_DELAY_MS));
}

// ── Compile output ────────────────────────────────────────────────────────────
const totalRules = progress.rules.length;
console.log(`\n📊 rules ทั้งหมด: ${totalRules} (ใหม่ session นี้: ${newRules})`);
console.log(`💰 cost รวม: $${progress.cost_usd.toFixed(4)}`);

if (totalRules === 0) {
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
  source:             `extracted from source/CH*.docx via ${TYPHOON_ENABLED ? 'Typhoon+Claude' : 'Claude'} pipeline`,
  rules:              allRules
};

writeFileSync(FINAL_OUTPUT, JSON.stringify(kb_v24, null, 2));
console.log(`\n✅ เขียน ${allRules.length} rules → ${FINAL_OUTPUT}`);
