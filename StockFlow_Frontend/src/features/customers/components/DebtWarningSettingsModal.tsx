// src/features/customers/components/DebtWarningSettingsModal.tsx
// Popup "Thiết lập cảnh báo công nợ khách hàng" (Manager / Kế toán trưởng / Admin) — mở từ màn Khách hàng.
// Số tiền nợ / số ngày nợ chỉ là ngưỡng CẢNH BÁO chung, không thay hạn mức riêng của từng khách.

'use client';

import React, { useEffect, useState } from 'react';
import { Info, Loader2, X } from 'lucide-react';
import { customerService } from '../services/customerService';
import type { DebtDaysFrom, DebtWarningSettings } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Gọi sau khi lưu thành công (cha tải lại danh sách để cập nhật cảnh báo) */
  onSaved?: (settings: DebtWarningSettings) => void;
}

const fmt = new Intl.NumberFormat('en-US');
const digitsOnly = (v: string) => v.replace(/\D/g, '');

const inputCls =
  'h-9 rounded-[8px] border border-slate-300 bg-white px-3 text-[13px] outline-none focus:border-[#0070f4] disabled:bg-[#f7f8f9] disabled:text-[#677484]';
const checkboxCls = 'h-4 w-4 rounded accent-[#0070f4] cursor-pointer disabled:cursor-not-allowed';

function Hint({ text }: { text: string }) {
  return (
    <span title={text} className="inline-flex text-[#677484] cursor-help">
      <Info size={13} />
    </span>
  );
}

export function DebtWarningSettingsModal({ open, onClose, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [amountOn, setAmountOn] = useState(true);
  const [amount, setAmount] = useState('10000000');
  const [daysOn, setDaysOn] = useState(false);
  const [days, setDays] = useState('15');
  const [daysFrom, setDaysFrom] = useState<DebtDaysFrom>('FIRST_DEBT');
  const [allowOver, setAllowOver] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setLoading(true);
    customerService
      .getDebtWarningSettings()
      .then((s) => {
        setAmountOn(s.enableDebtAmountWarning);
        setAmount(String(Math.round(s.debtAmountThreshold || 0)));
        setDaysOn(s.enableDebtDaysWarning);
        setDays(String(s.debtDaysThreshold || 0));
        setDaysFrom(s.debtDaysFrom === 'LAST_TRANSACTION' ? 'LAST_TRANSACTION' : 'FIRST_DEBT');
        setAllowOver(s.allowDebtOverLimit);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Không tải được thiết lập.'))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, saving, onClose]);

  if (!open) return null;

  const handleSave = async () => {
    const amountNum = Number(amount || 0);
    const daysNum = Number(days || 0);
    if (amountOn && amountNum <= 0) return setError('Vui lòng nhập số tiền nợ lớn hơn 0.');
    if (daysOn && daysNum <= 0) return setError('Vui lòng nhập số ngày nợ lớn hơn 0.');

    setSaving(true);
    setError(null);
    try {
      const saved = await customerService.updateDebtWarningSettings({
        enableDebtAmountWarning: amountOn,
        debtAmountThreshold: amountNum,
        enableDebtDaysWarning: daysOn,
        debtDaysThreshold: daysNum,
        debtDaysFrom: daysFrom,
        allowDebtOverLimit: allowOver,
      });
      onSaved?.(saved);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Lưu thiết lập thất bại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-[640px] w-full flex flex-col animate-in fade-in zoom-in-95 duration-150 text-[13px] text-[#15171a]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-bold">Thiết lập cảnh báo công nợ khách hàng</h3>
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
        <div className="px-6 pb-5 space-y-5">
          {loading ? (
            <div className="py-10 flex justify-center text-[#677484]">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <p className="font-semibold">Hiển thị cảnh báo nếu vượt quá hạn mức</p>

                {/* Số tiền nợ */}
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 w-[130px] cursor-pointer">
                    <input type="checkbox" checked={amountOn} onChange={(e) => setAmountOn(e.target.checked)} className={checkboxCls} />
                    <span>Số tiền nợ</span>
                    <Hint text="Cảnh báo khi dư nợ hiện tại của khách lớn hơn hoặc bằng số tiền này. Không thay hạn mức riêng của từng khách." />
                  </label>
                  <input
                    inputMode="numeric"
                    value={amount ? fmt.format(Number(amount)) : ''}
                    onChange={(e) => setAmount(digitsOnly(e.target.value).slice(0, 12))}
                    disabled={!amountOn}
                    className={`${inputCls} w-[150px] text-right`}
                  />
                </div>

                {/* Số ngày nợ */}
                <div className="flex items-center gap-3 flex-wrap">
                  <label className="flex items-center gap-2 w-[130px] cursor-pointer">
                    <input type="checkbox" checked={daysOn} onChange={(e) => setDaysOn(e.target.checked)} className={checkboxCls} />
                    <span>Số ngày nợ</span>
                    <Hint text="Cảnh báo khi khách còn nợ quá số ngày này, tính từ mốc bên phải." />
                  </label>
                  <div
                    className={`flex items-center h-9 w-[150px] rounded-[8px] border border-slate-300 overflow-hidden ${
                      daysOn ? 'bg-white' : 'bg-[#f7f8f9]'
                    }`}
                  >
                    <input
                      inputMode="numeric"
                      value={days}
                      onChange={(e) => setDays(digitsOnly(e.target.value).slice(0, 4))}
                      disabled={!daysOn}
                      className="flex-1 min-w-0 h-full px-3 bg-transparent outline-none disabled:text-[#677484]"
                    />
                    <span className="px-3 h-full flex items-center border-l border-slate-200 text-[#677484]">ngày</span>
                  </div>
                  <span className="text-[#677484]">tính từ</span>
                  <select
                    value={daysFrom}
                    onChange={(e) => setDaysFrom(e.target.value as DebtDaysFrom)}
                    disabled={!daysOn}
                    className={`${inputCls} w-[200px] cursor-pointer`}
                  >
                    <option value="FIRST_DEBT">Giao dịch nợ đầu tiên</option>
                    <option value="LAST_TRANSACTION">Giao dịch cuối cùng</option>
                  </select>
                </div>
              </section>

              <section className="space-y-2.5">
                <p className="font-semibold">Tùy chọn khác</p>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowOver}
                    onChange={(e) => setAllowOver(e.target.checked)}
                    className={`${checkboxCls} mt-0.5`}
                  />
                  <span>
                    Cho phép khách hàng nợ thêm khi vượt quá hạn mức
                    <span className="block text-[12px] text-[#677484]">
                      Bật: bán hàng chỉ cảnh báo, không cần gửi yêu cầu duyệt vượt hạn mức. Tắt: chặn và phải gửi yêu cầu duyệt.
                    </span>
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-not-allowed" title="Khách lẻ luôn phải thanh toán đủ 100% (PAY-009)">
                  <input type="checkbox" checked readOnly disabled className={checkboxCls} />
                  <span className="text-[#677484]">Không ghi nhận công nợ cho khách lẻ</span>
                </label>
              </section>

              {error && <p className="text-[12px] text-[#fb2c36]">{error}</p>}
            </>
          )}
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
            disabled={saving || loading}
            className="inline-flex items-center px-5 h-9 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
