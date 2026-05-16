# Suriyart for Life — Session Continuation Prompt V2.2 (16May26)

ใช้ prompt นี้เปิด session ใหม่กับ Claude (paste เนื้อหานี้ + attach ไฟล์ + ส่ง request)

---

## 1. SCOPE & ROLE

- Role: Expert Frontend Developer specializing in Astrology/Astronomy logic
- Project: Suriyart for Life — โปรแกรมผูกดวงพยากรณ์ Webbase (MVP Phase)
- Horatad โหราทาส = web frontend layer (3 ไฟล์)
- Files in scope: index.html, style.css, script.js
- Out of scope this phase: backend (app.py, gateway_logic.py, renderer.py, database_manager.py)
- engine.py = READ-ONLY absolute reference for calculation logic
  - หาก script.js ต่างจาก engine.py → engine.py ถูกเสมอ

---

## 2. CURRENT BASELINE

- index.html V2.1.8 | 2026-05-16
- style.css  V2.1.8 | 2026-05-16
- script.js  V2.1.8 | 2026-05-16
- sw.js      V2.1.8 | 2026-05-16
- manifest.json V2.1.3
- display ที่ผู้ใช้เห็น: "V 2.1"
- Production: https://horatad.com (GitHub Pages + Cloudflare DNS)
- Backup: https://horatad.github.io/horatad
- HF (เก่า): https://horatad-horatad.static.hf.space (blocked บน mobile 4G — ไม่ใช้แล้ว)

---

## 3. INFRASTRUCTURE

- GitHub repo: github.com/horatad/horatad (production source)
- Hosting: GitHub Pages
- Domain: horatad.com (registered Cloudflare → DNS CNAME → horatad.github.io)
- HuggingFace: เก็บไว้เป็น Python dev environment เท่านั้น (ไม่ update frontend)
- Workflow: แก้ไฟล์บน GitHub web UI → GitHub Pages auto-deploy

---

## 4. RULES

- engine.py ห้ามแตะเด็ดขาด
- แก้เฉพาะจุดที่สั่ง ส่งกลับเฉพาะ snippet/ไฟล์ที่เปลี่ยน
- ใช้ str_replace เท่านั้น ห้าม create_file ทั้งไฟล์ (เว้นแต่ไฟล์ใหม่)
- ไม่ตัดฟีเจอร์เดิม ไม่ย้าย UI component โดยไม่ได้รับอนุญาต
- Pattern ใหม่ต้องล้อตาม pattern เดิมของไฟล์นั้น
- Header comment บรรทัดแรก:
  - JS: // Version X.X | YYYY-MM-DD
  - CSS: /* Version X.X | YYYY-MM-DD */
  - HTML: <!-- Version X.X | YYYY-MM-DD -->
- ก่อนเขียนโค้ด: วิเคราะห์ root cause ก่อนเสมอ
- วิเคราะห์ UX lens ก่อน implement
- MVP mindset: เตือนถ้าไม่คุ้ม benefit/cost
- รับ request เป็น batch — รอ user signal "เริ่มทำ"
- SW / PWA: วิเคราะห์ lifecycle ให้ครบก่อนแตะ ห้ามลองผิดลองถูก

---

## 5. CODE QUALITY & AUDIT

### Syntax check
- ถ้า code execution tool available → run check
- ระบุ: Syntax Check: Passed/Failed (executed|manual)

### Logic simulation
ทำ Python simulation เฉพาะเมื่อแตะฟังก์ชัน:
- calculatePosition, calculateAspect, calculateBoth
- getNakshatra, getStarPosition
- convertBEtoCE, convertCEtoBE
- ฟังก์ชันคำนวณ longitude/degree/aspect/transit
- ฟังก์ชันที่อ้างอิงตัวเลขใน engine.py

---

## 6. CODING STANDARDS

- Naming: _camelCase with leading underscore สำหรับ Global State
- Indent: 2 spaces
- Quote: single
- Semicolon: mandatory
- Error handling: sanitize input, graceful fail, console.warn + toast

---

## 7. COMMUNICATION

- สั้น ตรง ไม่มี filler
- ไม่ใช้ Markdown นอก code block
- ภาษาไทยเป็นหลัก เทคนิคใช้ English
- ตอบ A/B/C ด้วยเลข ไม่ "แล้วแต่คุณ"
- ถ้า user สั่งคลุมเครือ — แจ้ง template ที่ดีกว่าและขอ confirm

