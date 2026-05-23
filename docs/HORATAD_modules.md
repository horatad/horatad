# HORATAD — Module Boundary Audit (Phase 2 prep)

**Owner:** HORATAD | **Status:** prep doc (no code change) | **Date:** 2026-05-23
**Goal:** map functions ใน `script.js` (4,027 บรรทัด, 392KB) → proposed modules เพื่อ unblock Phase 2 code-split โดยไม่ต้อง commit architecture ทันที

---

## 1. Quick wins (ไม่ต้อง refactor — ทำได้แทบทันที)

### ⭐ KB_RULES extraction — เป้าหมายอันดับ 1
- บรรทัด 97: `const KB_RULES=[...]` = **198,571 bytes** = **49.4% ของ script.js**
- ย้ายเป็น `v3/kb_embedded.json` แล้ว fetch + cache → script.js เหลือ **~195KB**
- ผลกระทบ: SW cache แยกได้, parser เร็วขึ้น initial load, KB update ไม่ bust script.js cache
- effort: ~30 นาที — แค่ extract + เพิ่ม async loader + relay window.KB_RULES
- risk: ต้อง guard ว่า `_matchRules()` ไม่ run ก่อน KB load เสร็จ

### ⭐ PROVINCES + PROVINCES_LAT extraction
- บรรทัด 26-67 + 47-67: ~5KB รวม
- ย้ายเป็น `v3/provinces.json` (รวม lng + lat)
- ผลกระทบ: เล็กกว่า KB แต่ pattern เดียวกัน — easy

### ⭐ Astrology lookup tables extraction
- บรรทัด 76-96: Z_NAMES, H_SHORT, R_NAMES, NK_NAMES, KASET/EXALT/MAHACHAK/RACHA_MAP, etc.
- ย้ายเป็น `v3/astro_tables.json` หรือ inline ใน `core/lunar.js`
- ผลกระทบ: small (~2KB) แต่ logical grouping

---

## 2. Proposed module split (ลำดับความสำคัญจาก high → low)

### Tier 1 — Pure logic (ไม่มี DOM, แยกง่ายสุด, test ได้)
| Module | บรรทัด | Functions | LOC |
|---|---|---|---|
| `core/engine.js` | 70, 536-660 | `_calcJD`, `tr`, `get_j`, `get_pk`, `get_s`, `_core`, `get_data`, `_beToce`, `getHouse`, `getMotion`, `getStandards`, `getStrength`, `analyzePairs`, `getIdentity` | ~125 |
| `core/lunar.js` | 662-779 | `toThaiNum`, `getWeekdayTH`, `getTithi`, `getNaksatraYear`, `_h0OfCS`, `_totalLunations`, `_isAdhikamasa*`, `_isAdhikavara*`, `getLunarMonthNum`, `_getLunarMonthFixed`, `_getLunarDay`, `_nextMonth`, `buildLunarInfo` | ~117 |
| `core/varga.js` | 1230-1231 | `calcNavamsa`, `calcDrekkana` | ~2 |
| `core/transit.js` | 988-1093 | `_addHoursToCursor`, `_cursorToJD`, `_getPlanetSign`, `_recalcTransit`, `_fixedUnitToHours`, `_moveCursorByFixed`, `_transitNextSignChange` | ~105 |

**Dependencies:** Tier 1 อ่าน global state (natal, _transitCursor) แต่ไม่เขียน DOM → safe to extract first. ต้องผ่าน parameter หรือ getter

