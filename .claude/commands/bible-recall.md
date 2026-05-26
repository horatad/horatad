# /bible-recall — BIBLE Memory Recall

อ่านไฟล์ memory ที่เกี่ยวข้องกับ topic ที่ระบุ แล้วสรุปสิ่งที่รู้

## Usage
```
/bible-recall [topic]
```

## Topics ที่รองรับ
- `planets` → PLANETS.md
- `signs` → SIGNS.md
- `houses` → HOUSES.md
- `quality` → QUALITY.md
- `vocab` → VOCAB.md
- `rules` → Foundational Rules ใน INDEX.md
- `tals` → TALS attribution + scope ใน INDEX.md
- `log` → LOG.md entries ล่าสุด (20 entries)
- `all` → INDEX.md + LOG.md (ไม่เกิน 50 lines ต่อไฟล์)

## Behavior
1. อ่านไฟล์ที่ตรงกับ topic
2. สรุปสิ่งที่รู้เป็นภาษาไทย
3. ระบุ corrections ล่าสุดถ้ามี (marked ⚠️ ใน memory)
4. ระบุ open questions ถ้ายังไม่มีคำตอบ

## ตัวอย่าง
```
/bible-recall quality    → สรุปคุณภาพดาวทั้งหมด + กฎลบ-ลบ=บวก
/bible-recall signs      → ตารางราศี + ตำแหน่ง อุจ/นิจ/มหาจักร + corrections
/bible-recall tals       → TALS attribution + 3 Foundational Rules + scope
```

$ARGUMENTS
