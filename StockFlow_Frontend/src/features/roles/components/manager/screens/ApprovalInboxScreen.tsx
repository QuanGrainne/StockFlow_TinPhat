// src/features/roles/components/manager/screens/ApprovalInboxScreen.tsx
// Màn hình Hộp thư phê duyệt quản lý theo giao diện AI Studio Ảnh 2

import React, { useState } from 'react';
import {
  KeyRound,
  DollarSign,
  Warehouse,
  CheckCircle2,
  XCircle,
  X,
  FileCheck,
  Building,
  RotateCw,
  Check,
  FileText,
} from 'lucide-react';
import { managerService } from '../../../services/managerService';

interface ApprovalRequest {
  id: string;
  code: string;
  customerName: string;
  customerCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  currentDebt: number;
  currentLimit: number;
  proposedLimit: number;
  reason: string;
  proposedBy: string;
  createdAt: string;
}

interface InventoryAdjustmentRequest {
  id: string;
  code: string;
  productName: string;
  productCode: string;
  warehouse: string;
  bookStock: number;
  actualStock: number;
  difference: number;
  explanation: string;
  countedBy: string;
  countDate: string;
  status: 'PENDING' | 'APPROVED' | 'RECOUNT';
}

const INITIAL_REQUESTS: ApprovalRequest[] = [
  {
    id: 'REQ-01',
    code: 'CR-2026-081',
    customerName: 'Công ty Cổ phần Nội thất An Phát',
    customerCode: 'KH-AP01',
    status: 'PENDING',
    currentDebt: 320000000,
    currentLimit: 350000000,
    proposedLimit: 500000000,
    reason:
      'Khách hàng VIP ký hợp đồng hoàn thiện 4 căn penthouse tại Ciputra, cam kết trả dứt điểm trong 15 ngày.',
    proposedBy: 'Lê Văn C (TP-SL003)',
    createdAt: '16/10/2026',
  },
  {
    id: 'REQ-02',
    code: 'CR-2026-079',
    customerName: 'Đại lý Trang trí Hoàng Gia',
    customerCode: 'KH-HG03',
    status: 'PENDING',
    currentDebt: 145000000,
    currentLimit: 150000000,
    proposedLimit: 250000000,
    reason:
      'Đang gom hàng nhập đợt cuối tháng để chuẩn bị khai trương thêm showroom mới tại Cầu Giấy.',
    proposedBy: 'Lê Văn C (TP-SL003)',
    createdAt: '15/10/2026',
  },
];

const INITIAL_INVENTORY_ADJUSTMENTS: InventoryAdjustmentRequest[] = [
  {
    id: 'KK-01',
    code: 'KK-2026-012',
    productName: 'Tấm ốp Nano PVC vân đá 9mm',
    productCode: 'TP-SP01',
    warehouse: 'Kho Tổng Gia Lâm',
    bookStock: 1255,
    actualStock: 1250,
    difference: -5,
    explanation:
      '5 tấm bị chảy nước dính trong quá trình nâng hạ xe nâng ngày 12/10, đã chuyển sang kho phế phẩm.',
    countedBy: 'Phạm Văn D (Thủ kho)',
    countDate: '15/10/2026',
    status: 'PENDING',
  },
  {
    id: 'KK-02',
    code: 'KK-2026-041',
    productName: 'Màng Film PVC vân gỗ sồi đỏ',
    productCode: 'TP-NV03',
    warehouse: 'Kho Đông Anh',
    bookStock: 43,
    actualStock: 45,
    difference: 2,
    explanation:
      'Thừa 2 cuộn do đơn hàng nhập từ PN-2026-088 nhà cung cấp giao thừa chưa ghi nhận kịp vào sổ.',
    countedBy: 'Lê Văn F (Thủ kho)',
    countDate: '16/10/2026',
    status: 'PENDING',
  },
];

