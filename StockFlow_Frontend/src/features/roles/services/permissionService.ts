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
};
