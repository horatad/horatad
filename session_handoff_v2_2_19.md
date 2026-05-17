# Horatad — Session Handoff V2.2.19 (17May26 ตอนเย็น)

> ⚠️ ตรวจสอบ model selector: Claude Sonnet 4.6 ทุก session ใหม่

---

## 1. CURRENT BASELINE

- index.html / style.css / script.js — **V2.2.19** | 2026-05-17
- sw.js — **V2.2.19** | 2026-05-17 · CACHE_NAME: `horatad-v2.2.19`
- manifest.json — V2.1.3
- display: **"V 2.2.19"**
- Production: https://horatad.com (GitHub Pages + Cloudflare DNS Proxied)

---

## 2. INFRASTRUCTURE ใหม่ (session นี้)

### Cloudflare
- DNS: เปลี่ยนจาก DNS only → **Proxied** แล้ว
- Cache Rule: sw.js + index.html → Bypass (ไม่ cache) → auto-update ทำงานได้แล้ว

### Cloudflare Worker — Typhoon Proxy
- Worker name: `horatad-ai`
- Worker URL: `https://horatad-ai.uchujaro5.workers.dev`
- Secret: `TYPHOON_API_KEY` = ใส่แล้ว
- Code: `horatad-worker.js` (deploy แล้ว ทดสอบ GET → Method not allowed ✅)
- **ยังไม่ได้เชื่อมกับ script.js** — งานค้างสำหรับ session ถัดไป

---

## 3. สิ่งที่ทำใน session นี้

### V2.2.17 — KB + Interpretation
- `KB_RULES[]` embed ใน script.js เป็น constant (323 rules)
- `_loadKB()` fetch kb.json (ถูก remove ใน V2.2.18)
- `openInterpretation()` + `closeInterpretation()` + `_copyInterpretation()`
- `_matchRules()` — tag-based matching
- popup modal: spinner + text + copy button

### V2.2.18 — Remove fetch, embed KB ตรงๆ
- ลบ fetch kb.json ออก embed เป็น `KB_RULES[]` ใน script.js โดยตรง
- ลบ `_loadKB()` และ `loadKBFromFile()`
- btn-interpret แสดงเสมอ disabled จนมีดวง

### V2.2.19 — Remove AI, แสดง Rules ตรงๆ
- ลบ `_callAI()` และ fetch api.anthropic.com ออกทั้งหมด
- `openInterpretation()` แสดง matched rules จัดกลุ่มตาม chapter_title
- popup title: "กฎพยากรณ์ที่ตรงกับดวง"
- ไม่มี external API call ใดๆ ใน script.js

### Cloudflare Cache Rules
- Rule: sw.js + index.html → Bypass cache
- ผล: auto-update ทำงานโดยไม่ต้อง clear

### Master Dictionary V2.0
- `Horatad_Master_Dictionary_V2.0.xlsx` — 8 sheets
- tb_planets, tb_zodiacs, tb_houses, tb_standards, tb_aspects
- tb_categories, tb_pairs, tb_predictions (342 rules)
- ทุกตารางมี: id + code (EN) + name_th

### เอกสาร
- `claude.md` — Architecture + Blueprint ทั้งโปรเจกต์
- `typhoon_extract.py` — Python script สกัด KB ด้วย Typhoon
- `horatad-worker.js` — Cloudflare Worker proxy

---

## 4. DECISIONS LOG (เพิ่ม session นี้)

| # | เรื่อง | ตัดสินใจ |
|---|--------|----------|
| 25 | AI prediction V2 | ไม่ใช้ AI — แสดง matched rules ตรงๆ ไม่ hallucinate |
| 26 | KB storage | embed ใน script.js เป็น KB_RULES[] (ไม่ fetch) |
| 27 | Cloudflare | เปลี่ยนเป็น Proxied — Cache Rules ทำงานได้ |
| 28 | Typhoon proxy | Cloudflare Worker horatad-ai.uchujaro5.workers.dev |
| 29 | V3 LLM | Typhoon (SCB Tech Thai LLM) |
| 30 | Rule matching V3 | ID-based แทน keyword (tb_standards + getStandards()) |
| 31 | Master Dictionary | id + code (EN) + name_th ทุกตาราง |
| 32 | Multi-AI pipeline | NotebookLM → Claude → Human approve → Dictionary |

---

## 5. STATE GLOBALS (อัปเดต)

