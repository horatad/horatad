# Horatad — Session Handoff
# Date: 2026-05-21 (session 1 ของวัน)
# Previous: session_handoff_20260520_v18.md

## STATE
App version : V3.2.9 (main + deployed)
Backups     : backup/v3.2.9, backup/v3.2.8, backup/v3.2.7, backup/v3.2.6

## DONE (session นี้)
✓ M0: สร้าง m0_hallucination_test.html — 31 ข้อจาก KB ground truth, 3 LLMs parallel
  - Gemini 2.0 Flash | Groq LLaMA 3.3 70B | iApp Chinda 4B
  - scoring: keyword overlap (keys[] ต่อ rule) — ✅/⚠️/❌ + latency avg
  - iApp endpoint: api.iapp.co.th/ai/v2/chat/completions (header: apikey)
✓ M1: match_rules() ใช้ conditions[] แทน t[] tag matching
  - _checkCondition() + _matchByConditions() — AND logic สำหรับ required conditions
  - rules ที่ไม่มี conditions[] fallback ไป t[] tag matching (backward compat)
  - transit rules ('จร' tag) ยังใช้ t[] tag matching เหมือนเดิม
✓ M2: build_prompt() ย่อ chartSummary → ลัคนา + กำลังโดยรวม เท่านั้น (ลด token)
✓ M2: v3Typhoon() fallback อัตโนมัติ — แสดงกฎดิบ + isFallback badge เมื่อ Typhoon error
✓ M3: structured JSON output — {"predictions":[{"rule_id":"R01","text":"..."},...]}
  - rule_id validation: กรอง hallucinated rule_ids ออก (ต้องอยู่ใน R01–Rxx ของ matched rules)
  - graceful fallback: ถ้า JSON parse ไม่ได้ → แสดง raw text
✓ Version bump V3.2.8 → V3.2.9 ครบ 6 จุด + deploy + backup/v3.2.9

## PENDING — 🟢 Claude ทำเองได้ (sandbox)
[ ] M1 refinement: ทดสอบว่า conditions[] matching ให้ผล rules ดีกว่า t[] หรือไม่
    - อาจเพิ่ม logging ใน match_rules() เพื่อ debug (flag: _debug=true)
[ ] M3 refinement: ถ้า Typhoon ไม่ follow JSON format → เพิ่ม retry 1 ครั้ง ก่อน fallback raw text

## PENDING — 🔴 [ทดลองใช้] / [BLOCKED]
[ ] [ทดลองใช้] ทดสอบ V3.2.9 บนมือถือจริง
    - Typhoon AI: JSON output ใหม่ — ตรวจว่า predictions แสดงถูกต้อง
    - Fallback mode: ทดสอบ offline (ปิด network) → ควรเห็น badge "⚠️ Typhoon ไม่ตอบ"
    - M1 conditions matching: ดู rules ที่แสดงใน "ดูกฎ local" — สมเหตุสมผลไหม
[ ] [ทดลองใช้] fill_yaml_conditions retry — 58 rules ว่าง → bug fixed แล้ว
[ ] [ทดลองใช้] CF: deploy horatad-ai Worker (wrangler บน machine user)
[ ] [ทดลองใช้] รัน m0_hallucination_test.html — ใส่ API keys + กด Run All Tests → ดู score per LLM
    - API keys พร้อม: Gemini / Groq / iApp ✅
[ ] [BLOCKED] Phase 11: cloud sync — รอ server confirm
[ ] [BLOCKED] QR URL privacy — รอ user ตัดสินใจ Option A/B

## DEFERRED — รอ "รอบใหญ่" / dependency
[ ] FLICKER (desktop only) — รอบใหญ่ + root cause horatad.com
[ ] req 11: interp.js → Worker — รอ format นิ่ง
[ ] req 12: obfuscate script.js — รอ user ตัดสินใจ

## Context สำคัญ
- **M1**: conditions[] matching ใช้ AND logic — required: false คือ "ไม่บังคับ" (ไม่ตรวจ)
- **M3**: rule_id format = R01, R02, ..., Rxx (padStart 2 digits) — ต้องตรงกัน ถึงจะผ่าน
- **M2 fallback**: ถ้า payload/matched null (KB load fail ก่อน) → toast error ธรรมดา ไม่ใช่ fallback
- **Transit rules**: ยังใช้ t[] tag matching — conditions[] ไม่ถูกใช้กับ 'จร' rules (intentional)
- **58 rules ว่าง**: ใช้ t[] tag matching ปกติ — conditions pass ข้ามไป (conditions.length === 0)
