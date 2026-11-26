// Màn đăng nhập (src/app/(auth)/login/page.tsx): nhãn "Tên đăng nhập", "Mật khẩu", nút "Đăng nhập".
import { expect, type Locator, type Page } from '@playwright/test';

export class LoginPage {
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;

  constructor(readonly page: Page) {
    this.username = page.getByLabel('Tên đăng nhập', { exact: true });
    // exact: nút "Hiện mật khẩu" cũng chứa chữ "mật khẩu"
    this.password = page.getByLabel('Mật khẩu', { exact: true });
    this.submit = page.getByRole('button', { name: 'Đăng nhập', exact: true });
  }

  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.username).toBeVisible();
  }

  async fill(username: string, password: string): Promise<void> {
    await this.username.fill(username);
    await this.password.fill(password);
  }

  /** Đăng nhập và chờ phản hồi của POST /api/auth/login */
  async login(username: string, password: string): Promise<number> {
    await this.fill(username, password);
    const [res] = await Promise.all([
      this.page.waitForResponse((r) => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST'),
      this.submit.click(),
    ]);
    return res.status();
  }

  /** Đăng nhập thành công và rời khỏi /login */
  async loginOk(username: string, password: string): Promise<void> {
    await this.goto();
    const status = await this.login(username, password);
    expect(status, `Đăng nhập ${username}`).toBe(200);
    await this.page.waitForURL((u) => !u.pathname.startsWith('/login'));
    // Header / menu tải quyền và kho sau khi vào trang; chờ mạng lặng để giao diện ổn định trước thao tác kế tiếp
    await this.page.waitForLoadState('networkidle');
  }
}
