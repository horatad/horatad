# HORATAD — Working Manual
### โหราทาส: Thai Astrology Intelligence Platform
**เวอร์ชัน:** 1.1 | **อัปเดต:** 2026-05-21 | **สถานะ:** Active Development

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

# 3. PRODUCT OVERVIEW

## 3.1 สิ่งที่ Horatad ทำ

```
Horatad = Event Timer (Alarm Clock) + Conversational AI
```

**Event Timer:** คำนวณตำแหน่งดาว → จับคู่กับกฎโหราศาสตร์ → แสดง timeline ของเหตุการณ์ที่คาดว่าจะเกิด พร้อมวันที่แม่น

**Conversational AI:** อธิบาย timing นั้น, ตอบคำถาม, สนทนาเกี่ยวกับดวงชาตา โดยมีกฎเป็น ground truth

## 3.2 จุดต่างจากโหราศาสตร์ทั่วไป

| ระบบทั่วไป | Horatad |
|---|---|
| "ปีนี้มีความท้าทาย" | "15 มิ.ย. เสาร์เล็งลัคนา → กระทบความสัมพันธ์" |
| ไม่มีวันผิด → ไม่มีวันพิสูจน์ | ตรวจสอบได้หลังวันนั้นผ่าน |
| LLM คาดเดาเอง | LLM craft wording จากกฎเท่านั้น |
| ไม่มี feedback loop | สะสม data → ปรับปรุงกฎต่อเนื่อง |

---

# 4. SYSTEM ARCHITECTURE

## 4.1 ภาพรวม 3 ชั้น

```
┌─────────────────────────────────────────────────────┐
│  LAYER 3: APPLICATION                                │
│  Horatad PWA — Mobile-first, Offline-capable         │
│  Event Timeline / Conversation / Group Compare       │
├─────────────────────────────────────────────────────┤
│  LAYER 2: INTELLIGENCE                               │
│  Calculation Engine + KB + LLM + Statistical Rules   │
├─────────────────────────────────────────────────────┤
│  LAYER 1: DATA                                       │
│  Knowledge Base + Empirical DB + User Events         │
└─────────────────────────────────────────────────────┘
```

## 4.2 Process Flow

```
INPUT: วันเกิด + เวลา + สถานที่
         ↓
  Julian Day Conversion
         ↓
  Ephemeris Calculation (engine.js)
  → planets[10] + lagna  [deterministic]
         ↓
  Rule Matching (match_rules)
  → KB lookup by conditions[]
         ↓
    ┌────┴────────────┐
    ↓                 ↓
  Timing Engine    LLM Layer (Typhoon)
  → When?          → craft wording
  [math only]      [from rules only]
    └────────┬───────┘
             ↓
  OUTPUT: Timeline + Conversation
  [provable, traceable, verifiable]
```

## 4.3 Data Structure หลัก

```json
// Knowledge Base Rule
{
  "id": 5009,
  "rule_type": "TRUE_RULE",
  "c": "ดาวอาทิตย์กุมลัคนา",
  "p": "หยิ่งในศักดิ์ศรี รักหน้า อีโก้สูง",
  "t": ["อาทิตย์", "ดี", "ลัคนา"],
  "conditions": [
    {"planet_id":"1","quality_required":"ANY","lagna_aspect_req":"กุมลัคนา","required":true}
  ],
  "pr": 1
}

// Empirical Record (Phase 2)
{
  "jd": 2451545.0,        // Julian Day — index หลัก
  "lat": 13.7563,
  "lng": 100.5018,
  "type": "human",
  "planets": [p0..p9],    // calculated deterministic
  "event_label": "career_change",
  "source": "wikipedia",
  "confidence": 0.9
}
```

## 4.4 Tech Stack

