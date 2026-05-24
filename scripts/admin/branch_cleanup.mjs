#!/usr/bin/env node
// branch_cleanup.mjs — ลบ feature branch `claude/*` ที่ merged ไป main แล้ว
// รัน:
//   node scripts/admin/branch_cleanup.mjs           # dry-run (default — ปลอดภัย)
//   node scripts/admin/branch_cleanup.mjs --apply   # ลบจริง
//   node scripts/admin/branch_cleanup.mjs --apply --include-backup  # ลบ backup/* เก่ากว่า 90 วันด้วย

import { execSync } from 'node:child_process';

const APPLY = process.argv.includes('--apply');
const INCLUDE_BACKUP = process.argv.includes('--include-backup');

// Sandbox ของ Claude Code Web ใช้ local_proxy → ไม่ได้รับ permission ลบ remote branch (403)
// → ถ้าต้องการลบจริง: รันที่ local CLI หรือใช้ GH workflow stale_branch_cleanup.yml
// (workflow_dispatch + apply=true) ผ่าน GitHub Actions แทน
// script จะตรวจ proxy + bail out ก่อนถ้าเจอ sandbox เพื่อไม่ให้เสียเวลา push --delete loop

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m',
};

function sh(cmd, opts = {}) {
  try { return execSync(cmd, { encoding: 'utf8', ...opts }).trim(); }
  catch (e) { return opts.allowFail ? '' : (() => { throw e; })(); }
}

console.log(`${C.bold}${C.cyan}━━ Branch Cleanup ━━${C.reset}\n`);
console.log(`Mode: ${APPLY ? C.red + 'APPLY (ลบจริง)' : C.green + 'DRY-RUN (ไม่ลบ — รัน --apply เพื่อลบ)'}${C.reset}`);
console.log(`Include backup/*: ${INCLUDE_BACKUP ? 'yes (90+ วัน)' : 'no'}\n`);

sh('git fetch origin --prune --quiet', { allowFail: true });

const allRemote = sh('git branch -r', { allowFail: true })
  .split('\n')
  .map(b => b.trim().replace(/^origin\//, ''))
  .filter(b => !b.includes('->') && b !== 'main' && b !== 'HEAD');

const featureBranches = allRemote.filter(b => b.startsWith('claude/'));
const backupBranches = allRemote.filter(b => b.startsWith('backup/'));

console.log(`Total remote branches: ${allRemote.length}`);
console.log(`  claude/*: ${featureBranches.length}`);
console.log(`  backup/*: ${backupBranches.length}`);
console.log(`  other  : ${allRemote.length - featureBranches.length - backupBranches.length}\n`);

const currentBranch = sh('git rev-parse --abbrev-ref HEAD');

// ─── claude/* mergeable detection ──────────────────
const toDelete = [];
const toKeep = [];

for (const b of featureBranches) {
  if (b === currentBranch) { toKeep.push({ branch: b, reason: 'current branch' }); continue; }
  const merged = sh(`git merge-base --is-ancestor origin/${b} origin/main && echo yes || echo no`, { allowFail: true });
  if (merged === 'yes') {
    const lastCommit = sh(`git log -1 --format='%cr' origin/${b}`, { allowFail: true });
    toDelete.push({ branch: b, age: lastCommit });
  } else {
    const lastCommit = sh(`git log -1 --format='%cr · %s' origin/${b}`, { allowFail: true });
    toKeep.push({ branch: b, reason: `unmerged · ${lastCommit}` });
  }
}

// ─── backup/* age detection (optional) ─────────────
const backupToDelete = [];
if (INCLUDE_BACKUP) {
  const NINETY_DAYS_SEC = 90 * 86400;
  const now = Math.floor(Date.now() / 1000);
  for (const b of backupBranches) {
    const commitTs = parseInt(sh(`git log -1 --format='%ct' origin/${b}`, { allowFail: true }) || '0');
    if (commitTs && (now - commitTs) > NINETY_DAYS_SEC) {
      const lastCommit = sh(`git log -1 --format='%cr' origin/${b}`, { allowFail: true });
      backupToDelete.push({ branch: b, age: lastCommit });
    }
  }
}

// ─── REPORT ────────────────────────────────────────
console.log(`${C.bold}claude/* — merged และพร้อมลบ: ${C.green}${toDelete.length}${C.reset}`);
toDelete.forEach(({ branch, age }) => console.log(`  ${C.green}DELETE${C.reset} ${branch} ${C.dim}(${age})${C.reset}`));

if (toKeep.length) {
  console.log(`\n${C.bold}claude/* — keep (${toKeep.length}):${C.reset}`);
  toKeep.forEach(({ branch, reason }) => console.log(`  ${C.yellow}KEEP${C.reset}   ${branch} ${C.dim}${reason}${C.reset}`));
}

if (INCLUDE_BACKUP && backupToDelete.length) {
  console.log(`\n${C.bold}backup/* — older than 90 days: ${C.green}${backupToDelete.length}${C.reset}`);
  backupToDelete.forEach(({ branch, age }) => console.log(`  ${C.green}DELETE${C.reset} ${branch} ${C.dim}(${age})${C.reset}`));
}

// ─── APPLY ─────────────────────────────────────────
if (!APPLY) {
  console.log(`\n${C.dim}Dry-run เท่านั้น. รัน --apply เพื่อลบจริง.${C.reset}\n`);
  process.exit(0);
}

// Sandbox detection — proxy URL (127.0.0.1) block git push --delete (403)
const remoteUrl = sh('git config --get remote.origin.url', { allowFail: true });
if (/127\.0\.0\.1|local_proxy/.test(remoteUrl)) {
  console.log(`\n${C.bold}${C.yellow}⚠ Sandbox proxy detected${C.reset} (${C.dim}${remoteUrl}${C.reset})`);
  console.log(`Sandbox ไม่สามารถ ${C.bold}git push --delete${C.reset} ได้ (403 จาก proxy)\n`);
  console.log(`${C.bold}ทางเลือก:${C.reset}`);
  console.log(`  1. ${C.cyan}Local CLI${C.reset} — รันที่เครื่อง user:`);
  toDelete.forEach(({ branch }) => console.log(`       git push origin --delete ${branch}`));
  console.log(`  2. ${C.cyan}GH Actions workflow${C.reset} — Actions tab → "Stale Branch Cleanup" → Run workflow → apply=true`);
  console.log(`     (${C.dim}cron weekly อยู่แล้ว — ลบเฉพาะ branch >14 วัน${C.reset})`);
  console.log(`  3. ${C.cyan}GitHub web UI${C.reset} — Branches page → "🗑" icon ต่อ branch`);
  console.log(`\n${C.bold}สรุป:${C.reset} ${toDelete.length} branches รอลบ (sandbox skip)\n`);
  process.exit(0);
}

console.log(`\n${C.bold}${C.red}กำลังลบ branches...${C.reset}`);
let deleted = 0, failed = 0;
for (const { branch } of [...toDelete, ...backupToDelete]) {
  try {
    sh(`git push origin --delete "${branch}"`, { allowFail: false });
    console.log(`  ${C.green}✓${C.reset} deleted ${branch}`);
    deleted++;
  } catch (e) {
    console.log(`  ${C.red}✗${C.reset} failed ${branch}: ${e.message.split('\n')[0]}`);
    failed++;
  }
}

console.log(`\n${C.bold}Done.${C.reset} deleted=${deleted}, failed=${failed}\n`);
