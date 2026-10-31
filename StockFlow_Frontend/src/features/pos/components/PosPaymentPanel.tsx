// src/features/pos/components/PosPaymentPanel.tsx
// VÙNG C — Khu vực Khách hàng, Tổng tiền, Giảm giá nhập tay và Thanh toán
// Đã loại bỏ: VAT, Phí giao hàng, Chi phí kỹ thuật, Chọn bảng giá theo nhóm khách

import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  UserPlus,
  X,
  CreditCard,
  QrCode,
  Banknote,
  FileSpreadsheet,
  Printer,
  PackageCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { PosCustomer, PaymentMethod, PosOrderTab } from '../types';

interface PosPaymentPanelProps {
  order: PosOrderTab;
  allCustomers: PosCustomer[];
  onSelectCustomer: (cust: PosCustomer | null) => void;
  onOpenAddCustomerModal: () => void;
  onChangePaymentMethod: (method: PaymentMethod) => void;
  onChangePrepaidAmount: (amount: number) => void;
  onChangeDiscountAmount: (amount: number) => void;
  onSubmitPayment: (type: 'PAY_AND_PRINT' | 'STOCK_ISSUE_ONLY' | 'DRAFT') => Promise<void>;
  isSubmitting: boolean;
  customerSearchRef?: React.RefObject<HTMLInputElement | null>;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const PosPaymentPanel: React.FC<PosPaymentPanelProps> = ({
  order,
  allCustomers,
  onSelectCustomer,
  onOpenAddCustomerModal,
  onChangePaymentMethod,
  onChangePrepaidAmount,
  onChangeDiscountAmount,
  onSubmitPayment,
  isSubmitting,
  customerSearchRef,
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tính toán số tiền
  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const subTotal = order.items.reduce((sum, item) => sum + item.total, 0);
  const discount = order.discountAmount || 0;
  const finalTotal = Math.max(0, subTotal - discount);

  // Số tiền công nợ phát sinh
  const remainingDebt = Math.max(0, finalTotal - order.prepaidAmount);

  // Kiểm tra điều kiện nợ
  const currentCustomer = order.selectedCustomer;
  const availableCredit = currentCustomer
    ? Math.max(0, currentCustomer.creditLimit - currentCustomer.currentDebt)
    : 0;
  const isCreditEligible = currentCustomer
    ? currentCustomer.creditLimit === 0 || currentCustomer.currentDebt + remainingDebt <= currentCustomer.creditLimit
    : false;
  const isExceedingCredit = currentCustomer && remainingDebt > 0 && !isCreditEligible;

  // Lọc khách hàng theo từ khóa
  const filteredCustomers = React.useMemo(() => {
    if (!customerSearch.trim()) return [];
    const lower = customerSearch.trim().toLowerCase();
    return allCustomers.filter(
      (c) =>
        c.name.toLowerCase().includes(lower) ||
        c.code.toLowerCase().includes(lower) ||
        c.phone.includes(lower)
    );
  }, [customerSearch, allCustomers]);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCustomerDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-white rounded-[6px] border border-slate-200 p-3 shadow-2xs flex flex-col justify-between space-y-3 select-none text-xs h-full">
      {/* ─── 1. Khu vực Chọn & Thông tin Khách hàng (F4) ─── */}
      <div className="space-y-2">
        {/* Thanh tìm kiếm khách hàng */}
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={14} />
              </div>
              <input
                ref={customerSearchRef}
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setCustomerDropdownOpen(true);
                }}
                onFocus={() => {
                  if (customerSearch.trim()) setCustomerDropdownOpen(true);
                }}
                placeholder="Tìm khách hàng (Tên, SĐT, Mã) - F4..."
                className="w-full h-8 pl-8 pr-8 rounded-[5px] bg-slate-50 border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#0F60B6] transition"
              />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[9px] text-slate-500 font-bold">
                F4
              </kbd>
            </div>

            {/* Nút thêm nhanh khách hàng mới */}
            <button
              type="button"
              onClick={onOpenAddCustomerModal}
              className="h-8 w-8 rounded-[5px] bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#0F60B6] flex items-center justify-center transition cursor-pointer shrink-0"
              title="Thêm khách hàng mới nhanh"
            >
              <UserPlus size={15} />
            </button>
          </div>

