# BIBLE + JULIAN — Mission Detail
# Project: BIBLE (Prediction Wording Engine) + JULIAN (Empirical Astro DB)
# ภาษา: ไทย + Eng technical term
# กฎ: ✅ = เสร็จแล้ว (ไม่ลบ) | 🔲 = ต้องทำ | 🔴 = blocked/รอ user | ⭐ = priority สูง
# อัปเดตไฟล์นี้ทุกครั้งที่มี mission ใหม่หรือเสร็จ task
# ดูสถานะรวม → PROJECT_STATUS.md

---

## Core Premise (ห้ามลืม)

> **Horatad = Event Timer (alarm clock) + Conversation**
> timing พิสูจน์ได้ด้วยเหตุการณ์จริงหลังพยากรณ์ — ไม่ใช่แค่ rhetoric
> LLM ทำหน้าที่ craft wording จาก engine output เท่านั้น — ไม่ได้ตัดสินว่าอะไรจริง

---

## ภาพรวม Pipeline เป้าหมาย

```
ตำราสุริยยาตร์ (YAML/KB)
      ↓ parse_yaml_kb.mjs
kb_yaml_import.json
      ↓ fill_yaml_conditions.html (Typhoon)
kb.json V2 (342 rules + conditions[])
      ↓ match_rules() — conditions-based
Matched rules (≤28)
      ↓ Typhoon / Fine-tuned model
Prediction text (grounded, provable)
      ↓ Validation layer (rule_id check)
Output ที่ตรวจสอบได้
      ↓ Log (input+output pairs)
Training dataset → Fine-tune Small LLM
```

---

## M0 — Multi-LLM Benchmark & Cross-validation
**เป้าหมาย:** หา LLM ที่ดีที่สุดสำหรับ wording layer, กัน hallucination ด้วย ensemble

### API ที่พร้อมใช้

| API | Model | ฟรี | Rate limit |
|---|---|---|---|
| **Typhoon** (ปัจจุบัน) | typhoon-v2-70b-instruct | ❌ | ตาม token |
| **Gemini Flash** | gemini-2.0-flash | ✅ | 1,500 req/วัน |
| **Groq + LLaMA** | llama-3.3-70b-versatile | ✅ | 14,400 req/วัน |
| **Chinda 4B** (iApp) | chinda-qwen3-4b | ✅ | Apache 2.0 |
| **Pathumma** (NECTEC) | - | ✅ | ต้องหา docs |
| **OpenThaiGPT** | 8B / 72B | ✅ | self-host |

⚠️ Chinda ใช้ header `"apikey:"` ไม่ใช่ `"Authorization: Bearer"`
⚠️ Gemini ใช้ body `"contents"` ไม่ใช่ `"messages"`

### ✅ Benchmark tool
ไฟล์: `m0_hallucination_test.html` (standalone HTML, ไม่ต้อง build)
- 31 ข้อจาก kb.json ground truth (ch02–ch10)
- Parallel fetch: Gemini Flash + Groq LLaMA 3.3 70B + iApp Chinda 4B
- Scoring: keyword overlap — ✅ ≥70% | ⚠️ 40–69% | ❌ <40%
- วัด latency avg per model + summary card
- iApp endpoint: `api.iapp.co.th/ai/v2/chat/completions` (header: `apikey`)

### Hallucination Test — 31 ข้อ (จาก KB ground truth)
ครอบคลุม: ch02 โคจร | ch03 ภพ | ch04 ดาวกุมลัคนา | ch06 คุณภาพดาว | ch07 ธาตุ | ch08 มิตร-ศัตรู | ch09 aspect % | ch10 กฎพิเศษ

### Cross-validation logic (Known Rules Benchmark)
```
known rules (conditions[] verified) → เป็น ground truth
LLM A + LLM B fill เหมือนกัน → เทียบกับ known rules → accuracy score
LLM ที่แม่นกว่าบน known → น่าเชื่อถือกว่าบน unknown rules
4/4 LLM เห็นด้วย → ~95% confidence
2/4 แตกต่าง → ส่ง human review
```

### 🔴 รอ user
- 🔴 รัน `m0_hallucination_test.html` ใส่ API keys → ดู accuracy per LLM
- 🔴 เลือก LLM ที่ score สูงสุดเป็น wording model หลัก (แทนหรือเสริม Typhoon)

### ✅ เสร็จแล้ว (Claude)
- ✅ ขยาย hallucination test 6 → 31 ข้อ จาก KB ground truth
- ✅ สร้าง `m0_hallucination_test.html` — tool ครบ: 3 LLMs + scoring + latency

