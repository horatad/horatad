// Horatad Julian Worker — CF D1 query endpoint
// GET /julian?jd=730428           → { jd, planets, persons[] }
// GET /julian?jd=730428,730429    → [{ jd, planets, persons[] }, ...]
// GET /julian?jd=730428&table=master   → planets only
// GET /julian?jd=730428&table=internet → persons[] only

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'GET') return err(405, 'Method not allowed');

    const url = new URL(request.url);
    const jdParam = url.searchParams.get('jd');
    const table = url.searchParams.get('table'); // 'master' | 'internet' | null (both)

    if (!jdParam) return err(400, 'jd required');

    const jds = jdParam.split(',').map(Number).filter(n => Number.isInteger(n) && n > 0);
    if (!jds.length) return err(400, 'invalid jd');
    if (jds.length > 500) return err(400, 'max 500 jd per request');

    const ph = jds.map(() => '?').join(',');

    try {
      let planets = null, persons = null;

      if (table !== 'internet') {
        const r = await env.DB.prepare(
          `SELECT jd,su,mo,ma,me,ju,ve,sa,ra,ke,mr FROM master_key WHERE jd IN (${ph})`
        ).bind(...jds).all();
        planets = Object.fromEntries(r.results.map(row => {
          const { jd, ...p } = row;
          return [jd, p];
        }));
      }

      if (table !== 'master') {
        const r = await env.DB.prepare(
          `SELECT * FROM internet WHERE jd IN (${ph}) ORDER BY confidence DESC`
        ).bind(...jds).all();
        persons = {};
        r.results.forEach(row => {
          if (row.relate_id) row.relate_id = JSON.parse(row.relate_id);
          if (!persons[row.jd]) persons[row.jd] = [];
          persons[row.jd].push(row);
        });
      }

      const data = jds.map(jd => ({
        jd,
        ...(planets !== null ? { planets: planets[jd] ?? null } : {}),
        ...(persons !== null ? { persons: persons[jd] ?? [] } : {}),
      }));

      const body = jds.length === 1 ? data[0] : data;
      return new Response(JSON.stringify(body), { headers: CORS });

    } catch (e) {
      return err(500, e.message);
    }
  }
};

function err(status, message) {
  return new Response(JSON.stringify({ error: message }), { status, headers: CORS });
}
