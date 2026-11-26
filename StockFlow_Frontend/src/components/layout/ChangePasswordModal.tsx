'use client';

// Form Đổi mật khẩu của chính tài khoản đang đăng nhập (UC-50, BR-35..BR-37).
// Mở từ menu người dùng ở Header. Gọi POST /api/auth/change-password; mọi kiểm tra cuối cùng ở backend,
// phần kiểm tra ở đây chỉ để báo sớm cho người dùng.

import React, { useState } from 'react';
import { Check, CheckCircle2, Eye, EyeOff, KeyRound, X } from 'lucide-react';
import { apiClient, type ApiClientError } from '@/lib/api/client';
import { PASSWORD_RULES, passwordRuleMessage } from '@/lib/auth/passwordPolicy';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

type FieldKey = 'currentPassword' | 'newPassword' | 'confirmNewPassword';

/** Lỗi validate từ backend: { errors: { NewPassword: ["..."] } } */
interface ValidationErrorBody {
  message?: string;
  errors?: Record<string, string[]>;
}

// BR-35: quy tắc độ mạnh mật khẩu dùng chung (lib/auth/passwordPolicy.ts)
const RULES = PASSWORD_RULES;

const FIELD_FROM_SERVER: Record<string, FieldKey> = {
  CurrentPassword: 'currentPassword',
  NewPassword: 'newPassword',
  ConfirmNewPassword: 'confirmNewPassword',
};

const EMPTY = { currentPassword: '', newPassword: '', confirmNewPassword: '' };

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ open, onClose }) => {
  const [values, setValues] = useState<Record<FieldKey, string>>(EMPTY);
  const [visible, setVisible] = useState<Record<FieldKey, boolean>>({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const close = () => {
    setValues(EMPTY);
    setFieldErrors({});
    setFormError('');
    setDone(false);
    onClose();
  };

  const change = (key: FieldKey, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    setFormError('');
  };

  const validate = (): boolean => {
    const errs: Partial<Record<FieldKey, string>> = {};
    if (!values.currentPassword) errs.currentPassword = 'Vui lòng nhập mật khẩu hiện tại.';
    const failed = RULES.find((r) => !r.test(values.newPassword));
    if (!values.newPassword) errs.newPassword = 'Vui lòng nhập mật khẩu mới.';
    else if (failed) errs.newPassword = passwordRuleMessage('Mật khẩu mới', failed);
    else if (values.newPassword === values.currentPassword)
      errs.newPassword = 'Mật khẩu mới không được trùng mật khẩu hiện tại.';
    if (!values.confirmNewPassword) errs.confirmNewPassword = 'Vui lòng nhập lại mật khẩu mới.';
    else if (values.confirmNewPassword !== values.newPassword) errs.confirmNewPassword = 'Xác nhận mật khẩu mới không khớp.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !validate()) return;
    setSubmitting(true);
    try {
      await apiClient.post('/api/auth/change-password', values);
      setDone(true);
    } catch (err) {
      const apiErr = err as ApiClientError;
      const body = apiErr.response as ValidationErrorBody | undefined;
      if (body?.errors && Object.keys(body.errors).length > 0) {
        // Lỗi theo từng ô từ FluentValidation
        const mapped: Partial<Record<FieldKey, string>> = {};
        for (const [name, msgs] of Object.entries(body.errors)) {
          const key = FIELD_FROM_SERVER[name];
          if (key && msgs.length > 0) mapped[key] = msgs[0];
        }
        setFieldErrors(mapped);
        if (Object.keys(mapped).length === 0) setFormError(body.message ?? 'Dữ liệu không hợp lệ.');
      } else {
        // Lỗi nghiệp vụ: sai mật khẩu hiện tại, trùng mật khẩu cũ, tài khoản bị khóa...
        setFormError(apiErr.message || 'Không thể đổi mật khẩu. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (key: FieldKey, label: string, placeholder: string, autoComplete: string) => (
    <div>
      <label htmlFor={`cp-${key}`} className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label} <span className="text-rose-500">*</span>
      </label>
      <div
        className={`flex items-center h-10 px-3 rounded-lg border bg-white transition focus-within:ring-2 ${
          fieldErrors[key]
            ? 'border-rose-400 focus-within:ring-rose-100'
            : 'border-slate-300 focus-within:border-[#0071BA] focus-within:ring-blue-100'
        }`}
      >
        <input
          id={`cp-${key}`}
          type={visible[key] ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={values[key]}
          onChange={(e) => change(key, e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 h-full bg-transparent text-[13px] text-slate-900 placeholder-slate-400 outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => ({ ...v, [key]: !v[key] }))}
          className="p-1 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
          aria-label={visible[key] ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible[key] ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
      {fieldErrors[key] && <p className="mt-1 text-[11px] text-rose-600">{fieldErrors[key]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden relative">
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0071BA] border border-blue-100 flex items-center justify-center shrink-0">
            <KeyRound size={18} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Đổi mật khẩu</h3>
        </div>

        {done ? (
          <div className="px-5 py-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">Đổi mật khẩu thành công</p>
            <p className="mt-1 text-xs text-slate-500">Lần đăng nhập sau hãy dùng mật khẩu mới.</p>
            <button
              type="button"
              onClick={close}
              className="mt-5 px-5 py-2 rounded-lg bg-[#0071BA] hover:bg-[#005f9e] text-xs font-bold text-white transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="flex-1 min-h-0 flex flex-col">
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-3.5">
              {formError && (
                <div className="px-3 py-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">{formError}</div>
              )}
              {renderField('currentPassword', 'Mật khẩu hiện tại', 'Nhập mật khẩu đang dùng', 'current-password')}
              {renderField('newPassword', 'Mật khẩu mới', 'Nhập mật khẩu mới', 'new-password')}

              {/* Gợi ý độ mạnh mật khẩu (BR-35) */}
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 px-1">
                {RULES.map((r) => {
                  const ok = r.test(values.newPassword);
                  return (
                    <li key={r.label} className={`flex items-center gap-1.5 text-[11px] ${ok ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <Check size={12} className={ok ? 'opacity-100' : 'opacity-40'} />
                      {r.label}
                    </li>
                  );
                })}
              </ul>

              {renderField('confirmNewPassword', 'Nhập lại mật khẩu mới', 'Nhập lại mật khẩu mới', 'new-password')}
            </div>

            <div className="shrink-0 px-5 py-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={close}
                className="px-5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-[#0071BA] hover:bg-[#005f9e] text-xs font-bold text-white transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? 'Đang lưu...' : 'Đổi mật khẩu'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
