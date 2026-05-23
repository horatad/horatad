# Cross-Project Security/Performance Scan
**Date:** 2026-05-23 (GUARD session 3) | **Owner:** GUARD
**Method:** static read + grep on each project's source files
**Goal:** find security/perf items in NOK, BIBLE, REORG, JULIAN (already covered Phase 0) that should transfer to GUARD ownership

---

## 1. NOK (Voice Narration Engine — `v3/tts.js`)

### Surface inventory
| Surface | Status |
|---|---|
| External `fetch()` | 0 ✅ |
| `innerHTML` assignment | 0 ✅ |
| `eval` / `new Function` | 0 ✅ |
| `crypto.*` usage | 0 (no PIN, no token) |
| `localStorage` direct access | 0 ✅ |
| Permission API (`navigator.permissions`) | 0 ✅ |
| Cookie access | 0 ✅ |
| `getUserMedia` / `MediaRecorder` | 0 ✅ |
| External script load | 0 ✅ |

**Verdict:** NOK Phase 1 code is **security-clean**. No new surface introduced over what HORATAD already exposes.

### Finding N-01 — TTS text→OS engine privacy
**Severity:** low (informational)
**Risk:** R-19 candidate (Web Speech API data egress)

The `window.speechSynthesis.speak(utterance)` API hands the text to the OS-level TTS engine:
- **iOS Safari (Kanya voice):** on-device synthesis. Text never leaves the device. ✅
- **Android Chrome (Google TH voice):** typically on-device, but **some Android versions stream text to Google Cloud TTS** for higher-quality voices.
- **Desktop Chrome (Google US/UK voices):** voice list may include cloud-backed entries.

**Threat:** astrology prediction text sent to TTS could include user's birth chart context. If cloud-backed, that's external data exfiltration the user may not expect.

**Mitigation already in place:** `v3/tts.js:25-32` filters for `lang === 'th-TH'` voices first → biases toward Thai-specific local voices. iOS Kanya is local; Android Google TH is *usually* local (varies by device).

**Recommended actions:**
1. **Phase 1 (P1-D follow-up):** add a one-line note in HORATAD privacy disclosure: "ปุ่ม 🔊 ใช้เสียงพูดของเครื่องท่าน หากเครื่องใช้เสียง cloud ของ Google ข้อความอาจถูกส่งไปประมวลผลที่ Google" — friendly disclosure pattern
2. **Phase 2:** if/when Phase 2 NOK adds cloud TTS fallback (Google Cloud Neural2-Th per `handoffs/NOK_*`), make it explicit opt-in with clear UI
3. **Defer:** no Phase 1 code change required; risk is low for current user base

**Owner:** GUARD (privacy notice) + HORATAD (UI text) — cross-link handoff

### Phase 2 NOK roadmap items GUARD should track
NOK Phase 2-5 deferred work (per `handoffs/NOK_20260522_v1.md`):
- Phase 2: voice selection, rate slider, highlight onboundary, localStorage preference — **localStorage usage = new surface**, audit when implemented
- Phase 3: Google Cloud Neural2-Th fallback — **introduces external network call** (currently zero), CSP `connect-src` allowlist update needed
- Phase 4: Audio export MP3 share LINE/QR — **new export vector**, audit before launch (PII in audio file → metadata stripped?)
- Phase 5: Podcast auto-gen — out of GUARD scope until concrete

**Action:** None now. Track in GUARD risk register R-19 (TTS data egress) — open with status `informational`.

---

## 2. BIBLE (Prediction Wording Engine)

### Files audited
- `v3/engine.js` (kernel math, already covered Phase 0)
- `v3/interpretation.js` (rule matching + DSL + composer)
- `v3/typhoon.js` (LLM client)
- `v3/master_dict.js` (planet name dictionary)

### Surface inventory
| Surface | Result |
|---|---|
| External `fetch()` | `typhoon.js:464,513` → `TYPHOON_WORKER_URL` only (CF Worker proxy) ✅ |
| `innerHTML` | 0 in BIBLE modules ✅ |
| `eval` / `new Function` | 0 ✅ |
| Custom DSL evaluator | `evaluate_applies_when()` in `interpretation.js:351` — see § 2.1 below |