| Component | Technology |
|---|---|
| Frontend | Vanilla JS, PWA (no build step) |
| Calculation Engine | engine.js (custom ephemeris) |
| Knowledge Base | kb.json (342 rules, structured) |
| LLM / AI | Typhoon v2 (primary), Gemini/Groq (backup/benchmark) |
| Auth | Cloudflare Workers (horatad-auth) |
| AI Proxy | Cloudflare Workers (horatad-ai) |
| Deploy | GitHub Pages (auto-deploy from main) |
| Storage | localStorage + IndexedDB |

---

# 5. KNOWLEDGE BASE (KB)

## 5.1 ที่มาของกฎ

กฎโหราศาสตร์สุริยยาตร์ไทยจากตำราต้นฉบับ → แปลงเป็น structured JSON ผ่าน:
1. `parse_yaml_kb.mjs` — แปลง YAML ต้นฉบับ → kb_yaml_import.json
2. `fill_yaml_conditions.html` — ให้ AI เติม structured conditions
3. `dictionary_builder_v3.html` — UI สำหรับ edit/review/export

## 5.2 สถานะปัจจุบัน (V3.3.0)

| | |
|---|---|
| Rules ทั้งหมด | 342 rules |
| มี conditions[] | 284/342 (83%) |
| Rule types | TRUE_RULE: 104, TRANSIT_RULE: 49, CASE_STUDY: 122, HOUSE_CONCEPT: 50 |
| Empirical schema | `_empirical_schema` ใน root, sample fields ใน 2 rules |
| Missing combinations | 90 planet×quality combinations ขาดกฎ (ดู `v3/kb_skeletons.json`) |

## 5.3 KB Quality Tiers

- **Primary rules** (จากตำรา) — authoritative, ไม่เปลี่ยนได้ง่าย
- **Secondary rules** (จาก empirical data) — probabilistic, อัปเดตได้ตามข้อมูลจริง

---

# 6. ROADMAP

## Phase 1 — Foundation & Launch ✅ (ปัจจุบัน)
**เป้าหมาย:** App ทำงานได้ครบ, deploy แล้ว, เริ่มเก็บ user จริง

| งาน | สถานะ |
|---|---|
| Calculation engine (natal + transit) | ✅ Done |
| Knowledge Base V2 (342 rules + conditions) | ✅ Done V3.2.7 |
| V3 Tab: Event timeline + Conversation | ✅ Done |
| Group compare (สมพงศ์) | ✅ Done |
| PWA offline-capable | ✅ Done |
| Deploy GitHub Pages | ✅ Done |
| **Remaining:** match_rules() ใช้ conditions[] | 🔲 Next |
| **Remaining:** Structured LLM output (anti-hallucination) | 🔲 Next |

## Phase 2 — Intelligence Layer (Q3–Q4 2026)
**เป้าหมาย:** เพิ่มความแม่นยำ, กัน hallucination, เริ่มเก็บข้อมูล empirical

| งาน | Priority | Status |
|---|---|---|
| อัปเดต match_rules() ใช้ conditions[] | ⭐ สูง | ✅ V3.2.9 |
| Structured JSON output + rule_id validation | ⭐ สูง | ✅ V3.2.9 |
| Multi-LLM benchmark (Gemini, Groq, Typhoon CF) | ⭐ สูง | ✅ V3.2.9 |
| M8: Keyword composition engine (no-LLM prediction) | ⭐ สูง | ✅ V3.3.0 |
| M7: Empirical schema + rule skeleton generator | สูง | ✅ V3.3.0 |
| Known-rules cross-validation framework | สูง | 🔲 |
| User event logging (opt-in) | กลาง | 🔲 |
| Public figures scraper (Julian Day DB) | กลาง | 🔲 |

## Phase 3 — Empirical & Validation (2027)
**เป้าหมาย:** พิสูจน์ premise ด้วยข้อมูลจริง

| งาน | หมายเหตุ |
|---|---|
| Empirical DB: บุคคลสำคัญ + events | Wikipedia API scraper |
| Statistical analysis: P(event\|configuration) | Secondary rules |
| Prediction tracking: before/after comparison | พิสูจน์ premise |
| Benchmark framework ครบ 20+ known rules | extend จาก 6 ข้อ |

