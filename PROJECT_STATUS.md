# PROJECT STATUS — Horatad Ecosystem
# อัปเดตทุก session close + ทุกครั้งที่ bump version | Claude อ่านไฟล์นี้ก่อนเลือกงาน
# ภาพรวม architecture + data flow + vision → ECOSYSTEM.md

---

## HORATAD — Thai Astrology PWA 🟡 Pre-launch
**Version:** V3.3.23 | **URL:** horatad.com

### สถานะ
- App ทำงานครบ — natal + transit + V3 tab prediction + capture + JULIAN import
- 3-tank memory: Private / QR / JULIAN ✅ (V3.3.16-17)
- Chart redesign M1-M6 ✅ ครบทุก milestone (V3.3.18-22):
  - M1: state vars _compareMode/_outerDisplay/_transitCursor/_transitUnit + synastry/eventChart/transit buffers
  - M2: T1/T2 buttons ใน chart-nav-header (btn-t1/btn-t2) + cycleCompareMode/cycleOuterDisplay
  - M3: transit unit popup (fixed+planet) + sign-change algorithm + cursor helpers
  - M4: rename natal1→natal / natal2→synastry ทั้งไฟล์ (V3.3.20)
  - M5: eventChart full support + cycleMemory _eventIdx + _updateNavHeader compareMode-aware (V3.3.21)
  - M6: localStorage persist _synastryIdx/_eventIdx/_transitCursor + _tsCalc sync + _updateNavHeader compareMode===3 (V3.3.22)

### Next (Claude ทำได้)
- [x] ~~Phase 2 Step 0 — KB_RULES extract~~ ✅ V3.3.23 — script.js 393KB→199KB (-49%)
- [ ] **Phase 2 Step 1** — core/ Tier 1 (engine/lunar/varga/transit) split — spec: `docs/HORATAD_modules.md` §2 Tier 1
- [ ] Phase 2 Step 2 — db/ Tier 2 (io/tank/core/natal/events)
- [ ] PROVINCES extract (5KB, easy pattern after KB)
- [ ] julian_all.json move (รอ user เลือก target)

### Blocked (รอ user)
- [ ] [ทดลองใช้] ทดสอบ V3.3.23 บนมือถือ — KB async load (กดทำนายปกติทำงานไหม) + Lighthouse re-run (คาดว่า TBT ลดลงเพราะ script.js -49%)
- [ ] [ทดลองใช้] ทดสอบ V3.3.22 บนมือถือ — M6 persist (refresh แล้ว transit cursor/synastry/event idx ยังเดิม) + nav header compareMode===3
- [ ] [ทดลองใช้] ทดสอบ V3.3.21 บนมือถือ — T1/T2 buttons + transit unit popup + eventChart cycling
- [ ] [ทดลองใช้] ทดสอบ NOK TTS guide บน Android Chrome
- [ ] [ทดลองใช้] CF: deploy horatad-ai Worker → **GUARD T-02 owns rate-limit policy**
- [ ] [BLOCKED] cloud sync — รอ server confirm
- [ ] [BLOCKED] QR URL privacy — รอ Option A/B/C → **GUARD R-07 owner**

### Handoff ล่าสุด
`handoffs/HORATAD_20260523_v3.md`

---

## BIBLE — Prediction Wording Engine 🟢 Active — kb_v24-3 COMPLETE
**เป้าหมาย:** rules → keywords → LLM wordings — ground-truth based, zero hallucination

### สถานะ
- KB V2.3: 342 rules (ใช้งานอยู่) | Engine 3.1.0 ✅
- **kb_v24-3: ✅ COMPLETE** — 102 บท → 290 rules (2026-05-23)
- Triple extraction pipeline: Groq (kb_v24-1) + Typhoon (kb_v24-2) + Claude (kb_v24-3 ✅)
- kb_v24-1: รอ browser tool Groq | kb_v24-2: รอรันหลัง Groq
- tools/kb_extract.html: เพิ่ม mode selector (Groq/Typhoon) แล้ว ✅

