/**
 * julian_research_gen.mjs
 * สร้าง FB inbox posts ประเภท behind_scenes / education จากงานวิจัย JULIAN
 *
 * รัน: node workers/julian_research_gen.mjs
 *      node workers/julian_research_gen.mjs --dry-run  (แสดง caption ไม่เขียนไฟล์)
 *
 * กฎ JULIAN Research Session (standing rule 2026-05-29):
 *   ทุก session ที่ทำงาน JULIAN research ควรรัน script นี้พร้อม posts ใหม่
 *   เพื่อสร้าง valuable content stream ควบคู่งานวิจัย
 *
 * PATH: ใช้ buildResearchCaption() + checkResearchPolicy() จาก julian_proposal_gen.mjs
 *       ห้ามเขียน inbox JSON โดยตรง — ต้องผ่าน writeResearchPost() เสมอ
 */

import { writeResearchPost, buildResearchCaption } from './julian_proposal_gen.mjs';

const DRY_RUN   = process.argv.includes('--dry-run');
const ONLY      = (() => { const i = process.argv.indexOf('--only'); return i >= 0 ? process.argv[i+1] : null; })();
const DB_SIZE   = 129163;  // อัปเดตทุกครั้งที่รัน script ใหม่
const SOURCE    = 'docs/julian_research_report.pdf';
const SERIES    = 'julian_research_overview';
const TOTAL     = 5;

// ---------------------------------------------------------------------------
// POST DEFINITIONS — แก้ไข body ของแต่ละโพสต์ที่นี่
// ---------------------------------------------------------------------------

