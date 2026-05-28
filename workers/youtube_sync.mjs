/**
 * youtube_sync.mjs
 * ดึง video ใหม่จาก YouTube playlist → สร้าง draft ใน content/inbox/
 *
 * รัน: node workers/youtube_sync.mjs
 * ใช้ใน GitHub Action: youtube_sync.yml
 *
 * env: YOUTUBE_API_KEY, YOUTUBE_PLAYLIST_ID
 */

import fs from 'fs';
import path from 'path';

const API_KEY      = process.env.YOUTUBE_API_KEY;
const PLAYLIST_ID  = process.env.YOUTUBE_PLAYLIST_ID;
const INBOX        = 'content/inbox';
const SEEN_FILE    = 'content/.youtube_seen.json';

if (!API_KEY || !PLAYLIST_ID) {
  console.error('ต้องการ YOUTUBE_API_KEY และ YOUTUBE_PLAYLIST_ID');
  process.exit(1);
}

// โหลด video IDs ที่เคย sync แล้ว
function loadSeen() {
  if (fs.existsSync(SEEN_FILE)) {
    return new Set(JSON.parse(fs.readFileSync(SEEN_FILE, 'utf8')));
  }
  return new Set();
}

function saveSeen(seen) {
  fs.writeFileSync(SEEN_FILE, JSON.stringify([...seen], null, 2));
}

// ดึง playlist items จาก YouTube API
async function fetchPlaylistItems(pageToken = null) {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    playlistId: PLAYLIST_ID,
    maxResults: '50',
    key: API_KEY,
  });
  if (pageToken) params.set('pageToken', pageToken);

  const url = `https://www.googleapis.com/youtube/v3/playlistItems?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`YouTube API error: ${res.status} ${err}`);
  }
  return res.json();
}

// ดึงทุกหน้า
async function fetchAllItems() {
  const items = [];
  let pageToken = null;
  do {
    const data = await fetchPlaylistItems(pageToken);
    items.push(...(data.items || []));
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return items;
}

// ดึง video details (duration, tags) — batch 50 ต่อครั้ง (YouTube API limit)
async function fetchVideoDetails(videoIds) {
  const results = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const params = new URLSearchParams({
      part: 'contentDetails,snippet,statistics',
      id: batch.join(','),
      key: API_KEY,
    });
    const url = `https://www.googleapis.com/youtube/v3/videos?${params}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube video details error: ${res.status}`);
    const data = await res.json();
    for (const v of (data.items || [])) results[v.id] = v;
  }
  return results;
}

// แปลง ISO 8601 duration → นาที
function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 60) + parseInt(m[2] || 0) + Math.round(parseInt(m[3] || 0) / 60);
}

// สร้าง FB post draft
function buildDraft(item, details) {
  const snippet = item.snippet;
  const videoId = item.contentDetails?.videoId || snippet.resourceId?.videoId;
  const detail  = details[videoId] || {};
  const dSnippet = detail.snippet || {};
  const duration = parseDuration(detail.contentDetails?.duration || 'PT0S');

  const title       = snippet.title;
  const description = (dSnippet.description || snippet.description || '').slice(0, 500);
  const tags        = (dSnippet.tags || []).slice(0, 10);
  const publishedAt = snippet.publishedAt;
  const youtubeUrl  = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnail   = snippet.thumbnails?.maxres?.url
                   || snippet.thumbnails?.high?.url
                   || snippet.thumbnails?.default?.url || '';

  // ร่าง caption สำหรับ FB
  const caption = buildCaption(title, description, youtubeUrl, duration);

  return {
    title,
    body: caption,
    category: 'education',
    source: 'youtube',
    tags: ['โหราศาสตร์ไทย', 'TALS', ...tags].slice(0, 10),
    date_added: new Date().toISOString().slice(0, 10),
    priority_score: 7,
    status: 'inbox',
    meta: {
      youtube_video_id: videoId,
      youtube_url: youtubeUrl,
      youtube_thumbnail: thumbnail,
      youtube_published_at: publishedAt,
      duration_minutes: duration,
    }
  };
}

function buildCaption(title, description, url, duration) {
  // ดึงประโยคแรกที่มีความหมาย
  const firstLine = description.split('\n').find(l => l.trim().length > 20) || '';
  const durationText = duration > 0 ? `(${duration} นาที)` : '';

  return `${title} ${durationText}

${firstLine}

▶️ ดูวิดีโอเต็ม: ${url}

#โหราศาสตร์ไทย #TALS #โหราทาส #HoratadAI`;
}

// --- main ---
async function main() {
  console.log(`ดึง playlist: ${PLAYLIST_ID}`);
  const seen = loadSeen();

  const items = await fetchAllItems();
  console.log(`พบ ${items.length} videos ใน playlist`);

  // กรองเฉพาะ video ใหม่
  const newItems = items.filter(item => {
    const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
    return videoId && !seen.has(videoId);
  });

  if (newItems.length === 0) {
    console.log('ไม่มี video ใหม่');
    return;
  }

  console.log(`video ใหม่: ${newItems.length} รายการ`);

  // ดึง details แบบ batch (50 ต่อครั้ง)
  const videoIds = newItems.map(i => i.contentDetails?.videoId || i.snippet?.resourceId?.videoId);
  const details  = await fetchVideoDetails(videoIds);

  let pushed = 0;
  for (const item of newItems) {
    const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
    const draft   = buildDraft(item, details);
    const filename = path.join(INBOX, `${Date.now()}_yt_${videoId}.json`);
    fs.writeFileSync(filename, JSON.stringify(draft, null, 2));
    seen.add(videoId);
    pushed++;
    console.log(`✅ ${draft.title}`);
  }

  saveSeen(seen);
  console.log(`\nบันทึก ${pushed} drafts → content/inbox/`);
}

main().catch(e => { console.error(e); process.exit(1); });
