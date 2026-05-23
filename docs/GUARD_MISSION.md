# GUARD — Confidentiality · Integrity · Availability + Performance
# Project Charter, Policy & Roadmap | สร้าง 2026-05-22

> **หน้าที่:** ตรวจสอบ + เฝ้าระวัง + ปรับปรุง ทั้ง **ความปลอดภัย** (เข้าถึง horatad.com, ป้องกันขโมย source / hack / spam) และ **ประสิทธิภาพ** (ความเร็ว/การตอบสนอง) ของ Horatad ecosystem ทั้งหมด — โดยยึด trade-off **benefit / risk** เป็นหลักตัดสิน

> **ขอบเขต:** ครอบคลุม HORATAD PWA + BIBLE/JULIAN APIs + Cloudflare Workers + GitHub repo + tools/* + sandbox runtime — ทุกอย่างที่ user แตะหรือที่ supply chain ของแอป pass ผ่าน

---

## 0. ปรัชญา  GUARD (อ่าน 30 วินาที)

```
"ปลอดภัย" ≠ "เพิ่ม layer ทุกที่"
"เร็ว"     ≠ "ตัดทุกอย่างที่ดู heavy"
"ดี"       = ทุกการเปลี่ยนแปลงต้องผ่าน:  Δrisk vs Δfriction vs Δperf
```

**กฎทอง 3 ข้อ:**
1. **No-fix > Bad-fix** — มาตรการที่ใช้ไม่จริงคือ overhead ฟรี (มี + ไม่ใช้ = ลบความน่าเชื่อถือของ layer อื่น)
2. **Defense in depth, not redundancy in mess** — มี layer หลายชั้นได้ แต่ทุก layer ต้องมีบทบาทคนละแบบ ไม่ทับซ้อนแบบไม่ตั้งใจ
3. **Measure before / Measure after** — ทุก change ต้องมี baseline + post-metric (Lighthouse, RUM, error rate, abuse log)

**Threat model (ใช้ตลอด project):**
- **Attacker A1 — Source thief**: เพื่อน/คนรู้จัก clone repo, ดู logic, เอาไป fork (low skill, high motivation)
- **Attacker A2 — Casual abuser**: spam form / call API Worker ซ้ำ ๆ ให้ quota หมด (medium skill)
- **Attacker A3 — Supply chain**: malicious dependency / GitHub Action / CDN ที่แอบ exfiltrate user data (low likelihood, high impact)
- **Attacker A4 — Account takeover**: GitHub / Cloudflare credential leak → push malicious code → ทุก user ติด (low likelihood, catastrophic)
- **Attacker A5 — User-data scraper**: เก็บข้อมูลวันเกิดที่ user กรอกผ่าน QR sharing (privacy threat)

**สิ่งที่ "ไม่กลัว" (out of scope ของ project นี้):**
- Nation-state APT — ไม่สมเหตุผลกับ scope แอป
- Physical attack on user device — ไม่ใช่หน้าที่ web app
- Insider threat (user คนเดียว, no team) — ไม่ใช่ vector ของ Horatad

---

## 1. 🛡️ Pillar 1 — Security (Confidentiality + Integrity + Availability)

### 1.1 Confidentiality — กันคน "เห็น" ของที่ไม่ควรเห็น

| Asset | ปัจจุบัน | เป้าหมาย | Threat | Priority |
|---|---|---|---|---|
| Source code (script.js, v3/*.js) | public on GitHub Pages | **public + accepted** — astrology open-source by design, แต่ commit log ต้องไม่มี secret | A1, A3 | P3 |
| Secrets (API keys, tokens) | ไม่มีใน repo (ตรวจแล้ว — workers/kb_extract* ใช้ env vars) | **zero secrets ใน repo + CI ตรวจอัตโนมัติ** | A3, A4 | **P0** |
| User natal data (วันเกิด, ชื่อ) | localStorage browser-only + QR URL (encoded) | **opt-in privacy policy + clear UI ว่าใครเห็นอะไร** | A5 | P1 |
| JULIAN scraped persons | public on GitHub Pages (`data/julian_all.json`) | **accepted** — ข้อมูลจาก Wikidata public อยู่แล้ว, ไม่มี PII | — | P3 |
| Server-side keys (Typhoon, Groq) | CF Worker env vars + GitHub Actions secrets | **rotate quarterly + audit access log** | A4 | P1 |

**P0 — Secret hygiene baseline (1 session):**
- เพิ่ม **gitleaks** scan ใน CI (`.github/workflows/ci.yml`)
- เพิ่ม **pre-commit hook template** ใน docs (optional for local CLI)
- เขียน `docs/SECRETS.md` — ที่ไหนเก็บอะไร, rotate procedure
- ตรวจ `git log --all -p` หา accidental commit ในอดีต (one-time audit)

**P1 — User privacy clarity (1 session):**
- เพิ่ม **Privacy Notice** ใน HORATAD (1 modal/section): "ข้อมูลของท่านอยู่บนเครื่องท่านเท่านั้น" + ระบุชัดว่า:
  - localStorage = local only, ไม่ส่งไปไหน
  - QR share URL = ใครเปิด link ก็เห็นวันเกิด (เปลี่ยน label ปุ่ม share เป็น "แบ่งดวงนี้ (ระบุชื่อ)")
  - Typhoon LLM = ส่งคำถามไปบนคลาวด์ (ระบุก่อนกดเรียก)
- Compliance check: PDPA (Thai), GDPR (สำหรับ user EU/UK ในอนาคต)

### 1.2 Integrity — กันคน "เปลี่ยน" ของที่ไม่ควรเปลี่ยน

| Layer | Control | Status | Plan |
|---|---|---|---|
| Repo write access | GitHub account auth (uchujaro5) | ✅ | **P0**: enable 2FA + signed commits + branch protection on `main` |
| Deploy pipeline | GitHub Pages auto-deploy on push to main | ✅ | **P1**: เพิ่ม CI gate — block deploy ถ้า lint/test fail |
| Worker code | wrangler deploy via user laptop | ✅ | **P2**: deploy ผ่าน GitHub Actions แทน + audit log |
| Asset integrity | none (external script tags load directly) | ⚠️ | **P1**: Subresource Integrity (SRI) — แต่เรา bundle qrcode.min.js ลง repo แล้ว → SRI ไม่จำเป็น เว้นแต่ในอนาคตโหลด external |
| Service Worker | cache-first ของ same-origin | ✅ | **P2**: ตรวจ cache poisoning surface (`fetch` event handler) |
| KB data | kb.json + kb_master.json | ✅ commit-tracked | **P3**: optional SHA-256 manifest |

**P0 — GitHub hardening (15 นาที, no code):**
1. Settings → Security → require 2FA
2. Settings → Branch protection rules → main: require status checks, no force-push, no deletion
3. Enable **signed commits** (GPG/SSH) — ไม่บังคับ collaborator แต่ Claude bot commits จะมี verify status
4. Enable **Dependabot** alerts + **secret scanning** (free สำหรับ public repo)

### 1.3 Availability — กันคน "ทำให้ใช้ไม่ได้"

| Surface | Threat | Current | Plan |
|---|---|---|---|
| horatad.com (GitHub Pages) | DDoS, rate-limit, abuse | GitHub Pages CDN — built-in DDoS protection ระดับหนึ่ง | accepted |
| Cloudflare Workers (horatad-ai, horatad-auth) | Worker invocation abuse → daily quota exhausted | **no rate limit ใน Worker** ⚠️ | **P1**: เพิ่ม CF Rate Limiting Rules (free tier มี 10K req/day) — limit per IP เช่น 30 req/min |
| Typhoon API quota | spam ผ่าน Worker proxy | **no limit** ⚠️ | **P1**: ใส่ token bucket ใน Worker — ผูกกับ CF user fingerprint (CF-Connecting-IP + UA hash) |
| Service Worker stale cache | bad deploy → user ติด version เก่า | mitigation: `Cache-Control: no-store` บน `/sw.js` + `/v3/*` | ✅ |
| GitHub Actions hours | malicious PR run workflow บน fork → กิน quota | accepted — repo public, แต่ workflow trigger จาก fork ถูก disabled โดย default | verify |

**P1 — Worker rate limiting (1 session):**
- เพิ่ม `wrangler.toml` กฎ rate limit หรือใช้ Cloudflare Rules dashboard
- ตั้ง limit ที่ generous (30 req/min/IP) — ไม่กระทบ user จริง แต่ block bot
- 429 response → user-friendly message ภาษาไทย: "ใช้บ่อยเกินไป รอ 1 นาที"
- log abuse events → Cloudflare Analytics

---

## 2. ⚡ Pillar 2 — Performance

> "fast" ใน CLAUDE.md หมายถึง: ไม่มี loading >300ms โดยไม่มี feedback, offline-first, bundle เล็ก. เราจะ **วัดจริง** ไม่เดา

### 2.1 Baseline metrics ที่ต้อง track

| Metric | เครื่องมือ | เป้าหมาย | ปัจจุบัน (ต้องวัด) |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | Lighthouse + RUM | <2.5s mobile, <1.5s desktop | ? |
| **INP** (Interaction to Next Paint) | Lighthouse + RUM | <200ms | ? |
| **CLS** (Cumulative Layout Shift) | Lighthouse | <0.1 | ? |
| **TBT** (Total Blocking Time) | Lighthouse | <200ms | ? |
| **TTFB** (Time to First Byte) | Lighthouse | <800ms | ? |
| **Bundle size** (total transfer) | webpagetest / DevTools | <500KB initial, <2MB total | script.js 398KB ⚠️, julian_all.json 15MB |
| **PWA Lighthouse score** | Lighthouse PWA audit | ≥90 | ? |
| **Time to Predict** (custom) | manual stopwatch / RUM | <3s end-to-end (กรอก→ดูพยากรณ์) | ? |

### 2.2 Known issues (ตรวจจาก ls)

| Issue | Impact | Fix difficulty |
|---|---|---|
| `data/julian_all.json` = **15 MB** ใน repo | ทุกคน clone ดาวน์โหลดยาว, ทุก deploy push 15MB | medium — แยกเป็น sharded JSON หรือ ย้ายไป Release asset |
| `script.js` = **398 KB** (3993 lines) | parse+exec ช้าบนมือถือเก่า, INP สูง | medium — code-split V3 modules (เริ่มแล้ว) + lazy-load tools |
| `kb.json` + `kb_master.json` + `kb_v24-3.json` + `kb_yaml_import.json` = ~750KB ใน v3/ | ของซ้ำ load ทุกครั้งถ้า path ผิด | low — verify ว่าผู้ใช้จริงโหลดแค่ kb.json |
| Service Worker cache-first ไม่มี max-age | stale assets ตลอด จนกว่า version จะ bump | accepted ✅ (เพราะ no-store บน sw.js + v3/) |
| ไม่มี **Brotli/Gzip pre-compression** ใน repo (GitHub Pages บีบให้อัตโนมัติ) | depends on GH Pages config | verify |
| **Font loading** strategy | block render? | check — ดูใน index.html |

### 2.3 PWA standard checklist (Lighthouse PWA audit)

```
[?] Installable (manifest.json + icons + start_url) — ✅ มีแล้ว
[?] Service Worker registers + cache strategy — ✅
[?] Works offline — ⚠️ verify (cache-first ครอบคลุม CORE_ASSETS แต่ kb.json ขาด?)
[?] HTTPS only — ✅ (GH Pages auto)
[?] Theme color in <meta> — verify
[?] Apple touch icon (180x180) — ✅ มี horatad_180x180.png
[?] Maskable icon — ⚠️ ปัจจุบัน purpose="any" เท่านั้น — เพิ่ม purpose="maskable" สำหรับ Android Adaptive
[?] Viewport meta — verify
[?] Splash screen — auto จาก manifest
[?] Lang attribute — ✅ "th" ใน manifest
[?] <title> + meta description — verify
```

### 2.4 Performance roadmap

**P0 — Establish baseline (1 session):**
- รัน Lighthouse บน horatad.com (mobile + desktop) → save report เป็น `docs/perf_baseline_YYYY-MM-DD.json`
- เปิด WebPageTest report → identify top 3 bottlenecks
- ติดตั้ง **web-vitals.js** library (3KB) → log RUM ลง browser console (Phase 1) → เพื่อรวบรวม INP real-world

**P1 — Quick wins (1 session):**
- `manifest.json`: เพิ่ม `purpose: "maskable"` icon (อาจต้องสร้าง 512px maskable variant)
- `index.html`: ตรวจ `<meta viewport>`, theme-color, description
- `sw.js`: ตรวจ `kb.json` ใน CORE_ASSETS (มีแล้ว ✅) — แต่ตรวจ stale-while-revalidate strategy สำหรับ data ใหญ่
- `script.js`: ระบุ function ที่ block main thread นาน (>50ms) → defer หรือ chunk ด้วย `requestIdleCallback`

**P2 — Structural (2-3 sessions):**
- แยก `julian_all.json` ออกจาก repo → ใช้ GitHub Release asset + lazy fetch on demand
- Code-split tools/ pages ที่ไม่ได้ใช้ใน main app (kb_extract, kb_reviewer ไม่ควรโหลดมากับ index)
- Defer Typhoon LLM call → ไม่ใช่ initial path

**P3 — Optional polish:**
- Add `<link rel="preconnect">` สำหรับ Typhoon CF Worker
- Image optimization (icon 746x746 = 70KB → optimize via squoosh)
- Critical CSS inline (style.css ตอนนี้ external)

---

## 3. ⚖️ Pillar 3 — Trade-off / Benefit-to-Risk

> "ทำทุกอย่างที่ best practice แนะนำ" = แอปช้า + complexity ระเบิด. ทุก control ต้องตอบ 3 คำถามก่อน adopt:

### 3.1 Decision framework

```
ก่อน adopt control ใด ๆ:

1. Benefit (Δrisk_reduction) =  P(attack) × Impact × Coverage_of_control
2. Cost   (Δfriction)         =  dev_time + user_friction + perf_cost + maintenance
3. Ratio  =  Benefit / Cost   →  Adopt ถ้า > 1 และ ทำง่ายในเวลาที่มี

ตัวอย่าง:
  CSP strict-dynamic        — Benefit สูง (กัน XSS), Cost ต่ำ (text ใน _headers)     → ADOPT
  Sign every git commit     — Benefit ต่ำ (single-user repo), Cost ปานกลาง (setup)  → SKIP for now
  Rate limit Worker         — Benefit สูง (กัน quota burn), Cost ต่ำ (CF rule)     → ADOPT
  Full SAST tool in CI      — Benefit ต่ำ (vanilla JS, no framework), Cost สูง   → SKIP
  Add nonce to inline scr.  — Benefit สูง (เปิดทาง CSP strict), Cost ปานกลาง       → ADOPT P1
  WebAuthn for login        — Benefit ต่ำ (no login feature), Cost สูง          → N/A
```

### 3.2 Risk register (P0 → P3)

| ID | Risk | P(likely) | Impact | Mitigation | Priority | Cost |
|---|---|---|---|---|---|---|
| R-01 | Secret leak ใน commit | medium | high | gitleaks CI + audit | **P0** | low |
| R-02 | Worker quota burn | medium | medium | CF rate limit | **P1** | low |
| R-03 | XSS via user input (form ชื่อ) | low | medium | CSP + sanitize on render | **P1** | low |
| R-04 | Account takeover GitHub/CF | low | catastrophic | 2FA + branch protection | **P0** | very low |
| R-05 | Stale SW cache after deploy | low | medium | no-store header (มีแล้ว) | ✅ done | — |
| R-06 | Source code "ถูกขโมย" | high | very low | accepted (public by design) | **N/A** | — |
| R-07 | User data scrape via QR URL | medium | low | privacy notice + opt-in clear share | **P1** | low |
| R-08 | LCP > 4s บน 3G mobile | high (?) | medium | measure → optimize | **P0 measure, P1 fix** | medium |
| R-09 | Spam form submit | low | low | accepted (form is local-only, no server side-effect) | **N/A** | — |
| R-10 | Supply chain (npm dep compromise) | low | high | minimal deps (vanilla JS) ✅ + Dependabot | **P0 enable, P3 audit** | low |
| R-11 | Missing CSP / clickjacking | medium | low-medium | CSP + X-Frame-Options ใน `_headers` | **P1** | very low |
| R-12 | GitHub Action runs arbitrary code from PRs | low | high | disable PR workflow trigger from forks | **P0** | very low |
| R-13 | localStorage XSS data theft | low | medium | CSP gates XSS surface | covered by R-03 | — |
| R-14 | julian_all.json 15MB slow first-load | high | medium | shard or lazy-fetch | **P2** | medium |
| R-15 | Stale long-lived API token (CF/Groq/Typhoon) | medium | high | quarterly rotation + GH issue auto-create | **P1** | low |
| R-16 | Wikidata SPARQL scrape compliance | low | medium | UA + backoff + 1500ms gap (verified COMPLIANT 2026-05-23) | **P1 ✅ closed** | — |
| R-17 | horatad-auth Worker hardening | medium | high | client gate cosmetic; Worker source review required | **P1** | medium |
| R-18 | Secret sprawl & inventory drift | medium | medium | docs/SECRETS.md + rotation reminder workflow | **P1** | low |

### 3.3 Things we DON'T do (และเหตุผล)

```
❌ Add OAuth/login                    — feature ไม่มี, ไม่ต้องป้องกัน session ที่ไม่มี
❌ Encrypt localStorage                — ข้อมูลอยู่บนเครื่อง user เอง, key ต้องเก็บไหน?
❌ Server-side render (SSR)            — overhead สูง, ไม่ตอบโจทย์ PWA offline-first
❌ Full WAF (Web Application Firewall) — CF free tier มี built-in DDoS แล้ว
❌ Threat intelligence feed            — scope ใหญ่เกิน, ROI ต่ำ
❌ Penetration testing professional   — งบไม่มี, scope แอป astrology ไม่คุ้ม
❌ Mandatory user agreement modal      — friction สูง, แค่ "Privacy Notice" footer พอ
```

---

## 4. 📅 Roadmap  GUARD — Phase plan

### Phase 0 — Discovery & Baseline (1-2 sessions, ทำก่อนแก้อะไร)
**ขั้นตอน:**
1. **Audit ปัจจุบัน** (ใน sandbox, no deploy):
   - รัน gitleaks `git log --all` ดู history ว่ามี secret leak ไหม
   - List ทุก HTML/JS ที่ใช้ `innerHTML`, `eval`, `Function()` — ระบุ XSS surface
   - List external resource ทุกตัวใน index.html — ระบุ supply chain surface
   - ตรวจ `<script>`, `<link>` ทุกตัว → SRI candidate?
2. **Baseline metrics**:
   - Lighthouse mobile + desktop บน horatad.com
   - Save report ลง `docs/cia/perf_baseline_YYYY-MM-DD.{json,md}`
   - บันทึก LCP/INP/CLS/PWA score ลง  GUARD handoff
3. **Output**: `handoffs/GUARD_<date>_v2.md` พร้อม priority list

### Phase 1 — Quick wins P0+P1 (3-4 sessions)
ทำตามลำดับ priority ใน risk register § 3.2:
1. **Session A** — Secret hygiene: gitleaks CI + audit + docs/SECRETS.md
2. **Session B** — GitHub hardening: 2FA + branch protection + Dependabot (no-code, user step + verify)
3. **Session C** — Headers: CSP + X-Frame-Options + Permissions-Policy + Referrer-Policy ใน `_headers`
4. **Session D** — Worker rate limit: CF rule + 429 friendly response
5. **Session E** — Performance quick wins: maskable icon + viewport audit + critical render path

### Phase 2 — Structural (2-3 sessions, รอ Phase 1 stable)
1. **julian_all.json sharding** — ย้าย 15MB ออกจาก initial load
2. **script.js code-split** — defer V3 tab modules, lazy-load tools/
3. **Privacy notice UI** — modal + section ใน index, PDPA-friendly wording

### Phase 3 — Continuous (ongoing, ไม่มี end date)
1. **Quarterly secret rotation** (Typhoon, Groq, CF tokens)
2. **Monthly Lighthouse sweep** — ดู regression
3. **Watch CF Worker analytics** — abuse pattern detection
4. **Dependabot triage** — เมื่อมี PR
5. **Update GUARD risk register** — ทุก feature ใหม่ของ ecosystem ต้อง assess

### Phase 4+ — Advanced (consider เมื่อมี user จริง > 100 daily)
- Add **CSP report-uri** endpoint → analyze violations
- Add **Reporting API** (deprecation warnings, crash reports)
- Add **structured logging** สำหรับ Worker
- Penetration testing (ถ้า scale ขึ้น)

---

## 5. 🔧 Standard Operating Procedures (SOPs)

### SOP-01: Pre-deploy security check (ทุกครั้งก่อน push to main)
```
[ ] grep -rE "(api[_-]?key|secret|token|password)" --include="*.js" --include="*.html" .
[ ] ทุก .env / *.local / *.key ใน .gitignore แล้ว
[ ] ไม่มี file ที่ size > 5MB ใน commit (ดู: git diff --stat HEAD)
[ ] CI ผ่าน (ci.yml) — ไม่ skip ด้วย --no-verify
[ ] ถ้าแตะ _headers / manifest.json / sw.js → ลอง Lighthouse ก่อน push
```

### SOP-02: Incident response (เมื่อสงสัย breach)
```
1. หยุด push to main ทันที (revoke session token ถ้าจำเป็น)
2. rotate ทุก secret (CF API token, Typhoon, GH token)
3. ดู GitHub Audit log: Settings → Security → Audit log → filter by user/event
4. ดู CF Dashboard → Audit Log → ดู wrangler deploy/API calls
5. ถ้ายืนยัน compromise → force-push revert (user decision) + announce ใน CHANGELOG
```

### SOP-03: New feature security review (ทุก feature ใหม่)
```
1. ระบุ data flow: input source → processing → storage → output
2. ตรวจ user input → render path ทุกจุด → ใช้ textContent ไม่ใช่ innerHTML
3. ตรวจ external network call → endpoint trusted? ส่งข้อมูลอะไร?
4. ตรวจ secret usage → CF Worker env vars เท่านั้น, ไม่ลง localStorage/sessionStorage
5. ลงใน risk register ของ project นั้น + cross-link ใน GUARD handoff
```

### SOP-04: Performance budget enforcement (ทุก major version bump)
```
[ ] Lighthouse mobile score > 85 (Performance category)
[ ] LCP < 2.5s, INP < 200ms, CLS < 0.1
[ ] Initial JS bundle < 500KB transfer
[ ] No new render-blocking resource ใน <head>
[ ] ถ้า regression → block bump version จนกว่าจะ fix หรือ explicit waiver ใน handoff
```

### SOP-05: Quarterly secret rotation (Mar / Jun / Sep / Dec — auto-issue)
```
1. รอ GH issue auto-created โดย .github/workflows/rotate_secrets_reminder.yml (P1-F)
2. ตาม checklist ใน docs/SECRETS.md § 5 ทำ rotate ทุก key ที่ frequency=quarterly
3. หลัง rotate แต่ละ key:
   - ทดสอบ workflow / Worker ที่ใช้ key นั้น (kb_extract_test สำหรับ GROQ; manual call horatad.com → V3 → Predict สำหรับ TYPHOON)
   - revoke old key หลัง confirm new key ใช้ได้
   - อัปเดต docs/SECRETS.md (`last_rotated` field) ใน commit เดียวกัน
4. ปิด issue เมื่อทุก key เสร็จ
5. ถ้าพบ key หายไปจาก source-of-truth (sprawl drift) → R-18 trigger + update SECRETS.md ทันที
```

---

## 6. 🎯 Success metrics (KPIs)

| Metric | Now | Target Q3 | Target Q4 |
|---|---|---|---|
| Lighthouse Performance (mobile) | TBD | ≥85 | ≥90 |
| Lighthouse PWA score | TBD | ≥90 | =100 |
| LCP (mobile, p75 RUM) | TBD | <2.5s | <2.0s |
| INP (p75 RUM) | TBD | <200ms | <150ms |
| Initial transfer size | ~500KB+ | <500KB | <350KB |
| Open critical security findings | unknown | 0 | 0 |
| Secret leak in commits | unknown | 0 confirmed | 0 + gitleaks CI green |
| Worker abuse 429 rate | unmetered | metered + <1% | <0.5% |

---

## 7. 🔗 Cross-project dependencies

| Project |  GUARD concern |
|---|---|
| HORATAD | XSS surface in script.js, perf bottleneck, PWA installability |
| BIBLE | Typhoon API key (server-side via CF Worker), prompt injection from user input → LLM |
| JULIAN | data/julian_all.json 15MB (perf), Wikidata scrape ToS (compliance), GitHub Action secret hygiene |
| NOK | Web Speech API privacy (sends text to OS-level voice engine — usually local but verify), browser permissions |
| PLATFORM (future) | LINE OA webhook signature verification, CF Worker rate limit, content moderation |

> **กฎ**: GUARD session **ไม่แตะโค้ดของ project อื่น** โดยไม่ผ่าน handoff cross-project. ทุกข้อเสนอจะ commit ลง handoff project ปลายทาง + แจ้ง user

---

## 8. 📚 มาตรฐานอ้างอิง

| Domain | Standard |
|---|---|
| Web app security | OWASP Top 10 (2021), OWASP ASVS Level 1 |
| PWA | W3C PWA best practices, Lighthouse PWA audit, web.dev/pwa-checklist |
| Performance | Core Web Vitals (Google), RAIL model, web.dev/fast |
| Privacy | PDPA (Thai 2562), GDPR (สำหรับ EU users ในอนาคต) |
| Content Security | CSP Level 3, COOP/COEP, CORP, Permissions-Policy |
| Accessibility | WCAG 2.2 AA (parallel concern, ไม่ใช่ scope หลัก GUARD) |
| Crypto | NIST SP 800-63B password guidelines (ถ้ามี login ในอนาคต) |
| Supply chain | SLSA framework Level 1 (เริ่ม), Dependabot, gitleaks |

---

## 9. 📂 ไฟล์ project  GUARD (file map)

```
docs/GUARD_MISSION.md             ← ไฟล์นี้ (charter + policy + roadmap)
docs/cia/                       ← (จะสร้างเมื่อจำเป็น)
  perf_baseline_YYYY-MM-DD.md   ← Lighthouse baseline
  secret_audit_YYYY-MM-DD.md    ← gitleaks audit result
  csp_policy.md                 ← Content Security Policy draft + iterations
  risk_register.md              ← live tracking ของ R-01..R-NN

handoffs/GUARD_YYYYMMDD_vN.md     ← session handoff (เริ่ม v1 หลัง session แรกทำงาน)

_headers                        ← Cloudflare Pages headers (CSP, X-Frame, etc.)
.github/workflows/ci.yml        ← เพิ่ม gitleaks job
```

---

## 10. 🚦 Session opening template (สำหรับ GUARD sessions ถัดไป)

ทุก session เริ่มต้นด้วย:
```
## GUARD — งานค้างวันนี้

**Phase ปัจจุบัน:** 0 (Discovery) / 1 (Quick wins) / 2 (Structural) / 3 (Continuous)

### แนะนำทำก่อน
1. ✅ [งาน] — [เหตุผล: risk ID + impact]
2. ✅ [งาน] — [เหตุผล]

### รอ user
- ⭐ [งาน] — [ต้องการอะไรจาก user: GitHub setting / CF dashboard / decision]

### ข้าม (เหตุผล)
- ❌ [งาน] — [trade-off: cost > benefit]
```

---

*สร้าง: 2026-05-22 | อัปเดตทุกครั้งที่ phase เลื่อนหรือ standard เปลี่ยน*