### Tier 2 — Storage layer (ไม่มี DOM, มี side-effect ที่ localStorage)
| Module | บรรทัด | Functions | LOC |
|---|---|---|---|
| `db/io.js` | 1814-1830 | `_loadJSON`, `_saveJSON` | ~16 |
| `db/tank.js` | 1831-1882 | `_tankLoad`, `_tankSave`, `_tankKey`, `_migrateSchemaV4` | ~51 |
| `db/core.js` | 1883-1916 | `_dbLoad`, `_dbSave`, `_dbFind`, `_dbRemove`, `_dbUpsert`, `_dbLoadType`, `_dbSaveType`, `_dbPersons`, `_dbEvents`, `_dbGroups`, `_v3LoadDB1`, `_v3SaveDB1`, `_v3FindDB1`, `_v3RemoveDB1`, `_v3AddDB1` | ~33 |
| `db/natal.js` | 1919-1967 | `_v3Record`, `_v3UpsertDB1`, `_v3MaybeShowMigrateNotice`, `_saveState`, `_applyState` | ~48 |
| `db/events.js` | 2457-2546 | `_loadEvents`, `_saveEvents`, `saveEvent`, `cycleEventSort`, `_renderEvents`, `openEvents`, `closeEvents`, `_pickEvent`, `_deleteEvent` | ~89 |

### Tier 3 — Render (DOM write, แต่ logic แยกได้)
| Module | บรรทัด | Functions | LOC |
|---|---|---|---|
| `render/report.js` | 780-893 | `_escHtml`, `aspectNarrativeShort`, `aspectTransit`, `buildCompareReport`, `buildReport` | ~113 |
| `render/chart.js` | 1201-1373 | `_redraw`, `drawChart`, `deg2rad`, `_applyViewMode` | ~172 |

⚠️ **XSS critical**: `_escHtml` ต้องคงในทุก module ที่ build HTML — 44 sites ใน script.js ปัจจุบัน

