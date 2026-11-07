// src/features/roles/components/common/StockCardDocumentModal.tsx
// Xem nhanh chứng từ từ Thẻ kho (bấm mã PN / THN / CK / KK / HD): thông tin phiếu + danh sách hàng + tổng tiền.
// Chỉ xem; nút "Mở phiếu" dẫn tới màn hình của chứng từ đó (sửa phiếu / chi tiết hóa đơn).

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink, Loader2, StickyNote, X } from 'lucide-react';
import { purchaseService } from '@/features/purchases/services/purchaseService';
import { purchaseReturnService } from '@/features/purchase-returns/services/purchaseReturnService';
import { transferService } from '@/features/transfers/services/transferService';
import { stocktakeService } from '@/features/stocktakes/services/stocktakeService';
import { orderService } from '@/features/orders/services/orderService';
import { purchaseOrderService } from '@/features/purchase-orders/services/purchaseOrderService';
import { PO_STATUS } from '@/features/purchase-orders/utils/purchaseOrderUtils';
import { documentLinkHref, toLinkDate } from '@/lib/navigation/documentLink';
import { ProductCodeLink } from '@/components/links/EntityLinks';

/** Mở trang ở tab mới (không rời màn hình đang làm việc) */
const openInNewTab = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');

export interface StockCardDocumentRef {
  referenceType: string;
  documentId: number;
  documentCode: string;
}

type Align = 'left' | 'right';
interface Column {
  key: string;
  label: string;
  align: Align;
}
type Cell = string | number | null | undefined;
interface DocView {
  title: string;
  code: string;
  statusLabel: string;
  statusTone: 'green' | 'blue' | 'amber' | 'red' | 'slate';
  branch: string;
  info: { label: string; value: string; highlight?: boolean; href?: string }[];
  columns: Column[];
  rows: Record<string, Cell>[];
  totals: { label: string; value: string; strong?: boolean }[];
  notes?: string | null;
  openHref?: string;
  openLabel?: string;
}

const money = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : Math.round(n).toLocaleString('vi-VN');
const qtyFmt = (n: number | null | undefined) =>
  n === null || n === undefined ? '' : n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

