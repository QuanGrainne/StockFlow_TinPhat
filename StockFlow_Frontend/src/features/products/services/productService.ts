// src/features/products/services/productService.ts
// Service kết nối API Danh mục Hàng hóa (.NET 9 CQRS)

import { apiClient } from '@/lib/api/client';

export interface BackendProduct {
  id: string;
  productId: number;
  code: string;
  name: string;
  type: string;
  categoryId: number;
  categoryName: string;
  baseUnitId: number;
  uom: string;
  standardPrice: number;
  costPrice: number;
  reorderPoint: number;
  stockQuantity: number;
  status: string;
  barcode?: string | null;
  brand?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

/** Nhóm hàng (GET /api/Products/categories → ProductCategoryDto) */
export interface BackendProductCategory {
  categoryId: number;
  categoryName: string;
  description?: string | null;
  isActive: boolean;
  /** Tổng số hàng hóa thuộc nhóm (kể cả ngừng kinh doanh) */
  productCount: number;
  /** Số hàng hóa đang kinh doanh (API cũ chưa có trường này) */
  activeProductCount?: number;
}

export const productService = {
  /** Danh sách nhóm hàng kèm số lượng hàng hóa trong nhóm */
  async getCategories(): Promise<BackendProductCategory[]> {
    const data = await apiClient.get<BackendProductCategory[]>('/api/Products/categories');
    return Array.isArray(data) ? data : [];
  },

  /**
   * Lấy danh sách hàng hóa từ CSDL (hỗ trợ tìm kiếm, lọc theo kho để lấy đúng tồn kho và giá vốn tại kho đó)
   */
  async getProducts(params?: {
    search?: string;
    warehouseId?: number;
    categoryId?: number;
    type?: string;
    status?: string;
    lowStockOnly?: boolean;
  }): Promise<BackendProduct[]> {
    try {
      const query = new URLSearchParams();
      if (params?.search && params.search.trim()) {
        query.append('search', params.search.trim());
      }
      if (params?.warehouseId && params.warehouseId > 0) {
        query.append('warehouseId', String(params.warehouseId));
      }
      if (params?.categoryId && params.categoryId > 0) {
        query.append('categoryId', String(params.categoryId));
      }
      if (params?.type && params.type !== 'ALL') {
        query.append('type', params.type);
      }
      if (params?.status && params.status !== 'ALL') {
        query.append('status', params.status);
      }
      if (params?.lowStockOnly) {
        query.append('lowStockOnly', 'true');
      }

      const qs = query.toString() ? `?${query.toString()}` : '';
      const data = await apiClient.get<BackendProduct[]>(`/api/products${qs}`);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error('Lỗi khi tải danh mục hàng hóa:', err);
      throw err;
    }
  },

  /**
   * Lấy chi tiết thông tin 1 hàng hóa kèm tồn kho phân bổ từng kho
   */
  async getProductById(id: number | string): Promise<any> {
    try {
      return await apiClient.get<any>(`/api/products/${id}`);
    } catch (err) {
      console.error(`Lỗi khi lấy chi tiết hàng hóa #${id}:`, err);
      throw err;
    }
  },

  /**
   * Thêm mới nhanh một mặt hàng
   */
  async createProduct(payload: {
    code?: string;
    name: string;
    type?: string;
    uom?: string;
    costPrice?: number;
    standardPrice?: number;
  }): Promise<BackendProduct> {
    try {
      return await apiClient.post<BackendProduct>('/api/products', payload);
    } catch (err) {
      console.error('Lỗi khi thêm mới hàng hóa:', err);
      throw err;
    }
  },
};
