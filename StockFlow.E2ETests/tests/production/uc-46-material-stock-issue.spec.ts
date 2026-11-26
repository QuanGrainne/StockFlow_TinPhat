// Report 5.3 – sheet "UC-46 Material Stock Issue" (SYS-MIS-01..07). Actor "Production Accountant" = prodstaff01 (ProductionStaff, chỉ K002).
// Lệnh dựng sẵn qua API (kho xuất NVL của kế hoạch = K002; Procedure ghi K001 nhưng prodstaff01 chỉ có K002 – ghi trong annotation).
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { MaterialIssuePage } from '../../pages/ProductionPages';
import { SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct, type ProductDto } from '../../fixtures/data';
import { approveCompletion, arrangeProductionOrder, cancelProductionOrder, issueMaterial, type ProductionOrderRef } from '../../fixtures/production';
import { cancelStocktake, draftStocktake } from '../../fixtures/inventory';
import { issuesOfOrder, lastLedgerType, productionOrderRow, requirementsOfOrder } from '../../fixtures/dbq3';
import { stockQty } from '../../fixtures/dbq';
import { backendError, readToast, uiBlocksAction } from '../../fixtures/ui';

const SHEET = 'UC-46 Material Stock Issue';
const USER = SEEDED.production.username;
const WH_NOTE = 'Procedure ghi kho K001; prodstaff01 chỉ có K002 nên lệnh lập với kho xuất NVL K002';

interface Ctx extends ProductionOrderRef {
  fg: ProductDto;
  rm: ProductDto;
}

/** Lệnh `qty` thành phẩm, định mức 2 NVL / đv (nhu cầu 2 × qty), tồn NVL K002 = stock */
async function order(adminApi: ApiSession, uid: string, qty = 10, stock = 100): Promise<Ctx> {
  const fg = await createProduct(adminApi, { suffix: `${uid}fg`, price: 500_000, namePrefix: 'TP E2E' });
  const rm = await createProduct(adminApi, { suffix: `${uid}rm`, price: 20_000, namePrefix: 'NVL E2E' });
  await addStock(adminApi, rm.productId, 'K002', stock);
  const ref = await arrangeProductionOrder(adminApi, { uid, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty, wh: 'K002' });
  return { ...ref, fg, rm };
}

const num = (s: string | undefined): number => Number(s ?? 0);

