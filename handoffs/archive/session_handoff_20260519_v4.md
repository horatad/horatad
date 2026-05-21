# Horatad — Session Handoff
# Date: 2026-05-19 (session 4)
# Previous: session_handoff_20260519_v3.md

---

## STATE ปัจจุบัน

```
App version : V2.2.42 (deployed ✓)
script.js   : APP_VERSION='2.2.42'
sw.js       : CACHE_NAME='horatad-v2.2.42'
version.json: {"v":"2.2.42"}
index.html  : V2.2.42 (tag rows, add-tag modal, alert popup, clear button, DB indicator)
style.css   : V2.2.42 (tag chip gray/purple, alert-blink, add-tag-ok green)
GitHub      : main branch — last commit bc31a8b
```

---

## สิ่งที่ทำใน session นี้

```
✓ V2.2.40 — เสียงทุกปุ่ม (global listener) + QR auto-save+navigate + tag groups (4/dวง)
✓ V2.2.41 — Fix QR หายจาก share image บน iOS (img onload race)
✓ V2.2.42 — Share image layout ใหม่ + filename JD+เวลา+lat + tag UX overhaul
            + popup alert ค้างกระพริบ + ปุ่มเคลียร์ฟอร์ม + 📌 DB indicator
            + auto-save groups ตอน toggle
```

---

## งานที่ค้าง (priority สูง→ต่ำ)

```
[ ] ทดสอบ V2.2.42 บนมือถือจริง — ยังไม่ confirm ฟังก์ชั่นใหม่ใช้ได้
    (PWA cache: ต้อง hard refresh 2 รอบ หรือ unregister SW)

[ ] DB indicator ไม่ update เมื่อกด numpad (เวลา/lng)
    เหตุ: numpad ใช้ readonly+click ไม่ fire 'input' event
    แก้: เรียก _updateDbIndicator(section) ใน numpad commit handler

[ ] DEPLOY.md แก้ผิด — ระบุ Cloudflare Pages แต่จริงๆ คือ GitHub Pages
    (มีแค่ horatad-ai + horatad-auth ที่อยู่ Cloudflare Workers)

[ ] wrangler deploy สำหรับ horatad-ai Worker — แยกจาก git push
    ต้องตั้ง TYPHOON_API_KEY ใน Cloudflare Dashboard ด้วย

[ ] QR format เก่า (JD:xxx|T:xxx|LAT:xxx pipe-delimited) อ่านไม่ได้
    user ยืนยัน: ไม่ทำ backward compat — กำหนดมาตรฐานเดียวไปเลย
    note: รูปที่ทำก่อน v2.2.40 ใช้ไม่ได้กับ QR reader ปัจจุบัน
```

---

## Pending จาก v2 (ยังไม่ทำ)

```
[ ] req 11 — ย้าย interpretation.js → Cloudflare Worker
[ ] req 12 — Obfuscate script.js ก่อน deploy
[ ] req 13 — Cloudflare Access ล็อก /v3/*
[ ] req 15 — Default tags เพิ่ม: ตัวอย่าง/verified/AA/historical
[ ] req 16 — Preload historical records เข้า localStorage
[ ] req 17 — Ephemeris backtest กับตำราอ้างอิง
[ ] req 19 — t_local=null → warning "ไม่ทราบเวลาเกิด"
[ ] req 20 — แก้ไขข้อมูลใน memory list
```

---

## Next Priority

```
1. ผู้ใช้ทดสอบ V2.2.42 บนเครื่องจริง — confirm/report bug
2. Fix DB indicator update on numpad commit
3. แก้ DEPLOY.md (Cloudflare Pages → GitHub Pages)
```

---

## เครื่องมือสำคัญ (อ่านก่อนเริ่มงาน)

```
- SYSTEM_INSTRUCTION_V3-4.md  → rules + V3 engine spec
- ChgLog19May.md              → ประวัติทุก version
- BEST_PRACTICES_20260519.md  → สรุปสั้น (deploy/push/test)
- session_handoff_20260519_v4.md (ไฟล์นี้)
```

---

## หมายเหตุ

```
- Web session: git push ใน remote execution env — ไม่ต้องใช้ PAT URL
  (ต่างจาก local — local ต้อง set-url ก่อน push)
- main branch: ใช้งานจริง — Claude Code merge มาแล้ว
- v3 tab ซ่อนอยู่ — ต้องกดทำนาย + numpad password 6 หลัก
- Worker (horatad-ai, horatad-auth) แยก deploy ผ่าน wrangler — ไม่ใช่ git push
```
