# DR-002 — Triangulation Architecture สำหรับ KB

**Date:** 2026-05-25  
**Status:** Accepted  
**Scope:** BIBLE

---

## Context

KB v1 ใช้ "100CH verbatim only" — extract rules จาก 100 บทเท่านั้น

ปัญหา: LLMs (Gemini, Typhoon) อ้างอิงกฎโหราศาสตร์ไทยได้ถูกต้องเกือบทั้งหมด แม้ vocabulary บางตัวไม่ปรากฏใน 100CH ตรงๆ (เช่น คู่ทรหด, คู่วิวาทะ, คู่ธาตุ) — เป็นธรรมเนียมจริงที่ถ่ายทอดกันมา

## Decision

เปลี่ยน ground truth จาก "100CH verbatim" → **"ธรรมเนียม TALS ทั้งหมด"**

```
Source A: 100CH → Claude extraction  → kb_v24-3.json (290 rules) ✅
Source B: LLM general knowledge      → kb_v24-1.json, kb_v24-2.json
Source C: User direct input          → optional

         ↓ MERGE by element fingerprint

kb_merged.json:
  AUTO_VERIFIED  ≥2 sources agree → ผ่าน
  CONFLICT       same elements, different polarity → user decides
  UNIQUE         only 1 source → user reviews
```

## Rationale

- ลดงาน user จาก "verify 290 rules ทีละข้อ" → "review เฉพาะ CONFLICT + UNIQUE"
- Element fingerprint = เปรียบเหมือน DNA ของ rule — ไม่ขึ้นกับ wording
- 3 sources บรรจบ = confidence สูงโดยไม่ต้อง user verify ทุกตัว

## Element Fingerprint Format

```
"p<planet>+p<planet2>+h<house>+s<sign>+q<quality>+a<aspect>+ctx:<context>"
null/missing → "_" positional

ตัวอย่าง:
อาทิตย์ในภพปุตตะ (natal)  → "p1+_+h5+_+_+_+ctx:natal"
อังคารกุมเสาร์ (natal)     → "p3+p7+_+_+_+a:KUM+ctx:natal"
```

## Files

- `v3/kb_v24-3.json` — Source A (290 rules, baseline)
- `v3/kb_v24-3_fp.json` — Source A + fingerprints (schema v2.0-fingerprint)
- `v3/kb_merged.json` — Triangulated (239 unique fp, 207 unique rules, 32 INTERNAL_DUPE)
- Pipeline: `workers/kb_add_fingerprint.mjs` → `workers/kb_merge_by_fingerprint.mjs`

## Pending

- Source B ยังไม่มี (Groq + Typhoon modes รอ user รัน ใน `tools/kb_extract.html`)
- 32 INTERNAL_DUPE รอ user review ใน `tools/kb_review.html`
