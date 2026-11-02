'use client';

import React from 'react';
import { Tag, Dropdown, MenuProps } from 'antd';
import {
  MoreVertical,
  Pencil,
  Repeat,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink,
} from 'lucide-react';
import { Supplier, SupplierDetail, WarehouseOption } from '../types';
import SupplierExpandedRow from './SupplierExpandedRow';

const currencyFormatter = new Intl.NumberFormat('vi-VN');

interface SuppliersTableProps {
  loading: boolean;
  pagedItems: Supplier[];
  filteredCount: number;
  selectedWarehouse: WarehouseOption | null | undefined;
  onClearWarehouseFilter: () => void;
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
  page: number;
  pageSize: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (size: number) => void;
}

export default function SuppliersTable({
  loading,
  pagedItems,
  filteredCount,
  selectedWarehouse,
  onClearWarehouseFilter,
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
  page,
  pageSize,
  pageCount,
  rangeStart,
  rangeEnd,
  onPageChange,
  onPageSizeChange,
}: SuppliersTableProps) {
  const getActionMenuItems = (record: Supplier): MenuProps['items'] => [
    {
      key: 'expand',
      label: expandedRowKey === record.partnerId ? 'Thu gọn chi tiết' : 'Xem chi tiết (Hạ xuống)',
      icon: <ExternalLink size={14} />,
      onClick: () => onRowClick(record),
    },
    {
      key: 'edit',
      label: 'Chỉnh sửa thông tin',
      icon: <Pencil size={14} />,
      onClick: () => onEdit(record),
    },
    {
      key: 'toggle',
      label: record.status === 'ACTIVE' ? 'Chuyển Ngừng giao dịch' : 'Kích hoạt lại',
      icon: <Repeat size={14} />,
      onClick: () => onToggleStatus(record.partnerId),
    },
    {
      type: 'divider',
    },
    {
      key: 'delete',
      label: 'Xóa nhà cung cấp',
      icon: <Trash2 size={14} className="text-rose-600" />,
      danger: true,
      onClick: () => onDelete(record),
    },
  ];

  return (
    <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white">
      {/* 1. Header stats bar */}
      <div className="px-5 py-2.5 bg-[#f8fafc] border-b border-[#e5e7eb] flex items-center justify-between text-xs text-slate-600 shrink-0">
        <div className="flex items-center gap-2">
          <span>
            Danh sách Nhà cung cấp (
            <strong className="text-slate-900">{filteredCount}</strong> đối tác)
          </span>
          {selectedWarehouse && (
            <span className="text-xs bg-blue-50 text-[#0070f4] border border-blue-200 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <span>Kho: {selectedWarehouse.name}</span>
              <button
                type="button"
                onClick={onClearWarehouseFilter}
                className="hover:text-red-500 ml-0.5 cursor-pointer"
                title="Bỏ lọc kho"
              >
                <X size={12} />
              </button>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>
            {selectedWarehouse
              ? `Tổng nợ phát sinh tại ${selectedWarehouse.name}:`
              : 'Tổng nợ cần trả NCC:'}
          </span>
          <span
            className={`font-mono font-bold ${
              totalPayableDebt > 0 ? 'text-rose-600' : 'text-slate-800'
            }`}
          >
            {currencyFormatter.format(totalPayableDebt)} đ
          </span>
        </div>
      </div>

      {/* 2. Custom ERP Data Table */}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-left border-collapse min-w-[950px] text-[13px]">
            <thead className="bg-[#f7f8f9] sticky top-0 z-20 border-b border-slate-200 text-[12px] font-semibold text-[#677484] shadow-xs select-none">
              <tr>
                <th className="sticky top-0 z-20 bg-[#f7f8f9] w-10 px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    className="accent-[#0070f4] cursor-pointer"
                    checked={
                      selectedRowKeys.length === pagedItems.length && pagedItems.length > 0
                    }
                    onChange={(e) => onSelectAll(e.target.checked)}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-[#f7f8f9] w-28 px-3 py-2.5 font-semibold text-[#0070f4]">Mã NCC</th>
                <th className="sticky top-0 z-20 bg-[#f7f8f9] px-3 py-2.5 min-w-[180px]">Tên nhà cung cấp</th>
                <th className="sticky top-0 z-20 bg-[#f7f8f9] w-28 px-3 py-2.5">Số điện thoại</th>
                <th className="sticky top-0 z-20 bg-[#f7f8f9] w-36 px-3 py-2.5">Email</th>
                <th className="sticky top-0 z-20 bg-[#f7f8f9] px-3 py-2.5 min-w-[160px]">Địa chỉ</th>
                <th className="sticky top-0 z-20 bg-[#f7f8f9] w-32 px-3 py-2.5 text-right font-semibold text-[#0070f4]">
                  Tổng mua
                </th>
                <th className="sticky top-0 z-20 bg-[#f7f8f9] w-36 px-3 py-2.5 text-right font-semibold">
                  {selectedWarehouse ? `Nợ tại ${selectedWarehouse.code}` : 'Nợ cần trả'}
                </th>
                <th className="sticky top-0 z-20 bg-[#f7f8f9] w-32 px-3 py-2.5 text-center">Trạng thái</th>
                <th className="sticky top-0 z-20 bg-[#f7f8f9] w-14 px-3 py-2.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
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
                  const isExpanded = expandedRowKey === sup.partnerId;
                  const payable =
                    (selectedWarehouse && sup.branchPayable !== undefined
                      ? sup.branchPayable
                      : sup.currentPayable) || 0;

                  return (
                    <React.Fragment key={sup.id}>
                      <tr
                        className={`hover:bg-[#f7f8f9] transition cursor-pointer select-none border-b border-slate-100 ${
                          isExpanded
                            ? 'bg-[#e6f1fe]/80 font-medium'
                            : isSelected
                            ? 'bg-blue-50/60'
                            : ''
                        }`}
                        onClick={() => onRowClick(sup)}
                      >
                        {/* Checkbox */}
                        <td
                          className="py-2.5 px-3 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="accent-[#0070f4] cursor-pointer"
                            checked={isSelected}
                            onChange={(e) => onSelectRow(sup.id, e.target.checked)}
                          />
                        </td>

                        {/* Mã NCC */}
                        <td className="py-2.5 px-3 font-mono text-xs font-semibold text-[#0070f4]">
                          <span className="hover:underline">{sup.code}</span>
                        </td>

                        {/* Tên NCC */}
                        <td className="py-2.5 px-3 font-medium text-slate-900">{sup.name}</td>

                        {/* Điện thoại */}
                        <td className="py-2.5 px-3 text-xs text-slate-600">{sup.phone || '—'}</td>

                        {/* Email */}
                        <td className="py-2.5 px-3 text-xs text-slate-500">{sup.email || '—'}</td>

                        {/* Địa chỉ */}
                        <td className="py-2.5 px-3 text-xs text-slate-600 truncate max-w-xs">
                          {sup.address || '—'}
                        </td>

                        {/* Tổng mua (Thay cho Hạn mức nợ) */}
                        <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-[#0070f4]">
                          {currencyFormatter.format(sup.totalPurchased || 0)} đ
                        </td>

                        {/* Nợ cần trả */}
                        <td
                          className={`px-3 py-3 text-right font-mono text-xs font-bold ${
                            payable > 0 ? 'text-rose-600' : 'text-slate-800'
                          }`}
                        >
                          <div>{currencyFormatter.format(payable)} đ</div>
                          {selectedWarehouse && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              {sup.branchReceiptsCount !== undefined
                                ? `${sup.branchReceiptsCount} phiếu • `
                                : ''}
                              Tổng: {currencyFormatter.format(sup.currentPayable || 0)} đ
                            </div>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-2.5 px-3 text-center">
                          <Tag color={sup.status === 'ACTIVE' ? 'success' : 'default'}>
                            {sup.status === 'ACTIVE' ? 'Đang giao dịch' : 'Ngừng giao dịch'}
                          </Tag>
                        </td>

                        {/* Menu thao tác */}
                        <td
                          className="py-2.5 px-3 text-center"
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

                      {/* 3. Inline Accordion Expand Row hạ xuống */}
                      {isExpanded && (
                        <SupplierExpandedRow
                          supplier={sup}
                          detail={detailsCache[sup.partnerId]}
                          loading={loadingDetailId === sup.partnerId}
                          colSpan={10}
                          onEdit={onEdit}
                          onToggleStatus={onToggleStatus}
                          onDelete={onDelete}
                        />
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. Table Footer with Pagination (Pinned to bottom) */}
        {filteredCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#e5e7eb] bg-white px-5 py-2.5 text-xs text-slate-600 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span>
                Hiển thị <strong>{rangeStart}</strong> - <strong>{rangeEnd}</strong> trên tổng
                số <strong>{filteredCount}</strong> NCC
              </span>
              <span className="text-slate-300">|</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="rounded border border-slate-300 bg-white px-2 py-1 outline-none text-xs cursor-pointer"
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
                onClick={() => onPageChange(Math.max(1, page - 1))}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: pageCount }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onPageChange(num)}
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
                onClick={() => onPageChange(Math.min(pageCount, page + 1))}
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
