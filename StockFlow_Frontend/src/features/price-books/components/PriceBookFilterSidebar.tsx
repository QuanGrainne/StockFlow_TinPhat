'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Layers, Package, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
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
  onTogglePriceBook: (id: number) => void;
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
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function PriceBookFilterSidebar({
  priceBooks,
  selectedPriceBookIds,
  onTogglePriceBook,
  onOpenCreateModal,
  onEditPriceBook,
  onDeletePriceBook,
  categories,
  selectedCategoryId,
  onSelectCategory,
  stockCondition,
  onSelectStockCondition,
  isCollapsed = false,
  onToggleCollapse,
}: PriceBookFilterSidebarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside listener for dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredPriceBooks = priceBooks.filter((pb) =>
    pb.priceBookName.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <aside
      className={`relative shrink-0 bg-white border-r border-slate-200 select-none text-[#15171a] flex flex-col transition-all duration-200 z-10 ${
        isCollapsed ? 'w-0 border-r-0' : 'w-[260px]'
      }`}
    >
      {/* Nút thu gọn / mở rộng bộ lọc theo chuẩn giao diện Chuyển hàng */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-[#0070f4] text-[#0070f4] hover:bg-[#e6f1fe] shadow-xs flex items-center justify-center cursor-pointer z-30 transition"
          title={isCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
        >
          {isCollapsed ? (
            <ChevronRight size={13} className="stroke-[2.5]" />
          ) : (
            <ChevronLeft size={13} className="stroke-[2.5]" />
          )}
        </button>
      )}

      {!isCollapsed && (
        <div className="flex-1 min-h-0 p-3.5 space-y-4 overflow-y-auto">
          {/* 1. MỤC BẢNG GIÁ (Theo đúng ảnh mẫu Chuyển hàng: Bảng giá / Tạo mới + Hộp Tag xanh) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[13px] font-bold text-[#15171a]">
                Bảng giá
              </span>
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="text-[13px] text-[#0070f4] font-medium hover:underline cursor-pointer transition"
              >
                Tạo mới
              </button>
            </div>

            {/* Clickable Tag Input Box */}
            <div ref={dropdownRef} className="relative">
              <div
                onClick={() => setDropdownOpen((v) => !v)}
                className={`min-h-[38px] p-1.5 rounded-[8px] border bg-white flex flex-wrap items-center gap-1.5 cursor-pointer transition ${
                  dropdownOpen
                    ? 'border-[#0070f4] ring-1 ring-[#0070f4]/20 shadow-xs'
                    : 'border-slate-300 hover:border-slate-400'
                }`}
              >
                {selectedPriceBookIds.map((id) => {
                  const pb = priceBooks.find((p) => p.priceBookId === id);
                  if (!pb) return null;
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] bg-[#0070f4] text-white text-[12px] font-medium shadow-2xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>{pb.priceBookName}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePriceBook(id);
                        }}
                        className="hover:bg-[#005ac3] rounded-sm p-0.5 transition cursor-pointer flex items-center justify-center"
                        title={`Bỏ chọn ${pb.priceBookName}`}
                      >
                        <X size={12} strokeWidth={2.5} />
                      </button>
                    </span>
                  );
                })}

                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (!dropdownOpen) setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                  placeholder={selectedPriceBookIds.length === 0 ? 'Chọn bảng giá...' : ''}
                  className="flex-1 min-w-[30px] bg-transparent outline-none text-xs text-[#15171a] placeholder:text-slate-400 py-0.5"
                />
              </div>

              {/* Dropdown Menu Danh sách Bảng giá */}
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[8px] border border-slate-200 shadow-[0_6px_20px_rgba(0,0,0,0.12)] py-1.5 z-50 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                  {filteredPriceBooks.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-400 italic">
                      Không tìm thấy bảng giá nào
                    </div>
                  ) : (
                    filteredPriceBooks.map((pb) => {
                      const isSelected = selectedPriceBookIds.includes(pb.priceBookId);
                      return (
                        <div
                          key={pb.priceBookId}
                          onClick={() => onTogglePriceBook(pb.priceBookId)}
                          className={`group px-3 py-2 text-[13px] cursor-pointer flex items-center justify-between transition ${
                            isSelected
                              ? 'bg-[#f0f7ff] text-[#15171a] font-medium'
                              : 'text-[#15171a] hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate flex-1 mr-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // handled by parent onClick
                              className="rounded text-[#0070f4] focus:ring-[#0070f4] h-3.5 w-3.5 border-slate-300 pointer-events-none"
                            />
                            <span className="truncate">{pb.priceBookName}</span>
                            {pb.isDefault && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-normal shrink-0">
                                Mặc định
                              </span>
                            )}
                          </div>

                          <div
                            className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!pb.isDefault && (
                              <>
                                <button
                                  type="button"
                                  title="Chỉnh sửa bảng giá này"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditPriceBook?.(pb);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-[#0070f4] hover:bg-blue-100/60 transition cursor-pointer"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  type="button"
                                  title="Xóa bảng giá này"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeletePriceBook?.(pb.priceBookId);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 transition cursor-pointer"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 2. MỤC NHÓM HÀNG */}
          <div>
            <label className="block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">
              Nhóm hàng
            </label>
            <select
              value={selectedCategoryId ?? ''}
              onChange={(e) => onSelectCategory(e.target.value ? Number(e.target.value) : null)}
              className="h-8 w-full rounded-[8px] border border-slate-300 bg-white px-2.5 text-xs text-[#15171a] outline-none transition focus:border-[#0070f4] cursor-pointer"
            >
              <option value="">Tất cả nhóm hàng</option>
              {categories.map((c) => (
                <option key={c.categoryId} value={c.categoryId}>
                  {c.categoryName}
                </option>
              ))}
            </select>
          </div>

          {/* 3. MỤC TỒN KHO */}
          <div>
            <label className="block text-[11px] font-bold text-[#677484] mb-1.5 uppercase tracking-wide">
              Tồn kho
            </label>
            <div className="space-y-1.5 text-xs">
              {[
                { id: 'ALL', label: 'Tất cả' },
                { id: 'IN_STOCK', label: 'Còn hàng trong kho' },
                { id: 'OUT_OF_STOCK', label: 'Hết hàng (Tồn = 0)' },
              ].map((item) => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer text-[#15171a]">
                  <input
                    type="radio"
                    name="stock_filter_radio"
                    checked={stockCondition === item.id}
                    onChange={() => onSelectStockCondition(item.id)}
                    className="text-[#0070f4] focus:ring-[#0070f4] cursor-pointer"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
