// src/features/admin/services/permissionService.ts
// Service chuyên biệt xử lý Vai trò & Phân quyền Kho (Roles & Warehouse Permissions - Người 2 phụ trách)

import { tabSession } from '@/lib/auth/tabSession';
import { apiClient } from '@/lib/api/client';
import { ADMIN_LOCKED_FEATURES, NAV_ITEMS_FLAT } from '@/lib/navigation/navbar';
import { ROLE_SWITCHER_ENABLED } from '@/lib/auth/flags';
import {
  StaffAccount,
  WarehouseFacility,
  RoleDefinition,
  PermissionMatrixModule,
} from '../types';
// CÒN DỰ PHÒNG MOCK KHI API LỖI – chỉ dùng cho getPermissionMatrix (chưa có màn hình gọi).
import { INITIAL_PERMISSION_MODULES } from '../data/mockData';

const WAREHOUSE_STORAGE_KEY = 'stockflow_warehouses_cache';

// T18: kho và vai trò không còn khởi tạo từ dữ liệu giả; mảng chỉ giữ dữ liệu thật đã tải từ server.
let warehouseFacilities: WarehouseFacility[] = [];
let roleDefinitions: RoleDefinition[] = [];

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
      const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
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
      console.warn('API getWarehouseFacilities failed, falling back to cache:', err);
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

    // Không có cache: trả dữ liệu thật đã tải trong phiên này (rỗng nếu chưa tải được), không dùng kho giả.
    return [...warehouseFacilities];
  },

  // CÒN DỰ PHÒNG KHI API LỖI (trả toàn bộ kho) – chưa có màn hình gọi.
  async getMyWarehouseFacilities(): Promise<WarehouseFacility[]> {
    try {
      const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
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
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
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
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
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
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
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
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
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

    // Màn hình không dùng giá trị trả về (tải lại danh sách từ server); giữ kiểu StaffAccount.
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
    // API lỗi thì ném lỗi (các màn gọi đều có try/catch), không trả vai trò giả.
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
    const data = await apiClient.get<RoleDefinition[]>('/api/Roles', token);
    if (Array.isArray(data) && data.length > 0) {
      roleDefinitions = data;
      return data;
    }
    return [...roleDefinitions];
  },

  async createRole(payload: { name: string; code: string; description?: string; rank?: string }): Promise<RoleDefinition> {
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
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
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
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
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
    try {
      await apiClient.delete(`/api/Roles/${encodeURIComponent(idOrCode)}`, token);
      roleDefinitions = roleDefinitions.filter(r => r.id !== idOrCode && r.code !== idOrCode);
      return true;
    } catch (e) {
      console.error('API deleteRole failed:', e);
      throw e;
    }
  },

  // CÒN DỰ PHÒNG MOCK KHI API LỖI – getPermissionMatrix / savePermissionMatrix / getAllowedModuleKeys chưa có màn hình gọi.
  async getPermissionMatrix(roleCode: string): Promise<PermissionMatrixModule[]> {
    try {
      const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
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
    const token = typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
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
  // Ma trận lưu trên server (mã quyền FEAT_* của từng vai trò). Backend chặn API ghi dữ liệu theo đúng ma trận này.
  async getFeatureMatrix(): Promise<Record<string, string[]>> {
    const rows = await apiClient.get<RoleFeaturesRow[]>('/api/Roles/feature-matrix', authToken());
    const matrix: Record<string, string[]> = {};
    for (const r of rows) matrix[r.roleCode] = r.features;

    // One-time: đẩy ma trận cũ lưu trên trình duyệt lên server cho các vai trò server chưa cấu hình
    const pushed = await pushLegacyLocalMatrix(rows);
    if (pushed) {
      for (const [role, feats] of Object.entries(pushed)) matrix[role] = feats;
    }
    matrixCache = { token: authToken() ?? '', at: Date.now(), matrix };
    return matrix;
  },

  async saveFeatureMatrix(matrix: Record<string, string[]>): Promise<boolean> {
    await apiClient.put('/api/Roles/feature-matrix', matrix, authToken());
    clearFeatureCaches();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('stockflow_permissions_updated'));
    }
    return true;
  },

  /**
   * Chức năng navbar được dùng. Bình thường lấy theo tài khoản đăng nhập (server tính từ vai trò thật);
   * khi bật bộ chuyển vai trò (demo) thì lấy theo vai trò đang chọn trong ma trận.
   */
  async getAllowedFeatures(roleCode: string): Promise<Set<string>> {
    const token = authToken() ?? '';
    let feats: string[];
    if (ROLE_SWITCHER_ENABLED) {
      const cached = matrixCache && matrixCache.token === token && Date.now() - matrixCache.at < CACHE_MS ? matrixCache.matrix : null;
      const matrix = cached ?? (await permissionService.getFeatureMatrix());
      feats = [...(matrix[roleCode] ?? []), ...(roleCode === 'ROLE_ADMIN' ? ADMIN_LOCKED_FEATURES : [])];
    } else {
      if (myFeaturesCache && myFeaturesCache.token === token && Date.now() - myFeaturesCache.at < CACHE_MS) {
        feats = myFeaturesCache.feats;
      } else {
        myFeaturesInflight ??= apiClient
          .get<string[]>('/api/Roles/my-features', token || undefined)
          .finally(() => {
            myFeaturesInflight = null;
          });
        feats = await myFeaturesInflight;
        myFeaturesCache = { token, at: Date.now(), feats };
      }
    }
    lastAllowed = { token, role: roleCode, feats: new Set(feats) };
    return new Set(feats);
  },

  /** Kết quả quyền gần nhất (đồng bộ) để navbar hiện ngay khi chuyển trang, không bị nháy trống */
  peekAllowedFeatures(roleCode: string): Set<string> | null {
    if (!lastAllowed || lastAllowed.role !== roleCode || lastAllowed.token !== (authToken() ?? '')) return null;
    return new Set(lastAllowed.feats);
  },
};

