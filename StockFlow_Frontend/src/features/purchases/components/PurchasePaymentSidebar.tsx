'use client';

import { useState } from 'react';
import { User, ChevronDown, ChevronLeft, ChevronRight, Info, Check } from 'lucide-react';
import { Tooltip } from 'antd';
import { Supplier } from '@/features/suppliers/types';
import { WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import { PurchaseSupplierSelect } from './PurchaseSupplierSelect';

interface PurchasePaymentSidebarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  username: string;
  dateTimeStr: string;
  activeWarehouse: WarehouseItem;
  suppliers: Supplier[];
  loadingSuppliers: boolean;
  selectedSupplier: Supplier | null;
  onSelectSupplier: (s: Supplier | null) => void;
  onOpenQuickAddSupplier: () => void;
  externalPoNumber: string;
  onChangeExternalPoNumber: (val: string) => void;
  totalGoods: number;
  orderDiscount: number;
  onChangeOrderDiscount: (val: number) => void;
  finalPayable: number;
  paidAmount: number;
  onChangePaidAmount: (val: number) => void;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  onChangePaymentMethod: (val: 'CASH' | 'BANK_TRANSFER') => void;
  debtAmount: number;
  notes: string;
  onChangeNotes: (val: string) => void;
  isSubmitting: boolean;
  onSubmit: (status: 'DRAFT' | 'COMPLETED') => void;
}

