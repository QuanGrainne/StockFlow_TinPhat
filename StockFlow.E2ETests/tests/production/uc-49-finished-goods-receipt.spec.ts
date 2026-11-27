// Report 5.3 – sheet "UC-49 Finished Goods Receipt" (SYS-FGR-01..06). Code: phiếu nhập thành phẩm do hệ thống tự sinh khi bấm
// "Duyệt hoàn thành" (màn Nhập thành phẩm → chọn lệnh). Nút này cần chức năng Lập lệnh sản xuất nên prodstaff01 (Production
// Accountant) không có; người thao tác là manager01 – ghi trong annotation. Lệnh, xuất NVL dựng sẵn qua API.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { FinishedGoodsPage } from '../../pages/ProductionPages';
import { SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct, type ProductDto } from '../../fixtures/data';
import { arrangeProductionOrder, issueMaterial, type ProductionOrderRef } from '../../fixtures/production';
import { fgReceiptsOfOrder, lastLedgerType, productionOrderRow, productionReports } from '../../fixtures/dbq3';
import { stockQty } from '../../fixtures/dbq';
import { backendError, readToast, uiBlocksAction } from '../../fixtures/ui';
import type { Page } from '@playwright/test';

const SHEET = 'UC-49 Finished Goods Receipt';
const USER = SEEDED.manager.username;
const ACTOR = 'Actor: manager01 – nút Nhập thành phẩm / Duyệt hoàn thành cần chức năng Lập lệnh sản xuất (prodstaff01 không có)';

interface Ctx extends ProductionOrderRef {
  fg: ProductDto;
  rm: ProductDto;
}

/** Lệnh `qty` thành phẩm (định mức 2), đã xuất `issued` NVL tại K002 */
async function order(adminApi: ApiSession, uid: string, qty: number, issued: number): Promise<Ctx> {
  const fg = await createProduct(adminApi, { suffix: `${uid}fg`, price: 500_000, namePrefix: 'TP E2E' });
  const rm = await createProduct(adminApi, { suffix: `${uid}rm`, price: 20_000, namePrefix: 'NVL E2E' });
  await addStock(adminApi, rm.productId, 'K002', 200);
  const ref = await arrangeProductionOrder(adminApi, { uid, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty, wh: 'K002' });
  const main = Math.min(issued, qty * 2);
  if (main > 0) await issueMaterial(adminApi, ref.orderId, 'K002', main);
  if (issued > main) await issueMaterial(adminApi, ref.orderId, 'K002', issued - main, { supplementary: true, reason: 'E2E xuất bổ sung' });
  return { ...ref, fg, rm };
}

async function open(page: Page, env: { defaultPassword: string }, o: Ctx): Promise<FinishedGoodsPage> {
  await new LoginPage(page).loginOk(USER, env.defaultPassword);
  const fgp = new FinishedGoodsPage(page);
  await fgp.goto();
  expect(await fgp.openFor(o.orderCode)).toBe(true);
  await fgp.warehouse.selectOption({ label: WAREHOUSES.K002.name });
  return fgp;
}

const num = (s: string | null | undefined): number => Number(s ?? 0);

