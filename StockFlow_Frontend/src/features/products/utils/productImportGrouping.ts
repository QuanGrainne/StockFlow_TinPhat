// src/features/products/utils/productImportGrouping.ts
// Chuyển file danh mục hàng hóa (mẫu xuất từ KiotViet) thành danh sách hàng để import.
//
// File KiotViet ghi MỖI đơn vị tính và MỖI biến thể thành một dòng có mã riêng:
// - Dòng có "Mã ĐVT Cơ bản" là ĐƠN VỊ QUY ĐỔI của dòng cơ bản (VD SP004330 "bịch (10set/bịch)" = 10 × SP004328).
//   Tồn của dòng này chỉ là tồn cơ bản / quy đổi (cùng một lượng hàng) → không tạo hàng riêng, không lấy tồn,
//   gộp vào hàng cơ bản thành đơn vị quy đổi (giữ mã KiotViet của dòng làm mã hàng cùng loại).
// - Dòng có "Thuộc tính" (VD "MÀU:áo trắng") là biến thể có tồn riêng → vẫn là một hàng thật, tên ghép thêm
//   giá trị thuộc tính. Các dòng cùng "Mã HH Liên quan" được gắn chung mã nhóm (groupCode) để tab
//   "Hàng hóa cùng loại" hiện đủ cả nhóm.
// Kết quả là danh sách hàng cơ bản, mỗi hàng kèm variantsJson cùng định dạng backend ghi (khóa con viết hoa đầu).

import type { ImportProductItemPayload } from '../services/goodsCatalogService';

export type ImportCell = string | number | boolean | null | undefined;

export interface ProductImportOptions {
  targetWarehouse: string;
}

export interface ProductImportResult {
  products: ImportProductItemPayload[];
  /** Số dòng đơn vị quy đổi đã gộp vào hàng cơ bản */
  mergedUnitRows: number;
  /** Số nhóm hàng cùng loại */
  groupCount: number;
  /** Dòng đơn vị quy đổi không tìm thấy dòng cơ bản trong file → import như hàng riêng */
  orphanUnitRows: number;
  /** Dòng hàng (không phải dòng đơn vị quy đổi) bỏ trống tên: hàng mới thì phải chặn (SYS-PRD-N02) */
  unnamedRows: { line: number; code: string }[];
}

interface ParsedRow {
  line: number;
  code: string;
  name: string;
  /** Ô "Tên hàng" để trống (name đã tạm lấy theo mã) */
  nameMissing: boolean;
  category: string;
  brand: string;
  uom: string;
  baseCode: string;
  rate: number;
  attrs: { name: string; value: string }[];
  related: string;
  salePrice?: number;
  costPrice?: number;
  stock?: number;
  minStock?: number;
  maxStock?: number;
  weight?: number;
  location: string;
  description: string;
  image: string;
  isActive: boolean;
  isDirectSale: boolean;
}

/** Tìm cột: trùng tên trước (không phân biệt hoa thường), không có thì cột đầu tiên chứa chuỗi */
function columnFinder(header: string[]) {
  const norm = header.map((h) => String(h ?? '').trim().toLowerCase());
  return (...names: string[]): number => {
    for (const n of names) {
      const i = norm.indexOf(n.toLowerCase());
      if (i !== -1) return i;
    }
    for (const n of names) {
      const i = norm.findIndex((h) => h.includes(n.toLowerCase()));
      if (i !== -1) return i;
    }
    return -1;
  };
}

function text(row: ImportCell[], idx: number): string {
  if (idx < 0) return '';
  const v = row[idx];
  return v === null || v === undefined ? '' : String(v).trim();
}

