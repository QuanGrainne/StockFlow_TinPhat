// Report 5.3 – sheet "UC-83 Finance and Reports" (SYS-FIN-01..12). Actor Manager = manager01.
// Phiếu thu (PT…) lập ở màn Khách hàng → tab "Nợ cần thu từ khách" → "Thanh toán"; phiếu chi NCC (PC…) ở màn Nhà cung cấp →
// "Nợ cần trả nhà cung cấp" → "Thanh toán". Báo cáo (FIN-01, 02, 08–12) là N/A theo Note.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { CustomersAdminPage, SuppliersPage, fieldAfter } from '../../pages/MasterDataPages';
import { SEEDED } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct } from '../../fixtures/data';
import { createCustomer, createInvoice, createSalesReturn, setCreditLimit, type CustomerDto } from '../../fixtures/sales';
import { partnerById, vouchersOf } from '../../fixtures/dbq3';
import { suppliers, type SupplierRef } from '../../fixtures/purchasing';
import { readToast } from '../../fixtures/ui';
import type { E2EEnv } from '../../fixtures/env';
import type { Locator, Page } from '@playwright/test';

const SHEET = 'UC-83 Finance and Reports';
const USER = SEEDED.manager.username;
const priceOf = (uid: string, base: number): number => base + (Number(uid.replace(/\D/g, '').slice(-3)) % 900) * 10;
const num = (s: string | null | undefined): number => Number(s ?? 0);

function na(tc: string, title: string, reason: string): void {
  test(`${tc} – ${title}`, async ({}, testInfo) => {
    traceTc(testInfo, tc, SHEET);
    test.skip(true, `N/A – ${reason}`);
  });
}

/** Khách có nợ: hóa đơn ghi nợ 2 × price */
async function debtor(env: E2EEnv, adminApi: ApiSession, uid: string, base: number, paidInFull = false): Promise<{ c: CustomerDto; price: number; invoiceId: number; productId: number }> {
  const price = priceOf(uid, base);
  const p = await createProduct(adminApi, { suffix: uid, price });
  await addStock(adminApi, p.productId, 'K001', 20);
  const c = await createCustomer(adminApi, { suffix: uid });
  await setCreditLimit(adminApi, c.partnerId, 10_000_000);
  const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
  const inv = await createInvoice(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price }], paid: paidInFull ? 2 * price : 0, requestId: `fin-${uid}` });
  await sales.dispose();
  return { c, price, invoiceId: inv.orderId, productId: p.productId };
}

/** Hộp "Thanh toán" (phiếu thu / chi): khối nhỏ nhất có tiêu đề và nút "Bỏ qua" */
function payModal(page: Page): Locator {
  return page
    .locator('div')
    .filter({ has: page.getByRole('heading', { name: /^(Thanh toán|Trả tiền khách|Phiếu chi|Chi tiền)/, level: 3 }) })
    .filter({ has: page.getByRole('button', { name: 'Bỏ qua' }) })
    .last();
}

async function openCustomerPay(page: Page, env: E2EEnv, code: string, button: 'Thanh toán' | 'Trả tiền khách'): Promise<Locator> {
  await new LoginPage(page).loginOk(USER, env.defaultPassword);
  const cp = new CustomersAdminPage(page);
  await cp.goto();
  await cp.expand(code);
  await page.getByRole('button', { name: 'Nợ cần thu từ khách' }).click();
  await page.getByRole('button', { name: button, exact: true }).click();
  const m = payModal(page);
  await expect(m).toBeVisible();
  return m;
}

/** NCC có công nợ: phiếu nhập hoàn thành chưa trả tiền (3 × price) */
async function creditor(adminApi: ApiSession, uid: string, base: number): Promise<{ s: SupplierRef; price: number }> {
  const price = priceOf(uid, base);
  const p = await createProduct(adminApi, { suffix: uid, price: price + 10_000 });
  const all = await suppliers(adminApi);
  const s = all[1];
  await adminApi.post('/api/purchases', {
    warehouseId: 3, partnerId: s.id, status: 'COMPLETED', paidAmount: 0, paymentMethod: 'CASH',
    items: [{ productId: p.productId, quantity: 3, unitPrice: price, defectQuantity: 0 }],
  });
  return { s, price };
}

async function openSupplierPay(page: Page, env: E2EEnv, code: string): Promise<Locator> {
  await new LoginPage(page).loginOk(USER, env.defaultPassword);
  const sp = new SuppliersPage(page);
  await sp.goto();
  await sp.expand(code);
  await page.getByRole('button', { name: 'Nợ cần trả nhà cung cấp' }).click();
  await page.getByRole('button', { name: 'Thanh toán', exact: true }).click();
  const m = payModal(page);
  await expect(m).toBeVisible();
  return m;
}

