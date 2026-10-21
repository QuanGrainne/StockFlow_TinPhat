// src/features/roles/components/admin/screens/PermissionMatrixScreen.tsx
// Màn hình 3.2.1.7: Cấu hình ma trận phân quyền theo giao diện AI Studio Ảnh 5

import React, { useState, useEffect } from 'react';
import {
  Shield,
  Save,
  CheckCircle2,
  Check,
  RotateCcw,
} from 'lucide-react';
import { PermissionMatrixModule } from '../../../types';
import { adminService } from '../../../services/adminService';

interface RoleTab {
  code: string;
  name: string;
  badge: string;
  rankNum: number;
  desc: string;
}

const ROLES_LIST: RoleTab[] = [
  {
    code: 'ROLE_ADMIN',
    name: 'Quản trị viên',
    badge: 'ADMIN',
    rankNum: 1,
    desc: 'Toàn quyền cấu hình hệ thống, quản lý tài khoản, vai trò và phân quyền kho.',
  },
  {
    code: 'ROLE_MANAGER',
    name: 'Quản lý',
    badge: 'MANAGER',
    rankNum: 2,
    desc: 'Quản lý danh mục master data, duyệt hạn mức công nợ, duyệt lệnh sản xuất và báo cáo tài chính.',
  },
  {
    code: 'ROLE_SALES',
    name: 'Nhân viên bán hàng',
    badge: 'SALES',
    rankNum: 3,
    desc: 'Tiếp nhận đơn hàng chờ, gộp đơn B2B, kiểm tra công nợ khách hàng và lập phiếu xuất bán.',
  },
  {
    code: 'ROLE_WAREHOUSE',
    name: 'Nhân viên kho',
    badge: 'WAREHOUSE',
    rankNum: 4,
    desc: 'Thực hiện xuất nhập kho, quét mã vạch, phân bổ chi phí Landed Cost và kiểm kê định kỳ.',
  },
  {
    code: 'ROLE_PRODUCTION',
    name: 'Nhân viên sản xuất',
    badge: 'PRODUCTION',
    rankNum: 5,
    desc: 'Theo dõi lệnh sản xuất, định mức BOM, cập nhật tiến độ và báo cáo hoàn thành thành phẩm.',
  },
];

interface PermissionMatrixScreenProps {
  initialRoleCode?: string;
}

