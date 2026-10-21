// src/features/roles/components/admin/screens/AdminDashboard.tsx
// Màn hình Tổng quan Quản trị viên (Admin Dashboard) theo giao diện AI Studio Ảnh 1

import React, { useState } from 'react';
import {
  Users,
  Shield,
  Building2,
  Activity,
  KeyRound,
  UserPlus,
  Clock,
  CheckCircle2,
  X,
  Warehouse,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { UserRole } from '../../../types';

interface AdminDashboardProps {
  onNavigate: (screenId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  // Modal State: Đổi mật khẩu & Thêm nhân viên
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('Phòng Kinh doanh');
  const [formRole, setFormRole] = useState<UserRole>('SALES');
  const [formWarehouses, setFormWarehouses] = useState<string[]>(['WH-HN-01']);
  const [createSuccess, setCreateSuccess] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    }, 1200);
  };

  const handleCreateStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      alert('Vui lòng điền họ tên và email!');
      return;
    }

    const roleTitleMap: Record<UserRole, string> = {
      ADMIN: 'Quản trị viên',
      MANAGER: 'Quản lý',
      SALES: 'Nhân viên bán hàng',
      WAREHOUSE: 'Nhân viên kho',
      PRODUCTION: 'Nhân viên sản xuất',
    };

    await adminService.createStaff({
      code: `NV-NV00${Math.floor(Math.random() * 90) + 10}`,
      name: formName,
      title: formTitle || 'Chuyên viên',
      email: formEmail,
      phone: formPhone || '0900 000 000',
      department: formDept,
      role: formRole,
      roleTitle: roleTitleMap[formRole],
      assignedWarehouses: formWarehouses,
      status: 'ACTIVE',
    });

    setCreateSuccess(true);
    setTimeout(() => {
      setCreateSuccess(false);
      setCreateModalOpen(false);
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormTitle('');
      onNavigate('admin-staff');
    }, 800);
  };

  const [currentAdmin, setCurrentAdmin] = useState({
    name: 'Quản trị viên Hệ thống',
    code: 'NV-ADMIN',
    title: 'Quản trị hệ thống',
    email: 'admin@tinphat.vn',
    initials: 'AD',
  });

  React.useEffect(() => {
    const rawUser = typeof window !== 'undefined' ? localStorage.getItem('stockflow_user') : null;
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        const name = u.fullName || u.username || 'Quản trị viên';
        const code = u.code || `NV-NV${String(u.userId || 1).padStart(3, '0')}`;
        const words = name.trim().split(/\s+/);
        const initials = words.length > 1
          ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase();

        setCurrentAdmin({
          name,
          code,
          title: 'Quản trị hệ thống',
          email: u.email || 'admin@tinphat.vn',
          initials,
        });
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Top Admin Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {/* Avatar Profile */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 text-white flex items-center justify-center font-bold text-xl ring-4 ring-blue-50 shadow-sm shrink-0">
            <span>{currentAdmin.initials}</span>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{currentAdmin.name}</h2>
              <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-[4px] bg-[#EBF4FF] text-[#2B6CB0]">
                {currentAdmin.code}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Đang hoạt động
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {currentAdmin.title} • {currentAdmin.email}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPasswordModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <KeyRound size={14} className="text-slate-500" />
            <span>Đổi mật khẩu</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
          >
            <UserPlus size={14} />
            <span>+ Thêm nhân viên</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Tổng nhân sự */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Tổng nhân sự
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">6</span>
              <span className="text-xs font-medium text-emerald-600">(5 hoạt động)</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Đã khóa: 1</span>
            <button
              type="button"
              onClick={() => onNavigate('admin-staff')}
              className="font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              Xem danh sách
            </button>
          </div>
        </div>

        {/* Card 2: Vai trò RBAC */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Vai trò RBAC
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Shield size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">5</span>
              <span className="text-xs font-medium text-blue-600">(5 hệ thống)</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">8 module phân quyền</span>
            <button
              type="button"
              onClick={() => onNavigate('admin-matrix')}
              className="font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              Cấu hình quyền
            </button>
          </div>
        </div>

        {/* Card 3: Cơ sở kho */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Cơ sở kho
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Warehouse size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">4</span>
              <span className="text-xs font-medium text-slate-600">Kho vật lý</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Cách ly theo BR-03</span>
            <button
              type="button"
              onClick={() => onNavigate('admin-warehouse-perms')}
              className="font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              Phân quyền kho
            </button>
          </div>
        </div>

        {/* Card 4: Phiên hoạt động */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Phiên hoạt động
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">24</span>
              <span className="text-xs font-medium text-slate-600">JWT Sessions</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={13} className="text-slate-400" />
            <span>Thời hạn 12h</span>
          </div>
        </div>
      </div>

      {/* MODAL: Đổi Mật Khẩu */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Đổi mật khẩu quản trị</h3>
                <p className="text-xs text-slate-500">Cập nhật mật khẩu bảo mật cho tài khoản admin</p>
              </div>
            </div>

            {passwordSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-slate-800">Đổi mật khẩu thành công!</p>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập tối thiểu 8 ký tự..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer"
                  >
                    Cập nhật mật khẩu
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Thêm Nhân Viên Mới */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <UserPlus size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Thêm nhân viên mới</h3>
                <p className="text-xs text-slate-500">Khởi tạo tài khoản nhân sự và cấp quyền hệ thống OIMS</p>
              </div>
            </div>

            {createSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-slate-800">Tạo tài khoản nhân viên thành công!</p>
              </div>
            ) : (
              <form onSubmit={handleCreateStaffSubmit} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Vd: Hoàng Văn Nam"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chức danh công việc
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Vd: Chuyên viên kinh doanh"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email đăng nhập <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="nam.hoang@tinphat.com"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số điện thoại
                    </label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="0912 345 678"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phòng ban</label>
                    <select
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="Ban Giám đốc">Ban Giám đốc</option>
                      <option value="Quản trị hệ thống">Quản trị hệ thống</option>
                      <option value="Phòng Kinh doanh">Phòng Kinh doanh</option>
                      <option value="Kho vận & Logistics">Kho vận & Logistics</option>
                      <option value="Xưởng Sản xuất">Xưởng Sản xuất</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Vai trò RBAC</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="SALES">Nhân viên bán hàng (ROLE_SALES)</option>
                      <option value="WAREHOUSE">Nhân viên kho (ROLE_WAREHOUSE)</option>
                      <option value="PRODUCTION">Nhân viên sản xuất (ROLE_PRODUCTION)</option>
                      <option value="MANAGER">Quản lý (ROLE_MANAGER)</option>
                      <option value="ADMIN">Quản trị viên (ROLE_ADMIN)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Kho được phân quyền (Quy tắc BR-03)
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { code: 'WH-HN-01', label: 'Kho Tổng Gia Lâm' },
                      { code: 'WH-HN-02', label: 'Kho Đông Anh' },
                      { code: 'WH-HN-03', label: 'Kho Hà Đông' },
                      { code: 'WH-HN-04', label: 'Kho Hoàn Kiếm' },
                    ].map((w) => {
                      const isChecked = formWarehouses.includes(w.code);
                      return (
                        <label
                          key={w.code}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition ${
                            isChecked ? 'border-blue-300 bg-blue-50/60 text-blue-900' : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormWarehouses([...formWarehouses, w.code]);
                              } else {
                                setFormWarehouses(formWarehouses.filter((c) => c !== w.code));
                              }
                            }}
                            className="rounded text-blue-600"
                          />
                          <span className="font-medium">{w.code} - {w.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer"
                  >
                    Lưu nhân viên
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
