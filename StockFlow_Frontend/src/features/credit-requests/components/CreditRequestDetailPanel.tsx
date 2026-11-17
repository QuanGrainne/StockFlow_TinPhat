'use client';

// Chi tiết một yêu cầu hạn mức, mở rộng ngay dưới dòng trong danh sách Duyệt hạn mức
// (cùng kiểu chi tiết phiếu Xuất hủy / Chuyển hàng): tab Thông tin / Mua hàng / Thanh toán,
// thanh thao tác bên dưới: Xuất file, In; yêu cầu đang chờ thì có thêm Từ chối / Duyệt (mở popup duyệt).
// Không có thao tác Hủy (nhóm thống nhất không làm trạng thái hủy, 16/11/2026).

import React, { useState } from 'react';
import { Check, FileDown, Loader2, Printer, X } from 'lucide-react';
import { InvoicePreviewModal } from '@/features/orders';
import { PartnerLink } from '@/components/links/EntityLinks';
import { formatDateTimeVN } from '@/lib/utils/date';

import { CreditStatusBadge } from './CreditRequestDetailModal';
import {
  InvoiceCodeLink,
  PaymentHistorySection,
  PurchaseHistorySection,
  useCustomerCreditHistory,
} from './CustomerCreditHistoryPanel';
import type { CreditRequest } from '../types';
import { APPROVAL_TYPE_LABEL, exceedOverLimit, formatVnd } from '../utils/creditRequestUtils';
import { exportCreditRequestExcel, printCreditRequest } from '../utils/creditRequestDocs';

type TabKey = 'info' | 'purchases' | 'payments';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'info', label: 'Thông tin' },
  { key: 'purchases', label: 'Mua hàng' },
  { key: 'payments', label: 'Thanh toán' },
];

interface Props {
  request: CreditRequest;
  /** Mở popup duyệt với lựa chọn ban đầu */
  onDecide: (decision: 'NEW_LIMIT' | 'REJECT') => void;
}

