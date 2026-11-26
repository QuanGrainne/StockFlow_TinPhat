// Chuyển hàng: tạo phiếu (/transfers/create), danh sách (/transfers), nhận hàng (ReceiveTransferScreen).
import { expect, type Locator, type Page, type Response } from '@playwright/test';

export class TransferCreatePage {
  readonly search: Locator;
  readonly destination: Locator;
  readonly completeButton: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByPlaceholder('Tìm hàng hóa theo mã hoặc tên');
    // Ô "Chuyển tới *" là select duy nhất trên màn tạo phiếu
    this.destination = page.getByRole('complementary').getByRole('combobox');
    this.completeButton = page.getByRole('button', { name: 'Hoàn thành', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/transfers/create');
    await expect(this.search).toBeVisible();
  }

  /** Gợi ý hàng hóa là khối chữ (không phải nút): bấm vào mã hàng */
  async addProduct(code: string): Promise<void> {
    await this.search.fill(code);
    await this.page.getByText(code, { exact: true }).first().click();
    await expect(this.line(code)).toBeVisible();
  }

  /** Dòng hàng: khối nhỏ nhất chứa mã hàng và nút "Xóa hàng hóa khỏi phiếu" */
  line(code: string): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: code })
      .filter({ has: this.page.getByRole('button', { name: 'Xóa hàng hóa khỏi phiếu' }) })
      .last();
  }

  /** Ô "SL chuyển": ô nhập thứ hai của dòng (sau ô "Ghi chú...") */
  async setQuantity(code: string, qty: number): Promise<void> {
    const input = this.line(code).getByRole('textbox').nth(1);
    await input.fill(String(qty));
    await input.press('Tab');
    await expect(input).toHaveValue(String(qty));
  }

  /** Tiêu đề hộp xác nhận gặp ở lần bấm Hoàn thành gần nhất */
  lastConfirmTitle = '';

  /** Bấm Hoàn thành → hộp "Xác nhận hoàn thành chuyển hàng" (hoặc "Cảnh báo tồn kho xuất chuyển" khi vượt tồn)
   *  → "Đồng ý tiếp tục"; trả về phản hồi POST /api/transfers */
  async complete(): Promise<Response> {
    await this.completeButton.click();
    const title = this.page.getByText(/^(Xác nhận hoàn thành chuyển hàng|Cảnh báo tồn kho xuất chuyển)$/);
    await expect(title).toBeVisible();
    this.lastConfirmTitle = (await title.innerText()).trim();
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => /\/api\/transfers$/i.test(new URL(r.url()).pathname) && r.request().method() === 'POST'),
      this.page.getByRole('button', { name: 'Đồng ý tiếp tục' }).click(),
    ]);
    return res;
  }
}

export class TransferListPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/transfers');
    await expect(this.page.getByRole('heading', { name: 'Chuyển hàng', level: 1 })).toBeVisible();
  }

  row(code: string): Locator {
    return this.page.getByRole('row').filter({ hasText: code });
  }

  /** Mở chi tiết dòng rồi bấm "Nhận hàng" để vào màn nhận hàng */
  async openReceive(code: string): Promise<void> {
    await this.row(code).first().click();
    await this.page.getByRole('button', { name: 'Nhận hàng', exact: true }).first().click();
    await expect(this.page.getByText('Ghi chú nhận')).toBeVisible();
  }

  /** Ô thời gian nhận hàng (datetime-local, chưa có nhãn → nằm trong danh sách đề xuất data-testid) */
  async setReceiveTime(value: string): Promise<void> {
    const input = this.page.locator('input[type="datetime-local"]');
    await expect(input).toHaveCount(1);
    await input.fill(value);
    await expect(input).toHaveValue(value);
  }

  /** Bấm "Nhận hàng" trên màn nhận hàng; trả về phản hồi POST /api/transfers/{id}/receive */
  async confirmReceive(): Promise<Response> {
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => /\/api\/transfers\/\d+\/receive$/i.test(new URL(r.url()).pathname) && r.request().method() === 'POST'),
      this.page.getByRole('button', { name: 'Nhận hàng', exact: true }).last().click(),
    ]);
    return res;
  }
}
