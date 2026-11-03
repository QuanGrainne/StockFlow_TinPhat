// src/components/manager/screens/PartnerCreditLimitScreen.tsx
// Màn hình Quản lý Hạn mức Tín dụng & Công nợ Đối tác (Chức năng đặc thù của Manager trong Report 3)

import React, { useState, useEffect } from 'react';
import { Customer } from '../../../types';
import { managerService } from '../../../services/managerService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import {
  Users,
  Edit2,
  AlertTriangle,
  Building,
  CheckCircle2,
} from 'lucide-react';

export const PartnerCreditLimitScreen: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [selectedCust, setSelectedCust] = useState<Customer | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [paymentTerms, setPaymentTerms] = useState<number>(30);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await managerService.getCustomers();
      setCustomers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openEditModal = (cust: Customer) => {
    setSelectedCust(cust);
    setCreditLimit(cust.creditLimit);
    setPaymentTerms(cust.paymentTermDays);
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedCust) return;
    if (creditLimit < 0) {
      setErrorMsg('Hạn mức tín dụng không được âm');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      await managerService.updateCustomerCreditLimit(
        selectedCust.id,
        Number(creditLimit),
        Number(paymentTerms)
      );

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi cập nhật hạn mức');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<Customer>[] = [
    {
      header: 'Mã đối tác',
      accessor: 'code',
      width: '130px',
      render: (row) => (
        <span className="font-mono font-bold text-[#2B6CB0]">{row.code}</span>
      ),
    },
    {
      header: 'Tên doanh nghiệp / Khách hàng',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.name}</div>
          <div className="text-[11px] text-slate-400">{row.address}</div>
        </div>
      ),
    },
    {
      header: 'Công nợ hiện tại',
      accessor: 'currentDebt',
      align: 'right',
      render: (row) => {
        const isOver = row.currentDebt > row.creditLimit;
        return (
          <span className={`font-bold ${isOver ? 'text-rose-600' : 'text-slate-700'}`}>
            {row.currentDebt.toLocaleString('vi-VN')} đ
          </span>
        );
      },
    },
    {
      header: 'Hạn mức tín dụng (Max)',
      accessor: 'creditLimit',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-[#2B6CB0]">
          {row.creditLimit.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Thời hạn nợ',
      accessor: 'paymentTermDays',
      align: 'center',
      width: '120px',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
          {row.paymentTermDays} ngày
        </span>
      ),
    },
    {
      header: 'Tỷ lệ nợ / Hạn mức',
      align: 'center',
      width: '160px',
      render: (row) => {
        const percent = Math.min(100, Math.round((row.currentDebt / (row.creditLimit || 1)) * 100));
        const isOver = row.currentDebt > row.creditLimit;

        return (
          <div className="w-full max-w-[120px] mx-auto space-y-1">
            <div className="flex justify-between text-[10px] font-semibold">
              <span className={isOver ? 'text-rose-600' : 'text-slate-600'}>
                {isOver ? 'Vượt hạn mức' : `${percent}%`}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  isOver ? 'bg-rose-500' : percent > 85 ? 'bg-amber-500' : 'bg-[#2B6CB0]'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Thao tác',
      align: 'center',
      width: '110px',
      render: (row) => (
        <button
          type="button"
          onClick={() => openEditModal(row)}
          className="px-2.5 py-1 text-xs font-semibold text-[#2B6CB0] hover:bg-blue-50 rounded-[4px] border border-blue-200 transition cursor-pointer flex items-center gap-1 mx-auto"
        >
          <Edit2 size={12} />
          <span>Sửa</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Hạn mức tín dụng & Công nợ Đối tác
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Quyền hạn Quản lý: Thiết lập hạn mức nợ tối đa (Credit Limit) và thời hạn nợ cho khách hàng B2B
        </p>
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        keyField="id"
        isLoading={loading}
        searchPlaceholder="Tìm theo mã hoặc tên đối tác..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Modal cập nhật hạn mức */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Thiết lập hạn mức tín dụng & Thời hạn công nợ"
        subtitle={`Đối tác: ${selectedCust?.name} (${selectedCust?.code})`}
        onSave={handleSave}
        saveText="Cập nhật hạn mức"
        isSaving={isSaving}
        maxWidth="md"
      >
        {errorMsg && (
          <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Công nợ hiện tại:</span>
            <span className="font-bold text-rose-600 text-sm">
              {selectedCust?.currentDebt.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Hạn mức tín dụng tối đa (Credit Limit - VND) <span className="text-rose-500">*</span>
          </label>
          <input
            type="number"
            step={10000000}
            value={creditLimit}
            onChange={(e) => setCreditLimit(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#2B6CB0]"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Nếu đơn hàng mới vượt quá hạn mức này, Sales sẽ bị chặn xuất kho cho đến khi Quản lý duyệt.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Thời hạn công nợ (Payment Terms)
          </label>
          <select
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          >
            <option value={0}>Thanh toán ngay (Tiền mặt / Chuyển khoản trước khi giao)</option>
            <option value={15}>15 ngày kể từ ngày giao hàng</option>
            <option value={30}>30 ngày kể từ ngày giao hàng</option>
            <option value={45}>45 ngày (Hợp đồng thầu lớn)</option>
            <option value={60}>60 ngày (Đối tác chiến lược)</option>
          </select>
        </div>
      </Modal>
    </div>
  );
};
