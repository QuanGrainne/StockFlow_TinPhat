// src/features/roles/components/sales/screens/ReturnClaimsScreen.tsx
// Màn hình Quản lý hàng trả lại (Return Claims) & Modal Lập phiếu đề nghị trả hàng (Ảnh 2 & Ảnh 3)

import React, { useState, useEffect } from 'react';
import { ReturnClaim } from '../../../types';
import { salesService } from '../../../services/salesService';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Send,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export const ReturnClaimsScreen: React.FC = () => {
  const [claims, setClaims] = useState<ReturnClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal Lập phiếu đề nghị trả hàng (Ảnh 3)
  const [modalOpen, setModalOpen] = useState(false);
  const [formPxkCode, setFormPxkCode] = useState('PXK-2026-088');
  const [formCustomerName, setFormCustomerName] = useState('KH-AP01 - Đại lý Nội thất An Phát');
  const [formProduct, setFormProduct] = useState('TP-SP01 - Tấm ốp Nano PVC vân đá 9mm');
  const [formReturnQty, setFormReturnQty] = useState<number>(5);
  const [formReason, setFormReason] = useState<
    'Vận chuyển trầy xước' | 'Giao sai mã hàng' | 'Lỗi kỹ thuật sản phẩm' | 'Thừa vật tư công trình'
  >('Vận chuyển trầy xước');
  const [formPhysicalCondition, setFormPhysicalCondition] = useState(
    'Mẻ góc hèm khóa, trầy xước bề mặt bao bì nilon.'
  );
  const [formCustomerNotes, setFormCustomerNotes] = useState(
    'Khách hàng kiểm tra khi dỡ hàng xuống xe phát hiện va đập dây chằng, đề nghị đổi mới.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await salesService.getReturnClaims(search, statusFilter);
      setClaims(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const handleOpenCreateModal = () => {
    setFormPxkCode('PXK-2026-088');
    setFormCustomerName('KH-AP01 - Đại lý Nội thất An Phát');
    setFormProduct('TP-SP01 - Tấm ốp Nano PVC vân đá 9mm');
    setFormReturnQty(5);
    setFormReason('Vận chuyển trầy xước');
    setFormPhysicalCondition('Mẻ góc hèm khóa, trầy xước bề mặt bao bì nilon.');
    setFormCustomerNotes('Khách hàng kiểm tra khi dỡ hàng xuống xe phát hiện va đập dây chằng, đề nghị đổi mới.');
    setModalOpen(true);
  };

  const handleSubmitClaim = async () => {
    setIsSubmitting(true);
    try {
      const isAP = formCustomerName.includes('AP01');
      await salesService.createReturnClaim({
        pxkCode: formPxkCode,
        customerId: isAP ? 'CUST-001' : 'CUST-002',
        customerCode: isAP ? 'KH-AP01' : 'KH-HG03',
        customerName: isAP ? 'Đại lý Nội thất An Phát' : 'Đại lý Trang trí Hoàng Gia',
        customerPhone: isAP ? '024 3888 9999' : '0903 222 333',
        productId: 'PROD-001',
        productCode: formProduct.split(' - ')[0],
        productName: formProduct.split(' - ')[1] || 'Tấm ốp Nano PVC vân đá 9mm',
        returnQty: Number(formReturnQty),
        uom: 'Tấm',
        reason: formReason,
        physicalCondition: formPhysicalCondition,
        customerNotes: formCustomerNotes,
      });

      setModalOpen(false);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const getQcBadge = (status: ReturnClaim['qcStatus']) => {
    switch (status) {
      case 'CHO_KIEM_TRA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={13} className="text-amber-600" />
            <span>Chờ kho kiểm tra</span>
          </span>
        );
      case 'DA_NHAP_LAI_KHO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={13} className="text-emerald-600" />
            <span>Đã nhập lại kho</span>
          </span>
        );
      case 'TU_CHOI':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={13} className="text-rose-600" />
            <span>Từ chối nhận</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Box */}
      <div className="bg-white p-6 rounded-[8px] border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2B6CB0] flex items-center gap-1.5 uppercase tracking-wide">
            <span>KHIẾU NẠI & TRẢ HÀNG</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Quản lý hàng trả lại
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tiếp nhận yêu cầu khiếu nại của khách hàng, đối chiếu phiếu xuất kho gốc và theo dõi kết quả kiểm định kho
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="h-9 px-4 rounded-[8px] bg-[#1E56A0] hover:bg-[#184682] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
        >
          <Plus size={16} />
          <span>Lập phiếu trả</span>
        </button>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white p-4 rounded-[8px] border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã YCTH, mã PXK gốc, khách hàng..."
            className="w-full h-9 pl-9 pr-3 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2B6CB0] focus:bg-white transition"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Lọc kiểm định:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 pr-8 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#2B6CB0] cursor-pointer"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CHO_KIEM_TRA">Chờ kho kiểm tra</option>
            <option value="DA_NHAP_LAI_KHO">Đã nhập lại kho</option>
            <option value="TU_CHOI">Từ chối nhận</option>
          </select>
        </div>
      </div>

      {/* 3. Table of Return Claims */}
      <div className="bg-white rounded-[8px] border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">MÃ YÊU CẦU</th>
                <th className="py-3 px-4">PXK GỐC</th>
                <th className="py-3 px-4">KHÁCH HÀNG</th>
                <th className="py-3 px-4">SẢN PHẨM & SỐ LƯỢNG</th>
                <th className="py-3 px-4">LÝ DO TRẢ</th>
                <th className="py-3 px-4">HIỆN TRẠNG VẬT LÝ</th>
                <th className="py-3 px-4 text-center">KIỂM ĐỊNH KHO</th>
                <th className="py-3 px-4 text-center">NGÀY GỬI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {claims.map((claim) => (
                <tr key={claim.id} className="hover:bg-blue-50/30 transition">
                  {/* Mã yêu cầu */}
                  <td className="py-3.5 px-4 font-mono font-bold text-[#2B6CB0]">
                    {claim.claimCode}
                  </td>

                  {/* PXK gốc */}
                  <td className="py-3.5 px-4 font-mono text-slate-600 text-xs">
                    {claim.pxkCode}
                  </td>

                  {/* Khách hàng */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{claim.customerName}</div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {claim.customerPhone}
                    </div>
                  </td>

                  {/* Sản phẩm & Số lượng */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-800">{claim.productName}</div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {claim.productCode} • SL: <strong className="text-slate-800">{claim.returnQty} {claim.uom}</strong>
                    </div>
                  </td>

                  {/* Lý do trả */}
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {claim.reason}
                  </td>

                  {/* Hiện trạng vật lý */}
                  <td className="py-3.5 px-4 max-w-xs truncate text-slate-500" title={claim.physicalCondition}>
                    {claim.physicalCondition}
                  </td>

                  {/* Kiểm định kho */}
                  <td className="py-3.5 px-4 text-center">
                    {getQcBadge(claim.qcStatus)}
                  </td>

                  {/* Ngày gửi */}
                  <td className="py-3.5 px-4 text-center text-slate-500 font-mono text-[11px]">
                    {claim.submittedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. MODAL: LẬP PHIẾU ĐỀ NGHỊ TRẢ HÀNG (Chuẩn Ảnh 3)
      ───────────────────────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[12px] shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-slate-800">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#2B6CB0] uppercase tracking-wider flex items-center gap-1.5">
                  <span>TIẾP NHẬN KHIẾU NẠI</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Lập phiếu đề nghị trả hàng
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-[6px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Row 1: Mã phiếu xuất kho gốc (PXK) + Khách hàng đại lý */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mã phiếu xuất kho gốc (PXK) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPxkCode}
                    onChange={(e) => setFormPxkCode(e.target.value)}
                    className="w-full h-9 px-3 rounded-[6px] border border-slate-300 font-mono text-xs focus:outline-none focus:border-[#2B6CB0]"
                    placeholder="Vd: PXK-2026-088"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Đối chiếu hóa đơn xuất gốc
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Khách hàng đại lý <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCustomerName}
                    onChange={(e) => setFormCustomerName(e.target.value)}
                    className="w-full h-9 px-3 pr-8 rounded-[6px] border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#2B6CB0] cursor-pointer"
                  >
                    <option value="KH-AP01 - Đại lý Nội thất An Phát">
                      KH-AP01 - Đại lý Nội thất An Phát
                    </option>
                    <option value="KH-HG03 - Đại lý Trang trí Hoàng Gia">
                      KH-HG03 - Đại lý Trang trí Hoàng Gia
                    </option>
                  </select>
                </div>
              </div>

              {/* Row 2: Sản phẩm đề nghị trả + Số lượng trả */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Sản phẩm đề nghị trả <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formProduct}
                    onChange={(e) => setFormProduct(e.target.value)}
                    className="w-full h-9 px-3 pr-8 rounded-[6px] border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#2B6CB0] cursor-pointer"
                  >
                    <option value="TP-SP01 - Tấm ốp Nano PVC vân đá 9mm">
                      TP-SP01 - Tấm ốp Nano PVC vân đá 9mm
                    </option>
                    <option value="TP-KE001 - Keo dán chuyên dụng Tín Phát">
                      TP-KE001 - Keo dán chuyên dụng Tín Phát
                    </option>
                    <option value="TP-SP02 - Phào chỉ cổ trần PU dát vàng">
                      TP-SP02 - Phào chỉ cổ trần PU dát vàng
                    </option>
                    <option value="TP-SP03 - Nẹp nhôm chữ T mạ Anode">
                      TP-SP03 - Nẹp nhôm chữ T mạ Anode
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số lượng trả (Tấm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formReturnQty}
                    onChange={(e) => setFormReturnQty(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs font-bold font-mono focus:outline-none focus:border-[#2B6CB0]"
                  />
                </div>
              </div>

              {/* Row 3: Phân loại lý do trả hàng (4 Buttons) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Phân loại lý do trả hàng
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    'Vận chuyển trầy xước',
                    'Giao sai mã hàng',
                    'Lỗi kỹ thuật sản phẩm',
                    'Thừa vật tư công trình',
                  ].map((r) => {
                    const isSelected = formReason === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormReason(r as any)}
                        className={`p-2.5 rounded-[6px] border text-xs font-semibold text-center transition cursor-pointer ${
                          isSelected
                            ? 'border-[#2B6CB0] text-[#2B6CB0] bg-blue-50/50 ring-1 ring-[#2B6CB0]'
                            : 'border-slate-200 text-slate-600 bg-white hover:border-slate-300'
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Mô tả hiện trạng vật lý sản phẩm */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả hiện trạng vật lý sản phẩm <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formPhysicalCondition}
                  onChange={(e) => setFormPhysicalCondition(e.target.value)}
                  className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
                  placeholder="Vd: Mẻ góc hèm khóa, trầy xước bề mặt bao bì nilon."
                />
              </div>

              {/* Row 5: Chi tiết khiếu nại của khách hàng */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chi tiết khiếu nại của khách hàng
                </label>
                <textarea
                  rows={3}
                  value={formCustomerNotes}
                  onChange={(e) => setFormCustomerNotes(e.target.value)}
                  className="w-full p-2.5 rounded-[6px] border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
                  placeholder="Khách hàng kiểm tra khi dỡ hàng xuống xe phát hiện va đập dây chằng, đề nghị đổi mới."
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 px-4 rounded-[6px] border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSubmitClaim}
                disabled={isSubmitting}
                className="h-9 px-5 rounded-[6px] bg-[#1E56A0] hover:bg-[#184682] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Send size={14} />
                <span>{isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
