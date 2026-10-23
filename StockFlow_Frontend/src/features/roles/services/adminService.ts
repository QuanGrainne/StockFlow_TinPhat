// src/features/roles/services/adminService.ts
// Cầu nối tương thích ngược (Backward Compatibility) kết hợp cả staffService và permissionService.
// Giúp toàn bộ các màn hình cũ không bị lỗi import, đồng thời tách biệt code cho 2 thành viên.

import { staffService } from './staffService';
import { permissionService } from './permissionService';

export const adminService = {
  // Staff methods
  getStaffList: staffService.getStaffList,
  createStaff: staffService.createStaff,
  updateStaff: staffService.updateStaff,
  toggleStaffStatus: staffService.toggleStaffStatus,
  resetStaffPassword: staffService.resetStaffPassword,
  getUsers: staffService.getUsers,
  createUser: staffService.createUser,
  updateUser: staffService.updateUser,
  toggleUserStatus: staffService.toggleUserStatus,

  // Permission & Warehouse methods
  getWarehouseFacilities: permissionService.getWarehouseFacilities,
  getMyWarehouseFacilities: permissionService.getMyWarehouseFacilities,
  createWarehouseFacility: permissionService.createWarehouseFacility,
  updateWarehousePermissions: permissionService.updateWarehousePermissions,
  getRoleDefinitions: permissionService.getRoleDefinitions,
  createRole: permissionService.createRole,
  updateRole: permissionService.updateRole,
  deleteRole: permissionService.deleteRole,
  getPermissionMatrix: permissionService.getPermissionMatrix,
  savePermissionMatrix: permissionService.savePermissionMatrix,
  getFeatureMatrix: permissionService.getFeatureMatrix,
  saveFeatureMatrix: permissionService.saveFeatureMatrix,
  getAllowedFeatures: permissionService.getAllowedFeatures,
};

export { staffService, permissionService };
export { NAVBAR_FEATURES } from './permissionService';