### 2.1 Finding B-01 — DSL evaluator audit
**Severity:** none (verified safe)

`v3/interpretation.js:351 evaluate_applies_when(expr, ...)` evaluates V2.4 mini-DSL strings from `kb.json` rule definitions:
```
grammar:
  "default" | "principle"  → always true
  <op> <cmp> <N>           where op ∈ {evil_count}, cmp ∈ {>=, <=, >, <, ==}, N ∈ digits
  <flag>                   where flag ∈ {tanu_strong, tanu_weak, no_friend_aspect, has_friend_aspect}
  unknown → true (forward-compat, don't filter)
```

**Implementation:**
- Regex match `^(evil_count)\s*(>=|<=|>|<|==)\s*(\d+)$` (strictly bounded grammar)
- No `eval`, no `Function` constructor, no dynamic property access on user-controlled keys
- All ops/flags mapped to hardcoded function calls
- Unknown expressions return `true` (forward-compat, no side effect)

**Verdict:** **SAFE.** No code execution from KB-controlled string. Even if `kb.json` were poisoned (which would require write access to repo), the worst that happens is unwanted rules apply or fail to apply.

### 2.2 Finding B-02 — Typhoon prompt construction (data flow audit)
**Severity:** low (informational)

`v3/typhoon.js:371 build_prompt(natalPayload, matchedRules, isQA)` constructs system + user prompts sent to Typhoon LLM via CF Worker.

**User data ingress:**
- `natalPayload.lagna.name` (Thai ราศี name, computed from chart)
- `natalPayload.overall.strength` (numeric/label, computed)
- `natalPayload.transit_context[].name/sign_name/house/aspect` (computed, Q&A mode only)
- `matchedRules[].p` (keyword strings — KB-controlled, not user-controlled)
- `matchedRules[].t` (tags — KB-controlled)

**User data NOT included in prompt:**
- ❌ User's display name (`name-1`, `name-2`)
- ❌ User's birthdate raw (`d`, `m`, `y_be`)
- ❌ User's birth time raw (`t`)
- ❌ User's province raw (`prov`)
- ❌ Free-text user input (none exists in app)

**Verdict:** **No prompt injection vector from user input.** Even if a user enters a malicious string in `name-1` field, it never reaches the LLM prompt. The prompt is built from:
1. Hardcoded system instruction (anti-hallucination guards in Thai)
2. Chart-computed values (numerical/categorical, not user text)
3. KB-controlled keywords (from `kb.json` ground truth)

**No action required.** ✅

### 2.3 Phase 2+ items to track
When BIBLE Phase 2+ adds:
- User free-text query field ("ถามดวง") → **new injection vector** — sanitize before reaching LLM
- Multi-turn conversation history → **prompt leak risk** — design audit needed
- KB editor in tools/ → **user write access to KB** — currently dev-only; audit when productized

### 2.4 Finding B-03 — Developer tool LLM keys in browser localStorage (T-09)

**Severity:** low-medium | **Risk:** R-13 (localStorage XSS) + R-18 (secret sprawl)
**Added:** 2026-05-23 (session 3 supplementary scan, parallel to v3 main work)

ตรวจ `tools/*.html` ที่ใช้ LLM API จาก browser พบ:

| File | Storage key | Provider | Risk |
|---|---|---|---|
| `tools/kb_extract.html:460` | `bible_groq_key` | Groq | localStorage key persists |
| `m0_hallucination_test.html:395` | `m0_key_g` | Gemini | + URL query string `?key=...` (l.208) |
| `m0_hallucination_test.html:396` | `m0_key_r` | Groq | localStorage |

