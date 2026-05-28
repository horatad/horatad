// horatad-ai Cloudflare Worker
// Deploy: wrangler deploy workers/horatad_ai_worker.js --name horatad-ai
//
// Environment variables (wrangler secret put / Cloudflare dashboard):
//   TYPHOON_SERVER_KEY  — Typhoon API key (existing)
//   GOOGLE_TTS_KEY      — Google Cloud TTS API key (ใหม่ — ต้องเปิดใช้ Cloud TTS API)
//
// Routes:
//   POST /      → Typhoon chat proxy (existing behavior)
//   POST /tts   → Google Cloud TTS proxy (ใหม่)
//   OPTIONS *   → CORS preflight

const TYPHOON_API = 'https://api.opentyphoon.ai/v1/chat/completions';
const GOOGLE_TTS_API = 'https://texttospeech.googleapis.com/v1/text:synthesize';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function corsResp(body, status = 200, extra = {}) {
  return new Response(body, {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json', ...extra },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }
    const url = new URL(request.url);
    if (url.pathname === '/tts') return handleTTS(request, env);
    return handleTyphoon(request, env);
  },
};

// ── Typhoon proxy (existing) ───────────────────────────────────
async function handleTyphoon(request, env) {
  let body;
  try { body = await request.text(); } catch (_) { return corsResp('{"error":"bad request"}', 400); }

  const resp = await fetch(TYPHOON_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.TYPHOON_SERVER_KEY}`,
    },
    body,
  });
  const data = await resp.text();
  return corsResp(data, resp.status);
}

// ── Google Cloud TTS proxy ─────────────────────────────────────
// POST /tts  body: { text: string, voice?: string, rate?: number }
// response:  { audioContent: base64_mp3 }
//
// Google TTS voice options for Thai:
//   Standard (offline): th-TH-Standard-A (female) / th-TH-Standard-B (male)
//   Neural2 (current):  th-TH-Neural2-C (female) — WaveNet deprecated 2025
//   Chirp3-HD:          th-TH-Chirp3-HD-Aoede (best, needs newer API)
async function handleTTS(request, env) {
  if (!env.GOOGLE_TTS_KEY) {
    return corsResp('{"error":"TTS not configured — add GOOGLE_TTS_KEY"}', 503);
  }

  let body;
  try { body = await request.json(); } catch (_) {
    return corsResp('{"error":"invalid JSON"}', 400);
  }
  const { text, voice = 'th-TH-Neural2-C', rate = 1.0 } = body;
  if (!text || typeof text !== 'string') {
    return corsResp('{"error":"text required"}', 400);
  }

  const payload = {
    input: { text: text.slice(0, 5000) },
    voice: { languageCode: 'th-TH', name: voice },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: Math.min(Math.max(Number(rate) || 1.0, 0.5), 2.0),
    },
  };

  const resp = await fetch(`${GOOGLE_TTS_API}?key=${env.GOOGLE_TTS_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => '');
    return corsResp(JSON.stringify({ error: 'Google TTS error', detail: err }), resp.status);
  }

  const data = await resp.json();
  return corsResp(JSON.stringify({ audioContent: data.audioContent }));
}
