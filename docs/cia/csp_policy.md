# CSP Policy — Phase 2 enforcement plan
**Owner:** GUARD | **Status:** draft (deployed report-only 2026-05-23, enforce decision Phase 2)
**Inputs:** `docs/cia/headers_draft_2026-05-23.md`, current `_headers`, onclick inventory below

---

## 1. Current state (Phase 1 — Report-Only)

Deployed in `_headers` (GUARD-P1-B, commit 669cf5f):
```
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: https://horatad.github.io https://promptpay.io;
  connect-src 'self' https://raw.githubusercontent.com https://horatad-ai.uchujaro5.workers.dev;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests
```

**Mode = Report-Only**: violations get logged to browser console but **not blocked**. No user-facing breakage possible. Observation window = 1 week minimum before enforcement decision.

---

## 2. Inline handler inventory — the elephant in the room

`'unsafe-inline'` in script-src is the gap that prevents enforcement of strict CSP. To go strict we must eliminate inline handlers and inline `<script>` blocks.

### 2.1 Counts (post-Phase 1)

| File | Inline `onclick=` count | Note |
|---|---|---|
| `index.html` | **165** | static handlers in HTML template (modals, dev numpad, donate buttons, transit unit popup, etc.) |
| `script.js` | **31** | dynamic handlers generated in innerHTML template strings (memory items, sompong, event slots, JULIAN, group, db1) |
| `v3/v3tab.js` | 0 | ✅ already CSP-strict-compatible |
| `v3/engine.js`, `interpretation.js`, `typhoon.js`, `tts.js`, `master_dict.js` | 0 | ✅ pure modules |
| **Total** | **196** | |

Inline `<script>` blocks: **0** (Phase 1 extracted PIN flow → `auth-pin.js`) ✅

### 2.2 Handler categorization (script.js — dynamically generated)

```
 11 × event.stopPropagation();... — wrappers around action handlers (button row prevent bubble)
  2 × julianSetL2
  2 × _setDB1Type (in JULIAN dropdown)
  1 × julianSetL1, transferQRToPrivate, copyJulianToPrivate
  1 × _sompongLoadByUid, _sompongDeleteByUid
  1 × _quickLoad
  1 × _openNatalPickerForGroup, _openGroupFromDB1, _openEventSlotsPopup
  1 × _groupLoadAsNatal1, _groupCreate, _groupAddMember
  1 × _groupDetailUid=...;_renderGroupBody()   (assignment + call inline)
  1 × _eventSlotLoadByUid, _eventSlotDeleteByUid
  1 × _db1Load, _db1Edit, _db1Delete, _db1TypeDelete
  1 × _renderGroupBody, _renderTransitMenu, etc.
```

Pattern: every handler calls a global `_*` function with literal UUID argument from rendered context. Easy mechanical refactor to `data-action="..." data-uid="..."` + single delegated listener.

### 2.3 Handler categorization (index.html — static)

```
 17 × _setTransitUnit (transit unit popup)
 12 × _numpadKey (number pad for date/time input)
 10 × _v3NumPress (V3 PIN unlock — now in auth-pin.js)
  5 × setDonateAmount (donate modal)
  4 × switchTab, cycleMemory, _setDB1Type
  3 × v3TogglePanel, v3SetMode, switchTank, openLngPad
  2 × toggleReportTransit, openMemory, closeTTSGuide, ...
  ... (many one-offs for modal close, btn-action, etc.)
```

---

## 3. Enforcement options

### Option D (pragmatic): keep `'unsafe-inline'` permanently
```
script-src 'self' 'unsafe-inline'
```
**Pros:** zero refactor; CSP still blocks external `<script>` injection.
**Cons:** an attacker who finds a stored XSS can still inject `<script>` tags ที่ execute (because `'unsafe-inline'` allows them). Defeats main CSP value for XSS.

### Option E (strict, recommended for Phase 2): refactor → delegated listeners
1. Replace every inline `onclick="_foo('${uid}')"` → `data-action="foo" data-uid="${uid}"`
2. Add single delegated listener at app root that reads `data-action`/`data-*` and dispatches to function table
3. CSP becomes `script-src 'self'` (no `'unsafe-inline'`)

**Effort estimate:** 4-6 hr split across 2 sessions (script.js dynamic handlers = 1 session, index.html static handlers = 1 session, testing = 30 min).

### Option F (hybrid, "first dose"): `'nonce-<random>'` + tighten parts
- Generate per-request nonce; allow nonce'd inline `<script>` and `<style>`
- **Blocker:** GitHub Pages serves static files; cannot inject per-request nonce in `_headers`. Would require a build step or move to Cloudflare Pages with Functions.
- **Verdict:** **not viable** for current GH Pages hosting.

### Option G (intermediate): `'unsafe-hashes'` for inline event handlers
- `script-src 'self' 'unsafe-hashes' 'sha256-...' 'sha256-...'`
- Permits exact-hash inline handlers, blocks arbitrary injection
- **Blocker:** Must enumerate every unique handler hash. With 196 handlers, list explodes; one new handler = CSP break = ship blocker.
- **Verdict:** maintenance burden too high.

