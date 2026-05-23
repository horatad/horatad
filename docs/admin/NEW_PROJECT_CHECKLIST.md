# New Project Checklist — BIG admin guide

> ใช้เมื่อ BIG session ตัดสินใจเปิด project ใหม่ใน ecosystem (เช่นเดียวกับ  GUARD วันที่ 2026-05-22)

---

## ก่อนเริ่ม — ตอบ 3 คำถามนี้

1. **Gap คืออะไร?** — project ที่มีอยู่ครอบคลุมไม่ได้เพราะอะไร?
2. **Value vs Effort?** — proxy: ใช้ Priority scoring ใน CLAUDE.md (unblock = +3, deadline = +2, value = +2)
3. **Dependency ชัดไหม?** — ใครต้องเสร็จก่อน? ใครรอ output?

ถ้าตอบ "ไม่ชัด" → กลับไปเขียนใน BIG handoff ก่อน ไม่เปิด project

---

## ขั้นตอน — automated (recommended)

```bash
node scripts/admin/new_project.mjs <CODE> "<ชื่อเต็ม>" "<หน้าที่ 1 บรรทัด>"
```

ตัวอย่าง:
```bash
node scripts/admin/new_project.mjs DASHBOARD "Live Stats Dashboard" "หน้า monitor realtime สำหรับ user"
```

Script จะสร้าง/แก้:
- ✅ `docs/<CODE>_MISSION.md` (charter template)
- ✅ `handoffs/<CODE>_<YYYYMMDD>_v1.md` (handoff v1)
- ✅ `PROJECT_STATUS.md` (เพิ่ม section + Quick Reference table + session list)
- ✅ `ECOSYSTEM.md` (เพิ่ม project description + navigation)
- ✅ `CLAUDE.md` (เพิ่มใน project list table)

หลังรัน:
1. **แก้ template** ใน 2 ไฟล์หลัก ให้ตรง scope จริง:
   - `docs/<CODE>_MISSION.md` — เป้าหมาย, architecture, roadmap
   - `handoffs/<CODE>_<DATE>_v1.md` — Phase 0 task list
2. **ตรวจ template:**
   ```bash
   node scripts/admin/handoff_lint.mjs handoffs/<CODE>_<DATE>_v1.md
   node scripts/admin/big_status.mjs   # ดูว่า project ใหม่โผล่
   ```
3. **Commit + ff main** (กฎ admin):
   ```bash
   git add docs/<CODE>_MISSION.md handoffs/<CODE>_*.md PROJECT_STATUS.md ECOSYSTEM.md CLAUDE.md
   git commit -m "<CODE>: เริ่มต้นโครงการ <ชื่อเต็ม>"
   git push -u origin <feature-branch>
   git push origin <feature-branch>:main   # MANDATORY
   ```

---

## ขั้นตอน — manual (ถ้าไม่ใช้ script)

ทำตามลำดับนี้ — ขาดข้อใดข้อหนึ่ง = session ใหม่อาจไม่รู้จัก project:

### 1. สร้าง charter
`docs/<CODE>_MISSION.md` — sections มาตรฐาน:
- ปรัชญา 1 ประโยค
- เป้าหมาย & success metrics
- Architecture / approach
- Cross-project dependencies (โดยเฉพาะ HORATAD/BIBLE/GUARD)
- Roadmap Phase 0-N
- GUARD cross-link section (security/perf concern)

### 2. สร้าง handoff v1
`handoffs/<CODE>_<YYYYMMDD>_v1.md` — sections บังคับ (จาก handoff_lint.mjs):
- `## STATE`
- `## DONE`
- `## PENDING` (มี [ ] checkbox)
- `## WHY LOG` (อย่างน้อย 1 รายการ + คำอธิบาย)

### 3. Register ใน 3 ไฟล์
- `PROJECT_STATUS.md` — section ของ project + แถวใน Quick Reference + เพิ่มชื่อใน "วิธีเริ่ม session ใหม่"
- `ECOSYSTEM.md` — section ใน "แต่ละ Project" + แถวใน file navigation
- `CLAUDE.md` — แถวใน project list table

### 4. GUARD cross-link (ทุก project ใหม่)
ตอบ checklist นี้และเพิ่มลง GUARD risk register ถ้ามี:
- [ ] มี user input → render path → XSS surface? → GUARD-P0-A
- [ ] มี external network call → endpoint trusted? ส่งอะไร? → GUARD-P0-C
- [ ] มี secret/key? → `docs/SECRETS.md` (GUARD-P1-F)
- [ ] มี user data storage → privacy review? → GUARD Phase 1
- [ ] กระทบ Lighthouse perf? → GUARD-P0-E baseline

ถ้าตอบ "yes" ข้อใด → cross-link ใน GUARD handoff v2+

---

## เกณฑ์ตั้งชื่อ CODE

- ตัวพิมพ์ใหญ่ A-Z, 2-12 ตัวอักษร
- ไม่ใช้ตัวสงวน: `BIG` (admin role)
- ชื่อต้องสื่อหน้าที่ — 1 คำดีกว่า acronym ถ้าทำได้
- ตัวอย่างดี: `HORATAD`, `BIBLE`, `JULIAN`, `NOK`, `GUARD`, `PLATFORM`
- ตัวอย่างหลีกเลี่ยง: `PROJECT1`, `NEWSTUFF`, `MISC`

---

## หลังเปิด — verify checklist

```bash
# 1. project ใหม่โผล่ใน admin overview
node scripts/admin/big_status.mjs

# 2. handoff format ผ่าน
node scripts/admin/handoff_lint.mjs

# 3. main = HEAD (ตามกฎ admin)
git log origin/main..HEAD --oneline   # ต้อง empty

# 4. session ใหม่ทดสอบรู้จัก project
# user พิมพ์ "session <CODE>" → Claude ควรอ่าน charter + handoff + เสนอ Phase 0
```

---

## เมื่อ project ใหม่มี dependency ข้าม project

**กฎ:** ถ้า project ใหม่ require output จาก project อื่น
→ เพิ่ม note ใน handoff ของ project ปลายทาง (cross-project handoff)
→ ระบุใน Cross-Project Dependencies Map ของ ECOSYSTEM.md

ตัวอย่างจาก GUARD:
- GUARD require: HORATAD source code (audit), CF Worker code (review)
- →  GUARD handoff ระบุ "T-06 horatad-auth audit pending"
- → HORATAD_MANUAL.md ระบุ "PIN auth → GUARD T-06 owner"

---

## เมื่อ project ใหม่ "ไม่เวิร์ก" / ตัดสินใจปิด

1. อย่าลบไฟล์ทันที — ย้าย `docs/<CODE>_MISSION.md` ไป `docs/archive/`
2. ย้าย handoffs ไป `handoffs/archive/`
3. ลบ section จาก PROJECT_STATUS/ECOSYSTEM/CLAUDE
4. WHY LOG ใน BIG handoff: "ปิด <CODE> เพราะ [เหตุผล]"

---

*สร้าง: 2026-05-23 | อัปเดตเมื่อ workflow เปลี่ยน*
