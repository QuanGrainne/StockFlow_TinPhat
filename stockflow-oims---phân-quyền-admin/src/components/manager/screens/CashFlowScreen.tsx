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

      {/* ── Modal gộp: Create Cash Flow Voucher (Thu & Chi) ── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={formType === 'RECEIPT' ? 'Lập Phiếu Thu Tiền' : 'Lập Phiếu Chi Tiền'}
        subtitle="Chứng từ dòng tiền chính thức cho hệ thống StockFlow OIMS"
        onSave={handleSaveVoucher}
        saveText={formType === 'RECEIPT' ? 'Lưu Phiếu Thu' : 'Lưu Phiếu Chi'}
        isSaving={isSaving}
        maxWidth="lg"
      >
        {formError && (
          <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{formError}</span>
          </div>
        )}

        {/* Radio Toggle: Chọn Thu hoặc Chi */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Loại chứng từ dòng tiền <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`flex items-center justify-center gap-2 p-2.5 rounded-[6px] border text-xs font-bold cursor-pointer transition ${
                formType === 'RECEIPT'
                  ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-2 ring-emerald-100'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="voucherType"
                checked={formType === 'RECEIPT'}
                onChange={() => {
                  setFormType('RECEIPT');
                  setFormCategory('Thu tiền khách hàng');
                }}
                className="hidden"
              />
              <ArrowDownLeft size={16} className="text-emerald-600" />
              <span>PHIẾU THU (+)</span>
            </label>

            <label
              className={`flex items-center justify-center gap-2 p-2.5 rounded-[6px] border text-xs font-bold cursor-pointer transition ${
                formType === 'PAYMENT'
                  ? 'border-rose-500 bg-rose-50/50 text-rose-800 ring-2 ring-rose-100'
                  : 'border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="voucherType"
                checked={formType === 'PAYMENT'}
                onChange={() => {
                  setFormType('PAYMENT');
                  setFormCategory('Chi trả NCC');
                }}
                className="hidden"
              />
              <ArrowUpRight size={16} className="text-rose-600" />
              <span>PHIẾU CHI (-)</span>
            </label>
          </div>
        </div>

        {/* Hạng mục thu chi */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hạng mục thu/chi
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            >
              {formType === 'RECEIPT' ? (
                <>
                  <option value="Thu tiền khách hàng">Thu tiền nợ khách hàng (Trừ công nợ)</option>
                  <option value="Khách đặt cọc">Khách tạm ứng / Đặt cọc đơn hàng</option>
                  <option value="Thu nhập khác">Thu nhập khác / Thanh lý phế liệu</option>
                </>
              ) : (
                <>
                  <option value="Chi trả NCC">Chi thanh toán tiền hàng NCC</option>
                  <option value="Chi phí vận hành">Chi cước xe tải / Bốc xếp (Landed Cost)</option>
                  <option value="Chi lương & SX">Chi tạm ứng công thợ sản xuất</option>
                  <option value="Chi khác">Chi phí văn phòng & điện nước</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hình thức thanh toán
            </label>
            <select
              value={formMethod}
              onChange={(e) => setFormMethod(e.target.value as any)}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            >
              <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng (Vietcombank)</option>
              <option value="CASH">Tiền mặt tại quỹ công ty</option>
            </select>
          </div>
        </div>

        {/* Đối tác & Số tiền */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đối tác (Khách hàng / NCC)
            </label>
            <select
              value={formPartnerId}
              onChange={(e) => {
                setFormPartnerId(e.target.value);
                const c = customers.find((cust) => cust.id === e.target.value);
                if (c) setFormPartnerName(c.name);
              }}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            >
              <option value="">-- Chọn đối tác hoặc tự nhập --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số tiền thanh toán (VND) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step={1000000}
              value={formAmount}
              onChange={(e) => setFormAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Số chứng từ gốc tham chiếu (Hóa đơn / Đơn hàng PO, SO)
          </label>
          <input
            type="text"
            value={formRefDoc}
            onChange={(e) => setFormRefDoc(e.target.value)}
            placeholder="Vd: SO-2026-001 hoặc HD-981"
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Nội dung diễn giải chi tiết <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Ghi rõ lý do thu hoặc chi, người nhận tiền..."
            className="w-full p-2.5 border border-slate-300 rounded-[6px] text-xs resize-none text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          />
        </div>
      </Modal>
    </div>
  );
};