### Next (Claude ทำได้)
- [ ] GUARD T-05: validate_inputs() ใน v3/engine.js + v3/interpretation.js (รายละเอียดใน handoff)
- [ ] Comparison: หลัง 3 ไฟล์ครบ → `session BIBLE — compare` → v3/kb_v24.json final

### Blocked (รอ user)
- [ ] [ทดลองใช้] ⭐ รอ browser tool Groq เสร็จ → download kb_v24-1.json → commit v3/kb_v24-1.json
- [ ] [ทดลองใช้] รัน Typhoon mode ใน browser tool → download kb_v24-2.json → commit v3/kb_v24-2.json

### ไฟล์หลัก
`v3/kb.json` (V2.3 current) | `v3/kb_v24-3.json` (290 rules ✅) | `v3/kb_v24-1.json` `v3/kb_v24-2.json` (รอ)
`tools/kb_extract.html` | `workers/claude_extraction_queue.json` (done=102) | `workers/kb_extract_gha.mjs`

### Handoff ล่าสุด
`handoffs/BIBLE_20260523_v1.md`

---

## JULIAN — Empirical Astro Search Engine 🟢 Automation running
**เป้าหมาย:** 2 ตาราง (Master Key: JD→planets | Internet: JD→persons/events) → ส่งข้อมูลให้ BIBLE + HORATAD
**Priority:** distinct birthdate (jd) สำคัญกว่า total count | birth time = optional (validate หน้างานด้วย accuracy A-F)

### สถานะ (2026-05-23)
- Schema: ✅ + `accuracy` field A/B/C/D/F | JD: ✅
- **Records: 58,428 / 100,000 (58.4%)** — เพิ่มจาก 2 workflow runs
- Accuracy distribution: A=0 B=0 C=599 D=57,819 F=10
- Automation: ✅ 137 queries (15 category + 80 era 20-yr + 42 ASTROTHEME_SERIES) | cron ทุก 6 ชม.
- Export: ✅ `data/julian_all.json` (repo, CORS-free) + GitHub Release ทุก run
- Dedup: ✅ 4 layers (seen_qids + UNIQUE jd/name + UNIQUE source + COALESCE survivorship)
- Astrotheme enrichment: ⚠️ time_utc ทำงาน (1.24% match) | lat/lng = 0 (parser ไม่ได้ extract)
- Wikipedia TH enrichment: ✅ +112 records (เจอจังหวัด 98%, เวลา 10/112) — first Thai time!
- Tier 1 Thai time_utc: 0 → **11 records** ✅
- **Manual seed input tool**: `tools/julian_seed_input.html` + workflow merge step (รอ user เริ่มกรอก)

### Accuracy grades
- **A** สูจิบัตร / official document — เชื่อถือได้สูงสุด (ยังไม่มี — รอ user เติมผ่าน tool)
- **B** คนใกล้ชิด / family testimony — ครอบครัวยืนยัน (ยังไม่มี)
- **C** สาธารณะ verified — Astrotheme + Wikipedia cite source (588 records)
- **D** สาธารณะ unverified — Wikidata date only, no time (52,550 records)
- **F** unknown — placeholder default (10 records)

### Next (Claude ทำได้)
- [ ] ขยาย Wikipedia TH parser — เพิ่ม pattern "ฤกษ์เกิด", "ดวงเกิด" เพื่อจับเวลาเพิ่ม
- [ ] Debug Astrotheme lat/lng parser — selector ไม่ตรง coord field
- [ ] Astro-Databank scraper (astro.com) — Rodden Rating AA/A/B/C/DD → accuracy A/B/C/D/F

### Blocked (รอ user)
- [ ] ⭐ **เปิด `tools/julian_seed_input.html`** กรอก records accuracy A/B/C ของคนใกล้ตัว → export JSON → commit
- [ ] [ทดลองใช้] ทดสอบ HORATAD → "ดาวน์โหลดข้อมูลสาธารณะ"