          {/* Dropdown danh sách khách hàng tìm được */}
          {customerDropdownOpen && customerSearch.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[6px] border border-slate-200 shadow-lg z-50 max-h-60 overflow-y-auto">
              {filteredCustomers.length === 0 ? (
                <div className="p-3 text-center text-slate-400 text-xs">
                  Không tìm thấy khách hàng. Bấm icon bên cạnh để thêm mới.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        onSelectCustomer(cust);
                        setCustomerSearch('');
                        setCustomerDropdownOpen(false);
                      }}
                      className="p-2 hover:bg-blue-50 cursor-pointer transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{cust.name}</div>
                        <div className="text-[11px] text-slate-500">
                          <span className="font-mono text-[#0F60B6] font-semibold">{cust.code}</span>
                          <span className="mx-1">•</span>
                          <span>{cust.phone}</span>
                        </div>
                      </div>
                      <div className="text-right text-[11px]">
                        <span className="text-slate-400 block">Dư nợ:</span>
                        <span className="font-bold text-rose-600 block">
                          {currencyFormatter.format(cust.currentDebt)} đ
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Card hiển thị chi tiết khách hàng đã chọn */}
        {currentCustomer ? (
          <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-200 relative text-xs space-y-1.5">
            {/* Nút bỏ chọn */}
            <button
              type="button"
              onClick={() => onSelectCustomer(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Bỏ chọn khách hàng này"
            >
              <X size={14} />
            </button>

            {/* Tên khách hàng */}
            <div className="pr-6">
              <span className="font-bold text-slate-900 text-xs block truncate" title={currentCustomer.name}>
                {currentCustomer.name}
              </span>
            </div>

            {/* Mã & SĐT */}
            <div className="text-[11px] text-slate-600">
              <span>Mã KH: <strong className="font-mono text-slate-800">{currentCustomer.code}</strong></span>
              <span className="mx-1.5">•</span>
              <span>SĐT: <strong className="text-slate-800">{currentCustomer.phone}</strong></span>
            </div>

            {/* NV Phụ trách & Mã số thuế */}
            <div className="text-[11px] text-slate-600 flex items-center justify-between">
              <span>NV phụ trách: <strong className="text-slate-800">{currentCustomer.salesRep || 'Trần Minh Tuấn'}</strong></span>
              {currentCustomer.taxCode && (
                <span>MST: <strong className="font-mono text-slate-800">{currentCustomer.taxCode}</strong></span>
              )}
            </div>

            {/* Dư nợ & Hạn mức */}
            <div className="pt-1 border-t border-slate-200/80 space-y-0.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Dư nợ hiện tại:</span>
                <span className="font-bold text-rose-600">
                  {currencyFormatter.format(currentCustomer.currentDebt)} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hạn mức tín dụng:</span>
                <span className="font-bold text-slate-800">
                  {currencyFormatter.format(currentCustomer.creditLimit)} đ
                </span>
              </div>
            </div>

            {/* Thanh trạng thái công nợ */}
            <div className="pt-1 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1 font-bold text-emerald-700">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Còn được nợ: {currencyFormatter.format(availableCredit)} đ</span>
              </div>
              <span className={`font-bold ${isCreditEligible ? 'text-emerald-700' : 'text-rose-600'}`}>
                {isCreditEligible ? 'Đủ điều kiện ghi nợ' : 'Vượt hạn mức nợ!'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-[6px] bg-slate-50 border border-dashed border-slate-300 text-center text-slate-400 text-xs">
            Chưa chọn khách hàng (Mặc định: Khách lẻ tại quầy)
          </div>
        )}
      </div>

      {/* ─── 2. Tổng kết đơn hàng & Nhập giảm giá tay (Đã ẩn VAT, Phí VC) ─── */}
      <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
        {/* Tổng tiền hàng */}
        <div className="flex justify-between text-slate-700 items-center">
          <span className="font-medium">Tổng tiền hàng ({totalItemsCount} sản phẩm):</span>
          <span className="font-bold text-slate-900 text-sm">
            {currencyFormatter.format(subTotal)} đ
          </span>
        </div>

        {/* Ô nhập tay số tiền giảm giá trực tiếp */}
        <div className="flex justify-between items-center gap-2">
          <span className="text-slate-600 font-medium">Giảm giá đơn hàng:</span>
          <div className="relative w-36">
            <input
              type="text"
              value={discount === 0 ? '0' : currencyFormatter.format(discount)}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, '');
                const num = parseInt(raw, 10) || 0;
                onChangeDiscountAmount(num);
              }}
              className="w-full h-7 pr-6 pl-2 text-right font-bold text-xs text-rose-600 rounded border border-slate-300 bg-white outline-none focus:border-[#0F60B6]"
              placeholder="0"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-bold pointer-events-none">
              đ
            </span>
          </div>
        </div>

