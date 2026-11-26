// Report 5.3 – sheet "UC-44 Production Orders" (SYS-PRO-01..03). Actor "Production Accountant" = prodstaff01 (ProductionStaff, K002).
// Lệnh sản xuất dựng sẵn qua API bằng Admin (BOM → kế hoạch → duyệt → lập lệnh, kho xuất NVL K002).
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { ProductionOrdersPage } from '../../pages/ProductionPages';
import { SEEDED } from '../../fixtures/accounts';
import { addStock, createProduct } from '../../fixtures/data';
import { approveCompletion, arrangeProductionOrder, cancelProductionOrder, issueMaterial, type ProductionOrderRef } from '../../fixtures/production';
import type { ApiSession } from '../../fixtures/api';
import type { ProductDto } from '../../fixtures/data';

const SHEET = 'UC-44 Production Orders';
const USER = SEEDED.production.username;
const MSG16 = 'Không tìm thấy lệnh sản xuất hoặc lệnh không còn khả dụng.';

interface Order extends ProductionOrderRef {
  fg: ProductDto;
  rm: ProductDto;
}

async function order(adminApi: ApiSession, uid: string, tag: string, qty: number): Promise<Order> {
  const fg = await createProduct(adminApi, { suffix: `${uid}${tag}fg`, price: 500_000, namePrefix: 'TP E2E' });
  const rm = await createProduct(adminApi, { suffix: `${uid}${tag}rm`, price: 20_000, namePrefix: 'NVL E2E' });
  await addStock(adminApi, rm.productId, 'K002', 100);
  const ref = await arrangeProductionOrder(adminApi, { uid: `${uid}${tag}`, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty, wh: 'K002' });
  return { ...ref, fg, rm };
}

test.describe(SHEET, () => {
  test('SYS-PRO-01 – Tìm lệnh; chi tiết hiện NVL và phiếu nhập thành phẩm, không hiện giá @p1', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PRO-01', SHEET);
    const a = await order(adminApi, uid, 'a', 10);
    const b = await order(adminApi, uid, 'b', 5);
    // Có phiếu nhập thành phẩm: xuất 20 NVL rồi Manager (Admin) duyệt hoàn thành 10 thành phẩm
    await issueMaterial(adminApi, a.orderId, 'K002', 20);
    await approveCompletion(adminApi, a.orderId, 'K002', 10);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const prod = new ProductionOrdersPage(page);
    await prod.goto();
    await test.step('2a. Tìm theo mã lệnh: chỉ còn lệnh khớp', async () => {
      await prod.search.fill(a.orderCode);
      await expect(prod.row(a.orderCode)).toBeVisible();
      await expect(prod.row(b.orderCode)).toHaveCount(0);
      await expect(prod.dataRows()).toHaveCount(1);
      await prod.search.fill(a.fg.code);
      await expect(prod.dataRows()).toHaveCount(1);
      await expect(prod.row(a.orderCode)).toBeVisible();
    });
    await test.step('2b. Mở lệnh: dòng NVL, phiếu nhập thành phẩm; không có cột giá', async () => {
      await prod.open(a.orderCode);
      const d = prod.detail();
      await expect(prod.material(a.rm.code)).toBeVisible();
      await expect(d.getByText('Nguyên vật liệu theo định mức (không hiển thị giá)')).toBeVisible();
      const headers = (await d.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
      testInfo.annotations.push({ type: 'observed', description: `Cột chi tiết: ${headers.join(' | ')}` });
      expect(headers.filter((h) => /giá|thành tiền|chi phí/i.test(h))).toEqual([]);
      await d.getByRole('button', { name: /^Nhập thành phẩm \(1\)$/ }).click();
      await expect(d.getByText(a.fg.code).first()).toBeVisible();
      const receiptHeaders = (await d.getByRole('columnheader').allInnerTexts()).map((h) => h.trim());
      testInfo.annotations.push({ type: 'observed', description: `Cột tab Nhập thành phẩm: ${receiptHeaders.join(' | ')}` });
      expect(receiptHeaders.filter((h) => /giá|thành tiền|chi phí/i.test(h))).toEqual([]);
    });
  });

  test('SYS-PRO-02 – Quay lại danh sách và mở lệnh khác', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PRO-02', SHEET);
    const a = await order(adminApi, uid, 'a', 4);
    const b = await order(adminApi, uid, 'b', 6);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const prod = new ProductionOrdersPage(page);
    await prod.goto();
    await prod.open(a.orderCode);
    await expect(prod.material(a.rm.code)).toBeVisible();
    // Thu gọn chi tiết (bấm lại dòng) → về danh sách
    await prod.row(a.orderCode).getByRole('cell', { name: a.orderCode, exact: true }).click();
    await expect(prod.detail()).toHaveCount(0);
    await expect(prod.row(b.orderCode)).toBeVisible();
    await prod.open(b.orderCode);
    await expect(prod.material(b.rm.code)).toBeVisible();
    await expect(prod.material(a.rm.code)).toHaveCount(0);
    await expect(prod.detail()).toContainText(b.fg.name);
  });

  test('SYS-PRO-03 – Lệnh không tồn tại hoặc đã hủy: báo lỗi hoặc hiện trạng thái hủy', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PRO-03', SHEET);
    const c = await order(adminApi, uid, 'c', 3);
    await cancelProductionOrder(adminApi, c.orderId);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const prod = new ProductionOrdersPage(page);
    await test.step('1a. Mở id không tồn tại bằng URL → MSG16', async () => {
      await prod.goto('?code=LSX99999&id=999999');
      await expect(page.getByText(MSG16)).toBeVisible();
    });
    await test.step('1b. Mở lệnh đã hủy bằng URL → hiện trạng thái Đã hủy', async () => {
      await prod.goto(`?code=${c.orderCode}&id=${c.orderId}`);
      await expect(prod.detail()).toBeVisible();
      await expect(prod.detail().getByText('Đã hủy').first()).toBeVisible();
      await expect(prod.row(c.orderCode)).toContainText('Đã hủy');
    });
  });
});
