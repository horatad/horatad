-- JULIAN D1 Setup — รัน 1 ครั้งก่อน import ข้อมูล
-- วิธีใช้: wrangler d1 execute julian --file=workers/julian_setup.sql --remote --yes
--         (ต้องตั้ง CF_API_TOKEN + database_id ใน julian_wrangler.toml ก่อน)

-- ── Master Key Table ────────────────────────────────────────────────────────
-- 1 row ต่อ 1 วัน, hr=0, lng=100.5 (Bangkok midnight)
-- ไม่เก็บลัคนา: เคลื่อน 30°/ชม. ใช้ date-only ไม่ได้
CREATE TABLE IF NOT EXISTS master_key (
  jd  INTEGER PRIMARY KEY,   -- HORATAD internal JD (Jan 1 2000 CE = 730428)
  su  REAL, mo REAL, ma REAL, me REAL, ju REAL,
  ve  REAL, sa REAL, ra REAL, ke REAL, mr REAL
  -- หน่วย degrees 0-360 (แปลงจาก engine.js: deg = sp[i] / 60)
);

-- ── Internet Table ───────────────────────────────────────────────────────────
-- บุคคลสำคัญ + เหตุการณ์ — หลาย records ต่อ 1 JD ได้
-- source_type: 'internet' = scrape | 'human' = user-contributed
CREATE TABLE IF NOT EXISTS internet (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  jd              INTEGER NOT NULL,        -- FK → master_key (วันเกิด/เหตุการณ์)
  name            TEXT,
  event_label     TEXT,                    -- หมวดหมู่ เช่น "นักการเมืองไทย"
  type            TEXT,                    -- 'human' | 'event'
  country         TEXT,                    -- ISO 3166-1 alpha-2: TH, US, ...
  tier            INTEGER,                 -- 1=ระดับโลก | 2=ระดับชาติ | 3=ไม่แน่ใจ
  lat             REAL,
  lng             REAL,
  time_utc        TEXT,                    -- HH:MM หรือ NULL
  lagna_sign      INTEGER,                 -- 0-11 หรือ NULL (ถ้าไม่รู้เวลาเกิด)
  relate_id       TEXT,                    -- JSON array of JD เช่น [death_jd]
  source          TEXT,                    -- 'wikidata:Q123' | 'horatad_db' | 'manual'
  source_type     TEXT DEFAULT 'internet', -- 'internet' | 'human'
  validated_count INTEGER DEFAULT 0,       -- independent sources ที่ยืนยัน (auto-increment)
  confidence      REAL,                    -- 0.0–1.0 (auto-calc หรือ user-set)
  notes           TEXT
);

-- ── Indices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_internet_jd          ON internet(jd);
CREATE INDEX IF NOT EXISTS idx_internet_country     ON internet(country);
CREATE INDEX IF NOT EXISTS idx_internet_tier        ON internet(tier);
CREATE INDEX IF NOT EXISTS idx_internet_source_type ON internet(source_type);
CREATE INDEX IF NOT EXISTS idx_internet_confidence  ON internet(confidence DESC);

-- UNIQUE index สำหรับ UPSERT dedup (ON CONFLICT(jd,name) ใน julian_import.mjs)
-- NULL ใน name → SQLite ถือว่าแตกต่างกัน (อนุญาต multiple NULL rows)
CREATE UNIQUE INDEX IF NOT EXISTS idx_internet_jd_name ON internet(jd, name);

-- UNIQUE บน source สำหรับ Wikidata records — ป้องกันคนเดียวถูก import ซ้ำด้วยชื่อต่างกัน
-- (เพิ่มเติมจาก seen_qids ที่ป้องกันที่ application level)
-- migration สำหรับตารางที่มีอยู่:
--   wrangler d1 execute julian --command="CREATE UNIQUE INDEX IF NOT EXISTS idx_internet_source_wikidata ON internet(source) WHERE source LIKE 'wikidata:%'" --remote --yes
CREATE UNIQUE INDEX IF NOT EXISTS idx_internet_source_wikidata
  ON internet(source) WHERE source LIKE 'wikidata:%';
