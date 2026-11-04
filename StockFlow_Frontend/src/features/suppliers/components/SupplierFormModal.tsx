'use client';

// Form Thêm / Cập nhật Nhà cung cấp — modal tự dựng (không dùng antd Modal theo AI_CODING_RULES §5),
// cùng ngôn ngữ giao diện với các form của màn hình Chuyển hàng.

import React, { useState, useEffect } from 'react';
import { message } from 'antd';
import { Building2, X } from 'lucide-react';
import { Supplier, CreateSupplierPayload, UpdateSupplierPayload } from '../types';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
  onSaveCreate: (payload: CreateSupplierPayload) => Promise<Supplier>;
  onSaveUpdate: (id: number, payload: UpdateSupplierPayload) => Promise<Supplier>;
}

const labelCls = 'block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide';
const inputCls =
  'w-full h-8 px-2.5 rounded-[8px] border border-slate-300 bg-white text-[13px] text-[#15171a] placeholder-[#677484]/70 focus:outline-none focus:border-[#0070f4] transition';

export default function SupplierFormModal({
  isOpen,
  onClose,
  onSuccess,
  supplier,
  onSaveCreate,
  onSaveUpdate,
}: SupplierFormModalProps) {
  const isEditing = Boolean(supplier);

  // Khởi tạo từ supplier đang sửa. Component được mount lại (key) mỗi lần mở form nên không cần effect đồng bộ.
  const [code, setCode] = useState(supplier?.code ?? '');
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const [email, setEmail] = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [payableAmount, setPayableAmount] = useState<number>(supplier?.currentPayable ?? 0);
  const [isActive, setIsActive] = useState<boolean>(supplier ? supplier.status !== 'INACTIVE' : true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    if (!name.trim()) {
      setErrorMessage('Tên nhà cung cấp không được để trống.');
      return;
    }
    if (phone.trim() && phone.trim().length > 11) {
      setErrorMessage('Số điện thoại tối đa 11 ký tự.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage('Địa chỉ email không đúng định dạng.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      if (isEditing && supplier) {
        await onSaveUpdate(supplier.partnerId, {
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          currentPayable: payableAmount >= 0 ? payableAmount : 0,
          isActive,
        });
        message.success('Cập nhật thông tin Nhà cung cấp thành công!');
      } else {
        await onSaveCreate({
          code: code.trim() || undefined,
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          initialPayable: 0,
        });
        message.success('Thêm mới Nhà cung cấp thành công!');
      }
      onSuccess();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu dữ liệu.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  // Đóng bằng phím Esc, lưu bằng F9 (giữ phím tắt của form cũ)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
      if (e.key === 'F9') {
        e.preventDefault();
        void handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-in fade-in zoom-in-95 duration-150 text-[13px] text-[#15171a]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[8px] bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="text-[16px] font-bold text-[#15171a] leading-tight">
                {isEditing ? 'Cập nhật nhà cung cấp' : 'Thêm nhà cung cấp'}
              </h3>
              {isEditing && (
                <p className="text-[11px] text-[#677484]">
                  Mã: <strong className="text-[#0070f4] font-mono">{supplier?.code}</strong>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {errorMessage && (
            <div className="px-3 py-2 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] text-[#fb2c36] text-xs">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Mã nhà cung cấp</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isEditing}
                placeholder="Tự động"
                className={`${inputCls} font-mono disabled:bg-[#f7f8f9] disabled:text-[#677484] disabled:cursor-not-allowed`}
              />
            </div>
            <div>
              <label className={labelCls}>
                Tên nhà cung cấp <span className="text-[#fb2c36]">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Bắt buộc"
                autoFocus
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Điện thoại</label>
              <input
                type="text"
                maxLength={11}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className={`${inputCls} font-mono`}
              />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@gmail.com"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Địa chỉ</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Số nhà, đường, quận/huyện, tỉnh/thành phố"
              className={inputCls}
            />
          </div>

          {/* Chỉ khi cập nhật: nợ hiện tại + trạng thái (form tạo mới không nhập nợ đầu kỳ) */}
          {isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className={labelCls}>Nợ cần trả hiện tại</label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={payableAmount}
                  onChange={(e) => setPayableAmount(Number(e.target.value) || 0)}
                  className={`${inputCls} text-right font-mono font-bold`}
                />
              </div>
              <label className="flex items-center gap-2 h-8 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                />
                <span className={`text-xs font-semibold ${isActive ? 'text-[#16a34a]' : 'text-[#677484]'}`}>
                  {isActive ? 'Đang giao dịch' : 'Ngừng giao dịch'}
                </span>
              </label>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200 bg-[#f7f8f9] rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex items-center px-3.5 h-8 rounded-[8px] border border-slate-300 hover:bg-white text-[#15171a] text-[13px] font-medium transition cursor-pointer bg-white disabled:opacity-50"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={loading}
            className="inline-flex items-center px-4 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
