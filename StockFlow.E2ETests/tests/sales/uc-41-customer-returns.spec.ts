// Report 5.3 – sheet "UC-41 Customer Returns" (SYS-CRT-01..07). Code: phiếu trả lập trên POS (tab Trả hàng) theo hóa đơn,
// cộng tồn ngay, không có bước nhận / phân loại hàng. Người thao tác: sales01 (vai trò có chức năng Trả hàng) thay "Warehouse
// Accountant" – ghi rõ ở annotation. Ca CRT-02, 05, 06, 07 (đã xoá 27/11/2026: chức năng nhóm bỏ, Report 3 ghi ngoài phạm vi).
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { SEEDED } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct, type ProductDto } from '../../fixtures/data';
import { createCustomer, createInvoice, createSalesReturn, setCreditLimit, type CustomerDto, type OrderResult } from '../../fixtures/sales';
import { queryRows } from '../../fixtures/pg';
import { stockQty } from '../../fixtures/dbq';
import { backendError, uiBlocksAction } from '../../fixtures/ui';
import type { Client } from 'pg';
import type { Locator, Page } from '@playwright/test';

const SHEET = 'UC-41 Customer Returns';
const priceOf = (uid: string, base: number): number => base + (Number(uid.replace(/\D/g, '').slice(-3)) % 900) * 10;
const ACTOR_NOTE = 'Actor: sales01 (SalesStaff) – chức năng Trả hàng trên POS; code không có bước Thủ kho nhận hàng trả';

interface Ctx {
  p: ProductDto;
  c: CustomerDto;
  inv: OrderResult;
  price: number;
}

/** Hóa đơn hoàn thành 3 sản phẩm của khách có hạn mức; paid = 0 (ghi nợ) hoặc trả đủ */
async function arrange(env: Parameters<typeof ApiSession.login>[0], adminApi: ApiSession, uid: string, base: number, paidInFull: boolean): Promise<Ctx> {
  const price = priceOf(uid, base);
  const p = await createProduct(adminApi, { suffix: uid, price });
  await addStock(adminApi, p.productId, 'K001', 20);
  const c = await createCustomer(adminApi, { suffix: uid });
  await setCreditLimit(adminApi, c.partnerId, 10_000_000);
  const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
  const inv = await createInvoice(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 3, price }], paid: paidInFull ? 3 * price : 0, requestId: `crt-${uid}` });
  await sales.dispose();
  return { p, c, inv, price };
}

async function returnRows(db: Client, invoiceId: number): Promise<{ return_code: string; status: string; total_amount: string; refund_amount: string | null }[]> {
  return queryRows(
    db,
    'SELECT return_code, status, total_amount::text AS total_amount, refund_amount::text AS refund_amount FROM stockflow.trx_return_requests WHERE sales_order_id = $1 ORDER BY return_request_id',
    [invoiceId]
  );
}

async function debtOf(db: Client, partnerId: number): Promise<number> {
  return Number((await queryRows<{ d: string | null }>(db, 'SELECT current_debt::text AS d FROM stockflow.mst_business_partners WHERE partner_id = $1', [partnerId]))[0].d ?? 0);
}

function returnLine(page: Page, code: string): Locator {
  return page.locator('div').filter({ hasText: code }).filter({ has: page.getByTitle('Bỏ hàng khỏi phiếu trả') }).last();
}

/** Màn Trả hàng → "Trả hàng" → chọn hóa đơn → POS mở ở tab mới, tab TRẢ HÀNG */
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

/** Ô "Tiền trả khách": khối nhỏ nhất chứa nhãn này */
function refundInput(pos: Page): Locator {
  return pos.locator('div').filter({ has: pos.getByText('Tiền trả khách', { exact: true }) }).last().getByRole('textbox');
}

async function submitReturn(pos: Page): Promise<string> {
  const [res] = await Promise.all([
    pos.waitForResponse((r) => new URL(r.url()).pathname === '/api/sales-returns' && r.request().method() === 'POST'),
    pos.getByRole('button', { name: /^TRẢ HÀNG/ }).click(),
  ]);
  expect(res.status(), await res.text()).toBeLessThan(300);
  const msg = pos.getByText(/^Đã tạo phiếu trả hàng /);
  await expect(msg).toBeVisible();
  return (await msg.innerText()).trim();
}

