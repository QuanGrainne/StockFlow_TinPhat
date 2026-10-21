// src/features/roles/services/adminService.ts
// Service xử lý API cho phân hệ Quản trị viên (Admin - OIMS)

import { apiClient } from '@/lib/api/client';
import {
  StaffAccount,
  WarehouseFacility,
  RoleDefinition,
  PermissionMatrixModule,
  SystemUser,
  UserRole,
} from '../types';
import {
  INITIAL_STAFF_ACCOUNTS,
  INITIAL_WAREHOUSE_FACILITIES,
  INITIAL_ROLE_DEFINITIONS,
  INITIAL_PERMISSION_MODULES,
  INITIAL_SYSTEM_USERS,
} from '../data/mockData';

let staffAccounts = [...INITIAL_STAFF_ACCOUNTS];
let warehouseFacilities = [...INITIAL_WAREHOUSE_FACILITIES];
let roleDefinitions = [...INITIAL_ROLE_DEFINITIONS];
let permissionMatrices: Record<string, PermissionMatrixModule[]> = {
  ROLE_ADMIN: JSON.parse(JSON.stringify(INITIAL_PERMISSION_MODULES)),
  ROLE_MANAGER: JSON.parse(JSON.stringify(INITIAL_PERMISSION_MODULES)).map((m: PermissionMatrixModule) => ({
    ...m,
    delete: m.id === 'MOD-01' ? false : true,
    approve: true,
  })),
  ROLE_SALES: JSON.parse(JSON.stringify(INITIAL_PERMISSION_MODULES)).map((m: PermissionMatrixModule) => ({
    ...m,
    read: true,
    create: m.id === 'MOD-05' || m.id === 'MOD-03',
    update: m.id === 'MOD-05',
    delete: false,
    approve: false,
  })),
  ROLE_WAREHOUSE: JSON.parse(JSON.stringify(INITIAL_PERMISSION_MODULES)).map((m: PermissionMatrixModule) => ({
    ...m,
    read: true,
    create: m.id === 'MOD-04' || m.id === 'MOD-06',
    update: m.id === 'MOD-06',
    delete: false,
    approve: false,
  })),
  ROLE_PRODUCTION: JSON.parse(JSON.stringify(INITIAL_PERMISSION_MODULES)).map((m: PermissionMatrixModule) => ({
    ...m,
    read: true,
    create: m.id === 'MOD-07',
    update: m.id === 'MOD-07',
    delete: false,
    approve: false,
  })),
};

export const adminService = {
  // ─── 1. Staff Accounts ───────────────────────────────────────────────────
  async getStaffList(search?: string, statusFilter?: string, deptFilter?: string): Promise<StaffAccount[]> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter);
      if (deptFilter && deptFilter !== 'ALL') params.append('department', deptFilter);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get<StaffAccount[]>(`/api/Staff${qs}`, token);
      if (Array.isArray(data) && data.length > 0) {
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
      console.warn('API updateStaff failed, fallback to local state:', e);
    }

    const idx = staffAccounts.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Không tìm thấy tài khoản nhân viên');
    staffAccounts[idx] = { ...staffAccounts[idx], ...updates };
    return staffAccounts[idx];
  },

  async toggleStaffStatus(id: string): Promise<StaffAccount> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const numericId = parseInt(id.replace(/\D/g, ''), 10);
      if (!isNaN(numericId)) {
        await apiClient.put(`/api/Staff/${numericId}/toggle-status`, {}, token);
      }
    } catch (e) {
      console.warn('API toggleStaffStatus failed, fallback to local state:', e);
    }

    const idx = staffAccounts.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error('Không tìm thấy tài khoản nhân viên');
    staffAccounts[idx] = {
      ...staffAccounts[idx],
      status: staffAccounts[idx].status === 'ACTIVE' ? 'LOCKED' : 'ACTIVE',
    };
    return staffAccounts[idx];
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
    return 'StockFlow@123';
  },

  // ─── 2. Physical Warehouses (Data Isolation) ──────────────────────────────
  async getWarehouseFacilities(): Promise<WarehouseFacility[]> {
    await new Promise((r) => setTimeout(r, 100));
    return [...warehouseFacilities];
  },

  async updateWarehousePermissions(staffId: string, assignedWarehouses: string[]): Promise<StaffAccount> {
    await new Promise((r) => setTimeout(r, 150));
    const idx = staffAccounts.findIndex((s) => s.id === staffId);
    if (idx === -1) throw new Error('Không tìm thấy nhân sự');
    staffAccounts[idx] = {
      ...staffAccounts[idx],
      assignedWarehouses,
    };
    return staffAccounts[idx];
  },

  // ─── 3. Roles & RBAC Matrix ──────────────────────────────────────────────
  async getRoleDefinitions(): Promise<RoleDefinition[]> {
    await new Promise((r) => setTimeout(r, 100));
    return [...roleDefinitions];
  },

  async getPermissionMatrix(roleCode: string): Promise<PermissionMatrixModule[]> {
    await new Promise((r) => setTimeout(r, 100));
    return permissionMatrices[roleCode] || JSON.parse(JSON.stringify(INITIAL_PERMISSION_MODULES));
  },

  async savePermissionMatrix(roleCode: string, modules: PermissionMatrixModule[]): Promise<boolean> {
    await new Promise((r) => setTimeout(r, 200));
    permissionMatrices[roleCode] = JSON.parse(JSON.stringify(modules));
    return true;
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


