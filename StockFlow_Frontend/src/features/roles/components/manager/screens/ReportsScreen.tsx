// src/features/roles/components/manager/screens/ReportsScreen.tsx
// Màn hình 3.2.2.15: Báo cáo quản trị doanh nghiệp (Tồn kho MAC, Công nợ AR, Doanh thu lợi nhuận)

import React, { useState } from 'react';
import {
  Layers,
  DollarSign,
  TrendingUp,
  Calendar,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';

interface ReportsScreenProps {
  onNavigate?: (screenId: string) => void;
}

interface MacInventoryItem {
  code: string;
  name: string;
  unit: string;
  stockQty: number;
  macPrice: number;
  totalValuation: number;
}

const MAC_INVENTORY_DATA: MacInventoryItem[] = [
  {
    code: 'TP-SP01',
    name: 'Tấm ốp Nano PVC vân đá 9mm',
    unit: 'Tấm',
    stockQty: 1250,
    macPrice: 112000,
    totalValuation: 140000000,
  },
  {
    code: 'TP-SP02',
    name: 'Phào chỉ cổ trần PU dát vàng 8cm',
    unit: 'Cây 2.4m',
    stockQty: 280,
    macPrice: 58000,
    totalValuation: 16240000,
  },
  {
    code: 'TP-SP03',
    name: 'Nẹp nhôm chữ T mạ Anode',
    unit: 'Thanh 2.5m',
    stockQty: 640,
    macPrice: 26000,
    totalValuation: 16640000,
  },
  {
    code: 'TP-NV01',
    name: 'Hạt nhựa PVC nguyên sinh SG5',
    unit: 'Kg',
    stockQty: 18500,
    macPrice: 28500,
    totalValuation: 527250000,
  },
  {
    code: 'TP-NV02',
    name: 'Bột đá Canxi Cacbonat CaCO3',
    unit: 'Tấn',
    stockQty: 12,
    macPrice: 1450000,
    totalValuation: 17400000,
  },
];

const AR_DEBT_DATA = [
  {
    partnerCode: 'KH-001',
    partnerName: 'Công ty Cổ phần Nội thất An Phát',
    creditLimit: 300000000,
    currentDebt: 320000000,
    overdueDays: 14,
    status: 'Vượt hạn mức',
  },
  {
    partnerCode: 'KH-002',
    partnerName: 'Công ty TNHH Xây dựng & Thương mại Hải Đăng',
    creditLimit: 200000000,
    currentDebt: 85000000,
    overdueDays: 0,
    status: 'Trong hạn mức',
  },
  {
    partnerCode: 'KH-003',
    partnerName: 'Đại lý Trang trí Nội thất Minh Đức',
    creditLimit: 150000000,
    currentDebt: 110000000,
    overdueDays: 5,
    status: 'Quá hạn 5 ngày',
  },
];

export const ReportsScreen: React.FC<ReportsScreenProps> = () => {
  const [activeTab, setActiveTab] = useState<'mac' | 'ar' | 'profit'>('mac');
  const [selectedMonth, setSelectedMonth] = useState('Tháng 10/2026');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    showToast('Đang kết xuất và tải tệp Excel báo cáo quản trị...');
  };

  const totalMacValuation = MAC_INVENTORY_DATA.reduce(
    (sum, item) => sum + item.totalValuation,
    0
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header (Màn hình 3.2.2.15) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Báo cáo quản trị doanh nghiệp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Màn hình 3.2.2.15 • Tổng hợp giá trị tồn kho theo MAC, công nợ phải thu và biên lợi nhuận kinh doanh
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Month Selector */}
          <div className="relative">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <Calendar size={14} className="text-slate-400" />
              <span>{selectedMonth}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          </div>

          {/* In báo cáo */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <Printer size={14} className="text-slate-500" />
            <span>In báo cáo</span>
          </button>

          {/* Xuất file Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
          >
            <FileSpreadsheet size={14} />
            <span>Xuất file Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-tabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('mac')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'mac'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <Layers size={15} />
          <span>Tồn kho giá vốn MAC</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ar')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'ar'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <DollarSign size={15} />
          <span>Công nợ khách hàng (AR)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profit')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'profit'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <TrendingUp size={15} />
          <span>Doanh thu lợi nhuận</span>
        </button>
      </div>

      {/* TAB 1: TỒN KHO GIÁ VỐN MAC */}
      {activeTab === 'mac' && (
        <div className="space-y-5">
          {/* KPI Summary Card */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  TỔNG GIÁ TRỊ TỒN KHO TOÀN HỆ THỐNG (MAC)
                </div>
                <div className="text-3xl font-extrabold text-teal-700 tracking-tight mt-1.5 font-mono">
                  {totalMacValuation.toLocaleString('vi-VN')} đ
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tính theo phương pháp Giá vốn bình quân di động (BR-29 / BR-55)
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                <Layers size={26} />
              </div>
            </div>
          </div>

          {/* Table: Chi tiết tồn kho theo MAC */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">MÃ SẢN PHẨM</th>
                    <th className="py-3 px-4">TÊN MẶT HÀNG</th>
                    <th className="py-3 px-4">ĐƠN VỊ TÍNH</th>
                    <th className="py-3 px-4 text-right">TỒN THỰC TẾ</th>
                    <th className="py-3 px-4 text-right">ĐƠN GIÁ VỐN MAC</th>
                    <th className="py-3 px-4 text-right">TỔNG GIÁ TRỊ TỒN KHO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {MAC_INVENTORY_DATA.map((item) => (
                    <tr
                      key={item.code}
                      className="hover:bg-slate-50/60 transition group cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {item.code}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {item.unit}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                        {item.stockQty.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 font-mono">
                        {item.macPrice.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-teal-700 font-mono">
                        {item.totalValuation.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CÔNG NỢ KHÁCH HÀNG (AR) */}
      {activeTab === 'ar' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  TỔNG CÔNG NỢ PHẢI THU KHÁCH HÀNG (AR)
                </div>
                <div className="text-3xl font-extrabold text-blue-700 tracking-tight mt-1.5 font-mono">
                  515.000.000 đ
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Tổng hợp nợ đọng phải thu từ các đại lý, công trình và đối tác bán buôn
                </p>
              </div>

              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <DollarSign size={26} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">MÃ ĐỐI TÁC</th>
                  <th className="py-3 px-4">TÊN KHÁCH HÀNG</th>
                  <th className="py-3 px-4 text-right">HẠN MỨC TÍN DỤNG</th>
                  <th className="py-3 px-4 text-right">CÔNG NỢ HIỆN TẠI</th>
                  <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {AR_DEBT_DATA.map((c) => (
                  <tr key={c.partnerCode} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">{c.partnerCode}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{c.partnerName}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-600">
                      {c.creditLimit.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-600">
                      {c.currentDebt.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          c.status === 'Vượt hạn mức'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : c.status.includes('Quá hạn')
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DOANH THU LỢI NHUẬN */}
      {activeTab === 'profit' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">DOANH THU THUẦN</div>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">1.840.500.000 đ</div>
              <div className="text-xs text-emerald-600 mt-1 font-semibold">▲ +12.5% so với tháng trước</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">GIÁ VỐN HÀNG BÁN (COGS)</div>
              <div className="text-2xl font-bold text-slate-900 font-mono mt-1">1.196.325.000 đ</div>
              <div className="text-xs text-slate-500 mt-1">Tỷ trọng: 65% doanh thu</div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">LỢI NHUẬN GỘP</div>
              <div className="text-2xl font-bold text-teal-700 font-mono mt-1">644.175.000 đ</div>
              <div className="text-xs text-teal-600 mt-1 font-semibold">Biên lợi nhuận: 35.0%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
