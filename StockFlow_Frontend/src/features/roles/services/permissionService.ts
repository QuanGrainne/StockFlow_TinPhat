// src/features/roles/services/permissionService.ts
// Service chuyên biệt xử lý Vai trò & Phân quyền Kho (Roles & Warehouse Permissions - Người 2 phụ trách)

import { apiClient } from '@/lib/api/client';
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

const WAREHOUSE_STORAGE_KEY = 'stockflow_warehouses_cache';

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
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const apiData = await apiClient.get<any[]>('/api/warehouses', token);
      if (Array.isArray(apiData) && apiData.length > 0) {
        const mapped: WarehouseFacility[] = apiData
          .filter((w: any) => w.isActive !== false && w.status !== 'INACTIVE')
          .map((w: any, index: number) => ({
            id: w.code || (w.warehouseId ? `FAC-${w.warehouseId}` : `FAC-${index + 1}`),
            warehouseId: typeof w.warehouseId === 'number' ? w.warehouseId : (typeof w.id === 'number' ? w.id : (w.id ? Number(String(w.id).replace(/\D/g, '')) : undefined)),
            code: (w.code || w.warehouseCode || `WH-${w.warehouseId}`).toUpperCase(),
            name: w.name || w.warehouseName || `Kho #${w.warehouseId}`,
            address: w.address || 'Hà Nội, Việt Nam',
            staffCount: typeof w.staffCount === 'number' ? w.staffCount : 0,
            area: w.area || w.description || '3,500 m²',
            status: w.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
          }));

        warehouseFacilities = mapped;
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(mapped));
          } catch (e) {
            console.warn('Cannot write warehouse cache:', e);
          }
        }
        return mapped;
      }
    } catch (err) {
      console.warn('API getWarehouseFacilities failed, falling back to cache/mock:', err);
    }

    // Fallback: check localStorage cache
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(WAREHOUSE_STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            warehouseFacilities = parsed;
            return parsed;
          }
        }
      } catch (e) {
        console.warn('Cannot read warehouse cache:', e);
      }
    }

    return [...warehouseFacilities];
  },

  async getMyWarehouseFacilities(): Promise<WarehouseFacility[]> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
      const apiData = await apiClient.get<any[]>('/api/warehouses/my-warehouses', token);
      if (Array.isArray(apiData) && apiData.length > 0) {
        return apiData
          .filter((w: any) => w.isActive !== false && w.status !== 'INACTIVE')
          .map((w: any, index: number) => ({
            id: w.code || (w.warehouseId ? `FAC-${w.warehouseId}` : `FAC-${index + 1}`),
            warehouseId: typeof w.warehouseId === 'number' ? w.warehouseId : (typeof w.id === 'number' ? w.id : (w.id ? Number(String(w.id).replace(/\D/g, '')) : undefined)),
            code: (w.code || w.warehouseCode || `WH-${w.warehouseId}`).toUpperCase(),
            name: w.name || w.warehouseName || `Kho #${w.warehouseId}`,
            address: w.address || 'Hà Nội, Việt Nam',
            staffCount: typeof w.staffCount === 'number' ? w.staffCount : 0,
            area: w.area || w.description || '3,500 m²',
            status: w.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
          }));
      }
    } catch (err) {
      console.warn('API getMyWarehouseFacilities failed, falling back to full list/cache:', err);
    }
    return this.getWarehouseFacilities();
  },

  async createWarehouseFacility(payload: {
    code: string;
    name: string;
    address: string;
    area?: string;
  }): Promise<WarehouseFacility> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    let createdApi: any = null;

    try {
      createdApi = await apiClient.post<any>(
        '/api/warehouses',
        {
          warehouseCode: payload.code.trim().toUpperCase(),
          warehouseName: payload.name.trim(),
          address: payload.address.trim(),
          description: payload.area?.trim() || '3,500 m²',
          isActive: true,
        },
        token
      );
    } catch (err) {
      console.error('API createWarehouse failed:', err);
      throw err;
    }

    const newFacility: WarehouseFacility = {
      id: createdApi?.code || payload.code.trim().toUpperCase(),
      warehouseId: typeof createdApi?.warehouseId === 'number' ? createdApi.warehouseId : undefined,
      code: (createdApi?.code || payload.code).trim().toUpperCase(),
      name: createdApi?.name || payload.name.trim(),
      address: createdApi?.address || payload.address.trim(),
      staffCount: typeof createdApi?.staffCount === 'number' ? createdApi.staffCount : 0,
      area: createdApi?.area || createdApi?.description || payload.area?.trim() || '3,500 m²',
      status: 'ACTIVE',
    };

    warehouseFacilities = [newFacility, ...warehouseFacilities];

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(warehouseFacilities));
      } catch (e) {
        console.warn('Cannot write warehouse cache:', e);
      }
    }

    return newFacility;
  },

  async updateWarehouseFacility(
    idOrCode: string | number,
    payload: {
      name: string;
      address: string;
      area?: string;
      isActive?: boolean;
    }
  ): Promise<WarehouseFacility> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    const target = warehouseFacilities.find(
      (w) =>
        (typeof idOrCode === 'number' && w.warehouseId === idOrCode) ||
        w.id === String(idOrCode) ||
        w.code === String(idOrCode)
    );
    const numericId = target?.warehouseId || (typeof idOrCode === 'number' ? idOrCode : parseInt(String(idOrCode).replace(/\D/g, ''), 10));

    let updatedApi: any = null;
    if (!isNaN(numericId) && numericId > 0) {
      try {
        updatedApi = await apiClient.put<any>(
          `/api/warehouses/${numericId}`,
          {
            warehouseName: payload.name.trim(),
            address: payload.address.trim(),
            description: payload.area?.trim() || '3,500 m²',
            isActive: payload.isActive ?? true,
          },
          token
        );
      } catch (err) {
        console.error('API updateWarehouse failed:', err);
        throw err;
      }
    }

    const updatedFacility: WarehouseFacility = {
      ...(target || {
        id: String(idOrCode),
        code: String(idOrCode),
        staffCount: 0,
        status: 'ACTIVE',
      }),
      warehouseId: updatedApi?.warehouseId || target?.warehouseId || (numericId > 0 ? numericId : undefined),
      name: updatedApi?.name || payload.name.trim(),
      address: updatedApi?.address || payload.address.trim(),
      area: updatedApi?.area || updatedApi?.description || payload.area?.trim() || (target?.area ?? '3,500 m²'),
      status: updatedApi?.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
    };

    warehouseFacilities = warehouseFacilities.map((w) =>
      w.code === updatedFacility.code || w.id === updatedFacility.id || (w.warehouseId && w.warehouseId === updatedFacility.warehouseId)
        ? updatedFacility
        : w
    );

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(warehouseFacilities));
      } catch (e) {
        console.warn('Cannot write warehouse cache:', e);
      }
    }

    return updatedFacility;
  },

  async deleteWarehouseFacility(idOrCode: string | number): Promise<boolean> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    const target = warehouseFacilities.find(
      (w) =>
        (typeof idOrCode === 'number' && w.warehouseId === idOrCode) ||
        w.id === String(idOrCode) ||
        w.code === String(idOrCode)
    );
    const numericId = target?.warehouseId || (typeof idOrCode === 'number' ? idOrCode : parseInt(String(idOrCode).replace(/\D/g, ''), 10));

    if (!isNaN(numericId) && numericId > 0) {
      try {
        await apiClient.delete<any>(`/api/warehouses/${numericId}`, token);
      } catch (err: any) {
        console.error('API deleteWarehouse failed:', err);
        throw new Error(err.message || 'Không thể xóa cơ sở kho từ máy chủ');
      }
    }

    warehouseFacilities = warehouseFacilities.filter(
      (w) =>
        !(w.code === String(idOrCode) || w.id === String(idOrCode) || (numericId > 0 && w.warehouseId === numericId))
    );

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(WAREHOUSE_STORAGE_KEY, JSON.stringify(warehouseFacilities));
      } catch (e) {
        console.warn('Cannot write warehouse cache:', e);
      }
    }

    return true;
  },

  async updateWarehousePermissions(staffId: string, assignedWarehouses: string[]): Promise<StaffAccount> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    const numericId = parseInt(staffId.replace(/\D/g, ''), 10);

    if (!isNaN(numericId) && numericId > 0) {
      try {
        await apiClient.put(
          `/api/warehousepermissions/${numericId}`,
          {
            assignedWarehouses,
          },
          token
        );
      } catch (err) {
        // Không lưu tạm phía client khi server từ chối (VD: 403 không phải Admin) để tránh hiển thị sai trạng thái.
        console.error('API updateWarehousePermissions failed:', err);
        throw err;
      }
    }

    const idx = staffAccounts.findIndex((s) => s.id === staffId);
    if (idx !== -1) {
      staffAccounts[idx] = {
        ...staffAccounts[idx],
        assignedWarehouses,
      };
      return staffAccounts[idx];
    }
    return {
      id: staffId,
      code: staffId,
      name: 'Nhân sự',
      title: 'Thủ kho',
      email: '',
      phone: '',
      department: 'KHO_VAN',
      role: 'WAREHOUSE',
      roleTitle: 'Thủ kho',
      assignedWarehouses,
      status: 'ACTIVE',
    };
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
      console.error('API createRole failed:', e);
      throw e;
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
      console.error('API updateRole failed:', e);
      throw e;
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
    // Lưu lên server trước; chỉ cập nhật cache/giao diện khi server chấp nhận (backend mới là nơi chặn quyền).
    const token = typeof window !== 'undefined' ? localStorage.getItem('stockflow_token') ?? undefined : undefined;
    try {
      await apiClient.put(`/api/Roles/${encodeURIComponent(roleCode)}/permissions`, modules, token);
    } catch (e) {
      console.error(`API savePermissionMatrix for ${roleCode} failed:`, e);
      throw e;
    }

    permissionMatrices[roleCode] = JSON.parse(JSON.stringify(modules));
    if (typeof window !== 'undefined') {
      localStorage.setItem(`stockflow_perms_${roleCode}`, JSON.stringify(modules));
      window.dispatchEvent(new CustomEvent('stockflow_permissions_updated', { detail: { roleCode, modules } }));
    }
    return true;
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

  // ─── 3. Navbar Feature Matrix (Phân quyền theo chức năng Navbar) ───────────
  async getFeatureMatrix(): Promise<Record<string, string[]>> {
    let matrix: Record<string, string[]> = {};
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('stockflow_feature_matrix');
      if (saved) {
        try {
          matrix = JSON.parse(saved);
          // One-time initialization: đảm bảo tính năng khách hàng được bật mặc định cho ADMIN, MANAGER, SALES
          if (!localStorage.getItem('stockflow_customers_feat_initialized_v1')) {
            const defaultRolesWithCustomers = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_SALES'];
            for (const r of defaultRolesWithCustomers) {
              if (Array.isArray(matrix[r]) && !matrix[r].includes('feat-customers')) {
                matrix[r].push('feat-customers');
              }
            }
            localStorage.setItem('stockflow_feature_matrix', JSON.stringify(matrix));
            localStorage.setItem('stockflow_customers_feat_initialized_v1', 'true');
          }
          // One-time: bật tính năng Kiểm kho mặc định cho ADMIN, MANAGER, WAREHOUSE (ma trận đã lưu từ trước chưa có)
          if (!localStorage.getItem('stockflow_stocktake_feat_initialized_v1')) {
            for (const r of ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_WAREHOUSE']) {
              if (Array.isArray(matrix[r]) && !matrix[r].includes('feat-stocktake')) {
                matrix[r].push('feat-stocktake');
              }
            }
            localStorage.setItem('stockflow_feature_matrix', JSON.stringify(matrix));
            localStorage.setItem('stockflow_stocktake_feat_initialized_v1', 'true');
          }
          if (!localStorage.getItem('stockflow_suppliers_feat_initialized_v2')) {
            const defaultRolesWithSuppliers = ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_WAREHOUSE'];
            for (const r of defaultRolesWithSuppliers) {
              if (Array.isArray(matrix[r]) && !matrix[r].includes('feat-suppliers')) {
                matrix[r].push('feat-suppliers');
              }
            }
            if (Array.isArray(matrix['ROLE_ADMIN']) && !matrix['ROLE_ADMIN'].includes('feat-purchase')) {
              matrix['ROLE_ADMIN'].push('feat-purchase');
            }
            localStorage.setItem('stockflow_feature_matrix', JSON.stringify(matrix));
            localStorage.setItem('stockflow_suppliers_feat_initialized_v2', 'true');
          }
        } catch {}
      }
    }
    for (const [role, feats] of Object.entries(DEFAULT_ROLE_FEATURE_PERMS)) {
      if (!matrix[role]) {
        matrix[role] = [...feats];
      }
    }
    return matrix;
  },

  async saveFeatureMatrix(matrix: Record<string, string[]>): Promise<boolean> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('stockflow_feature_matrix', JSON.stringify(matrix));
    }

    // Đồng bộ sang từng Role cho Backend & localStorage
    for (const [roleCode, featureIds] of Object.entries(matrix)) {
      // Dùng mã phân hệ backend (backendModuleKey) nếu khác mã hiển thị, VD Chuyển hàng → STOCK
      const permittedModuleKeys = new Set(
        NAVBAR_FEATURES
          .filter(f => featureIds.includes(f.id))
          .map(f => f.backendModuleKey ?? f.moduleKey)
      );

      const modules: PermissionMatrixModule[] = INITIAL_PERMISSION_MODULES.map(m => {
        const key = m.code.replace(/[\[\]]/g, '').toUpperCase();
        const isPermitted = permittedModuleKeys.has(key);
        return {
          ...m,
          read: isPermitted,
          create: isPermitted,
          update: isPermitted,
          delete: isPermitted,
          approve: isPermitted,
        };
      });

      await this.savePermissionMatrix(roleCode, modules);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stockflow_permissions_updated'));
    }
    return true;
  },

  async getAllowedFeatures(roleCode: string): Promise<Set<string>> {
    const matrix = await this.getFeatureMatrix();
    const feats = matrix[roleCode] || DEFAULT_ROLE_FEATURE_PERMS[roleCode] || [];
    const allowed = new Set<string>();

    for (const fid of feats) {
      allowed.add(fid);
      const featConfig = NAVBAR_FEATURES.find(f => f.id === fid);
      if (featConfig) {
        allowed.add(featConfig.moduleKey);
        featConfig.tabIds.forEach(tid => allowed.add(tid));
      }
    }
    return allowed;
  },
};