---

## M1 — KB Foundation
**เป้าหมาย:** rules มี structured conditions[], match_rules() แม่น

### ✅ เสร็จแล้ว
- ✅ Audit kb.json — พบ 137 dead rules, 77 over-match, priority แค่ pr=1/2
- ✅ Audit Master Dictionary — tb_prediction_conditions มีแค่ 2/342 rows
- ✅ สร้าง `extract_conditions.html` — batch Typhoon แปลง tags_raw → structured conditions
- ✅ สร้าง `scripts/parse_yaml_kb.mjs` — แปลง YAML KB → `v3/kb_yaml_import.json`
  - output: 342 rules | TRUE_RULE:104, TRANSIT_RULE:49, CASE_STUDY:122, HOUSE_CONCEPT:50
- ✅ สร้าง `fill_yaml_conditions.html` — ให้ Typhoon เติม conditions[] 140 rules ที่ยังว่าง
- ✅ รัน fill_yaml_conditions.html → 114/140 rules ได้ conditions (2 batches error)
- ✅ Merge kb_yaml_filled → kb.json V2: 342 rules, **283/342 มี conditions (83%)**
- ✅ Deploy V3.2.7 — kb.json V2 ใน production แล้ว (backup/v3.2.7)

### 🔲 ต้องทำต่อ (Claude ทำได้)
- ⭐ 🔲 อัปเดต `match_rules()` ใน `v3/typhoon.js` — ใช้ conditions[] แทน tags_raw string matching
- ⭐ 🔲 retry fill 59 rules ที่ยังว่าง — รัน fill_yaml_conditions.html อีกรอบกับ merged JSON
- 🔲 เขียน `scripts/build_kb.mjs` — validate rules + export kb.json (format conditions[])
- 🔲 เพิ่ม priority pr=3,4,5 ใน kb.json — fine-grained ordering

**Definition of Done M1:**
- match_rules() ใช้ structured conditions 100%
- kb.json มี conditions[] ≥95% rules

---

## M2 — Clean Pipeline
**เป้าหมาย:** pipeline ส่งข้อมูลถูกต้อง ลด hallucination

### ✅ เสร็จแล้ว
- ✅ วิเคราะห์ chartSummary problem — describe_natal_payload() expose ดาวเกินจำเป็น

### 🔲 ต้องทำ (Claude ทำได้เลย ไม่รอ M1)
- ⭐ 🔲 แก้ `build_prompt()` ใน `v3/typhoon.js` — ตัด chartSummary เหลือแค่ lagna + overall.strength
- ⭐ 🔲 แก้ `v3Typhoon()` ใน `v3/v3tab.js` — เพิ่ม fallback อัตโนมัติเมื่อ API error
- 🔲 เพิ่ม `validate_inputs()` — pos[] NaN check, ascSign range 0-11 → **CIA T-05 / R-03** (defensive layer, CIA priority audit ก่อน)
- 🔲 เพิ่ม `validate_matched()` — filter rule.p ว่าง, MIN_MATCHED_RULES threshold → **CIA T-05** (รวม audit pipeline)

---

## M3 — Structured Output
**เป้าหมาย:** บังคับ Typhoon output เป็น JSON ตรวจสอบได้ anti-hallucination

### 🔲 ต้องทำ (Claude ทำได้เลย)
- ⭐ 🔲 แก้ prompt ใน `build_prompt()` — บังคับ output format:
  ```json
  {"predictions": [{"rule_id": 1009, "text": "..."}]}
  ```
- ⭐ 🔲 เพิ่ม validation — ตรวจ rule_id อยู่ใน matched rules หรือเปล่า → ตัดออก
- 🔲 fallback: ถ้า JSON parse fail → render_fallback() อัตโนมัติ

---

## M4 — Empirical Database (Julian Day)
**เป้าหมาย:** เก็บ real-world data เพื่อ discover secondary rules + พิสูจน์ premise

### แนวคิด
```
record = {
  jd        : Julian Day (index หลัก, timezone-free),
  lat/lng   : ตำแหน่ง,
  type      : "human" | "event",
  planets   : [p0..p9],   // calculated deterministic
  label     : event category,
  source    : "scrape" | "user" | "historical",
  confidence: 0.0–1.0
}
```

### Data Collection Priority
- **Tier 1** (signal แข็ง): นักการเมือง, นักกีฬา, บุคคลสำคัญ — Wikipedia verified
- **Tier 2**: เหตุการณ์ประวัติศาสตร์ไทย — date + lat/lng ชัดเจน
- **Tier 3**: user-contributed (opt-in)

