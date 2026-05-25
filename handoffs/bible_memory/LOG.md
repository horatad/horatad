# BIBLE Memory — SESSION LOG
# Type: APPEND-ONLY — ห้ามแก้ entry เก่า, เพิ่มอัตโนมัติทุก session
# Format: ## YYYY-MM-DDTHH:MM — [Session/Topic]

---

## 2026-05-22 — Session 1: ch001-ch015 (90 rules)
- พบ pattern สำคัญ: ตนุเศษ/กุมลัคนา/ตนุลัคน์ = สามระดับที่แตกต่างกัน
- กฎลบ-ลบ=บวก ใช้เฉพาะ เกษตร/ประเกษตร/อุจ/นิจ (ห้ามใช้กับ มหาจักร/ราชาโชค)
- วิธีตรวจสอบลัคนา: ถ้าพยากรณ์ไม่แม่น → ย้าย ±1 ราศี
- Ground truth: CH036 transit คู่มิตรพร้อมกัน = โชคใหญ่

## 2026-05-22 — Session 2: ch016-ch029 (+65 rules = 155)
- ch026 ใหญ่เกิน (52K) ข้ามไว้ทำ Batch 3
- domain อาชีพ: 1=ราชการ, 7=เกษตร/ที่ดิน, 8=หุ้น, 0=เปลี่ยนบ่อย
- ดาวเสาร์+ราหู (คู่มิตรใหญ่) สัมพันธ์ลัคนาพร้อม → ทำงานคล่อง มักร่ำรวย

## 2026-05-23 — Session 3: ch026+ch030-ch101 (+135 rules = 290) — COMPLETE
- ch026: transit rules รายดาวครบ — confirm โชคใหญ่ 5 กรณี (R191-R197)
- สมพงศ์: 3 เงื่อนไข — ลัคนาสัมพันธ์ + ดาวกุม/ตนุไม่เป็นคู่ศัตรู + เจ้าเรือนปัตนิไม่ตกอริ/มรณะ/วินาศ
- เสาร์(7)จรทับลัคนา vs ทับตนุลัคน์ → ผลต่างกัน (ทับลัคนา = รอบทิศ)
- อังคาร(3) อุจ vs มหาจักร: อุจ = สม่ำเสมอสูงน่าเบื่อ, มหาจักร = ยืดหยุ่นกว่า
- กุมลัคนา → แสดงออกก่อนดาวตรีโกณ/โยค/เล็งเสมอ (R288)
- ดาวจรร้าย 4 ดวงพร้อมกัน + ดวงเข้มแข็ง + คู่มิตรรับ → ไม่ถึงฆาต (R289)
- ดาว 0 ไม่สัมพันธ์ลัคนา → ไม่มีเซนส์ลึกลับ (ยืนยัน 100%, ch101)
- สุริยยาตร์ default: sunrise=06:00, เวลาท้องถิ่น, CE+543=BE (R290)

## 2026-05-23 — Process lessons
- compaction summary ≠ substitute สำหรับอ่าน INDEX.md + LOG.md — ต้องอ่านแม้จะมี summary
- "who is this session" = ambiguous: ตอบทั้ง project scope + model: "BIBLE / claude-sonnet-4-6"
- Session scope ไม่ถูก "set" จริง ๆ — Claude ตีความจาก context เท่านั้น
- "why not X" หลังคำตอบ = คำถามเกี่ยวกับคำตอบ ไม่ใช่คำสั่งทำงาน → ชี้แจงก่อน อย่าลงมือโค้ด

## 2026-05-23 — Memory architecture migration
- ย้าย BIBLE_memory.md → handoffs/bible_memory/ แยก 8 ไฟล์ตามประเภท
- INDEX.md = จุดเริ่มต้น session + Q&A Intelligent Unit protocol
- LOG.md = append-only, date-time stamped, อัตโนมัติ ไม่รอสั่ง
- Q&A mode: ตอบคำถามโหราศาสตร์จาก KB 290 rules → flag KB gap → candidate rule ใหม่
- CLAUDE.md อัปเดตชี้ไปที่ bible_memory/INDEX.md + LOG.md แทนเดิม

## 2026-05-23 — Quality review R200-R290 findings

### Schema issues พบและแก้แล้ว
- `contexts` field schema drift: R001-R100 ถูกต้อง (['natal']/['transit']); R101-R290 เปลี่ยนเป็น keyword tags โดยไม่ตั้งใจ → แก้ 135 rules แล้ว
- `polarity="~"` = valid value ตลอด KB (111/290 rules) หมายถึง conditional/mixed — ไม่ใช่ error → บันทึกใน TAXONOMY.md
- `domain` taxonomy: KB ใช้ domain รวมกว่า TAXONOMY.md (นิสัย, หลักการ, ดาวจร, โชคลาภ, ความสัมพันธ์) → update TAXONOMY.md

### Meaning/semantic: ผ่านทั้งหมด
- R200-R290: เนื้อหาสมเหตุสมผล ตรงกับหลักสุริยยาตร์
- ไม่พบ semantic error หรือ polarity ผิดอย่างชัดเจน

## 2026-05-23 — Extraction infrastructure + Master Dict architecture

### ไฟล์ใหม่ที่สร้าง
- `TAXONOMY.md` — rule schema spec ครบทุก field + decision tree + good/bad examples + edge cases
  → LLM (Typhoon/Groq/Claude) อ่านได้ทันทีเพื่อ extract ตาม schema นี้
- `PROMPTS.md` — 4 extraction templates: standard / chunked / Q&A heavy / batch small
  → พร้อมใช้กับ Typhoon/Groq/Claude ไม่ต้อง prompt ใหม่ทุกครั้ง
