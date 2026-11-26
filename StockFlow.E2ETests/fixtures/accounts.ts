// Tài khoản dùng trong E2E. Tài khoản seed có sẵn từ DatabaseSeeder; tài khoản e2e.* được tạo qua API bằng Admin
// (quyết định 9). Mật khẩu là mật khẩu mặc định khi tạo nhân viên, đọc từ E2E_DEFAULT_PASSWORD, không ghi trong code.
import type { ApiSession } from './api';

/** Mã kho → id trong DatabaseSeeder (kiểm lại trong global setup) */
export const WAREHOUSES = {
  K001: { id: 3, name: 'Kho Tổng Gia Lâm' },
  K002: { id: 4, name: 'Kho Đông Anh' },
  K003: { id: 5, name: 'Kho Hà Đông' },
  K004: { id: 6, name: 'Kho Hoàn Kiếm' },
} as const;
export type WarehouseCode = keyof typeof WAREHOUSES;

/** Tài khoản seed: actor Report 5.3 → vai trò → kho được gán sẵn */
export const SEEDED = {
  admin: { username: 'admin', role: 'Admin', warehouses: ['K001', 'K002', 'K003', 'K004'] },
  manager: { username: 'manager01', role: 'Manager', warehouses: ['K001', 'K002', 'K003'] },
  sales: { username: 'sales01', role: 'SalesStaff', warehouses: ['K001', 'K003'] },
  warehouse: { username: 'whstaff01', role: 'WarehouseStaff', warehouses: ['K001', 'K002'] },
  production: { username: 'prodstaff01', role: 'ProductionStaff', warehouses: ['K002'] },
} as const;

export interface CreatedAccount {
  username: string;
  name: string;
  role: 'SalesStaff' | 'WarehouseStaff' | 'ProductionStaff' | 'Manager';
  warehouses: WarehouseCode[];
  phone: string;
}

/** Tài khoản phụ tạo mỗi lượt chạy (database được dựng lại nên tên cố định không trùng) */
export const E2E_ACCOUNTS = {
  whK001: { username: 'e2e.wh.k001', name: 'E2E Thủ kho K001', role: 'WarehouseStaff', warehouses: ['K001'], phone: '0960000001' },
  whK002: { username: 'e2e.wh.k002', name: 'E2E Thủ kho K002', role: 'WarehouseStaff', warehouses: ['K002'], phone: '0960000002' },
  whK002b: { username: 'e2e.wh.k002b', name: 'E2E Thủ kho K002 (2)', role: 'WarehouseStaff', warehouses: ['K002'], phone: '0960000003' },
  noWarehouse: { username: 'e2e.nowh', name: 'E2E Không kho', role: 'SalesStaff', warehouses: [], phone: '0960000004' },
  manager2: { username: 'e2e.manager2', name: 'E2E Quản lý 2', role: 'Manager', warehouses: ['K001', 'K002'], phone: '0960000005' },
} as const satisfies Record<string, CreatedAccount>;

interface StaffRow {
  id: string;
  username?: string | null;
  status: string;
}

export async function listStaff(admin: ApiSession): Promise<StaffRow[]> {
  return admin.get<StaffRow[]>('/api/staff');
}

/** Tạo tài khoản qua API; đã có (lượt chạy không dựng lại DB) thì bỏ qua */
export async function createAccount(admin: ApiSession, a: CreatedAccount, existing?: StaffRow[]): Promise<'created' | 'exists'> {
  const rows = existing ?? (await listStaff(admin));
  if (rows.some((r) => (r.username ?? '').toLowerCase() === a.username)) return 'exists';
  await admin.post('/api/staff', {
    username: a.username,
    name: a.name,
    phone: a.phone,
    email: `${a.username}@e2e.stockflow.test`,
    role: a.role,
    assignedWarehouses: a.warehouses,
  });
  return 'created';
}

export async function ensureE2EAccounts(admin: ApiSession): Promise<Record<string, 'created' | 'exists'>> {
  const rows = await listStaff(admin);
  const out: Record<string, 'created' | 'exists'> = {};
  for (const a of Object.values(E2E_ACCOUNTS)) out[a.username] = await createAccount(admin, a, rows);
  return out;
}
