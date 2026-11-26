// Vai trò (/roles), Ma trận phân quyền chức năng (/roles/permissions), Phân quyền kho (/roles/warehouses).
import { expect, type Locator, type Page } from '@playwright/test';
import { WAREHOUSES, type WarehouseCode } from '../fixtures/accounts';

/** Thứ tự cột vai trò trong ma trận: [chức năng, ADMIN, MANAGER, SALES, WAREHOUSE, PRODUCTION] */
export const MATRIX_COLUMN = { ADMIN: 1, MANAGER: 2, SALES: 3, WAREHOUSE: 4, PRODUCTION: 5 } as const;
export type MatrixRole = keyof typeof MATRIX_COLUMN;

export class RolesPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/roles');
    await expect(this.page.getByRole('heading', { name: 'Danh mục vai trò phân quyền' })).toBeVisible();
  }

  /** Thẻ vai trò: khối nhỏ nhất chứa tiêu đề vai trò và nút "Cấu hình quyền" */
  card(roleName: string): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { name: roleName, level: 3, exact: true }) })
      .filter({ has: this.page.getByRole('button', { name: 'Cấu hình quyền' }) })
      .last();
  }

  /** Số nhân sự hiển thị trên thẻ ("N nhân sự") */
  async userCount(roleName: string): Promise<number> {
    const t = (await this.card(roleName).innerText()).match(/(\d+)\s+nhân sự/);
    return t ? Number(t[1]) : NaN;
  }

  modal(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { name: /^(Thêm vai trò mới|Chỉnh sửa vai trò)$/ }) })
      .filter({ has: this.page.getByRole('button', { name: /^(Thêm mới|Lưu thay đổi)$/ }) })
      .last();
  }

  async create(name: string, code: string): Promise<void> {
    await this.page.getByRole('button', { name: '+ Tạo vai trò' }).click();
    await this.page.getByPlaceholder('VD: Giám sát vùng').fill(name);
    await this.page.getByPlaceholder('VD: ROLE_SUPERVISOR').fill(code);
    await this.modal().getByRole('button', { name: 'Thêm mới' }).click();
  }

  async rename(currentName: string, newName: string): Promise<void> {
    await this.card(currentName).getByRole('button', { name: 'Chỉnh sửa vai trò' }).click();
    await expect(this.page.getByRole('heading', { name: 'Chỉnh sửa vai trò' })).toBeVisible();
    await this.modal().getByRole('textbox').first().fill(newName);
    await this.modal().getByRole('button', { name: 'Lưu thay đổi' }).click();
  }
}

export class PermissionMatrixPage {
  readonly saveButton: Locator;

  constructor(readonly page: Page) {
    this.saveButton = page.getByRole('button', { name: 'Lưu', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/roles/permissions');
    await expect(this.page.getByRole('heading', { name: 'Phân quyền vai trò' })).toBeVisible();
    await expect(this.page.getByRole('columnheader', { name: /SALES/ })).toBeVisible();
  }

  /** Dòng chức năng (tiêu đề + mô tả), khác dòng nhóm chỉ có tiêu đề */
  featureRow(title: string): Locator {
    return this.page.getByRole('row', { name: new RegExp(`^${title}\\s+\\S`) }).first();
  }

  cell(title: string, role: MatrixRole): Locator {
    return this.featureRow(title).getByRole('cell').nth(MATRIX_COLUMN[role]);
  }

  /** "(n/28)" trên tiêu đề cột vai trò */
  async headerCount(role: MatrixRole): Promise<{ on: number; total: number }> {
    const t = (await this.page.getByRole('columnheader', { name: new RegExp(`\\b${role}\\b`) }).innerText()).match(/\((\d+)\/(\d+)\)/);
    return { on: Number(t?.[1] ?? NaN), total: Number(t?.[2] ?? NaN) };
  }

  async save(): Promise<number> {
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => /\/api\/roles\/feature-matrix$/i.test(new URL(r.url()).pathname) && r.request().method() === 'PUT'),
      this.saveButton.click(),
    ]);
    return res.status();
  }
}

export class WarehouseAccessPage {
  readonly search: Locator;
  readonly warehouseFilter: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByPlaceholder('Tìm nhân sự theo tên, mã NV...');
    this.warehouseFilter = page.getByRole('combobox').filter({ has: page.getByRole('option', { name: 'Tất cả kho cơ sở' }) });
  }

  async goto(): Promise<void> {
    await this.page.goto('/roles/warehouses');
    await expect(this.page.getByRole('heading', { name: 'Danh sách phân quyền kho' })).toBeVisible();
  }

  row(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  /** Các dòng nhân sự (có nút "Phân quyền kho") */
  staffRows(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('button', { name: 'Phân quyền kho' }) });
  }

  async open(name: string): Promise<Locator> {
    await this.search.fill(name);
    await this.row(name).getByRole('button', { name: 'Phân quyền kho' }).click();
    const modal = this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { name: 'Phân quyền kho cho nhân sự' }) })
      .filter({ has: this.page.getByRole('button', { name: 'Lưu phân quyền' }) })
      .last();
    await expect(modal).toBeVisible();
    return modal;
  }

  checkbox(modal: Locator, code: WarehouseCode): Locator {
    return modal.getByRole('checkbox', { name: new RegExp(`${WAREHOUSES[code].name} ${code}`) });
  }
}
