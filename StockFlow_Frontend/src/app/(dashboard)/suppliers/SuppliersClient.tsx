'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tag, message, Modal, Dropdown, MenuProps } from 'antd';
import {
  Search,
  Plus,
  FileDown,
  FileSpreadsheet,
  PowerOff,
  CheckCircle2,
  SlidersHorizontal,
  RefreshCcw,
  Pencil,
  Trash2,
  Repeat,
  ChevronLeft,
  ChevronRight,
  X,
  Filter,
  MoreVertical,
  Building2,
  ExternalLink,
} from 'lucide-react';
import SupplierFilterSidebar from '@/components/SupplierFilterSidebar';
import SupplierFormModal from '@/features/suppliers/components/SupplierFormModal';
import SupplierDetailDrawer from '@/features/suppliers/components/SupplierDetailDrawer';
import { supplierService } from '@/features/suppliers/services/supplierService';
import { exportSuppliersToXLSX } from '@/features/suppliers/utils/exportExcel';
import {
  Supplier,
  SupplierFilterState,
  CreateSupplierPayload,
  UpdateSupplierPayload,
} from '@/features/suppliers/types';

const currencyFormatter = new Intl.NumberFormat('vi-VN');

interface SuppliersClientProps {
  onNavigate?: (screenId: string) => void;
}

