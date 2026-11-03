// src/components/manager/screens/CashFlowScreen.tsx
// Sổ quỹ Thu/Chi: Gộp Phiếu thu/chi thành 1 popup "Create Cash Flow Voucher" theo ràng buộc nghiệp vụ

import React, { useState, useEffect } from 'react';
import { CashFlowVoucher, Customer, VoucherType } from '../../../types';
import { managerService } from '../../../services/managerService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import {
  Wallet,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CreditCard,
  Banknote,
  X,
} from 'lucide-react';

export const CashFlowScreen: React.FC = () => {
  const [vouchers, setVouchers] = useState<CashFlowVoucher[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEIPT' | 'PAYMENT'>('ALL');

  // Modal State: Popup gộp Phiếu Thu / Chi
  const [modalOpen, setModalOpen] = useState(false);
  const [formType, setFormType] = useState<VoucherType>('RECEIPT');
  const [formCategory, setFormCategory] = useState('Thu tiền khách hàng');
  const [formPartnerId, setFormPartnerId] = useState('');
  const [formPartnerName, setFormPartnerName] = useState('');
  const [formAmount, setFormAmount] = useState<number>(0);
  const [formMethod, setFormMethod] = useState<'BANK_TRANSFER' | 'CASH'>('BANK_TRANSFER');
  const [formDescription, setFormDescription] = useState('');
  const [formRefDoc, setFormRefDoc] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [vList, cList] = await Promise.all([
        managerService.getCashFlowVouchers(typeFilter),
        managerService.getCustomers(),
      ]);
      setVouchers(vList);
      setCustomers(cList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [typeFilter]);

  const openCreateModal = (defaultType: VoucherType = 'RECEIPT') => {
    setFormType(defaultType);
    setFormCategory(defaultType === 'RECEIPT' ? 'Thu tiền khách hàng' : 'Chi trả NCC');
    setFormPartnerId('');
    setFormPartnerName('');
    setFormAmount(0);
    setFormMethod('BANK_TRANSFER');
    setFormDescription('');
    setFormRefDoc('');
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveVoucher = async () => {
    if (!formAmount || formAmount <= 0) {
      setFormError('Số tiền thu/chi phải lớn hơn 0');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Vui lòng nhập lý do / diễn giải nội dung thu chi');
      return;
    }

    const finalPartnerName =
      formPartnerName ||
      customers.find((c) => c.id === formPartnerId)?.name ||
      'Khách vãng lai / Nội bộ';

    setIsSaving(true);
    setFormError('');

    try {
      await managerService.createCashFlowVoucher({
        type: formType,
        category: formCategory,
        partnerId: formPartnerId || undefined,
        partnerName: finalPartnerName,
        amount: Number(formAmount),
        paymentMethod: formMethod,
        voucherDate: new Date().toLocaleDateString('vi-VN'),
        description: formDescription,
        createdBy: 'Nguyễn Quản Lý (Manager)',
        referenceDoc: formRefDoc,
      });

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi tạo phiếu thu/chi');
    } finally {
      setIsSaving(false);
    }
  };

  const totalReceipts = vouchers
    .filter((v) => v.type === 'RECEIPT')
    .reduce((sum, v) => sum + v.amount, 0);

  const totalPayments = vouchers
    .filter((v) => v.type === 'PAYMENT')
    .reduce((sum, v) => sum + v.amount, 0);

  const columns: Column<CashFlowVoucher>[] = [
    {
      header: 'Mã chứng từ',
      accessor: 'voucherCode',
      width: '130px',
      render: (row) => (
        <span
          className={`font-mono font-bold ${
            row.type === 'RECEIPT' ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {row.voucherCode}
        </span>
      ),
    },
    {
      header: 'Loại phiếu',
      accessor: 'type',
      width: '120px',
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
            row.type === 'RECEIPT'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {row.type === 'RECEIPT' ? (
            <>
              <ArrowDownLeft size={12} /> Phiếu Thu
            </>
          ) : (
            <>
              <ArrowUpRight size={12} /> Phiếu Chi
            </>
          )}
        </span>
      ),
    },
    {
      header: 'Hạng mục & Đối tượng',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.partnerName}</div>
          <div className="text-[11px] text-slate-400">
            {row.category} {row.referenceDoc && `(Ref: ${row.referenceDoc})`}
          </div>
        </div>
      ),
    },
    {
      header: 'Số tiền',
      accessor: 'amount',
      align: 'right',
      width: '150px',
      render: (row) => (
        <span
          className={`text-sm font-bold ${
            row.type === 'RECEIPT' ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {row.type === 'RECEIPT' ? '+' : '-'} {row.amount.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Hình thức',
      accessor: 'paymentMethod',
      width: '120px',
      render: (row) => (
        <span className="text-slate-600 flex items-center gap-1">
          {row.paymentMethod === 'BANK_TRANSFER' ? (
            <>
              <CreditCard size={13} className="text-[#2B6CB0]" /> CK Ngân hàng
            </>
          ) : (
            <>
              <Banknote size={13} className="text-emerald-600" /> Tiền mặt
            </>
          )}
        </span>
      ),
    },
    {
      header: 'Ngày lập',
      accessor: 'voucherDate',
      width: '110px',
      render: (row) => <span className="text-slate-500">{row.voucherDate}</span>,
    },
    {
      header: 'Diễn giải / Ghi chú',
      accessor: 'description',
      render: (row) => (
        <div className="text-slate-600 line-clamp-1" title={row.description}>
          {row.description}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Sổ quỹ Dòng tiền (Cash Flow Vouchers)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gộp màn hình lập Phiếu Thu & Phiếu Chi thành 1 popup duy nhất theo quy tắc nghiệp vụ
          </p>
        </div>

        {/* Nút tạo chứng từ thu chi */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openCreateModal('RECEIPT')}
            className="h-9 px-3.5 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus size={15} />
            <span>+ Lập Phiếu Thu</span>
          </button>
          <button
            type="button"
            onClick={() => openCreateModal('PAYMENT')}
            className="h-9 px-3.5 rounded-[8px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus size={15} />
            <span>- Lập Phiếu Chi</span>
          </button>
        </div>
      </div>

      {/* Cash Flow Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-emerald-50/60 rounded-[8px] border border-emerald-200">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <ArrowDownLeft size={14} /> Tổng tiền thu (Receipts)
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {totalReceipts.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className="p-4 bg-rose-50/60 rounded-[8px] border border-rose-200">
          <div className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <ArrowUpRight size={14} /> Tổng tiền chi (Payments)
          </div>
          <div className="text-xl font-bold text-rose-700 mt-1">
            {totalPayments.toLocaleString('vi-VN')} đ
          </div>
        </div>

        <div className="p-4 bg-blue-50/60 rounded-[8px] border border-blue-200">
          <div className="text-[11px] font-bold text-[#2B6CB0] uppercase tracking-wider flex items-center gap-1">
            <Wallet size={14} /> Dòng tiền thuần (Net Cash Flow)
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1">
            {(totalReceipts - totalPayments).toLocaleString('vi-VN')} đ
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: 'ALL', label: 'Tất cả phiếu' },
          { id: 'RECEIPT', label: 'Phiếu Thu (+)' },
          { id: 'PAYMENT', label: 'Phiếu Chi (-)' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTypeFilter(tab.id as any)}
            className={`px-4 py-2 text-xs font-semibold transition border-b-2 -mb-px cursor-pointer ${
              typeFilter === tab.id
                ? 'border-[#2B6CB0] text-[#2B6CB0]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={vouchers}
        keyField="id"
        isLoading={loading}
        searchPlaceholder="Tìm theo mã chứng từ, tên đối tác hoặc nội dung..."
      />

      {/* ── Modal Lập chứng từ thu chi chuẩn theo thiết kế AI Studio (Ảnh 2 bên trái) ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-5 relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={16} />
            </button>

            {/* Header with $ icon */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-100">
                $
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Lập chứng từ thu chi</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Màn hình 3.2.2.13 • Giảm trừ công nợ tức thì
                </p>
              </div>
            </div>

            {/* Toggle Pills */}
            <div className="bg-slate-100 p-1 rounded-lg flex items-center mb-3.5">
              <button
                type="button"
                onClick={() => {
                  setFormType('RECEIPT');
                  setFormCategory('Thu tiền khách hàng');
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold text-center transition cursor-pointer ${
                  formType === 'RECEIPT'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Phiếu thu (Giảm nợ AR)
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormType('PAYMENT');
                  setFormCategory('Chi trả NCC');
                }}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold text-center transition cursor-pointer ${
                  formType === 'PAYMENT'
                    ? 'bg-white text-slate-800 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Phiếu chi (Giảm nợ AP)
              </button>
            </div>

            <div className="space-y-3">
              {/* Partner Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {formType === 'RECEIPT' ? 'Khách hàng nộp tiền' : 'Nhà cung cấp nhận tiền'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formPartnerId}
                  onChange={(e) => {
                    setFormPartnerId(e.target.value);
                    const c = customers.find((cust) => cust.id === e.target.value);
                    if (c) setFormPartnerName(c.name);
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="CUST-001">
                    Công ty Cổ phần Nội thất An Phát — Nợ hiện tại: 320.000.000 đ
                  </option>
                  <option value="CUST-002">
                    Đại lý Trang trí Hoàng Gia — Nợ hiện tại: 145.000.000 đ
                  </option>
                  <option value="CUST-003">
                    Công ty TNHH Xây dựng Minh Khang — Nợ hiện tại: 78.000.000 đ
                  </option>
                  {formType === 'PAYMENT' && (
                    <>
                      <option value="NCC-01">Công ty Cổ phần Nhựa Đông Á — Nợ: 420.000.000 đ</option>
                      <option value="NCC-02">Tổng Công ty Hóa chất Việt Nhật — Nợ: 185.000.000 đ</option>
                    </>
                  )}
                </select>
              </div>

              {/* Amount & Subtext */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiền thanh toán (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={formAmount || 50000000}
                  onChange={(e) => setFormAmount(Number(e.target.value))}
                  placeholder="50000000"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500"
                />
                <div className="text-[11px] text-slate-400 mt-1 italic font-medium">
                  Bằng chữ: {(formAmount || 50000000).toLocaleString('vi-VN')} đ
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phương thức giao dịch <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formMethod}
                  onChange={(e) => setFormMethod(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="BANK_TRANSFER">Chuyển khoản (VietQR / Internet Banking)</option>
                  <option value="CASH">Tiền mặt tại quỹ</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung diễn giải <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formDescription || 'Thu tiền hàng cấn trừ công nợ khách hàng'}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Thu tiền hàng cấn trừ công nợ khách hàng"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveVoucher}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer shadow-xs"
                >
                  <span>Xác nhận ghi sổ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
