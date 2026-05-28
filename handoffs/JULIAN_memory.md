# JULIAN_memory — Session Learnings สะสม
# Claude อ่านไฟล์นี้ก่อนทุก session JULIAN

> ไฟล์นี้ ≠ handoff — ไม่มี PENDING/DONE  
> จุดประสงค์: เก็บ schema decisions, source patterns, scraping gotchas  
> (สิ่งที่ต้องรู้ทุก session แต่ไม่อยู่ใน code)

## เมื่อไหร่ต้องอัปเดตไฟล์นี้

| Trigger | Section ที่เพิ่ม |
|---|---|
| debug scraper แล้วเจอว่า selector/pattern ผิด | §3 Source Patterns (gotcha ใหม่) |
| เพิ่ม/เปลี่ยน field ใน schema | §2 Database Schema |
| เพิ่ม query series ใหม่หรือเปลี่ยน target | §5 Query Series |
| พบ data quality issue ใหม่ (grade ผิด, dup logic พัง) | §6 Known Issues |
| records milestone (ทุก 10K) + distinct jd rate | §7 Records Timeline |
| ตัดสินใจ architecture (เช่น เพิ่ม source ใหม่) | §8 WHY LOG |

**ไม่ต้องอัปเดตถ้า**: workflow รันปกติ ตัวเลข records เพิ่ม ไม่มี bug/decision

---

## 1. ปรัชญาหลัก

- **distinct birthdate (jd) > total count** — 56% dup rate คือสัญญาณว่า query ซ้ำกัน → ขยาย query series ก่อนนับ records
- **birth time = optional** — Astrotheme match 1.24% ถ้าบังคับ time_utc = ใช้ได้แค่ 588/53K records → validate หน้างาน ไม่ block pipeline
- **accuracy grade > confidence number** — เกรด A/B/C/D/F อ่านเข้าใจทันที ไม่ต้องตีความ

---

## 2. Database Schema

### julian_all.json — record format
```json
{
  "name": "string",
  "jd": 2451545.5,
  "birth_date": "YYYY-MM-DD",
  "time_utc": "HH:MM",
  "lat": 0.0,
  "lng": 0.0,
  "gender": "M|F|U",
  "notes": "string",
  "accuracy": "A|B|C|D|F",
  "sources": ["wikidata:Q...", "astrotheme:...", "wikipedia_th:title|wikidata:Q..."]
}
```

### Accuracy grades
| Grade | นิยาม | จำนวน (2026-05-23) |
|---|---|---|
| A | สูจิบัตร / official document | 0 (รอ user seed) |
| B | คนใกล้ชิด / family testimony | 0 |
| C | สาธารณะ verified (Astrotheme + Wikipedia cite) | 588 |
| D | สาธารณะ unverified (Wikidata date only, no time) | 52,550 |
| F | unknown / placeholder | 10 |

### Dedup layers (4 ชั้น)
1. `seen_qids` in-memory set
2. UNIQUE constraint: `(jd, name)` — ป้องกัน exact dup
3. UNIQUE constraint: `source` entry
4. COALESCE survivorship — ถ้า record มีอยู่แล้ว keep ที่มีข้อมูลมากกว่า

---

## 3. Data Sources — Patterns

### Wikidata SPARQL (primary)
```sparql
# Query pattern หลัก (human + birthdate + sex)
SELECT ?person ?personLabel ?birthdate ?sex_label WHERE {
  ?person wdt:P31 wd:Q5;           # human
          wdt:P569 ?birthdate;      # has birthdate
          wdt:P21 ?sex.
  ?sex rdfs:label ?sex_label.
  FILTER(lang(?sex_label)="en")
}
```
- Endpoint: `https://query.wikidata.org/sparql`
- User-Agent: ต้องส่ง เพราะ Wikidata block default agent
- QID format: `wikidata:Q{number}` — เก็บใน sources[]

**Gotchas:**
- `?birthdate` อาจเป็น precision day หรือ month หรือ year เท่านั้น — ต้อง filter `xsd:dateTime`
- SPARQL timeout 60s — batch query ต้องไม่เกิน 10,000 results ต่อ query
- บาง QID มี birthdate เป็น "0000-00-00" → กรองทิ้ง

