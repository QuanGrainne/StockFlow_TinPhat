// Report 5.3 – sheet "UC-51 Master Data" (SYS-MST-01..20). Actor Manager = manager01. MST-16 là N/A theo Note.
// Kho (/warehouses → /roles/warehouses) thuộc chức năng "Phân quyền kho" chỉ của Admin: ghi theo quy ước UI chặn thao tác.
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { BomPage, CustomersAdminPage, ProductsPage, SuppliersPage, fieldAfter } from '../../pages/MasterDataPages';
import { PosPage } from '../../pages/PosPage';
import { SEEDED } from '../../fixtures/accounts';
import { ApiSession } from '../../fixtures/api';
import { addStock, createProduct } from '../../fixtures/data';
import { createCustomer, createInvoice, phoneFrom, setCreditLimit } from '../../fixtures/sales';
import { bomsOfProduct, creditHistory, partnerById, partnersByName, productActive, productByName, productVariantsJson, productsLike, unitConversions } from '../../fixtures/dbq3';
import { backendError, readToast, uiBlocksAction } from '../../fixtures/ui';
import type { Page } from '@playwright/test';

const SHEET = 'UC-51 Master Data';
const USER = SEEDED.manager.username;
const NO_WH = 'Bạn không có quyền truy cập chức năng này';

async function login(page: Page, env: { defaultPassword: string }): Promise<void> {
  await new LoginPage(page).loginOk(USER, env.defaultPassword);
}

const num = (s: string | null | undefined): number => Number(s ?? 0);

/** Mở /warehouses và chờ rõ kết quả: bị từ chối (không có chức năng Phân quyền kho) hoặc màn Kho hiện nút "Thêm cơ sở kho" */
async function openWarehouses(page: Page): Promise<boolean> {
  await page.goto('/warehouses');
  const deniedH = page.getByRole('heading', { name: NO_WH });
  await expect(deniedH.or(page.getByRole('button', { name: 'Thêm cơ sở kho' })).first()).toBeVisible();
  return deniedH.isVisible();
}


