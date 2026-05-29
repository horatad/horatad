# PROJECT STATUS — Horatad Ecosystem
# อัปเดตทุก session close + ทุกครั้งที่ bump version | Claude อ่านไฟล์นี้ก่อนเลือกงาน
# ภาพรวม architecture + data flow + vision → ECOSYSTEM.md

---

## HORATAD — Thai Astrology PWA 🟡 Pre-launch
**Version:** V3.3.49 | **URL:** horatad.com

### สถานะ
- App ทำงานครบ — natal + transit + V3 tab prediction + capture + JULIAN import
- 3-tank memory: Private / QR / JULIAN ✅ (V3.3.16-17)
- Chart redesign M1-M6 ✅ ครบ (V3.3.18-22)
- **V3.3.24** ✅ KB_RULES extract — script.js 393KB→199KB (-49%) async load
- **V3.3.25** ✅ wire matchRulesV24 + kb_v24-3 (290 rules) เข้าปุ่ม "ดูกฎ" V3 tab local
- **V3.3.26** ✅ speak-rate ปุ่ม cycle 1×/1.25×/1.5×/1.75× + save localStorage
- **V3.3.27** ✅ voice-chat real-time — push-to-talk + Typhoon send_chat + TTS reply
- **V3.3.28** ✅ TTS voice detection — voiceschanged refresh ปุ่ม + ปุ่มตรวจสอบใหม่ใน guide
- **V3.3.29** ✅ music player "เกาะในฝัน" หน้าเกี่ยวกับ (clip 47s) + cache offline
- **V3.3.30** ✅ TTS guide เพิ่ม Windows + macOS sections (ไม่ใช่ Android-only)
- **V3.3.31** ✅ BGM auto-play เมื่อเข้าหน้าเกี่ยวกับ + auto-stop เมื่อออก (loop 45s)
- **V3.3.32** ✅ BGM หน้าการคำนวณวันจันทรคติ + ปรับ about BGM
- **V3.3.33** ✅ fix BGM overlap about/lunar เล่นซ้อนกัน
- **V3.3.34** ✅ ลบ lunar BGM + ลบ info bar แสดงชื่อเพลง
- **V3.3.35** ✅ mode buttons auto-refresh + TTS strip rule IDs + voice chat KB rules inject
- **V3.3.36** ✅ restore เกาะในฝัน BGM บนหน้า About (ถูกลบโดยไม่ตั้งใจใน V3.3.34)

### Next (Claude ทำได้)
- [x] ~~Tank redesign Phase A~~ ✅ V3.3.34+1 — source/tags fields + helpers + LAST_SLOT1_UID — spec: `docs/HORATAD_tank_redesign.md`
- [ ] **Tank redesign Phase B** — slot1/slot2 abstraction + form "✏️ ใส่ข้อมูล" + start=last slot1 — spec ready, รอ user เริ่ม
- [ ] **Tank redesign Phase C** — visible UI refactor (picker popup + outer toggle + source-aware) — ⚠️ รอ CSP enforce (touch inline handlers)
- [ ] **Phase 2 Step 1** — core/ Tier 1 (engine/lunar/varga/transit) split — spec: `docs/HORATAD_modules.md` §2 Tier 1 — ⚠️ รอ CSP enforce
- [ ] Phase 2 Step 2 — db/ Tier 2 (io/tank/core/natal/events) — รอ Step 1
- [ ] PROVINCES extract (5KB) — DEFERRED hot calc path
- [x] ~~Retroactive backup v3.3.25–v3.3.32~~ ✅ + v3.3.35 — pushed 7 branches (26/27/28/29/30/31/35)
- [ ] julian_all.json move (รอ user เลือก target)
- **Prototype:** `tools/tank_redesign_prototype.html` — validated by user iterations 2026-05-25/26

