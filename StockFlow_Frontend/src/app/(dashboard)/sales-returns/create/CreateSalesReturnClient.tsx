// src/app/(dashboard)/sales-returns/create/CreateSalesReturnClient.tsx
// Form tạo phiếu Trả hàng theo hóa đơn — cùng bố cục với Trả hàng nhập:
// Header (quay lại + tìm hàng trong hóa đơn + kho nhận hàng trả) → [Bảng hàng trả | Sidebar thông tin & tiền trả khách].
// Quy tắc: phiếu trả gắn với hóa đơn gốc (BR-18), SL trả ≤ SL còn được trả (BR-19),
// hàng trả phải phân loại tình trạng (BR-20: hàng tốt nhập lại kho / hàng lỗi chờ xử lý).
// Hiện mới dựng giao diện: nút Lưu tạm / Trả hàng chưa gọi API (nghiệp vụ nhập kho + hoàn tiền làm ở bước sau).

'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { message } from 'antd';
import { ArrowLeft, ChevronLeft, ChevronRight, CircleUserRound, Info, Search, Trash2, Warehouse } from 'lucide-react';
import { ProductThumb } from '@/components/ProductThumb';
import { PartnerLink, ProductCodeLink } from '@/components/links/EntityLinks';
import { orderService } from '@/features/orders/services/orderService';
import type { OrderDetail } from '@/features/orders/types';
import type { ReturnCondition, SalesReturnLine } from '@/features/sales-returns/types';
import { formatVnd, RETURN_CONDITION } from '@/features/sales-returns/utils/salesReturnUtils';

const gridTemplate = '36px 44px 40px 110px minmax(160px,1fr) 60px 110px 100px 110px 120px 110px';
const pad = (n: number) => String(n).padStart(2, '0');
const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Ô nhập số có dấu chấm nghìn */
function NumberInput({ value, onChange, className = '' }: { value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <input
      inputMode="numeric"
      value={value ? value.toLocaleString('vi-VN') : '0'}
      onChange={(e) => onChange(Number(e.target.value.replace(/[^\d]/g, '')) || 0)}
      onFocus={(e) => e.target.select()}
      className={`h-8 px-2 text-right rounded-[8px] border border-slate-300 bg-white focus:outline-none focus:border-[#0070f4] ${className}`}
    />
  );
}