### Secondary Rules (จาก data)
```
known rules → P(event | configuration) → empirical_p field ใน kb.json
ใช้เป็น weight ไม่ใช่ replace primary rules
```

### 🔲 ต้องทำ
- 🔲 ออกแบบ DB schema (IndexedDB local หรือ CF D1)
- 🔲 สร้าง public figures scraper tool (Wikipedia API)
- 🔴 logging ใน Worker → CF KV/D1 (รอ user setup)
- 🔴 สร้าง rating UI — 👍/👎 หลัง prediction
- 🔲 Export script: log → JSONL

---

## M5 — Evaluation Dataset
**เป้าหมาย:** วัดคุณภาพ model เชิงปริมาณ ก่อน/หลัง fine-tune

### 🔲 ต้องทำ
- 🔲 สร้าง eval set: ดวงสมมุติ 50 ดวง ครอบคลุม lagna 12 ราศี
- 🔲 แต่ละดวงมี "expected rules" จาก conditions verified
- 🔲 Metric: rule recall %, hallucination rate %, category coverage
- 🔲 เขียน eval runner script

---

## M6 — Fine-tune Small LLM
**เป้าหมาย:** model เฉพาะโหราศาสตร์ไทย ตอบถูกตามกฎ ไม่แต่งเอง

### Base Model ที่แนะนำ
**Qwen2.5-3B-Instruct** (HuggingFace: Qwen/Qwen2.5-3B-Instruct)
- ขนาดเล็ก รันได้บน CPU, ฟรี Apache 2.0, รองรับไทยดี

### Training Data
- 2,000–5,000 คู่: `input = chart + matched_rules` → `output = grounded prose`
- สร้างด้วย Typhoon + Gemini cross-validate กัน
- **สำคัญ:** output ต้องมี rule_id reference — provable ไม่ใช่ free-form

### Fine-tune Method
- LoRA / QLoRA (~1% parameters) บน Google Colab T4 (ฟรี)
- เครื่องมือ: unsloth + trl + transformers
- ค่าใช้จ่าย: ~$5–15 สำหรับ data generation

### ลำดับ
```
M3 (structured output) → M1 (conditions ครบ) → M2 (clean pipeline)
→ M4 (สะสม data) → M0 (เลือก LLM ดีสุด)
→ M6A RAG (ง่ายกว่า ทำก่อน)
→ M6B Fine-tune (เมื่อ data ≥500 pairs)
```

---

## M7 — Empirical Validation Pipeline
**เป้าหมาย:** เชื่อม KB rules กับข้อมูลบุคคลจริง → วัดค่า empirical_p ต่อ rule

### แนวคิด (เพิ่มเติมจาก M4)
```
Julian Day DB (บุคคลสำคัญ) → คำนวณ planets[] → match_rules()
→ ตรวจว่า event_label ตรงกับ rule.p หรือไม่
→ นับ hit/miss → empirical_p = hits / (hits + miss)
→ เก็บลง rule.empirical_p ใน kb.json
```

### Schema (เพิ่มใน kb.json V2.2.0)
```json
{
  "empirical_p":    0.73,     // P(trait | config) — null ถ้าไม่มีข้อมูล
  "empirical_n":    47,       // sample size
  "empirical_refs": ["JD:2451545.0", "JD:2449500.3"],  // JD ที่ verify แล้ว
  "secondary_obs":  ["มักเป็นผู้นำองค์กร", "ชอบงานด้านการเมือง"]
}
```

### ✅ เสร็จแล้ว (V3.3.0)
- ✅ เพิ่ม `_empirical_schema` documentation ใน kb.json root
- ✅ เพิ่ม empirical fields (null placeholder) ใน 2 sample TRUE_RULEs (rules[9], rules[10])
- ✅ สร้าง `scripts/gen_rule_skeletons.mjs` — พบ 90 missing planet×quality combinations

### 🔲 ต้องทำต่อ
- 🔲 สร้าง Wikipedia scraper tool → Julian Day DB
- 🔲 สร้าง empirical_validator.html — match persons → rules → count hit/miss
- 🔴 CF KV/D1 storage สำหรับ empirical DB (รอ user setup)

---

## M8 — Keyword Composition Engine
**เป้าหมาย:** สร้าง prediction จาก KB keywords โดยตรง ไม่ใช้ LLM — 100% anti-hallucination

### แนวคิด
```
matched_rules → extract keywords จาก rule.p (deterministic)
→ classify polarity (+/-/~) จาก t[] tags + conditions[]
→ compose structured prediction
→ render โดยไม่ต้องเรียก Typhoon
```

