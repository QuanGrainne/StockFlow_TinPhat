'use client';

// Popup duyệt yêu cầu hạn mức của Manager (UC-64, A62.2, BR-13):
//   (a) duyệt nâng hạn mức (cập nhật hạn mức khách), (b) từ chối kèm lý do.
//   Nhóm đã bỏ "duyệt ngoại lệ một lần" (16/11/2026); API cũng chỉ nhận NEW_LIMIT.
// Mở từ nút Duyệt / Từ chối trong chi tiết xổ xuống của danh sách (CreditRequestDetailPanel).
// Yêu cầu đã xử lý chỉ xem (MSG57 nếu người khác vừa xử lý → làm mới danh sách, E62.2).
// Bố cục theo popup Hóa đơn / chi tiết Chuyển hàng: thông tin yêu cầu ở trên, bên dưới là các tab
// "Xét duyệt" (hoặc "Kết quả xử lý"), "Mua hàng", "Thanh toán"; nút thao tác cố định ở chân popup.
// Mã hóa đơn bấm được → popup xem nhanh hóa đơn (InvoicePreviewModal, có nút "Mở phiếu").
// Modal tự dựng (không dùng antd Modal) theo quy ước UI.

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { message } from 'antd';
import { Check, Loader2, X } from 'lucide-react';
import { InvoicePreviewModal } from '@/features/orders';
import { PartnerLink } from '@/components/links/EntityLinks';

import {
  InvoiceCodeLink,
  PaymentHistorySection,
  PurchaseHistorySection,
  useCustomerCreditHistory,
} from './CustomerCreditHistoryPanel';
import { creditRequestService } from '../services/creditRequestService';
import type { CreditRequest } from '../types';
import {
  APPROVAL_TYPE_LABEL,
  CREDIT_STATUS,
  CREDIT_STATUS_CLS,
  E62_1_REJECT_REASON,
  exceedOverLimit,
  formatVnd,
} from '../utils/creditRequestUtils';
import { formatDateTimeVN } from '@/lib/utils/date';

export type CreditDecision = 'NEW_LIMIT' | 'REJECT';
type Decision = CreditDecision;
type TabKey = 'decision' | 'purchases' | 'payments';

interface Props {
  requestId: number | null;
  /** Lựa chọn ban đầu (bấm Duyệt → Nâng hạn mức, bấm Từ chối → Từ chối) */
  initialDecision?: CreditDecision;
  onClose: () => void;
  /** Đã quyết định (hoặc phát hiện đã bị xử lý) → tải lại danh sách */
  onChanged: () => void;
}

const DECISIONS: { value: Decision; label: string; hint: string }[] = [
  { value: 'NEW_LIMIT', label: 'Duyệt nâng hạn mức', hint: 'Hạn mức của khách được cập nhật bằng hạn mức mới bạn nhập.' },
  { value: 'REJECT', label: 'Từ chối', hint: 'Bắt buộc nhập lý do từ chối.' },
];

/** Một ô "Nhãn: giá trị" trong lưới thông tin (giống popup Hóa đơn) */
function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 min-w-0 ${className}`}>
      <span className="w-[110px] shrink-0 text-[#677484]">{label}:</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

export function CreditStatusBadge({ status }: { status: CreditRequest['status'] }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${CREDIT_STATUS_CLS[status]}`}>
      {CREDIT_STATUS[status].label}
    </span>
  );
}

export default function CreditRequestDetailModal({ requestId, initialDecision = 'NEW_LIMIT', onClose, onChanged }: Props) {
  const open = requestId != null;
  if (!open || typeof document === 'undefined') return null;
  return <DetailModalBody requestId={requestId} initialDecision={initialDecision} onClose={onClose} onChanged={onChanged} />;
}

