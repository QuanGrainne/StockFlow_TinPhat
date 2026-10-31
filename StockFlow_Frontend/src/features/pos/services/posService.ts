// src/features/pos/services/posService.ts
// Service tương tác API sản phẩm, khách hàng, đơn hàng POS với backend

import { apiClient } from '@/lib/api/client';
import { PosProduct, PosCustomer, PosCategory, PosOrderTab } from '../types';

export const posService = {
  /**
   * Lấy danh sách sản phẩm từ backend
   */
  async getProducts(search?: string, categoryId?: number): Promise<PosProduct[]> {
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      if (categoryId && categoryId > 0) {
        params.append('categoryId', categoryId.toString());
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get<any[]>(`/api/products${qs}`);

      if (Array.isArray(data)) {
        return data.map((item) => ({
          id: String(item.id || item.productId),
          productId: Number(item.productId || item.id),
          code: item.code || '',
          name: item.name || '',
          type: item.type || 'FINISHED',
          categoryId: Number(item.categoryId) || 0,
          categoryName: item.categoryName || '',
          baseUnitId: Number(item.baseUnitId) || 8,
          uom: item.uom || 'Cái',
          standardPrice: Number(item.standardPrice) || 0,
          costPrice: Number(item.costPrice) || 0,
          stockQuantity: Number(item.stockQuantity) || 0,
          status: item.status || 'ACTIVE',
          barcode: item.barcode || null,
          brand: item.brand || null,
          minSafeStock: item.minSafeStock ? Number(item.minSafeStock) : null,
          imageUrl: item.imageUrl || null,
          description: item.description || null,
        }));
      }
      return [];
    } catch (e) {
      console.error('Lỗi khi tải sản phẩm POS:', e);
      return [];
    }
  },

  /**
   * Lấy danh mục sản phẩm từ backend
   */
  async getCategories(): Promise<PosCategory[]> {
    try {
      const data = await apiClient.get<any[]>('/api/products/categories');
      if (Array.isArray(data)) {
        return data.map((c) => ({
          categoryId: Number(c.categoryId || c.id),
          categoryName: c.categoryName || c.name || '',
          description: c.description || '',
        }));
      }
      return [];
    } catch (e) {
      console.error('Lỗi khi tải danh mục POS:', e);
      return [];
    }
  },

  /**
   * Lấy danh sách khách hàng từ backend
   */
  async getCustomers(search?: string): Promise<PosCustomer[]> {
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get<any[]>(`/api/customers${qs}`);

      if (Array.isArray(data)) {
        return data.map((cust) => ({
          id: Number(cust.partnerId || cust.id),
          partnerId: Number(cust.partnerId || cust.id),
          code: cust.code || '',
          name: cust.name || '',
          phone: cust.phone || '',
          email: cust.email || '',
          address: cust.address || '',
          creditLimit: Number(cust.creditLimit) || 0,
          currentDebt: Number(cust.currentDebt) || 0,
          isOverCreditLimit: Boolean(cust.isOverCreditLimit),
          taxCode: cust.code === 'KH00892' ? '0108924192' : undefined,
          salesRep: cust.code === 'KH00892' ? 'Trần Minh Tuấn' : 'Thu ngân quầy',
        }));
      }
      return [];
    } catch (e) {
      console.error('Lỗi khi tải khách hàng POS:', e);
      return [];
    }
  },

  /**
   * Gửi đơn hàng POS lên backend
   */
  async createPosOrder(order: PosOrderTab, statusOverride?: 'COMPLETED' | 'DRAFT'): Promise<any> {
    const subTotal = order.items.reduce((sum, item) => sum + item.total, 0);
    const finalTotal = Math.max(0, subTotal - (order.discountAmount || 0));

    const payload = {
      partnerId: order.selectedCustomer?.id || 9,
      warehouseId: order.warehouseId || 3,
      paymentMethod: order.paymentMethod,
      totalAmount: Math.round(finalTotal),
      paidAmount: order.prepaidAmount,
      discountAmount: order.discountAmount || 0,
      vatAmount: 0,
      deliveryFee: 0,
      deliveryType: 'COUNTER',
      notes: order.notes,
      status: statusOverride || 'COMPLETED',
      issueStockNow: (statusOverride || 'COMPLETED') === 'COMPLETED',
      items: order.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitId: i.unitId,
        unitPrice: i.unitPrice,
        discountPercent: 0,
        discountAmount: 0,
      })),
    };

    return await apiClient.post('/api/orders/pos', payload);
  },

  /**
   * Lấy lịch sử các đơn hàng POS gần đây
   */
  async getRecentOrders(): Promise<any[]> {
    try {
      return await apiClient.get<any[]>('/api/orders');
    } catch (e) {
      console.error('Lỗi khi tải đơn hàng POS:', e);
      return [];
    }
  },
};
