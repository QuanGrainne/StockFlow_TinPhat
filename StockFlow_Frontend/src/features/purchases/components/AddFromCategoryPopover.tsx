'use client';

// Nút trong ô tìm kiếm của màn Nhập hàng: "Thêm hàng hóa từ nhóm hàng".
// Chọn 1 hoặc nhiều nhóm hàng → lấy toàn bộ hàng hóa đang kinh doanh của các nhóm đó và thêm vào phiếu.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGrid, Loader2, Search } from 'lucide-react';
import {
  productService,
  BackendProduct,
  BackendProductCategory,
} from '@/features/products/services/productService';

interface AddFromCategoryPopoverProps {
  warehouseId?: number;
  onAddProducts: (products: BackendProduct[], categoryNames: string[]) => void;
  onError: (message: string) => void;
}

export function AddFromCategoryPopover({ warehouseId, onAddProducts, onError }: AddFromCategoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<BackendProductCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [keyword, setKeyword] = useState('');
  const [adding, setAdding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Đóng khi click ra ngoài
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (!next || categories.length > 0) return;
    setLoadingCategories(true);
    try {
      // Lấy tất cả nhóm hàng (kể cả nhóm ngừng hoạt động — vẫn có thể còn hàng đang kinh doanh)
      const list = await productService.getCategories();
      setCategories(list);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Không tải được danh sách nhóm hàng');
    } finally {
      setLoadingCategories(false);
    }
  };

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return kw ? categories.filter((c) => c.categoryName.toLowerCase().includes(kw)) : categories;
  }, [categories, keyword]);

  const toggle = (id: number) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleAdd = async () => {
    if (selectedIds.length === 0) return;
    setAdding(true);
    try {
      const results = await Promise.all(
        selectedIds.map((categoryId) =>
          productService.getProducts({ warehouseId, categoryId, status: 'ACTIVE' })
        )
      );
      // Gộp, bỏ trùng theo productId
      const map = new Map<number, BackendProduct>();
      results.flat().forEach((p) => map.set(p.productId, p));
      const names = categories.filter((c) => selectedIds.includes(c.categoryId)).map((c) => c.categoryName);
      onAddProducts([...map.values()], names);
      setSelectedIds([]);
      setKeyword('');
      setOpen(false);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Không tải được hàng hóa của nhóm hàng');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={handleOpen}
        className={`p-1 rounded-[4px] transition cursor-pointer ${
          open ? 'text-[#0070f4] bg-[#eff6ff]' : 'text-[#677484] hover:text-[#15171a]'
        }`}
        title="Thêm hàng hóa từ nhóm hàng"
      >
        <LayoutGrid size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 bg-white border border-slate-200 rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 pt-3 pb-2 border-b border-slate-100">
            <div className="text-[13px] font-bold text-[#15171a] mb-2">Thêm hàng hóa từ nhóm hàng</div>
            <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] border border-slate-300 focus-within:border-[#0070f4]">
              <Search size={13} className="text-[#677484] shrink-0" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Tìm nhóm hàng"
                className="w-full bg-transparent outline-none text-[13px] text-[#15171a] placeholder-[#677484]"
              />
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto py-1">
            {loadingCategories ? (
              <div className="p-4 flex items-center justify-center gap-2 text-xs text-[#677484]">
                <Loader2 size={14} className="animate-spin text-[#0070f4]" />
                Đang tải nhóm hàng...
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#677484]">Không có nhóm hàng phù hợp</div>
            ) : (
              filtered.map((c) => {
                const checked = selectedIds.includes(c.categoryId);
                return (
                  <label
                    key={c.categoryId}
                    className={`flex items-center justify-between gap-2 px-3 py-2 cursor-pointer transition ${
                      checked ? 'bg-[#eff6ff]' : 'hover:bg-[#f7f8f9]'
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(c.categoryId)}
                        className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 cursor-pointer"
                      />
                      <span className={`text-[13px] truncate ${c.isActive === false ? 'text-[#677484]' : 'text-[#15171a]'}`}>
                        {c.categoryName}
                      </span>
                      {c.isActive === false && (
                        <span className="shrink-0 px-1.5 rounded-[4px] bg-slate-100 text-[10px] text-[#677484]">Ngừng</span>
                      )}
                    </span>
                    <span
                      className="text-[11px] text-[#677484] shrink-0"
                      title={`${c.productCount} hàng hóa trong nhóm, chỉ thêm hàng đang kinh doanh`}
                    >
                      {c.activeProductCount ?? c.productCount} hàng hóa
                    </span>
                  </label>
                );
              })
            )}
          </div>

          <div className="px-3 py-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[12px] text-[#677484]">Đã chọn {selectedIds.length} nhóm</span>
            <button
              type="button"
              onClick={handleAdd}
              disabled={selectedIds.length === 0 || adding}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-[13px] font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {adding && <Loader2 size={13} className="animate-spin" />}
              <span>Thêm vào phiếu</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
