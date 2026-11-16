'use client';

// Thông tin khách để Kế toán trưởng xét duyệt hạn mức (UC-64, A62.2), hiển thị theo tab trong popup duyệt:
//   - Tab "Mua hàng": tổng mua, số hóa đơn, giá trị trung bình 12 tháng, mua/trả theo tháng, hóa đơn gần đây.
//   - Tab "Thanh toán": tổng đã trả, tỷ lệ trả / mua 12 tháng, lần trả gần nhất, hàng trả lại, phiếu thu gần đây.
// Dữ liệu tải một lần (useCustomerCreditHistory) rồi dùng chung cho hai tab.
// Mã hóa đơn bấm được: mở popup xem nhanh hóa đơn (Ctrl + click mở màn Hóa đơn ở tab mới).
// Chưa có hạn trả nợ nên chưa có nợ quá hạn (BR-18).

import React, { useEffect, useState } from 'react';
import { invoiceLinkHref } from '@/features/orders';
import { documentLinkHref } from '@/lib/navigation/documentLink';

import { creditRequestService } from '../services/creditRequestService';
import type { CustomerCreditHistory } from '../types';
import { formatVnd } from '../utils/creditRequestUtils';
import { formatDateOnlyVN, formatDateTimeVN } from '@/lib/utils/date';

const PAY_METHOD: Record<string, string> = { CASH: 'Tiền mặt', VIETQR: 'Chuyển khoản', DEBT: 'Ghi nợ' };

export type CustomerCreditHistoryState = { loading: boolean; data: CustomerCreditHistory | null; error: string | null };

/** Tải thông tin mua hàng / thanh toán của khách theo yêu cầu (một lần cho cả hai tab) */
export function useCustomerCreditHistory(requestId: number): CustomerCreditHistoryState {
  const [state, setState] = useState<{ id: number; data: CustomerCreditHistory | null; error: string | null }>({
    id: 0,
    data: null,
    error: null,
  });

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

  return { loading: state.id !== requestId, data: state.id === requestId ? state.data : null, error: state.error };
}

/** Mã hóa đơn bấm được: click thường → popup xem nhanh; Ctrl/Cmd/Shift + click hoặc chuột giữa → tab mới */
export function InvoiceCodeLink({
  orderId,
  orderCode,
  orderDate,
  onOpen,
}: {
  orderId: number | null;
  orderCode: string;
  orderDate?: string | null;
  onOpen: (orderId: number) => void;
}) {
  const href = orderId
    ? invoiceLinkHref({ orderId, orderCode, orderDate })
    : documentLinkHref('/orders', { code: orderCode });
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={`Xem hóa đơn ${orderCode}`}
      className="font-mono text-[#0070f4] hover:underline cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        if (!orderId || e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        onOpen(orderId);
      }}
    >
      {orderCode}
    </a>
  );
}

function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-[8px] border border-slate-200 bg-[#f7f8f9]/60 px-3 py-2">
      <div className="text-[11px] text-[#677484]">{label}</div>
      <div className="font-semibold text-[14px]">{value}</div>
      {hint && <div className="text-[11px] text-[#677484]">{hint}</div>}
    </div>
  );
}

const TH = 'py-2 px-3 whitespace-nowrap';
const TD = 'py-2 px-3';

