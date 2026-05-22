# HORATAD ECOSYSTEM — Master Reference
# อ่านไฟล์นี้เพื่อเข้าใจภาพรวมทั้งหมด ก่อนเริ่มงานใด ๆ
# PROJECT_STATUS.md = task list รายวัน | ECOSYSTEM.md = architecture + vision

---

## หลักการออกแบบ: Autonomous by Design

> **Data is Authority — ไม่ใช่มนุษย์**

ระบบนี้ออกแบบให้ตัดสินใจด้วยตัวเองจากข้อมูลจริง ไม่ใช่จากความเห็นมนุษย์
มนุษย์อยู่นอก loop การ validate เสมอ — เข้ามาได้แค่ 2 บทบาท:
1. **เพิ่ม rule ใหม่** (creative work ที่มนุษย์ยังดีกว่า)
2. **ดู summary report** (observe ไม่ใช่ control)

```
❌ Human validates record → ระบบพังถ้ามนุษย์ไม่ลงรอยกัน
✅ Empirical data validates rule → ข้อมูลจริงเป็น ground truth เดียว

ถ้า empirical_p < 0.45 → rule อ่อน (ระบบบอกเอง)
ถ้า empirical_p > 0.70 → rule แข็ง (ระบบเชื่อเอง)
ไม่มีมนุษย์มา confirm ทั้งสองกรณี
```

**Self-improving loop:**
```
Wikidata → JULIAN D1 → match_rules() → empirical_p → kb.json → BIBLE แม่นขึ้น
    ↑                                                                    |
    └──────────────────── ข้อมูลเพิ่มขึ้นเรื่อย ๆ ──────────────────────┘
```

---

## ภาพรวมระบบ — 1 ประโยค

> เครื่องพยากรณ์โหราศาสตร์สุริยยาตร์ที่คำนวณแม่นยำ (HORATAD) + อธิบายเป็นภาษาคน (BIBLE) + ยืนยันด้วยข้อมูลจริง (JULIAN) + กระจายถึงคนผ่านทุกช่องทาง (PLATFORM)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER / PUBLIC                            │
│           (แอป, LINE, YouTube, Facebook, Web, QR)               │
└────────────┬────────────────────────────────────┬───────────────┘
             │ input                               │ consume
             ▼                                     ▼
┌────────────────────────┐           ┌─────────────────────────────┐
│       HORATAD          │           │         PLATFORM             │
│  Thai Astrology PWA    │           │  Training + Chatbot + Content│
│  ─────────────────     │           │  ─────────────────────────── │
│  engine.js (สุริยยาตร์) │           │  LINE OA webhook             │
│  natal + transit chart │           │  YouTube / Facebook content  │
│  QR share              │           │  Online course + 1:1 consult │
│  V3 tab (prediction)   │           │  TTS voice (Web Speech API)  │
└────────┬───────────────┘           └──────────────┬──────────────┘
         │ planets[10] + JD                          │ uses
         │ (get_j, get_data)                         │
         ▼                                           ▼
┌────────────────────────┐           ┌─────────────────────────────┐
│         BIBLE          │◄──────────┤         JULIAN               │
│  Prediction Wording    │           │  Empirical Astro Database    │
│  ─────────────────     │           │  ──────────────────────────  │
│  kb.json (342 rules)   │ validate  │  master_key: JD→planets[10] │
│  match_rules()         │ empirical │  internet: JD→person/event  │
│  Typhoon LLM           │◄──────────│  empirical_p per rule        │
│  prediction text       │           │  GitHub repo (public, now)  │
│                        │           │  CF D1 + Worker (private,    │
│                        │           │   future use only)           │
└────────────────────────┘           └─────────────────────────────┘
```

---

## Data Flow — ข้อมูลไหลอย่างไร

### 1. Natal Prediction (core flow)
```
user กรอก วัน/เดือน/ปี/เวลา/สถานที่
  → HORATAD engine.js
    → get_j(d,m,y_ce) = JD (integer)
    → get_data(d,m,y_ce,h,min,lng) = sp[0..10]
    → planets[10] = SU MO MA ME JU VE SA RA KE MR (degrees 0-360)
  → BIBLE match_rules(planets)
    → conditions[] match → rule list
    → compose_prediction() → phrase clusters
  → Typhoon LLM → prediction text (ภาษาไทย)
  → แสดงผล / พูดออกเสียง / ส่งผ่าน LINE
