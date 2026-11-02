// src/features/pos/components/PosCartTable.tsx
// VÙNG B — Bảng chi tiết đơn hàng (Validate số lượng, tồn kho, thành tiền theo POS-001 -> POS-017)

import React, { useState } from 'react';
import { Popover } from 'antd';
import {
  Minus,
  Plus,
  Trash2,
  AlertTriangle,
  Package,
  ShoppingBag,
  Edit3,
} from 'lucide-react';
import { CartItem } from '../types';

interface PosCartTableProps {
  items: CartItem[];
  onUpdateQuantity: (productId: number, newQty: number) => void;
  onRemoveItem: (productId: number) => void;
  onUpdateItemDiscount?: (productId: number, type: 'PERCENT' | 'AMOUNT', value: number) => void;
  selectedProductId?: number | null;
  onSelectRow?: (productId: number) => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

interface ItemDiscountPopoverProps {
  item: CartItem;
  onApply?: (productId: number, type: 'PERCENT' | 'AMOUNT', value: number) => void;
}

const ItemDiscountPopover: React.FC<ItemDiscountPopoverProps> = ({ item, onApply }) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<'PERCENT' | 'AMOUNT'>(
    item.discountType || (item.discountPercent ? 'PERCENT' : 'AMOUNT')
  );
  const [val, setVal] = useState<number>(
    item.discountValue || (type === 'PERCENT' ? (item.discountPercent || 0) : (item.discountAmount || 0))
  );

  const handleConfirm = () => {
    if (onApply) {
      onApply(item.productId, type, val);
    }
    setOpen(false);
  };

  const content = (
    <div className="w-56 p-2 space-y-2 text-xs select-none">
      <div className="font-bold text-slate-800 text-xs flex justify-between items-center pb-1 border-b border-slate-100">
        <span>Chiết khấu mặt hàng</span>
        <span className="text-[10px] text-slate-400 font-normal">{item.code}</span>
      </div>
      <div className="flex bg-slate-100 p-0.5 rounded-[5px]">
        <button
          type="button"
          onClick={() => { setType('AMOUNT'); }}
          className={`flex-1 py-1 rounded-[4px] text-xs font-semibold cursor-pointer transition ${type === 'AMOUNT' ? 'bg-white text-[#0F60B6] shadow-xs' : 'text-slate-600'}`}
        >
          VNĐ
        </button>
        <button
          type="button"
          onClick={() => { setType('PERCENT'); }}
          className={`flex-1 py-1 rounded-[4px] text-xs font-semibold cursor-pointer transition ${type === 'PERCENT' ? 'bg-white text-[#0F60B6] shadow-xs' : 'text-slate-600'}`}
        >
          % (Phần trăm)
        </button>
      </div>
      <div>
        <input
          type="number"
          min={0}
          max={type === 'PERCENT' ? 100 : (item.standardPrice || item.unitPrice)}
          value={val || ''}
          onChange={(e) => setVal(Math.max(0, Number(e.target.value) || 0))}
          placeholder={type === 'PERCENT' ? 'Nhập % (vd: 10)' : 'Nhập số tiền VNĐ'}
          className="w-full h-8 px-2.5 rounded border border-slate-300 font-mono font-bold text-xs outline-none focus:border-[#0F60B6]"
          autoFocus
        />
      </div>
      {type === 'PERCENT' && (
        <div className="flex gap-1">
          {[0, 5, 10, 15, 20].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setVal(p)}
              className="flex-1 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-[#0F60B6] rounded text-[10px] font-semibold border border-slate-200 cursor-pointer"
            >
              {p}%
            </button>
          ))}
        </div>
      )}
      <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded text-xs cursor-pointer"
        >
          Đóng
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="px-3 py-1 bg-[#0F60B6] text-white rounded font-bold text-xs hover:bg-blue-700 cursor-pointer shadow-2xs"
        >
          Áp dụng
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      <Popover
        content={content}
        trigger="click"
        open={open}
        onOpenChange={setOpen}
        placement="bottomRight"
        getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
      >
        <button
          type="button"
          className="w-full text-right hover:bg-blue-50/60 p-1 rounded transition group cursor-pointer"
          title="Nhấp để sửa chiết khấu mặt hàng (chuẩn KiotViet)"
        >
          {item.discountAmount && item.discountAmount > 0 ? (
            <div>
              <span className="inline-block text-[10px] font-bold text-rose-600 bg-rose-50 px-1 py-0.2 rounded border border-rose-200 group-hover:border-rose-400">
                -{item.discountPercent || Math.round((item.discountAmount / ((item.standardPrice || item.unitPrice) * item.quantity)) * 100)}%
              </span>
              <div className="font-semibold text-rose-600 text-[11px] mt-0.5">
                {currencyFormatter.format(item.discountAmount)} đ
              </div>
            </div>
          ) : (
            <span className="text-slate-400 font-medium group-hover:text-[#0F60B6] text-[11px] flex items-center justify-end gap-0.5">
              0 đ <Edit3 size={11} className="opacity-0 group-hover:opacity-100 text-[#0F60B6]" />
            </span>
          )}
        </button>
      </Popover>
    </div>
  );
};

