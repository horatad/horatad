/**
 * content_requeue.mjs
 * Rebuild คิว content/scheduled/ ใหม่ — series ไม่เกิน 2 ใน 7 โพสต์ ที่เหลือเป็น EP standalone
 *
 * ปัญหาเดิม: round-robin ทุกกลุ่มเท่ากัน (J,T,E ซ้ำ) → series ~67% (4-5/สัปดาห์ ถี่ไป)
 *           + EP standalone ใน inbox ไม่เคยถูกดึงมาเติมคิว
 * วิธีใหม่: greedy ratio cap — series ใส่ได้ก็ต่อเมื่อ (series/รวม) ยังไม่เกิน 2/7
 *          → series ตกตำแหน่ง 4 และ 7 ของทุกสัปดาห์พอดี · ที่เหลือดึง EP จาก inbox
 *          · ส่วนที่เกิน queue horizon เก็บเป็น backlog ใน inbox (ไม่หาย)
 *
 * รัน: node workers/content_requeue.mjs              (rebuild — schedule 14 วันถัดไป)
 *      node workers/content_requeue.mjs --days=21    (schedule 3 สัปดาห์)
 *      node workers/content_requeue.mjs --dry-run    (แสดงลำดับ ไม่เขียนไฟล์)
 *
 * SAFE: ย้ายไฟล์ที่ผ่าน policy gate แล้วเท่านั้น (ไม่สร้าง caption ใหม่)
 *       series ที่ไม่ได้ลงคิวรอบนี้ → ย้ายกลับ inbox เป็น backlog (รอบหน้า requeue หยิบต่อ)
 */

import fs from 'fs';
import path from 'path';

const INBOX     = 'content/inbox';
const SCHEDULED = 'content/scheduled';
const DRY_RUN   = process.argv.includes('--dry-run');

// --- กลยุทธ์สัดส่วน: series ≤ 2 ใน 7 โพสต์ (≈29%) ที่เหลือ EP standalone ---
const SERIES_PER_WEEK = 2;
const WEEK_POSTS      = 7;
const SERIES_RATIO    = SERIES_PER_WEEK / WEEK_POSTS;   // ~0.286
// queue horizon: จำนวนโพสต์ที่จะ schedule (1 โพสต์/วัน) · ที่เหลือ = backlog ใน inbox
const daysArg    = process.argv.find(a => a.startsWith('--days='));
const QUEUE_DAYS = daysArg ? Math.max(1, parseInt(daysArg.split('=')[1]) || 14) : 14;

// เลข episode จาก title (EP01, EP 48 …) — ใช้เรียงภายในกลุ่ม EP
function epNum(item) {
  const m = (item.title || '').match(/EP\s*0*(\d+)/i);
  return m ? parseInt(m[1]) : Infinity;
}

// ตัด "EP\d+ " ออกจาก body (FB caption) — คนใหม่ไม่รู้สึกตกขบวน series
// เก็บเลขไว้ใน meta.episode สำหรับเรียงลำดับ · title คงเดิม (label ใน helper)
// idempotent: รันซ้ำไม่พัง (body ที่ strip แล้วไม่ match regex)
function stripEpForFB(item) {
  const ep = epNum(item);
  if (ep === Infinity) return item;          // ไม่ใช่โพสต์ EP
  item.meta = item.meta || {};
  item.meta.episode = ep;
  if (item.body) item.body = item.body.replace(/^EP\s*0*\d+\s+/i, '');
  return item;
}

// item เป็น series content ไหม (julian_research / tals_comparison ฯลฯ) — ตัวที่ต้อง cap
function isSeries(item) { return !!item.meta?.series; }

// ลำดับภายในกลุ่ม: series_part > epNum > date_added
function inGroupOrder(item) {
  if (item.meta?.series_part != null) return item.meta.series_part;
  const ep = epNum(item);
  if (ep !== Infinity) return ep;
  return 9999;
}

// สร้างลำดับ series เดียวจากหลายกลุ่ม — round-robin สลับกลุ่ม, ภายในกลุ่มเรียงตาม series_part
function buildSeriesSequence(items) {
  const groups = {};
  for (const it of items) (groups[it.meta.series] ||= []).push(it);
  for (const k of Object.keys(groups)) groups[k].sort((a, b) => inGroupOrder(a) - inGroupOrder(b));
  const keys = Object.keys(groups).sort();   // ลำดับกลุ่มคงที่ (deterministic)
  const seq = [];
  for (let r = 0; ; r++) {
    let any = false;
    for (const k of keys) if (groups[k][r]) { seq.push(groups[k][r]); any = true; }
    if (!any) break;
  }
  return seq;
}

function loadDir(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { _file: f, _dir: dir, ...data };
    });
}

