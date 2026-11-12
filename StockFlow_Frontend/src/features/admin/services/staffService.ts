// src/features/admin/services/staffService.ts
// Service chuyên biệt xử lý Tài khoản Nhân viên (Staff Accounts - Người 1 phụ trách)

import { tabSession } from '@/lib/auth/tabSession';
import { apiClient } from '@/lib/api/client';
import { StaffAccount, SystemUser } from '../types';

// T18: đã bỏ dữ liệu giả. API lỗi thì ném lỗi để màn hình báo, không hiện nhân viên/trạng thái giả.

/** Lấy số id nhân viên từ chuỗi id (vd "NV-NV001" → 1); ném lỗi nếu không có chữ số. */
function toNumericStaffId(id: string): number {
  const numericId = parseInt(id.replace(/\D/g, ''), 10);
  if (isNaN(numericId)) throw new Error('Mã nhân viên không hợp lệ.');
  return numericId;
}

export const staffService = {
  async getStaffList(search?: string, statusFilter?: string, deptFilter?: string): Promise<StaffAccount[]> {
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
    if (deptFilter && deptFilter !== 'ALL') params.append('department', deptFilter);

    const qs = params.toString() ? `?${params.toString()}` : '';
    const data = await apiClient.get<StaffAccount[]>(`/api/Staff${qs}`, token);
    return Array.isArray(data) ? data : [];
  },

  async createStaff(payload: Omit<StaffAccount, 'id'>): Promise<StaffAccount> {
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
    try {
      return await apiClient.post<StaffAccount>('/api/Staff', payload, token);
    } catch (e) {
      console.error('API createStaff failed:', e);
      throw e;
    }
  },

  async updateStaff(id: string, updates: Partial<StaffAccount>): Promise<StaffAccount> {
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
    const numericId = toNumericStaffId(id);
    try {
      return await apiClient.put<StaffAccount>(`/api/Staff/${numericId}`, updates, token);
    } catch (e) {
      console.error('API updateStaff failed:', e);
      throw e;
    }
  },

  async toggleStaffStatus(id: string): Promise<StaffAccount> {
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
    const numericId = toNumericStaffId(id);
    const res = await apiClient.put<{ isActive: boolean }>(`/api/Staff/${numericId}/toggle-status`, {}, token);
    // Màn hình chỉ dùng status rồi tải lại danh sách từ server
    return {
      id,
      code: `NV-NV${numericId.toString().padStart(3, '0')}`,
      name: '',
      title: '',
      email: '',
      phone: '',
      department: '',
      role: 'SALES',
      roleTitle: '',
      assignedWarehouses: [],
      status: res.isActive ? 'ACTIVE' : 'LOCKED',
    };
  },

  async resetStaffPassword(id: string): Promise<string> {
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
    const numericId = toNumericStaffId(id);
    const res = await apiClient.post<{ defaultPassword: string }>(`/api/Staff/${numericId}/reset-password`, {}, token);
    return res.defaultPassword;
  },

  // Legacy user compatibility
  // Chưa có màn hình gọi 4 hàm getUsers/createUser/updateUser/toggleUserStatus (giữ để tương thích; không dùng mock).
  async getUsers(search?: string, roleFilter?: string): Promise<SystemUser[]> {
    return this.getStaffList(search, roleFilter).then((list) =>
      list.map((s) => ({
        id: s.id,
        userCode: s.code,
        fullName: s.name,
        email: s.email,
        phone: s.phone,
        role: s.role,
        assignedWarehouses: s.assignedWarehouses,
        status: s.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
      }))
    );
  },

  async createUser(payload: Omit<SystemUser, 'id' | 'lastLogin'>): Promise<SystemUser> {
    const s = await this.createStaff({
      code: payload.userCode,
      name: payload.fullName,
      title: 'Chuyên viên',
      email: payload.email,
      phone: payload.phone,
      department: 'Quản trị hệ thống',
      role: payload.role,
      roleTitle: 'Nhân viên',
      assignedWarehouses: payload.assignedWarehouses,
      status: payload.status === 'ACTIVE' ? 'ACTIVE' : 'LOCKED',
    });
    return {
      id: s.id,
      userCode: s.code,
      fullName: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      assignedWarehouses: s.assignedWarehouses,
      status: s.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    };
  },

  async updateUser(id: string, updates: Partial<Omit<SystemUser, 'id'>>): Promise<SystemUser> {
    const s = await this.updateStaff(id, {
      name: updates.fullName,
      email: updates.email,
      phone: updates.phone,
      role: updates.role,
      assignedWarehouses: updates.assignedWarehouses,
      status: updates.status ? (updates.status === 'ACTIVE' ? 'ACTIVE' : 'LOCKED') : undefined,
    });
    return {
      id: s.id,
      userCode: s.code,
      fullName: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      assignedWarehouses: s.assignedWarehouses,
      status: s.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    };
  },

  async toggleUserStatus(id: string): Promise<SystemUser> {
    const s = await this.toggleStaffStatus(id);
    return {
      id: s.id,
      userCode: s.code,
      fullName: s.name,
      email: s.email,
      phone: s.phone,
      role: s.role,
      assignedWarehouses: s.assignedWarehouses,
      status: s.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
    };
  },
};
