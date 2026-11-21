'use client';

// Chi tiết Nhà cung cấp dạng accordion ngay dưới dòng — bố cục theo mẫu KiotViet:
//   [Thông tin] [Lịch sử nhập/trả hàng] [Nợ cần trả nhà cung cấp]
// Giữ các thông tin cũ (phân bổ công nợ theo kho, tổng kết tài chính, lọc phiếu theo kho).

import React, { useMemo, useState } from 'react';
import { Pencil, Lock, Unlock, Trash2, Loader2, FileUp, ChevronDown, ChevronLeft, ChevronRight, CircleDollarSign, SlidersHorizontal, HandCoins } from 'lucide-react';
import SupplierPaymentModal from './SupplierPaymentModal';
import DebtAdjustModal from '@/components/debt/DebtAdjustModal';
import DebtRefundModal from '@/components/debt/DebtRefundModal';
import DebtVoucherModal from '@/components/debt/DebtVoucherModal';
import { supplierService } from '../services/supplierService';
import { Supplier, SupplierDetail, SupplierRecentReceipt, SupplierDebtLedgerEntry } from '../types';
import { getSupplierStatusBadge } from '../utils/status';
import { exportSupplierLedgerToXLSX, exportSupplierReceiptsToXLSX } from '../utils/exportExcel';
import { formatDateOnlyVN, formatDateTimeVN } from '@/lib/utils/date';
import { DocumentCodeLink } from '@/components/links/EntityLinks';
import { toLinkDate } from '@/lib/navigation/documentLink';

interface SupplierExpandedRowProps {
  supplier: Supplier;
  detail: SupplierDetail | null | undefined;
  loading: boolean;
  colSpan?: number;
  onEdit: (supplier: Supplier) => void;
  onToggleStatus: (partnerId: number) => void;
  onDelete: (supplier: Supplier) => void;
  /** Gọi sau khi tạo phiếu chi thành công để tải lại chi tiết + danh sách */
  onPaymentCreated?: (partnerId: number, voucherCode: string) => void;
  /** Gọi sau khi tạo / sửa / xóa phiếu điều chỉnh công nợ để tải lại chi tiết + danh sách */
  onDataChanged?: (partnerId: number) => void;
}

type TabKey = 'info' | 'receipts' | 'debts';

/** Bộ lọc loại giao dịch ở tab Nợ cần trả. SUPPLIER_RETURN gồm cả phiếu trả hàng nhập và tiền NCC trả lại. */
type LedgerFilter = 'ALL' | 'GOODS_RECEIPT' | 'SUPPLIER_RETURN' | 'ADJUST';
const LEDGER_FILTER_OPTIONS: { value: LedgerFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả giao dịch' },
  { value: 'GOODS_RECEIPT', label: 'Nhập hàng' },
  { value: 'SUPPLIER_RETURN', label: 'Trả hàng nhà cung cấp' },
  { value: 'ADJUST', label: 'Điều chỉnh' },
];

/** Số chứng từ mỗi trang ở sổ Nợ cần trả */
const LEDGER_PAGE_SIZE = 10;

const currencyFormatter = new Intl.NumberFormat('vi-VN');

// Trạng thái phiếu nhập — cùng bảng màu badge với phiếu Chuyển hàng
const RECEIPT_STATUS: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'Đã nhập hàng', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  DRAFT: { label: 'Phiếu tạm', cls: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};
const getReceiptStatus = (status?: string, type?: string) =>
  (type === 'PURCHASE_RETURN' && (status || '').toUpperCase() === 'COMPLETED'
    ? { label: 'Đã trả hàng', cls: RECEIPT_STATUS.COMPLETED.cls }
    : RECEIPT_STATUS[(status || 'COMPLETED').toUpperCase()]) ?? {
    label: status ?? '—',
    cls: 'bg-slate-50 text-slate-600 border-slate-200',
  };

const tableWrapCls = 'rounded-[8px] border border-slate-200 overflow-hidden';
const theadCls = 'bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]';
const textBtnCls =
  'inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[8px] text-[13px] font-semibold text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer';
const outlineBtnCls =
  'inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] text-[#15171a] text-[13px] font-semibold transition cursor-pointer';