test.describe(SHEET, () => {
  test('SYS-MIS-01 – Xuất NVL: trừ tồn, cập nhật đã xuất / còn thiếu, lệnh chuyển Đang sản xuất @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MIS-01', SHEET);
    testInfo.annotations.push({ type: 'note', description: WH_NOTE });
    const o = await order(adminApi, uid);
    expect((await productionOrderRow(db, o.orderId))?.status).toBe('NOT_STARTED');
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const mi = new MaterialIssuePage(page);
    await mi.goto();
    expect(await mi.openFor(o.orderCode)).toBe(true);
    await mi.qty(o.rm.code).fill('8');
    const res = await mi.confirm();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    await expect(page.getByText(new RegExp(`^Đã ghi nhận phiếu xuất NVL \\S+ cho lệnh ${o.orderCode}\\.$`))).toBeVisible();
    expect(await stockQty(db, o.rm.productId, 'K002')).toBe(92);
    const ledger = await lastLedgerType(db, o.rm.productId, 'K002');
    testInfo.annotations.push({ type: 'observed', description: `Thẻ kho: ${JSON.stringify(ledger)}` });
    expect(ledger?.transaction_type).toBe('PRODUCTION_ISSUE');
    const req = (await requirementsOfOrder(db, o.orderId))[0];
    expect([num(req.required_qty), num(req.issued_qty), num(req.shortage_qty)]).toEqual([20, 8, 12]);
    expect((await productionOrderRow(db, o.orderId))?.status).toBe('IN_PROGRESS');
  });

  test('SYS-MIS-02 – Lệnh đã hoàn thành hoặc đã hủy không xuất NVL được', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MIS-02', SHEET);
    const expected = 'Lệnh sản xuất đã hoàn thành hoặc đã huỷ nên không xuất được nguyên vật liệu.';
    const done = await order(adminApi, `${uid}d`, 5);
    await issueMaterial(adminApi, done.orderId, 'K002', 10);
    await approveCompletion(adminApi, done.orderId, 'K002', 5);
    const cancelled = await order(adminApi, `${uid}c`, 5);
    await cancelProductionOrder(adminApi, cancelled.orderId);
    expect([(await productionOrderRow(db, done.orderId))?.status, (await productionOrderRow(db, cancelled.orderId))?.status]).toEqual(['COMPLETED', 'CANCELLED']);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const mi = new MaterialIssuePage(page);
    const api = await ApiSession.login(env, USER, env.defaultPassword);
    try {
      for (const o of [done, cancelled]) {
        await mi.goto();
        const listed = await mi.openFor(o.orderCode);
        const req = await api.get<{ materials: { requirementId: number }[] }>(`/api/production/orders/${o.orderId}?warehouseId=${WAREHOUSES.K002.id}`);
        const be = await backendError(() =>
          api.post('/api/production/material-issues', {
            productionOrderId: o.orderId, warehouseId: WAREHOUSES.K002.id, isSupplementary: false, reason: null,
            items: [{ requirementId: req.materials[0].requirementId, quantity: 1 }],
          })
        );
        testInfo.annotations.push({ type: 'observed', description: `${o.orderCode}: có trong hộp chọn lệnh = ${listed}; backend: "${be}"` });
        if (!listed) uiBlocksAction(testInfo, `hộp chọn lệnh chỉ liệt kê lệnh Chưa bắt đầu / Đang sản xuất (${o.orderCode})`, expected, be);
        await page.keyboard.press('Escape');
      }
    } finally {
      await api.dispose();
    }
    expect((await issuesOfOrder(db, cancelled.orderId)).length).toBe(0);
    expect((await issuesOfOrder(db, done.orderId)).length).toBe(1);
  });

  test('SYS-MIS-03 – SL thực xuất âm hoặc vượt tồn bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MIS-03', SHEET);
    const base = 'Số lượng thực xuất không được âm và không được vượt tồn kho hiện có.';
    const o = await order(adminApi, uid, 10, 15);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const mi = new MaterialIssuePage(page);
    await mi.goto();
    expect(await mi.openFor(o.orderCode)).toBe(true);
    for (const v of ['16', '-1']) {
      await test.step(`Nhập SL thực xuất ${v} (tồn 15)`, async () => {
        await mi.qty(o.rm.code).fill(v);
        const msg = page.getByText(new RegExp(`^${base.replace(/[.()]/g, '\\$&')}`)).first();
        const [res, text] = await Promise.all([mi.confirm(4_000), readToast(msg)]);
        expect(res).toBeNull();
        testInfo.annotations.push({ type: 'observed', description: `SL ${v}: "${text}"` });
      });
    }
    testInfo.annotations.push({ type: 'note', description: 'Expected có "(...)" (chi tiết hàng / tồn): frontend chặn trước nên chỉ hiện phần câu chính; chi tiết chỉ có ở thông báo backend' });
    expect(await issuesOfOrder(db, o.orderId)).toEqual([]);
    expect(await stockQty(db, o.rm.productId, 'K002')).toBe(15);
  });

  test('SYS-MIS-04 – NVL đang kiểm kho: phiếu xuất bị chặn (BR-42)', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MIS-04', SHEET);
    testInfo.annotations.push({ type: 'note', description: `${WH_NOTE}; phiếu kiểm DRAFT lập ở K002` });
    const o = await order(adminApi, uid);
    const st = await draftStocktake(adminApi, 'K002', o.rm.productId, 100);
    try {
      await new LoginPage(page).loginOk(USER, env.defaultPassword);
      const mi = new MaterialIssuePage(page);
      await mi.goto();
      expect(await mi.openFor(o.orderCode)).toBe(true);
      await mi.qty(o.rm.code).fill('5');
      const res = await mi.confirm();
      expect(res?.status()).toBeGreaterThanOrEqual(400);
      await expect(page.getByText(new RegExp(`Mặt hàng ${o.rm.code} đang được kiểm kho \\(phiếu ${st.code}\\)`))).toBeVisible();
    } finally {
      await cancelStocktake(adminApi, st.id).catch(() => undefined);
    }
    expect(await issuesOfOrder(db, o.orderId)).toEqual([]);
    expect(await stockQty(db, o.rm.productId, 'K002')).toBe(100);
  });

  test('SYS-MIS-05 – Xuất bổ sung ghi dưới cùng lệnh và cập nhật tổng', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MIS-05', SHEET);
    const o = await order(adminApi, uid);
    await issueMaterial(adminApi, o.orderId, 'K002', 20);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const mi = new MaterialIssuePage(page);
    await mi.goto();
    expect(await mi.openFor(o.orderCode)).toBe(true);
    await mi.supplementary.check();
    await mi.qty(o.rm.code).fill('3');
    await mi.reason.fill(`Hao hụt khi chạy máy ${uid}`);
    const res = await mi.confirm();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    const issues = await issuesOfOrder(db, o.orderId);
    testInfo.annotations.push({ type: 'observed', description: `Phiếu xuất của lệnh: ${JSON.stringify(issues)}` });
    expect(issues.map((i) => i.is_supplementary)).toEqual([false, true]);
    expect(num((await requirementsOfOrder(db, o.orderId))[0].issued_qty)).toBe(23);
    expect(await stockQty(db, o.rm.productId, 'K002')).toBe(77);
  });

  test('SYS-MIS-06 – Xuất lũy kế vượt nhu cầu bị từ chối (cần lý do)', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MIS-06', SHEET);
    const expected = 'Số lượng xuất luỹ kế vượt nhu cầu theo BOM.';
    const o = await order(adminApi, uid);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const mi = new MaterialIssuePage(page);
    await mi.goto();
    expect(await mi.openFor(o.orderCode)).toBe(true);
    await test.step('1. Xuất 25 / nhu cầu 20, không lý do → bị từ chối', async () => {
      await mi.qty(o.rm.code).fill('25');
      const msg = page.getByText(/vượt nhu cầu theo/).first();
      const [res, text] = await Promise.all([mi.confirm(4_000), readToast(msg)]);
      expect(res).toBeNull();
      testInfo.annotations.push({ type: 'observed', description: `Thông báo: "${text}"` });
      expect.soft(text.normalize('NFC').startsWith(expected.normalize('NFC')), `thông báo bắt đầu bằng "${expected}"`).toBe(true);
      expect(await issuesOfOrder(db, o.orderId)).toEqual([]);
    });
    await test.step('Quan sát: có lý do thì lưu được', async () => {
      await mi.reason.fill(`Xuất dư dự phòng ${uid}`);
      const res = await mi.confirm();
      testInfo.annotations.push({ type: 'observed', description: `Có lý do → HTTP ${res?.status() ?? '(không gửi)'}; đã xuất ${(await requirementsOfOrder(db, o.orderId))[0].issued_qty}` });
    });
  });

  test('SYS-MIS-07 – Xuất ít hơn nhu cầu: lưu SL thực xuất, phần thiếu giữ cho lần sau', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MIS-07', SHEET);
    const o = await order(adminApi, uid);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const mi = new MaterialIssuePage(page);
    await mi.goto();
    expect(await mi.openFor(o.orderCode)).toBe(true);
    await expect(mi.qty(o.rm.code)).toHaveValue('20');
    await mi.qty(o.rm.code).fill('6');
    const res = await mi.confirm();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    const req = (await requirementsOfOrder(db, o.orderId))[0];
    expect([num(req.issued_qty), num(req.shortage_qty)]).toEqual([6, 14]);
    await mi.goto();
    expect(await mi.openFor(o.orderCode)).toBe(true);
    await expect(mi.qty(o.rm.code), 'lần xuất sau đề xuất phần còn thiếu').toHaveValue('14');
  });
});
