# COMPUTER_SPECS — Dev Machine Reference
**บันทึก: 2026-05-24 | วิเคราะห์โดย BIG session**

---

## สเปคปัจจุบัน

| ชิ้นส่วน | รายละเอียด | ระดับ |
|---|---|---|
| **CPU** | Intel Core i5-14400 (10C/16T, boost 4.7GHz, Socket 1700) | Mid-high |
| **Mainboard** | MSI B760M Gaming Plus WiFi DDR5 (Micro-ATX, 2 RAM slots) | Mid |
| **RAM** | 32GB DDR5 5600MHz G.Skill Trident Z5 (16GBx2) | ดีมาก |
| **SSD** | 2TB NVMe PCIe 4.0 WD Blue SN5000 | ดีมาก |
| **GPU** | ไม่มี discrete GPU (Intel UHD 730 iGPU) | — |
| **PSU** | Thermaltake 750W 80+ Gold | เผื่อ upgrade |
| **OS** | Windows 11 Pro 64-bit | — |
| **Monitor** | 2x Samsung IPS 24" 120Hz | ดีมาก |
| **ราคารวม** | 56,870 บาท (incl. VAT) | — |

**ขีดจำกัด upgrade:**
- RAM: ขยายได้สูงสุด 64GB (เปลี่ยน 16GBx2 → 32GBx2)
- GPU: เพิ่มได้ 1 ใบ (PCIe x16 slot ว่าง, PSU 750W รองรับถึง RTX 4070)

---

## การประเมิน ณ วันติดตั้ง

| Project | ความพอเพียง | หมายเหตุ |
|---|---|---|
| HORATAD | ✅ เกินพอ | PWA dev, no heavy compute |
| BIBLE | ✅ เกินพอ | JSON/Node.js, cloud LLM |
| JULIAN | ✅ เกินพอ | astronomical math, SQLite |
| NOK | ✅ เกินพอ | Web Speech API, browser-native |
| GUARD | ✅ เกินพอ | CI/audit, no compute |
| PLATFORM Phase 2 | ✅ เพียงพอ | cloud-first AI (HF Inference API, Colab) |

**Architecture ปัจจุบัน: Cloud-first 100%**
- Typhoon LLM → Cloudflare Worker proxy
- Groq LLaMA 3.3 → api.groq.com
- TTS → Web Speech API (browser native)
- Training → Google Colab (free tier)

---

## 🚨 Upgrade Triggers — เตือนเมื่อเงื่อนไขนี้เกิด

### RAM: 32GB → 64GB
เมื่อพบสัญญาณใดสัญญาณหนึ่ง:
- [ ] เปิด Claude Code + Chrome + Node dev server แล้ว RAM ใช้ > 28GB (Task Manager)
- [ ] เจอ out-of-memory error ขณะ process dataset ใหญ่
- [ ] รัน 2 local model พร้อมกันไม่ได้
- **วิธีแก้**: เปลี่ยน 16GBx2 → 32GBx2 (~8,000-10,000 บาท)

### GPU: เพิ่ม RTX 4060 8GB
เมื่อพบสัญญาณใดสัญญาณหนึ่ง:
- [ ] ค่า HuggingFace Inference API / Groq รายเดือน > 800 บาท (≈ amortize GPU 12 เดือน)
- [ ] ต้องการ iterate model > 10 ครั้ง/วัน (Colab session หมดบ่อย)
- [ ] PLATFORM ต้องการ fine-tune model บ่อยกว่า 1 ครั้ง/สัปดาห์
- [ ] latency HF API > 5 วินาที/request เป็นประจำ (HF overload)
- **วิธีแก้**: RTX 4060 8GB (~9,000-10,000 บาท) — PSU รองรับได้ทันที

### SSD: เพิ่ม External Storage
เมื่อพบสัญญาณใดสัญญาณหนึ่ง:
- [ ] พื้นที่ว่าง SSD เหลือ < 400GB (20% ของ 2TB)
- [ ] เก็บ dataset audio/video สำหรับ NOK > 200GB
- **วิธีแก้**: External SSD 1-2TB (~1,500-3,000 บาท)

### CPU: Upgrade (ไม่น่าจะเกิดเร็วๆ นี้)
เมื่อพบสัญญาณใดสัญญาณหนึ่ง:
- [ ] CPU bottleneck ขณะรัน local LLM บน CPU-only (> 10 นาที/response)
- [ ] compile/build time > 5 นาทีเป็นประจำ
- **หมายเหตุ**: Socket 1700 รองรับ Core i7/i9 14th Gen — upgrade CPU ได้โดยไม่เปลี่ยน board

---

## วิธีเรียกดูใน session ถัดไป

พิมพ์ใน session ใดก็ได้:
```
ดู COMPUTER_SPECS
```
หรือ
```
ตรวจ upgrade triggers
```

Claude จะอ่านไฟล์นี้และรายงานสถานะทันที

---

## WHY LOG

- **ไม่ซื้อ GPU ตอนแรก (2026-05-24)** — source code วิเคราะห์แล้วพบว่า AI ทั้งหมดใช้ cloud API (Typhoon, Groq, HF) ไม่มี local inference แม้แต่ไฟล์เดียว การซื้อ GPU ตอนนี้จะไม่ได้ใช้งาน — รอจนถึง trigger ข้างบนก่อน
- **Cloud-first เป็น general practice สำหรับโปรเจคนี้** — workload ไม่สม่ำเสมอ, ทีมเล็ก, ข้อมูลไม่ sensitive, free tier เพียงพอ — เปลี่ยนเมื่อค่า API แพงกว่า amortize hardware