export const PermissionMatrixScreen: React.FC<PermissionMatrixScreenProps> = ({
  initialRoleCode = 'ROLE_ADMIN',
}) => {
  const [selectedRoleCode, setSelectedRoleCode] = useState(initialRoleCode);
  const [modules, setModules] = useState<PermissionMatrixModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activeRole = ROLES_LIST.find((r) => r.code === selectedRoleCode) || ROLES_LIST[0];

  const loadData = async (code: string) => {
    setLoading(true);
    try {
      const data = await adminService.getPermissionMatrix(code);
      setModules(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedRoleCode);
  }, [selectedRoleCode]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleToggleModulePerm = (
    moduleId: string,
    field: 'read' | 'create' | 'update' | 'delete' | 'approve'
  ) => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, [field]: !m[field] } : m))
    );
  };

  const handleToggleRow = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) => {
        if (m.id !== moduleId) return m;
        const allChecked = m.read && m.create && m.update && m.delete && m.approve;
        return {
          ...m,
          read: !allChecked,
          create: !allChecked,
          update: !allChecked,
          delete: !allChecked,
          approve: !allChecked,
        };
      })
    );
  };

  const handleSave = async () => {
    await adminService.savePermissionMatrix(selectedRoleCode, modules);
    showToast(`Đã lưu cấu hình ma trận phân quyền cho vai trò ${activeRole.name}`);
  };

  // Tính tổng số quyền được cấp
  const totalPermissions = modules.reduce((acc, m) => {
    let count = 0;
    if (m.read) count++;
    if (m.create) count++;
    if (m.update) count++;
    if (m.delete) count++;
    if (m.approve) count++;
    return acc + count;
  }, 0);
  const maxPermissions = (modules.length || 9) * 5; // Tính động theo số phân hệ (9 * 5 = 45)
  const percentGranted = Math.round((totalPermissions / maxPermissions) * 100);

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
            MÀN HÌNH 3.2.1.7 • Ma trận
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Cấu hình ma trận phân quyền
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập chi tiết quyền Xem, Thêm, Sửa, Xóa, Duyệt cho {modules.length || 9} phân hệ nghiệp vụ
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
        >
          <Save size={14} />
          <span>Lưu ma trận</span>
        </button>
      </div>

      {/* Role Tabs Selector */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2 flex flex-wrap items-center gap-2">
        {ROLES_LIST.map((role) => {
          const isSelected = role.code === selectedRoleCode;
          return (
            <button
              key={role.code}
              type="button"
              onClick={() => setSelectedRoleCode(role.code)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
                isSelected
                  ? 'border-blue-400 bg-blue-50/70 text-[#2B6CB0] shadow-2xs'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Shield size={14} className={isSelected ? 'text-[#2B6CB0]' : 'text-slate-400'} />
              <span>{role.name}</span>
              <span
                className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold uppercase ${
                  isSelected ? 'bg-blue-100 text-[#2B6CB0]' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {role.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Role Summary Card */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1E56A0] font-bold text-xl flex items-center justify-center shrink-0 border border-blue-100">
            {activeRole.rankNum}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">{activeRole.name}</h2>
              <span className="font-mono text-[11px] font-bold text-blue-600 tracking-wider">
                {activeRole.code}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{activeRole.desc}</p>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="w-full md:w-56 shrink-0">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500">Tổng quyền cấp:</span>
            <span className="font-bold text-slate-900">
              {totalPermissions} / {maxPermissions}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#1E56A0] rounded-full transition-all duration-300"
              style={{ width: `${percentGranted}%` }}
            />
          </div>
        </div>
      </div>

      {/* 8 Module Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">STT</th>
                <th className="py-3 px-4 min-w-[240px]">PHÂN HỆ NGHIỆP VỤ</th>
                <th className="py-3 px-4 text-center">XEM (READ)</th>
                <th className="py-3 px-4 text-center">THÊM (CREATE)</th>
                <th className="py-3 px-4 text-center">SỬA (UPDATE)</th>
                <th className="py-3 px-4 text-center">XÓA (DELETE)</th>
                <th className="py-3 px-4 text-center">DUYỆT (APPROVE)</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {modules.map((mod) => {
                const allChecked =
                  mod.read && mod.create && mod.update && mod.delete && mod.approve;

                return (
                  <tr key={mod.id} className="hover:bg-blue-50/30 transition">
                    {/* STT */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-400 text-center">
                      {mod.stt}
                    </td>

                    {/* Phân hệ nghiệp vụ */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{mod.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {mod.description}{' '}
                        <span className="font-mono text-slate-400 font-semibold">{mod.code}</span>
                      </div>
                    </td>

                    {/* Checkbox Xem */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={mod.read}
                        onChange={() => handleToggleModulePerm(mod.id, 'read')}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Checkbox Thêm */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={mod.create}
                        onChange={() => handleToggleModulePerm(mod.id, 'create')}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Checkbox Sửa */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={mod.update}
                        onChange={() => handleToggleModulePerm(mod.id, 'update')}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Checkbox Xóa */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={mod.delete}
                        onChange={() => handleToggleModulePerm(mod.id, 'delete')}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Checkbox Duyệt */}
                    <td className="py-3.5 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={mod.approve}
                        onChange={() => handleToggleModulePerm(mod.id, 'approve')}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleRow(mod.id)}
                        className="px-2.5 py-1 rounded border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      >
                        {allChecked ? 'Bỏ chọn' : 'Chọn tất cả'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Note & Save */}
        <div className="p-4 bg-white border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-slate-500 italic">
            * Thay đổi sẽ tự động cập nhật cache phiên đăng nhập JWT của tất cả nhân viên thuộc vai trò này.
          </p>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
          >
            <Save size={14} />
            <span>Lưu ma trận</span>
          </button>
        </div>
      </div>
    </div>
  );
};
