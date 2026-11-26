// Kết nối PostgreSQL cho E2E. Mọi thao tác DROP / CREATE và mọi kết nối dữ liệu đều đi qua assertAllowedDatabase.
import { Client, type QueryResultRow } from 'pg';
import { assertAllowedDatabase, E2EGuardError, MAINTENANCE_DB, TEST_DB, type E2EEnv } from './env';

function clientFor(env: E2EEnv, database: string): Client {
  return new Client({
    host: env.pg.host,
    port: env.pg.port,
    user: env.pg.user,
    password: env.pg.password,
    database,
    application_name: 'stockflow-e2e',
  });
}

/** Kết nối database bảo trì (postgres) chỉ để quản lý hai database E2E và đọc thống kê */
export async function withMaintenance<T>(env: E2EEnv, fn: (c: Client) => Promise<T>): Promise<T> {
  const c = clientFor(env, MAINTENANCE_DB);
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end();
  }
}

export async function databaseExists(env: E2EEnv, name: string): Promise<boolean> {
  assertAllowedDatabase(name);
  return withMaintenance(env, async (c) => (await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])).rowCount === 1);
}

export async function dropDatabase(env: E2EEnv, name: string): Promise<void> {
  assertAllowedDatabase(name);
  await withMaintenance(env, async (c) => {
    await c.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  });
}

export async function createDatabase(env: E2EEnv, name: string, template?: string): Promise<void> {
  assertAllowedDatabase(name);
  if (template) assertAllowedDatabase(template);
  await withMaintenance(env, async (c) => {
    await c.query(
      template ? `CREATE DATABASE "${name}" TEMPLATE "${template}" STRATEGY FILE_COPY` : `CREATE DATABASE "${name}"`
    );
  });
}

/** Tổng số dòng đã ghi (insert + update + delete) của stockflow_dev theo thống kê máy chủ.
 *  Chỉ đọc pg_stat_database từ database bảo trì; KHÔNG kết nối vào stockflow_dev. */
export async function devDbWriteCounter(env: E2EEnv): Promise<number | null> {
  return withMaintenance(env, async (c) => {
    const r = await c.query<{ n: string | null }>(
      `SELECT (tup_inserted + tup_updated + tup_deleted)::text AS n FROM pg_stat_database WHERE datname = 'stockflow_dev'`
    );
    return r.rows.length ? Number(r.rows[0].n) : null;
  });
}

/** Kết nối một database E2E và xác nhận lại bằng current_database() */
export async function connectDb(env: E2EEnv, name: string = TEST_DB): Promise<Client> {
  assertAllowedDatabase(name);
  const c = clientFor(env, name);
  await c.connect();
  const cur = (await c.query<{ db: string }>('SELECT current_database() AS db')).rows[0].db;
  if (cur !== name) {
    await c.end();
    throw new E2EGuardError(`Đã kết nối nhầm database '${cur}' (mong đợi ${name}).`);
  }
  return c;
}

/** Danh sách migration đã áp (bảng __EFMigrationsHistory, tìm theo mọi schema) */
export async function appliedMigrations(c: Client): Promise<string[]> {
  const t = await c.query<{ s: string }>(
    `SELECT table_schema AS s FROM information_schema.tables WHERE table_name = '__EFMigrationsHistory' LIMIT 1`
  );
  if (!t.rows.length) return [];
  const r = await c.query<{ id: string }>(`SELECT "MigrationId" AS id FROM "${t.rows[0].s}"."__EFMigrationsHistory" ORDER BY 1`);
  return r.rows.map((x) => x.id);
}

/** Bảng được phép chụp / khôi phục để DỌN DỮ LIỆU TEST (không dùng thay thao tác nghiệp vụ đang kiểm) */
const RESTORABLE_TABLES = new Set(['stockflow.jnc_role_permissions']);

export interface TableSnapshot {
  table: string;
  columns: string[];
  rows: unknown[][];
}

export async function snapshotTable(c: Client, table: string): Promise<TableSnapshot> {
  if (!RESTORABLE_TABLES.has(table)) throw new E2EGuardError(`Không cho phép chụp bảng ${table}`);
  const r = await c.query({ text: `SELECT * FROM ${table}`, rowMode: 'array' });
  return { table, columns: r.fields.map((f) => f.name), rows: r.rows as unknown[][] };
}

/** Trả bảng về đúng bản chụp (trong một transaction, chỉ trên database E2E) */
export async function restoreTable(env: E2EEnv, snap: TableSnapshot): Promise<void> {
  if (!RESTORABLE_TABLES.has(snap.table)) throw new E2EGuardError(`Không cho phép khôi phục bảng ${snap.table}`);
  const c = await connectDb(env, TEST_DB);
  try {
    await c.query('BEGIN');
    await c.query(`DELETE FROM ${snap.table}`);
    const cols = snap.columns.map((x) => `"${x}"`).join(', ');
    for (const row of snap.rows) {
      const params = row.map((_, i) => `$${i + 1}`).join(', ');
      await c.query(`INSERT INTO ${snap.table} (${cols}) VALUES (${params})`, row);
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    await c.end();
  }
}

/** Truy vấn chỉ đọc dùng trong Assert */
export async function queryRows<R extends QueryResultRow>(c: Client, sql: string, params: unknown[] = []): Promise<R[]> {
  if (!/^\s*(select|with)\b/i.test(sql)) throw new E2EGuardError('Truy vấn kiểm kết quả chỉ được SELECT.');
  return (await c.query<R>(sql, params)).rows;
}
