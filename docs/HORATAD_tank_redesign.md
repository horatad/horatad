# HORATAD — Tank Redesign Spec
# Date: 2026-05-26
# Status: 📋 Spec finalized (prototype validated by user) — รอเริ่ม implement
# Prototype: https://horatad.github.io/horatad/tools/tank_redesign_prototype.html
# Owner: HORATAD project (refactor script.js + index.html + sw.js)

> **Source of truth สำหรับการ refactor flow รับเข้าข้อมูล + แสดงผล**  
> ทุก decision ใน doc นี้ผ่าน user confirm ใน prototype iterations (session 2026-05-25 ถึง 26)

---

## 🎯 Executive Summary

Refactor architecture จาก **3 tank storage + 4 mode display** เป็น **3-layer (storage / relationships / display buffers)**

**ผลลัพธ์ที่ user ได้:**
- compareMode 4 modes → toggle "เปิด/ปิดวงนอก" ตัวเดียว
- ฟอร์ม Tab 0 เป็น bidirectional widget (display + entry)
- Tank2 (วงนอก) รองรับ 5 kind (สมพงศ์/วันจร/เหตุการณ์/Julian/Private)
- Tag filter — Private 6 tags · Julian 7 tags
- ค้นวันจรจากตำแหน่งดาว (multi-AND condition)
- Rectify mode บนแผนภูมิ — ◀▶ ปรับเวลา ลัคนาขยับตาม

**Tap reduction:** เฉลี่ย 1-3 tap/task (ตาราง compare ด้านล่าง)

---

## 🏗️ Architecture — 3-layer

```
┌─────────────────────────────────────────────────────┐
│ Layer 3: DISPLAY BUFFERS  (transient state)         │
│   slot1 — focal · default = วงใน                    │
│   slot2 — comparison · default = วงนอก (toggle)    │
└────────────────┬────────────────────────────────────┘
                 │ refId → uid
                 ▼
┌─────────────────────────────────────────────────────┐
│ Layer 2: RELATIONSHIPS  (persistent index)          │
│   [{fromUid, toUid, type, ts}, ...]                 │
│   query: getByFocal(uid) → recency-sorted list     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ Layer 1: STORAGE  (persistent unified DB)           │
│   horatad_db_v4 → records[{uid, type, ...}]         │
│   + new fields: source, tags[]                      │
└─────────────────────────────────────────────────────┘
```

### Existing infrastructure (V4 unified — ใช้ได้เลย)
- ✅ `uid` per record (crypto.randomUUID)
- ✅ Unified DB `horatad_db_v4`
- ✅ `type: 'natal' | 'person' | 'event' | 'group'`
- ✅ `linkedNatalUid` on person/event = relationship link
- ✅ Schema migration framework `_migrateSchemaVX()`

### New fields (additive, no breaking change)
- `source: 'form' | 'qr' | 'julian' | 'private'`
- `tags: string[]`
- `recentLinks: uid[]` (last 5, on natal records)
- `_ephemeral: boolean` (slot1/slot2 only, not persisted)

---

## 📋 Slot schema (Layer 3)

```typescript
type Slot = {
  source: 'form' | 'qr' | 'julian' | 'private' | 'transit' | null,
  refUid: string | null,            // uid ใน Layer 1
  kind: 'person' | 'event' | 'moment',
  data: {                            // snapshot — เปลี่ยน Layer 1 ไม่กระทบ display
    d, m, y_be: number,
    t: string,
    lat, lng: number,
    name, gender, prov: string,
    pos, vel: number[],
  },
  _ephemeral: boolean,              // true = ดวงชั่วคราว (ผูกแล้วยังไม่ save)
}
```

---

## 🎨 UX Rules (user-confirmed)

### Rule 1: Form = display only, except after "✏️ ใส่ข้อมูล"
- Lock mode (default) → ฟอร์มแสดงข้อมูลของ slot1 อ่านอย่างเดียว
- กด "✏️ ใส่ข้อมูล" → **ล้างทุกช่อง** + unlock + focus ฟิลด์แรก
- ห้าม pre-fill ค่าเดิม (rectification ทำผ่านปุ่มอื่น — ดู Rule 7)

