'use client';

// Danh sách phiếu Trả hàng nhập (trả hàng cho nhà cung cấp) — bố cục giống màn Nhập hàng (KiotViet)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { DocumentCodeLink, PartnerLink, ProductCodeLink } from '@/components/links/EntityLinks';
import { useRouter, useSearchParams } from 'next/navigation';
import { linkDateFilter, readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import { message } from 'antd';
import { StarFilled, StarOutlined } from '@ant-design/icons';
import {
  AlertTriangle,
  Banknote,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileDown,
  Inbox,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { NumberInput } from '@/components/inputs/NumberInput';
import * as XLSX from 'xlsx';
import PurchaseFilterSidebar from '@/features/purchases/components/PurchaseFilterSidebar';
import type { PurchaseFilterState } from '@/features/purchases/types';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { getDateRangeForPreset } from '@/features/transfers/utils/dateUtils';
import { purchaseReturnService } from '@/features/purchase-returns/services/purchaseReturnService';
import type { PurchaseReturnDetail, PurchaseReturnListRecord } from '@/features/purchase-returns/types';
import { printPurchaseReturn } from '@/features/purchase-returns/utils/printPurchaseReturn';

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/**
 * NCC cần trả (NCC còn nợ mình) = Tổng cộng − NCC đã trả − phần đã trừ vào công nợ phiếu nhập gốc.
 * Phiếu đã hủy không còn phải trả.
 */
function remainingOf(r: { status: string; totalAmount: number; refundAmount: number; offsetAmount?: number }): number {
  if (r.status === 'CANCELLED') return 0;
  return Math.max(0, r.totalAmount - r.refundAmount - (r.offsetAmount ?? 0));
}

function formatDateTimeVN(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function statusTag(status: string) {
  switch (status?.toUpperCase()) {
    case 'COMPLETED':
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]">
          Đã trả hàng
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-[#fffbeb] text-[#d97706] border-[#fde68a]">
          Phiếu tạm
        </span>
      );
    default:
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]">
          Đã hủy
        </span>
      );
  }
}

const STATUS_MAP: Record<string, string> = { draft: 'DRAFT', completed: 'COMPLETED', canceled: 'CANCELLED' };
const FAVORITES_KEY = 'stockflow_purchase_return_favorites';