### Blocked (รอ user)
- [ ] [ทดลองใช้] ⭐ ทดสอบ V3.3.36 — BGM เกาะในฝัน หน้า About กดปุ่มเล่น/หยุดได้ปกติ
- [ ] [ทดลองใช้] ⭐ ทดสอบ V3.3.35 mode buttons auto-refresh + voice-chat (push-to-talk ครบ flow)
- [ ] [ทดลองใช้] CF: deploy horatad-ai Worker → **GUARD T-02 owns rate-limit policy**
- [ ] [ทดลองใช้] Lighthouse mobile + desktop V3.3.36 — `docs/admin/USER_TASKS_lighthouse_csp_2026-05-24.md` Part 1
- [ ] [ทดลองใช้] CSP violations 1 wk → Phase 2 P2-A enforce (deadline ~2026-05-30)
- [ ] [BLOCKED] cloud sync — รอ server confirm
- [ ] [BLOCKED] QR URL privacy — รอ Option A/B/C → **GUARD R-07 owner**

### Handoff ล่าสุด
`handoffs/HORATAD_20260526_v1.md`

---

## BIBLE — TALS Wording Engine 🟢 Active — quality_maps + TALS naming
**System:** TALS (Thai Astrology Logical Style) · founder: ยืนยง นาวาสมุทร (แดง เมืองตราด)
**เป้าหมาย:** TALS rules → keywords → LLM wordings — ground-truth via triangulation (100CH + LLMs + user)

### สถานะ
- KB V2.3: 342 rules (production, ใช้งานอยู่) | Engine 3.1.0 ✅
- kb_v24-3: ✅ COMPLETE — 102 บท → 290 rules (2026-05-23)
- **🆕 source_type audit COMPLETE (2026-05-29)** — PRIMARY=264/290, INFERRED=26 (legitimate combinations)
- **🆕 Triangulation architecture (PINNED v2, 2026-05-25)** — pipeline end-to-end COMPLETE
- **Master dict v1.4.0-complete** (2026-05-25): 10 ✅ · 1 🟡
- **🔴 PINNED v3 (2026-05-26)** — FOUNDATIONAL RULE #1: natal=80%, ดาวจร=stimulator only + Corollary
- **🆕 v3/quality_maps.json v1.0** (2026-05-26) — single source of truth for quality config detection
  - Verified: เกษตร · อุจ (8/8, ราหู corrected) · นิจ · มหาจักร (8/8 user-verified) · จุลจักร (derived)
  - Pending: ราชาโชค per-planet · เทวีโชค (derived from ราชาโชค)

### Files map (triangulation infra + quality_maps)
- Scripts: `workers/kb_*.mjs` (add_fingerprint · merge · deep_parse · apply_review · wording_poc)
- Data: `v3/kb_v24-3_fp.json` · `v3/kb_merged.json` · **`v3/quality_maps.json` (new)** · (target: `v3/kb_v24-final.json`)
- Tools: `tools/kb_extract.html` · `tools/kb_review.html`
- Memory: `handoffs/bible_memory/LOG.md` PINNED v2 + v3 (natal=80%)

### 🔴 REQUEST LIST — Memory Enhancement + JULIAN integration (cross-checked in handoff)
> เรื่องสำคัญต้องทำต่อเนื่อง — บันทึก 2 ที่กันหลุด

| # | Task | Scope | Status |
|---|---|---|---|
| 1 | Slash commands `.claude/commands/bible-*.md` | grey | pending — scope confirm |
| 2 | Nested CLAUDE.md `handoffs/bible_memory/CLAUDE.md` | BIBLE ✅ | ready |
| 3 | Generated index `workers/build_bible_index.mjs` | BIBLE ✅ | ready |
| 4 | Decision Records `docs/decisions/bible/` (pilot) | BIBLE | ready |
| 5 | Anti-pattern hook `.claude/hooks/pre-edit-memory.sh` | BIG ❌ | spec only |
| 6 | **JULIAN ↔ BIBLE integration** (JD-master-index for KB validation) | cross | high value |

### Next (Claude ทำได้, ลำดับ priority)
- [ ] **Sync master_dict_meanings.json planet_positions** with quality_maps.json (single-value mahachak, remove pair-list)
- [ ] **KB audit script** — ~19 rules อุจจาวิลาส/อุจจาภิมุข impact + ~11 ราหู+quality
- [ ] **Request list 1-4 + 6** above (Phase A) → implement when scope confirmed
- [ ] Layer 3 LLM validator + Layer 2 schema enforcement
- [ ] Layer 4 decomposition (3-phase prompts) + Layer 5 tool-use

