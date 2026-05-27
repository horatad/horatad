# ใบระบุรายละเอียดสเปกคอมพิวเตอร์ประกอบ V9.2

> **วัตถุประสงค์:** Web Development (PWA) + Data Processing + เตรียมพร้อม Local LLM Inference ในอนาคต
> ใช้กราฟิกออนบอร์ดตั้งต้น, PSU + RAM slot เตรียมพร้อมอัปเกรดการ์ดจอแยกได้ทันที

**ผู้จัดทำ:** โครงการโหราทาส
**วันที่จัดทำ:** 2026-05-22
**Version:** 9.2 (Final)
**งบประมาณรวม:** 45,100 บาท

---

## 📋 รายการอุปกรณ์

| # | รายการ | รายละเอียดคุณลักษณะ | ตัวอย่างรุ่น | ราคา (บาท) |
|---|---|---|---|---|
| 1 | **CPU** | Intel Core **i5-14400** (มี iGPU UHD 730) ⚠️ **ห้าม F suffix** | i5-14400 (BOX) | 7,500 |
| 2 | **Mainboard** | ชิปเซ็ต **B760 (DDR5)** ต้องมี: RAM 4 slot, TPM 2.0, M.2 NVMe Gen4 ≥2 ช่อง, VRM heatsink | MSI PRO B760M-A WiFi DDR5 / ASUS PRIME B760M-A | 4,500 |
| 3 | **RAM** | **64GB DDR5 (2×32GB)** 5600MHz CL36+ kit เดียวกัน (รับประกัน dual-channel) | Kingston FURY Beast / Corsair Vengeance / G.Skill Ripjaws S5 | 7,800 |
| 4 | **SSD** | **2TB NVMe M.2 Gen4** อ่าน ≥5,000 MB/s | WD Black SN770 / Samsung 980 Pro / Crucial T500 | 4,800 |
| 5 | **PSU** | **750W 80+ Gold** (เผื่อ GPU อนาคต) | Corsair RM750e / MSI MAG A750GL / Seasonic Focus GX-750 | 3,500 |
| 6 | **CPU Cooler** | **Tower air cooler 4 heatpipe** | Thermalright Peerless Assassin 120 SE / DeepCool AK400 | 1,200 |
| 7 | **Case** | Mid-Tower, พัดลม ≥3 ตัว, รองรับ GPU 320mm+ | Montech AIR 903 MAX / Lian Li LANCOOL 216 | 2,800 |
| 8 | **Monitor #1** | 24" Full HD IPS 100Hz+, HDMI + DP | LG 24MR400 / ASUS VA24DCP / AOC 24B2XH | 3,000 |
| 9 | **Monitor #2** | 24" Full HD IPS 100Hz+ (รุ่นเดียวกับ #1) | (ตัวเดียวกัน) | 3,000 |
| 10 | **Keyboard** | Mechanical wired, TKL/65%/75% | Keychron K8 / Royal Kludge RK68 | 1,300 |
| 11 | **Mouse** | Wireless 2.4GHz, sensor ≥4000 DPI | Logitech M650 / Logitech G304 | 800 |
| 12 | **OS** | **Windows 11 Pro 64-bit OEM** แท้ | OEM license แท้จากร้าน | 4,900 |
| | **ยอดรวม** | | | **45,100** |

---

## 🔧 หมายเหตุและข้อกำหนดสำหรับช่างประกอบ

### RAM
1. ติดตั้ง **Dual Channel** เสียบสล็อต **A2 + B2** (ปกติคือสล็อต 2 และ 4 จากซีพียู) — **เว้น 2 ช่องว่างไว้สำหรับอัปเกรดอนาคต**
2. **เปิด XMP / EXPO ใน BIOS** — RAM วิ่งเต็มบัส 5600MHz (default จะอยู่ที่ 4800MHz)
3. ทดสอบด้วย **MemTest86** ผ่าน 1 รอบเต็มก่อนส่งมอบ

