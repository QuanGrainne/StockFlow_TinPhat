// src/features/roles/components/admin/screens/StaffAccountsScreen.tsx
// Màn hình 3.2.1.3: Danh sách tài khoản nhân viên (User Accounts) theo giao diện AI Studio Ảnh 2

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
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
  Camera,
  Upload,
  Trash2,
} from 'lucide-react';
import { StaffAccount, UserRole } from '../../../types';
import { adminService } from '../../../services/adminService';

const WAREHOUSE_OPTIONS = [
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
];

const getNextStaffCode = (list: StaffAccount[]): string => {
  let maxId = 0;
  for (const s of list) {
    const match = s.code.match(/NV-NV(\d+)/i) || s.code.match(/(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }
  return `NV-NV${String(maxId + 1).padStart(3, '0')}`;
};

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
  // Modal State: Create / Edit
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffAccount | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formAvatar, setFormAvatar] = useState<string>('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('WAREHOUSE');
  const [formPassword, setFormPassword] = useState('TinPhat@2026');
  const [formWarehouses, setFormWarehouses] = useState<string[]>(['WH-HN-01']);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const isCodeDuplicate = Boolean(
    formCode.trim() &&
    staffList.some(
      (s) =>
        s.code.trim().toLowerCase() === formCode.trim().toLowerCase() &&
        (!editingStaff || s.id !== editingStaff.id)
    )
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await adminService.getStaffList(search, statusFilter);
      setStaffList(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Xử lý nén & resize ảnh đại diện tự động sang max 256x256 để lưu trữ an toàn & nhẹ
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Kích thước ảnh tối đa là 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setFormAvatar(dataUrl);
        }
      };
      if (typeof event.target?.result === 'string') {
        img.src = event.target.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCreate = () => {
    setEditingStaff(null);
    setFormCode('');
    setFormName('');
    setFormUsername('');
    setFormAvatar('');
    setFormEmail('');
    setFormPhone('');
    setFormTitle('');
    setFormRole('WAREHOUSE');
    setFormPassword('TinPhat@2026');
    setFormWarehouses(['WH-HN-01']);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffAccount) => {
    setEditingStaff(staff);
    setFormCode(staff.code);
    setFormName(staff.name);
    setFormUsername(staff.username || (staff.email ? staff.email.split('@')[0] : ''));
    setFormAvatar(staff.avatar || '');
    setFormEmail(staff.email || '');
    setFormPhone(staff.phone || '');
    setFormTitle(staff.title || '');
    setFormRole(staff.role);
    setFormPassword('');
    const normalizedWarehouses = (staff.assignedWarehouses || []).map((code) => {
      if (code === 'KTP-01') return 'WH-HN-01';
      if (code === 'KNVL-01') return 'WH-HN-02';
      return code;
    });
    setFormWarehouses(normalizedWarehouses);
    setEditModalOpen(true);
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formName.trim();
    if (!trimmedName) {
      alert('Vui lòng nhập Họ và tên nhân viên');
      return;
    }

    const trimmedUsername = formUsername.trim().toLowerCase();
    if (!trimmedUsername) {
      alert('Vui lòng nhập Tên đăng nhập cho tài khoản nhân viên');
      return;
    }

    const trimmedPhone = formPhone.trim();
    if (!trimmedPhone) {
      alert('Vui lòng nhập Số điện thoại cho nhân viên');
      return;
    }

    const autoCode = getNextStaffCode(staffList);
    const finalCode = formCode.trim() || autoCode;

    if (isCodeDuplicate) {
      alert(`Mã nhân viên "${formCode.trim()}" đã tồn tại trong hệ thống. Vui lòng nhập mã khác.`);
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
          code: finalCode,
          name: trimmedName,
          username: trimmedUsername,
          email: formEmail.trim(),
          phone: trimmedPhone,
          title: formTitle.trim(),
          department: '',
          role: formRole,
          roleTitle: roleTitleMap[formRole],
          assignedWarehouses: formWarehouses,
          avatar: formAvatar.trim() || undefined,
          password: formPassword.trim() ? formPassword.trim() : undefined,
        });
        showToast(`Đã cập nhật thông tin nhân viên ${trimmedName}`);
      } else {
        await adminService.createStaff({
          code: finalCode,
          name: trimmedName,
          username: trimmedUsername,
          email: formEmail.trim(),
          phone: trimmedPhone,
          title: formTitle.trim() || roleTitleMap[formRole],
          department: '',
          role: formRole,
          roleTitle: roleTitleMap[formRole],
          assignedWarehouses: formWarehouses,
          avatar: formAvatar.trim() || undefined,
          status: 'ACTIVE',
          password: formPassword.trim() || 'TinPhat@2026',
        });
        showToast(`Đã thêm nhân viên mới ${trimmedName}`);
      }

      setEditModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu nhân viên';
      alert(`Lỗi: ${msg}`);
    }
  };

  const handleToggleStatus = async (staff: StaffAccount) => {
    const isLocking = staff.status === 'ACTIVE';
    const message = isLocking
      ? `Bạn có chắc chắn muốn khóa tài khoản của ${staff.name} (${staff.code}) không?`
      : `Bạn có chắc chắn muốn mở khóa tài khoản của ${staff.name} (${staff.code}) không?`;

    if (!confirm(message)) {
      return;
    }

    try {
      const updated = await adminService.toggleStaffStatus(staff.id);
      showToast(
        updated.status === 'LOCKED'
          ? `Đã khóa tài khoản ${staff.name}`
          : `Đã kích hoạt tài khoản ${staff.name}`
      );
      loadData();
    } catch {
      alert('Có lỗi xảy ra khi thay đổi trạng thái tài khoản');
    }
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Danh sách tài khoản nhân viên
          </h1>
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
                <th className="py-3 px-4">VAI TRÒ RBAC</th>
                <th className="py-3 px-4">KHO PHÂN QUYỀN</th>
                <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
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
                          {staff.avatar ? (
                            <img
                              src={staff.avatar}
                              alt={staff.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0 shadow-2xs border border-slate-200"
                            />
                          ) : (
                            <div
                              className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarGradient(
                                staff.role
                              )} text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs`}
                            >
                              <span>{initials}</span>
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span>{staff.name}</span>
                              {staff.username && (
                                <span className="font-mono text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  @{staff.username}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400">{staff.title || 'Nhân viên'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Liên hệ */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-800 text-xs">{staff.phone || '—'}</div>
                        {staff.email ? (
                          <div className="text-[11px] text-slate-500">{staff.email}</div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Chưa có email</div>
                        )}
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

            {/* Header Modal */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <UserPlus size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {editingStaff ? 'Cập nhật tài khoản nhân viên' : 'Tạo tài khoản mới'}
                </h3>
              </div>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-3.5">
              {/* Mục Avatar nhân viên */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="relative shrink-0">
                  {formAvatar ? (
                    <img
                      src={formAvatar}
                      alt="Avatar Preview"
                      className="w-16 h-16 rounded-full object-cover border-2 border-blue-500 shadow-sm"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-blue-100/70 border-2 border-dashed border-blue-300 flex flex-col items-center justify-center text-blue-600">
                      <Camera size={20} />
                      <span className="text-[9px] font-semibold mt-0.5">Avatar</span>
                    </div>
                  )}
                  {formAvatar && (
                    <button
                      type="button"
                      onClick={() => setFormAvatar('')}
                      title="Xóa avatar"
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600 shadow-sm cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-800 mb-1">
                    Ảnh đại diện nhân viên (Avatar)
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition">
                      <Upload size={13} className="text-blue-600" />
                      <span>Tải ảnh từ máy...</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                      />
                    </label>

                    {formAvatar && (
                      <button
                        type="button"
                        onClick={() => setFormAvatar('')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-medium text-rose-600 cursor-pointer transition"
                      >
                        <Trash2 size={12} />
                        <span>Xóa ảnh</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Định dạng hỗ trợ: JPG, PNG, WEBP (tự động tối ưu dung lượng)
                  </span>
                </div>
              </div>

              {/* Row 1: Mã NV & Họ tên */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Mã nhân viên <span className="text-rose-500">*</span>
                    </label>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-medium transition ${
                        isCodeDuplicate
                          ? 'text-rose-700 bg-rose-50 border-rose-200'
                          : formCode.trim()
                          ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          : 'text-blue-600 bg-blue-50 border-blue-200/60'
                      }`}
                    >
                      {isCodeDuplicate
                        ? 'Trùng lặp'
                        : formCode.trim()
                        ? 'Tự nhập'
                        : 'Tự động'}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="Tự động"
                    className={`w-full h-10 px-3.5 rounded-xl border text-xs font-mono font-bold shadow-xs transition ${
                      isCodeDuplicate
                        ? 'border-rose-400 bg-rose-50/20 text-rose-700 focus:outline-none focus:border-rose-500'
                        : 'border-slate-200 bg-white text-blue-700 focus:outline-none focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400'
                    }`}
                    title="Để trống hệ thống sẽ tự động tạo mã, hoặc tự nhập mã nhân viên"
                  />
                  {isCodeDuplicate ? (
                    <span className="text-[10px] text-rose-500 font-semibold mt-1 block">
                      Mã nhân viên đã tồn tại, vui lòng chọn mã khác
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Để trống hệ thống sẽ tự động tạo mã
                    </span>
                  )}
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
                    placeholder="Bắt buộc"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Row 2: Tài khoản đăng nhập (Tên đăng nhập & Mật khẩu) */}
              <div className="grid grid-cols-2 gap-3.5 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Tên đăng nhập (Tài khoản) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="VD: admin hoặc diendantp"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                  <span className="text-[10px] text-blue-600/80 mt-1 block">Dùng tài khoản này để đăng nhập</span>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    {editingStaff ? 'Thay đổi mật khẩu' : 'Mật khẩu ban đầu'}{' '}
                    {!editingStaff && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="text"
                    required={!editingStaff}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder={editingStaff ? 'Bỏ trống nếu không đổi...' : 'TinPhat@2026'}
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {editingStaff
                      ? 'Để trống nếu muốn giữ nguyên mật khẩu hiện tại'
                      : 'Mặc định: TinPhat@2026'}
                  </span>
                </div>
              </div>

              {/* Row 3: Số điện thoại (Bắt buộc) & Email */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Bắt buộc"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs placeholder:text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email công ty
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => {
                      const newEmail = e.target.value;
                      setFormEmail(newEmail);
                      if (!editingStaff && (!formUsername || formUsername === formEmail.split('@')[0])) {
                        setFormUsername(newEmail.split('@')[0].toLowerCase());
                      }
                    }}
                    placeholder=""
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Row 4: Chức danh công việc */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chức danh công việc
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder=""
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              {/* Row 5: Vai trò RBAC */}
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

              {/* Warehouse Selection Box */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <Building2 size={14} className="text-blue-600" />
                    <span>
                      Kho trực thuộc <span className="text-rose-500">*</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Đã chọn:{' '}
                    <strong className="text-blue-600 font-bold">
                      {formWarehouses.filter((c) => WAREHOUSE_OPTIONS.some((w) => w.code === c)).length}
                    </strong>{' '}
                    / {WAREHOUSE_OPTIONS.length} kho
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {WAREHOUSE_OPTIONS.map((w) => {
                    const isChecked = formWarehouses.includes(w.code);
                    return (
                      <label
                        key={w.code}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition select-none ${
                          isChecked
                            ? 'border-blue-400 bg-blue-50/60 shadow-xs ring-1 ring-blue-300/40'
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
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-4 w-4"
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
