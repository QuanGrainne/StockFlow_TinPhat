// Kho: Kiểm kho (/stocktakes, /stocktakes/create), Xuất hủy (/disposals, /disposals/create).
// Hai form dùng chung bố cục: bảng hàng bên trái (nút "Xóa dòng", ô "Nhập SL"), khung thông tin + Lưu tạm / Hoàn thành bên phải.
import { expect, type Locator, type Page, type Response } from '@playwright/test';

const isApi = (r: Response, method: string, path: RegExp): boolean => r.request().method() === method && path.test(new URL(r.url()).pathname);

class LineForm {
  readonly search: Locator;

  constructor(readonly page: Page, readonly path: string, readonly apiPath: RegExp) {
    this.search = page.getByPlaceholder(/^Tìm hàng hóa theo mã hoặc tên/);
  }

  async goto(query = ''): Promise<void> {
    await this.page.goto(`${this.path}${query}`);
    await expect(this.search).toBeVisible();
  }

  async addProduct(code: string): Promise<void> {
    await this.search.fill(code);
    await this.page.getByText(code, { exact: true }).first().click();
    await expect(this.line(code)).toBeVisible();
  }

  line(code: string): Locator {
    return this.page.locator('div').filter({ hasText: code }).filter({ has: this.page.getByRole('button', { name: 'Xóa dòng' }) }).last();
  }

  qty(code: string): Locator {
    return this.line(code).getByRole('textbox', { name: 'Nhập SL' });
  }

  /** Nhập SL rồi Tab bằng bàn phím (không dò lại ô sau khi nhập: dòng có thể render lại / đổi tab lọc) */
  async setQty(code: string, v: number | string): Promise<void> {
    const input = this.qty(code);
    await input.click();
    await input.fill(String(v));
    await this.page.keyboard.press('Tab');
  }

  /** Chờ request lưu (POST tạo / PUT sửa) trong thời gian ngắn; null nếu giao diện chặn trước khi gửi */
  protected waitSave(): Promise<Response | null> {
    return this.page
      .waitForResponse((r) => isApi(r, 'POST', this.apiPath) || isApi(r, 'PUT', new RegExp(`${this.apiPath.source.replace(/\$$/, '')}/\\d+$`, 'i')), { timeout: 8_000 })
      .catch(() => null);
  }

  async saveDraft(): Promise<Response | null> {
    const res = this.waitSave();
    await this.page.getByRole('button', { name: 'Lưu tạm', exact: true }).click();
    return res;
  }
}

export class StocktakeFormPage extends LineForm {
  constructor(page: Page) {
    // Frontend gọi /api/Stocktakes (viết hoa) → so khớp không phân biệt hoa thường
    super(page, '/stocktakes/create', /\/api\/stocktakes$/i);
  }

  get notes(): Locator {
    return this.page.getByRole('complementary').getByPlaceholder('Ghi chú');
  }

  /** Hoàn thành → hộp "Cân bằng kho" → Đồng ý (form kiểm dữ liệu sau khi đồng ý) */
  async complete(): Promise<Response | null> {
    await this.page.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
    await expect(this.page.getByText(/Bạn có chắc chắn muốn Cân bằng kho\?/)).toBeVisible();
    const res = this.waitSave();
    await this.page.getByRole('button', { name: 'Đồng ý', exact: true }).click();
    return res;
  }
}

export class DisposalFormPage extends LineForm {
  constructor(page: Page) {
    super(page, '/disposals/create', /\/api\/disposals$/i);
  }

  get reason(): Locator {
    return this.page.getByPlaceholder('VD: Hàng lỗi sản xuất, hỏng do vận chuyển, hết hạn sử dụng...');
  }

  /** Hoàn thành: form kiểm trước; hợp lệ mới hiện hộp xác nhận "Đồng ý". Trả null nếu bị chặn trước khi gửi */
  async complete(): Promise<Response | null> {
    await this.page.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
    const agree = this.page.getByRole('button', { name: 'Đồng ý', exact: true });
    if (!(await agree.waitFor({ state: 'visible', timeout: 3_000 }).then(() => true).catch(() => false))) return null;
    const res = this.waitSave();
    await agree.click();
    return res;
  }
}

/** Danh sách phiếu (kiểm kho / xuất hủy): tìm theo mã, mở dòng, Hủy → Đồng ý */
export class DocListPage {
  constructor(readonly page: Page, readonly path: string, readonly heading: string, readonly searchPlaceholder: string) {}

  static stocktakes(page: Page): DocListPage {
    return new DocListPage(page, '/stocktakes', 'Phiếu kiểm kho', 'Theo mã phiếu kiểm, ghi chú');
  }

  static disposals(page: Page): DocListPage {
    return new DocListPage(page, '/disposals', 'Xuất hủy', 'Theo mã xuất hủy');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.path);
    await expect(this.page.getByRole('heading', { name: this.heading, level: 1 })).toBeVisible();
  }

  row(code: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }

  async open(code: string): Promise<void> {
    await this.page.getByPlaceholder(this.searchPlaceholder).fill(code);
    await this.row(code).getByRole('cell', { name: code, exact: true }).click();
    await expect(this.page.getByRole('button', { name: 'Sao chép' })).toBeVisible();
  }

  async cancel(apiPath: RegExp): Promise<Response> {
    await this.page.getByRole('button', { name: 'Hủy', exact: true }).first().click();
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => r.request().method() !== 'GET' && apiPath.test(new URL(r.url()).pathname)),
      this.page.getByRole('button', { name: 'Đồng ý', exact: true }).click(),
    ]);
    return res;
  }
}
