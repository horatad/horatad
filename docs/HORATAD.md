# HORATAD — Technical Reference

> Stack + version bump + cache-bust + UI/UX rules + project quirks
> Claude อ่านไฟล์นี้เมื่ออยู่ใน HORATAD session
> Vision + roadmap + architecture → `ECOSYSTEM.md`
> Daily task list → `PROJECT_STATUS.md`

**อัปเดต:** 2026-05-22 | **App version:** V3.3.12 | **URL:** horatad.com

---

## Stack

- **Frontend:** vanilla JS, no build step — edit ตรง → push → GitHub Pages deploy
- **Service Worker:** `sw.js` — cache-first สำหรับ same-origin, network-first สำหรับ `version.json`
- **CF Workers:** `horatad-ai` (Typhoon proxy) + `horatad-auth` (PIN gate) — deploy ผ่าน wrangler **ไม่ใช่** git push
- **V3 modules:** `v3/*.js` เป็น ES module (v3tab.js, engine.js, interpretation.js, typhoon.js)
- **Storage:** localStorage (`horatad_db_v4` unified DB1/DB2/buffer/groups) + IndexedDB (capture images)
- **Production URL:** `horatad.com` (CNAME → GitHub Pages from main branch)

---

## Version bump checklist (ทุกครั้งที่มี change)

ใช้ `node scripts/bump-version.mjs` — bump `X.Y.Z` พร้อมกัน **6 จุดใน 5 ไฟล์**:

| ไฟล์ | pattern |
|---|---|
| `script.js` | `HORATAD:SCRIPT:X.Y.Z` (l.1) + `Version X.Y.Z` (l.2) + `const APP_VERSION='X.Y.Z'` |
| `sw.js` | `HORATAD:SW:X.Y.Z` + `Version X.Y.Z` + `const CACHE_NAME='horatad-vX.Y.Z'` |
| `version.json` | `{"_id":"HORATAD:VERSION","v":"X.Y.Z"}` |
| `index.html` | 6 จุด — `HORATAD:INDEX`, `Version`, `style.css?v=`, `brand-ver`, `about-version`, `script.js?v=`, `v3tab.js?v=` |
| `style.css` | `HORATAD:STYLE:X.Y.Z` (l.1) |
| `v3/v3tab.js` | bump เฉพาะตอนแก้ V3 logic — มี internal version (`V3.X [DD/MM/YY]`) แยก |

**Changelog inline:** prepend block ใน `script.js` header — `// Changes: [VX.Y.Z] <type>: <bullet>...`
**File CHANGELOG:** prepend entry ใน `docs/CHANGELOG.md` (newest first)

**Verify ก่อน push:**
```bash
node scripts/check-version-sync.mjs   # ต้องผ่าน — ไม่งั้นเกิด reload loop
node --check script.js                # syntax sanity
node --check sw.js
```

---

## Cache-bust convention

ทุก asset URL ต้องมี `?v=APP_VERSION`:
- ใน `index.html`: hardcode (`?v=X.Y.Z`)
- ใน `sw.js` `CORE_ASSETS`: `'./X?v='+V` (V อ่านจาก `CACHE_NAME.split('-').pop()`)
- ใน ES module (เช่น v3tab.js): อ่านจาก `window.APP_VERSION`
  (`const` ใน classic script ไม่อยู่บน window อัตโนมัติ — `script.js` ต้องทำ `window.APP_VERSION=APP_VERSION;`)

ถ้า key ไม่ตรงกัน 100% (เช่น SW cache `kb.json?v=2.2.39` แต่ module fetch `kb.json`) → offline ใช้ไม่ได้

---

## SW Policy (ห้ามแตะถ้าไม่เข้าใจ lifecycle ครบ)

```
✓ install : cache → skipWaiting หลัง addAll เสร็จ
✓ activate: ลบเฉพาะ CACHE_NAME เก่า + clients.claim()
✓ fetch   : cache-first, bypass version.json (always network)
✗ nuclear clear (caches.keys → delete all) — ห้ามใช้เด็ดขาด ทำลาย offline
✗ unregister self — ห้ามใช้ใน production
✗ navigate() ใน activate — ลบทิ้งใน V2.2.28 (ทำให้ reload loop)
```

**SW Register (ใน script.js):**
- `updateViaCache:'none'` เสมอ → bypass browser HTTP cache
- `reg.update()` หลัง register → force check ทุก load
- `setInterval(()=>reg.update(), 60*60*1000)` → check ทุก 1 ชม.
- URL: `'./sw.js?v='+APP_VERSION` → bust CDN cache ทุก deploy

**Version Check (version.json):**
- `fetch('./version.json?t='+Date.now(), {cache:'no-store'})` ทุก load
- SW bypass version.json เสมอ — ต้องได้จาก network โดยตรง
- `v !== APP_VERSION` → `location.reload()` ทันที
- **version.json ต้องตรงกับ APP_VERSION เสมอ** — ไม่ตรง = reload loop

---

## QR Payload V2 (H2 HMAC ปัจจุบัน)