### Blocked (รอ user)
- [ ] [ทดลองใช้] ⭐ ราชาโชค per-planet verification (8 values) — completes quality_maps.json
- [ ] [ทดลองใช้] ⭐ รัน Groq mode → kb_v24-1_fp.json | URL: tools/kb_extract.html
- [ ] [ทดลองใช้] ⭐ รัน Typhoon mode → kb_v24-2_fp.json
- [ ] [ทดลองใช้] เปิด `kb_review.html` → review 32 INTERNAL_DUPE → export decisions
- [ ] [ทดลองใช้] KB equalizer test — POC prompt → Gemini/Typhoon/Claude.web compare

### Deferred (รอ decision)
- [ ] **Wording selection policy** — IN_BOOK first / rotate / chart-context
- [ ] **Production-ready threshold** — ≥2 sources / user marks ✓ / both
- [ ] kb_v24-4 — รอหนังสือใหม่

### 📨 Note to HORATAD — engine switch when kb_v24-final.json พร้อม
- update `v3/engine.js` to load kb_v24-final.json (wordings[] array — เลือก per policy)

### Handoff ล่าสุด
`handoffs/BIBLE_20260529_v1.md`

### Master Dictionary — สถานะ 2026-05-29
- tals_planets.json ✅ keywords v2.1 (tals/llm tagged)
- tals_signs.json ✅ keywords v2.1
- tals_houses.json ✅ keywords v2.1
- tals_planet_relations.json ✅ 4 types + 13 pairs (ch008)
- tals_lagna.json ✅ ตนุเศษ/ตนุลัคน์/กุมลัคนา (ch013+ch023) **NEW**
- tals_quality_rules.json ✅ + เรือนนอก/ใน rule **NEW**
- kb_tals.json ✅ 290 rules + score field 0.0-1.0 **NEW**

---

## JULIAN — Empirical Astro Search Engine 🟢 Automation running
**เป้าหมาย:** 2 ตาราง (Master Key: JD→planets | Internet: JD→persons/events) → ส่งข้อมูลให้ BIBLE + HORATAD
**Priority:** distinct birthdate (jd) สำคัญกว่า total count | birth time = optional (validate หน้างานด้วย accuracy A-F)

### 🔒 JULIAN Policy (2026-05-27) — Prediction Focus
> **JULIAN ต้องมุ่งเป้าที่ "พยากรณ์อนาคต" โดยใช้ผลการทดสอบที่พิสูจน์แล้วเป็นหลักฐาน**
- กฎที่นำไปใช้ใน prediction engine ต้องผ่าน: FDR q<0.05 + ผ่าน skeptic test age-proxy + ผ่าน directional test
- **MR-related rules ห้ามใช้** — MR period=83yr = age proxy ทั้งหมด (ยืนยัน 2026-05-27)
- ไม่นำ rule ที่ยังไม่ผ่าน statistical validation ไปใส่ใน kb.json
- empirical_p = lift-based probability ที่ calibrated จาก real events เท่านั้น
- งาน ML ทุกชิ้นต้องมี "what prediction does this enable?" เป็น exit criterion

### ⚠️ Engine Compatibility (engine.js recoding — 2026-05-27)
JULIAN workers พึ่งพา engine.js ใน 5 ไฟล์ — **สิ่งที่ห้ามเปลี่ยนโดยไม่แจ้ง JULIAN:**

| Invariant | ผลถ้าเปลี่ยน |
|---|---|
| Raw position unit = **1800 steps/sign** (21600 total) | ต้องรีคำนวณ features + retrain CNN ทั้งหมด |
| Planet index order: sp[0]=LA, sp[1]=SU … sp[10]=MR | model ทำนายผิดดาว — ผิดทั้งระบบ |
| `get_data(d, m, y, hr, mn, lng)` signature | arg order สลับ → ตำแหน่งดาวผิดทั้งหมด |
| `getStandards(pos,i)` → slash-sep string | quality parse พัง |
| `get_data` returns array length ≥ 11 | null guard พัง |

**ปลอดภัย**: เพิ่ม export ใหม่, ย้าย function ไป sub-module (standards.js ✅), เปลี่ยน algorithm ภายใน
**ต้องแจ้ง JULIAN session ก่อน**: เปลี่ยน unit, เปลี่ยน index order, เปลี่ยน return format

