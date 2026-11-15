// src/features/customers/components/CreditLimitAdjustModal.tsx
// Popup "Điều chỉnh hạn mức công nợ" — Manager (Kế toán trưởng) đổi hạn mức của một hoặc nhiều khách.
// - Một khách: nhập hạn mức mới.
// - Nhiều khách: đặt cố định / tăng-giảm theo % / về hạn mức mặc định, có bảng xem trước.
// Không được đặt hạn mức thấp hơn dư nợ hiện tại: khách vi phạm được đánh dấu và backend bỏ qua.

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { customerService } from '../services/customerService';
import type { BatchCreditLimitResult, CreditLimitBatchMode, Customer } from '../types';

interface Props {
  open: boolean;
  customers: Customer[];
  onClose: () => void;
  /** Gọi sau khi lưu (cha tải lại danh sách) */
  onSaved: (result: BatchCreditLimitResult) => void;
}

const fmt = new Intl.NumberFormat('vi-VN');
const digitsOnly = (v: string) => v.replace(/\D/g, '');
const MAX_LIMIT = 999_999_999_999;

const inputCls =
  'h-9 rounded-[8px] border border-slate-300 bg-white px-3 text-[13px] outline-none focus:border-[#0070f4] disabled:bg-[#f7f8f9] disabled:text-[#677484]';

/** Khớp CreditLimitChanger.RoundToThousand ở backend */
const roundToThousand = (v: number) => Math.round(v / 1000) * 1000;

type RowStatus = 'ok' | 'same' | 'belowDebt' | 'invalid';

export function CreditLimitAdjustModal(props: Props) {
  if (!props.open) return null;
  return <CreditLimitAdjustBody {...props} />;
}

