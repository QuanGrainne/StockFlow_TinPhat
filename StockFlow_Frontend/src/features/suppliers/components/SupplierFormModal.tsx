'use client';

import React, { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { Supplier, CreateSupplierPayload, UpdateSupplierPayload } from '../types';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  supplier?: Supplier | null;
  onSaveCreate: (payload: CreateSupplierPayload) => Promise<any>;
  onSaveUpdate: (id: number, payload: UpdateSupplierPayload) => Promise<any>;
}

export default function SupplierFormModal({
  isOpen,
  onClose,
  onSuccess,
  supplier,
  onSaveCreate,
  onSaveUpdate,
}: SupplierFormModalProps) {
  const isEditing = Boolean(supplier);

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [payableAmount, setPayableAmount] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (supplier) {
      setCode(supplier.code || '');
      setName(supplier.name || '');
      setPhone(supplier.phone || '');
      setEmail(supplier.email || '');
      setAddress(supplier.address || '');
      setCreditLimit(supplier.creditLimit || 0);
      setPayableAmount(supplier.currentPayable || 0);
      setIsActive(supplier.status !== 'INACTIVE');
    } else {
      setCode('');
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCreditLimit(0);
      setPayableAmount(0);
      setIsActive(true);
    }
    setErrorMessage('');
  }, [supplier, isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

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
          creditLimit: creditLimit >= 0 ? creditLimit : 0,
          currentPayable: payableAmount >= 0 ? payableAmount : 0,
          isActive: isActive,
        });
        message.success('Cập nhật thông tin Nhà cung cấp thành công!');
      } else {
        await onSaveCreate({
          code: code.trim() || undefined,
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          creditLimit: creditLimit >= 0 ? creditLimit : 0,
          initialPayable: payableAmount >= 0 ? payableAmount : 0,
        });
        message.success('Thêm mới Nhà cung cấp thành công!');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Có lỗi xảy ra khi lưu dữ liệu.';
      setErrorMessage(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      zIndex={1050}
      title={
        <div className="text-[17px] font-bold text-slate-900 border-b border-slate-200 pb-3">
          {isEditing ? 'Cập nhật thông tin Nhà cung cấp' : 'Thêm mới Nhà cung cấp'}
        </div>
      }
      footer={
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-[6px] border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition disabled:opacity-50"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={loading}
            className="px-5 py-2 rounded-[6px] bg-[#0071BA] hover:bg-[#005f9d] text-sm font-semibold text-white shadow-xs cursor-pointer transition disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu (F9)'}
          </button>
        </div>
      }
      width={640}
      destroyOnClose
      centered
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-3 text-slate-800">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mã NCC */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã nhà cung cấp
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isEditing}
              placeholder={isEditing ? code : 'Mặc định mã tự động sinh (NCCxxxxxx)'}
              className={`w-full h-9 px-3 border rounded-[6px] text-sm outline-none transition ${
                isEditing
                  ? 'bg-slate-100 text-slate-500 border-slate-300 cursor-not-allowed'
                  : 'bg-white text-slate-800 border-slate-300 focus:border-[#0071BA] focus:ring-1 focus:ring-[#0071BA]'
              }`}
            />
          </div>

          {/* Tên NCC */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên nhà cung cấp <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Công ty Cổ phần Nhựa Tiền Phong"
              required
              className="w-full h-9 px-3 border border-slate-300 rounded-[6px] text-sm text-slate-800 bg-white outline-none focus:border-[#0071BA] focus:ring-1 focus:ring-[#0071BA] transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Số điện thoại */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="text"
              maxLength={11}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="VD: 0987654321"
              className="w-full h-9 px-3 border border-slate-300 rounded-[6px] text-sm text-slate-800 bg-white outline-none focus:border-[#0071BA] focus:ring-1 focus:ring-[#0071BA] transition"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@nhacungcap.vn"
              className="w-full h-9 px-3 border border-slate-300 rounded-[6px] text-sm text-slate-800 bg-white outline-none focus:border-[#0071BA] focus:ring-1 focus:ring-[#0071BA] transition"
            />
          </div>
        </div>

        {/* Địa chỉ */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Địa chỉ
          </label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Số nhà, đường, khu công nghiệp, quận/huyện, tỉnh/thành phố..."
            className="w-full h-9 px-3 border border-slate-300 rounded-[6px] text-sm text-slate-800 bg-white outline-none focus:border-[#0071BA] focus:ring-1 focus:ring-[#0071BA] transition"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Hạn mức nợ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hạn mức nợ (VNĐ)
            </label>
            <input
              type="number"
              min={0}
              step={1000000}
              value={creditLimit}
              onChange={(e) => setCreditLimit(Number(e.target.value) || 0)}
              className="w-full h-9 px-3 border border-slate-300 rounded-[6px] text-sm text-slate-800 bg-white outline-none focus:border-[#0071BA] focus:ring-1 focus:ring-[#0071BA] transition text-right font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Hạn mức tối đa công nợ được phép nợ NCC
            </p>
          </div>

          {/* Công nợ hiện tại / Nợ ban đầu */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isEditing ? 'Nợ cần trả hiện tại (VNĐ)' : 'Nợ ban đầu phải trả (VNĐ)'}
            </label>
            <input
              type="number"
              min={0}
              step={500000}
              value={payableAmount}
              onChange={(e) => setPayableAmount(Number(e.target.value) || 0)}
              className="w-full h-9 px-3 border border-slate-300 rounded-[6px] text-sm text-slate-800 bg-white outline-none focus:border-[#0071BA] focus:ring-1 focus:ring-[#0071BA] transition text-right font-mono text-amber-700 font-semibold"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              {isEditing
                ? 'Dư nợ thực tế cần thanh toán cho nhà cung cấp'
                : 'Số dư nợ kỳ trước chuyển sang (nếu có)'}
            </p>
          </div>
        </div>

        {/* Trạng thái hoạt động (khi cập nhật) */}
        {isEditing && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Trạng thái giao dịch:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="accent-[#0071BA] h-4 w-4 cursor-pointer"
              />
              <span className={`text-xs font-medium ${isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                {isActive ? 'Đang giao dịch' : 'Ngừng giao dịch'}
              </span>
            </label>
          </div>
        )}
      </form>
    </Modal>
  );
}
