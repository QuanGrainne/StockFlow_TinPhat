// Report 5.3 – sheet "UC-18 Pending Orders" (SYS-BKG-01..09). Code: Pending Order = Đơn đặt hàng (BOOKING, DRAFT).
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { PosPage } from '../../pages/PosPage';
import { BookingListPage } from '../../pages/SalesPages';
import { SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { addStock, createProduct, type ProductDto } from '../../fixtures/data';
import { createBooking, createCustomer, type CustomerDto } from '../../fixtures/sales';
import { queryRows } from '../../fixtures/pg';
import { permissionCodesOfRole, stockQty } from '../../fixtures/dbq';
import { backendError, uiBlocksAction } from '../../fixtures/ui';
import type { ApiSession } from '../../fixtures/api';
import type { Client } from 'pg';
import type { Page } from '@playwright/test';

const SHEET = 'UC-18 Pending Orders';
const vnd = (n: number): string => n.toLocaleString('vi-VN');

interface BookingRow {
  order_id: number;
  status: string;
  order_type: string;
  total_amount: string;
  paid_amount: string | null;
  payment_status: string | null;
}

async function bookingByCode(db: Client, code: string): Promise<BookingRow | undefined> {
  return (
    await queryRows<BookingRow>(
      db,
      `SELECT order_id, status, order_type, total_amount::text AS total_amount, paid_amount::text AS paid_amount, payment_status
         FROM stockflow.trx_orders WHERE order_code = $1`,
      [code]
    )
  )[0];
}

async function arrange(adminApi: ApiSession, uid: string, price: number): Promise<{ p: ProductDto; c: CustomerDto }> {
  const p = await createProduct(adminApi, { suffix: uid, price });
  await addStock(adminApi, p.productId, 'K001', 50);
  const c = await createCustomer(adminApi, { suffix: uid });
  return { p, c };
}

async function asSales(page: Page, env: { defaultPassword: string }): Promise<void> {
  await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
}

const priceOf = (uid: string, base: number): number => base + (Number(uid.replace(/\D/g, '').slice(-3)) % 900) * 10;

test.describe(SHEET, () => {
  test('SYS-BKG-01 – Màn Đặt hàng: danh sách, tạo, sửa, hủy có sẵn', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-BKG-01', SHEET, { mismatch: 'Pending Order được làm thành Đơn đặt hàng (DRAFT).' });
    const { p, c } = await arrange(adminApi, uid, priceOf(uid, 70_000));
    const b = await createBooking(adminApi, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price: p.standardPrice }] });
    await asSales(page, env);
    const list = new BookingListPage(page);
    await list.goto();
    await expect(page.getByRole('link', { name: 'Đặt hàng' })).toHaveAttribute('href', /\/pos\?newBooking=1/);
    await expect(list.row(b.orderCode)).toHaveCount(1);
    await list.expand(b.orderCode);
    await expect(page.getByRole('button', { name: 'Sửa đơn' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hủy', exact: true })).toBeEnabled();
  });

  test('SYS-BKG-02 – Tạo đơn đặt: trạng thái Phiếu tạm, có tổng tiền, không đổi tồn @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-BKG-02', SHEET, { mismatch: 'Thông tin tín dụng hiển thị ở POS, không ở form đặt hàng.' });
    const price = priceOf(uid, 72_000);
    const { p, c } = await arrange(adminApi, uid, price);
    const before = await stockQty(db, p.productId, 'K001');
    const pos = new PosPage(page);
    let code = '';
    await test.step('1. Tạo đơn đặt: khách hàng, chi nhánh K001, hàng hóa', async () => {
      await asSales(page, env);
      await pos.goto();
      await expect(pos.branchLabel()).toContainText(WAREHOUSES.K001.name);
      await pos.switchToBooking();
      await pos.selectCustomer(c.name);
      await pos.addProduct(p.code);
      await pos.setQuantity(p.code, 3);
    });
    await test.step('2. Lưu (ĐẶT HÀNG)', async () => {
      const res = await pos.submitBooking();
      expect(res?.status()).toBeLessThan(300);
      code = ((await res?.json()) as { orderCode: string }).orderCode;
      await expect(page.getByText(`Đã tạo đơn đặt hàng ${code}`)).toBeVisible();
    });
    await test.step('KQ1. Đơn DRAFT có tổng tiền; KQ2. tồn không đổi (BR-08)', async () => {
      const b = await bookingByCode(db, code);
      expect([b?.order_type, b?.status, Number(b?.total_amount)]).toEqual(['BOOKING', 'DRAFT', 3 * price]);
      expect(await stockQty(db, p.productId, 'K001')).toBe(before);
      const moves = await queryRows<{ n: string }>(db, 'SELECT COUNT(*)::text AS n FROM stockflow.trx_inventory_transactions WHERE product_id = $1 AND transaction_type <> $2', [p.productId, 'ADJUSTMENT_IN']);
      testInfo.annotations.push({ type: 'observed', description: `Dòng thẻ kho khác điều chỉnh ban đầu: ${moves[0].n}` });
    });
  });

  test('SYS-BKG-03 – Đơn vị và đơn giá lấy từ danh mục; sửa được đơn giá', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-BKG-03', SHEET);
    const price = priceOf(uid, 73_000);
    const { p } = await arrange(adminApi, uid, price);
    const pos = new PosPage(page);
    await asSales(page, env);
    await pos.goto();
    await pos.switchToBooking();
    await test.step('1. Thêm hàng vào đơn → KQ1. đơn vị và đơn giá từ danh mục / bảng giá', async () => {
      await pos.addProduct(p.code);
      await expect(pos.cartLine(p.code)).toContainText('Cái');
      await expect(pos.priceButton(p.code)).toHaveText(vnd(price));
    });
    await test.step('KQ2. Sửa được đơn giá', async () => {
      const newPrice = price + 5_000;
      expect(await pos.setUnitPrice(p.code, String(newPrice)), 'ô Đơn giá sửa được khi tạo đơn').not.toBeNull();
      await page.keyboard.press('Escape');
      await expect(pos.cartLine(p.code)).toContainText(vnd(newPrice));
    });
  });

  test('SYS-BKG-04 – Thiếu khách, không có hàng, số lượng ≤ 0, đơn giá âm bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-BKG-04', SHEET);
    const { p, c } = await arrange(adminApi, uid, priceOf(uid, 74_000));
    const pos = new PosPage(page);
    const count = async (): Promise<number> => Number((await queryRows<{ n: string }>(db, `SELECT COUNT(*)::text AS n FROM stockflow.trx_orders WHERE order_type = 'BOOKING' AND partner_id = $1`, [c.partnerId]))[0].n);
    await asSales(page, env);
    await pos.goto();
    await pos.switchToBooking();
    const check = async (label: string, expected: string): Promise<void> => {
      const res = await pos.submitBooking(3_000);
      const shown = page.getByText(expected, { exact: true });
      const observed = (await page.locator('.ant-message').innerText().catch(() => '')).trim();
      testInfo.annotations.push({ type: 'observed', description: `${label}: HTTP ${res?.status() ?? '(không gửi)'}; thông báo "${observed}"` });
      await expect.soft(shown, `${label}: "${expected}"`).toBeVisible();
    };
    await test.step('1a. Không chọn khách → "Vui lòng chọn khách hàng đặt hàng."', async () => {
      await pos.addProduct(p.code);
      await check('Không khách', 'Vui lòng chọn khách hàng đặt hàng.');
    });
    await test.step('1b. Không có hàng → "Đơn đặt hàng phải có ít nhất 1 hàng hóa."', async () => {
      await pos.selectCustomer(c.name);
      await pos.cartLine(p.code).getByRole('button', { name: 'Xóa hàng' }).click();
      await check('Không hàng', 'Đơn đặt hàng phải có ít nhất 1 hàng hóa.');
    });
    await test.step('1c. Số lượng 0 → "Số lượng đặt phải lớn hơn 0."', async () => {
      await pos.addProduct(p.code);
      await pos.setQuantity(p.code, 0);
      testInfo.annotations.push({ type: 'observed', description: `Ô số lượng sau khi nhập 0: "${await pos.qtyInput(p.code).inputValue()}"` });
      await check('Số lượng 0', 'Số lượng đặt phải lớn hơn 0.');
    });
    await test.step('1d. Đơn giá âm → "Đơn giá không được âm."', async () => {
      await pos.setQuantity(p.code, 1);
      const input = await pos.setUnitPrice(p.code, '-1000');
      const value = input ? await input.inputValue() : '(ô Đơn giá chỉ đọc)';
      await page.keyboard.press('Escape');
      if (!value.includes('-')) {
        const be = await backendError(() =>
          (adminApi as ApiSession).post('/api/sales-bookings', { partnerId: c.partnerId, warehouseId: 3, paidAmount: 0, paymentMethod: 'CASH', items: [{ productId: p.productId, unitId: 8, quantity: 1, originalPrice: -1000 }] })
        );
        uiBlocksAction(testInfo, `ô Đơn giá không nhận số âm (giá trị sau khi nhập "-1000": "${value}")`, 'Đơn giá không được âm.', be);
      } else {
        await check('Đơn giá âm', 'Đơn giá không được âm.');
      }
    });
    await test.step('Không đơn nào được tạo', async () => {
      expect(await count()).toBe(0);
    });
  });

  test('SYS-BKG-05 – Tìm theo mã, khách, điện thoại; lọc trạng thái', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-BKG-05', SHEET);
    const price = priceOf(uid, 75_000);
    const { p, c } = await arrange(adminApi, uid, price);
    const c2 = await createCustomer(adminApi, { suffix: uid, namePrefix: 'KH E2E B', salt: 3 });
    const b1 = await createBooking(adminApi, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price }] });
    const b2 = await createBooking(adminApi, { partnerId: c2.partnerId, lines: [{ productId: p.productId, qty: 1, price }] });
    const b3 = await createBooking(adminApi, { partnerId: c2.partnerId, lines: [{ productId: p.productId, qty: 4, price }] });
    await adminApi.post(`/api/sales-bookings/${b3.orderId}/cancel`, { keepDeposit: false });
    await asSales(page, env);
    const list = new BookingListPage(page);
    await list.goto();
    for (const [label, term, expected] of [
      ['mã', b1.orderCode, [b1.orderCode]],
      ['khách hàng', c.name, [b1.orderCode]],
      ['điện thoại', c2.phone, [b2.orderCode]],
    ] as const) {
      await test.step(`1. Tìm theo ${label}`, async () => {
        await list.search.fill(term);
        await expect.poll(async () => (await list.dataRows().allInnerTexts()).map((t) => /DH\d+/.exec(t)?.[0])).toEqual([...expected]);
        await expect(list.row(expected[0])).toContainText(vnd(label === 'điện thoại' ? price : 2 * price));
      });
    }
    await test.step('2. Lọc trạng thái "Đã hủy" → chỉ đơn đã hủy', async () => {
      await list.search.fill(c2.phone);
      await list.status('Phiếu tạm').uncheck();
      await list.status('Hoàn thành').uncheck();
      await list.status('Đã hủy').check();
      await expect.poll(async () => (await list.dataRows().allInnerTexts()).map((t) => /DH\d+/.exec(t)?.[0])).toEqual([b3.orderCode]);
    });
    await test.step('KQ. Đơn có dòng hàng và tổng tiền', async () => {
      await list.status('Phiếu tạm').check();
      await list.search.fill(b1.orderCode);
      await list.expand(b1.orderCode);
      await expect(page.getByText(p.code).first()).toBeVisible();
    });
  });

  test('SYS-BKG-06 – Sửa số lượng, đơn giá của đơn Phiếu tạm; tổng tính lại', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-BKG-06', SHEET);
    const price = priceOf(uid, 76_000);
    const { p, c } = await arrange(adminApi, uid, price);
    const b = await createBooking(adminApi, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price }] });
    await asSales(page, env);
    const list = new BookingListPage(page);
    await list.goto();
    await list.expand(b.orderCode);
    await page.getByRole('button', { name: 'Sửa đơn' }).click();
    const pos = new PosPage(page);
    await expect(pos.cartLine(p.code)).toBeVisible();
    await pos.setQuantity(p.code, 5);
    const newPrice = price - 2_000;
    const how = await pos.changeLinePrice(p.code, price, newPrice);
    testInfo.annotations.push({ type: 'observed', description: how === 'discount' ? 'Khi sửa đơn đặt, ô Đơn giá chỉ đọc; đổi giá bán bằng Giảm giá 2.000 đ (VND)' : 'Đổi ở ô Đơn giá' });
    await page.keyboard.press('Escape');
    const res = await pos.submitBooking();
    expect(res?.status()).toBeLessThan(300);
    await expect(page.getByText(`Đã lưu đơn đặt hàng ${b.orderCode}`)).toBeVisible();
    expect(Number((await bookingByCode(db, b.orderCode))?.total_amount)).toBe(5 * newPrice);
  });

  test('SYS-BKG-07 – Đơn đã hủy không sửa được', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-BKG-07', SHEET);
    const price = priceOf(uid, 77_000);
    const { p, c } = await arrange(adminApi, uid, price);
    const b = await createBooking(adminApi, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price }] });
    await adminApi.post(`/api/sales-bookings/${b.orderId}/cancel`, { keepDeposit: false });
    await asSales(page, env);
    const list = new BookingListPage(page);
    await list.goto();
    await list.status('Đã hủy').check();
    await list.expand(b.orderCode);
    const expected = `Đơn ${b.orderCode} đang ở trạng thái không cho phép sửa.`;
    if ((await page.getByRole('button', { name: 'Sửa đơn' }).count()) === 0) {
      const be = await backendError(() => adminApi.put(`/api/sales-bookings/${b.orderId}`, { partnerId: c.partnerId, warehouseId: 3, paidAmount: 0, paymentMethod: 'CASH', items: [{ productId: p.productId, unitId: 8, quantity: 3, originalPrice: price }] }));
      uiBlocksAction(testInfo, 'nút "Sửa đơn" bị ẩn với đơn đã hủy', expected, be);
    } else {
      await page.getByRole('button', { name: 'Sửa đơn' }).click();
      await expect(page.getByText(expected)).toBeVisible();
    }
    expect((await bookingByCode(db, b.orderCode))?.status).toBe('CANCELLED');
  });

  test('SYS-BKG-08 – Hủy đơn Phiếu tạm sau khi xác nhận → Đã hủy', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-BKG-08', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Điều kiện kiểm đã duyệt: CANCELLED, tồn không đổi, chọn hoàn tiền cọc; trường lý do hủy: ghi hành vi thực tế' });
    const price = priceOf(uid, 78_000);
    const { p, c } = await arrange(adminApi, uid, price);
    const b = await createBooking(adminApi, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price }], paid: 50_000 });
    const before = await stockQty(db, p.productId, 'K001');
    await asSales(page, env);
    const list = new BookingListPage(page);
    await list.goto();
    await list.expand(b.orderCode);
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(page.getByText('Hủy đơn đặt hàng')).toBeVisible();
    const hasReason = (await page.getByRole('textbox', { name: /lý do/i }).count()) > 0;
    testInfo.annotations.push({ type: 'observed', description: `Hộp hủy có ô lý do: ${hasReason ? 'có' : 'không'}; lựa chọn tiền cọc: ${(await page.getByRole('radio').count()) > 0 ? 'có' : 'không'}` });
    await page.getByRole('radio', { name: /Hoàn tiền cho khách/ }).check();
    const cancelResp = page.waitForResponse((r) => /\/api\/sales-bookings\/\d+\/cancel$/.test(new URL(r.url()).pathname), { timeout: 8_000 }).catch(() => null);
    await page.getByRole('button', { name: 'Đồng ý' }).click();
    const cr = await cancelResp;
    testInfo.annotations.push({ type: 'observed', description: `Quyền SALES_* của SalesStaff: ${(await permissionCodesOfRole(db, 'SalesStaff', 'SALES%')).join(', ')} (seed chưa có SALES_DELETE; Admin lưu ma trận một lần thì DeriveModulePermissionCodes cấp thêm SALES_DELETE / SALES_APPROVE)` });
    testInfo.annotations.push({ type: 'observed', description: `POST cancel: ${cr ? cr.status() + ' ' + (await cr.text()).slice(0, 200) : '(không gửi request)'}` });
    await expect(page.getByText(`Đã hủy đơn ${b.orderCode}`)).toBeVisible();
    expect((await bookingByCode(db, b.orderCode))?.status).toBe('CANCELLED');
    expect(await stockQty(db, p.productId, 'K001')).toBe(before);
  });

  test('SYS-BKG-09 – Đơn đã hủy không hủy lại được', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-BKG-09', SHEET);
    const price = priceOf(uid, 79_000);
    const { p, c } = await arrange(adminApi, uid, price);
    const b = await createBooking(adminApi, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price }] });
    await adminApi.post(`/api/sales-bookings/${b.orderId}/cancel`, { keepDeposit: false });
    await asSales(page, env);
    const list = new BookingListPage(page);
    await list.goto();
    await list.status('Đã hủy').check();
    await list.expand(b.orderCode);
    const expected = `Đơn ${b.orderCode} đã hoàn thành hoặc đã hủy.`;
    if (await page.getByRole('button', { name: 'Hủy', exact: true }).isDisabled()) {
      const be = await backendError(() => adminApi.post(`/api/sales-bookings/${b.orderId}/cancel`, { keepDeposit: false }));
      uiBlocksAction(testInfo, 'nút "Hủy" bị vô hiệu với đơn đã hủy', expected, be);
    } else {
      await page.getByRole('button', { name: 'Hủy', exact: true }).click();
      await page.getByRole('button', { name: 'Đồng ý' }).click();
      await expect(page.getByText(expected)).toBeVisible();
    }
  });
});
