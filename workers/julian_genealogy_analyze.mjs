#!/usr/bin/env node
/**
 * julian_genealogy_analyze.mjs
 * วิเคราะห์กราฟเครือญาติ + การสืบทอด → วัด "ความลึก" ที่ JULIAN track ได้
 *
 * Input  : data/julian_family.json      { QID: { p, m, sp[], ch[], si[] } }
 *          data/julian_succession.json   { QID: { prev:[{q,pos}], next:[{q,pos}] } }
 *          data/julian_all.json          (เพื่อสร้าง dbQIDs + map ชื่อ)
 * Output : data/julian_genealogy_report.json + console summary (genealogy-first)
 *
 * Metric หลัก (research strong point):
 *   - max_lineage_depth : สายบรรพบุรุษ→ลูกหลานที่ยาวที่สุด (กี่ชั่วคน) — เฉพาะคู่ที่อยู่ใน DB ทั้งคู่
 *   - lineages_ge3       : จำนวนสายที่ลึก ≥ 3 ชั่วคน
 *   - depth_histogram    : กระจายความลึกของสาย
 *   - largest_clan       : ตระกูล (connected component) ที่ใหญ่ที่สุด — นับทุก relation
 *   - max_dynasty_len    : สายสืบทอดตำแหน่ง (succession) ที่ยาวที่สุด
 *
 * Usage: node workers/julian_genealogy_analyze.mjs [--verbose] [--top N]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';

const VERBOSE   = process.argv.includes('--verbose');
const TOP_N     = (() => { const i = process.argv.indexOf('--top'); return i >= 0 ? parseInt(process.argv[i + 1]) : 10; })();
const ALL_FILE  = 'data/julian_all.json';
const FAM_FILE  = 'data/julian_family.json';
const SUCC_FILE = 'data/julian_succession.json';
const OUT_FILE  = 'data/julian_genealogy_report.json';

function qidOf(r) {
  return r.qid || (typeof r.source === 'string' && r.source.startsWith('wikidata:') ? r.source.slice(9) : null);
}

if (!existsSync(ALL_FILE)) {
  console.error(`ไม่พบ ${ALL_FILE} — ต้อง checkout horatad/julian-data ก่อน`);
  process.exit(1);
}

const records = JSON.parse(readFileSync(ALL_FILE, 'utf8'));
const nameOf  = new Map();
const dbQIDs  = new Set();
for (const r of records) {
  const q = qidOf(r);
  if (q) { dbQIDs.add(q); if (r.name) nameOf.set(q, r.name); }
}

const family = existsSync(FAM_FILE)  ? JSON.parse(readFileSync(FAM_FILE,  'utf8')) : {};
const succ   = existsSync(SUCC_FILE) ? JSON.parse(readFileSync(SUCC_FILE, 'utf8')) : {};
const famMissing  = !existsSync(FAM_FILE);
const succMissing = !existsSync(SUCC_FILE);

// ── Build in-DB graphs ───────────────────────────────────────────────────────
// parent→child directed edges (สำหรับวัดความลึกของสาย — แนวตั้งเท่านั้น)
const childrenOf = new Map();   // parent QID → Set(child QID)
const undirected = new Map();   // ทุก relation (สำหรับ clan = connected component)

function addUndirected(a, b) {
  if (!undirected.has(a)) undirected.set(a, new Set());
  if (!undirected.has(b)) undirected.set(b, new Set());
  undirected.get(a).add(b);
  undirected.get(b).add(a);
}
function addParentChild(parent, child) {
  if (!childrenOf.has(parent)) childrenOf.set(parent, new Set());
  childrenOf.get(parent).add(child);
}

for (const [qid, rel] of Object.entries(family)) {
  if (!dbQIDs.has(qid)) continue;
  // แนวตั้ง: พ่อ/แม่ ของ qid → qid เป็นลูก
  if (rel.p && dbQIDs.has(rel.p)) { addParentChild(rel.p, qid); addUndirected(rel.p, qid); }
  if (rel.m && dbQIDs.has(rel.m)) { addParentChild(rel.m, qid); addUndirected(rel.m, qid); }
  // ลูกของ qid → qid เป็นพ่อแม่
  for (const c of (rel.ch || [])) if (dbQIDs.has(c)) { addParentChild(qid, c); addUndirected(qid, c); }
  // แนวนอน: คู่สมรส + พี่น้อง (clan เท่านั้น ไม่เพิ่มความลึก)
  for (const s of (rel.sp || [])) if (dbQIDs.has(s)) addUndirected(qid, s);
  for (const s of (rel.si || [])) if (dbQIDs.has(s)) addUndirected(qid, s);
}

// ── max_lineage_depth: longest path ใน parent→child DAG (memoized DFS + cycle guard)
const depthMemo = new Map();   // node → ความลึกของสายที่ลึกที่สุดเริ่มจาก node ลงไป (นับตัวเอง = 1)
const deepestChild = new Map(); // node → child ที่ให้ depth สูงสุด (เพื่อ reconstruct)
const VISITING = 1, DONE = 2;
const state = new Map();

function depth(node) {
  if (depthMemo.has(node)) return depthMemo.get(node);
  if (state.get(node) === VISITING) return 1;  // cycle guard — ตัดที่ตัวเอง
  state.set(node, VISITING);
  let best = 1, bestChild = null;
  for (const c of (childrenOf.get(node) || [])) {
    const d = 1 + depth(c);
    if (d > best) { best = d; bestChild = c; }
  }
  state.set(node, DONE);
  depthMemo.set(node, best);
  if (bestChild) deepestChild.set(node, bestChild);
  return best;
}

const allNodes = new Set([...childrenOf.keys(), ...[...childrenOf.values()].flatMap(s => [...s])]);
let maxDepth = 0, deepestRoot = null;
const depthHistogram = {};   // depth → count ของ root chains
// "root" = node ที่ไม่มีพ่อแม่ใน DB (ไม่เป็น child ของใคร)
const hasParent = new Set([...childrenOf.values()].flatMap(s => [...s]));
for (const node of allNodes) {
  if (hasParent.has(node)) continue; // นับเฉพาะ root เพื่อไม่ซ้ำสาย
  const d = depth(node);
  depthHistogram[d] = (depthHistogram[d] || 0) + 1;
  if (d > maxDepth) { maxDepth = d; deepestRoot = node; }
}
const lineagesGe3 = Object.entries(depthHistogram).reduce((s, [d, c]) => s + (parseInt(d) >= 3 ? c : 0), 0);

// reconstruct สายที่ลึกที่สุด (ชื่อ)
function reconstruct(root) {
  const chain = [];
  let cur = root;
  const guard = new Set();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    chain.push({ qid: cur, name: nameOf.get(cur) || cur });
    cur = deepestChild.get(cur);
  }
  return chain;
}
const deepestChain = deepestRoot ? reconstruct(deepestRoot) : [];

// ── largest_clan: connected components บน undirected graph (union-find เบาๆ ด้วย BFS)
const seen = new Set();
let largestClan = 0, largestClanSeed = null;
const clanSizes = [];
for (const start of undirected.keys()) {
  if (seen.has(start)) continue;
  let size = 0;
  const stack = [start];
  seen.add(start);
  while (stack.length) {
    const n = stack.pop();
    size++;
    for (const nb of (undirected.get(n) || [])) if (!seen.has(nb)) { seen.add(nb); stack.push(nb); }
  }
  clanSizes.push(size);
  if (size > largestClan) { largestClan = size; largestClanSeed = start; }
}
clanSizes.sort((a, b) => b - a);

// ── Dynasty / สายสืบทอดตำแหน่ง — แยกตาม "ตำแหน่ง/ตำแหน่งแชมป์" (P39/title) ──────
// แต่ละตำแหน่ง (นายกฯ / แชมป์โลกมวย / แชมป์หมากรุก / นางงามจักรวาล ฯลฯ)
// = กราฟสืบทอดของตัวเอง → วัดสายที่ยาวที่สุดแยกตามตำแหน่ง
const POS_UNKNOWN = '(ไม่ระบุตำแหน่ง)';
const edgesByPos = new Map();  // pos → Map(QID → Set(successor QID))
function addSuccEdge(pos, from, to) {
  const p = pos || POS_UNKNOWN;
  if (!edgesByPos.has(p)) edgesByPos.set(p, new Map());
  const g = edgesByPos.get(p);
  if (!g.has(from)) g.set(from, new Set());
  g.get(from).add(to);
}
for (const [qid, rel] of Object.entries(succ)) {
  if (!dbQIDs.has(qid)) continue;
  for (const e of (rel.next || [])) if (e && dbQIDs.has(e.q)) addSuccEdge(e.pos, qid, e.q);
  for (const e of (rel.prev || [])) if (e && dbQIDs.has(e.q)) addSuccEdge(e.pos, e.q, qid);
}

// longest path ต่อ 1 ตำแหน่ง (memoized + cycle guard)
function longestChainInGraph(graph) {
  const memo = new Map(), st = new Map(), nextSel = new Map();
  function len(node) {
    if (memo.has(node)) return memo.get(node);
    if (st.get(node) === VISITING) return 1;
    st.set(node, VISITING);
    let best = 1, bestN = null;
    for (const nx of (graph.get(node) || [])) { const d = 1 + len(nx); if (d > best) { best = d; bestN = nx; } }
    st.set(node, DONE); memo.set(node, best);
    if (bestN) nextSel.set(node, bestN);
    return best;
  }
  let maxLen = 0, seed = null;
  const holders = new Set([...graph.keys(), ...[...graph.values()].flatMap(s => [...s])]);
  for (const n of graph.keys()) { const d = len(n); if (d > maxLen) { maxLen = d; seed = n; } }
  const chain = []; let cur = seed; const guard = new Set();
  while (cur && !guard.has(cur)) { guard.add(cur); chain.push({ qid: cur, name: nameOf.get(cur) || cur }); cur = nextSel.get(cur); }
  return { maxLen, chain, holders: holders.size };
}

const byPosition = [];
let maxDynasty = 0, dynastyChain = [], dynastyPos = null;
for (const [pos, graph] of edgesByPos.entries()) {
  const { maxLen, chain, holders } = longestChainInGraph(graph);
  byPosition.push({ position: pos, max_chain: maxLen, holders });
  if (maxLen > maxDynasty) { maxDynasty = maxLen; dynastyChain = chain; dynastyPos = pos; }
}
byPosition.sort((a, b) => b.max_chain - a.max_chain || b.holders - a.holders);

// ── report ─────────────────────────────────────────────────────────────────
const report = {
  generated: new Date().toISOString(),
  db_size: dbQIDs.size,
  family_status: famMissing ? 'missing' : 'ok',
  succession_status: succMissing ? 'missing' : 'ok',
  lineage: {
    max_depth: maxDepth,            // ชั่วคนที่ลึกที่สุดที่ track ได้
    lineages_ge3: lineagesGe3,      // จำนวนสายลึก ≥3 ชั่วคน
    depth_histogram: depthHistogram,
    deepest_chain: deepestChain,    // [{qid,name}] บรรพบุรุษ→ลูกหลาน
  },
  clan: {
    largest_size: largestClan,
    total_clans: clanSizes.length,
    top_sizes: clanSizes.slice(0, TOP_N),
  },
  dynasty: {
    max_length: maxDynasty,
    longest_position: dynastyPos,
    longest_chain: dynastyChain,
    by_position: byPosition.slice(0, TOP_N),   // สายสืบทอดแยกตามตำแหน่ง/แชมป์
    total_positions: byPosition.length,
  },
};
writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

// ── console: genealogy-first summary ─────────────────────────────────────────
console.log(`🧬 Genealogy depth tracking — DB ${dbQIDs.size.toLocaleString()} ดวง`);
if (famMissing)  console.log('   ⚠️  data/julian_family.json ไม่พบ → backfill ยังไม่ produce');
console.log(`   📏 สายลึกที่สุด : ${maxDepth} ชั่วคน` + (deepestChain.length ? `  (${deepestChain.map(c => c.name).join(' → ')})` : ''));
console.log(`   🌳 สายลึก ≥3 ชั่วคน : ${lineagesGe3} สาย`);
console.log(`   👨‍👩‍👧‍👦 ตระกูลใหญ่สุด : ${largestClan} คน  ·  ตระกูลทั้งหมด ${clanSizes.length}`);
console.log(`   👑 สืบทอดตำแหน่งยาวสุด : ${maxDynasty} ช่วง` + (dynastyPos ? ` [${dynastyPos}]` : '') + (dynastyChain.length ? `  (${dynastyChain.map(c => c.name).join(' → ')})` : ''));
console.log(`   🏅 ตำแหน่ง/แชมป์ที่ track : ${byPosition.length} ประเภท`);
console.log(`→ ${OUT_FILE}`);

if (VERBOSE) {
  console.log('\nDepth histogram (depth → #lineages):', JSON.stringify(depthHistogram));
  console.log('Top clan sizes:', clanSizes.slice(0, TOP_N).join(', '));
  console.log('\nสายสืบทอดตามตำแหน่ง (top):');
  byPosition.slice(0, TOP_N).forEach(p => console.log(`   ${p.position}: สายยาว ${p.max_chain} · ผู้ครอง ${p.holders} คน`));
}
