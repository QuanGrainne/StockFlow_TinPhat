'use client';

import {
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { message, Tag, Modal, Input, Radio, Tooltip } from 'antd';
import {
  AlignJustify,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  FileDown,
  Filter,
  HelpCircle,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Settings,
  Trash2,
  X,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Clock,
  User,
  Phone,
  FileText,
  SlidersHorizontal,
  PhoneCall,
  FileUp,
  Inbox,
  Star,
  Undo2,
} from 'lucide-react';
import Link from 'next/link';
import { DocumentCodeLink, PartnerLink, ProductCodeLink } from '@/components/links/EntityLinks';
import { toLinkDate } from '@/lib/navigation/documentLink';
import { useRouter, useSearchParams } from 'next/navigation';
import { linkDateFilter, readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import PurchaseFilterSidebar from '@/features/purchases/components/PurchaseFilterSidebar';
import { purchaseService } from '@/features/purchases/services/purchaseService';
import { printPurchaseReceipt } from '@/features/purchases/utils/printPurchaseReceipt';
import { PurchaseListRecord, PurchaseDetail, PurchaseItem, PurchasePayment, PurchaseReturnSummary } from '@/features/purchases/types';
import type { PurchaseFilterState } from '@/features/purchases/types';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { supplierService } from '@/features/suppliers/services/supplierService';
import { Supplier } from '@/features/suppliers/types';
import { getDateRangeForPreset } from '@/features/transfers/utils/dateUtils';

// ─── Types ────────────────────────────────────────────────────────────────────
// PurchaseStatus, PurchaseFilterState: xem features/purchases/types/filterTypes.ts

type PriceSettingItem = {
  id: string;
  name: string;
  costPrice: number;
  lastPurchasePrice: number;
  salePrice: number;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

/** Giảm giá trên 1 đơn vị của dòng hàng (VND) */
function lineDiscountPerUnit(item: Pick<PurchaseItem, 'unitPrice' | 'discountPercent'>): number {
  return Math.round(item.unitPrice * (Math.min(Math.max(item.discountPercent || 0, 0), 100) / 100));
}

/** Giá nhập = Đơn giá − Giảm giá dòng (cũng là giá trả mặc định khi trả hàng nhập) */
function lineImportPrice(item: Pick<PurchaseItem, 'unitPrice' | 'discountPercent'>): number {
  return item.unitPrice - lineDiscountPerUnit(item);
}

function formatDateTimeVN(dateVal?: string | Date | null): string {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateVal);
  }
}

function formatDateOnlyVN(dateVal?: string | Date | null): string {
  if (!dateVal) return '—';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateVal);
  }
}

function statusTag(status: string) {
  const norm = status?.toUpperCase();
  switch (norm) {
    case 'COMPLETED':
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]">
          Đã nhập hàng
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-[#fffbeb] text-[#d97706] border-[#fde68a]">
          Phiếu tạm
        </span>
      );
    case 'CANCELLED':
    case 'CANCELED':
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]">
          Đã hủy
        </span>
      );
    default:
      return (
        <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-slate-100 text-slate-700 border-slate-200">
          {status}
        </span>
      );
  }
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
};

