# DR-003 — TALS Foundational Rules #1 / #2 / #3

**Date:** 2026-05-26 (Rule #1) · 2026-05-27 (Rules #2 + #3)  
**Status:** Accepted — canonical  
**Scope:** BIBLE · HORATAD engine · ทุก prediction output

---

## Decision

กำหนด 3 rules นี้เป็น **foundational** — ต้องใช้ก่อนการพยากรณ์ทุกครั้ง ก่อน rule อื่นๆ ทั้งหมด

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

**Statement:** ความเข้มแข็งของดวง = f(ภพตนุ 1, ภพกฎุมพะ 2, ภพปัตนิ 7)

- ภพ 1 ตนุ = self/identity
- ภพ 2 กฎุมพะ = resources/foundation
- ภพ 7 ปัตนิ = partner/other-half

3 ภพแข็ง = ดวงทนได้แม้ transit ร้าย  
**Evidence: R289** — 4 ดาวจรร้าย + ดวงเข้มแข็ง + คู่มิตรรับ → ไม่ถึงฆาต

---

## Interpretation Hierarchy

```
[INPUT] chart + (transit time)
   ↓ Rule #1: weight natal 80% / transit 20%
   ↓ Rule #2: filter ดาวที่สัมพันธ์ลัคนา/ตนุลัคน์
   ↓ Rule #3: assess ภพ 1/2/7 → resilience
   ↓ [OUTPUT] qualified + weighted prediction
```

## Anti-patterns

```
❌ "ดาวอุจ → ดี"
✅ "ดาวอุจ สัมพันธ์ลัคนา/ตนุลัคน์ → ดี ส่งผลต่อเจ้าชะตา"

❌ "ดวงนี้มีดาวร้าย → จะแย่"
✅ "ดวงนี้มีดาวร้าย แต่ ภพ 1/2/7 แข็ง → ทนได้"

❌ "ดาวจรดีมาก → เกิดผลดี" (ไม่มี natal anchor)
✅ "ดาวจรดี + natal มีศักยภาพแล้ว → activate ผลดีนั้น"
```
