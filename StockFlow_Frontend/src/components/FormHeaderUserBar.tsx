'use client';

// Góc phải thanh tiêu đề của các form (Chuyển hàng, Kiểm kho...): chọn Kho làm việc + avatar người dùng.
// Đổi kho ở đây cập nhật kho làm việc toàn hệ thống (useActiveWarehouse).

import React, { useEffect, useState } from 'react';
import { Check, ChevronDown, Warehouse } from 'lucide-react';
import { useActiveWarehouse, type WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import { adminService } from '@/features/roles/services/adminService';

interface Props {
  /** Gọi sau khi người dùng đổi kho làm việc */
  onWarehouseChange?: (warehouse: WarehouseItem) => void;
  /** Khóa chọn kho (VD: đang mở lại phiếu đã gắn kho) */
  lockedWarehouseName?: string;
}

interface StoredUser {
  fullName?: string;
  username?: string;
  code?: string;
  title?: string;
  avatar?: string | null;
  email?: string;
}

function readUser(): StoredUser {
  try {
    const raw = localStorage.getItem('stockflow_user');
    return raw ? (JSON.parse(raw) as StoredUser) : {};
  } catch {
    return {};
  }
}

export function FormHeaderUserBar({ onWarehouseChange, lockedWarehouseName }: Props) {
  const { activeWarehouse, setActiveWarehouse, warehouses } = useActiveWarehouse();
  const [open, setOpen] = useState(false);
  const [user] = useState(readUser);
  const [avatar, setAvatar] = useState<string | null>(user.avatar ?? null);

  const name = user.fullName || user.username || 'Người dùng';
  const code = user.code || '';
  const title = user.title || '';
  const initials = name.slice(0, 2).toUpperCase();

  // Ảnh đại diện lấy từ hồ sơ nhân viên nếu tài khoản đăng nhập chưa có
  useEffect(() => {
    if (avatar) return;
    let alive = true;
    adminService
      .getStaffList()
      .then((list) => {
        const matched = list?.find(
          (s) =>
            (s.username && user.username && s.username.toLowerCase() === user.username.toLowerCase()) ||
            (s.email && user.email && s.email.toLowerCase() === user.email.toLowerCase())
        );
        if (alive && matched?.avatar) setAvatar(matched.avatar);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [avatar, user.username, user.email]);

  const warehouseLabel = lockedWarehouseName || activeWarehouse?.name || 'Chọn kho';

  return (
    <div className="flex items-center gap-3 relative shrink-0">
      <div className="relative">
        <button
          type="button"
          disabled={!!lockedWarehouseName}
          onClick={() => setOpen((v) => !v)}
          className="h-8 px-3 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] hover:border-[#0070f4] text-xs flex items-center gap-2 transition cursor-pointer shadow-2xs disabled:cursor-default disabled:hover:border-slate-300"
          title={lockedWarehouseName ? 'Kho của phiếu đang mở' : 'Chọn chi nhánh kho làm việc'}
        >
          <div className="w-5 h-5 rounded-[4px] bg-[#eff6ff] text-[#0070f4] flex items-center justify-center shrink-0">
            <Warehouse size={12} />
          </div>
          <div className="text-left max-w-[160px] truncate">
            <div className="text-[10px] text-[#677484] font-bold uppercase tracking-wider leading-none">Kho làm việc</div>
            <div className="font-bold text-[#15171a] truncate leading-tight">{warehouseLabel}</div>
          </div>
          {!lockedWarehouseName && (
            <ChevronDown size={13} className={`text-[#677484] transition-transform ${open ? 'rotate-180 text-[#0070f4]' : ''}`} />
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-10 w-64 bg-white rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] border border-slate-200 p-2 z-50">
              <div className="px-2 py-1 text-[10px] font-bold text-[#677484] uppercase tracking-wider border-b border-slate-100 mb-1">
                Chi nhánh kho làm việc
              </div>
              {warehouses.map((w) => {
                const selected = activeWarehouse?.warehouseId === w.warehouseId;
                return (
                  <button
                    key={w.warehouseId}
                    type="button"
                    onClick={() => {
                      setActiveWarehouse(w);
                      setOpen(false);
                      onWarehouseChange?.(w);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-[6px] flex items-center justify-between text-xs cursor-pointer ${
                      selected ? 'bg-[#eff6ff] text-[#0070f4] font-bold' : 'hover:bg-[#f7f8f9]'
                    }`}
                  >
                    <span>{w.name}</span>
                    {selected && <Check size={14} />}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2.5 p-1">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-xs" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#0070f4] text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs">
            {initials}
          </div>
        )}
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[#15171a]">{name}</span>
            {code && (
              <span className="px-1.5 rounded-[4px] bg-[#eff6ff] text-[#1050cf] font-mono text-[10px] font-bold">{code}</span>
            )}
          </div>
          {title && (
            <div className="flex items-center gap-1 text-[11px] text-[#677484] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00b63e]" />
              <span>{title}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
