# JULIAN Raw Source Buckets

ถังเก็บข้อมูลดิบ **แยกตาม source** (append-only) — ก่อน merge เข้า `data/julian_all.json`

## โครงสร้าง

| ไฟล์ | Source | Writer |
|---|---|---|
| `wikidata.jsonl` | Wikidata SPARQL (base — birthdate + identity) | `workers/julian_scraper.mjs` |
| `wikidata_coord.jsonl` | Wikidata P19+P625 (lat/lng enrichment) | `workers/julian_wikidata_coord.mjs` |
| `astrotheme.jsonl` | astrotheme.com (time + coord enrichment) | `workers/julian_astrotheme.mjs` |
| `wikipedia_th.jsonl` | th.wikipedia.org (Thai birth time + province) | `workers/julian_wiki_th.mjs` |
| `../julian_thai_seed.json` | Manual (UI) — accuracy A/B/C | `tools/julian_seed_input.html` |

> Manual seed bucket = `data/julian_thai_seed.json` ของเดิม — ไม่ duplicate ที่นี่

## กฎ

- **Append-only** — ห้ามแก้ entry เก่า แค่เพิ่มต่อท้าย
- **Source-pure** — แต่ละ bucket เก็บ record จาก source เดียวเท่านั้น
- **Meta fields** ที่ writer เติมอัตโนมัติ (อยู่ด้านหน้าของ object):
  - `_scraped_at` — ISO timestamp ของรอบ scrape
  - `_bucket` — ชื่อ bucket (= source key)
- **Duplicate ใน bucket OK** — merge step จะ dedupe ภายหลัง (raw = audit trail สมบูรณ์)

## Pipeline

```
scrapers → raw buckets (this folder)
              ↓
       julian_merge.mjs   → data/julian_all.json (HORATAD consumes)
       julian_validate.mjs → data/julian_validation.json (cross-source check)
```

## ทำไมต้องแยกถัง?

1. **Provenance** — ตอบได้ว่า field ไหนมาจาก source อะไร เมื่อไหร่
2. **Re-process ฟรี** — แก้ merge logic แล้ว rerun script ไม่ต้อง re-scrape
3. **Conflict detection** — ถ้า 2 sources บอก time_utc ต่างกัน → validate.mjs flag
4. **Quality bumping** — เจอ time จาก 2+ sources ตรงกัน → upgrade accuracy ได้
