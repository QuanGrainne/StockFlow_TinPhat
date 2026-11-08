'use client';

// Chi tiết Đơn đặt hàng dạng dòng mở rộng — cùng bố cục với Đặt hàng nhập:
//   [Thông tin: SL đặt ↔ đã giao] [Lịch sử giao hàng (hóa đơn)] [Lịch sử thanh toán (tiền khách trả trước)]
// Thao tác: Hủy, Xuất file | Kết thúc, Xác nhận, Sửa đơn, Tạo hóa đơn, Đóng.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { CheckCheck, CircleCheck, FileDown, Loader2, Pencil, ReceiptText, Trash2 } from 'lucide-react';
import { PartnerLink, ProductCodeLink } from '@/components/links/EntityLinks';
import { formatDateTimeVN } from '@/features/transfers/utils/dateUtils';
import { salesBookingService } from '../services/salesBookingService';
import type { SalesBookingDetail } from '../types';
import { BOOKING_STATUS, exportBookingDetailToXLSX, isBookingOpen, PAY_METHOD_LABEL } from '../utils/salesBookingUtils';

const fmt = (v: number) => Math.round(v || 0).toLocaleString('vi-VN');
const qty = (v: number) => (v || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

const INVOICE_STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};

const theadCls = 'bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]';
const textBtnCls =
  'inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] text-[13px] font-semibold text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const outlineBtnCls =
  'inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] text-[#15171a] text-[13px] font-semibold transition cursor-pointer disabled:opacity-50';
const primaryBtnCls =
  'inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs transition cursor-pointer disabled:opacity-60';

type ConfirmKind = 'cancel' | 'finish' | 'confirm';

interface Props {
  orderId: number;
  colSpan: number;
  onClose: () => void;
  onChanged: () => void;
}

