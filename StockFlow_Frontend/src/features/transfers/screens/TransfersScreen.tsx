// src/features/transfers/screens/TransfersScreen.tsx
// Màn hình 1: Danh sách phiếu chuyển hàng chuẩn theo giao diện KiotViet Ảnh 1

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { linkDateFilter, readDocumentLink, scrollToWhenReady } from '@/lib/navigation/documentLink';
import {
  Search,
  Plus,
  FileDown,
  FileUp,
  SlidersHorizontal,
  Star,
  PhoneCall,
  Inbox,
  RefreshCw,
  Check,
} from 'lucide-react';
import { TransferFilterSidebar } from '@/features/transfers/components/TransferFilterSidebar';
import { TransferRowDetail } from '@/features/transfers/components/TransferRowDetail';
import { ReceiveTransferScreen } from '@/features/transfers/components/ReceiveTransferScreen';
import { transferService } from '@/features/transfers/services/transferService';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import {
  TransferRecord,
  TransferDetail,
  TransferFilterState,
  TransferStatus,
} from '@/features/transfers/types';
import { WarehouseFacility } from '@/features/admin/types';
import { exportTransfersListToExcel } from '@/features/transfers/utils/transferExportUtils';
import { adminService } from '@/features/admin/services/adminService';
import { formatDateTimeVN, getDateRangeForPreset } from '@/features/transfers/utils/dateUtils';

const statusBadgeConfig: Record<
  TransferStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  DRAFT: {
    label: 'Phiếu tạm',
    bg: 'bg-[#e6f1fe]',
    text: 'text-[#0070f4]',
    border: 'border-[#0070f4]/25',
  },
  IN_TRANSIT: {
    label: 'Đang chuyển',
    bg: 'bg-[#fffbeb]',
    text: 'text-[#d97706]',
    border: 'border-[#fde68a]',
  },
  RECEIVED: {
    label: 'Đã nhận',
    bg: 'bg-[#e6f8ec]',
    text: 'text-[#16a34a]',
    border: 'border-[#bbf7d0]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-[#fef2f2]',
    text: 'text-[#fb2c36]',
    border: 'border-[#fecaca]',
  },
};

