// Report 5.3 – sheet "UC-23 Consolidate Orders" (SYS-CON-01..11). Ca CON-01/02/06 (đã xoá 27/11/2026: chức năng nhóm bỏ, Report 3 ghi ngoài phạm vi).
import { test, expect, traceTc, newUserContext } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { PosPage } from '../../pages/PosPage';
import { ApprovalsPage, BookingListPage } from '../../pages/SalesPages';
import { SEEDED } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct, type ProductDto } from '../../fixtures/data';
import { createBooking, createCreditRequest, createCustomer, setCreditLimit, type CustomerDto } from '../../fixtures/sales';
import { queryRows } from '../../fixtures/pg';
import { seeMessage } from '../../fixtures/ui';
import type { Client } from 'pg';
import type { Page } from '@playwright/test';

const SHEET = 'UC-23 Consolidate Orders';
const vnd = (n: number): string => n.toLocaleString('vi-VN');
const priceOf = (uid: string, base: number): number => base + (Number(uid.replace(/\D/g, '').slice(-3)) % 900) * 10;

async function arrange(adminApi: ApiSession, uid: string, price: number): Promise<{ p: ProductDto; c: CustomerDto }> {
  const p = await createProduct(adminApi, { suffix: uid, price });
  await addStock(adminApi, p.productId, 'K001', 50);
  const c = await createCustomer(adminApi, { suffix: uid });
  return { p, c };
}

async function asSales(page: Page, env: { defaultPassword: string }): Promise<void> {
  await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
}

async function orderRows(db: Client, partnerId: number, type: 'BOOKING' | 'ORDER'): Promise<{ order_code: string; status: string; total_amount: string; paid_amount: string | null; payment_status: string | null }[]> {
  return queryRows(
    db,
    `SELECT order_code, status, total_amount::text AS total_amount, paid_amount::text AS paid_amount, payment_status
       FROM stockflow.trx_orders WHERE partner_id = $1 AND order_type = $2 ORDER BY order_id`,
    [partnerId, type]
  );
}

async function creditRequests(db: Client, partnerId: number): Promise<{ request_id: number; request_code: string | null; status: string; approval_notes: string | null }[]> {
  return queryRows(db, 'SELECT request_id, request_code, status, approval_notes FROM stockflow.trx_credit_limit_requests WHERE partner_id = $1 ORDER BY request_id', [partnerId]);
}

