# SECRETS — Horatad Ecosystem Inventory
**Owner:** GUARD (cross-project) | **Last updated:** 2026-05-23 (GUARD-P0-B + T-07)
**Source-of-truth:** this file | **Update on:** every new secret introduced / rotated / revoked

> ⚠️ This file contains NO secret values — only **names**, **locations**, **owners**, and **rotation schedule**.
> Actual values live in GitHub Settings → Secrets and Cloudflare Worker env. Never paste a value here.

---

## 1. Hard rules (apply to all secrets)

1. **Never** commit a secret value to git. CI gitleaks (Phase 1 GUARD-P1-A) will block.
2. **Never** print a secret in CI logs (use env var, not command-line arg).
3. **Never** store a secret in `localStorage`, `sessionStorage`, or any client-visible location.
4. **Never** include a secret in a URL query string (use POST body or header).
5. **Always** rotate quarterly (March / June / September / December) — see § 5 rotation schedule.
6. **Always** update this file (`last_rotated`) on rotation, same commit.

---

## 2. Active secret inventory

| Name | Where stored | Used by | Purpose | Last rotated | Next due |
|---|---|---|---|---|---|
| `GITHUB_TOKEN` | GitHub Actions (auto-provided) | every workflow | git operations (push, release, issue) | rotated per-job by GitHub | n/a (auto) |
| `CF_API_TOKEN` | GitHub Actions Secret | `julian_sync.yml` (Empirical validation step) | Cloudflare API ops (read CF account state) | **unknown — needs verify** | next quarter |
| `CF_ACCOUNT_ID` | GitHub Actions Secret | `julian_sync.yml` | CF account identifier (semi-secret) | n/a (identifier, not credential) | n/a |
| `GROQ_API_KEY` | GitHub Actions Secret | `kb_extract.yml`, `kb_extract_test.yml` | Groq LLM API (BIBLE extraction) | **unknown — needs verify** | next quarter |
| `TYPHOON_SERVER_KEY` | sandbox env + CF Worker `horatad-ai` env | `horatad-ai` Worker (Typhoon proxy) | Typhoon API auth | **unknown — needs verify** | next quarter |
| Horatad-auth PIN salt/secret | CF Worker `horatad-auth` env | Worker (PIN verify) | PIN hashing if stored hashed | **unknown — out-of-repo Worker** | review on Worker audit (T-06) |

---

## 3. Secret usage by file (audit trail)

### 3.1 GitHub Actions workflows
| Workflow | Secret(s) used | Pattern |
|---|---|---|
| `.github/workflows/ci.yml` | none | — |
| `.github/workflows/handoff_lint.yml` | `GITHUB_TOKEN` (implicit via checkout) | — |
| `.github/workflows/julian_sync.yml` | `GITHUB_TOKEN` (checkout, gh CLI), `CF_API_TOKEN`, `CF_ACCOUNT_ID` (Empirical validation step env) | env vars only ✅ |
| `.github/workflows/kb_extract.yml` | `GROQ_API_KEY` | env var on `node workers/kb_extract_gha.mjs` step ✅ |
| `.github/workflows/kb_extract_test.yml` | `GROQ_API_KEY` | curl `-H "Authorization: Bearer $GROQ_API_KEY"` ✅ |
| `.github/workflows/main_sync_check.yml` | `GITHUB_TOKEN` (issues:write) | — |
| `.github/workflows/stale_branch_cleanup.yml` | `GITHUB_TOKEN` (contents:write, issues:write) | — |

