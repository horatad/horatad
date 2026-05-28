/**
 * content_curator.mjs
 * อ่านไฟล์จาก content/inbox/ → score → เลือก top item → ย้ายไป content/scheduled/
 *
 * รัน: node workers/content_curator.mjs
 * ใช้ใน GitHub Action: content_curator.yml
 */

import fs from 'fs';
import path from 'path';

const INBOX     = 'content/inbox';
const SCHEDULED = 'content/scheduled';
const POSTED    = 'content/posted';

// --- scoring rules ---
const CATEGORY_SCORE = {
  finding:       10,  // JULIAN data finding — แรงที่สุด
  case_study:     8,  // ดวงบุคคลจริง
  behind_scenes:  6,  // dev update
  education:      5,  // สอนความรู้
  manual:         4,  // user เขียนเอง (ยังไม่ classify)
};

const SOURCE_SCORE = {
  julian: 3,   // empirical data — น่าเชื่อถือ
  bible:  2,   // TALS rules
  manual: 1,
};

// ลดคะแนนถ้าโพสต์ category เดิมบ่อยเกิน
function diversityPenalty(item, recentPosts) {
  const sameCat = recentPosts.filter(p => p.category === item.category).length;
  return sameCat >= 2 ? -3 : 0;
}

// freshness bonus — ใหม่กว่า = คะแนนสูงกว่า
function freshnessBonus(dateAdded) {
  const days = (Date.now() - new Date(dateAdded).getTime()) / 86400000;
  if (days <= 1) return 3;
  if (days <= 3) return 2;
  if (days <= 7) return 1;
  return 0;
}

function scoreItem(item, recentPosts = []) {
  return (CATEGORY_SCORE[item.category] || 4)
       + (SOURCE_SCORE[item.source]    || 1)
       + freshnessBonus(item.date_added)
       + diversityPenalty(item, recentPosts);
}

// --- main ---
function main() {
  const inboxFiles = fs.readdirSync(INBOX).filter(f => f.endsWith('.json'));
  if (inboxFiles.length === 0) {
    console.log('inbox ว่าง — ไม่มีอะไรต้อง curate');
    return;
  }

  // โหลด recent posted (7 วันล่าสุด) เพื่อ diversity check
  const recentPosts = fs.readdirSync(POSTED)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(POSTED, f), 'utf8')))
    .filter(p => {
      const days = (Date.now() - new Date(p.date_posted || p.date_added).getTime()) / 86400000;
      return days <= 7;
    });

  // score ทุก item
  const scored = inboxFiles.map(f => {
    const item = JSON.parse(fs.readFileSync(path.join(INBOX, f), 'utf8'));
    item._file = f;
    item._score = scoreItem(item, recentPosts);
    return item;
  }).sort((a, b) => b._score - a._score);

  // log ranking
  console.log('=== Content Ranking ===');
  scored.forEach((item, i) => {
    console.log(`${i+1}. [${item._score}pt] ${item.title} (${item.category}/${item.source})`);
  });

  // เลือก top 1 → scheduled
  const top = scored[0];
  top.status = 'scheduled';
  top.scheduled_at = new Date().toISOString();
  delete top._score;

  const outFile = path.join(SCHEDULED, `${new Date().toISOString().slice(0,10)}_${top._file}`);
  fs.writeFileSync(outFile, JSON.stringify(top, null, 2));

  // ลบออกจาก inbox
  fs.unlinkSync(path.join(INBOX, top._file));

  console.log(`\n✅ Scheduled: ${top.title}`);
  console.log(`   → ${outFile}`);
  console.log(`   inbox เหลือ: ${inboxFiles.length - 1} items`);
}

main();
