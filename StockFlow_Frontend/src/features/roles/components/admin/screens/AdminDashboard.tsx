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
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';
import { UserRole } from '../../../types';

interface AdminDashboardProps {
  onNavigate: (screenId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  // Modal State: Đổi mật khẩu (Khớp 100% Ảnh 3 bên trái - MÀN HÌNH 3.2.1.2)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Modal State: Tạo tài khoản mới (Khớp 100% Ảnh 2 bên trái - MÀN HÌNH 3.2.1.4)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formCode, setFormCode] = useState('TP-EMP0051');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('Kho vận & Logistics');
  const [formRole, setFormRole] = useState<UserRole>('WAREHOUSE');
  const [formPassword, setFormPassword] = useState('TinPhat@2026');
  const [formWarehouses, setFormWarehouses] = useState<string[]>(['WH-HN-01']);
  const [createSuccess, setCreateSuccess] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      alert('Vui lòng nhập mật khẩu hiện tại!');
      return;
    }
    if (!newPassword || newPassword !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp!');
      return;
    }
    setPasswordSuccess(true);
    setTimeout(() => {
      setPasswordSuccess(false);
      setPasswordModalOpen(false);
      setCurrentPassword('');
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
      code: formCode || `NV-NV00${Math.floor(Math.random() * 90) + 10}`,
      name: formName,
      title: formTitle || 'Thủ kho, Nhân viên bán hàng',
      email: formEmail,
      phone: formPhone || '0912 345 678',
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
      setFormCode('TP-EMP0051');
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

      {/* MODAL: Đổi Mật Khẩu (Khớp 100% Ảnh 3 bên trái - MÀN HÌNH 3.2.1.2) */}
      {passwordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header: MÀN HÌNH 3.2.1.2 • Popup */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <KeyRound size={18} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  MÀN HÌNH 3.2.1.2 <span className="text-slate-400 font-normal">• Popup</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">Đổi mật khẩu</h3>
              </div>
            </div>

            {/* User Info Card */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                NA
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">Nguyễn Văn A</span>
                  <span className="px-1.5 py-0.2 rounded-[3px] bg-blue-100 text-[#2B6CB0] font-mono text-[10px] font-bold">
                    TP-AD001
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  admin@tinphat.com • Quản trị viên
                </div>
              </div>
            </div>

            {passwordSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-slate-800">Đổi mật khẩu thành công!</p>
              </div>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-3.5">
                {/* Mật khẩu hiện tại */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu hiện tại <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu đang dùng"
                      className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Mật khẩu mới */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu mới <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới an toàn"
                      className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Xác nhận mật khẩu mới */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Xác nhận mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Tiêu chuẩn mật khẩu (SRS 3.2.1.2) */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">
                    Tiêu chuẩn mật khẩu (SRS 3.2.1.2):
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>Tối thiểu 8 ký tự</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>Chữ hoa (A-Z)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>Chữ thường (a-z)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>Chữ số (0-9)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-600 col-span-2">
                      <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                      <span>Ký tự đặc biệt (!@#$%^&*+)</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#1E56A0] hover:bg-[#184580] text-xs font-bold text-white transition shadow-xs cursor-pointer"
                  >
                    Cập nhật mật khẩu
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Tạo tài khoản mới (Khớp 100% Ảnh 2 bên trái - MÀN HÌNH 3.2.1.4) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header: MÀN HÌNH 3.2.1.4 • Biểu mẫu */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <UserPlus size={18} />
              </div>
              <div>
                <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  MÀN HÌNH 3.2.1.4 <span className="text-slate-400 font-normal">• Biểu mẫu</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">Tạo tài khoản mới</h3>
              </div>
            </div>

            {createSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-slate-800">Tạo tài khoản nhân viên thành công!</p>
              </div>
            ) : (
              <form onSubmit={handleCreateStaffSubmit} className="space-y-3.5">
                {/* Row 1: Mã NV & Họ tên */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mã nhân viên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="TP-EMP0051"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-mono font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Họ và tên <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="VD: Nguyễn Văn A"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Row 2: Email & Điện thoại */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email công ty <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="VD: admin@tinphat.com"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
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
                      placeholder="VD: 0912 345 678"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Row 3: Phòng ban & Chức danh */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phòng ban <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formDept}
                      onChange={(e) => setFormDept(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white shadow-xs font-medium"
                    >
                      <option value="Kho vận & Logistics">Kho vận & Logistics</option>
                      <option value="Phòng Kinh doanh">Phòng Kinh doanh</option>
                      <option value="Xưởng Sản xuất">Xưởng Sản xuất</option>
                      <option value="Ban Giám đốc">Ban Giám đốc</option>
                      <option value="Quản trị hệ thống">Quản trị hệ thống</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Chức danh công việc
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="VD: Thủ kho, Nhân viên bán hàng"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Row 4: Vai trò RBAC & Mật khẩu ban đầu */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Vai trò RBAC <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value as UserRole)}
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white shadow-xs font-medium"
                    >
                      <option value="WAREHOUSE">Nhân viên kho (ROLE_WAREHOUSE)</option>
                      <option value="SALES">Nhân viên bán hàng (ROLE_SALES)</option>
                      <option value="MANAGER">Quản lý (ROLE_MANAGER)</option>
                      <option value="PRODUCTION">Nhân viên sản xuất (ROLE_PRODUCTION)</option>
                      <option value="ADMIN">Quản trị viên (ROLE_ADMIN)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Mật khẩu ban đầu <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="TinPhat@2026"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* Warehouse Selection Box */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                      <Building2 size={14} className="text-blue-600" />
                      <span>
                        Kho trực thuộc (Quy tắc BR-03) <span className="text-rose-500">*</span>
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      Đã chọn:{' '}
                      <strong className="text-blue-600 font-bold">{formWarehouses.length}</strong> / 4
                      kho
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    {[
                      {
                        code: 'WH-HN-01',
                        name: 'Kho Tổng Gia Lâm',
                        address: 'Số 18 Đường Dệt May, Gia Lâm, Hà Nội',
                      },
                      {
                        code: 'WH-HN-02',
                        name: 'Kho Đông Anh',
                        address: 'CCN Nguyên Khê, Đông Anh, Hà Nội',
                      },
                      {
                        code: 'WH-HN-03',
                        name: 'Kho Hà Đông',
                        address: 'Km14 Quốc lộ 6, Yên Nghĩa, Hà Đông, Hà Nội',
                      },
                      {
                        code: 'WH-HN-04',
                        name: 'Kho Hoàn Kiếm',
                        address: '42 Phố Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
                      },
                    ].map((w) => {
                      const isChecked = formWarehouses.includes(w.code);
                      return (
                        <label
                          key={w.code}
                          className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                            isChecked
                              ? 'border-blue-400 bg-blue-50/50 shadow-xs'
                              : 'border-slate-200 hover:bg-slate-50'
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
                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 text-xs">
                              {w.name}{' '}
                              <span className="font-mono text-[10px] text-slate-400 font-normal">
                                ({w.code})
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate mt-0.5">
                              {w.address}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    * BR-03: Nhân viên chỉ được xem và thao tác dữ liệu thuộc các kho được phân quyền
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCreateModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#1E56A0] hover:bg-[#184580] text-xs font-bold text-white transition shadow-xs cursor-pointer"
                  >
                    Thêm mới
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