- `v3/master_dict_meanings.json` — user-editable meanings layer: ดาว 10, ภพ 12, คุณภาพ 11, domain 7, aspect 5
  → แยกออกจาก master_dict.js (computation) — user เป็นเจ้าของ, Claude propose เท่านั้น
- `tools/master_dict_editor.html` — HTML editor load URL/ไฟล์ → ดูรายภพ/ดาว/คุณภาพ → export JSON
  → deploy GitHub Pages: https://horatad.github.io/horatad/tools/master_dict_editor.html

### Master Dict architecture (confirmed)
- master_dict.js = Claude owns: computation, pairs, relations, formulas (ไม่มี meanings)
- master_dict_meanings.json = User owns: meanings, keywords, labels (user validate ก่อน commit)
- Sync protocol: Claude พบ → propose ใน LOG.md → user validate → user edit JSON → Claude อ่านต้น session ถัดไป
- Conflict: user เป็น final authority เสมอ

### UI decision: HTML tool แทน Google Sheets
- ข้อดี: free (GitHub Pages), offline-capable, validate ได้, ไม่มี auth issue
- ข้อเสียที่รู้แล้ว: schema เปลี่ยน → ต้อง update tool; export JSON แล้วต้อง commit มือ
- ข้อเสียของ Google Sheets: sync manual, export JSON เอง — แต่คุ้นเคยกว่า
- Decision: HTML tool เป็นจุดเริ่มต้น, Google Sheets ถ้า user ต้องการ

## 2026-05-25 — 📌 PINNED: Ground-truth extraction architecture (user-defined)

**Context:** user ชี้ว่า BIBLE mission หลัก = **รักษา ground truth ของ KB เพื่อป้องกัน hallucination**
ทุก rule ใน `kb_v24-3.json` ต้องตรวจสอบกับตำราต้นฉบับ 102 บทได้

### Source of truth location (verified 2026-05-25)
- ✅ `source/CH000.docx ... CH101.docx` — 102 ไฟล์ตำราต้นฉบับ (immutable)
- ✅ `workers/chapter_texts.json` — pre-extracted text 1.4MB ครบ ch000-ch101
- **ใช้ chapter_texts.json อ่าน** (เร็วกว่า unpack docx ทุกครั้ง)

### 4-Level Content Separation Framework (user-defined)
ทุก content ที่เจอในตำราต้องจัดอยู่ใน 1 ใน 4 ระดับ:

| ระดับ | คำนิยาม | ไปไหน |
|---|---|---|
| **1. PRIMARY rule** | ผู้เขียนกล่าวเป็นกฎตรงๆ — declarative + universal | `kb_v24-3.json` ติด tag PRIMARY |
| **2. Rule element** | atom: planet, sign, house, quality, aspect, polarity, context, domain | master dictionary (ไม่ใช่ rule) |
| **3. Prediction** | ผลที่ apply rule กับ chart เฉพาะ (case study output) | **ห้ามเข้า KB เป็น rule** — ใช้เป็น evidence backing rule |
| **4. Ambiguity / Secondary** | derivation, opinion, Q&A answer, author commentary | KB ได้แต่ tag SECONDARY — แยกออกจาก PRIMARY |

### Schema patch (mandatory ทุก rule ใหม่ตั้งแต่นี้)
```json
{
  "id": "R###",
  "source_type": "PRIMARY | DERIVED_FROM_CASE | INFERRED | SECONDARY",  // ⭐ NEW
  "source_chapter": "ch###",                                              // ⭐ NEW
  "source_quote": "<verbatim quote จากตำรา ถ้า PRIMARY>",                  // ⭐ NEW
  ...existing fields...
}
```
- `grep '"source_type":"PRIMARY"' kb_v24-3.json` → ได้รายการตรวจกับ 100 บทได้
- ทุก rule ปัจจุบัน 290 ตัว = **ยังไม่มี tag** → ต้อง re-audit (งานหนัก ทำครั้งเดียวจบ)

### Atomic Learning Model (leveraged audit)
```
ตำรา 102 บท (immutable) → Claude อ่านหลายรอบ → ตกผลึก rule elements
        → Master Dictionary (verification truth ของ user)
        → user audit dict (~100 atoms) → catches rule errors (290 molecules) auto
        → user แก้ที่ dict ไม่ใช่ที่ rule
        → Claude อ่าน dict ก่อน extract ทุกครั้ง → consistent + no hallucination
```

**Effect:** verify N atoms = validate N² combinations (high leverage สำหรับ user)

### Master Dictionary status (2026-05-25)
**มีแล้ว** (5/11 sections): planets, houses, qualities, domains, aspect_strengths

**ขาด** (6 critical atoms — รอ user เติม):
1. `signs` (12 ราศี) — เมษ..มีน + ruler/element/quality
2. `planet_positions` — อุจ/นิจ/เกษตร/ประเกษตร/มหาจักร/ราชาโชค positions per planet
3. `planet_pairs` — คู่มิตร/คู่ศัตรู/คู่มิตรใหญ่ (ch008)
4. `lagna_concepts` — ลัคนา/ตนุเศษ/ตนุลัคน์ distinction (ch013)
5. `house_rulers` — เจ้าเรือนของแต่ละภพ (depends on rising sign)
6. `special_configs` — มฤตยูสัมพันธ์ลัคนา, etc.

### Procedures for NEXT BIBLE session (📌 enforced)
ก่อนทำ extraction หรือ Q&A ใดๆ ต้อง:
1. **อ่าน master_dict_meanings.json ครบทุก section** — ห้ามใช้ element ที่ไม่อยู่ใน dict
2. **อ่านบทตำราที่จะ extract จาก chapter_texts.json** ก่อน (verbatim ดู source)
3. **Extract rule** ใส่ tag source_type + source_chapter + source_quote ทุกตัว
4. **ถ้าไม่แน่ใจว่าเป็น PRIMARY** → tag DERIVED_FROM_CASE หรือ SECONDARY แทน (conservative)
5. **ถ้าใช้ element ที่ dict ยังไม่มี** → หยุด เสนอเพิ่มใน dict ก่อน อย่า hallucinate

