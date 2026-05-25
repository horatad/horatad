// Version 3.3.14 | 2026-05-22
// v3/tts.js — Text-to-Speech via Web Speech API (mobile-first)
// Project: NOK (Voice Narration) — Phase 1 MVP
// ใช้ browser SpeechSynthesis (ฟรี, offline, ไม่มี API key)
// iOS Safari: ต้อง trigger ใน user gesture | Android Chrome: ใช้ Google TH

const _state = { speaking: false, utterance: null };

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
  if (isSupported()) {
    try { window.speechSynthesis.cancel(); } catch (_) {}
  }
}

// speak(text, { onState, rate })
//   onState(event, detail?) — 'start' | 'end' | 'error'
export function speak(text, opts = {}) {
  const onState = opts.onState || (() => {});
  const rate = opts.rate || 1.0;

  if (!isSupported()) { onState('error', 'not-supported'); return false; }
  const clean = _stripForTTS(text);
  if (!clean) { onState('error', 'empty'); return false; }
  const voice = _getThaiVoice();
  if (!voice) { onState('error', 'no-thai-voice'); return false; }

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
