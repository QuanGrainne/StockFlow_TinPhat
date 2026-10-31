// src/features/pos/components/ReceiptPrintModal.tsx
// Modal xem trước và in hóa đơn bán hàng chuẩn khổ K80 máy in nhiệt

import React from 'react';
import { Modal, Button } from 'antd';
import { Printer } from 'lucide-react';
import { PosOrderTab } from '../types';

interface ReceiptPrintModalProps {
  open: boolean;
  onClose: () => void;
  order: PosOrderTab;
  orderCode: string;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  open,
  onClose,
  order,
  orderCode,
}) => {
  const subTotal = order.items.reduce((sum, item) => sum + item.total, 0);
  const discount = order.discountAmount || 0;
  const finalTotal = Math.max(0, subTotal - discount);
  const outstanding = Math.max(0, finalTotal - order.prepaidAmount);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose} className="text-xs">
          Đóng lại
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<Printer size={14} />}
          onClick={handlePrint}
          className="bg-[#0F60B6] hover:bg-blue-700 text-xs font-semibold"
        >
          In hóa đơn (K80)
        </Button>,
      ]}
      width={420}
      centered
      destroyOnHidden
    >
      {/* Khổ giấy in K80 (80mm) */}
      <div className="bg-white p-4 font-mono text-slate-900 text-xs leading-relaxed border border-slate-200 rounded-sm mt-3 shadow-inner">
        {/* Header Cửa hàng */}
        <div className="text-center pb-3 border-b border-dashed border-slate-400">
          <h2 className="text-sm font-black uppercase tracking-wider">CÔNG TY CỔ PHẦN THƯƠNG MẠI & PHÂN PHỐI TÍN PHÁT</h2>
          <p className="text-[11px] text-slate-600 mt-0.5">Chi nhánh chính: Kho Tổng Gia Lâm, Hà Nội</p>
          <p className="text-[11px] text-slate-600">Hotline: 1900 6868 • MST: 0108924192</p>
          <h3 className="text-base font-black uppercase mt-2">HÓA ĐƠN BÁN HÀNG</h3>
          <p className="text-[11px] font-bold text-[#0F60B6]">Số HĐ: {orderCode}</p>
          <p className="text-[10px] text-slate-500">Ngày: {new Date().toLocaleString('vi-VN')}</p>
        </div>

        {/* Thông tin Khách hàng */}
        <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
          <div>Khách hàng: <strong>{order.selectedCustomer?.name || 'Khách lẻ tại quầy'}</strong></div>
          {order.selectedCustomer?.phone && (
            <div>Điện thoại: {order.selectedCustomer.phone}</div>
          )}
          {order.selectedCustomer?.code && (
            <div>Mã KH: {order.selectedCustomer.code}</div>
          )}
          <div>Thu ngân: Nguyễn Văn An</div>
        </div>

        {/* Chi tiết mặt hàng */}
        <div className="py-2 border-b border-dashed border-slate-400">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-slate-300 font-bold">
                <th className="pb-1">Tên hàng</th>
                <th className="pb-1 text-center">SL</th>
                <th className="pb-1 text-right">Đ.Giá</th>
                <th className="pb-1 text-right">T.Tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {order.items.map((item, idx) => (
                <tr key={idx} className="py-1">
                  <td className="py-1 pr-1">
                    <div className="font-bold">{item.name}</div>
                    <div className="text-[10px] text-slate-500">{item.code}</div>
                  </td>
                  <td className="py-1 text-center font-bold">{item.quantity}</td>
                  <td className="py-1 text-right">{currencyFormatter.format(item.unitPrice)}</td>
                  <td className="py-1 text-right font-bold">{currencyFormatter.format(item.unitPrice * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tổng kết tiền */}
        <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
          <div className="flex justify-between">
            <span>Tiền hàng:</span>
            <span>{currencyFormatter.format(subTotal)} đ</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Giảm giá:</span>
              <span>- {currencyFormatter.format(discount)} đ</span>
            </div>
          )}
          <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-300">
            <span>TỔNG CỘNG:</span>
            <span className="text-[#0F60B6]">{currencyFormatter.format(finalTotal)} đ</span>
          </div>
          <div className="flex justify-between pt-0.5">
            <span>Đã thanh toán ({order.paymentMethod}):</span>
            <span className="font-bold">{currencyFormatter.format(order.prepaidAmount)} đ</span>
          </div>
          {outstanding > 0 && (
            <div className="flex justify-between text-rose-600 font-bold">
              <span>Còn nợ lại:</span>
              <span>{currencyFormatter.format(outstanding)} đ</span>
            </div>
          )}
        </div>

        {/* Footer Hóa đơn */}
        <div className="text-center pt-3 text-[10px] text-slate-500 space-y-1">
          <p>Cảm ơn Quý khách & Hẹn gặp lại!</p>
          <p>Hệ thống bán hàng StockFlow Enterprise</p>
        </div>
      </div>
    </Modal>
  );
};