/** Tab "Lịch sử thanh toán" của phiếu nhập (khoản trả lúc nhập + phân bổ từ phiếu chi PC...) */
function PurchasePaymentHistory({ payments }: { payments: PurchasePayment[] }) {
  return (
    <div className="border border-slate-200 rounded-[8px] overflow-hidden mb-2">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
          <tr>
            <th className="py-2 px-3 w-36">Mã phiếu</th>
            <th className="py-2 px-3 w-40">Thời gian</th>
            <th className="py-2 px-3">Người tạo</th>
            <th className="py-2 px-3 w-32">Phương thức</th>
            <th className="py-2 px-3 w-32">Trạng thái</th>
            <th className="py-2 px-3 w-32 text-right">Tiền chi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                Phiếu nhập chưa có thanh toán nào
              </td>
            </tr>
          ) : (
            payments.map((p, i) => {
              const cancelled = p.status?.toUpperCase() === 'CANCELLED';
              return (
                <tr key={`${p.code}-${i}`} className={`hover:bg-slate-50/70 ${cancelled ? 'text-slate-400' : ''}`}>
                  <td className="py-2 px-3 font-mono text-[#0070f4] font-medium">{p.code}</td>
                  <td className="py-2 px-3">{formatDateTimeVN(p.paymentDate)}</td>
                  <td className="py-2 px-3">{p.createdByName}</td>
                  <td className="py-2 px-3">{PAYMENT_METHOD_LABEL[p.paymentMethod?.toUpperCase()] ?? p.paymentMethod}</td>
                  <td className="py-2 px-3">{cancelled ? 'Đã hủy' : 'Đã thanh toán'}</td>
                  <td className={`py-2 px-3 text-right font-mono ${cancelled ? 'line-through' : 'text-slate-800'}`}>
                    {currencyFormatter.format(p.amount)}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

const RETURN_STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Đã trả hàng', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  DRAFT: { label: 'Phiếu tạm', cls: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};

/** Tab "Lịch sử trả hàng" của phiếu nhập (các phiếu trả hàng nhập THN lập từ phiếu này) */
function PurchaseReturnHistory({ returns }: { returns: PurchaseReturnSummary[] }) {
  return (
    <div className="border border-slate-200 rounded-[8px] overflow-hidden mb-2">
      <table className="w-full text-left border-collapse text-xs">
        <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
          <tr>
            <th className="py-2 px-3 w-40">Mã trả hàng nhập</th>
            <th className="py-2 px-3 w-40">Thời gian</th>
            <th className="py-2 px-3">Người trả</th>
            <th className="py-2 px-3 w-32 text-right">Tổng cộng</th>
            <th className="py-2 px-3 w-32">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {returns.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-xs text-slate-400">
                Phiếu nhập chưa có phiếu trả hàng nào
              </td>
            </tr>
          ) : (
            returns.map((r) => {
              const st = RETURN_STATUS[r.status?.toUpperCase()] ?? RETURN_STATUS.DRAFT;
              return (
                <tr key={r.purchaseReturnId} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3">
                    <DocumentCodeLink
                      kind="purchase-return"
                      code={r.returnCode}
                      id={r.purchaseReturnId}
                      date={toLinkDate(r.returnDate)}
                      className="font-mono font-medium"
                    />
                  </td>
                  <td className="py-2 px-3">{formatDateTimeVN(r.returnDate)}</td>
                  <td className="py-2 px-3">{r.createdByName || '—'}</td>
                  <td className="py-2 px-3 text-right font-mono text-slate-800">{currencyFormatter.format(r.totalAmount)}</td>
                  <td className="py-2 px-3">
                    <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-semibold border ${st.cls}`}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PurchasesScreen({ onNavigate }: { onNavigate?: (screen: string) => void } = {}) {
  const router = useRouter();
  const { activeWarehouse, warehouses } = useActiveWarehouse();

  // Suppliers list for filter
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Data & Loading state
  const [purchases, setPurchases] = useState<PurchaseListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Link mở thẳng 1 phiếu (?code=&id=&date=&wh=, VD từ Thẻ kho)
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));

  // Search & Filtering state
  const [query, setQuery] = useState(() => docLink?.code ?? '');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Detail cache & expand state
  const [expandedRowKey, setExpandedRowKey] = useState<number | null>(() => docLink?.id ?? null);
  // Ô tìm mã hàng / tên hàng trong bảng hàng của phiếu đang mở
  const [itemSearch, setItemSearch] = useState({ code: '', name: '' });
  const matchItemSearch = (it: { productCode: string; productName: string }) =>
    (!itemSearch.code.trim() || it.productCode.toLowerCase().includes(itemSearch.code.trim().toLowerCase())) &&
    (!itemSearch.name.trim() || it.productName.toLowerCase().includes(itemSearch.name.trim().toLowerCase()));
  const [detailsCache, setDetailsCache] = useState<Record<number, PurchaseDetail>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(() => docLink?.id ?? null);

  // Favorites
  const [favoriteKeys, setFavoriteKeys] = useState<number[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('stockflow_purchase_favorites');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Action Modals State
  const [completingRecord, setCompletingRecord] = useState<PurchaseListRecord | null>(null);
  const [completePaidAmount, setCompletePaidAmount] = useState<number>(0);
  const [completePaymentMethod, setCompletePaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');

  const [cancellingRecord, setCancellingRecord] = useState<PurchaseListRecord | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  // Tab trong khung chi tiết phiếu: Thông tin | Lịch sử thanh toán
  const [detailTab, setDetailTab] = useState<'info' | 'payments' | 'returns'>('info');

  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Price Setting Modal (Existing UX feature)
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState('Bảng giá chung');
  const [priceValues, setPriceValues] = useState<Record<string, string>>({});
  const [priceSettingItems, setPriceSettingItems] = useState<PriceSettingItem[]>([]);

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

  // Mở thẳng phiếu theo link: tải chi tiết + cuộn tới dòng
  useEffect(() => {
    const linkedId = docLink?.id;
    if (!linkedId) return;
    let cancelled = false;
    purchaseService
      .getPurchaseById(linkedId)
      .then((detail) => {
        if (!cancelled) setDetailsCache((prev) => ({ ...prev, [linkedId]: detail }));
      })
      .catch(() => {
        if (!cancelled) message.error(`Không thể tải chi tiết phiếu ${docLink.code}`);
      })
      .finally(() => {
        if (!cancelled) setLoadingDetailId((cur) => (cur === linkedId ? null : cur));
      });
    const stopScroll = scrollToWhenReady(`[data-doc-row="${linkedId}"]`);
    return () => {
      cancelled = true;
      stopScroll();
    };
  }, [docLink]);

  // Load suppliers for filter sidebar
  useEffect(() => {
    supplierService
      .getSuppliers()
      .then((data) => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // ─── 1. Load Data from API ─────────────────────────────────────────────────

  const loadPurchases = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params: Parameters<typeof purchaseService.getPurchases>[0] = {};

      // 1. Warehouse filter (multi-branch selection or single active warehouse)
      if (filterState.warehouseIds !== undefined) {
        if (filterState.warehouseIds.length > 0) {
          params.warehouseIds = filterState.warehouseIds;
        }
        // Nếu filterState.warehouseIds === [] nghĩa là chọn "Tất cả" -> không truyền warehouseId để API trả về dữ liệu toàn bộ kho
      } else if (activeWarehouse?.warehouseId) {
        params.warehouseId = activeWarehouse.warehouseId;
      }

      // 2. Supplier filter
      if (filterState.partnerId) {
        params.partnerId = filterState.partnerId;
      }

      // 3. Time range parameter mapping (Đồng bộ chuẩn Chuyển hàng)
      if (filterState.dateFrom) params.fromDate = filterState.dateFrom;
      if (filterState.dateTo) params.toDate = filterState.dateTo;

      // 4. Status mapping if single status
      if (filterState.statuses.length === 1) {
        const s = filterState.statuses[0];
        if (s === 'draft') params.status = 'DRAFT';
        else if (s === 'completed') params.status = 'COMPLETED';
        else if (s === 'canceled') params.status = 'CANCELLED';
      }

      const data = await purchaseService.getPurchases(params);
      setPurchases(data);
    } catch (err: any) {
      console.warn('Lỗi khi tải danh sách phiếu nhập hàng:', err);
      message.error('Không thể tải danh sách phiếu nhập hàng từ máy chủ.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    activeWarehouse?.warehouseId,
    filterState.warehouseIds,
    filterState.partnerId,
    filterState.timeRange,
    filterState.periodLabel,
    filterState.dateFrom,
    filterState.dateTo,
    filterState.statuses,
  ]);

  useEffect(() => {
    loadPurchases();
  }, [loadPurchases]);

  // Click outside listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleFilterChange(patch: Partial<PurchaseFilterState>) {
    setFilterState((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function toggleFavorite(key: number) {
    setFavoriteKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      try {
        localStorage.setItem('stockflow_purchase_favorites', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // ─── 2. Row Expand & Detail Fetching ───────────────────────────────────────

  async function handleRowClick(record: PurchaseListRecord) {
    if (expandedRowKey === record.grId) {
      setExpandedRowKey(null);
      return;
    }

    setExpandedRowKey(record.grId);
    setDetailTab('info');
    setItemSearch({ code: '', name: '' });

    // If detail not yet cached, fetch it from backend
    if (!detailsCache[record.grId]) {
      try {
        setLoadingDetailId(record.grId);
        const detail = await purchaseService.getPurchaseById(record.grId);
        setDetailsCache((prev) => ({ ...prev, [record.grId]: detail }));
      } catch (err: any) {
        message.error(`Không thể tải chi tiết phiếu nhập #${record.grCode}`);
      } finally {
        setLoadingDetailId(null);
      }
    }
  }

  // ─── 3. Action Handlers (Complete, Cancel, Print, Duplicate) ───────────────

  function openCompleteModal(record: PurchaseListRecord) {
    setCompletingRecord(record);
    setCompletePaidAmount(record.totalAmount);
    setCompletePaymentMethod('CASH');
  }

  async function handleConfirmComplete() {
    if (!completingRecord) return;
    try {
      setIsSubmittingAction(true);
      const res = await purchaseService.completePurchase(completingRecord.grId, {
        paidAmount: completePaidAmount,
        paymentMethod: completePaymentMethod,
      });

      message.success(`Đã hoàn thành nhập kho phiếu ${res.grCode}! Tồn kho và giá vốn đã được cập nhật.`);
      setCompletingRecord(null);

      // Update in local state
      setPurchases((prev) =>
        prev.map((p) =>
          p.grId === completingRecord.grId
            ? { ...p, status: 'COMPLETED', paidAmount: completePaidAmount, debtAmount: Math.max(0, p.totalAmount - completePaidAmount) }
            : p
        )
      );

      // Update detail cache
      setDetailsCache((prev) => ({
        ...prev,
        [completingRecord.grId]: res,
      }));
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi hoàn thành phiếu nhập hàng');
    } finally {
      setIsSubmittingAction(false);
    }
  }

  function openCancelModal(record: PurchaseListRecord) {
    setCancellingRecord(record);
    setCancelReason('');
  }

  async function handleConfirmCancel() {
    if (!cancellingRecord) return;
    try {
      setIsSubmittingAction(true);
      await purchaseService.cancelPurchase(cancellingRecord.grId, { reason: cancelReason.trim() || undefined });

      message.success(`Đã hủy phiếu nhập ${cancellingRecord.grCode}`);
      setCancellingRecord(null);

      // Update in local state (phiếu đã nhập bị hủy: khoản trả lúc nhập cũng bị hủy → không còn nợ)
      setPurchases((prev) =>
        prev.map((p) =>
          p.grId === cancellingRecord.grId
            ? { ...p, status: 'CANCELLED', paidAmount: 0, debtAmount: 0 }
            : p
        )
      );

      // Tải lại chi tiết để lịch sử thanh toán hiển thị trạng thái Đã hủy
      try {
        const fresh = await purchaseService.getPurchaseById(cancellingRecord.grId);
        setDetailsCache((prev) => ({ ...prev, [cancellingRecord.grId]: fresh }));
      } catch {
        setDetailsCache((prev) => {
          const next = { ...prev };
          delete next[cancellingRecord.grId];
          return next;
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi hủy phiếu nhập');
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function handlePrintPurchase(record: PurchaseListRecord) {
    let detail = detailsCache[record.grId];
    if (!detail) {
      try {
        message.loading({ content: 'Đang tải bản in phiếu...', key: 'print' });
        detail = await purchaseService.getPurchaseById(record.grId);
        setDetailsCache((prev) => ({ ...prev, [record.grId]: detail }));
        message.destroy('print');
      } catch {
        message.error({ content: 'Lỗi khi tải thông tin in phiếu', key: 'print' });
        return;
      }
    }
    printPurchaseReceipt(detail);
  }

  // Sao chép: mở màn hình nhập hàng với hàng hóa / NCC / giảm giá của phiếu này (lưu thành phiếu mới)
  function handleDuplicatePurchase(record: PurchaseListRecord) {
    router.push(`/purchases/create?copy=${record.grId}`);
  }

  // ─── 4. Excel Exports ──────────────────────────────────────────────────────

  function exportSummaryExcel() {
    if (filtered.length === 0) {
      message.warning('Không có dữ liệu phiếu nhập để xuất file');
      return;
    }

    const rows = filtered.map((p, idx) => ({
      STT: idx + 1,
      'Mã phiếu nhập': p.grCode,
      'Thời gian': formatDateTimeVN(p.receivedDate),
      'Mã nhà cung cấp': p.partnerCode,
      'Nhà cung cấp': p.partnerName,
      'Kho hàng': p.warehouseName,
      'Tổng tiền (đ)': p.totalAmount,
      'Đã trả (đ)': p.paidAmount,
      'Cần trả NCC (đ)': p.debtAmount,
      'Trạng thái': p.status === 'COMPLETED' ? 'Đã nhập hàng' : p.status === 'DRAFT' ? 'Phiếu tạm' : 'Đã hủy',
      'Người nhập': p.receivedByName,
      'Ghi chú': p.notes || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách nhập hàng');
    XLSX.writeFile(workbook, `Nhap_Hang_TinPhat_${formatDateOnlyVN(new Date()).replace(/\//g, '-')}.xlsx`);
    message.success('Đã xuất file Excel tổng quan thành công!');
    setExportOpen(false);
  }

  async function exportDetailExcel() {
    message.loading({ content: 'Đang chuẩn bị file Excel chi tiết...', key: 'exp_det' });
    try {
      const recordsToExport = selectedRowKeys.length > 0
        ? filtered.filter((p) => selectedRowKeys.includes(p.grId))
        : filtered.slice(0, 50);

      const allRows: any[] = [];

      for (const rec of recordsToExport) {
        let det = detailsCache[rec.grId];
        if (!det) {
          try {
            det = await purchaseService.getPurchaseById(rec.grId);
            setDetailsCache((prev) => ({ ...prev, [rec.grId]: det }));
          } catch {
            continue;
          }
        }

        if (det.items && det.items.length > 0) {
          det.items.forEach((item, idx) => {
            allRows.push({
              'Mã phiếu': rec.grCode,
              'Ngày nhập': formatDateTimeVN(rec.receivedDate),
              'Nhà cung cấp': rec.partnerName,
              'STT Hàng': idx + 1,
              'Mã hàng': item.productCode,
              'Tên hàng': item.productName,
              'ĐVT': item.unit,
              'Số lượng': item.quantity,
              'Đơn giá (đ)': item.unitPrice,
              'Giảm giá (đ)': lineDiscountPerUnit(item),
              'Giá nhập (đ)': lineImportPrice(item),
              'Thành tiền (đ)': item.totalPrice,
              'Kho': rec.warehouseName,
            });
          });
        }
      }

      if (allRows.length === 0) {
        message.warning({ content: 'Chưa có dữ liệu chi tiết để xuất file', key: 'exp_det' });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(allRows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Chi tiết mặt hàng');
      XLSX.writeFile(workbook, `Chi_Tiet_Nhap_Hang_${formatDateOnlyVN(new Date()).replace(/\//g, '-')}.xlsx`);
      message.success({ content: 'Đã xuất file Excel chi tiết thành công!', key: 'exp_det' });
      setExportOpen(false);
    } catch {
      message.error({ content: 'Lỗi khi xuất file Excel chi tiết', key: 'exp_det' });
    }
  }

  // ─── 5. Filtering & Pagination Logic ───────────────────────────────────────

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const codeQ = searchCode.trim().toLowerCase();
    const prodQ = searchProduct.trim().toLowerCase();
    const suppQ = searchSupplier.trim().toLowerCase();

    return purchases.filter((p) => {
      const matchesQuery =
        !q ||
        p.grCode.toLowerCase().includes(q) ||
        (p.externalPoNumber && p.externalPoNumber.toLowerCase().includes(q)) ||
        p.partnerCode.toLowerCase().includes(q) ||
        p.partnerName.toLowerCase().includes(q);

      const matchesCode = !codeQ || p.grCode.toLowerCase().includes(codeQ);
      const matchesProd = !prodQ || p.grCode.toLowerCase().includes(prodQ) || p.partnerName.toLowerCase().includes(prodQ);
      const matchesSupp = !suppQ || p.partnerCode.toLowerCase().includes(suppQ) || p.partnerName.toLowerCase().includes(suppQ);

      // Status check
      let matchesStatus = true;
      if (filterState.statuses.length > 0 && filterState.statuses.length < 3) {
        const norm = p.status?.toUpperCase();
        const allowed: string[] = [];
        if (filterState.statuses.includes('draft')) allowed.push('DRAFT');
        if (filterState.statuses.includes('completed')) allowed.push('COMPLETED');
        if (filterState.statuses.includes('canceled')) allowed.push('CANCELLED', 'CANCELED');
        matchesStatus = allowed.includes(norm);
      }

      // Time range check (Đồng bộ chuẩn Chuyển hàng)
      let matchesDate = true;
      if (filterState.dateFrom) {
        const fromStr = filterState.dateFrom.split('T')[0];
        const pDateStr = p.receivedDate ? p.receivedDate.split('T')[0] : '';
        if (pDateStr && pDateStr < fromStr) matchesDate = false;
      }
      if (filterState.dateTo && matchesDate) {
        const toStr = filterState.dateTo.split('T')[0];
        const pDateStr = p.receivedDate ? p.receivedDate.split('T')[0] : '';
        if (pDateStr && pDateStr > toStr) matchesDate = false;
      }

      // Warehouse check (Đồng bộ kho mặc định & multi-warehouse)
      let matchesWarehouse = true;
      if (filterState.warehouseIds !== undefined) {
        if (filterState.warehouseIds.length > 0) {
          matchesWarehouse = filterState.warehouseIds.includes(p.warehouseId);
        }
      } else if (activeWarehouse?.warehouseId) {
        matchesWarehouse = p.warehouseId === activeWarehouse.warehouseId;
      }

      return matchesQuery && matchesCode && matchesProd && matchesSupp && matchesStatus && matchesDate && matchesWarehouse;
    });
  }, [
    purchases,
    query,
    searchCode,
    searchProduct,
    searchSupplier,
    filterState.statuses,
    filterState.dateFrom,
    filterState.dateTo,
    filterState.warehouseIds,
    activeWarehouse?.warehouseId,
  ]);

  const totalDebt = filtered.reduce((sum, p) => sum + p.debtAmount, 0);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filtered.length);

  // ─── 6. JSX Render ─────────────────────────────────────────────────────────

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-transparent overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header Toolbar Bar */}
      <header className="min-h-12 bg-white/84 backdrop-blur-[2px] border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        {/* Left: Title & Search bar */}
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold text-[#15171a] leading-7 tracking-tight whitespace-nowrap">
            Nhập hàng
          </h1>

          <div className="relative flex-1" ref={searchBoxRef}>
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Theo mã phiếu, số PO, mã hoặc tên NCC..."
              className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
            <button
              type="button"
              onClick={() => setSearchDropdownOpen((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] hover:text-[#15171a] cursor-pointer"
              title="Bộ lọc nâng cao"
            >
              <SlidersHorizontal size={13} />
            </button>

            {/* Advanced search dropdown */}
            {searchDropdownOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg p-3 z-40 space-y-2 text-xs animate-in fade-in duration-100"
              >
                <div>
                  <label className="text-slate-500 block mb-1">Mã phiếu nhập</label>
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="PN00..."
                    className="w-full h-7 px-2 border border-slate-200 rounded outline-none focus:border-[#0070f4]"
                  />
                </div>
                <div>
                  <label className="text-slate-500 block mb-1">Mã hoặc tên NCC</label>
                  <input
                    type="text"
                    value={searchSupplier}
                    onChange={(e) => setSearchSupplier(e.target.value)}
                    placeholder="NCC..."
                    className="w-full h-7 px-2 border border-slate-200 rounded outline-none focus:border-[#0070f4]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchCode('');
                      setSearchProduct('');
                      setSearchSupplier('');
                    }}
                    className="text-slate-500 hover:underline cursor-pointer"
                  >
                    Xóa bộ lọc
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchDropdownOpen(false)}
                    className="px-2.5 py-1 bg-[#0070f4] text-white rounded font-medium hover:bg-[#005ac3] transition cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút + Nhập hàng */}
          <Link
            href="/purchases/create"
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Nhập hàng</span>
          </Link>

          {/* Xuất file Dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] font-medium text-[13px] transition cursor-pointer bg-white"
            >
              <FileDown size={14} className="text-[#677484]" />
              <span>Xuất file</span>
              <span className="text-[10px]">▾</span>
            </button>

            {exportOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full right-0 mt-1.5 w-44 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-40 animate-in fade-in duration-100"
              >
                <button
                  type="button"
                  onClick={exportSummaryExcel}
                  className="w-full text-left px-4 py-2 text-sm text-[#15171a] hover:bg-[#f7f8f9] cursor-pointer transition block"
                >
                  File tổng quan
                </button>
                <button
                  type="button"
                  onClick={exportDetailExcel}
                  className="w-full text-left px-4 py-2 text-sm text-[#15171a] hover:bg-[#f7f8f9] cursor-pointer transition block"
                >
                  File chi tiết
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Workspace: Sidebar & Table */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar bộ lọc */}
        <div className="relative shrink-0 h-full flex">
          <PurchaseFilterSidebar
            state={filterState}
            onChange={handleFilterChange}
            isCollapsed={sidebarCollapsed}
            warehouses={warehouses}
            suppliers={suppliers}
            activeWarehouse={activeWarehouse}
          />
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#0070f4] text-[#0070f4] hover:bg-[#e6f1fe] shadow-xs flex items-center justify-center cursor-pointer z-30 transition"
            title={sidebarCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={13} className="stroke-[2.5]" />
            ) : (
              <ChevronLeft size={13} className="stroke-[2.5]" />
            )}
          </button>
        </div>

        {/* Data Table Workspace */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white/62">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[950px]">
              <thead className="bg-[#f7f8f9] sticky top-0 z-20 border-b border-slate-200 text-[12px] font-semibold text-[#677484] shadow-xs">
                <tr>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 w-10 text-center border-b border-slate-200">
                    <input
                      type="checkbox"
                      checked={selectedRowKeys.length === pagedItems.length && pagedItems.length > 0}
                      onChange={(e) => setSelectedRowKeys(e.target.checked ? pagedItems.map((r) => r.grId) : [])}
                      className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-2 w-8 text-center border-b border-slate-200">
                    <Star size={13} className="text-[#677484] mx-auto" />
                  </th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200">Mã nhập hàng</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200">Thời gian</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200">Mã NCC</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200">Nhà cung cấp</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200">Kho hàng</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 text-right border-b border-slate-200">Cần trả NCC</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 text-center border-b border-slate-200">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Dòng tổng nợ NCC nếu có */}
                {totalDebt > 0 && !loading && (
                  <tr className="bg-white/75 border-b border-slate-200 font-bold text-[#15171a] text-[13px]">
                    <td colSpan={7} className="py-2.5 px-3 text-right text-xs text-[#677484]">Tổng nợ NCC:</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                      {currencyFormatter.format(totalDebt)} đ
                    </td>
                    <td></td>
                  </tr>
                )}

                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-[#677484]">
                      <RefreshCcw size={20} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải danh sách phiếu nhập hàng từ máy chủ...
                    </td>
                  </tr>
                ) : pagedItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                          <Inbox size={32} className="stroke-[1.5]" />
                        </div>
                        <h3 className="font-bold text-[#15171a] text-sm mb-1">
                          Không tìm thấy kết quả
                        </h3>
                        <p className="text-xs text-[#677484] max-w-sm">
                          Không tìm thấy phiếu nhập hàng nào phù hợp với bộ lọc hiện tại.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedItems.map((record) => {
                    const isExpanded = expandedRowKey === record.grId;
                    const isFav = favoriteKeys.includes(record.grId);
                    const isDraft = record.status?.toUpperCase() === 'DRAFT';
                    const isCanceled = record.status?.toUpperCase() === 'CANCELLED' || record.status?.toUpperCase() === 'CANCELED';
                    const statusBg = isDraft ? 'bg-[#fffbeb]' : isCanceled ? 'bg-[#fef2f2]' : '';
                    const detail = detailsCache[record.grId];

                    return (
                      <React.Fragment key={record.grId}>
                        <tr
                          data-doc-row={record.grId}
                          onClick={() => handleRowClick(record)}
                          className={`hover:bg-[#f7f8f9] transition cursor-pointer select-none border-b border-slate-100 ${
                            isExpanded ? 'bg-[#e6f1fe]/80 font-medium' : selectedRowKeys.includes(record.grId) ? 'bg-[#e6f1fe]/50' : statusBg
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                              checked={selectedRowKeys.includes(record.grId)}
                              onChange={(e) => {
                                setSelectedRowKeys((prev) =>
                                  e.target.checked ? [...prev, record.grId] : prev.filter((k) => k !== record.grId)
                                );
                              }}
                            />
                          </td>

                          {/* Star */}
                          <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleFavorite(record.grId)}
                              className="text-amber-400 hover:text-amber-500 cursor-pointer"
                            >
                              {isFav ? <StarFilled /> : <StarOutlined />}
                            </button>
                          </td>

                          {/* Mã nhập hàng */}
                          <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4] text-[13px]">
                            {record.grCode}
                          </td>

                          {/* Thời gian */}
                          <td className="py-2.5 px-3 text-[#15171a] font-normal text-[13px]">
                            {formatDateTimeVN(record.receivedDate)}
                          </td>

                          {/* Mã NCC */}
                          <td className="py-2.5 px-3 font-mono text-[#677484] text-[13px]">
                            {record.partnerCode || '—'}
                          </td>

                          {/* Nhà cung cấp */}
                          <td className="py-2.5 px-3 text-[#15171a] font-medium text-[13px] truncate max-w-[200px]" title={record.partnerName}>
                            {record.partnerName}
                          </td>

                          {/* Kho hàng */}
                          <td className="py-2.5 px-3 text-[#15171a] font-normal text-[13px]">
                            {record.warehouseName}
                          </td>

                          {/* Cần trả NCC */}
                          <td className={`py-2.5 px-3 text-right font-mono font-bold text-[13px] ${record.debtAmount > 0 ? 'text-rose-600' : 'text-[#15171a]'}`}>
                            {record.debtAmount > 0 ? `${currencyFormatter.format(record.debtAmount)} đ` : '0 đ'}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-2.5 px-3 text-center">
                            {statusTag(record.status)}
                          </td>
                        </tr>

                        {/* Expanded Detail Panel */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <div className="px-6 py-4">
                                {/* Tab Bar */}
                                <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
                                  {([
                                    ['info', 'Thông tin'],
                                    ['payments', 'Lịch sử thanh toán'],
                                    ['returns', 'Lịch sử trả hàng'],
                                  ] as const).map(([key, label]) => (
                                    <button
                                      key={key}
                                      type="button"
                                      onClick={() => setDetailTab(key)}
                                      className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm -mb-px border-b-2 cursor-pointer transition ${
                                        detailTab === key
                                          ? 'font-semibold text-[#0070f4] border-[#0070f4]'
                                          : 'text-[#677484] border-transparent hover:text-[#15171a]'
                                      }`}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>

                                {loadingDetailId === record.grId ? (
                                  <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
                                    <RefreshCcw size={18} className="animate-spin text-[#0070f4]" />
                                    <span className="text-xs">Đang tải chi tiết phiếu nhập #{record.grCode}...</span>
                                  </div>
                                ) : detailTab === 'payments' ? (
                                  <PurchasePaymentHistory payments={detail?.payments ?? []} />
                                ) : detailTab === 'returns' ? (
                                  <PurchaseReturnHistory returns={detail?.returns ?? []} />
                                ) : (
                                  <>
                                    {/* Header Info Row */}
                                    <div className="flex items-start justify-between mb-4">
                                      <div>
                                        <div className="flex items-center gap-2.5 mb-2">
                                          <span className="text-base font-bold text-slate-900 font-mono">{record.grCode}</span>
                                          {statusTag(record.status)}
                                          {record.externalPoNumber && (
                                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                                              PO:{' '}
                                              {/^PDN\d+$/.test(record.externalPoNumber) ? (
                                                <DocumentCodeLink kind="purchase-order" code={record.externalPoNumber} />
                                              ) : (
                                                record.externalPoNumber
                                              )}
                                            </span>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400">Người nhập:</span>
                                            <span className="font-medium text-slate-800">{record.receivedByName || 'Quản trị viên'}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400">Thời gian nhập:</span>
                                            <span className="font-medium text-slate-800">{formatDateTimeVN(record.receivedDate)}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-slate-400">Kho nhập:</span>
                                            <span className="font-semibold text-slate-800">{record.warehouseName}</span>
                                          </div>
                                        </div>
                                        <div className="mt-2 text-xs text-slate-600 flex items-center gap-4">
                                          <div>
                                            <span className="text-slate-400">Nhà cung cấp: </span>
                                            <PartnerLink kind="supplier" code={record.partnerCode} partnerId={record.partnerId} className="font-semibold">
                                              {record.partnerName} ({record.partnerCode})
                                            </PartnerLink>
                                          </div>
                                          {detail?.partnerPhone && (
                                            <div>
                                              <span className="text-slate-400">Điện thoại: </span>
                                              <span className="text-slate-700">{detail.partnerPhone}</span>
                                            </div>
                                          )}
                                          {detail?.paymentMethod && (
                                            <div>
                                              <span className="text-slate-400">Hình thức: </span>
                                              <span className="text-slate-700 font-medium">
                                                {detail.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Product Table in detail */}
                                    <div className="border border-slate-200 rounded-[8px] overflow-hidden mb-3">
                                      <table className="w-full text-left border-collapse text-xs">
                                        <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                                          <tr>
                                            <th className="py-2 px-3 w-10 text-center">STT</th>
                                            <th className="py-2 px-3 w-32">Mã hàng</th>
                                            <th className="py-2 px-3">Tên hàng hóa</th>
                                            <th className="py-2 px-3 w-16 text-center">ĐVT</th>
                                            <th className="py-2 px-3 w-24 text-right">Số lượng</th>
                                            <th className="py-2 px-3 w-28 text-right">Đơn giá</th>
                                            <th className="py-2 px-3 w-24 text-right">Giảm giá</th>
                                            <th className="py-2 px-3 w-28 text-right">Giá nhập</th>
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
                                            <th colSpan={6} />
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {detail?.items && detail.items.length > 0 ? (
                                            detail.items.filter(matchItemSearch).length === 0 ? (
                                              <tr>
                                                <td colSpan={9} className="py-6 text-center text-xs text-slate-400">
                                                  Không có mặt hàng nào phù hợp
                                                </td>
                                              </tr>
                                            ) : detail.items.filter(matchItemSearch).map((item, i) => (
                                              <tr key={item.grItemId || i} className="hover:bg-slate-50/70">
                                                <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                                                <td className="py-2 px-3 font-mono font-semibold">
                                                  <ProductCodeLink code={item.productCode} productId={item.productId} />
                                                </td>
                                                <td className="py-2 px-3 font-medium text-[#15171a]">{item.productName}</td>
                                                <td className="py-2 px-3 text-center text-slate-500">{item.unit || 'Cái'}</td>
                                                <td className="py-2 px-3 text-right font-mono font-medium">{item.quantity.toLocaleString('vi-VN')}</td>
                                                <td className="py-2 px-3 text-right font-mono">{currencyFormatter.format(item.unitPrice)} đ</td>
                                                <td className="py-2 px-3 text-right font-mono" title={item.discountPercent > 0 ? `Giảm ${item.discountPercent}%` : undefined}>
                                                  {currencyFormatter.format(lineDiscountPerUnit(item))} đ
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-medium text-slate-800">
                                                  {currencyFormatter.format(lineImportPrice(item))} đ
                                                </td>
                                                <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                                                  {currencyFormatter.format(item.totalPrice)} đ
                                                </td>
                                              </tr>
                                            ))
                                          ) : (
                                            <tr>
                                              <td colSpan={9} className="py-6 text-center text-xs text-slate-400">
                                                Phiếu chưa có danh sách mặt hàng
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>

                                    {/* Bottom area: Notes + Financial Summary */}
                                    <div className="flex items-start gap-6 mb-4">
                                      <div className="flex-1">
                                        <label className="text-xs text-slate-500 font-medium block mb-1">Ghi chú phiếu nhập</label>
                                        <div className="p-2.5 text-xs border border-slate-200 rounded-[8px] bg-slate-50/60 min-h-[60px] text-slate-700">
                                          {record.notes || 'Không có ghi chú nào.'}
                                        </div>
                                      </div>

                                      <div className="w-72 shrink-0 space-y-1.5 text-xs bg-slate-50/60 p-3 rounded-[8px] border border-slate-200">
                                        <div className="flex justify-between text-slate-600">
                                          <span>Số lượng mặt hàng:</span>
                                          <span className="font-semibold text-slate-800">{detail?.items?.length ?? record.totalItemsCount}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                          <span>Tổng tiền hàng:</span>
                                          <span className="font-semibold text-slate-800">
                                            {currencyFormatter.format(detail?.totalGoodsAmount ?? record.totalAmount)} đ
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                          <span>Giảm giá:</span>
                                          <span className="font-medium text-slate-800">{currencyFormatter.format(detail?.discountAmount ?? 0)} đ</span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                          <span>Tổng cộng:</span>
                                          <span className="font-semibold text-slate-800">
                                            {currencyFormatter.format(detail?.totalAmount ?? record.totalAmount)} đ
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-slate-600">
                                          <span>Tiền đã trả NCC:</span>
                                          <span className="font-medium text-emerald-600">{currencyFormatter.format(detail?.paidAmount ?? record.paidAmount)} đ</span>
                                        </div>
                                        {!isCanceled && (detail?.returnOffsetAmount ?? 0) > 0 && (
                                          <div
                                            className="flex justify-between text-slate-600"
                                            title="Phiếu trả hàng nhập NCC chưa hoàn tiền mặt được trừ thẳng vào số còn nợ của phiếu nhập này"
                                          >
                                            <span>Trả hàng nhập (trừ công nợ):</span>
                                            <span className="font-medium text-amber-600">
                                              {currencyFormatter.format(detail?.returnOffsetAmount ?? 0)} đ
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1.5 font-bold">
                                          <span>Cần trả NCC:</span>
                                          <span className={!isCanceled && (detail?.debtAmount ?? record.debtAmount) > 0 ? 'text-rose-600' : 'text-slate-800'}>
                                            {currencyFormatter.format(isCanceled ? 0 : detail?.debtAmount ?? record.debtAmount)} đ
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Buttons matching KiotViet standard */}
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                      <div className="flex items-center gap-2">
                                        {!isCanceled && (
                                          <button
                                            type="button"
                                            onClick={() => openCancelModal(record)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-[8px] transition cursor-pointer border border-rose-200 bg-white"
                                          >
                                            <Trash2 size={13} />
                                            <span>Hủy</span>
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handleDuplicatePurchase(record)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#15171a] hover:bg-[#f7f8f9] rounded-[8px] transition cursor-pointer border border-slate-300 bg-white"
                                        >
                                          <Copy size={13} />
                                          <span>Sao chép</span>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={exportSummaryExcel}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#15171a] hover:bg-[#f7f8f9] rounded-[8px] transition cursor-pointer border border-slate-300 bg-white"
                                        >
                                          <FileDown size={13} />
                                          <span>Xuất file</span>
                                        </button>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {!isCanceled && (
                                          <button
                                            type="button"
                                            onClick={() => router.push(`/purchases/create?edit=${record.grId}`)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#0070f4] hover:bg-blue-50 rounded-[8px] transition cursor-pointer border border-[#0070f4]/40 bg-white font-medium"
                                            title="Mở phiếu để chỉnh sửa"
                                          >
                                            <Pencil size={13} />
                                            <span>Mở phiếu</span>
                                          </button>
                                        )}
                                        {!isDraft && !isCanceled && (
                                          <button
                                            type="button"
                                            onClick={() => router.push(`/purchase-returns/create?grId=${record.grId}`)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#15171a] hover:bg-[#f7f8f9] rounded-[8px] transition cursor-pointer border border-slate-300 bg-white font-medium"
                                            title="Trả hàng của phiếu nhập này cho nhà cung cấp"
                                          >
                                            <Undo2 size={13} />
                                            <span>Trả hàng nhập</span>
                                          </button>
                                        )}
                                        {isDraft && (
                                          <>

                                            <button
                                              type="button"
                                              onClick={() => openCompleteModal(record)}
                                              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold transition cursor-pointer shadow-xs"
                                            >
                                              <CheckCircle2 size={14} />
                                              <span>Nhập hàng (Hoàn thành)</span>
                                            </button>
                                          </>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => handlePrintPurchase(record)}
                                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-[#f7f8f9] rounded-[8px] transition cursor-pointer border border-slate-300 bg-white"
                                        >
                                          <Printer size={13} />
                                          <span>In phiếu</span>
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

          {/* Footer Bar & Pagination */}
          <footer className="min-h-10 bg-white/82 backdrop-blur-[2px] border-t border-slate-200 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[12px] text-[#677484] shrink-0">
            <div className="flex items-center gap-3">
              <div>
                Hiển thị <strong className="text-[#15171a] font-bold">{pagedItems.length}</strong> trên{' '}
                <strong className="text-[#15171a] font-bold">{filtered.length}</strong> phiếu nhập
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-6 rounded border border-slate-200 bg-white px-1.5 text-xs text-[#15171a] outline-none cursor-pointer"
                >
                  <option value={15}>15 dòng</option>
                  <option value={30}>30 dòng</option>
                  <option value={50}>50 dòng</option>
                  <option value={100}>100 dòng</option>
                </select>
                {selectedRowKeys.length > 0 && (
                  <span className="text-[#0070f4] font-medium">(Đã chọn {selectedRowKeys.length})</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Pagination controls */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page <= 1}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Trang đầu"
                >
                  <ChevronsLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Trang trước"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="px-2 text-xs text-[#15171a] font-medium">
                  {page} / {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                  disabled={page >= pageCount}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Trang tiếp"
                >
                  <ChevronRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(pageCount)}
                  disabled={page >= pageCount}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Trang cuối"
                >
                  <ChevronsRight size={13} />
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* ─── Modal 1: Xác nhận Hoàn thành phiếu tạm (DRAFT -> COMPLETED) ─── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base text-slate-800">
            <CheckCircle2 size={20} className="text-[#0070f4]" />
            <span>Xác nhận hoàn thành nhập kho</span>
          </div>
        }
        open={Boolean(completingRecord)}
        onCancel={() => setCompletingRecord(null)}
        onOk={handleConfirmComplete}
        confirmLoading={isSubmittingAction}
        okText="Hoàn thành & Cập nhật kho"
        cancelText="Đóng"
        okButtonProps={{ style: { backgroundColor: '#0070f4' } }}
      >
        {completingRecord && (
          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-slate-700">
              <p>Mã phiếu: <strong className="font-mono text-blue-700">{completingRecord.grCode}</strong></p>
              <p className="mt-1">Nhà cung cấp: <strong>{completingRecord.partnerName}</strong></p>
              <p className="mt-1">Kho nhập: <strong>{completingRecord.warehouseName}</strong></p>
              <p className="mt-1">Tổng tiền hàng: <strong className="text-base text-blue-700">{currencyFormatter.format(completingRecord.totalAmount)} đ</strong></p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Tiền trả nhà cung cấp (đ)</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={completePaidAmount}
                onChange={(e) => setCompletePaidAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500 font-medium"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Công nợ còn lại sau thanh toán: <strong>{currencyFormatter.format(Math.max(0, completingRecord.totalAmount - completePaidAmount))} đ</strong>
              </p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Phương thức thanh toán</label>
              <Radio.Group
                value={completePaymentMethod}
                onChange={(e) => setCompletePaymentMethod(e.target.value)}
                className="flex gap-4"
              >
                <Radio value="CASH">Tiền mặt</Radio>
                <Radio value="BANK_TRANSFER">Chuyển khoản</Radio>
              </Radio.Group>
            </div>

            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
              Hệ thống sẽ cộng dồn số lượng vào tồn kho thực tế và áp dụng công thức <strong>Giá vốn bình quân gia quyền (WAC)</strong> cho các mặt hàng trong phiếu.
            </div>
          </div>
        )}
      </Modal>

      {/* ─── Modal 2: Xác nhận Hủy phiếu tạm ─── */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base text-rose-600">
            <AlertTriangle size={20} />
            <span>Xác nhận hủy phiếu nhập hàng</span>
          </div>
        }
        open={Boolean(cancellingRecord)}
        onCancel={() => setCancellingRecord(null)}
        onOk={handleConfirmCancel}
        confirmLoading={isSubmittingAction}
        okText="Hủy phiếu này"
        cancelText="Đóng"
        okButtonProps={{ danger: true }}
      >
        {cancellingRecord && (
          <div className="space-y-3 py-2 text-xs">
            <p className="text-slate-700">
              Bạn có chắc chắn muốn hủy phiếu nhập hàng <strong className="font-mono text-slate-900">{cancellingRecord.grCode}</strong> của nhà cung cấp <strong>{cancellingRecord.partnerName}</strong>?
            </p>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Lý do hủy (không bắt buộc)</label>
              <input
                type="text"
                placeholder="Ví dụ: Nhập nhầm mặt hàng, NCC hủy giao..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-red-400"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Phiếu sau khi hủy sẽ chuyển sang trạng thái <strong>Đã hủy</strong> và không thể thay đổi thông tin.
              {cancellingRecord.status === 'COMPLETED' && (
                <> Hàng đã nhập sẽ bị <strong>trừ khỏi tồn kho</strong>, khoản trả lúc nhập bị hủy và công nợ nhà cung cấp được giảm tương ứng.</>
              )}
            </p>
          </div>
        )}
      </Modal>

      {/* ─── Modal 4: Thiết lập giá cho hàng nhập (Existing Feature) ─── */}
      {priceDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-3 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPriceDialogOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-price-dialog-title"
            className="flex max-h-full w-full max-w-[1200px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between px-4 py-3">
              <h2 id="purchase-price-dialog-title" className="text-sm font-semibold text-slate-800">
                Thiết lập giá cho hàng nhập
              </h2>
              <button
                type="button"
                onClick={() => setPriceDialogOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </header>

            <div className="flex items-center gap-2 border-y border-slate-200 px-4 py-2.5 text-xs">
              <label htmlFor="purchase-price-list" className="shrink-0 text-slate-600">
                Chọn bảng giá áp dụng
              </label>
              <select
                id="purchase-price-list"
                value={selectedPriceList}
                onChange={(event) => setSelectedPriceList(event.target.value)}
                className="h-7 min-w-0 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500"
              >
                <option>Bảng giá chung</option>
                <option>Bảng giá bán lẻ</option>
                <option>Bảng giá đại lý</option>
              </select>
            </div>

            <div className="overflow-auto px-4">
              <table className="w-full min-w-[520px] table-fixed text-xs text-slate-700">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="w-[42%] py-2 pr-2 font-semibold">Tên hàng</th>
                    <th className="w-[18%] py-2 px-2 font-semibold">Giá vốn</th>
                    <th className="w-[20%] py-2 px-2 font-semibold">Giá nhập cuối</th>
                    <th className="w-[20%] py-2 pl-2 text-right font-semibold">Giá bán chung</th>
                  </tr>
                </thead>
                <tbody>
                  {priceSettingItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200 last:border-b-0">
                      <td className="py-2 pr-2 leading-4">{item.name}</td>
                      <td className="px-2 py-2">{currencyFormatter.format(item.costPrice)}</td>
                      <td className="px-2 py-2">{currencyFormatter.format(item.lastPurchasePrice)}</td>
                      <td className="py-1.5 pl-2">
                        <input
                          type="number"
                          min="0"
                          value={priceValues[item.id] ?? String(item.salePrice)}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPriceValues((current) => ({ ...current, [item.id]: value }));
                            setPriceSettingItems((current) =>
                              current.map((priceItem) =>
                                priceItem.id === item.id
                                  ? { ...priceItem, salePrice: Number(value) || 0 }
                                  : priceItem
                              )
                            );
                          }}
                          aria-label={`Giá bán chung: ${item.name}`}
                          className="h-[22px] w-full rounded border border-slate-300 px-2 text-right text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="flex justify-end gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setPriceDialogOpen(false)}
                className="h-8 rounded border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-50"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => {
                  setPriceDialogOpen(false);
                  message.success(`Đã cập nhật giá theo ${selectedPriceList}`);
                }}
                className="h-8 rounded-[8px] bg-[#0070f4] px-3 text-xs font-medium text-white hover:bg-[#005ac3] transition"
              >
                Xong
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
