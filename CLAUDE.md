# Horatad — Project Notes for Claude

โหราทาส: เครื่องผูกดวงโหราศาสตร์ไทย (สุริยยาตร์) + PWA + แท็บพยากรณ์ V3
ภาษาคุย/commit/comment: ไทย (mix Eng เฉพาะ technical term)

---

## 🗂️ Project Structure — หลายโครงการใน repo เดียว

**ลำดับการอ่านไฟล์ก่อนเริ่ม session:**
1. `ECOSYSTEM.md` — architecture + data flow + vision รวม (อ่านเพื่อเข้าใจภาพรวม)
2. `PROJECT_STATUS.md` — task list รายวัน (เลือกงานจากนี้)
3. `handoffs/<PROJECT>_*.md` ล่าสุด — context จาก session ก่อน

| Code | ชื่อเต็ม | หน้าที่ |
|---|---|---|
| **HORATAD** | Horatad PWA | App หลัก — launch, UX, deploy (horatad.com) |
| **BIBLE** | Prediction Wording Engine | KB rules → keywords → LLM wordings |
| **JULIAN** | Empirical Astro Database | Julian Day + planet data + บุคคลสำคัญ |
| **NOK** | Voice Narration Engine | text พยากรณ์ → เสียงพูด (Web Speech → cloud TTS → audio export) |
| **PLATFORM** | Training + Chatbot + Content | กระจาย prediction ทุกช่องทาง (Phase 2+) |
| **GUARD** | Security + Performance Watchdog | ตรวจสอบ+เฝ้าระวัง ปลอดภัย+เร็ว ทั้ง ecosystem (cross-cutting) — charter: `docs/GUARD_MISSION.md` |

**Handoff files:** `handoffs/<PROJECT>_<YYYYMMDD>_v<n>.md`
- ตัวอย่าง: `handoffs/HORATAD_20260521_v2.md`, `handoffs/BIBLE_20260522_v1.md`
- เวลาสร้าง handoff ต้องระบุ project code ใน filename เสมอ
- อัปเดต `PROJECT_STATUS.md` ด้วยทุกครั้งที่จบ session

---

## 🔄 Version Policy — อัปเดตทันทีไม่ต้องถาม

โปรเจคเพิ่งเริ่ม ไม่มี legacy — พบอะไรล้าสมัยให้แก้เลย:
- GitHub Actions: Node.js, actions/checkout, actions/setup-node → ใช้ latest LTS เสมอ
- npm package ใน workflow (`@latest`) → คงไว้ (pull latest ทุก run)
- dependency ใน package.json (ถ้ามีในอนาคต) → bump minor/patch ได้เลย, major ถามก่อน

---

## 🌐 HTML Tools — standing rule

