// Report 5.3 – sheet "UC-31 Goods Receipt" (SYS-GRN-01..12). Actor "Warehouse Accountant" = whstaff01 (K001 + K002).
// Nhập hàng theo phiếu đặt: dòng phiếu đặt → "Nhập hàng" → /purchases/create?po=<id> (nạp phần chưa nhập) → Hoàn thành.
// GRN-09, GRN-12 là N/A theo Note.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { PoListPage, PurchaseReturnFormPage, ReceiptFormPage, ReceiptListPage } from '../../pages/PurchasingPages';
import { E2E_ACCOUNTS, SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct, type ProductDto } from '../../fixtures/data';
import { cancelPoViaApi, createPo, receivePoViaApi, suppliers, type SupplierRef } from '../../fixtures/purchasing';
import { poRow, purchaseReturnsOfGr, receiptByCode, receiptItems, receiptsOfPo, stockQty, supplierPayable, warehouseUnitCost } from '../../fixtures/dbq';
import { backendError, captureTexts, uiBlocksAction } from '../../fixtures/ui';
import type { Page } from '@playwright/test';

const SHEET = 'UC-31 Goods Receipt';
const USER = SEEDED.warehouse.username;
const priceOf = (uid: string, base: number): number => base + (Number(uid.replace(/\D/g, '').slice(-3)) % 500) * 10;
const round3 = (v: number): number => Math.round(v * 1000) / 1000;

interface Ctx {
  p: ProductDto;
  s: SupplierRef;
  price: number;
  po: { id: number; code: string };
}

/** Tiền đề: hàng mới, phiếu đặt ORDERED tại K001 (qty) */
async function arrange(adminApi: ApiSession, uid: string, base: number, qty: number): Promise<Ctx> {
  const price = priceOf(uid, base);
  const p = await createProduct(adminApi, { suffix: uid, price: price + 15_000 });
  const [s] = await suppliers(adminApi);
  const po = await createPo(adminApi, { wh: 'K001', partnerId: s.id, status: 'ORDERED', lines: [{ productId: p.productId, qty, price }] });
  return { p, s, price, po };
}

