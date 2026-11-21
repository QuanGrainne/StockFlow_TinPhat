'use client';

// Modal xem phiếu thu / phiếu chi công nợ (PT..., PC...) — mở khi bấm mã phiếu ở sổ công nợ NCC / khách hàng,
// giống phiếu thu khách (TT...) và phiếu điều chỉnh (DC...):
// - Thông tin phiếu: loại, thời gian, người tạo, hình thức, số tiền, ghi chú, trạng thái.
// - Phân bổ vào chứng từ (phiếu nhập / phiếu trả hàng) nếu có, bấm mã để mở chứng từ.
// - Hủy phiếu: chỉ phiếu thu / chi độc lập (không gắn chứng từ) — API do màn gọi truyền vào.

import React, { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { Loader2, X } from 'lucide-react';
import { formatDateTimeVN } from '@/lib/utils/date';
import { documentLinkHref, toLinkDate } from '@/lib/navigation/documentLink';
import { DocumentCodeLink } from '@/components/links/EntityLinks';
import type { DebtVoucherDetail, DebtVoucherLine } from './types';

interface Props {
  code: string;
  load: () => Promise<DebtVoucherDetail>;
  /** Có = hiện nút "Hủy phiếu" khi phiếu cho phép hủy */
  cancel?: () => Promise<void>;
  onClose: () => void;
  /** Gọi sau khi hủy phiếu thành công để tải lại công nợ */
  onChanged?: () => void;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const METHOD_LABEL: Record<string, string> = { CASH: 'Tiền mặt', BANK_TRANSFER: 'Chuyển khoản' };

function LineDocument({ line }: { line: DebtVoucherLine }) {
  if (!line.documentType || !line.documentCode) return <span className="text-[#677484]">Không gắn chứng từ</span>;
  const date = toLinkDate(line.documentDate);
  if (line.documentType === 'SALES_RETURN') {
    return (
      <a
        href={documentLinkHref('/sales-returns', { code: line.documentCode, id: line.documentId, date })}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#0070f4] hover:underline"
      >
        {line.documentCode}
      </a>
    );
  }
  return (
    <DocumentCodeLink
      kind={line.documentType === 'GOODS_RECEIPT' ? 'purchase' : 'purchase-return'}
      code={line.documentCode}
      id={line.documentId}
      date={date}
    />
  );
}

export default function DebtVoucherModal({ code, load, cancel, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<DebtVoucherDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  // Giữ hàm mới nhất mà không làm effect tải phiếu chạy lại mỗi lần cha render
  const loadRef = useRef(load);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    loadRef.current = load;
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    let alive = true;
    loadRef.current()
      .then((d) => alive && setDetail(d))
      .catch((err: unknown) => {
        message.error(err instanceof Error && err.message ? err.message : `Không tải được phiếu ${code}`);
        onCloseRef.current();
      });
    return () => {
      alive = false;
    };
  }, [code]);

  const doCancel = async () => {
    if (!cancel) return;
    setBusy(true);
    try {
      await cancel();
      message.success(`Đã hủy phiếu ${code}`);
      onChanged?.();
      onClose();
    } catch (err) {
      message.error(err instanceof Error && err.message ? err.message : `Không hủy được phiếu ${code}`);
    } finally {
      setBusy(false);
    }
  };

  const isCancelled = detail?.status === 'CANCELLED';
  const isReceipt = detail?.voucherType === 'RECEIPT';
  const outlineBtn =
    'inline-flex items-center px-4 h-9 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[620px] text-[13px] text-[#15171a] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-bold leading-tight flex items-center gap-2">
            {isReceipt ? 'Phiếu thu' : 'Phiếu chi'} {code}
            {detail && (
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                  isCancelled
                    ? 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]'
                    : 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]'
                }`}
              >
                {isCancelled ? 'Đã hủy' : 'Đã hoàn thành'}
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-[8px] hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {!detail ? (
          <div className="px-6 py-10 flex items-center justify-center gap-2 text-[#677484]">
            <Loader2 size={16} className="animate-spin text-[#0070f4]" /> Đang tải phiếu...
          </div>
        ) : (
          <div className="px-6 pb-5 space-y-4">
            <div className="grid grid-cols-[130px_1fr] gap-x-3 gap-y-2.5">
              <span className="text-[#677484]">Loại phiếu</span>
              <span>{detail.typeLabel}</span>
              <span className="text-[#677484]">{isReceipt ? 'Người nộp' : 'Người nhận'}</span>
              <span>
                {detail.partnerName} <span className="text-[#677484]">({detail.partnerCode})</span>
              </span>
              <span className="text-[#677484]">Thời gian</span>
              <span>{detail.transactionDate ? formatDateTimeVN(detail.transactionDate) : '—'}</span>
              <span className="text-[#677484]">Người tạo</span>
              <span>{detail.createdByName || '—'}</span>
              <span className="text-[#677484]">Hình thức</span>
              <span>{METHOD_LABEL[detail.paymentMethod] ?? detail.paymentMethod}</span>
              <span className="text-[#677484]">Số tiền</span>
              <span className={`font-bold text-[15px] ${isCancelled ? 'line-through text-[#677484]' : 'text-[#0070f4]'}`}>
                {fmt(detail.amount)}
              </span>
              <span className="text-[#677484]">Ghi chú</span>
              <span className="break-words">{detail.description || '—'}</span>
            </div>

            {detail.lines.some((l) => l.documentType) && (
              <div className="rounded-[8px] border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-[12px]">
                  <thead className="bg-[#e8f2ff] font-semibold">
                    <tr>
                      <th className="py-2 px-3">Chứng từ</th>
                      <th className="py-2 px-3">Ngày</th>
                      <th className="py-2 px-3 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.lines.map((l, i) => (
                      <tr key={`${l.documentCode ?? 'none'}-${i}`}>
                        <td className="py-2 px-3 font-medium">
                          <LineDocument line={l} />
                        </td>
                        <td className="py-2 px-3">{l.documentDate ? formatDateTimeVN(l.documentDate) : '—'}</td>
                        <td className="py-2 px-3 text-right">{fmt(l.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {confirmCancel && (
              <div className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
                Hủy phiếu <strong>{code}</strong>? Công nợ sẽ trở lại như trước khi lập phiếu (
                {isReceipt ? 'nhà cung cấp lại nợ cửa hàng' : 'cửa hàng lại nợ khách'} <strong>{fmt(detail.amount)}</strong>).
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-200">
          <div>
            {detail?.canCancel && cancel && (
              <button
                type="button"
                onClick={() => (confirmCancel ? void doCancel() : setConfirmCancel(true))}
                disabled={busy}
                className={`${outlineBtn} ${confirmCancel ? 'border-[#fb2c36] text-[#fb2c36]' : ''}`}
              >
                {busy && <Loader2 size={14} className="animate-spin mr-1.5" />}
                {confirmCancel ? 'Xác nhận hủy' : 'Hủy phiếu'}
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => (confirmCancel ? setConfirmCancel(false) : onClose())}
            disabled={busy}
            className={outlineBtn}
          >
            {confirmCancel ? 'Bỏ qua' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}
