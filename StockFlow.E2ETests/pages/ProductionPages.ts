// Sản xuất: Lệnh sản xuất (/production) – danh sách, chi tiết mở dưới dòng (tab Thông tin & NVL, Phiếu xuất NVL, Nhập thành phẩm).
import { expect, type Locator, type Page, type Response } from '@playwright/test';

export class ProductionOrdersPage {
  readonly search: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByPlaceholder('Theo mã lệnh, mã / tên thành phẩm, xưởng');
  }

  async goto(query = ''): Promise<void> {
    await this.page.goto(`/production${query}`);
    await expect(this.page.getByRole('heading', { name: 'Lệnh sản xuất', level: 1 })).toBeVisible();
  }

  row(code: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }

  dataRows(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: /^LSX\d+$/ }) });
  }

  /** Chi tiết đang mở: hàng chứa tab "Thông tin & NVL" */
  detail(): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('button', { name: 'Thông tin & NVL' }) });
  }

  /** Bấm mã lệnh để mở chi tiết; chờ GET /api/production/orders/{id} */
  async open(code: string): Promise<Response> {
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => r.request().method() === 'GET' && /\/api\/production\/orders\/\d+$/.test(new URL(r.url()).pathname)),
      this.row(code).getByRole('cell', { name: code, exact: true }).click(),
    ]);
    await expect(this.detail().getByText(code, { exact: true }).first()).toBeVisible();
    return res;
  }

  /** Dòng NVL trong bảng "Nguyên vật liệu theo định mức" */
  material(code: string): Locator {
    return this.detail().getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }

  /** Ô "Tồn tại kho" (select kho xem tồn) */
  get warehouse(): Locator {
    return this.detail().getByRole('combobox');
  }

  /** Giá trị các cột của dòng NVL theo tiêu đề cột */
  async materialCells(code: string): Promise<Record<string, string>> {
    const headers = (await this.detail().getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
    const cells = (await this.material(code).getByRole('cell').allInnerTexts()).map((c) => c.trim());
    // Bảng NVL là bảng cuối trong chi tiết: lấy đúng số tiêu đề cuối cùng bằng số ô
    const tail = headers.slice(headers.length - cells.length);
    return Object.fromEntries(tail.map((h, i) => [h, cells[i]]));
  }
}

/** Hộp chọn lệnh (OrderPickerDialog): tìm theo mã rồi bấm dòng */
async function pickOrder(page: Page, title: string, code: string): Promise<boolean> {
  await expect(page.getByRole('heading', { name: title, level: 3 })).toBeVisible();
  // Chỉ xét bảng trong hộp chọn (danh sách phía sau cũng có thể chứa mã lệnh)
  const dialog = page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: title, level: 3 }) })
    .filter({ has: page.getByPlaceholder('Tìm theo mã lệnh, mã / tên thành phẩm, xưởng') })
    .last();
  await dialog.getByPlaceholder('Tìm theo mã lệnh, mã / tên thành phẩm, xưởng').fill(code);
  const row = dialog.getByRole('row').filter({ has: page.getByRole('cell', { name: code }) });
  const empty = dialog.getByText(/^Không (có|tìm thấy) lệnh sản xuất/);
  await expect(dialog.getByText('Đang tải lệnh sản xuất...')).toHaveCount(0);
  await expect(row.or(empty).first()).toBeVisible();
  if (!(await row.count())) return false;
  await row.first().click();
  return true;
}

/** Xuất NVL sản xuất (/production/material-issues) + hộp "Xuất NVL sản xuất" (MaterialIssueModal) */
export class MaterialIssuePage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/production/material-issues');
    await expect(this.page.getByRole('heading', { name: 'Xuất NVL sản xuất', level: 1 })).toBeVisible();
  }

  /** Bấm "Xuất NVL" → chọn lệnh; trả false nếu lệnh không có trong danh sách chọn */
  async openFor(code: string): Promise<boolean> {
    await this.page.getByRole('button', { name: 'Xuất NVL', exact: true }).click();
    if (!(await pickOrder(this.page, 'Chọn lệnh sản xuất cần xuất NVL', code))) return false;
    await expect(this.page.getByRole('heading', { name: 'Xuất NVL sản xuất', level: 3 })).toBeVisible();
    await expect(this.page.getByText('Đang tải nhu cầu NVL...')).toHaveCount(0);
    return true;
  }

  qty(materialCode: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: materialCode, exact: true }) }).getByPlaceholder('0', { exact: true });
  }

  get supplementary(): Locator {
    return this.page.getByRole('checkbox', { name: /^Xuất bổ sung \(hao hụt/ });
  }

  get reason(): Locator {
    return this.page.getByRole('textbox', { name: /^(Ghi chú cho phiếu xuất|VD: hao hụt)/ });
  }

  /** Bấm "Xác nhận xuất kho"; chờ POST /api/production/material-issues (null nếu giao diện chặn trước khi gửi) */
  async confirm(timeout = 6_000): Promise<Response | null> {
    const res = this.page
      .waitForResponse((r) => r.request().method() === 'POST' && /\/api\/production\/material-issues$/.test(new URL(r.url()).pathname), { timeout })
      .catch(() => null);
    await this.page.getByRole('button', { name: 'Xác nhận xuất kho', exact: true }).click();
    return res;
  }
}

