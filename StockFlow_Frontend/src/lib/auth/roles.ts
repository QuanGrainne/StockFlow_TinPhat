// src/lib/auth/roles.ts
// Kiểu vai trò người dùng dùng chung cho lib/ và features/ (chuyển từ features/admin/types ở T15).

export type UserRole = 'SALES' | 'MANAGER' | 'ADMIN' | 'WAREHOUSE' | 'PRODUCTION' | string;