test.describe(SHEET, () => {
  test('SYS-FGR-01 – Nhập thành phẩm: cộng tồn SL đạt, cập nhật tiến độ lệnh @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FGR-01', SHEET);
    testInfo.annotations.push({ type: 'note', description: ACTOR });
    const o = await order(adminApi, uid, 10, 20);
    const lot = `LOT${uid.replace(/\D/g, '').slice(-8)}`;
    const fgp = await open(page, env, o);
    await fgp.setAccepted(o.fg.code, 4);
    await fgp.lot.fill(lot);
    const res = await fgp.submit();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    await expect(page.getByText(`Đã nhập thành phẩm cho lệnh ${o.orderCode}. Chưa đủ kế hoạch nên lệnh vẫn Đang sản xuất, có thể duyệt nhập tiếp.`)).toBeVisible();
    expect(await stockQty(db, o.fg.productId, 'K002')).toBe(4);
    const ledger = await lastLedgerType(db, o.fg.productId, 'K002');
    testInfo.annotations.push({ type: 'observed', description: `Thẻ kho: ${JSON.stringify(ledger)}; phiếu nhập: ${JSON.stringify(await fgReceiptsOfOrder(db, o.orderId))}` });
    expect(ledger?.transaction_type).toBe('PRODUCTION_RECEIPT');
    const rc = await fgReceiptsOfOrder(db, o.orderId);
    expect(rc.map((r) => [num(r.quantity), r.lot_number])).toEqual([[4, lot]]);
    const po = await productionOrderRow(db, o.orderId);
    expect([po?.status, num(po?.actual_quantity)]).toEqual(['IN_PROGRESS', 4]);
  });

  test('SYS-FGR-02 – Nhập đủ số kế hoạch: lệnh Hoàn thành', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FGR-02', SHEET);
    testInfo.annotations.push({ type: 'note', description: ACTOR });
    const o = await order(adminApi, uid, 10, 20);
    const fgp = await open(page, env, o);
    await fgp.setAccepted(o.fg.code, 10);
    const res = await fgp.submit();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    await expect(page.getByText(`Đã duyệt hoàn thành lệnh ${o.orderCode} và tự sinh phiếu nhập thành phẩm.`)).toBeVisible();
    expect((await productionOrderRow(db, o.orderId))?.status).toBe('COMPLETED');
    expect(await stockQty(db, o.fg.productId, 'K002')).toBe(10);
  });

  test('SYS-FGR-03 – Thành phẩm cần nhiều NVL hơn số đã xuất: cảnh báo, chỉ lưu khi có ghi chú', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FGR-03', SHEET);
    testInfo.annotations.push({ type: 'note', description: ACTOR });
    const expected = 'Số thành phẩm cần nhiều NVL hơn số đã xuất theo BOM. Vui lòng nhập ghi chú để tiếp tục.';
    const o = await order(adminApi, uid, 10, 8);
    const fgp = await open(page, env, o);
    await fgp.setAccepted(o.fg.code, 6);
    const msg = page.getByText(/chỉ đủ duyệt tối đa|nhiều (NVL|nguyên vật liệu) hơn số đã xuất/).first();
    const [res, shown] = await Promise.all([fgp.submit(5_000), readToast(msg)]);
    const warning = page.getByText('Cảnh báo định mức nguyên vật liệu');
    testInfo.annotations.push({ type: 'observed', description: `Duyệt 6 thành phẩm khi NVL chỉ đủ 4: HTTP ${res?.status() ?? '(không gửi)'}; thông báo "${shown}"; hộp cảnh báo + ghi chú: ${await warning.count()}` });
    if (!(await warning.count())) {
      const api = await ApiSession.login(env, USER, env.defaultPassword);
      const d = await api.get<{ summary: { items?: { productionOrderItemId: number }[] | null } }>(`/api/production/orders/${o.orderId}?warehouseId=${WAREHOUSES.K002.id}`);
      const be = await backendError(() =>
        api.post(`/api/production/orders/${o.orderId}/approve`, {
          warehouseId: WAREHOUSES.K002.id, locationId: null, lotNumber: null, productionDate: null, notes: null, reviewNote: null, confirmExceedPlan: false,
          lines: [{ productionOrderItemId: d.summary.items?.[0]?.productionOrderItemId ?? null, acceptedQuantity: 6, defectQuantity: 0, defectReason: null }],
        })
      );
      await api.dispose();
      uiBlocksAction(testInfo, `giao diện từ chối hẳn ("${shown}"), không hỏi ghi chú`, expected, be);
    }
    expect(await fgReceiptsOfOrder(db, o.orderId)).toEqual([]);
  });

  test('SYS-FGR-04 – Nhập vượt kế hoạch: hỏi xác nhận, chỉ lưu sau khi xác nhận', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FGR-04', SHEET, { mismatch: 'Description: vượt kế hoạch bị từ chối; Expected (code): hỏi xác nhận [CONFIRM_EXCEED_PLAN].' });
    testInfo.annotations.push({ type: 'note', description: `${ACTOR}; xuất bổ sung NVL đủ cho 6 thành phẩm để không vướng kiểm định mức` });
    const o = await order(adminApi, uid, 5, 12);
    const fgp = await open(page, env, o);
    await fgp.setAccepted(o.fg.code, 6);
    const res = await fgp.submit();
    testInfo.annotations.push({ type: 'observed', description: `Lần gửi đầu: HTTP ${res?.status() ?? '(không gửi)'} ${res ? (await res.text()).slice(0, 160) : ''}` });
    await expect(page.getByText('Xác nhận nhập vượt số lượng lệnh sản xuất')).toBeVisible();
    expect(await fgReceiptsOfOrder(db, o.orderId), 'chưa lưu khi chưa xác nhận').toEqual([]);
    const [res2] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/production\/orders\/\d+\/approve$/.test(new URL(r.url()).pathname)),
      page.getByRole('button', { name: 'Có', exact: true }).click(),
    ]);
    expect(res2.status(), await res2.text()).toBeLessThan(300);
    expect((await fgReceiptsOfOrder(db, o.orderId)).map((r) => num(r.quantity))).toEqual([6]);
  });

  test('SYS-FGR-05 – SL đạt 0, thiếu số lô hoặc kho không được phân quyền bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FGR-05', SHEET);
    testInfo.annotations.push({ type: 'note', description: ACTOR });
    const o = await order(adminApi, uid, 10, 20);
    const fgp = await open(page, env, o);
    // Expected Round 2 (theo luật hiện hành của Duyệt hoàn thành): cho phép lô chỉ có hàng lỗi nên kiểm "đạt + lỗi > 0";
    // số lô không bắt buộc (để trống = theo mã lệnh).
    await test.step('1a. SL đạt 0, lỗi 0 → "Tổng số lượng thành phẩm (đạt + lỗi) phải lớn hơn 0. …"', async () => {
      await fgp.setAccepted(o.fg.code, 0);
      const msg = page.getByText(/phải lớn hơn 0\./).first();
      const [res, shown] = await Promise.all([fgp.submit(4_000), readToast(msg)]);
      expect(res).toBeNull();
      testInfo.annotations.push({ type: 'observed', description: `SL 0: "${shown}"` });
      expect.soft(shown.startsWith('Tổng số lượng thành phẩm (đạt + lỗi) phải lớn hơn 0.'), 'câu thông báo').toBe(true);
    });
    await test.step('1b. Số lô để trống được phép (= theo mã lệnh)', async () => {
      await expect(fgp.lot).toHaveAttribute('placeholder', 'Để trống = theo mã lệnh');
    });
    await test.step('1c. Kho không được phân quyền', async () => {
      const options = (await fgp.warehouse.locator('option').allInnerTexts()).map((x) => x.trim());
      testInfo.annotations.push({ type: 'observed', description: `Kho nhận thành phẩm có thể chọn: ${options.join(' | ')}` });
      if (!options.includes(WAREHOUSES.K004.name)) {
        const api = await ApiSession.login(env, USER, env.defaultPassword);
        const d = await api.get<{ summary: { items?: { productionOrderItemId: number }[] | null } }>(`/api/production/orders/${o.orderId}?warehouseId=${WAREHOUSES.K002.id}`);
        const be = await backendError(() =>
          api.post(`/api/production/orders/${o.orderId}/approve`, {
            warehouseId: WAREHOUSES.K004.id, locationId: null, lotNumber: null, productionDate: null, notes: null, reviewNote: null, confirmExceedPlan: false,
            lines: [{ productionOrderItemId: d.summary.items?.[0]?.productionOrderItemId ?? null, acceptedQuantity: 1, defectQuantity: 0, defectReason: null }],
          })
        );
        await api.dispose();
        uiBlocksAction(testInfo, 'ô Kho nhận thành phẩm chỉ liệt kê kho được phân quyền (manager01 không có K004)', 'thông báo không có quyền kho', be);
      }
    });
    expect(await fgReceiptsOfOrder(db, o.orderId)).toEqual([]);
  });

  test('SYS-FGR-06 – SL lỗi kèm lý do được ghi riêng, không vào tồn bán được', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-FGR-06', SHEET);
    testInfo.annotations.push({ type: 'note', description: ACTOR });
    const o = await order(adminApi, uid, 10, 20);
    const fgp = await open(page, env, o);
    await fgp.setAccepted(o.fg.code, 3);
    await fgp.setDefect(o.fg.code, 1, 'Lỗi sơn');
    const res = await fgp.submit();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    const rc = await fgReceiptsOfOrder(db, o.orderId);
    const rp = await productionReports(db, o.orderId);
    testInfo.annotations.push({ type: 'observed', description: `Phiếu nhập: ${JSON.stringify(rc)}; báo cáo SX: ${JSON.stringify(rp)}` });
    expect(await stockQty(db, o.fg.productId, 'K002'), 'chỉ SL đạt vào tồn').toBe(3);
    expect(rp.reduce((s, r) => s + num(r.defect_qty), 0), 'SL lỗi được ghi').toBe(1);
  });
});
