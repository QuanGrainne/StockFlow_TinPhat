// Đọc cấu hình E2E và CHẶN mọi database / máy chủ không được phép.
// Quy tắc: chỉ PostgreSQL cục bộ, chỉ hai database stockflow_e2e_test và stockflow_e2e_template.
// Không bao giờ in mật khẩu: mọi log dùng describeConnection().
import fs from 'node:fs';
import path from 'node:path';

export const E2E_ROOT = path.resolve(__dirname, '..');
export const REPO_ROOT = path.resolve(E2E_ROOT, '..');
export const FRONTEND_DIR = path.join(REPO_ROOT, 'StockFlow_Frontend');
export const BACKEND_DIR = path.join(REPO_ROOT, 'StockFlow_Backend');
export const API_PROJECT_DIR = path.join(BACKEND_DIR, 'StockFlow.API');
export const MIGRATIONS_DIR = path.join(BACKEND_DIR, 'StockFlow.Infrastructure', 'Persistence', 'Migrations');
export const RUN_DIR = path.join(E2E_ROOT, '.e2e-run');

export const TEST_DB = 'stockflow_e2e_test';
export const TEMPLATE_DB = 'stockflow_e2e_template';
const ALLOWED_DBS = new Set([TEST_DB, TEMPLATE_DB]);
const ALLOWED_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
/** Database bảo trì chỉ dùng để DROP / CREATE hai database E2E và đọc thống kê; không ghi dữ liệu */
export const MAINTENANCE_DB = 'postgres';

export interface PgServer {
  host: string;
  port: number;
  user: string;
  password: string;
  searchPath: string;
}

export interface E2EEnv {
  pg: PgServer;
  webUrl: string;
  apiUrl: string;
  defaultPassword: string;
  rebuildTemplate: boolean;
  rebuildFrontend: boolean;
  skipReset: boolean;
}

export class E2EGuardError extends Error {
  constructor(message: string) {
    super(`[E2E GUARD] ${message}`);
    this.name = 'E2EGuardError';
  }
}

/** Tách chuỗi kiểu Npgsql "Host=..;Port=..;Username=..;Password=.." thành cặp khóa (chữ thường) / giá trị */
export function parseNpgsql(conn: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of conn.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    map.set(part.slice(0, idx).trim().toLowerCase(), part.slice(idx + 1).trim());
  }
  return map;
}

/** Dừng ngay nếu tên database không phải database E2E. Gọi trước MỌI kết nối / lệnh DROP / CREATE. */
export function assertAllowedDatabase(name: string): void {
  if (!ALLOWED_DBS.has(name)) {
    throw new E2EGuardError(
      `Database '${name}' không được phép. Bộ E2E chỉ dùng ${[...ALLOWED_DBS].join(' / ')}; tuyệt đối không dùng stockflow_dev hay database production.`
    );
  }
}

function assertAllowedHost(host: string): void {
  if (!ALLOWED_HOSTS.has(host.toLowerCase())) {
    throw new E2EGuardError(`Máy chủ PostgreSQL '${host}' không được phép. Bộ E2E chỉ chạy với PostgreSQL cục bộ (localhost).`);
  }
}

let cached: E2EEnv | undefined;

export function loadEnv(): E2EEnv {
  if (cached) return cached;
  const localFile = path.join(E2E_ROOT, '.env.e2e.local');
  if (fs.existsSync(localFile)) process.loadEnvFile(localFile);

  const raw = process.env.STOCKFLOW_E2E_PG;
  if (!raw) throw new E2EGuardError('Thiếu STOCKFLOW_E2E_PG (đặt trong StockFlow.E2ETests/.env.e2e.local, xem .env.e2e.example).');
  const kv = parseNpgsql(raw);
  const db = kv.get('database');
  // Chuỗi kết nối KHÔNG được mang database khác: chặn cấu hình nhầm (vd dán chuỗi của stockflow_dev)
  if (db !== undefined && db !== '') assertAllowedDatabase(db);
  const host = kv.get('host') ?? kv.get('server') ?? '';
  assertAllowedHost(host);
  const user = kv.get('username') ?? kv.get('user id') ?? kv.get('user') ?? '';
  const password = kv.get('password') ?? '';
  if (!user) throw new E2EGuardError('STOCKFLOW_E2E_PG thiếu Username.');

  const defaultPassword = process.env.E2E_DEFAULT_PASSWORD ?? '';
  if (!defaultPassword) throw new E2EGuardError('Thiếu E2E_DEFAULT_PASSWORD (mật khẩu mặc định của tài khoản seed).');

  const webUrl = process.env.E2E_WEB_URL ?? 'http://localhost:3000';
  const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:5100';
  if (new URL(webUrl).port !== '3000') {
    throw new E2EGuardError('E2E_WEB_URL phải dùng cổng 3000 (CORS của API chỉ cho http://localhost:3000).');
  }
  for (const u of [webUrl, apiUrl]) assertAllowedHost(new URL(u).hostname);

  cached = {
    pg: { host, port: Number(kv.get('port') ?? '5432'), user, password, searchPath: kv.get('searchpath') ?? 'stockflow,public' },
    webUrl,
    apiUrl,
    defaultPassword,
    rebuildTemplate: process.env.E2E_REBUILD_TEMPLATE === '1',
    rebuildFrontend: process.env.E2E_REBUILD_FRONTEND === '1',
    skipReset: process.env.E2E_SKIP_RESET === '1',
  };
  return cached;
}

/** Chuỗi Npgsql cho API, luôn trỏ một database E2E đã kiểm */
export function npgsqlConnection(env: E2EEnv, database: string): string {
  assertAllowedDatabase(database);
  const { host, port, user, password, searchPath } = env.pg;
  return `Host=${host};Port=${port};Database=${database};Username=${user};Password=${password};SearchPath=${searchPath}`;
}

/** Mô tả kết nối để ghi log (che mật khẩu) */
export function describeConnection(env: E2EEnv, database: string): string {
  return `postgres://${env.pg.user}:***@${env.pg.host}:${env.pg.port}/${database}`;
}
