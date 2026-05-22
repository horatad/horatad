# Horatad — Deploy Guide

## Production setup

```
Source       : main branch ของ repo horatad/horatad
Hosting      : GitHub Pages
Custom domain: horatad.com (ผ่าน CNAME ใน root)
Backup CDN   : Netlify (netlify.toml + _headers) — staging/fallback
Worker       : horatad-ai (Typhoon proxy) + horatad-auth (PIN gate)
               — separate repo, deploy ผ่าน wrangler ไม่ใช่ git push
```

**Deploy ทำงานอัตโนมัติ**: push → main → GitHub Pages serve ภายใน ~1 นาที

---

## Pre-push checklist

ทุกครั้งที่จะ push (โดยเฉพาะหลัง bump version):

```bash
node scripts/check-version-sync.mjs   # ต้องผ่าน — ไม่งั้นจะ flicker / cache miss
node --check script.js                # syntax sanity
node --check sw.js
```

CI ก็รัน 2 ตัวนี้บนทุก push/PR — fail = block merge

---

## Bump version (ครบ 6 จุด)

```bash
node scripts/bump-version.mjs              # patch +1 (X.Y.Z → X.Y.Z+1)
node scripts/bump-version.mjs 2.3.0        # explicit
node scripts/check-version-sync.mjs        # verify
```

ครอบคลุม 11 patterns:
- `version.json` `"v"` field
- `script.js` HORATAD:SCRIPT + Version + `const APP_VERSION`
- `sw.js` HORATAD:SW + Version + `CACHE_NAME`
- `style.css` HORATAD:STYLE
- `index.html` HORATAD:INDEX + 6 spots (`style.css?v=`, `script.js?v=`, `v3tab.js?v=`, `brand-ver`, `about-version`)

**`bump_version.ps1`** (Windows): delegate ไป node script — เลิกใช้ logic เดิมที่ bump แค่ 3 ไฟล์ (cause cache miss)

---

## Auto-deploy ทุก commit (Claude Code on the web)

ตาม `CLAUDE.md` standing instructions:

```bash
# หลัง commit บน feature branch (claude/xxx)
git push -u origin <feature-branch>
git push origin <feature-branch>:main                         # ff main
git push origin <SHA>:refs/heads/backup/vX.Y.Z                # backup
git checkout main && git reset --hard origin/main && git checkout <feature-branch>
```

---

## Verify deploy succeeded

หลัง push 1-2 นาที:

```bash
curl -s https://horatad.com/version.json
# ต้องคืน {"_id":"HORATAD:VERSION","v":"<just-pushed-version>"}
```

หรือเปิด browser → ดู `<span class="brand-ver">` ใน header

---

## Rollback

ใช้ backup branch (`backup/vX.Y.Z`) ที่สร้างทุก release:

```bash
git fetch origin
git push origin backup/v2.2.37:main   # rollback main ไป V2.2.37
```

ไม่ต้อง force push (เพราะ backup branch มี commit history ครบจนถึงจุดนั้น —
อาจไม่ ff ตรงๆ ถ้ามี commit ใหม่กว่า; ใช้ `--force-with-lease` ถ้าจำเป็น
และยืนยันกับเจ้าของก่อน)

---

## Worker deploy (separate)

```
horatad-ai (Typhoon AI proxy):
  cd ~/horatad-ai
  wrangler deploy

horatad-auth (PIN validator):
  cd ~/horatad-auth
  wrangler deploy
```

Worker URL endpoints (referenced จาก frontend):
- `https://horatad-ai.<account>.workers.dev/v1/typhoon` — V3 prediction
- `https://horatad-auth.<account>.workers.dev/api/auth` — PIN unlock TAB 3

---

## Common pitfalls

| อาการ | Root cause | แก้ |
|---|---|---|
| Flicker หลัง deploy (desktop) | SW cache propagation race — version.json reload vs controllerchange reload | DEFERRED — รอ "รอบใหญ่" รื้อ SW lifecycle |
| Mobile ยังเห็น version เก่า | iOS Safari aggressive PWA cache | user pull-to-refresh + รอ SW update poll (1hr) |
| `local main` diverged | "Add files via upload" commits จาก GitHub UI ค้าง | `git reset --hard origin/main` (ของเก่าเป็นขยะ) |
| Push สำเร็จแต่ Pages ไม่อัปเดต | Pages build queue ช้า | รอ 2-3 นาที, ตรวจ https://github.com/horatad/horatad/actions |
| Version mismatch ในไฟล์ | bump_version.ps1 ของเดิม bump แค่ 3 จุด | ใช้ `node scripts/bump-version.mjs` แทน |

---

## File map

```
.github/workflows/ci.yml           — CI: syntax + version sync
scripts/check-version-sync.mjs     — validator
scripts/bump-version.mjs           — bumper (ใช้ทุก release)
CLAUDE.md                          — project conventions + standing instructions
DEPLOY.md                          — ไฟล์นี้
handoffs/<PROJECT>_*.md            — log work + pending list (1 ต่อ session ต่อ project)
bump_version.ps1                   — legacy Windows wrapper (delegate ไป node)
push.bat / push.bat1               — Windows local push helpers (user-only)
netlify.toml + _headers            — Netlify config (staging/backup)
CNAME                              — horatad.com (GitHub Pages custom domain)
```
