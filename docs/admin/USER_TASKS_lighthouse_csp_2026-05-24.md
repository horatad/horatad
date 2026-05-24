# User Task — Lighthouse Baseline + CSP Violations Collection
**Owner:** BIG (coordination) | **Beneficiary:** GUARD (R-08), HORATAD (Phase 2 baseline)
**Created:** 2026-05-24 | **Effort estimate:** 10-15 นาที total

> ทำตามลำดับ — Part 1 (Lighthouse) แยกออกจาก Part 2 (CSP) ได้ ไม่ต้องทำพร้อมกัน

---

## Part 1 — Lighthouse Baseline (5 นาที)

### ทำไม
- ตอนนี้ยังไม่มี LCP/INP จริงจาก mobile → R-08 status = unknown
- หลัง KB extract V3.3.24 ลด script.js 49% (392→199 KB) → ต้องการ proof ว่าช่วย TBT จริงไหม
- จะใช้เป็น **baseline ก่อน Phase 2 Step 1** (core/ Tier 1 split) — เทียบ before/after ได้

### ขั้นตอน

1. **เปิด Chrome desktop** (ไม่ใช่ Edge/Firefox — Lighthouse ใน Chrome ครบที่สุด)
2. ไปที่ **https://horatad.com** (ไม่ใช่ horatad.github.io)
3. กด `F12` เปิด DevTools → tab **"Lighthouse"**
4. เลือก setting:
   - Mode: **Navigation (default)**
   - Device: **📱 Mobile** ← ทำตัวนี้ก่อน
   - Categories: ✅ Performance · ✅ PWA · ✅ Best Practices · ✅ Accessibility · ✅ SEO
5. กด **"Analyze page load"** → รอ ~30 วินาที
6. เมื่อเสร็จ:
   - กดไอคอน ⬇️ (download report) → เลือก **"Save as JSON"**
   - ตั้งชื่อ: `lighthouse_mobile_2026-05-24.json`
7. กด **"+"** ที่หน้า Lighthouse → run ใหม่ → เปลี่ยน Device เป็น **🖥️ Desktop**
8. Analyze → download JSON → ชื่อ `lighthouse_desktop_2026-05-24.json`
9. ส่งทั้ง 2 ไฟล์เข้า session BIG หรือ GUARD → Claude วิเคราะห์ทันที

### Watchlist (targets)
| Metric | Target Mobile | Target Desktop | Risk ID |
|---|---|---|---|
| LCP (Largest Contentful Paint) | < 2.5s | < 1.5s | R-08 |
| INP (Interaction to Next Paint) | < 200ms | < 100ms | R-08 |
| TBT (Total Blocking Time) | < 200ms | < 100ms | — |
| CLS (Cumulative Layout Shift) | < 0.1 | < 0.1 | — |
| PWA score | ≥ 90 | ≥ 90 | — |
| **Avoid enormous network payloads** | ไม่ flag julian_all.json (15MB) | — | R-14 |

### Notes
- ถ้า Lighthouse บ่นเรื่อง julian_all.json 15MB ใน initial load → bug! (ควร lazy-load) → แจ้ง Claude
- ถ้า PWA score < 90 → ดู audit ที่ fail แล้วส่ง screenshot

---

## Part 2 — CSP Violations Collection (5-10 นาที, ทำ 1 wk หลัง deploy)

### ทำไม
- CSP **Report-Only** deploy เมื่อ 2026-05-23 — ยังไม่ blocking, แค่ log violations ใน console
- ต้องการ list violations ทั้งหมดก่อน flip → enforce (Phase 2 P2-A)
- ถ้าเจอ violation ที่ไม่คาดคิด (เช่น user extension inject script) → ต้อง allowlist หรือ accept

### ขั้นตอน

