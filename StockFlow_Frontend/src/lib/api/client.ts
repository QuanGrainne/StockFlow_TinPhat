const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

/**
 * Base API client with JWT auth header injection and error handling.
 */
export const apiClient = {
  async get<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: buildHeaders(token),
    });
    return handleResponse<T>(res);
  },

  async post<T>(path: string, body: unknown, token?: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  async put<T>(path: string, body: unknown, token?: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'PUT',
      headers: buildHeaders(token),
      body: JSON.stringify(body),
    });
    return handleResponse<T>(res);
  },

  async delete<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: 'DELETE',
      headers: buildHeaders(token),
    });
    return handleResponse<T>(res);
  },
};

function buildHeaders(token?: string): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error?.message ?? `HTTP error ${res.status}`);
  }
  return res.json() as Promise<T>;
}