```

### 2. Empirical Validation (JULIAN → BIBLE)
```
JULIAN internet table:
  บุคคลสำคัญ (name, jd, type, tier, country)
  ↓
JULIAN master_key table:
  planets[10] ณ วันเกิด
  ↓
BIBLE empirical_validator:
  match_rules(planets) → rules hit/miss
  → empirical_p = hits / (hits + miss) ต่อ rule
  → อัปเดต kb.json: rule.empirical_p, empirical_n
```

### 3. PLATFORM Distribution (BIBLE → users)
```
HORATAD QR share → PLATFORM scan
  → natal params → BIBLE → text
  → Web Speech API.speak() → พูดพยากรณ์
  → ถามคำถาม audience (conversational)

LINE OA รับวันเกิดจาก user
  → CF Worker webhook
  → get_j + get_data (engine via HORATAD)
  → BIBLE wording
  → LINE reply auto 24/7
```

---

## แต่ละ Project — บทบาทและ dependency

### HORATAD — Foundation (ทุกอย่างพึ่ง engine นี้)
- **หน้าที่:** คำนวณดวง + UI + QR + deploy (horatad.com)
- **Core:** `engine.js` — สุริยยาตร์ integer arithmetic (ไม่มี sin/cos) — เร็วมาก
- **Export สำคัญ:** `get_j()`, `get_data()` — BIBLE + JULIAN + PLATFORM ใช้ทั้งหมด
- **Dependency:** ไม่มี (standalone)

### BIBLE — Intelligence (prediction quality)
- **หน้าที่:** 342 rules → keywords → LLM wording → prediction text
- **Core:** `kb.json`, `match_rules()`, `compose_prediction()`, Typhoon API
- **Dependency:** HORATAD engine (planets input) | JULIAN (empirical validation)
- **Output:** prediction text → PLATFORM

### JULIAN — Memory (empirical ground truth)
- **หน้าที่:** เก็บ planet positions ล่วงหน้า + บุคคลสำคัญ → ยืนยัน BIBLE rules
- **Storage strategy (สำคัญ — 2 ชั้น):**
  - **ปัจจุบัน — Public data → GitHub repo:** `data/julian_all.json` (41,079 records, 13MB, CORS-free, ฟรีไม่จำกัด, ไม่มี token expire)
  - **อนาคต — Private data → CF D1 + Worker:** สำหรับ user chart ที่ login แล้ว, real-time query, write-heavy workload (ยังไม่เริ่ม)
- **Dependency:** HORATAD engine (generate master_key)
- **Output:** empirical_p per rule → BIBLE quality score

### NOK — Voice (text → speech)
- **หน้าที่:** แปลง text พยากรณ์ → เสียงพูด — ฟรี, offline, mobile-first
- **Core:** `v3/tts.js` — Web Speech API wrapper (Phase 1) | future: cloud TTS, audio export
- **Dependency:** BIBLE (text input) | host frontend อยู่ใน HORATAD V3 tab
- **Consumer:** HORATAD V3 tab (Phase 1) → PLATFORM Phase 3 (อนาคต)

### PLATFORM — Distribution (reach users)
- **หน้าที่:** กระจาย prediction ผ่านทุกช่องทาง — chatbot, video, course, consult
- **Core:** LINE OA webhook, content automation (audio ใช้จาก NOK)
- **Dependency:** HORATAD (chart) + BIBLE (wording) + JULIAN (personalized data) + NOK (voice)
- **Goal:** 1 คนดูแลทั้งหมดด้วย automation

---

## Priority Framework — ลำดับงานเมื่อโปรเจคแข่งกัน

```
ระดับ 1 (CRITICAL):   งานที่บล็อค project อื่น
  → HORATAD bug ที่ทำให้ engine ผิด → แก้ก่อนทุกอย่าง
  → JULIAN schema change → กระทบ BIBLE + PLATFORM

