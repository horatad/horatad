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
- [ ] [ทดลองใช้] CF: deploy horatad-ai Worker → **GUARD T-02 owns rate-limit policy**
- [ ] [BLOCKED] cloud sync — รอ server confirm
- [ ] [BLOCKED] QR URL privacy — รอ Option A/B → **GUARD T-01 / R-07 owner** (GUARD แนะนำ Option C: friendly disclosure)

### Handoff ล่าสุด
`handoffs/HORATAD_20260522_v3.md`

---

## BIBLE — Prediction Wording Engine 🟢 Active — Triple extraction running
**เป้าหมาย:** rules → keywords → LLM wordings — ground-truth based, zero hallucination

### สถานะ
- KB V2.3: 342 rules (ใช้งานอยู่) | Engine 3.1.0 ✅
- Triple extraction pipeline: Groq (kb_v24-1) + Typhoon (kb_v24-2) + Claude queue (kb_v24-3)
- kb_v24-1: **กำลังรัน** (browser tool) | kb_v24-2: รอรันหลัง Groq | kb_v24-3: รอ session queue
- tools/kb_extract.html: เพิ่ม mode selector (Groq/Typhoon) แล้ว ✅
- workers/claude_extraction_queue.json: สร้างแล้ว (102 บท pending) ✅

### Next (Claude ทำได้)
- [ ] kb_v24-3: `session BIBLE` → Claude process 15 บท/session ×7 → v3/kb_v24-3.json
- [ ] Comparison: หลัง 3 ไฟล์ครบ → `session BIBLE — compare` → v3/kb_v24.json final

### Blocked (รอ user)
- [ ] [ทดลองใช้] ⭐ รอ browser tool Groq เสร็จ → download kb_v24-1.json → commit v3/kb_v24-1.json
- [ ] [ทดลองใช้] รัน Typhoon mode ใน browser tool → download kb_v24-2.json → commit v3/kb_v24-2.json

### ไฟล์หลัก
`v3/kb.json` (V2.3 current) | `v3/kb_v24-1.json` `v3/kb_v24-2.json` `v3/kb_v24-3.json` (extraction outputs)
`tools/kb_extract.html` | `workers/claude_extraction_queue.json` | `workers/kb_extract_gha.mjs`

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

## GUARD — Confidentiality · Integrity · Availability + Performance 🟢 Phase 0 COMPLETE → Phase 1 Ready
**เป้าหมาย:** ตรวจสอบ + เฝ้าระวัง security (กันขโมย source / hack / spam) + ประสิทธิภาพ (ความเร็ว/ตอบสนอง) ของ horatad.com ทั้งระบบ — ยึด benefit/risk trade-off

### สถานะ
- Charter ครบ: `docs/GUARD_MISSION.md` — 3 pillars + risk register R-01..R-18 + Phase 0-4 roadmap + SOPs
- **Phase 0 (Discovery) COMPLETE 2026-05-23** — 7 audit reports + SECRETS.md ลง `docs/cia/`
- Risk register update: R-12 mitigated ✅, R-16 COMPLIANT ✅, R-17 partial (Worker source needed), F1 found (low-med XSS via QR import path)

### Key findings (Phase 0)
- **R-11 (headers)** — zero security headers ปัจจุบัน → drafted `docs/cia/headers_draft_2026-05-23.md` พร้อม apply ใน P1-B
- **R-17 (horatad-auth)** — client gate เป็น cosmetic CSS-only (DevTools bypass trivial); needs Worker source export + intent clarification with HORATAD
- **F1 (XSS via QR)** — 5 sites ไม่ escape `s.d/s.m/s.y_be/s.t/s.prov` → P1-D patch ~10 บรรทัด
- **R-16 (Wikidata)** — COMPLIANT ✅ ปิดได้
- **T-05 (BIBLE)** — confirmed no validate_inputs in engine.js → cross-link to BIBLE owner

### Next (Claude ทำได้ — Phase 1 Quick Wins, 7 งาน)
- [ ] **GUARD-P1-A** — gitleaks CI + expand .gitignore + unify @v5 action pins
- [ ] **GUARD-P1-B** — apply security headers + CSP report-only + extract inline `<script>`
- [ ] **GUARD-P1-C** — maskable icon + manifest update
- [ ] **GUARD-P1-D** — F1 XSS patch (escape 5 render sites)
- [ ] **GUARD-P1-E** — QR Option C friendly disclosure UI
- [ ] **GUARD-P1-F** — quarterly rotation reminder workflow (GH issue auto-create)
- [ ] **GUARD-P1-G** — update GUARD_MISSION.md charter with R-15..R-18 + SOP-05

### Blocked (รอ user — Phase 0 outcomes)
- [ ] [ทดลองใช้] รัน Lighthouse mobile + desktop บน horatad.com → save to `docs/cia/lighthouse_*` (R-08)
- [ ] [ทดลองใช้] GitHub Settings: 2FA + branch protection + Dependabot + secret scanning (R-04 + R-10)
- [ ] [ทดลองใช้] Cloudflare dashboard: Rate Limiting 30 req/min/IP (R-02 / T-02)
- [ ] [ทดลองใช้] Export `horatad-auth` + `horatad-ai` Worker source ลง workers/ → GUARD re-audit T-06
- [ ] [BLOCKED] R-07 decision — Option A/B/C (GUARD recommends C, P1-E implements)

### เริ่ม session
พิมพ์: `session GUARD`

### Handoff ล่าสุด
`handoffs/GUARD_20260523_v1.md` (v2 archived)

### Charter (ต้องอ่านก่อน session GUARD ทุกครั้ง)
`docs/GUARD_MISSION.md`

### Audit outputs (docs/cia/)
`xss_surface_audit_*.md` · `secret_audit_*.md` · `supply_chain_*.md` · `headers_draft_*.md` · `gha_audit_*.md` · `perf_baseline_*.md` · `horatad_auth_audit_*.md` · `../SECRETS.md`

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
| Security + Perf | GUARD Phase 1 ready | docs/GUARD_MISSION.md + docs/cia/* + docs/SECRETS.md | 🟢 Phase 0 ✅ — Phase 1 quick wins next |
| Docs cleanup | REORG | docs/*.md | 🟢 Pending — รอ session REORG |

---

## วิธีเริ่ม session ใหม่
1. บอก Claude ว่า session นี้เป็น project อะไร: **HORATAD / BIBLE / JULIAN / NOK / PLATFORM / GUARD / REORG / BIG**
2. Claude อ่าน `ECOSYSTEM.md` (ภาพรวม) → `PROJECT_STATUS.md` (งาน) → `handoffs/<PROJECT>_*.md` ล่าสุด
3. Cross-project request → Claude บันทึกใน handoff project ปลายทาง ไม่ทำใน session นี้

---
*อัปเดตล่าสุด: 2026-05-23 | V3.3.19 | HORATAD M4-M6 pending | **GUARD Phase 0 ✅ COMPLETE** — 7 audits ใน docs/cia/ + docs/SECRETS.md; Phase 1 ready (P1-A..P1-G) | handoffs/GUARD_20260523_v1.md*