export default function SuppliersClient({ onNavigate }: SuppliersClientProps = {}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);

  // Filter State
  const [filterState, setFilterState] = useState<SupplierFilterState>({
    search: '',
    debtStatus: 'ALL',
    status: 'ALL',
    warehouseId: 'ALL',
  });
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [warehousesList, setWarehousesList] = useState<{ warehouseId: number; code: string; name: string }[]>([]);

  // Selection & Pagination State
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal & Drawer State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [drawerSupplierId, setDrawerSupplierId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Load warehouses on mount
  useEffect(() => {
    async function loadWhs() {
      try {
        const whs = await supplierService.getWarehouses();
        setWarehousesList(whs);
      } catch (err) {
        console.warn('Lỗi tải danh sách kho:', err);
      }
    }
    loadWhs();
  }, []);

  // Load suppliers from API
  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await supplierService.getSuppliers({
        search: filterState.search,
        debtStatus: filterState.debtStatus,
        status: filterState.status,
        warehouseId: filterState.warehouseId,
      });
      setSuppliers(data);
    } catch (e: any) {
      message.error(e?.message || 'Không thể tải danh sách nhà cung cấp từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, [filterState.debtStatus, filterState.status, filterState.warehouseId]);

  // Client-side filtering by Location (Address contains location string)
  const filteredSuppliers = useMemo(() => {
    let result = suppliers;

    if (selectedLocation !== 'ALL') {
      result = result.filter(
        (s) => s.address && s.address.toLowerCase().includes(selectedLocation.toLowerCase())
      );
    }

    if (filterState.search.trim()) {
      const q = filterState.search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          (s.code && s.code.toLowerCase().includes(q)) ||
          (s.name && s.name.toLowerCase().includes(q)) ||
          (s.phone && s.phone.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.address && s.address.toLowerCase().includes(q))
      );
    }

    return result;
  }, [suppliers, selectedLocation, filterState.search]);

  const selectedWarehouse = useMemo(() => {
    if (filterState.warehouseId === 'ALL') return null;
    return warehousesList.find((w) => w.warehouseId === filterState.warehouseId);
  }, [filterState.warehouseId, warehousesList]);

  // Calculate Summary metrics
  const totalPayableDebt = useMemo(() => {
    if (selectedWarehouse) {
      return filteredSuppliers.reduce(
        (sum, s) => sum + (s.branchPayable !== undefined ? s.branchPayable : (s.currentPayable || 0)),
        0
      );
    }
    return filteredSuppliers.reduce((sum, s) => sum + (s.currentPayable || 0), 0);
  }, [filteredSuppliers, selectedWarehouse]);

  // Pagination calculation
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSuppliers.slice(start, start + pageSize);
  }, [filteredSuppliers, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredSuppliers.length / pageSize));
  const rangeStart = filteredSuppliers.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filteredSuppliers.length);

  // Handlers
  const handleFilterChange = (patch: Partial<SupplierFilterState>) => {
    setFilterState((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilterState({
      search: '',
      debtStatus: 'ALL',
      status: 'ALL',
      warehouseId: 'ALL',
    });
    setSelectedLocation('ALL');
    setPage(1);
  };

  const handleOpenCreate = () => {
    setEditingSupplier(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setEditingSupplier(sup);
    setIsModalOpen(true);
  };

  const handleOpenDetail = (sup: Supplier) => {
    setDrawerSupplierId(sup.partnerId);
    setIsDrawerOpen(true);
  };

  const handleToggleStatus = async (id: number) => {
    try {
      const res = await supplierService.toggleSupplierStatus(id);
      message.success(
        res.isActive
          ? 'Đã chuyển nhà cung cấp sang Đang giao dịch!'
          : 'Đã chuyển nhà cung cấp sang Ngừng giao dịch!'
      );
      loadSuppliers();
    } catch (e: any) {
      message.error(e?.message || 'Có lỗi khi thay đổi trạng thái.');
    }
  };

  const handleDelete = (sup: Supplier) => {
    Modal.confirm({
      title: 'Xác nhận xóa Nhà cung cấp',
      content: (
        <div className="text-sm text-slate-600">
          Bạn có chắc chắn muốn xóa nhà cung cấp{' '}
          <strong className="text-slate-900">{sup.name}</strong> ({sup.code})?
          <p className="mt-1.5 text-xs text-slate-500">
            * Lưu ý: Nếu nhà cung cấp đã có chứng từ nhập kho hoặc còn dư nợ, hệ thống sẽ tự động
            chuyển sang <strong>Ngừng giao dịch</strong> để bảo vệ dữ liệu kế toán.
          </p>
        </div>
      ),
      okText: 'Xác nhận',
      cancelText: 'Hủy bỏ',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await supplierService.deleteSupplier(sup.partnerId);
          message.success('Thao tác xóa / ngừng giao dịch nhà cung cấp thành công!');
          loadSuppliers();
        } catch (e: any) {
          message.error(e?.message || 'Có lỗi xảy ra khi xóa nhà cung cấp.');
        }
      },
    });
  };

  const handleExportExcel = () => {
    if (filteredSuppliers.length === 0) {
      message.warning('Không có dữ liệu nhà cung cấp để xuất file.');
      return;
    }
    exportSuppliersToXLSX(
      filteredSuppliers,
      undefined,
      selectedWarehouse ? selectedWarehouse.name : undefined
    );
    message.success(`Đã xuất thành công file Excel (${filteredSuppliers.length} nhà cung cấp)!`);
  };

  const handleBulkExportExcel = () => {
    const selectedSuppliers = suppliers.filter((s) => selectedRowKeys.includes(s.id));
    if (selectedSuppliers.length === 0) return;
    exportSuppliersToXLSX(
      selectedSuppliers,
      `danh_sach_${selectedSuppliers.length}_ncc_da_chon.xlsx`,
      selectedWarehouse ? selectedWarehouse.name : undefined
    );
    message.success(`Đã xuất file Excel cho ${selectedSuppliers.length} nhà cung cấp đã chọn!`);
  };

  const handleBulkChangeStatus = (targetStatus: 'ACTIVE' | 'INACTIVE') => {
    const isDeactivating = targetStatus === 'INACTIVE';
    const selectedSuppliers = suppliers.filter((s) => selectedRowKeys.includes(s.id));
    const toUpdate = selectedSuppliers.filter((s) => s.status !== targetStatus);

    if (toUpdate.length === 0) {
      message.info(
        `Tất cả ${selectedSuppliers.length} nhà cung cấp được chọn đã ở trạng thái ${
          isDeactivating ? 'Ngừng giao dịch' : 'Đang giao dịch'
        }.`
      );
      return;
    }

    Modal.confirm({
      title: isDeactivating
        ? 'Xác nhận ngừng giao dịch hàng loạt'
        : 'Xác nhận kích hoạt lại hàng loạt',
      content: `Bạn có chắc chắn muốn chuyển trạng thái của ${toUpdate.length} nhà cung cấp đã chọn sang "${
        isDeactivating ? 'Ngừng giao dịch' : 'Đang giao dịch'
      }"?`,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      okButtonProps: { danger: isDeactivating },
      onOk: async () => {
        try {
          for (const sup of toUpdate) {
            await supplierService.updateSupplier(sup.partnerId, {
              name: sup.name,
              isActive: !isDeactivating,
            });
          }
          message.success(
            `Đã chuyển trạng thái ${toUpdate.length} nhà cung cấp sang "${
              isDeactivating ? 'Ngừng giao dịch' : 'Đang giao dịch'
            }" thành công!`
          );
          setSelectedRowKeys([]);
          loadSuppliers();
        } catch (e: any) {
          message.error(e?.message || 'Có lỗi xảy ra khi cập nhật trạng thái hàng loạt.');
        }
      },
    });
  };

  const getActionMenuItems = (record: Supplier): MenuProps['items'] => [
    {
      key: 'view',
      label: 'Xem chi tiết & Lịch sử',
      icon: <ExternalLink size={14} />,
      onClick: () => handleOpenDetail(record),
    },
    {
      key: 'edit',
      label: 'Chỉnh sửa thông tin',
      icon: <Pencil size={14} />,
      onClick: () => handleOpenEdit(record),
    },
    {
      key: 'toggle',
      label: record.status === 'ACTIVE' ? 'Chuyển Ngừng giao dịch' : 'Kích hoạt giao dịch',
      icon: <Repeat size={14} />,
      onClick: () => handleToggleStatus(record.partnerId),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Xóa nhà cung cấp',
      icon: <Trash2 size={14} className="text-rose-600" />,
      danger: true,
      onClick: () => handleDelete(record),
    },
  ];

  return (
    <div className="flex-1 w-full flex flex-col text-[#262626] bg-[#f7f9fa]">
      <div className="flex-1 flex min-h-[calc(100vh-104px)]">
        {/* ── Desktop Left Sidebar (260px) ── */}
        <div className="hidden lg:flex relative shrink-0">
          <SupplierFilterSidebar
            state={filterState}
            selectedLocation={selectedLocation}
            warehousesList={warehousesList}
            onChange={handleFilterChange}
            onLocationChange={(loc) => {
              setSelectedLocation(loc);
              setPage(1);
            }}
            onResetFilters={handleResetFilters}
            isCollapsed={sidebarCollapsed}
          />
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className={`absolute z-30 flex items-center justify-center cursor-pointer transition-all duration-200 shadow-md ${
              sidebarCollapsed
                ? 'left-0 top-1/2 -translate-y-1/2 h-16 w-5 bg-white border border-l-0 border-slate-300 rounded-r-md text-slate-500 hover:text-[#0071BA] hover:bg-blue-50/80 hover:w-6'
                : 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-slate-300 bg-white text-slate-500 hover:border-[#0071BA] hover:text-[#0071BA]'
            }`}
            title={sidebarCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* ── Mobile Filter Drawer ── */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-black/40 backdrop-blur-sm">
            <div className="relative w-[280px] max-w-[85vw] bg-white h-full overflow-y-auto">
              <SupplierFilterSidebar
                state={filterState}
                selectedLocation={selectedLocation}
                warehousesList={warehousesList}
                onChange={handleFilterChange}
                onLocationChange={(loc) => {
                  setSelectedLocation(loc);
                  setPage(1);
                }}
                onResetFilters={handleResetFilters}
              />
            </div>
            <div className="flex-1 h-full" onClick={() => setMobileFilterOpen(false)} />
          </div>
        )}

        {/* ── Main Content Area ── */}
        <main className="min-w-0 flex-1 flex flex-col bg-white">
          {/* Action Toolbar */}
          <div className="border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="flex items-center gap-2 flex-1 max-w-[480px]">
                {/* Desktop Toggle Button when collapsed */}
                {sidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => setSidebarCollapsed(false)}
                    className="hidden lg:flex h-9 px-3 rounded-[6px] border border-blue-200 bg-blue-50/60 text-sm font-semibold text-[#0071BA] hover:bg-blue-100/70 items-center gap-1.5 shrink-0 shadow-xs transition cursor-pointer"
                    title="Mở bảng bộ lọc"
                  >
                    <Filter size={15} />
                    <span>Bộ lọc</span>
                    <ChevronRight size={14} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden h-9 px-3 rounded-[6px] border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
                >
                  <Filter size={15} />
                  <span>Bộ lọc</span>
                </button>

                <div className="relative flex-1">
                  <div className="h-9 px-3 bg-white border border-slate-300 rounded-[6px] flex items-center justify-between gap-2 transition hover:border-slate-400 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 shadow-xs">
                    <Search size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={filterState.search}
                      placeholder="Tìm theo mã, tên NCC, điện thoại, email..."
                      onChange={(e) => {
                        handleFilterChange({ search: e.target.value });
                      }}
                      className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                    {filterState.search && (
                      <button
                        type="button"
                        onClick={() => handleFilterChange({ search: '' })}
                        className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="h-9 px-4 rounded-[6px] bg-[#0071BA] hover:bg-[#005f9d] text-sm font-semibold text-white flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Nhà cung cấp</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  title="Xuất danh sách ra file Excel (.xlsx)"
                  className="h-9 px-3.5 rounded-[6px] border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-400 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileSpreadsheet size={16} className="text-emerald-600" />
                  <span className="hidden sm:inline">Xuất Excel</span>
                </button>

                <button
                  type="button"
                  onClick={loadSuppliers}
                  title="Làm mới dữ liệu"
                  className="h-9 w-9 flex items-center justify-center rounded-[6px] border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer"
                >
                  <RefreshCcw size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="p-5 flex-1 flex flex-col bg-[#f8fafc]">
            {/* Header stats bar */}
            <div className="mb-2.5 flex items-center justify-between text-xs sm:text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span>
                  Danh sách Nhà cung cấp (
                  <strong className="text-slate-900">{filteredSuppliers.length}</strong> đối tác)
                </span>
                {selectedWarehouse && (
                  <span className="text-xs bg-blue-50 text-[#0071BA] border border-blue-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <span>Kho: {selectedWarehouse.name}</span>
                    <button
                      type="button"
                      onClick={() => handleFilterChange({ warehouseId: 'ALL' })}
                      className="hover:text-red-500 ml-0.5"
                      title="Bỏ lọc kho"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span>{selectedWarehouse ? `Tổng nợ phát sinh tại ${selectedWarehouse.name}:` : 'Tổng nợ cần trả NCC:'}</span>
                <span
                  className={`font-mono font-bold ${
                    totalPayableDebt > 0 ? 'text-rose-600' : 'text-slate-800'
                  }`}
                >
                  {currencyFormatter.format(totalPayableDebt)} đ
                </span>
              </div>
            </div>

            {/* Custom ERP Data Table */}
            <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-800 border-collapse">
                  <thead className="bg-[#fafafa] border-b border-[#e5e7eb] text-xs font-semibold text-slate-500 select-none">
                    <tr>
                      <th className="w-10 px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          className="accent-[#0071BA] cursor-pointer"
                          checked={
                            selectedRowKeys.length === pagedItems.length && pagedItems.length > 0
                          }
                          onChange={(e) =>
                            setSelectedRowKeys(e.target.checked ? pagedItems.map((r) => r.id) : [])
                          }
                        />
                      </th>
                      <th className="w-32 px-3 py-2.5 font-semibold text-[#0071BA]">Mã NCC</th>
                      <th className="px-3 py-2.5 min-w-[200px]">Tên nhà cung cấp</th>
                      <th className="w-32 px-3 py-2.5">Số điện thoại</th>
                      <th className="w-44 px-3 py-2.5">Email</th>
                      <th className="px-3 py-2.5 min-w-[180px]">Địa chỉ</th>
                      <th className="w-32 px-3 py-2.5 text-right">Hạn mức nợ</th>
                      <th className="w-40 px-3 py-2.5 text-right font-semibold">
                        {selectedWarehouse ? `Nợ tại ${selectedWarehouse.code}` : 'Nợ cần trả'}
                      </th>
                      <th className="w-36 px-3 py-2.5 text-center">Trạng thái</th>
                      <th className="w-16 px-3 py-2.5 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="py-20 text-center text-sm text-slate-400">
                          Đang tải dữ liệu nhà cung cấp...
                        </td>
                      </tr>
                    ) : pagedItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-20 text-center text-sm text-slate-400">
                          Không tìm thấy nhà cung cấp nào phù hợp với bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      pagedItems.map((sup) => {
                        const isSelected = selectedRowKeys.includes(sup.id);
                        return (
                          <tr
                            key={sup.id}
                            className={`hover:bg-blue-50/40 transition cursor-pointer ${
                              isSelected ? 'bg-blue-50/60' : ''
                            }`}
                            onClick={() => handleOpenDetail(sup)}
                          >
                            <td
                              className="px-3 py-3 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="checkbox"
                                className="accent-[#0071BA] cursor-pointer"
                                checked={isSelected}
                                onChange={(e) => {
                                  setSelectedRowKeys((prev) =>
                                    e.target.checked
                                      ? [...prev, sup.id]
                                      : prev.filter((k) => k !== sup.id)
                                  );
                                }}
                              />
                            </td>
                            <td className="px-3 py-3 font-mono text-xs font-semibold text-[#0071BA]">
                              <span className="hover:underline">{sup.code}</span>
                            </td>
                            <td className="px-3 py-3 font-medium text-slate-900">{sup.name}</td>
                            <td className="px-3 py-3 text-xs text-slate-600">
                              {sup.phone || '—'}
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-500">
                              {sup.email || '—'}
                            </td>
                            <td className="px-3 py-3 text-xs text-slate-600 truncate max-w-xs">
                              {sup.address || '—'}
                            </td>
                            <td className="px-3 py-3 text-right font-mono text-xs text-slate-700">
                              {currencyFormatter.format(sup.creditLimit || 0)} đ
                            </td>
                            <td
                              className={`px-3 py-3 text-right font-mono text-xs font-bold ${
                                ((selectedWarehouse && sup.branchPayable !== undefined ? sup.branchPayable : sup.currentPayable) || 0) > 0 ? 'text-rose-600' : 'text-slate-800'
                              }`}
                            >
                              <div>
                                {currencyFormatter.format(
                                  (selectedWarehouse && sup.branchPayable !== undefined ? sup.branchPayable : sup.currentPayable) || 0
                                )}{' '}
                                đ
                              </div>
                              {selectedWarehouse && (
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {sup.branchReceiptsCount !== undefined ? `${sup.branchReceiptsCount} phiếu • ` : ''}Tổng: {currencyFormatter.format(sup.currentPayable || 0)} đ
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <Tag color={sup.status === 'ACTIVE' ? 'success' : 'default'}>
                                {sup.status === 'ACTIVE' ? 'Đang giao dịch' : 'Ngừng giao dịch'}
                              </Tag>
                            </td>
                            <td
                              className="px-3 py-3 text-center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Dropdown
                                menu={{ items: getActionMenuItems(sup) }}
                                trigger={['click']}
                                placement="bottomRight"
                              >
                                <button
                                  type="button"
                                  className="h-8 w-8 rounded flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                                >
                                  <MoreVertical size={16} />
                                </button>
                              </Dropdown>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Table Footer with Pagination */}
              {filteredSuppliers.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e5e7eb] bg-[#fafafa] px-4 py-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span>
                      Hiển thị <strong>{rangeStart}</strong> - <strong>{rangeEnd}</strong> trên tổng
                      số <strong>{filteredSuppliers.length}</strong> NCC
                    </span>
                    <span className="text-slate-300">|</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="rounded border border-slate-300 bg-white px-2 py-1 outline-none text-xs"
                    >
                      <option value={10}>10 dòng/trang</option>
                      <option value={20}>20 dòng/trang</option>
                      <option value={50}>50 dòng/trang</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                    >
                      <ChevronLeft size={14} />
                    </button>

                    {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPage(num)}
                        className={`h-7 w-7 rounded text-xs font-medium cursor-pointer transition ${
                          page === num
                            ? 'bg-[#0071BA] text-white shadow-xs'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={page >= pageCount}
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Floating Bulk Action Bar (Thanh tác vụ hàng loạt nổi) ── */}
      {selectedRowKeys.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 bg-slate-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-700 text-xs sm:text-sm font-medium">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0071BA] text-[11px] font-bold text-white">
              {selectedRowKeys.length}
            </span>
            <span>
              Đã chọn <strong className="text-white">{selectedRowKeys.length}</strong> NCC
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white shadow-xs cursor-pointer transition"
              title="Xuất file Excel (.xlsx) cho các nhà cung cấp đã chọn"
            >
              <FileSpreadsheet size={14} />
              <span>Xuất Excel ({selectedRowKeys.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkChangeStatus('INACTIVE')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/90 hover:bg-amber-600 text-xs font-semibold text-white shadow-xs cursor-pointer transition"
              title="Chuyển các nhà cung cấp đã chọn sang Ngừng giao dịch"
            >
              <PowerOff size={13} />
              <span>Ngừng giao dịch</span>
            </button>

            <button
              type="button"
              onClick={() => handleBulkChangeStatus('ACTIVE')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-xs cursor-pointer transition"
              title="Kích hoạt lại các nhà cung cấp đã chọn"
            >
              <CheckCircle2 size={13} />
              <span>Kích hoạt lại</span>
            </button>
          </div>

          <div className="pl-2 border-l border-slate-700">
            <button
              type="button"
              onClick={() => setSelectedRowKeys([])}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-1.5 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
              title="Bỏ chọn tất cả"
            >
              <X size={13} />
              <span className="hidden sm:inline">Bỏ chọn</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Modal Thêm / Cập nhật NCC ── */}
      {isModalOpen && (
        <SupplierFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={loadSuppliers}
          supplier={editingSupplier}
          onSaveCreate={supplierService.createSupplier}
          onSaveUpdate={supplierService.updateSupplier}
        />
      )}

      {/* ── Drawer Master-Detail Xem chi tiết & Lịch sử phiếu nhập ── */}
      <SupplierDetailDrawer
        supplierId={drawerSupplierId}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onEdit={handleOpenEdit}
        onToggleStatus={handleToggleStatus}
      />
    </div>
  );
}
