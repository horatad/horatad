# Horatad — Session Handoff
# Date: 2026-05-20 (session 12 ของวัน)
# Previous: session_handoff_20260520_v11.md

## STATE
App version : V3.2.0 (main + deployed)
Backups     : backup/v3.2.0, backup/v3.1.7, ...

## DONE (session นี้)
✓ Architecture discussion: ยืนยัน unified DB schema
  - natal ↔ person/event: ใช้ `linkedNatalUid` (child→parent)
  - natal ↔ group: `group.memberUids[]` (parent→child)
✓ **V3.2.0: Unified DB Architecture refactor**
  - รวม DB1/DB2/BUFFER/EVENT_SLOTS → `horatad_db_v4` (type='natal'|'person'|'event'|'group')
  - ลบ bidirectional link (linkedEvents[]) ออกจาก natal
  - migration V3→V4 อัตโนมัติ, preserve data เดิม
  - ลบ cap 10 ออกจาก buffer/event slots
  - export/import รองรับ format ใหม่ + backward compat
  - Syntax check ✓, version sync ✓, pushed main + backup/v3.2.0

## PENDING — 🟢 Claude ทำเองได้ (sandbox)

[ ] **Group UI (Phase 12)** — สร้าง/แก้ไข/ลบ group records
    - สร้าง group: กรอกชื่อ → `_dbUpsert({uid, type:'group', name, memberUids:[], savedAt})`
    - เพิ่ม natal เข้า group: popup เลือก natal → push uid เข้า group.memberUids → _dbUpsert(group)
    - แสดงใน DB1 browser: แท็บแยก หรือ ตัวกรอง type
    - UI entry point: ปุ่มใน ⚙️ menu (เพิ่มแถว "👥 กลุ่ม")

[ ] **Transit strip UI (Phase 13)** — date input บน TAB 1 ใต้แผนผัง
    - date input default วันนี้ (y_be, m, d, t)
    - toggle เปิด/ปิดดวงจร (ใช้ `_reportTransitShow` ที่มีอยู่)
    - linked events picker: dropdown events ที่ linkedNatalUid===natal1.uid
    - เมื่อเลือก event → โหลดเป็น transit source
    - ควรอยู่ใต้ header ก่อน tag row

[ ] **_db1Edit compat check** — ตอนนี้ _v3UpsertDB1 ลบ linkedEvents/linkedNatal
    จาก record เดิมแล้ว — ตรวจให้แน่ใจ edit flow ไม่ทำให้ข้อมูล type/linkedNatalUid สูญหาย
    ปัจจุบัน: normed = {...rec, type:'natal'} → อาจลบ linkedNatalUid ถ้า natal record
    มันไม่ควรมี linkedNatalUid อยู่แล้ว ✓ (natal ไม่ใช้ field นั้น)

[ ] **DB1 browser — แยก type** — ตอนนี้ `_renderDB1List` แสดงเฉพาะ type='natal'
    ควรมี tab หรือ filter แสดง person/event/group ด้วย

## PENDING — 🔴 [USER ONLY] / [BLOCKED]
[ ] [USER ONLY] ทดสอบ V3.2.0 บนมือถือ:
    - migration V3→V4 ทำงานถูกต้อง (ข้อมูลเดิมยังอยู่)
    - สมพงศ์ popup แสดง list ถูกต้อง
    - event slots popup แสดง list ถูกต้อง
    - เหตุการณ์จรใน tag row กรองตาม natal1 ถูกต้อง
    - export/import ยังใช้งานได้
[ ] [USER ONLY] CF: deploy horatad-ai Worker (Phase 11 sync/cloud)
[ ] [BLOCKED] Phase 11 sync/cloud — รอยืนยัน server

## DEFERRED — รอ "รอบใหญ่" / dependency
[ ] req 11 interp.js → Worker — รอ format นิ่ง
[ ] req 12/13/16/17 — รอ data/dependency
[ ] FLICKER (fixed V3.1.6, แต่ยังรอ verify horatad.com)

---
## Schema Reference (V3.2.0)

```js
// horatad_db_v4 (localStorage)
// natal
{ uid, type:'natal', name, gender, d, m, y_be, t, prov, lat, lng, jd, pos, vel, savedAt }
// person (สมพงศ์/คนเปรียบเทียบ)
{ uid, type:'person', ..., linkedNatalUid }
// event (เหตุการณ์จร)
{ uid, type:'event', ..., linkedNatalUid }
// group
{ uid, type:'group', name, memberUids:[], savedAt }

// Query helpers
_dbPersons(linkedNatalUid?)  // persons ทั้งหมด หรือ filter ตาม natal
_dbEvents(linkedNatalUid?)   // events ทั้งหมด หรือ filter ตาม natal
_dbGroups()                  // groups ทั้งหมด
_dbFind(uid)                 // หา record ใดๆ ตาม uid
_dbRemove(uid)               // ลบ record ใดๆ
_dbUpsert(rec)               // insert/update record ใดๆ

// groups ที่ natal1 เป็นสมาชิก (O(n) scan)
_dbGroups().filter(g => g.memberUids.includes(natal1.uid))
```
