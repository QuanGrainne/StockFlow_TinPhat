// src/app/(dashboard)/customers/CustomersClient.tsx
// Màn hình Quản lý khách hàng (Đã loại bỏ: Loại KH, Phân nhóm, MST, Ghi chú)

'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Tag, message, Modal } from 'antd';
import {
  Search,
  Plus,
  RefreshCw,
  Upload,
  Download,
  SlidersHorizontal,
  X,
  MessageSquare,
  Ban,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pencil,
  Eye,
} from 'lucide-react';

import { Customer, CustomerFilterState, CustomerStats, CustomerDetail } from '@/features/customers/types';
import { customerService } from '@/features/customers/services/customerService';
import { exportCustomersToXLSX } from '@/features/customers/utils/exportExcel';
import { CustomerStatsCards } from '@/features/customers/components/CustomerStatsCards';
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal';
import { CustomerDetailDrawer } from '@/features/customers/components/CustomerDetailDrawer';
import { CustomerAdvancedFilterModal } from '@/features/customers/components/CustomerAdvancedFilterModal';

const currencyFormatter = new Intl.NumberFormat('vi-VN');

interface CustomersClientProps {
  onNavigate?: (screenId: string) => void;
}

export default function CustomersClient({ onNavigate }: CustomersClientProps = {}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    newThisMonth: 0,
    activeCustomers: 0,
    activePercentage: 0,
    inactiveCustomers: 0,
    totalDebt: 0,
    debtCustomersCount: 0,
    overdueCount: 0,
    totalCreditLimit: 0,
    creditUsagePercent: 0,
  });

  // Filter States (Đã bỏ group & customerType)
  const [filterState, setFilterState] = useState<CustomerFilterState>({
    search: '',
    debtStatus: 'ALL',
    status: 'ACTIVE',
  });

  // Selection & Pagination
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Modals & Drawers
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<CustomerDetail | Customer | null>(null);
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Shortcut F3 để focus ô tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tải dữ liệu từ backend service
  const loadData = async () => {
    setLoading(true);
    try {
      const [res, statsData] = await Promise.all([
        customerService.getCustomers(filterState),
        customerService.getCustomerStats(),
      ]);
      setCustomers(res.items);
      setTotalCount(res.total);
      setStats(statsData);
      setCurrentPage(1);
    } catch (e: any) {
      console.error(e);
      message.error(e?.message || 'Không thể tải dữ liệu khách hàng từ máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterState]);

  // Xóa lọc
  const handleResetFilters = () => {
    setFilterState({
      search: '',
      debtStatus: 'ALL',
      status: 'ALL',
    });
  };

  // Chọn tất cả dòng hiển thị
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRowKeys(customers.map((c) => c.id));
    } else {
      setSelectedRowKeys([]);
    }
  };

  // Chọn từng dòng
  const handleSelectRow = (id: number) => {
    setSelectedRowKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  // Mở modal thêm mới
  const handleAddNew = () => {
    setEditingCustomer(null);
    setFormModalOpen(true);
  };

  // Mở modal sửa
  const handleEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormModalOpen(true);
  };

  // Mở Drawer xem chi tiết (kèm lấy lịch sử đơn hàng từ backend)
  const handleOpenDetail = async (cust: Customer) => {
    setDetailCustomer(cust);
    try {
      const detail = await customerService.getCustomerById(cust.id);
      setDetailCustomer(detail);
    } catch (err) {
      console.warn('Không thể tải chi tiết đơn hàng:', err);
    }
  };

  // Lưu thành công
  const handleFormSuccess = async (saved: Customer) => {
    if (editingCustomer) {
      await customerService.updateCustomer(saved.id, saved);
      message.success('Cập nhật khách hàng thành công!');
    } else {
      await customerService.createCustomer(saved);
      message.success('Thêm mới khách hàng thành công!');
    }
    setFormModalOpen(false);
    await loadData();
  };

  // Xuất Excel
  const handleExportAll = () => {
    exportCustomersToXLSX(customers, 'Danh_sach_khach_hang_TinPhat.xlsx');
    message.success('Đã xuất file Excel thành công!');
  };

  // Xuất đã chọn
  const handleExportSelected = () => {
    const selected = customers.filter((c) => selectedRowKeys.includes(c.id));
    if (selected.length === 0) {
      message.warning('Vui lòng tick chọn ít nhất 1 khách hàng.');
      return;
    }
    exportCustomersToXLSX(selected, `Khach_hang_da_chon_${selected.length}.xlsx`);
    message.success(`Đã xuất ${selected.length} khách hàng được chọn.`);
  };

  // Khóa / Kích hoạt hàng loạt
  const handleBatchDeactivate = () => {
    Modal.confirm({
      title: 'Xác nhận ngừng kích hoạt',
      content: `Bạn có chắc muốn tạm dừng kích hoạt ${selectedRowKeys.length} khách hàng đã chọn?`,
      okText: 'Xác nhận ngừng',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await customerService.toggleBatchStatus(selectedRowKeys, 'INACTIVE');
          message.success('Đã cập nhật trạng thái ngừng hoạt động.');
          setSelectedRowKeys([]);
          loadData();
        } catch (e: any) {
          message.error(e?.message || 'Có lỗi khi cập nhật trạng thái.');
        }
      },
    });
  };

  // Gửi tin nhắn SMS
  const handleBatchMessage = () => {
    message.info(`Chuẩn bị gửi thông báo SMS đến ${selectedRowKeys.length} khách hàng.`);
  };

  // Nhập Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      message.loading('Đang xử lý nhập dữ liệu từ file Excel...');
      setTimeout(() => {
        message.success(`Đã nhận file: ${file.name}`);
        loadData();
      }, 1000);
    }
  };

  // Client-side pagination slices
  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return customers.slice(start, start + pageSize);
  }, [customers, currentPage, pageSize]);

  return (
    <div className="flex-1 flex flex-col bg-[#F8FAFC] min-h-0 overflow-y-auto select-none p-5 lg:p-6 font-sans">
      {/* ─── 1. Page Header (Tiêu đề + Bộ nút thao tác chính) ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Quản lý khách hàng
          </h1>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1E56A0] border border-blue-100">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1E56A0]" />
            Tổng: {stats.totalCustomers.toLocaleString('vi-VN')} khách hàng
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={loadData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Tải lại
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Upload size={13} />
            Nhập Excel
          </button>

          <button
            onClick={handleExportAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Download size={13} />
            Xuất Excel
          </button>

          <button
            onClick={handleAddNew}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#0F60B6] hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus size={14} className="stroke-[2.5]" />
            Thêm mới khách hàng
          </button>
        </div>
      </div>

      {/* ─── 2. KPI Stat Cards (4 thẻ chỉ số theo thiết kế) ─── */}
      <CustomerStatsCards stats={stats} loading={loading} />

      {/* ─── 3. Filter Bar (Thanh tìm kiếm & dropdowns bộ lọc) ─── */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input với F3 badge */}
            <div className="relative w-full sm:w-80">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm theo Mã KH, Tên, Số điện thoại, Địa chỉ... (F3)"
                value={filterState.search}
                onChange={(e) =>
                  setFilterState((prev) => ({ ...prev, search: e.target.value }))
                }
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E56A0] transition-all"
              />
              {filterState.search && (
                <button
                  onClick={() => setFilterState((prev) => ({ ...prev, search: '' }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Dropdown: Tình trạng công nợ */}
            <select
              value={filterState.debtStatus}
              onChange={(e) =>
                setFilterState((prev) => ({ ...prev, debtStatus: e.target.value as any }))
              }
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-[#1E56A0] cursor-pointer"
            >
              <option value="ALL">Công nợ: Tất cả</option>
              <option value="HAS_DEBT">Có dư nợ</option>
              <option value="NO_DEBT">Không có nợ</option>
              <option value="OVER_LIMIT">Vượt hạn mức</option>
            </select>

            {/* Dropdown: Trạng thái hoạt động */}
            <select
              value={filterState.status}
              onChange={(e) =>
                setFilterState((prev) => ({ ...prev, status: e.target.value }))
              }
              className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:border-[#1E56A0] cursor-pointer"
            >
              <option value="ALL">Trạng thái: Tất cả</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="INACTIVE">Tạm khóa / Ngừng GD</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <X size={13} />
              Xóa lọc
            </button>

            <button
              onClick={() => setAdvancedFilterOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <SlidersHorizontal size={13} />
              Lọc nâng cao
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4. Batch Actions Bar (Thanh hành động khi tick chọn hàng) ─── */}
      {selectedRowKeys.length > 0 && (
        <div className="bg-[#EBF4FF] border border-blue-200 rounded-xl px-4 py-2 mb-3 flex items-center justify-between shadow-2xs animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-[#1E56A0]">
              Đã chọn: {selectedRowKeys.length} khách hàng
            </span>
            <div className="h-4 w-px bg-blue-200" />

            <button
              onClick={handleBatchMessage}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs cursor-pointer"
            >
              <MessageSquare size={13} className="text-[#1E56A0]" />
              Gửi tin nhắn SMS
            </button>

            <button
              onClick={handleExportSelected}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium shadow-2xs cursor-pointer"
            >
              <Download size={13} />
              Xuất đã chọn
            </button>

            <button
              onClick={handleBatchDeactivate}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-medium shadow-2xs cursor-pointer"
            >
              <Ban size={13} />
              Ngừng kích hoạt
            </button>
          </div>

          <button
            onClick={() => setSelectedRowKeys([])}
            className="text-xs text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
          >
            ✕ Bỏ chọn
          </button>
        </div>
      )}

      {/* ─── 5. Data Table (Bảng danh sách khách hàng tinh gọn) ─── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      customers.length > 0 &&
                      selectedRowKeys.length === customers.length
                    }
                    onChange={handleSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-28">MÃ KH ⇅</th>
                <th className="py-3 px-4 min-w-[240px]">TÊN KHÁCH HÀNG ↑</th>
                <th className="py-3 px-4 w-32">SỐ ĐIỆN THOẠI</th>
                <th className="py-3 px-4 min-w-[180px]">EMAIL</th>
                <th className="py-3 px-4 min-w-[220px]">ĐỊA CHỈ</th>
                <th className="py-3 px-4 w-32 text-right">CÔNG NỢ (VNĐ)</th>
                <th className="py-3 px-3.5 w-20 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw size={16} className="animate-spin text-[#1E56A0]" />
                      Đang tải danh sách khách hàng...
                    </div>
                  </td>
                </tr>
              ) : paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    Không tìm thấy khách hàng nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust) => {
                  const isSelected = selectedRowKeys.includes(cust.id);
                  return (
                    <tr
                      key={cust.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(cust.id)}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Mã KH */}
                      <td className="py-3 px-3">
                        <button
                          onClick={() => handleOpenDetail(cust)}
                          className="font-mono font-bold text-[#1E56A0] hover:underline cursor-pointer"
                        >
                          {cust.code}
                        </button>
                      </td>

                      {/* Tên khách hàng */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            onClick={() => handleOpenDetail(cust)}
                            className="font-semibold text-slate-900 hover:text-[#1E56A0] cursor-pointer"
                          >
                            {cust.name}
                          </span>
                          {cust.isOverCreditLimit && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 whitespace-nowrap">
                              Vượt hạn mức
                            </span>
                          )}
                          {cust.status === 'INACTIVE' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 whitespace-nowrap">
                              Tạm dừng
                            </span>
                          )}
                        </div>
                        {cust.subtext && (
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {cust.subtext}
                          </div>
                        )}
                      </td>

                      {/* Số điện thoại */}
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {cust.phone || '—'}
                      </td>

                      {/* Email */}
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[200px]" title={cust.email}>
                        {cust.email || '—'}
                      </td>

                      {/* Địa chỉ */}
                      <td className="py-3 px-4 text-slate-600 truncate max-w-[240px]" title={cust.address}>
                        {cust.address || '—'}
                      </td>

                      {/* Công nợ */}
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`font-mono font-bold ${
                            cust.currentDebt > 0 ? 'text-[#D32F2F]' : 'text-slate-400'
                          }`}
                        >
                          {cust.currentDebt > 0
                            ? currencyFormatter.format(cust.currentDebt)
                            : '0'}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3 px-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            title="Xem chi tiết hồ sơ"
                            onClick={() => handleOpenDetail(cust)}
                            className="p-1 rounded text-slate-400 hover:text-[#1E56A0] hover:bg-slate-100 cursor-pointer"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            title="Chỉnh sửa thông tin"
                            onClick={() => handleEdit(cust)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 cursor-pointer"
                          >
                            <Pencil size={14} />
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

        {/* ─── 6. Pagination Footer ─── */}
        <div className="border-t border-slate-200 px-4 py-3 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Hiển thị{' '}
            <span className="font-semibold text-slate-800">
              {customers.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} -{' '}
              {Math.min(currentPage * pageSize, customers.length)}
            </span>{' '}
            trong tổng số{' '}
            <span className="font-semibold text-slate-800">
              {customers.length.toLocaleString('vi-VN')}
            </span>{' '}
            khách hàng
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span>Số dòng:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-slate-200 rounded px-2 py-1 text-xs bg-white text-slate-700 cursor-pointer"
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
                <option value={100}>100 / trang</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Trang đầu"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Trang trước"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce<(number | string)[]>((acc, p, idx, arr) => {
                  if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) {
                    acc.push('...');
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  typeof p === 'string' ? (
                    <span key={`dots-${idx}`} className="px-1 text-slate-400">
                      ...
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded text-xs font-semibold cursor-pointer ${
                        currentPage === p
                          ? 'bg-[#0F60B6] text-white'
                          : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Trang sau"
              >
                <ChevronRight size={14} />
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                title="Trang cuối"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 7. Modal Form (Thêm mới / Sửa) ─── */}
      <CustomerFormModal
        open={formModalOpen}
        customer={editingCustomer}
        onCancel={() => setFormModalOpen(false)}
        onSuccess={handleFormSuccess}
      />

      {/* ─── 8. Drawer Chi Tiết Khách Hàng ─── */}
      <CustomerDetailDrawer
        open={Boolean(detailCustomer)}
        customer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
        onEdit={(cust) => {
          setDetailCustomer(null);
          handleEdit(cust);
        }}
      />

      {/* ─── 9. Modal Lọc Nâng Cao ─── */}
      <CustomerAdvancedFilterModal
        open={advancedFilterOpen}
        onCancel={() => setAdvancedFilterOpen(false)}
        onApply={() => {
          message.success('Đã áp dụng bộ lọc nâng cao.');
        }}
        onReset={handleResetFilters}
      />
    </div>
  );
}