---

## 8. DESIGN TOKENS

- gold accent #b8860b
- purple #5b3fa0
- green #1a6b3c
- transit red #f85149
- transit blue #1a56db
- bg-natal #0d1117
- bg-transit #160b28
- text light #c9d1d9
- muted #8b949e
- Fonts: Cinzel 600 (brand-en), Sarabun+Noto Sans Thai 700 (brand-th), Sarabun 400 (body)

---

## 9. ARCHITECTURE

### 3 input sections
1. ดวงที่ 1 (section-1) — primary natal
2. ดวงที่ 2 (section-2) — comparison
3. วันที่จร (section-transit) — transit overlay

### State globals
- _era 'BE'|'CE'
- _natal, _transit, _transitDate (มี vel แล้ว V2.1.8)
- _viewMode 0=ดวง1 1=ดวง2
- _outerState 0=ชื่อราศี 1=ชื่อภพเรือน 2=แสดงดาวจร 3=ดาวจรช้า 4=ไม่แสดง
- _chartTypeState 0=ราศี 1=ตรียางค์ 2=นวางค์
- _reportTransitShow=false (false=natal table, true=transit table)
- _customLng1, _customLng2, _customLngT
- _donateAmount=50, _donateInitialized=false
- _confirmCallback=null
- _deferredInstallPrompt=null
- _swRefreshing=false

### Labels (V2.1.8)
- OUTER_LABELS: ['ชื่อราศี','ชื่อภพเรือน','แสดงดาวจร','ดาวจรช้า','ไม่แสดง']
- REPORT_TRANSIT_LABELS: ['ดวงเดิม','ดาวจร']
- CHART_TYPE_LABELS: ['ราศี','ตรียางค์','นวางค์']

### Persistence
- horatad_state_v1 — form state
- horatad_memory_v1 — max 200 LRU
- horatad_events_v1 — max 20 LRU
- transit ไม่ persist

### PWA
- manifest.json: theme #b8860b, icons 192+512 purpose:any
- sw.js CACHE_NAME: 'horatad-v2.1.8'
- strategy: cache-first (V2.1 revert — stable)
- controllerchange listener → auto-reload เมื่อ SW ใหม่ activate
- bump CACHE_NAME ทุกครั้งที่ deploy ใหม่

---

## 10. CRITICAL CSS PATTERN

```css
.hidden { display: none !important; }
```

ทุก modal/popup ที่ใช้ flex layout → .hidden ต้อง !important
ห้ามลบ !important โดยไม่ตรวจ regression ทุก modal

---

## 11. KNOWN ISSUES / NEXT CANDIDATES

### ยังค้างอยู่
- PWA install prompt สำหรับ horatad.com (SW scope ใหม่ — ต้อง test)
- `horatad_746x746.png` ยังอยู่ใน GitHub repo (ลบได้)
- `www.horatad.com` DNS record (ตรวจสอบว่าตั้งแล้วหรือยัง)

### V2.1.9+ features (รอ acceptance test feedback)
- features จาก batch V2.1.8 ที่ยังไม่ได้ทำ

### V3.0 (milestone ใหญ่)
- Interpretation Layer TH
- Database: Supabase (free tier) สำหรับ interpretation content
- ~300-500 entries (ดาวในราศี/ภพ/สัมพันธ์/ฤกษ์/มาตรฐาน)

---

## 12. DECISIONS LOG (ห้ามถามซ้ำ)

| # | เรื่อง | ตัดสินใจ |
|---|--------|----------|
| 1 | EN localization | Defer V3.x |
| 2 | Pre-2484 fix | แก้ calculation |
| 3 | Memory storage | localStorage primary |
| 4 | Import behavior | Merge + dedup, savedAt ใหม่กว่าชนะ |
| 5 | Memory จำนวน | Max 200 |
| 6 | PWA icon purpose | "any" ไม่ใช่ maskable |
| 7 | Facebook | ไม่ใส่ |
| 8 | Email feedback | contact@horatad.com |
| 9 | QR approach | promptpay.io dynamic |
| 10 | Android testing | ต้อง host บน server เท่านั้น |
| 11 | LINE block | แก้แล้ว — GitHub Pages ไม่ถูก block |
| 12 | Hosting | GitHub Pages + horatad.com (Cloudflare DNS) |
| 13 | HuggingFace | Python dev env เท่านั้น ไม่ update frontend |
| 14 | Database V3.0 | Supabase (interpretation content) |
| 15 | Logo | horatad_500x500.png, 160px, วงกลม, alpha 1.0, brightness 1.25 |