        {/* Khối Highlight Lớn: KHÁCH CẦN THANH TOÁN */}
        <div className="p-3 rounded-[6px] bg-blue-50/60 border border-blue-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              KHÁCH CẦN THANH TOÁN
            </span>
            <span className="text-[10px] text-slate-400 block">Tổng tiền sau giảm giá</span>
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-[#0F60B6] tracking-tight block">
              {currencyFormatter.format(finalTotal)} đ
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. Lưới Phương Thức Thanh Toán (4 Nút) ─── */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
          HÌNH THỨC THANH TOÁN
        </span>

        <div className="grid grid-cols-2 gap-1.5">
          {/* Tiền mặt */}
          <button
            type="button"
            onClick={() => {
              onChangePaymentMethod('CASH');
              onChangePrepaidAmount(finalTotal);
            }}
            className={`h-8 rounded-[5px] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              order.paymentMethod === 'CASH'
                ? 'bg-[#0F60B6] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Banknote size={15} />
            <span>Tiền mặt</span>
          </button>

          {/* VietQR Pro */}
          <button
            type="button"
            onClick={() => {
              onChangePaymentMethod('VIETQR');
              onChangePrepaidAmount(finalTotal);
            }}
            className={`h-8 rounded-[5px] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              order.paymentMethod === 'VIETQR'
                ? 'bg-[#0F60B6] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <QrCode size={15} />
            <span>VietQR Pro</span>
          </button>

          {/* Quẹt thẻ POS */}
          <button
            type="button"
            onClick={() => {
              onChangePaymentMethod('POS_CARD');
              onChangePrepaidAmount(finalTotal);
            }}
            className={`h-8 rounded-[5px] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              order.paymentMethod === 'POS_CARD'
                ? 'bg-[#0F60B6] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CreditCard size={15} />
            <span>Quẹt thẻ POS</span>
          </button>

          {/* Ghi công nợ */}
          <button
            type="button"
            onClick={() => {
              onChangePaymentMethod('DEBT');
              onChangePrepaidAmount(0); // Không trả trước, ghi nợ toàn bộ
            }}
            className={`h-8 rounded-[5px] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              order.paymentMethod === 'DEBT'
                ? 'bg-[#0F60B6] text-white shadow-xs'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet size={15} />
            <span>Ghi công nợ</span>
          </button>
        </div>
      </div>

      {/* ─── 4. Thanh toán một phần & Công nợ ─── */}
      <div className="space-y-1.5 pt-1.5 border-t border-slate-150">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-700">
            Khách thanh toán trước (QR/TM):
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onChangePrepaidAmount(finalTotal)}
              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer transition"
            >
              Đủ tiền
            </button>
          </div>
        </div>

        {/* Input số tiền thanh toán trước */}
        <div className="relative">
          <input
            type="text"
            value={currencyFormatter.format(order.prepaidAmount)}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              const num = parseInt(raw, 10) || 0;
              onChangePrepaidAmount(num);
            }}
            className="w-full h-9 px-3 text-right font-black text-sm text-slate-900 rounded-[5px] border border-slate-300 bg-white outline-none focus:border-[#0F60B6]"
          />
          <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">
            đ
          </span>
        </div>

        {/* Dòng Tính vào công nợ */}
        <div className="flex justify-between items-center text-[11px] pt-1">
          <span className="text-slate-500 font-medium">🗓 Tính vào công nợ:</span>
          <span className="font-bold text-rose-600 text-xs">
            {currencyFormatter.format(remainingDebt)} đ
          </span>
        </div>

        {/* Cảnh báo vượt hạn mức tín dụng nếu có */}
        {isExceedingCredit && (
          <div className="p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-start gap-1.5">
            <AlertTriangle size={13} className="shrink-0 text-rose-600 mt-0.5" />
            <span>
              Công nợ đơn này vượt hạn mức tín dụng cho phép của khách hàng!
            </span>
          </div>
        )}
      </div>

      {/* ─── 5. Các nút hành động chính (F10, Xuất kho, F9) ─── */}
      <div className="space-y-1.5 pt-2 border-t border-slate-200">
        {/* Nút Chính: THANH TOÁN & IN (F10) */}
        <button
          type="button"
          onClick={() => onSubmitPayment('PAY_AND_PRINT')}
          disabled={isSubmitting || order.items.length === 0}
          className="w-full h-11 rounded-[6px] bg-[#0F60B6] hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          title="Thanh toán đơn hàng và in hóa đơn K80 (Phím tắt: F10)"
        >
          {isSubmitting ? (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
            <Printer size={18} />
          )}
          <span>THANH TOÁN & IN (F10)</span>
        </button>

        {/* Hai nút phụ */}
        <div className="grid grid-cols-2 gap-1.5">
          {/* Xuất kho (Không in) */}
          <button
            type="button"
            onClick={() => onSubmitPayment('STOCK_ISSUE_ONLY')}
            disabled={isSubmitting || order.items.length === 0}
            className="h-8 rounded-[5px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
            title="Xác nhận xuất kho mà không in hóa đơn"
          >
            <PackageCheck size={14} className="text-[#0F60B6]" />
            <span>Xuất kho (Không in)</span>
          </button>

          {/* Lưu đơn tạm (F9) */}
          <button
            type="button"
            onClick={() => onSubmitPayment('DRAFT')}
            disabled={isSubmitting || order.items.length === 0}
            className="h-8 rounded-[5px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer disabled:opacity-50"
            title="Lưu đơn hàng vào hàng đợi chờ xử lý (Phím tắt: F9)"
          >
            <Save size={14} className="text-slate-500" />
            <span>Lưu đơn tạm (F9)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
