# Horatad — Session Handoff V3.0
> อัปเดต: 18 พ.ค. 2569 | จาก Claude Sonnet 4.6
> ส่งต่อจาก session ที่ทำ P6 + P7 + Infrastructure cleanup

---

## 1. สิ่งที่ทำใน session นี้

### P6 — แก้ Typhoon prompt ✓
- interpretation.js 3.0.1: ตัด `manifestation=X.XXX` ออกจาก describe_planet_for_prompt()
- interpretation.js 3.0.1: ตัด `(avg=X.XXX)` ออกจาก describe_natal_payload()
- typhoon.js 3.0.1: เพิ่ม 2 กฎใน systemPrompt (ห้ามเลขลำดับ, ห้ามตัวเลขทางเทคนิค)
- typhoon.js 3.0.1: เปลี่ยน rulesText จาก `1. 2. 3.` เป็น `•`
- typhoon.js 3.0.1: ตัด `weight=X.X` ออกจาก transit section
- typhoon.js 3.0.1: เปลี่ยน "manifestation สูงสุด" → "แสดงออกเด่นชัดที่สุด" ใน userPrompt

### P7 — รวม V3 tab เข้า V2 ✓ (โครงสร้างถูก แต่ยังไม่ทำงาน)
- index.html: เพิ่ม tab-btn-3 "🔮 พยากรณ์" + TAB 3 panel + CSS inline
- script.js: เพิ่ม `function getNatal(){return _natal;}` expose global
- v3tab.js: สร้างใหม่ — bridge V2↔V3 ผ่าน ES module
- sw.js: bump CACHE_NAME → horatad-v2.2.27 + เพิ่ม v3/ files ใน CORE_ASSETS

### Infrastructure cleanup ✓
- ลบ branch v3 ออก เหลือแค่ branch main
- ย้าย V3 files เข้า folder v3/ ใน main branch
- horatad3.netlify.app ไม่ใช้แล้ว — ทุกอย่างอยู่ที่ horatad.com

### โครงสร้าง main branch ปัจจุบัน
```
main/
├── index.html       (V2 + tab-3 พยากรณ์)
├── script.js        (V2 + getNatal())
├── style.css
├── sw.js            (CACHE_NAME horatad-v2.2.27)
├── kb.json          (root — ไม่ได้ใช้)
└── v3/
    ├── engine.js
    ├── interpretation.js  (3.0.1)
    ├── typhoon.js         (3.0.1)
    ├── v3tab.js           (3.0.3 — สองปุ่ม)
    └── kb.json            (323 rules)
```

---

## 2. Known Issues

### Issue CRITICAL — Tab พยากรณ์ปุ่มไม่ทำงาน
อาการ: กดปุ่ม "ดูกฎที่ตรงดวง" หรือ "พยากรณ์โดย Typhoon" ไม่มีอะไรเกิดขึ้นเลย ไม่มี toast ไม่มี spinner

สาเหตุที่น่าจะเป็น: ES module import chain ล้มเหลวเงียบๆ
- v3tab.js (ES module) import จาก ./engine.js, ./interpretation.js, ./typhoon.js
- ถ้า import ตัวใดตัวหนึ่งล้มเหลว → window.v3Local และ window.v3Typhoon จะไม่ถูก set
- onclick="v3Local()" จึงหา function ไม่เจอ → ไม่มีอะไรเกิดขึ้น

วิธีวินิจฉัย: เปิด browser DevTools → Console → กด tab พยากรณ์ → ดู error message
น่าจะเห็น: "Failed to resolve module specifier" หรือ "import error"

แนวทางแก้ 2 วิธี:
1. Bundle ทุกอย่างเป็น script เดียว (ไม่ใช้ ES module import) — แก้ใหญ่
2. เช็ค error จาก console แล้วแก้ตาม error จริง — แก้เล็ก

### Issue 2 — MAX_TOKENS=1200 ยังไม่ได้ทดสอบ
### Issue 3 — ช้า 5-10 วิ (ปกติสำหรับ LLM)

---

## 3. Priority ถัดไป

### Priority 1 (ด่วน) — วินิจฉัย ES module error
เปิด DevTools Console บน horatad.com → tab พยากรณ์ → copy error message มาให้ Claude ดู
จะได้รู้ว่าต้องแก้ที่ไหน

### Priority 2 — ถ้าต้องแก้ใหญ่: รวมเป็น script เดียว
แทน ES module ให้รวม engine.js + interpretation.js + typhoon.js + v3tab.js
เป็น script เดียวชื่อ v3/v3bundle.js (non-module)
index.html เปลี่ยนจาก `<script type="module" src="v3/v3tab.js">` เป็น `<script src="v3/v3bundle.js">`

### Priority 3 — ทดสอบเปรียบเทียบผล 2 ปุ่มเมื่อทำงานได้แล้ว

---

## 4. Infrastructure State

```
horatad.com → GitHub Pages → branch main
Cloudflare Worker: horatad-ai.uchujaro5.workers.dev
  ALLOWED_ORIGINS: horatad.com, localhost
Typhoon model: typhoon-v2.5-30b-a3b-instruct
horatad3.netlify.app → ไม่ใช้แล้ว (branch v3 ถูกลบ)
```

---

## 5. ไฟล์ที่แนบ session ถัดไป

1. SYSTEM_INSTRUCTION_V3.md
2. Horatad_Master_Dictionary_V3_0.xlsx
3. session_handoff_v3_0.md (ไฟล์นี้)
4. v3/interpretation.js (3.0.1)
5. v3/typhoon.js (3.0.1)
6. v3/v3tab.js (3.0.3)
7. index.html
8. script.js

---

## 6. คำสั่งเริ่ม session ถัดไป

แนบไฟล์ทั้ง 8 แล้วพิมพ์:

"อ่าน handoff v3.0 แล้วเริ่ม Priority 1:
copy error message จาก DevTools Console มาวางนี้เลย:
[วาง error]
แล้วแก้ให้ปุ่มพยากรณ์ทำงานได้"

---

*Handoff เตรียมโดย Claude Sonnet 4.6 | Session: 18 พ.ค. 2569*
