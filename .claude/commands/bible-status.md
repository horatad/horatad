# /bible-status — BIBLE Session Status

แสดงสถานะ BIBLE project ปัจจุบัน

## Behavior
1. อ่าน handoffs/BIBLE_*.md ล่าสุด
2. อ่าน PROJECT_STATUS.md section BIBLE
3. แสดง:
   - KB version + จำนวน rules
   - งาน PENDING ที่ Claude ทำได้ (เรียง priority)
   - งาน BLOCKED รอ user
   - open questions ที่ยังไม่มีคำตอบ
   - corrections ล่าสุดใน LOG.md

## Output Format
```
## BIBLE Status — [วันที่]

KB: [version] · [จำนวน] rules · [สถานะ]

### ทำได้เลย
1. [งาน] — [เหตุผล]
...

### รอ user
- [งาน] — [ต้องการอะไร]

### Open questions
- [คำถาม]
```

$ARGUMENTS
