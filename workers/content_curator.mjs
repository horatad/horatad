/**
 * content_curator.mjs
 * อ่านไฟล์จาก content/inbox/ → score → เติมคิว content/scheduled/ ให้ครบ QUEUE_TARGET
 *
 * รัน: node workers/content_curator.mjs            (เติมให้ครบ 5)
 *      node workers/content_curator.mjs --target=7 (เติมให้ครบ 7)
 * ใช้ใน GitHub Action: content_curator.yml (cron) — แต่ละรอบเติมเฉพาะส่วนที่ขาด
 */

import fs from 'fs';
import path from 'path';
import { fbPolicyViolations } from './fb_policy.mjs';

const INBOX     = 'content/inbox';
const SCHEDULED = 'content/scheduled';
const POSTED    = 'content/posted';

// จำนวนโพสต์ที่อยากให้ค้างในคิวเสมอ (buffer หลายวันล่วงหน้า)
const targetArg = process.argv.find(a => a.startsWith('--target='));
const QUEUE_TARGET = targetArg ? Math.max(1, parseInt(targetArg.split('=')[1]) || 5) : 5;

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

// เลข episode จาก title (EP01, EP 48, …) — ใช้ tiebreak ให้คอร์สเรียงตอนถูกลำดับ
function epNum(item) {
  const m = (item.title || '').match(/EP\s*0*(\d+)/i);
  return m ? parseInt(m[1]) : Infinity;
}

// ── FB Policy Gate — ย้ายไป workers/fb_policy.mjs (shared กับ requeue) ──────────

// --- main ---
function main() {
  // คิวมีอยู่เท่าไหร่แล้ว → เติมเฉพาะส่วนที่ขาด
  const inQueue = fs.readdirSync(SCHEDULED).filter(f => f.endsWith('.json')).length;
  const need = QUEUE_TARGET - inQueue;
  if (need <= 0) {
    console.log(`คิวเต็มแล้ว (${inQueue}/${QUEUE_TARGET}) — ไม่ต้องเติม`);
    return;
  }

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
  }).sort((a, b) =>
       (b._score - a._score)              // คะแนนสูงก่อน
    || (epNum(a) - epNum(b))              // คะแนนเท่า → เรียงตอน EP น้อย→มาก
    || (a.date_added || '').localeCompare(b.date_added || '')
  );

  console.log(`=== Content Ranking (เติมคิว ${need} อัน, เป้า ${QUEUE_TARGET}) ===`);
  scored.forEach((item, i) => {
    console.log(`${i+1}. [${item._score}pt] ${item.title} (${item.category}/${item.source})`);
  });

  // เลือก top `need` อันที่ผ่าน FB policy gate (4 กฎ)
  const picked = [];
  for (const item of scored) {
    if (picked.length >= need) break;
    const violations = fbPolicyViolations(item, recentPosts);
    if (violations.length > 0) {
      console.log(`⚠️  ข้าม "${item.title}" — ${violations.join(' · ')}`);
      continue;
    }
    picked.push(item);
  }
  if (picked.length === 0) {
    console.log('\n⚠️ ไม่มี item ที่ผ่าน FB policy gate — ไม่ schedule (ตรวจ inbox)');
    return;
  }

  // เขียนลงคิว — scheduled_at ไล่ลำดับ (ของที่เลือกก่อน = โพสต์ก่อน → FIFO เสถียร)
  const baseTs = Date.now();
  const today  = new Date().toISOString().slice(0, 10);
  picked.forEach((top, i) => {
    top.status = 'scheduled';
    top.scheduled_at = new Date(baseTs + i).toISOString();
    delete top._score;
    fs.writeFileSync(path.join(SCHEDULED, `${today}_${top._file}`), JSON.stringify(top, null, 2));
    fs.unlinkSync(path.join(INBOX, top._file));
    console.log(`✅ +คิว: ${top.title}`);
  });

  console.log(`\nคิวตอนนี้: ${inQueue + picked.length}/${QUEUE_TARGET} · inbox เหลือ: ${inboxFiles.length - picked.length} items`);
}

main();