**Format (V3.2.1 — current):**
```
H2|<hmac8>|<jd>|<t>|<lat>|<lng>|<g>|<nm>
```

- `hmac8` = 8 hex จาก HMAC-SHA256 (key `HTD-H2-2026-K1`) ของ data string
- `jd` = `Math.trunc(jd)` — universal index (ไม่มี timezone)
- `t` = HH:MM
- `lat`/`lng` = `.toFixed(2)`
- `g` = `'ช'|'ห'|'เ'` (ชาย/หญิง/เหตุการณ์)
- `nm` = `.slice(0,20)` (ตัด emoji + truncate)

**URL form (QR + import link):**
```
https://horatad.github.io/horatad/?h=H2|<hmac>|<jd>|<t>|<lat>|<lng>|<g>|<nm>
```

**Backward compat:** H1 (ไม่มี HMAC) รับได้ + warning "QR รุ่นเก่า — ไม่ได้ยืนยัน"

**ECC:** Level H (ทนต่อ compression ผ่าน LINE)

---

## Share Image (1080×1080 PNG)

```
QR        : left x=28, y=835, size 110×110 (ECC Level H)
Info      : right-aligned x=SZ-30, y=835 + 4 lines (36/26/26 spacing)
Score     : center y=958, 64px bold
Label     : center y=1030, 22px gray
horatad.com: center y=1060, 13px Cinzel #666
Filename  : horatad_<JD>_<HHMM>_<lat>.png
```

**บันทึก/แชร์:** มือถือใช้ Web Share API → Photos โดยตรง / desktop fallback download

---

## UI / UX Rules

### สี ปุ่มยืนยัน
```
ทำลาย (delete/clear/reset)  → #f85149 แดง (confirm-ok)
สร้าง/เพิ่ม (add/save)       → #2ea043 เขียว (add-tag-ok)
หลัก action ของ app          → #5b3fa0 ม่วง
```

### Tag chip
```
Inactive  → bg #2a2a2e, border #3d3d44, text #8b949e
Active    → bg #5b3fa0, border #7b5fc0, text #fff bold
Add new   → border dashed #2ea043, text #56d364
```

### Popup alert
```
Error   → red glow keyframe (alert-blink)
Success → green glow keyframe (alert-blink-green)
แตะ backdrop → ปิด
```

### เสียง
```
Web Audio API _playBeep(freq) — 6 levels
Global listener: click → button → _playBeep(700)
Exclude: numpad-key, v3-dev-overlay, button.disabled
Debounce 15ms (_lastBeepMs) กัน rapid fire
```

### Design tokens
```
gold #b8860b · purple #5b3fa0 · green #1a6b3c
transit-red #f85149 · transit-blue #1a56db
bg-natal #0d1117 · bg-transit #160b28
text #c9d1d9 · muted #8b949e

Fonts: Cinzel 600 (brand-en) · Sarabun+Noto Sans Thai 700 (brand-th) · Sarabun 400 (body)
```

---

## Knowledge Base (KB)

**ปัจจุบัน (V2.3.0):**

| | |
|---|---|
| Rules ทั้งหมด | 342 rules |
| มี conditions[] | 284/342 (83%) |
| Rule types | TRUE_RULE: 104, TRANSIT_RULE: 49, CASE_STUDY: 122, HOUSE_CONCEPT: 50 |
| MISMATCH รอ review | 57 rules (ผ่าน `tools/kb_reviewer.html`) |
| Missing skeletons | 90 planet×quality combinations (ดู `v3/kb_skeletons.json`) |
| Backup | `v3/kb_master.json` (gold copy) |

### Rule schema
```json
{
  "id": 5009,
  "rule_type": "TRUE_RULE",
  "c": "ดาวอาทิตย์กุมลัคนา",
  "p": "หยิ่งในศักดิ์ศรี รักหน้า อีโก้สูง",
  "t": ["อาทิตย์", "ดี", "ลัคนา"],
  "conditions": [
    {"planet_id":"1","quality_required":"ANY","lagna_aspect_req":"กุมลัคนา","required":true}
  ],
  "pr": 1,
  "rule_source": "primary",
  "weight": 1.0
}
```

### Empirical fields (M7 — optional)
```json
"empirical_p":    0.73,    // P(trait | config), null = ยังไม่มีข้อมูล
"empirical_n":    47,
"empirical_refs": ["JD:2451545.0"]
```

---

## M3 + M8 — Fallback Chain (V3.3.6)

**Pipeline:**
```
match_rules(planets) → matched rules
  → Typhoon API (M3)
     ↓ ตอบ JSON ✓ → render text
     ↓ ตอบไม่ใช่ JSON หลัง retry → throw
     ↓
  → compose_local_prediction (M8 fallback)
     → preds = [{rule_id, text, keywords, polarity, chapter, source:'local'}]
     → compose_summary_text() → "ฉลาดเฉลียว มีเสน่ห์ แต่อีโก้สูง"
```

