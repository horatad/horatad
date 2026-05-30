#!/usr/bin/env node
// kb_empirical_build.mjs — สร้าง v3/kb_empirical.json จาก JULIAN valid rules
// ─────────────────────────────────────────────────────────────────────────
// BIBLE empirical layer: ชั้นกฎที่มี "หลักฐานสถิติจริง" (lift / p-value / n)
// แยกจาก kb_tals.json (textbook 100CH) โดยเจตนา — provenance คนละชั้น
//
//   kb_tals.json     = ground truth จากตำรา 100CH (source_type=PRIMARY)
//   kb_empirical.json = หลักฐานสถิติจาก JULIAN (source=empirical scan)
//
// Input : ml/models/julian_valid_rules.json (JULIAN full-scan verdict)
// Output: v3/kb_empirical.json
//
// หลักการ (ตรง North Star "โหราศาสตร์ที่ตรวจสอบได้"):
//   - เอาเฉพาะกลุ่มที่ JULIAN ตัดสินว่า valid (status=valid) — MR×MR / SA×MR / SU×MR
//     ที่ถูก reject (age proxy / inconsistent polarity) จะไม่หลุดเข้ามาเด็ดขาด
//   - ทุกกฎพก disclaimer + ตัวเลขจริง (n, lift, p_adj) → wording อ้างหลักฐานได้
//   - flag beyond_tals_model เมื่อมุมอยู่นอก TALS aspect model (dist คี่ 30/90/150°)
//
// Re-run ได้เมื่อ JULIAN เพิ่ม valid rules (เช่น SA×SA monitor ผ่านในอนาคต)
// Zero-Human-Input: ไม่มีการพิมพ์กฎมือ — derive จาก JULIAN source ทั้งหมด
// ─────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SRC = join(ROOT, 'ml/models/julian_valid_rules.json');
const OUT = join(ROOT, 'v3/kb_empirical.json');

// planet code → TALS (id + ไทย) — canonical จาก tals_planets.json
const PLANET = {
  SU: { id: 1, th: 'อาทิตย์', en: 'Sun' },
  MO: { id: 2, th: 'จันทร์', en: 'Moon' },
  MA: { id: 3, th: 'อังคาร', en: 'Mars' },
  ME: { id: 4, th: 'พุธ', en: 'Mercury' },
  JU: { id: 5, th: 'พฤหัส', en: 'Jupiter' },
  VE: { id: 6, th: 'ศุกร์', en: 'Venus' },
  SA: { id: 7, th: 'เสาร์', en: 'Saturn' },
  RA: { id: 8, th: 'ราหู', en: 'Rahu' },
  MR: { id: 0, th: 'มฤตยู', en: 'Uranus' },
};

// dist (ระยะราศี 0-6) → TALS aspect model
// TALS ใช้ระบบราศี (sign-based): ส่งผลเฉพาะ dist คู่ (กุม/โยค/ตรีโกณ/เล็ง)
// dist คี่ (30/90/150°) = TALS ไม่รับรองว่าส่งผล → beyond_tals_model
const DIST_TO_TALS = {
  0: { code: 'KUM', th: 'กุม', angle: 0, weight_pct: 100 },
  1: { code: null, th: null, angle: 30, weight_pct: null }, // นอก TALS
  2: { code: 'YOK', th: 'โยค', angle: 60, weight_pct: 60 },
  3: { code: null, th: null, angle: 90, weight_pct: null }, // นอก TALS
  4: { code: 'TRI', th: 'ตรีโกณ', angle: 120, weight_pct: 50 },
  5: { code: null, th: null, angle: 150, weight_pct: null }, // นอก TALS
  6: { code: 'LENG', th: 'เล็ง', angle: 180, weight_pct: 80 },
};

const round = (x, n = 4) => Number(x.toFixed(n));

