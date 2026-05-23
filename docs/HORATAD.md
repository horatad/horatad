# HORATAD — Technical Reference for Claude
# อัปเดต: 2026-05-23 | app V3.3.23
# Claude อ่านไฟล์นี้เมื่ออยู่ใน HORATAD session

---

## Stack

- Frontend: Vanilla JS, no build step — edit ตรง → push → GitHub Pages deploy
- Service Worker: `sw.js` — cache-first สำหรับ same-origin, network-first สำหรับ `version.json`
- CF Workers: `horatad-ai` + `horatad-auth` — deploy ผ่าน wrangler **ไม่ใช่** git push
- V3 modules: `v3/*.js` (v3tab.js, engine.js, interpretation.js, typhoon.js, tts.js) เป็น ES module
- Production URL: https://horatad.com (ทดสอบที่นี่เสมอ — ห้ามบอก horatad.github.io สำหรับ app หลัก)

---

## Session Tips (HORATAD-specific)

- **`script.js` ใหญ่** (~200KB หลัง KB extract V3.3.23, เดิม 393KB) — grep ก่อน read เสมอ, อย่าโหลดทั้งไฟล์
- **Version bump = 6 ไฟล์ sync พร้อมกัน** (ดู Version Bump Checklist ด้านล่าง) — overhead สูง batching จึงสำคัญ
- **KB load เป็น async** (V3.3.23+) — `_loadEmbeddedKB()` ที่ init → ใช้ guard `if(!_kbRules)return` ทุกที่ที่ใช้ KB
- **Production URL = horatad.com** — ทุก test instruction ใช้ URL นี้, ห้ามแนะนำ horatad.github.io สำหรับ app หลัก

---

## Version Bump Checklist

bump `X.Y.Z` พร้อมกัน **6 จุด**:

| ไฟล์ | pattern |
|---|---|
| `script.js` | `HORATAD:SCRIPT:X.Y.Z` (l.1) + `Version X.Y.Z` (l.2) + `const APP_VERSION='X.Y.Z'` |
| `sw.js` | `HORATAD:SW:X.Y.Z` + `Version X.Y.Z` + `const CACHE_NAME='horatad-vX.Y.Z'` |
| `version.json` | `{"_id":"HORATAD:VERSION","v":"X.Y.Z"}` |
| `index.html` | 6 จุด — HORATAD:INDEX, Version, style.css?v=, brand-ver, about-version, script.js?v=, v3tab.js?v= (use `replace_all`) |
| `style.css` | `HORATAD:STYLE:X.Y.Z` (l.1) |
| `v3/v3tab.js` | bump เฉพาะตอนแก้ V3 logic — มี internal version (`Version 3.0.X`) แยก |

**Changelog:** prepend ใน script.js header — `// Changes: [VX.Y.Z] <type>: <bullet>...`

ตรวจ identity ด้วย: `grep "HORATAD:" filename`

---

## Cache-bust Convention

ทุก asset URL ต้องมี `?v=APP_VERSION`:
- `index.html`: hardcode (`?v=X.Y.Z`)
- `sw.js` CORE_ASSETS: `'./X?v='+V`
- ES module (เช่น v3tab.js): อ่านจาก `window.APP_VERSION`
  (`const` ใน classic script ไม่อยู่บน window อัตโนมัติ — script.js ต้องทำ `window.APP_VERSION=APP_VERSION;`)

ถ้า SW cache key ไม่ตรงกัน 100% → offline ใช้ไม่ได้

---

## SW Policy

```
✓ install : cache → skipWaiting หลัง addAll เสร็จ
✓ activate: ลบเฉพาะ CACHE_NAME เก่า + clients.claim()
✓ fetch   : cache-first, bypass version.json
✗ nuclear clear (caches.keys → delete all) — ห้ามใช้
✗ unregister self — ห้ามใช้
✗ navigate() ใน activate — ลบทิ้งใน V2.2.28
```

SW Register (script.js): ใช้ `updateViaCache:'none'` + `reg.update()` หลัง register + `setInterval(reg.update, 3600000)`

---

## QR Payload — H2 Format (current)

URL: `https://horatad.github.io/horatad/?h=H2|{hmac}|{jd}|{t}|{lat}|{lng}|{g}|{name}`

- hmac: HMAC-SHA256(H2_SECRET, `${jd}|${t}|${lat}|${lng}|${g}|${name}`) slice 0-8 hex
- ECC: Level M (ไม่ใช่ H — Thai UTF-8 3 bytes/char ทำ payload โตเกิน H รองรับ)
- H1 เก่า: รับได้พร้อม warning

---

## Share Image (1080×1080 PNG)

```
QR        : left 28, y=835, size 110×110
Info      : right-aligned x=SZ-30, y=835 + 4 lines (36/26/26 spacing)
Score     : center y=958, 64px bold
Label     : center y=1030, 22px gray
horatad.com: center y=1060, 13px Cinzel #666
Filename  : horatad_{JD}_{HHMM}_{lat}.png
```

---

## UI/UX Rules