### Rule 2: Start state = ดวงล่าสุด
- App เริ่ม → โหลด slot1 จาก localStorage (key `horatad_last_slot1_uid`)
- ถ้าไม่มี history (first time) → empty lock state + hint "กด ✏️ ใส่ข้อมูล หรือ 📂 เลือกดวง"
- ❌ ไม่ใช่ "วันปัจจุบัน" auto-prefill

### Rule 3: Outer toggle = on/off (compareMode ถูกลบ)
- ปุ่ม "+ เปิดวงนอก" ghost button → tap = เปิด picker
- Picker เลือก kind: 🧑 สมพงศ์ / 📅 วันจร / ⭐ เหตุการณ์
- เปิดแล้ว → chip "วงนอก: X ×" ใต้แผนภูมิ
- กด × = ปิดวงนอก → กลับโหมดดวงเดี่ยว
- ❌ ไม่มี swap inner↔outer ใน V1

### Rule 4: Prediction follows slot1 (focal anchor)
- วงนอก OFF → "ดวงเกิด" prediction
- วงนอก ON + kind=moment/event → "ดวงเกิด + ดวงจรกระทบ"
- วงนอก ON + kind=person → "ดวงสมพงศ์" (V1: reuse transit ruleset · V2: synastry rules from BIBLE)

### Rule 5: Relationship picker = context-aware (Option C)
- กด "+ เปิดวงนอก" → picker popup
- ด้านบนสุด: **"🕘 เคยเปรียบกับดวงนี้"** chips (top 5 recency) — เฉพาะถ้ามี relationships
- ด้านล่าง: kind tiles + browse list
- Auto-create relationship เงียบ ๆ เมื่อ user เลือก slot2 (ไม่มี popup ถาม)

### Rule 6: Source-aware UI
| Source | Background | Badge | Edit | Save Copy |
|---|---|---|---|---|
| 📂 Private | สีปกติ | เขียว | ✏️ ใส่ข้อมูล | — |
| 📤 QR | ฟ้าจาง | ฟ้า + "รับจาก X เมื่อ Y" | ✏️ → ephemeral | 💾 Save Copy |
| ⭐ Julian | ทองจาง | ทอง + "accuracy C" | ✏️ → ephemeral | 💾 Save Copy |
| 🔮 form/ephemeral | สีอ่อน | "ชั่วคราว (ยังไม่บันทึก)" | (default unlock) | 💾 บันทึกลง Private |

→ กัน user เผลอเขียนทับข้อมูลคนอื่น (QR/Julian)

### Rule 7: Rectify mode (chart graphic page)
- ปุ่ม "🎯 ปรับลัคนา" บน chart toolbar (สีเหลือง warning)
- เปิด mode → banner สีเหลืองโผล่ + step selector (1/5/10/30 นาที)
- ◀▶ ใต้แผนภูมิ rewire → เลื่อนเวลา ±step นาที (lagna ขยับตาม)
- ฟอร์ม mirror slot1 (lock mode — เห็นเวลาใหม่แต่แก้ตรงไม่ได้)
- "💾 บันทึก" → **confirm dialog**: "บันทึกเวลา X → Y แน่ใจ?" → write-back ลง Private
- "↩️ ยกเลิก" → revert จาก snapshot
- ถ้า slot1 มาจาก QR/Julian → ขอ Save Copy ก่อน rectify

### Rule 8: Default form value (input mode)
- ครั้งแรก (no history) → ล้างหมด, user กรอกเอง
- หลัง "✏️ ใส่ข้อมูล" บนดวงที่มีอยู่ → ล้างหมด, user กรอกใหม่
- ❌ ไม่มี "📋 คัดลอกค่าเดิม" (ลบไปแล้ว — rectify ทำหน้าที่นี้)

### Rule 9: Tag filter (Private / Julian)
- Tag pool ต่อ source:
  - Private: ตัวเอง · ครอบครัว · เพื่อน · คนรู้จัก · ทดลอง · อื่น ๆ
  - Julian: ราชวงศ์ · นักการเมือง · ดารา · นักกีฬา · นักวิทยาศาสตร์ · ศิลปิน · อื่น ๆ
