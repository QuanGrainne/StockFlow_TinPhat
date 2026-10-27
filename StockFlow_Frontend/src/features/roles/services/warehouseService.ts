// src/features/roles/services/warehouseService.ts
// Service xử lý API cho phân hệ Thủ kho kết nối Phân quyền kho & Danh mục hàng hóa Master Data

import { InboundReceipt, StockInventoryItem, WarehouseFacility } from '../types';
import { INITIAL_INBOUND_RECEIPTS, INITIAL_STOCK_ITEMS } from '../data/mockData';
import { permissionService } from './permissionService';
import { GoodsItem, STOCKFLOW_GOODS_STORAGE_KEY, formatRealDateTime } from '../components/common/GoodsCatalogScreen';

let inboundReceipts = [...INITIAL_INBOUND_RECEIPTS];
let stockItems = [...INITIAL_STOCK_ITEMS];

export const warehouseService = {
  // ─── 1. Quản lý kho được phân quyền (Data Isolation) ──────────────────────────
  async getPermittedWarehouses(): Promise<WarehouseFacility[]> {
    return permissionService.getMyWarehouseFacilities();
  },

  async getAllWarehouses(): Promise<WarehouseFacility[]> {
    return permissionService.getWarehouseFacilities();
  },

  // ─── 2. Đọc & Lưu trữ Danh mục Hàng hóa (Master Data) ─────────────────────────
  getGoodsCatalog(): GoodsItem[] {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STOCKFLOW_GOODS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading goods catalog from localStorage:', e);
    }
    return [];
  },

  saveGoodsCatalog(items: GoodsItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event('stockflow_goods_updated'));
    } catch (e) {
      console.warn('Error saving goods catalog to localStorage:', e);
    }
  },

  getItemStockInWarehouse(item: GoodsItem, warehouseCodeOrName: string): number {
    if (!item.stockByWarehouse || item.stockByWarehouse.length === 0) {
      return item.stockQuantity || 0;
    }
    const cleanTarget = (warehouseCodeOrName || '').toLowerCase().trim();
    const found = item.stockByWarehouse.find((w) => {
      const wCode = (w.warehouseCode || '').toLowerCase().trim();
      const wName = (w.warehouseName || '').toLowerCase().trim();
      return (
        (wCode && cleanTarget.includes(wCode)) ||
        (wName && cleanTarget.includes(wName)) ||
        (wName && cleanTarget.replace(/\s+/g, '').includes(wName.replace(/\s+/g, '')))
      );
    });
    return found ? Number(found.actualStock) || 0 : 0;
  },

  getWarehouseOverviewKpi(warehouseCodeOrName: string): {
    totalItems: number;
    totalStock: number;
    lowStockCount: number;
    capacityRate: number;
  } {
    const catalog = this.getGoodsCatalog();
    let totalStock = 0;
    let lowStockCount = 0;
    let itemsInWh = 0;

    for (const item of catalog) {
      const stock = this.getItemStockInWarehouse(item, warehouseCodeOrName);
      if (stock > 0 || item.stockByWarehouse?.some((w) => (w.warehouseCode && warehouseCodeOrName.includes(w.warehouseCode)))) {
        itemsInWh++;
        totalStock += stock;
        const minSafe = item.minSafeStock || 0;
        if (stock <= minSafe) {
          lowStockCount++;
        }
      }
    }

    // Ước tính sức chứa danh định 5,000 sản phẩm / kho
    const capacityLimit = 5000;
    const capacityRate = Math.min(100, Math.round((totalStock / capacityLimit) * 1000) / 10);

    return {
      totalItems: itemsInWh > 0 ? itemsInWh : catalog.length,
      totalStock,
      lowStockCount,
      capacityRate: capacityRate > 0 ? capacityRate : 68.5,
    };
  },

  getLowStockItemsInWarehouse(warehouseCodeOrName: string): {
    item: GoodsItem;
    actualStock: number;
    minSafeStock: number;
    isOutOfStock: boolean;
  }[] {
    const catalog = this.getGoodsCatalog();
    const result: { item: GoodsItem; actualStock: number; minSafeStock: number; isOutOfStock: boolean }[] = [];

    for (const item of catalog) {
      const stock = this.getItemStockInWarehouse(item, warehouseCodeOrName);
      const minSafe = item.minSafeStock ?? 10;
      if (stock <= minSafe) {
        result.push({
          item,
          actualStock: stock,
          minSafeStock: minSafe,
          isOutOfStock: stock <= 0,
        });
      }
    }
    return result;
  },

  // ─── 3. Thực thi Điều chuyển kho & Ghi Thẻ kho ────────────────────────────────
  executeStockTransfer(transfer: {
    transferCode: string;
    paperCode: string;
    fromWarehouse: string;
    toWarehouse: string;
    items: { sku: string; actualQty: number; name?: string }[];
    driverInfo?: string;
  }): boolean {
    const catalog = this.getGoodsCatalog();
    if (!catalog || catalog.length === 0) return false;

    const nowStr = formatRealDateTime(new Date());

    const updated = catalog.map((product) => {
      const matched = transfer.items.find(
        (it) => it.sku.toLowerCase() === product.code.toLowerCase() || (product.id && it.sku.toLowerCase() === product.id.toLowerCase())
      );
      if (!matched || matched.actualQty <= 0) return product;

      const qty = matched.actualQty;
      const stockList = product.stockByWarehouse ? [...product.stockByWarehouse] : [];

      // Trừ kho xuất (fromWarehouse)
      const fromIdx = stockList.findIndex((w) => {
        const c = (w.warehouseCode || '').toLowerCase();
        const n = (w.warehouseName || '').toLowerCase();
        return (c && transfer.fromWarehouse.toLowerCase().includes(c)) || (n && transfer.fromWarehouse.toLowerCase().includes(n));
      });

      let fromBalance = 0;
      if (fromIdx >= 0) {
        const cur = Number(stockList[fromIdx].actualStock) || 0;
        const next = Math.max(0, cur - qty);
        stockList[fromIdx] = {
          ...stockList[fromIdx],
          actualStock: next,
          availableStock: Math.max(0, next - (stockList[fromIdx].availableStock ? cur - stockList[fromIdx].availableStock : 0)),
        };
        fromBalance = next;
      } else {
        const cur = product.stockQuantity || 0;
        const next = Math.max(0, cur - qty);
        stockList.push({
          warehouseName: transfer.fromWarehouse,
          actualStock: next,
          availableStock: next,
        });
        fromBalance = next;
      }

      // Cộng kho nhận (toWarehouse)
      const toIdx = stockList.findIndex((w) => {
        const c = (w.warehouseCode || '').toLowerCase();
        const n = (w.warehouseName || '').toLowerCase();
        return (c && transfer.toWarehouse.toLowerCase().includes(c)) || (n && transfer.toWarehouse.toLowerCase().includes(n));
      });

      let toBalance = 0;
      if (toIdx >= 0) {
        const cur = Number(stockList[toIdx].actualStock) || 0;
        const next = cur + qty;
        stockList[toIdx] = {
          ...stockList[toIdx],
          actualStock: next,
          availableStock: next,
        };
        toBalance = next;
      } else {
        stockList.push({
          warehouseName: transfer.toWarehouse,
          actualStock: qty,
          availableStock: qty,
        });
        toBalance = qty;
      }

      // Ghi thẻ kho (Stock Card Recent)
      const newRecent = product.stockCardRecent ? [...product.stockCardRecent] : [];
      newRecent.unshift(
        {
          date: nowStr,
          docCode: transfer.transferCode,
          type: 'CHUYEN',
          typeName: 'Xuất điều chuyển',
          qtyChange: -qty,
          balance: fromBalance,
          partnerOrDept: `Đến ${transfer.toWarehouse}`,
        },
        {
          date: nowStr,
          docCode: transfer.transferCode,
          type: 'CHUYEN',
          typeName: 'Nhập điều chuyển',
          qtyChange: qty,
          balance: toBalance,
          partnerOrDept: `Từ ${transfer.fromWarehouse}`,
        }
      );

      return {
        ...product,
        stockByWarehouse: stockList,
        stockCardRecent: newRecent.slice(0, 30),
      };
    });

    this.saveGoodsCatalog(updated);
    return true;
  },

  // ─── 4. Thực thi Cân chỉnh Kiểm kê & Ghi Thẻ kho ──────────────────────────────
  executeAuditAdjustment(audit: {
    auditCode: string;
    paperCode: string;
    warehouseCodeOrName: string;
    items: { sku: string; bookQty: number; actualQty: number; explanation?: string }[];
  }): boolean {
    const catalog = this.getGoodsCatalog();
    if (!catalog || catalog.length === 0) return false;

    const nowStr = formatRealDateTime(new Date());

    const updated = catalog.map((product) => {
      const matched = audit.items.find(
        (it) => it.sku.toLowerCase() === product.code.toLowerCase() || (product.id && it.sku.toLowerCase() === product.id.toLowerCase())
      );
      if (!matched) return product;

      const diff = matched.actualQty - matched.bookQty;
      const stockList = product.stockByWarehouse ? [...product.stockByWarehouse] : [];

      const whIdx = stockList.findIndex((w) => {
        const c = (w.warehouseCode || '').toLowerCase();
        const n = (w.warehouseName || '').toLowerCase();
        return (c && audit.warehouseCodeOrName.toLowerCase().includes(c)) || (n && audit.warehouseCodeOrName.toLowerCase().includes(n));
      });

      if (whIdx >= 0) {
        stockList[whIdx] = {
          ...stockList[whIdx],
          actualStock: matched.actualQty,
          availableStock: matched.actualQty,
        };
      } else {
        stockList.push({
          warehouseName: audit.warehouseCodeOrName,
          actualStock: matched.actualQty,
          availableStock: matched.actualQty,
        });
      }

      const newTotal = stockList.reduce((sum, w) => sum + (Number(w.actualStock) || 0), 0);
      const newRecent = product.stockCardRecent ? [...product.stockCardRecent] : [];

      if (diff !== 0) {
        newRecent.unshift({
          date: nowStr,
          docCode: audit.auditCode,
          type: diff > 0 ? 'NHAP' : 'XUAT',
          typeName: diff > 0 ? 'Kiểm kê (Thừa)' : 'Kiểm kê (Thiếu)',
          qtyChange: diff,
          balance: matched.actualQty,
          partnerOrDept: `${audit.paperCode} • ${matched.explanation || 'Cân chỉnh tồn kho'}`,
        });
      }

      return {
        ...product,
        stockQuantity: newTotal,
        availableQuantity: newTotal,
        stockByWarehouse: stockList,
        stockCardRecent: newRecent.slice(0, 30),
      };
    });

    this.saveGoodsCatalog(updated);
    return true;
  },

  // ─── 5. Thực thi Nhập kho Chứng từ Giấy & Ghi Thẻ kho ────────────────────────
  executeInboundReceiptLock(receipt: {
    receiptCode: string;
    paperCode: string;
    warehouseCodeOrName: string;
    supplier: string;
    items: { sku: string; actualQty: number; defectiveQty?: number; notes?: string }[];
  }): boolean {
    const catalog = this.getGoodsCatalog();
    if (!catalog || catalog.length === 0) return false;

    const nowStr = formatRealDateTime(new Date());

    const updated = catalog.map((product) => {
      const matched = receipt.items.find(
        (it) => it.sku.toLowerCase() === product.code.toLowerCase() || (product.id && it.sku.toLowerCase() === product.id.toLowerCase())
      );
      if (!matched || matched.actualQty <= 0) return product;

      const qty = matched.actualQty;
      const stockList = product.stockByWarehouse ? [...product.stockByWarehouse] : [];

      const whIdx = stockList.findIndex((w) => {
        const c = (w.warehouseCode || '').toLowerCase();
        const n = (w.warehouseName || '').toLowerCase();
        return (c && receipt.warehouseCodeOrName.toLowerCase().includes(c)) || (n && receipt.warehouseCodeOrName.toLowerCase().includes(n));
      });

      let whBalance = 0;
      if (whIdx >= 0) {
        const cur = Number(stockList[whIdx].actualStock) || 0;
        const next = cur + qty;
        stockList[whIdx] = {
          ...stockList[whIdx],
          actualStock: next,
          availableStock: next,
        };
        whBalance = next;
      } else {
        stockList.push({
          warehouseName: receipt.warehouseCodeOrName,
          actualStock: qty,
          availableStock: qty,
        });
        whBalance = qty;
      }

      const newTotal = (product.stockQuantity || 0) + qty;
      const newRecent = product.stockCardRecent ? [...product.stockCardRecent] : [];

      newRecent.unshift({
        date: nowStr,
        docCode: receipt.receiptCode,
        type: 'NHAP',
        typeName: 'Nhập kho mua hàng',
        qtyChange: qty,
        balance: whBalance,
        partnerOrDept: `${receipt.supplier} (${receipt.paperCode})`,
      });

      return {
        ...product,
        stockQuantity: newTotal,
        availableQuantity: newTotal,
        stockByWarehouse: stockList,
        stockCardRecent: newRecent.slice(0, 30),
      };
    });

    this.saveGoodsCatalog(updated);
    return true;
  },

  // ─── 6. Legacy / Helper Mock APIs ───────────────────────────────────────────
  async getInboundReceipts(search?: string, status?: string): Promise<InboundReceipt[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    let list = [...inboundReceipts];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.receiptCode.toLowerCase().includes(q) ||
          r.poCode.toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q)
      );
    }

    if (status && status !== 'ALL') {
      list = list.filter((r) => r.status === status);
    }

    return list;
  },

  async createInboundReceipt(
    payload: Omit<InboundReceipt, 'id' | 'receiptCode'>
  ): Promise<InboundReceipt> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const newReceipt: InboundReceipt = {
      ...payload,
      id: `GR-${Date.now()}`,
      receiptCode: `GR-2026-${String(inboundReceipts.length + 1).padStart(3, '0')}`,
    };
    inboundReceipts.unshift(newReceipt);
    return newReceipt;
  },

  async updateReceiptStatus(id: string, status: InboundReceipt['status']): Promise<InboundReceipt> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const idx = inboundReceipts.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Không tìm thấy phiếu nhập kho');
    inboundReceipts[idx] = { ...inboundReceipts[idx], status };
    return inboundReceipts[idx];
  },

  async getStockInventory(search?: string): Promise<StockInventoryItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    let list = [...stockItems];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.productCode.toLowerCase().includes(q) ||
          s.productName.toLowerCase().includes(q) ||
          s.binLocation.toLowerCase().includes(q) ||
          s.lotNumber.toLowerCase().includes(q)
      );
    }

    return list;
  },

  async updateStockLocation(
    id: string,
    binLocation: string,
    quantityOnHand: number
  ): Promise<StockInventoryItem> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const idx = stockItems.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Không tìm thấy bản ghi tồn kho');
    stockItems[idx] = {
      ...stockItems[idx],
      binLocation,
      quantityOnHand,
      quantityAvailable: Math.max(0, quantityOnHand - stockItems[idx].quantityAllocated),
    };
    return stockItems[idx];
  },
};

