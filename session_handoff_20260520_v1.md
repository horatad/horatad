# Horatad — Session Handoff
# Date: 2026-05-20 (session 1 ของวัน)
# Previous: session_handoff_20260519_v4.md

---

## STATE ปัจจุบัน

```
App version : V2.2.37 (main + deployed via GitHub Pages)
script.js   : APP_VERSION='2.2.37'
sw.js       : CACHE_NAME='horatad-v2.2.37'
version.json: {"v":"2.2.37"}
index.html  : V2.2.37
GitHub      : main = claude/add-test-file-EMaRp = b550f3a (fast-forward)
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

### 🔴 P0 — Bug ที่ยังไม่หาย

```
[ ] FLICKER ยังไม่หาย — V2.2.36 ลบ duplicate controllerchange ใน
    index.html แล้ว แต่ผู้ใช้ยังเห็นจอกระพริบถี่ๆ ต้องรอนาน + F12 +
    Ctrl+Shift+R จึงหาย
    
    สงสัย: SW cache propagation race
    - version.json fetch ใน script.js:2447 → mismatch → reload
    - SW activate → controllerchange → reload (มี _swRefreshing guard)
    - ทั้งสอง path อาจแข่งกันทำงาน
    
    Next: dig SW lifecycle + reload trigger order
    หรือเปลี่ยน strategy: เลิกใช้ version.json reload,
    ใช้แค่ controllerchange (ปลอดภัยกว่า)

[ ] ทดสอบ V2.2.37 บนมือถือจริง — 📌 indicator refresh หลัง numpad
    + ปุ่มออกจากพยากรณ์ (✕ บน TAB 3)
```

### 🟠 P1 — Improvements

```
[ ] ปุ่ม ✏️ แก้ไขข้อมูลใน memory list (req 20)
    Scope: แตะ _renderQuickMemory ใน script.js +
           load record กลับเข้าฟอร์ม → กด "ผูกดวง" ทับของเดิม
    _addMemory มี logic 'updated' รองรับอยู่แล้ว
    
[ ] V3 tab — ปรับ toast race ใน v3tab.js:79-83
    ปัจจุบัน toast "กำลังโหลดกฎ..." fire ก่อน guard check
    ทำให้ผู้ใช้ที่ยังไม่ผูกดวงเห็น toast ซ้อน 2 ตัว
    แก้: ย้าย _showToastV3 หลัง _v3Running check + _getNatal check

[ ] V3 tab — SW cache miss สำหรับ kb.json
    CORE_ASSETS cache './v3/kb.json?v=VER' มี query
    แต่ v3tab.js fetch './v3/kb.json' (ไม่มี query) — key ไม่ตรง
    Offline mode ปุ่มพยากรณ์จะ fail
    แก้: เปลี่ยน _loadKb() ให้ fetch ด้วย ?v=APP_VERSION
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
