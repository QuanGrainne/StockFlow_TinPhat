// Report 5.3 (bản nháp NEW) – sheet "NEW Master Data and Settings": SYS-PRD-N01/N02 (import Excel), SYS-PRB-N01/N02 (bảng giá),
// SYS-SET-N01/N02 (thiết lập đơn hàng). SET-N01/N02 đổi thiết lập chung → luôn khôi phục bản gốc qua API trong finally.
import { test, expect, traceTc, newUserContext } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { PosPage } from '../../pages/PosPage';
import { ProductsPage } from '../../pages/MasterDataPages';
import { SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { addStock, createProduct } from '../../fixtures/data';
import { orderByCode, stockQty } from '../../fixtures/dbq';
import { orderItemsOf, orderSettingsRow, ordersWithProduct, priceBookByName, priceBookCount, priceOf, productCodesLike } from '../../fixtures/dbq4';
import { backendError, uiBlocksAction } from '../../fixtures/ui';
import { buildXlsx, PRODUCT_TEMPLATE_HEADERS, productTemplateRow } from '../../fixtures/xlsx';
import type { ApiSession } from '../../fixtures/api';
import type { Locator, Page, Response } from '@playwright/test';
import type { E2EEnv } from '../../fixtures/env';

const SHEET = 'NEW Master Data and Settings';
const vnd = (n: number): string => n.toLocaleString('vi-VN');
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const codeOf = (uid: string): string => uid.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

interface CategoryDto {
  categoryId: number;
  categoryName: string;
  isActive: boolean;
}

async function activeCategory(api: ApiSession): Promise<string> {
  const cats = await api.get<CategoryDto[]>('/api/products/categories');
  return (cats.find((c) => c.isActive) ?? cats[0]).categoryName;
}

/** Hàng hóa → "Import file" → chọn file (modal xử lý ngay khi chọn file); trả về phản hồi POST /api/products/import nếu có */
async function importFile(page: Page, fileName: string, rows: (string | number)[][]): Promise<Response | null> {
  await page.getByRole('button', { name: 'Import file' }).click();
  await expect(page.getByRole('heading', { name: 'Nhập hàng hóa từ file dữ liệu' })).toBeVisible();
  const res = page
    .waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname.toLowerCase() === '/api/products/import', { timeout: 8_000 })
    .catch(() => null);
  await page.locator('input[type="file"][accept*=".xlsx"]').setInputFiles({
    name: fileName,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: buildXlsx(rows),
  });
  return res;
}

type OrderSettings = Record<string, unknown>;

async function withSettingsRestored(admin: ApiSession, fn: () => Promise<void>): Promise<void> {
  const original = await admin.get<OrderSettings>('/api/settings/orders');
  try {
    await fn();
  } finally {
    await admin.put('/api/settings/orders', original);
  }
}

class OrderSettingsPage {
  constructor(readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('/settings/orders');
    await expect(this.page.getByRole('button', { name: 'Lưu cài đặt' })).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  /** Ô tiền tố ngay sau nhãn loại chứng từ (vd "Hóa đơn bán hàng (POS)") */
  prefix(label: string): Locator {
    return this.page.locator(`xpath=//label[normalize-space()="${label}"]/following::input[@type="text"][1]`).first();
  }

  /** Bật / tắt công tắc (ô checkbox ẩn sr-only nằm trong label) */
  async setToggle(input: Locator, on: boolean): Promise<void> {
    if ((await input.isChecked()) !== on) await input.locator('xpath=ancestor::label[1]').click();
    if (on) await expect(input).toBeChecked();
    else await expect(input).not.toBeChecked();
  }

  get negativeStock(): Locator {
    return this.page.locator('xpath=//*[normalize-space(text())="Cho phép bán hàng vượt tồn kho"]/following::input[@type="checkbox"][1]').first();
  }

  async save(): Promise<Response> {
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => r.request().method() === 'PUT' && /\/api\/(settings\/orders|order-settings)$/i.test(new URL(r.url()).pathname)),
      this.page.getByRole('button', { name: 'Lưu cài đặt' }).click(),
    ]);
    return res;
  }
}

