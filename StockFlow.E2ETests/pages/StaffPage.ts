// Màn Nhân viên (/staff, features/admin/screens/StaffAccountsScreen.tsx). Bảng HTML thường; dòng có "@<username>".
// Form thêm / sửa: các ô nhập theo thứ tự [mã NV, họ tên, tên đăng nhập, mật khẩu, điện thoại, email, chức danh],
// vai trò là select (không có lựa chọn rỗng), kho là checkbox.
import { expect, type Locator, type Page } from '@playwright/test';
import { WAREHOUSES, type WarehouseCode } from '../fixtures/accounts';

/** Nhãn vai trò trong select của form nhân viên */
export const ROLE_OPTION = {
  Manager: 'Quản lý (ROLE_MANAGER)',
  SalesStaff: 'Nhân viên bán hàng (ROLE_SALES)',
  WarehouseStaff: 'Nhân viên kho (ROLE_WAREHOUSE)',
  ProductionStaff: 'Nhân viên sản xuất (ROLE_PRODUCTION)',
} as const;
export type RoleKey = keyof typeof ROLE_OPTION;

export interface StaffForm {
  name?: string;
  username?: string;
  password?: string;
  phone?: string;
  email?: string;
  role?: RoleKey;
  warehouses?: WarehouseCode[];
}

export class StaffPage {
  readonly search: Locator;
  readonly statusFilter: Locator;
  readonly roleFilter: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByPlaceholder('Tìm theo tên, mã nv, email...');
    this.statusFilter = page.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Tất cả trạng thái' }) });
    this.roleFilter = page.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Tất cả vai trò' }) });
  }

  async goto(): Promise<void> {
    await this.page.goto('/staff');
    await expect(this.page.getByRole('heading', { name: 'Danh sách tài khoản nhân viên' })).toBeVisible();
    await expect(this.page.getByRole('row').nth(1)).toBeVisible();
  }

  row(username: string): Locator {
    return this.page.getByRole('row').filter({ hasText: `@${username}` });
  }

  /** Các dòng dữ liệu (bỏ dòng tiêu đề) */
  dataRows(): Locator {
    return this.page.getByRole('row').filter({ hasText: /@\S/ });
  }

  cell(username: string, index: number): Locator {
    return this.row(username).getByRole('cell').nth(index);
  }

  /** Ô VAI TRÒ (cột thứ 4) */
  roleCell(username: string): Locator {
    return this.cell(username, 3);
  }

  /** Form đang mở (tạo mới hoặc cập nhật) */
  modal(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { name: /^(Tạo tài khoản mới|Cập nhật tài khoản nhân viên)$/ }) })
      .filter({ has: this.page.getByRole('button', { name: /^(Thêm mới|Lưu thay đổi)$/ }) })
      .last();
  }

  private field(index: number): Locator {
    return this.modal().getByRole('textbox').nth(index);
  }

  async openCreate(): Promise<void> {
    await this.page.getByRole('button', { name: '+ Thêm nhân viên' }).click();
    await expect(this.page.getByRole('heading', { name: 'Tạo tài khoản mới' })).toBeVisible();
  }

  async openEdit(username: string): Promise<void> {
    await this.row(username).getByRole('button', { name: 'Chỉnh sửa nhân viên' }).click();
    await expect(this.page.getByRole('heading', { name: 'Cập nhật tài khoản nhân viên' })).toBeVisible();
  }

  async fill(f: StaffForm): Promise<void> {
    if (f.name !== undefined) await this.field(1).fill(f.name);
    if (f.username !== undefined) await this.field(2).fill(f.username);
    if (f.password !== undefined) await this.field(3).fill(f.password);
    if (f.phone !== undefined) await this.field(4).fill(f.phone);
    if (f.email !== undefined) await this.field(5).fill(f.email);
    if (f.role !== undefined) await this.modal().getByRole('combobox').selectOption({ label: ROLE_OPTION[f.role] });
    if (f.warehouses !== undefined) {
      for (const [code, w] of Object.entries(WAREHOUSES)) {
        const box = this.modal().getByRole('checkbox', { name: new RegExp(`${w.name} \\(${code}\\)`) });
        if (f.warehouses.includes(code as WarehouseCode)) await box.check();
        else await box.uncheck();
      }
    }
  }

  /** Bấm "Thêm mới" / "Lưu thay đổi"; trả về mã phản hồi API nếu có request */
  async submit(): Promise<number | null> {
    const button = this.modal().getByRole('button', { name: /^(Thêm mới|Lưu thay đổi)$/ });
    const resp = this.page
      .waitForResponse((r) => /\/api\/staff(\/[^/]+)?$/i.test(new URL(r.url()).pathname) && ['POST', 'PUT'].includes(r.request().method()), { timeout: 5_000 })
      .catch(() => null);
    await button.click();
    const r = await resp;
    return r ? r.status() : null;
  }

  async lock(username: string, fullName: string): Promise<void> {
    await this.search.fill(fullName);
    await expect(this.row(username)).toHaveCount(1);
    await this.row(username).getByRole('button', { name: 'Khóa tài khoản' }).click();
  }

  async toggleStatus(username: string, buttonName: 'Khóa tài khoản' | 'Mở khóa tài khoản'): Promise<number> {
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => /\/api\/staff\/[^/]+\/toggle-status$/i.test(new URL(r.url()).pathname)),
      this.row(username).getByRole('button', { name: buttonName }).click(),
    ]);
    return res.status();
  }
}
