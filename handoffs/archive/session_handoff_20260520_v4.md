# Horatad — Session Handoff
# Date: 2026-05-20 (session 4 ของวัน)
# Previous: session_handoff_20260520_v3.md

## STATE

```
App version : V3.0.1 (main + deployed)
script.js   : APP_VERSION='3.0.1' (visual cleanup, JS logic ไม่แตะ)
sw.js       : CACHE_NAME='horatad-v3.0.1'
version.json: {"_id":"HORATAD:VERSION","v":"3.0.1"}
v3/v3tab.js : Version 3.0.4 (ไม่แตะ — V3 tab ไม่เกี่ยว Phase 1B)
GitHub      : main = claude/continue-work-9UiEn = 61bc9e0
Backups     : backup/v2.2.37 .38 .39 (+ .39-docs .39-infra) .40 .41 .42 .43, v3.0.0, v3.0.1
```

---

## DONE (session นี้)

```
✓ V3.0.1 Phase 1B Step 1 — visual cleanup (HTML only, no JS logic change):
  - ซ่อน section-transit (วันที่จร input) ใน TAB 0 — add class="hidden"
  - ซ่อน TAB 1 toggle buttons (4 ปุ่ม):
    * btn-view (toggle ดวงใน/นอก "ดวงที่ 1")
    * btn-outer (ราศี/นพเคราะห์/transit outer ring)
    * btn-chart-type (ราศี/ตรียางค์/นวางค์)
    * btn-transit (รายงานจร toggle)
  - คงไว้: ◀▶ navigator (cycle DB1 entries ใน _viewMode=0)
  - DOM elements ทั้งหมดยัง present (hidden เฉยๆ) → JS internal references
    (_setField, _saveState, _loadState, cycleMemory, etc.) ทำงานต่อได้ปกติ
  - User เข้าไม่ถึง toggle ผ่าน UI → app stay ที่ default state:
    _viewMode=0, _outerState=0, _chartTypeState=0, _reportTransitShow=false
  - Safe rollback: revert HTML อย่างเดียว (JS เดิม intact)
```

---

## PENDING — 🟢 Claude ทำเองได้ (Phase 1B Step 2-5)

```
[ ] V3.0.2 Phase 1B Step 2 — Header strip + ⚙️ menu popup skeleton:
  - แทนที่ row buttons เก่า (ที่ซ่อนแล้ว) ด้วย header strip:
    [◀ ชื่อ + วันเกิด + meta ▶] [⚙️]
  - ⚙️ → popup ว่างก่อน (Step 3 จะเพิ่ม content)
  - CSS: minimal styling สำหรับ header strip + popup overlay reuse _showConfirm
  - JS: function _openMainMenu() / _closeMainMenu() — backdrop + ESC

[ ] V3.0.3 Phase 1B Step 3 — Main menu content + unified popup template:
  - Main menu items: มุมมอง (ดวงใน/นอก), เหตุการณ์จร (แสดง/ไม่), สมพงศ์ (N/10), Tags
  - Unified popup template (Sompong + Event):
    * Slot list (1-10) + DB picker + "+ สร้างใหม่" form
    * Sompong: slot=buffer (horatad_buffer_v3), DB=DB1, form=full natal
    * Event: slot=event_slots (horatad_event_slots_v3), DB=DB2, form=event + link dropdown
  - Reuse _showAlert/_showConfirm UI patterns
  - ใช้ _v3LoadBuffer/_v3LoadEventSlots ที่ Phase 1A สร้างไว้

[ ] V3.0.4 Phase 1B Step 4 — Navigator (◀▶) wire to mode:
  - mode=ดวงใน → cycle DB1 → load to natal1
  - mode=ดวงนอก → cycle buffer → load to natal2
  - แสดง position indicator (i/N) + name/date ใน header strip
  - แทนที่ cycleMemory() logic เดิม (slot=_viewMode-driven)

[ ] V3.0.5 Phase 1B Step 5 — Refactor rename:
  - _natal → natal1, _transit → natal2 (semantic)
  - ทำหลัง UI working — ลด risk

[ ] V3.0.6+ Phase 2-4 (depends on Phase 1B done):
  - Phase 2 event panel + bidirectional linkedEvents
  - Phase 3 Tag area semantic toggle (linked-event names ↔ category)
  - Phase 4 QR scan import (payload format พร้อม V2.2.43)
```

---

## PENDING — 🔴 [USER ONLY]

```
[USER ONLY] ทดสอบ V3.0.1 บนมือถือจริง — verify Step 1 ไม่ regress:
  - ✅ TAB 0: section "วันที่จร" หายไป (input chart 2 ก็ไม่เห็นอยู่แล้ว)
  - ✅ TAB 1: เห็นแค่ canvas + ◀▶ + 💾 บันทึก + 📤 แชร์ + 🔮 ทำนาย
  - ✅ ผูกดวง 1 ทำงานปกติ — save, share, ทำนาย, ◀▶ cycle DB1 ทำงาน
  - ✅ memory popup ทำงาน (เปิดด้วย 🔍 ที่ section 1)
  - ✅ migration toast (จาก V3.0.0) ไม่แสดงอีก (ครั้งเดียวจบ)
  - ❗ ถ้า regression → revert ที่ commit 2ad5c51 ได้ทันที

[USER ONLY] ทดสอบ V2.2.40-43 + V3.0.0 บนมือถือ (ค้างจาก session ก่อน)

[USER ONLY] CF: deploy / config Worker (เหมือนเดิม)
  - wrangler deploy horatad-ai (Typhoon proxy)
  - wrangler deploy horatad-auth (PIN validator)
  - CF Access policy บน /v3/* (req 13)
```

---

## DEFERRED — รอ "รอบใหญ่" / dependency

```
[ ] FLICKER (desktop Ctrl+Shift+R) — รอ V3 รอบใหญ่จบก่อน
[ ] req 11 interp.js → Worker — รอ format นิ่ง
[ ] req 12 obfuscate — รอ V3 stable
[ ] req 13 CF Access frontend — รอ user decide
[ ] req 16, 17 — รอ data file
```

---

## Notes สำคัญ — Phase 1B Step 2

- **Step 1 (V3.0.1) ทำแค่ hide HTML** — ไม่แตะ JS เลย
  → ถ้า user mobile-test แล้วเจอ regression แบบ "บางอย่างหาย" จะ revert ได้ทันที
  → ถ้าเจอ regression แบบ "JS error" แสดงว่าเป็น bug แฝงเดิม (ไม่ใช่ Step 1)

- **Step 2 ความเสี่ยง medium** — เพิ่ม new HTML + JS (header strip + popup)
  → แต่ไม่ลบ/แก้ existing code → ถ้า broken ก็แค่ feature ใหม่ไม่ทำงาน

- **Step 5 (rename) สูงสุด — ทำหลังสุด** — touch dozens of references ทั่ว script.js

- **Wireframe (จาก session ก่อน):**
  - TAB 1 minimal = header strip + chart + report + save/share + ทำนาย
  - 1 ⚙️ menu button → main popup → sub-popups
  - Sompong + Event popups ใช้ template เดียวกัน
  - Navigator arrows ◀ ▶ บน header strip (ติด name/date กลาง)
  - Tag area toggle ตาม "เหตุการณ์จร" state

- **session limit signal:** push 1 version แล้ว — มี capacity ทำ Step 2 ต่อ
  หากต้องการให้แน่ใจว่า Step 1 ปลอดภัย → รอ user verify ก่อน Step 2
