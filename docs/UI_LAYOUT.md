# HORATAD — UI Layout Document
# Version: 3.3.12 | Updated: 2026-05-22
# Format: ASCII wireframe + annotation ราย ID
# ────────────────────────────────────────────────────────────

---

## ภาพรวมโครงสร้าง

```
┌─────────────────────────────────────┐
│  HEADER  logo + ชื่อ + version      │
├──────────────────────────────────────┤
│  TAB NAV  [0] [1*] [2] [3 hidden]  │
├──────────────────────────────────────┤
│                                      │
│  TAB CONTENT  (แสดงทีละ tab)        │
│                                      │
│  CHART-WRAP  (shared, ย้ายโดย JS)   │
│                                      │
│  MODALS / POPUPS (overlay)           │
│                                      │
│  TOAST  (bottom notification)        │
└──────────────────────────────────────┘
```

---

## 1. HEADER (ทุก tab — ติดอยู่เสมอ)

```
┌────────────────────────────────────────────┐
│ [🖼 logo]  Horatad  โหราทาส  V 3.3.12    │
│  id="offline-banner" ← hidden ปกติ        │
└────────────────────────────────────────────┘
```

| ID | Tag | Label | State | Function |
|----|-----|-------|-------|----------|
| `offline-banner` | div | ⚡ ไม่มีสัญญาณ... | hidden / visible | แสดงเมื่อ network หาย |

---

## 2. TAB NAVIGATION

```
┌────────┬──────────────────┬──────────┬────────────────┐
│🔭กรอก  │ 🖼️กราฟิก+รายงาน │ℹ️เกี่ยวกับ│ 🔮พยากรณ์V3   │
│tab-btn-0│ tab-btn-1 *active│tab-btn-2 │ tab-btn-3      │
└────────┴──────────────────┴──────────┴────────────────┘
                                          ↑ hidden จนกว่า PIN ถูก
```

| ID | Label | State เริ่มต้น | Function |
|----|-------|----------------|----------|
| `tab-btn-0` | 🔭 กรอกข้อมูล | visible | switchTab(0) |
| `tab-btn-1` | 🖼️ กราฟิก + รายงาน | visible + active | switchTab(1) |
| `tab-btn-2` | ℹ️ เกี่ยวกับ | visible | switchTab(2) |
| `tab-btn-3` | 🔮 พยากรณ์ V3.01 | **hidden** | ปรากฏหลัง PIN ถูก → switchTab(3) |

---

## 3. TAB 0 — กรอกข้อมูล (`id="tab-0"`)

```
┌──────────────────────────────────────────┐
│  [พ.ศ.]   [ผูกดวง ▶]                    │
│  [เหตุการณ์จร]  [สมพงศ์]               │
├──────────────────────────────────────────┤
│  ── ดวงที่ 1 ──────────────── [📌] [🗑️] │
│  [ชื่อ____________] [🔍] [ชาย▼]         │
│  วัน[ ] เดือน[ ] ปี[    ] เวลา[  :  ]  │
│  [จังหวัด__________▼] [สถานที่อื่น]    │
│  [tag][tag][+]                           │
├──────────────────────────────────────────┤
│  ── ดวงที่ 2 ── (hidden จนกว่าเปิด)     │
│  (โครงสร้างเหมือนดวงที่ 1)              │
├──────────────────────────────────────────┤
│  ── วันที่จร ── (hidden Phase 1B)        │
│  (ย้ายไป Transit Strip ใน Tab 1 แล้ว)   │
├──────────────────────────────────────────┤
│  🔈เสียง  [chip][chip][chip]...          │
│  [Preview canvas ← PC only]             │
└──────────────────────────────────────────┘
```

### 3.1 Era + Action Row

| ID | Tag | Label | State | Function |
|----|-----|-------|-------|----------|
| `btn-era` | button | พ.ศ. / ค.ศ. | toggle text | toggleEra() — สลับระบบปี |
| _(no id)_ | button | ผูกดวง | always visible | calculateBoth() — คำนวณดวงที่ 1+2 |
| `btn-transit-input` | button | เหตุการณ์จร | visible | _openEventSlotsPopup() |
| `btn-sompong-input` | button | สมพงศ์ | visible | _toggleSompongInput() |

### 3.2 ดวงที่ 1

| ID | Tag | Label | State | Function |
|----|-----|-------|-------|----------|
| `db-indicator-1` | span | 📌 | hidden / visible | แสดงเมื่อดวงนี้มีในความทรงจำ |
| _(btn)_ | button | 🗑️ | visible | clearForm('1') — ล้างฟอร์มดวงที่ 1 |
| `name-1` | input | ชื่อ | text | ชื่อบุคคลดวงที่ 1 |
| _(btn)_ | button | 🔍 | visible | openMemory('1') — เปิด Memory popup |
| `gender1` | select | ชาย/หญิง/เหตุการณ์ | 3 options | เพศ/ประเภทดวง |
| `d1` | input[number] | วัน | 1–31 | วันเกิด |
| `m1` | input[number] | เดือน | 1–12 | เดือนเกิด |
| `y1` | input[number] | ปี | number | ปีเกิด (พ.ศ. หรือ ค.ศ. ตาม era) |
| `t1` | input[time] | เวลา | HH:MM | เวลาเกิด |
| `prov1` | input | จังหวัด | default: กรุงเทพฯ | autocomplete จังหวัด |
| `prov-list-1` | div | — | hidden / dropdown | รายการ autocomplete จังหวัด |
| `btn-cust1` | button | สถานที่อื่น | visible | openLngPad('lng1') — เปิด Numpad พิกัด |
| `tag-row-1` | div | [tags...] | dynamic | แถว tag ที่ติดกับดวง 1 |

