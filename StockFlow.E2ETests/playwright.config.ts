// Cấu hình Playwright cho System / E2E test StockFlow (Report 5.3).
// Một worker, không chạy song song, không retry: các test dùng chung một database và một bộ tài khoản.
import { defineConfig } from '@playwright/test';

const webUrl = process.env.E2E_WEB_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  testIgnore: process.env.E2E_EXPLORE === '1' ? [] : ['**/_explore/**'],
  outputDir: './test-results',
  globalSetup: require.resolve('./fixtures/global-setup'),
  globalTeardown: require.resolve('./fixtures/global-teardown'),
  workers: 1,
  fullyParallel: false,
  retries: 0,
  forbidOnly: true,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: './reports/html', open: 'never' }],
    ['json', { outputFile: './reports/results.json' }],
  ],
  use: {
    baseURL: webUrl,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Quay video cần ffmpeg của Playwright (tải riêng: npx playwright install ffmpeg). Mặc định tắt;
    // trace đã có ảnh từng bước. Bật bằng E2E_VIDEO=1 khi máy đã có ffmpeg.
    video: process.env.E2E_VIDEO === '1' ? 'retain-on-failure' : 'off',
  },
  projects: [
    { name: 'chrome-1366', use: { channel: 'chrome', viewport: { width: 1366, height: 768 } } },
    { name: 'chrome-1920', use: { channel: 'chrome', viewport: { width: 1920, height: 1080 } } },
    // Edge chỉ chạy khi gọi rõ --project=msedge-1366 (smoke)
    ...(process.env.E2E_EDGE === '1'
      ? [{ name: 'msedge-1366', use: { channel: 'msedge', viewport: { width: 1366, height: 768 } } }]
      : []),
  ],
});
