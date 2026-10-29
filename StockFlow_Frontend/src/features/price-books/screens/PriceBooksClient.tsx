'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Plus,
  Save,
  FileUp,
  FileDown,
  Calculator,
  Settings,
  Trash2,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import { notification } from 'antd';
import * as XLSX from 'xlsx';
import PriceBookFilterSidebar from '../components/PriceBookFilterSidebar';
import CreatePriceBookModal from '../components/CreatePriceBookModal';
import { PriceBook, PriceBookMatrixItem } from '../types';
import { priceBookService } from '../services/priceBookService';
import { apiClient } from '@/lib/api/client';

interface CategoryItem {
  categoryId: number;
  categoryName: string;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');
function formatCurrency(value?: number | null) {
  if (value === undefined || value === null) return '—';
  return `${currencyFormatter.format(Math.round(value))} ₫`;
}

export default function PriceBooksClient() {
  const [api, contextHolder] = notification.useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Price Books & Lookups
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [selectedPriceBookIds, setSelectedPriceBookIds] = useState<number[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [stockCondition, setStockCondition] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Data & Table State
  const [matrixItems, setMatrixItems] = useState<PriceBookMatrixItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  // Inline edited prices: key is `${productId}_${priceBookId}` => newPrice
  const [editedPrices, setEditedPrices] = useState<Record<string, number>>({});
  const [savingPrices, setSavingPrices] = useState<boolean>(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingPriceBook, setEditingPriceBook] = useState<PriceBook | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Load initial lookups
  useEffect(() => {
    // Categories
    apiClient
      .get<CategoryItem[]>('/api/products/categories')
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch(() => {});

    // Price Books
    loadPriceBooks();
  }, []);

  const loadPriceBooks = async () => {
    try {
      const data = await priceBookService.getPriceBooks();
      setPriceBooks(data);
      if (data.length > 0) {
        setSelectedPriceBookIds((prev) => {
          if (prev.length > 0) return prev;
          // Chỉ hiển thị mặc định duy nhất Bảng giá chung
          const def = data.find((p) => p.isDefault) || data[0];
          return def ? [def.priceBookId] : [];
        });
      }
    } catch {
      api.error({
        message: 'Lỗi nạp dữ liệu',
        description: 'Không thể tải danh sách bảng giá từ máy chủ.',
      });
    }
  };

  // Fetch Matrix Data
  const loadMatrix = useCallback(async () => {
    if (selectedPriceBookIds.length === 0) {
      setMatrixItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await priceBookService.getPriceMatrix({
        search: searchKeyword.trim() || undefined,
        categoryId: selectedCategoryId ?? undefined,
        stockCondition,
        priceBookIds: selectedPriceBookIds,
        page: pageIndex,
        pageSize,
      });

      setMatrixItems(res.items);
      setTotalCount(res.totalCount);
    } catch {
      api.error({
        message: 'Lỗi tải bảng giá',
        description: 'Không thể nạp dữ liệu ma trận giá sản phẩm.',
      });
    } finally {
      setLoading(false);
    }
  }, [
    searchKeyword,
    selectedCategoryId,
    stockCondition,
    selectedPriceBookIds,
    pageIndex,
    pageSize,
    api,
  ]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Toggle Price Book visibility
  const handleTogglePriceBook = (id: number) => {
    setSelectedPriceBookIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  };

  // Track Inline price edit
  const handlePriceChange = (productId: number, priceBookId: number, rawVal: string) => {
    const num = Number(rawVal.replace(/\D/g, ''));
    const key = `${productId}_${priceBookId}`;
    setEditedPrices((prev) => ({
      ...prev,
      [key]: num,
    }));
  };

  // Save Inline Edits
  const handleSavePrices = async () => {
    const keys = Object.keys(editedPrices);
    if (keys.length === 0) return;

    setSavingPrices(true);
    try {
      // Group by priceBookId
      const grouped: Record<number, { productId: number; price: number }[]> = {};
      for (const k of keys) {
        const [prodIdStr, bookIdStr] = k.split('_');
        const prodId = Number(prodIdStr);
        const bookId = Number(bookIdStr);
        if (!grouped[bookId]) grouped[bookId] = [];
        grouped[bookId].push({ productId: prodId, price: editedPrices[k] });
      }

      for (const bookIdStr of Object.keys(grouped)) {
        const bookId = Number(bookIdStr);
        await priceBookService.updatePrices(bookId, grouped[bookId]);
      }

      // Đồng bộ vào localStorage để màn hình Danh mục hàng hóa cập nhật giá bán mới tức thì
      try {
        const defaultBook = priceBooks.find((b) => b.isDefault) || priceBooks[0];
        const defaultBookId = defaultBook?.priceBookId;
        const storedStr = localStorage.getItem('stockflow_goods_catalog_v1');
        if (storedStr && defaultBookId) {
          const items = JSON.parse(storedStr);
          if (Array.isArray(items)) {
            let changed = false;
            items.forEach((it: any) => {
              const k = `${it.productId || it.id}_${defaultBookId}`;
              if (editedPrices[k] !== undefined) {
                it.standardPrice = editedPrices[k];
                changed = true;
              }
            });
            if (changed) {
              localStorage.setItem('stockflow_goods_catalog_v1', JSON.stringify(items));
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi đồng bộ giá vào localStorage:', err);
      }

      // Bắn event để các tab hoặc màn hình khác cập nhật
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('stockflow:prices_updated'));
      }

      showToast('Đã cập nhật đơn giá và tự động tính toán lại các bảng giá liên kết!');
      setEditedPrices({});
      loadMatrix();
    } catch {
      api.error({
        message: 'Lỗi lưu giá',
        description: 'Không thể lưu các thay đổi giá. Vui lòng thử lại.',
      });
    } finally {
      setSavingPrices(false);
    }
  };

  // Apply Formula for selected price books
  const handleApplyFormulaForActiveBook = async (bookId: number) => {
    const targetBook = priceBooks.find((b) => b.priceBookId === bookId);
    if (!targetBook?.formulaBaseType) {
      api.warning({
        message: 'Chưa cấu hình công thức',
        description: `Bảng giá "${targetBook?.priceBookName}" chưa có công thức giá tự động. Vui lòng chỉnh sửa bảng giá để thiết lập.`,
      });
      return;
    }

    try {
      await priceBookService.applyFormula(bookId);
      showToast(`Đã tính toán và cập nhật lại toàn bộ giá cho bảng giá "${targetBook.priceBookName}"!`);
      loadMatrix();
    } catch {
      api.error({
        message: 'Lỗi tính giá',
        description: 'Có lỗi xảy ra khi áp dụng công thức giá.',
      });
    }
  };

  // Delete Price Book
  const handleDeletePriceBook = async (id: number) => {
    const target = priceBooks.find((b) => b.priceBookId === id);
    if (!target) return;
    if (target.isDefault) {
      api.error({
        message: 'Không thể xóa',
        description: 'Không thể xóa Bảng giá chung mặc định của hệ thống.',
      });
      return;
    }

    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa bảng giá "${target.priceBookName}" không? Thao tác này không thể hoàn tác.`
      )
    ) {
      return;
    }

    try {
      await priceBookService.deletePriceBook(id);
      showToast(`Đã xóa thành công bảng giá "${target.priceBookName}".`);

      setIsModalOpen(false);
      setEditingPriceBook(null);

      setSelectedPriceBookIds((prev) => prev.filter((x) => x !== id));
      await loadPriceBooks();
      await loadMatrix();
    } catch {
      api.error({
        message: 'Lỗi xóa bảng giá',
        description: 'Không thể xóa bảng giá này. Vui lòng thử lại.',
      });
    }
  };

  // Export Excel
  const handleExportExcel = () => {
    if (matrixItems.length === 0) {
      alert('Không có dữ liệu hàng hóa để xuất file!');
      return;
    }

    const defaultBook = priceBooks.find((b) => b.isDefault) || priceBooks[0];
    const defaultBookId = defaultBook?.priceBookId;

    const header = ['Mã hàng', 'Tên hàng hóa', 'Nhóm hàng', 'ĐVT', 'Giá vốn'];
    selectedPriceBookIds.forEach((id) => {
      const book = priceBooks.find((b) => b.priceBookId === id);
      header.push(book?.priceBookName || `Bảng giá #${id}`);
    });

    const rows = matrixItems.map((item) => {
      const row: (string | number)[] = [
        item.productCode,
        item.productName,
        item.categoryName || '',
        item.unitName || '',
        item.costPrice || 0,
      ];

      selectedPriceBookIds.forEach((bookId) => {
        const isDefaultBook = bookId === defaultBookId;
        if (isDefaultBook) {
          const editKey = `${item.productId}_${bookId}`;
          const currentVal =
            editKey in editedPrices ? editedPrices[editKey] : (item.prices[bookId] ?? 0);
          row.push(currentVal);
        } else {
          const book = priceBooks.find((b) => b.priceBookId === bookId);
          let basePrice = 0;
          if (defaultBookId) {
            const defEditKey = `${item.productId}_${defaultBookId}`;
            basePrice =
              defEditKey in editedPrices
                ? editedPrices[defEditKey]
                : (item.prices[defaultBookId] ?? 0);
          }
          if (book?.formulaBaseType === 'COST') {
            basePrice = item.costPrice;
          }

          let computedPrice = item.prices[bookId] ?? 0;
          if (book?.formulaOperator && book?.formulaValue) {
            let delta = 0;
            const isPercent =
              book.formulaUnit === 'PERCENT' ||
              book.formulaUnit === '%' ||
              book.formulaUnit?.toUpperCase() === 'PERCENT';
            if (isPercent) {
              delta = basePrice * (book.formulaValue / 100);
            } else {
              delta = book.formulaValue;
            }
            const res = book.formulaOperator === '-' ? basePrice - delta : basePrice + delta;
            computedPrice = Math.max(0, Math.round(res));
          } else if (bookId in item.prices && item.prices[bookId] !== null) {
            computedPrice = item.prices[bookId]!;
          }
          row.push(computedPrice);
        }
      });

      return row;
    });

    const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
    worksheet['!cols'] = [
      { wch: 15 },
      { wch: 32 },
      { wch: 20 },
      { wch: 10 },
      { wch: 15 },
      ...selectedPriceBookIds.map(() => ({ wch: 18 })),
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BangGia');
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
    XLSX.writeFile(workbook, `BangGia_StockFlow_${dateStr}.xlsx`);
  };

  // Import Excel
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!jsonData || jsonData.length < 2) {
          alert('File Excel không có dữ liệu hoặc sai định dạng!');
          return;
        }

        const headerRow: string[] = jsonData[0].map((h: any) => String(h || '').trim());
        const codeColIdx = headerRow.findIndex(
          (h) => h.toLowerCase().includes('mã') || h.toLowerCase().includes('code')
        );
        if (codeColIdx === -1) {
          alert('File Excel cần có cột "Mã hàng" để đối chiếu sản phẩm!');
          return;
        }

        const defaultBook = priceBooks.find((b) => b.isDefault) || priceBooks[0];
        if (!defaultBook) {
          alert('Không tìm thấy Bảng giá chung để cập nhật giá!');
          return;
        }

        let priceColIdx = headerRow.findIndex(
          (h) =>
            h.toLowerCase().includes(defaultBook.priceBookName.toLowerCase()) ||
            h.toLowerCase().includes('giá bán') ||
            h.toLowerCase().includes('đơn giá') ||
            h.toLowerCase() === 'giá' ||
            h.toLowerCase() === 'price'
        );

        if (priceColIdx === -1) {
          priceColIdx = headerRow.findIndex(
            (h, idx) =>
              idx > codeColIdx &&
              !h.toLowerCase().includes('tên') &&
              !h.toLowerCase().includes('nhóm') &&
              !h.toLowerCase().includes('đvt')
          );
        }

        if (priceColIdx === -1) {
          alert('Không tìm thấy cột đơn giá trong file Excel!');
          return;
        }

        let matchedCount = 0;
        const newEdits: Record<string, number> = { ...editedPrices };

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || !row[codeColIdx]) continue;
          const pCode = String(row[codeColIdx]).trim().toLowerCase();
          const rawPrice = row[priceColIdx];
          const numPrice = Number(String(rawPrice || 0).replace(/[^\d.-]/g, ''));
          if (isNaN(numPrice) || numPrice < 0) continue;

          const matchedItem = matrixItems.find(
            (m) => m.productCode.trim().toLowerCase() === pCode
          );
          if (matchedItem) {
            newEdits[`${matchedItem.productId}_${defaultBook.priceBookId}`] = numPrice;
            matchedCount++;
          }
        }

