'use client';

// Hộp thoại QR thanh toán chuyển khoản qua payOS (màn Bán hàng: hóa đơn / đặt hàng).
// Luồng: mở hộp thoại → backend tạo link payOS → hiện QR + thông tin chuyển khoản thủ công →
// hỏi backend mỗi 3 giây (backend tự hỏi payOS / nhận webhook có chữ ký) → Đã thanh toán thì báo về màn Bán hàng.
// Client không tự quyết "đã thanh toán": chỉ hiển thị trạng thái backend trả về.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message, QRCode } from 'antd';
import { AlertTriangle, CheckCircle2, Clock, Copy, Loader2, RefreshCcw, X } from 'lucide-react';
import { payosService } from '../services/payosService';
import type { PayosPayment } from '../types';

const POLL_MS = 3000;

const fmt = (n: number) => Math.round(n || 0).toLocaleString('vi-VN');
const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const ALREADY_PAID = '[PAYOS_ALREADY_PAID]';
const errText = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message.replace(ALREADY_PAID, '').trim() : fallback;

const cardCls = 'rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_16px_rgba(15,23,42,0.06)]';
const pillBtnCls =
  'inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full text-[14px] font-semibold transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed';

interface PayosQrDialogProps {
  amount: number;
  referenceType: 'POS_INVOICE' | 'POS_BOOKING';
  warehouseId?: number | null;
  /** Khóa đơn đang lập (id tab): backend chặn tạo QR mới khi đơn đã thanh toán */
  draftKey: string;
  /** Mã đơn hiển thị (VD HH000009) */
  referenceCode?: string | null;
  onClose: () => void;
  /** payOS đã xác nhận nhận tiền (backend báo PAID) */
  onPaid: (payment: PayosPayment) => void;
}

function CopyRow({ label, value, display }: { label: string; value: string; display?: React.ReactNode }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      message.success(`Đã sao chép ${label.toLowerCase()}`);
    } catch {
      message.error('Không sao chép được, vui lòng chọn và sao chép thủ công.');
    }
  };
  return (
    <div className={`${cardCls} flex items-center justify-between gap-3 px-4 py-2.5`}>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold tracking-wide text-[#677484] uppercase">{label}</div>
        <div className="mt-0.5 text-[15px] font-bold text-[#15171a] break-all">{display ?? (value || '—')}</div>
      </div>
      <button
        type="button"
        onClick={() => void copy()}
        disabled={!value}
        title={`Sao chép ${label.toLowerCase()}`}
        className="shrink-0 h-9 w-9 rounded-full bg-[#0f1f4b] hover:bg-[#1b2f66] text-white flex items-center justify-center cursor-pointer disabled:opacity-40"
      >
        <Copy size={15} />
      </button>
    </div>
  );
}

