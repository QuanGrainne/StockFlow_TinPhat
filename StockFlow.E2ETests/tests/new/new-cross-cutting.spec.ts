// Report 5.3 (bản nháp NEW) – sheet "NEW Cross-cutting": SYS-XCT-N01 .. N08
// (quyền chức năng theo URL, cô lập kho, chuyển hướng đăng nhập, phiên theo tab, chi nhánh làm việc, mất kết nối API,
// định dạng tiền / ngày, bố cục 1366x768).
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { AppShell } from '../../pages/AppShell';
import { PosPage } from '../../pages/PosPage';
import { StaffPage } from '../../pages/StaffPage';
import { TransferListPage } from '../../pages/TransferPages';
import { DocListPage } from '../../pages/InventoryPages';
import { E2E_ACCOUNTS, SEEDED, WAREHOUSES } from '../../fixtures/accounts';
import { addStock, createProduct } from '../../fixtures/data';
import { userByUsername } from '../../fixtures/dbq';
import { cancelStocktake, draftStocktake, draftTransfer } from '../../fixtures/inventory';
import { directReceiptViaApi, suppliers } from '../../fixtures/purchasing';
import { makeAccount } from '../../fixtures/ui';
import { ApiSession } from '../../fixtures/api';
import { phoneFrom } from '../../fixtures/sales';
import type { Page, Request } from '@playwright/test';

const SHEET = 'NEW Cross-cutting';
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Không có thanh cuộn ngang của cả trang */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

