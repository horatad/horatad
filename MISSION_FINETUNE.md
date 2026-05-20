# Horatad — Mission: Thai Astrology LLM Fine-tune
# เป้าหมาย: พัฒนา LLM เฉพาะโหราศาสตร์สุริยยาตร์ไทย + anti-hallucination pipeline
# อัปเดตทุก phase ที่สำเร็จ

---

## ภาพรวม Pipeline เป้าหมาย

```
Excel (human KB)
      ↓ build_kb.mjs
kb.json (structured conditions)
      ↓ match_rules()
Matched rules (≤28)
      ↓ Typhoon / Fine-tuned model
Prediction text
      ↓ Validation layer
Output ที่ตรวจสอบได้
      ↓ Log (input+output pairs)
Training dataset → Fine-tune
```

---

## Phase 1 — KB Foundation 🔲 ยังไม่เริ่ม

**เป้าหมาย:** rules ชัดเจน เครื่องอ่านได้แม่น

- [ ] รัน extract_conditions.html → ได้ conditions_extracted.csv
- [ ] Human review CSV (ตรวจ quality/aspect ที่ Typhoon อาจผิด)
- [ ] Import ลง tb_prediction_conditions ใน Excel
- [ ] เขียน `scripts/build_kb.mjs`
      - อ่าน xlsx → validate → export kb.json (format ใหม่ มี conditions[])
      - validate rules: p ว่าง → error, planet ผิด enum → error
- [ ] อัปเดต match_rules() ใช้ conditions[] แทน tags_raw string matching
- [ ] เพิ่ม category_tag ให้ครบ 156 rules ที่ว่าง

**Definition of Done:**
- build_kb.mjs รันแล้วไม่มี error/warning
- match_rules() ใช้ structured conditions 100%
- kb.json มี conditions[] ทุก rule

**Data needed:** ไม่มี — ใช้ xlsx ที่มีอยู่

---

## Phase 2 — Clean Pipeline 🔲 ยังไม่เริ่ม

**เป้าหมาย:** pipeline ส่งข้อมูลถูกต้อง ลด hallucination

- [ ] แก้ build_prompt() — ตัด chartSummary เหลือแค่ lagna + overall.strength
- [ ] เพิ่ม validate_inputs() — pos[] NaN, ascSign range, kbRules empty
- [ ] เพิ่ว validate_matched() — filter rule.p ว่าง, MIN_MATCHED_RULES threshold
- [ ] แก้ v3Typhoon() — fallback อัตโนมัติเมื่อ API error (render_fallback)
- [ ] เพิ่ม priority pr=3,4,5 ใน kb.json — fine-grained ordering

**Definition of Done:**
- ส่ง pos[] ผิดปกติ → error message ชัดเจน ไม่ crash
- Typhoon error → แสดงกฎดิบอัตโนมัติ ไม่ใช่แค่ toast
- matched rules ไม่มี rule.p ว่างเลย

**Data needed:** ไม่มี

---

## Phase 3 — Logging & Dataset Collection 🔲 ยังไม่เริ่ม

**เป้าหมาย:** สะสม training pairs สำหรับ fine-tune

- [ ] ออกแบบ log schema:
      ```json
      {
        "ts": "ISO timestamp",
        "natal_hash": "sha256 ของ pos[] (ไม่เก็บข้อมูลส่วนตัว)",
        "lagna": "มังกร",
        "matched_rule_ids": [1009, 1023, ...],
        "prompt_tokens": 420,
        "output": "ข้อความพยากรณ์...",
        "output_tokens": 180,
        "fallback": false,
        "rating": null
      }
      ```
- [ ] เพิ่ม logging ใน Worker (Cloudflare KV หรือ D1)
- [ ] สร้าง rating UI เล็กๆ ใน app (👍/👎 หลัง prediction)
- [ ] Export script: log → JSONL (HuggingFace format)

**Definition of Done:**
- ทุก Typhoon call มี log entry
- มี rating อย่างน้อย 200 entries
- Export ได้เป็น JSONL