**Risk analysis:**
- ⚠️ ถ้า tools/* page ใดมี XSS surface → key หลุดผ่าน localStorage shared (same origin `horatad.github.io`)
- ⚠️ `m0_hallucination_test.html` ส่ง key ใน URL query string → log ที่ Google server-side (สำหรับ debug)
- ✅ ทั้ง 2 ไฟล์เป็น **developer tool** — user count = 1 (developer คนเดียว)
- ✅ Free tier quota ที่ Groq/Gemini → abuse impact จำกัด

**Verdict:** **accept** ภายใต้เงื่อนไข:
1. ตรวจ tools/kb_extract.html + m0_hallucination_test.html ไม่มี user input render = XSS surface
2. แจ้งใน inventory `docs/SECRETS.md` § "Developer tool storage"
3. Rotation cycle SOP-05 ครอบคลุม (รอบ Mar/Jun/Sep/Dec)
4. ใช้ `localStorage.clear()` หรือ private window เมื่อใช้ device แชร์

**Cross-link:**
- เพิ่ม T-09 ใน GUARD handoff v3 PENDING list
- update `docs/SECRETS.md` § dev tools section ครั้งหน้า BIBLE session (owner BIBLE)
- ผูก rotation reminder ของ Groq/Gemini ไปกับ T-03 (CF token) ใน quarterly workflow

**Owner:** GUARD (audit + policy), BIBLE (operational use)

---

## 3. REORG (Docs Reorganization)

### Scope
Pure docs cleanup: delete 2 outdated files, rewrite HORATAD_MANUAL.md → HORATAD.md, update CHANGELOG, fix broken references.

### Security surface
**Zero.** No code change, no new file referenced by app, no secret or config modification.

### Verdict
**No GUARD ownership transfer needed.** REORG can proceed independently. After REORG completes, GUARD will re-verify `docs/SECRETS.md` references still resolve (current refs are stable; only HORATAD_MANUAL.md → HORATAD.md rename could affect).

**Action:** monitor REORG completion → run `grep -r "HORATAD_MANUAL" docs/ handoffs/` after their merge to ensure GUARD docs don't have stale references.

---

## 4. JULIAN (Empirical Astro Database) — incremental delta

Already audited in Phase 0 (`docs/cia/supply_chain_2026-05-23.md` § 3, T-04). This section covers post-Phase-0 changes.

### 4.1 Changes since Phase 0 (per current `PROJECT_STATUS.md`)
- Target bumped 50K → 100K records
- New `accuracy` field A/B/C/D/F added to schema
- 47,508/100,000 records (47.5%)
- Astrotheme enrichment lat/lng parser broken (1.24% time_utc match, lat/lng 0%)

### 4.2 Surface delta
| Item | Risk delta vs Phase 0 |
|---|---|
| Target 100K instead of 50K | none (workflow rate-limited; longer runtime, same volume per cycle) |
| `accuracy` field A-F | none (categorical enum, no XSS / no injection vector) |
| `julian_all.json` now larger | R-14 widens slightly (15MB → ~30MB at 100K projection); Phase 2 GUARD-P2-C still applies |

### 4.3 Action
**None now.** R-14 (julian_all.json size) Phase 2 work picks up the size delta naturally. The new accuracy field is a data classification system, not a user-input surface.

---

## 5. New risk register entries

| ID | Risk | P(likely) | Impact | Status |
|---|---|---|---|---|
| **R-19** | TTS text egress to cloud voice engine (NOK Phase 1 informational; Phase 3 cloud TTS will require audit) | low (current) | low | **informational** — monitor; explicit opt-in if Phase 3 lands |

(R-01..R-18 unchanged from prior register.)

---

## 6. Summary table

| Project | New findings | Transferred to GUARD? | Action |
|---|---|---|---|
| NOK | N-01 (TTS privacy) | Yes (R-19 informational) | Cross-link HORATAD privacy disclosure |
| BIBLE | B-01 (DSL safe ✅), B-02 (no prompt injection ✅) | No transfer needed | Document audit in this file |
| REORG | None | N/A | Monitor for stale doc refs after merge |
| JULIAN | accuracy field, 100K target | No new transfer (existing R-14 covers) | Phase 2 GUARD-P2-C covers julian_all.json size |

**Total new GUARD-owned items:** 1 (R-19 informational, no Phase 1 action required)
**Total findings that REDUCE risk (confirmed safe):** 2 (BIBLE DSL evaluator, BIBLE prompt construction)
