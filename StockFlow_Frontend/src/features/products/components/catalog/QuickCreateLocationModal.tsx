// src/features/products/components/catalog/QuickCreateLocationModal.tsx
// Tạo mới vị trí kho nhanh – T19 lát 3: JSX chuyển nguyên văn từ screens/GoodsCatalogScreen.tsx; state vẫn ở màn hình, truyền qua props.
import React from 'react';
import { X, Check, MapPin } from 'lucide-react';

interface QuickCreateLocationModalProps {
  setIsQuickLocationModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newLocationName: string;
  setNewLocationName: React.Dispatch<React.SetStateAction<string>>;
  newLocationDesc: string;
  setNewLocationDesc: React.Dispatch<React.SetStateAction<string>>;
  handleSaveQuickLocation: (e?: React.FormEvent) => void;
}

export function QuickCreateLocationModal({
  setIsQuickLocationModalOpen,
  newLocationName,
  setNewLocationName,
  newLocationDesc,
  setNewLocationDesc,
  handleSaveQuickLocation,
}: QuickCreateLocationModalProps) {
  return (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Tạo mới vị trí</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickLocationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickLocation} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Tên vị trí <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="VD: Kệ A-01-T2, Khu Vực B, Dãy C..."
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Ghi chú / Mô tả vị trí
                </label>
                <textarea
                  rows={2}
                  value={newLocationDesc}
                  onChange={(e) => setNewLocationDesc(e.target.value)}
                  placeholder="Mô tả chi tiết về vị trí này..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-normal resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickLocationModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={13} />
                  <span>Lưu vị trí</span>
                </button>
              </div>
            </form>
          </div>
        </div>
  );
}
