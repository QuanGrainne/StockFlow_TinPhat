// src/features/transfers/services/transferService.ts
// Service tương tác với Backend API module Chuyển hàng (/api/transfers) kèm Fallback Cache

import { apiClient } from '@/lib/api/client';
import {
  TransferRecord,
  TransferDetail,
  TransferItem,
  TransferFilterState,
  ProductForTransfer,
} from '../types';
import { toLocalDatetimeInputString } from '../utils/dateUtils';

const STORAGE_KEY = 'stockflow_transfers_cache';
const GOODS_STORAGE_KEY = 'stockflow_goods_catalog_v1';

const WAREHOUSE_MAPPING: Record<number, { code: string; name: string }> = {
  1: { code: 'K001', name: 'Kho Tổng Gia Lâm' },
  2: { code: 'K002', name: 'Kho Đông Anh' },
  3: { code: 'K001', name: 'Kho Tổng Gia Lâm' },
  4: { code: 'K002', name: 'Kho Đông Anh' },
  5: { code: 'K003', name: 'Kho Hà Đông' },
  6: { code: 'K004', name: 'Kho Hoàn Kiếm' },
};

function getStockFromCatalogItem(catItem: any, warehouseId?: number): number {
  if (!warehouseId) return 0;
  const wh = WAREHOUSE_MAPPING[warehouseId];
  const targetName = wh?.name?.toLowerCase().trim();
  const targetCode = wh?.code?.toLowerCase().trim();

  if (Array.isArray(catItem.stockByWarehouse) && catItem.stockByWarehouse.length > 0) {
    const entry = catItem.stockByWarehouse.find((w: any) => {
      const name = (w.warehouseName || '').toLowerCase().trim();
      const code = (w.warehouseCode || '').toLowerCase().trim();
      return (
        (targetName && name === targetName) ||
        (targetCode && code === targetCode) ||
        (w.warehouseId && w.warehouseId === warehouseId)
      );
    });
    if (entry !== undefined && typeof entry.actualStock === 'number') {
      return entry.actualStock;
    }
  }

  // Fallback if product was assigned to warehouse directly
  const prodWh = (catItem.warehouse || '').toLowerCase().trim();
  if (targetName && prodWh === targetName) {
    return typeof catItem.stockQuantity === 'number' ? catItem.stockQuantity : 0;
  }

  return 0;
}

function adjustCatalogStock(
  warehouseId: number,
  items: { productId: number; quantity: number; productCode?: string }[],
  isDeduction: boolean,
  warehouseName?: string
) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(GOODS_STORAGE_KEY);
    if (!raw) return;
    const catalog = JSON.parse(raw);
    if (!Array.isArray(catalog)) return;

    const wh = WAREHOUSE_MAPPING[warehouseId];
    const targetName = (warehouseName || wh?.name || '').toLowerCase().trim();
    const targetCode = wh?.code?.toLowerCase().trim();

    let hasChange = false;

    items.forEach((it) => {
      const prod = catalog.find(
        (p: any) =>
          p.productId === it.productId ||
          (p.id && String(p.id) === String(it.productId)) ||
          Number(p.id) === it.productId ||
          (it.productCode && p.code && p.code.toUpperCase() === it.productCode.toUpperCase())
      );
      if (!prod) return;

      const changeQty = isDeduction ? -it.quantity : it.quantity;

      if (Array.isArray(prod.stockByWarehouse) && prod.stockByWarehouse.length > 0) {
        let entry = prod.stockByWarehouse.find((w: any) => {
          const name = (w.warehouseName || '').toLowerCase().trim();
          const code = (w.warehouseCode || '').toLowerCase().trim();
          return (
            (targetName && (name === targetName || name.includes(targetName) || targetName.includes(name))) ||
            (targetCode && code === targetCode) ||
            (w.warehouseId && w.warehouseId === warehouseId)
          );
        });

        if (entry) {
          entry.actualStock = Math.max(0, (entry.actualStock || 0) + changeQty);
          entry.availableStock = Math.max(0, (entry.availableStock || 0) + changeQty);
        } else if (!isDeduction) {
          prod.stockByWarehouse.push({
            warehouseName: warehouseName || wh?.name || `Kho #${warehouseId}`,
            warehouseCode: wh?.code || `K00${warehouseId}`,
            actualStock: Math.max(0, it.quantity),
            availableStock: Math.max(0, it.quantity),
            costPrice: prod.costPrice || 0,
            standardPrice: prod.standardPrice || 0,
            minSafeStock: 0,
            maxSafeStock: 999999999,
          });
        }

        prod.stockQuantity = prod.stockByWarehouse.reduce(
          (sum: number, w: any) => sum + (Number(w.actualStock) || 0),
          0
        );
        prod.availableQuantity = prod.stockQuantity;
        hasChange = true;
      } else {
        prod.stockQuantity = Math.max(0, (prod.stockQuantity || 0) + changeQty);
        prod.availableQuantity = prod.stockQuantity;
        hasChange = true;
      }
    });

    if (hasChange) {
      localStorage.setItem(GOODS_STORAGE_KEY, JSON.stringify(catalog));
      window.dispatchEvent(new CustomEvent('stockflow_goods_updated'));
    }
  } catch (err) {
    console.warn('Lỗi cập nhật tồn kho catalog:', err);
  }
}

