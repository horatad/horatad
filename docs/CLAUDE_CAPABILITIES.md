# Claude Capabilities — บทบาทใน Horatad Ecosystem

> เอกสารถาวรอธิบายว่า Claude ทำอะไรได้/ไม่ได้ใน ecosystem นี้
> ใช้เป็น reference เมื่อ user สงสัยว่าควรขอ Claude ทำอะไร หรือ session ไหนเหมาะกับงานแบบไหน

---

## 1. ภาพรวม — Claude คือ infrastructure ทาง cognitive

Claude ไม่ใช่แค่ "คนเขียนโค้ด" — ทำงานในบทบาทเหล่านี้พร้อมกันใน ecosystem:

| บทบาท | คำอธิบาย 1 ประโยค |
|---|---|
| **Builder** | เขียน/แก้โค้ดทุก project (HORATAD PWA, BIBLE engine, JULIAN scraper) |
| **Auditor** | review โค้ด + tradeoff + security ก่อน user commit |
| **Coordinator** | ดูข้าม project (BIG session) — จัดลำดับ + dependency chain |
| **Memory** | maintain handoff + WHY LOG + PROJECT_STATUS = ความจำข้ามวัน |
| **Tutor** | อธิบาย concept โหราศาสตร์/code ให้ user เข้าใจตัดสินใจได้ |
| **Gate** | ทักท้วงเมื่อ user สั่งสิ่งที่ไม่ best practice (`CLAUDE.md` § Best Practice First) |

---

## 2. ช่วยอะไรได้ — แยกตาม project

### 🟡 HORATAD (PWA หลัก)
- เขียน feature — V3 tab, capture, QR, JULIAN import, fallback chain
- fix bug — `engine.js`, `script.js`, `v3/*.js`
- UX tuning — toast wording, empty states, mobile-first layout
- deploy mechanics — version bump (6 ไฟล์), cache-bust, backup branch
- **ทำไม่ได้:** ทดสอบบนมือถือจริง (iOS Safari quirks) → ใส่ `[ทดลองใช้]` ใน handoff

### 🟢 BIBLE (Prediction Engine)
- rule editing — เพิ่ม/แก้ `v3/kb.json`, refactor `conditions[]`
- prompt engineering — Typhoon system prompt, phrase cluster design
- fallback logic — `compose_local_prediction()`, template wording
- review tooling — `tools/kb_reviewer.html`, kb_skeletons editor
- empirical_p formula — เขียน validator logic
- **ทำไม่ได้:** review 57 MISMATCH rules ด้วยตัวเอง (ต้อง expert ตัดสิน) | ทดสอบ LLM quality บนข้อมูลจริง

### 🟢 JULIAN (Empirical DB)
- scraper logic — SPARQL query, dedup layers, survivorship rules
- import pipeline — `workers/*.mjs`, GitHub Actions workflow
- schema design — D1 tables, UNIQUE constraints, enrichment fields
- debug workflow — อ่าน Actions log → fix หลาย bug ในรอบเดียว
- **ทำไม่ได้:** deploy CF Worker, จัด D1 production, ตัดสินใจ data source ใหม่

### 🔲 PLATFORM (ยังไม่เริ่ม)
- architect — design LINE webhook flow, TTS integration, chatbot state machine
- boilerplate — CF Worker template, LINE Messaging API skeleton
- content pipeline — script generator จาก BIBLE → YouTube/FB schedule
- **ทำไม่ได้:** LINE OA account setup, Meta Business Suite, ตัดสินใจ pricing/business model

### 🟢 REORG (meta — เอกสาร)
- trim docs — ลบ outdated, merge ซ้ำซ้อน, fix broken reference
- single source of truth — ECOSYSTEM/CLAUDE/PROJECT_STATUS อย่าให้ขัดกัน
- changelog — generate จาก git log

### 🔭 BIG (meta — coordinator)
- priority queue — scoring งานข้าม project (dependency +3, unblock +3, etc.)
- dependency chain — ชี้ว่าทำ A ก่อนจะปลดล็อก B + C
- new project proposal — ตรวจ gap ใน vision เสนอ project ใหม่
- session orchestration — แนะนำ session ถัดไปให้ user เปิด

---

## 3. ขอบเขตที่ Claude ทำไม่ได้

