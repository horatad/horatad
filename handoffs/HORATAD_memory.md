# HORATAD_memory — Session Learnings สะสม
# อ่านร่วมกับ docs/HORATAD.md (tech stack + version bump + design tokens)
# Claude อ่านไฟล์นี้ก่อนทุก session HORATAD

> ไฟล์นี้ ≠ handoff — ไม่มี PENDING/DONE  
> จุดประสงค์: เก็บ **session learnings** ที่ docs/HORATAD.md ไม่ครอบคลุม  
> (bug patterns, architecture decisions, gotchas จากการแก้จริง)

## เมื่อไหร่ต้องอัปเดตไฟล์นี้

อัปเดตเฉพาะเมื่อ session เจอ trigger เหล่านี้:

| Trigger | Section ที่เพิ่ม |
|---|---|
| แก้ bug แล้วเข้าใจ root cause (ไม่ใช่แค่ symptom) | §5 Recurring Bug Patterns |
| ตัดสินใจ architecture / pattern ที่จะใช้ต่อไป | §8 WHY LOG |
| พบ platform quirk ใหม่ (iOS/Android/SW) | §6 Platform Quirks |
| เพิ่ม/เปลี่ยน localStorage key | §4 localStorage Keys |
| เพิ่ม module หรือเปลี่ยน module boundary | §2 Module Map |
| security finding ใหม่ที่ Claude ต้องรู้ก่อนแก้โค้ด | §7 Security |

**ไม่ต้องอัปเดตถ้า**: session ทำ feature ปกติโดยไม่เจอ bug/quirk/decision ใหม่

---

## 1. Architecture Overview (post-Phase 2 Step 0)

### ไฟล์หลัก
```
script.js       ← monolith หลัก (V3.3.23: 199KB, 3,696 บรรทัด หลัง KB extract)
v3/kb_embedded.json  ← KB rules (194KB, async load) — ย้ายจาก script.js Step 0
v3/v3tab.js     ← V3 tab logic (ES module)
v3/engine.js    ← Thai astro engine (ES module)
v3/interpretation.js ← keyword matching (ES module)
v3/typhoon.js   ← Typhoon LLM bridge (ES module)
v3/tts.js       ← TTS/NOK engine (ES module)
index.html      ← entry point, loads script.js + v3tab.js
sw.js           ← service worker, cache-first
```

### Phase 2 refactor — ลำดับบังคับ
```
Step 0 (✅ DONE V3.3.23): KB_RULES → kb_embedded.json
Step 0b (deferred):        PROVINCES + astro tables — async ทำไม่ได้ (hot calc path)
Step 1+ (⏸ รอ CSP):        Tier 1-7 module split — ต้องทำหลัง CSP enforce (P2-A) เพราะ
                            inline event handlers (onclick="...") ต้องแก้ก่อน จึง split ได้
```

**กฎสำคัญ**: ห้ามทำ Step 1+ ก่อน CSP enforce — ถ้า split แล้วค่อย refactor onclick = ทำ 2 รอบ

### async KB load pattern (Step 0)
```javascript
// KB โหลด async — guard ทุก caller
if (_kbRules === null) { toast("กำลังโหลด KB... ลองอีกครั้ง"); return; }
// _matchRules() + openInterpretation() ต้องมี guard นี้เสมอ
```

---

## 2. Script.js — Module Map (สำหรับ grep เร็ว)

| Tier | Module | บรรทัด (approx) | หน้าที่ |
|---|---|---|---|
| 1 | core/engine | ~70, 536-660 | `_calcJD`, `get_data`, `getHouse`, `analyzePairs` |
| 1 | core/lunar | 662-779 | `buildLunarInfo`, `getLunarDay`, tithi |
| 1 | core/transit | 988-1093 | `_moveCursorByFixed`, `_recalcTransit` |
| 2 | db/tank | 1831-1882 | `_tankLoad`, `_tankSave`, memory 3 tanks |
| 3 | render/report | 780-893 | `_escHtml`, `buildReport`, `buildCompareReport` |
| 4 | ui/nav | ~2900-3000 | `_updateNavHeader`, compareMode logic |
| 5 | io/qr | ~2600-2700 | QR encode/decode, share image |

