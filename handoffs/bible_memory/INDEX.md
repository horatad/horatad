# BIBLE Memory — INDEX
# อ่านไฟล์นี้ก่อนทุก BIBLE session (แทน BIBLE_memory.md เดิม)
# Last updated: 2026-05-26

═══════════════════════════════════════════════════════════════════════
🔴🔴🔴 FOUNDATIONAL RULE #1 — อ่านก่อนทุกอย่าง 🔴🔴🔴
═══════════════════════════════════════════════════════════════════════

  พื้นดวง (natal) = 80% ของคำพยากรณ์ทั้งหมด
  ดวงจร (transit) = stimulator เท่านั้น — activate สิ่งที่ natal บอกไว้แล้ว
  ดวงจรไม่สร้างผลที่ natal ไม่มี

  ⇒ ก่อนเขียน wording / extract rule / score POC / implement engine
     ใดๆ ก็ตาม — RESOLVE NATAL BASE ก่อนเสมอ
  ⇒ TRANSIT_NATAL rule ที่ไม่มี natal precondition = invalid

═══════════════════════════════════════════════════════════════════════

(Detail + engine flow + validation rules + evidence — ใน PINNED v3 ด้านล่าง
 หรือ LOG.md section "2026-05-26T00:00")

---

## 🔴 PINNED v3 (2026-05-26) — INTERPRETATION PRINCIPLE (apply BEFORE any prediction logic)

**ใช้ก่อนคิดเรื่อง wording/extraction/scoring/engine ใดๆ:**

- **พื้นดวง (natal) = 80%** ของการพยากรณ์ทั้งหมด
- **ดวงจร (transit) = stimulator** เท่านั้น — activate สิ่งที่ natal บอกไว้แล้ว
- **ดวงจรไม่สร้างผลที่ natal ไม่มี** — ถ้า natal ไม่บอก → transit ทำให้เกิดไม่ได้
- **TRANSIT_NATAL rule alone = ไร้ความหมาย** — ต้อง pair กับ natal anchor เสมอ

**Engine flow ที่ถูก:**
```
Step 1: natal base interpretation (80%)
   → ลัคนา + ตนุเศษ + ตนุลัคน์ + กุมลัคนา + special_configs ใน natal
   → identify possibility space (สิ่งที่ "บอกไว้แล้ว")
Step 2: transit overlay (20% — timing + intensity)
   → activate which natal possibilities ขณะนี้
   → duration จาก transit speed
Step 3: NEVER predict outcome ที่ไม่อยู่ใน natal possibility space
```

**Validation rule:** TRANSIT_NATAL rule ต้องมี natal precondition explicit (lagna/planet position). ถ้าไม่มี → review เป็น principle, not rule.

**Evidence:** R289 (4 ดาวจรร้าย + ดวงเข้มแข็ง → ไม่ถึงฆาต) = direct proof ของหลักนี้

**ดู LOG.md "2026-05-26T00:00" สำหรับ POC scoring revision + KB validation checklist**

---

## 📌 MUST READ FIRST — BIBLE Architecture (2026-05-25, current = v2 TRIANGULATION)

**Mission:** BIBLE = preserve essence ของธรรมเนียมสุริยยาตร์ + ให้ traceable provenance + ทำให้ user verify ง่าย

**Latest architecture decision:** **TRIANGULATION** (LOG entry "2026-05-25 — 📌 PINNED v2")
- Ground truth = ธรรมเนียม (ไม่ใช่ 100CH verbatim เท่านั้น)
- KB = merge from 100CH + LLMs + user input — by **element fingerprint**
- 3 verification states: AUTO_VERIFIED (≥2 sources agree) / CONFLICT / UNIQUE
- User reviews only CONFLICT + UNIQUE ไม่ใช่ทุก rule

