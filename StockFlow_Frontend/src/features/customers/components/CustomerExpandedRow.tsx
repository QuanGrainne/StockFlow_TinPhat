'use client';

// Chi tiết Khách hàng dạng accordion ngay dưới dòng — cùng bố cục với SupplierExpandedRow:
//   [Thông tin] [Lịch sử bán/trả hàng] [Nợ cần thu từ khách]

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, FileUp, Loader2, Lock, Pencil, SlidersHorizontal, Trash2, Unlock, UserRound } from 'lucide-react';
import CustomerPaymentModal from './CustomerPaymentModal';
import CustomerReceiptModal from './CustomerReceiptModal';
import DebtAdjustModal from '@/components/debt/DebtAdjustModal';
import { customerService } from '../services/customerService';
import InvoicePreviewModal from '@/features/orders/components/InvoicePreviewModal';
import { Customer, CustomerDebtLedgerEntry, CustomerDetail } from '../types';
import { exportCustomerBookingsToXLSX, exportCustomerLedgerToXLSX, exportCustomerOrdersToXLSX, GENDER_LABEL } from '../utils/exportExcel';
import { BOOKING_STATUS } from '@/features/sales-bookings/utils/salesBookingUtils';
import type { SalesBookingStatus } from '@/features/sales-bookings/types';
import { documentLinkHref, toLinkDate } from '@/lib/navigation/documentLink';

const bookingStatusOf = (s?: string | null) =>
  BOOKING_STATUS[(s || '').toUpperCase() as SalesBookingStatus] ?? { label: s || '—', cls: 'bg-slate-50 text-slate-600 border-slate-200' };

interface CustomerExpandedRowProps {
  customer: Customer;
  detail: CustomerDetail | null | undefined;
  loading: boolean;
  colSpan: number;
  onEdit: (customer: Customer) => void;
  onToggleStatus: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  /** Gọi sau khi tạo phiếu thu thành công để tải lại chi tiết + danh sách */
  onPaymentCreated?: (customerId: number, voucherCode: string) => void;
  /** Gọi sau khi sửa / hủy phiếu thu để tải lại chi tiết + danh sách */
  onDataChanged?: (customerId: number) => void;
}

type TabKey = 'info' | 'orders' | 'bookings' | 'debts';
type LedgerFilter = 'ALL' | 'SALE' | 'PAYMENT' | 'ADJUST';

const LEDGER_FILTER_OPTIONS: { value: LedgerFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả giao dịch' },
  { value: 'SALE', label: 'Bán hàng' },
  { value: 'PAYMENT', label: 'Thanh toán' },
  { value: 'ADJUST', label: 'Điều chỉnh' },
];

const LEDGER_PAGE_SIZE = 10;

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Hoàn thành', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  PENDING: { label: 'Đang xử lý', cls: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25' },
  DRAFT: { label: 'Phiếu tạm', cls: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};

const money = new Intl.NumberFormat('vi-VN');
const tableWrapCls = 'rounded-[8px] border border-slate-200 overflow-hidden';
const theadCls = 'bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]';
const textBtnCls =
  'inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] text-[13px] font-semibold text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const outlineBtnCls =
  'inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] text-[#15171a] text-[13px] font-semibold transition cursor-pointer';
const primaryBtnCls =
  'inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs transition cursor-pointer';

function fmtDateTime(v?: string | null) {
  if (!v) return '—';
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : v;
}

function fmtDate(v?: string | null) {
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

/** Ô thông tin nhãn + giá trị có gạch chân (giống form KiotViet / màn Nhà cung cấp) */
function InfoField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-[12px] text-[#677484] mb-1">{label}</div>
      <div className={`pb-2 border-b border-slate-200 text-[13px] ${value ? 'text-[#15171a]' : 'text-slate-400'}`}>
        {value || 'Chưa có'}
      </div>
    </div>
  );
}