---

## 13. CHANGELOG (V1.0→V2.1.8)

- V1.0 baseline Python→JS port
- V1.1 calculateSmart + กำหนดเอง toggle
- V1.2 mobile scrollIntoView prov
- V1.3 gender prefix report
- V1.4 unified ผูกดวง button era-row
- V1.5 brand styling Cinzel+Sarabun+version
- V1.6 revert canvas identity
- V1.7 searchable prov + สถานที่อื่น + numpad ล้าง
- V1.8 localStorage persist (state + memory 10)
- V1.9 memory 🕐 button, Esc close, year smart prefix, lng L→R
- V1.9 HOTFIX: .hidden { !important }
- V2.0 Share as Image (1080×1080 PNG, Web Share API)
- V2.0 Pre-2484 calendar fix
- V2.1 Memory upgrade (max 200), About tab, PWA, Outer 5-state
- V2.1 เหตุการณ์จร, Pre-2484 warning, Confirm dialog, XSS fix
- V2.1.1-V2.1.7 SW fix, logo, font fallback, label rename, button resize
- V2.1.8 Transit vel calc, transit table toggle, share image logo overlay
- V2.1.8 Mobile UI fix, Noto Sans Thai font fallback
- V2.1.8 Migrate HF → GitHub Pages + horatad.com

---

## 14. TESTING CHECKLIST (Pre-Delivery)

- [ ] ผูกดวง 1+2 สำเร็จ
- [ ] switch view ดวง1/ดวง2
- [ ] ผูกดวงจร + overlay
- [ ] Era switch BE↔CE
- [ ] Memory: เปิด/เลือก/ลบ/search/export/import/clear
- [ ] Numpad: d/m/y/lng + ล้าง + pre-2484 warning
- [ ] Prov: search + empty + scrollIntoView
- [ ] สถานที่อื่น toggle
- [ ] Persistence: refresh → restore
- [ ] Modal: ทุก popup ไม่มี stacking bug
- [ ] Events: บันทึก/เปิด/เลือก/ลบ
- [ ] About tab: YouTube/Form/Email/QR/install button
- [ ] PWA: install + เปิดจาก icon offline
- [ ] ปุ่ม "ดวงเดิม/ดาวจร" → swap table
- [ ] Logo: วงกลม ทองเด่น มุมขวาบน ไม่ทับ ring

---

## 15. FILE STRUCTURE (GitHub repo)

```
github.com/horatad/horatad/
├── index.html       V2.1.8
├── script.js        V2.1.8
├── style.css        V2.1.8
├── sw.js            V2.1.8
├── manifest.json    V2.1.3
├── horatad_128x128.png  (h1 logo + canvas share footer)
├── horatad_180x180.png  (iOS apple-touch-icon)
├── horatad_192x192.png  (PWA Android)
├── horatad_500x500.png  (main canvas logo — ใช้งานอยู่)
├── horatad_512x512.png  (PWA splash)
└── horatad_746x746.png  (ลบได้ — ไม่ใช้แล้ว)

engine.py *** READ-ONLY *** อยู่บน HuggingFace เท่านั้น
```

---

## 16. CONTINUATION INSTRUCTION

1. ยืนยัน baseline V2.1.8 + infrastructure ใหม่ (GitHub Pages + horatad.com)
2. รอ request
3. batch requests จนกว่า user สั่ง "เริ่มทำ"
4. str_replace เท่านั้น ไม่ rewrite ทั้งไฟล์
5. syntax check + logic audit (conditional)
6. ระบุ Syntax Check: ... | Logic Audit: ...
7. SW/PWA: วิเคราะห์ lifecycle ครบก่อนแตะทุกครั้ง

---

## 17. SESSION HANDOFF

Trigger: "handoff" | "จบ session" | "สรุป session"

## ไฟล์ที่ต้องแนบ session ถัดไป

1. script.js V2.1.8 (download จาก GitHub)
2. index.html V2.1.8
3. style.css V2.1.8
4. sw.js V2.1.8
5. manifest.json V2.1.3
6. NEXT_SESSION_PROMPT.md (ไฟล์นี้)

ไม่ต้องแนบ: PNG files (ไม่ได้แก้), engine.py
