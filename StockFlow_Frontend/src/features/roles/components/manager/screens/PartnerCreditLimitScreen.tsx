// src/features/roles/components/manager/screens/PartnerCreditLimitScreen.tsx
// Màn hình Đối tác và hạn mức tín dụng theo giao diện AI Studio Ảnh 5

import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Sliders,
  DollarSign,
  Building,
  Building2,
  CheckCircle2,
  X,
  CreditCard,
  Wallet,
} from 'lucide-react';
import { managerService } from '../../../services/managerService';
import { PartnerCreditProfile } from '../../../types';

interface PartnerCreditLimitScreenProps {
  onNavigate?: (screenId: string) => void;
}

export const PartnerCreditLimitScreen: React.FC<PartnerCreditLimitScreenProps> = ({
  onNavigate,
}) => {
  const [partners, setPartners] = useState<PartnerCreditProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal Sửa Hạn Mức Tín Dụng
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerCreditProfile | null>(null);
  const [newCreditLimit, setNewCreditLimit] = useState<number>(350000000);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await managerService.getPartnerProfiles(search, categoryFilter);
      setPartners(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, categoryFilter]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenEditModal = (partner: PartnerCreditProfile) => {
    setSelectedPartner(partner);
    setNewCreditLimit(partner.creditLimit || 300000000);
    setEditModalOpen(true);
  };

  const handleSaveLimit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner) return;

    await managerService.updatePartnerProfileLimit(selectedPartner.id, Number(newCreditLimit));
    showToast(`Đã cập nhật hạn mức tín dụng cho ${selectedPartner.name}`);
    setEditModalOpen(false);
    loadData();
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return 'Không áp dụng';
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
            Đối tác và hạn mức tín dụng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị công nợ khách hàng B2B, nhà cung cấp và thiết lập trần tín dụng an toàn
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('suppliers')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0071BA] hover:bg-[#005f9d] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
          >
            <Building2 size={14} />
            <span>Quản lý Nhà cung cấp</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('manager-cashflow')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
          >
            <Wallet size={14} />
            <span>Sổ quỹ thu chi</span>
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Phải thu khách hàng (AR) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              Phải thu khách hàng (AR)
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              543.000.000 đ
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-medium text-blue-700">
            3 khách hàng B2B
          </div>
        </div>

        {/* Card 2: Phải trả nhà cung cấp (AP) */}
        <div
          onClick={() => onNavigate && onNavigate('suppliers')}
          className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between cursor-pointer hover:border-[#0071BA] hover:shadow-md transition group"
          title="Xem danh sách chi tiết Nhà cung cấp & Công nợ"
        >
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 group-hover:text-[#0071BA] transition">
              Phải trả nhà cung cấp (AP)
            </span>
            <div className="text-2xl font-extrabold text-slate-900 mt-2">
              605.000.000 đ
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">2 nhà cung ứng</span>
            <span className="text-[#0071BA] font-semibold group-hover:underline flex items-center gap-1">
              Xem NCC &rarr;
            </span>
          </div>
        </div>

        {/* Card 3: Hiệu suất dùng hạn mức */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              Hiệu suất dùng hạn mức
            </span>
            <div className="text-2xl font-extrabold text-blue-700 mt-2">
              75.7%
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            Trung bình toàn công ty
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm đối tác theo tên, mã đối tác, số điện thoại..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="relative w-full sm:w-64">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
          >
            <option value="ALL">Tất cả đối tác ({partners.length})</option>
            <option value="Khách hàng B2B">Khách hàng B2B</option>
            <option value="Nhà cung cấp">Nhà cung cấp</option>
          </select>
        </div>
      </div>

      {/* DataTable */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">MÃ ĐỐI TÁC</th>
                <th className="py-3 px-4 min-w-[240px]">TÊN ĐỐI TÁC</th>
                <th className="py-3 px-4 text-center">PHÂN LOẠI</th>
                <th className="py-3 px-4">ĐIỀU KHOẢN THANH TOÁN</th>
                <th className="py-3 px-4 text-right">DƯ NỢ HIỆN TẠI</th>
                <th className="py-3 px-4 text-right">HẠN MỨC TÍN DỤNG</th>
                <th className="py-3 px-4 text-center min-w-[120px]">TỶ LỆ SỬ DỤNG</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {partners.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/30 transition">
                  {/* Mã đối tác */}
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                    {p.code}
                  </td>

                  {/* Tên đối tác & liên hệ */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900">{p.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                      {p.contact}
                    </div>
                  </td>

                  {/* Phân loại badge */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {p.category === 'Khách hàng B2B' ? (
                      <span className="px-2.5 py-0.5 rounded-[4px] bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-100">
                        Khách hàng B2B
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-[4px] bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-100">
                        Nhà cung cấp
                      </span>
                    )}
                  </td>

                  {/* Điều khoản thanh toán */}
                  <td className="py-3.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                    {p.paymentTerm}
                  </td>

                  {/* Dư nợ hiện tại */}
                  <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                    {p.currentDebt.toLocaleString('vi-VN')} đ
                  </td>

                  {/* Hạn mức tín dụng */}
                  <td className="py-3.5 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
                    {formatCurrency(p.creditLimit)}
                  </td>

                  {/* Tỷ lệ sử dụng */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {p.usagePercent !== null ? (
                      <div className="inline-block w-24 text-center">
                        <div className="text-[11px] font-bold text-slate-700 mb-1">
                          {p.usagePercent}%
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              p.barColor === 'red'
                                ? 'bg-rose-500'
                                : p.barColor === 'orange'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(p.usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Thao tác */}
                  <td className="py-3.5 px-4 text-center whitespace-nowrap">
                    {p.category === 'Khách hàng B2B' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(p)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition cursor-pointer"
                      >
                        <Sliders size={13} />
                        <span>Sửa hạn mức</span>
                      </button>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Sửa Hạn Mức Tín Dụng */}
      {editModalOpen && selectedPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sliders size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Thiết lập hạn mức tín dụng</h3>
                <p className="text-xs text-slate-500">{selectedPartner.name} ({selectedPartner.code})</p>
              </div>
            </div>

            <form onSubmit={handleSaveLimit} className="space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1.5 text-slate-700">
                <div className="flex justify-between">
                  <span className="text-slate-500">Dư nợ hiện tại:</span>
                  <span className="font-extrabold">{selectedPartner.currentDebt.toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Điều khoản thanh toán:</span>
                  <span className="font-semibold">{selectedPartner.paymentTerm}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Hạn mức tín dụng mới (VND) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  required
                  step={10000000}
                  min={10000000}
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-bold text-blue-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer"
                >
                  Lưu hạn mức
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