- multi-select OR (chip filter)
- รายการแสดง tag badge ติดข้างชื่อ
- ฟอร์ม input mode มี row "🏷️ แท็ก" (multi-select)

### Rule 10: Planet search (วันจร)
- Outer picker → kind "📅 วันจร" → sub-mode "🔍 ค้นจากตำแหน่งดาว"
- multi-row AND condition: `(ดาว, ราศี/ภพ, ตำแหน่ง)` × N
- ปุ่ม "+ เพิ่มเงื่อนไข" / "✕ ลบ"
- Window adaptive:
  - มี slot1 (person) → birth_y to birth_y+100 (lifetime bound)
  - ไม่มี slot1 / event → now-100 to now+200 (เหตุการณ์บ้านเมือง)
- Algorithm: sign-entry events + range intersection (~17k events/100 ปี → fast on-demand)

### Rule 11: Label cycle toggle
- chip "🅰️ ราศี → 🏠 ภพ → 🚫 ปิด" ติดข้าง mode label ใต้แผนภูมิ
- กระทบทั้งวงในและวงนอก
- save preference: `horatad_label_mode`

### Rule 12: Chart nav ◀▶ (ใต้แผนภูมิ)
- เลื่อน slot2 ตาม kind:
  - moment → ◀▶ ก้าววัน + dropdown sub-control (วัน/สัปดาห์/เดือน/ปี/ราศี)
  - person → คนถัดไปใน source list (Private/QR/Julian)
  - event → event ถัดไป
- วงนอกปิด → disable (ยกเว้น rectify mode → ใช้สลับเลื่อนเวลา)

### Rule 13: Mini ◀▶ ในฟอร์ม Tank1
- ปุ่มเล็ก ๆ ในแถวปุ่มของฟอร์ม → browse Private list ทีละคน
- กัน "เปิด picker บ่อย ๆ ตอน browse"

### Rule 14: Import / Export / Sort
- 📥 Import (.json) — merge เข้า Private + QR + relationships (skip duplicate by uid)
- 📤 Export — dump ทั้งหมดเป็น .json (download)
- ⇅ Sort dropdown: ชื่อ A-Z/Z-A · ใหม่ล่าสุด · วันเกิดล่าสุด/เก่าสุด
- ตำแหน่ง: ใน picker popup header

### Rule 15: Reactive sync dot (L2)
- ดอทเล็กก่อน prediction status
- กระพริบเขียว + halo 1.5s ทุก renderAll()
- บอก user: "prediction sync กับ state ปัจจุบัน"
- ใน real app: ถ้าใช้ tab structure → เพิ่ม L3 badge ที่ Tab 3 ด้วย

---

## 📊 Tap count — เทียบ flow เก่า vs ใหม่

| Task | V3.3.31 | Redesign | Δ |
|---|---|---|---|
| เปิดดูดวงตัวเอง | 0 | 0 | — |
| เปลี่ยนดวงตัวเอง | 3-5 | 3 | -2 |
| เพิ่มดวงสมพงศ์ | 4-6 | 3 | -3 |
| ดูจรวันนี้ | 2-3 | 2 | -1 |
| สลับ moment↔person↔event | 4+ | 2 | -2 |
| Rectify ปรับเวลา ±5 นาที | N/A | 3 (mode→click→save) | new |
| ค้นวันจรจากดาว | N/A | 4 (open→tab→fill→search) | new |

---

## 🚦 Implementation Plan — 4 phases

### Phase A — Foundation (low risk, invisible) — Est: 1-2 commits
1. ขยาย schema record:
   ```js
   { uid, type, ..., source: 'private', tags: [] }
   ```
2. Migration: `_migrateSchemaV5()` — backfill source='private' tags=[] ทุก record เดิม
3. Helpers ใหม่:
   - `_dbSetSource(uid, source)`
   - `_dbGetByTag(tag, type?)`
   - `_dbRecentLinks(natalUid, limit=5)` — sort linked records by ts desc
