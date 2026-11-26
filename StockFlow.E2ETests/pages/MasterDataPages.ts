// Danh mục (UC-51): Hàng hóa (/products), Khách hàng (/customers), Nhà cung cấp (/suppliers), Định mức (/bom).
// Nhiều nhãn trên form không gắn với ô nhập (label không có htmlFor) nên dùng "ô nhập ngay sau chữ nhãn" (XPath following::).
import { expect, type Locator, type Page, type Response } from '@playwright/test';

/** Ô nhập (input / textarea / select) đứng ngay sau đoạn chữ nhãn trong phạm vi scope */
export function fieldAfter(scope: Locator, label: string, tag: 'input' | 'textarea' | 'select' = 'input'): Locator {
  return scope.locator(`xpath=.//*[normalize-space(text())="${label}"]/following::${tag}[1]`).first();
}

export class ProductsPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/products');
    await expect(this.page.getByRole('heading', { name: 'Hàng hóa', level: 1 })).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  /** Khung hộp tạo / sửa hàng hóa: khối nhỏ nhất chứa tiêu đề và nút Lưu */
  get modal(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { name: /^(Tạo hàng hóa|Chỉnh sửa hàng hóa)$/, level: 3 }) })
      .filter({ has: this.page.getByRole('button', { name: 'Lưu', exact: true }) })
      .last();
  }

  async openCreate(): Promise<void> {
    await this.page.getByRole('button', { name: 'Thêm mới' }).first().click();
    await expect(this.page.getByRole('heading', { name: 'Tạo hàng hóa', level: 3 })).toBeVisible();
  }

  get name(): Locator {
    return this.modal.getByPlaceholder('Bắt buộc');
  }

  get code(): Locator {
    return this.modal.getByPlaceholder('Tự động');
  }

  async chooseGroup(group: string): Promise<void> {
    await this.modal.getByText(/^Chọn nhóm hàng \(Bắt buộc\)$/).first().click();
    await this.modal.getByPlaceholder('Tìm kiếm nhóm hàng...').fill(group);
    // Mục khớp đúng tên nếu có, nếu không lấy mục đầu tiên bắt đầu bằng tên nhóm
    const exact = this.modal.getByText(group, { exact: true }).filter({ visible: true });
    const option = (await exact.count()) ? exact.last() : this.modal.getByText(new RegExp(`^${group}`)).filter({ visible: true }).first();
    await option.click();
  }

  get salePrice(): Locator {
    return fieldAfter(this.modal, 'Giá bán (VNĐ)');
  }

  get minStock(): Locator {
    return fieldAfter(this.modal, 'Định mức tồn thấp nhất');
  }

  /** Bấm Lưu; chờ POST / PUT /api/products (null nếu giao diện chặn trước khi gửi) */
  async save(timeout = 6_000): Promise<Response | null> {
    const res = this.page
      .waitForResponse((r) => ['POST', 'PUT', 'PATCH'].includes(r.request().method()) && /\/api\/products(\/\d+)?$/i.test(new URL(r.url()).pathname), { timeout })
      .catch(() => null);
    await this.modal.getByRole('button', { name: 'Lưu', exact: true }).click();
    return res;
  }

  async search(text: string): Promise<void> {
    const box = this.page.getByPlaceholder('Theo mã, tên hàng, mã vạch hoặc thương hiệu...');
    await box.fill(text);
    // Đóng danh sách gợi ý (ở màn rộng 1920 nó che dòng hàng)
    await box.press('Escape');
  }

  row(code: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) }).first();
  }

  async expand(code: string): Promise<void> {
    await this.search(code);
    await this.row(code).getByRole('cell', { name: code, exact: true }).click();
    await expect(this.page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).first()).toBeVisible();
  }
}

