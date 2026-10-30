'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
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

  const defaultBook = useMemo(() => {
    return priceBooks.find(b => b.isDefault) || priceBooks[0];
  }, [priceBooks]);
  const defaultBookId = defaultBook?.priceBookId;

  // Sync tempSelectedIds when popover opens or selectedPriceBookIds changes
  useEffect(() => {
    if (isPopoverOpen) {
      setTempSelectedIds(selectedPriceBookIds);
      setSearchKeyword('');
    }
  }, [isPopoverOpen, selectedPriceBookIds]);

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

  return (
    <aside className="w-[260px] shrink-0 bg-white border-r border-[#e5e7eb] px-4 py-5 select-none text-[#262626] hidden lg:block relative">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">
          Thiết lập giá
        </h2>
      </div>

      {/* 1. MỤC BẢNG GIÁ */}
      <div className="mb-6 pb-5 border-b border-slate-100 relative">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-bold text-slate-800 flex items-center gap-1.5">
            Bảng giá <span className="text-[#0071BA] font-extrabold text-base leading-none">•</span>
          </span>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="text-xs text-[#0071BA] font-semibold hover:underline cursor-pointer"
          >
            Tạo mới
          </button>
        </div>

        {/* Ô chọn bảng giá */}
        <div
          ref={selectorRef}
          onClick={() => setIsPopoverOpen(prev => !prev)}
          className={`min-h-[36px] w-full rounded border px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 text-xs cursor-pointer transition select-none ${
            isPopoverOpen
              ? 'border-[#0071BA] ring-1 ring-blue-100 bg-white'
              : 'border-slate-300 bg-white hover:border-[#0071BA]'
          }`}
        >
          {selectedPriceBooks.length === 0 ? (
            <span className="text-slate-400">Chọn bảng giá</span>
          ) : (
            selectedPriceBooks.map(pb => (
              <span
                key={pb.priceBookId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#0071BA] text-white text-xs font-medium shadow-2xs"
              >
                <span className="max-w-[150px] truncate">{pb.priceBookName}</span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    handleRemovePriceBook(pb.priceBookId);
                  }}
                  className="hover:text-blue-200 transition font-bold leading-none cursor-pointer"
                  title="Bỏ chọn"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>

        {/* POPOVER NỔI CHUẨN KIOTVIET */}
        {isPopoverOpen && (
          <div
            ref={popoverRef}
            className="absolute left-[calc(100%+10px)] top-0 z-50 w-[310px] rounded-lg border border-slate-200 bg-white shadow-2xl p-3.5 space-y-3"
          >
            {/* Mũi tên trỏ sang ô chọn bên trái */}
            <div className="absolute -left-[6px] top-4 w-3 h-3 bg-white border-l border-b border-slate-200 rotate-45 transform" />

            {/* Popover Header */}
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800">Bảng giá</span>
              <button
                type="button"
                onClick={() => {
                  setIsPopoverOpen(false);
                  onOpenCreateModal();
                }}
                className="text-xs font-semibold text-[#0071BA] hover:underline cursor-pointer"
              >
                Tạo mới
              </button>
            </div>

            {/* Ô tìm kiếm */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder="Tìm kiếm"
                className="h-8 w-full rounded-md border border-slate-300 bg-white pl-8 pr-2.5 text-xs text-slate-700 outline-none focus:border-[#0071BA] focus:ring-1 focus:ring-blue-100 placeholder:text-slate-400"
                autoFocus
              />
            </div>

            {/* Danh sách checkbox bảng giá */}
            <div className="max-h-[220px] overflow-y-auto space-y-1 py-1 -mx-1 px-1">
              {filteredBooks.map(pb => {
                const isChecked = tempSelectedIds.includes(pb.priceBookId);
                return (
                  <div
                    key={pb.priceBookId}
                    className="group flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-50 text-xs text-slate-800 transition"
                  >
                    <label className="flex items-center gap-2 cursor-pointer flex-1 truncate select-none">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleTemp(pb.priceBookId)}
                        className="rounded accent-[#0071BA] w-3.5 h-3.5 cursor-pointer"
                      />
                      <span className="truncate">{pb.priceBookName}</span>
                    </label>

                    {/* Icon bút chì chỉnh sửa bảng giá */}
                    {!pb.isDefault && (
                      <button
                        type="button"
                        title="Chỉnh sửa bảng giá"
                        onClick={e => {
                          e.stopPropagation();
                          setIsPopoverOpen(false);
                          onEditPriceBook?.(pb);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-[#0071BA] transition cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}

              {filteredBooks.length === 0 && (
                <p className="text-center text-xs text-slate-400 py-3">Không tìm thấy bảng giá nào</p>
              )}
            </div>

            {/* Popover Footer */}
            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-[#0071BA] hover:underline font-medium cursor-pointer"
              >
                {tempSelectedIds.length === priceBooks.length ? 'Bỏ chọn' : 'Chọn tất cả'}
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="h-7 px-4 rounded bg-[#0071BA] hover:bg-[#005f9d] text-white font-semibold shadow-xs transition cursor-pointer text-xs"
              >
                Áp dụng
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. MỤC NHÓM HÀNG */}
      <div className="mb-6 pb-5 border-b border-slate-100">
        <div className="mb-2.5">
          <span className="text-[13px] font-bold text-slate-800">
            Nhóm hàng
          </span>
        </div>
        <select
          value={selectedCategoryId ?? ''}
          onChange={e => onSelectCategory(e.target.value ? Number(e.target.value) : null)}
          className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-[#0071BA] focus:ring-1 focus:ring-blue-100"
        >
          <option value="">Tất cả nhóm hàng</option>
          {categories.map(c => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.categoryName}
            </option>
          ))}
        </select>
      </div>

      {/* 3. MỤC TỒN KHO */}
      <div className="mb-6 pb-5 border-b border-slate-100">
        <div className="mb-2.5">
          <span className="text-[13px] font-bold text-slate-800">
            Tồn kho
          </span>
        </div>
        <select
          value={stockCondition}
          onChange={e => onSelectStockCondition(e.target.value)}
          className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-[#0071BA] focus:ring-1 focus:ring-blue-100"
        >
          <option value="ALL">Tất cả</option>
          <option value="IN_STOCK">Còn hàng trong kho</option>
          <option value="OUT_OF_STOCK">Hết hàng (Tồn = 0)</option>
        </select>
      </div>

      {/* 4. MỤC GIÁ BÁN */}
      <div className="mb-6 pb-5 border-b border-slate-100 space-y-2">
        <div className="mb-1">
          <span className="text-[13px] font-bold text-slate-800">
            Giá bán
          </span>
        </div>
        <select
          defaultValue=""
          className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-500 outline-none transition focus:border-[#0071BA]"
        >
          <option value="">Chọn điều kiện</option>
          <option value="GT">Lớn hơn (&gt;)</option>
          <option value="LT">Nhỏ hơn (&lt;)</option>
          <option value="EQ">Bằng (=)</option>
        </select>
        <select
          defaultValue=""
          className="h-9 w-full rounded border border-slate-300 bg-white px-2.5 text-xs text-slate-500 outline-none transition focus:border-[#0071BA]"
        >
          <option value="">Chọn giá so sánh</option>
          <option value="COST">Giá vốn</option>
          <option value="LATEST_PURCHASE">Giá nhập cuối</option>
        </select>
      </div>
    </aside>
  );
}
