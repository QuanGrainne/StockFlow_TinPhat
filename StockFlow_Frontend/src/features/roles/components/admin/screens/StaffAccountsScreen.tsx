// src/features/roles/components/admin/screens/StaffAccountsScreen.tsx
// Màn hình 3.2.1.3: Danh sách tài khoản nhân viên (User Accounts) theo giao diện AI Studio Ảnh 2

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Building,
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

  // Modal State: Create / Edit
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formDept, setFormDept] = useState('Phòng Kinh doanh');
  const [formRole, setFormRole] = useState<UserRole>('SALES');
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
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormTitle('');
    setFormDept('Phòng Kinh doanh');
    setFormRole('SALES');
    setFormWarehouses(['WH-HN-01']);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffAccount) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormEmail(staff.email);
    setFormPhone(staff.phone);
    setFormTitle(staff.title);
    setFormDept(staff.department);
    setFormRole(staff.role);
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
        code: `TP-NV00${Math.floor(Math.random() * 90) + 10}`,
        name: formName,
        email: formEmail,
        phone: formPhone,
        title: formTitle || 'Chuyên viên',
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

      {/* MODAL: Tạo / Sửa Nhân viên */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                {editingStaff ? <Pencil size={20} /> : <UserPlus size={20} />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingStaff ? 'Cập nhật tài khoản nhân viên' : 'Thêm nhân viên mới'}
                </h3>
                <p className="text-xs text-slate-500">
                  {editingStaff
                    ? `Mã nhân sự: ${editingStaff.code}`
                    : 'Khởi tạo tài khoản nhân viên trong hệ thống StockFlow'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5">
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
                    placeholder="Vd: Nguyễn Văn A"
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
                    placeholder="admin@tinphat.com"
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
                    <option value="ADMIN">Quản trị viên (ROLE_ADMIN)</option>
                    <option value="MANAGER">Quản lý (ROLE_MANAGER)</option>
                    <option value="SALES">Nhân viên bán hàng (ROLE_SALES)</option>
                    <option value="WAREHOUSE">Nhân viên kho (ROLE_WAREHOUSE)</option>
                    <option value="PRODUCTION">Nhân viên sản xuất (ROLE_PRODUCTION)</option>
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
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer"
                >
                  {editingStaff ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
