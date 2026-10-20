// src/components/sales/screens/CreditLimitRequestsScreen.tsx
// Màn hình gửi và theo dõi yêu cầu nâng hạn mức tín dụng (Credit Limit Requests) từ Sales gửi Manager

import React, { useState, useEffect } from 'react';
import { CreditLimitRequest, Customer } from '../../../types';
import { salesService } from '../../../services/salesService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import {
  ShieldAlert,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

export const CreditLimitRequestsScreen: React.FC = () => {
  const [requests, setRequests] = useState<CreditLimitRequest[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [requestedLimit, setRequestedLimit] = useState<number>(0);
  const [pendingOrderCode, setPendingOrderCode] = useState('');
  const [reason, setReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqList, custList] = await Promise.all([
        salesService.getCreditLimitRequests(),
        salesService.getCustomers(),
      ]);
      setRequests(reqList);
      setCustomers(custList);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const handleSubmitRequest = async () => {
    if (!customerId) {
      setErrorMsg('Vui lòng chọn khách hàng');
      return;
    }
    if (!requestedLimit || requestedLimit <= (selectedCustomer?.creditLimit || 0)) {
      setErrorMsg('Hạn mức đề xuất mới phải lớn hơn hạn mức nợ hiện tại của khách');
      return;
    }
    if (!reason.trim()) {
      setErrorMsg('Vui lòng nhập lý do đề xuất nâng hạn mức gửi Ban Quản lý');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      await salesService.createCreditLimitRequest({
        customerId,
        requestedCreditLimit: Number(requestedLimit),
        pendingOrderCode: pendingOrderCode || 'Đơn hàng mới',
        reason,
        requestedBy: 'Trần Văn Tuấn (Sales)',
      });

      setModalOpen(false);
      setCustomerId('');
      setRequestedLimit(0);
      setPendingOrderCode('');
      setReason('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gửi yêu cầu');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<CreditLimitRequest>[] = [
    {
      header: 'Mã yêu cầu',
      accessor: 'requestCode',
      width: '130px',
      render: (row) => (
        <span className="font-mono font-bold text-[#2B6CB0]">{row.requestCode}</span>
      ),
    },
    {
      header: 'Khách hàng',
      accessor: 'customerName',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.customerName}</div>
          <div className="text-[11px] text-slate-500 font-mono">Đơn tham chiếu: {row.pendingOrderCode}</div>
        </div>
      ),
    },
    {
      header: 'Nợ hiện tại',
      accessor: 'currentDebt',
      align: 'right',
      render: (row) => (
        <span className="text-slate-700">
          {row.currentDebt.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Hạn mức cũ',
      accessor: 'currentCreditLimit',
      align: 'right',
      render: (row) => (
        <span className="text-slate-500 line-through">
          {row.currentCreditLimit.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Hạn mức xin nâng',
      accessor: 'requestedCreditLimit',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-[#2B6CB0]">
          {row.requestedCreditLimit.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Lý do / Phê duyệt',
      render: (row) => (
        <div>
          <div className="text-slate-700 line-clamp-1" title={row.reason}>{row.reason}</div>
          {row.reviewNotes && (
            <div className="text-[11px] text-emerald-700 italic mt-0.5">
              Phản hồi: {row.reviewNotes} ({row.reviewedBy})
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      align: 'center',
      width: '130px',
      render: (row) => {
        switch (row.status) {
          case 'PENDING':
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock size={11} /> Chờ Quản lý duyệt
              </span>
            );
          case 'APPROVED':
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={11} /> Đã phê duyệt
              </span>
            );
          case 'REJECTED':
            return (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <XCircle size={11} /> Bị từ chối
              </span>
            );
          default:
            return <span>{row.status}</span>;
        }
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Yêu cầu tăng hạn mức tín dụng (Credit Limit Requests)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Khi khách hàng vượt hạn mức nợ, nhân viên Sales lập đề xuất để Quản lý (Manager) xét duyệt
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setErrorMsg('');
            setModalOpen(true);
          }}
          className="h-9 px-4 rounded-[8px] bg-[#2B6CB0] hover:bg-[#23568c] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus size={16} />
          <span>Gửi yêu cầu nâng hạn mức</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={requests}
        keyField="id"
        isLoading={loading}
        searchPlaceholder="Tìm theo mã yêu cầu hoặc tên khách..."
      />

      {/* Modal gửi yêu cầu */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Đề xuất tăng hạn mức tín dụng (Credit Limit Request)"
        subtitle="Yêu cầu sẽ được chuyển trực tiếp vào Hộp thư xét duyệt của Quản lý (Manager)"
        onSave={handleSubmitRequest}
        saveText="Gửi đề xuất tới Quản lý"
        isSaving={isSaving}
        maxWidth="lg"
      >
        {errorMsg && (
          <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Khách hàng <span className="text-rose-500">*</span>
          </label>
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const cust = customers.find((c) => c.id === e.target.value);
              if (cust) setRequestedLimit(cust.creditLimit + 50000000);
            }}
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          >
            <option value="">-- Chọn khách hàng --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Nợ: {c.currentDebt.toLocaleString()} đ / Hạn mức: {c.creditLimit.toLocaleString()} đ)
              </option>
            ))}
          </select>
        </div>

        {selectedCustomer && (
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#F7FAFC] rounded-[6px] border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500">Nợ hiện tại:</span>
              <div className="font-bold text-rose-600">
                {selectedCustomer.currentDebt.toLocaleString('vi-VN')} đ
              </div>
            </div>
            <div>
              <span className="text-slate-500">Hạn mức hiện hành:</span>
              <div className="font-bold text-slate-800">
                {selectedCustomer.creditLimit.toLocaleString('vi-VN')} đ
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hạn mức mới đề xuất (VND) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step={10000000}
              value={requestedLimit}
              onChange={(e) => setRequestedLimit(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#2B6CB0] font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã đơn hàng liên quan
            </label>
            <input
              type="text"
              value={pendingOrderCode}
              onChange={(e) => setPendingOrderCode(e.target.value)}
              placeholder="Vd: SO-2026-002"
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Lý do đề xuất & Cam kết thanh toán <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Nêu rõ lý do khách hàng cần nới hạn mức, tiến độ công trình, cam kết trả nợ..."
            className="w-full p-2.5 border border-slate-300 rounded-[6px] text-xs resize-none text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          />
        </div>
      </Modal>
    </div>
  );
};
