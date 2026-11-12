'use client';

import { tabSession } from '@/lib/auth/tabSession';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';

type InvalidField = 'username' | 'password' | 'both' | null;

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState<InvalidField>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setInvalid(null);

    if (!username || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      setInvalid(!username && !password ? 'both' : !username ? 'username' : 'password');
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
        setInvalid('password');
        return;
      }

      const data = await res.json();
      tabSession.set('stockflow_token', data.token);
      tabSession.set('stockflow_user', JSON.stringify(data));

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

      tabSession.set('stockflow_current_role', targetRole);

      // Vào Tổng quan; vai trò không được phân quyền Tổng quan sẽ tự chuyển sang trang đầu tiên được phép
      tabSession.remove('stockflow_active_screen');
      router.push('/dashboard');
    } catch {
      setError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }

  const usernameInvalid = invalid === 'username' || invalid === 'both';
  const passwordInvalid = invalid === 'password' || invalid === 'both';
  const fieldClass = (isInvalid: boolean) =>
    `flex items-center gap-2 h-12 px-3.5 rounded-lg border bg-white transition focus-within:ring-2 ${
      isInvalid
        ? 'border-[#D71920] focus-within:ring-red-100'
        : 'border-slate-300 focus-within:border-[#D71920] focus-within:ring-red-100'
    }`;

  return (
    // Nền: ảnh toàn cảnh nhà xưởng Tín Phát (.stockflow-login-bg trong globals.css)
    <div className="min-h-screen flex items-center justify-center stockflow-login-bg px-4 py-10">
      <div className="w-full max-w-[590px] bg-white/94 backdrop-blur-sm border border-white/80 rounded-2xl shadow-[0_20px_50px_-12px_rgba(15,23,42,0.32)] px-6 py-10 sm:px-12 sm:py-12">
        {/* Logo / Branding */}
        <div className="flex flex-col items-center">
          <BrandLogo width={128} priority />
          <p className="mt-2 text-base text-slate-500">Quản lý kho &amp; đơn hàng</p>
        </div>

        <h1 className="mt-8 mb-8 text-center text-[28px] font-bold text-slate-900">Đăng nhập</h1>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="login-username" className="block text-[15px] text-slate-700 mb-2">
            Tên đăng nhập
          </label>
          <div className={fieldClass(usernameInvalid)}>
            <User size={18} className="text-slate-500 shrink-0" />
            <input
              id="login-username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nhập tên đăng nhập"
              className="flex-1 min-w-0 h-full bg-transparent text-[15px] text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          <label htmlFor="login-password" className="block text-[15px] text-slate-700 mt-6 mb-2">
            Mật khẩu
          </label>
          <div className={fieldClass(passwordInvalid)}>
            <Lock size={18} className="text-slate-500 shrink-0" />
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu"
              className="flex-1 min-w-0 h-full bg-transparent text-[15px] text-slate-900 placeholder-slate-400 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="p-1 text-slate-400 hover:text-slate-600 shrink-0"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-10 rounded-lg bg-[#D71920] hover:bg-[#BE141B] active:bg-[#A51117] text-white text-[15px] font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
