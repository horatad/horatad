# GUARD Audit — FB Content Automation Pipeline
# Date: 2026-05-29 | Auditor: GUARD session | Scope: PLATFORM Phase 3 FB auto-post infra
# Trigger: SOP-03 (new feature security review) — pipeline ใหม่ถือ token แรง + destructive workflow

> **สรุปผู้บริหาร:** pipeline โพสต์ FB อัตโนมัติ (curator → autopost → kpi/manage) มี **โครงสร้างความปลอดภัยพื้นฐานดี** — secrets อยู่ใน GitHub Secrets, ไม่มี hardcoded token, ไม่มี `pull_request` trigger ที่ทำให้ fork ดูด secret ได้, มี idempotency/dedup กัน double-post, มี echo-before + confirm กันลบพลาด. พบ **finding ใหม่ 4 ข้อ (R-20..R-23)** — ส่วนใหญ่ low/medium, แก้แล้ว 2 (workflow), เหลือ 1 รอ user (dispatch control), 1 ส่งต่อ PLATFORM (worker hardening).

---

## 1. ขอบเขตที่ audit

| ประเภท | ไฟล์ | หน้าที่ | Owner |
|---|---|---|---|
| Workflow | `.github/workflows/content_curator.yml` | cron 08:00 — คัด 1 โพสต์/วัน inbox→scheduled | GUARD |
| Workflow | `.github/workflows/fb_autopost.yml` | cron 08:30 — โพสต์คิวขึ้น Page | GUARD |
| Workflow | `.github/workflows/fb_post_manage.yml` | **destructive** — แก้/ลบโพสต์ (กดเอง) | GUARD |
| Workflow | `.github/workflows/fb_kpi_monthly.yml` | cron เดือนละครั้ง — ดึง KPI | GUARD |
| Workflow | `.github/workflows/youtube_sync.yml` | cron 09:00 — ดึง video ใหม่→inbox | GUARD |
| Worker | `workers/content_curator.mjs` | scoring + hygiene gate | PLATFORM |
| Worker | `workers/fb_autopost.mjs` | Graph API post + dedup + cap | PLATFORM |
| Worker | `workers/fb_post_manage.mjs` | Graph API edit/delete + 4 กันชน | PLATFORM |
| Worker | `workers/fb_policy.mjs` | 6-rule hygiene gate (shared) | PLATFORM |
| Worker | `workers/fb_token_exchange.mjs` | แลก token (รันเครื่อง user) | PLATFORM |
| Worker | `workers/fb_kpi_report.mjs` | KPI insights | PLATFORM |
| Worker | `workers/youtube_sync.mjs` | YouTube Data API | PLATFORM |

---

## 2. Secrets inventory (ใหม่ตั้งแต่ audit 2026-05-23)

| Secret | ที่เก็บ | ใช้ที่ | ความเสี่ยงถ้ารั่ว | Expiry |
|---|---|---|---|---|
| `FB_PAGE_TOKEN` | GitHub Secrets | autopost, post_manage, kpi | **HIGH** — post/edit/delete บน Page ได้ไม่จำกัด | **never-expire** ⚠️ |
| `FB_PAGE_ID` | GitHub Secrets | (ไม่ลับจริง — public บน Page) | low | — |
| `FB_APP_ID` / `FB_APP_SECRET` / `FB_SHORT_TOKEN` | **เครื่อง user เท่านั้น** (ไม่อยู่ใน CI) ✅ | token_exchange (one-time) | medium — แต่ไม่อยู่ใน repo/CI | — |
| `YOUTUBE_API_KEY` | GitHub Secrets | youtube_sync | low-medium — quota burn เท่านั้น | — |
| `YOUTUBE_PLAYLIST_ID` | GitHub Secrets | youtube_sync | low | — |
| `JULIAN_DATA_PAT` | GitHub Secrets | julian_sync (คนละ pipeline) | medium — cross-repo write | — |

