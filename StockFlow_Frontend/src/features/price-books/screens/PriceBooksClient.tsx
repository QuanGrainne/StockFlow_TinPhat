'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SearchOutlined,
  PlusOutlined,
  SaveOutlined,
  CalculatorOutlined,
  SettingOutlined,
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { Table, Input, Button, Tag, notification } from 'antd';
import type { ColumnsType } from 'antd/es/table';
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

  // Load initial lookups
  useEffect(() => {
    // Categories
    apiClient.get<CategoryItem[]>('/api/products/categories')
      .then(res => setCategories(Array.isArray(res) ? res : []))
      .catch(() => {});

    // Price Books
    loadPriceBooks();
  }, []);

  const loadPriceBooks = async () => {
    try {
      const data = await priceBookService.getPriceBooks();
      setPriceBooks(data);
      if (data.length > 0) {
        setSelectedPriceBookIds(prev => {
          if (prev.length > 0) return prev;
          // Hiển thị mặc định cả bảng giá chung và bảng giá công thức đầu tiên (nếu có)
          const def = data.find(p => p.isDefault) || data[0];
          const second = data.find(p => p.priceBookId !== def.priceBookId);
          return second ? [def.priceBookId, second.priceBookId] : [def.priceBookId];
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
    if (selectedPriceBookIds.length === 0 && priceBooks.length > 0) return;
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
  }, [searchKeyword, selectedCategoryId, stockCondition, selectedPriceBookIds, pageIndex, pageSize, priceBooks.length, api]);

  useEffect(() => {
    loadMatrix();
  }, [loadMatrix]);

  // Toggle Price Book visibility
  const handleTogglePriceBook = (id: number) => {
    setSelectedPriceBookIds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

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

    const defaultBook = priceBooks.find(b => b.isDefault) || priceBooks[0];
    const defaultBookId = defaultBook?.priceBookId;

    // Dynamic columns for each selected Price Book
    selectedPriceBookIds.forEach(bookId => {
      const book = priceBooks.find(b => b.priceBookId === bookId);
      const bookName = book?.priceBookName ?? `Bảng giá #${bookId}`;
      const isDefaultBook = book?.isDefault === true || bookId === defaultBookId;

      baseCols.push({
        title: (
          <div className="flex items-center justify-between gap-1 group">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-[#0071BA] truncate">{bookName}</span>
              {isDefaultBook ? (
                <Tag color="blue" className="text-[10px] m-0 px-1 py-0 leading-tight">Giá chung</Tag>
              ) : book?.formulaOperator && book?.formulaValue ? (
                <Tag
                  color="cyan"
                  className="text-[10px] m-0 px-1 py-0 leading-tight"
                  title={`Công thức: Giá chung ${book.formulaOperator} ${book.formulaValue}${book.formulaUnit === 'PERCENT' ? '%' : '₫'}`}
                >
                  {book.formulaOperator}{book.formulaValue}{book.formulaUnit === 'PERCENT' ? '%' : '₫'}
                </Tag>
              ) : (
                <Tag color="default" className="text-[10px] m-0 px-1 py-0 leading-tight">Chỉ xem</Tag>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
              {book?.formulaBaseType && (
                <button
                  type="button"
                  title="Tính toán lại theo công thức"
                  onClick={() => handleApplyFormulaForActiveBook(bookId)}
                  className="p-1 hover:text-[#0071BA] text-slate-400 rounded hover:bg-blue-50 transition cursor-pointer"
                >
                  <CalculatorOutlined style={{ fontSize: 13 }} />
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
                <SettingOutlined style={{ fontSize: 13 }} />
              </button>
              {!isDefaultBook && (
                <button
                  type="button"
                  title="Xóa bảng giá này"
                  onClick={() => handleDeletePriceBook(bookId)}
                  className="p-1 hover:text-rose-600 text-slate-400 rounded hover:bg-rose-50 transition cursor-pointer"
                >
                  <DeleteOutlined style={{ fontSize: 13 }} />
                </button>
              )}
            </div>
          </div>
        ),
        key: `price_book_${bookId}`,
        width: 185,
        align: 'right',
        render: (_, record) => {
          if (isDefaultBook) {
            // Chỉ BẢNG GIÁ CHUNG được phép sửa trực tiếp
            const editKey = `${record.productId}_${bookId}`;
            const isEdited = editKey in editedPrices;
            const currentVal = isEdited ? editedPrices[editKey] : (record.prices[bookId] ?? 0);

            return (
              <div className="relative">
                <input
                  type="text"
                  value={currentVal ? currencyFormatter.format(currentVal) : '0'}
                  onChange={e => handlePriceChange(record.productId, bookId, e.target.value)}
                  className={`h-8 w-full rounded border px-2.5 text-right text-xs font-semibold outline-none transition ${
                    isEdited
                      ? 'border-emerald-500 bg-emerald-50/50 text-emerald-800 ring-1 ring-emerald-300'
                      : 'border-slate-300 bg-white text-slate-800 focus:border-[#0071BA] focus:ring-1 focus:ring-blue-100 hover:border-slate-400'
                  }`}
                  placeholder="0"
                />
              </div>
            );
          }

          // CÁC BẢNG GIÁ KHÁC: TỰ ĐỘNG TÍNH THEO CÔNG THỨC VÀ KHÔNG THỂ SỬA
          // Tính giá cơ sở từ Bảng giá chung (ưu tiên giá đang được gõ dở ở ô Bảng giá chung)
          let basePrice = 0;
          if (defaultBookId) {
            const defEditKey = `${record.productId}_${defaultBookId}`;
            if (defEditKey in editedPrices) {
              basePrice = editedPrices[defEditKey];
            } else {
              basePrice = record.prices[defaultBookId] ?? 0;
            }
          }

          if (book?.formulaBaseType === 'COST') {
            basePrice = record.costPrice;
          }

          // Áp dụng công thức
          let computedPrice = record.prices[bookId] ?? 0;
          if (book?.formulaOperator && book?.formulaValue) {
            let delta = 0;
            if (book.formulaUnit === 'PERCENT') {
              delta = basePrice * (book.formulaValue / 100);
            } else {
              delta = book.formulaValue;
            }
            const res = book.formulaOperator === '-' ? (basePrice - delta) : (basePrice + delta);
            computedPrice = Math.max(0, Math.round(res));
          } else if (bookId in record.prices && record.prices[bookId] !== null) {
            computedPrice = record.prices[bookId]!;
          }

          return (
            <div
              className="h-8 w-full rounded border border-slate-200 bg-slate-50/80 px-2.5 flex items-center justify-end text-right text-xs font-semibold text-slate-700 cursor-not-allowed select-all"
              title="Giá tự động tính theo công thức từ Giá chung, không thể sửa trực tiếp"
            >
              <span>{currencyFormatter.format(computedPrice)} ₫</span>
            </div>
          );
        },
      });
    });

    return baseCols;
  }, [selectedPriceBookIds, priceBooks, editedPrices]);

  const editedCount = Object.keys(editedPrices).length;

  return (
    <div className="flex min-h-[calc(100vh-56px)] bg-[#f7f9fa]">
      {contextHolder}

      {/* LEFT FILTER SIDEBAR */}
      <PriceBookFilterSidebar
        priceBooks={priceBooks}
        selectedPriceBookIds={selectedPriceBookIds}
        onTogglePriceBook={handleTogglePriceBook}
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
              <span className="text-sm font-semibold text-slate-800">
                Thiết lập giá sản phẩm
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
            Hiển thị <strong>{matrixItems.length}</strong> trong <strong>{totalCount}</strong> hàng hóa
          </div>
        </div>

        {/* Table Area */}
        <div className="flex-1 bg-[#f8fafc] p-6">
          <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-2xs">
            <Table<PriceBookMatrixItem>
              columns={columns}
              dataSource={matrixItems}
              rowKey="productId"
              loading={loading}
              pagination={{
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
              scroll={{ x: 800 }}
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
