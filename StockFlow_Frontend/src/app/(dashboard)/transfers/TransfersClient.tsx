// src/app/(dashboard)/transfers/TransfersClient.tsx
// Màn hình 1: Danh sách phiếu chuyển hàng chuẩn theo giao diện KiotViet Ảnh 1

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  FileDown,
  FileUp,
  Columns,
  Settings,
  HelpCircle,
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
import { WarehouseFacility } from '@/features/roles/types';
import { exportTransfersListToExcel } from '@/features/transfers/utils/transferExportUtils';
import { adminService } from '@/features/roles/services/adminService';
import { formatDateTimeVN } from '@/features/transfers/utils/dateUtils';

const statusBadgeConfig: Record<
  TransferStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  DRAFT: {
    label: 'Phiếu tạm',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  IN_TRANSIT: {
    label: 'Đang chuyển',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  RECEIVED: {
    label: 'Đã nhận',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export default function TransfersClient() {
  const router = useRouter();

  // State bộ lọc chuẩn ảnh 1 KiotViet
  const [filters, setFilters] = useState<TransferFilterState>({
    sourceWarehouseId: 'ALL',
    destWarehouseId: 'ALL',
    statuses: ['DRAFT', 'IN_TRANSIT', 'RECEIVED'],
    matchStatus: 'ALL',
    dateType: 'transfer',
    timeRange: 'this_month',
    search: '',
  });

  const [warehouses, setWarehouses] = useState<WarehouseFacility[]>([]);
  const [transfers, setTransfers] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Drawer & Modal states
  const [selectedTransferId, setSelectedTransferId] = useState<number | null>(null);
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
    <div className="flex-1 flex flex-col bg-[#f4f6f8] min-h-[calc(100vh-56px)] select-none text-xs text-slate-800">
      {/* 1. Header Toolbar Bar (Theo đúng thiết kế Ảnh 1) */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Title & Search bar */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <h1 className="text-base font-bold text-slate-900 tracking-tight whitespace-nowrap">
            Chuyển hàng
          </h1>

          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleUpdateFilters({ search: e.target.value })}
              placeholder="Theo mã phiếu chuyển"
              className="w-full h-8 pl-8 pr-8 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              title="Bộ lọc nâng cao"
            >
              <SlidersHorizontal size={13} />
            </button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Nút + Chuyển hàng */}
          <Link
            href="/transfers/create"
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-[#0070F4] hover:bg-[#0062D6] text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Chuyển hàng</span>
          </Link>

          {/* Import file */}
          <button
            type="button"
            onClick={() => alert('Chức năng nhập file Excel đang được đồng bộ')}
            className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
          >
            <FileUp size={14} className="text-slate-500" />
            <span>Import file</span>
          </button>

          {/* Xuất file */}
          <button
            type="button"
            onClick={() => exportTransfersListToExcel(transfers)}
            className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
          >
            <FileDown size={14} className="text-slate-500" />
            <span>Xuất file</span>
            <span className="text-[10px]">▾</span>
          </button>

          {/* Icon tiện ích */}
          <div className="flex items-center gap-1 ml-1 pl-2 border-l border-slate-200">
            <button
              type="button"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              title="Ẩn/hiện cột hiển thị"
            >
              <Columns size={14} />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              title="Cài đặt bảng"
            >
              <Settings size={14} />
            </button>
            <button
              type="button"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition cursor-pointer"
              title="Trợ giúp"
            >
              <HelpCircle size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* 2. Main Workspace: Sidebar & Table */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar bộ lọc */}
        <TransferFilterSidebar
          filters={filters}
          onChange={handleUpdateFilters}
          warehouses={warehouses}
        />

        {/* Data Table Workspace */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-[#f0f4f8] sticky top-0 z-10 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        transfers.length > 0 && selectedIds.length === transfers.length
                      }
                      onChange={handleToggleSelectAll}
                      className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-2 w-8 text-center">
                    <Star size={13} className="text-slate-400 mx-auto" />
                  </th>
                  <th className="py-2.5 px-3">Mã chuyển hàng</th>
                  <th className="py-2.5 px-3">Ngày chuyển</th>
                  <th className="py-2.5 px-3">Ngày nhận</th>
                  <th className="py-2.5 px-3">Từ chi nhánh</th>
                  <th className="py-2.5 px-3">Tới chi nhánh</th>
                  <th className="py-2.5 px-3 text-right">Giá trị chuyển</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {/* Dòng tổng giá trị chuyển theo đúng Ảnh 1 & Ảnh 2 */}
                {transfers.length > 0 && !loading && (
                  <tr className="bg-white border-b border-slate-200 font-bold text-slate-800">
                    <td colSpan={7}></td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {transfers.reduce((sum, t) => sum + (t.totalAmount || 0), 0).toLocaleString('vi-VN')}
                    </td>
                    <td></td>
                  </tr>
                )}

                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-20 text-center text-slate-400">
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-blue-500" />
                      Đang tải danh sách phiếu chuyển hàng...
                    </td>
                  </tr>
                ) : transfers.length === 0 ? (
                  // Empty State theo đúng thiết kế Ảnh 1
                  <tr>
                    <td colSpan={9} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mb-3">
                          <Inbox size={32} className="stroke-[1.5]" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mb-1">
                          Không tìm thấy kết quả
                        </h3>
                        <p className="text-xs text-slate-400 max-w-sm">
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
                            className="text-blue-600 font-semibold hover:underline cursor-pointer"
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
                          onClick={() => setSelectedTransferId(isExpanded ? null : t.id)}
                          className={`hover:bg-blue-50/50 transition cursor-pointer select-none ${
                            isExpanded ? 'bg-blue-50/90 font-medium' : isSelected ? 'bg-blue-50/80' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => handleToggleSelect(t.id, e as any)}
                              className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 border-slate-300 cursor-pointer"
                            />
                          </td>

                          {/* Star */}
                          <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
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
                          <td className="py-3 px-3 font-mono font-bold text-blue-700 hover:underline">
                            {t.code}
                          </td>

                          {/* Ngày chuyển */}
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                            {formatDateTimeVN(t.transferDate)}
                          </td>

                          {/* Ngày nhận */}
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                            {formatDateTimeVN(t.receivedDate)}
                          </td>

                          {/* Từ chi nhánh */}
                          <td className="py-3 px-3 font-medium text-slate-800">
                            {t.sourceWarehouseName}
                          </td>

                          {/* Tới chi nhánh */}
                          <td className="py-3 px-3 font-medium text-slate-800">
                            {t.destWarehouseName}
                          </td>

                          {/* Giá trị chuyển */}
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                            {t.totalAmount > 0
                              ? `${t.totalAmount.toLocaleString('vi-VN')}`
                              : '—'}
                          </td>

                          {/* Trạng thái */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center justify-center gap-0.5">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                              >
                                {statusCfg.label}
                              </span>
                              {t.status === 'RECEIVED' && t.isMatched === false && (
                                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                                  Không khớp
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Chi tiết phiếu dạng Accordion ngay dưới dòng theo Ảnh 2 & Ảnh 3 */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="p-0 border-b-2 border-blue-500 bg-white">
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

          {/* Footer Bar with Hotline 1900 6522 */}
          <footer className="h-10 bg-slate-50 border-t border-slate-200 px-4 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
            <div>
              Hiển thị <strong className="text-slate-800">{transfers.length}</strong> trên{' '}
              <strong className="text-slate-800">{transfers.length}</strong> giao dịch
            </div>

            {/* Hotline Badge theo đúng Ảnh 1 */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0070F4] text-white font-bold text-xs shadow-xs">
              <PhoneCall size={12} />
              <span>1900 6522</span>
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