### สถานะ (2026-05-29 — updated session v7)
- Records: **129,163** (25.8%) — wikidata: 78,188 · musicbrainz: 50,975 · accuracy C=617 D=128,496 F=50
- **🧬 Genealogy = research asset อันดับ 1** (ปีเตอร์ standing rule — รายงานก่อน record count)
  - 3 แกน: family (P22/25/26/40/3373) · office succession (P39+P1365/P1366) · **title lineage (P166+P585) ใหม่ v7**
  - `julian_genealogy_analyze.mjs` (depth/clan/dynasty) · `julian_title_lineage.mjs` · `julian_coverage_probe.mjs`
  - 🔴 FINDING: Job 2 (backfill) อาจไม่รัน (checkpoint หายจาก main) → GUARD แก้ `if: always()`
- **🆕 PDF report ผู้อ่านทั่วไป**: `tools/julian_report_gen.py` (reportlab+Sarabun) → `docs/julian_research_report.pdf` 9 หน้า
- Events scraper: **~53%** — รัน auto 4x/day
- **Features (2026-05-28)**: Images (P18) + Genealogy (P22/P25/P26/P40) + Succession (P39+P1365/P1366)
  - `workers/julian_genealogy_backfill.mjs` + `julian_succession_backfill.mjs`
  - `tools/julian_lookup.js`: `getFamily(qid)` + `getSuccession(qid)` + `getMiniRecordByQid(qid)`
  - `data/index/genealogy.json` + `succession.json` + `images.json` (รอ backfill workflow)
- **🆕 Blind test worker**: `workers/julian_blind_test.mjs` (K-fold + era + country — รอ events data)
- **🆕 Report**: `docs/julian_suxa_report/report.html` — PDF-ready, ไทย, ระดับ ป.ตรี
  - URL: https://horatad.github.io/horatad/docs/julian_suxa_report/report.html
- **Full scan verdict (2026-05-28)**: 50 rules analyzed ครบ
  - ✅ SU×SA: **16 rules valid** — `ml/models/julian_valid_rules.json` ready for BIBLE
  - ❌ MR×MR: 19 debunked (age proxy 83yr)
  - ❌ SA×MR + SU×MR: 9 rejected (inconsistent polarity — dist1 goes both directions)
  - ⚠️ SA×SA + SU×JU: 4 monitor (borderline)

### New Files (2026-05-28)
| ไฟล์ | หน้าที่ |
|---|---|
| `workers/julian_genealogy_backfill.mjs` | ดึง P22/P25/P26/P40/P3373 → julian_family.json |
| `workers/julian_succession_backfill.mjs` | ดึง P39+P1365/P1366 → julian_succession.json |
| `workers/julian_blind_test.mjs` | K-fold cross-validation + era + geo split |
| `docs/julian_suxa_report/report.html` | PDF report SU×SA (ไทย ป.ตรี) |
| `ml/models/julian_valid_rules.json` | 16 valid rules + rejected/monitor analysis |

### 📣 FB Content Pipeline — ทำทุก session ก่อนงานอื่น ⭐

> **JULIAN เป็นนักวิจัย + นักเขียน content** — ทุก session เริ่มต้นด้วยการตรวจ pipeline นี้ก่อน:
>
> **ขั้นตอน:**
> 1. อ่าน `content/julian_proposals.json` → หา `status="approved"`
> 2. ถ้ามี approved → ดึง valid rules จาก `ml/models/julian_valid_rules.json` → เขียน caption ภาษาไทย (ใส่ lift/n/p-value จริง) → บันทึก `content/inbox/<ts>_julian_<pair>.json` → อัปเดต status="done"
> 3. ถ้าไม่มี approved → รัน `node workers/julian_proposal_gen.mjs` เพิ่ม pending ใหม่ → แจ้งปีเตอร์อนุมัติ

**Tool อนุมัติ (ปีเตอร์ใช้):** `https://horatad.com/tools/admin/julian_approval.html`
**FB Post Helper:** `https://horatad.com/tools/fb_post_helper.html`
**Proposals file:** `content/julian_proposals.json` — สถานะปัจจุบัน: 3 pending / 7 skipped / 0 approved
**ดูรายละเอียด workflow:** `handoffs/JULIAN_20260528_v5.md` → section FB CONTENT PIPELINE

