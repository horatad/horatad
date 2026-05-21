// JULIAN Automation Config — แก้ที่นี่ที่เดียว ไม่ต้องแตะ logic

export const CONFIG = {

  // ── Target ────────────────────────────────────────────────────
  TARGET_RECORDS: 500,      // หยุด automation เมื่อถึงจำนวนนี้
  RECORDS_PER_RUN: 50,      // max records ต่อ 1 run (conservative)

  // ── Rate Limits ───────────────────────────────────────────────
  WIKIDATA_DELAY_MS: 1200,  // หน่วงระหว่าง requests (Wikidata limit: 1 req/sec)
  D1_WRITES_DAILY: 100_000, // CF D1 free tier (ตรวจสอบล่าสุด: 2026-05)
  D1_WRITES_SAFETY: 0.8,    // หยุดเมื่อถึง 80% ของ limit (safety buffer)

  // ── Wikidata Query Series ─────────────────────────────────────
  // เรียงตาม priority — แต่ละ run ดึงคนละ query จนครบ TARGET_RECORDS
  QUERY_SERIES: [
    {
      id: 'th_prime_ministers',
      label: 'นายกรัฐมนตรีไทย',
      country: 'TH',
      tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death WHERE {
          ?person wdt:P39 wd:Q216360;
                  wdt:P569 ?birth.
          OPTIONAL { ?person wdt:P570 ?death. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
      `,
    },
    {
      id: 'th_politicians',
      label: 'นักการเมืองไทย',
      country: 'TH',
      tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death WHERE {
          ?person wdt:P27 wd:Q869;
                  wdt:P106 wd:Q82955;
                  wdt:P569 ?birth.
          OPTIONAL { ?person wdt:P570 ?death. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        LIMIT 300
      `,
    },
    {
      id: 'world_leaders',
      label: 'ผู้นำโลก',
      country: null,          // detect จาก Wikidata P27
      tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode WHERE {
          VALUES ?pos { wd:Q30461 wd:Q48352 wd:Q35234 }
          ?person wdt:P39 ?pos;
                  wdt:P569 ?birth.
          OPTIONAL { ?person wdt:P570 ?death. }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        LIMIT 500
      `,
    },
    {
      id: 'th_athletes',
      label: 'นักกีฬาไทย',
      country: 'TH',
      tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death WHERE {
          ?person wdt:P27 wd:Q869;
                  wdt:P106 wd:Q2066131;
                  wdt:P569 ?birth.
          OPTIONAL { ?person wdt:P570 ?death. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        LIMIT 200
      `,
    },
    {
      id: 'th_entertainers',
      label: 'ดารา/นักร้องไทย',
      country: 'TH',
      tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death WHERE {
          ?person wdt:P27 wd:Q869;
                  wdt:P569 ?birth.
          { ?person wdt:P106 wd:Q177220. }   # singer
          UNION
          { ?person wdt:P106 wd:Q33999. }    # actor
          OPTIONAL { ?person wdt:P570 ?death. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        }
        LIMIT 200
      `,
    },
  ],
};
