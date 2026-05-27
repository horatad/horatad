# Few-Shot Examples — kb_tals rule extraction
# อ่านไฟล์นี้ก่อนเสมอ แล้วสร้าง rules ตาม format นี้

---

## EXAMPLE 1 — REFERENCE (lookup table, score=0)

```json
{
  "id": "R291",
  "ch": "chXXX",
  "rule_use": "reference",
  "type": "REFERENCE",
  "tier": 1,
  "c": "ราศีทั้ง 12 ในจักรราศี",
  "meaning": "ราศีเมษ=0, พฤษภ=1, มิถุน=2, กรกฎ=3, สิงห์=4, กันย์=5, ตุล=6, พิจิก=7, ธนู=8, มังกร=9, กุมภ์=10, มีน=11",
  "polarity": "~",
  "planet_ids": [],
  "contexts": ["natal", "transit"],
  "domain": "ทั่วไป",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "chXXX",
  "score": 0,
  "source_type": "PRIMARY",
  "source_chapter": "chXXX",
  "source_quote": ""
}
```

---

## EXAMPLE 2 — DEFINITION (นิยามคำศัพท์, score=0)

```json
{
  "id": "R292",
  "ch": "chXXX",
  "rule_use": "reference",
  "type": "DEFINITION",
  "tier": 1,
  "c": "คุณภาพ 'เกษตร' คืออะไร",
  "meaning": "มั่นคง มีหลักฐาน อุดมสมบูรณ์ ให้ผลอย่างค่อยเป็นค่อยไปแต่มั่นคง — เห็นผลช้า ให้ผลเต็มบั้นปลาย",
  "polarity": "+",
  "planet_ids": [],
  "contexts": ["natal"],
  "domain": "ทั่วไป",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "chXXX",
  "score": 0,
  "source_type": "PRIMARY",
  "source_chapter": "chXXX",
  "source_quote": ""
}
```

---

## EXAMPLE 3 — PRINCIPLE (หลักการทั่วไป, score=0.9)

```json
{
  "id": "R293",
  "ch": "chXXX",
  "rule_use": "reference",
  "type": "PRINCIPLE",
  "tier": 1,
  "c": "มาตรฐานความแม่นยำการพยากรณ์",
  "meaning": "พื้นดวงชาตาถูก 80% + ดาวจรถูก 50% = ระดับสูงมาก (มาตรฐานชั้นสูง)",
  "polarity": "~",
  "planet_ids": [],
  "contexts": ["natal", "transit"],
  "domain": "หลักการ",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "chXXX",
  "score": 0.9,
  "source_type": "PRIMARY",
  "source_chapter": "chXXX",
  "source_quote": "พื้นดวงชาตาถูก 80% ดาวจรถูก 50%"
}
```

---

## EXAMPLE 4 — NATAL_ATOMIC ดาวเดียว ในราศีเฉพาะ (มี quality, score=0.8)

```json
{
  "id": "R294",
  "ch": "chXXX",
  "rule_use": "match",
  "type": "NATAL_ATOMIC",
  "tier": 1,
  "c": "อาทิตย์(1) อยู่ราศีสิงห์(4)",
  "meaning": "เกษตร — มั่นคง มีหลักฐาน ให้ผลช้าแต่มั่นคง เห็นผลเต็มบั้นปลาย",
  "polarity": "+",
  "planet_ids": [1],
  "sign_id": 4,
  "quality": "เกษตร",
  "contexts": ["natal"],
  "domain": "ทั่วไป",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "chXXX",
  "score": 0.8,
  "source_type": "PRIMARY",
  "source_chapter": "chXXX",
  "source_quote": "อาทิตย์(1) อยู่ราศีสิงห์(4) = เกษตร"
}
```

---

## EXAMPLE 5 — NATAL_COMBINATION สองดาวสัมพันธ์กัน (INFERRED, score=0.8)

