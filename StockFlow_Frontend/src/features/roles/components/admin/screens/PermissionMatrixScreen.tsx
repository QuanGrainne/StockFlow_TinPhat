// src/features/roles/components/admin/screens/PermissionMatrixScreen.tsx
// Màn hình Phân quyền vai trò: Cấu hình quyền hiển thị chức năng trên thanh Navbar cho từng vai trò

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  Check,
  Search,
  Users,
  ShieldCheck,
  Building2,
  Package,
  ShoppingBag,
  ArrowDownToLine,
  Warehouse,
  Layers,
  Sliders,
  BarChart3,
  Repeat,
} from 'lucide-react';
import { UserRole, RoleDefinition } from '../../../types';
import { adminService, NAVBAR_FEATURES } from '../../../services/adminService';

interface RoleColumn {
  code: string;
  name: string;
  badge: string;
  isSystem: boolean;
}

const DEFAULT_SYSTEM_ROLES: RoleColumn[] = [
  { code: 'ROLE_ADMIN', name: 'Quản trị viên', badge: 'ADMIN', isSystem: true },
  { code: 'ROLE_MANAGER', name: 'Quản lý', badge: 'MANAGER', isSystem: true },
  { code: 'ROLE_SALES', name: 'Nhân viên bán hàng', badge: 'SALES', isSystem: true },
  { code: 'ROLE_WAREHOUSE', name: 'Nhân viên kho', badge: 'WAREHOUSE', isSystem: true },
  { code: 'ROLE_PRODUCTION', name: 'Nhân viên sản xuất', badge: 'PRODUCTION', isSystem: true },
];

const FEATURE_ICONS: Record<string, React.FC<{ size?: number; className?: string }>> = {
  'feat-staff': Users,
  'feat-roles': ShieldCheck,
  'feat-warehouse-perms': Building2,
  'feat-goods': Package,
  'feat-transfers': Repeat,
  'feat-sales': ShoppingBag,
  'feat-purchase': ArrowDownToLine,
  'feat-stock': Warehouse,
  'feat-prod': Layers,
  'feat-bom': Sliders,
  'feat-partner': Users,
  'feat-fin': BarChart3,
};

interface PermissionMatrixScreenProps {
  initialRoleCode?: string;
  currentRole?: UserRole;
  onRoleChange?: (role: UserRole) => void;
}

