# JULIAN — Empirical Astro Database
# Mission + Status | อัปเดต: 2026-05-23
# ดูสถานะรวม → PROJECT_STATUS.md | handoff → handoffs/JULIAN_20260523_v1.md

---

## เป้าหมาย

สร้าง empirical database ของบุคคลสำคัญ + วันเกิดแม่นยำ → ยืนยัน BIBLE rules ด้วย real-world data

---

## Current State (2026-05-23)

| ตัวชี้วัด | ค่า |
|---|---|
| Total records | 58,428 / 100,000 (58.4%) |
| Accuracy C (verified) | 599 records |
| Accuracy D (date only) | 57,819 records |
| Thai time_utc known | ~11 records |
| Automation | ✅ รันทุก 6 ชม. |

---

## Storage Architecture

```
data/julian_all.json  ← GitHub repo (CORS-free, ฟรี, ไม่มี token expire)
```

ไม่ใช้ CF D1 — ตัดสินใจ 2026-05-21: CF D1 ต้องการ token + setup ซับซ้อน + monthly cost risk
GitHub raw: CORS-free ทันที, ฟรีไม่จำกัด, ไม่มี vendor lock-in

---

## Schema (data/julian_all.json — record format)

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
  "sources": ["wikidata:Q...", "astrotheme:slug", "wikipedia_th:title|wikidata:Q..."]
}
```

### Accuracy Grades

| Grade | นิยาม |
|---|---|
| A | สูจิบัตร / official document |
| B | คนใกล้ชิด / family testimony |
| C | สาธารณะ verified (Astrotheme + Wikipedia cite) |
| D | สาธารณะ unverified (Wikidata date only, ไม่มีเวลา) |
| F | unknown / placeholder |

---

## Dedup System (4 ชั้น)

1. `seen_qids` in-memory set (ต่อ run)
2. UNIQUE constraint: `(jd, name)` — ป้องกัน exact dup
3. UNIQUE constraint: source entry
4. COALESCE survivorship — เมื่อ conflict ให้ record ที่มีข้อมูลมากกว่าชนะ

---

## Pipeline — Automation (GitHub Actions cron ทุก 6h)

```
1. Wikidata SPARQL scrape (137 queries) → insert/upsert records
2. Astrotheme enrich → update time_utc (~1.24% match rate | lat/lng ⚠️ parser bug)
3. Wikipedia TH enrich → update time_utc (Thai time patterns, focus tier1 + country=TH)
4. Manual seed merge (tools/julian_seed_input.html output)
5. Commit data/julian_all.json + push
6. Create GitHub Release (version snapshot)
```

### Query Series (137 รวม)

| Series | จำนวน | จุดประสงค์ |
|---|---|---|
| Category | 15 | athletes, politicians, actors, musicians, scientists |
| Era 20-yr | 80 | born 1900-2000 (20-yr blocks) |
| ASTROTHEME_SERIES | 42 | famous Thais + astro community requests |

---

## Pending Tasks

### Claude ทำได้
- ขยาย Wikipedia TH parser — pattern "ฤกษ์เกิด", "ดวงเกิด" เพื่อจับเวลาเพิ่ม
- Debug Astrotheme lat/lng parser — selector ไม่ตรง coord field
- Astro-Databank scraper (astro.com) — Rodden Rating AA/A/B → accuracy A/B/C

### รอ user
- เปิด `tools/julian_seed_input.html` → กรอก records accuracy A/B/C → export JSON → commit
- ทดสอบ HORATAD → "ดาวน์โหลดข้อมูลสาธารณะ" button

---

## ไฟล์หลัก

| ไฟล์ | หน้าที่ |
|---|---|
| `data/julian_all.json` | Database หลัก (GitHub repo, CORS-free) |
| `workers/julian_scraper.mjs` | Wikidata SPARQL scraper (Node.js / CI) |
| `workers/julian_config.mjs` | 137 query series + rate limit config |
| `workers/julian_seed_merge.mjs` | Manual seed validation + dedup + merge |
| `workers/julian_empirical.mjs` | Empirical validator (future — รอ data) |
| `tools/julian_seed_input.html` | Manual seed input UI (accuracy A/B/C) |
| `tools/julian_status.html` | Records status dashboard |
| `tools/julian_keygen.html` | Master Key batch generator (browser) |
| `tools/julian_scraper.html` | Wikidata search browser tool |
| `.github/workflows/julian_sync.yml` | Cron automation |

---

*อัปเดต: 2026-05-23 | records: 58,428 | handoff: handoffs/JULIAN_20260523_v1.md*
