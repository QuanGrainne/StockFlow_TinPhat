'use client';

// Popup "Sửa phiếu thu" của khách (TTHD000085, TTHD000085-1, PT000001...) — mở từ sổ "Nợ cần thu từ khách".
// Sửa được Thời gian, Phương thức thanh toán, Ghi chú; số tiền và hóa đơn được thu không đổi.
// Thao tác: Hủy phiếu (hoàn lại nợ), Bỏ qua, In, Lưu. Phiếu đã hủy chỉ xem.

import React, { useEffect, useState } from 'react';
import { message } from 'antd';
import { ExternalLink, Loader2, Trash2, X } from 'lucide-react';
import { customerService } from '../services/customerService';
import type { CustomerReceiptDetail } from '../types';
import { PartnerLink } from '@/components/links/EntityLinks';
import { invoiceLinkHref } from '@/features/orders';
import { documentLinkHref, toLinkDate } from '@/lib/navigation/documentLink';
import type { CustomerReceiptAllocation } from '../types';

const isBookingAlloc = (a: CustomerReceiptAllocation) => (a.orderType || '').toUpperCase() === 'BOOKING';
/** Mã phiếu được phân bổ: hóa đơn → trang hóa đơn; đơn đặt hàng → màn Đặt hàng (mở sẵn đơn) */
const allocHref = (a: CustomerReceiptAllocation) =>
  isBookingAlloc(a)
    ? documentLinkHref('/sales-booking', { code: a.orderCode, id: a.orderId, date: toLinkDate(a.orderDate) })
    : invoiceLinkHref(a);
import { formatDateTimeVN, toLocalDatetimeInputString } from '@/lib/utils/date';

type PayMethod = 'CASH' | 'VIETQR';

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const METHOD_LABEL: Record<string, string> = { CASH: 'Tiền mặt', VIETQR: 'Chuyển khoản', BANK_TRANSFER: 'Chuyển khoản' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);

const labelCls = 'block text-[12px] text-[#15171a] mb-1';
const boxCls = 'h-9 px-3 rounded-[8px] bg-slate-100 flex items-center text-[13px] text-[#15171a]';
const fieldCls =
  'w-full h-9 px-3 rounded-[8px] border border-slate-300 text-[13px] text-[#15171a] bg-white focus:outline-none focus:border-[#0070f4] disabled:bg-slate-100';