export default function PurchaseReturnsScreen() {
  const router = useRouter();
  const { activeWarehouse, warehouses } = useActiveWarehouse();

  // Link mở thẳng 1 phiếu (?code=&id=&date=&wh=, VD từ Thẻ kho)
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));

  const [query, setQuery] = useState(() => docLink?.code ?? '');
  const [reloadTick, setReloadTick] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<number[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(() => docLink?.id ?? null);
  // Ô tìm mã hàng / tên hàng trong bảng hàng của phiếu đang mở
  const [itemSearch, setItemSearch] = useState({ code: '', name: '' });
  const matchItemSearch = (it: { productCode: string; productName: string }) =>
    (!itemSearch.code.trim() || it.productCode.toLowerCase().includes(itemSearch.code.trim().toLowerCase())) &&
    (!itemSearch.name.trim() || it.productName.toLowerCase().includes(itemSearch.name.trim().toLowerCase()));
  const [details, setDetails] = useState<Record<number, PurchaseReturnDetail>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [cancelling, setCancelling] = useState<PurchaseReturnListRecord | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'payments'>('info');
  // Nhà cung cấp trả tiền cho phiếu trả (phiếu thu PT...)
  const [refundTarget, setRefundTarget] = useState<PurchaseReturnDetail | null>(null);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [refundNotes, setRefundNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      return raw ? (JSON.parse(raw) as number[]) : [];
    } catch {
      return [];
    }
  });

  const [filterState, setFilterState] = useState<PurchaseFilterState>(() => {
    if (docLink) {
      return {
        statuses: ['draft', 'completed', 'canceled'],
        ...linkDateFilter(docLink.date),
        warehouseIds: docLink.warehouseId ? [docLink.warehouseId] : [],
      };
    }
    const range = getDateRangeForPreset('this_month');
    return {
      statuses: ['draft', 'completed'],
      timeRange: 'this_month',
      dateFrom: range.from,
      dateTo: range.to,
      periodLabel: 'Tháng này',
    };
  });

  // Kho lọc: chọn nhiều kho ở sidebar, mặc định là kho làm việc
  const activeWarehouseId = activeWarehouse?.warehouseId;
  const warehouseIds =
    filterState.warehouseIds !== undefined ? filterState.warehouseIds : activeWarehouseId ? [activeWarehouseId] : [];

  // Khóa truy vấn: đổi bộ lọc (hoặc reloadTick) → tải lại; đang tải khi kết quả chưa khớp khóa hiện tại
  const requestKey = JSON.stringify({
    warehouseIds,
    statuses: filterState.statuses.map((s) => STATUS_MAP[s]).filter(Boolean),
    fromDate: filterState.dateFrom,
    toDate: filterState.dateTo,
    reloadTick,
  });
  const [result, setResult] = useState<{ key: string; data: PurchaseReturnListRecord[] }>({ key: '', data: [] });
  const loading = result.key !== requestKey;
  const records = result.data;

  useEffect(() => {
    let stale = false;
    const params = JSON.parse(requestKey) as {
      warehouseIds: number[];
      statuses: string[];
      fromDate?: string;
      toDate?: string;
    };
    purchaseReturnService
      .getList(params)
      .then((data) => {
        if (!stale) setResult({ key: requestKey, data });
      })
      .catch((err: unknown) => {
        if (stale) return;
        message.error(err instanceof Error ? err.message : 'Không thể tải danh sách trả hàng nhập');
        setResult({ key: requestKey, data: [] });
      });
    return () => {
      stale = true;
    };
  }, [requestKey]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Bỏ chọn hết trạng thái → không hiện phiếu nào (giống Nhập hàng)
    if (filterState.statuses.length === 0) return [];
    if (!q) return records;
    return records.filter(
      (r) =>
        r.returnCode.toLowerCase().includes(q) ||
        (r.grCode ?? '').toLowerCase().includes(q) ||
        r.partnerName.toLowerCase().includes(q) ||
        r.partnerCode.toLowerCase().includes(q)
    );
  }, [records, query, filterState.statuses.length]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize]);

  const totals = useMemo(
    () =>
      filtered
        .filter((r) => r.status !== 'CANCELLED')
        .reduce(
          (acc, r) => ({
            goods: acc.goods + r.totalGoodsAmount,
            discount: acc.discount + r.discountAmount,
            total: acc.total + r.totalAmount,
            refund: acc.refund + r.refundAmount,
            remaining: acc.remaining + remainingOf(r),
          }),
          { goods: 0, discount: 0, total: 0, refund: 0, remaining: 0 }
        ),
    [filtered]
  );

  function toggleFavorite(id: number) {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      } catch {
        // bỏ qua khi trình duyệt chặn localStorage
      }
      return next;
    });
  }

  // Mở thẳng phiếu theo link: tải chi tiết + cuộn tới dòng
  useEffect(() => {
    const linkedId = docLink?.id;
    if (!linkedId) return;
    let cancelled = false;
    purchaseReturnService
      .getById(linkedId)
      .then((detail) => {
        if (!cancelled) setDetails((prev) => ({ ...prev, [linkedId]: detail }));
      })
      .catch(() => {
        if (!cancelled) message.error(`Không thể tải chi tiết phiếu ${docLink.code}`);
      });
    const stopScroll = scrollToWhenReady(`[data-doc-row="${linkedId}"]`);
    return () => {
      cancelled = true;
      stopScroll();
    };
  }, [docLink]);

  async function toggleExpand(record: PurchaseReturnListRecord) {
    if (expandedId === record.purchaseReturnId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(record.purchaseReturnId);
    setDetailTab('info');
    setItemSearch({ code: '', name: '' });
    if (details[record.purchaseReturnId]) return;
    try {
      setLoadingDetailId(record.purchaseReturnId);
      const detail = await purchaseReturnService.getById(record.purchaseReturnId);
      setDetails((prev) => ({ ...prev, [record.purchaseReturnId]: detail }));
    } catch {
      message.error(`Không thể tải chi tiết phiếu ${record.returnCode}`);
    } finally {
      setLoadingDetailId(null);
    }
  }

  async function confirmCancel() {
    if (!cancelling) return;
    try {
      setSubmitting(true);
      await purchaseReturnService.cancel(cancelling.purchaseReturnId);
      message.success(`Đã hủy phiếu trả hàng nhập ${cancelling.returnCode}`);
      setDetails((prev) => {
        const next = { ...prev };
        delete next[cancelling.purchaseReturnId];
        return next;
      });
      setCancelling(null);
      setExpandedId(null);
      setReloadTick((t) => t + 1);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi hủy phiếu trả hàng nhập');
    } finally {
      setSubmitting(false);
    }
  }

  function openRefund(detail: PurchaseReturnDetail) {
    setRefundTarget(detail);
    setRefundAmount(remainingOf(detail));
    setRefundMethod('CASH');
    setRefundNotes('');
  }

  async function confirmRefund() {
    if (!refundTarget) return;
    const remaining = remainingOf(refundTarget);
    if (refundAmount <= 0) {
      message.warning('Vui lòng nhập số tiền nhà cung cấp trả');
      return;
    }
    if (refundAmount > remaining) {
      message.warning(`Số tiền không được vượt quá ${money.format(remaining)}`);
      return;
    }
    try {
      setSubmitting(true);
      const updated = await purchaseReturnService.createRefund(refundTarget.purchaseReturnId, {
        amount: refundAmount,
        paymentMethod: refundMethod,
        notes: refundNotes.trim() || null,
      });
      message.success(`Đã ghi nhận nhà cung cấp trả ${money.format(refundAmount)} cho phiếu ${updated.returnCode}`);
      setDetails((prev) => ({ ...prev, [updated.purchaseReturnId]: updated }));
      setRefundTarget(null);
      setDetailTab('payments');
      setReloadTick((t) => t + 1);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi ghi nhận tiền nhà cung cấp trả');
    } finally {
      setSubmitting(false);
    }
  }

  /** Xuất file Excel 1 phiếu trả hàng nhập: thông tin phiếu + danh sách hàng + tổng tiền */
  function exportReturnDetail(d: PurchaseReturnDetail) {
    const statusLabel = d.status === 'COMPLETED' ? 'Đã trả hàng' : d.status === 'DRAFT' ? 'Phiếu tạm' : 'Đã hủy';
    const aoa: (string | number)[][] = [
      ['TRẢ HÀNG NHẬP'],
      ['Mã phiếu', d.returnCode],
      ['Mã nhập hàng', d.grCode ?? ''],
      ['Thời gian', formatDateTimeVN(d.returnDate)],
      ['Kho trả hàng', d.warehouseName],
      ['Người tạo', d.createdByName],
      ['Nhà cung cấp', `${d.partnerName} (${d.partnerCode})`],
      ['Trạng thái', statusLabel],
      [],
      ['STT', 'Mã hàng', 'Tên hàng', 'ĐVT', 'Số lượng', 'Giá nhập', 'Giá trả lại', 'Thành tiền'],
      ...d.items.map((it, idx) => [idx + 1, it.productCode, it.productName, it.unit, it.quantity, it.importPrice, it.returnPrice, it.totalPrice]),
      [],
      ['Tổng số lượng', d.items.reduce((s, it) => s + it.quantity, 0)],
      ['Tổng tiền hàng trả', d.totalGoodsAmount],
      ['Giảm giá', d.discountAmount],
      ['Tổng cộng', d.totalAmount],
      ['NCC đã trả', d.refundAmount],
      ['Trừ vào công nợ phiếu nhập', d.offsetAmount ?? 0],
      ['NCC cần trả', remainingOf(d)],
      ['Ghi chú', d.notes ?? ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 18 }, { wch: 16 }, { wch: 36 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 16 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, d.returnCode.slice(0, 31));
    XLSX.writeFile(wb, `TraHangNhap_${d.returnCode}.xlsx`);
  }

  function exportExcel() {
    const rows = filtered.map((r) => ({
      'Mã trả hàng nhập': r.returnCode,
      'Thời gian': formatDateTimeVN(r.returnDate),
      'Phiếu nhập': r.grCode ?? '',
      'Mã NCC': r.partnerCode,
      'Nhà cung cấp': r.partnerName,
      'Kho': r.warehouseName,
      'Tổng tiền hàng': r.totalGoodsAmount,
      'Giảm giá': r.discountAmount,
      'Tổng cộng': r.totalAmount,
      'NCC đã trả': r.refundAmount,
      'NCC cần trả': remainingOf(r),
      'Trạng thái': r.status === 'COMPLETED' ? 'Đã trả hàng' : r.status === 'DRAFT' ? 'Phiếu tạm' : 'Đã hủy',
      'Người tạo': r.createdByName,
      'Ghi chú': r.notes ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TraHangNhap');
    XLSX.writeFile(wb, `DanhSachTraHangNhap_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setExportOpen(false);
  }

  const th = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200';

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f5f5f5] overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header */}
      <header className="min-h-12 bg-white border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold leading-7 tracking-tight whitespace-nowrap">Trả hàng nhập</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Theo mã phiếu trả, mã phiếu nhập, NCC..."
              className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/purchase-returns/create"
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Trả hàng nhập</span>
          </Link>
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] bg-white cursor-pointer"
            >
              <FileDown size={14} className="text-[#677484]" />
              <span>Xuất file</span>
              <span className="text-[10px]">▾</span>
            </button>
            {exportOpen && (
              <div className="absolute top-full right-0 mt-1.5 w-44 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-40">
                <button
                  type="button"
                  onClick={exportExcel}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-[#f7f8f9] cursor-pointer"
                >
                  File tổng quan
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Sidebar lọc + bảng */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="relative shrink-0 h-full flex">
          <PurchaseFilterSidebar
            state={filterState}
            onChange={(patch) => {
              setFilterState((prev) => ({ ...prev, ...patch }));
              setPage(1);
            }}
            isCollapsed={sidebarCollapsed}
            warehouses={warehouses}
            activeWarehouse={activeWarehouse}
            statusLabels={{ completed: 'Đã trả hàng' }}
            hideSupplierFilter
          />
          <button
            type="button"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#0070f4] text-[#0070f4] hover:bg-[#e6f1fe] shadow-xs flex items-center justify-center cursor-pointer z-30"
            title={sidebarCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
          >
            {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className={`${th} w-10 text-center`}>
                    <input
                      type="checkbox"
                      checked={paged.length > 0 && selectedKeys.length === paged.length}
                      onChange={(e) => setSelectedKeys(e.target.checked ? paged.map((r) => r.purchaseReturnId) : [])}
                      className="rounded h-3.5 w-3.5 border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className={`${th} w-8 text-center`}>
                    <Star size={13} className="text-[#677484] mx-auto" />
                  </th>
                  <th className={th}>Mã trả hàng nhập</th>
                  <th className={th}>Thời gian</th>
                  <th className={th}>Nhà cung cấp</th>
                  <th className={`${th} text-right`}>Tổng tiền hàng</th>
                  <th className={`${th} text-right`}>Giảm giá</th>
                  <th className={`${th} text-right`}>Tổng cộng</th>
                  <th className={`${th} text-right`}>NCC đã trả</th>
                  <th className={`${th} text-right`}>NCC cần trả</th>
                  <th className={`${th} text-center`}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!loading && filtered.length > 0 && (
                  <tr className="bg-white font-bold text-[13px]">
                    <td colSpan={5} />
                    <td className="py-2.5 px-3 text-right">{money.format(totals.goods)}</td>
                    <td className="py-2.5 px-3 text-right">{money.format(totals.discount)}</td>
                    <td className="py-2.5 px-3 text-right">{money.format(totals.total)}</td>
                    <td className="py-2.5 px-3 text-right">{money.format(totals.refund)}</td>
                    <td className="py-2.5 px-3 text-right text-rose-600">{money.format(totals.remaining)}</td>
                    <td />
                  </tr>
                )}

                {loading ? (
                  <tr>
                    <td colSpan={11} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={20} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải danh sách trả hàng nhập...
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-24 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                          <Inbox size={32} className="stroke-[1.5]" />
                        </div>
                        <h3 className="font-bold text-sm mb-1">Không tìm thấy kết quả</h3>
                        <p className="text-xs text-[#677484]">
                          Không tìm thấy phiếu trả hàng nhập nào phù hợp với bộ lọc hiện tại.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paged.map((r) => {
                    const isExpanded = expandedId === r.purchaseReturnId;
                    const isDraft = r.status === 'DRAFT';
                    const isCancelled = r.status === 'CANCELLED';
                    const detail = details[r.purchaseReturnId];
                    return (
                      <React.Fragment key={r.purchaseReturnId}>
                        <tr
                          data-doc-row={r.purchaseReturnId}
                          onClick={() => toggleExpand(r)}
                          className={`hover:bg-[#f7f8f9] cursor-pointer ${
                            isExpanded ? 'bg-[#e6f1fe]/80 font-medium' : isDraft ? 'bg-[#fffbeb]' : isCancelled ? 'bg-[#fef2f2]' : ''
                          }`}
                        >
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedKeys.includes(r.purchaseReturnId)}
                              onChange={(e) =>
                                setSelectedKeys((prev) =>
                                  e.target.checked ? [...prev, r.purchaseReturnId] : prev.filter((k) => k !== r.purchaseReturnId)
                                )
                              }
                              className="rounded h-3.5 w-3.5 border-slate-300 cursor-pointer"
                            />
                          </td>
                          <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button type="button" onClick={() => toggleFavorite(r.purchaseReturnId)} className="text-amber-400 cursor-pointer">
                              {favorites.includes(r.purchaseReturnId) ? <StarFilled /> : <StarOutlined />}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4]">{r.returnCode}</td>
                          <td className="py-2.5 px-3">{formatDateTimeVN(r.returnDate)}</td>
                          <td className="py-2.5 px-3 truncate max-w-[220px]" title={r.partnerName}>{r.partnerName}</td>
                          <td className="py-2.5 px-3 text-right">{money.format(r.totalGoodsAmount)}</td>
                          <td className="py-2.5 px-3 text-right">{money.format(r.discountAmount)}</td>
                          <td className="py-2.5 px-3 text-right">{money.format(r.totalAmount)}</td>
                          <td className="py-2.5 px-3 text-right">{money.format(r.refundAmount)}</td>
                          <td className={`py-2.5 px-3 text-right ${remainingOf(r) > 0 ? 'text-rose-600 font-medium' : ''}`}>
                            {money.format(remainingOf(r))}
                          </td>
                          <td className="py-2.5 px-3 text-center">{statusTag(r.status)}</td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={11} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <div className="px-6 py-4">
                                <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
                                  {([
                                    ['info', 'Thông tin'],
                                    ['payments', 'Lịch sử thanh toán'],
                                  ] as const).map(([key, label]) => (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => setDetailTab(key)}
                                      className={`px-4 py-2 text-sm -mb-px border-b-2 cursor-pointer transition ${
                                        detailTab === key
                                          ? 'font-semibold text-[#0070f4] border-[#0070f4]'
                                          : 'text-[#677484] border-transparent hover:text-[#15171a]'
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>

                                {loadingDetailId === r.purchaseReturnId || !detail ? (
                                  <div className="py-10 text-center text-xs text-slate-400">
                                    <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                                    Đang tải chi tiết phiếu {r.returnCode}...
                                  </div>
                                ) : detailTab === 'payments' ? (
                                  <div className="border border-slate-200 rounded-[8px] overflow-hidden mb-2">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                                        <tr>
                                          <th className="py-2 px-3 w-40">Mã phiếu</th>
                                          <th className="py-2 px-3 w-40">Thời gian</th>
                                          <th className="py-2 px-3">Người tạo</th>
                                          <th className="py-2 px-3 w-32">Phương thức</th>
                                          <th className="py-2 px-3 w-32">Trạng thái</th>
                                          <th className="py-2 px-3 w-32 text-right">Tiền thu</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {(detail.payments ?? []).length === 0 ? (
                                          <tr>
                                            <td colSpan={6} className="py-6 text-center text-slate-400">
                                              Nhà cung cấp chưa trả tiền cho phiếu này
                                            </td>
                                          </tr>
                                        ) : (
                                          (detail.payments ?? []).map((p, i) => {
                                            const cancelledPay = p.status?.toUpperCase() === 'CANCELLED';
                                            return (
                                              <tr key={`${p.code}-${i}`} className={cancelledPay ? 'text-slate-400' : ''}>
                                                <td className="py-2 px-3 font-mono text-[#0070f4] font-medium">{p.code}</td>
                                                <td className="py-2 px-3">{formatDateTimeVN(p.paymentDate)}</td>
                                                <td className="py-2 px-3">{p.createdByName}</td>
                                                <td className="py-2 px-3">
                                                  {p.paymentMethod?.toUpperCase() === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                                                </td>
                                                <td className="py-2 px-3">{cancelledPay ? 'Đã hủy' : 'Đã thanh toán'}</td>
                                                <td className={`py-2 px-3 text-right font-mono ${cancelledPay ? 'line-through' : ''}`}>
                                                  {money.format(p.amount)}
                                                </td>
                                              </tr>
                                            );
                                          })
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <>
                                    <div className="mb-4">
                                      <div className="flex items-center gap-2.5 mb-2">
                                        <span className="text-base font-bold font-mono">{detail.returnCode}</span>
                                        {statusTag(detail.status)}
                                      </div>
                                      <div className="grid grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600">
                                        <div>
                                          <span className="text-slate-400">Người tạo: </span>
                                          <span className="font-medium text-slate-800">{detail.createdByName}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400">Thời gian: </span>
                                          <span className="font-medium text-slate-800">{formatDateTimeVN(detail.returnDate)}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400">Kho trả hàng: </span>
                                          <span className="font-semibold text-slate-800">{detail.warehouseName}</span>
                                        </div>
                                        <div>
                                          <span className="text-slate-400">Nhà cung cấp: </span>
                                          <PartnerLink kind="supplier" code={detail.partnerCode} partnerId={detail.partnerId} className="font-semibold">
                                            {detail.partnerName} ({detail.partnerCode})
                                          </PartnerLink>
                                        </div>
                                        <div>
                                          <span className="text-slate-400">Phiếu nhập: </span>
                                          {detail.grCode ? (
                                            <DocumentCodeLink kind="purchase" code={detail.grCode} id={detail.grId} warehouseId={detail.warehouseId} className="font-mono" />
                                          ) : (
                                            <span className="text-slate-400">—</span>
                                          )}
                                        </div>
                                        <div>
                                          <span className="text-slate-400">Hình thức: </span>
                                          <span className="font-medium text-slate-800">
                                            {detail.paymentMethod === 'BANK_TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="border border-slate-200 rounded-[8px] overflow-hidden mb-3">
                                      <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                                          <tr>
                                            <th className="py-2 px-3 w-10 text-center">STT</th>
                                            <th className="py-2 px-3 w-32">Mã hàng</th>
                                            <th className="py-2 px-3">Tên hàng</th>
                                            <th className="py-2 px-3 w-16 text-center">ĐVT</th>
                                            <th className="py-2 px-3 w-24 text-right">Số lượng</th>
                                            <th className="py-2 px-3 w-28 text-right">Giá nhập</th>
                                            <th className="py-2 px-3 w-28 text-right">Giá trả lại</th>
                                            <th className="py-2 px-3 w-28 text-right">Thành tiền</th>
                                          </tr>
                                          <tr className="bg-white border-t border-slate-200">
                                            <th />
                                            <th className="py-1.5 px-3">
                                              <input
                                                value={itemSearch.code}
                                                onChange={(e) => setItemSearch((s) => ({ ...s, code: e.target.value }))}
                                                placeholder="Tìm mã hàng"
                                                className="w-full h-7 px-2 text-xs font-normal border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
                                              />
                                            </th>
                                            <th className="py-1.5 px-3">
                                              <input
                                                value={itemSearch.name}
                                                onChange={(e) => setItemSearch((s) => ({ ...s, name: e.target.value }))}
                                                placeholder="Tìm tên hàng"
                                                className="w-full h-7 px-2 text-xs font-normal border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
                                              />
                                            </th>
                                            <th colSpan={5} />
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {detail.items.filter(matchItemSearch).length === 0 && (
                                            <tr>
                                              <td colSpan={8} className="py-6 text-center text-xs text-slate-400">
                                                Không có mặt hàng nào phù hợp
                                              </td>
                                            </tr>
                                          )}
                                          {detail.items.filter(matchItemSearch).map((it, i) => (
                                            <tr key={it.prItemId}>
                                              <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                                              <td className="py-2 px-3 font-mono font-semibold">
                                                <ProductCodeLink code={it.productCode} productId={it.productId} />
                                              </td>
                                              <td className="py-2 px-3 font-medium">{it.productName}</td>
                                              <td className="py-2 px-3 text-center text-slate-500">{it.unit}</td>
                                              <td className="py-2 px-3 text-right">{it.quantity.toLocaleString('vi-VN')}</td>
                                              <td className="py-2 px-3 text-right">{money.format(it.importPrice)}</td>
                                              <td className="py-2 px-3 text-right">{money.format(it.returnPrice)}</td>
                                              <td className="py-2 px-3 text-right font-semibold">{money.format(it.totalPrice)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    <div className="flex items-start gap-6 mb-4">
                                      <div className="flex-1">
                                        <label className="text-xs text-slate-500 font-medium block mb-1">Ghi chú</label>
                                        <div className="p-2.5 text-xs border border-slate-200 rounded-[8px] bg-slate-50/60 min-h-[60px] text-slate-700">
                                          {detail.notes || 'Không có ghi chú nào.'}
                                        </div>
                                      </div>
                                      <div className="w-72 shrink-0 space-y-1.5 text-xs bg-slate-50/60 p-3 rounded-[8px] border border-slate-200">
                                        <div className="flex justify-between text-slate-600">
                                          <span>Tổng số lượng:</span>
                                          <span className="font-semibold text-slate-800">
                                            {detail.items.reduce((s, it) => s + it.quantity, 0).toLocaleString('vi-VN')}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                          <span>Tổng tiền hàng:</span>
                                          <span className="font-semibold text-slate-800">{money.format(detail.totalGoodsAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                          <span>Giảm giá:</span>
                                          <span className="text-slate-800">{money.format(detail.discountAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                          <span>Tổng cộng:</span>
                                          <span className="font-semibold text-slate-800">{money.format(detail.totalAmount)}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                          <span>NCC đã trả:</span>
                                          <span className="font-semibold text-emerald-600">{money.format(detail.refundAmount)}</span>
                                        </div>
                                        {(detail.offsetAmount ?? 0) > 0 && (
                                          <div
                                            className="flex justify-between text-slate-600"
                                            title="Phần NCC chưa hoàn tiền mặt đã được trừ thẳng vào số mình còn nợ của phiếu nhập gốc"
                                          >
                                            <span>Trừ vào công nợ {detail.grCode ?? 'phiếu nhập'}:</span>
                                            <span className="font-semibold text-amber-600">{money.format(detail.offsetAmount ?? 0)}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1.5 font-bold">
                                          <span>NCC cần trả:</span>
                                          <span className={remainingOf(detail) > 0 ? 'text-rose-600' : 'text-slate-800'}>
                                            {money.format(remainingOf(detail))}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                      <div className="flex items-center gap-2">
                                        {!isCancelled && (
                                          <button
                                            type="button"
                                            onClick={() => setCancelling(r)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-[8px] border border-rose-200 bg-white cursor-pointer"
                                          >
                                            <Trash2 size={13} />
                                            <span>Hủy</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => exportReturnDetail(detail)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#15171a] hover:bg-[#f7f8f9] rounded-[8px] transition cursor-pointer border border-slate-300 bg-white"
                                        >
                                          <FileDown size={13} />
                                          <span>Xuất file</span>
                                        </button>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {r.status === 'COMPLETED' && remainingOf(detail) > 0 && (
                                          <button
                                            type="button"
                                            onClick={() => openRefund(detail)}
                                            className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold cursor-pointer"
                                            title="Ghi nhận nhà cung cấp trả tiền cho phiếu trả hàng"
                                          >
                                            <Banknote size={14} />
                                            <span>Thanh toán</span>
                                          </button>
                                        )}
                                        {isDraft && (
                                          <button
                                            type="button"
                                            onClick={() => router.push(`/purchase-returns/create?edit=${r.purchaseReturnId}`)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#0070f4] hover:bg-blue-50 rounded-[8px] border border-[#0070f4]/40 bg-white font-medium cursor-pointer"
                                          >
                                            <Pencil size={13} />
                                            <span>Mở phiếu</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => printPurchaseReturn(detail)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-[#f7f8f9] rounded-[8px] transition cursor-pointer border border-slate-300 bg-white"
                                        >
                                          <Printer size={13} />
                                          <span>In</span>
                                        </button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer phân trang */}
          <footer className="min-h-10 bg-white border-t border-slate-200 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[12px] text-[#677484] shrink-0">
            <div className="flex items-center gap-3">
              <span>
                Hiển thị <strong className="text-[#15171a]">{paged.length}</strong> trên{' '}
                <strong className="text-[#15171a]">{filtered.length}</strong> phiếu trả hàng nhập
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="h-6 rounded border border-slate-200 bg-white px-1.5 text-xs text-[#15171a] cursor-pointer"
              >
                {[15, 30, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} dòng
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              {[
                { icon: <ChevronsLeft size={13} />, to: 1, disabled: page <= 1, title: 'Trang đầu' },
                { icon: <ChevronLeft size={13} />, to: page - 1, disabled: page <= 1, title: 'Trang trước' },
              ].map((b) => (
                <button
                  key={b.title}
                  type="button"
                  onClick={() => setPage(b.to)}
                  disabled={b.disabled}
                  title={b.title}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  {b.icon}
                </button>
              ))}
              <span className="px-2 text-xs text-[#15171a] font-medium">
                {page} / {pageCount}
              </span>
              {[
                { icon: <ChevronRight size={13} />, to: page + 1, disabled: page >= pageCount, title: 'Trang tiếp' },
                { icon: <ChevronsRight size={13} />, to: pageCount, disabled: page >= pageCount, title: 'Trang cuối' },
              ].map((b) => (
                <button
                  key={b.title}
                  type="button"
                  onClick={() => setPage(b.to)}
                  disabled={b.disabled}
                  title={b.title}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  {b.icon}
                </button>
              ))}
            </div>
          </footer>
        </div>
      </div>

      {/* Nhà cung cấp trả tiền (phiếu thu) */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] shadow-lg max-w-md w-full border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#15171a]">Nhà cung cấp trả tiền</h3>
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="text-[#677484] hover:text-[#15171a] cursor-pointer"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#677484]">Phiếu trả hàng</span>
                <span className="font-mono font-semibold text-[#0070f4]">{refundTarget.returnCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#677484]">Nhà cung cấp</span>
                <span className="font-medium">{refundTarget.partnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#677484]">Tổng cộng</span>
                <span>{money.format(refundTarget.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#677484]">NCC đã trả</span>
                <span>{money.format(refundTarget.refundAmount)}</span>
              </div>
              {(refundTarget.offsetAmount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#677484]">Trừ vào công nợ phiếu nhập</span>
                  <span>{money.format(refundTarget.offsetAmount ?? 0)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>NCC cần trả</span>
                <span className="text-rose-600">{money.format(remainingOf(refundTarget))}</span>
              </div>
              <div className="flex items-center justify-between gap-3 pt-1">
                <span>Tiền nhà cung cấp trả</span>
                <NumberInput value={refundAmount} onChange={(v) => setRefundAmount(Math.max(0, v))} className="w-44" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Phương thức</span>
                <div className="inline-flex rounded-[6px] border border-slate-300 overflow-hidden text-[12px]">
                  {([
                    ['CASH', 'Tiền mặt'],
                    ['BANK_TRANSFER', 'Chuyển khoản'],
                  ] as const).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRefundMethod(key)}
                      className={`px-2.5 h-7 cursor-pointer ${
                        refundMethod === key ? 'bg-[#0070f4] text-white' : 'bg-white hover:bg-[#eff6ff]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                placeholder="Ghi chú"
                rows={2}
                className="w-full p-2.5 rounded-[8px] border border-slate-300 placeholder-[#677484] focus:outline-none focus:border-[#0070f4] resize-none"
              />
              <p className="text-[11px] text-[#677484]">
                Hệ thống lập phiếu thu (PT...) và cộng lại công nợ phải trả NCC tương ứng số tiền NCC đã trả.
              </p>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundTarget(null)}
                className="px-3.5 py-1.5 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium cursor-pointer"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={confirmRefund}
                className="px-4 py-1.5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                Tạo phiếu thu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Xác nhận hủy phiếu trả */}
      {cancelling && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] shadow-lg max-w-md w-full p-5 flex flex-col gap-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-rose-100 text-rose-600 shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="text-xs text-slate-700 leading-relaxed">
                <h3 className="text-sm font-bold text-[#15171a] mb-1">Hủy phiếu trả hàng nhập</h3>
                Bạn có chắc chắn muốn hủy phiếu <strong className="font-mono">{cancelling.returnCode}</strong> của nhà cung cấp{' '}
                <strong>{cancelling.partnerName}</strong>?
                {cancelling.status === 'COMPLETED' && (
                  <> Hàng đã trả sẽ được <strong>nhập lại kho</strong>, khoản NCC đã trả bị hủy và công nợ phải trả NCC được cộng lại.</>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCancelling(null)}
                className="px-3.5 py-1.5 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={confirmCancel}
                className="px-4 py-1.5 rounded-[8px] bg-[#fb2c36] hover:bg-[#e0242d] text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                Hủy phiếu này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
