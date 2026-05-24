# BUDGET — Horatad Expense Tracker
Updated: 2026-05-24 (hardware itemized จาก invoice V2)

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
| **Computer รวม (incl. VAT 7%)** | **2026-05-24** | **56,870** | **1,580** | **amortize 36 เดือน** |

### รายละเอียด Hardware (จาก Invoice V2)

**Hardware**

| รายการ | ราคา (฿) |
|---|---:|
| CPU: Intel Core i5-14400 (Socket 1700) | 6,490 |
| Mainboard: MSI B760M Gaming Plus WiFi DDR5 | 3,860 |
| RAM: G.Skill Trident Z5 RGB DDR5 32GB (16GBx2) 5600MHz | 15,990 |
| PSU: Thermaltake Toughpower GT 750W (80+ Gold) | 3,190 |
| SSD: M.2 NVMe PCIe 4.0 WD Blue SN5000 2TB | 8,190 |
| CPU Cooler: Be Quiet Pure Rock Pro 3 LX | 1,990 |
| Case: Deepcool CG530U 4F Black (ATX) | 2,990 |
| **รวม Hardware** | **42,710** |

**Peripherals & OS**

| รายการ | ราคา (฿) |
|---|---:|
| Monitor: Samsung IPS 24" 120Hz (x2) | 5,300 |
| Keyboard: Fantech MK921 Wireless (Brown Switch) | 1,790 |
| Mouse: Logitech M185R Wireless | 290 |
| OS: Windows 11 Pro 64-bit (FPP USB) | 6,790 |
| **รวม Peripherals & OS** | **14,170** |

**สรุปราคา**

| | ฿ |
|---|---:|
| รวมก่อนภาษี | 53,149.53 |
| VAT 7% | 3,720.47 |
| **รวมทั้งสิ้น** | **56,870.00** |

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
