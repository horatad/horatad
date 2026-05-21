# JULIAN — Mission Detail
# Project: JULIAN (Empirical Astro Search Engine / Database)
# ภาษา: ไทย + Eng technical term
# กฎ: ✅ = เสร็จแล้ว | 🔲 = ต้องทำ | 🔴 = blocked/รอ user | ⭐ = priority สูง
# อัปเดตไฟล์นี้ทุก session | ดูสถานะรวม → PROJECT_STATUS.md

---

## เป้าหมาย JULIAN

> สร้าง Empirical Astro Database — เก็บ planet positions ล่วงหน้า (Master Key) + ข้อมูลบุคคล/เหตุการณ์จริง (Internet Table)
> ส่งข้อมูลให้ BIBLE → BIBLE วัด empirical_p ต่อ rule → พิสูจน์ rule ด้วย real-world data

---

## Architecture — 2 ตาราง

### Master Key Table
```sql
CREATE TABLE master_key (
  jd  INTEGER PRIMARY KEY,   -- HORATAD internal JD (Jan 1 2000 CE = 730428)
  su  REAL, mo REAL, ma REAL, me REAL, ju REAL,
  ve  REAL, sa REAL, ra REAL, ke REAL, mr REAL
  -- degrees 0-360, hr=0 lng=100.5 (Bangkok midnight)
  -- ไม่เก็บลัคนา: เคลื่อน 30°/ชม. ใช้ date-only ไม่ได้
);
```
**keygen output:** CSV (flat columns) และ JSONL (flat keys su/mo/..) ← D1-import ready โดยตรง
- 1 row ต่อ 1 วัน — เก็บล่วงหน้า ไม่คำนวณซ้ำ
- แปลงจาก engine.js: `deg = sp[i] / 60` (unit 21600/circle → 360)

### Internet Table
```sql
CREATE TABLE internet (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  jd          INTEGER NOT NULL,        -- FK → master_key (วันเกิด/เหตุการณ์)
  name        TEXT,
  event_label TEXT,                    -- หมวดหมู่ เช่น "นายกรัฐมนตรี" | "นักกีฬา"
  type        TEXT,                    -- "human" | "event"
  country     TEXT,                    -- ISO 3166-1 alpha-2: TH, US, GB, JP, ...
  tier        INTEGER,                 -- 1=ระดับโลก | 2=ระดับชาติ | 3=ไม่แน่ใจ
  lat         REAL,
  lng         REAL,
  time_utc    TEXT,                    -- HH:MM หรือ null
  lagna_sign  INTEGER,                 -- 0-11 (คำนวณจาก time_utc+lng) หรือ null
  relate_id   TEXT,                    -- JSON array of JD เช่น [death_jd]
  source      TEXT,                    -- "wikipedia:en:TITLE" | "horatad_db" | "manual"
  confidence  REAL,                    -- 0.0–1.0
  notes       TEXT
);
CREATE INDEX idx_internet_jd ON internet(jd);
CREATE INDEX idx_internet_country ON internet(country);
CREATE INDEX idx_internet_tier ON internet(tier);
```
**tier:** BIBLE ควร filter tier <= 2 สำหรับ empirical analysis (ตัด tier 3 = ส่วนตัว/ไม่แน่ใจ)  
**lagna_sign:** null ถ้าไม่รู้เวลาเกิด — BIBLE ใช้ lagna rules ได้เฉพาะ rows ที่ lagna_sign IS NOT NULL
- หลาย record ต่อ 1 JD ได้ (คนหลายคนเกิดวันเดียว)
- HUMAN record: jd = birth JD, relate_id = [death_jd, ...]
- EVENT record: jd = event JD, relate_id = [person_jd, ...]

---

## JD Format — ตัดสินใจแล้ว

**ใช้ `get_j(d, m, y_ce)` จาก engine.js** — เหมือนกัน 100% กับ HORATAD

- Integer, date-only, สมมติ 00:00
- Jan 1, 2000 CE = 730428
- HORATAD natal เก็บ `jd = Math.trunc(_calcJD(d,m,y_be))` = `get_j(d, m, y_be-543)`
- Query: แปลง y_be → y_ce ด้วย `y_be - 543` ก่อนส่ง

---

## JULIAN → BIBLE Data Flow

```
BIBLE ส่ง: JD (birth date ของ person)
JULIAN คืน:
  - planets[10] จาก Master Key (planet positions วันเกิด)
  - person/event data จาก Internet Table (name, label, confidence)

BIBLE ใช้:
  - match_rules(planets) → rules ที่ตรง
  - นับ hit/miss ต่อ rule → empirical_p = hits / (hits + miss)
  - เก็บลง rule.empirical_p + rule.empirical_n + rule.empirical_refs
```

