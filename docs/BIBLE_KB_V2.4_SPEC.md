# BIBLE KB V2.4 — Schema Specification (DRAFT)

> สถานะ: **DRAFT — รอ user/expert approve ก่อน implement migration**
> วันที่: 2026-05-22
> ผู้เขียน: Claude (session BIBLE)
> Previous: V2.3.0 (342 rules ใน `v3/kb.json`)

---

## 1. ปัญหาที่ V2.4 จะแก้

จาก audit 10 rules ในภาพ user (R148 R169 R171 R175 R183 R199 R246 R247 R263 R124) พบ pattern หลัก:

| # | ปัญหา | จำนวน rule (จาก audit) | สาเหตุ |
|---|---|---|---|
| 1 | `conditions[]` ไม่ครบเทียบกับ `c` text → false positive | 4/10 (R171 R247 R175 R169) | schema ไม่มี field รองรับ |
| 2 | "ทับดาว X เดิม" / "เล็งดาว X" หาย | 3/10 (R148 R169 R183) | ไม่มี `aspect_to_planet` |
| 3 | "คู่มิตร / คู่ศัตรู" หาย | 3/10 (R183 R199 R246) | engine ไม่ compute relation |
| 4 | "ดาวร้ายครบ N ดวง" หาย | 2/10 (R171 R247) | ไม่มี `evil_planet_count` |
| 5 | CASE_STUDY ติดเป็น match ทั่วไป → noise | 5/10 | rule_type ไม่ filter |
| 6 | `p` ผสม prediction + exception + meta | 4/10 | 1 rule = 1 `p` blob |
| 7 | catch-all rule (`ดาว 8 จร ทุกกรณี`) trigger ทุกครั้ง | R124 | ไม่มี `rule_use` distinction |

**กว้างกว่านี้ — สถิติทั้ง 342 rules:**
- 194 (57%) มี separator ใน `p` → หลายความหมายรวม
- 79 (23%) มี logical operator ใน `c` → หลายเงื่อนไขใน 1 ประโยค
- 95 (28%) มี 3+ required conditions
- 42 ไม่มี `rule_type`

---

## 2. Engine support ที่ต้องเสร็จก่อน

V2.4 schema พึ่ง engine helpers — เสร็จแล้วใน session นี้:

| Helper | export from | สถานะ |
|---|---|---|
| `planet_relation(p1,p2)` → มิตร/ศัตรู/สมพล/ตน/ปกติ | `v3/engine.js` | ✅ ผ่าน R034 R035 R036 |
| `aspect_to_planet(pos,p1,p2)` → KUM/LENG/YOK/TRI/NONE | `v3/engine.js` | ✅ |
| `transit_to_natal_aspect(natalPos,transitPos,tIdx,nIdx)` | `v3/engine.js` | ✅ |
| `count_evil_lagna_aspects(pos,ascSign,minStrength)` | `v3/engine.js` | ✅ |
| `house_name_to_idx(name)` / `house_idx_to_name(idx)` | `v3/engine.js` | ✅ |
| `FRIEND_PAIRS / ENEMY_PAIRS / SAMPHON_PAIRS` | `v3/engine.js` | ✅ ground truth: R034 R035 R036 |
| `EVIL_PLANETS = [3,7,8,10]` (อังคาร เสาร์ ราหู มฤตยู) | `v3/engine.js` | ✅ |
| `HOUSE_NAMES_TH` ['','ตนุ','กฎุมพะ',...,'วินาศ'] | `v3/engine.js` | ✅ |

---

## 3. V2.4 Schema — Top-level

```jsonc
{
  "version": "2.4.0",
  "updated": "YYYY-MM-DD",
  "total": N,
  "engine_min_version": "3.1.0",
  "rules": [ /* ... */ ]
}
```

`engine_min_version` — ใหม่ใน V2.4 เพื่อกัน kb.json ไปรันบน engine เก่าที่ไม่มี helper

---

## 4. V2.4 Rule Schema — เปลี่ยนหลัก

### 4.1 Field ใหม่: `rule_use`

แยกบทบาทของ rule — กรอง CASE_STUDY ออกจาก match pipeline