test.describe(SHEET, () => {
  test('SYS-MST-01 – Mỗi màn danh mục mở được', async ({ page, env }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-01', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Kết quả lưu của từng màn kiểm ở MST-02, 09, 10, 13, 18' });
    await login(page, env);
    const screens: [string, string][] = [
      ['Hàng hóa', '/products'],
      ['Khách hàng', '/customers'],
      ['Nhà cung cấp', '/suppliers'],
      ['Kho', '/warehouses'],
      ['BOM', '/bom'],
      ['Bảng giá', '/price-books'],
    ];
    const seen: string[] = [];
    for (const [name, url] of screens) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
      const denied = await page.getByRole('heading', { name: NO_WH }).count();
      const h1 = (await page.getByRole('heading', { level: 1 }).first().innerText().catch(() => '')).trim();
      seen.push(`${name} ${url} → ${new URL(page.url()).pathname}: ${denied ? 'KHÔNG CÓ QUYỀN' : h1}`);
      expect.soft(denied, `${name} mở được với Manager`).toBe(0);
    }
    testInfo.annotations.push({ type: 'observed', description: seen.join(' | ') });
  });

  test('SYS-MST-02 – Tạo và sửa hàng hóa (mã, tên, nhóm, đơn vị, giá bán, định mức tồn) @p1', async ({ page, env, db, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-02', SHEET);
    const name = `Hàng E2E MST02 ${uid}`;
    await login(page, env);
    const pp = new ProductsPage(page);
    await test.step('1. Tạo hàng hóa', async () => {
      await pp.goto();
      await pp.openCreate();
      await pp.name.fill(name);
      await pp.chooseGroup('Thành phẩm');
      await pp.salePrice.fill('55000');
      await pp.minStock.fill('5');
      testInfo.annotations.push({ type: 'observed', description: `Form không có ô "theo lô" / loại hàng; ô loại hàng: ${await page.getByText(/theo lô|Quản lý lô/i).count()}` });
      const res = await pp.save();
      expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
      await expect(page.getByText(`Tạo mới hàng hóa thành công: ${name}`)).toBeVisible();
      const p = await productByName(db, name);
      expect([num(p?.standard_price), num(p?.min_safe_stock)]).toEqual([55_000, 5]);
    });
    await test.step('2. Sửa giá bán', async () => {
      const p = await productByName(db, name);
      await pp.goto();
      await pp.expand(p?.product_code ?? '');
      await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).first().click();
      await expect(page.getByRole('heading', { name: 'Chỉnh sửa hàng hóa', level: 3 })).toBeVisible();
      await pp.salePrice.fill('58000');
      const res = await pp.save();
      expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
      await expect(page.getByText(`Đã cập nhật hàng hóa: ${name}`)).toBeVisible();
      expect(num((await productByName(db, name))?.standard_price)).toBe(58_000);
    });
  });

  test('SYS-MST-03 – Lưu hàng hóa thiếu tên bị từ chối', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-03', SHEET);
    const expected = 'Tên hàng hóa không được để trống.';
    dialogs.expect(/Tên hàng/);
    await login(page, env);
    const pp = new ProductsPage(page);
    await pp.goto();
    await pp.openCreate();
    await pp.chooseGroup('Thành phẩm');
    expect(await pp.save(3_000)).toBeNull();
    await expect.poll(() => dialogs.seen.map((d) => d.message).join(' | ')).toMatch(/Tên hàng/);
    const shown = dialogs.seen.map((d) => d.message).join(' | ');
    const be = await backendError(() => adminApi.post('/api/products', { code: `E2EX${uid.replace(/\D/g, '')}`, name: '', type: 'FINISHED', categoryId: 1, baseUnitId: 1, standardPrice: 1 }));
    testInfo.annotations.push({ type: 'observed', description: `Thông báo: "${shown}"; backend: "${be}"` });
    expect.soft(shown, 'câu thông báo').toBe(expected);
    expect(await productsLike(db, `%${uid}%`)).toEqual([]);
  });

  test('SYS-MST-04 – Trùng mã hàng hóa bị từ chối', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-04', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 44_000 });
    const expected = `Mã hàng hóa '${p.code}' đã tồn tại trong hệ thống.`;
    dialogs.expect(/đã tồn tại/);
    await login(page, env);
    const pp = new ProductsPage(page);
    await pp.goto();
    await pp.openCreate();
    await pp.code.fill(p.code);
    await pp.name.fill(`Trùng mã ${uid}`);
    await pp.chooseGroup('Thành phẩm');
    const res = await pp.save(4_000);
    const shown = (await expect.poll(() => dialogs.seen.map((d) => d.message).join(' | ')).toMatch(/đã tồn tại/).then(() => dialogs.seen.map((d) => d.message).join(' | ')))
      || (await page.getByText(/đã tồn tại/).first().innerText().catch(() => ''));
    testInfo.annotations.push({ type: 'observed', description: `HTTP ${res?.status() ?? '(không gửi)'}; thông báo: "${shown}"` });
    expect.soft(shown, 'câu thông báo').toBe(expected);
    expect((await productsLike(db, `Trùng mã ${uid}`)).length).toBe(0);
  });

  test('SYS-MST-05 – Xóa hàng đã có giao dịch bị từ chối, gợi ý Ngừng kinh doanh', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-05', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 45_000 + (Number(uid.replace(/\D/g, '').slice(-3)) % 500) * 10 });
    await addStock(adminApi, p.productId, 'K001', 5);
    const c = await createCustomer(adminApi, { suffix: uid });
    await setCreditLimit(adminApi, c.partnerId, 5_000_000);
    const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
    await createInvoice(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 1, price: p.standardPrice }], paid: 0, requestId: `mst05-${uid}` });
    await sales.dispose();
    dialogs.expect(/.*/);
    await login(page, env);
    const pp = new ProductsPage(page);
    await pp.goto();
    await pp.search(p.code);
    await pp.row(p.code).getByTitle(/Xóa hàng hóa|chỉ cho phép ngừng kinh doanh/).first().click();
    await expect.poll(() => dialogs.seen.length, { message: 'hộp xác nhận' }).toBeGreaterThanOrEqual(2);
    const msgs = dialogs.seen.map((d) => d.message);
    testInfo.annotations.push({ type: 'observed', description: msgs.join(' || ').slice(0, 600) });
    expect(msgs.some((m) => /Không thể xóa/.test(m) && /Ngừng kinh doanh/.test(m))).toBe(true);
    expect(await productActive(db, p.productId), 'hàng không bị xóa (đồng ý gợi ý → ngừng kinh doanh)').not.toBeNull();
  });

  test('SYS-MST-06 – Ngừng kinh doanh: còn trong lịch sử, POS không bán được', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-06', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 46_000 + (Number(uid.replace(/\D/g, '').slice(-3)) % 500) * 10 });
    await addStock(adminApi, p.productId, 'K001', 5);
    const c = await createCustomer(adminApi, { suffix: uid });
    await setCreditLimit(adminApi, c.partnerId, 5_000_000);
    const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
    const inv = await createInvoice(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 1, price: p.standardPrice }], paid: 0, requestId: `mst06-${uid}` });
    dialogs.expect(/Ngừng kinh doanh/);
    await login(page, env);
    const pp = new ProductsPage(page);
    await test.step('1. Ngừng kinh doanh', async () => {
      await pp.goto();
      await pp.expand(p.code);
      await page.getByRole('button', { name: 'Ngừng kinh doanh', exact: true }).first().click();
      await expect(page.getByText(`Đã ngừng kinh doanh ${p.code}`)).toBeVisible();
      expect(await productActive(db, p.productId)).toBe(false);
    });
    await test.step('2a. Chứng từ cũ vẫn hiện hàng', async () => {
      await page.goto(`/orders/${inv.orderId}`);
      await expect(page.getByText(p.code).first()).toBeVisible();
    });
    await test.step('2b. POS không bán được (POS-003)', async () => {
      const ctx = await browser.newContext({ baseURL: testInfo.project.use.baseURL, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
      const sp = await ctx.newPage();
      await new LoginPage(sp).loginOk(SEEDED.sales.username, env.defaultPassword);
      const pos = new PosPage(sp);
      await pos.goto();
      const added = await pos.addProduct(p.code).then(() => true).catch(() => false);
      testInfo.annotations.push({ type: 'observed', description: `Tìm ${p.code} trên POS: ${added ? 'thêm được vào giỏ' : 'không có trong kết quả tìm'}` });
      if (!added) {
        const be = await backendError(() => createInvoice(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 1, price: p.standardPrice }], paid: 0, requestId: `mst06b-${uid}` }));
        uiBlocksAction(testInfo, 'POS không liệt kê hàng ngừng kinh doanh khi tìm', 'POS-003', be);
      } else {
        const res = await pos.tryPay(6_000);
        testInfo.annotations.push({ type: 'observed', description: `Thanh toán: HTTP ${res?.status()} ${res ? (await res.text()).slice(0, 200) : ''}` });
        expect(res?.status()).toBeGreaterThanOrEqual(400);
      }
      await ctx.close();
    });
    await sales.dispose();
  });

  test('SYS-MST-07 – Đơn vị quy đổi của hàng hóa được lưu', async ({ page, env, db, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-07', SHEET, { mismatch: 'Code: quy đổi chỉ khai trong form hàng hóa (Thiết lập đơn vị tính và thuộc tính).' });
    const name = `Hàng E2E MST07 ${uid}`;
    await login(page, env);
    const pp = new ProductsPage(page);
    await pp.goto();
    await pp.openCreate();
    await pp.name.fill(name);
    await pp.chooseGroup('Thành phẩm');
    await pp.modal.locator('xpath=.//*[contains(normalize-space(text()),"Quản lý theo đơn vị tính và thuộc tính")]/following::button[normalize-space()="Thiết lập"][1]').click();
    await page.getByRole('button', { name: 'Thêm đơn vị' }).click();
    await page.getByPlaceholder('Tự nhập ĐVT (Lốc, Thùng...)').fill('Thùng');
    await page.getByPlaceholder('Tự nhập ĐVT (Lốc, Thùng...)').locator('xpath=following::input[1]').fill('12');
    await page.getByRole('button', { name: 'Lưu đơn vị' }).click();
    await page.getByRole('button', { name: 'Xong', exact: true }).click();
    const res = await pp.save();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    const p = await productByName(db, name);
    const conv = await unitConversions(db, p?.product_id ?? -1);
    const variants = await productsLike(db, `%MST07 ${uid}%`);
    const json = (await productVariantsJson(db, p?.product_id ?? -1)) ?? '';
    testInfo.annotations.push({ type: 'observed', description: `mst_unit_conversions: ${JSON.stringify(conv)}; hàng hóa sinh ra: ${JSON.stringify(variants)}; variants_json: ${json.slice(0, 300)}` });
    // variants_json do .NET ghi (chữ có dấu dạng \uXXXX): JSON.parse giải mã rồi mới tìm đơn vị Thùng hệ số 12
    let decoded = json;
    try {
      decoded = JSON.stringify(JSON.parse(json || 'null'));
    } catch {
      decoded = json;
    }
    const inJson = /Th.{1,3}ng/.test(decoded) && /"conversionRate":12(\.0+)?\b/i.test(decoded);
    expect(conv.some((x) => num(x.conversion_factor) === 12) || variants.length > 1 || inJson, 'quy đổi 1 Thùng = 12 được lưu cùng hàng hóa').toBe(true);
  });

  test('SYS-MST-08 – Hệ số quy đổi 0 hoặc âm bị từ chối', async ({ page, env, db, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-08', SHEET);
    dialogs.expect(/.*/);
    const name = `Hàng E2E MST08 ${uid}`;
    await login(page, env);
    const pp = new ProductsPage(page);
    await pp.goto();
    await pp.openCreate();
    await pp.name.fill(name);
    await pp.chooseGroup('Thành phẩm');
    await pp.modal.locator('xpath=.//*[contains(normalize-space(text()),"Quản lý theo đơn vị tính và thuộc tính")]/following::button[normalize-space()="Thiết lập"][1]').click();
    await page.getByRole('button', { name: 'Thêm đơn vị' }).click();
    await page.getByPlaceholder('Tự nhập ĐVT (Lốc, Thùng...)').fill('Lốc');
    await page.getByPlaceholder('Tự nhập ĐVT (Lốc, Thùng...)').locator('xpath=following::input[1]').fill('0');
    await page.getByRole('button', { name: 'Lưu đơn vị' }).click();
    const unitRow = (await page.getByText(/Lốc/).first().locator('xpath=ancestor::tr[1]').innerText().catch(() => '')).replace(/\s+/g, ' ');
    const msgs = dialogs.seen.map((d) => d.message).join(' | ');
    testInfo.annotations.push({ type: 'observed', description: `Sau khi lưu đơn vị hệ số 0: dòng "${unitRow}"; thông báo "${msgs}"; toast "${(await page.getByText(/hệ số|quy đổi|lớn hơn 0/i).first().innerText().catch(() => ''))}"` });
    expect.soft(/không hợp lệ|lớn hơn 0|phải > 0/i.test(msgs) || (await page.getByText(/hệ số.*(không hợp lệ|lớn hơn 0)|quy đổi.*(không hợp lệ|lớn hơn 0)/i).count()) > 0, 'hệ số 0 bị từ chối').toBe(true);
    void db;
  });

  test('SYS-MST-09 – Tạo và sửa khách hàng; mã tự sinh khi bỏ trống', async ({ page, env, db, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-09', SHEET, { mismatch: 'Form không có loại khách và kỳ hạn thanh toán (Description).' });
    const name = `KH E2E MST09 ${uid}`;
    await login(page, env);
    const cp = new CustomersAdminPage(page);
    await cp.goto();
    await cp.openCreate();
    await cp.fill({ name, phone: phoneFrom(uid, 21) });
    const res = await cp.save();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    const c = (await partnersByName(db, name))[0];
    expect(c?.partner_code).toMatch(/^KH\d+/);
    await expect(page.getByText(`Đã thêm khách hàng ${c.partner_code}`)).toBeVisible();
    await cp.expand(c.partner_code);
    await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await cp.fill({ name: `${name} sửa` });
    const res2 = await cp.save();
    expect(res2?.status(), res2 ? await res2.text() : 'không gửi request').toBeLessThan(300);
    await expect(page.getByText(`Đã cập nhật khách hàng ${c.partner_code}`)).toBeVisible();
    expect((await partnerById(db, c.partner_id))?.partner_name).toBe(`${name} sửa`);
  });

  test('SYS-MST-10 – Tạo và sửa nhà cung cấp', async ({ page, env, db, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-10', SHEET, { mismatch: 'Form không có loại và kỳ hạn thanh toán (Description).' });
    const name = `NCC E2E MST10 ${uid}`;
    await login(page, env);
    const sp = new SuppliersPage(page);
    await sp.goto();
    await sp.openCreate();
    await sp.form.getByPlaceholder('Bắt buộc').fill(name);
    await fieldAfter(sp.form, 'Điện thoại').fill(phoneFrom(uid, 22));
    const res = await sp.save();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    await expect(page.getByText('Thêm mới Nhà cung cấp thành công!')).toBeVisible();
    const s = (await partnersByName(db, name))[0];
    expect(s?.partner_code).toMatch(/^NCC\d+/);
    await sp.goto();
    await sp.expand(s.partner_code);
    await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
    await sp.form.getByPlaceholder('Bắt buộc').fill(`${name} sửa`);
    const res2 = await sp.save();
    expect(res2?.status(), res2 ? await res2.text() : 'không gửi request').toBeLessThan(300);
    await expect(page.getByText('Cập nhật thông tin Nhà cung cấp thành công!')).toBeVisible();
    expect((await partnerById(db, s.partner_id))?.partner_name).toBe(`${name} sửa`);
  });

  test('SYS-MST-11 – Trùng mã khách hàng bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-11', SHEET);
    const c = await createCustomer(adminApi, { suffix: uid });
    const expected = `Mã khách hàng '${c.code}' đã tồn tại trong hệ thống.`;
    await login(page, env);
    const cp = new CustomersAdminPage(page);
    await cp.goto();
    await cp.openCreate();
    await cp.fill({ name: `KH trùng mã ${uid}`, code: c.code, phone: phoneFrom(uid, 23) });
    const res = await cp.save();
    testInfo.annotations.push({ type: 'observed', description: `HTTP ${res?.status() ?? '(không gửi)'}` });
    await expect(cp.form.getByText(expected)).toBeVisible();
    expect(await partnersByName(db, `KH trùng mã ${uid}`)).toEqual([]);
  });

  test('SYS-MST-12 – Xóa khách đã có giao dịch: chuyển Ngừng hoạt động thay vì xóa', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-12', SHEET, { mismatch: 'Note: code ngừng hoạt động khách thay vì báo từ chối.' });
    const p = await createProduct(adminApi, { suffix: uid, price: 47_000 + (Number(uid.replace(/\D/g, '').slice(-3)) % 500) * 10 });
    await addStock(adminApi, p.productId, 'K001', 5);
    const c = await createCustomer(adminApi, { suffix: uid });
    await setCreditLimit(adminApi, c.partnerId, 5_000_000);
    const sales = await ApiSession.login(env, SEEDED.sales.username, env.defaultPassword);
    await createInvoice(sales, { partnerId: c.partnerId, lines: [{ productId: p.productId, qty: 1, price: p.standardPrice }], paid: 0, requestId: `mst12-${uid}` });
    await sales.dispose();
    dialogs.expect(/.*/);
    await login(page, env);
    const cp = new CustomersAdminPage(page);
    await cp.goto();
    await cp.expand(c.code);
    await page.getByRole('button', { name: 'Xóa', exact: true }).first().click();
    const confirm = page.getByRole('button', { name: /^(Xóa|Đồng ý|Xác nhận)$/ });
    if (await confirm.count()) await confirm.last().click();
    await expect(page.getByText(`Đã xóa khách hàng ${c.code} (khách đã có giao dịch sẽ chuyển sang Ngừng hoạt động)`)).toBeVisible();
    const row = await partnerById(db, c.partnerId);
    expect(row, 'khách vẫn còn trong DB').toBeDefined();
    expect(row?.is_active).toBe(false);
  });

  test('SYS-MST-13 – Hạn mức mới được lưu, có lịch sử, hiện dư nợ', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-13', SHEET);
    const c = await createCustomer(adminApi, { suffix: uid });
    await setCreditLimit(adminApi, c.partnerId, 10_000_000);
    const reason = `Khách thanh toán đúng hạn ${uid}`;
    await login(page, env);
    const cp = new CustomersAdminPage(page);
    await cp.goto();
    await cp.expand(c.code);
    await page.getByRole('button', { name: 'Điều chỉnh hạn mức' }).click();
    await expect(page.getByRole('heading', { name: /^Điều chỉnh hạn mức công nợ/, level: 3 })).toBeVisible();
    await fieldAfter(page.locator('body'), 'Hạn mức mới').fill('15000000');
    await page.getByPlaceholder('VD: Khách thanh toán đúng hạn 6 tháng gần nhất').fill(reason);
    await page.getByRole('button', { name: 'Lưu', exact: true }).last().click();
    await expect(page.getByText('Đã điều chỉnh hạn mức 1 khách hàng')).toBeVisible();
    expect(num((await partnerById(db, c.partnerId))?.credit_limit)).toBe(15_000_000);
    const hist = await creditHistory(db, c.partnerId);
    expect(hist.some((h) => num(h.new_limit) === 15_000_000 && h.reason === reason)).toBe(true);
    await page.getByRole('button', { name: 'Lịch sử hạn mức' }).click();
    await expect(page.getByText(reason).first()).toBeVisible();
    await expect(cp.row(c.code)).toContainText(/\d/);
  });

  test('SYS-MST-14 – Hạn mức âm bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-14', SHEET);
    const expected = 'Hạn mức phải trong khoảng 0 – 999.999.999.999 đ.';
    const c = await createCustomer(adminApi, { suffix: uid });
    await setCreditLimit(adminApi, c.partnerId, 10_000_000);
    await login(page, env);
    const cp = new CustomersAdminPage(page);
    await cp.goto();
    await cp.expand(c.code);
    await page.getByRole('button', { name: 'Điều chỉnh hạn mức' }).click();
    const box = fieldAfter(page.locator('body'), 'Hạn mức mới');
    await box.fill('-5000000');
    const shown = await box.inputValue();
    await page.getByPlaceholder('VD: Khách thanh toán đúng hạn 6 tháng gần nhất').fill(`E2E ${uid}`);
    testInfo.annotations.push({ type: 'observed', description: `Nhập -5000000 → ô hiện "${shown}"` });
    if (!shown.includes('-')) {
      const be = await backendError(() => setCreditLimit(adminApi, c.partnerId, -5_000_000));
      uiBlocksAction(testInfo, `ô Hạn mức mới bỏ dấu "−" (nhập -5000000 → "${shown}")`, expected, be);
    } else {
      await page.getByRole('button', { name: 'Lưu', exact: true }).last().click();
      await expect(page.getByText(expected)).toBeVisible();
    }
    expect(num((await partnerById(db, c.partnerId))?.credit_limit)).toBe(10_000_000);
  });

  test('SYS-MST-15 – Tạo và sửa kho', async ({ page, env, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-15', SHEET);
    await login(page, env);
    const denied = await openWarehouses(page);
    await expect(page).toHaveURL(/\/roles\/warehouses/);
    testInfo.annotations.push({ type: 'observed', description: `/warehouses chuyển tới /roles/warehouses; Manager: ${denied ? 'không có quyền "Phân quyền kho"' : 'mở được'}` });
    if (denied) {
      const mgr = await ApiSession.login(env, USER, env.defaultPassword);
      const be = await backendError(() => mgr.post('/api/warehouses', { warehouseCode: `KE2E${uid.replace(/\D/g, '').slice(-4)}`, warehouseName: `Kho E2E ${uid}`, address: 'E2E' }));
      await mgr.dispose();
      uiBlocksAction(testInfo, 'màn Kho (Phân quyền kho) chỉ dành cho Admin', 'Warehouse saved.', be);
    } else expect.soft(false, 'Manager mở được màn Kho: cần bổ sung bước tạo / sửa kho trong test').toBe(true);
  });

  test('SYS-MST-16 – Tạo và sửa vị trí lưu kho', async ({}, testInfo) => {
    traceTc(testInfo, 'SYS-MST-16', SHEET);
    test.skip(true, 'N/A – Chưa có chức năng danh mục vị trí lưu kho (Note: Not implemented)');
  });

  test('SYS-MST-17 – Xóa kho đang có tồn hoặc nhân sự bị từ chối', async ({ page, env }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-17', SHEET);
    await login(page, env);
    const denied = await openWarehouses(page);
    testInfo.annotations.push({ type: 'observed', description: `Manager mở màn Kho: ${denied ? 'không có quyền' : 'mở được'}` });
    if (denied) {
      const mgr = await ApiSession.login(env, USER, env.defaultPassword);
      const be = await backendError(() => mgr.delete('/api/warehouses/3'));
      await mgr.dispose();
      uiBlocksAction(testInfo, 'màn Kho (Phân quyền kho) chỉ dành cho Admin', 'thông báo kho đang có tồn / nhân sự', be);
    } else expect.soft(false, 'Manager mở được màn Kho: cần bổ sung bước xóa kho trong test').toBe(true);
  });

  test('SYS-MST-18 – Lưu phiên bản định mức với NVL, định mức, hao hụt', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-18', SHEET);
    const fg = await createProduct(adminApi, { suffix: `${uid}fg`, price: 500_000, namePrefix: 'TP E2E' });
    const rm = await createProduct(adminApi, { suffix: `${uid}rm`, price: 20_000, namePrefix: 'NVL E2E' });
    await login(page, env);
    const bp = new BomPage(page);
    await bp.goto();
    await bp.openCreate();
    await bp.chooseProduct(fg.code);
    await bp.addMaterial(rm.code);
    const inputs = bp.line(rm.code).getByRole('textbox');
    await inputs.nth(0).fill('2,5');
    if ((await inputs.count()) > 1) await inputs.nth(1).fill('5');
    const res = await bp.save();
    expect(res?.status(), res ? await res.text() : 'không gửi request').toBeLessThan(300);
    await expect(page.getByText(/^Đã lưu định mức /)).toBeVisible();
    const boms = await bomsOfProduct(db, fg.productId);
    testInfo.annotations.push({ type: 'observed', description: `Định mức: ${JSON.stringify(boms)}` });
    expect(boms.map((b) => num(b.items))).toEqual([1]);
  });

  test('SYS-MST-19 – Áp dụng phiên bản mới thì phiên bản cũ ngừng áp dụng', async ({ page, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-19', SHEET);
    dialogs.expect(/.*/);
    const fg = await createProduct(adminApi, { suffix: `${uid}fg`, price: 500_000, namePrefix: 'TP E2E' });
    const rm = await createProduct(adminApi, { suffix: `${uid}rm`, price: 20_000, namePrefix: 'NVL E2E' });
    const v1 = await adminApi.post<{ summary: { bomId: number; bomCode: string } }>('/api/production/boms', { productId: fg.productId, version: '1.0', items: [{ materialId: rm.productId, quantity: 2, wastageRate: 0 }], activate: true });
    const v2 = await adminApi.post<{ summary: { bomId: number; bomCode: string } }>('/api/production/boms', { productId: fg.productId, version: '2.0', items: [{ materialId: rm.productId, quantity: 3, wastageRate: 0 }], activate: false });
    await login(page, env);
    const bp = new BomPage(page);
    await bp.goto();
    await page.getByPlaceholder('Theo mã định mức, mã / tên thành phẩm').fill(fg.code);
    await page.getByRole('row').filter({ hasText: fg.code }).first().click();
    const v2row = page.getByRole('row').filter({ hasText: v2.summary.bomCode }).last();
    await expect(v2row).toBeVisible();
    await v2row.click().catch(() => undefined);
    const apply = page.getByRole('button', { name: 'Áp dụng', exact: true });
    await expect(apply.first()).toBeVisible();
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && new RegExp(`/api/production/boms/${v2.summary.bomId}/activate$`).test(new URL(r.url()).pathname)),
      (async () => {
        await apply.last().click();
        const ok = page.getByRole('button', { name: /^(Đồng ý|Xác nhận|Áp dụng)$/ });
        if ((await ok.count()) > 1) await ok.last().click();
      })(),
    ]);
    expect(res.status(), await res.text()).toBeLessThan(300);
    const boms = await bomsOfProduct(db, fg.productId);
    expect(boms.map((b) => [b.bom_id, b.is_active])).toEqual([
      [v1.summary.bomId, false],
      [v2.summary.bomId, true],
    ]);
  });

  test('SYS-MST-20 – Định mức không có NVL bị từ chối', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-MST-20', SHEET);
    const expected = 'BOM phải có ít nhất một nguyên vật liệu.';
    const fg = await createProduct(adminApi, { suffix: `${uid}fg`, price: 500_000, namePrefix: 'TP E2E' });
    await login(page, env);
    const bp = new BomPage(page);
    await bp.goto();
    await bp.openCreate();
    await bp.chooseProduct(fg.code);
    const msg = page.getByText(/phải có ít nhất một nguyên vật liệu/).first();
    const [res, shown] = await Promise.all([bp.save(4_000), readToast(msg)]);
    testInfo.annotations.push({ type: 'observed', description: `HTTP ${res?.status() ?? '(không gửi)'}; "${shown}"` });
    expect.soft(shown, 'câu thông báo').toBe(expected);
    expect(await bomsOfProduct(db, fg.productId)).toEqual([]);
  });
});
