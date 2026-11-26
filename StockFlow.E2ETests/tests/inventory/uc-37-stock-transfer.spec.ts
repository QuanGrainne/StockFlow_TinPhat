// Report 5.3 – sheet "UC-37 Stock Transfer" (SYS-TRF-01..08; TRF-01 là ca pilot). Người dùng: e2e.wh.k001 (chỉ K001, kho xuất)
// và e2e.wh.k002 (chỉ K002, kho nhận). Phiếu dựng sẵn qua API bằng Admin. TRF-07 là N/A theo Note.
import { test, expect, traceTc, newUserContext } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { TransferCreatePage, TransferListPage } from '../../pages/TransferPages';
import { E2E_ACCOUNTS, WAREHOUSES } from '../../fixtures/accounts';
import { addStock, createProduct } from '../../fixtures/data';
import { ledgerRows, stockQty, transferByCode, transferDatePlusMinutes, transferItems, transferNotes, userByUsername } from '../../fixtures/dbq';
import { draftTransfer, inTransitTransfer, receiveTransferViaApi } from '../../fixtures/inventory';
import { ApiSession } from '../../fixtures/api';
import { backendError, uiBlocksAction } from '../../fixtures/ui';
import type { Page } from '@playwright/test';
import type { Client } from 'pg';

const SHEET = 'UC-37 Stock Transfer';

/** Phản hồi POST /api/transfers (TransferDetailDto) */
interface TransferDto {
  stockTransferId: number;
  transferCode: string;
  status: string;
}

/** Mở màn nhận hàng của phiếu cho người dùng kho nhận, ghi giờ nhận = giờ chuyển + 1 phút (DEF-E2E-01) */
async function openReceiveScreen(page: Page, db: Client, code: string, transferId: number): Promise<TransferListPage> {
  const list = new TransferListPage(page);
  await list.goto();
  await list.openReceive(code);
  await list.setReceiveTime(await transferDatePlusMinutes(db, transferId, 1));
  return list;
}

/** Giờ Việt Nam hiện tại + n phút, dạng ISO không múi giờ (giờ lưu trong DB là giờ Việt Nam) */
const vnNowPlus = (minutes: number): string => new Date(Date.now() + 7 * 3_600_000 + minutes * 60_000).toISOString().slice(0, 19);

