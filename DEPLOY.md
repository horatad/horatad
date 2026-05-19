# Deploy Architecture — Horatad

## Static Site (horatad.com)

```
GitHub repo: horatad/horatad (branch: main)
        │
        │  auto-deploy on push
        ▼
Cloudflare Pages  →  horatad.com
```

- ไม่มี build step — `publish = "."` (vanilla HTML/JS/CSS)
- `_headers` ใช้งานได้เพราะ Cloudflare Pages อ่านไฟล์นี้
  - `sw.js` และ `/v3/*` → `Cache-Control: no-store`
- deploy = `push.bat` (Windows) → bump version → `git push`

## Cloudflare Workers (แยกจาก static site)

| Worker | URL | หน้าที่ |
|--------|-----|---------|
| `horatad-auth` | `horatad.com/api/auth` | ตรวจรหัสผ่าน (Worker Route บน zone horatad.com) |
| `horatad-ai` | `horatad-ai.uchujaro5.workers.dev` | Proxy ไป Typhoon AI API |

### horatad-ai Worker
- source: `worker.js` + `wrangler.toml` ใน repo นี้
- cron trigger: `*/5 * * * *` — ping ตัวเองเพื่อ keep warm
- env vars ที่ต้องตั้งใน Cloudflare Dashboard:
  - `TYPHOON_API_KEY` — API key ของ Typhoon
  - `WORKER_SELF_URL` — `https://horatad-ai.uchujaro5.workers.dev` (optional)
- deploy: `wrangler deploy` (แยกจาก git push)

## Version Sync (บังคับทุก deploy)

ไฟล์ 3 ตัวต้องตรงกันเสมอ:

```
version.json  →  {"v":"x.x.xx"}
script.js     →  const APP_VERSION = 'x.x.xx'
sw.js         →  const CACHE_NAME = 'horatad-vx.x.xx'
```

`bump_version.ps1` + `push.bat` จัดการ bump และ sync ทั้ง 3 ไฟล์อัตโนมัติ
