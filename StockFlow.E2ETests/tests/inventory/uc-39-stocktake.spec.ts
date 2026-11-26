// Report 5.3 – sheet "UC-39 Stocktake" (SYS-STK-01..06). Actor "Warehouse Accountant" = whstaff01 (K001 + K002, kho làm việc K001).
// Code: Hoàn thành = cân bằng kho ngay (không có bước Manager duyệt). STK-03 là N/A theo Note.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { DisposalFormPage, DocListPage, StocktakeFormPage } from '../../pages/InventoryPages';
import { PoListPage, ReceiptFormPage } from '../../pages/PurchasingPages';
import { ProductionOrdersPage } from '../../pages/ProductionPages';
import { TransferCreatePage } from '../../pages/TransferPages';
import { PosPage } from '../../pages/PosPage';
import { SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct } from '../../fixtures/data';
import { cancelStocktake, draftStocktake } from '../../fixtures/inventory';
import { createPo, suppliers } from '../../fixtures/purchasing';
import { arrangeProductionOrder } from '../../fixtures/production';
import { disposalsOfProduct, receiptsOfPo, stockQty, stocktakeByCode, stocktakeItems, stocktakesOfProduct, transfersOfProduct } from '../../fixtures/dbq';
import { queryRows } from '../../fixtures/pg';
import { backendError, uiBlocksAction } from '../../fixtures/ui';
import type { Page, TestInfo } from '@playwright/test';

const SHEET = 'UC-39 Stocktake';
const USER = SEEDED.warehouse.username;
const GUARD = /đang được kiểm kho \(phiếu .+\)\. Không thể xác nhận giao dịch/;

/** Thông báo lỗi đang hiện (toast / antd message) chứa câu khoá kiểm kho */
async function guardShown(page: Page): Promise<boolean> {
  return page
    .getByText(GUARD)
    .first()
    .waitFor({ state: 'visible', timeout: 8_000 })
    .then(() => true)
    .catch(() => false);
}

function record(testInfo: TestInfo, what: string, blocked: boolean, detail: string): void {
  testInfo.annotations.push({ type: 'observed', description: `${what}: ${blocked ? 'BỊ CHẶN' : 'KHÔNG bị chặn'} – ${detail}` });
}

