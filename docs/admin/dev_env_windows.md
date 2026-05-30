# Dev Environment — Windows 11 Home vs Pro (decision note)

> Decision owner: BIG · บันทึก 2026-05-30
> เผื่ออนาคตลืมว่าทำไมเลือก Home — กันอัปเกรดเกินจำเป็น / รู้ว่าเมื่อไหร่ควรอัป

## DECISION

**ใช้ Windows 11 Home สำหรับทุกเครื่อง dev ของ Horatad ecosystem** (เครื่องเดิม + Desktop/เครื่องใหม่)

## WHY — Home เพียงพอ

Stack เราเป็น **serverless / cloud-first** (GitHub Pages + Cloudflare Workers + GitHub Actions + PWA)
ตาม Cost Policy "free/cloud first" → ไม่มี tool ไหนต้องการฟีเจอร์ Pro-only

| Tool | ใช้ที่ | Home |
|---|---|---|
| Node.js (`*.mjs`) | BIG/BIBLE/JULIAN/PLATFORM | ✅ |
| Python (reportlab+Sarabun) | JULIAN PDF | ✅ |
| mmdc + pandoc | doc generation | ✅ |
| git + GitHub | ทุกโครงการ | ✅ |
| Browser (PWA + Typhoon LLM) | HORATAD/NOK/BIBLE | ✅ |
| Claude Code (Max plan) | ทุกโครงการ | ✅ |
| Shell scripts (`.sh`) | BIG admin | ✅ ผ่าน Git Bash / WSL2 |

ทางออกฟรีบน Home สำหรับสิ่งที่ดูเหมือนต้อง Pro:
- **Docker** → WSL2 backend (ไม่ต้อง Hyper-V)
- **Linux env** → WSL2
- **Remote เข้าเครื่อง** → Chrome Remote Desktop / Tailscale / RustDesk (RDP host ของ Home ใช้ไม่ได้ แต่ตัวนี้แทนได้ฟรี)
- **Disk encryption พื้นฐาน** → Device Encryption (ถ้ามี TPM 2.0)

## เกณฑ์อัปเกรด Pro — อัปเมื่อข้อใดข้อหนึ่งเป็นจริง

1. 🔐 **มีเครื่องเก็บ JULIAN data / user PII แล้วพกออกนอกบ้าน** → ต้องการ **BitLocker** (เหตุผลแข็งสุด, ตรง GUARD Confidentiality)
2. 🖥️ **โหราทาสไปมี physical booth / kiosk** (เครื่องโชว์ app อย่างเดียว) → ต้องการ **Assigned Access (Kiosk mode)**
3. 🏢 **PLATFORM โตจนมีพนักงาน 3+ คน หลายเครื่อง** → ต้องการ **Domain/Entra join + Group Policy + MDM** (จัดการรวมศูนย์)

เหตุผลรอง (โอกาสต่ำ): GUARD security lab (Windows Sandbox + Hyper-V) · self-host always-on server (RDP host + Hyper-V — แต่ขัด cost policy, cloud ดีกว่า)

## หมายเหตุสำคัญ

- **Home → Pro อัปได้ in-place** (ใส่ key ใหม่ ไม่ต้องลงใหม่ ไม่เสียงาน) → ลง Home ไปก่อนปลอดภัย วันไหนเข้าเกณฑ์ค่อยอัป
- ตรงข้ามกับ downgrade Pro → Home ที่ต้อง clean install + เสีย license (อย่าทำ ถ้ามี Pro อยู่แล้วเก็บไว้เฉยๆ)
- ตัวกระตุ้นที่น่าจะมาก่อนเพื่อน = **BitLocker** (วัน JULIAN/user data อยู่บน laptop พกพา)

## Multi-machine setup (เพิ่มเครื่องใหม่)

| เรื่อง | วิธีจัดการ |
|---|---|
| License | Home 1 key = 1 เครื่อง (ปกติมากับเครื่อง OEM) |
| Sync งาน | `git clone` repo — ไม่ต้องอะไรพิเศษ |
| Local env keys | set ใหม่ในเครื่องใหม่ (ไม่ sync ผ่าน git = ถูกต้องด้านความปลอดภัย) |
| GitHub Secrets / sandbox env | cloud-side → ใช้ได้ทุกเครื่องอัตโนมัติ |
| Remote คุมข้ามเครื่อง | CRD / Tailscale / RustDesk (ฟรี) |

One-time setup เครื่องใหม่: Git for Windows (ได้ Git Bash) → Node.js LTS → Python → `git clone` + set env → CRD/Tailscale