export interface NavFeatureConfig {
  id: string;
  name: string;
  desc: string;
  moduleKey: string;
  /**
   * Mã phân hệ trong ma trận quyền backend (PermissionConstants: AUTH, BOM, PARTNER, PURCHASE,
   * SALES, STOCK, PROD, FIN, GOODS). Chỉ khai báo khi moduleKey hiển thị không trùng mã backend.
   */
  backendModuleKey?: string;
  tabIds: string[];
}

export const NAVBAR_FEATURES: NavFeatureConfig[] = [
  {
    id: 'feat-staff',
    name: 'Tài khoản nhân viên',
    desc: 'Hồ sơ nhân viên, phân công phòng ban và tài khoản',
    moduleKey: 'AUTH',
    tabIds: ['admin-staff', 'admin-staff-active'],
  },
  {
    id: 'feat-roles',
    name: 'Danh mục vai trò & Phân quyền',
    desc: 'Thiết lập danh mục vai trò và quyền hạn chức năng hệ thống',
    moduleKey: 'AUTH',
    tabIds: ['admin-roles', 'admin-matrix'],
  },
  {
    id: 'feat-warehouse-perms',
    name: 'Phân quyền kho & Cơ sở kho',
    desc: 'Phân quyền nhân sự vào các cơ sở kho và danh sách kho',
    moduleKey: 'AUTH',
    tabIds: ['admin-warehouse-perms', 'admin-warehouse-facilities'],
  },
  {
    id: 'feat-goods',
    name: 'Danh mục hàng hóa & Bảng giá',
    desc: 'Quản trị danh mục sản phẩm, vật tư, đơn vị tính, thẻ kho và thiết lập bảng giá',
    moduleKey: 'GOODS',
    tabIds: ['admin-goods', 'admin-price-books', 'price-books', 'warehouse-goods', 'production-goods', 'goods-catalog'],
  },
  {
    id: 'feat-customers',
    name: 'Quản lý khách hàng',
    desc: 'Hồ sơ khách hàng, phân nhóm đối tác, lịch sử mua hàng và công nợ phải thu',
    moduleKey: 'PARTNER',
    tabIds: ['customers', 'sales-customers', 'manager-customers', 'admin-customers'],
  },
  {
    id: 'feat-transfers',
    name: 'Chuyển hàng (Chuyển kho)',
    desc: 'Tạo phiếu chuyển kho, theo dõi hàng đang chuyển và xác nhận nhập kho đích',
    moduleKey: 'TRANSFER',
    // API /api/Transfers yêu cầu quyền STOCK_* (UC-33 thuộc phân hệ Quản lý kho)
    backendModuleKey: 'STOCK',
    tabIds: ['transfers', 'admin-transfers', 'manager-transfers', 'sales-transfers', 'warehouse-transfers', 'warehouse-transfer'],
  },
  {
    id: 'feat-stocktake',
    name: 'Kiểm kho',
    desc: 'Lập phiếu kiểm kê, gộp phiếu và cân bằng tồn kho thực tế tại kho',
    moduleKey: 'STOCKTAKE',
    // API /api/Stocktakes yêu cầu quyền STOCK_* (thuộc phân hệ Quản lý kho)
    backendModuleKey: 'STOCK',
    tabIds: ['stocktakes'],
  },
  {
    id: 'feat-sales',
    name: 'Quản lý bán hàng',
    desc: 'Đơn hàng chờ xử lý, gộp đơn B2B và quản lý hàng trả',
    moduleKey: 'SALES',
    tabIds: ['sales-orders', 'sales-dashboard', 'sales-consolidate', 'sales-returns', 'warehouse-outbound'],
  },
  {
    id: 'feat-purchase',
    name: 'Quản lý mua hàng & Nhập kho',
    desc: 'Lập phiếu nhập hàng, quản lý đơn mua PO, thanh toán và chi phí mua hàng',
    moduleKey: 'PURCHASE',
    tabIds: ['purchases', 'admin-purchases', 'manager-purchases', 'warehouse-purchases', 'warehouse-inbound', 'manager-landed-cost'],
  },
  {
    id: 'feat-suppliers',
    name: 'Quản lý Nhà cung cấp',
    desc: 'Hồ sơ nhà cung cấp, công nợ phải trả và lịch sử nhập hàng',
    moduleKey: 'PARTNER',
    tabIds: ['suppliers', 'admin-suppliers', 'manager-suppliers'],
  },
  {
    id: 'feat-stock',
    name: 'Quản trị kho & Tồn kho',
    desc: 'Tổng quan tồn kho thực tế, xuất kho, điều chuyển và kiểm kê',
    moduleKey: 'STOCK',
    tabIds: ['warehouse-overview', 'warehouse-transfer', 'warehouse-audit', 'warehouse-returns'],
  },
  {
    id: 'feat-prod',
    name: 'Quản trị sản xuất',
    desc: 'Theo dõi lệnh sản xuất, nhận kế hoạch gia công và nhật ký',
    moduleKey: 'PROD',
    tabIds: ['production-orders', 'production-import', 'production-logs'],
  },
  {
    id: 'feat-bom',
    name: 'Định mức nguyên liệu (BOM)',
    desc: 'Quản lý định mức BOM vật tư và công thức phối liệu',
    moduleKey: 'BOM',
    tabIds: ['manager-bom'],
  },
  {
    id: 'feat-partner',
    name: 'Đối tác & Hạn mức công nợ',
    desc: 'Quản lý khách hàng B2B, hồ sơ khách hàng và xét duyệt ngoại lệ công nợ',
    moduleKey: 'PARTNER',
    tabIds: ['customers', 'manager-partners', 'sales-credit-limits'],
  },
  {
    id: 'feat-fin',
    name: 'Tài chính & Báo cáo',
    desc: 'Quản lý phiếu thu, chi dòng tiền và báo cáo quản trị tổng hợp',
    moduleKey: 'FIN',
    tabIds: ['manager-cashflow', 'manager-reports'],
  },
];

