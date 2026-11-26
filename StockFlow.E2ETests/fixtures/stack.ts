// Dựng môi trường E2E: kiểm cổng, build, database mẫu, khởi động / dừng API và frontend.
// Không bao giờ dừng tiến trình không do bộ test mở (cổng bận thì báo lỗi và dừng).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import {
  API_PROJECT_DIR,
  E2EGuardError,
  FRONTEND_DIR,
  MIGRATIONS_DIR,
  RUN_DIR,
  TEMPLATE_DB,
  TEST_DB,
  assertAllowedDatabase,
  describeConnection,
  npgsqlConnection,
  type E2EEnv,
} from './env';
import { appliedMigrations, connectDb, createDatabase, databaseExists, dropDatabase } from './pg';

export const LOG_DIR = path.join(RUN_DIR, 'logs');
const NEXT_BIN = path.join(FRONTEND_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
const API_DLL_DIR = path.join(API_PROJECT_DIR, 'bin', 'Debug', 'net9.0');
const FRONTEND_MARKER = path.join(RUN_DIR, 'frontend-build.json');

export function log(msg: string): void {
  const line = `[e2e ${new Date().toISOString().slice(11, 19)}] ${msg}`;
  console.log(line);
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.appendFileSync(path.join(LOG_DIR, 'setup.log'), line + '\n');
}

function portInUse(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.connect({ port, host });
    s.setTimeout(800);
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('timeout', () => { s.destroy(); resolve(false); });
    s.once('error', () => resolve(false));
  });
}

export async function assertPortsFree(ports: number[]): Promise<void> {
  for (const p of ports) {
    if ((await portInUse(p, '127.0.0.1')) || (await portInUse(p, '::1'))) {
      throw new E2EGuardError(
        `Cổng ${p} đang được dùng. Hãy tắt tiến trình đang chiếm cổng (vd npm run dev hoặc API dev) rồi chạy lại; bộ test không tự dừng tiến trình của bạn.`
      );
    }
  }
}

function runSync(name: string, cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env): void {
  const logFile = path.join(LOG_DIR, `${name}.log`);
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const r = spawnSync(cmd, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  fs.writeFileSync(logFile, `${r.stdout ?? ''}\n${r.stderr ?? ''}`);
  if (r.status !== 0) {
    throw new Error(`${name} thất bại (mã ${r.status ?? r.error?.message}). Xem ${logFile}`);
  }
}

export interface Started {
  name: string;
  pid: number;
}

function startBackground(name: string, cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Started {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const out = fs.openSync(path.join(LOG_DIR, `${name}.log`), 'w');
  const child = spawn(cmd, args, { cwd, env, stdio: ['ignore', out, out], windowsHide: true });
  if (child.pid === undefined) throw new Error(`Không khởi động được ${name}`);
  child.unref();
  return { name, pid: child.pid };
}

export function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function killTree(pid: number): void {
  if (!processAlive(pid)) return;
  if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true });
  else process.kill(pid, 'SIGTERM');
}

