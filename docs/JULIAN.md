# JULIAN — Empirical Astro Database

> **Scope owner**: JULIAN session  
> **Last updated**: 2026-05-27  
> **Records**: 66,912 people · accuracy A–F · 10 planets per person

---

## Table of Contents

1. [Overview](#overview)
2. [Data Files](#data-files)
3. [Workers (Scripts)](#workers-scripts)
4. [GitHub Actions Workflows](#github-actions-workflows)
5. [Tools (HTML)](#tools-html)
6. [Config & State Files](#config--state-files)
7. [Data Schemas](#data-schemas)
8. [Accuracy System](#accuracy-system)
9. [ML Layer (In Progress)](#ml-layer-in-progress)
10. [Pipeline Flow](#pipeline-flow)
11. [Implementation Status](#implementation-status)

---

## Overview

JULIAN collects birth data for real people → computes natal planet positions (via `engine.js`) →
stores accuracy-graded records → feeds **HORATAD app** and **BIBLE empirical rules**.

```
Wikidata / Astrotheme / Wikipedia TH / Manual
    ↓
data/julian_all.json   (main DB — 21 MB)
    ↓
julian_positions_by_jd.json  →  BIBLE (planet statistics)
v3/kb.json empirical_p       →  HORATAD (prediction rules)
GitHub Release julian-data   →  public download
```

---

## Data Files

### Primary

| File | Size | Description |
|---|---|---|
| `data/julian_all.json` | 21 MB | **Main DB** — array of person records, sorted by jd desc |
| `data/julian_thai_seed.json` | 2 KB | Manual seed — accuracy A/B/C records entered via UI |

### Derived (computed, re-generatable)

| File | Size | Description |
|---|---|---|
| `data/julian_natal_stats.json` | 6 KB | Aggregate quality counts per planet (for BIBLE stats) |
| `data/julian_positions_by_jd.json` | 921 KB | `{jd: [SU_sign, MO_sign, ...MR_sign]}` — 28K unique JDs, O(1) lookup |

### Raw Buckets (append-only, source-pure)

| File | Writer | Content |
|---|---|---|
| `data/julian_raw/wikidata.jsonl` | `julian_scraper.mjs` | Base records from Wikidata SPARQL |
| `data/julian_raw/astrotheme.jsonl` | `julian_astrotheme.mjs` | Birth time enrichment from astrotheme.com |
| `data/julian_raw/wikipedia_th.jsonl` | `julian_wiki_th.mjs` | Thai birth time enrichment |
| `data/julian_raw/wikidata_coord.jsonl` | `julian_wikidata_coord.mjs` | lat/lng from Wikidata P19+P625 |

### ML Layer (planned)

| File | Status | Content |
|---|---|---|
| `data/julian_events.jsonl` | 🔴 TODO | Life events per person (career, marriage, crisis…) |
| `data/julian_ml_features.jsonl` | 🔴 TODO | natal × transit interaction matrix per event |

---

## Workers (Scripts)

### Core Pipeline

#### `workers/julian_config.mjs`
- **Input**: none (static config)
- **Output**: exports `CONFIG` — list of SPARQL query series (ERA_SERIES, ASTROTHEME_SERIES, TH_SERIES)
- **Used by**: `julian_scraper.mjs`

#### `workers/julian_scraper.mjs`
- **Input**: `julian_config.mjs`, `julian_progress.json`, `julian_override.json`
- **Output**: temp JSONL file (path in `$GITHUB_OUTPUT`), updates `julian_progress.json`, `julian_report.json`
- **Used by**: `julian_sync.yml` (every 6h)
- **Note**: JD epoch = Jan 1 2000 = 730428 (matches `engine.js get_j()`)

#### `workers/julian_raw_writer.mjs`
- **Input**: record object + bucket name
- **Output**: appends to `data/julian_raw/<bucket>.jsonl`
- **Used by**: scraper, astrotheme, wiki_th, coord enrichers
- **Exports**: `appendRaw(bucket, record)`, `appendRawBatch(bucket, records)`

#### `workers/julian_merge.mjs`
- **Input**: `data/julian_raw/*.jsonl` + `data/julian_thai_seed.json`
- **Output**: `data/julian_all.json`
- **Priority**: manual seed > wikipedia_th > astrotheme > wikidata_coord > wikidata
- **Usage**: `node workers/julian_merge.mjs [--dry]`

### Enrichment

#### `workers/julian_astrotheme.mjs`
- **Input**: JSONL of records without `time_utc` (piped or file arg)
- **Output**: JSONL enriched → stdout (then merged back to `julian_all.json`)
- **Fetches**: `astrotheme.com/astrology/{name-slug}` for birth time
- **Accuracy output**: B grade (via `julian_evidence.mjs`)
- **Limit**: 200 records per run, 2.5s delay

#### `workers/julian_wiki_th.mjs`
- **Input**: JSONL of tier=1, country=TH records without `time_utc`
- **Output**: JSONL enriched → stdout
- **Fetches**: Wikidata sitelinks → Thai Wikipedia → parse "เวลาเกิด" pattern
- **Accuracy output**: C grade
- **Limit**: 200 records per run, 1.5s delay

#### `workers/julian_wikidata_coord.mjs`
- **Input**: JSONL of records without lat/lng
- **Output**: JSONL enriched → stdout
- **Fetches**: Wikidata P19 (birthplace) + P625 (coordinates)
- **Note**: Not yet wired into `julian_sync.yml`
- **Limit**: 500 per run, batch 50 QIDs per SPARQL call

### Accuracy System

#### `workers/julian_evidence.mjs`
- **Input**: record object (with optional `_evidence` field)
- **Output**: `{ grade: 'A'|'B'|'C'|'D'|'F', reason: string }`
- **Pure function** — deterministic, no I/O
- **Exports**: `deriveAccuracy(record)`, `gradeRecord(record)`, `checkPlaceholder(time_utc)`, `crossVerify(t1, t2)`
- **Self-test**: `node workers/julian_evidence.mjs --test`

#### `workers/julian_regrade.mjs`
- **Input**: `data/julian_all.json`
- **Output**: `data/julian_all.json` (accuracy field updated)
- **Idempotent** — safe to run any number of times
- **Usage**: `node workers/julian_regrade.mjs [--dry-run] [--verbose]`
- **Used by**: `julian_sync.yml`, `julian_backfill.yml`

#### `workers/julian_p3447_backfill.mjs`
- **Input**: `data/julian_all.json`, `workers/julian_p3447_checkpoint.json` (if `--resume`)
- **Output**: `data/julian_all.json` (source updated: `wikidata:Q*` → `astrotheme:{id}`), checkpoint file
- **Why**: fixes `seen_qids` bug — ERA_SERIES inserted QIDs before ASTROTHEME_SERIES ran → no astrotheme: sources stored
- **Usage**: `node workers/julian_p3447_backfill.mjs [--dry-run] [--limit N] [--time-budget N] [--resume]`
- **Time budget**: stops 30s before timeout, saves checkpoint → next run resumes

#### `workers/julian_backfill_accuracy.mjs`
- **Status**: 🟡 DEPRECATED — replaced by `julian_p3447_backfill.mjs` + `julian_regrade.mjs`

### Seed & Merge

#### `workers/julian_seed_merge.mjs`
- **Input**: `data/julian_thai_seed.json` + `data/julian_all.json`
- **Output**: `data/julian_all.json` (manual seed overrides scraped records)
- **Policy**: accuracy A/B/C from seed overrides D/F from scraped
- **Used by**: `julian_sync.yml`

### Planet Positions

#### `workers/julian_planet_positions.mjs`
- **Input**: `data/julian_all.json`, `v3/engine.js`
- **Output**:
  - `data/julian_natal_stats.json` — aggregate quality counts per planet
  - `data/julian_positions_by_jd.json` — `{jd: [SU,MO,MA,ME,JU,VE,SA,RA,KE,MR]}` sign indices
- **Usage**: `node workers/julian_planet_positions.mjs [--verbose]`
- **Regenerate when**: records reach 100K milestone

### Empirical Validation

#### `workers/julian_empirical.mjs`
- **Input**: `v3/kb.json` + Cloudflare D1 (via API)
- **Output**: `v3/kb.json` with updated `empirical_p` per rule
- **Schedule**: weekly (Sunday 03:00 UTC) via `julian_sync.yml`
- **Requires**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` secrets

### Export / Import

#### `workers/julian_keygen.mjs`
- **Input**: year range args (default 1700–2100)
- **Output**: CSV `jd,date_ce,su,mo,ma,me,ju,ve,sa,ra,ke,mr` → stdout
- **Usage**: `node workers/julian_keygen.mjs [start_year] [end_year] > output.csv`

#### `workers/julian_import.mjs`
- **Input**: CSV (master key) or JSONL (internet records)
- **Output**: SQL INSERT batches → stdout
- **Usage**: `node workers/julian_import.mjs <file.csv|file.jsonl> | wrangler d1 execute julian --file=/dev/stdin`

### ML Layer (planned)

#### `workers/julian_event_scraper.mjs` 🔴 TODO
- **Input**: `data/julian_all.json` (tier 1 records)
- **Fetches**: Wikidata P39 (position held), P166 (award), P26 (spouse), P570 (death) with dates
- **Output**: `data/julian_events.jsonl`
- **Schema**: `{person_key, event_jd, event_type, event_label, source, confidence, scraped_at}`

#### `workers/julian_ml_features.mjs` 🔴 TODO
- **Input**: `data/julian_events.jsonl` + `data/julian_positions_by_jd.json` + `v3/engine.js`
- **Output**: `data/julian_ml_features.jsonl`
- **Schema**: `{person_key, event_type, natal[10], transit[10], interaction_matrix[10][10][4]}`

#### `workers/julian_ml_correlate.mjs` 🔴 TODO
- **Input**: SHAP values from Python model + `v3/kb.json`
- **Output**: `v3/kb.json` with updated `empirical_p` per rule per event_type

---

## GitHub Actions Workflows

### `julian_sync.yml` — Every 6h

```
Trigger: cron 0 */6 * * * | workflow_dispatch (rate input)

Steps:
  1. Checkout + Node 24
  2. Apply rate override (dispatch only)
  3. julian_scraper.mjs → JSONL
  4. Commit progress: merge JSONL → julian_all.json + push
  5. Astrotheme enrichment (≤200 records) + push
  6. Wikipedia TH enrichment (≤200 tier1 TH) + push
  7. Regrade accuracy (julian_regrade.mjs) + push
  8. Manual seed merge (julian_seed_merge.mjs) + push
  9. Upload to GitHub Release (tag: julian-data)
  10. Disable workflow if target_reached or queries_exhausted
  11. Empirical validation (weekly only, Sunday 03:00)
  12. Summary → $GITHUB_STEP_SUMMARY
```

### `julian_backfill.yml` — Cron + Manual (checkpoint loop)

```
Trigger: cron 0 */6 * * * | workflow_dispatch (p3447_limit, regrade_only)

Steps:
  1. Checkout + Node 24
  2. Check if work remains (schedule: skip if no checkpoint)
  3. P3447 backfill --resume --time-budget 1800s
  4. Regrade accuracy
  5. Commit: data + checkpoint
  6. Disable schedule when complete
  7. Summary
```

---

## Tools (HTML)

All deployed at `https://horatad.github.io/horatad/tools/<file>`

| File | URL path | Purpose |
|---|---|---|
| `tools/julian_status.html` | `/tools/julian_status.html` | Dashboard: progress, accuracy distribution |
| `tools/julian_seed_input.html` | `/tools/julian_seed_input.html` | UI: enter manual A/B/C seed records |
| `tools/julian_flow.html` | `/tools/julian_flow.html` | Data flow diagrams (4 tabs) |
| `tools/julian_keygen.html` | `/tools/julian_keygen.html` | Generate master key CSV |
| `tools/julian_scraper.html` | `/tools/julian_scraper.html` | Browser-based scraper (legacy) |

---

## Config & State Files

| File | Content | Modified by |
|---|---|---|
| `workers/julian_config.mjs` | Query series list (SPARQL definitions) | Manual edit |
| `workers/julian_override.json` | `rate_multiplier` 0.25–1.0 | `julian_sync.yml` dispatch |
| `workers/julian_progress.json` | `{total, done_queries[]}` | `julian_scraper.mjs` |
| `workers/julian_report.json` | Last run summary | `julian_scraper.mjs` |
| `workers/julian_p3447_checkpoint.json` | `{batch_index, total_batches, saved_at}` | `julian_p3447_backfill.mjs` |
| `workers/julian_wrangler.toml` | Cloudflare D1 config | Manual |
| `workers/julian_setup.sql` | D1 DDL (CREATE TABLE) | Manual |
| `workers/julian_worker.js` | Cloudflare Worker — D1 query API | Manual |

---

## Data Schemas

### `data/julian_all.json` — Record

```json
{
  "jd": 730428,
  "name": "Barack Obama",
  "source": "astrotheme:Barack-Obama",
  "accuracy": "B",
  "time_utc": "13:35",
  "lat": 21.3069,
  "lng": -157.8583,
  "tier": 1,
  "country": "US",
  "confidence": 0.97
}
```

| Field | Type | Values |
|---|---|---|
| `jd` | int | Julian Day (epoch Jan 1 2000 = 730428) |
| `name` | string | English name (Wikidata label) |
| `source` | string | `wikidata:Q{id}`, `astrotheme:{slug}`, `wikipedia_th:{title}`, `manual` |
| `accuracy` | string | A/B/C/D/F (see accuracy system) |
| `time_utc` | string\|null | `"HH:MM"` or null |
| `lat`, `lng` | float\|null | birth coordinates |
| `tier` | int | 1=global notable, 2=regional, 3=local |
| `country` | string | ISO 3166-1 alpha-2 |
| `confidence` | float | 0.0–1.0 |

### `data/julian_events.jsonl` — Event Record (planned)

```json
{
  "person_key": "730428|Barack Obama",
  "event_jd": 731500,
  "event_type": "election_win",
  "event_label": "ชนะเลือกตั้งประธานาธิบดี",
  "source": "wikidata:Q76",
  "confidence": 0.95,
  "scraped_at": "2026-05-27T00:00:00Z"
}
```

### `data/julian_ml_features.jsonl` — ML Feature Record (planned)

```json
{
  "person_key": "730428|Barack Obama",
  "event_type": "election_win",
  "natal":   [4,8,1,3,9,6,11,7,1,2],
  "transit": [7,2,5,9,3,1,8,4,10,10],
  "natal_quality":   [1,3,-1,0,2,1,-1,0,0,0],
  "transit_quality": [0,1,0,2,3,0,-1,0,0,0],
  "interaction": [
    [0,180,90,30,120,0,45,60,90,30],
    "..."
  ]
}
```

---

## Accuracy System

Rules applied in priority order by `julian_evidence.mjs`:

| Priority | Grade | Condition |
|---|---|---|
| 1 | **A** | `_evidence.official_doc === true` |
| 2 | **F** | `time_utc` ∈ `{07:16, 07:17, 07:18}` (placeholder artifacts) |
| 3 | **F** | `source` is null or `"unknown"` |
| 4 | **B** | `source` starts with `astrotheme:` AND `time_utc` non-null non-placeholder |
| 5 | **B** | `_evidence.cross_verified === true` (2 sources agree ±30min) |
| 6 | **C** | `wikidata_precision >= 14` OR `source` starts with `wikipedia_th:` |
| 7 | **D** | fallthrough (date only or unverified time) |

**Upgrade path**:
- D → B: run `julian_p3447_backfill.mjs` → then `julian_astrotheme.mjs` fetches time
- D → C: Wikidata has precision=14 OR Thai Wikipedia page has birth time
- Any → A: set `_evidence.official_doc = true` (manual, rare)

**Key rule**: accuracy is **always computed**, never manually set. Edit `julian_evidence.mjs` rules then re-run `julian_regrade.mjs`.

---

## ML Layer (In Progress)

### Architecture

```
Input: 10×10×4 tensor  (natal planet × transit planet × [angle, aspect_strength, natal_quality, transit_quality])
    ↓
2D Conv 3×3 filters=32   → 3-planet interaction patterns
2D Conv 2×2 filters=64   → planet pair aspects
2D Conv 2×2 filters=128
    ↓
GlobalMaxPool2D
    ↓ (concat)
Aux: transit house (10,)  → house as domain label (secondary)
    ↓
Dense 64 → Dropout 0.3 → Dense N_event_types Softmax
```

### Key Design Decisions

- **No house in main input** — house describes domain (career/love), not magnitude; magnitude comes from natal×transit interaction quality
- **Interaction matrix is primary signal** — which natal planet is being hit by which transit planet
- **SHAP for rule extraction** — after training, SHAP values per cell → translate to TALS rules → update `empirical_p` in `kb.json`

### Event Taxonomy

```
career:   election_win | award | promotion | founded_company | released_work
life:     marriage | divorce | child_born | death | major_illness
crisis:   arrested | exiled | bankruptcy | public_scandal
peak:     highest_achievement | record_broken | viral_moment
```

### Implementation Phases

```
Phase 1 — Node.js (JULIAN scope)
  [ ] julian_event_scraper.mjs   Wikidata P39/P166/P26/P570 → julian_events.jsonl
  [ ] julian_ml_features.mjs     natal + transit matrix → julian_ml_features.jsonl

Phase 2 — Python (Colab or local, separate from this repo)
  [ ] train_julian_cnn.py        Keras 2D CNN training
  [ ] explain_julian_cnn.py      SHAP → TALS rule candidates

Phase 3 — Feedback (JULIAN + BIBLE scope)
  [ ] julian_ml_correlate.mjs    SHAP rules → kb.json empirical_p update
```

---

## Pipeline Flow

```
Every 6h (julian_sync.yml):
  Wikidata SPARQL
    → julian_scraper.mjs
    → data/julian_raw/wikidata.jsonl
    → merge → data/julian_all.json  ← commit
    → julian_astrotheme.mjs (≤200)
    → data/julian_raw/astrotheme.jsonl
    → merge → julian_all.json       ← commit
    → julian_wiki_th.mjs (≤200 TH tier1)
    → data/julian_raw/wikipedia_th.jsonl
    → merge → julian_all.json       ← commit
    → julian_regrade.mjs            ← commit (if changes)
    → julian_seed_merge.mjs         ← commit (if changes)
    → GitHub Release upload

One-time backfill (julian_backfill.yml, checkpoint loop):
  julian_p3447_backfill.mjs --resume --time-budget 1800
    → updates source wikidata:Q* → astrotheme:{id}
    → julian_regrade.mjs
    → commit + push
    → if partial → save checkpoint → next run in 6h
    → if complete → disable schedule

Manual / on-demand:
  julian_planet_positions.mjs  → julian_positions_by_jd.json (regen at 100K milestone)
  julian_keygen.mjs             → CSV → julian_import.mjs → SQL → CF D1
  julian_wikidata_coord.mjs     → lat/lng enrichment (not yet in sync workflow)
```

---

## Implementation Status

| Component | Status | Notes |
|---|---|---|
| Wikidata scraper | ✅ Running | 66,912 records, cron every 6h |
| Astrotheme enrichment | ✅ Running | B-grade birth times |
| Wikipedia TH enrichment | ✅ Running | C-grade Thai times |
| Evidence-based accuracy | ✅ Live | `julian_evidence.mjs` — deterministic rules |
| P3447 backfill | ✅ Active | Checkpoint loop, auto-disables when done |
| Coord enrichment | 🟡 Built, not wired | `julian_wikidata_coord.mjs` exists, not in sync workflow |
| Planet positions | ✅ Generated | `julian_positions_by_jd.json` — regen at 100K |
| Empirical validation | 🟡 Built | Needs Cloudflare D1 data to be meaningful |
| Coord enrichment | ✅ Wired | `julian_wikidata_coord.mjs` in `julian_sync.yml` (≤300/run) |
| ML event scraper | ✅ Built | `julian_event_scraper.mjs` + `julian_events.yml` workflow (checkpoint/resume) |
| ML features | ✅ Built | `julian_ml_features.mjs` → `julian_ml_features.jsonl` (sign-level vectors) |
| CNN model | 🔴 TODO | Phase 2 — Python/Colab (train on `julian_ml_features.jsonl`) |
| Rule feedback | 🔴 TODO | Phase 3 — SHAP → `julian_ml_correlate.mjs` → `kb.json` |