**→ docs/SECRETS.md ต้องเพิ่ม FB_PAGE_TOKEN + YOUTUBE_API_KEY เข้า inventory (ดู §6)**

---

## 3. Findings

### ✅ สิ่งที่ทำถูกแล้ว (verified clean)
1. **ไม่มี hardcoded secret** — grep `EAA*/ghp_*/FB_PAGE_TOKEN=` ใน workers/fb_* + workflows = สะอาด
2. **ไม่มี `pull_request`/`pull_request_target` trigger** — fork ไม่สามารถรัน workflow เพื่อดูด secret (กัน R-12 อัตโนมัติ)
3. **Secret-gate ก่อนใช้ token** — autopost/kpi เช็ค `if [ -z "$FB_PAGE_TOKEN" ]` แล้วข้ามเงียบ ไม่ fail/ไม่ leak
4. **token_exchange แยกออกจาก CI** — APP_SECRET ไม่เคยเข้า GitHub; print stdout ให้ user copy เอง (ตรง Secret Handling Rule)
5. **Idempotency + dedup** — autopost เช็ค Page feed 48 ชม. + reconcile ledger กัน double-post (F2/F4 แก้แล้ว)
6. **Destructive guardrails** — post_manage มี echo-before · our-page-only (POST_ID prefix) · CONFIRM=DELETE · แสดงอายุโพสต์
7. **GHA log masking** — FB_PAGE_TOKEN เป็น registered secret → GHA redact อัตโนมัติในทุก log

### 🔴 R-20 — `FB_PAGE_TOKEN` never-expiring + blast radius สูง
| | |
|---|---|
| P(likely) | low (อยู่ใน GitHub Secrets เข้ารหัส, repo single-user) |
| Impact | **high** — token ไม่หมดอายุ + post/edit/delete Page ได้ → ถ้ารั่วคุมต่อเนื่อง |
| Mitigation | (1) เพิ่มเข้า SOP-05 quarterly rotation ทั้งที่ "never-expire" — best practice rotate ทุกไตรมาส (2) ถ้าสงสัยรั่ว → FB Settings → Business Integrations → revoke + re-exchange |
| Priority | **P1** | Cost | low (เพิ่มใน SECRETS.md + rotation checklist) |
| สถานะ | **เปิด** → action: เพิ่ม row ใน docs/SECRETS.md + SOP-05 (ดู §6) |

### 🟠 R-21 — Destructive workflow dispatch ไม่มี approval gate
| | |
|---|---|
| P(likely) | low (single-user repo, write = ปีเตอร์คนเดียว) |
| Impact | medium — ใครมี repo-write กด `fb_post_manage` action=delete ได้ (ลบถาวร) |
| Mitigation | (a) **แก้แล้ว**: ลด `permissions: contents: read` (ไม่ต้อง write) — ลด blast radius ถ้าถูก inject (b) **รอ user**: ตั้ง GitHub Environment protection (required reviewer) ถ้าวันหน้ามี collaborator |
| Priority | **P2** | Cost | very low (แก้ workflow) / user UI (env protection) |
| สถานะ | **partial** — least-privilege ✅ ; environment protection = user decision (note ใน handoff) |

### 🟡 R-22 — URL-encoded token อาจ bypass GHA log masking
| | |
|---|---|
| รายละเอียด | `recentlyPostedMessages` / `fb_kpi_report` / `fb_post_manage` ใส่ token ใน query string ผ่าน `encodeURIComponent(token)`. GHA mask **เฉพาะ literal secret string** — ถ้า token มีอักขระที่ถูก percent-encode รูป encoded จะไม่ถูก mask. FB Page token ปกติเป็น alnum (`EAA...`) → encode มักเป็น no-op → **ความเสี่ยงจริงต่ำ** แต่เป็น latent hazard ถ้าสคริปต์เผลอ print URL |
| P(likely) | very low | Impact | medium (token disclosure ใน public log) |
| Mitigation | แนะนำ PLATFORM: ใช้ `Authorization: Bearer` header หรือ POST body แทน token-in-query ทุกที่ที่ทำได้ (autopost POST ทำถูกแล้ว — เหลือ GET feed/kpi/manage) · และห้าม `console.log(url)` |
| Priority | **P3** (hardening) | Cost | low |
| สถานะ | **ส่งต่อ PLATFORM** (worker code = PLATFORM owns) |