## Phase 4 — Small LLM (2027–2028)
**เป้าหมาย:** model เฉพาะทางโหราศาสตร์ไทย ประหยัดต้นทุน

| งาน | Detail |
|---|---|
| Synthetic training data | Typhoon + Gemini สร้าง 2,000–5,000 คู่ |
| Base model | Qwen2.5-3B-Instruct (Apache 2.0, ฟรี) |
| Fine-tune method | LoRA/QLoRA บน Google Colab T4 |
| ค่าใช้จ่ายประมาณ | $5–15 (data gen) + ฟรี (training) |
| Deploy | HuggingFace Inference API |

---

# 7. OBJECTIVES & KEY RESULTS (OKR)

## Phase 1 OKR (ปัจจุบัน)
| Objective | Key Result | สถานะ |
|---|---|---|
| KB ครบถ้วน | 342 rules, ≥80% มี conditions | ✅ 83% |
| App พร้อมใช้ | PWA + offline + mobile | ✅ |
| Deploy | GitHub Pages live | ✅ V3.2.7 |
| LLM grounded | match_rules() ใช้ conditions[] | 🔲 |

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

## 8.1 Technology (ปัจจุบัน — ส่วนใหญ่ฟรี)

| Resource | Cost | Status |
|---|---|---|
| GitHub Pages hosting | ฟรี | ✅ Active |
| Cloudflare Workers (auth + AI proxy) | ฟรีเทียร์ | ✅ Active |
| Typhoon API | Pay-per-token | ✅ Active |
| Gemini Flash API | ฟรี 1,500 req/วัน | 🔲 ต้องสมัคร |
| Groq API (LLaMA 70B) | ฟรี 14,400 req/วัน | 🔲 ต้องสมัคร |
| Chinda 4B (iApp, Thai) | ฟรี | 🔲 ต้องสมัคร |
| Google Colab (fine-tune) | ฟรี T4 GPU | Phase 4 |

## 8.2 Human Resources

| Role | ต้องการ | มีแล้ว |
|---|---|---|
| Full-stack Developer | ✅ | ✅ (Claude + owner) |
| Thai Astrology Expert | สำหรับ validate KB rules | 🔲 |
| Data Annotator | สำหรับ label events (Phase 3) | 🔲 |
| Business/Marketing | สำหรับ user acquisition | 🔲 |

## 8.3 Data Requirements

| Data | ปริมาณ | วิธีได้ |
|---|---|---|
| KB Rules ครบ | 342 rules (มีแล้ว 83%) | Typhoon fill + expert review |
| Training pairs (fine-tune) | 2,000–5,000 | Synthetic generation |
| Public figures (empirical) | ≥1,000 records | Wikipedia API scraper |
| User events (opt-in) | ≥200 | In-app logging |
| Hallucination benchmark | ≥20 questions | Expand from 6 existing |

---

# 9. ACTIVITIES & ACTION PLAN

## Sprint 1 — ทันที (พฤษภาคม–มิถุนายน 2026)

| # | Activity | ใคร | เวลา |
|---|---|---|---|
| 1.1 | สมัคร Gemini + Groq + iApp API keys | User | 1 วัน |
| 1.2 | อัปเดต match_rules() ใช้ conditions[] | Claude | 1 session |
| 1.3 | Structured JSON output + rule_id validation | Claude | 1 session |
| 1.4 | retry fill 59 rules ที่ยังว่าง | User (browser) | 1 ชั่วโมง |
| 1.5 | ทดสอบ V3.2.7 บนมือถือจริง | User | 1 วัน |

## Sprint 2 — ระยะสั้น (มิถุนายน–กรกฎาคม 2026)

| # | Activity | ใคร | เวลา |
|---|---|---|---|
| 2.1 | Multi-LLM benchmark tool (ใช้ thai-astro-api-compare) | Claude | 1 session |
| 2.2 | ขยาย hallucination test 6 → 20+ ข้อจาก KB | Claude | 1 session |
| 2.3 | Cross-validation: Gemini + Groq เทียบ known rules | Claude | 1 session |
| 2.4 | User event logging UI (opt-in) | Claude | 1 session |
| 2.5 | CF Workers: เพิ่ม Gemini/Groq endpoint | Claude | 1 session |