---

## Data Collection Priority

| Tier | ประเภท | เหตุผล |
|---|---|---|
| 1 (แข็ง) | นักการเมือง, บุคคลสำคัญ — Wikipedia verified | วันเกิด+วันตายแน่นอน, มี relate_id |
| 2 | เหตุการณ์ประวัติศาสตร์ไทย | date + lat/lng ชัดเจน |
| 3 | user-contributed (opt-in) | precision ต่ำกว่า |

**เป้า Phase 1:** 500+ HUMAN records (Tier 1) — นักการเมืองไทย, บุคคลสาธารณะ

---

## M-Series Tasks

### ✅ M0 — JD Format Decision
ตัดสินใจแล้ว: ใช้ get_j() internal format (Jan 1 2000 CE = 730428)

### ✅ M1 — Schema Design
Master Key Table + Internet Table schema — ออกแบบแล้ว (session 2026-05-21)

### ✅ M2 — Engine Export
`get_j` export จาก engine.js — เพิ่มแล้ว (session 2026-05-21)

### ✅ M3 — julian_keygen.html
Browser tool สร้าง Master Key batch (JD range → planets[10]) → download CSV/JSONL
- input: ช่วงปี CE, ลองจิจูด
- output: `{jd, date_ce, planets[10]}` ต่อวัน
- async generate + progress bar

### ✅ M4 — julian_scraper.html
Browser tool ค้นหาบุคคล/เหตุการณ์ผ่าน Wikipedia + Wikidata → บันทึก Internet Table
- Search EN/TH Wikipedia → auto-fetch Wikidata birth/death dates
- Buffer persisted ใน localStorage
- export JSONL (Internet Table format)

### 🔲 M5 — CF D1 Storage
- สร้าง CF D1 database: 2 tables (master_key, internet)
- CF Worker endpoint: `GET /julian?jd=730428` → `{planets, persons[]}`
- **รอ user setup CF D1 + Worker**

### 🔲 M6 — Data Import Pipeline
- import CSV → CF D1 master_key (73,000 rows สำหรับ 1900-2100)
- import JSONL → CF D1 internet
- upsert logic (ไม่ duplicate)
- **รอ M5**

### 🔲 M7 — BIBLE Integration
- BIBLE เรียก JULIAN API แทน local engine.js สำหรับ empirical lookup
- format request/response spec
- **รอ M5**

### 🔲 M8 — Empirical Validator
- empirical_validator.html — match persons → rules → count hit/miss
- update empirical_p, empirical_n, empirical_refs ใน kb.json
- **รอ M5 + data ≥100 records**

### 🔴 M9 — Rating UI
- 👍/👎 หลัง prediction ใน HORATAD app
- เก็บเป็น event record ใน Internet Table
- **รอ HORATAD + BIBLE เสถียรก่อน**

---

## ไฟล์หลัก

| ไฟล์ | หน้าที่ |
|---|---|
| `v3/engine.js` | get_j(), get_data() — exported แล้ว |
| `tools/julian_keygen.html` | สร้าง Master Key batch |
| `tools/julian_scraper.html` | ค้นหาบุคคล → Internet Table |
| `docs/JULIAN_MISSION.md` | ไฟล์นี้ |

---

## Blocked (รอ user)

- 🔴 **CF D1 setup** — storage หลัก + Worker API
- 🔴 **year range สำหรับ Master Key** — 1900–2100 CE? กว้างกว่า?
- 🔴 **ทดสอบ julian_scraper.html** — Wikipedia CORS + Wikidata API
- 🔴 **Policy: unvalidated records** — เก็บ HUMAN ที่ไม่มี relate_id ได้ไหม? (เสนอ: flag status='unvalidated')

---

## Context สำคัญสำหรับ Claude

```javascript
// get_j: engine.js:27 — CE year, integer output
get_j(d, m, y_ce)  // Jan 1 2000 = 730428

// get_data: engine.js:106 — unit 21600/circle
get_data(d, m, y_ce, 0, 0, 100.5)  // → sp[0..10]
// sp[0]=lagna (time-dependent, skip for date-only)
// sp[1..10] = SU MO MA ME JU VE SA RA KE MR
// degrees: deg = sp[i] / 60

// HORATAD natal: y_be → y_ce
const y_ce = y_be - 543;
const jd = get_j(d, m, y_ce);
```

---
*อัปเดตล่าสุด: 2026-05-21 | session 1*
