# Horatad — Session Handoff
# Date: 2026-05-21 (session 2 ของวัน)
# Previous: session_handoff_20260521_v1.md

## STATE
App version : V3.3.0 (main + deployed)
Backups     : backup/v3.3.0, backup/v3.2.9, backup/v3.2.8, backup/v3.2.7, backup/v3.2.6

## DONE (session นี้)
✓ M0: สร้าง m0_hallucination_test.html + m0_latency_ping.html — multi-LLM benchmark
  - Gemini 2.0 Flash | Groq LLaMA 3.3 70B | Typhoon CF Worker
  - latency decomposition: Mode B (prefill-only) + Mode C (streaming TTFB+decode)
  - localStorage key persistence — ไม่ commit secret
  - ผลทดสอบ: LLMs ได้ 0% บนศัพท์โหราศาสตร์ไทยโบราณ → confirmed KB-first architecture
✓ M8: compose_local_prediction() + compose_summary_text() ใน v3/interpretation.js
  - deterministic prediction จาก KB keywords, 100% anti-hallucination
  - polarity จาก t[]/conditions[] (ไม่ใช่ text analysis)
✓ M7: empirical schema ใน kb.json V2.2.0
  - _empirical_schema documentation ใน root
  - empirical_p/n/refs/secondary_obs fields ใน 2 sample TRUE_RULEs
✓ Task A: scripts/gen_rule_skeletons.mjs — พบ 90 missing planet×quality combinations
  - output: v3/kb_skeletons.json — รอ expert กรอก p field
✓ อัปเดต MISSION_FINETUNE.md: M7 + M8 sections + priority table (อัปเดต)
✓ อัปเดต HORATAD_WORKING_MANUAL.md: M7/M8 detail + PDCA case studies 1 + 2
✓ Version bump V3.2.9 → V3.3.0 ครบ 6 จุด + deploy + backup/v3.3.0

## PENDING — 🟢 Claude ทำเองได้ (sandbox)
[ ] M8 wire: เชื่อม compose_local_prediction() → v3tab.js เป็น enhanced fallback
    - ตอนนี้ v3tab.js ยังเรียก render_fallback() จาก typhoon.js
    - แก้ให้ใช้ compose_local_prediction() แทน เมื่อ Typhoon fail
    - export จาก interpretation.js แล้ว ✅ — ต้องแค่ import + wire
[ ] M3 refinement: retry 1 ครั้งก่อน fallback ถ้า Typhoon ไม่ follow JSON format
    - ใน send_to_typhoon() — เพิ่ม retry loop ก่อน return raw text

## PENDING — 🔴 [ทดลองใช้] / [BLOCKED]
[ ] [ทดลองใช้] รัน m0_hallucination_test.html บน horatad.github.io
    - Gemini key ต้อง re-enter (origin ต่างกัน) — quota reset ทุกวัน 11:00น.
    - ดู Groq score (Groq ไม่มี quota limit, ควรรันได้ทันที)
[ ] [ทดลองใช้] ทดสอบ V3.3.0 บนมือถือจริง — ตรวจ predictions tab ยังทำงานปกติ
[ ] [ทดลองใช้] Expert review v3/kb_skeletons.json
    - 90 rules, p field ว่าง — กรอก text ตามตำรา
    - priority: ดาวจันทร์ (missing 9) และ ดาวศุกร์ (missing 6) น่าจะหาได้ง่ายกว่า
[ ] [ทดลองใช้] CF: deploy horatad-ai Worker (wrangler บน machine user)
[ ] [BLOCKED] Phase 11: cloud sync — รอ server confirm
[ ] [BLOCKED] QR URL privacy — รอ user ตัดสินใจ Option A/B

## DEFERRED — รอ "รอบใหญ่" / dependency
[ ] FLICKER (desktop only) — รอบใหญ่ + root cause horatad.com
[ ] req 11: interp.js → Worker — รอ format นิ่ง
[ ] req 12: obfuscate script.js — รอ user ตัดสินใจ

## Context สำคัญ
- **M8 API**: compose_local_prediction(matched_rules) → [{rule_id,text,keywords,polarity,chapter,source:'local'}]
  compose_summary_text(predictions) → Thai summary string
  Export แล้วจาก interpretation.js — ยังไม่ได้ wire เข้า v3tab.js
- **empirical schema**: _empirical_schema ใน kb.json root — field ว่าง = รอ data จาก M7
- **kb_skeletons.json**: 90 skeletons, rule_type=TRUE_RULE, p='' — import เข้า dictionary_builder_v3.html ได้
- **Gemini quota**: 1,500 RPD ฟรี — หมดง่าย ถ้ารัน 31 tests × หลายรอบ reset 11:00น. ไทย
- **LLM limitation (key insight)**: ศัพท์โหราศาสตร์ไทยโบราณ (เสริด/พักร/มนท์) = 0% accuracy
  → LLM = wording layer only, KB = single source of truth
