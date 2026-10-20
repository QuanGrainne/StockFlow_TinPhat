// src/features/roles/components/manager/screens/LandedCostScreen.tsx
// Màn hình 3.2.2.11: Chi phí mua hàng và Landed Cost theo giao diện AI Studio Ảnh 4

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Truck,
  Plus,
  Building,
  CheckCircle2,
  X,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { managerService } from '../../../services/managerService';
import { LandedCostRecord } from '../../../types';

export const LandedCostScreen: React.FC = () => {
  const [records, setRecords] = useState<LandedCostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Lập Phiếu Chi NCC
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('Công ty Cổ phần Nhựa Đông Á');
  const [paymentAmount, setPaymentAmount] = useState<number>(200000000);
  const [paymentMethod, setPaymentMethod] = useState<'BANK_TRANSFER' | 'CASH'>('BANK_TRANSFER');
  const [description, setDescription] = useState('Thanh toán đợt 1 tiền nhập hạt nhựa nguyên sinh SG5 theo hợp đồng');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await managerService.getLandedCostRecords();
      setRecords(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCreatePayment = (e: React.FormEvent) => {
    e.preventDefault();
    showToast(`Đã lập phiếu chi ${paymentAmount.toLocaleString('vi-VN')} đ cho ${supplierName}`);
    setPaymentModalOpen(false);
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Chi phí mua hàng và Landed Cost
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Màn hình 3.2.2.11 • Phân bổ chi phí vận chuyển, bốc dỡ vào giá vốn bình quân di động (MAC)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPaymentModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          <span>+ Lập phiếu chi NCC</span>
        </button>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Nợ phải trả nhà cung cấp (AP) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              Nợ phải trả nhà cung cấp (AP)
            </span>
            <div className="text-2xl font-extrabold text-amber-600 mt-2">
              605.000.000 đ
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Cần thanh toán đúng hạn hợp đồng
          </div>
        </div>

        {/* Card 2: Đơn mua hàng PO theo dõi */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              Đơn mua hàng PO theo dõi
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              14 đơn hàng
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-emerald-600">
            100% khớp giá hợp đồng
          </div>
        </div>

        {/* Card 3: Tổng Landed Cost phân bổ */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              Tổng Landed Cost phân bổ
            </span>
            <div className="text-2xl font-extrabold text-indigo-700 mt-2">
              16.300.000 đ
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Cước vận chuyển & bốc xếp
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              CHI TIẾT NHẬP HÀNG & PHÂN BỔ CHI PHÍ CẤU THÀNH GIÁ NHẬP
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tự động kết chuyển chi phí phụ vào giá trị nhập để tái tính toán giá vốn bình quân MAC
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-[6px] bg-slate-100 text-slate-600">
            {records.length} lô nhập
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">MÃ PHIẾU NHẬP</th>
                <th className="py-3 px-4 min-w-[200px]">NHÀ CUNG CẤP</th>
                <th className="py-3 px-4">KHO TIẾP NHẬN</th>
                <th className="py-3 px-4 min-w-[180px]">MẶT HÀNG NHẬP</th>
                <th className="py-3 px-4 text-center">NHẬP / TRẢ HÀNG</th>
                <th className="py-3 px-4 text-right">LANDED COST PHÂN BỔ</th>
                <th className="py-3 px-4 text-right">GIÁ VỐN MAC SAU NHẬP</th>
                <th className="py-3 px-4 text-center">THỦ KHO TIẾP NHẬN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-blue-50/30 transition">
                  {/* Mã phiếu nhập */}
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                    {r.receiptCode}
                  </td>

                  {/* Nhà cung cấp & ngày nhập */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{r.supplierName}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      Ngày nhập: {r.receiptDate}
                    </div>
                  </td>

                  {/* Kho tiếp nhận */}
                  <td className="py-3.5 px-4 whitespace-nowrap font-medium text-slate-600">
                    {r.warehouseName}
                  </td>

                  {/* Mặt hàng nhập */}
                  <td className="py-3.5 px-4 font-semibold text-slate-800">
                    {r.productName}
                  </td>

                  {/* Nhập / trả hàng */}
                  <td className="py-3.5 px-4 text-center font-mono font-bold whitespace-nowrap">
                    {r.quantityInfo.includes('(-2)') ? (
                      <span>
                        <span className="text-emerald-600">+50</span>{' '}
                        <span className="text-rose-600">(-2)</span>
                      </span>
                    ) : (
                      <span className="text-emerald-600">{r.quantityInfo}</span>
                    )}
                  </td>

                  {/* Landed cost phân bổ */}
                  <td className="py-3.5 px-4 text-right font-bold text-slate-900 whitespace-nowrap">
                    {formatCurrency(r.landedCost)}
                  </td>

                  {/* Giá vốn MAC sau nhập */}
                  <td className="py-3.5 px-4 text-right font-bold text-blue-700 whitespace-nowrap">
                    {formatCurrency(r.macAfterInbound)}
                  </td>

                  {/* Thủ kho tiếp nhận */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap font-medium text-slate-700">
                    {r.receivedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Lập Phiếu Chi NCC */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setPaymentModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Lập phiếu chi Nhà cung cấp</h3>
                <p className="text-xs text-slate-500">Giảm công nợ phải trả AP và xuất quỹ doanh nghiệp</p>
              </div>
            </div>

            <form onSubmit={handleCreatePayment} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nhà cung cấp nhận thanh toán
                </label>
                <select
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Công ty Cổ phần Nhựa Đông Á">Công ty Cổ phần Nhựa Đông Á (Nợ: 420.000.000 đ)</option>
                  <option value="Tổng Công ty Hóa chất Việt Nhật">Tổng Công ty Hóa chất Việt Nhật (Nợ: 185.000.000 đ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tiền chi (VND) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  min={100000}
                  step={100000}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hình thức thanh toán
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng (MB Bank)</option>
                  <option value="CASH">Tiền mặt tại quỹ</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nội dung chi
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer"
                >
                  Lưu phiếu chi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
