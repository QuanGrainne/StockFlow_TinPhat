'use client';

import React, { useState } from 'react';
import { Tag } from 'antd';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  ReceiptText,
  Warehouse,
  Pencil,
  Repeat,
  Trash2,
  AlertCircle,
  RefreshCcw,
  ShoppingBag,
} from 'lucide-react';
import { Supplier, SupplierDetail } from '../types';

interface SupplierExpandedRowProps {
  supplier: Supplier;
  detail: SupplierDetail | null | undefined;
  loading: boolean;
  colSpan?: number;
  onEdit: (supplier: Supplier) => void;
  onToggleStatus: (partnerId: number) => void;
  onDelete: (supplier: Supplier) => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export default function SupplierExpandedRow({
  supplier,
  detail,
  loading,
  colSpan = 10,
  onEdit,
  onToggleStatus,
  onDelete,
}: SupplierExpandedRowProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'receipts'>('info');
  const [receiptWarehouseFilter, setReceiptWarehouseFilter] = useState<number | 'ALL'>('ALL');

  const filteredReceipts = React.useMemo(() => {
    if (!detail?.recentReceipts) return [];
    if (receiptWarehouseFilter === 'ALL') return detail.recentReceipts;
    return detail.recentReceipts.filter((r) => r.warehouseId === receiptWarehouseFilter);
  }, [detail, receiptWarehouseFilter]);

  const totalPurchased = detail?.totalPurchasedAmount ?? supplier.totalPurchased ?? 0;
  const currentPayable = detail?.currentPayable ?? supplier.currentPayable ?? 0;
  const receiptsCount = detail?.totalReceiptsCount ?? supplier.branchReceiptsCount ?? 0;

  return (
    <tr>
      <td colSpan={colSpan} className="p-0 border-b-2 border-[#0071BA] bg-white">
        <div className="px-6 py-4 bg-white text-slate-800">
          {/* 1. Header Tab Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 mb-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition cursor-pointer -mb-px flex items-center gap-1.5 ${
                  activeTab === 'info'
                    ? 'border-[#0071BA] text-[#0071BA]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Building2 size={14} />
                <span>Thông tin hồ sơ & Công nợ theo kho</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('receipts')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition cursor-pointer -mb-px flex items-center gap-1.5 ${
                  activeTab === 'receipts'
                    ? 'border-[#0071BA] text-[#0071BA]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ReceiptText size={14} />
                <span>
                  Lịch sử nhập hàng gần đây ({detail?.recentReceipts?.length ?? receiptsCount})
                </span>
              </button>
            </div>

            {/* Quick Status Tag */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">{supplier.code}</span>
              <Tag color={supplier.status === 'ACTIVE' ? 'success' : 'default'}>
                {supplier.status === 'ACTIVE' ? 'Đang giao dịch' : 'Ngừng giao dịch'}
              </Tag>
            </div>
          </div>

          {/* 2. Loading State */}
          {loading && !detail ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCcw size={18} className="animate-spin text-[#0071BA]" />
              <span className="text-xs">Đang tải thông tin chi tiết nhà cung cấp...</span>
            </div>
          ) : (
            <>
              {/* 3. Tab 1: Hồ sơ & Phân bổ Công nợ theo kho */}
              {activeTab === 'info' && (
                <div className="space-y-4">
                  {/* Top Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] font-medium text-slate-500 mb-0.5 flex items-center gap-1">
                        <ShoppingBag size={12} className="text-[#0071BA]" />
                        <span>Tổng tiền mua hàng</span>
                      </div>
                      <div className="text-sm font-bold font-mono text-[#0071BA]">
                        {currencyFormatter.format(totalPurchased)} đ
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] font-medium text-slate-500 mb-0.5">
                        Nợ cần trả NCC hiện tại
                      </div>
                      <div
                        className={`text-sm font-bold font-mono ${
                          currentPayable > 0 ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {currencyFormatter.format(currentPayable)} đ
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="text-[11px] font-medium text-slate-500 mb-0.5">
                        Tổng số phiếu nhập kho
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        {receiptsCount} chứng từ
                      </div>
                    </div>
                  </div>

                  {/* Contact Info & Warehouse Debt Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Left: Contact Info */}
                    <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs space-y-2.5">
                      <div className="font-semibold text-slate-800 text-[13px] border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                        <Building2 size={14} className="text-slate-500" />
                        <span>Hồ sơ liên hệ & Pháp nhân</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[11px]">Tên đối tác:</span>
                          <span className="font-medium text-slate-800">{supplier.name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px]">Loại hình:</span>
                          <span className="font-medium text-slate-800">
                            {supplier.type === 'SUPPLIER' ? 'Nhà cung ứng hàng hóa' : supplier.type}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                            <Phone size={10} />
                            <span>Số điện thoại:</span>
                          </span>
                          <span className="font-medium text-slate-800">{supplier.phone || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                            <Mail size={10} />
                            <span>Email:</span>
                          </span>
                          <span className="font-medium text-slate-800 truncate block">
                            {supplier.email || '—'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                          <MapPin size={10} />
                          <span>Địa chỉ kinh doanh / Kho bãi:</span>
                        </span>
                        <span className="font-medium text-slate-800">{supplier.address || '—'}</span>
                      </div>
                    </div>

                    {/* Right: Phân bổ công nợ theo kho */}
                    <div className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg text-xs space-y-2">
                      <div className="font-semibold text-slate-800 text-[13px] border-b border-slate-200 pb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Warehouse size={14} className="text-[#0071BA]" />
                          <span>Phân bổ nợ theo Kho / Chi nhánh</span>
                        </span>
                        <span className="text-[11px] text-slate-400 font-normal">
                          {detail?.warehouseBreakdown?.length ?? 0} kho phát sinh
                        </span>
                      </div>

                      {detail?.warehouseBreakdown && detail.warehouseBreakdown.length > 0 ? (
                        <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                          {detail.warehouseBreakdown.map((wh) => {
                            const percent =
                              totalPurchased > 0
                                ? Math.round((wh.totalPurchasedAmount / totalPurchased) * 100)
                                : 0;
                            return (
                              <div
                                key={wh.warehouseId}
                                className="bg-white p-2 rounded border border-slate-200"
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-slate-800">
                                    {wh.warehouseName}
                                  </span>
                                  <span className="font-mono font-bold text-rose-600">
                                    Nợ tại kho: {currencyFormatter.format(wh.branchPayableAmount)} đ
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-1">
                                  <div
                                    className="bg-[#0071BA] h-1.5 rounded-full"
                                    style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
                                  />
                                </div>
                                <div className="flex justify-between text-[11px] text-slate-500">
                                  <span>
                                    Tổng nhập: {currencyFormatter.format(wh.totalPurchasedAmount)} đ ({percent}%)
                                  </span>
                                  <span>{wh.receiptsCount} phiếu</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-6 text-center text-slate-400 text-xs">
                          Chưa có phát sinh phiếu nhập hàng tại các kho
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. Tab 2: Lịch sử phiếu nhập gần đây */}
              {activeTab === 'receipts' && (
                <div className="space-y-2.5">
                  {/* Kho filter chips */}
                  {detail?.warehouseBreakdown && detail.warehouseBreakdown.length > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap pb-1">
                      <span className="text-xs text-slate-500 mr-1">Kho nhận:</span>
                      <button
                        type="button"
                        onClick={() => setReceiptWarehouseFilter('ALL')}
                        className={`px-2 py-0.5 rounded text-xs transition cursor-pointer ${
                          receiptWarehouseFilter === 'ALL'
                            ? 'bg-[#0071BA] text-white font-medium'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        Tất cả ({detail.recentReceipts.length})
                      </button>
                      {detail.warehouseBreakdown.map((wh) => (
                        <button
                          key={wh.warehouseId}
                          type="button"
                          onClick={() => setReceiptWarehouseFilter(wh.warehouseId)}
                          className={`px-2 py-0.5 rounded text-xs transition cursor-pointer ${
                            receiptWarehouseFilter === wh.warehouseId
                              ? 'bg-[#0071BA] text-white font-medium'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {wh.warehouseName} ({wh.receiptsCount})
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredReceipts.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                      <AlertCircle size={18} className="text-slate-300" />
                      <span>Không tìm thấy phiếu nhập nào từ nhà cung cấp này.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                          <tr>
                            <th className="px-3 py-2">Mã phiếu</th>
                            <th className="px-3 py-2">Ngày nhập</th>
                            <th className="px-3 py-2">Kho nhận</th>
                            <th className="px-3 py-2 text-right">Tổng tiền hàng</th>
                            <th className="px-3 py-2 text-center">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredReceipts.map((r) => (
                            <tr key={r.receiptId} className="hover:bg-blue-50/30">
                              <td className="px-3 py-2 font-mono font-semibold text-[#0071BA]">
                                {r.receiptNumber}
                              </td>
                              <td className="px-3 py-2 text-slate-500">
                                {r.receiptDate
                                  ? new Date(r.receiptDate).toLocaleDateString('vi-VN')
                                  : '—'}
                              </td>
                              <td className="px-3 py-2 text-slate-600">
                                <span className="inline-flex items-center gap-1">
                                  <Warehouse size={12} className="text-slate-400" />
                                  <span>{r.warehouseName || 'Kho Tổng'}</span>
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                                {currencyFormatter.format(r.totalAmount)} đ
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Tag color={r.status === 'COMPLETED' ? 'blue' : 'default'}>
                                  {r.status || 'Hoàn thành'}
                                </Tag>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 5. Chân Panel: Action Toolbar chuẩn KiotViet */}
              <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleStatus(supplier.partnerId)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-[6px] border border-slate-300 bg-white transition cursor-pointer"
                  >
                    <Repeat size={13} className="text-slate-500" />
                    <span>
                      {supplier.status === 'ACTIVE' ? 'Ngừng giao dịch' : 'Kích hoạt lại'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(supplier)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-[6px] border border-rose-200 bg-white transition cursor-pointer"
                    title="Xóa nhà cung cấp hoặc chuyển sang ngừng giao dịch nếu có dữ liệu"
                  >
                    <Trash2 size={13} />
                    <span>Xóa NCC</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(supplier)}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0071BA] hover:bg-[#005f9d] text-white rounded-[6px] font-semibold transition cursor-pointer shadow-xs"
                  >
                    <Pencil size={13} />
                    <span>Chỉnh sửa thông tin (F9)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

