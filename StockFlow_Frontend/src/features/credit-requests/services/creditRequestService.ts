// src/features/credit-requests/services/creditRequestService.ts
// API yêu cầu duyệt vượt hạn mức (CreditRequestsController): Sales gửi từ POS, Manager duyệt ở Approval Inbox.

import { apiClient } from '@/lib/api/client';
import type {
  ApproveCreditRequestPayload,
  CreateCreditRequestPayload,
  CreditRequest,
  CreditRequestActionResult,
  CreditRequestList,
  CreditRequestStatusFilter,
  CustomerCreditHistory,
} from '../types';

export const creditRequestService = {
  /** UC-27: gửi yêu cầu khi POS báo vượt hạn mức */
  create(payload: CreateCreditRequestPayload): Promise<CreditRequestActionResult> {
    return apiClient.post<CreditRequestActionResult>('/api/credit-requests', payload);
  },

  /** Yêu cầu do tôi gửi (lọc theo khách đang chọn ở POS) */
  async getMine(partnerId?: number): Promise<CreditRequest[]> {
    const qs = new URLSearchParams();
    if (partnerId && partnerId > 0) qs.set('partnerId', String(partnerId));
    const data = await apiClient.get<CreditRequest[]>(`/api/credit-requests/mine?${qs.toString()}`);
    return Array.isArray(data) ? data : [];
  },

  /** UC-64: Approval Inbox (Manager) */
  async getAll(status: CreditRequestStatusFilter, search?: string): Promise<CreditRequestList> {
    const qs = new URLSearchParams();
    if (status) qs.set('status', status);
    if (search?.trim()) qs.set('search', search.trim());
    const data = await apiClient.get<CreditRequestList>(`/api/credit-requests?${qs.toString()}`);
    return { items: Array.isArray(data?.items) ? data.items : [], pendingCount: data?.pendingCount ?? 0 };
  },

  getById(id: number): Promise<CreditRequest> {
    return apiClient.get<CreditRequest>(`/api/credit-requests/${id}`);
  },

  /** Tổng quan mua hàng + lịch sử thanh toán của khách để xét duyệt (A62.2) */
  getCustomerHistory(id: number): Promise<CustomerCreditHistory> {
    return apiClient.get<CustomerCreditHistory>(`/api/credit-requests/${id}/customer-history`);
  },

  approve(id: number, payload: ApproveCreditRequestPayload): Promise<CreditRequestActionResult> {
    return apiClient.post<CreditRequestActionResult>(`/api/credit-requests/${id}/approve`, payload);
  },

  reject(id: number, reason: string): Promise<CreditRequestActionResult> {
    return apiClient.post<CreditRequestActionResult>(`/api/credit-requests/${id}/reject`, { reason });
  },
};