### Astrotheme (enrichment)
- URL pattern: `https://www.astrotheme.com/astrology/{FirstName-LastName}`
- Match: ชื่อ fuzzy match กับ Wikidata name
- Extract: `time_utc`, `lat`, `lng`, `birth_city`
- **lat/lng parser bug (2026-05-23)**: selector ไม่ตรง coord field → lat/lng = 0 ทั้งหมด — รอ debug
- Source format: `astrotheme:{slug}` ใน sources[]
- Match rate: ~1.24% (เพราะชื่อ + หน้าต้องตรง)

### Wikipedia TH (enrichment)
```
Pattern เวลาที่ parser รู้จัก:
  "เวลา HH:MM น."
  "HH นาฬิกา MM นาที"
  "เวลา HH นาฬิกา"
  "เวลา HH น."
รองรับ: เลขไทย (๐-๙ → 0-9)
Extract: จังหวัด → notes field (เผื่อ geocode ภายหลัง)
```
- offline parser test: 7/7 ผ่าน (2026-05-23)
- ⚠️ workflow run #21: 0 records — อาจ API block ใน GHA หรือ pattern miss จาก HTML จริง
- Source format: `wikipedia_th:{title}|wikidata:Q{number}`

### Manual Seed (tools/julian_seed_input.html)
- User กรอก records accuracy A/B/C ผ่าน UI
- Export JSON → commit `data/julian_thai_seed.json`
- Merge script: `workers/julian_seed_merge.mjs` (validation + dedup)
- Workflow step: "Manual seed merge" รัน after Wikipedia TH

---

## 4. Workflow Architecture

```
Cron (ทุก 6h):
  1. Wikidata SPARQL scrape → insert (all 137 queries)
  2. Astrotheme enrich → update time_utc (target 200/run)
  3. Wikipedia TH enrich → update time_utc (target 200/run, focus tier1 + country=TH)
  4. Manual seed merge
  5. Commit julian_all.json + push
  6. Create GitHub Release
```

**Config:** `workers/julian_config.mjs`
- `TARGET_RECORDS = 100000`
- หยุดเองเมื่อถึง target หรือ queries หมด

**Export paths:**
- `data/julian_all.json` — repo (CORS-free GitHub raw)
- GitHub Release — asset ทุก run (ใช้เมื่อต้องการ version snapshot)

---

## 5. Query Series (137 queries)

| Series | จำนวน | จุดประสงค์ |
|---|---|---|
| Category | 15 | athletes, politicians, actors, musicians, scientists, etc. |
| Era 20-yr | 80 | born 1900-2000 (20-yr blocks × 4 era decades) |
| ASTROTHEME_SERIES | 42 | famous Thais + astro community requests |

**jd dup rate 56%**: เพราะ era queries overlap กับ category queries — เพิ่ม diversity query (profession P106, award P166) จะได้ distinct jd มากขึ้น

---

## 6. Known Issues & Workarounds

| Issue | Status | Workaround |
|---|---|---|
| Astrotheme lat/lng = 0 | ⚠️ open | rungebo debug session → fix selector |
| Wikipedia TH 0 records | ⚠️ open | ดู workflow log step → ส่ง Claude debug |
| F grade records (10) | ℹ️ keep | "07:16" placeholder — ไม่ลบ เพื่อ trace regress |
| Wikidata timeout | ℹ️ retry | batch query < 10K results |

---

## 7. Records Timeline

| วันที่ | Records | Distinct JD | Notes |
|---|---|---|---|
| 2026-05-22 | 47,508 | 20,813 | เพิ่ม accuracy field + Wikipedia TH step |
| 2026-05-23 | 53,148 | ~23,000 | run #21 +5,640 records |
| Target | 100,000 | ~40,000+ | คาดถึงใน 2-3 วัน |

---

## 8. WHY LOG สะสม

- **TARGET 50K → 100K** — distinct jd ยัง saturate แสดงว่า query series มี overlap เยอะ → ขยาย target จะได้ jd ใหม่อีก (~8-9 runs ถึง 100K)
- **accuracy grade A-F แทน confidence 0-1** — เกรดแบบโรงเรียนสื่อสารง่ายกว่า (อ่านทันที, ไม่ต้องตีความ threshold)
- **birth time optional** — validate หน้างานดีกว่า block pipeline. 46K records accuracy=D ใช้ได้ทันที (planet position ไม่ต้องการ time, แค่ lagna ต้องการ)
- **ไม่ลบ F grade** — เก็บไว้ trace bug placeholder "07:16" ถ้าเพิ่มขึ้นมาก = scraper regress
- **GitHub raw แทน CF Release** — CORS-free, free, ไม่มี token expire. Release ใช้สำหรับ version snapshot เท่านั้น

