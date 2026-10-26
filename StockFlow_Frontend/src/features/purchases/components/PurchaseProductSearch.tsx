'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Grid2X2, Plus } from 'lucide-react';
import { BackendProduct } from '@/features/products/services/productService';

interface PurchaseProductSearchProps {
  products: BackendProduct[];
  loading: boolean;
  warehouseName: string;
  onSelect: (product: BackendProduct) => void;
  onOpenQuickAdd: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function PurchaseProductSearch({
  products,
  loading,
  warehouseName,
  onSelect,
  onOpenQuickAdd,
  searchInputRef,
}: PurchaseProductSearchProps) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.code.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, search]);

  return (
    <div className="relative flex-1 max-w-[420px]" ref={containerRef}>
      <div
        className={`h-9 px-2.5 bg-white border rounded-[6px] flex items-center gap-2 transition ${
          open ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <Search size={15} className="text-slate-400 shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Tìm hàng hóa theo mã hoặc tên (F3)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none"
        />

        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}

        {/* Barcode scanner simulation */}
        <button
          type="button"
          onClick={() => {
            if (products.length > 0) {
              const random = products[Math.floor(Math.random() * products.length)];
              onSelect(random);
            }
          }}
          className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition shrink-0 cursor-pointer"
          title="Mô phỏng quét mã vạch"
        >
          <Grid2X2 size={16} />
        </button>

        {/* Quick Add Product */}
        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="text-slate-500 hover:text-[#0071BA] p-0.5 rounded transition shrink-0 cursor-pointer"
          title="Thêm mới hàng hóa"
        >
          <Plus size={16} />
        </button>
      </div>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[380px] sm:min-w-[480px] bg-white rounded-lg border border-slate-200 shadow-xl py-1.5 z-50 max-h-[320px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
            <span>Hàng hóa tại {warehouseName} ({filtered.length})</span>
            {loading && <span className="text-blue-500 font-normal">Đang tải...</span>}
          </div>
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">
              Không tìm thấy hàng hóa phù hợp.
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onOpenQuickAdd();
                }}
                className="block mx-auto mt-2 text-[#0071BA] font-medium hover:underline cursor-pointer"
              >
                + Thêm hàng hóa mới
              </button>
            </div>
          ) : (
            filtered.map((prod) => (
              <div
                key={prod.productId}
                onClick={() => {
                  onSelect(prod);
                  setSearch('');
                  setOpen(false);
                }}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-b-0 transition"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-xs font-semibold text-slate-800 truncate">{prod.name}</div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-blue-600 font-medium">{prod.code}</span>
                    <span>•</span>
                    <span>ĐVT: {prod.uom || 'Cái'}</span>
                    <span>•</span>
                    <span className={prod.stockQuantity > 0 ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                      Tồn kho: {prod.stockQuantity} {prod.uom || 'Cái'}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-semibold text-slate-700">
                    {(prod.costPrice > 0 ? prod.costPrice : prod.standardPrice).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[10px] text-slate-400">Giá vốn hiện tại</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
