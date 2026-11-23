// src/features/products/components/catalog/CostScopeConfirmModal.tsx
// Modal xác nhận phạm vi áp dụng giá vốn (Toàn hệ thống / Theo chi nhánh) – T19 lát 5: thân hàm và JSX chuyển
// nguyên văn từ khối IIFE trong screens/GoodsCatalogScreen.tsx; state và executeSaveItem vẫn ở màn hình.
import React from 'react';
import { Search, Building, X, Warehouse, Check, RefreshCw, Globe } from 'lucide-react';
import type { WarehouseFacility } from '@/features/admin/types';

interface CostScopeConfirmModalProps {
  warehouseFilter: string;
  facilities: WarehouseFacility[];
  setCostConfirmModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  costScope: 'ALL' | 'BRANCH';
  setCostScope: React.Dispatch<React.SetStateAction<'ALL' | 'BRANCH'>>;
  costSelectedBranches: string[];
  setCostSelectedBranches: React.Dispatch<React.SetStateAction<string[]>>;
  pendingKeepOpen: boolean;
  costBranchSearch: string;
  setCostBranchSearch: React.Dispatch<React.SetStateAction<string>>;
  formWarehouse: string;
  isSaving: boolean;
  permittedFacilities: WarehouseFacility[];
  executeSaveItem: (applyCostScope: 'ALL' | 'BRANCH' | 'KEEP_EXISTING', targetBranchesForCost?: string[], keepOpen?: boolean) => Promise<void>;
}