---

## 11. ⛔ กฎเหล็ก FB Content Policy — อ่านก่อนเขียน proposal ทุกครั้ง

> **ละเมิดกฎข้อใดข้อหนึ่ง = ห้ามโพสต์เด็ดขาด**
> (เสี่ยงถูก Shadowban / Reach ลด / Account ถูก restrict)

### 🔴 ห้ามทำ (Hard Ban — อาจถูกลบโพสต์หรือ ban page)

| กฎ | ตัวอย่างที่ผิด | สาเหตุ |
|---|---|---|
| **ห้ามทำนายบุคคล** | "ช่วงนี้คุณเสี่ยงเสียชีวิต" | Harmful personal prediction |
| **ห้ามใช้ "คุณจะ / ท่านจะ"** | "คุณจะได้รับรางวัล" | FB flag: fortune telling |
| **ห้าม claim absolute** | "พิสูจน์แล้วว่า...", "ทุกคนที่..." | Misinformation policy |
| **ห้าม Engagement Bait** | "Tag เพื่อนที่เป็นราศีนี้", "Share เพื่อโชค", "Like ถ้า..." | Engagement bait = reach ลดทันที |
| **ห้ามโพสต์ death ด้านเดียว** | caption เฉพาะ hard_death ไม่มี soft_award | Morbid content flag |
| **ห้ามอ้างสถิติโดยไม่มี n และ p** | "มีโอกาสสูงกว่าปกติ" (ไม่บอก n) | Unverified statistical claim |

### 🟡 ระวัง (Soft Ban — ลด Reach โดยไม่แจ้ง)

| กฎ | เหตุผล |
|---|---|
| ห้ามใส่ลิงก์ภายนอกทุกโพสต์ | FB กด reach โพสต์ที่พาคนออก platform |
| ห้ามโพสต์เกิน 2 ครั้ง/วัน | Spam signal |
| ห้าม copy-paste caption ซ้ำ | Duplicate content suppression |
| ห้ามใช้ hashtag เกิน 5 อัน | FB ไม่ช่วย reach — ดูเป็น spam |

### ✅ ต้องมีในทุก caption (Mandatory Elements)

1. **Framing เป็นงานวิจัยสถิติ** — ขึ้นต้นด้วย "🔭 โหราทาส วิจัย:" หรือ "📊 สถิติพบว่า:"
2. **n + p-value** — ต้องแสดงทุกครั้ง เช่น `(n=2,823, p<0.001)`
3. **Disclaimer** — ต้องจบด้วย: `⚠️ สถิติประชากร ≠ ชะตากรรมบุคคล`
4. **Credit TALS** — ทุก public post ต้องมี: `ระบบ TALS (ยืนยง นาวาสมุทร)` หรือ `#TALS`
5. **ทั้ง 2 ขั้ว** — ถ้า post เรื่อง death ต้องรวม award ด้วย (hard + soft pair)

### ✅ กรอบภาษาที่ปลอดภัย

```
❌ ผิด:  "ช่วงนี้คุณเสี่ยงเสียชีวิตสูงขึ้น"
✅ ถูก:  "สถิติพบว่าช่วงนี้ในกลุ่มประชากรตัวอย่าง มีเหตุการณ์สำคัญสูงกว่าค่าเฉลี่ย 1.16 เท่า"

❌ ผิด:  "พิสูจน์แล้วว่าดาวเสาร์ทำให้เสียชีวิต"
✅ ถูก:  "งานวิจัยพบสหสัมพันธ์ทางสถิติ — ไม่ใช่การพิสูจน์ความเป็นเหตุเป็นผล"

❌ ผิด:  "Tag เพื่อนที่เกิดราศีนี้"
✅ ถูก:  "คุณเคยสังเกตเหตุการณ์ในช่วงนี้ไหม? แชร์ความคิดเห็นใน comment"
```

### 🤖 Code Enforcement
ฟังก์ชัน `checkFBPolicy(body)` ใน `workers/julian_proposal_gen.mjs` ตรวจ violations อัตโนมัติ
และ `buildFBCaption()` auto-append disclaimer + เตือน warning ถ้าโพสต์ death ไม่มี award คู่

---

## 10. Vocabulary Standard — กฎถาวรสำหรับการเขียน FB / Research

> **อ่านก่อนเขียน FB post ทุกครั้ง** — ไฟล์นี้เป็น source of truth คำศัพท์

