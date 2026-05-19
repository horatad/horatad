# Horatad — ChgLog19May
> req 27 | สร้าง 2026-05-19 | ย้อนหลังจาก comment ใน script.js

---

## [V2.2.38] — 2026-05-19
- Security: ย้าย password validation ออกจาก index.html
- แทนด้วย fetch('/api/auth') → Cloudflare Worker horatad-auth
- SECRET_PIN เก็บใน Worker Environment Variable (Secret/Encrypted)
- ไม่มี password ใน source code ทุกไฟล์แล้ว ✓
- Worker Route: horatad.com/api/auth → horatad-auth

## [V2.2.37] — 2026-05-19
- (deployed — sw.js + version.json + script.js)

## [V2.2.35] — 2026-05-19
- Option B: version.json check — fetch ทุก load เทียบ APP_VERSION → reload ทันที
- revert nuclear clear → selective delete (offline safe)
- setInterval reg.update() ทุก 1 ชม. สำหรับ tab ค้างไว้
- sw.js bypass version.json — ต้องได้จาก network เสมอ

## [V2.2.34] — 2026-05-19
- SW nuclear clear ใน activate (revert ใน 2.2.35)

## [V2.2.33] — 2026-05-19
- SW permanent fix: client.navigate() ใน sw.js activate
  ไม่ต้องพึ่ง script.js — break chicken-and-egg loop
- SW register URL ใช้ ?v=APP_VERSION bust CDN cache ทุก deploy

## [V2.2.32] — 2026-05-19
- about page: BUILD_DATE auto จาก document.lastModified
- SW register: updateViaCache:'none' + reg.update()

## [V2.2.31] — 2026-05-19
- req 14: custom tag localStorage (horatad_custom_tags)
- _renderTagRow รวม DEFAULT_TAGS + custom + [+ เพิ่ม] button
- long-press 1200ms ลบ custom tag
- add-tag-modal + Esc/Enter support

## [V2.2.30] — 2026-05-19
- DS-7: inputmode=none บน time fields t1/t2/tt ป้องกัน mobile keyboard popup
- req 13: global button sound delegation (_lastBeepAt debounce 50ms)

## [V2.2.29] — 2026-05-19
- req 1: autofill readonly trick (index.html) ป้องกัน browser autofill
- req 3: QR payload JSON schema V1.3
- req 4+9: uid/lat/lng/fname/lname ใน _natal + crypto.randomUUID()
- req 5: auto-save natal ใน calc1/calc2
- req 7+8: numpad ครอบ time fields t1/t2/tt

## [V2.2.26] — 2026-05-xx
- Adhikamasa: เปลี่ยน formula จาก totalLunations diff เป็น avoman threshold
  (aw_ml<3824||aw_ml>16936)
- แก้ false positive 2560/2563 และ false negative 2561/2564/2583

## [V2.2.25] — 2026-05-xx
- Adhikavara: เปลี่ยนจาก lookup table เป็น formula (kamma<114||kamma>669)
  + override จากประกาศสงกรานต์ สำนักพระราชวัง
- ตรวจสอบ 2557–2569 (13 ปี): mismatch เดียว = 2568 (override=true)

## [V2.2.24] — 2026-05-xx
- D+E: ทำนายจาก _natal เสมอ, btn-outer sync รายงาน
- long-press 1s, shutter sound max volume
- QR JD|T|LAT ใน capture image

## [V2.2.23] — 2026-05-xx
- A+B+C: memory list, JD+lat, sort, sound 6 levels, long-press name

## [V2.2.16] — 2026-05-xx
- Adhikavara: เปลี่ยนจาก formula เป็น lookup table จาก myhora

## [V2.2.15] — 2026-05-xx
- Adhikavara: เดือน 7 full/hollow, hollow month boundary fix

## [V2.2.14] — 2026-05-xx
- Tithi via avoman (not Y_MON/longitude): dawn ref 06:00, engine unchanged

## [V2.2.13] — 2026-05-xx
- Adhikamasa fix: lunar month uses lunation count (not sun longitude)
- เพิ่ม _h0OfCS, _totalLunations, _isAdhikamasa, _getLunarMonthFixed
- buildLunarInfo: แสดง ๘/๘ ปีอธิกมาส, เดือน 1-12 ปีปกติ

## [V2.2.0] — 2026-05-xx
- Bug fix: share image ลบ logo overlay ซ้ำซ้อน
- Bug fix: outer label สี unified
- Bug fix: canvas/report bg คงที่
- Feature: prov sound — _playBeep เมื่อเลือกจังหวัดจาก dropdown

## [V2.1.9] — 2026-05-xx
- Bug fix: pre-2484 warning shown only when buf.length===4
- Bug fix: lunar info refresh on transit toggle
- Bug fix: time input width mobile
- Feature: split save/share — saveChart() / shareChart()
- Feature: keyboard sound — Web Audio beep, toggle
- Feature: numpad validate on commit — 3 strikes → revert
- Feature: memory cycle — ◀▶ buttons
- Feature: memory list long-press delete (600ms)
- Feature: memory + event sort — 🕐 ล่าสุด / ก-ฮ / ฮ-ก
- Toast helper

## [V2.1.8] — 2026-05-xx
- Labels: OUTER, REPORT_TRANSIT, CHART_TYPE
- calculateTransit: เพิ่ม vel calc
- _redraw: branch _reportTransitShow=true
- Share image: redesign footer + logo overlay

## [V2.1.7] — 2026-05-xx
- logo size 160 (was 240)
- ราศี font 30px (was 36px)

## [V2.1.6] — 2026-05-xx
- logo: source horatad_500x500.png, alpha 1.0, brightness/saturation filter

## [V2.1.5] — 2026-05-xx
- sw.js CACHE_NAME bump
- controllerchange listener → auto-reload เมื่อ SW ใหม่ activate

## [V2.1.4] — 2026-05-xx
- Thai font fallback (Noto Sans Thai + Tahoma)

## [V2.1.3] — 2026-05-xx
- logo: source horatad_746x746.png, size 240, circular clip

## [V2.0] — 2026-05-xx
- Share as Image (1080×1080 PNG, Web Share API + fallback download)

## [V1.9] — 2026-05-xx
- memory icon button (long-press bug fix)
- Esc closes modals
- time fields → type="time" native
- year smart prefix (BE 25xx / CE 20xx)
- lng numpad left-to-right display

## [V1.8] — 2026-05-xx
- localStorage persist (state + memory list 10)
- long-press name field → memory popup

## [V1.7] — 2026-05-xx
- searchable prov dropdown
- numpad backspace → clear all (label ล้าง)

## [V1.6] — 2026-05-xx
- canvas identity (gender+name+dmy+time+prov top-left)

## [V1.5] — 2026-05-xx
- canvas logo: top-right, size 140

## [V1.4] — 2026-05-xx
- unified ผูกดวง button (calc 1+2) in era-row

## [V1.3] — 2026-05-xx
- gender prefix in report header (ดวงชาย/หญิง/เหตุการณ์)

## [V1.2] — 2026-05-xx
- mobile prov scrollIntoView

## [V1.1] — 2026-05-xx
- calculateSmart _lastEdited
- กำหนดเอง toggle lng↔prov
- startup viewMode=0
