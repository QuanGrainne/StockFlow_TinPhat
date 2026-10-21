// src/features/roles/services/warehouseService.ts
// Service xử lý API cho phân hệ Thủ kho (sẵn sàng tích hợp NestJS / ASP.NET Backend)

import { InboundReceipt, StockInventoryItem } from '../types';
import { INITIAL_INBOUND_RECEIPTS, INITIAL_STOCK_ITEMS } from '../data/mockData';

let inboundReceipts = [...INITIAL_INBOUND_RECEIPTS];
let stockItems = [...INITIAL_STOCK_ITEMS];

export const warehouseService = {
  // Lấy danh sách phiếu nhập kho / kiểm hàng
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

  // Tạo phiếu kiểm hàng nhập kho thực tế
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

  // Cập nhật trạng thái phiếu nhập kho (ví dụ: hoàn thành nhập kho)
  async updateReceiptStatus(id: string, status: InboundReceipt['status']): Promise<InboundReceipt> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const idx = inboundReceipts.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Không tìm thấy phiếu nhập kho');
    inboundReceipts[idx] = { ...inboundReceipts[idx], status };
    return inboundReceipts[idx];
  },

  // Lấy danh sách tồn kho theo vị trí Bin Location
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

  // Điều chuyển vị trí / Cập nhật số lượng kiểm kê
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
