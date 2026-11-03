'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  SearchOutlined,
  PlusOutlined,
  SaveOutlined,
  CalculatorOutlined,
  SettingOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Table, Input, Button, Tag, notification, Popover, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import PriceBookFilterSidebar from '../components/PriceBookFilterSidebar';
import CreatePriceBookModal from '../components/CreatePriceBookModal';
import AddCategoryToPriceBookModal from '../components/AddCategoryToPriceBookModal';
import InlineFormulaPopover from '../components/InlineFormulaPopover';
import { PriceBook, PriceBookMatrixItem } from '../types';
import { priceBookService } from '../services/priceBookService';
import { apiClient } from '@/lib/api/client';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';

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

  // Price Books & Lookups
  const [priceBooks, setPriceBooks] = useState<PriceBook[]>([]);
  const [selectedPriceBookIds, setSelectedPriceBookIds] = useState<number[]>([]);
  const hasInitSelectionRef = useRef(false);
  // Giá vốn / tồn kho lấy theo chi nhánh đang chọn trên Header (giống Danh mục hàng hóa)
  const { activeWarehouse } = useActiveWarehouse();
  const activeWarehouseId = activeWarehouse?.warehouseId;
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Filters
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [stockCondition, setStockCondition] = useState<string>('ALL');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [pageIndex, setPageIndex] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

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
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState<boolean>(false);
  const [formulaPopoverCell, setFormulaPopoverCell] = useState<{ productId: number; bookId: number } | null>(null);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);

  // Load initial lookups
  useEffect(() => {
    // Categories
    apiClient.get<CategoryItem[]>('/api/products/categories')
      .then(res => setCategories(Array.isArray(res) ? res : []))
      .catch(() => {});

    // Price Books
    loadPriceBooks();
  }, []);

  const defaultBook = useMemo(() => {
    return priceBooks.find(b => b.isDefault) || priceBooks[0];
  }, [priceBooks]);
  const defaultBookId = defaultBook?.priceBookId;

  const activeCustomBook = useMemo(() => {
    return priceBooks.find(b => selectedPriceBookIds.includes(b.priceBookId) && !b.isDefault) || null;
  }, [priceBooks, selectedPriceBookIds]);

  // Rule KiotViet:
  // 1. Khi không chọn bảng giá nào: displayedBookIds = [] (hiện Chưa có bảng giá)
  // 2. Khi chọn bảng giá chung: hiện bảng giá chung
  // 3. Khi chọn bảng giá nam (hoặc bảng giá khác): phải hiện bảng giá chung cạnh nhưng không được mất đi
  const displayedBookIds = useMemo(() => {
    if (selectedPriceBookIds.length === 0) return [];
    if (!defaultBookId) return selectedPriceBookIds;

    const customIds = selectedPriceBookIds.filter(id => id !== defaultBookId);
    return [defaultBookId, ...customIds];
  }, [selectedPriceBookIds, defaultBookId]);

  const loadPriceBooks = async () => {
    try {
      const data = await priceBookService.getPriceBooks();
      setPriceBooks(data);
      // Lần đầu mở màn hình: mặc định lọc theo "Bảng giá chung" (giống KiotViet)
      if (!hasInitSelectionRef.current) {
        hasInitSelectionRef.current = true;
        const def = data.find(b => b.isDefault) || data[0];
        if (def) {
          setSelectedPriceBookIds(prev => (prev.length === 0 ? [def.priceBookId] : prev));
        }
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
    if (displayedBookIds.length === 0) {
      setMatrixItems([]);
      setTotalCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const res = await priceBookService.getPriceMatrix({
        warehouseId: activeWarehouseId,
        search: searchKeyword.trim() || undefined,
        categoryId: selectedCategoryId ?? undefined,
        stockCondition,
        priceBookIds: displayedBookIds,
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
  }, [searchKeyword, selectedCategoryId, stockCondition, displayedBookIds, pageIndex, pageSize, api, activeWarehouseId]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Track Inline price edit
  const handlePriceChange = (productId: number, priceBookId: number, rawVal: string) => {
    const num = Number(rawVal.replace(/\D/g, ''));
    const key = `${productId}_${priceBookId}`;
    setEditedPrices(prev => ({
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
        const defaultBook = priceBooks.find(b => b.isDefault) || priceBooks[0];
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

      api.success({
        message: 'Lưu thành công',
        description: `Đã cập nhật đơn giá và tự động tính toán lại các bảng giá liên kết theo công thức.`,
      });

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

  // Thêm tất cả hàng hóa vào bảng giá tùy biến
  const handleAddAllProducts = async () => {
    if (!activeCustomBook) return;
    setLoading(true);
    try {
      await priceBookService.applyFormula(activeCustomBook.priceBookId, { allProducts: true });
      api.success({
        message: 'Cập nhật thành công',
        description: `Đã thêm tất cả hàng hóa vào bảng giá "${activeCustomBook.priceBookName}".`,
      });
      await loadPriceBooks();
      await loadMatrix();
    } catch {
      api.error({
        message: 'Lỗi',
        description: 'Không thể thêm hàng hóa vào bảng giá.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Thêm theo nhóm hàng đã chọn vào bảng giá tùy biến
  const handleConfirmAddCategories = async (catIds: number[]) => {
    if (!activeCustomBook || catIds.length === 0) return;
    setLoading(true);
    try {
      await priceBookService.applyFormula(activeCustomBook.priceBookId, { categoryIds: catIds });
      api.success({
        message: 'Cập nhật dữ liệu thành công',
        description: `Đã thêm các nhóm hàng vào bảng giá "${activeCustomBook.priceBookName}".`,
      });
      await loadPriceBooks();
      await loadMatrix();
    } catch {
      api.error({
        message: 'Lỗi',
        description: 'Không thể thêm nhóm hàng vào bảng giá.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply Formula for selected price books
  const handleApplyFormulaForActiveBook = async (bookId: number) => {
    const targetBook = priceBooks.find(b => b.priceBookId === bookId);
    if (!targetBook?.formulaBaseType) {
      api.warning({
        message: 'Chưa cấu hình công thức',
        description: `Bảng giá "${targetBook?.priceBookName}" chưa có công thức giá tự động. Vui lòng chỉnh sửa bảng giá để thiết lập.`,
      });
      return;
    }

    try {
      await priceBookService.applyFormula(bookId);
      api.success({
        message: 'Áp dụng công thức thành công',
        description: `Đã tính toán và cập nhật lại toàn bộ giá cho bảng giá "${targetBook.priceBookName}".`,
      });
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
    const target = priceBooks.find(b => b.priceBookId === id);
    if (!target) return;
    if (target.isDefault) {
      api.error({
        message: 'Không thể xóa',
        description: 'Không thể xóa Bảng giá chung mặc định của hệ thống.',
      });
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa bảng giá "${target.priceBookName}" không? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    try {
      await priceBookService.deletePriceBook(id);
      api.success({
        message: 'Đã xóa bảng giá',
        description: `Bảng giá "${target.priceBookName}" đã được xóa thành công.`,
      });

      setIsModalOpen(false);
      setEditingPriceBook(null);

      setSelectedPriceBookIds(prev => prev.filter(x => x !== id));
      await loadPriceBooks();
      await loadMatrix();
    } catch {
      api.error({
        message: 'Lỗi xóa bảng giá',
        description: 'Không thể xóa bảng giá này. Vui lòng thử lại.',
      });
    }
  };

  // Construct Ant Design Table Columns
  const columns: ColumnsType<PriceBookMatrixItem> = useMemo(() => {
    const baseCols: ColumnsType<PriceBookMatrixItem> = [
      {
        title: 'Mã hàng',
        dataIndex: 'productCode',
        key: 'productCode',
        width: 120,
        fixed: 'left',
        render: (code: string) => (
          <span className="font-mono text-xs font-semibold text-blue-600 hover:underline cursor-pointer">
            {code}
          </span>
        ),
      },
      {
        title: 'Tên hàng hóa',
        dataIndex: 'productName',
        key: 'productName',
        width: 260,
        ellipsis: true,
        render: (name: string, record) => (
          <div>
            <div className="font-medium text-slate-800 text-xs">{name}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{record.categoryName}</div>
          </div>
        ),
      },
      {
        title: 'ĐVT',
        dataIndex: 'unitName',
        key: 'unitName',
        width: 70,
        align: 'center',
        render: (u: string) => <span className="text-xs text-slate-600">{u}</span>,
      },
      {
        title: 'Giá vốn',
        dataIndex: 'costPrice',
        key: 'costPrice',
        width: 120,
        align: 'right',
        render: (val: number) => (
          <span className="text-xs font-medium text-slate-700">{formatCurrency(val)}</span>
        ),
      },
    ];

    // Dynamic columns for each displayed Price Book (luôn đảm bảo Bảng giá chung ở đầu nếu có bảng giá được chọn)
    displayedBookIds.forEach(bookId => {
      const book = priceBooks.find(b => b.priceBookId === bookId);
      const bookName = book?.priceBookName ?? `Bảng giá #${bookId}`;
      const isDefaultBook = book?.isDefault === true || bookId === defaultBookId;

      baseCols.push({
        title: (
          <div className="flex items-center justify-between gap-1.5 w-full select-none">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-[#0071BA] text-xs whitespace-nowrap">
                {bookName}
              </span>
              {isDefaultBook ? (
                <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-[#0071BA] border border-blue-200 whitespace-nowrap">
                  Giá chung
                </span>
              ) : book?.formulaOperator && book?.formulaValue ? (
                <span
                  className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 whitespace-nowrap"
                  title={`Công thức: ${book.formulaOperator} ${book.formulaValue}${book.formulaUnit === 'PERCENT' ? '%' : '₫'}`}
                >
                  {book.formulaOperator}{book.formulaValue}{book.formulaUnit === 'PERCENT' ? '%' : '₫'}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-70 hover:opacity-100">
              {book?.formulaBaseType && (
                <button
                  type="button"
                  title="Tính toán lại theo công thức"
                  onClick={() => handleApplyFormulaForActiveBook(bookId)}
                  className="p-1 hover:text-[#0071BA] text-slate-400 rounded hover:bg-blue-50 transition cursor-pointer"
                >
                  <CalculatorOutlined style={{ fontSize: 12 }} />
                </button>
              )}
              <button
                type="button"
                title="Chỉnh sửa bảng giá này"
                onClick={() => {
                  setEditingPriceBook(book || null);
                  setIsModalOpen(true);
                }}
                className="p-1 hover:text-[#0071BA] text-slate-400 rounded hover:bg-blue-50 transition cursor-pointer"
              >
                <SettingOutlined style={{ fontSize: 12 }} />
              </button>
              {!isDefaultBook && (
                <button
                  type="button"
                  title="Xóa bảng giá này"
                  onClick={() => handleDeletePriceBook(bookId)}
                  className="p-1 hover:text-rose-600 text-slate-400 rounded hover:bg-rose-50 transition cursor-pointer"
                >
                  <DeleteOutlined style={{ fontSize: 12 }} />
                </button>
              )}
            </div>
          </div>
        ),
        key: `price_book_${bookId}`,
        width: 220,
        align: 'right',
        render: (_, record, index) => {
          const isAutoUpdate = !isDefaultBook && Boolean(book?.formulaBaseType);

          // 1. Nếu đang BẬT "Tự động cập nhật theo giá chung" (isAutoUpdate = true):
          // Giá tự động tính theo công thức từ Bảng giá chung, CHƯA ĐƯỢC PHÉP SỬA TRỰC TIẾP
          if (isAutoUpdate) {
            let basePrice = 0;
            if (defaultBookId) {
              const defEditKey = `${record.productId}_${defaultBookId}`;
              basePrice = defEditKey in editedPrices ? editedPrices[defEditKey] : (record.prices[defaultBookId] ?? 0);
            }
            if (book?.formulaBaseType === 'COST') {
              basePrice = record.costPrice;
            }

            let computedPrice = record.prices[bookId] ?? 0;
            if (book?.formulaOperator && book?.formulaValue) {
              const delta = book.formulaUnit === 'PERCENT'
                ? basePrice * (book.formulaValue / 100)
                : book.formulaValue;
              computedPrice = Math.max(0, Math.round(book.formulaOperator === '-' ? basePrice - delta : basePrice + delta));
            }

            const isLoss = !isDefaultBook && record.costPrice > 0 && computedPrice > 0 && computedPrice < record.costPrice;

            return (
              <div
                className={`h-8 w-full rounded border px-2.5 flex items-center justify-end text-right text-xs font-semibold select-all cursor-not-allowed group/locked ${
                  isLoss
                    ? 'border-rose-300 bg-rose-50/80 text-rose-600 font-bold'
                    : 'border-slate-200 bg-slate-50/90 text-slate-600'
                }`}
                title={
                  isLoss
                    ? `Cảnh báo bán lỗ: Giá bán (${currencyFormatter.format(computedPrice)} ₫) thấp hơn giá vốn (${currencyFormatter.format(record.costPrice)} ₫)`
                    : 'Bảng giá đang tự động cập nhật theo Bảng giá chung. Bấm vào biểu tượng ⚙️ ở tiêu đề cột để tắt tự động cập nhật nếu muốn sửa giá tay.'
                }
              >
                <span>{currencyFormatter.format(computedPrice)} ₫</span>
              </div>
            );
          }

          // 2. Nếu là Bảng giá chung hoặc ĐÃ TẮT tự động cập nhật:
          // ĐƯỢC PHÉP CHỈNH SỬA TRỰC TIẾP!
          const editKey = `${record.productId}_${bookId}`;
          const isEdited = editKey in editedPrices;
          const currentVal = isEdited ? editedPrices[editKey] : (record.prices[bookId] ?? 0);
          const isLoss = !isDefaultBook && record.costPrice > 0 && currentVal > 0 && currentVal < record.costPrice;
          const isPopoverOpen = formulaPopoverCell?.productId === record.productId && formulaPopoverCell?.bookId === bookId;
          const isFocused = focusedCell === editKey;

          return (
            <Popover
              open={!isDefaultBook && isPopoverOpen}
              onOpenChange={visible => {
                if (!visible) setFormulaPopoverCell(null);
              }}
              trigger="click"
              placement="bottomRight"
              destroyOnHidden
              styles={{ container: { padding: 0 } }}
              getPopupContainer={() => document.body}
              content={
                !isDefaultBook && isPopoverOpen && book ? (
                  <InlineFormulaPopover
                    isOpen={isPopoverOpen}
                    onClose={() => setFormulaPopoverCell(null)}
                    product={record}
                    priceBook={book}
                    existingPriceBooks={priceBooks}
                    totalCount={totalCount}
                    onApplySingle={newPrice => {
                      handlePriceChange(record.productId, bookId, newPrice.toString());
                    }}
                    onApplyAll={async formula => {
                      await priceBookService.updatePriceBook(bookId, {
                        ...book,
                        ...formula,
                        recalculateFormula: true,
                      });
                      api.success({
                        message: 'Áp dụng công thức thành công',
                        description: `Đã cập nhật công thức và tính lại giá cho các hàng hóa trong "${book.priceBookName}".`,
                      });
                      await loadPriceBooks();
                      await loadMatrix();
                    }}
                  />
                ) : null
              }
            >
              <div className="relative">
                <Tooltip
                  open={!isDefaultBook && isFocused && !isPopoverOpen}
                  placement="bottomRight"
                  getPopupContainer={() => document.body}
                  color="#0f172a"
                  title={
                    <div className="flex items-center gap-1.5 py-0.5 text-xs text-white">
                      {isLoss && (
                        <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                          Bán lỗ
                        </span>
                      )}
                      <span>Hoặc sử dụng</span>
                      <button
                        type="button"
                        onMouseDown={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormulaPopoverCell({ productId: record.productId, bookId });
                        }}
                        className="font-bold text-sky-400 hover:text-sky-300 underline cursor-pointer"
                      >
                        Công thức
                      </button>
                    </div>
                  }
                >
                  <input
                    type="text"
                    value={currentVal ? currencyFormatter.format(currentVal) : '0'}
                    onFocus={() => setFocusedCell(editKey)}
                    onBlur={() => setTimeout(() => setFocusedCell(prev => prev === editKey ? null : prev), 250)}
                    onChange={e => handlePriceChange(record.productId, bookId, e.target.value)}
                    className={`h-8 w-full rounded border px-2.5 text-right text-xs font-semibold outline-none transition ${
                      isLoss
                        ? 'border-rose-400 bg-rose-50 text-rose-600 font-bold ring-1 ring-rose-300 focus:border-rose-500 focus:ring-rose-200'
                        : isEdited
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-300'
                        : 'border-slate-300 bg-white text-slate-800 focus:border-[#0071BA] focus:ring-1 focus:ring-blue-100 hover:border-slate-400'
                    }`}
                    placeholder="0"
                    title={isLoss ? `Cảnh báo bán lỗ: Giá bán (${currencyFormatter.format(currentVal)} ₫) thấp hơn giá vốn (${currencyFormatter.format(record.costPrice)} ₫)` : undefined}
                  />
                </Tooltip>
              </div>
            </Popover>
          );
        },
      });
    });

    return baseCols;
  }, [displayedBookIds, defaultBookId, priceBooks, editedPrices, formulaPopoverCell, focusedCell, totalCount]);

  const editedCount = Object.keys(editedPrices).length;

  return (
    <div className="flex min-h-[calc(100vh-56px)] bg-[#f7f9fa]">
      {contextHolder}

      {/* LEFT FILTER SIDEBAR */}
      <PriceBookFilterSidebar
        priceBooks={priceBooks}
        selectedPriceBookIds={selectedPriceBookIds}
        onSelectPriceBooks={setSelectedPriceBookIds}
        onOpenCreateModal={() => {
          setEditingPriceBook(null);
          setIsModalOpen(true);
        }}
        onEditPriceBook={pb => {
          setEditingPriceBook(pb);
          setIsModalOpen(true);
        }}
        onDeletePriceBook={handleDeletePriceBook}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        onSelectCategory={id => {
          setSelectedCategoryId(id);
          setPageIndex(1);
        }}
        stockCondition={stockCondition}
        onSelectStockCondition={cond => {
          setStockCondition(cond);
          setPageIndex(1);
        }}
      />

      {/* MAIN CONTENT AREA */}
      <main className="min-w-0 flex-1 flex flex-col bg-white">
        {/* Toolbar / Action Bar */}
        <div className="border-b border-[#e5e7eb] bg-white px-6 py-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title & Count */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-800">
                {activeCustomBook ? activeCustomBook.priceBookName : 'Thiết lập giá sản phẩm'}
              </span>
              <span className="text-xs text-slate-400">
                ({totalCount} hàng hóa)
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {editedCount > 0 && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingPrices}
                  onClick={handleSavePrices}
                  className="!bg-emerald-600 hover:!bg-emerald-700 font-medium"
                >
                  Lưu thay đổi ({editedCount})
                </Button>
              )}

              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadMatrix()}
                className="text-slate-600"
              >
                Tải lại
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setEditingPriceBook(null);
                  setIsModalOpen(true);
                }}
                className="!bg-[#0071BA] hover:!bg-[#005f9d] font-medium"
              >
                + Bảng giá
              </Button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <Input
            allowClear
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm theo mã hoặc tên hàng..."
            value={searchKeyword}
            onChange={e => {
              setSearchKeyword(e.target.value);
              setPageIndex(1);
            }}
            className="w-full sm:w-[360px] h-[34px] rounded-md text-xs"
          />

          <div className="text-xs text-slate-500">
            {displayedBookIds.length === 0 ? (
              <span>Chưa có bảng giá được chọn</span>
            ) : (
              <>Hiển thị <strong>{matrixItems.length}</strong> trong <strong>{totalCount}</strong> hàng hóa</>
            )}
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 bg-[#f8fafc] p-6">
          <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-2xs">
            <Table<PriceBookMatrixItem>
              columns={columns}
              dataSource={displayedBookIds.length === 0 ? [] : matrixItems}
              rowKey="productId"
              loading={loading}
              locale={{
                emptyText: displayedBookIds.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center select-none">
                    <div className="w-24 h-24 rounded-full bg-blue-50/80 flex items-center justify-center mb-3">
                      <svg
                        className="w-12 h-12 text-[#0071BA]"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect x="8" y="14" width="32" height="24" rx="4" stroke="#0071BA" strokeWidth="2.5" fill="#e0f2fe" />
                        <path d="M8 24h10l3 5h14l3-5h2" stroke="#0071BA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="white" />
                        <line x1="16" y1="19" x2="32" y2="19" stroke="#0071BA" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">Chưa có bảng giá</span>
                  </div>
                ) : activeCustomBook && matrixItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center select-none">
                    <div className="w-24 h-24 rounded-full bg-blue-50/80 flex items-center justify-center mb-3">
                      <svg
                        className="w-12 h-12 text-[#0071BA]"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect x="8" y="14" width="32" height="24" rx="4" stroke="#0071BA" strokeWidth="2.5" fill="#e0f2fe" />
                        <path d="M8 24h10l3 5h14l3-5h2" stroke="#0071BA" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="white" />
                        <line x1="16" y1="19" x2="32" y2="19" stroke="#0071BA" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <span className="text-sm font-bold text-slate-800 mb-1">
                      Chưa có hàng hóa trong bảng giá
                    </span>
                    <p className="text-xs text-slate-500 mb-4 max-w-sm">
                      Bạn có thể thêm hàng hóa cụ thể hoặc thêm nhanh theo nhóm hàng
                    </p>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleAddAllProducts}
                        className="h-8 px-4 rounded-md border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                      >
                        Thêm tất cả hàng hóa
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsAddCategoryModalOpen(true)}
                        className="h-8 px-4 rounded-md bg-[#0071BA] hover:bg-[#005f9d] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                      >
                        Thêm theo nhóm hàng
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-slate-400 text-xs">Không tìm thấy hàng hóa nào phù hợp</div>
                ),
              }}
              pagination={displayedBookIds.length === 0 ? false : {
                current: pageIndex,
                pageSize: pageSize,
                total: totalCount,
                showSizeChanger: true,
                pageSizeOptions: ['15', '20', '50', '100'],
                onChange: (page, pSize) => {
                  setPageIndex(page);
                  setPageSize(pSize);
                },
                showTotal: (total, range) => `${range[0]}-${range[1]} trong ${total} hàng hóa`,
              }}
              scroll={{ x: 'max-content' }}
              size="middle"
              className="stockflow-pricebooks-table"
            />
          </div>
        </div>
      </main>

      {/* CREATE / EDIT PRICE BOOK MODAL */}
      <CreatePriceBookModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPriceBook(null);
        }}
        onSuccess={saved => {
          api.success({
            message: 'Thành công',
            description: `Bảng giá "${saved.priceBookName}" đã được lưu.`,
          });
          // Tự động chọn bảng giá mới này trên sidebar theo đúng KiotViet!
          setSelectedPriceBookIds([saved.priceBookId]);
          loadPriceBooks();
          loadMatrix();
        }}
        onDelete={handleDeletePriceBook}
        editingPriceBook={editingPriceBook}
        existingPriceBooks={priceBooks}
      />

      {/* MODAL CHỌN NHÓM HÀNG VÀO BẢNG GIÁ */}
      <AddCategoryToPriceBookModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => setIsAddCategoryModalOpen(false)}
        categories={categories}
        priceBookName={activeCustomBook?.priceBookName || ''}
        onConfirm={handleConfirmAddCategories}
      />
    </div>
  );
}