const INITIAL_TRANSFERS: TransferRecord[] = [
  {
    id: 1,
    code: 'CK000001',
    transferDate: '2026-10-27T10:15:00',
    receivedDate: null,
    sourceWarehouseId: 1,
    sourceWarehouseCode: 'K001',
    sourceWarehouseName: 'Kho Tổng Gia Lâm',
    destWarehouseId: 2,
    destWarehouseCode: 'K002',
    destWarehouseName: 'Kho Đông Anh',
    createdBy: 'Nguyễn Văn A',
    status: 'IN_TRANSIT',
    totalQuantity: 150,
    totalReceivedQuantity: null,
    totalAmount: 18500000,
    notes: 'Chuyển gấp cho công trình Vinmec',
    isStarred: true,
  },
  {
    id: 2,
    code: 'CK000002',
    transferDate: '2026-10-26T14:30:00',
    receivedDate: '2026-10-26T17:00:00',
    sourceWarehouseId: 1,
    sourceWarehouseCode: 'K001',
    sourceWarehouseName: 'Kho Tổng Gia Lâm',
    destWarehouseId: 3,
    destWarehouseCode: 'K003',
    destWarehouseName: 'Kho Hà Đông',
    createdBy: 'Trần Thị B',
    status: 'RECEIVED',
    totalQuantity: 80,
    totalReceivedQuantity: 80,
    totalAmount: 9200000,
    notes: 'Điều phối tồn kho định kỳ',
    isStarred: false,
  },
  {
    id: 3,
    code: 'CK000003',
    transferDate: '2026-10-25T09:00:00',
    receivedDate: null,
    sourceWarehouseId: 2,
    sourceWarehouseCode: 'K002',
    sourceWarehouseName: 'Kho Đông Anh',
    destWarehouseId: 4,
    destWarehouseCode: 'K004',
    destWarehouseName: 'Kho Hoàn Kiếm',
    createdBy: 'Phạm Văn D',
    status: 'DRAFT',
    totalQuantity: 45,
    totalReceivedQuantity: null,
    totalAmount: 5100000,
    notes: 'Dự thảo chuyển máng cáp',
    isStarred: false,
  },
];

function getLocalTransfers(): TransferRecord[] {
  if (typeof window === 'undefined') return INITIAL_TRANSFERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_TRANSFERS));
      return INITIAL_TRANSFERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_TRANSFERS;
  } catch {
    return INITIAL_TRANSFERS;
  }
}

function saveLocalTransfers(transfers: TransferRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transfers));
  } catch (err) {
    console.warn('Cannot write local transfers:', err);
  }
}