| `rule_use` | ความหมาย | match_rules() จับ? | ใช้ใน |
|---|---|---|---|
| `match` | rule ที่ trigger จาก condition matching | ✅ | ดวง user → คำพยากรณ์ |
| `reference` | นิยาม/หลักการ (เสริด, พักร, ภพต่างๆ) | ❌ | doc / hover tooltip |
| `case_study` | เคสจริงในประวัติศาสตร์ — example เท่านั้น | ❌ | training data, expert review |
| `principle` | กฎสากล "ดาว X จรทุกกรณี" | ⚠️ match แต่ tag `[หลักการ]` ไม่ส่ง Typhoon | system prompt context |

หมายเหตุ: `rule_type` เดิม (CASE_STUDY/TRUE_RULE/TRANSIT_RULE/HOUSE_CONCEPT/DEFINITION/REFERENCE) **ยังอยู่** แต่เปลี่ยนบทบาทเป็น semantic tag ไม่ใช่ filter

### 4.2 Field ใหม่: `predictions[]` แทน `p` blob

```jsonc
{
  "id": "R148",
  "rule_use": "case_study",
  "rule_type": "CASE_STUDY",
  "conditions": [ /* ... */ ],
  "global_conditions": [ /* ... */ ],

  "predictions": [
    {
      "text": "ดวงชาตาเข้มแข็งมาก ดาว 7 จรได้คู่มิตร อาจไม่เป็นอะไรเลย",
      "polarity": "~",
      "domain": "ตัวตน",
      "applies_when": "default",
      "empirical_p": null,
      "empirical_n": 0
    },
    {
      "text": "ตำราเดิมถือว่าถึงฆาต",
      "polarity": "-",
      "domain": "ความสูญเสีย",
      "applies_when": "no_friend_aspect",
      "empirical_p": null,
      "empirical_n": 0
    }
  ],

  "p": "ตำราเดิมถือว่าถึงฆาต แต่ถ้าดวงชาตาเข้มแข็งมาก...",   /* legacy mirror — auto-generated */
  "ct": "...", "ch": "...", "t": [...], "pr": 1,
  "rule_source": "major", "weight": 1
}
```

**หลักการ:**
- 1 `predictions[]` entry = 1 ความหมาย atomic (ไม่ใช่ blob)
- `polarity`: `+` `-` `~` ต่อ entry (เดิม rule ทั้งก้อนมี polarity เดียว)
- `applies_when`: nuance string — เช่น `"no_friend_aspect"`, `"evil_count>=3"`, `"default"`
- `empirical_p` / `empirical_n`: per-prediction validation จาก JULIAN — รายอันแม่นกว่ารายกฎ
- `p` (legacy) ยังอยู่ — auto-generate จาก `predictions[*].text` join — ให้ V2.3 reader อ่านได้

### 4.3 Field ขยาย: `conditions[].*`

```jsonc
{
  "planet_id": "1-10" | "ANY" | { "type": "tanu_lagna" } | { "type": "h10_owner" },
  "house_lord_of": 1-12,                     /* unchanged */

  "context": "natal" | "transit" | "transit_planet",    /* NEW — แทน t:['จร'] hack */
  "quality_required": "ANY" | "ดี" | "เสีย" | "ปกติ"
                    | "เกษตร" | "มหาอุจ" | "อุจจาวิลาส" | "อุจจาภิมุข"
                    | "ประ" | "ประเกษตร" | "นิจ"
                    | "มหาจักร" | "จุลจักร" | "ราชาโชค" | "เทวีโชค"
                    | { "std_score_min": -5 .. 5 }      /* NEW — numeric */
                    | { "in": ["เกษตร","อุจ"] },        /* NEW — multi */

  "lagna_aspect_req": "ANY" | "KUM" | "LENG" | "YOK" | "TRI" | "NONE"
                    | "ANY_ASPECT"                       /* NEW — !==NONE */
                    | { "in": ["KUM","LENG"] },          /* NEW */

  "house_required": 1-12,                                /* NEW */
  "house_name": "ตนุ"|"กฎุมพะ"|...|"วินาศ",              /* NEW — equivalent to house_required */
  "sign_required": 0-11,                                 /* NEW */

  "aspect_to_planet": {                                  /* NEW */
    "id": "1-10" | { "type": "tanu_lagna" },
    "scope": "natal" | "transit",                        /* ของอีกฝั่ง */
    "type": "KUM" | "LENG" | "YOK" | "TRI" | "ANY_ASPECT"
  },

  "relation_to": {                                       /* NEW */
    "id": "1-10",
    "type": "มิตร" | "ศัตรู" | "สมพล" | "ปกติ"
                  | "ANY_FRIEND" | "ANY_ENEMY"
  },

  "required": true | false                               /* unchanged */
}
```

