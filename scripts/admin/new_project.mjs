#!/usr/bin/env node
// new_project.mjs — scaffolding สำหรับเปิด project ใหม่
// รัน:
//   node scripts/admin/new_project.mjs <CODE> "<ชื่อเต็ม>" "<หน้าที่ 1 บรรทัด>"
// ตัวอย่าง:
//   node scripts/admin/new_project.mjs DASHBOARD "Live Stats Dashboard" "หน้า monitor realtime สำหรับ user"
//
// สิ่งที่สร้าง/แก้:
//   docs/<CODE>_MISSION.md         (charter template)
//   handoffs/<CODE>_<YYYYMMDD>_v1.md (handoff v1 template)
//   PROJECT_STATUS.md              (insert section)
//   ECOSYSTEM.md                   (insert ใน table + dependency map)
//   CLAUDE.md                      (insert ใน project list)

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const [, , CODE_RAW, NAME, ROLE] = process.argv;

if (!CODE_RAW || !NAME || !ROLE) {
  console.error('Usage: node scripts/admin/new_project.mjs <CODE> "<ชื่อเต็ม>" "<หน้าที่>"');
  console.error('Example: node scripts/admin/new_project.mjs DASHBOARD "Live Dashboard" "monitor stats realtime"');
  process.exit(1);
}

const CODE = CODE_RAW.toUpperCase();
if (!/^[A-Z]{2,12}$/.test(CODE)) {
  console.error(`✗ CODE ไม่ valid: "${CODE}" — ต้องเป็นตัวพิมพ์ใหญ่ A-Z, 2-12 ตัว`);
  process.exit(1);
}

const RESERVED = ['BIG'];
if (RESERVED.includes(CODE)) {
  console.error(`✗ CODE "${CODE}" สงวนไว้ (BIG = admin role)`);
  process.exit(1);
}

const ROOT = process.cwd();
const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
const todayISO = new Date().toISOString().split('T')[0];

const MISSION_PATH = join(ROOT, `docs/${CODE}_MISSION.md`);
const HANDOFF_PATH = join(ROOT, `handoffs/${CODE}_${today}_v1.md`);

if (existsSync(MISSION_PATH)) {
  console.error(`✗ docs/${CODE}_MISSION.md มีอยู่แล้ว — abort`);
  process.exit(1);
}
if (existsSync(HANDOFF_PATH)) {
  console.error(`✗ handoffs/${CODE}_${today}_v1.md มีอยู่แล้ว — abort`);
  process.exit(1);
}

// Existing project codes (จาก handoffs + PROJECT_STATUS)
const existingHandoffs = readdirSync(join(ROOT, 'handoffs'))
  .map(f => f.match(/^([A-Z]+)_\d{8}_v\d+\.md$/)?.[1])
  .filter(Boolean);
if (existingHandoffs.includes(CODE)) {
  console.error(`✗ CODE "${CODE}" มี handoff อื่นอยู่แล้ว — abort`);
  process.exit(1);
}

console.log(`📁 สร้าง project ใหม่: ${CODE} — ${NAME}`);
console.log(`   หน้าที่: ${ROLE}\n`);

// ─── 1. docs/<CODE>_MISSION.md ────────────────────────
const missionTemplate = `# ${CODE} — ${NAME}
# Project Charter & Roadmap | สร้าง ${todayISO}

> **หน้าที่:** ${ROLE}
> **ขอบเขต:** [เขียน scope เต็มที่ครอบคลุม]

---

## 0. ปรัชญา ${CODE} (1 ประโยค)

> [เขียนประโยคเดียวที่อธิบายเป้าหมายโครงการ]

---

## 1. เป้าหมาย & success criteria

| Metric | Now | Target |
|---|---|---|
| _(เพิ่ม)_ | TBD | TBD |

---

## 2. Architecture / approach

[เขียน approach + dependency กับ project อื่น]

\`\`\`
[diagram ถ้ามี]
\`\`\`

---

## 3. Cross-project dependencies

| Project | ความสัมพันธ์กับ ${CODE} |
|---|---|
| HORATAD | _(เขียน)_ |
| BIBLE | _(เขียน)_ |
|  GUARD | security/perf concern — register risks ใน \`docs/GUARD_MISSION.md\` ถ้ามี |

---

## 4. Roadmap — Phase plan

### Phase 0 — Discovery (ก่อนเริ่ม code)
- [ ] _(งาน audit / planning)_

### Phase 1 — MVP
- [ ] _(งานหลัก)_

### Phase 2+ — Expansion
- [ ] _(งาน scale)_

---

## 5. 📨 GUARD cross-link

ทุก feature ของ ${CODE} ต้องผ่าน GUARD review ถ้า:
- มี user input → render path → ใส่ใน GUARD-P0-A XSS audit
- มี external network call → ใส่ใน GUARD-P0-C supply chain audit
- มี secret/API key → ใส่ใน GUARD-P0-B + \`docs/SECRETS.md\`
- มี user data storage → ใส่ใน GUARD Privacy section
- กระทบ Lighthouse perf → ใส่ใน GUARD-P0-E baseline

ดู: \`docs/GUARD_MISSION.md\` (master charter)

---

## 6. ไฟล์ project

\`\`\`
docs/${CODE}_MISSION.md          ← ไฟล์นี้
handoffs/${CODE}_YYYYMMDD_vN.md  ← session handoff
[เพิ่ม code/data files ที่จะมี]
\`\`\`

---

*สร้าง: ${todayISO} โดย new_project.mjs — แก้ template ให้ตรงกับ scope จริง*
`;