function build() {
  const src = JSON.parse(readFileSync(SRC, 'utf8'));
  const valid = src.valid_rules.filter((r) => r.status === 'valid');

  // group by transit×natal×dist (1 กฎ = 1 configuration ของมุมเดียว)
  const groups = new Map();
  for (const r of valid) {
    const key = `${r.transit_planet}|${r.natal_planet}|${r.dist}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const rules = [];
  for (const [key, rows] of groups) {
    const [tp, np, distStr] = key.split('|');
    const dist = Number(distStr);
    const tals = DIST_TO_TALS[dist];
    const T = PLANET[tp], N = PLANET[np];
    if (!T || !N) { console.warn(`⚠ unknown planet in ${key}`); continue; }

    // รวมหลักฐานแต่ละ event_type
    const events = rows
      .map((r) => ({
        event_type: r.event_type,
        lift: round(r.lift),
        p_adj: r.p_adj,
        class_n: r.class_n,
        direction: r.lift >= 1 ? 'positive' : 'negative', // lift>1 = เพิ่มโอกาส
      }))
      .sort((a, b) => b.lift - a.lift);

    // polarity ของมุม = ค่าที่ทุก row ใน group เห็นพ้อง (hard_death / soft_award)
    const polSet = [...new Set(rows.map((r) => r.polarity))];
    const polarity = polSet.length === 1 ? polSet[0] : polSet.join('|');

    // event ที่ lift สูงสุด = signature ของมุมนี้
    const primary = events[0];

    const transit_th = `${T.th}จร`;
    const natal_th = `${N.th}เดิม`;
    const aspectLabel = tals.code ? tals.th : `ทำมุม ${tals.angle}°`;

    rules.push({
      id: `EMP-${tp}${np}-d${dist}`,
      layer: 'empirical',
      transit_planet: tp,
      transit_planet_id: T.id,
      natal_planet: np,
      natal_planet_id: N.id,
      dist,
      angle_deg: tals.angle,
      tals_aspect: tals.code,            // null = นอก TALS model
      tals_aspect_th: tals.th,
      tals_weight_pct: tals.weight_pct,
      beyond_tals_model: tals.code === null,
      polarity,                          // hard_death | soft_award
      primary_event: primary.event_type,
      title: `${transit_th}${tals.code ? '' : ''}${aspectLabel}${natal_th}`,
      meaning: `${T.th}จร${aspectLabel}กับ${N.th}เดิม — ข้อสังเกตเชิงสถิติ: `
        + events
            .map((e) => `${e.event_type} ${e.direction === 'positive' ? '↑' : '↓'}${Math.round(Math.abs(e.lift - 1) * 1000) / 10}% (n=${e.class_n})`)
            .join(', '),
      events,
      empirical: {
        source: 'JULIAN',
        source_file: 'ml/models/julian_valid_rules.json',
        scan: src.meta?.source || 'julian_full_scan',
        generated: src.meta?.generated || null,
        reviewed: src.meta?.reviewed || null,
        status: 'valid',
      },
      disclaimer: `ข้อสังเกตเชิงสถิติจากฐานข้อมูลบุคคลจริง (n=${primary.class_n}, lift=${primary.lift}, p<0.05 หลังปรับ FDR) — เป็นแนวโน้มเชิงประชากร ไม่ใช่คำพยากรณ์ชี้ชะตารายบุคคล`,
    });
  }

  // เรียงตาม dist เพื่ออ่านง่าย
  rules.sort((a, b) => a.dist - b.dist);

  const out = {
    _meta: {
      schema: 'kb-empirical-1.0',
      generated_by: 'workers/kb_empirical_build.mjs',
      generated_at: new Date().toISOString(),
      source: 'ml/models/julian_valid_rules.json',
      julian_meta: src.meta || null,
      rule_count: rules.length,
      pair_scope: [...new Set(rules.map((r) => `${r.transit_planet}×${r.natal_planet}`))],
      excluded_groups: (src.rejected_groups || []).map((g) => ({
        group: g.group, count: g.count, reason: g.reason,
      })),
      monitor_groups: (src.monitor_groups || []).map((g) => ({
        group: g.group, count: g.count, reason: g.reason,
      })),
      notes: [
        'ชั้น empirical แยกจาก kb_tals.json (textbook 100CH) — provenance คนละชั้น',
        'เอาเฉพาะกลุ่มที่ JULIAN ตัดสิน valid — MR×MR (age proxy 83yr), SA×MR/SU×MR (inconsistent polarity) ถูกตัดออกแล้วที่ต้นทาง',
        'beyond_tals_model=true → มุมอยู่นอก TALS aspect model (dist คี่ 30/90/150°) แต่มีนัยสำคัญทางสถิติ',
        'ค้นพบ: มุม TALS (dist คู่ กุม/โยค/ตรีโกณ/เล็ง) = soft/award ทั้งหมด · สัญญาณ death (hard) มาจากมุมนอก TALS (dist คี่)',
        'polarity = ลักษณะของมุม: hard_death (เพิ่มโอกาสเสียชีวิต/ลดรางวัล) · soft_award (เพิ่มโอกาสรางวัล/ลดเสียชีวิต)',
        'ทุก wording ที่ใช้ชั้นนี้ต้องแนบ disclaimer — เป็นแนวโน้มประชากร ไม่ใช่ชี้ชะตา',
      ],
    },
    rules,
  };

  writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');

  // summary
  console.log(`✓ เขียน ${OUT}`);
  console.log(`  rules: ${rules.length} (จาก valid ${valid.length} rows)`);
  console.log(`  pairs: ${out._meta.pair_scope.join(', ')}`);
  console.log(`  excluded: ${out._meta.excluded_groups.map((g) => `${g.group}(${g.count})`).join(', ')}`);
  console.log('');
  console.log('  dist | มุม TALS        | polarity     | primary | beyond_tals');
  for (const r of rules) {
    console.log(
      `   ${r.dist}   | ${(r.tals_aspect_th || `(${r.angle_deg}°)`).padEnd(13)} | ${r.polarity.padEnd(12)} | ${r.primary_event.padEnd(14)} | ${r.beyond_tals_model ? 'YES ⚠' : 'no'}`
    );
  }
}

build();