export const PosCartTable: React.FC<PosCartTableProps> = ({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateItemDiscount,
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
          {/* Header */}
          <thead>
            <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-2.5 px-2 text-center w-10">STT</th>
              <th className="py-2.5 px-3">SẢN PHẨM / MÃ SKU</th>
              <th className="py-2.5 px-2 text-center w-16">ĐVT</th>
              <th className="py-2.5 px-3 text-right w-24">ĐƠN GIÁ</th>
              <th className="py-2.5 px-2 text-center w-32">SỐ LƯỢNG</th>
              <th className="py-2.5 px-3 text-right w-24">CHIẾT KHẤU</th>
              <th className="py-2.5 px-3 text-right w-28">THÀNH TIỀN</th>
              <th className="py-2.5 px-2 text-center w-8"></th>
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-150 text-xs">
            {items.map((item, index) => {
              const isSelected = selectedProductId === item.productId;
              const isLowStock = item.stockQuantity <= (item.minSafeStock || 5);
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

                      {/* Tên & SKU & Trạng thái tồn */}
                      <div className="leading-snug min-w-0">
                        <span className="font-bold text-slate-900 block truncate" title={item.name}>
                          {item.name}
                        </span>

                        <div className="flex items-center gap-2 text-[11px] mt-0.5 flex-wrap">
                          <span className="font-mono text-[#0F60B6] font-semibold">{item.code}</span>
                          <span className="text-slate-300">•</span>

                          {/* Cảnh báo tồn kho theo POS-014, POS-015 */}
                          {isExceedStock ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                              <AlertTriangle size={11} />
                              <span>Vượt tồn kho (Hiện có: {item.stockQuantity})</span>
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1 text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              <AlertTriangle size={11} />
                              <span>Cảnh báo: Tồn chỉ còn {item.stockQuantity} {item.uom}</span>
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
                      {currencyFormatter.format(item.standardPrice || item.unitPrice)}
                    </span>
                    <span className="text-[10px] text-slate-400">đ</span>
                  </td>

                  {/* SỐ LƯỢNG (Stepper & Input chuẩn hóa POS-005 -> POS-008) */}
                  <td className="py-2.5 px-2 text-center">
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
                        type="text"
                        inputMode="numeric"
                        value={item.quantity}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          // Lọc chỉ nhận ký tự số, chống nhập chữ hoặc số âm (POS-006, POS-007)
                          const raw = e.target.value.replace(/\D/g, '');
                          if (raw === '') {
                            onUpdateQuantity(item.productId, 1);
                            return;
                          }
                          const val = parseInt(raw, 10);
                          if (!isNaN(val)) {
                            // Giới hạn số lượng tối đa 100.000 (POS-008)
                            const clamped = Math.min(100000, Math.max(1, val));
                            onUpdateQuantity(item.productId, clamped);
                          }
                        }}
                        onBlur={() => {
                          if (!item.quantity || item.quantity < 1) {
                            onUpdateQuantity(item.productId, 1);
                          }
                        }}
                        className={`w-12 h-7 text-center font-bold text-xs outline-none border-x ${
                          isExceedStock
                            ? 'text-rose-600 border-rose-300 bg-rose-50'
                            : 'text-slate-800 border-slate-200'
                        }`}
                      />

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.quantity < 100000) {
                            onUpdateQuantity(item.productId, item.quantity + 1);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition cursor-pointer"
                        title="Tăng 1"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </td>

                  {/* CHIẾT KHẤU THEO MẶT HÀNG (Chuẩn KiotViet: % hoặc VNĐ) */}
                  <td className="py-2.5 px-3 text-right">
                    <ItemDiscountPopover
                      item={item}
                      onApply={onUpdateItemDiscount}
                    />
                  </td>

                  {/* THÀNH TIỀN (Thành tiền = Số lượng x Đơn giá sau chiết khấu) */}
                  <td className="py-2.5 px-3 text-right">
                    <span className="font-bold text-slate-900 block text-xs">
                      {currencyFormatter.format(item.total)}
                    </span>
                    <span className="text-[10px] text-slate-400">đ</span>
                  </td>

                  {/* XÓA DÒNG (POS-013) */}
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItem(item.productId);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Xóa sản phẩm này khỏi giỏ hàng"
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
