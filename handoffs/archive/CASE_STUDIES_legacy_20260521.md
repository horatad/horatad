# CASE STUDIES — Horatad Ecosystem
# Format: CS<NNN> — <title> | <PROJECT> | <YYYYMMDD>
# PROJECT: HORATAD / BIBLE / JULIAN
# กฎ: Plan → Do → Check → Act ("Write what you will do, do what you write")

---

## CS004 — Wire M8 Keyword Engine → v3tab.js | HORATAD+BIBLE | 2026-05-21

### PLAN
`compose_local_prediction()` สร้างแล้วใน interpretation.js แต่ v3tab.js ยังเรียก `render_fallback()` (raw text) อยู่

### DO
- import `compose_local_prediction` จาก interpretation.js, ลบ `render_fallback` import
- สร้าง `_renderComposed()` — format predictions array → ✅/⚠️/📋 grouped text
- v3Local(): render ด้วย compose แทน fallback
- v3Typhoon() fallback: ใช้ compose แทน fallback, badge → "⚠️ Typhoon ไม่ตอบ — ใช้ keyword engine"
- V3.3.1

### CHECK
- display เปลี่ยนจาก raw chapter-grouped text → polarity-grouped (✅ ด้านดี / ⚠️ ด้านระวัง / 📋 ลักษณะทั่วไป)
- render_fallback ถูกลบออกจาก v3tab.js ทั้งหมด

### ACT
- 🔲 ทดสอบบนมือถือจริง — ตรวจ formatting แสดงถูกต้อง

---

## CS005 — Rule Taxonomy Schema | BIBLE | 2026-05-21

### PLAN
KB มี 342 major rules แต่ไม่มี field ระบุ source หรือ confidence tier
เมื่อ minor/empirical/case_study rules เพิ่มมาในอนาคต — จะแยกไม่ออก

### DO
- เพิ่ม `rule_source: "major"` และ `weight: 1.0` ให้ 342 rules ทั้งหมดด้วย Python script
- อัปเดต `_empirical_schema` doc: `effective_weight = weight × (empirical_p ?? 1.0)`
- kb.json V2.3.0

### CHECK
- ทุก rule มี 2 fields ใหม่ — verified
- backward compatible ทั้งหมด (match_rules ไม่กระทบ)
- taxonomy: major (KB) | minor (manual) | empirical (JULIAN) | case_study (user confirmed)

### ACT
- minor rule → `rule_source: "minor", weight: 0.8`
- empirical rule (จาก JULIAN) → `rule_source: "empirical", weight: จาก empirical_p`
- ✅ ไม่ต้องแตะ schema อีกจนกว่าจะมี rule type ใหม่จริงๆ

---

## CS006 — Backlog Pruning Decision | HORATAD+BIBLE | 2026-05-21

### PLAN
ตรวจ backlog ทุก item ว่า assumption ยังจริงไหม

### DO
วิเคราะห์ 3 items:
- M3 retry (Typhoon JSON fail → retry) — เขียนตอน fallback ยังแย่
- Keyword expansion (synonym map) — เขียนตอนยังไม่รู้ว่าต้องการ
- Multi-LLM cross-validation — เขียนก่อนรัน benchmark จริง

### CHECK
- M3 retry: **obsolete** — M8 fallback ดีแล้ว ไม่ต้องการ Typhoon JSON อีก
- Keyword expansion: **premature** — ยังไม่รู้ว่าต้องการจนกว่าจะรัน LLM กับ keywords จริง
- Multi-LLM: **premature** — รอ Groq score ก่อน

### ACT
- ✂️ ตัด M3 retry ออกจาก backlog
- ⏸ defer keyword expansion และ multi-LLM cross-validation
- 📌 บันทึก rule ใน CLAUDE.md: "ก่อนทำ task ตรวจ assumption ก่อน แจ้ง user ถ้าควรตัด"

---

## CS007 — JULIAN Storage Architecture: เมื่อไหร่ใช้ CF / GitHub / IndexedDB | JULIAN | 2026-05-21

