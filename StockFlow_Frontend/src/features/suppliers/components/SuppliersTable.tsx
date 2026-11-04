'use client';

// Bảng danh sách Nhà cung cấp — cùng giao diện với bảng danh sách Chuyển hàng:
// header dính màu #f7f8f9, dòng tổng phía trên, badge trạng thái dạng pill,
// bấm vào dòng để mở chi tiết dạng accordion (thao tác nằm trong phần chi tiết).

import React from 'react';
import { ChevronLeft, ChevronRight, Inbox, RefreshCw } from 'lucide-react';
import { Supplier, SupplierDetail, WarehouseOption } from '../types';
import SupplierExpandedRow from './SupplierExpandedRow';
import { getSupplierStatusBadge } from '../utils/status';

const currencyFormatter = new Intl.NumberFormat('vi-VN');
const COLUMN_COUNT = 9;

interface SuppliersTableProps {
  loading: boolean;
  pagedItems: Supplier[];
  filteredCount: number;
  selectedWarehouse: WarehouseOption | null | undefined;
  totalPurchased: number;
  totalPayableDebt: number;
  selectedRowKeys: string[];
  onSelectRow: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  expandedRowKey: number | null;
  detailsCache: Record<number, SupplierDetail>;
  loadingDetailId: number | null;
  onRowClick: (sup: Supplier) => void;
  onEdit: (sup: Supplier) => void;
  onToggleStatus: (partnerId: number) => void;
  onDelete: (sup: Supplier) => void;
  onPaymentCreated: (partnerId: number, voucherCode: string) => void;
  onResetFilters: () => void;
  page: number;
  pageSize: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
}

const thCls = 'sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 border-b border-slate-200 whitespace-nowrap';