### 3.3 ดวงที่ 2 (`.section-2`)

> โครงสร้างเดียวกับดวงที่ 1 ทุกประการ — ID ลงท้าย `-2`

| ID | Function |
|----|----------|
| `db-indicator-2` | แสดงเมื่อดวง 2 มีในความทรงจำ |
| `name-2` | ชื่อดวงที่ 2 |
| `gender2` | เพศดวงที่ 2 |
| `d2` `m2` `y2` `t2` | วัน เดือน ปี เวลา ดวงที่ 2 |
| `prov2` + `prov-list-2` | จังหวัด + autocomplete |
| `btn-cust2` | สถานที่อื่นดวงที่ 2 |
| `tag-row-2` | แถว tag ดวงที่ 2 |

### 3.4 วันที่จร (`.section-transit` — **hidden**, Phase 1B)

> ย้าย flow ไปที่ Transit Strip ใน chart-wrap แล้ว section นี้ไม่ใช้งาน

| ID | Label | Function |
|----|-------|----------|
| `name-event` | ชื่อเหตุการณ์ | บันทึกชื่อ event |
| `dt` `mt` `yt` `tt` | วัน เดือน ปี เวลา | วันที่จร |
| `provt` + `prov-list-t` | จังหวัด | จังหวัดเหตุการณ์ |
| `btn-custt` | สถานที่อื่น | openLngPad('lngt') |
| _(btn)_ | วันนี้ | resetTransit() |
| _(btn)_ | บันทึก | saveEvent() |
| _(btn)_ | ผูกดวงจร | calculateTransit() |

### 3.5 Quick Bar + Preview

| ID | Label | Function |
|----|-------|----------|
| `sound-btn` | 🔈 เสียง | cycleSoundLevel() — วนระดับเสียง |
| `quick-memory-chips` | [chip][chip]... | ความทรงจำล่าสุด กด load ทันที |
| `preview-panel` | — | PC: canvas ดูตัวอย่างโดยไม่ต้อง switch tab |

---

## 4. TAB 1 — กราฟิก + รายงาน (`id="tab-1"`)

