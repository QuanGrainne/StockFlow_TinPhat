// Màn bán hàng POS (/pos, features/pos/screens/PosScreen.tsx): hóa đơn, đặt hàng, trả hàng.
// Ô số lượng của dòng hàng và ô tiền khách trả chưa có tên truy cập → nằm trong danh sách đề xuất data-testid.
import { expect, type Locator, type Page, type Response } from '@playwright/test';

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class PosPage {
  readonly search: Locator;
  readonly payButton: Locator;
  readonly bookingButton: Locator;
  readonly cashRadio: Locator;
  readonly transferRadio: Locator;
  readonly customerSearch: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByPlaceholder(/^Tìm hàng (hóa|trả) \(F3\)$/);
    this.payButton = page.getByRole('button', { name: /^THANH TOÁN/ });
    this.bookingButton = page.getByRole('button', { name: /^(ĐẶT HÀNG|LƯU ĐƠN ĐẶT HÀNG)/ });
    this.cashRadio = page.getByRole('radio', { name: 'Tiền mặt' });
    this.transferRadio = page.getByRole('radio', { name: 'Chuyển khoản' });
    this.customerSearch = page.getByPlaceholder('Tìm khách hàng (F4)');
  }

  async goto(query = ''): Promise<void> {
    await this.page.goto(`/pos${query}`);
    await expect(this.search).toBeVisible();
  }

  /** Chi nhánh đang bán (nút "Kho làm việc <tên>" trên thanh POS) */
  branchLabel(): Locator {
    return this.page.getByRole('button', { name: /^Kho làm việc/i });
  }

  async switchToBooking(): Promise<void> {
    await this.page.getByRole('button', { name: 'Chuyển sang đặt hàng' }).click();
    await expect(this.bookingButton).toBeVisible();
  }

  /** Tìm theo mã và bấm gợi ý (gợi ý là nút chứa mã hàng) */
  async addProduct(code: string): Promise<void> {
    await this.search.fill(code);
    await this.page.getByRole('button', { name: new RegExp(escapeRe(code)) }).click();
    await expect(this.cartLine(code)).toBeVisible();
  }

  async selectCustomer(name: string): Promise<void> {
    await this.customerSearch.fill(name);
    await this.page.getByRole('button', { name: new RegExp(escapeRe(name)) }).first().click();
    await expect(this.page.getByTitle('Bỏ chọn khách hàng').first()).toBeVisible();
  }

  /** Dòng hàng trong giỏ: khối nhỏ nhất chứa mã hàng và nút "Xóa hàng" */
  cartLine(code: string): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: code })
      .filter({ has: this.page.getByRole('button', { name: 'Xóa hàng' }) })
      .last();
  }

  qtyInput(code: string): Locator {
    return this.cartLine(code).getByRole('textbox').first();
  }

  async setQuantity(code: string, qty: number): Promise<void> {
    const input = this.qtyInput(code);
    await input.fill(String(qty));
    await input.press('Tab');
  }

  /** Nút đơn giá của dòng (bấm để mở hộp Đơn giá / Giảm giá / Giá bán) */
  priceButton(code: string): Locator {
    return this.cartLine(code).getByRole('button', { name: /^[\d.]+$/ }).first();
  }

  /** Hộp giá của dòng (Đơn giá / Giảm giá / Giá bán) */
  async openPriceBox(code: string): Promise<Locator> {
    await this.priceButton(code).click();
    const box = this.page
      .locator('div')
      .filter({ has: this.page.getByText('Đơn giá', { exact: true }) })
      .filter({ has: this.page.getByText('Giảm giá', { exact: true }) })
      .filter({ visible: true })
      .last();
    await expect(box).toBeVisible();
    return box;
  }

  /** Đổi đơn giá ở ô "Đơn giá" của hộp giá. Trả về null nếu ô Đơn giá chỉ đọc (vd khi sửa đơn đặt). */
  async setUnitPrice(code: string, price: string): Promise<Locator | null> {
    const box = await this.openPriceBox(code);
    const baseRow = box.locator('div').filter({ has: this.page.getByText('Đơn giá', { exact: true }) }).last();
    if ((await baseRow.getByRole('textbox').count()) === 0) return null;
    const input = baseRow.getByRole('textbox').first();
    await input.fill(price);
    await input.press('Tab');
    return input;
  }

  /** Đổi giá bán của dòng: sửa "Đơn giá" nếu được; nếu Đơn giá chỉ đọc (sửa đơn đặt) thì nhập "Giảm giá" (VND)
   *  = đơn giá hiện tại − giá mới. Mở hộp giá đúng MỘT lần (nút giá bật / tắt hộp). Trả về cách đã dùng. */
  async changeLinePrice(code: string, currentPrice: number, newPrice: number): Promise<'unit-price' | 'discount'> {
    const box = await this.openPriceBox(code);
    const baseRow = box.locator('div').filter({ has: this.page.getByText('Đơn giá', { exact: true }) }).last();
    if ((await baseRow.getByRole('textbox').count()) > 0) {
      await baseRow.getByRole('textbox').first().fill(String(newPrice));
      await baseRow.getByRole('textbox').first().press('Tab');
      return 'unit-price';
    }
    const row = box.locator('div').filter({ has: this.page.getByText('Giảm giá', { exact: true }) }).last();
    await row.getByRole('button', { name: 'VND' }).click();
    const input = row.getByRole('textbox').last();
    await input.fill(String(currentPrice - newPrice));
    await input.press('Tab');
    return 'discount';
  }

  /** Ô tiền khách trả: ô nhập cạnh nhãn "Khách thanh toán" / "Khách trả trước" / "Khách trả thêm" */
  paidInput(): Locator {
    return this.page
      .getByRole('complementary')
      .locator('div')
      .filter({ has: this.page.getByText(/^(Khách thanh toán|Khách trả trước|Khách trả thêm)$/) })
      .last()
      .getByRole('textbox');
  }

  /** Giữ tên cũ cho spec pilot */
  customerPaid(): Locator {
    return this.paidInput();
  }

  async setPaid(amount: number): Promise<void> {
    await this.paidInput().fill(String(amount));
    await this.paidInput().press('Tab');
  }

  async pay(): Promise<Response> {
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => r.url().endsWith('/api/orders/pos') && r.request().method() === 'POST'),
      this.payButton.click(),
    ]);
    return res;
  }

  /** Bấm THANH TOÁN khi có thể bị chặn ở giao diện: trả về phản hồi hoặc null nếu không có request */
  async tryPay(timeout = 5_000): Promise<Response | null> {
    const resp = this.page.waitForResponse((r) => r.url().endsWith('/api/orders/pos') && r.request().method() === 'POST', { timeout }).catch(() => null);
    await this.payButton.click();
    return resp;
  }

  /** Bấm ĐẶT HÀNG / LƯU ĐƠN ĐẶT HÀNG: trả về phản hồi hoặc null nếu giao diện chặn (không gửi request) */
  async submitBooking(timeout = 5_000): Promise<Response | null> {
    const resp = this.page
      .waitForResponse((r) => /\/api\/sales-bookings(\/\d+)?$/.test(new URL(r.url()).pathname) && ['POST', 'PUT'].includes(r.request().method()), { timeout })
      .catch(() => null);
    await this.bookingButton.click();
    return resp;
  }
}