### แหล่งข้อมูล
- `content/vocab_standard.json` — canonical list (ดูแลโดย Vocabulary tab ใน julian_approval.html)
- `workers/julian_proposal_gen.mjs` — โหลด vocab ตอน module init (`const VOCAB = loadVocab()`)

### 4-Field Schema (เหตุผลแต่ละ field)
| Field | ใช้ที่ | ตัวอย่าง SU |
|---|---|---|
| `research_abbrev` | ตัวย่อในตาราง/code/research | `"SU"` |
| `research_label` | ข้อความใน FB post body | `"ดาวอาทิตย์"` |
| `tals_terms[]` | คำสั้นตามตำรา TALS | `["อาทิตย์", "ดาวอาทิตย์"]` |
| `llm_aliases[]` | normalize input จาก LLM/text อื่น | `["Sun", "Sol", "☉"]` |

### ⚠️ CRITICAL: Aspect Mapping (TALS vs Western — สลับกัน)
| Code ใน valid_rules | TALS term (ถูก) | Western term (ผิดบริบทนี้) | องศา |
|---|---|---|---|
| `conj` | **กุม (KUM)** | Conjunction | 0° |
| `oppo` | **เล็ง (LENG)** | Opposition | 180° |
| `trin` / `dist5` | **โยค (YOK)** | Trine | 120° |
| `sext` / `dist1` | **ตรีโกณ (TRI)** | Sextile | 60° |
| `squa` | **ไม่มีใน TALS** | Square | 90° |

TALS มีแค่ 4 มุม: กุม/เล็ง/โยค/ตรีโกณ — ห้ามใช้ Square ใน FB content

### Functions ที่ใช้ใน code
```javascript
vocabLabel(abbrev)          // → research_label (ใช้ใน FB body)
vocabTals(abbrev)           // → tals_terms[0] (ใช้ใน proposal.thai)
vocabAliases(abbrev)        // → llm_aliases[] (ใช้ normalize input)
aspectLabel(code)           // → TALS Thai label จาก rule code
buildFBCaption(proposal)    // → string caption พร้อมโพสต์ FB (ใช้ vocab ทุกตัว)
```

### ดาวในระบบ JULIAN
| abbrev | research_label | TALS tals_terms[0] |
|---|---|---|
| SU | ดาวอาทิตย์ | อาทิตย์ |
| MO | ดาวจันทร์ | จันทร์ |
| MA | ดาวอังคาร | อังคาร |
| ME | ดาวพุธ | พุธ |
| JU | ดาวพฤหัสบดี | พฤหัสบดี |
| SA | ดาวเสาร์ | เสาร์ |
| KE | ดาวพระเกตุ | เกตุ |
| MR | ดาวยูเรนัส (มฤตยู) | ยูเรนัส |
| RA | ดาวราหู | ราหู |

---

## 9. LOG — session learnings (append-only)

<!-- append ลง table นี้ทุกครั้งที่ session update ไฟล์นี้ — ห้ามแก้ entry เก่า -->
<!-- ถ้าข้อมูลเดิมผิด → เพิ่ม "⚠️ แก้ไข (date): ..." ต่อท้าย row เดิม ไม่ลบ -->

