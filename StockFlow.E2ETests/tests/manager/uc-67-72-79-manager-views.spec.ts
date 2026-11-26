// Report 5.3 – sheet "UC-67 Purchasing and Receiving" (SYS-MPU-01..06), "UC-72 Manage Inventory" (SYS-MIN-01..14),
// "UC-79 Manage Returns" (SYS-MRT-01..05). Actor Manager = manager01. Code không có màn tổng quan riêng: các ca còn lại xem trên
// màn nghiệp vụ (Đặt hàng nhập, Nhà cung cấp, Chuyển hàng, Trả hàng). Ca N/A lấy lý do từ Note.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { PoListPage } from '../../pages/PurchasingPages';
import { SuppliersPage } from '../../pages/MasterDataPages';
import { TransferListPage } from '../../pages/TransferPages';
import { SEEDED } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct } from '../../fixtures/data';
import { createPo, receivePoViaApi, suppliers } from '../../fixtures/purchasing';
import { inTransitTransfer, receiveTransferViaApi, draftTransfer } from '../../fixtures/inventory';
import { transferDatePlusMinutes } from '../../fixtures/dbq';
import { vouchersOf } from '../../fixtures/dbq3';
import { createCustomer, createInvoice, createSalesReturn, setCreditLimit } from '../../fixtures/sales';
import type { Page, TestInfo } from '@playwright/test';
import { findReportRow, openReportTab, openReports } from '../../fixtures/reports';
import type { E2EEnv } from '../../fixtures/env';

const USER = SEEDED.manager.username;
const priceOf = (uid: string, base: number): number => base + (Number(uid.replace(/\D/g, '').slice(-3)) % 900) * 10;

function na(sheet: string, tc: string, title: string, reason: string): void {
  test(`${tc} – ${title}`, async ({}, testInfo: TestInfo) => {
    traceTc(testInfo, tc, sheet);
    test.skip(true, `N/A – ${reason}`);
  });
}

async function login(page: Page, env: { defaultPassword: string }): Promise<void> {
  await new LoginPage(page).loginOk(USER, env.defaultPassword);
}

test.describe('UC-67 Purchasing and Receiving', () => {
  const SHEET = 'UC-67 Purchasing and Receiving';
  na(SHEET, 'SYS-MPU-01', 'Tổng quan Mua hàng & Nhận hàng', 'Chưa có màn tổng quan (Note)');
  na(SHEET, 'SYS-MPU-02', 'Báo lỗi khi không lấy được dữ liệu tổng quan', 'Chưa có màn tổng quan (Note)');

  test('SYS-MPU-03 – SL đặt, đã nhận, còn lại và các phiếu nhập của phiếu đặt', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MPU-03', SHEET, { mismatch: 'Code: xem trên màn Đặt hàng nhập.' });
    const price = priceOf(uid, 41_000);
    const p = await createProduct(adminApi, { suffix: uid, price: price + 10_000 });
    const [s] = await suppliers(adminApi);
    const po = await createPo(adminApi, { wh: 'K001', partnerId: s.id, status: 'ORDERED', lines: [{ productId: p.productId, qty: 10, price }] });
    const gr = await receivePoViaApi(adminApi, { poId: po.id, wh: 'K001', partnerId: s.id, lines: [{ productId: p.productId, qty: 4, price }] });
    await login(page, env);
    const list = new PoListPage(page);
    await list.goto();
    const panel = await list.open(po.code);
    await expect(panel).toContainText('4 / 10');
    const item = panel.getByRole('row').filter({ has: page.getByRole('cell', { name: p.code, exact: true }) });
    const cells = (await item.getByRole('cell').allInnerTexts()).map((x) => x.trim());
    testInfo.annotations.push({ type: 'observed', description: `Dòng hàng: ${cells.join(' | ')}` });
    expect([cells[2], cells[3]]).toEqual(['10', '4']);
    expect(cells).toContain('-6');
    await panel.getByRole('button', { name: 'Lịch sử nhập hàng (1)' }).click();
    // Tab lịch sử thay nội dung dòng mở rộng (không còn nút Đóng) → tìm trên trang
    await expect(page.getByRole('cell', { name: gr.code }).first()).toBeVisible();
  });

  na(SHEET, 'SYS-MPU-04', 'SL lỗi, thiếu, trả NCC và giao hàng bị từ chối', 'Chưa có màn theo dõi (Note)');
  na(SHEET, 'SYS-MPU-05', 'Chi phí nhập và giá vốn trước / sau phân bổ', 'Chưa có chức năng (Note)');

  test('SYS-MPU-06 – Công nợ phải trả từng NCC và các phiếu chi', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MPU-06', SHEET, { mismatch: 'Code: xem trên màn Nhà cung cấp.' });
    const price = priceOf(uid, 42_000);
    const p = await createProduct(adminApi, { suffix: uid, price: price + 10_000 });
    const all = await suppliers(adminApi);
    const s = all[all.length - 1];
    await adminApi.post('/api/purchases', {
      warehouseId: 3, partnerId: s.id, status: 'COMPLETED', paidAmount: 0, paymentMethod: 'CASH',
      items: [{ productId: p.productId, quantity: 3, unitPrice: price, defectQuantity: 0 }],
    });
    await adminApi.post(`/api/Suppliers/${s.id}/payments`, { amount: price, paymentMethod: 'CASH', notes: `E2E ${uid}` });
    const vouchers = await vouchersOf(db, s.id);
    const pc = vouchers.filter((v) => /^PC/.test(v.tx_code ?? '')).pop();
    testInfo.annotations.push({ type: 'observed', description: `Phiếu chi của NCC (mới nhất): ${JSON.stringify(pc)}` });
    await login(page, env);
    const sp = new SuppliersPage(page);
    await sp.goto();
    await sp.expand(s.code);
    await page.getByRole('button', { name: 'Nợ cần trả nhà cung cấp' }).click();
    await expect(page.getByText(/Nợ (cần trả|hiện tại)/).first()).toBeVisible();
    if (pc?.tx_code) await expect(page.getByText(pc.tx_code).first()).toBeVisible();
    else expect.soft(pc, 'có phiếu chi của NCC để kiểm hiển thị').toBeTruthy();
  });
});