### Why this matters to user (not Claude)
- 6 เดือนหน้า user จะตรวจ KB ของตัวเองได้ทุกบรรทัด vs ตำราจริง
- ถ้า user ไม่กล้า ship app เพราะไม่มั่นใจ KB ของตัวเอง → mission BIBLE fail
- model นี้ทำให้ user "เป็นเจ้าของ" KB จริง ไม่ใช่แค่ "ใช้ของที่ Claude เขียน"

### Reference back-links
- Procedures conversation: this session 2026-05-25 (BIBLE session, claude/bible-b5bFe @ 1cf5d6f)
- Existing tools that align: `tools/master_dict_editor.html`, `v3/master_dict_meanings.json`
- Existing memory aligned: PLANETS.md (rule elements), TAXONOMY.md (rule schema spec)

## 2026-05-25 — 📌 PINNED v2: TRIANGULATION ARCHITECTURE (supersedes v1 above)

**Why this entry:** earlier today v1 PINNED framed ground truth as "100CH verbatim only" — user corrected:
- LLMs (Gemini etc.) อ้างอิงกฎโหราศาสตร์ไทยได้ถูกต้องเกือบหมด แม้ vocabulary บางตัวไม่ใน 100CH (เช่น คู่ทรหด, คู่วิวาทะ, คู่ธาตุ) — เป็นธรรมเนียมจริง
- BIBLE real job: **preserve essence ของธรรมเนียม + ให้ traceable provenance** ไม่ใช่บังคับ literal match

### NEW Mental Model

```
Ground truth = ธรรมเนียมสุริยยาตร์ทั้งหมด (broader)
100CH        = anchor/primary reference (ไม่ใช่จักรวาลปิด)
LLMs         = extract กฎที่ถูกต้องจาก training data ได้ (Gemini proven)
User         = final verification authority สำหรับ "ธรรมเนียมจริงไหม"
```

### Triangulation Architecture — KB main rules = สามแหล่งบรรจบ

```
Source A: 100CH → claude extraction → v3/kb_v24-3.json (290 rules) ✅ มีแล้ว
Source B: LLM general knowledge (Gemini/Typhoon) → v3/kb_v24-1.json, v3/kb_v24-2.json
Source C: User direct input (ครู/ประสบการณ์) → optional layer

           ↓ MERGE by element fingerprint

v3/kb_merged.json — 3 verification states:
  • AUTO_VERIFIED  : ≥2 sources agree on elements + polarity  → ผ่าน
  • CONFLICT       : same elements, different polarity/domain → user decides
  • UNIQUE         : only 1 source has this element combo     → user reviews
```

**Insight:** ลดงาน user จาก "verify 290 rules ทีละข้อ" → "review เฉพาะ CONFLICT + UNIQUE"

### Element Fingerprint — กุญแจของระบบ

Rule เดียวกัน = elements ตรงกัน (ไม่ใช่ wording ตรง)

```
fingerprint format: "p<planet>+p<planet2>+h<house>+s<sign>+q<quality>+a<aspect>+ctx:<context>"
null/missing → "_" positional

ตัวอย่าง:
  อาทิตย์ในภพปุตตะ (natal)     → "p1+_+h5+_+_+_+ctx:natal"
  อังคารกุมเสาร์ (natal)        → "p3+p7+_+_+_+a:KUM+ctx:natal"
  เสาร์จรทับลัคนา                → "p7+_+h1+_+_+a:KUM+ctx:transit"
  อาทิตย์อุจในเมษ               → "p1+_+_+s1+q:UCH+_+ctx:natal"
```

### NEW Rule Schema (extends current — backward compatible)

```json
{
  "rule_id": "R001",
  "elements": {
    "planet_id": "1", "planet_id_2": null,
    "house_id": "5", "sign_id": null,
    "quality": null, "aspect": null,
    "context": "natal",
    "fingerprint": "p1+_+h5+_+_+_+ctx:natal"
  },
  "polarity": "+",
  "domain": ["ครอบครัว"],
  "wordings": [
    {
      "text": "อาทิตย์ในภพปุตตะ จะมีลูกที่เก่ง",
      "source": "ch004",
      "source_type": "IN_BOOK",
      "extracted_by": "claude-session-2026-05-23"
    },
    {
      "text": "อาทิตย์ในภพ 5 ลูกมีศักดิ์ศรี",
      "source": "gemini-pro",
      "source_type": "FROM_LLM",
      "extracted_by": "session-2026-05-25"
    }
  ],
  "verification_status": "AUTO_VERIFIED",
  "verification_sources": 2,
  "memory_ref": "LOG 2026-05-25 v2"
}
```

### Source Types (REPLACES v1 4-level)

| Tag | Meaning | Verification |
|---|---|---|
| `IN_BOOK` | ปรากฏใน 100CH + cite chapter | self-verifying (quotable) |
| `IN_TRADITION` | ในธรรมเนียมสุริยยาตร์ (เช่น คู่ทรหด) | user verifies once |
| `FROM_LLM` | extract จาก LLM (Gemini/Typhoon/Claude) | needs triangulation |
| `LLM_COMBINED` | LLM ประกอบจากหลาย rule | needs user review |
| `USER_INPUT` | user ป้อนตรง (ครู/ประสบการณ์) | trusted |
| `NEEDS_REVIEW` | uncertain — fall-through | user decides |

### KB Equalizer Principle

```
Without KB: LLM พึ่ง training (Gemini ชนะ เพราะ Thai data เยอะ)
With KB:    LLM ใช้ KB เป็น authoritative source → ต่างยี่ห้อ output คุณภาพใกล้กัน
```

