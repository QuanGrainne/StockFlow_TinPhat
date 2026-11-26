// Report 5.3 (bản nháp NEW) – sheet "NEW POS and Invoices": SYS-POS-N01 (pilot) .. N08, SYS-ORD-N01 .. N03.
// Thao tác đang kiểm làm qua UI (POS, Hóa đơn); API admin chỉ dựng tiền đề; DB chỉ để kiểm kết quả.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { PosPage } from '../../pages/PosPage';
import { BookingListPage, CustomersPage } from '../../pages/SalesPages';
import { SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { addStock, createProduct } from '../../fixtures/data';
import { ledgerRows, orderByCode, stockIssuesOfOrder, stockQty, userByUsername } from '../../fixtures/dbq';
import { partnerById, vouchersOf } from '../../fixtures/dbq3';
import { orderById, orderItemsOf, orderSettingsRow, ordersWithProduct, withOrderSettings } from '../../fixtures/dbq4';
import { cancelInvoice, createBooking, createCustomer, createInvoice, createSalesReturn, setCreditLimit } from '../../fixtures/sales';
import type { Locator, Page, Response } from '@playwright/test';
import type { E2EEnv } from '../../fixtures/env';

const SHEET = 'NEW POS and Invoices';
const vnd = (n: number): string => n.toLocaleString('vi-VN');
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function salesAtPos(page: Page, env: E2EEnv): Promise<PosPage> {
  await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
  const pos = new PosPage(page);
  await pos.goto();
  await expect(pos.branchLabel()).toContainText(WAREHOUSES.K001.name);
  return pos;
}

/** "Xử lý đặt hàng" → tìm theo mã đặt hàng → "Chọn" (mở tab hóa đơn giao hàng từ đơn) */
async function openBookingOnPos(page: Page, bookingCode: string): Promise<void> {
  await page.getByRole('button', { name: 'Xử lý đặt hàng' }).click();
  await page.getByPlaceholder('Theo mã đặt hàng').fill(bookingCode);
  const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: bookingCode, exact: true }) });
  await expect(row).toHaveCount(1);
  await row.getByRole('button', { name: 'Chọn', exact: true }).click();
}

