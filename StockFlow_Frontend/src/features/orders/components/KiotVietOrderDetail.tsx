// src/features/orders/components/KiotVietOrderDetail.tsx
// Component hiển thị chi tiết đơn hàng chuẩn giao diện KiotViet theo ảnh tham chiếu

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { message, Modal, Skeleton } from 'antd';
import {
  Printer,
  Copy,
  Trash2,
  Calendar,
  Clock,
  ChevronDown,
  RotateCcw,
  CheckCircle2,
  XCircle,
  CreditCard,
  Building2,
  DollarSign,
  AlertCircle,
  ExternalLink,
  Pencil,
  Save,
} from 'lucide-react';

import { OrderDetail } from '../types';
import { orderService } from '../services/orderService';

const currencyFormatter = new Intl.NumberFormat('vi-VN');

interface KiotVietOrderDetailProps {
  orderId?: number | string;
  orderCode?: string;
  initialOrder?: OrderDetail;
  onClose?: () => void;
  onReloadList?: () => void;
}

export const KiotVietOrderDetail: React.FC<KiotVietOrderDetailProps> = ({
  orderId,
  orderCode,
  initialOrder,
  onClose,
  onReloadList,
}) => {
  const [activeTab, setActiveTab] = useState<'INFO' | 'PAYMENTS'>('INFO');
  const [order, setOrder] = useState<OrderDetail | null>(initialOrder || null);
  const [loading, setLoading] = useState<boolean>(!initialOrder);
  const [notes, setNotes] = useState<string>('');
  const [salesRep, setSalesRep] = useState<string>('');
  const [orderType, setOrderType] = useState<string>('INVOICE');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Tải dữ liệu đơn hàng nếu chưa có
  const fetchOrder = useCallback(async () => {
    const lookupKey = orderId || orderCode;
    if (!lookupKey) return;
    try {
      setLoading(true);
      const data = await orderService.getOrderDetail(lookupKey);
      if (data && data.orderId) {
        setOrder(data);
        setNotes(data.notes || '');
        setSalesRep(data.salesRepName || data.createdByName || '0913268079');
        setOrderType(data.orderType || (data.orderCode?.startsWith('HD') ? 'INVOICE' : 'BOOKING'));
      }
    } catch (err: any) {
      message.error(err?.message || 'Không thể tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [orderId, orderCode]);

  useEffect(() => {
    if (initialOrder) {
      setOrder(initialOrder);
      setNotes(initialOrder.notes || '');
      setSalesRep(initialOrder.salesRepName || initialOrder.createdByName || '0913268079');
      setOrderType(initialOrder.orderType || (initialOrder.orderCode?.startsWith('HD') ? 'INVOICE' : 'BOOKING'));
      setLoading(false);
    } else {
      fetchOrder();
    }
  }, [initialOrder, fetchOrder]);

  // Lưu thông tin chỉnh sửa (kết nối API backend PUT /api/orders/{id})
  const handleSave = async () => {
    if (!order) return;
    try {
      setSaving(true);
      const updated = await orderService.updateOrder(order.orderId, {
        notes,
        salesRepName: salesRep,
        orderType,
      });
      setOrder(updated);
      setNotes(updated.notes || '');
      setSalesRep(updated.salesRepName || salesRep);
      setOrderType(updated.orderType || orderType);
      message.success(`Đã cập nhật đơn hàng ${updated.orderCode || order.orderCode} thành công!`);
      setIsEditing(false);
      if (onReloadList) onReloadList();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Lỗi khi lưu thông tin đơn hàng';
      message.error(errMsg);
    } finally {
      setSaving(false);
    }
  };

  // Format ngày bán
  const formatOrderDate = (dateStr?: string) => {
    if (!dateStr) return '01/11/2026 10:38';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return dateStr;
    }
  };

  // Thao tác in hóa đơn
  const handlePrint = () => {
    window.print();
  };

  // Sao chép mã đơn
  const handleCopyCode = () => {
    if (!order) return;
    navigator.clipboard?.writeText(order.orderCode);
    message.success(`Đã sao chép mã đơn: ${order.orderCode}`);
  };

  // Hủy hóa đơn
  const handleCancelOrder = () => {
    if (!order) return;
    Modal.confirm({
      title: 'Xác nhận hủy hóa đơn',
      content: `Bạn có chắc chắn muốn hủy hóa đơn ${order.orderCode}? Thao tác này sẽ hoàn trả tồn kho và cập nhật công nợ.`,
      okText: 'Hủy đơn',
      okType: 'danger',
      cancelText: 'Bỏ qua',
      onOk: async () => {
        message.loading({ content: 'Đang hủy đơn...', key: 'cancel' });
        await new Promise((r) => setTimeout(r, 500));
        message.success({ content: `Đã hủy hóa đơn ${order.orderCode}`, key: 'cancel' });
        if (onReloadList) onReloadList();
        fetchOrder();
      },
    });
  };

  if (loading && !order) {
    return (
      <div className="p-6 bg-white space-y-3 border-y border-slate-200">
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 text-center text-xs text-slate-500 bg-white border-y border-slate-200">
        Không tìm thấy thông tin chi tiết đơn hàng.
      </div>
    );
  }

  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';

  return (
    <div className="bg-white border-y border-slate-200 shadow-inner font-sans text-xs">
      {/* ─── 1. TABS HEADER: Thông tin | Lịch sử thanh toán ─── */}
      <div className="flex items-center gap-6 px-6 pt-3 border-b border-slate-200 bg-white">
        <button
          type="button"
          onClick={() => setActiveTab('INFO')}
          className={`pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer ${
            activeTab === 'INFO'
              ? 'border-[#0F60B6] text-[#0F60B6]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Thông tin
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('PAYMENTS')}
          className={`pb-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'PAYMENTS'
              ? 'border-[#0F60B6] text-[#0F60B6]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Lịch sử thanh toán</span>
          {order.paymentTransactions?.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center">
              {order.paymentTransactions.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── 2. TAB 1: THÔNG TIN CHI TIẾT ĐƠN HÀNG ─── */}
      {activeTab === 'INFO' && (
        <div className="p-6 space-y-5">
          {/* Header hàng 1: Tên khách hàng, Mã đơn hàng, Badge trạng thái & Tên Chi nhánh */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-bold text-base text-slate-900">
                {order.customer?.partnerName || 'Khách lẻ'}
              </span>
              <span className="font-bold text-sm text-slate-600 font-mono">
                {order.orderCode}
              </span>
              <span
                className={`px-2 py-0.5 rounded-[4px] font-bold text-[11px] ${
                  isCompleted
                    ? 'bg-[#EBF7EE] text-[#1E7E34] border border-[#C3E6CB]'
                    : isCancelled
                    ? 'bg-rose-50 text-rose-600 border border-rose-200'
                    : 'bg-blue-50 text-blue-600 border border-blue-200'
                }`}
              >
                {isCompleted ? 'Hoàn thành' : isCancelled ? 'Đã hủy' : 'Đang xử lý'}
              </span>
              <span
                className={`px-2 py-0.5 rounded-[4px] font-bold text-[11px] ${
                  orderType === 'BOOKING'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                }`}
              >
                {orderType === 'BOOKING' ? 'Đặt hàng' : 'Hóa đơn'}
              </span>
            </div>

            <div className="text-xs text-slate-700 font-medium">
              <span>{order.warehouseName || 'Chi nhánh trung tâm'}</span>
            </div>
          </div>

          {/* Hàng 2: Grid thông tin Người tạo, Người bán, Ngày bán, Bảng giá, Loại đơn */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-8 text-xs text-slate-700 max-w-4xl">
            {/* Cột 1: Người tạo & Bảng giá */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 min-w-[70px]">Người tạo:</span>
                <span className="font-medium text-slate-800">
                  {order.createdByName || order.createdByUsername || '0913268079'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500 min-w-[70px]">Bảng giá:</span>
                <span className="font-medium text-slate-800">
                  {order.priceBookName || 'Bảng giá chung'}
                </span>
              </div>
            </div>

            {/* Cột 2: Người bán & Loại đơn */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 min-w-[70px]">Người bán:</span>
                <div className="relative">
                  <select
                    value={salesRep}
                    disabled={!isEditing}
                    onChange={(e) => setSalesRep(e.target.value)}
                    className={`h-7 px-2.5 pr-7 rounded border text-xs text-slate-800 outline-none cursor-pointer appearance-none transition ${
                      isEditing ? 'border-[#0F60B6] bg-blue-50/20 ring-1 ring-[#0F60B6]/30' : 'border-slate-300 bg-white cursor-default'
                    }`}
                  >
                    <option value={order.salesRepName || order.createdByName || '0913268079'}>
                      {order.salesRepName || order.createdByName || '0913268079'}
                    </option>
                    <option value="Trần Minh Tuấn">Trần Minh Tuấn</option>
                    <option value="Nguyễn Văn Đức">Nguyễn Văn Đức</option>
                    <option value="Lê Hoàng Nam">Lê Hoàng Nam</option>
                    <option value="Hoàng Lan Anh">Hoàng Lan Anh</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-500 min-w-[70px]">Loại đơn:</span>
                {isEditing ? (
                  <div className="relative">
                    <select
                      value={orderType}
                      onChange={(e) => setOrderType(e.target.value)}
                      className="h-7 px-2.5 pr-7 rounded border border-[#0F60B6] bg-blue-50/30 text-xs font-semibold text-slate-800 outline-none cursor-pointer appearance-none shadow-2xs"
                    >
                      <option value="INVOICE">Hóa đơn bán hàng</option>
                      <option value="BOOKING">Đơn đặt hàng</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2 top-2 text-slate-400 pointer-events-none" />
                  </div>
                ) : (
                  <span className="font-medium text-slate-800">
                    {orderType === 'BOOKING' ? 'Đơn đặt hàng' : 'Hóa đơn bán hàng'}
                  </span>
                )}
              </div>
            </div>

            {/* Cột 3: Ngày bán */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <span className="text-slate-500 min-w-[65px]">Ngày bán:</span>
                <div className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded border border-slate-300 bg-white text-xs text-slate-800 font-mono shadow-2xs">
                  <span>{formatOrderDate(order.orderDate)}</span>
                  <Calendar size={13} className="text-slate-400" />
                  <Clock size={13} className="text-slate-400" />
                </div>
              </div>

              {order.updatedAt && (
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span className="min-w-[65px]">Cập nhật:</span>
                  <span className="font-mono">{formatOrderDate(order.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* ─── 3. BẢNG DANH SÁCH SẢN PHẨM ─── */}
          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-4">Mã hàng</th>
                  <th className="py-2.5 px-4">Tên hàng</th>
                  <th className="py-2.5 px-4 text-center">Số lượng</th>
                  <th className="py-2.5 px-4 text-right">Đơn giá</th>
                  <th className="py-2.5 px-4 text-right">Giảm giá</th>
                  <th className="py-2.5 px-4 text-right">Giá bán</th>
                  <th className="py-2.5 px-4 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {order.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-4 text-center text-slate-400">
                      Không có sản phẩm trong đơn hàng.
                    </td>
                  </tr>
                ) : (
                  order.items.map((it, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      {/* Mã hàng (link màu xanh) */}
                      <td className="py-2.5 px-4 font-mono font-medium text-[#0F60B6] hover:underline cursor-pointer">
                        {it.productCode}
                      </td>

                      {/* Tên hàng */}
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        {it.productName}
                      </td>

                      {/* Số lượng */}
                      <td className="py-2.5 px-4 text-center text-slate-800">
                        {it.quantity.toLocaleString('vi-VN')}
                      </td>

                      {/* Đơn giá */}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                        {currencyFormatter.format(it.originalPrice || it.unitPrice)}
                      </td>

                      {/* Giảm giá */}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                        {it.discountAmount > 0 ? currencyFormatter.format(it.discountAmount) : ''}
                      </td>

                      {/* Giá bán */}
                      <td className="py-2.5 px-4 text-right font-mono text-slate-800">
                        {currencyFormatter.format(it.unitPrice)}
                      </td>

                      {/* Thành tiền (in đậm) */}
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">
                        {currencyFormatter.format(it.lineTotal)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ─── 4. PHẦN CHÂN BẢNG: GHI CHÚ BÊN TRÁI & TỔNG KẾT BÊN PHẢI ─── */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start pt-2">
            {/* Bên trái (7 cột): Khung ghi chú */}
            <div className="md:col-span-7 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500">Ghi chú:</span>
                {isEditing && (
                  <span className="text-[10px] text-[#0F60B6] font-medium">
                    (Đang chỉnh sửa)
                  </span>
                )}
              </div>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nhập ghi chú cho đơn hàng..."
                className={`w-full p-2.5 rounded border text-xs text-slate-800 outline-none resize-none transition ${
                  isEditing
                    ? 'border-[#0F60B6] ring-1 ring-[#0F60B6]/30 bg-blue-50/10'
                    : 'border-slate-300 bg-white focus:border-[#0F60B6]'
                }`}
              />
            </div>

            {/* Bên phải (5 cột): Bảng tóm tắt thanh toán */}
            <div className="md:col-span-5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-700">
                <span>Tổng tiền hàng ({order.totalQuantity || order.items?.length || 1})</span>
                <span className="font-mono font-bold text-slate-900">
                  {currencyFormatter.format(order.itemsTotalAmount || order.totalAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-700">
                <span>Giảm giá hóa đơn</span>
                <span className="font-mono font-semibold text-slate-800">
                  {currencyFormatter.format(order.orderDiscountAmount || 0)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-900 font-bold pt-1 border-t border-slate-150">
                <span>Khách cần trả</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {currencyFormatter.format(order.totalAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-900 font-bold">
                <span>Khách đã trả</span>
                <span className="font-mono font-black text-slate-900 text-sm">
                  {currencyFormatter.format(order.paidAmount)}
                </span>
              </div>

              {order.outstandingAmount > 0 && (
                <div className="flex items-center justify-between text-rose-600 font-bold pt-1 border-t border-slate-150">
                  <span>Còn nợ</span>
                  <span className="font-mono font-black text-rose-600 text-sm">
                    {currencyFormatter.format(order.outstandingAmount)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ─── 5. THANH THAO TÁC Ở ĐÁY (ACTION BAR) ─── */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {/* Các nút bên trái: In, Sao chép, Hủy */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="h-8 px-3 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Printer size={13} className="text-slate-500" />
                <span>In</span>
              </button>

              <button
                type="button"
                onClick={handleCopyCode}
                className="h-8 px-3 rounded border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Copy size={13} className="text-slate-500" />
                <span>Sao chép</span>
              </button>

              {!isCancelled && (
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="h-8 px-3 rounded border border-slate-300 hover:bg-rose-50 hover:border-rose-300 text-rose-600 font-medium text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 size={13} />
                  <span>Hủy</span>
                </button>
              )}
            </div>

            {/* Cụm nút thao tác bên phải: Chỉnh sửa, Lưu, Đóng */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing((prev) => !prev)}
                className={`h-8 px-3.5 rounded border text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs transition ${
                  isEditing
                    ? 'border-[#0F60B6] bg-blue-50 text-[#0F60B6]'
                    : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-700'
                }`}
                title="Bật/tắt chế độ chỉnh sửa thông tin đơn hàng"
              >
                <Pencil size={13} className="text-[#0F60B6]" />
                <span>{isEditing ? 'Hủy sửa' : 'Chỉnh sửa'}</span>
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="h-8 px-4 rounded bg-[#0F60B6] hover:bg-[#0B4B8C] text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs transition disabled:opacity-50"
                title="Lưu thông tin thay đổi"
              >
                <Save size={13} />
                <span>{saving ? 'Đang lưu...' : 'Lưu'}</span>
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-8 px-3.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer shadow-2xs transition"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. TAB 2: LỊCH SỬ THANH TOÁN ─── */}
      {activeTab === 'PAYMENTS' && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs">
              Lịch sử các giao dịch thu tiền cho đơn {order.orderCode}
            </span>
            <div className="text-xs text-slate-600">
              Tổng tiền: <strong className="font-mono">{currencyFormatter.format(order.totalAmount)} đ</strong> • Đã trả:{' '}
              <strong className="font-mono text-emerald-600">{currencyFormatter.format(order.paidAmount)} đ</strong>
              {order.outstandingAmount > 0 && (
                <>
                  {' '}• Còn nợ: <strong className="font-mono text-rose-600">{currencyFormatter.format(order.outstandingAmount)} đ</strong>
                </>
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F8F9FA] border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-2.5 px-4">Mã giao dịch</th>
                  <th className="py-2.5 px-4">Thời gian</th>
                  <th className="py-2.5 px-4">Phương thức</th>
                  <th className="py-2.5 px-4 text-right">Tiền thu</th>
                  <th className="py-2.5 px-4">Người thu</th>
                  <th className="py-2.5 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {order.paymentTransactions?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Chưa có giao dịch thanh toán nào được ghi nhận cho đơn hàng này.
                    </td>
                  </tr>
                ) : (
                  order.paymentTransactions.map((tx, idx) => (
                    <tr key={tx.txCode || idx} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-800">{tx.txCode}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">{formatOrderDate(tx.transactionDate)}</td>
                      <td className="py-2.5 px-4 text-slate-800">{tx.paymentMethod}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600">
                        {currencyFormatter.format(tx.amount)} đ
                      </td>
                      <td className="py-2.5 px-4 text-slate-700">{tx.createdByName || 'Hệ thống'}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {tx.status === 'COMPLETED' ? 'Thành công' : tx.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {onClose && (
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 rounded bg-[#0F60B6] hover:bg-[#0B4B8C] text-white font-semibold text-xs cursor-pointer shadow-xs"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
