# kb_tals.json — Schema & Few-Shot Examples
# ใช้เป็น context ให้ Claude instance อื่นสร้าง rules ให้ตรง format

---

## ENUM VALUES

**type** (6 ค่า):
- `REFERENCE` — lookup table (ราศี/ดาว/ภพ numbering)
- `DEFINITION` — นิยามคำศัพท์
- `PRINCIPLE` — หลักการทั่วไป (ไม่ specific ดาว/ราศี)
- `NATAL_ATOMIC` — rule พื้นดวง ดาวเดียว/เงื่อนไขเดียว
- `NATAL_COMBINATION` — rule พื้นดวง รวมหลายดาวหรือหลายเงื่อนไข
- `TRANSIT_NATAL` — rule ดาวจร กระทบพื้นดวง

**rule_use** (3 ค่า):
- `"reference"` — ใช้กับ type=REFERENCE/DEFINITION
- `"match"` — ใช้กับ NATAL_ATOMIC / NATAL_COMBINATION / TRANSIT_NATAL
- `"principle"` — ใช้กับ PRINCIPLE หรือ rule ทั่วไปไม่ match specific

**tier**: `1` = core/ชัดเจน, `2` = derived/complex

**polarity**: `"+"` = ให้คุณ, `"-"` = ให้โทษ, `"~"` = ขึ้นกับบริบท

**source_type**: `"PRIMARY"` = ประกาศตรงจาก 100CH, `"INFERRED"` = derived/combination

**planet_ids** (0–9):
0=มฤตยู, 1=อาทิตย์, 2=จันทร์, 3=อังคาร, 4=พุธ, 5=พฤหัส, 6=ศุกร์, 7=เสาร์, 8=ราหู, 9=เกตุ

**sign_id** (0–11):
0=เมษ, 1=พฤษภ, 2=มิถุน, 3=กรกฎ, 4=สิงห์, 5=กันย์, 6=ตุล, 7=พิจิก, 8=ธนู, 9=มังกร, 10=กุมภ์, 11=มีน

**quality** (ค่าที่ใช้):
เกษตร, ประเกษตร, อุจ, นิจ, มหาจักร, จุลจักร, ราชาโชค, เทวีโชค, อุจจาวิลาส, อุจจาภิมุข

---

## REQUIRED FIELDS (ทุก rule ต้องมี)

```
id, ch, rule_use, type, tier, c, meaning, polarity,
planet_ids, contexts, domain, db, source_level,
source_ref, score, source_type, source_chapter, source_quote
```

**Fixed values** (ใส่ค่าเดิมเสมอ):
- `db`: `"kb_tals"`
- `source_level`: `1`
- `source_ref`: เหมือน `ch`

## OPTIONAL FIELDS

| field | ใส่เมื่อไหร่ |
|---|---|
| `sign_id` | rule ระบุดาวอยู่ราศีเฉพาะ |
| `sign_ids` | rule ระบุหลายราศี |
| `quality` | rule เกี่ยวกับ quality (เกษตร/อุจ/ฯลฯ) |
| `quality_req` | rule ต้องการ quality เป็นเงื่อนไข |
| `quality_condition` | quality ที่ใช้เป็น condition |
| `aspect` | มีการระบุ aspect (กุม/เล็ง/โยค/ตรีโกณ) |
| `notes` | หมายเหตุภายใน |

---

## SCORE GUIDE

| type | tier | score |
|---|---|---|
| REFERENCE / DEFINITION | 1 | 0.0 |
| PRINCIPLE | 1 | 0.9 |
| NATAL_ATOMIC | 1 | 0.8 |
| NATAL_ATOMIC | 2 | 0.6 |
| NATAL_COMBINATION | 1 | 1.0 |
| NATAL_COMBINATION | 2 | 0.8 |
| TRANSIT_NATAL | 1 | 0.8 |
| TRANSIT_NATAL | 2 | 0.6 |

---

## FEW-SHOT EXAMPLES (5 rules ครบทุก type)

### 1. REFERENCE — lookup table
```json
{
  "id": "R001",
  "ch": "ch001",
  "rule_use": "reference",
  "type": "REFERENCE",
  "tier": 1,
  "c": "ราศีทั้ง 12 ในจักรราศี",
  "meaning": "ราศีเมษ=0, พฤษภ=1, มิถุน=2, กรกฎ=3, สิงห์=4, กันย์=5, ตุล=6, พิจิก=7, ธนู=8, มังกร=9, กุมภ์=10, มีน=11 — นับทวนเข็มนาฬิกา ตำแหน่งคงที่ไม่เปลี่ยนแปลง",
  "polarity": "~",
  "planet_ids": [],
  "contexts": ["natal", "transit"],
  "domain": "ทั่วไป",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "ch001",
  "score": 0,
  "source_type": "PRIMARY",
  "source_chapter": "ch001",
  "source_quote": ""
}
```