### PLAN
HORATAD ต้องการดึงข้อมูล JULIAN (master_key + internet) มาใช้ในโปรแกรมผูกดวง
ตั้งต้นด้วย assumption ว่า "ฐานข้อมูล + web app = ต้องมี API"
→ แผนแรก: deploy CF Worker expose D1 endpoint → HORATAD เรียก API

### DO
**ขั้นที่ 1 — แผนแรก (CF Worker)**
- ออกแบบ julian_worker.js: GET /julian?jd=XXX → query D1 → return JSON
- wrangler.toml ผูก Worker กับ D1 database julian
- บอก user ให้ deploy Worker ก่อน

**ขั้นที่ 2 — user ตั้งคำถาม**
- "ทำไมต้อง deploy worker ก่อน github จะไม่มีข้อมูลนี้อยู่"
- วิเคราะห์ใหม่: workflow ปัจจุบัน commit เฉพาะ progress.json + report.json
  ถ้าเพิ่ม export step → ได้ JSON ใน repo → HORATAD fetch ได้เลย

**ขั้นที่ 3 — วิเคราะห์ขนาดข้อมูล**
- master_key (1700–2100): ~146,100 rows × 100 bytes = ~14.6 MB
- internet (50K records): ~50,000 rows × 200 bytes = ~10 MB
- รวม: ~25 MB — browser รับได้สบาย

**ขั้นที่ 4 — user ถาม GitHub limits**
- ค้นพบปัญหา git history: commit ไฟล์ 10 MB ทุก 6 ชั่วโมง
  = 40 MB/วัน = 1.2 GB/เดือน = 14 GB/ปี
- GitHub Releases: overwrite asset เดิมด้วย `--clobber` ไม่สะสม history
  URL คงที่: `releases/latest/download/filename`

**ขั้นที่ 5 — user ถาม user data ในอนาคต**
- user data (private) ต้องการ auth + row isolation → GitHub ให้ไม่ได้
- CF D1 + Worker ถูกต้องสำหรับ user data แต่ต้องแยก database จาก JULIAN

### CHECK

**Root cause ที่แนะนำ CF Worker ตอนแรก:**
Pattern matching โดยไม่ถาม requirements ให้ครบก่อน
- เห็น "database + web app" → นึกถึง "API" ทันที (default web pattern)
- ไม่รู้ว่า app เป็น offline-first PWA
- ไม่รู้ว่า data เป็น public และดึงทั้งก้อน ไม่ใช่ query ทีละตัว

**หลักการแยก storage ที่ถูกต้อง:**

| Pattern | เมื่อไหร่ใช้ |
|---|---|
| GitHub Releases / S3 static | data สาธารณะ, batch update, ดึงทั้งก้อน |
| CF D1 + Worker | data private/user-specific, real-time query, write from client |
| IndexedDB (browser) | offline-first, query เร็ว < 1ms, ไม่มี network |

**อุตสาหกรรมทำแบบเดียวกัน:**
- npm: registry DB → generate package JSON → CDN (static read)
- Wikipedia: DB → monthly dump → flat files → offline use
- Airbnb/Uber internal: ETL → S3 JSON/Parquet → analyze locally

**สาเหตุ IndexedDB ชนะ CF D1 สำหรับ read:**
- HORATAD ผูกดวงต้องเรียก JD หลายสิบตัวพร้อมกัน
- CF D1: network round-trip 100–300ms × หลายครั้ง = รอนาน
- IndexedDB: < 1ms ทุก query ไม่มี network, offline ได้
- internet ล่ม → CF D1 พัง, IndexedDB ยังทำงาน

### ACT — Architecture สุดท้าย

```
CF D1    → write path เท่านั้น (scraping pipeline, upsert, dedup)
GitHub Releases → read path (export JSON, URL คงที่, ไม่โต history)
IndexedDB → per-device cache (offline-first, < 1ms query)
CF Worker (อนาคต) → user private data เท่านั้น (แยก DB จาก JULIAN)
```