| งาน | ทำไมไม่ได้ | ใครต้องทำ |
|---|---|---|
| ทดสอบ UI บนมือถือจริง | sandbox ไม่มี browser/device | user → `[ทดลองใช้]` |
| Deploy CF Worker / D1 | ไม่มี CF token ใน sandbox | user → `wrangler deploy` |
| ตัดสินใจเรื่องเงิน / ToS | legal/business implication | user เท่านั้น |
| Expert review MISMATCH rules | ต้องความรู้โหราศาสตร์ลึก | user (โหร) |
| ใส่ข้อมูลจริง (real birth records) | privacy + สิทธิ์ใช้งาน | user |
| Architecture lock-in ระยะยาว | กระทบ runtime/cost ระยะยาว | user confirm ก่อน |

---

## 4. รูปแบบความร่วมมือที่ดีที่สุด

### Workflow pattern
```
User:    เปิด session บอก project scope ("session BIBLE")
Claude:  อ่าน ECOSYSTEM → STATUS → handoff → เสนองาน 3 ข้อ
User:    ยืนยัน หรือ override priority
Claude:  ทำ + commit + push (autonomy mode)
Claude:  พบงานที่ต้องใช้ device จริง → ใส่ [ทดลองใช้]
Claude:  จบ session → handoff + WHY LOG
User:    ทดสอบมือถือ / deploy CF / review rules
```

### Best practices สำหรับ user
- **บอก scope ชัด** ตอนเริ่ม session → Claude ไม่ explore ไกล
- **batch fix เล็ก** → ไม่ bump version ทุกครั้ง (ประหยัด token + overhead)
- **ใช้ BIG session** เดือนละ 1-2 ครั้ง → จัดลำดับข้าม project
- **review handoff เป็นครั้งคราว** → ตรวจว่า WHY LOG ตรงกับการตัดสินใจจริง

---

## 5. Cross-Project Coverage Matrix

| ความสามารถ Claude | HORATAD | BIBLE | JULIAN | PLATFORM | REORG |
|---|:-:|:-:|:-:|:-:|:-:|
| เขียน code feature | ✅ | ✅ | ✅ | ✅* | — |
| Fix bug | ✅ | ✅ | ✅ | ✅* | — |
| UX/Wording design | ✅ | ✅ | — | ✅* | — |
| Schema/Architecture | ✅ | ✅ | ✅ | ✅ | — |
| Deploy mechanics | ✅ | ✅ | ⚠️ | ⚠️ | — |
| Test บน device | ❌ | ❌ | ❌ | ❌ | — |
| Data review (expert) | — | ❌ | — | — | — |
| Doc maintenance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Coordination/Priority | — | — | — | — | — |

\* = หลังเริ่ม PLATFORM phase 2 เท่านั้น
⚠️ = เขียน script ได้ แต่ deploy ต้อง user run

---

## 6. Session type → ความสามารถที่ใช้

| Session | Builder | Auditor | Coordinator | Memory | Tutor |
|---|:-:|:-:|:-:|:-:|:-:|
| HORATAD | ✅ | ✅ | — | ✅ | ✅ |
| BIBLE | ✅ | ✅ | — | ✅ | ✅ |
| JULIAN | ✅ | ✅ | — | ✅ | — |
| PLATFORM | ✅ | ✅ | — | ✅ | ✅ |
| REORG | — | ✅ | — | ✅ | — |
| BIG | — | ✅ | ✅ | ✅ | ✅ |

---

## 7. สรุป

> Claude ทำได้เกือบทุกอย่างที่ user ทำได้ ยกเว้น 3 อย่าง:
> 1. สัมผัสมือถือจริง
> 2. เข้า production account (CF, LINE, Meta)
> 3. ตัดสินใจเรื่องที่มี legal/business/expert implication

ระบบนี้ออกแบบให้ **Claude ทำ 80%** (code + arch + docs + coordinator) → user ทำ 20% (test + deploy + expert review + ตัดสินใจที่ lock-in)

---

## ไฟล์ที่เกี่ยวข้อง

| ไฟล์ | บทบาท |
|---|---|
| `CLAUDE.md` | instructions ที่ Claude อ่านทุก session (autonomy, best practice, git workflow) |
| `ECOSYSTEM.md` | architecture + data flow + vision รวม |
| `PROJECT_STATUS.md` | task list รายวัน — Claude เลือกงานจากนี้ |
| `handoffs/<PROJECT>_*.md` | context ข้าม session — Claude เขียนเองตอนจบ session |
| `docs/CLAUDE_CAPABILITIES.md` | ไฟล์นี้ — reference เมื่อสงสัยว่า Claude ช่วยอะไรได้ |

---

*สร้าง: 2026-05-22 | อัปเดตเมื่อ Claude ได้ tool/ความสามารถใหม่ หรือ project structure เปลี่ยน*