const primaryBtnCls =
  'inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs transition cursor-pointer';

/** Ô thông tin dạng nhãn + giá trị có gạch chân (giống form KiotViet) */
function InfoField({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-[12px] text-[#677484] mb-1">{label}</div>
      <div
        className={`pb-2 border-b border-slate-200 text-[13px] ${
          value ? `text-[#15171a] ${mono ? 'font-mono' : ''}` : 'text-slate-400'
        }`}
      >
        {value || 'Chưa có'}
      </div>
    </div>
  );
}

function ReceiptsTable({ receipts, emptyText }: { receipts: SupplierRecentReceipt[]; emptyText: string }) {
  return (
    <div className={tableWrapCls}>
      <table className="w-full text-left border-collapse">
        <thead className={theadCls}>
          <tr>
            <th className="py-2 px-3 w-40">Mã phiếu</th>
            <th className="py-2 px-3 w-40">Thời gian</th>
            <th className="py-2 px-3">Người tạo</th>
            <th className="py-2 px-3">Chi nhánh</th>
            <th className="py-2 px-3 w-40 text-right">Tổng cộng</th>
            <th className="py-2 px-3 w-32">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-[13px]">
          {receipts.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-6 text-center text-[#677484] text-xs">
                {emptyText}
              </td>
            </tr>
          ) : (
            receipts.map((r, i) => {
              const st = getReceiptStatus(r.status, r.type);
              return (
                <tr key={`${r.type ?? "GR"}-${r.receiptId || i}`} className="hover:bg-[#f7f8f9]">
                  <td className="py-2.5 px-3 font-medium">
                    {r.receiptId ? (
                      <DocumentCodeLink
                        kind={r.type === 'PURCHASE_RETURN' ? 'purchase-return' : 'purchase'}
                        code={r.receiptNumber}
                        id={r.receiptId}
                        date={toLinkDate(r.receiptDate)}
                        warehouseId={r.warehouseId}
                      />
                    ) : (
                      <span className="text-[#0070f4]">{r.receiptNumber}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[#15171a] whitespace-nowrap">{formatDateTimeVN(r.receiptDate)}</td>
                  <td className="py-2.5 px-3 text-[#15171a]">{r.createdByName || '—'}</td>
                  <td className="py-2.5 px-3 text-[#15171a]">{r.warehouseName || '—'}</td>
                  <td className="py-2.5 px-3 text-right text-[#15171a]">{currencyFormatter.format(r.totalAmount)}</td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block whitespace-nowrap px-2 py-0.5 rounded-[4px] text-[11px] font-semibold border ${st.cls}`}
                    >
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
  );
}

export default function SupplierExpandedRow({
  supplier,
  detail,
  loading,
  colSpan = 9,
  onEdit,
  onToggleStatus,
  onDelete,
  onPaymentCreated,
  onDataChanged,
}: SupplierExpandedRowProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [receiptWarehouseFilter, setReceiptWarehouseFilter] = useState<number | 'ALL'>('ALL');
  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('ALL');
  const [showPayment, setShowPayment] = useState(false);
  /** Phiếu thu tiền từ NCC khi NCC đang nợ cửa hàng (nợ cần trả âm) */
  const [showRefund, setShowRefund] = useState(false);
  /** Mã phiếu PC... / PT... đang mở xem (null = đóng) */
  const [voucherCode, setVoucherCode] = useState<string | null>(null);
  /** Điều chỉnh công nợ: '' = tạo phiếu mới, mã DC... = mở phiếu đã có, null = đóng */
  const [adjustCode, setAdjustCode] = useState<string | null>(null);
  const [ledgerPage, setLedgerPage] = useState(1);
  const currentPayable = detail?.currentPayable ?? supplier.currentPayable ?? 0;

  const ledger: SupplierDebtLedgerEntry[] = useMemo(() => detail?.debtLedger ?? [], [detail]);
  const badge = getSupplierStatusBadge(supplier.status);
  const breakdown = detail?.warehouseBreakdown ?? [];
  const isActive = supplier.status === 'ACTIVE';

  const filteredReceipts = useMemo(() => {
    if (!detail?.recentReceipts) return [];
    if (receiptWarehouseFilter === 'ALL') return detail.recentReceipts;
    return detail.recentReceipts.filter((r) => r.warehouseId === receiptWarehouseFilter);
  }, [detail, receiptWarehouseFilter]);

  const filteredLedger = useMemo(
    () => (ledgerFilter === 'ALL' ? ledger : ledger.filter((l) => l.type === ledgerFilter || (ledgerFilter === 'SUPPLIER_RETURN' && l.type === 'SUPPLIER_REFUND'))),
    [ledger, ledgerFilter]
  );
  // Phân trang sổ công nợ (mới nhất trước)
  const ledgerPageCount = Math.max(1, Math.ceil(filteredLedger.length / LEDGER_PAGE_SIZE));
  const safeLedgerPage = Math.min(ledgerPage, ledgerPageCount);
  const pagedLedger = filteredLedger.slice((safeLedgerPage - 1) * LEDGER_PAGE_SIZE, safeLedgerPage * LEDGER_PAGE_SIZE);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'info', label: 'Thông tin' },
    { key: 'receipts', label: 'Lịch sử nhập/trả hàng' },
    { key: 'debts', label: 'Nợ cần trả nhà cung cấp' },
  ];

  return (
    <tr>
      <td colSpan={colSpan} className="p-0 bg-white">
        <div className="border-x border-b-2 border-[#0070f4] bg-white text-[13px] text-[#15171a] select-none animate-in fade-in duration-150">
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

          {loading && !detail ? (
            <div className="p-8 flex items-center justify-center text-slate-400 gap-2">
              <Loader2 size={16} className="animate-spin text-[#0070f4]" />
              <span className="text-xs">Đang tải thông tin chi tiết nhà cung cấp...</span>
            </div>
          ) : (
            <>
              {/* ── TAB 1: THÔNG TIN ── */}
              {activeTab === 'info' && (
                <>
                  <div className="px-5 py-4 space-y-5">
                    {/* Tiêu đề: Tên + Mã (trái), trạng thái (phải) */}
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <h3 className="text-[16px] font-bold text-[#15171a] truncate">{supplier.name}</h3>
                          <span className="text-[13px] text-[#677484] shrink-0">{supplier.code}</span>
                        </div>
                        <span
                          className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#677484]">
                        <span>
                          Người tạo:{' '}
                          {detail?.createdByName ? (
                            <span className="text-[#15171a]">{detail.createdByName}</span>
                          ) : (
                            <span className="text-slate-400">Chưa có</span>
                          )}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span>
                          Ngày tạo:{' '}
                          {detail?.createdAt ? (
                            <span className="text-[#15171a]">{formatDateOnlyVN(detail.createdAt)}</span>
                          ) : (
                            <span className="text-slate-400">Chưa có</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Thông tin liên hệ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                      <InfoField label="Điện thoại" value={supplier.phone} mono />
                      <InfoField label="Email" value={supplier.email} />
                      <div className="md:col-span-2">
                        <InfoField label="Địa chỉ" value={supplier.address} />
                      </div>
                    </div>
                  </div>

                  {/* Footer: Xóa (trái) — Chỉnh sửa, Ngừng hoạt động (phải) */}
                  <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between">
                    <button type="button" onClick={() => onDelete(supplier)} className={textBtnCls}>
                      <Trash2 size={15} />
                      <span>Xóa</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => onEdit(supplier)} className={primaryBtnCls}>
                        <Pencil size={14} />
                        <span>Chỉnh sửa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleStatus(supplier.partnerId)}
                        className={outlineBtnCls}
                      >
                        {isActive ? <Lock size={14} /> : <Unlock size={14} />}
                        <span>{isActive ? 'Ngừng hoạt động' : 'Cho phép hoạt động'}</span>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* ── TAB 2: LỊCH SỬ NHẬP/TRẢ HÀNG ── */}
              {activeTab === 'receipts' && (
                <>
                  <div className="px-5 py-4 space-y-3">
                    {breakdown.length > 1 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-[#677484] mr-1">Chi nhánh:</span>
                        {([
                          { id: 'ALL', label: `Tất cả (${detail?.recentReceipts.length ?? 0})` },
                          ...breakdown.map((wh) => ({
                            id: wh.warehouseId,
                            label: `${wh.warehouseName} (${wh.receiptsCount})`,
                          })),
                        ] satisfies { id: number | 'ALL'; label: string }[])
                          .map((opt) => (
                            <button
                              key={String(opt.id)}
                              type="button"
                              onClick={() => setReceiptWarehouseFilter(opt.id)}
                              className={`px-3 py-1 rounded-full text-xs transition cursor-pointer ${
                                receiptWarehouseFilter === opt.id
                                  ? 'bg-[#0070f4] text-white font-semibold'
                                  : 'bg-white border border-slate-300 text-[#15171a] hover:border-[#0070f4] hover:text-[#0070f4]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                      </div>
                    )}
                    <ReceiptsTable receipts={filteredReceipts} emptyText="Chưa có phiếu nhập/trả hàng nào" />
                  </div>
                  <div className="px-5 py-3 border-t border-slate-200 flex items-center">
                    <button
                      type="button"
                      onClick={() => exportSupplierReceiptsToXLSX(supplier, filteredReceipts)}
                      disabled={filteredReceipts.length === 0}
                      className={`${textBtnCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <FileUp size={15} />
                      <span>Xuất file</span>
                    </button>
                  </div>
                </>
              )}

              {/* ── TAB 3: NỢ CẦN TRẢ NHÀ CUNG CẤP (nhập hàng +, thanh toán/trả hàng −, số dư lũy kế) ── */}
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
                          className="w-full h-8 pl-3 pr-8 rounded-[8px] border border-slate-300 bg-white text-[13px] text-[#15171a] focus:outline-none focus:border-[#0070f4] cursor-pointer appearance-none"
                        >
                          {LEDGER_FILTER_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={14}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none"
                        />
                      </div>
                    </div>

                    <div className={tableWrapCls}>
                      <table className="w-full text-left border-collapse">
                        <thead className={theadCls}>
                          <tr>
                            <th className="py-2 px-3 w-40">Mã phiếu</th>
                            <th className="py-2 px-3 w-40">Thời gian</th>
                            <th className="py-2 px-3">Loại</th>
                            <th className="py-2 px-3 w-40 text-right">Giá trị</th>
                            <th className="py-2 px-3 w-52 text-right">Nợ cần trả nhà cung cấp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[13px]">
                          {filteredLedger.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-6 text-center text-[#677484] text-xs">
                                {ledgerFilter === 'SUPPLIER_RETURN'
                                  ? 'Chưa có phiếu trả hàng nhà cung cấp'
                                  : 'Chưa phát sinh giao dịch công nợ với nhà cung cấp này'}
                              </td>
                            </tr>
                          ) : (
                            pagedLedger.map((l, i) => (
                              <tr key={`${l.type}-${l.code}-${i}`} className="hover:bg-[#f7f8f9]">
                                <td
                                  className={`py-2.5 px-3 font-medium ${
                                    l.type === 'OPENING' ? 'text-[#15171a]' : 'text-[#0070f4]'
                                  }`}
                                >
                                  {l.referenceId && (l.type === 'GOODS_RECEIPT' || l.type === 'SUPPLIER_RETURN') ? (
                                    <DocumentCodeLink
                                      kind={l.type === 'GOODS_RECEIPT' ? 'purchase' : 'purchase-return'}
                                      code={l.code}
                                      id={l.referenceId}
                                      date={toLinkDate(l.date)}
                                    />
                                  ) : l.type === 'ADJUST' ? (
                                    <button
                                      type="button"
                                      onClick={() => setAdjustCode(l.code)}
                                      className="text-[#0070f4] hover:underline cursor-pointer"
                                      title={`Xem phiếu điều chỉnh ${l.code}`}
                                    >
                                      {l.code}
                                    </button>
                                  ) : (l.type === 'PAYMENT' && /^PC/i.test(l.code)) ||
                                    (l.type === 'SUPPLIER_REFUND' && /^PT/i.test(l.code)) ? (
                                    // Phiếu chi thanh toán NCC (PC...) / phiếu thu NCC trả tiền (PT...)
                                    <button
                                      type="button"
                                      onClick={() => setVoucherCode(l.code)}
                                      className="text-[#0070f4] hover:underline cursor-pointer"
                                      title={`Xem phiếu ${l.code}`}
                                    >
                                      {l.code}
                                    </button>
                                  ) : (
                                    l.code
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-[#15171a] whitespace-nowrap">
                                  {l.date ? formatDateTimeVN(l.date) : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-[#15171a]">{l.typeLabel}</td>
                                <td className="py-2.5 px-3 text-right text-[#15171a]">
                                  {currencyFormatter.format(l.amount)}
                                </td>
                                <td className="py-2.5 px-3 text-right text-[#15171a]">
                                  {currencyFormatter.format(l.balanceAfter)}
                                </td>
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
                      onClick={() => exportSupplierLedgerToXLSX(supplier, filteredLedger)}
                      disabled={filteredLedger.length === 0}
                      className={`${textBtnCls} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >
                      <FileUp size={15} />
                      <span>Xuất file</span>
                    </button>
                    <div className="flex items-center gap-2">
                      {currentPayable < 0 ? (
                        // NCC đang nợ cửa hàng → thu tiền NCC (phiếu thu PT...) thay cho Thanh toán
                        <button
                          type="button"
                          onClick={() => setShowRefund(true)}
                          title="Lập phiếu thu: nhà cung cấp trả lại tiền đang nợ cửa hàng"
                          className={primaryBtnCls}
                        >
                          <HandCoins size={15} />
                          <span>Thu tiền NCC</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowPayment(true)}
                          disabled={currentPayable <= 0}
                          title={currentPayable <= 0 ? 'Nhà cung cấp không còn nợ cần trả' : 'Tạo phiếu chi thanh toán nợ'}
                          className={`${primaryBtnCls} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          <CircleDollarSign size={15} />
                          <span>Thanh toán</span>
                        </button>
                      )}
                      {/* Luôn bấm được, kể cả khi nợ = 0: cửa hàng nợ NCC (dương) hoặc NCC nợ cửa hàng (âm) */}
                      <button
                        type="button"
                        onClick={() => setAdjustCode('')}
                        title="Đặt nợ cần trả nhà cung cấp: dương = cửa hàng nợ NCC, âm = NCC nợ cửa hàng, 0 = hết nợ"
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

        {adjustCode !== null && (
          <DebtAdjustModal
            kind="supplier"
            currentDebt={currentPayable}
            code={adjustCode || null}
            api={{
              get: (code) => supplierService.getDebtAdjustment(supplier.partnerId, code),
              create: (payload) => supplierService.adjustSupplierDebt(supplier.partnerId, payload),
              update: (code, payload) => supplierService.updateDebtAdjustment(supplier.partnerId, code, payload),
              cancel: (code) => supplierService.cancelDebtAdjustment(supplier.partnerId, code),
            }}
            onClose={() => setAdjustCode(null)}
            onSuccess={() => {
              setAdjustCode(null);
              onDataChanged?.(supplier.partnerId);
            }}
          />
        )}
        {voucherCode !== null && (
          <DebtVoucherModal
            code={voucherCode}
            load={() => supplierService.getVoucher(supplier.partnerId, voucherCode)}
            cancel={() => supplierService.cancelRefundReceipt(supplier.partnerId, voucherCode)}
            onClose={() => setVoucherCode(null)}
            onChanged={() => onDataChanged?.(supplier.partnerId)}
          />
        )}
        {showRefund && (
          <DebtRefundModal
            kind="supplier"
            partnerName={`${supplier.name} (${supplier.code})`}
            owedAmount={-currentPayable}
            create={(payload) => supplierService.createRefundReceipt(supplier.partnerId, payload)}
            onClose={() => setShowRefund(false)}
            onSuccess={() => {
              setShowRefund(false);
              onDataChanged?.(supplier.partnerId);
            }}
          />
        )}
        {showPayment && (
          <SupplierPaymentModal
            supplier={supplier}
            currentPayable={currentPayable}
            openReceipts={detail?.openReceipts ?? []}
            onClose={() => setShowPayment(false)}
            onSuccess={(result) => {
              setShowPayment(false);
              onPaymentCreated?.(supplier.partnerId, result.voucherCode);
            }}
          />
        )}
      </td>
    </tr>
  );
}
