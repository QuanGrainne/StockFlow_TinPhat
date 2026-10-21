// src/features/roles/services/permissionService.ts
// Service chuyên biệt xử lý Vai trò & Phân quyền Kho (Roles & Warehouse Permissions - Người 2 phụ trách)

import {
  StaffAccount,
  WarehouseFacility,
  RoleDefinition,
  PermissionMatrixModule,
} from '../types';
import {
  INITIAL_WAREHOUSE_FACILITIES,
  INITIAL_ROLE_DEFINITIONS,
  INITIAL_PERMISSION_MODULES,
  INITIAL_STAFF_ACCOUNTS,
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

import { apiClient } from '@/lib/api/client';

export const permissionService = {
  // ─── 1. Physical Warehouses (Data Isolation - Phân quyền kho) ─────────────
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

  // ─── 2. Roles & RBAC Matrix (Danh mục vai trò & Ma trận quyền) ───────────
  async getRoleDefinitions(): Promise<RoleDefinition[]> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const data = await apiClient.get<RoleDefinition[]>('/api/Roles', token);
      if (Array.isArray(data) && data.length > 0) {
        roleDefinitions = data;
        return data;
      }
    } catch (e) {
      console.warn('API getRoleDefinitions failed, fallback to local data:', e);
    }
    return [...roleDefinitions];
  },

  async createRole(payload: { name: string; code: string; description?: string; rank?: string }): Promise<RoleDefinition> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      const created = await apiClient.post<RoleDefinition>('/api/Roles', payload, token);
      roleDefinitions.push(created);
      return created;
    } catch (e) {
      console.warn('API createRole failed, fallback to local state:', e);
      const fallbackRole: RoleDefinition = {
        id: `ROLE-${Date.now()}`,
        name: payload.name,
        code: payload.code.toUpperCase().startsWith('ROLE_') ? payload.code.toUpperCase() : `ROLE_${payload.code.toUpperCase()}`,
        rank: payload.rank || `Rank #${roleDefinitions.length + 1}`,
        isSystem: false,
        description: payload.description || 'Vai trò tùy biến mở rộng.',
        staffCount: 0,
      };
      roleDefinitions.push(fallbackRole);
      return fallbackRole;
    }
  },

  async updateRole(idOrCode: string, payload: { name: string; description?: string }): Promise<RoleDefinition | null> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      const updated = await apiClient.put<RoleDefinition>(`/api/Roles/${encodeURIComponent(idOrCode)}`, payload, token);
      const idx = roleDefinitions.findIndex(r => r.id === idOrCode || r.code === idOrCode);
      if (idx !== -1 && updated) {
        roleDefinitions[idx] = updated;
      }
      return updated;
    } catch (e) {
      console.warn('API updateRole failed, fallback to local state:', e);
      const idx = roleDefinitions.findIndex(r => r.id === idOrCode || r.code === idOrCode);
      if (idx !== -1) {
        roleDefinitions[idx] = {
          ...roleDefinitions[idx],
          name: payload.name,
          description: payload.description || roleDefinitions[idx].description,
        };
        return roleDefinitions[idx];
      }
      return null;
    }
  },

  async deleteRole(idOrCode: string): Promise<boolean> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      await apiClient.delete(`/api/Roles/${encodeURIComponent(idOrCode)}`, token);
      roleDefinitions = roleDefinitions.filter(r => r.id !== idOrCode && r.code !== idOrCode);
      return true;
    } catch (e) {
      console.error('API deleteRole failed:', e);
      throw e;
    }
  },

  async getPermissionMatrix(roleCode: string): Promise<PermissionMatrixModule[]> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const data = await apiClient.get<PermissionMatrixModule[]>(`/api/Roles/${encodeURIComponent(roleCode)}/permissions`, token);
      if (Array.isArray(data) && data.length > 0) {
        permissionMatrices[roleCode] = data;
        if (typeof window !== 'undefined') {
          localStorage.setItem(`stockflow_perms_${roleCode}`, JSON.stringify(data));
        }
        return data;
      }
    } catch (e) {
      console.warn(`API getPermissionMatrix for ${roleCode} failed, fallback to local data:`, e);
    }

    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`stockflow_perms_${roleCode}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            permissionMatrices[roleCode] = parsed;
            return parsed;
          }
        } catch {}
      }
    }

    return permissionMatrices[roleCode] || JSON.parse(JSON.stringify(INITIAL_PERMISSION_MODULES));
  },

  async savePermissionMatrix(roleCode: string, modules: PermissionMatrixModule[]): Promise<boolean> {
    permissionMatrices[roleCode] = JSON.parse(JSON.stringify(modules));
    if (typeof window !== 'undefined') {
      localStorage.setItem(`stockflow_perms_${roleCode}`, JSON.stringify(modules));
      window.dispatchEvent(new CustomEvent('stockflow_permissions_updated', { detail: { roleCode, modules } }));
    }
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      await apiClient.put(`/api/Roles/${encodeURIComponent(roleCode)}/permissions`, modules, token);
      return true;
    } catch (e) {
      console.warn(`API savePermissionMatrix for ${roleCode} failed, fallback to local cache:`, e);
      return true;
    }
  },

  async getAllowedModuleKeys(roleCode: string): Promise<Set<string>> {
    const modules = await this.getPermissionMatrix(roleCode);
    const keys = new Set<string>();
    for (const m of modules) {
      if (m.read) {
        const key = m.code.replace(/[\[\]]/g, '').toUpperCase();
        keys.add(key);
      }
    }
    return keys;
  },
};
