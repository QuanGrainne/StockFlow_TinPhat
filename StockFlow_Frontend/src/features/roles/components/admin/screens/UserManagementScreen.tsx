// src/features/roles/components/admin/screens/UserManagementScreen.tsx
// Màn hình Quản trị Người dùng & Phân quyền Kho (Admin)

import React, { useState, useEffect } from 'react';
import { SystemUser, UserRole } from '../../../types';
import { adminService } from '../../../services/adminService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import {
  Shield,
  Plus,
  Edit2,
  Lock,
  Unlock,
  Warehouse,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const UserManagementScreen: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [formUserCode, setFormUserCode] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('WAREHOUSE');
  const [formAssignedWarehouses, setFormAssignedWarehouses] = useState<string[]>(['WH-01']);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getUsers(search, roleFilter);
      setUsers(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, roleFilter]);

  const handleOpenCreate = () => {
    setEditingUserId(null);
    setFormUserCode(`NV-NEW-${String(users.length + 1).padStart(2, '0')}`);
    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormRole('WAREHOUSE');
    setFormAssignedWarehouses(['WH-01']);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (user: SystemUser) => {
    setEditingUserId(user.id);
    setFormUserCode(user.userCode);
    setFormFullName(user.fullName);
    setFormEmail(user.email);
    setFormPhone(user.phone);
    setFormRole(user.role);
    setFormAssignedWarehouses(user.assignedWarehouses || []);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formFullName.trim() || !formEmail.trim()) {
      setFormError('Vui lòng nhập Họ tên và Email');
      return;
    }
    setIsSaving(true);
    setFormError('');
    try {
      if (editingUserId) {
        await adminService.updateUser(editingUserId, {
          fullName: formFullName,
          email: formEmail,
          phone: formPhone,
          role: formRole,
          assignedWarehouses: formAssignedWarehouses,
        });
      } else {
        await adminService.createUser({
          userCode: formUserCode,
          fullName: formFullName,
          email: formEmail,
          phone: formPhone,
          role: formRole,
          assignedWarehouses: formAssignedWarehouses,
          status: 'ACTIVE',
        });
      }
      setModalOpen(false);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    await adminService.toggleUserStatus(id);
    await loadData();
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Quản trị viên
          </span>
        );
      case 'MANAGER':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#2B6CB0] border border-blue-200">
            Quản lý điều hành
          </span>
        );
      case 'SALES':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Kinh doanh
          </span>
        );
      case 'WAREHOUSE':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Thủ kho
          </span>
        );
      case 'PRODUCTION':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
            Sản xuất
          </span>
        );
    }
  };

  const columns: Column<SystemUser>[] = [
    {
      header: 'Mã NV',
      accessor: 'userCode',
      width: '120px',
      render: (row) => (
        <span className="font-mono font-bold text-[#2B6CB0]">{row.userCode}</span>
      ),
    },
    {
      header: 'Họ và tên',
      accessor: 'fullName',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.fullName}</div>
          <div className="text-[11px] text-slate-400">{row.email} | {row.phone}</div>
        </div>
      ),
    },
    {
      header: 'Vai trò (RBAC)',
      accessor: 'role',
      width: '160px',
      render: (row) => getRoleBadge(row.role),
    },
    {
      header: 'Kho phân quyền',
      width: '180px',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.assignedWarehouses && row.assignedWarehouses.length > 0 ? (
            row.assignedWarehouses.map((wh) => (
              <span
                key={wh}
                className="px-2 py-0.5 rounded-[4px] bg-slate-100 font-mono text-[11px] text-slate-700 border border-slate-200 flex items-center gap-1"
              >
                <Warehouse size={11} className="text-[#2B6CB0]" />
                {wh === 'WH-01' ? 'Kho Cụm A' : 'Kho Cụm B'}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-slate-400 italic">Không giới hạn kho</span>
          )}
        </div>
      ),
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      width: '120px',
      render: (row) => (
        row.status === 'ACTIVE' ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
            <CheckCircle size={13} /> Hoạt động
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
            <XCircle size={13} /> Đã khóa
          </span>
        )
      ),
    },
    {
      header: 'Đăng nhập cuối',
      accessor: 'lastLogin',
      width: '140px',
      render: (row) => (
        <span className="text-slate-500 text-xs">{row.lastLogin || 'Chưa'}</span>
      ),
    },
    {
      header: 'Thao tác',
      align: 'center',
      width: '100px',
      render: (row) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-500 hover:text-[#2B6CB0] hover:bg-blue-50 rounded-[6px] transition cursor-pointer"
            title="Sửa thông tin / Quyền kho"
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleToggleStatus(row.id)}
            className={`p-1.5 rounded-[6px] transition cursor-pointer ${
              row.status === 'ACTIVE'
                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                : 'text-rose-600 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title={row.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
          >
            {row.status === 'ACTIVE' ? <Lock size={15} /> : <Unlock size={15} />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="text-[#2B6CB0]" size={22} />
            <span>Quản trị tài khoản & Phân quyền kho</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý tài khoản truy cập hệ thống và phân quyền truy cập kho cho nhân sự
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="h-9 px-4 rounded-[8px] bg-[#2B6CB0] hover:bg-[#23568c] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus size={16} />
          <span>Tạo tài khoản mới</span>
        </button>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={users}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Tìm theo mã NV, họ tên, email, số điện thoại..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Modal Thêm / Sửa Tài Khoản & Phân Quyền */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUserId ? 'Chỉnh sửa tài khoản & Phân quyền' : 'Tạo mới tài khoản người dùng'}
        subtitle="Thiết lập vai trò RBAC và phạm vi kho nhân viên được phép truy cập theo Report 1"
        onSave={handleSave}
        saveText={editingUserId ? 'Lưu thay đổi' : 'Tạo tài khoản'}
        isSaving={isSaving}
        maxWidth="lg"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-[8px] bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã nhân viên <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formUserCode}
                onChange={(e) => setFormUserCode(e.target.value)}
                className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs font-mono focus:outline-none focus:border-[#2B6CB0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vai trò hệ thống <span className="text-rose-500">*</span>
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
                className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
              >
                <option value="ADMIN">Quản trị viên (Admin)</option>
                <option value="MANAGER">Quản lý vận hành (Manager)</option>
                <option value="SALES">Nhân viên Kinh doanh (Sales)</option>
                <option value="WAREHOUSE">Thủ kho (Warehouse Staff)</option>
                <option value="PRODUCTION">Quản đốc / Thợ (Production Staff)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formFullName}
              onChange={(e) => setFormFullName(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
              placeholder="Vd: Nguyễn Văn A"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email công vụ <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
                placeholder="a.nguyen@tinphatcorp.vn"
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
                className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
                placeholder="0912 345 678"
              />
            </div>
          </div>

          {/* Phân quyền kho truy cập theo Report 1 */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Phân quyền kho truy cập (jnc_user_warehouse_access)
            </label>
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-[8px]">
              {[
                { id: 'WH-01', label: 'Kho Cụm A (Kho Nguyên Liệu Tín Phát)' },
                { id: 'WH-02', label: 'Kho Cụm B (Kho Thành Phẩm Máng Cáp)' },
              ].map((wh) => {
                const isChecked = formAssignedWarehouses.includes(wh.id);
                return (
                  <label
                    key={wh.id}
                    className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormAssignedWarehouses([...formAssignedWarehouses, wh.id]);
                        } else {
                          setFormAssignedWarehouses(
                            formAssignedWarehouses.filter((id) => id !== wh.id)
                          );
                        }
                      }}
                      className="rounded text-[#2B6CB0] focus:ring-[#2B6CB0]"
                    />
                    <span>{wh.label}</span>
                  </label>
                );
              })}
              <p className="text-[11px] text-slate-400 mt-1">
                * Nhân viên chỉ xem và thao tác trên các kho được tích chọn
              </p>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
