'use client';

// Thông tin khách để Kế toán trưởng xét duyệt hạn mức (UC-64, A62.2):
//   - Tổng quan mua hàng: tổng mua, số hóa đơn, giá trị trung bình 12 tháng, mua/trả theo tháng, hóa đơn gần đây.
//   - Lịch sử thanh toán: tổng đã trả, tỷ lệ trả / mua 12 tháng, lần trả gần nhất, hàng trả lại, phiếu thu gần đây.
// Chưa có hạn trả nợ nên chưa có nợ quá hạn (BR-18).

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { creditRequestService } from '../services/creditRequestService';
import type { CustomerCreditHistory } from '../types';
import { formatVnd } from '../utils/creditRequestUtils';
import { formatDateOnlyVN, formatDateTimeVN } from '@/lib/utils/date';

const PAY_METHOD: Record<string, string> = { CASH: 'Tiền mặt', VIETQR: 'Chuyển khoản', DEBT: 'Ghi nợ' };

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-[8px] border border-slate-200 px-3 py-2">
      <div className="text-[11px] text-[#677484]">{label}</div>
      <div className="font-semibold font-mono text-[14px]">{value}</div>
      {hint && <div className="text-[11px] text-[#677484]">{hint}</div>}
    </div>
  );
}

export default function CustomerCreditHistoryPanel({ requestId }: { requestId: number }) {
  const [state, setState] = useState<{ id: number; data: CustomerCreditHistory | null; error: string | null }>({
    id: 0,
    data: null,
    error: null,
  });
  const loading = state.id !== requestId;

  useEffect(() => {
    let alive = true;
    creditRequestService
      .getCustomerHistory(requestId)
      .then((data) => alive && setState({ id: requestId, data, error: null }))
      .catch((err: unknown) =>
        alive && setState({ id: requestId, data: null, error: err instanceof Error ? err.message : 'Không tải được lịch sử khách hàng.' })
      );
    return () => {
      alive = false;
    };
  }, [requestId]);

  if (loading)
    return (
      <div className="py-10 text-center text-[#677484]">
        <Loader2 size={16} className="inline animate-spin mr-2 text-[#0071BA]" />
        Đang tải lịch sử khách hàng...
      </div>
    );
  if (state.error || !state.data) return <div className="py-10 text-center text-[#fb2c36]">{state.error}</div>;

  const h = state.data;
  const payRatio = h.totalPurchase12M > 0 ? Math.round(((h.totalPaid12M + h.totalReturns12M) / h.totalPurchase12M) * 100) : null;
  const maxMonth = Math.max(1, ...h.monthlyPurchases.map((m) => Math.max(m.purchase, m.paid)));

  return (
    <div className="space-y-4">
      {/* Tổng quan mua hàng */}
      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h4 className="font-bold">Tổng quan mua hàng</h4>
          <span className="text-[11px] text-[#677484]">
            Khách từ {formatDateOnlyVN(h.customerSince) || '—'} · mua lần đầu {formatDateOnlyVN(h.firstPurchaseDate) || '—'}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Tổng mua 12 tháng" value={formatVnd(h.totalPurchase12M)} hint={`${h.invoiceCount12M} hóa đơn`} />
          <Stat label="TB mỗi hóa đơn" value={formatVnd(h.averageInvoice12M)} />
          <Stat label="Tổng mua từ trước" value={formatVnd(h.totalPurchaseAll)} hint={`${h.invoiceCountAll} hóa đơn`} />
          <Stat label="Mua gần nhất" value={<span className="font-sans">{formatDateOnlyVN(h.lastPurchaseDate) || '—'}</span>} />
        </div>

        {/* Mua / trả theo tháng (12 tháng) */}
        <div className="mt-3 rounded-[8px] border border-slate-200 px-3 pt-2 pb-1">
          <div className="flex items-center gap-3 text-[11px] text-[#677484] mb-1">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#0071BA]" />Mua</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#22a06b]" />Đã trả</span>
          </div>
          <div className="flex items-end gap-1 h-24">
            {h.monthlyPurchases.map((m) => (
              <div
                key={m.month}
                className="flex-1 flex flex-col items-center justify-end h-full"
                title={`${m.month}: mua ${formatVnd(m.purchase)} đ (${m.invoiceCount} HĐ), trả ${formatVnd(m.paid)} đ`}
              >
                <div className="w-full flex items-end justify-center gap-[2px] h-full">
                  <div className="w-1/2 rounded-t-sm bg-[#0071BA]" style={{ height: `${(m.purchase / maxMonth) * 100}%` }} />
                  <div className="w-1/2 rounded-t-sm bg-[#22a06b]" style={{ height: `${(m.paid / maxMonth) * 100}%` }} />
                </div>
                <div className="text-[9px] text-[#677484] mt-0.5">{m.month.slice(0, 2)}</div>
              </div>
            ))}
          </div>
        </div>

        <table className="mt-3 w-full text-left text-[12px] border border-slate-200 rounded-[8px] overflow-hidden">
          <thead className="bg-[#e8f2ff] font-semibold">
            <tr>
              <th className="py-1.5 px-2">Hóa đơn gần đây</th>
              <th className="py-1.5 px-2">Ngày</th>
              <th className="py-1.5 px-2 text-right">Tổng</th>
              <th className="py-1.5 px-2 text-right">Đã trả</th>
              <th className="py-1.5 px-2 text-right">Còn nợ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {h.recentInvoices.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-3 text-center text-[#677484]">Chưa có hóa đơn</td>
              </tr>
            ) : (
              h.recentInvoices.map((o) => (
                <tr key={o.orderId}>
                  <td className="py-1.5 px-2 font-mono text-[#0071BA]">{o.orderCode}</td>
                  <td className="py-1.5 px-2 whitespace-nowrap">{formatDateTimeVN(o.orderDate)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatVnd(o.total)}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatVnd(o.paid)}</td>
                  <td className={`py-1.5 px-2 text-right font-mono ${o.outstanding > 0 ? 'text-[#fb2c36]' : ''}`}>{formatVnd(o.outstanding)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Lịch sử thanh toán */}
      <section>
        <h4 className="mb-2 font-bold">Lịch sử thanh toán</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Đã trả 12 tháng" value={formatVnd(h.totalPaid12M)} hint={`${h.paymentCount12M} lần thanh toán`} />
          <Stat
            label="Tỷ lệ trả / mua 12 tháng"
            value={payRatio == null ? '—' : `${payRatio}%`}
            hint="Gồm cả hàng trả lại"
          />
          <Stat
            label="Lần trả gần nhất"
            value={<span className="font-sans">{formatDateOnlyVN(h.lastPaymentDate) || '—'}</span>}
            hint={h.lastPaymentAmount != null ? `${formatVnd(h.lastPaymentAmount)} đ` : undefined}
          />
          <Stat label="Hàng trả lại 12 tháng" value={formatVnd(h.totalReturns12M)} />
        </div>

        <table className="mt-3 w-full text-left text-[12px] border border-slate-200 rounded-[8px] overflow-hidden">
          <thead className="bg-[#e8f2ff] font-semibold">
            <tr>
              <th className="py-1.5 px-2">Phiếu thu</th>
              <th className="py-1.5 px-2">Ngày</th>
              <th className="py-1.5 px-2">Hình thức</th>
              <th className="py-1.5 px-2">Cho hóa đơn</th>
              <th className="py-1.5 px-2 text-right">Số tiền</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {h.recentPayments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-3 text-center text-[#677484]">Chưa có phiếu thu</td>
              </tr>
            ) : (
              h.recentPayments.map((p) => (
                <tr key={p.code}>
                  <td className="py-1.5 px-2 font-mono">{p.code}</td>
                  <td className="py-1.5 px-2 whitespace-nowrap">{formatDateTimeVN(p.date)}</td>
                  <td className="py-1.5 px-2">{(p.paymentMethod && PAY_METHOD[p.paymentMethod]) || p.paymentMethod || '—'}</td>
                  <td className="py-1.5 px-2 font-mono">{p.orderCode ?? '—'}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{formatVnd(p.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
