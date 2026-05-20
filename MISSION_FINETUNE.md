# Horatad — Mission: Thai Astrology LLM Fine-tune
# ภาษา: ไทย + Eng technical term
# กฎ: ✅ = เสร็จแล้ว (ไม่ลบ) | 🔲 = ต้องทำ | 🔴 = blocked/รอ user | ⭐ = priority สูง
# อัปเดตไฟล์นี้ทุกครั้งที่มี mission ใหม่หรือเสร็จ task

---

## ภาพรวม Pipeline เป้าหมาย

```
Excel (human KB)
      ↓ build_kb.mjs
kb.json (structured conditions[])
      ↓ match_rules() — conditions-based
Matched rules (≤28)
      ↓ Typhoon / Fine-tuned model
Prediction text (structured JSON)
      ↓ Validation layer (rule_id check)
Output ที่ตรวจสอบได้
      ↓ Log (input+output pairs)
Training dataset → Fine-tune
```

---

## M1 — KB Foundation
**เป้าหมาย:** rules มี structured conditions[], match_rules() แม่น

### ✅ เสร็จแล้ว
- ✅ Audit kb.json — พบ 137 dead rules, 77 over-match, priority แค่ pr=1/2
- ✅ Audit Master Dictionary — tb_prediction_conditions มีแค่ 2/342 rows, category 46% ว่าง
- ✅ สร้าง `extract_conditions.html` — batch Typhoon แปลง tags_raw → structured conditions (342 master rules)
- ✅ สร้าง `scripts/parse_yaml_kb.mjs` — แปลง suriyart_knowledge_base.yaml → `v3/kb_yaml_import.json`
  - output: 342 rules | TRUE_RULE:104, TRANSIT_RULE:49, CASE_STUDY:122, HOUSE_CONCEPT:50
  - 59% มี conditions จาก regex parser | 41% (140 rules) ยังว่าง
- ✅ เพิ่มปุ่ม "📥 Import AI" + "⬇ kb.json" ใน `dictionary_builder_v3.html`
- ✅ สร้าง `fill_yaml_conditions.html` — ให้ Typhoon เติม conditions[] 140 rules ที่ยังว่าง
  - รับ file input kb_yaml_import.json, กรองประเภท, batch 5/8/12, download merged JSON

### 🔴 รอ user (ต้องทำบน browser)
- 🔴 merge branch `claude/review-typhoon-api-T0n0e` → main (เพื่อ GitHub Pages deploy)
- 🔴 เปิด `horatad.github.io/fill_yaml_conditions.html` → โหลด `v3/kb_yaml_import.json` → รัน Fill
- 🔴 Download `kb_yaml_filled_*.json` → human review rules ที่ Typhoon เติม
- 🔴 (ทางเลือก) เปิด `horatad.github.io/extract_conditions.html` → รัน 342 master rules → download CSV → review
- 🔴 import `kb_yaml_filled_*.json` เข้า `dictionary_builder_v3.html` → export kb.json ใหม่

### 🔲 ต้องทำต่อ (Claude ทำได้หลัง user ส่งไฟล์)
- ⭐ 🔲 เขียน `scripts/build_kb.mjs` — อ่าน xlsx → validate → export kb.json (format conditions[])
  - validate: rule.p ว่าง → error | planet ผิด enum → error
- ⭐ 🔲 อัปเดต `match_rules()` ใน `v3/typhoon.js` — ใช้ conditions[] แทน tags_raw string matching
- 🔲 เพิ่ม category_tag ให้ครบ 156 rules ที่ยังว่างใน master dictionary
- 🔲 เพิ่ม priority pr=3,4,5 ใน kb.json — fine-grained ordering (ทำหลัง conditions ครบ)

**Definition of Done M1:**
- build_kb.mjs รันไม่มี error/warning
- match_rules() ใช้ structured conditions 100%
- kb.json มี conditions[] ทุก rule

---

## M2 — Clean Pipeline
**เป้าหมาย:** pipeline ส่งข้อมูลถูกต้อง ลด hallucination

### ✅ เสร็จแล้ว
- ✅ วิเคราะห์ chartSummary problem — describe_natal_payload() expose ดาวเกินจำเป็น → hallucination surface

### 🔲 ต้องทำ (Claude ทำได้เลย ไม่รอ M1)
- ⭐ 🔲 แก้ `build_prompt()` ใน `v3/typhoon.js` — ตัด chartSummary เหลือแค่ lagna + overall.strength
- ⭐ 🔲 แก้ `v3Typhoon()` ใน `v3/v3tab.js` — เพิ่ม fallback อัตโนมัติเมื่อ API error (render_fallback แทน toast)
- 🔲 เพิ่ม `validate_inputs()` — pos[] NaN check, ascSign range 0-11, kbRules empty
- 🔲 เพิ่ม `validate_matched()` — filter rule.p ว่าง, MIN_MATCHED_RULES threshold

**Definition of Done M2:**
- ส่ง pos[] ผิดปกติ → error message ชัดเจน ไม่ crash
- Typhoon error → แสดงกฎดิบอัตโนมัติ ไม่ใช่แค่ toast
- matched rules ไม่มี rule.p ว่างเลย

---

## M3 — Structured Output (Phase 5C — ทำได้เลย)
**เป้าหมาย:** บังคับ Typhoon output เป็น JSON ตรวจสอบได้ anti-hallucination

