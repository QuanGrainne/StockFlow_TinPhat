// Chuẩn bị một lượt chạy E2E. Thứ tự:
// guard → cổng trống → build API → database mẫu → dựng lại stockflow_e2e_test → API (migrate + seed)
// → kiểm migration / seed / kho → build + start frontend → tạo tài khoản phụ qua API.
import fs from 'node:fs';
import { RUN_DIR, TEST_DB, loadEnv } from './env';
import { connectDb, devDbWriteCounter } from './pg';
import {
  assertPortsFree,
  buildBackend,
  ensureFrontendBuild,
  ensureTemplate,
  log,
  newJwtKey,
  resetTestDb,
  startApi,
  startWeb,
  verifyMigrated,
  killTree,
} from './stack';
import { ApiSession } from './api';
import { WAREHOUSES, ensureE2EAccounts } from './accounts';
import { RUN_FILE, type RunInfo } from './data';

async function timed<T>(timings: Record<string, number>, key: string, fn: () => Promise<T> | T): Promise<T> {
  const t = Date.now();
  try {
    return await fn();
  } finally {
    timings[key] = Date.now() - t;
  }
}

export default async function globalSetup(): Promise<void> {
  const env = loadEnv(); // guard: sai DB / host thì dừng ở đây, chưa kết nối gì
  fs.mkdirSync(RUN_DIR, { recursive: true });
  if (fs.existsSync(RUN_FILE)) fs.rmSync(RUN_FILE);
  const now = new Date();
  const runId = `${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
  const timings: Record<string, number> = {};
  const started: number[] = [];
  try {
    await assertPortsFree([Number(new URL(env.webUrl).port), Number(new URL(env.apiUrl).port)]);
    const devWriteCounterBefore = await devDbWriteCounter(env);
    const jwtKey = newJwtKey();

    await timed(timings, 'buildBackend', () => buildBackend());
    let template: RunInfo['template'] = 'skipped';
    if (!env.skipReset) {
      template = await timed(timings, 'template', () => ensureTemplate(env, jwtKey));
      await timed(timings, 'resetDb', () => resetTestDb(env));
    } else {
      log('E2E_SKIP_RESET=1: dùng lại stockflow_e2e_test hiện có (chỉ để thử cô lập dữ liệu)');
    }
    const api = await timed(timings, 'startApi', () => startApi(env, TEST_DB, jwtKey));
    started.push(api.pid);
    const migrations = await verifyMigrated(env, TEST_DB);

    // Kho trong seed phải khớp bảng mã kho mà test dùng
    const db = await connectDb(env);
    try {
      const rows = (await db.query<{ id: number; code: string }>('SELECT warehouse_id AS id, warehouse_code AS code FROM stockflow.mst_warehouses WHERE is_active')).rows;
      for (const [code, w] of Object.entries(WAREHOUSES)) {
        if (!rows.some((r) => r.code === code && r.id === w.id)) throw new Error(`Kho ${code} không có id ${w.id} trong seed`);
      }
    } finally {
      await db.end();
    }

    const frontend = await timed(timings, 'buildFrontend', () => ensureFrontendBuild(env));
    const web = await timed(timings, 'startWeb', () => startWeb(env));
    started.push(web.pid);

    const admin = await ApiSession.login(env, 'admin', env.defaultPassword);
    const accounts = await timed(timings, 'accounts', () => ensureE2EAccounts(admin));
    await admin.dispose();

    const info: RunInfo = {
      runId,
      startedAt: now.toISOString(),
      apiPid: api.pid,
      webPid: web.pid,
      devWriteCounterBefore,
      template,
      frontend,
      migrations,
      accounts,
      timingsMs: timings,
    };
    fs.writeFileSync(RUN_FILE, JSON.stringify(info, null, 2));
    log(`Sẵn sàng: run ${runId}, ${migrations} migration, template ${template}, frontend ${frontend}, thời gian ${JSON.stringify(timings)}`);
  } catch (e) {
    for (const pid of started) killTree(pid);
    throw e;
  }
}
