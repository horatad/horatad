# BIBLE Memory — TAXONOMY (Rule Schema Spec)
# Type: Reference (editable if schema changes)
# Last updated: 2026-05-23
# Purpose: LLM-readable spec — Typhoon/Groq/Claude reads this to extract rules correctly

## Rule JSON Schema (every extracted rule must match this)

```json
{
  "id":         "string — R{N} (e.g. R001, R291)",
  "rule_use":   "match | principle | case_study | reference",
  "type":       "NATAL_ATOMIC | NATAL_COMBINATION | TRANSIT_NATAL | DEFINITION | PRINCIPLE | REFERENCE",
  "tier":       "1 | 2 | 3  (number of planets required for rule to apply)",
  "c":          "string — condition in 1 sentence Thai (trigger ของกฎ)",
  "meaning":    "string — interpretation/prediction in Thai (ผลที่เกิดขึ้น)",
  "polarity":   "+ | - | 0 | ~  (positive / negative / neutral / conditional-mixed)",
  "planet_ids": "[array of planet IDs 1-10, empty if no specific planet]",
  "contexts":   "['natal'] | ['transit'] | ['natal','transit']",
  "domain":     "ตัวตน|การเงิน|ความรัก|สุขภาพ|หน้าที่การงาน|ความสูญเสีย|ทั่วไป|นิสัย|ลักษณะนิสัย|ความสัมพันธ์|โชคลาภ|หลักการ|ดาวจร|อาชีพ|อ้างอิง"
}
```

## Field Definitions

### rule_use
| Value | Description | When to use |
|---|---|---|
| `match` | กฎพยากรณ์จริง มีเงื่อนไข trigger ชัดเจน | ส่วนใหญ่ของ rules |
| `principle` | abstract pattern derive จากหลายกรณีรวมกัน | หลังกรณีศึกษา 2+ อัน |
| `case_study` | กรณีเฉพาะ/ตัวอย่างบุคคลที่ตำรายกมา | ห้ามเป็น match |
| `reference` | นิยาม concept ไม่มี trigger | definition บท |

### type
| Value | Description | tier ปกติ |
|---|---|---|
| `NATAL_ATOMIC` | ดาวเดียวส่งผลคงที่ตลอดชีวิต | 1 |
| `NATAL_COMBINATION` | 2+ ดาวสร้าง emergent meaning | 2-3 |
| `TRANSIT_NATAL` | transit × natal = timing เหตุการณ์ | 1-2 |
| `DEFINITION` | นิยาม term/concept | 0 |
| `PRINCIPLE` | abstract principle | 0 |
| `REFERENCE` | อ้างอิง formula/config | 0 |

### tier (test ง่าย)
- tier 1: เอาดาวดวงเดียวออก → rule หายความหมาย
- tier 2: ต้องมีทั้ง A และ B พร้อมกัน
- tier 3: ต้อง A, B, C พร้อมกัน

### polarity
- `+` : outcome ดี (โชค/ลาภ/สำเร็จ/รุ่งเรือง/มีอำนาจ)
- `-` : outcome ร้าย (เคราะห์/ทุกข์/อันตราย/สูญเสีย)
- `0` : กลาง ไม่ดีไม่ร้าย หรือเป็นนิยาม/reference
- `~` : **conditional-mixed** — อาจดีหรือร้าย ขึ้นอยู่กับ context ส่วนตัว พบบ่อยที่สุดใน KB (~38%)
  → ใช้ "~" เมื่อผลขึ้นอยู่กับ: ดาวอื่นที่มาด้วย / คุณภาพดาว / ดวงชาตาแต่ละคน

### domain (ค่าที่ใช้จริงใน KB — ไม่ต้องแก้ถ้า extract ตรงกับบริบท)
| Value | ครอบคลุมเรื่อง |
|---|---|
| `ตัวตน` | บุคลิก, รูปร่าง, สุขภาพโดยรวม |
| `นิสัย` / `ลักษณะนิสัย` | นิสัย, ลักษณะบุคลิก (alias ของ ตัวตน) |
| `การเงิน` | เงิน, ทรัพย์สิน, รายได้, หนี้ |
| `โชคลาภ` | โชคใหญ่, ลาภพิเศษ (ใช้แทน การเงิน ได้ถ้าเน้น โชค) |
| `ความรัก` | คู่ครอง, การแต่งงาน |
| `ความสัมพันธ์` | ความสัมพันธ์, หุ้นส่วน, สมพงศ์ (alias ของ ความรัก) |
| `สุขภาพ` | โรค, อาการ, อุบัติเหตุ |
| `หน้าที่การงาน` / `อาชีพ` | อาชีพ, ตำแหน่ง, ความสำเร็จ |
| `ดาวจร` | transit rules ที่เน้นดาวเฉพาะดวง |
| `ความสูญเสีย` | การตาย, พินาศ, สูญเสียใหญ่ |
| `หลักการ` | abstract principles, methodology |
| `อ้างอิง` | reference, config, workflow |
| `ทั่วไป` | หลายด้านพร้อมกัน หรือไม่ระบุชัด |
| `ความสูญเสีย` | การตาย, อุบัติเหตุร้ายแรง, พินาศ |
| `ทั่วไป` | หลายด้านพร้อมกัน หรือไม่ระบุชัด |