**ข้อสำคัญ M8:**
- `text` = `rule.p` ทั้งหมด (ground truth ไม่เปลี่ยน) — zero hallucination
- `keywords` = phrases แยกจาก `rule.p` ด้วย space/punctuation
- `polarity` = `+`/`-`/`~` จาก `t[]` tags + `conditions[]`
- ใช้เมื่อ Typhoon API ไม่พร้อม หรือ offline

---

## Project Quirks (เคยเจอ — ห้ามทำซ้ำ)

| Quirk | Detail |
|---|---|
| **Memory dedup key** | `${name}\|${d}/${m}/${y_be}\|${t}\|${prov}` — แก้ field ที่อยู่ใน key จะสร้าง entry ใหม่ (V2.2.38 รองรับ edit mode ผ่าน `replaceKey` param) |
| **PIN auth** | V3 tab unlock ผ่าน CF Worker `horatad-auth` — ห้าม hardcode PIN ใน frontend |
| **Era toggle** | BE (พ.ศ.) ↔ CE (ค.ศ.) — input field เก็บตาม era ปัจจุบัน แต่ memory เก็บ `y_be` เสมอ |
| **Numpad commit** | `_setField()` ใช้ `.value=` ตรงๆ → ไม่ trigger `input` event — ถ้าต้องปลุก listener (เช่น DB indicator) ต้องเรียกเอง |
| **iOS Safari `<input type="time">`** | บางครั้ง fire เฉพาะ `change` ไม่ใช่ `input` |
| **PWA SW cache** | อาจค้างหลัง deploy — hard refresh 2 รอบ หรือ DevTools → Application → Unregister SW |
| **qrcodejs บน iOS** | สร้าง `<img>` ไม่ใช่ `<canvas>` — ต้อง onload ก่อนใช้ (V3.3.11: bundle qrcode.min.js local) |
| **Local main divergence** | "Add files via upload" commits จาก GitHub UI ค้างใน local — `git reset --hard origin/main` (ของเก่าเป็นขยะ) |

---

## File-only-rule

```
- เปลี่ยน UI: ทดสอบใน browser จริงก่อน claim (sandbox verify ไม่ได้)
- เปลี่ยน script.js: bump 6 จุด พร้อมกัน (script.js + sw.js + version.json + index.html × 6 + style.css)
- เปลี่ยน v3/*: bump label แท็บพยากรณ์ V3.XX [DD/MM/YY]
- เปลี่ยน worker.js: wrangler deploy แยก — ไม่ใช่ git push
- เปลี่ยน CNAME: หยุดและถาม — กระทบ DNS ทันที
```

---

## Glossary

| คำ | ความหมาย |
|---|---|
| สุริยยาตร์ | ระบบโหราศาสตร์ไทยโบราณ ใช้ Sidereal zodiac |
| Julian Day (JD) | ระบบนับวันต่อเนื่องจากดาราศาสตร์ ไม่มี timezone |
| conditions[] | structured rules ระบุ planet + quality + aspect แบบ machine-readable |
| match_rules() | ฟังก์ชันจับคู่ดวงชาตากับ KB rules |
| Typhoon | Thai LLM (typhoon-v2-70b) ของ SCB Tech X |
| natal1 / natal2 | ดวงในหลัก (DB1) / ดวงเปรียบเทียบ (สมพงศ์, buffer) |
| Empirical DB | database เหตุการณ์จริงพร้อมตำแหน่งดาว สำหรับ validate กฎ → JULIAN |
| Provable prediction | คำพยากรณ์ระบุ timing ชัดเจน ตรวจสอบได้หลังเกิดจริง |
| H2 QR | QR format V3.2.1+ มี HMAC-SHA256 ป้องกันปลอม |

---

## Test rules (ก่อน claim done)

```
- "code compile ผ่าน" ≠ "feature ใช้งานได้"
- ห้าม claim feature เสร็จ ถ้ายังไม่ได้กดทดสอบจริง
- UI change → mobile test จริง (Chrome DevTools mobile mode ไม่พอ — iOS Safari quirks)
- Sandbox ไม่มี browser → ใส่ [ทดลองใช้] ใน handoff
```

---

## Tools & Scripts

| Path | หน้าที่ |
|---|---|
| `scripts/bump-version.mjs` | bump version ครบ 6 จุด |
| `scripts/check-version-sync.mjs` | verify version sync (CI ก็รัน) |
| `tools/kb_reviewer.html` | review 57 MISMATCH rules (mobile-ready) |
| `tools/julian_keygen.html` | สร้าง master_key data (JULIAN) |
| `tools/julian_scraper.html` | scrape บุคคลสำคัญ (JULIAN local backup) |
| `tools/hora_db_import.html` | import JULIAN data ลง horatad |
| `workers/julian_scraper.mjs` | Node scraper สำหรับ GitHub Actions (JULIAN automation) |

**Tools URL pattern:** `https://horatad.github.io/horatad/tools/<filename>.html`
**App URL:** `https://horatad.com/` (ไม่ใช่ github.io)

---

*Production: horatad.com · Tools: horatad.github.io/horatad/tools/ · CI: GitHub Actions (syntax + version sync)*
