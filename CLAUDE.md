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
1. **Bug ที่ Claude ทำได้** (ไม่ใช่ DEFERRED, ไม่ใช่ USER ONLY)
2. **Feature/req ที่ Claude ทำได้** ตามลำดับ pin ใน handoff หรือเลข req น้อย→มาก
3. **Infra/quality** (CI, docs, refactor — น้ำหนักต่ำกว่า bug/feature)
4. **Partial-feasible** (เขียน code ส่วนที่ทำได้ ทิ้ง deploy/data step ให้ user ใน handoff)

### ทำไม่ได้ใน sandbox → skip ทันที (ไม่ถาม) แล้ว note ใน handoff
- Mobile testing → `[USER ONLY] ทดสอบ X บนมือถือ`
- Cloudflare account ops (Worker deploy, Access, DNS) → `[USER ONLY] CF: X`
- Real browser DevTools → `[USER ONLY] debug X ใน DevTools`
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

## PENDING — 🔴 [USER ONLY] / [BLOCKED]
[ ] [USER ONLY] ทดสอบ VX.Y.Z บนมือถือ (V2.2.37 indicator, etc.)
[ ] [USER ONLY] CF: deploy horatad-ai Worker
[ ] [BLOCKED] req 16 รอไฟล์ historical-records.json
[ ] [BLOCKED] req 17 รอ ephemeris reference data

## DEFERRED — รอ "รอบใหญ่" / dependency
[ ] FLICKER (desktop only) — รอบใหญ่ + root cause horatad.com
[ ] req 11 interp.js → Worker — รอ format นิ่ง
```

**กฎ:**
- งาน DEFERRED **ห้าม** จับมาทำเอง — เป็น user decision
- งาน USER ONLY / BLOCKED **ห้าม** ถาม user — ปล่อยใน handoff รอ user resolve
- หลังจบ task ให้ย้ายจาก PENDING → DONE ใน handoff เดิม หรือสร้าง handoff ใหม่ของ session ถัดไป

---

## Testing

- ไม่มี automated test suite (มีแค่ CI: syntax + version sync)
- UI changes ต้องทดสอบ mobile จริง — Chrome DevTools mobile mode ไม่พอ (iOS Safari quirks)
- Sandbox container ไม่มี browser → Claude verify UI ไม่ได้ → ใส่ `[USER ONLY]` ใน handoff
