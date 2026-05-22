# HORATAD — Technical Reference
**อัปเดต:** 2026-05-22 | **App version:** V3.3.12 | **URL:** horatad.com

> Vision / mission / roadmap → `ECOSYSTEM.md`
> Task list / status → `PROJECT_STATUS.md`
> ไฟล์นี้เก็บ **technical detail** ของ HORATAD เท่านั้น — Claude อ่านเมื่ออยู่ใน HORATAD session

---

## Stack

| Component | Technology |
|---|---|
| Frontend | Vanilla JS, PWA (no build step) — edit ตรง → push → GitHub Pages |
| Calculation Engine | `script.js` (legacy V2) + `v3/engine.js` (V3, ES module) |
| Knowledge Base | `v3/kb.json` (342 rules, 284 มี conditions, V2.3.0) |
| LLM | Typhoon v2 (primary) — fallback `compose_local_prediction()` ใน `v3/interpretation.js` |
| Auth | Cloudflare Workers (`horatad-auth`) — V3 tab PIN unlock |
| AI Proxy | Cloudflare Workers (`horatad-ai`) — Typhoon relay |
| Deploy | GitHub Pages (auto จาก `main`) — `https://horatad.com/` |
| Storage | localStorage (memory dedup) + IndexedDB |

### จุดเชื่อม V2 ↔ V3 (มีแค่ 2 จุด)
- `script.js` → `function getNatal(){return _natal;}` expose global
- `index.html` → tab-3 panel + `<script type="module" src="v3/v3tab.js">`

---

## Version bump checklist (ทุกครั้งที่ change)

bump `X.Y.Z` พร้อมกัน **6 จุด** — ถ้าไม่ตรง = reload loop:

| ไฟล์ | pattern |
|---|---|
| `script.js` | `HORATAD:SCRIPT:X.Y.Z` (l.1) + `Version X.Y.Z` (l.2) + `const APP_VERSION='X.Y.Z'` |
| `sw.js` | `HORATAD:SW:X.Y.Z` + `Version X.Y.Z` + `const CACHE_NAME='horatad-vX.Y.Z'` |
| `version.json` | `{"_id":"HORATAD:VERSION","v":"X.Y.Z"}` |
| `index.html` | 6 จุด — `HORATAD:INDEX`, `Version`, `style.css?v=`, `brand-ver`, `about-version`, `script.js?v=`, `v3tab.js?v=` (use `replace_all`) |
| `style.css` | `HORATAD:STYLE:X.Y.Z` (l.1) |
| `v3/v3tab.js` | bump เฉพาะตอนแก้ V3 logic — มี internal version (`Version 3.0.X`) แยก |

**Changelog**: prepend block ใน `script.js` header — `// Changes: [VX.Y.Z] <type>: <bullet>`
แล้วเพิ่ม entry ใน `docs/CHANGELOG.md` (newest บนสุด)

**Validator**: `scripts/check-version-sync.mjs` — CI block ถ้าไม่ตรง

---

## Cache-bust convention

ทุก asset URL ต้องมี `?v=APP_VERSION`:
- `index.html`: hardcode (`?v=X.Y.Z`)
- `sw.js` `CORE_ASSETS`: `'./X?v='+V` (auto จาก `CACHE_NAME.split('-').pop()`)
- ES module (v3tab.js): อ่านจาก `window.APP_VERSION`
  (top-level `const` ใน classic script ไม่อยู่บน window อัตโนมัติ — `script.js` ทำ `window.APP_VERSION=APP_VERSION;`)

ถ้า key ไม่ตรง 100% (เช่น SW cache `kb.json?v=2.2.39` แต่ module fetch `kb.json`) → offline ใช้ไม่ได้

---

## SW (Service Worker) Policy

### ALLOWED — default behavior
```
✓ install : cache → skipWaiting หลัง addAll เสร็จ
✓ activate: ลบเฉพาะ CACHE_NAME เก่า + clients.claim()
✓ fetch   : cache-first สำหรับ same-origin
✓ fetch   : bypass version.json (ต้องได้จาก network ตรงๆ ทุกครั้ง)
```

