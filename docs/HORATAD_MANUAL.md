# HORATAD — Working Manual
### โหราทาส: Thai Astrology Intelligence Platform
**เวอร์ชัน:** 1.2 | **อัปเดต:** 2026-05-22 | **สถานะ:** Active Development

> 📌 ไฟล์นี้เก็บ **HORATAD-specific** เท่านั้น (Vision, KB structure, OKR, Partnership, Risks, Glossary, V2/V3 tech reference)
> Architecture / Roadmap / Tech stack / Sprint → ดู `ECOSYSTEM.md` + `PROJECT_STATUS.md`

---

# 1. VISION

> **"เครื่องมือพยากรณ์โหราศาสตร์ไทยที่พิสูจน์ได้ด้วยข้อเท็จจริง ไม่ใช่แค่คำพูดที่ฟังดูดี"**

Horatad เป็นแพลตฟอร์มโหราศาสตร์ไทยระบบสุริยยาตร์ที่ผสานความแม่นยำของการคำนวณดาราศาสตร์เข้ากับ AI สมัยใหม่ เพื่อให้คำพยากรณ์ที่:

- **Provable** — ทุกการพยากรณ์อ้างอิงกฎเฉพาะ ตรวจสอบได้หลังเหตุการณ์เกิดขึ้นจริง
- **Precise** — ระบุเวลาของเหตุการณ์ (timing) ได้ ไม่ใช่แค่คำทำนายลอยๆ
- **Transparent** — user รู้ว่าคำพยากรณ์มาจากกฎใด ไม่ใช่ black box
- **Scalable** — เรียนรู้และพัฒนาตัวเองจากข้อมูลเหตุการณ์จริงสะสมตามเวลา

---

# 2. MISSION

พัฒนาระบบ AI สำหรับโหราศาสตร์ไทยสุริยยาตร์ที่:

1. **คำนวณแม่น** — engine ดาราศาสตร์ที่ถูกต้องตาม ephemeris จริง
2. **กฎครบถ้วน** — Knowledge Base (KB) จากตำราสุริยยาตร์ พร้อม structured conditions
3. **สื่อสารดี** — LLM แปลงผลการคำนวณเป็นภาษาที่มนุษย์เข้าใจ โดยไม่เพิ่มเติมสิ่งที่ไม่มีในกฎ
4. **พิสูจน์ได้** — สะสม database ของเหตุการณ์จริงเพื่อ validate และขยายกฎเกณฑ์
5. **เข้าถึงง่าย** — PWA ทำงานได้บนทุกอุปกรณ์ ออฟไลน์ได้

---

# 3. PRODUCT OVERVIEW — จุดต่างจากโหราศาสตร์ทั่วไป

| ระบบทั่วไป | Horatad |
|---|---|
| "ปีนี้มีความท้าทาย" | "15 มิ.ย. เสาร์เล็งลัคนา → กระทบความสัมพันธ์" |
| ไม่มีวันผิด → ไม่มีวันพิสูจน์ | ตรวจสอบได้หลังวันนั้นผ่าน |
| LLM คาดเดาเอง | LLM craft wording จากกฎเท่านั้น |
| ไม่มี feedback loop | สะสม data → ปรับปรุงกฎต่อเนื่อง |

> Horatad = Event Timer (Alarm Clock) + Conversational AI

---

# 4. SYSTEM ARCHITECTURE

ภาพรวม architecture, data flow, tech stack, cross-project dependencies → **`ECOSYSTEM.md`** (authoritative)

> ⚠️ Layer diagram + Process flow + Tech stack table เคยอยู่ในนี้ — ย้ายไป ECOSYSTEM.md เพื่อกัน drift

---

# 5. KNOWLEDGE BASE (KB)

## 5.1 ที่มาของกฎ

กฎโหราศาสตร์สุริยยาตร์ไทยจากตำราต้นฉบับ → แปลงเป็น structured JSON ผ่าน:
1. `parse_yaml_kb.mjs` — แปลง YAML ต้นฉบับ → kb_yaml_import.json
2. `fill_yaml_conditions.html` — ให้ AI เติม structured conditions
3. `dictionary_builder_v3.html` — UI สำหรับ edit/review/export

