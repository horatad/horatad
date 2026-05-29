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

async function get(endpoint) {
  const url = `https://graph.facebook.com/v19.0/${endpoint}`;
  const res  = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(`FB API error: ${data.error.message} (code ${data.error.code})`);
  return data;
}

async function main() {
  console.log('📊 ดึง FB KPI...\n');

  // 1. Page info + fan count
  const page = await get(`${PAGE_ID}?fields=name,fan_count&access_token=${TOKEN}`);
  console.log(`Page: ${page.name} · Followers: ${page.fan_count.toLocaleString()}`);

  // 2. Page insights (28 วันล่าสุด)
  const since = Math.floor(Date.now() / 1000) - 28 * 86400;
  const until = Math.floor(Date.now() / 1000);
  const metrics = [
    'page_impressions_unique',      // reach
    'page_post_engagements',        // engagement
    'page_impressions',             // total impressions
  ].join(',');

  const insights = await get(
    `${PAGE_ID}/insights?metric=${metrics}&since=${since}&until=${until}&period=period&access_token=${TOKEN}`
  );

  const kv = {};
  for (const m of insights.data || []) {
    const val = m.values?.[0]?.value ?? m.values?.[1]?.value ?? 0;
    kv[m.name] = val;
  }

  const reach      = kv['page_impressions_unique'] || 0;
  const engagement = kv['page_post_engagements']   || 0;
  const impressions = kv['page_impressions']        || 0;
  const engRate    = reach > 0 ? ((engagement / reach) * 100).toFixed(2) : '0.00';

  console.log(`Reach (28d unique): ${reach.toLocaleString()}`);
  console.log(`Engagement (28d):   ${engagement.toLocaleString()}`);
  console.log(`Engagement rate:    ${engRate}%`);
  console.log(`Impressions (28d):  ${impressions.toLocaleString()}`);

  // 3. Top 5 posts (30 วัน) — reach + engagement
  const since30 = Math.floor(Date.now() / 1000) - 30 * 86400;
  const posts = await get(
    `${PAGE_ID}/posts?fields=message,created_time,insights.metric(post_impressions_unique,post_engagements)&since=${since30}&limit=25&access_token=${TOKEN}`
  );

  const postStats = (posts.data || []).map(p => {
    const ins = p.insights?.data || [];
    const postReach = ins.find(i => i.name === 'post_impressions_unique')?.values?.[0]?.value || 0;
    const postEng   = ins.find(i => i.name === 'post_engagements')?.values?.[0]?.value || 0;
    return {
      id:         p.id,
      created:    p.created_time?.slice(0, 10),
      message:    (p.message || '').slice(0, 60),
      reach:      postReach,
      engagement: postEng,
      eng_rate:   postReach > 0 ? +((postEng / postReach) * 100).toFixed(2) : 0,
    };
  }).sort((a, b) => b.reach - a.reach).slice(0, 5);

  console.log('\nTop 5 posts (reach):');
  postStats.forEach((p, i) =>
    console.log(`  ${i+1}. [${p.created}] reach=${p.reach} eng=${p.engagement} (${p.eng_rate}%) — ${p.message}`)
  );

  // 4. บันทึก JSON
  const month  = new Date().toISOString().slice(0, 7);
  const outDir = 'content/kpi';
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const report = {
    month,
    generated: new Date().toISOString(),
    page: { id: PAGE_ID, name: page.name, followers: page.fan_count },
    period_28d: { reach, engagement, impressions, eng_rate: +engRate },
    top_posts: postStats,
  };

  const outFile = path.join(outDir, `${month}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`\n✅ บันทึก ${outFile}`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