/** Đóng các thông báo antd (notification) đang che nút */
async function closeNotifications(page: Page): Promise<void> {
  const close = page.locator('.ant-notification-notice-close');
  while ((await close.count()) > 0) {
    await close.first().click();
    await expect(close).toHaveCount(0, { timeout: 3_000 }).catch(() => undefined);
  }
}

/** Bán trên POS; expectMessage: thông báo phải thấy NGAY khi bấm (toast tự tắt sau vài giây) */
async function posSale(page: Page, env: E2EEnv, productCode: string, qty: number, expectMessage?: string): Promise<Response | null> {
  await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
  const pos = new PosPage(page);
  await pos.goto();
  await expect(pos.branchLabel()).toContainText(WAREHOUSES.K001.name);
  await pos.addProduct(productCode);
  if (qty !== 1) await pos.setQuantity(productCode, qty);
  if (!expectMessage) return pos.tryPay(8_000);
  const [res] = await Promise.all([pos.tryPay(4_000), expect(page.getByText(expectMessage, { exact: true })).toBeVisible()]);
  return res;
}

test.describe(SHEET, () => {
  test('SYS-PRD-N01 – Import file Excel hợp lệ tạo hàng hóa', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PRD-N01', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'File .xlsx dựng theo đúng cột của file mẫu MauFileSanPham.xlsx (fixtures/xlsx.ts)' });
    const prefix = `E2EIMP${codeOf(uid)}`;
    const group = await activeCategory(adminApi);
    const items = [1, 2, 3].map((i) => ({ group, code: `${prefix}${i}`, name: `Hàng import ${uid} số ${i}`, price: 10_000 * i + 5_000, cost: 6_000 * i, unit: 'Cái' }));
    expect(await productCodesLike(db, prefix), 'tiền đề: mã hàng trong file chưa tồn tại').toEqual([]);
    const pp = new ProductsPage(page);
    let res: Response | null = null;
    await test.step('1–3. Hàng hóa → Import file → chọn file .xlsx hợp lệ 3 hàng mới (xác nhận import)', async () => {
      await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
      await pp.goto();
      res = await importFile(page, 'MauFileSanPham_E2E.xlsx', [PRODUCT_TEMPLATE_HEADERS, ...items.map(productTemplateRow)]);
      expect(res, 'có request import').not.toBeNull();
    });
    await test.step('KQ1. Import thành công và báo 3 hàng', async () => {
      const r = res as Response | null;
      expect(r?.status(), await r?.text()).toBeLessThan(300);
      const msg = page.getByText(/Nhập thành công 3 sản phẩm mới/).first();
      await expect(msg).toBeVisible();
      testInfo.annotations.push({ type: 'observed', description: `Thông báo: ${(await msg.innerText()).trim()}` });
    });
    await test.step('KQ2. 3 hàng có trong danh sách với mã, tên, đơn vị, giá theo file', async () => {
      const rows = await productCodesLike(db, prefix);
      expect(rows.map((r) => [r.product_code, r.product_name, r.unit, Number(r.standard_price)])).toEqual(items.map((i) => [i.code, i.name, i.unit, i.price]));
      await pp.goto();
      for (const i of items) {
        await pp.search(i.code);
        const row = pp.row(i.code);
        await expect(row).toHaveCount(1);
        await expect(row).toContainText(i.name);
        await expect(row).toContainText(vnd(i.price));
      }
    });
  });

  test('SYS-PRD-N02 – File có dòng không hợp lệ: báo từng dòng, không tạo hàng cho dòng lỗi', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PRD-N02', SHEET);
    // Round 2 (27/11/2026, đã duyệt): dòng lỗi được báo "Dòng n: <lý do>" và dừng cả file (không tạo hàng nào);
    // hàng mới thiếu tên là lỗi "Dòng n: Thiếu tên hàng hóa." (như form tạo hàng). File dừng ở dòng lỗi đầu tiên.
    testInfo.annotations.push({ type: 'note', description: 'File theo Procedure: 1 dòng thiếu tên (dòng 2) và 1 dòng trùng mã đã có (dòng 3, tên khác).' });
    const prefix = `E2EIMQ${codeOf(uid)}`;
    const group = await activeCategory(adminApi);
    const existing = await createProduct(adminApi, { suffix: uid, price: 44_000, namePrefix: 'Hàng có sẵn' });
    const noName = { group, code: `${prefix}1`, name: '', price: 12_000, cost: 7_000, unit: 'Cái' };
    const dup = { group, code: existing.code, name: `Tên khác ${uid}`, price: 13_000, cost: 8_000, unit: 'Cái' };
    const pp = new ProductsPage(page);
    let res: Response | null = null;
    await test.step('1. Import file có 1 dòng thiếu tên và 1 dòng trùng mã', async () => {
      await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
      await pp.goto();
      res = await importFile(page, 'MauFileSanPham_E2E_loi.xlsx', [PRODUCT_TEMPLATE_HEADERS, productTemplateRow(noName), productTemplateRow(dup)]);
      const r = res as Response | null;
      testInfo.annotations.push({ type: 'observed', description: `Request import: ${r ? `HTTP ${r.status()} ${(await r.text()).slice(0, 200)}` : 'không gửi'}` });
    });
    await test.step('KQ1. Báo từng dòng lỗi kèm số dòng và lý do', async () => {
      const dupMsg = page.getByText(new RegExp(`Dòng 3: Trùng mã hàng "?${escapeRe(existing.code)}"?`)).first();
      const noNameMsg = page.getByText(/Dòng 2\b.*(tên|Tên)/).first();
      const shown = await page.getByText(/Dòng \d+/).allInnerTexts();
      testInfo.annotations.push({ type: 'observed', description: `Thông báo lỗi: ${shown.map((s) => s.trim()).join(' | ') || '(không có)'}` });
      await expect(noNameMsg, 'dòng 2 (thiếu tên) được báo').toHaveText(/Dòng 2: Thiếu tên hàng hóa\./);
      testInfo.annotations.push({ type: 'observed', description: `Dòng 3 (trùng mã): ${(await dupMsg.count()) ? 'có báo' : 'không báo vì file đã dừng ở dòng 2'}` });
    });
    await test.step('KQ1b. File chỉ có dòng trùng mã → "Dòng 2: Trùng mã hàng …"', async () => {
      await page.keyboard.press('Escape').catch(() => undefined);
      await pp.goto();
      await importFile(page, 'MauFileSanPham_E2E_trung.xlsx', [PRODUCT_TEMPLATE_HEADERS, productTemplateRow(dup)]);
      await expect(page.getByText(new RegExp(`Dòng 2: Trùng mã hàng "?${escapeRe(existing.code)}"?`)).first()).toBeVisible();
    });
    await test.step('KQ2. Có dòng lỗi thì dừng cả file: không tạo hàng nào, hàng có sẵn không đổi', async () => {
      expect(await productCodesLike(db, noName.code), 'không tạo hàng nào từ file có dòng lỗi').toEqual([]);
      const ex = await productCodesLike(db, existing.code);
      expect(ex.map((r) => r.product_name), 'hàng có sẵn không bị đổi tên').toEqual([existing.name]);
    });
  });

  test('SYS-PRB-N01 – Bảng giá có công thức tính giá từ bảng giá nguồn; lưu không tên bị chặn', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PRB-N01', SHEET);
    const base = 100_000;
    const plus = 15_000;
    const name = `BG E2E ${uid}`;
    const p = await createProduct(adminApi, { suffix: uid, price: base });
    await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
    let bookId = 0;
    await test.step('1. Mở Bảng giá (/price-books) và tạo bảng giá B', async () => {
      await page.goto('/price-books');
      await expect(page.getByRole('heading', { name: 'Thiết lập giá', level: 1 })).toBeVisible();
      await page.getByRole('button', { name: 'Bảng giá', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Tạo bảng giá' })).toBeVisible();
      await page.getByPlaceholder(/^Nhập tên bảng giá/).fill(name);
    });
    await test.step('2. Công thức giá: nguồn Bảng giá chung, phép +, giá trị; áp dụng', async () => {
      const form = page.locator('form').filter({ has: page.getByText('Giá mới =') });
      await form.getByRole('button', { name: 'Chọn bảng giá' }).click();
      await form.getByRole('button', { name: 'Bảng giá chung', exact: true }).click();
      await form.getByTitle('Cộng thêm').click();
      await form.locator('xpath=.//span[normalize-space()="Giá mới ="]/following::input[1]').fill(String(plus));
      await form.getByRole('checkbox', { name: /Thêm hàng hóa từ Bảng giá chung khi tạo bảng giá này/ }).check();
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname.toLowerCase() === '/api/price-books'),
        page.getByRole('button', { name: 'Lưu', exact: true }).click(),
      ]);
      expect(res.status(), await res.text()).toBeLessThan(300);
      bookId = Number(((await res.json()) as { priceBookId: number }).priceBookId);
      // Nút "Áp dụng" của Procedure: trên màn này là nút "Tính toán lại theo công thức" ở cột bảng giá B
      testInfo.annotations.push({ type: 'note', description: 'Không có nút "Áp dụng" trong mục Công thức giá; áp dụng công thức bằng nút "Tính toán lại theo công thức" ở cột B' });
      const [apply] = await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api/price-books/${bookId}/apply-formula`),
        page.getByTitle('Tính toán lại theo công thức').first().click(),
      ]);
      expect(apply.status(), await apply.text()).toBeLessThan(300);
    });
    await test.step('KQ1. Thông báo "Áp dụng công thức thành công"; giá B = giá nguồn + giá trị', async () => {
      await expect(page.getByText('Áp dụng công thức thành công', { exact: true }).first()).toBeVisible();
      expect(await priceOf(db, bookId, p.productId)).toBe(base + plus);
      await page.getByPlaceholder('Theo mã, tên hàng hóa').fill(p.code);
      const row = page.getByRole('row').filter({ hasText: p.code });
      await expect(row).toHaveCount(1);
      // Cột B (bảng giá theo công thức) hiện giá dạng chữ, không phải ô nhập
      await expect(row).toContainText(vnd(base + plus));
      expect((await priceBookByName(db, name))?.formula_base_type).toBe('STANDARD');
    });
    await test.step('3. Lưu không có tên → KQ2. "Tên bảng giá không được để trống."', async () => {
      const expected = 'Tên bảng giá không được để trống.';
      const count0 = await priceBookCount(db);
      await closeNotifications(page);
      await page.getByRole('button', { name: 'Bảng giá', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Tạo bảng giá' })).toBeVisible();
      const req = page.waitForRequest((r) => r.method() === 'POST' && new URL(r.url()).pathname.toLowerCase() === '/api/price-books', { timeout: 4_000 }).catch(() => null);
      await page.getByRole('button', { name: 'Lưu', exact: true }).click();
      const sent = await req;
      const shownLoc = page.getByText(/^Vui lòng nhập tên bảng giá/).first();
      if (sent === null) {
        // Ô tên có thuộc tính required → trình duyệt chặn gửi form bằng thông báo riêng (validationMessage)
        const nameInput = page.getByPlaceholder(/^Nhập tên bảng giá/);
        const native = await nameInput.evaluate((el) => (el as HTMLInputElement).validationMessage);
        const shown = native || (await shownLoc.innerText({ timeout: 2_000 }).catch(() => '')).trim();
        const be = await backendError(() => adminApi.post('/api/price-books', { priceBookName: '', isActive: true, scopeBranchType: 'ALL', scopeCustomerType: 'ALL' }));
        expect(be).toBe(expected);
        uiBlocksAction(testInfo, `form báo "${shown}" và không gửi request`, expected, `${be} (gọi bằng Admin)`);
      } else {
        await expect(page.getByText(expected, { exact: true })).toBeVisible();
      }
      expect(await priceBookCount(db)).toBe(count0);
    });
  });

  test('SYS-PRB-N02 – Chọn bảng giá trên POS áp giá vào giỏ hàng', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PRB-N02', SHEET);
    const base = 100_000;
    const special = 85_000;
    const name = `BG POS ${uid}`;
    const p = await createProduct(adminApi, { suffix: uid, price: base });
    await addStock(adminApi, p.productId, 'K001', 5);
    const book = await adminApi.post<{ priceBookId: number }>('/api/price-books', {
      priceBookName: name,
      isActive: true,
      allowUnlistedProducts: true,
      scopeBranchType: 'ALL',
      scopeCustomerType: 'ALL',
    });
    await adminApi.put(`/api/price-books/${book.priceBookId}/prices`, [{ productId: p.productId, price: special }]);
    expect(await priceOf(db, book.priceBookId, p.productId), 'tiền đề: giá của P trong B').toBe(special);
    const pos = new PosPage(page);
    await test.step('1. Mở /pos và thêm P', async () => {
      await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
      await pos.goto();
      await pos.addProduct(p.code);
      await expect(pos.priceButton(p.code)).toHaveText(vnd(base));
    });
    await test.step('2. Chọn bảng giá B', async () => {
      const select = page.locator('select').filter({ has: page.locator('option', { hasText: 'Bảng giá chung' }) }).first();
      await select.selectOption({ label: name });
    });
    await test.step('KQ1. Đơn giá của P đổi theo B', async () => {
      await expect(pos.priceButton(p.code)).toHaveText(vnd(special));
    });
    await test.step('KQ2. Tổng tiền tính lại; hóa đơn lưu đúng giá', async () => {
      await expect(pos.paidInput()).toHaveValue(vnd(special));
      const res = await pos.pay();
      expect(res.status(), await res.text()).toBeLessThan(300);
      const code = ((await res.json()) as { orderCode: string }).orderCode;
      const o = await orderByCode(db, code);
      expect(Number(o?.total_amount)).toBe(special);
      expect((await orderItemsOf(db, o?.order_id ?? -1)).map((i) => Number(i.unit_price))).toEqual([special]);
    });
  });

  test('SYS-SET-N02 – Cho phép bán âm kho: POS bán được vượt tồn', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-SET-N02', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 58_000 });
    await addStock(adminApi, p.productId, 'K001', 3);
    await withSettingsRestored(adminApi, async () => {
      const sp = new OrderSettingsPage(page);
      await new LoginPage(page).loginOk(SEEDED.admin.username, env.defaultPassword);
      await test.step('1. Admin bật "Cho phép bán hàng vượt tồn kho" và lưu', async () => {
        await sp.goto();
        await sp.setToggle(sp.negativeStock, true);
        const res = await sp.save();
        expect(res.status(), await res.text()).toBeLessThan(300);
        expect((await orderSettingsRow(db)).allow_negative_stock_sale).toBe(true);
      });
      await test.step('2. Trên POS bán P vượt tồn → KQ1. bán được; tồn P âm', async () => {
        const other = await newUserContext(browser, testInfo, dialogs);
        const res = await posSale(other.page, env, p.code, 5);
        expect(res, 'có request tạo hóa đơn').not.toBeNull();
        expect(res?.status(), await res?.text()).toBeLessThan(300);
        expect(await stockQty(db, p.productId, 'K001')).toBe(-2);
        await other.context.close();
      });
      await test.step('KQ2. Tắt thiết lập thì bán vượt tồn bị từ chối (như SYS-POS-N04)', async () => {
        await sp.goto();
        await sp.setToggle(sp.negativeStock, false);
        const res = await sp.save();
        expect(res.status(), await res.text()).toBeLessThan(300);
        const other = await newUserContext(browser, testInfo, dialogs);
        const sale = await posSale(other.page, env, p.code, 1, `"${p.name}" không đủ tồn kho (tồn -2). Thiết lập hiện không cho bán âm kho.`);
        expect(sale, 'giao diện chặn trước khi gửi').toBeNull();
        expect((await ordersWithProduct(db, p.productId)).length).toBe(1);
        await other.context.close();
      });
    });
  });
});
