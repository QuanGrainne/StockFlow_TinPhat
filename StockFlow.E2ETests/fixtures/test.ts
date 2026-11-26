// test mở rộng dùng cho mọi spec: môi trường, API admin (Arrange), database (Assert), hậu tố duy nhất,
// chặn mạng ngoài, xử lý hộp thoại gốc của trình duyệt (confirm/alert) và mở phiên cho nhiều người dùng.
import { test as base, expect, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import type { Client } from 'pg';
import { loadEnv, type E2EEnv } from './env';
import { connectDb } from './pg';
import { ApiSession } from './api';
import { uniqueSuffix } from './data';

const PNG_1X1 = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

/** Chặn mọi request ra ngoài máy (ảnh avatar unsplash trả ảnh giả; payOS trả lỗi giả lập) */
export async function isolateNetwork(context: BrowserContext): Promise<void> {
  // Playwright chạy route khớp theo thứ tự NGƯỢC lúc đăng ký: đăng ký luật chung (chặn) trước, luật riêng sau
  await context.route(/^https?:\/\/(?!localhost[:/]|127\.0\.0\.1[:/])/, (route) => route.abort('blockedbyclient'));
  await context.route(/^https?:\/\/images\.unsplash\.com\//, (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: PNG_1X1 })
  );
  await context.route(/\/api\/payments\/payos/i, (route) =>
    route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'payOS được giả lập trong E2E' }) })
  );
}

export interface SeenDialog {
  type: string;
  message: string;
}

/** Ghi lại và chấp nhận hộp thoại gốc. Hộp thoại không được khai báo trước bằng expect() làm test Fail khi kết thúc. */
export class DialogRecorder {
  readonly seen: SeenDialog[] = [];
  private readonly allowed: RegExp[] = [];

  expect(pattern: RegExp): void {
    this.allowed.push(pattern);
  }

  attach(page: Page): void {
    page.on('dialog', async (d) => {
      this.seen.push({ type: d.type(), message: d.message() });
      await d.accept();
    });
  }

  unexpected(): SeenDialog[] {
    return this.seen.filter((s) => !this.allowed.some((r) => r.test(s.message)));
  }
}

/** Mở một browser context riêng cho một người dùng khác (luồng nhiều người dùng), cùng cấu hình project */
export async function newUserContext(browser: Browser, testInfo: TestInfo, dialogs: DialogRecorder): Promise<{ context: BrowserContext; page: Page }> {
  const u = testInfo.project.use;
  const context = await browser.newContext({
    baseURL: u.baseURL,
    locale: u.locale,
    timezoneId: u.timezoneId,
    viewport: u.viewport,
  });
  await isolateNetwork(context);
  const page = await context.newPage();
  dialogs.attach(page);
  return { context, page };
}

interface WorkerFixtures {
  env: E2EEnv;
  adminApi: ApiSession;
  db: Client;
}

interface TestFixtures {
  uid: string;
  dialogs: DialogRecorder;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  env: [async ({}, use) => { await use(loadEnv()); }, { scope: 'worker' }],
  adminApi: [
    async ({ env }, use) => {
      const s = await ApiSession.login(env, 'admin', env.defaultPassword);
      await use(s);
      await s.dispose();
    },
    { scope: 'worker' },
  ],
  db: [
    async ({ env }, use) => {
      const c = await connectDb(env);
      await use(c);
      await c.end();
    },
    { scope: 'worker' },
  ],
  context: async ({ context }, use) => {
    await isolateNetwork(context);
    await use(context);
  },
  uid: async ({}, use) => {
    await use(uniqueSuffix());
  },
  dialogs: [
    async ({ page }, use, testInfo) => {
      const rec = new DialogRecorder();
      rec.attach(page);
      await use(rec);
      if (rec.seen.length) testInfo.annotations.push({ type: 'dialogs', description: rec.seen.map((d) => `${d.type}: ${d.message}`).join(' | ') });
      const bad = rec.unexpected();
      if (bad.length) throw new Error(`Hộp thoại không dự kiến: ${bad.map((d) => d.message).join(' | ')}`);
    },
    { auto: true },
  ],
});

export { expect };

/** Gắn mã TC và sheet vào báo cáo (truy vết sang Report 5.3) */
export function traceTc(testInfo: TestInfo, tc: string, sheet: string, extra: { mismatch?: string; knownDefect?: string } = {}): void {
  testInfo.annotations.push({ type: 'tc', description: tc }, { type: 'sheet', description: sheet });
  if (extra.mismatch) testInfo.annotations.push({ type: 'SPEC_CODE_MISMATCH', description: extra.mismatch });
  if (extra.knownDefect) testInfo.annotations.push({ type: 'KNOWN_DEFECT', description: extra.knownDefect });
}
