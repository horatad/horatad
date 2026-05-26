#!/usr/bin/env node
/**
 * build_bible_index.mjs
 * Generate handoffs/bible_memory/_index.json from all memory .md files
 * Run: node workers/build_bible_index.mjs
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));
const MEMORY_DIR = join(__dir, '../handoffs/bible_memory');
const OUT_FILE = join(MEMORY_DIR, '_index.json');

// Files to index (ordered by read priority)
const MEMORY_FILES = [
  'CLAUDE.md',
  'INDEX.md',
  'LOG.md',
  'PLANETS.md',
  'SIGNS.md',
  'HOUSES.md',
  'QUALITY.md',
  'VOCAB.md',
  'SYNTAX.md',
  'TAXONOMY.md',
  'PROMPTS.md',
  'CHAPTERS.md',
  'LLM_CONTROL.md',
];

function extractHeadings(content) {
  const lines = content.split('\n');
  const headings = [];
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)/);
    if (m) headings.push({ level: m[1].length, text: m[2].trim() });
  }
  return headings;
}

function extractKeywords(filename, content) {
  const lower = content.toLowerCase();
  const keywords = [];

  // Domain-specific keyword detection
  const KEYWORD_MAP = {
    'planets.md': ['มฤตยู', 'ราหู', 'เกตุ', 'อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'alias', 'คู่มิตร', 'คู่ศัตรู'],
    'signs.md': ['เมษ', 'พฤษภ', 'มิถุน', 'กรกฎ', 'สิงห์', 'กันย์', 'ตุล', 'พิจิก', 'ธนู', 'มังกร', 'กุมภ์', 'มีน', 'อุจ', 'นิจ', 'มหาจักร', 'correction'],
    'houses.md': ['ภพ', 'ตนุ', 'กฎุมพะ', 'สหัชชะ', 'พันธุ', 'ปุตตะ', 'อริ', 'ปัตนิ', 'มรณะ', 'ศุภะ', 'กัมมะ', 'ลาภะ', 'วินาศ', 'aspect', 'กุม', 'เล็ง', 'โยค', 'ตรีโกณ'],
    'quality.md': ['เกษตร', 'ประเกษตร', 'อุจ', 'นิจ', 'มหาจักร', 'จุลจักร', 'ราชาโชค', 'เทวีโชค', 'อุจจาวิลาส', 'อุจจาภิมุข', 'อนุเกษตร', 'กฎลบ'],
    'vocab.md': ['ลัคนา', 'ตนุลัคน์', 'ตนุเศษ', 'โฉลก', 'สมพงศ์', 'เรือนนอก', 'เรือนใน', 'ฤกษ์'],
    'log.md': ['pinned', 'correction', 'hallucination', 'verified', 'foundational'],
    'index.md': ['tals', 'foundational', 'rule #1', 'rule #2', 'rule #3', 'triangulation'],
  };

  const key = filename.toLowerCase();
  const domainKW = KEYWORD_MAP[key] || [];
  for (const kw of domainKW) {
    if (lower.includes(kw.toLowerCase())) keywords.push(kw);
  }

  // Detect corrections/warnings
  if (content.includes('⚠️') || content.includes('Correction') || content.includes('correction')) {
    keywords.push('⚠️ has-corrections');
  }
  if (content.includes('PINNED')) keywords.push('📌 has-pinned');
  if (content.includes('pending') || content.includes('Pending')) keywords.push('🟡 has-pending');

  return [...new Set(keywords)];
}

function extractPinnedEntries(content) {
  const pinned = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('PINNED')) {
      pinned.push(lines[i].replace(/^#+\s*/, '').trim());
    }
  }
  return pinned;
}

function extractCorrections(content) {
  const corrections = [];
  const lines = content.split('\n');
  for (const line of lines) {
    if (line.includes('⚠️') && (line.includes('Correction') || line.includes('correction') || line.includes('wrong') || line.includes('ผิด') || line.includes('แก้'))) {
      corrections.push(line.replace(/^[#*\-\s]+/, '').trim().substring(0, 120));
    }
  }
  return corrections.slice(0, 5); // max 5
}

function getLastUpdated(content) {
  const m = content.match(/Last updated:\s*([^\n]+)/);
  return m ? m[1].trim() : null;
}

function getLineCount(content) {
  return content.split('\n').length;
}

// Build index
const index = {
  _meta: {
    generated: new Date().toISOString().substring(0, 16),
    purpose: 'Machine-readable index of BIBLE memory files — helps Claude find relevant content without reading all files',
    usage: 'Check this index first, then read only the specific files needed',
    regenerate: 'node workers/build_bible_index.mjs',
  },
  read_order: {
    any_session: ['CLAUDE.md', 'INDEX.md', 'LOG.md'],
    extraction: ['SYNTAX.md', 'TAXONOMY.md', 'VOCAB.md', 'PROMPTS.md'],
    qa: ['PLANETS.md', 'SIGNS.md', 'HOUSES.md', 'QUALITY.md', 'VOCAB.md'],
    review: ['CHAPTERS.md'],
  },
  topic_map: {
    'ดาว / planet keywords / aliases': 'PLANETS.md',
    'ราศี / sign positions / อุจ นิจ มหาจักร': 'SIGNS.md',
    'ภพ / houses / aspect / กุม เล็ง โยค ตรีโกณ': 'HOUSES.md',
    'คุณภาพดาว / quality / กฎลบ-ลบ=บวก': 'QUALITY.md',
    'คำศัพท์ / ลัคนา / ตนุลัคน์ / โฉลก / สมพงศ์': 'VOCAB.md',
    'session log / corrections / pinned / hallucinations': 'LOG.md',
    'foundational rules / tals scope / attribution': 'INDEX.md',
    'extraction grammar / rule types / polarity': 'SYNTAX.md',
    'rule JSON schema / field spec': 'TAXONOMY.md',
    'extraction prompts / templates': 'PROMPTS.md',
    'chapter progress / batchwork': 'CHAPTERS.md',
    'LLM control / 6-layer architecture': 'LLM_CONTROL.md',
    'session instructions / hallucinations list': 'CLAUDE.md',
  },
  files: {},
};

for (const filename of MEMORY_FILES) {
  const filepath = join(MEMORY_DIR, filename);
  let content;
  try {
    content = readFileSync(filepath, 'utf8');
  } catch {
    console.warn(`⚠ skip (not found): ${filename}`);
    continue;
  }

  index.files[filename] = {
    last_updated: getLastUpdated(content),
    lines: getLineCount(content),
    headings: extractHeadings(content),
    keywords: extractKeywords(filename, content),
    pinned: extractPinnedEntries(content),
    corrections: extractCorrections(content),
  };
}

writeFileSync(OUT_FILE, JSON.stringify(index, null, 2), 'utf8');

const fileCount = Object.keys(index.files).length;
const totalLines = Object.values(index.files).reduce((s, f) => s + (f.lines || 0), 0);
console.log(`✅ _index.json generated — ${fileCount} files · ${totalLines} total lines`);
console.log(`   → ${OUT_FILE}`);
