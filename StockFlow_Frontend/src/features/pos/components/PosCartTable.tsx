// src/features/pos/components/PosCartTable.tsx
// VÙNG B — Bảng chi tiết đơn hàng (Đã ẩn chiết khấu từng sản phẩm, hiển thị Thành tiền)

import React from 'react';
import {
  Minus,
  Plus,
  Trash2,
  AlertTriangle,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { CartItem } from '../types';

interface PosCartTableProps {
  items: CartItem[];
  onUpdateQuantity: (productId: number, newQty: number) => void;
  onRemoveItem: (productId: number) => void;
  selectedProductId?: number | null;
  onSelectRow?: (productId: number) => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const PosCartTable: React.FC<PosCartTableProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  selectedProductId,
  onSelectRow,
}) => {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-[6px] border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[360px] shadow-2xs">
        <div className="w-16 h-16 rounded-full bg-blue-50 text-[#0F60B6] flex items-center justify-center mb-3">
          <ShoppingBag size={28} />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Đơn hàng chưa có sản phẩm nào</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Quét mã vạch barcode, gõ tên SKU (F3) hoặc bấm "Chọn nhanh" để thêm hàng hóa vào giỏ hàng
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[6px] border border-slate-200 overflow-hidden shadow-2xs flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          {/* Header (Đã bỏ cột Chiết khấu, hiển thị Thành tiền) */}
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-2.5 px-3 text-center w-12">STT</th>
              <th className="py-2.5 px-3">SẢN PHẨM / MÃ SKU</th>
              <th className="py-2.5 px-3 text-center w-20">ĐVT</th>
              <th className="py-2.5 px-3 text-right w-28">ĐƠN GIÁ</th>
              <th className="py-2.5 px-3 text-center w-32">SỐ LƯỢNG</th>
              <th className="py-2.5 px-3 text-right w-32">THÀNH TIỀN</th>
              <th className="py-2.5 px-2 text-center w-10"></th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-150 text-xs">
            {items.map((item, index) => {
              const isSelected = selectedProductId === item.productId;
              const isLowStock = item.stockQuantity <= (item.minSafeStock || 1);
              const isExceedStock = item.quantity > item.stockQuantity;
              const itemTotal = item.unitPrice * item.quantity;

              return (
                <tr
                  key={item.productId}
                  onClick={() => onSelectRow?.(item.productId)}
                  className={`transition hover:bg-blue-50/40 cursor-pointer ${
                    isSelected ? 'bg-blue-50/70' : index % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'
                  }`}
                >
                  {/* STT */}
                  <td className="py-2.5 px-3 text-center text-slate-500 font-medium">
                    {index + 1}
                  </td>

                  {/* SẢN PHẨM / MÃ SKU */}
                  <td className="py-2.5 px-3">
                    <div className="flex items-start gap-2.5">
                      {/* Ảnh SP hoặc Icon */}
                      <div className="w-10 h-10 rounded-[6px] bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 text-slate-400 mt-0.5">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package size={20} className="text-[#0F60B6]" />
                        )}
                      </div>

                      {/* Tên & SKU */}
                      <div className="leading-snug min-w-0">
                        <span className="font-bold text-slate-900 block truncate" title={item.name}>
                          {item.name}
                        </span>

                        <div className="flex items-center gap-2 text-[11px] mt-0.5 flex-wrap">
                          <span className="font-mono text-[#0F60B6] font-semibold">{item.code}</span>
                          <span className="text-slate-300">•</span>

                          {/* Trạng thái tồn kho */}
                          {isLowStock || isExceedStock ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              <AlertTriangle size={11} />
                              <span>
                                {isExceedStock
                                  ? `Không đủ tồn (Còn ${item.stockQuantity})`
                                  : `Cảnh báo: Tồn chỉ còn ${item.stockQuantity} ${item.uom}`}
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Tồn: <strong className="text-emerald-600 font-semibold">{item.stockQuantity} {item.uom}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* ĐVT */}
                  <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                    {item.uom}
                  </td>

                  {/* ĐƠN GIÁ */}
                  <td className="py-2.5 px-3 text-right">
                    <span className="font-bold text-slate-800 block">
                      {currencyFormatter.format(item.unitPrice)}
                    </span>
                    <span className="text-[10px] text-slate-400">đ</span>
                  </td>

                  {/* SỐ LƯỢNG (Stepper) */}
                  <td className="py-2.5 px-3 text-center">
                    <div className="inline-flex items-center border border-slate-300 rounded-[5px] bg-white shadow-2xs overflow-hidden">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.quantity > 1) {
                            onUpdateQuantity(item.productId, item.quantity - 1);
                          } else {
                            onRemoveItem(item.productId);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                        title="Giảm 1"
                      >
                        <Minus size={13} />
                      </button>

                      <input
                        type="number"
                        value={item.quantity}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (!isNaN(val) && val >= 1) {
                            onUpdateQuantity(item.productId, val);
                          }
                        }}
                        className="w-10 h-7 text-center font-bold text-xs text-slate-800 outline-none border-x border-slate-200"
                        min={1}
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateQuantity(item.productId, item.quantity + 1);
                        }}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                        title="Tăng 1"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </td>

                  {/* THÀNH TIỀN */}
                  <td className="py-2.5 px-3 text-right">
                    <span className="font-bold text-slate-900 block text-xs">
                      {currencyFormatter.format(itemTotal)}
                    </span>
                    <span className="text-[10px] text-slate-400">đ</span>
                  </td>

                  {/* XÓA DÒNG */}
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(item.productId);
                      }}
                      className="text-slate-350 hover:text-rose-600 p-1 rounded transition cursor-pointer"
                      title="Xóa sản phẩm này khỏi giỏ"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
