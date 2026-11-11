// src/features/roles/services/productService.ts
// Service kết nối API Danh mục Hàng hóa (Products) với backend ASP.NET Core & MediatR

import { apiClient } from '@/lib/api/client';
import { Product, ProductAttributeDef, ProductUnitConversion, ProductVariant } from '@/features/admin/types';

export interface CreateProductPayload {
  code: string;
  name: string;
  type: string;
  categoryId?: number;
  categoryName?: string;
  baseUnitId?: number;
  uom?: string;
  standardPrice?: number;
  costPrice?: number;
  minSafeStock?: number;
  maxSafeStock?: number;
  barcode?: string;
  brand?: string;
  weight?: number;
  dimensions?: string;
  locationName?: string;
  isDirectSale?: boolean;
  hasRewardPoints?: boolean;
  imageUrl?: string;
  variantsJson?: string;
  description?: string;
  initialStock?: number;
  initialWarehouseId?: number;
  units?: ProductUnitConversion[];
  attributes?: ProductAttributeDef[];
  variants?: ProductVariant[];
  createdAt?: string;
  supplier?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  isActive?: boolean;
}

export interface ProductCategoryItem {
  id: number;
  code: string;
  name: string;
}


export interface ImportProductItemPayload {
  code: string;
  name: string;
  type?: string;
  categoryName?: string;
  brand?: string;
  uom?: string;
  standardPrice?: number;
  costPrice?: number;
  stockQuantity?: number;
  minSafeStock?: number;
  maxSafeStock?: number;
  barcode?: string;
  description?: string;
  weight?: number;
  locationName?: string;
  imageUrl?: string;
  isActive?: boolean;
  isDirectSale?: boolean;
  supplier?: string;
  warehouseName?: string;
}

export interface ImportProductsPayload {
  products: ImportProductItemPayload[];
  duplicateCodeAction?: 'ERROR' | 'REPLACE_NAME';
  updateStock?: boolean;
  updateCostPrice?: boolean;
  updateDescription?: boolean;
  targetWarehouse?: string;
}

export interface ImportProductsResult {
  importedCount: number;
  updatedCount: number;
  totalCount: number;
  message: string;
  products: Product[];
}
export interface ProductUnitItem {
  id: number;
  code: string;
  name: string;
}

/** Nhập thêm (ADD) hoặc cân chỉnh (SET) tồn kho tại 1 kho */
export interface AdjustProductStockPayload {
  warehouseId: number;
  quantity: number;
  mode: 'ADD' | 'SET';
  note?: string;
}

export interface ProductStockAdjustmentResult {
  productId: number;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  unitCost: number;
  /** Mã phiếu kiểm kho tự tạo (KK...) khi tồn kho thay đổi */
  stocktakeCode?: string | null;
}

/** 1 dòng thẻ kho (GET /api/Products/{id}/stock-card?warehouseId=) — mới nhất trước */
export interface StockCardEntry {
  transactionId: number;
  /** PN… nhập hàng, HD… bán hàng, THN… trả hàng nhập, CK… chuyển hàng, KK… kiểm kho, CB… cập nhật giá vốn */
  documentCode: string;
  referenceType: string | null;
  referenceId: number | null;
  /** Id chứng từ để mở phiếu (HD theo id hóa đơn); null nếu không mở được (CB…) */
  documentId: number | null;
  transactionDate: string | null;
  transactionType: string;
  transactionTypeName: string;
  /** Giá GD; null khi chỉ sửa giá vốn / kiểm kho */
  transactionPrice: number | null;
  /** Giá vốn sau giao dịch; dòng cũ có thể null */
  unitCost: number | null;
  quantity: number;
  endingBalance: number;
  partnerName: string | null;
}

export const productService = {
  /** Thẻ kho của hàng hóa tại 1 chi nhánh (chỉ xem) */
  getStockCard(id: number | string, warehouseId: number): Promise<StockCardEntry[]> {
    return apiClient.get<StockCardEntry[]>(`/api/Products/${id}/stock-card?warehouseId=${warehouseId}`);
  },

  /** Điều chỉnh tồn kho thật trong DB (ghi thẻ kho, giữ nguyên giá vốn) */
  adjustStock(id: number | string, payload: AdjustProductStockPayload): Promise<ProductStockAdjustmentResult> {
    return apiClient.post<ProductStockAdjustmentResult>(`/api/Products/${id}/stock-adjustments`, payload);
  },

  async getProducts(params?: {
    search?: string;
    type?: string;
    categoryId?: number;
    warehouseId?: number;
    lowStockOnly?: boolean;
    status?: string;
  }): Promise<Product[]> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.type && params.type !== 'ALL') query.append('type', params.type);
      if (params?.categoryId) query.append('categoryId', params.categoryId.toString());
      if (params?.warehouseId) query.append('warehouseId', params.warehouseId.toString());
      if (params?.lowStockOnly) query.append('lowStockOnly', 'true');
      if (params?.status) query.append('status', params.status);

      const qs = query.toString() ? `?${query.toString()}` : '';
      const data = await apiClient.get<Product[]>(`/api/Products${qs}`, token);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn('API getProducts failed (offline or unauthorized), using local cached data:', e);
    }
    return [];
  },

  async getProductById(id: number | string): Promise<Product | null> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      return await apiClient.get<Product>(`/api/Products/${id}`, token);
    } catch (e) {
      console.error('API getProductById failed:', e);
      return null;
    }
  },

  async createProduct(payload: CreateProductPayload): Promise<Product> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      return await apiClient.post<Product>('/api/Products', payload, token);
    } catch (e) {
      console.warn('API createProduct failed, falling back to local persistence:', e);
      throw e;
    }
  },

  async updateProduct(id: number | string, payload: UpdateProductPayload): Promise<Product> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      return await apiClient.put<Product>(`/api/Products/${id}`, payload, token);
    } catch (e) {
      console.warn('API updateProduct failed, falling back to local persistence:', e);
      throw e;
    }
  },

  /** Đảo trạng thái kinh doanh; trả về trạng thái mới (true = đang kinh doanh) */
  async toggleProductStatus(id: number | string): Promise<boolean> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    const res = await apiClient.patch<{ isActive: boolean }>(`/api/Products/${id}/toggle-status`, undefined, token);
    return res.isActive;
  },

  async deleteProduct(id: number | string): Promise<boolean> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      await apiClient.delete(`/api/Products/${id}`, token);
      return true;
    } catch (e) {
      console.warn('API deleteProduct failed:', e);
      throw e;
    }
  },

  async getCategories(): Promise<ProductCategoryItem[]> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      return await apiClient.get<ProductCategoryItem[]>('/api/Products/categories', token);
    } catch (e) {
      console.warn('API getCategories failed:', e);
      return [];
    }
  },
  async createCategory(payload: { categoryName: string; description?: string }): Promise<ProductCategoryItem> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    return await apiClient.post<ProductCategoryItem>('/api/Products/categories', payload, token);
  },

  async getUnits(): Promise<ProductUnitItem[]> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      return await apiClient.get<ProductUnitItem[]>('/api/Products/units', token);
    } catch (e) {
      console.warn('API getUnits failed:', e);
      return [];
    }
  },

  async importProducts(payload: ImportProductsPayload): Promise<ImportProductsResult> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      return await apiClient.post<ImportProductsResult>('/api/Products/import', payload, token);
    } catch (e) {
      console.error('API importProducts failed:', e);
      throw e;
    }
  },
};