### Tier 4 — UI components (popups, modals — แยกตาม feature)
| Module | บรรทัด | Functions | LOC |
|---|---|---|---|
| `ui/tabs.js` | 162-198 | `switchTab`, `_applyEraStyle`, `toggleEra` | ~36 |
| `ui/inputs.js` | 199-372 | `_applyInputColors`, `_nowStr`, `reset*`, `_initSound`, `_playBeep`, `_initLongPress`, `_clearSection`, `_showToast`, `showAlert`, `closeAlert`, `clearForm`, `_updateDbIndicator`, `_wireDbIndicatorListeners` | ~173 |
| `ui/tags.js` | 387-535 | `_loadCustomTags`, `_saveCustomTags`, `_allTags`, `_renderTagRow`, `_eventSlotLoadByUid`, `_toggleTag`, `_saveTagsToMemory`, `_openAddTagModal`, `_closeAddTagModal`, `_submitAddTag`, `_deleteCustomTag`, `_loadTagsForCurrentChart` | ~148 |
| `ui/view-mode.js` | 920-987 | `toggleView`, `toggleOuterView`, `cycleCompareMode`, `cycleOuterDisplay` | ~67 |
| `ui/transit-unit-popup.js` | 1070-1093 | `_openTransitUnitPopup`, `_closeTransitUnitPopup`, `_setTransitUnit` | ~23 |
| `ui/transit-cursor.js` | 1098-1198 | `toggleChartType`, `toggleReportTransit`, `cycleMemory`, `_updateLinkedEventsDisplay` | ~100 |
| `ui/nav-header.js` | 2604-2647 | `_updateNavHeader` | ~43 |
| `ui/main-menu.js` | 2649-2680 | `_updateMainMenuState`, `_openMainMenu`, `_closeMainMenu`, `_toggleViewFromMenu`, `_toggleTransitFromMenu` | ~31 |
| `ui/sompong-popup.js` | 2681-2747 | `_toggleSompongInput`, `_openSompongPopup`, `_closeSompongPopup`, `_renderSompongList`, `_sompongLoadByUid`, `_sompongDeleteByUid`, `_sompongNew` | ~66 |
| `ui/event-slots-popup.js` | 2748-2820 | `_openEventSlotsPopup`, `_closeEventSlotsPopup`, `_renderEventSlotsList`, `_eventSlotLoadRecord`, `_eventSlotDeleteByUid`, `_eventSlotSaveCurrent` | ~72 |
| `ui/event-create.js` | 2821-2875 | `_openCreateEventModal`, `_closeCreateEventModal`, `_populateNatalLinkSelect`, `_submitCreateEvent` | ~54 |
| `ui/memory.js` | 2003-2456 | `_addMemory`, `_updateSortBtns`, `_sortByMode`, `_updateTankCounts`, `_renderTank`, `_renderMemory`, `_julianMatchGroup`, `_buildJulianTagRow`, `_renderJulianTank`, `_showDedupDialog`, `openMemory`, `closeMemory`, `_pickMemory`, `_editMemory`, `_confirmDeleteMemory`, `confirmClearMemory`, `exportMemory`, `importMemory`, tank transfer functions | ~453 |
| `ui/db1-browser.js` | 2876-3029 | `_openDB1Popup`, `_setDB1Type`, `_closeDB1Popup`, `_cycleDB1Sort`, `_renderDB1List`, `_db1TypeDelete`, `_openGroupFromDB1`, `_db1Load`, `_db1Delete`, `_db1Edit`, `_showEditingIndicator`, `_hideEditingIndicator` | ~153 |
| `ui/transit-strip.js` | 3030-3110 | `_updateTransitStrip`, `_tsToggle`, `_tsReset`, `_tsEventSelect`, `_tsCalc` | ~80 |
| `ui/group-popup.js` | 3112-3265 | `_openGroupPopup`, `_closeGroupPopup`, `_renderGroupBody`, `_groupCreate`, `_groupDelete`, `_groupRemoveMember`, `_openNatalPickerForGroup`, `_closeNatalPicker`, `_renderNatalPicker`, `_groupAddMember`, `_groupLoadAsNatal1`, `_groupLoadAsNatal2` | ~153 |
| `ui/donate.js` | 2548-2582 | `setDonateAmount`, `applyDonateCustom`, `_updateDonateQR` | ~34 |
| `ui/confirm.js` | 2583-2603 | `_showConfirm`, `closeConfirm`, `_confirmYes` | ~20 |
| `ui/numpad.js` | 1679-1813 | `openLngPad`, `_numpadOpen`, `_numpadKey`, `_numpadConfirm` | ~134 |
| `ui/pre2484.js` | 3489-3510 | `_updatePre2484Warning` | ~21 |
| `ui/pwa-install.js` | 3511-3560 | `_playShutter`, `startLongPress`, `cancelLongPress`, `showContactPage`, `hideContactPage`, `showLunarPage`, `hideLunarPage` | ~49 |
| `ui/province-dropdown.js` | 3757-3785 | `setupProvDropdown` | ~28 |

### Tier 5 — IO + integrations
| Module | บรรทัด | Functions | LOC |
|---|---|---|---|
| `io/share-qr.js` | 1510-1678 | `_updateShareButton`, `_buildShareFilename`, HMAC sign, capture | ~168 |
| `io/export-import.js` | 3266-3329 | `_openExportModal`, `_closeExportModal`, `_exportDB`, `_importDB` | ~63 |
| `io/qr-import.js` | 3330-3488 | `_jdToGregorian`, `_latLngToProv`, `_parseH1Payload`, `_fillFormFromImport`, `_copyImportUrl`, `_openQRImportPopup`, `_closeQRImportPopup` | ~158 |

### Tier 6 — Interpretation (BIBLE integration)
| Module | บรรทัด | Functions | LOC |
|---|---|---|---|
| `interpretation/match.js` | 3561-3644 | `_matchRules` | ~83 |
| `interpretation/typhoon.js` | 3645-3667 | Typhoon AI call (delegated to v3/typhoon.js แล้ว) | ~22 |
| `interpretation/modal.js` | 3668-3756 | `closeInterpretation`, `_copyInterpretation`, `_renderQuickMemory`, `_quickLoad` | ~88 |

