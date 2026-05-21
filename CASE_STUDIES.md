# CASE STUDIES — Horatad Ecosystem
# Format: CS<NNN> — <title> | <PROJECT> | <YYYYMMDD>
# PROJECT: HORATAD / BIBLE / JULIAN
# กฎ: Plan → Do → Check → Act ("Write what you will do, do what you write")

---

## CS001 — Multi-LLM Benchmark | BIBLE | 2026-05-21

### PLAN
สร้าง benchmark tool เพื่อ:
1. วัดความแม่นยำ (hallucination rate) ของ Gemini, Groq, iApp กับ Thai astrology KB
2. วัด latency decomposition: systematic / prefill / decode แยกจากกัน
3. เลือก LLM ที่ดีที่สุดสำหรับ wording layer

### DO
- สร้าง `m0_hallucination_test.html`: 31 ข้อจาก kb.json ground truth, parallel fetch 3 LLMs
- แก้ Gemini 429 (rate limit): delay default 5000ms + countdown
- แก้ iApp CORS: เปลี่ยนเป็น Typhoon CF Worker (มี CORS headers แล้ว)
- สร้าง `m0_latency_ping.html`: Mode B (max_tokens=1 = prefill-only) + Mode C (streaming SSE)
- เพิ่ม `testGeminiKey()`: แยก key valid vs quota exhausted
- localStorage key persistence (ไม่ commit secret ลง repo)

### CHECK
**ค้นพบสำคัญ:** LLMs ได้คะแนน 0% บนศัพท์โหราศาสตร์ไทยโบราณ (เสริด/พักร/มนท์)
- ศัพท์เฉพาะเหล่านี้ไม่มีใน training data → LLM ไม่รู้จัก → hallucinate ทั้งหมด
- **ข้อสรุป:** LLM ไม่สามารถเป็น knowledge source ได้ — ต้องเป็น wording layer เท่านั้น
- KB-first architecture ถูกต้อง: engine + KB → matched rules → LLM craft wording เท่านั้น

ปัญหาที่แก้ไม่ได้ใน session:
- Gemini quota (1,500 RPD ฟรี) หมดเร็ว — ต้องวางแผนการใช้
- Typhoon CF ไม่รองรับ streaming → decode metric ไม่ได้

### ACT
1. ✅ ยืนยัน KB-first architecture — ไม่เปลี่ยนทิศทาง
2. ✅ เพิ่ม M8 keyword composition engine (deterministic, no LLM) เป็น priority สูง
3. ✅ เพิ่ม M7 empirical validation pipeline (Julian Day → empirical_p)
4. 🔲 รอ user รัน benchmark และเลือก LLM จาก Groq score (Gemini quota หมด)

---

## CS002 — Keyword Composition Engine + Empirical Schema | BIBLE + JULIAN | 2026-05-21

### PLAN
จาก lesson learned ของ CS001:
1. `compose_local_prediction()` — deterministic prediction จาก KB keywords, ไม่ต้องเรียก LLM
2. empirical schema (`empirical_p`, `empirical_n`, `empirical_refs`, `secondary_obs`) ใน kb.json
3. `scripts/gen_rule_skeletons.mjs` — ระบุ missing planet×quality combinations

### DO
- เพิ่ม `compose_local_prediction()` + `compose_summary_text()` ใน `v3/interpretation.js`
  - extract keywords จาก `rule.p` (split Thai phrases)
  - classify polarity จาก `t[]` tags + `conditions[]`
  - compose summary text: positive traits + connector + negative traits
- เพิ่ม `_empirical_schema` field ใน kb.json root (V2.2.0)
- เพิ่ม `empirical_p/n/refs/secondary_obs` ใน 2 sample TRUE_RULEs (null placeholder)
- สร้าง `scripts/gen_rule_skeletons.mjs` → `v3/kb_skeletons.json`
- Version bump V3.2.9 → V3.3.0

### CHECK
- `compose_local_prediction()` ทำงานได้ — structured array พร้อม rule_id, text, keywords, polarity
- `gen_rule_skeletons.mjs` พบ 90 missing combinations (ศุกร์ขาด 6, อาทิตย์/อังคาร/มฤตยู ขาด 10)
- empirical schema อยู่ใน kb.json — รอ data มาเติม

ข้อสังเกต:
- `compose_local_prediction()` ยังไม่ได้ wire เข้า v3tab.js
- 90 skeletons = โอกาสเพิ่ม KB coverage อีก 26% ถ้า expert กรอก text
- polarity classification ง่ายไป — บางกฎ neutral แต่ไม่มี tag → classify เป็น ~

### ACT
1. 🔲 Wire `compose_local_prediction()` → v3tab.js เป็น enhanced fallback
2. 🔲 User รัน benchmark ใน `m0_hallucination_test.html` ดู Groq score
3. 🔲 Expert review `v3/kb_skeletons.json` — กรอก p field priority rules ก่อน
4. 🔲 Build Wikipedia scraper สำหรับ Julian Day DB (Phase 2 of M7)

---

## CS003 — Project Structure Reorganization | HORATAD | 2026-05-21

### PLAN
Session handoff ปะปนกันหลายโครงการ — user แยกไม่ออกว่าแต่ละโครงการถึงไหน

### DO
- ตั้งชื่อโครงการ: **HORATAD** / **BIBLE** / **JULIAN**
- สร้าง `PROJECT_STATUS.md` — master dashboard 1 หน้า, อัปเดตทุก session
- สร้าง `handoffs/` directory — pattern: `handoffs/<PROJECT>_<YYYYMMDD>_v<n>.md`
- สร้าง `CASE_STUDIES.md` — แยก case studies ออกจาก manual
- อัปเดต `CLAUDE.md` — เพิ่ม project structure section

### CHECK
- Claude อ่าน PROJECT_STATUS.md ก่อนทำงาน → รู้ context ทันที ไม่ต้องไล่ handoff
- handoffs/ แยก per-project → ไม่ปะปน
- CASE_STUDIES.md scale ได้ถึง ~20 cases ก่อนจะต้องทำ directory

### ACT
- 🔲 ทุก session ถัดไป: สร้าง handoff ใน `handoffs/<PROJECT>_<date>.md`
- 🔲 อัปเดต `PROJECT_STATUS.md` ทุก session close
- 🔲 เพิ่ม case study ใน `CASE_STUDIES.md` เมื่อมี experiment ใหม่
