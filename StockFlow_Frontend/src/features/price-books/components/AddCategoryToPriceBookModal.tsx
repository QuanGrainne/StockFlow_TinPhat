'use client';

import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';

interface CategoryItem {
  categoryId: number;
  categoryName: string;
}

interface AddCategoryToPriceBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryItem[];
  priceBookName: string;
  onConfirm: (selectedCategoryIds: number[]) => Promise<void>;
}

export default function AddCategoryToPriceBookModal({
  isOpen,
  onClose,
  categories,
  onConfirm,
}: AddCategoryToPriceBookModalProps) {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const filteredCategories = useMemo(() => {
    if (!searchKeyword.trim()) return categories;
    const kw = searchKeyword.trim().toLowerCase();
    return categories.filter(c => c.categoryName.toLowerCase().includes(kw));
  }, [categories, searchKeyword]);

  const allSelected = filteredCategories.length > 0 && filteredCategories.every(c => selectedIds.includes(c.categoryId));

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCategories.map(c => c.categoryId));
    }
  };

  const handleToggleItem = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      await onConfirm(selectedIds);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="w-full max-w-[460px] rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/70">
          <h3 className="text-sm font-bold text-slate-800">
            Chọn nhóm hàng vào bảng giá
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition p-1 rounded-md hover:bg-slate-200/60 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5">
          {/* Ô tìm kiếm */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="Tìm kiếm"
              className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-[#0071BA] focus:ring-1 focus:ring-blue-100 placeholder:text-slate-400"
              autoFocus
            />
          </div>

          {/* Danh mục nhóm hàng với checkbox */}
          <div className="max-h-[280px] overflow-y-auto border border-slate-200 rounded-lg p-2.5 space-y-1 bg-slate-50/40 text-xs text-slate-800">
            {/* Tất cả nhóm hàng */}
            <div className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-slate-100/70 font-semibold border-b border-slate-200/70 pb-2 mb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none flex-1">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={handleToggleAll}
                  className="rounded accent-[#0071BA] w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-[#0071BA]">Tất cả nhóm hàng</span>
              </label>
              <span className="text-[11px] text-slate-400 font-normal">
                ({categories.length} nhóm)
              </span>
            </div>

            {/* Từng nhóm hàng */}
            {filteredCategories.map(cat => {
              const isChecked = selectedIds.includes(cat.categoryId);
              return (
                <label
                  key={cat.categoryId}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded cursor-pointer transition select-none ${
                    isChecked ? 'bg-blue-50/80 font-medium text-[#0071BA]' : 'hover:bg-slate-100/60 text-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleItem(cat.categoryId)}
                    className="rounded accent-[#0071BA] w-3.5 h-3.5 cursor-pointer"
                  />
                  <span className="truncate">{cat.categoryName}</span>
                </label>
              );
            })}

            {filteredCategories.length === 0 && (
              <p className="py-4 text-center text-slate-400 italic">
                Không tìm thấy nhóm hàng nào
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/70 text-xs">
          <button
            type="button"
            onClick={handleToggleAll}
            className="text-[#0071BA] hover:underline font-medium cursor-pointer"
          >
            {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-8 px-4 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium transition cursor-pointer disabled:opacity-50"
            >
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedIds.length === 0 || submitting}
              className="h-8 px-4 rounded-md bg-[#0071BA] hover:bg-[#005f9d] text-white font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Đang thêm...' : 'Thêm vào bảng giá'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