### ✅ เสร็จแล้ว (V3.3.0)
- ✅ `compose_local_prediction(matched_rules)` ใน `v3/interpretation.js`
  - extract keywords จาก rule.p (split Thai phrases)
  - classify polarity จาก t[]/conditions[]
  - คืน `[{rule_id, text, keywords, polarity, chapter, source:'local'}]`
- ✅ `compose_summary_text(predictions)` 
  - combine positive + negative keywords
  - คืน Thai summary text (deterministic)

### 🔲 ต้องทำต่อ
- 🔲 เชื่อม `compose_local_prediction()` กับ v3tab.js — ใช้แทน Typhoon fallback
- 🔲 เพิ่ม keyword expansion: synonym map สำหรับ Thai astrology terms
- 🔲 เพิ่ม house context: กำหนด theme ของแต่ละภพ (H1=ตัวตน, H2=การเงิน, ...)

---

## Priority รวม (อัปเดต V3.3.0)

| ลำดับ | Mission | ใครทำ | Blocked? | Status |
|---|---|---|---|---|
| 1 | M0: Multi-LLM benchmark tool | User (browser) | ไม่ | ✅ V3.2.9 |
| 2 | M1: match_rules() ใช้ conditions[] | Claude | ไม่ | ✅ V3.2.9 |
| 3 | M2: build_prompt() trim + fallback | Claude | ไม่ | ✅ V3.2.9 |
| 4 | M3: Structured JSON output + validation | Claude | ไม่ | ✅ V3.2.9 |
| 5 | M8: Keyword composition engine | Claude | ไม่ | ✅ V3.3.0 |
| 6 | M7: Empirical schema + skeleton generator | Claude | ไม่ | ✅ V3.3.0 |
| 7 | M0: รัน benchmark + เลือก best LLM | User (browser) | ไม่ | 🔲 |
| 8 | M1: retry fill 59 rules ว่าง | User (browser) | ไม่ | 🔲 |
| 9 | M8: เชื่อม compose_local_prediction → v3tab | Claude | ไม่ | 🔲 |
| 10 | M7: Wikipedia scraper → Julian Day DB | Claude | ไม่ | 🔲 |
| 11 | M4: CF KV/D1 empirical DB storage | User + Claude | รอ CF setup | 🔴 |
| 12 | M5: Eval dataset | Claude + Expert | รอ domain expert | 🔴 |
| 13 | M6: Fine-tune Qwen2.5-3B | User + Claude | รอ data | 🔴 |

---

## ทรัพยากร

| Mission | ต้องการ | มีแล้ว |
|---|---|---|
| M0 | Gemini/Groq API keys | ✅ (Gemini quota reset ทุกวัน) |
| M1 | browser (fill retry) | ✅ |
| M2, M3 | code เท่านั้น | ✅ done |
| M7 | Wikipedia API + CF D1 | 🔲 CF setup |
| M8 | code เท่านั้น | ✅ done |
| M4 | CF KV/D1 | ❌ user setup |
| M5 | domain expert | ❌ |
| M6 | Google Colab + 500 pairs | ❌ |

---

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `fill_yaml_conditions.html` | Typhoon เติม conditions[] ใน kb_yaml_import.json |
| `extract_conditions.html` | Typhoon แปลง master dictionary tags → conditions CSV |
| `dictionary_builder_v3.html` | Build/edit rules + Import AI + Export kb.json |
| `scripts/parse_yaml_kb.mjs` | แปลง YAML KB → kb_yaml_import.json |
| `scripts/gen_rule_skeletons.mjs` | สร้าง skeleton rules สำหรับ missing combinations (M7) |
| `v3/kb.json` | V2.2.0 — 342 rules, 284 มี conditions + empirical schema |
| `v3/kb_skeletons.json` | 90 skeleton rules (planet×quality missing) — รอ expert กรอก |
| `v3/kb_yaml_import.json` | output จาก parse_yaml_kb.mjs (342 rules) |
| `v3/typhoon.js` | match_rules(), build_prompt(), send_to_typhoon() |
| `v3/interpretation.js` | pipeline functions + compose_local_prediction() (M8) |
| `v3/v3tab.js` | v3Typhoon(), v3Local() |
| `m0_hallucination_test.html` | Multi-LLM benchmark: Groq + Gemini + Typhoon CF (M0) |
| `m0_latency_ping.html` | Latency decomposition: TTFB + decode + Mode B prefill-only (M0) |
| `MISSION_FINETUNE.md` | ไฟล์นี้ |
| `CHANGELOG.md` | ประวัติ version |
