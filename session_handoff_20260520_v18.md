# Horatad — Session Handoff
# Date: 2026-05-20 (session 18 ของวัน)
# Previous: session_handoff_20260520_v17.md

## STATE
App version : V3.2.7 (main + deployed)
Backups     : backup/v3.2.7, backup/v3.2.6, backup/v3.2.5, backup/v3.2.4

## DONE (session นี้)
✓ Merge branch claude/merge-branch-handoff-G4TM1 → sync กับ main (V3.2.6 + v16/v17 handoff)
✓ kb.json V2 — merge kb_yaml_filled → 342 rules, 283 มี conditions[] (83%)
✓ Version bump V3.2.6 → V3.2.7 ครบ 6 จุด + deploy
✓ fix: fill_yaml_conditions.html — รองรับ wrapped JSON {_stats,rules} (allRules.map error)
✓ MISSION_FINETUNE.md — อัปเดตครบ: Core Premise, M0 Multi-LLM, M4 Empirical DB, M6 Fine-tune
✓ HORATAD_WORKING_MANUAL.md — สร้างใหม่: Vision/Mission/Roadmap/OKR/Action Plan/Partnership
✓ อ่าน Thai_Astrology_LLM_Benchmark_v2.docx — integrate เข้า roadmap แล้ว

## PENDING — 🟢 Claude ทำเองได้ (sandbox)
[ ] M2: แก้ build_prompt() ใน v3/typhoon.js — ตัด chartSummary เหลือแค่ lagna + overall.strength
[ ] M2: แก้ v3Typhoon() ใน v3/v3tab.js — fallback อัตโนมัติเมื่อ API error
[ ] M3: Structured JSON output + rule_id validation ใน build_prompt()
[ ] M1: อัปเดต match_rules() ใน v3/typhoon.js — ใช้ conditions[] แทน tag string matching
[ ] M0: ขยาย hallucination test 6 → 20+ ข้อจาก KB rules ที่มี conditions verified

## PENDING — 🔴 [ทดลองใช้] / [BLOCKED]
[ ] [ทดลองใช้] ทดสอบ V3.2.7 บนมือถือจริง
    - V3 tab: conversation + event timeline ยังทำงานปกติไหม
    - kb.json V2 ไม่ทำให้ match_rules() พัง (conditions[] ยังไม่ถูกใช้ — ใช้ t[] เหมือนเดิม)
[ ] [ทดลองใช้] fill_yaml_conditions retry — โหลด kb_yaml_filled_*.json → fill 59 rules ว่าง → Download merged JSON → upload GitHub
    - bug fix แล้ว: wrapped JSON รองรับได้แล้ว (V3.2.7)
    - Typhoon API อาจ hang — ถ้าแฮ้งให้ refresh แล้วรันใหม่
[ ] [ทดลองใช้] CF: deploy horatad-ai Worker (wrangler บน machine user)
[ ] [BLOCKED] สมัคร API Keys: Gemini (aistudio.google.com) + Groq (console.groq.com) + iApp (api.iapp.co.th)
    - ฟรีทั้งหมด ใช้สำหรับ Multi-LLM benchmark + cross-validation
[ ] [BLOCKED] Phase 11: cloud sync — รอ server confirm
[ ] [BLOCKED] QR URL privacy — รอ user ตัดสินใจ Option A/B

## DEFERRED — รอ "รอบใหญ่" / dependency
[ ] FLICKER (desktop only) — รอบใหญ่ + root cause horatad.com
[ ] req 11: interp.js → Worker — รอ format นิ่ง
[ ] req 12: obfuscate script.js — รอ user ตัดสินใจ

## เอกสารใหม่ที่สร้าง session นี้
- HORATAD_WORKING_MANUAL.md — Working manual สำหรับ tracking + เสนอหุ้นส่วน (12 sections)
- MISSION_FINETUNE.md — อัปเดต: M0–M6 ครบ + Core Premise + API list + Empirical DB roadmap

## Context สำคัญจาก session นี้
- **Core Premise**: Horatad = Event Timer (alarm clock) + Conversation ที่ provable ด้วย factual events
- **LLM role**: craft wording จาก engine output เท่านั้น — ไม่ใช่ knowledge source
- **kb.json V2**: conditions[] ยังไม่ถูกใช้โดย engine (ใช้ t[] tags เหมือนเดิม) — เป็น groundwork สำหรับ M1
- **Multi-LLM plan**: Gemini Flash (1,500/วัน ฟรี) + Groq LLaMA (14,400/วัน ฟรี) พร้อมใช้ทันทีหลังสมัคร
- **fill_yaml_conditions bug**: แก้แล้ว — โหลด merged JSON ได้แล้ว (ก่อนหน้า allRules.map error)
