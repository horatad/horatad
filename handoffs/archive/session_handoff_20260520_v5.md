# Horatad — Session Handoff
# Date: 2026-05-20 (session 5 ของวัน)
# Previous: session_handoff_20260520_v4.md

## STATE

```
App version : V3.0.3 (main + deployed)
script.js   : APP_VERSION='3.0.3'
sw.js       : CACHE_NAME='horatad-v3.0.3'
version.json: {"_id":"HORATAD:VERSION","v":"3.0.3"}
v3/v3tab.js : Version 3.0.4 (ไม่แตะ — V3 tab ไม่เกี่ยว Phase 1B)
GitHub      : main = claude/continue-work-KDez9 = 5a0d68a
Backups     : backup/v2.2.37–43, v3.0.0, v3.0.1, v3.0.2, v3.0.3
```

---

## DONE (session นี้)

```
✓ V3.0.2 Phase 1B Step 2 — chart-nav-header strip + ⚙️ menu skeleton:
  - เพิ่ม #chart-nav-header [◀ ชื่อ·วันเกิด (i/N) ▶ ⚙️] เหนือ canvas
  - ซ่อน #btn-chart-row (DOM elements ยังอยู่ — _applyViewMode() ทำงานได้)
  - เพิ่ม #main-menu-backdrop + #main-menu-modal (Step 2: skeleton ว่าง)
  - เพิ่ม _updateNavHeader(), _openMainMenu(), _closeMainMenu()
  - _redraw() เรียก _updateNavHeader() ทุกครั้ง → header แสดงชื่อ·วันเกิด·ตำแหน่ง (i/N)
  - ESC ปิด main menu

✓ V3.0.3 Phase 1B Step 3 — main menu content + สมพงศ์ slot popup:
  - ⚙️ แสดง 3 รายการ: มุมมอง (toggle ดวงใน/นอก), เหตุการณ์จร (toggle แสดง/ซ่อน), สมพงศ์ (N/10)
  - badge/button อัปเดตตาม state ปัจจุบันทันทีตอน _openMainMenu()
  - สมพงศ์ popup: list buffer slots (name + date) พร้อม load/delete/new
    * load → โหลดลง _natal2 + switch viewMode=1 + redraw
    * delete → confirm → ลบจาก BUFFER_KEY
    * "+ สร้างดวงใหม่" → switch TAB 0 + toast แนะนำ
  - ESC ปิด sompong popup ด้วย

หมายเหตุ: buffer (BUFFER_KEY='horatad_buffer_v3') ยังไม่มี auto-save logic
  → user จะเห็น "ยังไม่มีดวงใน buffer" จนกว่าจะมีกลไก save เข้า buffer
  → Step 4+ จะ wire save-to-buffer เมื่อ calculateChart2 + link natal
```

---

## PENDING — 🟢 Claude ทำเองได้ (Phase 1B Step 4-5)

```
[ ] V3.0.4 Phase 1B Step 4 — Navigator (◀▶) wire to mode + buffer save:
  - chart-nav-header ◀▶ ปัจจุบัน call cycleMemory() (เหมือนเดิม — cycle DB1)
  - Step 4: เพิ่ม mode-aware cycling:
    * _viewMode=0 (ดวงใน): ◀▶ cycle DB1 เหมือนเดิม
    * _viewMode=1 (ดวงนอก): ◀▶ cycle buffer (horatad_buffer_v3) → load to _natal2
  - เพิ่ม auto-save to buffer: เมื่อ calculateChart2() สำเร็จ → push to buffer ถ้าไม่ซ้ำ
  - อัปเดต header info แสดงชื่อ _natal2 เมื่อ _viewMode=1

[ ] V3.0.5 Phase 1B Step 5 — Refactor rename:
  - _natal → natal1, _transit → natal2 (semantic clarity)
  - ทำหลัง UI working ทั้งหมด — touch dozens of references

[ ] V3.0.6+ Phase 2-4:
  - Phase 2: event panel + bidirectional linkedEvents
  - Phase 3: Tag area semantic toggle (linked-event names ↔ category)
  - Phase 4: QR scan import (payload V2.2.43 compat)
```

---

## PENDING — 🔴 [USER ONLY]

```
[USER ONLY] ทดสอบ V3.0.3 บนมือถือจริง:
  - ✅ TAB 1: ไม่มี toggle buttons เก่าแล้ว — เห็นแค่ canvas + ◀▶⚙️ header + save/share/ทำนาย
  - ✅ ⚙️ เปิดเมนู → เห็น 3 รายการ (มุมมอง / เหตุการณ์จร / สมพงศ์)
  - ✅ toggle มุมมอง/เหตุการณ์จร ทำงาน (badge เปลี่ยน)
  - ✅ สมพงศ์ → popup เปิด (เห็น "ยังไม่มีดวงใน buffer" ถ้าไม่มีข้อมูล)
  - ✅ ◀▶ ใน header cycle ดวงใน DB1 (เหมือน V3.0.1)
  - ❗ ถ้า regression → revert ที่ V3.0.1 (commit 61bc9e0) ได้

[USER ONLY] ทดสอบ V3.0.1 (Step 1) ค้างจาก session ก่อน

[USER ONLY] CF: deploy / config Worker (เหมือนเดิม)
```

---

## DEFERRED — รอ "รอบใหญ่" / dependency

```
[ ] FLICKER (desktop Ctrl+Shift+R) — รอ V3 รอบใหญ่จบก่อน
[ ] req 11 interp.js → Worker — รอ format นิ่ง
[ ] req 12 obfuscate — รอ V3 stable
[ ] req 13 CF Access frontend — รอ user decide
[ ] req 16, 17 — รอ data file
```

---

## Notes

- **Buffer empty state** ปกติ — ยังไม่มี save-to-buffer trigger (Step 4 จะเพิ่ม)
- **_viewMode=1 guard**: _openSompongPopup() ยังไม่เปลี่ยน viewMode — user ต้อง load slot ก่อน
- **Session limit**: push 2 versions ใน session นี้ → checkpoint แล้ว
  ถ้า user ให้ทำต่อ → Step 4 (mode-aware cycle + buffer save)
