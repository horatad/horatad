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
