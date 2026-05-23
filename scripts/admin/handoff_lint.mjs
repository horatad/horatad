#!/usr/bin/env node
// handoff_lint.mjs — ตรวจ handoff template compliance + cross-link integrity
// รัน:
//   node scripts/admin/handoff_lint.mjs                # ตรวจทุก handoff ล่าสุด
//   node scripts/admin/handoff_lint.mjs <file>         # ตรวจไฟล์เดียว
//   node scripts/admin/handoff_lint.mjs --strict       # exit 1 ถ้ามี warning

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { allProjects } from './_projects.mjs';

const STRICT = process.argv.includes('--strict');
const TARGET = process.argv.slice(2).find(a => !a.startsWith('-'));

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

const REQUIRED_SECTIONS = ['STATE', 'DONE', 'PENDING', 'WHY LOG'];
const PROJECTS = allProjects(process.cwd());  // auto-discover

let totalErrors = 0, totalWarnings = 0;

function lint(file) {
  const path = join(process.cwd(), file);
  if (!existsSync(path)) {
    console.log(`${C.red}✗${C.reset} ${file} — ไฟล์ไม่พบ`);
    totalErrors++;
    return;
  }

  const content = readFileSync(path, 'utf8');
  const issues = { error: [], warn: [] };

  // ── 1. Required sections (BIG handoff = analysis style → no PENDING required) ────
  const isBIG = file.includes('/BIG_');
  for (const sect of REQUIRED_SECTIONS) {
    if (isBIG && sect === 'PENDING') continue;
    if (!new RegExp(`^##+ ${sect}`, 'm').test(content)) {
      issues.error.push(`ขาด section: ## ${sect}`);
    }
  }

  // ── 2. Header format ────
  const headerLine = content.split('\n')[0] || '';
  const projectMatch = file.match(/handoffs\/([A-Z]+)_(\d{8})_v(\d+)\.md$/);
  if (!projectMatch) {
    issues.warn.push(`filename ไม่ตรง pattern <PROJECT>_<YYYYMMDD>_v<N>.md`);
  } else {
    const [, project, , version] = projectMatch;
    if (!PROJECTS.includes(project)) {
      issues.warn.push(`project "${project}" ไม่อยู่ใน list มาตรฐาน ${PROJECTS.join('/')}`);
    }
    if (!headerLine.includes(project)) {
      issues.warn.push(`บรรทัดแรกควรมีชื่อ project "${project}"`);
    }
  }

  // ── 3. Pending items บางอัน ────
  const pendingMatches = content.match(/^\[ \] /gm) || [];
  const donelines = content.match(/^✓/gm) || [];
  if (pendingMatches.length === 0 && donelines.length === 0) {
    issues.warn.push('ไม่มี [ ] pending หรือ ✓ done — handoff อาจว่างเปล่า');
  }

  // ── 4. WHY LOG ไม่ว่าง ────
  const whyMatch = content.match(/## WHY LOG\s*\n([\s\S]*?)(?:\n## |$)/);
  if (whyMatch && whyMatch[1].trim().length < 20) {
    issues.warn.push('WHY LOG section สั้นมาก หรือว่าง — ควรบันทึก decision อย่างน้อย 1 รายการ');
  }

  // ── 5. CIA cross-link integrity ────
  if (file.includes('CIA_')) {
    const ts = content.match(/T-\d+/g) || [];
    const rs = content.match(/R-\d+/g) || [];
    if (ts.length && rs.length === 0) {
      issues.warn.push(`มี T-NN reference แต่ไม่มี R-NN — ควร cross-link risk register`);
    }
  }

  // ── 6. Date validity ────
  const dateMatch = content.match(/^# Date: (\d{4})-(\d{2})-(\d{2})/m);
  if (!dateMatch) {
    issues.warn.push('ไม่พบ # Date: YYYY-MM-DD ในบรรทัดแรก ๆ');
  }

  // ── 7. Previous handoff link ────
  const prevMatch = content.match(/^# Previous: (.+)$/m);
  if (prevMatch && !prevMatch[1].includes('ไม่มี')) {
    let prevFile = prevMatch[1].trim().replace(/ → archive\/?$/, '');
    if (prevFile.startsWith('handoffs/')) {
      const direct = join(process.cwd(), prevFile);
      const archived = direct.replace('/handoffs/', '/handoffs/archive/');
      if (!existsSync(direct) && !existsSync(archived)) {
        issues.warn.push(`Previous link "${prevFile}" — ไฟล์ไม่พบใน handoffs/ หรือ archive/`);
      }
    }
  }

  // ── REPORT ────
  totalErrors += issues.error.length;
  totalWarnings += issues.warn.length;

  if (issues.error.length === 0 && issues.warn.length === 0) {
    console.log(`${C.green}✓${C.reset} ${file}`);
  } else {
    console.log(`${C.bold}${file}${C.reset}`);
    issues.error.forEach(m => console.log(`  ${C.red}error${C.reset}: ${m}`));
    issues.warn.forEach(m => console.log(`  ${C.yellow}warn${C.reset} : ${m}`));
  }
}

console.log(`${C.bold}${C.cyan}━━ Handoff Lint ━━${C.reset}\n`);

if (TARGET) {
  lint(TARGET);
} else {
  const dir = join(process.cwd(), 'handoffs');
  if (!existsSync(dir)) {
    console.log(`${C.red}ไม่พบ handoffs/ directory${C.reset}`);
    process.exit(1);
  }
  const files = readdirSync(dir).filter(f => f.endsWith('.md')).sort();
  const latestByProject = {};
  for (const f of files) {
    const m = f.match(/^([A-Z]+)_(\d{8})_v(\d+)\.md$/);
    if (!m) continue;
    const [, project] = m;
    if (!latestByProject[project] || f > latestByProject[project]) {
      latestByProject[project] = f;
    }
  }
  for (const project of Object.keys(latestByProject).sort()) {
    lint(`handoffs/${latestByProject[project]}`);
  }
}

console.log(`\n${C.bold}Summary:${C.reset} ${C.red}${totalErrors} errors${C.reset}, ${C.yellow}${totalWarnings} warnings${C.reset}\n`);

if (totalErrors > 0) process.exit(1);
if (STRICT && totalWarnings > 0) process.exit(1);
