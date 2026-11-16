// Hộp "Vượt hạn mức → gửi yêu cầu" ở POS (UC-27, A23.3, BR-12).
// Mở khi thanh toán bị chặn vì vượt hạn mức (CUS-008/009). Sales chọn: quay lại tăng tiền trả / bỏ bớt hàng,
// hoặc gửi yêu cầu kèm lý do và hạn mức đề xuất (không bắt buộc) chờ Kế toán trưởng duyệt nâng hạn mức.
// Hạn mức = 0 (CUS-007) không mở hộp này: vẫn chặn cứng.
// Bố cục gọn cùng kiểu các popup khác (Hóa đơn, Duyệt hạn mức): tiêu đề, cảnh báo MSG22, 4 ô số liệu, 2 ô nhập, chân nút.

'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Send, X } from 'lucide-react';
import { creditRequestService } from '@/features/credit-requests/services/creditRequestService';
import type { CreditRequest } from '@/features/credit-requests/types';
import { formatCreditVnd as fmt, msg22CreditExceeded } from '@/features/credit-requests';

/** Chỉ lấy chữ số từ chuỗi đã định dạng (1.000.000 → 1000000) */
const parseMoney = (s: string): number => Number(s.replace(/\D/g, '')) || 0;

interface Props {
  customer: { partnerId: number; code: string; name: string; creditLimit: number; currentDebt: number };
  /** Nợ mới dự kiến (gồm phần tiền trả trước của đơn đặt được cộng lại khi so hạn mức) */
  expectedNewDebt: number;
  /** Thông báo chặn của POS (CUS-008/009) — hiện khi rê chuột vào ô cảnh báo */
  blockMessage: string;
  onClose: () => void;
  onSubmitted: (request: CreditRequest, message: string) => void;
}

export function CreditRequestDialog({ customer, expectedNewDebt, blockMessage, onClose, onSubmitted }: Props) {
  const minLimit = customer.currentDebt + expectedNewDebt;
  const [reason, setReason] = useState('');
  const [requestedLimit, setRequestedLimit] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  /** Lỗi từ server khi gửi (lỗi nhập liệu tính trực tiếp bên dưới nên tự mất khi sửa đúng) */
  const [serverError, setServerError] = useState<string | null>(null);
  const [triedSubmit, setTriedSubmit] = useState(false);

  const reasonError = triedSubmit && !reason.trim() ? 'Vui lòng nhập lý do gửi yêu cầu duyệt tín dụng.' : null;
  const limitError =
    requestedLimit != null && requestedLimit > 0 && requestedLimit < minLimit
      ? `Hạn mức đề xuất phải từ ${fmt(minLimit)} đ trở lên (dư nợ hiện tại + nợ mới dự kiến).`
      : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const submit = async () => {
    setTriedSubmit(true);
    // Khớp CreditRequestMessages.ReasonRequired / RequestedLimitTooLow
    if (!reason.trim() || limitError) return;
    setBusy(true);
    setServerError(null);
    try {
      const res = await creditRequestService.create({
        partnerId: customer.partnerId,
        expectedNewDebt,
        requestedLimit: requestedLimit != null && requestedLimit > 0 ? requestedLimit : undefined,
        reason: reason.trim(),
      });
      onSubmitted(res.request, res.message);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Không gửi được yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    { label: 'Hạn mức hiện tại', value: customer.creditLimit },
    { label: 'Dư nợ hiện tại', value: customer.currentDebt },
    { label: 'Nợ mới dự kiến', value: expectedNewDebt },
    { label: 'Hạn mức tối thiểu cần có', value: minLimit, strong: true },
  ];
  const inputCls =
    'w-full rounded-[8px] border bg-white px-3 text-[13px] focus:outline-none disabled:bg-[#f7f8f9]';

  return (
    <div
      className="fixed inset-0 z-[900] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-[480px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl text-[13px] text-[#15171a] animate-in fade-in zoom-in-95 duration-150">
        {/* Tiêu đề */}
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            <h3 className="text-[16px] font-bold">Vượt hạn mức tín dụng</h3>
            <div className="text-[12px] text-[#677484] truncate">
              {customer.code} – {customer.name}
            </div>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="p-1.5 rounded-[8px] hover:bg-[#f7f8f9] cursor-pointer disabled:cursor-not-allowed"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-4 space-y-3">
          {/* MSG22 – Popup (Warning): số vượt = dư nợ + nợ mới − hạn mức (A23.3 bước 1) */}
          <div
            className="flex items-start gap-2 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] px-3 py-2 text-[12px] text-[#b91c1c]"
            title={blockMessage}
          >
            <AlertTriangle size={14} className="shrink-0 mt-px" />
            <span>{msg22CreditExceeded(Math.max(0, minLimit - customer.creditLimit))}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {stats.map((s) => (
              <div
                key={s.label}
                className={`rounded-[8px] border px-3 py-1.5 ${s.strong ? 'border-[#0070f4]/30 bg-[#e6f1fe]' : 'border-slate-200 bg-[#f7f8f9]/60'}`}
              >
                <div className="text-[11px] text-[#677484]">{s.label}</div>
                <div className={`text-[14px] font-semibold ${s.strong ? 'text-[#0070f4]' : ''}`}>{fmt(s.value)}</div>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1 font-semibold">
              Lý do <span className="text-[#fb2c36]">*</span>
            </div>
            <textarea
              value={reason}
              maxLength={500}
              rows={2}
              disabled={busy}
              autoFocus
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Khách quen, cam kết thanh toán trong 7 ngày"
              className={`${inputCls} py-2 resize-none ${reasonError ? 'border-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'}`}
            />
            {reasonError && <div className="mt-1 text-[12px] text-[#fb2c36]">{reasonError}</div>}
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="font-semibold">Hạn mức đề xuất</span>
              <span className="text-[11px] text-[#677484]">Không bắt buộc · Kế toán trưởng quyết định mức duyệt</span>
            </div>
            <input
              inputMode="numeric"
              value={requestedLimit ? requestedLimit.toLocaleString('vi-VN') : ''}
              disabled={busy}
              onChange={(e) => {
                const v = parseMoney(e.target.value);
                setRequestedLimit(v > 0 ? v : null);
              }}
              placeholder={fmt(minLimit)}
              className={`${inputCls} h-9 text-right font-semibold ${limitError ? 'border-[#fb2c36]' : 'border-slate-300 focus:border-[#0070f4]'}`}
            />
            <div className={`mt-1 text-[12px] ${limitError ? 'text-[#fb2c36]' : 'text-[#677484]'}`}>
              {limitError ?? `Bỏ trống: hệ thống đề xuất ${fmt(minLimit)} đ.`}
            </div>
          </div>

          <p className="text-[12px] text-[#677484]">
            Giữ nguyên tab này. Khi Kế toán trưởng duyệt, hạn mức của khách được nâng — bấm Thanh toán lại là xong.
          </p>

          {serverError && <p className="text-[12px] text-[#fb2c36]">{serverError}</p>}
        </div>

        {/* Chân popup */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="px-4 h-9 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Quay lại
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Gửi yêu cầu duyệt
          </button>
        </div>
      </div>
    </div>
  );
}
