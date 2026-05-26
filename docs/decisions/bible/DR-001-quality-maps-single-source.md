# DR-001 — quality_maps.json เป็น Single Source of Truth

**Date:** 2026-05-26  
**Status:** Accepted  
**Scope:** BIBLE + HORATAD (engine.js)

---

## Context

ก่อน 2026-05-26 มีค่า quality config กระจายอยู่ 3 ที่:
1. `v3/engine.js` — hardcoded `KASET_MAP / EXALT_MAP / MAHACHAK_MAP / RACHA_MAP`
2. `v3/master_dict.js` — `UCH_POSITIONS / NIT_POSITIONS / KASED_POSITIONS / MAHACHAK_PAIRS`
3. `handoffs/bible_memory/SIGNS.md` — PINNED v2 table

ทั้ง 3 ที่มีค่าต่างกันบางจุด (drift) และพบ hallucination ซ้ำเรื่อง ราหู อุจ + อาทิตย์ มหาจักร

## Decision

สร้าง `v3/quality_maps.json` เป็น single authoritative source สำหรับ:
- เกษตร (sign_rulers)
- อุจ / นิจ (derived: +6 mod 12)
- มหาจักร / จุลจักร (derived: +6 mod 12)
- ราชาโชค (pending — tradition lookup)
- derivation_rules (formula + verification status)

## Rationale

- Drift ระหว่าง 3 sources = root cause ของ bug ซ้ำ
- JSON file = human-readable + git-trackable + single update point
- engine.js และ master_dict.js ควร read from quality_maps.json แทน hardcode

## Consequences

**ดี:**
- แก้ที่เดียว propagate ทุก consumer
- Verified fields มี `verified_by` attribution ชัดเจน
- Pending fields มี `pending_user_verification` list ชัดเจน

**เสีย:**
- engine.js ยังไม่ได้ refactor (ยังใช้ hardcoded MAPs) — HORATAD session ต้องทำ
- ต้องดูแล sync ระหว่าง quality_maps.json กับ engine.js จนกว่าจะ refactor

## Known Bugs (รอ HORATAD fix)

1. `v3/engine.js` label swap: อุจจาวิลาส ↔ อุจจาภิมุข
2. `v3/engine.js` MAHACHAK_MAP[1] = 6 (ควรเป็น 3)
3. `v3/master_dict.js` UCH_POSITIONS[8] = 1 (ควรเป็น 7)
