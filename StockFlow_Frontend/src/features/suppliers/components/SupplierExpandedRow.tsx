'use client';

import React, { useState } from 'react';
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
  RefreshCcw,
  CheckCircle2,
  Layers,
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
  colSpan = 9,
  onEdit,
  onToggleStatus,
  onDelete,
}: SupplierExpandedRowProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'receipts' | 'debts'>('info');
  const [receiptWarehouseFilter, setReceiptWarehouseFilter] = useState<number | 'ALL'>('ALL');

  const totalPurchased = detail?.totalPurchasedAmount ?? supplier.totalPurchased ?? 0;
  const currentPayable = detail?.currentPayable ?? supplier.currentPayable ?? 0;
  const receiptsCount = detail?.totalReceiptsCount ?? supplier.branchReceiptsCount ?? 0;
  const paidAmount = Math.max(0, totalPurchased - currentPayable);

  const filteredReceipts = React.useMemo(() => {
    if (!detail?.recentReceipts) return [];
    if (receiptWarehouseFilter === 'ALL') return detail.recentReceipts;
    return detail.recentReceipts.filter((r) => r.warehouseId === receiptWarehouseFilter);
  }, [detail, receiptWarehouseFilter]);

  return (
    <tr>
      <td colSpan={colSpan} className="p-0 border-b-2 border-[#0070f4] bg-white">
        <div className="px-6 py-4">
          {/* 1. Tab Bar giống hệt bên Nhập hàng */}
          <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold transition cursor-pointer border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === 'info'
                  ? 'text-[#0070f4] border-[#0070f4]'
                  : 'text-[#677484] border-transparent hover:text-[#15171a]'
              }`}
            >
              <Building2 size={15} />
              <span>Thông tin nhà cung cấp</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('receipts')}
              className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold transition cursor-pointer border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === 'receipts'
                  ? 'text-[#0070f4] border-[#0070f4]'
                  : 'text-[#677484] border-transparent hover:text-[#15171a]'
              }`}
            >
              <ReceiptText size={15} />
              <span>Lịch sử nhập hàng ({detail?.recentReceipts?.length ?? receiptsCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('debts')}
              className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold transition cursor-pointer border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === 'debts'
                  ? 'text-[#0070f4] border-[#0070f4]'
                  : 'text-[#677484] border-transparent hover:text-[#15171a]'
              }`}
            >
              <Warehouse size={15} />
              <span>Công nợ theo kho ({detail?.warehouseBreakdown?.length ?? 0})</span>
            </button>
          </div>

          {/* 2. Loading State */}
          {loading && !detail ? (
            <div className="py-10 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCcw size={18} className="animate-spin text-[#0070f4]" />
              <span className="text-xs">Đang tải thông tin chi tiết nhà cung cấp #{supplier.code}...</span>
            </div>
          ) : (
            <>
              {/* ─────────────────────────────────────────────────────────────
                  TAB 1: THÔNG TIN NHÀ CUNG CẤP (Layout chuẩn KiotViet Nhập hàng)
                  ───────────────────────────────────────────────────────────── */}
              {activeTab === 'info' && (
                <>
                  {/* Header Info Row (Giống Header bên Nhập hàng) */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2">
                        <span className="text-base font-bold text-slate-900 font-mono">
                          {supplier.code}
                        </span>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            supplier.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {supplier.status === 'ACTIVE' ? 'Đang giao dịch' : 'Ngừng giao dịch'}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                          {supplier.type === 'SUPPLIER' ? 'Nhà cung ứng hàng hóa' : supplier.type}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Tên NCC:</span>
                          <span className="font-semibold text-slate-800">{supplier.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Điện thoại:</span>
                          <span className="font-medium text-slate-800">{supplier.phone || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Email:</span>
                          <span className="text-slate-700 truncate">{supplier.email || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 md:col-span-2">
                          <span className="text-slate-400">Địa chỉ:</span>
                          <span className="text-slate-700">{supplier.address || '—'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400">Tổng mua:</span>
                          <span className="font-bold text-[#0070f4] font-mono">
                            {currencyFormatter.format(totalPurchased)} đ
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bảng phiếu nhập gần nhất (Tương đương Product Table bên Nhập hàng) */}
                  <div className="border border-slate-200 rounded-[8px] overflow-hidden mb-3">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">STT</th>
                          <th className="py-2 px-3 w-36">Mã phiếu nhập</th>
                          <th className="py-2 px-3 w-28">Ngày nhập</th>
                          <th className="py-2 px-3">Kho nhận</th>
                          <th className="py-2 px-3 w-36 text-right">Tổng tiền hàng</th>
                          <th className="py-2 px-3 w-28 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail?.recentReceipts && detail.recentReceipts.length > 0 ? (
                          detail.recentReceipts.slice(0, 5).map((r, i) => (
                            <tr key={r.receiptId || i} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                              <td className="py-2 px-3 font-mono text-[#0070f4] font-semibold">
                                {r.receiptNumber}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {r.receiptDate
                                  ? new Date(r.receiptDate).toLocaleDateString('vi-VN')
                                  : '—'}
                              </td>
                              <td className="py-2 px-3 text-[#15171a] font-medium">
                                {r.warehouseName || 'Kho Tổng'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                                {currencyFormatter.format(r.totalAmount)} đ
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                                  {r.status || 'Hoàn thành'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                              Chưa có phát sinh phiếu nhập hàng nào từ nhà cung cấp này
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom area: Phân bổ kho (trái) + Hộp tổng kết tài chính (phải) giống hệt Nhập hàng */}
                  <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-4">
                    {/* Bên trái: Danh sách nợ theo kho */}
                    <div className="flex-1 w-full">
                      <label className="text-xs text-slate-500 font-medium block mb-1">
                        Phân bổ công nợ theo kho ({detail?.warehouseBreakdown?.length ?? 0} kho)
                      </label>
                      <div className="p-2.5 text-xs border border-slate-200 rounded-[8px] bg-slate-50/60 min-h-[76px] text-slate-700">
                        {detail?.warehouseBreakdown && detail.warehouseBreakdown.length > 0 ? (
                          <div className="space-y-1.5">
                            {detail.warehouseBreakdown.map((wh) => (
                              <div
                                key={wh.warehouseId}
                                className="flex items-center justify-between text-xs py-0.5 border-b border-slate-200/60 last:border-0"
                              >
                                <span className="font-medium text-slate-700">
                                  {wh.warehouseName} ({wh.warehouseCode})
                                </span>
                                <div className="flex items-center gap-3">
                                  <span className="text-slate-500 text-[11px]">
                                    Tổng mua: {currencyFormatter.format(wh.totalPurchasedAmount)} đ
                                  </span>
                                  <span className="font-mono font-bold text-rose-600">
                                    Nợ: {currencyFormatter.format(wh.branchPayableAmount)} đ
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">
                            Chưa có phát sinh công nợ tại các kho.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bên phải: Financial Summary Box (Giống hệt bên Nhập hàng) */}
                    <div className="w-full sm:w-72 shrink-0 space-y-1.5 text-xs bg-slate-50/60 p-3 rounded-[8px] border border-slate-200">
                      <div className="flex justify-between text-slate-600">
                        <span>Số phiếu nhập:</span>
                        <span className="font-semibold text-slate-800">{receiptsCount} chứng từ</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Tổng tiền mua:</span>
                        <span className="font-semibold text-[#0070f4] font-mono">
                          {currencyFormatter.format(totalPurchased)} đ
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Tiền đã trả NCC:</span>
                        <span className="font-medium text-emerald-600 font-mono">
                          {currencyFormatter.format(paidAmount)} đ
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1.5 font-bold">
                        <span>Cần trả NCC:</span>
                        <span
                          className={`font-mono ${
                            currentPayable > 0 ? 'text-rose-600' : 'text-slate-800'
                          }`}
                        >
                          {currencyFormatter.format(currentPayable)} đ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons matching KiotViet standard (Giống hệt Nhập hàng) */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(supplier.partnerId)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#15171a] hover:bg-[#f7f8f9] rounded-[8px] transition cursor-pointer border border-slate-300 bg-white"
                      >
                        <Repeat size={13} className="text-[#677484]" />
                        <span>
                          {supplier.status === 'ACTIVE' ? 'Ngừng giao dịch' : 'Kích hoạt lại'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(supplier)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-[8px] transition cursor-pointer border border-rose-200 bg-white"
                        title="Xóa đối tác hoặc chuyển sang ngừng giao dịch"
                      >
                        <Trash2 size={13} />
                        <span>Xóa NCC</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit(supplier)}
                        className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold transition cursor-pointer shadow-xs"
                      >
                        <Pencil size={13} />
                        <span>Chỉnh sửa thông tin (F9)</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 2: LỊCH SỬ NHẬP HÀNG CHI TIẾT
                  ───────────────────────────────────────────────────────────── */}
              {activeTab === 'receipts' && (
                <div className="space-y-3">
                  {/* Kho filter chips */}
                  {detail?.warehouseBreakdown && detail.warehouseBreakdown.length > 1 && (
                    <div className="flex items-center gap-1.5 flex-wrap pb-1">
                      <span className="text-xs text-slate-500 mr-1">Kho nhận:</span>
                      <button
                        type="button"
                        onClick={() => setReceiptWarehouseFilter('ALL')}
                        className={`px-2.5 py-1 rounded-[6px] text-xs transition cursor-pointer ${
                          receiptWarehouseFilter === 'ALL'
                            ? 'bg-[#0070f4] text-white font-medium'
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
                          className={`px-2.5 py-1 rounded-[6px] text-xs transition cursor-pointer ${
                            receiptWarehouseFilter === wh.warehouseId
                              ? 'bg-[#0070f4] text-white font-medium'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          {wh.warehouseName} ({wh.receiptsCount})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="border border-slate-200 rounded-[8px] overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                        <tr>
                          <th className="py-2 px-3 w-10 text-center">STT</th>
                          <th className="py-2 px-3 w-36">Mã phiếu nhập</th>
                          <th className="py-2 px-3 w-28">Ngày nhập</th>
                          <th className="py-2 px-3">Kho nhận</th>
                          <th className="py-2 px-3 w-36 text-right">Tổng tiền hàng</th>
                          <th className="py-2 px-3 w-28 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredReceipts.length > 0 ? (
                          filteredReceipts.map((r, i) => (
                            <tr key={r.receiptId || i} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                              <td className="py-2 px-3 font-mono text-[#0070f4] font-semibold">
                                {r.receiptNumber}
                              </td>
                              <td className="py-2 px-3 text-slate-600">
                                {r.receiptDate
                                  ? new Date(r.receiptDate).toLocaleDateString('vi-VN')
                                  : '—'}
                              </td>
                              <td className="py-2 px-3 text-[#15171a] font-medium">
                                {r.warehouseName || 'Kho Tổng'}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">
                                {currencyFormatter.format(r.totalAmount)} đ
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                                  {r.status || 'Hoàn thành'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                              Không có phiếu nhập kho nào phù hợp
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 3: CÔNG NỢ THEO KHO CHI TIẾT
                  ───────────────────────────────────────────────────────────── */}
              {activeTab === 'debts' && (
                <div className="border border-slate-200 rounded-[8px] overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">STT</th>
                        <th className="py-2 px-3 w-28">Mã kho</th>
                        <th className="py-2 px-3">Tên kho / Chi nhánh</th>
                        <th className="py-2 px-3 w-28 text-center">Số phiếu nhập</th>
                        <th className="py-2 px-3 w-36 text-right">Tổng tiền mua</th>
                        <th className="py-2 px-3 w-36 text-right">Nợ cần trả</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail?.warehouseBreakdown && detail.warehouseBreakdown.length > 0 ? (
                        detail.warehouseBreakdown.map((wh, i) => (
                          <tr key={wh.warehouseId || i} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                            <td className="py-2 px-3 font-mono font-medium text-slate-600">
                              {wh.warehouseCode}
                            </td>
                            <td className="py-2 px-3 font-medium text-[#15171a]">
                              {wh.warehouseName}
                            </td>
                            <td className="py-2 px-3 text-center text-slate-600">
                              {wh.receiptsCount} phiếu
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold text-[#0070f4]">
                              {currencyFormatter.format(wh.totalPurchasedAmount)} đ
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-rose-600">
                              {currencyFormatter.format(wh.branchPayableAmount)} đ
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-xs text-slate-400">
                            Chưa có dữ liệu nợ phát sinh tại các kho
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
