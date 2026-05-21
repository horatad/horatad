# Horatad — Best Practices
# Updated: 2026-05-19
# ใช้คู่กับ SYSTEM_INSTRUCTION_V3-4.md (อันนี้เป็น quick reference สั้นๆ)

---

## SESSION FLOW

### เปิด session
1. อ่าน `SYSTEM_INSTRUCTION_V3-4.md` (rules + V3 spec)
2. อ่าน `session_handoff_<latest>.md` (state + งานค้าง)
3. ดู `ChgLog19May.md` ถ้าไม่เข้าใจประวัติ
4. ตรวจ `git log --oneline -5` + branch ปัจจุบัน

### ปิด session (trigger: "จบ" | "handoff" | "พอแค่นี้")
1. Append entries ใหม่ใน `ChgLog19May.md` (format ตามด้านล่าง)
2. สร้าง `session_handoff_<date>_v<N+1>.md` — state + งานค้าง + next priority
3. Update `BEST_PRACTICES_<date>.md` ถ้ามีบทเรียนใหม่
4. Commit + push main
5. ยืนยัน handoff สั้นๆ

---

## VERSION SYNC (บังคับทุก deploy)

3 จุดต้องตรงกันเสมอ — ไม่ตรง = reload loop:

```
script.js     : const APP_VERSION='X.X.XX';
sw.js         : const CACHE_NAME='horatad-vX.X.XX';
version.json  : {"v":"X.X.XX"}
```

Header comment ของไฟล์ที่แก้ → bump เฉพาะไฟล์นั้น
ไม่บังคับให้ตรงทุกไฟล์ (เช่น style.css ไม่แก้ ไม่ต้อง bump)

---

## CHANGELOG FORMAT

```
## [VX.X.XX] — YYYY-MM-DD
- bullet สั้น (1 บรรทัด) อธิบายสิ่งที่เปลี่ยน
- เน้น "what" + "why" ถ้าจำเป็น
- file path ใส่ก็ได้ ถ้าช่วยให้ตามได้
```

วาง entry ใหม่ไว้บนสุด (newest first)

---

## DEPLOY CHECKLIST

```
1. bump APP_VERSION (script.js)
2. bump CACHE_NAME (sw.js) ให้ตรง
3. bump version.json ให้ตรง
4. bump comment header ของไฟล์ที่แก้
5. update ChgLog19May.md
6. git add + commit + push main
7. ทดสอบบน horatad.com — hard refresh 2 รอบ
```

---

## TESTING RULE

```
- "code compile ผ่าน" ≠ "feature ใช้งานได้"
- ห้าม claim ว่า feature เสร็จ ถ้ายังไม่ได้กดทดสอบจริง
- PWA: SW cache อาจค้าง — ต้อง hard refresh หรือ DevTools → Application → Unregister SW
- iOS Safari: qrcodejs สร้าง <img> ไม่ใช่ <canvas> — ต้อง onload
- numpad fields (readonly+click): ไม่ fire 'input' event
```

---

## GIT / PUSH

### Web session (remote execution)
```
git push -u origin main
# Retry 4 ครั้ง exponential backoff 2s/4s/8s/16s ถ้า network error
```

### Local (เผื่อใช้)
```
# origin proxy 127.0.0.1 ปฏิเสธ push — ต้องใช้ PAT URL ตรงๆ
git remote set-url origin 'https://oauth2:<PAT>@github.com/horatad/horatad.git'
git push -u origin main
```

---

## UI / UX RULES

### สี ปุ่มยืนยัน
```
ทำลาย (delete/clear/reset)  → #f85149 แดง (confirm-ok)
สร้าง/เพิ่ม (add/save)       → #2ea043 เขียว (add-tag-ok)
หลัก action ของ app          → #5b3fa0 ม่วง
```

### Tag chip
```
Inactive (ยังไม่เลือก)  → bg #2a2a2e, border #3d3d44, text #8b949e
Active (เลือกแล้ว)      → bg #5b3fa0, border #7b5fc0, text #fff bold
Add new                 → border dashed #2ea043, text #56d364
```

### Popup alert ค้าง
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

---

## SHARE IMAGE (1080×1080 PNG)

```
QR        : left 28, y=835, size 110×110 (ECC Level H)
Info      : right-aligned x=SZ-30, y=835 + 4 lines (36/26/26 spacing)
Score     : center y=958, 64px bold
Label     : center y=1030, 22px gray
horatad.com: center y=1060, 13px Cinzel #666
Filename  : horatad_<JD>_<HHMM>_<lat>.png
```

---

## QR PAYLOAD V1.4

```json
{
  "jd": 2460000,      // Math.trunc(jd) — universal index
  "t":  "13:45",      // เวลาเกิด HH:MM
  "lng": 100.50,      // ลองติจูด
  "fn": "ชื่อ"        // .slice(0,50)
}
```

ECC: Level H (ทนต่อ compress ผ่าน LINE)
ไม่มี: uid, lat (lat ดึงจาก lng ไม่ได้ — ตอนนี้ลืม? — ตรวจ)

---

## SW POLICY (ห้ามแตะถ้าไม่เข้าใจ)

```
✓ install : cache → skipWaiting หลัง addAll เสร็จ
✓ activate: ลบเฉพาะ CACHE_NAME เก่า + clients.claim()
✓ fetch   : cache-first, bypass version.json
✗ nuclear clear (caches.keys → delete all) — ห้ามใช้
✗ unregister self — ห้ามใช้
✗ navigate() ใน activate — ลบทิ้งใน V2.2.28
```

---

## File-only-rule

```
- เปลี่ยน UI: ทดสอบในเบราว์เซอร์จริงก่อน claim
- เปลี่ยน script.js: bump APP_VERSION + sw.js + version.json
- เปลี่ยน v3/*: bump label แท็บพยากรณ์ V3.XX [DD/MM/YY]
- เปลี่ยน worker.js: wrangler deploy แยก — ไม่ใช่ git push
- เปลี่ยน CNAME: หยุดและถาม — กระทบ DNS ทันที
```

---

## NUCLEAR OPTIONS (แจ้ง trade-off ก่อนทำเสมอ)

```
- ล้าง cache ทั้งหมด
- unregister SW
- เปลี่ยน fetch strategy cache-first → network-first
- clear localStorage ทั้งหมด
- force reload ทุก tab โดยไม่เตือน
- git push --force ไป main
- git reset --hard
```
