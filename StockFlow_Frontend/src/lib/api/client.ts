import { DEV_AUTO_LOGIN_ENABLED } from '@/lib/auth/flags';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/** Xóa phiên hiện tại và đưa người dùng về màn đăng nhập. */
function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('stockflow_token');
  localStorage.removeItem('stockflow_user');
  localStorage.removeItem('stockflow_current_role');
  if (!window.location.pathname.includes('/login')) {
    // client.ts không phải component nên không dùng được useRouter; điều hướng cứng để xóa sạch state cũ.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/login');
  }
}

/**
 * Lấy token xác thực hiện tại hoặc tự động lấy token admin nếu chưa đăng nhập.
 */
async function resolveAuthToken(providedToken?: string): Promise<string | undefined> {
  if (providedToken) return providedToken;
  if (typeof window === 'undefined') return undefined;

  let token = localStorage.getItem('stockflow_token');
  if (token) return token;

  // Nếu đang ở màn hình login thì không tự ý lấy token admin ngầm
  if (typeof window !== 'undefined' && window.location.pathname.includes('/login')) {
    return undefined;
  }

  // Chỉ tự đăng nhập admin khi chạy dev và người dùng CHƯA từng đăng nhập trên trình duyệt này.
  // Nếu đã có phiên của một nhân viên (stockflow_user), tuyệt đối không âm thầm nâng lên admin.
  if (!DEV_AUTO_LOGIN_ENABLED || localStorage.getItem('stockflow_user')) {
    return undefined;
  }

  // Nếu chưa có token trong localStorage (chưa qua màn login), tự động lấy token admin để dev / test thông suốt
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'TinPhat@2026' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('stockflow_token', data.token);
        localStorage.setItem('stockflow_user', JSON.stringify(data));
        return data.token;
      }
    }
  } catch {
    // Backend chưa chạy hoặc lỗi mạng, bỏ qua
  }

  return undefined;
}

async function buildHeaders(token?: string): Promise<HeadersInit> {
  const authToken = await resolveAuthToken(token);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  return headers;
}

export interface ApiClientError extends Error {
  status?: number;
  response?: any;
}

/**
 * Base API client with JWT auth header injection, error handling, and auto-token recovery.
 */
export const apiClient = {
  async get<T>(path: string, token?: string): Promise<T> {
    const headers = await buildHeaders(token);
    const res = await fetch(`${API_BASE_URL}${path}`, { headers });
    return handleResponse<T>(res, () => apiClient.get<T>(path, token));
  },

  async post<T>(path: string, body: unknown, token?: string): Promise<T> {
    const headers = await buildHeaders(token);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res, () => apiClient.post<T>(path, body, token));
  },

  async put<T>(path: string, body: unknown, token?: string): Promise<T> {
    const headers = await buildHeaders(token);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res, () => apiClient.put<T>(path, body, token));
  },

  async delete<T>(path: string, token?: string): Promise<T> {
    const headers = await buildHeaders(token);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse<T>(res, () => apiClient.delete<T>(path, token));
  },

  async patch<T>(path: string, body?: unknown, token?: string): Promise<T> {
    const headers = await buildHeaders(token);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return handleResponse<T>(res, () => apiClient.patch<T>(path, body, token));
  },
};

async function handleResponse<T>(res: Response, retryFn?: () => Promise<T>): Promise<T> {
  if (!res.ok) {
    // Xử lý riêng mã lỗi 401 Unauthorized (hết hạn token hoặc token không hợp lệ)
    if (res.status === 401 && typeof window !== 'undefined') {
      const hadSession = !!localStorage.getItem('stockflow_user');
      localStorage.removeItem('stockflow_token');

      // Chưa từng đăng nhập + đang dev: thử tự đăng nhập admin và retry 1 lần
      if (!hadSession && retryFn) {
        const refreshedToken = await resolveAuthToken();
        if (refreshedToken) {
          return retryFn();
        }
      }

      // Phiên của nhân viên đã hết hạn / tài khoản bị khóa: buộc đăng nhập lại đúng tài khoản
      redirectToLogin();
      const authErr = new Error('Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập lại.') as ApiClientError;
      authErr.status = 401;
      throw authErr;
    }

    const error = await res.json().catch(() => ({ message: res.statusText }));
    const msg = error?.message || error?.title || `HTTP error ${res.status}`;
    const customErr = new Error(msg) as ApiClientError;
    customErr.status = res.status;
    customErr.response = error;
    throw customErr;
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as unknown as T;
  return res.json() as Promise<T>;
}