export default function SuppliersTable({
  loading,
  pagedItems,
  filteredCount,
  selectedWarehouse,
  totalPurchased,
  totalPayableDebt,
  selectedRowKeys,
  onSelectRow,
  onSelectAll,
  expandedRowKey,
  detailsCache,
  loadingDetailId,
  onRowClick,
  onEdit,
  onToggleStatus,
  onDelete,
  onPaymentCreated,
  onResetFilters,
  page,
  pageSize,
  pageCount,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
}: SuppliersTableProps) {
  const allPageSelected =
    pagedItems.length > 0 && pagedItems.every((s) => selectedRowKeys.includes(s.id));

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white">
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead className="bg-[#f7f8f9] sticky top-0 z-20 border-b border-slate-200 text-[12px] font-semibold text-[#677484] shadow-xs">
            <tr>
              <th className={`${thCls} w-10 text-center`}>
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                />
              </th>
              <th className={thCls}>Mã nhà cung cấp</th>
              <th className={thCls}>Tên nhà cung cấp</th>
              <th className={thCls}>Điện thoại</th>
              <th className={thCls}>Email</th>
              <th className={thCls}>Địa chỉ</th>
              <th className={`${thCls} text-right`}>Tổng mua</th>
              <th className={`${thCls} text-right`}>
                {selectedWarehouse ? `Nợ tại ${selectedWarehouse.code}` : 'Nợ cần trả'}
              </th>
              <th className={`${thCls} text-center`}>Trạng thái</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {/* Dòng tổng giống màn hình Chuyển hàng */}
            {pagedItems.length > 0 && !loading && (
              <tr className="bg-white border-b border-slate-200 font-bold text-[#15171a] text-[13px]">
                <td colSpan={6}></td>
                <td className="py-2.5 px-3 text-right font-mono font-bold text-[#15171a]">
                  {currencyFormatter.format(totalPurchased)}
                </td>
                <td
                  className={`py-2.5 px-3 text-right font-mono font-bold ${
                    totalPayableDebt > 0 ? 'text-[#fb2c36]' : 'text-[#15171a]'
                  }`}
                >
                  {currencyFormatter.format(totalPayableDebt)}
                </td>
                <td></td>
              </tr>
            )}

            {loading ? (
              <tr>
                <td colSpan={COLUMN_COUNT} className="py-20 text-center text-[#677484]">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                  Đang tải danh sách nhà cung cấp...
                </td>
              </tr>
            ) : pagedItems.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_COUNT} className="py-24 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                      <Inbox size={32} className="stroke-[1.5]" />
                    </div>
                    <h3 className="font-bold text-[#15171a] text-sm mb-1">Không tìm thấy kết quả</h3>
                    <p className="text-xs text-[#677484] max-w-sm">
                      Không tìm thấy nhà cung cấp nào phù hợp.{' '}
                      <button
                        type="button"
                        onClick={onResetFilters}
                        className="text-[#0070f4] hover:text-[#005ac3] font-semibold hover:underline cursor-pointer"
                      >
                        Nhấn vào đây
                      </button>{' '}
                      để xóa bộ lọc.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              pagedItems.map((sup) => {
                const isSelected = selectedRowKeys.includes(sup.id);
                const isExpanded = expandedRowKey === sup.partnerId;
                const payable =
                  (selectedWarehouse && sup.branchPayable !== undefined
                    ? sup.branchPayable
                    : sup.currentPayable) || 0;
                const badge = getSupplierStatusBadge(sup.status);

                return (
                  <React.Fragment key={sup.id}>
                    <tr
                      data-doc-row={sup.partnerId}
                      onClick={() => onRowClick(sup)}
                      className={`hover:bg-[#f7f8f9] transition cursor-pointer select-none border-b border-slate-100 ${
                        isExpanded ? 'bg-[#e6f1fe]/80 font-medium' : isSelected ? 'bg-[#e6f1fe]/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => onSelectRow(sup.id, e.target.checked)}
                          className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Mã NCC */}
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0070f4] hover:text-[#005ac3] hover:underline">
                        {sup.code}
                      </td>

                      {/* Tên NCC */}
                      <td className="py-2.5 px-3 text-[#15171a] text-[13px]">{sup.name}</td>

                      {/* Điện thoại */}
                      <td className="py-2.5 px-3 text-[#677484] font-mono text-[12px] whitespace-nowrap">{sup.phone || '—'}</td>

                      {/* Email */}
                      <td className="py-2.5 px-3 text-[#677484] text-[12px] truncate max-w-[170px]" title={sup.email}>{sup.email || '—'}</td>

                      {/* Địa chỉ */}
                      <td className="py-2.5 px-3 text-[#15171a] text-[13px] truncate max-w-[190px]" title={sup.address}>
                        {sup.address || '—'}
                      </td>

                      {/* Tổng mua */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-[#15171a]">
                        {sup.totalPurchased > 0 ? currencyFormatter.format(sup.totalPurchased) : '—'}
                      </td>

                      {/* Nợ cần trả */}
                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          payable > 0 ? 'text-[#fb2c36]' : 'text-[#15171a]'
                        }`}
                      >
                        <div>{currencyFormatter.format(payable)}</div>
                        {selectedWarehouse && (
                          <div className="text-[10px] text-[#677484] font-normal">
                            {sup.branchReceiptsCount !== undefined ? `${sup.branchReceiptsCount} phiếu • ` : ''}
                            Tổng: {currencyFormatter.format(sup.currentPayable || 0)}
                          </div>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block whitespace-nowrap px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                    </tr>

                    {/* Chi tiết dạng accordion ngay dưới dòng */}
                    {isExpanded && (
                      <SupplierExpandedRow
                        supplier={sup}
                        detail={detailsCache[sup.partnerId]}
                        loading={loadingDetailId === sup.partnerId}
                        colSpan={COLUMN_COUNT}
                        onEdit={onEdit}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        onPaymentCreated={onPaymentCreated}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Bar */}
      <footer className="h-10 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[12px] text-[#677484] shrink-0">
        <div className="flex items-center gap-3">
          <span>
            Hiển thị <strong className="text-[#15171a] font-bold">{rangeStart}</strong>
            {' - '}
            <strong className="text-[#15171a] font-bold">{rangeEnd}</strong> trên{' '}
            <strong className="text-[#15171a] font-bold">{filteredCount}</strong> nhà cung cấp
          </span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-7 rounded-[6px] border border-slate-300 bg-white px-1.5 text-[12px] text-[#15171a] focus:outline-none focus:border-[#0070f4] cursor-pointer"
          >
            <option value={10}>10 dòng</option>
            <option value={20}>20 dòng</option>
            <option value={50}>50 dòng</option>
          </select>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-slate-300 bg-white text-[#677484] hover:bg-[#f7f8f9] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onPageChange(num)}
                className={`h-7 min-w-7 px-1.5 rounded-[6px] text-[12px] font-semibold cursor-pointer transition ${
                  page === num
                    ? 'bg-[#0070f4] text-white'
                    : 'border border-slate-300 bg-white text-[#15171a] hover:bg-[#f7f8f9]'
                }`}
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              disabled={page >= pageCount}
              onClick={() => onPageChange(Math.min(pageCount, page + 1))}
              className="flex h-7 w-7 items-center justify-center rounded-[6px] border border-slate-300 bg-white text-[#677484] hover:bg-[#f7f8f9] disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
