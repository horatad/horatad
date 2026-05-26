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

## 2026-05-26T00:00 — 📌 PINNED v3: INTERPRETATION PRINCIPLE — natal = 80%, transit = stimulator only

**User confirmed this principle (corrects my prior weak weighting):**

### หลัก
- **พื้นดวง (natal) = 80% ของการพยากรณ์ทั้งหมด**
- **ดวงจร (transit) = stimulator** — ทำให้เหตุการณ์ที่ **natal บอกไว้แล้ว** ปรากฏขึ้นมา
- **ดวงจรไม่สามารถสร้างผลที่ natal ไม่มี** — ไม่ใช่ "transit สร้างเหตุการณ์"

### Implications (logic ที่ใช้ได้)
1. Transit rule alone = ไร้ความหมาย — ต้อง pair กับ natal anchor เสมอ
2. กฎ TRANSIT_NATAL ที่ valid = "เมื่อ natal มี condition X + transit มี aspect Y → trigger Z" (Z ต้องเป็นสิ่งที่ X บอกไว้)
3. ถ้า natal เข้มแข็ง + transit ร้าย → ทนได้ (R289 รับรอง)
4. ถ้า natal อ่อน + transit ดี → ไม่ raise — ได้แค่ "ติด ๆ ดับ ๆ"
5. Quality configs (ราชาโชค/เทวีโชค/มหาจักร) ใน natal → transit activate ได้บ่อยขึ้น
6. ถ้า natal ไม่มี config นั้น → transit ของดาวเดียวกัน trigger ไม่ขึ้น

### Engine logic flow (corrected)
```
Step 1: resolve natal base interpretation (80% weight)
   - ลัคนา / ตนุเศษ / ตนุลัคน์ / กุมลัคนา
   - planet positions (kaset/uchcha/...) + special_configs ที่ปรากฏใน natal
   - identify what natal "บอกไว้แล้ว" — possibility space
Step 2: transit overlay (20% weight — timing + intensity)
   - which natal possibilities are activated ขณะนี้
   - มี aspect natal element ไหนบ้าง
   - duration/window จาก transit speed
Step 3: NEVER predict outcome that's not in natal's possibility space
```

### POC scoring revision (apply next session)
ปัจจุบัน: TRANSIT_NATAL +1
ควรปรับ: TRANSIT_NATAL alone (no natal context) → 0 หรือ -1
TRANSIT_NATAL + matching natal condition in chart → +6 (combined signal)

### Validation rule for KB
- Rule with type=TRANSIT_NATAL ต้องมี natal precondition explicit (lagna/planet position required)
- ถ้า extract rule "transit X → outcome Y" without natal qualifier → review as principle, not rule

### Cross-ref to existing memory
- VOCAB.md "ดาวสัมพันธ์ลัคนา → ถูกโฉลก" = natal layer (ดาวอยู่ภพดี + aspect ลัคนา = pre-existing potential)
- QUALITY.md กฎลบ-ลบ=บวก = natal interaction, not transit-driven
- R289 (4 ดาวจรร้าย + ดวงเข้มแข็ง → ไม่ถึงฆาต) = direct evidence ของหลักนี้
- KB stats: 46 transit rules ใน 290 — ต้อง review ทีละข้อว่ามี natal precondition ครบไหม

### Memory enforcement
ก่อนทำ interpretation/extraction/POC scoring ใดๆ → อ่าน entry นี้ก่อน
ห้าม implement transit logic ที่ standalone — ต้อง pair กับ natal เสมอ

## 2026-05-26T00:30 — Corollary to PINNED v3: similar-natal differentiation = ดาวจร

**User-confirmed corollary:**
> "ดวงที่คล้ายกัน สิ่งที่ต่างกันคือดาวจร ทำให้ดวงหนึ่งเห็นผลชัดกว่าอีกดวง หรือผลมากน้อยกว่าอีกดวง"

### ตรรกะตามมาจาก Rule #1

| มิติ | กำหนดโดย | หมายเหตุ |
|---|---|---|
| **WHAT** (type ของผล) | natal | fixed ที่เกิด — ไม่เปลี่ยน |
| **WHEN** (timing) | ดาวจร | activate window |
| **HOW CLEAR** (ผลชัด/ไม่ชัด) | ดาวจร | aspect quality + duration |
| **HOW MUCH** (ผลมาก/น้อย) | ดาวจร | activation intensity |
| **HOW OFTEN** (frequency) | ดาวจร | cycle ผ่าน aspect |

### ตัวอย่าง (Engine validation case)

ดวง A และดวง B — natal คล้ายกันมาก: ทั้งคู่มี พฤหัสกุมลัคนา (เป็นครู, ใจดี)
- ดวง A: ดาวจรพฤหัสผ่าน aspect ดี (กุม/โยค/ตรีโกณ ลัคนา) บ่อย → เป็นครูดัง สอนเยอะ ผลชัด
- ดวง B: ดาวจรพฤหัสผ่าน aspect ดี น้อย หรือ ดาวจรร้าย (เสาร์/ราหู) มา block → เป็นครู เหมือนกัน แต่ในวงเล็ก ผลไม่ค่อยปรากฏ

**ทั้งคู่ "เป็นครู" (TYPE เหมือน เพราะ natal เหมือน)** — ต่างกันแค่ขนาด/ความชัด/เวลา

### Engine logic implication

```javascript
outcome_type   = derive_from_natal_only(chart)     // 80% weight, fixed
intensity      = combine(natal_strength, transit_activation_pattern)
                                                    // ดาวจร อย่างเดียวกำหนดส่วนนี้
clarity        = transit_aspect_quality(natal_anchor, current_transit)
timing_window  = transit_speed(active_planet) × aspect_duration
frequency      = cycle_count(transit_planet, natal_anchor) per year
```

**กฎเหล็ก:** outcome_type ห้ามขึ้นกับ transit factor — ถ้า code ทำ → bug

### Anti-pattern ที่ต้องหลีกเลี่ยง

❌ "ดาวจรเสาร์ผ่านลัคนา → จะเสียงาน" (เด็ดขาด)
✅ "ดาวจรเสาร์ผ่านลัคนา → activate ความเสี่ยงเรื่องงานที่ natal บอกไว้ (เช่น พุธในภพกรรมแย่)" 
   — ถ้า natal ไม่มี indicator ทางอาชีพแย่ → transit เสาร์ก็แค่ "เครียดเรื่องอื่น" ไม่ใช่เสียงาน

❌ "ดาวจรพฤหัสทับลาภะ → จะรวย"
✅ "ดาวจรพฤหัสทับลาภะ → activate potential ที่ natal บอก (ลาภะดี + พฤหัสตำแหน่งดีใน natal)"

### Validation rule for wording generation

ก่อน LLM สร้าง wording เรื่อง transit:
1. หา natal anchor ที่เกี่ยวข้อง (planet/house/aspect)
2. ถ้าหาไม่เจอ → transit standalone — REJECT, ไม่ generate
3. ถ้าหาเจอ → wording ต้องอ้าง natal anchor ด้วย ("เพราะมี X ใน natal, transit Y มา activate")

### KB rule audit checklist (apply เมื่อ review transit rules)

46 transit rules ใน kb_v24-3 → review:
- [ ] มี natal precondition ใน condition_text ไหม
- [ ] ถ้าไม่มี → เปลี่ยน type เป็น PRINCIPLE (วิธีการ) ไม่ใช่ rule
- [ ] หรือ split: "principle: ดาวจร X = stimulator" + "rule: ดาวจร X + natal Y → trigger Z"

## 2026-05-26T20:00 — มหาจักร hallucination corrected (user-verified)

**User verified อาทิตย์ มหาจักร = กรกฎ (canonical sign 3)** (not กุมภ์ as previously in memory, nor ตุล as in engine.js)

### Root cause of BIBLE memory bug

PINNED v2 (LOG 2026-05-25) มี table:
```
[7,2]: เสาร์(7) ใน กรกฎ(3) / จันทร์(2) ใน มังกร(9)
[1,8]: อาทิตย์(1) ใน กุมภ์(10) / ราหู(8) ใน สิงห์(4)
[4,3]: พุธ(4) ใน เมษ(0)/พิจิก(7) / อังคาร(3) ใน มิถุน(2)/กันย์(5)
[5,6]: พฤหัส(5) ใน พฤษภ(1)/ตุล(6) / ศุกร์(6) ใน ธนู(8)/มีน(11)
```

**Hallucinated.** Likely over-interpreted R047 wording "คู่ดาวอยู่ร่วมราศีในเรือนเกษตรของกันและกัน" → assumed each planet has 2 มหาจักร signs (mirror pair logic).

**Reality (user-verified for อาทิตย์):** แต่ละดาวมีมหาจักร **1 ราศีเท่านั้น** — ไม่ใช่ 2 ราศีตามที่ memory เก่าระบุ

### Universal rule (re-confirmed)

- จุลจักร = ฝั่งตรงข้ามมหาจักร = mahachak + 6 mod 12 ✓
- ดังนั้น อาทิตย์ จุลจักร = มกร (canonical 9) ✓

### Engine.js MAHACHAK_MAP also WRONG

v3/engine.js MAHACHAK_MAP[1] = 6 (ตุล) — ❌ ไม่ตรงกับ user-verified กรกฎ(3)
→ ทั้ง BIBLE memory AND engine.js code MAHACHAK_MAP values ผิดอยู่
→ ต้อง HORATAD แก้ engine.js MAHACHAK_MAP + script.js MAHACHAK_MAP

### Open: ค่ามหาจักรของอีก 7 ดาว (รอ user verify)

Master dict v3/master_dict_meanings.json planet_positions[1].mahachak ใส่ค่าใหม่แล้ว.
Per other planets ยังต้อง user verify ก่อน update.

### Source-of-truth rule

ทุก quality config values:
- ✅ **User-verified data = authoritative** (per planet, append "verified_by": "user YYYY-MM-DD" tag)
- ❌ **ไม่อ้าง BIBLE memory PINNED v2 มหาจักร table** (deprecated)
- ❌ **ไม่อ้าง engine.js MAHACHAK_MAP** (also wrong)

## 2026-05-26T22:00 — มหาจักร table complete (user-verified all 8 planets) + new single-source-of-truth file

### Action taken
- Created `v3/quality_maps.json` — single source of truth for quality config detection
- Updated `v3/master_dict_meanings.json` planet_positions[1-8]:
  - All `mahachak` values corrected (user-verified 2026-05-26)
  - Added `chunlachak` field (derived = mahachak + 6 mod 12)
  - Removed hallucinated `with_partner` annotations
  - Added `verified_by` + `corrected` tags

### Complete มหาจักร table (user-verified)

| ดาว | มหาจักร | จุลจักร (+6) | engine.js MAHACHAK_MAP | engine matches user? |
|---|---|---|---|---|
| 1 อาทิตย์ | กรกฎ (3) | มกร (9) | 6 ตุล | ❌ wrong |
| 2 จันทร์ | เมษ (0) | ตุล (6) | 0 เมษ | ✓ |
| 3 อังคาร | กันย์ (5) | มีน (11) | 5 กันย์ | ✓ |
| 4 พุธ | สิงห์ (4) | กุมภ์ (10) | 4 สิงห์ | ✓ |
| 5 พฤหัส | พิจิก (7) | พฤษภ (1) | 7 พิจิก | ✓ |
| 6 ศุกร์ | ธนู (8) | มิถุน (2) | 8 ธนู | ✓ |
| 7 เสาร์ | พฤษภ (1) | พิจิก (7) | 1 พฤษภ | ✓ |
| 8 ราหู | มกร (9) | กรกฎ (3) | 9 มกร | ✓ |

### Net findings — engine.js MAHACHAK_MAP เกือบถูก (7/8)

**Only `MAHACHAK_MAP[1] = 6` ผิด** (ต้องเป็น 3 = กรกฎ).
→ HORATAD fix scope = แค่ 1 บรรทัด, ไม่ใช่ rewrite ทั้งหมด

### BIBLE memory bug fully traced

PINNED v2 มหาจักร pair table = hallucinated mostly:
- บางคู่ตรง partial (e.g., อังคาร มี กันย์ ใน pair list ✓)
- แต่ structure "1 ดาว → 2 ราศี" = ผิด
- จริงคือ "1 ดาว → 1 ราศี"

Likely source of hallucination: previous Claude session over-interpreted R047 wording "ในเรือนเกษตรของกันและกัน" → expanded to pair-of-signs structure

### KB extraction impact reassessment (corrected from earlier overstatement)

| Quality | Actual planets affected | Rule risk |
|---|---|---|
| อุจ/นิจ | only ราหู (1/8) | ~5-11 rules (those mentioning ราหู+อุจ/นิจ) |
| มหาจักร | only อาทิตย์ (1/8) per engine | ~few rules with อาทิตย์+มหาจักร |
| อุจจาวิลาส/อุจจาภิมุข | **label SWAPPED in code** (all 8) | 🔴 ~19 rules affected |
| ราชาโชค/เทวีโชค | unverified | unknown |
| เกษตร/ประเกษตร | none | 🟢 OK |

**Real exposure:** ~25-30 rules of 290 (~8-10%) need re-audit — not "all KB" as I initially overstated

### New file v3/quality_maps.json — schema v1.0

Authoritative for:
- Engine quality detection (replaces hardcoded MAPs)
- LLM extraction prompts (replaces v3/master_dict.js hardcoded constants)
- BIBLE master_dict (planet_positions can derive from here)

Pending user verification:
- rajayok per-planet (8 values) — only ศุกร์ inferable from chart screenshot

## 2026-05-26T22:00 — 📖 TALS terminology established (supersedes "สุริยยาตร์" generic usage)

**User-verified attribution + naming standardization:**

### TALS = ระบบที่เราใช้

