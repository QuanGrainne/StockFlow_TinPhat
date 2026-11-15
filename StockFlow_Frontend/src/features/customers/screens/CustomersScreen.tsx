// src/features/customers/screens/CustomersScreen.tsx
// Danh sách Khách hàng — cùng bố cục với màn Nhà cung cấp / Chuyển hàng:
// Header 48px (tiêu đề + tìm kiếm + nút) → [Sidebar bộ lọc | Bảng có dòng tổng + dòng chi tiết mở rộng] → footer phân trang.

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { message } from 'antd';
import { ChevronLeft, ChevronRight, CircleAlert, FileDown, Inbox, Lock, Plus, RefreshCw, Search, Settings, SlidersHorizontal, Unlock, X } from 'lucide-react';
import CustomerFilterSidebar from '@/features/customers/components/CustomerFilterSidebar';
import CustomerExpandedRow from '@/features/customers/components/CustomerExpandedRow';
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal';
import { DebtWarningSettingsModal } from '@/features/customers/components/DebtWarningSettingsModal';
import { CreditLimitAdjustModal } from '@/features/customers/components/CreditLimitAdjustModal';
import { permissionService } from '@/features/admin/services/permissionService';
import { getStoredRole } from '@/lib/navigation/currentRole';
import { customerService } from '@/features/customers/services/customerService';
import { exportCustomersToXLSX } from '@/features/customers/utils/exportExcel';
import { useAuthorizedWarehouses } from '@/lib/warehouse/useActiveWarehouse';
import type { BatchCreditLimitResult, CreateCustomerPayload, Customer, CustomerDetail, CustomerFilterState } from '@/features/customers/types';
import { readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';

const money = new Intl.NumberFormat('vi-VN');
const COLUMN_COUNT = 8;
const thCls = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';

const DEFAULT_FILTER: CustomerFilterState = {
  search: '',
  status: 'ACTIVE',
  createdWarehouseIds: [],
  createdTimeRange: 'all_time',
  createdFrom: '',
  createdTo: '',
  gender: 'ALL',
  minSales: '',
  maxSales: '',
  salesTimeRange: 'all_time',
  salesFrom: '',
  salesTo: '',
  minDebt: '',
  maxDebt: '',
};

interface CustomersScreenProps {
  /** Điều hướng màn hình trong AppLayout (giữ tương thích, màn này chưa dùng) */
  onNavigate?: (screenId: string) => void;
}

export default function CustomersScreen({ }: CustomersScreenProps = {}) {
  // Link mở thẳng 1 khách hàng (?code=KH...&id=..., VD từ hóa đơn)
  const searchParams = useSearchParams();
  const [custLink] = useState(() => readDocumentLink(searchParams));

  const [filter, setFilter] = useState<CustomerFilterState>(() =>
    custLink ? { ...DEFAULT_FILTER, search: custLink.code, status: 'ALL' } : DEFAULT_FILTER
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Bộ lọc "Chi nhánh tạo" chỉ gồm các kho tài khoản được phân quyền (Admin: tất cả)
  const { warehouses } = useAuthorizedWarehouses();
  const [reloadTick, setReloadTick] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(() => custLink?.id ?? null);
  const [details, setDetails] = useState<Record<number, CustomerDetail>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(() => custLink?.id ?? null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);
  // Thiết lập cảnh báo công nợ: chỉ vai trò được quyền duyệt hạn mức (Manager / Kế toán trưởng / Admin)
  const [debtSettingsOpen, setDebtSettingsOpen] = useState(false);
  const [canSetDebtWarning, setCanSetDebtWarning] = useState(false);
  // Điều chỉnh hạn mức (một / nhiều khách): cùng quyền với thiết lập công nợ
  const [adjustingLimit, setAdjustingLimit] = useState<Customer[] | null>(null);
  useEffect(() => {
    let stale = false;
    permissionService
      .getAllowedFeatures(`ROLE_${getStoredRole()}`)
      .then((feats) => {
        if (!stale) setCanSetDebtWarning(feats.has('feat-credit-approvals'));
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, []);

  // ── Tải danh sách: bộ lọc (trừ từ khóa) gửi lên server; đang tải khi kết quả chưa khớp khóa hiện tại ──
  const { search, ...serverFilter } = filter;
  const requestKey = JSON.stringify({ ...serverFilter, reloadTick });
  const [result, setResult] = useState<{ key: string; items: Customer[] }>({ key: '', items: [] });
  const loading = result.key !== requestKey;
  /** Chỉ hiện vòng tải ở lần đầu; tải lại (sau thanh toán, sửa phiếu...) giữ nguyên bảng để không đóng dòng đang mở */
  const showLoading = loading && result.key === '';

  useEffect(() => {
    let stale = false;
    const params = JSON.parse(requestKey) as Omit<CustomerFilterState, 'search'>;
    customerService
      .getCustomers(params)
      .then((res) => {
        if (!stale) setResult({ key: requestKey, items: res.items });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(err instanceof Error ? err.message : 'Không thể tải danh sách khách hàng.');
        setResult({ key: requestKey, items: [] });
      });
    return () => {
      stale = true;
    };
  }, [requestKey]);

  // Mở thẳng khách theo link: tải chi tiết + cuộn tới dòng
  useEffect(() => {
    const linkedId = custLink?.id;
    if (!linkedId) return;
    let cancelled = false;
    customerService
      .getCustomerById(linkedId)
      .then((d) => {
        if (!cancelled) setDetails((prev) => ({ ...prev, [linkedId]: d }));
      })
      .catch(() => {
        if (!cancelled) message.error('Không thể tải chi tiết khách hàng.');
      })
      .finally(() => {
        if (!cancelled) setLoadingDetailId((cur) => (cur === linkedId ? null : cur));
      });
    const stop = scrollToWhenReady(`[data-doc-row="${linkedId}"]`);
    return () => {
      cancelled = true;
      stop();
    };
  }, [custLink]);

  // Lọc từ khóa phía client: mã, tên, điện thoại 1/2, email, địa chỉ
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const whIds = filter.createdWarehouseIds;
    const byWarehouse =
      whIds.length > 1 ? result.items.filter((c) => c.createdWarehouseId != null && whIds.includes(c.createdWarehouseId)) : result.items;
    if (!q) return byWarehouse;
    return byWarehouse.filter((c) =>
      [c.code, c.name, c.phone, c.phone2, c.email, c.address].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [result.items, search, filter.createdWarehouseIds]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, c) => ({
          debt: acc.debt + (c.currentDebt || 0),
          sales: acc.sales + (c.totalSales || 0),
          net: acc.net + (c.totalSalesNetReturns || 0),
        }),
        { debt: 0, sales: 0, net: 0 }
      ),
    [filtered]
  );

  const changeFilter = (patch: Partial<CustomerFilterState>) => {
    setFilter((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };
  const reload = () => setReloadTick((t) => t + 1);

  const loadDetail = async (id: number) => {
    setLoadingDetailId(id);
    try {
      const d = await customerService.getCustomerById(id);
      setDetails((prev) => ({ ...prev, [id]: d }));
    } catch {
      message.error('Không thể tải chi tiết khách hàng.');
    } finally {
      setLoadingDetailId((cur) => (cur === id ? null : cur));
    }
  };

  const handleRowClick = (c: Customer) => {
    if (expandedId === c.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(c.id);
    if (!details[c.id]) void loadDetail(c.id);
  };

  const handleSave = async (payload: CreateCustomerPayload) => {
    if (editing) {
      await customerService.updateCustomer(editing.id, { ...payload, id: editing.id });
      message.success(`Đã cập nhật khách hàng ${editing.code}`);
      if (expandedId === editing.id) void loadDetail(editing.id);
    } else {
      const created = await customerService.createCustomer(payload);
      message.success(`Đã thêm khách hàng ${created.code}`);
    }
    setFormOpen(false);
    setEditing(null);
    reload();
  };

  const handleToggleStatus = async (c: Customer) => {
    try {
      await customerService.toggleCustomerStatus(c.id);
      message.success(c.status === 'ACTIVE' ? `Đã ngừng hoạt động ${c.code}` : `Đã cho phép hoạt động ${c.code}`);
      reload();
      if (expandedId === c.id) void loadDetail(c.id);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không đổi được trạng thái.');
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await customerService.deleteCustomer(deleting.id);
      message.success(`Đã xóa khách hàng ${deleting.code} (khách đã có giao dịch sẽ chuyển sang Ngừng hoạt động)`);
      setExpandedId(null);
      setDeleting(null);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không xóa được khách hàng.');
    } finally {
      setBusy(false);
    }
  };

  const handleBulkStatus = async (status: 'ACTIVE' | 'INACTIVE') => {
    try {
      await customerService.toggleBatchStatus(selectedIds, status);
      message.success(`Đã cập nhật trạng thái ${selectedIds.length} khách hàng`);
      setSelectedIds([]);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không cập nhật được trạng thái.');
    }
  };

  const handleCreditLimitSaved = (res: BatchCreditLimitResult) => {
    const done = res.updated.length;
    const skipped = res.skipped.length;
    if (done > 0) message.success(`Đã điều chỉnh hạn mức ${done} khách hàng`);
    if (skipped > 0)
      message.warning(
        `${skipped} khách không đổi hạn mức: ` +
          res.skipped
            .slice(0, 3)
            .map((x) => `${x.partnerCode ?? x.partnerId} (${x.reason})`)
            .join('; ') +
          (skipped > 3 ? '...' : ''),
        6
      );
    if (done > 0) {
      setSelectedIds([]);
      res.updated.forEach((u) => {
        if (details[u.partnerId]) void loadDetail(u.partnerId);
      });
      reload();
    }
  };

  const allPageSelected = paged.length > 0 && paged.every((c) => selectedIds.includes(c.id));

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header */}
      <header className="min-h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold text-[#15171a] leading-7 tracking-tight whitespace-nowrap">Khách hàng</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={filter.search}
              onChange={(e) => changeFilter({ search: e.target.value })}
              placeholder="Theo mã, tên, số điện thoại"
              className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
            {filter.search && (
              <button
                type="button"
                onClick={() => changeFilter({ search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] hover:text-[#15171a] cursor-pointer"
                title="Xóa từ khóa"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Khách hàng</span>
          </button>
          <button
            type="button"
            onClick={() => exportCustomersToXLSX(filtered)}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] transition cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
          </button>
          {canSetDebtWarning && (
            <button
              type="button"
              onClick={() => setDebtSettingsOpen(true)}
              title="Thiết lập cảnh báo công nợ khách hàng"
              aria-label="Thiết lập cảnh báo công nợ khách hàng"
              className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] transition cursor-pointer bg-white"
            >
              <Settings size={15} className="text-[#677484]" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Bộ lọc + bảng */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <CustomerFilterSidebar
          state={filter}
          warehousesList={warehouses}
          onChange={changeFilter}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[860px]">
              <thead className="bg-[#f7f8f9] sticky top-0 z-20 border-b border-slate-200 text-[12px] font-semibold text-[#677484] shadow-xs">
                <tr>
                  <th className={`${thCls} w-10 text-center`}>
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={(e) =>
                        setSelectedIds((prev) =>
                          e.target.checked
                            ? Array.from(new Set([...prev, ...paged.map((c) => c.id)]))
                            : prev.filter((id) => !paged.some((c) => c.id === id))
                        )
                      }
                      className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className={thCls}>Mã khách hàng</th>
                  <th className={thCls}>Tên khách hàng</th>
                  <th className={thCls}>Điện thoại</th>
                  <th className={`${thCls} text-right`}>Nợ hiện tại</th>
                  <th className={`${thCls} text-right`}>Tổng bán</th>
                  <th className={`${thCls} text-right`}>Tổng bán trừ trả hàng</th>
                  <th className={`${thCls} text-right`}>Hạn mức nợ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Dòng tổng */}
                {!showLoading && paged.length > 0 && (
                  <tr className="bg-white/75 border-b border-slate-200 font-bold text-[13px]">
                    <td colSpan={4}></td>
                    <td className={`py-2.5 px-3 text-right font-mono ${totals.debt !== 0 ? 'text-[#fb2c36]' : ''}`}>
                      {money.format(totals.debt)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">{money.format(totals.sales)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{money.format(totals.net)}</td>
                    <td></td>
                  </tr>
                )}

                {showLoading ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="py-20 text-center text-[#677484]">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải danh sách khách hàng...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                          <Inbox size={32} className="stroke-[1.5]" />
                        </div>
                        <h3 className="font-bold text-sm mb-1">Không tìm thấy khách hàng</h3>
                        <p className="text-xs text-[#677484] max-w-sm">
                          Chưa có khách hàng phù hợp.{' '}
                          <button
                            type="button"
                            onClick={() => {
                              setFilter(DEFAULT_FILTER);
                              setPage(1);
                            }}
                            className="text-[#0070f4] font-semibold hover:underline cursor-pointer"
                          >
                            Xóa bộ lọc
                          </button>{' '}
                          hoặc bấm <strong>+ Khách hàng</strong> để thêm mới.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((c) => {
                    const isExpanded = expandedId === c.id;
                    const isSelected = selectedIds.includes(c.id);
                    const inactive = c.status === 'INACTIVE';
                    return (
                      <React.Fragment key={c.id}>
                        <tr
                          data-doc-row={c.id}
                          onClick={() => handleRowClick(c)}
                          className={`hover:bg-[#f7f8f9] transition cursor-pointer select-none border-b border-slate-100 ${isExpanded ? 'bg-[#e6f1fe]/80 font-medium' : isSelected ? 'bg-[#e6f1fe]/50' : ''
                            } ${inactive ? 'text-[#677484]' : ''}`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) =>
                                setSelectedIds((prev) => (e.target.checked ? [...prev, c.id] : prev.filter((id) => id !== c.id)))
                              }
                              className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-[#0070f4]">{c.code}</td>
                          <td className="py-2.5 px-3">
                            {c.name}
                            {inactive && (
                              <span className="ml-2 px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#fef2f2] text-[#fb2c36] border border-[#fecaca]">
                                Ngừng hoạt động
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[12px] text-[#677484] whitespace-nowrap">{c.phone || '—'}</td>
                          {/* Nợ chưa về 0 (khách còn nợ, hoặc cửa hàng còn nợ khách — số âm) → đỏ */}
                          <td
                            className={`py-2.5 px-3 text-right font-mono ${(c.currentDebt || 0) !== 0 ? 'text-[#fb2c36] font-semibold' : ''}`}
                            title={
                              (c.currentDebt || 0) > 0
                                ? 'Khách còn nợ cửa hàng'
                                : (c.currentDebt || 0) < 0
                                  ? 'Cửa hàng còn nợ khách (khách trả trước / chưa trả tiền hàng trả)'
                                  : undefined
                            }
                          >
                            <span className="inline-flex items-center justify-end gap-1">
                              {c.debtWarning && (
                                <span title={`Cảnh báo công nợ: ${c.debtWarning}`} className="inline-flex text-[#f59e0b] cursor-help">
                                  <CircleAlert size={13} />
                                </span>
                              )}
                              {money.format(c.currentDebt || 0)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{money.format(c.totalSales || 0)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{money.format(c.totalSalesNetReturns || 0)}</td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono ${c.isOverCreditLimit ? 'text-[#fb2c36] font-semibold' : ''}`}
                            title={c.isOverCreditLimit ? 'Nợ hiện tại vượt hạn mức' : undefined}
                          >
                            {c.creditLimit > 0 ? money.format(c.creditLimit) : <span className="font-sans text-[#677484]">Không cho ghi nợ</span>}
                          </td>
                        </tr>
                        {isExpanded && (
                          <CustomerExpandedRow
                            customer={c}
                            detail={details[c.id]}
                            loading={loadingDetailId === c.id}
                            colSpan={COLUMN_COUNT}
                            onEdit={(cust) => {
                              setEditing(cust);
                              setFormOpen(true);
                            }}
                            onToggleStatus={handleToggleStatus}
                            onDelete={setDeleting}
                            onPaymentCreated={(id, voucherCode) => {
                              message.success(`Đã tạo phiếu thu ${voucherCode}`);
                              void loadDetail(id);
                              reload();
                            }}
                            onDataChanged={(id) => {
                              void loadDetail(id);
                              reload();
                            }}
                            onAdjustCreditLimit={canSetDebtWarning ? (cust) => setAdjustingLimit([cust]) : undefined}
                          />
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer phân trang */}
          <footer className="min-h-10 bg-white/82 backdrop-blur-[2px] border-t border-slate-200 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[12px] text-[#677484] shrink-0">
            <div className="flex items-center gap-3">
              <span>
                Hiển thị{' '}
                <strong className="text-[#15171a]">
                  {filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1} - {Math.min(safePage * pageSize, filtered.length)}
                </strong>{' '}
                trên <strong className="text-[#15171a]">{filtered.length}</strong> khách hàng
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 rounded-[6px] border border-slate-300 bg-white px-1.5 text-[12px] text-[#15171a] focus:outline-none focus:border-[#0070f4] cursor-pointer"
              >
                <option value={15}>15 dòng</option>
                <option value={30}>30 dòng</option>
                <option value={50}>50 dòng</option>
              </select>
            </div>
            {pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-slate-300 bg-white hover:bg-[#f7f8f9] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-2 font-semibold text-[#15171a]">
                  {safePage}/{pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(Math.min(pageCount, safePage + 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-slate-300 bg-white hover:bg-[#f7f8f9] disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </footer>
        </div>
      </div>

      {/* 3. Thao tác hàng loạt */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#15171a] text-white rounded-xl shadow-2xl px-4 py-2.5 flex items-center gap-3 text-[13px]">
          <span>
            <strong>{selectedIds.length}</strong> khách hàng đã chọn
          </span>
          <button
            type="button"
            onClick={() => exportCustomersToXLSX(result.items.filter((c) => selectedIds.includes(c.id)))}
            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-[6px] bg-white/10 hover:bg-white/20 cursor-pointer"
          >
            <FileDown size={13} /> Xuất file
          </button>
          <button
            type="button"
            onClick={() => void handleBulkStatus('INACTIVE')}
            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-[6px] bg-white/10 hover:bg-white/20 cursor-pointer"
          >
            <Lock size={13} /> Ngừng hoạt động
          </button>
          <button
            type="button"
            onClick={() => void handleBulkStatus('ACTIVE')}
            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-[6px] bg-white/10 hover:bg-white/20 cursor-pointer"
          >
            <Unlock size={13} /> Cho phép hoạt động
          </button>
          {canSetDebtWarning && (
            <button
              type="button"
              onClick={() => setAdjustingLimit(result.items.filter((c) => selectedIds.includes(c.id)))}
              className="inline-flex items-center gap-1 px-2.5 h-7 rounded-[6px] bg-white/10 hover:bg-white/20 cursor-pointer"
            >
              <SlidersHorizontal size={13} /> Điều chỉnh hạn mức
            </button>
          )}
          <button type="button" onClick={() => setSelectedIds([])} className="p-1 rounded hover:bg-white/10 cursor-pointer" title="Bỏ chọn">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 4. Form thêm / sửa */}
      <DebtWarningSettingsModal
        open={debtSettingsOpen}
        onClose={() => setDebtSettingsOpen(false)}
        onSaved={() => {
          message.success('Đã lưu thiết lập cảnh báo công nợ');
          setReloadTick((t) => t + 1);
        }}
      />
      <CreditLimitAdjustModal
        open={adjustingLimit !== null && adjustingLimit.length > 0}
        customers={adjustingLimit ?? []}
        onClose={() => setAdjustingLimit(null)}
        onSaved={handleCreditLimitSaved}
      />
      <CustomerFormModal
        open={formOpen}
        customer={editing}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSuccess={handleSave}
      />

      {/* 5. Xác nhận xóa */}
      {deleting && (
        <div
          className="fixed inset-0 z-[1050] bg-slate-900/40 flex items-center justify-center p-4"
          onMouseDown={(e) => e.target === e.currentTarget && !busy && setDeleting(null)}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 text-[13px]">
            <h3 className="text-[16px] font-bold mb-2">Xóa khách hàng</h3>
            <p className="text-[#677484]">
              Xóa khách hàng <strong className="text-[#15171a]">{deleting.name}</strong> ({deleting.code})? Khách đã có hóa đơn hoặc
              còn nợ sẽ được chuyển sang <strong>Ngừng hoạt động</strong> thay vì xóa hẳn.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={busy}
                className="px-4 h-9 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-semibold cursor-pointer"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={busy}
                className="px-4 h-9 rounded-[8px] bg-[#fb2c36] hover:bg-[#e11d26] text-white font-semibold cursor-pointer disabled:opacity-60"
              >
                {busy ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
