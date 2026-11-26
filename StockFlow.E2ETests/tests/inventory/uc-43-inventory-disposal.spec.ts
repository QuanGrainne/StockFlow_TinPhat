// Report 5.3 – sheet "UC-43 Inventory Disposal" (SYS-DSP-01..04). Actor "Warehouse Accountant" = whstaff01 (kho làm việc K001).
// Code: Hoàn thành trừ tồn ngay (không có "Chờ duyệt"); Lưu tạm = Phiếu tạm sửa / hủy được.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { DisposalFormPage, DocListPage } from '../../pages/InventoryPages';
import { SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct } from '../../fixtures/data';
import { disposalByCode, disposalsOfProduct, stockQty } from '../../fixtures/dbq';
import { backendError } from '../../fixtures/ui';

const SHEET = 'UC-43 Inventory Disposal';
const USER = SEEDED.warehouse.username;

interface DisposalDto {
  summary: { disposalId: number; disposalCode: string };
}

test.describe(SHEET, () => {
  test('SYS-DSP-01 – Hoàn thành phiếu xuất hủy: phiếu COMPLETED, trừ tồn ngay @p1', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-DSP-01', SHEET, { mismatch: 'Description: chờ Manager duyệt; code: hoàn thành và trừ tồn ngay.' });
    const p = await createProduct(adminApi, { suffix: uid, price: 61_000 });
    await addStock(adminApi, p.productId, 'K001', 10);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = new DisposalFormPage(page);
    await form.goto();
    await form.addProduct(p.code);
    await form.setQty(p.code, 2);
    await form.reason.fill(`Hàng vỡ khi vận chuyển ${uid}`);
    const res = await form.complete();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    const code = ((await res?.json()) as DisposalDto).summary.disposalCode;
    await expect(page.getByText(`Đã hoàn thành phiếu xuất hủy ${code}`)).toBeVisible();
    const d = await disposalByCode(db, code);
    expect(d?.status).toBe('COMPLETED');
    expect(d?.reason).toBe(`Hàng vỡ khi vận chuyển ${uid}`);
    expect(await stockQty(db, p.productId, 'K001')).toBe(8);
  });

  test('SYS-DSP-02 – Lưu tạm, sửa rồi hủy phiếu xuất hủy', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-DSP-02', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 62_000 });
    await addStock(adminApi, p.productId, 'K001', 10);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = new DisposalFormPage(page);
    let code = '';
    await test.step('1a. Lưu tạm', async () => {
      await form.goto();
      await form.addProduct(p.code);
      await form.setQty(p.code, 2);
      const res = await form.saveDraft();
      expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
      code = ((await res?.json()) as DisposalDto).summary.disposalCode;
      await expect(page.getByText(`Đã lưu tạm phiếu xuất hủy ${code}`)).toBeVisible();
      expect((await disposalByCode(db, code))?.status).toBe('DRAFT');
    });
    const list = DocListPage.disposals(page);
    await test.step('1b. Mở phiếu tạm, sửa SL 3 và lưu', async () => {
      await list.goto();
      await list.open(code);
      await page.getByRole('button', { name: 'Mở phiếu', exact: true }).click();
      await expect(form.line(p.code)).toBeVisible();
      await form.setQty(p.code, 3);
      const res = await form.saveDraft();
      expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
      expect((await disposalsOfProduct(db, p.productId)).map((x) => [x.disposal_code, x.status, Number(x.quantity)])).toEqual([[code, 'DRAFT', 3]]);
    });
    await test.step('1c. Hủy phiếu → CANCELLED', async () => {
      await list.goto();
      await list.open(code);
      const res = await list.cancel(/\/api\/disposals\/\d+\/cancel$/i);
      expect(res.status(), await res.text()).toBeLessThan(300);
      expect((await disposalByCode(db, code))?.status).toBe('CANCELLED');
      expect(await stockQty(db, p.productId, 'K001')).toBe(10);
    });
  });

  test('SYS-DSP-03 – SL hủy 0 hoặc vượt tồn bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-DSP-03', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 63_000 });
    await addStock(adminApi, p.productId, 'K001', 4);
    const msgZero = 'Số lượng hủy phải lớn hơn 0.';
    const msgOver = `Hàng ${p.code} - ${p.name} chỉ còn 4 trong kho, không thể hủy 6.`;
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = new DisposalFormPage(page);
    await form.goto();
    await form.addProduct(p.code);
    await form.reason.fill(`E2E ${uid}`);
    const api = await ApiSession.login(env, USER, env.defaultPassword);
    const post = (qty: number) => () =>
      api.post('/api/disposals', { warehouseId: WAREHOUSES.K001.id, reason: 'E2E', status: 'COMPLETED', items: [{ productId: p.productId, quantity: qty }] });
    try {
      await test.step(`1a. SL 0 → "${msgZero}"`, async () => {
        await form.setQty(p.code, 0);
        const toast = page.getByText(new RegExp(`^Hàng ${p.code} chưa nhập số lượng hủy\\.$|^Số lượng hủy phải lớn hơn 0\\.$`));
        const [res] = await Promise.all([form.complete(), expect(toast).toBeVisible()]);
        expect(res).toBeNull();
        testInfo.annotations.push({ type: 'observed', description: `SL 0: "${(await toast.innerText()).trim()}"; backend: "${await backendError(post(0))}"` });
        await expect.soft(page.getByText(msgZero, { exact: true })).toBeVisible({ timeout: 1_000 });
      });
      await test.step('1b. SL vượt tồn (6 / 4) → thông báo BR', async () => {
        await form.setQty(p.code, 6);
        const toast = page.getByText(/chỉ còn 4 trong kho, không thể hủy 6\.$/);
        const [res] = await Promise.all([form.complete(), expect(toast).toBeVisible()]);
        expect(res).toBeNull();
        testInfo.annotations.push({ type: 'observed', description: `SL 6: "${(await toast.innerText()).trim()}"; backend: "${await backendError(post(6))}"` });
        await expect.soft(page.getByText(msgOver, { exact: true })).toBeVisible({ timeout: 1_000 });
      });
    } finally {
      await api.dispose();
    }
    expect(await disposalsOfProduct(db, p.productId)).toEqual([]);
    expect(await stockQty(db, p.productId, 'K001')).toBe(4);
  });

  test('SYS-DSP-04 – Không có lý do: nhắc nhập lý do, không hoàn thành phiếu', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-DSP-04', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 64_000 });
    await addStock(adminApi, p.productId, 'K001', 5);
    await new LoginPage(page).loginOk(USER, env.defaultPassword);
    const form = new DisposalFormPage(page);
    await form.goto();
    await form.addProduct(p.code);
    await form.setQty(p.code, 1);
    const [res] = await Promise.all([form.complete(), expect(page.getByText('Vui lòng nhập lý do xuất hủy trước khi hoàn thành phiếu.', { exact: true })).toBeVisible()]);
    expect(res).toBeNull();
    expect(await disposalsOfProduct(db, p.productId)).toEqual([]);
    expect(await stockQty(db, p.productId, 'K001')).toBe(5);
  });
});
