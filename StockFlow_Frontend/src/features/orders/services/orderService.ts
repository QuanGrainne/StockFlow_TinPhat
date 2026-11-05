// src/features/orders/services/orderService.ts
// Service tương tác API chi tiết đơn hàng StockFlow

import { apiClient } from '@/lib/api/client';
import { OrderDetail } from '../types';

export const orderService = {
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
      orderType?: string;
      salesRepName?: string;
      status?: string;
    }
  ): Promise<OrderDetail> {
    const data = await apiClient.put<OrderDetail>(`/api/orders/${idOrCode}`, payload);
    return data;
  },
};

