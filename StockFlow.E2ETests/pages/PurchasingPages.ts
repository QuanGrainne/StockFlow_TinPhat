// Mua hàng: Đặt hàng nhập (/purchase-orders, /purchase-orders/create), Nhập hàng (/purchases, /purchases/create?po=),
// Trả hàng nhập (/purchase-returns/create?grId=). Selector theo nhãn / placeholder / chữ tiếng Việt trên giao diện thật.
import { expect, type Locator, type Page, type Response } from '@playwright/test';

const isApi = (r: Response, method: string, path: RegExp): boolean => r.request().method() === method && path.test(new URL(r.url()).pathname);

/** Dòng hàng trên form tạo phiếu: khối nhỏ nhất chứa mã hàng và nút xoá dòng */
function lineOf(page: Page, code: string, removeButton: string): Locator {
  return page.locator('div').filter({ hasText: code }).filter({ has: page.getByRole('button', { name: removeButton }) }).last();
}

async function fillNumber(input: Locator, value: number): Promise<void> {
  await input.click();
  await input.fill(String(value));
  await input.press('Tab');
}

export class PoListPage {
  readonly sidebar: Locator;
  readonly search: Locator;

  constructor(readonly page: Page) {
    this.sidebar = page.getByRole('complementary');
    this.search = page.getByPlaceholder('Theo mã phiếu, nhà cung cấp');
  }

  async goto(): Promise<void> {
    await this.page.goto('/purchase-orders');
    await expect(this.page.getByRole('heading', { name: 'Đặt hàng nhập', level: 1 })).toBeVisible();
  }

  /** Dòng dữ liệu của phiếu (ô mã đúng bằng mã phiếu; không lấy dòng chi tiết mở rộng) */
  row(code: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }

  /** Các dòng dữ liệu đang hiện (ô thứ 2 là mã PDN…) */
  dataRows(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: /^PDN\d+$/ }) });
  }

  /** Dòng chi tiết mở rộng (có nút "Đóng") */
  panel(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('button', { name: 'Đóng', exact: true }) });
  }

  async open(code: string): Promise<Locator> {
    await this.row(code).getByRole('cell', { name: code, exact: true }).click();
    const panel = this.panel();
    await expect(panel.getByText(code).first()).toBeVisible();
    await expect(panel.getByRole('button', { name: 'Thông tin' })).toBeVisible();
    return panel;
  }

  status(label: string): Locator {
    return this.sidebar.getByRole('checkbox', { name: label, exact: true });
  }

  /** Chỉ để lại các trạng thái được chọn */
  async onlyStatuses(labels: string[]): Promise<void> {
    for (const l of ['Phiếu tạm', 'Đã đặt hàng', 'Nhập một phần', 'Hoàn thành', 'Đã hủy']) {
      const box = this.status(l);
      if (labels.includes(l)) await box.check();
      else await box.uncheck();
    }
  }

  get supplier(): Locator {
    return this.sidebar.getByRole('combobox');
  }

  /** Bộ lọc thời gian: mở hộp chọn nhanh (đang hiện nhãn hiện tại) rồi chọn mốc */
  async pickTime(current: string, preset: string): Promise<void> {
    await this.sidebar.getByText(current, { exact: true }).click();
    await this.page.getByRole('button', { name: preset, exact: true }).click();
    await expect(this.sidebar.getByText(preset, { exact: true })).toBeVisible();
  }
}

