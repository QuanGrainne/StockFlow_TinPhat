// src/features/customers/components/CustomerDetailDrawer.tsx
// Drawer chi tiết hồ sơ khách hàng, công nợ & lịch sử giao dịch (Đã tinh gọn)

import React from 'react';
import { Drawer, Tag, Tabs, Button, Alert } from 'antd';
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  CreditCard,
  AlertTriangle,
  Pencil,
} from 'lucide-react';
import { Customer, CustomerDetail } from '../types';

interface CustomerDetailDrawerProps {
  open: boolean;
  customer: (Customer | CustomerDetail) | null;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  open,
  customer,
  onClose,
  onEdit,
}) => {
  if (!customer) return null;

  const usagePercent =
    customer.creditLimit > 0
      ? Math.round((customer.currentDebt / customer.creditLimit) * 100)
      : 0;

  const recentOrders = (customer as CustomerDetail)?.recentOrders;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      size={560}
      title={
        <div className="flex items-center justify-between pr-4">
          <div className="flex items-center gap-2.5">
            <span className="font-mono font-bold text-base text-[#1E56A0]">
              {customer.code}
            </span>
            <Tag color={customer.status === 'ACTIVE' ? 'success' : 'error'}>
              {customer.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa / Ngừng GD'}
            </Tag>
          </div>
          <Button
            type="primary"
            icon={<Pencil size={13} />}
            onClick={() => onEdit(customer)}
            className="bg-[#0F60B6] text-xs font-semibold"
          >
            Sửa thông tin
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Banner cảnh báo vượt hạn mức nợ */}
        {customer.isOverCreditLimit && (
          <Alert
            message="Cảnh báo công nợ"
            description={`Khách hàng đã vượt quá hạn mức tín dụng cho phép (${currencyFormatter.format(
              customer.creditLimit
            )} đ). Cần thanh toán trước khi xuất thêm đơn hàng.`}
            type="error"
            showIcon
            icon={<AlertTriangle className="text-rose-600" />}
          />
        )}

        {/* Thông tin định danh */}
        <div>
          <h2 className="text-lg font-bold text-slate-800">{customer.name}</h2>
          {customer.subtext && (
            <p className="text-xs text-slate-400 mt-0.5">{customer.subtext}</p>
          )}
        </div>

        {/* Thông tin liên hệ */}
        <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 border border-slate-200/80 text-xs">
          <div className="flex items-center gap-2.5 text-slate-700">
            <Phone size={14} className="text-slate-400" />
            <span className="font-mono font-medium">{customer.phone || 'Chưa cập nhật'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <Mail size={14} className="text-slate-400" />
            <span className="text-slate-600">{customer.email || 'Chưa có email'}</span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-700">
            <MapPin size={14} className="text-slate-400 mt-0.5" />
            <span className="text-slate-600 flex-1">{customer.address || 'Chưa cập nhật địa chỉ'}</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-700">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-slate-500">
              Ngày tạo hồ sơ: {customer.createdAt || 'Hệ thống'}
            </span>
          </div>
        </div>

        {/* Tabs Chi tiết */}
        <Tabs
          defaultActiveKey="credit"
          items={[
            {
              key: 'credit',
              label: 'Hạn mức & Công nợ',
              children: (
                <div className="space-y-4 pt-1">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <CreditCard size={15} />
                        Hạn mức tín dụng cấp:
                      </span>
                      <span className="font-bold text-slate-800 font-mono">
                        {currencyFormatter.format(customer.creditLimit)} đ
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Dư nợ hiện tại:</span>
                      <span
                        className={`font-bold font-mono ${
                          customer.currentDebt > 0 ? 'text-[#D32F2F]' : 'text-slate-700'
                        }`}
                      >
                        {currencyFormatter.format(customer.currentDebt)} đ
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-sm border-t border-slate-200/60 pt-2">
                      <span className="text-slate-500">Hạn mức nợ còn lại:</span>
                      <span
                        className={`font-bold font-mono ${
                          customer.creditLimit - customer.currentDebt >= 0
                            ? 'text-emerald-700'
                            : 'text-rose-600'
                        }`}
                      >
                        {currencyFormatter.format(
                          Math.max(0, customer.creditLimit - customer.currentDebt)
                        )}{' '}
                        đ
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Tỷ lệ sử dụng hạn mức</span>
                        <span className="font-bold text-slate-700">{usagePercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            usagePercent > 100
                              ? 'bg-rose-600'
                              : usagePercent > 80
                              ? 'bg-amber-500'
                              : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(100, usagePercent)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'orders',
              label: 'Đơn hàng gần đây',
              children: (
                <div className="space-y-3 pt-1">
                  {recentOrders && recentOrders.length > 0 ? (
                    recentOrders.map((o) => (
                      <div key={o.orderId} className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span className="text-[#1E56A0] font-mono">{o.orderCode}</span>
                          <span className="text-emerald-600">{o.status || 'Đã giao hàng'}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Ngày: {o.orderDate ? new Date(o.orderDate).toLocaleDateString('vi-VN') : '—'}</span>
                          <span className="font-mono font-bold text-slate-700">{currencyFormatter.format(o.totalAmount)} đ</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      Chưa có dữ liệu đơn hàng gần đây phát sinh cho khách hàng này.
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </Drawer>
  );
};