⚠️ บรรทัดเปลี่ยนทุก session — ใช้ `grep -n "function X" script.js` verify ก่อนเสมอ

---

## 3. State Machine — compareMode

```
compareMode:
  0 = natal เดี่ยว
  1 = synastry (natal vs natal2/_synastry)
  2 = eventChart
  3 = transit (_transitCursor)

outerDisplay: 0=synastry | 1=eventChart | 2=transitChart
_updateNavHeader() — ต้องมี branch ทุก mode (0/1/2/3)
```

**pattern**: ใช้ `const outerChart = compareMode===1 ? synastry : compareMode===2 ? eventChart : transitChart` ใน outer render ทุกจุด — ห้ามอ้าง global โดยตรง

---

## 4. localStorage Keys

| Key | เก็บ | Type |
|---|---|---|
| `horatad_transit_cursor` | `{d,m,y_be,t}` | object |
| `horatad_synastry_idx` | index ใน _synastryDb | number |
| `horatad_event_idx` | index ใน _eventDb | number |
| `horatad_v3_db1` | Private tank persons | array |
| `horatad_v3_db2` | QR tank persons | array |
| `horatad_v3_db3` | JULIAN tank persons | array |
| `horatad_pin_unlocked` | PIN state (session) | bool |
| `v3_speak_rate` | TTS rate 1.0/1.25/1.5/1.75 (V3.3.26) | number |
| `horatad_last_slot1_uid` | uid ของ natal ล่าสุดที่ user save (Tank redesign Phase A · 2026-05-26) | string |

**กฎ**: save index ไม่ใช่ object สำหรับ synastry/event (db backing อยู่แล้ว) — transitCursor เป็น exception เพราะไม่มี db

---

## 5. Recurring Bug Patterns

### XSS — escHtml gaps
- `_escHtml()` ต้องครอบทุกจุดที่ render text จาก user input หรือ external data
- ตรวจด้วย: `grep -n "innerHTML" script.js` → ทุกบรรทัดต้องมี `_escHtml()`
- F1 XSS patch (2026-05-23): 7 sites แก้แล้ว — ถ้าเพิ่ม render จุดใหม่ ต้อง wrap ทันที

### Transit cursor normalization
- `_transitCursor` ต้อง normalize เป็น `y_be` เสมอ (ไม่ใช่ CE year)
- บน DOM input ใช้ era ปัจจุบัน — `_tsCalc()` convert แล้ว save `y_be`

### SW cache mismatch
- ถ้า asset URL ใน CORE_ASSETS ไม่ตรงกับ ?v= ของไฟล์จริง → offline พัง
- หลัง Step 0: `v3/kb_embedded.json?v=X.Y.Z` ต้องอยู่ใน CORE_ASSETS ด้วย

### Numpad → input event
- `_setField()` ใช้ `.value=` ตรงๆ → ไม่ trigger `input` event → listener ต้องเรียก update เอง
- pattern: `_setField(el, val); _onInputChange(el);`

---

## 6. Platform Quirks

| Platform | Quirk | Fix |
|---|---|---|
| iOS Safari | `<input type="time">` fire `change` ไม่ใช่ `input` | listen ทั้งคู่ |
| iOS Safari | Web Speech pause หลัง ~15s utterance ยาว | chunk-split 180 chars (NOK tts.js) |
| iOS Safari | preload voice list ต้องทำ DOMContentLoaded | `speechSynthesis.getVoices()` ก่อน speak |
| Android Chrome | Google TH voice ใช้งานได้ แต่ต้องรอ list load | ใช้ `onvoiceschanged` event |
| Desktop Chrome | ไม่มี Thai voice → ปุ่ม disabled พร้อม hint | `hasThaiVoice()` check |

---

## 7. Security — Known Decisions

- **PIN auth DevTools bypass**: ลบ `hidden` class = unlock ไม่ต้อง PIN — intent ยังไม่ตัดสิน (2026-05-23)
- **CSP Report-Only**: deploy แล้ว — รอ 1 wk violations → enforce (P2-A)
- **Inline handlers**: 196 handlers (index.html=165, script.js=31) — ต้อง refactor ก่อน CSP enforce

