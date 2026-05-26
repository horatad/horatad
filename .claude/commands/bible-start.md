# /bible-start — BIBLE Memory Bootstrap

โหลด memory ทั้งหมดที่จำเป็นสำหรับ BIBLE session ในทีเดียว
ใช้ต้น session เสมอ — โดยเฉพาะหลัง compaction หรือ session ใหม่

## Behavior

อ่านไฟล์ตามลำดับนี้:

1. `handoffs/bible_memory/INDEX.md` — Foundational Rules + file map + TALS attribution
2. `handoffs/bible_memory/LOG.md` — PINNED entries ทั้งหมด + 10 latest entries
3. ไฟล์เพิ่มตาม mode (optional — ถ้า $ARGUMENTS ระบุ):
   - `extraction` → SYNTAX.md + TAXONOMY.md + VOCAB.md
   - `qa`         → PLANETS.md + SIGNS.md + HOUSES.md + QUALITY.md
   - `review`     → CHAPTERS.md

จากนั้นสรุปเป็น **BIBLE State Snapshot** format นี้:

```
━━━ BIBLE Memory Loaded ━━━
Date: [วันนี้]

## 5 Foundational Rules (canonical)
Rule #1: natal 80% / transit 20%
Rule #2: ดาวต้องสัมพันธ์ลัคนา/ตนุลัคน์ → ไม่สัมพันธ์ = อัจฉริยภาพภายใน
Rule #3: chart_strength = f(ตนุลัคน์, กุมลัคนา) — NOT ภพ 1/2/7
Rule #4: TALS = event prediction เท่านั้น
Rule #5: อาชีพดู ดาวเด่น — NOT ภพกัมมะ

## Corrections ล่าสุด
⚠️ [correction พร้อมวันที่]
...

## PINNED entries (ยังใช้อยู่)
📌 [PINNED title + 1-line summary]
...

## Open questions (ยังไม่มีคำตอบ)
❓ [คำถาม]
...

## งาน PENDING จาก handoff
🟢 [Claude ทำได้] — [งาน]
🔴 [รอ user]      — [งาน]

━━━ พร้อมทำงานแล้ว ━━━
```

## หลัง bootstrap
- ถ้า user ไม่ระบุงาน → เสนอ priority list จาก handoff ล่าสุด
- ถ้า user ระบุงาน → ทำทันที ไม่ต้องถาม

$ARGUMENTS
