# Horatad — Session Handoff
# Date: 2026-05-20 (session 6 ของวัน)
# Previous: session_handoff_20260520_v5.md

## STATE

```
App version : V3.0.5 (main + deployed)
script.js   : APP_VERSION='3.0.5'
sw.js       : CACHE_NAME='horatad-v3.0.5'
version.json: {"_id":"HORATAD:VERSION","v":"3.0.5"}
v3/v3tab.js : Version 3.0.4 (ไม่แตะ — ES module ใช้ getNatal() ซึ่งยังชื่อเดิม)
GitHub      : main = claude/continue-work-KDez9 = 9f6b0ba
Backups     : backup/v2.2.37–43, v3.0.0–v3.0.5
```

---

## DONE (session นี้)

```
✓ V3.0.4 Phase 1B Step 4 — mode-aware navigator + buffer auto-save:
  - cycleMemory(): viewMode=0 → cycle MEM_KEY, viewMode=1 → cycle buffer
  - calculateChart2() → set natal2 ทันที + auto-save to buffer (dedup by name|d/m/y_be)
  - _updateNavHeader(): viewMode=1 → "[นอก] name·date (i/N buffer)"

✓ V3.0.5 Phase 1B Step 5 — rename vars semantic:
  - _natal  → natal1  (primary natal chart)
  - _natal2 → natal2  (outer ring / compare)
  - _transit → _chart2 (raw form-2 chart — feeds natal2, ใช้ interp/memory)
  - getNatal() ยังชื่อเดิม (v3tab.js ES module compat)
  - JS syntax OK, logic flow verified

▶ Phase 1B ครบ 5/5 steps แล้ว
```

---

## PENDING — 🟢 Claude ทำเองได้ (Phase 2+)

```
[ ] Phase 2 — Event panel + bidirectional linkedEvents:
  - Event popup ใน ⚙️ menu (slot list 1-10, DB2, form: event + link dropdown)
  - link event → natal1 (linkedNatal) + natal1 → event (linkedEvents)
  - แสดง event list ใน report panel (TAB 1)
  - ใช้ _v3LoadEventSlots/_v3SaveEventSlots ที่ Phase 1A สร้างไว้

[ ] Phase 3 — Tag area semantic toggle:
  - linked-event names ↔ category (toggle ตาม เหตุการณ์จร state)
  - แทนที่ tag row เดิมใน TAB 0

[ ] Phase 4 — QR scan import:
  - รับ payload format V2.2.43 (lat/lng based)
  - import → fill form → ผูกดวงอัตโนมัติ
```

---

## PENDING — 🔴 [USER ONLY]

```
[USER ONLY] ทดสอบ V3.0.5 บนมือถือจริง — regression check Phase 1B:
  - ✅ TAB 1: header strip [◀ ชื่อ (i/N) ▶ ⚙️] ปรากฏหลังผูกดวง
  - ✅ ผูกดวง 1 → header แสดง "ชื่อ · ด/ด/ปปปป (i/N)"
  - ✅ ผูกดวง 2 → header เปลี่ยนเป็น "[นอก] ชื่อ2 · (i/N buffer)"
  - ✅ ⚙️ → menu → มุมมอง/เหตุการณ์จร toggle ทำงาน
  - ✅ ⚙️ → สมพงศ์ → มีรายการจาก buffer หลังผูกดวง 2 แล้ว
  - ✅ ◀▶ ขณะ viewMode=0 → cycle DB1 (ดวงใน)
  - ✅ ◀▶ ขณะ viewMode=1 → cycle buffer (สมพงศ์)
  - ❗ ถ้า regression → revert ที่ V3.0.1 (61bc9e0) ได้

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

## Notes — Phase 2 entry point

```
Phase 2 Event panel ต้องทำในลำดับนี้:
1. เพิ่ม "เหตุการณ์" row ใน ⚙️ menu (เหมือน สมพงศ์ row)
2. เพิ่ม event popup (reuse memory-modal CSS) — list EVENT_SLOTS_KEY
3. JS: _openEventPopup(), _renderEventList(), _eventLoad(), _eventDelete(), _eventNew()
4. เชื่อม linkedNatal: เมื่อ event load → store link ไว้ใน event object
5. Report panel แสดง linked events (optional for Phase 2)

Variables ที่ใช้: EVENT_SLOTS_KEY='horatad_event_slots_v3' (Phase 1A)
Functions ที่มีแล้ว: _v3LoadEventSlots(), _v3SaveEventSlots()
```
