# BUDGET — Horatad Expense Tracker
Updated: 2026-05-24

---

## Monthly Services

| Service | Project | Plan | ฿/เดือน | Used (approx) | Limit | Status |
|---|---|---|---|---|---|---|
| Cloudflare Workers | HORATAD | Free | ฿0 | ~200 req/day | 100k req/day | 🟢 ปกติ |
| Cloudflare D1 | JULIAN | Free | ฿0 | ~1k read/day | 5M read/day | 🟢 ปกติ |
| Cloudflare Pages | HORATAD | Free | ฿0 | 1 site | 100 sites | 🟢 ปกติ |
| GitHub | ทุก project | Free | ฿0 | public repo | unlimited | 🟢 ปกติ |
| Groq API | BIBLE | Free | ฿0 | ~500 req/mo | 14,400/day | 🟢 ปกติ |
| Typhoon API | HORATAD | Beta/Free | ฿0 | ~200 req/mo | ไม่ทราบ | 🟡 ต้องติดตาม |
| HuggingFace Inference | PLATFORM | Free | ฿0 | 0 (ยังไม่ใช้) | rate-limited | 🟢 ปกติ |
| Claude Code Max | DEV | Max plan | (ค่า subscription) | - | unlimited | 🟢 ปกติ |

---

## One-time / Annual

| รายการ | วันที่ | ราคา (฿) | Amortize/เดือน | หมายเหตุ |
|---|---|---|---|---|
| Domain horatad.com | ไม่ทราบ | ? | ? | ต้องอัปเดต |
| Computer (i5-14400 build) | 2026-05-24 | 56,870 | 1,580 | amortize 36 เดือน |

---

## Monthly Total

| หมวด | ฿/เดือน |
|---|---|
| Services (cash) | ฿0 |
| Hardware amortize | ฿1,580 |
| Domain amortize | ฿? |
| **รวม (ไม่รวม Max plan)** | **฿1,580+** |

---

## 🚨 Upgrade Thresholds

| Service | เตือนเมื่อ | action |
|---|---|---|
| Typhoon API | ประกาศเก็บเงิน / มี rate limit error | ดู pricing แล้วประเมิน Groq แทน |
| Groq API | error 429 บ่อยกว่า 3 ครั้ง/สัปดาห์ | upgrade paid หรือ switch model เล็กลง |
| Cloudflare Workers | usage > 80k req/day (80%) | monitor + optimize หรือ upgrade $5/mo |
| Hardware | ดู docs/admin/COMPUTER_SPECS.md | — |

---

## WHY LOG

- **2026-05-24** — เริ่ม track budget หลังวิเคราะห์สเปคคอมใหม่ architecture cloud-first ทำให้ค่าใช้จ่าย service = ฿0 ทั้งหมด cost หลักคือ hardware amortize เท่านั้น
