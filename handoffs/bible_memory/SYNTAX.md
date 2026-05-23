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
