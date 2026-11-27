// src/features/products/components/catalog/EditCategoryModal.tsx
// Sửa / xóa nhóm hàng (mở từ nút bút chì ở bộ lọc Nhóm hàng). Nhóm còn hàng hóa thì backend không cho xóa.
'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, RefreshCw, Tag, Trash2, X } from 'lucide-react';
import { productService, type ProductCategoryItem } from '../../services/goodsCatalogService';

interface EditCategoryModalProps {
  category: ProductCategoryItem;
  /** Số hàng hóa đang thuộc nhóm (đếm trên danh sách đang tải) */
  productCount: number;
  onClose: () => void;
  onSaved: (oldName: string, saved: ProductCategoryItem) => void;
  onDeleted: (name: string) => void;
}

export function EditCategoryModal({ category, productCount, onClose, onSaved, onDeleted }: EditCategoryModalProps) {
  const [name, setName] = useState(category.categoryName);
  const [description, setDescription] = useState(category.description ?? '');
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Tên nhóm hàng không được để trống.');
      return;
    }
    setBusy('save');
    setError(null);
    try {
      const saved = await productService.updateCategory(category.categoryId, {
        categoryName: trimmed,
        description: description.trim(),
      });
      onSaved(category.categoryName, saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không lưu được nhóm hàng.');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy('delete');
    setError(null);
    try {
      await productService.deleteCategory(category.categoryId);
      onDeleted(category.categoryName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không xóa được nhóm hàng.');
      setConfirmDelete(false);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Tag size={16} className="text-[#0071BA]" />
            <h3 className="text-sm font-bold text-slate-800">Sửa nhóm hàng</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
            title="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              Tên nhóm hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              maxLength={100}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0071BA] focus:ring-1 focus:ring-[#0071BA] font-medium"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Ghi chú / Mô tả</label>
            <textarea
              rows={2}
              value={description}
              maxLength={255}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#0071BA] font-normal resize-none"
            />
          </div>
          <p className="text-[11px] text-slate-500">
            Nhóm đang có <strong className="text-slate-700">{productCount.toLocaleString('vi-VN')}</strong> hàng hóa. Đổi tên không
            làm thay đổi hàng hóa trong nhóm.
          </p>

          {error && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {confirmDelete ? (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span>
                  Xóa nhóm hàng <strong>{category.categoryName}</strong>? Chỉ xóa được khi nhóm không còn hàng hóa nào.
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={busy !== null}
                  className="h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete()}
                  disabled={busy !== null}
                  className="h-8 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {busy === 'delete' ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  <span>{busy === 'delete' ? 'Đang xóa...' : 'Xóa nhóm hàng'}</span>
                </button>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setConfirmDelete(true);
              }}
              disabled={busy !== null || confirmDelete}
              className="h-9 px-3 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 font-medium transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={13} />
              <span>Xóa</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-9 px-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition cursor-pointer"
              >
                Bỏ qua
              </button>
              <button
                type="submit"
                disabled={busy !== null}
                className="h-9 px-4 rounded-lg bg-[#0071BA] hover:bg-[#005a94] text-white font-medium shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {busy === 'save' ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
                <span>{busy === 'save' ? 'Đang lưu...' : 'Lưu'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