### FORBIDDEN — ห้ามใช้เด็ดขาด
```
✗ nuclear clear: caches.keys → delete all (ทำลาย offline)
✗ unregister self
✗ navigate() ใน activate (ลบทิ้งใน V2.2.28)
✗ network-first สำหรับ asset (เปลือง bandwidth + ช้า)
```

### SW Register (script.js)
- `updateViaCache:'none'` — bypass browser HTTP cache
- `reg.update()` หลัง register + `setInterval(()=>reg.update(), 60*60*1000)`
- URL: `./sw.js?v=`+APP_VERSION (bust CDN cache)

### Version check (version.json)
- `fetch('./version.json?t='+Date.now(), {cache:'no-store'})` ทุก load
- v !== APP_VERSION → `location.reload()` ทันที

---

## UI / UX rules

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

### Popup alert ค้าง
```
Error   → red glow keyframe (alert-blink)
Success → green glow keyframe (alert-blink-green)
แตะ backdrop → ปิด
```

### เสียง (audio feedback)
```
Web Audio API _playBeep(freq) — 6 levels
Global listener: click → button → _playBeep(700)
Exclude: numpad-key, v3-dev-overlay, button.disabled
Debounce 15ms (_lastBeepMs) กัน rapid fire
```

### Design tokens
- Colors: gold `#b8860b` · purple `#5b3fa0` · green `#1a6b3c` · transit-red `#f85149` · transit-blue `#1a56db` · bg-natal `#0d1117` · bg-transit `#160b28` · text `#c9d1d9` · muted `#8b949e`
- Fonts: Cinzel 600 (brand-en) · Sarabun+Noto Sans Thai 700 (brand-th) · Sarabun 400 (body)

---

## Share image (1080×1080 PNG)

```
QR        : left x=28, y=820, size 250×250 (ECC Level M, H2 HMAC signed)
Info      : right-aligned x=SZ-30, y=835 + 4 lines (36/26/26 spacing)
Score     : center y=958, 64px bold
Label     : center y=1030, 22px gray
horatad.com: center y=1060, 13px Cinzel #666
Filename  : horatad_<JD>_<HHMM>_<lat>.png
```

QR library: `qrcode.min.js` bundled local (V3.3.11 — เลิกพึ่ง CDN)

---

## QR payload format (H2 — HMAC-SHA256 signed, V3.3.x)

```
Format: <JSON_data>|<hmac_8hex>
JSON  : {"jd":2460000,"t":"13:45","lng":100.50,"fn":"ชื่อ"}
HMAC  : HMAC-SHA256(secret, JSON_data) — truncated 4 bytes → 8 hex chars
Secret: H2_SECRET='HTD-H2-2026-K1' (hardcoded ใน script.js l.1388)
ECC   : Level M (compress ผ่าน LINE ได้)
```

Verify on import:
- ✅ HMAC ตรง → toast "นำเข้าสำเร็จ"
- ⚠️ HMAC ไม่ตรง → ปฏิเสธ
- ⚠️ ไม่มี HMAC (รุ่นเก่า V1.4) → รับไว้แต่ toast "QR รุ่นเก่า — ไม่ได้ยืนยัน"

---

## Project quirks (ที่เคยทำ Claude สับสน)

- **Memory dedup key**: `${name}|${d}/${m}/${y_be}|${t}|${prov}`
  - แก้ field ที่เป็นส่วนของ key → สร้าง entry ใหม่
  - V2.2.38+ รองรับ edit mode ผ่าน `replaceKey` param

- **PIN auth**: V3 tab unlock ผ่าน CF Worker `horatad-auth`
  - ห้าม hardcode PIN ใน frontend
  - UI: popup เครื่องคิดเลข 🧮 numpad 6 หลัก
  - ผิด → clear ไม่แจ้ง error (anti-bruteforce)