### 3.2 Workers (Node scripts, deployed or local)
| File | Secret(s) expected from env | Notes |
|---|---|---|
| `workers/kb_extractor.mjs` | `ANTHROPIC_API_KEY`, `TYPHOON_API_KEY` | ⚠️ violates Max-Plan-Only policy → must NOT be run in CI. Marked deprecated. |
| `workers/kb_extract_gha.mjs` | `GROQ_API_KEY`, `TYPHOON_API_KEY` (optional via CF Worker proxy) | used by `kb_extract.yml` ✅ |
| `workers/julian_scraper.mjs` | none — public Wikidata SPARQL | ✅ |
| `workers/julian_astrotheme.mjs` | none — public scrape | ✅ |
| `workers/julian_empirical.mjs` | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` (env at runtime) | ✅ |

### 3.3 Cloudflare Workers (deployed via CF dashboard, source not all in repo)
| Worker | Env vars expected | Source in repo |
|---|---|---|
| `horatad-ai` (Typhoon proxy) | `TYPHOON_SERVER_KEY` | ❌ not in repo (request export — see Worker audit) |
| `horatad-auth` (PIN verify) | PIN-related secrets | ❌ not in repo (see T-06 / GUARD-P0-G) |
| `julian_worker.js` | (TBD when deployed) | ✅ `workers/julian_worker.js` (planned, not deployed) |

---

## 4. Sandbox runtime keys (Claude Code on the web)

Verified 2026-05-22 (per CLAUDE.md):
| Key | Present in sandbox env | Reachable from sandbox |
|---|---|---|
| `TYPHOON_SERVER_KEY` | ✅ yes | ❌ (Typhoon IP allowlist blocks sandbox IPs) |
| `GROQ_API_KEY` | ❌ no | ✅ if added (no IP restriction) |
| `CF_API_TOKEN` | ❌ no | reachable in CI only |
| `ANTHROPIC_API_KEY` | ❌ no (forbidden by CLAUDE.md "Max Plan Only" policy) | ❌ |

**Rule:** Adding new keys to sandbox env requires user action via project settings.

---

## 5. Rotation schedule (Phase 1 — GUARD-P1-F automation)

| Key | Frequency | Owner | Procedure |
|---|---|---|---|
| `CF_API_TOKEN` | quarterly | user (CF dashboard → API Tokens) | 1) CF dashboard → My Profile → API Tokens → Roll. 2) Update GitHub Secret `CF_API_TOKEN`. 3) Update this file `last_rotated`. 4) Trigger workflow re-run to verify. |
| `GROQ_API_KEY` | quarterly | user (Groq console) | 1) Groq console → New key. 2) Update GH Secret. 3) Verify with `kb_extract_test.yml`. 4) Revoke old key. |
| `TYPHOON_SERVER_KEY` | quarterly | user (Typhoon console) | 1) Typhoon console → New key. 2) Update CF Worker `horatad-ai` env. 3) Test via horatad.com → V3 → Predict. 4) Revoke old. |
| `horatad-auth` PIN secret | yearly OR on compromise | user (CF Worker env) | 1) CF Worker env → update. 2) Test PIN unlock flow. |
| `GITHUB_TOKEN` | auto (per workflow) | GitHub | n/a |

**Automation gap (P1-F):** Quarterly reminder. **Plan:** GH issue auto-created by workflow on 1st of Mar/Jun/Sep/Dec with the rotation checklist.

---

## 6. Incident response (compromise / leak)

If a secret is suspected to be exposed:
1. **Rotate immediately** (don't wait for quarterly) — invalidate the leaked key first
2. Update this file (`last_rotated` + note in §7 incident log)
3. Audit access logs:
   - GitHub: Settings → Security → Audit log (filter by event = secret_use)
   - Cloudflare: Dashboard → Audit Log
   - Typhoon/Groq: console audit log if available
4. Check git history for accidental commit:
   ```
   git log --all -p | grep -iE "<leaked-key-prefix>"
   ```
5. If found in history: contact GitHub support to scrub (paid feature) OR rotate-and-accept exposure of revoked key
6. Update SOP-02 in `docs/GUARD_MISSION.md` if procedure changes

---

## 7. Incident log (append-only)

(None to date.)

---

## 8. Per-developer setup (local CLI sessions only — not for sandbox)

If running Node scripts that need secrets locally:
```bash
# DO NOT commit this file
cp .env.example .env
# Edit .env to add real values:
#   CF_API_TOKEN=...
#   GROQ_API_KEY=...
#   TYPHOON_SERVER_KEY=...
```

**Required (when P1-A lands):** `.env` will be in `.gitignore`. A pre-commit hook (optional) can run `gitleaks` locally to prevent accidental staging.

---

## 9. References
- `docs/cia/secret_audit_2026-05-23.md` — git history audit (zero leaks confirmed)
- `docs/cia/gha_audit_2026-05-23.md` — workflow-level secret handling
- `docs/GUARD_MISSION.md` § SOP-02 (incident response)
- T-03 (JULIAN) — CF API token rotation context
- T-07 (cross-cutting) — original sprawl finding
