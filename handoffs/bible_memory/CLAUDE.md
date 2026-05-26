# BIBLE Memory — Nested CLAUDE.md
# คำแนะนำเฉพาะสำหรับ BIBLE session (อ่านหลัง root CLAUDE.md)
# Last updated: 2026-05-27

---

## Session Start — อ่านไฟล์นี้เป็นลำดับแรกใน bible_memory/

ก่อนทำงานใดๆ ใน BIBLE session:
```
อ่าน: INDEX.md → LOG.md (ดู PINNED entries + entries ล่าสุด)
```

แล้วเลือก mode:
- **Extraction session** → SYNTAX.md → TAXONOMY.md → VOCAB.md → PROMPTS.md
- **Q&A session** → PLANETS.md → SIGNS.md → HOUSES.md → QUALITY.md
- **Review session** → CHAPTERS.md

---

## TALS Attribution (canonical — ห้ามเปลี่ยน)

- **System:** TALS = Thai Astrology Logical Style (โหราศาสตร์ไทยแนวตรรกะ)
- **Founder:** ยืนยง นาวาสมุทร · สมญานาม **แดง เมืองตราด**
- **TALS** = prediction framework | **สุริยยาตร์** = calculation engine เท่านั้น

---

## 5 Foundational Rules — ใช้ก่อนทุกการพยากรณ์ (corrected 2026-05-27)

```
Rule #1  natal 80% / transit 20%

Rule #2  ดาวต้องสัมพันธ์ลัคนา/ตนุลัคน์ ถึงส่งผล (visible)
         ดาวไม่สัมพันธ์ = อัจฉริยภาพภายใน (hidden reserve)

Rule #3  chart_strength = function(ตนุลัคน์, ดาวกุมลัคนา)
         ❌ NOT ภพ 1+2+7 (ที่เคยเข้าใจผิด — supersede per ch020 step 4)
         ภพ 2 อยู่ใน step 8 priority list (ปัตนิ→กฎุมพะ→กัมมะ→สหัชชะ)

Rule #4  TALS = event prediction (ถูก/ผิด, เป็น/ตาย) — NOT personality

Rule #5  อาชีพ ดู "ดาวเด่น" (NOT ภพกัมมะ) per ch025
```

**Aspect-to-Lagna canonical weights (ch025):**
กุม 100% · เล็ง 80% · โยคหน้า/หลัง 60% · ตรีโกณ 50%
(❌ master_dict เดิม 100/75/50/25 — corrected)

---

## Hallucination ที่เคยเกิด — ห้ามซ้ำ

| ❌ ผิด | ✅ ถูก | verified |
|---|---|---|
| ราหู อุจ = พฤษภ | ราหู อุจ = **พิจิก** | user 2026-05-26 |
| อาทิตย์ มหาจักร = กุมภ์ | อาทิตย์ มหาจักร = **กรกฎ** | user 2026-05-26 |
| มหาจักร = 1 ดาว 2 ราศี | มหาจักร = **1 ดาว 1 ราศี** | user 2026-05-26 |
| ราชาโชค = geometric derivation | ราชาโชค = **tradition lookup** (ไม่ derivable) | user 2026-05-26 |

**Source of truth:** `v3/quality_maps.json` (ห้ามใช้ค่าจาก engine.js hardcoded MAPs)

---

## Memory File Rules

- **Append-only** — ห้าม rewrite หรือลบ entry เก่า
- ถ้าข้อมูลเดิมผิด → เพิ่ม `⚠️ แก้ไข (YYYY-MM-DD): ...` ต่อท้าย ไม่ลบเดิม
- LOG.md: append อัตโนมัติทุก session ที่พบ trigger (pattern ใหม่, correction, KB gap)

---

## Pending User Verification

- **ราชาโชค 8 ดาว** — ต้องการค่า per-planet จาก 100CH (tradition lookup)
- **เทวีโชค = ราชาโชค + 6** — engine ใช้ geometric แต่ยังไม่ confirmed

---

## Decision Records

ดู `docs/decisions/bible/` สำหรับ ADR (Architectural Decision Records) ของ BIBLE:
- DR-001: quality_maps single-source-of-truth
- DR-002: Triangulation architecture
- DR-003: TALS Foundational Rules #1/#2/#3
