#!/usr/bin/env node
// big_status.mjs — BIG admin overview command
// รัน: node scripts/admin/big_status.mjs [--verbose|-v]
// แสดงสถานะรวมของทุก project + main sync + branch health

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { allProjects } from './_projects.mjs';

const ROOT = process.cwd();
const VERBOSE = process.argv.includes('--verbose') || process.argv.includes('-v');

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', cyan: '\x1b[36m', magenta: '\x1b[35m',
};

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', ...opts }).trim();
  } catch (e) {
    return opts.allowFail ? '' : (() => { throw e; })();
  }
}

function section(title) {
  console.log(`\n${C.bold}${C.cyan}━━ ${title} ━━${C.reset}`);
}

function ok(msg) { console.log(`  ${C.green}✓${C.reset} ${msg}`); }
function warn(msg) { console.log(`  ${C.yellow}⚠${C.reset} ${msg}`); }
function err(msg) { console.log(`  ${C.red}✗${C.reset} ${msg}`); }
function info(msg) { console.log(`  ${C.dim}·${C.reset} ${msg}`); }

// ─── 1. GIT SYNC ─────────────────────────────────────
section('Git Sync');

sh('git fetch origin --quiet', { allowFail: true });

const branch = sh('git rev-parse --abbrev-ref HEAD');
const head = sh('git rev-parse --short HEAD');
const mainHead = sh('git rev-parse --short origin/main', { allowFail: true }) || '?';

console.log(`  branch  : ${C.bold}${branch}${C.reset} @ ${head}`);
console.log(`  origin/main: ${mainHead}`);

const pending = sh('git log origin/main..HEAD --oneline', { allowFail: true });
if (pending) {
  warn(`commits ค้างยังไม่ ff main:`);
  pending.split('\n').forEach(l => console.log(`     ${C.yellow}${l}${C.reset}`));
} else {
  ok('main = HEAD (no pending commits)');
}

const uncommitted = sh('git status --porcelain', { allowFail: true });
if (uncommitted) {
  warn(`uncommitted files: ${uncommitted.split('\n').length} ไฟล์`);
  if (VERBOSE) uncommitted.split('\n').slice(0, 10).forEach(l => console.log(`     ${C.dim}${l}${C.reset}`));
} else {
  ok('working tree clean');
}

// ─── 2. FEATURE BRANCHES ─────────────────────────────
section('Feature branches');

const ACTIVE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 ชั่วโมง = active session
const NOW = Date.now();