### สีปุ่ม
```
ทำลาย (delete/clear/reset)  → #f85149 แดง
สร้าง/เพิ่ม (add/save)       → #2ea043 เขียว
หลัก action ของ app          → #5b3fa0 ม่วง
```

### Tag Chip
```
Inactive → bg #2a2a2e, border #3d3d44, text #8b949e
Active   → bg #5b3fa0, border #7b5fc0, text #fff bold
Add new  → border dashed #2ea043, text #56d364
```

### Popup Alert
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
Debounce 15ms (_lastBeepMs)
```

---

## Design Tokens

```
Colors: gold #b8860b · purple #5b3fa0 · green #1a6b3c
        transit-red #f85149 · transit-blue #1a56db
        bg-natal #0d1117 · bg-transit #160b28
        text #c9d1d9 · muted #8b949e
Fonts:  Cinzel 600 (brand-en) · Sarabun+Noto Sans Thai 700 (brand-th) · Sarabun 400 (body)
```

---

## Project Quirks

- **Memory dedup key**: `${name}|${d}/${m}/${y_be}|${t}|${prov}` — แก้ field ที่เป็น key → entry ใหม่ (V2.2.38 รองรับ edit mode ผ่าน `replaceKey` param)
- **PIN auth**: V3 tab unlock ผ่าน CF Worker horatad-auth — ห้าม hardcode PIN ใน frontend ⚠️ GUARD audit 2026-05-23: DevTools workaround พบ (ลบ `hidden` class = unlock ไม่ต้อง PIN) — รอ intent decision → `docs/cia/horatad_auth_audit_2026-05-23.md`
- **Era toggle**: BE ↔ CE — input field เก็บตาม era ปัจจุบัน แต่ memory เก็บ y_be เสมอ
- **Numpad commit**: `_setField()` ใช้ `.value=` ตรงๆ → ไม่ trigger `input` event → listener ต้องเรียกเอง
- **iOS Safari `<input type="time">`**: บางครั้ง fire เฉพาะ `change` ไม่ใช่ `input`

---

## Coding Standards

```
Global state: _camelCase นำด้วย underscore
Indent 2 spaces, single quote, semicolon mandatory
V3 modules: export function / import { } from pattern
Error: sanitize input → graceful fail → console.warn + toast
```

---

## Knowledge Base (KB)

- V2.3.0: 342 rules — TRUE_RULE: 104, TRANSIT_RULE: 49, CASE_STUDY: 122, HOUSE_CONCEPT: 50
- conditions[] coverage: 284/342 (83%)
- ไฟล์หลัก: `v3/kb.json` · M8 engine: `v3/interpretation.js` · skeletons: `v3/kb_skeletons.json`

Schema:
```json
{
  "id": 5009,
  "rule_type": "TRUE_RULE",
  "c": "ดาวอาทิตย์กุมลัคนา",
  "p": "หยิ่งในศักดิ์ศรี รักหน้า อีโก้สูง",
  "t": ["อาทิตย์", "ดี", "ลัคนา"],
  "conditions": [{"planet_id":"1","quality_required":"ANY","lagna_aspect_req":"กุมลัคนา","required":true}],
  "pr": 1
}
```

---

## M7 — Empirical Validation

Pipeline: Julian Day DB → `match_rules()` → ตรวจ event_label ตรง rule.p → `empirical_p = hits/(hits+miss)`

Optional fields: `empirical_p` (0.73) · `empirical_n` (47) · `empirical_refs` (["JD:..."]) · `secondary_obs`

---

## M8 — Keyword Engine (`v3/interpretation.js`)

```javascript
compose_local_prediction(matched_rules)
// → [{rule_id, text, keywords, polarity, source:'local'}]

compose_summary_text(preds)
// → "ฉลาดเฉลียว มีเสน่ห์ แต่มีแนวโน้ม อีโก้สูง"
```

- `text` = rule.p ทั้งหมด (ground truth — ไม่เปลี่ยน)
- `polarity` = +/-/~ จาก t[] + conditions[] (ไม่ใช่ text analysis)
- ใช้เป็น fallback เมื่อ Typhoon ไม่พร้อม หรือ offline mode

---

## Glossary

| คำ | ความหมาย |
|---|---|
| สุริยยาตร์ | ระบบโหราศาสตร์ไทยโบราณ ใช้ Sidereal zodiac |
| Julian Day (JD) | ระบบนับวันต่อเนื่องจากดาราศาสตร์ ไม่มี timezone |
| conditions[] | structured rules ที่ระบุ planet + quality + aspect แบบ machine-readable |
| match_rules() | ฟังก์ชันจับคู่ดวงชาตากับ KB rules |
| Typhoon | Thai LLM (typhoon-v2-70b) ของ SCB Tech X |
| LoRA | Low-Rank Adaptation — fine-tune ~1% ของ model parameters |
| Empirical DB | database เหตุการณ์จริงพร้อมตำแหน่งดาว สำหรับ validate กฎ |
| Provable prediction | พยากรณ์ที่ระบุ timing ชัดเจน ตรวจสอบได้หลังเกิดจริง |