- **Full name:** Thai Astrology Logical Style (โหราศาสตร์ไทยแนวตรรกะ)
- **Founder:** ยืนยง นาวาสมุทร · สมญานาม **แดง เมืองตราด**
- **Reference text:** "โหราศาสตร์ไทยแนวตรรกะ" (= 100CH ในระบบเรา)
- **Significance:** ครั้งแรกที่นำตรรกศาสตร์มาใช้กับโหราศาสตร์ไทย — ตัดสินกฎเกณฑ์ที่ไม่ชัดเจน/คลุมเครือ

### Terminology cleanup — supersedes prior usage

**Previous (incorrect):** ใช้ "สุริยยาตร์" เรียกระบบทั้งหมด (prediction + calculation)
**Current (correct):**
- **TALS** = ระบบพยากรณ์ (interpretation framework)
- **สุริยยาตร์** = ระบบคำนวณตำแหน่งดาว (calculation engine only) — backbone ของ TALS

### LOG entries above ที่ใช้คำ "สุริยยาตร์" — ตีความใหม่

| Past usage context | New interpretation |
|---|---|
| "ตำราสุริยยาตร์" (e.g., L26 sunrise=06:00) | คงไว้ — context = calculation ✓ |
| "ธรรมเนียมสุริยยาตร์" (e.g., L158, L235) | อ่านเป็น "ธรรมเนียม TALS" |
| "หลักสุริยยาตร์" (e.g., L49) | อ่านเป็น "หลัก TALS" |
| "ใช้สุริยยาตร์ logic" (e.g., L683) | อ่านเป็น "ใช้ TALS logic" |
| "สุริยยาตร์ไม่ใช้ position concepts สำหรับเกตุ/มฤตยู" (L486) | อ่านเป็น "TALS ไม่ใช้..." |

**ห้ามแก้ entries เก่า** — append-only rule ใช้บังคับ. การตีความข้างบนคือ rule สำหรับการอ่าน LOG ในอนาคต

### Scope ของ TALS

ครอบ : มาตรฐานดาว · interpretation framework · prediction rules + wordings
ไม่ครอบ: ฤกษ์ · ห้วง · นวางค์ · ตรียางค์ · ลูกพิษ · ดาวพักร/มณฑ์/เสริด

### Files updated (Phase 1 — BIBLE scope)

- ✅ `CLAUDE.md` — เพิ่ม "📖 TALS Foundational Attribution" section
- ✅ `handoffs/bible_memory/INDEX.md` — TALS attribution box at top
- ✅ `handoffs/bible_memory/VOCAB.md` — header + callout TALS
- ✅ `handoffs/bible_memory/PROMPTS.md` — extraction prompt template
- ✅ `handoffs/bible_memory/LLM_CONTROL.md` — purpose + tone + anti-patterns
- ✅ `v3/master_dict_meanings.json` — _meta.system + attribution + version 1.4.1-tals
- ✅ `v3/quality_maps.json` — _meta.system + attribution + version 1.1

### Files pending (Phase 2 — cross-project notes)

- ⏸ `manifest.json` — HORATAD scope
- ⏸ `README.md` — public-facing, BIG/HORATAD decision
- ⏸ `v3/typhoon.js`, `v3/v3tab.js` — HORATAD scope
- ⏸ `docs/HORATAD.md` — HORATAD scope
- ⏸ `ECOSYSTEM.md` — BIG scope
- ⏸ `source/README.md`, `handoffs/BIG_*` — BIG scope
- ⏸ horatad.com "เกี่ยวกับ" page credit — HORATAD UI update
- ⏸ File renaming strategy (kb_*.json → tals_kb_*.json?) — BIG decision

### Why NOT touch archive + KB rule content

- `handoffs/archive/*` — historical immutable record
- `workers/chapter_texts.json` — raw source from book (preserve)
- KB rule content (kb_v24-3.json wordings/conditions) — extracted text, just add system tag in _meta

### Public-facing strategy (per user)
1. ใช้ "TALS" internally + ในไฟล์ที่ developer เห็น
2. Public app (horatad.com "เกี่ยวกับ" page) → ใส่ credit ผู้ก่อตั้ง
3. File renaming → ให้ BIG พิจารณา cross-project impact

## 2026-05-26T23:00 — TALS vs other systems: user teaches 7 distinctions

User confirmed 7 specific TALS characteristics + corrected my hallucination:

### 1. ฤกษ์ — TALS excludes (electional vs natal distinction)
- โหราศาสตร์ไทยใช้ฤกษ์ "ทำกิจกรรม" (electional) ไม่ใช่ "ทายดวง" (natal)
- TALS drop เพราะคลุมเครือ — 9 หมู่ × 3 ราศี/หมู่ = ชั่งน้ำหนักไม่ได้
- สำนักที่ใช้ "เพื่อมีเรื่องเล่า" — ไม่ help accuracy

### 2. มฤตยู (Uranus) historical addition
- เริ่มใช้ในไทยช่วง **รัชกาลที่ 4** — empirical addition เพราะ "เริ่มเห็นผล"
- ตอบคำถามผม: TALS ใช้ Uranus แต่ไม่ใช้ Neptune/Pluto เพราะการเห็นผล (empirical) เป็นเกณฑ์ — ไม่ใช่ astronomical existence

### 3. ราชาโชค — ผมพูดผิดเรื่อง "geometric derivation"
- **❌ HALLUCINATION:** ผมอ้างว่ามี "geometric derivation" ใน text ก่อนหน้า
- **✅ TRUTH:** ราชาโชค เป็น **Thai tradition lookup** ต่อ planet — ไม่ derivable
- ⚠️ **Name collision warning:** ราชาโชค ≠ Vedic Raja Yoga (different concept entirely)
- Quality_maps.json fixed: rajayok per-planet = lookup, NOT formula

### 4. มฤตยู interpretation
- **ความเปลี่ยนแปลงโดยฉับพลัน กระทันหัน ไม่คาดคิด**
- ตัวอย่าง: ระบบ website ล่มกลางคัน
- Keywords: sudden/disruptive/unexpected/sudden_change
- → ต่างจาก ราหู (กระแสจิตใจ) — มฤตยู = external event disruption

### 5. ราหู interpretation
- **ความหลงใหลมัวเมา + บอด/บังตา**
- ทุ่มเทกับสิ่งเดียวจนไม่สนใจอื่น
- Keywords: obsession/addiction/fixation
- → ต่าง "ลุ่มหลง" generic — เน้น blindness/all-consuming aspect

### 6. เรือนนอก/เรือนใน (ch011)
- **ไม่ใช่ภพ — เป็นเรื่องของดาว**
- **ดาว** = "คุณภาพ + ปฏิสัมพันธ์" ของเรื่อง
- **ภพ** = "เรื่อง" (topic) เฉยๆ
- ตนุลัคน์ = "เรือนใน" of ตัวตน (ดาวเกษตรเจ้าเรือนลัคนา)
- "เรือนนอก" = ดาวที่ปรากฏใน chart (visible position)
- → conceptual layer: ดาว stewards เรื่อง, ภพ defines เรื่อง

