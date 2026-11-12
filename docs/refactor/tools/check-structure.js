#!/usr/bin/env node
// docs/refactor/tools/check-structure.js
// Đếm vi phạm hướng phụ thuộc frontend theo .claude/rules/20-frontend-structure.md (T23).
// Node thuần, không dependency. Chạy từ bất kỳ đâu:
//   node docs/refactor/tools/check-structure.js            in số vi phạm, luôn thoát mã 0
//   node docs/refactor/tools/check-structure.js --strict   thoát mã 1 nếu có vi phạm MỚI (ngoài danh sách ngoại lệ đã biết)
//   node docs/refactor/tools/check-structure.js --list     in thêm từng dòng vi phạm

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SRC = path.join(REPO_ROOT, 'StockFlow_Frontend', 'src');
const STRICT = process.argv.includes('--strict');
const LIST = process.argv.includes('--list');

// Ngoại lệ đã biết, ghi trong rule 20 (mục 6 và "Ngoại lệ đã biết"). Đường dẫn tương đối từ src/, dùng "/".
const KNOWN = {
  fetch: new Set(['app/(auth)/login/page.tsx']),
  // Có từ trước T14; grep T14 chỉ bắt `from` nên bỏ sót import() động này.
  componentsToFeatures: new Set([
    'components/links/EntityLinks.tsx -> @/features/products/components/StockCardDocumentModal',
  ]),
  // T24 (phương án B): import chéo đi qua cổng công khai `@/features/<m>` (index.ts), không còn ngoại lệ.
  crossFeature: new Set(),
};

/** Liệt kê mọi file .ts/.tsx dưới thư mục. */
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Bỏ chú thích để không đếm nhầm import/fetch nằm trong comment. */
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** Lấy mọi module được import: import ... from 'x', export ... from 'x', import('x'), import 'x'. */
function importsOf(code) {
  const specs = [];
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(code)) !== null) specs.push(m[1]);
  }
  return specs;
}

const rel = (file) => path.relative(SRC, file).split(path.sep).join('/');

const results = {
  libImportsFeaturesOrComponents: [],
  componentsImportFeatures: [],
  fetchOutsideClient: [],
  crossFeatureComponentsOrScreens: [],
};

for (const file of walk(SRC)) {
  const r = rel(file);
  const code = stripComments(fs.readFileSync(file, 'utf8'));
  const specs = importsOf(code);

  // 1. lib/ không import features/ hay components/
  if (r.startsWith('lib/')) {
    for (const s of specs) {
      if (/^@\/(features|components)(\/|$)/.test(s)) results.libImportsFeaturesOrComponents.push(`${r} -> ${s}`);
    }
  }

  // 2. components/ (ngoài layout/) không import features/
  if (r.startsWith('components/') && !r.startsWith('components/layout/')) {
    for (const s of specs) {
      if (/^@\/features(\/|$)/.test(s)) results.componentsImportFeatures.push(`${r} -> ${s}`);
    }
  }

  // 3. fetch( chỉ được nằm trong lib/api/client.ts
  if (r !== 'lib/api/client.ts' && /(^|[^\w.])fetch\s*\(/m.test(code)) {
    results.fetchOutsideClient.push(r);
  }

  // 4. feature không import components/ hay screens/ của feature khác (được import qua `@/features/<m>`, tức index.ts)
  const own = /^features\/([^/]+)\//.exec(r);
  if (own) {
    for (const s of specs) {
      const m = /^@\/features\/([^/]+)\/(components|screens)(\/|$)/.exec(s);
      if (m && m[1] !== own[1]) results.crossFeatureComponentsOrScreens.push(`${r} -> ${s}`);
    }
  }
}

const checks = [
  ['lib → features/components', results.libImportsFeaturesOrComponents, new Set()],
  ['components (ngoài layout) → features', results.componentsImportFeatures, KNOWN.componentsToFeatures],
  ['fetch( ngoài lib/api/client.ts', results.fetchOutsideClient, KNOWN.fetch],
  ['import chéo components/screens giữa feature', results.crossFeatureComponentsOrScreens, KNOWN.crossFeature],
];

let newViolations = 0;
console.log(`Kiểm tra cấu trúc frontend: ${path.relative(REPO_ROOT, SRC).split(path.sep).join('/')}`);
console.log('');
console.log(`${'Quy tắc'.padEnd(46)}${'Tổng'.padStart(6)}${'Đã biết'.padStart(9)}${'Mới'.padStart(6)}`);
for (const [name, items, known] of checks) {
  const fresh = items.filter((i) => !known.has(i));
  newViolations += fresh.length;
  console.log(`${name.padEnd(46)}${String(items.length).padStart(6)}${String(items.length - fresh.length).padStart(9)}${String(fresh.length).padStart(6)}`);
  const toShow = LIST ? items : fresh;
  for (const i of toShow) console.log(`    ${known.has(i) ? '(đã biết) ' : '(MỚI) '}${i}`);
}
console.log('');
console.log(newViolations === 0 ? 'Không có vi phạm mới.' : `Có ${newViolations} vi phạm mới.`);

process.exit(STRICT && newViolations > 0 ? 1 : 0);
