// src/features/roles/components/admin/screens/RoleCatalogScreen.tsx
// Màn hình 3.2.1.6: Danh mục vai trò phân quyền (RBAC Roles) theo giao diện AI Studio Ảnh 3

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Sliders,
  Users,
  CheckCircle2,
  X,
  Sparkles,
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
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName || !newRoleCode) {
      alert('Vui lòng nhập tên và mã vai trò');
      return;
    }

    const createdRole: RoleDefinition = {
      id: `ROLE-${Date.now()}`,
      name: newRoleName,
      code: newRoleCode.toUpperCase().startsWith('ROLE_') ? newRoleCode.toUpperCase() : `ROLE_${newRoleCode.toUpperCase()}`,
      rank: `Rank #${roles.length + 1}`,
      isSystem: false,
      description: newRoleDesc || 'Vai trò phân quyền tùy biến mở rộng theo yêu cầu doanh nghiệp.',
      staffCount: 0,
    };

    setRoles([...roles, createdRole]);
    setCreateModalOpen(false);
    setNewRoleName('');
    setNewRoleCode('');
    setNewRoleDesc('');
    showToast(`Đã tạo vai trò mới "${createdRole.name}" thành công!`);
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
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
            MÀN HÌNH 3.2.1.6 • Danh mục
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Danh mục vai trò phân quyền (RBAC Roles)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý các cấp bậc phân quyền và ma trận đặc quyền theo tiêu chuẩn hệ thống OIMS
          </p>
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
                <div className="flex items-center gap-1.5">
                  {role.isSystem && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-[4px] bg-slate-100 text-slate-600">
                      Hệ thống
                    </span>
                  )}
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-slate-100 text-slate-700">
                    {role.rank}
                  </span>
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

      {/* MODAL: Tạo Vai trò mới */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Tạo vai trò RBAC mới</h3>
                <p className="text-xs text-slate-500">Định nghĩa vai trò người dùng trong hệ thống OIMS</p>
              </div>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên vai trò <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="Vd: Chuyên viên Mua hàng"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã vai trò (System Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value)}
                  placeholder="Vd: ROLE_PURCHASE"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono uppercase focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả chức năng & đặc quyền
                </label>
                <textarea
                  rows={3}
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Mô tả phạm vi truy cập và nhiệm vụ của vai trò này..."
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
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
                  Tạo vai trò
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
