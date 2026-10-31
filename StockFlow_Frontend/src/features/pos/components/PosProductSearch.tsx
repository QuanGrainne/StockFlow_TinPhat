// src/features/pos/components/PosProductSearch.tsx
// VÙNG B — Thanh tìm kiếm Barcode/SKU & Bộ lọc danh mục sản phẩm khớp ảnh tham chiếu

import React, { useState, useRef, useEffect } from 'react';
import {
  ScanBarcode,
  Search,
  Camera,
  LayoutGrid,
  X,
  AlertCircle,
  Plus,
  Package,
} from 'lucide-react';
import { PosCategory, PosProduct } from '../types';

interface PosProductSearchProps {
  categories: PosCategory[];
  selectedCategoryId: number | null; // null = Tất cả
  onSelectCategory: (categoryId: number | null) => void;
  products: PosProduct[];
  onAddToCart: (product: PosProduct) => void;
  onOpenQuickSelect: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
}

export const PosProductSearch: React.FC<PosProductSearchProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  products,
  onAddToCart,
  onOpenQuickSelect,
  searchRef,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lọc sản phẩm theo từ khóa tìm kiếm
  const searchResults = React.useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.trim().toLowerCase();
    return products.filter(
      (p) =>
        p.code.toLowerCase().includes(lower) ||
        p.name.toLowerCase().includes(lower) ||
        (p.barcode && p.barcode.toLowerCase().includes(lower)) ||
        (p.brand && p.brand.toLowerCase().includes(lower))
    );
  }, [searchTerm, products]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Xử lý khi nhấn Enter (quét barcode tự động thêm)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length === 1) {
        onAddToCart(searchResults[0]);
        setSearchTerm('');
        setIsDropdownOpen(false);
      } else if (searchResults.length > 1) {
        setIsDropdownOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  return (
    <div className="space-y-2 select-none" ref={containerRef}>
      {/* ─── 1. Thanh tìm kiếm & Quét mã vạch ─── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          {/* Icon Barcode Scanner */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center pointer-events-none">
            <ScanBarcode size={17} className="text-[#0F60B6]" />
          </div>

          <input
            ref={searchRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setIsDropdownOpen(true);
            }}
            onFocus={() => {
              if (searchTerm.trim()) setIsDropdownOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Quét mã vạch hoặc gõ tên sản phẩm, mã SKU (Phím tắt: F3)..."
            className="w-full h-9 pl-9 pr-18 rounded-[6px] bg-white border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 font-medium outline-none focus:border-[#0F60B6] focus:ring-1 focus:ring-[#0F60B6] transition shadow-2xs"
          />

          {/* Phím tắt F3 & Camera icon bên phải input */}
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setIsDropdownOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
            <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[10px] text-slate-600 font-bold">
              F3
            </kbd>
            <button
              type="button"
              className="text-slate-400 hover:text-[#0F60B6] transition cursor-pointer p-0.5"
              title="Quét camera / Máy quét barcode"
            >
              <Camera size={15} />
            </button>
          </div>

          {/* Dropdown kết quả tìm kiếm nhanh */}
          {isDropdownOpen && searchTerm.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[6px] border border-slate-200 shadow-lg z-50 max-h-72 overflow-y-auto">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 flex flex-col items-center gap-1">
                  <AlertCircle size={18} className="text-slate-300" />
                  <span>Không tìm thấy sản phẩm nào khớp với từ khóa "{searchTerm}"</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {searchResults.map((prod) => (
                    <div
                      key={prod.productId}
                      onClick={() => {
                        onAddToCart(prod);
                        setSearchTerm('');
                        setIsDropdownOpen(false);
                      }}
                      className="p-2.5 hover:bg-blue-50/60 flex items-center justify-between cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <Package size={16} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-800 line-clamp-1">{prod.name}</div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono text-[#0F60B6] font-semibold">{prod.code}</span>
                            <span>•</span>
                            <span>Tồn: <strong className={prod.stockQuantity <= (prod.minSafeStock || 1) ? 'text-amber-600' : 'text-emerald-600'}>{prod.stockQuantity} {prod.uom}</strong></span>
                            {prod.barcode && <span>• Barcode: {prod.barcode}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 pl-2">
                        <span className="text-xs font-bold text-slate-900 block">
                          {new Intl.NumberFormat('vi-VN').format(prod.standardPrice)} đ
                        </span>
                        <span className="text-[10px] text-blue-600 font-semibold block hover:underline">
                          + Thêm vào giỏ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nút Chọn nhanh dạng lưới */}
        <button
          type="button"
          onClick={onOpenQuickSelect}
          className="h-9 px-3.5 rounded-[6px] bg-white border border-slate-300 hover:bg-slate-50 text-[#0F60B6] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
          title="Mở danh mục chọn nhanh dạng ô"
        >
          <LayoutGrid size={15} />
          <span>Chọn nhanh</span>
        </button>
      </div>

      {/* ─── 2. Danh mục sản phẩm (Pill tabs) ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {/* Tab Tất cả (F2) */}
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`h-7 px-3 rounded-[5px] text-xs font-bold transition cursor-pointer whitespace-nowrap shadow-2xs ${
            selectedCategoryId === null
              ? 'bg-[#0F60B6] text-white shadow-xs'
              : 'bg-white border border-slate-250 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Tất cả (F2)</span>
        </button>

        {/* Danh mục thực tế từ backend */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.categoryId;
          return (
            <button
              key={cat.categoryId}
              type="button"
              onClick={() => onSelectCategory(cat.categoryId)}
              className={`h-7 px-3 rounded-[5px] text-xs font-semibold transition cursor-pointer whitespace-nowrap shadow-2xs ${
                isSelected
                  ? 'bg-[#0F60B6] text-white font-bold shadow-xs'
                  : 'bg-white border border-slate-250 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{cat.categoryName}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