## 5.2 สถานะปัจจุบัน (KB V2.3.0 / App V3.3.12)

| | |
|---|---|
| Rules ทั้งหมด | 342 rules |
| มี conditions[] | 284/342 (83%) |
| Rule types | TRUE_RULE: 104, TRANSIT_RULE: 49, CASE_STUDY: 122, HOUSE_CONCEPT: 50 |
| Taxonomy | `rule_source` (major/minor/empirical/case_study) + `weight` — 342/342 ✅ |
| Empirical schema | `_empirical_schema` ใน root, fields รอ JULIAN data |
| Missing combinations | 90 planet×quality combinations ขาดกฎ (ดู `v3/kb_skeletons.json`) |
| MISMATCH รอ review | 57 rules (conditions vs tag ไม่ตรง — รอ expert) |

## 5.3 KB Quality Tiers

- **Primary rules** (จากตำรา) — authoritative, ไม่เปลี่ยนได้ง่าย
- **Secondary rules** (จาก empirical data) — probabilistic, อัปเดตได้ตามข้อมูลจริง

---

# 6. ROADMAP

Roadmap 5 phases (Phase 0–5+) + cross-project dependencies → **`ECOSYSTEM.md` → Roadmap section** (authoritative)

> ⚠️ Phase 1–4 + Sprint plan เคยอยู่ในนี้ — ย้ายไป ECOSYSTEM.md เพื่อกัน drift กับ PROJECT_STATUS.md

---

# 7. OBJECTIVES & KEY RESULTS (OKR)

## Phase 1 OKR (ปัจจุบัน — V3.3.12)
| Objective | Key Result | สถานะ |
|---|---|---|
| KB ครบถ้วน | 342 rules, ≥80% มี conditions | ✅ 83% |
| App พร้อมใช้ | PWA + offline + mobile | ✅ |
| Deploy | horatad.com (GitHub Pages) live | ✅ V3.3.12 |
| LLM grounded | match_rules() ใช้ conditions[] | ✅ V3.2.9 |
| Anti-hallucination | structured JSON output + M8 keyword fallback | ✅ V3.3.0–V3.3.6 |

## Phase 2 OKR
| Objective | Key Result |
|---|---|
| Anti-hallucination | rule_id validation 100%, hallucination rate < 5% |
| LLM benchmark | เลือก best LLM สำหรับ wording layer |
| Data foundation | ≥200 user events logged, ≥500 public figures scraped |
| Cross-validation | known-rules accuracy ≥85% บน benchmark set |

## Phase 3 OKR
| Objective | Key Result |
|---|---|
| Empirical proof | P(event\|configuration) คำนวณได้ ≥10 configurations |
| Prediction tracking | ≥50 predictions tracked before/after |
| Secondary rules | ≥20 rules เพิ่มจาก empirical data |

---

# 8. RESOURCE REQUIREMENTS

Tech stack + Free/paid API matrix + Data requirements → **`ECOSYSTEM.md` → Technology Stack**
Task list ปัจจุบัน + sprint priority → **`PROJECT_STATUS.md`**

Human resources ที่ยังขาด:
- Thai Astrology Expert — validate KB rules (BIBLE)
- Data Annotator — label events (Phase 3)
- Business/Marketing — user acquisition

---

# 9. ACTIVITIES & ACTION PLAN

Sprint backlog ที่ทันสมัย → **`PROJECT_STATUS.md`** + **`handoffs/<PROJECT>_*.md`** ล่าสุด

> ⚠️ Sprint 1–4 (พ.ค. 2026 – Q4 2027) เคยอยู่ในนี้ — outdated เร็ว (V3.2.7 sprint plan ตอนนี้ผ่านมาแล้ว V3.3.12)

---

# 10. PARTNERSHIP PROPOSITION

## สิ่งที่ Horatad มีให้

