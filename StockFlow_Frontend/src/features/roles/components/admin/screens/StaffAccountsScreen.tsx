// src/features/roles/components/admin/screens/StaffAccountsScreen.tsx
// Màn hình 3.2.1.3: Danh sách tài khoản nhân viên (User Accounts) theo giao diện AI Studio Ảnh 2

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Building,
  Building2,
  UserPlus,
  Pencil,
  KeyRound,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
  CheckCircle2,
} from 'lucide-react';
import { StaffAccount, UserRole } from '../../../types';
import { adminService } from '../../../services/adminService';

interface StaffAccountsScreenProps {
  initialFilter?: 'ALL' | 'ACTIVE';
}

export const StaffAccountsScreen: React.FC<StaffAccountsScreenProps> = ({
  initialFilter = 'ALL',
}) => {
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    initialFilter === 'ACTIVE' ? 'ACTIVE' : 'ALL'
  );
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Modal State: Create / Edit (Khớp 100% Ảnh 2 bên trái - MÀN HÌNH 3.2.1.4)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [formCode, setFormCode] = useState('TP-EMP0051');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('Kho vận & Logistics');
  const [formRole, setFormRole] = useState<UserRole>('WAREHOUSE');
  const [formPassword, setFormPassword] = useState('TinPhat@2026');
  const [formWarehouses, setFormWarehouses] = useState<string[]>(['WH-HN-01']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await adminService.getStaffList(search, statusFilter, deptFilter);
      setStaffList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter, deptFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setFormCode('TP-EMP0051');
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormTitle('');
    setFormDept('Kho vận & Logistics');
    setFormRole('WAREHOUSE');
    setFormPassword('TinPhat@2026');
    setFormWarehouses(['WH-HN-01']);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffAccount) => {
    setEditingStaff(staff);
    setFormCode(staff.code);
    setFormName(staff.name);
    setFormEmail(staff.email);
    setFormPhone(staff.phone);
    setFormTitle(staff.title);
    setFormDept(staff.department);
    setFormRole(staff.role);
    setFormPassword('TinPhat@2026');
    setFormWarehouses(staff.assignedWarehouses || []);
    setEditModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      alert('Vui lòng nhập Họ tên và Email');
      return;
    }

    const roleTitleMap: Record<UserRole, string> = {
      ADMIN: 'Quản trị viên',
      MANAGER: 'Quản lý',
      SALES: 'Nhân viên bán hàng',
      WAREHOUSE: 'Nhân viên kho',
      PRODUCTION: 'Nhân viên sản xuất',
    };

    try {
      if (editingStaff) {
        await adminService.updateStaff(editingStaff.id, {
          name: formName,
          email: formEmail,
          phone: formPhone,
          title: formTitle,
          department: formDept,
          role: formRole,
          roleTitle: roleTitleMap[formRole],
          assignedWarehouses: formWarehouses,
        });
        showToast(`Đã cập nhật thông tin nhân viên ${formName}`);
      } else {
        await adminService.createStaff({
          code: formCode || `NV-NV00${Math.floor(Math.random() * 90) + 10}`,
          name: formName,
          email: formEmail,
          phone: formPhone,
          title: formTitle || 'Thủ kho, Nhân viên bán hàng',
          department: formDept,
          role: formRole,
          roleTitle: roleTitleMap[formRole],
          assignedWarehouses: formWarehouses,
          status: 'ACTIVE',
        });
        showToast(`Đã thêm nhân viên mới ${formName}`);
      }

      setEditModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu nhân viên';
      alert(`Lỗi: ${msg}`);
    }
  };

  const handleToggleStatus = async (staff: StaffAccount) => {
    const updated = await adminService.toggleStaffStatus(staff.id);
    showToast(
      updated.status === 'LOCKED'
        ? `Đã khóa tài khoản ${staff.name}`
        : `Đã kích hoạt tài khoản ${staff.name}`
    );
    loadData();
  };

  const handleResetPassword = async (staff: StaffAccount) => {
    if (confirm(`Bạn có chắc chắn muốn đặt lại mật khẩu cho ${staff.name} (${staff.code})?`)) {
      const defaultPass = await adminService.resetStaffPassword(staff.id);
      showToast(`Mật khẩu của ${staff.name} đã được reset thành "${defaultPass}"`);
    }
  };

  const getAvatarGradient = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'from-blue-600 to-indigo-700';
      case 'MANAGER':
        return 'from-purple-600 to-indigo-500';
      case 'SALES':
        return 'from-amber-600 to-amber-500';
      case 'WAREHOUSE':
        return 'from-emerald-600 to-teal-500';
      case 'PRODUCTION':
        return 'from-rose-600 to-pink-500';
      default:
        return 'from-slate-600 to-slate-500';
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
            MÀN HÌNH 3.2.1.3 • Danh sách
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Danh sách tài khoản nhân viên (User Accounts)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị tập trung người dùng và phân quyền truy cập hệ thống OIMS
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
        >
          <UserPlus size={14} />
          <span>+ Thêm nhân viên</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col md:flex-row items-center gap-3">
        {/* Search input */}
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, mã nv, email..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-48">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="LOCKED">Đã khóa</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="relative w-full md:w-52">
            <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
            >
              <option value="ALL">Tất cả phòng ban</option>
              <option value="Quản trị hệ thống">Quản trị hệ thống</option>
              <option value="Ban Giám đốc">Ban Giám đốc</option>
              <option value="Phòng Kinh doanh">Phòng Kinh doanh</option>
              <option value="Kho vận & Logistics">Kho vận & Logistics</option>
              <option value="Xưởng Sản xuất">Xưởng Sản xuất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff DataTable */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">MÃ NV</th>
                <th className="py-3 px-4">HỌ VÀ TÊN</th>
                <th className="py-3 px-4">LIÊN HỆ</th>
                <th className="py-3 px-4">PHÒNG BAN</th>
                <th className="py-3 px-4">VAI TRÒ RBAC</th>
                <th className="py-3 px-4">KHO PHÂN QUYỀN</th>
                <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Không tìm thấy nhân viên nào phù hợp.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => {
                  const isLocked = staff.status === 'LOCKED';
                  const initials = staff.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(-2)
                    .join('');

                  return (
                    <tr
                      key={staff.id}
                      className={`hover:bg-blue-50/30 transition ${
                        isLocked ? 'bg-slate-50/40 opacity-75' : ''
                      }`}
                    >
                      {/* Mã NV */}
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        {staff.code}
                      </td>

                      {/* Họ và tên */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                              staff.role
                            )} text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs`}
                          >
                            <span>{initials}</span>
                          </div>
                          <div>
                            <div className="font-bold text-slate-800">{staff.name}</div>
                            <div className="text-[11px] text-slate-400">{staff.title}</div>
                          </div>
                        </div>
                      </td>

                      {/* Liên hệ */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-700">{staff.email}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{staff.phone}</div>
                      </td>

                      {/* Phòng ban */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                        {staff.department}
                      </td>

                      {/* Vai trò RBAC */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-blue-50/80 text-[#2B6CB0] border border-blue-200/60 font-semibold text-[11px]">
                          <Shield size={12} className="text-[#2B6CB0]" />
                          <span>{staff.roleTitle}</span>
                        </span>
                      </td>

                      {/* Kho phân quyền */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {staff.assignedWarehouses && staff.assignedWarehouses.length > 0 ? (
                            staff.assignedWarehouses.map((wh) => (
                              <span
                                key={wh}
                                className="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] bg-slate-100 text-slate-600 border border-slate-200"
                              >
                                {wh}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Chưa gán kho</span>
                          )}
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 font-semibold text-[11px]">
                            Đã khóa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                            Hoạt động
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Sửa */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(staff)}
                            title="Chỉnh sửa nhân viên"
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                          >
                            <Pencil size={14} />
                          </button>

                          {/* Reset mật khẩu */}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(staff)}
                            title="Đặt lại mật khẩu"
                            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition cursor-pointer"
                          >
                            <KeyRound size={14} />
                          </button>

                          {/* Khóa / Mở khóa */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(staff)}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            className={`p-1.5 rounded-md hover:bg-slate-100 transition cursor-pointer ${
                              isLocked
                                ? 'text-rose-500 hover:text-emerald-600'
                                : 'text-slate-400 hover:text-rose-600'
                            }`}
                          >
                            {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className="p-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
          <div>
            Hiển thị <span className="font-bold text-slate-800">{staffList.length}</span> trên{' '}
            <span className="font-bold text-slate-800">{staffList.length}</span> tài khoản
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled
              className="p-1 rounded border border-slate-200 text-slate-300 cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="font-semibold text-slate-700">Trang 1 / 1</span>
            <button
              disabled
              className="p-1 rounded border border-slate-200 text-slate-300 cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: Tạo tài khoản mới (Khớp 100% Ảnh 2 bên trái - MÀN HÌNH 3.2.1.4) */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
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
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {editingStaff ? 'Cập nhật tài khoản nhân viên' : 'Tạo tài khoản mới'}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5">
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

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1E56A0] hover:bg-[#184580] text-xs font-bold text-white transition shadow-xs cursor-pointer"
                >
                  {editingStaff ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
