// JULIAN Automation Config — แก้ที่นี่ที่เดียว ไม่ต้องแตะ logic

// ── Astrotheme query generator — 1800-2025, 5-ปีต่อ chunk ───────────────────
function astrothemeQuery(y1, y2) {
  const from = `${y1}-01-01T00:00:00Z`;
  const to   = `${y2}-01-01T00:00:00Z`;
  return {
    id:      `astro_${y1}_${y2}`,
    label:   `Astrotheme ${y1}–${y2}`,
    country: null,
    tier:    1,
    sparql: `
      SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?astroId ?links WHERE {
        ?person wdt:P3447 ?astroId.
        ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
        FILTER(?birthPrec >= 11)
        FILTER(?birth >= "${from}"^^xsd:dateTime && ?birth < "${to}"^^xsd:dateTime)
        OPTIONAL {
          ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
          FILTER(?deathPrec >= 11)
        }
        OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
        OPTIONAL { ?person wikibase:sitelinks ?links. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
      } LIMIT 500`,
  };
}

const ASTROTHEME_SERIES = [];
for (let y = 1800; y < 2025; y += 5) ASTROTHEME_SERIES.push(astrothemeQuery(y, y + 5));

// ── Astro-Databank query generator — P760, same pattern as Astrotheme ─────────
// Rodden Rating AA/A = birth time จากสูจิบัตร/ชีวประวัติ → ควร upgrade accuracy=B
// ⚠️ ใช้ Wikidata SPARQL — trigger หลัง Wikidata rate limit reset เท่านั้น
function astroDatabankQuery(y1, y2) {
  const from = `${y1}-01-01T00:00:00Z`;
  const to   = `${y2}-01-01T00:00:00Z`;
  return {
    id:      `astroDb_${y1}_${y2}`,
    label:   `AstroDatabank ${y1}–${y2}`,
    country: null,
    tier:    1,
    sparql: `
      SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?astroDbId ?links WHERE {
        ?person wdt:P760 ?astroDbId.
        ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
        FILTER(?birthPrec >= 11)
        FILTER(?birth >= "${from}"^^xsd:dateTime && ?birth < "${to}"^^xsd:dateTime)
        OPTIONAL {
          ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
          FILTER(?deathPrec >= 11)
        }
        OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
        OPTIONAL { ?person wikibase:sitelinks ?links. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
      } LIMIT 500`,
  };
}

const ASTRODATABANK_SERIES = [];
for (let y = 1800; y < 2025; y += 5) ASTRODATABANK_SERIES.push(astroDatabankQuery(y, y + 5));

// ── Era query generator — 1700-2100, 5-ปีต่อ chunk ──────────────────────────
// ดึงบุคคลสำคัญ (sitelinks >= 3) ที่มีวันเดือนปีเกิดครบ (precision=day)
function eraQuery(y1, y2) {
  const from = `${y1}-01-01T00:00:00Z`;
  const to   = `${y2}-01-01T00:00:00Z`;
  return {
    id:      `era_${y1}_${y2}`,
    label:   `บุคคลสำคัญ ${y1}–${y2}`,
    country: null,
    tier:    2,
    sparql: `
      SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
        ?person wikibase:sitelinks ?links. FILTER(?links >= 3)
        ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
        FILTER(?birthPrec >= 11)
        FILTER(?birth >= "${from}"^^xsd:dateTime && ?birth < "${to}"^^xsd:dateTime)
        OPTIONAL {
          ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
          FILTER(?deathPrec >= 11)
        }
        OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
      } LIMIT 500`,
  };
}

const ERA_SERIES = [];
for (let y = 1700; y < 2100; y += 5) ERA_SERIES.push(eraQuery(y, y + 5));

