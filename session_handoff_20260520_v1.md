# Horatad — Session Handoff
# Date: 2026-05-20 (session 1 ของวัน)
# Previous: session_handoff_20260519_v4.md

---

## STATE ปัจจุบัน

```
App version : V2.2.39 (main + deployed via GitHub Pages)
script.js   : APP_VERSION='2.2.39' + window.APP_VERSION expose
sw.js       : CACHE_NAME='horatad-v2.2.39'
version.json: {"_id":"HORATAD:VERSION","v":"2.2.39"}
index.html  : V2.2.39
v3/v3tab.js : Version 3.0.4 (sync app V2.2.39)
GitHub      : main = claude/fix-memory-list-edit-znEDH = cd53013 (fast-forward)
Backups     : branches backup/v2.2.37, backup/v2.2.38, backup/v2.2.39,
              backup/v2.2.39-docs (CLAUDE.md commit)
```

---

## สิ่งที่ทำใน session นี้

```
✓ V2.2.36 — ปุ่ม ✕ ออกจากพยากรณ์ บน TAB 3 + ลบ duplicate
            controllerchange listener (พยายามแก้ flicker)
✓ V2.2.37 — แก้ 📌 DB indicator ไม่ refresh เมื่อกด numpad commit
            (เรียก _updateDbIndicator(section) ท้าย _numpadConfirm
            ตาม id suffix) + เพิ่ม 'change' listener สำหรับ iOS
            native <input type="time">
✓ Static analysis V3 module import chain — โครงสร้างถูก ไม่มี broken link
```

---

## งานที่ค้าง (priority สูง→ต่ำ)

### ⏸️ DEFERRED — รอลงรอบใหญ่ (ไม่เร่ง เพราะไม่กระทบ mobile)

```
[ ] FLICKER เฉพาะ desktop หลัง Ctrl+Shift+R — แก้มาหลายครั้งไม่หาย
    มือถือ (target หลัก) ไม่เป็น → ลด priority
    
    สงสัย: SW cache propagation race
    - version.json fetch ใน script.js → mismatch → reload
    - SW activate → controllerchange → reload (มี _swRefreshing guard)
    - ทั้งสอง path อาจแข่งกัน
    - อาจต้องสอบ root cause ที่ horatad.com domain/CDN ด้วย
    
    Action: ยกไป "รอบใหญ่" — รื้อ SW lifecycle + reload strategy พร้อมกับ
            ตรวจสอบ domain/contact horatad.com เป็น root cause ไหม
    แนวทาง: เลิก version.json reload, ใช้แค่ controllerchange (ปลอดภัยกว่า)
```

### 🟠 P1 — เหลือ

```
[ ] ทดสอบ V2.2.37/.38/.39 บนมือถือจริง:
    - V2.2.37 📌 indicator refresh หลัง numpad
    - V2.2.37 ปุ่ม ✕ ออกจากพยากรณ์ (TAB 3)
    - V2.2.38 ปุ่ม ✏️ แก้ไข memory list — load + แก้ + ผูกดวงทับ
    - V2.2.39 V3 toast ไม่ซ้อน + offline ปุ่มพยากรณ์ใช้ kb.json cache ได้
```

### ✅ ปิดใน session นี้

```
✓ V2.2.38 ปุ่ม ✏️ แก้ไข memory list (req 20) — รวม replaceKey ใน _addMemory
✓ V2.2.39 V3 toast race fix (ย้าย toast หลัง guard ใน v3tab.js)
✓ V2.2.39 V3 kb.json cache key fix (KB_PATH ใส่ ?v=APP_VERSION)
✓ V2.2.39 window.APP_VERSION expose ให้ ES module
✓ CLAUDE.md สร้าง — บันทึก standing instructions (auto-push main + backup,
  version bump checklist 6 จุด, cache-bust convention, project quirks)
```

### 🟡 P2 — Infra / V2 backlog (จาก session ก่อนหน้า ยังคง)

```
[ ] DEPLOY.md — ไฟล์ไม่มีจริง (handoff note v4 outdated)
[ ] wrangler deploy workflow สำหรับ horatad-ai/horatad-auth Worker
[ ] req 11 — ย้าย v3/interpretation.js → Cloudflare Worker
[ ] req 12 — Obfuscate script.js ก่อน deploy
[ ] req 13 — Cloudflare Access ล็อก /v3/*
[ ] req 16 — Preload historical records → localStorage
[ ] req 17 — Ephemeris backtest กับตำราอ้างอิง
```

---

## V3 Static Analysis (ทำใน session นี้)

```
✓ v3tab.js → engine.js: get_lagna (พบ)
✓ v3tab.js → interpretation.js: build_natal_payload (พบ)
✓ v3tab.js → typhoon.js: match_rules, render_fallback, send_to_typhoon (พบ)
✓ interpretation.js → engine.js: 12 exports (พบครบ)
✓ typhoon.js → interpretation.js: 3 exports (พบ)
✓ typhoon.js → engine.js: 3 exports (พบ)

→ Issue "ปุ่มพยากรณ์เงียบ" จาก handoff v3.0 น่าจะหายตั้งแต่ V2.2.30
  (script tag เพิ่ม ?v=APP_VERSION บังคับ cache-bust)
→ ถ้ายังเงียบบน mobile จริง ต้อง DevTools Console screenshot
```

---

## Next Priority (session ถัดไป)

```
1. dig FLICKER — เปิด DevTools → Application → Service Workers
   ดู lifecycle + reload trigger order
   อาจต้อง refactor: ลบ version.json mismatch reload ทิ้ง
   ใช้แค่ controllerchange path
   
2. req 20 ปุ่ม ✏️ memory list (small-medium scope)

3. V3 toast race + kb.json cache miss (small fixes)
```

---

## Notes สำคัญ

```
- Branch: develop on `claude/add-test-file-EMaRp` ตาม harness instruction
  แล้ว fast-forward main เมื่อพร้อม push (วิธีที่ user เลือกใน session นี้)
- main = production (GitHub Pages deploy)
- Worker (horatad-ai, horatad-auth) แยก deploy ผ่าน wrangler — ไม่ใช่ git push
- V3 tab ซ่อน — PIN 6 หลัก → fetch POST /api/auth → 200 = unlock
- ปุ่ม ✕ ออกจากพยากรณ์ (ใหม่ V2.2.36): ซ่อน tab-btn-3 + สลับไป tab 1
```
