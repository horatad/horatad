# Changelog — Horatad

รุ่นใหม่อยู่บนสุด · ดูโค้ดที่ [horatad/horatad](https://github.com/horatad/horatad)

---

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