4. localStorage key: `horatad_last_slot1_uid` (สำหรับ Rule 2)
5. ⚠️ ไม่มี UI change — ของเดิมยังทำงานเหมือนเดิม

### Phase B — Internal slot abstraction (medium risk) — Est: 2-3 commits
1. สร้าง slot1/slot2 wrapper (ห่อ _natal/_chart2 เดิม)
2. State derivation: compareMode → slot2.kind|null (mapping function)
3. Form lock/edit state ("✏️ ใส่ข้อมูล" rename + behavior)
4. Default = ดวงล่าสุด (Rule 2)
5. ⚠️ UI mostly unchanged — internal restructure

### Phase C — Visible refactor (high risk) — Est: 4-6 commits, ⚠️ รอ CSP enforce
1. Unified picker popup (📂 เลือกดวง) — แทน memory tab navigation
2. Outer toggle "+ เปิดวงนอก" — แทน compareMode cycle button
3. Outer picker with 🕘 history + 3 kind tiles
4. Source-aware UI (Rule 6: badges, colors, edit protection)
5. Save Copy to Private workflow
6. Mode label + sync dot
7. ลบ compareMode/outerDisplay state vars
8. ⚠️ Breaking UI — ต้องทำหลัง CSP enforce เพราะ inline handler rewire

### Phase D — Extras (modular, ทำทีละตัว) — Est: 1-2 commits/feature
- D1: Tag filter (Rule 9)
- D2: Sort dropdown (Rule 14)
- D3: Import/Export (Rule 14)
- D4: Planet search multi-AND (Rule 10)
- D5: Rectify mode + ◀▶ (Rule 7)
- D6: Label cycle (Rule 11)
- D7: Chart nav reassign + Mini ◀▶ (Rule 12-13)

---

## ⚠️ Risk Register

| Risk | Mitigation |
|---|---|
| Refactor breaks existing tank logic | Phase A first (additive, no remove) → test → Phase B |
| CSP enforce ยังไม่ done | Phase C wait — Phase A+B+D non-UI/safe ก่อน |
| user เคยชิน compareMode cycle | Migration notice popup ครั้งแรก (1x dismissible) |
| Data loss ตอน schema migration | TANK_SHADOW_KEY backup pattern เหมือน v3→v4 |
| QR backward compat (old format) | _parseH1Payload ไม่แตะ — slot1 รับเข้าได้เหมือนเดิม |
| Rectify เผลอเขียนทับ Private | confirm dialog + snapshot revert (Rule 7) |

---

## 🔗 References

- **Prototype:** https://horatad.github.io/horatad/tools/tank_redesign_prototype.html
  (validated by user, 2026-05-25 → 2026-05-26 iterations)
- **Existing V4 schema:** `script.js:1865-1925`
- **Memory file:** `handoffs/HORATAD_memory.md` — patterns + bug history
- **CSP status:** GUARD Phase 2 — รอ violations 1wk (~deadline 2026-05-30)

---

## ✅ User-confirmed decisions log

| Date | Decision |
|---|---|
| 2026-05-25 | 2 tank model (slot1 focal · slot2 compare) |
| 2026-05-25 | Outer toggle on/off (เลิก compareMode cycle) |
| 2026-05-25 | Relationships auto-create + Option C picker UI |
| 2026-05-25 | Default = ดวงล่าสุด (ไม่ใช่วันปัจจุบัน) |
| 2026-05-25 | "✏️ ใส่ข้อมูล" = clear+unlock (strict, no pre-fill) |
| 2026-05-25 | "🔮 เพิ่มชื่อ" replace "ผูกดวง" + "💾 บันทึก" แยก action |
| 2026-05-25 | Tag pool + filter — Private 6 / Julian 7 |
| 2026-05-25 | Planet search multi-AND + lifetime window |
| 2026-05-25 | Rectify mode บน chart toolbar + confirm dialog |
| 2026-05-25 | Sync dot L2 — ไม่ต้องไป tab badge L3 |
| 2026-05-26 | Spec finalized, ready for Phase A implementation |
