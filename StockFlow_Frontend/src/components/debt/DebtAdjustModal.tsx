'use client';

// Modal "Điều chỉnh" công nợ (theo mẫu KiotViet) — dùng chung cho Khách hàng và Nhà cung cấp:
// "Giá trị nợ điều chỉnh" = công nợ SAU điều chỉnh:
//   Khách hàng (nợ cần thu): dương = khách nợ cửa hàng; âm = cửa hàng nợ khách; 0 = hết nợ.
//   Nhà cung cấp (nợ cần trả): dương = cửa hàng nợ NCC; âm = NCC nợ cửa hàng; 0 = hết nợ.
//   Sổ công nợ ghi dòng "Điều chỉnh" với Giá trị = chênh lệch (sau − trước), Dư nợ = giá trị nhập.
// - Tạo mới (nút Điều chỉnh): ghi phiếu DC....
// - Mở phiếu (bấm mã DC... ở sổ công nợ): xem / sửa giá trị nợ sau phiếu, ngày, mô tả; Xóa phiếu.
// Các lời gọi API do màn gọi truyền vào (customerService / supplierService).

import React, { useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { Info, Loader2, X } from 'lucide-react';
import { toLocalDatetimeInputString } from '@/features/transfers/utils/dateUtils';
import type { DebtAdjustApi, DebtAdjustmentDetail, DebtAdjustPayload } from './types';

/** Khách hàng: nợ cần thu; Nhà cung cấp: nợ cần trả */
export type DebtPartnerKind = 'customer' | 'supplier';

const TEXT: Record<DebtPartnerKind, { current: string; positive: string; negative: string; hint: string }> = {
  customer: {
    current: 'Nợ cần thu hiện tại',
    positive: 'Khách nợ cửa hàng',
    negative: 'Cửa hàng nợ khách',
    hint: 'Đặt Nợ cần thu của khách bằng giá trị nhập: dương = khách nợ cửa hàng, âm = cửa hàng nợ khách, 0 = hết nợ. Hệ thống ghi phiếu điều chỉnh DC... vào sổ công nợ.',
  },
  supplier: {
    current: 'Nợ cần trả hiện tại',
    positive: 'Cửa hàng nợ nhà cung cấp',
    negative: 'Nhà cung cấp nợ cửa hàng',
    hint: 'Đặt Nợ cần trả nhà cung cấp bằng giá trị nhập: dương = cửa hàng nợ NCC, âm = NCC nợ cửa hàng, 0 = hết nợ. Hệ thống ghi phiếu điều chỉnh DC... vào sổ công nợ.',
  },
};

interface Props {
  kind: DebtPartnerKind;
  currentDebt: number;
  /** Có mã = mở phiếu điều chỉnh đã có (sửa / xóa); không có = tạo mới */
  code?: string | null;
  api: DebtAdjustApi;
  onClose: () => void;
  /** Gọi sau khi tạo / sửa / xóa thành công để tải lại công nợ */
  onSuccess: () => void;
}

const fmt = (v: number) => Math.round(v).toLocaleString('vi-VN');
const inputCls =
  'w-full h-9 px-3 rounded-[8px] border border-slate-300 bg-white text-[13px] focus:border-[#0070f4] focus:outline-none';

/** Định dạng số có dấu: -2480000 → "-2.480.000" */
const toText = (n: number) => `${n < 0 ? '-' : ''}${Math.abs(Math.round(n)).toLocaleString('vi-VN')}`;

/** "-2.480.000" → -2480000; chỉ giữ chữ số và dấu trừ đứng đầu. Rỗng / chỉ "-" → null */
function parseSigned(text: string): number | null {
  const neg = text.trim().startsWith('-');
  const digits = text.replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return neg ? -n : n;
}

export default function DebtAdjustModal({ kind, currentDebt, code, api, onClose, onSuccess }: Props) {
  const t = TEXT[kind];
  const isEdit = Boolean(code);
  const [loaded, setLoaded] = useState<DebtAdjustmentDetail | null>(null);
  const [text, setText] = useState('');
  // Giờ mặc định lúc mở form (chỉ đến phút); không đổi thì khi lưu gửi trống để server lấy giờ thật (đến giây)
  const [initialDate] = useState(() => toLocalDatetimeInputString(new Date()));
  const [adjustDate, setAdjustDate] = useState(initialDate);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const loading = isEdit && !loaded;
  // Giữ onClose / api mới nhất mà không làm effect tải phiếu chạy lại mỗi lần cha render
  const onCloseRef = useRef(onClose);
  const apiRef = useRef(api);
  useEffect(() => {
    onCloseRef.current = onClose;
    apiRef.current = api;
  });

  // Mở phiếu có sẵn: tải giá trị nợ sau phiếu, ngày, người tạo, mô tả
  useEffect(() => {
    if (!code) return;
    let alive = true;
    apiRef.current
      .get(code)
      .then((d) => {
        if (!alive) return;
        setLoaded(d);
        setText(toText(d.debtAfter));
        setAdjustDate(toLocalDatetimeInputString(d.adjustDate ?? new Date()));
        setDescription(d.description ?? '');
      })
      .catch((err: unknown) => {
        if (!alive) return;
        message.error(err instanceof Error ? err.message : 'Không tải được phiếu điều chỉnh.');
        onCloseRef.current();
      });
    return () => {
      alive = false;
    };
  }, [code]);

  /** Giá trị nợ điều chỉnh = công nợ sau điều chỉnh (0 = hết nợ) */
  const value = parseSigned(text);
  /** Công nợ hiện tại thay đổi: tạo mới = giá trị − nợ hiện tại; sửa phiếu = giá trị mới − giá trị đang lưu của phiếu */
  const debtChange = value === null ? 0 : value - (isEdit ? (loaded?.debtAfter ?? 0) : currentDebt);
  const dateChanged = isEdit && loaded && toLocalDatetimeInputString(loaded.adjustDate ?? new Date()) !== adjustDate;
  const descChanged = isEdit && loaded && (loaded.description ?? '') !== description.trim();
  const canSubmit = value !== null && !busy && !loading && (debtChange !== 0 || Boolean(dateChanged) || Boolean(descChanged));

  const handleText = (raw: string) => {
    const neg = raw.trim().startsWith('-');
    const digits = raw.replace(/\D/g, '');
    setText(digits ? `${neg ? '-' : ''}${Number(digits).toLocaleString('vi-VN')}` : neg ? '-' : '');
  };

  const submit = async () => {
    if (value === null) return message.warning('Nhập giá trị nợ điều chỉnh.');
    if (!isEdit && debtChange === 0) return message.warning(`Giá trị nợ điều chỉnh bằng ${t.current.toLowerCase()}.`);
    if (adjustDate && new Date(adjustDate).getTime() > Date.now() + 60_000)
      return message.warning('Không được điều chỉnh với thời gian trong tương lai.');
    const payload: DebtAdjustPayload = {
      newDebt: value,
      // Không đổi giờ → gửi trống: tạo mới lấy giờ thật lúc lưu, sửa phiếu giữ nguyên giờ cũ (đến giây) để sổ không đổi thứ tự
      adjustDate:
        !adjustDate || (isEdit ? !dateChanged : adjustDate === initialDate) ? null : new Date(adjustDate).toISOString(),
      description: description.trim() || null,
    };
    setBusy(true);
    try {
      if (isEdit && code) {
        await api.update(code, payload);
        message.success(`Đã cập nhật phiếu điều chỉnh ${code}`);
      } else {
        const res = await api.create(payload);
        message.success(`Đã tạo phiếu điều chỉnh ${res.code}: nợ ${fmt(res.oldDebt)} → ${fmt(res.newDebt)}`);
      }
      onSuccess();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không điều chỉnh được công nợ.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!code) return;
    setBusy(true);
    try {
      await api.cancel(code);
      message.success(`Đã xóa phiếu điều chỉnh ${code}`);
      onSuccess();
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không xóa được phiếu điều chỉnh.');
    } finally {
      setBusy(false);
    }
  };

  const outlineBtn =
    'inline-flex items-center px-4 h-9 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[560px] text-[13px] text-[#15171a] animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-bold leading-tight flex items-center gap-2">
            Điều chỉnh
            <span className="text-[#677484]" title={t.hint}>
              <Info size={16} />
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="p-1.5 rounded-[8px] hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-10 flex items-center justify-center gap-2 text-[#677484]">
            <Loader2 size={16} className="animate-spin text-[#0070f4]" /> Đang tải phiếu điều chỉnh...
          </div>
        ) : (
          <div className="px-6 pb-5 space-y-3">
            <div className="grid grid-cols-[150px_1fr] items-center gap-3">
              {isEdit ? (
                <>
                  <span className="text-[#677484]">Mã</span>
                  <span className="font-medium">{code}</span>
                </>
              ) : (
                <>
                  <span className="text-[#677484]">{t.current}</span>
                  <span className={`font-semibold ${currentDebt !== 0 ? 'text-[#fb2c36]' : ''}`}>{fmt(currentDebt)}</span>
                </>
              )}

              <label htmlFor="adjust-value" className="text-[#677484]">Giá trị nợ điều chỉnh</label>
              <input
                id="adjust-value"
                type="text"
                inputMode="numeric"
                autoFocus
                value={text}
                onChange={(e) => handleText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && canSubmit && void submit()}
                className={`${inputCls} text-right`}
              />

              <label htmlFor="adjust-date" className="text-[#677484]">Ngày điều chỉnh</label>
              <input
                id="adjust-date"
                type="datetime-local"
                value={adjustDate}
                max={toLocalDatetimeInputString(new Date())}
                onChange={(e) => setAdjustDate(e.target.value)}
                className={inputCls}
              />

              {isEdit && (
                <>
                  <span className="text-[#677484]">Người tạo</span>
                  <span>{loaded?.createdByName || '—'}</span>
                </>
              )}

              <label htmlFor="adjust-desc" className="text-[#677484]">Mô tả</label>
              <input
                id="adjust-desc"
                type="text"
                maxLength={500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputCls}
              />
            </div>

            {value !== null && debtChange !== 0 && (
              <div className="rounded-[8px] bg-[#f7f8f9] px-3 py-2 text-[12px] text-[#677484]">
                Chênh lệch ghi vào sổ công nợ:{' '}
                <strong className={debtChange > 0 ? 'text-[#fb2c36]' : 'text-[#16a34a]'}>
                  {debtChange > 0 ? '+' : ''}
                  {fmt(debtChange)}
                </strong>
                {' · '}
                {value > 0 ? `${t.positive} ${fmt(value)}` : value < 0 ? `${t.negative} ${fmt(-value)}` : 'Hết nợ'}
              </div>
            )}

            {confirmDelete && loaded && (
              <div className="rounded-[8px] border border-[#fecaca] bg-[#fef2f2] px-3 py-2 text-[12px] text-[#b91c1c]">
                Xóa phiếu <strong>{code}</strong>? Công nợ hiện tại sẽ {loaded.amount > 0 ? 'giảm' : 'tăng'}{' '}
                <strong>{fmt(Math.abs(loaded.amount))}</strong>.
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 px-6 py-4 border-t border-slate-200">
          <div>
            {isEdit && !loading && (
              <button
                type="button"
                onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}
                disabled={busy}
                className={`${outlineBtn} ${confirmDelete ? 'border-[#fb2c36] text-[#fb2c36]' : ''}`}
              >
                {confirmDelete ? 'Xác nhận xóa' : 'Xóa'}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => (confirmDelete ? setConfirmDelete(false) : onClose())}
              disabled={busy}
              className={outlineBtn}
            >
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!canSubmit || confirmDelete}
              className="inline-flex items-center gap-1.5 px-4 h-9 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy && <Loader2 size={14} className="animate-spin" />}
              Cập nhật
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