/** Danh sách đặt hàng nhập → mở phiếu → "Nhập hàng" → form nhập hàng điền sẵn theo phiếu đặt */
async function openReceive(page: Page, poCode: string, poId: number): Promise<ReceiptFormPage> {
  const list = new PoListPage(page);
  await list.goto();
  const panel = await list.open(poCode);
  await panel.getByRole('button', { name: 'Nhập hàng', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/purchases/create\\?po=${poId}$`));
  return new ReceiptFormPage(page);
}

test.describe(SHEET, () => {
  test('SYS-GRN-01 – Nhập đủ: phiếu hoàn thành, cộng tồn, tính lại giá vốn, tăng công nợ NCC, phiếu đặt hoàn thành @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-01', SHEET);
    const { p, s, price, po } = await arrange(adminApi, uid, 44_000, 10);
    await addStock(adminApi, p.productId, 'K001', 10);
    const q0 = await stockQty(db, p.productId, 'K001');
    const c0 = await warehouseUnitCost(db, p.productId, 'K001');
    const payable0 = await supplierPayable(db, s.id);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    let grCode = '';
    await test.step('1. Mở phiếu ORDERED → Nhập hàng → nhận đủ 10 → Hoàn thành', async () => {
      const form = await openReceive(page, po.code, po.id);
      await expect(form.received(p.code)).toHaveValue('10');
      await form.openComplete();
      const res = await form.confirmComplete();
      expect(res.status(), await res.text()).toBeLessThan(300);
      grCode = ((await res.json()) as { grCode: string }).grCode;
      await expect(page.getByText(`Nhập hàng thành công! Mã phiếu: ${grCode}. Tồn kho đã cập nhật.`)).toBeVisible();
    });
    await test.step('2. Kiểm tồn, giá vốn, công nợ NCC, trạng thái phiếu đặt', async () => {
      expect((await receiptByCode(db, grCode))?.status).toBe('COMPLETED');
      expect(await stockQty(db, p.productId, 'K001')).toBe(q0 + 10);
      const expectedMac = round3((q0 * c0 + 10 * price) / (q0 + 10));
      const mac = await warehouseUnitCost(db, p.productId, 'K001');
      testInfo.annotations.push({ type: 'observed', description: `Giá vốn K001: trước ${c0} (tồn ${q0}), nhập 10 × ${price} → ${mac} (công thức MAC ${expectedMac})` });
      expect(Math.abs(mac - expectedMac)).toBeLessThanOrEqual(0.01);
      expect(await supplierPayable(db, s.id)).toBe(payable0 + 10 * price);
      expect((await poRow(db, po.id))?.status).toBe('COMPLETED');
    });
  });

  test('SYS-GRN-02 – Nhập một phần: phiếu đặt PARTIAL, lần nhập sau đề xuất phần còn lại', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-02', SHEET);
    const { p, po } = await arrange(adminApi, uid, 45_000, 10);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    await test.step('1. Nhận 6 / 10', async () => {
      const form = await openReceive(page, po.code, po.id);
      await form.setReceived(p.code, 6);
      await form.openComplete();
      const res = await form.confirmComplete();
      expect(res.status(), await res.text()).toBeLessThan(300);
      expect((await poRow(db, po.id))?.status).toBe('PARTIAL');
    });
    await test.step('2. Mở Nhập hàng lần nữa → đề xuất 4', async () => {
      const form = await openReceive(page, po.code, po.id);
      await expect(form.received(p.code)).toHaveValue('4');
    });
  });

  test('SYS-GRN-03 – Hàng theo lô: nhập số lô, hạn dùng, vị trí', async ({}, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-03', SHEET);
    // Quyết định Round 2 (27/11/2026): chưa có quản lý hàng theo lô / hạn dùng / vị trí lưu kho → N/A
    test.skip(true, 'N/A – Chưa có chức năng quản lý hàng theo lô / hạn dùng / vị trí lưu kho (Not implemented)');
  });

  test('SYS-GRN-04 – Hủy trước khi xác nhận: không lưu gì, tồn không đổi', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-04', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Form nhập hàng không có nút "Hủy" riêng; bấm "Hủy bỏ" ở hộp xác nhận hoàn thành rồi quay lại danh sách' });
    const { p, po } = await arrange(adminApi, uid, 47_000, 8);
    const before = await stockQty(db, p.productId, 'K001');
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = await openReceive(page, po.code, po.id);
    await form.setReceived(p.code, 5);
    await form.openComplete();
    await page.getByRole('button', { name: 'Hủy bỏ', exact: true }).click();
    await expect(page.getByText('Xác nhận hoàn thành nhập kho')).toHaveCount(0);
    // Link quay lại (tiêu đề "Quay lại danh sách phiếu nhập", đích /purchase-orders khi nhập theo phiếu đặt)
    await page.getByRole('link', { name: /^Quay lại danh sách/ }).click();
    await expect(page).toHaveURL(/\/purchase-orders/);
    await expect(page.getByRole('heading', { name: 'Đặt hàng nhập', level: 1 })).toBeVisible();
    expect(await receiptsOfPo(db, po.id)).toEqual([]);
    expect(await stockQty(db, p.productId, 'K001')).toBe(before);
    expect((await poRow(db, po.id))?.status).toBe('ORDERED');
  });

  test('SYS-GRN-05 – Không nhập được phiếu đặt DRAFT, COMPLETED, CANCELLED', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-05', SHEET);
    const price = priceOf(uid, 48_000);
    const p = await createProduct(adminApi, { suffix: uid, price: price + 15_000 });
    const [s] = await suppliers(adminApi);
    const line = { productId: p.productId, qty: 2, price };
    const draft = await createPo(adminApi, { wh: 'K001', partnerId: s.id, status: 'DRAFT', lines: [line] });
    const done = await createPo(adminApi, { wh: 'K001', partnerId: s.id, status: 'ORDERED', lines: [line] });
    await receivePoViaApi(adminApi, { poId: done.id, wh: 'K001', partnerId: s.id, lines: [line] });
    const cancelled = await createPo(adminApi, { wh: 'K001', partnerId: s.id, status: 'ORDERED', lines: [line] });
    await cancelPoViaApi(adminApi, cancelled.id);
    expect([(await poRow(db, draft.id))?.status, (await poRow(db, done.id))?.status, (await poRow(db, cancelled.id))?.status]).toEqual(['DRAFT', 'COMPLETED', 'CANCELLED']);
    const read = await captureTexts(page);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const whApi = await ApiSession.login(env, USER, env.defaultPassword);
    try {
      for (const po of [draft, done, cancelled]) {
        await test.step(`Phiếu ${po.code} (${(await poRow(db, po.id))?.status})`, async () => {
          const expected = `Phiếu đặt hàng nhập ${po.code} không ở trạng thái chờ nhập hàng.`;
          const list = new PoListPage(page);
          await list.goto();
          await list.onlyStatuses(['Phiếu tạm', 'Đã đặt hàng', 'Nhập một phần', 'Hoàn thành', 'Đã hủy']);
          const panel = await list.open(po.code);
          const btn = await panel.getByRole('button', { name: 'Nhập hàng', exact: true }).count();
          // Người dùng mở form nhập theo phiếu đặt bằng đường dẫn (vd link cũ)
          await page.goto(`/purchases/create?po=${po.id}`);
          await expect(page).toHaveURL(/\/purchase-orders$/);
          const seen = await read(/trạng thái chờ nhập hàng/);
          const be = await backendError(() =>
            whApi.post('/api/purchases', {
              warehouseId: WAREHOUSES.K001.id, partnerId: s.id, purchaseOrderId: po.id, status: 'COMPLETED', paidAmount: 0, paymentMethod: 'CASH',
              items: [{ productId: p.productId, quantity: 1, unitPrice: price, defectQuantity: 0 }],
            })
          );
          testInfo.annotations.push({ type: 'observed', description: `${po.code}: nút Nhập hàng ${btn ? 'có' : 'ẩn'}; mở ?po= → "${seen.join(' | ')}"; backend: "${be}"` });
          expect.soft(seen, `thông báo "${expected}"`).toContain(expected);
        });
      }
    } finally {
      await whApi.dispose();
    }
    for (const po of [draft, cancelled]) expect(await receiptsOfPo(db, po.id)).toEqual([]);
    expect((await receiptsOfPo(db, done.id)).length).toBe(1);
  });

  test('SYS-GRN-06 – Nhập vượt số lượng đặt: bị từ chối hoặc cảnh báo', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-06', SHEET);
    const { p, po } = await arrange(adminApi, uid, 49_000, 10);
    const before = await stockQty(db, p.productId, 'K001');
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = await openReceive(page, po.code, po.id);
    await form.setReceived(p.code, 12);
    const title = await form.openComplete();
    await test.step('KQ. Cảnh báo nhập vượt', async () => {
      await expect(title).toHaveText('Nhập vượt số lượng phiếu đặt');
      await expect(page.getByText(`${p.code}: nhận 12, phiếu đặt còn 10 (vượt 2)`)).toBeVisible();
    });
    await test.step('Ghi nhận hành vi khi vẫn đồng ý (Note: Record actual behaviour)', async () => {
      const res = await form.confirmComplete();
      const after = await stockQty(db, p.productId, 'K001');
      testInfo.annotations.push({
        type: 'observed',
        description: `Đồng ý sau cảnh báo → HTTP ${res.status()}; tồn ${before} → ${after}; phiếu đặt ${(await poRow(db, po.id))?.status}`,
      });
    });
  });

  test('SYS-GRN-07 – Số lượng âm bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-07', SHEET);
    const { p, s, price, po } = await arrange(adminApi, uid, 50_000, 6);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = await openReceive(page, po.code, po.id);
    const input = form.received(p.code);
    await input.click();
    await input.fill('-5');
    await input.press('Tab');
    const shown = await input.inputValue();
    testInfo.annotations.push({ type: 'observed', description: `Nhập SL nhận -5 → ô hiện "${shown}"` });
    if (!shown.startsWith('-')) {
      const whApi = await ApiSession.login(env, USER, env.defaultPassword);
      const viaPo = await backendError(() => whApi.post(`/api/purchase-orders/${po.id}/receive`, { paidAmount: 0, paymentMethod: 'CASH', lines: [{ productId: p.productId, quantity: -5, defectQuantity: 0 }] }));
      const viaForm = await backendError(() =>
        whApi.post('/api/purchases', {
          warehouseId: WAREHOUSES.K001.id, partnerId: s.id, purchaseOrderId: po.id, status: 'COMPLETED', paidAmount: 0, paymentMethod: 'CASH',
          items: [{ productId: p.productId, quantity: -5, unitPrice: price, defectQuantity: 0 }],
        })
      );
      await whApi.dispose();
      uiBlocksAction(testInfo, `ô SL nhận chỉ nhận chữ số (nhập -5 → "${shown}")`, 'Số lượng đạt / lỗi không được âm.', `${viaPo} (POST /purchase-orders/{id}/receive); ${viaForm} (POST /purchases – API form dùng)`);
    }
    expect(await receiptsOfPo(db, po.id)).toEqual([]);
  });

  test('SYS-GRN-08 – Người dùng không có quyền kho nhận không xác nhận được phiếu nhập', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-08', SHEET);
    const expected = 'Bạn không có quyền nhập hàng vào kho của phiếu đặt này.';
    const { p, po } = await arrange(adminApi, uid, 51_000, 5);
    const user = E2E_ACCOUNTS.whK002;
    const read = await captureTexts(page);
    await new LoginPage(page).loginOk(user.username, env.defaultPassword);
    const list = new PoListPage(page);
    await list.goto();
    await list.search.fill(po.code);
    const visible = await list.row(po.code).count();
    await page.goto(`/purchases/create?po=${po.id}`);
    await expect(page.getByPlaceholder(/^Tìm hàng hóa theo mã hoặc tên/)).toBeVisible();
    await page.waitForLoadState('networkidle');
    const seen = (await read(/quyền|không tải được|không tìm thấy/i)).filter((t) => !/^Đang kiểm tra quyền/.test(t));
    const loaded = await new ReceiptFormPage(page).line(p.code).count();
    testInfo.annotations.push({ type: 'observed', description: `${user.username} (chỉ K002): phiếu K001 trong danh sách: ${visible}; mở ?po= → dòng hàng ${loaded}, thông báo "${seen.join(' | ')}"` });
    if (!seen.some((t) => t.includes(expected))) {
      const k2 = await ApiSession.login(env, user.username, env.defaultPassword);
      const be = await backendError(() => k2.post(`/api/purchase-orders/${po.id}/receive`, { paidAmount: 0, paymentMethod: 'CASH', lines: [{ productId: p.productId, quantity: 5, defectQuantity: 0 }] }));
      await k2.dispose();
      uiBlocksAction(testInfo, 'phiếu đặt của kho K001 không hiện / không nạp được cho người chỉ có K002', expected, be);
    }
    expect(await receiptsOfPo(db, po.id)).toEqual([]);
  });

  test('SYS-GRN-09 – Hàng đang kiểm kho: không xác nhận được phiếu nhập (BR-42)', async ({}, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-09', SHEET);
    test.skip(true, 'N/A – Khoá kiểm kho chưa áp dụng cho phiếu nhập (Note: c60ea62)');
  });

  test('SYS-GRN-10 – SL lỗi ghi riêng, chỉ SL đạt vào tồn', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-10', SHEET);
    const { p, s, price, po } = await arrange(adminApi, uid, 52_000, 65);
    const before = await stockQty(db, p.productId, 'K001');
    const payable0 = await supplierPayable(db, s.id);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = await openReceive(page, po.code, po.id);
    let grCode = '';
    await test.step('1. Nhận 65, lỗi 5 (đạt 60), ghi lý do ở ghi chú dòng', async () => {
      await form.setReceived(p.code, 65);
      await form.setDefect(p.code, 5);
      await expect(form.line(p.code)).toContainText('Đạt: 60');
      await form.line(p.code).getByPlaceholder('Ghi chú...').fill(`5 cái vỡ khi vận chuyển ${uid}`);
      await form.openComplete();
      const res = await form.confirmComplete();
      expect(res.status(), await res.text()).toBeLessThan(300);
      grCode = ((await res.json()) as { grCode: string }).grCode;
    });
    await test.step('KQ. SL lỗi ghi riêng; chỉ 60 vào tồn', async () => {
      const gr = await receiptByCode(db, grCode);
      const items = await receiptItems(db, gr?.gr_id ?? -1);
      testInfo.annotations.push({ type: 'observed', description: `Dòng phiếu nhập: ${JSON.stringify(items)}` });
      expect(items).toHaveLength(1);
      expect(Number(items[0].accepted_qty)).toBe(60);
      expect(Number(items[0].defective_qty ?? 0) + Number(items[0].damaged_qty ?? 0)).toBe(5);
      expect(await stockQty(db, p.productId, 'K001')).toBe(before + 60);
      expect(await supplierPayable(db, s.id)).toBe(payable0 + 60 * price);
    });
  });

  test('SYS-GRN-11 – Trả hàng cho NCC sau khi nhập: giảm tồn và công nợ phải trả', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-11', SHEET, { mismatch: 'Description: đánh dấu "Trả NCC" ngay trên phiếu nhập; code: phiếu trả hàng nhập riêng sau khi nhập.' });
    const { p, s, price, po } = await arrange(adminApi, uid, 53_000, 10);
    const gr = await receivePoViaApi(adminApi, { poId: po.id, wh: 'K001', partnerId: s.id, lines: [{ productId: p.productId, qty: 10, price }] });
    const stock0 = await stockQty(db, p.productId, 'K001');
    const payable0 = await supplierPayable(db, s.id);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const receipts = new ReceiptListPage(page);
    await receipts.goto();
    await receipts.open(gr.code);
    await page.getByRole('button', { name: 'Trả hàng nhập', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/purchase-returns/create\\?grId=${gr.id}$`));
    const ret = new PurchaseReturnFormPage(page);
    await expect(ret.line(p.code)).toBeVisible();
    await ret.setQty(p.code, 3);
    const res = await ret.complete();
    expect(res.status(), await res.text()).toBeLessThan(300);
    const code = ((await res.json()) as { returnCode: string }).returnCode;
    await expect(page.getByText(`Trả hàng thành công! Mã phiếu: ${code}. Tồn kho và công nợ đã cập nhật.`)).toBeVisible();
    expect((await purchaseReturnsOfGr(db, gr.id)).map((r) => r.status)).toEqual(['COMPLETED']);
    expect(await stockQty(db, p.productId, 'K001')).toBe(stock0 - 3);
    expect(await supplierPayable(db, s.id)).toBe(payable0 - 3 * price);
  });

  test('SYS-GRN-12 – Từ chối cả lô giao hàng kèm lý do', async ({}, testInfo) => {
    traceTc(testInfo, 'SYS-GRN-12', SHEET);
    test.skip(true, 'N/A – Chưa có chức năng (Note: Not implemented)');
  });
});