/** Một ô "Nhãn: giá trị" (giống phần đầu chi tiết phiếu Xuất hủy) */
function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-1.5 min-h-7 min-w-0 ${className}`}>
      <span className="text-slate-400 shrink-0 pt-px">{label}:</span>
      <span className="font-medium text-slate-800 min-w-0 break-words">{children}</span>
    </div>
  );
}

const btnCls =
  'flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#15171a] hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer';

export function CreditRequestDetailPanel({ request: r, onDecide }: Props) {
  const [tab, setTab] = useState<TabKey>('info');
  const [previewOrderId, setPreviewOrderId] = useState<number | null>(null);
  // Chỉ tải lịch sử khách khi mở tab Mua hàng / Thanh toán lần đầu
  const [historyWanted, setHistoryWanted] = useState(false);
  const pending = r.status === 'PENDING';

  return (
    <div className="px-6 py-4 text-[13px] text-[#15171a]" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key);
              if (t.key !== 'info') setHistoryWanted(true);
            }}
            className={`px-4 py-2 text-sm border-b-2 -mb-px cursor-pointer transition ${
              tab === t.key ? 'border-[#0070f4] text-[#0070f4] font-semibold' : 'border-transparent text-[#677484] hover:text-[#15171a]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'info' ? (
        <>
          {/* Đầu phiếu */}
          <div className="mb-4">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="text-base font-bold font-mono">{r.requestCode ?? `#${r.requestId}`}</span>
              <CreditStatusBadge status={r.status} />
              {r.approvalType && <span className="text-xs text-[#677484]">{APPROVAL_TYPE_LABEL[r.approvalType]}</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600">
              <Field label="Khách hàng">
                {r.partnerCode ? (
                  <PartnerLink kind="customer" code={r.partnerCode} partnerId={r.partnerId}>
                    {r.partnerCode} - {r.partnerName}
                  </PartnerLink>
                ) : (
                  r.partnerName ?? '—'
                )}
              </Field>
              <Field label="Người gửi">{r.requestedByName ?? '—'}</Field>
              <Field label="Thời gian gửi">{formatDateTimeVN(r.requestDate) || '—'}</Field>
              {!pending && (
                <>
                  <Field label="Người xử lý">{r.approvedByName ?? '—'}</Field>
                  <Field label="Thời gian xử lý">{formatDateTimeVN(r.approvalDate) || '—'}</Field>
                  {r.approvalType === 'ONE_TIME' ? (
                    <Field label="Hóa đơn đã dùng">
                      {r.salesOrderCode ? (
                        <InvoiceCodeLink orderId={r.salesOrderId} orderCode={r.salesOrderCode} onOpen={setPreviewOrderId} />
                      ) : (
                        'Chưa dùng'
                      )}
                    </Field>
                  ) : (
                    <span />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Lý do | Tổng hợp số liệu */}
          <div className="flex flex-col md:flex-row items-start gap-6 mb-4">
            <div className="flex-1 w-full space-y-3">
              <div>
                <div className="text-xs font-semibold text-slate-600 mb-1">Lý do gửi yêu cầu</div>
                <div className="min-h-[56px] p-2.5 text-xs border border-slate-200 rounded-[8px] bg-slate-50/60 whitespace-pre-wrap">
                  {r.reason || <span className="text-slate-400">Không có</span>}
                </div>
              </div>
              {!pending && (
                <div>
                  <div className="text-xs font-semibold text-slate-600 mb-1">
                    {r.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú duyệt'}
                  </div>
                  <div
                    className={`min-h-[40px] p-2.5 text-xs border rounded-[8px] whitespace-pre-wrap ${
                      r.status === 'REJECTED' ? 'border-rose-200 bg-rose-50/60 text-rose-700' : 'border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    {r.approvalNotes || <span className="text-slate-400">Không có</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="w-full md:w-80 shrink-0 space-y-1.5 text-xs bg-slate-50/60 p-3 rounded-[8px] border border-slate-200">
              <div className="flex justify-between text-slate-600">
                <span>Dư nợ hiện tại</span>
                <span className="font-semibold text-slate-800">{formatVnd(r.currentDebt)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hạn mức hiện tại</span>
                <span className="font-semibold text-slate-800">{formatVnd(r.currentCreditLimit)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hạn mức lúc gửi</span>
                <span className="font-semibold text-slate-800">{formatVnd(r.limitAtRequest)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vượt hạn mức hiện tại</span>
                <span className="font-semibold text-[#fb2c36]">{formatVnd(exceedOverLimit(r))}</span>
              </div>
              <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1.5 font-bold">
                <span>Hạn mức đề xuất</span>
                <span className="text-[#0070f4]">{formatVnd(r.requestedLimit)}</span>
              </div>
              {r.approvedLimit != null && (
                <div className="flex justify-between text-slate-700 font-bold">
                  <span>{r.approvalType === 'ONE_TIME' ? 'Dư nợ tối đa được duyệt' : 'Hạn mức được duyệt'}</span>
                  <span className="text-[#16a34a]">{formatVnd(r.approvedLimit)}</span>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
      {/* Giữ phần lịch sử đã tải khi chuyển qua lại giữa các tab (không gọi lại API) */}
      {historyWanted && (
        <div className={tab === 'info' ? 'hidden' : ''}>
          <HistoryTabBody requestId={r.requestId} tab={tab === 'payments' ? 'payments' : 'purchases'} onOpenInvoice={setPreviewOrderId} />
        </div>
      )}

      {/* Thao tác */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-4 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => exportCreditRequestExcel(r)} className={btnCls}>
            <FileDown size={13} />
            Xuất file
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => printCreditRequest(r)} className={btnCls}>
            <Printer size={13} />
            In
          </button>
          {pending && (
            <>
              <button
                type="button"
                onClick={() => onDecide('REJECT')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-[8px] border border-rose-200 bg-white cursor-pointer"
              >
                <X size={13} />
                Từ chối
              </button>
              <button
                type="button"
                onClick={() => onDecide('NEW_LIMIT')}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold cursor-pointer"
              >
                <Check size={13} />
                Duyệt
              </button>
            </>
          )}
        </div>
      </div>

      {previewOrderId != null && <InvoicePreviewModal orderId={previewOrderId} onClose={() => setPreviewOrderId(null)} />}
    </div>
  );
}

/** Tab Mua hàng / Thanh toán: lịch sử khách tải một lần khi mở lần đầu */
function HistoryTabBody({
  requestId,
  tab,
  onOpenInvoice,
}: {
  requestId: number;
  tab: 'purchases' | 'payments';
  onOpenInvoice: (orderId: number) => void;
}) {
  const history = useCustomerCreditHistory(requestId);
  if (history.loading)
    return (
      <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Loader2 size={16} className="animate-spin text-[#0070f4]" /> Đang tải lịch sử khách hàng...
      </div>
    );
  if (!history.data) return <div className="py-10 text-center text-xs text-[#fb2c36]">{history.error || 'Không tải được lịch sử khách hàng.'}</div>;
  return tab === 'purchases' ? (
    <PurchaseHistorySection history={history.data} onOpenInvoice={onOpenInvoice} />
  ) : (
    <PaymentHistorySection history={history.data} onOpenInvoice={onOpenInvoice} />
  );
}
