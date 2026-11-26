// API client dùng cho bước Arrange (dựng dữ liệu) và kiểm phản hồi. Thao tác nghiệp vụ ĐANG KIỂM luôn làm qua UI.
import { request, type APIRequestContext, type APIResponse } from '@playwright/test';
import type { E2EEnv } from './env';

export interface LoginResponse {
  token: string;
  userId: number;
  username: string;
  fullName: string;
  roles: string[];
  warehouses: { warehouseId: number; warehouseCode: string; warehouseName: string }[];
}

export class ApiError extends Error {
  constructor(readonly method: string, readonly url: string, readonly status: number, readonly body: string) {
    super(`${method} ${url} → ${status}: ${body.slice(0, 300)}`);
    this.name = 'ApiError';
  }
}

async function readJson<T>(method: string, url: string, res: APIResponse): Promise<T> {
  const text = await res.text();
  if (!res.ok()) throw new ApiError(method, url, res.status(), text);
  return (text ? JSON.parse(text) : null) as T;
}

/** Đăng nhập qua API, không qua giao diện */
export async function apiLogin(env: E2EEnv, username: string, password: string): Promise<LoginResponse> {
  const anon = await request.newContext({ baseURL: env.apiUrl });
  try {
    const res = await anon.post('/api/auth/login', { data: { username, password } });
    return await readJson<LoginResponse>('POST', '/api/auth/login', res);
  } finally {
    await anon.dispose();
  }
}

export class ApiSession {
  private constructor(private readonly ctx: APIRequestContext, readonly user: LoginResponse) {}

  static async login(env: E2EEnv, username: string, password: string): Promise<ApiSession> {
    const user = await apiLogin(env, username, password);
    const ctx = await request.newContext({ baseURL: env.apiUrl, extraHTTPHeaders: { Authorization: `Bearer ${user.token}` } });
    return new ApiSession(ctx, user);
  }

  async get<T>(url: string): Promise<T> {
    return readJson<T>('GET', url, await this.ctx.get(url));
  }

  async post<T>(url: string, data?: unknown): Promise<T> {
    return readJson<T>('POST', url, await this.ctx.post(url, { data }));
  }

  async put<T>(url: string, data?: unknown): Promise<T> {
    return readJson<T>('PUT', url, await this.ctx.put(url, { data }));
  }

  async patch<T>(url: string, data?: unknown): Promise<T> {
    return readJson<T>('PATCH', url, await this.ctx.patch(url, { data }));
  }

  async delete<T>(url: string): Promise<T> {
    return readJson<T>('DELETE', url, await this.ctx.delete(url));
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}
