# BIBLE Memory — LLM CONTROL ARCHITECTURE
# Type: Reference (design pattern)
# Last updated: 2026-05-26
# Purpose: วิธีใช้ knowledge (KB + master_dict + foundational rules) มาคุม LLM
#          ให้ output ไม่ hallucinate และตรงสุริยยาตร์

═══════════════════════════════════════════════════════════════════════
🔴 PREREQUISITE — อ่าน INDEX.md FOUNDATIONAL RULE #1 ก่อน
   ทุก layer ในไฟล์นี้คาดว่าผู้อ่านเข้าใจ natal=80% / ดาวจร=stimulator แล้ว
═══════════════════════════════════════════════════════════════════════

## Strategy: Constrained Generation

หลัก: บีบ decision space ของ LLM ลงให้เล็กที่สุด → เหลือแค่งานง่าย (paraphrase, ไม่ใช่ predict)

```
LLM decision space:
  без KB:  "พยากรณ์ดวงนี้"                ← infinite, hallucination chance สูง
  ด้วย KB: "เรียบเรียง 25 rule ที่ให้มา"   ← finite, hallucination chance ต่ำ
```

---

## 6 Layers — เรียงตาม leverage มาก→น้อย

### Layer 1: Pre-select rules before sending to LLM ✅ (POC v2 shipped)

Engine ค้นหา rules ที่ match chart fingerprint ก่อนเสมอ. LLM ไม่เลือก rule เอง.

**Files:** `workers/kb_wording_prompt_poc.mjs`

**Pattern:**
```
chart → extractFacts → match_KB_by_fingerprint → top_N_rules → prompt
```

LLM ได้รับ: chart facts + matched rules + instruction "use only these rules"

---

### Layer 2: Structured output (JSON schema) 🟡 (schema มี, enforce ยังไม่ทำ)

แทน free-text response, บังคับ output ตาม schema:

```json
{
  "natal_base": [
    {"rule_id": "R013", "domain": "ตัวตน", "statement": "..."}
  ],
  "transit_overlay": [
    {"rule_id": "R191", "anchor_natal_id": "R013", "activation": "...", "statement": "..."}
  ],
  "synthesis": "...",
  "confidence": {"R013": 0.9, "R191": 0.7}
}
```

**Field-level enforcement:**
- `rule_id` → validator ตรวจอยู่ใน KB จริงไหม
- `anchor_natal_id` ใน transit_overlay → บังคับ corollary (transit อ้าง natal)
- `confidence` → filter low confidence ออกก่อน render

**Why:** parser แยก natal/transit ออกจากกัน → ไม่ต้องเรียง order ใน prose level; renderer ทำเอง

---

### Layer 3: Validator loop 🔴 (pending implementation)

หลัง LLM output → code ตรวจก่อนใช้:

