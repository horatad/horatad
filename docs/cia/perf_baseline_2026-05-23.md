# GUARD-P0-E — Performance Baseline & Bundle Audit
**Date:** 2026-05-23 | **Risk:** R-08 (LCP > 4s mobile), R-14 (julian_all.json 15MB)
**Method:** static file size + render-blocking inventory. **Lighthouse run = [ทดลองใช้] (sandbox no browser)**

---

## 1. Bundle size baseline

### 1.1 Initial-load assets (CORE_ASSETS in sw.js)

| File | Size | Min/Compressed est. | Notes |
|---|---|---|---|
| index.html | 68 KB | ~15 KB gzip | includes large critical inline CSS |
| script.js | **392 KB** | ~95 KB gzip | ⚠️ largest single asset |
| style.css | 40 KB | ~10 KB gzip | |
| v3/v3tab.js | 17 KB | ~5 KB gzip | |
| v3/engine.js | 9.4 KB | ~3 KB gzip | |
| v3/interpretation.js | 19 KB | ~6 KB gzip | |
| v3/typhoon.js | 24 KB | ~7 KB gzip | |
| v3/tts.js | 4.8 KB | ~2 KB gzip | |
| v3/kb.json | **336 KB** | ~70 KB gzip | loaded by v3/v3tab.js on tab open |
| qrcode.min.js | 20 KB | ~7 KB gzip | |
| manifest.json | 4 KB | ~1 KB gzip | |
| Icons (5 sizes) | ~1.3 MB total | — | only 128px loaded initial |
| **Total initial transfer (gzip est.)** | **~150-200 KB** | | excludes kb.json (lazy) and large icons |

### 1.2 On-demand assets (NOT initial load)

| File | Size | Loaded when |
|---|---|---|
| **`data/julian_all.json`** | **15 MB** | when user opens JULIAN tank — fetched from `raw.githubusercontent.com` |
| `v3/kb_master.json` | 335 KB | not currently loaded by main app (dev artifact?) |
| `v3/kb_skeletons.json` | 65 KB | not currently loaded |
| `v3/kb_v24-3.json` | 101 KB | not currently loaded |
| `v3/kb_yaml_import.json` | 269 KB | not currently loaded |
| `v3/master_dict.js` | 32 KB | TODO verify (probably loaded by v3tab) |
| Root: `kb_yaml_filled_*.json` | 316 KB × 2 | dev artifacts, leaking into asset surface? |
| `dictionary_builder_v3.html` | 253 KB | dev tool, on-demand |
| `extract_conditions.html` | 167 KB | dev tool, on-demand |

**Observation:** Some `kb_*.json` files in repo root and `v3/` are **dev artifacts** that ship to GitHub Pages despite not being used by the main app. They consume CDN bandwidth (not load time) and add to repo bloat.

**Recommendation:** Move dev artifacts to `dev_assets/` and add `.cfignore` or just keep — public CDN cost is negligible, but it muddies the surface. **Defer** to REORG project session.

---

## 2. Render-blocking inventory (index.html `<head>`)

| Resource | Type | Blocking |
|---|---|---|
| `<link rel=manifest>` | preload hint | non-blocking |
| `<link rel=icon>` | image | non-blocking |
| `<link rel=apple-touch-icon>` | image | non-blocking |
| `<link rel=preconnect href=fonts.googleapis.com>` | dns/tcp warmup | non-blocking |
| **`<link href=fonts.googleapis.com/css2?...>`** | external CSS | **🔴 render-blocking** |
| **`<link rel=stylesheet href=style.css>`** | same-origin CSS | **🔴 render-blocking** |
| Critical inline `<style>` (large block) | inline CSS | parser blocks until end of style tag |
| `<script src=script.js>` | end of body | non-blocking ✅ |
| `<script type=module src=v3/v3tab.js>` | end of body | non-blocking ✅ |
| Inline `<script>` for PIN flow | end of body | non-blocking ✅ |

**Issues:**
1. Google Fonts CSS — single round-trip to external CDN before first paint. **Mitigation already in place:** `preconnect`. Could add `font-display: swap` via `&display=swap` (already in URL ✅) so text shows in fallback font during load.
2. Inline critical `<style>` is large but appropriate for inlining critical CSS (eliminates FOUC). Trade-off: increases initial HTML size by ~10 KB but avoids extra round-trip.
3. `style.css` is single same-origin file (cached after first load) ✅.

---

## 3. JavaScript parse cost (mobile estimate)

