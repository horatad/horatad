// JULIAN Automation Config — แก้ที่นี่ที่เดียว ไม่ต้องแตะ logic

export const CONFIG = {

  // ── Target ────────────────────────────────────────────────────
  TARGET_RECORDS: 5000,     // เพดานสูงสุด (หยุดก่อนถ้า queries หมด)
  MAX_PER_RUN: 200,         // เพดาน records ต่อ 1 run (จริงๆ จะน้อยกว่านี้ตาม budget)

  // ── Rate Limits ───────────────────────────────────────────────
  WIKIDATA_DELAY_MS: 1200,      // หน่วงระหว่าง requests (Wikidata limit: 1 req/sec)
  D1_WRITES_DAILY_LIMIT: 100_000, // CF D1 free tier (ตรวจสอบล่าสุด: 2026-05)
  D1_WRITES_SAFETY_PCT: 0.85,    // กฎหลัก: ใช้ไม่เกิน 85% ของ limit ต่อวัน

  // ── Wikidata Query Series ─────────────────────────────────────
  // เรียงตาม priority — แต่ละ run ดึงคนละ query จนครบ TARGET_RECORDS
  // ทุก query กรอง birthPrec >= 11 (day-level เท่านั้น — วันเดือนปีครบ)
  QUERY_SERIES: [
    {
      id: 'th_politicians',
      label: 'นักการเมืองไทย',
      country: 'TH',
      tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death WHERE {
          ?person wdt:P27 wd:Q869;
                  wdt:P106 wd:Q82955.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
        }
        LIMIT 300
      `,
    },
    {
      id: 'world_leaders',
      label: 'ผู้นำโลก',
      country: null,
      tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode WHERE {
          VALUES ?pos { wd:Q30461 wd:Q48352 wd:Q35234 }
          ?person wdt:P39 ?pos.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
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
                  wdt:P106 wd:Q2066131.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
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
          ?person wdt:P27 wd:Q869.
          { ?person wdt:P106 wd:Q177220. }
          UNION
          { ?person wdt:P106 wd:Q33999. }
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
        }
        LIMIT 200
      `,
    },
    {
      id: 'th_prime_ministers',
      label: 'นายกรัฐมนตรีไทย',
      country: 'TH',
      tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death WHERE {
          ?person wdt:P27 wd:Q869.
          { ?person wdt:P39 wd:Q216360. }
          UNION
          { ?person wdt:P39 ?pos.
            ?pos wdt:P17 wd:Q869;
                 wdt:P31 wd:Q4164871. }
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
        }
        LIMIT 50
      `,
    },
  ],
};
