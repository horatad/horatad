/**
 * content_requeue.mjs
 * Rebuild คิว content/scheduled/ ใหม่แบบ series-aware interleave
 *
 * ปัญหาที่แก้: curator เรียงตาม score ล้วน → series สลับลำดับ + โพสต์แนวเดียวเกาะกลุ่ม
 * วิธี: จัดกลุ่มตาม series (JULIAN / TALS / EP / อื่นๆ) → round-robin สลับกลุ่ม
 *       แต่ละกลุ่มเรียงภายในตาม series_part / epNum
 *
 * รัน: node workers/content_requeue.mjs            (rebuild จาก scheduled + research inbox)
 *      node workers/content_requeue.mjs --dry-run  (แสดงลำดับ ไม่เขียนไฟล์)
 *
 * SAFE: ย้ายไฟล์ที่ผ่าน policy gate แล้วเท่านั้น (ไม่สร้าง caption ใหม่)
 */

import fs from 'fs';
import path from 'path';

const INBOX     = 'content/inbox';
const SCHEDULED = 'content/scheduled';
const DRY_RUN   = process.argv.includes('--dry-run');

// เลข episode จาก title (EP01, EP 48 …) — ใช้เรียงภายในกลุ่ม EP
function epNum(item) {
  const m = (item.title || '').match(/EP\s*0*(\d+)/i);
  return m ? parseInt(m[1]) : Infinity;
}

// กลุ่มของ item: series ที่ระบุใน meta > EP (จาก title) > "standalone"
function groupKey(item) {
  if (item.meta?.series) return item.meta.series;
  if (epNum(item) !== Infinity) return 'ep_youtube';
  return 'standalone';
}

// ลำดับภายในกลุ่ม: series_part > epNum > date_added
function inGroupOrder(item) {
  if (item.meta?.series_part != null) return item.meta.series_part;
  const ep = epNum(item);
  if (ep !== Infinity) return ep;
  return 9999;
}

// ลำดับความสำคัญของกลุ่ม (กลุ่มไหนนำรอบ) — research นำ EP
const GROUP_PRIORITY = {
  julian_research_overview: 1,
  tals_comparison:          2,
  ep_youtube:               3,
  standalone:               4,
};
function groupRank(g) { return GROUP_PRIORITY[g] ?? 50; }

function loadDir(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { _file: f, _dir: dir, ...data };
    });
}

function main() {
  // 1. รวม pool: ทุกอย่างใน scheduled + research posts ใน inbox (มี meta.series)
  const scheduled = loadDir(SCHEDULED);
  const inboxResearch = loadDir(INBOX).filter(d => d.meta?.series);

  const pool = [...scheduled, ...inboxResearch];
  if (pool.length === 0) {
    console.log('ไม่มี item ให้ requeue');
    return;
  }

  // 2. จัดกลุ่ม
  const groups = {};
  for (const item of pool) {
    const g = groupKey(item);
    (groups[g] ||= []).push(item);
  }
  // เรียงภายในแต่ละกลุ่ม
  for (const g of Object.keys(groups)) {
    groups[g].sort((a, b) => inGroupOrder(a) - inGroupOrder(b));
  }

  // 3. round-robin สลับกลุ่ม (เรียงกลุ่มตาม priority)
  const orderedGroups = Object.keys(groups).sort((a, b) => groupRank(a) - groupRank(b));
  const ordered = [];
  let added = true;
  for (let round = 0; added; round++) {
    added = false;
    for (const g of orderedGroups) {
      if (groups[g][round]) { ordered.push(groups[g][round]); added = true; }
    }
  }

  // 4. แสดงลำดับ
  console.log(`\n=== Requeue Plan (${ordered.length} โพสต์) ===`);
  ordered.forEach((item, i) => {
    const g = groupKey(item);
    console.log(`${String(i+1).padStart(2)}. [${g}] ${item.title.slice(0, 55)}`);
  });

  if (DRY_RUN) {
    console.log('\n(dry-run — ไม่เขียนไฟล์)');
    return;
  }

  // 5. เขียนคิวใหม่: ลบ scheduled เดิมทั้งหมด → เขียนตามลำดับใหม่ + reassign scheduled_at
  for (const f of fs.readdirSync(SCHEDULED).filter(f => f.endsWith('.json'))) {
    fs.unlinkSync(path.join(SCHEDULED, f));
  }

  const baseTs = Date.now();
  const today  = new Date().toISOString().slice(0, 10);
  ordered.forEach((item, i) => {
    const origFile = item._file;
    const origDir  = item._dir;
    delete item._file;
    delete item._dir;
    item.status = 'scheduled';
    item.scheduled_at = new Date(baseTs + i).toISOString();

    // ชื่อไฟล์ในคิว: จาก scheduled คงชื่อเดิม · จาก inbox ใส่ date prefix
    // (กัน date ซ้ำถ้า inbox file ขึ้นต้นด้วย YYYY-MM-DD_ อยู่แล้ว)
    const hasDatePrefix = /^\d{4}-\d{2}-\d{2}_/.test(origFile);
    const queueName = (origDir === SCHEDULED || hasDatePrefix)
      ? origFile : `${today}_${origFile}`;
    fs.writeFileSync(path.join(SCHEDULED, queueName), JSON.stringify(item, null, 2));

    // ลบจาก inbox ถ้ามาจาก inbox
    if (origDir === INBOX) fs.unlinkSync(path.join(INBOX, origFile));
  });

  console.log(`\n✅ คิวใหม่ ${ordered.length} โพสต์ใน content/scheduled/`);
  console.log(`   inbox เหลือ: ${fs.readdirSync(INBOX).filter(f => f.endsWith('.json')).length} items`);
}

main();
