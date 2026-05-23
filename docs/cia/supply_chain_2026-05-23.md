# GUARD-P0-C — External Resource & Supply Chain Audit
**Date:** 2026-05-23 | **Risk:** R-10 (npm supply chain), R-16 (Wikidata compliance)

---

## 1. Runtime dependencies (browser side)

### 1.1 External resources loaded into main app

| Resource | URL | Method | Risk |
|---|---|---|---|
| Google Fonts CSS | `https://fonts.googleapis.com/css2?family=Sarabun...` | `<link rel=stylesheet>` | Trusted; CSS-only, no JS exec; cached by browser |
| Google Fonts files (implicit) | `fonts.gstatic.com/*` | loaded by above CSS | Trusted; binary fonts only |
| YouTube playlist link | `https://youtube.com/playlist?...` | `<a target=_blank rel=noopener>` | ✅ `rel=noopener` set — no opener attack |
| Google Forms link | `https://docs.google.com/forms/...` | `<a target=_blank rel=noopener>` | ✅ |
| PromptPay QR | `donate-qr.png` (local) | `<img>` | Local asset |
| External `<script>` tags | none | — | ✅ no external JS execution |
| External `<iframe>` | none | — | ✅ no embedded frame |

**Verdict:** Zero external JS executes on page load. Only CSS (Google Fonts) + outbound nav links. SRI not needed for CSS-only.

### 1.2 Runtime fetch destinations

| File:Line | URL | Purpose |
|---|---|---|
| `script.js:2094` | `https://raw.githubusercontent.com/horatad/horatad/main/data/julian_all.json` | JULIAN data import (on-demand) |
| `script.js:3623` | `${WORKER_URL}` (Typhoon CF Worker proxy) | LLM prediction call |
| `script.js:3956` | `./version.json?t=...` | App version check |
| `v3/typhoon.js:464,513` | `${TYPHOON_WORKER_URL}` | Same as 3623 (V3 tab) |
| `v3/v3tab.js:45` | `${KB_PATH}` (relative `v3/kb.json`) | KB rules load |
| `index.html:925` (PIN unlock) | `/api/auth` (relative → horatad-auth Worker) | V3 unlock (PIN auth) |

**Total external endpoints:**
1. `raw.githubusercontent.com` — own repo, GitHub CDN
2. `horatad-ai.uchujaro5.workers.dev` (Typhoon proxy)
3. `horatad-auth` Worker (relative `/api/auth`)
4. `fonts.googleapis.com` + `fonts.gstatic.com`

**CSP allowlist baseline (for P0-D draft):**
```
script-src 'self' (no external JS at all)
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com
img-src 'self' data: https://horatad.github.io
connect-src 'self' https://raw.githubusercontent.com https://horatad-ai.uchujaro5.workers.dev
frame-ancestors 'none'
```

---

## 2. Server-side / build dependencies

### 2.1 package.json
No `package.json` in repo root — **vanilla JS**, zero npm runtime deps. ✅ Minimum supply chain surface.

### 2.2 GitHub Actions dependencies (workflows)
| Action | Version | Pinned | Note |
|---|---|---|---|
| `actions/checkout` | @v4, @v5 (mixed) | major-tag | trusted publisher |
| `actions/setup-node` | @v4, @v5 (mixed) | major-tag | trusted |
| `actions/github-script` | @v8 | major-tag | trusted |

**Gap (R-10 hardening):** Action pinning uses major tag instead of SHA. If GitHub Actions publisher were compromised, malicious sub-version could be pulled. **Mitigation cost:** SHA-pin each action (~30 min). Trade-off: SHA pins require Dependabot to keep current → friction. Acceptable to defer to P3 since these are first-party (`actions/*`) actions with their own security baseline.

### 2.3 Worker / scraper npm deps
`workers/julian_scraper.mjs`, `workers/julian_astrotheme.mjs`, `workers/kb_extract_gha.mjs`, `workers/kb_extractor.mjs` — all use Node built-ins only (no `import` from npm packages). ✅

### 2.4 Python in workflow
`pip install python-docx` in `kb_extract.yml`. Single well-maintained package. Acceptable.

---

## 3. T-04 — Wikidata SPARQL compliance audit

**Source:** `workers/julian_scraper.mjs`, `workers/julian_config.mjs`

| Check | Status | Detail |
|---|---|---|
| User-Agent string with contact info | ✅ | `'JULIAN-bot/1.0 (horatad.com; empirical-astro-research)'` — Wikidata best practice compliant |
| Polite inter-query delay | ✅ | `WIKIDATA_DELAY_MS: 1500` ms |
| Adaptive delay on slow response | ✅ | `julian_scraper.mjs:105` |
| Respect `Retry-After` header on 429 | ✅ | `l.87-93` — `Math.max(retryAfterSec*1000, backoff)` |
| Exponential backoff on 429/503 | ✅ | `l.90` — `2000 * 2^attempt` (2s → 4s → 8s) |
| Accept header | ✅ | `'application/sparql-results+json'` |

**Verdict:** R-16 status = **✅ COMPLIANT with Wikidata Query Service ToS.** No changes needed. (Re-audit if `WIKIDATA_DELAY_MS` is ever reduced below 1000ms.)

---

## 4. Astrotheme scraping (`workers/julian_astrotheme.mjs`)

- User-Agent set ✅
- `DELAY_MS` between requests ✅

**Note:** Astrotheme is a third-party paid site; no public ToS-compliance audit possible from external. Current rate is gentle (well under 1 req/sec). If site ever returns Cloudflare challenge → JULIAN automation will fail gracefully (already handled). **Accepted.**

---

## 5. Summary

| # | Finding | Severity | Action |
|---|---|---|---|
| C1 | Zero external `<script>`; CSS-only external = no JS supply chain at runtime | — | ✅ excellent posture |
| C2 | No `package.json`; vanilla JS app | — | ✅ |
| C3 | GitHub Actions pinned by major tag (not SHA) | low | Defer to P3 (acceptable for `actions/*`) |
| C4 | Wikidata scrape — fully compliant | — | ✅ T-04 resolved |
| C5 | CSP allowlist draft ready for P0-D | — | feed to headers draft |
| C6 | Enable Dependabot once `package.json` exists or for GH Actions updates | low | P1 (no-code: GH settings) |

**Verdict:** R-10 status = **low active risk; enable Dependabot for GH Actions in P1 ([ทดลองใช้] user task).**
