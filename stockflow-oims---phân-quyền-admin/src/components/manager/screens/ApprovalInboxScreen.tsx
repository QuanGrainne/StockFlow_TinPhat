// src/components/manager/screens/ApprovalInboxScreen.tsx
// Hộp thư xét duyệt (Manager): Phê duyệt hoặc từ chối yêu cầu tăng hạn mức tín dụng kèm mã PIN bảo mật

import React, { useState, useEffect } from 'react';
import { CreditLimitRequest } from '../../../types';
import { managerService } from '../../../services/managerService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  KeyRound,
  AlertTriangle,
  Building,
} from 'lucide-react';

export const ApprovalInboxScreen: React.FC = () => {
  const [requests, setRequests] = useState<CreditLimitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [selectedReq, setSelectedReq] = useState<CreditLimitRequest | null>(null);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [securityPin, setSecurityPin] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await managerService.getPendingApprovals();
      setRequests(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDecisionModal = (req: CreditLimitRequest, action: 'APPROVE' | 'REJECT') => {
    setSelectedReq(req);
    setDecisionAction(action);
    setSecurityPin('');
    setReviewNotes(
      action === 'APPROVE'
        ? 'Đồng ý nới hạn mức tín dụng theo đề xuất của Sales.'
        : 'Từ chối: Khách hàng cần tất toán nợ cũ trước khi cấp hạn mức mới.'
    );
    setErrorMessage('');
    setApprovalModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!selectedReq) return;
    if (!securityPin.trim()) {
      setErrorMessage('Vui lòng nhập mã PIN bảo mật của Quản lý để ký duyệt (Mặc định: 1234)');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      await managerService.processApproval(
        selectedReq.id,
        decisionAction,
        securityPin,
        reviewNotes,
        'Nguyễn Quản Lý (Manager)'
      );

      setApprovalModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi xử lý phê duyệt');
    } finally {
      setIsProcessing(false);
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
        <span className="font-semibold text-rose-600">
          {row.currentDebt.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Hạn mức cũ',
      accessor: 'currentCreditLimit',
      align: 'right',
      render: (row) => (
        <span className="text-slate-500">
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
      header: 'Lý do từ Sales',
      render: (row) => (
        <div className="text-slate-700 line-clamp-2 text-xs" title={row.reason}>
          {row.reason}
          <div className="text-[10px] text-slate-400 mt-0.5">Người gửi: {row.requestedBy} lúc {row.requestedAt}</div>
        </div>
      ),
    },
    {
      header: 'Quyết định',
      align: 'center',
      width: '170px',
      render: (row) => {
        if (row.status === 'PENDING') {
          return (
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => openDecisionModal(row, 'APPROVE')}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[6px] text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <CheckCircle2 size={13} />
                <span>Duyệt</span>
              </button>
              <button
                type="button"
                onClick={() => openDecisionModal(row, 'REJECT')}
                className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 rounded-[6px] text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <XCircle size={13} />
                <span>Từ chối</span>
              </button>
            </div>
          );
        }

        if (row.status === 'APPROVED') {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={12} /> Đã phê duyệt
            </span>
          );
        }

        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} /> Bị từ chối
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Hộp thư xét duyệt (Approval Inbox)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Quyền hạn Quản lý: Xét duyệt yêu cầu nới hạn mức tín dụng từ Sales với xác thực PIN bảo mật
        </p>
      </div>

      <DataTable
        columns={columns}
        data={requests}
        keyField="id"
        isLoading={loading}
        searchPlaceholder="Tìm theo mã yêu cầu hoặc tên khách hàng..."
      />

      {/* Modal Phê duyệt / Từ chối kèm PIN bảo mật */}
      <Modal
        isOpen={approvalModalOpen}
        onClose={() => setApprovalModalOpen(false)}
        title={decisionAction === 'APPROVE' ? 'Phê duyệt nâng hạn mức tín dụng' : 'Từ chối yêu cầu nâng hạn mức'}
        subtitle={`Mã yêu cầu: ${selectedReq?.requestCode} | Đối tác: ${selectedReq?.customerName}`}
        onSave={handleConfirmDecision}
        saveText={decisionAction === 'APPROVE' ? 'Xác nhận Ký duyệt' : 'Xác nhận Từ chối'}
        isSaving={isProcessing}
        maxWidth="md"
      >
        {errorMessage && (
          <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 rounded-[6px] border border-slate-200 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Nợ hiện tại của khách:</span>
            <span className="font-bold text-rose-600">
              {selectedReq?.currentDebt.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Hạn mức hiện hành:</span>
            <span className="font-semibold text-slate-700">
              {selectedReq?.currentCreditLimit.toLocaleString('vi-VN')} đ
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1.5">
            <span className="text-slate-700 font-semibold">Hạn mức đề xuất mới:</span>
            <span className="font-bold text-[#2B6CB0] text-sm">
              {selectedReq?.requestedCreditLimit.toLocaleString('vi-VN')} đ
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ý kiến nhận xét & Chỉ đạo của Quản lý <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-[6px] text-xs resize-none text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <KeyRound size={14} className="text-[#2B6CB0]" />
            <span>Mã PIN bảo mật Quản lý (Security PIN) <span className="text-rose-500">*</span></span>
          </label>
          <input
            type="password"
            maxLength={6}
            value={securityPin}
            onChange={(e) => setSecurityPin(e.target.value)}
            placeholder="Nhập mã PIN (Mặc định: 1234)"
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 tracking-widest font-mono focus:outline-none focus:border-[#2B6CB0]"
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Yêu cầu theo Report 3 (mục 3.1.5.2 Screen #8): Phê duyệt tài chính bắt buộc có mã xác thực PIN
          </p>
        </div>
      </Modal>
    </div>
  );
};
