// Hộp hỏi khi thanh toán hóa đơn từ đơn đặt mà khách lấy ít hơn số đã đặt:
//   - Thanh toán và tạo đơn chờ: hóa đơn theo SL hiện tại, phần còn lại tách thành đơn đặt mới (Phiếu tạm).
//   - Chỉ thanh toán: hóa đơn theo SL hiện tại, bỏ phần còn lại.
// Cả hai cách: đơn đặt gốc chốt SL bằng hóa đơn và chuyển Hoàn thành.

'use client';

import React from 'react';
import { ClipboardList, Loader2, X } from 'lucide-react';

export interface BookingShortageLine {
  productId: number;
  code: string;
  name: string;
  unit: string;
  ordered: number;
  taken: number;
}

interface Props {
  bookingCode: string;
  lines: BookingShortageLine[];
  /** Tiền khách trả trước chưa trừ vào hóa đơn (chuyển sang đơn chờ nếu tạo) */
  leftoverDeposit: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (createRemainder: boolean) => void;
}

const fmt = (n: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(n);

export function BookingShortageDialog({ bookingCode, lines, leftoverDeposit, busy, onClose, onSubmit }: Props) {
  return (
    <div
      className="fixed inset-0 z-[900] bg-slate-900/45 flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="w-full max-w-[620px] bg-white rounded-2xl shadow-2xl text-[14px] text-[#15171a]">
        <div className="flex items-center justify-between px-6 pt-5 pb-2">
          <h3 className="text-[17px] font-bold">Khách lấy thiếu so với đơn {bookingCode}</h3>
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
          <p className="text-[#677484]">
            Hóa đơn sẽ thanh toán đúng số lượng đang nhập. Đơn {bookingCode} chốt theo số lượng hóa đơn và chuyển
            Hoàn thành. Phần còn lại:
          </p>
          <div className="rounded-[8px] border border-slate-200 overflow-hidden max-h-[300px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead className="bg-[#e8f2ff] text-[#15171a] font-semibold sticky top-0">
                <tr>
                  <th className="py-2 px-3">Hàng hóa</th>
                  <th className="py-2 px-3 w-20 text-right">Đặt</th>
                  <th className="py-2 px-3 w-20 text-right">Lấy</th>
                  <th className="py-2 px-3 w-20 text-right">Còn lại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l) => (
                  <tr key={l.productId}>
                    <td className="py-2 px-3">
                      <span className="font-medium text-[#0070f4]">{l.code}</span> {l.name}
                      <span className="text-[#677484]"> ({l.unit})</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{fmt(l.ordered)}</td>
                    <td className="py-2 px-3 text-right font-mono">{fmt(l.taken)}</td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-[#d97706]">
                      {fmt(l.ordered - l.taken)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {leftoverDeposit > 0 && (
            <p className="text-[12px] text-[#677484]">
              Tiền khách trả trước còn dư {fmt(leftoverDeposit)} đ: tạo đơn chờ thì chuyển sang đơn mới; chỉ thanh toán
              thì giữ trong công nợ của khách (cửa hàng đang nợ khách).
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 px-6 py-4 border-t border-slate-200">
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
            onClick={() => onSubmit(false)}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[8px] border border-[#0070f4] text-[#0070f4] bg-white hover:bg-[#eff6ff] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Chỉ thanh toán
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onSubmit(true)}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold shadow-xs cursor-pointer disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ClipboardList size={15} />}
            Thanh toán và tạo đơn chờ
          </button>
        </div>
      </div>
    </div>
  );
}
