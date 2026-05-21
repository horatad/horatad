# PROJECT STATUS — Horatad Ecosystem
# อัปเดตทุก session close | Claude อ่านไฟล์นี้ก่อนเลือกงาน

---

## HORATAD — Thai Astrology PWA 🟡 Pre-launch
**Version:** V3.3.5 | **URL:** horatad.com / horatad.github.io/horatad

### สถานะ
- App ทำงานได้ครบ — natal + transit + V3 tab (3-panel: กฎ / Input / Output)
- V3 tab: rule IDs (R001–R342) ✅ | natal/transit toggle ✅ | 3-panel ✅ | Typhoon [R_XXX] ✅
- garbage input fixed V3.3.3 | transit matching _include_transit flag V3.3.5

### Next (Claude ทำได้)
- [ ] M3 retry: retry 1 ครั้งก่อน fallback ถ้า Typhoon ไม่ follow JSON format
  (v3/typhoon.js → send_to_typhoon() ~10 บรรทัด — batch กับงานถัดไปก่อน)

### Blocked (รอ user)
- [ ] [ทดลองใช้] ทดสอบ V3.3.4 บนมือถือ — 3-panel view
- [ ] [ทดลองใช้] CF: deploy horatad-ai Worker
- [ ] [BLOCKED] cloud sync — รอ server confirm
- [ ] [BLOCKED] QR URL privacy — รอ Option A/B

### Handoff ล่าสุด
`handoffs/BIBLE_20260521_v3.md`

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
`tools/kb_reviewer.html` | `docs/BIBLE_MISSION.md`

---

## JULIAN — Empirical Astro Search Engine 📋 Design phase
**เป้าหมาย:** 2 ตาราง (Master Key: JD→planets | Internet: JD→persons/events) → ส่งข้อมูลให้ BIBLE

### สถานะ
- Schema: ออกแบบแล้ว (ดู handoff) | Storage: ยังไม่มี | Records: 0
- ⚠️ Decision pending: JD format — standard (2451545=J2000) หรือ internal (_calcJD)?

### Next (Claude ทำได้ — ไม่ต้องรอ CF)
- [ ] julian_keygen.html — generate Master Key batch (JD range → planets[10]) → download CSV
- [ ] julian_scraper.html — ค้นหาบุคคล/เหตุการณ์ → บันทึก Internet Table → download JSONL
- [ ] docs/JULIAN_MISSION.md — แยก JULIAN mission ออกจาก BIBLE_MISSION.md
- prerequisite: ยืนยัน JD format ก่อน build

### Blocked (รอ user)
- [ ] [BLOCKED] CF D1 setup — storage + query API
- [ ] [ทดลองใช้] ยืนยัน JD format (standard vs internal)
- [ ] [ทดลองใช้] กำหนด year range สำหรับ Master Key

### Handoff ล่าสุด
`handoffs/JULIAN_20260521_v1.md`

---

## Quick Reference

| Project | Code | ไฟล์หลัก | สถานะ |
|---|---|---|---|
| Horatad PWA | HORATAD | script.js, v3/*, index.html | 🟡 Pre-launch V3.3.4 |
| Wording Engine | BIBLE | v3/kb.json, v3/interpretation.js, tools/kb_reviewer.html | 🟢 Active — รอ review |
| Empirical DB | JULIAN | v3/kb.json (schema) | 📋 Schema only |

---
## วิธีเริ่ม session ใหม่
1. บอก Claude ว่า session นี้เป็น project อะไร: **HORATAD / BIBLE / JULIAN**
2. Claude อ่านไฟล์นี้ + `handoffs/<PROJECT>_*.md` ล่าสุด แล้วเริ่มงาน
3. Cross-project request → Claude บันทึกใน handoff project ปลายทาง ไม่ทำใน session นี้

---
*อัปเดตล่าสุด: 2026-05-21 | V3.3.5 | BIBLE handoff v3*
