// Đọc NAV_GROUPS trong StockFlow_Frontend/src/lib/navigation/navbar.ts để biết nhóm menu nào chứa chức năng nào.
// Đọc thẳng file nguồn (không chép lại cấu hình) để kỳ vọng của test luôn khớp với frontend đang chạy.
import fs from 'node:fs';
import path from 'node:path';
import { FRONTEND_DIR } from '../fixtures/env';

export interface NavGroupInfo {
  label: string;
  featureIds: string[];
}

let cache: NavGroupInfo[] | undefined;

export function navGroups(): NavGroupInfo[] {
  if (cache) return cache;
  const src = fs.readFileSync(path.join(FRONTEND_DIR, 'src', 'lib', 'navigation', 'navbar.ts'), 'utf8');
  const start = src.indexOf('export const NAV_GROUPS');
  const end = src.indexOf('\n];', start);
  if (start < 0 || end < 0) throw new Error('Không tìm thấy NAV_GROUPS trong navbar.ts');
  const body = src.slice(start, end);
  const groups: NavGroupInfo[] = [];
  // Nhóm có "label:", mục con có "featureId:"; gán featureId cho nhóm đứng trước nó
  for (const m of body.matchAll(/\b(label|featureId):\s*'([^']+)'/g)) {
    if (m[1] === 'label') groups.push({ label: m[2], featureIds: [] });
    else if (groups.length) groups[groups.length - 1].featureIds.push(m[2]);
  }
  if (!groups.length) throw new Error('NAV_GROUPS rỗng');
  cache = groups;
  return groups;
}

/** Nhóm menu phải hiện với tập chức năng được phép */
export function expectedGroups(allowed: Iterable<string>): string[] {
  const set = new Set(allowed);
  return navGroups().filter((g) => g.featureIds.some((f) => set.has(f))).map((g) => g.label);
}

export function allGroupLabels(): string[] {
  return navGroups().map((g) => g.label);
}