function CreditLimitAdjustBody({ customers, onClose, onSaved }: Props) {
  const single = customers.length === 1;
  const [mode, setMode] = useState<CreditLimitBatchMode>('SET');
  const [amount, setAmount] = useState(single ? String(Math.round(customers[0].creditLimit || 0)) : '');
  const [percent, setPercent] = useState('10');
  const [percentSign, setPercentSign] = useState<1 | -1>(1);
  const [reason, setReason] = useState('');
  const [defaultLimit, setDefaultLimit] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stale = false;
    customerService
      .getDebtWarningSettings()
      .then((s) => !stale && setDefaultLimit(s.defaultCreditLimit))
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [saving, onClose]);

  const percentValue = percentSign * Number(percent || 0);

  const computeNew = (oldLimit: number): number | null => {
    if (mode === 'SET') return amount === '' ? null : Number(amount);
    if (mode === 'PERCENT') return percent === '' ? null : roundToThousand(oldLimit * (1 + percentValue / 100));
    return defaultLimit;
  };

  const rows = useMemo(
    () =>
      customers.map((c) => {
        const newLimit = computeNew(c.creditLimit || 0);
        let status: RowStatus = 'ok';
        if (newLimit === null || newLimit < 0 || newLimit > MAX_LIMIT) status = 'invalid';
        else if (newLimit === (c.creditLimit || 0)) status = 'same';
        else if (newLimit < (c.currentDebt || 0)) status = 'belowDebt';
        return { c, newLimit, status };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customers, mode, amount, percent, percentSign, defaultLimit]
  );
  const okCount = rows.filter((r) => r.status === 'ok').length;

  const handleSave = async () => {
    if (!reason.trim()) return setError('Vui lòng nhập lý do điều chỉnh hạn mức.');
    if (mode === 'PERCENT' && (percentValue === 0 || percentValue <= -100 || percentValue > 1000))
      return setError('Tỷ lệ điều chỉnh phải khác 0, lớn hơn -100% và không quá 1000%.');
    if (okCount === 0) {
      const first = rows[0];
      if (single && first.status === 'belowDebt')
        return setError(`Hạn mức mới thấp hơn dư nợ hiện tại (${fmt.format(first.c.currentDebt)} đ). Không được hạ hạn mức xuống dưới dư nợ.`);
      if (single && first.status === 'same') return setError('Hạn mức mới trùng với hạn mức hiện tại.');
      return setError('Không có khách nào thay đổi được hạn mức với lựa chọn này.');
    }

    setSaving(true);
    setError(null);
    try {
      let result: BatchCreditLimitResult;
      if (single) {
        const changed = await customerService.updateCreditLimit(customers[0].id, Number(amount), reason.trim());
        result = { updated: [changed], skipped: [] };
      } else {
        const value = mode === 'SET' ? Number(amount) : mode === 'PERCENT' ? percentValue : 0;
        result = await customerService.batchUpdateCreditLimit(
          customers.map((c) => c.id),
          mode,
          value,
          reason.trim()
        );
      }
      onSaved(result);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Điều chỉnh hạn mức thất bại.');
    } finally {
      setSaving(false);
    }
  };

  const statusText = (s: RowStatus) =>
    s === 'ok' ? null : s === 'same' ? 'Không đổi' : s === 'belowDebt' ? 'Thấp hơn dư nợ — bỏ qua' : 'Chưa hợp lệ';

  return (
    <div
      className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-[720px] w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 text-[13px] text-[#15171a]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-bold">
            Điều chỉnh hạn mức công nợ
            {single ? ` — ${customers[0].name}` : ` (${customers.length} khách hàng)`}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-1.5 rounded-full hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-5 space-y-4 overflow-y-auto">
          {single ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[#677484] mb-1">Hạn mức hiện tại</p>
                <p className="font-semibold">{fmt.format(customers[0].creditLimit || 0)} đ</p>
              </div>
              <div>
                <p className="text-[#677484] mb-1">Dư nợ hiện tại</p>
                <p className="font-semibold">{fmt.format(customers[0].currentDebt || 0)} đ</p>
              </div>
              <div className="col-span-2">
                <label className="block mb-1.5">Hạn mức mới</label>
                <AmountInput value={amount} onChange={setAmount} />
                {rows[0].status === 'belowDebt' && (
                  <p className="mt-1 text-[12px] text-[#fb2c36]">
                    Không được thấp hơn dư nợ hiện tại ({fmt.format(customers[0].currentDebt)} đ).
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2.5">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" checked={mode === 'SET'} onChange={() => setMode('SET')} className="accent-[#0070f4]" />
                  <span className="w-[160px]">Đặt hạn mức bằng</span>
                  <AmountInput value={amount} onChange={setAmount} disabled={mode !== 'SET'} />
                </label>
                <label className="flex items-center gap-3 cursor-pointer flex-wrap">
                  <input type="radio" checked={mode === 'PERCENT'} onChange={() => setMode('PERCENT')} className="accent-[#0070f4]" />
                  <span className="w-[160px]">Tăng / giảm theo %</span>
                  <select
                    value={percentSign}
                    onChange={(e) => setPercentSign(Number(e.target.value) as 1 | -1)}
                    disabled={mode !== 'PERCENT'}
                    className={`${inputCls} w-[90px] cursor-pointer`}
                  >
                    <option value={1}>Tăng</option>
                    <option value={-1}>Giảm</option>
                  </select>
                  <div className="flex items-center h-9 w-[110px] rounded-[8px] border border-slate-300 overflow-hidden">
                    <input
                      inputMode="numeric"
                      value={percent}
                      onChange={(e) => setPercent(digitsOnly(e.target.value).slice(0, 4))}
                      disabled={mode !== 'PERCENT'}
                      className="flex-1 min-w-0 h-full px-3 outline-none text-right disabled:bg-[#f7f8f9] disabled:text-[#677484]"
                    />
                    <span className="px-3 h-full flex items-center border-l border-slate-200 text-[#677484]">%</span>
                  </div>
                  <span className="text-[12px] text-[#677484]">(làm tròn tới 1.000 đ)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={mode === 'RESET_DEFAULT'}
                    onChange={() => setMode('RESET_DEFAULT')}
                    className="accent-[#0070f4]"
                  />
                  <span>
                    Về hạn mức mặc định{' '}
                    <span className="text-[#677484]">
                      ({defaultLimit === null ? 'đang tải...' : `${fmt.format(defaultLimit)} đ`})
                    </span>
                  </span>
                </label>
              </div>

              {/* Xem trước */}
              <div className="border border-slate-200 rounded-[10px] overflow-hidden">
                <div className="px-3 py-2 bg-[#f7f8f9] text-[12px] text-[#677484]">
                  Xem trước: <strong className="text-[#15171a]">{okCount}</strong> / {rows.length} khách sẽ được đổi hạn mức
                </div>
                <div className="max-h-[260px] overflow-y-auto">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-white border-b border-slate-200 text-[#677484]">
                      <tr>
                        <th className="text-left font-medium px-3 py-2">Khách hàng</th>
                        <th className="text-right font-medium px-3 py-2">Dư nợ</th>
                        <th className="text-right font-medium px-3 py-2">Hạn mức cũ</th>
                        <th className="text-right font-medium px-3 py-2">Hạn mức mới</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ c, newLimit, status }) => (
                        <tr key={c.id} className={`border-b border-slate-100 ${status === 'ok' ? '' : 'text-[#677484]'}`}>
                          <td className="px-3 py-1.5">
                            <div className="font-medium text-[#15171a]">{c.name}</div>
                            <div>{c.code}</div>
                          </td>
                          <td className="px-3 py-1.5 text-right">{fmt.format(c.currentDebt || 0)}</td>
                          <td className="px-3 py-1.5 text-right">{fmt.format(c.creditLimit || 0)}</td>
                          <td className="px-3 py-1.5 text-right">
                            <div className={status === 'ok' ? 'font-semibold text-[#0070f4]' : ''}>
                              {newLimit === null ? '—' : fmt.format(newLimit)}
                            </div>
                            {statusText(status) && (
                              <div className={status === 'belowDebt' ? 'text-[#fb2c36]' : ''}>{statusText(status)}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block mb-1.5">
              Lý do <span className="text-[#fb2c36]">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              rows={2}
              placeholder="VD: Khách thanh toán đúng hạn 6 tháng gần nhất"
              className="w-full rounded-[8px] border border-slate-300 px-3 py-2 outline-none focus:border-[#0070f4] resize-none"
            />
          </div>

          {error && <p className="text-[12px] text-[#fb2c36]">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center px-4 h-9 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[13px] font-semibold cursor-pointer bg-white disabled:opacity-50"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 h-9 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AmountInput({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div
      className={`flex items-center h-9 w-[200px] rounded-[8px] border border-slate-300 overflow-hidden focus-within:border-[#0070f4] ${
        disabled ? 'bg-[#f7f8f9]' : 'bg-white'
      }`}
    >
      <input
        inputMode="numeric"
        value={value ? fmt.format(Number(value)) : ''}
        onChange={(e) => onChange(digitsOnly(e.target.value).slice(0, 12))}
        disabled={disabled}
        className="flex-1 min-w-0 h-full px-3 bg-transparent outline-none text-right disabled:text-[#677484]"
      />
      <span className="px-3 h-full flex items-center border-l border-slate-200 text-[#677484]">đ</span>
    </div>
  );
}
