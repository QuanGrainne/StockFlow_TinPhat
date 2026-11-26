// Report 5.3 – sheet "UC-03 Change Password" (SYS-PWD-01..04).
// Procedure ghi "Log in as sales01"; để không đổi mật khẩu của tài khoản dùng chung, mỗi test dùng một tài khoản
// SalesStaff riêng tạo qua API (cùng vai trò với sales01) – ghi annotation.
import { test, expect, traceTc, newUserContext } from '../../fixtures/test';
import { LoginPage } from '../../pages/LoginPage';
import { AppShell } from '../../pages/AppShell';
import { apiLogin } from '../../fixtures/api';
import type { E2EEnv } from '../../fixtures/env';
import { makeAccount } from '../../fixtures/ui';

const SHEET = 'UC-03 Change Password';
const SAME_ROLE = { type: 'note', description: 'Dùng tài khoản SalesStaff riêng (tạo qua API) thay sales01 để không đổi mật khẩu tài khoản dùng chung' };

async function canLogin(env: E2EEnv, username: string, password: string): Promise<boolean> {
  return apiLogin(env, username, password).then(
    () => true,
    () => false
  );
}

test.describe(SHEET, () => {
  test('SYS-PWD-01 – Đổi mật khẩu hợp lệ, đăng nhập bằng mật khẩu mới', async ({ page, browser, env, adminApi, uid, dialogs }, testInfo) => {
    traceTc(testInfo, 'SYS-PWD-01', SHEET, { mismatch: 'Description có "huỷ các phiên khác" nhưng code không làm; Expected không kiểm ý này.' });
    testInfo.annotations.push(SAME_ROLE);
    const acc = await makeAccount(adminApi, uid, { prefix: 'pwd' });
    const newPassword = `Moi@${uid.replace(/\D/g, '').slice(-6)}Ab`;
    const shell = new AppShell(page);
    await test.step('1. Đăng nhập', async () => {
      await new LoginPage(page).loginOk(acc.username, env.defaultPassword);
    });
    await test.step('2–3. Menu > Đổi mật khẩu; nhập mật khẩu hiện tại, mới, nhập lại', async () => {
      const f = await shell.openChangePassword(acc.name);
      await f.current.fill(env.defaultPassword);
      await f.next.fill(newPassword);
      await f.confirm.fill(newPassword);
      const [res] = await Promise.all([
        page.waitForResponse((r) => r.url().endsWith('/api/auth/change-password')),
        f.save.click(),
      ]);
      expect(res.status()).toBe(200);
    });
    await test.step('KQ1. Thông báo thành công', async () => {
      await expect(page.getByText('Đổi mật khẩu thành công')).toBeVisible();
    });
    await test.step('4. Đăng xuất, đăng nhập lại → KQ2. mật khẩu mới được, mật khẩu cũ không', async () => {
      const other = await newUserContext(browser, testInfo, dialogs);
      const login = new LoginPage(other.page);
      await login.goto();
      expect(await login.login(acc.username, env.defaultPassword)).toBeGreaterThanOrEqual(400);
      await expect(other.page.getByText('Tên đăng nhập hoặc mật khẩu không chính xác.')).toBeVisible();
      expect(await login.login(acc.username, newPassword)).toBe(200);
      await other.page.waitForURL((u) => !u.pathname.startsWith('/login'));
      await other.context.close();
    });
  });

  test('SYS-PWD-02 – Bấm Hủy đóng form, mật khẩu không đổi', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PWD-02', SHEET);
    testInfo.annotations.push(SAME_ROLE);
    const acc = await makeAccount(adminApi, uid, { prefix: 'pwd' });
    await new LoginPage(page).loginOk(acc.username, env.defaultPassword);
    const shell = new AppShell(page);
    let calls = 0;
    page.on('request', (r) => {
      if (r.url().endsWith('/api/auth/change-password')) calls++;
    });
    await test.step('1–2. Mở Đổi mật khẩu, nhập giá trị rồi bấm Hủy', async () => {
      const f = await shell.openChangePassword(acc.name);
      await f.current.fill(env.defaultPassword);
      await f.next.fill(`Huy@${uid.replace(/\D/g, '').slice(-6)}Ab`);
      await f.confirm.fill(`Huy@${uid.replace(/\D/g, '').slice(-6)}Ab`);
      await f.cancel.click();
    });
    await test.step('KQ1. Form đóng', async () => {
      await expect(page.getByRole('heading', { name: 'Đổi mật khẩu', level: 3 })).toHaveCount(0);
      expect(calls, 'không gửi yêu cầu đổi mật khẩu').toBe(0);
    });
    await test.step('KQ2. Mật khẩu cũ vẫn dùng được', async () => {
      expect(await canLogin(env, acc.username, env.defaultPassword)).toBe(true);
    });
  });

  test('SYS-PWD-03 – Sai mật khẩu hiện tại: báo lỗi, không đổi', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PWD-03', SHEET);
    testInfo.annotations.push(SAME_ROLE);
    const acc = await makeAccount(adminApi, uid, { prefix: 'pwd' });
    const newPassword = `Moi@${uid.replace(/\D/g, '').slice(-6)}Ab`;
    await new LoginPage(page).loginOk(acc.username, env.defaultPassword);
    await test.step('1–3. Nhập sai mật khẩu hiện tại, mật khẩu mới hợp lệ, bấm lưu', async () => {
      const f = await new AppShell(page).openChangePassword(acc.name);
      await f.current.fill(`Sai@${uid}`);
      await f.next.fill(newPassword);
      await f.confirm.fill(newPassword);
      const [res] = await Promise.all([page.waitForResponse((r) => r.url().endsWith('/api/auth/change-password')), f.save.click()]);
      expect(res.status()).toBeGreaterThanOrEqual(400);
    });
    await test.step('KQ1. "Mật khẩu hiện tại không chính xác (BR-37)."', async () => {
      await expect(page.getByText('Mật khẩu hiện tại không chính xác (BR-37).')).toBeVisible();
    });
    await test.step('KQ2. Mật khẩu không đổi', async () => {
      expect(await canLogin(env, acc.username, env.defaultPassword)).toBe(true);
      expect(await canLogin(env, acc.username, newPassword)).toBe(false);
    });
  });

  test('SYS-PWD-04 – Mật khẩu mới sai chính sách hoặc nhập lại không khớp bị từ chối', async ({ page, env, adminApi, uid }, testInfo) => {
    traceTc(testInfo, 'SYS-PWD-04', SHEET);
    testInfo.annotations.push(SAME_ROLE);
    const acc = await makeAccount(adminApi, uid, { prefix: 'pwd' });
    await new LoginPage(page).loginOk(acc.username, env.defaultPassword);
    const f = await new AppShell(page).openChangePassword(acc.name);
    await test.step('2. Mật khẩu mới không có chữ in hoa → KQ1. thông báo chính sách BR-35', async () => {
      const weak = `thuong@${uid.replace(/\D/g, '').slice(-6)}x`;
      await f.current.fill(env.defaultPassword);
      await f.next.fill(weak);
      await f.confirm.fill(weak);
      await f.save.click();
      const observed = (await page.getByText(/chữ in hoa/).first().textContent().catch(() => null)) ?? '(không có)';
      testInfo.annotations.push({ type: 'observed', description: `Thông báo thực tế: ${observed}` });
      await expect.soft(page.getByText(/phải có ít nhất 1 chữ in hoa \(BR-35\)\./)).toBeVisible();
    });
    await test.step('3. Nhập lại khác mật khẩu mới → KQ2. "Xác nhận mật khẩu mới không khớp."', async () => {
      await f.next.fill(`Dung@${uid.replace(/\D/g, '').slice(-6)}Ab`);
      await f.confirm.fill(`Khac@${uid.replace(/\D/g, '').slice(-6)}Ab`);
      await f.save.click();
      await expect(page.getByText('Xác nhận mật khẩu mới không khớp.')).toBeVisible();
    });
    await test.step('Mật khẩu không đổi', async () => {
      expect(await canLogin(env, acc.username, env.defaultPassword)).toBe(true);
    });
  });
});