| Check | Action ถ้า fail |
|---|---|
| rule_id อ้างมีจริงใน KB | retry with error feedback |
| transit entry มี anchor_natal_id ที่ตรงกับ natal_base[].rule_id | retry |
| ใช้ Western vocab ("Aries", "Cardinal", "Yang") | reject |
| ใช้คำที่ไม่อยู่ใน master_dict.qualities/planets | flag suspicious |
| predict outcome ที่ natal ไม่ support | reject (violation of Rule #1) |

**Retry prompt:**
```
PREVIOUS ATTEMPT FAILED VALIDATION:
- rule_id "R999" ไม่อยู่ใน KB ที่ให้
- transit entry "R191" ไม่มี anchor_natal_id

แก้ไขโดย: ใช้เฉพาะ rule_id ที่อยู่ใน rules list ที่ส่งมา + transit entry ต้อง reference natal_base entry ที่อยู่ใน output เดียวกัน
```

LLM แก้เอง → ไม่ต้อง human in loop

---

### Layer 4: Decomposition — split 1 big prompt → 3 small phases 🔴 (pending)

1 prompt = "พยากรณ์ดวง" ทำให้ LLM ต้องคิดทุก layer พร้อมกัน → confused

**3-phase pipeline:**

**Phase NATAL** (context = master_dict.lagna_concepts + matched natal rules only)
- งาน: extract นิสัยพื้น/ความเป็นไปได้ (possibility space)
- LLM ไม่เห็น transit → forced ไม่ predict timing/intensity
- Output: structured natal interpretation

**Phase TRANSIT** (context = Phase NATAL output + active transit rules)
- งาน: ระบุ activation pattern — natal possibility ใดถูก activate ตอนนี้
- LLM ต้องอ้าง Phase NATAL output → enforced corollary by schema
- Output: structured transit overlay

**Phase PROSE** (context = Phase NATAL + Phase TRANSIT structured outputs)
- งาน: เรียบเรียงเป็นภาษาไทยสวย (สุริยยาตร์ tone)
- ไม่มี logic — แค่ stylistic transformation
- Output: prose

**Benefits:**
- Decision space เล็กต่อ phase → hallucination ↓
- Error isolation: รู้ทันทีว่า phase ไหนพัง
- Each phase verifiable separately

---

### Layer 5: Tool-use / function calling 🔴 (pending; master_dict v1.4 ready)

LLM call functions แทน recall จาก training:

**Tools to expose:**
```typescript
lookup_planet(id: 1-10) → master_dict.planets[id]
lookup_house(id: 1-12) → master_dict.houses[id]
lookup_sign_ruler(sign_id: 1-12) → master_dict.signs[id].ruler_planet_id
find_rules_for_chart(natal_fp[], transit_fp[]) → KB filter
get_tanusesh(chart) → compute via formula (a × b) mod 7
check_special_config(chart, config_name) → {present: bool, evidence: ...}
get_house_ruler_for_lagna(lagna_id, house_id) → master_dict.house_rulers_by_lagna lookup
```

**Why:** LLM ไม่ recall ผิด เพราะไม่ recall — แค่ลุค + compose

---

### Layer 6: Triangulation / multi-vendor self-consistency 🟡 (architecture ออกแบบไว้แล้ว)

KB equalizer test pattern — POC v2 generate prompt 1 ตัว → ส่ง 3 LLM:

```
Prompt → Gemini → output A
       → Typhoon → output B
       → Claude.web → output C

Aggregator → match rule_id citations across A/B/C:
   - 3 ตัวอ้าง rule เดียวกัน → high confidence (AUTO_VERIFIED equivalent)
   - 2 ตัวอ้าง + 1 ไม่ → medium
   - 1 ตัวอ้าง rule แปลก ไม่อยู่ในอีก 2 → likely hallucination → discard
```

**Final output** = consensus + provenance tags + per-source confidence

**Benefit:** Claude reasoning + Typhoon Thai fluency + Groq speed — เลือกที่ดีที่สุดจากแต่ละ vendor
**Cost:** ค่า API 3 เท่า (ใช้เฉพาะ critical predictions)

---

## Implementation status (2026-05-26)

| Layer | Status | Next action |
|---|---|---|
| 1. Pre-select rules | ✅ shipped (POC v2) | iterate scoring per chart type |
| 2. Structured output | 🟡 schema ready | enforce in prompt + add parser |
| 3. Validator loop | 🔴 not started | write `workers/llm_output_validator.mjs` |
| 4. Decomposition | 🔴 not started | scaffold 3-phase prompt templates |
| 5. Tool-use | 🔴 not started | wrap master_dict → `workers/llm_tools.mjs` (6 funcs) |
| 6. Triangulation | 🟡 architecture spec | user runs Groq+Typhoon → compare |

## Recommended next-step order (highest leverage first)

1. **Layer 3 validator** (~1 session) — biggest impact, blocks hallucination at gate
2. **Layer 2 schema enforcement** (~1 session) — pair with Layer 3 (parser feeds validator)
3. **Layer 4 decomposition** (~2 sessions) — scaffolds 3 prompts + tests
4. **Layer 5 tool-use** (~1 session) — wraps master_dict v1.4
5. Layer 6 ขึ้นกับ user รัน LLM extractions ก่อน

---

## Anti-patterns (อย่าทำ)

❌ Send raw chart → "ทำนายดวงนี้" (LLM decides everything)
❌ Trust LLM output ทันที (ไม่ validate)
❌ 1 big prompt ทำทุกอย่าง (Phase NATAL + Phase TRANSIT + PROSE รวมกัน)
❌ Let LLM recall planet positions/sign rulers จาก training (อาจผิด — Western contaminate)
❌ Predict outcome ที่ natal ไม่ support เพราะ "LLM บอกว่ามี" (Rule #1 violation)
❌ ใช้ Western terms (Cardinal/Fixed/Mutable, "House of Career") — สุริยยาตร์เท่านั้น

---

## Cross-ref to existing files

- **`v3/master_dict_meanings.json`** = data source สำหรับ Layer 5 (tool-use)
- **`v3/kb_v24-final.json`** = rule source สำหรับ Layer 1 (pre-select)
- **`workers/kb_wording_prompt_poc.mjs`** = Layer 1 implementation
- **`tools/m0_hallucination_test.html`** = Browser-side Typhoon test (proven path per CLAUDE.md sandbox rules)
- **INDEX.md FOUNDATIONAL RULE #1** = prerequisite — all layers assume it
- **PROMPTS.md** = extraction templates (different use case — KB building, not prediction)