| วันที่ | trigger | สิ่งที่เรียนรู้ |
|---|---|---|
| 2026-05-23 | สร้างไฟล์ | schema + accuracy A-F, dedup 4 layers, Wikidata SPARQL pattern (QID/precision gotchas), Astrotheme match 1.24% + lat/lng bug, Wikipedia TH parser 7 patterns + 0 records issue, workflow cron arch, 137 query series, WHY LOG |
| 2026-05-24 | schema drift + architecture | (1) **Schema correction**: record ใช้ `source: "string"` ไม่ใช่ `sources: []` array — §2 ผิด ⚠️ แก้ไข: ดู doc ใหม่ใน Phase 1 README. (2) **Time_utc distribution analysis**: 1,404 records มี time_utc แต่ 98% มาจาก Wikidata precision≥13 = round hour approximation ไม่ใช่ official birth time. Top distribution 7-11 AM + 16/18/20 — กระจุกผิดปกติ → editor กรอก rough hour. (3) **"07:16" placeholder 10 records** = fictional characters (Ellen Ripley, SHODAN, Moo Deng) — scraper ไม่ควรเข้า dataset แต่ Wikidata มี birthdate field. (4) **Sandbox network**: astrotheme.com + query.wikidata.org + www.wikidata.org + *.wikipedia.org **403 host_not_allowed** — ทดสอบ scraping live จาก sandbox ไม่ได้ใดๆ. (5) **Accuracy overgrade bug**: scraper.mjs:162 ใช้ `time_utc ? 'C' : 'D'` → records 602 C grade ทั้งหมดจริงๆควรเป็น D (เพราะ precision-13 = hour ไม่ใช่ verified). Fix รอ session ถัดไป. |
| 2026-05-24 | raw bucket architecture (Phase 1-2) | (1) **Multi-tank design**: scrapers แยก write raw bucket ของตัวเอง (data/julian_raw/<source>.jsonl) → preserve provenance, enable re-process ฟรี, conflict detection. (2) **Helper module**: workers/julian_raw_writer.mjs — appendRaw / appendRawBatch + auto-mkdir + meta fields (_scraped_at, _bucket). (3) **julian_merge.mjs priority**: seed > wiki_th > astrotheme > wikidata > existing — เคารพ workflow inline-JS เดิม + standalone testable. (4) **Dual-write pattern**: production-safe migration — scrapers ทำ raw write *เพิ่ม*ไม่ลบ output เดิม → workflow compat. (5) **Phase 4 critical gap**: workflow yaml ต้อง `git add data/julian_raw/` — ไม่งั้น raw buckets ไม่ persist ใน production (GHA runner ephemeral) — cross-project handoff to GUARD required. (6) **julian_empirical.mjs latent bug**: `execSync from 'fs'` invalid → file crash on module load → ยังไม่ deployed (no workflow trigger). Fix แล้วใน Phase 1 commit. |
| 2026-05-24 | data quality continuation (3 commits) | (1) **Accuracy strict rule**: `(time_utc && birthPrecNum >= 14) ? 'C' : 'D'` — precision-13 = hour approximation (round hour distribution → editor guess) ไม่ใช่ verified → ควรเป็น D. precision-14 = minute-level care สมควรเป็น C. existing 602 C records ไม่ backfill (precision ไม่เก็บ schema). (2) **Wiki TH parser patterns F-I**: ฤกษ์เกิด, ดวงเกิด (astrological context), ลืมตาดูโลก, เกิดในเวลา — pattern ที่ Thai bio articles ชอบใช้. คาดเพิ่ม match rate 9% → 15-20%. tests 13/13. (3) **Wikidata P19+P625 coord enricher**: ทดแทน Astrotheme lat/lng parser ที่ broken (sandbox 403 อ่าน live ไม่ได้ + HTML format เปราะ). SPARQL VALUES batch 50 QID → Point(lng lat) WKT parse. WKT format: longitude แรก! (มักสับสน). Validate range + drop (0,0) null island. Coverage คาด 60-80% เทียบ Astrotheme 1.24%. (4) **merge.mjs ต้องอัปเดต** เมื่อเพิ่ม raw bucket ใหม่ — `applyEnrich(m, coord, stats.coord)` ใน priority chain. ลำดับใหม่: seed > wiki_th > astrotheme > wikidata_coord > wikidata > existing. |
| 2026-05-27 | planet positions pre-compute (BIBLE request) | (1) **engine.js import ใน Node.js ทำงานได้** — `import { get_data, getStandards } from '../v3/engine.js'` ใช้ได้ตรงๆ ไม่ต้อง transform. (2) **JD epoch = 730428** (Jan 1 2000) ≠ astronomical JD 2451545 — สำคัญมากสำหรับ interop. (3) **28,174 unique JDs** จาก 66,912 records (42%) — cache by JD ประหยัด 58% computation. (4) **KE + MR ไม่มี quality mapping** ใน EXALT/KASET/MAHACHAK/RACHA → getStandards() return "" เสมอ. ถ้า BIBLE ต้องการ quality ของ 2 ดาวนี้ → ต้อง add mapping ใน engine.js ก่อน. (5) **Sign-level เพียงพอสำหรับ quality** — ทุก quality ใน TALS ขึ้นกับ sign 0-11 ไม่ต้องการ degree. (6) **Moon error ±0.5 sign** ถ้า actual birth ≠ 06:00 default — ยอมรับได้สำหรับ population stats, ไม่ยอมรับสำหรับ individual analysis. |
| 2026-05-27 | engine.js compatibility audit | **5 JULIAN workers** depend on engine.js. Critical invariants: (1) raw unit=1800 steps/sign — used as `Math.trunc(pos[i]/1800)%12` in ml_features/full_scan/skeptic; (2) planet order sp[0]=LA..sp[10]=MR — featureIdx = engineIdx-1; (3) get_data(d,m,y,hr,mn,lng) arg order; (4) getStandards(pos,i)→slash-sep string (now in standards.js, compat re-export OK). If unit or order changes → must rerun ml_features.mjs + retrain CNN. PLANET_KEYS/ZODIAC_TH used in planet_positions.mjs — order must match engine. get_j used in keygen.mjs. |
| 2026-05-27 | ML pipeline complete (features → CNN → explain → correlate) | (1) **Engine API call order**: `get_data(d, m, y, hr, mn)` — d,m,y ไม่ใช่ y,m,d (ผิดแล้ว 0 features). (2) **Engine raw unit**: `Math.trunc(rawPos[engineIdx] / 1800) % 12` = sign 0-11 (1800 steps/sign). (3) **getStandards API**: `getStandards(rawPos, engineIdx)` returns slash-sep string e.g. `'เกษตร/มหาอุจ'`. Indices: 0=LA (return ''), 1=SU..10=MR. (4) **Feature planet order**: skip LA(0) → feature[0]=SU engineIdx=1, feature[9]=MR engineIdx=10. (5) **SHAP incompatible TF>=2.5**: ใช้ `tf.GradientTape()` แทน. (6) **Windows cp1252**: `open(file, encoding='utf-8')` บังคับทุกไฟล์ Python ที่อ่าน Thai text. (7) **CNN 68.6% accuracy** (3-class, 33% baseline). (8) **MR dominant**: transit_MR conj natal_MR = death lift=2.26 (n=3198). MR ไม่มี quality mapping แต่มี event signal ชัดเจน. |
| 2026-05-28 | เพิ่ม image/genealogy/succession features | (1) **Image storage pattern**: เก็บแค่ filename ไม่ใช่ full URL — generate URL client-side: `https://commons.wikimedia.org/wiki/Special:FilePath/{filename}?width=120`. (2) **Mini record key `g`** = image filename (omit if null เพื่อลด bytes). (3) **genealogy raw vs index**: `julian_family.json` เก็บ raw (รวมทุก relation แม้ไม่อยู่ใน DB), `genealogy.json` cross-ref เฉพาะ in-DB pairs — pattern เดียวกับ succession. (4) **P1365/P1366 เป็น qualifier ไม่ใช่ direct property** — ต้อง query: `?person p:P39 ?stmt. ?stmt ps:P39 ?pos. ?stmt pq:P1365 ?prev.` ไม่ใช่ `?person wdt:P1365 ?prev`. (5) **dbQIDs Set** ต้อง compute ก่อน genealogy+succession sections ใน index_builder (share ทั้งคู่). (6) **Bug fix `_fetchJson` → `_fetchJSON`**: loadGenealogyIndex + loadImageIndex ใน julian_lookup.js เรียก method ผิด camelCase → runtime error ถ้า genealogy/images โหลดก่อน. |
| 2026-05-28 | full_scan analysis — planet pair verdicts | (1) **Internal consistency test**: วิธีตรวจ polarity ที่ดีกว่า p-value คือดูว่า "aspect เดียวกันในกลุ่มเดียวกัน ชี้ทิศเดียวกันทุก event type ไหม?" — SA×MR dist1 ชี้ award+6.7% AND death-12.3% = ทิศตรงข้ามกัน = noise ไม่ใช่ signal. (2) **SU×MR dist5 reverse polarity**: dist5 (hard aspect) ใน SU×MR ทำตัวเหมือน soft (award+, death-) ≠ SU×SA ที่ dist5 → death+, award- คนละทิศ = inconsistent polarity = reject. (3) **SA×SA age proxy ระดับอ่อน**: SA period=29.5yr → dist1 natal_SA เกิดที่อายุ ~87-88yr (3rd return) = high mortality cohort — อาจเป็น partial age proxy แต่ dist5 ชี้ตรงข้าม (death-) ซึ่งไม่ fit age proxy → borderline monitor ไม่ใช่ debunk ชัดเจน. (4) **SU×JU benefic hypothesis**: อาจ natal JU (benefic) มี polarity กลับกับ natal SA (malefic) สำหรับ hard aspects แต่ squa/dist5 disagree internally — hypothesis น่าสนใจแต่ไม่พอยืนยัน. (5) **Verdict summary**: SU×SA=16 valid, MR×MR=19 debunked(age proxy), SA×MR=5+SU×MR=4 rejected(inconsistent polarity), SA×SA=2+SU×JU=2 monitor, SU×MA=1+SU×MO=1 insufficient. ดูเต็มใน `ml/models/julian_valid_rules.json`. |
| 2026-05-28 | FB content pipeline — standing workflow | **JULIAN เป็นนักวิจัย + นักเขียน content ด้วย** (ไม่ใช่แค่ data engine). ทุก session ต้องตรวจ `content/julian_proposals.json` หา `status="approved"` ก่อนงานอื่นเสมอ. Pipeline: (1) `content/julian_proposals.json` status=approved → (2) ดึง valid rules จาก `ml/models/julian_valid_rules.json` → (3) เขียน caption ภาษาไทยพร้อม lift+n+p-value จริง → (4) บันทึก `content/inbox/<ts>_julian_<pair>.json` (format: id/title/body/type/source_proposal/created_at/status=pending_review) → (5) อัปเดต proposal status="done". ถ้าไม่มี approved → รัน `node workers/julian_proposal_gen.mjs` เพิ่ม pending ใหม่ แล้วแจ้งปีเตอร์อนุมัติที่ `https://horatad.com/tools/admin/julian_approval.html`. Tool: Content tab = อนุมัติ proposals, Vocabulary tab = รีวิว English→Thai. FB Post Helper: `https://horatad.com/tools/fb_post_helper.html`. Root cause ของ session ไม่รู้จัก workflow นี้ = ไม่ได้เขียนลง handoff/memory ไว้ก่อน → แก้แล้ว (v5 handoff + memory entry นี้). |
| 2026-05-28 | vocab standard — 4-field schema (สำคัญมาก อ่านก่อนเขียน FB ทุกครั้ง) | **vocab_standard.json = แหล่งความจำถาวรสำหรับคำศัพท์ใน FB post** — ห้าม hardcode Thai planet/aspect names ในโค้ดหรือ caption. Schema มี 4 fields แยกตามบริบท: (1) `research_abbrev` = ตัวย่อในตาราง/โค้ด (SU/MO/MA/ME/JU/SA/KE/MR/RA) (2) `research_label` = คำไทยสำหรับ FB post (ดาวอาทิตย์/ดาวจันทร์ ฯลฯ) (3) `tals_terms[]` = คำ TALS/ตำรา (อาทิตย์/จันทร์ ฯลฯ — ไม่มี prefix "ดาว") (4) `llm_aliases[]` = คำที่ LLM/text โหราศาสตร์อื่นใช้ → ใช้สำหรับ normalize input. ใน code: `buildFBCaption()` ใน `workers/julian_proposal_gen.mjs` ดึง vocab อัตโนมัติผ่าน `vocabLabel(abbrev)` + `vocabTals(abbrev)`. **CRITICAL: aspect naming conflict TALS vs Western** — "ตรีโกณ" ใน TALS = 60° (Sextile ใน Western), "โยค" ใน TALS = 120° (Trine ใน Western) — สลับกัน! valid_rules.json ใช้ code "trin/sext/dist5/dist1" — mapping ที่ถูก: trin→โยค(YOK), sext→ตรีโกณ(TRI), dist5→โยค(YOK), dist1→ตรีโกณ(TRI), conj→กุม(KUM), oppo→เล็ง(LENG). Square(90°) **ไม่มีใน TALS** (TALS มีแค่ 4 มุม: KUM/LENG/YOK/TRI). Vocab UI: `https://horatad.com/tools/admin/julian_approval.html` แท็บ Vocabulary. |
| 2026-05-29 | proposal_gen — polarity grouping + schema gotcha + content ethics | (1) **valid_rules field = `class_n` ไม่ใช่ `n`** — `buildFromValidRule` เดิมอ่าน `rule.n` → undefined → ทุก proposal โชว์ n=0. แก้เป็น `rule.class_n`. (2) **Group by polarity ไม่ใช่ pair|event**: SU×SA event เดียวกัน (เช่น death) มีทั้งทิศ ↑ (hard_death: lift>1) และ ↓ (soft_award: lift<1 = "less death"). ถ้า dedup ด้วย pair\|event จะเก็บแค่ rule แรก ทิ้งอีกขั้ว → caption ผิด. ทางแก้: group ด้วย field `polarity` → 16 กฎ SU×SA = 2 content units สะอาด (hard_death 7 กฎ, soft_award 9 กฎ). ดู `buildFromPolarityGroup`. (3) **event_type ใน valid_rules** = `death` / `award_received` / `position_start` (ไม่ใช่ `award`) — EVENT_THAI ต้อง map ครบ. (4) **Content ethics — caption ความตาย**: lift 1.18 = +18% เชิงสัมพัทธ์บนฐานเล็ก ≠ "จะตาย". โพสต์ด้านเสี่ยงเดี่ยวๆ = cost ผู้ใช้สูง (fatalism/panic) + cost dev สูง (moderate/disclaimer/policy). Best practice = รวมขั้ว hard+soft ใน 1 โพสต์ (กลไกสมมาตร, ปลอดภัย, น่าสนใจกว่า) + disclaimer "สถิติประชากร ≠ ชะตาบุคคล". (5) **public-facing FB = ต้อง credit ผู้ก่อตั้ง TALS** (ยืนยง นาวาสมุทร / แดง เมืองตราด) ใน caption ตามกฎ CLAUDE.md. |
| 2026-05-29 | uncompromised research standard — proposal vetting (ปีเตอร์ standing rule) | **มาตรฐาน research ไม่ขึ้นกับแหล่งที่มาของ proposal** — ปีเตอร์ยืนยัน: "even such proposal come from me... we need rigorous uncompromised standard research". กฎ: proposal ทุกตัว ไม่ว่ามาจาก auto-gen / ปีเตอร์ / user อื่น ต้องผ่านเกณฑ์เดียวกันก่อนกลายเป็น content: (1) มี evidence จริงจาก full_scan หรือ valid_rules (ไม่ใช่ stub "ยังไม่มีข้อมูล"), (2) ผ่าน FDR (p_adj < threshold), (3) polarity consistent ทุก event type (ผ่าน internal consistency test — ดู entry 2026-05-28 verdict). proposal ที่ fail = invalid → **ลบได้ทันที ไม่มี exception เพราะใครเป็นคนเสนอ**. JULIAN มี authority ลบ invalid proposal เอง (ปีเตอร์ delegate 2026-05-29). ครั้งนี้ลบ 10 skipped stub (SU×JU/SU×KE/SA×JU/SA×KE/JU×SA/JU×MR/MO×SA/MO×MR/RA×MR + SU×SA stub เก่า) ที่มีแค่ hint ไม่มี data. เหลือเฉพาะ valid_rules-backed proposals. |
| 2026-05-29 | genealogy = research asset #1 (ปีเตอร์ standing rule) + stats instrumentation | **กฎรายงาน:** genealogy/succession progress ต้องรายงาน **ก่อน** record count เสมอ — เป็น research asset อันดับ 1 (relational astrology: เครือญาติ/ราชวงศ์/ผู้สืบทอด แชร์ pattern ดาวไหม) สำคัญกว่าปริมาณข้อมูลดิบ. **Metric ที่ใช้วิจัยได้จริง = `in_db_links`** (ความเชื่อมโยงที่ทั้งสองฝั่งอยู่ใน DB) ไม่ใช่ raw_persons — เพราะ relational study ต้องมีดวงทั้งคู่. โครงสร้าง: `julian_family.json`={QID:{p,m,sp[],ch[],si[]}} (พ่อ/แม่/คู่/ลูก/พี่น้อง = P22/P25/P26/P40/P3373), `julian_succession.json`={QID:{prev:[{q,pos}],next:[{q,pos}]}} (P1365/P1366). dbQIDs resolve: `r.qid || (r.source startsWith 'wikidata:' ? slice(9) : null)`. เพิ่ม statFamily()+statSuccession() ใน julian_stats.mjs → output fields `genealogy`+`succession` (วางบนสุดก่อน total). **🔴 FINDING: Job 2 (backfill) อาจไม่รันจริง** — checkpoint ที่ควรอยู่บน main หายหมด (julian_genealogy/succession/p3447_checkpoint.json ไม่มี — มีแค่ events+mb). Job 2 มี `if: needs.sync.result == 'success'` → ถ้า Job 1 timeout 55 นาที จะ skip เงียบๆ ทุกรอบ → อธิบายพร้อมกัน: accuracy C โตช้า + genealogy/succession ไม่มี data + P3447 ไม่ backfill. แนะนำ: แยก Job 2 เป็น workflow อิสระ / `if: always()`. stats จะโชว์ `status:'missing'` ดังๆ เมื่อ data file ไม่มา = instrumentation ที่ surface job เสียทันที. |