async function submit(m: Locator, label: RegExp, timeout = 6_000): Promise<number | null> {
  const page = m.page();
  const res = page
    .waitForResponse((r) => r.request().method() === 'POST' && /\/api\/(customers|suppliers|payments|financial|vouchers|receipts)/i.test(new URL(r.url()).pathname), { timeout })
    .catch(() => null);
  await m.getByRole('button', { name: label }).last().click();
  const r = await res;
  return r ? r.status() : null;
}

test.describe(SHEET, () => {
  na('SYS-FIN-01', 'Danh sách chức năng Tài chính & Báo cáo', 'Chưa có chức năng (Note: /reports chuyển về /dashboard)');
  na('SYS-FIN-02', 'Báo lỗi khi không lấy được dữ liệu báo cáo', 'Chưa có chức năng (Note)');

  test('SYS-FIN-03 – Lập phiếu thu: lưu số tiền, phương thức; giảm nợ khách @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FIN-03', SHEET, { mismatch: 'Form phiếu thu không có ô "tham chiếu" (Procedure).' });
    const { c, price } = await debtor(env, adminApi, uid, 81_000);
    const debt0 = num((await partnerById(db, c.partnerId))?.current_debt);
    const before = (await vouchersOf(db, c.partnerId)).length;
    const m = await openCustomerPay(page, env, c.code, 'Thanh toán');
    await fieldAfter(m, 'Số tiền').fill(String(price));
    const method = fieldAfter(m, 'Phương thức thanh toán', 'select');
    const options = await method.locator('option').allInnerTexts();
    testInfo.annotations.push({ type: 'observed', description: `Phương thức: ${options.join(' | ')}` });
    await method.selectOption({ index: Math.min(1, options.length - 1) });
    const [status, toast] = await Promise.all([submit(m, /^Tạo phiếu thu$/), readToast(page.getByText(/^Đã tạo phiếu thu /).first())]);
    expect(status, 'tạo phiếu thu').toBeLessThan(300);
    const v = (await vouchersOf(db, c.partnerId)).slice(before);
    testInfo.annotations.push({ type: 'observed', description: `Thông báo: "${toast}"` });
    testInfo.annotations.push({ type: 'observed', description: `Phiếu thu: ${JSON.stringify(v)}` });
    expect(v.map((x) => num(x.amount))).toContain(price);
    expect(num((await partnerById(db, c.partnerId))?.current_debt)).toBe(debt0 - price);
  });

  test('SYS-FIN-04 – Số tiền thu 0 hoặc vượt nợ bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FIN-04', SHEET);
    const { c, price } = await debtor(env, adminApi, uid, 82_000);
    const m = await openCustomerPay(page, env, c.code, 'Thanh toán');
    await test.step('1a. Số tiền 0 → "Số tiền thu phải lớn hơn 0."', async () => {
      await fieldAfter(m, 'Số tiền').fill('0');
      const [status, text] = await Promise.all([submit(m, /^Tạo phiếu thu$/, 4_000), readToast(page.getByText(/số tiền thu/i).first())]);
      testInfo.annotations.push({ type: 'observed', description: `SL 0: HTTP ${status ?? '(không gửi)'}; "${text}"` });
      expect(status).toBeNull();
      expect.soft(text, 'câu thông báo').toBe('Số tiền thu phải lớn hơn 0.');
    });
    await test.step('1b. Vượt nợ → "Số tiền thu (...) vượt quá nợ hiện tại của khách (...)."', async () => {
      await fieldAfter(m, 'Số tiền').fill(String(3 * price));
      const [status, text] = await Promise.all([submit(m, /^Tạo phiếu thu$/, 4_000), readToast(page.getByText(/vượt quá nợ hiện tại/).first())]);
      testInfo.annotations.push({ type: 'observed', description: `Vượt nợ: HTTP ${status ?? '(không gửi)'}; "${text}"` });
      expect(status === null || status >= 400).toBe(true);
      expect.soft(text, 'câu có số tiền thu và nợ hiện tại').toMatch(/^Số tiền thu \(.+\) vượt quá nợ hiện tại của khách \(.+\)\.$/);
    });
    expect((await vouchersOf(db, c.partnerId)).filter((x) => num(x.amount) > 0 && x.reference_type !== 'ORDER' && !/^HD/.test(x.tx_code ?? ''))).toEqual([]);
  });

  test('SYS-FIN-05 – Lập phiếu chi trả NCC: giảm công nợ phải trả', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FIN-05', SHEET);
    const { s, price } = await creditor(adminApi, uid, 83_000);
    const payable0 = num((await partnerById(db, s.id))?.current_payable);
    const before = (await vouchersOf(db, s.id)).length;
    const m = await openSupplierPay(page, env, s.code);
    await fieldAfter(m, 'Số tiền').fill(String(price));
    const status = await submit(m, /^Tạo phiếu chi$/);
    expect(status, 'tạo phiếu chi').toBeLessThan(300);
    const v = (await vouchersOf(db, s.id)).slice(before);
    testInfo.annotations.push({ type: 'observed', description: `Phiếu mới: ${JSON.stringify(v)}` });
    expect(v.some((x) => /^PC/.test(x.tx_code ?? '') && num(x.amount) === price)).toBe(true);
    expect(num((await partnerById(db, s.id))?.current_payable)).toBe(payable0 - price);
  });

  test('SYS-FIN-06 – Trả tiền khách đang được nợ (khoản phải hoàn) làm giảm khoản phải hoàn', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FIN-06', SHEET, { mismatch: 'Code: không có trạng thái "Refund Due"; khoản cửa hàng nợ khách (dư nợ âm) trả bằng "Trả tiền khách" (phiếu chi).' });
    const { c, price, invoiceId, productId } = await debtor(env, adminApi, uid, 84_000, true);
    const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
    await createSalesReturn(sales, { invoiceId, partnerId: c.partnerId, productId, qty: 1, price, refund: 0 });
    await sales.dispose();
    const debt0 = num((await partnerById(db, c.partnerId))?.current_debt);
    testInfo.annotations.push({ type: 'observed', description: `Dư nợ sau trả hàng không hoàn tiền: ${debt0}` });
    expect(debt0, 'tiền đề: cửa hàng đang nợ khách').toBeLessThan(0);
    const m = await openCustomerPay(page, env, c.code, 'Trả tiền khách');
    // Hộp "Trả tiền khách" (DebtRefundModal): ô "Tiền trả khách", nút "Tạo" → phiếu chi PC...
    await m.getByLabel('Tiền trả khách').fill(String(-debt0));
    const [status, toast] = await Promise.all([submit(m, /^Tạo/), readToast(page.getByText(/^Đã lập phiếu chi /).first())]);
    testInfo.annotations.push({ type: 'observed', description: `Thông báo: "${toast}"` });
    expect(status, 'tạo phiếu chi trả khách').toBeLessThan(300);
    expect(num((await partnerById(db, c.partnerId))?.current_debt)).toBe(0);
    expect((await vouchersOf(db, c.partnerId)).some((x) => /^PC/.test(x.tx_code ?? ''))).toBe(true);
  });

  test('SYS-FIN-07 – Số tiền chi 0 hoặc vượt công nợ phải trả bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FIN-07', SHEET);
    const { s } = await creditor(adminApi, uid, 85_000);
    const before = (await vouchersOf(db, s.id)).length;
    const payable = num((await partnerById(db, s.id))?.current_payable);
    const m = await openSupplierPay(page, env, s.code);
    await test.step('1a. Số tiền 0 → "Số tiền thanh toán phải lớn hơn 0."', async () => {
      await fieldAfter(m, 'Số tiền').fill('0');
      const [status, text] = await Promise.all([submit(m, /^Tạo phiếu chi$/, 4_000), readToast(page.getByText(/số tiền thanh toán/i).first())]);
      testInfo.annotations.push({ type: 'observed', description: `SL 0: HTTP ${status ?? '(không gửi)'}; "${text}"` });
      expect(status).toBeNull();
      expect.soft(text, 'câu thông báo').toBe('Số tiền thanh toán phải lớn hơn 0.');
    });
    await test.step('1b. Vượt công nợ → thông báo trả vượt', async () => {
      await fieldAfter(m, 'Số tiền').fill(String(payable + 1_000_000));
      const [status, text] = await Promise.all([submit(m, /^Tạo phiếu chi$/, 4_000), readToast(page.getByText(/vượt quá nợ hiện tại/).first())]);
      testInfo.annotations.push({ type: 'observed', description: `Vượt nợ: HTTP ${status ?? '(không gửi)'}; "${text}"` });
      expect(status === null || status >= 400).toBe(true);
    });
    expect((await vouchersOf(db, s.id)).length).toBe(before);
  });

  na('SYS-FIN-08', 'Báo cáo công nợ phải thu / phải trả theo tuổi nợ', 'Chưa có chức năng (Note)');
  na('SYS-FIN-09', 'Báo cáo nhập – xuất – tồn', 'Chưa có chức năng (Note)');
  na('SYS-FIN-10', 'Báo cáo doanh thu, giá vốn, lãi gộp', 'Chưa có chức năng (Note)');
  na('SYS-FIN-11', 'Báo cáo chi phí mua, chi phí nhập, chi phí NVL', 'Chưa có chức năng (Note)');
  na('SYS-FIN-12', 'Bảng điều khiển KPI và việc chờ duyệt', 'Chưa có chức năng (Note: chỉ có dashboard của Admin)');
});
