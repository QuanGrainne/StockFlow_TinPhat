// Report 5.3 – sheet "UC-58 Production" (SYS-MPR-01..08). Actor Manager = manager01 (K001–K003). Code: lệnh lập từ kế hoạch đã duyệt
// (Kế hoạch sản xuất → "Lập lệnh sản xuất"); "cập nhật lệnh Chưa bắt đầu" = "Điều chỉnh định mức". Dữ liệu tiền đề dựng qua API.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { ProductionOrdersPage, ProductionPlansPage } from '../../pages/ProductionPages';
import { SEEDED } from '../../fixtures/accounts';
import type { ApiSession } from '../../fixtures/api';
import { addStock, createProduct, type ProductDto } from '../../fixtures/data';
import { approveCompletion, arrangeApprovedPlan, arrangeProductionOrder, issueMaterial } from '../../fixtures/production';
import { fgReceiptsOfOrder, issuesOfOrder, productionOrderRow, productionOrdersOfPlan, requirementsOfOrder } from '../../fixtures/dbq3';
import { backendError, uiBlocksAction } from '../../fixtures/ui';
import type { Page } from '@playwright/test';

const SHEET = 'UC-58 Production';
const USER = SEEDED.manager.username;

async function products(adminApi: ApiSession, uid: string): Promise<{ fg: ProductDto; rm: ProductDto }> {
  const fg = await createProduct(adminApi, { suffix: `${uid}fg`, price: 500_000, namePrefix: 'TP E2E' });
  const rm = await createProduct(adminApi, { suffix: `${uid}rm`, price: 20_000, namePrefix: 'NVL E2E' });
  await addStock(adminApi, rm.productId, 'K002', 200);
  return { fg, rm };
}

async function login(page: Page, env: { defaultPassword: string }): Promise<void> {
  await new LoginPage(page).loginOk(USER, env.defaultPassword);
}

const num = (s: string | null | undefined): number => Number(s ?? 0);
const tomorrow = (): string => new Date(Date.now() + 7 * 3_600_000 + 86_400_000).toISOString().slice(0, 10);