writeFileSync(MISSION_PATH, missionTemplate);
console.log(`  ✓ wrote docs/${CODE}_MISSION.md`);

// ─── 2. handoffs/<CODE>_<DATE>_v1.md ──────────────────
const handoffTemplate = `# ${CODE} — Session Handoff (Project Initiation)
# Date: ${todayISO} (session 1 — project setup)
# Previous: ไม่มี (project ใหม่)
# Charter: docs/${CODE}_MISSION.md

## STATE
Project    : ${CODE} (${NAME})
Phase      : 0 — Discovery (ยังไม่เริ่ม)
Sandbox    : [branch name]

## DONE (session นี้ — project initiation)
✓ ร่าง ${CODE} charter (\`docs/${CODE}_MISSION.md\`)
✓ ลง ${CODE} ใน PROJECT_STATUS.md + ECOSYSTEM.md + CLAUDE.md
✓ เตรียม handoff v1 พร้อม Phase 0 task list

## PENDING — 🟢 Claude ทำเองได้ (sandbox) — Phase 0

[ ] **${CODE}-P0-A** — [ชื่องาน audit/discovery] — [output file]
[ ] **${CODE}-P0-B** — [ชื่องาน] — [output]

## PENDING — 🔴 [ทดลองใช้] / [BLOCKED]

[ ] [ทดลองใช้] [ถ้ามี user task]

## DEFERRED — รอ dependency / scale

[ ] [ถ้ามี]

## 📨 GUARD cross-link (ตรวจ security/perf concern)

- [ ] ${CODE} มี user input ไหม? → ระบุ XSS surface → GUARD-P0-A audit
- [ ] ${CODE} มี external network call ไหม? → ระบุ endpoints → GUARD-P0-C
- [ ] ${CODE} มี secret/key ไหม? → register ใน \`docs/SECRETS.md\` (planned by GUARD-P1-F)
- [ ] ${CODE} มี user data storage ไหม? → privacy review → GUARD Phase 1
- [ ] ${CODE} กระทบ Lighthouse perf ไหม? → GUARD-P0-E baseline

## WHY LOG

- **เลือกชื่อ ${CODE}** — [เหตุผล]
- **Phase 0 = Discovery only** — กฎ "Measure before / Measure after" (จาก GUARD framework)

---

## Next session command

User พิมพ์: **\`session ${CODE}\`**

→ Claude อ่าน: \`ECOSYSTEM.md\` → \`PROJECT_STATUS.md\` → \`docs/${CODE}_MISSION.md\` → ไฟล์นี้
→ เสนอเริ่มจาก ${CODE}-P0-A
`;

writeFileSync(HANDOFF_PATH, handoffTemplate);
console.log(`  ✓ wrote handoffs/${CODE}_${today}_v1.md`);

// ─── 3. update PROJECT_STATUS.md ──────────────────────
const psPath = join(ROOT, 'PROJECT_STATUS.md');
let ps = readFileSync(psPath, 'utf8');

// insert ก่อน "## Quick Reference"
const newSection = `## ${CODE} — ${NAME} 🟢 Phase 0 Pending
**เป้าหมาย:** ${ROLE}

### สถานะ
- Charter: \`docs/${CODE}_MISSION.md\` — Phase 0 (Discovery) ยังไม่เริ่ม

### Next (Claude ทำได้ — Phase 0)
- [ ] **${CODE}-P0-A** — [audit/discovery task] (แก้ใน handoff)

### Blocked (รอ user)
- [ ] [ถ้ามี]

### เริ่ม session
พิมพ์: \`session ${CODE}\`

### Handoff ล่าสุด
\`handoffs/${CODE}_${today}_v1.md\`

### Charter (ต้องอ่านก่อน session ทุกครั้ง)
\`docs/${CODE}_MISSION.md\`

---

`;

