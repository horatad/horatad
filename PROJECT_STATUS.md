# PROJECT STATUS — Horatad Ecosystem
# อัปเดตทุก session close | Claude อ่านไฟล์นี้ก่อนเลือกงาน

---

## HORATAD — Thai Astrology PWA 🟡 Pre-launch
**Version:** V3.3.4 | **URL:** horatad.com / horatad.github.io/horatad

### สถานะ
- App ทำงานได้ครบ — natal + transit + V3 tab (3-panel: กฎ / Input / Output)
- V3 tab: match_rules() ✅ | 3-panel display ✅ | Fallback ✅ | onPromptReady callback ✅
- garbage input fixed V3.3.3: house_lord_of dynamic, REFERENCE filter, planet_id=0

### Next (Claude ทำได้)
- [ ] M3 retry: retry 1 ครั้งก่อน fallback ถ้า Typhoon ไม่ follow JSON format
  (v3/typhoon.js → send_to_typhoon() ~10 บรรทัด — batch กับงานถัดไปก่อน)

### Blocked (รอ user)
- [ ] [ทดลองใช้] ทดสอบ V3.3.4 บนมือถือ — 3-panel view
- [ ] [ทดลองใช้] CF: deploy horatad-ai Worker
- [ ] [BLOCKED] cloud sync — รอ server confirm
- [ ] [BLOCKED] QR URL privacy — รอ Option A/B

### Handoff ล่าสุด
`handoffs/BIBLE_20260521_v2.md`

---

## BIBLE — Prediction Wording Engine 🟢 Active
**เป้าหมาย:** rules → keywords → LLM wordings — ground-truth based, zero hallucination

### สถานะ
- KB: 342 rules, 284 มี conditions[] (83%), rule_source + weight ✅
- M8: compose_local_prediction() + tagged phrase cluster prompt ✅ V3.3.2
- garbage input root causes แก้แล้ว 2/3 — เหลือ 57 MISMATCH rules รอ expert review
- kb_reviewer.html: mobile-ready, patch system, merge, backup ✅

### Next (Claude ทำได้)
- [ ] M3 retry (รวมกับ HORATAD — ไฟล์เดียวกัน)

### Blocked (รอ user) — สำคัญที่สุด
- [ ] [ทดลองใช้] ⭐ **รีวิว 57 MISMATCH rules** ผ่าน kb_reviewer.html
  URL: https://horatad.github.io/horatad/tools/kb_reviewer.html
  เสร็จแล้ว → ⬇ Full kb.json → upload ทับ v3/kb.json บน GitHub
  backup: กด 🛟 Master backup ได้ตลอด (v3/kb_master.json)
- [ ] [ทดลองใช้] รัน m0_hallucination_test.html — Groq score
- [ ] [ทดลองใช้] Expert review v3/kb_skeletons.json — กรอก p field (90 rules ว่าง)
  priority: จันทร์ (9) + ศุกร์ (6) ก่อน

### ไฟล์หลัก
`v3/kb.json` | `v3/kb_master.json` | `v3/interpretation.js` | `v3/typhoon.js`
`tools/kb_reviewer.html` | `MISSION_FINETUNE.md`

---

## JULIAN — Empirical Astro Database 📋 Schema only
**เป้าหมาย:** Julian Day + planet positions + บุคคลสำคัญ → empirical_p ต่อ rule

### สถานะ
- Schema defined: `_empirical_schema` ใน kb.json root
- Records collected: **0** — ยังไม่ได้เริ่ม

### Next (Claude ทำได้)
- [ ] สร้าง wikipedia_scraper.html
- [ ] สร้าง empirical_validator.html

### Blocked (รอ user)
- [ ] [BLOCKED] CF KV/D1 storage — รอ user setup

---

## Quick Reference

| Project | Code | ไฟล์หลัก | สถานะ |
|---|---|---|---|
| Horatad PWA | HORATAD | script.js, v3/*, index.html | 🟡 Pre-launch V3.3.4 |
| Wording Engine | BIBLE | v3/kb.json, v3/interpretation.js, tools/kb_reviewer.html | 🟢 Active — รอ review |
| Empirical DB | JULIAN | v3/kb.json (schema) | 📋 Schema only |

---
*อัปเดตล่าสุด: 2026-05-21 | V3.3.4 | BIBLE handoff v2*
