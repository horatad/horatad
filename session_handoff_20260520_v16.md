# Horatad — Session Handoff
# Date: 2026-05-20 (session 16 ของวัน)
# Previous: session_handoff_20260520_v15.md

## STATE
App version : V3.2.6 (main + deployed — ไม่มี version bump session นี้)
Backups     : backup/v3.2.6, backup/v3.2.5, backup/v3.2.4, backup/v3.2.3, backup/v3.2.2
Branch      : claude/review-typhoon-api-T0n0e (review session เท่านั้น)

## DONE (session นี้ — analysis/review ไม่มี coding หลัก)
✓ วิเคราะห์ Typhoon API pipeline — flowchart input/output ครบ
✓ Audit kb.json — พบ 137 rules ไม่มี planet tag, 77 rules ไม่มี quality gate, priority 2 ค่า
✓ Audit Master Dictionary (xlsx) — พบ tb_prediction_conditions แทบว่าง (2/342), category 46% ว่าง
✓ เพิ่ม .gitignore (node_modules/)
✓ สร้าง extract_conditions.html — tool ส่ง batch ให้ Typhoon แปลง tags → structured conditions

## สิ่งที่พบ (สำคัญ)

### Typhoon pipeline — จุดอ่อน
1. **chartSummary ส่ง data เกิน** — describe_natal_payload() ส่งดาวทุกดวงให้ Typhoon ทั้งที่
   rules ที่ match มาแล้วมีข้อมูลนั้นอยู่แล้ว → เสี่ยง hallucinate จากดาวที่ไม่มีกฎรองรับ
2. **ไม่มี output validation** — ไม่ตรวจว่า Typhoon แต่งนอกกฎหรือเปล่า
3. **v3Typhoon() ไม่มี auto-fallback** — error → แค่ toast, ไม่แสดงกฎดิบ (ต่างจาก interpret())
4. **ไม่มี input validation** — pos[] NaN, ascSign นอก 0-11, matched < threshold ไม่ตรวจ

### kb.json — จุดอ่อน
- 137/323 rules ไม่มี planet tag → ไม่ match ผ่าน planet loop เลย (dead rules หรือ foundation inject)
- 77/323 rules มีแค่ planet tag → match ได้ทุก quality/aspect (over-match)
- priority มีแค่ pr=1 (188) และ pr=2 (135) → ตัดกฎไม่แม่น

### Master Dictionary — โครงสร้างดี แต่ยังไม่ implement ครบ
- tb_prediction_conditions ออกแบบดี (structured matching) แต่มีข้อมูลแค่ 2 กฎ
- category_tag ว่าง 156/342 กฎ (46%)
- min_manifestation_threshold ทุกกฎ = 0.1 (ยังไม่ differentiate)

## PENDING — 🟢 Claude ทำเองได้ (sandbox)

### ลำดับที่แนะนำ:

[ ] **[ก่อนสุด] เปิด extract_conditions.html แล้วรัน** → ได้ conditions_extracted.json/csv
    - ต้องเปิดจาก https://horatad.github.io/horatad/extract_conditions.html
    - merge branch claude/review-typhoon-api-T0n0e ไป main ก่อน (มีแค่ .gitignore + tool)
    - ได้ CSV แล้ว → user review → import ลง master dictionary

[ ] **[ถัดไป หลัง extract สำเร็จ] ปรับ tags_raw ใน kb.json**
    - เพิ่ม quality gate ("ดี"/"เสีย") ใน 77 rules ที่ยังไม่มี
    - เป้าหมาย: ลด over-match

[ ] **[ถัดไป] แก้ build_prompt() ใน typhoon.js**
    - ตัด/ลด chartSummary ให้เหลือแค่ lagna + overall.strength
    - ลด hallucination surface area

[ ] **[ถัดไป] เพิ่ม input validation ใน typhoon.js**
    - validate_inputs(): pos[] NaN check, ascSign range, kbRules empty
    - validate_matched(): filter rule.p ว่าง, MIN_MATCHED_RULES threshold
    - ตั้ง threshold หลังจากรู้คุณภาพ kb.json จริง (จาก extract ข้างบน)

[ ] **[ถัดไป] แก้ v3Typhoon() ใน v3tab.js**
    - เพิ่ม fallback อัตโนมัติเมื่อ API error (ใช้ render_fallback() แทนแค่ toast)

## PENDING — 🔴 [ทดลองใช้] / [BLOCKED]
[ ] [ทดลองใช้] ทดสอบ V3.2.6 บนมือถือจริง (จาก handoff v15)
[ ] [ทดลองใช้] CF: deploy horatad-ai Worker
[ ] [BLOCKED] Bundle jsQR + QRCode.js เป็น local files
[ ] [BLOCKED] QR URL privacy — รอ user ตัดสินใจ Option A/B
[ ] [BLOCKED] Phase 11: cloud sync — รอ server confirm

## DEFERRED — รอ "รอบใหญ่" / dependency
[ ] FLICKER (desktop only) — รอบใหญ่ + root cause horatad.com
[ ] req 11: interp.js → Worker — รอ format นิ่ง
[ ] req 12: obfuscate script.js — รอ user ตัดสินใจ
[ ] populate tb_prediction_conditions ครบ 342 กฎ — ทำหลัง extract + human review
[ ] เพิ่ม priority pr=3,4,5 ใน kb.json — ทำหลัง conditions ครบ