### Next (รอ data)
- [ ] รัน `node workers/julian_blind_test.mjs --era --country` เมื่อ events ครบ
- [ ] อัปเดต report section 6 ด้วยผลจริงจาก blind test
- [ ] ตรวจ genealogy/succession/images index หลัง backfill workflow รัน
- [ ] **ประมวลผล approved proposals** → FB content (ดู section FB Content Pipeline)

### Blocked (รอ user/อื่น)
- [ ] ⭐ **BIBLE session**: apply SU×SA 16 rules → empirical_p ใน kb.json (ลบ MR×MR ก่อน)
- [ ] ⭐ **Events workflow** รันให้ครบ (704/1331 — auto 4x/day)
- [ ] ⭐ **เปิด `tools/julian_seed_input.html`** กรอก records accuracy A/B/C
- [ ] ⭐ **อนุมัติ proposals** ที่ `tools/julian_approval.html` → JULIAN ค่อยประมวลผล

### Handoff ล่าสุด
`handoffs/JULIAN_20260528_v4.md`

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

### 📣 Facebook Content Strategy (บันทึก 2026-05-28 — เตือนทุก session)

> ⚠️ Claude: ตรวจสอบ content/posted/ ว่ามีโพสต์วันนี้หรือไม่ ถ้าไม่มีแจ้ง user ทุกครั้งที่ session เริ่ม

**Page:** โหราทาส AI (Facebook)
**ชื่อ public ไม่เชื่อมกับ user account** — เปิด page mode ก่อนโพสต์เสมอ

#### กลยุทธ์ (ทำตามลำดับนี้)
1. **ขั้นแรก: YouTube → FB repurpose** (เนื้อหามีอยู่แล้ว ไม่ต้องสร้างใหม่)
   - 1 clip YouTube = 4 FB posts:
     - **Reels** — highlight 60 วินาที น่าสนใจที่สุด
     - **Key lesson** — สรุปสิ่งที่เรียนรู้ในคลิป (text + ภาพนิ่ง)
     - **JULIAN data support** — ข้อมูลสถิติ empirical สนับสนุนประเด็นนั้น
     - **Debate question** — ตั้งคำถามชวนถกเถียง / ให้คนตอบในคอมเมนต์
2. **JULIAN findings post** (unique differentiator — ไม่มีใครทำ) 1-2 ครั้ง/สัปดาห์
   - ภาพผลวิจัย + อธิบาย plain language
3. **บทความ** — ใช้เมื่อ JULIAN มี finding ใหม่หรืออธิบาย TALS concept ซับซ้อน

#### ความถี่เป้าหมาย
- YouTube content → FB: เมื่อมีคลิปใหม่ (2x/สัปดาห์ถ้ามี)
- JULIAN findings: 1-2x/สัปดาห์
- รวม: ≥3 โพสต์/สัปดาห์ = algorithm เห็นบ่อยพอ

#### Best Practice — ไม่ผิดกฎ FB + เพิ่ม reach
- **ห้ามซื้อ like / follower** — กฎ FB ชัด
- ใช้ Reels บ่อยที่สุด — FB ดัน organic reach Reels มากกว่า link/text
- ภาพทุกโพสต์ต้องมี — text-only ถูกกดต่ำกว่า
- โพสต์ช่วง 19:00-21:00 ICT (prime time คนไทย) หรือ 08:00-09:00
- ตอบ comment เร็ว (ใน 1 ชม.แรก) — FB ดู engagement ชั่วโมงแรก
- **อย่า link out ทุกโพสต์** — FB กดโพสต์มี external link มาก ใส่ลิงค์ใน comment แทน
- cross-post ใน group โหราศาสตร์ที่เกี่ยวข้อง (ขออนุญาต admin ก่อน)