export const transferService = {
  async getTransfers(filters?: Partial<TransferFilterState>): Promise<TransferRecord[]> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const params = new URLSearchParams();

      if (filters?.sourceWarehouseId && filters.sourceWarehouseId !== 'ALL') {
        params.append('sourceWarehouseId', String(filters.sourceWarehouseId));
      }
      if (filters?.destWarehouseId && filters.destWarehouseId !== 'ALL') {
        params.append('destWarehouseId', String(filters.destWarehouseId));
      }
      if (filters?.statuses && filters.statuses.length > 0) {
        params.append('status', filters.statuses.join(','));
      }
      if (filters?.dateType) {
        params.append('dateType', filters.dateType);
      }
      if (filters?.dateFrom) {
        params.append('fromDate', filters.dateFrom);
      }
      if (filters?.dateTo) {
        params.append('toDate', filters.dateTo);
      }
      if (filters?.search) {
        params.append('search', filters.search.trim());
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get<any[]>(`/api/transfers${queryString}`, token);

      let mapped: TransferRecord[] = [];
      if (Array.isArray(data)) {
        mapped = data.map((t) => {
          const totalQty = typeof t.totalQuantity === 'number' ? t.totalQuantity : 0;
          const totalRecQty = typeof t.totalReceivedQuantity === 'number' ? t.totalReceivedQuantity : null;
          const isMatched = totalRecQty !== null && totalRecQty !== undefined ? totalRecQty === totalQty : null;

          return {
            id: t.stockTransferId || t.id,
            code: t.transferCode || t.code,
            transferDate: t.transferDate,
            receivedDate: t.receivedDate,
            sourceWarehouseId: t.sourceWarehouseId,
            sourceWarehouseCode: t.sourceWarehouseCode || WAREHOUSE_MAPPING[t.sourceWarehouseId]?.code || `K00${t.sourceWarehouseId}`,
            sourceWarehouseName: t.sourceWarehouseName || WAREHOUSE_MAPPING[t.sourceWarehouseId]?.name || `Kho #${t.sourceWarehouseId}`,
            destWarehouseId: t.destWarehouseId,
            destWarehouseCode: t.destWarehouseCode || WAREHOUSE_MAPPING[t.destWarehouseId]?.code || `K00${t.destWarehouseId}`,
            destWarehouseName: t.destWarehouseName || WAREHOUSE_MAPPING[t.destWarehouseId]?.name || `Kho #${t.destWarehouseId}`,
            createdBy: t.createdByName || t.createdBy || 'Nhân viên',
            status: t.status,
            totalQuantity: totalQty,
            totalReceivedQuantity: totalRecQty,
            totalAmount: typeof t.totalAmount === 'number' ? t.totalAmount : 0,
            notes: t.notes,
            isStarred: false,
            isMatched,
          };
        });
      }

      // Luôn hợp nhất (merge) phiếu chuyển từ Backend và phiếu lưu cục bộ để không bao giờ bị mất phiếu vừa tạo
      const localList = getLocalTransfers();
      const merged = [...mapped];
      localList.forEach((localItem) => {
        const existingIdx = merged.findIndex((m) => m.id === localItem.id || m.code === localItem.code);
        if (existingIdx === -1) {
          merged.unshift(localItem);
        } else {
          if (localItem.status === 'RECEIVED' || localItem.status === 'IN_TRANSIT' || localItem.status === 'CANCELLED') {
            merged[existingIdx] = { ...merged[existingIdx], ...localItem };
          }
        }
      });
      saveLocalTransfers(merged);

      let filtered = merged;
      if (filters?.sourceWarehouseId && filters.sourceWarehouseId !== 'ALL') {
        filtered = filtered.filter((t) => t.sourceWarehouseId === filters.sourceWarehouseId);
      }
      if (filters?.destWarehouseId && filters.destWarehouseId !== 'ALL') {
        filtered = filtered.filter((t) => t.destWarehouseId === filters.destWarehouseId);
      }
      if (filters?.statuses && filters.statuses.length > 0) {
        filtered = filtered.filter((t) => filters.statuses!.includes(t.status));
      }
      if (filters?.matchStatus && filters.matchStatus !== 'ALL') {
        filtered = filtered.filter((t) => {
          if (t.status !== 'RECEIVED') return false;
          const matched = t.isMatched ?? (t.totalReceivedQuantity !== null && t.totalReceivedQuantity !== undefined ? t.totalReceivedQuantity === t.totalQuantity : null);
          if (filters.matchStatus === 'MATCHED') return matched === true;
          if (filters.matchStatus === 'UNMATCHED') return matched === false;
          return true;
        });
      }
      if (filters?.dateFrom || filters?.dateTo) {
        const isRecDate = filters.dateType === 'received';
        filtered = filtered.filter((t) => {
          const raw = isRecDate ? t.receivedDate : t.transferDate;
          if (!raw) return false;
          const dStr = raw.substring(0, 10);
          if (filters.dateFrom && dStr < filters.dateFrom) return false;
          if (filters.dateTo && dStr > filters.dateTo) return false;
          return true;
        });
      }
      if (filters?.search) {
        const q = filters.search.trim().toLowerCase();
        filtered = filtered.filter(
          (t) =>
            t.code.toLowerCase().includes(q) ||
            (t.notes && t.notes.toLowerCase().includes(q)) ||
            t.sourceWarehouseName.toLowerCase().includes(q) ||
            t.destWarehouseName.toLowerCase().includes(q)
        );
      }

      return filtered;
    } catch (err) {
      console.warn('API getTransfers failed, falling back to local cache:', err);
    }

    // Fallback filter locally
    let list = getLocalTransfers();

    if (filters?.sourceWarehouseId && filters.sourceWarehouseId !== 'ALL') {
      list = list.filter((t) => t.sourceWarehouseId === filters.sourceWarehouseId);
    }
    if (filters?.destWarehouseId && filters.destWarehouseId !== 'ALL') {
      list = list.filter((t) => t.destWarehouseId === filters.destWarehouseId);
    }
    if (filters?.statuses && filters.statuses.length > 0) {
      list = list.filter((t) => filters.statuses!.includes(t.status));
    }
    if (filters?.matchStatus && filters.matchStatus !== 'ALL') {
      list = list.filter((t) => {
        if (t.status !== 'RECEIVED') return false;
        const matched = t.isMatched ?? (t.totalReceivedQuantity !== null && t.totalReceivedQuantity !== undefined ? t.totalReceivedQuantity === t.totalQuantity : null);
        if (filters.matchStatus === 'MATCHED') return matched === true;
        if (filters.matchStatus === 'UNMATCHED') return matched === false;
        return true;
      });
    }
    if (filters?.dateFrom || filters?.dateTo) {
      const isRecDate = filters.dateType === 'received';
      list = list.filter((t) => {
        const raw = isRecDate ? t.receivedDate : t.transferDate;
        if (!raw) return false;
        const dStr = raw.substring(0, 10);
        if (filters.dateFrom && dStr < filters.dateFrom) return false;
        if (filters.dateTo && dStr > filters.dateTo) return false;
        return true;
      });
    }
    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.code.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q)) ||
          t.sourceWarehouseName.toLowerCase().includes(q) ||
          t.destWarehouseName.toLowerCase().includes(q)
      );
    }

    return list;
  },

  async getTransferById(id: number): Promise<TransferDetail | null> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const data = await apiClient.get<any>(`/api/transfers/${id}`, token);
      if (data) {
        return {
          id: data.stockTransferId || data.id,
          code: data.transferCode || data.code,
          transferDate: data.transferDate,
          receivedDate: data.receivedDate,
          sourceWarehouseId: data.sourceWarehouseId,
          sourceWarehouseCode: data.sourceWarehouseCode || `K00${data.sourceWarehouseId}`,
          sourceWarehouseName: data.sourceWarehouseName,
          destWarehouseId: data.destWarehouseId,
          destWarehouseCode: data.destWarehouseCode || `K00${data.destWarehouseId}`,
          destWarehouseName: data.destWarehouseName,
          createdBy: data.createdByName || data.createdBy || 'Nhân viên',
          status: data.status,
          totalQuantity: data.totalQuantity || 0,
          totalReceivedQuantity: data.totalReceivedQuantity,
          totalAmount: data.totalAmount || 0,
          notes: data.notes,
          isStarred: false,
          items: (data.items || []).map((it: any) => ({
            id: it.transferItemId || it.id,
            productId: it.productId,
            productCode: it.productCode,
            productName: it.productName,
            unitName: it.unitName || 'Cái',
            sourceStock: it.sourceStock || 0,
            destStock: it.destStock || 0,
            transferQuantity: it.transferQuantity || it.quantity || 0,
            receivedQuantity: it.receivedQuantity,
            transferPrice: it.transferPrice || 0,
            lineTotal: it.lineTotal || 0,
            notes: it.notes,
          })),
        };
      }
    } catch (err) {
      console.warn('API getTransferById failed, fallback to local search:', err);
    }

    const localList = getLocalTransfers();
    const found = localList.find((t) => t.id === id);
    if (!found) return null;

    if ((found as any).items && Array.isArray((found as any).items) && (found as any).items.length > 0) {
      return found as TransferDetail;
    }

    return {
      ...found,
      items: [
        {
          productId: 1,
          productCode: 'TP-MC200',
          productName: 'Máng cáp 200x100x1.5mm sơn tĩnh điện',
          unitName: 'Cây',
          sourceStock: 120,
          destStock: 30,
          transferQuantity: 20,
          receivedQuantity: found.status === 'RECEIVED' ? 20 : null,
          transferPrice: 185000,
          lineTotal: 3700000,
        },
        {
          productId: 2,
          productCode: 'TP-KC150',
          productName: 'Khay cáp 150x75x1.2mm tôn ZAM',
          unitName: 'Cây',
          sourceStock: 80,
          destStock: 15,
          transferQuantity: 15,
          receivedQuantity: found.status === 'RECEIVED' ? 15 : null,
          transferPrice: 140000,
          lineTotal: 2100000,
        },
      ],
    };
  },

  async getProductsForTransfer(
    sourceWarehouseId: number,
    destWarehouseId?: number,
    search?: string
  ): Promise<ProductForTransfer[]> {
    // 1. Đọc danh mục hàng hóa lưu ở LocalStorage (đồng bộ với màn hình Danh mục hàng hóa)
    let catalogItems: any[] = [];
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(GOODS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            catalogItems = parsed;
          }
        }
      } catch (e) {
        console.warn('Lỗi đọc danh mục hàng hóa từ localStorage:', e);
      }
    }

    // 2. Gọi API Backend lấy tồn kho từ CSDL
    let apiProducts: ProductForTransfer[] = [];
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const params = new URLSearchParams();
      params.append('sourceWarehouseId', String(sourceWarehouseId));
      if (destWarehouseId) params.append('destWarehouseId', String(destWarehouseId));
      if (search) params.append('search', search.trim());

      const data = await apiClient.get<any[]>(`/api/transfers/products-for-transfer?${params.toString()}`, token);
      if (Array.isArray(data)) {
        apiProducts = data.map((p) => ({
          productId: p.productId,
          productCode: p.productCode,
          productName: p.productName,
          unitName: p.unitName || 'Cái',
          costPrice: p.costPrice || 0,
          standardPrice: p.standardPrice || 0,
          sourceStock: p.sourceStock || 0,
          destStock: p.destStock || 0,
        }));
      }
    } catch (err) {
      console.warn('API getProductsForTransfer failed, fallback to local/catalog:', err);
    }

    // 3. Map sản phẩm từ LocalStorage Goods Catalog sang cấu trúc ProductForTransfer
    const catalogProds: ProductForTransfer[] = catalogItems.map((cat, idx) => {
      const srcStock = getStockFromCatalogItem(cat, sourceWarehouseId);
      const dstStock = destWarehouseId ? getStockFromCatalogItem(cat, destWarehouseId) : 0;
      const numId = cat.productId || (Number(cat.id) ? Number(cat.id) : 1000 + idx);

      return {
        productId: numId,
        productCode: cat.code || `SP${String(idx + 1).padStart(6, '0')}`,
        productName: cat.name || 'Sản phẩm',
        unitName: cat.uom || 'Cái',
        costPrice: typeof cat.costPrice === 'number' ? cat.costPrice : 0,
        standardPrice: typeof cat.standardPrice === 'number' ? cat.standardPrice : 0,
        sourceStock: srcStock,
        destStock: dstStock,
      };
    });

    // 4. Hợp nhất (Merge) API và Catalog
    const mergedMap = new Map<string, ProductForTransfer>();

    // Đưa danh mục hàng hóa vào map trước
    catalogProds.forEach((cp) => {
      mergedMap.set(cp.productCode.toUpperCase(), cp);
    });

    // Bổ sung hoặc ghi đè thông tin từ API
    apiProducts.forEach((ap) => {
      const key = ap.productCode.toUpperCase();
      const existing = mergedMap.get(key);
      if (existing) {
        mergedMap.set(key, {
          ...ap,
          unitName: existing.unitName || ap.unitName,
          costPrice: existing.costPrice > 0 ? existing.costPrice : ap.costPrice,
          standardPrice: existing.standardPrice > 0 ? existing.standardPrice : ap.standardPrice,
          sourceStock: existing.sourceStock !== 0 ? existing.sourceStock : ap.sourceStock,
          destStock: destWarehouseId ? (existing.destStock !== 0 ? existing.destStock : ap.destStock) : 0,
        });
      } else {
        mergedMap.set(key, ap);
      }
    });

    let result = Array.from(mergedMap.values());

    // 5. Nếu cả 2 nguồn đều trống, cung cấp sản phẩm mẫu ban đầu
    if (result.length === 0) {
      result = [
        {
          productId: 1,
          productCode: 'TP-MC200',
          productName: 'Máng cáp 200x100x1.5mm sơn tĩnh điện',
          unitName: 'Cây',
          costPrice: 185000,
          standardPrice: 220000,
          sourceStock: 150,
          destStock: destWarehouseId ? 25 : 0,
        },
        {
          productId: 2,
          productCode: 'TP-KC150',
          productName: 'Khay cáp 150x75x1.2mm tôn ZAM',
          unitName: 'Cây',
          costPrice: 140000,
          standardPrice: 165000,
          sourceStock: 95,
          destStock: destWarehouseId ? 10 : 0,
        },
        {
          productId: 3,
          productCode: 'TP-TC100',
          productName: 'Thang cáp 100x50x1.2mm mạ kẽm nhúng nóng',
          unitName: 'Cây',
          costPrice: 210000,
          standardPrice: 250000,
          sourceStock: 60,
          destStock: destWarehouseId ? 5 : 0,
        },
        {
          productId: 4,
          productCode: 'TP-PK01',
          productName: 'Co vuông 90 độ cho máng cáp 200x100',
          unitName: 'Cái',
          costPrice: 45000,
          standardPrice: 65000,
          sourceStock: 300,
          destStock: destWarehouseId ? 50 : 0,
        },
        {
          productId: 5,
          productCode: 'TP-PK02',
          productName: 'Tê máng cáp (Ngã 3) 200x100',
          unitName: 'Cái',
          costPrice: 65000,
          standardPrice: 90000,
          sourceStock: 80,
          destStock: 0,
        },
      ];
    }

    // 6. Lọc theo từ khóa tìm kiếm (search)
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (p) => p.productCode.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q)
      );
    }

    return result;
  },

  async createTransfer(payload: {
    transferCode?: string;
    sourceWarehouseId: number;
    destWarehouseId: number;
    transferDate?: string;
    notes?: string;
    status: 'DRAFT' | 'IN_TRANSIT';
    items: {
      productId: number;
      quantity: number;
      transferPrice?: number;
      notes?: string;
    }[];
  }): Promise<TransferDetail> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    let res: any = null;

    try {
      res = await apiClient.post<any>('/api/transfers', payload, token);
    } catch (err) {
      console.warn('API createTransfer fallback locally:', err);
    }

    const localList = getLocalTransfers();
    const nextId = localList.length > 0 ? Math.max(...localList.map((t) => t.id)) + 1 : 1;
    const nextCode = payload.transferCode?.trim() || `CK${String(nextId).padStart(6, '0')}`;

    const sourceInfo = WAREHOUSE_MAPPING[payload.sourceWarehouseId] || { code: `K00${payload.sourceWarehouseId}`, name: `Kho #${payload.sourceWarehouseId}` };
    const destInfo = WAREHOUSE_MAPPING[payload.destWarehouseId] || { code: `K00${payload.destWarehouseId}`, name: `Kho #${payload.destWarehouseId}` };

    const itemsDetail: TransferItem[] = payload.items.map((it, idx) => ({
      id: idx + 1,
      productId: it.productId,
      productCode: `SP-${it.productId}`,
      productName: `Sản phẩm #${it.productId}`,
      unitName: 'Cái',
      sourceStock: 0,
      destStock: 0,
      transferQuantity: it.quantity,
      receivedQuantity: null,
      transferPrice: it.transferPrice || 100000,
      lineTotal: it.quantity * (it.transferPrice || 100000),
      notes: it.notes,
    }));

    // Bổ sung thông tin chi tiết từ Catalog nếu có
    if (typeof window !== 'undefined') {
      try {
        const rawCat = localStorage.getItem(GOODS_STORAGE_KEY);
        if (rawCat) {
          const cat = JSON.parse(rawCat);
          if (Array.isArray(cat)) {
            itemsDetail.forEach((d) => {
              const matched = cat.find((c) => c.productId === d.productId || c.id === String(d.productId) || Number(c.id) === d.productId);
              if (matched) {
                d.productCode = matched.code || d.productCode;
                d.productName = matched.name || d.productName;
                d.unitName = matched.uom || d.unitName;
                d.sourceStock = getStockFromCatalogItem(matched, payload.sourceWarehouseId);
                d.destStock = getStockFromCatalogItem(matched, payload.destWarehouseId);
              }
            });
          }
        }
      } catch {}
    }

    const newRecord: TransferDetail = {
      id: res?.stockTransferId || nextId,
      code: res?.transferCode || nextCode,
      transferDate: res?.transferDate || payload.transferDate || `${toLocalDatetimeInputString(new Date())}:00`,
      receivedDate: null,
      sourceWarehouseId: payload.sourceWarehouseId,
      sourceWarehouseCode: sourceInfo.code,
      sourceWarehouseName: sourceInfo.name,
      destWarehouseId: payload.destWarehouseId,
      destWarehouseCode: destInfo.code,
      destWarehouseName: destInfo.name,
      createdBy: 'Quản trị viên',
      status: payload.status,
      totalQuantity: payload.items.reduce((s, it) => s + it.quantity, 0),
      totalReceivedQuantity: null,
      totalAmount: payload.items.reduce((s, it) => s + it.quantity * (it.transferPrice || 100000), 0),
      notes: payload.notes,
      isStarred: false,
      items: itemsDetail,
    };

    saveLocalTransfers([newRecord, ...localList]);

    // Giai đoạn 1: Khi Hoàn thành (IN_TRANSIT) -> Trừ ngay tồn kho nguồn
    if (payload.status === 'IN_TRANSIT') {
      adjustCatalogStock(
        payload.sourceWarehouseId,
        payload.items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          productCode: itemsDetail.find((d) => d.productId === it.productId)?.productCode,
        })),
        true,
        sourceInfo.name
      );
    }

    return newRecord;
  },

  async completeTransfer(id: number): Promise<boolean> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      await apiClient.post<any>(`/api/transfers/${id}/complete`, {}, token);
    } catch (err) {
      console.warn('API completeTransfer failed, updating locally:', err);
    }

    const localList = getLocalTransfers();
    const idx = localList.findIndex((t) => t.id === id);
    if (idx !== -1) {
      localList[idx].status = 'IN_TRANSIT';
      localList[idx].transferDate = new Date().toISOString();
      if ((localList[idx] as any).items) {
        adjustCatalogStock(
          localList[idx].sourceWarehouseId,
          (localList[idx] as any).items.map((it: any) => ({
            productId: it.productId,
            quantity: it.transferQuantity,
            productCode: it.productCode,
          })),
          true,
          localList[idx].sourceWarehouseName
        );
      }
      saveLocalTransfers([...localList]);
    }
    return true;
  },

  async updateTransfer(
    id: number,
    payload: {
      destWarehouseId?: number;
      notes?: string;
      items?: any[];
    }
  ): Promise<boolean> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      await apiClient.put<any>(`/api/transfers/${id}`, payload, token);
    } catch (err) {
      console.warn('API updateTransfer failed, updating locally:', err);
    }

    const localList = getLocalTransfers();
    const idx = localList.findIndex((t) => t.id === id);
    if (idx !== -1) {
      if (payload.notes !== undefined) localList[idx].notes = payload.notes;
      if (payload.destWarehouseId) {
        localList[idx].destWarehouseId = payload.destWarehouseId;
        const wh = WAREHOUSE_MAPPING[payload.destWarehouseId];
        if (wh) {
          localList[idx].destWarehouseName = wh.name;
          localList[idx].destWarehouseCode = wh.code;
        }
      }
      saveLocalTransfers([...localList]);
    }
    return true;
  },

  async receiveTransfer(
    id: number,
    payload: {
      receivedDate?: string;
      notes?: string;
      items?: { productId: number; receivedQuantity: number; transferItemId?: number }[];
    }
  ): Promise<boolean> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      await apiClient.post<any>(`/api/transfers/${id}/receive`, payload, token);
    } catch (err) {
      console.warn('API receiveTransfer failed, updating locally:', err);
    }

    const localList = getLocalTransfers();
    const idx = localList.findIndex((t) => t.id === id);
    if (idx !== -1) {
      localList[idx].status = 'RECEIVED';
      localList[idx].receivedDate = payload.receivedDate || `${toLocalDatetimeInputString(new Date())}:00`;
      if (payload.notes) {
        localList[idx].notes = localList[idx].notes
          ? `${localList[idx].notes} | [Nhận hàng]: ${payload.notes}`
          : `[Nhận hàng]: ${payload.notes}`;
      }
      if (payload.items) {
        const totalRec = payload.items.reduce((s, it) => s + it.receivedQuantity, 0);
        localList[idx].totalReceivedQuantity = totalRec;
        // Đánh dấu cờ IsMatched (Tình trạng nhận hàng: Khớp / Không khớp)
        const isMatched = totalRec === (localList[idx].totalQuantity || 0);
        localList[idx].isMatched = isMatched;

        if ((localList[idx] as any).items) {
          (localList[idx] as any).items.forEach((it: any) => {
            const r = payload.items?.find((p) => p.productId === it.productId);
            if (r) it.receivedQuantity = r.receivedQuantity;
          });
        }
        // Giai đoạn 2 (Quy tắc 1): Khi Nhận hàng -> CHỈ cộng đúng SL_Nhận vào kho đích
        adjustCatalogStock(
          localList[idx].destWarehouseId,
          payload.items.map((it) => ({
            productId: it.productId,
            quantity: it.receivedQuantity,
            productCode: (localList[idx] as any).items?.find((item: any) => item.productId === it.productId)?.productCode,
          })),
          false,
          localList[idx].destWarehouseName
        );
      }
      saveLocalTransfers([...localList]);
    }
    return true;
  },

  async cancelTransfer(id: number, reason?: string): Promise<boolean> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      await apiClient.post<any>(`/api/transfers/${id}/cancel`, { reason }, token);
    } catch (err) {
      console.warn('API cancelTransfer failed, updating locally:', err);
    }

    const localList = getLocalTransfers();
    const idx = localList.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const record = localList[idx];
      const oldStatus = record.status;
      record.status = 'CANCELLED';
      if (reason) {
        record.notes = record.notes ? `${record.notes} | [Lý do hủy]: ${reason}` : `[Lý do hủy]: ${reason}`;
      }

      // Rollback tồn kho theo Quy tắc 2 (Logic Hủy phiếu / Rollback)
      let items = (record as any).items;
      if (!items || items.length === 0) {
        const detail = await this.getTransferById(id).catch(() => null);
        if (detail?.items) {
          items = detail.items;
        }
      }

      if (items && items.length > 0) {
        // TRƯỜNG HỢP 1: Hủy khi Đang chuyển (IN_TRANSIT)
        // -> Hoàn trả SL_Chuyển vào tồn kho Chi nhánh chuyển (Stock_Source += SL_Chuyển)
        if (oldStatus === 'IN_TRANSIT') {
          adjustCatalogStock(
            record.sourceWarehouseId,
            items.map((it: any) => ({
              productId: it.productId,
              quantity: it.transferQuantity || it.quantity || 0,
              productCode: it.productCode,
            })),
            false, // Cộng lại kho chuyển
            record.sourceWarehouseName
          );
        }
        // TRƯỜNG HỢP 2: Hủy khi Đã nhận (RECEIVED)
        // -> Trừ ngược SL_Nhận khỏi kho nhận (Stock_Dest -= SL_Nhận)
        // -> Hoàn trả SL_Chuyển vào kho chuyển (Stock_Source += SL_Chuyển)
        else if (oldStatus === 'RECEIVED') {
          // 1. Trừ ngược SL_Nhận khỏi kho nhận
          adjustCatalogStock(
            record.destWarehouseId,
            items.map((it: any) => ({
              productId: it.productId,
              quantity: it.receivedQuantity !== undefined && it.receivedQuantity !== null ? it.receivedQuantity : (it.transferQuantity || 0),
              productCode: it.productCode,
            })),
            true, // Trừ ngược kho nhận
            record.destWarehouseName
          );

          // 2. Cộng hoàn trả SL_Chuyển cho kho chuyển
          adjustCatalogStock(
            record.sourceWarehouseId,
            items.map((it: any) => ({
              productId: it.productId,
              quantity: it.transferQuantity || it.quantity || 0,
              productCode: it.productCode,
            })),
            false, // Hoàn trả kho chuyển
            record.sourceWarehouseName
          );
        }
      }

      saveLocalTransfers([...localList]);
    }
    return true;
  },

  toggleStar(id: number): boolean {
    const localList = getLocalTransfers();
    const idx = localList.findIndex((t) => t.id === id);
    if (idx !== -1) {
      localList[idx].isStarred = !localList[idx].isStarred;
      saveLocalTransfers([...localList]);
      return localList[idx].isStarred ?? false;
    }
    return false;
  },
};
