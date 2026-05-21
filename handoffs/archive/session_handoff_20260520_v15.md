# Horatad — Session Handoff
# Date: 2026-05-20 (session 15 ของวัน)
# Previous: session_handoff_20260520_v14.md

## STATE
App version : V3.2.6 (main + deployed)
Backups     : backup/v3.2.6, backup/v3.2.5, backup/v3.2.4, backup/v3.2.3, backup/v3.2.2

## DONE (session นี้)
✓ Phase 12: Group UI — สร้าง/แก้ไข/ลบ group records ใน DB1
✓ Phase 13: Transit Strip — date control ใต้ canvas, toggle on/off
✓ Phase 14: Group → โหลด/เปรียบสมาชิก (natal1 / natal2 สมพงศ์)
✓ Phase 15: Transit date persist ข้าม session (horatad_ts_date_v1)
✓ PWA offline fix V3.2.5 — เพิ่ม horatad_746x746.png ใน CORE_ASSETS, ลบ 500x500
✓ Security audit — H2_SECRET (low risk), QR URL privacy, server dependency map
✓ Philosophy V3.2.6 — Simple/Friendly/UX/Fast → CLAUDE.md + About page + CSS
✓ CLAUDE.md update — conflict priority (Fast>Simple>UX>Friendly), rule #6 text-before-tools
✓ CHANGELOG อัปเดตถึง V3.2.6

## PENDING — 🟢 Claude ทำเองได้ (sandbox)
(ไม่มี task ค้างที่ทำได้ใน sandbox ขณะนี้)

## PENDING — 🔴 [ทดลองใช้] / [BLOCKED]
[ ] [ทดลองใช้] ทดสอบ V3.2.6 บนมือถือจริง
    - Group UI: สร้าง/แก้/ลบ/เพิ่มสมาชิก/โหลด/เปรียบ
    - Transit Strip: toggle, date persist, event select
    - About page: philosophy section แสดงถูกต้องไหม
[ ] [ทดลองใช้] CF: deploy horatad-ai Worker (wrangler บน machine user)
[ ] [BLOCKED] Bundle jsQR + QRCode.js เป็น local files (ต้องดาวน์โหลด — sandbox ไม่มี network)
[ ] [BLOCKED] QR URL privacy — user ตัดสินใจเลือก:
    - Option A (ยาวกว่า/privacy ดีกว่า): ส่ง pos[] array แทน name+lat+lng ใน QR URL
    - Option B (เร็วกว่า): warning dialog ก่อน share QR บอกว่า URL มีชื่อ+พิกัด
[ ] [BLOCKED] Phase 11: cloud sync — รอ server confirm จาก user

## DEFERRED — รอ "รอบใหญ่" / dependency
[ ] FLICKER (desktop only) — รอบใหญ่ + root cause horatad.com
[ ] req 11: interp.js → Worker — รอ format นิ่ง
[ ] req 12: obfuscate script.js — tradeoff: debug ยากขึ้น, รอ user ตัดสินใจ

## บทเรียน session นี้ (อัปเดต CLAUDE.md แล้ว)
- **text ก่อน tool**: คำถาม concept/analysis → ตอบ text ก่อน ไม่เปิดไฟล์จนกว่า user ยืนยัน
- **philosophy conflict**: Fast > Simple > UX > Friendly ถ้าต้องเลือก
- **QR privacy**: ระวัง URL ที่มี raw data ออก GitHub server logs — ต้องแจ้ง user ก่อน share