export default function PayosQrDialog({
  amount,
  referenceType,
  warehouseId,
  draftKey,
  referenceCode,
  onClose,
  onPaid,
}: PayosQrDialogProps) {
  const [payment, setPayment] = useState<PayosPayment | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Đơn đã thanh toán trước đó (backend từ chối tạo thêm QR) */
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const paidNotified = useRef(false);
  // Giữ callback mới nhất trong ref để màn Bán hàng render lại không làm tạo lại QR
  const onPaidRef = useRef(onPaid);
  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  /** Nhận trạng thái mới từ backend: cập nhật đồng hồ và báo về màn Bán hàng khi đã thanh toán (chỉ 1 lần) */
  const apply = useCallback((p: PayosPayment) => {
    setPayment(p);
    setSecondsLeft(p.secondsLeft);
    if (p.status === 'PAID' && !paidNotified.current) {
      paidNotified.current = true;
      onPaidRef.current(p);
    }
  }, []);

  // Tạo QR khi mở hộp thoại / bấm "Tạo QR mới" (attempt tăng)
  useEffect(() => {
    let alive = true;
    payosService
      .create({ amount: Math.round(amount), referenceType, warehouseId, draftKey, referenceCode })
      .then((p) => {
        if (!alive) return;
        setError(null);
        apply(p);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setAlreadyPaid(err instanceof Error && err.message.startsWith(ALREADY_PAID));
        setError(errText(err, 'Không tạo được QR thanh toán.'));
      });
    return () => {
      alive = false;
    };
  }, [amount, referenceType, warehouseId, draftKey, referenceCode, attempt, apply]);

  // Hỏi trạng thái định kỳ khi QR đang chờ
  const orderCode = payment?.orderCode;
  const pending = payment?.status === 'PENDING';
  useEffect(() => {
    if (!orderCode || !pending) return;
    const timer = window.setInterval(() => {
      payosService
        .get(orderCode)
        .then(apply)
        .catch(() => {
          // lỗi mạng tạm thời: lần sau hỏi lại
        });
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [orderCode, pending, apply]);

  // Đồng hồ hiệu lực QR (đồng bộ lại theo secondsLeft của server mỗi lần hỏi)
  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [pending]);

  /** Hủy QR đang chờ; nếu backend báo khách đã chuyển xong thì giữ trạng thái Đã thanh toán */
  const cancelCurrent = async (): Promise<PayosPayment | null> => {
    if (!payment || payment.status !== 'PENDING') return payment;
    try {
      const p = await payosService.cancel(payment.orderCode);
      apply(p);
      return p;
    } catch {
      return payment;
    }
  };

  const handleClose = async () => {
    setBusy(true);
    await cancelCurrent();
    setBusy(false);
    onClose();
  };

  const handleNewQr = async () => {
    setBusy(true);
    const current = await cancelCurrent();
    setBusy(false);
    if (current?.status === 'PAID') return;
    setPayment(null);
    setError(null);
    setAttempt((a) => a + 1);
  };

  const handleCheckNow = async () => {
    if (!payment) return;
    setChecking(true);
    try {
      const p = await payosService.get(payment.orderCode);
      apply(p);
      if (p.status === 'PENDING') message.info('payOS chưa ghi nhận giao dịch. Vui lòng đợi vài giây rồi thử lại.');
    } catch (err) {
      message.error(errText(err, 'Không kiểm tra được trạng thái thanh toán.'));
    } finally {
      setChecking(false);
    }
  };

  const copyLink = async () => {
    if (!payment?.checkoutUrl) return;
    try {
      await navigator.clipboard.writeText(payment.checkoutUrl);
      message.success('Đã sao chép link payOS');
    } catch {
      message.error('Không sao chép được link.');
    }
  };

  const status = payment?.status;
  const expiredLocally = status === 'PENDING' && secondsLeft <= 0;
  const shownAmount = payment?.amount ?? amount;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-[1100px] max-h-[96vh] overflow-y-auto rounded-3xl bg-[#f1f4f9] p-4 space-y-3">
        <button
          type="button"
          onClick={() => void handleClose()}
          disabled={busy}
          aria-label="Đóng"
          className="absolute right-4 top-4 h-9 w-9 rounded-full bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center cursor-pointer"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />}
        </button>

        {/* Tiêu đề */}
        <div className={`${cardCls} px-6 py-4`}>
          <div className="text-[12px] font-semibold tracking-[0.2em] text-[#8a97a8] uppercase">Thanh toán payOS</div>
          <h2 className="mt-0.5 text-[24px] font-bold text-[#1e2a3b]">Quét mã QR để thanh toán</h2>
          <p className="mt-1 text-[14px] text-[#677484]">Mở app ngân hàng hỗ trợ VietQR, quét mã và hoàn tất thanh toán.</p>
        </div>

        {error ? (
          <div className={`${cardCls} px-6 py-10 text-center space-y-3`}>
            {alreadyPaid ? (
              <CheckCircle2 size={32} className="mx-auto text-[#16a34a]" />
            ) : (
              <AlertTriangle size={28} className="mx-auto text-[#fb2c36]" />
            )}
            <p className="text-[14px] text-[#15171a]">{error}</p>
            {!alreadyPaid && (
              <button type="button" onClick={() => setAttempt((a) => a + 1)} className={`${pillBtnCls} bg-[#0070f4] hover:bg-[#005ac3] text-white`}>
                <RefreshCcw size={15} /> Thử lại
              </button>
            )}
          </div>
        ) : !payment ? (
          <div className={`${cardCls} px-6 py-16 flex items-center justify-center gap-2 text-[#677484]`}>
            <Loader2 size={18} className="animate-spin text-[#0070f4]" /> Đang tạo mã QR thanh toán...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr] gap-3">
            {/* Cột trái: QR */}
            <div className={`${cardCls} p-4 space-y-3 bg-[#f8fafc]`}>
              <div className={`${cardCls} flex items-center gap-3 px-4 py-3`}>
                <span className="shrink-0 h-10 w-10 rounded-full bg-[#facc15] text-[#1e2a3b] text-[13px] font-bold flex items-center justify-center">QR</span>
                <p className="text-[14px] text-[#475467]">
                  Mở app ngân hàng → Quét QR → Kiểm tra số tiền <b className="text-[#15171a]">{fmt(shownAmount)}₫</b> và xác nhận.
                </p>
              </div>

              <div className={`${cardCls} relative flex flex-col items-center gap-2.5 px-4 py-4`}>
                <div className={status === 'PENDING' && !expiredLocally ? '' : 'opacity-15'}>
                  <QRCode value={payment.qrCode || payment.checkoutUrl || ' '} size={220} bordered={false} errorLevel="M" />
                </div>
                {status === 'PENDING' && !expiredLocally && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#fecaca] bg-[#fef2f2] px-3 py-1 text-[13px] font-semibold text-[#dc2626]">
                    <Clock size={14} /> Hiệu lực QR còn lại: {mmss(secondsLeft)}
                  </span>
                )}

                {status === 'PAID' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
                    <CheckCircle2 size={56} className="text-[#16a34a]" />
                    <div className="text-[20px] font-bold text-[#16a34a]">Đã thanh toán thành công</div>
                    <div className="text-[14px] text-[#475467]">
                      payOS xác nhận đã nhận <b>{fmt(payment.paidAmount ?? payment.amount)}₫</b>
                      {payment.payosReference ? ` · Mã GD ${payment.payosReference}` : ''}
                    </div>
                  </div>
                )}
                {(status === 'CANCELLED' || status === 'EXPIRED' || expiredLocally) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
                    <div className="text-[18px] font-bold text-[#475467]">{status === 'CANCELLED' ? 'QR đã bị hủy' : 'QR đã hết hiệu lực'}</div>
                    <button type="button" onClick={() => void handleNewQr()} className={`${pillBtnCls} bg-[#0070f4] hover:bg-[#005ac3] text-white`}>
                      <RefreshCcw size={15} /> Tạo QR mới
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`${cardCls} px-4 py-3`}>
                  <div className="text-[11px] font-semibold tracking-wide text-[#677484] uppercase">Mã đơn hàng</div>
                  <div className="mt-1 text-[18px] font-bold text-[#15171a] break-all">{payment.referenceCode || payment.orderCode}</div>
                  {payment.referenceCode && <div className="mt-0.5 text-[11px] text-[#8a97a8]">Mã GD payOS {payment.orderCode}</div>}
                </div>
                <div className={`${cardCls} px-4 py-3`}>
                  <div className="text-[11px] font-semibold tracking-wide text-[#677484] uppercase">Số tiền</div>
                  <div className="mt-1 text-[18px] font-bold text-[#16a34a]">{fmt(shownAmount)}₫</div>
                </div>
              </div>
            </div>

            {/* Cột phải: chuyển khoản thủ công */}
            <div className={`${cardCls} p-4 space-y-2.5 bg-[#f8fafc]`}>
              <div className="text-[14px] font-bold text-[#1e2a3b]">Hoặc chuyển khoản thủ công</div>
              <CopyRow label="Ngân hàng" value={payment.bankName ?? payment.bin ?? ''} />
              <CopyRow label="Chủ tài khoản" value={payment.accountName ?? ''} />
              <CopyRow label="Số tài khoản" value={payment.accountNumber ?? ''} />
              <CopyRow label="Số tiền" value={String(Math.round(shownAmount))} display={`${fmt(shownAmount)}₫`} />
              <CopyRow label="Nội dung" value={payment.description} />
              <div className="rounded-2xl border border-[#fde68a] bg-[#fffbeb] px-4 py-3 text-[13px] text-[#92400e]">
                <div className="font-bold">⚠️ Lưu ý</div>
                <p className="mt-0.5">
                  Nhập <b>chính xác</b> số tiền và nội dung chuyển khoản để hệ thống tự động ghi nhận.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Thao tác */}
        <div className="flex flex-wrap items-center gap-3">
          {status === 'PAID' || alreadyPaid ? (
            <button type="button" onClick={onClose} className={`${pillBtnCls} bg-[#16a34a] hover:bg-[#15803d] text-white`}>
              <CheckCircle2 size={16} /> Hoàn tất
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleCheckNow()}
              disabled={!payment || status !== 'PENDING' || checking}
              className={`${pillBtnCls} bg-[#0070f4] hover:bg-[#005ac3] text-white`}
            >
              {checking && <Loader2 size={15} className="animate-spin" />} Tôi đã thanh toán xong
            </button>
          )}
          <button
            type="button"
            onClick={() => void copyLink()}
            disabled={!payment?.checkoutUrl}
            className={`${pillBtnCls} bg-[#e8eef7] hover:bg-[#dbe4f1] text-[#15171a]`}
          >
            Sao chép link payOS <Copy size={15} />
          </button>
          {status !== 'PAID' && !alreadyPaid && (
            <button
              type="button"
              onClick={() => void handleNewQr()}
              disabled={busy || !payment}
              className={`${pillBtnCls} bg-white border border-slate-300 hover:bg-slate-50 text-[#15171a]`}
            >
              Tạo QR mới
            </button>
          )}
        </div>

        <div className={`${cardCls} flex items-center gap-2 px-5 py-3 text-[13px] text-[#677484]`}>
          <Clock size={14} /> Tiền chuyển khoản được điền vào {referenceType === 'POS_BOOKING' ? 'đơn đặt hàng' : 'hóa đơn'}{' '}
          <b className="text-[#15171a]">ngay lập tức</b> sau khi payOS xác nhận thành công.
        </div>
      </div>
    </div>
  );
}
