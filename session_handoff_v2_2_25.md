# Session Handoff — V2.2.25 | 2026-05-17

## สิ่งที่ทำ session นี้

### [V2.2.25] Adhikavara: เปลี่ยนจาก lookup table เป็น formula

**ไฟล์ที่แก้:** script.js, sw.js, index.html

**งานที่ทำ:**
1. ค้นหาประกาศสงกรานต์ ฝ่ายโหรพราหมณ์ สำนักพระราชวัง ย้อนหลัง 2557–2569
2. คำนวณ kamma ทุกปี cross-check กับ official
3. str_replace lines 516–525 เดิม ด้วย formula + override table
4. Bump version ทุกไฟล์ + แก้ about-version div (ค้างมาตั้งแต่ V2.2.21)

---

## STATE ปัจจุบัน

### File versions
| ไฟล์ | Version |
|---|---|
| `script.js` | **V2.2.25** |
| `sw.js` | V2.2.25 — CACHE_NAME = `horatad-v2.2.25` |
| `style.css` | V2.2.23 (ไม่เปลี่ยน) |
| `index.html` | V2.2.25 — about-version div = `"V 2.2.25"` ✓ |

### Code ที่ implement แล้ว (lines ~516–534)

```javascript
// ── adhikavara formula (derive จาก engine.py kp = กัมมัชพล) ─────────────────
// kamma = 800 - ((CS×292207+373) mod 800)  เปลี่ยนปีละ -207 หรือ +593
// AV condition: kamma < 114 OR kamma > 669  (244/800 = 30.5% ≈ 11/36 ปกติมาส)
function _isAdhikavaraFormula(y_be){
  const cs=y_be-1181;
  const kamma=800-((cs*292207+373)%800);
  return kamma<114||kamma>669;
}
// Source: ประกาศสงกรานต์ ฝ่ายโหรพราหมณ์ สำนักพระราชวัง เท่านั้น
// ตรวจสอบแล้ว 2557–2569 (13 ปี): mismatch เดียว = 2568
const _ADHIKAVARA_OVERRIDE=new Map([
  [2568,true],  // CS 1387 — formula(kamma=518)=PV, official=AV
                // ประกาศสงกรานต์ 2568: "อธิกวาร" (thaigov.go.th, prd.go.th)
]);
function _isAdhikavaraCached(y_be){
  if(_isAdhikamasaCached(y_be))return false;
  if(_ADHIKAVARA_OVERRIDE.has(y_be))return _ADHIKAVARA_OVERRIDE.get(y_be);
  return _isAdhikavaraFormula(y_be);
}
```

---

## ตาราง verify official (2557–2569) — ครบแล้ว

| BE | CS | kamma | formula | official | match | source |
|----|----|-------|---------|----------|-------|--------|
| 2557 | 1376 | 395 | PV | PV | ✓ | sanook.com |
| 2558 | 1377 | 188 | PV | **AM** (bug) | N/A | — |
| 2559 | 1378 | 781 | **AV** | **AV** | ✓ | trueplookpanya.com |
| 2560 | 1379 | 574 | PV | PV | ✓ | dhamma.mthai.com |
| 2561 | 1380 | 367 | PV | **AM** (bug) | N/A | xn--o3cak4ac.com |
| 2562 | 1381 | 160 | PV | PV | ✓ | matichon.co.th |
| 2563 | 1382 | 753 | **AV** | **AV** | ✓ | js100.com |
| 2564 | 1383 | 546 | PV | AM | N/A | myhora.com |
| 2565 | 1384 | 339 | PV | PV | ✓ | workpointtoday.com |
| 2566 | 1385 | 132 | PV | AM | N/A | ayutthaya.prd.go.th |
| 2567 | 1386 | 725 | **AV** | **AV** | ✓ | (previous session) |
| 2568 | 1387 | 518 | PV | **AV** | **✗ → override** | thaigov.go.th |
| 2569 | 1388 | 311 | PV | AM | N/A | thaigov.go.th |

**หมายเหตุ:**
- AM bug ปี 2558, 2561: _isAdhikamasa formula ผิด (บอก PV แต่ official เป็น AM) — แยก scope, ยังไม่แก้
- 2560 ถูกต้องว่า PV — เดิม lookup table ใส่ไว้ผิด ตอนนี้ formula แก้เองแล้ว

---

## Backlog (เรียงลำดับ)

### B1 — AM bug (กระทบ correctness — สำคัญ)
`_isAdhikamasa` ผิดสำหรับ:
| BE | CS | formula | official |
|----|-----|---------|----------|
| 2558 | 1377 | PV | AM |
| 2561 | 1380 | PV | AM |
| 2583 | 1402 | PV | AM |

Root cause: `_isAdhikamasa` นับ lunations ข้ามขอบ solar year ผิดบางกรณี
ต้องวิเคราะห์ก่อนแก้ — ยังไม่มี root cause ชัดเจน

### B2 — Copy report text (button)
### B3 — Canvas pinch-zoom mobile
### B4 — Retrograde tooltip

---

## ไฟล์แนบ session ถัดไป
- script.js (upload ไฟล์ใหม่จาก outputs)
- session_handoff_v2.2.25.md (ไฟล์นี้)
- engine.py (ถ้าวิเคราะห์ AM bug)