**Data needed:** Cloudflare KV หรือ D1 (user setup)

---

## Phase 4 — Evaluation Dataset 🔲 ยังไม่เริ่ม

**เป้าหมาย:** วัดคุณภาพ model ได้เชิงปริมาณ

- [ ] สร้าง eval set: ดวงสมมุติ 50 ดวง (ครอบคลุม lagna ทุก 12 ราศี)
- [ ] แต่ละดวงมี "expected rules" ที่ควร match (จาก conditions ที่ verified แล้ว)
- [ ] Metric:
      - Rule recall: matched ถูกกี่ % จาก expected
      - Hallucination rate: output มีข้อความที่ไม่มาจาก rules กี่ %
      - Coverage: category ที่ครอบคลุมต่อดวง
- [ ] สร้าง eval runner script

**Definition of Done:**
- baseline score ก่อน fine-tune บันทึกไว้
- eval รันได้ automated

**Data needed:** ต้องการ domain expert verify expected rules

---

## Phase 5 — Fine-tune 🔲 รอ Phase 3-4

**เป้าหมาย:** model ที่ตอบถูกต้องตามกฎ ไม่แต่งเอง

**Option A — RAG (ง่ายกว่า, ทำได้เร็ว)**
- Embed kb.json rules เป็น vector (sentence-transformers Thai)
- ตอนถาม: embed natal summary → retrieve top-k rules → prompt Typhoon
- ไม่ต้อง train model ใหม่
- เหมาะถ้า rules น้อย (<1000)

**Option B — Fine-tune Typhoon (แน่นกว่า, ยากกว่า)**
- Dataset: (natal_summary + rules) → prediction_text
- Format: instruction tuning (system + user + assistant)
- Base model: typhoon-v2.5 หรือ llama3-thai
- Platform: RunPod / vast.ai / Colab Pro
- ต้องการ: ≥500 verified pairs

**Option C — Prompt Engineering + Structured Output (ทำได้เลย)**
- บังคับ output format เป็น JSON
  ```json
  {"predictions": [{"rule_id": 1009, "text": "..."}]}
  ```
- ตรวจ rule_id ว่าอยู่ใน matched rules หรือเปล่า
- ถ้าไม่อยู่ → ตัดออก อัตโนมัติ

**แนะนำ:** ทำ C ก่อน (ทำได้เลย) → A ระหว่างสะสม data → B เมื่อมี data พอ

**Data needed:**
- Option A: kb.json ครบ + vector DB (Cloudflare Vectorize หรือ local)
- Option B: ≥500 training pairs + GPU
- Option C: ไม่มี — แค่เปลี่ยน prompt format

---

## ทรัพยากรที่ต้องการทั้งหมด

| Phase | สิ่งที่ต้องการ | มีแล้ว |
|-------|--------------|--------|
| 1 | xlsx ครบ, Node.js | ✅ |
| 2 | code เท่านั้น | ✅ |
| 3 | Cloudflare KV/D1 | ❌ user setup |
| 4 | domain expert (astrology) | ❌ |
| 5A | vector DB | ❌ |
| 5B | GPU + 500 pairs | ❌ |
| 5C | ไม่มี | ✅ |

---

## สถานะปัจจุบัน

```
Phase 1: ⬜ extract_conditions.html พร้อมใช้ — รอ user รัน + review
Phase 2: ⬜ รอ Phase 1 เสร็จก่อน (threshold ขึ้นกับ KB quality)
Phase 3: ⬜ ออกแบบ schema แล้ว — รอ CF setup
Phase 4: ⬜ ยังไม่เริ่ม
Phase 5: ⬜ Option C ทำได้เลย — รอ user ตัดสินใจ
```

---

## หมายเหตุ horatad.com

- horatad.com ยังไม่มี V3 prediction feature
- KB พัฒนาอิสระได้ — ไม่กระทบ production
- เมื่อ Phase 1-2 เสร็จ → deploy V3 ที่ horatad.com ได้เลย