export default function CreateSalesReturnClient() {
  const searchParams = useSearchParams();
  const invoiceId = Number(searchParams.get('invoice')) || 0;

  const [invoice, setInvoice] = useState<{ id: number; data: OrderDetail | null; error: string | null } | null>(null);
  const [rows, setRows] = useState<SalesReturnLine[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [returnDateTime, setReturnDateTime] = useState(nowLocal);
  const [returnFee, setReturnFee] = useState(0);
  const [refundAmount, setRefundAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'VIETQR'>('CASH');
  const [notes, setNotes] = useState('');
  const searchRef = useRef<HTMLDivElement>(null);

  const [userDisplay] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('stockflow_user') || 'null') as { fullName?: string; username?: string } | null;
      return u?.fullName || u?.username || 'Nhân viên';
    } catch {
      return 'Nhân viên';
    }
  });

  const loading = invoiceId > 0 && invoice?.id !== invoiceId;
  const order = invoice?.id === invoiceId ? invoice.data : null;

  // Tải hóa đơn gốc → mặc định trả toàn bộ hàng (người dùng giảm SL / bỏ dòng không trả)
  useEffect(() => {
    if (!invoiceId) return;
    let alive = true;
    orderService
      .getOrderDetail(invoiceId)
      .then((d) => {
        if (!alive) return;
        setInvoice({ id: invoiceId, data: d, error: null });
        setRows(
          d.items.map((it) => ({
            key: String(it.orderItemId),
            orderItemId: it.orderItemId,
            productId: it.productId,
            productCode: it.productCode,
            productName: it.productName,
            imageUrl: it.imageUrl,
            unitName: it.unitName,
            soldQty: it.quantity,
            // TODO(nghiệp vụ): trừ SL đã trả ở các phiếu trả trước của hóa đơn (BR-19)
            maxQty: it.quantity,
            quantity: it.quantity,
            salePrice: it.unitPrice,
            returnPrice: it.unitPrice,
            condition: 'GOOD',
          }))
        );
      })
      .catch((err: unknown) => {
        if (alive) setInvoice({ id: invoiceId, data: null, error: err instanceof Error ? err.message : 'Không tải được hóa đơn.' });
      });
    return () => {
      alive = false;
    };
  }, [invoiceId]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const updateRow = (key: string, patch: Partial<SalesReturnLine>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Hàng của hóa đơn đã bỏ khỏi bảng → gợi ý thêm lại khi tìm
  const removedItems = useMemo(() => {
    if (!order) return [];
    const q = searchQuery.trim().toLowerCase();
    return order.items.filter(
      (it) =>
        !rows.some((r) => r.orderItemId === it.orderItemId) &&
        (!q || it.productCode.toLowerCase().includes(q) || it.productName.toLowerCase().includes(q))
    );
  }, [order, rows, searchQuery]);

  const activeRows = rows.filter((r) => r.quantity > 0);
  const totalQty = activeRows.reduce((s, r) => s + r.quantity, 0);
  const totalGoods = activeRows.reduce((s, r) => s + Math.round(r.quantity * r.returnPrice), 0);
  const fee = Math.min(returnFee, totalGoods);
  const mustRefund = Math.max(0, totalGoods - fee);
  const refund = Math.min(refundAmount ?? mustRefund, mustRefund);
  /** Phần chưa trả tiền mặt cho khách → trừ vào công nợ khách */
  const debtChange = mustRefund - refund;

  const validate = () => {
    if (!order) return false;
    if (activeRows.length === 0) {
      message.warning('Chọn ít nhất 1 hàng hóa với số lượng trả lớn hơn 0.');
      return false;
    }
    const over = rows.find((r) => r.quantity > r.maxQty);
    if (over) {
      message.error(`"${over.productName}" trả vượt số lượng còn được trả (${over.maxQty.toLocaleString('vi-VN')}).`);
      return false;
    }
    if (returnDateTime && new Date(returnDateTime).getTime() > Date.now() + 60000) {
      message.error('Thời gian trả hàng không được ở tương lai.');
      return false;
    }
    return true;
  };

  const handleSave = (mode: 'DRAFT' | 'COMPLETED') => {
    if (!validate()) return;
    // Chưa có API lưu phiếu trả hàng (nhập lại kho hàng tốt, ghi thẻ kho, hoàn tiền / giảm công nợ khách)
    message.info(
      mode === 'DRAFT'
        ? 'Form trả hàng đã sẵn sàng — chức năng Lưu tạm sẽ được nối khi làm nghiệp vụ trả hàng.'
        : 'Form trả hàng đã sẵn sàng — chức năng Trả hàng (nhập kho, hoàn tiền) sẽ được nối khi làm nghiệp vụ trả hàng.'
    );
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] text-[13px] text-[#15171a] select-none overflow-hidden font-sans">
      {/* ─── 1. Header ─── */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/sales-returns"
            className="p-1 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer"
            title="Quay lại danh sách trả hàng"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </Link>
          <span className="text-[20px] font-semibold tracking-tight whitespace-nowrap leading-[36px]">Trả hàng</span>
          {order && (
            <span className="text-[#677484] whitespace-nowrap">
              theo hóa đơn <span className="text-[#0070f4] font-semibold">{order.orderCode}</span>
            </span>
          )}
        </div>

        {/* Tìm hàng trong hóa đơn (thêm lại dòng đã bỏ) */}
        <div className="flex-1 max-w-xl mx-4 mr-auto relative" ref={searchRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            disabled={!order}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            placeholder={order ? `Tìm hàng hóa trong hóa đơn ${order.orderCode}` : 'Tìm hàng hóa trong hóa đơn'}
            className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition disabled:opacity-60"
          />
          {showSearchDropdown && order && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] z-50 max-h-80 overflow-y-auto divide-y divide-slate-100">
              {removedItems.length === 0 ? (
                <div className="p-4 text-center text-[#677484]">Tất cả hàng hóa của hóa đơn đã có trong bảng</div>
              ) : (
                removedItems.map((it) => (
                  <button
                    key={it.orderItemId}
                    type="button"
                    onClick={() => {
                      setRows((prev) => [
                        ...prev,
                        {
                          key: String(it.orderItemId),
                          orderItemId: it.orderItemId,
                          productId: it.productId,
                          productCode: it.productCode,
                          productName: it.productName,
                          imageUrl: it.imageUrl,
                          unitName: it.unitName,
                          soldQty: it.quantity,
                          maxQty: it.quantity,
                          quantity: 1,
                          salePrice: it.unitPrice,
                          returnPrice: it.unitPrice,
                          condition: 'GOOD',
                        },
                      ]);
                      setSearchQuery('');
                      setShowSearchDropdown(false);
                    }}
                    className="w-full text-left p-2.5 hover:bg-[#eff6ff] flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <ProductThumb src={it.imageUrl} alt={it.productName} />
                      <span>
                        <span className="font-bold text-[#0070f4] mr-2">{it.productCode}</span>
                        {it.productName}
                      </span>
                    </span>
                    <span className="text-[11px] text-[#677484]">
                      Đã mua: <strong className="text-[#15171a]">{it.quantity.toLocaleString('vi-VN')}</strong>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Kho nhận hàng trả = chi nhánh bán của hóa đơn */}
        <div className="h-8 px-3 rounded-[8px] border border-slate-300 bg-white text-xs flex items-center gap-2 shrink-0" title="Kho nhận hàng trả">
          <div className="w-5 h-5 rounded-[4px] bg-[#eff6ff] text-[#0070f4] flex items-center justify-center shrink-0">
            <Warehouse size={12} />
          </div>
          <div className="text-left">
            <div className="text-[10px] text-[#677484] font-bold uppercase tracking-wider leading-none">Kho nhận hàng trả</div>
            <div className="font-bold leading-tight">{order?.warehouseName || '—'}</div>
          </div>
        </div>
      </header>

      {/* ─── 2. Bảng hàng trả + sidebar ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div style={{ minWidth: 1000 }}>
              <div
                className="h-10 bg-[#e8f2ff] border-b border-slate-200 grid items-center px-3 font-semibold text-[13px] sticky top-0 z-10"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <div />
                <div className="text-center">STT</div>
                <div />
                <div className="pl-2">Mã hàng</div>
                <div className="pl-2">Tên hàng</div>
                <div className="pl-2">ĐVT</div>
                <div className="text-right pr-2">SL trả</div>
                <div className="text-right pr-2">Giá bán</div>
                <div className="text-right pr-2">Giá nhập lại</div>
                <div className="pl-2">Tình trạng</div>
                <div className="text-right pr-2">Thành tiền</div>
              </div>

              {!invoiceId ? (
                <div className="py-24 text-center text-[#677484]">
                  Chưa chọn hóa đơn.{' '}
                  <Link href="/sales-returns" className="text-[#0070f4] font-semibold hover:underline">
                    Quay lại danh sách
                  </Link>{' '}
                  và bấm <strong>+ Trả hàng</strong> để chọn hóa đơn khách trả.
                </div>
              ) : loading ? (
                <div className="py-24 text-center text-[#677484]">Đang tải hóa đơn...</div>
              ) : !order ? (
                <div className="py-24 text-center text-[#fb2c36]">{invoice?.error ?? 'Không tải được hóa đơn.'}</div>
              ) : rows.length === 0 ? (
                <div className="py-24 text-center text-[#677484]">Tìm hàng hóa trong hóa đơn để thêm vào phiếu trả</div>
              ) : (
                rows.map((row, index) => (
                  <div
                    key={row.key}
                    className="grid items-start px-3 py-2.5 text-[13px] hover:bg-[#f7f8f9] border-b border-slate-100"
                    style={{ gridTemplateColumns: gridTemplate }}
                  >
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                        className="p-1 rounded-[4px] hover:text-[#fb2c36] hover:bg-[#fef2f2] cursor-pointer"
                        title="Bỏ hàng hóa khỏi phiếu trả"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="text-center pt-1.5">{index + 1}</div>
                    <div className="pt-0.5">
                      <ProductThumb src={row.imageUrl} alt={row.productName} size={32} />
                    </div>
                    <div className="pl-2 pt-1.5 truncate">
                      <ProductCodeLink code={row.productCode} productId={row.productId} />
                    </div>
                    <div className="pl-2 pr-2 pt-1.5 min-w-0 flex items-center gap-1.5">
                      <span className="truncate" title={row.productName}>
                        {row.productName}
                      </span>
                      <span
                        className="text-[#677484] shrink-0 cursor-help"
                        title={`Mã: ${row.productCode}\nĐã mua: ${row.soldQty.toLocaleString('vi-VN')} ${row.unitName}\nGiá bán: ${formatVnd(row.salePrice)}`}
                      >
                        <Info size={15} />
                      </span>
                    </div>
                    <div className="pl-2 pt-1.5 text-[#0070f4]">{row.unitName}</div>
                    <div className="px-1">
                      <NumberInput
                        value={row.quantity}
                        onChange={(v) => updateRow(row.key, { quantity: v })}
                        className={`w-full ${row.quantity > row.maxQty ? '!border-[#fb2c36] text-[#fb2c36]' : ''}`}
                      />
                      <div className="text-right text-[12px] text-[#677484] mt-0.5 pr-1">/{row.maxQty.toLocaleString('vi-VN')}</div>
                    </div>
                    <div className="text-right pr-2 pt-1.5">{formatVnd(row.salePrice)}</div>
                    <div className="px-1">
                      <NumberInput value={row.returnPrice} onChange={(v) => updateRow(row.key, { returnPrice: v })} className="w-full" />
                    </div>
                    <div className="px-1">
                      <select
                        value={row.condition}
                        onChange={(e) => updateRow(row.key, { condition: e.target.value as ReturnCondition })}
                        title={RETURN_CONDITION[row.condition].hint}
                        className={`w-full h-8 px-2 rounded-[8px] border bg-white focus:outline-none focus:border-[#0070f4] cursor-pointer ${
                          row.condition === 'DEFECTIVE' ? 'border-[#fde68a] text-[#d97706]' : 'border-slate-300'
                        }`}
                      >
                        {(Object.keys(RETURN_CONDITION) as ReturnCondition[]).map((c) => (
                          <option key={c} value={c}>
                            {RETURN_CONDITION[c].label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-right pr-2 pt-1.5 font-medium">{formatVnd(Math.round(row.quantity * row.returnPrice))}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {activeRows.length > 0 && (
            <div className="min-h-10 bg-[#f7f8f9] border-t border-slate-200 px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-[#677484] shrink-0">
              <span>
                Số mặt hàng trả: <strong className="text-[#15171a]">{activeRows.length}</strong>
                <span className="ml-4">
                  Tổng số lượng trả: <strong className="text-[#0070f4] text-sm">{totalQty.toLocaleString('vi-VN')}</strong>
                </span>
                <span className="ml-4">
                  Hàng lỗi: <strong className="text-[#d97706]">{activeRows.filter((r) => r.condition === 'DEFECTIVE').length}</strong>
                </span>
              </span>
              <span>
                Tổng tiền hàng trả: <strong className="text-sm text-[#15171a]">{formatVnd(totalGoods)} đ</strong>
              </span>
            </div>
          )}
        </div>

        {/* Thu gọn / mở rộng sidebar */}
        <div className="relative z-10 w-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((v) => !v)}
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-[#0070f4] hover:bg-[#eff6ff] cursor-pointer"
            title={isSidebarCollapsed ? 'Mở rộng khung thông tin' : 'Thu gọn khung thông tin'}
          >
            {isSidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* ─── 3. Sidebar thông tin phiếu trả ─── */}
        {!isSidebarCollapsed && (
          <aside className="w-[380px] bg-white border-l border-slate-200 flex flex-col shrink-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="h-8 px-2.5 rounded-[8px] border border-slate-300 flex items-center gap-2 min-w-0 flex-1">
                  <CircleUserRound size={16} className="shrink-0" />
                  <span className="truncate">{userDisplay}</span>
                </div>
                <input
                  type="datetime-local"
                  value={returnDateTime}
                  max={nowLocal()}
                  onChange={(e) => setReturnDateTime(e.target.value)}
                  className="h-8 px-2 rounded-[8px] border border-slate-300 text-[12px] text-[#677484] bg-white hover:border-[#0070f4] focus:border-[#0070f4] focus:outline-none cursor-pointer"
                  title="Thời gian trả hàng"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0">Khách hàng</span>
                {order ? (
                  <span className="text-right truncate">
                    <PartnerLink kind="customer" code={order.customer.partnerCode} partnerId={order.customer.partnerId} className="font-semibold">
                      {order.customer.partnerName}
                    </PartnerLink>
                  </span>
                ) : (
                  <span className="text-[#677484]">—</span>
                )}
              </div>
              {order && (
                <div className="flex items-center justify-between gap-3 -mt-2">
                  <span className="text-[#677484]">Nợ hiện tại</span>
                  <span>{formatVnd(order.customer.currentDebt)}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <span>Hóa đơn</span>
                {order ? (
                  <Link href={`/orders/${order.orderId}`} target="_blank" rel="noopener noreferrer" className="text-[#0070f4] hover:underline">
                    {order.orderCode}
                  </Link>
                ) : (
                  <span className="text-[#677484]">—</span>
                )}
              </div>

              <div className="flex items-center justify-between gap-3">
                <span>Mã trả hàng</span>
                <input
                  type="text"
                  readOnly
                  placeholder="Mã phiếu tự động"
                  className="w-44 h-8 px-2.5 rounded-[8px] border border-slate-300 placeholder-[#677484] bg-[#f7f8f9]"
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span>Trạng thái</span>
                <span>Phiếu tạm</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  Tổng tiền hàng trả
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full border border-[#677484] text-[11px] leading-none flex items-center justify-center text-[#677484]">
                    {activeRows.length}
                  </span>
                </span>
                <span>{formatVnd(totalGoods)}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span title="Phí khách chịu khi trả hàng (trừ vào tiền trả khách)">Phí trả hàng</span>
                <NumberInput value={returnFee} onChange={(v) => setReturnFee(Math.max(0, v))} className="w-44" />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">Cần trả khách</span>
                <span className="font-bold text-[#0070f4]">{formatVnd(mustRefund)}</span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span>Tiền trả khách</span>
                  <div className="mt-1.5 inline-flex rounded-[6px] border border-slate-300 overflow-hidden text-[12px]">
                    {(
                      [
                        ['CASH', 'Tiền mặt'],
                        ['VIETQR', 'Chuyển khoản'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPaymentMethod(key)}
                        className={`px-2.5 h-6 whitespace-nowrap cursor-pointer transition ${
                          paymentMethod === key ? 'bg-[#0070f4] text-white' : 'bg-white hover:bg-[#eff6ff]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <NumberInput value={refund} onChange={(v) => setRefundAmount(Math.max(0, v))} className="w-44" />
              </div>

              {/* Phần chưa trả tiền cho khách → giảm công nợ khách */}
              <div className="flex items-center justify-between gap-3">
                <span>Tính vào công nợ</span>
                <span>{formatVnd(debtChange)}</span>
              </div>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Lý do trả hàng / ghi chú"
                rows={3}
                className="w-full p-2.5 rounded-[8px] border border-slate-300 placeholder-[#677484] focus:outline-none focus:border-[#0070f4] resize-none bg-white"
              />
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!order}
                onClick={() => handleSave('DRAFT')}
                className="h-11 rounded-[8px] border border-[#0070f4] bg-white hover:bg-[#eff6ff] text-[#0070f4] font-semibold text-[14px] cursor-pointer disabled:opacity-50"
              >
                Lưu tạm
              </button>
              <button
                type="button"
                disabled={!order}
                onClick={() => handleSave('COMPLETED')}
                className="h-11 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[14px] cursor-pointer disabled:opacity-50"
              >
                Trả hàng
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
