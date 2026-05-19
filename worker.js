// horatad-ai — Cloudflare Worker
// Typhoon API proxy + cron keep-warm

const TYPHOON_API = 'https://api.opentyphoon.ai/v1/chat/completions';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method === 'GET') {
      return new Response('ok', { status: 200, headers: CORS });
    }

    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: CORS });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Bad Request', { status: 400, headers: CORS });
    }

    const upstream = await fetch(TYPHOON_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.TYPHOON_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.text();
    return new Response(data, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  },

  // cron: */5 * * * * — ping self to keep isolate warm
  async scheduled(event, env, ctx) {
    const self = env.WORKER_SELF_URL ?? 'https://horatad-ai.uchujaro5.workers.dev';
    ctx.waitUntil(fetch(self, { method: 'GET' }).catch(() => {}));
  },
};
