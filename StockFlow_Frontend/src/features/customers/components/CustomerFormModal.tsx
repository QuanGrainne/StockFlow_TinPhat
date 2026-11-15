'use client';

// Form Tạo / Cập nhật khách hàng — modal tự dựng (không dùng antd Modal theo AI_CODING_RULES §5),
// bố cục theo mẫu: Tên, Mã, Điện thoại 1/2, Sinh nhật, Giới tính, Email, Facebook, Địa chỉ, Hạn mức nợ, Ghi chú.
// Dùng chung cho màn Khách hàng và nút thêm nhanh khách ở POS.

import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, UserRound, X } from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { customerService } from '../services/customerService';
import { CreateCustomerPayload, Customer, CustomerGender } from '../types';

interface CustomerFormModalProps {
  open: boolean;
  /** Khách đang sửa; không truyền = tạo mới */
  customer?: Customer | null;
  onCancel: () => void;
  /** Lưu: nhận dữ liệu form (cha gọi API tạo / cập nhật). Ném lỗi để hiện thông báo trong form. */
  onSuccess: (payload: CreateCustomerPayload) => Promise<void> | void;
}

/** Chỉ dùng khi chưa tải được thiết lập: backend tự gán hạn mức mặc định đang cài */
const FALLBACK_DEFAULT_CREDIT_LIMIT = 200_000_000;

const labelCls = 'block text-[13px] text-[#15171a] mb-1.5';
const inputCls =
  'w-full h-9 px-3 rounded-[8px] border border-slate-300 bg-white text-[13px] text-[#15171a] placeholder-[#677484]/70 focus:outline-none focus:border-[#0070f4] transition';

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({ open, customer, onCancel, onSuccess }) => {
  if (!open) return null;
  // Mount lại mỗi lần mở / đổi khách → state form khởi tạo đúng, không cần effect đồng bộ
  return <CustomerFormBody key={customer?.id ?? 'new'} customer={customer} onCancel={onCancel} onSuccess={onSuccess} />;
};