```
┌──────────────────────────────────────────┐
│  canvas-slot                             │
│  ┌────────────────────────────────────┐  │
│  │  [◀] [ชื่อดวง / วันเกิด]  [▶]    │  │
│  │  [ดวงใน▼]              [⚙️]        │  │
│  │                                    │  │
│  │         canvas chart               │  │
│  │         (chart-canvas)             │  │
│  │                                    │  │
│  │  ── Transit Strip (hidden) ──      │  │
│  │  [จร] วัน[ ] ด[ ] ปี[  ] [  :  ] │  │
│  │  [วันนี้] [—เหตุการณ์—▼] [คำนวณจร]│  │
│  └────────────────────────────────────┘  │
│                                          │
│  [💾 บันทึก]  [📤 แชร์]  [🔮 ทำนาย]   │
│                                          │
│  report-panel                            │
│  ┌────────────────────────────────────┐  │
│  │  report (HTML table)               │  │
│  │  report-linked-events              │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 4.1 Chart Wrap (`id="chart-wrap"` — shared, ย้ายโดย JS)

#### Chart Nav Header

| ID | Tag | Label | State | Function |
|----|-----|-------|-------|----------|
| `chart-nav-header` | div | — | hidden / visible | แสดงหลังผูกดวงครั้งแรก |
| _(btn)_ | button | ◀ | visible | cycleMemory(-1) — ดวงก่อนหน้า |
| `chart-nav-info` | div | ชื่อ/วันเกิด | dynamic | แสดงชื่อดวงที่แสดงอยู่ |
| _(btn)_ | button | ▶ | visible | cycleMemory(1) — ดวงถัดไป |
| `btn-view-nav` | button | ดวงใน / ดวงนอก | toggle text | toggleView() — สลับ inner/outer |
| _(btn)_ | button | ⚙️ | visible | _openMainMenu() — เปิด Settings popup |

#### Canvas

| ID | Tag | State | Function |
|----|-----|-------|----------|
| `canvas-placeholder` | div | visible ก่อนผูกดวง | "กรอกข้อมูลและกด ผูกดวง" |
| `chart-canvas` | canvas 1000×1000 | visible หลังผูกดวง | วาดแผนผังดวง |

#### Transit Strip (`id="transit-strip"`)

| ID | Tag | Label | State | Function |
|----|-----|-------|-------|----------|
| `transit-strip` | div | — | **hidden** / visible | แถบดวงจร ใต้ chart |
| `ts-toggle` | button | จร | on/off highlight | _tsToggle() — เปิด/ปิดดวงจร |
| `ts-d` | input[number] | วัน | 1–31 | วันจร |
| `ts-m` | input[number] | ด | 1–12 | เดือนจร |
| `ts-y` | input[number] | ปี | number | ปีจร |
| `ts-t` | input[time] | HH:MM | time | เวลาจร |
| _(btn)_ | button | วันนี้ | visible | _tsReset() — รีเซ็ตเป็นวันนี้ |
| `ts-event` | select | — เหตุการณ์ — | dynamic options | _tsEventSelect() — เลือก event slot |
| _(btn)_ | button | คำนวณจร | visible | _tsCalc() — คำนวณดวงจร |

#### Share Row

| ID | Tag | Label | State | Function |
|----|-----|-------|-------|----------|
| `btn-save` | button | 💾 บันทึก | disabled → enabled หลังผูกดวง | startLongPress('save') — กด: บันทึก, ค้าง: save+share |
| `btn-share` | button | 📤 แชร์ | disabled → enabled | startLongPress('share') — share รูปดวง |
| `btn-interpret` | button | 🔮 ทำนาย | always enabled | _v3DevPopup() — เปิด PIN pad V3 |

### 4.2 Report Panel

| ID | Tag | Function |
|----|-----|----------|
| `report-panel` | div | กรอบหลักรายงาน |
| `report` | div | HTML table ตำแหน่งดาว/ราศี/ลัคนา |
| `report-linked-events` | div | แสดงเหตุการณ์ที่เชื่อมกับดวงนี้ |

---

## 5. TAB 2 — เกี่ยวกับ (`id="tab-2"`)

```
┌──────────────────────────────────────────┐
│  about-main (default)                    │
│  ┌────────────────────────────────────┐  │
│  │  [🖼 logo ใหญ่]                    │  │
│  │  Horatad โหราทาส V3.3.12          │  │
│  │  [kb-version-display]             │  │
│  │  🔒ความเป็นส่วนตัว               │  │
│  │  📱ใช้ได้ทุกอุปกรณ์               │  │
│  │  🙏พัฒนาด้วยใจ                    │  │
│  │  [ช่องทางติดต่อ →]               │  │
│  │  [🌙เกี่ยวกับสูตรจันทรคติ →]    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  about-lunar (hidden, sub-page)          │
│  about-contact (hidden, sub-page)        │
└──────────────────────────────────────────┘
```

### 5.1 หน้าหลัก (`id="about-main"`)

| ID | Tag | Label | Function |
|----|-----|-------|----------|
| `about-main` | div | — | visible เป็น default |
| `kb-version-display` | div | KB vX.X.X | แสดง version ของ kb.json |
| _(btn)_ | button | ช่องทางติดต่อ & สนับสนุน → | showContactPage() |
| _(btn)_ | button | 🌙 เกี่ยวกับสูตรคำนวณวันจันทรคติ → | showLunarPage() |

### 5.2 หน้าสูตรจันทรคติ (`id="about-lunar"`)

| ID | Tag | Label | Function |
|----|-----|-------|----------|
| `about-lunar` | div | — | hidden / visible |
| _(btn)_ | button | ← กลับ | hideLunarPage() |
| _(content)_ | div | เนื้อหาสูตรสุริยายาตร + ข้อจำกัด | read-only |

### 5.3 หน้าติดต่อ & สนับสนุน (`id="about-contact"`)

| ID | Tag | Label | State | Function |
|----|-----|-------|-------|----------|
| `about-contact` | div | — | hidden / visible | — |
| _(btn)_ | button | ← กลับ | visible | hideContactPage() |
| `btn-install-pwa` | button | 📲 ติดตั้งแอป | **hidden** / visible | installPWA() — แสดงเฉพาะเมื่อ installable |
| _(link)_ | a | 📺 Playlist YouTube | visible | เปิด playlist วิธีใช้ |
| _(link)_ | a | 💬 Feedback Form | visible | Google Form |
| _(link)_ | a | ✉️ contact@horatad.com | visible | mailto |
| _(btn×5)_ | button | 50/100/200/500/กำหนดเอง | toggle active | setDonateAmount() — เลือกจำนวนบริจาค |
| `donate-custom-row` | div | — | hidden / visible | แสดงเมื่อเลือก "กำหนดเอง" |
| `donate-custom-input` | input[number] | ระบุจำนวน (บาท) | — | จำนวนบริจาคที่กำหนดเอง |
| _(btn)_ | button | ยืนยัน | visible | applyDonateCustom() |
| `donate-qr` | img | PromptPay QR | dynamic src | แสดง QR ตามจำนวนที่เลือก |
| `donate-fallback` | div | PromptPay: 3102... | hidden / visible | fallback เมื่อ QR โหลดไม่ได้ |

---

## 6. TAB 3 — พยากรณ์ V3 (`id="tab-3"`)

> **Access:** กด 🔮 ทำนาย → PIN 6 หลัก → tab ปรากฏ

```
┌──────────────────────────────────────────┐
│  🔮 พยากรณ์โหราศาสตร์ไทย · Horatad V3   │
│                          [✕ ออกจากพยากรณ์]│
│                                          │
│  ┌──────────────────────────────────┐    │
│  │ ดวง: [ชื่อ]  วันเกิด           │    │
│  └──────────────────────────────────┘    │
│  (หรือ: "กรุณาผูกดวงก่อน")              │
│                                          │
│  [🏠 ดวงเดิม] [🌐 ดวงจร] [⚡ ทั้งคู่]   │
│                                          │
│  [📋 ดูกฎที่ตรงดวง] [🤖 พยากรณ์โดย Typhoon]│
│                                          │
│  ── 3 Panels (collapsible) ─────────    │
│  ▼ 📋 กฎที่ตรงดวง  [N กฎ]              │
│    [R001 +pos] กฎ...  [domain]           │
│    [R002 -neg] กฎ...                     │
│                                          │
│  ▼ 📤 Input ที่ส่ง Typhoon              │
│    [monospace prompt]                    │
│                                          │
│  ▼ 🤖 ผลพยากรณ์  [source]              │
│    ⚠️ fallback badge (hidden)           │
│    [เนื้อหาพยากรณ์]                    │
│    [📋 คัดลอก]                          │
└──────────────────────────────────────────┘
```

| ID | Tag | Label | State | Function |
|----|-----|-------|-------|----------|
| `tab-3` | div | — | hidden / visible | TAB 3 container |
| `v3-btn-exit` | button | ✕ ออกจากพยากรณ์ | visible | _v3Exit() — ซ่อน tab 3 + กลับ tab 1 |
| `v3-natal-bar` | div | ดวง: [ชื่อ] [วันเกิด] | hidden / visible | แสดงเมื่อมีดวงที่ผูกแล้ว |
| `v3-natal-name` | span | ชื่อบุคคล | dynamic | ชื่อดวงที่ active |
| `v3-natal-date` | span | วันเกิด | dynamic | วันเกิดดวงที่ active |
| `v3-no-natal` | div | "กรุณาผูกดวงก่อน" | hidden / visible | แสดงเมื่อยังไม่มีดวง |
| `v3-m-natal` | button | 🏠 ดวงเดิม | on (default) | v3SetMode('natal') |
| `v3-m-transit` | button | 🌐 ดวงจร | off | v3SetMode('transit') |
| `v3-m-both` | button | ⚡ ทั้งคู่ | off | v3SetMode('both') |
| `v3-btn-local` | button | 📋 ดูกฎที่ตรงดวง | enabled/disabled | v3Local() — match rules จาก kb.json |
| `v3-btn-typhoon` | button | 🤖 พยากรณ์โดย Typhoon | enabled/disabled | v3Typhoon() — เรียก Typhoon API |
| `v3-spinner` | div | กำลังประมวลผล... | hidden / visible | spinner ระหว่างรอ API |
| `v3-spinner-label` | div | ข้อความ status | dynamic | "กำลังประมวลผล..." / "ส่งไป Typhoon..." |
| `v3-result-wrap` | div | — | hidden / visible | 3-panel wrapper แสดงหลัง predict |
| `v3-pd-rules` | div (panel body) | — | open/closed | กฎที่ตรงดวง |
| `v3-rules-count` | span | N กฎ | dynamic | จำนวนกฎที่ match |
| `v3-rules-list` | div | — | dynamic | รายการกฎ (R001, R002...) |
| `v3-pd-input` | div (panel body) | — | open/closed | prompt ที่ส่ง Typhoon |
| `v3-prompt-box` | div | monospace text | dynamic | system + user prompt |
| `v3-pd-output` | div (panel body) | — | **open** (default) | ผลพยากรณ์ |
| `v3-source-label` | span | Typhoon / local | dynamic | แหล่งที่มาของผล |
| `v3-fallback-badge` | div | ⚠️ Typhoon ไม่ตอบ... | hidden / visible | แสดงเมื่อ fallback |
| `v3-result` | div | เนื้อหาพยากรณ์ | dynamic | ข้อความพยากรณ์ |
| `v3-copy-btn` | button | 📋 คัดลอก | disabled → enabled | v3Copy() |

---

## 7. MODALS & POPUPS

### 7.1 Numpad (`id="numpad"`)

> ใช้สำหรับกรอกพิกัดสถานที่ (lat/lng) ด้วย numpad บนมือถือ

```
┌──────────────────────┐
│  [numpad-label]      │
│  [numpad-display]    │
│  [numpad-warning]    │
│ [1][2][3]            │
│ [4][5][6]            │
│ [7][8][9]            │
│ [ล้าง][0][✓]        │
└──────────────────────┘
```

| ID | Label | Function |
|----|-------|----------|
| `numpad-backdrop` | — | click ปิด = _numpadConfirm() |
| `numpad` | — | overlay numpad |
| `numpad-label` | ชื่อ field | dynamic เช่น "ลองจิจูด" |
| `numpad-display` | — | แสดงตัวเลขที่กด |
| `numpad-warning` | — | เตือนเมื่อค่าเกินขอบเขต |

### 7.2 Memory Popup (`id="memory-modal"`)

> เลือกดวงจากความทรงจำ (localStorage)

```
┌───────────────────────────────────┐
│ เลือกจากความทรงจำ  [🕐 ล่าสุด▼] │
│ [ค้นหาชื่อ__________________]    │
│ ┌─────────────────────────────┐  │
│ │ [ชื่อ1]  วันเกิด  ล้างข้อมูล│  │
│ │ [ชื่อ2]  ...                │  │
│ └─────────────────────────────┘  │
│ [📤Export] [📥Import] [🗑️ล้าง]  │
│ ┌── import-choice (hidden) ──┐   │
│ │ [🌐 ข้อมูลสาธารณะ JULIAN]  │   │
│ │ [📁 ข้อมูลส่วนตัว ไฟล์]    │   │
│ │ [ยกเลิก]                   │   │
│ └─────────────────────────────┘  │
│                        [ปิด]     │
└───────────────────────────────────┘
```

| ID | Label | State | Function |
|----|-------|-------|----------|
| `memory-modal` | เลือกจากความทรงจำ | hidden / visible | — |
| `memory-sort-btn` | 🕐 ล่าสุด / 🔤 A-Z | toggle | cycleMemorySort() |
| `memory-search` | ค้นหาชื่อ... | text input | filter รายการ |
| `memory-list` | — | dynamic | รายการดวงทั้งหมด |
| _(btn)_ | 📤 Export | visible | exportMemory() |
| _(btn)_ | 📥 Import | visible | _openImportChoice() |
| _(btn)_ | 🗑️ ล้าง | danger | confirmClearMemory() |
| `import-choice` | — | hidden / visible | แสดงตัวเลือก import |
| _(btn)_ | 🌐 ข้อมูลสาธารณะ (JULIAN) | visible | _importFromJulian() — download julian_all.json |
| _(btn)_ | 📁 ข้อมูลส่วนตัว (ไฟล์) | visible | trigger file input |
| `memory-import-input` | — | hidden file input | importMemory(event) |

### 7.3 Events Popup (`id="event-modal"`)

> รายการเหตุการณ์ที่บันทึกไว้ (transit events)

| ID | Label | Function |
|----|-------|----------|
| `event-modal` | เหตุการณ์ที่บันทึก | — |
| `event-sort-btn` | 🕐 ล่าสุด | cycleEventSort() |
| `event-search` | ค้นหา... | filter |
| `event-list` | — | รายการ events |

### 7.4 Confirm Dialog (`id="confirm-modal"`)

| ID | Label | Function |
|----|-------|----------|
| `confirm-title` | ยืนยัน | dynamic title |
| `confirm-message` | — | dynamic message |
| _(btn)_ | ยกเลิก | closeConfirm() |
| _(btn)_ | ตกลง | _confirmYes() — callback |

### 7.5 Main Menu / Settings (`id="main-menu-modal"`)

```
┌───────────────────────────────┐
│ ตั้งค่า                  [✕] │
│ เหตุการณ์จร    [ซ่อน/แสดง] │
│ นำเข้า QR              [›]  │
│ 📋 คัดลอก URL          [copy]│
│ 🗂️ ดาวดวง           [N ›]  │
│ 👥 กลุ่ม              [N ›]  │
│ 📦 ส่งออก/นำเข้า       [›]  │
└───────────────────────────────┘
```

| ID | Label | State | Function |
|----|-------|-------|----------|
| `main-menu-modal` | ตั้งค่า | hidden / visible | — |
| `main-menu-transit-btn` | ซ่อน / แสดง | toggle | toggleReportTransit() |
| _(row)_ | นำเข้า QR | link | _openQRImportPopup() |
| _(row)_ | 📋 คัดลอก URL | link | _copyImportUrl() |
| _(row)_ | 🗂️ ดาวดวง | link | _openDB1Popup() |
| `main-menu-db1-info` | N › | dynamic | จำนวนดวงใน DB1 |
| _(row)_ | 👥 กลุ่ม | link | _openGroupPopup() |
| `main-menu-group-info` | N › | dynamic | จำนวนกลุ่ม |
| _(row)_ | 📦 ส่งออก/นำเข้า | link | _openExportModal() |

### 7.6 DB1 Browser (`id="db1-modal"`)

> ดู/ค้น/โหลดดวงทั้งหมดใน IndexedDB

| ID | Label | Function |
|----|-------|----------|
| `db1-modal` | 🗂️ ดาวดวง | — |
| `db1-sort-btn` | 📅 ใหม่→เก่า | _cycleDB1Sort() |
| `db1-count` | N รายการ | dynamic |
| `db1-search` | ค้นหาชื่อ... | _renderDB1List() |
| _(btn)_ | ดวง | _setDB1Type('natal') |
| _(btn)_ | บุคคล | _setDB1Type('person') |
| _(btn)_ | เหตุการณ์ | _setDB1Type('event') |
| _(btn)_ | กลุ่ม | _setDB1Type('group') |
| `db1-list` | — | รายการตาม type ที่เลือก |

### 7.7 Export/Import Modal (`id="export-modal"`)

| ID | Label | Function |
|----|-------|----------|
| `export-modal` | ส่งออก / นำเข้าข้อมูล | — |
| _(btn)_ | ⬇️ ส่งออกข้อมูล (JSON) | _exportDB() — download รวม |
| _(label/input)_ | ⬆️ นำเข้าข้อมูล (JSON) | _importDB() — merge ไม่ลบเก่า |
| `import-result` | — | แสดงผลการ import |

### 7.8 Sompong Popup (`id="sompong-modal"`)

> buffer ชั่วคราว สำหรับผูกดวงหลายคนพร้อมกัน

| ID | Label | Function |
|----|-------|----------|
| `sompong-modal` | สมพงศ์ (buffer) | — |
| `sompong-count` | N/10 | dynamic slot count |
| `sompong-list` | — | รายการดวง buffer |
| _(btn)_ | + สร้างดวงใหม่ | _sompongNew() |

### 7.9 Group Popup (`id="group-modal"`)

| ID | Label | Function |
|----|-------|----------|
| `group-modal` | 👥 กลุ่ม | — |
| `group-modal-title` | dynamic | ชื่อ view ปัจจุบัน |
| `group-modal-count` | N | dynamic |
| `group-body` | — | รายการกลุ่ม / สมาชิก |

### 7.10 Natal Picker (`id="natal-picker-modal"`)

> เลือกดวงเพื่อเพิ่มเป็นสมาชิกกลุ่ม

| ID | Label | Function |
|----|-------|----------|
| `natal-picker-modal` | เลือกดวงเพิ่มสมาชิก | — |
| `natal-picker-search` | ค้นหาชื่อ... | _renderNatalPicker() |
| `natal-picker-list` | — | รายการดวง |

### 7.11 QR Import Popup (`id="qr-import-modal"`)

| ID | Label | Function |
|----|-------|----------|
| `qr-import-modal` | นำเข้า QR | — |
| `qr-import-file` | 📷 เลือกรูปดวง | _importFromImageFile() — decode QR |
| `qr-import-textarea` | H2\|...\|... | paste payload โดยตรง |
| _(btn)_ | นำเข้า | _doQRImport() |

### 7.12 Event Slots Popup (`id="event-slots-modal"`)

| ID | Label | Function |
|----|-------|----------|
| `event-slots-modal` | เหตุการณ์ (slots) | — |
| `event-slots-count` | N/10 | dynamic |
| `event-slots-list` | — | รายการ event slots |
| _(btn)_ | + บันทึกดวง 2 | _eventSlotSaveCurrent() |
| _(btn)_ | + สร้างใหม่ | _openCreateEventModal() |

### 7.13 Event Create Modal (`id="event-create-modal"`)

| ID | Label | Function |
|----|-------|----------|
| `event-create-modal` | สร้างเหตุการณ์ | — |
| `ev-name` | ชื่อเหตุการณ์ | max 20 ตัวอักษร |
| `ev-d` `ev-m` `ev-y` `ev-t` | วัน เดือน ปี เวลา | วันเหตุการณ์ |
| `ev-natal-link` | เชื่อมกับดวง | select ดวงที่มีใน DB |
| _(btn)_ | บันทึก | _submitCreateEvent() |

### 7.14 Interpretation Modal (`id="interp-modal"`)

> แสดงกฎพยากรณ์ที่ตรงกับดวง (V2 flow เดิม ก่อนมี V3 tab)

| ID | Label | State | Function |
|----|-------|-------|----------|
| `interp-modal` | 🔮 กฎพยากรณ์ที่ตรงกับดวง | hidden / visible | — |
| `interp-spinner` | AI กำลังวิเคราะห์... | visible ขณะรอ | spinner |
| `interp-text` | — | hidden / visible | เนื้อหาพยากรณ์ |
| `interp-copy-btn` | 📋 คัดลอกคำทำนาย | disabled → enabled | _copyInterpretation() |

### 7.15 PIN Pad V3 (`id="v3-dev-overlay"`)

> กรอก PIN 6 หลักเพื่อเข้า Tab 3

```
┌────────────────────────┐
│ 🧮                     │
│ ฟีเจอร์นี้อยู่ระหว่าง │
│ การพัฒนา               │
│ [●●●●●●]              │
│ [7][8][9]              │
│ [4][5][6]              │
│ [1][2][3]              │
│ [⌫][0][ปิด]           │
└────────────────────────┘
```

| ID | Function |
|----|----------|
| `v3-dev-overlay` | overlay PIN pad |
| `v3-dev-display` | แสดง ● ตามจำนวนที่กด |
| _(btn×10)_ | _v3NumPress(n) |
| _(btn ⌫)_ | _v3NumBack() |
| _(btn ปิด)_ | _v3DevClose() |
> PIN ถูก (6 หลัก) → fetch /api/auth → สำเร็จ → แสดง tab-btn-3 → switchTab(3)

### 7.16 Add Tag Modal (`id="add-tag-modal"`)

| ID | Label | Function |
|----|-------|----------|
| `add-tag-modal` | เพิ่ม Tag ใหม่ | — |
| `add-tag-input` | ชื่อ tag (max 20 ตัว) | text input |
| _(btn)_ | ยกเลิก | _closeAddTagModal() |
| _(btn)_ | เพิ่ม | _submitAddTag() |

### 7.17 Toast (`id="toast"`)

| ID | State | Function |
|----|-------|----------|
| `toast` | visible 2-3 วิ แล้วหาย | แสดง feedback ทุก action |

---

## 8. TOOLS — GitHub Pages (`tools/`)

### 8.1 kb_reviewer.html

> รีวิว + แก้ไข rules ใน kb.json บน browser

```
┌─────────────────────────────────────────────┐
│ TOPBAR                                       │
│ [🔴 MM] [🟡 NC] [✅ OK] [📋 Tot] ████ 0/0 │
│ [☰ รายการ]                                  │
├─────────────────────────────────────────────┤
│ ACTION STRIP                                 │
│ [⬆ Load kb] [⬆ Load Patch] [⬆ Load Merge] │
│ [⬇ Save Patch] [⬇ Full kb.json] [🛟 Master]│
├─────────────────────────────────────────────┤
│ FILTER ROW                                   │
│ [All▼][Mismatch▼][+▼][-▼] [ค้นหา____]    │
├────────────────┬────────────────────────────┤
│ SIDEBAR        │ EDITOR                      │
│ [rule-list]    │ ed-body                     │
│ R001 ชื่อ ⚑   │ [Tags][Conditions]         │
│ R002 ...       │ [rule_type▼][source▼][wt]  │
│                │ [◀ R001/342 ▶]             │
│                │ [💾Save][🗑Del]             │
└────────────────┴────────────────────────────┘
```

| ID | Label | Function |
|----|-------|----------|
| `s-mm` | 🔴 N | จำนวน MISMATCH rules |
| `s-nc` | 🟡 N | จำนวน NO_CONDITIONS rules |
| `s-ok` | ✅ N | จำนวน OK rules |
| `s-tot` | 📋 N | ทั้งหมด |
| `prog-bar` | — | progress bar การ review |
| `prog-txt` | N/N | ตัวเลข |
| `sidebar-toggle` | ☰ รายการ | toggleSidebar() |
| `action-strip` | — | แถบ action buttons |
| `kb-file` | — | hidden file input → loadKb() |
| `patch-file` | — | hidden file input → loadPatch() |
| `merge-file` | — | hidden file input → loadMerge() |
| `filter-row` | — | filter bar |
| `search` | ค้นหา... | renderList() |
| `sidebar` | — | รายการ rules |
| `rule-list` | — | dynamic list |
| `editor` | — | panel แก้ไข rule ที่เลือก |
| `ed-empty` | — | แสดงเมื่อยังไม่เลือก rule |
| `ed-body` | — | form แก้ rule |
| `ed-tags` | — | tags ของ rule |
| `cond-list` | — | conditions ของ rule |
| `add-cond` | + เพิ่ม condition | addCond(i) |
| `f-rt` | rule_type | select: major/minor/empirical/case_study |
| `f-rs` | rule_source | select |
| `f-wt` | weight | input[number] 0–2 |
| `pos-label` | N/N | ตำแหน่ง rule ปัจจุบัน |
| `action-bar` | — | Save/Delete bar |

### 8.2 julian_status.html

> ดู status การ scrape JULIAN (D1 / progress)

| ID | Label | Function |
|----|-------|----------|
| `s-total` | N records | จำนวน records ทั้งหมด |
| `s-target` | 500 | เป้าหมาย |
| `s-rate` | N/วัน | อัตรา scrape |
| `s-eta` | วัน | คาดว่าเสร็จ |
| `prog-bar` | — | progress bar |
| `prog-label` | — | % และ label |
| `runs-list` | — | ประวัติ run |
| `cat-list` | — | สถิติรายหมวด |
| `names-table` | — | ตัวอย่างชื่อล่าสุด |
| `gen-time` | — | เวลาที่ generate |

### 8.3 hora_db_import.html

> import JSONL → เลือก/แก้ไข → export เป็น SQL หรือ JSONL

```
┌──────────────────────────────────────────────┐
│ TOPBAR                                        │
│ [N selected] [N total] [N ภาษาไทย]          │
├──────────────────────────────────────────────┤
│ DROP ZONE                                     │
│ [ลาก/วาง หรือ เลือกไฟล์]                   │
├──────────────────────────────────────────────┤
│ CAT FILTER  [All][Category1][Category2]...   │
├──────────────────────────────────────────────┤
│ BULK BAR                                      │
│ Country[▼] Tier[▼] [Apply] [เลือกทั้งหมด]  │
│ [ค้นหา___________] [⬇JSONL] [⬇SQL]         │
├──────────────────────────────────────────────┤
│ TABLE                                         │
│ [☐ chk-all] ชื่อ | วันเกิด | country | tier │
│ [☐] ชื่อ1  ...                               │
└──────────────────────────────────────────────┘
```

| ID | Label | Function |
|----|-------|----------|
| `chip-sel` | N selected | dynamic |
| `chip-total` | N total | dynamic |
| `chip-thai` | N ภาษาไทย | auto-excluded |
| `drop-zone` | ลาก/วางไฟล์ | drag-and-drop + file input |
| `file-input` | — | hidden → loadFile() |
| `cat-filter` | — | filter ปุ่ม category |
| `bulk-bar` | — | bulk edit bar |
| `bulk-country` | Country▼ | select country |
| `bulk-tier` | Tier▼ | select 1-5 |
| `btn-apply` | Apply | ใช้กับ selected rows |
| `btn-sel-all` | เลือกทั้งหมด | select all visible |
| `btn-desel-all` | ยกเลิกทั้งหมด | deselect all |
| `search-input` | ค้นหาชื่อ... | filter rows |
| `btn-dl` | ⬇ JSONL | export เป็น .jsonl |
| `btn-sql` | ⬇ SQL | export เป็น .sql |
| `table-wrap` | — | ตารางข้อมูล |
| `status` | รอไฟล์... | status bar ล่าง |
| `chk-all` | ☐ | select/deselect ทั้งหมด |

### 8.4 julian_keygen.html

> สร้าง master_key table (Julian Day + planet positions) ช่วงปีที่กำหนด

| ID | Label | Function |
|----|-------|----------|
| `chip-rows` | N rows | จำนวนแถวที่สร้าง |
| `y-start` | 1700 | ปีเริ่มต้น |
| `y-end` | 2100 | ปีสิ้นสุด |
| `btn-gen` | ▶ สร้าง | generate Julian Day keys |
| `prog-fill` | — | progress bar |
| `prog-txt` | กำลังคำนวณ... | status |
| `status` | — | ผล / error |
| `btn-csv` | ⬇ Download CSV | export |
| `preview-wrap` | — | ตัวอย่าง rows แรก |

---

## 9. FLOW MAP — การนำทางระหว่างหน้า

```
START
  │
  ▼
