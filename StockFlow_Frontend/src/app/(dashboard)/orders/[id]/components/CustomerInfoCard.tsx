// src/app/(dashboard)/orders/[id]/components/CustomerInfoCard.tsx
// Card hiển thị thông tin khách hàng liên kết với đơn hàng

import React from 'react';
import { User, Phone, Mail, MapPin, FileText, ExternalLink, AlertTriangle } from 'lucide-react';
import { OrderCustomer } from '@/features/orders/types';

interface CustomerInfoCardProps {
  customer: OrderCustomer;
  onViewCustomerDetail?: (partnerId: number) => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({
  customer,
  onViewCustomerDetail,
}) => {
  const hasDebt = customer.currentDebt > 0;

  return (
    <div className="bg-white rounded-[8px] border border-slate-200 p-4 shadow-2xs space-y-3">
      {/* Header Card */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-150">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
          <User size={15} className="text-[#0F60B6]" />
          <span>THÔNG TIN KHÁCH HÀNG</span>
        </div>

        {onViewCustomerDetail && (
          <button
            type="button"
            onClick={() => onViewCustomerDetail(customer.partnerId)}
            className="text-[11px] text-[#0F60B6] font-bold hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Hồ sơ chi tiết</span>
            <ExternalLink size={11} />
          </button>
        )}
      </div>

      {/* Tên & Mã & Nhóm khách hàng */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-slate-900 text-sm hover:text-[#0F60B6] transition">
            {customer.partnerName}
          </span>
          <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-[#0F60B6] shrink-0">
            {customer.partnerGroup}
          </span>
        </div>
        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
          Mã KH: <strong className="text-slate-700">{customer.partnerCode}</strong>
        </div>
      </div>

      {/* Thông tin liên hệ chi tiết */}
      <div className="space-y-1.5 text-xs text-slate-600 pt-1">
        <div className="flex items-center gap-2">
          <Phone size={13} className="text-slate-400 shrink-0" />
          <span>{customer.phone || 'Chưa có số điện thoại'}</span>
        </div>

        {customer.email && (
          <div className="flex items-center gap-2">
            <Mail size={13} className="text-slate-400 shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        )}

        <div className="flex items-start gap-2">
          <MapPin size={13} className="text-slate-400 shrink-0 mt-0.5" />
          <span className="text-[11px] leading-relaxed">{customer.address || 'Chưa cập nhật địa chỉ'}</span>
        </div>

        {customer.taxCode && (
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-slate-400 shrink-0" />
            <span>MST: {customer.taxCode}</span>
          </div>
        )}
      </div>

      {/* Công nợ hiện tại của khách */}
      <div className="pt-2 border-t border-slate-150 flex items-center justify-between text-xs bg-slate-50/80 p-2.5 rounded-[6px]">
        <span className="text-slate-600 font-medium">Nợ hiện tại của KH:</span>
        <div className="text-right">
          <span className={`font-bold ${hasDebt ? 'text-rose-600' : 'text-emerald-700'}`}>
            {currencyFormatter.format(customer.currentDebt)} đ
          </span>
          {customer.creditLimit > 0 && (
            <div className="text-[10px] text-slate-400">
              Hạn mức: {currencyFormatter.format(customer.creditLimit)} đ
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

