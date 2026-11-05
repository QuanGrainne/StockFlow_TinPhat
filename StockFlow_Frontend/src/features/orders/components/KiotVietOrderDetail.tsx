// src/features/orders/components/KiotVietOrderDetail.tsx
// Chi tiết 1 hóa đơn (mở rộng ngay dưới dòng trong màn Hóa đơn), theo mẫu KiotViet:
// - Tab "Thông tin": khách, mã, trạng thái, người tạo/bán, ngày bán, kênh bán, bảng giá, dòng hàng, ghi chú, tổng kết.
// - Tab "Lịch sử thanh toán": các phiếu thu của hóa đơn.
// - Thao tác: Hủy, Sao chép (mở sang màn Bán hàng), Xuất file, Chỉnh sửa, Lưu, Trả hàng, In.

'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Select, Skeleton, Tag, Tooltip, message } from 'antd';
import { Calendar, Clock, Copy, FileOutput, Pencil, Printer, Save, Trash2, Undo2, X } from 'lucide-react';

import type { OrderDetail } from '../types';
import { orderService } from '../services/orderService';
import { exportInvoiceDetailToXLSX, formatDateTime, paymentMethodLabel, printInvoice } from '../utils/invoiceUtils';
import { newPosId, queuePosTab, type PosLine } from '@/features/pos/utils/posTabs';

