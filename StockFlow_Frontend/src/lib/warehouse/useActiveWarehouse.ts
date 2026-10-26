// src/lib/warehouse/useActiveWarehouse.ts
// Quản lý Chi nhánh / Kho hàng đang kích hoạt trên toàn hệ thống (KiotViet Pattern)

'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WarehouseItem {
  warehouseId: number;
  code: string;
  name: string;
}

export const TIN_PHAT_WAREHOUSES: WarehouseItem[] = [
  { warehouseId: 3, code: 'K001', name: 'Kho Tổng Gia Lâm' },
  { warehouseId: 4, code: 'K002', name: 'Kho Đông Anh' },
  { warehouseId: 5, code: 'K003', name: 'Kho Hà Đông' },
  { warehouseId: 6, code: 'K004', name: 'Kho Hoàn Kiếm' },
];

const STORAGE_KEY = 'stockflow_active_warehouse';
const EVENT_NAME = 'stockflow:warehouse-changed';

export function getActiveWarehouse(): WarehouseItem {
  if (typeof window === 'undefined') return TIN_PHAT_WAREHOUSES[0];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.warehouseId) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return TIN_PHAT_WAREHOUSES[0];
}

export function setActiveWarehouseGlobal(warehouse: WarehouseItem): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(warehouse));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: warehouse }));
  } catch (err) {
    console.error('Không thể lưu kho active vào localStorage:', err);
  }
}

export function useActiveWarehouse() {
  const [activeWarehouse, setActiveWarehouseState] = useState<WarehouseItem>(getActiveWarehouse);

  useEffect(() => {
    // Đồng bộ state ban đầu từ localStorage sau khi mount
    setActiveWarehouseState(getActiveWarehouse());

    function handleWarehouseChange(e: Event) {
      const customEvent = e as CustomEvent<WarehouseItem>;
      if (customEvent.detail) {
        setActiveWarehouseState(customEvent.detail);
      } else {
        setActiveWarehouseState(getActiveWarehouse());
      }
    }

    window.addEventListener(EVENT_NAME, handleWarehouseChange);
    window.addEventListener('storage', handleWarehouseChange);

    return () => {
      window.removeEventListener(EVENT_NAME, handleWarehouseChange);
      window.removeEventListener('storage', handleWarehouseChange);
    };
  }, []);

  const setActiveWarehouse = useCallback((warehouse: WarehouseItem) => {
    setActiveWarehouseState(warehouse);
    setActiveWarehouseGlobal(warehouse);
  }, []);

  return {
    activeWarehouse,
    setActiveWarehouse,
    warehouses: TIN_PHAT_WAREHOUSES,
  };
}