export default function SalesBookingExpandedRow({ orderId, colSpan, onClose, onChanged }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<'info' | 'invoices' | 'payments'>('info');
  const [reloadTick, setReloadTick] = useState(0);
  const key = `${orderId}#${reloadTick}`;
  const [result, setResult] = useState<{ key: string; data: SalesBookingDetail | null }>({ key: '', data: null });
  const [confirm, setConfirm] = useState<ConfirmKind | null>(null);
  const [busy, setBusy] = useState(false);
  /** Hủy đơn có tiền trả trước: giữ tiền làm khoản khách trả trước (true) hay hoàn tiền (false) */
  const [keepDeposit, setKeepDeposit] = useState(false);
  const loading = result.key !== key;

  useEffect(() => {
    let alive = true;
    salesBookingService
      .getBooking(orderId)
      .then((data) => alive && setResult({ key: `${orderId}#${reloadTick}`, data }))
      .catch((err: unknown) => {
        if (!alive) return;
        message.error(err instanceof Error ? err.message : 'Không tải được đơn đặt hàng.');
        setResult({ key: `${orderId}#${reloadTick}`, data: null });
      });
    return () => {
      alive = false;
    };
  }, [orderId, reloadTick]);

  const b = result.data;

  const runConfirm = async () => {
    if (!b || !confirm) return;
    setBusy(true);
    try {
      if (confirm === 'cancel') await salesBookingService.cancelBooking(b.orderId, b.paidAmount > 0 && keepDeposit);
      else if (confirm === 'finish') await salesBookingService.finishBooking(b.orderId);
      else await salesBookingService.confirmBooking(b.orderId);
      message.success(
        confirm === 'cancel' ? `Đã hủy đơn ${b.orderCode}` : confirm === 'finish' ? `Đã kết thúc đơn ${b.orderCode}` : `Đã xác nhận đơn ${b.orderCode}`
      );
      setConfirm(null);
      setReloadTick((t) => t + 1);
      onChanged();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const wrap = (body: React.ReactNode) => (
    <tr>
      <td colSpan={colSpan} className="p-0 bg-white">
        <div className="cursor-default border-x border-b-2 border-[#0070f4] bg-white text-[13px] text-[#15171a] animate-in fade-in duration-150">
          {body}
        </div>
      </td>
    </tr>
  );

  if (loading && !b) {
    return wrap(
      <div className="p-8 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 size={16} className="animate-spin text-[#0070f4]" />
        <span className="text-xs">Đang tải đơn đặt hàng...</span>
      </div>
    );
  }
  if (!b) return wrap(<div className="p-6 text-center text-xs text-[#677484]">Không tìm thấy đơn đặt hàng.</div>);

  const badge = BOOKING_STATUS[b.status] ?? { label: b.status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  const hasDelivery = b.invoices.some((i) => i.status === 'COMPLETED');
  const canEdit = (b.status === 'DRAFT' || b.status === 'CONFIRMED') && !hasDelivery;
  const canCancel = isBookingOpen(b.status) && !hasDelivery;
  const canInvoice = isBookingOpen(b.status);
  const totalQty = b.items.reduce((s, i) => s + i.quantity, 0);
  const deliveredQty = b.items.reduce((s, i) => s + i.deliveredQuantity, 0);
  const tabs = [
    { key: 'info' as const, label: 'Thông tin' },
    { key: 'invoices' as const, label: `Lịch sử giao hàng (${b.invoices.length})` },
    { key: 'payments' as const, label: `Lịch sử thanh toán (${b.payments.length})` },
  ];

  const confirmText: Record<ConfirmKind, { title: string; body: React.ReactNode }> = {
    cancel: {
      title: 'Hủy đơn đặt hàng',
      body: (
        <>
          Bạn có chắc muốn hủy đơn <strong>{b.orderCode}</strong>?
          {b.paidAmount > 0 && (
            <div className="mt-3 space-y-2">
              <div>
                Khách đã trả trước <strong>{fmt(b.paidAmount)}</strong> cho đơn này. Xử lý khoản tiền này:
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="booking-deposit"
                  checked={!keepDeposit}
                  onChange={() => setKeepDeposit(false)}
                  className="mt-0.5 h-4 w-4 accent-[#0070f4] cursor-pointer"
                />
                <span>
                  <strong>Hoàn tiền cho khách</strong>
                  <span className="block text-[12px] text-[#677484]">Hủy phiếu thu tiền trả trước, công nợ khách tăng lại.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="booking-deposit"
                  checked={keepDeposit}
                  onChange={() => setKeepDeposit(true)}
                  className="mt-0.5 h-4 w-4 accent-[#0070f4] cursor-pointer"
                />
                <span>
                  <strong>Giữ làm tiền khách trả trước</strong>
                  <span className="block text-[12px] text-[#677484]">
                    Giữ phiếu thu trong công nợ của khách (khách đang trả trước), trừ vào các hóa đơn sau.
                  </span>
                </span>
              </label>
            </div>
          )}
        </>
      ),
    },
    finish: {
      title: 'Kết thúc đơn đặt hàng',
      body: (
        <>
          Đơn <strong>{b.orderCode}</strong> chuyển sang Hoàn thành và không giao phần hàng còn lại.
          {b.remainingDeposit > 0 && (
            <div className="mt-2 text-[#677484]">Tiền trả trước còn dư {fmt(b.remainingDeposit)} được giữ trong công nợ của khách.</div>
          )}
        </>
      ),
    },
    confirm: { title: 'Xác nhận đơn đặt hàng', body: <>Xác nhận đơn <strong>{b.orderCode}</strong> để chuẩn bị giao hàng?</> },
  };

  return wrap(
    <>
      <div className="border-b border-slate-200 px-5 flex items-center gap-7">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`py-2.5 text-[13px] transition cursor-pointer border-b-2 -mb-px ${
              tab === t.key ? 'border-[#0070f4] text-[#0070f4] font-semibold' : 'border-transparent text-[#15171a] hover:text-[#0070f4]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' && (
        <>
          <div className="px-5 py-4 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-[16px] font-bold truncate">
                  <PartnerLink kind="customer" code={b.partnerCode} partnerId={b.partnerId}>
                    {b.partnerName}
                  </PartnerLink>
                </h3>
                <span className="text-[#677484] shrink-0">{b.orderCode}</span>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}>{badge.label}</span>
              </div>
              <span className="shrink-0 text-[#677484]">
                Chi nhánh xử lý: <span className="text-[#15171a] font-medium">{b.warehouseName}</span>
              </span>
            </div>

            {b.mergedIntoCode && (
              <div className="px-3 py-2 rounded-[8px] bg-[#fffbeb] border border-[#fde68a]">
                Đơn này đã được gộp vào <strong>{b.mergedIntoCode}</strong>
              </div>
            )}
            {b.mergedFromCodes.length > 0 && (
              <div className="px-3 py-2 rounded-[8px] bg-[#e6f1fe] border border-[#0070f4]/25">
                Gộp từ các đơn: <strong>{b.mergedFromCodes.join(', ')}</strong>
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
              <div>
                <div className="text-[12px] text-[#677484] mb-1">Người tạo</div>
                <div className="pb-2 border-b border-slate-200">{b.createdByName || '—'}</div>
              </div>
              <div>
                <div className="text-[12px] text-[#677484] mb-1">Ngày đặt</div>
                <div className="pb-2 border-b border-slate-200">{formatDateTimeVN(b.orderDate)}</div>
              </div>
              <div>
                <div className="text-[12px] text-[#677484] mb-1">Thời gian giao hàng</div>
                <div className="pb-2 border-b border-slate-200">{b.deliveryDate ? formatDateTimeVN(b.deliveryDate) : '—'}</div>
              </div>
              <div>
                <div className="text-[12px] text-[#677484] mb-1">Đã giao / Đã đặt</div>
                <div className="pb-2 border-b border-slate-200 font-semibold">
                  {qty(deliveredQty)} / {qty(totalQty)}
                </div>
              </div>
            </div>

            <div className="rounded-[8px] border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className={theadCls}>
                  <tr>
                    <th className="py-2 px-3 w-32">Mã hàng</th>
                    <th className="py-2 px-3">Tên hàng</th>
                    <th className="py-2 px-3 w-24 text-right">SL đặt</th>
                    <th className="py-2 px-3 w-24 text-right">Đã giao</th>
                    <th className="py-2 px-3 w-28 text-right">Đơn giá</th>
                    <th className="py-2 px-3 w-24 text-right">Giảm giá</th>
                    <th className="py-2 px-3 w-28 text-right">Giá bán</th>
                    <th className="py-2 px-3 w-32 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {b.items.map((it) => {
                    const short = it.deliveredQuantity > 0 && it.deliveredQuantity < it.quantity;
                    return (
                      <tr key={it.orderItemId} className="hover:bg-[#f7f8f9]">
                        <td className="py-2.5 px-3 font-medium">
                          <ProductCodeLink code={it.productCode} productId={it.productId} />
                        </td>
                        <td className="py-2.5 px-3">
                          {it.productName}
                          <span className="text-[#677484]"> ({it.unit})</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{qty(it.quantity)}</td>
                        <td className={`py-2.5 px-3 text-right font-mono ${short ? 'text-[#d97706] font-semibold' : it.deliveredQuantity >= it.quantity ? 'text-[#16a34a] font-semibold' : ''}`}>
                          {qty(it.deliveredQuantity)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{fmt(it.originalPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {it.originalPrice - it.unitPrice > 0 ? fmt(it.originalPrice - it.unitPrice) : ''}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{fmt(it.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">{fmt(it.lineTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <div className="md:col-span-7 rounded-[8px] border border-slate-200 bg-[#f7f8f9] p-2.5 text-[13px] text-[#677484] min-h-[72px] whitespace-pre-line">
                {b.notes?.trim() ? <span className="text-[#15171a]">{b.notes}</span> : 'Không có ghi chú'}
              </div>
              <dl className="space-y-2 md:col-span-5">
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Tổng tiền hàng ({qty(totalQty)})</dt>
                  <dd className="font-mono">{fmt(b.subTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Giảm giá</dt>
                  <dd className="font-mono">{fmt(b.discountAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold">Khách cần trả</dt>
                  <dd className="font-mono font-semibold">{fmt(b.totalAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Khách đã trả trước</dt>
                  <dd className="font-mono text-[#16a34a]">{fmt(b.paidAmount)}</dd>
                </div>
                {b.paidAmount > 0 && b.remainingDeposit !== b.paidAmount && (
                  <div className="flex justify-between">
                    <dt className="text-[#677484]">Trả trước chưa trừ vào hóa đơn</dt>
                    <dd className="font-mono">{fmt(b.remainingDeposit)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-2.5">
            <div className="flex items-center gap-1">
              <button type="button" disabled={!canCancel} onClick={() => {
                  setKeepDeposit(false);
                  setConfirm('cancel');
                }} className={`${textBtnCls} !text-[#fb2c36]`}>
                <Trash2 size={14} /> Hủy
              </button>
              <button type="button" onClick={() => exportBookingDetailToXLSX(b)} className={textBtnCls}>
                <FileDown size={14} /> Xuất file
              </button>
            </div>
            <div className="flex items-center gap-2">
              {b.status === 'DELIVERING' && (
                <button type="button" onClick={() => setConfirm('finish')} className={outlineBtnCls}>
                  <CheckCheck size={14} /> Kết thúc
                </button>
              )}
              {b.status === 'DRAFT' && (
                <button type="button" onClick={() => setConfirm('confirm')} className={outlineBtnCls}>
                  <CircleCheck size={14} /> Xác nhận
                </button>
              )}
              {canEdit && (
                <button type="button" onClick={() => router.push(`/pos?booking=${b.orderId}`)} className={outlineBtnCls}>
                  <Pencil size={14} /> Sửa đơn
                </button>
              )}
              {canInvoice && (
                <button
                  type="button"
                  onClick={() => router.push(`/pos?bookingInvoice=${b.orderId}`)}
                  title="Mở màn Bán hàng với hàng còn lại của đơn để giao và thanh toán"
                  className={primaryBtnCls}
                >
                  <ReceiptText size={14} /> Tạo hóa đơn
                </button>
              )}
              <button type="button" onClick={onClose} className={outlineBtnCls}>
                Đóng
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'invoices' && (
        <div className="px-5 py-4">
          <div className="rounded-[8px] border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className={theadCls}>
                <tr>
                  <th className="py-2 px-3 w-40">Mã hóa đơn</th>
                  <th className="py-2 px-3 w-40">Thời gian</th>
                  <th className="py-2 px-3">Người bán</th>
                  <th className="py-2 px-3 w-36 text-right">Giá trị hóa đơn</th>
                  <th className="py-2 px-3 w-36 text-right">Trừ tiền trả trước</th>
                  <th className="py-2 px-3 w-32">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {b.invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#677484] text-xs">
                      Chưa tạo hóa đơn giao hàng nào từ đơn này
                    </td>
                  </tr>
                ) : (
                  b.invoices.map((inv) => {
                    const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
                    return (
                      <tr key={inv.orderId} className="hover:bg-[#f7f8f9]">
                        <td className="py-2.5 px-3 font-medium">
                          <Link href={`/orders/${inv.orderId}`} target="_blank" rel="noopener noreferrer" className="text-[#0070f4] hover:underline">
                            {inv.orderCode}
                          </Link>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(inv.orderDate)}</td>
                        <td className="py-2.5 px-3">{inv.createdByName || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{fmt(inv.totalAmount)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{inv.depositAmount > 0 ? fmt(inv.depositAmount) : ''}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${st.cls}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="px-5 py-4">
          <div className="rounded-[8px] border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className={theadCls}>
                <tr>
                  <th className="py-2 px-3 w-44">Mã phiếu thu</th>
                  <th className="py-2 px-3 w-40">Thời gian</th>
                  <th className="py-2 px-3">Người thu</th>
                  <th className="py-2 px-3 w-36">Phương thức</th>
                  <th className="py-2 px-3 w-36 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {b.payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#677484] text-xs">
                      Khách chưa trả trước cho đơn này
                    </td>
                  </tr>
                ) : (
                  b.payments.map((p) => (
                    <tr key={p.code} className="hover:bg-[#f7f8f9]">
                      <td className="py-2.5 px-3 font-medium text-[#0070f4]">{p.code}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(p.date)}</td>
                      <td className="py-2.5 px-3">{p.createdByName || '—'}</td>
                      <td className="py-2.5 px-3">{PAY_METHOD_LABEL[p.paymentMethod ?? ''] ?? p.paymentMethod ?? '—'}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{fmt(p.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <div className="px-5 pt-4 pb-2 text-[16px] font-bold">{confirmText[confirm].title}</div>
            <div className="px-5 pb-4">{confirmText[confirm].body}</div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button type="button" disabled={busy} onClick={() => setConfirm(null)} className={outlineBtnCls}>
                Bỏ qua
              </button>
              <button type="button" disabled={busy} onClick={() => void runConfirm()} className={primaryBtnCls}>
                {busy && <Loader2 size={14} className="animate-spin" />} Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