### 4.4 Field ใหม่: `global_conditions[]`

Rule-level conditions ที่ไม่ผูกกับ planet ใด — เช่น "ดาวร้ายครบ N ดวง"

```jsonc
"global_conditions": [
  {
    "type": "evil_planet_count",
    "scope": "natal" | "transit",
    "min": 2,
    "aspect_min": "LENG" | "YOK" | "TRI" | "ANY_ASPECT"
  },
  {
    "type": "overall_strength",
    "min": "ปานกลาง" | "แข็งแกร่ง" | "แข็งแกร่งมาก"
  },
  {
    "type": "no_friend_aspect",       /* ดาวคู่มิตรไม่สัมพันธ์ */
    "for_planet": "8"
  }
]
```

---

## 5. ตัวอย่าง migration — Rule ที่มีปัญหาจาก audit

### 5.1 R171 (false positive รุนแรง)

**V2.3 (เก่า):**
```json
{
  "c": "ดาว 5 จรเล็งลัคนา ขณะดาวร้ายจรครบหลายดวง",
  "p": "ดาว 5 จรช่วยได้เพียงทำให้เสียชีวิตอย่างสงบ ไม่ทรมาน — ไม่สามารถยับยั้งความตายได้เมื่อดาวร้ายครบมาก",
  "conditions": [
    { "planet_id": "5", "quality_required": "ANY",
      "lagna_aspect_req": "เล็งลัคนา", "required": true }
  ]
}
```
**ปัญหา:** trigger ทุกครั้งที่ดาว 5 จรเล็งลัคนา (ไม่ดูดาวร้าย)

**V2.4 (ใหม่):**
```jsonc
{
  "id": "R171",
  "rule_use": "case_study",          /* ❗ ออกจาก match pipeline */
  "rule_type": "CASE_STUDY",
  "ct": "กรณีศึกษา 1005 — ดวงถึงฆาต เพราะดาวร้ายให้โทษ",

  "conditions": [
    { "planet_id": "5", "context": "transit",
      "lagna_aspect_req": "LENG", "required": true }
  ],
  "global_conditions": [
    { "type": "evil_planet_count", "scope": "transit",
      "min": 3, "aspect_min": "LENG" }    /* ❗ ต้องมีดาวร้ายจรครบ */
  ],

  "predictions": [
    { "text": "ทำให้เสียชีวิตอย่างสงบ ไม่ทรมาน",
      "polarity": "-", "domain": "ความสูญเสีย",
      "applies_when": "evil_count>=3" }
  ]
}
```

### 5.2 R183 (คู่ศัตรู + ทับดาวเดิม)

**V2.3:** conditions ไม่ encode "คู่ศัตรู" + "ทับดาว 0 เดิม"

**V2.4:**
```jsonc
{
  "id": "R183", "rule_use": "case_study",
  "conditions": [
    { "planet_id": "8", "context": "transit",
      "lagna_aspect_req": "KUM", "required": true },
    { "planet_id": { "type": "tanu_lagna" }, "context": "transit",
      "relation_to": { "id": "8", "type": "ศัตรู" }, "required": true },
    { "planet_id": "0", "context": "transit",
      "lagna_aspect_req": "LENG", "required": true },
    { "planet_id": "3", "context": "transit",
      "aspect_to_planet": { "id": "0", "scope": "natal", "type": "KUM" },
      "required": true }
  ],
  "predictions": [
    { "text": "ดวงชาตาอ่อนแอชั่วคราว",
      "polarity": "-", "domain": "ตัวตน" },
    { "text": "สติแตกหักชั่ววูบ ตัดสินใจคิดสั้น",
      "polarity": "-", "domain": "ตัวตน" }
  ]
}
```

### 5.3 R124 (catch-all rule)

**V2.3:** `"ดาว 8 จร ทุกกรณี"` → trigger ทุกครั้งที่ราหูจรอยู่

**V2.4:**
```jsonc
{
  "id": "R124", "rule_use": "principle",   /* ❗ ไม่ส่ง Typhoon — ใช้เป็น context */
  "conditions": [
    { "planet_id": "8", "context": "transit",
      "lagna_aspect_req": "ANY_ASPECT", "required": true }
  ],
  "predictions": [
    { "text": "ราหูจรให้โทษอย่างเดียว แม้คู่มิตรก็ไม่ให้คุณ",
      "polarity": "-", "domain": "ทั่วไป",
      "applies_when": "principle" }
  ]
}
```

