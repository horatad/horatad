# Horatad — Project Notes for Claude

โหราทาส: เครื่องผูกดวงโหราศาสตร์ไทย (สุริยยาตร์) + PWA + แท็บพยากรณ์ V3
ภาษาคุย/commit/comment: ไทย (mix Eng เฉพาะ technical term)

---

## 🤖 AUTONOMY MODE — ทำเอง ไม่ถาม

User ไม่อยากเฝ้า — ทุก session ทำตามนี้

### Session lifecycle
1. **เริ่ม** → อ่าน `CLAUDE.md` (ไฟล์นี้) + `session_handoff_*.md` ล่าสุด → เลือกงานสูงสุดที่ทำได้เอง
2. **ทำ** → code + test + verify (ภายใน sandbox)
3. **Commit** → push feature branch + ff main + backup branch (`backup/vX.Y.Z`)
4. **ถ้ามี task เหลือเวลา** → ทำต่อตาม priority list (loop ข้อ 2-3)
5. **จบ session** → update / สร้าง `session_handoff_<date>_v<n>.md` ใหม่ ตาม template

### Priority algorithm (เลือกงานจาก handoff ลำดับนี้)
1. **Bug ที่ Claude ทำได้** (ไม่ใช่ DEFERRED, ไม่ใช่ ทดลองใช้)
2. **Feature/req ที่ Claude ทำได้** ตามลำดับ pin ใน handoff หรือเลข req น้อย→มาก
3. **Infra/quality** (CI, docs, refactor — น้ำหนักต่ำกว่า bug/feature)
4. **Partial-feasible** (เขียน code ส่วนที่ทำได้ ทิ้ง deploy/data step ให้ user ใน handoff)

### ทำไม่ได้ใน sandbox → skip ทันที (ไม่ถาม) แล้ว note ใน handoff
- Mobile testing → `[ทดลองใช้] ทดสอบ X บนมือถือ`
- Cloudflare account ops (Worker deploy, Access, DNS) → `[ทดลองใช้] CF: X`
- Real browser DevTools → `[ทดลองใช้] debug X ใน DevTools`
- ต้องการ data file จาก user → `[BLOCKED] req X รอไฟล์ <name>.json`

### ต้องถามก่อน (ขีดเขตปลอดภัย — มีแค่นี้)
- ลบไฟล์/branch ที่อาจมีงาน user (ไม่ใช่ขยะชัดเจน)
- Breaking change ต่อ data schema / public API ที่ user ปลายทางใช้
- Architecture lock-in ระยะยาว (เปลี่ยน framework, auth model)
- เรื่องเงิน (paid service, plan change)

### ห้ามเด็ดขาด
- `git push --force` ไป main
- ลบ branch `backup/*`
- Commit ไฟล์ที่มี secret (token, API key)
- Skip CI (`--no-verify`) เว้นแต่ user สั่ง

### Deploy strategy — batch minor fixes (ประหยัด token)

**deploy ≠ กิน token** — แต่ version bump 6 ไฟล์ต่อ 1 release = overhead สูง

| โหมด | เมื่อไหร่ | action |
|---|---|---|
| **batch** | fix เล็ก / logic / ไม่ต้องทดสอบมือถือด่วน | เขียนโค้ดสะสม ไม่ bump จนกว่าจะได้กลุ่ม |
| **deploy ทันที** | milestone / user ต้องทดสอบมือถือ / feature ใหม่ครบ | bump + push ทันที |

**กฎ: ถ้า fix น้อยกว่า 3 อย่างและไม่มี user รอทดสอบ → batch ก่อน อย่า bump ทันที**

⚠️ Claude ต้องแนะนำ batch ให้ user ทุกครั้งที่เห็นว่าเหมาะ — ไม่ต้องรอให้ user ถาม
ตัวอย่าง: "fix นี้เล็ก แนะนำ batch กับ fix ถัดไปก่อน deploy — ประหยัด token และ version bump"

---

### Token efficiency — best practices + tradeoffs

#### 1. grep ก่อน read เสมอ (script.js ใหญ่มาก)
```bash
grep -n "function _calcChart" script.js   # หา line number ก่อน
Read script.js offset=1170 limit=40       # อ่านเฉพาะส่วนที่ต้องการ
```
⚠️ **tradeoff**: ถ้า line number ใน handoff เก่า (โค้ดขยับ) → Claude อ่านผิดที่ → แก้ผิด context
**แก้**: Claude ต้อง grep verify ก่อนเสมอ ไม่ใช้ line number จาก handoff ตรงๆ

#### 2. handoff มี line number + function name ของ bug
```markdown
[ ] bug: _editingUid ค้าง — script.js:~1199 fn:_calcChart else-branch
```
⚠️ **tradeoff**: maintenance burden — ทุก session ต้องอัปเดตถ้าโค้ดเปลี่ยน
**แก้**: ใส่ `~` นำ line number (approximate) + function name เป็น anchor หลัก

