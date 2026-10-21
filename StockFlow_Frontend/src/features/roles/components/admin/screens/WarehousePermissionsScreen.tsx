// src/features/roles/components/admin/screens/WarehousePermissionsScreen.tsx
// Màn hình 3.2.1.9: Danh sách phân quyền kho (Data Isolation) theo giao diện AI Studio Ảnh 4

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
} from 'lucide-react';
import { StaffAccount, WarehouseFacility } from '../../../types';
import { adminService } from '../../../services/adminService';

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

  const loadData = async () => {
    setLoading(true);
    try {
      const [facs, staffs] = await Promise.all([
        adminService.getWarehouseFacilities(),
        adminService.getStaffList(),
      ]);
      setFacilities(facs);
      setStaffList(staffs);
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
    await adminService.updateWarehousePermissions(selectedStaff.id, selectedWarehouses);
    showToast(`Đã cập nhật phân quyền kho cho nhân sự ${selectedStaff.name}`);
    setModalOpen(false);
    loadData();
  };

  const handleOpenCreateWhModal = () => {
    setNewWhCode(`WH-HN-0${facilities.length + 1}`);
    setNewWhName('');
    setNewWhAddress('');
    setNewWhArea('3,500 m²');
    setCreateWhError('');
    setCreateWhModalOpen(true);
  };

  const handleSaveNewWarehouse = async () => {
    if (!newWhCode.trim()) {
      setCreateWhError('Vui lòng nhập mã kho');
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
        code: newWhCode.trim(),
        name: newWhName.trim(),
        address: newWhAddress.trim(),
        area: newWhArea.trim(),
      });
      setFacilities((prev) => [created, ...prev]);
      showToast(`Đã thêm mới cơ sở kho: ${created.name}`);
      setCreateWhModalOpen(false);
      await loadData();
    } catch (err: any) {
      setCreateWhError(err.message || 'Lỗi khi tạo kho mới');
    } finally {
      setIsCreatingWh(false);
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
          <div className="text-[11px] font-bold text-blue-600 uppercase tracking-wider mb-1">
            MÀN HÌNH 3.2.1.9 • Danh sách
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Danh sách phân quyền kho (Data Isolation)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị ma trận phân quyền cơ sở dữ liệu kho vật lý theo quy tắc BR-03
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 text-blue-700 text-xs font-semibold">
            Quy tắc BR-03 Đang áp dụng
          </span>
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
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Hoạt động
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">{fac.name}</h3>
              <p className="text-[11px] text-slate-400 flex items-start gap-1">
                <MapPin size={12} className="shrink-0 mt-0.5 text-slate-400" />
                <span className="line-clamp-2">{fac.address}</span>
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Users size={12} className="text-slate-400" />
                <span>{fac.staffCount} nhân sự</span>
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
              MA TRẬN PHÂN QUYỀN NHÂN SỰ - KHO
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Nhân viên chỉ có quyền xem dữ liệu tồn kho và chứng từ của kho được tích chọn
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
                <th className="py-3 px-4">VAI TRÒ RBAC</th>
                <th className="py-3 px-4">KHO ĐƯỢC PHÂN QUYỀN (BR-03)</th>
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
                  Phân quyền kho (Quy tắc BR-03)
                </h3>
                <p className="text-xs text-slate-500">
                  Nhân sự: <span className="font-bold text-slate-800">{selectedStaff.name}</span> ({selectedStaff.code})
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="text-xs text-slate-600 mb-2">
                Chọn các kho vật lý mà nhân viên này được phép tra cứu tồn kho, lập phiếu và xuất nhập chứng từ:
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
                  Thêm cơ sở kho vật lý mới
                </h3>
                <p className="text-xs text-slate-500">
                  Cơ sở kho mới sẽ tự động cập nhật vào ma trận phân quyền
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
                  onChange={(e) => setNewWhCode(e.target.value)}
                  placeholder="Vd: WH-HN-05"
                  className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 uppercase focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
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
    </div>
  );
};
