// Report 5.3 – sheet "UC-15 Warehouse Access" (SYS-WHA-01..05). Admin phân quyền kho ở /roles/warehouses.
import { test, expect, traceTc, newUserContext } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { AppShell } from '../../pages/AppShell';
import { WarehouseAccessPage } from '../../pages/RolesPages';
import { SEEDED, WAREHOUSES, type WarehouseCode } from '../../fixtures/accounts';
import { addStock, createProduct } from '../../fixtures/data';
import { createCustomer, createInvoice } from '../../fixtures/sales';
import { cancelStocktake, draftDisposal, draftPurchase, draftStocktake, draftTransfer, type DocRef } from '../../fixtures/inventory';
import { warehouseCodesOfUser } from '../../fixtures/dbq';
import { makeAccount, seeMessage } from '../../fixtures/ui';
import type { Page } from '@playwright/test';

const SHEET = 'UC-15 Warehouse Access';

async function asAdmin(page: Page, env: { defaultPassword: string }): Promise<WarehouseAccessPage> {
  await new LoginPage(page).loginOk(SEEDED.admin.username, env.defaultPassword);
  const w = new WarehouseAccessPage(page);
  await w.goto();
  return w;
}

async function saveAccess(page: Page): Promise<number> {
  const [res] = await Promise.all([
    page.waitForResponse((r) => /\/api\/warehouse-?permissions\/\d+$/i.test(new URL(r.url()).pathname) && r.request().method() === 'PUT'),
    page.getByRole('button', { name: 'Lưu phân quyền' }).click(),
  ]);
  return res.status();
}

