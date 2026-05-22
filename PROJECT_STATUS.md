# PROJECT STATUS — Horatad Ecosystem
# อัปเดตทุก session close + ทุกครั้งที่ bump version | Claude อ่านไฟล์นี้ก่อนเลือกงาน
# ภาพรวม architecture + data flow + vision → ECOSYSTEM.md

---

## HORATAD — Thai Astrology PWA 🟡 Pre-launch
**Version:** V3.3.12 | **URL:** horatad.com

### สถานะ
- App ทำงานครบ — natal + transit + V3 tab prediction + capture + JULIAN import
- M3+M8 fallback chain ครบ: Typhoon fail → throw → compose_local_prediction()
- Capture: QR bundle local ✅ | toast บอก location ✅ (V3.3.11)
- JULIAN import: ✅ data/julian_all.json มีใน repo ([] placeholder, จะเติมจาก workflow) | empty message user-friendly ✅ (V3.3.12)

### Next (Claude ทำได้)
(ไม่มี — รอ user actions ทั้งหมด)

### Blocked (รอ user)
- [ ] [ทดลองใช้] ทดสอบ V3.3.12 บนมือถือ — capture QR, toast location, about page full-screen, JULIAN download message
- [ ] [ทดลองใช้] CF: deploy horatad-ai Worker
- [ ] [BLOCKED] cloud sync — รอ server confirm
- [ ] [BLOCKED] QR URL privacy — รอ Option A/B

### Handoff ล่าสุด
`handoffs/HORATAD_20260521_v5.md`

---

## BIBLE — Prediction Wording Engine 🟢 Active
**เป้าหมาย:** rules → keywords → LLM wordings — ground-truth based, zero hallucination

### สถานะ
- KB: 342 rules, 284 มี conditions[] (83%), rule_source + weight ✅
- M3+M8: fallback chain ครบแล้ว (V3.3.6) — Typhoon fail JSON → throw → compose_local_prediction()
- tagged phrase cluster prompt ✅ | Rule IDs R001–R342 ✅ | natal/transit toggle ✅
- 57 MISMATCH rules รอ expert review — kb_reviewer.html mobile-ready ✅

### Next (Claude ทำได้)
(ไม่มี — รอ user review 57 MISMATCH rules ก่อน)

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

### Handoff ล่าสุด
`handoffs/BIBLE_20260521_v4.md`

---

## JULIAN — Empirical Astro Search Engine 🟢 Automation running
**เป้าหมาย:** 2 ตาราง (Master Key: JD→planets | Internet: JD→persons/events) → ส่งข้อมูลให้ BIBLE + HORATAD

### สถานะ
- Schema: ✅ | JD: ✅ | CF D1 online | Records: 31,031/50,000 (62%) — รันทุก 6 ชั่วโมง
- Automation: ✅ 95 queries (15 category + 80 era 5-yr) | cron ทุก 6 ชม.
- Export: ✅ D1 → `data/julian_all.json` (repo, CORS-free) + GitHub Release ทุก run
- Dedup: ✅ 4 layers (seen_qids + UNIQUE jd/name + UNIQUE source + COALESCE survivorship)
- Astrotheme enrichment: ✅ เติม time_utc + lat/lng อัตโนมัติ

### Next (Claude ทำได้)
(ไม่มี — automation ครบแล้ว รอข้อมูลสะสม 5-7 วัน)

### Blocked (รอ user)
(ไม่มี — automation รันเองได้ทั้งหมด)

### Handoff ล่าสุด
`handoffs/JULIAN_20260521_v6.md`

---

## PLATFORM — Training Center + Chatbot + Content 🔲 Vision (ยังไม่เริ่ม)
**เป้าหมาย:** 1 คนดูแลทุกช่องทาง (LINE OA, YouTube, Facebook, online course, 1:1 consult) ด้วย automation

### Vision (บันทึก 2026-05-21)
- **Phase 1:** LINE OA chatbot → BIBLE wording → ตอบพยากรณ์อัตโนมัติ 24/7
- **Phase 2:** QR scan → HORATAD → BIBLE → TTS พูดพยากรณ์ (Web Speech API)
- **Phase 3:** Content auto: BIBLE generate script → YouTube + Facebook weekly
- **Phase 4:** Online course (สุริยยาตร์ unique) + Booking 1:1 consult

### Prerequisite (รอ HORATAD + BIBLE พร้อมก่อน)
- [ ] LINE OA account setup
- [ ] ตัดสินใจ Phase เริ่มต้น (แนะนำ: LINE OA chatbot ก่อน)

### รายละเอียด
ดู `ECOSYSTEM.md` → section "PLATFORM — Distribution" + Roadmap Phase 2–4
(handoff เก่า `handoffs/archive/JULIAN_20260521_v2.md` มี early vision draft)

---

## Quick Reference

| Project | Version | ไฟล์หลัก | สถานะ |
|---|---|---|---|
| Horatad PWA | HORATAD V3.3.12 | script.js, v3/*, index.html | 🟡 Pre-launch |
| Wording Engine | BIBLE KB V2.3.0 | v3/kb.json, v3/interpretation.js, tools/kb_reviewer.html | 🟢 Active — รอ review |
| Empirical DB | JULIAN 31,031/50,000 | workers/julian_scraper.mjs, .github/workflows/julian_sync.yml | 🟢 Automation running |
| Platform/Academy | PLATFORM | (ยังไม่มีไฟล์) | 🔲 Vision |

---

## วิธีเริ่ม session ใหม่
1. บอก Claude ว่า session นี้เป็น project อะไร: **HORATAD / BIBLE / JULIAN / PLATFORM**
2. Claude อ่าน `ECOSYSTEM.md` (ภาพรวม) → `PROJECT_STATUS.md` (งาน) → `handoffs/<PROJECT>_*.md` ล่าสุด
3. Cross-project request → Claude บันทึกใน handoff project ปลายทาง ไม่ทำใน session นี้

---
*อัปเดตล่าสุด: 2026-05-22 | V3.3.12 | JULIAN 31,031/50,000 (62%) — automation รัน 6+ รอบ | BIBLE รอ MISMATCH review | BIG doc audit cleanup ✅*
