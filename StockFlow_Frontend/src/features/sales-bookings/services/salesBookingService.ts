// src/features/sales-bookings/services/salesBookingService.ts
// Service API Đặt hàng (đơn đặt của khách)

import { apiClient } from '@/lib/api/client';
import type {
  SalesBookingDetail,
  SalesBookingListFilter,
  SalesBookingListItem,
  SalesBookingSaveResult,
  SaveSalesBookingPayload,
} from '../types';

export const salesBookingService = {
  async getBookings(filter: SalesBookingListFilter): Promise<SalesBookingListItem[]> {
    const qs = new URLSearchParams();
    if (filter.warehouseIds?.length) qs.set('warehouseIds', filter.warehouseIds.join(','));
    if (filter.statuses?.length) qs.set('status', filter.statuses.join(','));
    if (filter.fromDate) qs.set('fromDate', filter.fromDate);
    if (filter.toDate) qs.set('toDate', filter.toDate);
    if (filter.search?.trim()) qs.set('search', filter.search.trim());
    const data = await apiClient.get<SalesBookingListItem[]>(`/api/sales-bookings?${qs.toString()}`);
    return Array.isArray(data) ? data : [];
  },

  getBooking(id: number): Promise<SalesBookingDetail> {
    return apiClient.get<SalesBookingDetail>(`/api/sales-bookings/${id}`);
  },

  /** Hàng khách đặt chưa giao tại chi nhánh: productId → SL */
  async getReserved(warehouseId: number): Promise<Record<number, number>> {
    try {
      const data = await apiClient.get<Record<string, number>>(`/api/sales-bookings/reserved?warehouseId=${warehouseId}`);
      const map: Record<number, number> = {};
      Object.entries(data ?? {}).forEach(([k, v]) => {
        map[Number(k)] = Number(v) || 0;
      });
      return map;
    } catch {
      return {};
    }
  },

  createBooking(payload: SaveSalesBookingPayload): Promise<SalesBookingSaveResult> {
    return apiClient.post<SalesBookingSaveResult>('/api/sales-bookings', payload);
  },

  updateBooking(id: number, payload: SaveSalesBookingPayload): Promise<SalesBookingSaveResult> {
    return apiClient.put<SalesBookingSaveResult>(`/api/sales-bookings/${id}`, payload);
  },

  async confirmBooking(id: number): Promise<void> {
    await apiClient.post(`/api/sales-bookings/${id}/confirm`, {});
  },

  async cancelBooking(id: number): Promise<void> {
    await apiClient.post(`/api/sales-bookings/${id}/cancel`, {});
  },

  async finishBooking(id: number): Promise<void> {
    await apiClient.post(`/api/sales-bookings/${id}/finish`, {});
  },

  mergeBookings(orderIds: number[]): Promise<SalesBookingSaveResult> {
    return apiClient.post<SalesBookingSaveResult>('/api/sales-bookings/merge', { orderIds });
  },
};