const posts = [

  // ─── Post 1: What is JULIAN? ────────────────────────────────────────────
  {
    slug:          '01_what_is_julian',
    title:         'JULIAN Research Series 01 — โหราศาสตร์กับข้อมูลจริง: เราทำอะไรอยู่?',
    category:      'behind_scenes',
    priority_score: 9,
    series: SERIES, series_part: 1, series_total: TOTAL, source_doc: SOURCE,
    tags: ['JULIAN', 'research', 'TALS', 'โหราศาสตร์ไทย', 'โหราทาส'],
    db_size: DB_SIZE,
    body: `โปรเจคนี้ไม่ได้เชื่อ และไม่ได้ปฏิเสธโหราศาสตร์

เราเลือกทางที่สาม — "วัดดู"

— — —

JULIAN คือฐานข้อมูลบุคคลสำคัญทั่วโลก พร้อมวันเกิดและเหตุการณ์ชีวิต ที่เราใช้ทดสอบว่าตำแหน่งดาวในวันเกิดสัมพันธ์กับเหตุการณ์จริงหรือไม่

ข้อมูลดึงจาก Wikidata + MusicBrainz อัตโนมัติทุก 6 ชั่วโมง — ใครก็ตรวจสอบต้นทางได้

— — —

ทำไมต้องเป็น "บุคคลสำคัญ"?

ภูมิปัญญาโหราศาสตร์บอกว่า ดวงชาตาจะเด่นชัดในคนที่ "ไม่ธรรมดา" มากกว่าคนทั่วไป และบุคคลสำคัญมีบันทึกชีวิตที่ตรวจสอบได้ ไม่ใช่ความทรงจำส่วนตัว

— — —

หลักการที่เราไม่ประนีประนอม:
ถ้ามีรูปแบบจริง → จะทนต่อการทดสอบซ้ำ
ถ้าไม่มี → จะเลือนหายไปเอง

เราเปิดเผยทั้งผลที่พบและไม่พบ อย่างซื่อตรง`,
  },

  // ─── Post 2: Accuracy Grade ─────────────────────────────────────────────
  {
    slug:          '02_accuracy_grade',
    title:         'JULIAN Research Series 02 — ทำไมไม่รู้เวลาเกิดยังวิจัยได้?',
    category:      'education',
    priority_score: 9,
    series: SERIES, series_part: 2, series_total: TOTAL, source_doc: SOURCE,
    tags: ['JULIAN', 'research', 'TALS', 'โหราศาสตร์ไทย', 'methodology'],
    db_size: DB_SIZE,
    body: `ทำไมไม่รู้เวลาเกิดยังวิจัยได้?

ใน TALS คุณภาพดาวกำหนดจาก "ราศีที่ดาวสถิต" — ดาวเคลื่อนช้าหลายเดือน รู้แค่วันเกิดก็เพียงพอสำหรับการวิเคราะห์ส่วนใหญ่

— — —

JULIAN จึงให้ Accuracy Grade แบบเกรดโรงเรียน:

🏆 เกรด A — มีสูจิบัตร/เอกสารทางการ (ละเอียดสุด รวมเวลาเกิด)
📋 เกรด B — คำบอกเล่าคนใกล้ชิด (ใช้ได้ดี)
🌐 เกรด C — สาธารณะที่อ้างอิงได้ + มีเวลา (ดูลัคนาได้)
📅 เกรด D — รู้แค่วันที่ ไม่รู้เวลา (ดูตำแหน่งดาวระดับราศีได้)
❓ เกรด F — ไม่ทราบ (ไม่ใช้คำนวณ)

— — —

ฐานข้อมูลปัจจุบันส่วนใหญ่เป็นเกรด D — แต่เพียงพอสำหรับการวิจัยระดับราศีซึ่งเป็นหัวใจของ TALS

เกรดต่างกัน → คำถามวิจัยที่ตอบได้ต่างกัน → ไม่มีข้อมูลที่ "ไม่มีประโยชน์" ในฐานข้อมูลนี้`,
  },

  // ─── Post 3: Genealogy ──────────────────────────────────────────────────
  {
    slug:          '03_genealogy_moat',
    title:         'JULIAN Research Series 03 — เครือญาติในดวงดาว: จุดแข็งที่ลอกได้ยาก',
    category:      'behind_scenes',
    priority_score: 9,
    series: SERIES, series_part: 3, series_total: TOTAL, source_doc: SOURCE,
    tags: ['JULIAN', 'research', 'TALS', 'โหราศาสตร์ไทย', 'genealogy'],
    db_size: DB_SIZE,
    body: `คำถามที่ JULIAN ถามได้แตกต่างจากทุกระบบ:

"คนที่เชื่อมโยงกันในชีวิตจริง มีรูปแบบดาวร่วมกันหรือไม่?"

— — —

เราติดตามสายสัมพันธ์หลายแบบ:

👨‍👩‍👧‍👦 เครือญาติสายเลือด — พ่อ แม่ ลูก คู่สมรส พี่น้อง
🏛️ สายสืบทอดตำแหน่ง — นายกฯ ประธานาธิบดี กษัตริย์ แชมป์โลก
🎓 สายวิชาการ — อาจารย์ → ลูกศิษย์ปริญญาเอก (ย้อนได้หลายชั่วรุ่น)
🥋 สายครู-ศิษย์ — ครูบาอาจารย์ สำนักวิชา ศิลปะการต่อสู้

— — —

ทำไมเรื่องนี้สำคัญ?

ลองนึกถึงราชวงศ์ที่สืบทอดกันหลายชั่วคน — ถ้าเรามีดวงของทั้งสาย เราถามได้ว่า "ตำแหน่งดาวที่บ่งบอกอำนาจ ส่งต่อกันในสายเลือดไหม?"

คำถามแบบนี้ตอบไม่ได้เลยถ้าดูดวงคนทีละคนแยกกัน — ต้องมี "แผนที่ความสัมพันธ์" ก่อน

นี่คือ moat ที่ทำให้ JULIAN ลอกเลียนได้ยาก`,
  },

  // ─── Post 4: Research Integrity ─────────────────────────────────────────
  {
    slug:          '04_research_integrity',
    title:         'JULIAN Research Series 04 — กับดักข้อมูลเยอะ: ทำไมแค่ p-value ไม่พอ',
    category:      'education',
    priority_score: 9,
    series: SERIES, series_part: 4, series_total: TOTAL, source_doc: SOURCE,
    tags: ['JULIAN', 'research', 'TALS', 'โหราศาสตร์ไทย', 'methodology'],
    db_size: DB_SIZE,
    body: `กับดักที่นักวิจัยเจอบ่อยที่สุด:

"ข้อมูลเยอะ แล้วอะไรก็ดูมีนัยสำคัญ"

— — —

ถ้าโยนเหรียญ 100,000 ครั้งแล้วแบ่งเป็นกลุ่มย่อยมากพอ — จะ "เจอ" กลุ่มที่ออกหัวผิดปกติเสมอ ทั้งที่เหรียญยุติธรรม

งานวิจัย JULIAN จึงถามสองชั้นเสมอ:

1️⃣ ชั้น p-value: "รูปแบบนี้บังเอิญได้ง่ายไหม?"
2️⃣ ชั้น Effect Size: "ต่อให้ไม่บังเอิญ มันใหญ่พอจะมีความหมายจริงไหม?"

ผ่านแค่ชั้นเดียวยังไม่พอ

— — —

และถ้าเจอรูปแบบหนึ่ง เราจะนำไปทดสอบกับข้อมูลชุดใหม่ที่กันไว้ไม่เคยแตะระหว่างค้นหา

ถ้ายังอยู่ = น่าจะจริง
ถ้าหาย = เดิมเป็นความบังเอิญ

ความเข้มงวดนี้ทำให้ผลที่เราเผยแพร่มีน้ำหนักจริง — ไม่ใช่แค่ pattern สวยงาม`,
  },

  // ─── Post 5: Two Research Tracks ────────────────────────────────────────
  {
    slug:          '05_two_tracks',
    title:         'JULIAN Research Series 05 — สองเส้นทางวิจัยที่กำลังเดินพร้อมกัน',
    category:      'behind_scenes',
    priority_score: 9,
    series: SERIES, series_part: 5, series_total: TOTAL, source_doc: SOURCE,
    tags: ['JULIAN', 'research', 'TALS', 'โหราศาสตร์ไทย', 'roadmap'],
    db_size: DB_SIZE,
    body: `JULIAN เดินสองเส้นทางวิจัยพร้อมกัน:

🔵 Confirmatory — เอากฎที่ TALS ทำนายไว้ล่วงหน้า ไปทดสอบกับข้อมูลจริง
หลักฐานแบบนี้หนักแน่นกว่า เพราะ "ตั้งคำถามก่อนเห็นคำตอบ"

🟡 Reverse-Engineer — ดูจากเหตุการณ์จริง ย้อนหาความสัมพันธ์กับดาว ค้นหารูปแบบใหม่
เริ่มทำคู่ขนานเพราะการสกัดกฎ TALS ทั้งหมดใช้เวลา

— — —

ทำไมต้องแยกป้ายชัดเจน?

กฎที่ "ขุดเจอหลังเห็นข้อมูล" น่าเชื่อน้อยกว่ากฎที่ "ทำนายไว้ก่อน" มาก เราจึงไม่ปนกัน เพื่อไม่ให้ความน่าเชื่อถือเฟ้อเกินจริง

— — —

สองเส้นทางนี้จะบรรจบกันเมื่อฐานกฎ TALS สมบูรณ์

ทีม BIBLE กำลังสกัดกฎทุกข้อจากตำราต้นฉบับ (ยืนยง นาวาสมุทร)
เมื่อ BIBLE พร้อม → JULIAN จะทดสอบทุกกฎ systematically — นี่คือ endgame`,
  },

  // ─── Post 6 (standalone milestone): Connecting broken lineages ──────────────
  {
    slug:          '06_connecting_lineages',
    title:         'JULIAN เบื้องหลัง — ต่อสายเครือญาติที่ขาดตอน',
    category:      'behind_scenes',
    priority_score: 8,
    tags: ['JULIAN', 'research', 'TALS', 'โหราศาสตร์ไทย', 'genealogy'],
    db_size: DB_SIZE,
    body: `งานเบื้องหลังสัปดาห์นี้: ต่อ "สายเครือญาติที่ขาดตอน"

— — —

ที่ผ่านมาเราบันทึกความสัมพันธ์ของบุคคลในฐานข้อมูล — ใครเป็นพ่อ แม่ ลูก คู่สมรส พี่น้อง

แต่มีปัญหาหนึ่ง: บางครั้งญาติที่ถูกอ้างถึง "ยังไม่มีดวง" อยู่ในฐานข้อมูล

เหมือนต้นไม้ครอบครัวที่มีชื่อ แต่บางกิ่งหายไป — สายเลยขาดตรงกลาง

— — —

รอบนี้เราเพิ่มกระบวนการดึงญาติเหล่านั้นเข้ามา เฉพาะคนที่มีวันเกิดชัดเจนระดับวัน (ไม่งั้นคำนวณตำแหน่งดาวไม่ได้)

ผลคือสายเครือญาติ "ยาวต่อเนื่อง" ขึ้น — ไล่ดูได้หลายชั่วรุ่นโดยไม่ขาดช่วง

— — —

ทำไมต้องลงแรงตรงนี้?

เพราะคำถามที่น่าสนใจที่สุดของเรา — "ตำแหน่งดาวส่งต่อกันในสายเลือดหรือไม่" — จะตอบได้ก็ต่อเมื่อมีดวงครบทั้งสาย

นี่ยังไม่ใช่ผลการวิจัย เป็นแค่การปูพื้นฐานข้อมูลให้พร้อมก่อน — เราเล่าให้ฟังตามจริงว่ากำลังสร้างอะไรอยู่`,
  },

];

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