test.describe(SHEET, () => {
  test('SYS-STK-01 – Nhập SL thực tế: hiện chênh lệch từng dòng; Hoàn thành cân bằng kho @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-STK-01', SHEET, { mismatch: 'Description: gửi Manager duyệt; code: Hoàn thành cân bằng kho ngay (BALANCED).' });
    const p = await createProduct(adminApi, { suffix: uid, price: 71_000 });
    await addStock(adminApi, p.productId, 'K001', 20);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = new StocktakeFormPage(page);
    let code = '';
    await test.step('1. Tạo phiếu kiểm K001, nhập SL thực tế 17 → chênh lệch -3', async () => {
      await form.goto();
      await form.addProduct(p.code);
      await expect(form.line(p.code)).toContainText('20');
      await form.setQty(p.code, 17);
      await expect(form.line(p.code)).toContainText('-3');
      await expect(page.getByRole('button', { name: 'Lệch (1)' })).toBeVisible();
    });
    await test.step('2. Hoàn thành → BALANCED, tồn = SL thực tế', async () => {
      const res = await form.complete();
      expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
      code = ((await res?.json()) as { summary: { stocktakeCode: string } }).summary.stocktakeCode;
      await expect(page.getByText(`Đã cân bằng kho phiếu ${code}`)).toBeVisible();
      expect((await stocktakeByCode(db, code))?.status).toBe('BALANCED');
      expect(await stockQty(db, p.productId, 'K001')).toBe(17);
    });
  });

  test('SYS-STK-02 – Hàng trong phiếu kiểm đang mở bị khoá nhập / xuất', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    // Phạm vi khoá kiểm kho theo Report 3 BR-42 (chốt khi sửa DEF-IT-08, Report 5.2 v1.1): xuất hủy, xuất NVL,
    // nhập thành phẩm, duyệt hoàn thành. Nhập hàng / chuyển hàng / POS không thuộc phạm vi → chỉ ghi nhận (Expected Round 2).
    traceTc(testInfo, 'SYS-STK-02', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Các thao tác ở bước 2 làm bằng Admin (đủ chức năng và kho) để chỉ còn điều kiện khoá kiểm kho' });
    test.setTimeout(240_000);
    const p = await createProduct(adminApi, { suffix: `${uid}p`, price: 72_000 });
    const fg = await createProduct(adminApi, { suffix: `${uid}fg`, price: 500_000, namePrefix: 'TP E2E' });
    await addStock(adminApi, p.productId, 'K001', 30);
    const [s] = await suppliers(adminApi);
    const po = await createPo(adminApi, { wh: 'K001', partnerId: s.id, status: 'ORDERED', lines: [{ productId: p.productId, qty: 4, price: 40_000 }] });
    const order = await arrangeProductionOrder(adminApi, { uid, fgId: fg.productId, materials: [{ id: p.productId, norm: 1 }], qty: 2, wh: 'K001' });
    const st = await draftStocktake(adminApi, 'K001', p.productId, 30);
    expect((await stocktakeByCode(db, st.code))?.status, 'tiền đề: phiếu kiểm DRAFT').toBe('DRAFT');
    dialogs.expect(/.*/);
    const results: Record<string, boolean> = {};
    try {
      await new LoginPage(page).loginOk(SEEDED.admin.username, env.defaultPassword);
      await test.step('2a. Xuất hủy', async () => {
        const f = new DisposalFormPage(page);
        await f.goto();
        await f.addProduct(p.code);
        await f.setQty(p.code, 1);
        await f.reason.fill(`E2E khoá kiểm kho ${uid}`);
        const res = await f.complete();
        results.disposal = (res?.status() ?? 0) >= 400 && (await guardShown(page));
        record(testInfo, 'Xuất hủy', results.disposal, `HTTP ${res?.status()}; phiếu: ${JSON.stringify(await disposalsOfProduct(db, p.productId))}`);
      });
      await test.step('2b. Xuất NVL sản xuất', async () => {
        const prod = new ProductionOrdersPage(page);
        await prod.goto(`?code=${order.orderCode}&id=${order.orderId}`);
        await expect(prod.detail()).toBeVisible();
        await prod.detail().getByRole('button', { name: 'Xuất NVL', exact: true }).click();
        // Tiêu đề hộp "Xuất NVL sản xuất · <mã lệnh>" (menu bên cũng có mục cùng tên nhưng ẩn)
        await expect(page.getByText(`· ${order.orderCode}`).first()).toBeVisible();
        await page.getByPlaceholder('0', { exact: true }).filter({ visible: true }).first().fill('1');
        const [res] = await Promise.all([
          page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/production\/material-issues$/.test(new URL(r.url()).pathname)),
          page.getByRole('button', { name: 'Xác nhận xuất kho', exact: true }).click(),
        ]);
        results.materialIssue = res.status() >= 400 && (await guardShown(page));
        record(testInfo, 'Xuất NVL', results.materialIssue, `HTTP ${res.status()}`);
      });
      await test.step('2c. Nhập hàng theo phiếu đặt', async () => {
        const list = new PoListPage(page);
        await list.goto();
        const panel = await list.open(po.code);
        await panel.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
        const form = new ReceiptFormPage(page);
        await expect(form.line(p.code)).toBeVisible();
        await form.openComplete();
        const res = await form.confirmComplete();
        results.receipt = res.status() >= 400 && (await guardShown(page));
        record(testInfo, 'Nhập hàng', results.receipt, `HTTP ${res.status()}; phiếu nhập: ${JSON.stringify(await receiptsOfPo(db, po.id))}`);
      });
      await test.step('2d. Chuyển hàng K001 → K002', async () => {
        const create = new TransferCreatePage(page);
        await create.goto();
        await create.addProduct(p.code);
        await create.setQuantity(p.code, 1);
        await create.destination.selectOption({ label: WAREHOUSES.K002.name });
        const res = await create.complete();
        results.transfer = res.status() >= 400 && (await guardShown(page));
        record(testInfo, 'Chuyển hàng', results.transfer, `HTTP ${res.status()}; phiếu chuyển: ${JSON.stringify(await transfersOfProduct(db, p.productId))}`);
      });
      await test.step('2e. Bán hàng POS (khách lẻ)', async () => {
        const pos = new PosPage(page);
        await pos.goto();
        await pos.addProduct(p.code);
        const res = await pos.tryPay(8_000);
        results.pos = (res?.status() ?? 0) >= 400 && (await guardShown(page));
        record(testInfo, 'Bán POS', results.pos, `HTTP ${res?.status() ?? '(không gửi)'}`);
      });
    } finally {
      await cancelStocktake(adminApi, st.id).catch(() => undefined);
    }
    await test.step('KQ1. Xuất hủy và sản xuất bị chặn', async () => {
      expect.soft(results.disposal, 'xuất hủy bị chặn').toBe(true);
      expect.soft(results.materialIssue, 'xuất NVL bị chặn').toBe(true);
    });
    await test.step('KQ2. Nhập hàng, chuyển hàng, POS: ngoài phạm vi khoá BR-42 (Report 3) – chỉ ghi nhận', async () => {
      testInfo.annotations.push({
        type: 'note',
        description: `Ngoài phạm vi BR-42: nhập hàng ${results.receipt ? 'bị chặn' : 'không chặn'}, chuyển hàng ${results.transfer ? 'bị chặn' : 'không chặn'}, POS ${results.pos ? 'bị chặn' : 'không chặn'}`,
      });
    });
  });

  test('SYS-STK-03 – Kiểm lại: phiếu quay về Đang kiểm', async ({}, testInfo) => {
    traceTc(testInfo, 'SYS-STK-03', SHEET);
    test.skip(true, 'N/A – Chưa có chức năng (không có bước duyệt / kiểm lại)');
  });

  test('SYS-STK-04 – Hủy phiếu kiểm chưa gửi: CANCELLED, tồn không đổi, giải phóng hàng', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-STK-04', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 73_000 });
    await addStock(adminApi, p.productId, 'K001', 12);
    const st = await draftStocktake(adminApi, 'K001', p.productId, 9);
    try {
      await new LoginPage(page).loginOk(USER, env.defaultPassword);
      const list = DocListPage.stocktakes(page);
      await list.goto();
      await list.open(st.code);
      const res = await list.cancel(new RegExp(`/api/stocktakes/${st.id}/cancel$`, 'i'));
      expect(res.status(), await res.text()).toBeLessThan(300);
    } finally {
      if ((await stocktakeByCode(db, st.code))?.status === 'DRAFT') await cancelStocktake(adminApi, st.id).catch(() => undefined);
    }
    expect((await stocktakeByCode(db, st.code))?.status).toBe('CANCELLED');
    expect(await stockQty(db, p.productId, 'K001')).toBe(12);
    expect((await stocktakesOfProduct(db, p.productId)).filter((x) => x.status === 'DRAFT'), 'không còn phiếu kiểm đang mở giữ hàng').toEqual([]);
  });

  test('SYS-STK-05 – SL thực tế âm hoặc bỏ trống bị chặn', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-STK-05', SHEET, { mismatch: 'Lý do chênh lệch không bắt buộc trong code (Note).' });
    const p = await createProduct(adminApi, { suffix: uid, price: 74_000 });
    await addStock(adminApi, p.productId, 'K001', 8);
    // Điều chỉnh tồn (Arrange) tự sinh một phiếu kiểm đã cân bằng → so với danh sách có sẵn
    const existing = await stocktakesOfProduct(db, p.productId);
    testInfo.annotations.push({ type: 'observed', description: `Phiếu kiểm có sẵn sau khi điều chỉnh tồn: ${JSON.stringify(existing)}` });
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = new StocktakeFormPage(page);
    await form.goto();
    await form.addProduct(p.code);
    await test.step('Bỏ trống SL thực tế rồi lưu (quan sát)', async () => {
      // Toast chỉ hiện ~3,5 s: chờ toast song song với việc chờ request lưu
      const [res] = await Promise.all([form.saveDraft(), expect(page.getByText('Còn 1 hàng chưa nhập số lượng thực tế.')).toBeVisible()]);
      expect(res).toBeNull();
    });
    await test.step('1. Nhập SL thực tế âm rồi lưu → "Số lượng thực tế không được âm."', async () => {
      // Lần lưu trước tự chuyển sang tab "Chưa kiểm"; về tab "Tất cả" để dòng không biến mất khi đã có SL
      await page.getByRole('button', { name: /^Tất cả \(\d+\)$/ }).click();
      await form.setQty(p.code, '-3');
      const shown = await form.qty(p.code).inputValue();
      testInfo.annotations.push({ type: 'observed', description: `Nhập -3 → ô hiện "${shown}"` });
      if (!shown.startsWith('-')) {
        const api = await ApiSession.login(env, USER, env.defaultPassword);
        const be = await backendError(() => api.post('/api/stocktakes', { warehouseId: WAREHOUSES.K001.id, status: 'DRAFT', items: [{ productId: p.productId, actualQty: -3 }] }));
        await api.dispose();
        uiBlocksAction(testInfo, `ô SL thực tế bỏ dấu "−" (nhập -3 → "${shown}")`, 'Số lượng thực tế không được âm.', be);
      } else {
        await Promise.all([form.saveDraft(), expect(page.getByText('Số lượng thực tế không được âm.')).toBeVisible()]);
      }
    });
    expect(await stocktakesOfProduct(db, p.productId), 'không tạo thêm phiếu kiểm').toEqual(existing);
    expect(await stockQty(db, p.productId, 'K001')).toBe(8);
  });

  test('SYS-STK-06 – Ghi chú cho dòng lệch được lưu cùng phiếu kiểm', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-STK-06', SHEET, { mismatch: 'Code: không có bước duyệt; ghi chú nhập ở cấp phiếu kiểm (không có ô lý do / ghi chú từng dòng).' });
    const p = await createProduct(adminApi, { suffix: uid, price: 75_000 });
    await addStock(adminApi, p.productId, 'K001', 20);
    const note = `Lệch -2 do hàng vỡ ${uid}`;
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = new StocktakeFormPage(page);
    await form.goto();
    await form.addProduct(p.code);
    await form.setQty(p.code, 18);
    const lineNoteInputs = await form.line(p.code).getByRole('textbox').count();
    testInfo.annotations.push({ type: 'observed', description: `Số ô nhập trên dòng hàng: ${lineNoteInputs} (chỉ ô SL thực tế)` });
    await form.notes.fill(note);
    const res = await form.complete();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    const code = ((await res?.json()) as { summary: { stocktakeCode: string } }).summary.stocktakeCode;
    const st = await stocktakeByCode(db, code);
    expect(st?.status).toBe('BALANCED');
    expect(st?.notes).toBe(note);
    const items = await stocktakeItems(db, st?.stocktake_id ?? -1);
    testInfo.annotations.push({ type: 'observed', description: `Dòng kiểm: ${JSON.stringify(items)}` });
    expect(items.map((i) => Number(i.discrepancy))).toEqual([-2]);
    const rows = await queryRows<{ n: string }>(db, 'SELECT COUNT(*)::text AS n FROM stockflow.trx_stocktakes WHERE stocktake_code = $1', [code]);
    expect(Number(rows[0].n)).toBe(1);
  });
});