function CustomerFormBody({
  customer,
  onCancel,
  onSuccess,
}: Omit<CustomerFormModalProps, 'open'>) {
  const isEditing = Boolean(customer);
  const { activeWarehouse } = useActiveWarehouse();

  const [name, setName] = useState(customer?.name ?? '');
  const [code, setCode] = useState(customer?.code ?? '');
  const [phone, setPhone] = useState(customer?.phone ?? '');
  const [phone2, setPhone2] = useState(customer?.phone2 ?? '');
  const [birthDate, setBirthDate] = useState(customer?.birthDate ?? '');
  const [gender, setGender] = useState<CustomerGender | ''>(customer?.gender ?? '');
  const [email, setEmail] = useState(customer?.email ?? '');
  const [facebook, setFacebook] = useState(customer?.facebook ?? '');
  const [address, setAddress] = useState(customer?.address ?? '');
  // Hạn mức chỉ xem trên form: khách mới nhận hạn mức mặc định Manager cài trong "Thiết lập công nợ";
  // đổi hạn mức bằng "Điều chỉnh hạn mức" (Manager) hoặc duyệt yêu cầu hạn mức (UC-64)
  const [defaultLimit, setDefaultLimit] = useState(FALLBACK_DEFAULT_CREDIT_LIMIT);
  useEffect(() => {
    if (isEditing) return;
    let stale = false;
    customerService
      .getDebtWarningSettings()
      .then((s) => {
        if (!stale && typeof s.defaultCreditLimit === 'number') setDefaultLimit(s.defaultCreditLimit);
      })
      .catch(() => undefined);
    return () => {
      stale = true;
    };
  }, [isEditing]);
  const creditLimit = isEditing ? customer?.creditLimit ?? 0 : defaultLimit;
  const [notes, setNotes] = useState(customer?.notes ?? '');
  const [addressOpen, setAddressOpen] = useState(true);
  const [otherOpen, setOtherOpen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (saving) return;
    if (!name.trim()) return setError('Tên khách hàng không được để trống.');
    if (!phone.trim() && !email.trim()) return setError('Cần nhập ít nhất Số điện thoại hoặc Email.');
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Email không đúng định dạng.');
    setSaving(true);
    setError('');
    try {
      await onSuccess({
        code: isEditing ? undefined : code.trim() || undefined,
        name: name.trim(),
        phone: phone.trim(),
        phone2: phone2.trim(),
        email: email.trim(),
        address: address.trim(),
        gender: gender || null,
        birthDate: birthDate || null,
        facebook: facebook.trim(),
        notes: notes.trim(),
        creditLimit,
        status: customer?.status ?? 'ACTIVE',
        createdWarehouseId: isEditing ? undefined : activeWarehouse?.warehouseId ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không lưu được khách hàng.';
      setError(msg.replace(/^CUSTOMER_CODE_EXISTS:/, ''));
    } finally {
      setSaving(false);
    }
  };

  // Esc đóng form, F9 lưu
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onCancel();
      if (e.key === 'F9') {
        e.preventDefault();
        void handleSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div
      className="fixed inset-0 z-[1050] bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150 text-[13px] text-[#15171a]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-[18px] font-bold">{isEditing ? 'Cập nhật khách hàng' : 'Tạo khách hàng'}</h3>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="p-1.5 rounded-full text-[#15171a] hover:bg-[#f7f8f9] cursor-pointer disabled:opacity-50"
            aria-label="Đóng"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-[8px] bg-[#fef2f2] border border-[#fecaca] text-[#fb2c36] text-xs">{error}</div>
          )}

          <div className="flex gap-6">
            <div className="flex-1 grid grid-cols-2 gap-x-4 gap-y-3.5">
              <div>
                <label className={labelCls}>Tên khách hàng</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bắt buộc" autoFocus className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Mã khách hàng</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isEditing}
                  placeholder="Tự động"
                  className={`${inputCls} disabled:bg-[#f7f8f9] disabled:text-[#677484] disabled:cursor-not-allowed`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Điện thoại 1</label>
                  <input value={phone} maxLength={11} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Điện thoại 2</label>
                  <input value={phone2} maxLength={11} onChange={(e) => setPhone2(e.target.value.replace(/\D/g, ''))} className={inputCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Sinh nhật</label>
                  <input type="date" value={birthDate ?? ''} onChange={(e) => setBirthDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Giới tính</label>
                  <div className="relative">
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as CustomerGender | '')}
                      className={`${inputCls} pr-8 appearance-none cursor-pointer`}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="MALE">Nam</option>
                      <option value="FEMALE">Nữ</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@gmail.com" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Facebook</label>
                <input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="facebook.com/username" className={inputCls} />
              </div>
            </div>

            {/* Ảnh đại diện (chưa lưu ảnh khách hàng → chỉ hiển thị biểu tượng) */}
            <div className="hidden sm:flex w-40 h-40 shrink-0 rounded-full border-2 border-dashed border-slate-200 bg-[#f7f8f9] items-center justify-center text-[#94a3b8]">
              <UserRound size={56} strokeWidth={1.5} />
            </div>
          </div>

          {/* Địa chỉ */}
          <div className="rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setAddressOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 font-semibold cursor-pointer"
            >
              <span>Địa chỉ</span>
              {addressOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {addressOpen && (
              <div className="px-4 pb-4">
                <label className={labelCls}>Địa chỉ</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Nhập địa chỉ" className={inputCls} />
              </div>
            )}
          </div>

          {/* Thông tin khác */}
          <div className="rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setOtherOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 font-semibold cursor-pointer"
            >
              <span>Hạn mức nợ & ghi chú</span>
              {otherOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {otherOpen && (
              <div className="px-4 pb-4 grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Hạn mức nợ (VNĐ)</label>
                  <input
                    readOnly
                    value={creditLimit.toLocaleString('vi-VN')}
                    title="Hạn mức do Kế toán trưởng (Manager) điều chỉnh"
                    className={`${inputCls} text-right bg-[#f7f8f9] text-[#677484] cursor-not-allowed`}
                  />
                  <div className="mt-1 text-[11px] text-[#677484]">
                    {isEditing
                      ? 'Đổi hạn mức: Manager dùng "Điều chỉnh hạn mức", hoặc gửi yêu cầu duyệt từ màn Bán hàng.'
                      : 'Mặc định cho khách mới (Manager cài trong Thiết lập công nợ).'}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Ghi chú</label>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ghi chú về khách hàng" className={inputCls} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center px-4 h-9 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[13px] font-semibold cursor-pointer bg-white disabled:opacity-50"
          >
            Bỏ qua
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="inline-flex items-center px-5 h-9 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold shadow-xs cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>
    </div>
  );
}
