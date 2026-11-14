// src/features/products/components/catalog/QuickCreateCategoryModal.tsx
// Tạo mới nhóm hàng nhanh – T19 lát 3: JSX chuyển nguyên văn từ screens/GoodsCatalogScreen.tsx; state vẫn ở màn hình, truyền qua props.
import React from 'react';
import { X, Tag, Check, RefreshCw } from 'lucide-react';

interface QuickCreateCategoryModalProps {
  setIsQuickCategoryModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newCategoryName: string;
  setNewCategoryName: React.Dispatch<React.SetStateAction<string>>;
  newCategoryParent: string;
  setNewCategoryParent: React.Dispatch<React.SetStateAction<string>>;
  newCategoryDesc: string;
  setNewCategoryDesc: React.Dispatch<React.SetStateAction<string>>;
  isSavingCategory: boolean;
  categoriesList: string[];
  handleSaveQuickCategory: (e?: React.FormEvent) => Promise<void>;
}

export function QuickCreateCategoryModal({
  setIsQuickCategoryModalOpen,
  newCategoryName,
  setNewCategoryName,
  newCategoryParent,
  setNewCategoryParent,
  newCategoryDesc,
  setNewCategoryDesc,
  isSavingCategory,
  categoriesList,
  handleSaveQuickCategory,
}: QuickCreateCategoryModalProps) {
  return (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Tạo mới nhóm hàng</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCategory} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Tên nhóm hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="VD: Phào chỉ trang trí, Tấm PVC cao cấp, Sữa..."
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Nhóm cha (Tùy chọn)
                </label>
                <select
                  value={newCategoryParent}
                  onChange={(e) => setNewCategoryParent(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium bg-white"
                >
                  <option value="">-- Là nhóm gốc (Không có nhóm cha) --</option>
                  {categoriesList.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Ghi chú / Mô tả
                </label>
                <textarea
                  rows={2}
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Mô tả tóm tắt về nhóm hàng này..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-normal resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickCategoryModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCategory ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Lưu nhóm hàng</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