**ก่อนทำงาน BIBLE ใดๆ:**
1. อ่าน `LOG.md` **section PINNED v2 (2026-05-25)** เป็นอันดับแรก — มี framing + schema + procedure ครบ
2. ถ้าทำงาน extraction → อ่าน LOG ทุก section + master_dict + chapter_texts.json
3. ถ้าทำงาน merge/schema → focus ที่ PINNED v2 + kb_*.json ปัจจุบัน
4. ทุก rule ใหม่ใส่ `elements.fingerprint` + `wordings[]` array + `source_type` + `verification_status`
5. **ห้าม fallback ไป v1 framing** (strict 100CH verbatim) — superseded by v2

**Source types ปัจจุบัน:** IN_BOOK / IN_TRADITION / FROM_LLM / LLM_COMBINED / USER_INPUT / NEEDS_REVIEW

---

## ไฟล์ย่อย

| ไฟล์ | เนื้อหา | Type | อ่านเมื่อ |
|---|---|---|---|
| [PLANETS.md](PLANETS.md) | ดาว 10 ดวง, aliases, คู่ดาว, ความเร็ว | Reference | extract / Q&A ดาว |
| [SIGNS.md](SIGNS.md) | ราศี 12, อุจ/นิจ/มหาจักร positions | Reference | extract / Q&A ราศี |
| [HOUSES.md](HOUSES.md) | ภพ 12, aspects, priority, disambiguation | Reference | extract / Q&A ภพ |
| [QUALITY.md](QUALITY.md) | คุณภาพดาว, กฎลบ-ลบ=บวก, อุจ vs มหาจักร | Reference | extract / Q&A |
| [SYNTAX.md](SYNTAX.md) | extraction logic, rule types, polarity | Reference | extraction session |
| [TAXONOMY.md](TAXONOMY.md) | rule JSON schema spec สำหรับ LLM (Typhoon/Groq/Claude) | Reference | extraction session |
| [VOCAB.md](VOCAB.md) | compound words, key concepts, domain keywords | Reference | extraction session |
| [CHAPTERS.md](CHAPTERS.md) | chapter map, extraction progress | Editable | check progress |
| [PROMPTS.md](PROMPTS.md) | extraction prompt templates (Template 1-4), QC checklist, tuning log | Reference | extraction session |
| **[LOG.md](LOG.md)** | **session log — append-only, date-time** | **Append-only** | **ทุก session** |

## Session Start Protocol

### BIBLE extraction session
```
อ่าน: INDEX.md → LOG.md → SYNTAX.md → TAXONOMY.md → VOCAB.md → PROMPTS.md
```

### BIBLE Q&A session (ตอบคำถามโหราศาสตร์)
```
อ่าน: INDEX.md → LOG.md → PLANETS.md → SIGNS.md → HOUSES.md → QUALITY.md
```

### BIBLE review session
```
อ่าน: INDEX.md → LOG.md → CHAPTERS.md
```

---

## Q&A Intelligent Unit — โหราศาสตร์ไทย

Claude ใน BIBLE session ทำหน้าที่เป็น **intelligent unit** ตอบคำถามโหราศาสตร์ไทย (สุริยยาตร์)  
วัตถุประสงค์: ปรับปรุง KB + Master Dictionary ผ่าน Q&A

### ขีดความสามารถ
- ตอบจาก KB rules (`v3/kb_v24-3.json`, 290 rules) + memory files
- อธิบาย logic เบื้องหลัง (ทำไมถึงตีความแบบนั้น)
- ระบุ rule ID ที่ใช้ตอบ (เช่น "ตาม R055, R110")
- ตรวจสอบ consistency ระหว่าง rules

### Q&A Response Format
```
คำถาม: [คำถามโหราศาสตร์]

คำตอบ: [อธิบายชัดเจน ภาษาคน]
Rule basis: R### — [ชื่อ rule ที่ใช้]
Confidence: สูง / กลาง / ต่ำ

[ถ้า confidence ต่ำ หรือ KB gap:]
⚠️ KB gap: ไม่มี rule ครอบคลุมชัดเจน
→ Candidate rule: [เสนอ rule ใหม่]
→ Domain: [domain]
```