function DetailModalBody({
  requestId,
  initialDecision,
  onClose,
  onChanged,
}: {
  requestId: number;
  initialDecision: CreditDecision;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<{ id: number; data: CreditRequest | null }>({ id: 0, data: null });
  const [tab, setTab] = useState<TabKey>('decision');
  const [decision, setDecision] = useState<Decision>(initialDecision);
  const [notes, setNotes] = useState('');
  /** Mức Kế toán trưởng duyệt (mặc định = số Sales đề xuất, sửa được) */
  const [approvedLimit, setApprovedLimit] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  /** Hóa đơn đang xem nhanh (bấm mã hóa đơn) */
  const [previewOrderId, setPreviewOrderId] = useState<number | null>(null);

  const history = useCustomerCreditHistory(requestId);
  const loading = detail.id !== requestId;
  const req = detail.id === requestId ? detail.data : null;

  useEffect(() => {
    let alive = true;
    creditRequestService
      .getById(requestId)
      .then((d) => {
        if (!alive) return;
        setDetail({ id: requestId, data: d });
        setApprovedLimit(d.requestedLimit);
        // Popup này mở để ra quyết định: dòng trong danh sách còn "Chờ duyệt" nhưng người khác đã xử lý
        // → báo MSG57 và làm mới danh sách (E62.2, SYS-MSC-07); popup vẫn hiện kết quả xử lý để xem.
        if (d.status !== 'PENDING') {
          message.warning('Yêu cầu này đã được xử lý (MSG57).');
          onChanged();
        }
      })
      .catch((err: unknown) => {
        if (!alive) return;
        message.error(err instanceof Error ? err.message : 'Không tải được yêu cầu.');
        onClose();
      });
    return () => {
      alive = false;
    };
    // onChanged chỉ dùng khi tải xong; không đưa vào deps để tránh tải lại khi danh sách làm mới
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId, onClose]);

  useEffect(() => {
    // Đang mở popup hóa đơn thì Esc chỉ đóng popup hóa đơn
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && previewOrderId == null && !saving && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [previewOrderId, saving, onClose]);

  const pending = req?.status === 'PENDING';
  const rejectMissingReason = decision === 'REJECT' && !notes.trim();
  // E62.1: hạn mức mới không thấp hơn hạn mức hiện tại
  const limitError =
    !req || decision === 'REJECT'
      ? null
      : !approvedLimit
        ? 'Vui lòng nhập mức duyệt.'
        : approvedLimit < req.currentCreditLimit
          ? `Hạn mức mới thấp hơn hạn mức hiện tại của khách hàng (${formatVnd(req.currentCreditLimit)} đ) (E62.1).`
          : null;

  const submit = async () => {
    if (!req) return;
    if (rejectMissingReason) {
      // E62.1: từ chối phải có lý do (khớp CreditRequestMessages.RejectReasonRequired)
      message.warning(E62_1_REJECT_REASON);
      setTab('decision');
      return;
    }
    if (limitError) {
      message.warning(limitError);
      setTab('decision');
      return;
    }
    setSaving(true);
    try {
      const res =
        decision === 'REJECT'
          ? await creditRequestService.reject(req.requestId, notes.trim())
          : await creditRequestService.approve(req.requestId, {
              approvalType: decision,
              approvedLimit: approvedLimit ?? undefined,
              notes: notes.trim() || undefined,
            });
      message.success(res.message);
      onChanged();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không lưu được quyết định.';
      message.error(msg);
      // MSG57: người khác đã xử lý → làm mới danh sách (E62.2)
      if (msg.includes('MSG57')) {
        onChanged();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'decision', label: pending ? 'Xét duyệt' : 'Kết quả xử lý' },
    { key: 'purchases', label: 'Mua hàng' },
    { key: 'payments', label: 'Thanh toán' },
  ];
  const inputCls =
    'w-full rounded-[8px] border border-slate-300 bg-white px-3 focus:outline-none focus:border-[#0070f4] disabled:bg-[#f7f8f9]';
  const selectedHint = DECISIONS.find((d) => d.value === decision)?.hint;

  const renderHistory = (render: (h: NonNullable<typeof history.data>) => React.ReactNode) =>
    history.loading ? (
      <div className="py-12 flex items-center justify-center gap-2 text-[#677484]">
        <Loader2 size={16} className="animate-spin text-[#0070f4]" /> Đang tải lịch sử khách hàng...
      </div>
    ) : !history.data ? (
      <div className="py-12 text-center text-[#fb2c36]">{history.error || 'Không tải được lịch sử khách hàng.'}</div>
    ) : (
      render(history.data)
    );

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[900] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
        onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[860px] max-h-[90vh] flex flex-col text-[13px] text-[#15171a] animate-in fade-in zoom-in-95 duration-150">
          {/* Tiêu đề */}
          <div className="flex items-center justify-between gap-3 px-6 pt-5 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <h3 className="text-[18px] font-bold truncate">Yêu cầu hạn mức {req?.requestCode ?? ''}</h3>
              {req && <CreditStatusBadge status={req.status} />}
              {req?.approvalType && (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25 whitespace-nowrap">
                  {APPROVAL_TYPE_LABEL[req.approvalType]}
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="p-1.5 rounded-[8px] hover:bg-[#f7f8f9] cursor-pointer disabled:cursor-not-allowed"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          {loading || !req ? (
            <div className="py-16 flex items-center justify-center gap-2 text-[#677484]">
              <Loader2 size={16} className="animate-spin text-[#0070f4]" /> Đang tải yêu cầu...
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">
                {/* Thông tin yêu cầu */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                  <Field label="Khách hàng" className="sm:col-span-2">
                    {req.partnerCode ? (
                      <PartnerLink kind="customer" code={req.partnerCode} partnerId={req.partnerId}>
                        {req.partnerCode} - {req.partnerName}
                      </PartnerLink>
                    ) : (
                      req.partnerName ?? '—'
                    )}
                  </Field>
                  <Field label="Người gửi">{req.requestedByName ?? '—'}</Field>
                  <Field label="Thời gian gửi">{formatDateTimeVN(req.requestDate)}</Field>
                  <Field label="Lý do" className="sm:col-span-2">
                    {req.reason ?? '—'}
                  </Field>
                </div>

                {/* Số liệu công nợ */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Dư nợ hiện tại', value: formatVnd(req.currentDebt) },
                    { label: 'Hạn mức hiện tại', value: formatVnd(req.currentCreditLimit), hint: `Lúc gửi: ${formatVnd(req.limitAtRequest)}` },
                    { label: 'Sales đề xuất', value: formatVnd(req.requestedLimit), strong: true },
                    { label: 'Vượt hạn mức', value: formatVnd(exceedOverLimit(req)), danger: true },
                  ].map((s) => (
                    <div key={s.label} className="rounded-[8px] border border-slate-200 bg-[#f7f8f9]/60 px-3 py-2">
                      <div className="text-[11px] text-[#677484]">{s.label}</div>
                      <div className={`text-[15px] font-semibold ${s.danger ? 'text-[#fb2c36]' : s.strong ? 'text-[#0070f4]' : ''}`}>{s.value}</div>
                      {s.hint && <div className="text-[11px] text-[#677484]">{s.hint}</div>}
                    </div>
                  ))}
                </div>

                {/* Tab */}
                <div>
                  <div className="flex items-center gap-1 border-b border-slate-200 mb-3">
                    {TABS.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setTab(t.key)}
                        className={`px-4 py-2 text-[13px] border-b-2 -mb-px cursor-pointer transition ${
                          tab === t.key ? 'border-[#0070f4] text-[#0070f4] font-semibold' : 'border-transparent text-[#677484] hover:text-[#15171a]'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {tab === 'decision' &&
                    (pending ? (
                      <div className="space-y-3">
                        {/* Chọn quyết định */}
                        <div className="grid grid-cols-2 gap-2">
                          {DECISIONS.map((d) => {
                            const active = decision === d.value;
                            const danger = d.value === 'REJECT';
                            return (
                              <button
                                key={d.value}
                                type="button"
                                disabled={saving}
                                onClick={() => setDecision(d.value)}
                                className={`h-9 rounded-[8px] border font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition disabled:cursor-not-allowed ${
                                  active
                                    ? danger
                                      ? 'border-[#fb2c36] bg-[#fef2f2] text-[#fb2c36]'
                                      : 'border-[#0070f4] bg-[#e6f1fe] text-[#0070f4]'
                                    : 'border-slate-300 bg-white text-[#15171a] hover:bg-[#f7f8f9]'
                                }`}
                              >
                                {active && <Check size={14} className="stroke-[2.5]" />}
                                {d.label}
                              </button>
                            );
                          })}
                        </div>
                        {selectedHint && <div className="text-[12px] text-[#677484]">{selectedHint}</div>}

                        <div className={`grid gap-3 ${decision === 'REJECT' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-[260px_1fr]'}`}>
                          {decision !== 'REJECT' && (
                            <div>
                              {/* Kế toán trưởng quyết định con số (mặc định = số Sales đề xuất) – A62.2 */}
                              <div className="mb-1 font-semibold">
                                Hạn mức mới{' '}
                                <span className="text-[#fb2c36]">*</span>
                              </div>
                              <input
                                inputMode="numeric"
                                value={approvedLimit ? approvedLimit.toLocaleString('vi-VN') : ''}
                                disabled={saving}
                                onChange={(e) => {
                                  const v = Number(e.target.value.replace(/\D/g, '')) || 0;
                                  setApprovedLimit(v > 0 ? v : null);
                                }}
                                className={`${inputCls} h-9 text-right font-semibold`}
                              />
                              <div className="mt-1 text-[12px] text-[#677484]">Sales đề xuất: {formatVnd(req.requestedLimit)} đ</div>
                              {limitError && <div className="mt-1 text-[12px] text-[#fb2c36]">{limitError}</div>}
                            </div>
                          )}
                          <div>
                            <div className="mb-1 font-semibold">
                              {decision === 'REJECT' ? (
                                <>
                                  Lý do từ chối <span className="text-[#fb2c36]">*</span>
                                </>
                              ) : (
                                'Ghi chú'
                              )}
                            </div>
                            <textarea
                              value={notes}
                              maxLength={500}
                              rows={decision === 'REJECT' ? 3 : 2}
                              disabled={saving}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder={decision === 'REJECT' ? 'Nhập lý do từ chối' : 'Ghi chú (không bắt buộc)'}
                              className={`${inputCls} py-2 resize-none`}
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5">
                        <Field label="Loại duyệt">{req.approvalType ? APPROVAL_TYPE_LABEL[req.approvalType] : '—'}</Field>
                        {req.approvedLimit != null && (
                          <Field label={req.approvalType === 'NEW_LIMIT' ? 'Hạn mức mới' : 'Dư nợ tối đa'}>
                            <span className="font-semibold">{formatVnd(req.approvedLimit)} đ</span>
                          </Field>
                        )}
                        <Field label="Người xử lý">{req.approvedByName ?? '—'}</Field>
                        <Field label="Thời gian xử lý">{formatDateTimeVN(req.approvalDate)}</Field>
                        {req.approvalType === 'ONE_TIME' && (
                          <Field label="Hóa đơn đã dùng">
                            {req.salesOrderCode ? (
                              <InvoiceCodeLink orderId={req.salesOrderId} orderCode={req.salesOrderCode} onOpen={setPreviewOrderId} />
                            ) : (
                              'Chưa dùng'
                            )}
                          </Field>
                        )}
                        <Field label={req.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú'} className="sm:col-span-2">
                          {req.approvalNotes ?? '—'}
                        </Field>
                      </div>
                    ))}

                  {tab === 'purchases' && renderHistory((h) => <PurchaseHistorySection history={h} onOpenInvoice={setPreviewOrderId} />)}
                  {tab === 'payments' && renderHistory((h) => <PaymentHistorySection history={h} onOpenInvoice={setPreviewOrderId} />)}
                </div>
              </div>

              {/* Chân popup */}
              <div className="flex justify-end gap-2 px-6 py-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 h-9 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Đóng
                </button>
                {pending && (
                  <button
                    type="button"
                    // Thiếu lý do / mức duyệt sai vẫn bấm được: submit báo lỗi và chuyển về tab "Xét duyệt"
                    disabled={saving}
                    onClick={() => void submit()}
                    className={`inline-flex items-center gap-1.5 px-4 h-9 rounded-[8px] text-white font-semibold cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed ${
                      decision === 'REJECT' ? 'bg-[#fb2c36] hover:bg-[#e0242e]' : 'bg-[#0070f4] hover:bg-[#005ac3]'
                    }`}
                  >
                    {saving && <Loader2 size={14} className="animate-spin" />}
                    {decision === 'REJECT' ? 'Từ chối' : 'Duyệt'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {previewOrderId != null && <InvoicePreviewModal orderId={previewOrderId} onClose={() => setPreviewOrderId(null)} />}
    </>,
    document.body
  );
}
