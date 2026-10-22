// src/features/roles/services/staffService.ts
// Service chuyên biệt xử lý Tài khoản Nhân viên (Staff Accounts - Người 1 phụ trách)

import { apiClient } from '@/lib/api/client';
import { StaffAccount, SystemUser } from '../types';
import { INITIAL_STAFF_ACCOUNTS } from '../data/mockData';

let staffAccounts = [...INITIAL_STAFF_ACCOUNTS];

export const staffService = {
  async getStaffList(search?: string, statusFilter?: string, deptFilter?: string): Promise<StaffAccount[]> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (deptFilter && deptFilter !== 'ALL') params.append('department', deptFilter);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get<StaffAccount[]>(`/api/Staff${qs}`, token);
      if (Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn('API getStaffList failed, fallback to local data:', e);
    }

    let list = [...staffAccounts];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.phone.includes(q)
      );
    }

    if (statusFilter && statusFilter !== 'ALL') {
      list = list.filter((s) => s.status === statusFilter);
    }

    if (deptFilter && deptFilter !== 'ALL') {
      list = list.filter((s) => s.department === deptFilter);
    }

    return list;
  },

  async createStaff(payload: Omit<StaffAccount, 'id'>): Promise<StaffAccount> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      const newStaff = await apiClient.post<StaffAccount>('/api/Staff', payload, token);
      staffAccounts.unshift(newStaff);
      return newStaff;
    } catch (e) {
      console.error('API createStaff failed:', e);
      throw e;
    }
  },

  async updateStaff(id: string, updates: Partial<StaffAccount>): Promise<StaffAccount> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const numericId = parseInt(id.replace(/\D/g, ''), 10);
      if (!isNaN(numericId)) {
        const updated = await apiClient.put<StaffAccount>(`/api/Staff/${numericId}`, updates, token);
        const idx = staffAccounts.findIndex((s) => s.id === id);
        if (idx !== -1) staffAccounts[idx] = updated;
        return updated;
      }
    } catch (e) {
      console.error('API updateStaff failed:', e);
      throw e;
    }

    const idx = staffAccounts.findIndex((s) => s.id === id);
    if (idx !== -1) {
      staffAccounts[idx] = { ...staffAccounts[idx], ...updates };
      return staffAccounts[idx];
    }
    return {
      id,
      code: id,
      name: updates.name || '',
      title: updates.title || '',
      email: updates.email || '',
      phone: updates.phone || '',
      department: updates.department || '',
      role: updates.role || 'SALES',
      roleTitle: updates.roleTitle || '',
      assignedWarehouses: updates.assignedWarehouses || [],
      status: updates.status || 'ACTIVE',
      ...updates,
    };
  },

  async toggleStaffStatus(id: string): Promise<StaffAccount> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const numericId = parseInt(id.replace(/\D/g, ''), 10);
      if (!isNaN(numericId)) {
        const res = await apiClient.put<{ isActive: boolean }>(`/api/Staff/${numericId}/toggle-status`, {}, token);
        const idx = staffAccounts.findIndex((s) => s.id === id);
        if (idx !== -1) {
          staffAccounts[idx] = {
            ...staffAccounts[idx],
            status: res.isActive ? 'ACTIVE' : 'LOCKED',
          };
          return staffAccounts[idx];
        }
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
      }
    } catch (e) {
      console.warn('API toggleStaffStatus failed, fallback to local state:', e);
    }

    const idx = staffAccounts.findIndex((s) => s.id === id);
    if (idx !== -1) {
      staffAccounts[idx] = {
        ...staffAccounts[idx],
        status: staffAccounts[idx].status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE',
      };
      return staffAccounts[idx];
    }

    return {
      id,
      code: id,
      name: '',
      title: '',
      email: '',
      phone: '',
      department: '',
      role: 'SALES',
      roleTitle: '',
      assignedWarehouses: [],
      status: 'LOCKED',
    };
  },

  async resetStaffPassword(id: string): Promise<string> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const numericId = parseInt(id.replace(/\D/g, ''), 10);
      if (!isNaN(numericId)) {
        const res = await apiClient.post<{ defaultPassword: string }>(`/api/Staff/${numericId}/reset-password`, {}, token);
        return res.defaultPassword;
      }
    } catch (e) {
      console.warn('API resetStaffPassword failed, fallback to default:', e);
    }
    return 'TinPhat@2026';
  },

  // Legacy user compatibility
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
