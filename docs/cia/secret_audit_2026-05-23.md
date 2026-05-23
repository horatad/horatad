# GUARD-P0-B — Secret Leak History Audit
**Date:** 2026-05-23 | **Risk:** R-01 (secret leak in commit), R-18 (secret sprawl)
**Method:** `git log --all -p` grep + tree scan + .gitignore review

---

## 1. Git history — secrets

**Command:**
```
git log --all -p 2>/dev/null | grep -iE "(api[_-]?key|secret|token|password|bearer|authorization)"
```

**Result:** Zero confirmed secret values in commit history.

All matches are **meta references** (e.g., handoff docs mentioning `CF_API_TOKEN` as a secret name, charter strings like "Secret hygiene baseline", git diff churn of `CIA → GUARD` rename). No `sk-*`, `pk-*`, `Bearer xxx...`, or actual key-shaped strings.

**Verdict:** ✅ Clean history. R-01 status = no leaked credentials in git.

---

## 2. Current tree — secrets

**Pattern search for key-shaped strings:**
```
grep -rnE "(sk-[A-Za-z0-9]{16,}|pk-[A-Za-z0-9]{16,}|Bearer\s+[A-Za-z0-9_.-]{20,})"
(zero matches)
```

**Credential files in repo:**
```
find . -type f \( -name "*.env*" -o -name "*.key" -o -name "*credential*" -o -name "*secret*" \)
(none)
```

**Files with high-entropy long base64-ish strings (possible secrets):**
- `qrcode.min.js` — minified code (false positive)

**Verdict:** ✅ Clean tree. No accidentally-committed credentials.

---

## 3. .gitignore gap analysis

**Current `.gitignore`:**
```
node_modules/
```

**Gap:** Only one entry. Common credential-bearing files have no ignore rule. If a developer (or Claude) ever drops a `.env`, `.env.local`, `*.key`, `*.pem` into the repo, `git add` would stage them without warning.

**Recommended additions (Phase 1 — GUARD-P1-A bundles with gitleaks):**
```
# Credentials & local config
.env
.env.*
*.local
*.key
*.pem
*.p12
*.pfx
.npmrc
credentials.json
service-account*.json

# OS / editor
.DS_Store
Thumbs.db
*.swp
.vscode/settings.json
.idea/

# Build/temp output
dist/
build/
.cache/
coverage/
.tmp/
```

**Effort:** 1 commit, ~20 lines, zero risk of breaking anything.

---

## 4. Secret inventory (T-07) — see `docs/SECRETS.md`

This audit produced the inventory document `docs/SECRETS.md` covering all secrets across:
- GitHub Actions secrets (CF_API_TOKEN, CF_ACCOUNT_ID, GROQ_API_KEY, GITHUB_TOKEN)
- Cloudflare Worker env vars (TYPHOON_SERVER_KEY, etc.)
- Local sandbox env (TYPHOON_SERVER_KEY)
- Per-file usage map

---

## 5. Recommendations

| # | Recommendation | Phase | Effort |
|---|---|---|---|
| S1 | Add gitleaks job to `.github/workflows/ci.yml` | P1-A | 30 min |
| S2 | Expand `.gitignore` with credential patterns | P1-A | 5 min |
| S3 | Add pre-commit hook template in `docs/SECRETS.md` (optional for local CLI) | P1-A | 15 min |
| S4 | Quarterly rotation schedule + GH issue auto-create | P1-F | 1 hr |
| S5 | Add `docs/SECRETS.md` to repo (this session) | P0 | done ✓ |

**Verdict:** R-01 and R-18 status = **no active leak; controls (gitleaks + .gitignore) recommended for Phase 1 to prevent future drift.**
