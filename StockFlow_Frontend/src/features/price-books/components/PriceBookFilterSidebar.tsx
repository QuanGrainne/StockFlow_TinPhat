'use client';

import React from 'react';
import { Plus, Layers, Package, Edit2, Trash2 } from 'lucide-react';
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
}: PriceBookFilterSidebarProps) {
  return (
    <aside className="w-[260px] shrink-0 bg-white border-r border-[#e5e7eb] px-4 py-5 select-none text-[#262626] hidden lg:block overflow-y-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[18px] font-bold text-slate-900 tracking-tight">
          Thiết lập giá
        </h2>
      </div>

      {/* 1. MỤC BẢNG GIÁ */}
      <div className="mb-6 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">
            Bảng giá
          </span>
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="text-xs text-[#0071BA] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} />
            <span>Thêm</span>
          </button>
        </div>

        {/* Danh sách Price Books (Checkboxes + Chỉnh sửa / Xóa) */}
        <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
          {priceBooks.length === 0 && (
            <p className="text-xs text-slate-400 py-2">Chưa có bảng giá nào</p>
          )}

          {priceBooks.map(pb => {
            const isChecked = selectedPriceBookIds.includes(pb.priceBookId);
            return (
              <div
                key={pb.priceBookId}
                className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition ${
                  isChecked ? 'bg-blue-50/60 font-semibold text-[#0071BA]' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <label className="flex items-center gap-2 truncate cursor-pointer flex-1 mr-1">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onTogglePriceBook(pb.priceBookId)}
                    className="accent-[#0071BA] rounded"
                  />
                  <span className="truncate">{pb.priceBookName}</span>
                </label>

                <div className="flex items-center gap-1 shrink-0">
                  {pb.isDefault ? (
                    <span className="text-[10px] text-slate-400 font-normal">Mặc định</span>
                  ) : (
                    <>
                      <button
                        type="button"
                        title="Chỉnh sửa bảng giá này"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onEditPriceBook?.(pb);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-[#0071BA] hover:bg-blue-100/60 transition cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        title="Xóa bảng giá này"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onDeletePriceBook?.(pb.priceBookId);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-100/60 transition cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. MỤC NHÓM HÀNG */}
      <div className="mb-6 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Layers size={14} className="text-[#0071BA]" />
          <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">
            Nhóm hàng
          </span>
        </div>
        <select
          value={selectedCategoryId ?? ''}
          onChange={e => onSelectCategory(e.target.value ? Number(e.target.value) : null)}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-[#0071BA] focus:ring-1 focus:ring-blue-100"
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
        <div className="flex items-center gap-1.5 mb-2.5">
          <Package size={14} className="text-[#0071BA]" />
          <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">
            Tồn kho
          </span>
        </div>
        <div className="space-y-2 text-xs">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'IN_STOCK', label: 'Còn hàng trong kho' },
            { id: 'OUT_OF_STOCK', label: 'Hết hàng (Tồn = 0)' },
          ].map(item => (
            <label key={item.id} className="flex items-center gap-2 cursor-pointer text-slate-700">
              <input
                type="radio"
                name="stock_filter_radio"
                checked={stockCondition === item.id}
                onChange={() => onSelectStockCondition(item.id)}
                className="accent-[#0071BA]"
              />
              <span>{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