#### 3. scope session ชัดก่อนเริ่ม
บอก Claude ว่า session นี้ทำอะไร — Claude ไม่ต้อง explore ไกล
⚠️ **tradeoff**: ถ้าเจอ bug นอก scope → ต้องหยุด note ใน handoff แล้วเปิด session ใหม่
**แก้**: ถ้า bug เล็กมาก (1–2 บรรทัด) Claude แก้ inline ได้ แต่ note ใน handoff

#### 4. แยก session type
| type | งาน |
|---|---|
| code | เขียน/แก้โค้ด batch หลาย fix |
| review | ตรวจ logic / audit อย่างเดียว |
| deploy | bump + push + handoff อย่างเดียว |
⚠️ **tradeoff**: งานเล็กต้องใช้หลาย session — overhead สูงกว่า
**แก้**: ใช้เฉพาะ project ใหญ่หรือ session ที่ context เริ่มหนัก

#### 5. CLAUDE.md = long-term memory (ใช้ด้วยความระวัง)
ตัดสินใจถาวร → เขียนลงทันที ไม่ต้องถามซ้ำทุก session
⚠️ **tradeoff**: CLAUDE.md โตเรื่อยๆ → อ่านหนักทุก session start / rule เก่าอาจขัดแย้ง rule ใหม่
**แก้**: review + trim CLAUDE.md ทุก major version — ลบ rule ที่ไม่ใช้แล้ว

#### สรุปความเสี่ยงรวม
> ถ้า handoff + CLAUDE.md ไม่ถูก maintain → Claude เริ่ม session ด้วยข้อมูลเก่า → ตัดสินใจผิดโดยไม่รู้ตัว
> Claude ต้องแจ้งทันทีถ้าพบว่า line number หรือ context ใน handoff ไม่ตรงกับโค้ดจริง

---

### Session limit self-assessment (ไม่มี precise counter)
Claude **ไม่มี tool ดู token usage จริง** — ใช้ heuristic แทน:

| Signal | Action |
|---|---|
| ทำ 2+ major task (push main แล้ว) ใน session เดียว | checkpoint: update handoff + แจ้ง user "พร้อมเปิด session ใหม่" |
| สังเกต compress event (summary tag ใน context) | finish task ปัจจุบัน → handoff → stop |
| ต้อง re-read ไฟล์ใหญ่ (script.js 330KB) 3+ ครั้งใน task เดียว | finish task + checkpoint |
| ทุก PENDING เหลือแต่ ทดลองใช้ / BLOCKED / DEFERRED | handoff + รอ user (ไม่มีงานทำได้) |
| User เงียบหลัง checkpoint + ไม่มี signal อะไร | จบเงียบๆ ไม่ต้องพูดเยอะ |

หลัง **checkpoint แล้ว** ผู้ใช้ยังให้ทำต่อ → ทำได้ (เป็น user decision)

---

## Stack

- **Frontend**: vanilla JS, no build step. ทุกอย่าง edit ตรง — push → GitHub Pages deploy
- **Service Worker**: `sw.js` — cache-first สำหรับ same-origin, network-first สำหรับ `version.json`
- **Worker (separate repo)**: `horatad-ai` + `horatad-auth` (Cloudflare Workers) — deploy ผ่าน wrangler **ไม่ใช่** git push
- **V3 module**: `v3/*.js` เป็น ES module (v3tab.js, engine.js, interpretation.js, typhoon.js)
- **Production URL**: `https://horatad.github.io/horatad/` (deploy from main branch)

---

## Git workflow (standing instructions — ห้ามถามซ้ำ)

**Branch**:
- พัฒนาบน feature branch ที่ harness ระบุไว้ (เช่น `claude/fix-xxx-XXXX`)
- ห้ามแก้บน main โดยตรง

**Auto-deploy ทุก commit** (ผู้ใช้ confirm แล้ว — ทำเงียบๆ ไม่ถาม):
```bash
git push -u origin <feature-branch>
git push origin <feature-branch>:main           # ff main
git push origin <SHA>:refs/heads/backup/vX.Y.Z  # backup branch
git checkout main && git reset --hard origin/main && git checkout <feature-branch>  # sync local main
```

**Backup**:
- ใช้ **branch** ชื่อ `backup/vX.Y.Z` (git tag push เจอ 403 ใน sandbox นี้)
- backup ครั้งเดียวต่อ version — branch ใหม่ทุกครั้งที่ bump version

**Local main quirk**: เคยมี "Add files via upload" commits จาก GitHub UI ค้างใน local
ถ้าเจอ divergence ให้ `git reset --hard origin/main` (ของเก่าเป็นขยะ ไม่ใช่งาน)

---

## Version bump checklist (ทุกครั้งที่มี change)

bump `X.Y.Z` พร้อมกัน **6 จุด**:

