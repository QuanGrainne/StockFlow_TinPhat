// Dựng dữ liệu nghiệp vụ cho từng test qua API (Arrange). Mỗi bản ghi có hậu tố duy nhất để các test không đụng nhau.
import fs from 'node:fs';
import path from 'node:path';
import type { ApiSession } from './api';
import { RUN_DIR } from './env';
import { WAREHOUSES, type WarehouseCode } from './accounts';

export interface RunInfo {
  runId: string;
  startedAt: string;
  apiPid?: number;
  webPid?: number;
  devWriteCounterBefore: number | null;
  template: 'reused' | 'built' | 'skipped';
  frontend: 'reused' | 'built';
  migrations: number;
  accounts: Record<string, 'created' | 'exists'>;
  timingsMs: Record<string, number>;
}

export const RUN_FILE = path.join(RUN_DIR, 'run.json');

export function readRun(): RunInfo {
  return JSON.parse(fs.readFileSync(RUN_FILE, 'utf8')) as RunInfo;
}

let counter = 0;
/** Hậu tố duy nhất: mã lượt chạy + tiến trình worker + bộ đếm (vd 1123a1-0-3) */
export function uniqueSuffix(): string {
  counter += 1;
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `${readRun().runId}-${worker}-${counter}`;
}

export interface ProductDto {
  productId: number;
  code: string;
  name: string;
  standardPrice: number;
}

interface CategoryDto {
  categoryId: number;
  categoryName: string;
  isActive: boolean;
}

interface UnitDto {
  unitId: number;
  unitName: string;
}

/** Tạo hàng hóa thành phẩm, đơn vị "Cái", nhóm hàng đầu tiên đang hoạt động */
export async function createProduct(admin: ApiSession, opts: { suffix: string; price: number; namePrefix?: string }): Promise<ProductDto> {
  const cats = await admin.get<CategoryDto[]>('/api/products/categories');
  const cat = cats.find((c) => c.isActive) ?? cats[0];
  const units = await admin.get<UnitDto[]>('/api/products/units');
  const unit = units.find((u) => u.unitName === 'Cái') ?? units[0];
  const code = `E2E${opts.suffix.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`.slice(0, 40);
  return admin.post<ProductDto>('/api/products', {
    code,
    name: `${opts.namePrefix ?? 'Hàng E2E'} ${opts.suffix}`,
    type: 'FINISHED',
    categoryId: cat?.categoryId,
    baseUnitId: unit?.unitId,
    standardPrice: opts.price,
    costPrice: Math.round(opts.price * 0.6),
    isDirectSale: true,
  });
}

/** Thêm tồn bằng điều chỉnh tồn (ghi cả thẻ kho), dùng để chuẩn bị số tồn ban đầu */
export async function addStock(admin: ApiSession, productId: number, warehouse: WarehouseCode, quantity: number): Promise<void> {
  await admin.post(`/api/products/${productId}/stock-adjustments`, {
    warehouseId: WAREHOUSES[warehouse].id,
    quantity,
    mode: 'ADD',
    note: 'E2E arrange',
  });
}
