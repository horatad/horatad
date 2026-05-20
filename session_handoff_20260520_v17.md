# Horatad — Session Handoff
# Date: 2026-05-20 (session 17 ของวัน)
# Previous: session_handoff_20260520_v16.md

## STATE
App version : V3.2.6 (main + deployed — ไม่มี version bump session นี้)
Backups     : backup/v3.2.6, backup/v3.2.5, backup/v3.2.4, backup/v3.2.3, backup/v3.2.2
Branch      : claude/review-typhoon-api-T0n0e (ยังไม่ merge — รอ user)

## DONE (session นี้)
✓ อ่านและวิเคราะห์ suriyart_knowledge_base.yaml ครบ ch01-99
  - 342 structured rules | TRUE_RULE:104, TRANSIT_RULE:49, CASE_STUDY:122, HOUSE_CONCEPT:50
  - กลุ่มมีค่าสูงสุด: planet×quality×lagna matrix (ch39,56-69), transit rules (ch34-37), finance (ch59-63)
✓ เขียน scripts/parse_yaml_kb.mjs — แปลง YAML → v3/kb_yaml_import.json
  - 342 rules | 59% มี conditions จาก regex parser | 140 rules ยังว่าง
✓ สร้าง fill_yaml_conditions.html — Typhoon เติม conditions[] 140 rules ที่ว่าง
  - รับ file input, batch 5/8/12, download merged JSON + Download kb.json (พร้อมใช้ทันที)
✓ อัปเดต MISSION_FINETUNE.md → living checklist (✅/🔲/🔴 + priority table)

## PENDING — 🔴 [ต้องทำก่อน — user จับมือกับ Claude ขั้นตอน]

### ขั้นที่ 1 — Merge branch
```bash
git checkout main
git merge claude/review-typhoon-api-T0n0e --ff-only
git push origin main
```

### ขั้นที่ 2 — เปิด fill tool
- เปิด https://horatad.github.io/horatad/fill_yaml_conditions.html
- โหลดไฟล์ `v3/kb_yaml_import.json` (อยู่ใน repo)

### ขั้นที่ 3 — รัน Typhoon fill
- กด ▶ เริ่ม Fill (mode: "เฉพาะ conditions ว่าง", batch 8)
- รอ ~18 batches, ~3-5 นาที
- ถ้า error บาง batch → กด stop → note batch ที่ fail → รันใหม่เฉพาะ range

### ขั้นที่ 4 — Download
- กด ⬇ Download kb.json → ได้ไฟล์ชื่อ kb.json

### ขั้นที่ 5 — Claude copy เข้า repo
- ส่งไฟล์ kb.json ให้ Claude → Claude copy ไปที่ v3/kb.json → commit → push

## PENDING — 🟢 Claude ทำได้เลย (ไม่รอ M1)

### M2 — Clean Pipeline (แนะนำทำ session ถัดไป)
[ ] แก้ build_prompt() ใน v3/typhoon.js — ตัด chartSummary เหลือ lagna + overall.strength
[ ] แก้ v3Typhoon() ใน v3/v3tab.js — เพิ่ม fallback อัตโนมัติเมื่อ error (render_fallback)
[ ] เพิ่ม validate_inputs() — pos[] NaN, ascSign 0-11, kbRules empty
[ ] เพิ่ม validate_matched() — filter rule.p ว่าง, MIN_MATCHED_RULES

### M3 — Structured JSON Output (แนะนำทำ session ถัดไป)
[ ] แก้ build_prompt() บังคับ output: {"predictions":[{"rule_id":X,"text":"..."}]}
[ ] validation หลัง Typhoon ตอบ — ตรวจ rule_id อยู่ใน matched rules → ตัดถ้าไม่อยู่

## PENDING — 🔴 [ทดลองใช้] / [BLOCKED]
[ ] [ทดลองใช้] ทดสอบ V3.2.6 บนมือถือจริง (จาก handoff v15)
[ ] [ทดลองใช้] CF: deploy horatad-ai Worker
[ ] [BLOCKED] Bundle jsQR + QRCode.js เป็น local files
[ ] [BLOCKED] QR URL privacy — รอ user ตัดสินใจ Option A/B
[ ] [BLOCKED] Phase 11: cloud sync — รอ server confirm

## DEFERRED
[ ] FLICKER (desktop only) — รอบใหญ่
[ ] req 11: interp.js → Worker — รอ format นิ่ง
[ ] req 12: obfuscate script.js — รอ user ตัดสินใจ
[ ] build_kb.mjs (xlsx → kb.json pipeline) — ทำหลัง fill สำเร็จ

## ไฟล์สำคัญที่เพิ่มใน session นี้
- scripts/parse_yaml_kb.mjs
- v3/kb_yaml_import.json
- fill_yaml_conditions.html
- MISSION_FINETUNE.md (updated — living checklist)
