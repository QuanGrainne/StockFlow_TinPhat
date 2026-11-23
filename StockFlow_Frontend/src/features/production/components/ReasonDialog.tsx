'use client';

// Hộp nhập lý do bắt buộc (đóng sớm lệnh sản xuất — UC-59 A58.1 bước 6, BR-38).

import React, { useState } from 'react';
import { ProductionDialog, btnPrimary, btnSecondary, labelCls } from './ProductionDialog';

interface ReasonDialogProps {
  title: string;
  description: React.ReactNode;
  confirmText: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
  /** Số ký tự tối đa của lý do (mặc định 300; lý do từ chối / hủy kế hoạch sản xuất là 200) */
  maxLength?: number;
  /** Gợi ý nội dung lý do */
  placeholder?: string;
}

export function ReasonDialog({ title, description, confirmText, busy, onCancel, onConfirm, maxLength = 300, placeholder }: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const missing = !reason.trim();

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
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setTouched(true);
              if (!missing) onConfirm(reason.trim());
            }}
            className={btnPrimary}
          >
            {busy ? 'Đang xử lý...' : confirmText}
          </button>
        </>
      }
    >
      <div className="mb-3">{description}</div>
      <label className={labelCls}>
        Lý do <span className="text-[#fb2c36]">*</span>
      </label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={maxLength}
        rows={3}
        autoFocus
        placeholder={placeholder}
        className={`w-full px-2.5 py-1.5 text-[13px] border rounded-[6px] focus:outline-none ${
          touched && missing ? 'border-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'
        }`}
      />
      {touched && missing && <p className="mt-1 text-xs text-[#fb2c36]">Vui lòng nhập lý do.</p>}
    </ProductionDialog>
  );
}
