# Horatad — Session Handoff
# Date: 2026-05-20 (session 11 ของวัน)
# Previous: session_handoff_20260520_v10.md

## STATE

```
App version : V3.1.5 (main + deployed)
script.js   : APP_VERSION='3.1.5'
sw.js       : CACHE_NAME='horatad-v3.1.5'
version.json: {"_id":"HORATAD:VERSION","v":"3.1.5"}
v3/v3tab.js : Version 3.0.4 (ไม่แตะ)
GitHub      : main = claude/continue-work-POM6y = 8c15996
Backups     : backup/v2.2.37–43, v3.0.0–v3.1.5
```

---

## DONE (session นี้)

```
✓ V3.1.3 Phase 9  — DB1 browser list (popup ดูดวงทั้งหมด, ค้นหา, โหลด, ลบ)
✓ V3.1.4 Phase 10 — แก้ไขดวงใน DB1 (✏️ โหลดกลับฟอร์ม + indicator + _editingUid)
✓ V3.1.5          — แก้ข้อความ privacy หน้าเกี่ยวกับให้ครบถ้วน

▶ Phase 1–10 ครบ + privacy text fix
```

---

## PENDING — 🟢 Claude ทำเองได้

```
ไม่มี backlog ที่ทำได้เองตอนนี้
```

---

## PENDING — 🔴 [USER ONLY] / [BLOCKED]

```
[BLOCKED] Phase 11 — Sync/Cloud Backup: รอ user ยืนยัน server
  ต้องการ:
  - ยืนยันใช้ Cloudflare KV (horatad-auth Worker)
  - ยืนยัน auth key approach: UUID random per-device (แนะนำ)
  - สร้าง KV namespace ใน CF dashboard
  - เพิ่ม KV binding ใน wrangler.toml
  (Claude เขียน frontend + Worker endpoint ได้ทันทีเมื่อ user ยืนยัน)

[USER ONLY] ทดสอบ V3.1.3–3.1.5 บนมือถือจริง:
  Phase 9  — ⚙️ → "🗂️ ดาวดวง" → list/ค้นหา/โหลด/ลบ
  Phase 10 — ✏️ → โหลดกลับฟอร์ม → แก้ → ผูกดวง → record อัปเดต
  Phase 11 — รอ server

[USER ONLY] ทดสอบ Phase 6–8 (handoff v10) + Phase 2–5b (handoff v9)

[USER ONLY] CF: deploy / config Worker (เหมือนเดิม)
```

---

## DEFERRED

```
[ ] FLICKER (desktop Ctrl+Shift+R) — รอ V3 รอบใหญ่จบก่อน
[ ] req 11 interp.js → Worker — รอ format นิ่ง
[ ] req 12 obfuscate — รอ V3 stable
[ ] req 13 CF Access frontend — รอ user decide
[ ] req 16, 17 — รอ data file
```

---

## Notes

```
⚙️ menu ตอนนี้มี 8 rows:
  มุมมอง | เหตุการณ์จร | สมพงศ์ | เหตุการณ์ | นำเข้า QR | 📋 คัดลอก URL | 🗂️ ดาวดวง | 📦 ส่งออก/นำเข้า

Phase 11 design (รอ user ยืนยัน):
  - Auth: UUID random เก็บใน localStorage per-device (ไม่ต้อง PIN ซ้อน)
  - Storage: CF KV key="sync:{uuid}" → JSON {db1,eventSlots,updatedAt}
  - Conflict: merge by uid (ไม่ทิ้ง record ฝั่งใด)
  - Frontend: _cloudPush() / _cloudPull() + ⚙️ row "☁️ Sync"
  - Worker: endpoint /sync/push + /sync/pull ใน horatad-auth
```
