# PROJECT STATUS — Horatad Ecosystem
# อัปเดตทุก session close + ทุกครั้งที่ bump version | Claude อ่านไฟล์นี้ก่อนเลือกงาน
# ภาพรวม architecture + data flow + vision → ECOSYSTEM.md

---

## HORATAD — Thai Astrology PWA 🟡 Pre-launch
**Version:** V3.3.19 | **URL:** horatad.com

### สถานะ
- App ทำงานครบ — natal + transit + V3 tab prediction + capture + JULIAN import
- 3-tank memory: Private / QR / JULIAN ✅ (V3.3.16-17)
- Chart redesign M1+M2+M3 ✅ (V3.3.18-19):
  - M1: state vars _compareMode/_outerDisplay/_transitCursor/_transitUnit + synastry/eventChart/transit buffers
  - M2: T1/T2 buttons ใน chart-nav-header (btn-t1/btn-t2) + cycleCompareMode/cycleOuterDisplay
  - M3: transit unit popup (fixed+planet) + sign-change algorithm + cursor helpers
- ⚠️ M4 HIGH RISK: rename natal1→natal, natal2→synastry/eventChart/transit ทั้งไฟล์

### Next (Claude ทำได้)
- [ ] **M4** — rename natal1→natal / natal2→context-aware (HIGH RISK — search-replace ทั้งไฟล์)
- [ ] **M5** — eventChart full support + buildCompareReport unified template
- [ ] **M6** — localStorage persistence ของ _synastryIdx/_eventIdx/_transitCursor

### Blocked (รอ user)
- [ ] [ทดลองใช้] ทดสอบ V3.3.17 บนมือถือ — memory modal UX ใหม่ + sort buttons
- [ ] [ทดลองใช้] ทดสอบ V3.3.16 — 3-tank system + JULIAN tree filter
- [ ] [ทดลองใช้] ทดสอบ NOK TTS guide บน Android Chrome
- [ ] [ทดลองใช้] CF: deploy horatad-ai Worker
- [ ] [BLOCKED] cloud sync — รอ server confirm
- [ ] [BLOCKED] QR URL privacy — รอ Option A/B

### Handoff ล่าสุด
`handoffs/HORATAD_20260522_v3.md`

---

## BIBLE — Prediction Wording Engine 🟢 Active — รอ extraction run
**เป้าหมาย:** rules → keywords → LLM wordings — ground-truth based, zero hallucination

### สถานะ
- KB V2.3: 342 rules (Gemini extraction — lossy) | R171/R175/R247 ปิดแล้ว (false positive)
- Engine 3.1.0: master_dict.js + V2.4 reader (typhoon.js + interpretation.js) ✅
- Schema V2.4 DRAFT: `docs/BIBLE_KB_V2.4_SPEC.md`
- 🆕 **Source extraction pipeline**: `workers/kb_extractor.mjs` ✅ rewrite เสร็จแล้ว
  - อ่าน 103 บท (source/CH*.docx) → Claude Sonnet (taxonomy-aware) → v3/kb_v24.json
  - cost ~$1.50 ครั้งเดียว | resume-capable | Typhoon plug-in ผ่าน TYPHOON_API_KEY

### Next (Claude ทำได้)
(ไม่มี — รอ user รัน extractor)

### Blocked (รอ user) — สำคัญที่สุด
- [ ] [ทดลองใช้] ⭐ **รัน kb_extractor.mjs** — ต้องการ ANTHROPIC_API_KEY
  ```
  ANTHROPIC_API_KEY=sk-ant-xxx node workers/kb_extractor.mjs
  ```
  output: v3/kb_v24.json (ไม่ทับ kb.json เดิม) | ตรวจ CH036 มี principle "คู่มิตร N คู่" ไหม
- [ ] [ทดลองใช้] รัน m0_hallucination_test.html — Groq score

### ไฟล์หลัก
`v3/kb.json` (V2.3 current) | `v3/kb_v24.json` (V2.4 output — หลัง extraction)
`v3/interpretation.js` | `v3/typhoon.js` | `v3/master_dict.js`
`workers/kb_extractor.mjs` | `workers/_read_docx.py` | `docs/BIBLE_KB_V2.4_SPEC.md`

### Handoff ล่าสุด
`handoffs/BIBLE_20260522_v5.md`

---

## JULIAN — Empirical Astro Search Engine 🟢 Automation running
**เป้าหมาย:** 2 ตาราง (Master Key: JD→planets | Internet: JD→persons/events) → ส่งข้อมูลให้ BIBLE + HORATAD

### สถานะ
- Schema: ✅ | JD: ✅ | Records: 31,031/50,000 (รันทุก 6 ชั่วโมง)
- Automation: ✅ 137 queries (15 category + 80 era 20-yr + 42 ASTROTHEME_SERIES) | cron ทุก 6 ชม.
- Export: ✅ `data/julian_all.json` (repo, CORS-free) + GitHub Release ทุก run
- Dedup: ✅ 4 layers (seen_qids + UNIQUE jd/name + UNIQUE source + COALESCE survivorship)
- Astrotheme enrichment: ✅ เติม time_utc + lat/lng อัตโนมัติ

