# Horatad — Session Handoff
# Date: 2026-05-20 (session 7 ของวัน)
# Previous: session_handoff_20260520_v6.md

## STATE

```
App version : V3.0.6 (main + deployed)
script.js   : APP_VERSION='3.0.6'
sw.js       : CACHE_NAME='horatad-v3.0.6'
version.json: {"_id":"HORATAD:VERSION","v":"3.0.6"}
v3/v3tab.js : Version 3.0.4 (ไม่แตะ)
GitHub      : main = claude/continue-work-POM6y = 428e447
Backups     : backup/v2.2.37–43, v3.0.0–v3.0.6
```

---

## DONE (session นี้)

```
✓ V3.0.6 Phase 2 — Event panel (เหตุการณ์ slots popup):
  - เพิ่ม "เหตุการณ์" row ใน ⚙️ menu (แสดง N/10 count)
  - event-slots-modal popup: list, load → natal2, delete
  - _eventSlotSaveCurrent(): บันทึก _chart2 → EVENT_SLOTS_KEY
    + linkedNatalName / linkedNatalUid จาก natal1 ปัจจุบัน
  - _updateLinkedEventsDisplay(): แสดง linked events ใน report panel (TAB 1)
    กรอง event slots ที่ linkedNatalName === natal1.name
  - report-linked-events div ใน TAB 1 report-panel

▶ Phase 2 ครบ (event popup + linked display)
```

---

## PENDING — 🟢 Claude ทำเองได้

```
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
[USER ONLY] ทดสอบ V3.0.6 บนมือถือจริง — regression check Phase 2:
  - ✅ ⚙️ menu → มี row "เหตุการณ์" แสดง 0/10 ›
  - ✅ ผูกดวง 1 → ผูกดวง 2 → เปิด ⚙️ → คลิก "เหตุการณ์" → popup เปิด
  - ✅ กด "+ บันทึกดวง 2 เป็นเหตุการณ์" → บันทึก + toast แสดงชื่อ + count เพิ่ม
  - ✅ เหตุการณ์ที่บันทึก → คลิกชื่อ → โหลด natal2 + toast
  - ✅ ลบเหตุการณ์ → confirm dialog → ลบออก
  - ✅ กลับ TAB 1 → ใต้ report มี "🔗 เหตุการณ์: ชื่อเหตุการณ์" (ถ้า link ตรงกับ natal1.name)
  - ✅ ⚙️ menu count อัปเดตหลังบันทึก/ลบ
  - ❗ ถ้า regression → revert ที่ V3.0.5 (9f6b0ba)

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

## Notes — Phase 3 entry point

```
Phase 3 Tag area semantic toggle:
- TAB 0 มี tag row (ปัจจุบันแสดง category/trait ของ natal)
- Phase 3: ถ้า viewMode=1 (เหตุการณ์จร) → tag row แสดงชื่อ linked events แทน
- toggle กลับ → แสดง category เดิม
- ไฟล์ที่ต้องแก้: script.js (tag render logic) + index.html (tag row element)

Phase 4 QR scan:
- ปัจจุบัน V2.2.43 มี QR export format (lat/lng)
- import flow: scan → parse payload → fill form 1 fields → calculateChart1()
- ต้องเพิ่ม: QR reader library หรือ manual input popup
```
