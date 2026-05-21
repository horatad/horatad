# Horatad — Session Handoff
# Date: 2026-05-20 (session 1 ของวัน)
# Previous: session_handoff_20260519_v4.md

## STATE

```
App version : V2.2.39 (main + deployed via GitHub Pages → horatad.com)
script.js   : APP_VERSION='2.2.39' + window.APP_VERSION expose
sw.js       : CACHE_NAME='horatad-v2.2.39'
version.json: {"_id":"HORATAD:VERSION","v":"2.2.39"}
v3/v3tab.js : Version 3.0.4 (sync app V2.2.39)
GitHub      : main = claude/fix-memory-list-edit-znEDH = 95b98f4
Backups     : backup/v2.2.37, backup/v2.2.38, backup/v2.2.39,
              backup/v2.2.39-docs, backup/v2.2.39-infra
```

---

## DONE (session นี้)

```
✓ V2.2.38 ปุ่ม ✏️ แก้ไข memory list (req 20)
  - _addMemory รับ replaceKey ลบ entry เดิมแม้ key เปลี่ยน
  - _editMemory จำ key + section ก่อนโหลดเข้าฟอร์ม
  - clear edit state ใน _pickMemory/_quickLoad/openMemory

✓ V2.2.39 V3 tab fixes
  - toast race: ย้าย toast หลัง _v3Running + _getNatal guard
  - kb.json cache key: KB_PATH ใส่ ?v=APP_VERSION ตรงกับ SW
  - script.js expose window.APP_VERSION ให้ ES module ใช้

✓ CLAUDE.md — project conventions + autonomy mode + handoff template

✓ Infra (D)
  - scripts/check-version-sync.mjs — validate 11 patterns ใน 6 ไฟล์
  - scripts/bump-version.mjs — bump ครบ 6 จุดอัตโนมัติ
  - .github/workflows/ci.yml — syntax + version sync ทุก push/PR
  - DEPLOY.md — production setup, rollback, troubleshooting
  - bump_version.ps1 → delegate ไป node script
  - ลบ push.sh (cruft)

✓ Local main เคลียร์ 5 commits "Add files via upload" ขยะที่ค้าง
```

---

## PENDING — 🟢 Claude ทำเองได้ (sandbox)

เรียงตาม priority (บนสุดทำก่อน):

```
[ ] req 12 — Obfuscate script.js ก่อน deploy
    - GitHub Action ใช้ javascript-obfuscator หรือ terser
    - publish ไป gh-pages branch (main = source clean)
    - หรือ build → dist/ + Pages serve จาก dist
    - หมายเหตุ: ต้องตัดสินใจ deploy strategy ก่อน (gh-pages vs Pages-from-Actions)

[ ] req 13 — Cloudflare Access ล็อก /v3/*
    - frontend: เพิ่ม Access JWT header ใน fetch (v3tab.js, typhoon.js)
    - backend lockdown: CF dashboard config — [USER ONLY] (อยู่ใน list ล่าง)

[ ] V3 tab — เก็บผลพยากรณ์ล่าสุดใน localStorage
    - กดปุ่ม "ดูกฎ" / "Typhoon" ครั้งใหม่ → restore ได้
    - dedup key: natal pos hash
    - (idea — ยังไม่ใน backlog เดิม, propose ใหม่)

[ ] Refactor: ลบ duplicate code re _customLng handling ใน script.js
    - section 1/2 มี logic ซ้ำเกือบหมด → factor เป็น helper
    - scope: 50-100 บรรทัด — clean diff
```

---

## PENDING — 🔴 [USER ONLY] / [BLOCKED]

```
[USER ONLY] ทดสอบ V2.2.37/.38/.39 บนมือถือจริง:
  - V2.2.37 📌 indicator refresh หลัง numpad
  - V2.2.37 ปุ่ม ✕ ออกจากพยากรณ์ (TAB 3)
  - V2.2.38 ปุ่ม ✏️ แก้ไข memory — load + แก้ + ผูกดวงทับของเดิม
  - V2.2.39 V3 toast ไม่ซ้อน + offline ปุ่มพยากรณ์ใช้ kb.json cache ได้

[USER ONLY] CF: deploy / config Worker
  - wrangler deploy horatad-ai (Typhoon proxy)
  - wrangler deploy horatad-auth (PIN validator)
  - CF Access policy บน /v3/* (สำหรับ req 13 backend lockdown)

[BLOCKED] req 16 — Preload historical records → localStorage
  รอ: ไฟล์ historical records จาก user (JSON/CSV)
       + format spec (fields ที่ต้องมี: name, d, m, y_be, t, prov, lat, lng)

[BLOCKED] req 17 — Ephemeris backtest กับตำราอ้างอิง
  รอ: ตำราอ้างอิง expected positions (test cases CSV/JSON)
       + tolerance spec (ลิปดา? อังศา?)
```

---

## DEFERRED — รอ "รอบใหญ่" / dependency

```
[ ] FLICKER (desktop หลัง Ctrl+Shift+R เท่านั้น — mobile ไม่เป็น)
    - SW cache propagation race (version.json reload vs controllerchange)
    - แก้มาหลายครั้งไม่หาย → ยกไปทำพร้อม root cause horatad.com domain/CDN
    - แนวทาง: เลิก version.json reload ใช้แค่ controllerchange

[ ] req 11 — interpretation.js → Cloudflare Worker
    - รอ format นิ่ง (ตอนนี้ยัง iterate อยู่ → ย้ายตอนนี้จะ slow dev loop)
    - revisit เมื่อ interp.js stable + V3 spec finalized
```

---

## Notes สำคัญ

- Branch: develop on `claude/fix-memory-list-edit-znEDH` (harness instruction)
  push main + backup branch อัตโนมัติทุก commit (CLAUDE.md standing instruction)
- main = production (GitHub Pages → horatad.com via CNAME)
- Worker (horatad-ai, horatad-auth) แยก deploy ผ่าน wrangler ไม่ใช่ git push
- V3 tab ซ่อน — PIN 6 หลัก → POST `horatad-auth/api/auth` → 200 = unlock
- CI: `.github/workflows/ci.yml` block push ถ้า version sync ผิด หรือ syntax error