ระดับ 2 (HIGH):       User value โดยตรง
  → BIBLE: prediction quality (rule review, wording)
  → HORATAD: UX, deploy, mobile

ระดับ 3 (MEDIUM):     Infrastructure + data
  → JULIAN: GitHub data automation, Astrotheme enrich, data collection
  → PLATFORM: chatbot, content tools

ระดับ 4 (LOW):        Growth + expansion
  → PLATFORM: training center, YouTube, course
  → projects ใหม่ที่ยังไม่มี dependency
```

**กฎ: ถ้าไม่แน่ใจ → ทำ HORATAD/BIBLE ก่อนเสมอ** (foundation มาก่อน distribution)

**กฎ backlog:** ก่อนทำงานใดใน backlog ถามตัวเอง:
1. Assumption เดิมยังจริงอยู่ไหม?
2. งานนี้ block งานอื่นไหม หรือถูก block โดยงานอื่น?
3. Value ยังมีอยู่ไหม เทียบกับ effort?

---

## Roadmap — Phase ทั้งหมด

### ✅ Phase 0 — Core Tools (เสร็จแล้ว)
- HORATAD: natal + transit + V3 prediction tab
- BIBLE: 342 rules, KB editor, LLM wording
- JULIAN: keygen + scraper tools (local, no cloud yet)

### ✅ Phase 1 — Public Dataset on GitHub (เสร็จแล้ว — pivot จาก CF)
- JULIAN: scrape Wikidata SPARQL → `data/julian_all.json` ใน repo (CORS-free, ฟรี)
- JULIAN: automation ทุก 6 ชม. (137 queries) + GitHub Release snapshot
- BIBLE: empirical_validator.html → validate rules ด้วย public dataset
- (CF D1 + Worker ถูก defer ไว้ใช้สำหรับ private data ใน Phase 5+)

### 🔲 Phase 2 — Chatbot (ถัดไป)
- PLATFORM: LINE OA webhook → CF Worker → BIBLE → reply auto
- Target: รับวันเกิด → ส่งพยากรณ์ ใน 3 วินาที

### 🔄 Phase 3 — Voice + QR (NOK Phase 1 ✅ deployed)
- ✅ NOK Phase 1: Web Speech API TTS → พูดพยากรณ์ใน HORATAD V3 tab (V3.3.13)
- 🔲 NOK Phase 2: voice profile + speed + sentence highlight
- 🔲 NOK Phase 3: Cloud TTS fallback (desktop ไม่มี Thai voice)
- 🔲 PLATFORM: HORATAD QR → PLATFORM scan → predict → NOK speak → interactive Q&A

### 🔲 Phase 4 — Training Center + Content
- PLATFORM: async course (สุริยยาตร์) + Calendly booking + 1:1 consult
- Content: BIBLE weekly script → YouTube + Facebook schedule auto

### 🔲 Phase 5+ — Scale
- Multi-language support (EN prediction)
- JULIAN: crowd-sourced data (opt-in human records)
- Rating UI (👍/👎) → feedback loop → BIBLE quality improvement

---

## Technology Stack — ทุก tool ที่ใช้

### Frontend / App
| Component | Tech | หมายเหตุ |
|---|---|---|
| HORATAD PWA | Vanilla JS, no build | edit ตรง → push → GitHub Pages |
| V3 modules | ES Module (v3/*.js) | engine.js, bible.js, typhoon.js |
| Service Worker | Cache-first | offline support |
| Deploy | GitHub Pages | auto deploy ทุก push to main |

### Backend / Cloud
| Component | Tech | หมายเหตุ |
|---|---|---|
| Astrology API | CF Worker (horatad-ai) | stateless, 30s limit |
| Auth | CF Worker (horatad-auth) | PIN verify |
| JULIAN public data | GitHub repo (`data/julian_all.json`) | CORS-free, ฟรี, ไม่มี token expire ✅ ปัจจุบัน |
| JULIAN private data | CF D1 (SQLite edge) | สำหรับ user private chart — future use only |
| Chatbot webhook | CF Worker | LINE OA event handler |

### AI / LLM
| Component | Tech | หมายเหตุ |
|---|---|---|
| Thai LLM | Typhoon (opentyphoon.ai) | Thai-first, wording generation |
| Fallback | Local template | offline prediction |
| Empirical | JULIAN + BIBLE | ground-truth validation |

### PLATFORM / Distribution
| Component | Tech | หมายเหตุ |
|---|---|---|
| LINE OA chatbot | LINE Messaging API | ฟรี 200 msg/เดือน |
| TTS (NOK Phase 1) | Web Speech API | browser built-in, ฟรี, offline (`v3/tts.js`) |
| TTS (NOK Phase 3) | Google Cloud TTS Neural2-Th | fallback desktop, ผ่าน CF Worker proxy |
| Content schedule | Meta Business Suite | Facebook + IG |
| Booking | Calendly | ฟรี tier |
| Online course | Gumroad / Notion | ต้นทุนต่ำ |
| Video | OBS Studio | record + stream |

### Developer Tools
| Component | Tech |
|---|---|
| Import pipeline | `workers/julian_import.mjs` (Node.js) |
| D1 deploy | `wrangler d1 execute` |
| Worker deploy | `wrangler deploy` |
| Data tools | `tools/julian_keygen.html`, `tools/julian_scraper.html`, `tools/hora_db_import.html` |

---

## Cross-Project Dependencies Map

```
HORATAD engine.js
  ├── BIBLE (match_rules ใช้ planets)
  ├── JULIAN (keygen ใช้ get_data)
  └── PLATFORM (LINE webhook ใช้ get_j + get_data)

