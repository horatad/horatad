# PROJECT STATUS — Horatad Ecosystem
# อัปเดตทุก session close | Claude อ่านไฟล์นี้ก่อนเลือกงาน
# ภาพรวม architecture + data flow + vision → ECOSYSTEM.md

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

## JULIAN — Empirical Astro Search Engine 🟢 Automation running
**เป้าหมาย:** 2 ตาราง (Master Key: JD→planets | Internet: JD→persons/events) → ส่งข้อมูลให้ BIBLE + HORATAD

### สถานะ
- Schema: ✅ | JD: ✅ | CF D1 online | Records: 436/50,000 (รันทุก 6 ชั่วโมง)
- Automation: ✅ 95 queries (15 category + 80 era 5-yr) | cron ทุก 6 ชม. | export → GitHub Release
- Dedup: ✅ 4 layers (seen_qids + UNIQUE jd/name + UNIQUE source + COALESCE survivorship)
- Export: ✅ D1 → GitHub Release ทุก run → URL คงที่ releases/latest/download/julian_all.json
- Architecture: CF D1 (write) + GitHub Release (read) + IndexedDB (HORATAD local cache)

### Next (Claude ทำได้)
- (ไม่มี — automation ครบแล้ว รอข้อมูลสะสม 5-7 วัน)

### Blocked (รอ user)
- [ ] [BLOCKED] รัน D1 migration: CREATE UNIQUE INDEX idx_internet_source_wikidata
- [ ] [BLOCKED] Reset done_queries: [] ใน julian_progress.json (ถ้าต้องการ re-scrape era ใหม่)
- [ ] [BLOCKED] import master_key: julian_keygen.mjs 1700 2100 → D1

### Handoff ล่าสุด
`handoffs/JULIAN_20260521_v5.md`

---

## PLATFORM — Training Center + Chatbot + Content 🔲 Vision (ยังไม่เริ่ม)
**เป้าหมาย:** 1 คนดูแลทุกช่องทาง (LINE OA, YouTube, Facebook, online course, 1:1 consult) ด้วย automation

### Vision (บันทึก 2026-05-21)
- **Phase 1:** LINE OA chatbot → BIBLE wording → ตอบพยากรณ์อัตโนมัติ 24/7
- **Phase 2:** QR scan → HORATAD → BIBLE → TTS พูดพยากรณ์ (Web Speech API)
- **Phase 3:** Content auto: BIBLE generate script → YouTube + Facebook weekly
- **Phase 4:** Online course (สุริยยาตร์ unique) + Booking 1:1 consult

### Next (Claude ทำได้ — เมื่อ HORATAD/BIBLE พร้อม)
- [ ] LINE OA webhook CF Worker — รับวันเกิด → reply พยากรณ์ auto
- [ ] TTS integration ใน HORATAD — Web Speech API (browser built-in)

### Blocked (รอ user)
- [ ] LINE OA account setup
- [ ] ตัดสินใจ Phase เริ่มต้น (แนะนำ: LINE OA chatbot ก่อน)

### รายละเอียด
ดู `handoffs/JULIAN_20260521_v2.md` → section PLATFORM VISION

---

## Quick Reference

| Project | Code | ไฟล์หลัก | สถานะ |
|---|---|---|---|
| Horatad PWA | HORATAD | script.js, v3/*, index.html | 🟡 Pre-launch V3.3.5 |
| Wording Engine | BIBLE | v3/kb.json, v3/interpretation.js, tools/kb_reviewer.html | 🟢 Active — รอ review |
| Empirical DB | JULIAN | tools/julian_keygen.html, tools/julian_scraper.html, docs/JULIAN_MISSION.md | 🛠 Tools ready — รอ CF D1 |
| Platform/Academy | PLATFORM | (ยังไม่มีไฟล์) | 🔲 Vision — รอ Phase 1 |

---
## วิธีเริ่ม session ใหม่
1. บอก Claude ว่า session นี้เป็น project อะไร: **HORATAD / BIBLE / JULIAN / PLATFORM**
2. Claude อ่าน `ECOSYSTEM.md` (ภาพรวม) → `PROJECT_STATUS.md` (งาน) → `handoffs/<PROJECT>_*.md` (context)
3. Cross-project request → Claude บันทึกใน handoff project ปลายทาง ไม่ทำใน session นี้

---
*อัปเดตล่าสุด: 2026-05-21 | V3.3.5 | JULIAN handoff v3 | JULIAN automation ready*
