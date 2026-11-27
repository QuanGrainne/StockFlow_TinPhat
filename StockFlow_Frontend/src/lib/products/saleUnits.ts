// src/lib/products/saleUnits.ts
// Đơn vị bán của hàng (bán theo đơn vị quy đổi, 26/11/2026): đọc từ variants_json (units + variants),
// cùng quy tắc với backend ProductSaleUnits – đơn vị cơ bản đứng đầu (hệ số 1), sau đó các đơn vị quy đổi.
// Dùng chung: POS (lưu đơn vị trên hóa đơn) và phiếu nhập / chuyển / kiểm kho (chọn đơn vị khi nhập liệu, lưu quy về đơn vị cơ bản).

/** Một đơn vị của hàng: đơn vị cơ bản (rate 1) hoặc đơn vị quy đổi (VD "túi (10 bịch/túi)", rate 10) */
export interface SaleUnitOption {
  name: string;
  /** Số đơn vị cơ bản trong 1 đơn vị này */
  rate: number;
  isBase: boolean;
  /** Mã hàng của đơn vị (VD SP004346); null = mã hàng chính */
  code?: string | null;
  /** Giá bán đã thiết lập cho đơn vị (0 = theo bảng giá × hệ số) */
  salePrice: number;
}

type JsonRecord = Record<string, unknown>;

const isRecord = (v: unknown): v is JsonRecord => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Lấy thuộc tính không phân biệt hoa thường (backend ghi "Name", import ghi "Name", form cũ ghi "name") */
function prop(o: JsonRecord, name: string): unknown {
  const key = Object.keys(o).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? o[key] : undefined;
}

const str = (o: JsonRecord, name: string): string | undefined => {
  const v = prop(o, name);
  return typeof v === 'string' ? v : undefined;
};

const num = (o: JsonRecord, name: string): number | undefined => {
  const v = prop(o, name);
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
};

/**
 * Đơn vị bán từ variantsJson. Hàng chưa thiết lập → chỉ đơn vị cơ bản.
 * @param baseUom ĐVT cơ bản của hàng; @param baseCode mã hàng chính
 */
export function parseSaleUnits(variantsJson: string | null | undefined, baseUom: string, baseCode: string): SaleUnitOption[] {
  const base: SaleUnitOption = { name: baseUom || 'Cái', rate: 1, isBase: true, code: baseCode, salePrice: 0 };
  if (!variantsJson) return [base];
  let root: unknown;
  try {
    root = JSON.parse(variantsJson);
  } catch {
    return [base];
  }
  if (!isRecord(root)) return [base];

  // Mã + giá bán theo tên đơn vị (dòng đầu tiên của mỗi đơn vị)
  const byUnit = new Map<string, { code?: string; price: number }>();
  const variants = prop(root, 'variants');
  if (Array.isArray(variants)) {
    variants.filter(isRecord).forEach((v) => {
      const unitName = str(v, 'UnitName');
      if (!unitName || byUnit.has(unitName.toLowerCase())) return;
      byUnit.set(unitName.toLowerCase(), { code: str(v, 'Code'), price: num(v, 'SalePrice') ?? 0 });
    });
  }

  const result: SaleUnitOption[] = [];
  const units = prop(root, 'units');
  if (Array.isArray(units)) {
    units.filter(isRecord).forEach((u) => {
      const name = str(u, 'Name')?.trim();
      if (!name) return;
      const isBase = prop(u, 'IsBase') === true;
      const rate = isBase ? 1 : num(u, 'ConversionRate') ?? 1;
      if (!(rate > 0)) return;
      const info = byUnit.get(name.toLowerCase());
      result.push({ name, rate, isBase, code: info?.code ?? null, salePrice: info?.price ?? 0 });
    });
  }

  const jsonBase = result.find((u) => u.isBase);
  const baseUnit: SaleUnitOption = jsonBase ? { ...jsonBase, rate: 1, code: jsonBase.code || baseCode } : base;
  const seen = new Set([baseUnit.name.toLowerCase()]);
  const others = result.filter((u) => {
    if (u.isBase || seen.has(u.name.toLowerCase())) return false;
    seen.add(u.name.toLowerCase());
    return true;
  });
  return [baseUnit, ...others];
}
