# source/ — ตำราสุริยยาตร์ Source PDFs

Folder สำหรับ source ต้นฉบับตำราโหราศาสตร์ไทย — ใช้ BIBLE extraction pipeline สร้าง atomic rules
ลง `v3/kb_v24-3.json` (Claude extraction ✅ DONE) และ `v3/kb_v24.json` (final หลัง compare 3 sources)

## File naming convention

```
CH001.pdf   ← บทที่ 1
CH002.pdf   ← บทที่ 2
...
CH102.pdf   ← บทที่ 102
```

**สำคัญ**: pad **3 หลัก** เพื่อ sort ถูก (CH010 ไม่ใช่ CH10)

## Upload ผ่าน GitHub UI

1. Repo → `source/` → **Add file → Upload files**
2. Drag PDFs (~100 ไฟล์ × ~50KB = ~5MB)
3. Commit message: `BIBLE source: ตำราสุริยยาตร์ N chapters`
4. **Commit ไป feature branch** ตาม CLAUDE.md branch policy (ไม่ใช่ commit ตรงไป main)

ถ้า upload 100 ไฟล์ครั้งเดียวไม่ผ่าน → แบ่ง 2 batch × 50

## ใช้โดย

- Claude Code session "BIBLE" — extraction ทีละ 3-5 บท ผ่าน session (ไม่ใช้ API key)
- `tools/kb_extract.html` — Groq/Typhoon extraction mode
- output ปลายทาง: `v3/kb_v24-3.json` (Claude ✅), `v3/kb_v24-1.json` (Groq), `v3/kb_v24-2.json` (Typhoon)

⚠️ ห้ามใช้ `workers/kb_extractor.mjs` ที่ต้องการ ANTHROPIC_API_KEY — ขัด Cost Policy ใน CLAUDE.md

## หมายเหตุ

- ไฟล์เหล่านี้ **อ่านได้แต่ห้ามแก้** — เป็น source ต้นฉบับ
- กรณีเปลี่ยน source: bump filename (เช่น `CH001_v2.pdf`) + ระบุใน WHY LOG ของ handoff
- License/copyright ของตำราเป็นของผู้เขียนเดิม — repo นี้ใช้เพื่อ personal study + AI extraction
