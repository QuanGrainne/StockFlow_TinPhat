// src/app/(dashboard)/orders/[id]/components/OrderItemsTable.tsx
// Bảng danh sách sản phẩm trong đơn hàng kèm tổng kết số lượng & giảm giá dòng

import React from 'react';
import { Package, Tag, Building2, Layers } from 'lucide-react';
import { OrderItemDetail } from '@/features/orders/types';

interface OrderItemsTableProps {
  items: OrderItemDetail[];
  totalQuantity: number;
  itemsTotalAmount: number;
  itemsDiscountAmount: number;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const OrderItemsTable: React.FC<OrderItemsTableProps> = ({
  items,
  totalQuantity,
  itemsTotalAmount,
  itemsDiscountAmount,
}) => {
  return (
    <div className="bg-white rounded-[8px] border border-slate-200 overflow-hidden shadow-2xs space-y-0">
      {/* Header Panel */}
      <div className="p-3.5 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
          <Package size={15} className="text-[#0F60B6]" />
          <span>DANH SÁCH SẢN PHẨM ({items.length} MẶT HÀNG)</span>
        </div>
        <span className="text-slate-500 text-[11px] font-medium">
          Tổng số lượng: <strong className="text-slate-900">{totalQuantity}</strong>
        </span>
      </div>

      {/* Bảng sản phẩm chi tiết */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-2.5 px-3 w-10 text-center">STT</th>
              <th className="py-2.5 px-3">MÃ HÀNG</th>
              <th className="py-2.5 px-3 min-w-[200px]">TÊN SẢN PHẨM</th>
              <th className="py-2.5 px-2.5 text-center">ĐVT</th>
              <th className="py-2.5 px-3 text-right">SỐ LƯỢNG</th>
              <th className="py-2.5 px-3 text-right">ĐƠN GIÁ GỐC</th>
              <th className="py-2.5 px-3 text-right">GIẢM GIÁ</th>
              <th className="py-2.5 px-3 text-right">ĐƠN GIÁ BÁN</th>
              <th className="py-2.5 px-3 text-right">THÀNH TIỀN</th>
              <th className="py-2.5 px-3">KHO XUẤT</th>
              <th className="py-2.5 px-3 text-center">LÔ / HSD</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-150">
            {items.map((it, idx) => {
              const hasLineDiscount = it.discountAmount > 0;

              return (
                <tr key={it.orderItemId} className="hover:bg-slate-50/70 transition">
                  {/* STT */}
                  <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                    {idx + 1}
                  </td>

                  {/* Mã hàng */}
                  <td className="py-2.5 px-3 font-mono font-bold text-[#0F60B6]">
                    {it.productCode}
                  </td>

                  {/* Tên sản phẩm */}
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 leading-snug">
                      {it.productName}
                    </div>
                    {it.barcode && (
                      <div className="text-[10px] text-slate-400 font-mono">
                        Barcode: {it.barcode}
                      </div>
                    )}
                  </td>

                  {/* Đơn vị tính */}
                  <td className="py-2.5 px-2.5 text-center text-slate-600 font-medium">
                    {it.unitName}
                  </td>

                  {/* Số lượng */}
                  <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                    {it.quantity}
                  </td>

                  {/* Đơn giá gốc */}
                  <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                    {currencyFormatter.format(it.originalPrice)} đ
                  </td>

                  {/* Giảm giá dòng */}
                  <td className="py-2.5 px-3 text-right font-mono">
                    {hasLineDiscount ? (
                      <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 text-[11px]">
                        -{currencyFormatter.format(it.discountAmount)} đ
                      </span>
                    ) : (
                      <span className="text-slate-400">0 đ</span>
                    )}
                  </td>

                  {/* Đơn giá bán */}
                  <td className="py-2.5 px-3 text-right font-semibold text-slate-800 font-mono">
                    {currencyFormatter.format(it.unitPrice)} đ
                  </td>

                  {/* Thành tiền */}
                  <td className="py-2.5 px-3 text-right font-black text-slate-900 font-mono">
                    {currencyFormatter.format(it.lineTotal)} đ
                  </td>

                  {/* Kho xuất */}
                  <td className="py-2.5 px-3 text-slate-600">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Building2 size={12} className="text-slate-400 shrink-0" />
                      <span>{it.warehouseName || 'Kho trung tâm'}</span>
                    </div>
                  </td>

                  {/* Số lô / Hạn sử dụng */}
                  <td className="py-2.5 px-3 text-center text-[11px]">
                    {it.lotNumber ? (
                      <div>
                        <div className="font-mono font-bold text-slate-700">{it.lotNumber}</div>
                        {it.expiryDate && (
                          <div className="text-[10px] text-slate-400">HSD: {it.expiryDate}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer bên dưới bảng sản phẩm */}
      <div className="p-3 px-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700 gap-3">
        <div className="flex items-center gap-6">
          <span>
            Tổng mặt hàng: <strong className="text-slate-900">{items.length}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Tổng số lượng SP: <strong className="text-slate-900">{totalQuantity}</strong>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span>
            Tổng tiền hàng gốc:{' '}
            <strong className="text-slate-900 font-bold">
              {currencyFormatter.format(itemsTotalAmount)} đ
            </strong>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Tổng chiết khấu SP:{' '}
            <strong className="text-amber-700 font-bold">
              {currencyFormatter.format(itemsDiscountAmount)} đ
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};

