// src/app/(dashboard)/orders/page.tsx
// Màn hình Quản lý Đơn hàng & Liên kết mở Màn hình Bán hàng POS tại quầy

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Plus,
  Search,
  RefreshCw,
  ExternalLink,
  Store,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { posService } from '@/features/pos/services/posService';
import { Tag } from 'antd';

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadOrders = async () => {
    setLoading(true);
    try {
      const data = await posService.getRecentOrders();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = orders.filter((o) => {
    if (!search.trim()) return true;
    const lower = search.toLowerCase();
    return (
      (o.orderCode && o.orderCode.toLowerCase().includes(lower)) ||
      (o.partnerName && o.partnerName.toLowerCase().includes(lower)) ||
      (o.partnerPhone && o.partnerPhone.includes(lower))
    );
  });

  return (
    <div className="space-y-5">
      {/* ─── 1. Header Banner & Call-to-Action mở POS ─── */}
      <div className="bg-white p-6 rounded-[8px] border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#0F60B6] flex items-center gap-1.5 uppercase tracking-wide">
            <Store size={14} />
            <span>NGHIỆP VỤ BÁN HÀNG TẠI QUẦY & B2B</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Quản lý Đơn bán hàng & Thu ngân POS
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi hóa đơn bán lẻ tại quầy, bán buôn đại lý và tiến độ xuất kho trừ tồn
          </p>
        </div>

        {/* Nút to mở Màn hình bán hàng POS */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadOrders}
            className="h-9 px-3 rounded-[6px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
            title="Làm mới danh sách"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Làm mới</span>
          </button>

          <button
            type="button"
            onClick={() => router.push('/pos')}
            className="h-9 px-4 rounded-[6px] bg-[#0F60B6] hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
          >
            <Store size={16} />
            <span>Mở Màn hình Bán hàng POS</span>
            <ExternalLink size={13} className="opacity-80" />
          </button>
        </div>
      </div>

      {/* ─── 2. Bảng Danh sách Hóa đơn gần đây ─── */}
      <div className="bg-white rounded-[8px] border border-slate-200 shadow-2xs overflow-hidden">
        {/* Thanh tìm kiếm */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div className="relative w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo mã đơn, tên khách, số điện thoại..."
              className="w-full h-8 pl-8 pr-3 rounded-[5px] border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0F60B6]"
            />
          </div>

          <div className="text-xs text-slate-500">
            Tổng cộng: <strong className="text-slate-800">{filteredOrders.length}</strong> đơn hàng
          </div>
        </div>

        {/* Bảng dữ liệu */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-4">Mã đơn</th>
                <th className="py-2.5 px-4">Khách hàng</th>
                <th className="py-2.5 px-4">Ngày tạo</th>
                <th className="py-2.5 px-4 text-center">Số SP</th>
                <th className="py-2.5 px-4 text-right">Tổng tiền</th>
                <th className="py-2.5 px-4 text-right">Đã thanh toán</th>
                <th className="py-2.5 px-4 text-right">Còn nợ</th>
                <th className="py-2.5 px-4 text-center">Thanh toán</th>
                <th className="py-2.5 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <FileText size={24} className="text-slate-300" />
                      <span>Chưa có đơn hàng nào hoặc không tìm thấy đơn phù hợp.</span>
                      <button
                        type="button"
                        onClick={() => router.push('/pos')}
                        className="mt-2 text-xs text-[#0F60B6] font-bold hover:underline"
                      >
                        Bấm vào đây để tạo đơn bán hàng đầu tiên trên POS
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr key={ord.orderId} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-[#0F60B6]">
                      {ord.orderCode}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{ord.partnerName}</div>
                      {ord.partnerPhone && (
                        <div className="text-[11px] text-slate-400">{ord.partnerPhone}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {ord.orderDate
                        ? new Date(ord.orderDate).toLocaleString('vi-VN')
                        : 'Vừa xong'}
                    </td>
                    <td className="py-2.5 px-4 text-center font-bold text-slate-700">
                      {ord.totalItems}
                    </td>
                    <td className="py-2.5 px-4 text-right font-black text-slate-900">
                      {currencyFormatter.format(ord.totalAmount)} đ
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-emerald-600">
                      {currencyFormatter.format(ord.paidAmount)} đ
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-rose-600">
                      {currencyFormatter.format(ord.outstandingAmount)} đ
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Tag
                        color={
                          ord.paymentStatus === 'PAID'
                            ? 'success'
                            : ord.paymentStatus === 'PARTIAL'
                            ? 'warning'
                            : 'error'
                        }
                      >
                        {ord.paymentStatus === 'PAID'
                          ? 'Đã thanh toán'
                          : ord.paymentStatus === 'PARTIAL'
                          ? 'Thanh toán 1 phần'
                          : 'Ghi nợ'}
                      </Tag>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <Tag color={ord.status === 'COMPLETED' ? 'blue' : 'default'}>
                        {ord.status === 'COMPLETED' ? 'Hoàn thành' : 'Đơn tạm'}
                      </Tag>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
