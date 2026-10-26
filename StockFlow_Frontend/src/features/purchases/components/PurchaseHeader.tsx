'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, ChevronDown, Check, SlidersHorizontal, Printer, AlertCircle } from 'lucide-react';
import { Tooltip, message } from 'antd';
import { WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import { BackendProduct } from '@/features/products/services/productService';
import { PurchaseProductSearch } from './PurchaseProductSearch';

interface PurchaseHeaderProps {
  activeWarehouse: WarehouseItem;
  warehouses: WarehouseItem[];
  onSelectWarehouse: (wh: WarehouseItem) => void;
  products: BackendProduct[];
  loadingProducts: boolean;
  onSelectProduct: (prod: BackendProduct) => void;
  onOpenQuickAddProduct: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function PurchaseHeader({
  activeWarehouse,
  warehouses,
  onSelectWarehouse,
  products,
  loadingProducts,
  onSelectProduct,
  onOpenQuickAddProduct,
  searchInputRef,
}: PurchaseHeaderProps) {
  const [warehouseDropdownOpen, setWarehouseDropdownOpen] = useState(false);

  return (
    <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3 shrink-0 shadow-2xs">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Link
          href="/purchases"
          className="p-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer flex items-center justify-center shrink-0"
          title="Quay lại danh sách nhập hàng"
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="flex items-center gap-2 shrink-0">
          <h1 className="text-base font-semibold text-slate-800">Nhập hàng</h1>

          <div className="relative">
            <button
              type="button"
              onClick={() => setWarehouseDropdownOpen(!warehouseDropdownOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-[#0071BA] rounded-full text-xs font-medium hover:bg-blue-100 transition cursor-pointer"
              title="Đổi kho nhận hàng"
            >
              <MapPin size={12} className="text-[#0071BA] shrink-0" />
              <span className="font-semibold">{activeWarehouse.name}</span>
              <span className="text-[10px] text-blue-600 font-mono">({activeWarehouse.code})</span>
              <ChevronDown size={12} className={`transition-transform ${warehouseDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {warehouseDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-slate-800">
                <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Kho nhận hàng
                </div>
                {warehouses.map((wh) => (
                  <button
                    key={wh.warehouseId}
                    type="button"
                    onClick={() => {
                      onSelectWarehouse(wh);
                      setWarehouseDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition cursor-pointer ${
                      wh.warehouseId === activeWarehouse.warehouseId ? 'bg-blue-50 text-[#0071BA] font-semibold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span>{wh.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{wh.code}</span>
                    </div>
                    {wh.warehouseId === activeWarehouse.warehouseId && <Check size={14} className="text-[#0071BA]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <PurchaseProductSearch
          products={products}
          loading={loadingProducts}
          warehouseName={activeWarehouse.name}
          onSelect={onSelectProduct}
          onOpenQuickAdd={onOpenQuickAddProduct}
          searchInputRef={searchInputRef}
        />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <Tooltip title="Mẫu in & thiết lập bảng">
          <button type="button" className="p-1.5 rounded-[6px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer">
            <SlidersHorizontal size={17} />
          </button>
        </Tooltip>
        <Tooltip title="In phiếu">
          <button type="button" onClick={() => message.info('Đang chuẩn bị bản in...')} className="p-1.5 rounded-[6px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer">
            <Printer size={17} />
          </button>
        </Tooltip>
        <Tooltip title="Phím tắt: F3 (Tìm kiếm), F8 (Lưu tạm), F9 (Hoàn thành)">
          <button type="button" onClick={() => message.info('Phím tắt: F3 (Tìm hàng hóa), F8 (Lưu tạm), F9 (Hoàn thành nhập kho).')} className="p-1.5 rounded-[6px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer">
            <AlertCircle size={17} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