---

## 8. WHY LOG สะสม

- **KB_RULES → JSON (Step 0)** — 198KB inline = 49% ของ script.js. fetch async ได้เพราะ KB ไม่ได้อยู่ใน hot calc path (คำนวณดาวไม่ต้องใช้ KB). script.js เล็กลงครึ่งทันที ไม่ต้องรอ CSP
- **PROVINCES defer** — ใช้ใน `calculateChart()` hot path, async fetch = init พัง. wire bytes ไม่ลดถ้าใช้ sync `<script>` — ไม่คุ้ม รอ Step 1
- **Phase 2 Step 0b defer** — value/effort ต่ำ: 5KB ประหยัดได้ แต่ complex. รอ Step 1 ทำพร้อมกันครั้งเดียว
- **outerChart local const** — แทนอ้าง global โดยตรง ทำให้ mode ใหม่ต่อได้ใน 1 จุด (ไม่กระจาย)
- **_synastryIdx เป็น index แทน find-by-key** — เร็วกว่า consistent กับ _eventIdx pattern
- **Tank redesign 3-layer (2026-05-26)** — แยก storage / relationships / display buffers. ก่อนหน้านี้ compareMode 4 modes + 3 outerDisplay + 3 tanks ปนกัน → ตัดสินใจแยกชั้น display (slot1/slot2) จาก persistent storage. spec: `docs/HORATAD_tank_redesign.md` (15 rules + 4 phases) — Phase A done, B/C รอ CSP
- **Prototype-first สำหรับ refactor UX ใหญ่** — สร้าง `tools/<name>_prototype.html` standalone ก่อนแตะ script.js ให้ user iterate 10+ รอบใน 1 session. ลด risk ของ refactor พลาด + ลด debug time. ห้ามแตะ real code จนกว่า user confirm flow
- **Phase A scaffolding = additive helpers w/o caller — OK ถ้าเป็น explicit planned phase** — กฎ "no dead code" ไม่ใช้กับ scaffolding ของ multi-phase refactor (B/C/D จะใช้). ต้องมี spec doc + ลิงก์ใน handoff เพื่อยืนยันว่ามี roadmap จริง
- **PROJECT_STATUS.md conflict ทุก ff main = ปกติ** (BIG/HORATAD parallel) → resolve โดย combine ทั้งสองข้าง ของ conflict marker. ห้าม discard ฝั่งใดฝั่งหนึ่ง
- **Engine Layer Separation (2026-05-27)** — decision: แยก Layer A (position calc, engine-agnostic) จาก Layer B (TALS standard assessment รับ sign 0-11 เท่านั้น). target API: `assessStandards(planetIdx, sign)` แทน `getStandards(pos, i)`. ทำเพื่อ Swiss Ephemeris compatibility — อนาคตโปรเจคอื่นใช้ Swiss Eph ได้โดยไม่ rewrite TALS rules. **full spec: `ECOSYSTEM.md` section "Engine Architecture"**. สถานะ: ยังไม่ implement — รอมีโปรเจคที่ต้องการจริง

---

## 10. Audio / BGM — Procedure เพิ่มเพลงใน feature

### ขั้นตอนครบ (ทำครั้งเดียวต่อ feature)

#### A. หาและ download ไฟล์เสียง (user ทำบนเครื่องตัวเอง)
```powershell
# Windows PowerShell — ต้องมี yt-dlp.exe อยู่ใน folder เดียวกัน
.\yt-dlp.exe -x --audio-format mp3 --audio-quality 0 -o "$env:USERPROFILE\Desktop\%(title)s.%(ext)s" "YOUTUBE_URL"
# ถ้า error "ffprobe not found" → ได้ .webm แทน MP3 → upload .webm มาให้ Claude ทำต่อ
# ติดตั้ง ffmpeg: winget install ffmpeg แล้วรันใหม่
```

