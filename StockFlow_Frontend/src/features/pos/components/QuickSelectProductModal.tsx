// src/features/pos/components/QuickSelectProductModal.tsx
// Modal danh mục "Chọn nhanh" sản phẩm dạng ô lưới trực quan

import React, { useState } from 'react';
import { Modal, Input } from 'antd';
import { Search, Package, Plus, AlertTriangle } from 'lucide-react';
import { PosProduct, PosCategory } from '../types';

interface QuickSelectProductModalProps {
  open: boolean;
  onClose: () => void;
  products: PosProduct[];
  categories: PosCategory[];
  onAddToCart: (product: PosProduct) => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const QuickSelectProductModal: React.FC<QuickSelectProductModalProps> = ({
  open,
  onClose,
  products,
  categories,
  onAddToCart,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  const filtered = products.filter((p) => {
    const matchCat = selectedCatId === null || p.categoryId === selectedCatId;
    const matchSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <Modal
      title={
        <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Package size={17} className="text-[#0F60B6]" />
          <span>Danh mục sản phẩm chọn nhanh</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={780}
      centered
      destroyOnHidden
    >
      <div className="space-y-3 pt-2">
        {/* Tìm kiếm & Lọc */}
        <div className="flex items-center gap-2">
          <Input
            prefix={<Search size={14} className="text-slate-400" />}
            placeholder="Tìm theo tên sản phẩm, mã SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs"
            allowClear
          />
        </div>

        {/* Category pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setSelectedCatId(null)}
            className={`px-2.5 py-1 rounded-[5px] text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              selectedCatId === null
                ? 'bg-[#0F60B6] text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.categoryId}
              type="button"
              onClick={() => setSelectedCatId(c.categoryId)}
              className={`px-2.5 py-1 rounded-[5px] text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                selectedCatId === c.categoryId
                  ? 'bg-[#0F60B6] text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.categoryName}
            </button>
          ))}
        </div>

        {/* Lưới sản phẩm */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[420px] overflow-y-auto p-1">
          {filtered.map((prod) => {
            const isLow = prod.stockQuantity <= (prod.minSafeStock || 1);
            return (
              <div
                key={prod.productId}
                onClick={() => onAddToCart(prod)}
                className="p-2.5 rounded-[6px] border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 bg-white transition cursor-pointer flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <span className="font-mono text-[10px] text-[#0F60B6] font-bold">
                      {prod.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      Tồn: {prod.stockQuantity} {prod.uom}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 group-hover:text-blue-700">
                    {prod.name}
                  </h4>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-150 flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900">
                    {currencyFormatter.format(prod.standardPrice)} đ
                  </span>
                  <button
                    type="button"
                    className="w-6 h-6 rounded bg-blue-100 text-[#0F60B6] group-hover:bg-[#0F60B6] group-hover:text-white flex items-center justify-center transition"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

