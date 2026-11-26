// Report 5.3 (bản nháp NEW) – sheet "NEW Purchasing": SYS-PUR-N01 .. N04.
// Nhập hàng trực tiếp (lưu tạm → mở lại → hoàn thành), hủy phiếu nhập, trả hàng nhập, NCC trả tiền.
// N01 theo Pre: Kế toán kho (e2e.wh.k001, chỉ K001). N02–N04 Pre không nêu vai trò → Quản lý manager01 (có K001);
// việc Kế toán kho thiếu PURCHASE_UPDATE đã ghi ở DEF-E2E-08.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { PoFormPage, PurchaseReturnFormPage, ReceiptFormPage, ReceiptListPage } from '../../pages/PurchasingPages';
import { E2E_ACCOUNTS, SEEDED } from '../../fixtures/accounts';
import { addStock, createProduct } from '../../fixtures/data';
import { productMac, receiptByCode, stockQty, supplierPayable, warehouseUnitCost } from '../../fixtures/dbq';
import { purchaseReturnByCode } from '../../fixtures/dbq4';
import { vouchersOf } from '../../fixtures/dbq3';
import { directReceiptViaApi, purchaseReturnViaApi, suppliers, type SupplierRef } from '../../fixtures/purchasing';
import { backendError, uiBlocksAction } from '../../fixtures/ui';
import type { ApiSession } from '../../fixtures/api';
import type { Locator, Page, Response } from '@playwright/test';

const SHEET = 'NEW Purchasing';
const vnd = (n: number): string => n.toLocaleString('vi-VN');
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const isApi = (r: Response, method: string, path: string): boolean => r.request().method() === method && new URL(r.url()).pathname.toLowerCase() === path.toLowerCase();

async function supplier(admin: ApiSession): Promise<SupplierRef> {
  const list = await suppliers(admin);
  expect(list.length, 'có nhà cung cấp seed').toBeGreaterThan(0);
  return list[0];
}

/** Mở dòng phiếu nhập trên /purchases (dòng mở rộng có nút "In phiếu") */
async function openReceipt(page: Page, code: string): Promise<void> {
  await page.getByPlaceholder('Theo mã phiếu, số PO, mã hoặc tên NCC...').fill(code);
  await page.getByRole('cell', { name: code, exact: true }).click();
  await expect(page.getByRole('button', { name: 'In phiếu' })).toBeVisible();
}

/** Hủy phiếu nhập đang mở: nút "Hủy" → hộp "Xác nhận hủy phiếu nhập hàng" → "Hủy phiếu này" */
async function cancelReceipt(page: Page, grId: number): Promise<Response> {
  await page.getByRole('button', { name: 'Hủy', exact: true }).first().click();
  await expect(page.getByText('Xác nhận hủy phiếu nhập hàng', { exact: true })).toBeVisible();
  const [res] = await Promise.all([
    page.waitForResponse((r) => isApi(r, 'PATCH', `/api/purchases/${grId}/cancel`)),
    page.getByRole('button', { name: 'Hủy phiếu này' }).click(),
  ]);
  return res;
}

/** Màn Trả hàng nhập (/purchase-returns): tìm, mở dòng phiếu */
async function openPurchaseReturn(page: Page, code: string): Promise<Locator> {
  await page.goto('/purchase-returns');
  await expect(page.getByRole('heading', { name: 'Trả hàng nhập', level: 1 })).toBeVisible();
  await page.getByPlaceholder('Theo mã phiếu trả, mã phiếu nhập, NCC...').fill(code);
  const cell = page.getByRole('cell', { name: code, exact: true });
  await expect(cell).toHaveCount(1);
  await cell.click();
  const panel = page.getByRole('row').filter({ has: page.getByRole('button', { name: 'Xuất file' }) }).last();
  await expect(panel).toBeVisible();
  return panel;
}