function main() {
  // 1. รวม pool: scheduled ทั้งหมด + inbox ทั้งหมด (series + EP standalone)
  //    (เดิมดึงเฉพาะ research จาก inbox → EP standalone ค้าง inbox ตลอด)
  const scheduled = loadDir(SCHEDULED);
  const inboxAll  = loadDir(INBOX);
  const pool = [...scheduled, ...inboxAll];
  if (pool.length === 0) {
    console.log('ไม่มี item ให้ requeue');
    return;
  }

  // 2. แยก series (ต้อง cap) ออกจาก fill (EP standalone + อื่นๆ)
  const seriesSeq = buildSeriesSequence(pool.filter(isSeries));
  const fillSeq   = pool.filter(it => !isSeries(it))
                        .sort((a, b) => inGroupOrder(a) - inGroupOrder(b));

  // 3. greedy ratio cap: ใส่ series ได้ก็ต่อเมื่อสัดส่วนยังไม่เกิน SERIES_RATIO (2/7)
  //    → series ตกตำแหน่ง 4 และ 7 ของทุกสัปดาห์ · ที่เหลือเป็น EP · ถึง QUEUE_DAYS แล้วหยุด
  const ordered = [];
  let si = 0, fi = 0;
  while (ordered.length < QUEUE_DAYS && (si < seriesSeq.length || fi < fillSeq.length)) {
    const canSeries = si < seriesSeq.length
                   && (si + 1) / (ordered.length + 1) <= SERIES_RATIO;
    if (canSeries)              ordered.push(seriesSeq[si++]);
    else if (fi < fillSeq.length) ordered.push(fillSeq[fi++]);
    else break;   // EP หมด + ratio ไม่ให้ใส่ series → series ที่เหลือ = backlog
  }

  // backlog = ทุกอย่างใน pool ที่ไม่ได้ลงคิวรอบนี้
  const inQueue = new Set(ordered);
  const backlog = pool.filter(it => !inQueue.has(it));

  // 4. transform FB caption (ตัด EP number) + แสดงแผน
  ordered.forEach(stripEpForFB);
  const sCount = ordered.filter(isSeries).length;
  const pct = ordered.length ? Math.round(sCount / ordered.length * 100) : 0;
  console.log(`\n=== Requeue Plan: ${ordered.length} โพสต์ · series ${sCount} (${pct}%, เป้า ≤${Math.round(SERIES_RATIO*100)}%) ===`);
  ordered.forEach((item, i) => {
    const tag = isSeries(item) ? item.meta.series : 'ep_youtube';
    const wk  = Math.floor(i / WEEK_POSTS) + 1;
    const mark = isSeries(item) ? 'S' : '·';
    console.log(`${String(i+1).padStart(2)} w${wk} [${mark}] [${tag}] ${(item.title || '').slice(0, 48)}`);
  });
  const blSeries = backlog.filter(isSeries).length;
  console.log(`Backlog: ${backlog.length} (series ${blSeries} + fill ${backlog.length - blSeries}) — เก็บใน inbox`);

  if (DRY_RUN) {
    console.log('\n(dry-run — ไม่เขียนไฟล์)');
    return;
  }

  // 5. เขียนคิวใหม่: ลบ scheduled เดิมทั้งหมด → เขียน ordered + reassign scheduled_at
  for (const f of fs.readdirSync(SCHEDULED).filter(f => f.endsWith('.json'))) {
    fs.unlinkSync(path.join(SCHEDULED, f));
  }

  const baseTs = Date.now();
  const today  = new Date().toISOString().slice(0, 10);
  ordered.forEach((item, i) => {
    const origFile = item._file;
    const origDir  = item._dir;
    delete item._file;
    delete item._dir;
    item.status = 'scheduled';
    item.scheduled_at = new Date(baseTs + i).toISOString();

    // ชื่อไฟล์ในคิว: จาก scheduled คงชื่อเดิม · จาก inbox ใส่ date prefix
    // (กัน date ซ้ำถ้า inbox file ขึ้นต้นด้วย YYYY-MM-DD_ อยู่แล้ว)
    const hasDatePrefix = /^\d{4}-\d{2}-\d{2}_/.test(origFile);
    const queueName = (origDir === SCHEDULED || hasDatePrefix)
      ? origFile : `${today}_${origFile}`;
    fs.writeFileSync(path.join(SCHEDULED, queueName), JSON.stringify(item, null, 2));

    if (origDir === INBOX) fs.unlinkSync(path.join(INBOX, origFile));
  });

  // 6. backlog ที่มาจาก scheduled ต้องย้ายกลับ inbox (ไม่งั้นหายตอนลบ scheduled)
  //    backlog ที่อยู่ inbox อยู่แล้ว → คงไว้ตามเดิม
  let movedToInbox = 0;
  for (const item of backlog) {
    if (item._dir !== SCHEDULED) continue;
    const origFile = item._file;
    delete item._file;
    delete item._dir;
    item.status = 'inbox';
    delete item.scheduled_at;
    const dest = path.join(INBOX, origFile);
    if (!fs.existsSync(dest)) {
      fs.writeFileSync(dest, JSON.stringify(item, null, 2));
      movedToInbox++;
    }
  }

  console.log(`\n✅ คิวใหม่ ${ordered.length} โพสต์ใน content/scheduled/`);
  if (movedToInbox) console.log(`   ↩ series เกิน cap ย้ายกลับ inbox (backlog): ${movedToInbox}`);
  console.log(`   inbox เหลือ: ${fs.readdirSync(INBOX).filter(f => f.endsWith('.json')).length} items`);
}

main();