console.log(`\n=== JULIAN Research Content Generator ===`);
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (ไม่เขียนไฟล์)' : 'WRITE'}${ONLY ? ` · only=${ONLY}` : ''}`);

// --only <slug>: เขียนเฉพาะโพสต์ที่ slug ตรง (กันการ resurrect โพสต์เก่าที่ไป pipeline แล้ว)
const selected = ONLY ? posts.filter(p => p.slug === ONLY) : posts;
if (ONLY && !selected.length) { console.error(`✗ ไม่พบ slug "${ONLY}"`); process.exit(1); }
console.log(`Posts: ${selected.length}/${posts.length} · DB size: ${DB_SIZE.toLocaleString()} คน\n`);

for (const post of selected) {
  if (DRY_RUN) {
    const caption = buildResearchCaption(post);
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[${post.series_part}/${post.series_total}] ${post.title}`);
    console.log(`Category: ${post.category} · Score: ${post.priority_score}`);
    console.log(`${'─'.repeat(60)}`);
    console.log(caption);
  } else {
    writeResearchPost(post);
  }
}

if (!DRY_RUN) {
  console.log(`\n✅ สร้าง ${selected.length} posts เข้า content/inbox/`);
  console.log(`   category: behind_scenes + education · priority_score=9`);
  console.log(`   series: ${SERIES} (${TOTAL} parts)`);
}
