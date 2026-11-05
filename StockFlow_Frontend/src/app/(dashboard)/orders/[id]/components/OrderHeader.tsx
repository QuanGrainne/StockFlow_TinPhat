// src/app/(dashboard)/orders/[id]/components/OrderHeader.tsx
// Header đơn hàng: Tiêu đề, Mã đơn, Loại chứng từ, Trạng thái, Thông tin người tạo và Các nút thao tác

import React from 'react';
import Link from 'next/link';
import { Dropdown, MenuProps, Tag, Tooltip } from 'antd';
import {
  ArrowLeft,
  Printer,
  Copy,
  Edit3,
  CreditCard,
  XCircle,
  MoreVertical,
  Building2,
  Calendar,
  User,
  Clock,
  Layers,
  FileText,
} from 'lucide-react';
import { OrderDetail } from '@/features/orders/types';

interface OrderHeaderProps {
  order: OrderDetail;
  onPrint: () => void;
  onRecordPayment: () => void;
  onCancelOrder: () => void;
}

export const OrderHeader: React.FC<OrderHeaderProps> = ({
  order,
  onPrint,
  onRecordPayment,
  onCancelOrder,
}) => {
  const isCompleted = order.status === 'COMPLETED';
  const isCancelled = order.status === 'CANCELLED';
  const isDraftOrPending = order.status === 'DRAFT' || order.status === 'PENDING';
  const hasDebt = order.outstandingAmount > 0;

  const orderDateStr = order.orderDate
    ? new Date(order.orderDate).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Chưa xác định';

  const moreMenuItems: MenuProps['items'] = [
    {
      key: 'copy-code',
      label: 'Sao chép mã đơn hàng',
      icon: <Copy size={13} />,
      onClick: () => {
        navigator.clipboard.writeText(order.orderCode);
      },
    },
    {
      key: 'export-excel',
      label: 'Xuất file Excel đơn hàng',
      icon: <FileText size={13} />,
    },
  ];

  return (
    <div className="bg-white rounded-[8px] border border-slate-200 p-4 shadow-2xs space-y-3">
      {/* ─── DÒNG 1: QUAY LẠI + MÃ ĐƠN + BADGES + CÁC NÚT THAO TÁC ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Bên trái: Nút Back + Tiêu đề + Mã đơn hàng + Badges */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/orders"
            className="h-8 px-2.5 rounded-[5px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition"
            title="Quay lại danh sách đơn hàng"
          >
            <ArrowLeft size={14} />
            <span>Danh sách</span>
          </Link>

          <div className="h-4 w-[1px] bg-slate-300 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {order.documentType === 'SALES_ORDER' ? 'Đơn đặt hàng' : 'Hóa đơn bán hàng'}
              </span>
              <h1 className="text-lg font-black text-slate-900 font-mono tracking-tight">
                #{order.orderCode}
              </h1>

              {/* Badge Trạng thái đơn */}
              <span
                className={`px-2.5 py-0.5 rounded-[4px] font-bold text-[11px] inline-block ${
                  isCompleted
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/80'
                    : isCancelled
                    ? 'bg-rose-100 text-rose-800 border border-rose-300/80'
                    : 'bg-amber-100 text-amber-800 border border-amber-300/80'
                }`}
              >
                {isCompleted ? 'Hoàn thành' : isCancelled ? 'Đã hủy' : 'Đang xử lý'}
              </span>

              {/* Badge Trạng thái thanh toán */}
              <span
                className={`px-2.5 py-0.5 rounded-[4px] font-bold text-[11px] inline-block ${
                  order.paymentStatus === 'PAID'
                    ? 'bg-blue-100 text-[#0F60B6] border border-blue-200'
                    : order.paymentStatus === 'PARTIAL'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-rose-100 text-rose-700 border border-rose-200'
                }`}
              >
                {order.paymentStatus === 'PAID'
                  ? 'Đã thanh toán'
                  : order.paymentStatus === 'PARTIAL'
                  ? 'Thanh toán một phần'
                  : 'Ghi nợ'}
              </span>
            </div>
          </div>
        </div>

        {/* Bên phải: Nút In, Ghi nhận thanh toán, Sửa, Hủy đơn */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Nút In hóa đơn */}
          <button
            type="button"
            onClick={onPrint}
            className="h-8 px-3 rounded-[5px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
            title="In hóa đơn bán hàng"
          >
            <Printer size={14} className="text-[#0F60B6]" />
            <span>In hóa đơn</span>
          </button>

          {/* Nút Ghi nhận thanh toán (nếu còn công nợ và đơn chưa bị hủy) */}
          {hasDebt && !isCancelled && (
            <button
              type="button"
              onClick={onRecordPayment}
              className="h-8 px-3 rounded-[5px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer active:scale-95"
              title="Ghi nhận thanh toán công nợ cho đơn hàng"
            >
              <CreditCard size={14} />
              <span>Ghi nhận thanh toán</span>
            </button>
          )}

          {/* Nút Chỉnh sửa (chỉ khả dụng với đơn DRAFT hoặc PENDING) */}
          <Tooltip
            title={
              isCompleted
                ? 'Đơn hàng đã hoàn tất, không được chỉnh sửa làm sai lệch giao dịch'
                : isCancelled
                ? 'Đơn hàng đã bị hủy, không thể chỉnh sửa'
                : 'Chỉnh sửa đơn hàng'
            }
          >
            <button
              type="button"
              disabled={isCompleted || isCancelled}
              className="h-8 px-3 rounded-[5px] bg-white border border-slate-300 text-slate-700 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Edit3 size={13} />
              <span>Chỉnh sửa</span>
            </button>
          </Tooltip>

          {/* Nút Hủy đơn (chỉ hiển thị nếu đơn chưa hủy) */}
          {!isCancelled && (
            <button
              type="button"
              onClick={onCancelOrder}
              className="h-8 px-2.5 rounded-[5px] bg-white border border-rose-300 hover:bg-rose-50 text-rose-600 font-semibold text-xs flex items-center gap-1 transition cursor-pointer"
              title="Hủy đơn hàng này"
            >
              <XCircle size={13} />
              <span>Hủy đơn</span>
            </button>
          )}

          {/* Menu thao tác khác */}
          <Dropdown menu={{ items: moreMenuItems }} trigger={['click']}>
            <button
              type="button"
              className="h-8 w-8 rounded-[5px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
            >
              <MoreVertical size={14} />
            </button>
          </Dropdown>
        </div>
      </div>

      {/* ─── DÒNG 2: THANH METADATA ĐƠN HÀNG ─── */}
      <div className="pt-2.5 border-t border-slate-150 flex flex-wrap items-center gap-y-2 gap-x-6 text-xs text-slate-600">
        <div className="flex items-center gap-1.5">
          <Calendar size={13} className="text-[#0F60B6]" />
          <span>Ngày tạo:</span>
          <strong className="text-slate-800">{orderDateStr}</strong>
        </div>

        <div className="flex items-center gap-1.5">
          <Building2 size={13} className="text-[#0F60B6]" />
          <span>Kho xuất hàng:</span>
          <strong className="text-slate-800">
            {order.warehouseName} ({order.warehouseCode})
          </strong>
        </div>

        <div className="flex items-center gap-1.5">
          <User size={13} className="text-[#0F60B6]" />
          <span>Người tạo đơn:</span>
          <strong className="text-slate-800">{order.createdByName}</strong>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock size={13} className="text-[#0F60B6]" />
          <span>Nhân viên phụ trách:</span>
          <strong className="text-slate-800">{order.salesRepName}</strong>
        </div>

        {order.priceBookName && (
          <div className="flex items-center gap-1.5">
            <Layers size={13} className="text-[#0F60B6]" />
            <span>Bảng giá:</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-800 font-bold text-[11px] border border-slate-200">
              {order.priceBookName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

