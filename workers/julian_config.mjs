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
        ?person wikibase:sitelinks ?links. FILTER(?links >= 2)
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
for (let y = 1400; y < 2100; y += 5) ERA_SERIES.push(eraQuery(y, y + 5));

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

    // ── ยุโรป ──────────────────────────────────────────────────────────────
    {
      id: 'de_politicians',
      label: 'นักการเมืองเยอรมัน',
      country: 'DE', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P27 wd:Q183; wdt:P106 wd:Q82955.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de". }
        } LIMIT 500`,
    },
    {
      id: 'fr_politicians',
      label: 'นักการเมืองฝรั่งเศส',
      country: 'FR', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P27 wd:Q142; wdt:P106 wd:Q82955.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr". }
        } LIMIT 500`,
    },
    {
      id: 'ru_politicians',
      label: 'นักการเมืองรัสเซีย/โซเวียต',
      country: 'RU', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          { ?person wdt:P27 wd:Q159. } UNION { ?person wdt:P27 wd:Q15180. }
          ?person wdt:P106 wd:Q82955.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ru". }
        } LIMIT 500`,
    },
    {
      id: 'eu_celebrities',
      label: 'คนดังยุโรป (IT/ES/PL/NL)',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          VALUES ?country { wd:Q38 wd:Q29 wd:Q36 wd:Q55 wd:Q31 wd:Q40 wd:Q35 wd:Q34 }
          ?person wdt:P27 ?country.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 15)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── เอเชีย (เพิ่มเติม) ────────────────────────────────────────────────
    {
      id: 'cn_politicians',
      label: 'นักการเมืองจีน',
      country: 'CN', tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P27 wd:Q29520; wdt:P106 wd:Q82955.
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          OPTIONAL { ?person wikibase:sitelinks ?links. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh". }
        } LIMIT 500`,
    },
    {
      id: 'cn_entertainers',
      label: 'ดารา/นักร้องจีน',
      country: 'CN', tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P27 wd:Q29520.
          { ?person wdt:P106 wd:Q177220. } UNION { ?person wdt:P106 wd:Q33999. }
          ?person wikibase:sitelinks ?links. FILTER(?links >= 8)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,zh". }
        } LIMIT 500`,
    },
    {
      id: 'kr_entertainers',
      label: 'K-pop / K-drama',
      country: 'KR', tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P27 wd:Q884.
          { ?person wdt:P106 wd:Q177220. } UNION { ?person wdt:P106 wd:Q33999. }
          ?person wikibase:sitelinks ?links. FILTER(?links >= 5)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,ko". }
        } LIMIT 500`,
    },
    {
      id: 'mid_east_leaders',
      label: 'ผู้นำตะวันออกกลาง',
      country: null, tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          VALUES ?country { wd:Q79 wd:Q794 wd:Q796 wd:Q801 wd:Q810 wd:Q683 wd:Q878 wd:Q763 wd:Q842 wd:Q819 }
          ?person wdt:P27 ?country; wdt:P106 wd:Q82955.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 5)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'african_leaders',
      label: 'ผู้นำแอฟริกา',
      country: null, tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          VALUES ?country { wd:Q258 wd:Q114 wd:Q117 wd:Q1016 wd:Q115 wd:Q965 wd:Q1029 wd:Q1030 wd:Q1032 }
          ?person wdt:P27 ?country; wdt:P106 wd:Q82955.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 5)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── กีฬา (เพิ่มเติม) ───────────────────────────────────────────────────
    {
      id: 'tennis_players',
      label: 'นักเทนนิสอาชีพ',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q10833314.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 5)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'cricket_players',
      label: 'นักคริกเก็ตนานาชาติ',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q12299841.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 3)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'f1_drivers',
      label: 'นักแข่ง Formula 1',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q10843402.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 3)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'basketball_players',
      label: 'นักบาสเกตบอล (NBA/WNBA)',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q3665646.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 5)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'golf_players',
      label: 'นักกอล์ฟอาชีพ',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q13141064.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 5)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'boxing_champions',
      label: 'แชมป์โลกมวยสากล',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q11338576.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 5)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'baseball_players',
      label: 'นักเบสบอล (MLB)',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q10843517.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 5)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── ศิลปะ / วรรณกรรม ──────────────────────────────────────────────────
    {
      id: 'global_authors',
      label: 'นักเขียนชื่อดังระดับโลก',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q36180.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 15)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'global_directors',
      label: 'ผู้กำกับภาพยนตร์ชื่อดัง',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q2526255.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 10)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'global_composers',
      label: 'นักแต่งเพลงชื่อดัง',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q36834.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 10)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'global_painters',
      label: 'จิตรกร/ศิลปินทัศนศิลป์',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q1028181.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 10)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── ธุรกิจ / เทคโนโลยี ────────────────────────────────────────────────
    {
      id: 'global_business',
      label: 'ผู้ประกอบการ/CEO ระดับโลก',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          { ?person wdt:P106 wd:Q131524. } UNION { ?person wdt:P106 wd:Q484876. }
          ?person wikibase:sitelinks ?links. FILTER(?links >= 15)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },

    // ── ปรัชญา / ศาสนา ────────────────────────────────────────────────────
    {
      id: 'global_philosophers',
      label: 'นักปรัชญาชื่อดัง',
      country: null, tier: 2,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          ?person wdt:P106 wd:Q4964182.
          ?person wikibase:sitelinks ?links. FILTER(?links >= 10)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 500`,
    },
    {
      id: 'religious_leaders',
      label: 'ผู้นำศาสนา (Pope/Dalai Lama/etc)',
      country: null, tier: 1,
      sparql: `
        SELECT DISTINCT ?person ?personLabel ?birth ?death ?countryCode ?links WHERE {
          { ?person wdt:P39 wd:Q19546. }   # Pope
          UNION { ?person wdt:P39 wd:Q193628. } # Dalai Lama
          UNION { ?person wdt:P106 wd:Q42603. FILTER NOT EXISTS { ?person wdt:P570 _:x. } } # living clergy, notable
          ?person wikibase:sitelinks ?links. FILTER(?links >= 10)
          ?person p:P569/psv:P569 [wikibase:timeValue ?birth; wikibase:timePrecision ?birthPrec].
          FILTER(?birthPrec >= 11)
          OPTIONAL { ?person p:P570/psv:P570 [wikibase:timeValue ?death; wikibase:timePrecision ?deathPrec]. FILTER(?deathPrec >= 11) }
          OPTIONAL { ?person wdt:P27/wdt:P297 ?countryCode. }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
        } LIMIT 300`,
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
