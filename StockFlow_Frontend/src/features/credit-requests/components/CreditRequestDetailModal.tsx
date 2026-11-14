'use client';

// Chi tiết yêu cầu duyệt hạn mức + quyết định của Manager (UC-64, A62.2, BR-13):
//   (a) duyệt ngoại lệ một lần, (b) duyệt nâng hạn mức (cập nhật hạn mức khách), (c) từ chối kèm lý do.
// Yêu cầu đã xử lý chỉ xem (MSG57 nếu người khác vừa xử lý → làm mới danh sách, E62.2).
// Modal tự dựng (không dùng antd Modal) theo quy ước UI.

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Tag, message } from 'antd';
import { Loader2, X } from 'lucide-react';

import { creditRequestService } from '../services/creditRequestService';
import type { CreditApprovalType, CreditRequest } from '../types';
import { APPROVAL_TYPE_LABEL, CREDIT_STATUS, E62_1_REJECT_REASON, exceedOverLimit, formatVnd } from '../utils/creditRequestUtils';
import { formatDateTimeVN } from '@/lib/utils/date';

type Decision = CreditApprovalType | 'REJECT';

interface Props {
  requestId: number | null;
  onClose: () => void;
  /** Đã quyết định (hoặc phát hiện đã bị xử lý) → tải lại danh sách */
  onChanged: () => void;
}

const DECISIONS: { value: Decision; label: string; hint: string }[] = [
  { value: 'ONE_TIME', label: 'Duyệt ngoại lệ một lần', hint: 'Cho đúng một hóa đơn ghi nợ tới mức dư nợ bạn nhập; không đổi hạn mức của khách.' },
  { value: 'NEW_LIMIT', label: 'Duyệt nâng hạn mức', hint: 'Hạn mức của khách được cập nhật bằng hạn mức mới bạn nhập.' },
  { value: 'REJECT', label: 'Từ chối', hint: 'Bắt buộc nhập lý do từ chối.' },
];

function InfoRow({ label, children, strong }: { label: string; children: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-b-0">
      <span className="text-[#677484] shrink-0">{label}</span>
      <span className={`text-right ${strong ? 'font-semibold' : ''}`}>{children}</span>
    </div>
  );
}