test.describe(SHEET, () => {
  test('SYS-PUR-N01 – Nhập hàng trực tiếp: lưu tạm không đổi tồn; hoàn thành cộng tồn, MAC, công nợ NCC', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PUR-N01', SHEET, { knownDefect: 'DEF-E2E-08: vai trò Kế toán kho (WarehouseStaff) thiếu PURCHASE_UPDATE' });
    const s = await supplier(adminApi);
    const p1 = await createProduct(adminApi, { suffix: `${uid}a`, price: 80_000 });
    const p2 = await createProduct(adminApi, { suffix: `${uid}b`, price: 50_000 });
    await addStock(adminApi, p1.productId, 'K001', 4);
    const lines = [
      { p: p1, qty: 5, price: 50_000 },
      { p: p2, qty: 3, price: 30_000 },
    ];
    const total = lines.reduce((a, l) => a + l.qty * l.price, 0);
    const stock0 = [await stockQty(db, p1.productId, 'K001'), await stockQty(db, p2.productId, 'K001')];
    const cost0 = [await warehouseUnitCost(db, p1.productId, 'K001'), await warehouseUnitCost(db, p2.productId, 'K001')];
    const mac0 = [await productMac(db, p1.productId), await productMac(db, p2.productId)];
    const payable0 = await supplierPayable(db, s.id);
    let gr = { id: 0, code: '' };

    await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK001.username, env.defaultPassword);
    await test.step('1. Mở Nhập hàng (/purchases/create) không theo phiếu đặt', async () => {
      await page.goto('/purchases/create');
      await expect(page.getByPlaceholder(/^Tìm hàng hóa theo mã hoặc tên/)).toBeVisible();
      await expect(page.getByRole('button', { name: /KHO LÀM VIỆC/ })).toContainText('Gia Lâm');
    });
    await test.step('2. Chọn NCC S, kho K001, thêm dòng hàng; Lưu tạm', async () => {
      const po = new PoFormPage(page);
      const form = new ReceiptFormPage(page);
      await po.pickSupplier(s.code, s.name);
      for (const l of lines) {
        await po.addProduct(l.p.code);
        await form.setReceived(l.p.code, l.qty);
        await form.setPrice(l.p.code, l.price);
      }
      await expect(page.getByText(vnd(total)).first(), 'tổng tiền hàng').toBeVisible();
      const [res] = await Promise.all([
        page.waitForResponse((r) => isApi(r, 'POST', '/api/purchases')),
        page.getByRole('button', { name: 'Lưu tạm', exact: true }).click(),
      ]);
      expect(res.status(), await res.text()).toBeLessThan(300);
      const body = (await res.json()) as { grId: number; grCode: string };
      gr = { id: body.grId, code: body.grCode };
      expect((await receiptByCode(db, gr.code))?.status).toBe('DRAFT');
    });
    await test.step('KQ1. Sau lưu tạm: tồn và công nợ không đổi', async () => {
      expect([await stockQty(db, p1.productId, 'K001'), await stockQty(db, p2.productId, 'K001')]).toEqual(stock0);
      expect(await supplierPayable(db, s.id)).toBe(payable0);
      expect([await productMac(db, p1.productId), await productMac(db, p2.productId)]).toEqual(mac0);
    });
    await test.step('3. Mở lại phiếu tạm ("Mở phiếu") và hoàn thành', async () => {
      await expect(page).toHaveURL(/\/purchases(\?.*)?$/);
      const list = new ReceiptListPage(page);
      await list.goto();
      await openReceipt(page, gr.code);
      await page.getByRole('button', { name: 'Mở phiếu' }).click();
      await expect(page).toHaveURL(new RegExp(`/purchases/create\\?edit=${gr.id}$`));
      const form = new ReceiptFormPage(page);
      for (const l of lines) await expect(form.line(l.p.code)).toBeVisible();
      await page.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
      await expect(page.getByText(/^(Xác nhận hoàn thành nhập kho|Cập nhật phiếu nhập hàng)$/)).toBeVisible();
      const put = page.waitForResponse((r) => isApi(r, 'PUT', `/api/purchases/${gr.id}`));
      const patch = page.waitForResponse((r) => isApi(r, 'PATCH', `/api/purchases/${gr.id}/complete`), { timeout: 10_000 }).catch(() => null);
      await page.getByRole('button', { name: /^(Đồng ý hoàn thành|Đồng ý)$/ }).click();
      const putRes = await put;
      const putBody = await putRes.text();
      testInfo.annotations.push({ type: 'observed', description: `PUT /api/purchases/${gr.id} → ${putRes.status()} ${putBody.slice(0, 200)}` });
      expect(putRes.status(), `cập nhật phiếu tạm trước khi hoàn thành: ${putBody}`).toBeLessThan(300);
      const patchRes = await patch;
      expect(patchRes, 'request hoàn thành phiếu').not.toBeNull();
      expect(patchRes?.status(), await patchRes?.text()).toBeLessThan(300);
    });
    await test.step('KQ2. Phiếu Hoàn thành; tồn tăng; MAC tính lại; công nợ NCC tăng bằng tổng tiền', async () => {
      expect((await receiptByCode(db, gr.code))?.status).toBe('COMPLETED');
      expect([await stockQty(db, p1.productId, 'K001'), await stockQty(db, p2.productId, 'K001')]).toEqual([stock0[0] + 5, stock0[1] + 3]);
      const expectedCost = lines.map((l, i) => round3((stock0[i] * cost0[i] + l.qty * l.price) / (stock0[i] + l.qty)));
      expect([await warehouseUnitCost(db, p1.productId, 'K001'), await warehouseUnitCost(db, p2.productId, 'K001')]).toEqual(expectedCost);
      expect(await supplierPayable(db, s.id)).toBe(payable0 + total);
    });
  });

  test('SYS-PUR-N02 – Hủy phiếu nhập đã hoàn thành: đảo tồn và công nợ; phiếu có trả hàng nhập không hủy được', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PUR-N02', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Pre không nêu vai trò; dùng Quản lý manager01 (K001)' });
    const s = await supplier(adminApi);
    const p1 = await createProduct(adminApi, { suffix: `${uid}a`, price: 70_000 });
    const p2 = await createProduct(adminApi, { suffix: `${uid}b`, price: 60_000 });
    const gr1 = await directReceiptViaApi(adminApi, { wh: 'K001', partnerId: s.id, lines: [{ productId: p1.productId, qty: 6, price: 40_000 }] });
    const gr2 = await directReceiptViaApi(adminApi, { wh: 'K001', partnerId: s.id, lines: [{ productId: p2.productId, qty: 5, price: 30_000 }] });
    const ret = await purchaseReturnViaApi(adminApi, { grId: gr2.id, productId: p2.productId, qty: 2, status: 'COMPLETED' });
    const stock0 = await stockQty(db, p1.productId, 'K001');
    const payable0 = await supplierPayable(db, s.id);
    await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
    const list = new ReceiptListPage(page);
    await list.goto();
    await test.step('1. Hủy phiếu nhập đã hoàn thành chưa có trả hàng và xác nhận', async () => {
      await openReceipt(page, gr1.code);
      const res = await cancelReceipt(page, gr1.id);
      expect(res.status(), await res.text()).toBeLessThan(300);
      await expect(page.getByText(`Đã hủy phiếu nhập ${gr1.code}`, { exact: true })).toBeVisible();
    });
    await test.step('KQ1. Phiếu Đã hủy; tồn và công nợ đảo lại', async () => {
      expect((await receiptByCode(db, gr1.code))?.status).toBe('CANCELLED');
      expect(await stockQty(db, p1.productId, 'K001')).toBe(stock0 - 6);
      expect(await supplierPayable(db, s.id)).toBe(payable0 - 6 * 40_000);
    });
    await test.step('2. Thử hủy phiếu nhập đã có phiếu trả hàng nhập → KQ2. thông báo', async () => {
      await openReceipt(page, gr2.code);
      const res = await cancelReceipt(page, gr2.id);
      expect(res.status()).toBe(400);
      await expect(page.getByText(`Phiếu nhập đã có phiếu trả hàng nhập ${ret.code}. Vui lòng hủy phiếu trả hàng trước.`, { exact: true })).toBeVisible();
      expect((await receiptByCode(db, gr2.code))?.status).toBe('COMPLETED');
    });
  });

  test('SYS-PUR-N03 – Trả hàng nhập: giảm tồn và công nợ; không trả vượt số còn được trả', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PUR-N03', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Pre không nêu vai trò; dùng Quản lý manager01 (K001)' });
    const price = 45_000;
    const s = await supplier(adminApi);
    const p = await createProduct(adminApi, { suffix: uid, price: 75_000 });
    const gr = await directReceiptViaApi(adminApi, { wh: 'K001', partnerId: s.id, lines: [{ productId: p.productId, qty: 10, price }] });
    const stock0 = await stockQty(db, p.productId, 'K001');
    const payable0 = await supplierPayable(db, s.id);
    await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
    const ret = new PurchaseReturnFormPage(page);
    await test.step('1. Mở Trả hàng nhập từ phiếu nhập đã hoàn thành', async () => {
      await new ReceiptListPage(page).goto();
      await openReceipt(page, gr.code);
      await page.getByRole('button', { name: 'Trả hàng nhập', exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/purchase-returns/create\\?grId=${gr.id}$`));
      await expect(ret.line(p.code)).toBeVisible();
    });
    let code = '';
    await test.step('2. Trả 2 của P và hoàn thành', async () => {
      await ret.setQty(p.code, 2);
      const res = await ret.complete();
      expect(res.status(), await res.text()).toBeLessThan(300);
      code = ((await res.json()) as { returnCode: string }).returnCode;
    });
    await test.step('KQ1. Phiếu trả hoàn thành; tồn và công nợ giảm theo giá trị trả', async () => {
      expect((await purchaseReturnByCode(db, code))?.status).toBe('COMPLETED');
      expect(await stockQty(db, p.productId, 'K001')).toBe(stock0 - 2);
      expect(await supplierPayable(db, s.id)).toBe(payable0 - 2 * price);
    });
    await test.step('3. Lập phiếu trả khác vượt số còn được trả → KQ2. thông báo', async () => {
      const expected = `Mặt hàng ${p.code} chỉ còn được trả tối đa 8 (đã nhập 10).`;
      await page.goto(`/purchase-returns/create?grId=${gr.id}`);
      await expect(ret.line(p.code)).toBeVisible();
      await ret.setQty(p.code, 9);
      const capped = page.getByText(new RegExp(`^Chỉ được trả tối đa 8 .* cho ${p.code}$`)).first();
      if (await capped.isVisible().catch(() => false)) {
        const shown = (await capped.innerText()).trim();
        const be = await backendError(() => purchaseReturnViaApi(adminApi, { grId: gr.id, productId: p.productId, qty: 9, status: 'COMPLETED' }));
        expect(be, 'thông báo backend khi trả vượt').toBe(expected);
        uiBlocksAction(testInfo, `ô SL trả tự giảm về 8 và hiện "${shown}"`, expected, `${be} (gọi bằng Admin)`);
      } else {
        const res = await ret.complete();
        expect(res.status()).toBe(400);
        await expect(page.getByText(expected, { exact: true })).toBeVisible();
      }
      expect(await stockQty(db, p.productId, 'K001')).toBe(stock0 - 2);
    });
  });

  test('SYS-PUR-N04 – NCC trả tiền: chỉ ghi nhận cho phiếu trả hàng nhập đã hoàn thành', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PUR-N04', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Pre không nêu vai trò; dùng Quản lý manager01 (K001)' });
    const price = 40_000;
    const s = await supplier(adminApi);
    const p = await createProduct(adminApi, { suffix: uid, price: 65_000 });
    // Phiếu nhập đã trả đủ NCC: nếu phiếu nhập còn nợ, giá trị trả hàng tự trừ vào công nợ phiếu nhập (NCC cần trả 0, không có nút Thanh toán)
    testInfo.annotations.push({ type: 'note', description: 'Tiền đề: phiếu nhập gốc đã trả đủ NCC (nếu còn nợ, tiền trả hàng tự trừ vào công nợ phiếu nhập, không còn khoản NCC phải trả lại)' });
    const gr = await directReceiptViaApi(adminApi, { wh: 'K001', partnerId: s.id, lines: [{ productId: p.productId, qty: 10, price }], paid: 10 * price });
    const done = await purchaseReturnViaApi(adminApi, { grId: gr.id, productId: p.productId, qty: 2, status: 'COMPLETED' });
    const draft = await purchaseReturnViaApi(adminApi, { grId: gr.id, productId: p.productId, qty: 1, status: 'DRAFT' });
    expect([(await purchaseReturnByCode(db, done.code))?.status, (await purchaseReturnByCode(db, draft.code))?.status]).toEqual(['COMPLETED', 'DRAFT']);
    const payable0 = await supplierPayable(db, s.id);
    const vouchers0 = (await vouchersOf(db, s.id)).length;
    await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
    await test.step('1. Trên phiếu trả đã hoàn thành ghi nhận tiền NCC trả', async () => {
      const panel = await openPurchaseReturn(page, done.code);
      await panel.getByRole('button', { name: 'Thanh toán', exact: true }).click();
      await expect(page.getByText('Tiền nhà cung cấp trả')).toBeVisible();
      const [res] = await Promise.all([
        page.waitForResponse((r) => isApi(r, 'POST', `/api/PurchaseReturns/${done.id}/refunds`)),
        page.getByRole('button', { name: 'Tạo phiếu thu' }).click(),
      ]);
      expect(res.status(), await res.text()).toBeLessThan(300);
      await expect(page.getByText(`Đã ghi nhận nhà cung cấp trả ${vnd(2 * price)} cho phiếu ${done.code}`, { exact: true })).toBeVisible();
    });
    await test.step('KQ1. Phiếu thu đã lưu; công nợ NCC cập nhật', async () => {
      expect(Number((await purchaseReturnByCode(db, done.code))?.refund_amount)).toBe(2 * price);
      const v = await vouchersOf(db, s.id);
      expect(v.length, 'thêm một phiếu thu').toBe(vouchers0 + 1);
      expect(Number(v[v.length - 1].amount)).toBe(2 * price);
      testInfo.annotations.push({ type: 'observed', description: `Phiếu thu: ${JSON.stringify(v[v.length - 1])}` });
      expect(await supplierPayable(db, s.id)).toBe(payable0 + 2 * price);
    });
    await test.step('2. Thử ghi nhận tiền trên phiếu trả tạm → KQ2. thông báo', async () => {
      const expected = 'Chỉ thu tiền được cho phiếu trả hàng nhập đã hoàn thành.';
      const panel = await openPurchaseReturn(page, draft.code);
      const pay = panel.getByRole('button', { name: 'Thanh toán', exact: true });
      if ((await pay.count()) === 0) {
        const be = await backendError(() => adminApi.post(`/api/PurchaseReturns/${draft.id}/refunds`, { amount: price, paymentMethod: 'CASH' }));
        expect(be).toBe(expected);
        uiBlocksAction(testInfo, 'phiếu trả tạm không có nút "Thanh toán"', expected, `${be} (gọi bằng Admin)`);
      } else {
        await pay.click();
        await page.getByRole('button', { name: 'Tạo phiếu thu' }).click();
        await expect(page.getByText(expected, { exact: true })).toBeVisible();
      }
      expect(Number((await purchaseReturnByCode(db, draft.code))?.refund_amount ?? 0)).toBe(0);
    });
  });
});