### 2. NATAL_ATOMIC — ดาวเดียว ในราศีเฉพาะ (มี quality)
```json
{
  "id": "R034",
  "ch": "ch006",
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
  "source_ref": "ch006",
  "score": 0.8,
  "source_type": "PRIMARY",
  "source_chapter": "ch006",
  "source_quote": "อาทิตย์(1) อยู่ราศีสิงห์(4) = เกษตร"
}
```

### 3. NATAL_COMBINATION — สองดาวสัมพันธ์กัน (INFERRED)
```json
{
  "id": "R022",
  "ch": "ch004",
  "rule_use": "match",
  "type": "NATAL_COMBINATION",
  "tier": 2,
  "c": "ราหู(8) + ศุกร์(6) กุมหรือสัมพันธ์กัน",
  "meaning": "การแสดง นักแสดง — ลุ่มหลง+ศิลปะ เกิดความหมายใหม่",
  "polarity": "~",
  "planet_ids": [8, 6],
  "contexts": ["natal"],
  "domain": "หน้าที่การงาน",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "ch004",
  "score": 0.8,
  "source_type": "INFERRED",
  "source_chapter": "ch004",
  "source_quote": ""
}
```

### 4. NATAL_COMBINATION — มี aspect และ quality_condition
```json
{
  "id": "R063",
  "ch": "ch010",
  "rule_use": "match",
  "type": "NATAL_COMBINATION",
  "tier": 2,
  "c": "เกษตร 2 ดวง เล็งกัน (อยู่ราศีตรงข้ามกัน)",
  "meaning": "กลายเป็นประเกษตรทั้งคู่ แต่เป็นเกษตรก่อน ต่อมาภายหลังจึงกลายเป็นประเกษตร — ดีก่อน แล้วเสื่อมถอย",
  "polarity": "-",
  "planet_ids": [],
  "quality_condition": "เกษตร",
  "aspect": "เล็ง",
  "contexts": ["natal"],
  "domain": "ทั่วไป",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "ch010",
  "score": 0.8,
  "source_type": "PRIMARY",
  "source_chapter": "ch010",
  "source_quote": "เกษตร 2 ดวง เล็งกัน: กลายเป็นประเกษตรทั้งคู่ ดีก่อน แล้วเสื่อมถอย"
}
```

### 5. TRANSIT_NATAL — ดาวจร กระทบพื้นดวง
```json
{
  "id": "R191",
  "ch": "ch036",
  "rule_use": "match",
  "type": "TRANSIT_NATAL",
  "tier": 2,
  "c": "โชคใหญ่ กรณีที่ 1: เสาร์(7)จร เล็ง ราหู(8)เดิม + อาทิตย์(1)จร ทับหรือเล็ง พฤหัส(5)เดิม",
  "meaning": "มีโชคใหญ่ (คู่มิตร เสาร์+ราหู และ อาทิตย์+พฤหัส activate พร้อมกัน)",
  "polarity": "+",
  "planet_ids": [7, 8, 1, 5],
  "contexts": ["natal", "transit"],
  "domain": "โชคลาภ",
  "db": "kb_tals",
  "source_level": 1,
  "source_ref": "ch036",
  "score": 0.6,
  "source_type": "PRIMARY",
  "source_chapter": "ch036",
  "source_quote": ""
}
```

---

## KEY RULES สำหรับ CC ที่จะสร้าง rule ใหม่

1. `id` ต้องไม่ซ้ำ — ดูว่า max id ปัจจุบันคือ R290, rule ใหม่เริ่มจาก R291
2. `source_quote` ใส่ถ้ามี exact quote จากตำรา ถ้าไม่มีใส่ `""`
3. `planet_ids` ใส่ทุกดาวที่เกี่ยวข้องใน rule นั้น ถ้าเป็น quality rule ไม่ specific ดาวใส่ `[]`
4. `contexts` ใส่ `["natal"]` สำหรับ NATAL_*, `["natal","transit"]` สำหรับ TRANSIT_NATAL
5. `source_type` = `"PRIMARY"` ถ้าตำราพูดตรงๆ, `"INFERRED"` ถ้า derive/combine
6. `ch` และ `source_chapter` และ `source_ref` ต้องเหมือนกัน
