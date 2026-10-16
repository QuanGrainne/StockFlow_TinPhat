'use client';

import { useEffect, useRef } from 'react';

export type ProductColumnKey =
  | 'image'
  | 'code'
  | 'barcode'
  | 'name'
  | 'category'
  | 'type'
  | 'color'
  | 'size'
  | 'salePrice'
  | 'costPrice'
  | 'brand'
  | 'location'
  | 'stock'
  | 'customerOrder'
  | 'createdAt'
  | 'expectedOutOfStock'
  | 'minStock'
  | 'maxStock'
  | 'status';

export type ColumnVisibility = Record<ProductColumnKey, boolean>;

export const defaultColumnVisibility: ColumnVisibility = {
  image: true,
  code: true,
  barcode: false,
  name: true,
  category: true,
  type: false,
  color: true,
  size: true,
  salePrice: true,
  costPrice: true,
  brand: false,
  location: false,
  stock: true,
  customerOrder: true,
  createdAt: false,
  expectedOutOfStock: false,
  minStock: true,
  maxStock: false,
  status: true,
};

const leftColumns: Array<{ key: ProductColumnKey; label: string }> = [
  { key: 'image', label: 'Hình ảnh' },
  { key: 'code', label: 'Mã hàng' },
  { key: 'barcode', label: 'Mã vạch' },
  { key: 'name', label: 'Tên hàng' },
  { key: 'category', label: 'Nhóm hàng' },
  { key: 'type', label: 'Loại hàng' },
  { key: 'color', label: 'Màu sắc' },
  { key: 'size', label: 'Kích thước' },
  { key: 'salePrice', label: 'Giá bán' },
  { key: 'costPrice', label: 'Giá vốn' },
];

const rightColumns: Array<{ key: ProductColumnKey; label: string }> = [
  { key: 'brand', label: 'Thương hiệu' },
  { key: 'location', label: 'Vị trí' },
  { key: 'stock', label: 'Tồn kho' },
  { key: 'customerOrder', label: 'Khách đặt' },
  { key: 'createdAt', label: 'Thời gian tạo' },
  { key: 'expectedOutOfStock', label: 'Dự kiến hết hàng' },
  { key: 'minStock', label: 'Định mức tồn ít nhất' },
  { key: 'maxStock', label: 'Định mức tồn nhiều nhất' },
  { key: 'status', label: 'Trạng thái' },
];

type ColumnCustomizerPopoverProps = {
  open: boolean;
  value: ColumnVisibility;
  onChange: (nextValue: ColumnVisibility) => void;
  onClose: () => void;
};

export default function ColumnCustomizerPopover({
  open,
  value,
  onChange,
  onClose,
}: ColumnCustomizerPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [onClose, open]);

  if (!open) return null;

  function toggleColumn(key: ProductColumnKey) {
    onChange({ ...value, [key]: !value[key] });
  }

  function renderColumn(column: { key: ProductColumnKey; label: string }) {
    return (
      <label key={column.key} className="flex cursor-pointer items-center gap-2 text-sm text-gray-800">
        <input
          type="checkbox"
          checked={value[column.key]}
          onChange={() => toggleColumn(column.key)}
          className="h-4 w-4 cursor-pointer accent-blue-600"
        />
        <span>{column.label}</span>
      </label>
    );
  }

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full z-40 mt-2 w-[420px] rounded-md border border-gray-200 bg-white shadow-xl"
      role="dialog"
      aria-label="Tùy chỉnh cột hiển thị"
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 p-4">
        <div className="space-y-3">{leftColumns.map(renderColumn)}</div>
        <div className="space-y-3">{rightColumns.map(renderColumn)}</div>
      </div>
    </div>
  );
}