export const DEFAULT_ROLE_FEATURE_PERMS: Record<string, string[]> = {
  ROLE_ADMIN: [
    'feat-staff',
    'feat-customers',
    'feat-roles',
    'feat-warehouse-perms',
    'feat-goods',
    'feat-transfers',
    'feat-stocktake',
    'feat-sales',
    'feat-purchase',
    'feat-suppliers',
    'feat-stock',
    'feat-prod',
    'feat-bom',
    'feat-partner',
    'feat-fin',
  ],
  ROLE_MANAGER: [
    'feat-goods',
    'feat-customers',
    'feat-transfers',
    'feat-stocktake',
    'feat-sales',
    'feat-purchase',
    'feat-suppliers',
    'feat-stock',
    'feat-prod',
    'feat-bom',
    'feat-partner',
    'feat-fin',
  ],
  ROLE_SALES: [
    'feat-goods',
    'feat-customers',
    'feat-sales',
    'feat-partner',
  ],
  ROLE_WAREHOUSE: [
    'feat-goods',
    'feat-transfers', // UC-33: nhân viên kho lập phiếu chuyển và xác nhận nhận hàng
    'feat-stocktake',
    'feat-purchase',
    'feat-suppliers',
    'feat-stock',
    'feat-bom',
  ],
  ROLE_PRODUCTION: [
    'feat-goods',
    'feat-stock',
    'feat-prod',
    'feat-bom',
  ],
};
