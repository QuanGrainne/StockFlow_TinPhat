// Yêu cầu hạn mức của tôi cho khách đang chọn ở POS (UC-27): xem trạng thái xử lý của Kế toán trưởng.
// Chỉ còn duyệt "nâng hạn mức" (đã bỏ ngoại lệ một lần): duyệt xong hạn mức khách được cập nhật, thanh toán lại là được.

'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw, X } from 'lucide-react';
import { creditRequestService } from '@/features/credit-requests/services/creditRequestService';
import type { CreditRequest } from '@/features/credit-requests/types';
import {
  APPROVAL_TYPE_LABEL,
  CREDIT_STATUS,
  formatCreditVnd as fmt,
  msg24Approved,
  msg25Rejected,
} from '@/features/credit-requests';
import { formatDateTimeVN } from '@/lib/utils/date';

interface Props {
  partnerId: number;
  customerName: string;
  onClose: () => void;
}

/** Màu chip trạng thái theo antd Tag (gold/green/red) quy sang Tailwind cho bảng tự dựng */
const STATUS_CLS: Record<string, string> = {
  gold: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-rose-50 text-rose-700 border-rose-200',
};

export function MyCreditRequestsDialog({ partnerId, customerName, onClose }: Props) {
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
                  <th className="py-2 px-3 text-right">Đề xuất / Duyệt</th>
                  <th className="py-2 px-3">Trạng thái</th>
                  <th className="py-2 px-3">Kết quả xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#677484]">
                      <Loader2 size={16} className="inline animate-spin mr-2 text-[#0071BA]" />
                      Đang tải...
                    </td>
                  </tr>
                ) : result.error ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#fb2c36]">
                      {result.error}
                    </td>
                  </tr>
                ) : result.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#677484]">
                      Bạn chưa gửi yêu cầu hạn mức nào cho khách hàng này
                    </td>
                  </tr>
                ) : (
                  result.items.map((r) => {
                    const st = CREDIT_STATUS[r.status];
                    const code = r.requestCode ?? `#${r.requestId}`;
                    return (
                      <tr key={r.requestId}>
                        <td className="py-2.5 px-3 font-mono font-semibold text-[#0071BA] whitespace-nowrap">
                          {code}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(r.requestDate)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {fmt(r.requestedLimit)}
                          {r.approvedLimit != null && (
                            <div className="font-semibold text-[#0071BA]" title="Mức Kế toán trưởng duyệt">
                              {fmt(r.approvedLimit)}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${STATUS_CLS[st.color] ?? ''}`}>
                            {st.label}
                          </span>
                          {r.approvalType && (
                            <div className="mt-1 text-[12px] text-[#677484]">
                              {APPROVAL_TYPE_LABEL[r.approvalType]}
                            </div>
                          )}
                        </td>
                        {/* Không có chuông thông báo: Sales xem kết quả tại đây (MSG24 / MSG25) */}
                        <td className="py-2.5 px-3 text-[12px]">
                          {r.status === 'APPROVED'
                            ? msg24Approved(code)
                            : r.status === 'REJECTED'
                              ? msg25Rejected(code, r.approvalNotes ?? '—')
                              : 'Đang chờ Kế toán trưởng duyệt'}
                          {r.status === 'APPROVED' && r.approvalNotes && (
                            <div className="mt-0.5 text-[#677484]">Ghi chú: {r.approvalNotes}</div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] text-[#677484]">
            Khi yêu cầu được duyệt, hạn mức của khách đã được nâng — thanh toán lại hóa đơn ghi nợ là được.
          </p>
        </div>
      </div>
    </div>
  );
}
