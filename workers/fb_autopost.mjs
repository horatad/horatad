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
 *   node workers/fb_autopost.mjs --catch-up  # backup cron — โพสต์เฉพาะวันที่ยังไม่มีโพสต์ออก
 */

import fs from 'fs';
import path from 'path';
import { fbPolicyViolations } from './fb_policy.mjs';

const SCHEDULED = 'content/scheduled';
const POSTED    = 'content/posted';
const GRAPH     = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v23.0'}`;

const DRY     = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');
const CATCHUP = process.argv.includes('--catch-up');  // backup cron — โพสต์เฉพาะวันที่ยังไม่มีโพสต์ออก

// เพดานความถี่ — sync กับ tools/fb_post_helper.html (organic Page health)
const WEEKLY_MAX = 14;  // 2/วัน — เกินนี้เสี่ยง reach ลด / spam flag

// FB hygiene gate ใช้ fbPolicyViolations() ร่วม (workers/fb_policy.mjs) — defensive ชั้นสุดท้ายก่อนยิง
// curator/requeue กรองแล้ว แต่กันพลาด: เช็คครบ 6 กฎ (dead/bait/disclaimer/n=/framing)
// variation (กฎ 5) ข้ามที่นี่ — ส่ง recentPosts=[] (curator คุมตอนเติมคิวรายวัน)

function die(msg) { console.error(`\n❌ ${msg}\n`); process.exit(1); }

// normalize ข้อความเทียบ dedup — รวบ whitespace, trim
function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }

// dedup window — 48 ชม. (ไม่ใช่ 24) เพราะ cron รันทุก 24 ชม.พอดี · GitHub delay 5-30 นาที
// บ่อย → ถ้า window = 24 ชม. โพสต์รอบก่อนหลุด window → dedup miss → โพสต์ซ้ำ (F4 root cause)
const DEDUP_WINDOW_SEC = 48 * 3600;

// ดึงข้อความโพสต์ใน Page feed (window ด้านบน) — ใช้กัน duplicate (F2/F4)
async function recentlyPostedMessages(pageId, token) {
  const since = Math.floor(Date.now() / 1000) - DEDUP_WINDOW_SEC;
  const url = `${GRAPH}/${pageId}/feed?fields=message,created_time&since=${since}&limit=25&access_token=${encodeURIComponent(token)}`;
  const res  = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (json.error) throw new Error(`${json.error.message} (code ${json.error.code})`);
  return (json.data || []).map(p => norm(p.message)).filter(Boolean);
}

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

  // --catch-up: backup cron (รอบสำรองสาย) — กัน "cron แรก drop ทั้งวัน"
  // โพสต์เฉพาะถ้าวันนี้ "ยังไม่มี" โพสต์ออก → กันโพสต์ 2 รอบ/วันเมื่อ cron หลักสำเร็จไปแล้ว
  // (worker ยังมี dedup 48 ชม.จาก Page feed เป็นชั้นกันซ้ำของ "ข้อความเดียวกัน" อีกชั้น)
  if (CATCHUP) {
    const today = new Date().toISOString().slice(0, 10);
    const postedToday = fs.readdirSync(POSTED)
      .filter(f => f.endsWith('.json'))
      .some(f => {
        try { return JSON.parse(fs.readFileSync(path.join(POSTED, f), 'utf8')).date_posted === today; }
        catch { return false; }
      });
    if (postedToday) { console.log(`✅ วันนี้ (${today}) โพสต์ไปแล้ว — backup cron ข้าม (รอบหลักทำงานปกติ)`); return; }
    console.log(`⚠️  วันนี้ (${today}) ยังไม่มีโพสต์ — backup cron เข้ากู้ (รอบหลัก 08:30 น่าจะ cron drop)`);
  }

  const queue = files.map(f => ({ f, item: JSON.parse(fs.readFileSync(path.join(SCHEDULED, f), 'utf8')) }))
    .sort((a, b) =>
      (a.item.scheduled_at || a.item.date_added || a.f)
        .localeCompare(b.item.scheduled_at || b.item.date_added || b.f));

  // เลือกอันแรกที่ผ่าน FB policy gate ครบ 6 กฎ (variation ข้าม → recentPosts=[])
  let pick = null;
  for (const q of queue) {
    const v = fbPolicyViolations(q.item, []);
    if (v.length) { console.log(`⚠️  ข้าม "${q.item.title}" — ${v.join(' · ')}`); continue; }
    pick = q; break;
  }
  if (!pick) die('ทุกโพสต์ในคิวติด FB policy gate — ตรวจ content/scheduled/');

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

  // F2: idempotency guard — กัน duplicate post จาก push-fail รอบก่อน
  // ถ้ารอบก่อนโพสต์ FB สำเร็จแต่ push ledger fail → ไฟล์ยังค้าง scheduled/ → รอบนี้จะหยิบมาโพสต์ซ้ำ
  // เช็ค Page feed 48 ชม.: ถ้าข้อความตรงกับที่ขึ้น Page แล้ว → reconcile ledger (ย้าย posted/) ไม่โพสต์ซ้ำ
  const candidate = norm(pick.item.body || pick.item.title || '');
  try {
    const recent = await recentlyPostedMessages(PAGE_ID, TOKEN);
    const dup = recent.find(m =>
      m === candidate || (candidate.length >= 40 && m.startsWith(candidate.slice(0, 80))));
    if (dup) {
      console.log('\n♻️  ตรวจพบโพสต์นี้ขึ้น Page แล้วใน 48 ชม. (น่าจะ push ledger fail รอบก่อน)');
      console.log('   → reconcile: ย้าย scheduled/ → posted/ โดยไม่โพสต์ซ้ำ');
      pick.item.status      = 'posted';
      pick.item.date_posted = new Date().toISOString().slice(0, 10);
      pick.item.reconciled  = true;   // ปิด ledger โดยไม่ได้ยิงรอบนี้ (โพสต์ไปแล้วรอบก่อน)
      fs.writeFileSync(path.join(POSTED, pick.f), JSON.stringify(pick.item, null, 2));
      fs.unlinkSync(path.join(SCHEDULED, pick.f));
      console.log(`📦 ย้าย ${pick.f} → posted/ (reconciled) — รอบหน้าโพสต์อันถัดไป`);
      return;
    }
  } catch (e) {
    console.log(`⚠️  เช็ค dedup กับ Page feed ไม่ได้ (${e.message}) — ดำเนินการโพสต์ต่อ (fail-open)`);
  }

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