```
KB_RULES       const[] embed ใน script.js (323 rules)
KB_META        const{version:'1.0.0', total:323}
_kbRules       = KB_RULES ทันทีที่โหลด
_kbVersion     = KB_META.version
_kbTotal       = KB_META.total
```

---

## 6. FUNCTION MAP (อัปเดต)

```
script.js (V2.2.19):
  KB_RULES / KB_META        ~115-116  embedded constants
  _kbRules / _kbVersion     ~148-150  state (init จาก KB_RULES)
  _updateShareButton        ~1049     control btn-interpret disabled
  _matchRules               ~1650     tag-based matching (ต้องปรับ V3)
  openInterpretation        ~1703     แสดง rules จัดกลุ่ม chapter
  closeInterpretation       ~1734     ปิด modal
  _copyInterpretation       ~1739     copy text

Cloudflare Worker:
  horatad-ai.uchujaro5.workers.dev
  POST → proxy → Typhoon API
  Secret: TYPHOON_API_KEY
```

---

## 7. KNOWN ISSUES / NEXT CANDIDATES

### งานค้าง (ด่วน — session ถัดไป)
```
[ ] แก้ script.js 1 บรรทัด:
    _callAI → เรียก horatad-ai.uchujaro5.workers.dev
    (ฟังก์ชันต้องสร้างใหม่เพราะ _callAI ถูกลบแล้ว)
    → bump V2.2.20

[ ] _matchRules() ปัญหา quality mismatch:
    getStandards() return "ประ" แต่ KB tag ใช้ "ประเกษตร"
    → ต้องเพิ่ม mapping table
    → ตรวจ ดี/เสีย ก่อน match
```

### V2.x candidates
```
- Validate _ADHIKAVARA_YEARS BE 2484–2566 (ด่วน)
- Copy report text
- Canvas pinch-zoom mobile
- Retrograde tooltip
```

### V3.0
```
- Rule Engine ID-based (ใช้ tb_standards.code แทน text tags)
- Typhoon เรียบเรียง rules เป็นภาษาธรรมชาติ
- interpretation.js แยกไฟล์
- Compound logic: AND / OR / nested
- Julian Day strategy สำหรับ validate rules
```

---

## 8. WORKER — วิธีเรียกใช้ใน script.js

```javascript
// V2.2.20 — เพิ่ม _callTyphoon() ใหม่
const WORKER_URL = 'https://horatad-ai.uchujaro5.workers.dev';

async function _callTyphoon(natal, transit, matched) {
  const rulesText = matched.map(r => `• ${r.c} → ${r.p}`).join('\n');
  // ... build prompt ...
  const resp = await fetch(WORKER_URL, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      model: 'typhoon-v2.5-30b-a3b-instruct',
      max_tokens: 1000,
      messages: [...]
    })
  });
  const data = await resp.json();
  if (data.content && data.content[0]) return data.content[0].text;
  // Typhoon format: data.choices[0].message.content
  if (data.choices && data.choices[0]) return data.choices[0].message.content;
  throw new Error(data.error?.message || 'Typhoon error');
}
```

---

## 9. CHANGELOG

- V2.2.1  SW CACHE bump
- V2.2.2–12  V2 features (logo, quick memory, compare, long-press, etc.)
- V2.2.13 Adhikamasa lunation counting
- V2.2.14 Tithi avoman formula
- V2.2.15 Adhikavara + hollow month
- V2.2.16 Adhikavara lookup table, version display
- V2.2.17 KB embed + interpretation modal (fetch approach)
- V2.2.18 KB embed constant, ลบ fetch kb.json
- V2.2.19 ลบ _callAI, แสดง matched rules ตรงๆ ไม่ hallucinate

---

## 10. ไฟล์แนบ session ถัดไป

```
script.js    V2.2.19  ← จำเป็น (แก้ _callTyphoon + _matchRules)
index.html   V2.2.19  ← ถ้าแก้ UI
sw.js        V2.2.19  ← ถ้า bump version
```

ไม่ต้องแนบ: style.css (ไม่มีงาน), kb.json (ไม่ใช้แล้ว), PNG files

---

## 11. ไฟล์ที่สร้างใน session นี้

```
horatad-worker.js              Cloudflare Worker (deploy แล้ว)
typhoon_extract.py             Python script สกัด KB ด้วย Typhoon
claude.md                      Architecture + Blueprint document
Horatad_Master_Dictionary_V2.0.xlsx  Master Data 8 sheets
suriyart_knowledge_base_v2.yaml      KB migrate 4-class format
```