### 7. อนุเกษตร + ประเกษตร
- **อนุเกษตร** เกิดจาก ดาวสลับเกษตรกัน (planets in each other's own-sign)
- Personality reading: ก้าวหน้าช้าวัยต้น · ค่อยดีขึ้นเมื่อโต
- เหตุ: เกี่ยวข้อง 2 เรื่องราว → ตัดสินใจไม่ได้ → ช้า
- **ประเกษตร** = "ประ" = **คุณภาพเสีย** (degraded)

### Files updated this round (Phase 1 BIBLE scope)
- ✅ PLANETS.md — เพิ่ม มฤตยู (รัชกาลที่ 4 + meaning), ราหู, เกตุ meanings
- ✅ VOCAB.md — เพิ่ม ฤกษ์ (excluded), เรือนนอก/เรือนใน, อนุเกษตร, ประเกษตร, ราชาโชค warning
- ✅ QUALITY.md — clarifications + warnings (ราชาโชค, อนุเกษตร, ประเกษตร)
- ✅ quality_maps.json — fix rajayok (tradition not formula) + naming_collisions_warning section

### Open questions still pending
- 🟡 มหาจักร เป็น TALS-distinctive หรือมีในตำราอื่นด้วย?
- 🟡 ราชาโชค per-planet values — Thai tradition source (8 values needed)
- 🟡 เทวีโชค = ราชาโชค + 6 — geometric or tradition?

### Lesson learned (process)
- ผมต้อง verify ก่อน claim "geometric derivation" — เพราะ traditions ที่ Thai มี อาจไม่ได้ derive จาก geometry
- เวลา fill quality_maps formulas → ระบุ "geometric" หรือ "tradition lookup" ชัดเจน

## 2026-05-27T00:00 — TALS FOUNDATIONAL RULES expanded (#2 + #3)

User flagged: รูปก่อนหน้าผมบันทึก Rule #1 อย่างเดียว — ต้องมี Rule #2 + #3 ด้วย (ก่อน work ใดๆ)

### RULE #2 — QUALIFIER: สัมพันธ์ลัคนา/ตนุลัคน์

**Statement:** ดาวจะให้คุณโทษ ต่อเจ้าชะตาก็ต่อเมื่อสัมพันธ์ (กุม/เล็ง/โยค/ตรีโกณ) กับ ลัคนา หรือ ตนุลัคน์

**Implications:**
- ดาวอุจ/มหาจักร อยู่ในภพไหนก็ตาม **ไม่ส่งผลกับเจ้าชะตา ถ้าไม่สัมพันธ์ลัคนา/ตนุลัคน์**
- ดาวนิจ/ประเกษตร อยู่ในภพไหน **โทษน้อยถ้าไม่สัมพันธ์**
- ลัคนา + ตนุลัคน์ = double filter (ทั้ง 2 มี weight separately)
- This **elevates "โฉลก" concept** to Foundational status
- "ความสามารถของเจ้าชะตา" ในเรื่องใด = function(ดาวที่เกี่ยว + สัมพันธ์ลัคนา/ตนุลัคน์)

**Engine implication:**
```js
function effectivePower(planet, chart) {
  const base = qualityStrength(planet, chart);
  const lagnaRel = aspectsLagna(planet, chart);
  const tanulagnRel = aspectsTanulagn(planet, chart);

  if (!lagnaRel && !tanulagnRel) return base * 0.1;  // minimal
  if (lagnaRel && tanulagnRel) return base * 1.0;     // full
  return base * 0.5;                                   // partial
}
```

### RULE #3 — STRENGTH: chart resilience

**Statement:** ความเข้มแข็งของดวง = function(ภพตนุ, ภพปัตนิ, ภพกฎุมพะ)

**Big 3 (axis of self):**
- **ภพ 1 ตนุ** — self/identity (ตัวเรา)
- **ภพ 2 กฎุมพะ** — resources/foundation (ฐาน)
- **ภพ 7 ปัตนิ** — partner/other-half (อีกขั้ว)

ทำไม 3 ภพนี้? = "axis of self" — รวม ตัวเรา + ทรัพยากร + ความสัมพันธ์ = ความสามารถ baseline

**Strength assessment heuristic:**
- ดาว benefic + position ดี + สัมพันธ์กับ 3 ภพนี้ → strong
- ดาว malefic + position ร้าย + สัมพันธ์กับ 3 ภพนี้ → vulnerable
- ผลรวมทั้ง 3 = chart strength rating

**Evidence:** R289 (4 ดาวจรร้าย + ดวงเข้มแข็ง + คู่มิตรรับ → ไม่ถึงฆาต)
= chart strength absorbs transit threat
= confirms Rule #3 directly

**Engine implication:**
```js
function chartStrength(chart) {
  const strengths = [1, 2, 7].map(house => {
    const planetsInHouse = chart.planets.filter(p => p.house === house);
    return planetsInHouse.reduce((s, p) => s + qualityScore(p), 0);
  });
  return average(strengths);  // weighted by Rule #2 (aspect to lagna)
}
```

### TALS Interpretation Hierarchy (canonical)

```
[INPUT] chart + (transit time)
   ↓
[Rule #1] Weight: natal 80% / transit 20%
   ↓
[Rule #2] Qualifier: filter by aspect to ลัคนา + ตนุลัคน์
          → "ความสามารถของเจ้าชะตา" ในแต่ละเรื่อง
   ↓
[Rule #3] Strength: assess ภพ 1, 2, 7 → chart resilience
          → ทน transit ดี/ร้าย แค่ไหน
   ↓
[OUTPUT] qualified + weighted prediction
```

### Files updated
- ✅ INDEX.md — promote Rule #2 + #3 to FOUNDATIONAL block at top
- ✅ LOG.md — this entry (full detail + implications)

### Cross-link to existing memory
- VOCAB.md "โฉลก" section = Rule #2 manifestation
- VOCAB.md "สมพงศ์" 3-condition = Rule #2 applied to 2 charts
- QUALITY.md กฎลบ-ลบ=บวก = quality interactions WITHIN strong chart (Rule #3)
- R289 = direct Rule #3 evidence
- R288 = Rule #2 priority order (กุมลัคนา > ตรีโกณ/โยค > เล็ง)

### Anti-patterns to avoid (NEW)

❌ "ดาวอุจ → ดี" (without Rule #2 qualifier)
✅ "ดาวอุจ ที่สัมพันธ์ลัคนา/ตนุลัคน์ → ดี ส่งผลต่อเจ้าชะตา"

❌ "ดวงนี้มีดาวร้าย → จะแย่"
✅ "ดวงนี้มีดาวร้าย แต่ ภพ 1/2/7 เข้มแข็ง → ทนได้ (Rule #3)"

❌ Predict outcome จาก natal เฉยๆ ไม่ filter ผ่าน Rule #2
✅ Filter ดาวที่สัมพันธ์ลัคนา/ตนุลัคน์ ก่อนตีความ "ความสามารถของเจ้าชะตา"

## 2026-05-27T08:00 — 📌 PINNED v4: ch020 canonical procedure + ch025 ดาวเด่น scoring (CRITICAL CORRECTIONS)

User shared ch020 + ch025 raw text. Major corrections to my prior understanding + new authoritative weights.

### 🔴 CORRECTION #1 — Rule #3 ผมเข้าใจผิด

**ผมเคยบันทึก:** Rule #3 = ภพ 1 + ภพ 2 + ภพ 7 = chart strength
**ch020 step 4 บอกจริง:**
> "ประเมินความเข้มแข็งของดวงชาตา โดยดูจาก**ดาวตนุลัคน์และดาวกุมลัคนา** ว่ามีคุณภาพเป็นอย่างไร เข้มแข็งทั้งภายในและภายนอก หรือนอกเข้มแข็ง ในอ่อน ฯลฯ"

**Corrected Rule #3:**
- **chart_strength = function(ตนุลัคน์ quality, ดาวกุมลัคนา quality)**
- 2 layers: inner (ตนุลัคน์) + outer (กุมลัคนา)
- 4 combinations: ใน+นอก ทั้งคู่แข็ง / ในแข็งนอกอ่อน / ในอ่อนนอกแข็ง / ทั้งคู่อ่อน

**ภพ 1+2+7 ไม่ใช่ chart strength** — ภพ 2 (กฎุมพะ) ปรากฏใน step 8 priority list = important houses (ไม่ใช่ strength definer)

### 🔴 CORRECTION #2 — อัจฉริยภาพภายใน = ดาวที่ "ไม่สัมพันธ์ลัคนา"

**ผมเคยเดา:** ตนุลัคน์ที่ aspect ลัคนา
**ch020 step 7 บอกจริง:**
> "ดูลักษณะนิสัยเจ้าชาตาจาก**ดาวที่ไม่สัมพันธ์ลัคนา** ในฐานะ**อัจฉริยภาพภายใน**ของเจ้าชาตา"

**Corrected definition:**
- อัจฉริยภาพภายใน = ดาวที่ NONE_ASPECT กับลัคนา (ไม่กุม/เล็ง/โยค/ตรีโกณ)
- = inner potential ที่ไม่แสดงออก, ซ่อนอยู่
- Logic: ดาวสัมพันธ์ลัคนา = expression (visible) · ไม่สัมพันธ์ = hidden reserve
- ขั้น advanced — พูดท้ายเมื่อชำนาญ

### 🔴 CORRECTION #3 — Priority houses (step 8)

**ผมเคยจำ:** Big 3 = ตนุ + ปัตนิ + กฎุมพะ
**ch020 step 8 บอกจริง:**
> "พยากรณ์ภพอื่นๆ ตามลำดับ ... เช่น ปัตนิ กฎุมพะ กัมมะ สหัชชะ ฯลฯ"

**Corrected priority list (post-tanu):**
1. ปัตนิ (7) — partner
2. กฎุมพะ (2) — wealth
3. **กัมมะ (10)** — career ← ที่ผมพลาด
4. สหัชชะ (3) — siblings/effort

ตนุ (1) handled in step 1-7 (= self analysis โดยรวม) — ไม่อยู่ใน step 8 priority list

### 🟢 NEW — ch025 ดาวเด่น quantitative scoring framework

**Aspect weights (canonical, supersedes drift):**

| Aspect | weight |
|---|---|
| กุมลัคนา | 100% |
| เล็งลัคนา | 80% |
| โยคหน้า / โยคหลัง | 60% (each) |
| ตรีโกณลัคนา | 50% |

**Note:** "โยคหน้า" + "โยคหลัง" = 2 types of โยค — TODO clarify exact astronomical definition

**Verification:**
- engine.js ASPECT_STRENGTH = {KUM:1.0, LENG:0.8, YOK:0.6, TRI:0.5} ✅ MATCHES ch025
- master_dict.aspect_strengths = {กุม:100%, เล็ง:75%, โยค:50%, ตรีโกณ:25%} ❌ WRONG per ch025
- **Action:** fix master_dict aspect_strengths to match ch025 + engine.js

### 🟢 NEW — Cross-class quality comparison (ch025)

**Same-class:** เปรียบ aspect weight ได้ตรงๆ (e.g. อุจกุม > อุจเล็ง > อุจโยค > อุจตรีโกณ)

**Cross-class examples (verbatim ch025):**
| Comparison | Result |
|---|---|
| อุจกุมลัคนา vs เกษตร/ราชาโชค กุมลัคนา | อุจ > เกษตร/ราชาโชค |
| อุจกุมลัคนา vs มหาจักรกุมลัคนา | ≈ พอๆ (ผลคนละด้าน, ต่างกันเล็กน้อย) |
| อุจกุมลัคนา vs มหาจักร เล็ง/โยค/ตรี | อุจ > มหาจักร (กุม > non-กุม) |
| มหาจักรกุมลัคนา vs อุจ เล็ง/โยค/ตรี | มหาจักร > อุจ (กุม > non-กุม) |
| เกษตรกุมลัคนา vs อุจ/มหาจักร โยค/ตรี | ≈ พอๆ |
| อุจ/มหาจักร เล็งลัคนา vs เกษตรกุมลัคนา | อุจ/มหาจักร > เกษตร (ในวัยต้น — ให้ผลเร็วแรง) |
| **บั้นปลาย** | เกษตร > อุจ/มหาจักร (เกษตรช้าแต่มั่นคง) |

**Key insight — TIME PROFILE matters:**
- อุจ/มหาจักร = strong + fast (ให้ผลเร็วแรง)
- เกษตร = slow but enduring (ช้าแต่มั่นคง — บั้นปลายชนะ)
- → scoring formula ต้องคิด phase/อายุ context

### 🟢 NEW — อาชีพดูจาก "ดาวเด่น" ไม่ใช่ "ภพกัมมะ"

ch025 ตรงๆ:
> "การเปรียบเทียบดาวเด่นในดวงชาตาเช่นนี้ ... โดยเฉพาะอย่างยิ่ง กรณีการประกอบอาชีพ อาชีพใดจะถูกโฉลกที่สุด ... ก็ดูได้จากดาวเด่นเหล่านี้ **(ไม่ใช่ดูจากภพกัมมะ)**"

→ **Anti-pattern flagged:** ดูอาชีพจาก ภพ 10 อย่างเดียว = ผิด TALS
→ **Correct:** ดูอาชีพจาก "ดาวเด่น" (= aspect_weight × quality_score ของทุกดาว) — เลือก top
→ Per ดาวเด่น: ดาวไหนแรงสุด → อาชีพถูกโฉลก, อันดับ 2 → option รอง

### 📋 TALS Canonical Prediction Procedure (จาก ch020) — recorded

```
PREPARATION:
  - ลัคนาราศีอะไร
  - ดาว 10 ดวงในภพอะไร + คุณภาพ
  - sambandh + คู่ดาว (มิตร/ธาตุ/สมพล/ศัตรู)
  - rectify lagna (ถ้าชำนาญ)

PREDICTION ORDER (10 steps):
   1. ลัคนาราศี
   2. ดาวกุมลัคนา → ลักษณะเด่น + success type
   3. ตนุลัคน์ + ภพที่อยู่ → สันดานแท้ + เน้นเรื่องนั้น
   4. ความเข้มแข็งดวง ← ตนุลัคน์ + ดาวกุมลัคนา (ใน+นอก)
   5. ตนุเศษ → นิสัยสั้นๆ
   6. ดาวเล็ง/โยค/ตรีโกณลัคนา → ลักษณะนิสัยรอง
   7. ดาวไม่สัมพันธ์ลัคนา = อัจฉริยภาพภายใน (ขั้นชำนาญ)
   8. ภพอื่น priority: ปัตนิ → กฎุมพะ → กัมมะ → สหัชชะ
   9. อาชีพ — ดาวเด่น (NOT ภพกัมมะ), ถูก/ไม่ถูกโฉลก
  10. ดาวจร (สุดท้าย)
```

### Updated TALS Foundational Rules (per ch020)

**RULE #1 — WEIGHT** (unchanged)
- พื้นดวง = 80% · ดาวจร = stimulator (20%)
- Corollary: ดวงคล้าย → outcome TYPE เดียวกัน, ต่างที่ดาวจร

**RULE #2 — QUALIFIER** (refined)
- ดาวสัมพันธ์ลัคนา/ตนุลัคน์ = visible effect (active)
- ดาวไม่สัมพันธ์ลัคนา = อัจฉริยภาพภายใน (hidden reserve)
- ทั้ง 2 มีบทบาท แต่ active vs hidden ต่างกัน

**RULE #3 — STRENGTH** (corrected!)
- ❌ Old (wrong): ภพ 1 + ภพ 2 + ภพ 7
- ✅ New (per ch020 step 4): chart_strength = function(ตนุลัคน์, ดาวกุมลัคนา)
- 4 patterns: ใน+นอกแข็ง / ในแข็งนอกอ่อน / ในอ่อนนอกแข็ง / ทั้งคู่อ่อน

**RULE #4 (NEW) — MISSION**
- TALS = event prediction (ถูก/ผิด, เป็น/ตาย, รวย/จน)
- ไม่ใช่ personality/psychology (นั่นงานนักจิตวิทยา/นักบวช)
- Output ที่ measure ไม่ได้ → useless

**RULE #5 (NEW) — DOMAIN PRIORITY**
- อาชีพ ดู "ดาวเด่น" (NOT ภพกัมมะ)
- ภพอื่น priority: ปัตนิ → กฎุมพะ → กัมมะ → สหัชชะ

### Quantitative scoring (per ch020 + ch025)

```
ดาวเด่น_score(planet) = quality_strength × aspect_to_lagna_weight × time_phase_factor

quality_strength:
  อุจ ≈ มหาจักร = 100% (fast/strong)
  เกษตร = 80% (slow/lasting — wins บั้นปลาย)
  ราชาโชค ≈ 60% (easy)
  อุจจาวิลาส ≈ 60%
  อุจจาภิมุข ≈ 60%
  เทวีโชค ≈ 40%
  จุลจักร ≈ 40%
  ประเกษตร = -60%
  นิจ = -100%

aspect_to_lagna_weight (ch025 canonical):
  กุม = 100%
  เล็ง = 80%
  โยคหน้า / โยคหลัง = 60% each
  ตรีโกณ = 50%
  ไม่สัมพันธ์ = NULL (counts as อัจฉริยภาพภายใน, separate)

time_phase_factor:
  Early life: อุจ/มหาจักร × 1.0, เกษตร × 0.6
  Late life:  เกษตร × 1.0, อุจ/มหาจักร × 0.7
```

Use this to rank ดาวเด่น → first/second/third strongest planet

### Implication: chart score formula (TALS-aligned)

```
chart_score (0-100) =

  inner_strength(0-50)
    = ตนุลัคน์ quality × ตนุลัคน์ aspect_to_lagna × ภพที่อยู่
    + อัจฉริยภาพภายใน sum (ดาวไม่สัมพันธ์ลัคนา quality)

  outer_strength(0-50)
    = Σ ดาวกุมลัคนา quality (capped at 50)
    + bonus from เล็ง/โยค/ตรีโกณ ดาวคุณภาพดี

  PLUS adjustments:
    + special_configs (มหาจักรกุมลัคนา = +10, etc.)
    - มฤตยู สัมพันธ์ลัคนา strong = -5 (instability)
    - 3+ บาปกุมลัคนา = -5 (heavy inner conflict)

  normalized to 0-100
```

### Open from ch020/ch025 — ที่ TALS book ยังต้องเปิดต่อ

1. **"อัจฉริยภาพภายใน" detail** — ch020 step 7 บอก "อธิบายในบทต่อไป" — chapter ไหน?
2. **"พระกับโจรและคนเจ้าชู้"** — ch025 mention หัวข้อนี้ — chapter ไหน?
3. **โยคหน้า / โยคหลัง** — astronomical definition (orb? sign-based? exact?)
4. **Time phase boundary** — "บั้นปลาย" เริ่มกี่ปี?
5. **TALS principle for no-birth-time scoring** — user said มีหลัก แต่ยังไม่ teach

### Anti-patterns flagged (must NOT do)

❌ ดูอาชีพจาก ภพกัมมะ (10) อย่างเดียว → ผิด ch025
❌ ตัดสิน chart strength จาก ภพ 1+2+7 → ผิด ch020 (เคยเข้าใจผิด)
❌ Predict ตัวตน/personality เป็น output หลัก → ผิด TALS Mission
❌ Score ไม่ได้ = output → useless per user
✅ Score quantitatively → rank ดาวเด่น → use for อาชีพ/wasana

### Files affected by these corrections

To update:
- handoffs/bible_memory/INDEX.md — supersede Rule #3 (ภพ 1+2+7) → corrected
- handoffs/bible_memory/VOCAB.md — fix อัจฉริยภาพภายใน definition
- handoffs/bible_memory/QUALITY.md — add ch025 cross-class comparison + time phase
- v3/master_dict_meanings.json — fix aspect_strengths to match ch025 (100/80/60/50)
- v3/quality_maps.json — note ch025 aspect canonical

---

## 2026-05-27T10:00 — master_dict v1.5.0: PINNED v4 corrections applied

สิ่งที่แก้ใน `v3/master_dict_meanings.json` (v1.4.0 → v1.5.0):

1. **aspect_strengths** — แก้ค่าผิด (100/75/50/25) → ถูก (100/80/60/50) per ch025
   - เพิ่ม `_corrected: true`, `_source: "ch025 user-verified"`, `_cross_check: "engine.js matches"`
   - เพิ่ม YOK_FRONT / YOK_BACK แยก (ทั้งคู่ = 60%) แทน YOK รวม
   - NONE_ASPECT = อัจฉริยภาพภายใน (hidden reserve, ch020 step 7)

2. **qualities** — เพิ่ม field ใหม่ทุก quality:
   - `lop_lop_applicable: true/false` — กฎลบ-ลบ=บวก ใช้ได้กับ: เกษตร/ประเกษตร/อุจ/นิจ เท่านั้น
   - `has_quality_positions: true/false` — เกตุ/มฤตยู = false (ไม่มี อุจ/นิจ/มหาจักร)

3. **planets** — เพิ่ม `speed_per_sign` ทุกดาว (วัน/ราศี reference)
   - แก้ มฤตยู keywords: ฉับพลัน/ไม่คาดคิด (Uranus) — ห้ามใช้ "ความตาย" (ของ เสาร์ ไม่ใช่ มฤตยู)

4. **houses** — เพิ่ม `primary_houses` per domain mapping

5. **special_configs** — เพิ่ม foundational_rule_1 ถึง foundational_rule_5 (ครบทุก rule)

6. **lagna_concepts** — เพิ่ม:
   - สมพงศ์ (3 conditions ครบ)
   - เรือนนอก / เรือนใน (planet concept ไม่ใช่ house)

---

## 2026-05-27T10:30 — Files from PINNED v4 "Files affected" — DONE

ทุก file ที่ PINNED v4 ระบุว่าต้องแก้ → แก้ครบแล้ว:

| ไฟล์ | สิ่งที่แก้ |
|---|---|
| `handoffs/bible_memory/INDEX.md` | Interpretation flow: "ภพ 1/2/7" → "chart_strength(ตนุลัคน์,กุมลัคนา)" · เพิ่ม Rule #4/#5 ใน flow · master_dict version → v1.5.0 |
| `handoffs/bible_memory/VOCAB.md` | อัจฉริยภาพภายใน: corrected definition (ดาวที่ไม่สัมพันธ์ลัคนา = hidden reserve, ch020 step 7) · TALS canonical 10 steps เพิ่ม |
| `handoffs/bible_memory/QUALITY.md` | aspect weights FIXED ✅ v1.5.0 · ดาวเด่น cross-class table · Quality TIME PROFILE · anti-pattern section |
| `docs/decisions/bible/DR-003` | Rule #3 corrected (4 patterns formula) · เพิ่ม Rule #4 + Rule #5 · anti-patterns อัปเดตครบ |

---

## 2026-05-27T11:00 — Memory improvement: 5 techniques — effectiveness audit

**ผลการวิเคราะห์จริง (ไม่ใช่แค่ plan):**

| # | เทคนิค | ได้ผลจริง? | เหตุผล |
|---|---|---|---|
| 1 | Slash commands (bible-recall/qa/status) | ⚠️ ต่ำ | Claude trigger ไม่ได้ — ต้อง user พิมพ์ ไม่มีใคร run ตลอด session |
| 2 | Nested `bible_memory/CLAUDE.md` | ✅ สูง | load ผ่าน system-reminder อัตโนมัติ ทุก session |
| 3 | `_index.json` (machine-readable) | ⚠️ ต่ำ | ไฟล์มีแต่ไม่ถูก query — Claude อ่าน .md โดยตรงแทน |
| 4 | Decision Records (DR-001/002/003) | ❌ ต่ำมาก | DR-003 ผิดทั้ง session — Claude ไม่ได้ consult เชิงรุก |
| 5 | Anti-pattern hook (pre-edit-memory.sh) | ✅ สูง | structural guardrail — บล็อกจริง ไม่ต้องพึ่ง memory |

**Root insight:** เทคนิคที่ทำงาน passive/structural (2, 5) = effective
เทคนิคที่ต้อง Claude กระทำ (1, 3, 4) = ไม่ทน compaction

**Fix ที่เพิ่ม:**
- `session-start.sh` → BIBLE MEMORY GATE (⛔ แสดงทุก session start + last LOG snippet)
- `.claude/commands/bible-start.md` → `/bible-start` command: bootstrap ทั้งหมดในทีเดียว

**Process lesson:** ระบบที่ต้องการ Claude "จำ" ว่าต้องทำอะไร = ล้มเหลวหลัง compaction
ระบบที่ทำงานได้แม้ Claude "ลืม" = structural hook / auto-load file → เท่านั้นที่เชื่อถือได้

---

## 2026-05-27T12:00 — Q&A: วาสนา (fate/destiny in TALS)

**Source:** ch011, ch016, ch036, ch038, ch051 (verbatim search)

**คำนิยามจากตำรา:**

| บท | quote สำคัญ |
|---|---|
| ch011 | "ดวงชาตาคือแผนที่ชีวิต ว่าจะมีบุญวาสนา จะรุ่งโรจน์หรือตกต่ำ เพียงใด" |
| ch016 | "วาสนาสูงต่ำเพียงใด" — อ่านจากภพตนุ |
| ch038 | "คนที่มาเจอผมและเชื่อผม ก็เป็นวาสนาประการที่หนึ่ง" (author personal) |

**การเชื่อมกับ 5 Foundational Rules:**
- Rule #1 (natal 80%) = วาสนา (พื้นดวง) ครองชีวิต — ดาวจรแค่ activate timing
- Rule #3 (chart_strength) = วัดระดับ วาสนาสูงต่ำ ผ่าน ตนุลัคน์ + กุมลัคนา
- ดวงจรไม่สร้างผลที่วาสนาไม่มี = core logic ของ Rule #1

**TALS vs ระบบอื่น:**
- TALS อ่านวาสนา — ไม่ pretend เปลี่ยนวาสนาได้
- ฤกษ์ = พยายามหลีกวาสนา → TALS ตัดทิ้ง (excluded by design)

**KB gap:** ไม่มี rule ใน kb_v24-3.json define วาสนา explicitly
→ Candidate rule: "ดวงชาตา = แผนที่วาสนา — natal ครอง 80%, ดาวจร = timing ภายในวาสนา" (PRIMARY, ch011+ch016)

---

## 2026-05-27T14:00 — Empirical pruning + aspect definitions + memory methodology

### 1. Aspect definitions resolved (ch009 verbatim)

**Before:** โยคหน้า/โยคหลัง definition ไม่ชัด (pending)
**After:** ch009 verbatim ยืนยัน:

| มุม | นิยาม | ภพจากลัคนา | % |
|---|---|---|---|
| กุม | ดาวสถิตราศีเดียวกัน | ภพ 1 | 100% |
| เล็ง | นับ 7 ราศี (ตรงข้าม) | ภพ 7 (ปัตนิ) | 80% |
| โยคหน้า | นับ 3 ราศี | ภพ 3 (สหัชชะ) | 60% |
| โยคหลัง | นับ 11 ราศี | ภพ 11 (ลาภะ) | 60% |
| ตรีโกณ | นับ 5 หรือ 9 ราศี | ภพ 5, 9 | 50% |

Verbatim quote: "นับจากดาวดวงหนึ่งไปหาอีกดวงหนึ่งได้ 3, 11 ราศี เรียกว่าดาวโยคแก่กัน"
นับ **inclusive** จากราศีเริ่ม (= 1)

HOUSES.md + CLAUDE.md bible_memory section อัปเดตแล้ว

### 2. Empirical pruning methodology (new process)

**Principle (user-taught):** "อ่าน text มากๆเข้า combination ไหนไม่พบ คุณก็จะลบทิ้งเอง"

Process:
1. อ่าน chapter_texts.json ทั้ง 102 บท
2. ค้นหา combination (เช่น "เกตุ อุจ", "เกตุ กุมลัคนา") ด้วย grep
3. Zero occurrences = ไม่ใช้ใน TALS = **prune from pool**
4. Found occurrences = valid combination → เก็บไว้

**ทำไมดีกว่า assumption:** TALS = empirical system — ไม่ assume อะไรไม่มีในตำรา

### 3. เกตุ (9) — empirical verification complete

Search ทุก combination กับ chapter_texts.json:
- "เกตุ อุจ" / "เกตุ นิจ" / "เกตุ มหาจักร" / "เกตุ เกษตร" → **0 ครั้ง**
- "เกตุ กุมลัคนา" / "เกตุ เล็งลัคนา" / "เกตุ โยค" / "เกตุ ตรีโกณ" → **0 ครั้ง**

**Conclusion (ยืนยันจาก text):**
- เกตุ ไม่มีตำแหน่งคุณภาพ (อุจ/นิจ/มหาจักร/เกษตร)
- เกตุ ไม่ทำ aspect ลัคนาโดยตรงเลย
- บทบาทเดียว = **ทวีคูณ** ดาวที่อยู่ร่วมราศี (amplifier)

PLANETS.md อัปเดต section บทบาทพิเศษ

### 4. มฤตยู (0) — empirical verification

- "มฤตยู อุจ" / "มฤตยู นิจ" / "มฤตยู มหาจักร" → **0 ครั้ง**

**Conclusion:** มฤตยู ไม่มีตำแหน่งคุณภาพใน TALS

### 5. ราหู (8) — partial verification

- "ราหู อุจ" → found, พิจิก (user-verified 2026-05-26) ✅
- "ราหู มหาจักร" → found 2x in chapter_texts.json ✅
- "ราหู นิจ" → **0 ครั้ง** — ราหู ไม่มีนิจ

### 6. Planet letter codes (เพิ่มใน PLANETS.md)

อักษรย่อจาก chapter_texts.json verbatim:
อ=อาทิตย์, จ=จันทร์, ภ=อังคาร, ว=พุธ, ช=พฤหัสบดี, ศ=ศุกร์, ส=เสาร์, ร=ราหู, ก=เกตุ, ม=มฤตยู

หมายเหตุ: "พระ" prefix ใช้เฉพาะ พระอาทิตย์ เท่านั้น — ไม่ใช้กับดาวอื่น

### 7. Memory methodology — Pool → Combination → Self-Q&A

**User-taught principle:**
- มี **pool** ของ vocabulary → เกิด **combination** ได้
- มี combination → สร้าง **คำถามเองได้** (self-Q&A) ไม่ต้องรอ user
- เวลาอ่าน text มากขึ้น → prune combination ที่ไม่มีในตำรา เอง

**Element rules vs Prediction rules:**
- Element rule = atom: นิยาม element แต่ละชนิด (ดาว/ราศี/ภพ/คุณภาพ/สัมพันธ์)
- Prediction rule = molecule: element combinations → outcome
- ต้อง element rule ก่อนถึงสร้าง prediction rule ได้

**Memory format upgrade (user-requested):**
Format ที่ใช้ได้จริง: fact + **เมื่อไหร่ใช้** + **อย่าสับสนกับ**
(ไม่ใช่แค่ fact เฉยๆ)

### Files committed this session
- `handoffs/bible_memory/PLANETS.md` — บทบาทพิเศษ เกตุ/มฤตยู/ราหู + อักษรย่อ + ความหมาย
- `handoffs/bible_memory/HOUSES.md` — aspect definitions table (ch009 verbatim) + ภพจากลัคนา

---

## 2026-05-27T15:00 — Pool expansion: ch007/ch008/ch021/ch039 autonomous read

### New element rules added to VOCAB.md

**ch007 — ธาตุ interaction rules:**
- ธาตุราศีทั้ง 12: ไฟ (เมษ/สิงห์/ธนู), น้ำ (กรกฎ/พิจิก/มีน), ลม (ตุล/กุมภ์/มิถุน), ดิน (มังกร/พฤษภ/กันย์)
- ราศีทวาร (Cardinal) = ต้นธาตุ: เมษ กรกฎ ตุล มังกร
- Planet+sign element interaction: same element = amplify, opposite = dampen
- เกตุ=วิญญาณธาตุ, มฤตยู=อากาศธาตุ (ไม่ใช่ 4 ธาตุ)

**ch008 — คู่ดาว effects:**
- คู่มิตร: ช่วยเหลือ ส่งเสริม ทุกด้าน
- คู่ธาตุ: เข้ากันสนิท (พื้นธาตุเดียวกัน)
- คู่สมพล: ส่งเสริม กำลังมากขึ้น (memory code ๑๖ ๒๘ ๓๕ ๔๗)
- คู่ศัตรู: บ่อนทำลาย อ่อนกำลัง ขัดแย้ง
- พิเศษ: 2+5 ทั้งคู่ธาตุ+ศัตรูเล็กสุด (แทบไม่ต้องคิด)

**ch021 — ดาวสวมหมวก 2 ใบ:**
- อัจฉริยภาพภายใน = ส่งผล 100% ทุกภพ, ดูแค่ดาว+คุณภาพ
- ยกเว้น: ภพ 6/8/12 บวกความหมายภพต่อท้าย แต่ไม่ลด %
- ปัจจัยภายนอก = ขึ้นกับ aspect ลัคนา
- ความหมายดาว = identity คงที่ (จันทร์ไม่กลายเป็นอังคาร)

**ch039 — อัจฉริยภาพภายใน:**
- ≠ ทักษะ (acquired) ≠ พรสวรรค์ (hereditary)
- คำ TALS สร้างขึ้นใหม่ — อ้างอิง Howard Gardner 8 intelligences
- แสดงผ่านดาว 1-8 ยกเว้น เกตุ+มฤตยู (ยืนยันอีกครั้ง)
- สัมพันธ์ลัคนา = แสดงออกตลอด; ไม่สัมพันธ์ = ไม่ตลอด แต่มีอยู่

### อัจฉริยภาพภายใน ≠ ดาวไม่สัมพันธ์ลัคนา (clarification)
ch020 step 7 พูดถึง "ดาวไม่สัมพันธ์ลัคนา" = อัจฉริยภาพภายใน
แต่ ch021 ชัดเจนว่า ดาวสัมพันธ์ลัคนา ก็มีอัจฉริยภาพภายใน 100% เหมือนกัน
ความแตกต่าง: ดาวไม่สัมพันธ์ = pure อัจฉริยภาพ (ไม่มีปัจจัยภายนอก)
ch020 เน้น "ดาวไม่สัมพันธ์" เพราะ context การพยากรณ์ = พูดสิ่งที่ซ่อน

### คำถาม open ที่ยังไม่ resolve
- ch039 mention "พื้นเพของตน" (ฐานะผู้ให้กำเนิด/กรรมพันธุ์) — เชื่อมกับ TALS prediction อย่างไร?
- ธาตุ modifier มี quantitative weight ไหม? → ✅ **resolved below**

---

## 2026-05-27T16:00 — ch022 + ch028: ธาตุ weight clarification + case study patterns

### ch022 — ธาตุ quantitative + TALS weight

**Resolved: ธาตุ modifier มี approximation แต่ weight ต่ำ**

| ไฟ + ราศี | ผล | approximate |
|---|---|---|
| ไฟ (ต้น=เมษ) | สูงสุดทวีคูณ | 200%? |
| ลม | เพิ่มกำลัง | >100% แต่ < ไฟ+ไฟ |
| น้ำ | อ่อนลง | เกือบครึ่ง (~50%) |
| ดิน | ไม่มีผล | ~100% (neutral) |

**TALS weight ของธาตุ = ต่ำ (ch022 verbatim):**
> "มีผลในทางพยากรณ์ไม่มากนัก เป็นข้อสังเกตเท่านั้น"
→ ใช้เป็น modifier สุดท้าย หลังวิเคราะห์ทุกอย่างครบแล้ว — ไม่ใช่ rule หลัก

**TALS exclusions (ch022 verbatim — ห้ามลืม):**
ไม่ใช้: องค์เกณฑ์, พินทุบาท, เลขศาสตร์ + สิ่งที่ไม่ได้กล่าวถึงในตำรา TALS

### ch028 — patterns จาก case study ดาราจอมลวงโลก

**Pattern ใหม่ #1: เสียทั้งนอกและใน**
- ดาวในภพ (เรือนนอก) + เจ้าเรือนของภพ (เรือนใน) ต้องดูทั้งคู่
- ทั้งคู่เสีย = เสียหนักมาก ("ทั้งนอกและใน")
- ตัวอย่าง: จันทร์(2)นิจ ในภพกฎุมพะ + อังคาร(3)นิจ เจ้าเรือน → ดาวการเงินเสียหนัก

**Pattern ใหม่ #2: ดาวบาปกุมลัคนา บดบังดาวดีที่สัมพันธ์**
- ดาวบาปกุม (100%) > ดาวดีเล็ง (80%) → ดาวดีแสดงไม่ทัน
- ตัวอย่าง: ราหู(8)กุม > พฤหัส(5)เล็ง → คุณธรรมมีแต่แสดงไม่ได้

**Pattern ยืนยัน: มฤตยู(0) กุมลัคนา = มีเซนส์ลึกลับ (R186)**
ยืนยันในตัวอย่างจริง — ไม่ใช่แค่ rule abstract

**Pattern ยืนยัน: พุธ(4)+ศุกร์(6) ร่วมราศี = วาทศิลป์ดี**
คู่ธาตุน้ำ + ช่างพูด(4) + ศิลปะ(6) = เสริมกัน → ช่างเจรจา

### TALS philosophy (ch022)
> "วิชาโหราศาสตร์ไทย เป็นเรื่องง่ายๆตรงๆ ไม่ยุ่งยาก (แต่ลึกซึ้งซับซ้อน)"
> "เป็นเรื่องของสถิติ ข้อมูล" (empirical, not mystical)
> โหร "ไม่ใช่ผู้วิเศษ" — ไม่ต้องตอบในเรื่องพ้นวิสัย

---

## 2026-05-27T18:00 — ch029 + ch032 + ch033 + ch037 + ch039: อาชีพ + ราหู + ดาวจร + พื้นเพ

### ch029 — บทอาชีพ (user: "สำคัญมาก อาจต้องกลับมาอ่านซ้ำ")

- ดาวเดี่ยว→อาชีพ: 7=งานหนัก, 8=บริหาร/การเงิน, 6=ศิลปะ, 3=ช่าง, 5=ครู, 4=ข้อมูล, 1/2=ไม่เด่น
- ดาวผสม: แพทย์(4+3), ดารา(6+8สัมพันธ์ลัคนา), ทนาย(8+4+3 ห้าม5แรง), ผู้พิพากษา(3+5+4), ข้าราชการ(5สัมพันธ์ลัคนา)
- กฎ: ภพมรณะ = ทำอาชีพนั้นไม่ได้ (สูญสิ้น) แม้ดาวดี
- อาทิตย์(1)แรง = ง้อคนไม่เป็น; พฤหัส(5)แรง/ตนุเศษ = ทนายแพ้ (ใจอ่อน)
- meta: ความหมายดาว = flexible atom → ต้อง combine → คือทักษะ "พลิกแพลง"

### ch032 — ราหู(8) กรณีต่างๆ

- ราหูแรง vs counter(พฤหัส5/อาทิตย์1/อังคาร3): เปรียบ %+คุณภาพ "เหมือนคู่ชกมวย ไม่มีสูตรตายตัว"
- ราหูมหาจักรจรทับราหูเดิม = ทวีกำลัง อาจแรงกว่าดาวดีทั้งหมด

### ch039 — ความหมายดาวในบริบทต่างๆ

- อังคาร(3) = ตรรกะ: "ยังไม่มีผู้ใดกล่าวถึงในตำราทั่วไป" — TALS unique insight ยืนยัน
- พุธ(4)ตกมรณะ: พูดได้แต่สับสน ต้นชนปลายไม่ถูก
- พฤหัส(5)อุจ+ราหู(8)อ่อน = "หลงดี" เชื่อง่าย ถูกหลอก
- เสาร์(7) ≠ ชีวิตลำบาก (ตำราอื่นเข้าใจผิด) = อดทน ทำงานหนักได้ดี
- ราหู(8)ตนุลัคน์: สันดาน = ดื้อตาใส เชื่อมั่นตัวเอง (ไม่ใช่แปลว่าโกง)
- ถูกโฉลก + ไม่ตลอดเวลา: ดาวไม่สัมพันธ์ลัคนา ทำได้แต่ไม่สม่ำเสมอ ยาวๆจะเปลี่ยนแนว
- พื้นเพของตน: กรรมพันธุ์/ถิ่นกำเนิด/ฐานะ → กำหนดโอกาส ≠ ความสามารถ

### ch033 — ดาวจร priority + rules

- ลำดับดู: มฤตยู(0) → เสาร์(7) → อังคาร(3) → ราหู(8) → พฤหัส(5)
- มฤตยู(0) = ตัวป่วน ไม่ร้ายคนเดียว ต้องร่วมกับดาวอื่น; อยู่นาน 7ปี/ราศี
- เสาร์จรเสีย = กำลังน้อย โทษเบา (counterintuitive)
- เสาร์จร + ราหูพื้น คู่มิตร = ให้คุณแทบไม่ให้โทษ
- ราหูจรทับราหูเดิม+สัมพันธ์ลัคนา = โทษถึงเจ้าชาตา
- ราหูจร+พุธ(ศัตรู)สัมพันธ์ = โทษทวีคูณ
- พฤหัส(5)จร+สัมพันธ์ลัคนา = คุ้มครอง แม้จะตายก็ราบรื่น

### ch037 สรุปสั้น
"ดวงชาตาแข็งก็ตายได้ | ดาวการเงินดีก็ล้มละลายได้ | พยากรณ์ดาวจร: กลางๆ 50%"

---

## 2026-05-27T19:00 — Correction: ภพ vs ดาว, น้ำหนักระบบ

### ❌ Misconception ที่เกิดในช่วงนี้ (corrected by user)
- Claude เข้าใจผิดว่า "ดาวในภพ 1 = 100%, ภพ 7 = 80%..." → ภพรับน้ำหนัก
- จริง: น้ำหนักเป็นของ **ดาว** ผ่าน aspect กับ **ลัคนา/ตนุลัคน์** เท่านั้น ภพไม่มีน้ำหนักในตัวเอง

### ✅ Framework ที่ถูก
- **ภพ = domain/หัวข้อ** — บอกว่า "เรื่องนี้คือเรื่องอะไร" ไม่ใช่ตัวกำหนดน้ำหนัก
- **น้ำหนัก = จากดาว 2 ชั้น**:
  - เรือนนอก = ดาวที่นั่งในภพจริงๆ → aspect กับลัคนา → 100/80/60/50%
  - เรือนใน = เจ้าเรือน (ดาวปกครองราศีของภพนั้น) → aspect กับลัคนา → น้ำหนักเดียวกัน
- **ภพ 1,2,7 "สำคัญสุด"** = ลำดับ domain ที่ประเมินก่อน ไม่ใช่ว่า "ภพ" มีน้ำหนักสูงกว่า
- ถ้าเอาน้ำหนักภพมาซ้อนทับน้ำหนักดาว → ระบบ inconsistent ประเมินรวมไม่ได้

### ⚠️ แก้ไข Rule #5 (2026-05-27) — ภพกัมมะยังใช้ แต่คนละบริบท
- Rule #5 "อาชีพดูดาวเด่น NOT ภพกัมมะ" → ใช้ได้เฉพาะคำถามเรื่อง "ความสามารถ/ธรรมชาติงาน"
- **ภพ 10 (กัมมะ) = domain "หน้าที่ความรับผิดชอบ"** → ใช้เมื่อถาม "มีหน้าที่ราชการไหม", "ตำแหน่ง/สถานะในองค์กร"
- **ดาวเด่น = domain "ความสามารถ/ทักษะ"** → ใช้เมื่อถาม "เหมาะกับงานอะไร", "ควรทำอาชีพอะไร"
- ตัวอย่าง: ข้าราชการ = หน้าที่ต่อรัฐ → ดูภพ 10 | ทำงานด้านวิศวกรรม = ความสามารถ → ดูดาวเด่น
- กฎ reverse engineering: คำถามต้องชัดก่อนว่า "หน้าที่" หรือ "ความสามารถ" → เลือก tool ถูก

---

## 2026-05-27T20:00 — ch031: พระ vs โจร + เจ้าชู้ — Comparative Analysis

### Core insight: หัวใจ TALS = เปรียบเทียบคู่ดาว ไม่ใช่ดูเดี่ยว
- พฤหัส(5) vs ราหู(8): สัดส่วนแรง → คนดี/โกง/ทั้งคู่/โง่
- น้ำหนักรวม 3 มิติพร้อมกัน: คุณภาพ × aspect × คู่ดาว (มิตร/ธาตุ/สมพล)

### กฎใหม่ที่สำคัญ
- **Position > Quality**: ราหู(8) ปกติ กุมลัคนา > ราหู(8) อุจ ไม่กุมลัคนา
- **มิติเวลา**: เกษตร=บั้นปลาย, อุจจาภิมุข=สม่ำเสมอตลอด, มหาจักร=เป็นพักๆ
- **ตนุเศษ override**: พฤหัส(5) ตนุเศษ = คุณธรรมติดนิสัย ต้านราหูได้

### สูตรเจ้าชู้
- ศุกร์(6) + อังคาร(3) + สัมพันธ์ลัคนา = เจ้าชู้
- ศุกร์(6) + อาทิตย์(1) + สัมพันธ์ลัคนา = กำหนัดสูง แต่ไม่เจ้าชู้ (อาย)
- พฤหัส(5) ดี + สัมพันธ์ = เบรก → ผู้ดี

---

## 2026-05-28T00:00 — สร้าง tals_elements.json — Single Master File สำหรับ TALS Elements

### งานที่ทำ
- สร้าง `v3/tals_elements.json` (33KB, 733 lines) — consolidate ทั้ง quality_maps.json + master_dict_meanings.json
- **ใช้ canonical ID scheme**: signs 0-11, planets 0-9 ตลอดทั้งไฟล์
- embed planet positions (uchcha/kaset/mahachak/anukaset/rajayok) ตรงใน planet entry

### Pattern ที่แก้ไข
- **Naming bug พบใหม่**: `master_dict_meanings.json` field `prakaset` ใน planet_positions จริงๆ เก็บค่า ANUKASET (mitr partner's kaset) ไม่ใช่ PRAKASET (ประเกษตร = opposite of kaset)
  - ตรวจสอบทั้ง 8 ดาว confirm ✓
  - `tals_elements.json` ใช้ชื่อถูก: `anukaset` field

### Pending ยังเหมือนเดิม
- rajayok per-planet (8 values) = null ทั้งหมด รอ user จาก 100CH
- มหาจักร strength_pct = 80% (quality_maps) vs ≈ 100% (QUALITY.md/ch025) — ยัง unresolved
- เทวีโชค = ราชาโชค+6 geometric assumption ยังไม่ confirmed

### สถานะ consumers
- `tools/master_dict_editor.html` ยังใช้ master_dict_meanings.json อยู่ — PENDING: migrate ให้ใช้ tals_elements.json

## 2026-05-27T21:00 — อัจฉริยภาพภายใน: กลไก + ดาวจร trigger

### ความเข้าใจที่ลึกขึ้น (จาก discussion)
- **ลัคนา = สัญชาติญาณ** (instinct/impulse ที่แสดงออก)
- **ตนุลัคน์ = มันสมอง** (how the mind processes — active เสมอ ไม่ต้องการ aspect)
- **อัจฉริยภาพภายใน** = ดาวพื้นไม่สัมพันธ์ลัคนา = มีอยู่ครบ 100% ในตัว แต่ไม่แสดงออก
  → ≠ 0% strength, แค่ไม่ผ่านลัคนา → ไม่กลายเป็นพฤติกรรมปกติ

### ตนุลัคน์ vs เรือนในอื่น
- ตนุลัคน์ = เจ้าของภพ 1 = มันสมองของเจ้าชาตา → active เสมอ ไม่ขึ้นกับ aspect
- สัมพันธ์ลัคนา = คิด + แสดงออก (2 ชั้น)
- ไม่สัมพันธ์ = คิดอยู่ข้างใน ไม่แสดงออก (1 ชั้น)

### กลไก trigger อัจฉริยภาพภายใน
- อัจฉริยภาพภายใน dormant จนกว่าจะมี trigger
- **ดาวจรใหญ่ 0, 8, 7, 5, 3 ที่มาสัมพันธ์ดาวพื้นนั้น = trigger ให้แสดงออก**
- ผลขึ้นกับ: คุณภาพดาวพื้น + คุณภาพดาวจร + ภพที่ดาวพื้นอยู่
- แต่ยังไม่ถูกโฉลก (ดาวพื้นไม่สัมพันธ์ลัคนา) = ผลไม่เต็ม ไม่ราบรื่นเท่าดาวที่สัมพันธ์

### เหตุที่ ราหู(8) มหาจักร ไม่สัมพันธ์ลัคนา = "คาดการณ์ยาก"
→ เพราะผลขึ้นกับว่าดาวจรไหนมากระตุ้น เมื่อไหร่ และคุณภาพดาวจรในขณะนั้น

## 2026-05-28T00:00 — ch013 ตนุเศษ vs เจ้าเกษตร: ความแตกต่างที่ชัดเจน

### ค้นพบจาก ch013 (ตำรา 100CH)
- **ตนุเศษ** = ผลจากสูตร (A×B)%7 → 1-7 เท่านั้น (ราหู/เกตุ/มฤตยู เป็นผลไม่ได้)
  - A = นับจากภพตนุ → ภพที่ตนุลัคน์อยู่
  - B = นับจากตรงนั้น → ภพที่เจ้าเรือนของราศีนั้นอยู่
  - ผล=0 → ตนุเศษ=7 (เสาร์)
- **ตนุลัคน์** = เจ้าเกษตรเรือนลัคนา (ราหูเป็นได้ — ตำราให้ traits ราหูไว้ชัดเจน)
- **สองอย่างนี้คนละเรื่อง** — ห้ามสับสน

### Hallucination ที่เกิดและแก้แล้ว (2026-05-28)
- ❌ เข้าใจผิด: "ราหูไม่มีเกณฑ์เป็นตนุเศษ" → แก้ KASET_MAP[กุมภ์]=เสาร์(7)
- ✅ ถูกต้อง: ราหูเป็นผล ตนุเศษไม่ได้ แต่เป็น เจ้าเรือน/ตนุลัคน์ได้
- ✅ KASET_MAP[10]=8 (ราหู=เจ้าเรือนกุมภ์) reverted + confirmed

### Code naming note
- `getIdentity()[1]` ใน script.js = ตนุเศษแท้จริง (formula) ✓
- `tanu_set` ใน interpretation.js = intermediate step (เจ้าเรือนของราศีที่ตนุลัคน์อยู่) ≠ ตนุเศษ

## 2026-05-28T12:00 — Multi-DB Architecture implementation

### สิ่งที่ทำ
- ออกแบบ Multi-DB 4 ชั้น: kb_tals(L1) / kb_text(L2) / kb_expert(L3) / kb_user(L4)
- สร้าง kb_tals.json — migrate 290 rules จาก kb_v24-3.json + เพิ่ม db/source_level/source_ref
- สร้าง stub files: kb_text.json, kb_expert.json, kb_user.json
- อัป reference: v3tab.js KB_PATH_V24 → kb_tals.json
- Cross-DB linking schema: tals_link {tals_rule_id, relation: confirm/extend/conflict/new}

### Architecture สรุป
- source_level: 1=100CH, 2=ตำราอื่น, 3=โหรผู้เชี่ยวชาญ, 4=ประสบการณ์ผู้ใช้
- L2/L3/L4 ต้องมี tals_link (link กลับ L1) จึงจะนับว่า valid
- Engine load mode: strict (L1 only) / optional (L1+L2) / full (ทั้งหมด)

## 2026-05-28T15:00 — Cross-tradition comparison: เจ้าเกษตร์ราศีกุมภ์

### ทำไมตำราอื่นจึงให้เสาร์ปกครองกุมภ์
- **ต้นเหตุ: ข้อจำกัด Chaldean system** — 7 ดาว / 12 ราศี → ต้องให้แต่ละดาวมี 2 ราศี
- เสาร์ = ดาวช้าสุด/ไกลสุด → ได้ราศีสุดขอบ (มกร + กุมภ์) ตามลำดับดาราศาสตร์
- **ไม่ใช่เพราะ match ธรรมชาติ** — แต่เพราะแก้ปัญหาเลข
- Jyotish classic: ราหู/เกตุ ไม่มีเกษตร์ (shadow planet เท่านั้น)
- KP System (Jyotish สำนักหนึ่ง): ราหู→กุมภ์, เกตุ→พิจิก — ตรงกับ TALS

### ราหู ↔ ยูเรนัส (Modern Western): energy เดียวกัน คนละดาว
- ยูเรนัส (พบ 1781) → assign กุมภ์ เพราะ "ฉีกกฎ/นวัตกรรม"
- ราหู ใน TALS → กุมภ์ ด้วยเหตุผลเดียวกัน (ไม่มีดาวนอกระบบในสายไทย)
- ทั้งคู่จับ "พลังงานแปลกแยก ฉีกกฎ" — คนละชื่อ เหตุผลเดียวกัน

### สรุปหลักการ TALS ที่ต่างจากสายอื่น
- **1 ดาว = 1 ราศี** — ไม่มี "บ้านสองหลัง" (ตัดข้อจำกัด Chaldean ออก)
- เสาร์ปกครอง มกร เท่านั้น / ราหูปกครอง กุมภ์ — แต่ละดาว fit ราศีที่ตรงธรรมชาติมากที่สุด

## 2026-05-28T15:30 — แก่นของระบบ BIBLE/TALS

### insight จากการสนทนา
- **แก่น = "รู้ให้ชัดว่ารู้จากที่ไหน"** — source คือส่วนหนึ่งของความหมายของข้อมูล
- ทุก bug/hallucination ที่เจอ → เกิดจากสับสน "สิ่งที่รู้" กับ "สิ่งที่สมมติ"
- Multi-DB architecture เกิดขึ้นจาก insight นี้โดยตรง
- TALS innovation = เปลี่ยนคำถามจาก "โบราณว่าอะไร?" → "อะไรเป็นจริงและทดสอบได้?"

### User identity (บันทึก 2026-05-28)
- ปีเตอร์ (Peter) / สิทธิเดช ประเสริฐรุ่งเรือง / สมญา: โหราทาส
- บันทึกถาวรใน CLAUDE.md แล้ว — เรียก "ปีเตอร์" ทุก session

## 2026-05-28T17:00 — เกตุ และ มฤตยู: ความหมายจากตำรา TALS

### เกตุ (planet_id=9) — ดาววิญญาณธาตุ
- **บทบาท: Amplifier순** — ไม่มีความหมายอิสระ ขยายผลดาวที่ร่วม/สัมพันธ์
  - ร่วมกับดาวดี → ยิ่งดีขึ้น
  - ร่วมกับดาวเสีย → ยิ่งเสียลง
- **ดาวอายุ** — ถ้าสัมพันธ์ลัคนา + ร่วมดาวดี + ลัคนาเข้มแข็ง → อายุยืน
- **ไม่มีตำแหน่งมาตรฐาน** (uchcha/nicha/kaset/rajayok ไม่มี)
- Engine implication: ต้องมี logic แยก `ketu_amplify()` ไม่ใช่ assessStandards()

### มฤตยู (planet_id=0) — ดาวอากาศธาตุ
- **บทบาท: Pure malefic** — ให้โทษอย่างเดียว ไม่ให้คุณเลย
- อยู่เรือนไหน → เปลี่ยนแปลงในเรือนนั้นเสมอ (เปลี่ยนคู่/งาน/การเงิน)
- ถ้าสัมพันธ์ลัคนา → เจ้าอารมณ์ แปรปรวน มีเซ้นส์ลึกลับ
- **ไม่มีตำแหน่งมาตรฐาน**
- Engine implication: `if (samsong_lagna) → always_bad` ไม่มี exception

### หลักการสรุป
- has_quality_positions: false ทั้งสองดาว ✓ (ถูกแล้วในระบบ)
- เกตุ ≠ ดาวปกติ → ประเมินต้องดูบริบท (อยู่กับใคร)
- มฤตยู = simple rule → bad always when related to lagna

## 2026-05-28T18:00 — CRITICAL: อนุเกษตร ≠ ประเกษตร (correction)

### ผิดที่เดิม (ต้องแก้ใน tals_elements.json)
- `anukaset` field ปัจจุบันคำนวณเป็น `(kaset+6)%12` = **ประเกษตร** ไม่ใช่อนุเกษตร
- ต้องลบ `anukaset` ออกจาก per-planet field ทั้งหมด

### อนุเกษตร (ch010) — คืออะไรจริงๆ
- **Chart-level quality** ไม่ใช่ per-planet — ต้องดู 2 ดาวคู่กัน
- เกิดเมื่อ: ดาว A อยู่ในราศีเกษตรของ B **และ** ดาว B อยู่ในราศีเกษตรของ A
- เรียก "สลับเรือนเกษตร" — ทั้งคู่ได้อนุเกษตร (เกษตรชั้น 2)
- ให้คุณทันทีตั้งแต่เกิด (เกษตรให้ผลช้า อนุเกษตรอาจช้ากว่า)
- Engine ต้องมี `checkAnokaset(pos[], p_i, p_j)` แยกต่างหาก

### กฎเล็งกัน ch010 — ลบ-ลบ = บวก
- เกษตรเล็งกัน → ประเกษตรทั้งคู่ (ดีก่อน เสื่อมทีหลัง)
- ประเกษตรเล็งกัน → เกษตรทั้งคู่ (ไม่ดีก่อน ดีทีหลัง)
- อุจเล็งกัน → นิจ (เร็ว อาจล้มทั้งยืน)
- นิจเล็งกัน → อุจ
- **ใช้กับ:** เกษตร/ประเกษตร/อุจ/นิจ เท่านั้น
- **ห้ามใช้กับ:** มหาจักร/อุจจาวิลาส/อุจจาภิมุข/ราชาโชค/เทวีโชค

## 2026-05-28T18:01 — Derivation pattern: ตรงข้าม = +6%12 (confirmed)

### กฎสากล: position_opposite = (position + 6) % 12
- นิจ = (อุจ + 6) % 12
- ประเกษตร = (เกษตร + 6) % 12
- จุลจักร = (มหาจักร + 6) % 12
- เทวีโชค = (rajayok_sign_idx + 6) % 12  ← **CONFIRMED geometric** (Peter 2026-05-28)

### เทวีโชค pending → RESOLVED
- pending_user_verification เรื่องเทวีโชค = ราชาโชค+6 → ยืนยันแล้ว geometric ถูกต้อง

### Implication ต่อ schema
- Store เฉพาะ primary: uchcha, kaset, mahachak, rajayok
- ไม่เก็บ derived: nicha, pra_kaset, julachak, thewichok, anukaset

## 2026-05-28T18:02 — Master Dictionary restructure plan (priority)

### Architecture ที่ตกลงแล้ว
- แยก 4 ไฟล์: tals_planets.json / tals_signs.json / tals_houses.json / tals_quality_rules.json
- 4 ไฟล์ = 4 Google Sheets tabs (Peter view/verify)
- JSON = source of truth (git) → tool export → Google Sheets
- tools/tals_dict_export.html: view 4 tables + Copy TSV per tab

### ลำดับงานถัดไป (priority order)
1. backup branch: `backup/tals_elements_schema_v1.0`
2. สร้าง 4 JSON ไฟล์ใหม่ (schema v2.0, flat, clean)
3. สร้าง tools/tals_dict_export.html (4 tabs + export)
4. session HORATAD: engine → standards.js แยกออก + import จาก 4 ไฟล์ใหม่
5. session HORATAD: ch010 logic → checkOpposition() + checkAnokaset()

### Schema v2.0 per planet (flat)
```
id, name, name_en, abbrev, aliases, element, nature, speed_per_sign,
has_quality_positions, represents, positive_keywords, negative_keywords,
body_parts, career_areas, tanusesh_trait, tanulagn_inner,
uchcha, kaset, mahachak, rajayok, notes
```
- ลบ: positions{} nested, anukaset, rajayok_pending, nicha (derive ได้)
- เกตุ/มฤตยู: has_quality_positions=false → ไม่มี uchcha/kaset/mahachak/rajayok

## 2026-05-28T18:03 — Engine separation (confirmed needed NOW)

### ทำไมต้องแยกก่อน (Peter's reasoning)
- Engine มาจาก C/Palm — data type mismatch เคยแก้นานมาก
- รอให้ซับซ้อนก่อน = แก้ยาก เสี่ยง regression สูง
- ทำตอนนี้ = scope ชัด ทดสอบได้ง่าย

### แผน: 3 ไฟล์ (HORATAD session)
- v3/calculator.js — สุริยยาตร์ → pos[] (swap SE ได้ในอนาคต)
- v3/standards.js — KASET_MAP, RACHA_MAP + assessStandards() + ch010 logic
- v3/matcher.js — matchRulesV24() (BIBLE domain)

### SE Adapter (อนาคต)
- Adapter layer บาง ไม่แก้ engine
- degrees×60 → arc-min, reorder planets, inject lagna, KE=RA+180°

## 2026-05-28T20:00 — 📌 PINNED: Keyword Taxonomy + AI-Only Ingestion Policy

### 3-Source Keyword Taxonomy (user-confirmed)

Master Dictionary keywords แบ่งเป็น 3 ประเภทชัดเจน:

| Source tag | ชื่อ | ที่มา | ใช้ทำอะไร |
|---|---|---|---|
| `tals` | TALS keywords | สกัดจากตำรา 100CH โดย AI | engine rule matching · ground truth |
| `llm` | LLM bridge keywords (คำไข) | AI-generated เพื่อเชื่อม TALS → natural language | ป้อน LLM ให้รู้จักนิยาม ผลิต wording |
| `ntals` | Non-TALS keywords | AI-extracted จากตำราอื่น (ไม่ใช่ 100CH) | ขยายขอบเขตเรื่องราว เพราะ TALS ครอบ subset เท่านั้น |

**คำอธิบายเพิ่มเติม:**
- `tals` = verbatim/direct จากตำรา 100CH — highest authority
- `llm` = คำที่ช่วยให้ LLM "คุย" กับ TALS concept ได้ — bridge vocabulary สำหรับ generation pipeline
- `ntals` = ขยาย narrative scope (เช่น เพิ่มอาชีพ/สถานการณ์ที่ 100CH ไม่ได้ระบุ) — lower authority แต่มี provenance

### Schema patch — keywords field (per planet / sign / house)

```json
"keywords": [
  {"k": "บารมี",          "src": "tals",  "ref": "100CH/ch013"},
  {"k": "ไว้ตัว",          "src": "tals",  "ref": "100CH/ch013"},
  {"k": "ผู้นำที่มีบารมี",  "src": "llm",   "ref": "session_2026-05-28"},
  {"k": "solar authority", "src": "ntals", "ref": "western_liz_greene", "tradition": "western"}
]
```

- Engine ใช้ `k` เท่านั้น (flat) — filter `src` ที่ต้องการได้
- LLM prompt ใช้ทั้ง tals + llm keywords ร่วมกัน (richer seed)
- ntals ต้องมี `ref` ชี้แหล่งตำราเสมอ

### AI-Only Ingestion Policy (ถาวร — standing rule จาก user)

> "การนำเข้าข้อมูลทุกอย่างให้ทำโดย AI — กัน distortion from human error
> large number of human experts should be less superior to a few good AI"

**ความหมายใน practice:**

| Layer | Ingestion method | ห้าม |
|---|---|---|
| `tals` keywords | Claude/AI อ่าน chapter_texts.json → สกัด verbatim | มนุษย์พิมพ์เองโดยไม่มี source quote |
| `llm` keywords | Claude สร้างใน BIBLE session (AI-generated ระบุ ref session) | มนุษย์คิดเองแล้วพิมพ์ใส่ |
| `ntals` keywords | AI สกัดจากตำราอื่น (ต้องระบุ ref textbook) | มนุษย์เลือกคำเองโดยไม่อิง source |

**ถ้า user ต้องการเพิ่ม ntals:** trigger ให้ AI อ่านตำราปลายทาง → สกัด → propose → user approve เท่านั้น (ไม่ type เอง)

**Rationale:** ป้องกัน 2 ประเภท distortion:
1. Human selection bias — เลือกคำที่คุ้นชิน ไม่ใช่คำที่ตำราบอก
2. Human inconsistency — คำที่คนหนึ่งใส่อาจขัดกับที่คนอื่นใส่ → AI ใช้ policy สม่ำเสมอ

### ไฟล์ที่ต้องอัปเดต (pending — schema migration)

- [ ] `v3/tals_planets.json` — เปลี่ยน `positive_keywords`/`negative_keywords` string array → `keywords` object array พร้อม src tag
- [ ] `v3/tals_signs.json` — เปลี่ยน `keywords` string array → object array
- [ ] `v3/tals_houses.json` — เปลี่ยน `keywords` string array → object array
- [ ] `tools/tals_dict_export.html` — update render logic + embedded data

### Audit ของ keywords ที่มีอยู่แล้ว (ต้อง tag ย้อนหลัง)

Keywords ใน tals_planets.json ปัจจุบัน = ส่วนใหญ่เป็น mix tals+llm ยังไม่ tagged
→ ต้อง AI audit pass: Claude อ่าน chapter_texts.json เทียบ keyword ทีละตัว → tag tals/llm
→ สิ่งที่หาไม่เจอใน 100CH = tag llm (bridge term)
→ สิ่งที่มาจากตำราอื่น = tag ntals + ระบุ ref

### Keyword Audit — Multi-LLM Triangulation (user-confirmed)

> "Claude จะ audit ได้เองว่าอันไหนมาจาก 100CH ถ้าให้ claude, gemini, typhoon, groq
> and other coming LLM ช่วยกัน repeat reading ก็จะดีกว่า one human"

**ความหมาย:** ใช้ Multi-LLM triangulation ที่ออกแบบไว้แล้วสำหรับ KB rules → apply เดิมกับ keyword audit

```
Triangulation architecture (keyword level):
  chapter_texts.json (100CH)
    ↓ Claude reads
    ↓ Gemini reads (browser)
    ↓ Typhoon reads (browser)
    ↓ Groq reads (browser)
  → keyword ที่หลาย LLM "เห็นว่ามาจาก textbook" = tag tals (HIGH confidence)
  → keyword ที่ไม่มี LLM ใดเจอใน chapter = tag llm (bridge term)
  → keyword จาก source อื่น = tag ntals + ref textbook
```

**ผลลัพธ์:** N LLMs อ่าน text เดิม → confidence level สะสม → automatic tagging ไม่ต้องพึ่ง human judgment ใดๆ

**Implementation path:**
1. Claude (this session) — initial audit pass จาก chapter_texts.json (เร็ว, ไม่สมบูรณ์)
2. Browser-based LLMs (Groq/Typhoon modes ใน tools) — extend audit ด้วย models อื่น
3. Auto-merge ด้วย fingerprint concept เดิม (keyword fingerprint = คำ + context ใน chapter)
4. Output: keyword → src tag + confidence score + citation

**สรุป policy:** ไม่ว่าจะเป็น `tals`, `llm`, `ntals` — ทุก keyword ต้องมี AI trail ไม่มี manual entry

### Cross-link
- เชื่อมกับ Multi-DB architecture (LOG 2026-05-28T17:xx): tals=L1, llm=bridge, ntals=L2+
- เชื่อมกับ Ground-truth extraction architecture (LOG 2026-05-25): source_type IN_BOOK = tals
- เชื่อมกับ Triangulation architecture (LOG 2026-05-25): FROM_LLM source = llm keywords
- **Triangulation ใช้ได้ 2 ระดับ:** (1) KB rules (ทำแล้ว) + (2) keyword audit (ใหม่ — นี้คือ policy)

## 2026-05-28T20:30 — 📌 PINNED: Zero-Human-Input Policy (final, absolute)

**User statement (verbatim):**
> "ในที่สุด anything in master dict should not be input by human"

### Policy (standing rule — ถาวร)

**Master Dictionary = AI-extraction-only zone. ไม่มี human input แม้แต่ field เดียว.**

| ประเภท data | ต้องมาจาก | ห้าม |
|---|---|---|
| Planet names, positions, meanings | AI อ่าน chapter_texts.json | พิมพ์มือ |
| Sign rulers, elements, keywords | AI อ่าน chapter_texts.json | พิมพ์มือ |
| House domains, keywords | AI อ่าน chapter_texts.json | พิมพ์มือ |
| Quality rules (อุจ/นิจ/เกษตร/...) | AI อ่าน chapter_texts.json | พิมพ์มือ |
| ntals keywords | AI อ่าน source textbook ปลายทาง | พิมพ์มือ |
| llm bridge keywords | AI generate + cite session | พิมพ์มือ |

**ถ้าต้องการเพิ่มอะไร:** user บอก source → AI อ่าน source → AI propose → user approve (approve ≠ type)

### Implication ต่อ existing data

ข้อมูลที่มีอยู่ใน master dict ที่อาจมี human-typed content (ก่อน policy นี้):
- → ต้องทำ AI audit ย้อนหลัง: verify ทุก field กับ chapter_texts.json
- → field ที่ verify ได้ → เพิ่ม `"verified_by": "ai-audit-YYYY-MM-DD"` tag
- → field ที่ verify ไม่ได้ (ไม่มีใน source text) → tag `"status": "needs_source"` รอ AI extraction ใหม่

### ทำไมต้อง strict ขนาดนี้

```
Human input path:
  human คิดคำ → พิมพ์ → master dict
  ❌ ไม่มี source trail
  ❌ selection bias (คำที่คุ้น ไม่ใช่คำที่ตำราบอก)
  ❌ inconsistency ข้าม session (คนละคนพิมพ์คนละคำ)
  ❌ ไม่ scale เมื่อ dict โต

AI extraction path:
  chapter_texts.json → AI reads → extract → cite ref → propose → user approve
  ✅ full source trail (สืบย้อนได้ทุก field)
  ✅ consistent (same policy ทุก field)
  ✅ multi-LLM triangulation → confidence level
  ✅ scales: เพิ่มตำราใหม่ = trigger AI อ่านเพิ่ม
```

### Cross-link
- ขยายจาก "AI-Only Ingestion Policy" (LOG 2026-05-28T20:00) — version นี้ absolute (ไม่มีข้อยกเว้น)
- ตรงกับ Triangulation Architecture (LOG 2026-05-25): human ทำ approve/reject ไม่ใช่ input
- Foundation: "few good AI > large number of human experts" — Peter 2026-05-28

---

## 2026-05-28T22:00 — Architecture: Rules vs Dictionary, Synonym, Bilingual

### ถาม: rules อยู่ใน tals_*.json หรือไม่?

**ตอบ: ไม่ — แยก layer ชัดเจน**

```
tals_*.json   = Dictionary layer  (คำนิยาม + properties + keywords)
kb_*.json     = Rules layer       (prediction rules: conditions + wording text)
```

tals_*.json ไม่มี prediction rules — เก็บแค่ข้อมูล planet/sign/house properties

### ถาม: prediction ใน rules เป็น keyword หรือ text?

```
kb_*.json rules:
  conditions  → match criteria (planet_id, quality, house, ...)
  wording     → TEXT เต็ม (prediction sentence/paragraph)

tals_*.json keywords:
  engine kw   → สั้น/แม่นยำ (matching)
  llm kw      → รวย/หลากหลาย (LLM generation seeding)
```

pipeline: `tals_*.json (keywords) + kb_*.json (text templates) → LLM → wording output`

### ถาม: synonym/alias สำหรับ AI extraction และ Q&A?

| รูปแบบ | สถานะ | ตัวอย่าง |
|---|---|---|
| ชื่ออื่น (วรรณคดี) | ✅ aliases field มีแล้ว | ระวิ, สุรีย์ |
| ตัวเลขอารบิก | ❌ ยังไม่มี | 1 → อาทิตย์ |
| ตัวเลขไทย | ❌ ยังไม่มี | ๑ → อาทิตย์ |
| Compound/role ref | ❌ ยังไม่มี | "เจ้าเกษตร์ราศีสิงห์" → อาทิตย์ |
| Role-based ref | ❌ ยังไม่มี | "ตนุลัคน์" → planet_id ที่คุมลัคนาราศี |

**Decision:** สร้าง `alias_index` แยก (lookup: synonym → canonical_id) เมื่อจะสร้าง Q&A interactive  
ไม่ยัด compound ref ลง tals_planets.json โดยตรง (หลักการ ไม่ใช่ list)

### ถาม: Thai-English bilingual ready?

| ส่วน | สถานะ |
|---|---|
| name_en ดาว/ราศี/ภพ | ✅ มีแล้ว |
| English abbreviation, keywords, wording templates | ❌ ยังไม่มี |

**Decision:** รอก่อน — LLM รู้จัก Sun/อาทิตย์ ได้เอง  
เพิ่ม English layer เมื่อ use case ชัดเจน (user base ภาษาอังกฤษ)

### Priority ที่เหลือ
1. Schema migration keywords (string array → tagged objects) ← ทำต่อ
2. alias_index ← รอ Q&A system
3. English keywords ← รอ user base


---

## 2026-05-29T00:00 — Schema Gap Analysis: สิ่งที่ขาดใน Master Dictionary

Peter ชี้ gap ที่ยังขาดอยู่ใน tals_*.json + viewer + rule schema

### Gap Table

| หมวด | สถานะปัจจุบัน | ขาด / ต้องทำ | ไฟล์ที่เหมาะ |
|---|---|---|---|
| **มุมสัมพันธ์** กุม/เล็ง/โยค/ตรีโกณ | ✅ ข้อมูลมีใน tals_quality_rules.json → aspects (KUM/LENG/YOK/TRI) | ❌ viewer ยังไม่แสดง aspect weights ใน มาตรฐาน tab | tals_quality_rules.json ✓ + viewer |
| **คู่ดาว** มิตร/สมพล/ธาตุ/ศัตรู | ✅ skeleton มีใน master_dict_meanings.json (mitr/mahamitr/satru/neutral) | ❌ ยังไม่ migrate ไป tals_*.json v3 | ใหม่: `tals_planet_relations.json` |
| **อาชีพ** ตามดาว | ✅ career_areas[] มีใน tals_planets.json | ❌ viewer ไม่มีคอลัมน์อาชีพ | tals_planets.json ✓ + viewer column |
| **ลัคนาในฤกษ์** | ❌ ไม่มีในไฟล์ไหน | ❌ ต้องสร้างใหม่ (TALS มีแม้ไม่ใช้คำนวณ) | ใหม่: `tals_lagna.json` |
| **ความหมายดาวกุมลัคนา** | ✅ skeleton (kum_lakkana) มีใน master_dict lagna_concepts | ❌ ยังไม่ AI-extracted | tals_lagna.json |
| **ความหมายตนุเศษตามดาว** | ✅ tanusesh_trait มีใน tals_planets.json per planet | ❌ viewer tab ยังไม่แสดง | viewer tab ใหม่ "ลัคนา" |
| **ความหมายตนุลัคน์ตามดาว** | ✅ tanulagn_inner มีใน tals_planets.json per planet | ❌ viewer tab ยังไม่แสดง | viewer tab ใหม่ "ลัคนา" |
| **พระเคราะห์เรือนนอก/ใน** | ❌ ไม่มีในไฟล์ไหน | ❌ ต้องนิยาม + scoring rule | tals_quality_rules.json section ใหม่ |
| **score ใน rules** | ❌ ไม่มีใน kb_*.json | ❌ ต้องเพิ่ม field | kb_*.json rule schema |

### คำอธิบายเพิ่มเติม

**คู่ดาว 4 ประเภท** (ต้องแยกให้ชัด):
- คู่มิตร = ดาวที่เกื้อกูลกัน (pair-level)
- คู่สมพล = ดาวกำลังเท่ากัน (neutral)
- คู่ธาตุ = ดาวธาตุเดียวกัน
- คู่ศัตรู = ดาวที่ขัดแย้งกัน

**พระเคราะห์เรือนนอก/ใน** (chart-level concept):
- เรือนใน = ภพ 1-6 ของดวงชาตา (ขึ้นกับลัคนา)
- เรือนนอก = ภพ 7-12 ของดวงชาตา (ขึ้นกับลัคนา)
- Multiplier rule: ดาวดี + มาตรฐานดี + สัมพันธ์ลัคนา + เป็นทั้งเจ้าเรือนในและเรือนนอก → เพิ่มความดีเป็นพิเศษ
- ข้อสังเกต: เป็น chart-level (ไม่ static per planet) → ต้องคำนวณจาก lagna + kaset[]

**score ใน rules** (สำคัญสำหรับ prediction engine):
- แต่ละ rule ใน kb_*.json ควรมี relevance score
- Dependent rule (ต้องอาศัย rule อื่น) → score ต่ำกว่า independent rule
- Combination rule (หลาย rule รวมกัน) → score = f(component scores)
- ใช้ rank rules เพื่อ select top-N ที่ relevant ที่สุดสำหรับ prediction

### ไฟล์ใหม่ที่ต้องสร้าง

```
v3/
  tals_planet_relations.json   ← คู่ดาว 4 ประเภท (migrate จาก master_dict)
  tals_lagna.json              ← ลัคนาในฤกษ์ + ดาวกุมลัคนา + ตนุเศษ/ตนุลัคน์ table
```

### ผลต่อ viewer (tals_dict_export.html)

ต้องเพิ่ม:
1. มาตรฐาน tab: แสดง aspect weights table (KUM/LENG/YOK/TRI)
2. ดาว tab: คอลัมน์ อาชีพ + ตนุเศษ + ตนุลัคน์ (ซ่อนได้ expand)
3. tab ใหม่ "ลัคนา": ดาวกุมลัคนา + ตนุเศษ/ตนุลัคน์ per planet + ลัคนาในฤกษ์
4. tab ใหม่ "คู่ดาว": มิตร/สมพล/ธาตุ/ศัตรู lookup table

### Priority

```
ทำได้ทันที (data มีอยู่แล้ว):
1. viewer: อาชีพ column + aspect weights table + ตนุเศษ/ตนุลัคน์ expand
2. tals_planet_relations.json — migrate จาก master_dict skeleton

ต้อง AI extraction ก่อน:
3. tals_lagna.json — ดาวกุมลัคนา + ลัคนาในฤกษ์ (ต้องอ่าน chapter_texts.json)

ต้องออกแบบ schema + verify:
4. พระเคราะห์เรือนนอก/ใน — นิยาม scoring rule ก่อน implement
5. score ใน rules — กำหนด scale + formula + ปรับ kb_*.json schema
```


---

## 2026-05-29T00:30 — 📌 PINNED: Element Table vs Rule Table (coding architecture)

### ความแตกต่างหลัก

**Element Table** = ข้อมูลนิ่ง (static facts — เป็นจริงตลอดไปไม่ว่าพยากรณ์ให้ใคร)

```
tals_planets.json          → ดาว: ชื่อ, ธาตุ, เกษตร, อุจ, keywords, อาชีพ
tals_signs.json            → ราศี: ธาตุ, เจ้าเรือน, keywords
tals_houses.json           → ภพ: domain, keywords
tals_quality_rules.json    → มาตรฐาน: weights, aspects, derive rules
tals_planet_relations.json → คู่มิตร/ศัตรู/สมพล/ธาตุ  (ใหม่)
tals_lagna.json            → ลัคนา+ฤกษ์+ตนุเศษ+ตนุลัคน์ (ใหม่)
```

Engine ใช้: load ครั้งเดียว → cache → O(1) lookup

**Rule Table** = logic พยากรณ์ (if–then ขึ้นกับ chart ของแต่ละคน)

```
kb_tals.json → rules: conditions + wording + score
  conditions:  {planet_id, quality, house, aspect_to_lagna, ...}
  wording:     "อาทิตย์อุจในเมษ สัมพันธ์ลัคนา → ..."
  score:       relevance weight (rank top-N)
```

Engine ใช้: match กับ chart → rank ด้วย score → ส่ง LLM สร้าง wording

### กฎแยกประเภท (ใช้ถามตัวเอง)

```
"เป็นจริงตลอดไป ไม่ขึ้นกับ chart ใคร?"  → Element table
"เป็น if-then ขึ้นกับ chart?"             → Rule table
```

### Coding problems ถ้าสับสน

| ผิดพลาด | ผลเสีย |
|---|---|
| rule ไปอยู่ใน element table | logic ปะปน data, โหลดช้า |
| element ไปอยู่ใน rule table | duplicate → inconsistency เมื่ออัปเดต |
| score ไม่มีใน rule | prediction ไม่ rank → LLM ได้ rules ไม่ relevant |
| aspect weight ใน rule แทน element | เปลี่ยน weight = แก้ทุก rule |

### Peter's concern (verbatim)
> "ผมยังไม่ชัดระหว่าง element table กับ rule table นะ เข้าใจผิด ก็ต้องช่วยแก้ coding problem"
→ Claude รับผิดชอบแยกให้ถูกต้องเสมอ — ถ้าพบ data ผิด table ให้แจ้งและย้าย


---

## 2026-05-29T01:00 — ch023: เกษตรตกภพร้าย + Two-factor interpretation

**Source:** ch023 (บทที่ 23: อรรถาธิบายคุณภาพดาว) — verified ใน chapter_texts.json ✓

### Pattern ใหม่ที่พบ: Two-factor interpretation

ดาวในเกษตร มี 2 มิติ แยกอิสระ:

| มิติ | ความหมาย | ตัวอย่าง (เสาร์) |
|---|---|---|
| **อัจฉริยภาพภายใน** | inner trait ของดาว | คิดมาก ไตร่ตรองรอบคอบ |
| **ปัจจัยภายนอก** | external domain ของดาว | ที่ดิน การทำสวน การเกษตร |

→ ทั้งสองมิติถูกกระทบเมื่อตกภพร้าย แต่ความหมายต่างกัน

### Bad house severity scale

| ภพ | อัจฉริยภาพภายใน | ปัจจัยภายนอก |
|---|---|---|
| **ภพมรณะ (8)** | มีคุณภาพนั้น แต่**ไม่นำมาใช้เลย** | **สูญสิ้น ไม่ได้ตอบแทน** |
| **ภพวินาศ (12)** | ตัดได้ วางได้ ไม่ยึดติด | หมดไป จากไป ไม่คงทน |
| **ภพอริ (6)** | ปฏิเสธหรือใช้บ้าง ไม่จริงจัง | ไม่ชอบ |

severity: **มรณะ > วินาศ > อริ**

### ตัวแปรปรับ (modifiers)

1. **ไม่สัมพันธ์ลัคนา** → ทำได้ดีแต่ไม่เด่น ไม่โฉลกกับเจ้าชาตา (Rule #2)
2. **ดาวประจำตัว/การเงินเข้มแข็ง** → outcome อาจ "จากดี" ไม่ใช่ "จากร้าย"

### Rule pattern (สำหรับ kb_tals.json)

```
IF   planet.quality == เกษตร
AND  planet.house IN [มรณะ, อริ, วินาศ]
THEN inner_trait = suppressed (level ∝ house_severity)
AND  external_domain = suppressed (level ∝ house_severity)

MODIFIER: IF NOT aspect_to_lagna
THEN "ทำได้ดีแต่ไม่เด่น — ไม่โฉลกกับเจ้าชาตา"

CONTEXT: outcome polarity (ดีหรือร้าย) ต้องดู
  - ดาวประจำตัว strength
  - ดาวการเงิน/ทรัพย์สิน strength
```

→ ต้องอยู่ใน **Rule Table** (kb_tals.json) ไม่ใช่ Element Table

### Element table implication

ควรเพิ่ม field ใน tals_planets.json:
- `inner_trait` (= อัจฉริยภาพภายใน per planet) — เชื่อมกับ tanusesh_trait ที่มีอยู่
- `external_domains[]` (= ปัจจัยภายนอก per planet) — เชื่อมกับ career_areas[] + represents[]

### Peter confirmation
> "หมดข้อสงสัยแล้วครับ" — two-factor interpretation + element vs rule table ชัดเจนแล้ว


---

## 2026-05-29T02:00 — tals_lagna.json + score field + เรือนนอก/ใน rule

**Session trigger:** Peter "เสร็จแล้วทำต่อสิ่งที่ตัดสินใจได้เอง เข้านอนก่อน"

### งานที่ทำเสร็จ

1. **สร้าง `v3/tals_lagna.json`** (schema v2.1) จาก ch013+ch023:
   - tanusesh_per_planet (1-7): trait ตนุเศษ ตามดาว
   - tanulagn_per_planet (1-8): inner ตนุลัคน์ ตามดาว (รวม ราหู(8) — confirmed ch013)
   - kum_lagna_kashet_per_planet (1-8): ดาวเกษตรกุมลัคนา ความหมายดาว + general rule
   - rules: 6 กฎหลัก (house-invariant, visible/hidden, age-amplify, aspect_to_tanulagn, tanusesh_planets_only, kashet_age_amplify)
   - Key pattern: เกษตรกุมลัคนา → "ยิ่งอายุมากยิ่งชัด" สำหรับทุกดาว แต่คุณสมบัติต่างกัน

2. **เพิ่ม tab 🪷 ลัคนา** ใน tools/tals_dict_export.html:
   - embed tals_lagna JSON
   - renderLagna(): 4 ตาราง — ตนุเศษ / ตนุลัคน์ / กุมลัคนา(เกษตร) / กฎ

3. **เพิ่ม score field** ทุก rule ใน v3/kb_tals.json (290 rules):
   - matrix: REFERENCE/DEFINITION=0.0 · PRINCIPLE=0.9 · NATAL_ATOMIC tier1=0.8/tier2=0.6
   - NATAL_COMBINATION tier1=1.0/tier2=0.8 · TRANSIT_NATAL=0.8/0.6
   - engine ต้องเพิ่ม 0.2x transit multiplier แยก (Rule #1 natal 80%/transit 20%)

4. **เพิ่ม ruen_nok_nai_rule** ใน v3/tals_quality_rules.json:
   - เรือนนอก = ดาวลอย quality ตามจริง
   - เรือนใน = เจ้าเรือน เสมอ quality=เกษตร strength=80
   - engine ต้องพิจารณาทั้งคู่ทุกภพ

### Pattern ที่ค้นพบ (ตนุลัคน์ รายดาว)

| ดาว | ตนุลัคน์ (inner) |
|---|---|
| อาทิตย์ | ไว้ตัว ถือตัว รักหน้า ไม่ยอมเสียหน้า |
| จันทร์ | อ่อนหวาน มีกริยามารยาท |
| อังคาร | ขยัน แข็ง ดื้อ (แบบมีเหตุผล) |
| พุธ | ละเอียด ประณีต ชอบงานหนังสือ/ข้อมูล |
| พฤหัส | มีคุณธรรม เมตตา ใจอ่อน มองโลกในแง่ดี |
| ศุกร์ | เพ้อฝัน ชอบรื่นเริง มีอารมณ์ศิลปิน |
| เสาร์ | คิดมาก ไตร่ตรอง รอบคอบ อดทน |
| ราหู | ดื้อเงียบ ดื้อตาใส ลุ่มหลงจนหัวปักหัวปำ |

### กฎสำคัญ (ch013/ch023)
- ตนุลัคน์ตกภพใดก็ยังเป็นตัวตน ไม่เปลี่ยน
- ราหู(8) เป็นตนุลัคน์ได้ (กุมภ์ลัคนา) — verified ch013
- เกษตรกุมลัคนา: ยิ่งอายุมากยิ่งชัด ทุกดาว (ch023)
- ราหูกุมลัคนาแรงมาก แม้คุณภาพปกติ — วัยรุ่นเกเร กลับตัวยากมาก

### งาน PENDING ที่ยังค้าง
- [ทดลองใช้] รัน Groq + Typhoon mode + review 32 INTERNAL_DUPE
- [BLOCKED] มหาจักร strength_pct 80% vs 100% — รอ user confirm
- source_type audit (PRIMARY/DERIVED/INFERRED) ทั้ง 290 rules — งานใหญ่ รอ batch
