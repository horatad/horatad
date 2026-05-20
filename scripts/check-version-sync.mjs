#!/usr/bin/env node
// Validate version string is synced across all 6 mandated locations.
// Run before push (CI ทำให้อัตโนมัติ) — fail = mismatch ที่จะทำ cache miss / flicker
import { readFileSync } from 'node:fs';
import { exit } from 'node:process';

const errors = [];
const root = JSON.parse(readFileSync('version.json', 'utf8'));
const V = root.v;
if (!/^\d+\.\d+\.\d+$/.test(V)) {
  console.error(`✗ version.json: "v" not semver: ${V}`);
  exit(1);
}

function check(file, pattern, desc) {
  const content = readFileSync(file, 'utf8');
  const m = content.match(pattern);
  if (!m) errors.push(`${file}: ${desc} pattern not found`);
  else if (m[1] !== V) errors.push(`${file}: ${desc} = ${m[1]}, expected ${V}`);
}

check('script.js', /HORATAD:SCRIPT:(\d+\.\d+\.\d+)/, 'HORATAD:SCRIPT');
check('script.js', /^const APP_VERSION='(\d+\.\d+\.\d+)'/m, 'APP_VERSION');
check('sw.js', /HORATAD:SW:(\d+\.\d+\.\d+)/, 'HORATAD:SW');
check('sw.js', /CACHE_NAME='horatad-v(\d+\.\d+\.\d+)'/, 'CACHE_NAME');
check('style.css', /HORATAD:STYLE:(\d+\.\d+\.\d+)/, 'HORATAD:STYLE');
check('index.html', /HORATAD:INDEX:(\d+\.\d+\.\d+)/, 'HORATAD:INDEX');
check('index.html', /style\.css\?v=(\d+\.\d+\.\d+)/, 'style.css?v=');
check('index.html', /script\.js\?v=(\d+\.\d+\.\d+)/, 'script.js?v=');
check('index.html', /v3tab\.js\?v=(\d+\.\d+\.\d+)/, 'v3tab.js?v=');
check('index.html', /class="brand-ver">V (\d+\.\d+\.\d+)</, 'brand-ver');
check('index.html', /class="about-version">V (\d+\.\d+\.\d+)</, 'about-version');

if (errors.length) {
  console.error(`✗ Version sync errors (canonical = ${V}):`);
  errors.forEach(e => console.error(`  - ${e}`));
  console.error('\nFix: node scripts/bump-version.mjs <new-version>');
  exit(1);
}
console.log(`✓ All ${11} version refs synced to ${V}`);
