// src/features/orders/services/orderService.ts
// Service tương tác API chi tiết đơn hàng StockFlow

import { apiClient } from '@/lib/api/client';
import { OrderDetail, OrderListFilter, OrderListItem } from '../types';

export const orderService = {
  /** Toàn bộ hóa đơn theo bộ lọc (API phân trang tối đa 100/trang → tải hết các trang) */
  async getOrders(filter: OrderListFilter): Promise<OrderListItem[]> {
    const sp = new URLSearchParams();
    const add = (k: string, v?: string | number | null) => {
      if (v !== undefined && v !== null && String(v) !== '' && String(v) !== 'ALL') sp.append(k, String(v));
    };
    add('search', filter.search?.trim());
    add('warehouseId', filter.warehouseId);
    add('fromDate', filter.fromDate);
    add('toDate', filter.toDate);
    add('status', filter.status);
    add('returnStatus', filter.returnStatus);
    add('paymentMethod', filter.paymentMethod);
    add('priceBookName', filter.priceBookName);
    add('productSearch', filter.productSearch?.trim());
    const pageSize = 100;
    const fetchPage = (page: number) => {
      const qs = new URLSearchParams(sp);
      qs.set('page', String(page));
      qs.set('pageSize', String(pageSize));
      return apiClient.get<{ items: OrderListItem[]; totalCount: number }>(`/api/orders?${qs.toString()}`);
    };
    const first = await fetchPage(1);
    const pages = Math.ceil((first.totalCount || 0) / pageSize);
    const rest = pages > 1 ? await Promise.all(Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2))) : [];
    return [first, ...rest].flatMap((p) => p.items ?? []);
  },

  /** Hủy hóa đơn: hoàn tồn kho, giảm công nợ khách, hủy phiếu thu */
  async cancelOrder(orderId: number): Promise<void> {
    await apiClient.post(`/api/orders/${orderId}/cancel`, {});
  },

  /**
   * Lấy chi tiết đơn hàng theo ID hoặc Mã đơn hàng (HD...)
   */
  async getOrderDetail(idOrCode: string | number): Promise<OrderDetail> {
    const data = await apiClient.get<OrderDetail>(`/api/orders/${idOrCode}`);
    return data;
  },

  /**
   * Cập nhật thông tin đơn hàng (Ghi chú, người bán, loại đơn hàng INVOICE/BOOKING)
   */
  async updateOrder(
    idOrCode: string | number,
    payload: {
      notes?: string;
      sellerName?: string;
      salesRepName?: string;
      orderType?: 'INVOICE' | 'BOOKING' | string;
      status?: string;
    }
  ): Promise<OrderDetail> {
    const data = await apiClient.put<OrderDetail>(`/api/orders/${idOrCode}`, payload);
    return data;
  },
};
