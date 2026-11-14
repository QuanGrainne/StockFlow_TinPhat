// Yêu cầu hạn mức của tôi cho khách đang chọn ở POS (UC-27): xem trạng thái xử lý của Kế toán trưởng
// và chọn ngoại lệ một lần đã duyệt, chưa dùng để thanh toán lại hóa đơn ghi nợ.
// Duyệt "nâng hạn mức" thì không cần chọn: hạn mức của khách đã được cập nhật.

'use client';

import React, { useEffect, useState } from 'react';
import { Check, Loader2, RefreshCw, X } from 'lucide-react';
import { creditRequestService } from '@/features/credit-requests/services/creditRequestService';
import type { CreditRequest } from '@/features/credit-requests/types';
import { APPROVAL_TYPE_LABEL, CREDIT_STATUS, formatCreditVnd as fmt, isUsableOneTime } from '@/features/credit-requests';
import { formatDateTimeVN } from '@/lib/utils/date';

interface Props {
  partnerId: number;
  customerName: string;
  /** Yêu cầu đang gắn vào tab (nếu có) */
  selectedId: number | null;
  onClose: () => void;
  onSelect: (request: CreditRequest | null) => void;
}

/** Màu chip trạng thái theo antd Tag (gold/green/red) quy sang Tailwind cho bảng tự dựng */
const STATUS_CLS: Record<string, string> = {
  gold: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function MyCreditRequestsDialog({ partnerId, customerName, selectedId, onClose, onSelect }: Props) {
  const [reloadTick, setReloadTick] = useState(0);
  const requestKey = `${partnerId}|${reloadTick}`;
  const [result, setResult] = useState<{ key: string; items: CreditRequest[]; error: string | null }>({
    key: '',
    items: [],
    error: null,
  });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let alive = true;
    creditRequestService
      .getMine(partnerId)
      .then((items) => alive && setResult({ key: requestKey, items, error: null }))
      .catch((err: unknown) =>
        alive && setResult({ key: requestKey, items: [], error: err instanceof Error ? err.message : 'Không tải được yêu cầu.' })
      );
    return () => {
      alive = false;
    };
  }, [partnerId, requestKey]);

  return (
    <div
      className="fixed inset-0 z-[900] bg-slate-900/45 flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[860px] bg-white rounded-2xl shadow-2xl text-[13px] text-[#15171a]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[17px] font-bold">Yêu cầu hạn mức của tôi – {customerName}</h3>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setReloadTick((t) => t + 1)}
              className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
              title="Làm mới"
            >
              <RefreshCw size={16} />
            </button>
            <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer" aria-label="Đóng">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="px-6 pb-5">
          <div className="rounded-[8px] border border-slate-200 overflow-hidden max-h-[420px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#e8f2ff] font-semibold sticky top-0">
                <tr>
                  <th className="py-2 px-3">Mã yêu cầu</th>
                  <th className="py-2 px-3">Thời gian gửi</th>
                  <th className="py-2 px-3 text-right">Hạn mức đề xuất</th>
                  <th className="py-2 px-3">Trạng thái</th>
                  <th className="py-2 px-3">Ghi chú duyệt</th>
                  <th className="py-2 px-3 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#677484]">
                      <Loader2 size={16} className="inline animate-spin mr-2 text-[#0071BA]" />
                      Đang tải...
                    </td>
                  </tr>
                ) : result.error ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#fb2c36]">
                      {result.error}
                    </td>
                  </tr>
                ) : result.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#677484]">
                      Bạn chưa gửi yêu cầu hạn mức nào cho khách hàng này
                    </td>
                  </tr>
                ) : (
                  result.items.map((r) => {
                    const st = CREDIT_STATUS[r.status];
                    const usable = isUsableOneTime(r);
                    const selected = r.requestId === selectedId;
                    return (
                      <tr key={r.requestId} className={selected ? 'bg-[#e8f2ff]/60' : ''}>
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#0071BA] whitespace-nowrap">
                          {r.requestCode ?? `#${r.requestId}`}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(r.requestDate)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{fmt(r.requestedLimit)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${STATUS_CLS[st.color] ?? ''}`}>
                            {st.label}
                          </span>
                          {r.approvalType && (
                            <div className="mt-1 text-[12px] text-[#677484]">
                              {APPROVAL_TYPE_LABEL[r.approvalType]}
                              {r.approvalType === 'ONE_TIME' && r.isUsed && ` · đã dùng (${r.salesOrderCode ?? ''})`}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[12px]">{r.approvalNotes ?? '—'}</td>
                        <td className="py-2.5 px-3 text-right">
                          {usable &&
                            (selected ? (
                              <button
                                type="button"
                                onClick={() => onSelect(null)}
                                className="h-7 px-3 rounded-[8px] border border-slate-300 font-semibold hover:bg-[#f7f8f9] cursor-pointer"
                              >
                                Bỏ chọn
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onSelect(r)}
                                className="inline-flex items-center gap-1 h-7 px-3 rounded-[8px] bg-[#0071BA] hover:bg-[#005f9c] text-white font-semibold cursor-pointer"
                              >
                                <Check size={13} />
                                Dùng
                              </button>
                            ))}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-[#677484]">
            Chỉ ngoại lệ một lần đã duyệt và chưa dùng mới chọn được; mỗi ngoại lệ dùng cho đúng một hóa đơn.
          </p>
        </div>
      </div>
    </div>
  );
}
