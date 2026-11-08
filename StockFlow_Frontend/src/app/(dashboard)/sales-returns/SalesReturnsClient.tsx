// src/app/(dashboard)/sales-returns/SalesReturnsClient.tsx
// Màn hình Trả hàng (khách trả lại hàng đã mua) — cùng bố cục với Đặt hàng / Hóa đơn:
// Header 48px (tiêu đề + tìm kiếm + "+ Trả hàng" + Xuất file) → [Sidebar bộ lọc | Bảng] → footer phân trang.
// "+ Trả hàng": chọn hóa đơn gốc (BR-18) rồi mở form tạo phiếu trả.
// Hiện mới dựng giao diện: danh sách phiếu trả chưa nối API (chưa có nghiệp vụ lưu phiếu).

'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileDown, Inbox, Plus, Search, X } from 'lucide-react';

import SalesReturnFilterSidebar from '@/features/sales-returns/components/SalesReturnFilterSidebar';
import SelectInvoiceModal from '@/features/sales-returns/components/SelectInvoiceModal';
import type { SalesReturnListItem, SalesReturnSidebarState } from '@/features/sales-returns/types';
import { formatVnd, RETURN_DEFAULT_STATUSES, RETURN_STATUS } from '@/features/sales-returns/utils/salesReturnUtils';
import { formatDateTimeVN } from '@/features/transfers/utils/dateUtils';
import { getTimeRangeForPreset } from '@/components/filters/TimeRangeFilter';
import { PartnerLink } from '@/components/links/EntityLinks';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';

const COLUMN_COUNT = 10;
const thCls = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';
const checkboxCls = 'rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer';

function defaultSidebar(warehouseId: number): SalesReturnSidebarState {
  const month = getTimeRangeForPreset('this_month');
  return {
    warehouseIds: [warehouseId],
    statuses: [...RETURN_DEFAULT_STATUSES],
    timeRange: month.timeRange,
    dateFrom: month.dateFrom,
    dateTo: month.dateTo,
  };
}

export default function SalesReturnsClient() {
  const router = useRouter();
  const { activeWarehouse, warehouses } = useActiveWarehouse();
  const [sidebar, setSidebar] = useState<SalesReturnSidebarState>(() => defaultSidebar(activeWarehouse.warehouseId));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  // TODO(nghiệp vụ trả hàng): nạp danh sách phiếu trả theo bộ lọc khi có API /api/sales-returns
  const rows = useMemo<SalesReturnListItem[]>(() => [], []);
  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({ goods: a.goods + r.totalGoodsAmount, total: a.total + r.totalAmount, refund: a.refund + r.refundAmount }),
        { goods: 0, total: 0, refund: 0 }
      ),
    [rows]
  );

  const changeSidebar = (patch: Partial<SalesReturnSidebarState>) => setSidebar((prev) => ({ ...prev, ...patch }));

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f5f5f5] overflow-hidden select-none text-[13px] text-[#15171a] font-sans">
      {/* 1. Header */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <h1 className="text-[20px] font-bold text-[#15171a] leading-7 tracking-tight whitespace-nowrap">Trả hàng</h1>
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Theo mã phiếu trả, mã hóa đơn, khách hàng"
              className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] hover:text-[#15171a] cursor-pointer"
                title="Xóa từ khóa"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Trả hàng</span>
          </button>
          <button
            type="button"
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] font-medium text-[13px] transition cursor-pointer bg-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
          </button>
        </div>
      </header>

      {/* 2. Bộ lọc + bảng */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <SalesReturnFilterSidebar
          state={sidebar}
          warehouses={warehouses}
          fallbackWarehouseId={activeWarehouse.warehouseId}
          onChange={changeSidebar}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
        />

        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1080px]">
              <thead className="bg-[#f7f8f9] sticky top-0 z-20 border-b border-slate-200 text-[12px] font-semibold text-[#677484] shadow-xs">
                <tr>
                  <th className={`${thCls} w-10 text-center`}>
                    <input type="checkbox" disabled={rows.length === 0} className={checkboxCls} />
                  </th>
                  <th className={thCls}>Mã trả hàng</th>
                  <th className={thCls}>Người bán</th>
                  <th className={thCls}>Thời gian</th>
                  <th className={thCls}>Mã KH</th>
                  <th className={thCls}>Khách hàng</th>
                  <th className={`${thCls} text-right`}>Tổng tiền hàng</th>
                  <th className={`${thCls} text-right`}>Cần trả khách</th>
                  <th className={`${thCls} text-right`}>Đã trả khách</th>
                  <th className={thCls}>Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.length > 0 && (
                  <tr className="bg-white border-b border-slate-200 font-bold text-[13px]">
                    <td colSpan={6}></td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatVnd(totals.goods)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatVnd(totals.total)}</td>
                    <td className="py-2.5 px-3 text-right font-mono">{formatVnd(totals.refund)}</td>
                    <td></td>
                  </tr>
                )}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={COLUMN_COUNT} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                          <Inbox size={32} className="stroke-[1.5]" />
                        </div>
                        <h3 className="font-bold text-sm mb-1">Không tìm thấy kết quả</h3>
                        <p className="text-xs text-[#677484] max-w-sm">
                          Không tìm thấy phiếu trả hàng nào phù hợp. Bấm{' '}
                          <button
                            type="button"
                            onClick={() => setPickerOpen(true)}
                            className="text-[#0070f4] font-semibold hover:underline cursor-pointer"
                          >
                            + Trả hàng
                          </button>{' '}
                          để chọn hóa đơn khách trả.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => {
                    const st = RETURN_STATUS[r.status];
                    return (
                      <tr key={r.returnId} className="hover:bg-[#f7f8f9] transition cursor-pointer border-b border-slate-100">
                        <td className="py-2.5 px-3 text-center">
                          <input type="checkbox" className={checkboxCls} />
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#0070f4] whitespace-nowrap">{r.returnCode}</td>
                        <td className="py-2.5 px-3">{r.sellerName}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(r.returnDate)}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{r.partnerCode}</td>
                        <td className="py-2.5 px-3">
                          <PartnerLink kind="customer" code={r.partnerCode} partnerId={r.partnerId}>
                            {r.partnerName}
                          </PartnerLink>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatVnd(r.totalGoodsAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatVnd(r.totalAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{formatVnd(r.refundAmount)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${st.cls}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <footer className="h-10 bg-white border-t border-slate-200 px-4 flex items-center text-[12px] text-[#677484] shrink-0">
            Hiển thị <strong className="mx-1 text-[#15171a]">{rows.length}</strong> phiếu trả hàng
          </footer>
        </div>
      </div>

      <SelectInvoiceModal
        open={pickerOpen}
        warehouseId={activeWarehouse.warehouseId}
        onClose={() => setPickerOpen(false)}
        onSelect={(orderId) => {
          setPickerOpen(false);
          router.push(`/sales-returns/create?invoice=${orderId}`);
        }}
      />
    </div>
  );
}