**กฎที่ได้จาก case นี้:**
1. ถามก่อนว่า read pattern คืออะไร (ทีละตัว vs ทั้งก้อน) ก่อนออกแบบ API
2. Data สาธารณะ + batch update → static file ง่ายกว่า API เสมอ
3. Offline-first app → IndexedDB เป็น default cache layer
4. Git ไม่เหมาะเก็บไฟล์ที่ overwrite บ่อย → ใช้ Releases หรือ object storage
5. CF D1 เหมาะกับ write + private data, ไม่จำเป็นสำหรับ public read

**สิ่งที่ยังต้องทำ:**
- 🔲 เพิ่ม export step ใน julian_sync.yml → upload GitHub Release
- 🔲 HORATAD: ปุ่มดาวน์โหลด/ลบ ใน prediction page (session HORATAD)
- 🔲 อนาคต: CF Worker + D1 แยก DB สำหรับ user data เมื่อ app popular

---

## CS008 — JULIAN Dedup: Survivorship Rules + Multi-layer Architecture | JULIAN | 2026-05-21

### PLAN
JULIAN ดึงข้อมูลจากหลาย source (Wikidata categories, era queries, อนาคต: astrotheme)
บุคคลคนเดียวอาจปรากฏใน query หลายชุด หรือชื่อแตกต่างกัน (ไทย/อังกฤษ/ชื่อเล่น)
ต้องการ: เก็บ record ที่ละเอียดที่สุด ไม่เก็บซ้ำ ถ้าซ้ำให้ enrich แทน overwrite

### DO

**Layer 1 — Application level (seen_qids)**
```javascript
const seenSet = new Set(progress.seen_qids)
if (seenSet.has(qid)) { skipSeen++; continue; }
```
ป้องกัน Wikidata QID เดียวกันถูกดึงซ้ำข้าม query และข้าม run

**Layer 2 — DB level unique index (jd + name)**
```sql
CREATE UNIQUE INDEX idx_internet_jd_name ON internet(jd, name);
```
ป้องกันชื่อเดียว + วันเกิดเดียวกันจากต่าง source

**Layer 3 — DB level Wikidata source dedup**
```sql
CREATE UNIQUE INDEX idx_internet_source_wikidata
  ON internet(source) WHERE source LIKE 'wikidata:%';
```
ป้องกัน QID เดียวกันแต่ชื่อต่างกัน (เช่น "ทักษิณ" vs "Thaksin")

**Layer 4 — COALESCE Survivorship ON CONFLICT**
เดิม: ON CONFLICT เพิ่ม validated_count + MAX confidence เท่านั้น
ใหม่: COALESCE เติม NULL fields จาก record ใหม่

```sql
ON CONFLICT(jd,name) DO UPDATE SET
  time_utc    = COALESCE(internet.time_utc,    excluded.time_utc),
  lagna_sign  = COALESCE(internet.lagna_sign,  excluded.lagna_sign),
  lat         = COALESCE(internet.lat,          excluded.lat),
  lng         = COALESCE(internet.lng,          excluded.lng),
  relate_id   = COALESCE(internet.relate_id,   excluded.relate_id),
  notes       = COALESCE(internet.notes,        excluded.notes),
  country     = COALESCE(internet.country,      excluded.country),
  tier        = COALESCE(internet.tier,         excluded.tier),
  confidence  = MAX(internet.confidence, excluded.confidence),
  validated_count = internet.validated_count + 1,
  source      = CASE
    WHEN internet.source LIKE '%' || excluded.source || '%' THEN internet.source
    ELSE internet.source || '|' || excluded.source END
```

### CHECK

**Best practice ที่ industry ใช้ (MDM — Master Data Management):**
3 layer มาตรฐาน:
1. Exact key match: external ID (QID, ISNI, VIAF) — แน่นอนที่สุด
2. Deterministic match: rule-based fingerprint (jd + name)
3. Probabilistic match: fuzzy (Jaro-Winkler) — เราไม่ได้ทำ ไม่คุ้มตอนนี้