export const CONFIG = {

  // ── Target ────────────────────────────────────────────────────
  TARGET_RECORDS: 500000,   // เพดานสูงสุด (หยุดก่อนถ้า queries หมด)
  MAX_PER_RUN: 500,         // เพดาน records ต่อ 1 query ใน run เดียว

  // ── Accuracy grades ───────────────────────────────────────────
  // A = สูจิบัตร / official document
  // B = คนใกล้ชิด / family direct testimony
  // C = สาธารณะ verified (cite source)
  // D = สาธารณะ unverified (date only)
  // F = unknown / placeholder

  // ── Rate Limits ───────────────────────────────────────────────
  WIKIDATA_DELAY_MS: 1500,
  D1_WRITES_DAILY_LIMIT: 100_000,
  D1_WRITES_SAFETY_PCT: 0.85,

  // ── Importance score weights ──────────────────────────────────
  // score = 0.30×tier + 0.40×sitelinks(log) + 0.30×accuracy
  IMPORTANCE_WEIGHTS: { tier: 0.30, sitelinks: 0.40, accuracy: 0.30 },

  // ── Wikidata Query Series ─────────────────────────────────────
  QUERY_SERIES: [

    // ── ไทย ──────────────────────────────────────────────────────
    {
      id: 'th_politicians',
      label: 'นักการเมืองไทย',
      country: 'TH', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?links WHERE {
          ?person wdt:P27 wd:Q869; wdt:P106 wd:Q82955.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
        } LIMIT 500`,
    },
    {
      id: 'th_prime_ministers',
      label: 'นายกรัฐมนตรีไทย',
      country: 'TH', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?links WHERE {
          ?person wdt:P27 wd:Q869.
          { ?person wdt:P39 wd:Q216360. }
          UNION { ?person wdt:P39 ?pos. ?pos wdt:P17 wd:Q869; wdt:P31 wd:Q4164871. }
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
        } LIMIT 100`,
    },
    {
      id: 'th_athletes',
      label: 'นักกีฬาไทย',
      country: 'TH', tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?links WHERE {
          ?person wdt:P27 wd:Q869; wdt:P106 wd:Q2066131.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
        } LIMIT 500`,
    },
    {
      id: 'th_entertainers',
      label: 'ดารา/นักร้องไทย',
      country: 'TH', tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?links WHERE {
          ?person wdt:P27 wd:Q869.
          { ?person wdt:P106 wd:Q177220. } UNION { ?person wdt:P106 wd:Q33999. }
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
        } LIMIT 500`,
    },
    {
      id: 'th_royals',
      label: 'พระราชวงศ์ไทย',
      country: 'TH', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?links WHERE {
          ?person wdt:P27 wd:Q869; wdt:P53 wd:Q1077839.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
        } LIMIT 200`,
    },
    {
      id: 'th_academics',
      label: 'นักวิชาการ/นักวิทยาศาสตร์ไทย',
      country: 'TH', tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?links WHERE {
          ?person wdt:P27 wd:Q869.
          { ?person wdt:P106 wd:Q901. } UNION { ?person wdt:P106 wd:Q1622272. }
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
        } LIMIT 300`,
    },

    // ── ผู้นำโลก ──────────────────────────────────────────────────
    {
      id: 'world_leaders',
      label: 'ผู้นำโลก',
      country: null, tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          VALUES ?pos { wd:Q30461 wd:Q48352 wd:Q35234 }
          ?person wdt:P39 ?pos.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,th". }
        } LIMIT 500`,
    },
    {
      id: 'us_presidents',
      label: 'ประธานาธิบดีสหรัฐ',
      country: 'US', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?links WHERE {
          ?person wdt:P39 wd:Q11696.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 100`,
    },
    {
      id: 'uk_prime_ministers',
      label: 'นายกรัฐมนตรีอังกฤษ',
      country: 'GB', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?links WHERE {
          ?person wdt:P39 wd:Q14211.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 100`,
    },
    {
      id: 'jp_politicians',
      label: 'นักการเมืองญี่ปุ่น',
      country: 'JP', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?links WHERE {
          ?person wdt:P27 wd:Q17; wdt:P106 wd:Q82955.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ja". }
        } LIMIT 500`,
    },
    {
      id: 'asean_leaders',
      label: 'ผู้นำอาเซียน',
      country: null, tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          VALUES ?country { wd:Q869 wd:Q836 wd:Q819 wd:Q424 wd:Q833 wd:Q928 wd:Q334 wd:Q574 wd:Q686 wd:Q881 }
          ?person wdt:P27 ?country; wdt:P106 wd:Q82955.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── นักกีฬาระดับโลก ───────────────────────────────────────────
    {
      id: 'olympic_athletes',
      label: 'นักกีฬาโอลิมปิก',
      country: null, tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P166 ?medal.
          VALUES ?medal { wd:Q15123426 wd:Q15123427 wd:Q15123428 }
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'football_players',
      label: 'นักฟุตบอลชื่อดัง',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q937857.
          ?person wdt:P21 wd:Q6581097.
          ?person wikibase:sitelinks ?links. FILTER(?links > 20)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── นักวิทยาศาสตร์ / นักรางวัล ────────────────────────────────
    {
      id: 'nobel_laureates',
      label: 'ผู้ได้รับรางวัลโนเบล',
      country: null, tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          { ?person wdt:P166 wd:Q37922. } UNION
          { ?person wdt:P166 wd:Q44585. } UNION
          { ?person wdt:P166 wd:Q38104. } UNION
          { ?person wdt:P166 wd:Q35637. } UNION
          { ?person wdt:P166 wd:Q76250. } UNION
          { ?person wdt:P166 wd:Q47170. }
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'global_scientists',
      label: 'นักวิทยาศาสตร์ชื่อดัง',
      country: null, tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q901.
          ?person wikibase:sitelinks ?links. FILTER(?links > 30)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── อินเดีย ──────────────────────────────────────────────────
    {
      id: 'in_politicians',
      label: 'นักการเมืองอินเดีย',
      country: 'IN', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P27 wd:Q668; wdt:P106 wd:Q82955.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'in_entertainers',
      label: 'ดารา/นักร้องอินเดีย (Bollywood)',
      country: 'IN', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P27 wd:Q668.
          { ?person wdt:P106 wd:Q177220. } UNION { ?person wdt:P106 wd:Q33999. }
          ?person wikibase:sitelinks ?links. FILTER(?links >= 5)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── ผู้นำอเมริกาใต้ ──────────────────────────────────────────
    {
      id: 'latam_leaders',
      label: 'ผู้นำอเมริกาใต้',
      country: null, tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          VALUES ?country { wd:Q155 wd:Q414 wd:Q298 wd:Q419 wd:Q733 wd:Q77 wd:Q736 wd:Q760 wd:Q241 wd:Q786 }
          ?person wdt:P27 ?country; wdt:P106 wd:Q82955.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 8)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── ดนตรี / บันเทิงโลก ───────────────────────────────────────
    {
      id: 'global_musicians',
      label: 'นักดนตรีชื่อดังระดับโลก',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q177220.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 20)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'global_actors',
      label: 'นักแสดงชื่อดังระดับโลก',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q33999.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 15)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL {
            ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec].
            FILTER(?deathPrec >= 11)
          }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── Astrotheme series: P3447 — birth time จาก astrotheme.com ──────────
    ...ASTROTHEME_SERIES,

    // ── Astro-Databank series: P760 — Rodden-rated birth times ─────────────
    // ⚠️ trigger หลัง Wikidata rate limit reset เท่านั้น
    ...ASTRODATABANK_SERIES,

    // ── Era series: บุคคลสำคัญ 1700-2100 (generate อัตโนมัติ) ────────────
    ...ERA_SERIES,
  ],
};