## Extraction Decision Tree

```
ข้อความนี้คืออะไร?
│
├─ มี case study marker? → rule_use: "case_study"
│   (กรณีที่ / ตัวอย่างเช่น / คนที่เกิด / บุคคลสำคัญ)
│
├─ มี principle marker หลังกรณีหลายข้อ? → rule_use: "principle", type: "PRINCIPLE"
│   (โดยทั่วไป / สรุปว่า / กฎทั่วไปคือ)
│
├─ มี transit marker? → type: "TRANSIT_NATAL", context: ["natal","transit"]
│   (เมื่อดาว / ขณะที่ / โคจรผ่าน / ดาวเดิน)
│
├─ เป็นนิยาม? → rule_use: "reference", type: "DEFINITION"
│   (คือ / หมายถึง / นิยามของ)
│
└─ เป็น natal rule → ดูจำนวนดาว
    ├─ ดาวเดียว → type: "NATAL_ATOMIC", tier: 1
    └─ หลายดาว → type: "NATAL_COMBINATION", tier: 2-3
        test: เอาดาวใดดาวหนึ่งออก กฎยังมีความหมายไหม?
        ถ้าใช่ → tier ต่ำกว่า (อาจเป็น tier 1)
        ถ้าไม่ → tier 2-3 (combination จริง)
```

## Good vs Bad Examples

### ✅ GOOD — NATAL_ATOMIC tier 1
```json
{
  "rule_use": "match",
  "type": "NATAL_ATOMIC",
  "tier": 1,
  "c": "อาทิตย์(1) กุมลัคนา",
  "meaning": "หยิ่ง รักหน้า ไม่ยอมเสียหน้า บารมีสูง",
  "polarity": "0",
  "planet_ids": [1],
  "contexts": ["natal"],
  "domain": "ตัวตน"
}
```

### ✅ GOOD — NATAL_COMBINATION tier 2
```json
{
  "rule_use": "match",
  "type": "NATAL_COMBINATION",
  "tier": 2,
  "c": "เสาร์(7)+ราหู(8) สัมพันธ์ลัคนาพร้อมกัน (คู่มิตรใหญ่)",
  "meaning": "ทำงานคล่อง มักร่ำรวย โชคใหญ่",
  "polarity": "+",
  "planet_ids": [7, 8],
  "contexts": ["natal"],
  "domain": "การเงิน"
}
```

### ✅ GOOD — TRANSIT_NATAL
```json
{
  "rule_use": "match",
  "type": "TRANSIT_NATAL",
  "tier": 1,
  "c": "เมื่อเสาร์(7)จรทับลัคนา",
  "meaning": "มีปัญหารอบทิศทาง อุปสรรคหลายด้านพร้อมกัน",
  "polarity": "-",
  "planet_ids": [7],
  "contexts": ["natal", "transit"],
  "domain": "ทั่วไป"
}
```

### ❌ BAD — case study นำมาเป็น match rule
```json
{
  "rule_use": "match",    ← ผิด! ควรเป็น case_study
  "c": "กรณีที่ดาวอาทิตย์กุมลัคนา ดังเช่น นายก..."
}
```

### ❌ BAD — copy กรณีศึกษา 5 ข้อเป็น 5 match rules
ถ้าตำรายก "เมื่อดาว X จรทับ Y (คู่มิตร) → โชค" 5 กรณี ต่างดาว
→ WRONG: 5 match rules copy กรณีทีละอัน
→ RIGHT: 1 principle "N คู่มิตร activated พร้อมกัน → โชคใหญ่" + 5 case_study

## Edge Cases

### กฎลบ-ลบ=บวก
- เกษตร+เกษตร+เล็งกัน → ประเกษตร (polarity เปลี่ยน)
- **ห้ามใช้กับ**: มหาจักร, อุจจาวิลาส, อุจจาภิมุข, ราชาโชค, เทวีโชค
- **ใช้เฉพาะ**: เกษตร / ประเกษตร / อุจ / นิจ

### Number disambiguation (ตัวเลขในตำรา)
- "ดาว ๑" / "(๑)" / "๑ กุมลัคนา" → planet_id = 1
- "สอบได้ที่ 1" / "บทที่ 1" / "วัน 1" → ไม่ใช่ planet_id → ไม่ extract
- ถ้าไม่มีสัญญาณชัดเจน → ถือว่าไม่ใช่ planet_id (safe default)

### คุณภาพดาว + ไม่สัมพันธ์ลัคนา
- ดาวคุณภาพดีแต่ไม่สัมพันธ์ลัคนา → ช่วยได้แค่ส่วนน้อย (ไม่แสดงออกชัด)
- ต้องระบุ context: "natal" + note ว่า "ต้องสัมพันธ์ลัคนาจึงแสดงผลเต็ม"