| ไฟล์ | pattern |
|---|---|
| `script.js` | `HORATAD:SCRIPT:X.Y.Z` (l.1) + `Version X.Y.Z` (l.2) + `const APP_VERSION='X.Y.Z'` |
| `sw.js` | `HORATAD:SW:X.Y.Z` + `Version X.Y.Z` + `const CACHE_NAME='horatad-vX.Y.Z'` |
| `version.json` | `{"_id":"HORATAD:VERSION","v":"X.Y.Z"}` |
| `index.html` | 6 จุด — `HORATAD:INDEX`, `Version`, `style.css?v=`, `brand-ver`, `about-version`, `script.js?v=`, `v3tab.js?v=` (use `replace_all`) |
| `style.css` | `HORATAD:STYLE:X.Y.Z` (l.1) |
| `v3/v3tab.js` | bump เฉพาะตอนแก้ V3 logic — มี internal version (`Version 3.0.X`) แยก |

**Changelog**: prepend block ใน `script.js` header — `// Changes: [VX.Y.Z] <type>: <bullet>...`

---

## Cache-bust convention

ทุก asset URL ต้องมี `?v=APP_VERSION`:
- ใน `index.html`: hardcode (`?v=2.2.39`)
- ใน `sw.js` `CORE_ASSETS`: `'./X?v='+V`
- ใน ES module (เช่น v3tab.js): อ่านจาก `window.APP_VERSION` (top-level `const` ใน classic script **ไม่อยู่บน window อัตโนมัติ** — `script.js` ต้องทำ `window.APP_VERSION=APP_VERSION;` เสมอ)

ถ้า key ไม่ตรงกัน 100% (เช่น SW cache `kb.json?v=2.2.39` แต่ module fetch `kb.json`) → offline ใช้ไม่ได้

---

## Project quirks

- **Memory dedup key**: `${name}|${d}/${m}/${y_be}|${t}|${prov}` — ถ้าแก้ field ที่เป็นส่วนของ key จะสร้าง entry ใหม่ (V2.2.38 รองรับ edit mode ผ่าน `replaceKey` param)
- **PIN auth**: V3 tab unlock ผ่าน Cloudflare Worker `horatad-auth` (ห้าม hardcode PIN ใน frontend)
- **Era toggle**: BE (พ.ศ.) ↔ CE (ค.ศ.) — input field เก็บตาม era ปัจจุบัน แต่ memory เก็บ y_be เสมอ
- **Numpad commit**: `_setField()` ใช้ `.value=` ตรงๆ → ไม่ trigger `input` event → ถ้าต้องปลุก listener (เช่น DB indicator) ต้องเรียกเอง
- **iOS Safari `<input type="time">`**: บางครั้ง fire เฉพาะ `change` ไม่ใช่ `input`

---

## Pending bugs / backlog

ดู `session_handoff_*.md` (ไฟล์ล่าสุดของวัน) — ต้องจัดตาม **template ด้านล่าง** เพื่อให้ Claude เลือก task ได้เร็ว

---

## Handoff template (ใช้ทุก session)

ไฟล์: `session_handoff_<YYYYMMDD>_v<n>.md` (n = session ที่เท่าไหร่ของวัน)

```markdown
# Horatad — Session Handoff
# Date: YYYY-MM-DD (session N ของวัน)
# Previous: <ชื่อไฟล์ก่อนหน้า>

## STATE
App version : VX.Y.Z (main + deployed)
Backups     : backup/vX.Y.Z, ...

## DONE (session นี้)
✓ ...

## PENDING — 🟢 Claude ทำเองได้ (sandbox)
[ ] req X — <scope สั้นๆ>
[ ] bug Y — <ที่ไฟล์ไหน บรรทัดไหน>
(เรียงตาม priority — บนสุดทำก่อน)

## PENDING — 🔴 [ทดลองใช้] / [BLOCKED]
[ ] [ทดลองใช้] ทดสอบ VX.Y.Z บนมือถือ (V2.2.37 indicator, etc.)
[ ] [ทดลองใช้] CF: deploy horatad-ai Worker
[ ] [BLOCKED] req 16 รอไฟล์ historical-records.json
[ ] [BLOCKED] req 17 รอ ephemeris reference data

## DEFERRED — รอ "รอบใหญ่" / dependency
[ ] FLICKER (desktop only) — รอบใหญ่ + root cause horatad.com
[ ] req 11 interp.js → Worker — รอ format นิ่ง
```

**กฎ:**
- งาน DEFERRED **ห้าม** จับมาทำเอง — เป็น user decision
- งาน ทดลองใช้ / BLOCKED **ห้าม** ถาม user — ปล่อยใน handoff รอ user resolve
- หลังจบ task ให้ย้ายจาก PENDING → DONE ใน handoff เดิม หรือสร้าง handoff ใหม่ของ session ถัดไป

---

## Testing

- ไม่มี automated test suite (มีแค่ CI: syntax + version sync)
- UI changes ต้องทดสอบ mobile จริง — Chrome DevTools mobile mode ไม่พอ (iOS Safari quirks)
- Sandbox container ไม่มี browser → Claude verify UI ไม่ได้ → ใส่ `[ทดลองใช้]` ใน handoff
