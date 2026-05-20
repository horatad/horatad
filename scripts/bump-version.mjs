#!/usr/bin/env node
// Bump version across all 6 mandated locations atomically.
// Usage:
//   node scripts/bump-version.mjs              # auto-increment patch (X.Y.Z → X.Y.Z+1)
//   node scripts/bump-version.mjs 2.3.0        # set explicit version
import { readFileSync, writeFileSync } from 'node:fs';
import { exit, argv } from 'node:process';

const old = JSON.parse(readFileSync('version.json', 'utf8')).v;
let newV = argv[2];
if (!newV) {
  const p = old.split('.').map(Number);
  p[2]++;
  newV = p.join('.');
}
if (!/^\d+\.\d+\.\d+$/.test(newV)) {
  console.error(`✗ Invalid version: ${newV}`);
  exit(1);
}
if (newV === old) {
  console.error(`✗ New version same as current (${old})`);
  exit(1);
}
console.log(`${old} → ${newV}\n`);

const oldEsc = old.replace(/\./g, '\\.');

function bump(file, find, replace) {
  const src = readFileSync(file, 'utf8');
  const updated = src.replace(find, replace);
  if (src === updated) {
    console.error(`  ✗ ${file}: pattern not found`);
    exit(1);
  }
  writeFileSync(file, updated);
  console.log(`  ✓ ${file}`);
}

bump('version.json', /"v":"\d+\.\d+\.\d+"/, `"v":"${newV}"`);
bump('script.js', /HORATAD:SCRIPT:\d+\.\d+\.\d+/, `HORATAD:SCRIPT:${newV}`);
bump('script.js', /Version \d+\.\d+\.\d+ \|/, `Version ${newV} |`);
bump('script.js', /^const APP_VERSION='\d+\.\d+\.\d+'/m, `const APP_VERSION='${newV}'`);
bump('sw.js', /HORATAD:SW:\d+\.\d+\.\d+/, `HORATAD:SW:${newV}`);
bump('sw.js', /Version \d+\.\d+\.\d+ \|/, `Version ${newV} |`);
bump('sw.js', /CACHE_NAME='horatad-v\d+\.\d+\.\d+'/, `CACHE_NAME='horatad-v${newV}'`);
bump('style.css', /HORATAD:STYLE:\d+\.\d+\.\d+/, `HORATAD:STYLE:${newV}`);

// index.html: 6 จุดใช้ X.Y.Z เดิม — replace-all ปลอดภัยเพราะ semver ไม่ซ้ำกับ value อื่น
const html = readFileSync('index.html', 'utf8');
const updated = html.replaceAll(old, newV);
if (html === updated) {
  console.error('  ✗ index.html: no occurrences of old version');
  exit(1);
}
writeFileSync('index.html', updated);
console.log(`  ✓ index.html (replaced all "${old}" → "${newV}")`);

console.log(`\nVerify: node scripts/check-version-sync.mjs`);
