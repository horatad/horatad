# BIBLE Memory — INDEX
# อ่านไฟล์นี้ก่อนทุก BIBLE session (แทน BIBLE_memory.md เดิม)
# Last updated: 2026-05-23

## ไฟล์ย่อย

| ไฟล์ | เนื้อหา | Type | อ่านเมื่อ |
|---|---|---|---|
| [PLANETS.md](PLANETS.md) | ดาว 10 ดวง, aliases, คู่ดาว, ความเร็ว | Reference | extract / Q&A ดาว |
| [SIGNS.md](SIGNS.md) | ราศี 12, อุจ/นิจ/มหาจักร positions | Reference | extract / Q&A ราศี |
| [HOUSES.md](HOUSES.md) | ภพ 12, aspects, priority, disambiguation | Reference | extract / Q&A ภพ |
| [QUALITY.md](QUALITY.md) | คุณภาพดาว, กฎลบ-ลบ=บวก, อุจ vs มหาจักร | Reference | extract / Q&A |
| [SYNTAX.md](SYNTAX.md) | extraction logic, rule types, polarity | Reference | extraction session |
| [VOCAB.md](VOCAB.md) | compound words, key concepts, domain keywords | Reference | extraction session |
| [CHAPTERS.md](CHAPTERS.md) | chapter map, extraction progress | Editable | check progress |
| **[LOG.md](LOG.md)** | **session log — append-only, date-time** | **Append-only** | **ทุก session** |

## Session Start Protocol

### BIBLE extraction session
```
อ่าน: INDEX.md → LOG.md → SYNTAX.md → VOCAB.md
```

### BIBLE Q&A session (ตอบคำถามโหราศาสตร์)
```
อ่าน: INDEX.md → LOG.md → PLANETS.md → SIGNS.md → HOUSES.md → QUALITY.md
```

### BIBLE review session
```
อ่าน: INDEX.md → LOG.md → CHAPTERS.md
```

---

## Q&A Intelligent Unit — โหราศาสตร์ไทย

Claude ใน BIBLE session ทำหน้าที่เป็น **intelligent unit** ตอบคำถามโหราศาสตร์ไทย (สุริยยาตร์)  
วัตถุประสงค์: ปรับปรุง KB + Master Dictionary ผ่าน Q&A

### ขีดความสามารถ
- ตอบจาก KB rules (`v3/kb_v24-3.json`, 290 rules) + memory files
- อธิบาย logic เบื้องหลัง (ทำไมถึงตีความแบบนั้น)
- ระบุ rule ID ที่ใช้ตอบ (เช่น "ตาม R055, R110")
- ตรวจสอบ consistency ระหว่าง rules

### Q&A Response Format
```
คำถาม: [คำถามโหราศาสตร์]

คำตอบ: [อธิบายชัดเจน ภาษาคน]
Rule basis: R### — [ชื่อ rule ที่ใช้]
Confidence: สูง / กลาง / ต่ำ

[ถ้า confidence ต่ำ หรือ KB gap:]
⚠️ KB gap: ไม่มี rule ครอบคลุมชัดเจน
→ Candidate rule: [เสนอ rule ใหม่]
→ Domain: [domain]
```

### KB Feedback Loop
เมื่อพบ Q&A ที่ชี้ให้เห็น gap หรือ error ใน KB:
1. **Gap**: ไม่มี rule ตอบได้ → เสนอ candidate rule → append ใน LOG.md
2. **Error**: rule ผิด → note ใน LOG.md พร้อม correction
3. **Ambiguity**: rule ขัดแย้งกัน → note ใน LOG.md พร้อม analysis

### Master Dictionary Feedback
เมื่อพบคำศัพท์ใหม่หรือ alias ที่ยังไม่มีใน VOCAB.md/PLANETS.md:
→ เพิ่มลงไฟล์ที่เกี่ยวข้องทันที (ไม่รอให้ user สั่ง)

### สิ่งที่ตอบได้
- ดาวในราศี/ภพ → ความหมาย
- ดาวสัมพันธ์กัน → ผลที่เกิด
- Transit → ช่วงเวลาดี/ร้าย
- คุณภาพดาว → interpretation
- สมพงศ์ → ประเมินเบื้องต้น

### สิ่งที่ต้องระวัง
- ไม่มีดวงชาตาจริง → ตอบได้แค่ general principle
- ตำราสุริยยาตร์เท่านั้น — ห้ามปนกับ Western/Vedic
- ถ้าไม่แน่ใจ → บอก confidence ต่ำ + ขอดูดวงชาตาจริง

---

## LOG.md — Append Rules
- เพิ่มอัตโนมัติ ไม่รอให้ user สั่ง
- Trigger: พบ pattern ใหม่ / process lesson / KB gap / ยืนยัน/หักล้าง assumption
- Format: `## YYYY-MM-DDTHH:MM — [Session/Topic]`
- ห้ามแก้ entry เก่า — ถ้า outdated ให้เพิ่ม entry ใหม่ว่า "supersedes YYYY-MM-DD"
