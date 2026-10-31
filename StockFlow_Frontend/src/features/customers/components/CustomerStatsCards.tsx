// src/features/customers/components/CustomerStatsCards.tsx
// 4 thẻ chỉ số KPI chuẩn theo ảnh thiết kế Quản lý khách hàng

import React from 'react';
import { Users, CheckCircle2, CreditCard, Wallet, AlertTriangle } from 'lucide-react';
import { CustomerStats } from '../types';

interface CustomerStatsCardsProps {
  stats: CustomerStats;
  loading?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const CustomerStatsCards: React.FC<CustomerStatsCardsProps> = ({ stats, loading }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
      {/* 1. Tổng khách hàng */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Tổng khách hàng
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E56A0] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-[28px] font-bold text-slate-900 leading-tight">
              {stats.totalCustomers.toLocaleString('vi-VN')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              +{stats.newThisMonth} tháng này
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2.5">Hồ sơ khách hàng định danh</p>
      </div>

      {/* 2. Đang hoạt động */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Đang hoạt động
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl lg:text-[28px] font-bold text-slate-900 leading-tight">
              {stats.activeCustomers.toLocaleString('vi-VN')}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              {stats.activePercentage.toFixed(1)}% tổng KH
            </span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-2.5">
          {stats.inactiveCustomers} khách tạm khóa hoặc ngừng GD
        </p>
      </div>

      {/* 3. Khách có nợ cần thu */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Khách có nợ cần thu
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#D32F2F] flex items-center justify-center">
              <CreditCard size={16} />
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl lg:text-[26px] font-bold text-[#D32F2F] leading-tight tracking-tight">
              {currencyFormatter.format(stats.totalDebt)} <span className="text-lg font-medium">đ</span>
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2.5">
          <span className="text-xs text-slate-500">{stats.debtCustomersCount} khách hàng</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D32F2F] bg-rose-50 px-2 py-0.5 rounded-md">
            <AlertTriangle size={12} /> {stats.overdueCount} nợ quá hạn
          </span>
        </div>
      </div>

      {/* 4. Hạn mức tín dụng cấp */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Hạn mức tín dụng cấp
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#1E56A0] bg-blue-50 px-1.5 py-0.5 rounded">
                {stats.creditUsagePercent}% SD
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E56A0] flex items-center justify-center">
                <Wallet size={16} />
              </div>
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl lg:text-[26px] font-bold text-slate-900 leading-tight tracking-tight">
              {currencyFormatter.format(stats.totalCreditLimit)} <span className="text-lg font-medium">đ</span>
            </span>
          </div>
        </div>
        <div className="w-full mt-3">
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-[#1E56A0] h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, stats.creditUsagePercent)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

