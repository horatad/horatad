// _projects.mjs — shared helper: discover project codes จาก handoffs/
// ใช้โดย: big_status.mjs, handoff_lint.mjs, new_project.mjs

import { readdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function discoverProjects(root = process.cwd()) {
  const dir = join(root, 'handoffs');
  if (!existsSync(dir)) return [];
  const codes = new Set();
  for (const f of readdirSync(dir)) {
    const m = f.match(/^([A-Z]+)_\d{8}_v\d+\.md$/);
    if (m) codes.add(m[1]);
  }
  return [...codes].sort();
}

// PROJECTS ที่ระบุใน PROJECT_STATUS.md แต่ยังไม่มี handoff (เช่น PLATFORM)
// อ่านจาก PROJECT_STATUS.md heading "## <CODE> —"
const SKIP_HEADINGS = new Set(['Quick', 'วิธีเริ่ม']);  // exclude meta headings
export function discoverDeclaredProjects(root = process.cwd()) {
  const status = join(root, 'PROJECT_STATUS.md');
  if (!existsSync(status)) return [];
  let text = '';
  try { text = readFileSync(status, 'utf8'); } catch { return []; }
  const codes = new Set();
  for (const m of text.matchAll(/^## ([A-Z]+) —/gm)) {
    if (!SKIP_HEADINGS.has(m[1])) codes.add(m[1]);
  }
  return [...codes].sort();
}

// รวมทั้ง 2 source — declared (PROJECT_STATUS) + active (handoffs)
export function allProjects(root = process.cwd()) {
  return [...new Set([...discoverDeclaredProjects(root), ...discoverProjects(root)])].sort();
}