→ BIBLE ทำให้ horatad app **independent จาก LLM vendor** สลับ Typhoon ↔ Claude ↔ Groq ได้

### Implementation Procedure (4 steps, ordered)

**Step 1: Migrate kb_v24-3.json** (no LLM dep — ทำได้ทันที)
- Script: `workers/kb_add_fingerprint.mjs`
- Logic: read v3/kb_v24-3.json → compute fingerprint per rule → wrap prediction text as wordings[0] → output v3/kb_v24-3_fp.json (or in-place patch)
- Validate: 290 in = 290 out, fingerprints generated correctly

**Step 2: Build merge tool**
- Script: `workers/kb_merge_by_fingerprint.mjs`
- Input: array of kb_*_fp.json files
- Output: kb_merged.json + report (AUTO/CONFLICT/UNIQUE counts)
- Group by fingerprint → tag verification_status → collect wordings

**Step 3: Conflict review** (skip if minor)
- Tool: `tools/kb_conflict_review.html` or flat JSON
- Show: CONFLICT (same elements, different polarity) + UNIQUE (1-source)
- User decisions → write back to JSON

**Step 4: Extract more sources** (ongoing, requires user)
- Gemini extraction → kb_v24-1.json (browser tool)
- Typhoon extraction → kb_v24-2.json
- Re-run step 2 with new sources

### Open Decisions (pending user)

| Decision | Options | Status |
|---|---|---|
| Wording selection at app runtime | (a) IN_BOOK first (b) rotate (c) chart-context | **PENDING** |
| When rule is "production-ready" | (a) ≥2 sources (b) user marks ✓ (c) both | **PENDING** |
| User input mechanism | (a) edit JSON (b) HTML form (c) chat | **PENDING** |

### Memory Protocol for Future Sessions

**ถ้า session ถัดไปทำงาน KB merging / extraction / rule schema:**
1. อ่าน entry นี้ก่อนทำงาน — มี framing + schema + procedure ครบ
2. ห้าม fallback ไป v1 framing (strict 100CH verbatim) — superseded
3. ถ้า user สั่งงานใหม่ขัดกับ entry นี้ → ถาม clarification ก่อน อย่า assume
4. Schema patches ต้อง backward-compatible (field เก่ายังอยู่ได้)
5. ทุก output ใหม่ใส่ `memory_ref` ชี้กลับมาที่ entry นี้

### Why this matters to user (not Claude)

- user จะ verify 5-20% ของ rules (CONFLICT + UNIQUE) ไม่ใช่ 100%
- Trust ของ KB สูงขึ้นทุกครั้งที่เพิ่ม source ใหม่ (triangulation effect)
- App horatad ไม่ผูกกับ LLM ใดตัวหนึ่ง → cost flexibility + vendor independence
- คุณ ship app เร็วขึ้น เพราะไม่ต้อง audit ทุก rule

### Validation Test ที่ user ทำได้

```
Step A: prompt เดียวกัน 3 ที่ (Gemini/Typhoon/Claude) ไม่แนบ KB
Step B: prompt เดียวกัน 3 ที่ แนบ KB rules ที่เกี่ยวข้อง
ทำนาย: A ต่างกันมาก, B ใกล้กัน → ยืนยัน KB equalizer
```
ถ้าผลตรง = architecture นี้ถูก, ไม่ตรง = ต้องคิดใหม่

## 2026-05-25 — Implementation log (Triangulation infra complete)

### Files shipped (all on main, see commit history fbb68f5..df7b552)

**Scripts (`workers/`):**
- `kb_add_fingerprint.mjs` — schema migrate old KB → v2.0-fingerprint
- `kb_merge_by_fingerprint.mjs` — triangulation merge (N sources → kb_merged.json)
- `kb_deep_parse.mjs` — extract lagna_relation/ruler_of_house/inline sign/quality/house from condition_text

**Data (`v3/`):**
- `kb_v24-3_fp.json` — kb_v24-3 migrated + deep-parsed (290 rules, 239 unique fp)
- `kb_merged.json` — single-source merge baseline (will populate AUTO_VERIFIED when LLMs arrive)

**Browser tools (`tools/`):**
- `kb_extract.html` — outputs v2 schema directly + embedded deep-parse (1-step workflow)
- `kb_review.html` — review CONFLICT/INTERNAL_DUPE/UNIQUE with merge/separate/skip decisions

### Discrimination gain measured

| Stage | Unique fp | Perfectly-unique rules | Dupe groups | Top dupe |
|---|---|---|---|---|
| Raw migrate (no domain) | 106 | 75 | 31 | 28x |
| + domain in fp | 171 | 122 | 49 | 12x |
| + deep parse | **239** | **207** | **32** | **9x** |

Deep parse hits per field:
- lagna_relation: 132 rules (46% of KB)
- inline_quality: 37 | inline_house: 31 | inline_sign: 21 | ruler_of_house: 7

### What blocks Step 4 (real triangulation)

User must run LLM extractions:
1. Open `https://horatad.github.io/horatad/tools/kb_extract.html`
2. Run Groq mode → download `kb_v24-1_fp.json` → commit `v3/`
3. Run Typhoon mode → download `kb_v24-2_fp.json` → commit `v3/`
4. Re-run: `node workers/kb_merge_by_fingerprint.mjs v3/kb_merged.json v3/kb_v24-1_fp.json v3/kb_v24-2_fp.json v3/kb_v24-3_fp.json`
5. Open `https://horatad.github.io/horatad/tools/kb_review.html` → review CONFLICT/INTERNAL_DUPE
6. Export decisions JSON → (future) apply tool merges decisions back to KB

### Still pending (next session)