- **Era toggle**: BE (พ.ศ.) ↔ CE (ค.ศ.)
  - input field เก็บตาม era ปัจจุบัน
  - memory เก็บ `y_be` เสมอ (ไม่เปลี่ยน schema)

- **Numpad commit**: `_setField()` ใช้ `.value=` ตรงๆ → ไม่ trigger `input` event
  - ถ้าต้องปลุก listener (เช่น DB indicator) ต้องเรียกเอง

- **iOS Safari `<input type="time">`**: บางครั้ง fire เฉพาะ `change` ไม่ใช่ `input`

- **iOS Safari `qrcodejs`**: สร้าง `<img>` ไม่ใช่ `<canvas>` — ต้องรอ `onload` ก่อน read pixels

---

## V3 engine pipeline (สรุป)

```
Step 1  get_lagna()              → ราศีลัคนา (0-11)
Step 2  get_all_houses()         → planet → house (1-12)
Step 3  compute_lagna_aspect()   → KUM | LENG | YOK | TRI | NONE
Step 4  compute_standard()       → อุจ/เกษตร/นิจ/ประเกษตร → std_score
Step 5  compute_manifestation()  → aspect_strength × house_importance × chart_strength
Step 6  sort_by_manifestation()  → priority list
Step 7  build_natal_payload()    → ตาม output_order
Step 8  overlay_transit()        → Q&A mode เท่านั้น
Step 9  send_to_typhoon()        → language layer (fallback: compose_local_prediction)
```

### Manifestation formula
```
manifestation    = aspect_strength × house_importance × chart_strength
chart_strength   = tanu_lagna_aspect × clamp(0.1, (std_score+5)/10, 1.0)
aspect_strength  : KUM=1.0  LENG=0.8  YOK=0.6  TRI=0.5  NONE→0.3 (inner_potential)
house_importance : H01=1.0  H07=0.8  H02=0.7  H03-05,09-11=0.5  H06,08,12=0.2
```

### Transit filter
```
กรอง 5 ดาวเท่านั้น: MR=1.0  SA=0.9  MA=0.7  RA=0.6  JU=0.5
SU=MO=ME=VE=KE=0.0 → ตัดออก
Transit = separate context channel ไม่รวม natal score
```

---

## M3 + M8 — Anti-hallucination pipeline

### M3 — Typhoon connector
- `v3/typhoon.js` = Typhoon API connector เท่านั้น
- ห้าม hardcode ข้อความพยากรณ์
- Response ต้องเป็น JSON → fail JSON parse 3 ครั้ง → **throw** (ไม่ return raw text)
- caller จับ throw → fallback to M8

### M8 — Keyword composition engine
- `v3/interpretation.js` → `compose_local_prediction(matched_rules)`
- Deterministic — ไม่เรียก LLM
- `text` = `rule.p` ทั้งหมด (ground truth ไม่เปลี่ยน)
- `keywords` = phrases แยกจาก `rule.p` ด้วย space/punctuation
- `polarity` = `+`/`-`/`~` จาก `t[]` tags + `conditions[]` (ไม่ใช่ text analysis)
- ใช้เป็น fallback เมื่อ Typhoon API ไม่พร้อม หรือ offline

```javascript
const preds = compose_local_prediction(matched_rules);
// [{rule_id, text, keywords, polarity, chapter, source:'local'}]

const summary = compose_summary_text(preds);
// → "ฉลาดเฉลียว มีเสน่ห์ แต่มีแนวโน้ม อีโก้สูง หยิ่งในศักดิ์ศรี"
```

### M7 — Empirical schema (ใน kb.json rule)
```json
"empirical_p":    0.73,    // P(trait | config), null = ไม่มีข้อมูล
"empirical_n":    47,      // sample size
"empirical_refs": ["JD:2451545.0"],  // Julian Days ที่ verify
"secondary_obs":  ["มักเป็นผู้นำองค์กร"]
```