function printReceipt(r: CustomerReceiptDetail, dateText: string, method: string, notes: string): boolean {
  const w = window.open('', '_blank', 'width=720,height=800');
  if (!w) return false;
  const rows = r.allocations
    .map((a) => `<tr><td>${esc(a.orderCode)}</td><td class="r">${fmt(a.orderTotal)}</td><td class="r">${fmt(a.amount)}</td></tr>`)
    .join('');
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Phiếu thu ${esc(r.code)}</title>
<style>body{font-family:Arial,sans-serif;font-size:13px;margin:24px;color:#15171a}h1{text-align:center;font-size:20px;margin:0 0 4px}
.c{text-align:center;color:#677484;margin-bottom:16px}.row{display:flex;gap:8px;margin:6px 0}.row b{min-width:150px;font-weight:normal;color:#677484}
table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #ccc;padding:6px}th{background:#f7f8f9;text-align:left}.r{text-align:right}
.sign{display:flex;justify-content:space-around;margin-top:40px;text-align:center}</style></head><body>
<h1>PHIẾU THU</h1><div class="c">Mã phiếu: ${esc(r.code)} · ${esc(dateText)}</div>
<div class="row"><b>Người nộp tiền:</b><span>${esc(r.partnerName)} (${esc(r.partnerCode)})</span></div>
<div class="row"><b>Số tiền:</b><span><strong>${fmt(r.totalAmount)} đ</strong></span></div>
<div class="row"><b>Phương thức:</b><span>${esc(METHOD_LABEL[method] ?? method)}</span></div>
<div class="row"><b>Người thu:</b><span>${esc(r.createdByName || '')}</span></div>
${notes ? `<div class="row"><b>Ghi chú:</b><span>${esc(notes)}</span></div>` : ''}
${rows ? `<table><thead><tr><th>Mã phiếu</th><th class="r">Giá trị phiếu</th><th class="r">Tiền thu</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
<div class="sign"><div>Người nộp tiền<br><br><br>&nbsp;</div><div>Người thu tiền<br><br><br>${esc(r.createdByName || '')}</div></div>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
  return true;
}

interface CustomerReceiptModalProps {
  partnerId: number;
  code: string;
  onClose: () => void;
  /** Sau khi lưu / hủy phiếu: tải lại chi tiết khách + danh sách */
  onChanged?: () => void;
}

interface Draft {
  dateTime: string;
  method: PayMethod;
  notes: string;
}

export default function CustomerReceiptModal({ partnerId, code, onClose, onChanged }: CustomerReceiptModalProps) {
  const key = `${partnerId}|${code}`;
  const [result, setResult] = useState<{ key: string; receipt: CustomerReceiptDetail | null; error: string }>({
    key: '',
    receipt: null,
    error: '',
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState<'save' | 'cancel' | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const loading = result.key !== key;

  useEffect(() => {
    let alive = true;
    customerService
      .getCustomerReceipt(partnerId, code)
      .then((receipt) => {
        if (!alive) return;
        setResult({ key: `${partnerId}|${code}`, receipt, error: '' });
        setDraft({
          dateTime: toLocalDatetimeInputString(receipt.transactionDate),
          method: receipt.paymentMethod === 'CASH' ? 'CASH' : 'VIETQR',
          notes: receipt.description ?? '',
        });
      })
      .catch((err: unknown) =>
        alive &&
        setResult({ key: `${partnerId}|${code}`, receipt: null, error: err instanceof Error ? err.message : 'Không tải được phiếu thu.' })
      );
    return () => {
      alive = false;
    };
  }, [partnerId, code]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);

  const r = result.receipt;
  const cancelled = (r?.status || '').toUpperCase() === 'CANCELLED';
  const editable = !!r && !cancelled && !!draft;
  const allocated = r ? r.allocations.reduce((s, a) => s + a.amount, 0) : 0;
  const nowLocal = toLocalDatetimeInputString(new Date());

  const handleSave = async () => {
    if (!r || !draft) return;
    if (draft.dateTime && draft.dateTime > nowLocal) {
      message.error('Thời gian phiếu thu không được ở tương lai.');
      return;
    }
    setBusy('save');
    try {
      await customerService.updateCustomerReceipt(partnerId, r.code, {
        transactionDate: draft.dateTime ? new Date(draft.dateTime).toISOString() : undefined,
        paymentMethod: draft.method,
        notes: draft.notes.trim() || undefined,
      });
      message.success(`Đã lưu phiếu thu ${r.code}`);
      onChanged?.();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được phiếu thu.');
    } finally {
      setBusy(null);
    }
  };

  const handleCancel = async () => {
    if (!r) return;
    setBusy('cancel');
    try {
      await customerService.cancelCustomerReceipt(partnerId, r.code);
      message.success(`Đã hủy phiếu thu ${r.code}`);
      setConfirmCancel(false);
      onChanged?.();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không hủy được phiếu thu.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1060] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[900px] max-h-[92vh] flex flex-col text-[13px] text-[#15171a] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[18px] font-bold leading-tight">{cancelled ? 'Phiếu thu' : 'Sửa phiếu thu'}</h3>
              {cancelled && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]">
                  Đã hủy
                </span>
              )}
            </div>
            {r && (
              <div className="mt-1 flex items-center gap-1.5 text-[12px] text-[#677484]">
                <span>{r.partnerName}</span>
                <PartnerLink kind="customer" code={r.partnerCode} partnerId={r.partnerId}>
                  <ExternalLink size={13} />
                </PartnerLink>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            className="p-1.5 rounded-[8px] hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-50"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-[#677484]">
              <Loader2 size={16} className="animate-spin text-[#0070f4]" /> Đang tải phiếu thu...
            </div>
          ) : !r || !draft ? (
            <div className="py-16 text-center text-[#677484]">{result.error || 'Không tìm thấy phiếu thu.'}</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <label className={labelCls}>Mã phiếu thu</label>
                  <div className={boxCls}>{r.code}</div>
                </div>
                <div>
                  <label className={labelCls}>Người tạo</label>
                  <div className={boxCls}>{r.createdByName || '—'}</div>
                </div>
                <div>
                  <label className={labelCls}>Thời gian</label>
                  <input
                    type="datetime-local"
                    value={draft.dateTime}
                    max={nowLocal}
                    disabled={!editable}
                    onChange={(e) => setDraft({ ...draft, dateTime: e.target.value })}
                    className={fieldCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Người thu</label>
                  <select value="me" disabled className={`${fieldCls} disabled:bg-white`}>
                    <option value="me">{r.createdByName || 'Tài khoản tạo phiếu'}</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Phương thức thanh toán</label>
                  <select
                    value={draft.method}
                    disabled={!editable}
                    onChange={(e) => setDraft({ ...draft, method: e.target.value as PayMethod })}
                    className={`${fieldCls} cursor-pointer`}
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="VIETQR">Chuyển khoản</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Tổng tiền thu</label>
                <div className={`${boxCls} justify-end font-semibold text-[14px] ${cancelled ? 'line-through text-[#677484]' : ''}`}>
                  {fmt(r.totalAmount)}
                </div>
              </div>

              <div>
                <label className={labelCls}>Ghi chú</label>
                <textarea
                  rows={3}
                  value={draft.notes}
                  disabled={!editable}
                  onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                  placeholder="Ghi chú..."
                  className="w-full p-2.5 rounded-[8px] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] resize-none disabled:bg-slate-100"
                />
              </div>

              {r.allocations.length > 0 && (
                <div className="text-[13px] text-[#15171a] -mb-2">
                  {r.allocations.every(isBookingAlloc)
                    ? 'Phân bổ vào đơn đặt hàng'
                    : r.allocations.some(isBookingAlloc)
                      ? 'Phân bổ vào hóa đơn / đơn đặt hàng'
                      : 'Phân bổ vào hóa đơn'}
                </div>
              )}
              {r.allocations.length > 0 && (
                <div className="rounded-[8px] border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#15171a]">
                      <tr>
                        <th className="py-2 px-3">Mã phiếu</th>
                        <th className="py-2 px-3">Thời gian</th>
                        <th className="py-2 px-3 text-right">Giá trị phiếu</th>
                        <th className="py-2 px-3 text-right">Đã thu trước</th>
                        <th className="py-2 px-3 text-right">Tiền thu/chi</th>
                        <th className="py-2 px-3 text-right">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr className="font-bold">
                        <td colSpan={4} />
                        <td className="py-2 px-3 text-right">{fmt(allocated)}</td>
                        <td />
                      </tr>
                      {r.allocations.map((a) => {
                        // Trạng thái của phiếu thu: đã thu xong là "Đã thanh toán", kể cả khi hóa đơn còn nợ
                        return (
                          <tr key={a.orderId}>
                            <td className="py-2 px-3">
                              <a
                                href={allocHref(a)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#0070f4] hover:underline"
                                title={isBookingAlloc(a) ? `Mở đơn đặt hàng ${a.orderCode}` : `Mở hóa đơn ${a.orderCode}`}
                              >
                                {a.orderCode}
                              </a>
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">{formatDateTimeVN(a.orderDate)}</td>
                            <td className="py-2 px-3 text-right">{fmt(a.orderTotal)}</td>
                            <td className="py-2 px-3 text-right">{fmt(a.paidBefore)}</td>
                            <td className="py-2 px-3 text-right">{fmt(a.amount)}</td>
                            <td className="py-2 px-3 text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  cancelled
                                    ? 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]'
                                    : 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]'
                                }`}
                              >
                                {cancelled ? 'Đã hủy' : 'Đã thanh toán'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 px-6 py-3 border-t border-slate-200">
          <div>
            {editable && (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                disabled={!!busy}
                className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-[8px] font-semibold hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-50"
              >
                <Trash2 size={16} /> Hủy
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={!!busy}
              className="h-9 px-4 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Bỏ qua
            </button>
            <button
              type="button"
              disabled={!r || !draft}
              onClick={() => {
                if (r && draft && !printReceipt(r, formatDateTimeVN(draft.dateTime), draft.method, draft.notes.trim()))
                  message.warning('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép cửa sổ bật lên.');
              }}
              className="h-9 px-4 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold transition cursor-pointer disabled:opacity-50"
            >
              In
            </button>
            {editable && (
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!!busy}
                className="h-9 px-5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                {busy === 'save' && <Loader2 size={14} className="animate-spin" />}
                Lưu
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Xác nhận hủy phiếu thu */}
      {confirmCancel && r && (
        <div className="fixed inset-0 z-[1070] bg-black/40 flex items-center justify-center p-4" onMouseDown={(e) => e.stopPropagation()}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl text-[13px]">
            <div className="px-5 pt-4 pb-2 text-[16px] font-bold">Hủy phiếu thu</div>
            <div className="px-5 pb-4 text-[#15171a]">
              Bạn có chắc muốn hủy phiếu thu <strong>{r.code}</strong> ({fmt(r.totalAmount)} đ)? Số tiền này sẽ được cộng lại vào nợ của
              khách và số đã trả của hóa đơn.
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                disabled={busy === 'cancel'}
                className="h-9 px-4 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold cursor-pointer"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => void handleCancel()}
                disabled={busy === 'cancel'}
                className="h-9 px-4 rounded-[8px] bg-[#fb2c36] hover:bg-[#e0222c] text-white font-semibold cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                {busy === 'cancel' && <Loader2 size={14} className="animate-spin" />}
                Đồng ý hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
