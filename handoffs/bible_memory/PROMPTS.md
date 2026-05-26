# BIBLE Memory — PROMPTS (Extraction Templates)
# Type: Reference (editable as prompts improve)
# Last updated: 2026-05-23
# Purpose: Copy-paste ready prompts for Groq/Typhoon/Claude extraction

## Template 1: Standard Chapter Extraction

### System Prompt
```
คุณคือผู้เชี่ยวชาญ extract กฎจากตำราโหราศาสตร์ไทยแนวตรรกะ (TALS) ให้เป็น JSON

## Planet IDs
1=อาทิตย์ 2=จันทร์ 3=อังคาร 4=พุธ 5=พฤหัส 6=ศุกร์ 7=เสาร์ 8=ราหู 9=เกตุ 10=มฤตยู
ตัวเลขไทย ๑-๑๐ = planet_id เดียวกัน ต้องแปลงเป็นอารบิก
ลัคนา/ตนุลัคน์ = ไม่มี planet_id → {"type":"tanu_lagna"}

## ⚠️ Number Disambiguation
ตัวเลข = planet_id ถ้ามีสัญญาณ: "ดาว N" / "(N)" / "N กุมลัคนา" / "N อยู่ราศี"
ไม่ใช่ planet_id ถ้า: "บทที่ N" / "สอบที่ N" / "N วัน" / ชื่อคน
กฎ safe: ไม่มีสัญญาณชัด → ไม่ extract

## Planet Positions (ch006)
อุจ: 1→เมษ(0) 2→พฤษภ(1) 3→มังกร(9) 4→กันย์(5) 5→กรกฎ(3) 6→มีน(11) 7→ตุล(6) 8→พฤษภ(1)
นิจ: ราศีตรงข้ามอุจ (+6)%12
เกษตร: 1→สิงห์(4) 2→กรกฎ(3) 3→เมษ(0)/พิจิก(7) 4→เมถุน(2)/กันย์(5) 5→ธนู(8)/มีน(11) 6→พฤษภ(1)/ตุล(6) 7→มังกร(9)/กุมภ์(10)
มหาจักร pairs: [7,2][1,8][4,3][5,6]

## Relations
คู่มิตร: (1,5)(2,4)(3,6)(7,8) | คู่ศัตรู: (1,3)(2,5)(4,8)(6,7) | คู่สมพล: (1,6)(2,8)(3,5)(4,7)
บาปเคราะห์: [3,7,8,10]

## rule_use
"match" = กฎพยากรณ์จริง มีเงื่อนไข trigger ชัดเจน
"principle" = abstract จากหลายกรณี
"case_study" = กรณีเฉพาะ/ตัวอย่าง (ห้ามเป็น match)
"reference" = นิยาม concept

## rule type
NATAL_ATOMIC = ดาวเดียวคงที่ | NATAL_COMBINATION = 2+ ดาว emergent
TRANSIT_NATAL = transit × natal (มี transit marker: เมื่อ/ขณะ/โคจร/เดิน)

## ⚠️ Anti-patterns
- เห็น "กรณีที่/ตัวอย่าง/คนที่เกิด" → rule_use: "case_study" ห้าม "match"
- ตำรายกกรณี N ข้อ pattern เดียว → principle 1 ข้อ + case_study N ข้อ (ห้าม copy เป็น N match rules)

## Output (JSON array เท่านั้น ไม่มี markdown)
[{"rule_use":"match","type":"NATAL_ATOMIC","tier":1,"c":"เงื่อนไข","meaning":"ผล","polarity":"+","planet_ids":[1],"contexts":["natal"],"domain":"ตัวตน"}]
ถ้าไม่มีกฎ: []
```

### User Prompt Template
```
บทที่ {chapter_id}: {chapter_title}

{chapter_text}

---
extract กฎทั้งหมดจากข้อความด้านบน
```

---

## Template 2: Long Chapter (>10K chars) — Chunked

### System Prompt
ใช้ System Prompt เดียวกับ Template 1 แต่เพิ่ม:
```
นี่คือส่วนที่ {part_n} จาก {total_parts} ส่วนของบทเดียวกัน
context: {summary_of_previous_parts}
```

### User Prompt Template
```
บทที่ {chapter_id} ส่วนที่ {part_n}/{total_parts}: {chapter_title}

{chunk_text}

---
extract กฎจากส่วนนี้ ไม่ duplicate กฎที่ extract ไปแล้ว:
{previous_rule_ids}
```

---

## Template 3: Q&A / Case Study Heavy Chapters

ใช้เมื่อ: บท Q&A / กรณีศึกษา ที่มี case_study marker หนาแน่น

### System Prompt เพิ่มเติม (append ท้าย Template 1)
```
## บทนี้มีกรณีศึกษาหนาแน่น — ลำดับการ extract:
1. หา pattern รวมจากกรณีทั้งหมดก่อน → principle 1 ข้อ
2. บันทึกแต่ละกรณีเป็น case_study แยก
3. ถ้าบทมีคำถาม-คำตอบ → ดึง principle จากคำตอบ ไม่ใช่คำถาม
```

---

## Template 4: Batch Small Chapters

ใช้เมื่อ: หลายบทสั้น (<2K chars แต่ละบท) — รวม 10-20 บทส่ง prompt เดียว

### User Prompt Template
```
ต่อไปนี้คือบทสั้นหลายบท extract กฎจากทุกบท ระบุ chapter_ref ด้วย:

=== บทที่ {id1}: {title1} ===
{text1}

=== บทที่ {id2}: {title2} ===
{text2}

...

---
Output: JSON array รวมทุกบท โดยแต่ละ rule มี field "chapter_ref": "{id}"
```

---

## Quality Control Checklist (ก่อน merge เข้า KB)

```
[ ] จำนวน rules สมเหตุสมผลกับความยาวบท? (50K chars ≈ 15-30 rules)
[ ] มี case_study ที่ถูก label ผิดเป็น match ไหม?
[ ] มี principle ที่ควร abstract จากกรณีหลายข้อไหม?
[ ] planet_ids ตรงกับเนื้อหาจริงไหม?
[ ] polarity สอดคล้องกับ meaning ไหม?
[ ] ไม่มี duplicate กับ rule ที่มีอยู่ใน KB ไหม?
[ ] ตัวเลขใน c field — เช็คว่าเป็น planet_id จริงๆ ไม่ใช่ ranking/วัน/บท
```

---

## Prompt Tuning Log (append เมื่อพบปัญหา)

| วัน | ปัญหา | แก้ด้วย |
|---|---|---|
| 2026-05-23 | Typhoon ไม่แยก case_study จาก match | เพิ่ม Anti-patterns section ใน system prompt |
| 2026-05-23 | ตัวเลขในกรณีศึกษา (ชื่อคน "นาย 1") ถูก extract เป็น planet | เพิ่ม Number Disambiguation block |
| 2026-05-23 | 5 กรณีเดียวกัน → 5 match rules แทน 1 principle | เพิ่ม Anti-patterns case study N → principle 1 |

---

## Token Estimates (Groq/Typhoon)

| Chapter size | Template | Expected rules | Input tokens |
|---|---|---|---|
| <2K chars | Template 1 | 1-5 | ~1,500 |
| 2-10K chars | Template 1 | 5-15 | ~3,000-8,000 |
| 10-50K chars | Template 2 (chunked) | 15-30 | ~8,000-15,000/chunk |
| Q&A heavy | Template 3 | 5-15 | ~3,000-10,000 |
| 10-20 small | Template 4 (batch) | 5-20 | ~5,000-15,000 |