test.describe(SHEET, () => {
  test('SYS-CRT-01 – Trả hàng từ hóa đơn ghi nợ: cộng tồn, giảm nợ theo giá bán, phiếu hoàn thành @p1', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-CRT-01', SHEET, { mismatch: 'Code: cộng tồn ngay, không có bước kiểm tra hàng trả.' });
    testInfo.annotations.push({ type: 'note', description: ACTOR_NOTE });
    const { p, c, inv, price } = await arrange(env, adminApi, uid, 81_000, false);
    const stock0 = await stockQty(db, p.productId, 'K001');
    const debt0 = await debtOf(db, c.partnerId);
    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    const pos = await openReturnFor(page, inv.orderCode);
    dialogs.attach(pos);
    await setReturnQty(pos, p.code, 2);
    await refundInput(pos).fill('0');
    await refundInput(pos).press('Tab');
    await expect(pos.getByText('Trừ vào công nợ khách', { exact: true })).toBeVisible();
    const msg = await submitReturn(pos);
    testInfo.annotations.push({ type: 'observed', description: msg });
    expect((await returnRows(db, inv.orderId)).map((r) => [r.status, Number(r.total_amount), Number(r.refund_amount ?? 0)])).toEqual([['COMPLETED', 2 * price, 0]]);
    expect(await stockQty(db, p.productId, 'K001')).toBe(stock0 + 2);
    expect(await debtOf(db, c.partnerId)).toBe(debt0 - 2 * price);
  });

  test('SYS-CRT-03 – Khách không có nợ: ghi nhận trả tiền cho khách', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-CRT-03', SHEET, { mismatch: 'Code: số tiền trả khách nhập trên phiếu trả; không có trạng thái "Refund Due".' });
    testInfo.annotations.push({ type: 'note', description: ACTOR_NOTE });
    const { p, c, inv, price } = await arrange(env, adminApi, uid, 82_000, true);
    const debt0 = await debtOf(db, c.partnerId);
    expect(debt0, 'tiền đề: khách không có nợ').toBe(0);
    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    const pos = await openReturnFor(page, inv.orderCode);
    dialogs.attach(pos);
    await setReturnQty(pos, p.code, 1);
    await expect(refundInput(pos)).toHaveValue(price.toLocaleString('vi-VN'));
    const msg = await submitReturn(pos);
    testInfo.annotations.push({ type: 'observed', description: msg });
    expect(msg).toContain(`Trả khách ${price.toLocaleString('vi-VN')}`);
    expect((await returnRows(db, inv.orderId)).map((r) => [r.status, Number(r.refund_amount ?? 0)])).toEqual([['COMPLETED', price]]);
    expect(await debtOf(db, c.partnerId)).toBe(debt0);
  });

  test('SYS-CRT-04 – SL trả vượt số được trả bị từ chối (BR-19)', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-CRT-04', SHEET);
    testInfo.annotations.push({ type: 'note', description: ACTOR_NOTE });
    const { p, c, inv, price } = await arrange(env, adminApi, uid, 83_000, false);
    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    const pos = await openReturnFor(page, inv.orderCode);
    dialogs.attach(pos);
    await setReturnQty(pos, p.code, 5);
    const value = await returnLine(pos, p.code).getByRole('textbox').first().inputValue();
    testInfo.annotations.push({ type: 'observed', description: `Nhập SL trả 5 (đã mua 3) → ô hiện "${value}"` });
    if (Number(value) <= 3) {
      const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
      const be = await backendError(() => createSalesReturn(sales, { invoiceId: inv.orderId, partnerId: c.partnerId, productId: p.productId, qty: 5, price }));
      await sales.dispose();
      uiBlocksAction(testInfo, `ô số lượng tự giới hạn ở số còn được trả (nhập 5 → "${value}")`, 'thông báo BR-19 (vượt số lượng được trả)', be);
    } else {
      await pos.getByRole('button', { name: /^TRẢ HÀNG/ }).click();
      await expect(pos.locator('.ant-message')).toContainText(/trả|vượt/i);
    }
    expect(await returnRows(db, inv.orderId)).toEqual([]);
  });

});