/** Đọc phần payload của JWT trong header Authorization */
function jwtPayload(auth: string): string {
  const part = auth.replace(/^Bearer\s+/i, '').split('.')[1] ?? '';
  return Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

test.describe(SHEET, () => {
  test('SYS-XCT-N01 – Người không có chức năng không mở được bằng URL và không thấy trên menu', async ({ page, env }, testInfo) => {
    traceTc(testInfo, 'SYS-XCT-N01', SHEET);
    const shell = new AppShell(page);
    await test.step('1. Đăng nhập sales01', async () => {
      await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    });
    await test.step('2. Mở trực tiếp /staff và /roles → KQ1. "Bạn không có quyền truy cập chức năng này"', async () => {
      for (const url of ['/staff', '/roles']) {
        await page.goto(url);
        await expect(shell.noAccess(), url).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Danh sách tài khoản nhân viên' })).toHaveCount(0);
      }
    });
    await test.step('3. Kiểm thanh menu → KQ2. không có Nhân viên và Vai trò', async () => {
      await page.goto('/orders');
      const groups = await shell.visibleGroups();
      testInfo.annotations.push({ type: 'observed', description: `Nhóm menu hiện: ${groups.join(', ')}` });
      expect(groups).not.toContain('Nhân viên');
      await expect(page.getByRole('button', { name: /^Vai trò(\s|$)/ })).toHaveCount(0);
      await expect(page.getByRole('link', { name: /^(Nhân viên|Vai trò)(\s|$)/ })).toHaveCount(0);
    });
  });

  test('SYS-XCT-N02 – Tài khoản không có kho không thấy chứng từ kho nào', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-XCT-N02', SHEET, { knownDefect: 'DEF-IT-04 (Report 5.2): GetPurchasesQuery trả mọi phiếu nhập' });
    testInfo.annotations.push({ type: 'note', description: 'Tài khoản thử: vai trò Thủ kho (WarehouseStaff), không gán kho – vai trò dùng các màn Nhập hàng / Chuyển hàng / Kiểm kho' });
    const s = (await suppliers(adminApi))[0];
    const p = await createProduct(adminApi, { suffix: uid, price: 47_000 });
    const pk1 = await createProduct(adminApi, { suffix: `${uid}k1`, price: 47_000 });
    const pk2 = await createProduct(adminApi, { suffix: `${uid}k2`, price: 47_000 });
    await addStock(adminApi, p.productId, 'K001', 10);
    await addStock(adminApi, p.productId, 'K002', 10);
    const gr1 = await directReceiptViaApi(adminApi, { wh: 'K001', partnerId: s.id, lines: [{ productId: p.productId, qty: 1, price: 30_000 }] });
    const gr2 = await directReceiptViaApi(adminApi, { wh: 'K002', partnerId: s.id, lines: [{ productId: p.productId, qty: 1, price: 30_000 }] });
    const t1 = await draftTransfer(adminApi, 'K001', 'K003', p.productId, 1);
    const t2 = await draftTransfer(adminApi, 'K002', 'K003', p.productId, 1);
    const st1 = await draftStocktake(adminApi, 'K001', pk1.productId, 0);
    const st2 = await draftStocktake(adminApi, 'K002', pk2.productId, 0);
    const user = await makeAccount(adminApi, uid, { prefix: 'nowh', role: 'WarehouseStaff', warehouses: [] });
    try {
      await new LoginPage(page).loginOk(user.username, env.defaultPassword);
      await test.step('2a. Mở /purchases → KQ1. không có phiếu nhập của kho nào', async () => {
        await page.goto('/purchases');
        await page.waitForLoadState('networkidle');
        const pnRows = page.getByRole('row').filter({ has: page.getByRole('cell', { name: new RegExp(`^${escapeRe(gr1.code.replace(/\d+$/, ''))}\\d+$`) }) });
        const n = await pnRows.count();
        const api = await ApiSession.login(env, user.username, env.defaultPassword);
        const viaApi = await api.get<unknown[] | { items?: unknown[] }>('/api/purchases').catch((e: Error) => e.message);
        await api.dispose();
        const apiCount = Array.isArray(viaApi) ? viaApi.length : typeof viaApi === 'string' ? viaApi : (viaApi.items ?? []).length;
        testInfo.annotations.push({ type: 'observed', description: `Nhập hàng: ${n} dòng phiếu trên UI; GET /api/purchases → ${apiCount}` });
        await expect.soft(page.getByRole('cell', { name: gr1.code, exact: true }), `phiếu ${gr1.code} (K001)`).toHaveCount(0);
        await expect.soft(page.getByRole('cell', { name: gr2.code, exact: true }), `phiếu ${gr2.code} (K002)`).toHaveCount(0);
        expect.soft(n, 'số phiếu nhập hiển thị').toBe(0);
      });
      await test.step('2b. Mở /transfers → KQ1. không có phiếu chuyển', async () => {
        const list = new TransferListPage(page);
        await page.goto('/transfers');
        await page.waitForLoadState('networkidle');
        await expect(list.row(t1.code)).toHaveCount(0);
        await expect(list.row(t2.code)).toHaveCount(0);
        const n = await page.getByRole('row').filter({ hasText: new RegExp(`${escapeRe(t1.code.replace(/\d+$/, ''))}\\d+`) }).count();
        testInfo.annotations.push({ type: 'observed', description: `Chuyển hàng: ${n} dòng phiếu` });
        expect(n).toBe(0);
      });
      await test.step('2c. Mở /stocktakes → KQ1. không có phiếu kiểm', async () => {
        const list = DocListPage.stocktakes(page);
        await page.goto('/stocktakes');
        await page.waitForLoadState('networkidle');
        await expect(list.row(st1.code)).toHaveCount(0);
        await expect(list.row(st2.code)).toHaveCount(0);
        const n = await page.getByRole('row').filter({ has: page.getByRole('cell', { name: new RegExp(`^${escapeRe(st1.code.replace(/\d+$/, ''))}\\d+$`) }) }).count();
        testInfo.annotations.push({ type: 'observed', description: `Kiểm kho: ${n} dòng phiếu` });
        expect(n).toBe(0);
      });
    } finally {
      await cancelStocktake(adminApi, st1.id).catch(() => undefined);
      await cancelStocktake(adminApi, st2.id).catch(() => undefined);
    }
  });

  test('SYS-XCT-N03 – Mở URL cần đăng nhập ở trình duyệt chưa từng đăng nhập: chuyển về /login', async ({ page }, testInfo) => {
    traceTc(testInfo, 'SYS-XCT-N03', SHEET);
    await test.step('1. Trình duyệt mới, kho lưu trữ trống', async () => {
      // Context mới của Playwright: chưa có cookie / localStorage nào trước khi mở trang
      const state = await page.context().storageState();
      expect([state.cookies.length, state.origins.length], 'cookie / localStorage trống').toEqual([0, 0]);
    });
    await test.step('2. Mở /purchases → KQ1. về /login, không hiện dữ liệu nghiệp vụ', async () => {
      const apiCalls: string[] = [];
      page.on('response', (r) => {
        if (/\/api\/purchases/i.test(r.url())) apiCalls.push(`${r.status()} ${new URL(r.url()).pathname}`);
      });
      await page.goto('/purchases');
      await expect(page).toHaveURL(/\/login(\?|$)/);
      await expect(page.getByLabel('Tên đăng nhập', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Nhập hàng', level: 1 })).toHaveCount(0);
      await expect(page.getByRole('cell', { name: /^PN\d+$/ })).toHaveCount(0);
      testInfo.annotations.push({ type: 'observed', description: `Request /api/purchases: ${apiCalls.join(', ') || 'không có'}` });
      expect(apiCalls.filter((c) => c.startsWith('2')), 'không có dữ liệu phiếu nhập trả về').toEqual([]);
    });
  });

  test('SYS-XCT-N04 – Hai tab giữ tài khoản riêng', async ({ page, env, db, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-XCT-N04', SHEET);
    const target = await makeAccount(adminApi, uid, { prefix: 'tab', role: 'SalesStaff', warehouses: ['K001'] });
    const tab1 = page;
    const tab2 = await page.context().newPage();
    const auth = new Map<Page, string[]>([
      [tab1, []],
      [tab2, []],
    ]);
    for (const [tab, list] of auth) {
      tab.on('request', (r: Request) => {
        const h = r.headers()['authorization'];
        if (h && /\/api\//.test(r.url())) list.push(h);
      });
    }
    await test.step('1. Tab 1: đăng nhập admin', async () => {
      await new LoginPage(tab1).loginOk(SEEDED.admin.username, env.defaultPassword);
    });
    await test.step('2. Tab 2: đăng nhập manager01', async () => {
      await new LoginPage(tab2).loginOk(SEEDED.manager.username, env.defaultPassword);
    });
    let status: number | null = null;
    await test.step('3. Tab 1 mở /staff và lưu một thay đổi', async () => {
      auth.get(tab1)?.splice(0);
      const staff = new StaffPage(tab1);
      await staff.goto();
      await staff.search.fill(target.name);
      await staff.openEdit(target.username);
      await staff.fill({ phone: phoneFrom(uid, 3) });
      status = await staff.submit();
    });
    await test.step('KQ1. Tab 1 vẫn là admin (lưu thành công); tab 2 hiện manager01', async () => {
      expect(status, 'lưu nhân viên ở tab 1').toBe(200);
      const manager = await userByUsername(db, SEEDED.manager.username);
      await tab2.goto('/orders');
      await expect(new AppShell(tab2).userMenu(manager?.full_name ?? SEEDED.manager.username)).toBeVisible();
    });
    await test.step('KQ2. Mỗi tab gửi token của chính nó', async () => {
      const t1 = [...new Set(auth.get(tab1))];
      const t2 = [...new Set(auth.get(tab2))];
      expect(t1.length, 'tab 1 có gọi API').toBeGreaterThan(0);
      expect(t2.length, 'tab 2 có gọi API').toBeGreaterThan(0);
      const p1 = t1.map(jwtPayload);
      const p2 = t2.map(jwtPayload);
      testInfo.annotations.push({ type: 'observed', description: `Token tab 1 chứa admin: ${p1.every((p) => /"admin"/i.test(p))}; tab 2 chứa manager01: ${p2.every((p) => /manager01/i.test(p))}` });
      expect(t1.some((t) => t2.includes(t)), 'hai tab không dùng chung token').toBe(false);
      expect(p1.every((p) => /"admin"/i.test(p) && !/manager01/i.test(p))).toBe(true);
      expect(p2.every((p) => /manager01/i.test(p))).toBe(true);
    });
    await tab2.close();
  });

  test('SYS-XCT-N05 – Đổi chi nhánh làm việc trên header: danh sách và tồn POS theo chi nhánh, giữ sau khi tải lại', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-XCT-N05', SHEET);
    const p = await createProduct(adminApi, { suffix: uid, price: 46_000 });
    await addStock(adminApi, p.productId, 'K001', 7);
    await addStock(adminApi, p.productId, 'K002', 4);
    const tA = await draftTransfer(adminApi, 'K001', 'K003', p.productId, 1);
    const tB = await draftTransfer(adminApi, 'K002', 'K003', p.productId, 1);
    const shell = new AppShell(page);
    // Người dùng cần cả K001, K002 và chức năng Bán hàng (bước 3 mở /pos) → Quản lý e2e.manager2 (Thủ kho không có chức năng Bán hàng)
    testInfo.annotations.push({ type: 'note', description: 'Người dùng: e2e.manager2 (Manager, K001 + K002) vì bước 3 cần mở /pos' });
    await test.step('1. Đăng nhập người dùng có K001 và K002 (e2e.manager2)', async () => {
      await new LoginPage(page).loginOk(E2E_ACCOUNTS.manager2.username, env.defaultPassword);
      if (!(await shell.branchButton.innerText()).includes(WAREHOUSES.K001.name)) await shell.selectBranch('K001');
      await expect(shell.branchButton).toContainText(WAREHOUSES.K001.name);
    });
    await test.step('2. Đổi chi nhánh trên header từ K001 sang K002', async () => {
      await shell.selectBranch('K002');
      await expect(shell.branchButton).toContainText(WAREHOUSES.K002.name);
    });
    // Quyết định Round 2 (27/11/2026, giữ hành vi hiện tại): POS lấy tồn theo chi nhánh header; màn Chuyển hàng có bộ lọc
    // Chuyển đi / Nhận về riêng, mặc định "Tất cả chi nhánh" được phân quyền (không lọc theo header).
    await test.step('3a. Mở Chuyển hàng → KQ1. danh sách gồm phiếu của mọi chi nhánh được phân quyền', async () => {
      const list = new TransferListPage(page);
      await list.goto();
      await expect(list.row(tB.code)).toHaveCount(1);
      const shownA = await list.row(tA.code).count();
      const filters = (await page.getByRole('complementary').innerText()).replace(/\s+/g, ' ').slice(0, 120);
      testInfo.annotations.push({ type: 'observed', description: `Chi nhánh K002: phiếu ${tB.code} (K002→K003) hiện; phiếu ${tA.code} (K001→K003) ${shownA ? 'VẪN hiện' : 'không hiện'}; bộ lọc: ${filters}` });
      expect.soft(shownA, `phiếu ${tA.code} của K001 (chi nhánh được phân quyền) vẫn hiện với bộ lọc mặc định`).toBe(1);
    });
    await test.step('3b. Mở /pos → KQ1. tồn POS theo K002', async () => {
      const pos = new PosPage(page);
      await pos.goto();
      await expect(pos.branchLabel()).toContainText(WAREHOUSES.K002.name);
      await pos.search.fill(p.code);
      const suggestion = page.getByRole('button', { name: new RegExp(escapeRe(p.code)) }).first();
      await expect(suggestion).toContainText(/Tồn:\s*4\b/);
    });
    await test.step('3c. Tải lại trang → KQ2. vẫn là K002', async () => {
      await page.reload();
      const pos = new PosPage(page);
      await expect(pos.search).toBeVisible();
      await expect(pos.branchLabel()).toContainText(WAREHOUSES.K002.name);
      await page.goto('/transfers');
      await expect(shell.branchButton).toContainText(WAREHOUSES.K002.name);
    });
  });

  test('SYS-XCT-N06 – API không phản hồi: hiện thông báo thay vì trang trắng; tải lại được khi API trở lại', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-XCT-N06', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Giả lập API ngừng bằng page.route(...).abort() – không dừng tiến trình API thật' });
    const p = await createProduct(adminApi, { suffix: uid, price: 45_000 });
    const apiRe = new RegExp(`^${escapeRe(env.apiUrl)}/api/`, 'i');
    const login = new LoginPage(page);
    await test.step('1. Ở /login làm API không phản hồi rồi đăng nhập → KQ1. thông báo không kết nối được', async () => {
      await login.goto();
      await page.route(/\/api\/auth\/login$/i, (r) => r.abort('connectionrefused'));
      await login.fill(SEEDED.manager.username, env.defaultPassword);
      await login.submit.click();
      await expect(page.getByText('Không thể kết nối đến máy chủ. Vui lòng thử lại.', { exact: true })).toBeVisible();
      await page.unroute(/\/api\/auth\/login$/i);
    });
    await test.step('2. Đã đăng nhập, làm API không phản hồi rồi mở Hàng hóa → KQ2. có thông báo lỗi, trang không trắng', async () => {
      await login.loginOk(SEEDED.manager.username, env.defaultPassword);
      await page.route(apiRe, (r) => r.abort('connectionrefused'));
      await page.goto('/products');
      await page.waitForLoadState('domcontentloaded');
      const errorMsg = page.getByText(/(Không thể|Không tải được|lỗi kết nối|Lỗi kết nối|máy chủ)/).first();
      // Chờ khung trang tải xong (trước đó chỉ có chữ "Đang tải..." của khung, chưa phải màn Hàng hóa)
      const hasError = await errorMsg
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => true)
        .catch(() => false);
      const bodyText = (await page.locator('body').innerText()).trim();
      testInfo.annotations.push({
        type: 'observed',
        description: `Trang Hàng hóa khi API ngừng: ${bodyText.length} ký tự; thông báo lỗi: ${hasError ? (await errorMsg.innerText()).trim() : 'KHÔNG có'}; đầu trang: ${bodyText.replace(/\s+/g, ' ').slice(0, 160)}`,
      });
      expect(bodyText.length, 'trang không trắng').toBeGreaterThan(0);
      expect.soft(hasError, 'có thông báo lỗi khi không tải được dữ liệu').toBe(true);
    });
    await test.step('3. API trở lại, thử lại → KQ3. dữ liệu tải được', async () => {
      await page.unroute(apiRe);
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Hàng hóa', level: 1 })).toBeVisible();
      await page.getByPlaceholder('Theo mã, tên hàng, mã vạch hoặc thương hiệu...').fill(p.code);
      await expect(page.getByRole('cell', { name: p.code, exact: true })).toBeVisible();
    });
  });

  test('SYS-XCT-N07 – Tiền và ngày theo định dạng Việt Nam', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-XCT-N07', SHEET);
    const price = 1_250_000;
    const p = await createProduct(adminApi, { suffix: uid, price });
    await addStock(adminApi, p.productId, 'K001', 3);
    let code = '';
    await test.step('1. Bán POS 1.250.000', async () => {
      await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
      const pos = new PosPage(page);
      await pos.goto();
      await pos.addProduct(p.code);
      await expect(pos.paidInput()).toHaveValue('1.250.000');
      const res = await pos.pay();
      expect(res.status(), await res.text()).toBeLessThan(300);
      code = ((await res.json()) as { orderCode: string }).orderCode;
    });
    let html = '';
    await test.step('2. Mở hóa đơn và bản xem trước khi in', async () => {
      await page.goto('/orders');
      await page.getByPlaceholder('Theo mã hóa đơn, tên hoặc SĐT khách (F3)').fill(code);
      const row = page.getByRole('row').filter({ has: page.getByRole('cell', { name: code, exact: true }) });
      await expect(row).toHaveCount(1);
      await expect(row).toContainText('1.250.000');
      await expect(row.getByRole('cell').filter({ hasText: /^\d{2}\/\d{2}\/\d{4}/ }).first(), 'ô thời gian dd/MM/yyyy').toBeVisible();
      await row.getByRole('cell', { name: code, exact: true }).click();
      await expect(page.getByRole('button', { name: 'Sao chép' }).first()).toBeVisible();
      const framePromise = page.waitForEvent('frameattached');
      await page.getByRole('button', { name: 'In', exact: true }).first().click();
      const frame = await framePromise;
      await expect.poll(async () => (html = await frame.content().catch(() => html)), { timeout: 10_000 }).toContain(code);
    });
    await test.step('KQ1. Tiền hiển thị 1.250.000 (dấu chấm phân cách nghìn)', async () => {
      await expect(page.getByText('1.250.000').first()).toBeVisible();
      expect(html).toContain('1.250.000');
      expect(await page.getByText(/\b1,250,000\b/).count(), 'không dùng dấu phẩy phân cách nghìn').toBe(0);
      expect(html).not.toMatch(/\b1,250,000\b/);
    });
    await test.step('KQ2. Ngày hiển thị dd/MM/yyyy', async () => {
      const detailDates = await page.getByText(/\b\d{1,4}[/-]\d{1,2}[/-]\d{2,4}\b/).allInnerTexts();
      const numeric = [...detailDates.join(' ').matchAll(/\b\d{1,4}[/-]\d{1,2}[/-]\d{2,4}\b/g)].map((m) => m[0]);
      const printDates = [...html.replace(/<[^>]+>/g, ' ').matchAll(/\b\d{1,4}[/-]\d{1,2}[/-]\d{2,4}\b/g)].map((m) => m[0]);
      const wordDate = /Ngày \d{2} Tháng \d{2} Năm \d{4}/.exec(html)?.[0] ?? '';
      testInfo.annotations.push({ type: 'observed', description: `Ngày dạng số trên màn: ${[...new Set(numeric)].join(', ')}; trong bản in: ${printDates.join(', ') || '(không có)'}; bản in ghi "${wordDate}"` });
      expect(numeric.length, 'có ngày hiển thị').toBeGreaterThan(0);
      for (const d of [...numeric, ...printDates]) expect(d, 'định dạng dd/MM/yyyy').toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  test('SYS-XCT-N08 – Các màn chính vừa 1366x768, không cuộn ngang', async ({ page, env }, testInfo) => {
    traceTc(testInfo, 'SYS-XCT-N08', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Nút Lưu tạm / Hoàn thành nằm ở màn tạo phiếu nên kiểm thêm /transfers/create và /purchases/create' });
    await test.step('1. Cửa sổ 1366x768', async () => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await new LoginPage(page).loginOk(SEEDED.manager.username, env.defaultPassword);
    });
    const checks: { url: string; ready: RegExp | string; buttons: RegExp[] }[] = [
      { url: '/pos', ready: /^Tìm hàng (hóa|trả) \(F3\)$/, buttons: [/^THANH TOÁN/] },
      { url: '/products', ready: 'Theo mã, tên hàng, mã vạch hoặc thương hiệu...', buttons: [] },
      { url: '/transfers', ready: '', buttons: [] },
      { url: '/transfers/create', ready: 'Tìm hàng hóa theo mã hoặc tên', buttons: [/^Lưu tạm$/, /^Hoàn thành$/] },
      { url: '/purchases', ready: 'Theo mã phiếu, số PO, mã hoặc tên NCC...', buttons: [] },
      { url: '/purchases/create', ready: /^Tìm hàng hóa theo mã hoặc tên/, buttons: [/^Lưu tạm$/, /^Hoàn thành$/] },
    ];
    await test.step('2. Mở /pos, Hàng hóa, Chuyển hàng và Nhập hàng → KQ1. không cuộn ngang; KQ2. nút chính hiện', async () => {
      const out: string[] = [];
      for (const c of checks) {
        await page.goto(c.url);
        if (c.ready) await expect(page.getByPlaceholder(c.ready).first()).toBeVisible();
        else await expect(page.getByRole('heading', { name: 'Chuyển hàng', level: 1 })).toBeVisible();
        await page.waitForLoadState('networkidle');
        const overflow = await horizontalOverflow(page);
        out.push(`${c.url}: tràn ngang ${overflow}px`);
        expect.soft(overflow, `${c.url} không cuộn ngang`).toBeLessThanOrEqual(0);
        for (const b of c.buttons) await expect.soft(page.getByRole('button', { name: b }).first(), `${c.url} nút ${b}`).toBeInViewport();
      }
      testInfo.annotations.push({ type: 'observed', description: out.join('; ') });
    });
  });
});