#### B. Trim ด้วย ffmpeg ใน sandbox (Claude ทำ)
```bash
# sandbox ต้องติดตั้ง ffmpeg ก่อน: sudo apt-get install -y ffmpeg
ffmpeg -y -i "input.webm" -ss 00:00:23 -to 00:01:08 -acodec libmp3lame -q:a 2 /home/user/horatad/audio/NAME-clip.mp3
ffprobe audio/NAME-clip.mp3 2>&1 | grep Duration   # verify
```

#### C. HTML — วาง `<audio>` ในตำแหน่งที่ต้องการ
```html
<audio id="FEATURE-bgm" src="audio/NAME-clip.mp3?v=APP_VERSION" preload="none" loop></audio>
```
- `preload="none"` — ไม่โหลดจนกว่าจะ play (ประหยัด bandwidth)
- `loop` — วนซ้ำ, ลบถ้าต้องการเล่นครั้งเดียว

#### D. JS — play/stop pattern
```javascript
// Auto-play เมื่อเข้า feature + หยุดเมื่อออก
function startFEATUREBgm(){
  const a=document.getElementById('FEATURE-bgm');
  if(a&&a.paused)a.play().catch(()=>{});
}
function stopFEATUREBgm(){
  const a=document.getElementById('FEATURE-bgm');
  if(a&&!a.paused){a.pause();a.currentTime=0;}
}
// Wire เข้า switchTab หรือ event ที่เหมาะสม
```

#### E. SW CORE_ASSETS — เพิ่มใน sw.js
```javascript
'./audio/NAME-clip.mp3?v='+V,
```

#### F. Bump version (6 ไฟล์ — ดู §Version Bump Checklist ใน docs/HORATAD.md)

---