### 🔲 ต้องทำ (Claude ทำได้เลย)
- ⭐ 🔲 แก้ prompt ใน `build_prompt()` — บังคับ output format:
  ```json
  {"predictions": [{"rule_id": 1009, "text": "..."}]}
  ```
- ⭐ 🔲 เพิ่ม validation หลัง Typhoon ตอบ — ตรวจ rule_id อยู่ใน matched rules หรือเปล่า → ตัดออก
- 🔲 fallback: ถ้า JSON parse fail → render_fallback() อัตโนมัติ

**Definition of Done M3:**
- Typhoon ไม่สามารถอ้าง rule_id ที่ไม่อยู่ใน matched rules ได้
- hallucination rate วัดได้เชิงปริมาณ (rule_id นอก set = 0%)

---

## M4 — Logging & Dataset Collection
**เป้าหมาย:** สะสม training pairs สำหรับ fine-tune

### 🔲 ต้องทำ
- 🔲 ออกแบบ log schema (natal_hash, lagna, matched_rule_ids, output, rating)
- 🔴 เพิ่ม logging ใน Worker → Cloudflare KV หรือ D1 (รอ user setup CF)
- 🔴 สร้าง rating UI ใน app — 👍/👎 หลัง prediction
- 🔲 Export script: log → JSONL (HuggingFace format)

**Blocked by:** Cloudflare KV/D1 setup (user action)
**Definition of Done:** ≥200 rated entries, export JSONL ได้

---

## M5 — Evaluation Dataset
**เป้าหมาย:** วัดคุณภาพ model เชิงปริมาณ

### 🔲 ต้องทำ
- 🔲 สร้าง eval set: ดวงสมมุติ 50 ดวง ครอบคลุม lagna 12 ราศี
- 🔲 แต่ละดวงมี "expected rules" จาก conditions verified
- 🔲 Metric: rule recall %, hallucination rate %, category coverage
- 🔲 เขียน eval runner script

**Blocked by:** domain expert verify expected rules
**Definition of Done:** baseline score บันทึกก่อน fine-tune, eval รัน automated

---

## M6 — Fine-tune
**เป้าหมาย:** model ตอบถูกตามกฎ ไม่แต่งเอง

### 🔲 ต้องทำ (รอ M4+M5)
- **Option A — RAG** (ง่ายกว่า, ทำได้เร็ว, เหมาะ rules <1000)
  - 🔲 Embed kb.json rules เป็น vector (sentence-transformers Thai)
  - 🔴 ต้องการ vector DB (Cloudflare Vectorize หรือ local)
- **Option B — Fine-tune Typhoon** (แน่นกว่า, ยากกว่า)
  - 🔴 ต้องการ ≥500 verified pairs + GPU (RunPod/Colab Pro)
- **Option C — Structured Output** ← ทำได้เลยใน M3 แล้ว

**แนะนำ:** M3 (ทำได้เลย) → M1 → M2 → A (ระหว่างสะสม data) → B เมื่อ data พอ

---

## ลำดับ Priority รวม

| ลำดับ | Mission | ใครทำ | Blocked? |
|---|---|---|---|
| 1 | M2: แก้ build_prompt() + v3Typhoon() fallback | Claude | ไม่ |
| 2 | M3: Structured JSON output + validation | Claude | ไม่ |
| 3 | M1: merge branch + รัน fill_yaml_conditions.html | User | ต้องใช้ browser |
| 4 | M1: build_kb.mjs + update match_rules() | Claude | รอไฟล์จาก user |
| 5 | M4: Logging schema + export script | Claude | รอ CF setup |
| 6 | M5: Eval dataset | Claude + Expert | รอ domain expert |
| 7 | M6: RAG / Fine-tune | User + Claude | รอ data + infra |

---

## ทรัพยากร

| Mission | ต้องการ | มีแล้ว |
|---|---|---|
| M1 | xlsx, Node.js, browser (horatad.github.io) | ✅ |
| M2 | code เท่านั้น | ✅ |
| M3 | code เท่านั้น | ✅ |
| M4 | Cloudflare KV/D1 | ❌ user setup |
| M5 | domain expert (astrology) | ❌ |
| M6A | vector DB | ❌ |
| M6B | GPU + 500 pairs | ❌ |

---

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | หน้าที่ |
|---|---|
| `extract_conditions.html` | Typhoon แปลง master dictionary tags → conditions CSV |
| `fill_yaml_conditions.html` | Typhoon เติม conditions[] ใน kb_yaml_import.json |
| `dictionary_builder_v3.html` | Build/edit rules + Import AI + Export kb.json |
| `scripts/parse_yaml_kb.mjs` | แปลง YAML KB → kb_yaml_import.json |
| `scripts/build_kb.mjs` | 🔲 ยังไม่เขียน — xlsx → kb.json pipeline |
| `v3/kb_yaml_import.json` | output จาก parse_yaml_kb.mjs (342 rules) |
| `v3/typhoon.js` | match_rules(), build_prompt(), send_to_typhoon() |
| `v3/v3tab.js` | v3Typhoon(), v3Local() |
| `MISSION_FINETUNE.md` | ไฟล์นี้ — อัปเดตทุก mission |