---

## 6. Backward compatibility

V2.4 schema **ต้องอ่านได้ทั้ง V2.3 และ V2.4** ใน transition period:

1. `kb.json` ยังคง field เก่า (`c`, `p`, `conditions[].planet_id` string, etc.)
2. เพิ่ม field ใหม่เป็น **optional** — V2.3 reader skip ได้
3. `match_rules()` (in `v3/typhoon.js`) ต้องอ่าน:
   - ถ้ามี `predictions[]` → ใช้
   - ถ้าไม่มี → fallback ไปอ่าน `p`
   - ถ้ามี `rule_use === "case_study"|"reference"` → skip ออกจาก match
   - ถ้ามี `global_conditions[]` → check ก่อนเข้า conditions[] loop
4. `kb_reviewer.html` ต้องรองรับการแสดง predictions[] (อาจ phase ทีหลัง)

---

## 7. Migration plan

### Phase 1 — Engine (เสร็จแล้ว ✅)
- เพิ่ม helpers ใน `v3/engine.js` — bump engine version → 3.1.0

### Phase 2 — Schema + Reader (ต้องทำต่อ)
- Update `v3/typhoon.js` `match_rules()` รองรับ V2.4 fields
- Update `v3/interpretation.js` `compose_local_prediction()` อ่าน `predictions[]`
- Update `tools/kb_reviewer.html` แสดง predictions[]
- ไม่แตะ kb.json — ยัง V2.3

### Phase 3 — Migration tool (รอ expert)
- `tools/kb_migrator.html` — รับ V2.3 rule → user/expert แก้เป็น V2.4 ผ่าน UI
- Save patch per-rule (ไม่ใช่ bulk auto-convert)
- export V2.4 kb.json ทับของเดิม

### Phase 4 — Expert review (รอ user)
- ผู้เชี่ยวชาญแก้ 342 rules → คาดว่าเหลือ 400-500 rules (split p, แยก rule_use)
- ลำดับ priority: rules ที่ false positive รุนแรง (R171 R247 R175 ฯลฯ) ก่อน
- backup ทุก checkpoint

### Phase 5 — Empirical validation (รอ JULIAN data)
- JULIAN match rules → คำนวณ `empirical_p` per `predictions[]` entry
- update `predictions[*].empirical_p` และ `_n`

---

## 8. ความเสี่ยง

| Risk | ผลกระทบ | Mitigation |
|---|---|---|
| Engine helper data ผิด (FRIEND_PAIRS ฯลฯ) | ทุก rule ที่ใช้ relation_to ผิด | ใช้ R034-R036 เป็น single source of truth |
| Migration tool bug → corrupt kb.json | สูญเสีย rule | backup branch + per-rule patch ไม่ bulk |
| Expert ไม่ตรงกันเรื่อง `applies_when` | inconsistent | document examples ใน BIBLE_MISSION.md ก่อน |
| `predictions[]` แยกผิด — semantic หาย | คำพยากรณ์ผิดเจตนา | expert review บังคับ — ห้าม auto-split |
| V2.3↔V2.4 reader mismatch | runtime error | unit test reader ทั้ง 2 รูปแบบ |

---

## 9. Open questions (ต้อง user ตอบ)

- [ ] `polarity` ของ `predictions[]` แต่ละ entry — Claude infer ได้ไหม? หรือ expert ระบุเองทุก entry?
- [ ] `applies_when` — ใช้ string format อะไร? DSL หรือ free-form?
- [ ] ทุก rule_use=case_study ออกจาก Typhoon prompt จริงหรือ? — ผู้ใช้อาจอยากเห็นเคสที่ match
- [ ] `global_conditions` `evil_planet_count.aspect_min` default ควรเป็น `LENG` หรือ `ANY_ASPECT`?
- [ ] `engine_min_version` กลไก enforce — แสดง warning หรือ refuse load?

---

## 10. References

- ground truth สำหรับ planet relations: R034 R035 R036 ใน `v3/kb.json`
- engine helper implementations: `v3/engine.js` (l.193-end)
- audit findings: handoffs/BIBLE session 2026-05-22
- previous schema: V2.3.0 (342 rules) ใน `v3/kb.json`
