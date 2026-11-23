// Sinh tài liệu thiết kế test (Phase 2) từ dữ liệu trong ./data:
//   specs/qa/reports/02_REQUIREMENT_TRACEABILITY_MATRIX.md
//   specs/qa/reports/04_TEST_CASES_SUMMARY.md
//   specs/qa/test-cases/TC_*.md  (mỗi test case đủ trường: ID, tên, module, yêu cầu, UC, loại, ưu tiên,
//                                 điều kiện, dữ liệu, bước, kết quả mong đợi, kết quả thực tế, trạng thái, bằng chứng)
//   specs/qa/test-cases/testcases.csv (UTF-8 BOM, mở được bằng Excel)
// Chạy: node specs/qa/test-design/generate.js   (không cần package ngoài)
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const QA = path.join(ROOT, 'specs', 'qa');
const { BR, NFR, FLOWS } = require('./data/requirements');
const reg = require('./data/50-regression');
const TCS = [
  ...require('./data/10-unit'), ...require('./data/20-integration'), ...require('./data/30-api'), ...require('./data/40-system'), ...reg,
];
const SUSPECTS = reg.SUSPECTS;
const TODAY = '19/11/2026';

// ───────── Danh mục ─────────
const MODULES = {
  AUTH: 'Xác thực', ACC: 'Tài khoản', ROLE: 'Vai trò & quyền', WHA: 'Quyền kho', SEC: 'Bảo mật & phân quyền',
  BKG: 'Đặt hàng (booking)', POS: 'Bán hàng POS', CRD: 'Tín dụng & công nợ KH', PB: 'Bảng giá', RET: 'Trả hàng bán',
  PO: 'Đặt hàng nhập', GR: 'Nhập hàng', PR: 'Trả hàng NCC', SUP: 'Nhà cung cấp',
  MST: 'Danh mục', INV: 'Tồn kho', STK: 'Kiểm kê', DSP: 'Huỷ hàng', TRF: 'Chuyển kho',
  PRD: 'Sản xuất', PLN: 'Kế hoạch sản xuất', MRP: 'MRP',
  FIN: 'Tài chính & báo cáo', SET: 'Cài đặt', PERF: 'Hiệu năng', OOS: 'Ngoài phạm vi',
};
const FILES = [
  ['TC_01_AUTH_ADMIN.md', 'Xác thực, tài khoản, vai trò, quyền kho, bảo mật', ['AUTH', 'ACC', 'ROLE', 'WHA', 'SEC']],
  ['TC_02_SALES.md', 'Đặt hàng, POS, tín dụng, bảng giá, trả hàng bán', ['BKG', 'POS', 'CRD', 'PB', 'RET']],
  ['TC_03_PURCHASE.md', 'Đặt hàng nhập, nhập hàng, trả hàng NCC, nhà cung cấp', ['PO', 'GR', 'PR', 'SUP']],
  ['TC_04_INVENTORY.md', 'Danh mục, tồn kho, kiểm kê, huỷ hàng, chuyển kho', ['MST', 'INV', 'STK', 'DSP', 'TRF']],
  ['TC_05_PRODUCTION.md', 'Sản xuất, kế hoạch sản xuất, MRP', ['PRD', 'PLN', 'MRP']],
  ['TC_06_FINANCE_SETTINGS_NFR.md', 'Tài chính, báo cáo, cài đặt, hiệu năng, ngoài phạm vi', ['FIN', 'SET', 'PERF', 'OOS']],
];
const TYPES = ['Unit', 'Integration', 'API', 'System', 'Regression'];
const STATUSES = ['Passed', 'Failed', 'Blocked', 'Skipped', 'Not Run'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const TECH = { EP: 'Phân lớp tương đương', BVA: 'Giá trị biên', DT: 'Bảng quyết định', ST: 'Chuyển trạng thái', NEG: 'Kiểm thử âm', EG: 'Đoán lỗi', CONC: 'Đồng thời', SEC: 'Bảo mật', RISK: 'Theo rủi ro', PERF: 'Hiệu năng' };

// UC: đọc từ 01a (tên, kết luận), thêm UC-100 – UC-105 (Report 3 bản 19/11)
const matrix = fs.readFileSync(path.join(QA, 'reports', '01a_UC_DOC_SPEC_CODE_MATRIX.md'), 'utf8');
const UCS = [];
for (const line of matrix.split('\n')) {
  const m = line.match(/^\| (UC-\d+) \| ([^|]+) \|.*\| ([^|]+) \|\s*$/);
  if (m) UCS.push({ id: m[1], name: m[2].trim(), verdict: m[3].trim().replace(/\*\*/g, '').split(/[;(]/)[0].trim() });
}
[['UC-100', 'Plan Material Requirements (MRP)'], ['UC-101', 'Run MRP'], ['UC-102', 'View Material Requirements by Period'], ['UC-103', 'View Material Shortages'], ['UC-104', 'View Projected Stock'], ['UC-105', 'Order Materials from MRP Suggestions']]
  .forEach(([id, name]) => UCS.push({ id, name, verdict: 'Khớp (thêm 19/11)' }));
const ucMod = (n) => {
  const r = [[[1, 3], 'AUTH'], [[4, 9], 'ACC'], [[10, 14], 'ROLE'], [[15, 17], 'WHA'], [[18, 22], 'BKG'], [[24, 24], 'BKG'], [[23, 23], 'POS'], [[25, 26], 'POS'], [[35, 36], 'POS'], [[63, 63], 'POS'], [[65, 65], 'POS'],
    [[27, 27], 'CRD'], [[29, 29], 'CRD'], [[55, 55], 'CRD'], [[62, 62], 'CRD'], [[64, 64], 'CRD'], [[66, 66], 'CRD'], [[28, 28], 'RET'], [[41, 42], 'RET'], [[79, 82], 'RET'],
    [[30, 30], 'PO'], [[68, 68], 'PO'], [[31, 32], 'GR'], [[34, 34], 'GR'], [[67, 67], 'GR'], [[69, 70], 'GR'], [[33, 33], 'PR'], [[71, 71], 'SUP'], [[85, 85], 'SUP'],
    [[37, 38], 'TRF'], [[74, 74], 'TRF'], [[39, 40], 'STK'], [[75, 75], 'STK'], [[43, 43], 'DSP'], [[76, 76], 'DSP'], [[44, 50], 'PRD'], [[57, 61], 'PRD'],
    [[51, 54], 'MST'], [[56, 56], 'MST'], [[99, 99], 'MST'], [[72, 73], 'INV'], [[77, 78], 'INV'], [[83, 84], 'FIN'], [[86, 90], 'FIN'], [[98, 98], 'FIN'], [[91, 91], 'PB'], [[92, 96], 'PLN'], [[97, 97], 'SET'], [[100, 105], 'MRP']];
  return (r.find(([[a, b]]) => n >= a && n <= b) || [null, '?'])[1];
};
UCS.forEach((u) => { u.mod = ucMod(+u.id.slice(3)); });

// Endpoint: đọc từ 01b
const api01b = fs.readFileSync(path.join(QA, 'reports', '01b_API_INVENTORY.md'), 'utf8');
const ENDPOINTS = [];
let curCtrl = '';
for (const line of api01b.split('\n')) {
  const h = line.match(/^## (\w+)/); if (h) curCtrl = h[1];
  const m = line.match(/^\| \d+ \| (GET|POST|PUT|PATCH|DELETE) \| `([^`]+)` \| ([^|]*) \| ([^|]*) \|/);
  if (m) ENDPOINTS.push({ key: `${m[1]} ${m[2]}`, ctrl: curCtrl, perm: m[3].trim(), other: m[4].trim() });
}

// ───────── Kiểm dữ liệu ─────────
const errors = [];
const reqKeys = new Set([...UCS.map((u) => u.id), ...BR.map((b) => b[0]), ...NFR.map((n) => n[0]), ...FLOWS.map((f) => f[0])]);
const epKeys = new Set(ENDPOINTS.map((e) => e.key));
const ids = new Set();
for (const t of TCS) {
  if (ids.has(t.id)) errors.push(`Trùng ID ${t.id}`); ids.add(t.id);
  if (!MODULES[t.mod]) errors.push(`${t.id}: module lạ ${t.mod}`);
  if (!TYPES.includes(t.type)) errors.push(`${t.id}: loại lạ ${t.type}`);
  if (!PRIORITIES.includes(t.pri)) errors.push(`${t.id}: ưu tiên lạ ${t.pri}`);
  if (!STATUSES.includes(t.status)) errors.push(`${t.id}: trạng thái lạ ${t.status}`);
  for (const r of t.req) if (!reqKeys.has(r)) errors.push(`${t.id}: yêu cầu không có trong danh mục: ${r}`);
  for (const a of t.api || []) if (a !== '*' && !epKeys.has(a)) errors.push(`${t.id}: endpoint không có trong 01b: ${a}`);
  for (const k of t.tech || []) if (!TECH[k]) errors.push(`${t.id}: kỹ thuật lạ ${k}`);
  if ((t.status === 'Blocked' || t.status === 'Skipped') && !t.note) errors.push(`${t.id}: ${t.status} nhưng không ghi lý do`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

// ───────── Tiện ích ─────────
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');
const list = (a) => (Array.isArray(a) ? a : a ? [a] : []);
const numbered = (a) => list(a).map((s, i) => `${i + 1}. ${esc(s)}`).join('<br>') || '—';
const bullets = (a) => list(a).map((s) => `• ${esc(s)}`).join('<br>') || '—';
const ucOf = (t) => t.req.filter((r) => /^UC-/.test(r));
const reqOf = (t) => t.req.filter((r) => !/^UC-/.test(r));
const count = (arr, f) => arr.filter(f).length;
const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '—');
const byReq = new Map();
for (const t of TCS) for (const r of t.req) { if (!byReq.has(r)) byReq.set(r, []); byReq.get(r).push(t); }
const covStatus = (tcs) => {
  if (!tcs || !tcs.length) return 'CHƯA CÓ TEST';
  const sts = new Set(tcs.map((t) => t.status));
  if (sts.has('Not Run')) return 'Đã thiết kế – Not Run';
  if (sts.size === 1 && sts.has('Skipped')) return 'Skipped';
  return 'Blocked';
};
const typesOf = (tcs) => [...new Set((tcs || []).map((t) => t.type))].sort((a, b) => TYPES.indexOf(a) - TYPES.indexOf(b)).join(', ') || '—';
const idsOf = (tcs) => (tcs || []).map((t) => t.id).join(', ') || '—';
const header = (title, extra = []) => [`# ${title}`, '', `- **Ngày lập:** ${TODAY}. **Người phụ trách:** Ninh. **Giai đoạn:** Phase 2 – Test Strategy & Test Design.`,
  '- **Sinh tự động** bằng `node specs/qa/test-design/generate.js` từ `specs/qa/test-design/data/*.js`. Sửa dữ liệu rồi chạy lại, không sửa tay file này.',
  '- **Chưa test nào được chạy trong Phase 2.** Trạng thái "Not Run" nghĩa là đã thiết kế, chưa thực thi; không dùng làm bằng chứng đạt.', ...extra, ''];

// ───────── 1. File test case ─────────
fs.mkdirSync(path.join(QA, 'test-cases'), { recursive: true });
for (const [file, title, mods] of FILES) {
  const tcs = TCS.filter((t) => mods.includes(t.mod));
  const out = header(`Test case – ${title}`, [`- **Số test case:** ${tcs.length}.`, '- Ma trận truy vết: [02_REQUIREMENT_TRACEABILITY_MATRIX.md](../reports/02_REQUIREMENT_TRACEABILITY_MATRIX.md). Chiến lược: [03_TEST_STRATEGY.md](../reports/03_TEST_STRATEGY.md).']);
  out.push('## Danh sách', '', '| ID | Tên | Module | Loại | Ưu tiên | Trạng thái |', '|---|---|---|---|---|---|');
  for (const t of tcs) out.push(`| [${t.id}](#${t.id.toLowerCase()}) | ${esc(t.name)} | ${MODULES[t.mod]} | ${t.type} | ${t.pri} | ${t.status} |`);
  for (const mod of mods) {
    const mt = tcs.filter((t) => t.mod === mod);
    if (!mt.length) continue;
    out.push('', `## ${MODULES[mod]}`);
    for (const t of mt) {
      out.push('', `### ${t.id}`, '', '| Trường | Nội dung |', '|---|---|',
        `| Test Case ID | ${t.id} |`, `| Test Name | ${esc(t.name)} |`, `| Module | ${MODULES[t.mod]} |`,
        `| Requirement ID | ${esc(reqOf(t).join(', ') || '—')} |`, `| Use Case ID | ${esc(ucOf(t).join(', ') || '—')} |`,
        `| Test Type | ${t.type} |`, `| Priority | ${t.pri} |`, `| Kỹ thuật | ${(t.tech || []).map((k) => TECH[k]).join(', ') || '—'} |`,
        `| API liên quan | ${esc((t.api || []).map((a) => (a === '*' ? 'Toàn bộ endpoint (01b)' : a)).join('; ') || '—')} |`,
        `| Preconditions | ${esc(t.pre || '—')} |`, `| Test Data | ${esc(t.data || '—')} |`,
        `| Test Steps | ${numbered(t.steps)} |`, `| Expected Result | ${bullets(t.exp)} |`,
        '| Actual Result | — |', `| Status | ${t.status} |`, '| Evidence | — |', `| Ghi chú | ${esc(t.note || '—')} |`);
    }
  }
  fs.writeFileSync(path.join(QA, 'test-cases', file), out.join('\n') + '\n');
}

// CSV
const csvCell = (s) => `"${String(s ?? '').replace(/"/g, '""')}"`;
const csv = [['Test Case ID', 'Test Name', 'Module', 'Requirement ID', 'Use Case ID', 'Test Type', 'Priority', 'Technique', 'API', 'Preconditions', 'Test Data', 'Test Steps', 'Expected Result', 'Actual Result', 'Status', 'Evidence', 'Note']]
  .concat(TCS.map((t) => [t.id, t.name, MODULES[t.mod], reqOf(t).join(', '), ucOf(t).join(', '), t.type, t.pri, (t.tech || []).map((k) => TECH[k]).join(', '),
    (t.api || []).join('; '), t.pre || '', t.data || '', list(t.steps).map((s, i) => `${i + 1}. ${s}`).join('\n'), list(t.exp).join('\n'), '', t.status, '', t.note || '']))
  .map((r) => r.map(csvCell).join(',')).join('\r\n');
fs.writeFileSync(path.join(QA, 'test-cases', 'testcases.csv'), '﻿' + csv + '\r\n');

// ───────── 2. Ma trận truy vết ─────────
const rtm = header('02 – Requirement Traceability Matrix', [
  '- **Nguồn yêu cầu:** Report 3 bản sửa 19/11/2026 (`docs/SEP_490_Group82(bản sao).docx`, bản đã chuẩn bị ở `01d`), kết luận đối chiếu code ở [01a](01a_UC_DOC_SPEC_CODE_MATRIX.md), endpoint ở [01b](01b_API_INVENTORY.md).',
  '- **Cột Status** là trạng thái phủ test: `Đã thiết kế – Not Run` (có test case, chưa chạy), `Blocked` (chỉ có test bị chặn vì thiếu chức năng / điều kiện), `Skipped` (ngoài phạm vi), `CHƯA CÓ TEST`. Không cột nào ghi "Covered" vì Phase 2 chưa chạy test.',
]);
const ucRows = UCS.map((u) => ({ ...u, tcs: byReq.get(u.id) }));
const brRows = BR.map(([k, label, text]) => ({ k, label, text, tcs: byReq.get(k) }));
const nfrRows = NFR.map(([k, sec, text]) => ({ k, sec, text, tcs: byReq.get(k) }));
const flowRows = FLOWS.map(([k, text]) => ({ k, text, tcs: byReq.get(k) }));
const wildcard = TCS.filter((t) => (t.api || []).includes('*'));
const epRows = ENDPOINTS.map((e) => ({ ...e, tcs: TCS.filter((t) => (t.api || []).includes(e.key)) }));
const sumCov = (rows) => { const c = {}; rows.forEach((r) => { const s = covStatus(r.tcs); c[s] = (c[s] || 0) + 1; }); return c; };
const covLine = (rows) => { const c = sumCov(rows); return Object.entries(c).map(([k, v]) => `${k}: ${v}`).join(' · '); };

rtm.push('## Tổng hợp độ phủ', '', '| Nhóm yêu cầu | Tổng | Đã thiết kế – Not Run | Blocked | Skipped | Chưa có test |', '|---|---:|---:|---:|---:|---:|');
for (const [label, rows] of [['Use Case (UC-01 – UC-105)', ucRows], ['Business Rule (dòng trong 5.1)', brRows], ['Yêu cầu phi chức năng (4.2)', nfrRows], ['Luồng liên module', flowRows]]) {
  const c = sumCov(rows);
  rtm.push(`| ${label} | ${rows.length} | ${c['Đã thiết kế – Not Run'] || 0} | ${c.Blocked || 0} | ${c.Skipped || 0} | ${c['CHƯA CÓ TEST'] || 0} |`);
}
const epFunc = epRows.filter((e) => e.tcs.length).length;
rtm.push(`| Endpoint – test chức năng (ghi tên endpoint cụ thể) | ${epRows.length} | ${epFunc} | 0 | 0 | ${epRows.length - epFunc} |`);
rtm.push(`| Endpoint – test xác thực / phân quyền tham số hoá (${wildcard.map((t) => t.id).join(', ')}) | ${epRows.length} | ${epRows.length} | 0 | 0 | 0 |`, '');

rtm.push('## A. Use Case', '', '| Requirement ID | Module | Use Case | Feature | Kết luận code (01a) | Test Case ID | Test Type | Status |', '|---|---|---|---|---|---|---|---|');
for (const u of ucRows) rtm.push(`| ${u.id} | ${MODULES[u.mod] || u.mod} | ${u.id} | ${esc(u.name)} | ${esc(u.verdict)} | ${idsOf(u.tcs)} | ${typesOf(u.tcs)} | ${covStatus(u.tcs)} |`);
rtm.push('', '## B. Business Rule', '', '| Requirement ID | Nội dung (rút gọn) | Use Case | Test Case ID | Test Type | Status |', '|---|---|---|---|---|---|');
for (const b of brRows) {
  const ucs = [...new Set((b.tcs || []).flatMap(ucOf))].join(', ') || '—';
  rtm.push(`| ${esc(b.label)} | ${esc(b.text)} | ${ucs} | ${idsOf(b.tcs)} | ${typesOf(b.tcs)} | ${covStatus(b.tcs)} |`);
}
rtm.push('', '## C. Yêu cầu phi chức năng', '', '| Requirement ID | Mục Report 3 | Nội dung | Test Case ID | Test Type | Status |', '|---|---|---|---|---|---|');
for (const n of nfrRows) rtm.push(`| ${n.k} | ${n.sec} | ${esc(n.text)} | ${idsOf(n.tcs)} | ${typesOf(n.tcs)} | ${covStatus(n.tcs)} |`);
rtm.push('', '## D. Luồng liên module (System Test)', '', '| Requirement ID | Luồng | Test Case ID | Test Type | Status |', '|---|---|---|---|---|');
for (const f of flowRows) rtm.push(`| ${f.k} | ${esc(f.text)} | ${idsOf(f.tcs)} | ${typesOf(f.tcs)} | ${covStatus(f.tcs)} |`);
rtm.push('', '## E. Endpoint', '', `Mọi endpoint còn được ${wildcard.map((t) => t.id).join(', ')} kiểm 401 / 403 theo ma trận quyền. Cột "Test chức năng" chỉ tính test case ghi đúng endpoint đó.`, '',
  '| Controller | Method + đường dẫn | Quyền | Test chức năng | Có API test (HTTP) |', '|---|---|---|---|---|');
for (const e of epRows) rtm.push(`| ${e.ctrl} | \`${e.key}\` | ${esc(e.perm || e.other || 'đăng nhập')} | ${idsOf(e.tcs)} | ${e.tcs.some((t) => t.type === 'API' || t.type === 'System') ? 'Có' : 'Không'} |`);
const gaps = [...ucRows.filter((u) => !u.tcs).map((u) => u.id), ...brRows.filter((b) => !b.tcs).map((b) => b.label), ...nfrRows.filter((n) => !n.tcs).map((n) => n.k), ...flowRows.filter((f) => !f.tcs).map((f) => f.k)];
rtm.push('', '## F. Yêu cầu chưa có test', '', gaps.length ? gaps.map((g) => `- ${g}`).join('\n') : '- Không có. Mọi UC, BR, NFR, luồng đều có ít nhất một test case (kể cả Blocked / Skipped có lý do).');
const noFunc = epRows.filter((e) => !e.tcs.length);
rtm.push('', `Endpoint chưa có test chức năng riêng: ${noFunc.length} / ${epRows.length} (chủ yếu GET danh sách, tra cứu). Chúng vẫn được kiểm xác thực / phân quyền; test chức năng bổ sung ở Phase 5 theo ưu tiên.`, '');
fs.writeFileSync(path.join(QA, 'reports', '02_REQUIREMENT_TRACEABILITY_MATRIX.md'), rtm.join('\n') + '\n');

// ───────── 3. Thống kê ─────────
const sm = header('04 – Test Cases Summary', ['- Chi tiết từng test case: thư mục [test-cases](../test-cases/). Bản CSV: [testcases.csv](../test-cases/testcases.csv).']);
sm.push('## 1. Theo loại test và trạng thái', '', '| Test Type | Total | Passed | Failed | Blocked | Skipped | Not Run |', '|---|---:|---:|---:|---:|---:|---:|');
for (const ty of TYPES) { const t = TCS.filter((x) => x.type === ty); sm.push(`| ${ty} Test | ${t.length} | ${STATUSES.map((s) => count(t, (x) => x.status === s)).join(' | ')} |`); }
sm.push(`| **Tổng** | **${TCS.length}** | ${STATUSES.map((s) => `**${count(TCS, (x) => x.status === s)}**`).join(' | ')} |`, '');
sm.push('Passed / Failed = 0 vì Phase 2 chỉ thiết kế, chưa chạy.', '');
sm.push('## 2. Theo module', '', `| Module | ${TYPES.join(' | ')} | Tổng |`, `|---|${TYPES.map(() => '---:').join('|')}|---:|`);
for (const [code, name] of Object.entries(MODULES)) {
  const t = TCS.filter((x) => x.mod === code); if (!t.length) continue;
  sm.push(`| ${name} | ${TYPES.map((ty) => count(t, (x) => x.type === ty)).join(' | ')} | ${t.length} |`);
}
sm.push('', '## 3. Theo mức ưu tiên', '', '| Priority | Định nghĩa | Số test case |', '|---|---|---:|',
  `| Critical | Có thể làm sai dữ liệu kho, tài chính hoặc phá nghiệp vụ chính | ${count(TCS, (x) => x.pri === 'Critical')} |`,
  `| High | Chức năng nghiệp vụ quan trọng không hoạt động | ${count(TCS, (x) => x.pri === 'High')} |`,
  `| Medium | Chức năng sai trong một số điều kiện | ${count(TCS, (x) => x.pri === 'Medium')} |`,
  `| Low | Lỗi giao diện, ảnh hưởng nhỏ | ${count(TCS, (x) => x.pri === 'Low')} |`, '');
sm.push('## 4. Kỹ thuật thiết kế đã dùng', '', '| Kỹ thuật | Số test case |', '|---|---:|');
for (const [k, name] of Object.entries(TECH)) sm.push(`| ${name} (${k}) | ${count(TCS, (x) => (x.tech || []).includes(k))} |`);
sm.push('', '## 5. Bộ test có sẵn (tính là 1 test case đại diện mỗi bộ)', '', '| Test case đại diện | Bộ | Số ca bên trong | Lần chạy gần nhất (trước Phase 2) |', '|---|---|---:|---|',
  '| UT-MRP-001 | specs/mrp/unit-tests (MU-01..38) | 38 | 18/11/2026: 38/38 |',
  '| UT-PLN-001 | specs/production-planning-implementation/unit-tests | 79 | 15/11/2026: 79/79 |',
  '| API-PLN-001 | specs/production-planning-implementation/api-tests (pptest*.ps1) | 101 | 15–16/11/2026: 101 ca ghi đạt trong results*.json |',
  '| API-MRP-001 | specs/mrp/api-tests/mrptest.ps1 (MT-01..37) | 37 | 18/11/2026: 37/37 |', '',
  'Các kết quả trên là của lần chạy trước, không phải của Phase 2. Phase 3 / Phase 5 chạy lại và chuyển chúng vào bộ test chung.', '');
sm.push('## 6. Test case Blocked / Skipped', '', '| ID | Trạng thái | Lý do |', '|---|---|---|');
for (const t of TCS.filter((x) => x.status !== 'Not Run')) sm.push(`| ${t.id} | ${t.status} | ${esc(t.note)} |`);
sm.push('', '## 7. Nghi vấn cần test xác nhận (chưa phải lỗi)', '', '| Mã | Mức (dự kiến) | Nội dung | Yêu cầu | Chỗ trong code / tài liệu | Test xác nhận |', '|---|---|---|---|---|---|');
for (const s of SUSPECTS) sm.push(`| ${s.map(esc).join(' | ')} |`);
sm.push('', '## 8. Độ phủ thiết kế', '', '| Loại độ phủ | Giá trị |', '|---|---|',
  `| Use Case có test case | ${pct(ucRows.filter((u) => u.tcs).length, ucRows.length)} (${ucRows.filter((u) => u.tcs).length}/${ucRows.length}) – ${covLine(ucRows)} |`,
  `| Business Rule có test case | ${pct(brRows.filter((b) => b.tcs).length, brRows.length)} (${brRows.filter((b) => b.tcs).length}/${brRows.length}) – ${covLine(brRows)} |`,
  `| NFR có test case | ${pct(nfrRows.filter((n) => n.tcs).length, nfrRows.length)} (${nfrRows.filter((n) => n.tcs).length}/${nfrRows.length}) – ${covLine(nfrRows)} |`,
  `| Luồng liên module có System Test | ${pct(flowRows.filter((f) => (f.tcs || []).some((t) => t.type === 'System')).length, flowRows.length)} |`,
  `| Endpoint có test chức năng | ${pct(epFunc, epRows.length)} (${epFunc}/${epRows.length}) |`,
  `| Endpoint có test xác thực / phân quyền | 100% (${epRows.length}/${epRows.length}, tham số hoá) |`,
  '| Test case đã thực thi | 0% (Phase 2 chưa chạy) |', '| Code coverage | Chưa đo (cần công cụ, Phase 3) |', '');
fs.writeFileSync(path.join(QA, 'reports', '04_TEST_CASES_SUMMARY.md'), sm.join('\n') + '\n');

console.log(`OK: ${TCS.length} test case; UC ${ucRows.filter((u) => u.tcs).length}/${ucRows.length}; BR ${brRows.filter((b) => b.tcs).length}/${brRows.length}; NFR ${nfrRows.filter((n) => n.tcs).length}/${nfrRows.length}; FLOW ${flowRows.filter((f) => f.tcs).length}/${flowRows.length}; endpoint chức năng ${epFunc}/${epRows.length}`);
console.log(TYPES.map((ty) => `${ty}: ${count(TCS, (x) => x.type === ty)}`).join(', '));
if (gaps.length) console.log('Chưa có test: ' + gaps.join(', '));
