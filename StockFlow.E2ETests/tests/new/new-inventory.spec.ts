// Report 5.3 (bản nháp NEW) – sheet "NEW Inventory": SYS-TRF-N01 .. N05, SYS-STK-N01, SYS-INV-N01, SYS-INV-N02.
// Lỗi đã biết dùng expect.soft (không dùng test.fail): TRF-N03 DEF-IT-03, TRF-N04 DEF-IT-01, TRF-N05 DEF-E2E-01.
import { test, expect, traceTc, newUserContext } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { AppShell } from '../../pages/AppShell';
import { TransferCreatePage, TransferListPage } from '../../pages/TransferPages';
import { DocListPage } from '../../pages/InventoryPages';
import { ProductsPage } from '../../pages/MasterDataPages';
import { E2E_ACCOUNTS, SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { addStock, createProduct } from '../../fixtures/data';
import { ledgerRows, stockQty, stocktakeByCode, transferByCode, transferDatePlusMinutes, transferItems } from '../../fixtures/dbq';
import { ledgerOfProductWh } from '../../fixtures/dbq4';
import { docRef, inTransitTransfer, receiveTransferViaApi } from '../../fixtures/inventory';
import { directReceiptViaApi, suppliers } from '../../fixtures/purchasing';
import { createCustomer, createInvoice } from '../../fixtures/sales';
import { ApiSession } from '../../fixtures/api';
import { backendError, captureTexts, uiBlocksAction } from '../../fixtures/ui';
import type { Locator, Page, Response } from '@playwright/test';

const SHEET = 'NEW Inventory';
const num = (s: string): number => Number(s.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, ''));

/** Mở dòng phiếu chuyển và bấm "Hủy" → hộp "Hủy phiếu chuyển hàng"; trả về dòng gợi ý trong hộp */
async function openCancelTransfer(page: Page, code: string): Promise<void> {
  const list = new TransferListPage(page);
  await list.goto();
  await list.row(code).first().click();
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect(page.getByText('Hủy phiếu chuyển hàng', { exact: true })).toBeVisible();
}