### Handoff ล่าสุด
`handoffs/JULIAN_20260523_v1.md`

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

## GUARD — Confidentiality · Integrity · Availability + Performance 🟢 Phase 1 — 6/7 DONE
**เป้าหมาย:** ตรวจสอบ + เฝ้าระวัง security (กันขโมย source / hack / spam) + ประสิทธิภาพ (ความเร็ว/ตอบสนอง) ของ horatad.com ทั้งระบบ — ยึด benefit/risk trade-off

### สถานะ
- Charter ครบ: `docs/GUARD_MISSION.md` — 3 pillars + risk register R-01..R-18 + Phase 0-4 roadmap + SOPs (incl. SOP-05 rotation)
- **Phase 0 (Discovery) ✅ COMPLETE 2026-05-23** — 7 audit reports + SECRETS.md ลง `docs/cia/`
- **Phase 1 (Quick Wins) — 6/7 DONE 2026-05-23**: P1-A/B/C/D/F/G shipped main; P1-E blocked on user
- Risk register: R-01/R-03/R-11/R-15/R-16/R-18 controls active; R-12 mitigated; R-17 client OK + Worker pending

### Phase 1 done (this session 2026-05-23)
- ✅ **P1-A** — gitleaks job CI + expanded `.gitignore` + unify @v5 action pins
- ✅ **P1-B** — security headers + CSP Report-Only deployed; inline `<script>` → `auth-pin.js`
- ✅ **P1-C** — maskable PWA icon `horatad_512x512_maskable.png` + manifest update
- ✅ **P1-D** — F1 XSS patch (7 render sites _escHtml-wrapped in script.js)
- ✅ **P1-F** — quarterly rotation reminder workflow (Mar/Jun/Sep/Dec issue auto-create)
- ✅ **P1-G** — charter R-15..R-18 + SOP-05 added

### Phase 1 blocked
- [BLOCKED] **P1-E** — QR Option C friendly disclosure (รอ user ตัดสิน Option A/B/C — GUARD แนะนำ C)

### Next (Claude ทำได้ — Phase 2 prep)
- [ ] **GUARD-P2-D** — `docs/cia/csp_policy.md` draft (pure docs, ทำได้ก่อน enforce)
- [ ] cross-project security scan (NOK / BIBLE / REORG / new items review)
- ผูกกับ Phase 2 (CSP enforce, script.js code-split, julian_all.json move) → รอ Lighthouse + 1 wk CSP observation

### Blocked (รอ user)
- [ ] [ทดลองใช้] รัน Lighthouse mobile + desktop บน horatad.com → save to `docs/cia/lighthouse_*` (R-08)
- [ ] [ทดลองใช้] GitHub Settings: 2FA + branch protection + Dependabot + secret scanning (R-04 + R-10)
- [ ] [ทดลองใช้] Cloudflare dashboard: Rate Limiting 30 req/min/IP (R-02 / T-02)
- [ ] [ทดลองใช้] Export `horatad-auth` + `horatad-ai` Worker source ลง workers/ → GUARD re-audit T-06
- [ ] [ทดลองใช้] หลัง CSP Report-Only ทำงาน 1 wk → ส่ง browser console violations ให้ Claude → Phase 2 P2-A enforce
- [ ] [BLOCKED] R-07 decision — Option A/B/C (GUARD recommends C, P1-E implements once confirmed)

### เริ่ม session
พิมพ์: `session GUARD`

### Handoff ล่าสุด
`handoffs/GUARD_20260523_v3.md` (v1, v2 archived)

### Phase 2 prep ✅ (session 3 — 2026-05-23)
- `docs/cia/csp_policy.md` — Option E refactor plan + 196 inline handler inventory
- `docs/cia/cross_project_scan_2026-05-23.md` — NOK/BIBLE/REORG/JULIAN audit; R-19 added; BIBLE DSL+prompt SAFE ✅