```json
{
  "id": "R295",
  "ch": "chXXX",
  "rule_use": "match",
  "type": "NATAL_COMBINATION",
  "tier": 2,
  "c": "ราหู(8) + ศุกร์(6) กุมหรือสัมพันธ์กัน",
  "meaning": "การแสดง นักแสดง — ลุ่มหลง+ศิลปะ เกิดความหมายใหม่",
  "polarity": "~",
  "planet_ids": [8, 6],
  "contexts": ["natal"],
  "domain": "อาชีพ",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "chXXX",
  "score": 0.8,
  "source_type": "INFERRED",
  "source_chapter": "chXXX",
  "source_quote": ""
}
```

---

## EXAMPLE 6 — NATAL_COMBINATION มี aspect + quality_condition (score=0.8)

```json
{
  "id": "R296",
  "ch": "chXXX",
  "rule_use": "match",
  "type": "NATAL_COMBINATION",
  "tier": 2,
  "c": "เกษตร 2 ดวง เล็งกัน (อยู่ราศีตรงข้ามกัน)",
  "meaning": "กลายเป็นประเกษตรทั้งคู่ — ดีก่อน แล้วเสื่อมถอย",
  "polarity": "-",
  "planet_ids": [],
  "quality_condition": "เกษตร",
  "aspect": "เล็ง",
  "contexts": ["natal"],
  "domain": "ทั่วไป",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "chXXX",
  "score": 0.8,
  "source_type": "PRIMARY",
  "source_chapter": "chXXX",
  "source_quote": "เกษตร 2 ดวง เล็งกัน: กลายเป็นประเกษตรทั้งคู่ ดีก่อน แล้วเสื่อมถอย"
}
```

---

## EXAMPLE 7 — TRANSIT_NATAL ดาวจรกระทบพื้นดวง (score=0.6)

```json
{
  "id": "R297",
  "ch": "chXXX",
  "rule_use": "match",
  "type": "TRANSIT_NATAL",
  "tier": 2,
  "c": "เสาร์(7)จร เล็ง ราหู(8)เดิม + อาทิตย์(1)จร ทับหรือเล็ง พฤหัส(5)เดิม",
  "meaning": "มีโชคใหญ่ (คู่มิตร เสาร์+ราหู และ อาทิตย์+พฤหัส activate พร้อมกัน)",
  "polarity": "+",
  "planet_ids": [7, 8, 1, 5],
  "contexts": ["natal", "transit"],
  "domain": "โชคลาภ",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "chXXX",
  "score": 0.6,
  "source_type": "PRIMARY",
  "source_chapter": "chXXX",
  "source_quote": ""
}
```

---

## กฎที่ต้องจำ

| # | กฎ |
|---|---|
| 1 | **id** ไม่ซ้ำ — ดู max id ใน astro_progress.md ก่อนเสมอ |
| 2 | **ch = source_ref = source_chapter** ต้องเหมือนกัน 3 field |
| 3 | **db** = `"kb_tals"` และ **source_level** = `1` เสมอ |
| 4 | **planet_ids** ใช้เลข ห้ามใช้ชื่อ |
| 5 | **contexts** = `["natal"]` สำหรับ NATAL_* / `["natal","transit"]` สำหรับ TRANSIT_NATAL และ PRINCIPLE ที่ครอบทั้งคู่ |
| 6 | **source_quote** = ข้อความต้นฉบับ ถ้าไม่มีใส่ `""` |
| 7 | **domain** ต้องเป็นค่าจาก enum ใน astro_schema.json เท่านั้น ห้ามแต่งใหม่ |
| 8 | **ไม่แน่ใจ source_type** → ใช้ `"INFERRED"` |
| 9 | **ไม่แน่ใจ type** → ดู score_table ใน astro_schema.json |
| 10 | **output**: ส่งเป็น JSON array `[{...}, {...}]` เพื่อ merge ด้วย `node workers/kb_merge.mjs` |