async function confirmCancelTransfer(page: Page, transferId: number): Promise<Response> {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api/transfers/${transferId}/cancel`),
    page.getByRole('button', { name: 'Hủy phiếu', exact: true }).click(),
  ]);
  return res;
}

/** Ô "Tồn kho tại <kho>" trong form hàng hóa và nhãn của nó */
function stockField(modal: Locator): { label: Locator; input: Locator } {
  const label = modal.locator('label').filter({ hasText: /^Tồn kho tại / }).first();
  return { label, input: label.locator('xpath=following::input[1]') };
}

test.describe(SHEET, () => {
  test('SYS-TRF-N01 – Hủy phiếu đang chuyển: hoàn tồn kho chuyển', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-N01', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 81_000 });
    await addStock(adminApi, p.productId, 'K001', 12);
    const t = await inTransitTransfer(adminApi, 'K001', 'K002', p.productId, 5);
    expect((await transferByCode(db, t.code))?.status, 'tiền đề: phiếu Đang chuyển').toBe('IN_TRANSIT');
    const k1 = await stockQty(db, p.productId, 'K001');
    const k2 = await stockQty(db, p.productId, 'K002');
    await test.step('1. Người dùng K001 mở phiếu T (Đang chuyển) ở Chuyển hàng', async () => {
      await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK001.username, env.defaultPassword);
      await openCancelTransfer(page, t.code);
      await expect(page.getByText('Hàng đã xuất sẽ được hoàn lại tồn kho của kho chuyển.')).toBeVisible();
    });
    await test.step('2. Hủy và xác nhận', async () => {
      const res = await confirmCancelTransfer(page, t.id);
      expect(res.status(), await res.text()).toBeLessThan(300);
    });
    await test.step('KQ1. T Đã hủy', async () => {
      expect((await transferByCode(db, t.code))?.status).toBe('CANCELLED');
    });
    await test.step('KQ2. Tồn K001 hoàn lại số đã xuất; K002 không đổi', async () => {
      expect([await stockQty(db, p.productId, 'K001'), await stockQty(db, p.productId, 'K002')]).toEqual([k1 + 5, k2]);
    });
    await test.step('KQ3. Thẻ kho có dòng đảo', async () => {
      const rows = await ledgerRows(db, p.productId, 'TRANSFER', t.id);
      testInfo.annotations.push({ type: 'observed', description: `Thẻ kho phiếu: ${rows.map((r) => `${r.transaction_type} ${r.quantity}@${r.warehouse_id}`).join(', ')}` });
      expect(rows.map((r) => [Number(r.quantity), r.warehouse_id])).toEqual([
        [-5, WAREHOUSES.K001.id],
        [5, WAREHOUSES.K001.id],
      ]);
    });
  });

  test('SYS-TRF-N02 – Hủy phiếu đã nhận: đảo cả hai kho, chỉ người quản lý kho nhận được hủy', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-N02', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 82_000 });
    await addStock(adminApi, p.productId, 'K001', 12);
    const t = await inTransitTransfer(adminApi, 'K001', 'K002', p.productId, 5);
    await receiveTransferViaApi(adminApi, t.id, await transferDatePlusMinutes(db, t.id, 1), 5);
    expect((await transferByCode(db, t.code))?.status, 'tiền đề: phiếu Đã nhận').toBe('RECEIVED');
    const k1 = await stockQty(db, p.productId, 'K001');
    const k2 = await stockQty(db, p.productId, 'K002');
    await test.step('1. Người dùng chỉ có K001 thử hủy T đã nhận → KQ1. thông báo', async () => {
      await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK001.username, env.defaultPassword);
      await openCancelTransfer(page, t.code);
      const res = await confirmCancelTransfer(page, t.id);
      expect(res.status()).toBe(400);
      await expect(page.getByText('Bạn không có quyền hủy phiếu đã nhận vì không quản lý kho nhận hàng.', { exact: true })).toBeVisible();
      expect((await transferByCode(db, t.code))?.status).toBe('RECEIVED');
    });
    await test.step('2. Người dùng có K001 và K002 hủy T và xác nhận', async () => {
      const other = await newUserContext(browser, testInfo, dialogs);
      await new LoginPage(other.page).loginOk(SEEDED.warehouse.username, env.defaultPassword);
      const shell = new AppShell(other.page);
      await other.page.goto('/transfers');
      // Nút Hủy chỉ hiện khi chi nhánh làm việc là kho chuyển (K001)
      if (!((await shell.branchButton.innerText()).includes(WAREHOUSES.K001.name))) await shell.selectBranch('K001');
      await expect(shell.branchButton).toContainText(WAREHOUSES.K001.name);
      await openCancelTransfer(other.page, t.code);
      await expect(other.page.getByText('Hàng đã nhận sẽ bị trừ khỏi kho nhận và hoàn lại toàn bộ số lượng chuyển về kho chuyển.')).toBeVisible();
      const res = await confirmCancelTransfer(other.page, t.id);
      expect(res.status(), await res.text()).toBeLessThan(300);
      await other.context.close();
    });
    await test.step('KQ2. T Đã hủy; tồn K001 hoàn lại; tồn K002 giảm số đã nhận', async () => {
      expect((await transferByCode(db, t.code))?.status).toBe('CANCELLED');
      expect([await stockQty(db, p.productId, 'K001'), await stockQty(db, p.productId, 'K002')]).toEqual([k1 + 5, k2 - 5]);
    });
  });

  test('SYS-TRF-N03 – Số lượng nhận âm bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-N03', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 83_000 });
    await addStock(adminApi, p.productId, 'K001', 10);
    const t = await inTransitTransfer(adminApi, 'K001', 'K002', p.productId, 4);
    const k2 = await stockQty(db, p.productId, 'K002');
    const list = new TransferListPage(page);
    await test.step('1. Người dùng K002 mở phiếu T đang chuyển', async () => {
      await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK002.username, env.defaultPassword);
      await list.goto();
      await list.openReceive(t.code);
      // Giờ nhận = giờ chuyển + 1 phút (tránh DEF-E2E-01, không phải điều đang kiểm)
      await list.setReceiveTime(await transferDatePlusMinutes(db, t.id, 1));
    });
    await test.step('2. Nhập SL nhận -1 và bấm Nhận hàng', async () => {
      const qty = page.getByRole('spinbutton');
      await qty.fill('-1');
      await qty.press('Tab');
      testInfo.annotations.push({ type: 'observed', description: `Ô SL nhận sau khi nhập -1: "${await qty.inputValue()}"` });
      const res = page.waitForResponse((r) => /\/api\/transfers\/\d+\/receive$/i.test(new URL(r.url()).pathname), { timeout: 5_000 }).catch(() => null);
      await page.getByRole('button', { name: 'Nhận hàng', exact: true }).last().click();
      // Toast chỉ hiện vài giây: bắt ngay sau khi bấm
      const negMsg = `Hàng ${p.code} - ${p.name}: số lượng nhận không được âm.`;
      const negSeen = await page.getByText(negMsg).waitFor({ state: 'visible', timeout: 4_000 }).then(() => true).catch(() => false);
      const shortage = page.getByText(/^Phát hiện nhận thiếu hàng! /);
      if (await shortage.isVisible().catch(() => false)) {
        // SL -1 bị coi là 0 → giao diện đòi ghi chú nhận thiếu; người nhận ghi lý do rồi bấm lại
        testInfo.annotations.push({ type: 'observed', description: 'Giao diện báo "Phát hiện nhận thiếu hàng!" (SL -1 được tính là 0), không báo SL âm' });
        await page.getByPlaceholder('Nhập lý do nhận thiếu hàng (bắt buộc)...').fill(`E2E nhận -1 ${uid}`);
        const again = await list.confirmReceive();
        testInfo.annotations.push({ type: 'observed', description: `Bấm lại Nhận hàng → HTTP ${again.status()} ${(await again.text()).slice(0, 160)}` });
      } else {
        const r = await res;
        testInfo.annotations.push({ type: 'observed', description: `Nhận hàng → ${r ? `HTTP ${r.status()}` : 'không gửi request'}` });
        // Giao diện chặn với cùng câu backend trả khi gọi API (ReceiveTransferCommand)
        if (!r) expect.soft(negSeen, `thông báo "${negMsg}"`).toBe(true);
      }
    });
    await test.step('KQ1. Bị từ chối; T vẫn Đang chuyển', async () => {
      const after = await transferByCode(db, t.code);
      const items = await transferItems(db, t.id);
      testInfo.annotations.push({ type: 'observed', description: `Trạng thái ${after?.status}; SL nhận ${items.map((i) => i.received_quantity).join(',')}` });
      expect.soft(after?.status, 'phiếu phải còn Đang chuyển').toBe('IN_TRANSIT');
    });
    await test.step('KQ2. Tồn K002 không đổi', async () => {
      expect(await stockQty(db, p.productId, 'K002')).toBe(k2);
    });
  });

  test('SYS-TRF-N04 – Hai người cùng nhận một phiếu: chỉ cộng tồn một lần', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-N04', SHEET, { knownDefect: 'DEF-IT-01 (Report 5.2, Critical): nhận đồng thời cộng tồn hai lần' });
    const p = await createProduct(adminApi, { suffix: uid, price: 84_000 });
    await addStock(adminApi, p.productId, 'K001', 10);
    const t = await inTransitTransfer(adminApi, 'K001', 'K002', p.productId, 6);
    const k2 = await stockQty(db, p.productId, 'K002');
    const receiveAt = await transferDatePlusMinutes(db, t.id, 1);
    const other = await newUserContext(browser, testInfo, dialogs);
    const a = new TransferListPage(page);
    const b = new TransferListPage(other.page);
    let results: Response[] = [];
    await test.step('1. Hai người dùng K002 mở phiếu T ở hai trình duyệt', async () => {
      await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK002.username, env.defaultPassword);
      await new LoginPage(other.page).loginOk(E2E_ACCOUNTS.whK002b.username, env.defaultPassword);
      for (const l of [a, b]) {
        await l.goto();
        await l.openReceive(t.code);
        await l.setReceiveTime(receiveAt);
      }
    });
    await test.step('2. Cả hai bấm Nhận hàng cùng lúc', async () => {
      results = await Promise.all([a.confirmReceive(), b.confirmReceive()]);
      const summary = await Promise.all(results.map(async (r) => `${r.status()} ${(await r.text()).slice(0, 140)}`));
      testInfo.annotations.push({ type: 'observed', description: `Kết quả hai lần nhận: ${summary.join(' | ')}` });
    });
    await test.step('KQ1. Chỉ một lần nhận thành công; lần kia bị từ chối vì phiếu không còn Đang chuyển', async () => {
      const ok = results.filter((r) => r.status() < 300).length;
      expect.soft(ok, 'số lần nhận thành công').toBe(1);
      expect((await transferByCode(db, t.code))?.status).toBe('RECEIVED');
    });
    await test.step('KQ2. Tồn K002 tăng một lần', async () => {
      const after = await stockQty(db, p.productId, 'K002');
      const lines = (await ledgerRows(db, p.productId, 'TRANSFER', t.id)).filter((r) => r.warehouse_id === WAREHOUSES.K002.id);
      testInfo.annotations.push({ type: 'observed', description: `Tồn K002 ${k2} → ${after}; dòng thẻ kho nhập K002: ${lines.length}` });
      expect.soft(after, 'tồn K002 chỉ cộng 6').toBe(k2 + 6);
    });
    await other.context.close();
  });

  test('SYS-TRF-N05 – Kho nhận xác nhận với giờ nhận mặc định khi phiếu vừa xuất trong cùng phút', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-N05', SHEET, { knownDefect: 'DEF-E2E-01: giờ nhận mặc định bị cắt giây, bằng giờ chuyển khi nhận cùng phút' });
    const qty = 3;
    const p = await createProduct(adminApi, { suffix: uid, price: 85_000 });
    await addStock(adminApi, p.productId, 'K001', 10);
    const k2 = await stockQty(db, p.productId, 'K002');
    let code = '';
    let transferId = 0;
    // Bắt đầu ở đầu phút để bước 1 và bước 2 chắc chắn cùng một phút (chờ theo điều kiện đồng hồ, không ngủ cố định)
    await expect.poll(() => new Date().getSeconds(), { timeout: 45_000, intervals: [500] }).toBeLessThan(20);
    await test.step('1. Người dùng K001 tạo phiếu T K001 → K002 và xuất (Hoàn thành → Đồng ý tiếp tục)', async () => {
      await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK001.username, env.defaultPassword);
      const create = new TransferCreatePage(page);
      await create.goto();
      await create.addProduct(p.code);
      await create.setQuantity(p.code, qty);
      await create.destination.selectOption({ label: WAREHOUSES.K002.name });
      const res = await create.complete();
      expect(res.status(), await res.text()).toBeLessThan(300);
      const ref = docRef(await res.json());
      code = ref.code;
      transferId = ref.id;
    });
    let refused = '';
    await test.step('2. Trong cùng phút, người dùng K002 mở T → Nhận hàng; giữ giờ nhận mặc định', async () => {
      const other = await newUserContext(browser, testInfo, dialogs);
      const texts = await captureTexts(other.page);
      const list = new TransferListPage(other.page);
      await new LoginPage(other.page).loginOk(E2E_ACCOUNTS.whK002.username, env.defaultPassword);
      await list.goto();
      await list.openReceive(code);
      const input = other.page.locator('input[type="datetime-local"]');
      const t = await transferByCode(db, code);
      testInfo.annotations.push({ type: 'observed', description: `Giờ chuyển (DB) ${JSON.stringify(t)}; giờ nhận mặc định "${await input.inputValue()}"; giây hiện tại ${new Date().getSeconds()}` });
      await test.step('3. Bấm Nhận hàng', async () => {
        const res = other.page
          .waitForResponse((r) => /\/api\/transfers\/\d+\/receive$/i.test(new URL(r.url()).pathname) && r.request().method() === 'POST', { timeout: 6_000 })
          .catch(() => null);
        await other.page.getByRole('button', { name: 'Nhận hàng', exact: true }).last().click();
        const r = await res;
        // Toast chỉ hiện vài giây → đọc từ bản ghi chữ đã xuất hiện trên trang
        refused = (await texts(/Thời gian nhận hàng.*phải sau thời gian chuyển hàng/))[0] ?? '';
        testInfo.annotations.push({ type: 'observed', description: `Nhận hàng → ${r ? `HTTP ${r.status()} ${(await r.text()).slice(0, 160)}` : 'không gửi request'}${refused ? `; thông báo "${refused}"` : ''}` });
      });
      await other.context.close();
    });
    await test.step('KQ1. Nhận được với giờ mặc định; T Đã nhận; tồn K002 tăng', async () => {
      expect.soft(refused, 'không bị từ chối vì giờ nhận').toBe('');
      expect.soft((await transferByCode(db, code))?.status, 'trạng thái phiếu').toBe('RECEIVED');
      expect.soft(await stockQty(db, p.productId, 'K002'), 'tồn K002').toBe(k2 + qty);
      expect(transferId).toBeGreaterThan(0);
    });
  });

  test('SYS-STK-N01 – Hủy phiếu kiểm đã cân bằng: đảo điều chỉnh', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-STK-N01', SHEET);
    const p1 = await createProduct(adminApi, { suffix: `${uid}a`, price: 61_000 });
    const p2 = await createProduct(adminApi, { suffix: `${uid}b`, price: 62_000 });
    await addStock(adminApi, p1.productId, 'K001', 10);
    await addStock(adminApi, p2.productId, 'K001', 5);
    const before = [await stockQty(db, p1.productId, 'K001'), await stockQty(db, p2.productId, 'K001')];
    const k = docRef(
      await adminApi.post('/api/stocktakes', {
        warehouseId: WAREHOUSES.K001.id,
        status: 'BALANCED',
        notes: `E2E cân bằng ${uid}`,
        items: [
          { productId: p1.productId, actualQty: 7, reason: 'E2E thiếu hàng' },
          { productId: p2.productId, actualQty: 8, reason: 'E2E thừa hàng' },
        ],
      })
    );
    expect((await stocktakeByCode(db, k.code))?.status, 'tiền đề: phiếu đã cân bằng').toBe('BALANCED');
    expect([await stockQty(db, p1.productId, 'K001'), await stockQty(db, p2.productId, 'K001')], 'tiền đề: đã cân bằng có chênh lệch').toEqual([7, 8]);
    const ledger0 = [(await ledgerOfProductWh(db, p1.productId, 'K001')).length, (await ledgerOfProductWh(db, p2.productId, 'K001')).length];
    const list = DocListPage.stocktakes(page);
    await test.step('1. Mở phiếu kiểm K (đã cân bằng) của K001 ở /stocktakes', async () => {
      await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK001.username, env.defaultPassword);
      await list.goto();
      await list.open(k.code);
    });
    await test.step('2. Hủy và xác nhận', async () => {
      const res = await list.cancel(new RegExp(`/api/stocktakes/${k.id}/cancel$`, 'i'));
      expect(res.status(), await res.text()).toBeLessThan(300);
    });
    await test.step('KQ1. K Đã hủy', async () => {
      expect((await stocktakeByCode(db, k.code))?.status).toBe('CANCELLED');
    });
    await test.step('KQ2. Tồn mỗi dòng về số trước khi cân bằng', async () => {
      expect([await stockQty(db, p1.productId, 'K001'), await stockQty(db, p2.productId, 'K001')]).toEqual(before);
    });
    await test.step('KQ3. Thẻ kho có dòng đảo', async () => {
      const l1 = await ledgerOfProductWh(db, p1.productId, 'K001');
      const l2 = await ledgerOfProductWh(db, p2.productId, 'K001');
      testInfo.annotations.push({ type: 'observed', description: `Dòng mới P1: ${JSON.stringify(l1.slice(ledger0[0]))}; P2: ${JSON.stringify(l2.slice(ledger0[1]))}` });
      expect(l1.slice(ledger0[0]).map((r) => Number(r.quantity))).toEqual([3]);
      expect(l2.slice(ledger0[1]).map((r) => Number(r.quantity))).toEqual([-3]);
    });
  });

  test('SYS-INV-N01 – Điều chỉnh tồn trên Hàng hóa: cập nhật tồn và thẻ kho; điều chỉnh sai bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-INV-N01', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Bước 1–2: Quản lý manager01 (K001). Bước 3: e2e.wh.k002 (chỉ K002, có STOCK_UPDATE)' });
    const p = await createProduct(adminApi, { suffix: uid, price: 63_000 });
    await addStock(adminApi, p.productId, 'K001', 6);
    const pp = new ProductsPage(page);
    const ledger0 = (await ledgerOfProductWh(db, p.productId, 'K001')).length;
    await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
    await test.step('1. Mở P ở Hàng hóa, điều chỉnh tồn K001 (thêm 5) → KQ1', async () => {
      await pp.goto();
      await pp.expand(p.code);
      await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).first().click();
      await expect(page.getByRole('heading', { name: 'Chỉnh sửa hàng hóa', level: 3 })).toBeVisible();
      const f = stockField(pp.modal);
      await expect(f.label).toContainText(WAREHOUSES.K001.name);
      await expect(f.input).toHaveValue('6');
      await f.input.fill('11');
      const adj = page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname.toLowerCase() === `/api/products/${p.productId}/stock-adjustments`);
      const saved = await pp.save();
      expect(saved?.status(), saved ? await saved.text() : 'không có request lưu').toBeLessThan(300);
      const a = await adj;
      expect(a.status(), await a.text()).toBeLessThan(300);
      expect(await stockQty(db, p.productId, 'K001')).toBe(11);
      const rows = (await ledgerOfProductWh(db, p.productId, 'K001')).slice(ledger0);
      testInfo.annotations.push({ type: 'observed', description: `Dòng thẻ kho mới: ${JSON.stringify(rows)}` });
      expect(rows.map((r) => Number(r.quantity))).toEqual([5]);
    });
    await test.step('2. Đặt tồn về giá trị âm → KQ2. "Tồn kho thực tế không được âm."', async () => {
      const expected = 'Tồn kho thực tế không được âm.';
      await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).first().click();
      await expect(page.getByRole('heading', { name: 'Chỉnh sửa hàng hóa', level: 3 })).toBeVisible();
      const f = stockField(pp.modal);
      await f.input.fill('-3');
      const shown = await f.input.inputValue();
      if (shown !== '-3') {
        const be = await backendError(() =>
          adminApi.post(`/api/products/${p.productId}/stock-adjustments`, { warehouseId: WAREHOUSES.K001.id, quantity: -3, mode: 'SET', note: 'E2E bằng chứng' })
        );
        expect(be).toBe(expected);
        uiBlocksAction(testInfo, `ô tồn kho bỏ dấu trừ (nhập -3 hiện "${shown}")`, expected, `${be} (gọi bằng Admin)`);
        await page.keyboard.press('Escape');
      } else {
        await pp.save();
        await expect(page.getByText(expected).first()).toBeVisible();
      }
      expect(await stockQty(db, p.productId, 'K001')).toBe(11);
    });
    await test.step('3. Người dùng không có K001 điều chỉnh tồn K001 → KQ3. thông báo không có quyền', async () => {
      const expected = `Bạn không có quyền điều chỉnh tồn kho tại ${WAREHOUSES.K001.name}.`;
      const user = E2E_ACCOUNTS.whK002;
      const api = await ApiSession.login(env, user.username, env.defaultPassword);
      const be = await backendError(() => api.post(`/api/products/${p.productId}/stock-adjustments`, { warehouseId: WAREHOUSES.K001.id, quantity: 20, mode: 'SET', note: 'E2E bằng chứng' }));
      await api.dispose();
      expect(be).toBe(expected);
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await new LoginPage(page).loginOk(user.username, env.defaultPassword);
      await pp.goto();
      await pp.expand(p.code);
      const edit = page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).first();
      let what = 'không có nút "Chỉnh sửa" hàng hóa';
      if (await edit.isVisible().catch(() => false)) {
        await edit.click();
        await expect(page.getByRole('heading', { name: 'Chỉnh sửa hàng hóa', level: 3 })).toBeVisible();
        const label = (await stockField(pp.modal).label.innerText()).trim();
        what = `form chỉ cho sửa "${label}" (không chọn được ${WAREHOUSES.K001.name})`;
        expect(label).not.toContain(WAREHOUSES.K001.name);
        await page.keyboard.press('Escape');
      }
      uiBlocksAction(testInfo, what, expected, `${be} (gọi bằng ${user.username})`);
      expect(await stockQty(db, p.productId, 'K001')).toBe(11);
    });
  });

  test('SYS-INV-N02 – Thẻ kho liệt kê mọi biến động kèm chứng từ và tồn cuối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-INV-N02', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Bước 1 dựng 4 biến động qua API (nhập, bán POS, chuyển, xuất hủy); bước 2–3 qua UI bằng manager01' });
    const price = 64_000;
    const p = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, p.productId, 'K001', 20);
    const s = (await suppliers(adminApi))[0];
    const c = await createCustomer(adminApi, { suffix: uid });
    let grCode = '';
    await test.step('1. Nhập hàng, bán POS, chuyển hàng và xuất hủy P', async () => {
      grCode = (await directReceiptViaApi(adminApi, { wh: 'K001', partnerId: s.id, lines: [{ productId: p.productId, qty: 5, price: 40_000 }] })).code;
      await createInvoice(adminApi, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price }], paid: 2 * price, requestId: `${uid}-sc` });
      await inTransitTransfer(adminApi, 'K001', 'K002', p.productId, 3);
      await adminApi.post('/api/disposals', { warehouseId: WAREHOUSES.K001.id, reason: 'E2E thẻ kho', status: 'COMPLETED', items: [{ productId: p.productId, quantity: 1 }] });
      expect(await stockQty(db, p.productId, 'K001')).toBe(19);
    });
    const ledger = await ledgerOfProductWh(db, p.productId, 'K001');
    testInfo.annotations.push({ type: 'observed', description: `Thẻ kho DB: ${ledger.map((r) => `${r.transaction_type} ${r.quantity}`).join(', ')}` });
    const table = page.locator('table').filter({ has: page.getByRole('columnheader', { name: 'Tồn cuối' }) }).last();
    await test.step('2. Mở thẻ kho của P', async () => {
      await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
      const pp = new ProductsPage(page);
      await pp.goto();
      await pp.expand(p.code);
      await page.getByRole('button', { name: 'Thẻ kho', exact: true }).first().click();
      const branch = page.locator('label').filter({ hasText: 'Chi nhánh' }).getByRole('combobox');
      await branch.selectOption({ label: WAREHOUSES.K001.name });
      await expect(table.locator('tbody tr')).toHaveCount(ledger.length);
    });
    await test.step('KQ1. Mỗi biến động một dòng theo thời gian, có mã chứng từ, SL nhập/xuất, tồn cuối', async () => {
      const headers = (await table.locator('thead th').allInnerTexts()).map((h) => h.trim());
      const iQty = headers.findIndex((h) => h.startsWith('Số lượng'));
      const iEnd = headers.findIndex((h) => h.startsWith('Tồn cuối'));
      const rows = await table.locator('tbody tr').evaluateAll((trs) => trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.textContent ?? '').trim())));
      testInfo.annotations.push({ type: 'observed', description: `Thẻ kho UI: ${rows.map((r) => `${r[0]} | ${r[iQty]} | ${r[iEnd]}`).join(' ; ')}` });
      // Màn hình: mới nhất ở trên cùng → đảo lại để so với thứ tự ghi
      const asc = [...rows].reverse();
      expect(asc.map((r) => num(r[iQty]))).toEqual(ledger.map((l) => Number(l.quantity)));
      let bal = 0;
      const running = ledger.map((l) => (bal += Number(l.quantity)));
      expect(asc.map((r) => num(r[iEnd]))).toEqual(running);
      for (const r of asc) expect(r[0], 'mã chứng từ').toMatch(/^[A-Z]{2,}\w*\d+/);
    });
    await test.step('KQ2. Tồn cuối dòng mới nhất = tồn hiện có', async () => {
      const top = await table.locator('tbody tr').first().locator('td').allInnerTexts();
      const headers = (await table.locator('thead th').allInnerTexts()).map((h) => h.trim());
      expect(num(top[headers.findIndex((h) => h.startsWith('Tồn cuối'))])).toBe(await stockQty(db, p.productId, 'K001'));
    });
    await test.step('3. Bấm mã chứng từ → KQ3. mở đúng chứng từ', async () => {
      await table.getByRole('button', { name: grCode, exact: true }).click();
      await expect(page.getByText(grCode).last()).toBeVisible();
      const dialog = page.locator('div').filter({ hasText: grCode }).filter({ has: page.getByRole('button', { name: /^Mở/ }) }).last();
      await expect(dialog).toBeVisible();
      testInfo.annotations.push({ type: 'observed', description: `Hộp chứng từ: ${(await dialog.innerText()).replace(/\s+/g, ' ').slice(0, 200)}` });
    });
  });
});
