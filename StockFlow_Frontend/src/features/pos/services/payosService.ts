// src/features/pos/services/payosService.ts
// QR thanh toán chuyển khoản qua payOS cho màn Bán hàng. Khóa payOS chỉ ở backend;
// trạng thái "Đã thanh toán" do backend xác nhận (webhook có chữ ký / tra cứu payOS), client chỉ hiển thị.

import { apiClient } from '@/lib/api/client';
import type { CreatePayosPaymentPayload, PayosPayment } from '../types';

export const payosService = {
  /** Tạo QR thanh toán (hiệu lực 10 phút) */
  create(payload: CreatePayosPaymentPayload): Promise<PayosPayment> {
    return apiClient.post<PayosPayment>('/api/payments/payos', payload);
  },

  /** Trạng thái QR — backend tự hỏi lại payOS khi còn chờ */
  get(orderCode: number): Promise<PayosPayment> {
    return apiClient.get<PayosPayment>(`/api/payments/payos/${orderCode}`);
  },

  /** Hủy QR đang chờ (tạo QR mới / đóng). QR đã thanh toán thì trả về trạng thái PAID */
  cancel(orderCode: number): Promise<PayosPayment> {
    return apiClient.post<PayosPayment>(`/api/payments/payos/${orderCode}/cancel`, {});
  },
};