BIBLE kb.json
  ├── JULIAN (empirical validation → empirical_p)
  ├── NOK (text input → speech)
  └── PLATFORM (wording output → TTS / LINE reply)

JULIAN data/julian_all.json (GitHub repo — public, ปัจจุบัน)
  ├── BIBLE (empirical validation → empirical_p)
  ├── HORATAD ("ดาวน์โหลดข้อมูลสาธารณะ" import)
  └── PLATFORM (personalized data สำหรับ chatbot)

JULIAN CF D1 (private — future only, ยังไม่เริ่ม)
  └── สำหรับ user private chart + real-time write-heavy query

NOK v3/tts.js
  ├── HORATAD V3 tab (ปุ่ม 🔊 ฟังคำพยากรณ์)
  └── PLATFORM (Phase 3 QR scan → speak; Phase 4 audio export)

PLATFORM
  └── consumes all above (ไม่มี project อื่น depend on PLATFORM)
```

---

## ไฟล์ Navigation

| ต้องการ | อ่านไฟล์ |
|---|---|
| ภาพรวม + architecture | `ECOSYSTEM.md` (ไฟล์นี้) |
| งานที่ต้องทำวันนี้ | `PROJECT_STATUS.md` |
| Claude instructions | `CLAUDE.md` |
| HORATAD detail | `docs/HORATAD_MANUAL.md` + `handoffs/HORATAD_*.md` |
| BIBLE detail | `docs/BIBLE_MISSION.md` + `handoffs/BIBLE_*.md` |
| JULIAN detail | `docs/JULIAN_MISSION.md` + `handoffs/JULIAN_*.md` |
| NOK detail | `handoffs/NOK_*.md` (Phase 1 deployed; voice/TTS roadmap) |
| PLATFORM detail | `handoffs/JULIAN_20260521_v2.md` → section PLATFORM VISION |

---

## สำหรับ Claude — วิธีใช้ไฟล์นี้

**เริ่ม session ใหม่:**
1. อ่าน `ECOSYSTEM.md` (ไฟล์นี้) — เข้าใจ architecture
2. อ่าน `PROJECT_STATUS.md` — ดู task ที่ต้องทำ
3. อ่าน `handoffs/<PROJECT>_*.md` ล่าสุด — รับ context จาก session ก่อน
4. เริ่มงานตาม Priority Framework

**เมื่อโปรเจคแข่งกัน:** ใช้ Priority Framework ด้านบน

**เมื่อสงสัย dependency:** ดู Cross-Project Dependencies Map

---

*สร้าง: 2026-05-21 | อัปเดตเมื่อมี project ใหม่หรือ architecture เปลี่ยน*
