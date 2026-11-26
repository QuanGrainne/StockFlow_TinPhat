// Report 5.3 – sheet "UC-01 Login" (SYS-LOG-01..04). Thao tác đang kiểm làm qua giao diện; API / DB chỉ để chuẩn bị và kiểm.
import { test, expect, traceTc, newUserContext } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { AppShell } from '../../pages/AppShell';
import { StaffPage } from '../../pages/StaffPage';
import { expectedGroups } from '../../pages/navMap';
import { SEEDED, createAccount, type CreatedAccount } from '../../fixtures/accounts';
import { rolesOfUser, userByUsername, warehouseCodesOfUser } from '../../fixtures/dbq';
import type { Page } from '@playwright/test';

const SHEET = 'UC-01 Login';
const MSG_WRONG = 'Tên đăng nhập hoặc mật khẩu không chính xác.';
const MSG_LOCKED = 'Tài khoản của bạn đã bị vô hiệu hóa.';

const isMyFeatures = (url: string): boolean => /\/api\/roles\/my-features$/i.test(new URL(url).pathname);

async function tokenInStorage(page: Page): Promise<{ session: string | null; local: string | null }> {
  return page.evaluate(() => ({ session: sessionStorage.getItem('stockflow_token'), local: localStorage.getItem('stockflow_token') }));
}