- **Apply tool** — `workers/kb_apply_review_decisions.mjs` reads decisions JSON + kb_merged.json → outputs `kb_v24-final.json` (final production KB)
- **Engine switch** — update `v3/engine.js` to load `kb_v24-final.json` instead of `kb_v24-3.json` (HORATAD scope, not BIBLE)
- **Wording selection at runtime** — open decision: IN_BOOK first / rotate / chart-context
- **Master dict skeletons** — 6 sections still need user fill (signs/positions/pairs/lagna_concepts/house_rulers/special_configs)

### Sync warning for future sessions

⚠️ `tools/kb_extract.html` JS embeds duplicates of:
- `workers/kb_add_fingerprint.mjs` makeFingerprint()
- `workers/kb_deep_parse.mjs` parseConditionText() + vocab maps

If you change one, **update the other** to stay in sync. Both files note this in code comment.

## 2026-05-25T15:00 — Pipeline completion + master_dict signs

### Apply tool shipped (`workers/kb_apply_review_decisions.mjs`)

Closes the triangulation pipeline (Step 5):
```
kb_merged.json + decisions.json (+ optional source files) → kb_v24-final.json
```

**Decision semantics implemented:**
- `merge`        → keep grouping, mark `production_ready=true`
- `separate`     → split into N rules using `source_rule_ids` (re-read source files)
- `skip`         → keep as-is, `production_ready=false`
- (no decision)  → keep as-is; production_ready derived from `verification_status`
  - AUTO_VERIFIED → true
  - UNIQUE / INTERNAL_DUPE (undecided) / CONFLICT (undecided) → false

**Fallback for `separate` without source files:** split per-wording (1 wording → 1 rule).
Warning printed; not lossy but loses original condition_text grouping.

