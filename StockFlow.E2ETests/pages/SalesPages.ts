// Đặt hàng (/sales-booking), Duyệt hạn mức (/approvals), Trả hàng (/sales-returns), Khách hàng (/customers).
import { expect, type Locator, type Page } from '@playwright/test';

export class BookingListPage {
  readonly search: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByPlaceholder('Theo mã phiếu đặt, khách hàng, điện thoại');
  }

  async goto(): Promise<void> {
    await this.page.goto('/sales-booking');
    await expect(this.page.getByRole('heading', { name: 'Đặt hàng', level: 1 })).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  row(code: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }

  /** Dòng dữ liệu: có ô chứa mã đặt hàng dạng DH... */
  dataRows(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: /^DH\d+/ }) });
  }

  status(label: 'Phiếu tạm' | 'Hoàn thành' | 'Đã hủy'): Locator {
    return this.page.getByRole('checkbox', { name: label, exact: true });
  }

  /** Mở chi tiết: bấm vào ô mã (bấm giữa dòng có thể trúng link khách hàng) */
  async expand(code: string): Promise<void> {
    await this.row(code).getByRole('cell', { name: code, exact: true }).click();
    await expect(this.page.getByRole('button', { name: 'Sao chép' })).toBeVisible();
  }

  async select(code: string): Promise<void> {
    await this.row(code).getByRole('checkbox').check();
  }
}

export class ApprovalsPage {
  readonly search: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByPlaceholder('Theo mã yêu cầu, mã hoặc tên khách hàng');
  }

  async goto(): Promise<void> {
    await this.page.goto('/approvals');
    await expect(this.page.getByRole('heading', { name: 'Duyệt hạn mức', level: 1 })).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  row(text: string): Locator {
    return this.page.getByRole('row').filter({ hasText: text });
  }

  /** Mở dòng yêu cầu (chi tiết hiện ngay dưới dòng: Thông tin / Mua hàng / Thanh toán, nút In / Từ chối / Duyệt) */
  async open(text: string): Promise<void> {
    await this.search.fill(text);
    await this.row(text).first().click();
    await expect(this.page.getByText('Lý do gửi yêu cầu')).toBeVisible();
  }

  /** Bấm "Duyệt" / "Từ chối" ở dòng, chọn phương án trong hộp quyết định (nếu có), nhập ghi chú / lý do, xác nhận */
  async decide(decision: 'Duyệt nâng hạn mức' | 'Từ chối', note?: string, newLimit?: number): Promise<number | null> {
    const action = decision === 'Từ chối' ? 'Từ chối' : 'Duyệt';
    await this.page.getByRole('button', { name: action, exact: true }).first().click();
    const option = this.page.getByRole('button', { name: new RegExp(`^${decision}\\s`) });
    if (await option.count()) await option.first().click();
    if (newLimit !== undefined) {
      // Nhãn thật là "Hạn mức mới *" (có dấu * bắt buộc): ô nhập ngay sau nhãn
      const limitBox = this.page.locator('xpath=//div[starts-with(normalize-space(),"Hạn mức mới")]/following::input[1]').filter({ visible: true }).first();
      await expect(limitBox).toBeVisible();
      await limitBox.fill(String(newLimit));
      await expect(limitBox).toHaveValue(newLimit.toLocaleString('vi-VN'));
    }
    if (note !== undefined) await this.page.getByPlaceholder(decision === 'Từ chối' ? 'Nhập lý do từ chối' : 'Ghi chú (không bắt buộc)').fill(note);
    const resp = this.page
      .waitForResponse((r) => /\/api\/credit-requests\/\d+\/(approve|reject)$/.test(new URL(r.url()).pathname), { timeout: 5_000 })
      .catch(() => null);
    await this.page.getByRole('button', { name: action, exact: true }).last().click();
    const r = await resp;
    return r ? r.status() : null;
  }
}

export class CustomersPage {
  readonly search: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByPlaceholder('Theo mã, tên, số điện thoại');
  }

  async goto(): Promise<void> {
    await this.page.goto('/customers');
    await expect(this.page.getByRole('heading', { name: 'Khách hàng', level: 1 })).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  row(code: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }

  dataRows(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: /^KH\d+/ }) });
  }

  async expand(code: string): Promise<void> {
    await this.row(code).getByRole('cell', { name: code, exact: true }).click();
    await expect(this.page.getByRole('button', { name: 'Nợ cần thu từ khách' })).toBeVisible();
  }
}
