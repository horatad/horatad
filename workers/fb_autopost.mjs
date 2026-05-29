/**
 * fb_autopost.mjs
 * โพสต์เนื้อหาคิวถัดไป (content/scheduled/) ขึ้น Facebook Page ผ่าน Graph API
 * แล้วย้ายไฟล์ scheduled/ → posted/ (curator + posted/ feedback loop ทำงานต่อได้)
 *
 * ทำงาน 1 โพสต์/รอบ (FIFO ตาม scheduled_at) — เรียกซ้ำได้ทุกวันใน cron
 *
 * env ที่ต้องมี:
 *   FB_PAGE_ID    — id ของ Page (ได้จาก fb_token_exchange.mjs)
 *   FB_PAGE_TOKEN — never-expiring Page access token
 *   GRAPH_VERSION — (optional) default v23.0
 *
 * รัน:
 *   node workers/fb_autopost.mjs --dry-run   # ดูว่าจะโพสต์อะไร ไม่ยิงจริง
 *   node workers/fb_autopost.mjs             # โพสต์จริง 1 อัน
 *   node workers/fb_autopost.mjs --force     # ข้ามเพดานความถี่รายสัปดาห์
 */

import fs from 'fs';
import path from 'path';

const SCHEDULED = 'content/scheduled';
const POSTED    = 'content/posted';
const GRAPH     = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v23.0'}`;

const DRY   = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// เพดานความถี่ — sync กับ tools/fb_post_helper.html (organic Page health)
const WEEKLY_MAX = 14;  // 2/วัน — เกินนี้เสี่ยง reach ลด / spam flag

// FB hygiene gate (defensive — curator กรองแล้ว แต่กันพลาดอีกชั้นก่อนยิงจริง)
const FB_BAIT = [
  /tag\s*เพื่อน/i, /แท็ก\s*เพื่อน/, /share\s*เพื่อโชค/i, /แชร์\s*เพื่อโชค/,
  /like\s*ถ้า/i, /กด\s*ไลค์\s*ถ้า/, /คอมเมนต์\s*เพื่อรับ/,
];
function baitFound(item) {
  const body = (item.body || '') + ' ' + (item.title || '');
  return FB_BAIT.filter(re => re.test(body)).map(re => re.source);
}

function die(msg) { console.error(`\n❌ ${msg}\n`); process.exit(1); }

// นับโพสต์ใน 7 วันล่าสุด (จาก date_posted) — วัดความถี่ต่อสัปดาห์
function weeklyPostedCount() {
  const cut = new Date(); cut.setDate(cut.getDate() - 6);
  const cutStr = cut.toISOString().slice(0, 10);
  return fs.readdirSync(POSTED)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(POSTED, f), 'utf8')))
    .filter(p => (p.date_posted || '') >= cutStr).length;
}

// ลิงก์แนบ preview card — youtube_url ก่อน, fallback URL แรกใน body
function pickLink(item) {
  if (item.meta && item.meta.youtube_url) return item.meta.youtube_url;
  const m = (item.body || '').match(/https?:\/\/\S+/);
  return m ? m[0] : '';
}

async function postToFacebook(pageId, token, item) {
  const params = { message: item.body || item.title || '', access_token: token };
  const link = pickLink(item);
  if (link) params.link = link;   // ให้ FB แสดง preview card (เช่น YouTube)

  const res  = await fetch(`${GRAPH}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const json = await res.json().catch(() => ({}));
  if (json.error) die(`Graph API: ${json.error.message} (code ${json.error.code}, type ${json.error.type})`);
  if (!res.ok)    die(`HTTP ${res.status} — ${JSON.stringify(json)}`);
  return json;   // { id: "<pageid>_<postid>" }
}

async function main() {
  const PAGE_ID = process.env.FB_PAGE_ID;
  const TOKEN   = process.env.FB_PAGE_TOKEN;

  // คิวถัดไป (FIFO ตาม scheduled_at → fallback date_added → ชื่อไฟล์)
  const files = fs.readdirSync(SCHEDULED).filter(f => f.endsWith('.json'));
  if (files.length === 0) { console.log('คิวว่าง — ไม่มีโพสต์รออยู่'); return; }

  const queue = files.map(f => ({ f, item: JSON.parse(fs.readFileSync(path.join(SCHEDULED, f), 'utf8')) }))
    .sort((a, b) =>
      (a.item.scheduled_at || a.item.date_added || a.f)
        .localeCompare(b.item.scheduled_at || b.item.date_added || b.f));

  // เลือกอันแรกที่ผ่าน hygiene gate
  let pick = null;
  for (const q of queue) {
    const bait = baitFound(q.item);
    if (bait.length) { console.log(`⚠️  ข้าม "${q.item.title}" — engagement-bait: ${bait.join(', ')}`); continue; }
    pick = q; break;
  }
  if (!pick) die('ทุกโพสต์ในคิวติด FB hygiene gate — ตรวจ content/scheduled/');

  console.log(`📋 โพสต์ถัดไป: ${pick.item.title}`);
  console.log(`   category=${pick.item.category} source=${pick.item.source}`);
  const link = pickLink(pick.item);
  if (link) console.log(`   link: ${link}`);

  // เพดานความถี่
  const wk = weeklyPostedCount();
  console.log(`   สัปดาห์นี้โพสต์ไปแล้ว: ${wk}/${WEEKLY_MAX}`);
  if (wk >= WEEKLY_MAX && !FORCE) {
    console.log(`\n🔴 ถึงเพดาน ${WEEKLY_MAX}/สัปดาห์ — ข้ามรอบนี้ (ใช้ --force เพื่อ override)`);
    return;
  }

  if (DRY) {
    console.log('\n--- DRY RUN (ไม่ยิงจริง) ---');
    console.log((pick.item.body || '').slice(0, 400) + (((pick.item.body||'').length>400)?'…':''));
    console.log('\n✅ dry-run ผ่าน — เอา --dry-run ออกเพื่อโพสต์จริง');
    return;
  }

  if (!PAGE_ID || !TOKEN) die('ต้องตั้ง env: FB_PAGE_ID, FB_PAGE_TOKEN (รัน fb_token_exchange.mjs เพื่อขอ)');

  // ยิงจริง
  console.log('\n🚀 กำลังโพสต์ …');
  const result = await postToFacebook(PAGE_ID, TOKEN, pick.item);
  console.log(`✅ โพสต์สำเร็จ — post id: ${result.id}`);

  // ย้าย scheduled/ → posted/ พร้อม metadata
  pick.item.status      = 'posted';
  pick.item.date_posted = new Date().toISOString().slice(0, 10);
  pick.item.fb_post_id  = result.id;
  fs.writeFileSync(path.join(POSTED, pick.f), JSON.stringify(pick.item, null, 2));
  fs.unlinkSync(path.join(SCHEDULED, pick.f));
  console.log(`📦 ย้าย ${pick.f} → posted/`);
}

main();