### Gotchas ที่เจอ
| ปัญหา | สาเหตุ | วิธีแก้ |
|---|---|---|
| yt-dlp ใน PowerShell ไม่เจอ | Windows PATH | ใช้ `.\yt-dlp.exe` (เติม `.\`) |
| Permission denied เขียนไฟล์ | รันจากโฟลเดอร์ restricted | เพิ่ม `-o "$env:USERPROFILE\Desktop\..."` |
| ได้ .webm แทน MP3 | ไม่มี ffmpeg บนเครื่อง | upload .webm มาให้ Claude trim ด้วย sandbox ffmpeg |
| autoplay ถูก block | browser policy ต้องมี user gesture ก่อน | ปกติ — user ต้องคลิก page ก่อน 1 ครั้ง |
| sandbox ดึงไฟล์เสียงจาก URL ไม่ได้ | IP block จาก host | user download เองแล้ว upload มาเสมอ |

### Audio files ที่ใช้อยู่
| ไฟล์ | เพลง | ช่วง | Feature | Version |
|---|---|---|---|---|
| `audio/dream-island-clip.mp3` | เกาะในฝัน (ร.9) | 0:23–1:08 (45s) | หน้าเกี่ยวกับ | V3.3.31 |

> ⚠️ **PROTECTED — ห้ามลบ:** `about-bgm` (เกาะในฝัน) เป็น feature ถาวรของหน้า About — ห้ามลบโดยไม่มี user สั่งโดยตรง
> ถูกลบโดยไม่ตั้งใจใน V3.3.34 (overshoot จาก task "ลบ lunar BGM") → คืนใน V3.3.36
> เมื่อได้รับ task เกี่ยวกับ BGM ให้ระบุ ID element (`about-bgm` vs `lunar-bgm`) ในขอบเขตก่อนทำเสมอ

---

## 9. LOG — session learnings (append-only)

<!-- append ลง table นี้ทุกครั้งที่ session update ไฟล์นี้ — ห้ามแก้ entry เก่า -->
<!-- ถ้าข้อมูลเดิมผิด → เพิ่ม "⚠️ แก้ไข (date): ..." ต่อท้าย row เดิม ไม่ลบ -->

| วันที่ | trigger | สิ่งที่เรียนรู้ |
|---|---|---|
| 2026-05-23 | สร้างไฟล์ | architecture post-Step0, module map (tier 1-5), state machine compareMode 0-3, localStorage 7 keys, bugs (XSS/cursor/SW/numpad), platform quirks (iOS/Android/Desktop), security (PIN bypass + CSP Report-Only), WHY LOG |
| 2026-05-25 | V3.3.25-31 doc drift recap | (1) **handoff drift = silent failure** — 8 versions ไม่ update → session ใหม่อ่าน "autonomous หมด" ทั้งที่ feature ใหม่ 7 ตัว → ตัดสินใจผิดทั้งหมด. กฎใหม่: PROJECT_STATUS.md version line + ✅ DONE bullet ต้อง update ทุก commit (cheap, 1 บรรทัด), handoff file ทำตอนจบ session. (2) **kb_v24-3 wire local only** — `v3Typhoon()` ยังใช้ kb.json V2.3 (ต้องการ r.p field) → 2 paths คู่กันไม่ break. ถ้า migrate full ต้อง add `r.p` field ใน kb_v24-3 ก่อน. (3) **voice-chat conversational** — `send_chat(messages[])` history 5 + system prompt (ลัคนา+ชื่อ) + max_tokens=400 เพื่อ reply สั้นพอ TTS speak. (4) **BGM auto-play risk** — iOS Safari autoplay policy block ถ้าไม่มี user gesture ก่อน — switchTab(2) คือ tap = gesture จึงน่าจะผ่าน แต่ต้องทดสอบจริง. (5) **localStorage key ใหม่**: `v3_speak_rate` |
| 2026-05-25 | เพิ่ม audio feature | procedure ครบ: yt-dlp → .webm upload → ffmpeg trim → audio/ → SW cache → switchTab wire. Gotchas: PowerShell .\, Permission denied → Desktop path, no ffmpeg → .webm fallback |
| 2026-05-25 | BGM overshoot bug | `about-bgm` ถูกลบโดยไม่ตั้งใจใน V3.3.34 เพราะ task "ลบ lunar BGM" แต่ diff กว้างเกิน — กฎป้องกัน: (1) task BGM ต้องระบุ element ID ชัดเจน (2) review `git diff` ทุกบรรทัดก่อน commit ที่ลบ code (3) `about-bgm` = PROTECTED feature ห้ามลบโดยไม่ถาม user |
| 2026-05-27 | Engine Layer Separation architecture decision | Layer A/B split concept + Swiss Ephemeris compatibility noted ใน ECOSYSTEM.md section "Engine Architecture". `assessStandards(planetIdx, sign)` = target API. ยังไม่ implement — รอมีโปรเจคที่ต้องการ Swiss Eph จริง |
| 2026-05-26 | Tank redesign Phase A + prototype iteration | (1) **3-layer architecture** (storage/relationships/display buffers) — แยก compareMode/outerDisplay ออกจาก persistent. spec `docs/HORATAD_tank_redesign.md` 15 rules + 4 phases. (2) **Prototype-first workflow** — tools/tank_redesign_prototype.html (598+ บรรทัด, 12 commits iteration) ลง user แบบไม่ touch script.js → user confirm flow ก่อน refactor real code. (3) **V4 schema extension additive** — `_v3Record()` เพิ่ม `source` + `tags[]` default · `_v3UpsertDB1()` hook save `LAST_SLOT1_UID_KEY` · helpers `_dbSetSource/_dbAddTag/_dbRemoveTag/_dbGetByTag/_dbRecentLinks/_loadLastSlot1Uid` (Layer 1 DB API สำหรับ Phase B/C). (4) **Lifetime window สำหรับ planet search** = birth_y to birth_y+100 (sign-entry events ~17k/100yr → compute on-demand 100ms, ไม่ต้อง pre-compute table). (5) **L2 reactive sync dot** ก่อน L3 tab badge — cosmetic 30 บรรทัด ทดสอบ reactive UX cue ก่อน scope creep. (6) **Force-with-lease ปลอดภัยสำหรับ own feature branch หลัง rebase** — กรณีต้อง resolve conflict ใน PROJECT_STATUS.md ระหว่าง ff main. (7) **Retroactive backup branches** — push `backup/v3.3.X` จาก historical SHA ผ่าน `git push origin <sha>:refs/heads/backup/v3.3.X` ทำได้ทีหลังโดยไม่ต้อง check out |