function dateTime(value?: string | null): string {
  if (!value) return '';
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}`;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('vi-VN');
}

const TONE: Record<DocView['statusTone'], string> = {
  green: 'bg-emerald-50 text-emerald-700',
  blue: 'bg-blue-50 text-blue-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-rose-50 text-rose-700',
  slate: 'bg-slate-100 text-slate-600',
};

const ITEM_COLS = { code: { key: 'code', label: 'Mã hàng', align: 'left' }, name: { key: 'name', label: 'Tên hàng', align: 'left' } } as const;

/** Tải chứng từ theo loại tham chiếu của dòng thẻ kho và quy về 1 dạng hiển thị chung */
async function loadDocument(ref: StockCardDocumentRef): Promise<DocView> {
  const type = ref.referenceType.toUpperCase();

  if (type === 'GOODS_RECEIPT') {
    const d = await purchaseService.getPurchaseById(ref.documentId);
    const goods = d.totalGoodsAmount ?? d.items.reduce((s, i) => s + i.totalPrice, 0);
    const status = { DRAFT: ['Phiếu tạm', 'amber'], COMPLETED: ['Đã nhập hàng', 'green'], CANCELLED: ['Đã hủy', 'red'] }[d.status] ?? [d.status, 'slate'];
    return {
      title: 'Phiếu nhập hàng',
      code: d.grCode,
      statusLabel: status[0],
      statusTone: status[1] as DocView['statusTone'],
      branch: d.warehouseName,
      info: [
        { label: 'Người nhập', value: d.receivedByName },
        { label: 'Ngày nhập', value: dateTime(d.receivedDate) },
        {
          label: 'Tên NCC',
          value: d.partnerCode ? `${d.partnerName} (${d.partnerCode})` : d.partnerName,
          highlight: true,
          href: d.partnerCode ? documentLinkHref('/suppliers', { code: d.partnerCode, id: d.partnerId }) : undefined,
        },
      ],
      columns: [
        ITEM_COLS.code, ITEM_COLS.name,
        { key: 'qty', label: 'Số lượng', align: 'right' },
        { key: 'unitPrice', label: 'Đơn giá', align: 'right' },
        { key: 'discount', label: 'Giảm giá', align: 'right' },
        { key: 'price', label: 'Giá nhập', align: 'right' },
        { key: 'total', label: 'Thành tiền', align: 'right' },
      ],
      rows: d.items.map((i) => {
        const disc = i.unitPrice * ((i.discountPercent || 0) / 100);
        return {
          code: i.productCode, productId: i.productId, name: i.productName, qty: qtyFmt(i.quantity), unitPrice: money(i.unitPrice),
          discount: disc > 0 ? money(disc) : '', price: money(i.unitPrice - disc), total: money(i.totalPrice),
        };
      }),
      totals: [
        { label: 'Số lượng mặt hàng', value: String(d.items.length) },
        { label: `Tổng tiền hàng (${qtyFmt(d.items.reduce((s, i) => s + i.quantity, 0))})`, value: money(goods) },
        { label: 'Giảm giá', value: money(d.discountAmount ?? 0) },
        { label: 'Tổng cộng', value: money(d.totalAmount), strong: true },
        { label: 'Tiền đã trả NCC', value: money(d.paidAmount) },
      ],
      notes: d.notes,
      openHref: documentLinkHref('/purchases', {
        code: d.grCode, id: d.grId, date: toLinkDate(d.receivedDate), warehouseId: d.warehouseId,
      }),
    };
  }

  if (type === 'PURCHASE_RETURN') {
    const d = await purchaseReturnService.getById(ref.documentId);
    const status = { DRAFT: ['Phiếu tạm', 'amber'], COMPLETED: ['Đã trả hàng', 'green'], CANCELLED: ['Đã hủy', 'red'] }[d.status] ?? [d.status, 'slate'];
    return {
      title: 'Phiếu trả hàng nhập',
      code: d.returnCode,
      statusLabel: status[0],
      statusTone: status[1] as DocView['statusTone'],
      branch: d.warehouseName,
      info: [
        { label: 'Người tạo', value: d.createdByName },
        { label: 'Ngày trả', value: dateTime(d.returnDate) },
        {
          label: 'Tên NCC',
          value: d.partnerCode ? `${d.partnerName} (${d.partnerCode})` : d.partnerName,
          highlight: true,
          href: d.partnerCode ? documentLinkHref('/suppliers', { code: d.partnerCode, id: d.partnerId }) : undefined,
        },
        ...(d.grCode
          ? [{ label: 'Phiếu nhập', value: d.grCode, highlight: true, href: documentLinkHref('/purchases', { code: d.grCode, id: d.grId, warehouseId: d.warehouseId }) }]
          : []),
      ],
      columns: [
        ITEM_COLS.code, ITEM_COLS.name,
        { key: 'qty', label: 'Số lượng', align: 'right' },
        { key: 'importPrice', label: 'Giá nhập', align: 'right' },
        { key: 'returnPrice', label: 'Giá trả lại', align: 'right' },
        { key: 'total', label: 'Thành tiền', align: 'right' },
      ],
      rows: d.items.map((i) => ({
        code: i.productCode, productId: i.productId, name: i.productName, qty: qtyFmt(i.quantity),
        importPrice: money(i.importPrice), returnPrice: money(i.returnPrice), total: money(i.totalPrice),
      })),
      totals: [
        { label: 'Số lượng mặt hàng', value: String(d.items.length) },
        { label: `Tổng tiền hàng (${qtyFmt(d.items.reduce((s, i) => s + i.quantity, 0))})`, value: money(d.totalGoodsAmount) },
        { label: 'Giảm giá', value: money(d.discountAmount) },
        { label: 'NCC cần trả', value: money(d.totalAmount), strong: true },
        { label: 'NCC đã trả', value: money(d.refundAmount) },
      ],
      notes: d.notes,
      openHref: documentLinkHref('/purchase-returns', {
        code: d.returnCode, id: d.purchaseReturnId, date: toLinkDate(d.returnDate), warehouseId: d.warehouseId,
      }),
    };
  }

  if (type === 'TRANSFER') {
    const d = await transferService.getTransferById(ref.documentId);
    const status = {
      DRAFT: ['Phiếu tạm', 'amber'], IN_TRANSIT: ['Đang chuyển', 'blue'], RECEIVED: ['Đã nhận', 'green'], CANCELLED: ['Đã hủy', 'red'],
    }[d.status] ?? [d.status, 'slate'];
    return {
      title: 'Phiếu chuyển hàng',
      code: d.code,
      statusLabel: status[0],
      statusTone: status[1] as DocView['statusTone'],
      branch: `${d.sourceWarehouseName} → ${d.destWarehouseName}`,
      info: [
        { label: 'Người tạo', value: d.createdBy },
        { label: 'Ngày chuyển', value: dateTime(d.transferDate) },
        { label: 'Người nhận', value: d.receivedBy ?? '' },
        { label: 'Ngày nhận', value: dateTime(d.receivedDate) },
      ],
      columns: [
        ITEM_COLS.code, ITEM_COLS.name,
        { key: 'qty', label: 'SL chuyển', align: 'right' },
        { key: 'received', label: 'SL nhận', align: 'right' },
        { key: 'price', label: 'Giá chuyển', align: 'right' },
        { key: 'total', label: 'Thành tiền', align: 'right' },
      ],
      rows: d.items.map((i) => ({
        code: i.productCode, productId: i.productId, name: i.productName, qty: qtyFmt(i.transferQuantity),
        received: qtyFmt(i.receivedQuantity ?? null), price: money(i.transferPrice), total: money(i.lineTotal),
      })),
      totals: [
        { label: 'Số lượng mặt hàng', value: String(d.items.length) },
        { label: 'Tổng SL chuyển', value: qtyFmt(d.totalQuantity) },
        ...(d.totalReceivedQuantity !== null && d.totalReceivedQuantity !== undefined
          ? [{ label: 'Tổng SL nhận', value: qtyFmt(d.totalReceivedQuantity) }]
          : []),
        { label: 'Tổng giá trị chuyển', value: money(d.totalAmount), strong: true },
      ],
      notes: [d.notes ? `Ghi chú chuyển: ${d.notes}` : '', d.receiveNotes ? `Ghi chú nhận: ${d.receiveNotes}` : '']
        .filter(Boolean)
        .join('\n'),
      openHref: documentLinkHref('/transfers', { code: d.code, id: d.id, date: toLinkDate(d.transferDate) }),
    };
  }

  if (type === 'STOCKTAKE') {
    const d = await stocktakeService.getById(ref.documentId);
    const s = d.summary;
    const status = { DRAFT: ['Phiếu tạm', 'amber'], BALANCED: ['Đã cân bằng kho', 'green'], CANCELLED: ['Đã hủy', 'red'] }[s.status] ?? [s.status, 'slate'];
    return {
      title: 'Phiếu kiểm kho',
      code: s.stocktakeCode,
      statusLabel: status[0],
      statusTone: status[1] as DocView['statusTone'],
      branch: s.warehouseName,
      info: [
        { label: 'Người tạo', value: s.createdByName },
        { label: 'Ngày tạo', value: dateTime(s.stocktakeDate) },
        { label: 'Người cân bằng', value: s.balancedByName ?? '' },
        { label: 'Ngày cân bằng', value: dateTime(s.balancedDate) },
      ],
      columns: [
        ITEM_COLS.code, ITEM_COLS.name,
        { key: 'system', label: 'Tồn kho', align: 'right' },
        { key: 'actual', label: 'Thực tế', align: 'right' },
        { key: 'diff', label: 'SL lệch', align: 'right' },
        { key: 'diffValue', label: 'Giá trị lệch', align: 'right' },
      ],
      rows: d.items.map((i) => ({
        code: i.productCode, productId: i.productId, name: i.productName, system: qtyFmt(i.systemQty), actual: qtyFmt(i.actualQty),
        diff: qtyFmt(i.discrepancy), diffValue: money(i.discrepancyValue),
      })),
      totals: [
        { label: 'Tổng thực tế', value: `${qtyFmt(s.totalActualQty)} (${money(s.totalActualValue)})` },
        { label: 'Lệch tăng', value: `${qtyFmt(s.increaseQty)} (${money(s.increaseValue)})` },
        { label: 'Lệch giảm', value: `${qtyFmt(s.decreaseQty)} (${money(s.decreaseValue)})` },
        { label: 'Tổng chênh lệch', value: `${qtyFmt(s.totalDiscrepancyQty)} (${money(s.totalDiscrepancyValue)})`, strong: true },
      ],
      notes: s.notes,
      openHref: documentLinkHref('/stocktakes', {
        code: s.stocktakeCode, id: s.stocktakeId, date: toLinkDate(s.stocktakeDate), warehouseId: s.warehouseId,
      }),
    };
  }

  if (type === 'STOCK_ISSUE') {
    const d = await orderService.getOrderDetail(ref.documentId);
    const status = {
      COMPLETED: ['Hoàn thành', 'green'], PENDING: ['Đang xử lý', 'blue'], DRAFT: ['Phiếu tạm', 'amber'], CANCELLED: ['Đã hủy', 'red'],
    }[d.status] ?? [d.status, 'slate'];
    return {
      title: 'Hóa đơn bán hàng',
      code: d.orderCode,
      statusLabel: status[0],
      statusTone: status[1] as DocView['statusTone'],
      branch: d.warehouseName,
      info: [
        { label: 'Người tạo', value: d.createdByName },
        { label: 'Ngày bán', value: dateTime(d.orderDate) },
        {
          label: 'Khách hàng',
          value: d.customer?.partnerCode ? `${d.customer.partnerName} (${d.customer.partnerCode})` : d.customer?.partnerName ?? '',
          highlight: true,
          href: d.customer?.partnerCode
            ? documentLinkHref('/customers', { code: d.customer.partnerCode, id: d.customer.partnerId })
            : undefined,
        },
      ],
      columns: [
        ITEM_COLS.code, ITEM_COLS.name,
        { key: 'qty', label: 'Số lượng', align: 'right' },
        { key: 'unitPrice', label: 'Đơn giá', align: 'right' },
        { key: 'discount', label: 'Giảm giá', align: 'right' },
        { key: 'price', label: 'Giá bán', align: 'right' },
        { key: 'total', label: 'Thành tiền', align: 'right' },
      ],
      rows: d.items.map((i) => ({
        code: i.productCode, productId: i.productId, name: i.productName, qty: qtyFmt(i.quantity), unitPrice: money(i.originalPrice),
        discount: i.discountAmount > 0 ? money(i.discountAmount) : '', price: money(i.unitPrice), total: money(i.lineTotal),
      })),
      totals: [
        { label: 'Số lượng mặt hàng', value: String(d.items.length) },
        { label: `Tổng tiền hàng (${qtyFmt(d.totalQuantity)})`, value: money(d.subTotal) },
        { label: 'Giảm giá hóa đơn', value: money(d.orderDiscountAmount) },
        { label: 'Khách cần trả', value: money(d.totalAmount), strong: true },
        { label: 'Khách đã trả', value: money(d.paidAmount) },
      ],
      notes: d.notes,
      openHref: `/orders/${d.orderId}`,
      openLabel: 'Xem hóa đơn',
    };
  }

  if (type === 'PURCHASE_ORDER') {
    const d = ref.documentId > 0
      ? await purchaseOrderService.getPurchaseOrder(ref.documentId)
      : await purchaseOrderService.getPurchaseOrderByCode(ref.documentCode);
    const status = PO_STATUS[d.status];
    const tone: Record<string, DocView['statusTone']> = {
      DRAFT: 'amber', ORDERED: 'blue', PARTIAL: 'blue', COMPLETED: 'green', CANCELLED: 'red',
    };
    return {
      title: 'Phiếu đặt hàng nhập',
      code: d.poCode,
      statusLabel: status?.label ?? d.status,
      statusTone: tone[d.status] ?? 'slate',
      branch: d.warehouseName,
      info: [
        { label: 'Người tạo', value: d.createdByName },
        { label: 'Ngày đặt', value: dateTime(d.orderDate) },
        {
          label: 'Tên NCC',
          value: d.partnerCode ? `${d.partnerName} (${d.partnerCode})` : d.partnerName,
          highlight: true,
          href: d.partnerCode ? documentLinkHref('/suppliers', { code: d.partnerCode, id: d.partnerId }) : undefined,
        },
        ...(d.receipts.length
          ? [{ label: 'Phiếu nhập', value: d.receipts.map((r) => r.grCode).join(', ') }]
          : []),
        ...(d.mergedIntoCode ? [{ label: 'Đã gộp vào', value: d.mergedIntoCode, highlight: true }] : []),
      ],
      columns: [
        ITEM_COLS.code, ITEM_COLS.name,
        { key: 'qty', label: 'SL đặt', align: 'right' },
        { key: 'received', label: 'Đã nhập', align: 'right' },
        { key: 'unitPrice', label: 'Đơn giá', align: 'right' },
        { key: 'discount', label: 'Giảm giá', align: 'right' },
        { key: 'total', label: 'Thành tiền', align: 'right' },
      ],
      rows: d.items.map((i) => {
        const disc = i.unitPrice * ((i.discountPercent || 0) / 100);
        return {
          code: i.productCode, productId: i.productId, name: i.productName, qty: qtyFmt(i.orderedQty),
          received: qtyFmt(i.receivedQty), unitPrice: money(i.unitPrice), discount: disc > 0 ? money(disc) : '',
          total: money(i.lineTotal),
        };
      }),
      totals: [
        { label: 'Số lượng mặt hàng', value: String(d.items.length) },
        { label: `Tổng tiền hàng (${qtyFmt(d.items.reduce((s, i) => s + i.orderedQty, 0))})`, value: money(d.totalGoodsAmount) },
        { label: 'Giảm giá', value: money(d.discountAmount) },
        { label: 'Tổng cộng', value: money(d.totalAmount), strong: true },
        { label: 'Đã trả NCC', value: money(d.paidAmount) },
      ],
      notes: d.notes,
      openHref: documentLinkHref('/purchase-orders', { code: d.poCode, id: d.poId }),
    };
  }

  throw new Error('Chứng từ này không có màn hình xem chi tiết.');
}

interface Props {
  doc: StockCardDocumentRef;
  onClose: () => void;
}

export function StockCardDocumentModal({ doc, onClose }: Props) {
  const [view, setView] = useState<{ key: string; data: DocView | null; error: string | null } | null>(null);
  const [codeFilter, setCodeFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const docKey = `${doc.referenceType}#${doc.documentId}#${doc.documentCode}`;
  const loading = view?.key !== docKey;
  const data = view?.key === docKey ? view.data : null;
  const error = view?.key === docKey ? view.error : null;

  useEffect(() => {
    let cancelled = false;
    loadDocument(doc)
      .then((v) => !cancelled && setView({ key: docKey, data: v, error: null }))
      .catch((err: unknown) =>
        !cancelled && setView({ key: docKey, data: null, error: err instanceof Error ? err.message : 'Không tải được chứng từ.' })
      );
    return () => {
      cancelled = true;
    };
  }, [doc, docKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const rows = useMemo(() => {
    if (!data) return [];
    const c = codeFilter.trim().toLowerCase();
    const n = nameFilter.trim().toLowerCase();
    return data.rows.filter(
      (r) =>
        (!c || String(r.code ?? '').toLowerCase().includes(c)) &&
        (!n || String(r.name ?? '').toLowerCase().includes(n))
    );
  }, [data, codeFilter, nameFilter]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[900] flex items-start justify-center bg-slate-900/40 p-4 sm:p-8 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[1100px] bg-white rounded-2xl shadow-2xl border border-slate-200 my-auto">
        {/* Tiêu đề */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-lg font-bold text-slate-900">{data?.title ?? 'Chứng từ'}</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 cursor-pointer" aria-label="Đóng">
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-slate-500">
            <Loader2 size={18} className="inline animate-spin mr-2" />
            Đang tải {doc.documentCode}...
          </div>
        ) : error || !data ? (
          <div className="py-16 text-center text-sm text-rose-600">{error ?? 'Không tải được chứng từ.'}</div>
        ) : (
          <div className="px-6 pb-5">
            {/* Mã + trạng thái + chi nhánh */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-[15px] font-semibold text-slate-900">{data.code}</span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${TONE[data.statusTone]}`}>{data.statusLabel}</span>
              </div>
              <span className="text-sm text-slate-700">{data.branch}</span>
            </div>

            {/* Thông tin phiếu */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-2.5 text-[13px]">
              {data.info.map((f) => (
                <div key={f.label} className="flex gap-3">
                  <span className="w-28 shrink-0 text-slate-500">{f.label}:</span>
                  {f.href && f.value ? (
                    <button
                      type="button"
                      onClick={() => openInNewTab(f.href as string)}
                      className="text-left text-[#0070f4] font-medium hover:underline cursor-pointer"
                      title={`Mở ${f.value}`}
                    >
                      {f.value}
                    </button>
                  ) : (
                    <span className={f.highlight ? 'text-[#0070f4] font-medium' : 'text-slate-800'}>{f.value || '—'}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Danh sách hàng */}
            <div className="mt-5 border border-slate-200 rounded-lg overflow-x-auto">
              <table className="w-full text-[13px] border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-[#f1f3f6] text-slate-700">
                    {data.columns.map((c) => (
                      <th key={c.key} className={`py-2.5 px-3 font-semibold ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                        {c.label}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b border-slate-200">
                    <th className="py-2 px-3">
                      <input
                        value={codeFilter}
                        onChange={(e) => setCodeFilter(e.target.value)}
                        placeholder="Tìm mã"
                        className="w-full h-8 px-2.5 rounded-md border border-slate-300 text-[13px] font-normal outline-none focus:border-[#0070f4]"
                      />
                    </th>
                    <th className="py-2 px-3">
                      <input
                        value={nameFilter}
                        onChange={(e) => setNameFilter(e.target.value)}
                        placeholder="Tìm tên hàng"
                        className="w-full h-8 px-2.5 rounded-md border border-slate-300 text-[13px] font-normal outline-none focus:border-[#0070f4]"
                      />
                    </th>
                    <th colSpan={data.columns.length - 2} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={data.columns.length} className="py-6 text-center text-slate-400">
                        Không có hàng hóa phù hợp
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr key={`${String(r.code)}-${idx}`}>
                        {data.columns.map((c) => (
                          <td
                            key={c.key}
                            className={`py-2.5 px-3 ${c.align === 'right' ? 'text-right' : ''} ${
                              c.key === 'code' ? 'text-[#0070f4] whitespace-nowrap' : c.key === 'total' ? 'font-semibold text-slate-900' : 'text-slate-800'
                            }`}
                          >
                            {c.key === 'code' && r.code ? (
                              <ProductCodeLink
                                code={String(r.code)}
                                productId={typeof r.productId === 'number' ? r.productId : null}
                              />
                            ) : (
                              r[c.key] ?? ''
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Ghi chú + tổng */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-2 text-[13px] text-slate-600 whitespace-pre-line max-w-xl">
                <StickyNote size={15} className="mt-0.5 shrink-0 text-slate-500" />
                <span>{data.notes?.trim() ? data.notes : 'Không có ghi chú'}</span>
              </div>
              <div className="min-w-[300px] space-y-1.5 text-[13px]">
                {data.totals.map((t) => (
                  <div key={t.label} className="flex justify-between gap-6">
                    <span className="text-slate-600">{t.label}</span>
                    <span className={t.strong ? 'font-bold text-slate-900' : 'text-slate-800'}>{t.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mở phiếu */}
            {data.openHref && (
              <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => openInNewTab(data.openHref as string)}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-[#0070f4] hover:bg-[#005ac3] text-white text-sm font-semibold cursor-pointer"
                >
                  <ExternalLink size={15} />
                  <span>{data.openLabel ?? 'Mở phiếu'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
