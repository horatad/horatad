#!/usr/bin/env node
/**
 * workers/kb_extract_gha.mjs — BIBLE KB V2.4 multi-LLM extraction pipeline
 *
 * ออกแบบสำหรับรันใน GitHub Actions (ไม่ต้องการ ANTHROPIC_API_KEY)
 *
 * Pass 1: Groq LLaMA 3.3 70B  → api.groq.com (direct, free, 14,400 req/day)
 * Pass 2: Typhoon               → horatad-ai CF Worker (proven path, ไม่ต้อง key)
 *
 * ผล:
 *   v3/kb_v24.json           → rules ที่ทั้งสองเห็นด้วย (confidence: high)
 *   workers/kb_v24_review.json → rules ที่ต้องตรวจสอบ (confidence: review)
 *
 * รัน: GROQ_API_KEY=xxx node workers/kb_extract_gha.mjs
 * Resume: progress จาก workers/kb_extract_gha_progress.json (auto)
 * Reset:  rm workers/kb_extract_gha_progress.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { readdirSync }                              from 'fs';
import { execFileSync }                             from 'child_process';
import { fileURLToPath }                            from 'url';
import { dirname, join }                            from 'path';

const __dir  = dirname(fileURLToPath(import.meta.url));
const ROOT   = join(__dir, '..');

const SOURCE_DIR    = join(ROOT, 'source');
const PROGRESS_FILE = join(__dir, 'kb_extract_gha_progress.json');
const FINAL_OUTPUT  = join(ROOT, 'v3', 'kb_v24.json');
const REVIEW_OUTPUT = join(__dir, 'kb_v24_review.json');
const PY_HELPER     = join(__dir, '_read_docx.py');

const GROQ_KEY       = process.env.GROQ_API_KEY;
const CF_WORKER_URL  = 'https://horatad-ai.uchujaro5.workers.dev';
const GROQ_API_URL   = 'https://api.groq.com/openai/v1/chat/completions';

const GROQ_MODEL    = 'llama-3.3-70b-versatile';
const TYPHOON_MODEL = 'typhoon-v2.5-30b-a3b-instruct';
const MAX_TOKENS    = 4096;
const RATE_DELAY_MS = 1500; // หน่วงระหว่าง chapter

if (!GROQ_KEY) {
  console.error('❌ GROQ_API_KEY not set');
  console.error('   รับ key ฟรีที่ https://console.groq.com');
  process.exit(1);
}

// ── Progress ──────────────────────────────────────────────────────────────────
let progress = existsSync(PROGRESS_FILE)
  ? JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'))
  : { done: {}, rules: [], review: [] };

if (!progress.review) progress.review = [];

function saveProgress() {
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// ── Read docx ─────────────────────────────────────────────────────────────────
function readDocx(filepath) {
  return execFileSync('python3', [PY_HELPER, filepath], {
    encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024
  }).trim();
}

// ── Extraction System Prompt V2 (vocabulary-grounded) ────────────────────────
// Source of truth: v3/master_dict.js → buildExtractionSystemPrompt()
// อัปเดต prompt นี้พร้อมกันทุกครั้งที่แก้ master_dict.js
const EXTRACT_SYSTEM = `\
คุณคือผู้เชี่ยวชาญ extract กฎจากตำราโหราศาสตร์ไทย (สุริยยาตร์) ให้เป็น JSON

## Planet IDs + Aliases (ใช้ตัวเลขอารบิกเท่านั้นใน output)
1=อาทิตย์ (สุริยะ/สุริยน/รวิ/ทิวากร/พระอาทิตย์)
2=จันทร์ (จันทรา/จันทรมา/ศศิ/ศศิธร/นิศากร/โสม/พระจันทร์)
3=อังคาร (โลหิต/ภูมิ/ภอม/มังกล/พระอังคาร)
4=พุธ (โสมย/สอม/โสมบุตร/พระพุธ)
5=พฤหัสบดี (พฤหัส/คุรุ/ครู/ชีโว/ไชโว/เทวคุรุ/พระพฤหัส)
6=ศุกร์ (ศุกรา/ภาร์กว/ภาร์กวะ/พระศุกร์)
7=เสาร์ (สนิ/สนีศวร/มันท/กฤษณ/พระเสาร์)
8=ราหู (พระราหู)
9=เกตุ (พระเกตุ)
10=มฤตยู (มฤตยูราช/พระมฤตยู)
ลัคนา/ตนุลัคน์/เจ้าเรือน1 → {"type":"tanu_lagna"}
ตัวเลขไทย ๑-๑๐ → แปลงเป็นอารบิกเสมอ

## Planet Relations
คู่มิตร: (1,5)(2,4)(3,6)(7,8) | คู่ศัตรู: (1,3)(2,5)(4,8)(6,7)
คู่สมพล: (1,6)(2,8)(3,5)(4,7) | บาปเคราะห์: [3,7,8,10]

## Position Predicates (กริยาบ่งบอก spatial relation)
อยู่ใน/เสวย/ครอง/สถิตใน/ประจำ → planet in sign/house
ทับ/ร่วม/รวม/อยู่ด้วยกัน/กุม → conjunction (0°)
เล็ง/เผชิญ/ตรงข้าม → opposition (180°)
ตรีโกณ/ไตรโกณ/สามเหลี่ยม → trine (120°)
โยค/ยก → square (90°)
เดิน/ผ่าน/โคจร/โคจรผ่าน → transit motion

## Quality Terms → Polarity
negative("-"): บาป/บาปเคราะห์/ร้าย/ทำลาย/เคราะห์/ทุกข์/ทุกขลาภ/พินาศ/วิบัติ/อันตราย
positive("+"): สุภ/สุภเคราะห์/ดี/มงคล/โชค/ศุภ/รุ่งเรือง/เจริญ/ลาภ/ยศ/ชัยชนะ
neutral("~"): กลาง/ปานกลาง/ทั่วไป/เป็นกลาง

## Domain Compounds (อย่าตัดคำเหล่านี้)
บาปเคราะห์/สุภเคราะห์/ตนุลัคน์/ลัคนา/เจ้าเรือน/คู่มิตร/คู่ศัตรู/ทุกขลาภ/โชคลาภ

## Transit Markers (→ TRANSIT_NATAL, context:"transit")
เมื่อ/ขณะที่/ตอนที่/ในปีที่/เมื่อดาว/โคจร/ดาวเดิน/ดาวโคจร

## Anti-Pattern: Case Study ≠ Match Rule ⚠️
ถ้าเห็น: กรณีที่/ตัวอย่างเช่น/เช่น/คนที่เกิด/บุคคลสำคัญ
→ rule_use:"case_study" ห้ามเป็น "match"
ถ้าตำรายกกรณี 1,2,3 (pattern เดียวกัน) → principle 1 ข้อ + case_study N ข้อ

## Rule type
"NATAL_ATOMIC" = ดาวเดียวส่งผลคงที่ (tier 1)
"NATAL_COMBINATION" = 2+ ดาว emergent meaning (tier 2+) — test: เอาดาวหนึ่งออก rule ยังมีความหมายไหม?
"TRANSIT_NATAL" = transit × natal = timing (เห็น transit marker)
"DEFINITION" | "REFERENCE" | "PRINCIPLE"

## rule_use
"match" | "principle" | "case_study" | "reference"

## Output (JSON array เท่านั้น)
\`\`\`json
[{
  "rule_use":"match","type":"NATAL_ATOMIC","tier":1,
  "c":"เงื่อนไข 1 ประโยค","meaning":"ความหมาย","polarity":"+",
  "planet_ids":[1],"contexts":["natal"],
  "domain":"ตัวตน|การเงิน|ความรัก|สุขภาพ|หน้าที่การงาน|ความสูญเสีย|ทั่วไป"
}]
\`\`\`
ถ้าไม่มีกฎ: \`\`\`json\n[]\n\`\`\``;

// ── Parse JSON from LLM response ──────────────────────────────────────────────
function parseRules(text) {
  const m = text.match(/```json\n([\s\S]+?)\n```/);
  const s = m ? m[1] : text.trim();
  const r = JSON.parse(s);
  return Array.isArray(r) ? r : [];
}

// ── Call Groq (direct — primary extractor) ────────────────────────────────────
async function callGroq(chapterKey, text, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          max_tokens: MAX_TOKENS,
          temperature: 0.1,
          messages: [
            { role: 'system', content: EXTRACT_SYSTEM },
            { role: 'user',   content: `บทนี้: ${chapterKey}\n\n${text}` }
          ]
        })
      });

      if (resp.status === 429) {
        const wait = Math.pow(2, attempt + 1) * 5000;
        process.stdout.write(` [Groq rate-limit ${wait/1000}s]`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (!resp.ok) throw new Error(`Groq HTTP ${resp.status}`);

      const data = await resp.json();
      return parseRules(data.choices[0].message.content || '');

    } catch (err) {
      if (attempt === retries - 1) { process.stdout.write(` [Groq❌ ${err.message.slice(0,40)}]`); return null; }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
}

// ── Call Typhoon via CF Worker (validator) ────────────────────────────────────
async function callTyphoon(chapterKey, text, retries = 2) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const resp = await fetch(CF_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: TYPHOON_MODEL,
          max_tokens: MAX_TOKENS,
          stream: false,
          messages: [
            { role: 'system', content: EXTRACT_SYSTEM },
            { role: 'user',   content: `บทนี้: ${chapterKey}\n\n${text}` }
          ]
        })
      });

      if (!resp.ok) throw new Error(`CF Worker HTTP ${resp.status}`);

      const data = await resp.json();
      const raw  = data.choices?.[0]?.message?.content || data.content?.[0]?.text || '';
      return parseRules(raw);

    } catch (err) {
      if (attempt === retries - 1) { process.stdout.write(` [Typhoon❌ ${err.message.slice(0,40)}]`); return null; }
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
}

// ── Cross-validate two rule sets ──────────────────────────────────────────────
function crossValidate(chapterKey, groqRules, typhoonRules) {
  // ถ้ามีแค่ Groq (Typhoon ล้มเหลว) → ใช้ Groq เลย confidence "groq-only"
  if (!typhoonRules) {
    return {
      high: groqRules.map(r => ({ ...r, confidence: 'groq-only' })),
      review: []
    };
  }
  // ถ้าทั้งคู่ว่าง → บทนี้ไม่มีกฎ
  if (!groqRules?.length && !typhoonRules?.length) {
    return { high: [], review: [] };
  }

  // ตรวจ chapter-level agreement:
  // ถ้า rule count ต่างกันไม่เกิน 50% และ polarity mix ใกล้กัน → high confidence
  const gCount = groqRules?.length || 0;
  const tCount = typhoonRules?.length || 0;
  const countRatio = gCount && tCount ? Math.min(gCount, tCount) / Math.max(gCount, tCount) : 0;

  if (countRatio >= 0.5 || (gCount === 0 && tCount === 0)) {
    // เห็นด้วย — ใช้ Groq เป็น primary (ซับซ้อนกว่า) + tag validated
    return {
      high: (groqRules || []).map(r => ({ ...r, confidence: 'validated' })),
      review: []
    };
  } else {
    // ต่างกันมาก — flag ทั้งบท
    return {
      high: [],
      review: [{
        chapter: chapterKey,
        status: 'disagreement',
        groq_count: gCount,
        typhoon_count: tCount,
        groq_rules: groqRules || [],
        typhoon_rules: typhoonRules || []
      }]
    };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
const allFiles = readdirSync(SOURCE_DIR)
  .filter(f => /^CH\d{3}\.docx$/.test(f))
  .sort();

console.log(`\n📚 พบ ${allFiles.length} บท`);
console.log(`🤖 Pass 1: Groq ${GROQ_MODEL} (direct)`);
console.log(`🌊 Pass 2: Typhoon (via CF Worker)`);
console.log(`📄 progress: ${Object.keys(progress.done).length} บทเสร็จแล้ว\n`);

let newRules   = 0;
let reviewCount = 0;

for (const file of allFiles) {
  const chNum      = parseInt(file.replace('CH', '').replace('.docx', ''), 10);
  const chapterKey = `chapter_${String(chNum).padStart(2, '0')}`;

  if (progress.done[chapterKey] !== undefined) {
    process.stdout.write(`✓ ${file} (${progress.done[chapterKey]}) skip\n`);
    continue;
  }

  const filepath = join(SOURCE_DIR, file);
  const text     = readDocx(filepath);

  if (text.length < 80) {
    console.log(`⏭ ${file} — สั้นเกินไป`);
    progress.done[chapterKey] = 0;
    saveProgress();
    continue;
  }

  process.stdout.write(`📖 ${file} (${text.length}c)...`);

  try {
    // Pass 1: Groq
    const groqRules = await callGroq(chapterKey, text);
    process.stdout.write(` G:${groqRules?.length ?? 'err'}`);

    // Pass 2: Typhoon
    const typhoonRules = await callTyphoon(chapterKey, text);
    process.stdout.write(` T:${typhoonRules?.length ?? 'err'}`);

    // Cross-validate
    const { high, review } = crossValidate(chapterKey, groqRules, typhoonRules);

    const tagged = high.map(r => ({ ch: chapterKey, ...r }));
    progress.rules.push(...tagged);
    progress.review.push(...review);
    progress.done[chapterKey] = high.length;
    saveProgress();

    if (review.length) {
      process.stdout.write(` ⚠️ review\n`);
      reviewCount++;
    } else {
      process.stdout.write(` ✓ ${high.length} rules\n`);
    }
    newRules += high.length;

  } catch (err) {
    console.error(`\n  ❌ ${err.message.slice(0, 100)}`);
  }

  await new Promise(r => setTimeout(r, RATE_DELAY_MS));
}

// ── Compile output ────────────────────────────────────────────────────────────
const totalRules = progress.rules.length;
console.log(`\n📊 rules: ${totalRules} (ใหม่ session นี้: ${newRules}) | review: ${progress.review.length} บท`);

if (totalRules === 0 && progress.review.length === 0) {
  console.log('⚠️  ไม่มีผลลัพธ์ — ตรวจสอบ GROQ_API_KEY');
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
  source:             'extracted via Groq+Typhoon pipeline from source/CH*.docx',
  rules:              allRules
};

writeFileSync(FINAL_OUTPUT, JSON.stringify(kb_v24, null, 2));
console.log(`✅ ${allRules.length} rules → ${FINAL_OUTPUT}`);

if (progress.review.length > 0) {
  writeFileSync(REVIEW_OUTPUT, JSON.stringify(progress.review, null, 2));
  console.log(`⚠️  ${progress.review.length} บทต้องตรวจสอบ → ${REVIEW_OUTPUT}`);
}