**Survivorship rules** = กฎว่าเมื่อ merge แล้วเก็บค่าไหน:
- COALESCE: ถ้าเก่ามีแล้วคงไว้ ถ้าเก่าว่างให้ใหม่เติม
- MAX confidence: เก็บค่าสูงสุดจากทุก source
- Source append: audit trail ว่าข้อมูลมาจากไหนบ้าง

**confidence scoring:**
- `time_utc` มี → confidence 0.95 (เวลาเกิดชัดเจน = แม่นกว่า)
- `time_utc` ไม่มี → confidence 0.85
- ถ้าอนาคตได้ `lat/lng` จาก astrotheme → confidence สูงขึ้นอีก (COALESCE รองรับแล้ว)

### ACT

**กฎที่ได้:**
1. dedup ต้องทำหลาย layer เพราะ data จาก real world ไม่สะอาด — แต่ละ layer จับ case ต่างกัน
2. COALESCE "fill-in" ดีกว่า overwrite — ข้อมูลที่มีอยู่แล้วมีค่า ไม่ควรทิ้ง
3. source field ควรเป็น audit trail (`wikidata:Q123|astrotheme:456`) ไม่ใช่แค่ค่าเดียว
4. validated_count = proxy confidence — ยิ่งหลาย source เห็นตรงกัน ยิ่งน่าเชื่อถือ

**สิ่งที่ยังต้องทำ:**
- 🔲 รัน migration: `CREATE UNIQUE INDEX idx_internet_source_wikidata` บน D1 ที่มีอยู่
- 🔲 อนาคต: เพิ่ม source astrotheme → COALESCE จะ enrich time_utc + lat/lng อัตโนมัติ

---

## CS009 — JULIAN Scraper Scale-up: Era Granularity + Cron Frequency | JULIAN | 2026-05-21

### PLAN
หลัง Run #12-13 ได้ 436 records จาก th_politicians query เดียว
Target 50,000 records — ต้องประเมินว่า query design ปัจจุบันจะถึงเป้าไหม
และ cron วันละครั้งพอไหม

### DO

**วิเคราะห์ bottleneck:**
- 35 queries (15 category + 20 era 20-yr chunks)
- แต่ละ era query: LIMIT 500 → สูงสุด 500 records/chunk
- 20 era queries × 500 = 10,000 records max จาก era series
- รวมทั้งหมด: ~14,000–16,000 records — ไม่ถึง 50,000

**วิเคราะห์ query exhaustion:**
```javascript
const queryExhausted = bindings.length < CONFIG.MAX_PER_RUN || records.length === 0;
```
- Query ถูก mark done เมื่อ Wikidata คืน < 500 results
- ปัญหา: era ยุค 1940-1980 มีคนมากกว่า 500 → ได้ 500 → ไม่ mark done
  → run ถัดไปได้ชุดเดิม → ทุกคน seen → mark done → miss records ที่เหลือ

**การแก้:**
1. Era: 20-yr → 5-yr chunks = 80 queries × 500 = ~40,000 records จาก era series
2. Cron: วันละ 1 (02:00) → ทุก 6 ชั่วโมง (4×/วัน)

**ผล:**
- QUERY_SERIES: 15 + 80 = 95 queries รวม
- Estimated records: ~46,000–50,000 (ใกล้เป้า)
- ระยะเวลาเก็บครบ: ~5–7 วัน

### CHECK

**Query exhaustion pattern ที่ต้องระวัง:**
```
era query LIMIT 500, Wikidata มี >500 คนในช่วงนั้น
→ ได้ 500 → not exhausted (500 >= 500)
→ run ถัดไป: Wikidata คืน 500 คนเดิม (ไม่มี pagination)
→ ทุกคนอยู่ใน seen_qids → 0 new records → exhausted
→ miss คนที่เหลือใน era นั้นทั้งหมด
```

ช่วยได้บางส่วนด้วย 5-yr chunks — แต่ era ที่มีคนมาก (1960-2000) ยังติด ceiling 500

