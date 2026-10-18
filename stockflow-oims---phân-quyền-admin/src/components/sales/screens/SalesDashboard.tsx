// src/components/sales/screens/SalesDashboard.tsx
// Dashboard tổng quan kinh doanh (Sales): KPIs doanh thu, nợ khách hàng, đơn pending

import React, { useEffect, useState } from 'react';
import { salesService } from '../../../services/salesService';
import { PendingOrder, Customer, CreditLimitRequest } from '../../../types';
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  Building,
  Plus,
  GitMerge,
  ArrowRight,
} from 'lucide-react';

interface SalesDashboardProps {
  onNavigate: (screenId: string) => void;
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ onNavigate }) => {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [requests, setRequests] = useState<CreditLimitRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ord, cust, req] = await Promise.all([
          salesService.getPendingOrders(),
          salesService.getCustomers(),
          salesService.getCreditLimitRequests(),
        ]);
        setOrders(ord);
        setCustomers(cust);
        setRequests(req);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const totalReceivables = customers.reduce((sum, c) => sum + c.currentDebt, 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;
  const customersOverLimit = customers.filter((c) => c.currentDebt > c.creditLimit);
  const pendingRequestsCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          Tổng quan Kinh doanh (Sales Dashboard)
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Theo dõi tiến độ đơn hàng B2B, quản lý hạn mức nợ và kiểm soát rủi ro thu hồi vốn
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="p-4 bg-white rounded-[8px] border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Đơn chờ xử lý
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {pendingOrdersCount} <span className="text-xs font-normal text-slate-400">đơn</span>
            </div>
            <div className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
              <Clock size={12} /> Cần kiểm tra tồn & gộp xuất
            </div>
          </div>
          <div className="w-11 h-11 rounded-[8px] bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-4 bg-white rounded-[8px] border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Tổng nợ khách hàng
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {(totalReceivables / 1000000).toFixed(1)} <span className="text-xs font-normal text-slate-400">tr đ</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {customers.length} đối tác B2B
            </div>
          </div>
          <div className="w-11 h-11 rounded-[8px] bg-blue-50 text-[#2B6CB0] flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-4 bg-white rounded-[8px] border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Khách vượt hạn mức
            </div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              {customersOverLimit.length} <span className="text-xs font-normal text-slate-400">đối tác</span>
            </div>
            <div className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} /> Cần xin duyệt nâng hạn mức
            </div>
          </div>
          <div className="w-11 h-11 rounded-[8px] bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>

        {/* Card 4 */}
        <div className="p-4 bg-white rounded-[8px] border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Yêu cầu hạn mức chờ duyệt
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {pendingRequestsCount} <span className="text-xs font-normal text-slate-400">hồ sơ</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Đang đợi Quản lý phản hồi
            </div>
          </div>
          <div className="w-11 h-11 rounded-[8px] bg-purple-50 text-purple-600 flex items-center justify-center">
            <Building size={20} />
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="p-4 bg-gradient-to-r from-[#2B6CB0] to-[#1A4971] text-white rounded-[8px] flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div>
          <h3 className="text-base font-bold">Thao tác nhanh cho nhân viên Sales</h3>
          <p className="text-xs text-white/80 mt-0.5">
            Lập đơn hàng mới, kiểm tra hạn mức tín dụng và gửi lệnh yêu cầu xuất kho đến Thủ kho
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('sales-orders')}
            className="px-4 py-2 bg-white text-[#2B6CB0] rounded-[6px] text-xs font-bold hover:bg-slate-50 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Plus size={15} />
            <span>Xem danh sách đơn</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('sales-credit-limits')}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-[6px] text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border border-white/20"
          >
            <AlertTriangle size={15} />
            <span>Xin nâng hạn mức</span>
          </button>
        </div>
      </div>

      {/* Grid Recent Orders & Over-limit Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Pending Orders */}
        <div className="bg-white rounded-[8px] border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock size={16} className="text-amber-500" />
              <span>Đơn hàng chờ xử lý gần nhất</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('sales-orders')}
              className="text-xs text-[#2B6CB0] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Xem tất cả</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {orders.slice(0, 4).map((order) => (
              <div
                key={order.id}
                className="p-3 rounded-[6px] border border-slate-100 hover:border-slate-200 bg-[#F7FAFC] flex items-center justify-between text-xs transition"
              >
                <div>
                  <div className="font-bold text-[#2B6CB0] font-mono">{order.orderCode}</div>
                  <div className="text-slate-800 font-medium mt-0.5">{order.customerName}</div>
                  <div className="text-slate-400 text-[11px]">Ngày hẹn: {order.deliveryDate}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">
                    {order.totalAmount.toLocaleString('vi-VN')} đ
                  </div>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                    {order.status === 'PENDING' ? 'Chờ xử lý' : 'Đã gộp'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Khách hàng cần lưu ý hạn mức */}
        <div className="bg-white rounded-[8px] border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building size={16} className="text-[#2B6CB0]" />
              <span>Theo dõi công nợ đối tác B2B</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('sales-credit-limits')}
              className="text-xs text-[#2B6CB0] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Hạn mức nợ</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="space-y-3">
            {customers.map((cust) => {
              const isOver = cust.currentDebt > cust.creditLimit;
              const percent = Math.min(100, Math.round((cust.currentDebt / cust.creditLimit) * 100));

              return (
                <div
                  key={cust.id}
                  className="p-3 rounded-[6px] border border-slate-100 bg-[#F7FAFC] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">{cust.name}</span>
                    <span
                      className={`font-mono font-bold ${
                        isOver ? 'text-rose-600' : 'text-slate-700'
                      }`}
                    >
                      {cust.currentDebt.toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isOver ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-[#2B6CB0]'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Thời hạn nợ: {cust.paymentTermDays} ngày</span>
                    <span>
                      Hạn mức: {cust.creditLimit.toLocaleString('vi-VN')} đ ({percent}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