const allBranches = sh('git branch -r', { allowFail: true })
  .split('\n')
  .map(b => b.trim().replace(/^origin\//, ''))
  .filter(b => b.startsWith('claude/') && !b.includes('->'));

let mergedCount = 0;
const activeList = [];   // current branch หรือ commit < 4h (unmerged เท่านั้น)
const unmergedList = []; // unmerged + เก่ากว่า 4h

for (const b of allBranches) {
  const isCurrent = b === branch;
  const isMerged = sh(`git merge-base --is-ancestor origin/${b} origin/main && echo merged || echo no`, { allowFail: true });
  const commitTs = sh(`git log -1 --format='%ct' origin/${b}`, { allowFail: true });
  const commitMs = parseInt(commitTs, 10) * 1000;
  const lastCommit = sh(`git log -1 --format='%cr · %s' origin/${b}`, { allowFail: true });
  const isRecent = !isNaN(commitMs) && (NOW - commitMs) < ACTIVE_THRESHOLD_MS;

  if (isCurrent || isRecent) {
    // current branch หรือ recent — แสดงเป็น active เสมอ ไม่ว่า merged/unmerged
    if (isMerged === 'merged') mergedCount++; // นับ merged ด้วยแต่ยัง show ใน active
    activeList.push({ b, lastCommit, isCurrent, merged: isMerged === 'merged' });
  } else if (isMerged === 'merged') {
    mergedCount++;
  } else {
    unmergedList.push(`${b} (${lastCommit})`);
  }
}

// ถ้า current branch ไม่อยู่ใน origin (ยังไม่ push) → เพิ่มพิเศษ
const currentInList = activeList.some(a => a.isCurrent) || unmergedList.some(s => s.startsWith(branch));
if (!currentInList && branch !== 'main' && branch !== 'HEAD') {
  activeList.unshift({ b: branch, lastCommit: 'local only — ยังไม่ push ขึ้น origin', isCurrent: true, merged: false });
}

// Active sessions — แสดงเด่นก่อนเสมอ
if (activeList.length) {
  console.log(`  ${C.green}${C.bold}active${C.reset}   : ${activeList.length} session${activeList.length > 1 ? 's' : ''} (< 4h หรือ current)`);
  activeList.forEach(({ b, lastCommit, isCurrent, merged }) => {
    const currentTag = isCurrent ? ` ${C.green}← current${C.reset}` : '';
    const mergedTag = merged ? ` ${C.dim}[synced to main]${C.reset}` : '';
    console.log(`     ${C.green}▶${C.reset} ${C.bold}${b}${C.reset}${currentTag}${mergedTag}`);
    console.log(`       ${C.dim}${lastCommit}${C.reset}`);
  });
} else {
  console.log(`  ${C.dim}active   : ไม่มี session ที่ active ใน 4h ที่ผ่านมา${C.reset}`);
}

console.log(`  ${C.green}merged${C.reset}   : ${mergedCount} branches (พร้อมลบ — รัน \`node scripts/admin/branch_cleanup.mjs\`)`);
console.log(`  ${C.yellow}unmerged${C.reset} : ${unmergedList.length} branches (เก่ากว่า 4h)`);
if (VERBOSE && unmergedList.length) {
  unmergedList.slice(0, 15).forEach(b => console.log(`     ${C.dim}${b}${C.reset}`));
  if (unmergedList.length > 15) console.log(`     ${C.dim}... อีก ${unmergedList.length - 15} branches${C.reset}`);
}

// ─── 3. PROJECTS ─────────────────────────────────────
section('Projects (handoff latest)');

const PROJECTS = allProjects(ROOT);  // auto-discover
const handoffDir = join(ROOT, 'handoffs');

for (const p of PROJECTS) {
  if (!existsSync(handoffDir)) { err(`ไม่มี handoffs/ dir`); break; }
  const files = readdirSync(handoffDir)
    .filter(f => f.match(new RegExp(`^${p}_\\d{8}_v\\d+\\.md$`)))
    .sort()
    .reverse();
  if (!files.length) {
    info(`${C.dim}${p.padEnd(10)}${C.reset} — ไม่มี handoff`);
    continue;
  }
  const latest = files[0];
  const content = readFileSync(join(handoffDir, latest), 'utf8');
  const pending = (content.match(/^\[ \]/gm) || []).length;
  const blocked = (content.match(/\[BLOCKED\]/g) || []).length;
  const testing = (content.match(/\[ทดลองใช้\]/g) || []).length;
  const done = (content.match(/^✓/gm) || []).length;
  console.log(`  ${C.bold}${p.padEnd(10)}${C.reset} ${C.dim}${latest}${C.reset}`);
  console.log(`     ${C.green}done ${done}${C.reset}  ${C.yellow}pending ${pending}${C.reset}  ${C.magenta}[ทดลองใช้] ${testing}${C.reset}  ${C.red}[BLOCKED] ${blocked}${C.reset}`);
}

// ─── 4.  GUARD RISK SNAPSHOT ────────────────────────────
section('GUARD Risk snapshot');

const ciaFile = join(ROOT, 'docs/GUARD_MISSION.md');
if (existsSync(ciaFile)) {
  const cia = readFileSync(ciaFile, 'utf8');
  const risks = [...cia.matchAll(/\| R-(\d+) \| ([^|]+?) \|.*?\| \*?\*?(P\d|N\/A|done.*?)\*?\*? \|/g)];
  console.log(`  Risk register: ${risks.length} risks`);
  const byPriority = { P0: 0, P1: 0, P2: 0, P3: 0, 'N/A': 0, done: 0 };
  for (const [, , , pri] of risks) {
    const key = pri.includes('done') ? 'done' : pri.trim();
    if (key in byPriority) byPriority[key]++;
  }
  console.log(`     ${C.red}P0 ${byPriority.P0}${C.reset}  ${C.yellow}P1 ${byPriority.P1}${C.reset}  P2 ${byPriority.P2}  P3 ${byPriority.P3}  ${C.green}done ${byPriority.done}${C.reset}  ${C.dim}N/A ${byPriority['N/A']}${C.reset}`);
} else {
  warn('docs/GUARD_MISSION.md ไม่พบ');
}

// ─── 5. PROJECT_STATUS DRIFT CHECK ───────────────────
section('PROJECT_STATUS drift');

const status = readFileSync(join(ROOT, 'PROJECT_STATUS.md'), 'utf8');
const lastUpdate = status.match(/\*อัปเดตล่าสุด: ([\d-]+)/);
if (lastUpdate) {
  const d = new Date(lastUpdate[1]);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days > 7) warn(`PROJECT_STATUS.md ไม่อัปเดต ${days} วัน — เก่าเกิน`);
  else ok(`PROJECT_STATUS.md updated ${days} วันที่แล้ว`);
}

// ─── SUMMARY ─────────────────────────────────────────
section('Summary');

const issues = [];
if (pending) issues.push('commits ค้างยังไม่ ff main');
if (uncommitted) issues.push('uncommitted files');
if (mergedCount > 5) issues.push(`${mergedCount} feature branches พร้อมลบ`);

if (issues.length === 0) {
  ok(`${C.bold}${C.green}ระบบสุขภาพดี — ไม่มีงานค้างเด่น${C.reset}`);
} else {
  console.log(`  ${C.yellow}${C.bold}${issues.length} เรื่องที่ควรจัดการ:${C.reset}`);
  issues.forEach((i, idx) => console.log(`     ${idx + 1}. ${i}`));
}

console.log(`\n${C.dim}รัน \`node scripts/admin/big_status.mjs --verbose\` สำหรับรายละเอียดเพิ่ม${C.reset}\n`);
