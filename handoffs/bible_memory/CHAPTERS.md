# BIBLE Memory — CHAPTERS & PROGRESS
# Type: Editable (อัปเดตทุก session)
# Last updated: 2026-05-23

## Extraction Progress

| วันที่ | Session | บท | rules |
|---|---|---|---|
| 2026-05-22 | 1 | ch001-ch015 | 90 |
| 2026-05-22 | 2 | ch015(re)+ch016-ch029 (ยกเว้น ch026) | +65 = 155 |
| 2026-05-23 | 3 | ch026+ch030-ch049+ch056-ch101 | +135 = 290 |

**✅ COMPLETE**: ครบทุก chapter — 102 บท, 290 rules (`v3/kb_v24-3.json`)
Queue: `workers/claude_extraction_queue.json` → pending=0, done=102

## Chapter Map

| CH | หัวข้อ | สำคัญ | ประเภท |
|---|---|---|---|
| ch000 | ประวัติผู้แต่ง | ❌ ข้าม | bio |
| ch001 | ราศีทั้ง 12 | ⭐ ref | definition |
| ch002 | ดาว 10 ดวง + กำลังโคจร | ⭐ ref | definition |
| ch003 | ภพทั้ง 12 | ⭐ ref | definition |
| ch004 | ความหมายดาว | ⭐⭐ rules | NATAL_ATOMIC |
| ch005 | บาป/ศุภเคราะห์ | ⭐ ref | definition |
| ch006 | ดวงมาตรฐาน 10 อย่าง | ⭐⭐⭐ rules | NATAL_ATOMIC (quality) |
| ch007 | ธาตุราศี/ธาตุดาว | ⭐⭐ rules | reference + combination |
| ch008 | ดาวคู่ 4 ประเภท | ⭐⭐⭐ rules | NATAL_COMBINATION |
| ch009 | มุมสัมพันธ์ 4 (กุม/เล็ง/โยค/ตรีโกณ) | ⭐⭐⭐ rules | reference |
| ch010 | กฎลบ-ลบ=บวก | ⭐⭐⭐ rules | NATAL_COMBINATION |
| ch011 | เรือนนอก/เรือนใน | ⭐ ref | definition |
| ch013 | ลัคนา-ตนุเศษ-ตนุลัคน์ | ⭐⭐⭐ rules | NATAL_ATOMIC |
| ch014 | วิธีพยากรณ์ | ⭐ ref | methodology |
| ch015 | พยากรณ์พื้นดวง (17K chars) | ⭐⭐⭐ rules | mixed |
| ch016-ch029 | รายละเอียดดาว/ภพ | ⭐⭐ | mixed rules |
| ch026 | ดาวจรรายดาว (52K chars) | ⭐⭐⭐ rules | TRANSIT_NATAL |
| ch036 | โชคใหญ่ (ground truth) | ⭐⭐⭐⭐ | PRINCIPLE + case_study |
| ch041-ch049 | case studies | ⭐⭐ | case_study → principle |
| ch056-ch075 | บทสั้นผสม Q&A | ⭐ | mixed (ส่วนใหญ่ซ้ำ) |
| ch076-ch099 | สมพงศ์ + Transit เสาร์ | ⭐⭐ | NATAL_COMBINATION + TRANSIT |
| ch100 | วิธีใช้ app ผูกดวงไทย | — ref | reference เท่านั้น |
| ch101 | กรณีศึกษา 1024 อังคารมหาจักร | ⭐⭐ | case_study → principle |

## Quality Notes
- ch026: หนาแน่นที่สุด ทำ transit rules รายดาวครบ
- ch056-ch075: ส่วนใหญ่ Q&A สั้น ซ้ำ rules เดิม density ต่ำ
- ch076-ch099: สมพงศ์ + เสาร์จรทับลัคนา — มีประโยชน์สูง
- ch101: case study ยืนยัน principles สำคัญ (กุมลัคนา priority, 4 ดาวจรร้าย)

---
## Raw text access (appended 2026-05-25)

ทุก chapter content readable via `workers/chapter_texts.json`:
```bash
node -e "const d=require('./workers/chapter_texts.json'); console.log(d['ch013'])"
```
- Object keys = chapter IDs ("ch000"..."ch101")
- Section sub-numbering: "13.1", "13.2", etc. (find via indexOf)
- **ใช้ก่อนถาม user เสมอ** — ก่อน 18:30 2026-05-25 Claude คิดว่าต้อง Q&A กับ user สำหรับ ch013

## Extraction depth notes (appended 2026-05-25)

Chapters used by master_dict so far:
| Chapter | Used by | Status |
|---|---|---|
| ch001 | signs (structural via SIGNS.md) | ✅ |
| ch004-ch008 | planet_positions, planet_pairs | ✅ |
| ch013 | lagna_concepts (full 13.1-13.3 extraction) | ✅ |
| ch038 | special_configs.kum_lakkana_priority (R248, partial) | 🟡 partial |
| ch101 | special_configs (4-evil + mahachakra cases) | 🟡 partial |

Pending deeper extraction (future sessions, sandbox-feasible):
- ch004-006: deeper planet trait amplification
- ch038: kum_lakkana per-aspect expansion (ตรีโกณ/โยค/เล็ง variants per planet)
- ch026: transit rules per-planet (52K chars, dense)
