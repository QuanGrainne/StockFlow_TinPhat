'use client';

import { useRef } from 'react';
import { Search, FileText, Trash2, Plus } from 'lucide-react';
import { TablePurchaseItem } from '@/features/purchases/types';

interface PurchaseItemsTableProps {
  items: TablePurchaseItem[];
  onUpdateItem: (id: string, field: keyof TablePurchaseItem, value: any) => void;
  onRemoveItem: (id: string) => void;
  onFocusSearch: () => void;
  onFileImport: (file: File) => void;
  onDownloadSample: () => void;
}

export function PurchaseItemsTable({
  items,
  onUpdateItem,
  onRemoveItem,
  onFocusSearch,
  onFileImport,
  onDownloadSample,
}: PurchaseItemsTableProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex-1 flex flex-col bg-white overflow-y-auto">
      {/* Table Header Row */}
      <div className="bg-[#e8f2ff] border-b border-[#d4e5f9] h-9 px-4 flex items-center text-xs font-semibold text-slate-700 shrink-0 sticky top-0 z-10">
        <div className="w-10 text-center">STT</div>
        <div className="w-28 px-2 text-left">Mã hàng</div>
        <div className="flex-1 px-2 text-left">Tên hàng hóa</div>
        <div className="w-16 text-center">ĐVT</div>
        <div className="w-20 text-center">Tồn kho</div>
        <div className="w-24 px-2 text-right">Số lượng</div>
        <div className="w-28 px-2 text-right">Đơn giá</div>
        <div className="w-20 px-2 text-right">CK %</div>
        <div className="w-28 px-2 text-right">Thành tiền</div>
        <div className="w-24 px-2 text-left">Số Lô</div>
        {items.length > 0 && <div className="w-10 text-center"></div>}
      </div>

      {/* Table Content */}
      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[460px]">
          <div className="text-center max-w-md">
            <h2 className="text-[15px] font-semibold text-slate-800">
              Chưa có sản phẩm nào trong phiếu nhập
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Nhấn <span className="font-semibold text-blue-600">F3</span> để tìm sản phẩm, hoặc tải từ file Excel:
              <button
                type="button"
                onClick={onDownloadSample}
                className="ml-1 text-[#0071BA] hover:underline font-medium cursor-pointer"
              >
                File mẫu Excel
              </button>
            </p>

            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileImport(file);
              }}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />

            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onFocusSearch}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0071BA] hover:bg-[#005f9d] text-white rounded-[6px] text-xs font-medium transition cursor-pointer shadow-xs"
              >
                <Search size={14} />
                <span>Tìm sản phẩm (F3)</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-[6px] text-xs font-medium transition cursor-pointer shadow-xs"
              >
                <FileText size={14} />
                <span>Nhập từ Excel</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 flex-1">
          {items.map((item, index) => {
            const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
            return (
              <div
                key={item.id}
                className="px-4 py-2.5 flex items-center text-xs text-slate-800 hover:bg-slate-50 transition"
              >
                <div className="w-10 text-center text-slate-400 font-medium">{index + 1}</div>
                <div className="w-28 px-2 text-left font-mono font-medium text-blue-600 truncate">{item.code}</div>
                <div className="flex-1 px-2 text-left font-medium text-slate-800 truncate" title={item.name}>
                  <div>{item.name}</div>
                  {item.currentUnitCost > 0 && (
                    <div className="text-[10px] text-slate-400 font-normal">
                      Giá vốn cũ: {item.currentUnitCost.toLocaleString('vi-VN')} đ
                    </div>
                  )}
                </div>
                <div className="w-16 text-center text-slate-600">{item.unit}</div>
                <div className="w-20 text-center">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${item.currentStock > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.currentStock}
                  </span>
                </div>
                <div className="w-24 px-2 text-right">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-right bg-white border border-slate-200 rounded px-1.5 py-1 text-xs focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="w-28 px-2 text-right">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={item.unitPrice}
                    onChange={(e) => onUpdateItem(item.id, 'unitPrice', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full text-right bg-white border border-slate-200 rounded px-1.5 py-1 text-xs focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="w-20 px-2 text-right">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.discountPercent}
                    onChange={(e) => onUpdateItem(item.id, 'discountPercent', Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full text-right bg-white border border-slate-200 rounded px-1.5 py-1 text-xs focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="w-28 px-2 text-right font-semibold text-slate-800">
                  {Math.max(0, lineTotal).toLocaleString('vi-VN')}
                </div>
                <div className="w-24 px-2">
                  <input
                    type="text"
                    placeholder="Lô hàng"
                    value={item.lotNumber || ''}
                    onChange={(e) => onUpdateItem(item.id, 'lotNumber', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded px-1.5 py-1 text-[11px] focus:border-blue-500 outline-none"
                  />
                </div>
                <div className="w-10 text-center">
                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition cursor-pointer"
                    title="Xóa mặt hàng này"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          <div className="p-3 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Tổng số: <strong className="text-slate-800">{items.length}</strong> mặt hàng
            </span>
            <button
              type="button"
              onClick={onFocusSearch}
              className="text-xs text-[#0071BA] font-medium hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={14} />
              <span>Thêm mặt hàng khác (F3)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
