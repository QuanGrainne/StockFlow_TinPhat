// src/features/roles/components/common/FeatureGuard.tsx
// Chặn trang theo ma trận Phân quyền chức năng: bỏ tick chức năng thì gõ thẳng đường dẫn
// (VD /pos, /transfers/create) cũng không vào được. API ghi dữ liệu còn bị chặn thêm ở backend.
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff } from 'lucide-react';
import { permissionService } from '../../services/permissionService';
import { featureTitleOf, firstAllowedPath } from '../../config/navbar';
import { getStoredRole } from '../../config/currentRole';

interface NoAccessProps {
  /** Mã chức năng / màn hình bị chặn (để hiện tên chức năng) */
  feature?: string;
  /** Trang được phép để quay về; null = vai trò chưa được phân quyền chức năng nào */
  homePath: string | null;
  fullScreen?: boolean;
}

/** Thông báo không có quyền dùng chức năng */
export const NoAccess: React.FC<NoAccessProps> = ({ feature, homePath, fullScreen }) => {
  const router = useRouter();
  const title = feature ? featureTitleOf(feature) : undefined;
  return (
    <div className={`flex items-center justify-center px-4 ${fullScreen ? 'min-h-screen bg-[#F8FAFC]' : 'py-24'}`}>
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center">
        <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-500">
          <ShieldOff size={22} />
        </div>
        <h2 className="text-base font-bold text-slate-800">Bạn không có quyền truy cập chức năng này</h2>
        <p className="mt-2 text-sm text-slate-500">
          {homePath === null
            ? 'Tài khoản chưa được phân quyền chức năng nào. Vui lòng liên hệ quản trị viên.'
            : `Vai trò của bạn chưa được phân quyền${title ? ` chức năng "${title}"` : ''}. Vui lòng liên hệ quản trị viên nếu cần sử dụng.`}
        </p>
        {homePath !== null && (
          <button
            type="button"
            onClick={() => router.replace(homePath)}
            className="mt-6 inline-flex items-center px-4 py-2 rounded-lg bg-[#0071BA] hover:bg-[#005f9e] text-white text-sm font-semibold cursor-pointer transition"
          >
            Về trang được phép
          </button>
        )}
      </div>
    </div>
  );
};

interface FeatureGuardProps {
  /** Chỉ cần 1 trong các chức năng; hàm nhận query string khi quyền phụ thuộc tham số (VD /purchases/create?po=) */
  anyOf: string[] | ((params: URLSearchParams) => string[]);
  children: React.ReactNode;
}

/** Bọc các trang không dùng khung AppLayout (POS, trang tạo phiếu) */
export const FeatureGuard: React.FC<FeatureGuardProps> = ({ anyOf, children }) => {
  const [state, setState] = useState<{ allowed: boolean; feature: string; home: string | null } | null>(null);

  useEffect(() => {
    let stale = false;
    const check = () => {
      const required = typeof anyOf === 'function' ? anyOf(new URLSearchParams(window.location.search)) : anyOf;
      permissionService
        .getAllowedFeatures(`ROLE_${getStoredRole()}`)
        .then((feats) => {
          if (stale) return;
          setState({
            allowed: required.some((f) => feats.has(f)),
            feature: required[0],
            home: firstAllowedPath(feats),
          });
        })
        .catch(() => {
          // Lỗi tải quyền (VD hết phiên → client tự chuyển về đăng nhập): không hiện nội dung trang
          if (!stale) setState({ allowed: false, feature: required[0], home: '/login' });
        });
    };
    check();
    window.addEventListener('stockflow_permissions_updated', check);
    return () => {
      stale = true;
      window.removeEventListener('stockflow_permissions_updated', check);
    };
  }, [anyOf]);

  if (!state) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f7f9fa] text-sm text-slate-400">Đang kiểm tra quyền...</div>
    );
  }
  if (!state.allowed) return <NoAccess feature={state.feature} homePath={state.home} fullScreen />;
  return <>{children}</>;
};