| สิ่ง | รายละเอียด |
|---|---|
| **Working product** | App live บน horatad.com, V3.3.12 |
| **Technical foundation** | Calculation engine แม่น + KB 342 rules structured |
| **Unique premise** | Provable predictions — ตรวจสอบได้ ไม่ใช่แค่ rhetoric |
| **Scalable architecture** | ออกแบบรองรับ empirical DB + fine-tune |
| **Low infrastructure cost** | ส่วนใหญ่ฟรี (GitHub Pages, Cloudflare free tier, Gemini/Groq free API) |
| **Clear roadmap** | 4 phases ชัดเจน พร้อม OKR |

## โอกาสทางธุรกิจ

- **กลุ่มเป้าหมาย:** ผู้ใช้ภาษาไทยที่สนใจโหราศาสตร์ (ตลาดใหญ่)
- **Differentiation:** ระบบเดียวที่อ้าง provable timing แทนคำทำนายลอย
- **Data moat:** เมื่อ empirical DB เติบโต → secondary rules → ยิ่งแม่นกว่าคู่แข่ง
- **AI leverage:** ใช้ LLM ฟรี/ถูก → ต้นทุนต่ำมาก (Gemini 1,500 req/วัน ฟรี)
- **Fine-tune moat (Phase 4):** Small model เฉพาะโหราศาสตร์ไทย → ไม่มีใครทำได้เหมือน

## สิ่งที่ต้องการจากหุ้นส่วน

| ต้องการ | รายละเอียด |
|---|---|
| **Domain Expertise** | ผู้เชี่ยวชาญโหราศาสตร์สุริยยาตร์ไทย validate KB rules |
| **User Acquisition** | เครือข่ายผู้ใช้กลุ่มเป้าหมาย |
| **Data Contribution** | บันทึกเหตุการณ์จริงเพื่อ empirical DB |
| **Infrastructure (optional)** | CF Workers paid / GPU สำหรับ fine-tune |

---

# 11. RISKS & MITIGATIONS

| Risk | ความเสี่ยง | Mitigation |
|---|---|---|
| KB quality ต่ำ | conditions[] ผิด → match ผิด → พยากรณ์คลาดเคลื่อน | Expert review + cross-LLM validation |
| LLM hallucination | Typhoon แต่งเนื้อหาเพิ่ม | Structured output + rule_id validation (M3) |
| Data bias | Public figures ไม่ representative | หลาย source + confidence scoring |
| Fine-tune quality | Synthetic data ไม่ดีพอ | Cross-LLM generation + human filter |
| Infrastructure cost | API cost สูงเมื่อ scale | Multi-LLM routing (ฟรี first, paid fallback) |

---

# 12. GLOSSARY

| คำ | ความหมาย |
|---|---|
| สุริยยาตร์ | ระบบโหราศาสตร์ไทยโบราณ ใช้ Sidereal zodiac |
| Julian Day (JD) | ระบบนับวันต่อเนื่องจากดาราศาสตร์ ไม่มี timezone |
| conditions[] | structured rules ที่ระบุ planet + quality + aspect แบบ machine-readable |
| match_rules() | ฟังก์ชันจับคู่ดวงชาตากับ KB rules |
| Typhoon | Thai LLM (typhoon-v2-70b) ของ SCB Tech X |
| LoRA | Low-Rank Adaptation — fine-tune เฉพาะ ~1% ของ model parameters |
| Empirical DB | database เหตุการณ์จริงพร้อมตำแหน่งดาว สำหรับ validate กฎ |
| Secondary rules | กฎที่ได้จาก statistical analysis ของ empirical DB |
| Provable prediction | การพยากรณ์ที่ระบุ timing ชัดเจน ตรวจสอบได้หลังเกิดจริง |

---

# 13. MISSION DETAIL

รายละเอียด M0–M8 ทั้งหมด (Multi-LLM benchmark, KB foundation, structured output, empirical validation, keyword composition engine) **อยู่ใน `docs/BIBLE_MISSION.md`** — authoritative ไฟล์เดียว ไม่ duplicate

> ⚠️ เคยมี M7 + M8 detail ในนี้ — ย้ายไป BIBLE_MISSION.md เพื่อกัน drift

---

# 14. CASE STUDIES

ดู **`CASE_STUDIES.md`** — บันทึก PDCA ทุก experiment แยกออกมาเพื่อ manual ไม่บวม