export default function CustomerExpandedRow({
  customer,
  detail,
  loading,
  colSpan,
  onEdit,
  onToggleStatus,
  onDelete,
  onPaymentCreated,
  onDataChanged,
}: CustomerExpandedRowProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('ALL');
  const [showPayment, setShowPayment] = useState(false);
  /** Popup xem nhanh hóa đơn / phiếu thu khi bấm mã */
  const [previewOrderId, setPreviewOrderId] = useState<number | null>(null);
  const [receiptCode, setReceiptCode] = useState<string | null>(null);
  /** Điều chỉnh công nợ: '' = tạo phiếu mới, mã DC... = mở phiếu đã có, null = đóng */
  const [adjustCode, setAdjustCode] = useState<string | null>(null);
  const c = detail ?? customer;
  const orders = useMemo(() => detail?.recentOrders ?? [], [detail]);
  const ledger: CustomerDebtLedgerEntry[] = useMemo(() => detail?.debtLedger ?? [], [detail]);
  const filteredLedger = useMemo(
    () => (ledgerFilter === 'ALL' ? ledger : ledger.filter((l) => l.type === ledgerFilter)),
    [ledger, ledgerFilter]
  );
  // Phân trang sổ công nợ (mới nhất trước): mỗi trang LEDGER_PAGE_SIZE chứng từ
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledgerPageCount = Math.max(1, Math.ceil(filteredLedger.length / LEDGER_PAGE_SIZE));
  const safeLedgerPage = Math.min(ledgerPage, ledgerPageCount);
  const pagedLedger = filteredLedger.slice((safeLedgerPage - 1) * LEDGER_PAGE_SIZE, safeLedgerPage * LEDGER_PAGE_SIZE);
  const isActive = customer.status === 'ACTIVE';
  const currentDebt = c.currentDebt || 0;
  // Hóa đơn hoàn thành còn nợ, cũ nhất trước (để phân bổ phiếu thu)
  const openOrders = useMemo(
    () =>
      orders
        .filter((o) => (o.status || '').toUpperCase() === 'COMPLETED' && o.outstandingAmount > 0)
        .sort((a, b) => (a.orderDate || '').localeCompare(b.orderDate || '') || a.orderId - b.orderId),
    [orders]
  );

  const bookings = useMemo(() => detail?.recentBookings ?? [], [detail]);
  // Như KiotViet: khách có đơn đặt → có tab Lịch sử đặt hàng; tab bán hàng hiện khi có hóa đơn (hoặc chưa có giao dịch nào)
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'info', label: 'Thông tin' },
    ...(orders.length > 0 || bookings.length === 0 ? [{ key: 'orders' as const, label: 'Lịch sử bán/trả hàng' }] : []),
    ...(bookings.length > 0 ? [{ key: 'bookings' as const, label: 'Lịch sử đặt hàng' }] : []),
    { key: 'debts', label: 'Nợ cần thu từ khách' },
  ];

  return (
    <tr>
      <td colSpan={colSpan} className="p-0 bg-white">
        <div className="border-x border-b-2 border-[#0070f4] bg-white text-[13px] text-[#15171a] select-none animate-in fade-in duration-150">
          {/* Thanh tab */}
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

          {loading && !detail ? (
            <div className="p-8 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 size={16} className="animate-spin text-[#0070f4]" />
              <span className="text-xs">Đang tải thông tin khách hàng...</span>
            </div>
          ) : (
            <>
              {/* ── TAB 1: THÔNG TIN ── */}
              {activeTab === 'info' && (
                <>
                  <div className="px-5 py-4 space-y-5">
                    <div className="flex items-start gap-5">
                      <div className="w-28 h-28 shrink-0 rounded-full bg-[#e6f1fe] text-[#3b82f6] flex items-center justify-center">
                        <UserRound size={56} strokeWidth={1.6} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-baseline gap-2 min-w-0">
                            <h3 className="text-[16px] font-bold truncate">{c.name}</h3>
                            <span className="text-[13px] text-[#677484] shrink-0">{c.code}</span>
                          </div>
                          <span className="text-[13px] text-[#15171a] shrink-0">{c.createdWarehouseName || ''}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#677484]">
                          <span>
                            Người tạo:{' '}
                            {c.createdByName ? <span className="text-[#15171a]">{c.createdByName}</span> : <span className="text-slate-400">Chưa có</span>}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>
                            Ngày tạo:{' '}
                            {c.createdAt ? <span className="text-[#15171a]">{fmtDate(c.createdAt)}</span> : <span className="text-slate-400">Chưa có</span>}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span>
                            Hạn mức nợ: <span className="text-[#15171a]">{money.format(c.creditLimit || 0)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                      <InfoField label="Điện thoại" value={[c.phone, c.phone2].filter(Boolean).join(' / ')} />
                      <InfoField label="Sinh nhật" value={fmtDate(c.birthDate)} />
                      <InfoField label="Giới tính" value={c.gender ? GENDER_LABEL[c.gender] : null} />
                      <InfoField label="Email" value={c.email} />
                      <InfoField label="Facebook" value={c.facebook} />
                      <div />
                      <div className="md:col-span-3">
                        <InfoField label="Địa chỉ" value={c.address} />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[13px]">
                      <Pencil size={14} className="text-[#677484]" />
                      {c.notes ? <span className="text-[#15171a]">{c.notes}</span> : <span className="text-[#677484]">Chưa có ghi chú</span>}
                    </div>
                  </div>

                  <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
                    <button type="button" onClick={() => onDelete(customer)} className={textBtnCls}>
                      <Trash2 size={15} />
                      <span>Xóa</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onEdit(detail ?? customer)} className={primaryBtnCls}>
                        <Pencil size={14} />
                        <span>Chỉnh sửa</span>
                      </button>
                      <button type="button" onClick={() => onToggleStatus(customer)} className={outlineBtnCls}>
                        {isActive ? <Lock size={14} /> : <Unlock size={14} />}
                        <span>{isActive ? 'Ngừng hoạt động' : 'Cho phép hoạt động'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ── TAB 2: LỊCH SỬ BÁN/TRẢ HÀNG ── */}
              {activeTab === 'orders' && (
                <>
                  <div className="px-5 py-4">
                    <div className={tableWrapCls}>
                      <table className="w-full text-left border-collapse">
                        <thead className={theadCls}>
                          <tr>
                            <th className="py-2 px-3 w-40">Mã hóa đơn</th>
                            <th className="py-2 px-3 w-40">Thời gian</th>
                            <th className="py-2 px-3">Người bán</th>
                            <th className="py-2 px-3">Chi nhánh</th>
                            <th className="py-2 px-3 w-36 text-right">Tổng cộng</th>
                            <th className="py-2 px-3 w-32">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                          {orders.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-6 text-center text-[#677484] text-xs">
                                Khách hàng chưa có hóa đơn nào
                              </td>
                            </tr>
                          ) : (
                            orders.map((o) => {
                              const st = ORDER_STATUS[(o.status || '').toUpperCase()] ?? {
                                label: o.status || '—',
                                cls: 'bg-slate-50 text-slate-600 border-slate-200',
                              };
                              return (
                                <tr key={o.orderId} className="hover:bg-[#f7f8f9]">
                                  <td className="py-2.5 px-3 font-medium">
                                    <button
                                      type="button"
                                      onClick={() => setPreviewOrderId(o.orderId)}
                                      className="text-[#0070f4] hover:underline cursor-pointer"
                                      title={`Xem hóa đơn ${o.orderCode}`}
                                    >
                                      {o.orderCode}
                                    </button>
                                  </td>
                                  <td className="py-2.5 px-3 whitespace-nowrap">{fmtDateTime(o.orderDate)}</td>
                                  <td className="py-2.5 px-3">{o.sellerName || '—'}</td>
                                  <td className="py-2.5 px-3">{o.warehouseName || '—'}</td>
                                  <td className="py-2.5 px-3 text-right">{money.format(o.totalAmount)}</td>
                                  <td className="py-2.5 px-3">
                                    <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-semibold border ${st.cls}`}>
                                      {st.label}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-200 flex items-center">
                    <button
                      type="button"
                      onClick={() => exportCustomerOrdersToXLSX(customer, orders)}
                      disabled={orders.length === 0}
                      className={textBtnCls}
                    >
                      <FileUp size={15} />
                      <span>Xuất file</span>
                    </button>
                  </div>
                </>
              )}

              {/* ── TAB: LỊCH SỬ ĐẶT HÀNG ── */}
              {activeTab === 'bookings' && (
                <>
                  <div className="px-5 py-4">
                    <div className={tableWrapCls}>
                      <table className="w-full text-left border-collapse">
                        <thead className={theadCls}>
                          <tr>
                            <th className="py-2 px-3 w-40">Mã đặt hàng</th>
                            <th className="py-2 px-3 w-40">Thời gian</th>
                            <th className="py-2 px-3">Người bán</th>
                            <th className="py-2 px-3">Chi nhánh xử lý</th>
                            <th className="py-2 px-3 w-36 text-right">Tổng cộng</th>
                            <th className="py-2 px-3 w-36">Trạng thái</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                          {bookings.map((o) => {
                            const st = bookingStatusOf(o.status);
                            return (
                              <tr key={o.orderId} className="hover:bg-[#f7f8f9]">
                                <td className="py-2.5 px-3 font-medium">
                                  <a
                                    href={documentLinkHref('/sales-booking', { code: o.orderCode, id: o.orderId, date: toLinkDate(o.orderDate) })}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[#0070f4] hover:underline"
                                    title={`Mở đơn đặt hàng ${o.orderCode}`}
                                  >
                                    {o.orderCode}
                                  </a>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">{fmtDateTime(o.orderDate)}</td>
                                <td className="py-2.5 px-3">{o.sellerName || '—'}</td>
                                <td className="py-2.5 px-3">{o.warehouseName || '—'}</td>
                                <td className="py-2.5 px-3 text-right">{money.format(o.totalAmount)}</td>
                                <td className="py-2.5 px-3">
                                  <span className={`inline-block px-2 py-0.5 rounded-[4px] text-[11px] font-semibold border ${st.cls}`}>
                                    {st.label}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="px-5 py-3 border-t border-slate-200 flex items-center">
                    <button
                      type="button"
                      onClick={() => exportCustomerBookingsToXLSX(customer, bookings, (s) => bookingStatusOf(s).label)}
                      className={textBtnCls}
                    >
                      <FileUp size={15} />
                      <span>Xuất file</span>
                    </button>
                  </div>
                </>
              )}

              {/* ── TAB 3: NỢ CẦN THU TỪ KHÁCH ── */}
              {activeTab === 'debts' && (
                <>
                  <div className="px-5 py-4 space-y-3">
                    <div className="flex justify-end">
                      <div className="relative w-56">
                        <select
                          value={ledgerFilter}
                          onChange={(e) => {
                            setLedgerFilter(e.target.value as LedgerFilter);
                            setLedgerPage(1);
                          }}
                          className="w-full h-8 pl-3 pr-8 rounded-[8px] border border-slate-300 bg-white text-[13px] focus:outline-none focus:border-[#0070f4] cursor-pointer appearance-none"
                        >
                          {LEDGER_FILTER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
                      </div>
                    </div>

                    <div className={tableWrapCls}>
                      <table className="w-full text-left border-collapse">
                        <thead className={theadCls}>
                          <tr>
                            <th className="py-2 px-3 w-44">Mã phiếu</th>
                            <th className="py-2 px-3 w-40">Thời gian</th>
                            <th className="py-2 px-3">Loại</th>
                            <th className="py-2 px-3 w-40 text-right">Giá trị</th>
                            <th className="py-2 px-3 w-44 text-right">Dư nợ khách hàng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                          {filteredLedger.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-[#677484] text-xs">
                                Chưa phát sinh giao dịch công nợ với khách hàng này
                              </td>
                            </tr>
                          ) : (
                            pagedLedger.map((l, i) => (
                              <tr key={`${l.type}-${l.code}-${i}`} className="hover:bg-[#f7f8f9]">
                                <td className="py-2.5 px-3 font-medium">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      l.type === 'SALE' && l.referenceId
                                        ? setPreviewOrderId(l.referenceId)
                                        : l.type === 'RETURN' || l.type === 'REFUND'
                                          ? // Trả hàng / trả tiền khách: mở phiếu trả hàng (mã TTTH... → TH...)
                                            window.open(
                                              documentLinkHref('/sales-returns', {
                                                code: l.type === 'REFUND' ? l.code.replace(/^TT/, '') : l.code,
                                                id: l.referenceId ?? null,
                                              }),
                                              '_blank',
                                              'noopener,noreferrer'
                                            )
                                          : l.type === 'ADJUST'
                                            ? setAdjustCode(l.code)
                                            : setReceiptCode(l.code)
                                    }
                                    className="text-[#0070f4] hover:underline cursor-pointer"
                                    title={
                                      l.type === 'SALE'
                                        ? `Xem hóa đơn ${l.code}`
                                        : l.type === 'RETURN' || l.type === 'REFUND'
                                          ? `Xem phiếu trả hàng`
                                          : l.type === 'ADJUST'
                                            ? `Xem phiếu điều chỉnh ${l.code}`
                                            : `Xem phiếu thu ${l.code}`
                                    }
                                  >
                                    {l.code}
                                  </button>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">{fmtDateTime(l.date)}</td>
                                <td className="py-2.5 px-3">{l.typeLabel}</td>
                                <td className="py-2.5 px-3 text-right">{money.format(l.amount)}</td>
                                <td className={`py-2.5 px-3 text-right ${l.balanceAfter !== 0 ? 'text-[#fb2c36] font-semibold' : ''}`}>{money.format(l.balanceAfter)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Phân trang khi nhiều chứng từ */}
                    {filteredLedger.length > LEDGER_PAGE_SIZE && (
                      <div className="flex items-center justify-end gap-2 text-[12px] text-[#677484]">
                        <span>
                          {(safeLedgerPage - 1) * LEDGER_PAGE_SIZE + 1} -{' '}
                          {Math.min(safeLedgerPage * LEDGER_PAGE_SIZE, filteredLedger.length)} trên {filteredLedger.length} chứng từ
                        </span>
                        <button
                          type="button"
                          onClick={() => setLedgerPage(safeLedgerPage - 1)}
                          disabled={safeLedgerPage <= 1}
                          className="p-1 rounded-[6px] border border-slate-300 bg-white hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Trang trước"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span className="min-w-[48px] text-center text-[#15171a] font-medium">
                          {safeLedgerPage} / {ledgerPageCount}
                        </span>
                        <button
                          type="button"
                          onClick={() => setLedgerPage(safeLedgerPage + 1)}
                          disabled={safeLedgerPage >= ledgerPageCount}
                          className="p-1 rounded-[6px] border border-slate-300 bg-white hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          aria-label="Trang sau"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => exportCustomerLedgerToXLSX(customer, filteredLedger)}
                      disabled={filteredLedger.length === 0}
                      className={textBtnCls}
                    >
                      <FileUp size={15} />
                      <span>Xuất file công nợ</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPayment(true)}
                        disabled={currentDebt <= 0}
                        title={currentDebt <= 0 ? 'Khách hàng không còn nợ cần thu' : 'Tạo phiếu thu nợ của khách'}
                        className={`${primaryBtnCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <CircleDollarSign size={15} />
                        <span>Thanh toán</span>
                      </button>
                      {/* Luôn bấm được, kể cả khi nợ = 0: tạo khách nợ mình (dương) hoặc mình nợ khách (âm) */}
                      <button
                        type="button"
                        onClick={() => setAdjustCode('')}
                        title="Đặt nợ cần thu của khách: dương = khách nợ, âm = cửa hàng nợ khách, 0 = hết nợ"
                        className={outlineBtnCls}
                      >
                        <SlidersHorizontal size={15} />
                        <span>Điều chỉnh</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        {showPayment && (
          <CustomerPaymentModal
            customer={customer}
            currentDebt={currentDebt}
            openOrders={openOrders}
            onClose={() => setShowPayment(false)}
            onSuccess={(result) => {
              setShowPayment(false);
              onPaymentCreated?.(customer.id, result.voucherCode);
            }}
          />
        )}
        {adjustCode !== null && (
          <DebtAdjustModal
            kind="customer"
            currentDebt={currentDebt}
            code={adjustCode || null}
            api={{
              get: (code) => customerService.getDebtAdjustment(customer.id, code),
              create: (payload) => customerService.adjustCustomerDebt(customer.id, payload),
              update: (code, payload) => customerService.updateDebtAdjustment(customer.id, code, payload),
              cancel: (code) => customerService.cancelDebtAdjustment(customer.id, code),
            }}
            onClose={() => setAdjustCode(null)}
            onSuccess={() => {
              setAdjustCode(null);
              onDataChanged?.(customer.id);
            }}
          />
        )}
        {previewOrderId !== null && <InvoicePreviewModal orderId={previewOrderId} onClose={() => setPreviewOrderId(null)} />}
        {receiptCode !== null && (
          <CustomerReceiptModal
            partnerId={customer.id}
            code={receiptCode}
            onClose={() => setReceiptCode(null)}
            onChanged={() => onDataChanged?.(customer.id)}
          />
        )}
      </td>
    </tr>
  );
}
