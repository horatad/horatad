#!/usr/bin/env node
// JULIAN Data Loss Protection — sanity check + milestone backup
//
// Run before commit ใน workflow:
//   node workers/julian_backup.mjs sanity   # ตรวจว่า record count ไม่หายเกิน threshold
//   node workers/julian_backup.mjs milestone  # สร้าง branch backup ถ้าข้ามขั้น 25K/50K/75K/100K
//
// Output:
//   stdout: branch name ที่จะสร้าง (ถ้ามี) สำหรับ workflow ใช้
//   stderr: report ทุก check
//   exit 0: ok, exit 1: sanity fail

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { CONFIG } from './julian_config.mjs';

const PATH = 'data/julian_all.json';
const MODE = process.argv[2] || 'sanity';

function getCommitRecordCount(commitRef) {
  try {
    const content = execSync(`git show ${commitRef}:${PATH} 2>/dev/null`, {
      encoding: 'utf8',
      maxBuffer: 100 * 1024 * 1024,
    });
    return JSON.parse(content).length;
  } catch {
    return null;
  }
}

function currentCount() {
  return JSON.parse(readFileSync(PATH, 'utf8')).length;
}

// ── Mode: sanity ────────────────────────────────────────────────────────────
if (MODE === 'sanity') {
  if (!existsSync(PATH)) {
    console.error('❌ data file missing');
    process.exit(1);
  }

  const now = currentCount();
  const prev = getCommitRecordCount('HEAD~1');

  console.error(`Sanity check: current=${now} | prev=${prev ?? 'N/A (first commit)'}`);

  if (prev === null) {
    console.error('✓ first commit — skip drop check');
    process.exit(0);
  }

  const dropPct = ((prev - now) / prev) * 100;
  if (dropPct > CONFIG.SANITY_CHECK_DROP_PCT) {
    console.error(`❌ SANITY FAIL: records dropped ${dropPct.toFixed(2)}% (${prev} → ${now})`);
    console.error(`   threshold: ${CONFIG.SANITY_CHECK_DROP_PCT}%`);
    console.error(`   → workflow ควร abort + รักษา commit เก่า`);
    process.exit(1);
  }

  console.error(`✓ sanity ok (drop ${dropPct.toFixed(2)}% ≤ ${CONFIG.SANITY_CHECK_DROP_PCT}%)`);
  process.exit(0);
}

// ── Mode: milestone ─────────────────────────────────────────────────────────
if (MODE === 'milestone') {
  const now = currentCount();
  const prev = getCommitRecordCount('HEAD~1') ?? 0;

  // หา milestone ที่ "เพิ่งข้าม" (prev < M <= now)
  const crossed = (CONFIG.MILESTONES || []).filter(M => prev < M && now >= M);

  if (crossed.length === 0) {
    console.error(`No milestone crossed (prev=${prev} now=${now})`);
    process.exit(0);
  }

  // สร้าง backup branch สำหรับ milestone สูงสุดที่เพิ่งข้าม
  const M = Math.max(...crossed);
  const branchName = `backup/julian-data-${Math.round(M/1000)}k`;
  console.error(`✓ Milestone crossed: ${M.toLocaleString()} (prev=${prev}, now=${now})`);
  console.error(`  → backup branch: ${branchName}`);
  // workflow ใช้ stdout เป็น branch name
  process.stdout.write(branchName);
  process.exit(0);
}

console.error(`Unknown mode: ${MODE}`);
console.error(`Usage: node workers/julian_backup.mjs [sanity|milestone]`);
process.exit(2);