test.describe(SHEET, () => {

  test('SYS-CON-03 – Gộp 2 đơn Phiếu tạm cùng khách: đơn mới đủ dòng, đơn nguồn bị hủy', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-CON-03', SHEET, { mismatch: 'Description: gộp số lượng kèm mã đơn nguồn; Expected (code): tạo đơn mới, đơn nguồn bị hủy (Merge Bookings).' });
    const price = priceOf(uid, 81_000);
    const { p, c } = await arrange(adminApi, uid, price);
    const p2 = await createProduct(adminApi, { suffix: `${uid}b`, price: price + 1_000 });
    await addStock(adminApi, p2.productId, 'K001', 10);
    const b1 = await createBooking(adminApi, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price }] });
    const b2 = await createBooking(adminApi, { partnerId: c.partnerId, lines: [{ productId: p2.productId, qty: 3, price: price + 1_000 }] });
    await asSales(page, env);
    const list = new BookingListPage(page);
    await list.goto();
    await test.step('1. Chọn 2 đơn Phiếu tạm của một khách', async () => {
      await list.select(b1.orderCode);
      await list.select(b2.orderCode);
    });
    let newCode = '';
    await test.step('2. Bấm Gộp đơn → xác nhận', async () => {
      await page.getByRole('button', { name: /^Gộp đơn \(2\)/ }).click();
      await expect(page.getByText('Gộp đơn đặt hàng')).toBeVisible();
      const [res] = await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === '/api/sales-bookings/merge'),
        page.getByRole('button', { name: 'Gộp đơn', exact: true }).last().click(),
      ]);
      expect(res.status(), await res.text()).toBeLessThan(300);
      newCode = ((await res.json()) as { orderCode: string }).orderCode;
      await expect(page.getByText(`Đã gộp 2 đơn thành đơn ${newCode}`)).toBeVisible();
    });
    await test.step('KQ. Đơn mới có đủ dòng hàng; đơn nguồn Đã hủy', async () => {
      const rows = await orderRows(db, c.partnerId, 'BOOKING');
      const byCode = Object.fromEntries(rows.map((r) => [r.order_code, r]));
      expect([byCode[b1.orderCode]?.status, byCode[b2.orderCode]?.status]).toEqual(['CANCELLED', 'CANCELLED']);
      expect(byCode[newCode]?.status).toBe('DRAFT');
      expect(Number(byCode[newCode]?.total_amount)).toBe(2 * price + 3 * (price + 1_000));
      const items = await queryRows<{ product_id: number; quantity: string }>(
        db,
        `SELECT i.product_id, i.quantity::text AS quantity FROM stockflow.dtl_order_items i JOIN stockflow.trx_orders o ON o.order_id = i.order_id WHERE o.order_code = $1 ORDER BY i.product_id`,
        [newCode]
      );
      expect(items.map((i) => [i.product_id, Number(i.quantity)])).toEqual([
        [p.productId, 2],
        [p2.productId, 3],
      ]);
    });
  });

  test('SYS-CON-04 – Không gộp được đơn của hai khách khác nhau', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-CON-04', SHEET, { mismatch: 'Code: Merge Bookings.' });
    const price = priceOf(uid, 82_000);
    const { p, c } = await arrange(adminApi, uid, price);
    const c2 = await createCustomer(adminApi, { suffix: uid, namePrefix: 'KH E2E B', salt: 4 });
    const b1 = await createBooking(adminApi, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 1, price }] });
    const b2 = await createBooking(adminApi, { partnerId: c2.partnerId, lines: [{ productId: p.productId, qty: 2, price }] });
    await asSales(page, env);
    const list = new BookingListPage(page);
    await list.goto();
    await list.select(b1.orderCode);
    await list.select(b2.orderCode);
    await page.getByRole('button', { name: /^Gộp đơn \(2\)/ }).click();
    const expected = 'Chỉ gộp được các đơn của cùng 1 khách hàng (BR-09).';
    const confirm = page.getByRole('button', { name: 'Gộp đơn', exact: true }).last();
    const observed = (await page.getByText(/Chỉ gộp được các đơn/).first().textContent().catch(() => null)) ?? '(không có)';
    testInfo.annotations.push({ type: 'observed', description: `Thông báo: "${observed}"; nút xác nhận ${(await confirm.isDisabled()) ? 'bị khoá' : 'bấm được'}` });
    if (await confirm.isEnabled()) {
      dialogs.expect(/Chỉ gộp được/);
      await confirm.click();
      await seeMessage(page, dialogs, /Chỉ gộp được các đơn của cùng 1 khách hàng \(BR-09\)\./);
    } else {
      await expect.soft(page.getByText(expected, { exact: true }), `"${expected}"`).toBeVisible();
    }
    expect((await orderRows(db, c.partnerId, 'BOOKING')).map((r) => r.status)).toEqual(['DRAFT']);
    expect((await orderRows(db, c2.partnerId, 'BOOKING')).map((r) => r.status)).toEqual(['DRAFT']);
  });

  test('SYS-CON-05 – Đặt cọc 200.000 bằng chuyển khoản: ghi nhận tiền cọc, thanh toán một phần', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-CON-05', SHEET, { mismatch: 'Code: thanh toán chỉ có ở tiền cọc của đơn đặt.' });
    const price = priceOf(uid, 330_000);
    const { p, c } = await arrange(adminApi, uid, price);
    const pos = new PosPage(page);
    await asSales(page, env);
    await pos.goto();
    await pos.switchToBooking();
    await pos.selectCustomer(c.name);
    await pos.addProduct(p.code);
    await pos.transferRadio.check();
    await pos.setPaid(200_000);
    const res = await pos.submitBooking();
    expect(res?.status(), res ? await res.text() : '(không gửi)').toBeLessThan(300);
    const code = ((await res?.json()) as { orderCode: string }).orderCode;
    await expect(page.getByText(`Đã tạo đơn đặt hàng ${code}`)).toBeVisible();
    const row = (await orderRows(db, c.partnerId, 'BOOKING'))[0];
    expect([row.order_code, Number(row.paid_amount), row.payment_status]).toEqual([code, 200_000, 'PARTIAL']);
    const fin = await queryRows<{ amount: string; payment_method: string | null; tx_type: string | null }>(
      db,
      `SELECT f.amount::text AS amount, f.payment_method, f.tx_type FROM stockflow.trx_financial_transactions f
         JOIN stockflow.trx_orders o ON o.order_id = f.reference_id WHERE o.order_code = $1`,
      [code]
    );
    testInfo.annotations.push({ type: 'observed', description: `Chứng từ thu: ${JSON.stringify(fin)}` });
    expect(fin.some((f) => Number(f.amount) === 200_000)).toBe(true);
  });

  test('SYS-CON-07 – Thanh toán chuyển khoản: hiện QR với số tiền và mã giao dịch', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-CON-07', SHEET, { mismatch: 'Code: QR chỉ có ở thanh toán POS (payOS).' });
    testInfo.annotations.push({ type: 'note', description: 'payOS được giả lập bằng page.route (không dùng khoá thật)' });
    const price = priceOf(uid, 120_000);
    const { p } = await arrange(adminApi, uid, price);
    const orderCode = 900_000 + (Number(uid.replace(/\D/g, '').slice(-5)) % 99_999);
    const fake = {
      orderCode,
      referenceCode: `HH-E2E-${orderCode}`,
      amount: price,
      description: `E2E ${orderCode}`,
      status: 'PENDING',
      checkoutUrl: `https://pay.payos.vn/web/e2e${orderCode}`,
      qrCode: `00020101021238570010A000000727012700069704220113E2E${orderCode}0208QRIBFTTA53037045405${price}5802VN6304ABCD`,
      secondsLeft: 600,
    };
    await page.route(/\/api\/payments\/payos(\/\d+)?$/, (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fake) }));
    const pos = new PosPage(page);
    await asSales(page, env);
    await pos.goto();
    await pos.addProduct(p.code);
    await pos.transferRadio.check();
    await page.getByRole('button', { name: /^Tạo QR thanh toán/ }).click();
    await expect(page.getByText('Mã đơn hàng')).toBeVisible();
    await expect(page.getByText(fake.referenceCode)).toBeVisible();
    await expect(page.getByText(`${vnd(price)}₫`).first()).toBeVisible();
    await expect(page.locator('canvas, svg').filter({ visible: true }).first()).toBeVisible();
  });

  test('SYS-CON-08 – Vượt hạn mức: gửi yêu cầu duyệt kèm lý do, giao dịch chờ Manager @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-CON-08', SHEET, { mismatch: 'Yêu cầu gửi từ POS (không từ gộp đơn).' });
    const price = priceOf(uid, 300_000);
    const { p, c } = await arrange(adminApi, uid, price);
    await setCreditLimit(adminApi, c.partnerId, 100_000);
    const pos = new PosPage(page);
    await asSales(page, env);
    await pos.goto();
    await pos.selectCustomer(c.name);
    await pos.addProduct(p.code);
    await pos.setPaid(0);
    await test.step('1. Bán ghi nợ vượt hạn mức còn lại', async () => {
      const res = await pos.tryPay();
      expect(res?.status()).toBe(400);
      await expect(page.getByRole('heading', { name: 'Vượt hạn mức tín dụng' })).toBeVisible();
    });
    await test.step('2. Bấm Gửi yêu cầu duyệt, nhập lý do', async () => {
      await page.getByPlaceholder('VD: Khách quen, cam kết thanh toán trong 7 ngày').fill(`E2E lý do ${uid}`);
      const [res] = await Promise.all([
        page.waitForResponse((r) => new URL(r.url()).pathname === '/api/credit-requests' && r.request().method() === 'POST'),
        page.getByRole('button', { name: 'Gửi yêu cầu duyệt' }).click(),
      ]);
      expect(res.status(), await res.text()).toBeLessThan(300);
      const msg = ((await res.json()) as { message?: string }).message ?? '';
      testInfo.annotations.push({ type: 'observed', description: `Thông báo sau khi gửi (MSG23): "${msg}"` });
      if (msg) await expect(page.getByText(msg).first()).toBeVisible();
    });
    await test.step('KQ. Yêu cầu tín dụng PENDING; chưa có hóa đơn', async () => {
      const reqs = await creditRequests(db, c.partnerId);
      expect(reqs.map((r) => r.status)).toEqual(['PENDING']);
      expect(await orderRows(db, c.partnerId, 'ORDER')).toEqual([]);
    });
  });

  test('SYS-CON-09 – Manager duyệt nâng hạn mức: bán lại được', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-CON-09', SHEET, { mismatch: 'Code: không có yêu cầu xuất kho; bán lại trên POS.' });
    const price = priceOf(uid, 300_000);
    const { p, c } = await arrange(adminApi, uid, price);
    await setCreditLimit(adminApi, c.partnerId, 100_000);
    const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
    await createCreditRequest(sales, { partnerId: c.partnerId, expectedNewDebt: price, requestedLimit: price + 100_000, reason: `E2E ${uid}` });
    await sales.dispose();
    const reqCode = (await creditRequests(db, c.partnerId))[0].request_code ?? c.name;
    await test.step('1. Manager duyệt yêu cầu (nâng hạn mức)', async () => {
      await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
      const ap = new ApprovalsPage(page);
      await ap.goto();
      await ap.open(reqCode);
      expect(await ap.decide('Duyệt nâng hạn mức', 'E2E duyệt', price + 100_000)).toBe(200);
      expect((await creditRequests(db, c.partnerId))[0].status).toBe('APPROVED');
    });
    await test.step('2. Nhân viên bán hàng bán lại trên POS → KQ. bán được với hạn mức mới', async () => {
      const s = await newUserContext(browser, testInfo, dialogs);
      await new LoginPage(s.page).loginOk(SEEDED.sales.username, env.defaultPassword);
      const pos = new PosPage(s.page);
      await pos.goto();
      await pos.selectCustomer(c.name);
      await pos.addProduct(p.code);
      await pos.setPaid(0);
      const res = await pos.pay();
      expect(res.status(), await res.text()).toBeLessThan(300);
      await expect(s.page.getByText(/^Đã thanh toán hóa đơn /)).toBeVisible();
      await s.context.close();
    });
  });

  test('SYS-CON-10 – Manager từ chối kèm lý do: nhân viên thấy Từ chối và lý do', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-CON-10', SHEET);
    const price = priceOf(uid, 300_000);
    const { c } = await arrange(adminApi, uid, price);
    await setCreditLimit(adminApi, c.partnerId, 100_000);
    const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
    await createCreditRequest(sales, { partnerId: c.partnerId, expectedNewDebt: price, requestedLimit: price + 100_000, reason: `E2E ${uid}` });
    await sales.dispose();
    const reqCode = (await creditRequests(db, c.partnerId))[0].request_code ?? c.name;
    const reason = `Khách nợ quá hạn ${uid}`;
    await test.step('1. Manager từ chối với lý do', async () => {
      await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
      const ap = new ApprovalsPage(page);
      await ap.goto();
      await ap.open(reqCode);
      expect(await ap.decide('Từ chối', reason)).toBe(200);
      expect((await creditRequests(db, c.partnerId))[0].status).toBe('REJECTED');
    });
    await test.step('2. Nhân viên mở "Yêu cầu của tôi" → KQ. Từ chối kèm lý do', async () => {
      const s = await newUserContext(browser, testInfo, dialogs);
      await new LoginPage(s.page).loginOk(SEEDED.sales.username, env.defaultPassword);
      const pos = new PosPage(s.page);
      await pos.goto();
      await pos.selectCustomer(c.name);
      await s.page.getByRole('button', { name: 'Hạn mức còn lại' }).click();
      await expect(s.page.getByText('Từ chối').first()).toBeVisible();
      await expect(s.page.getByText(reason)).toBeVisible();
      await s.context.close();
    });
  });

  test('SYS-CON-11 – Vượt hạn mức chưa được duyệt: không bán được, không tạo hóa đơn @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-CON-11', SHEET);
    const price = priceOf(uid, 300_000);
    const { p, c } = await arrange(adminApi, uid, price);
    await setCreditLimit(adminApi, c.partnerId, 100_000);
    const pos = new PosPage(page);
    await asSales(page, env);
    await pos.goto();
    await pos.selectCustomer(c.name);
    await pos.addProduct(p.code);
    await pos.setPaid(0);
    const res = await pos.tryPay();
    expect(res?.status()).toBe(400);
    const body = res ? await res.text() : '';
    testInfo.annotations.push({ type: 'observed', description: `Phản hồi: ${body.slice(0, 250)}` });
    expect(body).toMatch(/CUS-00[89]|hạn mức/);
    await expect(page.getByRole('heading', { name: 'Vượt hạn mức tín dụng' })).toBeVisible();
    expect(await orderRows(db, c.partnerId, 'ORDER')).toEqual([]);
  });
});