async function waitForHttp(url: string, timeoutMs: number, started?: Started): Promise<void> {
  const until = Date.now() + timeoutMs;
  let last = '';
  while (Date.now() < until) {
    if (started && !processAlive(started.pid)) {
      throw new Error(`${started.name} đã dừng trước khi sẵn sàng. Xem ${path.join(LOG_DIR, started.name + '.log')}`);
    }
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return;
      last = `HTTP ${res.status}`;
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Hết thời gian chờ ${url} (${last})`);
}

// ── Backend ───────────────────────────────────────────────────────────────────
export function buildBackend(): void {
  log('dotnet build StockFlow.API');
  runSync('build-backend', 'dotnet', ['build', path.join(API_PROJECT_DIR, 'StockFlow.API.csproj'), '-c', 'Debug', '--nologo', '-v', 'q'], API_PROJECT_DIR);
}

export function newJwtKey(): string {
  return randomBytes(48).toString('base64');
}

export async function startApi(env: E2EEnv, database: string, jwtKey: string, name = 'api'): Promise<Started> {
  assertAllowedDatabase(database);
  const childEnv: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(process.env)) {
    // Không chuyển khóa payOS hay chuỗi kết nối nào khác sang API của E2E
    if (/^PAYOS__/i.test(k) || /^CONNECTIONSTRINGS__/i.test(k) || /^STOCKFLOW_/i.test(k)) continue;
    childEnv[k] = v;
  }
  Object.assign(childEnv, {
    ASPNETCORE_ENVIRONMENT: 'E2E',
    DOTNET_ENVIRONMENT: 'E2E',
    ASPNETCORE_URLS: env.apiUrl,
    ConnectionStrings__StockFlowDb: npgsqlConnection(env, database),
    Jwt__SecretKey: jwtKey,
    Storage__UploadsPath: path.join(RUN_DIR, 'uploads'),
    Seed__DemoData: 'true',
  });
  log(`Khởi động API ${env.apiUrl} → ${describeConnection(env, database)}`);
  const started = startBackground(name, 'dotnet', [path.join(API_DLL_DIR, 'StockFlow.API.dll')], API_DLL_DIR, childEnv);
  await waitForHttp(`${env.apiUrl}/api/health`, 180_000, started);
  return started;
}

/** Danh sách migration trong repo (tên file <timestamp>_<Tên>.cs, bỏ Designer) */
export function repoMigrations(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{14}_.+\.cs$/.test(f) && !f.endsWith('.Designer.cs'))
    .map((f) => f.replace(/\.cs$/, ''))
    .sort();
}

export async function verifyMigrated(env: E2EEnv, database: string): Promise<number> {
  const c = await connectDb(env, database);
  try {
    const applied = await appliedMigrations(c);
    const expected = repoMigrations();
    const missing = expected.filter((m) => !applied.includes(m));
    if (missing.length) throw new Error(`Database ${database} thiếu ${missing.length} migration (vd ${missing[0]}). Xem log API.`);
    const admin = await c.query(`SELECT 1 FROM stockflow.sec_users WHERE username = 'admin'`);
    if (admin.rowCount !== 1) throw new Error(`Database ${database} chưa có dữ liệu seed (không thấy tài khoản admin).`);
    return applied.length;
  } finally {
    await c.end();
  }
}

/** Dựng database mẫu khi chưa có hoặc migration trong repo đã đổi */
export async function ensureTemplate(env: E2EEnv, jwtKey: string): Promise<'reused' | 'built'> {
  if (!env.rebuildTemplate && (await databaseExists(env, TEMPLATE_DB))) {
    const c = await connectDb(env, TEMPLATE_DB);
    const applied = await appliedMigrations(c).finally(() => c.end());
    const expected = repoMigrations();
    if (expected.every((m) => applied.includes(m))) return 'reused';
    log('Migration trong repo khác database mẫu → dựng lại');
  }
  log(`Dựng database mẫu ${TEMPLATE_DB} (migrate + seed qua API)`);
  await dropDatabase(env, TEMPLATE_DB);
  await createDatabase(env, TEMPLATE_DB);
  const api = await startApi(env, TEMPLATE_DB, jwtKey, 'api-template');
  try {
    await verifyMigrated(env, TEMPLATE_DB);
  } finally {
    killTree(api.pid);
  }
  for (let i = 0; i < 20 && processAlive(api.pid); i++) await new Promise((r) => setTimeout(r, 250));
  return 'built';
}

export async function resetTestDb(env: E2EEnv): Promise<void> {
  log(`Dựng lại ${TEST_DB} từ ${TEMPLATE_DB}`);
  await dropDatabase(env, TEST_DB);
  await createDatabase(env, TEST_DB, TEMPLATE_DB);
}

// ── Frontend ──────────────────────────────────────────────────────────────────
interface FrontendMarker {
  buildId: string;
  apiUrl: string;
}

function readBuildId(): string | null {
  const f = path.join(FRONTEND_DIR, '.next', 'BUILD_ID');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : null;
}

/** Tìm chuỗi địa chỉ API trong bundle phía trình duyệt để chắc NEXT_PUBLIC_API_URL đã được gắn đúng */
function bundleHasApiUrl(apiUrl: string): boolean {
  const dir = path.join(FRONTEND_DIR, '.next', 'static');
  if (!fs.existsSync(dir)) return false;
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop() as string;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (e.name.endsWith('.js') && fs.readFileSync(p, 'utf8').includes(apiUrl)) return true;
    }
  }
  return false;
}

export function ensureFrontendBuild(env: E2EEnv): 'reused' | 'built' {
  const buildId = readBuildId();
  let marker: FrontendMarker | null = null;
  if (fs.existsSync(FRONTEND_MARKER)) marker = JSON.parse(fs.readFileSync(FRONTEND_MARKER, 'utf8')) as FrontendMarker;
  const reusable = !env.rebuildFrontend && buildId !== null && marker !== null && marker.buildId === buildId && marker.apiUrl === env.apiUrl;
  if (reusable && bundleHasApiUrl(env.apiUrl)) return 'reused';
  log(`next build với NEXT_PUBLIC_API_URL=${env.apiUrl}`);
  runSync('build-frontend', process.execPath, [NEXT_BIN, 'build'], FRONTEND_DIR, {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_PUBLIC_API_URL: env.apiUrl,
    NEXT_PUBLIC_DEV_AUTO_LOGIN: 'false',
    NEXT_PUBLIC_ENABLE_ROLE_SWITCHER: 'false',
    NEXT_TELEMETRY_DISABLED: '1',
  });
  const newId = readBuildId();
  if (!newId) throw new Error('next build không tạo .next/BUILD_ID');
  if (!bundleHasApiUrl(env.apiUrl)) throw new Error(`Bundle frontend không chứa ${env.apiUrl}: NEXT_PUBLIC_API_URL chưa được gắn`);
  fs.mkdirSync(RUN_DIR, { recursive: true });
  fs.writeFileSync(FRONTEND_MARKER, JSON.stringify({ buildId: newId, apiUrl: env.apiUrl } satisfies FrontendMarker, null, 2));
  return 'built';
}

export async function startWeb(env: E2EEnv): Promise<Started> {
  log(`Khởi động frontend ${env.webUrl} (next start)`);
  const started = startBackground('web', process.execPath, [NEXT_BIN, 'start', '-p', new URL(env.webUrl).port], FRONTEND_DIR, {
    ...process.env,
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
  });
  await waitForHttp(`${env.webUrl}/login`, 120_000, started);
  return started;
}
