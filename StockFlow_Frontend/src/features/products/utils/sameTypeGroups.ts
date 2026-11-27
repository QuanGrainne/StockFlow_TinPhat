// Hàng hóa cùng loại (kiểu KiotViet):
// - Mỗi giá trị thuộc tính (VD màu xanh, màu đỏ) là MỘT HÀNG RIÊNG có tồn kho riêng; các hàng cùng loại gắn chung
//   mã nhóm (groupCode trong variants_json). Đơn vị quy đổi (set, bịch...) là dòng con trong từng hàng.
// - Danh sách hàng hóa gộp các hàng cùng nhóm thành một dòng cha "(n) Mã hàng".
// - Ô tìm kiếm gợi ý theo từng đơn vị của hàng (mã riêng, giá và tồn theo đơn vị đó), giống màn Bán hàng.
import type {
  GoodsAttributeDef,
  GoodsItem,
  GoodsUnitConversion,
  GoodsVariantItem,
} from '../types/goodsCatalog';

const sameText = (a: string | undefined, b: string | undefined) =>
  (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

/** Bỏ trùng (không phân biệt hoa thường), giữ thứ tự xuất hiện đầu tiên */
export function uniqueValues(values: (string | undefined | null)[]): string[] {
  const out: string[] = [];
  values.forEach((v) => {
    const t = (v ?? '').trim();
    if (t && !out.some((x) => sameText(x, t))) out.push(t);
  });
  return out;
}

export function includesValue(list: string[], value: string | undefined): boolean {
  return !!value && list.some((x) => sameText(x, value));
}

/**
 * Tên chung của nhóm: phần đầu giống nhau của tên các hàng, cắt ở ranh giới từ và bỏ dấu nối thừa.
 * VD "Set tốt nghiệp cô-thầy - áo trắng" + "Set tốt nghiệp cô-thầy - áo xanh" → "Set tốt nghiệp cô-thầy".
 */
export function commonGroupName(names: string[]): string {
  const list = names.map((n) => n.trim()).filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  let prefix = list[0];
  for (const n of list.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < n.length && prefix[i].toLowerCase() === n[i].toLowerCase()) i++;
    prefix = prefix.slice(0, i);
  }
  // Đang cắt giữa một từ (VD "áo tr|ắng") → lùi về hết từ trước
  const cutInsideWord = list.some((n) => n.length > prefix.length && /[\p{L}\p{N}]/u.test(n[prefix.length] ?? '') && /[\p{L}\p{N}]$/u.test(prefix));
  if (cutInsideWord) prefix = prefix.slice(0, Math.max(0, prefix.lastIndexOf(' ')));
  prefix = prefix.replace(/[\s\-–,/(]+$/u, '').trim();
  return prefix.length >= 3 ? prefix : list[0];
}

/** Bỏ đuôi " - <giá trị>" khỏi tên hàng (VD "Thẻ cắm - xanh" → "Thẻ cắm") */
export function stripValueSuffix(name: string, value: string | undefined): string {
  if (!value) return name.trim();
  const re = new RegExp(`\\s*[-–]\\s*${value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'iu');
  return name.replace(re, '').trim() || name.trim();
}

/**
 * Giá trị thuộc tính của một hàng: lấy từ thuộc tính đã lưu (hàng import có đúng 1 giá trị),
 * không có thì lấy phần tên sau tên chung của nhóm.
 */
export function attributeValueOf(item: GoodsItem, groupName?: string): string | undefined {
  const values = item.attributes?.[0]?.values ?? [];
  if (values.length === 1 && values[0].trim()) return values[0].trim();
  if (groupName && item.name.toLowerCase().startsWith(groupName.toLowerCase())) {
    const rest = item.name.slice(groupName.length).replace(/^[\s\-–]+/u, '').trim();
    if (rest) return rest;
  }
  return undefined;
}

/**
 * Tên chung của các hàng cùng loại: bỏ đuôi giá trị thuộc tính của từng hàng (VD " - áo trắng") rồi lấy phần chung.
 * Không cắt theo chữ giống nhau trong giá trị ("áo trắng" / "áo xanh" không ra "... - áo").
 */
export function groupDisplayName(members: GoodsItem[]): string {
  const names = members.map((m) => {
    const values = m.attributes?.[0]?.values ?? [];
    return values.length === 1 ? stripValueSuffix(m.name, values[0]) : m.name.trim();
  });
  return commonGroupName(names);
}

// ─── Danh sách: gộp hàng cùng nhóm thành dòng cha ───

export type CatalogEntry =
  | { kind: 'item'; item: GoodsItem }
  | { kind: 'group'; key: string; name: string; members: GoodsItem[] }
  /** Một đơn vị quy đổi hiện thành dòng riêng khi tìm đúng nó (VD SP004330 = bịch của SP004328); ownerHidden = dòng hàng chính không hiện */
  | { kind: 'unit'; item: GoodsItem; unit: UnitSuggestion; ownerHidden: boolean };

/**
 * Gộp các hàng (đã lọc) cùng mã nhóm thành một dòng cha, đặt ở vị trí của hàng đầu tiên trong nhóm.
 * Nhóm chỉ còn 1 hàng sau khi lọc thì hiện thẳng hàng đó (giống KiotViet).
 */
export function groupCatalogEntries(items: GoodsItem[]): CatalogEntry[] {
  const byGroup = new Map<string, GoodsItem[]>();
  items.forEach((it) => {
    if (!it.groupCode) return;
    const key = it.groupCode.trim().toUpperCase();
    byGroup.set(key, [...(byGroup.get(key) ?? []), it]);
  });
  const placed = new Set<string>();
  const entries: CatalogEntry[] = [];
  items.forEach((it) => {
    const key = it.groupCode?.trim().toUpperCase();
    const members = key ? byGroup.get(key) ?? [] : [];
    if (!key || members.length < 2) {
      entries.push({ kind: 'item', item: it });
      return;
    }
    if (placed.has(key)) return;
    placed.add(key);
    const sorted = [...members].sort((a, b) => a.code.localeCompare(b.code));
    entries.push({ kind: 'group', key, name: groupDisplayName(sorted), members: sorted });
  });
  return entries;
}

/** Hàng khớp từ khóa bằng thông tin của chính nó (mã, tên, nhóm, mã vạch, thương hiệu), không tính mã đơn vị quy đổi */
function itemSelfMatches(item: GoodsItem, q: string): boolean {
  return (
    item.name.toLowerCase().includes(q) ||
    item.code.toLowerCase().includes(q) ||
    (item.subCategory ?? '').toLowerCase().includes(q) ||
    (item.barcode ?? '').toLowerCase().includes(q) ||
    (item.brand ?? '').toLowerCase().includes(q)
  );
}

/**
 * Các dòng của danh sách hàng hóa. Đang tìm kiếm thì mỗi đơn vị quy đổi khớp từ khóa (theo mã của nó, hoặc
 * "tên + đơn vị" khi từ khóa có nhắc tới đơn vị) hiện thành một dòng riêng như một hàng hóa (kiểu KiotViet);
 * hàng chính chỉ hiện khi chính nó khớp từ khóa.
 */
export function buildCatalogEntries(items: GoodsItem[], query: string): CatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return groupCatalogEntries(items);

  const shown: GoodsItem[] = [];
  const unitHits = new Map<string, UnitSuggestion[]>();
  for (const item of items) {
    const hits = unitRowsOf(item).filter(
      (r) =>
        r.rate !== 1 &&
        r.code.toUpperCase() !== item.code.toUpperCase() &&
        (r.code.toLowerCase().includes(q) ||
          (`${item.name} ${r.unitName}`.toLowerCase().includes(q) && !item.name.toLowerCase().includes(q)))
    );
    if (hits.length > 0) unitHits.set(item.id, hits);
    if (itemSelfMatches(item, q) || hits.length === 0) shown.push(item);
  }

  const entries = groupCatalogEntries(shown);
  for (const item of items) {
    const hits = unitHits.get(item.id);
    if (!hits) continue;
    const at = entries.findIndex(
      (e) => (e.kind === 'item' && e.item.id === item.id) || (e.kind === 'group' && e.members.some((m) => m.id === item.id))
    );
    const ownerHidden = !shown.includes(item);
    const rows: CatalogEntry[] = hits.map((unit) => ({ kind: 'unit', item, unit, ownerHidden }));
    if (at >= 0) entries.splice(at + 1, 0, ...rows);
    else entries.push(...rows);
  }
  return entries;
}

// ─── Tìm kiếm: gợi ý theo từng đơn vị ───

export interface UnitSuggestion {
  key: string;
  item: GoodsItem;
  /** Mã của đúng đơn vị này (hàng chưa có đơn vị quy đổi: mã hàng) */
  code: string;
  unitName: string;
  /** Số đơn vị cơ bản trong 1 đơn vị này */
  rate: number;
  salePrice: number;
}

/** Các dòng đơn vị của một hàng (hàng chưa thiết lập đơn vị: 1 dòng đơn vị cơ bản) */
export function unitRowsOf(item: GoodsItem): UnitSuggestion[] {
  const variants = item.variants ?? [];
  if (variants.length === 0) {
    return [{ key: item.id, item, code: item.code, unitName: item.uom, rate: 1, salePrice: item.standardPrice || 0 }];
  }
  // Hàng kiểu cũ có nhiều giá trị thuộc tính trong cùng một hàng: mỗi giá trị một dòng hệ số 1 với mã riêng → giữ mã đó
  const baseRows = variants.filter((v) => !(v.conversionRate > 1)).length;
  return variants.map((v, i) => {
    const rate = v.conversionRate > 0 ? v.conversionRate : 1;
    // Đơn vị cơ bản chính là hàng: mã = mã hàng, giá = giá bán của hàng (như cột Giá bán của bảng).
    // Hàng tạo từ bản cũ có thể lưu mã đơn vị cơ bản sai (VD "SP") → bấm gợi ý sẽ lọc theo "SP" ra gần hết danh mục.
    const isBase = rate === 1 && baseRows === 1;
    return {
      key: `${item.id}-${v.code || v.unitName || i}`,
      item,
      code: isBase ? item.code : v.code || item.code,
      unitName: v.unitName || item.uom,
      rate,
      salePrice: isBase ? item.standardPrice || v.salePrice || 0 : v.salePrice || 0,
    };
  });
}

/** Một dòng đơn vị có khớp từ khóa không: mã, mã vạch của đơn vị, hoặc "tên hàng + tên đơn vị" (VD "hồng bịch") */
export function unitRowMatches(row: UnitSuggestion, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return false;
  const variant =
    row.item.variants?.find((v) => (v.code || row.item.code) === row.code && v.unitName === row.unitName) ??
    (row.rate === 1 ? row.item.variants?.find((v) => v.unitName === row.unitName && !(v.conversionRate > 1)) : undefined);
  return (
    row.code.toLowerCase().includes(q) ||
    (variant?.barcode ?? '').toLowerCase().includes(q) ||
    `${row.item.name} ${row.unitName}`.toLowerCase().includes(q) ||
    (row.rate === 1 &&
      ((row.item.barcode ?? '').toLowerCase().includes(q) ||
        row.item.code.toLowerCase().includes(q) ||
        (row.item.brand ?? '').toLowerCase().includes(q)))
  );
}

/** Gợi ý ô tìm kiếm: mỗi đơn vị khớp từ khóa là một dòng (trong các hàng đã qua bộ lọc) */
export function unitSuggestionsOf(items: GoodsItem[], query: string, limit = 30): UnitSuggestion[] {
  if (!query.trim()) return [];
  const out: UnitSuggestion[] = [];
  for (const item of items) {
    for (const row of unitRowsOf(item)) {
      if (unitRowMatches(row, query)) out.push(row);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// ─── Lưu cấu hình hàng cùng loại ───

/**
 * variants_json ghi thẳng (để giữ mã nhóm): khóa gốc viết thường, khóa từng phần tử viết hoa chữ đầu
 * như backend (ProductConversionUnitDto / ProductAttributeDto / ProductVariantItemDto) đọc.
 */
export function buildVariantsJson(cfg: {
  units: GoodsUnitConversion[];
  attributes: GoodsAttributeDef[];
  variants: GoodsVariantItem[];
  supplier?: string;
  groupCode?: string;
}): string {
  return JSON.stringify({
    units: cfg.units.map((u) => ({
      Name: u.name,
      ConversionRate: u.conversionRate,
      IsBase: u.isBase,
      IsDirectSale: u.isDirectSale ?? true,
      RefUnitName: u.refUnitName ?? null,
      RefRate: u.refRate ?? null,
    })),
    attributes: cfg.attributes.map((a) => ({ Name: a.name, Values: a.values })),
    variants: cfg.variants.map((v) => ({
      AttributeValue: v.attributeValue ?? null,
      UnitName: v.unitName,
      ConversionRate: v.conversionRate,
      Code: v.code || null,
      Barcode: v.barcode || null,
      CostPrice: v.costPrice || 0,
      SalePrice: v.salePrice || 0,
      Stock: v.stock || 0,
    })),
    supplier: cfg.supplier?.trim() || null,
    groupCode: cfg.groupCode?.trim() || null,
  });
}

export interface SameTypeSplit {
  /** Giá trị thuộc tính của chính hàng đang sửa (không có = hàng chưa có thuộc tính) */
  ownValue?: string;
  ownAttributes: GoodsAttributeDef[];
  ownRows: GoodsVariantItem[];
  /** Giá trị mới chưa có hàng: mỗi giá trị sẽ tạo thành một hàng riêng cùng nhóm */
  newGroups: { value: string; rows: GoodsVariantItem[] }[];
}

/**
 * Tách cấu hình trong modal thành phần của chính hàng này và các giá trị thuộc tính mới.
 * Giá trị của hàng này = giá trị đã khóa lúc mở (ownLocked), chưa có thì giá trị đầu tiên chưa thuộc hàng khác.
 */
export function splitSameTypeConfig(
  attributes: GoodsAttributeDef[],
  variants: GoodsVariantItem[],
  siblingValues: string[],
  ownLocked?: string
): SameTypeSplit {
  const first = attributes[0];
  const values = first?.values ?? [];
  const ownValue = ownLocked ?? values.find((v) => !includesValue(siblingValues, v));
  const newValues = values.filter((v) => !sameText(v, ownValue) && !includesValue(siblingValues, v));
  const ownRows = variants.filter((v) => (ownValue ? sameText(v.attributeValue, ownValue) : !v.attributeValue));
  return {
    ownValue,
    ownAttributes: ownValue && first ? [{ name: first.name, values: [ownValue] }] : [],
    ownRows,
    newGroups: newValues
      .map((value) => ({ value, rows: variants.filter((v) => sameText(v.attributeValue, value)) }))
      .filter((g) => g.rows.length > 0),
  };
}
