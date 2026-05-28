// Version 3.3.15 | 2026-05-28
// v3/tts.js — Text-to-Speech via Web Speech API (mobile-first)
// Project: NOK (Voice Narration) — Phase 1 MVP
// ใช้ browser SpeechSynthesis (ฟรี, offline, ไม่มี API key)
// iOS Safari: ต้อง trigger ใน user gesture | Android Chrome: ใช้ Google TH
// Cloud TTS fallback: Windows Chrome/Opera (ไม่มี Thai SAPI voice)

const _state = { speaking: false, utterance: null, cloudAudio: null };

// ── Cloud TTS config ──────────────────────────────────────────
const _CLOUD_TTS_URL = 'https://horatad-ai.uchujaro5.workers.dev/tts';

// ── Strip markdown/emoji/bullets ก่อนพูด ─────────────────────
// TTS อ่าน emoji เป็นชื่อภาษาอังกฤษ ("white check mark") → ต้องลบทิ้ง
function _stripForTTS(text) {
  if (!text) return '';
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^\s*[•\-]\s*/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/^[ \t]+/gm, '') // lstrip per-line (จัด leading space หลัง strip emoji)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function _getThaiVoice() {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => v.lang === 'th-TH')
      || voices.find(v => v.lang && v.lang.toLowerCase().startsWith('th'))
      || voices.find(v => /thai|kanya|niwat/i.test(v.name))
      || null;
}

// iOS Safari bug: utterance ยาวเกินจะ pause ที่ ~15 วินาที → แบ่งเป็น chunk
function _splitChunks(text, maxLen = 180) {
  if (text.length <= maxLen) return [text];
  const out = [];
  const parts = text.split(/(\n+|(?<=[.!?ฯ])\s+)/);
  let cur = '';
  for (const p of parts) {
    if ((cur + p).length > maxLen && cur) { out.push(cur); cur = p; }
    else cur += p;
  }
  if (cur) out.push(cur);
  // Hard-split fallback: ถ้ายังมี chunk ใหญ่เกิน (ภาษาไทยอาจไม่มี boundary . ! ? ฯ)
  // ตัดที่ใกล้ space ก่อน, ถ้าไม่มี space เลย ตัดตรง char boundary
  const final = [];
  for (const c of out) {
    if (c.length <= maxLen) { final.push(c); continue; }
    let rest = c;
    while (rest.length > maxLen) {
      let cut = rest.lastIndexOf(' ', maxLen);
      if (cut < maxLen / 2) cut = maxLen; // ไม่มี space → ตัด char
      final.push(rest.slice(0, cut));
      rest = rest.slice(cut).trimStart();
    }
    if (rest) final.push(rest);
  }
  return final;
}

export function isSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
      && typeof window.SpeechSynthesisUtterance === 'function';
}

export function hasThaiVoice() {
  return isSupported() && !!_getThaiVoice();
}

export function isSpeaking() {
  return _state.speaking;
}

export function stop() {
  _state.speaking = false;
  _state.utterance = null;
  if (_state.cloudAudio) {
    _state.cloudAudio.pause();
    _state.cloudAudio.src = '';
    _state.cloudAudio = null;
  }
  if (isSupported()) {
    try { window.speechSynthesis.cancel(); } catch (_) {}
  }
}

// Cloud TTS via CF Worker (fallback สำหรับ Windows Chrome/Opera)
// Returns Promise<boolean> — แต่ caller ไม่ต้อง await
async function _cloudSpeak(text, opts = {}) {
  const onState = opts.onState || (() => {});
  const clean = _stripForTTS(text);
  if (!clean) { onState('error', 'empty'); return false; }

  try {
    const resp = await fetch(_CLOUD_TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clean }),
      signal: AbortSignal.timeout ? AbortSignal.timeout(15000) : undefined,
    });
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => null);
      console.warn('[TTS] error', resp.status, errBody?.detail || errBody?.error || '');
      throw new Error('HTTP ' + resp.status);
    }
    const { audioContent, error } = await resp.json();
    if (error || !audioContent) throw new Error(error || 'no audio');

    const audio = new Audio('data:audio/mp3;base64,' + audioContent);
    if (opts.rate) audio.playbackRate = Math.min(Math.max(opts.rate, 0.5), 2.0);
    _state.cloudAudio = audio;
    _state.speaking = true;
    onState('start');
    audio.onended = () => { _state.speaking = false; _state.cloudAudio = null; onState('end'); };
    audio.onerror = () => { _state.speaking = false; _state.cloudAudio = null; onState('error', 'cloud-audio'); };
    await audio.play();
    return true;
  } catch (_err) {
    _state.speaking = false;
    onState('error', 'no-thai-voice'); // trigger TTS guide ถ้า cloud ก็ fail
    return false;
  }
}

export function canSpeak() {
  return hasThaiVoice() || true; // true เพราะ cloud fallback พยายามเสมอ
}

// speak(text, { onState, rate })
//   onState(event, detail?) — 'start' | 'end' | 'error'
//   ถ้าไม่มี Thai voice (เช่น Windows Chrome) → auto-fallback ไป Cloud TTS
export function speak(text, opts = {}) {
  const onState = opts.onState || (() => {});
  const rate = opts.rate || 1.0;

  if (!isSupported()) { onState('error', 'not-supported'); return false; }
  const clean = _stripForTTS(text);
  if (!clean) { onState('error', 'empty'); return false; }
  const voice = _getThaiVoice();
  if (!voice) {
    // Cloud TTS fallback — async, fire-and-forget, callbacks ยิงตาม lifecycle
    _cloudSpeak(text, opts);
    return true; // "attempt started"
  }

  stop();

  const chunks = _splitChunks(clean);
  let idx = 0;
  _state.speaking = true;
  onState('start');

  const playNext = () => {
    if (!_state.speaking || idx >= chunks.length) {
      if (_state.speaking) { _state.speaking = false; onState('end'); }
      _state.utterance = null;
      return;
    }
    const u = new SpeechSynthesisUtterance(chunks[idx++]);
    u.voice = voice;
    u.lang = voice.lang || 'th-TH';
    u.rate = rate;
    u.pitch = 1.0;
    u.volume = 1.0;
    u.onend = playNext;
    u.onerror = (e) => {
      // 'canceled'/'interrupted' = normal stop, ไม่ใช่ error
      const err = e && e.error;
      if (err === 'canceled' || err === 'interrupted') {
        _state.speaking = false;
        _state.utterance = null;
        return;
      }
      _state.speaking = false;
      _state.utterance = null;
      onState('error', err || 'unknown');
    };
    _state.utterance = u;
    window.speechSynthesis.speak(u);
  };
  playNext();
  return true;
}

// Pre-warm voice list — iOS Safari load voices async
// onReady() fires when voice list is populated (may be immediate or async)
export function preload(onReady) {
  if (!isSupported()) return;
  try {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      onReady?.();
    } else if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => onReady?.();
    }
  } catch (_) {}
}
