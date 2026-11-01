// src/features/pos/components/PosProductSearch.tsx
// VÙNG B — Thanh tìm kiếm Barcode/SKU & Danh mục sản phẩm (Đồng bộ giá theo Bảng giá đang chọn)

import React, { useState, useRef, useEffect } from 'react';
import {
  ScanBarcode,
  Search,
  Camera,
  X,
  AlertCircle,
  Package,
} from 'lucide-react';
import { message } from 'antd';
import { PosCategory, PosProduct } from '../types';

interface PosProductSearchProps {
  categories: PosCategory[];
  selectedCategoryId: number | null; // null = Tất cả
  onSelectCategory: (categoryId: number | null) => void;
  products: PosProduct[];
  onAddToCart: (product: PosProduct) => void;
  onOpenQuickSelect: () => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
  currentPriceBookId?: number;
  priceMatrix?: Record<number, Record<number, number>>;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const PosProductSearch: React.FC<PosProductSearchProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory,
  products,
  onAddToCart,
  onOpenQuickSelect,
  searchRef,
  currentPriceBookId = 1,
  priceMatrix = {},
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lấy đơn giá theo bảng giá hiện tại của tab
  const getItemPrice = (prod: PosProduct): number => {
    if (priceMatrix[prod.productId] && priceMatrix[prod.productId][currentPriceBookId] !== undefined) {
      return priceMatrix[prod.productId][currentPriceBookId];
    }
    return prod.standardPrice;
  };

  // Lọc sản phẩm theo từ khóa tìm kiếm (Tên, SKU, Barcode, Hãng)
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

  // Xử lý khi nhấn phím (Quét barcode tự động thêm theo POS-001, POS-002, POS-003)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Tuyệt đối không submit checkout khi ấn Enter ở ô tìm kiếm (UI-006)

      if (!searchTerm.trim()) return;

      const activeMatches = searchResults.filter((p) => p.status === 'ACTIVE');

      if (activeMatches.length === 1) {
        onAddToCart(activeMatches[0]);
        setSearchTerm('');
        setIsDropdownOpen(false);
      } else if (searchResults.length === 0) {
        message.warning(`Không tìm thấy sản phẩm nào khớp với mã "${searchTerm}" (POS-002).`);
      } else {
        setIsDropdownOpen(true);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  const handleSelectProduct = (prod: PosProduct) => {
    if (prod.status !== 'ACTIVE') {
      message.error(`Sản phẩm "${prod.name}" đã ngừng kinh doanh, không thể bán (POS-003).`);
      return;
    }
    onAddToCart(prod);
    setSearchTerm('');
    setIsDropdownOpen(false);
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
                  <span>Không tìm thấy sản phẩm nào khớp với từ khóa "{searchTerm}" (POS-002)</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {searchResults.map((prod) => {
                    const isInactive = prod.status !== 'ACTIVE';
                    const isOutOfStock = prod.stockQuantity <= 0;
                    const price = getItemPrice(prod);

                    return (
                      <div
                        key={prod.productId}
                        onClick={() => handleSelectProduct(prod)}
                        className={`p-2.5 flex items-center justify-between transition ${
                          isInactive
                            ? 'opacity-60 bg-slate-50 cursor-not-allowed'
                            : 'hover:bg-blue-50/60 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                            <Package size={16} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 line-clamp-1">{prod.name}</span>
                              {isInactive && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                                  Ngừng kinh doanh
                                </span>
                              )}
                              {isOutOfStock && !isInactive && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                                  Hết hàng
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span className="font-mono text-[#0F60B6] font-semibold">{prod.code}</span>
                              <span>•</span>
                              <span>
                                Tồn:{' '}
                                <strong
                                  className={
                                    prod.stockQuantity <= 0
                                      ? 'text-rose-600'
                                      : prod.stockQuantity <= (prod.minSafeStock || 5)
                                      ? 'text-amber-600'
                                      : 'text-emerald-600'
                                  }
                                >
                                  {prod.stockQuantity} {prod.uom}
                                </strong>
                              </span>
                              {prod.barcode && <span>• Barcode: {prod.barcode}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0 pl-2">
                          <span className="text-xs font-bold text-slate-900 block">
                            {currencyFormatter.format(price)} đ
                          </span>
                          {!isInactive && (
                            <span className="text-[10px] text-blue-600 font-semibold block hover:underline">
                              + Thêm vào giỏ
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Nút Chọn nhanh sản phẩm */}
        <button
          type="button"
          onClick={onOpenQuickSelect}
          className="h-9 px-3 rounded-[6px] bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#0F60B6] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs"
          title="Mở danh mục chọn nhanh sản phẩm"
        >
          <Search size={14} />
          <span>Chọn nhanh</span>
        </button>
      </div>

      {/* ─── 2. Thanh lọc theo Danh mục sản phẩm ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        <button
          type="button"
          onClick={() => onSelectCategory(null)}
          className={`h-7 px-3 rounded-[5px] text-xs font-bold transition cursor-pointer whitespace-nowrap ${
            selectedCategoryId === null
              ? 'bg-[#0F60B6] text-white shadow-2xs'
              : 'bg-white border border-slate-250 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tất cả (F2)
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.categoryId;
          return (
            <button
              key={cat.categoryId}
              type="button"
              onClick={() => onSelectCategory(cat.categoryId)}
              className={`h-7 px-3 rounded-[5px] text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                isSelected
                  ? 'bg-[#0F60B6] text-white font-bold shadow-2xs'
                  : 'bg-white border border-slate-250 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat.categoryName}
            </button>
          );
        })}
      </div>
    </div>
  );
};
