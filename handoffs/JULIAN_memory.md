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

## 9. LOG — session learnings (append-only)

<!-- append ลง table นี้ทุกครั้งที่ session update ไฟล์นี้ — ห้ามแก้ entry เก่า -->
<!-- ถ้าข้อมูลเดิมผิด → เพิ่ม "⚠️ แก้ไข (date): ..." ต่อท้าย row เดิม ไม่ลบ -->

| วันที่ | trigger | สิ่งที่เรียนรู้ |
|---|---|---|
| 2026-05-23 | สร้างไฟล์ | schema + accuracy A-F, dedup 4 layers, Wikidata SPARQL pattern (QID/precision gotchas), Astrotheme match 1.24% + lat/lng bug, Wikipedia TH parser 7 patterns + 0 records issue, workflow cron arch, 137 query series, WHY LOG |
| 2026-05-24 | schema drift + architecture | (1) **Schema correction**: record ใช้ `source: "string"` ไม่ใช่ `sources: []` array — §2 ผิด ⚠️ แก้ไข: ดู doc ใหม่ใน Phase 1 README. (2) **Time_utc distribution analysis**: 1,404 records มี time_utc แต่ 98% มาจาก Wikidata precision≥13 = round hour approximation ไม่ใช่ official birth time. Top distribution 7-11 AM + 16/18/20 — กระจุกผิดปกติ → editor กรอก rough hour. (3) **"07:16" placeholder 10 records** = fictional characters (Ellen Ripley, SHODAN, Moo Deng) — scraper ไม่ควรเข้า dataset แต่ Wikidata มี birthdate field. (4) **Sandbox network**: astrotheme.com + query.wikidata.org + www.wikidata.org + *.wikipedia.org **403 host_not_allowed** — ทดสอบ scraping live จาก sandbox ไม่ได้ใดๆ. (5) **Accuracy overgrade bug**: scraper.mjs:162 ใช้ `time_utc ? 'C' : 'D'` → records 602 C grade ทั้งหมดจริงๆควรเป็น D (เพราะ precision-13 = hour ไม่ใช่ verified). Fix รอ session ถัดไป. |
| 2026-05-24 | raw bucket architecture (Phase 1-2) | (1) **Multi-tank design**: scrapers แยก write raw bucket ของตัวเอง (data/julian_raw/<source>.jsonl) → preserve provenance, enable re-process ฟรี, conflict detection. (2) **Helper module**: workers/julian_raw_writer.mjs — appendRaw / appendRawBatch + auto-mkdir + meta fields (_scraped_at, _bucket). (3) **julian_merge.mjs priority**: seed > wiki_th > astrotheme > wikidata > existing — เคารพ workflow inline-JS เดิม + standalone testable. (4) **Dual-write pattern**: production-safe migration — scrapers ทำ raw write *เพิ่ม*ไม่ลบ output เดิม → workflow compat. (5) **Phase 4 critical gap**: workflow yaml ต้อง `git add data/julian_raw/` — ไม่งั้น raw buckets ไม่ persist ใน production (GHA runner ephemeral) — cross-project handoff to GUARD required. (6) **julian_empirical.mjs latent bug**: `execSync from 'fs'` invalid → file crash on module load → ยังไม่ deployed (no workflow trigger). Fix แล้วใน Phase 1 commit. |
| 2026-05-24 | data quality continuation (3 commits) | (1) **Accuracy strict rule**: `(time_utc && birthPrecNum >= 14) ? 'C' : 'D'` — precision-13 = hour approximation (round hour distribution → editor guess) ไม่ใช่ verified → ควรเป็น D. precision-14 = minute-level care สมควรเป็น C. existing 602 C records ไม่ backfill (precision ไม่เก็บ schema). (2) **Wiki TH parser patterns F-I**: ฤกษ์เกิด, ดวงเกิด (astrological context), ลืมตาดูโลก, เกิดในเวลา — pattern ที่ Thai bio articles ชอบใช้. คาดเพิ่ม match rate 9% → 15-20%. tests 13/13. (3) **Wikidata P19+P625 coord enricher**: ทดแทน Astrotheme lat/lng parser ที่ broken (sandbox 403 อ่าน live ไม่ได้ + HTML format เปราะ). SPARQL VALUES batch 50 QID → Point(lng lat) WKT parse. WKT format: longitude แรก! (มักสับสน). Validate range + drop (0,0) null island. Coverage คาด 60-80% เทียบ Astrotheme 1.24%. (4) **merge.mjs ต้องอัปเดต** เมื่อเพิ่ม raw bucket ใหม่ — `applyEnrich(m, coord, stats.coord)` ใน priority chain. ลำดับใหม่: seed > wiki_th > astrotheme > wikidata_coord > wikidata > existing. |
