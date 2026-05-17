# Horatad — Session Handoff V2.2 (17May26)

> ⚠️ ตรวจสอบ model selector: Claude Sonnet 4.6 ทุก session ใหม่

---

## 1. CURRENT BASELINE

- index.html / style.css / script.js — **V2.2.16** | 2026-05-17
- sw.js — **V2.2.16** | 2026-05-17 · CACHE_NAME: `horatad-v2.2.16`
- manifest.json — V2.1.3
- display: **"V 2.2.16"** (ทั้ง brand-ver และ about-version)
- Production: https://horatad.com (GitHub Pages + Cloudflare DNS)

---

## 2. ENGINE RULE (บังคับทุก session)

```
ห้ามแตะโดยเด็ดขาด:
  get_j, get_pk, get_s, _core, get_data
  Y_SUN, Y_MON, Y_OTH
  ค่าคงที่: 292207, 800, 703, 20760, 692, 373, 233051, 650, 24350, 811, 14

เหตุผล: เป็นค่าโบราณสุริยยาตร์ที่ใช้คำนวณตำแหน่งดาว
         การเปลี่ยนใดๆ ต้องเป็น function ใหม่เท่านั้น
```

---

## 3. VERSION RULE (บังคับทุก version bump)

อัปเดต **4 จุดพร้อมกันเสมอ**:
1. `script.js` บรรทัด 1 — `// Version X.X.X | date`
2. `index.html` — `brand-ver` + `about-version` + `about-update` (วันที่ + สรุปการเปลี่ยน)
3. `style.css` — comment บรรทัด 1
4. `sw.js` — comment + `CACHE_NAME: horatad-vX.X.X`

---

## 4. ⚠️ FUTURE UPDATE (next session ต้องทำ)

```
VALIDATE _ADHIKAVARA_YEARS ใน script.js บรรทัด ~434
ปัจจุบัน confirmed เฉพาะ BE 2567 เท่านั้น
วิธี: ค้น "ประกาศสงกรานต์ BE XXXX" รายปี
      ประกาศสงกรานต์ระบุ อธิกมาส/อธิกวาร/ปกติ ตรงๆ ทุกปี
      myhora.com เป็นแค่ทางลัด ไม่ใช่ ground truth สูงสุด
ช่วงที่ต้องตรวจ: BE 2484–2566 (ก่อน 2567)
```

---

## 5. สิ่งที่ทำใน session V2.2.0–V2.2.12

### Task 1 — About logo
- เปลี่ยน src: horatad_500x500.png → horatad_746x746.png

### Task 4 — Quick memory chips
- เพิ่ม `.quick-bar` ใน tab-0 ใต้ input-panel
- sound toggle ย้ายจาก about tab → tab-0 (`.sound-toggle-inline`)
- `_renderQuickMemory()` render chip 5 ล่าสุด, `_quickLoad(i)` โหลดดวงทันที

### Task 5 — Memory toast
- `_addMemory()` return `'updated'|'saved'|null`
- calculateBoth → toast "อัปเดตดวง/บันทึกดวง [ชื่อ]"

### Task 6 — Event toast
- `saveEvent()` ตรวจ dup → `_showConfirm()` ก่อนทับ, ใหม่ → toast

### Task 7 — About tab App Look
- tab-2 แบ่ง 2 sub-page: `#about-main` + `#about-contact`
- JS: `showContactPage()` / `hideContactPage()`

### Task 8 — Offline banner
- `#offline-banner` fixed bottom gold, `navigator.onLine` check

### Task 2 — ดาววงนอก (_natal2)
- `_natal2` เก็บดวงวงนอก, เลขไทย #9b7fd4 52px

### Task 3 — btn-view ดวงใน/ดวงนอก
- `VIEW_LABELS = ['ดวงใน','ดวงนอก']`
- `_applyViewMode()`: btn-outer hidden, blink ◀▶

### Logo canvas
- lx = 1000-160+8 = 848, ly = 0

### Compare report
- `buildCompareReport(n1,n2)` — ตาราง 5 col, ไฮไลต์ทอง, คะแนนรวม