export function CostScopeConfirmModal({
  warehouseFilter,
  facilities,
  setCostConfirmModalOpen,
  costScope,
  setCostScope,
  costSelectedBranches,
  setCostSelectedBranches,
  pendingKeepOpen,
  costBranchSearch,
  setCostBranchSearch,
  formWarehouse,
  isSaving,
  permittedFacilities,
  executeSaveItem,
}: CostScopeConfirmModalProps) {
        // Danh sách kho thật từ DB: ưu tiên kho được phân quyền, không có thì toàn bộ kho đang hoạt động
        const allFacilitiesList = permittedFacilities.length > 0 ? permittedFacilities : facilities;
        // Kho mặc định khi chọn "Theo chi nhánh kho": kho trên form → kho làm việc → kho đầu tiên trong danh sách
        const defaultBranch = formWarehouse || warehouseFilter || allFacilitiesList[0]?.name || '';

        const filteredFacilities = allFacilitiesList.filter(
          (fac) =>
            fac.name.toLowerCase().includes(costBranchSearch.toLowerCase()) ||
            (fac.code && fac.code.toLowerCase().includes(costBranchSearch.toLowerCase()))
        );

        return (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl flex flex-col my-auto animate-in zoom-in-95 duration-150">
              {/* Header Modal */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-linear-to-r from-blue-50/50 via-white to-slate-50/50 rounded-t-3xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/70 shadow-2xs">
                    <Building size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Xác nhận áp dụng Giá vốn
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bạn muốn áp dụng giá vốn cho sản phẩm này trên phạm vi nào?
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCostConfirmModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[70vh]">
                {/* 2 Thẻ tùy chọn lớn: Toàn hệ thống vs Tùy chọn chi nhánh */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Thẻ 1: Toàn hệ thống */}
                  <div
                    onClick={() => setCostScope('ALL')}
                    className={`p-4.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between gap-3 select-none ${
                      costScope === 'ALL'
                        ? 'border-blue-600 bg-blue-50/60 ring-4 ring-blue-500/10 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                        costScope === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Globe size={18} />
                      </div>
                      <input
                        type="radio"
                        name="costScopeRadio"
                        checked={costScope === 'ALL'}
                        onChange={() => setCostScope('ALL')}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer mt-1"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Toàn hệ thống</div>
                      <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Áp dụng mức giá vốn đồng bộ cho toàn bộ tất cả chi nhánh kho trong hệ thống
                      </div>
                    </div>
                  </div>

                  {/* Thẻ 2: Tùy chọn chi nhánh kho */}
                  <div
                    onClick={() => {
                      setCostScope('BRANCH');
                      if (costSelectedBranches.length === 0) {
                        if (defaultBranch) setCostSelectedBranches([defaultBranch]);
                      }
                    }}
                    className={`p-4.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between gap-3 select-none ${
                      costScope === 'BRANCH'
                        ? 'border-blue-600 bg-blue-50/60 ring-4 ring-blue-500/10 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                        costScope === 'BRANCH' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Warehouse size={18} />
                      </div>
                      <input
                        type="radio"
                        name="costScopeRadio"
                        checked={costScope === 'BRANCH'}
                        onChange={() => {
                          setCostScope('BRANCH');
                          if (costSelectedBranches.length === 0) {
                            if (defaultBranch) setCostSelectedBranches([defaultBranch]);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer mt-1"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Theo chi nhánh kho</div>
                      <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Chọn một hoặc nhiều kho riêng biệt để cập nhật giá vốn, các kho khác giữ nguyên
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danh sách chọn kho khi chọn Chi nhánh: Rộng rãi, hiển thị dạng Grid 2 cột */}
                {costScope === 'BRANCH' && (
                  <div className="border border-slate-200 rounded-2xl p-4.5 bg-slate-50/60 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/80">
                      {/* Ô tìm kiếm kho */}
                      <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={costBranchSearch}
                          onChange={(e) => setCostBranchSearch(e.target.value)}
                          placeholder="Tìm nhanh kho / chi nhánh..."
                          className="w-full h-8.5 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        />
                        {costBranchSearch && (
                          <button
                            type="button"
                            onClick={() => setCostBranchSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Toolbar Thao tác nhanh */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                          Đã chọn: <b className="text-blue-600 font-bold">{costSelectedBranches.length}</b>/{allFacilitiesList.length} kho
                        </span>
                        <button
                          type="button"
                          onClick={() => setCostSelectedBranches(allFacilitiesList.map((f) => f.name))}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setCostSelectedBranches([])}
                          className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    {/* Lưới các kho: 2 CỘT RỘNG RÃI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {filteredFacilities.map((fac) => {
                        const isChecked = costSelectedBranches.some(
                          (b) => b.trim().toLowerCase() === fac.name.trim().toLowerCase()
                        );
                        return (
                          <div
                            key={fac.code || fac.name}
                            onClick={() => {
                              if (isChecked) {
                                setCostSelectedBranches(
                                  costSelectedBranches.filter(
                                    (b) => b.trim().toLowerCase() !== fac.name.trim().toLowerCase()
                                  )
                                );
                              } else {
                                setCostSelectedBranches([...costSelectedBranches, fac.name]);
                              }
                            }}
                            className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-3 select-none ${
                              isChecked
                                ? 'border-blue-500 bg-white ring-2 ring-blue-500/15 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                                  isChecked
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isChecked && <Check size={13} strokeWidth={3} />}
                              </div>
                              <div className="min-w-0">
                                <div className={`text-xs truncate ${isChecked ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                  {fac.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                  {fac.code || 'KHO'} {fac.address ? `• ${fac.address}` : ''}
                                </div>
                              </div>
                            </div>

                            {isChecked && (
                              <span className="shrink-0 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                Đã chọn
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {filteredFacilities.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs italic">
                        Không tìm thấy chi nhánh kho phù hợp với từ khóa &ldquo;{costBranchSearch}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/90 border-t border-slate-100 rounded-b-3xl">
                <div className="text-xs text-slate-500">
                  {costScope === 'ALL' ? (
                    <span>Phạm vi: <b className="text-slate-800">Toàn bộ chi nhánh trong hệ thống</b></span>
                  ) : (
                    <span>Phạm vi: <b className="text-blue-600">{costSelectedBranches.length} chi nhánh đã chọn</b></span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCostConfirmModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (costScope === 'BRANCH' && costSelectedBranches.length === 0) {
                        alert('Vui lòng chọn ít nhất 1 chi nhánh kho để áp dụng giá vốn!');
                        return;
                      }
                      executeSaveItem(costScope, costSelectedBranches, pendingKeepOpen);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <RefreshCw size={14} className="animate-spin" />}
                    <span>Đồng ý & Áp dụng</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
}