export class CustomersAdminPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/customers');
    await expect(this.page.getByRole('heading', { name: 'Khách hàng', level: 1 })).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  /** Hộp tạo / sửa khách hàng: khối nhỏ nhất có nhãn "Tên khách hàng" và nút "Bỏ qua" */
  get form(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByText('Tên khách hàng', { exact: true }) })
      .filter({ has: this.page.getByRole('button', { name: 'Bỏ qua' }) })
      .last();
  }

  async openCreate(): Promise<void> {
    await this.page.getByRole('heading', { name: 'Khách hàng', level: 1 }).locator('xpath=following::button[normalize-space()="Khách hàng"][1]').click();
    await expect(this.form.getByPlaceholder('Bắt buộc')).toBeVisible();
  }

  async fill(opts: { name?: string; code?: string; phone?: string }): Promise<void> {
    if (opts.name !== undefined) await this.form.getByPlaceholder('Bắt buộc').fill(opts.name);
    if (opts.code !== undefined) await this.form.getByPlaceholder('Tự động').fill(opts.code);
    if (opts.phone !== undefined) await fieldAfter(this.form, 'Điện thoại 1').fill(opts.phone);
  }

  async save(timeout = 6_000): Promise<Response | null> {
    const res = this.page
      .waitForResponse((r) => ['POST', 'PUT'].includes(r.request().method()) && /\/api\/customers(\/\d+)?$/i.test(new URL(r.url()).pathname), { timeout })
      .catch(() => null);
    await this.form.getByRole('button').filter({ hasText: /^(Lưu|Thêm|Tạo|Cập nhật)/ }).last().click();
    return res;
  }

  row(code: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) }).first();
  }

  async expand(code: string): Promise<void> {
    await this.page.getByPlaceholder('Theo mã, tên, số điện thoại').fill(code);
    await this.row(code).getByRole('cell', { name: code, exact: true }).click();
    await expect(this.page.getByRole('button', { name: 'Nợ cần thu từ khách' })).toBeVisible();
  }
}

export class SuppliersPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/suppliers');
    await expect(this.page.getByRole('heading', { name: 'Nhà cung cấp', level: 1 })).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  get form(): Locator {
    return this.page
      .locator('div')
      .filter({ has: this.page.getByRole('heading', { name: /nhà cung cấp$/i, level: 3 }) })
      .filter({ has: this.page.getByRole('button', { name: 'Lưu', exact: true }) })
      .last();
  }

  async openCreate(): Promise<void> {
    await this.page.getByRole('heading', { name: 'Nhà cung cấp', level: 1 }).locator('xpath=following::button[normalize-space()="Nhà cung cấp"][1]').click();
    await expect(this.page.getByRole('heading', { name: 'Thêm nhà cung cấp', level: 3 })).toBeVisible();
  }

  async save(timeout = 6_000): Promise<Response | null> {
    const res = this.page
      .waitForResponse((r) => ['POST', 'PUT'].includes(r.request().method()) && /\/api\/suppliers(\/\d+)?$/i.test(new URL(r.url()).pathname), { timeout })
      .catch(() => null);
    await this.form.getByRole('button', { name: 'Lưu', exact: true }).click();
    return res;
  }

  row(code: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) }).first();
  }

  async expand(code: string): Promise<void> {
    await this.page.getByPlaceholder('Theo mã, tên, điện thoại, email').fill(code);
    await this.row(code).getByRole('cell', { name: code, exact: true }).click();
    await expect(this.page.getByRole('button', { name: 'Nợ cần trả nhà cung cấp' })).toBeVisible();
  }
}

export class BomPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/bom');
    await expect(this.page.getByRole('heading', { name: 'Định mức sản phẩm', level: 1 })).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  async openCreate(): Promise<void> {
    await this.page.getByRole('button', { name: 'Thêm định mức' }).click();
    await expect(this.page.getByRole('heading', { name: 'Thêm định mức', level: 3 })).toBeVisible();
  }

  async chooseProduct(code: string): Promise<void> {
    await this.page.getByPlaceholder('Tìm thành phẩm theo mã hoặc tên').fill(code);
    await this.page.getByRole('button').filter({ hasText: code }).first().click();
  }

  async addMaterial(code: string): Promise<void> {
    await this.page.getByPlaceholder('Thêm nguyên vật liệu (mã hoặc tên)').fill(code);
    await this.page.getByRole('button').filter({ hasText: code }).first().click();
  }

  /** Dòng NVL trong form: [Định mức, Hao hụt] là các ô nhập của dòng */
  line(code: string): Locator {
    return this.page.getByRole('row').filter({ hasText: code }).filter({ has: this.page.getByRole('textbox') }).last();
  }

  async save(timeout = 6_000): Promise<Response | null> {
    const res = this.page
      .waitForResponse((r) => ['POST', 'PUT'].includes(r.request().method()) && /\/api\/production\/boms(\/\d+)?$/i.test(new URL(r.url()).pathname), { timeout })
      .catch(() => null);
    await this.page.getByRole('button', { name: 'Lưu định mức' }).click();
    return res;
  }
}
