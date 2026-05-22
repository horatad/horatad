# source/ — ตำราสุริยยาตร์ Source PDFs

Folder สำหรับ source ต้นฉบับตำราโหราศาสตร์ไทย — ใช้ BIBLE extraction pipeline สร้าง atomic rules
ลง `v3/kb.json` (V2.4 format)

## File naming convention

```
CH001.pdf   ← บทที่ 1
CH002.pdf   ← บทที่ 2
...
CH100.pdf   ← บทที่ 100
```

**สำคัญ**: pad **3 หลัก** เพื่อ sort ถูก (CH010 ไม่ใช่ CH10) — ไม่งั้น CH10 จะมาก่อน CH2

## Upload ผ่าน GitHub UI

1. Repo → `source/` → **Add file → Upload files**
2. Drag PDFs (~100 ไฟล์ × ~50KB = ~5MB)
3. Commit message: `BIBLE source: ตำราสุริยยาตร์ N chapters`
4. **Commit directly to main**

ถ้า upload 100 ไฟล์ครั้งเดียวไม่ผ่าน → แบ่ง 2 batch × 50

## ใช้โดย

- `workers/kb_extractor.mjs` (ยังไม่สร้าง) — batch extraction ผ่าน Claude API
- Claude Code session "BIBLE" — pilot extraction ทีละ 3-5 บท
- output ปลายทาง: `v3/kb_v24.json` (atomic V2.4 rules)

## หมายเหตุ

- ไฟล์เหล่านี้ **อ่านได้แต่ห้ามแก้** — เป็น source ต้นฉบับ
- กรณีเปลี่ยน source: bump filename (เช่น `CH001_v2.pdf`) + ระบุใน WHY LOG ของ handoff
- License/copyright ของตำราเป็นของผู้เขียนเดิม — repo นี้ใช้เพื่อ personal study + AI extraction