export function PurchasePaymentSidebar({
  sidebarOpen,
  onToggleSidebar,
  username,
  dateTimeStr,
  activeWarehouse,
  suppliers,
  loadingSuppliers,
  selectedSupplier,
  onSelectSupplier,
  onOpenQuickAddSupplier,
  externalPoNumber,
  onChangeExternalPoNumber,
  totalGoods,
  orderDiscount,
  onChangeOrderDiscount,
  finalPayable,
  paidAmount,
  onChangePaidAmount,
  paymentMethod,
  onChangePaymentMethod,
  debtAmount,
  notes,
  onChangeNotes,
  isSubmitting,
  onSubmit,
}: PurchasePaymentSidebarProps) {
  return (
    <>
      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggleSidebar}
        className="self-center shrink-0 w-6 h-6 rounded-full bg-white border border-sky-400 text-sky-500 shadow-sm flex items-center justify-center cursor-pointer hover:bg-sky-50 transition z-30"
        style={{ marginLeft: sidebarOpen ? '-12px' : '0', marginRight: sidebarOpen ? '0' : '-12px' }}
        title={sidebarOpen ? 'Thu gọn thông tin' : 'Mở rộng thông tin'}
      >
        {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Sidebar container */}
      <div
        className={`relative bg-white border-l border-slate-200 transition-all duration-300 flex flex-col justify-between shrink-0 ${
          sidebarOpen ? 'w-[360px]' : 'w-0 overflow-hidden border-l-0'
        }`}
      >
        <div className="p-3.5 space-y-3 overflow-y-auto flex-1">
          {/* User & Time */}
          <div className="grid grid-cols-2 gap-2">
            <div className="h-8 px-2 bg-white border border-slate-200 rounded-[6px] text-xs text-slate-700 flex items-center gap-1.5 truncate">
              <User size={13} className="text-slate-400 shrink-0" />
              <span className="truncate font-medium">{username}</span>
            </div>
            <div className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-[6px] text-xs text-slate-600 flex items-center justify-center font-mono">
              {dateTimeStr}
            </div>
          </div>

          {/* Receiving Warehouse */}
          <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg text-xs">
            <div className="text-[11px] text-blue-600 font-semibold uppercase tracking-wider mb-0.5">Kho nhận hàng</div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">{activeWarehouse.name}</span>
              <span className="text-[11px] font-mono text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                {activeWarehouse.code}
              </span>
            </div>
          </div>

          {/* Supplier Selector */}
          <PurchaseSupplierSelect
            suppliers={suppliers}
            loading={loadingSuppliers}
            selectedSupplier={selectedSupplier}
            onSelect={onSelectSupplier}
            onOpenQuickAdd={onOpenQuickAddSupplier}
          />

          {/* Form fields */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="flex items-center justify-between gap-2">
              <label className="text-slate-600 shrink-0">Mã phiếu nhập</label>
              <input
                type="text"
                placeholder="Hệ thống tự sinh (PN00000x)"
                disabled
                className="w-[180px] h-7 px-2 bg-slate-50 text-slate-400 border border-slate-200 rounded text-xs outline-none font-mono"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="text-slate-600 shrink-0">Số hóa đơn / PO ngoài</label>
              <input
                type="text"
                placeholder="Ví dụ: PO-2026-001"
                value={externalPoNumber}
                onChange={(e) => onChangeExternalPoNumber(e.target.value)}
                className="w-[180px] h-7 px-2 bg-white text-slate-800 border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
              />
            </div>

            <div className="flex items-center justify-between gap-2 py-0.5">
              <div className="flex items-center gap-1 text-slate-600">
                <span>Tổng tiền hàng</span>
                <Tooltip title="Tổng giá trị các mặt hàng trong phiếu">
                  <Info size={13} className="text-slate-400 cursor-pointer" />
                </Tooltip>
              </div>
              <span className="font-semibold text-slate-800 text-sm">{totalGoods.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="text-slate-600 shrink-0">Giảm giá phiếu nhập</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={orderDiscount}
                onChange={(e) => onChangeOrderDiscount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-[180px] h-7 px-2 bg-white text-slate-800 text-right border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
              />
            </div>

            <div className="flex items-center justify-between gap-2 py-1 border-t border-slate-100">
              <label className="font-semibold text-slate-800 shrink-0">Cần trả nhà cung cấp</label>
              <span className="font-bold text-base text-[#0071BA]">{finalPayable.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <label className="text-slate-600 shrink-0">Tiền đã trả NCC</label>
                <button
                  type="button"
                  onClick={() => onChangePaidAmount(finalPayable)}
                  className="text-[10px] text-blue-600 hover:underline cursor-pointer"
                >
                  (Trả đủ)
                </button>
              </div>
              <input
                type="number"
                min="0"
                max={finalPayable}
                step="1000"
                value={paidAmount}
                onChange={(e) => onChangePaidAmount(Math.min(finalPayable, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-[180px] h-7 px-2 bg-white text-slate-800 text-right border border-slate-200 rounded text-xs outline-none focus:border-blue-400 font-semibold"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="text-slate-600 shrink-0">Hình thức thanh toán</label>
              <select
                value={paymentMethod}
                onChange={(e) => onChangePaymentMethod(e.target.value as any)}
                className="w-[180px] h-7 px-2 bg-white text-slate-800 border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
              >
                <option value="CASH">Tiền mặt (CASH)</option>
                <option value="BANK_TRANSFER">Chuyển khoản</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-2 py-1.5 px-2 bg-slate-50 border border-slate-200 rounded">
              <span className="font-medium text-slate-700">Tính vào công nợ:</span>
              <span className={`font-bold font-mono text-sm ${debtAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {debtAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          <div className="pt-1">
            <textarea
              placeholder="Ghi chú phiếu nhập hàng..."
              value={notes}
              onChange={(e) => onChangeNotes(e.target.value)}
              rows={3}
              className="w-full p-2 bg-white border border-slate-200 rounded-[6px] text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Dual Actions Footer */}
        <div className="p-3 border-t border-slate-200 bg-white grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onSubmit('DRAFT')}
            className="h-10 rounded-lg border border-[#0071BA] bg-white text-[#0071BA] hover:bg-blue-50 font-medium text-xs sm:text-sm transition cursor-pointer flex items-center justify-center shadow-2xs disabled:opacity-50"
          >
            Lưu tạm (F8)
          </button>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onSubmit('COMPLETED')}
            className="h-10 rounded-lg bg-[#0071BA] hover:bg-[#005f9d] text-white font-medium text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
          >
            <Check size={16} />
            <span>Hoàn thành (F9)</span>
          </button>
        </div>
      </div>
    </>
  );
}
