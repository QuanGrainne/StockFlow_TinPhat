// src/features/roles/components/common/GoodsExportModal.tsx
'use client';

import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { GoodsItem } from './GoodsCatalogScreen';

export interface ColumnDefinition {
  id: string;
  label: string;
  defaultChecked?: boolean;
  width?: number;
  getValue: (item: GoodsItem) => string | number;
}

export interface ColumnGroup {
  id: string;
  title: string;
  leftColumns: ColumnDefinition[];
  rightColumns: ColumnDefinition[];
}

export const EXPORT_COLUMN_GROUPS: ColumnGroup[] = [
  {
    id: 'product',
    title: 'Hàng hóa',
    leftColumns: [
      {
        id: 'category_type',
        label: 'Loại hàng',
        defaultChecked: true,
        width: 14,
        getValue: (item) => (item as any).productType || 'Hàng hóa',
      },
      {
        id: 'code',
        label: 'Mã hàng',
        defaultChecked: true,
        width: 16,
        getValue: (item) => item.code || '',
      },
      {
        id: 'invoice_name',
        label: 'Tên hàng trên hóa đơn điện tử',
        defaultChecked: true,
        width: 32,
        getValue: (item) => item.name || '',
      },
      {
        id: 'image',
        label: 'Hình ảnh (url1,url2...)',
        defaultChecked: true,
        width: 28,
        getValue: (item) => item.imageUrl || '',
      },
      {
        id: 'is_direct_sale',
        label: 'Được bán trực tiếp',
        defaultChecked: true,
        width: 18,
        getValue: (item) => (item.isDirectSale !== false ? 1 : 0),
      },
    ],
    rightColumns: [
      {
        id: 'category',
        label: 'Nhóm hàng(3 Cấp)',
        defaultChecked: true,
        width: 20,
        getValue: (item) => item.subCategory || item.category || 'Mặc định',
      },
      {
        id: 'name',
        label: 'Tên hàng',
        defaultChecked: true,
        width: 32,
        getValue: (item) => item.name || '',
      },
      {
        id: 'brand',
        label: 'Thương hiệu',
        defaultChecked: true,
        width: 18,
        getValue: (item) => item.brand || '',
      },
      {
        id: 'is_active',
        label: 'Đang kinh doanh',
        defaultChecked: true,
        width: 16,
        getValue: (item) => (item.status === 'ACTIVE' ? 1 : 0),
      },
    ],
  },
  {
    id: 'price_stock',
    title: 'Giá bán & Tồn kho',
    leftColumns: [
      {
        id: 'sale_price',
        label: 'Giá bán',
        defaultChecked: true,
        width: 14,
        getValue: (item) => Number(item.standardPrice ?? 0),
      },
      {
        id: 'stock',
        label: 'Tồn Kho',
        defaultChecked: true,
        width: 12,
        getValue: (item) => Number(item.stockQuantity ?? 0),
      },
      {
        id: 'stockout_eta',
        label: 'Dự kiến hết hàng',
        defaultChecked: true,
        width: 18,
        getValue: (item) => {
          if (item.stockQuantity <= 0) return '0 ngày';
          if (item.stockQuantity < (item.minSafeStock || 10)) return '3 ngày';
          return '0 ngày';
        },
      },
      {
        id: 'max_stock',
        label: 'Tồn lớn nhất',
        defaultChecked: true,
        width: 16,
        getValue: (item) => Number(item.maxSafeStock ?? 999999999),
      },
    ],
    rightColumns: [
      {
        id: 'cost_price',
        label: 'Giá vốn',
        defaultChecked: true,
        width: 14,
        getValue: (item) => Number(item.costPrice ?? 0),
      },
      {
        id: 'customer_order',
        label: 'KH đặt',
        defaultChecked: true,
        width: 12,
        getValue: (item) => Number(item.reservedQuantity ?? 0),
      },
      {
        id: 'min_stock',
        label: 'Tồn nhỏ nhất',
        defaultChecked: true,
        width: 14,
        getValue: (item) => Number(item.minSafeStock ?? 0),
      },
    ],
  },
  {
    id: 'unit',
    title: 'Đơn vị tính',
    leftColumns: [
      {
        id: 'uom',
        label: 'ĐVT',
        defaultChecked: true,
        width: 14,
        getValue: (item) => item.uom || 'Cái',
      },
      {
        id: 'conversion_rate',
        label: 'Quy đổi',
        defaultChecked: true,
        width: 12,
        getValue: () => 1.0,
      },
    ],
    rightColumns: [
      {
        id: 'base_uom_code',
        label: 'Mã ĐVT Cơ bản',
        defaultChecked: true,
        width: 16,
        getValue: (item) => item.code || '',
      },
    ],
  },
  {
    id: 'attribute',
    title: 'Thuộc tính',
    leftColumns: [
      {
        id: 'attributes',
        label: 'Thuộc tính',
        defaultChecked: true,
        width: 26,
        getValue: (item) => {
          if (item.attributes && item.attributes.length > 0) {
            return item.attributes
              .map((a) => `${a.name.toUpperCase()}: ${a.values.join(', ')}`)
              .join('; ');
          }
          if (item.specification) return `LOẠI: ${item.specification}`;
          return '';
        },
      },
    ],
    rightColumns: [
      {
        id: 'related_codes',
        label: 'Mã HH Liên quan',
        defaultChecked: true,
        width: 16,
        getValue: (item) => item.code || '',
      },
    ],
  },
  {
    id: 'other',
    title: 'Thông tin khác',
    leftColumns: [
      {
        id: 'weight',
        label: 'Trọng lượng',
        defaultChecked: true,
        width: 14,
        getValue: (item) => Number(item.weight ?? 0),
      },
      {
        id: 'description',
        label: 'Mô tả',
        defaultChecked: true,
        width: 26,
        getValue: (item) => item.description || '',
      },
      {
        id: 'composite_items',
        label: 'Hàng thành phần',
        defaultChecked: true,
        width: 18,
        getValue: () => '',
      },
    ],
    rightColumns: [
      {
        id: 'location',
        label: 'Vị trí',
        defaultChecked: true,
        width: 16,
        getValue: (item) => item.locationName || '',
      },
      {
        id: 'note_template',
        label: 'Mẫu ghi chú',
        defaultChecked: true,
        width: 16,
        getValue: () => '',
      },
      {
        id: 'created_at',
        label: 'Thời gian tạo',
        defaultChecked: true,
        width: 18,
        getValue: (item) => item.createdAt || '29/10/2026 00:00',
      },
    ],
  },
];