interface RoleFeaturesRow {
  roleCode: string;
  roleName: string;
  features: string[];
  configured: boolean;
}

/** Không giữ tạm: mỗi lần mở / chuyển trang đều hỏi lại server, Admin bỏ tick là trang bị chặn ngay */
const CACHE_MS = 0;
let myFeaturesCache: { token: string; at: number; feats: string[] } | null = null;
let myFeaturesInflight: Promise<string[]> | null = null;
let matrixCache: { token: string; at: number; matrix: Record<string, string[]> } | null = null;
let lastAllowed: { token: string; role: string; feats: Set<string> } | null = null;

function authToken(): string | undefined {
  return typeof window !== 'undefined' ? tabSession.get('stockflow_token') ?? undefined : undefined;
}

function clearFeatureCaches() {
  myFeaturesCache = null;
  matrixCache = null;
  lastAllowed = null;
}

const LEGACY_MATRIX_KEY = 'stockflow_feature_matrix';
const LEGACY_SYNCED_KEY = 'stockflow_feature_matrix_synced_server_v1';

/**
 * Trước đây ma trận chỉ lưu trong localStorage của trình duyệt Admin. Lần đầu mở sau khi chuyển lên server:
 * vai trò nào server chưa cấu hình mà trình duyệt có ma trận cũ thì đẩy lên (chỉ Admin lưu được).
 */
async function pushLegacyLocalMatrix(rows: RoleFeaturesRow[]): Promise<Record<string, string[]> | null> {
  if (typeof window === 'undefined' || localStorage.getItem(LEGACY_SYNCED_KEY)) return null;
  const raw = localStorage.getItem(LEGACY_MATRIX_KEY);
  if (!raw) {
    localStorage.setItem(LEGACY_SYNCED_KEY, 'true');
    return null;
  }
  try {
    const local = JSON.parse(raw) as Record<string, unknown>;
    const payload: Record<string, string[]> = {};
    for (const row of rows) {
      const feats = local[row.roleCode];
      if (!row.configured && Array.isArray(feats)) {
        payload[row.roleCode] = migrateFeatureList(row.roleCode, feats.map(String));
      }
    }
    if (Object.keys(payload).length > 0) {
      await apiClient.put('/api/Roles/feature-matrix', payload, authToken());
    }
    localStorage.setItem(LEGACY_SYNCED_KEY, 'true');
    localStorage.removeItem(LEGACY_MATRIX_KEY);
    return Object.keys(payload).length > 0 ? payload : null;
  } catch (e) {
    const status = (e as { status?: number }).status;
    // Không phải Admin (403): bỏ qua, không thử lại
    if (status === 403) localStorage.setItem(LEGACY_SYNCED_KEY, 'true');
    return null;
  }
}