test.describe(SHEET, () => {
  test('SYS-TRF-01 – Xuất chuyển K001 → K002 rồi người dùng K002 nhận đủ @pilot', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-01', SHEET);
    const qty = 5;
    const sender = E2E_ACCOUNTS.whK001;
    const receiver = E2E_ACCOUNTS.whK002;
    const product = await createProduct(adminApi, { suffix: uid, price: 90_000 });
    await addStock(adminApi, product.productId, 'K001', 20);
    const k001Before = await stockQty(db, product.productId, 'K001');
    const k002Before = await stockQty(db, product.productId, 'K002');
    expect([k001Before, k002Before], 'tiền đề: tồn nguồn 20, kho nhận 0').toEqual([20, 0]);
    let transfer: TransferDto = { stockTransferId: 0, transferCode: '', status: '' };

    await test.step('1. Người dùng K001 tạo phiếu K001 → K002 và xuất chuyển (Hoàn thành)', async () => {
      await new LoginPage(page).loginOk(sender.username, env.defaultPassword);
      const create = new TransferCreatePage(page);
      await create.goto();
      await create.addProduct(product.code);
      await create.setQuantity(product.code, qty);
      await create.destination.selectOption({ label: WAREHOUSES.K002.name });
      const res = await create.complete();
      expect(res.status(), await res.text()).toBeLessThan(300);
      transfer = (await res.json()) as TransferDto;
      expect(transfer.transferCode).toBeTruthy();
      await expect(page.getByText(`Đã hoàn thành xuất chuyển hàng ${transfer.transferCode}! Trạng thái: Đang chuyển`)).toBeVisible();
    });
    await test.step('KQ1. Sau khi xuất: IN_TRANSIT, tồn K001 giảm', async () => {
      const t = await transferByCode(db, transfer.transferCode);
      expect(t?.status).toBe('IN_TRANSIT');
      expect([t?.source_warehouse_id, t?.dest_warehouse_id]).toEqual([WAREHOUSES.K001.id, WAREHOUSES.K002.id]);
      expect(t?.created_by).toBe((await userByUsername(db, sender.username))?.user_id);
      expect(await stockQty(db, product.productId, 'K001')).toBe(k001Before - qty);
      expect(await stockQty(db, product.productId, 'K002')).toBe(k002Before);
      const out = await ledgerRows(db, product.productId, 'TRANSFER', t?.stock_transfer_id ?? -1);
      expect(out.map((r) => [r.transaction_type, Number(r.quantity), r.warehouse_id])).toEqual([['TRANSFER_OUT', -qty, WAREHOUSES.K001.id]]);
      const list = new TransferListPage(page);
      await list.goto();
      await expect(list.row(transfer.transferCode)).toContainText('Đang chuyển');
    });
    await test.step('2. Người dùng K002 (trình duyệt riêng) nhận đủ số lượng', async () => {
      const other = await newUserContext(browser, testInfo, dialogs);
      await new LoginPage(other.page).loginOk(receiver.username, env.defaultPassword);
      const list = new TransferListPage(other.page);
      await list.goto();
      await list.openReceive(transfer.transferCode);
      // DEF-E2E-01 (phát hiện ở pilot): giờ nhận mặc định bị cắt giây nên bằng giờ chuyển khi nhận cùng phút,
      // giao diện chặn "Thời gian nhận hàng ... phải sau thời gian chuyển hàng". Người nhận ghi giờ nhận thực tế
      // (giờ chuyển + 1 phút) – thao tác có sẵn trên form; lỗi được báo riêng, không bị che trong ca này.
      testInfo.annotations.push({ type: 'note', description: 'Ghi giờ nhận = giờ chuyển + 1 phút vì DEF-E2E-01' });
      await list.setReceiveTime(await transferDatePlusMinutes(db, transfer.stockTransferId, 1));
      const res = await list.confirmReceive();
      expect(res.status(), await res.text()).toBeLessThan(300);
      await expect(other.page.getByText(`Đã nhận hàng thành công cho phiếu ${transfer.transferCode}!`)).toBeVisible();
      await other.context.close();
    });
    await test.step('KQ2. Sau khi nhận: RECEIVED, tồn K002 tăng', async () => {
      const t = await transferByCode(db, transfer.transferCode);
      expect(t?.status).toBe('RECEIVED');
      const items = await transferItems(db, t?.stock_transfer_id ?? -1);
      expect(items.map((i) => Number(i.received_quantity))).toEqual([qty]);
      expect(await stockQty(db, product.productId, 'K002')).toBe(k002Before + qty);
      expect(await stockQty(db, product.productId, 'K001')).toBe(k001Before - qty);
      const rows = await ledgerRows(db, product.productId, 'TRANSFER', t?.stock_transfer_id ?? -1);
      expect(rows.map((r) => [r.transaction_type, Number(r.quantity), r.warehouse_id])).toEqual([
        ['TRANSFER_OUT', -qty, WAREHOUSES.K001.id],
        ['TRANSFER_IN', qty, WAREHOUSES.K002.id],
      ]);
      expect(rows[1].created_by).toBe((await userByUsername(db, receiver.username))?.user_id);
    });
  });

  test('SYS-TRF-02 – Hủy phiếu chưa xuất: CANCELLED, tồn không đổi', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-02', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 91_000 });
    await addStock(adminApi, p.productId, 'K001', 10);
    const t = await draftTransfer(adminApi, 'K001', 'K002', p.productId, 4);
    const before = [await stockQty(db, p.productId, 'K001'), await stockQty(db, p.productId, 'K002')];
    await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK001.username, env.defaultPassword);
    const list = new TransferListPage(page);
    await list.goto();
    await list.row(t.code).first().click();
    await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    await expect(page.getByText('Hủy phiếu chuyển hàng', { exact: true })).toBeVisible();
    await expect(page.getByText('Phiếu tạm chưa làm thay đổi tồn kho.')).toBeVisible();
    await page.getByPlaceholder('Nhập lý do hủy (không bắt buộc)').fill(`E2E hủy ${uid}`);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api/transfers/${t.id}/cancel`),
      page.getByRole('button', { name: 'Hủy phiếu', exact: true }).click(),
    ]);
    expect(res.status(), await res.text()).toBeLessThan(300);
    expect((await transferByCode(db, t.code))?.status).toBe('CANCELLED');
    expect([await stockQty(db, p.productId, 'K001'), await stockQty(db, p.productId, 'K002')]).toEqual(before);
  });

  test('SYS-TRF-03 – Kho chuyển trùng kho nhận bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-03', SHEET);
    const expected = 'Chi nhánh nhận hàng phải khác chi nhánh chuyển đi.';
    const p = await createProduct(adminApi, { suffix: uid, price: 92_000 });
    await addStock(adminApi, p.productId, 'K001', 10);
    const sender = E2E_ACCOUNTS.whK001;
    await new LoginPage(page).loginOk(sender.username, env.defaultPassword);
    const create = new TransferCreatePage(page);
    await create.goto();
    await create.addProduct(p.code);
    await create.setQuantity(p.code, 2);
    const options = (await create.destination.locator('option').allInnerTexts()).map((o) => o.trim());
    testInfo.annotations.push({ type: 'observed', description: `Kho chuyển K001; lựa chọn "Chuyển tới": ${options.join(' | ')}` });
    if (!options.includes(WAREHOUSES.K001.name)) {
      const api = await ApiSession.login(env, sender.username, env.defaultPassword);
      const be = await backendError(() =>
        api.post('/api/transfers', { sourceWarehouseId: WAREHOUSES.K001.id, destWarehouseId: WAREHOUSES.K001.id, status: 'DRAFT', items: [{ productId: p.productId, quantity: 2 }] })
      );
      await api.dispose();
      uiBlocksAction(testInfo, 'ô "Chuyển tới" không liệt kê kho đang chuyển (K001)', expected, be);
    } else {
      await create.destination.selectOption({ label: WAREHOUSES.K001.name });
      await create.completeButton.click();
      await expect(page.getByText(expected)).toBeVisible();
    }
    expect(await stockQty(db, p.productId, 'K001')).toBe(10);
  });

  test('SYS-TRF-04 – Không có quyền kho xuất thì không xuất được; không có quyền kho nhận thì không nhận được', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-04', SHEET);
    const msgIssue = 'Bạn không có quyền xuất hàng chuyển kho từ kho này.';
    const msgReceive = 'Bạn không có quyền xác nhận nhận hàng cho kho nhận này.';
    const p = await createProduct(adminApi, { suffix: uid, price: 93_000 });
    await addStock(adminApi, p.productId, 'K001', 20);
    const draft = await draftTransfer(adminApi, 'K001', 'K002', p.productId, 3);
    const moving = await inTransitTransfer(adminApi, 'K001', 'K002', p.productId, 2);
    await test.step('1. Người chỉ có K002 xuất chuyển phiếu tạm của K001', async () => {
      const u = E2E_ACCOUNTS.whK002;
      await new LoginPage(page).loginOk(u.username, env.defaultPassword);
      const list = new TransferListPage(page);
      await list.goto();
      const visible = await list.row(draft.code).count();
      let observed = '(không thấy phiếu trong danh sách)';
      let opened = false;
      if (visible) {
        await list.row(draft.code).first().click();
        const open = page.getByRole('button', { name: 'Mở phiếu', exact: true });
        if (await open.isVisible()) {
          opened = true;
          await open.click();
          const create = new TransferCreatePage(page);
          await expect(create.line(p.code)).toBeVisible();
          await create.completeButton.click();
          await expect(page.getByText(/^(Xác nhận hoàn thành chuyển hàng|Cảnh báo tồn kho xuất chuyển)$/)).toBeVisible();
          const [res] = await Promise.all([
            page.waitForResponse((r) => r.request().method() !== 'GET' && /\/api\/transfers\/\d+(\/complete)?$/.test(new URL(r.url()).pathname)),
            page.getByRole('button', { name: 'Đồng ý tiếp tục' }).click(),
          ]);
          observed = `${res.request().method()} ${new URL(res.url()).pathname} → HTTP ${res.status()} ${(await res.text()).slice(0, 160)}`;
        } else observed = '(dòng phiếu không có nút Mở phiếu)';
      }
      testInfo.annotations.push({ type: 'observed', description: `${u.username}: ${observed}` });
      if (opened) await expect.soft(page.getByText(msgIssue)).toBeVisible();
      else {
        const api = await ApiSession.login(env, u.username, env.defaultPassword);
        const be = await backendError(() => api.post(`/api/transfers/${draft.id}/complete`));
        await api.dispose();
        uiBlocksAction(testInfo, 'không mở được phiếu tạm của kho K001 để xuất chuyển', msgIssue, be);
      }
      expect((await transferByCode(db, draft.code))?.status).toBe('DRAFT');
    });
    await test.step('2. Người chỉ có K001 nhận hàng vào K002', async () => {
      const u = E2E_ACCOUNTS.whK001;
      const other = await newUserContext(browser, testInfo, dialogs);
      await new LoginPage(other.page).loginOk(u.username, env.defaultPassword);
      const list = new TransferListPage(other.page);
      await list.goto();
      await list.row(moving.code).first().click();
      await expect(other.page.getByText(`Chờ ${WAREHOUSES.K002.name} nhận hàng`)).toBeVisible();
      const btn = await other.page.getByRole('button', { name: 'Nhận hàng', exact: true }).count();
      testInfo.annotations.push({ type: 'observed', description: `${u.username}: nút Nhận hàng ${btn ? 'có' : 'ẩn'}, hiện "Chờ ${WAREHOUSES.K002.name} nhận hàng"` });
      await other.context.close();
      if (!btn) {
        const api = await ApiSession.login(env, u.username, env.defaultPassword);
        const be = await backendError(() => receiveTransferViaApi(api, moving.id, vnNowPlus(2), 2));
        await api.dispose();
        uiBlocksAction(testInfo, 'nút "Nhận hàng" chỉ hiện khi kho làm việc là kho nhận', msgReceive, be);
      }
      expect((await transferByCode(db, moving.code))?.status).toBe('IN_TRANSIT');
    });
  });

  test('SYS-TRF-05 – Xuất vượt tồn: cảnh báo, đồng ý thì xuất được và tồn nguồn có thể âm', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-05', SHEET, { mismatch: 'Quyết định nhóm 10/11/2026 thay SRS E37.2 (cho xuất vượt tồn sau cảnh báo).' });
    const p = await createProduct(adminApi, { suffix: uid, price: 94_000 });
    await addStock(adminApi, p.productId, 'K001', 3);
    await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK001.username, env.defaultPassword);
    const create = new TransferCreatePage(page);
    await create.goto();
    await create.addProduct(p.code);
    await create.setQuantity(p.code, 5);
    await create.destination.selectOption({ label: WAREHOUSES.K002.name });
    const res = await create.complete();
    await test.step('KQ1. Có cảnh báo vượt tồn', async () => {
      expect(create.lastConfirmTitle).toBe('Cảnh báo tồn kho xuất chuyển');
    });
    await test.step('KQ2. Đồng ý → xuất thành công, tồn K001 âm', async () => {
      expect(res.status(), await res.text()).toBeLessThan(300);
      const t = (await res.json()) as TransferDto;
      expect((await transferByCode(db, t.transferCode))?.status).toBe('IN_TRANSIT');
      expect(await stockQty(db, p.productId, 'K001')).toBe(-2);
    });
  });

  test('SYS-TRF-06 – Nhận vượt số đã xuất bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-06', SHEET, { knownDefect: 'DEF-IT-02 (Report 5.2): không kiểm SL nhận vượt SL xuất' });
    const p = await createProduct(adminApi, { suffix: uid, price: 95_000 });
    await addStock(adminApi, p.productId, 'K001', 10);
    const t = await inTransitTransfer(adminApi, 'K001', 'K002', p.productId, 5);
    await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK002.username, env.defaultPassword);
    const list = await openReceiveScreen(page, db, t.code, t.id);
    await page.getByRole('spinbutton').fill('8');
    const res = await list.confirmReceive();
    const k2 = await stockQty(db, p.productId, 'K002');
    testInfo.annotations.push({ type: 'observed', description: `Nhận 8 / xuất 5 → HTTP ${res.status()}; trạng thái ${(await transferByCode(db, t.code))?.status}; tồn K002 ${k2}` });
    expect.soft(res.status(), 'nhận vượt số đã xuất phải bị từ chối').toBeGreaterThanOrEqual(400);
    expect.soft(k2, 'tồn K002 không được cộng số vượt').toBeLessThanOrEqual(5);
  });

  test('SYS-TRF-07 – Hàng đang kiểm kho: không xác nhận được phiếu chuyển (BR-42)', async ({}, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-07', SHEET);
    test.skip(true, 'N/A – Khoá kiểm kho chưa áp dụng cho chuyển hàng (Note: c60ea62)');
  });

  test('SYS-TRF-08 – Nhận thiếu: bắt buộc ghi chú, lưu chênh lệch và hoàn tất phiếu', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-TRF-08', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 96_000 });
    await addStock(adminApi, p.productId, 'K001', 40);
    const t = await inTransitTransfer(adminApi, 'K001', 'K002', p.productId, 30);
    const note = `Thiếu 5 do vỡ khi vận chuyển ${uid}`;
    await new LoginPage(page).loginOk(E2E_ACCOUNTS.whK002.username, env.defaultPassword);
    const list = await openReceiveScreen(page, db, t.code, t.id);
    await page.getByRole('spinbutton').fill('25');
    await test.step('1. Không ghi chú → "Phát hiện nhận thiếu hàng! ..."', async () => {
      await page.getByRole('button', { name: 'Nhận hàng', exact: true }).last().click();
      await expect(page.getByText(/^Phát hiện nhận thiếu hàng! /)).toBeVisible();
      expect((await transferByCode(db, t.code))?.status).toBe('IN_TRANSIT');
    });
    await test.step('2. Có ghi chú → RECEIVED với 25, lưu ghi chú', async () => {
      await page.getByPlaceholder('Nhập lý do nhận thiếu hàng (bắt buộc)...').fill(note);
      const res = await list.confirmReceive();
      expect(res.status(), await res.text()).toBeLessThan(300);
      expect((await transferByCode(db, t.code))?.status).toBe('RECEIVED');
      expect((await transferItems(db, t.id)).map((i) => Number(i.received_quantity))).toEqual([25]);
      expect((await transferNotes(db, t.id)).receive_notes).toBe(note);
      expect(await stockQty(db, p.productId, 'K002')).toBe(25);
    });
  });
});
