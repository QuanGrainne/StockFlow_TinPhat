'use client';

// Chi tiết phiếu Trả hàng dạng dòng mở rộng — bố cục như chi tiết Đặt hàng / Hóa đơn:
//   khách hàng + mã phiếu + trạng thái, lưới thông tin (người tạo, ngày trả, mã hóa đơn, chi nhánh, phương thức),
//   bảng hàng trả, ghi chú + tổng tiền. Thao tác: Hủy, Xuất file | Lưu, In, Đóng.

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { message } from 'antd';
import { ExternalLink, FileDown, HandCoins, Loader2, Printer, Save, Trash2 } from 'lucide-react';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { invoiceLinkHref } from '@/features/orders/components/InvoicePreviewModal';
import { formatDateTimeVN } from '@/features/transfers/utils/dateUtils';
import { documentLinkHref } from '@/lib/navigation/documentLink';
import { salesReturnService } from '../services/salesReturnService';
import type { SalesReturnDetail } from '../types';
import {
  exportReturnDetailToXLSX,
  formatVnd,
  PAY_METHOD_LABEL,
  printSalesReturn,
  RETURN_STATUS,
} from '../utils/salesReturnUtils';

const qty = (v: number) => (v || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const theadCls = 'bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]';
const labelCls = 'w-28 shrink-0 text-[#677484]';
const textBtnCls =
  'inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] text-[13px] font-semibold text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const outlineBtnCls =
  'inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] text-[#15171a] text-[13px] font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
const primaryBtnCls =
  'inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs transition cursor-pointer disabled:opacity-60';

interface Props {
  returnId: number;
  colSpan: number;
  onClose: () => void;
  onChanged: () => void;
}

export default function SalesReturnExpandedRow({ returnId, colSpan, onClose, onChanged }: Props) {
  const [reloadTick, setReloadTick] = useState(0);
  const key = `${returnId}#${reloadTick}`;
  const [result, setResult] = useState<{ key: string; data: SalesReturnDetail | null }>({ key: '', data: null });
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'info' | 'payments'>('info');
  /** Form trả thêm tiền cho khách */
  const [refundForm, setRefundForm] = useState<{ amount: number; method: 'CASH' | 'VIETQR'; notes: string } | null>(null);
  const loading = result.key !== key;

  useEffect(() => {
    let alive = true;
    salesReturnService
      .getReturn(returnId)
      .then((data) => {
        if (!alive) return;
        setResult({ key: `${returnId}#${reloadTick}`, data });
        setNotes(data.notes ?? '');
      })
      .catch((err: unknown) => {
        if (!alive) return;
        message.error(err instanceof Error ? err.message : 'Không tải được phiếu trả hàng.');
        setResult({ key: `${returnId}#${reloadTick}`, data: null });
      });
    return () => {
      alive = false;
    };
  }, [returnId, reloadTick]);

  const r = result.data;

  const reload = () => {
    setReloadTick((t) => t + 1);
    onChanged();
  };

  const handleSave = async () => {
    if (!r) return;
    setSaving(true);
    try {
      await salesReturnService.updateNotes(r.returnId, notes.trim() || null);
      message.success(`Đã lưu phiếu ${r.returnCode}`);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được phiếu trả hàng.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefund = async () => {
    if (!r || !refundForm) return;
    setBusy(true);
    try {
      const res = await salesReturnService.addRefund(r.returnId, {
        amount: refundForm.amount,
        paymentMethod: refundForm.method,
        notes: refundForm.notes.trim() || null,
      });
      message.success(`Đã trả khách ${formatVnd(refundForm.amount)} cho phiếu ${res.returnCode}`);
      setRefundForm(null);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không trả được tiền cho khách.');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!r) return;
    setBusy(true);
    try {
      await salesReturnService.cancelReturn(r.returnId);
      message.success(`Đã hủy phiếu ${r.returnCode}`);
      setConfirmCancel(false);
      reload();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không hủy được phiếu trả hàng.');
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

  if (loading && !r) {
    return wrap(
      <div className="p-8 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 size={16} className="animate-spin text-[#0070f4]" />
        <span className="text-xs">Đang tải phiếu trả hàng...</span>
      </div>
    );
  }
  if (!r) return wrap(<div className="p-6 text-center text-xs text-[#677484]">Không tìm thấy phiếu trả hàng.</div>);

  const cancelled = r.status === 'CANCELLED';
  const st = RETURN_STATUS[r.status] ?? { label: r.status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  const totalQty = r.items.reduce((s, i) => s + i.quantity, 0);
  const refunds = r.refunds ?? [];
  /** Phần chưa trả tiền cho khách (đang trừ vào công nợ) */
  const remainingRefund = Math.max(0, r.totalAmount - r.refundAmount);
  const tabs: { key: 'info' | 'payments'; label: string }[] = [
    { key: 'info', label: 'Thông tin' },
    ...(refunds.length > 0 ? [{ key: 'payments' as const, label: 'Lịch sử thanh toán' }] : []),
  ];

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

      {tab === 'payments' && (
        <div className="px-5 py-4">
          <div className="rounded-[8px] border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className={theadCls}>
                <tr>
                  <th className="py-2 px-3 w-44">Mã phiếu</th>
                  <th className="py-2 px-3 w-40">Thời gian</th>
                  <th className="py-2 px-3">Người tạo</th>
                  <th className="py-2 px-3 w-36">Phương thức</th>
                  <th className="py-2 px-3 w-32">Trạng thái</th>
                  <th className="py-2 px-3 w-36 text-right">Tiền chi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {refunds.map((p) => {
                  const off = p.status === 'CANCELLED';
                  return (
                    <tr key={p.code} className="hover:bg-[#f7f8f9]" title={p.notes ?? undefined}>
                      <td className="py-2.5 px-3 font-medium text-[#0070f4]">{p.code}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(p.date)}</td>
                      <td className="py-2.5 px-3">{p.createdByName || '—'}</td>
                      <td className="py-2.5 px-3">{PAY_METHOD_LABEL[p.paymentMethod ?? ''] ?? p.paymentMethod ?? '—'}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                            off ? 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' : 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]'
                          }`}
                        >
                          {off ? 'Đã hủy' : 'Đã thanh toán'}
                        </span>
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono ${off ? 'line-through text-[#677484]' : ''}`}>{formatVnd(p.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'info' && (

      <div className="px-5 py-4 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-[16px] font-bold truncate">
              {r.partnerCode} - {r.partnerName}
            </h3>
            <Link
              href={documentLinkHref('/customers', { code: r.partnerCode, id: r.partnerId })}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0070f4] hover:text-[#005ac3] shrink-0"
              title={`Xem khách hàng ${r.partnerName}`}
            >
              <ExternalLink size={16} />
            </Link>
            <span className="text-[#677484] shrink-0">{r.returnCode}</span>
            <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${st.cls}`}>{st.label}</span>
          </div>
          <span className="shrink-0">{r.warehouseName}</span>
        </div>

        {/* Lưới thông tin (như KiotViet): Người tạo, Ngày trả, Mã hóa đơn, Trả tiền khách */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-3">
          <div className="flex items-center gap-3 min-h-8">
            <span className={labelCls}>Người tạo:</span>
            <span className="truncate">{r.createdByName || '—'}</span>
          </div>
          <div className="flex items-center gap-3 min-h-8">
            <span className={labelCls}>Ngày trả:</span>
            <span>{formatDateTimeVN(r.returnDate)}</span>
          </div>
          <div className="flex items-center gap-3 min-h-8">
            <span className={labelCls}>Trả tiền khách:</span>
            <span>{r.refundAmount > 0 ? PAY_METHOD_LABEL[r.paymentMethod ?? ''] ?? r.paymentMethod : 'Chưa trả'}</span>
          </div>
          <div className="flex items-center gap-3 min-h-8">
            <span className={labelCls}>Mã hóa đơn:</span>
            {r.invoiceId > 0 ? (
              <Link
                href={invoiceLinkHref({ orderId: r.invoiceId, orderCode: r.invoiceCode, orderDate: r.invoiceDate })}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#0070f4] hover:underline"
              >
                {r.invoiceCode}
              </Link>
            ) : (
              <span className="text-[#677484]">Trả nhanh (không có hóa đơn)</span>
            )}
          </div>
        </div>

        {/* Hàng trả: giá trả hàng (giá bán trên hóa đơn), giảm giá, giá nhập lại */}
        <div className="rounded-[8px] border border-slate-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className={theadCls}>
              <tr>
                <th className="py-2 px-3 w-32">Mã hàng</th>
                <th className="py-2 px-3">Tên hàng</th>
                <th className="py-2 px-3 w-24 text-right">Số lượng</th>
                <th className="py-2 px-3 w-28 text-right">Giá trả hàng</th>
                <th className="py-2 px-3 w-24 text-right">Giảm giá</th>
                <th className="py-2 px-3 w-28 text-right">Giá nhập lại</th>
                <th className="py-2 px-3 w-32 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {r.items.map((it) => (
                <tr key={it.returnItemId} className="hover:bg-[#f7f8f9]">
                  <td className="py-2.5 px-3 font-medium">
                    <ProductCodeLink code={it.productCode} productId={it.productId} />
                  </td>
                  <td className="py-2.5 px-3">
                    {it.productName}
                    <span className="text-[#677484]"> ({it.unit})</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{qty(it.quantity)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatVnd(it.salePrice)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    {it.salePrice > it.returnPrice ? formatVnd(it.salePrice - it.returnPrice) : ''}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatVnd(it.returnPrice)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">{formatVnd(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <textarea
            rows={4}
            maxLength={500}
            value={notes}
            disabled={cancelled}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ghi chú..."
            className="w-full resize-none rounded-[8px] border border-slate-300 p-2.5 text-[13px] focus:outline-none focus:border-[#0070f4] placeholder:text-[#677484] disabled:bg-[#f7f8f9] md:col-span-8 self-end"
          />
          <dl className="space-y-2 md:col-span-4">
            <div className="flex justify-between">
              <dt className="text-[#677484]">Tổng tiền hàng trả ({qty(totalQty)})</dt>
              <dd className="font-mono">{formatVnd(r.totalGoodsAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#677484]">Giảm giá phiếu trả</dt>
              <dd className="font-mono">{formatVnd(r.discountAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#677484]">Phí trả hàng</dt>
              <dd className="font-mono">{formatVnd(r.returnFee)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="font-semibold">Cần trả khách</dt>
              <dd className="font-mono font-semibold">{formatVnd(r.totalAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#677484]">Đã trả khách</dt>
              <dd
                className={`font-mono ${r.refundAmount < r.totalAmount && !cancelled ? 'text-[#fb2c36]' : ''}`}
                title={r.refundAmount < r.totalAmount && !cancelled ? `Còn ${formatVnd(r.totalAmount - r.refundAmount)} trừ vào công nợ khách` : undefined}
              >
                {formatVnd(r.refundAmount)}
              </dd>
            </div>
          </dl>
        </div>
      </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-2.5">
        <div className="flex items-center gap-1">
          <button type="button" disabled={cancelled} onClick={() => setConfirmCancel(true)} className={`${textBtnCls} !text-[#fb2c36]`}>
            <Trash2 size={14} /> Hủy
          </button>
          <button type="button" onClick={() => exportReturnDetailToXLSX(r)} className={textBtnCls}>
            <FileDown size={14} /> Xuất file
          </button>
        </div>
        <div className="flex items-center gap-2">
          {/* Lúc trả hàng chưa trả đủ tiền cho khách → trả nốt phần còn lại */}
          {!cancelled && remainingRefund > 0 && (
            <button
              type="button"
              onClick={() => {
                setRefundForm({ amount: remainingRefund, method: 'CASH', notes: '' });
              }}
              className={outlineBtnCls}
              title={`Còn ${formatVnd(remainingRefund)} chưa trả cho khách`}
            >
              <HandCoins size={14} /> Trả tiền khách
            </button>
          )}
          <button type="button" disabled={cancelled || saving} onClick={() => void handleSave()} className={primaryBtnCls}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu
          </button>
          <button type="button" onClick={() => printSalesReturn(r, notes.trim())} className={outlineBtnCls}>
            <Printer size={14} /> In
          </button>
          <button type="button" onClick={onClose} className={outlineBtnCls}>
            Đóng
          </button>
        </div>
      </div>

      {refundForm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <div className="px-5 pt-4 pb-2 text-[16px] font-bold">Trả tiền khách</div>
            <div className="px-5 pb-4 space-y-3">
              <div className="text-[#677484]">
                Phiếu <strong className="text-[#15171a]">{r.returnCode}</strong> — cần trả khách {formatVnd(r.totalAmount)}, đã trả{' '}
                {formatVnd(r.refundAmount)}, còn <strong className="text-[#fb2c36]">{formatVnd(remainingRefund)}</strong>.
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Số tiền trả</span>
                <input
                  inputMode="numeric"
                  autoFocus
                  value={refundForm.amount ? refundForm.amount.toLocaleString('vi-VN') : '0'}
                  onChange={(e) =>
                    setRefundForm({ ...refundForm, amount: Math.min(remainingRefund, Number(e.target.value.replace(/[^\d]/g, '')) || 0) })
                  }
                  onFocus={(e) => e.target.select()}
                  className="w-44 h-9 px-2.5 text-right rounded-[8px] border border-slate-300 font-semibold focus:outline-none focus:border-[#0070f4]"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Phương thức</span>
                <div className="inline-flex rounded-[6px] border border-slate-300 overflow-hidden text-[12px]">
                  {(
                    [
                      ['CASH', 'Tiền mặt'],
                      ['VIETQR', 'Chuyển khoản'],
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setRefundForm({ ...refundForm, method: k })}
                      className={`px-3 h-7 cursor-pointer ${refundForm.method === k ? 'bg-[#0070f4] text-white' : 'bg-white hover:bg-[#eff6ff]'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={2}
                value={refundForm.notes}
                onChange={(e) => setRefundForm({ ...refundForm, notes: e.target.value })}
                placeholder="Ghi chú..."
                className="w-full p-2.5 rounded-[8px] border border-slate-300 resize-none text-[13px] focus:outline-none focus:border-[#0070f4]"
              />
              {refundForm.amount < remainingRefund && refundForm.amount > 0 && (
                <div className="text-[12px] text-[#677484]">
                  Còn {formatVnd(remainingRefund - refundForm.amount)} tiếp tục trừ vào công nợ khách.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button type="button" disabled={busy} onClick={() => setRefundForm(null)} className={outlineBtnCls}>
                Bỏ qua
              </button>
              <button
                type="button"
                disabled={busy || refundForm.amount <= 0}
                onClick={() => void handleRefund()}
                className={primaryBtnCls}
              >
                {busy && <Loader2 size={14} className="animate-spin" />} Trả tiền
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCancel && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <div className="px-5 pt-4 pb-2 text-[16px] font-bold">Hủy phiếu trả hàng</div>
            <div className="px-5 pb-4 space-y-2">
              <div>
                Bạn có chắc muốn hủy phiếu <strong>{r.returnCode}</strong>?
              </div>
              <div className="text-[#677484] text-[12px]">
                Hàng đã nhập lại kho sẽ bị xuất ra; công nợ khách tăng lại {formatVnd(r.totalAmount - r.refundAmount)}
                {r.refundAmount > 0 ? `, phiếu chi trả khách ${formatVnd(r.refundAmount)} bị hủy` : ''}.
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button type="button" disabled={busy} onClick={() => setConfirmCancel(false)} className={outlineBtnCls}>
                Bỏ qua
              </button>
              <button type="button" disabled={busy} onClick={() => void handleCancel()} className={primaryBtnCls}>
                {busy && <Loader2 size={14} className="animate-spin" />} Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
