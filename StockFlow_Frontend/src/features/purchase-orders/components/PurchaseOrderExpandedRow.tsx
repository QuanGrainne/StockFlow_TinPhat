'use client';

// Chi tiết Phiếu đặt hàng nhập dạng dòng mở rộng — cùng bố cục với màn Nhập hàng / Nhà cung cấp:
//   [Thông tin: đối chiếu SL đặt ↔ SL đã nhập] [Lịch sử nhập hàng]

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { ArrowDownToLine, CheckCheck, Copy, FileDown, Loader2, Pencil, Printer, Save, Trash2 } from 'lucide-react';
import { DocumentCodeLink, PartnerLink, ProductCodeLink } from '@/components/links/EntityLinks';
import { formatDateTimeVN } from '@/lib/utils/date';
import { toLinkDate } from '@/lib/navigation/documentLink';
import { purchaseOrderService } from '../services/purchaseOrderService';
import type { PurchaseOrderDetail, PurchaseOrderItem } from '../types';
import { printPurchaseOrder } from '../utils/printPurchaseOrder';
import { exportPurchaseOrderDetailToXLSX, PO_STATUS } from '../utils/purchaseOrderUtils';

const fmt = (v: number) => Math.round(v || 0).toLocaleString('vi-VN');
const qty = (v: number) => (v || 0).toLocaleString('vi-VN');

const RECEIPT_STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Đã nhập hàng', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  DRAFT: { label: 'Phiếu tạm', cls: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};

const theadCls = 'bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]';
const textBtnCls =
  'inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] text-[13px] font-semibold text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const outlineBtnCls =
  'inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] text-[#15171a] text-[13px] font-semibold transition cursor-pointer disabled:opacity-50';
const primaryBtnCls =
  'inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs transition cursor-pointer';

/** Chênh lệch thực nhập so với đặt: âm = còn thiếu, dương = nhập dư */
function DiffCell({ item }: { item: PurchaseOrderItem }) {
  const diff = item.receivedQty - item.orderedQty;
  if (diff === 0) return <span className="text-[#16a34a] font-semibold">Đủ</span>;
  return <span className={diff < 0 ? 'text-[#fb2c36] font-semibold' : 'text-[#d97706] font-semibold'}>{diff > 0 ? `+${qty(diff)}` : qty(diff)}</span>;
}

interface PurchaseOrderExpandedRowProps {
  poId: number;
  colSpan: number;
  onClose: () => void;
  onChanged: () => void;
}

