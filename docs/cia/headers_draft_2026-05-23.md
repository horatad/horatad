# GUARD-P0-D — Security Headers Gap Analysis & CSP Draft
**Date:** 2026-05-23 | **Risk:** R-11 (missing CSP / clickjacking)
**Inputs:** P0-C allowlist; existing `_headers`

---

## 1. Current state

`_headers` (GitHub Pages / Cloudflare Pages compatible):
```
/sw.js
  Cache-Control: no-store

/v3/*
  Cache-Control: no-store
```

**Missing headers** (per OWASP Secure Headers Project + Mozilla Observatory baseline):
- ❌ Content-Security-Policy (CSP)
- ❌ X-Frame-Options / `frame-ancestors`
- ❌ X-Content-Type-Options
- ❌ Referrer-Policy
- ❌ Permissions-Policy
- ❌ Strict-Transport-Security (HSTS) — GitHub Pages auto-sets HTTPS but no HSTS preload
- ❌ Cross-Origin-Opener-Policy
- ❌ Cross-Origin-Resource-Policy

**Observatory grade estimate:** F (no security headers) — pure functional config only.

---

## 2. Proposed `_headers` — Phase 1 P1-B (report-only first, enforce after 1 week)

```
# ── Global security headers (all paths) ──────────────────────
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=(), payment=(), usb=()
  X-Frame-Options: DENY
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Resource-Policy: same-origin

# ── CSP — report-only first week, then promote to enforce ────
/*
  Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://horatad.github.io https://promptpay.io; connect-src 'self' https://raw.githubusercontent.com https://horatad-ai.uchujaro5.workers.dev; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests

# ── Cache controls (existing — keep) ─────────────────────────
/sw.js
  Cache-Control: no-store
  Service-Worker-Allowed: /

/v3/*
  Cache-Control: no-store

# ── Long-cache for versioned assets ──────────────────────────
/style.css
  Cache-Control: public, max-age=3600

/script.js
  Cache-Control: public, max-age=3600

/horatad_*.png
  Cache-Control: public, max-age=86400, immutable

/manifest.json
  Cache-Control: public, max-age=3600
```

---

## 3. CSP decisions — rationale

| Directive | Value | Why |
|---|---|---|
| `default-src 'self'` | restrictive baseline | only same-origin by default |
| `script-src 'self'` | no external JS, no `'unsafe-inline'` | index.html has 1 inline `<script>` block (l.903-944, PIN unlock) — **need to extract or use nonce** |
| `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` | accept inline + Google Fonts CSS | index.html has critical inline `<style>` (l.27+) — too large for nonce-per-element refactor right now; accept `'unsafe-inline'` for style only |
| `font-src 'self' https://fonts.gstatic.com` | font files served by gstatic | implicit dep of Google Fonts CSS |
| `img-src 'self' data: https://horatad.github.io https://promptpay.io` | QR scanning produces data: URLs; promptpay.io for donation QR | `data:` is required by QR generator and PromptPay donate widget |
| `connect-src 'self' raw.githubusercontent.com horatad-ai.uchujaro5.workers.dev` | fetch destinations from P0-C | also will need horatad-auth Worker — add when domain confirmed |
| `frame-ancestors 'none'` | clickjacking defense | replaces X-Frame-Options (both fine to set) |
| `base-uri 'self'` | block `<base href>` injection | low-cost gate against DOM-based redirects |
| `form-action 'self'` | restrict form submit targets | no off-site forms currently |
| `object-src 'none'` | block legacy plugin embeds | trivial defense |
| `upgrade-insecure-requests` | auto-https for any stray http:// link | no observed http URLs but cheap to add |

**Known violations to watch in report-only week:**
1. Inline `<script>` in index.html (l.903-944, PIN flow) — will report. Fix options:
   - **Option A** (clean): extract to `auth-pin.js`, load with `<script src>` — proper CSP-compliant
   - **Option B** (quick): add `script-src 'self' 'nonce-XYZ'` + insert nonce on the inline tag — requires server-side template (GitHub Pages can't inject nonce → not viable)
   - **Option C** (escape hatch): add `'unsafe-inline'` to script-src — defeats half the CSP benefit
   - **Recommended: Option A** — clean refactor, ~30 min, persistent benefit
2. Inline `<style>` block (large) — accept `'unsafe-inline'` for style-src (low-risk for CSS)
3. Inline event handlers `onclick="..."` everywhere in script.js generated HTML — these are CSP-incompatible (require `'unsafe-inline'` for script). **This is a bigger issue.**

### 3.1 Inline `onclick` problem (deep-dive)

```
grep -cE 'onclick=' script.js   →  large count (memory items, sompong list, julian tank, etc.)
```

Adding strict CSP would break ALL these click handlers. Options:
- **Option D — Keep `'unsafe-inline'` for script-src + add `'unsafe-hashes'` for inline event handlers**: still better than no CSP. Still blocks `<script>` injection but allows onclick handlers (broader surface than nonce-only)
- **Option E — Refactor to delegated event listeners**: replace `onclick="_foo('${uid}')"` with `data-action="foo" data-uid="${uid}"` + single delegated listener. Effort: high (50+ sites). Defers Phase 2.

**Phase 1 recommendation:** **start with report-only mode** to enumerate exact violations. Then choose strict (Option E refactor — Phase 2) vs. pragmatic (Option D — Phase 1).

---

## 4. Permissions-Policy — denied features

```
geolocation=(), microphone=(), camera=(), payment=(), usb=()
```
App doesn't use any of these (no GPS, no voice input, no camera). Deny to defend against malicious script abuse.

**Not denied (intentionally allowed):**
- `clipboard-write` — used by share URL copy (`navigator.clipboard.writeText`)
- `web-share` — used by QR share
- `display-capture` — used by capture/canvas-to-blob flow

---

## 5. Phase 1 rollout plan (P1-B / P1-C)

| Step | Action | When |
|---|---|---|
| 1 | Add all non-CSP headers (X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Frame-Options, HSTS, COOP, CORP) | P1-B day 1 — zero breakage risk |
| 2 | Add `Content-Security-Policy-Report-Only` (with `'unsafe-inline'` for both script + style) | P1-B day 1 |
| 3 | Refactor inline `<script>` in index.html (PIN flow → auth-pin.js) | P1-B day 1 |
| 4 | Monitor for 1 week — collect any user-reported breakage | P1-B week 1 |
| 5 | Decide strict (Option E refactor) vs pragmatic (Option D `'unsafe-hashes'`) | Phase 2 |
| 6 | Promote `Content-Security-Policy-Report-Only` → `Content-Security-Policy` | Phase 2 |

**Risk if enforced too early:** Onclick handlers stop working → many UI features break silently. Report-only mode is mandatory before enforcement.

**Effort estimate:**
- Step 1-3: 1-2 hour session (P1-B)
- Step 4: passive observation
- Step 5-6: Phase 2 design decision + (if Option E) ~4-6 hour refactor session

---

## 6. Summary

| # | Finding | Severity | Action |
|---|---|---|---|
| H1 | Zero security headers currently set | high (R-11 P1) | P1-B add all non-CSP headers + CSP report-only |
| H2 | Inline `<script>` block in index.html | medium | P1-B refactor to external file |
| H3 | Pervasive inline `onclick=` handlers | medium | Phase 2 decide: refactor (clean) vs `'unsafe-hashes'` (pragmatic) |
| H4 | No HSTS / COOP / CORP / Referrer-Policy | low-medium | P1-B add (all cheap) |

**Verdict:** R-11 status = **fully scoped; draft ready for P1-B apply.**