test.describe('UC-72 Manage Inventory', () => {
  const SHEET = 'UC-72 Manage Inventory';
  // Round 2 (27/11/2026): màn Báo cáo (/reports) đã có trên dev – Tổng quan tồn kho, Nhập – xuất – tồn theo kho, Hàng dưới định mức
  test('SYS-MIN-01 – Tổng quan Tồn kho', async ({ page, env }, testInfo) => {
    traceTc(testInfo, 'SYS-MIN-01', SHEET);
    await openReports(page, USER, env.defaultPassword);
    await expect(page.getByText('Giá trị tồn kho', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Hàng dưới định mức', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Việc chờ xử lý', { exact: true })).toBeVisible();
    await expect(page.getByText('Phiếu chuyển đang về kho', { exact: true })).toBeVisible();
  });

  test('SYS-MIN-02 – Bảng tồn, giá vốn, giá trị theo kho', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MIN-02', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: priceOf(uid, 61_000) });
    await addStock(adminApi, p.productId, 'K001', 12);
    await addStock(adminApi, p.productId, 'K002', 5);
    await openReports(page, USER, env.defaultPassword);
    await openReportTab(page, 'Nhập – xuất – tồn');
    await expect(page.getByRole('columnheader', { name: 'Kho' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Tồn cuối kỳ' }).first()).toBeVisible();
    const mgr = await ApiSession.login(env, USER, env.defaultPassword);
    type Row = { productId: number; warehouseCode: string; closingQuantity: number; closingValue: number };
    const k1 = await findReportRow<Row>(mgr, 'stock-movement', {}, (x) => x.productId === p.productId && x.warehouseCode === 'K001');
    const k2 = await findReportRow<Row>(mgr, 'stock-movement', {}, (x) => x.productId === p.productId && x.warehouseCode === 'K002');
    const onlyK2 = await findReportRow<Row>(mgr, 'stock-movement', { warehouseId: 4 }, (x) => x.productId === p.productId && x.warehouseCode === 'K001');
    await mgr.dispose();
    testInfo.annotations.push({ type: 'observed', description: `K001: ${JSON.stringify(k1)}; K002: ${JSON.stringify(k2)}` });
    expect([k1?.closingQuantity, k2?.closingQuantity]).toEqual([12, 5]);
    // Giá vốn bình quân = giá trị / số lượng; lọc theo kho K002 thì không có dòng K001
    expect(k1?.closingValue ?? 0).toBeGreaterThan(0);
    expect(onlyK2, 'lọc theo kho K002').toBeUndefined();
  });

  test('SYS-MIN-03 – Phiếu chuyển theo trạng thái, phiếu nhận thiếu hiện ghi chú chênh lệch', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MIN-03', SHEET, { mismatch: 'Code: xem trên màn Chuyển hàng.' });
    const p = await createProduct(adminApi, { suffix: uid, price: 88_000 });
    await addStock(adminApi, p.productId, 'K001', 50);
    const moved = await inTransitTransfer(adminApi, 'K001', 'K002', p.productId, 30);
    const note = `Thiếu 5 do vỡ ${uid}`;
    await receiveTransferViaApi(adminApi, moved.id, (await transferDatePlusMinutes(db, moved.id, 1)) + ':00', 25, note);
    const draft = await draftTransfer(adminApi, 'K001', 'K002', p.productId, 2);
    await login(page, env);
    const list = new TransferListPage(page);
    await list.goto();
    // Bộ lọc trạng thái dạng thẻ (chip): bỏ hết, chỉ giữ "Đã nhận"
    const side = page.getByRole('complementary');
    const all = side.locator('xpath=.//*[normalize-space(text())="Trạng thái"]/following::*[@title="Bỏ chọn Tất cả"][1]');
    if (await all.count()) await all.click();
    for (const l of ['Phiếu tạm', 'Đang chuyển', 'Đã hủy']) {
      const chip = side.locator('span').filter({ has: page.getByText(l, { exact: true }) }).filter({ has: page.getByRole('button') }).last();
      if (await chip.count()) await chip.getByRole('button').click();
    }
    await expect(list.row(moved.code).first()).toBeVisible();
    await expect(list.row(draft.code)).toHaveCount(0);
    await list.row(moved.code).first().click();
    // Phiếu đã nhận: ghi chú nhận hiện dạng chữ "Ghi chú nhận: …" và cột Chênh lệch
    await expect(page.getByText(`Ghi chú nhận: ${note}`).first()).toBeVisible();
    await expect(page.getByRole('cell', { name: '-5', exact: true }).first()).toBeVisible();
    await expect(list.row(moved.code).first()).toContainText('Đã nhận');
  });

  for (const [tc, title, reason] of [
    ['SYS-MIN-04', 'Duyệt phiếu kiểm: điều chỉnh tồn', 'Không áp dụng theo thiết kế – nhóm đã bỏ luồng duyệt kiểm kho: phiếu kiểm cân bằng kho trực tiếp khi Hoàn thành'],
    ['SYS-MIN-05', 'Từ chối phiếu kiểm: tồn không đổi', 'Không áp dụng theo thiết kế – nhóm đã bỏ luồng duyệt kiểm kho: phiếu kiểm cân bằng kho trực tiếp khi Hoàn thành'],
    ['SYS-MIN-06', 'Yêu cầu kiểm lại', 'Không áp dụng theo thiết kế – nhóm đã bỏ luồng duyệt kiểm kho: phiếu kiểm cân bằng kho trực tiếp khi Hoàn thành'],
    ['SYS-MIN-07', 'Từ chối / kiểm lại không ghi chú bị từ chối', 'Không áp dụng theo thiết kế – nhóm đã bỏ luồng duyệt kiểm kho: phiếu kiểm cân bằng kho trực tiếp khi Hoàn thành'],
    ['SYS-MIN-08', 'Phiếu kiểm đã xử lý: báo và không đổi', 'Không áp dụng theo thiết kế – nhóm đã bỏ luồng duyệt kiểm kho: phiếu kiểm cân bằng kho trực tiếp khi Hoàn thành'],
    ['SYS-MIN-09', 'Duyệt phiếu xuất hủy: trừ tồn', 'Chưa có chức năng (phiếu xuất hủy hoàn thành trực tiếp)'],
    ['SYS-MIN-10', 'Từ chối phiếu xuất hủy: tồn không đổi', 'Chưa có chức năng (Note)'],
    ['SYS-MIN-11', 'Từ chối xuất hủy không ghi chú bị từ chối', 'Chưa có chức năng (Note)'],
    ['SYS-MIN-12', 'Phiếu xuất hủy đã xử lý: báo và không đổi', 'Chưa có chức năng (Note)'],
    ['SYS-MIN-14', 'Cảnh báo lô sắp hết hạn / đã hết hạn', 'Chưa có chức năng (Note)'],
  ] as const) na(SHEET, tc, title, reason);

  test('SYS-MIN-13 – Cảnh báo hàng chạm điểm đặt hàng lại', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MIN-13', SHEET);
    // Điểm đặt hàng lại rất cao để hàng chắc chắn đứng đầu danh sách "Hàng dưới định mức" (tối đa 20 dòng, xếp theo mức thiếu)
    const p = await createProduct(adminApi, { suffix: uid, price: priceOf(uid, 62_000), extra: { reorderPoint: 999_999 } });
    await addStock(adminApi, p.productId, 'K001', 3);
    await openReports(page, USER, env.defaultPassword);
    const section = page.locator('div').filter({ has: page.getByText('Hàng dưới định mức', { exact: true }) }).filter({ has: page.getByRole('table') }).last();
    await expect(section.getByRole('row').filter({ hasText: p.code }).first()).toBeVisible();
  });
});