### KB Feedback Loop
เมื่อพบ Q&A ที่ชี้ให้เห็น gap หรือ error ใน KB:
1. **Gap**: ไม่มี rule ตอบได้ → เสนอ candidate rule → append ใน LOG.md
2. **Error**: rule ผิด → note ใน LOG.md พร้อม correction
3. **Ambiguity**: rule ขัดแย้งกัน → note ใน LOG.md พร้อม analysis

### Master Dictionary Feedback
เมื่อพบคำศัพท์ใหม่หรือ alias ที่ยังไม่มีใน VOCAB.md/PLANETS.md:
→ เพิ่มลงไฟล์ที่เกี่ยวข้องทันที (ไม่รอให้ user สั่ง)

### สิ่งที่ตอบได้
- ดาวในราศี/ภพ → ความหมาย
- ดาวสัมพันธ์กัน → ผลที่เกิด
- Transit → ช่วงเวลาดี/ร้าย
- คุณภาพดาว → interpretation
- สมพงศ์ → ประเมินเบื้องต้น

### สิ่งที่ต้องระวัง
- ไม่มีดวงชาตาจริง → ตอบได้แค่ general principle
- ตำราสุริยยาตร์เท่านั้น — ห้ามปนกับ Western/Vedic
- ถ้าไม่แน่ใจ → บอก confidence ต่ำ + ขอดูดวงชาตาจริง

---

## LOG.md — Append Rules
- เพิ่มอัตโนมัติ ไม่รอให้ user สั่ง
- Trigger: พบ pattern ใหม่ / process lesson / KB gap / ยืนยัน/หักล้าง assumption
- Format: `## YYYY-MM-DDTHH:MM — [Session/Topic]`
- ห้ามแก้ entry เก่า — ถ้า outdated ให้เพิ่ม entry ใหม่ว่า "supersedes YYYY-MM-DD"

---

## Repo resources (appended 2026-05-25 — Claude must check before asking user)

**Raw chapter text:**
- `workers/chapter_texts.json` — มี ch000-ch101+ raw content (object keys = chapter IDs)
- ใช้: `node -e "console.log(require('./workers/chapter_texts.json')['ch013'])"`
- Section numbering: บทใช้ "13.1", "13.2", "13.3" → `indexOf("13.2")` หา section
- **กฎ:** ก่อนถาม user เรื่อง chapter content → check ไฟล์นี้ก่อนเสมอ

**KB data files:**
- `v3/kb_v24-3.json` (290 rules, baseline)
- `v3/kb_v24-3_fp.json` (with fingerprints, schema 2.0-fingerprint)
- `v3/kb_merged.json` (after merge, schema 2.0-merged)
- `v3/kb_v24-final.json` (after apply, schema 2.0-final — created when user reviews)

**Master dict:**
- `v3/master_dict_meanings.json` v1.4.0-complete — domain vocabulary + relationships
- 11 sections: planets/houses/qualities/domains/aspect_strengths/signs/planet_positions/planet_pairs/lagna_concepts/house_rulers_by_lagna/special_configs

**Tools (browser):**
- `tools/kb_extract.html` — user runs Groq/Typhoon extractions
- `tools/kb_review.html` — user reviews CONFLICT/INTERNAL_DUPE
- URL: `https://horatad.github.io/horatad/tools/<filename>.html`

**Pipeline scripts (Node):**
- `workers/kb_add_fingerprint.mjs` — migrate to v2 schema
- `workers/kb_merge_by_fingerprint.mjs` — triangulate sources
- `workers/kb_deep_parse.mjs` — extract lagna_relation/inline fields
- `workers/kb_apply_review_decisions.mjs` — apply user decisions → final KB
- `workers/kb_wording_prompt_poc.mjs` — KB equalizer test prompt generator