test.describe(SHEET, () => {
  test('SYS-WHA-01 – Ma trận nhân sự × kho; lưu phân quyền báo thành công', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-WHA-01', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Audit log chưa có → không kiểm (Note của TC)' });
    const acc = await makeAccount(adminApi, uid, { prefix: 'wha01', warehouses: ['K001'] });
    const w = await asAdmin(page, env);
    await test.step('KQ1. Hiện ma trận nhân sự × kho được phân quyền', async () => {
      await expect(w.staffRows().first()).toBeVisible();
      await expect(w.row('Trần Thị Bán Hàng')).toContainText(WAREHOUSES.K001.name);
    });
    await test.step('2. Tick kho K003 cho tài khoản, lưu → KQ2. thông báo thành công', async () => {
      const modal = await w.open(acc.name);
      await w.checkbox(modal, 'K003').check();
      expect(await saveAccess(page)).toBe(200);
      await expect(page.getByText(`Đã cập nhật phân quyền kho cho nhân sự ${acc.name}`)).toBeVisible();
      expect(await warehouseCodesOfUser(db, acc.username)).toEqual(['K001', 'K003']);
    });
  });

  test('SYS-WHA-02 – Người dùng chỉ có K001 chỉ thấy và xử lý chứng từ của K001 @p1', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-WHA-02', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Người dùng vai trò Quản lý (có đủ 5 màn) chỉ được gán K001; chứng từ Phiếu tạm dựng qua API ở K001 và K002' });
    const user = await makeAccount(adminApi, uid, { prefix: 'wha02', role: 'Manager', warehouses: ['K001'] });
    const digits = Number(uid.replace(/\D/g, '').slice(-3));
    const p = await createProduct(adminApi, { suffix: uid, price: 61_000 + digits });
    for (const wh of ['K001', 'K002'] as WarehouseCode[]) await addStock(adminApi, p.productId, wh, 20);
    const cust = await createCustomer(adminApi, { suffix: uid });
    const docs: Record<string, Record<'K001' | 'K002', DocRef>> = {};
    const stocktakes: number[] = [];
    try {
      await test.step('Tiền đề: chứng từ ở K001 và K002 cho 5 màn', async () => {
        docs.purchases = { K001: await draftPurchase(adminApi, 'K001', p.productId, 1, 40_000), K002: await draftPurchase(adminApi, 'K002', p.productId, 1, 41_000) };
        docs.transfers = { K001: await draftTransfer(adminApi, 'K001', 'K003', p.productId, 1), K002: await draftTransfer(adminApi, 'K002', 'K003', p.productId, 1) };
        docs.disposals = { K001: await draftDisposal(adminApi, 'K001', p.productId, 1), K002: await draftDisposal(adminApi, 'K002', p.productId, 1) };
        const o1 = await createInvoice(adminApi, { partnerId: cust.partnerId, warehouse: 'K001', lines: [{ productId: p.productId, qty: 1, price: 61_000 + digits }], paid: 61_000 + digits, requestId: `wha02a-${uid}` });
        const o2 = await createInvoice(adminApi, { partnerId: cust.partnerId, warehouse: 'K002', lines: [{ productId: p.productId, qty: 2, price: 61_000 + digits }], paid: 2 * (61_000 + digits), requestId: `wha02b-${uid}` });
        docs.orders = { K001: { id: o1.orderId, code: o1.orderCode }, K002: { id: o2.orderId, code: o2.orderCode } };
        docs.stocktakes = { K001: await draftStocktake(adminApi, 'K001', p.productId, 19), K002: await draftStocktake(adminApi, 'K002', p.productId, 19) };
        stocktakes.push(docs.stocktakes.K001.id, docs.stocktakes.K002.id);
        for (const [k, v] of Object.entries(docs)) expect(v.K001.code && v.K002.code, `mã chứng từ ${k}`).toBeTruthy();
      });
      await new LoginPage(page).loginOk(user.username, env.defaultPassword);
      const screens: [string, string][] = [
        ['purchases', '/purchases'],
        ['transfers', '/transfers'],
        ['stocktakes', '/stocktakes'],
        ['orders', '/orders'],
        ['disposals', '/disposals'],
      ];
      for (const [key, path] of screens) {
        await test.step(`1. Mở ${path} → KQ1. chỉ có chứng từ K001`, async () => {
          const listResp = page.waitForResponse((r) => new URL(r.url()).pathname.toLowerCase() === `/api${path}` && r.request().method() === 'GET');
          await page.goto(path);
          const body = await (await listResp).text();
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          expect(body.includes(docs[key].K002.code), `API ${path} không trả chứng từ K002 ${docs[key].K002.code}`).toBe(false);
          await expect(page.getByText(docs[key].K002.code, { exact: true })).toHaveCount(0);
          await expect(page.getByText(docs[key].K001.code, { exact: true }).first()).toBeVisible();
        });
      }
      await test.step('2. Mở hóa đơn K002 bằng URL → bị từ chối', async () => {
        const detail = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/orders/${docs.orders.K002.id}`);
        await page.goto(`/orders/${docs.orders.K002.id}`);
        const status = (await detail).status();
        testInfo.annotations.push({ type: 'observed', description: `GET /api/orders/{id K002} → HTTP ${status}` });
        expect(status).toBeGreaterThanOrEqual(400);
        await expect(page.getByText('Bạn không có quyền truy cập dữ liệu của chi nhánh/kho này.').first()).toBeVisible();
      });
    } finally {
      for (const id of stocktakes) await cancelStocktake(adminApi, id).catch(() => undefined);
    }
  });

  test('SYS-WHA-03 – Lọc theo kho và tìm nhân sự hiện đúng kho được phân quyền', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-WHA-03', SHEET);
    const acc = await makeAccount(adminApi, uid, { prefix: 'wha03', warehouses: ['K002', 'K004'] });
    const w = await asAdmin(page, env);
    await test.step('1. Lọc theo kho K002 → mọi dòng đều có K002', async () => {
      await w.warehouseFilter.selectOption({ label: `K002 - ${WAREHOUSES.K002.name}` });
      await expect(w.staffRows().first()).toBeVisible();
      await expect(w.staffRows().filter({ hasNotText: WAREHOUSES.K002.name })).toHaveCount(0);
      await expect(w.row(acc.name)).toHaveCount(1);
      await w.warehouseFilter.selectOption({ label: 'Tất cả kho cơ sở' });
    });
    await test.step('2. Tìm nhân sự → kho hiển thị đúng dữ liệu', async () => {
      await w.search.fill(acc.name);
      await expect(w.staffRows()).toHaveCount(1);
      for (const code of await warehouseCodesOfUser(db, acc.username)) {
        await expect(w.row(acc.name)).toContainText(WAREHOUSES[code as WarehouseCode].name);
      }
      await expect(w.row(acc.name)).not.toContainText(WAREHOUSES.K001.name);
    });
  });

  test('SYS-WHA-04 – Chọn, bỏ chọn kho, lưu: kho ở header theo phân quyền mới', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-WHA-04', SHEET);
    const acc = await makeAccount(adminApi, uid, { prefix: 'wha04', warehouses: ['K001', 'K002'] });
    const user = await newUserContext(browser, testInfo, dialogs);
    await new LoginPage(user.page).loginOk(acc.username, env.defaultPassword);
    expect(await new AppShell(user.page).listBranchCodes()).toEqual(['K001', 'K002']);
    const w = await asAdmin(page, env);
    await test.step('1. Chọn K003, bỏ K002 (và tìm "Chọn tất cả"); lưu', async () => {
      const modal = await w.open(acc.name);
      const selectAll = modal.getByRole('button', { name: /Chọn tất cả/i }).or(modal.getByRole('checkbox', { name: /Chọn tất cả/i }));
      testInfo.annotations.push({ type: 'observed', description: `Nút "Chọn tất cả" trong hộp phân quyền kho: ${(await selectAll.count()) > 0 ? 'có' : 'KHÔNG có'}` });
      expect.soft(await selectAll.count(), 'Procedure có bước Select All nhưng hộp phân quyền kho không có nút này').toBeGreaterThan(0);
      await w.checkbox(modal, 'K003').check();
      await w.checkbox(modal, 'K002').uncheck();
      expect(await saveAccess(page)).toBe(200);
      expect(await warehouseCodesOfUser(db, acc.username)).toEqual(['K001', 'K003']);
    });
    await test.step('2. Người dùng tải lại trang → KQ. kho ở header theo phân quyền mới', async () => {
      await user.page.reload();
      await user.page.waitForLoadState('networkidle');
      await expect.poll(() => new AppShell(user.page).listBranchCodes()).toEqual(['K001', 'K003']);
    });
    await user.context.close();
  });

  test('SYS-WHA-05 – Bỏ hết kho của người dùng: được lưu, người dùng không còn kho', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-WHA-05', SHEET, { mismatch: 'Description (SRS E15.1): báo bắt buộc ít nhất một kho; Expected: lưu được (quyết định nhóm).' });
    const acc = await makeAccount(adminApi, uid, { prefix: 'wha05', warehouses: ['K001'] });
    const w = await asAdmin(page, env);
    dialogs.expect(/kho/i);
    const modal = await w.open(acc.name);
    for (const code of Object.keys(WAREHOUSES) as WarehouseCode[]) await w.checkbox(modal, code).uncheck();
    const resp = page
      .waitForResponse((r) => /\/api\/warehouse-?permissions\/\d+$/i.test(new URL(r.url()).pathname), { timeout: 5_000 })
      .catch(() => null);
    await page.getByRole('button', { name: 'Lưu phân quyền' }).click();
    const res = await resp;
    expect(res?.status(), `Không lưu được${dialogs.seen.length ? ': ' + dialogs.seen.map((d) => d.message).join(' | ') : ''}`).toBe(200);
    await seeMessage(page, dialogs, new RegExp(`Đã cập nhật phân quyền kho cho nhân sự ${acc.name}`));
    expect(await warehouseCodesOfUser(db, acc.username)).toEqual([]);
  });
});