[Tab 1: กราฟิก + รายงาน]  ← default
  │
  ├── [⚙️] → Main Menu
  │         ├── เหตุการณ์จร → toggle transit strip
  │         ├── นำเข้า QR → QR Import Popup
  │         ├── 📋 คัดลอก URL
  │         ├── 🗂️ ดาวดวง → DB1 Popup
  │         ├── 👥 กลุ่ม → Group Popup
  │         └── 📦 ส่งออก/นำเข้า → Export Popup
  │
  ├── [💾 บันทึก] → บันทึกดวงปัจจุบัน + toast
  ├── [📤 แชร์] → แชร์รูป + toast
  ├── [🔮 ทำนาย] → PIN Pad → Tab 3
  │
  ├── Tab Nav → [Tab 0: กรอกข้อมูล]
  │         ├── [🔍] → Memory Popup
  │         │         └── [📥 Import] → import-choice
  │         │                       ├── JULIAN → download public data
  │         │                       └── ไฟล์ → file input
  │         ├── [สถานที่อื่น] → Numpad
  │         ├── [เหตุการณ์จร] → Event Slots Popup
  │         │         └── [+ สร้างใหม่] → Event Create Modal
  │         └── [สมพงศ์] → Sompong Popup
  │
  └── Tab Nav → [Tab 2: เกี่ยวกับ]
            ├── [ช่องทางติดต่อ →] → about-contact
            │         └── [← กลับ]
            └── [🌙 สูตรจันทรคติ →] → about-lunar
                      └── [← กลับ]

