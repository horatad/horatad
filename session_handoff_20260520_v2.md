# Horatad — Session Handoff
# Date: 2026-05-20 (session 2 ของวัน)
# Previous: session_handoff_20260520_v1.md

## STATE

```
App version : V2.2.40 (main + deployed via GitHub Pages → horatad.com)
script.js   : APP_VERSION='2.2.40' + window.APP_VERSION expose
sw.js       : CACHE_NAME='horatad-v2.2.40'
version.json: {"_id":"HORATAD:VERSION","v":"2.2.40"}
v3/v3tab.js : Version 3.0.4 (sync app V2.2.40 — ไม่แตะใน session นี้)
GitHub      : main = claude/initial-setup-a6bUS = c8c6733
Backups     : backup/v2.2.37, backup/v2.2.38, backup/v2.2.39,
              backup/v2.2.39-docs, backup/v2.2.39-infra, backup/v2.2.40
```

---

## DONE (session นี้)

```
✓ V2.2.40 Refactor calculateChart1/2 → _calcChart(num)
  - logic ซ้ำเกือบหมดยกเว้น id suffix + default name/year
  - factor เป็น helper + _CHART_CFG table — ลด duplicate ~35 บรรทัด
  - calculateChart1/2 เก็บไว้เป็น thin wrapper (callers ใช้ชื่อเดิม:
    HTML onclick ไม่มี, แต่ calculateBoth + _quickLoad + อื่นๆ ใช้)
  - ไม่มี behavior change — structural cleanup
  - script.js -41 lines net
```

---

## PENDING — 🟢 Claude ทำเองได้ (sandbox)

เรียงตาม priority (บนสุดทำก่อน):

```
[ ] V3 tab — เก็บผลพยากรณ์ล่าสุดใน localStorage
    - กดปุ่ม "ดูกฎ" / "Typhoon" ครั้งใหม่ → restore ได้
    - dedup key: natal pos hash
    - (idea — propose ใหม่ใน v1, ยังไม่ได้ user-approve)

[ ] Refactor: calculateTransit ใช้ pos/vel calc ซ้ำกับ _calcChart
    - extract _calcPosVel(d,m,y_ce,hr,mn,lng) → {pos,vel}
    - scope: ~15 บรรทัด — clean diff ต่อจาก V2.2.40
```

---

## PENDING — 🔴 [USER ONLY] / [BLOCKED] / ต้อง decision

```
[USER ONLY] ทดสอบ V2.2.37/.38/.39/.40 บนมือถือจริง:
  - V2.2.37 📌 indicator refresh หลัง numpad
  - V2.2.37 ปุ่ม ✕ ออกจากพยากรณ์ (TAB 3)
  - V2.2.38 ปุ่ม ✏️ แก้ไข memory — load + แก้ + ผูกดวงทับของเดิม
  - V2.2.39 V3 toast ไม่ซ้อน + offline ปุ่มพยากรณ์ใช้ kb.json cache ได้
  - V2.2.40 ผูกดวงทั้ง 2 sections ทำงานเหมือนเดิม (refactor regression check)

[USER ONLY] CF: deploy / config Worker
  - wrangler deploy horatad-ai (Typhoon proxy)
  - wrangler deploy horatad-auth (PIN validator)
  - CF Access policy บน /v3/* (สำหรับ req 13 backend lockdown)

[NEED DECISION] req 12 — Obfuscate script.js ก่อน deploy
  - ต้องตัดสินใจ deploy strategy: gh-pages branch vs Pages-from-Actions vs dist/
  - architecture lock-in → ขอ user เลือกก่อน

[NEED DECISION] req 13 — Cloudflare Access ล็อก /v3/*
  - frontend ส่วน: เพิ่ม credentials:'include' ใน fetch (v3tab.js, typhoon.js)
  - แต่ behavior ขึ้นกับ backend config — ไม่มี config แล้ว push frontend = no-op
  - รอ user confirm จะ enable Access flow ก่อน

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

- Branch: develop on `claude/initial-setup-a6bUS` (harness instruction ใน session นี้)
  push main + backup branch อัตโนมัติทุก commit (CLAUDE.md standing instruction)
- main = production (GitHub Pages → horatad.com via CNAME)
- Worker (horatad-ai, horatad-auth) แยก deploy ผ่าน wrangler ไม่ใช่ git push
- V3 tab ซ่อน — PIN 6 หลัก → POST `horatad-auth/api/auth` → 200 = unlock
- CI: `.github/workflows/ci.yml` block push ถ้า version sync ผิด หรือ syntax error
- V2.2.40 เป็น refactor pure — ถ้ามือถือพบ regression "ผูกดวง" → rollback เป็น V2.2.39