export default function CreditRequestDetailModal({ requestId, onClose, onChanged }: Props) {
  const [detail, setDetail] = useState<{ id: number; data: CreditRequest | null }>({ id: 0, data: null });
  const [decision, setDecision] = useState<Decision>('ONE_TIME');
  const [notes, setNotes] = useState('');
  /** Mức Kế toán trưởng duyệt (mặc định = số Sales đề xuất, sửa được) */
  const [approvedLimit, setApprovedLimit] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const open = requestId != null;
  const loading = open && detail.id !== requestId;
  const req = detail.id === requestId ? detail.data : null;

  useEffect(() => {
    if (requestId == null) return;
    let alive = true;
    creditRequestService
      .getById(requestId)
      .then((d) => {
        if (!alive) return;
        setDetail({ id: requestId, data: d });
        setDecision('ONE_TIME');
        setNotes('');
        setApprovedLimit(d.requestedLimit);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        message.error(err instanceof Error ? err.message : 'Không tải được yêu cầu.');
        onClose();
      });
    return () => {
      alive = false;
    };
  }, [requestId, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !saving && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const pending = req?.status === 'PENDING';
  const rejectMissingReason = decision === 'REJECT' && !notes.trim();
  // E62.1: hạn mức mới không thấp hơn hạn mức hiện tại; ngoại lệ một lần phải vượt hạn mức hiện tại
  const limitError =
    !req || decision === 'REJECT'
      ? null
      : !approvedLimit
        ? 'Vui lòng nhập mức duyệt.'
        : decision === 'NEW_LIMIT' && approvedLimit < req.currentCreditLimit
          ? `Hạn mức mới thấp hơn hạn mức hiện tại của khách hàng (${formatVnd(req.currentCreditLimit)} đ) (E62.1).`
          : decision === 'ONE_TIME' && approvedLimit <= req.currentCreditLimit
            ? `Mức dư nợ tối đa phải lớn hơn hạn mức hiện tại (${formatVnd(req.currentCreditLimit)} đ).`
            : null;

  const submit = async () => {
    if (!req) return;
    if (rejectMissingReason) {
      // E62.1: từ chối phải có lý do (khớp CreditRequestMessages.RejectReasonRequired)
      message.warning(E62_1_REJECT_REASON);
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

  return createPortal(
    <div
      className="fixed inset-0 z-[900] bg-slate-900/40 flex items-start justify-center p-4 sm:p-10 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="w-full max-w-[640px] bg-white rounded-xl shadow-2xl border border-slate-200 text-[13px] text-[#15171a]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold">Yêu cầu duyệt hạn mức {req?.requestCode ?? ''}</h3>
            {req && <Tag color={CREDIT_STATUS[req.status].color}>{CREDIT_STATUS[req.status].label}</Tag>}
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer disabled:cursor-not-allowed"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {loading || !req ? (
          <div className="py-16 text-center text-[#677484]">
            <Loader2 size={18} className="inline animate-spin mr-2 text-[#0071BA]" />
            Đang tải yêu cầu...
          </div>
        ) : (
          <>
            <div className="px-5 py-4 grid grid-cols-1 gap-5">
            {/* Cột trái: yêu cầu + quyết định */}
            <div className="space-y-4">
              <div className="rounded-[8px] border border-slate-200 px-4 py-2">
                <InfoRow label="Khách hàng" strong>
                  {req.partnerCode} – {req.partnerName}
                </InfoRow>
                <InfoRow label="Dư nợ hiện tại">{formatVnd(req.currentDebt)} đ</InfoRow>
                <InfoRow label="Hạn mức hiện tại">{formatVnd(req.currentCreditLimit)} đ</InfoRow>
                <InfoRow label="Hạn mức lúc gửi">{formatVnd(req.limitAtRequest)} đ</InfoRow>
                <InfoRow label="Sales đề xuất" strong>
                  {formatVnd(req.requestedLimit)} đ
                </InfoRow>
                <InfoRow label="Đề xuất vượt hạn mức hiện tại">
                  <span className="text-[#fb2c36]">{formatVnd(exceedOverLimit(req))} đ</span>
                </InfoRow>
                <InfoRow label="Người gửi">{req.requestedByName ?? '—'}</InfoRow>
                <InfoRow label="Thời gian gửi">{formatDateTimeVN(req.requestDate)}</InfoRow>
                <InfoRow label="Lý do">{req.reason ?? '—'}</InfoRow>
              </div>

              {!pending && (
                <div className="rounded-[8px] border border-slate-200 px-4 py-2">
                  {req.approvalType && <InfoRow label="Loại duyệt">{APPROVAL_TYPE_LABEL[req.approvalType]}</InfoRow>}
                  {req.approvedLimit != null && (
                    <InfoRow label={req.approvalType === 'NEW_LIMIT' ? 'Hạn mức mới được duyệt' : 'Dư nợ tối đa được duyệt'} strong>
                      {formatVnd(req.approvedLimit)} đ
                    </InfoRow>
                  )}
                  <InfoRow label="Người xử lý">{req.approvedByName ?? '—'}</InfoRow>
                  <InfoRow label="Thời gian xử lý">{formatDateTimeVN(req.approvalDate)}</InfoRow>
                  <InfoRow label={req.status === 'REJECTED' ? 'Lý do từ chối' : 'Ghi chú'}>{req.approvalNotes ?? '—'}</InfoRow>
                  {req.approvalType === 'ONE_TIME' && (
                    <InfoRow label="Hóa đơn đã dùng">{req.salesOrderCode ?? 'Chưa dùng'}</InfoRow>
                  )}
                </div>
              )}

              {pending && (
                <div className="space-y-2">
                  <div className="font-semibold">Quyết định</div>
                  {DECISIONS.map((d) => (
                    <label
                      key={d.value}
                      className={`flex items-start gap-2 rounded-[8px] border px-3 py-2 cursor-pointer ${
                        decision === d.value ? 'border-[#0071BA] bg-[#e8f2ff]' : 'border-slate-200'
                      }`}
                    >
                      <input
                        type="radio"
                        name="credit-decision"
                        value={d.value}
                        checked={decision === d.value}
                        disabled={saving}
                        onChange={() => setDecision(d.value)}
                        className="mt-0.5 accent-[#0071BA]"
                      />
                      <span>
                        <span className="font-semibold">{d.label}</span>
                        <span className="block text-[12px] text-[#677484]">{d.hint}</span>
                      </span>
                    </label>
                  ))}
                  {decision !== 'REJECT' && (
                    <div>
                      {/* Kế toán trưởng quyết định con số (mặc định = số Sales đề xuất) – A62.2 */}
                      <div className="mb-1 font-semibold">
                        {decision === 'NEW_LIMIT' ? 'Hạn mức mới' : 'Dư nợ tối đa cho hóa đơn này'}{' '}
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
                        className="w-full h-9 rounded-[8px] border border-slate-300 px-3 text-right font-mono focus:outline-none focus:border-[#0071BA]"
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
                      rows={3}
                      disabled={saving}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder={decision === 'REJECT' ? 'Nhập lý do từ chối' : 'Ghi chú (không bắt buộc)'}
                      className="w-full rounded-[8px] border border-slate-300 px-3 py-2 focus:outline-none focus:border-[#0071BA]"
                    />
                  </div>
                </div>
              )}
            </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-3 border-t border-slate-200">
              <Button onClick={onClose} disabled={saving}>
                Đóng
              </Button>
              {pending && (
                <Button
                  type="primary"
                  danger={decision === 'REJECT'}
                  loading={saving}
                  disabled={rejectMissingReason || !!limitError}
                  onClick={() => void submit()}
                >
                  {decision === 'REJECT' ? 'Từ chối' : 'Duyệt'}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
