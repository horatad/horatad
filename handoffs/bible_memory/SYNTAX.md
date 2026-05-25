# BIBLE Memory — SYNTAX & EXTRACTION LOGIC
# Type: Reference (editable if error found)
# Last updated: 2026-05-23

## สูตรกฎพื้นฐาน

```
[ดาว] + [สภาวะ/ตำแหน่ง] → [ผล/นิสัย]
```
ตัวอย่าง:
- `อาทิตย์(1) กุมลัคนา → หยิ่ง รักหน้า ไม่ยอมเสียหน้า`
- `เสาร์(7) อยู่ราศีมังกร(9) → เกษตร`
- `เสาร์(7)+ราหู(8) สัมพันธ์กัน → โชคใหญ่`

สูตร Transit:
```
เมื่อ[ดาวจร] + [ตำแหน่ง] + กระทบ[ดาวพื้น] → [ผลชั่วคราว]
```

## Rule Types
```
rule_use:
  "match"      = กฎที่ใช้พยากรณ์ได้ทันที
  "principle"  = หลักการ abstract จาก N กรณี
  "case_study" = ตัวอย่างเฉพาะบุคคล
  "reference"  = นิยาม/อ้างอิง ไม่ใช่กฎพยากรณ์

type:
  NATAL_ATOMIC       = ดาวเดียว
  NATAL_COMBINATION  = ดาว 2+ ดวง
  TRANSIT_NATAL      = ดาวจร
  PRINCIPLE          = หลักการ abstract
```

## Extraction Decision Tree

### NATAL_ATOMIC (tier 1)
- Subject: ดาวเดียว (planet_ids=[N])
- Predicate: in_sign / กุมลัคนา / สัมพันธ์ลัคนา / เป็นตนุเศษ / เป็นตนุลัคน์
- Outcome: คุณสมบัติ/นิสัย/โชคชะตา

### NATAL_COMBINATION (tier 2)
- Subject: ดาว 2+ ดวง
- ทดสอบ: เอาดาวหนึ่งออก กฎยังมีความหมายไหม? ถ้าไม่ → combination
- Outcome: emergent meaning ที่ไม่เคยมีในดาวเดียว

### TRANSIT_NATAL (tier 1-2)
- มี transit marker
- ดาวจรกระทบดาวพื้น
- ผลชั่วคราว

## Transit Markers (บ่งชี้กฎ transit)
```
เมื่อดาว / ขณะที่ดาว / ตอนที่ดาว / ในปีที่ / เมื่อโคจร
ดาวจร + กระทบ + ดาวพื้น / ดาวเดิน
```

## Case Study Markers (ห้าม extract เป็น rule โดยตรง)
```
กรณีที่ / ตัวอย่างเช่น / เช่น / อย่างเช่น
คนที่เกิด / บุคคลสำคัญ / เจ้าชาตาท่านนี้
```
⚠️ pattern: กรณีที่ 1,2,3 (เหมือนกัน) → principle 1 ข้อ + case_study N ข้อ

## Principle Markers
```
สรุปได้ว่า / กล่าวได้ว่า / เป็นกฎที่ว่า / หลักการคือ
โดยทั่วไป / โดยหลักแล้ว / ในหลักการ
```

## Polarity Detection
```
+ : สุภ/ศุภ/ดี/มงคล/โชค/รุ่งเรือง/เจริญ/ลาภ/ยศ/ชัย/อุดมสมบูรณ์
- : บาป/ร้าย/ทำลาย/เคราะห์/ทุกข์/พินาศ/วิบัติ/อันตราย
0 : กลาง/ทั่วไป/ปานกลาง/เป็นกลาง/ขึ้นอยู่กับ
```

## Ground Truth Test — CH036
**Principle**: เมื่อดาวจรคู่มิตร N คู่ activate พร้อมกัน → โชคใหญ่
**PASS**: กฎที่ extract ต้อง score CH036 ว่า positive outcome ได้
**FAIL**: ถ้ากฎระบุเสาร์+อังคาร → โชค (ผิด — เป็นคู่ศัตรู)

---
## Claude-derive pattern (process lesson, 2026-05-25)

**When skeleton _note says "Claude ไม่เติม" but derivation rule exists:**

หลายครั้ง skeleton notes ใน v3/master_dict_meanings.json เขียนไว้ตอนที่ Claude ยังไม่มี method ชัด. ตอนนี้ถ้ามี **derivation rule ที่ traceable**, Claude ทำได้โดยไม่ถือเป็น hallucination:

**Test แบบ 4 ข้อ ก่อน fill:**
1. ✅ มี source structural ใน BIBLE memory ที่ verifiable ไหม (เช่น SIGNS.md, PLANETS.md)?
2. ✅ มี derivation rule ที่อธิบายเป็น text ได้ใน 1 ประโยคไหม?
3. ✅ Trace ได้ว่าค่าแต่ละ field มาจากไหน?
4. ✅ Status field flag ว่า "Claude-derived, user refines" + `_derivation_method` documented?

ถ้าครบ 4 → fill ได้. ถ้าขาดข้อใด → skip, ถาม user หรือ pend.

**ตัวอย่าง applied นี้ session:**
- signs.represents/keywords ← derived จาก ruler.represents + element semantics + nature modifier
- house_rulers_by_lagna ← derived จาก signs[].ruler_planet_id (mechanical)
- lagna_concepts ← extracted จาก workers/chapter_texts.json ch013 (text → structured)
- planet_positions ← compiled จาก SIGNS.md (BIBLE memory ground-truth)

**ตัวอย่างที่ NOT applied (ยังถาม user):**
- ch004-006 deeper planet meanings — text มีแต่ Claude ต้อง careful วิเคราะห์
- KB extraction ใหม่ — ต้องการ LLM ที่ Claude ไม่ได้ใช้ตรง (sandbox)
- Wording selection policy — business decision

**กฎเสริม:** ถ้า derive แล้วเปลี่ยน status จาก "user refines" → "verified" ต้องมี user confirm (ไม่ self-promote)