### Long-press save/share
- 1.5s + progress bar CSS `::after`

---

## 6. สิ่งที่ทำใน session V2.2.13–V2.2.16 (วันจันทรคติ)

### V2.2.13 — Adhikamasa
- `_h0OfCS(cs)`, `_totalLunations(h0)`, `_isAdhikamasaCached(y_be)`
- นับ lunation จากต้นปี จ.ศ. → แยก เดือน 8 / เดือน 8/8 ได้ถูกต้อง

### V2.2.14 — Tithi via Avoman
- `buildLunarInfo` เปลี่ยนจาก `getTithi(pos)` → avoman formula โดยตรง
- เวลาอ้างอิง 06:00 น. (รุ่งอรุณ) ไม่ใช้เวลาเกิด
- ไม่แตะ Y_MON / engine

### V2.2.15 — Adhikavara + Hollow Month
- `_ADHIKAVARA_YEARS` (Set), `_isAdhikavaraCached(y_be)`
- `_getLunarDay(d,m,y_be)` — รวม tithi + month + hollow correction
- เดือนคี่ (1,3,5,7,9,11) = เดือนขาด, dithi 29 → ขึ้น 1 เดือนถัดไป
- ยกเว้น เดือน 7 ปีอธิกวาร → เดือนถ้วน (แรม 15 มีจริง)

### V2.2.16 — Lookup Table + Version Display
- เปลี่ยน adhikavara จาก formula (threshold 207 ผิด) → lookup table จาก myhora
- `brand-ver` + `about-version` → V 2.2.16
- เพิ่ม `.about-update` แสดงวันที่และสรุปการเปลี่ยน
- เพิ่มหน้า `#about-lunar` "วันจันทรคติในโปรแกรมนี้"
- `showLunarPage()` / `hideLunarPage()`
- sw.js CACHE_NAME → horatad-v2.2.16

---

## 7. STATE GLOBALS (อัปเดต)

```
_natal2        null|{name,gender,pos,vel,d,m,y_be,t,prov}  — outer ring chart
_natal         ดวงวงใน (ไม่เปลี่ยน)
_viewMode      0=ดวงใน 1=ดวงนอก
_outerState    0=ชื่อราศี 1=ชื่อภพเรือน 2=จรทั้งหมด 3=จรช้า 4=ไม่แสดง
_lpTimer       long-press timer ref
_ADHIKAVARA_YEARS  Set of BE years with อธิกวาร (ต้องขยายต่อ)
```

---

## 8. FUNCTION MAP (อัปเดต)

```
script.js (V2.2.16):
  ── Lunar (ใหม่ V2.2.13–16) ──
  _h0OfCS               ~415    ahargana วันแรกปี จ.ศ.
  _totalLunations        ~416    lunation สะสม
  _isAdhikamasaCached    ~424    ตรวจปีอธิกมาส (cache)
  _ADHIKAVARA_YEARS      ~434    lookup table อธิกวาร
  _isAdhikavaraCached    ~439    ตรวจปีอธิกวาร
  _getLunarMonthFixed    ~447    เดือนจันทรคติ (รองรับ 88)
  _getLunarDay           ~465    tithi+month+hollow correction
  _nextMonth             ~485    เดือนถัดไป
  buildLunarInfo         ~493    แสดงวันจันทรคติ (signature ไม่เปลี่ยน)

  ── Report ──
  buildCompareReport     ~434    compare report HTML
  buildReport            ~508    natal report HTML
  _applyViewMode         ~541    sync btn-view/outer/nav
  toggleView             ~559    สลับ ดวงใน/ดวงนอก
  cycleMemory            ~568    ◀▶ แยก _natal2 vs _natal
  _redraw                ~618    isV2 → compareReport+natal2 outer
  drawChart outer ring   ~755    isV2 branch: เลขไทย

  ── About pages ──
  showContactPage/hide   ~1624   about sub-page ติดต่อ
  showLunarPage/hide     ~1632   about sub-page วันจันทรคติ ← ใหม่

index.html:
  #about-main            tab-2 หน้าหลัก
  #about-contact         tab-2 ช่องทางติดต่อ
  #about-lunar           tab-2 ที่มาสูตรวันจันทรคติ ← ใหม่
  .brand-ver             header version
  .about-version         about page version
  .about-update          วันที่และสรุปการเปลี่ยน ← ใหม่
  .quick-bar             tab-0 quick memory

style.css:
  .about-update          font 10px สีเทาอ่อน ← ใหม่
  .btn-lunar-page        ปุ่มน้ำเงินเข้ม ← ใหม่
  .about-lunar-text      เนื้อหาหน้า lunar ← ใหม่
  .about-lunar-badge     badge ✓/⚠️ ← ใหม่
```

