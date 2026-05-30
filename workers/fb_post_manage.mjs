/**
 * fb_post_manage.mjs
 * แก้ไข (edit) หรือ ลบ (delete) โพสต์ที่ "เผยแพร่ไปแล้ว" บน Facebook Page ผ่าน Graph API
 *
 * ⚠️ destructive — ออกแบบให้ "คนกดเอง" ผ่าน GitHub Actions (workflow_dispatch) เท่านั้น
 *    ห้าม schedule / ห้ามให้ automation เรียก (ดู .github/workflows/fb_post_manage.yml)
 *
 * กันชนความปลอดภัย (drawback mitigation):
 *   1. echo-before — ดึงข้อความปัจจุบันมาโชว์ก่อนลงมือเสมอ (เห็นว่ายิงถูกตัวไหม)
 *   2. our-page-only — POST_ID ต้องขึ้นต้นด้วย <FB_PAGE_ID>_ (กันยิงผิดเพจ)
 *   3. delete ต้องพิมพ์ CONFIRM=DELETE (กันลบพลาด — FB ลบแล้วกู้ไม่ได้)
 *   4. โชว์อายุโพสต์ชัดเจน (โพสต์เก่ามี engagement สะสม — คิดก่อนลบ)
 *
 * env ที่ต้องมี:
 *   FB_PAGE_ID    — id ของ Page
 *   FB_PAGE_TOKEN — never-expiring Page access token
 *   GRAPH_VERSION — (optional) default v23.0
 *   POST_ID       — <pageid>_<postid> ของโพสต์เป้าหมาย
 *   ACTION        — 'edit' (default) | 'delete'
 *   BODY          — ข้อความใหม่ (จำเป็นเมื่อ ACTION=edit)
 *   CONFIRM       — ต้องเป็น 'DELETE' เมื่อ ACTION=delete
 */

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v23.0'}`;

function die(msg) { console.error(`\n❌ ${msg}\n`); process.exit(1); }

// token ผ่าน Authorization header เสมอ ไม่ใส่ใน query/body — R-22: กัน token หลุดถ้าเผลอ log url
async function graph(pathQs, init = {}) {
  const headers = { ...(init.headers || {}), Authorization: `Bearer ${process.env.FB_PAGE_TOKEN}` };
  const res  = await fetch(`${GRAPH}/${pathQs}`, { ...init, headers });
  const json = await res.json().catch(() => ({}));
  if (json.error) die(`Graph API: ${json.error.message} (code ${json.error.code}, type ${json.error.type})`);
  if (!res.ok)    die(`HTTP ${res.status} — ${JSON.stringify(json)}`);
  return json;
}

function ageText(createdTime) {
  if (!createdTime) return 'ไม่ทราบ';
  const ms = Date.now() - new Date(createdTime).getTime();
  const h  = Math.floor(ms / 3600000);
  return h < 48 ? `${h} ชม.` : `${Math.floor(h / 24)} วัน`;
}

async function main() {
  const PAGE_ID = process.env.FB_PAGE_ID;
  const TOKEN   = process.env.FB_PAGE_TOKEN;
  const POST_ID = (process.env.POST_ID || '').trim();
  const ACTION  = (process.env.ACTION  || 'edit').trim().toLowerCase();
  const BODY    = process.env.BODY || '';
  const CONFIRM = (process.env.CONFIRM || '').trim();

  if (!PAGE_ID) die('ไม่มี FB_PAGE_ID');
  if (!TOKEN)   die('ไม่มี FB_PAGE_TOKEN');
  if (!POST_ID) die('ไม่มี POST_ID (รูปแบบ <pageid>_<postid>)');
  if (!['edit', 'delete'].includes(ACTION)) die(`ACTION ต้องเป็น edit หรือ delete (ได้: "${ACTION}")`);

  // กันชน 2: ต้องเป็นโพสต์ของเพจเรา
  if (!POST_ID.startsWith(`${PAGE_ID}_`)) {
    die(`POST_ID ไม่ได้ขึ้นต้นด้วย Page ID ของเรา (${PAGE_ID}_...) — ปฏิเสธเพื่อกันยิงผิดเพจ`);
  }

  // กันชน 1+4: echo-before — โชว์โพสต์ปัจจุบัน + อายุ ก่อนลงมือเสมอ
  const cur = await graph(`${POST_ID}?fields=message,created_time,permalink_url`);
  console.log('━━━ โพสต์เป้าหมาย ━━━');
  console.log(`id        : ${POST_ID}`);
  console.log(`อายุ      : ${ageText(cur.created_time)} (created ${cur.created_time || '?'})`);
  console.log(`permalink : ${cur.permalink_url || '-'}`);
  console.log(`ข้อความเดิม:\n${cur.message || '(ไม่มีข้อความ)'}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━');

  if (ACTION === 'edit') {
    if (!BODY.trim()) die('ACTION=edit แต่ BODY ว่าง — ใส่ข้อความใหม่');
    await graph(`${POST_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ message: BODY }),
    });
    console.log('\n✅ แก้ไขข้อความเรียบร้อย (การ์ด/attachment เดิมยังอยู่ engagement ครบ)');
    console.log('ข้อความใหม่:\n' + BODY);
    return;
  }

  // ACTION === 'delete' — กันชน 3: ต้อง CONFIRM=DELETE
  if (CONFIRM !== 'DELETE') {
    die('ACTION=delete ต้องตั้ง CONFIRM=DELETE (พิมพ์ตัวใหญ่) เพื่อยืนยัน — ยกเลิก (ลบ FB กู้ไม่ได้)');
  }
  await graph(`${POST_ID}`, { method: 'DELETE' });
  console.log('\n🗑️  ลบโพสต์เรียบร้อย (ถาวร — กู้ไม่ได้)');
}

main().catch(e => die(e.message));
