// Badge trạng thái Nhà cung cấp — cùng bảng màu với badge trạng thái phiếu Chuyển hàng

export interface SupplierStatusBadge {
  label: string;
  cls: string;
}

const ACTIVE_BADGE: SupplierStatusBadge = {
  label: 'Đang hoạt động',
  cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]',
};

const INACTIVE_BADGE: SupplierStatusBadge = {
  label: 'Ngừng hoạt động',
  cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]',
};

export const getSupplierStatusBadge = (status: string): SupplierStatusBadge =>
  status === 'ACTIVE' ? ACTIVE_BADGE : INACTIVE_BADGE;
