# GUARD-P0-G — horatad-auth Worker Hardening Audit (T-06)
**Date:** 2026-05-23 | **Risk:** R-17 (auth endpoint hardening)
**Status:** ⚠️ **PARTIAL — source code not in repo, audit blocked**

---

## 1. Scope

`horatad-auth` is a Cloudflare Worker that unlocks the V3 prediction tab. It's referenced in:
- `docs/HORATAD_MANUAL.md:494` — "V3 tab unlock ผ่าน CF Worker horatad-auth — ห้าม hardcode PIN ใน frontend"

The Worker is invoked by the client at:
- `index.html:925` — `fetch('/api/auth', {method: 'POST', body: JSON.stringify({pin: code})})`

---

## 2. Client-side observable behavior (the only thing audit-able from repo)

### 2.1 PIN input flow (`index.html:903-944`)
```js
function _v3NumPress(n){
  if(_v3Code.length>=6)return;     // PIN max length 6 digits
  _v3Code+=n;
  ...
  if(_v3Code.length===6){
    const code=_v3Code;
    setTimeout(function(){
      fetch('/api/auth',{method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({pin:code})})
        .then(function(r){return r.ok;})
        .catch(function(){return false;})
        .then(function(ok){
          if(ok){
            _v3DevClose();
            // ... unlock V3 tab UI
          }
          _v3Code='';            // ✅ clear PIN from memory on attempt
          _v3UpdateDisplay();
        });
    },150);                        // ⚠️ fixed 150ms delay before request — see § 4
  }
}
```

### 2.2 Observations
- PIN is numeric, exactly 6 digits (front-end constraint).
- PIN sent in clear over HTTPS (TLS-encrypted in transit) ✅.
- Response interpreted as binary success/fail (`r.ok` → boolean).
- No token returned to client, no session cookie observed in client code — the Worker presumably sets a cookie or the client just trusts the boolean.
- **Open question (cannot answer from client side):** Does the Worker set an auth cookie? If so, what flags (HttpOnly, Secure, SameSite)? Is the V3 tab actually gated on something server-validated or just client-side `classList.remove('hidden')`?

### 2.3 Client-side gating is COSMETIC ONLY
```js
var btn=document.getElementById('tab-btn-3');
if(btn)btn.classList.remove('hidden');
if(typeof switchTab==='function')switchTab(3);
```

The V3 tab unlock is purely **CSS class manipulation**. Anyone with DevTools open can:
1. Open Elements panel
2. Find `#tab-btn-3` (currently hidden)
3. Remove `hidden` class manually
4. Click the tab — it works without PIN

**This means the PIN is for non-technical users only.** If a user is technical enough to open DevTools, they can bypass the PIN trivially. This is **not a security control — it's UX friction**.

---

## 3. Worker source — NOT in repo

```
find . -type f \( -name "*.js" -o -name "*.mjs" -o -name "*.ts" \) | xargs grep -lE "(horatad-auth|verifyPin|PIN.*compare)"
(zero matches)

grep -nE "horatad-auth" workers/* docs/* index.html
(only docs/handoff references — no source file)
```

**Worker is deployed directly from CF dashboard or a separate (private?) repo.** GUARD cannot audit without the user exporting the Worker source.

---

## 4. Hardening checklist (cannot verify without source — for [ทดลองใช้] task)

When user exports `horatad-auth` Worker source, audit these items:

| Check | Why | What to look for |
|---|---|---|
| Constant-time PIN compare | prevent timing side-channel | use `crypto.subtle.timingSafeEqual` or string-compare every char (not early-exit) |
| Rate limit per IP | brute-force defense (1M combos for 6-digit PIN is feasible) | bucket per `request.headers.get('CF-Connecting-IP')` — max 5-10 attempts per 15 min |
| Permanent lockout / escalating delay | if rate limit alone is weak | exponential delay (1s → 5s → 30s → 5min) per IP |
| Constant-time response | prevent timing leak of PIN length / partial match | always `setTimeout(150)` server-side before respond (yes the client also has 150ms, but Worker should add its own) |
| Log abuse attempts | detection | CF Worker Analytics + log fail count per IP |
| Reject malformed payloads | defense in depth | strict JSON schema (pin = string of exactly 6 digits, no other fields) |
| No PIN in URL | basic hygiene | confirm `POST` body only, never query string |
| HMAC or signed cookie returned | so client can't fake "logged in" state | session token in HttpOnly Secure SameSite=Strict cookie |
| Server-validate every protected request | the actual gate | every `/api/v3/*` checks session cookie — not relying on client to send it |

---

## 5. Architectural concern — what is the V3 tab actually protecting?

The V3 tab calls Typhoon LLM via `horatad-ai` Worker. If the Worker:
- Has its own auth check (rejects requests without valid session cookie) → PIN IS effective at gating LLM cost
- Has NO auth check (accepts any Origin: horatad.com request) → PIN is **purely cosmetic** and anyone can call Typhoon directly via curl/Postman/another website by spoofing Origin header

**Critical question:** Does `horatad-ai` Worker verify the session set by `horatad-auth`? GUARD cannot determine without Worker source.

**Threat:** If anyone can call horatad-ai Worker → A2 (casual abuser) can drain Typhoon quota → DoS for legitimate users.

---

## 6. Trade-off recommendation

**If PIN is meant to gate LLM cost (most likely intent):**
- Must be server-validated (cookie/JWT) at horatad-ai Worker entry
- Without that, PIN is theater
- Refactor effort: ~1 session, requires both Worker sources

**If PIN is meant as soft friction only (UX, not security):**
- Current client-side gate is sufficient
- Document explicitly in HORATAD_MANUAL that this is not a security boundary
- Cost: 0

---

## 7. Summary & status

| # | Finding | Severity | Action |
|---|---|---|---|
| AU1 | Client-side gate is cosmetic — DevTools bypass trivial | medium-high IF intended as security | clarify intent with user |
| AU2 | Worker source not in repo | block | [ทดลองใช้] user export |
| AU3 | PIN sent over HTTPS, cleared from memory after attempt | — | ✅ client side OK |
| AU4 | No client-side rate limit (server is sole defense) | depends on Worker | review when Worker source obtained |
| AU5 | horatad-ai Worker authz check unknown | medium-high | review when source obtained |

**Verdict:** R-17 status = **partially audited (client side OK); blocked on Worker source export.**

**Recommended user action (Phase 1 [ทดลองใช้]):**
1. Export `horatad-auth` Worker source from CF dashboard → paste to repo at `workers/horatad_auth_source.js` (read-only reference, not deployed from repo)
2. Export `horatad-ai` Worker source similarly
3. GUARD re-audit in session GUARD v2 with sources

**Cross-link to HORATAD:** This audit produced clarifying questions for HORATAD owner about intent. Note added to HORATAD handoff to flag the cosmetic-gate observation.
