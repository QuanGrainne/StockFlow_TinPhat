import { apiClient } from '@/lib/api/client';
import {
  PriceBook,
  PriceBookMatrixResult,
  CreatePriceBookPayload,
  UpdatePriceBookPayload,
  UpdateProductPriceItemPayload,
  PriceBookCustomerRef,
  PriceBookWarehouseOption,
} from '../types';

export const priceBookService = {
  /** Chi nhánh đang hoạt động (dữ liệu thật /api/warehouses) cho phạm vi "Chi nhánh cụ thể" */
  async getActiveWarehouses(): Promise<PriceBookWarehouseOption[]> {
    const data = await apiClient.get<PriceBookWarehouseOption[]>('/api/warehouses');
    return (Array.isArray(data) ? data : []).filter((w) => w.status === 'ACTIVE');
  },

  /** Gợi ý khách hàng cho phạm vi "Khách hàng cụ thể" (mã, tên, điện thoại) */
  async searchCustomers(search: string): Promise<PriceBookCustomerRef[]> {
    const q = new URLSearchParams();
    if (search.trim()) q.append('search', search.trim());
    const data = await apiClient.get<PriceBookCustomerRef[]>(`/api/price-books/customer-options?${q.toString()}`);
    return Array.isArray(data) ? data : [];
  },

  async getPriceBooks(params?: {
    search?: string;
    isActive?: boolean;
    warehouseId?: number;
  }): Promise<PriceBook[]> {
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.isActive !== undefined) q.append('isActive', String(params.isActive));
    if (params?.warehouseId) q.append('warehouseId', String(params.warehouseId));

    const qs = q.toString();
    return apiClient.get<PriceBook[]>(`/api/price-books${qs ? `?${qs}` : ''}`);
  },

  async getPriceBookById(id: number): Promise<PriceBook> {
    return apiClient.get<PriceBook>(`/api/price-books/${id}`);
  },

  async createPriceBook(payload: CreatePriceBookPayload): Promise<PriceBook> {
    return apiClient.post<PriceBook>('/api/price-books', payload);
  },

  async updatePriceBook(id: number, payload: UpdatePriceBookPayload): Promise<PriceBook> {
    return apiClient.put<PriceBook>(`/api/price-books/${id}`, payload);
  },

  async deletePriceBook(id: number): Promise<void> {
    return apiClient.delete<void>(`/api/price-books/${id}`);
  },

  async getPriceMatrix(params: {
    warehouseId?: number;
    search?: string;
    categoryId?: number;
    stockCondition?: string;
    priceBookIds?: number[];
    page?: number;
    pageSize?: number;
  }): Promise<PriceBookMatrixResult> {
    const q = new URLSearchParams();
    if (params.warehouseId) q.append('warehouseId', String(params.warehouseId));
    if (params.search) q.append('search', params.search);
    if (params.categoryId) q.append('categoryId', String(params.categoryId));
    if (params.stockCondition) q.append('stockCondition', params.stockCondition);
    if (params.priceBookIds && params.priceBookIds.length > 0) {
      q.append('priceBookIds', params.priceBookIds.join(','));
    }
    if (params.page) q.append('page', String(params.page));
    if (params.pageSize) q.append('pageSize', String(params.pageSize));

    const qs = q.toString();
    return apiClient.get<PriceBookMatrixResult>(`/api/price-books/matrix${qs ? `?${qs}` : ''}`);
  },

  async updatePrices(id: number, items: UpdateProductPriceItemPayload[]): Promise<{ success: boolean; message: string }> {
    return apiClient.put<{ success: boolean; message: string }>(`/api/price-books/${id}/prices`, items);
  },

  async applyFormula(
    id: number,
    options?: { categoryIds?: number[]; allProducts?: boolean }
  ): Promise<{ success: boolean; message: string }> {
    return apiClient.post<{ success: boolean; message: string }>(
      `/api/price-books/${id}/apply-formula`,
      options || {}
    );
  },
};
