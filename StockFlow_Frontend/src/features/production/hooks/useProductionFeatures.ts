// src/features/production/hooks/useProductionFeatures.ts
// Chức năng sản xuất được phân quyền cho tài khoản (ma trận Phân quyền chức năng) để ẩn / hiện nút thao tác.
// Backend vẫn chặn API theo [RequireFeature] nên ẩn nút chỉ là tiện ích giao diện.

'use client';

import { useEffect, useState } from 'react';
import { permissionService } from '@/features/admin/services/permissionService';
import { getStoredRole } from '@/lib/navigation/currentRole';

export interface ProductionFeatures {
  /** Lập / sửa / huỷ / đóng lệnh, điều chỉnh định mức (Manager) */
  canPlan: boolean;
  /** Xuất NVL sản xuất (Production Accountant) */
  canIssue: boolean;
  /** Nhập thành phẩm (Production Accountant) */
  canReceive: boolean;
  /** Định mức BOM (Manager) */
  canManageBom: boolean;
}

function toFeatures(set: Set<string> | null): ProductionFeatures {
  return {
    canPlan: !!set?.has('feat-prod-plan'),
    canIssue: !!set?.has('feat-prod-issue'),
    canReceive: !!set?.has('feat-prod-receipt'),
    canManageBom: !!set?.has('feat-bom'),
  };
}

export function useProductionFeatures(): ProductionFeatures {
  const role = `ROLE_${getStoredRole()}`;
  const [features, setFeatures] = useState<ProductionFeatures>(() => toFeatures(permissionService.peekAllowedFeatures(role)));

  useEffect(() => {
    let stale = false;
    const load = () => {
      permissionService
        .getAllowedFeatures(role)
        .then((set) => {
          if (!stale) setFeatures(toFeatures(set));
        })
        .catch(() => {
          // Hết phiên: apiClient tự chuyển về trang đăng nhập
        });
    };
    load();
    window.addEventListener('stockflow_permissions_updated', load);
    return () => {
      stale = true;
      window.removeEventListener('stockflow_permissions_updated', load);
    };
  }, [role]);

  return features;
}
