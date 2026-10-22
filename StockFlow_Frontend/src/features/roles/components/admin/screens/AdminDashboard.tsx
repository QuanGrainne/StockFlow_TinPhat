// src/features/roles/components/admin/screens/AdminDashboard.tsx
// Màn hình Tổng quan Quản trị viên (Admin Dashboard)

import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  KeyRound,
  CheckCircle2,
  X,
  Warehouse,
  Lock,
  Eye,
  EyeOff,
} from 'lucide-react';
import { adminService } from '../../../services/adminService';

interface AdminDashboardProps {
  onNavigate: (screenId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  // Modal State: Đổi mật khẩu
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Thống kê dữ liệu thật từ hệ thống
  const [stats, setStats] = useState({
    totalStaff: 0,
    activeStaff: 0,
    lockedStaff: 0,
    totalRoles: 0,
    systemRoles: 0,
    customRoles: 0,
    totalWarehouses: 0,
    loading: true,
  });

  const [currentAdmin, setCurrentAdmin] = useState({
    name: 'Quản trị viên Hệ thống',
    code: 'NV-ADMIN',
    title: 'Quản trị hệ thống',
    email: 'admin@tinphat.vn',
    initials: 'AD',
  });

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardStats = async () => {
      try {
        const [staffs, roles, warehouses] = await Promise.all([
          adminService.getStaffList(),
          adminService.getRoleDefinitions(),
          adminService.getWarehouseFacilities(),
        ]);

        if (!isMounted) return;

        const totalStaff = staffs.length;
        const lockedStaff = staffs.filter((s) => s.status === 'LOCKED').length;
        const activeStaff = totalStaff - lockedStaff;

        const totalRoles = roles.length;
        const systemRoles = roles.filter((r) => r.isSystem).length;
        const customRoles = totalRoles - systemRoles;

        const totalWarehouses = warehouses.length;

        setStats({
          totalStaff,
          activeStaff,
          lockedStaff,
          totalRoles,
          systemRoles,
          customRoles,
          totalWarehouses,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        if (isMounted) {
          setStats((prev) => ({ ...prev, loading: false }));
        }
      }
    };

    fetchDashboardStats();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const rawUser = typeof window !== 'undefined' ? localStorage.getItem('stockflow_user') : null;
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        const name = u.fullName || u.username || 'Quản trị viên';
        const code = u.code || `NV-NV${String(u.userId || 1).padStart(3, '0')}`;
        const words = name.trim().split(/\s+/);
        const initials =
          words.length > 1
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
        </div>
      </div>

      {/* 2. 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats.loading ? '...' : stats.totalStaff}
              </span>
              <span className="text-xs font-medium text-emerald-600">
                ({stats.loading ? '...' : stats.activeStaff} hoạt động)
              </span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Đã khóa: {stats.loading ? '...' : stats.lockedStaff}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('admin-staff')}
              className="font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              Xem danh sách
            </button>
          </div>
        </div>

        {/* Card 2: Vai trò */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Vai trò
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Shield size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats.loading ? '...' : stats.totalRoles}
              </span>
              <span className="text-xs font-medium text-blue-600">
                ({stats.loading ? '...' : stats.systemRoles} hệ thống)
              </span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Tùy chỉnh: {stats.loading ? '...' : stats.customRoles}
            </span>
            <button
              type="button"
              onClick={() => onNavigate('admin-roles')}
              className="font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              Cấu hình vai trò
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
              <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {stats.loading ? '...' : stats.totalWarehouses}
              </span>
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
      </div>

      {/* MODAL: Đổi Mật Khẩu */}
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

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Đổi mật khẩu</h3>
                <p className="text-xs text-slate-500">Cập nhật mật khẩu tài khoản quản trị</p>
              </div>
            </div>

            {/* User Info Card */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs mb-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0">
                {currentAdmin.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900">{currentAdmin.name}</span>
                  <span className="px-1.5 py-0.2 rounded-[3px] bg-blue-100 text-[#2B6CB0] font-mono text-[10px] font-bold">
                    {currentAdmin.code}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {currentAdmin.email} • {currentAdmin.title}
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
    </div>
  );
};
