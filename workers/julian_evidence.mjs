/**
 * julian_evidence.mjs — Accuracy Evidence Scoring Engine
 *
 * DESIGN PRINCIPLE: accuracy is DERIVED from source evidence, never manually set.
 * This prevents human error (including from the data owner).
 *
 * Rules are explicit, deterministic, and testable.
 * To upgrade a record's accuracy → add/improve the raw source evidence.
 * To change grading rules → edit this file + re-run julian_regrade.mjs.
 *
 * Grade scale:
 *   A = Official document (birth certificate, hospital record)
 *   B = Professionally verified (Astrotheme, 2+ independent sources agree ±30min)
 *   C = Single cited source, minute-level precision (Wikidata P569 prec=14, Wikipedia cite)
 *   D = Date only, or hour-approximation (Wikidata prec=13, round-hour distribution)
 *   F = Placeholder / no reliable source
 */

// ── Evidence rules (ordered by priority — first match wins) ───────────────────

const RULES = [

  // ── Grade A: Official document ────────────────────────────────────────────
  {
    grade: 'A',
    test: (r) => r._evidence?.official_doc === true,
    reason: 'Official document (birth certificate or hospital record)'
  },

  // ── Grade F: Known placeholder ────────────────────────────────────────────
  {
    grade: 'F',
    test: (r) => PLACEHOLDER_TIMES.has(r.time_utc),
    reason: 'Known placeholder time — not a real birth time'
  },
  {
    grade: 'F',
    test: (r) => !r.source || r.source === 'unknown',
    reason: 'No reliable source'
  },

  // ── Grade B: Professionally verified or cross-verified ───────────────────
  {
    grade: 'B',
    test: (r) => r.source?.startsWith('astrotheme:') && r.time_utc && !PLACEHOLDER_TIMES.has(r.time_utc),
    reason: 'Astrotheme-sourced birth time (professionally verified by astrologers)'
  },
  {
    grade: 'B',
    test: (r) => r._evidence?.cross_verified === true,
    reason: '2+ independent sources agree on birth time within ±30 minutes'
  },

  // ── Grade C: Single cited source, minute-level precision ─────────────────
  {
    grade: 'C',
    test: (r) => {
      if (!r.time_utc || PLACEHOLDER_TIMES.has(r.time_utc)) return false;
      if (r._evidence?.wikidata_precision >= 14) return true;
      if (r.source?.startsWith('wikipedia_th:')) return true;
      return false;
    },
    reason: 'Minute-level precision from cited source (Wikidata prec≥14 or Wikipedia TH)'
  },

  // ── Grade D: Date only or hour-approximation ──────────────────────────────
  {
    grade: 'D',
    test: (r) => true,  // fallthrough — if nothing above matched
    reason: 'Date only or unverified birth time'
  },
];

// Times known to be placeholders / artifacts
const PLACEHOLDER_TIMES = new Set([
  '07:16',  // fictional characters (Ellen Ripley, SHODAN, Moo Deng)
  '07:17',  // Wikidata T07:17:00Z artifacts (seen in data)
  '07:18',  // Wikidata T07:18:00Z artifacts
]);

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * deriveAccuracy(record) → { grade, reason }
 * Deterministic — same input always gives same output.
 * Never throws — returns 'F' on any error.
 */
export function deriveAccuracy(record) {
  try {
    for (const rule of RULES) {
      if (rule.test(record)) {
        return { grade: rule.grade, reason: rule.reason };
      }
    }
  } catch (e) {
    return { grade: 'F', reason: `Evidence error: ${e.message}` };
  }
  return { grade: 'F', reason: 'No rule matched (fallthrough)' };
}

/**
 * gradeRecord(record) → record with accuracy set from evidence
 * Non-destructive — returns new object, does not mutate input.
 */
export function gradeRecord(record) {
  const { grade, reason } = deriveAccuracy(record);
  return {
    ...record,
    accuracy: grade,
    _accuracy_reason: reason,
  };
}

/**
 * checkPlaceholder(time_utc) → boolean
 * Returns true if the time is a known placeholder / artifact.
 */
export function checkPlaceholder(time_utc) {
  return PLACEHOLDER_TIMES.has(time_utc);
}

/**
 * crossVerify(r1_time, r2_time) → boolean
 * Returns true if two time_utc strings agree within ±30 minutes.
 * Both must be real times (not placeholders).
 */
export function crossVerify(t1, t2) {
  if (!t1 || !t2) return false;
  if (PLACEHOLDER_TIMES.has(t1) || PLACEHOLDER_TIMES.has(t2)) return false;
  const [h1, m1] = t1.split(':').map(Number);
  const [h2, m2] = t2.split(':').map(Number);
  if (isNaN(h1) || isNaN(m1) || isNaN(h2) || isNaN(m2)) return false;
  return Math.abs((h1 * 60 + m1) - (h2 * 60 + m2)) <= 30;
}

// ── Self-test (run with: node workers/julian_evidence.mjs --test) ─────────────

if (process.argv.includes('--test')) {
  const tests = [
    // [record, expected_grade, description]
    [{ source: 'wikidata:Q123', time_utc: '07:16' }, 'F', 'placeholder time → F'],
    [{ source: null }, 'F', 'no source → F'],
    [{ source: 'astrotheme:Barack-Obama', time_utc: '13:35' }, 'B', 'Astrotheme time → B'],
    [{ source: 'astrotheme:Barack-Obama', time_utc: '07:17' }, 'F', 'Astrotheme + placeholder → F'],
    [{ _evidence: { cross_verified: true }, source: 'wikidata:Q1', time_utc: '10:00' }, 'B', 'cross-verified → B'],
    [{ source: 'wikidata:Q1', _evidence: { wikidata_precision: 14 }, time_utc: '10:30' }, 'C', 'Wikidata prec=14 → C'],
    [{ source: 'wikipedia_th:สมศักดิ์', time_utc: '08:00' }, 'C', 'Wikipedia TH source → C'],
    [{ source: 'wikidata:Q1', time_utc: null }, 'D', 'date only → D'],
    [{ source: 'wikidata:Q1', time_utc: '09:00', _evidence: { wikidata_precision: 13 } }, 'D', 'Wikidata prec=13 → D'],
    [{ _evidence: { official_doc: true }, source: 'manual', time_utc: '08:30' }, 'A', 'official doc → A'],
  ];

  let pass = 0, fail = 0;
  for (const [record, expected, desc] of tests) {
    const { grade, reason } = deriveAccuracy(record);
    const ok = grade === expected;
    console.log(`${ok ? '✅' : '❌'} ${desc}: expected ${expected}, got ${grade}${ok ? '' : ` — ${reason}`}`);
    ok ? pass++ : fail++;
  }
  console.log(`\n${pass}/${pass+fail} tests passed`);
  process.exit(fail > 0 ? 1 : 0);
}