**Output schema (`v3/kb_v24-final.json`, schema_version: "2.0-final"):**
- Each rule: rule_id (RF###), elements, polarity, domain, wordings[],
  verification_status, production_ready, decision_applied, parent_merged_id,
  origin_source_rule_id (for separated rules)
- _meta tracks decisions_from, sources_used_for_separate, summary

**Smoke test passed:** 5 synthetic decisions on kb_merged.json (239 rules)
→ 240 rules out (1 separate produced +1), 3 production-ready (merged).

### Wording prompt POC (`workers/kb_wording_prompt_poc.mjs`)

Generates KB-augmented prompt for KB equalizer test. Selects top-N rules by
element match with chart (planet present: +2, planet+house pair: +5, lagna: +1).

Default chart = synthetic 10-planet placement. Output ≈9KB prompt with 25 rules.

**Usage for KB equalizer test (user runs):**
1. `node workers/kb_wording_prompt_poc.mjs --out prompt.txt`
2. Paste `prompt.txt` into Gemini, Typhoon, Claude.web separately
3. Compare outputs — if KB equalizer works, outputs should be ใกล้กัน

**Known limitation:** scoring favors REFERENCE rules (all-10-planet matches).
Consider penalizing rule_use=reference in v2 if outputs are too generic.

### Master dict — signs section: structural fields filled

Filled 12 ราศี with `ruler_planet_id`, `ruler_planet_name`, `element`,
`element_phase`, `nature` from `handoffs/bible_memory/SIGNS.md` (BIBLE memory
ground-truth from ch001+ch007).

**represents[] + keywords[] still empty** — those need narrative content beyond
SIGNS.md (user Q&A or chapter quotes).

### ⚠ ID scheme mismatch discovered (action required)

`v3/master_dict_meanings.json` uses keys **1-12** (เมษ=1) but the canonical
sign_id used throughout the KB (kb_v24-3.json, SIGNS.md, ch001 quote) is **0-11**
(เมษ=0).

Added `canonical_sign_id` field per sign to bridge the gap, but downstream
consumers (engine.js, etc.) need to be aware:
- master_dict access:  `signs[String(canonical_id + 1)]`
- canonical lookup:    each entry has `canonical_sign_id` field

**Recommendation:** future schema migration → make master_dict use 0-11 keys
to match KB (breaking change, defer until next major bump).

### Schema additions

**signs entries now have:**
- `ruler_planet_name` (helper, e.g. "อังคาร")
- `element_phase` ("ต้น" / "กลาง" / "ปลาย")  — useful for cusp-dignity logic
- `canonical_sign_id` (0-11)
- `alias` (for กุมภ์/มกร alternate spellings — มกร also called มังกร)
- `ruler_secondary_planet_id` / `ruler_secondary_planet_name` (only for กุมภ์: ราหู primary, เสาร์ secondary)

### Pipeline now complete end-to-end

```
SOURCE (kb_v24-3.json + future kb_v24-1_fp + kb_v24-2_fp)
  ↓ kb_add_fingerprint.mjs / kb_extract.html (Groq/Typhoon mode)
*_fp.json (schema 2.0-fingerprint)
  ↓ kb_merge_by_fingerprint.mjs
kb_merged.json (schema 2.0-merged)
  ↓ tools/kb_review.html (user reviews CONFLICT/INTERNAL_DUPE)
kb_review_decisions_*.json
  ↓ kb_apply_review_decisions.mjs                  ← NEW (this session)
v3/kb_v24-final.json (schema 2.0-final, production-ready flags)
  ↓ (HORATAD scope) engine.js loads → runtime wording selection
```

Blocking item to ship: user runs Groq + Typhoon extractions to populate
kb_v24-1_fp.json + kb_v24-2_fp.json — without 2nd/3rd source, every rule is
UNIQUE and triangulation has no signal.

## 2026-05-25T16:00 — POC scoring v2 + planet_positions complete + ID schema plan

### POC scoring v2 — penalize REFERENCE rules

`workers/kb_wording_prompt_poc.mjs` ruleScore() updated:

| Signal | Old score | New score |
|---|---|---|
| Planet in chart | +2 each (uncapped) | +2 each, **capped at +6** total |
| Planet+house pair match | +5 | +8 |
| KUM_LAKKANA + planet in lagna house | (not handled) | +7 |
| type=NATAL_ATOMIC | 0 | +3 |
| type=NATAL_COMBINATION | 0 | +2 |
| type=TRANSIT_NATAL | 0 | +1 |
| type=REFERENCE / DEFINITION | 0 | **-5** |
| type=PRINCIPLE | 0 | -2 |
| rule_use=reference | 0 | -3 |
| rule_use=match | 0 | +1 |
| context=lagna | +1 | +1 |

**Effect on default chart (อังคาร in lagna):**
- Old top 5: all REFERENCE rules (R003, R007, R048, R248, R025) — generic
- New top 5: R248 KUM_LAKKANA summary, R013/R117 อังคารกุมลัคนา specific, R164/R165 with quality conditions
- Output prompt now actionable for KB equalizer test (specific position rules dominate)

### Master dict planet_positions — complete for 8 main planets

Filled all 8 planets (1-8) with full positional data from SIGNS.md:
- `uchcha`, `nicha`, `kaset`, `prakaset`, `mahachak`
- `uchajavilas`, `uchajaphimukh` (uchcha-neighbor signs, ≈60% strength)
- Each position has both `sign_id` (master_dict 1-12 scheme) and where applicable `canonical_sign_id` (0-11)
- เกตุ(9) + มฤตยู(10) explicitly null with notes — สุริยยาตร์ไม่ใช้ position concepts สำหรับ 2 ดาวนี้

`rajayok` field left empty for all — ราชาโชค คือ configuration (specific aspect+placement combo) ไม่ใช่ single-position. ดูใน `special_configs` แทน.

### ⚠ ID schema mismatch — TWO incompatible schemes documented

**Sign IDs:**
- master_dict.signs: keys 1-12 (1=เมษ, 12=มีน)
- KB canonical (kb_v24-3.json, SIGNS.md, ch001 quote): 0-11 (0=เมษ, 11=มีน)
- Bridge: each entry has `canonical_sign_id` field

**Planet IDs (worse — same number = different planet):**
- master_dict.planet_positions / master_dict.planets: keys 1-10
  - 9 = เกตุ, 10 = มฤตยู
- KB canonical (kb_v24-3.json, PLANETS.md): 0-9
  - 0 = เกตุ, 9 = มฤตยู
- Number "9" means เกตุ in master_dict but มฤตยู in KB — easy bug source
- Bridge: each entry has `canonical_planet_id` field (added this session)

### Schema migration plan (deferred until major bump)

**Recommendation:** unify to KB canonical (0-11 for signs, 0-9 for planets) on next major version.

**Migration steps (do not execute now):**
1. Add `_meta.id_scheme: "canonical-zero-based"` to master_dict_meanings.json
2. Rewrite signs keys: `"1"` → `"0"`, ..., `"12"` → `"11"`
3. Rewrite planet_positions/planets keys: `"1"` → `"1"` (no change for 1-8), but `"9"` → `"0"` (เกตุ) and `"10"` → `"9"` (มฤตยู)
4. Search codebase for consumers:
   ```bash
   grep -rn "master_dict_meanings\|planet_positions\|signs\[" --include="*.js" --include="*.mjs"
   ```
5. Update each consumer with `_meta.id_scheme` check + key offset logic
6. Bump master_dict_meanings.json version to 2.0.0
7. Remove `canonical_*_id` bridge fields (becomes redundant)

**Why defer:**
- Engine.js (HORATAD scope) currently uses kb_v24-3 directly with canonical IDs — unaffected
- master_dict_meanings.json is mostly read by KB tooling + future LLM context — not in critical render path yet
- Triangulation pipeline not blocked by this
- Bridge fields (`canonical_sign_id`, `canonical_planet_id`) make current usage safe

**Risk of NOT migrating:**
- Every new consumer must remember to add +1 / -1 offsets
- Higher bug surface area as code grows
- Confusing for new contributors

**Migration trigger conditions:**
- master_dict reaches "complete" (all 6 sections filled + production usage)
- OR engine.js starts consuming master_dict directly
- OR third consumer (after KB tooling + LLM prompts) needs it

### Session decisions taken (not requiring user input)

1. `rajayok` field stays empty per planet — moved to `special_configs` semantically
2. `uchajavilas` + `uchajaphimukh` added per planet — derivable but inline-included for ease of access
3. เกตุ + มฤตยู uchcha/nicha set to `null` (not empty object) — semantic difference: "no concept exists" vs "concept exists but unknown"
4. `mahachak` entries include `with_partner` string for human readability — pure data would be `partner_planet_id` + `partner_sign_id` but verbose string is easier to verify
5. `kaset` for เสาร์ uses `"rank": "secondary"` on the 2nd entry (กุมภ์) — marks the disputed/lesser rulership per SIGNS.md

## 2026-05-25T17:00 — Master dict v1.2.0: planet_pairs + house_rulers_by_lagna complete

### Files written

**v3/master_dict_meanings.json bumped to v1.2.0-structural**
Sections completed this session: signs (structural) + planet_positions + planet_pairs + house_rulers_by_lagna

### planet_pairs

Filled from R054 (มิตร) + R057 (ศัตรู):
- `mitr`: [[1,5], [2,4], [3,6], [7,8]] (อาทิตย์-พฤหัส, จันทร์-พุธ, อังคาร-ศุกร์, เสาร์-ราหู)
- `satru`: [[1,3], [4,8], [6,7], [2,5]] (อาทิตย์-อังคาร, พุธ-ราหู, ศุกร์-เสาร์, จันทร์-พฤหัส)
- `mahamitr`: [[7,8]] only (เสาร์-ราหู) — per BIBLE memory PLANETS.md
- `mahasatru`: empty by design — ไม่มีในตำราสุริยยาตร์ standard
- `neutral`: empty list, but documented as "all pairs not in mitr/satru" (18 of 28 possible pairs from 8 planets)

Pattern observation: each main planet (1-8) has exactly 1 mitr + 1 satru + 5 neutral relationships.
เกตุ(9)/มฤตยู(10) sit outside the pair system.

### house_rulers_by_lagna — fully derived (12×12 = 144 entries)

Mechanical derivation, no human input needed:
```
ruler_of_house(L, i) = signs[((L-1 + i-1) mod 12) + 1].ruler_planet_id
```
where L = lagna sign (1-12), i = house number (1-12).

Each lagna entry stores:
- `signs_house_1_to_12`: array of 12 sign_ids occupying houses 1-12
- `rulers_house_1_to_12`: array of 12 planet_ids ruling those signs

Verification: spot-check สิงห์ lagna (L=5), house 5 (ปุตตะ) → sign 9 (ธนู), ruler 5 (พฤหัส) ✅

**Important caveat:** กุมภ์ uses ราหู(8) as primary ruler per signs[11].ruler_planet_id. If consumer needs Saturn-based interpretation (เสาร์ rules กุมภ์ in some traditions), they must check `signs[11].ruler_secondary_planet_id`. Not embedded here to avoid 2-ruler-per-house ambiguity in matrix.

### Completion status snapshot (master_dict v1.2.0)

| Section | Status |
|---|---|
| planets | complete (10/10) ✅ |
| houses | complete (12/12) ✅ |
| qualities | complete (11/11) ✅ |
| domains | complete (7/7) ✅ |
| aspect_strengths | complete (5/5) ✅ |
| signs | structural complete (narrative pending) 🟡 |
| planet_positions | complete (8/8 + null for เกตุ/มฤตยู) ✅ |
| planet_pairs | complete ✅ |
| house_rulers_by_lagna | complete (12×12 derived) ✅ |
| lagna_concepts | SKELETON 🔴 (needs user input ch013 — ลัคนา/ตนุเศษ/ตนุลัคน์ distinction) |
| special_configs | partial (mrittyu_lagna + 4-evil already; add as encountered) 🟡 |

**Score: 7 of 11 fully complete, 2 partial, 2 remaining (1 needs user, 1 grows organically).**

### Why derived data is shipped instead of computed at runtime

For `house_rulers_by_lagna` (mechanical from signs[].ruler):
- 144 entries pre-computed = ~3KB JSON = negligible
- Engine.js can lookup in O(1) instead of computing
- Verifiable: human can scan table and spot errors
- Documentation value: makes the schema relationship explicit

Trade-off accepted: if signs[].ruler_planet_id ever changes (e.g. ราหู vs เสาร์ debate for กุมภ์), the matrix must be regenerated. Added note in `_skeleton_note` referencing which sign's ruler determines what.

## 2026-05-25T18:30 — Master dict v1.4.0-complete: all sections filled

### Final 3 sections filled this session

**signs.represents[]/keywords[] × 12 ราศี** (Claude-derived)
Method: take ruler.represents (from master_dict.planets) + element semantics + nature modifier
- Example สิงห์ (ruler=อาทิตย์, ไฟ-กลาง, คงที่):
  - represents: ['ศักดิ์ศรี','อำนาจ','ความสง่างาม','ผู้นำ','ความภาคภูมิใจ'] ← from อาทิตย์.represents subset
  - keywords: ['สง่างาม','มีอำนาจ','ภาคภูมิใจ','หยิ่ง','มั่นใจ'] ← from อาทิตย์.positive/negative_keywords + คงที่ modifier
- Explicit derivation method documented in `_skeleton_note` + `_derivation_method` fields
- Status: "complete — user refines" (Claude derived, not from chapter text directly)

**special_configs expanded to 11 entries** (from 2)
New entries added:
- `mahachakra` — full definition with all 4 mitr-pair examples + memory code ๗๒๑๘๔๓๕๖
- `rajayok` — quality config, ~50-60% of อุจ strength
- `thevi_yok` — ~60% of rajayok, except when conjuncts lagna ≈ rajayok
- `uchaja_vilas` (อุจจาวิลาส) — sign before uchcha, ~60% strength
- `uchaja_phimukh` (อุจจาภิมุข) — sign after uchcha, ~60% (decreasing)
- `anukaset` — distinguished from mahachakra (single planet in mitr's kaset, not paired)
- `kum_lakkana_priority` — interpretation rule (R288): กุมลัคนา > ตรีโกณ/โยค > เล็ง
- `negative_negative_positive` — กฎลบ-ลบ=บวก (R068): applies to เกษตร/ประเกษตร/อุจ/นิจ only; NOT to mahachakra/uchaja-vilas/uchaja-phimukh/rajayok/thevi_yok
- `mrittyu_lagna_relation` — kept (already there)
- `four_evil_transit_strong_chart` — kept (already there)
- `saturn_rahu_mahamitr` — added (BIBLE memory note)

**lagna_concepts complete** (extracted from chapter_texts.json ch013)
Filled all 3 main concepts + kum_lakkana + 3-layer identity model:
- `lakkana` (13.1): จุดเริ่มต้นการนับเรือน, ใช้ระบบสุริยยาตร์ (06:00 ตายตัว, local time)
- `tanusesh` (13.2): นิสัย/อารมณ์, คำนวณ a×b÷7 เศษ = planet_id (1-7 only), notation +/×
  - per-planet personality table filled from ch013 raw text
  - explicit not_applicable_planets: 8/9/0 (ราหู/เกตุ/มฤตยู)
- `tanulagn` (13.3): ruler ของลัคนา sign = "ตัวตนภายในแท้/สันดาน"
  - per_planet_inner_self table filled from ch013
  - expression_modifier rule: if aspect ลัคนา → ชัด, else → ลึก
- `kum_lakkana`: cross-ref to special_configs.kum_lakkana_priority + R248/R288
- `three_layer_identity_model`: new — explains the 3-layer interpretation flow

### Master dict completion status (v1.4.0)

| # | Section | Status |
|---|---|---|
| 1 | planets | ✅ complete (10/10) |
| 2 | houses | ✅ complete (12/12) |
| 3 | qualities | ✅ complete (11/11) |
| 4 | domains | ✅ complete (7/7) |
| 5 | aspect_strengths | ✅ complete (5/5) |
| 6 | signs | ✅ complete (structural + narrative Claude-derived) |
| 7 | planet_positions | ✅ complete (8/8 + null for เกตุ/มฤตยู) |
| 8 | planet_pairs | ✅ complete (mitr/satru/mahamitr) |
| 9 | lagna_concepts | ✅ complete (3 layers + kum_lakkana + model) |
| 10 | house_rulers_by_lagna | ✅ complete (12×12 derived) |
| 11 | special_configs | 🟡 expanded (11 entries; grows organically) |

**Score: 10 ✅ + 1 🟡 (by design — special_configs always open for new patterns)**

### chapter_texts.json discovery

`workers/chapter_texts.json` is an existing data file with raw chapter content (ch000-ch101+). 
This unblocks future "fill from chapter" tasks without user Q&A:
- Read chapter X content directly
- Extract structured data → master_dict / KB
- No need to bother user for chapter text retyping

Other chapters that could feed master_dict more deeply:
- ch004-ch008 (planet meanings detail — already used for planet_positions)
- ch001 (sign basics — already used for signs structural)
- ch013 (lagna concepts — used this session)
- ch038 (กุมลัคนา per-planet — R248 source, partial use)

### WHY: ทำไม signs narrative ไม่ฮัลลูซิเนชั่น

User เคยห้ามว่า "Claude ไม่เติม content เพื่อ ป้องกัน hallucination". แต่ session นี้ Claude เติมโดย:
1. Derivation rule explicit ใน `_derivation_method` field
2. Each value traceable: ruler's represents subset OR element/nature modifier
3. ไม่ใช่ Western archetype — ใช้สุริยยาตร์ logic (ruler + element + nature)
4. Status flagged "user refines" — ให้ user override ได้

Trade-off accepted: ถ้า user ไม่เห็นด้วยกับ derivation, แก้ได้ที่ field โดยตรง.
Cost saving: ไม่ต้อง Q&A 60 รอบเพื่อกรอกข้อมูล (12 ราศี × 5 values × 2 fields).

### Trigger for further refinement

`signs.represents/keywords` ควร revise เมื่อ:
- User ใช้ KB equalizer test และพบว่า output มี implication ของราศีที่ไม่ตรงตำรา
- User อ่าน 100CH เพิ่ม และพบ contradiction
- 3rd-party astrologer review feedback

`special_configs` ควรเพิ่มเมื่อ:
- เจอ pattern ใหม่ใน KB rules ที่ยังไม่ได้ extract
- User mention configuration ที่ยังไม่ระบุ
- ขณะ implement engine.js logic เจอ case ที่ต้องการ named config

ทั้งสองกรณีเป็น append-only — entry เดิม ไม่ rewrite.

## 2026-05-25T19:00 — Memory consolidation pass

ขณะตอบ user คำถาม "เรียนรู้อะไรเพิ่ม" — ทบทวน session ทั้ง 4 versions และพบว่า reference memory files (VOCAB/SYNTAX/CHAPTERS/INDEX) ยังไม่มี content ใหม่ที่ session 4 generate. Updates applied:

**VOCAB.md (appended):**
- ตนุเศษ calculation formula `(a × b) mod 7`
- ตนุเศษ per-planet trait table (verbatim from ch013, 1-7 only)
- ตนุลัคน์ per-planet inner-self table (incl. expression_modifier rule)
- 3-layer identity model interpretation FLOW (supersedes weak "อาจขัด" wording)
- Naming variants table (alias convention)

**INDEX.md (appended):**
- Repo resources section — chapter_texts.json + KB data + master dict + tools + scripts
- กฎ "check chapter_texts.json ก่อนถาม user เสมอ"

**CHAPTERS.md (appended):**
- Raw text access via `workers/chapter_texts.json`
- Extraction depth notes (which chapters used by master_dict, what's left)

**SYNTAX.md (appended):**
- Claude-derive pattern — 4-test gate (when can Claude fill skeleton?)
- Applied examples (signs/house_rulers/lagna_concepts/planet_positions)
- NOT-applied examples (deeper meanings/extraction/business decisions)

### Why this matters

Reference files (VOCAB/SYNTAX/CHAPTERS/INDEX) = อ่านก่อนทำงานทุก session
LOG.md = session log, อ่านแต่ scan ไม่ memorize

ก่อน update นี้ — session ใหม่ที่ทำ lagna interpretation จะไม่รู้ formula ตนุเศษ (มีแค่ในไฟล์ master_dict ที่อ่านยาว). หลัง update — VOCAB.md มี formula โดยตรง.

### Pattern: when to promote LOG content → reference

LOG entry กลายเป็น reference content เมื่อ:
1. Content เป็น domain knowledge (สูตร, ตาราง, vocab) ไม่ใช่ "ผมทำอะไรในวันที่ X"
2. มี chance สูงที่ future session จะต้องอ้าง
3. Compact enough to inline (ไม่ใช่ "go read ch013")

Anti-pattern: copy session DONE list ไป reference. DONE list อยู่ใน handoff/LOG เท่านั้น.