---

## 4. Decision matrix

| Criteria | Option D (pragmatic) | Option E (strict refactor) |
|---|---|---|
| Initial effort | 0 hr | 4-6 hr (2 sessions) |
| Long-term maintenance | 0 (status quo) | low (add `data-action` for new handlers) |
| XSS injection defense | weak (allows inline) | strong (blocks all inline) |
| User-visible UX impact | 0 | 0 (semantically identical) |
| Test surface | none | manual click through every handler (~30 min QA) |
| Reversibility | easy | easy (revert commit) |
| Match to "Defense in Depth" principle | partial | full |

**Recommendation (after Phase 1 report-only data collected):**
- If 0 unexpected violations in report-only week → **Option E** (Phase 2 P2-A). The effort is bounded, value is permanent.
- If `'unsafe-inline'` is the ONLY violation and no new categories appear → still **Option E** — fixing that gap is the whole point.
- If exotic violations appear (e.g., third-party scripts injected by user extensions) → revisit allowlist; keep CSP report-only longer.

---

## 5. Phase 2 P2-A — execution plan

### 5.1 Refactor strategy (Option E)

**Step 1 — Add delegated listener (script.js, ~30 LOC):**
```js
// at app init (DOMContentLoaded):
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-action]');
  if (!t) return;
  const action = t.dataset.action;
  const fn = ACTION_TABLE[action];
  if (!fn) return;
  // optional: e.stopPropagation if data-stop-propagation
  if (t.dataset.stopPropagation) e.stopPropagation();
  fn(t.dataset, e);
});

const ACTION_TABLE = {
  'sompong-load': (d) => _sompongLoadByUid(d.uid),
  'sompong-delete': (d) => _sompongDeleteByUid(d.uid),
  'db1-load': (d) => _db1Load(d.uid),
  // ... map all 196 handlers
};
```

**Step 2 — Convert script.js innerHTML templates (~31 handler sites):**
- Replace `onclick="_foo('${uid}')"` → `data-action="foo" data-uid="${uid}"`
- For `event.stopPropagation();_foo(...)` → add `data-stop-propagation="1"`

**Step 3 — Convert index.html handlers (~165 handler sites):**
- Same pattern; mostly mechanical sed replacement

**Step 4 — Test:**
- Manual click-through of every interactive surface (memory modal, JULIAN tank, sompong list, event slots, db1, group, transit popup, dev numpad, donate, settings)
- Look for console errors
- Verify no handler is left unmapped (delegated listener silently ignores unknown `data-action`)

**Step 5 — Promote CSP:**
- Change `_headers` from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`
- Tighten `script-src` from `'self' 'unsafe-inline'` → `'self'`
- Keep `style-src 'self' 'unsafe-inline'` for inline `<style>` (low risk; refactor to external CSS in Phase 3 if desired)

### 5.2 Rollback procedure

If Option E breaks something after deploy:
1. Revert the refactor commit (single commit ideal)
2. CSP `_headers` already deployed under Phase 1 → no header rollback needed (Option D = revert to script-src `'self' 'unsafe-inline'`)
3. Manual smoke test passes → re-ship

---

## 6. Style + style-src

Current `_headers` keeps `'unsafe-inline'` for style-src to permit the ~50-line critical inline `<style>` block in `index.html <head>`.

Decision: **keep `'unsafe-inline'` for style-src indefinitely**. Reasoning:
- Inline critical CSS is a perf best practice (eliminates FOUC)
- CSS injection has very limited attack surface (no JS execution; only DOM exfiltration via `background:url(http://...)` which Permissions-Policy + connect-src can mitigate)
- Refactor cost (move 50 lines critical CSS → preloaded external) is high; benefit is marginal

If future audit upgrades this priority, refactor to:
1. Inline-CSS-as-base64-hash + `style-src 'self' 'sha256-...'` (similar to script Option G — same maintenance burden)
2. External critical CSS file + preload — `style-src 'self'` strict (costs FOUC ~50 ms first paint)

---

## 7. Connect-src maintenance — when adding new fetch destinations

Update the allowlist when these change:
- New CF Worker URL (e.g., `horatad-auth`, `horatad-bible`, etc.)
- New external data source (e.g., Wikidata if ever called from browser directly)
- New analytics endpoint (none currently)

**Checklist when modifying `_headers`:**
```
[ ] grep -nE "fetch\(" script.js v3/*.js → enumerate all destinations
[ ] cross-check connect-src allowlist
[ ] add new domain explicitly, never wildcard
[ ] verify in dev with CSP report-only on, click feature, watch console
[ ] commit with explanatory message
```

---

## 8. References
- `docs/cia/headers_draft_2026-05-23.md` — original draft (Phase 1)
- `docs/cia/xss_surface_audit_2026-05-23.md` — XSS findings (CSP is the backstop)
- `docs/cia/supply_chain_2026-05-23.md` — connect-src allowlist sources
- W3C CSP Level 3 spec: https://www.w3.org/TR/CSP3/
- MDN CSP guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- OWASP CSP Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
