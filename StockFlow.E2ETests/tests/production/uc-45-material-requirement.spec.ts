// Report 5.3 – sheet "UC-45 Material Requirement" (SYS-MRQ-01..03). Nhu cầu NVL nằm ở tab "Thông tin & NVL" của chi tiết lệnh sản xuất.
// Actor "Production Accountant": prodstaff01 (chỉ K002); MRQ-02 cần đổi kho xem tồn nên dùng tài khoản ProductionStaff riêng (K002 + K001).
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { ProductionOrdersPage } from '../../pages/ProductionPages';
import { SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { addStock, createProduct, type ProductDto } from '../../fixtures/data';
import { arrangeProductionOrder, issueMaterial, type ProductionOrderRef } from '../../fixtures/production';
import { backendError, makeAccount, uiBlocksAction } from '../../fixtures/ui';
import type { ApiSession } from '../../fixtures/api';

const SHEET = 'UC-45 Material Requirement';

interface Order extends ProductionOrderRef {
  fg: ProductDto;
  rm: ProductDto;
}

/** Lệnh 10 thành phẩm, định mức 2 NVL / đv (nhu cầu 20), tồn NVL K002 = 100 */
async function order(adminApi: ApiSession, uid: string): Promise<Order> {
  const fg = await createProduct(adminApi, { suffix: `${uid}fg`, price: 500_000, namePrefix: 'TP E2E' });
  const rm = await createProduct(adminApi, { suffix: `${uid}rm`, price: 20_000, namePrefix: 'NVL E2E' });
  await addStock(adminApi, rm.productId, 'K002', 100);
  const ref = await arrangeProductionOrder(adminApi, { uid, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 10, wh: 'K002' });
  return { ...ref, fg, rm };
}

const num = (s: string | undefined): number => Number((s ?? '').replace(/\./g, '').replace(',', '.'));

test.describe(SHEET, () => {
  test('SYS-MRQ-01 – Mỗi NVL hiện nhu cầu, đã xuất, còn thiếu, tồn kho', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MRQ-01', SHEET);
    const o = await order(adminApi, uid);
    await issueMaterial(adminApi, o.orderId, 'K002', 8);
    await new LoginPage(page).loginOk(SEEDED.production.username, env.defaultPassword);
    const prod = new ProductionOrdersPage(page);
    await prod.goto();
    await prod.open(o.orderCode);
    const cells = await prod.materialCells(o.rm.code);
    testInfo.annotations.push({ type: 'observed', description: `Dòng NVL ${o.rm.code}: ${JSON.stringify(cells)}` });
    expect([num(cells['Nhu cầu']), num(cells['Đã xuất']), num(cells['Còn thiếu']), num(cells['Tồn kho'])]).toEqual([20, 8, 12, 92]);
  });

  test('SYS-MRQ-02 – Đổi kho xem tồn: hiện tồn của kho được chọn', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MRQ-02', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'prodstaff01 chỉ có K002 nên ô "Tồn tại kho" chỉ có 1 lựa chọn; dùng tài khoản ProductionStaff riêng có K002 + K001' });
    const o = await order(adminApi, uid);
    await addStock(adminApi, o.rm.productId, 'K001', 37);
    const user = await makeAccount(adminApi, uid, { prefix: 'prod2', role: 'ProductionStaff', warehouses: ['K002', 'K001'] });
    await new LoginPage(page).loginOk(user.username, env.defaultPassword);
    const prod = new ProductionOrdersPage(page);
    await prod.goto();
    await prod.open(o.orderCode);
    // Tồn NVL: K001 = 37, K002 = 100. Ô "Tồn tại kho" mặc định theo kho làm việc → đổi sang kho còn lại rồi đổi về
    const stockOf: Record<string, number> = { [String(WAREHOUSES.K001.id)]: 37, [String(WAREHOUSES.K002.id)]: 100 };
    const nameOf: Record<string, string> = { [String(WAREHOUSES.K001.id)]: WAREHOUSES.K001.name, [String(WAREHOUSES.K002.id)]: WAREHOUSES.K002.name };
    const current = await prod.warehouse.inputValue();
    const options = await prod.warehouse.locator('option').allInnerTexts();
    const before = await prod.materialCells(o.rm.code);
    testInfo.annotations.push({ type: 'observed', description: `Kho xem tồn: ${options.join(' | ')}; mặc định ${nameOf[current]}, tồn ${before['Tồn kho']}` });
    expect(num(before['Tồn kho'])).toBe(stockOf[current]);
    const other = Object.keys(stockOf).find((k) => k !== current) ?? '';
    await test.step(`1. Chọn ${nameOf[other]} → tồn ${stockOf[other]}`, async () => {
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'GET' && new URL(r.url()).pathname === `/api/production/orders/${o.orderId}` && new URL(r.url()).searchParams.get('warehouseId') === other),
        prod.warehouse.selectOption(other),
      ]);
      expect(res.status()).toBe(200);
      await expect.poll(async () => num((await prod.materialCells(o.rm.code))['Tồn kho'])).toBe(stockOf[other]);
    });
    await test.step(`Chọn lại ${nameOf[current]} → tồn ${stockOf[current]} (màn dùng lại dữ liệu đã tải)`, async () => {
      await prod.warehouse.selectOption(current);
      await expect.poll(async () => num((await prod.materialCells(o.rm.code))['Tồn kho'])).toBe(stockOf[current]);
    });
  });

  test('SYS-MRQ-03 – Lệnh có định mức đã bị xóa: báo lỗi', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MRQ-03', SHEET);
    const o = await order(adminApi, uid);
    let deleted = false;
    await test.step('Tiền đề: xóa định mức của lệnh (Admin)', async () => {
      const del = await backendError(() => adminApi.delete(`/api/production/boms/${o.bomId}`));
      deleted = del === '(không lỗi)';
      const off = deleted ? '(bỏ qua)' : await backendError(() => adminApi.post(`/api/production/boms/${o.bomId}/deactivate`));
      testInfo.annotations.push({ type: 'observed', description: `Xóa định mức: "${del}"; ngừng áp dụng định mức thay thế: "${off}"` });
      if (!deleted) uiBlocksAction(testInfo, 'không xóa được định mức đã dùng cho lệnh sản xuất – tiền đề không dựng được', 'Error message shown', del);
    });
    await test.step('1. Mở nhu cầu NVL của lệnh', async () => {
      await new LoginPage(page).loginOk(SEEDED.production.username, env.defaultPassword);
      const prod = new ProductionOrdersPage(page);
      await prod.goto();
      await prod.open(o.orderCode);
      const shown = await prod.material(o.rm.code).count();
      testInfo.annotations.push({ type: 'observed', description: `Chi tiết lệnh hiện ${shown} dòng NVL (nhu cầu lưu theo lệnh)` });
      if (deleted) await expect.soft(page.getByText(/không tìm thấy|định mức/i).first()).toBeVisible();
    });
  });
});
