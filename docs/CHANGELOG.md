# Changelog — Horatad

รุ่นใหม่อยู่บนสุด · ดูโค้ดที่ [horatad/horatad](https://github.com/horatad/horatad)

---

## [3.3.23] — 2026-05-23
### Changed
- HORATAD Phase 2 Step 0: extract `KB_RULES` (198KB inline) → `v3/kb_embedded.json` — script.js 393KB→199KB (-49%)
  - KB loaded async via `_loadEmbeddedKB()` after init — non-blocking initial render
  - Guards intact: `_matchRules()` + `openInterpretation()` short-circuit if KB not loaded yet
  - SW caches `v3/kb_embedded.json` separately → KB updates ไม่ bust script.js cache
  - net wire bytes unchanged (~+1KB) แต่ initial parse + cache isolation ดีขึ้น

## [3.3.22] — 2026-05-23
### Added
- HORATAD: M6 — localStorage persist `_synastryIdx`/`_eventIdx`/`_transitCursor` → refresh แล้วยังอยู่ตำแหน่งเดิม
- HORATAD: `_tsCalc()` sync `_transitCursor` ทันทีเมื่อกด "คำนวณจร"
- HORATAD: `_updateNavHeader()` รองรับ `compareMode===3` — แสดง "จร · d/m/y · t" จาก `_transitCursor`

## [3.3.21] — 2026-05-22
### Added
- HORATAD: M5 — eventChart full support, `_compareMode===2` path, `cycleMemory` `_eventIdx`, `_updateNavHeader` compareMode-aware

## [3.3.20] — 2026-05-22
### Changed
- HORATAD: M4 — rename `natal1`→`natal`, `natal2`→`synastry` ทั้งไฟล์ (63 occurrences)

## [3.3.19] — 2026-05-22
### Added
- HORATAD: M3 transit unit popup (fixed+planet) + sign-change algorithm + cursor helpers (_tsCalcMode, _transitCursor, _transitUnit)

## [3.3.18] — 2026-05-22
### Added
- HORATAD: M1+M2 chart redesign — state vars (_compareMode, _outerDisplay, _transitCursor, _transitUnit) + synastry/eventChart/transit buffers + T1/T2 toggle buttons ใน chart-nav-header

## [3.3.17] — 2026-05-22
### Added
- HORATAD: memory modal UX redesign (แท็บ QR / ส่วนตัว / JULIAN) + ดวงนอก/จร toggle button + sort controls

## [3.3.16] — 2026-05-22
### Added
- HORATAD: 3-tank memory system — แยก storage ชัดเจน (ส่วนตัว / QR / JULIAN) + tab UI + dedup dialog สำหรับ record ที่ซ้ำกัน

## [3.3.15] — 2026-05-22
### Added
- NOK: TTS guide modal แทนปุ่ม disabled เมื่อไม่มี Thai voice — แนะนำขั้นตอน iOS/Android/Desktop

## [3.3.14] — 2026-05-22
### Fixed
- NOK: lstrip per-line + hard-split fallback (ทุก 200 chars) สำหรับข้อความพยากรณ์ยาวที่ไม่มี sentence boundary

## [3.3.13] — 2026-05-22
### Added
- NOK Phase 1: ปุ่ม 🔊 ฟังคำพยากรณ์ใน V3 tab — Web Speech API (tts.js) พร้อม speak/stop/preload/hasThaiVoice

## [3.3.12] — 2026-05-21
### Fixed
- HORATAD: JULIAN download 404 — สร้าง placeholder `data/julian_all.json` + ปรับ empty message user-friendly

## [3.3.11] — 2026-05-21
### Fixed
- HORATAD: QR ใน capture — bundle qrcode.min.js local (ไม่พึ่ง CDN), fix qrDiv position, เพิ่ม toast บอก save location

## [3.3.10] — 2026-05-21
### Changed
- HORATAD: ลบ section ปรัชญาการพัฒนาออกจากหน้าเกี่ยวกับ + about page full-screen layout

## [3.3.9] — 2026-05-21
### Fixed
- HORATAD: JULIAN URL → raw.githubusercontent (CORS-free), ปิด autofocus search, swap transit fn, lunar content restore (5 fixes batch)

## [3.3.8] — 2026-05-21
### Added/Changed
- HORATAD: 8 changes batch — import choice dialog, DB1 sort controls, pin auth fix, tag delete, toggle buttons, nav view button, lunar section cleanup

## [3.3.7] — 2026-05-21
### Fixed
- HORATAD: memory modal ใช้ dvh แทน vh — keyboard บนมือถือไม่บัง Export/Import/ปิด buttons

## [3.3.5] — 2026-05-21
### Added
- BIBLE: rule numbers display + natal/transit toggle + simplified input panel ใน tools/kb_reviewer.html

## [3.3.4] — 2026-05-21
### Added
- HORATAD: V3 tab — 3-panel view (กฎ / Input Typhoon / Output) แทน single-panel

## [3.3.3] — 2026-05-21
### Fixed
- BIBLE: match_rules() — house_lord_of (dynamic เจ้าเรือน), REFERENCE filter ออกจาก output, planet_id=0 bug

## [3.3.2] — 2026-05-21
### Added
- BIBLE: house context map + tagged phrase cluster prompt สำหรับ LLM wording generation

## [3.3.1] — 2026-05-21
### Added
- HORATAD: wire M8 compose_local_prediction → v3tab.js (✅/⚠️/📋 grouped display แทน render_fallback)

## [3.3.0] — 2026-05-21
### Added
- HORATAD: M8 keyword composition engine (compose_local_prediction + compose_summary_text) ใน v3/interpretation.js
- HORATAD: M7 empirical schema fields (empirical_p, empirical_n, empirical_refs, secondary_obs) + rule skeleton generator
- HORATAD: v3/kb_skeletons.json — 90 skeletons สำหรับ planet×quality combinations ที่ขาดกฎ

## [3.2.9] — 2026-05-21
### Added
- HORATAD: M1 structured JSON output (rule_id validation) + M2 conditions-based match_rules() + M3 multi-LLM benchmark framework

## [3.2.8] — 2026-05-20
### Changed
- HORATAD: kb.json V2.1 — รวม 2 Typhoon fill rounds → 284/342 conditions[] (83% coverage)

## [3.2.7] — 2026-05-20
### Added
- HORATAD: kb.json V2 — 342 rules พร้อม conditions[] จาก Typhoon (83% coverage, 284/342 rules)

## [3.2.6] — 2026-05-20
### Added
- ปรัชญาการพัฒนา (Development Philosophy): Simple / Friendly / UX / Fast
  - เพิ่มใน CLAUDE.md: guideline + commit checklist + conflict priority (Fast>Simple>UX>Friendly)
  - เพิ่ม rule #6 token efficiency: concept/analysis → text ก่อน tool เสมอ
  - แสดงใน About page — section "ปรัชญาการพัฒนา" ด้านล่าง feature list (CSS grid warm tone)

## [3.2.5] — 2026-05-20
### Fixed
- PWA offline: เพิ่ม `horatad_746x746.png` ใน CORE_ASSETS → หน้า About แสดงรูปได้ offline
- PWA cache: ลบ `horatad_500x500.png` ออก (ไม่มีการอ้างอิง — ประหยัด cache)

## [3.2.4] — 2026-05-20
### Added
- Phase 14: Group → โหลด / เปรียบเทียบสมาชิก
  - member row ใน group detail: ปุ่ม "โหลด" (natal1) + "เปรียบ" (natal2/สมพงศ์) + "ออก"
  - โหลด: ปิด group popup → โหลดดวงสมาชิกเป็น natal1 → chart view
  - เปรียบ: โหลดสมาชิกเป็น natal2 → สมพงศ์ mode (ต้องมี natal1 ก่อน)
- Phase 15: Transit Strip improvements
  - ปุ่ม "วันนี้": reset date inputs → วันนี้ → คำนวณใหม่
  - Persist transit date ใน localStorage (horatad_ts_date_v1)
  - Restore date ข้าม session เมื่อเปิดดวงใหม่ (ถ้าไม่มีใน localStorage ใช้วันนี้)

## [3.2.3] — 2026-05-20
### Added
- Phase 13: Transit Strip — ควบคุมดวงจรโดยตรงใต้แผนผัง (ไม่ต้องสลับ TAB)
  - แสดงเมื่อผูกดวง 1 แล้ว — ซ่อนเมื่อยังไม่มีดวง
  - toggle "จร แสดง/ซ่อน": เปิด/ปิดส่วนดวงจรในรายงาน
  - date inputs (วัน/เดือน/ปี/เวลา) default = วันนี้
  - Events dropdown: กรองเฉพาะเหตุการณ์ที่ linked กับ natal1 (DB1)
  - เลือก event → โหลดวันที่ event → คำนวณดวงจรอัตโนมัติ
  - ปุ่ม "คำนวณจร": คำนวณดวงจรจาก strip inputs → อัปเดตแผนผัง

## [3.2.2] — 2026-05-20
### Added
- Phase 12: Group UI — สร้าง/แก้ไข/ลบ group records ใน unified DB V4
  - ⚙️ → 👥 กลุ่ม → list view: สร้างกลุ่มใหม่ (ชื่อ + Enter/ปุ่มสร้าง), ดู detail, ลบ
  - Detail view: แสดง member list, เพิ่มสมาชิก (Natal Picker popup), เอาออก, ← กลับ
  - Natal Picker: ค้นหา + เลือกดวงจาก DB1 — exclude existing members อัตโนมัติ
- DB1 browser แยก type: tab filter ดวง / บุคคล / เหตุการณ์ / กลุ่ม
  - ดวง (natal): load, edit, delete (เดิม)
  - บุคคล/เหตุการณ์: แสดง linked natal, delete
  - กลุ่ม: แสดง member count, ดู detail (เปิด group popup), delete

## [3.2.1] — 2026-05-20
### Added
- นำเข้าดวงจากรูป: ปุ่ม "📷 เลือกรูปดวง" ใน QR import modal → อ่าน QR จากรูปอัตโนมัติ
  (BarcodeDetector native < 5ms + jsQR fallback universal)
- H2 QR format: HMAC-SHA256 (8 hex) ยืนยัน QR มาจาก Horatad
  H1 เก่า → รับได้พร้อม warning / H2 HMAC ผิด → reject
- 💾 บันทึก บนมือถือ → Web Share API (เลือก "บันทึกรูปภาพ" → Photos โดยตรง ไม่มี folder picker)
### Changed
- _copyShareURL: ออก H2 แทน H1
- URL param ?h=: รองรับ H1 + H2 พร้อม async HMAC verify

## [3.2.0] — 2026-05-20
### Changed (Breaking — DB Architecture)
- รวม DB1/DB2/BUFFER/EVENT_SLOTS → unified `horatad_db_v4` (localStorage key เดียว)
- เพิ่ม `type` field: `'natal'|'person'|'event'|'group'` บนทุก record
- ลบ bidirectional link (`linkedEvents[]`) ออกจาก natal — ใช้ `linkedNatalUid` บน child เป็น source of truth เดียว
- `group` record มี `memberUids[]` — natal ไม่รู้ว่าตัวเองอยู่ group ไหน (ค้น O(n) ผ่าน group)
- migration อัตโนมัติจาก V3 → V4 เมื่อโหลดครั้งแรก (preserve data เดิม)
- ลบ cap 10 ออกจาก buffer/event slots
- export/import รองรับ format ใหม่ + backward compat กับ format เก่า (db1[]+eventSlots[])
### Added
- `_dbPersons(linkedNatalUid?)` / `_dbEvents(linkedNatalUid?)` / `_dbGroups()` helpers
- `_dbUpsert(rec)` / `_dbFind(uid)` / `_dbRemove(uid)` core CRUD

## [3.1.7] — 2026-05-20
### Fixed (logic flow audit)
- report transit: เมื่อเปิดดวงจร แสดง natal1 + "ดาวจรสัมพันธ์ ณ" แทนดาวจรล้วนๆ
- `_editingUid` ค้าง: clear edit mode อัตโนมัติเมื่อกด ผูกดวง 2 ขณะอยู่ใน edit mode
- `_openCreateEventModal`: แจ้ง toast ถ้า natal1 ยังไม่ได้ผูกดวง (แต่ยังเปิด modal ได้)
- `_db1Load`: ลบ `_updateLinkedEventsDisplay()` ซ้ำ (เรียกผ่าน `_redraw` แล้ว)
- `_importDB`: แสดง warning เมื่อ eventSlots มี linkedNatalUid ที่ไม่อยู่ใน DB1

## [3.1.6] — 2026-05-20
### Fixed
- จอกระพริบ/reload ซ้ำ: รวม trigger เป็นจุดเดียว (ตัวเลือก A)
  version.json mismatch → reg.update() → รอ controllerchange → reload ครั้งเดียว
  controllerchange ไม่ reload เองถ้า version ตรงกัน
### Changed (UX + Accessibility)
- label `for=` เชื่อมทุก input ในฟอร์ม (ดวง 1, ดวง 2, วันจร) — screen reader + tap-label
- `inputmode="numeric"` บน input วัน/เดือน/ปี — keyboard ตัวเลขล้วนบน iOS/Android
- touch target ขั้นต่ำ 44px: btn-era, btn-mem, btn-clear-form
- modal desktop wider: memory-modal 380→480px, main-menu-modal 320→400px
- about page max-width 480→640px (desktop โล่งขึ้น)
- brand-ver contrast: #999→#666 (contrast AA ผ่าน)
### Added
- og:title, og:description, og:image, og:url meta tags
- twitter:card, twitter:title, twitter:description, twitter:image meta tags

## [3.1.5] — 2026-05-20
### Fixed
- หน้าเกี่ยวกับ: แก้ข้อความ "ข้อมูลของคุณอยู่ในเครื่องเท่านั้น" → ครบถ้วนกว่า
  เพิ่ม "ไม่มี tracking" + disclaimer ฟีเจอร์ AI พยากรณ์ส่งตำแหน่งดาวไปยัง server

## [3.1.4] — 2026-05-20
### Added
- `_db1Edit(uid)`: โหลด record จาก DB1 กลับฟอร์ม 1 + set `_editingUid` (Phase 10)
- indicator แถบส้ม "✏️ กำลังแก้ไข: [ชื่อ]" เหนือปุ่ม ผูกดวง (กดยกเลิกได้)
- `_v3UpsertDB1`: รองรับ `_editingUid` — ลบ record เดิมก่อน upsert ใหม่ (รองรับเปลี่ยนชื่อ/วัน/เวลา พร้อมสืบ linkedEvents)
- ปุ่ม ✏️ ใน DB1 browser list ข้าง ลบ
- `_hideEditingIndicator()`, `_showEditingIndicator(name)`

## [3.1.3] — 2026-05-20
### Added
- `_openDB1Popup()` / `_closeDB1Popup()` / `_renderDB1List()`: popup แสดง DB1 ทั้งหมด (Phase 9)
- ค้นหาชื่อ real-time ใน DB1 popup (input filter)
- `_db1Load(uid)`: โหลด record จาก DB1 เป็น natal1 ทันที (ไม่ต้องกรอกฟอร์มใหม่)
- `_db1Delete(uid)`: ลบ record ออกจาก DB1 (มี confirm dialog)
- badge 🔗N ใน list แสดงจำนวน linkedEvents ของแต่ละ record
- ⚙️ menu row "🗂️ ดาวดวง" + count badge (N ›) อัปเดต real-time

## [3.1.2] — 2026-05-20
### Added
- `_exportDB()`: ดาวน์โหลด DB1 + event slots เป็น JSON (Phase 8)
- `_importDB(file)`: merge JSON กลับเข้า DB1 + event slots (upsert by uid, ไม่ลบของเดิม)
- export-modal ใน ⚙️ menu row "📦 ส่งออก/นำเข้า" — ปุ่มส่งออก + ปุ่ม label นำเข้า
- import result summary แสดงใน modal: "ดวง +N, เหตุการณ์ +M"

## [3.1.1] — 2026-05-20
### Added
- `_v3UpsertDB1(rec)`: content-based upsert DB1 (key=name|d/m/y_be|t) — เก็บ uid+linkedEvents เดิมถ้าผูกดวงซ้ำ (Phase 6)
- `calculateChart1` → auto-upsert natal1 ลง DB1 ทุกครั้ง — uid persistent ข้าม session
- `_updateLinkedEventsDisplay` match ด้วย uid (primary) + name fallback (compat)
- event-create-modal: form สร้างเหตุการณ์ใหม่ (ชื่อ + วัน/เดือน/ปี/เวลา + เชื่อมกับดวง) (Phase 7)
- `_openCreateEventModal()`, `_closeCreateEventModal()`, `_populateNatalLinkSelect()`, `_submitCreateEvent()`
- bidirectional link: event.linkedNatalUid ↔ natal.linkedEvents[] บันทึกพร้อมกัน
- "+ สร้างใหม่" button ใน event-slots-modal → เปิด event-create-modal

## [3.1.0] — 2026-05-20
### Added
- `_copyImportUrl()`: สร้าง import URL จาก natal1 → copy ไปคลิปบอร์ด
- "📋 คัดลอก URL" row ใน ⚙️ menu — แชร์ลิงก์นำเข้าผ่าน LINE/chat แทน QR

## [3.0.9] — 2026-05-20
### Changed
- QR payload เปลี่ยนจาก plain `H1|...` → URL `https://horatad.github.io/horatad/?h=H1|...`
- สแกน QR → browser เปิด app → URL param `?h=` → auto-import ทันที (ไม่ต้อง paste)

## [3.0.8] — 2026-05-20
### Added
- `_jdToGregorian()`: reverse custom JD → CE date (offset +1721117)
- `_latLngToProv()`: nearest province lookup by Euclidean distance
- `_parseH1Payload()`: parse `H1|jd|t|lat|lng|g|nm` หรือ URL `?h=H1|...`
- `_doQRImport()`: paste textarea → parse → fill form 1 → calculateChart1()
- URL param auto-import: `?h=H1|...` ตอน DOMContentLoaded → import ทันที
- "นำเข้า QR" row ใน ⚙️ menu + qr-import-modal popup

## [3.0.7] — 2026-05-20
### Added
- tag-row-1 ใน transit mode (`_reportTransitShow=true`) → แสดง linked event chips แทน category chips
- คลิก chip → load event เป็น natal2 (viewMode=1)
- "+ เหตุการณ์" chip → open event slots popup
- `_eventSlotLoadByUid(uid)`: helper โหลด event จาก uid
- `tag-event-chip` CSS class (สีม่วง border/text) แยก visual จาก category chip
- toggle transit / save / delete event → refresh tag-row-1 อัตโนมัติ

## [3.0.6] — 2026-05-20
### Added
- "เหตุการณ์" row ใน ⚙️ menu — แสดง N/10 count
- event-slots-modal popup: แสดง slot list, โหลด event เป็น natal2, ลบ
- `_eventSlotSaveCurrent()`: บันทึก `_chart2` → EVENT_SLOTS_KEY + link natal1.name
- `_eventSlotLoad(idx)`: โหลด event → natal2 + switchTo viewMode=1
- `_updateLinkedEventsDisplay()`: แสดง linked events ใน report panel (TAB 1)

## [3.0.5] — 2026-05-20
### Changed
- Rename vars สำหรับ semantic clarity: `_natal` → `natal1`, `_natal2` → `natal2`, `_transit` → `_chart2`
- `getNatal()` ยังคงชื่อเดิม (v3tab.js ES module compat)

## [3.0.4] — 2026-05-20
### Added
- `cycleMemory()`: viewMode=0 → cycle MEM_KEY (ดวงใน), viewMode=1 → cycle buffer (สมพงศ์)
- `calculateChart2()` → auto-save to buffer ถ้าไม่ซ้ำ + set natal2 ทันที
- `_updateNavHeader()`: viewMode=1 → แสดง "[นอก] name·date (i/N buffer)"

## [3.0.3] — 2026-05-20
### Added
- ⚙️ menu: มุมมอง (toggle ดวงใน/นอก), เหตุการณ์จร (toggle), สมพงศ์ (N/10)
- `_updateMainMenuState()`, `_toggleViewFromMenu()`, `_toggleTransitFromMenu()`
- สมพงศ์ popup: แสดง buffer slots, load/delete/new
- ESC ปิด sompong popup

## [3.0.2] — 2026-05-20
### Added
- `#chart-nav-header` strip (◀ name·date ▶ ⚙️) แสดงเหนือ canvas เมื่อมีดวง
- ซ่อน `#btn-chart-row` (แทนที่ด้วย header strip)
- `#main-menu-backdrop` + `#main-menu-modal` skeleton
- `_updateNavHeader()`, `_openMainMenu()`, `_closeMainMenu()`
- ESC ปิด main menu

## [3.0.1] — 2026-05-20
### Changed
- ซ่อน section-transit ใน TAB 0 (วันที่จร input)
- ซ่อน TAB 1 buttons: btn-view, btn-outer, btn-chart-type, btn-transit → จะย้ายเข้า ⚙️ menu
- ◀▶ navigator คงไว้ (cycle DB1)

## [3.0.0] — 2026-05-20
### Added (Phase 1A — foundation, no UI change)
- Uniform schema: uid, name, gender, d/m/y/t, prov, lat, lng, jd, pos, vel, savedAt, linkedEvents, linkedNatal
- localStorage keys ใหม่: `horatad_db1_v3`, `horatad_db2_v3`, `horatad_buffer_v3`, `horatad_event_slots_v3`
- Schema migration: ล้าง `horatad_memory_v1` + `horatad_events_v1` (BREAKING — user confirmed)
- Toast notice 1 ครั้งหลัง migrate
- Storage helpers: `_v3Record`, `_v3Load/Save/Add/Find/Remove` (DB1/DB2), buffer, event slots, bidirectional link

---

## [2.2.43] — 2026-05-17
### Changed
- QR payload: เปลี่ยนจาก PROV string (~40 bytes) → LAT|LNG (~12 bytes)
- Format ใหม่: `H1|JD|T|LAT|LNG|G|NAME`

## [2.2.42] — 2026-05-17
### Fixed
- QR overflow "code length overflow" — Thai UTF-8 (3 bytes/char) ทำ payload โต
- ลด correctLevel H → M

## [2.2.41] — 2026-05-17
### Changed
- Share image: logo 180→200, QR ขยาย 125→250
- QR payload ใหม่: `H1|JD|T|PROV|LNG|G|NAME`

## [2.2.40] — 2026-05-17
### Changed
- Refactor: factor `calculateChart1/2` → `_calcChart(num)` + `_CHART_CFG` table (ลด duplicate ~35 บรรทัด)

## [2.2.39]
### Fixed
- expose `window.APP_VERSION` ให้ v3tab.js (ES module) สร้าง cache-bust query สำหรับ kb.json

## [2.2.38]
### Added (req 20)
- ปุ่ม ✏️ แก้ไขใน memory list — โหลด record กลับเข้าฟอร์ม + ตั้งสถานะ "กำลังแก้ไข"
- `_addMemory` รับ optional `replaceKey` เพื่อ remove record เดิมพร้อม dedup

## [2.2.37]
### Fixed
- 📌 DB indicator ไม่อัปเดตเมื่อกด numpad commit — เรียก `_updateDbIndicator()` ท้าย `_numpadConfirm()`
- เพิ่ม `change` listener ใน `_wireDbIndicatorListeners` (iOS Safari `<input type="time">` quirk)

## [2.2.36]
### Fixed
- ลบ duplicate `controllerchange` listener ใน index.html (ต้นเหตุ reload loop / จอกระพริบ)
### Added
- ปุ่ม "✕ ออกจากพยากรณ์" บน TAB 3 → `_v3Exit()`

## [2.2.35]
### Security
- PIN validation ย้ายไป Cloudflare Worker `horatad-auth`
- ลบ hardcoded PIN จาก index.html

## [2.2.34]
### Added
- Tag rows (4/chart): DEFAULT_TAGS + custom tags (CUSTOM_TAGS_KEY)
- Max 4 groups/chart, toggle auto-save groups เข้า MEM_KEY entry
- "เพิ่ม" modal → custom tag

## [2.2.33]
### Added
- ปุ่ม Clear form 🗑️ + DB indicator 📌
- `_updateDbIndicator()`, `_wireDbIndicatorListeners()`

## [2.2.32]
### Added
- `showAlert(msg,type)` / `closeAlert()` popup helpers (tap-backdrop-to-close, CSS blink)

## [2.2.31]
### Changed
- Share image layout overhaul: QR bottom-left 125×125, right column 4 lines, score center 64px

## [2.2.30]
### Added
- `HORATAD:SCRIPT` identity header, `APP_VERSION` constant
- SW register + `updateViaCache:'none'` + 1hr poll
- `version.json` fetch check → reload ถ้า version mismatch

## [2.2.29]
### Changed
- Share filename: ตัด prefix → `JD_T_LAT.png`
- QR size 110→125

## [2.2.26]
### Fixed
- Adhikamasa: เปลี่ยน formula จาก totalLunations diff → avoman threshold

## [2.2.25]
### Fixed
- Adhikavara: เปลี่ยนจาก lookup table → formula + override ปี 2568

## [2.2.24]
### Changed
- ทำนายจาก natal1 เสมอ (ไม่ขึ้น viewMode), long-press 1s, shutter sound max

## [2.2.23]
### Added
- Memory list, JD+lat, sort, sound 6 levels, long-press name

## [2.2.16]
### Fixed
- Adhikavara: เปลี่ยนจาก formula → lookup table จาก myhora

## [2.2.15]
### Fixed
- Adhikavara: เดือน 7 full/hollow, hollow month boundary

## [2.2.14]
### Fixed
- Tithi via avoman (not Y_MON/longitude), dawn ref 06:00

## [2.2.13]
### Fixed
- Adhikamasa: lunar month uses lunation count (not sun longitude)

## [2.2.0]
### Fixed
- ลบ logo overlay ซ้ำซ้อนใน share image
- outer label สี unified
- canvas/report bg คงที่
### Added
- prov sound (`_playBeep` เมื่อเลือกจังหวัด)

## [2.1.9]
### Fixed
- pre-2484 warning: แสดงเฉพาะ buf.length===4
- lunar info refresh on transit toggle
- time input width mobile (CSS grid)
### Added
- Split save/share: `saveChart()` = download, `shareChart()` = Web Share API
- Keyboard sound (Web Audio), numpad validate (3 strikes → revert)
- Memory cycle ◀▶, memory sort (🕐/ก-ฮ/ฮ-ก), About logo 746, long-press delete

## [2.1.8]
### Changed
- Labels: OUTER, REPORT_TRANSIT, CHART_TYPE ปรับชื่อ
- `calculateTransit`: เพิ่ม vel calc
- `_redraw`: branch transit mode → render transit table

## [2.1.7]
### Changed
- Logo size 160, ราศี font 30px

## [2.1.6]
### Changed
- Logo: source `horatad_500x500.png`, alpha 1.0, filter brightness+saturate

## [2.1.5]
### Added
- SW `controllerchange` listener → auto-reload เมื่อ SW ใหม่ activate

## [2.1.4]
### Fixed
- Thai font fallback (Noto Sans Thai + Tahoma) สำหรับ mobile webview

## [2.1.3]
### Changed
- Logo: source 746×746, size 240, top-right corner, circular clip, alpha 0.70

## [2.0]
### Added
- Share as Image (1080×1080 PNG, Web Share API + fallback download)

## [1.9]
### Fixed / Added
- Memory icon long-press bug fix, Esc closes modals, prov empty state
- Time fields → `type="time"` native, year smart prefix (BE 25xx / CE 20xx)
- lng numpad left-to-right, debounced save

## [1.8]
### Added
- localStorage persist (state + memory list 10)
- Long-press name → memory popup, beforeunload safety

## [1.7]
### Added / Fixed
- Searchable prov dropdown, "สถานที่อื่น" label
- numpad backspace → clear all

## [1.6]
### Added / Changed
- Canvas identity (gender+name+dmy+time+prov top-left)
- Logo 168 closer to corner, cleanup dead code

## [1.5]
### Changed
- Canvas logo: top-right, size 140

## [1.4]
### Changed
- Unified "ผูกดวง" button (calc 1+2), removed individual section buttons

## [1.3]
### Added
- Gender prefix in report header (ดวงชาย/หญิง/เหตุการณ์)

## [1.2]
### Fixed
- Mobile prov `scrollIntoView` (datalist visible above keyboard)

## [1.1]
### Added / Fixed
- `calculateSmart`, lng toggle, CHART_TYPE_LABELS, transit self-ref fix
- startup viewMode=0, transit arabic 44px, ดวงที่2 bg purple
- Thai lunar numerals, transit for both views, ดาวจรสัมพันธ์ ณ