/** Nhập thành phẩm (/production/finished-goods) + hộp "Duyệt hoàn thành" (ApproveCompletionModal, Manager) */
export class FinishedGoodsPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/production/finished-goods');
    await expect(this.page.getByRole('heading', { name: 'Nhập thành phẩm', level: 1 })).toBeVisible();
  }

  async openFor(code: string): Promise<boolean> {
    await this.page.getByRole('button', { name: 'Nhập thành phẩm', exact: true }).click();
    if (!(await pickOrder(this.page, 'Chọn lệnh sản xuất cần nhập thành phẩm', code))) return false;
    await expect(this.page.getByRole('heading', { name: /^Duyệt hoàn thành/, level: 3 })).toBeVisible();
    return true;
  }

  /** Dòng thành phẩm trong hộp duyệt: [SL đạt, SL lỗi] là 2 ô nhập đầu */
  line(fgCode: string): Locator {
    return this.page.getByRole('row').filter({ hasText: fgCode }).filter({ has: this.page.getByRole('textbox') }).last();
  }

  async setAccepted(fgCode: string, v: number): Promise<void> {
    await this.line(fgCode).getByRole('textbox').nth(0).fill(String(v));
  }

  async setDefect(fgCode: string, v: number, reason?: string): Promise<void> {
    await this.line(fgCode).getByRole('textbox').nth(1).fill(String(v));
    if (reason !== undefined) await this.page.getByPlaceholder(`Lý do lỗi của ${fgCode} *`).fill(reason);
  }

  get lot(): Locator {
    return this.page.getByPlaceholder('Để trống = theo mã lệnh');
  }

  /** Ô "Kho nhận thành phẩm *": select đầu tiên của hộp duyệt */
  get warehouse(): Locator {
    return this.page.locator('xpath=//label[starts-with(normalize-space(),"Kho nhận thành phẩm")]/following::select[1]');
  }

  async submit(timeout = 6_000): Promise<Response | null> {
    const res = this.page
      .waitForResponse((r) => r.request().method() === 'POST' && /\/api\/production\/orders\/\d+\/approve$/.test(new URL(r.url()).pathname), { timeout })
      .catch(() => null);
    await this.page.getByRole('button', { name: 'Duyệt hoàn thành', exact: true }).last().click();
    return res;
  }
}

/** Kế hoạch sản xuất (/production/plans): mở kế hoạch, "Lập lệnh sản xuất" */
export class ProductionPlansPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/production/plans');
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
  }

  async open(planName: string): Promise<void> {
    await this.page.getByRole('row').filter({ hasText: planName }).first().click();
    await expect(this.page.getByRole('button', { name: 'Thông tin & tiến độ' })).toBeVisible();
  }

  async openCreateOrder(planCode: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Lập lệnh sản xuất', exact: true }).first().click();
    await expect(this.page.getByRole('heading', { name: `Lập lệnh sản xuất từ kế hoạch ${planCode}`, level: 3 })).toBeVisible();
  }

  /** Ô số lượng của dòng thành phẩm trong hộp lập lệnh */
  qty(fgCode: string): Locator {
    return this.page.getByRole('row').filter({ hasText: fgCode }).getByRole('textbox').first();
  }

  async submit(timeout = 6_000): Promise<Response | null> {
    const res = this.page
      .waitForResponse((r) => r.request().method() === 'POST' && /\/api\/production\/plans\/\d+\/orders$/.test(new URL(r.url()).pathname), { timeout })
      .catch(() => null);
    await this.page.getByRole('button', { name: 'Lập lệnh', exact: true }).click();
    return res;
  }
}
