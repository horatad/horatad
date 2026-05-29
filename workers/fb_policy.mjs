/**
 * fb_policy.mjs — FB Content Policy Gate (shared)
 * ใช้ร่วมกันโดย content_curator.mjs (เติมคิว) + content_requeue.mjs (rebuild คิว)
 *
 * กฎทั้งหมด (เรียงเสี่ยงสูง→ต่ำ) — fbPolicyViolations() คืน array ของ violation (ว่าง = ผ่าน)
 * ปรัชญา: ตรวจที่ทุกจุดที่ item เข้าคิว — ไม่ให้ content เสีย auto-post โดยไม่มีคนเห็น
 */

const DISCLAIMER_REQUIRED_CATS = new Set(['finding', 'case_study']);

// กฎ 1: Engagement bait — FB shadowban ทันที
const FB_BAIT = [
  /tag\s*เพื่อน/i, /แท็ก\s*เพื่อน/, /share\s*เพื่อโชค/i, /แชร์\s*เพื่อโชค/,
  /like\s*ถ้า/i, /กด\s*ไลค์\s*ถ้า/, /คอมเมนต์\s*เพื่อรับ/,
];
function baitFound(item) {
  const body = (item.body || '') + ' ' + (item.title || '');
  return FB_BAIT.filter(re => re.test(body)).map(re => re.source);
}

// กฎ 2: Disclaimer บังคับเฉพาะ finding/case_study (prediction content)
const DISCLAIMER_PATTERNS = [
  /สถิติประชากร\s*[≠!=]\s*ชะตากรรมบุคคล/,
  /เพื่อการศึกษา/i, /เพื่อการวิจัย/i, /ไม่ใช่คำทำนาย/i,
  /for\s*research/i, /for\s*educational/i,
];
function hasDisclaimer(item) {
  if (!DISCLAIMER_REQUIRED_CATS.has(item.category)) return true;
  const body = (item.body || '') + ' ' + (item.disclaimer || '');
  return DISCLAIMER_PATTERNS.some(re => re.test(body));
}

// กฎ 3: Accuracy claim ต้องมี n= — เฉพาะ finding/case_study
const ACCURACY_CLAIM = /(\d+\s*%|ร้อยละ\s*\d+|แม่นยำ|percent)/i;
const N_PRESENT      = /n\s*=\s*\d+|\d[\d,]+\s*(คน|ราย|records?)/i;
function accuracyWithoutN(item) {
  if (!DISCLAIMER_REQUIRED_CATS.has(item.category)) return false;
  const body = item.body || '';
  return ACCURACY_CLAIM.test(body) && !N_PRESENT.test(body);
}

// กฎ 4: Format variation — ไม่โพสต์ category เดิมเกิน 3 วันติด (spam signal)
function formatRepeat(item, recentPosts) {
  const sameCat = recentPosts.slice(0, 3).filter(p => p.category === item.category).length;
  return sameCat >= 3;
}

// กฎ 5: Prediction framing — ใช้ "พบว่า/แนวโน้ม" ไม่ใช่ "ทำนาย/ดวงบอกว่า" (finding/case_study)
const PREDICTION_FRAMING = [
  /ดวงบอกว่า/i, /ทำนายว่า/i, /ดวงชะตาจะ/i, /โชคชะตา(บอก|ชี้|กำหนด)/i,
];
function hasPredictionFraming(item) {
  if (!DISCLAIMER_REQUIRED_CATS.has(item.category)) return false;
  const body = (item.body || '') + ' ' + (item.title || '');
  return PREDICTION_FRAMING.some(re => re.test(body));
}

// กฎ 6: Dead/unavailable content — YouTube video ที่ถูกลบ/ใช้ไม่ได้ ห้าม auto-post (ลิงก์เสีย)
const DEAD_CONTENT = [
  /deleted\s*video/i, /video\s*is\s*unavailable/i, /\bunavailable\b/i,
  /private\s*video/i, /this\s*video\s*is\s*no\s*longer/i,
  /วิดีโอ.*(ถูกลบ|ไม่พร้อมใช้งาน|ไม่สามารถ)/,
];
function isDeadContent(item) {
  const body = (item.body || '') + ' ' + (item.title || '');
  return DEAD_CONTENT.some(re => re.test(body));
}

// รวม gate — คืน array ของ violations (ว่าง = ผ่าน)
export function fbPolicyViolations(item, recentPosts = []) {
  const v = [];
  if (isDeadContent(item))               v.push('content เสีย (video ถูกลบ/ใช้ไม่ได้)');
  const bait = baitFound(item);
  if (bait.length > 0)                   v.push(`engagement-bait: ${bait.join(', ')}`);
  if (!hasDisclaimer(item))              v.push('ไม่มี disclaimer (finding/case_study ต้องมี)');
  if (accuracyWithoutN(item))            v.push('มี accuracy claim แต่ไม่มี n=');
  if (formatRepeat(item, recentPosts))   v.push('category ซ้ำ 3 วันติด');
  if (hasPredictionFraming(item))        v.push('prediction framing — ใช้ "พบว่า/แนวโน้ม" แทน');
  return v;
}
