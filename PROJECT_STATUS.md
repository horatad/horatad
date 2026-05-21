# PROJECT STATUS — Horatad Ecosystem
# อัปเดตทุก session close | Claude อ่านไฟล์นี้ก่อนเลือกงาน

---

## HORATAD — Thai Astrology PWA 🟡 Pre-launch
**Version:** V3.3.0 | **URL:** horatad.com / horatad.github.io/horatad

### สถานะ
- App ทำงานได้ครบ — natal + transit + V3 tab (predictions)
- match_rules() ใช้ conditions[] ✅ | Structured JSON output ✅ | Fallback ✅

### Next (Claude ทำได้)
- [ ] Wire `compose_local_prediction()` → v3tab.js (enhanced fallback แทน render_fallback)
- [ ] M3 retry: retry 1 ครั้งก่อน fallback ถ้า Typhoon ไม่ follow JSON format

### Blocked (รอ user)
- [ ] [ทดลองใช้] ทดสอบ V3.3.0 บนมือถือจริง
- [ ] [ทดลองใช้] CF: deploy horatad-ai Worker
- [ ] [BLOCKED] cloud sync — รอ server confirm
- [ ] [BLOCKED] QR URL privacy — รอ Option A/B

### Handoff ล่าสุด
`handoffs/HORATAD_20260521_v2.md`

---

## BIBLE — Prediction Wording Engine 🟢 Active
**เป้าหมาย:** rules → keywords → LLM wordings — ground-truth based, zero hallucination

### สถานะ
- KB: 342 rules, 284 มี conditions[] (83%)
- M8 compose_local_prediction() ✅ — deterministic keywords, no LLM
- 90 rule skeletons generated (v3/kb_skeletons.json) — รอ expert กรอก p field

### Next (Claude ทำได้)
- [ ] Keyword expansion: synonym map สำหรับ Thai astrology terms
- [ ] House context map: H1=ตัวตน, H2=การเงิน, H7=ความสัมพันธ์ (เพิ่ม theme ต่อ ภพ)
- [ ] Multi-LLM cross-validation: Groq + Gemini agree → high confidence wording

### Blocked (รอ user)
- [ ] [ทดลองใช้] รัน m0_hallucination_test.html — ดู Groq score (Gemini quota reset 11:00น.)
- [ ] [ทดลองใช้] Expert review v3/kb_skeletons.json — กรอก p field priority rules

### ไฟล์หลัก
`MISSION_FINETUNE.md` | `v3/kb.json` | `v3/interpretation.js` | `v3/kb_skeletons.json`

---

## JULIAN — Empirical Astro Database 📋 Schema only
**เป้าหมาย:** Julian Day + planet positions + บุคคลสำคัญ → empirical_p ต่อ rule

### สถานะ
- Schema defined: `_empirical_schema` ใน kb.json root (V2.2.0)
- Sample fields ใน 2 rules (empirical_p=null placeholder)
- Records collected: **0** — ยังไม่ได้เริ่ม scrape

### DB Schema
```json
{
  "jd":         2451545.0,
  "lat":        13.7563, "lng": 100.5018,
  "type":       "human",
  "planets":    [p0..p9],
  "event_label":"leadership",
  "source":     "wikipedia",
  "confidence": 0.9,
  "matched_rules": ["R05","R12"]
}
```

### Next (Claude ทำได้)
- [ ] สร้าง wikipedia_scraper.html — Wikipedia API → วันเกิด → Julian Day
- [ ] สร้าง empirical_validator.html — match persons → rules → count hit/miss → empirical_p

### Blocked (รอ user)
- [ ] [BLOCKED] CF KV/D1 storage — รอ user setup
- [ ] [ทดลองใช้] ทดสอบ Wikipedia scraper ด้วย person จริง (นักการเมือง/นักกีฬา)

### Handoff ล่าสุด
ยังไม่มี (เพิ่งตั้ง schema) — รวมอยู่ใน `handoffs/HORATAD_20260521_v2.md`

---

## Quick Reference

| Project | Code | ไฟล์หลัก | สถานะ |
|---|---|---|---|
| Horatad PWA | HORATAD | script.js, v3/*, index.html | 🟡 Pre-launch |
| Wording Engine | BIBLE | MISSION_FINETUNE.md, v3/interpretation.js, v3/kb.json | 🟢 Active |
| Empirical DB | JULIAN | v3/kb.json (schema), scripts/gen_rule_skeletons.mjs | 📋 Schema only |

---
*อัปเดตล่าสุด: 2026-05-21 | V3.3.0*