### Tier 7 — Calculate entry points + bootstrap
| Module | บรรทัด | Functions | LOC |
|---|---|---|---|
| `calc/main.js` | 1385-1509 | `_calcChart`, `calculateChart1`, `calculateChart2`, `calculateTransit`, `calculateBoth`, `_updateLngUI`, `sanitizeInt`, `sanitizeTime`, `_setField` | ~124 |
| `init.js` | 3786-4027 | DOMContentLoaded handler, event delegation, restore state | ~241 |

---

## 3. Global state ที่ต้อง preserve (cannot be split — pure shared state)

`script.js:101-160` — declared with `let`, accessed by many modules:
- **chart state:** `natal`, `_chart2`, `synastry`, `eventChart`, `transit`, `_transitDate`, `_transitCursor`
- **mode state:** `_era`, `_viewMode`, `_outerState`, `_chartTypeState`, `_reportTransitShow`, `_activeTab`, `_compareMode`, `_outerDisplay`, `_transitUnit`
- **index state:** `_synastryIdx`, `_eventIdx`, `_editingUid`, `_db1TypeFilter`, `_groupDetailUid`, `_natalPickerGroupUid`
- **UI state:** `_donateAmount`, `_confirmCallback`, `_deferredInstallPrompt`, `_swRefreshing`, `_soundLevel`, `_audioCtx`, `_memSortType`, `_memSortDir`, `_memScrollKey`, `_activeTank`, `_julianCache`, `_julianFiltered`, `_julianPage`, `_julianL1`, `_julianL2`, `_db1Sort`, `_evtSort`, `_numpadPrevValue`, `_numpadInvalidCount`, `_toastTimer`, `_memLongPressTimer`, `_evtLongPressTimer`
- **calc flags:** `_calc1Done`, `_calc2Done`, `_customLng1`, `_customLng2`, `_customLngT`

**Decision:** ใช้ `state/store.js` แบบ object-based singleton + getter/setter — module อื่นเรียก `state.natal` แทน global `natal`

---

## 4. Risk register (per module)

| Risk | Severity | Mitigation |
|---|---|---|
| XSS regression — `_escHtml()` ต้องอยู่ทุก HTML build site | **HIGH** | extract `render/report.js` ต้องมาพร้อม `_escHtml` ใน same module หรือ shared `core/escape.js` |
| Event handler scope — `onclick="_func()"` ใน HTML string ต้องเข้าถึงได้ | **HIGH** | export ผ่าน `window.X = X` (เหมือน `window.APP_VERSION`) จนกว่าจะ refactor เป็น `addEventListener` |
| `natal` global mutation — module หลาย call writes ตรง | **MED** | ระยะ 1: keep global, ระยะ 2: move ใน `state/store.js` |
| KB_RULES load timing — `_matchRules` ต้องรอ load | **MED** | wrap `_matchRules` ใน promise gate — return placeholder ถ้ายังไม่ load |
| import cycle — `db/core` ↔ `db/natal` | **LOW** | re-export pattern |
| `v3/v3tab.js` ใช้ `window.natal` + `window._transitDate` | **MED** | ตรวจ shim function (`getNatal`/`getTransit` already exposed) ต้องคงไว้ |

---

## 5. Recommended order (Phase 2 P2-C execution)

1. **Step 0** (cheap, immediate): KB_RULES → `v3/kb_embedded.json` + async load. ลด script.js 50%
2. **Step 1**: extract Tier 1 (pure logic) → `core/*.js` modules. ทำ test ก่อน (snapshot of `_calcJD`, `_core`, `buildLunarInfo`)
3. **Step 2**: extract Tier 2 (storage) → `db/*.js` modules. ใช้ existing shim pattern (เหมือน `_v3*` ที่มีอยู่)
4. **Step 3**: extract Tier 3 (render) → `render/*.js`. ต้องระวัง XSS — แก้แบบ "extract + preserve _escHtml in same module"
5. **Step 4**: extract Tier 4 ทีละ popup — ไม่ต้องทำพร้อมกัน 1 รอบ
6. **Step 5**: shared state object — ทำหลังสุดเมื่อ extract ส่วนใหญ่เสร็จ
7. **Step 6**: build step — มี/ไม่มี build? ถ้าไม่มี ใช้ `<script type="module">` แทน

