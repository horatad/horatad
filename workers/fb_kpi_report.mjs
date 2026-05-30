/**
 * fb_kpi_report.mjs
 * ดึง KPI จาก FB Graph API → บันทึก content/kpi/YYYY-MM.json
 *
 * รัน: node workers/fb_kpi_report.mjs
 * Env: FB_PAGE_TOKEN, FB_PAGE_ID
 *
 * Metrics:
 *   - page_fan_count (followers)
 *   - page_impressions_unique (reach 28 วัน)
 *   - page_post_engagements (engagement 28 วัน)
 *   - top 5 posts ใน 30 วัน
 */

import fs   from 'fs';
import path from 'path';

const TOKEN   = process.env.FB_PAGE_TOKEN;
const PAGE_ID = process.env.FB_PAGE_ID;

if (!TOKEN || !PAGE_ID) {
  console.error('❌ ต้องตั้ง FB_PAGE_TOKEN และ FB_PAGE_ID');
  process.exit(1);
}

// token ส่งผ่าน Authorization header (ไม่ใส่ใน query string) — R-22: กัน token หลุดถ้าเผลอ log url
async function get(endpoint) {
  const url = `https://graph.facebook.com/v19.0/${endpoint}`;
  const res  = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await res.json();
  if (data.error) throw new Error(`FB API error: ${data.error.message} (code ${data.error.code})`);
  return data;
}

async function main() {
  console.log('📊 ดึง FB KPI...\n');

  // 1. Page info + fan count
  const page = await get(`${PAGE_ID}?fields=name,fan_count`);
  console.log(`Page: ${page.name} · Followers: ${page.fan_count.toLocaleString()}`);

  // 2. Page insights (28 วันล่าสุด) — ใช้เฉพาะ metric ที่ยังไม่ถูก deprecated
  //    period=days_28 (Meta deprecate metric หลายตัว พ.ย. 2024 — page_post_engagements หายไป)
  const metrics = [
    'page_impressions',             // total impressions
    'page_impressions_unique',      // reach (unique)
  ].join(',');

  let reach = 0, impressions = 0;
  try {
    const insights = await get(
      `${PAGE_ID}/insights?metric=${metrics}&period=days_28`
    );
    const kv = {};
    for (const m of insights.data || []) {
      // days_28 คืน array ของ data point — เอาตัวล่าสุด
      const vals = m.values || [];
      kv[m.name] = vals.length ? vals[vals.length - 1].value : 0;
    }
    reach       = kv['page_impressions_unique'] || 0;
    impressions = kv['page_impressions']        || 0;
  } catch (err) {
    console.log(`⚠ page insights ไม่ได้ (${err.message}) — ข้าม reach/impressions`);
  }

  console.log(`Reach (28d unique): ${reach.toLocaleString()}`);
  console.log(`Impressions (28d):  ${impressions.toLocaleString()}`);

  // 3. Top 5 posts (30 วัน) — engagement จาก likes/comments/shares (ไม่พึ่ง metric ที่ deprecated)
  //    ต้องการ permission pages_read_engagement — ถ้าไม่มี degrade graceful (รายงาน followers อย่างเดียว)
  const since30 = Math.floor(Date.now() / 1000) - 30 * 86400;
  let posts = { data: [] };
  try {
    posts = await get(
      `${PAGE_ID}/posts?fields=message,created_time,` +
      `likes.summary(true),comments.summary(true),shares,` +
      `insights.metric(post_impressions_unique)` +
      `&since=${since30}&limit=25`
    );
  } catch (err) {
    console.log(`⚠ posts/engagement ไม่ได้ (${err.message})`);
    console.log('   → token ขาด permission pages_read_engagement — รายงานเฉพาะ followers');
  }

  const postStats = (posts.data || []).map(p => {
    const likes    = p.likes?.summary?.total_count    || 0;
    const comments = p.comments?.summary?.total_count || 0;
    const shares   = p.shares?.count                  || 0;
    const postEng  = likes + comments + shares;
    const ins = p.insights?.data || [];
    const postReach = ins.find(i => i.name === 'post_impressions_unique')?.values?.[0]?.value || 0;
    return {
      id:         p.id,
      created:    p.created_time?.slice(0, 10),
      message:    (p.message || '').slice(0, 60),
      reach:      postReach,
      likes, comments, shares,
      engagement: postEng,
      eng_rate:   postReach > 0 ? +((postEng / postReach) * 100).toFixed(2) : 0,
    };
  }).sort((a, b) => b.reach - a.reach).slice(0, 5);

  console.log('\nTop 5 posts (reach):');
  postStats.forEach((p, i) =>
    console.log(`  ${i+1}. [${p.created}] reach=${p.reach} eng=${p.engagement} (${p.eng_rate}%) — ${p.message}`)
  );

  // engagement รวม 30 วัน — จากทุก post ที่ดึงมา (ไม่ใช่แค่ top 5)
  const allPosts = posts.data || [];
  const totalEng = allPosts.reduce((s, p) =>
      s + (p.likes?.summary?.total_count || 0)
        + (p.comments?.summary?.total_count || 0)
        + (p.shares?.count || 0), 0);
  const avgEngPerPost = allPosts.length ? +(totalEng / allPosts.length).toFixed(1) : 0;
  const engRate = reach > 0 ? +((totalEng / reach) * 100).toFixed(2) : 0;
  console.log(`\nEngagement (30d total): ${totalEng} · avg/post: ${avgEngPerPost} · rate: ${engRate}%`);

  // 4. บันทึก JSON
  const month  = new Date().toISOString().slice(0, 7);
  const outDir = 'content/kpi';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const report = {
    month,
    generated: new Date().toISOString(),
    page: { id: PAGE_ID, name: page.name, followers: page.fan_count },
    period_28d: { reach, impressions },
    engagement_30d: { total: totalEng, avg_per_post: avgEngPerPost, posts: allPosts.length, eng_rate: engRate },
    top_posts: postStats,
  };

  const outFile = path.join(outDir, `${month}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\n✅ บันทึก ${outFile}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