---

## 9. KNOWN ISSUES / NEXT CANDIDATES

### V2.x candidates
```
- ⚠️ VALIDATE _ADHIKAVARA_YEARS (ด่วน — ดูหัวข้อ 4)
- Copy report text
- Canvas pinch-zoom mobile
- Retrograde tooltip
```

### V3.0
```
- Interpretation Layer TH (~300-500 entries) + Supabase
- Synastry bi-wheel + interpretation
- ระบบเสียง + AI connector (Natural Language generation)
```

---

## 10. DECISIONS LOG

| # | เรื่อง | ตัดสินใจ |
|---|--------|----------|
| 15 | About tab structure | App Look 2 sub-page (main + contact) |
| 16 | ดาววงนอก | btn-view=ดวงนอก เท่านั้น, เลขไทย, สีม่วงอ่อน |
| 17 | Toggle independence | isV2 override _outerState (not lock) |
| 18 | Save/share UX | long-press 1.5s + progress bar |
| 19 | Compare report | buildCompareReport แยก, style ตรง buildReport |
| 20 | Lunar tithi | avoman โดยตรง ไม่ผ่าน Y_MON, 06:00 ref |
| 21 | Adhikamasa | lunation counting จากต้นปี จ.ศ. |
| 22 | Adhikavara | lookup table (myhora) แทน formula threshold |
| 23 | Version display | ตรง code version ทุกครั้ง, 4 จุดพร้อมกัน |
| 24 | Lunar info page | หน้าใหม่ #about-lunar ใน tab-2 |

---

## 11. CHANGELOG

- V2.2.1  SW CACHE bump (Chrome cache fix)
- V2.2.2  About logo 746, Task 5/6/7/8, Task 4 quick memory, sound ย้าย tab-0
- V2.2.3  btn-view = ดวงใน/ดวงนอก, VIEW_LABELS, cycleMemory split, _redraw refactor
- V2.2.4  เลขไทย 52px #9b7fd4, logo lx+8
- V2.2.5  toggleView auto-force outerState=4 (ถูก revert)
- V2.2.6  lock toggleOuter (ถูก revert)
- V2.2.7  mutual exclusion rendering (isV2 override), remove lock/save-restore
- V2.2.8  logo ly=0 (fix clip)
- V2.2.9  btn-outer hide, blink ◀▶, compare report, long-press 3s
- V2.2.10 calculateChart1/2 ใช้ _applyViewMode (fix bypass bug)
- V2.2.11 long-press 1.5s, context menu fix, compare report style pass 1
- V2.2.12 buildCompareReport style ตรง buildReport (CL, padding, line-height)
- V2.2.13 Adhikamasa: lunation counting, เดือน 8/8 ถูกต้อง
- V2.2.14 Tithi: avoman formula, dawn 06:00, ไม่แตะ Y_MON/engine
- V2.2.15 Adhikavara: เดือน 7 full/hollow, hollow month boundary fix
- V2.2.16 Adhikavara lookup table (myhora), version display sync, หน้า about-lunar

---

## 12. ไฟล์แนบ session ถัดไป

```
script.js    V2.2.16   ← จำเป็น
index.html   V2.2.16   ← ถ้ามี task เกี่ยวกับ UI/HTML
style.css    V2.2.16   ← ถ้ามี task เกี่ยวกับ CSS
sw.js        V2.2.16   ← ถ้า bump version
```

ไม่ต้องแนบ: PNG files, manifest.json (ไม่เปลี่ยน), session handoff เก่า