> Format: CS001, CS002, ... | tag: PROJECT (HORATAD/BIBLE/JULIAN) + วันที่

---

*เอกสารนี้อัปเดตต่อเนื่อง — version ล่าสุดที่ HORATAD_WORKING_MANUAL.md ใน repository*

---

# 15. HORATAD — Technical Reference for Claude

> Section นี้ย้ายมาจาก CLAUDE.md เพื่อแยก universal rules ออกจาก HORATAD-specific rules
> Claude อ่าน section นี้เมื่ออยู่ใน HORATAD session เท่านั้น

## Stack

- **Frontend**: vanilla JS, no build step — edit ตรง → push → GitHub Pages deploy
- **Service Worker**: `sw.js` — cache-first สำหรับ same-origin, network-first สำหรับ `version.json`
- **CF Workers**: `horatad-ai` + `horatad-auth` — deploy ผ่าน wrangler **ไม่ใช่** git push
- **V3 modules**: `v3/*.js` เป็น ES module (v3tab.js, engine.js, interpretation.js, typhoon.js)
- **Production URL**: `https://horatad.github.io/horatad/` (deploy from main branch)

## Version bump checklist (ทุกครั้งที่มี change)

bump `X.Y.Z` พร้อมกัน **6 จุด**:

| ไฟล์ | pattern |
|---|---|
| `script.js` | `HORATAD:SCRIPT:X.Y.Z` (l.1) + `Version X.Y.Z` (l.2) + `const APP_VERSION='X.Y.Z'` |
| `sw.js` | `HORATAD:SW:X.Y.Z` + `Version X.Y.Z` + `const CACHE_NAME='horatad-vX.Y.Z'` |
| `version.json` | `{"_id":"HORATAD:VERSION","v":"X.Y.Z"}` |
| `index.html` | 6 จุด — `HORATAD:INDEX`, `Version`, `style.css?v=`, `brand-ver`, `about-version`, `script.js?v=`, `v3tab.js?v=` (use `replace_all`) |
| `style.css` | `HORATAD:STYLE:X.Y.Z` (l.1) |
| `v3/v3tab.js` | bump เฉพาะตอนแก้ V3 logic — มี internal version (`Version 3.0.X`) แยก |

**Changelog**: prepend block ใน `script.js` header — `// Changes: [VX.Y.Z] <type>: <bullet>...`

## Cache-bust convention

ทุก asset URL ต้องมี `?v=APP_VERSION`:
- ใน `index.html`: hardcode (`?v=X.Y.Z`)
- ใน `sw.js` `CORE_ASSETS`: `'./X?v='+V`
- ใน ES module (เช่น v3tab.js): อ่านจาก `window.APP_VERSION`
  (`const` ใน classic script ไม่อยู่บน window อัตโนมัติ — `script.js` ต้องทำ `window.APP_VERSION=APP_VERSION;`)

ถ้า key ไม่ตรงกัน 100% (เช่น SW cache `kb.json?v=2.2.39` แต่ module fetch `kb.json`) → offline ใช้ไม่ได้

## Project quirks

- **Memory dedup key**: `${name}|${d}/${m}/${y_be}|${t}|${prov}` — ถ้าแก้ field ที่เป็นส่วนของ key จะสร้าง entry ใหม่ (V2.2.38 รองรับ edit mode ผ่าน `replaceKey` param)
- **PIN auth**: V3 tab unlock ผ่าน CF Worker `horatad-auth` — ห้าม hardcode PIN ใน frontend
- **Era toggle**: BE (พ.ศ.) ↔ CE (ค.ศ.) — input field เก็บตาม era ปัจจุบัน แต่ memory เก็บ y_be เสมอ
- **Numpad commit**: `_setField()` ใช้ `.value=` ตรงๆ → ไม่ trigger `input` event → ถ้าต้องปลุก listener (เช่น DB indicator) ต้องเรียกเอง
- **iOS Safari `<input type="time">`**: บางครั้ง fire เฉพาะ `change` ไม่ใช่ `input`
*Production URL: https://horatad.github.io/horatad/*