| Metric | Value | Note |
|---|---|---|
| `script.js` size | 392 KB raw / ~95 KB gzip | |
| 3993 lines | | |
| Estimated parse time mid-tier mobile (Moto G Power equiv.) | ~150-250 ms | based on 1 MB/s parse rate for V8 |
| Estimated INP impact on first interaction | +50-100 ms | first event runs after compile + first execution |

**Recommendation (Phase 2):**
- Code-split `script.js` — V3 tab logic is already in `v3/*.js`, but main script still bundles `tools/*` references and admin paths
- Lazy-load JULIAN tank logic (only init when user clicks 'โหลด JULIAN')
- Defer Typhoon module init (v3/typhoon.js) until V3 tab opens

---

## 4. Service Worker cache analysis

`sw.js` — version `horatad-v3.3.19`:
- **CORE_ASSETS** = 18 files cached on install
- Strategy: cache-first for same-origin, network-only for cross-origin
- `version.json` bypassed (correct — version check needs fresh)
- Fetch handler errors → fallback to `./index.html` (SPA-style)

**Verdict:** ✅ Sane cache strategy. `no-store` on `/sw.js` and `/v3/*` prevents stale-SW issues.

**Gap:** `v3/kb.json` is in CORE_ASSETS — 336 KB cached on install. If user never opens V3 tab, that's wasted cache. Trade-off: deferred fetch on V3 open would add latency to first prediction. **Accept current.**

---

## 5. PWA checklist (Lighthouse PWA audit equivalent)

| Item | Status |
|---|---|
| Installable (manifest + start_url) | ✅ |
| Service Worker registered + caching | ✅ |
| Works offline (cache-first) | ✅ |
| HTTPS only (GH Pages auto) | ✅ |
| Theme color in `<meta>` | ✅ (`#b8860b`) |
| Apple touch icon (180×180) | ✅ |
| **Maskable icon variant** | ❌ — all icons `purpose: "any"` only |
| Viewport meta | ✅ |
| Splash screen | ✅ auto from manifest |
| Lang attribute | ✅ `lang="th"` in html + manifest |
| `<title>` + meta description | ✅ |
| og:image / Twitter card | ✅ |

**Gap:** No maskable icon — Android Adaptive Icon shape may crop important visuals. **Fix (Phase 1 P1-C):** generate a 512×512 maskable variant with safe-zone padding + add to manifest with `purpose: "maskable"`.

---

## 6. Specific perf risk register update

| ID | Description | Severity | Action |
|---|---|---|---|
| R-08 | LCP > 2.5s mobile | unknown — need Lighthouse | [ทดลองใช้] user runs Lighthouse |
| R-14 | julian_all.json 15MB on JULIAN tank open | high (one-time per user) | Defer Phase 2 — consider Release-asset-only + lazy shards |
| **NEW** | `script.js` 392 KB single file | medium | Phase 2 code-split |
| **NEW** | Repo bloat from auto-commit (15MB/6hr) | medium (repo health) | Cross-link JULIAN — consider GH Release-only |
| **NEW** | No maskable icon | low | P1-C add variant |

---

## 7. Lighthouse [ทดลองใช้] task spec

When user runs Lighthouse:
- **URL:** https://horatad.com (NOT horatad.github.io for main app per CLAUDE.md)
- **Profiles:** Mobile (throttled) + Desktop
- **Categories:** Performance, PWA (required); Accessibility, Best Practices, SEO (bonus)
- **Save:** report JSON as `docs/cia/lighthouse_<profile>_2026-05-XX.json`
- **Compare against baseline:** none yet (this IS the baseline)
- **Specific watchlist:**
  - LCP < 2.5s mobile (target)
  - INP after first interaction < 200ms
  - PWA score ≥ 90
  - "Avoid enormous network payloads" — will flag `data/julian_all.json` if it's loaded (it shouldn't be on initial load)

---

## 8. Summary

| # | Finding | Severity | Action |
|---|---|---|---|
| P1 | Bundle baseline established | — | ✅ documented |
| P2 | `script.js` 392 KB single bundle | medium | Phase 2 code-split |
| P3 | `data/julian_all.json` 15 MB on-demand only ✅ (not initial) | — | ✅ already correct |
| P4 | Google Fonts is sole render-blocking external CSS | low | accept (preconnect + display=swap already set) |
| P5 | No maskable icon for Android Adaptive | low | P1-C add |
| P6 | Several `kb_*.json` dev artifacts in repo | low | REORG project session |
| P7 | Lighthouse baseline = blocked on user | — | [ทดลองใช้] runs |
| P8 | Repo bloat from JULIAN auto-commit | medium (long-term) | cross-link to JULIAN — consider GH Release-only |

**Verdict:** R-08 status = **measure deferred to user; static budget audit is healthy modulo `script.js` size (Phase 2 split).**
