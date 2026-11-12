// src/lib/navigation/currentRole.ts
// Vai trò hiện tại của người dùng (đọc từ kết quả đăng nhập lưu trong localStorage).

import { tabSession } from '@/lib/auth/tabSession';
import type { UserRole } from '@/lib/auth/roles';
import { ROLE_SWITCHER_ENABLED } from '@/lib/auth/flags';

const KNOWN_ROLES = ['ADMIN', 'MANAGER', 'SALES', 'WAREHOUSE', 'PRODUCTION'];

export function getStoredRole(): UserRole {
  if (typeof window === 'undefined') return 'SALES';
  const savedRole = tabSession.get('stockflow_current_role');
  // Khi tắt bộ chuyển vai trò, bỏ qua giá trị đã lưu và lấy vai trò thật từ stockflow_user (kết quả login).
  if (ROLE_SWITCHER_ENABLED && savedRole && KNOWN_ROLES.includes(savedRole)) {
    return savedRole;
  }
  const userStr = tabSession.get('stockflow_user');
  if (userStr) {
    try {
      const u = JSON.parse(userStr) as { roles?: unknown; role?: unknown };
      const primaryRoleStr = Array.isArray(u.roles) && u.roles.length > 0 ? u.roles[0] : (u.role ?? '');
      const upper = String(primaryRoleStr).toUpperCase();
      if (upper.includes('ADMIN')) return 'ADMIN';
      if (upper.includes('MGR') || upper.includes('MANAGER')) return 'MANAGER';
      if (upper.includes('WAREHOUSE')) return 'WAREHOUSE';
      if (upper.includes('PROD')) return 'PRODUCTION';
      if (upper.includes('SALES')) return 'SALES';
    } catch {}
  }
  return 'SALES';
}
