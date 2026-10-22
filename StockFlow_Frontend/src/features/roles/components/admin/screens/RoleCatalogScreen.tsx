// src/features/roles/components/admin/screens/RoleCatalogScreen.tsx
// Danh mục vai trò phân quyền (RBAC Roles) với đầy đủ tính năng CRUD

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Sliders,
  Users,
  CheckCircle2,
  X,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { RoleDefinition } from '../../../types';
import { adminService } from '../../../services/adminService';

interface RoleCatalogScreenProps {
  onNavigate: (screenId: string, roleCode?: string) => void;
}

export const RoleCatalogScreen: React.FC<RoleCatalogScreenProps> = ({ onNavigate }) => {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Tạo Vai trò mới
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCode, setNewRoleCode] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // Modal Sửa Vai trò
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDefinition | null>(null);
  const [editRoleName, setEditRoleName] = useState('');
  const [editRoleDesc, setEditRoleDesc] = useState('');

  // Modal Xác nhận Xóa Vai trò
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingRole, setDeletingRole] = useState<RoleDefinition | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await adminService.getRoleDefinitions();
      setRoles(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── 1. CREATE ROLE ────────────────────────────────────────────────────────
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim() || !newRoleCode.trim()) {
      alert('Vui lòng nhập tên và mã vai trò');
      return;
    }

    const createdRole = await adminService.createRole({
      name: newRoleName.trim(),
      code: newRoleCode.trim(),
      description: newRoleDesc.trim(),
    });

    setRoles((prev) => [...prev, createdRole]);
    setCreateModalOpen(false);
    setNewRoleName('');
    setNewRoleCode('');
    setNewRoleDesc('');
    showToast(`Đã tạo vai trò mới "${createdRole.name}" thành công!`);
  };

  // ─── 2. EDIT ROLE ──────────────────────────────────────────────────────────
  const openEditModal = (role: RoleDefinition) => {
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditRoleDesc(role.description || '');
    setEditModalOpen(true);
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole || !editRoleName.trim()) {
      alert('Vui lòng nhập tên vai trò');
      return;
    }

    const updated = await adminService.updateRole(editingRole.id, {
      name: editRoleName.trim(),
      description: editRoleDesc.trim(),
    });

    if (updated) {
      setRoles((prev) =>
        prev.map((r) => (r.id === editingRole.id ? { ...r, name: updated.name, description: updated.description } : r))
      );
      showToast(`Đã cập nhật thông tin vai trò "${updated.name}" thành công!`);
    } else {
      // Cập nhật local nếu API không trả về
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingRole.id ? { ...r, name: editRoleName.trim(), description: editRoleDesc.trim() } : r
        )
      );
      showToast(`Đã cập nhật thông tin vai trò "${editRoleName.trim()}"!`);
    }

    setEditModalOpen(false);
    setEditingRole(null);
  };

  // ─── 3. DELETE ROLE ────────────────────────────────────────────────────────
  const openDeleteModal = (role: RoleDefinition) => {
    setDeletingRole(role);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRole) return;
    try {
      await adminService.deleteRole(deletingRole.id);
      setRoles((prev) => prev.filter((r) => r.id !== deletingRole.id && r.code !== deletingRole.code));
      showToast(`Đã xóa vai trò "${deletingRole.name}" thành công!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : `Không thể xóa vai trò "${deletingRole.name}".`;
      alert(`Không thể xóa: ${msg}`);
    } finally {
      setDeleteModalOpen(false);
      setDeletingRole(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Danh mục vai trò phân quyền
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
        >
          <Plus size={15} />
          <span>+ Tạo vai trò</span>
        </button>
      </div>

      {/* Roles Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between hover:border-blue-200 hover:shadow-xs transition"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3 mb-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Shield size={20} />
                </div>
                <div className="flex items-center gap-2">
                  {role.isSystem && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[4px] bg-slate-100 text-slate-600">
                      Hệ thống
                    </span>
                  )}
                  {/* Action buttons on card */}
                  <button
                    type="button"
                    title="Chỉnh sửa vai trò"
                    onClick={() => openEditModal(role)}
                    className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                  >
                    <Pencil size={14} />
                  </button>
                  {!role.isSystem && (
                    <button
                      type="button"
                      title="Xóa vai trò"
                      onClick={() => openDeleteModal(role)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Role Title & Code */}
              <div className="mb-2">
                <h3 className="text-base font-bold text-slate-900">{role.name}</h3>
                <div className="text-[11px] font-mono font-bold text-blue-600 tracking-wider">
                  {role.code}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-500 leading-relaxed min-h-[48px]">
                {role.description}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Users size={14} className="text-slate-400" />
                <span>{role.staffCount} nhân sự</span>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('admin-matrix', role.code)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-xs font-semibold text-blue-700 transition cursor-pointer"
              >
                <Sliders size={13} />
                <span>Cấu hình quyền</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: Thêm vai trò mới (Đã bỏ Priority) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <Shield size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Thêm vai trò mới</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tạo chức danh vai trò tùy biến để phân quyền</p>
              </div>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên vai trò <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="VD: Giám sát vùng"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã vai trò (Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value.toUpperCase())}
                  placeholder="VD: ROLE_SUPERVISOR"
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:border-blue-500 shadow-xs"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Tự động chuẩn hóa định dạng in hoa tiền tố ROLE_
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả phạm vi vai trò
                </label>
                <textarea
                  rows={3}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Mô tả trách nhiệm và quyền hạn công việc của vai trò..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs resize-none"
                />
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
          </div>
        </div>
      )}

      {/* MODAL: Chỉnh sửa vai trò */}
      {editModalOpen && editingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false);
                setEditingRole(null);
              }}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
                <Pencil size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Chỉnh sửa vai trò</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Mã vai trò: <span className="font-mono font-bold text-blue-600">{editingRole.code}</span>
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên vai trò <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={editingRole.isSystem}
                  value={editRoleName}
                  onChange={(e) => setEditRoleName(e.target.value)}
                  className={`w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs ${
                    editingRole.isSystem ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''
                  }`}
                />
                {editingRole.isSystem && (
                  <p className="text-[11px] text-slate-400 mt-1">
                    Vai trò hệ thống mặc định không thể thay đổi tên.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả phạm vi vai trò
                </label>
                <textarea
                  rows={3}
                  value={editRoleDesc}
                  onChange={(e) => setEditRoleDesc(e.target.value)}
                  placeholder="Mô tả trách nhiệm và quyền hạn công việc của vai trò..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-xs resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setEditingRole(null);
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1E56A0] hover:bg-[#184580] text-xs font-bold text-white transition shadow-xs cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận xóa vai trò */}
      {deleteModalOpen && deletingRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác nhận xóa vai trò</h3>
                <p className="text-xs text-slate-500 mt-0.5">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 mb-5 border border-slate-200/80">
              <div className="text-xs text-slate-700">
                Bạn có chắc chắn muốn xóa vai trò{' '}
                <span className="font-bold text-slate-900 font-mono">"{deletingRole.name}"</span> (
                <span className="text-blue-600 font-mono">{deletingRole.code}</span>)?
              </div>
              {deletingRole.staffCount > 0 ? (
                <div className="mt-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium leading-relaxed">
                  ⚠️ <strong>Không thể xóa:</strong> Vai trò này hiện có <strong>{deletingRole.staffCount}</strong> nhân sự đang được phân công. Vui lòng chuyển các nhân sự sang vai trò khác tại trang <em>Tài khoản nhân viên</em> trước khi xóa vai trò này.
                </div>
              ) : (
                <div className="mt-2.5 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium">
                  ✓ Vai trò này hiện không có nhân sự nào. Bạn có thể xóa ngay lập tức.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeletingRole(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deletingRole.staffCount > 0}
                onClick={handleConfirmDelete}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                  deletingRole.staffCount > 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                }`}
              >
                Xóa vai trò
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