### Transit ทับลัคนา vs ทับตนุลัคน์
- ทับลัคนา = กว้าง รอบทิศ
- ทับตนุลัคน์ = เฉพาะเจาะจงกว่า ต่างกัน
- บันทึกไว้ใน c field ให้ชัดเจน

### กุมลัคนา priority
- ดาวกุมลัคนาแสดงผลก่อนดาวตรีโกณ/โยค/เล็งเสมอ (R288)
- ถ้าหลายดาวสัมพันธ์ลัคนา → กุมลัคนาออกก่อน

## Multi-DB Architecture (2026-05-28)

### Source Hierarchy — 4 ฐานข้อมูล แยกกันเด็ดขาด

| DB file | Level | แหล่งที่มา | Load mode |
|---|---|---|---|
| `kb_tals.json` | 1 — PRIMARY | 100CH ตำรา TALS เท่านั้น | เสมอ |
| `kb_text.json` | 2 — SECONDARY | ตำราโหราศาสตร์อื่น (ระบุชื่อตำรา+ผู้แต่ง) | optional |
| `kb_expert.json` | 3 — TERTIARY | ประสบการณ์โหรมีชื่อ (ระบุชื่อ+แหล่งอ้างอิง) | optional |
| `kb_user.json` | 4 — QUATERNARY | ประสบการณ์ผู้ใช้ | optional |

**กฎเหล็ก:** ห้ามผสม level ต่างกันในไฟล์เดียวกัน — source contamination ทำให้ KB ไม่น่าเชื่อถือ

### Cross-DB Linking Schema

Rule ใน kb_text / kb_expert / kb_user ต้องมี `tals_link` field:

```json
{
  "rule_id": "TX-001",
  "db": "kb_text",
  "source_ref": "ตำราโหราศาสตร์ไทย — อ.เทพย์ สาริกบุตร / หน้า 45",
  "tals_link": {
    "tals_rule_id": "R055",
    "relation": "confirm"
  },
  "tals_compatible": true,
  ...rule fields ปกติ (c, meaning, polarity, planet_ids, contexts, domain)...
}
```

ถ้าไม่มี rule คู่ใน TALS:
```json
"tals_link": {
  "tals_rule_id": null,
  "relation": "new"
}
```

### Relation Types

| type | ความหมาย | action |
|---|---|---|
| `confirm` | บอกเหมือน TALS ต่างแค่ wording — เพิ่ม confidence | เพิ่ม weight ให้ TALS rule |
| `extend` | ครอบกรณีที่ TALS ไม่พูดถึง — compatible | ใช้ร่วมกับ TALS ได้ |
| `conflict` | polarity/ผลต่างจาก TALS rule เดียวกัน | user ต้อง decide ก่อนใช้ |
| `new` | topic ใหม่ทั้งหมด ไม่มีคู่ใน TALS | standalone — ระวัง hallucination |

### Engine Loading Modes

```js
// strict TALS — production default
load('kb_tals.json')

// TALS + ตำราเสริม
load('kb_tals.json', 'kb_text.json')

// full — research mode
load('kb_tals.json', 'kb_text.json', 'kb_expert.json', 'kb_user.json')
```

**กฎ:** conflict rules ใน kb_text/expert/user ต้อง filter ออกโดยอัตโนมัติเมื่อโหลดพร้อม kb_tals  
จนกว่า user จะ decide → mark เป็น `PENDING_REVIEW`

### Source Fields (เพิ่มใน rule ทุก level)

| field | required | description |
|---|---|---|
| `db` | ✅ | ชื่อ DB ที่ rule นี้อยู่ |
| `source_level` | ✅ | 1-4 |
| `source_ref` | ✅ | ch### (level 1) / "ชื่อตำรา/หน้า" (level 2) / "ชื่อโหร/URL" (level 3) / "user/YYYY-MM-DD" (level 4) |
| `tals_link` | ✅ level 2-4 | `{tals_rule_id, relation}` |
| `tals_compatible` | ✅ level 2-4 | true / false / null (pending) |

## Validation Checklist (ก่อน commit rule ลง KB)

- [ ] `c` field อ่านแล้วเข้าใจเงื่อนไขทันที ไม่คลุมเครือ
- [ ] `meaning` field บอกผลที่เจ้าชะตาสัมผัสได้จริง
- [ ] `polarity` สอดคล้องกับ meaning (มีโชค→+ / มีทุกข์→-)
- [ ] `planet_ids` ตรงกับดาวใน condition จริงๆ
- [ ] `type` ถูกต้องตาม decision tree
- [ ] ไม่ duplicate กับ rule ที่มีอยู่แล้วใน KB
- [ ] ถ้าเป็น case_study → ไม่ควร rule_use: "match"
- [ ] ถ้า text มีกรณี 2+ → ตรวจว่า abstract เป็น principle แล้วหรือยัง
- [ ] `db` field ระบุถูก KB ที่ rule นี้ควรอยู่ (kb_tals / kb_text / kb_expert / kb_user)
- [ ] level 2-4: มี `tals_link.relation` ชัดเจน (confirm/extend/conflict/new)
- [ ] conflict rules: อย่า commit ลง kb_tals.json เด็ดขาด