export const ApprovalInboxScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'CREDIT' | 'INVENTORY'>('CREDIT');
  const [requests, setRequests] = useState<ApprovalRequest[]>(INITIAL_REQUESTS);
  const [inventoryAdjustments, setInventoryAdjustments] = useState<InventoryAdjustmentRequest[]>(
    INITIAL_INVENTORY_ADJUSTMENTS
  );

  // Modal Decision State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState<ApprovalRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [pinCode, setPinCode] = useState('1234');
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenDecision = (req: ApprovalRequest, action: 'APPROVE' | 'REJECT') => {
    setSelectedReq(req);
    setActionType(action);
    setPinCode('1234');
    setModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    if (!selectedReq) return;
    if (!pinCode || pinCode !== '1234') {
      alert('Mã PIN bảo mật không chính xác! (Mặc định: 1234)');
      return;
    }

    setRequests((prev) =>
      prev.map((r) =>
        r.id === selectedReq.id
          ? { ...r, status: actionType === 'APPROVE' ? 'APPROVED' : 'REJECTED' }
          : r
      )
    );

    if (actionType === 'APPROVE') {
      showToast(`Đã duyệt nâng hạn mức lên ${selectedReq.proposedLimit.toLocaleString('vi-VN')} đ cho ${selectedReq.customerName}`);
    } else {
      showToast(`Đã từ chối yêu cầu nới hạn mức của ${selectedReq.customerName}`);
    }

    setModalOpen(false);
  };

  const handleApproveInventory = (item: InventoryAdjustmentRequest) => {
    setInventoryAdjustments((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'APPROVED' } : i))
    );
    showToast(
      `Đã duyệt điều chỉnh kiểm kê ${item.code} (${item.difference > 0 ? `+${item.difference}` : item.difference}) thành công!`
    );
  };

  const handleRecountInventory = (item: InventoryAdjustmentRequest) => {
    setInventoryAdjustments((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, status: 'RECOUNT' } : i))
    );
    showToast(`Đã gửi yêu cầu thủ kho đếm lại biên bản ${item.code}!`);
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('vi-VN') + ' đ';
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Hộp thư phê duyệt quản lý
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Xử lý các ngoại lệ vượt hạn mức công nợ và biên bản chênh lệch kiểm kê tồn kho
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPinModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
        >
          <KeyRound size={14} className="text-slate-500" />
          <span>Yêu cầu mã PIN duyệt</span>
        </button>
      </div>

      {/* 2. Sub Tabs */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('CREDIT')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
            activeTab === 'CREDIT'
              ? 'border-blue-300 bg-blue-50/80 text-[#2B6CB0] shadow-2xs'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <DollarSign size={14} />
          <span>Hạn mức tín dụng</span>
          <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
            {requests.filter((r) => r.status === 'PENDING').length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('INVENTORY')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer border ${
            activeTab === 'INVENTORY'
              ? 'border-blue-300 bg-blue-50/80 text-[#2B6CB0] shadow-2xs'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Warehouse size={14} />
          <span>Điều chỉnh kiểm kê</span>
          <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
            2
          </span>
        </button>
      </div>

      {/* 3. Section Content: Yêu cầu nới hạn mức công nợ */}
      {activeTab === 'CREDIT' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                YÊU CẦU NỚI HẠN MỨC CÔNG NỢ (3.2.2.2)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Khách hàng vượt trần hạn mức khi Sales lập đơn hàng gom
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-[6px] bg-slate-100 text-slate-600">
              {requests.length} yêu cầu
            </span>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="rounded-xl border border-slate-200/90 p-4 hover:border-blue-200 transition bg-white"
              >
                {/* Top Request Header */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                    {req.code}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {req.customerName}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    ({req.customerCode})
                  </span>
                  {req.status === 'PENDING' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      Chờ duyệt
                    </span>
                  )}
                  {req.status === 'APPROVED' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Đã duyệt
                    </span>
                  )}
                  {req.status === 'REJECTED' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                      Từ chối
                    </span>
                  )}
                </div>

                {/* Main Stats Box & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3.5 rounded-lg bg-slate-50/75 border border-slate-200/60 mb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Dư nợ hiện tại:</div>
                      <div className="text-xs font-extrabold text-slate-800">
                        {formatCurrency(req.currentDebt)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Hạn mức hiện tại:</div>
                      <div className="text-xs font-extrabold text-slate-800">
                        {formatCurrency(req.currentLimit)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Hạn mức đề xuất:</div>
                      <div className="text-xs font-extrabold text-rose-600">
                        {formatCurrency(req.proposedLimit)}
                      </div>
                    </div>
                  </div>

                  {/* Buttons right */}
                  {req.status === 'PENDING' ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenDecision(req, 'REJECT')}
                        className="px-4 py-2 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-600 font-semibold text-xs transition cursor-pointer shadow-2xs"
                      >
                        Từ chối
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenDecision(req, 'APPROVE')}
                        className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-white font-semibold text-xs transition cursor-pointer shadow-xs"
                      >
                        Phê duyệt
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-slate-400 italic">
                      Đã xử lý
                    </div>
                  )}
                </div>

                {/* Subtitle details */}
                <div className="text-[11px] text-slate-500 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-700">Lý do giải trình:</span>{' '}
                    {req.reason}
                  </div>
                  <div className="text-slate-400">
                    Đề xuất bởi: <span className="text-slate-600">{req.proposedBy}</span> • Ngày tạo: {req.createdAt}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Điều chỉnh kiểm kê (Màn hình 3.2.2.3) */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                BIÊN BẢN CHÊNH LỆCH KIỂM KÊ TỒN KHO (3.2.2.3)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                So sánh số tồn sổ sách hệ thống với số đếm tay thực tế tại giá kệ
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-[6px] bg-slate-100 text-slate-600">
              {inventoryAdjustments.length} biên bản
            </span>
          </div>

          <div className="space-y-4">
            {inventoryAdjustments.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200/90 p-4 bg-white hover:border-blue-200 transition space-y-3 shadow-2xs"
              >
                {/* Header row: KK code, name, product code, warehouse */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                    {item.code}
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {item.productName}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    ({item.productCode})
                  </span>
                  <span className="text-xs text-slate-600 px-2.5 py-0.5 rounded bg-slate-100 font-medium">
                    {item.warehouse}
                  </span>
                  {item.status === 'APPROVED' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ml-auto">
                      Đã duyệt điều chỉnh
                    </span>
                  )}
                  {item.status === 'RECOUNT' && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 ml-auto">
                      Yêu cầu đếm lại
                    </span>
                  )}
                </div>

                {/* Middle Row: 3 columns + buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="grid grid-cols-3 gap-6 sm:gap-12">
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Tồn sổ sách hệ thống:</div>
                      <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                        {item.bookStock.toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Số lượng đếm thực tế:</div>
                      <div className="text-sm font-bold font-mono text-slate-900 mt-0.5">
                        {item.actualStock.toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 font-medium">Chênh lệch:</div>
                      <div
                        className={`text-sm font-bold font-mono mt-0.5 ${
                          item.difference < 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {item.difference > 0 ? `+${item.difference}` : item.difference}{' '}
                        <span className="text-xs font-normal text-slate-500">(Hao hụt/Thừa)</span>
                      </div>
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={item.status !== 'PENDING'}
                      onClick={() => handleRecountInventory(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RotateCw size={13} className="text-slate-500" />
                      <span>Đếm lại</span>
                    </button>
                    <button
                      type="button"
                      disabled={item.status !== 'PENDING'}
                      onClick={() => handleApproveInventory(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Check size={13} />
                      <span>Duyệt điều chỉnh</span>
                    </button>
                  </div>
                </div>

                {/* Subtitle details */}
                <div className="text-[11px] text-slate-600 space-y-1 pt-0.5">
                  <div className="flex items-start gap-1.5">
                    <FileText size={13} className="text-slate-400 mt-0.5 shrink-0" />
                    <span>
                      <strong className="text-slate-700 font-medium">Giải trình mùa thứ năm:</strong>{' '}
                      {item.explanation}
                    </span>
                  </div>
                  <div className="text-slate-400 pl-4.5">
                    Người kiểm đếm: <span className="text-slate-600 font-medium">{item.countedBy}</span> • Ngày kiểm kê: {item.countDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Xác nhận Ký duyệt / Từ chối bằng mã PIN */}
      {modalOpen && selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  actionType === 'APPROVE'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-rose-50 text-rose-600'
                }`}
              >
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {actionType === 'APPROVE' ? 'Xác nhận Phê duyệt' : 'Xác nhận Từ chối'}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedReq.code} • {selectedReq.customerName}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500">Hạn mức đề xuất mới:</span>
                <span className="font-bold text-rose-600">
                  {formatCurrency(selectedReq.proposedLimit)}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Ký duyệt bởi Quản lý điều hành (Trần Thị B - TP-MN002)
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhập mã PIN xác thực Quản lý <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  placeholder="Mặc định: 1234"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-center font-mono text-base tracking-widest focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecision}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer ${
                    actionType === 'APPROVE'
                      ? 'bg-[#1E56A0] hover:bg-[#184580]'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {actionType === 'APPROVE' ? 'Ký duyệt ngay' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Đổi / Kiểm tra mã PIN */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setPinModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Mã PIN xét duyệt bảo mật</h3>
                <p className="text-xs text-slate-500">Mã PIN ký số nội bộ cho tài khoản Quản lý</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-4">
              Mã PIN bảo mật hiện tại được thiết lập mặc định là: <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">1234</span>
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setPinModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#1E56A0] text-xs font-semibold text-white"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
