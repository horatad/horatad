# Horatad — Session Handoff
# Date: 2026-05-20 (session 13 ของวัน)
# Previous: session_handoff_20260520_v12.md

## STATE
App version : V3.2.1 (main + deployed)
Backups     : backup/v3.2.1, backup/v3.2.0, backup/v3.1.7

## DONE (session นี้)
✓ Unified DB V4 schema — single key `horatad_db_v4`, types: natal/person/event/group
✓ Migration อัตโนมัติจาก V3 keys (DB1→natal, BUFFER→person, EVENT_SLOTS→event, DB2→event)
✓ Core CRUD: _dbLoad/_dbSave/_dbFind/_dbRemove/_dbUpsert/_dbLoadType/_dbSaveType
✓ Type queries: _dbPersons(linkedNatalUid?), _dbEvents(linkedNatalUid?), _dbGroups()
✓ Natal shims ย้อนหลัง: _v3LoadDB1→_dbLoadType('natal'), etc.
✓ linkedNatalUid เป็น single source of truth บน person/event (child→parent)
✓ _v3Record factory รับ type parameter; _v3UpsertDB1 ใช้ unified _dbLoad/_dbSave
✓ H2 HMAC format: `H2|{hmac8}|{jd}|{t}|{lat}|{lng}|{g}|{name}`
  - HMAC-SHA256 ผ่าน SubtleCrypto (no external dep), H2_SECRET='HTD-H2-2026-K1'
  - _hmac8(), _verifyH2() async helpers
  - QR generation: H1 → H2, URL format: `?h=H2|{hmac}|{data}`
  - _parseH1Payload รองรับ H1+H2, _doQRImportFromText verify H2 warn H1
✓ saveChart() — Web Share API บน mobile (ไม่มี folder picker)
✓ _importFromImageFile() — BarcodeDetector native → jsQR CDN fallback
  อ่าน QR จากไฟล์รูป → ผูกดวงอัตโนมัติ (local only, PDPA compliant)
✓ index.html: "📷 เลือกรูปดวง" label + hidden file input ใน QR import modal
✓ Version bump V3.2.1 ครบ 6 จุด + CHANGELOG
✓ Push: feature branch + ff main + backup/v3.2.1

## PENDING — 🟢 Claude ทำเองได้ (sandbox)

[ ] Group UI (Phase 12) — create/edit/delete group records
    - entry point: ⚙️ menu → "กลุ่ม" หรือ button ใหม่
    - group record: `{uid, type:'group', name, memberUids[], note, created}`
    - UI: list groups, create new, add/remove natal members, delete
    - _dbGroups() พร้อมแล้ว

[ ] DB browser type filter — tabs: ดวงชาตา / คน-เหตุการณ์ / กลุ่ม
    - ปัจจุบัน _renderDB1List แสดงเฉพาะ natal
    - เพิ่ม tab สำหรับ person/event/group

[ ] Transit strip UI (Phase 13) — date input ใต้ chart, toggle, linked events picker
    - UI: date picker row, "เปิด/ปิด จร" toggle, dropdown เลือก event ที่ link กับ natal ปัจจุบัน

[ ] _exportDB/_importDB — ทดสอบ round-trip V4 format
    - ปัจจุบัน export ใส่ `db:_dbLoad()` + backward compat
    - verify import จาก old format (db1[]+eventSlots[]) ยังทำงานได้

## PENDING — 🔴 [ทดลองใช้] / [BLOCKED]

[ ] [ทดลองใช้] ทดสอบ V3.2.1 บนมือถือ:
    - saveChart() Web Share API → บันทึกรูปไม่ผ่าน folder picker
    - "📷 เลือกรูปดวง" → BarcodeDetector → ผูกดวงอัตโนมัติ
    - H2 QR: scan จาก URL param (?h=H2|...)
    - Migration V3→V4: ข้อมูลเดิมยังอยู่ครบ

[ ] [ทดลองใช้] CF: deploy horatad-ai Worker (ถ้ามี update)

[ ] [BLOCKED] Phase 11 sync/cloud — รอ CF server confirmation

## DEFERRED — รอ "รอบใหญ่" / dependency

[ ] FLICKER (desktop only) — รอบใหญ่ + root cause horatad.com
[ ] req 11 interp.js → Worker — รอ format นิ่ง
[ ] H3 Ed25519 — future payment flow (L3 security), รอ CF Worker infrastructure พร้อม

## NOTES

### H2 Security
- H2_SECRET='HTD-H2-2026-K1' hardcoded ใน script.js (L2 tradeoff)
- L3 migration: เพิ่ม H3 parser ใน _doQRImportFromText, CF Worker sign+verify
- ไม่ break H2 QR ที่ผลิตแล้ว — parser รองรับ H1/H2/H3 parallel

### DB V4 Architecture
- Single key: `horatad_db_v4` = `{records: [...], version: 4}`
- Types: natal | person | event | group
- linkedNatalUid บน person/event (child→parent, single source of truth)
- group.memberUids[] = array ของ natal UIDs
- Migration: ครั้งเดียว, ตรวจ SCHEMA_VERSION !== 4

### jsQR CDN
- Load on-demand เฉพาะตอน BarcodeDetector ไม่มี
- URL: `https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js`
- Resize image 1500px max ก่อน decode
