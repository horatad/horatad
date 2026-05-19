# Horatad — Session Handoff
# Date: 2026-05-19 (session 3)

---

## STATE ปัจจุบัน

```
App version : V2.2.28 (restore กลับมาจาก version ที่ใช้งานได้)
index.html  : V2.2.25 (restore)
script.js   : V2.2.26 (restore) + schema V1.4 (output พร้อม deploy)
sw.js       : V2.2.28 (restore — สะอาด ไม่มี reload loop)
version.json: ไม่ทราบ — ต้องตรวจก่อน deploy
```

---

## ปัญหาที่เจอและแก้ไข session นี้

### 1. Reload Loop
```
สาเหตุ: _checkVersion() ใน script.js fetch version.json ทุก load
         APP_VERSION='2.2.37' ≠ version.json '2.2.38' → reload ทันที
แก้: ลบ _checkVersion() ออกจาก script.js
     SW lifecycle จัดการ update แทน
```

### 2. bump_version.ps1 ทำให้ Thai encoding เสียหาย
```
สาเหตุ: PowerShell 5 Set-Content -Encoding UTF8 = UTF-8 WITH BOM
         เขียนทับ script.js ทุก push → Thai → อักษรจีน → commit เข้า git
แก้: เปลี่ยนเป็น Get-Content -Raw อ่าน
     [System.IO.File]::WriteAllText + utf8NoBom เขียน
     script.js ต้อง CRLF เสมอก่อน output
```

### 3. จอดำ (canvas ไม่แสดง)
```
สาเหตุ: _redraw() มี if(!active)return → _natal=null → ไม่วาด
         SW เก่าทำให้ script.js โหลดไม่สมบูรณ์
แก้: restore version ที่ใช้งานได้
     เพิ่ม default name='ตัวอย่าง' ตอนเปิดครั้งแรก → calculateChart1() → วาดทันที
```

### 4. SW Architecture ที่แก้แล้ว (Best Practice)
```
เดิม (ปัญหา): client.navigate() + version.json check = 2 reload triggers ชนกัน
ใหม่ (V2.2.28 restore): SW สะอาด
  install: cache → skipWaiting หลัง cache เสร็จ
  activate: selective delete + claim (ไม่มี navigate)
  ไม่มี version.json check
  ไม่มี reload loop
```

### 5. Version Sync ป้องกัน mismatch
```
แก้ push.bat: auto bump 3 ไฟล์พร้อมกัน
  version.json, script.js (APP_VERSION), sw.js (CACHE_NAME)
  ถ้า bump fail → push cancelled
```

---

## ไฟล์ที่ output พร้อม deploy

```
script.js (V2.2.26 + Schema V1.4 + default chart + CRLF)
  → upload ผ่าน GitHub web UI
  → version.json และ sw.js ต้อง bump ด้วยมือให้ตรง
  
bump_version.ps1 (UTF-8 No BOM — ใช้กับ push.bat)
push.bat (auto bump 3 ไฟล์)
```

---

## Schema V1.4 (_natal / _transit) — แก้แล้วใน script.js output

```javascript
{
  // identity
  uid        // crypto.randomUUID() — local primary key
  fn         // ชื่อ
  ln         // นามสกุล
  g          // เพศ (ชาย/หญิง/เหตุการณ์)

  // datetime
  jd         // Julian Day integer (Math.trunc)
  t          // "HH:MM"
  d, m, y_be // วัน/เดือน/ปี พ.ศ.

  // location
  lat, lng
  prov       // จังหวัด
  country    // ประเทศ (default 'TH')
  tz         // timezone (display only)
  dst        // daylight saving (display only)

  // astro
  pos[]      // ตำแหน่งดาว 10 ดวง
  vel[]      // ความเร็วดาว
  lagna      // null (รอ V3 engine)
  tanu_lagna // null
  tanu_set   // null
  houses[]   // []

  // classification
  tag[]      // tags
  group      // กลุ่ม
  sector     // สาขาอาชีพ
  trait      // ลักษณะเฉพาะ
  note       // บันทึก

  // backward compat
  name, gender
}
```

---

## QR Payload V1.4 — แก้แล้วใน script.js output

```javascript
{
  jd: Math.trunc(jd),  // integer — universal index
  t:  "HH:MM",         // เวลาเกิด
  lng: 100.50,         // ลองติจูด
  fn: "ชื่อ".slice(0,50)
}
Error Correction: Level H (ทนต่อ compress ผ่าน LINE)
```

วัตถุประสงค์ jd: universal index เปรียบเทียบตำแหน่งดาวข้ามเครื่องได้
uid ไม่อยู่ใน QR เพราะ: สร้างใหม่ทุกเครื่อง ไม่ใช่ universal identity

---

## สิ่งที่ยังค้าง

```
Feature ที่คุยแล้วยังไม่ได้ทำ:
  [ ] Layout รูปใหม่ — QR + ชื่อ + เวลา ในพื้นที่ dark ใต้วงดาว
      (รอดูรูปจริงก่อนว่าพื้นที่เหลือเท่าไหร่)
  [ ] req 18 — นำเข้าจาก QR Code (jsQR)
  [ ] req 19 — t_local = null → warning "ไม่ทราบเวลาเกิด"
  [ ] req 20 — แก้ไขข้อมูลใน memory
  [ ] req 15 — Event schema
  [ ] req 12 — Grid Button Picker

Cloudflare:
  [ ] ตรวจสอบ setting ที่ทำไว้ (Page Rules / Transform Rules / Cache Rules)
      อาจทำให้ไฟล์ encoding เปลี่ยนระหว่าง deploy
  [ ] ทดสอบ local ก่อน deploy เพื่อตัด Cloudflare ออกจาก suspect

push.bat / bump_version.ps1:
  [ ] ทดสอบให้แน่ใจก่อนใช้จริง
  [ ] script.js ต้อง CRLF ก่อน copy เข้า folder เสมอ
```

---

## Priority Session ถัดไป

```
1. ทดสอบ horatad.com version restore ว่าปกติ
2. ตรวจ Cloudflare setting ที่ทำไว้วันนั้น
3. ทดสอบ local (file:// หรือ localhost) ตัด Cloudflare
4. deploy script.js output (schema V1.4) ผ่าน GitHub web UI
5. Layout รูป QR หลังเห็นพื้นที่จริง
```

---

## ไฟล์ที่แนบ session ถัดไป

```
SYSTEM_INSTRUCTION_V3-4.md
session_handoff_20260519_v3.md (ไฟล์นี้)
script.js (V2.2.26 + Schema V1.4 — output พร้อม deploy)
index.html (V2.2.25 restore)
sw.js (V2.2.28 restore)
version.json
bump_version.ps1 (UTF-8 No BOM)
push.bat
ChgLog19May.md
```

---

## หมายเหตุสำคัญ

```
script.js ต้อง CRLF (Windows) เสมอก่อน deploy
  python3: content.replace('\r\n','\n').replace('\n','\r\n')
  write ด้วย 'wb' mode encoding utf-8

Cloudflare อาจเป็นสาเหตุ encoding เสียหาย — ต้องตรวจก่อน deploy ครั้งถัดไป

วิธี deploy ที่ปลอดภัยที่สุดตอนนี้: GitHub web UI upload โดยตรง
ไม่ใช้ push.bat จนกว่าจะทดสอบยืนยันแล้ว
```
