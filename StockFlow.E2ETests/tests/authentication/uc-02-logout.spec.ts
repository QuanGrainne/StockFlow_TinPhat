// Report 5.3 – sheet "UC-02 Logout" (pilot: SYS-OUT-01).
import { test, expect, traceTc } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { AppShell } from '../../pages/AppShell';
import { SEEDED } from '../../fixtures/accounts';
import { userByUsername } from '../../fixtures/dbq';

const SHEET = 'UC-02 Logout';

test.describe(SHEET, () => {
  test('SYS-OUT-01 – Đăng xuất về /login, không mở lại được trang bảo vệ @pilot @p1', async ({ page, env, db }, testInfo) => {
    traceTc(testInfo, 'SYS-OUT-01', SHEET);
    const shell = new AppShell(page);
    const user = SEEDED.sales;
    const fullName = (await userByUsername(db, user.username))?.full_name ?? '';
    expect(fullName).not.toBe('');

    await test.step('1. Đăng nhập', async () => {
      await new LoginPage(page).loginOk(user.username, env.defaultPassword);
    });
    await test.step('2. Bấm tên người dùng ở header, chọn "Đăng xuất"', async () => {
      await shell.logout(fullName);
    });
    await test.step('KQ1. Về /login; token đã bị xoá ở trình duyệt', async () => {
      await expect(page).toHaveURL(/\/login$/);
      const t = await page.evaluate(() => ({ s: sessionStorage.getItem('stockflow_token'), l: localStorage.getItem('stockflow_token') }));
      expect(t).toEqual({ s: null, l: null });
    });
    await test.step('3. Dán URL được bảo vệ /purchases', async () => {
      await page.goto('/purchases');
    });
    await test.step('KQ2. Trang bảo vệ chuyển về /login', async () => {
      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
      await expect(new LoginPage(page).username).toBeVisible();
    });
  });

  test('SYS-OUT-02 – Phiên hết hạn: thao tác tiếp theo đưa về màn đăng nhập', async ({ page, env }, testInfo) => {
    traceTc(testInfo, 'SYS-OUT-02', SHEET);
    testInfo.annotations.push({ type: 'note', description: 'Giả lập hết hạn theo Procedure: xoá token khỏi storage (không chờ JWT hết hạn thật)' });
    await test.step('1. Đăng nhập', async () => {
      await new LoginPage(page).loginOk(SEEDED.sales.username, env.defaultPassword);
    });
    await test.step('2. Xoá token khỏi storage (phiên hết hạn)', async () => {
      await page.evaluate(() => {
        sessionStorage.removeItem('stockflow_token');
        localStorage.removeItem('stockflow_token');
      });
    });
    const unauthorized: string[] = [];
    page.on('response', (r) => {
      if (r.status() === 401 && new URL(r.url()).pathname.startsWith('/api/')) unauthorized.push(new URL(r.url()).pathname);
    });
    await test.step('3. Bấm một menu (Bán hàng → Hóa đơn)', async () => {
      await new AppShell(page).navigate('Bán hàng', 'Hóa đơn');
    });
    await test.step('KQ. API trả 401; phiên bị xoá và hiện màn đăng nhập', async () => {
      await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });
      expect(unauthorized.length, 'có ít nhất một phản hồi 401').toBeGreaterThan(0);
      const left = await page.evaluate(() => ({ s: sessionStorage.getItem('stockflow_user'), l: localStorage.getItem('stockflow_token') }));
      expect(left).toEqual({ s: null, l: null });
    });
  });
});