ไฟล์ที่เกี่ยวข้อง: `v3/kb_skeletons.json` (90 rule skeletons รอ data), `scripts/gen_rule_skeletons.mjs`

---

## File identity headers (magic comment)

ตรวจสอบไฟล์ได้ทันทีด้วย `grep "HORATAD:" <file>`:

```
index.html        → <!-- HORATAD:INDEX:X.Y.Z -->
script.js         → // HORATAD:SCRIPT:X.Y.Z
sw.js             → // HORATAD:SW:X.Y.Z
style.css         → /* HORATAD:STYLE:X.Y.Z */
version.json      → {"_id":"HORATAD:VERSION","v":"X.Y.Z"}
v3/engine.js      → // HORATAD:ENGINE:X.Y.Z
v3/interpretation.js → // HORATAD:INTERP:X.Y.Z
v3/typhoon.js     → // HORATAD:TYPHOON:X.Y.Z
v3/v3tab.js       → // HORATAD:V3TAB:X.Y.Z
```

---

## Debug protocol (เมื่อ feature พังหลัง deploy)

1. Console → อ่าน error messages ทั้งหมด
2. ตรวจ URL ไฟล์โดยตรง: `horatad.com/v3/<filename>` — ต้องไม่ว่าง
3. ถ้าไฟล์ว่าง → re-upload ผ่าน GitHub web UI
4. DevTools → Application → Service Workers → Unregister → Ctrl+Shift+R
5. ทดสอบใน Console: `import('./v3/v3tab.js').catch(e=>console.error(e))`

---

## Testing reality

- **ไม่มี automated test suite** (มีแค่ CI: syntax + version sync)
- UI changes **ต้องทดสอบ mobile จริง** — Chrome DevTools mobile mode ไม่พอ (iOS Safari quirks)
- Sandbox container ไม่มี browser → Claude verify UI ไม่ได้ → ใส่ `[ทดลองใช้]` ใน handoff

### File-only rule
```
เปลี่ยน UI         → ทดสอบบนเบราว์เซอร์จริงก่อน claim ว่าเสร็จ
เปลี่ยน script.js → bump APP_VERSION + sw.js + version.json พร้อมกัน
เปลี่ยน v3/*       → bump label แท็บพยากรณ์ V3.XX [DD/MM/YY]
เปลี่ยน worker.js  → wrangler deploy แยก (ไม่ใช่ git push)
เปลี่ยน CNAME      → หยุดและถาม (กระทบ DNS ทันที)
```

---

## Nuclear options — ห้ามทำโดยไม่ confirm

```
- ล้าง cache ทั้งหมด (caches.keys → delete all)
- unregister SW
- เปลี่ยน fetch strategy cache-first → network-first
- clear localStorage ทั้งหมด
- force reload ทุก tab โดยไม่เตือน
- git push --force ไป main
- git reset --hard origin/main (local main quirk — ใช้ได้เพราะของเก่าเป็นขยะ)
```

---

## Glossary

| คำ | ความหมาย |
|---|---|
| สุริยยาตร์ | ระบบโหราศาสตร์ไทยโบราณ ใช้ Sidereal zodiac |
| Julian Day (JD) | ระบบนับวันต่อเนื่องจากดาราศาสตร์ ไม่มี timezone |
| conditions[] | structured rules ที่ระบุ planet + quality + aspect แบบ machine-readable |
| match_rules() | ฟังก์ชันจับคู่ดวงชาตากับ KB rules |
| Typhoon | Thai LLM (typhoon-v2-70b) ของ SCB Tech X |
| LoRA | Low-Rank Adaptation — fine-tune เฉพาะ ~1% ของ model parameters |
| Empirical DB | database เหตุการณ์จริงพร้อมตำแหน่งดาว (JULIAN project) |
| Secondary rules | กฎจาก statistical analysis ของ empirical DB |
| Provable prediction | พยากรณ์ที่ระบุ timing ชัดเจน ตรวจสอบได้หลังเกิดจริง |

---

*PDCA experiment log → `docs/CASE_STUDIES.md`*
