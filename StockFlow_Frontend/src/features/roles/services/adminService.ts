// src/features/roles/services/adminService.ts
// Service xử lý API cho phân hệ Admin (Quản trị người dùng & Phân quyền Kho OIMS)

import { SystemUser, UserRole } from '../types';
import { INITIAL_SYSTEM_USERS } from '../data/mockData';

let systemUsers = [...INITIAL_SYSTEM_USERS];

export const adminService = {
  // Lấy danh sách tài khoản hệ thống
  async getUsers(search?: string, roleFilter?: string): Promise<SystemUser[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    let list = [...systemUsers];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.userCode.toLowerCase().includes(q) ||
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.phone.includes(q)
      );
    }

    if (roleFilter && roleFilter !== 'ALL') {
      list = list.filter((u) => u.role === roleFilter);
    }

    return list;
  },

  // Tạo tài khoản nhân viên mới
  async createUser(payload: Omit<SystemUser, 'id' | 'lastLogin'>): Promise<SystemUser> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const newUser: SystemUser = {
      ...payload,
      id: `USR-${Date.now()}`,
      lastLogin: 'Chưa đăng nhập',
    };
    systemUsers.unshift(newUser);
    return newUser;
  },

  // Cập nhật tài khoản / Phân quyền kho
  async updateUser(
    id: string,
    updates: Partial<Omit<SystemUser, 'id'>>
  ): Promise<SystemUser> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const idx = systemUsers.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Không tìm thấy người dùng');
    systemUsers[idx] = { ...systemUsers[idx], ...updates };
    return systemUsers[idx];
  },

  // Khóa / Mở khóa tài khoản
  async toggleUserStatus(id: string): Promise<SystemUser> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const idx = systemUsers.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('Không tìm thấy người dùng');
    systemUsers[idx] = {
      ...systemUsers[idx],
      status: systemUsers[idx].status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
    };
    return systemUsers[idx];
  },
};
