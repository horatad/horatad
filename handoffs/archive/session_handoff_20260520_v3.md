# Horatad — Session Handoff
# Date: 2026-05-20 (session 3 ของวัน)
# Previous: session_handoff_20260520_v2.md

## STATE

```
App version : V3.0.0 (main + deployed)
script.js   : APP_VERSION='3.0.0' + V3 schema layer (ready, UI not wired)
sw.js       : CACHE_NAME='horatad-v3.0.0'
version.json: {"_id":"HORATAD:VERSION","v":"3.0.0"}
v3/v3tab.js : Version 3.0.4 (sync app V3.0.0)
GitHub      : main = claude/initial-setup-a6bUS = 0e283fa
Backups     : backup/v2.2.37, .38, .39 (+.39-docs, .39-infra), .40, .41, .42, .43, v3.0.0
```

---

## DONE (session นี้)

```
✓ V2.2.40 Refactor calculateChart1/2 → _calcChart(num) + _CHART_CFG (no behavior change)

✓ V2.2.41 Share image layout:
  - Logo 180→200, ขยับเข้า 10px จากขอบขวา chart-canvas
  - QR 125→250 ตำแหน่งเดิม (28, 820) → bottom y=1070
  - QR payload "H1|JD|T|PROV|LNG|G|NAME" (Option B + JD reference)
  - horatad.com Cinzel → Sarabun → render lowercase จริง

✓ V2.2.42 Bug fix QR overflow:
  - "code length overflow (1060>976)" — Thai UTF-8 (3 bytes/char) ทำ payload โต
  - ECC H → M (15% recovery, 30%→15%) — QR 250x250 ใหญ่พอ M อ่านได้ดี

✓ V2.2.43 QR payload: PROV string → LAT|LNG (~12 bytes vs ~40 bytes)
  - "H1|JD|T|LAT|LNG|G|NAME" — ลด payload ~28 bytes
  - scan-side reverse จาก lat → ใช้ PROVINCES_LAT lookup

✓ V3.0.0 Phase 1A: Schema migration + storage layer (foundation, no UI)
  - Uniform schema (uid, name, gender, d/m/y/t, prov, lat/lng, jd, pos, vel,
    savedAt, linkedEvents[], linkedNatal) ทั้ง 4 vars
  - Keys: horatad_db1_v3, horatad_db2_v3, horatad_buffer_v3, horatad_event_slots_v3
  - Migration: ล้าง horatad_memory_v1, horatad_events_v1 ครั้งเดียว (breaking — user OK)
  - V3 storage API: _v3Record, _v3LoadDB1/Save/Add/Find/Remove, mirror DB2,
    _v3LoadBuffer/Save, _v3LoadEventSlots/Save, _v3LinkEventToNatal/_v3UnlinkEvent
  - Toast notice 1 ครั้งหลัง migrate (key MIGRATION_NOTICE_KEY)
```

---

## PENDING — 🟢 Claude ทำเองได้ (Phase 1B — สำคัญสุดเริ่มก่อน)

```
[ ] V3.0.1 Phase 1B (UI rework) — wireframe approved แล้ว ใน session นี้

  Sub-task 1: TAB 0 cleanup
    - ลบ section 2 (ดวงที่ 2) HTML + clearForm('2') refs + section-2 CSS
    - ลบ section "วันที่จร" จาก TAB 0 (ย้ายไป popup ใน TAB 1)
    - calculateBoth ใช้แค่ calculateChart1 (ลบเรียก chart2)
    - ลบ id 'name-2', 'gender2', 'd2'/'m2'/'y2'/'t2', 'prov2', 'btn-cust2', 'prov-list-2'
    - ลบ id 'name-event', 'dt'/'mt'/'yt'/'tt', 'provt', 'btn-custt', 'prov-list-t'
    - clearForm รับ '1' อย่างเดียว

  Sub-task 2: TAB 1 minimal layout
    - ลบปุ่ม btn-view-prev, btn-view, btn-view-next, btn-outer, btn-chart-type, btn-transit
    - เพิ่ม header strip: [◀ ชื่อ + วันเกิด + meta ▶] + [⚙️ menu]
    - คงไว้: chart canvas, report, [💾 บันทึก] [📤 แชร์]
    - position: ทุก control ใหม่ใน btn-chart-row → ย้ายเป็น minimal layout

  Sub-task 3: ⚙️ Menu popup + unified template
    - Main menu popup: มุมมอง (ดวงใน/นอก toggle), เหตุการณ์จร (แสดง/ไม่), สมพงศ์ (buffer N/10),
      Tags (จัดการ)
    - Unified popup template สำหรับ Sompong + Event (slot list + DB picker + + สร้างใหม่ form)
    - Sompong popup: slot=buffer, DB=DB1, form=full natal (gender required)
    - Event popup: slot=event_slots, DB=DB2, form=event (gender='-', + link to natal1 dropdown)
    - Reuse _showAlert/_showConfirm UI patterns

  Sub-task 4: Navigator (◀ ▶) wire to mode
    - mode=ดวงใน → cycle DB1 entries → load to natal1 (overwrite form)
    - mode=ดวงนอก → cycle buffer entries → load to natal2
    - แสดง position indicator (i/N) + meta

  Sub-task 5: Refactor _natal → natal1, _transit → natal2 (semantic rename)
    - ทำหลัง UI ใหม่ working — ลด risk
```

