// src/features/pos/components/ReceiptPrintModal.tsx
// Modal xem trước & In hóa đơn bán hàng chuẩn mẫu Tín Phát K80
// Định dạng chuẩn theo yêu cầu: Ngày dd tháng MM năm yyyy & Thông tin khách hàng 4 mục

import React, { useRef } from 'react';
import { Modal, Button } from 'antd';
import { Printer } from 'lucide-react';
import { PosOrderTab } from '../types';

interface ReceiptPrintModalProps {
  open: boolean;
  onClose: () => void;
  order: PosOrderTab;
  orderCode: string;
  cashierName?: string;
  title?: string;
}

// Định dạng số phân cách hàng nghìn bằng dấu phẩy theo đúng ảnh mẫu (ví dụ: 9,976,700)
const currencyFormatter = new Intl.NumberFormat('en-US');

// Hàm đọc số tiền thành chữ Tiếng Việt chuẩn
function readVietnameseCurrency(num: number): string {
  if (!num || num === 0) return 'Không đồng chẵn';
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup(n: number, isHighest: boolean): string {
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const unit = n % 10;
    let s = '';

    if (!isHighest || hundred > 0) {
      s += digits[hundred] + ' trăm ';
    }

    if (ten === 0) {
      if (unit > 0 && (!isHighest || hundred > 0)) {
        s += 'lẻ ' + digits[unit];
      } else if (unit > 0) {
        s += digits[unit];
      }
    } else if (ten === 1) {
      s += 'mười ';
      if (unit === 1) s += 'một';
      else if (unit === 5) s += 'lăm';
      else if (unit > 0) s += digits[unit];
    } else {
      s += digits[ten] + ' mươi ';
      if (unit === 1) s += 'mốt';
      else if (unit === 4) s += 'tư';
      else if (unit === 5) s += 'lăm';
      else if (unit > 0) s += digits[unit];
    }
    return s.trim();
  }

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];
  let temp = Math.abs(Math.round(num));
  const groups: number[] = [];

  while (temp > 0) {
    groups.push(temp % 1000);
    temp = Math.floor(temp / 1000);
  }

  let words = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const isHighest = i === groups.length - 1;
      const text = readGroup(g, isHighest);
      words += text + ' ' + scales[i] + ' ';
    }
  }

  words = words.trim() + ' đồng chẵn';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export const ReceiptPrintModal: React.FC<ReceiptPrintModalProps> = ({
  open,
  onClose,
  order,
  orderCode,
  title,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Tính toán số tiền
  const itemsSubTotal = order.items.reduce((sum, item) => sum + item.total, 0);
  const itemsDiscount = order.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const rawSubTotal = order.items.reduce(
    (sum, item) => sum + ((item.standardPrice || item.unitPrice) * item.quantity),
    0
  );

  const orderDiscType = order.discountType || 'AMOUNT';
  const orderDiscVal = order.discountValue || 0;
  let computedOrderDiscount = order.discountAmount || 0;
  if (orderDiscType === 'PERCENT' && orderDiscVal > 0) {
    computedOrderDiscount = Math.round(itemsSubTotal * (orderDiscVal / 100));
  }
  computedOrderDiscount = Math.min(itemsSubTotal, Math.max(0, computedOrderDiscount));

  const totalDiscount = itemsDiscount + computedOrderDiscount;
  const finalTotal = Math.max(0, itemsSubTotal - computedOrderDiscount);

  // Ngày tháng có cả chữ cả số: Ngày dd tháng MM năm yyyy
  const orderDateObj = (order as any).orderDate
    ? new Date((order as any).orderDate)
    : (order as any).createdAt
    ? new Date((order as any).createdAt)
    : new Date();
  const dateToUse = isNaN(orderDateObj.getTime()) ? new Date() : orderDateObj;
  const day = String(dateToUse.getDate()).padStart(2, '0');
  const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
  const year = dateToUse.getFullYear();
  const formattedDate = `Ngày ${day} tháng ${month} năm ${year}`;

  // Thông tin khách hàng 4 mục theo yêu cầu:
  // Khách hàng: Khách lẻ (hoặc tên khách)
  // SĐT: (không bắt buộc, có thể trống)
  // Địa chỉ: - - (không bắt buộc, nếu không có hiển thị '- -')
  // Số CCCD: (không bắt buộc, có thể trống)
  const customer = order.selectedCustomer;
  const isWalkIn = !customer || customer.code === 'KH00000' || customer.name.toLowerCase().includes('khách lẻ');

  const customerName = isWalkIn ? 'Khách lẻ' : customer.name;
  const customerPhone = !isWalkIn && customer.phone ? customer.phone.trim() : '';
  const rawAddress = !isWalkIn && customer.address ? customer.address.trim() : '';
  const customerAddress = rawAddress && rawAddress !== '-' ? rawAddress : '- -';
  const customerCccd = !isWalkIn && (customer as any).cccd ? String((customer as any).cccd).trim() : '';

  const isQuotation = orderCode?.startsWith('BG') || title === 'BẢNG BÁO GIÁ';
  const receiptTitle = isQuotation ? 'BẢNG BÁO GIÁ' : (title || 'HÓA ĐƠN BÁN HÀNG');

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
          icon={<Printer size={15} />}
          onClick={handlePrint}
          className="bg-[#0F60B6] hover:bg-blue-700 text-xs font-bold"
        >
          In phiếu bán hàng
        </Button>,
      ]}
      width={520}
      centered
      destroyOnHidden
      className="receipt-modal"
    >
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #stockflow-receipt-print-area,
          #stockflow-receipt-print-area * {
            visibility: visible !important;
          }
          #stockflow-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .ant-modal-mask,
          .ant-modal-wrap,
          .ant-modal-footer,
          .ant-modal-close {
            display: none !important;
          }
        }
      `}</style>

      {/* ─── VÙNG IN HÓA ĐƠN BÁN HÀNG THEO MẪU YÊU CẦU ─── */}
      <div
        id="stockflow-receipt-print-area"
        ref={printRef}
        className="bg-white p-6 font-sans text-slate-900 text-xs leading-normal border border-slate-250 rounded-[6px] mt-2 shadow-sm select-none"
      >
        {/* ─── 1. THÔNG TIN DOANH NGHIỆP ─── */}
        <div className="text-center mb-3">
          <div className="font-bold text-slate-900 text-xs tracking-tight">
            ctytnhhsanxuattinphat
          </div>
          <div className="text-slate-800 text-[11px] mt-0.5">
            Địa chỉ: 1 - - Quận Cẩm Lệ, Đà Nẵng
          </div>
          <div className="text-slate-800 text-[11px]">
            Điện thoại: 0913268079
          </div>

          {/* Tiêu đề & Ngày */}
          <div className="mt-3">
            <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">
              {receiptTitle}
            </h2>
            <div className="text-slate-900 font-semibold text-xs mt-0.5">
              Số HĐ: {orderCode}
            </div>
            <div className="text-slate-700 text-xs mt-0.5">
              {formattedDate}
            </div>
          </div>
        </div>

        {/* ─── 2. THÔNG TIN KHÁCH HÀNG (4 MỤC CHUẨN) ─── */}
        <div className="text-left text-xs space-y-0.5 mb-3 text-slate-900 font-normal">
          <div>
            <span>Khách hàng: </span>
            <span>{customerName}</span>
          </div>
          <div>
            <span>SĐT: </span>
            <span>{customerPhone}</span>
          </div>
          <div>
            <span>Địa chỉ: </span>
            <span>{customerAddress}</span>
          </div>
          <div>
            <span>Số CCCD: </span>
            <span>{customerCccd}</span>
          </div>
        </div>

        {/* ─── 3. BẢNG CHI TIẾT HÀNG HÓA ─── */}
        <div className="border-t-2 border-black">
          {/* Header 3 cột */}
          <div className="flex justify-between items-center font-bold text-xs py-1.5 border-b border-black text-slate-950">
            <div className="w-1/3 text-left">Đơn giá</div>
            <div className="w-1/3 text-center">SL</div>
            <div className="w-1/3 text-right">Thành tiền</div>
          </div>

          {/* Từng dòng sản phẩm */}
          <div>
            {order.items.map((item, idx) => {
              const itemPrice = item.unitPrice || item.standardPrice;
              const lineTotal = item.total || (itemPrice * item.quantity);
              const uomSuffix = item.uom ? ` - (${item.uom.toLowerCase()})` : '';

              return (
                <div key={idx} className="py-2 border-b border-dashed border-black text-xs">
                  {/* Tên hàng hóa và quy cách */}
                  <div className="font-semibold text-slate-950 text-left pb-1">
                    {item.name}{uomSuffix}
                  </div>

                  {/* 3 cột: Đơn giá | SL | Thành tiền */}
                  <div className="flex justify-between items-center text-slate-950">
                    <div className="w-1/3 text-left font-medium">
                      {currencyFormatter.format(itemPrice)}
                    </div>
                    <div className="w-1/3 text-center font-medium">
                      {item.quantity}
                    </div>
                    <div className="w-1/3 text-right font-semibold">
                      {currencyFormatter.format(lineTotal)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── 4. TỔNG KẾT THANH TOÁN ─── */}
        <div className="pt-3 pb-2 text-xs space-y-1">
          <div className="flex justify-between items-center">
            <span className="w-7/12 text-right pr-4 font-bold text-slate-950">
              Tổng tiền hàng:
            </span>
            <span className="w-5/12 text-right font-bold text-slate-950">
              {currencyFormatter.format(rawSubTotal)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="w-7/12 text-right pr-4 font-bold text-slate-950">
              Chiết khấu :
            </span>
            <span className="w-5/12 text-right font-bold text-slate-950">
              {currencyFormatter.format(totalDiscount)}
            </span>
          </div>

          <div className="flex justify-between items-center pt-0.5">
            <span className="w-7/12 text-right pr-4 font-bold text-slate-950">
              Tổng thanh toán:
            </span>
            <span className="w-5/12 text-right font-black text-slate-950">
              {currencyFormatter.format(finalTotal)}
            </span>
          </div>
        </div>

        {/* Số tiền bằng chữ */}
        <div className="text-left text-xs italic text-slate-900 pt-1">
          ({readVietnameseCurrency(finalTotal)})
        </div>

        {/* ─── 5. PHẦN CHÂN PHIẾU ─── */}
        <div className="text-center pt-5 pb-2 text-xs space-y-4">
          <div className="font-bold text-slate-950">
            Quét mã thanh toán
          </div>
          {order.paymentMethod === 'VIETQR' && (
            <div className="flex justify-center">
              <img
                src={`https://api.vietqr.io/image/970422-0913268079-compact.png?amount=${finalTotal}&addInfo=${encodeURIComponent(orderCode)}`}
                alt="VietQR"
                className="w-28 h-28 object-contain border border-slate-200 rounded p-1"
              />
            </div>
          )}

          <div className="italic text-slate-800 text-xs">
            Cảm ơn và hẹn gặp lại!
          </div>
        </div>
      </div>
    </Modal>
  );
};