const qrIndex = ps.indexOf('## Quick Reference');
if (qrIndex > 0) {
  ps = ps.slice(0, qrIndex) + newSection + ps.slice(qrIndex);
} else {
  ps += '\n' + newSection;
}

// เพิ่มแถวใน Quick Reference table
const qrTablePattern = /(\| Platform\/Academy \| PLATFORM \|.*\n)/;
const qrRow = `| ${NAME} | ${CODE} Phase 0 | docs/${CODE}_MISSION.md | 🟢 Pending — รอ session ${CODE} |\n`;
if (qrTablePattern.test(ps)) {
  ps = ps.replace(qrTablePattern, `$1${qrRow}`);
}

// อัปเดต "วิธีเริ่ม session ใหม่" — เพิ่ม CODE ใน list
ps = ps.replace(
  /(\*\*HORATAD \/ BIBLE \/ JULIAN \/ NOK \/ PLATFORM \/[^*]+)\*\*/,
  (_, prefix) => prefix.replace(/\*\*$/, '') + ` / ${CODE}**`
);

writeFileSync(psPath, ps);
console.log(`  ✓ updated PROJECT_STATUS.md (section + table + session list)`);

// ─── 4. update ECOSYSTEM.md ──────────────────────────
const ecoPath = join(ROOT, 'ECOSYSTEM.md');
let eco = readFileSync(ecoPath, 'utf8');

const ecoSection = `### ${CODE} — ${NAME}
- **หน้าที่:** ${ROLE}
- **Core:** \`docs/${CODE}_MISSION.md\` (charter), [ไฟล์อื่น]
- **Dependency:** [project ที่ depend on]
- **Output:** [output ของ ${CODE}]

`;

// insert ก่อน "---\n\n## Priority Framework" หรือ "## Cross-Project Dependencies"
const ecoInsertPoint = eco.indexOf('## Priority Framework') !== -1
  ? eco.indexOf('## Priority Framework')
  : eco.indexOf('## Cross-Project Dependencies');
if (ecoInsertPoint > 0) {
  // หา --- ก่อนหน้านี้
  const before = eco.slice(0, ecoInsertPoint);
  const lastBreak = before.lastIndexOf('\n---\n');
  if (lastBreak > 0) {
    eco = eco.slice(0, lastBreak) + '\n' + ecoSection + eco.slice(lastBreak);
  }
}

// เพิ่มใน file navigation table ถ้ามี
const fileNavPattern = /\| PLATFORM detail \|[^\n]+\n/;
if (fileNavPattern.test(eco)) {
  eco = eco.replace(fileNavPattern,
    (m) => m + `| ${CODE} detail | \`docs/${CODE}_MISSION.md\` + \`handoffs/${CODE}_*.md\` |\n`);
}

writeFileSync(ecoPath, eco);
console.log(`  ✓ updated ECOSYSTEM.md (project description + navigation)`);

// ─── 5. update CLAUDE.md (project list table) ────────
const claudePath = join(ROOT, 'CLAUDE.md');
let claude = readFileSync(claudePath, 'utf8');

const claudeRow = `| **${CODE}** | ${NAME} | ${ROLE} — charter: \`docs/${CODE}_MISSION.md\` |\n`;
// insert หลัง  GUARD row (ถ้ามี) หรือ หลัง PLATFORM row
if (claude.includes('| **GUARD** |')) {
  claude = claude.replace(/(\| \*\*GUARD\*\* \|[^\n]+\n)/, `$1${claudeRow}`);
} else if (claude.includes('| **PLATFORM** |')) {
  claude = claude.replace(/(\| \*\*PLATFORM\*\* \|[^\n]+\n)/, `$1${claudeRow}`);
}

writeFileSync(claudePath, claude);
console.log(`  ✓ updated CLAUDE.md (project list)`);

// ─── 6. Summary ───────────────────────────────────────
console.log(`\n${'━'.repeat(50)}`);
console.log(`✅ Project ${CODE} initialized!\n`);
console.log(`สิ่งที่ควรทำต่อ:`);
console.log(`  1. แก้ template ใน docs/${CODE}_MISSION.md ให้ตรง scope จริง`);
console.log(`  2. แก้ Phase 0 task list ใน handoffs/${CODE}_${today}_v1.md`);
console.log(`  3. รัน \`node scripts/admin/handoff_lint.mjs\` ตรวจ template`);
console.log(`  4. commit + ff main (ทุก commit ต้องลง main ตามกฎ admin)`);
console.log(`\nคำสั่ง verify:`);
console.log(`  node scripts/admin/big_status.mjs`);
console.log(`  node scripts/admin/handoff_lint.mjs handoffs/${CODE}_${today}_v1.md\n`);
