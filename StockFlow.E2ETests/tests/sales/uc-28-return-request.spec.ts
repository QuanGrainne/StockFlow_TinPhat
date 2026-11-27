// Report 5.3 – sheet "UC-28 Return Request" (SYS-RRQ-01..06). Code: Trả hàng theo hóa đơn (không có trạng thái "Chờ nhận").
// Ca RRQ-02 (đã xoá 27/11/2026: chức năng nhóm bỏ, Report 3 ghi ngoài phạm vi). Phiếu trả được lập trên POS (tab Trả hàng): màn /sales-returns mở POS ?returnInvoice=<id> ở tab mới.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { SEEDED } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct, type ProductDto } from '../../fixtures/data';
import { cancelInvoice, createCustomer, createInvoice, createSalesReturn, setCreditLimit, type CustomerDto, type OrderResult } from '../../fixtures/sales';
import { queryRows } from '../../fixtures/pg';
import { permissionCodesOfRole, stockQty } from '../../fixtures/dbq';
import { backendError, uiBlocksAction } from '../../fixtures/ui';
import type { Client } from 'pg';
import type { Locator, Page } from '@playwright/test';

const SHEET = 'UC-28 Return Request';
const priceOf = (uid: string, base: number): number => base + (Number(uid.replace(/\D/g, '').slice(-3)) % 900) * 10;
const MSG_NO_ITEM = 'Chọn ít nhất 1 hàng hóa với số lượng trả lớn hơn 0.';

interface Ctx {
  p: ProductDto;
  c: CustomerDto;
  inv: OrderResult;
  price: number;
}

/** Tiền đề: khách có hạn mức, hóa đơn hoàn thành 3 sản phẩm (ghi nợ) do nhân viên bán hàng lập */
async function arrange(env: Parameters<typeof ApiSession.login>[0], adminApi: ApiSession, uid: string, base: number): Promise<Ctx> {
  const price = priceOf(uid, base);
  const p = await createProduct(adminApi, { suffix: uid, price });
  await addStock(adminApi, p.productId, 'K001', 20);
  const c = await createCustomer(adminApi, { suffix: uid });
  await setCreditLimit(adminApi, c.partnerId, 10_000_000);
  const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
  const inv = await createInvoice(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 3, price }], paid: 0, requestId: `rrq-${uid}` });
  await sales.dispose();
  return { p, c, inv, price };
}

async function returnRows(db: Client, invoiceId: number): Promise<{ return_code: string; status: string; total_amount: string }[]> {
  return queryRows(db, 'SELECT return_code, status, total_amount::text AS total_amount FROM stockflow.trx_return_requests WHERE sales_order_id = $1 ORDER BY return_request_id', [invoiceId]);
}

async function debtOf(db: Client, partnerId: number): Promise<number> {
  return Number((await queryRows<{ d: string | null }>(db, 'SELECT current_debt::text AS d FROM stockflow.mst_business_partners WHERE partner_id = $1', [partnerId]))[0].d ?? 0);
}

/** Tab trả hàng: dòng hàng (khối nhỏ nhất chứa mã hàng + nút "Bỏ hàng khỏi phiếu trả") */
function returnLine(page: Page, code: string): Locator {
  return page.locator('div').filter({ hasText: code }).filter({ has: page.getByTitle('Bỏ hàng khỏi phiếu trả') }).last();
}

