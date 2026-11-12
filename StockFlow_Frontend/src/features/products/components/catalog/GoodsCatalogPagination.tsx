// src/features/products/components/catalog/GoodsCatalogPagination.tsx
// Thanh phân trang Danh mục Hàng hóa – T19 lát 4: JSX chuyển nguyên văn từ screens/GoodsCatalogScreen.tsx; state vẫn ở màn hình.
import React from 'react';
import { ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface GoodsCatalogPaginationProps {
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
  currentPage: number;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  pageInput: string;
  setPageInput: React.Dispatch<React.SetStateAction<string>>;
  selectedItemIds: string[];
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalSkuCount: number;
}

export function GoodsCatalogPagination({
  pageSize,
  setPageSize,
  currentPage,
  setCurrentPage,
  pageInput,
  setPageInput,
  selectedItemIds,
  totalItems,
  totalPages,
  startIndex,
  endIndex,
  totalSkuCount,
}: GoodsCatalogPaginationProps) {
  return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 bg-white/82 backdrop-blur-[2px] border-t border-slate-200 text-xs text-slate-600 select-none shrink-0">
          {/* Khối Trái: Chọn số dòng hiển thị */}
          <div className="flex items-center gap-2">
            <span className="text-[#677484] font-normal">Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              className="h-7 px-2 border border-slate-300 rounded bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-[#0070f4] cursor-pointer shadow-2xs"
            >
              <option value={10}>10 dòng</option>
              <option value={15}>15 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={30}>30 dòng</option>
              <option value={50}>50 dòng</option>
              <option value={100}>100 dòng</option>
            </select>
          </div>

          {/* Khối Giữa: Điều hướng trang |<<  <  [ 1 ]  >  >>| */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              title="Trang đầu tiên"
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-[#0070f4] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              title="Trang trước"
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-[#0070f4] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const val = parseInt(pageInput, 10);
                  if (!isNaN(val) && val >= 1 && val <= totalPages) {
                    setCurrentPage(val);
                  } else {
                    setPageInput(String(currentPage));
                  }
                }
              }}
              onBlur={() => {
                const val = parseInt(pageInput, 10);
                if (!isNaN(val) && val >= 1 && val <= totalPages) {
                  setCurrentPage(val);
                } else {
                  setPageInput(String(currentPage));
                }
              }}
              className="w-10 h-7 border border-slate-300 rounded text-center text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0070f4] focus:ring-1 focus:ring-[#0070f4] shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              title="Trang tiếp theo"
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-[#0070f4] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              title="Trang cuối cùng"
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-500 hover:text-[#0070f4] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronsRight size={14} />
            </button>
          </div>

          {/* Khối Phải: Thống kê số lượng hàng hóa và mã hàng */}
          <div className="text-[#677484] text-xs flex items-center gap-1.5">
            {totalItems > 0 ? (
              <>
                <span className="font-semibold text-[#15171a]">{startIndex + 1} - {endIndex}</span> trong{' '}
                <span className="font-semibold text-[#15171a]">{totalItems.toLocaleString('vi-VN')}</span> hàng hóa{' '}
                <span className="text-[#677484]">({totalSkuCount.toLocaleString('vi-VN')} mã hàng)</span>
              </>
            ) : (
              <span>0 - 0 trong 0 hàng hóa (0 mã hàng)</span>
            )}
            {selectedItemIds.length > 0 && (
              <span className="ml-1 text-[#0070f4] font-semibold">(Đã chọn {selectedItemIds.length})</span>
            )}
          </div>
        </div>
  );
}
