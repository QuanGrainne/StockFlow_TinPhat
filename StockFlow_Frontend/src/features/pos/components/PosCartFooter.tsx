// src/features/pos/components/PosCartFooter.tsx
// VÙNG B — Thanh công cụ phía dưới bảng giỏ hàng (Đã ẩn hãng vận chuyển và giao hàng)

import React from 'react';
import {
  FolderOpen,
  Trash2,
  FileText,
  Warehouse,
  CheckCircle2,
} from 'lucide-react';

interface PosCartFooterProps {
  totalProducts: number; // số loại sản phẩm
  totalItemsCount: number; // tổng số lượng chiếc/cái
  onClearCart: () => void;
  notes: string;
  onChangeNotes: (notes: string) => void;
  warehouseName: string;
}

export const PosCartFooter: React.FC<PosCartFooterProps> = ({
  totalProducts,
  totalItemsCount,
  onClearCart,
  notes,
  onChangeNotes,
  warehouseName,
}) => {
  return (
    <div className="bg-white rounded-[6px] border border-slate-200 p-2.5 shadow-2xs space-y-2 select-none text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Nhóm trái: Tổng kết số lượng & Nút xóa giỏ */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-700 font-bold">
            <FolderOpen size={16} className="text-[#0F60B6]" />
            <span>
              Tổng: <strong className="text-[#0F60B6]">{totalProducts}</strong> sản phẩm (
              <strong className="text-slate-900">{totalItemsCount}</strong> mặt hàng)
            </span>
          </div>

          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1" title="Tự động lưu LocalStorage">
            <CheckCircle2 size={11} className="text-emerald-600" />
            <span>Đã lưu LocalStorage</span>
          </span>
          <button
            type="button"
            onClick={onClearCart}
            disabled={totalProducts === 0}
            className="text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-xs"
            title="Xóa toàn bộ sản phẩm trong giỏ hàng (Phím tắt: F7)"
          >
            <Trash2 size={13} />
            <span>Xóa giỏ (F7)</span>
          </button>
        </div>

        {/* Kho xuất hàng */}
        <div className="flex items-center gap-1.5 text-slate-600 text-xs font-semibold bg-slate-100/80 px-2.5 py-1 rounded-[5px]">
          <Warehouse size={13} className="text-[#0F60B6]" />
          <span>Kho xuất: <strong>{warehouseName}</strong></span>
          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
            <CheckCircle2 size={11} />
            <span>(Sẵn 100%)</span>
          </span>
        </div>
      </div>

      {/* Ô nhập ghi chú đơn hàng */}
      <div className="pt-1.5 border-t border-slate-150 flex items-center gap-1.5 border-slate-250 rounded-[5px] px-2 py-0.5 bg-slate-50/60 focus-within:border-blue-400 focus-within:bg-white transition">
        <FileText size={13} className="text-slate-400 shrink-0" />
        <input
          type="text"
          value={notes}
          onChange={(e) => onChangeNotes(e.target.value)}
          placeholder="Ghi chú đơn bán hàng..."
          className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
        />
      </div>
    </div>
  );
};
