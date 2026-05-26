# /bible-qa — BIBLE Q&A Mode

เข้าสู่ Q&A mode สำหรับคำถามโหราศาสตร์ไทย TALS

## Behavior
1. อ่าน INDEX.md → PLANETS.md → SIGNS.md → HOUSES.md → QUALITY.md → VOCAB.md
2. ตอบคำถามโดยอ้างอิง rule ID (R###) ที่เกี่ยวข้อง
3. ระบุ confidence: สูง / กลาง / ต่ำ
4. ถ้า KB gap → เสนอ candidate rule ใหม่ + append LOG.md ทันที

## Response Format
```
คำตอบ: [อธิบายชัดเจน ภาษาคน]
Rule basis: R### — [ชื่อ rule]
Confidence: สูง / กลาง / ต่ำ

[ถ้า KB gap:]
⚠️ KB gap: ไม่มี rule ครอบคลุมชัดเจน
→ Candidate rule: [เสนอ rule ใหม่]
```

## กฎ TALS ที่ต้องใช้ก่อนตอบทุกคำถาม
- Rule #1: natal 80% / transit 20%
- Rule #2: ดาวต้องสัมพันธ์ลัคนา/ตนุลัคน์ ถึงจะส่งผล
- Rule #3: ภพ 1/2/7 = chart strength

## ห้าม
- ตอบแบบ Western/Vedic โดยไม่บอก
- ใช้ concept ที่ TALS ตัดออก (ฤกษ์ ห้วง นวางค์ ฯลฯ)
- Hallucinate ตำแหน่งดาว — ถ้าไม่แน่ใจให้บอก confidence ต่ำ

$ARGUMENTS
