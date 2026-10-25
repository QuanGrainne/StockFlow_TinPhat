'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SearchOutlined,
  PlusOutlined,
  SaveOutlined,
  CalculatorOutlined,
  SettingOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Table, Input, Button, Tag, notification } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import PriceBookFilterSidebar from '../components/PriceBookFilterSidebar';
import CreatePriceBookModal from '../components/CreatePriceBookModal';
import { PriceBook, PriceBookMatrixItem } from '../types';
import { priceBookService } from '../services/priceBookService';
import { apiClient } from '@/lib/api/client';

interface WarehouseItem {
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
}

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
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  // Filters
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null);
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
    // 1. Warehouses
    apiClient.get<WarehouseItem[]>('/api/warehouses')
      .then(res => setWarehouses(Array.isArray(res) ? res : []))
      .catch(() => {});

    // 2. Categories
    apiClient.get<CategoryItem[]>('/api/products/categories')
      .then(res => setCategories(Array.isArray(res) ? res : []))
      .catch(() => {});

    // 3. Price Books
    loadPriceBooks();
  }, []);

  const loadPriceBooks = async () => {
    try {
      const data = await priceBookService.getPriceBooks();
      setPriceBooks(data);
      if (data.length > 0) {
        setSelectedPriceBookIds(prev => {
          if (prev.length > 0) return prev;
          const def = data.find(p => p.isDefault) || data[0];
          return [def.priceBookId];
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
        warehouseId: selectedWarehouseId ?? undefined,
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
  }, [selectedWarehouseId, searchKeyword, selectedCategoryId, stockCondition, selectedPriceBookIds, pageIndex, pageSize, priceBooks.length, api]);

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

      api.success({
        message: 'Lưu thành công',
        description: `Đã cập nhật ${keys.length} đơn giá sản phẩm.`,
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

  // Construct Ant Design Table Columns
  const columns: ColumnsType<PriceBookMatrixItem> = useMemo(() => {
    const baseCols: ColumnsType<PriceBookMatrixItem> = [
      {
        title: 'Mã hàng',
        dataIndex: 'productCode',
        key: 'productCode',
        width: 130,
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
        width: 75,
        align: 'center',
        render: (u: string) => <span className="text-xs text-slate-600">{u}</span>,
      },
      {
        title: (
          <div>
            <div>Giá vốn</div>
            <div className="text-[10px] text-slate-400 font-normal">
              {selectedWarehouseId ? 'Theo kho chọn' : 'Toàn cty'}
            </div>
          </div>
        ),
        dataIndex: 'costPrice',
        key: 'costPrice',
        width: 125,
        align: 'right',
        render: (val: number) => (
          <span className="text-xs font-medium text-slate-700">{formatCurrency(val)}</span>
        ),
      },
      {
        title: (
          <div>
            <div>Giá nhập cuối</div>
            <div className="text-[10px] text-slate-400 font-normal">
              {selectedWarehouseId ? 'Theo kho chọn' : 'Lần nhập gần nhất'}
            </div>
          </div>
        ),
        dataIndex: 'latestPurchasePrice',
        key: 'latestPurchasePrice',
        width: 125,
        align: 'right',
        render: (val: number) => (
          <span className="text-xs font-medium text-slate-700">{formatCurrency(val)}</span>
        ),
      },
    ];

    // Dynamic columns for each selected Price Book
    selectedPriceBookIds.forEach(bookId => {
      const book = priceBooks.find(b => b.priceBookId === bookId);
      const bookName = book?.priceBookName ?? `Bảng giá #${bookId}`;

      baseCols.push({
        title: (
          <div className="flex items-center justify-between gap-1 group">
            <span className="font-bold text-[#0071BA] truncate">{bookName}</span>
            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
              {book?.formulaBaseType && (
                <button
                  type="button"
                  title="Tính toán lại theo công thức"
                  onClick={() => handleApplyFormulaForActiveBook(bookId)}
                  className="p-1 hover:text-[#0071BA] text-slate-400 rounded hover:bg-blue-50 transition"
                >
                  <CalculatorOutlined style={{ fontSize: 13 }} />
                </button>
              )}
              <button
                type="button"
                title="Cài đặt bảng giá này"
                onClick={() => {
                  setEditingPriceBook(book || null);
                  setIsModalOpen(true);
                }}
                className="p-1 hover:text-[#0071BA] text-slate-400 rounded hover:bg-blue-50 transition"
              >
                <SettingOutlined style={{ fontSize: 13 }} />
              </button>
            </div>
          </div>
        ),
        key: `price_book_${bookId}`,
        width: 170,
        align: 'right',
        render: (_, record) => {
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
              />
            </div>
          );
        },
      });
    });

    return baseCols;
  }, [selectedPriceBookIds, priceBooks, selectedWarehouseId, editedPrices]);

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
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onSelectWarehouse={id => {
          setSelectedWarehouseId(id);
          setPageIndex(1);
        }}
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
                {priceBooks.find(b => b.priceBookId === selectedPriceBookIds[0])?.priceBookName ?? 'Bảng giá'}
              </span>
              <span className="text-xs text-slate-400">
                ({totalCount} hàng hóa)
              </span>
              {selectedWarehouseId && (
                <Tag color="blue" className="ml-2 text-xs">
                  Kho: {warehouses.find(w => w.warehouseId === selectedWarehouseId)?.warehouseName}
                </Tag>
              )}
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
              scroll={{ x: 1000 }}
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
        editingPriceBook={editingPriceBook}
        existingPriceBooks={priceBooks}
      />
    </div>
  );
}