---

## 6. Build step decision

**ปัจจุบัน:** ไม่มี build step — `index.html` โหลด `script.js` (classic) + `v3/v3tab.js` (module)

**Options:**
- **A: คง classic script** → ใช้ `window.X = X` exports — รวมไฟล์ด้วย `<script>` หลายตัว — ไม่ tree-shake แต่ง่าย
- **B: ES modules ทุกไฟล์** → ต้องเปลี่ยน `<script>` เป็น `<script type="module">` + import/export — ต้อง async-aware ตอน DOMContentLoaded
- **C: build step (esbuild/vite)** → bundling, tree-shake, code-split — เพิ่ม CI dependency

**Recommendation: B (ES modules)** — สำหรับ project ขนาดนี้ build step overkill, module syntax พอ. แต่ต้องระวัง `onclick="_func()"` attribute (modules มี scoped binding — fallback `window.X = X` แก้ได้)

---

## 7. ไม่อยู่ใน scope module split

- `v3/v3tab.js` — ES module อยู่แล้ว, ไม่ต้องแตะ
- `v3/engine.js` — KB engine (BIBLE), out of scope
- `v3/interpretation.js` — same
- `v3/tts.js` — NOK module, ไม่ต้องแตะ
- `auth-pin.js` — already extracted (GUARD P1-B)

---

## 8. ติดตาม Phase 2 P2-A (CSP enforce)

Phase 2 P2-C (code-split) ขึ้นต่อ P2-A (CSP enforce) เพราะ:
- ES module ทำให้ inline event handler (`onclick="..."`) มี scope ใหม่
- CSP enforce อาจ block inline event handlers (CSP `script-src 'self'` ไม่ allow `'unsafe-inline'`)
- ถ้า split modules ก่อน CSP enforce → ต้องแก้ 2 รอบ (inline → window.X, แล้ว → addEventListener)
- ถ้า CSP enforce ก่อน → forced to migrate ทั้งหมดเป็น delegated listeners ครั้งเดียว

**Order: CSP enforce (P2-A) → code-split (P2-C) — ห้ามสลับ**

---

## 9. Estimate

| Step | Effort (Claude session) | Risk | Unlock |
|---|---|---|---|
| 0. KB_RULES extract | 1 session | low | 50% script.js reduction immediate |
| 1. core/ Tier 1 | 1-2 session | low | testable pure logic |
| 2. db/ Tier 2 | 1 session | low | storage isolated |
| 3. render/ Tier 3 | 1 session | **HIGH** (XSS) | rendering layer split |
| 4. ui/ Tier 4 (per popup) | 0.5/popup × ~15 popups = 7-8 session | medium | feature-aligned modules |
| 5. state/store | 1 session | medium | full module isolation |
| 6. ES module migration | 1 session | medium | drop `window.X` shims |

**Total: ~12-15 sessions** for full split — แต่ Step 0 alone ได้ value 50% ทันที

---

## 10. Decision points (user input required)

- ⭐ **Build step ใช้ A/B/C?** (recommend B = ES modules, no bundler)
- ⭐ **Step 0 (KB extraction) ทำก่อน CSP enforce ได้ไหม?** — ไม่ต้องรอ CSP เพราะแค่ extract data ไม่ใช่ logic split
- ⭐ **state/store.js timing** — Step 5 หรือ inline กับ Tier 4?

---

*References:*
- `docs/cia/perf_baseline_2026-05-23.md` — performance baseline + R-08, R-14
- `docs/cia/csp_policy.md` — CSP Phase 2 enforce plan + Option E (delegated listeners)
- `docs/GUARD_MISSION.md` — XSS protection (R-01) + 44 _escHtml sites
- `script.js:97` — KB_RULES location (198KB inline)