export const PermissionMatrixScreen: React.FC<PermissionMatrixScreenProps> = ({
  currentRole,
  onRoleChange,
}) => {
  const [roles, setRoles] = useState<RoleColumn[]>(DEFAULT_SYSTEM_ROLES);
  const [matrix, setMatrix] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    targetRole?: UserRole;
    targetRoleName?: string;
  } | null>(null);

  // 1. Tải danh mục vai trò động từ Database & Ma trận phân quyền tính năng
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      try {
        const [defs, currentMatrix] = await Promise.all([
          adminService.getRoleDefinitions(),
          adminService.getFeatureMatrix(),
        ]);

        if (defs && defs.length > 0) {
          const mapped: RoleColumn[] = defs.map((d: RoleDefinition) => ({
            code: d.code,
            name: d.name,
            badge: d.code.replace(/^ROLE_/, ''),
            isSystem: d.isSystem,
          }));
          setRoles(mapped);
        }

        setMatrix(currentMatrix);
      } catch (err) {
        console.warn('Lỗi tải dữ liệu ma trận phân quyền:', err);
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, []);

  const showToast = (text: string, targetRole?: UserRole, targetRoleName?: string) => {
    setToastMessage({ text, targetRole, targetRoleName });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // 2. Xử lý Toggle 1 ô Checkbox [Tính năng, Vai trò]
  const handleToggleCell = (roleCode: string, featureId: string) => {
    // Bảo vệ Quản trị viên không bị tắt các quyền cốt lõi
    if (roleCode === 'ROLE_ADMIN' && ['feat-staff', 'feat-roles'].includes(featureId)) {
      return;
    }

    setMatrix((prev) => {
      const currentList = prev[roleCode] || [];
      const hasFeat = currentList.includes(featureId);
      const updatedList = hasFeat
        ? currentList.filter((id) => id !== featureId)
        : [...currentList, featureId];

      return {
        ...prev,
        [roleCode]: updatedList,
      };
    });
  };

  // 3. Xử lý Toggle tất cả tính năng của một cột Vai trò
  const handleToggleRoleColumn = (roleCode: string) => {
    const currentList = matrix[roleCode] || [];
    const allIds = NAVBAR_FEATURES.map((f) => f.id);
    const isAllChecked = allIds.every((id) => currentList.includes(id));

    setMatrix((prev) => {
      if (isAllChecked) {
        // Nếu là ADMIN, giữ lại quyền cốt lõi
        const retained = roleCode === 'ROLE_ADMIN' ? ['feat-staff', 'feat-roles'] : [];
        return { ...prev, [roleCode]: retained };
      }
      return { ...prev, [roleCode]: allIds };
    });
  };

  // 4. Lưu Ma trận phân quyền
  const handleSave = async () => {
    setSaving(true);
    try {
      await adminService.saveFeatureMatrix(matrix);
      showToast(
        'Đã lưu ma trận phân quyền thành công! Thanh Navbar đã được cập nhật.',
        currentRole,
        currentRole
      );
    } catch (err) {
      alert('Có lỗi xảy ra khi lưu phân quyền: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  // 5. Đặt lại mặc định
  const handleResetDefaults = async () => {
    if (!confirm('Bạn có chắc chắn muốn đặt lại phân quyền về cấu hình chuẩn ban đầu?')) {
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('stockflow_feature_matrix');
    }
    const freshMatrix = await adminService.getFeatureMatrix();
    setMatrix(freshMatrix);
    await adminService.saveFeatureMatrix(freshMatrix);
    showToast('Đã khôi phục phân quyền về mặc định thành công!');
  };

  // Lọc tính năng theo từ khóa tìm kiếm (Flat list, không có hàng tiêu đề nhóm)
  const filteredFeatures = useMemo(() => {
    if (!searchTerm.trim()) return NAVBAR_FEATURES;
    const q = searchTerm.toLowerCase().trim();
    return NAVBAR_FEATURES.filter(
      (f) => f.name.toLowerCase().includes(q) || f.desc.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <div>
            <div>{toastMessage.text}</div>
            {toastMessage.targetRole && onRoleChange && (
              <button
                type="button"
                onClick={() => {
                  if (toastMessage.targetRole) {
                    onRoleChange(toastMessage.targetRole);
                    setToastMessage(null);
                  }
                }}
                className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold transition cursor-pointer"
              >
                <span>Xem Navbar vai trò {toastMessage.targetRoleName || toastMessage.targetRole}</span>
                <span>→</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Phân quyền vai trò
        </h1>
      </div>

      {/* Search & Stats Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm"
            className="w-full h-9 pl-9 pr-3.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
          <div>
            Tổng số tính năng: <span className="font-bold text-slate-800">{NAVBAR_FEATURES.length}</span>
          </div>
          <div className="h-3 w-px bg-slate-200" />
          <div>
            Tổng số vai trò: <span className="font-bold text-slate-800">{roles.length}</span>
          </div>
        </div>
      </div>

      {/* MATRIX TABLE (Flat list of features, columns are Roles) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            {/* Table Header: Columns are Roles */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {/* Fixed Feature Name Column */}
                <th className="sticky left-0 z-20 bg-slate-50 px-5 py-4 w-80 min-w-[280px] text-xs font-bold text-slate-700 tracking-tight border-r border-slate-200">
                  <div className="flex items-center gap-2">
                    <Shield size={15} className="text-[#1E56A0]" />
                    <span>Chức năng trên Navbar</span>
                  </div>
                </th>

                {/* Role Columns */}
                {roles.map((role) => {
                  const roleFeats = matrix[role.code] || [];
                  const count = roleFeats.length;
                  const total = NAVBAR_FEATURES.length;
                  const isAll = count === total;

                  return (
                    <th
                      key={role.code}
                      className="px-4 py-3.5 text-center min-w-[140px] border-r border-slate-200/70 last:border-r-0 select-none"
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-xs font-bold text-slate-900 truncate max-w-[130px]">
                          {role.name}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-[#1E56A0]">
                            {role.badge}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            ({count}/{total})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleToggleRoleColumn(role.code)}
                          className="mt-0.5 text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
                        >
                          {isAll ? 'Bỏ chọn' : 'Tất cả'}
                        </button>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Table Body: Flat List of Features (No category headers) */}
            <tbody className="divide-y divide-slate-100">
              {filteredFeatures.map((feat, index) => {
                const IconComponent = FEATURE_ICONS[feat.id] || Package;

                return (
                  <tr
                    key={feat.id}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                    }`}
                  >
                    {/* Fixed Feature Name Column */}
                    <td className="sticky left-0 z-10 bg-inherit px-5 py-3.5 border-r border-slate-200 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E56A0] border border-blue-100/80 flex items-center justify-center shrink-0">
                          <IconComponent size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {feat.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate max-w-[240px] mt-0.5">
                            {feat.desc}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Checkbox Cells */}
                    {roles.map((role) => {
                      const roleFeats = matrix[role.code] || [];
                      const isChecked = roleFeats.includes(feat.id);
                      const isLockedAdmin =
                        role.code === 'ROLE_ADMIN' &&
                        ['feat-staff', 'feat-roles'].includes(feat.id);

                      return (
                        <td
                          key={role.code}
                          onClick={() => !isLockedAdmin && handleToggleCell(role.code, feat.id)}
                          className={`px-4 py-3 text-center border-r border-slate-100 last:border-r-0 cursor-pointer transition-colors ${
                            isChecked ? 'bg-blue-50/20' : ''
                          } ${isLockedAdmin ? 'cursor-not-allowed' : 'hover:bg-blue-100/30'}`}
                        >
                          <div className="flex items-center justify-center">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-[#1E56A0] text-white shadow-2xs'
                                  : 'border-2 border-slate-300 bg-white hover:border-slate-400'
                              } ${isLockedAdmin ? 'opacity-80' : ''}`}
                            >
                              {isChecked && <Check size={13} strokeWidth={3} />}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {filteredFeatures.length === 0 && (
                <tr>
                  <td
                    colSpan={roles.length + 1}
                    className="px-6 py-12 text-center text-xs text-slate-400"
                  >
                    Không tìm thấy tính năng nào khớp với từ khóa "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition cursor-pointer shadow-2xs"
          >
            <RotateCcw size={14} className="text-slate-400" />
            <span>Mặc định</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#1E56A0] hover:bg-[#184580] text-xs font-bold text-white transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? 'Đang lưu...' : 'Lưu'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
