// Report 5.3 – sheet "UC-62 Sales and Credit" (SYS-MSC-01..09). Actor Manager = manager01; MSC-07 thêm e2e.manager2 (Manager thứ hai).
// Duyệt hạn mức ở /approvals (hộp quyết định chỉ có "Duyệt nâng hạn mức" và "Từ chối"). MSC-01 kiểm trên màn Báo cáo; ca MSC-08, 09 (đã xoá 27/11/2026: chức năng nhóm bỏ, Report 3 ghi ngoài phạm vi).
import { openReports } from '../../fixtures/reports';
import { test, expect, traceTc, newUserContext } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { ApprovalsPage } from '../../pages/SalesPages';
import { PosPage } from '../../pages/PosPage';
import { E2E_ACCOUNTS, SEEDED } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct, type ProductDto } from '../../fixtures/data';
import { createBooking, createCreditRequest, createCustomer, createInvoice, setCreditLimit, type CustomerDto } from '../../fixtures/sales';
import { creditHistory, creditRequestsOf, partnerById } from '../../fixtures/dbq3';
import { userByUsername } from '../../fixtures/dbq';
import { backendError, readToast, uiBlocksAction } from '../../fixtures/ui';
import type { E2EEnv } from '../../fixtures/env';
import type { Page } from '@playwright/test';

const SHEET = 'UC-62 Sales and Credit';
const USER = SEEDED.manager.username;
const priceOf = (uid: string, base: number): number => base + (Number(uid.replace(/\D/g, '').slice(-3)) % 900) * 10;

interface Ctx {
  p: ProductDto;
  c: CustomerDto;
  price: number;
  reqCode: string;
}

/** Khách hạn mức 100.000, nhân viên bán hàng gửi yêu cầu duyệt vượt hạn mức cho đơn giá `price` */
async function arrangeRequest(env: E2EEnv, adminApi: ApiSession, db: Parameters<typeof creditRequestsOf>[0], uid: string, base: number): Promise<Ctx> {
  const price = priceOf(uid, base);
  const p = await createProduct(adminApi, { suffix: uid, price });
  await addStock(adminApi, p.productId, 'K001', 20);
  const c = await createCustomer(adminApi, { suffix: uid });
  await setCreditLimit(adminApi, c.partnerId, 100_000);
  const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
  await createCreditRequest(sales, { partnerId: c.partnerId, expectedNewDebt: price, requestedLimit: price + 100_000, reason: `E2E ${uid}` });
  await sales.dispose();
  const reqCode = (await creditRequestsOf(db, c.partnerId))[0].request_code ?? c.name;
  return { p, c, price, reqCode };
}

async function openRequest(page: Page, env: E2EEnv, reqCode: string, user: string = USER): Promise<ApprovalsPage> {
  await new LoginPage(page).loginOk(user, env.defaultPassword);
  const ap = new ApprovalsPage(page);
  await ap.goto();
  await ap.open(reqCode);
  return ap;
}