/** Form phiếu đặt hàng nhập (tạo mới / sửa ?edit=) */
export class PoFormPage {
  readonly search: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByPlaceholder(/^Tìm hàng hóa theo mã hoặc tên/);
  }

  async gotoCreate(): Promise<void> {
    await this.page.goto('/purchase-orders/create');
    await expect(this.search).toBeVisible();
  }

  async addProduct(code: string): Promise<void> {
    await this.search.fill(code);
    await this.page.getByText(code, { exact: true }).first().click();
    await expect(this.line(code)).toBeVisible();
  }

  line(code: string): Locator {
    return lineOf(this.page, code, 'Xóa hàng hóa khỏi phiếu');
  }

  /** Ô dòng: [Ghi chú, Số lượng, Đơn giá] */
  qty(code: string): Locator {
    return this.line(code).getByRole('textbox').nth(1);
  }

  price(code: string): Locator {
    return this.line(code).getByRole('textbox').nth(2);
  }

  async setQty(code: string, v: number): Promise<void> {
    await fillNumber(this.qty(code), v);
  }

  async setPrice(code: string, v: number): Promise<void> {
    await fillNumber(this.price(code), v);
  }

  async pickSupplier(code: string, name: string): Promise<void> {
    const box = this.page.getByPlaceholder('Tìm nhà cung cấp');
    await box.fill(code);
    await this.page.getByRole('complementary').getByText(name).first().click();
    await expect(this.page.getByRole('complementary').getByText(name).first()).toBeVisible();
  }

  /** Bấm nút lưu (Lưu tạm / Đặt hàng); chờ request lưu phiếu nếu có */
  async save(button: 'Lưu tạm' | 'Đặt hàng'): Promise<Response | null> {
    const res = this.page
      .waitForResponse((r) => isApi(r, 'POST', /\/api\/purchase-orders$/) || isApi(r, 'PUT', /\/api\/purchase-orders\/\d+$/), { timeout: 8_000 })
      .catch(() => null);
    await this.page.getByRole('button', { name: button, exact: true }).click();
    return res;
  }
}

/** Form nhập hàng (/purchases/create, có thể kèm ?po=) */
export class ReceiptFormPage {
  constructor(readonly page: Page) {}

  line(code: string): Locator {
    return lineOf(this.page, code, 'Xóa hàng hóa khỏi phiếu');
  }

  /** Ô dòng: [Ghi chú, SL nhận, SL lỗi, Đơn giá] */
  received(code: string): Locator {
    return this.line(code).getByRole('textbox').nth(1);
  }

  defect(code: string): Locator {
    return this.line(code).getByRole('textbox', { name: /^SL lỗi/ });
  }

  /** Ô Đơn giá của dòng (ô thứ 4: Ghi chú, SL nhận, SL lỗi, Đơn giá) */
  price(code: string): Locator {
    return this.line(code).getByRole('textbox').nth(3);
  }

  async setPrice(code: string, v: number): Promise<void> {
    await fillNumber(this.price(code), v);
  }

  async setReceived(code: string, v: number): Promise<void> {
    await fillNumber(this.received(code), v);
  }

  async setDefect(code: string, v: number): Promise<void> {
    await fillNumber(this.defect(code), v);
  }

  /** Bấm Hoàn thành → hộp xác nhận (tiêu đề "Xác nhận hoàn thành nhập kho" hoặc "Nhập vượt số lượng phiếu đặt") */
  async openComplete(): Promise<Locator> {
    await this.page.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
    const title = this.page.getByText(/^(Xác nhận hoàn thành nhập kho|Nhập vượt số lượng phiếu đặt)$/);
    await expect(title).toBeVisible();
    return title;
  }

  async confirmComplete(): Promise<Response> {
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => isApi(r, 'POST', /\/api\/purchases$/i)),
      // Hộp thường: "Đồng ý hoàn thành"; hộp cảnh báo nhập vượt: "Vẫn nhập hàng"
      this.page.getByRole('button', { name: /^(Đồng ý hoàn thành|Vẫn nhập hàng)$/ }).click(),
    ]);
    return res;
  }
}

export class ReceiptListPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/purchases');
    await expect(this.page.getByRole('heading', { name: 'Nhập hàng', level: 1 })).toBeVisible();
  }

  async open(code: string): Promise<void> {
    await this.page.getByPlaceholder('Theo mã phiếu, số PO, mã hoặc tên NCC...').fill(code);
    await this.page.getByRole('cell', { name: code, exact: true }).click();
    await expect(this.page.getByRole('button', { name: 'Lịch sử trả hàng' })).toBeVisible();
  }
}

export class PurchaseReturnFormPage {
  constructor(readonly page: Page) {}

  line(code: string): Locator {
    return this.page.locator('div').filter({ hasText: code }).filter({ has: this.page.getByTitle('Bỏ hàng hóa khỏi phiếu') }).last();
  }

  async setQty(code: string, v: number): Promise<void> {
    await fillNumber(this.line(code).getByRole('textbox').first(), v);
  }

  async complete(): Promise<Response> {
    await this.page.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
    await expect(this.page.getByText(/^Xác nhận trả hàng (nhập|lỗi)$/)).toBeVisible();
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => isApi(r, 'POST', /\/api\/purchase-?returns$/i)),
      this.page.getByRole('button', { name: 'Đồng ý hoàn thành', exact: true }).click(),
    ]);
    return res;
  }
}
