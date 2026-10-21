// src/features/roles/services/productionService.ts
// Service xử lý API cho phân hệ Xưởng Sản Xuất (sẵn sàng tích hợp NestJS / ASP.NET Backend)

import { ProductionWorkShift, ProductionOrder } from '../types';
import { INITIAL_WORK_SHIFTS, INITIAL_PRODUCTION_ORDERS } from '../data/mockData';

let workShifts = [...INITIAL_WORK_SHIFTS];
let productionOrders = [...INITIAL_PRODUCTION_ORDERS];

export const productionService = {
  // Lấy danh sách ghi nhận ca làm việc & sản lượng
  async getWorkShifts(search?: string): Promise<ProductionWorkShift[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    let list = [...workShifts];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.orderCode.toLowerCase().includes(q) ||
          s.finishedProductName.toLowerCase().includes(q) ||
          s.operator.toLowerCase().includes(q) ||
          s.workshop.toLowerCase().includes(q)
      );
    }

    return list;
  },

  // Ghi nhận báo cáo sản lượng ca
  async createWorkShift(
    payload: Omit<ProductionWorkShift, 'id' | 'recordedAt'>
  ): Promise<ProductionWorkShift> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newShift: ProductionWorkShift = {
      ...payload,
      id: `SH-${Date.now()}`,
      recordedAt: formattedDate,
    };
    workShifts.unshift(newShift);
    return newShift;
  },

  // Lấy các lệnh sản xuất đang chạy
  async getActiveOrders(): Promise<ProductionOrder[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return productionOrders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'PLANNED');
  },
};