## Sprint 3 — ระยะกลาง (Q3 2026)

| # | Activity | ใคร | เวลา |
|---|---|---|---|
| 3.1 | Public figures scraper (Wikipedia API → Julian Day DB) | Claude | 1–2 sessions |
| 3.2 | Empirical DB schema + storage | Claude | 1 session |
| 3.3 | KB expert review (validate conditions[]) | User + Expert | — |
| 3.4 | Eval dataset 50 charts + expected rules | Claude + Expert | 1–2 sessions |
| 3.5 | Prediction tracking: save before → check after | Claude | 1 session |

## Sprint 4 — ระยะยาว (Q4 2026–2027)

| # | Activity | ใคร | เวลา |
|---|---|---|---|
| 4.1 | Synthetic training data generation (2,000+ pairs) | Claude | หลาย sessions |
| 4.2 | Fine-tune Qwen2.5-3B LoRA บน Colab | User + Claude | 1–2 วัน |
| 4.3 | Deploy small model + A/B test กับ Typhoon | Claude | 1 session |
| 4.4 | Statistical analysis: P(event\|configuration) | Claude | 1–2 sessions |

---

# 10. PARTNERSHIP PROPOSITION

## สิ่งที่ Horatad มีให้

| สิ่ง | รายละเอียด |
|---|---|
| **Working product** | App live บน horatad.github.io, V3.2.7 |
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

---

# 13. MISSION DETAIL — M7 & M8

## M7 — Empirical Validation Pipeline

**เป้าหมาย:** พิสูจน์กฎด้วยข้อมูลบุคคลจริง → คำนวณ `empirical_p` ต่อ rule

### Pipeline
```
Julian Day DB (บุคคลสำคัญ Wikipedia)
      ↓ match_rules() กับแต่ละ person
      ↓ ตรวจว่า event_label ตรง rule.p
      ↓ นับ hit/miss
      → empirical_p = hits / (hits + miss)
      → เก็บลง kb.json rule.empirical_p
```

### Schema fields (optional — absent = no data yet)
```json
"empirical_p":    0.73,    // P(trait | config), null = ไม่มีข้อมูล
"empirical_n":    47,      // sample size
"empirical_refs": ["JD:2451545.0"],  // Julian Days ที่ verify แล้ว
"secondary_obs":  ["มักเป็นผู้นำองค์กร"]  // observation เพิ่มเติม
```

### ไฟล์ที่เกี่ยวข้อง
- `v3/kb_skeletons.json` — 90 rule skeletons รอ empirical data + expert text
- `scripts/gen_rule_skeletons.mjs` — generator script

---

## M8 — Keyword Composition Engine

**เป้าหมาย:** Deterministic prediction จาก KB ไม่ใช้ LLM — 100% anti-hallucination

### API (ใน `v3/interpretation.js`)

```javascript
// สร้าง predictions array จาก matched rules
const preds = compose_local_prediction(matched_rules);
// preds = [{rule_id, text, keywords, polarity, chapter, source:'local'}]

// สรุป 1 paragraph
const summary = compose_summary_text(preds);
// → "ฉลาดเฉลียว มีเสน่ห์ แต่มีแนวโน้ม อีโก้สูง หยิ่งในศักดิ์ศรี"
```

### ข้อสังคัญ
- `text` = `rule.p` ทั้งหมด (ground truth ไม่เปลี่ยน)
- `keywords` = phrases แยกจาก `rule.p` ด้วย space/punctuation
- `polarity` = `+`/`-`/`~` จาก `t[]` tags + `conditions[]` (ไม่ใช่ text analysis)
- ใช้เป็น fallback เมื่อ Typhoon API ไม่พร้อม หรือ offline mode

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
