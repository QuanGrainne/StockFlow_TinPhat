'use client';

import React, { useEffect, useState } from 'react';
import { Drawer, Tag, Tabs, message } from 'antd';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Wallet,
  ReceiptText,
  Clock,
  Warehouse,
  Pencil,
  Repeat,
  AlertCircle,
} from 'lucide-react';
import { supplierService } from '../services/supplierService';
import { Supplier, SupplierDetail } from '../types';

interface SupplierDetailDrawerProps {
  supplierId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (supplier: Supplier) => void;
  onToggleStatus: (supplierId: number) => Promise<void>;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export default function SupplierDetailDrawer({
  supplierId,
  isOpen,
  onClose,
  onEdit,
  onToggleStatus,
}: SupplierDetailDrawerProps) {
  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('info');

  useEffect(() => {
    if (isOpen && supplierId) {
      loadDetail(supplierId);
    } else {
      setDetail(null);
    }
  }, [isOpen, supplierId]);

  const loadDetail = async (id: number) => {
    setLoading(true);
    try {
      const data = await supplierService.getSupplierById(id);
      setDetail(data);
    } catch (e: any) {
      message.error(e?.message || 'Không thể tải chi tiết nhà cung cấp.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    if (!detail) return;
    await onToggleStatus(detail.partnerId);
    await loadDetail(detail.partnerId);
  };

  if (!isOpen) return null;

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      width={680}
      title={
        <div className="flex items-center justify-between pr-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold text-[#0071BA] bg-blue-50 px-2 py-0.5 rounded">
              {detail?.code || `NCC #${supplierId}`}
            </span>
            <span className="text-base font-bold text-slate-900 truncate max-w-[340px]">
              {detail?.name || 'Chi tiết Nhà cung cấp'}
            </span>
          </div>
          {detail && (
            <Tag color={detail.status === 'ACTIVE' ? 'success' : 'default'}>
              {detail.status === 'ACTIVE' ? 'Đang giao dịch' : 'Ngừng giao dịch'}
            </Tag>
          )}
        </div>
      }
      styles={{
        body: { padding: '16px 24px', backgroundColor: '#fafafa' },
      }}
      footer={
        detail && (
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleToggle}
              className="px-3.5 py-1.5 rounded-[6px] border border-slate-300 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer transition"
            >
              <Repeat size={14} className="text-slate-500" />
              <span>
                {detail.status === 'ACTIVE' ? 'Chuyển Ngừng giao dịch' : 'Kích hoạt giao dịch'}
              </span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-[6px] border border-slate-300 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  onEdit(detail);
                  onClose();
                }}
                className="px-4 py-1.5 rounded-[6px] bg-[#0071BA] hover:bg-[#005f9d] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition shadow-xs"
              >
                <Pencil size={14} />
                <span>Sửa thông tin</span>
              </button>
            </div>
          </div>
        )
      }
    >
      {loading || !detail ? (
        <div className="py-20 text-center text-sm text-slate-400">
          Đang tải dữ liệu hồ sơ nhà cung cấp...
        </div>
      ) : (
        <div className="space-y-4">
          {/* 4 Thống kê tài chính nhanh */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[11px] font-medium text-slate-500 mb-1">Nợ cần trả NCC</div>
              <div
                className={`text-sm font-bold font-mono ${
                  detail.currentPayable > 0 ? 'text-rose-600' : 'text-slate-700'
                }`}
              >
                {currencyFormatter.format(detail.currentPayable)} đ
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[11px] font-medium text-slate-500 mb-1">Hạn mức nợ</div>
              <div className="text-sm font-bold font-mono text-slate-800">
                {currencyFormatter.format(detail.creditLimit)} đ
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[11px] font-medium text-slate-500 mb-1">Tổng tiền nhập hàng</div>
              <div className="text-sm font-bold font-mono text-[#0071BA]">
                {currencyFormatter.format(detail.totalPurchasedAmount)} đ
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
              <div className="text-[11px] font-medium text-slate-500 mb-1">Tổng số phiếu nhập</div>
              <div className="text-sm font-bold text-slate-800">
                {detail.totalReceiptsCount} phiếu
              </div>
            </div>
          </div>

          {/* Tab Chi tiết */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={[
                {
                  key: 'info',
                  label: (
                    <span className="flex items-center gap-1.5 font-medium">
                      <Building2 size={15} />
                      <span>Thông tin hồ sơ</span>
                    </span>
                  ),
                  children: (
                    <div className="space-y-3.5 pt-2 text-sm text-slate-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-slate-400 block mb-0.5">Mã nhà cung cấp</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {detail.code}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block mb-0.5">Loại đối tác</span>
                          <span className="font-medium text-slate-800">
                            {detail.type === 'SUPPLIER' ? 'Nhà cung cấp hàng hóa' : detail.type}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs text-slate-400 block mb-0.5 flex items-center gap-1">
                            <Phone size={12} />
                            <span>Số điện thoại</span>
                          </span>
                          <span className="font-medium text-slate-800">
                            {detail.phone || <em className="text-slate-400 font-normal">Chưa cập nhật</em>}
                          </span>
                        </div>
                        <div>
                          <span className="text-xs text-slate-400 block mb-0.5 flex items-center gap-1">
                            <Mail size={12} />
                            <span>Địa chỉ Email</span>
                          </span>
                          <span className="font-medium text-slate-800">
                            {detail.email || <em className="text-slate-400 font-normal">Chưa cập nhật</em>}
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-slate-400 block mb-0.5 flex items-center gap-1">
                          <MapPin size={12} />
                          <span>Địa chỉ kinh doanh / kho bãi</span>
                        </span>
                        <span className="font-medium text-slate-800">
                          {detail.address || <em className="text-slate-400 font-normal">Chưa cập nhật</em>}
                        </span>
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'receipts',
                  label: (
                    <span className="flex items-center gap-1.5 font-medium">
                      <ReceiptText size={15} />
                      <span>Lịch sử nhập hàng gần đây ({detail.recentReceipts.length})</span>
                    </span>
                  ),
                  children: (
                    <div className="pt-2">
                      {detail.recentReceipts.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-1.5">
                          <AlertCircle size={20} className="text-slate-300" />
                          <span>Chưa có phát sinh phiếu nhập hàng nào từ nhà cung cấp này.</span>
                        </div>
                      ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-[#fafafa] border-b border-slate-200 text-slate-500 font-semibold">
                              <tr>
                                <th className="px-3 py-2">Mã phiếu</th>
                                <th className="px-3 py-2">Ngày nhập</th>
                                <th className="px-3 py-2">Kho nhận</th>
                                <th className="px-3 py-2 text-right">Tổng tiền</th>
                                <th className="px-3 py-2 text-center">Trạng thái</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {detail.recentReceipts.map((r) => (
                                <tr key={r.receiptId} className="hover:bg-blue-50/30">
                                  <td className="px-3 py-2 font-mono font-semibold text-[#0071BA]">
                                    {r.receiptNumber}
                                  </td>
                                  <td className="px-3 py-2 text-slate-500">
                                    {r.receiptDate
                                      ? new Date(r.receiptDate).toLocaleDateString('vi-VN')
                                      : '—'}
                                  </td>
                                  <td className="px-3 py-2 text-slate-600">
                                    {r.warehouseName || 'Kho Tổng'}
                                  </td>
                                  <td className="px-3 py-2 text-right font-mono font-semibold text-slate-900">
                                    {currencyFormatter.format(r.totalAmount)} đ
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <Tag color={r.status === 'COMPLETED' ? 'blue' : 'default'}>
                                      {r.status || 'Hoàn thành'}
                                    </Tag>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      )}
    </Drawer>
  );
}
