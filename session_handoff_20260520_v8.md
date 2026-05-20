# Horatad — Session Handoff
# Date: 2026-05-20 (session 8 ของวัน)
# Previous: session_handoff_20260520_v7.md

## STATE

```
App version : V3.0.8 (main + deployed)
script.js   : APP_VERSION='3.0.8'
sw.js       : CACHE_NAME='horatad-v3.0.8'
version.json: {"_id":"HORATAD:VERSION","v":"3.0.8"}
v3/v3tab.js : Version 3.0.4 (ไม่แตะ)
GitHub      : main = claude/continue-work-POM6y = d1f2c05
Backups     : backup/v2.2.37–43, v3.0.0–v3.0.8
```

---

## DONE (session นี้)

```
✓ V3.0.7 Phase 3 — Tag area semantic toggle:
  - tag-row-1 ใน transit mode → แสดง linked event chips (สีม่วง)
  - คลิก chip → _eventSlotLoadByUid() → โหลด event เป็น natal2
  - "+ เหตุการณ์" chip → เปิด event slots popup
  - toggle transit / save / delete event → refresh tag-row-1 อัตโนมัติ
  - tag-event-chip CSS class (border #5b3fa0, color #c9b8f0)

✓ V3.0.8 Phase 4 — QR import:
  - _jdToGregorian(customJd): reverse JD → CE date (offset +1721117)
  - _latLngToProv(lat,lng): nearest province lookup (Euclidean dist)
  - _parseH1Payload(raw): parse "H1|jd|t|lat|lng|g|nm" หรือ URL ?h=...
  - _fillFormFromImport(): fill form 1 + force BE era
  - _doQRImport(): paste textarea → parse → fill → calculateChart1()
  - URL param auto-import: ?h=H1|... ตอน startup → import ทันที
  - "นำเข้า QR" row ใน ⚙️ menu + qr-import-modal popup

▶ Phase 2-4 ครบแล้ว ✓
```

---

## PENDING — 🟢 Claude ทำเองได้

```
[ ] Phase 5 — QR ฝัง URL: เปลี่ยน QR payload จาก plain "H1|..."
    เป็น URL https://horatad.github.io/horatad/?h=H1|...
    ผลลัพธ์: สแกน QR → เปิด browser → app auto-import โดยไม่ต้อง copy-paste
    ไฟล์แก้: script.js (_generateShareImage → qrText เปลี่ยนเป็น URL)
    หมายเหตุ: QR payload ยาวขึ้น ~50 chars → ยังอยู่ใน ECC M limit

[ ] Phase 5b (optional) — ปุ่ม "คัดลอก H1" ใน share image section
    ให้ user copy payload text ไปใช้กับ external QR app
```

---

## PENDING — 🔴 [USER ONLY]

```
[USER ONLY] ทดสอบ V3.0.7–3.0.8 บนมือถือจริง:
  Phase 3 (V3.0.7):
  - ✅ เปิดเหตุการณ์จร → tag-row-1 เปลี่ยนเป็น event chips (สีม่วง)
  - ✅ ปิดเหตุการณ์จร → tag-row-1 กลับเป็น category chips ปกติ
  - ✅ คลิก event chip → โหลด natal2 + toast
  - ✅ "+ เหตุการณ์" → เปิด event popup
  Phase 4 (V3.0.8):
  - ✅ ⚙️ menu → "นำเข้า QR" → popup เปิด
  - ✅ วาง H1|... → กด นำเข้า → form 1 ถูก fill + ผูกดวงทันที
  - ✅ วาง text ผิด → toast "รูปแบบไม่ถูกต้อง"
  - ✅ ทดสอบ URL param: เปิด ?h=H1|... → auto-import ตอน load

[USER ONLY] CF: deploy / config Worker (เหมือนเดิม)
```

---

## DEFERRED

```
[ ] FLICKER (desktop Ctrl+Shift+R) — รอ V3 รอบใหญ่จบก่อน
[ ] req 11 interp.js → Worker — รอ format นิ่ง
[ ] req 12 obfuscate — รอ V3 stable
[ ] req 13 CF Access frontend — รอ user decide
[ ] req 16, 17 — รอ data file
```

---

## Notes — Phase 5 entry point

```
Phase 5 QR URL embed:
ไฟล์: script.js บรรทัดประมาณ 1625 (ใน _generateShareImage)
เปลี่ยน:
  const qrText=`H1|${jd}|${active.t||''}|${lat}|${lng}|${g}|${nm}`;
เป็น:
  const h1=`H1|${jd}|${active.t||''}|${lat}|${lng}|${g}|${nm}`;
  const qrText=`https://horatad.github.io/horatad/?h=${encodeURIComponent(h1)}`;

ต้องตรวจสอบ QR size: encodeURIComponent จะ encode "|" เป็น "%7C"
→ ทำให้ payload ยาวขึ้นมาก → อาจ overflow M level
ทางเลือก: ใช้ "|" ตรงๆ ใน URL (ไม่ต้อง encode — "|" valid ใน URL path)
  const qrText=`https://horatad.github.io/horatad/?h=H1|${jd}|${active.t||''}|${lat}|${lng}|${g}|${nm}`;
→ browser จะ parse "|" เป็น literal ได้ (URLSearchParams.get('h') คืน H1|...)
→ payload เพิ่มแค่ ~50 chars fixed overhead
```