const money = new Intl.NumberFormat('vi-VN');

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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const applyOrder = useCallback((data: OrderDetail) => {
    setOrder(data);
    setNotes(data.notes || '');
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
      setIsEditing(false);
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
      notes: order.notes || '',
    });
    message.success(`Đã sao chép ${order.orderCode} sang màn Bán hàng.`);
    openPos();
  };

  const handlePrint = () => {
    if (order && !printInvoice(order)) message.warning('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép cửa sổ bật lên.');
  };

  if (loading && !order) {
    return (
      <div className="bg-white p-6">
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (!order) {
    return <div className="bg-white p-6 text-center text-sm text-slate-500">Không tìm thấy thông tin hóa đơn.</div>;
  }

  const isCancelled = order.status === 'CANCELLED';
  const customerName = order.customer?.partnerId ? order.customer.partnerName : 'Khách lẻ';
  const totalQty = order.totalQuantity || order.items.reduce((s, it) => s + it.quantity, 0);

  const tabClass = (on: boolean) =>
    `-mb-px border-b-2 pb-2.5 text-sm font-medium transition ${
      on ? 'border-[#0071BA] text-[#0071BA]' : 'border-transparent text-slate-600 hover:text-slate-900'
    }`;

  return (
    <div className="cursor-default bg-white text-[13px] text-[#262626]" onClick={(e) => e.stopPropagation()}>
      {/* ─── Tabs ─── */}
      <div className="flex items-center gap-8 border-b border-slate-200 px-6 pt-3">
        <button type="button" onClick={() => setActiveTab('INFO')} className={tabClass(activeTab === 'INFO')}>
          Thông tin
        </button>
        <button type="button" onClick={() => setActiveTab('PAYMENTS')} className={tabClass(activeTab === 'PAYMENTS')}>
          Lịch sử thanh toán
        </button>
      </div>

      {activeTab === 'INFO' && (
        <>
          <div className="space-y-5 px-6 py-5">
            {/* Khách hàng + mã + trạng thái | Chi nhánh */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-slate-900">{customerName}</span>
                <span className="text-sm text-slate-600">{order.orderCode}</span>
                <Tag color={isCancelled ? 'error' : order.status === 'COMPLETED' ? 'success' : 'warning'} className="!m-0">
                  {isCancelled ? 'Đã hủy' : order.status === 'COMPLETED' ? 'Hoàn thành' : 'Phiếu tạm'}
                </Tag>
              </div>
              <span className="text-slate-700">{order.warehouseName}</span>
            </div>

            {/* Người tạo / Người bán / Ngày bán / Kênh bán / Bảng giá */}
            <div className="grid grid-cols-1 gap-x-10 gap-y-3 md:grid-cols-3">
              <div className="flex items-center gap-3">
                <span className="w-[72px] shrink-0 text-slate-500">Người tạo:</span>
                <span>{order.createdByName || order.createdByUsername || '—'}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-[72px] shrink-0 text-slate-500">Người bán:</span>
                {isEditing ? (
                  <Input size="small" value={salesRep} onChange={(e) => setSalesRep(e.target.value)} className="max-w-[260px]" />
                ) : (
                  <Select size="small" value={salesRep || undefined} disabled options={salesRep ? [{ value: salesRep, label: salesRep }] : []} className="w-full max-w-[260px]" />
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="w-[72px] shrink-0 text-slate-500">Ngày bán:</span>
                <span className="inline-flex h-7 items-center gap-2 rounded border border-slate-300 px-2.5">
                  {formatDateTime(order.orderDate)}
                  <Calendar size={13} className="text-slate-400" />
                  <Clock size={13} className="text-slate-400" />
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-[72px] shrink-0 text-slate-500">Kênh bán:</span>
                <Select size="small" value="DIRECT" disabled options={[{ value: 'DIRECT', label: 'Bán trực tiếp' }]} className="w-full max-w-[260px]" />
              </div>
              <div className="flex items-center gap-3">
                <span className="w-[72px] shrink-0 text-slate-500">Bảng giá:</span>
                <span>{order.priceBookName || 'Bảng giá chung'}</span>
              </div>
            </div>

            {/* Dòng hàng */}
            <div className="overflow-x-auto rounded border border-slate-200">
              <table className="w-full min-w-[720px] border-collapse text-left">
                <thead>
                  <tr className="bg-[#f5f6f8] text-[12px] font-semibold text-slate-700">
                    <th className="px-4 py-2.5">Mã hàng</th>
                    <th className="px-4 py-2.5">Tên hàng</th>
                    <th className="px-4 py-2.5 text-right">Số lượng</th>
                    <th className="px-4 py-2.5 text-right">Đơn giá</th>
                    <th className="px-4 py-2.5 text-right">Giảm giá</th>
                    <th className="px-4 py-2.5 text-right">Giá bán</th>
                    <th className="px-4 py-2.5 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-slate-400">
                        Hóa đơn không có dòng hàng.
                      </td>
                    </tr>
                  ) : (
                    order.items.map((it) => (
                      <tr key={it.orderItemId}>
                        <td className="px-4 py-2.5 text-[#0071BA]">{it.productCode}</td>
                        <td className="px-4 py-2.5">
                          {it.productName}
                          {it.unitName ? <span className="text-slate-500"> ({it.unitName})</span> : null}
                        </td>
                        <td className="px-4 py-2.5 text-right">{money.format(it.quantity)}</td>
                        <td className="px-4 py-2.5 text-right">{money.format(it.originalPrice || it.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right">{it.discountAmount > 0 ? money.format(it.discountAmount) : ''}</td>
                        <td className="px-4 py-2.5 text-right">{money.format(it.unitPrice)}</td>
                        <td className="px-4 py-2.5 text-right font-semibold">{money.format(it.lineTotal)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Ghi chú | Tổng kết */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú..."
                className="w-full resize-none rounded border border-slate-300 p-3 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-8"
              />
              <dl className="space-y-2.5 md:col-span-4">
                <div className="flex justify-between">
                  <dt className="text-slate-600">Tổng tiền hàng ({money.format(totalQty)})</dt>
                  <dd>{money.format(order.itemsTotalAmount || order.subTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Giảm giá hóa đơn</dt>
                  <dd>{money.format(order.orderDiscountAmount || 0)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-600">Khách cần trả</dt>
                  <dd>{money.format(order.totalAmount)}</dd>
                </div>
                <div className="flex justify-between font-semibold">
                  <dt className="text-slate-700">Khách đã trả</dt>
                  <dd>{money.format(order.paidAmount)}</dd>
                </div>
                {order.outstandingAmount > 0 && (
                  <div className="flex justify-between font-semibold text-rose-600">
                    <dt>Còn nợ</dt>
                    <dd>{money.format(order.outstandingAmount)}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Thanh thao tác */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-6 py-3">
            <div className="flex items-center gap-1">
              <Button type="text" icon={<Trash2 size={15} />} disabled={isCancelled} onClick={() => setConfirmCancel(true)}>
                Hủy
              </Button>
              <Button type="text" icon={<Copy size={15} />} onClick={handleCopy}>
                Sao chép
              </Button>
              <Button type="text" icon={<FileOutput size={15} />} onClick={() => exportInvoiceDetailToXLSX(order)}>
                Xuất file
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                icon={<Pencil size={14} />}
                disabled={isCancelled}
                onClick={() => setIsEditing((v) => !v)}
                className="!bg-[#0071BA] font-medium hover:!bg-[#005f9d]"
              >
                {isEditing ? 'Bỏ sửa' : 'Chỉnh sửa'}
              </Button>
              <Button icon={<Save size={14} />} loading={saving} disabled={isCancelled} onClick={handleSave}>
                Lưu
              </Button>
              <Tooltip title="Chức năng trả hàng đang được phát triển">
                <Button icon={<Undo2 size={14} />} disabled>
                  Trả hàng
                </Button>
              </Tooltip>
              <Button icon={<Printer size={14} />} onClick={handlePrint}>
                In
              </Button>
              {onClose && <Button onClick={onClose}>Đóng</Button>}
            </div>
          </div>
        </>
      )}

      {activeTab === 'PAYMENTS' && (
        <div className="px-6 py-4">
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className="bg-[#f5f6f8] text-[12px] font-semibold text-slate-700">
                  <th className="px-4 py-2.5">Mã phiếu</th>
                  <th className="px-4 py-2.5">Thời gian</th>
                  <th className="px-4 py-2.5">Người tạo</th>
                  <th className="px-4 py-2.5 text-right">Giá trị phiếu</th>
                  <th className="px-4 py-2.5">Phương thức</th>
                  <th className="px-4 py-2.5">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right">Tiền thu/chi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.paymentTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-slate-400">
                      Chưa có phiếu thanh toán nào cho hóa đơn này.
                    </td>
                  </tr>
                ) : (
                  order.paymentTransactions.map((tx) => {
                    const cancelledTx = tx.status === 'CANCELLED';
                    return (
                      <tr key={tx.txId}>
                        <td className="px-4 py-2.5 text-[#0071BA]">{tx.txCode}</td>
                        <td className="px-4 py-2.5">{formatDateTime(tx.transactionDate)}</td>
                        <td className="px-4 py-2.5">{tx.createdByName || '—'}</td>
                        <td className="px-4 py-2.5 text-right">{money.format(tx.amount)}</td>
                        <td className="px-4 py-2.5">{paymentMethodLabel(tx.paymentMethod)}</td>
                        <td className="px-4 py-2.5">
                          <Tag color={cancelledTx ? 'error' : 'success'} className="!m-0">
                            {cancelledTx ? 'Đã hủy' : 'Đã thanh toán'}
                          </Tag>
                        </td>
                        <td className="px-4 py-2.5 text-right">{money.format(tx.amount)}</td>
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
    </div>
  );
};
