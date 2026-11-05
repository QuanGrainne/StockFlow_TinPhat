'use client';

// Popup xem nhanh 1 hóa đơn (mở từ sổ công nợ khách hàng, phiếu thu...) — chỉ đọc.
// Nút "Mở phiếu" mở màn Hóa đơn ở tab mới, lọc đúng hóa đơn và mở sẵn chi tiết.

import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { orderService } from '../services/orderService';
import type { OrderDetail } from '../types';
import { formatDateTime, stripNoteTags } from '../utils/invoiceUtils';
import { PartnerLink, ProductCodeLink } from '@/components/links/EntityLinks';
import { documentLinkHref, toLinkDate } from '@/lib/navigation/documentLink';

const money = new Intl.NumberFormat('vi-VN');
const WALK_IN_CODE = 'KH00000';

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};

/** Link mở 1 hóa đơn trên màn Hóa đơn (tab mới) */
export function invoiceLinkHref(order: { orderId: number; orderCode: string; orderDate?: string | null }): string {
  return documentLinkHref('/orders', { code: order.orderCode, id: order.orderId, date: toLinkDate(order.orderDate) });
}

interface InvoicePreviewModalProps {
  orderId: number;
  onClose: () => void;
}

export default function InvoicePreviewModal({ orderId, onClose }: InvoicePreviewModalProps) {
  const [result, setResult] = useState<{ id: number; order: OrderDetail | null; error: string }>({ id: 0, order: null, error: '' });
  const loading = result.id !== orderId;

  useEffect(() => {
    let alive = true;
    orderService
      .getOrderDetail(orderId)
      .then((order) => alive && setResult({ id: orderId, order, error: '' }))
      .catch((err: unknown) =>
        alive && setResult({ id: orderId, order: null, error: err instanceof Error ? err.message : 'Không tải được hóa đơn.' })
      );
    return () => {
      alive = false;
    };
  }, [orderId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const order = result.order;
  const cust = order?.customer;
  const hasCustomer = !!cust && cust.partnerId > 0 && cust.partnerCode !== WALK_IN_CODE;
  const badge = order ? STATUS_BADGE[(order.status || '').toUpperCase()] ?? { label: 'Phiếu tạm', cls: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25' } : null;
  const itemsTotal = order ? order.items.reduce((s, it) => s + (it.lineTotal || 0), 0) : 0;
  const totalQty = order ? order.totalQuantity || order.items.reduce((s, it) => s + it.quantity, 0) : 0;
  const notes = stripNoteTags(order?.notes);

  return (
    <div
      className="fixed inset-0 z-[1060] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[92vh] flex flex-col text-[13px] text-[#15171a] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-bold">Hóa đơn</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-[8px] hover:bg-[#f7f8f9] cursor-pointer" title="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5">
          {loading ? (
            <div className="py-16 flex items-center justify-center gap-2 text-[#677484]">
              <Loader2 size={16} className="animate-spin text-[#0070f4]" /> Đang tải hóa đơn...
            </div>
          ) : !order ? (
            <div className="py-16 text-center text-[#677484]">{result.error || 'Không tìm thấy hóa đơn.'}</div>
          ) : (
            <div className="space-y-5">
              {/* Khách hàng + mã + trạng thái | Chi nhánh */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[15px] truncate">
                    {hasCustomer && cust ? `${cust.partnerCode} - ${cust.partnerName}` : 'Khách lẻ'}
                  </span>
                  {hasCustomer && cust && (
                    <PartnerLink kind="customer" code={cust.partnerCode} partnerId={cust.partnerId}>
                      <ExternalLink size={15} />
                    </PartnerLink>
                  )}
                  <span className="text-[15px]">{order.orderCode}</span>
                  {badge && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}>{badge.label}</span>
                  )}
                </div>
                <span className="shrink-0 uppercase text-[#15171a]">{order.warehouseName}</span>
              </div>

              <div className="grid grid-cols-3 gap-x-8 gap-y-2.5">
                <div className="flex gap-3">
                  <span className="w-20 shrink-0 text-[#677484]">Người tạo:</span>
                  <span>{order.createdByName || order.createdByUsername || '—'}</span>
                </div>
                <div className="flex gap-3">
                  <span className="w-20 shrink-0 text-[#677484]">Người bán:</span>
                  <span>{order.salesRepName || order.createdByName || '—'}</span>
                </div>
                <div className="flex gap-3">
                  <span className="w-20 shrink-0 text-[#677484]">Ngày bán:</span>
                  <span>{formatDateTime(order.orderDate)}</span>
                </div>
                <div className="flex gap-3">
                  <span className="w-20 shrink-0 text-[#677484]">Bảng giá:</span>
                  <span>{order.priceBookName || 'Bảng giá chung'}</span>
                </div>
              </div>

              <div className="rounded-[8px] border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]">
                    <tr>
                      <th className="py-2 px-3 w-32">Mã hàng</th>
                      <th className="py-2 px-3">Tên hàng</th>
                      <th className="py-2 px-3 w-24 text-right">Số lượng</th>
                      <th className="py-2 px-3 w-28 text-right">Đơn giá</th>
                      <th className="py-2 px-3 w-28 text-right">Giảm giá</th>
                      <th className="py-2 px-3 w-28 text-right">Giá bán</th>
                      <th className="py-2 px-3 w-32 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {order.items.map((it) => (
                      <tr key={it.orderItemId}>
                        <td className="py-2.5 px-3">
                          <ProductCodeLink code={it.productCode} productId={it.productId} />
                        </td>
                        <td className="py-2.5 px-3">
                          {it.productName}
                          {it.unitName ? <span className="text-[#677484]"> ({it.unitName})</span> : null}
                        </td>
                        <td className="py-2.5 px-3 text-right">{money.format(it.quantity)}</td>
                        <td className="py-2.5 px-3 text-right">{money.format(it.originalPrice || it.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right">{it.discountAmount > 0 ? money.format(it.discountAmount) : ''}</td>
                        <td className="py-2.5 px-3 text-right">{money.format(it.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">{money.format(it.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-7 self-end text-[#677484]">{notes ? notes : 'Chưa có ghi chú'}</div>
                <dl className="col-span-5 space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-[#677484]">Tổng tiền hàng ({money.format(totalQty)})</dt>
                    <dd>{money.format(itemsTotal)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#677484]">Giảm giá hóa đơn</dt>
                    <dd>{money.format(order.orderDiscountAmount || 0)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#677484]">Khách cần trả</dt>
                    <dd>{money.format(order.totalAmount)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <dt>Khách đã trả</dt>
                    <dd>{money.format(order.paidAmount)}</dd>
                  </div>
                  {order.outstandingAmount > 0 && (
                    <div className="flex justify-between font-semibold text-[#fb2c36]">
                      <dt>Còn nợ</dt>
                      <dd>{money.format(order.outstandingAmount)}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}
        </div>

        {order && (
          <div className="flex justify-end px-6 py-3 border-t border-slate-200">
            <a
              href={invoiceLinkHref({ orderId: order.orderId, orderCode: order.orderCode, orderDate: order.orderDate })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold transition"
            >
              <ExternalLink size={15} /> Mở phiếu
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