/** Màn Hóa đơn (/orders): tìm theo ô "Theo mã hóa đơn, tên hoặc SĐT khách (F3)" */
class InvoiceListPage {
  readonly search: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByPlaceholder('Theo mã hóa đơn, tên hoặc SĐT khách (F3)');
  }

  async goto(): Promise<void> {
    await this.page.goto('/orders');
    await expect(this.search).toBeVisible();
    await this.page.waitForLoadState('networkidle');
  }

  row(code: string): Locator {
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: code, exact: true }) });
  }

  /** Dòng dữ liệu: có ô mã hóa đơn cùng tiền tố với hóa đơn mẫu */
  dataRows(sampleCode: string): Locator {
    const prefix = sampleCode.replace(/\d+$/, '');
    return this.page.getByRole('row').filter({ has: this.page.getByRole('cell', { name: new RegExp(`^${escapeRe(prefix)}\\d+$`) }) });
  }

  status(label: 'Hoàn thành' | 'Đã hủy'): Locator {
    return this.page.getByRole('checkbox', { name: label, exact: true });
  }

  /** Mở chi tiết hóa đơn (dòng mở rộng có nút "Sao chép") */
  async open(code: string): Promise<void> {
    await this.search.fill(code);
    await expect(this.row(code)).toHaveCount(1);
    await this.row(code).getByRole('cell', { name: code, exact: true }).click();
    await expect(this.page.getByRole('button', { name: 'Sao chép' }).first()).toBeVisible();
  }

  /** Hủy → hộp "Hủy hóa đơn" → "Đồng ý hủy"; trả về phản hồi POST /api/orders/{id}/cancel */
  async cancel(orderId: number): Promise<Response> {
    const dialog = this.page.getByRole('dialog', { name: 'Hủy hóa đơn' });
    // Chi tiết hóa đơn tải lại sau khi mở dòng → lần bấm đầu có thể rơi vào lúc nút đang vẽ lại; bấm lại tới khi hộp hiện
    await expect(async () => {
      if (!(await dialog.isVisible())) await this.page.getByRole('button', { name: 'Hủy', exact: true }).first().click({ timeout: 3_000 });
      await expect(dialog).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api/orders/${orderId}/cancel`),
      dialog.getByRole('button', { name: 'Đồng ý hủy' }).click(),
    ]);
    return res;
  }
}

interface PosResult {
  orderCode: string;
  orderId?: number;
}

interface StockCardEntry {
  documentCode: string;
  transactionType: string;
  quantity: number;
  endingBalance: number;
}

test.describe(SHEET, () => {
  test('SYS-POS-N01 – Bán tiền mặt trên POS: hóa đơn, trừ tồn, thẻ kho @pilot', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POS-N01', SHEET);
    const price = 125_000;
    const qty = 2;
    const product = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, product.productId, 'K001', 10);
    const before = await stockQty(db, product.productId, 'K001');
    expect(before, 'tiền đề: P có tồn 10 tại K001').toBe(10);
    const pos = new PosPage(page);
    let result: PosResult = { orderCode: '' };

    await test.step('1. Mở /pos với chi nhánh K001', async () => {
      await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
      await pos.goto();
      await expect(pos.branchLabel()).toContainText(WAREHOUSES.K001.name);
    });
    await test.step('2. Tìm hàng P ở "Tìm hàng hóa (F3)" và thêm vào giỏ', async () => {
      await pos.addProduct(product.code);
    });
    await test.step('3. Đặt số lượng 2', async () => {
      await pos.setQuantity(product.code, qty);
    });
    await test.step('4. Giữ Khách lẻ, Tiền mặt, khách trả = tổng tiền', async () => {
      await expect(pos.cashRadio).toBeChecked();
      await expect(pos.customerPaid()).toHaveValue(vnd(price * qty));
    });
    await test.step('5. Bấm THANH TOÁN', async () => {
      const res = await pos.pay();
      expect(res.status(), await res.text()).toBeLessThan(300);
      result = (await res.json()) as PosResult;
      expect(result.orderCode).toBeTruthy();
    });
    await test.step('KQ1. Thông báo "Đã thanh toán hóa đơn <mã>"', async () => {
      await expect(page.getByText(new RegExp(`^Đã thanh toán hóa đơn ${result.orderCode}`))).toBeVisible();
    });
    await test.step('KQ2. Hóa đơn có trong Hóa đơn (/orders) với tổng = 2 x đơn giá', async () => {
      const order = await orderByCode(db, result.orderCode);
      expect(order, 'hóa đơn trong trx_orders').toBeDefined();
      expect(Number(order?.total_amount)).toBe(price * qty);
      expect(order?.warehouse_id).toBe(WAREHOUSES.K001.id);
      expect(order?.created_by).toBe((await userByUsername(db, SEEDED.sales.username))?.user_id);
      await page.goto('/orders');
      const row = page.getByRole('row').filter({ hasText: result.orderCode });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText(vnd(price * qty));
    });
    await test.step('KQ3. Tồn P tại K001 giảm 2', async () => {
      expect(await stockQty(db, product.productId, 'K001')).toBe(before - qty);
    });
    await test.step('KQ4. Thẻ kho của P có đúng một dòng bán tham chiếu hóa đơn', async () => {
      const order = await orderByCode(db, result.orderCode);
      const issues = await stockIssuesOfOrder(db, order?.order_id ?? -1);
      expect(issues, 'phiếu xuất kho bán hàng của hóa đơn').toHaveLength(1);
      const rows = await ledgerRows(db, product.productId, 'STOCK_ISSUE', issues[0].stock_issue_id);
      expect(rows).toHaveLength(1);
      expect(rows[0].transaction_type).toBe('ISSUE_SALE');
      expect(Number(rows[0].quantity)).toBe(-qty);
      expect(rows[0].warehouse_id).toBe(WAREHOUSES.K001.id);
      // Dữ liệu màn Thẻ kho (API mà giao diện dùng)
      const card = await adminApi.get<StockCardEntry[] | { entries?: StockCardEntry[]; items?: StockCardEntry[] }>(
        `/api/products/${product.productId}/stock-card?warehouseId=${WAREHOUSES.K001.id}`
      );
      const entries = Array.isArray(card) ? card : card.entries ?? card.items ?? [];
      testInfo.annotations.push({ type: 'stock-card', description: JSON.stringify(entries).slice(0, 500) });
      const sale = entries.filter((e) => e.quantity === -qty);
      expect(sale, 'một dòng thẻ kho -2').toHaveLength(1);
      expect(sale[0].endingBalance).toBe(before - qty);
    });
  });

  test('SYS-POS-N02 – Bán ghi nợ trong hạn mức: dư nợ khách tăng đúng phần chưa trả', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POS-N02', SHEET);
    const price = 210_000;
    const limit = 10_000_000;
    const p = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, p.productId, 'K001', 10);
    const c = await createCustomer(adminApi, { suffix: uid });
    await setCreditLimit(adminApi, c.partnerId, limit);
    const before = await partnerById(db, c.partnerId);
    expect(Number(before?.current_debt ?? 0), 'tiền đề: khách chưa có nợ').toBe(0);
    expect(Number(before?.credit_limit), 'tiền đề: hạn mức 10.000.000').toBe(limit);
    let pos = new PosPage(page);
    let code = '';

    await test.step('1. Mở /pos, thêm hàng P (tổng T)', async () => {
      pos = await salesAtPos(page, env);
      await pos.addProduct(p.code);
    });
    await test.step('2. Chọn khách C ở "Tìm khách hàng (F4)"', async () => {
      await pos.selectCustomer(c.name);
    });
    await test.step('3. Khách trả 0', async () => {
      await pos.setPaid(0);
    });
    await test.step('4. Bấm THANH TOÁN', async () => {
      const res = await pos.pay();
      expect(res.status(), await res.text()).toBeLessThan(300);
      code = ((await res.json()) as PosResult).orderCode;
    });
    await test.step('KQ1. Thông báo "Đã thanh toán hóa đơn <mã>"', async () => {
      await expect(page.getByText(new RegExp(`^Đã thanh toán hóa đơn ${escapeRe(code)}`))).toBeVisible();
    });
    const cp = new CustomersPage(page);
    await test.step('KQ2. Dư nợ của C trên Khách hàng tăng T', async () => {
      expect(Number((await partnerById(db, c.partnerId))?.current_debt), 'dư nợ trong DB').toBe(price);
      await cp.goto();
      await cp.search.fill(c.code);
      await expect(cp.row(c.code)).toHaveCount(1);
      await expect(cp.row(c.code)).toContainText(vnd(price));
    });
    await test.step('KQ3. Tín dụng còn lại của C = hạn mức − dư nợ', async () => {
      // Màn Khách hàng chỉ hiện "Hạn mức nợ" và "Nợ hiện tại"; con số "Còn lại" hiện ở POS (nút "Hạn mức còn lại" khi chọn khách)
      await cp.expand(c.code);
      const onCustomers = await page.getByText(vnd(limit - price)).first().isVisible().catch(() => false);
      testInfo.annotations.push({ type: 'observed', description: `Màn Khách hàng ${onCustomers ? 'có' : 'KHÔNG'} hiện tín dụng còn lại ${vnd(limit - price)} (chỉ có hạn mức và dư nợ)` });
      pos = new PosPage(page);
      await pos.goto();
      await pos.selectCustomer(c.name);
      await page.getByRole('button', { name: 'Hạn mức còn lại' }).hover();
      const tip = page.getByRole('tooltip').filter({ hasText: 'Còn lại' });
      await expect(tip).toBeVisible();
      await expect(tip).toContainText(`Hạn mức: ${vnd(limit)}`);
      await expect(tip).toContainText(`Dư nợ: ${vnd(price)}`);
      await expect(tip).toContainText(`Còn lại: ${vnd(limit - price)}`);
    });
  });

  test('SYS-POS-N03 – Khách lẻ trả thiếu bị chặn', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POS-N03', SHEET);
    const price = 180_000;
    const p = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, p.productId, 'K001', 5);
    let pos = new PosPage(page);
    await test.step('1. Mở /pos, thêm hàng P', async () => {
      pos = await salesAtPos(page, env);
      await pos.addProduct(p.code);
    });
    await test.step('2. Giữ Khách lẻ, nhập tiền khách trả nhỏ hơn tổng', async () => {
      await expect(page.getByTitle('Bỏ chọn khách hàng')).toHaveCount(0);
      await pos.setPaid(price - 30_000);
    });
    await test.step('3. Bấm THANH TOÁN → KQ1. Thông báo khách lẻ phải trả đủ', async () => {
      const [res] = await Promise.all([
        pos.tryPay(4_000),
        expect(page.getByText('Khách lẻ phải thanh toán đủ. Chọn khách hàng để ghi nợ phần còn thiếu.', { exact: true })).toBeVisible(),
      ]);
      expect(res, 'không gửi request tạo hóa đơn').toBeNull();
    });
    await test.step('KQ2. Không tạo hóa đơn; tồn không đổi', async () => {
      expect(await ordersWithProduct(db, p.productId)).toEqual([]);
      expect(await stockQty(db, p.productId, 'K001')).toBe(5);
    });
  });

  test('SYS-POS-N04 – Số lượng vượt tồn bị từ chối khi không cho bán âm kho', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POS-N04', SHEET);
    // Tiền đề: tắt "Cho phép bán hàng vượt tồn kho" (mặc định mới từ 24/11/2026 là bật), trả lại sau khi chạy
    await withOrderSettings(adminApi, { allowNegativeStockSale: false }, async () => {
      expect((await orderSettingsRow(db)).allow_negative_stock_sale, 'tiền đề: thiết lập bán âm kho đang tắt').toBe(false);
      const p = await createProduct(adminApi, { suffix: uid, price: 95_000 });
      await addStock(adminApi, p.productId, 'K001', 3);
      let pos = new PosPage(page);
      await test.step('1. Mở /pos, thêm hàng P', async () => {
        pos = await salesAtPos(page, env);
        await pos.addProduct(p.code);
      });
      await test.step('2. Đặt số lượng lớn hơn tồn của P tại K001 (5 > 3)', async () => {
        await pos.setQuantity(p.code, 5);
        await expect(pos.qtyInput(p.code)).toHaveValue('5');
      });
      await test.step('3. Bấm THANH TOÁN → KQ1. Thông báo không đủ tồn kho', async () => {
        const expected = `"${p.name}" không đủ tồn kho (tồn 3). Thiết lập hiện không cho bán âm kho.`;
        const [res] = await Promise.all([pos.tryPay(4_000), expect(page.getByText(expected, { exact: true })).toBeVisible()]);
        expect(res, 'không gửi request tạo hóa đơn').toBeNull();
      });
      await test.step('KQ2. Không tạo hóa đơn; tồn không đổi', async () => {
        expect(await ordersWithProduct(db, p.productId)).toEqual([]);
        expect(await stockQty(db, p.productId, 'K001')).toBe(3);
      });
    });
  });

  test('SYS-POS-N05 – Hàng đang giữ cho đơn đặt không bán được khi không cho bán hàng đã giữ', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POS-N05', SHEET);
    // Từ 24/11/2026 không còn tuỳ chọn riêng "bán hàng đã giữ": tắt "Cho phép bán hàng vượt tồn kho" thì POS không bán phần
    // hàng đang tạm giữ cho đơn đặt (CreatePosOrderCommand). Tiền đề: tắt tuỳ chọn này, trả lại sau khi chạy.
    await withOrderSettings(adminApi, { allowNegativeStockSale: false }, async () => {
      expect((await orderSettingsRow(db)).allow_negative_stock_sale, 'tiền đề: thiết lập bán âm kho đang tắt').toBe(false);
      const price = 77_000;
      const p = await createProduct(adminApi, { suffix: uid, price });
      await addStock(adminApi, p.productId, 'K001', 5);
      const holder = await createCustomer(adminApi, { suffix: uid });
      const booking = await createBooking(adminApi, { partnerId: holder.partnerId, warehouse: 'K001', lines: [{ productId: p.productId, qty: 4, price }] });
      expect((await orderById(db, booking.orderId))?.status, 'tiền đề: đơn đặt còn mở giữ 4').toBe('DRAFT');
      let pos = new PosPage(page);
      let body = '';
      await test.step('1. Mở /pos, thêm P với số lượng 3', async () => {
        pos = await salesAtPos(page, env);
        await pos.addProduct(p.code);
        await pos.setQuantity(p.code, 3);
      });
      await test.step('2. Bấm THANH TOÁN', async () => {
        const res = await pos.tryPay(8_000);
        expect(res, 'có request tạo hóa đơn').not.toBeNull();
        body = (await res?.text()) ?? '';
        expect(res?.status(), body).toBe(400);
      });
      await test.step('KQ1. Bán bị từ chối; thông báo nêu tồn 5, đang giữ 4, khả dụng 1', async () => {
        const msg = page.getByText(/có tồn kho 5 nhưng đang tạm giữ 4.*Tồn khả dụng: 1/).first();
        await expect(msg).toBeVisible();
        testInfo.annotations.push({ type: 'observed', description: `Thông báo: ${(await msg.innerText()).trim()}` });
      });
      await test.step('KQ2. Không tạo hóa đơn; tồn không đổi', async () => {
        expect((await ordersWithProduct(db, p.productId)).filter((o) => o.order_type !== 'BOOKING')).toEqual([]);
        expect(await stockQty(db, p.productId, 'K001')).toBe(5);
      });
    });
  });

  test('SYS-POS-N06 – Bấm THANH TOÁN hai lần liên tiếp chỉ tạo một hóa đơn', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POS-N06', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 66_000 });
    await addStock(adminApi, p.productId, 'K001', 10);
    let pos = new PosPage(page);
    const posts: Response[] = [];
    page.on('response', (r) => {
      if (r.url().endsWith('/api/orders/pos') && r.request().method() === 'POST') posts.push(r);
    });
    await test.step('1. Mở /pos, thêm hàng P', async () => {
      pos = await salesAtPos(page, env);
      await pos.addProduct(p.code);
    });
    await test.step('2. Bấm đúp THANH TOÁN', async () => {
      await pos.payButton.dblclick();
      await expect.poll(() => posts.length).toBeGreaterThan(0);
      await expect(page.getByText(/^Đã thanh toán hóa đơn /).first()).toBeVisible();
      await page.waitForLoadState('networkidle');
      const summary = await Promise.all(posts.map(async (r) => `${r.status()} ${(await r.text()).slice(0, 160)}`));
      testInfo.annotations.push({ type: 'observed', description: `Số request POST /api/orders/pos: ${posts.length} → ${summary.join(' | ')}` });
    });
    await test.step('KQ1. Đúng một hóa đơn; tồn trừ một lần', async () => {
      expect(await ordersWithProduct(db, p.productId)).toHaveLength(1);
      expect(await stockQty(db, p.productId, 'K001')).toBe(9);
    });
    await test.step('KQ2. Request thứ hai (nếu có) bị từ chối với PAY-016', async () => {
      for (const r of posts.slice(1)) {
        expect(r.status()).toBe(400);
        expect(await r.text()).toContain('Giao dịch đang được xử lý, vui lòng không nhấn thanh toán nhiều lần liên tiếp (PAY-016).');
      }
    });
  });

  test('SYS-POS-N07 – Giao đơn đặt trên POS: trừ tiền trả trước, đơn đặt Hoàn thành', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POS-N07', SHEET);
    const deposit = 200_000;
    const p1 = await createProduct(adminApi, { suffix: `${uid}a`, price: 150_000 });
    const p2 = await createProduct(adminApi, { suffix: `${uid}b`, price: 120_000 });
    await addStock(adminApi, p1.productId, 'K001', 10);
    await addStock(adminApi, p2.productId, 'K001', 10);
    const c = await createCustomer(adminApi, { suffix: uid });
    const b = await createBooking(adminApi, {
      partnerId: c.partnerId,
      warehouse: 'K001',
      lines: [
        { productId: p1.productId, qty: 2, price: 150_000 },
        { productId: p2.productId, qty: 1, price: 120_000 },
      ],
      paid: deposit,
    });
    expect(Number((await orderById(db, b.orderId))?.paid_amount), 'tiền đề: khách trả trước 200.000').toBe(deposit);
    const bookedAt = Date.now();
    let pos = new PosPage(page);
    let code = '';
    await test.step('1. Mở /pos, "Xử lý đặt hàng" → mở đơn B', async () => {
      pos = await salesAtPos(page, env);
      await openBookingOnPos(page, b.orderCode);
      await expect(pos.cartLine(p1.code)).toBeVisible();
      await expect(pos.cartLine(p2.code)).toBeVisible();
    });
    await test.step('2. Giao đủ các dòng, bấm THANH TOÁN', async () => {
      await expect(pos.qtyInput(p1.code)).toHaveValue('2');
      await expect(pos.qtyInput(p2.code)).toHaveValue('1');
      // Chống trùng PAY-016 so mọi đơn cùng khách + cùng tổng tiền trong 3 giây, kể cả chính đơn đặt B vừa dựng bằng API
      // (lượt 1: bị từ chối PAY-016) → chờ đồng hồ qua 3,5 giây kể từ lúc tạo đơn B rồi mới thanh toán
      testInfo.annotations.push({ type: 'note', description: 'Thanh toán sau khi đơn đặt B được tạo ít nhất 3,5 giây (tránh chống trùng PAY-016 so với chính đơn B)' });
      await expect.poll(() => Date.now() - bookedAt, { timeout: 10_000, intervals: [500] }).toBeGreaterThan(3_500);
      const res = await pos.pay();
      expect(res.status(), await res.text()).toBeLessThan(300);
      code = ((await res.json()) as PosResult).orderCode;
    });
    await test.step('KQ1. Thông báo "Đã thanh toán hóa đơn <mã> (giao theo đơn <B>). Đã trừ <tiền cọc> tiền khách trả trước"', async () => {
      const re = new RegExp(`^Đã thanh toán hóa đơn ${escapeRe(code)} \\(giao theo đơn ${escapeRe(b.orderCode)}\\)\\. Đã trừ ${escapeRe(vnd(deposit))} tiền khách trả trước`);
      await expect(page.getByText(re)).toBeVisible();
    });
    await test.step('KQ2. Đơn B trạng thái Hoàn thành ở /sales-booking', async () => {
      expect((await orderById(db, b.orderId))?.status).toBe('FINISHED');
      const list = new BookingListPage(page);
      await list.goto();
      await list.search.fill(b.orderCode);
      await expect(list.row(b.orderCode)).toHaveCount(1);
      await expect(list.row(b.orderCode)).toContainText('Hoàn thành');
    });
    await test.step('KQ3. Tồn các hàng đã giao bị trừ', async () => {
      expect([await stockQty(db, p1.productId, 'K001'), await stockQty(db, p2.productId, 'K001')]).toEqual([8, 9]);
    });
  });

  test('SYS-POS-N08 – Giao thiếu đơn đặt tạo đơn chờ cho phần còn lại', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POS-N08', SHEET);
    const price = 88_000;
    const p = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, p.productId, 'K001', 5);
    const c = await createCustomer(adminApi, { suffix: uid });
    const b = await createBooking(adminApi, { partnerId: c.partnerId, warehouse: 'K001', lines: [{ productId: p.productId, qty: 5, price }] });
    let pos = new PosPage(page);
    let remainder = '';
    await test.step('1. Mở đơn B (P, số lượng 5) trên POS', async () => {
      pos = await salesAtPos(page, env);
      await openBookingOnPos(page, b.orderCode);
      await expect(pos.qtyInput(p.code)).toHaveValue('5');
    });
    await test.step('2. Giảm số lượng giao còn 3', async () => {
      await pos.setQuantity(p.code, 3);
      await expect(pos.qtyInput(p.code)).toHaveValue('3');
    });
    await test.step('3. Bấm THANH TOÁN', async () => {
      await pos.payButton.click();
      // Hộp "Khách lấy thiếu so với đơn <B>" (Quay lại / Chỉ thanh toán / Thanh toán và tạo đơn chờ)
      await expect(page.getByRole('heading', { name: `Khách lấy thiếu so với đơn ${b.orderCode}` })).toBeVisible();
      testInfo.annotations.push({ type: 'note', description: 'Sau THANH TOÁN có hộp "Khách lấy thiếu so với đơn"; chọn "Thanh toán và tạo đơn chờ" theo Expected (tạo đơn chờ)' });
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith('/api/orders/pos') && r.request().method() === 'POST'),
        page.getByRole('button', { name: 'Thanh toán và tạo đơn chờ' }).click(),
      ]);
      expect(res.status(), await res.text()).toBeLessThan(300);
      remainder = String(((await res.json()) as { remainderBookingCode?: string }).remainderBookingCode ?? '');
    });
    await test.step('KQ1. Thông báo có "Đã tạo đơn chờ <mã> cho phần khách chưa lấy"', async () => {
      expect(remainder, 'mã đơn chờ trong phản hồi').toBeTruthy();
      await expect(page.getByText(`Đã tạo đơn chờ ${remainder} cho phần khách chưa lấy`, { exact: false })).toBeVisible();
    });
    await test.step('KQ2. Đơn chờ mới giữ 2 của P', async () => {
      const rem = await orderByCode(db, remainder);
      expect(rem?.order_type).toBe('BOOKING');
      const items = await orderItemsOf(db, rem?.order_id ?? -1);
      expect(items.map((i) => [i.product_id, Number(i.quantity)])).toEqual([[p.productId, 2]]);
    });
    await test.step('KQ3. Tồn chỉ trừ 3', async () => {
      expect(await stockQty(db, p.productId, 'K001')).toBe(2);
    });
  });

  test('SYS-ORD-N01 – Hóa đơn: tìm theo mã / khách, lọc trạng thái, xem chi tiết', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-ORD-N01', SHEET);
    const price = 54_000;
    const p = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, p.productId, 'K001', 20);
    const c1 = await createCustomer(adminApi, { suffix: `${uid}a`, namePrefix: 'KH E2E Một' });
    const c2 = await createCustomer(adminApi, { suffix: `${uid}b`, namePrefix: 'KH E2E Hai', salt: 1 });
    const line = (qty: number) => [{ productId: p.productId, qty, price }];
    const inv1 = await createInvoice(adminApi, { partnerId: c1.partnerId, lines: line(1), paid: price, requestId: `${uid}-o1` });
    const inv2 = await createInvoice(adminApi, { partnerId: c2.partnerId, lines: line(2), paid: 2 * price, requestId: `${uid}-o2` });
    const inv3 = await createInvoice(adminApi, { partnerId: c1.partnerId, lines: line(3), paid: 3 * price, requestId: `${uid}-o3` });
    await cancelInvoice(adminApi, inv3.orderId);
    const list = new InvoiceListPage(page);
    await test.step('1. Mở Hóa đơn (/orders)', async () => {
      await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
      await list.goto();
    });
    await test.step('2a. Tìm theo mã hóa đơn → KQ1. chỉ hóa đơn khớp', async () => {
      await list.search.fill(inv1.orderCode);
      await expect(list.row(inv1.orderCode)).toHaveCount(1);
      await expect(list.dataRows(inv1.orderCode)).toHaveCount(1);
    });
    await test.step('2b. Tìm theo khách hàng → KQ1. chỉ hóa đơn của khách đó', async () => {
      await list.search.fill(c2.name);
      await expect(list.row(inv2.orderCode)).toHaveCount(1);
      await expect(list.dataRows(inv2.orderCode)).toHaveCount(1);
    });
    await test.step('3. Lọc theo trạng thái (chỉ Đã hủy, khách C1) → KQ1. chỉ hóa đơn đã hủy', async () => {
      await list.search.fill(c1.name);
      await expect(list.row(inv1.orderCode)).toHaveCount(1);
      await list.status('Đã hủy').check();
      await list.status('Hoàn thành').uncheck();
      await expect(list.row(inv3.orderCode)).toHaveCount(1);
      await expect(list.row(inv1.orderCode)).toHaveCount(0);
      await expect(list.dataRows(inv3.orderCode)).toHaveCount(1);
      await expect(list.row(inv3.orderCode)).toContainText('Đã hủy');
      await list.status('Hoàn thành').check();
      await list.status('Đã hủy').uncheck();
    });
    await test.step('4. Mở một hóa đơn → KQ2. dòng hàng, tổng tiền, đã trả, trạng thái khớp DB', async () => {
      await list.open(inv2.orderCode);
      const o = await orderById(db, inv2.orderId);
      expect([o?.status, Number(o?.total_amount), Number(o?.paid_amount)]).toEqual(['COMPLETED', 2 * price, 2 * price]);
      const detail = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Sao chép' }) }).last();
      await expect(detail.getByText(p.code).first()).toBeVisible();
      await expect(detail.getByText(vnd(2 * price)).first()).toBeVisible();
      await expect(detail.getByText('Hoàn thành').first()).toBeVisible();
      await expect(detail.getByText(/Khách đã trả/).first()).toBeVisible();
      testInfo.annotations.push({ type: 'observed', description: `Chi tiết: ${(await detail.innerText()).replace(/\s+/g, ' ').slice(0, 400)}` });
    });
  });

  test('SYS-ORD-N02 – In hóa đơn chuyển khoản: dòng hàng, tổng tiền và mã QR', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-ORD-N02', SHEET);
    const price = 132_000;
    const p = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, p.productId, 'K001', 5);
    const c = await createCustomer(adminApi, { suffix: uid });
    const inv = await createInvoice(adminApi, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price }], paid: 2 * price, method: 'VIETQR', requestId: `${uid}-qr` });
    const list = new InvoiceListPage(page);
    let html = '';
    await test.step('1. Mở hóa đơn trả bằng Chuyển khoản', async () => {
      await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
      await list.goto();
      await list.open(inv.orderCode);
      // Chi tiết hóa đơn (tab Thông tin) không hiện phương thức; kiểm phiếu thu của hóa đơn trong DB
      const v = await vouchersOf(db, c.partnerId);
      testInfo.annotations.push({ type: 'observed', description: `Phiếu thu của khách: ${JSON.stringify(v)}` });
      expect(v.map((x) => x.payment_method), 'hóa đơn trả bằng Chuyển khoản (VIETQR)').toContain('VIETQR');
    });
    await test.step('2. Mở bản xem trước khi in (nút In)', async () => {
      // printInvoice dựng phiếu trong iframe ẩn rồi gọi print() → đọc nội dung iframe
      const framePromise = page.waitForEvent('frameattached');
      await page.getByRole('button', { name: 'In', exact: true }).first().click();
      const frame = await framePromise;
      await expect.poll(async () => (html = await frame.content().catch(() => html)), { timeout: 10_000 }).toContain(inv.orderCode);
    });
    await test.step('KQ1. Bản in có mã hóa đơn, khách, dòng hàng, tổng tiền đúng', async () => {
      expect(html).toContain(inv.orderCode);
      expect(html).toContain(c.name);
      expect(html).toContain(p.code);
      expect(html).toContain(vnd(2 * price));
      testInfo.annotations.push({ type: 'observed', description: `Tiêu đề bản in: ${/<h1>([^<]*)<\/h1>/.exec(html)?.[1] ?? '?'}` });
    });
    // Quyết định Round 2 (27/11/2026): bỏ yêu cầu QR trên bản in – QR payOS chỉ có ở hộp thanh toán trên POS,
    // hóa đơn đã thanh toán không cần QR. Chỉ ghi nhận.
    const qr = (html.match(/<(img|svg|canvas)\b/gi) ?? []).length + (/qr/i.test(html) ? 1 : 0);
    testInfo.annotations.push({ type: 'observed', description: `Số phần tử ảnh / QR trong bản in: ${qr} (không yêu cầu)` });
    expect((await orderById(db, inv.orderId))?.status).toBe('COMPLETED');
  });

  test('SYS-ORD-N03 – Hủy hóa đơn: hoàn tồn, giảm nợ; hóa đơn có phiếu trả không hủy được', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-ORD-N03', SHEET);
    const price = 99_000;
    const p1 = await createProduct(adminApi, { suffix: `${uid}a`, price });
    const p2 = await createProduct(adminApi, { suffix: `${uid}b`, price });
    await addStock(adminApi, p1.productId, 'K001', 10);
    await addStock(adminApi, p2.productId, 'K001', 10);
    const c1 = await createCustomer(adminApi, { suffix: `${uid}a` });
    const c2 = await createCustomer(adminApi, { suffix: `${uid}b`, salt: 1 });
    await setCreditLimit(adminApi, c1.partnerId, 10_000_000);
    const debtInv = await createInvoice(adminApi, { partnerId: c1.partnerId, lines: [{ productId: p1.productId, qty: 2, price }], paid: 0, requestId: `${uid}-d` });
    const retInv = await createInvoice(adminApi, { partnerId: c2.partnerId, lines: [{ productId: p2.productId, qty: 2, price }], paid: 2 * price, requestId: `${uid}-r` });
    const ret = await createSalesReturn(adminApi, { invoiceId: retInv.orderId, partnerId: c2.partnerId, productId: p2.productId, qty: 1, price, refund: price });
    const debtBefore = Number((await partnerById(db, c1.partnerId))?.current_debt);
    expect(debtBefore, 'tiền đề: hóa đơn ghi nợ').toBe(2 * price);
    const stockBefore = await stockQty(db, p1.productId, 'K001');
    const list = new InvoiceListPage(page);
    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    await list.goto();
    await test.step('1. Hủy hóa đơn ghi nợ chưa có phiếu trả và xác nhận', async () => {
      await list.open(debtInv.orderCode);
      const res = await list.cancel(debtInv.orderId);
      expect(res.status(), await res.text()).toBeLessThan(300);
      await expect(page.getByText(`Đã hủy hóa đơn ${debtInv.orderCode}.`, { exact: true })).toBeVisible();
    });
    await test.step('KQ1. Hóa đơn đã hủy; hoàn tồn; nợ khách giảm đúng phần nợ của hóa đơn', async () => {
      expect((await orderById(db, debtInv.orderId))?.status).toBe('CANCELLED');
      expect(await stockQty(db, p1.productId, 'K001')).toBe(stockBefore + 2);
      expect(Number((await partnerById(db, c1.partnerId))?.current_debt)).toBe(debtBefore - 2 * price);
    });
    await test.step('2. Thử hủy hóa đơn đã có phiếu trả hàng → KQ2. thông báo', async () => {
      await list.open(retInv.orderCode);
      const res = await list.cancel(retInv.orderId);
      expect(res.status()).toBe(400);
      const returnCode = String((ret as { returnCode?: string }).returnCode ?? '');
      expect(returnCode, 'mã phiếu trả của tiền đề').toBeTruthy();
      await expect(page.getByText(`Hóa đơn ${retInv.orderCode} đã có phiếu trả hàng ${returnCode} — hủy phiếu trả hàng trước.`, { exact: true })).toBeVisible();
      expect((await orderById(db, retInv.orderId))?.status).toBe('COMPLETED');
    });
  });
});