**เพดานจริงของ Wikidata:**
- ข้อมูลที่มี day-precision (birthPrec >= 11) + sitelinks >= 5
- ประมาณ 200K-500K คนทั่วโลก AD 1700-2100
- แต่ LIMIT 500 per query ดึงได้แค่ส่วนน้อย
- ไม่มี OFFSET ที่ reliable ใน Wikidata SPARQL สำหรับ large result set

**ทำไม cron ทุก 6 ชั่วโมงจึงมีประโยชน์:**
- แต่ละ run loop ทุก pending queries ใน ~3-5 นาที
- 95 queries ใน 1 run แรก → หลาย query mark done ใน run เดียว
- run ถัดไป: pending queries ลดลง → เร็วขึ้น
- ถ้า run หนึ่ง timeout (55 นาที): queries ที่เสร็จแล้ว save ใน progress.json ไม่หาย
- 4×/วัน ทำให้ครบใน 5-7 วันแทน 5-7 สัปดาห์

### ACT

**กฎที่ได้:**
1. LIMIT N ใน SPARQL ไม่เท่ากับ "มีแค่ N records" — ต้องออกแบบ chunk ให้เล็กกว่า result set จริง
2. วิเคราะห์ bottleneck ก่อน set target — target 50,000 ต้องรู้ว่า data source มีเท่าไหร่
3. Progress save ทุก query = resilient ต่อ timeout — design นี้ถูกต้องแล้ว
4. Cron frequency ต้องเหมาะกับจำนวน queries ที่ต้อง process — ไม่ใช่แค่ "ยิ่งบ่อยยิ่งดี"

**สิ่งที่ยังต้องทำ:**
- 🔲 อนาคต: ถ้าต้องการ >50K records ต้องหา source อื่น (astrotheme, other databases)
  หรือทำ pagination จริง (SPARQL OFFSET แต่ช้า/unreliable สำหรับ large sets)
- 🔲 Reset `done_queries: []` ใน julian_progress.json ถ้าต้องการ re-scrape
  ด้วย era 5-yr chunks ใหม่ (query IDs เปลี่ยนแล้ว ไม่ conflict)

---

## CS001 — Multi-LLM Benchmark | BIBLE | 2026-05-21

### PLAN
สร้าง benchmark tool เพื่อ:
1. วัดความแม่นยำ (hallucination rate) ของ Gemini, Groq, iApp กับ Thai astrology KB
2. วัด latency decomposition: systematic / prefill / decode แยกจากกัน
3. เลือก LLM ที่ดีที่สุดสำหรับ wording layer

### DO
- สร้าง `m0_hallucination_test.html`: 31 ข้อจาก kb.json ground truth, parallel fetch 3 LLMs
- แก้ Gemini 429 (rate limit): delay default 5000ms + countdown
- แก้ iApp CORS: เปลี่ยนเป็น Typhoon CF Worker (มี CORS headers แล้ว)
- สร้าง `m0_latency_ping.html`: Mode B (max_tokens=1 = prefill-only) + Mode C (streaming SSE)
- เพิ่ม `testGeminiKey()`: แยก key valid vs quota exhausted
- localStorage key persistence (ไม่ commit secret ลง repo)

### CHECK
**ค้นพบสำคัญ:** LLMs ได้คะแนน 0% บนศัพท์โหราศาสตร์ไทยโบราณ (เสริด/พักร/มนท์)
- ศัพท์เฉพาะเหล่านี้ไม่มีใน training data → LLM ไม่รู้จัก → hallucinate ทั้งหมด
- **ข้อสรุป:** LLM ไม่สามารถเป็น knowledge source ได้ — ต้องเป็น wording layer เท่านั้น
- KB-first architecture ถูกต้อง: engine + KB → matched rules → LLM craft wording เท่านั้น

ปัญหาที่แก้ไม่ได้ใน session:
- Gemini quota (1,500 RPD ฟรี) หมดเร็ว — ต้องวางแผนการใช้
- Typhoon CF ไม่รองรับ streaming → decode metric ไม่ได้

