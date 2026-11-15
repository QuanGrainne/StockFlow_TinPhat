'use client';

// Tab "Lịch sử hạn mức" trong chi tiết khách hàng: mọi lần đổi hạn mức công nợ (tạo khách,
// Manager điều chỉnh, điều chỉnh hàng loạt, duyệt yêu cầu nâng hạn mức), mới nhất trước.

import React, { useEffect, useState } from 'react';
import { Loader2, SlidersHorizontal } from 'lucide-react';
import { customerService } from '../services/customerService';
import type { CreditLimitHistoryItem } from '../types';

const money = new Intl.NumberFormat('vi-VN');

const SOURCE_LABEL: Record<string, { label: string; cls: string }> = {
  INITIAL: { label: 'Tạo khách', cls: 'bg-slate-50 text-slate-600 border-slate-200' },
  MANUAL: { label: 'Điều chỉnh', cls: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25' },
  BULK: { label: 'Điều chỉnh hàng loạt', cls: 'bg-[#f3e8ff] text-[#7c3aed] border-[#ddd6fe]' },
  REQUEST_APPROVED: { label: 'Duyệt yêu cầu', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
};

function fmtDateTime(v?: string | null) {
  if (!v) return '—';
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : v;
}

interface Props {
  customerId: number;
  currentLimit: number;
  /** Có = hiện nút "Điều chỉnh hạn mức" */
  onAdjust?: () => void;
}

export default function CreditLimitHistoryTab({ customerId, currentLimit, onAdjust }: Props) {
  const [items, setItems] = useState<CreditLimitHistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    customerService
      .getCreditLimitHistory(customerId)
      .then((rows) => !stale && setItems(rows))
      .catch((e: unknown) => !stale && setError(e instanceof Error ? e.message : 'Không tải được lịch sử hạn mức.'));
    return () => {
      stale = true;
    };
  }, [customerId]);

  return (
    <div className="px-5 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[#677484]">
          Hạn mức hiện tại: <strong className="text-[#15171a]">{money.format(currentLimit)} đ</strong>
        </span>
        {onAdjust && (
          <button
            type="button"
            onClick={onAdjust}
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] text-[13px] font-semibold cursor-pointer"
          >
            <SlidersHorizontal size={14} />
            <span>Điều chỉnh hạn mức</span>
          </button>
        )}
      </div>

      {error ? (
        <p className="text-[#fb2c36] text-[12px]">{error}</p>
      ) : items === null ? (
        <div className="py-6 flex justify-center text-[#677484]">
          <Loader2 size={16} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-[#677484]">Chưa có thay đổi hạn mức nào được ghi nhận.</p>
      ) : (
        <div className="rounded-[8px] border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]">
              <tr>
                <th className="py-2 px-3">Thời gian</th>
                <th className="py-2 px-3">Nguồn</th>
                <th className="py-2 px-3 text-right">Hạn mức cũ</th>
                <th className="py-2 px-3 text-right">Hạn mức mới</th>
                <th className="py-2 px-3">Người thực hiện</th>
                <th className="py-2 px-3">Lý do</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => {
                const src = SOURCE_LABEL[h.source] ?? { label: h.source, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
                const up = h.newLimit > h.oldLimit;
                return (
                  <tr key={h.historyId} className="border-b border-slate-100 last:border-0 text-[13px]">
                    <td className="py-2 px-3 whitespace-nowrap">{fmtDateTime(h.changedAt)}</td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-0.5 rounded-full border text-[11px] font-semibold ${src.cls}`}>{src.label}</span>
                      {h.requestCode && <span className="ml-1.5 text-[#677484]">{h.requestCode}</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-mono">{money.format(h.oldLimit)}</td>
                    <td className={`py-2 px-3 text-right font-mono font-semibold ${up ? 'text-[#16a34a]' : 'text-[#fb2c36]'}`}>
                      {money.format(h.newLimit)}
                    </td>
                    <td className="py-2 px-3">{h.changedByName || '—'}</td>
                    <td className="py-2 px-3 text-[#677484] max-w-[280px] truncate" title={h.reason || undefined}>
                      {h.reason || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
