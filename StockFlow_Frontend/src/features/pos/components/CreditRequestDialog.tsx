// Hộp "Vượt hạn mức → gửi yêu cầu" ở POS (UC-27, A23.3, BR-12).
// Mở khi thanh toán bị chặn vì vượt hạn mức (CUS-008/009). Sales chọn: quay lại tăng tiền trả / bỏ bớt hàng,
// hoặc gửi yêu cầu kèm lý do và hạn mức đề xuất (không bắt buộc) chờ Kế toán trưởng duyệt.
// Hạn mức = 0 (CUS-007) không mở hộp này: vẫn chặn cứng.

'use client';

import React, { useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { creditRequestService } from '@/features/credit-requests/services/creditRequestService';
import type { CreditRequest } from '@/features/credit-requests/types';
import { formatCreditVnd as fmt } from '@/features/credit-requests';

/** Chỉ lấy chữ số từ chuỗi đã định dạng (1.000.000 → 1000000) */
const parseMoney = (s: string): number => Number(s.replace(/\D/g, '')) || 0;

interface Props {
  customer: { partnerId: number; code: string; name: string; creditLimit: number; currentDebt: number };
  /** Nợ mới dự kiến (gồm phần tiền trả trước của đơn đặt được cộng lại khi so hạn mức) */
  expectedNewDebt: number;
  /** Thông báo chặn của POS (CUS-008/009) */
  blockMessage: string;
  onClose: () => void;
  onSubmitted: (request: CreditRequest, message: string) => void;
}

export function CreditRequestDialog({ customer, expectedNewDebt, blockMessage, onClose, onSubmitted }: Props) {
  const minLimit = customer.currentDebt + expectedNewDebt;
  const [reason, setReason] = useState('');
  const [requestedLimit, setRequestedLimit] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) {
      // MSG23 (tạm, khớp CreditRequestMessages.ReasonRequired)
      setError('Vui lòng nhập lý do gửi yêu cầu duyệt hạn mức (MSG23).');
      return;
    }
    if (requestedLimit != null && requestedLimit > 0 && requestedLimit < minLimit) {
      setError(`Hạn mức đề xuất phải từ ${fmt(minLimit)} đ trở lên (bằng dư nợ hiện tại + nợ mới dự kiến).`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await creditRequestService.create({
        partnerId: customer.partnerId,
        expectedNewDebt,
        requestedLimit: requestedLimit != null && requestedLimit > 0 ? requestedLimit : undefined,
        reason: reason.trim(),
      });
      onSubmitted(res.request, res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không gửi được yêu cầu.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[900] bg-slate-900/45 flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-[560px] bg-white rounded-2xl shadow-2xl text-[14px] text-[#15171a]">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h3 className="text-[17px] font-bold">Vượt hạn mức tín dụng</h3>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-4 space-y-3">
          <p className="rounded-[8px] bg-[#fff1f2] border border-[#fecdd3] px-3 py-2 text-[13px] text-[#be123c]">{blockMessage}</p>

          <div className="rounded-[8px] border border-slate-200 overflow-hidden text-[13px]">
            <table className="w-full">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-1.5 px-3 text-[#677484]">Khách hàng</td>
                  <td className="py-1.5 px-3 text-right font-semibold">
                    {customer.code} – {customer.name}
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-[#677484]">Hạn mức hiện tại</td>
                  <td className="py-1.5 px-3 text-right font-mono">{fmt(customer.creditLimit)} đ</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-[#677484]">Dư nợ hiện tại</td>
                  <td className="py-1.5 px-3 text-right font-mono">{fmt(customer.currentDebt)} đ</td>
                </tr>
                <tr>
                  <td className="py-1.5 px-3 text-[#677484]">Nợ mới dự kiến</td>
                  <td className="py-1.5 px-3 text-right font-mono">{fmt(expectedNewDebt)} đ</td>
                </tr>
                <tr className="bg-[#e8f2ff]">
                  <td className="py-1.5 px-3 font-semibold">Hạn mức tối thiểu cần có</td>
                  <td className="py-1.5 px-3 text-right font-mono font-semibold">{fmt(minLimit)} đ</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="text-[12px] text-[#677484]">
            Có thể quay lại tăng tiền khách trả hoặc bỏ bớt hàng. Hoặc gửi yêu cầu để Kế toán trưởng duyệt ngoại lệ một
            lần hay nâng hạn mức; giữ nguyên tab này, khi được duyệt bấm &quot;Hạn mức&quot; cạnh tên khách để chọn yêu cầu rồi thanh toán lại.
          </p>

          <div>
            <div className="mb-1 font-semibold">
              Lý do <span className="text-[#fb2c36]">*</span>
            </div>
            <textarea
              value={reason}
              maxLength={500}
              rows={3}
              disabled={busy}
              autoFocus
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Khách quen, cam kết thanh toán trong 7 ngày"
              className="w-full rounded-[8px] border border-slate-300 px-3 py-2 text-[13px] focus:outline-none focus:border-[#0071BA]"
            />
          </div>
          <div>
            <div className="mb-1 font-semibold">Hạn mức đề xuất (không bắt buộc)</div>
            <input
              inputMode="numeric"
              value={requestedLimit ? requestedLimit.toLocaleString('vi-VN') : ''}
              disabled={busy}
              onChange={(e) => {
                const v = parseMoney(e.target.value);
                setRequestedLimit(v > 0 ? v : null);
              }}
              placeholder={fmt(minLimit)}
              className="w-full h-9 rounded-[8px] border border-slate-300 px-3 text-right font-mono text-[13px] focus:outline-none focus:border-[#0071BA]"
            />
            <div className="mt-1 text-[12px] text-[#677484]">Bỏ trống: hệ thống đề xuất {fmt(minLimit)} đ.</div>
          </div>

          {error && <p className="text-[13px] text-[#fb2c36]">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Quay lại
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submit()}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-[8px] bg-[#0071BA] hover:bg-[#005f9c] text-white font-semibold shadow-xs cursor-pointer disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Gửi yêu cầu duyệt
          </button>
        </div>
      </div>
    </div>
  );
}
