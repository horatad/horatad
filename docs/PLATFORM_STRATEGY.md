# PLATFORM — FB Content Strategy
# สร้าง: 2026-05-29 | Owner: PLATFORM session

---

## 🎯 Goal

**สร้าง credibility "โหราศาสตร์ที่พิสูจน์ได้"**
→ ดึง traffic ไป horatad.com → build user base → รองรับ JULIAN research output

Page: โหราทาส AI (`FB_PAGE_ID=1095745230295693`)

---

## 👥 Target Audience

| กลุ่ม | ลักษณะ | Content ที่ดึงดูด |
|---|---|---|
| **Primary** | คนไทยสนใจโหราศาสตร์ (อายุ 25-45) | EP YouTube + TALS series |
| **Secondary** | คนที่อยากรู้ว่าโหราศาสตร์พิสูจน์ได้จริงไหม | JULIAN research findings |
| **Long-term** | นักโหราศาสตร์มืออาชีพ | methodology + accuracy grade |

---

## 📊 Content Mix

| ประเภท | สัดส่วน | เป้าหมาย | Series cap |
|---|---|---|---|
| EP YouTube (education) | 71% (5/7) | reach + awareness | ไม่ cap |
| Research/TALS series | 29% (2/7) | credibility signal | max 2/สัปดาห์ |
| JULIAN statistical findings | เมื่อมี data | highest trust signal | แทรก EP slot |

**Posting:** 1 โพสต์/วัน · 08:30 ICT · อัตโนมัติ (cron)

---

## 📈 KPIs — วัดทุกเดือน

| KPI | เป้าหมาย เดือน 1 | เป้าหมาย เดือน 3 | วัดจาก |
|---|---|---|---|
| Follower growth | +50/เดือน | +150/เดือน | FB Page Insights |
| Average reach/post | >200 | >500 | FB Page Insights |
| Engagement rate | >2% | >3% | (likes+comments+shares)/reach |
| Top content type | — | Research > EP ใน engagement | FB Insights by post |
| Link clicks (horatad.com) | — | track เมื่อ link posts เพิ่ม | FB Insights |

---

## 📋 Content Rules (standing — enforce ใน FB policy gate)

1. **Disclaimer บังคับ** ทุก finding/case_study — `"สถิติประชากร ≠ ชะตากรรมบุคคล"`
2. **Accuracy claim ต้องมี n=** — ห้ามบอก % โดยไม่มีขนาดตัวอย่าง
3. **ห้าม engagement bait** — ไม่มี "tag เพื่อน / กด like ถ้า / แชร์เพื่อโชค"
4. **Format variation** — ไม่โพสต์ category เดิมเกิน 3 วันติด
5. **ห้าม prediction framing** — ใช้ "พบว่า / แนวโน้ม / สถิติ" ไม่ใช่ "ทำนาย / ดวงบอกว่า"

---

## 🔄 Content Pipeline

```
YouTube channel
    ↓ youtube_sync (cron)
content/inbox/
    ↓ content_curator (cron 08:00 ICT) — FB policy gate 4 กฎ
content/scheduled/
    ↓ fb_autopost (cron 08:30 ICT)
Facebook Page
    ↓ commit
content/posted/
```

**Requeue:** `node workers/content_requeue.mjs` — ใช้เมื่อ scheduled ใกล้หมด (<7 วัน)
**Research refill:** `node workers/julian_research_gen.mjs` — เมื่อ research series หมด inbox

---

## 🔑 FB Token — สถานะ + กฎจำ (verified 2026-05-29)

**Token ปัจจุบัน (ใน GitHub Secrets `FB_PAGE_TOKEN`):**