```
[ ] V3.0.2 Phase 2 — เหตุการณ์จร panel + bidirectional linkedEvents
    (พึ่งทำ schema link ใน Phase 1A แล้ว — แค่ wire UI)

[ ] V3.0.3 Phase 3 — Tag area semantic เปลี่ยน:
    - state=แสดง: แสดง linked-event names
    - state=ไม่แสดง: แสดง V2.2.34 category tags
    - User decision (session นี้): "toggle แสดงสลับกัน ตามปุ่มแสดงเหตุการณ์จร"

[ ] V3.0.4 Phase 4 — QR scan import (payload format พร้อมแล้ว V2.2.43):
    - jsQR lib (~50KB) load on-demand
    - file input <input type="file" accept="image/*">
    - JD reverse: _jdToDMY(jd) → {d, m, y_be}
    - LAT reverse: PROVINCES_LAT closest match → prov name
    - flow: scan → decode H1|JD|T|LAT|LNG|G|NAME → populate form (no auto-calc — user verify)
```

---

## PENDING — 🔴 [USER ONLY]

```
[USER ONLY] ทดสอบ V2.2.40-43 + V3.0.0 บนมือถือจริง:
  - V2.2.40 ผูกดวง 2 sections (refactor regression)
  - V2.2.41 share image — logo ขยับ, QR ใหญ่, horatad.com lowercase
  - V2.2.42 QR ไม่ overflow (ดูว่ามี QR บนรูปจริง)
  - V2.2.43 QR payload ใหม่ — scan ด้วย QR reader app ดูเป็น "H1|..."
  - V3.0.0 migration notice toast แสดงครั้งเดียว; reopen app ไม่แสดงอีก

[USER ONLY] CF: deploy / config Worker (เหมือนเดิม)
  - wrangler deploy horatad-ai (Typhoon proxy)
  - wrangler deploy horatad-auth (PIN validator)
  - CF Access policy บน /v3/* (สำหรับ req 13)
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

## Notes สำคัญ — Phase 1B

- **Wireframe approved (session นี้):**
  - TAB 1 minimal = header strip + chart + report + save/share
  - 1 ⚙️ menu button → main popup → sub-popups
  - Sompong + Event popups ใช้ template เดียวกัน (slot list + DB picker + + form)
  - Navigator arrows ◀ ▶ บน header strip (เหนือ chart)
  - Tag area toggle ตาม "เหตุการณ์จร" state (แสดง=linked events, ไม่แสดง=category)

- **Schema V3 พร้อมแล้ว** — UI ใหม่เรียก _v3* functions ได้เลย ไม่ต้องสร้าง storage ใหม่

- **Backward break OK** — DB เก่า cleared แล้วใน V3.0.0 ตอน user mobile-test (lose existing data)

- **Risk Phase 1B:** UI rework กระทบ HTML ids + event listeners + _viewMode state machine
  - แนะนำ commit ทีละ sub-task (5 commits) + smoke test ระหว่างกลาง

- **session limit signal:** session นี้ push 5 versions แล้ว (V2.2.40-43 + V3.0.0)
  → checkpoint แล้ว, รอ session ใหม่สำหรับ Phase 1B