#### Workflow อัตโนมัติที่ตั้งแล้ว
- Google Drive `_FB&Social` folder → Apps Script sync → `content/inbox/` (GitHub) → daily at 08:00 ICT
- `content_curator.yml` (cron 08:00 ICT) → เลือก top 1/วัน → `content/scheduled/` (มี FB hygiene gate กัน engagement-bait แล้ว — 2026-05-29)
- **Phase 3 (auto-post Meta API) ยังไม่พร้อม** — รอ page มี follower + Meta App Review
- ระหว่างนี้ใช้ **manual loop ที่ปิด loop แล้ว** (2026-05-29): `tools/fb_post_helper.html`
  → ใส่ Classic PAT (optional) → ปุ่ม "โพสต์แล้ว" ย้ายไฟล์ `scheduled → posted` จริง
  → คิวไม่ค้างซ้ำ + curator diversity check (อ่าน posted/) ทำงานได้จริง
  → ไม่ใส่ PAT ก็ใช้ได้ แต่จดสถานะแค่ localStorage เครื่องนั้น

#### Claude checklist (ตรวจทุก session)
```
[ ] content/inbox/ มีไฟล์รอ curate ไหม?
[ ] content/scheduled/ มีโพสต์ที่ยังไม่ได้ post ไหม?
[ ] โพสต์ล่าสุดใน content/posted/ วันที่เท่าไหร่?
[ ] ถ้าเกิน 3 วันไม่มีโพสต์ → แจ้ง user ทันที
```

### Handoff ล่าสุด
`handoffs/PLATFORM_20260529_v1.md`

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
- [ ] [ทดลองใช้] ⭐ รัน Lighthouse mobile + desktop บน horatad.com → save to `docs/cia/lighthouse_*` (R-08) — **checklist: `docs/admin/USER_TASKS_lighthouse_csp_2026-05-24.md` Part 1**
- [ ] [ทดลองใช้] ⭐ collect CSP violations จาก browser console (1 wk หลัง 2026-05-23) — **checklist: same file Part 2**
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

## REORG — Docs Cleanup ✅ CLOSED (2026-05-23)
**เป้าหมาย:** ลด docs จาก 12 → 8 ไฟล์ — ✅ บรรลุแล้ว

งานที่เหลือ (ESLint setup) โอนไป **BIG** แล้ว — ดู `handoffs/BIG_20260523_v1.md`

> Trim CLAUDE.md ✅ done 2026-05-23 HORATAD session — 4 จุด HORATAD-specific generalized + Session Tips section ใน docs/HORATAD.md (BIG handoff should mark complete)

---

## Quick Reference

| Project | Version | ไฟล์หลัก | สถานะ |
|---|---|---|---|
| Horatad PWA | HORATAD V3.3.31 | script.js, v3/*, index.html | 🟡 Pre-launch — M1-M6 ✅ + KB extract -49% + voice-chat + BGM |
| Wording Engine | BIBLE KB V2.3.0 | v3/kb.json, v3/interpretation.js, tools/kb_reviewer.html | 🟢 Active — รอ review |
| Empirical DB | JULIAN 53,148/100,000 | workers/julian_scraper.mjs, workers/julian_seed_merge.mjs, tools/julian_seed_input.html | 🟢 Automation + manual seed tool ready |
| Voice TTS | NOK Phase 1 | v3/tts.js (in HORATAD frontend) | 🟢 Deployed — รอ mobile test |
| Platform/Academy | PLATFORM | (ยังไม่มีไฟล์) | 🔲 Vision |
| Security + Perf | GUARD Phase 1 6/7 done | docs/GUARD_MISSION.md + docs/cia/* + docs/SECRETS.md + _headers + auth-pin.js | 🟢 P1-A/B/C/D/F/G ✅ — P1-E blocked on user |
| Docs cleanup | REORG | — | ✅ CLOSED — โอน ESLint + Trim CLAUDE.md → BIG |

---

## วิธีเริ่ม session ใหม่
1. บอก Claude ว่า session นี้เป็น project อะไร: **HORATAD / BIBLE / JULIAN / NOK / PLATFORM / GUARD / BIG**
2. Claude อ่าน `ECOSYSTEM.md` (ภาพรวม) → `PROJECT_STATUS.md` (งาน) → `handoffs/<PROJECT>_*.md` ล่าสุด
3. Cross-project request → Claude บันทึกใน handoff project ปลายทาง ไม่ทำใน session นี้

---
*อัปเดตล่าสุด: 2026-05-29 BIG session 1 | HORATAD V3.3.34 | handoffs/BIG_20260529_v1.md*