test.describe(SHEET, () => {
  test('SYS-MPR-01 – Lệnh sản xuất hiện tiến độ và tình trạng NVL', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MPR-01', SHEET);
    const { fg, rm } = await products(adminApi, uid);
    const o = await arrangeProductionOrder(adminApi, { uid, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 10, wh: 'K002' });
    await issueMaterial(adminApi, o.orderId, 'K002', 20);
    await approveCompletion(adminApi, o.orderId, 'K002', 4);
    await login(page, env);
    const prod = new ProductionOrdersPage(page);
    await prod.goto();
    const row = prod.row(o.orderCode);
    await expect(row).toBeVisible();
    const cells = (await row.getByRole('cell').allInnerTexts()).map((c) => c.trim());
    testInfo.annotations.push({ type: 'observed', description: `Dòng lệnh: ${cells.join(' | ')}` });
    await expect(row).toContainText('40%');
    await expect(row).toContainText('Đang sản xuất');
    await expect(row.getByRole('cell').nth(8)).not.toHaveText('');
  });

  test('SYS-MPR-02 – Lập lệnh mới: hiện định mức đang áp dụng và nhu cầu NVL, lưu Chưa bắt đầu @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MPR-02', SHEET, { mismatch: 'Code: lệnh lập từ kế hoạch sản xuất đã duyệt.' });
    const { fg, rm } = await products(adminApi, uid);
    const plan = await arrangeApprovedPlan(adminApi, { uid, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 10, wh: 'K002' });
    await login(page, env);
    const plans = new ProductionPlansPage(page);
    await plans.goto();
    await plans.open(`KH E2E ${uid}`);
    await plans.openCreateOrder(plan.planCode);
    await plans.qty(fg.code).fill('10');
    const deadline = page.locator('xpath=//label[normalize-space()="Hạn hoàn thành"]/following::input[1]');
    if (!(await deadline.inputValue())) await deadline.fill(tomorrow());
    const res = await plans.submit();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    await expect(page.getByText(new RegExp(`^Đã lập lệnh sản xuất \\S+ từ kế hoạch ${plan.planCode}\\.$`))).toBeVisible();
    const orders = await productionOrdersOfPlan(db, plan.planId);
    expect(orders.map((x) => [x.status, num(x.planned_quantity)])).toEqual([['NOT_STARTED', 10]]);
    const req = await requirementsOfOrder(db, orders[0].production_order_id);
    expect(req.map((r) => [r.material_id, num(r.required_qty), num(r.norm_per_unit)])).toEqual([[rm.productId, 20, 2]]);
    const prod = new ProductionOrdersPage(page);
    await prod.goto();
    await prod.open(orders[0].production_order_code);
    await expect(prod.detail()).toContainText(`BOM-${fg.code}`);
    await expect(prod.material(rm.code)).toBeVisible();
  });

  test('SYS-MPR-03 – Cập nhật lệnh Chưa bắt đầu và hủy lệnh chưa xuất NVL', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MPR-03', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Cập nhật lệnh Chưa bắt đầu trên UI là "Điều chỉnh định mức" (không có form sửa lệnh khác)' });
    const { fg, rm } = await products(adminApi, uid);
    const a = await arrangeProductionOrder(adminApi, { uid: `${uid}a`, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 10, wh: 'K002' });
    const b = await arrangeProductionOrder(adminApi, { uid: `${uid}b`, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 5, wh: 'K002' });
    await login(page, env);
    const prod = new ProductionOrdersPage(page);
    await test.step('1a. Điều chỉnh định mức lệnh Chưa bắt đầu (2 → 3 / đv)', async () => {
      await prod.goto(`?code=${a.orderCode}&id=${a.orderId}`);
      await prod.detail().getByRole('button', { name: 'Điều chỉnh định mức' }).click();
      const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: rm.code, exact: true }) }).filter({ has: page.getByRole('textbox') }).last();
      await row.getByRole('textbox').first().fill('3');
      await page.getByPlaceholder(/^VD: đổi lô NVL/).fill(`E2E đổi quy cách ${uid}`);
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'POST' && /\/adjust-norms$/.test(new URL(r.url()).pathname)),
        page.getByRole('button', { name: 'Lưu điều chỉnh' }).click(),
      ]);
      expect(res.status(), await res.text()).toBeLessThan(300);
      const req = (await requirementsOfOrder(db, a.orderId))[0];
      expect([num(req.norm_per_unit), num(req.required_qty)]).toEqual([3, 30]);
    });
    await test.step('1b. Hủy lệnh chưa xuất NVL', async () => {
      await prod.goto(`?code=${b.orderCode}&id=${b.orderId}`);
      await prod.detail().getByRole('button', { name: 'Hủy lệnh' }).click();
      const reason = page.getByRole('textbox').last();
      if (await page.getByText(/^Lý do/).count()) await reason.fill(`E2E hủy ${uid}`);
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/production\/orders\/\d+\/cancel$/.test(new URL(r.url()).pathname)),
        page.getByRole('button', { name: /^(Hủy lệnh|Đồng ý|Xác nhận)$/ }).last().click(),
      ]);
      expect(res.status(), await res.text()).toBeLessThan(300);
      expect((await productionOrderRow(db, b.orderId))?.status).toBe('CANCELLED');
    });
  });

  test('SYS-MPR-04 – Đóng sớm lệnh Đang sản xuất kèm lý do', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MPR-04', SHEET);
    const { fg, rm } = await products(adminApi, uid);
    const o = await arrangeProductionOrder(adminApi, { uid, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 10, wh: 'K002' });
    await issueMaterial(adminApi, o.orderId, 'K002', 6);
    const reason = `Khách hủy đơn ${uid}`;
    await login(page, env);
    const prod = new ProductionOrdersPage(page);
    await prod.goto(`?code=${o.orderCode}&id=${o.orderId}`);
    await prod.detail().getByRole('button', { name: 'Đóng lệnh' }).click();
    await expect(page.getByRole('heading', { name: 'Đóng lệnh sản xuất', level: 3 })).toBeVisible();
    await page.locator('xpath=//*[starts-with(normalize-space(text()),"Lý do")]/following::textarea[1] | //*[starts-with(normalize-space(text()),"Lý do")]/following::input[1]').first().fill(reason);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/production\/orders\/\d+\/close$/.test(new URL(r.url()).pathname)),
      page.getByRole('button', { name: 'Đóng lệnh', exact: true }).last().click(),
    ]);
    expect(res.status(), await res.text()).toBeLessThan(300);
    const po = await productionOrderRow(db, o.orderId);
    testInfo.annotations.push({ type: 'observed', description: `Sau khi đóng: ${JSON.stringify(po)}` });
    expect(po?.status).toBe('COMPLETED');
    expect(po?.notes ?? '').toContain(reason);
  });

  test('SYS-MPR-05 – Thành phẩm không có định mức đang áp dụng không lập lệnh được', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MPR-05', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Tiền đề: kế hoạch duyệt khi còn định mức, sau đó định mức bị ngừng áp dụng' });
    const expected = 'Thành phẩm chưa có BOM đang áp dụng. Vui lòng thiết lập BOM trước.';
    const { fg, rm } = await products(adminApi, uid);
    const plan = await arrangeApprovedPlan(adminApi, { uid, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 10, wh: 'K002' });
    await adminApi.post(`/api/production/boms/${plan.bomId}/deactivate`);
    await login(page, env);
    const plans = new ProductionPlansPage(page);
    await plans.goto();
    await plans.open(`KH E2E ${uid}`);
    await plans.openCreateOrder(plan.planCode);
    await plans.qty(fg.code).fill('5');
    const deadline = page.locator('xpath=//label[normalize-space()="Hạn hoàn thành"]/following::input[1]');
    if (!(await deadline.inputValue())) await deadline.fill(tomorrow());
    const res = await plans.submit();
    const msg = page.getByText(/chưa có (định mức|BOM) đang áp dụng/).first();
    await expect(msg).toBeVisible();
    const shown = (await msg.innerText()).trim();
    testInfo.annotations.push({ type: 'observed', description: `HTTP ${res?.status() ?? '(không gửi)'}; thông báo "${shown}"` });
    expect.soft(shown, 'câu thông báo').toBe(expected);
    expect(await productionOrdersOfPlan(db, plan.planId)).toEqual([]);
  });

  test('SYS-MPR-06 – SL kế hoạch 0, hạn đã qua, hủy lệnh đã xuất NVL bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MPR-06', SHEET);
    const msgCancel = 'Chỉ huỷ được lệnh sản xuất chưa xuất nguyên vật liệu.';
    const { fg, rm } = await products(adminApi, uid);
    const plan = await arrangeApprovedPlan(adminApi, { uid: `${uid}p`, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 10, wh: 'K002' });
    const o = await arrangeProductionOrder(adminApi, { uid: `${uid}o`, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 5, wh: 'K002' });
    await issueMaterial(adminApi, o.orderId, 'K002', 4);
    await login(page, env);
    const plans = new ProductionPlansPage(page);
    await plans.goto();
    await plans.open(`KH E2E ${uid}p`);
    await plans.openCreateOrder(plan.planCode);
    await test.step('1a. SL kế hoạch 0 → bị từ chối', async () => {
      await plans.qty(fg.code).fill('0');
      const res = await plans.submit(4_000);
      const shown = (await page.getByText(/không hợp lệ|lớn hơn 0|phải > 0/).first().innerText().catch(() => '')).trim();
      testInfo.annotations.push({ type: 'observed', description: `SL 0: HTTP ${res?.status() ?? '(không gửi)'}; "${shown}"` });
      expect(res === null || res.status() >= 400, 'không lập được lệnh với SL 0').toBe(true);
      expect(await productionOrdersOfPlan(db, plan.planId)).toEqual([]);
    });
    await test.step('Quan sát: hạn hoàn thành đã qua (Note: record actual behaviour)', async () => {
      await plans.qty(fg.code).fill('3');
      const deadline = page.locator('xpath=//label[normalize-space()="Hạn hoàn thành"]/following::input[1]');
      await deadline.fill(new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10));
      const res = await plans.submit(4_000);
      testInfo.annotations.push({ type: 'observed', description: `Hạn đã qua: HTTP ${res?.status() ?? '(không gửi – frontend chặn)'}; lệnh của kế hoạch: ${JSON.stringify(await productionOrdersOfPlan(db, plan.planId))}` });
    });
    await test.step(`1b. Hủy lệnh đã xuất NVL → "${msgCancel}"`, async () => {
      const prod = new ProductionOrdersPage(page);
      await prod.goto(`?code=${o.orderCode}&id=${o.orderId}`);
      await expect(prod.detail()).toBeVisible();
      const btn = await prod.detail().getByRole('button', { name: 'Hủy lệnh' }).count();
      testInfo.annotations.push({ type: 'observed', description: `Lệnh ${o.orderCode} (Đang sản xuất): nút Hủy lệnh ${btn ? 'có' : 'ẩn'}` });
      if (!btn) {
        const be = await backendError(() => adminApi.post(`/api/production/orders/${o.orderId}/cancel`));
        uiBlocksAction(testInfo, 'nút "Hủy lệnh" chỉ hiện với lệnh Chưa bắt đầu', msgCancel, be);
      }
      expect((await productionOrderRow(db, o.orderId))?.status).toBe('IN_PROGRESS');
    });
  });

  test('SYS-MPR-07 – Hiện nhu cầu, đã xuất, còn thiếu và từng phiếu xuất kể cả xuất bổ sung có lý do', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MPR-07', SHEET);
    const { fg, rm } = await products(adminApi, uid);
    const o = await arrangeProductionOrder(adminApi, { uid, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 10, wh: 'K002' });
    await issueMaterial(adminApi, o.orderId, 'K002', 20);
    const reason = `Hao hụt rách màng ${uid}`;
    await issueMaterial(adminApi, o.orderId, 'K002', 2, { supplementary: true, reason });
    const issues = await issuesOfOrder(db, o.orderId);
    await login(page, env);
    const prod = new ProductionOrdersPage(page);
    await prod.goto(`?code=${o.orderCode}&id=${o.orderId}`);
    const cells = await prod.materialCells(rm.code);
    testInfo.annotations.push({ type: 'observed', description: `Dòng NVL: ${JSON.stringify(cells)}` });
    expect([cells['Nhu cầu'], cells['Đã xuất'], cells['Còn thiếu']]).toEqual(['20', '22', '0']);
    await prod.detail().getByRole('button', { name: 'Phiếu xuất NVL (2)' }).click();
    for (const i of issues) await expect(prod.detail().getByText(i.issue_code).first()).toBeVisible();
    await expect(prod.detail().getByText(reason)).toBeVisible();
  });

  test('SYS-MPR-08 – Hiện phiếu nhập thành phẩm, SL lỗi và ghi chú cảnh báo định mức', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MPR-08', SHEET);
    const { fg, rm } = await products(adminApi, uid);
    const o = await arrangeProductionOrder(adminApi, { uid, fgId: fg.productId, materials: [{ id: rm.productId, norm: 2 }], qty: 10, wh: 'K002' });
    await issueMaterial(adminApi, o.orderId, 'K002', 20);
    await approveCompletion(adminApi, o.orderId, 'K002', 3, { defect: 1, defectReason: 'Lỗi sơn' });
    // Phiếu thứ 2 dùng NVL vượt số đã xuất (4 + 8 > 10 thành phẩm làm được) kèm ghi chú cảnh báo – dựng qua API (UI chặn, xem FGR-03)
    const warn = await backendError(() => approveCompletion(adminApi, o.orderId, 'K002', 8, { confirmExceed: true }));
    const receipts = await fgReceiptsOfOrder(db, o.orderId);
    testInfo.annotations.push({ type: 'observed', description: `Dựng phiếu cảnh báo: "${warn}"; phiếu nhập: ${JSON.stringify(receipts)}` });
    await login(page, env);
    const prod = new ProductionOrdersPage(page);
    await prod.goto(`?code=${o.orderCode}&id=${o.orderId}`);
    const tab = prod.detail().getByRole('button', { name: /^Nhập thành phẩm \(\d+\)$/ });
    await tab.click();
    const text = (await prod.detail().innerText()).replace(/\s+/g, ' ');
    testInfo.annotations.push({ type: 'observed', description: `Tab Nhập thành phẩm: ${text.slice(0, 500)}` });
    for (const r of receipts) await expect(prod.detail().getByText(r.fgr_code).first()).toBeVisible();
    await expect(prod.detail().getByRole('columnheader', { name: 'SL lỗi' })).toBeVisible();
    await expect(prod.detail().getByText('Lỗi sơn').first()).toBeVisible();
    const flagged = receipts.filter((r) => r.needs_review);
    expect.soft(flagged.length, 'có phiếu nhập gắn cờ cảnh báo định mức để kiểm hiển thị').toBeGreaterThan(0);
    for (const r of flagged) await expect.soft(prod.detail().getByText(r.review_note ?? '(trống)').first()).toBeVisible();
  });
});
