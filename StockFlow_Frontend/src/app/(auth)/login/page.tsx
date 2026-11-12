'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000'}/api/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.message ?? 'Tên đăng nhập hoặc mật khẩu không chính xác.');
        return;
      }

      const data = await res.json();
      localStorage.setItem('stockflow_token', data.token);
      localStorage.setItem('stockflow_user', JSON.stringify(data));

      // Xác định đúng vai trò của tài khoản nhân viên vừa đăng nhập
      const rawRole = (Array.isArray(data.roles) && data.roles.length > 0)
        ? data.roles[0]
        : (data.role || 'SALES');
      const upperRole = String(rawRole).toUpperCase();

      let targetRole: 'ADMIN' | 'MANAGER' | 'SALES' | 'WAREHOUSE' | 'PRODUCTION' = 'SALES';
      if (upperRole.includes('ADMIN')) targetRole = 'ADMIN';
      else if (upperRole.includes('MGR') || upperRole.includes('MANAGER')) targetRole = 'MANAGER';
      else if (upperRole.includes('WAREHOUSE') || upperRole.includes('KHO')) targetRole = 'WAREHOUSE';
      else if (upperRole.includes('PROD') || upperRole.includes('SANXUAT')) targetRole = 'PRODUCTION';
      else targetRole = 'SALES';

      localStorage.setItem('stockflow_current_role', targetRole);

      const defaultScreens: Record<string, string> = {
        ADMIN: 'admin-dashboard',
        MANAGER: 'manager-dashboard',
        WAREHOUSE: 'warehouse-overview',
        PRODUCTION: 'production-orders',
        SALES: 'sales-dashboard',
      };
      localStorage.setItem('stockflow_active_screen', defaultScreens[targetRole] || 'sales-dashboard');

      router.push('/dashboard');
    } catch {
      setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white text-2xl font-bold mb-3 shadow-lg">
            S
          </div>
          <h1 className="text-2xl font-bold text-slate-900">StockFlow</h1>
          <p className="text-sm text-slate-500 mt-1">Công ty TNHH Tín Phát</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-lg font-semibold text-slate-800 mb-6">Đăng nhập tài khoản</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          © 2026 Tín Phát — Hệ thống quản lý kho & đơn hàng
        </p>
      </div>
    </div>
  );
}
