# DR-003 — TALS Foundational Rules #1 / #2 / #3 / #4 / #5

**Date:** 2026-05-26 (Rules #1 #4) · 2026-05-27 (Rules #2 #3 #5)  
**Status:** Accepted — canonical  
**Scope:** BIBLE · HORATAD engine · ทุก prediction output

---

## Decision

กำหนด 5 rules นี้เป็น **foundational** — ต้องใช้ก่อนการพยากรณ์ทุกครั้ง ก่อน rule อื่นๆ ทั้งหมด

---

## Rule #1 — WEIGHT: natal vs transit

**Statement:** พื้นดวง (natal) = 80% | ดวงจร (transit) = 20% (stimulator only)

- ดาวจร activate สิ่งที่ natal บอกไว้แล้วเท่านั้น
- ดาวจร **ไม่สร้างผลที่ natal ไม่มี**
- TRANSIT_NATAL rule ใน KB ต้องมี natal precondition explicit เสมอ

**Corollary:** ดวงคล้ายกัน → outcome TYPE เดียวกัน ต่างที่ "ดาวจร" กำหนด: ผลชัด/ไม่ชัด · ผลมาก/น้อย · timing · frequency

---

## Rule #2 — QUALIFIER: สัมพันธ์ลัคนา/ตนุลัคน์

**Statement:** ดาวจะให้คุณโทษต่อเจ้าชะตา ก็ต่อเมื่อสัมพันธ์ (กุม/เล็ง/โยค/ตรีโกณ) กับ ลัคนา หรือ ตนุลัคน์

- ดาวอุจ/มหาจักร + ไม่สัมพันธ์ลัคนา/ตนุลัคน์ → ผลน้อยมาก (~10%)
- ทั้ง 2 สัมพันธ์ → full effect (100%)
- สัมพันธ์ตัวเดียว → partial (50%)
- Elevates "โฉลก" concept เป็น foundational

**Engine (pseudocode):**
```js
function effectivePower(planet, chart) {
  const base = qualityStrength(planet, chart);
  const lagnaRel = aspectsLagna(planet, chart);
  const tanulagnRel = aspectsTanulagn(planet, chart);
  if (!lagnaRel && !tanulagnRel) return base * 0.1;
  if (lagnaRel && tanulagnRel) return base * 1.0;
  return base * 0.5;
}
```

---

## Rule #3 — STRENGTH: chart resilience

⚠️ **CORRECTED 2026-05-27** (per ch020 step 4) — supersedes original "ภพ 1/2/7" statement

**Statement:** chart_strength = function(ตนุลัคน์ quality, ดาวกุมลัคนา quality)

- ภายใน = ตนุลัคน์ quality + ภพที่อยู่
- ภายนอก = Σ ดาวกุมลัคนา quality
- ❌ ห้ามใช้ ภพ 1+2+7 เป็นตัวชี้วัด

**4 patterns:**
```
[strong inner + strong outer] = ดวงเข้มแข็งครบ
[strong inner + weak outer]   = ในเข้ม นอกอ่อน
[weak inner + strong outer]   = นอกเด่น ในกลวง
[weak inner + weak outer]     = ดวงอ่อน
```

**Evidence: R289** — 4 ดาวจรร้าย + ดวงเข้มแข็ง + คู่มิตรรับ → ไม่ถึงฆาต

**ภพ 2 อยู่ใน:** ch020 step 8 priority list (ปัตนิ→กฎุมพะ→กัมมะ→สหัชชะ) — ไม่ใช่ chart strength definer

---

## Rule #4 — MISSION: event prediction only

**Statement:** TALS = event prediction (ถูก/ผิด, เป็น/ตาย, รวย/จน) — ไม่ใช่ personality/psychology

- Output ที่ measure ไม่ได้ → useless (ห้าม KB extract)
- ห้าม wording ที่เป็น character description อย่างเดียว

---

## Rule #5 — DOMAIN PRIORITY: อาชีพ

**Statement:** อาชีพดู "ดาวเด่น" (planet ranking) — NOT ภพกัมมะ (10) เพียงอย่างเดียว (per ch025)

- ดาวเด่น_score = quality_strength × aspect_to_lagna_weight × time_phase_factor
- Rank ดาวทั้งหมด → อันดับ 1 = career direction
- ภพอื่น priority (ch020 step 8): ปัตนิ → กฎุมพะ → กัมมะ → สหัชชะ

---

## Interpretation Hierarchy

```
[INPUT] chart + (transit time)
   ↓ Rule #1: weight natal 80% / transit 20%
   ↓ Rule #2: filter ดาวที่สัมพันธ์ลัคนา/ตนุลัคน์
   ↓ Rule #3: assess chart_strength(ตนุลัคน์, กุมลัคนา) → 4 patterns
   ↓ Rule #4: output = event prediction only
   ↓ Rule #5: อาชีพ = ดาวเด่น rank — not house #10 alone
   ↓ [OUTPUT] qualified + weighted prediction
```

## Anti-patterns

```
❌ "ดาวอุจ → ดี"
✅ "ดาวอุจ สัมพันธ์ลัคนา/ตนุลัคน์ → ดี ส่งผลต่อเจ้าชะตา"

❌ "ดวงนี้มีดาวร้าย + ภพ 1/2/7 อ่อน → จะแย่"
✅ "ดวงนี้มีดาวร้าย → ดู ตนุลัคน์ + กุมลัคนา quality → ถ้าแข็ง = ทนได้"

❌ "ดาวจรดีมาก → เกิดผลดี" (ไม่มี natal anchor)
✅ "ดาวจรดี + natal มีศักยภาพแล้ว → activate ผลดีนั้น"

❌ "ภพ 10 = อาชีพ"
✅ "อาชีพ = ดาวที่ได้ rank สูงสุดจาก ดาวเด่น_score"
```
