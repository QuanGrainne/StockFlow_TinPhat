// src/lib/warehouse/useActiveWarehouse.ts
// Quản lý Chi nhánh / Kho hàng đang kích hoạt trên toàn hệ thống (KiotViet Pattern)

'use client';

import { useSyncExternalStore, useCallback } from 'react';

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

let cachedActiveWarehouse: WarehouseItem | null = null;

function getCachedActiveWarehouse(): WarehouseItem {
  if (!cachedActiveWarehouse) {
    cachedActiveWarehouse = getActiveWarehouse();
  }
  return cachedActiveWarehouse;
}

export function setActiveWarehouseGlobal(warehouse: WarehouseItem): void {
  cachedActiveWarehouse = warehouse;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(warehouse));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: warehouse }));
  } catch (err) {
    console.error('Không thể lưu kho active vào localStorage:', err);
  }
}

function subscribe(callback: () => void) {
  function handleWarehouseChange(e: Event) {
    const customEvent = e as CustomEvent<WarehouseItem>;
    if (customEvent.detail) {
      cachedActiveWarehouse = customEvent.detail;
    } else {
      cachedActiveWarehouse = getActiveWarehouse();
    }
    callback();
  }

  window.addEventListener(EVENT_NAME, handleWarehouseChange);
  window.addEventListener('storage', handleWarehouseChange);

  return () => {
    window.removeEventListener(EVENT_NAME, handleWarehouseChange);
    window.removeEventListener('storage', handleWarehouseChange);
  };
}

function getSnapshot(): WarehouseItem {
  return getCachedActiveWarehouse();
}

function getServerSnapshot(): WarehouseItem {
  return TIN_PHAT_WAREHOUSES[0];
}

export function useActiveWarehouse() {
  const activeWarehouse = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setActiveWarehouse = useCallback((warehouse: WarehouseItem) => {
    setActiveWarehouseGlobal(warehouse);
  }, []);

  return {
    activeWarehouse,
    setActiveWarehouse,
    warehouses: TIN_PHAT_WAREHOUSES,
  };
}
