// src/app/(dashboard)/orders/[id]/components/OrderSummaryCard.tsx
// Card tổng kết giá trị đơn hàng, các khoản giảm giá, thuế, phí và công nợ

import React from 'react';
import { DollarSign, ShieldCheck, AlertCircle } from 'lucide-react';
import { OrderDetail } from '@/features/orders/types';

interface OrderSummaryCardProps {
  order: OrderDetail;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({ order }) => {
  const hasItemDiscount = order.itemDiscountTotal > 0;
  const hasOrderDiscount = order.orderDiscountAmount > 0;
  const hasDebt = order.outstandingAmount > 0;

  return (
    <div className="bg-white rounded-[8px] border border-slate-200 p-4 shadow-2xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-150">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
          <DollarSign size={15} className="text-[#0F60B6]" />
          <span>TỔNG KẾT THANH TOÁN</span>
        </div>
      </div>

      {/* Danh sách các dòng tính tiền chi tiết */}
      <div className="space-y-2 text-xs text-slate-600">
        {/* Tiền hàng (chưa trừ chiết khấu) */}
        <div className="flex items-center justify-between">
          <span>Tiền hàng (trước giảm giá):</span>
          <span className="font-semibold text-slate-900 font-mono">
            {currencyFormatter.format(order.subTotal)} đ
          </span>
        </div>

        {/* Giảm giá cấp sản phẩm */}
        {hasItemDiscount && (
          <div className="flex items-center justify-between text-amber-700">
            <span>Giảm giá theo sản phẩm:</span>
            <span className="font-semibold font-mono">
              -{currencyFormatter.format(order.itemDiscountTotal)} đ
            </span>
          </div>
        )}

        {/* Tạm tính sau giảm giá sản phẩm */}
        {hasItemDiscount && (
          <div className="flex items-center justify-between text-slate-500 text-[11px] pt-0.5">
            <span>Tạm tính sau giảm giá SP:</span>
            <span className="font-mono">{currencyFormatter.format(order.subTotalAfterItemDiscount)} đ</span>
          </div>
        )}

        {/* Giảm giá toàn đơn */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span>Chiết khấu toàn đơn:</span>
            {hasOrderDiscount && (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded">
                ({order.orderDiscountType === 'PERCENT' ? `${order.orderDiscountValue}%` : 'Số tiền'})
              </span>
            )}
          </div>
          <span className={`font-mono font-semibold ${hasOrderDiscount ? 'text-amber-700' : 'text-slate-400'}`}>
            {hasOrderDiscount ? `-${currencyFormatter.format(order.orderDiscountAmount)} đ` : '0 đ'}
          </span>
        </div>

        {/* Phí vận chuyển */}
        {order.deliveryFee > 0 && (
          <div className="flex items-center justify-between">
            <span>Phí giao hàng:</span>
            <span className="font-mono">{currencyFormatter.format(order.deliveryFee)} đ</span>
          </div>
        )}

        {/* Thuế VAT */}
        {order.vatAmount > 0 && (
          <div className="flex items-center justify-between">
            <span>Thuế VAT:</span>
            <span className="font-mono">{currencyFormatter.format(order.vatAmount)} đ</span>
          </div>
        )}

        <div className="border-t border-dashed border-slate-200 my-2" />

        {/* TỔNG TIỀN PHẢI THANH TOÁN */}
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-slate-900 text-sm">TỔNG THANH TOÁN:</span>
          <span className="text-base font-black text-[#0F60B6] font-mono">
            {currencyFormatter.format(order.totalAmount)} đ
          </span>
        </div>

        {/* Đã thanh toán */}
        <div className="flex items-center justify-between text-emerald-700 pt-1">
          <span className="font-semibold">Khách đã trả:</span>
          <span className="font-bold font-mono">
            {currencyFormatter.format(order.paidAmount)} đ
          </span>
        </div>

        {/* Số tiền còn nợ */}
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold text-slate-900">Còn nợ:</span>
          <span
            className={`font-black font-mono text-sm ${
              hasDebt ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-emerald-700'
            }`}
          >
            {currencyFormatter.format(order.outstandingAmount)} đ
          </span>
        </div>
      </div>
    </div>
  );
};

