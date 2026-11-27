// src/features/admin/screens/WarehousePermissionsScreen.tsx
// Màn hình 3.2.1.9: Danh sách phân quyền kho (Data Isolation) theo giao diện AI Studio Ảnh 4

import { tabSession } from '@/lib/auth/tabSession';
import React, { useState, useEffect } from 'react';
import {
  Warehouse,
  Search,
  MapPin,
  Users,
  Sliders,
  CheckCircle2,
  X,
  Shield,
  Building2,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import { StaffAccount, WarehouseFacility } from '../types';
import { adminService } from '../services/adminService';
import { refreshAuthorizedWarehouses } from '@/lib/warehouse/useActiveWarehouse';

export const getNextWarehouseCode = (list: WarehouseFacility[]): string => {
  let maxNum = 0;
  for (const f of list) {
    const kMatch = f.code.match(/^K(\d+)/i);
    if (kMatch) {
      const num = parseInt(kMatch[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    } else {
      const anyMatch = f.code.match(/(\d+)/);
      if (anyMatch) {
        const num = parseInt(anyMatch[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
  }
  return `K${String(maxNum + 1).padStart(3, '0')}`;
};

export const WarehousePermissionsScreen: React.FC = () => {
  const [facilities, setFacilities] = useState<WarehouseFacility[]>([]);
  const [staffList, setStaffList] = useState<StaffAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');

  // Modal Phân quyền kho
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffAccount | null>(null);
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Thêm kho mới
  const [createWhModalOpen, setCreateWhModalOpen] = useState(false);
  const [newWhCode, setNewWhCode] = useState('');
  const [newWhName, setNewWhName] = useState('');
  const [newWhAddress, setNewWhAddress] = useState('');
  const [newWhArea, setNewWhArea] = useState('3,500 m²');
  const [isCreatingWh, setIsCreatingWh] = useState(false);
  const [createWhError, setCreateWhError] = useState('');

  // Modal Chỉnh sửa kho
  const [editWhModalOpen, setEditWhModalOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<WarehouseFacility | null>(null);
  const [editWhName, setEditWhName] = useState('');
  const [editWhAddress, setEditWhAddress] = useState('');
  const [editWhArea, setEditWhArea] = useState('3,500 m²');
  const [isUpdatingWh, setIsUpdatingWh] = useState(false);
  const [editWhError, setEditWhError] = useState('');

  const suggestedWhCode = getNextWarehouseCode(facilities);
  const isWhCodeDuplicate = newWhCode.trim()
    ? facilities.some((f) => f.code.toUpperCase() === newWhCode.trim().toUpperCase())
    : false;

  const loadData = async () => {
    setLoading(true);
    try {
      const [facs, staffs] = await Promise.all([
        adminService.getWarehouseFacilities(),
        adminService.getStaffList(),
      ]);
      setFacilities(facs);
      setStaffList(staffs);
      // Đồng bộ danh sách kho được phân quyền dùng chung (Header, bộ lọc kho các màn)
      void refreshAuthorizedWarehouses();
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

  const handleOpenPermModal = (staff: StaffAccount) => {
    setSelectedStaff(staff);
    setSelectedWarehouses(staff.assignedWarehouses || []);
    setModalOpen(true);
  };

  const handleSavePerms = async () => {
    if (!selectedStaff) return;
    try {
      await adminService.updateWarehousePermissions(selectedStaff.id, selectedWarehouses);
      void refreshAuthorizedWarehouses();
    } catch (err) {
      alert('Không thể cập nhật phân quyền kho: ' + (err instanceof Error ? err.message : String(err)));
      return;
    }

    // Đồng bộ session người dùng đang đăng nhập nếu đúng nhân sự này
    if (typeof window !== 'undefined') {
      const rawUser = tabSession.get('stockflow_user');
      if (rawUser) {
        try {
          const uObj = JSON.parse(rawUser);
          const isCurrent =
            (uObj.userId && String(uObj.userId) === String(selectedStaff.id).replace(/\D/g, '')) ||
            (uObj.code && uObj.code.toUpperCase() === selectedStaff.code.toUpperCase()) ||
            (uObj.username && uObj.username.toLowerCase() === selectedStaff.username?.toLowerCase());

          if (isCurrent) {
            uObj.assignedWarehouses = selectedWarehouses;
            uObj.warehouses = selectedWarehouses.map((w: string) => ({
              warehouseCode: w,
              warehouseName: w,
            }));
            tabSession.set('stockflow_user', JSON.stringify(uObj));
            window.dispatchEvent(
              new CustomEvent('stockflow_user_updated', {
                detail: { assignedWarehouses: selectedWarehouses },
              })
            );
          }
        } catch (syncErr) {
          console.warn('Failed to sync current user in localStorage:', syncErr);
        }
      }
    }

    showToast(`Đã cập nhật phân quyền kho cho nhân sự ${selectedStaff.name}`);
    setModalOpen(false);
    loadData();
  };

  const handleOpenCreateWhModal = () => {
    setNewWhCode('');
    setNewWhName('');
    setNewWhAddress('');
    setNewWhArea('3,500 m²');
    setCreateWhError('');
    setCreateWhModalOpen(true);
  };

  const handleSaveNewWarehouse = async () => {
    const finalCode = newWhCode.trim() ? newWhCode.trim().toUpperCase() : suggestedWhCode;
    if (isWhCodeDuplicate) {
      setCreateWhError('Mã kho đã tồn tại trong hệ thống, vui lòng chọn mã khác');
      return;
    }
    if (!newWhName.trim()) {
      setCreateWhError('Vui lòng nhập tên cơ sở kho');
      return;
    }
    if (!newWhAddress.trim()) {
      setCreateWhError('Vui lòng nhập địa chỉ kho');
      return;
    }

    setIsCreatingWh(true);
    setCreateWhError('');
    try {
      const created = await adminService.createWarehouseFacility({
        code: finalCode,
        name: newWhName.trim(),
        address: newWhAddress.trim(),
        area: newWhArea.trim(),
      });
      setFacilities((prev) => [created, ...prev]);
      showToast(`Đã thêm mới cơ sở kho: ${created.name} (${finalCode})`);
      setCreateWhModalOpen(false);
      await loadData();
    } catch (err: any) {
      setCreateWhError(err.message || 'Lỗi khi tạo kho mới');
    } finally {
      setIsCreatingWh(false);
    }
  };

  const handleOpenEditWhModal = (fac: WarehouseFacility) => {
    setEditingWh(fac);
    setEditWhName(fac.name);
    setEditWhAddress(fac.address);
    setEditWhArea(fac.area || '3,500 m²');
    setEditWhError('');
    setEditWhModalOpen(true);
  };

  const handleSaveEditWarehouse = async () => {
    if (!editingWh) return;
    if (!editWhName.trim()) {
      setEditWhError('Vui lòng nhập tên cơ sở kho');
      return;
    }
    if (!editWhAddress.trim()) {
      setEditWhError('Vui lòng nhập địa chỉ kho');
      return;
    }

    setIsUpdatingWh(true);
    setEditWhError('');
    try {
      const updated = await adminService.updateWarehouseFacility(
        editingWh.warehouseId || editingWh.code,
        {
          name: editWhName.trim(),
          address: editWhAddress.trim(),
          area: editWhArea.trim(),
        }
      );
      setFacilities((prev) =>
        prev.map((f) => (f.code === updated.code || f.id === updated.id ? updated : f))
      );
      showToast(`Đã cập nhật cơ sở kho: ${updated.name} (${updated.code})`);
      setEditWhModalOpen(false);
      await loadData();
    } catch (err: any) {
      setEditWhError(err.message || 'Lỗi khi cập nhật cơ sở kho');
    } finally {
      setIsUpdatingWh(false);
    }
  };

  const handleDeleteWarehouse = async (fac: WarehouseFacility) => {
    if (fac.staffCount > 0) {
      alert(
        `Không thể xóa cơ sở kho "${fac.name}" (${fac.code}) vì hiện đang có ${fac.staffCount} nhân sự trực thuộc.\n\nVui lòng chuyển hoặc gỡ phân quyền toàn bộ nhân sự khỏi kho này trước khi xóa.`
      );
      return;
    }

    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa cơ sở kho "${fac.name}" (${fac.code}) không?\n\nHành động này không thể hoàn tác.`
      )
    ) {
      return;
    }

    try {
      await adminService.deleteWarehouseFacility(fac.warehouseId || fac.code);
      setFacilities((prev) => prev.filter((f) => f.code !== fac.code && f.id !== fac.id));
      void refreshAuthorizedWarehouses();
      showToast(`Đã xóa cơ sở kho ${fac.name} (${fac.code})`);
      await loadData();
    } catch (err: any) {
      alert(`Lỗi khi xóa kho: ${err.message || 'Thao tác không thành công'}`);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase());
    const matchWh =
      warehouseFilter === 'ALL' ||
      (s.assignedWarehouses && s.assignedWarehouses.includes(warehouseFilter));
    return matchSearch && matchWh;
  });

  const getWarehouseName = (code: string) => {
    const fac = facilities.find((f) => f.code === code);
    return fac ? fac.name : code;
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
            Danh sách phân quyền kho
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị phân quyền kho cho từng nhân sự
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenCreateWhModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus size={14} />
            <span>Thêm cơ sở kho</span>
          </button>
        </div>
      </div>

      {/* 4 Physical Warehouse Facilities Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {facilities.map((fac) => (
          <div
            key={fac.id}
            className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-blue-200 transition"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                  {fac.code}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Hoạt động
                  </span>
                  <div className="flex items-center gap-0.5 ml-0.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditWhModal(fac)}
                      title="Chỉnh sửa thông tin kho"
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteWarehouse(fac)}
                      title={
                        fac.staffCount > 0
                          ? `Kho đang có ${fac.staffCount} nhân sự trực thuộc - Không thể xóa`
                          : `Xóa cơ sở kho ${fac.code}`
                      }
                      className={`p-1 rounded transition cursor-pointer ${
                        fac.staffCount > 0
                          ? 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                          : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                      }`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{fac.name}</h3>
              <p className="text-[11px] text-slate-400 flex items-start gap-1">
                <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
                <span className="line-clamp-2">{fac.address}</span>
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Users size={12} className={fac.staffCount === 0 ? "text-amber-500" : "text-slate-400"} />
                <span className={fac.staffCount === 0 ? "text-amber-600 font-medium" : ""}>
                  {fac.staffCount} nhân sự
                </span>
              </div>
              <span className="font-mono font-semibold text-slate-700">{fac.area}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm nhân sự theo tên, mã NV..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="relative w-full sm:w-64">
          <Warehouse size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
          >
            <option value="ALL">Tất cả kho cơ sở</option>
            {facilities.map((f) => (
              <option key={f.code} value={f.code}>
                {f.code} - {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Warehouse Permissions Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Table Top Header */}
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              PHÂN QUYỀN NHÂN SỰ - KHO
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Nhân viên chỉ có quyền xem dữ liệu tồn kho và chứng từ của kho được phân quyền
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-[6px] bg-slate-100 text-slate-600">
            {filteredStaff.length} nhân viên
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">MÃ NV</th>
                <th className="py-3 px-4">NHÂN VIÊN</th>
                <th className="py-3 px-4">PHÒNG BAN</th>
                <th className="py-3 px-4">VAI TRÒ</th>
                <th className="py-3 px-4">KHO ĐƯỢC PHÂN QUYỀN</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredStaff.map((staff) => {
                const initials = staff.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(-2)
                  .join('');

                return (
                  <tr key={staff.id} className="hover:bg-blue-50/30 transition">
                    {/* Mã NV */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {staff.code}
                    </td>

                    {/* Nhân viên */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-2xs">
                          <span>{initials}</span>
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{staff.name}</div>
                          <div className="text-[11px] text-slate-400">{staff.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Phòng ban */}
                    <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                      {staff.department}
                    </td>

                    {/* Vai trò RBAC */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[4px] bg-blue-50 text-[#2B6CB0] font-semibold text-[11px]">
                        {staff.roleTitle}
                      </span>
                    </td>

                    {/* Kho được phân quyền */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {staff.assignedWarehouses && staff.assignedWarehouses.length > 0 ? (
                          staff.assignedWarehouses.map((wh) => (
                            <span
                              key={wh}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-[11px] font-medium"
                            >
                              <Warehouse size={11} className="text-emerald-600" />
                              <span>{getWarehouseName(wh)}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Chưa được phân quyền kho
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleOpenPermModal(staff)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition cursor-pointer"
                      >
                        <Sliders size={13} />
                        <span>Phân quyền kho</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Phân Quyền Kho cho Nhân sự */}
      {modalOpen && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Warehouse size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Phân quyền kho cho nhân sự
                </h3>
                <p className="text-xs text-slate-500">
                  Nhân sự: <span className="font-bold text-slate-800">{selectedStaff.name}</span> ({selectedStaff.code})
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs text-slate-600">
                  Chọn các cơ sở kho mà nhân viên này được phép truy cập, lập phiếu và xem tồn kho:
                </div>
                {/* Chọn / bỏ chọn tất cả kho (SYS-WHA-04) */}
                <label className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    aria-label="Chọn tất cả"
                    checked={facilities.length > 0 && facilities.every((f) => selectedWarehouses.includes(f.code))}
                    onChange={(e) =>
                      setSelectedWarehouses(e.target.checked ? facilities.map((f) => f.code) : [])
                    }
                    className="rounded text-blue-600"
                  />
                  Chọn tất cả
                </label>
              </div>

              {facilities.map((fac) => {
                const isChecked = selectedWarehouses.includes(fac.code);
                return (
                  <label
                    key={fac.code}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                      isChecked
                        ? 'border-blue-300 bg-blue-50/70 text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedWarehouses([...selectedWarehouses, fac.code]);
                        } else {
                          setSelectedWarehouses(
                            selectedWarehouses.filter((c) => c !== fac.code)
                          );
                        }
                      }}
                      className="mt-0.5 rounded text-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{fac.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white border border-slate-200 text-slate-600 font-semibold">
                          {fac.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{fac.address}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSavePerms}
                className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer"
              >
                Lưu phân quyền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thêm Cơ Sở Kho Mới */}
      {createWhModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setCreateWhModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Thêm cơ sở kho mới
                </h3>
                <p className="text-xs text-slate-500">
                  Cơ sở kho mới sẽ tự động hiển thị trong danh sách phân quyền
                </p>
              </div>
            </div>

            {createWhError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                {createWhError}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã kho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newWhCode}
                  onChange={(e) => {
                    setNewWhCode(e.target.value);
                    if (createWhError) setCreateWhError('');
                  }}
                  placeholder="Tự động"
                  className={`w-full h-9 px-3 rounded-lg bg-slate-50 border text-xs font-mono uppercase focus:outline-none focus:bg-white transition ${
                    isWhCodeDuplicate
                      ? 'border-rose-400 text-rose-700 focus:border-rose-500'
                      : 'border-slate-200 text-slate-800 focus:border-blue-500'
                  }`}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  {isWhCodeDuplicate ? (
                    <span className="text-rose-500 font-semibold">Mã kho đã tồn tại trong hệ thống, vui lòng chọn mã khác</span>
                  ) : (
                    'Để trống hệ thống sẽ tự động tạo mã'
                  )}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên kho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newWhName}
                  onChange={(e) => setNewWhName(e.target.value)}
                  placeholder="Vd: Kho Cầu Giấy"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ kho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newWhAddress}
                  onChange={(e) => setNewWhAddress(e.target.value)}
                  placeholder="Vd: Số 10 Duy Tân, Cầu Giấy, Hà Nội"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Diện tích / Quy mô kho
                </label>
                <input
                  type="text"
                  value={newWhArea}
                  onChange={(e) => setNewWhArea(e.target.value)}
                  placeholder="Vd: 3,500 m²"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateWhModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isCreatingWh}
                onClick={handleSaveNewWarehouse}
                className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {isCreatingWh ? 'Đang lưu...' : 'Tạo cơ sở kho'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa kho */}
      {editWhModalOpen && editingWh && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Chỉnh sửa cơ sở kho</h3>
                  <p className="text-[11px] text-slate-500">Cập nhật thông tin chi nhánh kho</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditWhModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {editWhError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {editWhError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã kho
                </label>
                <input
                  type="text"
                  disabled
                  value={editingWh.code}
                  className="w-full h-9 px-3 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono uppercase text-slate-500 cursor-not-allowed font-bold"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Mã kho chuẩn K00X cố định của hệ thống
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tên kho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editWhName}
                  onChange={(e) => setEditWhName(e.target.value)}
                  placeholder="Vd: Kho Tổng Gia Lâm"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ kho <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editWhAddress}
                  onChange={(e) => setEditWhAddress(e.target.value)}
                  placeholder="Vd: Số 18 Đường Dệt May, Gia Lâm, Hà Nội"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Diện tích / Quy mô kho
                </label>
                <input
                  type="text"
                  value={editWhArea}
                  onChange={(e) => setEditWhArea(e.target.value)}
                  placeholder="Vd: 8,500 m²"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditWhModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isUpdatingWh}
                onClick={handleSaveEditWarehouse}
                className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer disabled:opacity-50"
              >
                {isUpdatingWh ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