        if (matchedCount > 0) {
          setEditedPrices(newEdits);
          showToast(`Đã nhận diện giá cho ${matchedCount} mặt hàng từ file Excel. Bấm "Lưu thay đổi" để áp dụng.`);
        } else {
          alert('Không tìm thấy mã hàng nào khớp với danh sách hàng hóa trong trang hiện tại!');
        }
      } catch (err) {
        console.error('Import error:', err);
        alert('Có lỗi xảy ra khi đọc file Excel. Vui lòng kiểm tra lại định dạng tệp!');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const editedCount = Object.keys(editedPrices).length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const defaultBook = priceBooks.find((b) => b.isDefault) || priceBooks[0];
  const defaultBookId = defaultBook?.priceBookId;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f5f5f5] overflow-hidden select-none text-[13px] text-[#15171a] font-sans relative">
      {contextHolder}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Toolbar Bar (Chuẩn thiết kế KiotViet giống Chuyển hàng) */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Title & Search bar */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <h1 className="text-[20px] font-bold text-[#15171a] leading-7 tracking-tight whitespace-nowrap">
            Thiết lập giá
          </h1>

          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none"
            />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => {
                setSearchKeyword(e.target.value);
                setPageIndex(1);
              }}
              placeholder="Theo mã hoặc tên hàng..."
              className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {editedCount > 0 && (
            <button
              type="button"
              onClick={handleSavePrices}
              disabled={savingPrices}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[13px] shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>{savingPrices ? 'Đang lưu...' : `Lưu thay đổi (${editedCount})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setEditingPriceBook(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>Bảng giá</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] font-medium text-[13px] transition cursor-pointer bg-white"
          >
            <FileUp size={14} className="text-[#677484]" />
            <span>Import file</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportExcel}
            accept=".xlsx, .xls, .csv"
            className="hidden"
          />

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] font-medium text-[13px] transition cursor-pointer bg-white"
          >
            <FileDown size={14} className="text-[#677484]" />
            <span>Xuất file</span>
            <span className="text-[10px]">▾</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace: Sidebar & Table */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar bộ lọc bên trái */}
        <PriceBookFilterSidebar
          priceBooks={priceBooks}
          selectedPriceBookIds={selectedPriceBookIds}
          onTogglePriceBook={handleTogglePriceBook}
          onOpenCreateModal={() => {
            setEditingPriceBook(null);
            setIsModalOpen(true);
          }}
          onEditPriceBook={(pb) => {
            setEditingPriceBook(pb);
            setIsModalOpen(true);
          }}
          onDeletePriceBook={handleDeletePriceBook}
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(id) => {
            setSelectedCategoryId(id);
            setPageIndex(1);
          }}
          stockCondition={stockCondition}
          onSelectStockCondition={(cond) => {
            setStockCondition(cond);
            setPageIndex(1);
          }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Data Table Workspace */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white">
          {/* Table Container */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="bg-[#f7f8f9] sticky top-0 z-20 border-b border-slate-200 text-[11px] font-bold text-[#677484] uppercase tracking-wider shadow-xs">
                <tr>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 w-[120px] border-b border-slate-200">
                    Mã hàng
                  </th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-4 min-w-[240px] border-b border-slate-200">
                    Tên hàng hóa
                  </th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 w-[80px] text-center border-b border-slate-200">
                    ĐVT
                  </th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 text-right w-[130px] border-b border-slate-200">
                    Giá vốn
                  </th>

                  {/* Dynamic Columns for Selected Price Books */}
                  {selectedPriceBookIds.map((bookId) => {
                    const book = priceBooks.find((b) => b.priceBookId === bookId);
                    const bookName = book?.priceBookName ?? `Bảng giá #${bookId}`;
                    const isDefault = book?.isDefault === true || bookId === defaultBookId;

                    return (
                      <th
                        key={bookId}
                        className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 text-right min-w-[140px] border-b border-slate-200 group"
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <span
                            className="text-[11px] font-bold text-[#677484] uppercase tracking-wider truncate"
                            title={book?.formulaOperator && book?.formulaValue ? `Công thức: Giá chung ${book.formulaOperator} ${book.formulaValue}%` : bookName}
                          >
                            {bookName}
                          </span>

                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                            {book?.formulaBaseType && (
                              <button
                                type="button"
                                title="Tính toán lại theo công thức"
                                onClick={() => handleApplyFormulaForActiveBook(bookId)}
                                className="p-1 hover:text-[#0070f4] text-slate-400 rounded hover:bg-blue-50 transition cursor-pointer"
                              >
                                <Calculator size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              title="Chỉnh sửa bảng giá này"
                              onClick={() => {
                                setEditingPriceBook(book || null);
                                setIsModalOpen(true);
                              }}
                              className="p-1 hover:text-[#0070f4] text-slate-400 rounded hover:bg-blue-50 transition cursor-pointer"
                            >
                              <Settings size={13} />
                            </button>
                            {!isDefault && (
                              <button
                                type="button"
                                title="Xóa bảng giá này"
                                onClick={() => handleDeletePriceBook(bookId)}
                                className="p-1 hover:text-rose-600 text-slate-400 rounded hover:bg-rose-50 transition cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {loading ? (
                  <tr>
                    <td
                      colSpan={4 + selectedPriceBookIds.length}
                      className="py-20 text-center text-[#677484]"
                    >
                      <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                      Đang tải bảng giá hàng hóa...
                    </td>
                  </tr>
                ) : selectedPriceBookIds.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                          <Inbox size={32} className="stroke-[1.5]" />
                        </div>
                        <h3 className="font-bold text-[#15171a] text-sm mb-1">
                          Không có bảng giá
                        </h3>
                        <p className="text-xs text-[#677484] max-w-sm mb-3">
                          Vui lòng chọn ít nhất một bảng giá từ bộ lọc bên trái để xem và thiết lập giá.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const def = priceBooks.find((p) => p.isDefault) || priceBooks[0];
                            if (def) setSelectedPriceBookIds([def.priceBookId]);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                        >
                          <span>Chọn Bảng giá chung</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : matrixItems.length === 0 ? (
                  <tr>
                    <td colSpan={4 + selectedPriceBookIds.length} className="py-24 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                          <Inbox size={32} className="stroke-[1.5]" />
                        </div>
                        <h3 className="font-bold text-[#15171a] text-sm mb-1">
                          Không tìm thấy hàng hóa nào phù hợp
                        </h3>
                        <p className="text-xs text-[#677484] max-w-sm mb-3">
                          Vui lòng thay đổi từ khóa tìm kiếm hoặc chọn lại các bộ lọc bên trái.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchKeyword('');
                            setSelectedCategoryId(null);
                            setStockCondition('ALL');
                            setPageIndex(1);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                        >
                          <RotateCcw size={13} />
                          <span>Đặt lại bộ lọc</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  matrixItems.map((item) => (
                    <tr
                      key={item.productId}
                      className="hover:bg-[#f7f8f9] transition cursor-pointer border-b border-slate-100 select-none"
                    >
                      {/* Mã hàng */}
                      <td className="py-2.5 px-3 font-mono font-bold text-[#0070f4] hover:underline">
                        {item.productCode}
                      </td>

                      {/* Tên hàng hóa */}
                      <td className="py-2.5 px-4 font-normal text-[#15171a]">
                        <div className="font-medium text-slate-800 text-xs">{item.productName}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{item.categoryName}</div>
                      </td>

                      {/* ĐVT */}
                      <td className="py-2.5 px-3 text-center text-slate-600">
                        {item.unitName || '—'}
                      </td>

                      {/* Giá vốn */}
                      <td className="py-2.5 px-3 text-right font-mono font-medium text-slate-700">
                        {formatCurrency(item.costPrice)}
                      </td>

                      {/* Dynamic Columns for Selected Price Books */}
                      {selectedPriceBookIds.map((bookId) => {
                        const book = priceBooks.find((b) => b.priceBookId === bookId);
                        const isDefault = book?.isDefault === true || bookId === defaultBookId;

                        if (isDefault) {
                          const editKey = `${item.productId}_${bookId}`;
                          const isEdited = editKey in editedPrices;
                          const currentVal = isEdited
                            ? editedPrices[editKey]
                            : (item.prices[bookId] ?? 0);

                          return (
                            <td
                              key={bookId}
                              className="py-1.5 px-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={currentVal ? currencyFormatter.format(currentVal) : '0'}
                                onChange={(e) =>
                                  handlePriceChange(item.productId, bookId, e.target.value)
                                }
                                className={`h-8 w-full rounded-[6px] border px-2.5 text-right font-mono text-xs font-semibold outline-none transition ${
                                  isEdited
                                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-300'
                                    : 'border-slate-300 bg-white text-slate-800 focus:border-[#0070f4] focus:ring-1 focus:ring-blue-100 hover:border-slate-400'
                                }`}
                                placeholder="0"
                              />
                            </td>
                          );
                        }

                        // Formula / Readonly book
                        let basePrice = 0;
                        if (defaultBookId) {
                          const defEditKey = `${item.productId}_${defaultBookId}`;
                          basePrice =
                            defEditKey in editedPrices
                              ? editedPrices[defEditKey]
                              : (item.prices[defaultBookId] ?? 0);
                        }
                        if (book?.formulaBaseType === 'COST') {
                          basePrice = item.costPrice;
                        }

                        let computedPrice = item.prices[bookId] ?? 0;
                        if (book?.formulaOperator && book?.formulaValue) {
                          let delta = 0;
                          const isPercent =
                            book.formulaUnit === 'PERCENT' ||
                            book.formulaUnit === '%' ||
                            book.formulaUnit?.toUpperCase() === 'PERCENT';
                          if (isPercent) {
                            delta = basePrice * (book.formulaValue / 100);
                          } else {
                            delta = book.formulaValue;
                          }
                          const res =
                            book.formulaOperator === '-' ? basePrice - delta : basePrice + delta;
                          computedPrice = Math.max(0, Math.round(res));
                        } else if (bookId in item.prices && item.prices[bookId] !== null) {
                          computedPrice = item.prices[bookId]!;
                        }

                        return (
                          <td key={bookId} className="py-1.5 px-3 text-right">
                            <div
                              className="h-8 w-full rounded-[6px] border border-slate-200 bg-slate-50/80 px-2.5 flex items-center justify-end font-mono text-xs font-semibold text-slate-700 select-all"
                              title="Giá tự động tính theo công thức từ Giá chung, không thể sửa trực tiếp"
                            >
                              <span>{currencyFormatter.format(computedPrice)} ₫</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Bar & Pagination (Khớp chuẩn Chuyển hàng) */}
          <footer className="h-10 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[12px] text-[#677484] shrink-0">
            <div className="flex items-center gap-3">
              <div>
                Hiển thị <strong className="text-[#15171a] font-bold">{matrixItems.length}</strong> trên{' '}
                <strong className="text-[#15171a] font-bold">{totalCount}</strong> hàng hóa
              </div>
              <div className="flex items-center gap-1.5 ml-2">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPageIndex(1);
                  }}
                  className="h-6 rounded border border-slate-200 bg-white px-1.5 text-xs text-[#15171a] outline-none cursor-pointer"
                >
                  <option value={15}>15 dòng</option>
                  <option value={30}>30 dòng</option>
                  <option value={50}>50 dòng</option>
                  <option value={100}>100 dòng</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPageIndex(1)}
                  disabled={pageIndex <= 1}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Trang đầu"
                >
                  <ChevronsLeft size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setPageIndex((p) => Math.max(1, p - 1))}
                  disabled={pageIndex <= 1}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Trang trước"
                >
                  <ChevronLeft size={13} />
                </button>

                <span className="px-2 text-xs text-slate-700 font-medium">
                  Trang {pageIndex} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPageIndex((p) => Math.min(totalPages, p + 1))}
                  disabled={pageIndex >= totalPages}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Trang sau"
                >
                  <ChevronRight size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => setPageIndex(totalPages)}
                  disabled={pageIndex >= totalPages}
                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Trang cuối"
                >
                  <ChevronsRight size={13} />
                </button>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* CREATE / EDIT PRICE BOOK MODAL */}
      <CreatePriceBookModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPriceBook(null);
        }}
        onSuccess={(saved) => {
          showToast(`Bảng giá "${saved.priceBookName}" đã được lưu thành công!`);
          loadPriceBooks();
          loadMatrix();
        }}
        onDelete={handleDeletePriceBook}
        editingPriceBook={editingPriceBook}
        existingPriceBooks={priceBooks}
      />
    </div>
  );
}