function SmallTable({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-slate-200 overflow-hidden">
      <table className="w-full text-left border-collapse text-[13px]">
        <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]">{head}</thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

/** Tab "Mua hàng" */
export function PurchaseHistorySection({ history: h, onOpenInvoice }: { history: CustomerCreditHistory; onOpenInvoice: (orderId: number) => void }) {
  const maxMonth = Math.max(1, ...h.monthlyPurchases.map((m) => Math.max(m.purchase, m.paid)));

  return (
    <div className="space-y-3">
      <div className="text-[12px] text-[#677484]">
        Khách từ {formatDateOnlyVN(h.customerSince) || '—'} · mua lần đầu {formatDateOnlyVN(h.firstPurchaseDate) || '—'}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Tổng mua 12 tháng" value={formatVnd(h.totalPurchase12M)} hint={`${h.invoiceCount12M} hóa đơn`} />
        <Stat label="TB mỗi hóa đơn" value={formatVnd(h.averageInvoice12M)} />
        <Stat label="Tổng mua từ trước" value={formatVnd(h.totalPurchaseAll)} hint={`${h.invoiceCountAll} hóa đơn`} />
        <Stat label="Mua gần nhất" value={formatDateOnlyVN(h.lastPurchaseDate) || '—'} />
      </div>

      {/* Mua / trả theo tháng (12 tháng) */}
      <div className="rounded-[8px] border border-slate-200 px-3 pt-2 pb-1">
        <div className="flex items-center gap-3 text-[11px] text-[#677484] mb-1">
          <span className="font-semibold text-[#15171a]">12 tháng gần đây</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#0070f4]" />
            Mua
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#22a06b]" />
            Đã trả
          </span>
        </div>
        <div className="flex items-end gap-1 h-20">
          {h.monthlyPurchases.map((m) => (
            <div
              key={m.month}
              className="flex-1 flex flex-col items-center justify-end h-full"
              title={`${m.month}: mua ${formatVnd(m.purchase)} đ (${m.invoiceCount} HĐ), trả ${formatVnd(m.paid)} đ`}
            >
              <div className="w-full flex items-end justify-center gap-[2px] h-full">
                <div className="w-1/2 rounded-t-sm bg-[#0070f4]" style={{ height: `${(m.purchase / maxMonth) * 100}%` }} />
                <div className="w-1/2 rounded-t-sm bg-[#22a06b]" style={{ height: `${(m.paid / maxMonth) * 100}%` }} />
              </div>
              <div className="text-[9px] text-[#677484] mt-0.5">{m.month.slice(0, 2)}</div>
            </div>
          ))}
        </div>
      </div>

      <SmallTable
        head={
          <tr>
            <th className={TH}>Hóa đơn gần đây</th>
            <th className={TH}>Thời gian</th>
            <th className={`${TH} text-right`}>Tổng</th>
            <th className={`${TH} text-right`}>Đã trả</th>
            <th className={`${TH} text-right`}>Còn nợ</th>
          </tr>
        }
      >
        {h.recentInvoices.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-4 text-center text-[#677484]">
              Chưa có hóa đơn
            </td>
          </tr>
        ) : (
          h.recentInvoices.map((o) => (
            <tr key={o.orderId} className="hover:bg-[#f7f8f9]">
              <td className={TD}>
                <InvoiceCodeLink orderId={o.orderId} orderCode={o.orderCode} orderDate={o.orderDate} onOpen={onOpenInvoice} />
              </td>
              <td className={`${TD} whitespace-nowrap`}>{formatDateTimeVN(o.orderDate)}</td>
              <td className={`${TD} text-right`}>{formatVnd(o.total)}</td>
              <td className={`${TD} text-right`}>{formatVnd(o.paid)}</td>
              <td className={`${TD} text-right ${o.outstanding > 0 ? 'text-[#fb2c36] font-semibold' : ''}`}>{formatVnd(o.outstanding)}</td>
            </tr>
          ))
        )}
      </SmallTable>
    </div>
  );
}

/** Tab "Thanh toán" */
export function PaymentHistorySection({ history: h, onOpenInvoice }: { history: CustomerCreditHistory; onOpenInvoice: (orderId: number) => void }) {
  const payRatio = h.totalPurchase12M > 0 ? Math.round(((h.totalPaid12M + h.totalReturns12M) / h.totalPurchase12M) * 100) : null;
  // Phiếu thu chỉ có mã hóa đơn → tìm id trong danh sách hóa đơn gần đây để mở popup
  const invoiceIdByCode = new Map(h.recentInvoices.map((o) => [o.orderCode, o.orderId]));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Đã trả 12 tháng" value={formatVnd(h.totalPaid12M)} hint={`${h.paymentCount12M} lần thanh toán`} />
        <Stat label="Tỷ lệ trả / mua 12 tháng" value={payRatio == null ? '—' : `${payRatio}%`} hint="Gồm cả hàng trả lại" />
        <Stat
          label="Lần trả gần nhất"
          value={formatDateOnlyVN(h.lastPaymentDate) || '—'}
          hint={h.lastPaymentAmount != null ? `${formatVnd(h.lastPaymentAmount)} đ` : undefined}
        />
        <Stat label="Hàng trả lại 12 tháng" value={formatVnd(h.totalReturns12M)} />
      </div>

      <SmallTable
        head={
          <tr>
            <th className={TH}>Phiếu thu</th>
            <th className={TH}>Thời gian</th>
            <th className={TH}>Hình thức</th>
            <th className={TH}>Cho hóa đơn</th>
            <th className={`${TH} text-right`}>Số tiền</th>
          </tr>
        }
      >
        {h.recentPayments.length === 0 ? (
          <tr>
            <td colSpan={5} className="py-4 text-center text-[#677484]">
              Chưa có phiếu thu
            </td>
          </tr>
        ) : (
          h.recentPayments.map((p) => (
            <tr key={p.code} className="hover:bg-[#f7f8f9]">
              <td className={`${TD} font-mono`}>{p.code}</td>
              <td className={`${TD} whitespace-nowrap`}>{formatDateTimeVN(p.date)}</td>
              <td className={TD}>{(p.paymentMethod && PAY_METHOD[p.paymentMethod]) || p.paymentMethod || '—'}</td>
              <td className={TD}>
                {p.orderCode ? (
                  <InvoiceCodeLink orderId={invoiceIdByCode.get(p.orderCode) ?? null} orderCode={p.orderCode} onOpen={onOpenInvoice} />
                ) : (
                  '—'
                )}
              </td>
              <td className={`${TD} text-right`}>{formatVnd(p.amount)}</td>
            </tr>
          ))
        )}
      </SmallTable>
    </div>
  );
}