| Field | ค่า | หมายเหตุ |
|---|---|---|
| Type | **Page** | ✅ ถูกตัว (ไม่ใช่ user token) |
| Expires | **Never** | ✅ token เองไม่หมดอายุ — โพสต์ได้ตลอด |
| Scopes | `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `public_profile` | engagement KPI ทำงานได้ |
| **Data Access Expires** | **~ปลาย ส.ค. 2026 (90 วัน)** | ⚠️ กฎ GDPR — คนละตัวกับ token expiry |

**กฎจำ 2 ข้อ:**

1. **Data Access ทุก ~90 วัน (≠ token expiry):**
   - Token **ไม่หมดอายุ** → posting ทำงานตลอด ✅
   - แต่ FB บังคับ re-authorize ทุก 90 วัน **ถ้าต้องการอ่าน data (insights/engagement)**
   - ราวปลาย ส.ค. 2026 → ถ้า KPI report เริ่ม fail ที่ engagement → re-login generate token ใหม่ (posting ยังไม่กระทบ)

2. **`read_insights` ยังไม่ได้เพิ่ม — รอ ≥100 followers:**
   - ตอนนี้ Page มี ~5 followers → page-level insights (reach/impressions) ยังไม่มี data มีความหมาย
   - เพิ่ม scope `read_insights` ตอน generate token **เมื่อ followers ≥100** จะคุ้มกว่า
   - จนกว่าถึงตอนนั้น KPI report ติดตามแค่ followers + post engagement (พอแล้ว)

**วิธี re-generate (ถ้าต้อง):** Graph API Explorer → ติ๊ก scopes → exchange long-lived → `me/accounts` → `data[0].access_token` → อัปเดต Secret (ดู `workers/fb_token_exchange.mjs`)

---

## 🚨 Risk Monitor

| ความเสี่ยง | สัญญาณ | action |
|---|---|---|
| Reach ลดฮวบ | avg reach ลด >50% ใน 2 สัปดาห์ | audit content type + posting time |
| Engagement drop | rate < 1% ต่อเนื่อง 2 สัปดาห์ | เพิ่ม research/findings ใน mix |
| Data Access หมด (90 วัน) | KPI report fail ที่ engagement (posting ยังปกติ) | re-authorize → generate Page token ใหม่ |
| คิวว่าง | scheduled < 3 อัน | รัน requeue ทันที |

---

## 📅 Maintenance Calendar

| ความถี่ | งาน | ผู้รับผิดชอบ |
|---|---|---|
| รายวัน | cron โพสต์อัตโนมัติ | PLATFORM (อัตโนมัติ) |
| รายสัปดาห์ | ตรวจ scheduled ว่าเหลือพอไหม | PLATFORM (Claude) |
| รายเดือน | ดู FB Insights + เทียบ KPI | ปีเตอร์ |
| ~90 วัน (ปลาย ส.ค. 2026) | re-authorize ถ้า KPI report fail ที่ engagement (Data Access GDPR) | ปีเตอร์ |
| เมื่อ followers ≥100 | เพิ่ม scope `read_insights` ตอน regenerate token | ปีเตอร์ |
| เมื่อ JULIAN มี findings ใหม่ | รัน julian_proposal_gen.mjs → inbox | PLATFORM (Claude) |

---

## WHY LOG

- **Goal = credibility ไม่ใช่ viral (2026-05-29)** — page ขาย "โหราศาสตร์ที่พิสูจน์ได้" ไม่ใช่ entertainment · viral content เสี่ยง FB flag มากกว่า · credibility content สร้าง long-term trust กับ audience ที่ใช้ horatad.com จริง
- **29% research cap (2026-05-29)** — มากกว่านี้เสี่ยง spam signal เพราะ format ซ้ำ · น้อยกว่านี้ research หายไปในคิว YouTube · 2/7 = balance reach (EP) + trust (research)
- **ไม่วัด viral metrics (2026-05-29)** — shares/virality ของ prediction content เสี่ยง FB policy · วัด engagement rate แทนเพราะสะท้อน audience quality ไม่ใช่ luck

---

## 📋 Session Report — 2026-05-29 (BIG → PLATFORM strategy deep-dive)

> รายงานนี้สรุปการตัดสินใจเชิงกลยุทธ์ทั้งหมดจาก session 2026-05-29
> เก็บไว้เป็น reference ถาวร — session ใหม่ไม่ต้องรื้อเล่าใหม่

---

### 1. ปัญหาที่นำมาสู่การสนทนา: Project Mix-up

**สัญญาณ:** พี่ปีเตอร์พบว่า files ถูกแก้ผิด project, version drift, context หายระหว่าง session

**วินิจฉัยรากเหตุ (ไม่ใช่ "แยก role ผิด" แต่คือ DRY violation):**
- ข้อมูลเดียวกัน (เช่น HORATAD version) ถูกเก็บใน **4 ที่** พร้อมกัน → แก้ที่เดียว อีก 3 ที่ค้าง → session ถัดไปอ่านผิด
- ตัวอย่าง: HORATAD version line ใน `PROJECT_STATUS.md` เขียน V3.3.49 แต่จริง V3.3.73

**สรุปการตัดสินใจ:**
> ✅ **เก็บการแยก project ไว้ (focus tag)** — ไม่รวมเป็น single role
> เหตุผล: รวมแล้ว context เต็มเร็ว (script.js 200KB + KB + data = แพงและช้า) + ไม่มี scope = Claude explore กว้าง → แก้ผิดจุดบ่อย

**แนวแก้ที่ตกลงไว้ (ยังไม่ได้ implement รอ session BIG ต่อ):**
- `gen_project_status.mjs` → `PROJECT_STATUS.md` กลายเป็น generated (ไม่แก้มือ = drift หายถาวร)
- handoff เปลี่ยนเป็น 1 rolling file/project (overwrite ไม่สะสม v1→v7)
- BIG = reconciler ประจำ ไม่ใช่แค่ coordinator

---

### 2. FB Audience Measurement — Framework ที่ตกลงไว้

#### 2.1 ข้อจำกัดที่ต้องรู้ก่อน
| ข้อจำกัด | เหตุผล | แนวทาง |
|---|---|---|
| Sandbox เรียก `graph.facebook.com` ไม่ได้ | network policy | ส่วน "ดึง insight" ต้องอยู่ใน GitHub Actions runner |
| followers น้อย = insight ไร้ความหมาย | n เล็กเกินสรุป | เลื่อน own-page insight loop ออกไปก่อน |
| `read_insights` scope ยังไม่ได้เพิ่ม | รอ followers ≥100 | เพิ่ม scope ตอน regenerate token ที่จุดนั้น |
| n=4 (ประธานาธิบดีถูกลอบสังหาร) = ไม่มีนัยสถิติ | pattern เจอได้โดยบังเอิญ | **ต้องมี control group เสมอ** |

#### 2.2 Interest Score Formula (เมื่อ followers พอแล้ว)
```
interest_score = (shares×3 + comments×2 + saves×2 + reactions×1 − negative×5) / reach
```
- หาร reach = วัด "อัตราความสนใจ" ไม่ใช่จำนวนดิบ
- Maturity window: **ดึง insight เฉพาะโพสต์อายุ ≥ 3-7 วัน** (engagement ยังไม่นิ่งวันแรก = วัดผิด)
- Baseline: เทียบกับ **median ของเพจตัวเอง** ไม่ใช่เลขลอยๆ

#### 2.3 Architecture แบบ Decoupled (ที่ตกลง — ยังไม่ได้ implement)
```
เก็บข้อมูล  : cron จันทร์เช้า (Actions runner → Graph API → content/insights/)
วิเคราะห์    : Claude อ่าน JSON local ได้ทุกเมื่อ (0 round-trip)
force refresh: push content/insights/REFRESH → trigger ทันที (optional เท่านั้น)
preflight    : step แรกใน workflow ตรวจ token scope → สร้าง Issue ถ้าขาด
```
**phasing:**
- Phase 0 (ทำตอนนี้): เรียนจาก demand signal ภายนอก ไม่ใช่ own-page
- Phase 1-3 (เลื่อน): own-page insights loop — เปิดเมื่อ followers โตพอ

---

### 3. Audience Strategy — "คนของเรา" ≠ ตลาดมู

#### 3.1 Insight สำคัญ: copy เพจมู = สัญญาณผิด + อันตราย
**เพจดูดวงดังในไทย** เสิร์ฟ audience สายมู/intuition (เลขเด็ด, เสริมดวง) ซึ่ง:
- ขัด content policy เรา (TALS = ตรรกะ/empirical)
- ถ้า optimize ตามเพจมู → ดึงคนผิดกลุ่ม → engagement ขึ้น แต่ทำลาย positioning

**สูตรง่าย:** ตัวเลข engagement สูงไม่ใช่ชัยชนะ ถ้าคนที่มาไม่ใช่คนที่เราต้องการ

#### 3.2 ICP (Ideal Customer Profile) — ตกผลึกครั้งนี้
> **"ผู้แสวงหาที่ไร้บ้านทางความเชื่อ"**

คนที่ติดอยู่ตรงกลางระหว่าง 2 ขั้ว:
- **ศรัทธาเก่าสลาย** — ไม่เชื่อสถาบัน/ศาสนา/หมอดูคลุมเครือ
- **ของใหม่ท่วมท้นแต่ไร้หลักฐาน** — เบื่อ wellness fad / conspiracy / self-help ลอยๆ

→ เขายังโหยหาความหมาย **แต่ต้องตรวจสอบได้** — หิวหลักฐานสูง ระแวง BS สูง เพราะเคยถูกหลอกมาแล้วทั้งของเก่าและใหม่

#### 3.3 ตลาดนี้คือ Blue Ocean
| | เพจมูทั่วไป | โหราทาส (TALS) |
|---|---|---|
| Audience | สายศรัทธา/สัญชาตญาณ | สายคิด/อยากเห็นหลักฐาน |
| ตลาด | แดง (แข่งกันเยอะ) | **น้ำเงิน (แทบไม่มีคนทำ)** |
| Content moat | ใครก็ทำได้ | **JULIAN empirical — ลอกไม่ได้** |

#### 3.4 FIT metric — วัด "เล็งถูกคนไหม" (สำคัญกว่ายอดตอน stage เล็ก)
- ✅ **ถูกกลุ่ม:** คน comment "ขอดูกลุ่มควบคุมด้วย" / "n เท่าไหร่" / "ลองกับเคส X ไหม"
- ❌ **ผิดกลุ่ม:** "ขอเลขเด็ด" / "ดวงหนูเป็นไง" → ยังสื่อสารผิด ต้องปรับ content

---

### 4. Flagship Content Format — "โหราทาส Investigates"

**Concept:** เหตุการณ์ดัง (ข่าว/ประวัติศาสตร์) → วิเคราะห์ดวงเชิงเปรียบเทียบด้วยข้อมูลจริง → ชวนคิด/ถก

**ตัวอย่างที่พี่ปีเตอร์เสนอ:** ประธานาธิบดีสหรัฐที่ถูกลอบสังหาร (Lincoln/Garfield/McKinley/Kennedy) — วิเคราะห์ดาวจรทับดวงเดิมเทียบกับกลุ่มควบคุม

**ทำไม format นี้ใช่:**
| โจทย์ | format นี้แก้ยังไง |
|---|---|
| หาหัวข้อน่าสนใจ | ข่าวดังให้หัวข้อมาเอง (newsjacking) — reach ฟรี |
| ดึง audience ที่ใช่ | มุม "มาดูสถิติ" กรองสายคิดเข้ามาเอง |
| Content moat | JULIAN ทำได้คนเดียว — เพจมูเทียบดวงผู้นำ 4 คนแบบมีข้อมูลไม่ได้ |

#### 3 Hard Gate (บังคับทุกครั้ง — ขาดข้อใดข้อหนึ่ง = ห้ามโพสต์)
1. **Control group เสมอ** — กลุ่มเป้าหมาย vs กลุ่มควบคุม · n เล็กหา pattern โดยบังเอิญเสมอ · ถ้ากลุ่มควบคุมมี pattern พอกัน → โพสต์ความจริงนั้นอย่างกล้าหาญ
2. **Exploratory framing** — "ข้อสังเกต ไม่ใช่ข้อพิสูจน์" · ห้าม claim "TALS ทำนาย X ได้"
3. **Taste gate** — เหตุการณ์สดกับคนยังมีชีวิต = เสี่ยงฉวยโอกาส · prefer historical · เหตุการณ์สดต้องระวังโทน

**Infra รองรับแล้ว:**
- JULIAN: birthdate 129k + Wikidata P1196 (manner-of-death=assassination) + engine.js ดาวจร + สถิติ
- BIBLE: wording
- PLATFORM: เผยแพร่ผ่าน policy gate

**งานต่อ (ยังไม่ implement):** JULIAN ต้องสร้าง "cohort builder" (รับประเภทเหตุการณ์ → ดึงกลุ่มที่เจอแบบเดียวกัน + control อัตโนมัติ)

---

### 5. Brand North Star — ตกผลึกครั้งนี้

#### 5.1 Positioning statement
> สำหรับ **คนที่ศรัทธาเก่าสลาย แต่ไม่ยอมเชื่ออะไรง่ายๆ อีก** ที่ยังโหยหาความหมายแต่ต้องตรวจสอบได้ — **โหราทาส** คือโหราศาสตร์ไทยแนวตรรกะ (TALS) ที่พิสูจน์ด้วยข้อมูลจริง ให้ความหมายโดยไม่ขอศรัทธาตาบอด · ต่างจากหมอดู/มูเตลูที่ขอให้ "เชื่อ" — เรา**เปิดให้ "ตรวจสอบ"**

#### 5.2 Tagline 🟡 PROVISIONAL
> **"โหราศาสตร์ที่ตรวจสอบได้"**

**วิวัฒนาการ tagline (เก็บเหตุผลไว้กัน session หน้าสงสัย):**
| เวอร์ชัน | เหตุผลเปลี่ยน |
|---|---|
| ~~"ความเชื่อที่ตรวจสอบได้"~~ (ตั้งต้น) | "ความเชื่อ" กินถึงศาสนา → โดยนัยดูหมิ่นศรัทธาคนที่ไม่อยากพิสูจน์ |
| **"โหราศาสตร์ที่ตรวจสอบได้"** (ปัจจุบัน) | หดประธานเป็น "โหราศาสตร์" (ความเชี่ยวชาญของเรา) — ไม่ตัดสินใคร |

**⚖️ Unresolved paradox (เหตุผลที่ยังไม่ final):**
โหราศาสตร์ทุกแขนง claim หลัก = "พยากรณ์อนาคต" แต่ "ตรวจสอบได้/falsifiable" คือมาตรฐานที่โหราศาสตร์ส่วนใหญ่สอบตก (JULIAN debunk เองหลาย rule — เหลือ SU×SA 16 rule) · ชู "ตรวจสอบได้" แรงเกิน = อาจทำลาย claim หลักของโหราศาสตร์เอง

**ทิศทางคลี่ (ยังไม่ final):**
- "ตรวจสอบได้" = **วิธีการโปร่งใส** ไม่ใช่การันตีว่าแม่น
- prediction = **probabilistic (แนวโน้ม)** ไม่ใช่ deterministic (ชะตากำหนด)
- คุณค่า = ความหมาย/กรอบคิดใคร่ครวญตัวเอง + ส่วนที่รอดการกรองจริงๆ

#### 5.3 หลักการแกน — "ความซื่อสัตย์ = ตัวสินค้า"
- โพสต์ที่บอก "เราทดสอบแล้ว... pattern อ่อน ยังสรุปไม่ได้" = โพสต์ที่ **on-brand ที่สุด** ไม่ใช่ความล้มเหลว
- ความกล้ายอมรับว่า "ยังไม่ชัด" = สิ่งที่หมอดู/เพจมูไม่เคยกล้าทำ = เครื่องมือสร้าง trust ที่ทรงพลังสุด
- **วินัย = การอยู่รอด**: overclaim ครั้งเดียว = เสีย trust ถาวร (กลุ่มนี้ให้โอกาสครั้งเดียว)
- policy gate (n=, disclaimer, control) = **เกราะป้องกันแบรนด์** ไม่ใช่ระเบียบราชการ

#### 5.4 อุปมาที่ใช้งาน
> "เราคือกาลิเลโอที่บอกว่า 'มาดูสิ' ไม่ใช่ 'ศรัทธาคุณผิด'"
> "เหมือนเสนอว่าโลกกลม ในยุคที่คนยังเชื่อว่าโลกแบน — มั่นใจแต่ถ่อมตน เชิญชวน ไม่ปะทะ"

---

### 6. งานที่ตกลงทำต่อ (ยังไม่ implement — ส่งต่อ session ถัดไป)

| งาน | Project | Priority |
|---|---|---|
| cohort builder สำหรับ "โหราทาส Investigates" | JULIAN | สูง — unlock flagship content |
| `fb_insights.yml` + `fb_analyze.mjs` (decoupled architecture) | PLATFORM | กลาง — รอ followers ≥100 |
| `gen_project_status.mjs` — fix drift ถาวร | BIG | สูง — แก้ root cause mix-up |
| handoff → 1 rolling file/project | BIG | กลาง |
| tagline สุดท้าย (เมื่อ paradox ตกผลึก) | CLAUDE.md | รอ — ไม่เร่ง |

---

*บันทึก: 2026-05-29 · สร้างโดย PLATFORM session (BIG + PLATFORM scope) · อัปเดต PLATFORM_STRATEGY.md*