### 🟡 R-23 — Drive→inbox supply chain (content integrity)
| | |
|---|---|
| รายละเอียด | body ที่โพสต์ขึ้น Page มาจาก `content/inbox/` ซึ่งป้อนโดย (1) youtube_sync (title-only, body ว่าง — ปลอดภัย) (2) **Google Drive `_FB&Social` → Apps Script sync** (free text). ถ้า Drive folder/Apps Script ถูก compromise → arbitrary content โพสต์ขึ้น Page อัตโนมัติ |
| ป้องกันที่มีแล้ว | `fb_policy.mjs` 6-rule gate กรอง engagement-bait/hype/no-disclaimer ก่อนโพสต์ (ลด แต่ไม่ปิด vector — gate กรอง "คุณภาพ" ไม่ใช่ "เจตนาร้าย") |
| P(likely) | low | Impact | medium (แบรนด์ — โพสต์แปลกปลอม) |
| Mitigation | accepted ตอนนี้ (Drive = user-controlled, single-user). ถ้าวันหน้าเปิดให้คนอื่นใส่ Drive → ต้อง review-before-schedule. autopost cap 14/สัปดาห์ จำกัดความเสียหาย |
| Priority | **P3 / accepted** | Cost | — |
| สถานะ | **informational** — track ไว้, ไม่ต้องแก้ตอนนี้ |

---

## 4. Trade-off assessment (ตาม §3.1 charter)

| Control | Benefit | Cost | Verdict |
|---|---|---|---|
| `permissions: contents:read` บน post_manage | ลด blast radius destructive workflow | text 2 บรรทัด | **ADOPT ✅ (ทำแล้ว)** |
| FB_PAGE_TOKEN เข้า SOP-05 rotation | ลด window ถ้า token รั่ว | 1 row docs | **ADOPT ✅ (ทำแล้ว §6)** |
| GitHub Environment protection (required reviewer) | กัน accidental/malicious dispatch | user UI + friction ทุกครั้งที่ลบ | **DEFER** — single-user friction > benefit ตอนนี้; adopt เมื่อมี collaborator |
| เปลี่ยน token-in-query → header | ปิด latent log-leak | PLATFORM refactor 3 จุด | **RECOMMEND P3** — ส่ง PLATFORM |
| Review-before-schedule (Drive content) | ปิด R-23 vector | friction รายวัน | **SKIP** — single-user, gate พอ |

---

## 5. สิ่งที่ GUARD แก้ใน session นี้ (workflow = GUARD owns)
1. ✅ `fb_post_manage.yml` — เพิ่ม `permissions: contents: read` (R-21 partial)
2. ✅ `julian_sync.yml` — backfill job `if: needs.sync.result == 'success'` → `if: ${{ !cancelled() }}` (JULIAN request — ปลดล็อก genealogy/accuracy backfill ที่ค้างเพราะ sync timeout)

## 6. Action items ส่งต่อ
- **docs/SECRETS.md** (GUARD owns) → เพิ่ม FB_PAGE_TOKEN (never-expire, rotate quarterly), YOUTUBE_API_KEY, FB_PAGE_ID เข้า inventory + SOP-05 — **ทำใน session นี้**
- **PLATFORM handoff** → R-22 (token-in-query → header) hardening recommendation
- **user (UI)** → R-21 environment protection (optional, เมื่อมี collaborator)

---
*GUARD audit — pipeline ผ่านเกณฑ์ความปลอดภัยพื้นฐาน. ความเสี่ยงหลัก = token never-expire (R-20) คุมด้วย rotation discipline. ไม่มี critical/P0 finding.*
</content>
</invoke>
