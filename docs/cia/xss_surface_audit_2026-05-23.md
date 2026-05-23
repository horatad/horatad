# GUARD-P0-A — XSS Surface Audit
**Date:** 2026-05-23 | **Branch:** claude/guard-9KPRp | **Risk:** R-03 + R-13 (XSS via user input)
**Scope:** main app (script.js, v3/*.js, index.html, sw.js) + T-05 BIBLE validation cross-check
**Tools:** dev pages (extract_conditions.html, dictionary_builder_v3.html, fill_yaml_conditions.html, m0_*.html, tools/*.html) = separate scope (out of main app surface)

---

## 1. Dangerous primitives — verdict

| Primitive | script.js | v3/*.js | index.html | sw.js | tools/* |
|---|---|---|---|---|---|
| `eval()` | 0 | 0 | 0 | 0 | 0 |
| `new Function()` | 0 | 0 | 0 | 0 | 0 |
| `document.write()` | 0 | 0 | 0 | 0 | 0 |
| `setTimeout('string')` | 0 | 0 | 0 | 0 | 0 |
| `outerHTML =` | 0 | 0 | 0 | 0 | 0 |
| `innerHTML =` (assignment) | 26 | 4 (v3tab.js) | 0 | 0 | 29 |
| `insertAdjacentHTML` | 1 (l.2213) | 0 | 0 | 0 | 0 |

**Verdict:** No `eval`/`Function`/`document.write` anywhere. Risk surface = `innerHTML` assignments only.

---

## 2. Escape function inventory

| File | Helper | Definition | Coverage |
|---|---|---|---|
| script.js | `_escHtml(s)` | l.779-781 — escapes `& < > " '` (5-char standard) | used in 21/26 innerHTML sites |
| v3/v3tab.js | `_esc(s)` | l.199 — same 5-char escape | used in 4/4 innerHTML sites ✓ |

`_escHtml` is correct for HTML context. Not safe for attribute/JS/CSS contexts — but no observed misuse.

---

## 3. innerHTML sites — risk classification (script.js)

### 3.1 ✅ Static or escaped (low risk — 21 sites)
Sites that either render static strings or wrap user-data with `_escHtml`:
- l.396, 1180, 2066, 2151, 2159, 2165, 2194, 2215, 2489, 2681, 2738, 2818, 2885, 3027, 3105, 3123, 3705, 3736, 3740, plus most map-template sites
- Pattern: `items.push(\`...${_escHtml(m.name||'')}...\`)` then `list.innerHTML=items.join('')`

### 3.2 ⚠️ Trusted internal data sites (5 sites — low actual risk, hardening recommended)

`script.js:2688,2746,2895,3191` — chart-list rendering interpolates form-derived fields **without** escape:
```js
<div class="memory-meta">${s.d||''}/${s.m||''}/${s.y_be||''} · ${s.t||''}</div>
                          ^^^^^^^   ^^^^^^^   ^^^^^^^^^^   ^^^^^^^^
                          (date)   (month)   (BE year)    (HH:MM)
```
`s.prov` at l.2895/3191 also unescaped.

**Threat path:**
1. User opens malicious QR URL (`?h=H1|jd|<svg/onload=alert(1)>|lat|lng|ช|name`) — H1 unsigned format
2. `_parseH1Payload()` (l.3325-3347) accepts `dp[1]` as `t` without format validation
3. `_fillFormFromImport()` sets `<input type="time">` value bypassing HTML validation
4. User saves chart → stored in localStorage → next render → HTML escape skipped → XSS

**Mitigations already in place:**
- HTML `<input type=number/date/time>` rejects most direct user typing
- H2 (signed) format requires HMAC verify, blocks tampering (l.3331-3334)
- `name` field length-bounded to 20 chars + always _escHtml-wrapped
- `gender` mapped through dictionary
- `lat/lng` parseFloat + NaN check
- `jd` parseInt + NaN check
- Single-user, no cross-account threat (self-XSS only)

**Severity:** **low-medium** (vector exists via H1 unsigned QR; impact = localStorage exfil)
**Fix recommendation (Phase 1 patch):**
- Option A (minimal): wrap `s.d/s.m/s.y_be/s.t/s.prov` with `_escHtml()` everywhere in render path (4 lines)
- Option B (stricter): reject H1 unsigned QR — only accept H2 (force HMAC verify) — breaks any pre-H2 share links if they exist
- **Recommended: Option A** (defensive in-depth, no compat break, ~10 lines added)

### 3.3 ✅ insertAdjacentHTML (1 site, safe)
`script.js:2213` — items array built via _escHtml-wrapped templates above, joined and appended. Safe.

---

## 4. v3/v3tab.js — 4 sites, all ✓

| Line | Context | Verdict |
|---|---|---|
| 125 | `list.innerHTML=''` — clear container | ✅ static |
| 127 | static "no rules found" message | ✅ static |
| 141 | `row.innerHTML = ${_esc(rid)} ${polLabel} ${_esc(r.c||'')}...` | ✅ wrapped |
| 161 | `box.innerHTML = ${_esc(ruleIds.join('  '))} ${_esc(...)}` | ✅ wrapped |

---

## 5. T-05 — BIBLE input validation (cross-check)

**Finding:** `v3/engine.js` + `v3/interpretation.js` have **NO** `validate_inputs()` or `validate_matched()` functions. Search results:
```
grep -nE "validate_inputs|validate_matched|isNaN|Number.isNaN" v3/engine.js v3/interpretation.js
(zero matches)
```

**Impact analysis:**
- Engine entry: `get_data(d,m,y,hr,mn,lng)` (l.106) — accepts numbers, no NaN/range check
- If `pos[i] = NaN`, then `Math.trunc(NaN/1800) = NaN`, which propagates as NaN through aspect/house calculation
- `getHouse(pos,i,ascSign)` → `(NaN - ascSign + 12) % 12 + 1` = `NaN` — silent
- LLM-bound rule matching → may pass NaN-derived rule IDs → garbage in prompt
- Not a security XSS vector but **integrity** (silent corruption) + **availability** (potential UI crash if NaN crosses to render path)

**Recommendation for BIBLE (note for handoff to BIBLE owner):**
```js
// at top of get_data() / engine entry:
if (!Number.isFinite(d) || d < 1 || d > 31) throw new Error('bad day');
if (!Number.isFinite(m) || m < 1 || m > 12) throw new Error('bad month');
if (!Number.isFinite(y_ce)) throw new Error('bad year');
// + similar for hr/mn/lng
```
Cross-link this in BIBLE handoff → not GUARD's responsibility to implement, just to flag.

---

## 6. Tools directory (separate scope, dev pages)

29 `innerHTML` sites in `tools/*.html` + dev pages (extract_conditions/dictionary_builder/etc.).

**Verdict:** Out of main app surface. These are dev/admin pages, not linked from main app navigation. They DO ship to GitHub Pages so users could hit them by direct URL, but:
- No external input vectors (data comes from user-pasted text, file upload)
- Self-XSS only (single-user dev usage)
- Audit deferred to Phase 2 if/when tools become user-facing

**Note for future:** If any tool becomes linked from main app, re-audit under main scope.

---

## 7. Summary & recommendations

| # | Finding | Severity | Action |
|---|---|---|---|
| F1 | 5 sites interpolate `d/m/y_be/t/prov` raw via QR-import path | low-medium | **Phase 1 patch** (Option A — wrap _escHtml) |
| F2 | T-05: BIBLE engine missing NaN/range validation | medium (integrity) | **Hand off to BIBLE owner** + cross-link |
| F3 | tools/* innerHTML usage | low (out of main scope) | Defer Phase 2 |
| F4 | No `eval` / `new Function` / `document.write` anywhere | — | ✅ excellent baseline |
| F5 | Escape helpers (_escHtml, _esc) consistent and correct | — | ✅ |

**Phase 1 patch effort:** ~10 lines, 1 commit, no UI/UX change. Block CSP `strict-dynamic` adoption ใน P1-B can proceed without F1 fix since CSP would catch it too — but defense in depth: fix both.

**Phase 0 verdict:** **R-03 status = open with known minor surface, ready for Phase 1 patch + CSP enforcement.**
