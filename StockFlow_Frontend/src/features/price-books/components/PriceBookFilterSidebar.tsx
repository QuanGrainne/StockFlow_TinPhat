'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Edit2 } from 'lucide-react';
import { PriceBook } from '../types';

interface WarehouseItem {
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
}

interface CategoryItem {
  categoryId: number;
  categoryName: string;
}

interface PriceBookFilterSidebarProps {
  priceBooks: PriceBook[];
  selectedPriceBookIds: number[];
  onSelectPriceBooks: (ids: number[]) => void;
  onOpenCreateModal: () => void;
  onEditPriceBook?: (priceBook: PriceBook) => void;
  onDeletePriceBook?: (id: number) => void;
  warehouses?: WarehouseItem[];
  selectedWarehouseId?: number | null;
  onSelectWarehouse?: (id: number | null) => void;
  categories: CategoryItem[];
  selectedCategoryId: number | null;
  onSelectCategory: (id: number | null) => void;
  stockCondition: string;
  onSelectStockCondition: (condition: string) => void;
}

export default function PriceBookFilterSidebar({
  priceBooks,
  selectedPriceBookIds,
  onSelectPriceBooks,
  onOpenCreateModal,
  onEditPriceBook,
  categories,
  selectedCategoryId,
  onSelectCategory,
  stockCondition,
  onSelectStockCondition,
}: PriceBookFilterSidebarProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [tempSelectedIds, setTempSelectedIds] = useState<number[]>([]);

  const popoverRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Mở popover: lấy lại lựa chọn hiện tại và xóa từ khóa (trước đây làm trong useEffect → render 2 lần)
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const updatePopoverPos = () => {
    const r = selectorRef.current?.getBoundingClientRect();
    if (r) setPopoverPos({ top: r.top, left: r.right + 10 });
  };

  const togglePopover = () => {
    if (!isPopoverOpen) {
      setTempSelectedIds(selectedPriceBookIds);
      setSearchKeyword('');
      updatePopoverPos();
    }
    setIsPopoverOpen(!isPopoverOpen);
  };

  // Popover render qua portal (position: fixed) → cập nhật vị trí khi cuộn / đổi kích thước
  useEffect(() => {
    if (!isPopoverOpen) return;
    window.addEventListener('resize', updatePopoverPos);
    window.addEventListener('scroll', updatePopoverPos, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPos);
      window.removeEventListener('scroll', updatePopoverPos, true);
    };
  }, [isPopoverOpen]);

  // Click outside listener to close popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        selectorRef.current &&
        !selectorRef.current.contains(e.target as Node)
      ) {
        setIsPopoverOpen(false);
      }
    };

    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPopoverOpen]);

  // Filtered price books in popover
  const filteredBooks = useMemo(() => {
    if (!searchKeyword.trim()) return priceBooks;
    const kw = searchKeyword.trim().toLowerCase();
    return priceBooks.filter(pb => pb.priceBookName.toLowerCase().includes(kw));
  }, [priceBooks, searchKeyword]);

  // Toggle selection inside popover
  const handleToggleTemp = (id: number) => {
    setTempSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleToggleAll = () => {
    if (tempSelectedIds.length === priceBooks.length) {
      setTempSelectedIds([]);
    } else {
      setTempSelectedIds(priceBooks.map(pb => pb.priceBookId));
    }
  };

  const handleApply = () => {
    onSelectPriceBooks(tempSelectedIds);
    setIsPopoverOpen(false);
  };

  const handleRemovePriceBook = (id: number) => {
    onSelectPriceBooks(selectedPriceBookIds.filter(x => x !== id));
  };

  const selectedPriceBooks = useMemo(() => {
    return priceBooks.filter(pb => selectedPriceBookIds.includes(pb.priceBookId));
  }, [priceBooks, selectedPriceBookIds]);

  const label = 'text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide';
  const selectCls =
    'h-9 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 text-[13px] text-[#15171a] outline-none transition focus:border-[#0070f4] cursor-pointer';

  return (
    <aside className="w-[240px] shrink-0 bg-white/75 backdrop-blur-[2px] border-r border-slate-200 p-3.5 space-y-4 select-none text-[#15171a] block relative overflow-visible">
      {/* 1. Bảng giá */}
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={label}>Bảng giá</div>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="text-[12px] text-[#0070f4] font-semibold hover:underline cursor-pointer mb-1.5"
          >
            Tạo mới
          </button>
        </div>

        <div
          ref={selectorRef}
          onClick={togglePopover}
          className={`min-h-[38px] w-full rounded-[8px] border p-1.5 flex flex-wrap items-center gap-1.5 cursor-pointer transition ${
            isPopoverOpen ? 'border-[#0070f4] bg-white' : 'border-slate-300 bg-white hover:border-[#0070f4]'
          }`}
        >
          {selectedPriceBooks.length === 0 ? (
            <span className="text-[13px] text-slate-400 px-1">Chọn bảng giá</span>
          ) : (
            selectedPriceBooks.map(pb => (
              <span
                key={pb.priceBookId}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#0070f4] text-white text-[12px] font-medium shadow-2xs"
              >
                <span className="max-w-[150px] truncate">{pb.priceBookName}</span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleRemovePriceBook(pb.priceBookId);
                  }}
                  className="hover:bg-[#005ac3] rounded-sm px-0.5 leading-none cursor-pointer"
                  title="Bỏ chọn"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        {isPopoverOpen && popoverPos && typeof document !== 'undefined' && createPortal(
          <div
            ref={popoverRef}
            style={{ top: popoverPos.top, left: popoverPos.left }}
            className="fixed z-[1000] w-[310px] text-[#15171a] select-none rounded-[8px] border border-slate-200 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.12)] p-3.5 space-y-3"
          >
            <div className="absolute -left-[6px] top-4 w-3 h-3 bg-white border-l border-b border-slate-200 rotate-45" />

            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-[13px] font-bold">Bảng giá</span>
              <button
                type="button"
                onClick={() => {
                  setIsPopoverOpen(false);
                  onOpenCreateModal();
                }}
                className="text-[12px] font-semibold text-[#0070f4] hover:underline cursor-pointer"
              >
                Tạo mới
              </button>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484]" />
              <input
                type="text"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder="Tìm kiếm"
                className="h-8 w-full rounded-full border border-slate-200 bg-[#f7f8f9] pl-8 pr-3 text-[13px] outline-none focus:border-[#0070f4] focus:bg-white placeholder:text-[#677484]"
                autoFocus
              />
            </div>

            <div className="max-h-[220px] overflow-y-auto space-y-0.5 -mx-1 px-1">
              {filteredBooks.map(pb => {
                const isChecked = tempSelectedIds.includes(pb.priceBookId);
                return (
                  <div
                    key={pb.priceBookId}
                    className="group flex items-center justify-between px-2 py-1.5 rounded-[6px] hover:bg-[#f7f8f9] text-[13px] transition"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 truncate">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTemp(pb.priceBookId)}
                        className="rounded accent-[#0070f4] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="truncate">{pb.priceBookName}</span>
                    </label>
                    {!pb.isDefault && (
                      <button
                        type="button"
                        title="Chỉnh sửa bảng giá"
                        onClick={e => {
                          e.stopPropagation();
                          setIsPopoverOpen(false);
                          onEditPriceBook?.(pb);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#677484] hover:text-[#0070f4] transition cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
              {filteredBooks.length === 0 && (
                <p className="text-center text-[12px] text-slate-400 py-3">Không tìm thấy bảng giá nào</p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-[13px]">
              <button type="button" onClick={handleToggleAll} className="text-[#0070f4] hover:underline font-medium cursor-pointer">
                {tempSelectedIds.length === priceBooks.length ? 'Bỏ chọn' : 'Chọn tất cả'}
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="h-8 px-4 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer"
              >
                Áp dụng
              </button>
            </div>
          </div>,
          document.body
        )}
      </div>

      <div className="border-t border-slate-100" />

      {/* 2. Nhóm hàng */}
      <div>
        <div className={label}>Nhóm hàng</div>
        <select
          value={selectedCategoryId ?? ''}
          onChange={e => onSelectCategory(e.target.value ? Number(e.target.value) : null)}
          className={selectCls}
        >
          <option value="">Tất cả nhóm hàng</option>
          {categories.map(c => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.categoryName}
            </option>
          ))}
        </select>
      </div>

      <div className="border-t border-slate-100" />

      {/* 3. Tồn kho */}
      <div>
        <div className={label}>Tồn kho</div>
        <select value={stockCondition} onChange={e => onSelectStockCondition(e.target.value)} className={selectCls}>
          <option value="ALL">Tất cả</option>
          <option value="IN_STOCK">Còn hàng trong kho</option>
          <option value="OUT_OF_STOCK">Hết hàng (Tồn = 0)</option>
        </select>
      </div>
    </aside>
  );
}