### Charter
`docs/GUARD_MISSION.md`

### Audit outputs (docs/cia/)
`xss_surface_audit_*.md` · `secret_audit_*.md` · `supply_chain_*.md` · `headers_draft_*.md` · `gha_audit_*.md` · `perf_baseline_*.md` · `horatad_auth_audit_*.md` · `../SECRETS.md`

---

## REORG — Docs Cleanup ✅ DONE (2026-05-23)
**เป้าหมาย:** ลด docs จาก 12 → 8 ไฟล์ ปรับ source of truth ให้ชัด

### สถานะ
- ✅ Task 1: ลบ `docs/BEST_PRACTICES.md` + `docs/SYSTEM_INSTRUCTION_V3-4.md` + `docs/HORATAD_MANUAL.md`
- ✅ Task 2: เขียน `docs/HORATAD.md` ใหม่ (~185 บรรทัด) — lean technical reference
- ✅ Task 3: Update `docs/CHANGELOG.md` เพิ่ม V3.2.7–V3.3.19 (19 entries)
- ✅ Task 4: Fix `DEPLOY.md` broken reference + ECOSYSTEM.md/CLAUDE.md references อัปเดต

### Deferred (รอบหน้า)
- [ ] Trim CLAUDE.md — ย้าย HORATAD-specific rules → docs/HORATAD.md
- [ ] Rename `BIBLE_MISSION.md` → `BIBLE.md` + `JULIAN_MISSION.md` → `JULIAN.md` (consistency)

### Handoff ล่าสุด
`handoffs/REORG_20260523_v3.md`

---

## Quick Reference

| Project | Version | ไฟล์หลัก | สถานะ |
|---|---|---|---|
| Horatad PWA | HORATAD V3.3.23 | script.js, v3/*, index.html | 🟡 Pre-launch — M1-M6 ✅ + Phase2 Step0 ✅ (KB extract -49%) |
| Wording Engine | BIBLE KB V2.3.0 | v3/kb.json, v3/interpretation.js, tools/kb_reviewer.html | 🟢 Active — รอ review |
| Empirical DB | JULIAN 53,148/100,000 | workers/julian_scraper.mjs, workers/julian_seed_merge.mjs, tools/julian_seed_input.html | 🟢 Automation + manual seed tool ready |
| Voice TTS | NOK Phase 1 | v3/tts.js (in HORATAD frontend) | 🟢 Deployed — รอ mobile test |
| Platform/Academy | PLATFORM | (ยังไม่มีไฟล์) | 🔲 Vision |
| Security + Perf | GUARD Phase 1 6/7 done | docs/GUARD_MISSION.md + docs/cia/* + docs/SECRETS.md + _headers + auth-pin.js | 🟢 P1-A/B/C/D/F/G ✅ — P1-E blocked on user |
| Docs cleanup | REORG | docs/*.md | ✅ DONE 2026-05-23 — 3 ไฟล์ลบ, HORATAD.md ใหม่, CHANGELOG+19 entries |

---

## วิธีเริ่ม session ใหม่
1. บอก Claude ว่า session นี้เป็น project อะไร: **HORATAD / BIBLE / JULIAN / NOK / PLATFORM / GUARD / REORG / BIG**
2. Claude อ่าน `ECOSYSTEM.md` (ภาพรวม) → `PROJECT_STATUS.md` (งาน) → `handoffs/<PROJECT>_*.md` ล่าสุด
3. Cross-project request → Claude บันทึกใน handoff project ปลายทาง ไม่ทำใน session นี้

---
*อัปเดตล่าสุด: 2026-05-23 | V3.3.23 | HORATAD M1-M6 ✅ + Phase2 Step0 ✅ (script.js -49%) | **GUARD Phase 1: 6/7 ✅** — P1-A/B/C/D/F/G shipped; P1-E blocked on user (R-07 Option C decision) | handoffs/GUARD_20260523_v2.md*