### ACT
1. ✅ ยืนยัน KB-first architecture — ไม่เปลี่ยนทิศทาง
2. ✅ เพิ่ม M8 keyword composition engine (deterministic, no LLM) เป็น priority สูง
3. ✅ เพิ่ม M7 empirical validation pipeline (Julian Day → empirical_p)
4. 🔲 รอ user รัน benchmark และเลือก LLM จาก Groq score (Gemini quota หมด)

---

## CS002 — Keyword Composition Engine + Empirical Schema | BIBLE + JULIAN | 2026-05-21

### PLAN
จาก lesson learned ของ CS001:
1. `compose_local_prediction()` — deterministic prediction จาก KB keywords, ไม่ต้องเรียก LLM
2. empirical schema (`empirical_p`, `empirical_n`, `empirical_refs`, `secondary_obs`) ใน kb.json
3. `scripts/gen_rule_skeletons.mjs` — ระบุ missing planet×quality combinations

### DO
- เพิ่ม `compose_local_prediction()` + `compose_summary_text()` ใน `v3/interpretation.js`
  - extract keywords จาก `rule.p` (split Thai phrases)
  - classify polarity จาก `t[]` tags + `conditions[]`
  - compose summary text: positive traits + connector + negative traits
- เพิ่ม `_empirical_schema` field ใน kb.json root (V2.2.0)
- เพิ่ม `empirical_p/n/refs/secondary_obs` ใน 2 sample TRUE_RULEs (null placeholder)
- สร้าง `scripts/gen_rule_skeletons.mjs` → `v3/kb_skeletons.json`
- Version bump V3.2.9 → V3.3.0

### CHECK
- `compose_local_prediction()` ทำงานได้ — structured array พร้อม rule_id, text, keywords, polarity
- `gen_rule_skeletons.mjs` พบ 90 missing combinations (ศุกร์ขาด 6, อาทิตย์/อังคาร/มฤตยู ขาด 10)
- empirical schema อยู่ใน kb.json — รอ data มาเติม

ข้อสังเกต:
- `compose_local_prediction()` ยังไม่ได้ wire เข้า v3tab.js
- 90 skeletons = โอกาสเพิ่ม KB coverage อีก 26% ถ้า expert กรอก text
- polarity classification ง่ายไป — บางกฎ neutral แต่ไม่มี tag → classify เป็น ~

### ACT
1. 🔲 Wire `compose_local_prediction()` → v3tab.js เป็น enhanced fallback
2. 🔲 User รัน benchmark ใน `m0_hallucination_test.html` ดู Groq score
3. 🔲 Expert review `v3/kb_skeletons.json` — กรอก p field priority rules ก่อน
4. 🔲 Build Wikipedia scraper สำหรับ Julian Day DB (Phase 2 of M7)

---

## CS003 — Project Structure Reorganization | HORATAD | 2026-05-21

### PLAN
Session handoff ปะปนกันหลายโครงการ — user แยกไม่ออกว่าแต่ละโครงการถึงไหน

### DO
- ตั้งชื่อโครงการ: **HORATAD** / **BIBLE** / **JULIAN**
- สร้าง `PROJECT_STATUS.md` — master dashboard 1 หน้า, อัปเดตทุก session
- สร้าง `handoffs/` directory — pattern: `handoffs/<PROJECT>_<YYYYMMDD>_v<n>.md`
- สร้าง `CASE_STUDIES.md` — แยก case studies ออกจาก manual
- อัปเดต `CLAUDE.md` — เพิ่ม project structure section

### CHECK
- Claude อ่าน PROJECT_STATUS.md ก่อนทำงาน → รู้ context ทันที ไม่ต้องไล่ handoff
- handoffs/ แยก per-project → ไม่ปะปน
- CASE_STUDIES.md scale ได้ถึง ~20 cases ก่อนจะต้องทำ directory

### ACT
- 🔲 ทุก session ถัดไป: สร้าง handoff ใน `handoffs/<PROJECT>_<date>.md`
- 🔲 อัปเดต `PROJECT_STATUS.md` ทุก session close
- 🔲 เพิ่ม case study ใน `CASE_STUDIES.md` เมื่อมี experiment ใหม่
