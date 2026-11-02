import { apiClient } from '@/lib/api/client';
import { OrderSettings, UpdateOrderSettingsPayload } from '../types';

export const orderSettingsService = {
  /**
   * Lấy cấu hình thiết lập đơn hàng và quy tắc giao dịch
   */
  async getSettings(): Promise<OrderSettings> {
    try {
      const data = await apiClient.get<OrderSettings>('/api/settings/orders');
      return data;
    } catch (error) {
      console.error('Lỗi khi tải thiết lập đơn hàng:', error);
      throw error;
    }
  },

  /**
   * Cập nhật cấu hình thiết lập đơn hàng và quy tắc giao dịch (Admin)
   */
  async updateSettings(payload: UpdateOrderSettingsPayload): Promise<OrderSettings> {
    try {
      const data = await apiClient.put<OrderSettings>('/api/settings/orders', payload);
      return data;
    } catch (error) {
      console.error('Lỗi khi lưu thiết lập đơn hàng:', error);
      throw error;
    }
  },
};

