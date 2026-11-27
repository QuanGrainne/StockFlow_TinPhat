// Report 5.3 – sheet "UC-29 Customer Debt" (SYS-DEB-01..03). Ca DEB-02 (đã xoá 27/11/2026: chức năng nhóm bỏ, Report 3 ghi ngoài phạm vi).
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { CustomersPage } from '../../pages/SalesPages';
import { SEEDED } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct } from '../../fixtures/data';
import { createCustomer, createInvoice, setCreditLimit } from '../../fixtures/sales';
import { queryRows } from '../../fixtures/pg';

const SHEET = 'UC-29 Customer Debt';
const vnd = (n: number): string => n.toLocaleString('vi-VN');

test.describe(SHEET, () => {

  test('SYS-DEB-01 – Khách có nợ: hiện dư nợ, hạn mức, tín dụng còn lại; chứng từ chưa thanh toán và phiếu thu', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-DEB-01', SHEET, { mismatch: 'Nợ quá hạn chưa có (SPEC FR-CRD-01 Một phần); kiểm dư nợ, hạn mức, tín dụng còn lại và chứng từ.' });
    const price = 100_000 + (Number(uid.replace(/\D/g, '').slice(-3)) % 900) * 10;
    const p = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, p.productId, 'K001', 10);
    const c = await createCustomer(adminApi, { suffix: uid });
    const limit = 5_000_000;
    await setCreditLimit(adminApi, c.partnerId, limit);
    const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
    const inv = await createInvoice(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 3, price }], paid: 0, requestId: `deb-${uid}` });
    await sales.dispose();
    const paid = 100_000;
    const receipt = await adminApi.post<Record<string, unknown>>(`/api/customers/${c.partnerId}/payments`, { amount: paid, paymentMethod: 'CASH', notes: 'E2E thu nợ' });
    const receiptCode = String(receipt.voucherCode ?? receipt.code ?? receipt.txCode ?? '');
    const debt = 3 * price - paid;
    const dbDebt = Number((await queryRows<{ d: string }>(db, 'SELECT current_debt::text AS d FROM stockflow.mst_business_partners WHERE partner_id = $1', [c.partnerId]))[0].d);
    expect(dbDebt, 'dư nợ trong DB').toBe(debt);

    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    const cp = new CustomersPage(page);
    await test.step('1. Mở Khách hàng (/customers)', async () => {
      await cp.goto();
      await cp.search.fill(c.code);
      await expect(cp.row(c.code)).toHaveCount(1);
    });
    await test.step('KQ1. Hiện dư nợ, hạn mức', async () => {
      await expect(cp.row(c.code)).toContainText(vnd(debt));
      await expect(cp.row(c.code)).toContainText(vnd(limit));
    });
    await test.step('2. Mở khách có nợ → KQ1. tín dụng còn lại; KQ2. hóa đơn chưa thanh toán và phiếu thu', async () => {
      await cp.expand(c.code);
      const available = page.getByText(vnd(limit - debt)).first();
      testInfo.annotations.push({ type: 'observed', description: `Tín dụng còn lại ${vnd(limit - debt)} ${(await available.isVisible()) ? 'có' : 'KHÔNG'} hiển thị ở tab Thông tin` });
      await expect.soft(available, 'tín dụng còn lại').toBeVisible();
      await page.getByRole('button', { name: 'Nợ cần thu từ khách' }).click();
      await expect(page.getByText(inv.orderCode).first()).toBeVisible();
      if (receiptCode) await expect(page.getByText(receiptCode).first()).toBeVisible();
      testInfo.annotations.push({ type: 'observed', description: `Phiếu thu: ${receiptCode || JSON.stringify(receipt).slice(0, 160)}` });
    });
  });

  test('SYS-DEB-03 – Lọc không có kết quả: danh sách rỗng và thông báo không có dữ liệu', async ({ page, env }, testInfo) => {
    traceTc(testInfo, 'SYS-DEB-03', SHEET);
    await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    const cp = new CustomersPage(page);
    await cp.goto();
    await cp.search.fill('zzzz-no-match');
    await expect(cp.dataRows()).toHaveCount(0);
    await expect(page.getByText(/Không tìm thấy/).first()).toBeVisible();
  });
});
