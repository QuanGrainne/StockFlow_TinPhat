// src/features/roles/components/sales/screens/PendingOrdersScreen.tsx
// Màn hình Danh sách đơn chờ xử lý (Ảnh 2 chuẩn theo thiết kế AI Studio)

import React, { useState, useEffect } from 'react';
import { PendingOrder, OrderChannel } from '../../../types';
import { salesService } from '../../../services/salesService';
import {
  Search,
  Plus,
  GitMerge,
  Phone,
  MessageCircle,
  Store,
  Layers,
  Trash2,
  Inbox,
} from 'lucide-react';

interface PendingOrdersScreenProps {
  onNavigate?: (screenId: string) => void;
}

export const PendingOrdersScreen: React.FC<PendingOrdersScreenProps> = ({ onNavigate }) => {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'ALL' | OrderChannel>('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isEmptyStateMode, setIsEmptyStateMode] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await salesService.getPendingOrders(search);
      setOrders(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const filteredOrders = isEmptyStateMode
    ? []
    : orders.filter((o) => {
        const matchChannel = channelFilter === 'ALL' || o.channel === channelFilter;
        const matchSearch =
          o.orderCode.toLowerCase().includes(search.toLowerCase()) ||
          o.customerName.toLowerCase().includes(search.toLowerCase()) ||
          o.customerPhone.includes(search);
        return matchChannel && matchSearch;
      });

  const getChannelBadge = (channel: OrderChannel) => {
    switch (channel) {
      case 'Zalo':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200">
            <MessageCircle size={13} className="text-blue-500" />
            <span>Zalo</span>
          </span>
        );
      case 'Điện thoại':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Phone size={13} className="text-emerald-600" />
            <span>Điện thoại</span>
          </span>
        );
      case 'Tại quầy':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Store size={13} className="text-amber-600" />
            <span>Tại quầy</span>
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
            <span>QUẢN LÝ KINH DOANH</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 normal-case font-normal">Màn hình 3.2.4.2</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Danh sách đơn chờ xử lý
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đơn hàng lưu tạm từ các kênh tư vấn, chưa trừ số lượng tồn kho vật lý (Quy tắc nghiệp vụ BR-08)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsEmptyStateMode(!isEmptyStateMode)}
            className="h-9 px-3.5 rounded-[8px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Inbox size={14} className="text-amber-600" />
            <span>Thử Empty State</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate && onNavigate('sales-consolidate')}
            className="h-9 px-4 rounded-[8px] bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-2xs"
          >
            <GitMerge size={15} className="text-[#2B6CB0]" />
            <span>Gộp đơn xuất</span>
          </button>

          <button
            type="button"
            className="h-9 px-4 rounded-[8px] bg-[#1E56A0] hover:bg-[#184682] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Plus size={16} />
            <span>Tạo đơn chờ</span>
          </button>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-white p-4 rounded-[8px] border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã đơn, tên khách, số điện thoại..."
            className="w-full h-9 pl-9 pr-3 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2B6CB0] focus:bg-white transition"
          />
        </div>

        {/* Channel Filter & Status Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500 font-medium mr-1">Kênh:</span>
            <button
              type="button"
              onClick={() => setChannelFilter('ALL')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-bold transition cursor-pointer ${
                channelFilter === 'ALL'
                  ? 'bg-[#1E56A0] text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tất cả kênh
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('Zalo')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition cursor-pointer ${
                channelFilter === 'Zalo'
                  ? 'bg-[#1E56A0] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Zalo
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('Điện thoại')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition cursor-pointer ${
                channelFilter === 'Điện thoại'
                  ? 'bg-[#1E56A0] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Điện thoại
            </button>
            <button
              type="button"
              onClick={() => setChannelFilter('Tại quầy')}
              className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition cursor-pointer ${
                channelFilter === 'Tại quầy'
                  ? 'bg-[#1E56A0] text-white font-bold shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Tại quầy
            </button>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 pr-8 rounded-[6px] bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium focus:outline-none focus:border-[#2B6CB0] cursor-pointer"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ gộp đơn</option>
              <option value="CONSOLIDATED">Đã gộp đơn</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Table of Orders */}
      <div className="bg-white rounded-[8px] border border-slate-200 shadow-2xs overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Inbox size={24} />
            </div>
            <div className="text-sm font-bold text-slate-700">Không có đơn chờ xử lý nào</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Hiện tại danh sách đơn hàng chờ đã được xử lý hết hoặc không khớp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">MÃ ĐƠN</th>
                  <th className="py-3 px-4">KÊNH TIẾP NHẬN</th>
                  <th className="py-3 px-4">KHÁCH HÀNG</th>
                  <th className="py-3 px-4 text-right">GIÁ TRỊ THUẦN (NET)</th>
                  <th className="py-3 px-4">GHI CHÚ GIAO NHẬN</th>
                  <th className="py-3 px-4">THỜI GIAN TẠO</th>
                  <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
                  <th className="py-3 px-4 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-blue-50/30 transition">
                    {/* Mã đơn */}
                    <td className="py-3.5 px-4 font-mono font-bold text-[#2B6CB0]">
                      {order.orderCode}
                    </td>

                    {/* Kênh tiếp nhận */}
                    <td className="py-3.5 px-4">
                      {getChannelBadge(order.channel)}
                    </td>

                    {/* Khách hàng */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{order.customerName}</div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {order.customerCode} • {order.customerPhone}
                      </div>
                    </td>

                    {/* Giá trị thuần (NET) */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                      {order.netAmount.toLocaleString('vi-VN')} đ
                    </td>

                    {/* Ghi chú giao nhận */}
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-500">
                      {order.deliveryNotes || 'Không có ghi chú'}
                    </td>

                    {/* Thời gian tạo */}
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {order.createdAtTime}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-[4px] bg-blue-50 text-[#2B6CB0] font-semibold text-[11px] border border-blue-200">
                        Chờ gộp đơn
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onNavigate && onNavigate('sales-consolidate')}
                          className="p-1.5 text-slate-400 hover:text-[#2B6CB0] hover:bg-blue-50 rounded-[4px] transition cursor-pointer"
                          title="Gộp đơn xuất kho"
                        >
                          <Layers size={15} />
                        </button>
                        <button
                          type="button"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[4px] transition cursor-pointer"
                          title="Xóa đơn chờ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
