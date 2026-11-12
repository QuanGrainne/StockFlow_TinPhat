// src/features/orders/components/KiotVietOrderDetail.tsx
// Chi tiết 1 hóa đơn (mở rộng ngay dưới dòng trong màn Hóa đơn), theo mẫu KiotViet:
// - Tab "Thông tin": khách, mã, trạng thái, người tạo/bán, ngày bán, kênh bán, bảng giá, dòng hàng, ghi chú, tổng kết.
// - Tab "Lịch sử thanh toán": các phiếu thu của hóa đơn.
// - Thao tác: Hủy, Sao chép (mở sang màn Bán hàng), Xuất file, Lưu, In.
// Giao diện cùng chuẩn dòng mở rộng của Nhà cung cấp / Khách hàng.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { Copy, FileDown, Loader2, Printer, Save, Trash2, Undo2, X } from 'lucide-react';
import { PartnerLink, ProductCodeLink } from '@/components/links/EntityLinks';

import type { OrderDetail } from '../types';
import { orderService } from '../services/orderService';
import { exportInvoiceDetailToXLSX, formatDateTime, paymentMethodLabel, printInvoice, stripNoteTags } from '../utils/invoiceUtils';
import { newPosId, queuePosTab, type PosLine } from '@/features/pos/utils/posTabs';

const money = new Intl.NumberFormat('vi-VN');

const textBtnCls =
  'inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] text-[13px] font-semibold text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer';
const outlineBtnCls =
  'inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] text-[#15171a] text-[13px] font-semibold transition cursor-pointer';
const primaryBtnCls =
  'inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs transition cursor-pointer';

interface KiotVietOrderDetailProps {
  orderId?: number | string;
  orderCode?: string;
  onClose?: () => void;
  onReloadList?: () => void;
  /** Mở màn Bán hàng POS (mặc định điều hướng /pos) */
  onOpenPos?: () => void;
}