1. เปิด **https://horatad.com** บน Chrome desktop
2. กด `F12` เปิด DevTools → tab **"Console"**
3. ที่ filter bar กด **🚫 Errors** + **⚠ Warnings** เปิดทั้งคู่
4. **ใช้งานแอปจริง 2-3 นาที** ครอบคลุม flow หลัก:
   - กดผูกดวง (natal) → ดู chart
   - เปิด tab V3 → กดทำนาย (ใช้ Typhoon)
   - เปิด memory modal → กดบันทึก/ลบ
   - เปิด JULIAN tank → โหลดข้อมูล
   - เปิด popup สำคัญ (transit unit, donate, group)
   - กดปุ่ม 🔊 ฟังเสียง (NOK TTS)
5. ดู console — หา message ขึ้นต้นด้วย:
   ```
   [Report Only] Refused to execute inline script...
   [Report Only] Refused to load the script...
   [Report Only] Refused to apply inline style...
   ```
6. **Right-click ใน console → "Save as..."** → ตั้งชื่อ `csp_violations_2026-05-24.txt`
   หรือ copy ทุก [Report Only] line วาง text ส่งให้ Claude
7. ทำซ้ำบน **มือถือ** (ถ้าทำได้) — Safari iOS / Chrome Android ไม่มี desktop console แต่:
   - iOS: เชื่อม Safari Mac → Develop menu → iPhone → web inspector → Console
   - Android: `chrome://inspect` บน desktop Chrome → เลือก mobile tab

### Expected violations (ถ้าเจอแบบนี้ = ปกติ, ไม่ต้องตกใจ)
- `Refused to execute inline event handler` × หลายร้อย → คาดไว้แล้ว (196 inline onclick ใน index.html + script.js)
- `Refused to apply inline style` → คาดไว้ (critical CSS inline)

### Unexpected violations (ต้องแจ้ง Claude)
- `Refused to load script from <external-domain>` → user extension หรือ injected script
- `Refused to connect to <new-domain>` → fetch destination ที่ไม่อยู่ใน allowlist
- `Refused to load image from <new-domain>` → img-src allowlist gap

---

## After User Submission

เมื่อ user ส่งไฟล์เข้า session:

**Claude action:**
1. รับไฟล์ → save ลง `docs/cia/lighthouse_mobile_2026-05-24.json` + `docs/cia/lighthouse_desktop_2026-05-24.json` + `docs/cia/csp_violations_2026-05-24.txt`
2. วิเคราะห์ Lighthouse JSON:
   - extract: performance score, LCP, INP, TBT, CLS, PWA score
   - identify top 3 opportunities ที่ score impact สูงสุด
   - update `docs/cia/perf_baseline_2026-05-23.md` §6 risk register R-08 ด้วย measured value
   - regenerate `docs/admin/RISK_REGISTER.md`
3. วิเคราะห์ CSP violations:
   - แยก expected (inline handlers/styles) vs unexpected
   - ถ้ามี unexpected → update `_headers` allowlist + commit
   - update `docs/cia/csp_policy.md` §3-4 ด้วย observed data
   - decide: ready to enforce หรือ extend observation window

**Deliverable หลัง analysis:**
- `docs/cia/lighthouse_analysis_2026-05-24.md` (new) — top opportunities + Phase 2 priorities
- BIG handoff updated ด้วย next-step recommendation
- ถ้า score ดีกว่าคาด → propose ลดลำดับ Phase 2 Step 1 (อาจไม่จำเป็นเร่ง)
- ถ้า score แย่กว่าคาด → propose Phase 2 Step 1 → ทำเร็วขึ้น

---

## Cross-references
- `docs/cia/perf_baseline_2026-05-23.md` §7 — Lighthouse task spec (original)
- `docs/cia/csp_policy.md` §1-3 — CSP current state + enforcement options
- `docs/GUARD_MISSION.md` — R-08 (perf), R-12 (XSS — CSP backstop)
- `PROJECT_STATUS.md` HORATAD section — V3.3.24 baseline note
