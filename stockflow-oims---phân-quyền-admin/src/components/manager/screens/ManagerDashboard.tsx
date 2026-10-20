// src/components/manager/screens/ManagerDashboard.tsx
// Dashboard tổng quan điều hành (Executive Dashboard cho Manager theo Report 3)

import React, { useEffect, useState } from 'react';
import { managerService } from '../../../services/managerService';
import {
  TrendingUp,
  ShieldAlert,
  Cpu,
  Wallet,
  GitMerge,
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface ManagerDashboardProps {
  onNavigate: (screenId: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onNavigate }) => {
  const [kpis, setKpis] = useState<{
    totalReceivables: number;
    totalReceipts: number;
    totalPayments: number;
    netCashFlow: number;
    pendingApprovalsCount: number;
    activeProductionOrders: number;
    activeBomsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const data = await managerService.getDashboardKpis();
        setKpis(data);
      } finally {
        setLoading(false);
      }
    };
    fetchKpis();
  }, []);

  if (loading || !kpis) {
    return (
      <div className="p-12 text-center text-slate-400">
        <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-[#2B6CB0] rounded-full animate-spin mb-2" />
        <div>Đang tải chỉ số điều hành...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Tổng quan Điều hành (Manager Executive Dashboard)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Báo cáo chỉ số kinh doanh, phê duyệt hạn mức nợ, quản lý công thức BOM và điều phối sản xuất
        </p>
      </div>

      {/* Urgent Alert Banner (Nếu có yêu cầu chờ duyệt) */}
      {kpis.pendingApprovalsCount > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-[8px] flex items-center justify-between text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <span className="font-bold">Có {kpis.pendingApprovalsCount} yêu cầu nâng hạn mức tín dụng từ Sales</span>
              <p className="text-amber-700 text-[11px] mt-0.5">
                Các đơn hàng đang tạm giữ do vượt hạn mức nợ, vui lòng xét duyệt để giải phóng lệnh xuất kho.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('manager-approvals')}
            className="px-4 py-2 bg-[#2B6CB0] hover:bg-[#23568c] text-white rounded-[6px] font-semibold text-xs transition cursor-pointer shadow-xs"
          >
            Vào hộp thư duyệt ngay
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng nợ phải thu */}
        <div className="p-4 bg-white rounded-[8px] border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Nợ phải thu (Receivables)
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {(kpis.totalReceivables / 1000000).toFixed(1)} <span className="text-xs font-normal text-slate-400">tr đ</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Hạn mức cấp: 1.15 tỷ đ
            </div>
          </div>
          <div className="w-11 h-11 rounded-[8px] bg-rose-50 text-rose-600 flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Card 2: Dòng tiền thuần */}
        <div className="p-4 bg-white rounded-[8px] border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Dòng tiền thuần (Net Cash)
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {(kpis.netCashFlow / 1000000).toFixed(1)} <span className="text-xs font-normal text-slate-400">tr đ</span>
            </div>
            <div className="text-[11px] text-emerald-600 mt-1">
              Thu: {(kpis.totalReceipts / 1000000).toFixed(0)}tr | Chi: {(kpis.totalPayments / 1000000).toFixed(0)}tr
            </div>
          </div>
          <div className="w-11 h-11 rounded-[8px] bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Wallet size={20} />
          </div>
        </div>

        {/* Card 3: Lệnh sản xuất đang chạy */}
        <div className="p-4 bg-white rounded-[8px] border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Lệnh SX đang chạy
            </div>
            <div className="text-2xl font-bold text-[#2B6CB0] mt-1">
              {kpis.activeProductionOrders} <span className="text-xs font-normal text-slate-400">lệnh</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Tại các xưởng cơ khí
            </div>
          </div>
          <div className="w-11 h-11 rounded-[8px] bg-blue-50 text-[#2B6CB0] flex items-center justify-center">
            <GitMerge size={20} />
          </div>
        </div>

        {/* Card 4: Định mức BOM áp dụng */}
        <div className="p-4 bg-white rounded-[8px] border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Công thức định mức BOM
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {kpis.activeBomsCount} <span className="text-xs font-normal text-slate-400">công thức</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Sơn tĩnh điện & Mạ kẽm
            </div>
          </div>
          <div className="w-11 h-11 rounded-[8px] bg-purple-50 text-purple-600 flex items-center justify-center">
            <Cpu size={20} />
          </div>
        </div>
      </div>

      {/* Feature Modules Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Module 1: Định mức BOM */}
        <div className="bg-white rounded-[8px] border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-[8px] bg-blue-50 text-[#2B6CB0] flex items-center justify-center mb-3">
              <Cpu size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Quản lý Định mức BOM</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Gộp toàn bộ luồng cấu hình Bill of Materials, định mức NVL cho máng cáp, khay cáp và tỉ lệ hao hụt xưởng.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('manager-bom')}
            className="mt-4 text-xs font-semibold text-[#2B6CB0] hover:underline flex items-center gap-1 cursor-pointer pt-3 border-t border-slate-100"
          >
            <span>Mở màn hình BOM Hub</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Module 2: Hạn mức nợ đối tác */}
        <div className="bg-white rounded-[8px] border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-[8px] bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Users size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Hạn mức Tín dụng B2B</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Thiết lập chính sách nợ tối đa (Credit Limit) và số ngày nợ cho từng đối tác công trình của Tín Phát.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('manager-partners')}
            className="mt-4 text-xs font-semibold text-[#2B6CB0] hover:underline flex items-center gap-1 cursor-pointer pt-3 border-t border-slate-100"
          >
            <span>Quản lý hạn mức nợ</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Module 3: Sổ quỹ Thu Chi */}
        <div className="bg-white rounded-[8px] border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="w-9 h-9 rounded-[8px] bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
              <Wallet size={20} />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Sổ quỹ Thu / Chi</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Gộp luồng tạo phiếu thu và phiếu chi vào một popup duy nhất, quản lý dòng tiền mặt và ngân hàng.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('manager-cashflow')}
            className="mt-4 text-xs font-semibold text-[#2B6CB0] hover:underline flex items-center gap-1 cursor-pointer pt-3 border-t border-slate-100"
          >
            <span>Lập chứng từ thu chi</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