export default function TransfersScreen() {
  const router = useRouter();

  // Link mở thẳng 1 phiếu (?code=&id=&date=, VD từ Thẻ kho)
  const searchParams = useSearchParams();
  const [docLink] = useState(() => readDocumentLink(searchParams));

  // State bộ lọc chuẩn ảnh 1 KiotViet
  const [filters, setFilters] = useState<TransferFilterState>(() => {
    if (docLink) {
      const { timeRange, dateFrom, dateTo } = linkDateFilter(docLink.date);
      return {
        sourceWarehouseId: 'ALL',
        destWarehouseId: 'ALL',
        statuses: ['DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
        matchStatus: 'ALL',
        dateType: 'transfer',
        timeRange,
        dateFrom,
        dateTo,
        search: docLink.code,
      };
    }
    const range = getDateRangeForPreset('this_month');
    return {
      sourceWarehouseId: 'ALL',
      destWarehouseId: 'ALL',
      statuses: ['DRAFT', 'IN_TRANSIT', 'RECEIVED'],
      matchStatus: 'ALL',
      dateType: 'transfer',
      timeRange: 'this_month',
      dateFrom: range.from,
      dateTo: range.to,
      search: '',
    };
  });

  const [warehouses, setWarehouses] = useState<WarehouseFacility[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Drawer & Modal states
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(() => docLink?.id ?? null);

  // Mở thẳng phiếu theo link: cuộn tới dòng (chi tiết phiếu tự tải trong TransferRowDetail)
  useEffect(() => {
    if (!docLink?.id) return;
    return scrollToWhenReady(`[data-doc-row="${docLink.id}"]`);
  }, [docLink]);
  const [receiveModalTransfer, setReceiveModalTransfer] = useState<TransferDetail | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [facs, list] = await Promise.all([
        adminService.getWarehouseFacilities(),
        transferService.getTransfers(filters),
      ]);
      setWarehouses(facs);
      setTransfers(list);
    } catch (err) {
      console.error('Failed to load transfers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleUpdateFilters = (updated: Partial<TransferFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updated }));
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.length === transfers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transfers.map((t) => t.id));
    }
  };

  const handleToggleSelect = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } else {
      setSelectedIds((prev) => [...prev, id]);
    }
  };

  const handleToggleStar = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStarred = transferService.toggleStar(id);
    setTransfers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isStarred: newStarred } : t))
    );
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f5f5f5] overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header Toolbar Bar (Theo đúng thiết kế KiotViet) */}
      <header className="min-h-12 bg-white border-b border-slate-200 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 shrink-0">
        {/* Left: Title & Search bar */}
        <div className="flex items-center gap-4 flex-1 basis-[320px] min-w-[260px] max-w-xl">
          <h1 className="text-[20px] font-bold text-[#15171a] leading-7 tracking-tight whitespace-nowrap">
            Chuyển hàng
          </h1>

          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleUpdateFilters({ search: e.target.value })}
              placeholder="Theo mã phiếu chuyển"
              className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] hover:text-[#15171a]"
              title="Bộ lọc nâng cao"
            >
              <SlidersHorizontal size={13} />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút + Chuyển hàng */}
          <Link
            href="/transfers/create"
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Chuyển hàng</span>
          </Link>

          {/* Import file */}
          <button
            type="button"
            onClick={() => alert('Chức năng nhập file Excel đang được đồng bộ')}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] font-medium text-[13px] transition cursor-pointer bg-white"
          >
            <FileUp size={14} className="text-[#677484]" />
            <span>Import file</span>
          </button>

          {/* Xuất file */}
          <button
            type="button"
            onClick={() => exportTransfersListToExcel(transfers)}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] font-medium text-[13px] transition cursor-pointer bg-white"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
            <span className="text-[10px]">▾</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace: Sidebar & Table */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar bộ lọc */}
        <TransferFilterSidebar
          filters={filters}
          onChange={handleUpdateFilters}
          warehouses={warehouses}
        />

        {/* Data Table Workspace */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-[#f7f8f9] sticky top-0 z-20 border-b border-slate-200 text-[12px] font-semibold text-[#677484] shadow-xs">
                <tr>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 w-10 text-center border-b border-slate-200">
                    <input
                      type="checkbox"
                      checked={
                        transfers.length > 0 && selectedIds.length === transfers.length
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-2 w-8 text-center border-b border-slate-200">
                    <Star size={13} className="text-[#677484] mx-auto" />
                  </th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200">Mã chuyển hàng</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200">Ngày chuyển</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200">Ngày nhận</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200">Từ chi nhánh</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200">Tới chi nhánh</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 text-right border-b border-slate-200">Giá trị chuyển</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 text-center border-b border-slate-200">Trạng thái</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* Dòng tổng giá trị chuyển theo đúng Ảnh 1 & Ảnh 2 */}
                {transfers.length > 0 && !loading && (
                  <tr className="bg-white border-b border-slate-200 font-bold text-[#15171a] text-[13px]">
                    <td colSpan={7}></td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-[#15171a]">
                      {transfers.reduce((sum, t) => sum + (t.totalAmount || 0), 0).toLocaleString('vi-VN')}
                    </td>
                    <td></td>
                  </tr>
                )}

                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-[#677484]">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải danh sách phiếu chuyển hàng...
                    </td>
                  </tr>
                ) : transfers.length === 0 ? (
                  // Empty State theo đúng thiết kế
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
                          Không tìm thấy giao dịch nào phù hợp trong tháng này.{' '}
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateFilters({
                                sourceWarehouseId: 'ALL',
                                destWarehouseId: 'ALL',
                                statuses: ['DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'],
                                search: '',
                              })
                            }
                            className="text-[#0070f4] hover:text-[#005ac3] font-semibold hover:underline cursor-pointer"
                          >
                            Nhấn vào đây
                          </button>{' '}
                          để tiếp tục tìm kiếm.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => {
                    const isSelected = selectedIds.includes(t.id);
                    const isExpanded = selectedTransferId === t.id;
                    const statusCfg = statusBadgeConfig[t.status];
                    return (
                      <React.Fragment key={t.id}>
                        <tr
                          data-doc-row={t.id}
                          onClick={() => setSelectedTransferId(isExpanded ? null : t.id)}
                          className={`hover:bg-[#f7f8f9] transition cursor-pointer select-none border-b border-slate-100 ${
                            isExpanded ? 'bg-[#e6f1fe]/80 font-medium' : isSelected ? 'bg-[#e6f1fe]/50' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelect(t.id, e as any)}
                              className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                            />
                          </td>

                          {/* Star */}
                          <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={(e) => handleToggleStar(t.id, e)}
                              className="text-slate-300 hover:text-amber-400 transition cursor-pointer"
                            >
                              <Star
                                size={14}
                                className={
                                  t.isStarred
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'hover:fill-amber-200'
                                }
                              />
                            </button>
                          </td>

                          {/* Mã chuyển hàng */}
                          <td
                            className={`py-2.5 px-3 font-mono font-bold hover:underline ${
                              t.status === 'RECEIVED' &&
                              (t.isMatched === false ||
                                (t.totalReceivedQuantity !== null &&
                                  t.totalReceivedQuantity !== undefined &&
                                  t.totalReceivedQuantity < t.totalQuantity))
                                ? 'text-[#fb2c36]'
                                : 'text-[#0070f4] hover:text-[#005ac3]'
                            }`}
                            title={
                              t.status === 'RECEIVED' &&
                              (t.isMatched === false ||
                                (t.totalReceivedQuantity !== null &&
                                  t.totalReceivedQuantity !== undefined &&
                                  t.totalReceivedQuantity < t.totalQuantity))
                                ? 'Nhận thiếu hàng (Không khớp)'
                                : undefined
                            }
                          >
                            {t.code}
                          </td>

                          {/* Ngày chuyển */}
                          <td className="py-2.5 px-3 text-[#677484] font-mono text-[12px]">
                            {formatDateTimeVN(t.transferDate)}
                          </td>

                          {/* Ngày nhận */}
                          <td className="py-2.5 px-3 text-[#677484] font-mono text-[12px]">
                            {formatDateTimeVN(t.receivedDate)}
                          </td>

                          {/* Từ chi nhánh */}
                          <td className="py-2.5 px-3 text-[#15171a] font-normal text-[13px]">
                            {t.sourceWarehouseName}
                          </td>

                          {/* Tới chi nhánh */}
                          <td className="py-2.5 px-3 text-[#15171a] font-normal text-[13px]">
                            {t.destWarehouseName}
                          </td>

                          {/* Giá trị chuyển */}
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-[#15171a]">
                            {t.totalAmount > 0
                              ? `${t.totalAmount.toLocaleString('vi-VN')}`
                              : '—'}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                            >
                              {statusCfg.label}
                            </span>
                          </td>
                        </tr>

                        {/* Chi tiết phiếu dạng Accordion ngay dưới dòng theo Ảnh 2 & Ảnh 3 */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="p-0 border-b-2 border-[#0070f4] bg-white">
                              <TransferRowDetail
                                transferId={t.id}
                                onRefresh={loadData}
                                onOpenReceiveScreen={(detail) => setReceiveModalTransfer(detail)}
                                warehouses={warehouses}
                              />
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

          {/* Footer Bar */}
          <footer className="min-h-10 bg-white border-t border-slate-200 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-[12px] text-[#677484] shrink-0">
            <div>
              Hiển thị <strong className="text-[#15171a] font-bold">{transfers.length}</strong> trên{' '}
              <strong className="text-[#15171a] font-bold">{transfers.length}</strong> giao dịch
            </div>
          </footer>
        </div>
      </div>

      {/* Màn hình Nhận hàng (Phiếu nhận hàng) mở khi bấm nút [Mở phiếu] theo đúng Ảnh 4 */}
      {receiveModalTransfer && (
        <ReceiveTransferScreen
          transfer={receiveModalTransfer}
          onClose={() => setReceiveModalTransfer(null)}
          onSuccess={() => {
            setReceiveModalTransfer(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
