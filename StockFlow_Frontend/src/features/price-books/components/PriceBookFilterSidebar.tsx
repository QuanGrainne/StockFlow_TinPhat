'use client';

import React from 'react';
import { Plus, X, ChevronDown, Check, Building2, Layers, Package, DollarSign } from 'lucide-react';
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
  warehouses: WarehouseItem[];
  selectedWarehouseId: number | null;
  onSelectWarehouse: (id: number | null) => void;
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
  warehouses,
  selectedWarehouseId,
  onSelectWarehouse,
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
            className="text-xs font-semibold text-[#0071BA] hover:text-[#005f9d] hover:underline flex items-center gap-0.5"
          >
            <Plus size={13} /> Tạo mới
          </button>
        </div>

        {/* Selected Price Books Chips */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {priceBooks
            .filter(pb => selectedPriceBookIds.includes(pb.priceBookId))
            .map(pb => (
              <span
                key={pb.priceBookId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-[#0071BA] border border-blue-200"
              >
                {pb.priceBookName}
                {/* Do not allow closing default if only 1 left */}
                {selectedPriceBookIds.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onTogglePriceBook(pb.priceBookId)}
                    className="hover:text-blue-900"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
        </div>

        {/* List of all price books */}
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {priceBooks.map(pb => {
            const isChecked = selectedPriceBookIds.includes(pb.priceBookId);
            return (
              <label
                key={pb.priceBookId}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition ${
                  isChecked ? 'bg-blue-50/60 font-semibold text-[#0071BA]' : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onTogglePriceBook(pb.priceBookId)}
                    className="accent-[#0071BA] rounded"
                  />
                  <span className="truncate">{pb.priceBookName}</span>
                </div>
                {pb.isDefault && (
                  <span className="text-[10px] text-slate-400 font-normal">Mặc định</span>
                )}
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. MỤC KHO HÀNG (ĐA KHO) */}
      <div className="mb-6 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Building2 size={14} className="text-[#0071BA]" />
          <span className="text-[13px] font-bold text-slate-800 uppercase tracking-wide">
            Kho xem giá vốn & giá nhập
          </span>
        </div>
        <select
          value={selectedWarehouseId ?? ''}
          onChange={e => onSelectWarehouse(e.target.value ? Number(e.target.value) : null)}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs text-slate-700 outline-none transition focus:border-[#0071BA] focus:ring-1 focus:ring-blue-100"
        >
          <option value="">Toàn hệ thống (Giá bình quân)</option>
          {warehouses.map(w => (
            <option key={w.warehouseId} value={w.warehouseId}>
              {w.warehouseName} ({w.warehouseCode})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-400 mt-1.5 italic">
          * Đổi kho sẽ hiển thị giá vốn & giá nhập cuối riêng của kho đó.
        </p>
      </div>

      {/* 3. MỤC NHÓM HÀNG */}
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

      {/* 4. MỤC TỒN KHO */}
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