export default function PurchaseOrderExpandedRow({ poId, colSpan, onClose, onChanged }: PurchaseOrderExpandedRowProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'info' | 'receipts'>('info');
  const [reloadTick, setReloadTick] = useState(0);
  const key = `${poId}#${reloadTick}`;
  const [result, setResult] = useState<{ key: string; po: PurchaseOrderDetail | null }>({ key: '', po: null });
  const [confirm, setConfirm] = useState<'cancel' | 'finish' | null>(null);
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const loading = result.key !== key;

  useEffect(() => {
    let alive = true;
    purchaseOrderService
      .getPurchaseOrder(poId)
      .then((po) => {
        if (!alive) return;
        setResult({ key: `${poId}#${reloadTick}`, po });
        setNotes(po.notes ?? '');
      })
      .catch((err: unknown) => {
        if (!alive) return;
        message.error(err instanceof Error ? err.message : 'Không tải được phiếu đặt hàng nhập.');
        setResult({ key: `${poId}#${reloadTick}`, po: null });
      });
    return () => {
      alive = false;
    };
  }, [poId, reloadTick]);

  const po = result.po;

  const runConfirm = async () => {
    if (!po || !confirm) return;
    setBusy(true);
    try {
      if (confirm === 'cancel') {
        await purchaseOrderService.cancelPurchaseOrder(po.poId);
        message.success(`Đã hủy phiếu ${po.poCode}`);
      } else {
        await purchaseOrderService.finishPurchaseOrder(po.poId);
        message.success(`Đã kết thúc phiếu ${po.poCode}`);
      }
      setConfirm(null);
      setReloadTick((t) => t + 1);
      onChanged();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Thao tác thất bại.');
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!po) return;
    setSaving(true);
    try {
      await purchaseOrderService.updateNotes(po.poId, notes.trim());
      message.success(`Đã lưu phiếu ${po.poCode}`);
      setReloadTick((t) => t + 1);
      onChanged();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được phiếu.');
    } finally {
      setSaving(false);
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

  if (loading && !po) {
    return wrap(
      <div className="p-8 flex items-center justify-center text-slate-400 gap-2">
        <Loader2 size={16} className="animate-spin text-[#0070f4]" />
        <span className="text-xs">Đang tải phiếu đặt hàng nhập...</span>
      </div>
    );
  }
  if (!po) return wrap(<div className="p-6 text-center text-xs text-[#677484]">Không tìm thấy phiếu đặt hàng nhập.</div>);

  const badge = PO_STATUS[po.status];
  const hasActiveReceipt = po.receipts.some((r) => r.status !== 'CANCELLED');
  const canEdit = (po.status === 'DRAFT' || po.status === 'ORDERED') && !hasActiveReceipt;
  const canReceive = po.status === 'ORDERED' || po.status === 'PARTIAL';
  const canCancel = po.status !== 'CANCELLED' && !hasActiveReceipt;
  const isCancelled = po.status === 'CANCELLED';
  const totalOrdered = po.items.reduce((s, i) => s + i.orderedQty, 0);
  const totalReceived = po.items.reduce((s, i) => s + i.receivedQty, 0);
  const tabs = [
    { key: 'info' as const, label: 'Thông tin' },
    { key: 'receipts' as const, label: `Lịch sử nhập hàng (${po.receipts.length})` },
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

      {tab === 'info' && (
        <>
          <div className="px-5 py-4 space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2 min-w-0">
                <h3 className="text-[16px] font-bold truncate">
                  <PartnerLink kind="supplier" code={po.partnerCode} partnerId={po.partnerId}>
                    {po.partnerName}
                  </PartnerLink>
                </h3>
                <span className="text-[#677484] shrink-0">{po.poCode}</span>
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}>{badge.label}</span>
              </div>
              <span className="shrink-0 text-[#677484]">
                Chi nhánh: <span className="text-[#15171a] font-medium">{po.warehouseName}</span>
              </span>
            </div>

            {po.mergedIntoCode && (
              <div className="px-3 py-2 rounded-[8px] bg-[#fffbeb] border border-[#fde68a]">
                Phiếu này đã được gộp vào{' '}
                <DocumentCodeLink kind="purchase-order" code={po.mergedIntoCode} id={po.mergedIntoPoId} className="font-semibold" />
              </div>
            )}
            {!!po.mergedFromCodes?.length && (
              <div className="px-3 py-2 rounded-[8px] bg-[#e6f1fe] border border-[#0070f4]/25">
                Gộp từ các phiếu:{' '}
                {po.mergedFromCodes.map((code, i) => (
                  <React.Fragment key={code}>
                    {i > 0 && ', '}
                    <DocumentCodeLink kind="purchase-order" code={code} className="font-semibold" />
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <div>
                <div className="text-[12px] text-[#677484] mb-1">Người tạo</div>
                <div className="pb-2 border-b border-slate-200">{po.createdByName || '—'}</div>
              </div>
              <div>
                <div className="text-[12px] text-[#677484] mb-1">Ngày đặt</div>
                <div className="pb-2 border-b border-slate-200">{formatDateTimeVN(po.orderDate)}</div>
              </div>
              <div>
                <div className="text-[12px] text-[#677484] mb-1">Đã nhập / Đã đặt</div>
                <div className="pb-2 border-b border-slate-200 font-semibold">
                  {qty(totalReceived)} / {qty(totalOrdered)}
                </div>
              </div>
            </div>

            {/* Bảng đối chiếu số lượng đặt ↔ thực nhập */}
            <div className="rounded-[8px] border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className={theadCls}>
                  <tr>
                    <th className="py-2 px-3 w-32">Mã hàng</th>
                    <th className="py-2 px-3">Tên hàng</th>
                    <th className="py-2 px-3 w-24 text-right">SL đặt</th>
                    <th className="py-2 px-3 w-24 text-right">SL đã nhập</th>
                    <th className="py-2 px-3 w-24 text-right">Chênh lệch</th>
                    <th className="py-2 px-3 w-28 text-right">Đơn giá</th>
                    <th className="py-2 px-3 w-32 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[13px]">
                  {po.items.map((it) => (
                    <tr key={it.productId} className="hover:bg-[#f7f8f9]">
                      <td className="py-2.5 px-3 font-medium">
                        <ProductCodeLink code={it.productCode} productId={it.productId} />
                      </td>
                      <td className="py-2.5 px-3">
                        {it.productName}
                        <span className="text-[#677484]"> ({it.unit})</span>
                        {it.orderedQty === 0 && (
                          <span className="ml-2 px-1.5 py-0.5 rounded-[4px] text-[10px] font-semibold bg-[#fffbeb] text-[#d97706] border border-[#fde68a]">
                            Ngoài phiếu đặt
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{qty(it.orderedQty)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{qty(it.receivedQty)}</td>
                      <td className="py-2.5 px-3 text-right font-mono">
                        <DiffCell item={it} />
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{it.orderedQty > 0 ? fmt(it.unitPrice) : ''}</td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold">{it.orderedQty > 0 ? fmt(it.lineTotal) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
              <textarea
                rows={3}
                maxLength={500}
                value={notes}
                disabled={isCancelled}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú..."
                className="w-full resize-none rounded-[8px] border border-slate-300 p-2.5 text-[13px] focus:outline-none focus:border-[#0070f4] placeholder:text-[#677484] disabled:bg-[#f7f8f9] md:col-span-7"
              />
              <dl className="space-y-2 md:col-span-5">
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Tổng tiền hàng</dt>
                  <dd className="font-mono">{fmt(po.totalGoodsAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Giảm giá</dt>
                  <dd className="font-mono">{fmt(po.discountAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#677484]">Tiền đã trả NCC</dt>
                  <dd className="font-mono text-[#16a34a]">{fmt(po.paidAmount)}</dd>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <dt className="font-semibold">Tổng cộng</dt>
                  {/* Giá trị đơn đặt (sau giảm giá) trừ tiền đã trả NCC */}
                  <dd className="font-mono font-semibold">{fmt(Math.max(0, po.totalAmount - po.paidAmount))}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-2.5">
            <div className="flex items-center gap-1">
              <button type="button" disabled={!canCancel} onClick={() => setConfirm('cancel')} className={`${textBtnCls} !text-[#fb2c36]`}>
                <Trash2 size={14} /> Hủy
              </button>
              <button type="button" onClick={() => router.push(`/purchase-orders/create?copy=${po.poId}`)} className={textBtnCls}>
                <Copy size={14} /> Sao chép
              </button>
              <button type="button" onClick={() => exportPurchaseOrderDetailToXLSX(po)} className={textBtnCls}>
                <FileDown size={14} /> Xuất file
              </button>
            </div>
            <div className="flex items-center gap-2">
              {po.status === 'PARTIAL' && (
                <button type="button" onClick={() => setConfirm('finish')} className={outlineBtnCls}>
                  <CheckCheck size={14} /> Kết thúc
                </button>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => router.push(`/purchase-orders/create?edit=${po.poId}`)}
                  title="Mở phiếu để chỉnh sửa"
                  className={po.status === 'DRAFT' ? `${outlineBtnCls} !border-[#0070f4]/40 !text-[#0070f4] hover:!bg-blue-50` : outlineBtnCls}
                >
                  <Pencil size={14} /> {po.status === 'DRAFT' ? 'Mở phiếu' : 'Sửa'}
                </button>
              )}
              {canReceive && (
                <button type="button" onClick={() => router.push(`/purchases/create?po=${po.poId}`)} className={primaryBtnCls}>
                  <ArrowDownToLine size={14} /> Nhập hàng
                </button>
              )}
              <button
                type="button"
                disabled={isCancelled || saving}
                onClick={() => void handleSave()}
                className={`${canReceive ? outlineBtnCls : primaryBtnCls} disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu
              </button>
              <button type="button" onClick={() => printPurchaseOrder(po, notes.trim())} className={outlineBtnCls}>
                <Printer size={14} /> In
              </button>
              <button type="button" onClick={onClose} className={outlineBtnCls}>
                Đóng
              </button>
            </div>
          </div>
        </>
      )}

      {tab === 'receipts' && (
        <div className="px-5 py-4">
          <div className="rounded-[8px] border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className={theadCls}>
                <tr>
                  <th className="py-2 px-3 w-40">Mã phiếu nhập</th>
                  <th className="py-2 px-3 w-40">Thời gian</th>
                  <th className="py-2 px-3">Người nhập</th>
                  <th className="py-2 px-3 w-32 text-right">Số lượng nhập</th>
                  <th className="py-2 px-3 w-32">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {po.receipts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#677484] text-xs">
                      Chưa có phiếu nhập nào theo phiếu đặt này
                    </td>
                  </tr>
                ) : (
                  po.receipts.map((r) => {
                    const st = RECEIPT_STATUS[r.status] ?? { label: r.status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
                    return (
                      <tr key={r.grId} className="hover:bg-[#f7f8f9]">
                        <td className="py-2.5 px-3 font-medium">
                          <DocumentCodeLink
                            kind="purchase"
                            code={r.grCode}
                            id={r.grId}
                            date={toLinkDate(r.receivedDate)}
                            warehouseId={po.warehouseId}
                          />
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(r.receivedDate)}</td>
                        <td className="py-2.5 px-3">{r.receivedByName || '—'}</td>
                        <td className="py-2.5 px-3 text-right font-mono">{qty(r.totalQuantity)}</td>
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

      {confirm && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl">
            <div className="px-5 pt-4 pb-2 text-[16px] font-bold">
              {confirm === 'cancel' ? 'Hủy phiếu đặt hàng nhập' : 'Kết thúc phiếu đặt hàng nhập'}
            </div>
            <div className="px-5 pb-4">
              {confirm === 'cancel' ? (
                <>
                  Bạn có chắc muốn hủy phiếu <strong>{po.poCode}</strong>?
                </>
              ) : (
                <>
                  Phiếu <strong>{po.poCode}</strong> sẽ chuyển sang Hoàn thành và không nhập thêm phần còn thiếu. Số liệu đối chiếu vẫn được giữ
                  lại.
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <button type="button" disabled={busy} onClick={() => setConfirm(null)} className={outlineBtnCls}>
                Bỏ qua
              </button>
              <button type="button" disabled={busy} onClick={() => void runConfirm()} className={`${primaryBtnCls} disabled:opacity-60`}>
                {busy && <Loader2 size={14} className="animate-spin" />} Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