### BIOS / OS
4. **อัปเดต BIOS เป็นเวอร์ชันล่าสุด** ก่อนติดตั้ง Windows (สำคัญสำหรับ DDR5 + CPU Gen 14)
5. **เปิด TPM 2.0 + Secure Boot ใน BIOS** ก่อนติดตั้ง Windows 11
6. ติดตั้ง Windows 11 Pro แบบ **clean install** + activate license ให้เรียบร้อย
7. **เปิด BitLocker บน C: drive** (ใช้ Pro feature)

### Cooling & Build Quality
8. **ทาซิลิโคน CPU ใหม่** ด้วย thermal paste คุณภาพดี (Arctic MX-4/MX-6) ไม่ใช้แผ่นสำเร็จรูป
9. **จัดสายไฟภายในเคสให้เรียบร้อย** เน้น airflow front-to-back
10. ตั้งค่า fan curve ใน BIOS ให้สมดุล (quiet at idle, ramp up under load)

### Quality Check ก่อนส่งมอบ
- [ ] **Cinebench R23** ≥10 นาที — CPU อุณหภูมิ ≤85°C ไม่ throttle
- [ ] **MemTest86** ผ่าน 1 รอบ — RAM วิ่ง 5600MHz เต็มจริง
- [ ] **CrystalDiskMark** — SSD อ่าน ≥5,000 MB/s ตามสเปก
- [ ] **Windows Update** ครบ + drivers ทุกตัวล่าสุด
- [ ] **Activation ครบ** — Windows + (ถ้ามี) Office

---

## 📦 รับประกัน (ตรวจสอบกับร้าน)

| อุปกรณ์ | ระยะรับประกันปกติ |
|---|---|
| CPU, RAM, SSD, PSU | 3 ปี (PSU บางรุ่น 5-10 ปี) |
| Mainboard | 3 ปี |
| Monitor | 3 ปี (จอ dead pixel policy) |
| Keyboard, Mouse | 1-2 ปี |
| Case, Cooler | 1-3 ปี |

---

## 💡 แผนอัปเกรดในอนาคต (PSU 750W เตรียมไว้แล้ว)

| เมื่อไหร่ | อัปเกรด | งบ |
|---|---|---|
| BIBLE Phase 2 (local LLM) | RTX 4060 Ti 16GB | +17,000 บาท |
| RAM ใช้ >85% บ่อย | +2×32GB ใน slot ที่เหลือ → 128GB | +7,800 บาท |
| Storage เต็ม | SSD 2TB Gen4 ตัวที่ 2 | +4,800 บาท |

---

## 📝 บันทึกการตัดสินใจ (Decision Log)

| ประเด็น | เลือก | เหตุผล |
|---|---|---|
| **RAM 32GB vs 64GB** | 64GB (2×32GB) | เผื่อ local LLM อนาคต, DDR5 mix kit ภายหลังเสี่ยง |
| **Win 11 Home vs Pro** | Pro | Remote Desktop + BitLocker + local account คุ้ม +1,500฿ |
| **KB/Mouse wired/wireless** | Hybrid (KB wired, Mouse wireless) | KB ไม่กลัวแบตหมด, Mouse สายเกะกะที่สุด |
| **HDD backup** | ตัดออก | GitHub backup ดีกว่า + อยู่ต่างทวีป |
| **UPS** | ตัดออก | Cloud-first workflow ไม่กลัวไฟดับ |
| **GPU แยก** | เลื่อน | PSU เตรียมไว้แล้ว, เพิ่มเมื่อ scale พิสูจน์ความต้องการ |

---

*เอกสารนี้สร้างขึ้นโดยอ้างอิงราคาตลาดประเทศไทย ณ เดือนพฤษภาคม 2026 — กรุณาตรวจสอบกับร้านอีกครั้งก่อนสั่งซื้อ*
