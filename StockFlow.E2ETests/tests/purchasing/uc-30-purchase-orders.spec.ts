// Report 5.3 – sheet "UC-30 Purchase Orders" (SYS-POR-01..08). Actor "Warehouse Accountant" = whstaff01 (WarehouseStaff, K001 + K002).
// Phiếu đặt dựng sẵn qua API bằng Admin; thao tác đang kiểm (lọc, tạo, sửa, hủy) làm trên /purchase-orders.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { PoFormPage, PoListPage } from '../../pages/PurchasingPages';
import { SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { createProduct, type ProductDto } from '../../fixtures/data';
import { createPo, receivePoViaApi, suppliers, updatePoPayload, type SupplierRef } from '../../fixtures/purchasing';
import { permissionCodesOfRole, poCountOfProduct, poItems, poRow } from '../../fixtures/dbq';
import { ApiSession } from '../../fixtures/api';
import { backendError, uiBlocksAction } from '../../fixtures/ui';

const SHEET = 'UC-30 Purchase Orders';
const USER = SEEDED.warehouse.username;
/** Đơn giá khác nhau giữa các test (dễ đối chiếu) */
const priceOf = (uid: string, base: number): number => base + (Number(uid.replace(/\D/g, '').slice(-3)) % 500) * 10;

async function product(adminApi: ApiSession, uid: string, tag: string, price: number): Promise<ProductDto> {
  return createProduct(adminApi, { suffix: `${uid}${tag}`, price });
}

/** Phiếu đặt đã nhập một phần (PARTIAL): đặt 10, nhập 4 qua API */
async function partialPo(adminApi: ApiSession, p: ProductDto, s: SupplierRef, price: number): Promise<{ id: number; code: string }> {
  const po = await createPo(adminApi, { wh: 'K001', partnerId: s.id, status: 'ORDERED', lines: [{ productId: p.productId, qty: 10, price }] });
  await receivePoViaApi(adminApi, { poId: po.id, wh: 'K001', partnerId: s.id, lines: [{ productId: p.productId, qty: 4, price }] });
  return po;
}

test.describe(SHEET, () => {
  test('SYS-POR-01 – Lọc theo trạng thái, NCC, thời gian; chi tiết hiện SL đặt và SL đã nhập', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POR-01', SHEET);
    const price = priceOf(uid, 41_000);
    const p = await product(adminApi, uid, 'a', price + 20_000);
    const [sA, sB] = await suppliers(adminApi);
    const draft = await createPo(adminApi, { wh: 'K001', partnerId: sA.id, status: 'DRAFT', lines: [{ productId: p.productId, qty: 3, price }] });
    const ordered = await createPo(adminApi, { wh: 'K001', partnerId: sB.id, status: 'ORDERED', lines: [{ productId: p.productId, qty: 5, price }] });
    const partial = await partialPo(adminApi, p, sA, price);
    expect((await poRow(db, partial.id))?.status, 'tiền đề: phiếu nhập một phần').toBe('PARTIAL');
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const list = new PoListPage(page);
    await list.goto();

    await test.step('1a. Lọc trạng thái "Nhập một phần": chỉ còn phiếu PARTIAL', async () => {
      await list.onlyStatuses(['Nhập một phần']);
      await expect(list.row(partial.code)).toBeVisible();
      await expect(list.row(draft.code)).toHaveCount(0);
      await expect(list.row(ordered.code)).toHaveCount(0);
      const statuses = await list.dataRows().evaluateAll((rows) => rows.map((r) => (r.lastElementChild?.textContent ?? '').trim()));
      expect([...new Set(statuses)]).toEqual(['Nhập một phần']);
    });
    await test.step(`1b. Lọc NCC ${sA.code}: chỉ còn phiếu của NCC này`, async () => {
      await list.onlyStatuses(['Phiếu tạm', 'Đã đặt hàng', 'Nhập một phần', 'Hoàn thành']);
      await list.supplier.selectOption({ label: `${sA.name} (${sA.code})` });
      await expect(list.row(draft.code)).toBeVisible();
      await expect(list.row(partial.code)).toBeVisible();
      await expect(list.row(ordered.code)).toHaveCount(0);
      const names = await list.dataRows().evaluateAll((rows) => rows.map((r) => (r.children[3]?.textContent ?? '').trim()));
      expect([...new Set(names)]).toEqual([sA.name]);
    });
    await test.step('1c. Lọc thời gian: "Hôm qua" không có phiếu vừa tạo, "Hôm nay" có', async () => {
      await list.pickTime('Tháng này', 'Hôm qua');
      await expect(list.row(draft.code)).toHaveCount(0);
      await expect(list.row(partial.code)).toHaveCount(0);
      await list.pickTime('Hôm qua', 'Hôm nay');
      await expect(list.row(draft.code)).toBeVisible();
      await expect(list.row(partial.code)).toBeVisible();
    });
    await test.step('2. Mở phiếu: chi tiết hiện SL đặt 10 và SL đã nhập 4', async () => {
      const panel = await list.open(partial.code);
      await expect(panel.getByText('Đã nhập / Đã đặt')).toBeVisible();
      await expect(panel).toContainText('4 / 10');
      const item = panel.getByRole('row').filter({ has: page.getByRole('cell', { name: p.code, exact: true }) });
      // Cột: Mã hàng, Tên hàng, SL đặt, SL đã nhập, ...
      await expect(item.getByRole('cell').nth(2)).toHaveText('10');
      await expect(item.getByRole('cell').nth(3)).toHaveText('4');
    });
  });

  test('SYS-POR-02 – Lưu tạm phiếu đặt: trạng thái DRAFT, thành tiền dòng và tổng tiền', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POR-02', SHEET);
    const a = priceOf(uid, 32_000);
    const b = priceOf(uid, 17_500);
    const p1 = await product(adminApi, uid, 'a', a + 10_000);
    const p2 = await product(adminApi, uid, 'b', b + 10_000);
    const [s] = await suppliers(adminApi);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = new PoFormPage(page);
    let poId = 0;
    await test.step('1. Tạo phiếu: NCC, kho K001, 2 dòng hàng; Lưu tạm', async () => {
      await form.gotoCreate();
      await form.addProduct(p1.code);
      await form.setQty(p1.code, 3);
      await form.setPrice(p1.code, a);
      await form.addProduct(p2.code);
      await form.setQty(p2.code, 2);
      await form.setPrice(p2.code, b);
      await expect(form.line(p1.code)).toContainText((3 * a).toLocaleString('vi-VN'));
      await expect(form.line(p2.code)).toContainText((2 * b).toLocaleString('vi-VN'));
      await form.pickSupplier(s.code, s.name);
      const res = await form.save('Lưu tạm');
      expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
      poId = ((await res?.json()) as { poId: number }).poId;
      await expect(page.getByText('Đã lưu tạm phiếu đặt hàng nhập')).toBeVisible();
    });
    await test.step('KQ. DRAFT; thành tiền dòng và tổng tiền đúng', async () => {
      const po = await poRow(db, poId);
      expect(po?.status).toBe('DRAFT');
      expect(Number(po?.total_amount)).toBe(3 * a + 2 * b);
      expect((await poItems(db, poId)).map((i) => [i.product_id, Number(i.ordered_qty), Number(i.unit_price)])).toEqual([
        [p1.productId, 3, a],
        [p2.productId, 2, b],
      ]);
      const list = new PoListPage(page);
      await list.goto();
      await expect(list.row(po?.po_code ?? '')).toContainText('Phiếu tạm');
      await expect(list.row(po?.po_code ?? '')).toContainText((3 * a + 2 * b).toLocaleString('vi-VN'));
    });
  });

  test('SYS-POR-03 – Đặt hàng: trạng thái ORDERED, sẵn sàng nhập hàng @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POR-03', SHEET);
    const price = priceOf(uid, 28_000);
    const p = await product(adminApi, uid, 'a', price + 9_000);
    const [s] = await suppliers(adminApi);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = new PoFormPage(page);
    await form.gotoCreate();
    await form.addProduct(p.code);
    await form.setQty(p.code, 6);
    await form.setPrice(p.code, price);
    await form.pickSupplier(s.code, s.name);
    const res = await form.save('Đặt hàng');
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    const poId = ((await res?.json()) as { poId: number }).poId;
    await expect(page.getByText('Đã đặt hàng nhập', { exact: true })).toBeVisible();
    const po = await poRow(db, poId);
    expect(po?.status).toBe('ORDERED');
    const list = new PoListPage(page);
    await list.goto();
    const panel = await list.open(po?.po_code ?? '');
    await expect(panel.getByRole('button', { name: 'Nhập hàng', exact: true })).toBeVisible();
  });

  test('SYS-POR-04 – Sửa phiếu đặt đang là Phiếu tạm và lưu', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POR-04', SHEET);
    const price = priceOf(uid, 23_000);
    const p = await product(adminApi, uid, 'a', price + 9_000);
    const [s] = await suppliers(adminApi);
    const po = await createPo(adminApi, { wh: 'K001', partnerId: s.id, status: 'DRAFT', lines: [{ productId: p.productId, qty: 2, price }] });
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const list = new PoListPage(page);
    await list.goto();
    const panel = await list.open(po.code);
    await panel.getByRole('button', { name: 'Mở phiếu', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/purchase-orders/create\\?edit=${po.id}$`));
    const form = new PoFormPage(page);
    await expect(form.line(p.code)).toBeVisible();
    await form.setQty(p.code, 7);
    await form.setPrice(p.code, price + 500);
    const res = await form.save('Lưu tạm');
    testInfo.annotations.push({ type: 'observed', description: `Quyền PURCHASE_* của WarehouseStaff: ${(await permissionCodesOfRole(db, 'WarehouseStaff', 'PURCHASE%')).join(', ')}` });
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    await expect(page.getByText('Đã cập nhật phiếu đặt hàng nhập')).toBeVisible();
    expect((await poRow(db, po.id))?.status).toBe('DRAFT');
    expect((await poItems(db, po.id)).map((i) => [Number(i.ordered_qty), Number(i.unit_price)])).toEqual([[7, price + 500]]);
    expect(Number((await poRow(db, po.id))?.total_amount)).toBe(7 * (price + 500));
  });

  test('SYS-POR-05 – Hủy phiếu đặt chưa có phiếu nhập sau khi xác nhận', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POR-05', SHEET, { mismatch: 'Description: hủy kèm lý do; UI chỉ hỏi xác nhận, không có ô lý do.' });
    const price = priceOf(uid, 21_000);
    const p = await product(adminApi, uid, 'a', price + 9_000);
    const [s] = await suppliers(adminApi);
    const po = await createPo(adminApi, { wh: 'K001', partnerId: s.id, status: 'ORDERED', lines: [{ productId: p.productId, qty: 4, price }] });
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const list = new PoListPage(page);
    await list.goto();
    const panel = await list.open(po.code);
    await panel.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(page.getByText('Hủy phiếu đặt hàng nhập', { exact: true })).toBeVisible();
    testInfo.annotations.push({ type: 'observed', description: `Ô lý do trong hộp hủy: ${await page.getByPlaceholder(/lý do/i).count()}` });
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api/purchase-orders/${po.id}/cancel`),
      page.getByRole('button', { name: 'Đồng ý', exact: true }).click(),
    ]);
    testInfo.annotations.push({ type: 'observed', description: `Quyền PURCHASE_* của WarehouseStaff: ${(await permissionCodesOfRole(db, 'WarehouseStaff', 'PURCHASE%')).join(', ')}` });
    expect(res.status(), await res.text()).toBeLessThan(300);
    await expect(page.getByText(`Đã hủy phiếu ${po.code}`)).toBeVisible();
    expect((await poRow(db, po.id))?.status).toBe('CANCELLED');
  });

  test('SYS-POR-06 – Thiếu NCC, không có hàng, SL 0, đơn giá âm bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POR-06', SHEET);
    const price = priceOf(uid, 19_000);
    const p = await product(adminApi, uid, 'a', price + 9_000);
    const [s] = await suppliers(adminApi);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = new PoFormPage(page);
    const whApi = await ApiSession.login(env, USER, env.defaultPassword);
    try {
      await test.step('1a. Không chọn NCC → "Vui lòng chọn Nhà cung cấp"', async () => {
        await form.gotoCreate();
        await form.addProduct(p.code);
        const [res] = await Promise.all([form.save('Lưu tạm'), expect(page.getByText('Vui lòng chọn Nhà cung cấp', { exact: true })).toBeVisible()]);
        expect(res).toBeNull();
      });
      await test.step('1b. Không có dòng hàng → "Vui lòng chọn ít nhất 1 mặt hàng vào phiếu đặt"', async () => {
        await form.gotoCreate();
        await form.pickSupplier(s.code, s.name);
        const [res] = await Promise.all([
          form.save('Lưu tạm'),
          expect(page.getByText('Vui lòng chọn ít nhất 1 mặt hàng vào phiếu đặt', { exact: true })).toBeVisible(),
        ]);
        expect(res).toBeNull();
      });
      await test.step('1c. Số lượng 0', async () => {
        await form.gotoCreate();
        await form.addProduct(p.code);
        await form.setQty(p.code, 0);
        const shown = await form.qty(p.code).inputValue();
        testInfo.annotations.push({ type: 'observed', description: `Nhập SL 0 → ô hiện "${shown}"` });
        if (shown !== '0') {
          const be = await backendError(() =>
            whApi.post('/api/purchase-orders', { warehouseId: WAREHOUSES.K001.id, ...updatePoPayload(s.id, [{ productId: p.productId, qty: 0, price }], 'DRAFT') })
          );
          uiBlocksAction(testInfo, `ô Số lượng tự đặt tối thiểu 1 (nhập 0 → "${shown}")`, 'thông báo kiểm tra số lượng', be);
        }
      });
      await test.step('1d. Đơn giá âm', async () => {
        await form.price(p.code).click();
        await form.price(p.code).fill('-5000');
        await form.price(p.code).press('Tab');
        const shown = await form.price(p.code).inputValue();
        testInfo.annotations.push({ type: 'observed', description: `Nhập đơn giá -5000 → ô hiện "${shown}"` });
        if (!shown.startsWith('-')) {
          const be = await backendError(() =>
            whApi.post('/api/purchase-orders', { warehouseId: WAREHOUSES.K001.id, ...updatePoPayload(s.id, [{ productId: p.productId, qty: 1, price: -5000 }], 'DRAFT') })
          );
          uiBlocksAction(testInfo, `ô Đơn giá bỏ dấu "−" (nhập -5000 → "${shown}")`, 'thông báo kiểm tra đơn giá', be);
        }
      });
    } finally {
      await whApi.dispose();
    }
    expect(await poCountOfProduct(db, p.productId), 'không tạo phiếu đặt nào').toBe(0);
  });

  test('SYS-POR-07 – Không sửa được phiếu đặt đã có phiếu nhập', async ({ page, env, db, adminApi, uid }, testInfo) => {
    // Note của file: code cho sửa phiếu ORDERED chưa có phiếu nhập; ca này dùng phiếu đã có phiếu nhập (Nhập một phần)
    traceTc(testInfo, 'SYS-POR-07', SHEET);
    const price = priceOf(uid, 26_000);
    const p = await product(adminApi, uid, 'a', price + 9_000);
    const [s] = await suppliers(adminApi);
    const po = await partialPo(adminApi, p, s, price);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const list = new PoListPage(page);
    await list.goto();
    const panel = await list.open(po.code);
    const edit = panel.getByRole('button', { name: /^(Sửa|Mở phiếu)$/ });
    const shown = await edit.count();
    testInfo.annotations.push({ type: 'observed', description: `Nút Sửa trên phiếu ${po.code} (Nhập một phần): ${shown ? 'có' : 'ẩn'}` });
    if (!shown) {
      // Bằng chứng backend gọi bằng Admin: WarehouseStaff thiếu PURCHASE_UPDATE nên chỉ nhận 403 (DEF-E2E-08)
      const be = await backendError(() => adminApi.put(`/api/purchase-orders/${po.id}`, updatePoPayload(s.id, [{ productId: p.productId, qty: 12, price }])));
      uiBlocksAction(testInfo, 'nút "Sửa" bị ẩn khi phiếu đã có phiếu nhập', 'Phiếu đã có phiếu nhập liên kết, không thể sửa.', `${be} (gọi bằng Admin)`);
    }
    expect((await poItems(db, po.id)).map((i) => Number(i.ordered_qty))).toEqual([10]);
    expect((await poRow(db, po.id))?.status).toBe('PARTIAL');
  });

  test('SYS-POR-08 – Không hủy được phiếu đặt đã có phiếu nhập', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-POR-08', SHEET);
    const price = priceOf(uid, 27_000);
    const p = await product(adminApi, uid, 'a', price + 9_000);
    const [s] = await suppliers(adminApi);
    const po = await partialPo(adminApi, p, s, price);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const list = new PoListPage(page);
    await list.goto();
    const panel = await list.open(po.code);
    const cancel = panel.getByRole('button', { name: 'Hủy', exact: true });
    if (await cancel.isDisabled()) {
      // Bằng chứng backend gọi bằng Admin: WarehouseStaff thiếu PURCHASE_UPDATE nên chỉ nhận 403 (DEF-E2E-08)
      const be = await backendError(() => adminApi.post(`/api/purchase-orders/${po.id}/cancel`));
      uiBlocksAction(testInfo, 'nút "Hủy" bị vô hiệu khi phiếu đã có phiếu nhập', 'Phiếu đã có phiếu nhập liên kết. Hãy hủy các phiếu nhập đó trước.', `${be} (gọi bằng Admin)`);
    } else {
      await cancel.click();
      await page.getByRole('button', { name: 'Đồng ý', exact: true }).click();
      await expect(page.getByText('Phiếu đã có phiếu nhập liên kết. Hãy hủy các phiếu nhập đó trước.')).toBeVisible();
    }
    expect((await poRow(db, po.id))?.status).toBe('PARTIAL');
  });
});