export interface NavFeatureConfig {
  id: string;
  name: string;
  desc: string;
  /** Nhóm trên navbar (VD Mua hàng) — ma trận phân quyền hiển thị theo nhóm */
  group: string;
  /** Phân hệ quyền backend (PermissionConstants) được cấp khi tick chức năng */
  moduleKey: string;
  backendModuleKey?: string;
  /** Các mã màn hình mở chức năng này */
  tabIds: string[];
}

/** Chức năng phân quyền = đúng các mục trên navbar (xem config/navbar.ts) */
export const NAVBAR_FEATURES: NavFeatureConfig[] = NAV_ITEMS_FLAT.map((i) => ({
  id: i.featureId,
  name: i.title,
  desc: i.desc,
  group: i.groupLabel,
  moduleKey: i.backendModule,
  tabIds: [i.screen, ...(i.aliases ?? [])],
}));

const GOODS_FEATS = ['feat-goods', 'feat-price-books'];
const STOCK_FEATS = ['feat-transfers', 'feat-stocktake', 'feat-disposal'];
const SALES_FEATS = ['feat-pos', 'feat-sales-booking', 'feat-invoices', 'feat-sales-returns'];
const PURCHASE_FEATS = ['feat-purchase-orders', 'feat-purchase', 'feat-purchase-returns', 'feat-suppliers'];
const PROD_FEATS = [
  'feat-production-plans',
  'feat-production-plan-approval',
  'feat-prod',
  'feat-prod-plan',
  'feat-prod-issue',
  'feat-prod-receipt',
  'feat-production-mrp',
];
/**
 * Kế toán sản xuất: xem lệnh, xuất NVL, nhập thành phẩm; không lập lệnh, không sửa BOM (SRS 3.1.6).
 * Được lập / gửi duyệt kế hoạch sản xuất, không duyệt; được chạy / xem MRP (khớp FeatureConstants backend, Q10).
 */
const PROD_ACCOUNTANT_FEATS = ['feat-production-plans', 'feat-prod', 'feat-prod-issue', 'feat-prod-receipt', 'feat-production-mrp'];

export const DEFAULT_ROLE_FEATURE_PERMS: Record<string, string[]> = {
  ROLE_ADMIN: NAVBAR_FEATURES.map((f) => f.id),
  ROLE_MANAGER: [...GOODS_FEATS, ...STOCK_FEATS, 'feat-customers', ...SALES_FEATS, 'feat-credit-approvals', ...PURCHASE_FEATS, ...PROD_FEATS, 'feat-bom'],
  ROLE_SALES: ['feat-goods', 'feat-customers', ...SALES_FEATS],
  // UC-33: nhân viên kho lập phiếu chuyển và xác nhận nhận hàng
  ROLE_WAREHOUSE: ['feat-goods', ...STOCK_FEATS, ...PURCHASE_FEATS],
  ROLE_PRODUCTION: ['feat-goods', ...PROD_ACCOUNTANT_FEATS],
};

/**
 * Chuyển ma trận đã lưu (bộ chức năng cũ) sang bộ chức năng mới theo navbar:
 * tách chức năng gộp thành từng mục, bỏ các nhóm đã gỡ khỏi navbar (Quản trị kho, Đối tác & Công nợ, Tài chính & Báo cáo).
 */
function migrateFeatureList(role: string, feats: string[]): string[] {
  const out = new Set(feats);
  const addIf = (has: string, add: string[]) => {
    if (out.has(has)) add.forEach((a) => out.add(a));
  };
  addIf('feat-goods', ['feat-price-books']);
  addIf('feat-sales', SALES_FEATS);
  addIf('feat-purchase', ['feat-purchase-orders', 'feat-purchase-returns']);
  addIf('feat-partner', ['feat-customers']);
  // Nhân viên: gộp "Tất cả nhân sự" + "Đang hoạt động" thành 1 mục
  addIf('feat-staff-active', ['feat-staff']);
  addIf('feat-roles', ['feat-role-matrix']);
  // Phân quyền kho: gộp "Danh sách quyền kho" + "Cơ sở kho" thành 1 mục
  addIf('feat-warehouse-facilities', ['feat-warehouse-perms']);
  if (role === 'ROLE_ADMIN') out.add('feat-dashboard');
  const valid = new Set(NAVBAR_FEATURES.map((f) => f.id));
  return [...out].filter((id) => valid.has(id));
}
