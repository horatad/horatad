/**
 * fb_token_exchange.mjs
 * แลก short-lived user token → long-lived user token → never-expiring Page token
 *
 * ใช้ครั้งเดียวตอน setup: เอา Page token ที่ได้ไปเก็บเป็น GitHub Secret `FB_PAGE_TOKEN`
 * (Page token ที่ derive จาก long-lived user token จะ "ไม่หมดอายุ" ตราบใดที่ปีเตอร์
 *  ยัง admin Page อยู่ + ไม่เปลี่ยนรหัส FB)
 *
 * รัน (ใส่ค่าเป็น env — ห้าม hardcode/commit ค่าจริง):
 *   FB_APP_ID=xxx FB_APP_SECRET=xxx FB_SHORT_TOKEN=xxx \
 *     node workers/fb_token_exchange.mjs
 *
 *   ถ้ารู้ Page ID อยู่แล้ว เลือกเฉพาะ Page นั้น:
 *   FB_APP_ID=.. FB_APP_SECRET=.. FB_SHORT_TOKEN=.. FB_PAGE_ID=.. \
 *     node workers/fb_token_exchange.mjs
 *
 * วิธีได้ FB_SHORT_TOKEN: developers.facebook.com/tools/explorer
 *   เลือก App "โหราทาส AI" → Get Page Access Token →
 *   permission: pages_manage_posts, pages_read_engagement, pages_show_list →
 *   Generate Access Token → copy (token นี้สั้น อายุ ~1 ชม. ใช้แลกทันที)
 */

const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_VERSION || 'v23.0'}`;

const APP_ID     = process.env.FB_APP_ID;
const APP_SECRET = process.env.FB_APP_SECRET;
const SHORT      = process.env.FB_SHORT_TOKEN;
const WANT_PAGE  = process.env.FB_PAGE_ID || '';

function die(msg) { console.error(`\n❌ ${msg}\n`); process.exit(1); }

if (!APP_ID || !APP_SECRET || !SHORT) {
  die('ต้องตั้ง env: FB_APP_ID, FB_APP_SECRET, FB_SHORT_TOKEN\n' +
      '   (ดูวิธีได้ token บนหัวไฟล์ workers/fb_token_exchange.mjs)');
}

async function getJson(url) {
  const res  = await fetch(url);
  const json = await res.json().catch(() => ({}));
  if (json.error) die(`Graph API: ${json.error.message} (code ${json.error.code})`);
  if (!res.ok)    die(`HTTP ${res.status} — ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  // 1) short user token → long-lived user token (~60 วัน)
  console.log('1/3 แลก long-lived user token …');
  const ll = await getJson(`${GRAPH}/oauth/access_token?` + new URLSearchParams({
    grant_type:    'fb_exchange_token',
    client_id:     APP_ID,
    client_secret: APP_SECRET,
    fb_exchange_token: SHORT,
  }));
  const longUserToken = ll.access_token;
  console.log(`    ✅ ได้ long-lived user token (อายุ ~${Math.round((ll.expires_in||0)/86400)} วัน)`);

  // 2) ดึง Page token ของทุก Page ที่ปีเตอร์ admin
  console.log('2/3 ดึงรายการ Page + Page token …');
  const accounts = await getJson(`${GRAPH}/me/accounts?` + new URLSearchParams({
    fields: 'id,name,access_token,tasks',
    access_token: longUserToken,
  }));
  const pages = accounts.data || [];
  if (pages.length === 0) die('ไม่พบ Page ที่ account นี้เป็น admin — เช็คว่า login ถูก account + เลือก Page ตอน generate token');

  // 3) เลือก Page เป้าหมาย
  console.log('3/3 เลือก Page เป้าหมาย …\n');
  let target;
  if (WANT_PAGE) {
    target = pages.find(p => p.id === WANT_PAGE);
    if (!target) die(`ไม่พบ Page id=${WANT_PAGE} ในรายการ — Page ที่เจอ: ${pages.map(p => `${p.name}(${p.id})`).join(', ')}`);
  } else if (pages.length === 1) {
    target = pages[0];
  } else {
    console.log('พบหลาย Page — รันใหม่พร้อม FB_PAGE_ID=<id> เพื่อเลือก:');
    pages.forEach(p => console.log(`   • ${p.name}  →  FB_PAGE_ID=${p.id}`));
    process.exit(0);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Page: ${target.name}`);
  console.log(`\nGitHub Secrets ที่ต้องตั้ง (Settings → Secrets → Actions):`);
  console.log(`\n  FB_PAGE_ID    = ${target.id}`);
  console.log(`  FB_PAGE_TOKEN = ${target.access_token}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⚠️  Page token นี้คือความลับ — เก็บเป็น GitHub Secret เท่านั้น ห้าม commit/แชร์');
  console.log('   ทดสอบก่อนใช้จริง:');
  console.log(`   FB_PAGE_ID=${target.id} FB_PAGE_TOKEN=<token> node workers/fb_autopost.mjs --dry-run`);
}

main();