// Thứ tự cột chuẩn khi xuất ra file Excel khớp ảnh 3
export const ORDERED_EXPORT_COLUMN_KEYS = [
  'category_type',
  'category',
  'code',
  'name',
  'invoice_name',
  'brand',
  'sale_price',
  'cost_price',
  'stock',
  'customer_order',
  'stockout_eta',
  'min_stock',
  'max_stock',
  'uom',
  'base_uom_code',
  'conversion_rate',
  'attributes',
  'related_codes',
  'image',
  'weight',
  'is_active',
  'is_direct_sale',
  'description',
  'note_template',
  'location',
  'composite_items',
  'created_at',
];

/**
 * Thực hiện xuất danh sách sản phẩm ra tệp .xlsx chuẩn StockFlow
 */
export function generateGoodsExcel(
  items: GoodsItem[],
  selectedColumnKeys: string[]
): { fileName: string; workbook: XLSX.WorkBook } {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const pad3 = (n: number) => String(n).padStart(3, '0');
  const dateStr = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${now.getFullYear()}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}-${pad3(now.getMilliseconds())}`;
  const fileName = `DanhSachSanPham_KV${dateStr}.xlsx`;

  // Tìm các cột được chọn theo thứ tự chuẩn
  const allColumnsMap = new Map<string, ColumnDefinition>();
  for (const group of EXPORT_COLUMN_GROUPS) {
    for (const col of [...group.leftColumns, ...group.rightColumns]) {
      allColumnsMap.set(col.id, col);
    }
  }

  const activeColumns: ColumnDefinition[] = [];
  for (const key of ORDERED_EXPORT_COLUMN_KEYS) {
    if (selectedColumnKeys.includes(key)) {
      const col = allColumnsMap.get(key);
      if (col) activeColumns.push(col);
    }
  }

  const headers = activeColumns.map((col) => col.label);
  const dataRows = items.map((item) => activeColumns.map((col) => col.getValue(item)));

  const sheetData = [headers, ...dataRows];
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Cấu hình độ rộng các cột
  worksheet['!cols'] = activeColumns.map((col) => ({ wch: col.width || 16 }));

  // Cấu hình AutoFilter cho dòng tiêu đề khớp ảnh 3
  if (dataRows.length > 0 && headers.length > 0) {
    worksheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: dataRows.length, c: headers.length - 1 },
      }),
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachSanPham');
  XLSX.writeFile(workbook, fileName);

  return { fileName, workbook };
}

interface GoodsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GoodsItem[];
  onExportSuccess: (result: { fileName: string; workbook: XLSX.WorkBook }) => void;
}

export default function GoodsExportModal({
  isOpen,
  onClose,
  items,
  onExportSuccess,
}: GoodsExportModalProps) {
  // Tập hợp toàn bộ keys mặc định được chọn
  const allKeys = useMemo(() => {
    const keys: string[] = [];
    for (const group of EXPORT_COLUMN_GROUPS) {
      for (const col of [...group.leftColumns, ...group.rightColumns]) {
        keys.push(col.id);
      }
    }
    return keys;
  }, []);

  const [selectedKeys, setSelectedKeys] = useState<string[]>(allKeys);

  if (!isOpen) return null;

  const totalColumns = allKeys.length;
  const isAllSelected = selectedKeys.length === totalColumns;

  const handleToggleColumn = (id: string) => {
    setSelectedKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(allKeys);
    }
  };

  const handleExecuteExport = () => {
    if (selectedKeys.length === 0) return;
    const result = generateGoodsExcel(items, selectedKeys);
    onExportSuccess(result);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800">Tùy chọn cột hiển thị</h3>
            <p className="text-xs text-slate-500 mt-0.5">Chọn ít nhất 1 cột để xuất file</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            title="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Danh sách 5 nhóm cột (Khớp ảnh 1) */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {EXPORT_COLUMN_GROUPS.map((group) => {
            const groupColumns = [...group.leftColumns, ...group.rightColumns];
            const groupSelectedCount = groupColumns.filter((col) =>
              selectedKeys.includes(col.id)
            ).length;
            const groupTotalCount = groupColumns.length;

            return (
              <div key={group.id} className="space-y-3">
                {/* Tiêu đề nhóm & số lượng (badge x/y) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800">{group.title}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold">
                    {groupSelectedCount}/{groupTotalCount}
                  </span>
                </div>

                {/* 2 Cột Checkboxes trái & phải chuẩn thiết kế ảnh 1 */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                  {/* Cột bên trái */}
                  <div className="space-y-2.5">
                    {group.leftColumns.map((col) => {
                      const isChecked = selectedKeys.includes(col.id);
                      return (
                        <label
                          key={col.id}
                          className="flex items-center gap-2.5 cursor-pointer select-none group"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleColumn(col.id)}
                            className="w-4 h-4 rounded text-[#0071BA] border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#0071BA]"
                          />
                          <span
                            className={`text-xs transition ${
                              isChecked
                                ? 'text-slate-700 font-medium'
                                : 'text-slate-500 group-hover:text-slate-700'
                            }`}
                          >
                            {col.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Cột bên phải */}
                  <div className="space-y-2.5">
                    {group.rightColumns.map((col) => {
                      const isChecked = selectedKeys.includes(col.id);
                      return (
                        <label
                          key={col.id}
                          className="flex items-center gap-2.5 cursor-pointer select-none group"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleColumn(col.id)}
                            className="w-4 h-4 rounded text-[#0071BA] border-slate-300 focus:ring-blue-500 cursor-pointer accent-[#0071BA]"
                          />
                          <span
                            className={`text-xs transition ${
                              isChecked
                                ? 'text-slate-700 font-medium'
                                : 'text-slate-500 group-hover:text-slate-700'
                            }`}
                          >
                            {col.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-white">
          <button
            type="button"
            onClick={handleToggleSelectAll}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer transition select-none"
          >
            {isAllSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition cursor-pointer"
            >
              Bỏ qua
            </button>
            <button
              type="button"
              onClick={handleExecuteExport}
              disabled={selectedKeys.length === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0071BA] hover:bg-[#005f9e] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition cursor-pointer shadow-xs"
            >
              Xuất file
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