/** Hộp xác nhận hủy hóa đơn (modal tự dựng theo chuẩn AI_CODING_RULES §5.8) */
function CancelConfirmDialog({
  orderCode,
  busy,
  onConfirm,
  onClose,
}: {
  orderCode: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-invoice-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="cancel-invoice-title" className="text-lg font-semibold text-slate-900">
            Hủy hóa đơn
          </h2>
          <button type="button" onClick={onClose} className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Đóng">
            <X size={20} />
          </button>
        </header>
        <div className="px-6 py-5 text-sm text-slate-700">
          Bạn có chắc chắn muốn hủy hóa đơn <strong>{orderCode}</strong>? Hệ thống sẽ hoàn lại tồn kho, giảm công nợ khách hàng và hủy
          phiếu thu của hóa đơn này.
        </div>
        <footer className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
            {busy ? 'Đang hủy...' : 'Đồng ý hủy'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export const KiotVietOrderDetail: React.FC<KiotVietOrderDetailProps> = ({
  orderId,
  orderCode,
  onClose,
  onReloadList,
  onOpenPos,
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'INFO' | 'PAYMENTS'>('INFO');
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadTick, setReloadTick] = useState(0);
  const [notes, setNotes] = useState('');
  const [salesRep, setSalesRep] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const applyOrder = useCallback((data: OrderDetail) => {
    setOrder(data);
    setNotes(stripNoteTags(data.notes));
    setSalesRep(data.salesRepName || data.createdByName || '');
  }, []);

  const lookupKey = orderId ?? orderCode;

  useEffect(() => {
    if (lookupKey === undefined || lookupKey === '') return;
    let alive = true;
    orderService
      .getOrderDetail(lookupKey)
      .then((data) => {
        if (alive) applyOrder(data);
      })
      .catch((err: unknown) => {
        if (alive) message.error(err instanceof Error ? err.message : 'Không thể tải chi tiết hóa đơn.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [lookupKey, reloadTick, applyOrder]);

  const fetchOrder = () => setReloadTick((t) => t + 1);

  const openPos = () => (onOpenPos ? onOpenPos() : router.push('/pos'));

  const handleSave = async () => {
    if (!order) return;
    try {
      setSaving(true);
      const updated = await orderService.updateOrder(order.orderId, { notes, salesRepName: salesRep });
      applyOrder(updated);
      message.success(`Đã lưu hóa đơn ${updated.orderCode || order.orderCode}.`);
      onReloadList?.();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Lỗi khi lưu hóa đơn.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!order) return;
    try {
      setCancelling(true);
      await orderService.cancelOrder(order.orderId);
      message.success(`Đã hủy hóa đơn ${order.orderCode}.`);
      setConfirmCancel(false);
      fetchOrder();
      onReloadList?.();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không thể hủy hóa đơn.');
    } finally {
      setCancelling(false);
    }
  };

  /** Sao chép: mở 1 tab hóa đơn mới ở màn Bán hàng với cùng khách hàng và dòng hàng */
  const handleCopy = () => {
    if (!order) return;
    const lines: PosLine[] = order.items.map((it) => {
      const listPrice = it.originalPrice || it.unitPrice;
      return {
        key: newPosId(),
        productId: it.productId,
        code: it.productCode,
        name: it.productName,
        imageUrl: it.imageUrl ?? null,
        uom: it.unitName,
        unitId: it.unitId,
        stock: 0, // màn POS tự tải lại tồn kho khi mở
        unitPrice: listPrice,
        discountMode: 'VND',
        discountValue: Math.max(0, listPrice - it.unitPrice),
        quantity: it.quantity,
        note: '',
      };
    });
    const c = order.customer;
    queuePosTab({
      lines,
      customer:
        c && c.partnerId > 0
          ? {
              id: c.partnerId,
              partnerId: c.partnerId,
              code: c.partnerCode,
              name: c.partnerName,
              phone: c.phone,
              email: c.email,
              address: c.address,
              taxCode: c.taxCode,
              creditLimit: c.creditLimit,
              currentDebt: c.currentDebt,
              isOverCreditLimit: c.creditLimit > 0 && c.currentDebt > c.creditLimit,
            }
          : null,
      priceBookId: null,
      discountMode: 'VND',
      discountValue: order.orderDiscountAmount || 0,
      paid: null,
      payMethod: 'CASH',
      notes: stripNoteTags(order.notes),
    });
    message.success(`Đã sao chép ${order.orderCode} sang màn Bán hàng.`);
    openPos();
  };

  const handlePrint = () => {
    if (order) void printInvoice(order);
  };

  const wrap = (body: React.ReactNode) => (
    <div
      className="cursor-default border-x border-b-2 border-[#0070f4] bg-white text-[13px] text-[#15171a] animate-in fade-in duration-150"
      onClick={(e) => e.stopPropagation()}
    >
      {body}
    </div>
  );

  if (loading && !order) {
    return wrap(
      <div className="p-8 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 size={16} className="animate-spin text-[#0070f4]" />
        <span className="text-xs">Đang tải chi tiết hóa đơn...</span>
      </div>
    );
  }

  if (!order) {
    return wrap(<div className="p-6 text-center text-xs text-[#677484]">Không tìm thấy thông tin hóa đơn.</div>);
  }

  const isCancelled = order.status === 'CANCELLED';
  const cust = order.customer;
  const hasCustomer = !!cust && cust.partnerId > 0 && cust.partnerCode !== 'KH00000';
  const customerName = hasCustomer && cust ? cust.partnerName : 'Khách lẻ';
  const totalQty = order.totalQuantity || order.items.reduce((s, it) => s + it.quantity, 0);
  const badge = isCancelled
    ? { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' }
    : order.status === 'COMPLETED'
    ? { label: 'Hoàn thành', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' }
    : { label: 'Phiếu tạm', cls: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25' };

  const tabs: { key: 'INFO' | 'PAYMENTS'; label: string }[] = [
    { key: 'INFO', label: 'Thông tin' },
    { key: 'PAYMENTS', label: 'Lịch sử thanh toán' },
  ];

  const fieldLabel = 'text-[12px] text-[#677484] mb-1';
  const fieldValue = 'pb-2 border-b border-slate-200 text-[13px]';

  return wrap(
    <>
      {/* 1. Thanh tab */}
      <div className="border-b border-slate-200 px-5 flex items-center gap-7">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`py-2.5 text-[13px] transition cursor-pointer border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-[#0070f4] text-[#0070f4] font-semibold'
                : 'border-transparent text-[#15171a] hover:text-[#0070f4]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'INFO' && (
        <>
          <div className="px-5 py-4 space-y-5">
            {/* Khách hàng + mã + trạng thái | Chi nhánh */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-[16px] font-bold text-[#15171a] truncate">
                  {hasCustomer && cust ? (
                    <PartnerLink kind="customer" code={cust.partnerCode} partnerId={cust.partnerId}>
                      {customerName}
                    </PartnerLink>
                  ) : (
                    customerName
                  )}
                </h3>
                <span className="text-[13px] text-[#677484] shrink-0">{order.orderCode}</span>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}>{badge.label}</span>
              </div>
              <span className="shrink-0 text-[13px] text-[#677484]">
                Chi nhánh: <span className="text-[#15171a] font-medium">{order.warehouseName || '—'}</span>
              </span>
            </div>

            {/* Người tạo / Người bán / Ngày bán / Bảng giá */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
              <div>
                <div className={fieldLabel}>Người tạo</div>
                <div className={fieldValue}>{order.createdByName || order.createdByUsername || '—'}</div>
              </div>
              <div>
                <div className={fieldLabel}>Người bán</div>
                <input
                  value={salesRep}
                  onChange={(e) => setSalesRep(e.target.value)}
                  disabled={isCancelled}
                  className="w-full pb-2 border-0 border-b border-slate-200 bg-transparent text-[13px] focus:outline-none focus:border-[#0070f4] disabled:text-[#677484]"
                />
              </div>
              <div>
                <div className={fieldLabel}>Ngày bán</div>
                <div className={fieldValue}>{formatDateTime(order.orderDate)}</div>
              </div>
              <div>
                <div className={fieldLabel}>Bảng giá</div>
                <div className={fieldValue}>{order.priceBookName || 'Bảng giá chung'}</div>
              </div>
            </div>

            {/* Dòng hàng */}
            <div className="rounded-[8px] border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]">
                  <tr>
                    <th className="py-2 px-3 w-36">Mã hàng</th>
                    <th className="py-2 px-3">Tên hàng</th>
                    <th className="py-2 px-3 w-24 text-right">Số lượng</th>
                    <th className="py-2 px-3 w-32 text-right">Đơn giá</th>
                    <th className="py-2 px-3 w-28 text-right">Giảm giá</th>
                    <th className="py-2 px-3 w-32 text-right">Giá bán</th>
                    <th className="py-2 px-3 w-36 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {order.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#677484] text-xs">
                        Hóa đơn không có dòng hàng.
                      </td>
                    </tr>
                  ) : (
                    order.items.map((it) => (
                      <tr key={it.orderItemId} className="hover:bg-[#f7f8f9]">
                        <td className="py-2.5 px-3 font-medium">
                          <ProductCodeLink code={it.productCode} productId={it.productId} />
                        </td>
                        <td className="py-2.5 px-3">
                          {it.productName}
                          {it.unitName ? <span className="text-[#677484]"> ({it.unitName})</span> : null}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">{money.format(it.quantity)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{money.format(it.originalPrice || it.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{it.discountAmount > 0 ? money.format(it.discountAmount) : ''}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{money.format(it.unitPrice)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold">{money.format(it.lineTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Ghi chú | Tổng kết */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isCancelled}
                placeholder="Ghi chú..."
                className="w-full resize-none rounded-[8px] border border-slate-300 p-2.5 text-[13px] focus:outline-none focus:border-[#0070f4] placeholder:text-[#677484] disabled:bg-[#f7f8f9] md:col-span-7"
              />
              <dl className="space-y-2 md:col-span-5 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Tổng tiền hàng ({money.format(totalQty)})</dt>
                  <dd className="font-mono">{money.format(order.items.reduce((s, it) => s + (it.lineTotal || 0), 0))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Giảm giá hóa đơn</dt>
                  <dd className="font-mono">{money.format(order.orderDiscountAmount || 0)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Khách cần trả</dt>
                  <dd className="font-mono font-semibold">{money.format(order.totalAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Khách đã trả</dt>
                  <dd className="font-mono font-semibold">{money.format(order.paidAmount)}</dd>
                </div>
                {order.outstandingAmount > 0 && (
                  <div className="flex justify-between font-semibold text-[#fb2c36]">
                    <dt>Còn nợ</dt>
                    <dd className="font-mono">{money.format(order.outstandingAmount)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Thanh thao tác */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-2.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isCancelled}
                onClick={() => setConfirmCancel(true)}
                className={`${textBtnCls} !text-[#fb2c36] disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                <Trash2 size={14} /> Hủy
              </button>
              <button type="button" onClick={handleCopy} className={textBtnCls}>
                <Copy size={14} /> Sao chép
              </button>
              <button type="button" onClick={() => exportInvoiceDetailToXLSX(order)} className={textBtnCls}>
                <FileDown size={14} /> Xuất file
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isCancelled || saving}
                onClick={() => void handleSave()}
                className={`${primaryBtnCls} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu
              </button>
              {/* Khách trả hàng theo hóa đơn này: mở tab Trả hàng ở màn Bán hàng (tab mới) */}
              {order.status === 'COMPLETED' && (
                <button
                  type="button"
                  onClick={() => window.open(`/pos?returnInvoice=${order.orderId}`, '_blank', 'noopener,noreferrer')}
                  className={outlineBtnCls}
                  title="Khách trả lại hàng của hóa đơn này"
                >
                  <Undo2 size={14} /> Trả hàng
                </button>
              )}
              <button type="button" onClick={handlePrint} className={outlineBtnCls}>
                <Printer size={14} /> In
              </button>
              {onClose && (
                <button type="button" onClick={onClose} className={outlineBtnCls}>
                  Đóng
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'PAYMENTS' && (
        <div className="px-5 py-4">
          <div className="rounded-[8px] border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className="py-2 px-3 w-40">Mã phiếu</th>
                  <th className="py-2 px-3 w-40">Thời gian</th>
                  <th className="py-2 px-3">Người tạo</th>
                  <th className="py-2 px-3 w-36">Phương thức</th>
                  <th className="py-2 px-3 w-32">Trạng thái</th>
                  <th className="py-2 px-3 w-36 text-right">Tiền thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {order.paymentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-[#677484] text-xs">
                      Chưa có phiếu thanh toán nào cho hóa đơn này.
                    </td>
                  </tr>
                ) : (
                  order.paymentTransactions.map((tx) => {
                    const cancelledTx = tx.status === 'CANCELLED';
                    return (
                      <tr key={tx.txId} className="hover:bg-[#f7f8f9]">
                        <td className="py-2.5 px-3 font-medium text-[#0070f4]">{tx.txCode}</td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTime(tx.transactionDate)}</td>
                        <td className="py-2.5 px-3">{tx.createdByName || '—'}</td>
                        <td className="py-2.5 px-3">{paymentMethodLabel(tx.paymentMethod)}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              cancelledTx ? 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' : 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]'
                            }`}
                          >
                            {cancelledTx ? 'Đã hủy' : 'Đã thanh toán'}
                          </span>
                        </td>
                        <td className={`py-2.5 px-3 text-right font-mono ${cancelledTx ? 'line-through text-[#677484]' : ''}`}>
                          {money.format(tx.amount)}
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

      {confirmCancel && (
        <CancelConfirmDialog orderCode={order.orderCode} busy={cancelling} onConfirm={handleCancel} onClose={() => setConfirmCancel(false)} />
      )}
    </>
  );
};