test.describe(SHEET, () => {
  test('SYS-LOG-01 – Đăng nhập đúng: vào màn của vai trò, menu và kho theo quyền @pilot @p1', async ({ page, env, db }, testInfo) => {
    traceTc(testInfo, 'SYS-LOG-01', SHEET);
    const login = new LoginPage(page);
    const shell = new AppShell(page);
    const user = SEEDED.sales;
    let features: string[] = [];

    await test.step('1. Mở http://localhost:3000/login', async () => {
      await login.goto();
    });
    await test.step('2–3. Nhập tài khoản SalesStaff hợp lệ, bấm "Đăng nhập"', async () => {
      const featuresResp = page.waitForResponse((r) => isMyFeatures(r.url()) && r.status() === 200);
      expect(await login.login(user.username, env.defaultPassword)).toBe(200);
      features = (await (await featuresResp).json()) as string[];
    });
    await test.step('KQ1. Chuyển tới màn đầu tiên của vai trò', async () => {
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(shell.noAccess()).toHaveCount(0);
      const t = await tokenInStorage(page);
      expect(t.session, 'token trong sessionStorage của tab').toBeTruthy();
    });
    await test.step('KQ2. Menu chỉ có chức năng được cấp cho vai trò', async () => {
      const expected = expectedGroups(features);
      expect(expected.length).toBeGreaterThan(0);
      await expect.poll(() => shell.visibleGroups()).toEqual(expected);
      for (const adminOnly of ['Nhân viên', 'Phân quyền']) expect(expected).not.toContain(adminOnly);
    });
    await test.step('KQ3. Bộ chọn kho ở header chỉ có kho được gán', async () => {
      const dbCodes = await warehouseCodesOfUser(db, user.username);
      expect(dbCodes).toEqual([...user.warehouses].sort());
      expect(await shell.listBranchCodes()).toEqual(dbCodes);
    });
  });

  test('SYS-LOG-02 – Tài khoản có đúng một vai trò, menu theo vai trò đó @pilot', async ({ page, browser, env, db, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-LOG-02', SHEET, {
      mismatch: 'Description (A1.1): tài khoản nhiều vai trò nhận quyền gộp. Code: mỗi tài khoản đúng một vai trò (UC-14), không dựng được tiền đề "nhiều vai trò". Kiểm theo Expected.',
    });
    const target = SEEDED.sales;
    await test.step('1. Đăng nhập (Admin để mở màn Nhân viên)', async () => {
      await new LoginPage(page).loginOk(SEEDED.admin.username, env.defaultPassword);
    });
    await test.step('2. Mở Nhân viên và xem vai trò của tài khoản', async () => {
      const staff = new StaffPage(page);
      await staff.goto();
      await expect(staff.row(target.username)).toHaveCount(1);
      const roleText = (await staff.roleCell(target.username).innerText()).trim();
      expect(roleText.length).toBeGreaterThan(0);
      expect(roleText, 'ô Vai trò chỉ có một vai trò').not.toMatch(/[,;\n]/);
      expect(await rolesOfUser(db, target.username)).toEqual([target.role]);
    });
    await test.step('KQ. Menu của tài khoản theo đúng vai trò đó', async () => {
      const other = await newUserContext(browser, testInfo, dialogs);
      const featuresResp = other.page.waitForResponse((r) => isMyFeatures(r.url()) && r.status() === 200);
      await new LoginPage(other.page).loginOk(target.username, env.defaultPassword);
      const features = (await (await featuresResp).json()) as string[];
      await expect.poll(() => new AppShell(other.page).visibleGroups()).toEqual(expectedGroups(features));
      await other.context.close();
    });
  });

  test('SYS-LOG-03 – Sai mật khẩu: thông báo chung, ở lại /login @pilot @p1', async ({ page, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-LOG-03', SHEET);
    const login = new LoginPage(page);
    await test.step('1. Mở /login', async () => {
      await login.goto();
    });
    await test.step('2–3. Tên đăng nhập đúng, mật khẩu sai, bấm "Đăng nhập"', async () => {
      const status = await login.login(SEEDED.sales.username, `Sai@${uid}`);
      expect(status).toBeGreaterThanOrEqual(400);
    });
    await test.step(`KQ. Thông báo "${MSG_WRONG}" và ở lại /login`, async () => {
      await expect(page.getByText(MSG_WRONG, { exact: true })).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
      expect((await tokenInStorage(page)).session).toBeNull();
    });
    await test.step('Theo Description: tên đăng nhập không tồn tại cho cùng thông báo (không lộ ô sai)', async () => {
      await login.login(`khongton.tai.${uid}`, `Sai@${uid}`);
      await expect(page.getByText(MSG_WRONG, { exact: true })).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);
    });
  });

  test('SYS-LOG-04 – Tài khoản bị khóa không đăng nhập được @pilot @p1', async ({ page, browser, env, db, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-LOG-04', SHEET);
    const digits = uid.replace(/\D/g, '');
    const account: CreatedAccount = {
      username: `e2e.lock.${uid}`.toLowerCase(),
      name: `E2E Khoa ${uid}`,
      role: 'SalesStaff',
      warehouses: ['K001'],
      phone: `09${digits.slice(-8).padStart(8, '0')}`,
    };
    await test.step('Tiền đề: tài khoản đang hoạt động (tạo qua API bằng Admin)', async () => {
      expect(await createAccount(adminApi, account)).toBe('created');
      expect((await userByUsername(db, account.username))?.is_active).toBe(true);
    });
    await test.step('1. Admin khóa tài khoản ở màn Nhân viên', async () => {
      await new LoginPage(page).loginOk(SEEDED.admin.username, env.defaultPassword);
      const staff = new StaffPage(page);
      await staff.goto();
      dialogs.expect(/^Bạn có chắc chắn muốn khóa tài khoản của /);
      const [res] = await Promise.all([
        page.waitForResponse((r) => /\/api\/staff\/[^/]+\/toggle-status$/i.test(new URL(r.url()).pathname)),
        staff.lock(account.username, account.name),
      ]);
      expect(res.status()).toBe(200);
      await expect(page.getByText(`Đã khóa tài khoản ${account.name}`)).toBeVisible();
      expect((await userByUsername(db, account.username))?.is_active).toBe(false);
    });
    await test.step(`2. Đăng nhập bằng tài khoản đó → "${MSG_LOCKED}", ở lại /login`, async () => {
      const other = await newUserContext(browser, testInfo, dialogs);
      const login = new LoginPage(other.page);
      await login.goto();
      expect(await login.login(account.username, env.defaultPassword)).toBeGreaterThanOrEqual(400);
      await expect(other.page.getByText(MSG_LOCKED, { exact: true })).toBeVisible();
      await expect(other.page).toHaveURL(/\/login$/);
      await other.context.close();
    });
  });
});