### Next (Claude ทำได้)
(ไม่มี — automation ครบแล้ว รอข้อมูลสะสม)

### Blocked (รอ user)
(ไม่มี — automation รันเองได้ทั้งหมด)

### Handoff ล่าสุด
`handoffs/JULIAN_20260522_v1.md`

---

## NOK — Voice Narration Engine 🟢 Phase 1 deployed
**เป้าหมาย:** แปลง text พยากรณ์ → เสียงพูด (TTS) — ฟรี, offline, mobile-first
**Phase 1:** Web Speech API ใน HORATAD V3 tab ✅

### สถานะ
- `v3/tts.js` module ครบ — speak/stop/preload/hasThaiVoice
- ปุ่ม 🔊 ฟังคำพยากรณ์ ใน V3 tab (deployed กับ HORATAD V3.3.14)
- mobile-first: iOS Safari (Kanya) + Android Chrome (Google TH)
- chunk-split text ยาว + strip emoji/markdown + ปุ่ม toggle pattern

### Next (Claude ทำได้ — Phase 2)
- [ ] เลือก voice (Kanya / Niwat / Google TH) — dropdown UI
- [ ] ปรับความเร็ว slider (0.8x - 1.5x)
- [ ] highlight ประโยคที่กำลังพูด (`utterance.onboundary`)
- [ ] บันทึก voice preference ลง localStorage

### Blocked (รอ user)
- [ ] [ทดลองใช้] ⭐ ทดสอบ V3.3.14 บนมือถือ — กดปุ่ม 🔊 → พูดออกเสียงไหม

### Consumer
- HORATAD V3 tab (Phase 1) ✅
- PLATFORM Phase 3 QR scan → speak (อนาคต — code reuse ได้ทันที)

### ไฟล์หลัก
`v3/tts.js` | wired ใน `v3/v3tab.js` + `index.html` + `sw.js`

### Handoff ล่าสุด
`handoffs/NOK_20260522_v1.md`

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
ดู `handoffs/JULIAN_20260521_v2.md` → section PLATFORM VISION

---

## REORG — Docs Cleanup 🟢 Pending (Claude ทำได้)
**เป้าหมาย:** ลด docs จาก 12 → 8 ไฟล์ ปรับ source of truth ให้ชัด

### สถานะ
- BIG session ตรวจพบ docs ขัดแย้ง/outdated/ซ้ำซ้อน 4 critical issue
- Migration plan + verification checklist เขียนครบใน `handoffs/REORG_20260522_v1.md`

### Next (Claude ทำได้ — session REORG)
- [ ] Task 1: ลบ `docs/BEST_PRACTICES.md` + `docs/SYSTEM_INSTRUCTION_V3-4.md` (outdated 100%)
- [ ] Task 2: Rewrite `docs/HORATAD_MANUAL.md` → `docs/HORATAD.md` (498 → ~250 บรรทัด)
- [ ] Task 3: Update `docs/CHANGELOG.md` เพิ่ม V3.2.7-V3.3.12 (16 entries)
- [ ] Task 4: Fix `DEPLOY.md` l.131 broken reference + ECOSYSTEM.md/CLAUDE.md references

### เริ่ม session
พิมพ์: `session REORG`

### Handoff ล่าสุด
`handoffs/REORG_20260522_v1.md`

---

## Quick Reference

| Project | Version | ไฟล์หลัก | สถานะ |
|---|---|---|---|
| Horatad PWA | HORATAD V3.3.19 | script.js, v3/*, index.html | 🟡 Pre-launch — M4-M6 pending |
| Wording Engine | BIBLE KB V2.3.0 | v3/kb.json, v3/interpretation.js, tools/kb_reviewer.html | 🟢 Active — รอ review |
| Empirical DB | JULIAN 31,031/50,000 | workers/julian_scraper.mjs, .github/workflows/julian_sync.yml | 🟢 Automation running |
| Voice TTS | NOK Phase 1 | v3/tts.js (in HORATAD frontend) | 🟢 Deployed — รอ mobile test |
| Platform/Academy | PLATFORM | (ยังไม่มีไฟล์) | 🔲 Vision |
| Docs cleanup | REORG | docs/*.md | 🟢 Pending — รอ session REORG |

---

## วิธีเริ่ม session ใหม่
1. บอก Claude ว่า session นี้เป็น project อะไร: **HORATAD / BIBLE / JULIAN / NOK / PLATFORM / REORG / BIG**
2. Claude อ่าน `ECOSYSTEM.md` (ภาพรวม) → `PROJECT_STATUS.md` (งาน) → `handoffs/<PROJECT>_*.md` ล่าสุด
3. Cross-project request → Claude บันทึกใน handoff project ปลายทาง ไม่ทำใน session นี้

---
*อัปเดตล่าสุด: 2026-05-22 | V3.3.19 | Chart redesign M1+M2+M3 เสร็จแล้ว (T1/T2 buttons + transit unit popup + sign-change algorithm) | M4-M6 pending | handoffs/HORATAD_20260522_v3.md*