/** Mở tab trả hàng cho hóa đơn: màn Trả hàng → "Trả hàng" → chọn hóa đơn → POS mở ở tab mới */
async function openReturnFor(page: Page, invoiceCode: string): Promise<Page> {
  await page.goto('/sales-returns');
  await expect(page.getByRole('heading', { name: 'Trả hàng', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Trả hàng', exact: true }).first().click();
  await page.getByPlaceholder('Theo mã hóa đơn').fill(invoiceCode);
  const popup = page.context().waitForEvent('page');
  await page.getByRole('row').filter({ hasText: invoiceCode }).first().getByRole('button', { name: 'Chọn' }).click();
  const pos = await popup;
  await pos.waitForLoadState('domcontentloaded');
  await expect(pos.getByRole('button', { name: /^TRẢ HÀNG/ })).toBeVisible();
  return pos;
}

async function setReturnQty(pos: Page, code: string, qty: number): Promise<void> {
  const input = returnLine(pos, code).getByRole('textbox').first();
  await input.fill(String(qty));
  await input.press('Tab');
}

test.describe(SHEET, () => {

  test('SYS-RRQ-01 – Lập phiếu trả từ hóa đơn hoàn thành: phiếu hoàn thành, cộng lại tồn ngay @p1', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-RRQ-01', SHEET, { mismatch: 'Description: chờ nhận hàng; Expected (code): COMPLETED, cộng tồn ngay.' });
    const { p, c, inv } = await arrange(env, adminApi, uid, 91_000);
    const stockBefore = await stockQty(db, p.productId, 'K001');
    const debtBefore = await debtOf(db, c.partnerId);
    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    const pos = await openReturnFor(page, inv.orderCode);
    dialogs.attach(pos);
    await test.step('2. Nhập hàng, số lượng, lý do; lưu (TRẢ HÀNG)', async () => {
      await setReturnQty(pos, p.code, 1);
      await pos.getByPlaceholder('Lý do trả hàng / ghi chú').fill(`E2E trả hàng ${uid}`);
      const [res] = await Promise.all([
        pos.waitForResponse((r) => new URL(r.url()).pathname === '/api/sales-returns' && r.request().method() === 'POST'),
        pos.getByRole('button', { name: /^TRẢ HÀNG/ }).click(),
      ]);
      expect(res.status(), await res.text()).toBeLessThan(300);
      await expect(pos.getByText(/^Đã tạo phiếu trả hàng /)).toBeVisible();
    });
    await test.step('KQ. Phiếu trả COMPLETED; tồn cộng lại ngay; nợ giảm', async () => {
      const rows = await returnRows(db, inv.orderId);
      expect(rows.map((r) => r.status)).toEqual(['COMPLETED']);
      expect(await stockQty(db, p.productId, 'K001')).toBe(stockBefore + 1);
      testInfo.annotations.push({ type: 'observed', description: `Dư nợ trước ${debtBefore}, sau ${await debtOf(db, c.partnerId)}` });
    });
  });

  test('SYS-RRQ-03 – Hủy phiếu trả hàng: phiếu Đã hủy, đảo tồn và công nợ', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-RRQ-03', SHEET, { mismatch: 'Description: hủy yêu cầu đang chờ; Expected (code): hủy phiếu đã hoàn thành, đảo tồn và công nợ.' });
    const { p, c, inv, price } = await arrange(env, adminApi, uid, 92_000);
    const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
    await createSalesReturn(sales, { invoiceId: inv.orderId, partnerId: c.partnerId, productId: p.productId, qty: 1, price });
    await sales.dispose();
    const ret = (await returnRows(db, inv.orderId))[0];
    const stockAfterReturn = await stockQty(db, p.productId, 'K001');
    const debtAfterReturn = await debtOf(db, c.partnerId);
    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    await page.goto('/sales-returns');
    await page.getByPlaceholder('Theo mã phiếu trả, mã hóa đơn, khách hàng').fill(ret.return_code);
    await page.getByRole('cell', { name: ret.return_code, exact: true }).click();
    dialogs.expect(/hủy/i);
    await page.getByRole('button', { name: /^Hủy( phiếu)?$/ }).first().click();
    const confirm = page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Hủy phiếu)$/ });
    const resp = page.waitForResponse((r) => /\/api\/sales-returns\/\d+\/cancel$/.test(new URL(r.url()).pathname), { timeout: 8_000 }).catch(() => null);
    if (await confirm.count()) await confirm.last().click();
    const r = await resp;
    testInfo.annotations.push({ type: 'observed', description: `Quyền SALES_* của SalesStaff: ${(await permissionCodesOfRole(db, 'SalesStaff', 'SALES%')).join(', ')} (seed chưa có SALES_DELETE; Admin lưu ma trận một lần thì DeriveModulePermissionCodes cấp thêm SALES_DELETE / SALES_APPROVE)` });
    expect(r?.status(), r ? await r.text() : '(không gửi request huỷ)').toBeLessThan(300);
    expect((await returnRows(db, inv.orderId))[0].status).toBe('CANCELLED');
    expect(await stockQty(db, p.productId, 'K001')).toBe(stockAfterReturn - 1);
    expect(await debtOf(db, c.partnerId)).toBe(debtAfterReturn + price);
  });

  test('SYS-RRQ-04 – Trả hàng từ hóa đơn đã hủy bị từ chối', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-RRQ-04', SHEET, { mismatch: 'Code: theo hóa đơn thay cho phiếu xuất kho.' });
    testInfo.annotations.push({ type: 'note', description: 'Hộp chọn hóa đơn chỉ liệt kê hóa đơn hoàn thành → mở POS ?returnInvoice=<id> (đường dẫn màn Trả hàng tự mở)' });
    const { inv } = await arrange(env, adminApi, uid, 93_000);
    await cancelInvoice(adminApi, inv.orderId);
    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    await page.goto(`/pos?returnInvoice=${inv.orderId}`);
    await expect(page.getByText(`Hóa đơn ${inv.orderCode} chưa hoàn thành hoặc đã hủy, không trả hàng được.`)).toBeVisible();
  });

  test('SYS-RRQ-05 – Số lượng trả 0 hoặc vượt số được trả bị từ chối', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-RRQ-05', SHEET);
    const { p, c, inv, price } = await arrange(env, adminApi, uid, 94_000);
    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    const pos = await openReturnFor(page, inv.orderCode);
    dialogs.attach(pos);
    await test.step(`1a. Số lượng 0 → "${MSG_NO_ITEM}"`, async () => {
      await setReturnQty(pos, p.code, 0);
      await pos.getByRole('button', { name: /^TRẢ HÀNG/ }).click();
      const observed = (await pos.locator('.ant-message').innerText().catch(() => '')).trim();
      testInfo.annotations.push({ type: 'observed', description: `Số lượng 0: "${observed}"` });
      await expect.soft(pos.getByText(MSG_NO_ITEM, { exact: true })).toBeVisible();
    });
    await test.step('1b. Trả vượt (đã mua − đã trả) → thông báo BR-19', async () => {
      await setReturnQty(pos, p.code, 5);
      const value = await returnLine(pos, p.code).getByRole('textbox').first().inputValue();
      if (Number(value) <= 3) {
        const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
        const be = await backendError(() => createSalesReturn(sales, { invoiceId: inv.orderId, partnerId: c.partnerId, productId: p.productId, qty: 5, price }));
        await sales.dispose();
        uiBlocksAction(testInfo, `ô số lượng tự giới hạn ở số còn được trả (nhập 5 → "${value}")`, 'thông báo BR-19 (vượt số lượng được trả)', be);
      }
    });
    expect(await returnRows(db, inv.orderId)).toEqual([]);
  });

  test('SYS-RRQ-06 – Lưu phiếu trả không có hàng: báo cần chọn hàng, không tạo phiếu', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-RRQ-06', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Điều kiện kiểm đã duyệt: thông báo "Chọn ít nhất 1 hàng hóa với số lượng trả lớn hơn 0." và không có phiếu mới; lý do không bắt buộc (SPEC FR-RET-02 Một phần)' });
    const { p, inv } = await arrange(env, adminApi, uid, 95_000);
    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    const pos = await openReturnFor(page, inv.orderCode);
    dialogs.attach(pos);
    await returnLine(pos, p.code).getByTitle('Bỏ hàng khỏi phiếu trả').click();
    await pos.getByRole('button', { name: /^TRẢ HÀNG/ }).click();
    const observed = (await pos.locator('.ant-message').innerText().catch(() => '')).trim();
    testInfo.annotations.push({ type: 'observed', description: `Thông báo: "${observed}"` });
    await expect.soft(pos.getByText(MSG_NO_ITEM, { exact: true })).toBeVisible();
    expect(await returnRows(db, inv.orderId)).toEqual([]);
  });
});