test.describe('UC-79 Manage Returns', () => {
  const SHEET = 'UC-79 Manage Returns';
  na(SHEET, 'SYS-MRT-01', 'Tổng quan Trả hàng', 'Chưa có màn tổng quan (Note)');
  na(SHEET, 'SYS-MRT-02', 'Báo lỗi khi không lấy được dữ liệu tổng quan', 'Chưa có màn tổng quan (Note)');

  async function returns(env: E2EEnv, adminApi: ApiSession, uid: string, base: number) {
    const price = priceOf(uid, base);
    const p = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, p.productId, 'K001', 20);
    const c = await createCustomer(adminApi, { suffix: uid });
    await setCreditLimit(adminApi, c.partnerId, 10_000_000);
    const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
    const inv = await createInvoice(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 3, price }], paid: 0, requestId: `mrt-${uid}` });
    const done = await createSalesReturn(sales, { invoiceId: inv.orderId, partnerId: c.partnerId, productId: p.productId, qty: 1, price });
    const toCancel = await createSalesReturn(sales, { invoiceId: inv.orderId, partnerId: c.partnerId, productId: p.productId, qty: 1, price });
    await sales.dispose();
    return { p, c, inv, price, done, toCancel };
  }

  test('SYS-MRT-03 – Phiếu trả theo trạng thái, kèm khách hàng và lý do', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MRT-03', SHEET, { mismatch: 'Code: xem trên màn Trả hàng.' });
    const { c, done, toCancel } = await returns(env, adminApi, uid, 71_000);
    const cancelCode = toCancel.returnCode ?? toCancel.orderCode;
    const doneCode = done.returnCode ?? done.orderCode;
    await adminApi.post(`/api/sales-returns/${toCancel.returnId ?? toCancel.orderId}/cancel`);
    await login(page, env);
    await page.goto('/sales-returns');
    await expect(page.getByRole('heading', { name: 'Trả hàng', level: 1 })).toBeVisible();
    await page.getByPlaceholder('Theo mã phiếu trả, mã hóa đơn, khách hàng').fill(c.name);
    const box = (l: string) => page.getByRole('checkbox', { name: l, exact: true });
    await box('Đã trả').uncheck();
    await box('Đã hủy').check();
    await expect(page.getByRole('row').filter({ hasText: cancelCode }).first()).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: doneCode })).toHaveCount(0);
    await box('Đã hủy').uncheck();
    await box('Đã trả').check();
    const row = page.getByRole('row').filter({ hasText: doneCode }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(c.name);
    await row.getByRole('cell', { name: doneCode, exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => Array.from(document.querySelectorAll('textarea, input')).some((e) => (e as HTMLInputElement).value.includes('E2E arrange')) || document.body.innerText.includes('E2E arrange')), { message: 'lý do / ghi chú phiếu trả' })
      .toBe(true);
  });

  na(SHEET, 'SYS-MRT-04', 'SL trả theo phân loại, hàng sửa chữa / chờ hủy', 'Chưa có chức năng (Note)');

  test('SYS-MRT-05 – Mỗi phiếu trả hiện phần giảm nợ và tiền trả khách', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MRT-05', SHEET, { mismatch: 'Code: không có trạng thái "Refund Due"; xem trên màn Trả hàng.' });
    const { c, done, price } = await returns(env, adminApi, uid, 72_000);
    const doneCode = done.returnCode ?? done.orderCode;
    await login(page, env);
    await page.goto('/sales-returns');
    await page.getByPlaceholder('Theo mã phiếu trả, mã hóa đơn, khách hàng').fill(doneCode);
    await page.getByRole('row').filter({ hasText: doneCode }).first().getByRole('cell', { name: doneCode, exact: true }).click();
    const text = (await page.getByRole('row').filter({ hasText: doneCode }).last().innerText()).replace(/\s+/g, ' ');
    const body = (await page.getByRole('main').last().innerText()).replace(/\s+/g, ' ');
    testInfo.annotations.push({ type: 'observed', description: `Chi tiết phiếu trả ${doneCode} (${c.name}): ${body.slice(body.indexOf(doneCode), body.indexOf(doneCode) + 400)}` });
    // Chi tiết phiếu: "Cần trả khách" / "Đã trả khách"; phần trừ vào công nợ là chú thích (title) trên ô Đã trả khách
    await expect(page.getByText('Cần trả khách', { exact: true }).filter({ visible: true }).last()).toBeVisible();
    await expect(page.getByText('Đã trả khách', { exact: true }).filter({ visible: true }).last()).toBeVisible();
    const debtNote = page.locator('[title*="trừ vào công nợ"]').first();
    const note = (await debtNote.getAttribute('title').catch(() => null)) ?? '';
    testInfo.annotations.push({ type: 'observed', description: `Chú thích phần trừ công nợ: "${note}"` });
    expect(note, 'phần giảm nợ của phiếu trả được hiện').toMatch(/trừ vào công nợ/);
    expect(text + body).toContain(price.toLocaleString('vi-VN'));
  });
});