[Tab 3: พยากรณ์ V3]
  ├── mode toggle [ดวงเดิม/จร/ทั้งคู่]
  ├── [📋 ดูกฎ] → v3-result-wrap (3 panels)
  ├── [🤖 Typhoon] → spinner → result
  └── [✕ ออก] → Tab 1 + ซ่อน tab-btn-3
```

---

## 10. STATE SUMMARY — Elements ที่ซ่อน/แสดงตาม state

| Element | ซ่อนเมื่อ | แสดงเมื่อ |
|---------|----------|----------|
| `tab-btn-3` | เริ่มต้น / กด ✕ ออก | PIN ถูกต้อง |
| `chart-nav-header` | ยังไม่ผูกดวง | ผูกดวงแล้ว |
| `transit-strip` | ซ่อน | เปิดจาก Main Menu |
| `btn-save` / `btn-share` | disabled | หลังผูกดวง |
| `db-indicator-1/2` | ดวงไม่อยู่ใน memory | ดวงมีใน memory |
| `section-2` | เริ่มต้น | เมื่อต้องการดวงที่ 2 |
| `import-choice` | เริ่มต้น | กด 📥 Import |
| `btn-install-pwa` | ไม่ installable | browser รองรับ + ยังไม่ติดตั้ง |
| `offline-banner` | online | offline |
| `v3-natal-bar` | ไม่มีดวง | มีดวงที่ผูกแล้ว |
| `v3-no-natal` | มีดวง | ไม่มีดวง |
| `v3-result-wrap` | ก่อน predict | หลัง predict |
| `v3-fallback-badge` | Typhoon ตอบ | Typhoon fail |
| `donate-custom-row` | เลือก preset | เลือก "กำหนดเอง" |

---

*สร้างจาก index.html V3.3.12 + tools/*.html*
*ใช้ประกอบการวางแผน BIG session / โครงการใหม่*
