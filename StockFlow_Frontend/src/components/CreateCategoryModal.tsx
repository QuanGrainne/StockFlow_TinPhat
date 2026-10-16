'use client';

import { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

type CreateCategoryModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: (categoryName: string) => void;
};

export default function CreateCategoryModal({
  open,
  onClose,
  onSuccess,
}: CreateCategoryModalProps) {
  const [categoryName, setCategoryName] = useState('');
  const [parentCategory, setParentCategory] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Vui lòng nhập tên nhóm hàng.');
      return;
    }

    onSuccess?.(categoryName.trim());
    setCategoryName('');
    setParentCategory('');
    setDescription('');
    setError('');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0071BA] flex items-center justify-center">
              <FolderPlus size={18} />
            </div>
            <h3 className="text-base font-semibold text-slate-800">Thêm nhóm hàng mới</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Tên nhóm hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                if (error) setError('');
              }}
              placeholder="VD: Thang máng cáp, Tôn cuộn..."
              className="w-full h-9 px-3 text-sm rounded-[6px] border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Nhóm hàng cha
            </label>
            <select
              value={parentCategory}
              onChange={(e) => setParentCategory(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-[6px] border border-slate-300 bg-white text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
            >
              <option value="">-- Không có (Nhóm gốc) --</option>
              <option value="Thành phẩm">Thành phẩm</option>
              <option value="Nguyên vật liệu">Nguyên vật liệu</option>
              <option value="Phụ kiện">Phụ kiện</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Mô tả / Ghi chú
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nhập mô tả nhóm hàng nếu có..."
              className="w-full px-3 py-2 text-sm rounded-[6px] border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition resize-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0071BA] hover:bg-blue-700 rounded-lg transition shadow-sm"
            >
              Lưu nhóm hàng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