tools/*.html ทุกไฟล์ deploy บน GitHub Pages เสมอ
**ห้ามบอก "เปิดใน browser ได้เลย"** — ต้องส่ง URL นี้เสมอ:
`https://horatad.github.io/horatad/tools/<filename>.html`

**App หลัก** (index.html / PWA) ทดสอบที่ **horatad.com** เสมอ — ห้ามบอก horatad.github.io สำหรับ app หลัก

---

## 🔁 GitHub Actions Debug — standing rules

workflow ทดสอบได้แค่ตอน run จริง (ไม่มี local CF token) → bug เจอทีละ run

### อ่าน log ให้ถูก
- screenshot ที่มี **line numbers + step content** = log จริงของ step ที่ขยายแล้ว ✅
- **ไม่ต้องขอ screenshot ซ้ำ** — ถ้า user ส่ง step log มาแล้วให้วิเคราะห์เลย
- Annotations tab = สรุป summary เท่านั้น ไม่มี line detail

### แก้ให้ครบในรอบเดียว
- อ่าน log แล้วระบุ **ทุก error ที่เห็น** ก่อน fix
- แก้ทุกอย่างใน commit เดียว — ไม่แก้ทีละ bug แล้วรอ run ถัดไป
- ถ้าเห็น warning + error ในคราวเดียวกัน ให้แก้ทั้งคู่พร้อมกัน

### pattern ที่เคยเกิด (JULIAN workflow)
- Run #1: env scope (secret ไม่ถึง condition)
- Run #2: SPARQL QID ผิด
- Run #3: Node.js version เก่า
- Run #4: `CF_API_TOKEN` deprecated → ต้องใช้ `CLOUDFLARE_API_TOKEN`

---

## 🌐 Sandbox Network — standing rules (ทุก project)

### Sandbox คืออะไร
- Sandbox = cloud container ที่รัน Claude Code — **ไม่ใช่ branch** (branch คือแค่ git pointer)
- Network policy = "Trusted" (outbound ได้ทุก URL) แต่ target service อาจ block sandbox IP เอง

### LLM connectivity จาก sandbox — verified 2026-05-22
| Service | จาก Sandbox | เหตุผล |
|---|---|---|
| `api.opentyphoon.ai` (direct) | ❌ 403 | Typhoon allowlist เฉพาะ Cloudflare Worker IPs |
| `horatad-ai.uchujaro5.workers.dev` | ❌ 403 | CF Worker ตรวจ Origin — sandbox ไม่มี |
| `api.groq.com` | ✅ reachable | no IP restriction (ต้องมี key) |
| Browser → CF Worker → Typhoon | ✅ | proven path ของ app |

### กฎ: ก่อน propose LLM integration ใหม่
1. **Map production path ก่อนเสมอ** — app ใช้ path ไหน? → sandbox ควรลอง path เดิมก่อน
2. **อย่า assume** ว่า sandbox เรียก service ได้ถ้ายังไม่ทดสอบ
3. **ทดสอบก่อนบอก user** ว่า "ทำได้" — ถ้าทดสอบไม่ได้ให้บอกตรงๆ ว่าไม่แน่ใจ
4. **Browser tool = proven path** สำหรับ Typhoon ทุก project — ใช้ pattern เดียวกับ `tools/m0_hallucination_test.html`

### Keys ที่มีใน sandbox env (ตรวจสอบด้วย `env | grep KEY`)
- `TYPHOON_SERVER_KEY` ✅ มี — แต่ Typhoon block sandbox IP อยู่ดี
- `GROQ_API_KEY` ❌ ไม่มี — ต้องเพิ่มถ้าต้องการ Groq จาก sandbox

---

## ⚠️ Claude Code Web vs CLI — ลำดับความสำคัญ

**เมื่อรันบน Claude Code Web (harness มี system prompt ของตัวเอง):**
- Harness git instructions **บังคับ feature branch** สำหรับการ develop — Claude ต้อง commit บน feature branch ที่ harness ระบุ
- **แต่ user มี standing authorization** (ประกาศใน session 2026-05-23):
  > **"do not miss to push everything to main"** — ทุก commit ต้อง ff main เสมอ ไม่ลืม
- ดังนั้นลำดับการ push ใน web session ทุก commit:
  1. `git push -u origin <feature-branch>` (ตาม harness rule)
  2. `git push origin <feature-branch>:main` (ff main — user authorized standing)
  3. `git push origin <SHA>:refs/heads/backup/<tag>` (backup ตาม milestone)
- ถ้า ff main fail (main ขยับ) → fetch + rebase หรือ merge แล้วลองอีก ไม่ปล่อยค้าง
- Philosophy, autonomy mode, git workflow → ยังใช้ได้ทั้ง web และ CLI
- Stack, version bump, cache-bust, quirks → ดู `docs/HORATAD.md`
- Session management / handoff → ใช้ได้ทั้งสอง แต่ web session ไม่มี compress signal แบบ CLI

**เมื่อรันบน Claude Code CLI (local):**
- ทุกอย่างใน CLAUDE.md ใช้ตามปกติ

---

## 👑 BIG = Admin Role (standing instruction, 2026-05-23)

**BIG session มีอำนาจ admin ครอบคลุมทุก project** — รับผิดชอบให้แน่ใจว่า:
1. ✅ **ทุก commit ของทุก session ต้องลง main** — ไม่ปล่อยค้างบน feature branch
2. ✅ ตรวจ `git log origin/main..HEAD` ก่อนปิด session เสมอ — ถ้ามี commit ที่ยังไม่อยู่ใน main → push ทันที
3. ✅ **session ใหม่ต้องเห็นงานเก่าทุกอย่าง** — ถ้า session ใหม่บ่นว่าไม่รู้จัก project / context หาย → BIG ตรวจ main sync ก่อนเสมอ
4. ✅ Coordinate cross-project handoff — ใช้ scan ทั่ว ecosystem หางาน scope ที่ผิด owner
5. ✅ Resolve sync drift — local main vs origin/main vs feature branches

**กฎการ push main:**
- ปกติ: `git push origin <feature>:main` (fast-forward เท่านั้น)
- ถ้า main ขยับไปข้างหน้า → `git fetch && git rebase origin/main` แล้ว push (linear history)
- ถ้า conflict → แจ้ง user, ไม่ force-push
- ห้าม `--force` ไป main เด็ดขาด — ยกเว้น user สั่งโดยตรง

### 🛠️ BIG Admin Tooling (สร้าง 2026-05-23)

**Local scripts (Claude/user ใช้ใน sandbox):**
```bash
node scripts/admin/big_status.mjs           # overview: git sync + projects + risks + drift
node scripts/admin/big_status.mjs --verbose # + unmerged branch list
node scripts/admin/branch_cleanup.mjs       # dry-run: หา merged claude/* ที่ลบได้
node scripts/admin/branch_cleanup.mjs --apply           # ลบจริง
node scripts/admin/handoff_lint.mjs         # ตรวจ handoff template + cross-link
node scripts/admin/handoff_lint.mjs --strict            # exit 1 ถ้ามี warning
node scripts/admin/gen_risk_register.mjs    # regenerate docs/admin/RISK_REGISTER.md
```

**Auto-run hooks (`.claude/settings.json`):**
- `SessionStart` → `.claude/hooks/session-start.sh` — แสดง main sync + handoff status ตอนเริ่ม session
- `Stop` → `.claude/hooks/pre-close.sh` — เตือนถ้ามี uncommitted หรือ commits ค้างไม่ ff main

**GitHub Actions automation:**
- `handoff_lint.yml` — lint handoffs ทุก PR + auto-regen RISK_REGISTER.md เมื่อ push main
- `main_sync_check.yml` — nightly scan unsynced `claude/*` → auto-create tracking issue
- `stale_branch_cleanup.yml` — weekly cleanup `claude/*` ที่ merged + >14 วัน (dry-run + manual apply)

**Dashboard:**
- `tools/admin_dashboard.html` → `https://horatad.github.io/horatad/tools/admin_dashboard.html`
  อ่าน handoffs/GUARD risk register live ผ่าน GitHub raw + API → cards + table

**กฎการใช้:**
- BIG session เริ่ม: รัน `node scripts/admin/big_status.mjs --verbose` ก่อนเสนองาน
- หลัง commit: hook Stop จะเตือนเอง ถ้าลืม ff main
- ทุกสัปดาห์: ดู tracking issue ของ main_sync_check + stale_branch_cleanup

---

## 💡 Best Practice First — ทักท้วงก่อนทำ

Claude ทำตาม **best practice เสมอ** — ไม่ใช่แค่ทำตามคำสั่ง

### เมื่อคำสั่งของ user ไม่ใช่ best practice
**ห้ามทำตามโดยไม่ทักท้วง** — ให้แจ้งก่อนทุกครั้ง:

```
⚠️ [สิ่งที่ user ขอ]
ปัญหา: [อธิบายสั้นๆ ว่าทำไมไม่ดี]
แนะนำ: [วิธีที่ดีกว่า]
ทำต่อแบบเดิมไหม หรือใช้วิธีที่แนะนำ?
```

### ตัวอย่างที่ต้องทักท้วง
- user ขอ `git push --force` main → แนะนำ revert commit แทน
- user ขอ commit secret/token → ปฏิเสธ + แนะนำ env var
- user ขอ handoff ทุก task → แนะนำทำครั้งเดียวตอนจบ session
- user ขอ bump version สำหรับ fix เล็กเดียว → แนะนำ batch ก่อน

### ข้อยกเว้น — ทำตามโดยไม่ทักท้วง
- user บอกว่า "รู้แล้ว ทำเลย" หรือ "ยืนยัน" → ทำทันที ไม่ต้องพูดซ้ำ
- เรื่อง style/preference ที่ไม่มีผลต่อ correctness/safety

---

## 🧭 ปรัชญาการพัฒนา (Development Philosophy)

ทุก feature / fix / UX ต้องยึด 4 หลักนี้ **พร้อมกัน** ไม่ใช่แค่บางข้อ:

### Simple — เรียบง่าย
- ทุก feature อธิบายได้ใน 1 ประโยค — ถ้าไม่ได้ ให้ทบทวนใหม่
- ลบดีกว่าเพิ่ม — feature ที่ไม่มีคนใช้คือ complexity ฟรี
- ถ้า UI ต้องการคำอธิบาย → redesign ก่อน เขียน instruction ทีหลัง
- code: อ่านแล้วเข้าใจทันที ไม่ต้องคิดนาน

### Friendly — เป็นมิตร
- error/toast ภาษาคน ไม่ใช่ technical code ("บันทึกไม่ได้" ไม่ใช่ "localStorage quota exceeded")
- ทุก action ที่ user ทำต้องมี feedback ทันที (toast, spinner, highlight)
- ไม่ถามซ้ำ ไม่ขัดจังหวะ ไม่ block workflow
- อย่าทำให้ user รู้สึกผิด — confirm dialog ใช้คำกลางๆ ไม่ข่มขู่

### User Experience — ประสบการณ์ผู้ใช้
- คิด flow ก่อน code เสมอ: "user ทำอะไร → เกิดอะไร → ต้องการอะไรต่อ"
- mobile-first — path หลักต้องทำงานได้บนหน้าจอเล็กด้วยมือเดียว
- ไม่มี dead end — ทุก error มีทางออกหรือ fallback
- state ต้องคงที่: refresh ไม่หาย, กลับมาใช้ต่อได้ทันที

### Fast — รวดเร็ว
- ไม่มี loading ที่รอเกิน 300ms โดยไม่มี feedback
- offline-first — feature หลักทำงานได้โดยไม่ต้องมี network
- ไม่ re-render โดยไม่จำเป็น ไม่ block main thread
- bundle size เล็ก — อย่าเพิ่ม dependency โดยไม่จำเป็น

### ใช้งานจริง — checklist ก่อน commit
> - [ ] Simple: อธิบาย feature นี้ได้ใน 1 ประโยคไหม?
> - [ ] Friendly: user เจอ error → รู้ว่าทำอะไรต่อไหม?
> - [ ] UX: ทดสอบ flow บน mobile (หรือ note ใน handoff ว่าต้องทดสอบ)
> - [ ] Fast: มี unnecessary network call / re-render ไหม?

### เมื่อ 4 หลักขัดกัน — ลำดับความสำคัญ
**Fast > Simple > UX > Friendly** (ถ้าต้องเลือก ให้ Fast ชนะก่อน ยกเว้น UX กระทบ core task)

ตัวอย่าง tradeoff ที่รู้แล้ว:
- Loading indicator ทุกจุด (UX) vs เรียบง่าย (Simple) → ใส่เฉพาะ operation >300ms
- Animation ทุก hover (UX) vs 60fps (Fast) → animation เฉพาะ transition หลัก (tab, popup)
- Error message ยาว (Friendly) vs render เร็ว (Fast) → lazy render + truncate expand
- Group feature (UX) vs complexity (Simple) → ซ่อนใน sub-menu ไม่ expose บน main flow

---

## 💰 Cost Policy — Free / Cost-effective First

ใช้ได้กับ**ทุก project** (HORATAD, BIBLE, JULIAN, NOK, PLATFORM)

### 🔑 Max Plan Only — ข้อกำหนดถาวร (ห้ามละเมิด)

**AI ทุกอย่างในโปรเจคนี้ใช้ Claude Code Max plan เท่านั้น**

- **ห้ามใช้ ANTHROPIC_API_KEY** ในทุก script/tool/workflow ทุก project
- **ห้าม propose หรือ implement** solution ที่ต้องการ external API key ของ Anthropic
- **ห้ามเขียนโค้ดที่ call** `api.anthropic.com` หรือ Anthropic SDK โดยตรงจาก server/script
- AI calls ทั้งหมดต้องผ่าน **Claude Code session** (interactive) หรือ **browser-side** ที่ user ใช้อยู่

#### Implication ต่อ script ที่มีอยู่
- `workers/kb_extractor.mjs` — ห้ามรันด้วย ANTHROPIC_API_KEY → ต้อง redesign เป็น Claude Code native
- workflow ใดก็ตามที่ต้องการ AI → Claude ทำใน session แทน

#### เมื่อ Claude เจองาน AI processing
```
งานนี้ต้องการ AI processing:
ทางเลือก A: Claude ทำใน session นี้ (ฟรี ไม่ต้อง key)
ทางเลือก B: [วิธีอื่นที่ไม่ต้องใช้ API key]
→ เลือก A เสมอ เว้นแต่ scope ใหญ่เกิน 1 session
```

### หลักการ
- **Free tier ก่อนเสมอ** — ถ้ามี free option ที่ทำงานได้ ใช้ก่อน อย่า propose paid solution โดยไม่ลอง free
- **Cost-effective > feature-rich** — solution ที่ถูกกว่าและทำงานได้ 80% ดีกว่า solution แพงที่ทำได้ 100%
- **Offline / browser-native ก่อน** — Web Speech API, localStorage, Service Worker ไม่มีค่าใช้จ่าย ใช้ก่อน cloud
- **แจ้ง upgrade threshold ชัดเจน** — ถ้า free tier จะหมดหรือไม่พอ → แจ้งล่วงหน้าก่อน พร้อมตัวเลขและ option

### เมื่อ free tier ไม่พอ — แจ้งแบบนี้
```
⚠️ Free tier กำลังจะหมด
Service: [ชื่อ] | ใช้ไป: X / Y (Z%)
ถ้าเกิน: [ผลที่เกิดขึ้น — หยุดทำงาน / ช้าลง / เสียเงิน]
Option A: [ฟรี แต่ลด feature — อธิบาย trade-off]
Option B: [upgrade $X/เดือน — ได้อะไรเพิ่ม]
แนะนำ: [A หรือ B พร้อมเหตุผล 1 ประโยค]
```

### ตัวอย่าง decision ที่ผ่านมา (WHY LOG)
- **Web Speech API แทน Google Cloud TTS** — ฟรีไม่จำกัด, offline-safe, คุณภาพดีพอบน iOS/Android Opera → cloud TTS เพิ่ม dependency + ต้องใช้ net ทุกครั้ง
- **GitHub raw แทน Cloudflare Release** — CORS-free, ฟรีไม่จำกัด, ไม่มี token expire
- **qrcode.min.js bundle ลง repo** — ไม่พึ่ง CDN ที่อาจล่ม, offline capture ได้ทันที

### เมื่อ Claude พิจารณา solution ใหม่
1. มี free tier ไหม? → ใช้ก่อน
2. ถ้า paid → แจ้ง cost estimate + free alternative เสมอ
3. ถ้า user เลือก paid → บันทึก threshold ใน handoff เพื่อ monitor

---

## 🔭 BIG SESSION — Cross-Project Coordinator

เมื่อ user พิมพ์ **"BIG"** หรือ **"session BIG"** — Claude ทำหน้าที่ Program Manager  
**ไม่เขียน code** แต่วิเคราะห์, จัดลำดับ, และวางแผนข้าม project ทั้งหมด

### ขั้นตอน BIG session
1. อ่าน `ECOSYSTEM.md` → `PROJECT_STATUS.md` → handoffs ล่าสุดของทุก project
2. สร้าง output ตาม format ด้านล่าง
3. **ไม่ implement** — แนะนำ session ถัดไปให้ user เปิดเอง

### Output format มาตรฐาน

```
## BIG REPORT — YYYY-MM-DD

### 1. สถานะรวม
| Project  | สถานะ | Blocker | %พร้อม |
|---|---|---|---|
| HORATAD  | ...   | ...     | ...   |
| BIBLE    | ...   | ...     | ...   |
| JULIAN   | ...   | ...     | ...   |
| PLATFORM | ...   | ...     | ...   |

### 2. Priority Queue (เรียงลำดับ ทำก่อน → หลัง)
1. [PROJECT] งาน — เหตุผล (score: N)
2. [PROJECT] งาน — เหตุผล
...

### 3. Dependency Chain
งาน A → ปลดล็อก B → ปลดล็อก C
(อะไร block อะไร — ทำ A ก่อนได้ผลมากสุด)

### 4. Recommended next session
"session BIBLE" → ทำ [งานนี้] ก่อน เพราะ [เหตุผล]

### 5. New project proposals (ถ้ามี)
- [ชื่อ] — gap ที่เห็น + value + effort estimate
```

### Priority scoring (BIG ใช้ criteria นี้)
| เงื่อนไข | คะแนน |
|---|---|
| unblocks project อื่น (dependency chain) | +3 |
| user รอทดสอบ / deadline ใกล้ | +2 |
| value สูง / milestone สำคัญ | +2 |
| Claude ทำได้เองทั้งหมด (ไม่ต้อง user) | +1 |
| ต้อง user action ก่อน (ทดลองใช้/BLOCKED) | -2 |
| DEFERRED / dependency ยังไม่พร้อม | -3 |

### New project proposal criteria
เสนอ project ใหม่เมื่อเห็น gap ใน ECOSYSTEM vision ที่:
- ไม่มี project ปัจจุบันรับผิดชอบ
- value ชัดเจน + เชื่อมกับ project ที่มีอยู่
- effort สมเหตุสมผล (ไม่ใหญ่กว่า 1 milestone)

---

## 🤖 AUTONOMY MODE — ทำเอง ไม่ถาม

User ไม่อยากเฝ้า — ทุก session ทำตามนี้

### Session scope (สำคัญ — อ่านก่อนเสมอ)
- **ทุก session มี project scope 1 อย่าง**: BIG | HORATAD | BIBLE | JULIAN | NOK | GUARD | PLATFORM
- User ประกาศ scope ตอนเริ่ม เช่น "session BIBLE" หรือ "BIG"
- ถ้าไม่ประกาศ → อ่าน `PROJECT_STATUS.md` แล้วเลือก project ที่มี PENDING สูงสุด
- **เมื่อรู้ scope แล้ว → ทำ 2 สิ่งทันที ก่อนทำงานใดๆ:**
  1. เขียน scope ลงไฟล์: `echo 'PROJECT' > .claude/hooks/session_scope`
  2. แสดง scope banner (format ด้านล่าง)

#### 🔒 Scope Banner — แสดงทุกครั้งที่ประกาศ project

```
━━━ SESSION SCOPE: [PROJECT] ━━━
✅ ไฟล์ที่แตะได้: [file list]
📝 shared (แตะได้เสมอ): CLAUDE.md · PROJECT_STATUS.md · handoffs/[PROJECT]*
❌ ห้ามแก้: ไฟล์ของ project อื่น
cross-project request → note handoff ปลายทาง + ปฏิเสธ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

#### 📁 File Ownership — ใครเป็นเจ้าของไฟล์ไหน

| Project | ไฟล์ที่เป็นเจ้าของ |
|---|---|
| **HORATAD** | `script.js` · `index.html` · `style.css` · `sw.js` · `manifest.json` · `v3/v3tab.js` · `v3/engine.js` · `v3/interpretation.js` · `v3/typhoon.js` · `v3/kb_embedded.json` · `docs/HORATAD*.md` |
| **BIBLE** | `v3/kb*.json` · `v3/kb_skeletons.json` · `workers/kb_extract*` · `workers/groq*` · `workers/typhoon*` · `workers/claude_extraction*` · `tools/kb_*` · `docs/BIBLE*.md` |
| **JULIAN** | `workers/julian*` · `data/julian*` · `tools/julian*` · `docs/JULIAN*.md` |
| **NOK** | `v3/tts.js` · `docs/NOK*.md` |
| **GUARD** | `docs/GUARD*.md` · `docs/cia/*` · `docs/SECRETS.md` · `.github/workflows/*` · `_headers` · `auth-pin.js` |
| **BIG** | `scripts/admin/*` · `.claude/hooks/*` · `ECOSYSTEM.md` · `DEPLOY.md` |
| **Shared** | `CLAUDE.md` · `PROJECT_STATUS.md` · `handoffs/<OWN_PROJECT>*` · `handoffs/<OWN_PROJECT>_memory.md` |

#### ❌ Cross-project request — format การปฏิเสธ

เมื่อ user สั่งงานนอก scope **ห้ามทำ** — ตอบแบบนี้เสมอ:

```
⛔ งานนี้อยู่นอก scope ของ session [PROJECT]
บันทึกไว้ใน handoffs/[TARGET_PROJECT]_*.md แล้ว (section PENDING)
→ เปิด session [TARGET_PROJECT] เพื่อทำต่อ
```

แล้ว append ลง handoff ของ project ปลายทางจริงๆ ทันที

**ยกเว้น — ทำข้ามได้โดยไม่ถือว่า cross-project:**
- อัปเดต `CLAUDE.md` หรือ `PROJECT_STATUS.md` (shared)
- เขียน `## 📨 Incoming from [PROJECT]` ใน handoff project อื่น (notification เท่านั้น ไม่ใช่ implement)
- อ่านไฟล์ project อื่น (read-only เพื่อ context)

#### ↗ Cross-project impact — แจ้งเมื่อ session นี้กระทบ project อื่น

เมื่อ session นี้เปลี่ยนอะไรที่ **project อื่น depend on** → append `## 📨 Incoming from <PROJECT>` ใน handoff ปลายทางทันที:
- JULIAN เปลี่ยน export format → note ใน HORATAD handoff
- BIBLE เปลี่ยน kb.json schema → note ใน HORATAD handoff
- GUARD พบ security issue ใน HORATAD code → note ใน HORATAD handoff

### 📚 Project Memory Files — อ่านต้น session เขียนเมื่อ trigger

แต่ละ project มีไฟล์ memory ของตัวเอง — เก็บ **session learnings ถาวร** ที่ไม่ expire

| Project | ไฟล์ | เนื้อหาหลัก |
|---|---|---|
| BIBLE | `handoffs/BIBLE_memory.md` | domain vocab, extraction rules, chapter map, WHY LOG |
| HORATAD | `handoffs/HORATAD_memory.md` | architecture, state machine, bug patterns, platform quirks |
| JULIAN | `handoffs/JULIAN_memory.md` | schema, source patterns, accuracy grades, scraping gotchas |
| NOK | `handoffs/NOK_memory.md` | platform quirks, chunk-split, UX decisions |
| GUARD | `docs/GUARD_MISSION.md` + `docs/cia/*` | (existing docs serve as memory — ไม่มีไฟล์แยก) |

#### กฎพื้นฐาน
- อ่านต้น session **ก่อนทำงานใดๆ**
- ห้าม rewrite เนื้อหาเดิม — **append only** (เพิ่มแถว/section ใหม่เท่านั้น)
- ถ้าข้อมูลเดิมผิด → เพิ่ม `⚠️ แก้ไข (YYYY-MM-DD): ...` ต่อท้ายแถวเดิม ไม่ลบ
- append LOG section ท้ายไฟล์ทุกครั้งที่มี trigger (format: `| วันที่ | trigger | สิ่งที่เรียนรู้ |`)

#### เมื่อไหร่ต้องอัปเดต (trigger-based — ไม่ใช่แค่ "ก่อนจบ session")

อัปเดตเมื่อ session นั้น **เจอหรือทำสิ่งเหล่านี้** เท่านั้น:

| Trigger | เพิ่มใน section ไหน | ตัวอย่าง |
|---|---|---|
| แก้ bug → เข้าใจ root cause | Recurring Bug Patterns | "XSS เกิดเมื่อ innerHTML ไม่ wrap — grep 'innerHTML' ตรวจ" |
| ตัดสินใจ architecture / design | WHY LOG | "ทำไม async KB load ไม่ใช้ sync" |
| พบ platform quirk ใหม่ | Platform Quirks | "iOS Safari input[type=time] fire change ไม่ใช่ input" |
| เปลี่ยน schema หรือ format | Schema section | เพิ่ม field ใหม่ + rationale |
| พบ source/scraping pattern ใหม่ | Source Patterns | "Wikidata birthdate precision = day-only → filter xsd:dateTime" |
| BIBLE: พบ vocab / extraction rule ใหม่ | section ที่เกี่ยว | compound word, planet alias, chapter note |

**ถ้า session ไม่เจอ trigger เหล่านี้ → ไม่ต้องอัปเดต memory** (ไม่ใช่ทุก session จะมีของใหม่)

#### คุณภาพของ entry ที่ดี

```
❌ ตื้นเกิน:   "fixed XSS bug"
❌ ละเอียดเกิน: [โค้ด 20 บรรทัด] — ของแบบนี้ใส่ใน handoff หรือ code comment
✅ พอดี:       "XSS: innerHTML ทุกจุดต้อง _escHtml() — ตรวจด้วย grep -n 'innerHTML' script.js"

❌ ไม่มี WHY:  "ใช้ chunk 180 chars"
✅ มี WHY:     "chunk 180 ไม่ใช่ 200 — iOS pause threshold จริงอยู่ ~190 ต้องมี safety margin"

❌ task state: "PENDING: debug Wikipedia TH"  ← อยู่ใน handoff ไม่ใช่ memory
✅ knowledge:  "Wikipedia TH parser: pattern 'เวลา HH:MM น.' ครอบคลุม 80% กรณี"
```

**สูตรง่ายๆ**: entry ที่ดีตอบ "session ถัดไปจะรู้เรื่องนี้ได้อย่างไรโดยไม่ต้องค้นหาใหม่?"

### Session lifecycle
1. **เริ่ม** → อ่าน `ECOSYSTEM.md` → `PROJECT_STATUS.md` → `handoffs/<PROJECT>_*.md` ล่าสุด
   - **BIBLE session**: อ่าน `handoffs/bible_memory/INDEX.md` + `LOG.md` ด้วยเสมอ **ก่อนทำงานใดๆ** (แม้จะมี compaction summary)
2. **เสนองานทันที** → ไม่รอรับคำสั่ง (ดู Session opening format ด้านล่าง)
3. **ทำ** → code + test + verify (ภายใน sandbox)
4. **Commit** → push feature branch + ff main + backup branch (`backup/vX.Y.Z`)
   - **BIBLE session — ลำดับหลังทุก batch** (ไม่รอจบ session เพราะ context มักหมดก่อน):
     ```
     1. append LOG.md (progress + patterns พบใหม่) — ขณะ context ยังเหลือ
     2. git push -u origin <feature-branch>
     3. bash scripts/admin/ff_main.sh <feature-branch>
     ```
     ถ้ายังมี batch ต่อไป → ทำต่อบน branch เดิมได้ แล้วทำซ้ำ 1-3 หลัง batch นั้น
5. **ถ้ามี task เหลือเวลา** → ทำต่อตาม priority list (loop ข้อ 3-4)
6. **จบ session** → อัปเดต `handoffs/<PROJECT>_<YYYYMMDD>_v<n>.md` + `PROJECT_STATUS.md`
   - **BIBLE session**: append `handoffs/bible_memory/LOG.md` ก่อนสร้าง handoff เสมอ (อัตโนมัติ ไม่รอสั่ง)
     เพิ่มสิ่งที่เรียนรู้ใหม่: คำศัพท์ใหม่, pattern ใหม่, กฎที่ค้นพบ, process lessons

### 📚 BIBLE memory — Project-specific memory (อ่านและเขียนอัตโนมัติ)

`handoffs/bible_memory/` = **domain knowledge ถาวร** ของ project BIBLE  
แยกเป็นไฟล์ย่อยตามประเภท มี INDEX.md เป็นจุดเริ่มต้น

| เวลา | action | บังคับ |
|---|---|---|
| ต้น session BIBLE | อ่าน `INDEX.md` + `LOG.md` | ✅ แม้มี compaction summary |
| ระหว่าง session | พบ pattern/vocab/กฎใหม่ → append `LOG.md` ทันที | ✅ อัตโนมัติ |
| ก่อนสร้าง handoff | append `LOG.md` สรุป session | ✅ ทุก session |

**ไฟล์ย่อย:** PLANETS / SIGNS / HOUSES / QUALITY / SYNTAX / VOCAB / CHAPTERS / LOG  
**LOG.md**: append-only, date-time stamped, ห้ามแก้ entry เก่า  
**Q&A mode**: ตอบคำถามโหราศาสตร์จาก KB + memory → ดู `INDEX.md` section Q&A Intelligent Unit

---

### Handoff timing

- **Code commit + push main** → ทำทันทีหลังแต่ละงานเสร็จ (ไม่เปลี่ยน)
- **PROJECT_STATUS.md version line** → อัปเดตทันทีทุกครั้งที่ bump version (1 บรรทัด ไม่แพง)
- **Handoff file** → ทำครั้งเดียวตอนจบ session เท่านั้น ไม่ต้องทำหลังทุก task
- **WHY LOG** → เพิ่มทุก session — บันทึกการตัดสินใจสำคัญเป็นภาษา user (ทำไม ไม่ใช่ อะไร)
- session มีหลาย milestone → handoff หลัง milestone **สุดท้าย** ครั้งเดียว
- session ถูก interrupt กลางคัน → handoff เท่าที่ทำได้ บันทึกว่า incomplete
- **สร้าง handoff vN ใหม่ → ย้าย vN-1 ลง `handoffs/archive/` ทันที** (ไม่ให้เก่าสะสม)

⚠️ **Drift prevention**: ถ้า session ทำงานไป 3+ version โดยไม่มี handoff → handoff file จะล้าสมัยมาก
→ แก้ด้วย: PROJECT_STATUS.md version line sync ทันที + handoff สร้างก่อนจบ session จริงๆ ไม่ใช่แค่เมื่อ user ถาม

### 🚀 Session opening — เสนองานทันที ไม่รอคำสั่ง

ทุก session เริ่มต้นด้วยการ **เสนองานค้างพร้อมคำแนะนำทันที** format นี้:

```
## [PROJECT] — งานค้างวันนี้

**สถานะ:** [1 ประโยค สรุป project ตอนนี้]

### แนะนำทำก่อน
1. ✅ [งาน] — [เหตุผล 1 ประโยคภาษาคน]
2. ✅ [งาน] — [เหตุผล]
...

### รอ user
- ⭐ [งาน] — [ต้องการอะไรจาก user]

### ข้าม (เหตุผล)
- ❌ [งาน] — [ทำไมไม่ทำตอนนี้]

---
เริ่มข้อ 1 เลยไหม?
```

**กฎสำคัญ:**
- ไม่พูดว่า "มีอะไรให้ช่วยไหม" หรือ "ต้องการทำอะไร" — เสนอก่อนเสมอ
- ถ้า user เห็นด้วย → ลงมือทันที ไม่ต้องถามซ้ำ
- ถ้า user เปลี่ยน priority → ทำตามที่ user บอก แล้ว note เหตุผลใน handoff

### Priority algorithm (เลือกงานจาก handoff ลำดับนี้)
1. **Bug ที่ Claude ทำได้** (ไม่ใช่ DEFERRED, ไม่ใช่ ทดลองใช้)
2. **Feature/req ที่ Claude ทำได้** ตามลำดับ pin ใน handoff หรือเลข req น้อย→มาก
3. **Infra/quality** (CI, docs, refactor — น้ำหนักต่ำกว่า bug/feature)
4. **Partial-feasible** (เขียน code ส่วนที่ทำได้ ทิ้ง deploy/data step ให้ user ใน handoff)

### Backlog pruning — พิจารณาตัดงานก่อนทำ
ก่อนเริ่ม task ใดใน backlog ให้ถามตัวเองก่อน:
- **Assumption เดิมยังจริงอยู่ไหม?** (เช่น งานนี้เขียนขึ้นตอน fallback ยังแย่ — ตอนนี้ fallback ดีแล้ว)
- **Value ยังมีอยู่ไหม เทียบกับ effort?**
- **มีงานอื่นที่ทำให้งานนี้ obsolete แล้วไหม?**

ถ้าคำตอบชี้ว่าควรตัด → **แจ้ง user พร้อมเหตุผล 1-2 ประโยค ให้ตัดสินใจ** ก่อน implement
อย่า implement งานที่ value หายไปแล้วโดยไม่บอก

### 💬 Decision language — ตัดสินใจเองและอธิบายเป็นภาษา user

เมื่อประเมิน task ใดก็ตาม (backlog, deferred, หรือถามโดย user):
**Claude ตัดสินใจเองและบอกผลได้ผลเสียเป็นภาษาคน ไม่ใช่แค่ list ให้ user เลือก**

**Format มาตรฐาน:**
```
[งาน]
ตัดสินใจ: ✅ ทำ / ❌ ไม่ทำ / ⭐ ทำแต่รอ user ก่อน / ⏸ รอ dependency
[เหตุผล 1-2 ประโยคภาษาคน — ใช้อุปมาถ้าช่วยให้เข้าใจง่ายขึ้น]
```

**หลักการอธิบาย:**
- พูดถึง **ผลที่ user สัมผัสได้** ไม่ใช่ technical detail
  ❌ "เพิ่ม UNIQUE INDEX ที่ DB level เพื่อ prevent duplicate source"
  ✅ "ป้องกันคนเดียวกันถูกบันทึกสองครั้งด้วยชื่อต่างกัน"
- ใช้อุปมาเมื่อ concept ซับซ้อน
  ✅ "เหมือนมีเครื่องคิดเลขอยู่แล้ว ไม่ต้องจำคำตอบไว้ล่วงหน้า"
- บอก **ผลเสียของการทำ** ด้วย ไม่ใช่แค่ผลดี
- ถ้าไม่ทำ → บอกว่า "จะ miss อะไร" ให้ user ตัดสินใจ override ได้

**กรณีที่ user ต้องตัดสินใจเอง (⭐ รอ user):**
- มี legal/ธุรกิจ implication (ToS, เรื่องเงิน, privacy)
- architecture ที่ lock-in ระยะยาว
- ต้องใช้ข้อมูลจากโลกภายนอกที่ Claude ไม่มี

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

#### 6. Concept / analysis → text ก่อน เสมอ ⭐
ถ้า user ถามเรื่อง concept, design, tradeoff, หรือ "วิเคราะห์" → **ตอบ text ก่อน ไม่เปิดไฟล์**
ใช้ tool ก็ต่อเมื่อ user ยืนยันว่าจะ implement

```
❌ user: "วิเคราะห์ tradeoff X" → Claude เปิดไฟล์ + เริ่มแก้ → ช้า + ผิดจุด
✅ user: "วิเคราะห์ tradeoff X" → Claude ตอบ analysis text → user confirm → Claude ค่อย implement
```
⚠️ **tradeoff**: ถ้า user บอก "ทำ" พร้อมกัน → implement เลย ไม่ต้องรอ confirm
**แก้**: ถ้าคำสั่งมีทั้ง "วิเคราะห์" + "ทำ" → analysis text สั้นๆ 1 block แล้ว implement ทันที

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

## Git workflow (standing instructions — ห้ามถามซ้ำ)

**Branch**:
- พัฒนาบน feature branch ที่ harness ระบุไว้ (เช่น `claude/fix-xxx-XXXX`)
- ห้ามแก้บน main โดยตรง

**Auto-deploy ทุก commit** (ผู้ใช้ confirm แล้ว — ทำเงียบๆ ไม่ถาม):
```bash
git push -u origin <feature-branch>
bash scripts/admin/ff_main.sh <feature-branch>  # ff main พร้อม rebase+retry — MANDATORY
git push origin <SHA>:refs/heads/backup/vX.Y.Z  # backup branch
git checkout main && git reset --hard origin/main && git checkout <feature-branch>  # sync local main
```

⚠️ **ff main เป็น MANDATORY ทุก session** (standing rule 2026-05-23 — BIG admin role):
- ทุก commit ของทุก session ต้องลงไป main เสมอ — ห้ามลืม
- session ใหม่ checkout จาก main → ถ้าไม่ ff main, work หาย invisible
- ก่อนปิด session ตรวจ `git log origin/main..HEAD` — ถ้าไม่ empty → push ค้างอยู่ → push ทันที

**ff_main.sh — retry logic** (แก้ race condition):
- ลอง ff main ตรง → ถ้า main ขยับไปแล้ว → fetch + rebase + retry สูงสุด 3 ครั้ง
- ถ้า rebase conflict → หยุดและแจ้งให้แก้มือ (ไม่ force-push)
- pre-close hook เรียก ff_main.sh อัตโนมัติเมื่อ session ปิด

**Backup**:
- ใช้ **branch** ชื่อ `backup/vX.Y.Z` (git tag push เจอ 403 ใน sandbox นี้)
- backup ครั้งเดียวต่อ version — branch ใหม่ทุกครั้งที่ bump version

**Local main quirk**: เคยมี "Add files via upload" commits จาก GitHub UI ค้างใน local
ถ้าเจอ divergence ให้ `git reset --hard origin/main` (ของเก่าเป็นขยะ ไม่ใช่งาน)

---

## Pending bugs / backlog

ดู `PROJECT_STATUS.md` (overview ทุก project) + `handoffs/<PROJECT>_*.md` ล่าสุดของ project นั้น

---

## โครงสร้างไฟล์ (file map)

```
CLAUDE.md                       ← Claude instructions universal (ไฟล์นี้)
ECOSYSTEM.md                    ← architecture + data flow + vision รวม (อ่านก่อน session)
PROJECT_STATUS.md               ← task list รายวัน ทุก project
DEPLOY.md                       ← deploy & git reference

handoffs/
  BIG_YYYYMMDD_vN.md           ← BIG session output (priority report)
  HORATAD_YYYYMMDD_vN.md       ← HORATAD session state
  BIBLE_YYYYMMDD_vN.md         ← BIBLE session state
  JULIAN_YYYYMMDD_vN.md        ← JULIAN session state
  PLATFORM_YYYYMMDD_vN.md      ← PLATFORM session state (สร้างเมื่อเริ่ม Phase 2)
  archive/                      ← session เก่า (อ่านอ้างอิงได้ ไม่ต้องแตะ)

docs/
  HORATAD.md                    ← HORATAD: stack, version bump, cache-bust, quirks, design tokens
  BIBLE_MISSION.md              ← BIBLE current state + pipeline + pending
  JULIAN_MISSION.md             ← JULIAN current state + schema + pending
  GUARD_MISSION.md              ← GUARD charter + risk register + SOPs
  CHANGELOG.md                  ← version history
  system_overview.html          ← flowchart ภาพรวม (HTML visual)
```

---

## Handoff template (ใช้ทุก session)

ไฟล์: `handoffs/<PROJECT>_<YYYYMMDD>_v<n>.md`
- `<PROJECT>` = BIG | HORATAD | BIBLE | JULIAN | PLATFORM | (project ใหม่)
- `n` = session ที่เท่าไหร่ของวันนั้น

```markdown
# <PROJECT> — Session Handoff
# Date: YYYY-MM-DD (session N ของวัน)
# Previous: handoffs/<PROJECT>_YYYYMMDD_vN.md

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
[ ] [ทดลองใช้] ทดสอบ VX.Y.Z บนมือถือ
[ ] [ทดลองใช้] CF: deploy horatad-ai Worker
[ ] [BLOCKED] req 16 รอไฟล์ historical-records.json

## DEFERRED — รอ "รอบใหญ่" / dependency
[ ] req X — รอ format นิ่ง

## WHY LOG
- **[ชื่อการตัดสินใจ]** — [ทำไมถึงเลือกแบบนี้ ผลที่ user สัมผัสได้ หรือ trap ที่หลีกเลี่ยงได้]
```

**กฎ:**
- งาน DEFERRED **ห้าม** จับมาทำเอง — เป็น user decision
- งาน ทดลองใช้ / BLOCKED **ห้าม** ถาม user — ปล่อยใน handoff รอ user resolve
- หลังจบ task ให้ย้ายจาก PENDING → DONE + อัปเดต `PROJECT_STATUS.md`

---

## Testing

- ไม่มี automated test suite (มีแค่ CI: syntax + version sync)
- UI changes ต้องทดสอบ mobile จริง — Chrome DevTools mobile mode ไม่พอ (iOS Safari quirks)
- Sandbox container ไม่มี browser → Claude verify UI ไม่ได้ → ใส่ `[ทดลองใช้]` ใน handoff