test.describe(SHEET, () => {
  test('SYS-MSC-01 – Tổng quan Bán hàng & Tín dụng', async ({ page, env }, testInfo) => {
    traceTc(testInfo, 'SYS-MSC-01', SHEET);
    // Expected Round 2 (27/11/2026): tổng quan là tab Tổng quan của màn Báo cáo – KPI bán hàng và số yêu cầu hạn mức chờ duyệt
    // (theo dõi xuất kho theo đơn không có vì POS xuất trực tiếp, xem SYS-MSC-08)
    await openReports(page, SEEDED.manager.username, env.defaultPassword);
    for (const k of ['Doanh thu thuần', 'Lợi nhuận gộp', 'Số hóa đơn', 'Phải thu khách hàng']) await expect(page.getByText(k, { exact: true }).first()).toBeVisible();
    const pending = page.getByRole('link', { name: /Yêu cầu hạn mức chờ duyệt/ }).or(page.getByText('Yêu cầu hạn mức chờ duyệt', { exact: true })).first();
    await expect(pending).toBeVisible();
  });

  test('SYS-MSC-02 – Đơn chờ xử lý và đơn đã gộp hiện theo khách, giá trị, trạng thái', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MSC-02', SHEET, { mismatch: 'Code: xem ở màn Hóa đơn và Đặt hàng (không có màn riêng).' });
    const price = priceOf(uid, 61_000);
    const p = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, p.productId, 'K001', 20);
    const c = await createCustomer(adminApi, { suffix: uid });
    await setCreditLimit(adminApi, c.partnerId, 10_000_000);
    const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
    const inv = await createInvoice(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 2, price }], paid: 0, requestId: `msc02-${uid}` });
    const bk = await createBooking(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 1, price: price + 10 }] });
    await sales.dispose();
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    await test.step('1a. Hóa đơn (/orders)', async () => {
      await page.goto('/orders');
      const row = page.getByRole('row').filter({ hasText: inv.orderCode }).first();
      await expect(row).toBeVisible();
      await expect(row).toContainText(c.name);
      await expect(row).toContainText((2 * price).toLocaleString('vi-VN'));
      testInfo.annotations.push({ type: 'observed', description: `Hóa đơn: ${(await row.innerText()).replace(/\s+/g, ' ')}` });
    });
    await test.step('1b. Đặt hàng (/sales-booking)', async () => {
      await page.goto('/sales-booking');
      const row = page.getByRole('row').filter({ hasText: bk.orderCode }).first();
      await expect(row).toBeVisible();
      await expect(row).toContainText(c.name);
      await expect(row).toContainText((price + 10).toLocaleString('vi-VN'));
      testInfo.annotations.push({ type: 'observed', description: `Đơn đặt: ${(await row.innerText()).replace(/\s+/g, ' ')}` });
    });
  });

  test('SYS-MSC-03 – Duyệt yêu cầu: ghi người duyệt, thời gian, nhân viên thấy kết quả @p1', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-MSC-03', SHEET, { mismatch: 'Hộp quyết định không có "Duyệt giao dịch này" (chỉ duyệt nâng hạn mức hoặc từ chối).' });
    const { c, price, reqCode } = await arrangeRequest(env, adminApi, db, uid, 300_000);
    const ap = await openRequest(page, env, reqCode);
    expect(await ap.decide('Duyệt nâng hạn mức', `E2E duyệt ${uid}`, price + 100_000)).toBe(200);
    const r = (await creditRequestsOf(db, c.partnerId))[0];
    expect(r.status).toBe('APPROVED');
    expect(r.approved_by).toBe((await userByUsername(db, USER))?.user_id);
    expect(r.approval_date).toBeTruthy();
    const s = await newUserContext(browser, testInfo, dialogs);
    await new LoginPage(s.page).loginOk(SEEDED.sales.username, env.defaultPassword);
    const pos = new PosPage(s.page);
    await pos.goto();
    await pos.selectCustomer(c.name);
    await s.page.getByRole('button', { name: 'Hạn mức còn lại' }).click();
    await expect(s.page.getByText(/Đã duyệt/).first()).toBeVisible();
    await s.context.close();
  });

  test('SYS-MSC-04 – Duyệt hạn mức mới: cập nhật hạn mức khách, thêm lịch sử', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MSC-04', SHEET);
    const { c, price, reqCode } = await arrangeRequest(env, adminApi, db, uid, 310_000);
    const newLimit = price + 250_000;
    const ap = await openRequest(page, env, reqCode);
    expect(await ap.decide('Duyệt nâng hạn mức', `E2E nâng ${uid}`, newLimit)).toBe(200);
    expect(Number((await partnerById(db, c.partnerId))?.credit_limit)).toBe(newLimit);
    const hist = await creditHistory(db, c.partnerId);
    testInfo.annotations.push({ type: 'observed', description: `Lịch sử hạn mức: ${JSON.stringify(hist)}` });
    expect(hist.some((h) => Number(h.new_limit) === newLimit)).toBe(true);
  });

  test('SYS-MSC-05 – Từ chối kèm lý do: nhân viên thấy lý do', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-MSC-05', SHEET);
    const { c, reqCode } = await arrangeRequest(env, adminApi, db, uid, 320_000);
    const reason = `Khách nợ quá hạn ${uid}`;
    const ap = await openRequest(page, env, reqCode);
    expect(await ap.decide('Từ chối', reason)).toBe(200);
    expect((await creditRequestsOf(db, c.partnerId))[0].status).toBe('REJECTED');
    const s = await newUserContext(browser, testInfo, dialogs);
    await new LoginPage(s.page).loginOk(SEEDED.sales.username, env.defaultPassword);
    const pos = new PosPage(s.page);
    await pos.goto();
    await pos.selectCustomer(c.name);
    await s.page.getByRole('button', { name: 'Hạn mức còn lại' }).click();
    await expect(s.page.getByText('Từ chối').first()).toBeVisible();
    await expect(s.page.getByText(reason)).toBeVisible();
    await s.context.close();
  });

  test('SYS-MSC-06 – Từ chối không lý do / hạn mức mới thấp hơn hạn mức hiện tại bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MSC-06', SHEET);
    const { c, reqCode } = await arrangeRequest(env, adminApi, db, uid, 330_000);
    const ap = await openRequest(page, env, reqCode);
    await test.step('1a. Từ chối không lý do → "Vui lòng nhập lý do từ chối (E62.1)."', async () => {
      const [status, text] = await Promise.all([ap.decide('Từ chối'), readToast(page.getByText('Vui lòng nhập lý do từ chối (E62.1).').first())]);
      expect(status).toBeNull();
      expect(text).toBe('Vui lòng nhập lý do từ chối (E62.1).');
    });
    await test.step('1b. Duyệt với hạn mức thấp hơn hạn mức hiện tại → thông báo', async () => {
      await page.keyboard.press('Escape');
      await ap.goto();
      await ap.open(reqCode);
      const [status, text] = await Promise.all([ap.decide('Duyệt nâng hạn mức', undefined, 50_000), readToast(page.getByText(/thấp hơn hạn mức hiện tại/).first())]);
      testInfo.annotations.push({ type: 'observed', description: `Hạn mức 50.000 < 100.000: HTTP ${status ?? '(không gửi)'}; "${text}"` });
      expect(status === null || status >= 400).toBe(true);
    });
    expect((await creditRequestsOf(db, c.partnerId))[0].status).toBe('PENDING');
  });

  test('SYS-MSC-07 – Yêu cầu đã được người khác xử lý: báo MSG57 và làm mới danh sách', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-MSC-07', SHEET);
    const { c, price, reqCode } = await arrangeRequest(env, adminApi, db, uid, 340_000);
    const ap = await openRequest(page, env, reqCode);
    await test.step('Manager thứ hai duyệt trước', async () => {
      const other = await newUserContext(browser, testInfo, dialogs);
      const ap2 = await openRequest(other.page, env, reqCode, E2E_ACCOUNTS.manager2.username);
      expect(await ap2.decide('Duyệt nâng hạn mức', 'E2E manager2', price + 100_000)).toBe(200);
      await other.context.close();
    });
    await test.step('1. manager01 quyết định trên màn chưa làm mới → "Yêu cầu này đã được xử lý (MSG57)."', async () => {
      const expected = 'Yêu cầu này đã được xử lý (MSG57).';
      await page.getByRole('button', { name: 'Từ chối', exact: true }).first().click();
      const msg = page.getByText(/MSG57/).first();
      const processed = page.getByRole('heading', { name: `Yêu cầu hạn mức ${reqCode}`, level: 3 });
      await expect(msg.or(processed).first()).toBeVisible();
      const shown = await msg.count();
      const rowText = (await ap.row(reqCode).first().innerText()).replace(/\s+/g, ' ').slice(0, 160);
      testInfo.annotations.push({ type: 'observed', description: `Bấm Từ chối trên dòng cũ: ${shown ? 'hiện MSG57' : 'hộp chi tiết tải trạng thái mới: ' + (await page.getByText(/Người xử lý/).first().innerText().catch(() => '(không đọc được)')).replace(/s+/g, ' ').slice(0, 160)}; dòng danh sách: "${rowText}"` });
      if (!shown) {
        const id = (await creditRequestsOf(db, c.partnerId))[0].request_id;
        const mgr = await ApiSession.login(env, USER, env.defaultPassword);
        const be = await backendError(() => mgr.post(`/api/credit-requests/${id}/reject`, { reason: `E2E muộn ${uid}` }));
        await mgr.dispose();
        uiBlocksAction(testInfo, 'mở yêu cầu luôn tải trạng thái mới nên không gửi được quyết định trùng', expected, be);
      }
    });
    expect((await creditRequestsOf(db, c.partnerId))[0].status).toBe('APPROVED');
  });

});
