'use client';

// Khung modal tự dựng của module Sản xuất (không dùng antd Modal), cùng kiểu modal của màn Kiểm kho / Chuyển hàng.

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ProductionDialogProps {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Tailwind max-width, VD max-w-3xl */
  widthClass?: string;
}

export function ProductionDialog({ title, onClose, children, footer, widthClass = 'max-w-2xl' }: ProductionDialogProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className={`bg-white rounded-[8px] shadow-lg w-full ${widthClass} border border-slate-200 flex flex-col max-h-[92vh] text-[13px] text-[#15171a]`}>
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h3 className="text-[15px] font-bold">{title}</h3>
          <button type="button" onClick={onClose} className="text-[#677484] hover:text-[#15171a] cursor-pointer" title="Đóng">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
}

export const btnSecondary =
  'px-4 h-8 text-xs rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-60';
export const btnPrimary =
  'px-4 h-8 text-xs rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer disabled:opacity-60';
export const btnDanger =
  'px-4 h-8 text-xs rounded-[8px] bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer disabled:opacity-60';
export const inputCls =
  'w-full h-8 px-2.5 text-[13px] border border-slate-300 rounded-[6px] bg-white focus:outline-none focus:border-[#0070f4] disabled:bg-slate-50';
export const labelCls = 'text-xs text-slate-500 font-medium block mb-1';

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  busy: boolean;
  danger?: boolean;
  confirmText?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Hộp xác nhận (MSG18 hủy lệnh, xác nhận xuất thiếu MSG29...) */
export function ConfirmDialog({ title, message, busy, danger, confirmText = 'Đồng ý', onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <ProductionDialog
      title={title}
      onClose={onCancel}
      widthClass="max-w-md"
      footer={
        <>
          <button type="button" onClick={onCancel} className={btnSecondary}>
            Bỏ qua
          </button>
          <button type="button" disabled={busy} onClick={onConfirm} className={danger ? btnDanger : btnPrimary}>
            {busy ? 'Đang xử lý...' : confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-2.5">
        {danger && <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />}
        <div>{message}</div>
      </div>
    </ProductionDialog>
  );
}
