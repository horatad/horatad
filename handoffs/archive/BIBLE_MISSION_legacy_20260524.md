# BIBLE — Prediction Wording Engine
# Mission + Status | อัปเดต: 2026-05-23
# ดูสถานะรวม → PROJECT_STATUS.md | handoff → handoffs/BIBLE_20260523_v1.md

---

## Core Premise

> **Horatad = Event Timer + Conversation**
> LLM crafts wording จาก engine output เท่านั้น — ไม่ตัดสินว่าอะไรจริง
> Provable prediction: ระบุ timing ชัดเจน ตรวจสอบได้หลังเกิดจริง

---

## Current State (2026-05-23)

| ตัวชี้วัด | ค่า |
|---|---|
| KB production | V2.3 — 342 rules (active) |
| conditions[] coverage | 284/342 (83%) |
| kb_v24-3 (Claude) | 290 rules ✅ COMPLETE (102 chapters) |
| Engine | v3.1.0 — match_rules() + compose_local_prediction() ✅ |
| LLM | Typhoon via CF Worker proxy |

---

## Extraction Pipeline — ปัจจุบัน

```
source/ (102 chapter PDFs)
  → Claude Code session extraction (DONE ✅)
  → v3/kb_v24-3.json (290 rules ✅)
  → [pending] v3/kb_v24-1.json (Groq — tools/kb_extract.html)
  → [pending] v3/kb_v24-2.json (Typhoon — tools/kb_extract.html)
  → Compare 3 sources → v3/kb_v24.json (final)
  → Replace v3/kb.json V2.3 → V2.4
```

---

## KB Schema (V2.3 current / V2.4 target)

```json
{
  "id": 5009,
  "rule_type": "TRUE_RULE",
  "c": "ดาวอาทิตย์กุมลัคนา",
  "p": "หยิ่งในศักดิ์ศรี รักหน้า อีโก้สูง",
  "t": ["อาทิตย์", "ดี", "ลัคนา"],
  "conditions": [{"planet_id":"1","quality_required":"ANY","lagna_aspect_req":"กุมลัคนา","required":true}],
  "pr": 1,
  "empirical_p": null,
  "empirical_n": null
}
```

rule_type: `TRUE_RULE` | `TRANSIT_RULE` | `CASE_STUDY` | `HOUSE_CONCEPT`

---

## Pending Tasks

### Claude ทำได้
- `validate_inputs()` ใน v3/engine.js + v3/interpretation.js — GUARD T-05
- `build_prompt()` trim — ตัด chartSummary เหลือแค่ lagna + overall.strength (ลด hallucination)
- `match_rules()` upgrade ใช้ conditions[] structured matching ครบ 100% (ยังมี tags_raw fallback)
- Compare 3 extraction sources → kb_v24.json final (หลัง Groq/Typhoon ครบ)

### รอ user
- รัน Groq mode ใน `tools/kb_extract.html` → download kb_v24-1.json → commit
- รัน Typhoon mode ใน `tools/kb_extract.html` → download kb_v24-2.json → commit

---

## Future (deferred — รอ prerequisite)

| Mission | Prerequisite |
|---|---|
| Multi-LLM benchmark final | รอ user รัน `tools/m0_hallucination_test.html` |
| Structured JSON output validation | รอ match_rules() upgrade ครบ |
| Eval dataset (50 charts × 12 lagna) | รอ KB V2.4 stable |
| Fine-tune Qwen2.5-3B | รอ 500+ training pairs |
| Empirical rule validation | รอ JULIAN integration |

---

## ไฟล์หลัก

| ไฟล์ | หน้าที่ |
|---|---|
| `v3/kb.json` | V2.3.0 — 342 rules (production) |
| `v3/kb_v24-3.json` | 290 rules ✅ Claude extraction complete |
| `v3/kb_v24-1.json` `v3/kb_v24-2.json` | รอ user run browser tool |
| `v3/kb_skeletons.json` | 90 skeleton rules (planet×quality missing) |
| `v3/interpretation.js` | match_rules(), compose_local_prediction() |
| `v3/typhoon.js` | build_prompt(), send_to_typhoon() |
| `v3/v3tab.js` | v3Typhoon(), v3Local() |
| `tools/kb_extract.html` | Claude/Groq/Typhoon extraction (mode selector) |
| `tools/kb_reviewer.html` | Review/edit KB rules UI |
| `tools/dictionary_builder_v3.html` | Build/edit rules + Import AI + Export kb.json |
| `tools/extract_conditions.html` | Typhoon: tags → structured conditions |
| `tools/fill_yaml_conditions.html` | Typhoon: fill conditions[] in kb_yaml_import.json |
| `tools/m0_hallucination_test.html` | Multi-LLM benchmark (Groq + Gemini + Typhoon) |
| `tools/m0_latency_ping.html` | Latency decomposition tool |

---

*อัปเดต: 2026-05-23 | KB V2.3 active | kb_v24-3 ✅ 290 rules | handoff: handoffs/BIBLE_20260523_v1.md*