/** Số trong ô Excel (số thật hoặc chuỗi "1,234.5"); ô trống / sai → undefined */
function num(row: ImportCell[], idx: number): number | undefined {
  if (idx < 0) return undefined;
  const v = row[idx];
  if (typeof v === 'number') return Number.isFinite(v) ? v : undefined;
  const s = String(v ?? '').trim().replace(/,/g, '');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** "MÀU:áo trắng|SIZE:L" → [{MÀU, áo trắng}, {SIZE, L}] */
function parseAttributes(raw: string): { name: string; value: string }[] {
  if (!raw) return [];
  return raw
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const i = part.indexOf(':');
      return i === -1
        ? { name: 'Thuộc tính', value: part }
        : { name: part.slice(0, i).trim() || 'Thuộc tính', value: part.slice(i + 1).trim() };
    })
    .filter((a) => a.value);
}

const round = (n: number) => Math.round(n * 1000) / 1000;

export function buildProductImport(
  header: string[],
  rows: ImportCell[][],
  options: ProductImportOptions
): ProductImportResult {
  const col = columnFinder(header);
  const idx = {
    category: col('nhóm hàng(3 cấp)', 'nhóm hàng'),
    code: col('mã hàng'),
    name: col('tên hàng'),
    brand: col('thương hiệu'),
    salePrice: col('giá bán'),
    costPrice: col('giá vốn'),
    stock: col('tồn kho'),
    minStock: col('tồn nhỏ nhất'),
    maxStock: col('tồn lớn nhất'),
    uom: col('đvt'),
    baseCode: col('mã đvt cơ bản'),
    rate: col('quy đổi'),
    attrs: col('thuộc tính'),
    related: col('mã hh liên quan'),
    image: col('hình ảnh (url1,url2...)', 'hình ảnh'),
    weight: col('trọng lượng'),
    location: col('vị trí'),
    description: col('mô tả'),
    isActive: col('đang kinh doanh'),
    isDirectSale: col('được bán trực tiếp', 'bán trực tiếp'),
  };

  const parsed: ParsedRow[] = [];
  rows.forEach((row, i) => {
    if (!row || row.length === 0) return;
    const code = text(row, idx.code);
    const name = text(row, idx.name);
    if (!code && !name) return;
    const activeRaw = num(row, idx.isActive);
    const directRaw = num(row, idx.isDirectSale);
    parsed.push({
      line: i + 2,
      code: code || `SP${Date.now()}${i}`,
      name: name || code,
      nameMissing: !name,
      category: text(row, idx.category) || 'Hàng hóa',
      brand: text(row, idx.brand),
      uom: text(row, idx.uom) || 'Cái',
      baseCode: text(row, idx.baseCode),
      rate: num(row, idx.rate) ?? 1,
      attrs: parseAttributes(text(row, idx.attrs)),
      related: text(row, idx.related),
      salePrice: num(row, idx.salePrice),
      costPrice: num(row, idx.costPrice),
      stock: num(row, idx.stock),
      minStock: num(row, idx.minStock),
      maxStock: num(row, idx.maxStock),
      weight: num(row, idx.weight),
      location: text(row, idx.location),
      description: text(row, idx.description),
      image: text(row, idx.image),
      isActive: activeRaw === undefined ? true : activeRaw === 1,
      isDirectSale: directRaw === undefined ? true : directRaw === 1,
    });
  });

  const byCode = new Map(parsed.map((r) => [r.code.toUpperCase(), r]));
  // Dòng đơn vị quy đổi: có mã ĐVT cơ bản (khác chính nó) và dòng cơ bản có trong file
  const isUnitRow = (r: ParsedRow) =>
    !!r.baseCode && r.baseCode.toUpperCase() !== r.code.toUpperCase() && byCode.has(r.baseCode.toUpperCase());
  const unitsByBase = new Map<string, ParsedRow[]>();
  let orphanUnitRows = 0;
  for (const r of parsed) {
    if (isUnitRow(r)) {
      const key = r.baseCode.toUpperCase();
      unitsByBase.set(key, [...(unitsByBase.get(key) ?? []), r]);
    } else if (r.baseCode && r.baseCode.toUpperCase() !== r.code.toUpperCase()) {
      orphanUnitRows++;
    }
  }
  // Mã được DÒNG HÀNG THẬT khác nhắc tới ở "Mã HH Liên quan" = gốc của một nhóm hàng cùng loại.
  // Dòng đơn vị quy đổi cũng ghi mã liên quan (= hàng cơ bản của nó) nhưng không tạo nhóm.
  const referenced = new Set(
    parsed.filter((r) => r.related && !isUnitRow(r)).map((r) => r.related.toUpperCase())
  );

  const groups = new Set<string>();
  const products: ImportProductItemPayload[] = [];
  for (const base of parsed) {
    if (isUnitRow(base)) continue;

    const attrSuffix = base.attrs.map((a) => a.value).join(' - ');
    const name = attrSuffix && !base.name.endsWith(attrSuffix) ? `${base.name} - ${attrSuffix}` : base.name;
    const unitRows = unitsByBase.get(base.code.toUpperCase()) ?? [];
    const groupCode = base.related || (referenced.has(base.code.toUpperCase()) ? base.code : undefined);
    if (groupCode) groups.add(groupCode.toUpperCase());

    let variantsJson: string | undefined;
    if (unitRows.length > 0 || base.attrs.length > 0 || groupCode) {
      // Tên đơn vị phải khác nhau (bảng hàng cùng loại ghép theo tên đơn vị)
      const usedNames = new Set([base.uom.toLowerCase()]);
      const unitEntries = unitRows.map((u) => {
        let unitName = u.uom || 'Đơn vị';
        if (usedNames.has(unitName.toLowerCase())) unitName = `${unitName} (${u.code})`;
        usedNames.add(unitName.toLowerCase());
        return { row: u, unitName, rate: u.rate > 0 ? u.rate : 1 };
      });
      const firstAttr = base.attrs[0]?.value;
      const baseCost = base.costPrice ?? 0;
      const baseSale = base.salePrice ?? 0;
      const stock = base.stock ?? 0;
      const units = [
        { Name: base.uom, ConversionRate: 1, IsBase: true, IsDirectSale: base.isDirectSale },
        ...unitEntries.map((u) => ({ Name: u.unitName, ConversionRate: u.rate, IsBase: false, IsDirectSale: u.row.isDirectSale })),
      ];
      const variants = [
        {
          AttributeValue: firstAttr,
          UnitName: base.uom,
          ConversionRate: 1,
          Code: base.code,
          Barcode: '',
          CostPrice: baseCost,
          SalePrice: baseSale,
          Stock: stock,
        },
        ...unitEntries.map((u) => ({
          AttributeValue: firstAttr,
          UnitName: u.unitName,
          ConversionRate: u.rate,
          Code: u.row.code,
          Barcode: '',
          CostPrice: u.row.costPrice ?? round(baseCost * u.rate),
          SalePrice: u.row.salePrice ?? round(baseSale * u.rate),
          Stock: round(stock / u.rate),
        })),
      ];
      const attributes = base.attrs.map((a) => ({ Name: a.name, Values: [a.value] }));
      variantsJson = JSON.stringify({ units, attributes, variants, groupCode });
    }

    products.push({
      code: base.code,
      name,
      categoryName: base.category,
      brand: base.brand,
      uom: base.uom,
      standardPrice: base.salePrice,
      costPrice: base.costPrice,
      // Giữ đúng số trong file, kể cả tồn âm (khớp KiotViet)
      stockQuantity: base.stock ?? 0,
      minSafeStock: base.minStock ?? 0,
      maxSafeStock: base.maxStock ?? 999999999,
      barcode: base.code,
      description: base.description,
      weight: base.weight ?? 0,
      locationName: base.location,
      imageUrl: base.image,
      isActive: base.isActive,
      isDirectSale: base.isDirectSale,
      warehouseName: options.targetWarehouse,
      variantsJson,
    });
  }

  return {
    products,
    mergedUnitRows: parsed.filter(isUnitRow).length,
    groupCount: groups.size,
    orphanUnitRows,
    unnamedRows: parsed.filter((r) => r.nameMissing && !isUnitRow(r)).map((r) => ({ line: r.line, code: r.code })),
  };
}
