import { apiClient } from '@/lib/api/client';
import { OrderSettings, UpdateOrderSettingsPayload } from '../types';

export const orderSettingsService = {
  /**
   * Lấy cài đặt giao dịch (bán hàng vượt tồn kho, chuyển hàng khi âm kho)
   */
  async getSettings(): Promise<OrderSettings> {
    try {
      const data = await apiClient.get<OrderSettings>('/api/settings/orders');
      return data;
    } catch (error) {
      console.error('Lỗi khi tải cài đặt:', error);
      throw error;
    }
  },

  /**
   * Lưu cài đặt giao dịch (cần chức năng "Cài đặt" trong ma trận phân quyền)
   */
  async updateSettings(payload: UpdateOrderSettingsPayload): Promise<OrderSettings> {
    try {
      const data = await apiClient.put<OrderSettings>('/api/settings/orders', payload);
      return data;
    } catch (error) {
      console.error('Lỗi khi lưu cài đặt:', error);
      throw error;
    }
  },
};

