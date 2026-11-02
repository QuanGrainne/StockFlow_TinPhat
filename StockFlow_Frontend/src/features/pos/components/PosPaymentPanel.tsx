// src/features/pos/components/PosPaymentPanel.tsx
// VÙNG C — Khu vực Khách hàng, Bảng giá bán, Tổng tiền và Thanh toán (Validate CUS, AMT, PAY theo đặc tả)

import React, { useState, useRef, useEffect } from 'react';
import { Popover } from 'antd';
import {
  Search,
  UserPlus,
  X,
  CreditCard,
  QrCode,
  Banknote,
  FileSpreadsheet,
  Printer,
  Save,
  CheckCircle2,
  AlertTriangle,
  Tag,
  Edit3,
} from 'lucide-react';
import { PosCustomer, PaymentMethod, PosOrderTab, PosPriceBook } from '../types';

interface PosPaymentPanelProps {
  order: PosOrderTab;
  allCustomers: PosCustomer[];
  priceBooks: PosPriceBook[];
  onSelectCustomer: (cust: PosCustomer | null) => void;
  onOpenAddCustomerModal: () => void;
  onChangePriceBook: (priceBookId: number) => void;
  onChangePaymentMethod: (method: PaymentMethod) => void;
  onChangePrepaidAmount: (amount: number) => void;
  onChangeDiscountAmount: (amount: number) => void;
  onChangeOrderDiscount?: (type: 'PERCENT' | 'AMOUNT', value: number, amount: number) => void;
  onSubmitPayment: (type: 'PAY_AND_PRINT' | 'STOCK_ISSUE_ONLY' | 'DRAFT') => Promise<void>;
  onOpenReceiptPreview?: () => void;
  isSubmitting: boolean;
  customerSearchRef?: React.RefObject<HTMLInputElement | null>;
  enablePrintQuotation?: boolean;
  onPrintQuotation?: () => void;
  allowNegativeStockSale?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const PosPaymentPanel: React.FC<PosPaymentPanelProps> = ({
  order,
  allCustomers,
  priceBooks,
  onSelectCustomer,
  onOpenAddCustomerModal,
  onChangePriceBook,
  onChangePaymentMethod,
  onChangePrepaidAmount,
  onChangeDiscountAmount,
  onChangeOrderDiscount,
  onSubmitPayment,
  onOpenReceiptPreview,
  isSubmitting,
  customerSearchRef,
  enablePrintQuotation = true,
  onPrintQuotation,
  allowNegativeStockSale = false,
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State quản lý chiết khấu toàn đơn hàng (KiotViet style)
  const [orderDiscType, setOrderDiscType] = useState<'PERCENT' | 'AMOUNT'>(order.discountType || 'AMOUNT');
  const [orderDiscVal, setOrderDiscVal] = useState<number>(order.discountValue || 0);
  const [orderDiscOpen, setOrderDiscOpen] = useState(false);

  useEffect(() => {
    setOrderDiscType(order.discountType || 'AMOUNT');
    setOrderDiscVal(order.discountValue || 0);
  }, [order.discountType, order.discountValue]);

  // Tính toán số tiền thống nhất với Backend (AMT-001 -> AMT-014)
  const totalItemsCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  // Tổng tiền hàng các sản phẩm (sau khi trừ chiết khấu từng mặt hàng)
  const itemsSubTotal = order.items.reduce((sum, item) => sum + item.total, 0);
  // Chiết khấu từng mặt hàng
  const itemLevelDiscount = order.items.reduce((sum, item) => sum + (item.discountAmount || 0), 0);

  // Chiết khấu toàn bộ đơn hàng (chuẩn KiotViet: % hoặc VNĐ)
  const currentOrderDiscType = order.discountType || 'AMOUNT';
  const currentOrderDiscVal = order.discountValue || 0;
  let computedOrderDiscount = order.discountAmount || 0;
  if (currentOrderDiscType === 'PERCENT' && currentOrderDiscVal > 0) {
    computedOrderDiscount = Math.round(itemsSubTotal * (currentOrderDiscVal / 100));
  }
  computedOrderDiscount = Math.min(itemsSubTotal, Math.max(0, computedOrderDiscount));

  const totalDiscount = itemLevelDiscount + computedOrderDiscount;
  const finalTotal = Math.max(0, itemsSubTotal - computedOrderDiscount);

  // Số tiền khách thanh toán trước, tiền thừa và công nợ (PAY-007, PAY-008)
  const prepaidAmount = Math.max(0, order.prepaidAmount || 0);
  const actualPaid = Math.min(prepaidAmount, finalTotal);
  const changeAmount = Math.max(0, prepaidAmount - finalTotal);
  const remainingDebt = Math.max(0, finalTotal - actualPaid);

  // Kiểm tra điều kiện nợ và khách hàng (CUS-006 -> CUS-010, PAY-009)
  const currentCustomer = order.selectedCustomer;
  const isWalkIn = !currentCustomer || currentCustomer.code === 'KH00000' || currentCustomer.name.includes('Khách lẻ');
  const creditLimit = currentCustomer?.creditLimit || 0;
  const currentDebt = currentCustomer?.currentDebt || 0;
  const availableCredit = Math.max(0, creditLimit - currentDebt);

  // Đủ điều kiện ghi nợ: Phải là khách có tài khoản, có hạn mức > 0, và dư nợ + nợ mới <= hạn mức
  const isCreditEligible = !isWalkIn && creditLimit > 0 && currentDebt + remainingDebt <= creditLimit;
  const isExceedingCredit = remainingDebt > 0 && !isCreditEligible;

  // Kiểm tra tồn kho của tất cả sản phẩm trong giỏ (POS-014, INV-006, Group B1)
  const hasOutOfStockItem = allowNegativeStockSale
    ? false
    : order.items.some((i) => i.quantity > i.stockQuantity);

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
      {/* ─── 1. Thanh Hàng Ngang: Tìm khách hàng + Nút (+) + Chọn bảng giá bán ─── */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          {/* 1.1. Ô tìm kiếm khách hàng */}
          <div className="relative flex-1" ref={dropdownRef}>
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
              placeholder="Tìm khách hàng (F4)..."
              className="w-full h-8 pl-8 pr-7 rounded-[5px] bg-slate-50 border border-slate-300 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-[#0F60B6] transition"
            />
            <kbd className="absolute right-1.5 top-1/2 -translate-y-1/2 px-1 py-0.2 bg-slate-100 border border-slate-300 rounded font-mono text-[9px] text-slate-500 font-bold">
              F4
            </kbd>

            {/* Dropdown danh sách khách hàng tìm được */}
            {customerDropdownOpen && customerSearch.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-[6px] border border-slate-200 shadow-lg z-50 max-h-60 overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="p-3 text-center text-slate-400 text-xs">
                    Không tìm thấy khách hàng. Bấm icon [+] để thêm mới.
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

          {/* 1.2. Nút thêm nhanh khách hàng mới (+) */}
          <button
            type="button"
            onClick={onOpenAddCustomerModal}
            className="h-8 w-8 rounded-[5px] bg-blue-50 border border-blue-200 hover:bg-blue-100 text-[#0F60B6] flex items-center justify-center transition cursor-pointer shrink-0"
            title="Thêm khách hàng mới"
          >
            <UserPlus size={15} />
          </button>

          {/* 1.3. Chọn bảng giá bán (Ngang hàng với ô tìm khách và nút +) */}
          <div className="shrink-0 w-36 sm:w-44 relative flex items-center">
            <div className="absolute left-2 text-[#0F60B6] pointer-events-none">
              <Tag size={13} />
            </div>
            <select
              value={order.priceBookId || 1}
              onChange={(e) => onChangePriceBook(Number(e.target.value))}
              className="w-full h-8 pl-6 pr-2 rounded-[5px] bg-blue-50/80 border border-blue-200 text-[11px] font-bold text-[#0F60B6] outline-none hover:bg-blue-100/60 focus:border-[#0F60B6] transition cursor-pointer truncate"
              title="Chọn bảng giá bán áp dụng cho đơn hàng"
            >
              {priceBooks.map((pb) => (
                <option key={pb.priceBookId} value={pb.priceBookId} className="text-slate-800 bg-white font-normal">
                  {pb.priceBookName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Card hiển thị chi tiết khách hàng đã chọn */}
        {currentCustomer ? (
          <div className="p-2.5 rounded-[6px] bg-slate-50 border border-slate-200 relative text-xs space-y-1.5">
            {/* Nút bỏ chọn (Quay về Khách lẻ) */}
            <button
              type="button"
              onClick={() => onSelectCustomer(null)}
              className="absolute top-2 right-2 text-slate-400 hover:text-slate-700 cursor-pointer"
              title="Bỏ chọn khách hàng này (chuyển về Khách lẻ)"
            >
              <X size={14} />
            </button>

            {/* Tên khách hàng & Tag nhóm */}
            <div className="pr-6 flex items-center gap-2">
              <span className="font-bold text-slate-900 text-xs truncate" title={currentCustomer.name}>
                {currentCustomer.name}
              </span>
              {(currentCustomer.code === 'KH00892' || currentCustomer.name.includes('Nam Á')) && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-[#0F60B6] font-bold rounded text-[10px] shrink-0">
                  Đại lý C1
                </span>
              )}
            </div>

            {/* Mã & SĐT */}
            <div className="text-[11px] text-slate-600">
              <span>Mã KH: <strong className="font-mono text-slate-800">{currentCustomer.code}</strong></span>
              <span className="mx-1.5">•</span>
              <span>SĐT: <strong className="text-slate-800">{currentCustomer.phone}</strong></span>
            </div>

            {/* NV Phụ trách */}
            <div className="text-[11px] text-slate-600 flex items-center justify-between">
              <span>NV phụ trách: <strong className="text-slate-800">{currentCustomer.salesRep || 'Trần Minh Tuấn'}</strong></span>
            </div>

            {/* Dư nợ & Hạn mức tín dụng (CUS-006, CUS-007, CUS-008) */}
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
              <span className={`font-bold ${isCreditEligible || remainingDebt === 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {remainingDebt === 0
                  ? 'Đã trả đủ tiền'
                  : isCreditEligible
                  ? 'Đủ điều kiện ghi nợ'
                  : 'Vượt hạn mức nợ!'}
              </span>
            </div>
          </div>
        ) : (
          <div className="p-2.5 rounded-[6px] bg-slate-50 border border-dashed border-slate-300 text-center text-slate-400 text-xs">
            Chưa chọn khách hàng (Mặc định: Khách lẻ tại quầy - Thanh toán 100%)
          </div>
        )}
      </div>

      {/* ─── 2. Tổng kết đơn hàng & Chiết khấu theo bảng giá & VAT (AMT-001 -> AMT-014) ─── */}
      <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
        {/* Tổng tiền hàng */}
        <div className="flex justify-between text-slate-700 items-center">
          <span className="font-medium">Tổng tiền hàng ({totalItemsCount} sản phẩm):</span>
          <span className="font-bold text-slate-900 text-sm">
            {currencyFormatter.format(itemsSubTotal)} đ
          </span>
        </div>

        {/* Dòng Chiết khấu toàn bộ đơn hàng (chuẩn KiotViet: % hoặc VNĐ) */}
        <div className="flex justify-between items-center text-rose-600 relative">
          <Popover
            content={
              <div className="w-60 p-2.5 space-y-2.5 text-xs select-none">
                <div className="font-bold text-slate-800 text-xs flex justify-between items-center pb-1 border-b border-slate-100">
                  <span>Giảm giá toàn bộ hóa đơn</span>
                  <span className="text-[10px] text-slate-400 font-normal">KiotViet</span>
                </div>
                <div className="flex bg-slate-100 p-0.5 rounded-[5px]">
                  <button
                    type="button"
                    onClick={() => setOrderDiscType('AMOUNT')}
                    className={`flex-1 py-1 rounded-[4px] text-xs font-semibold cursor-pointer transition ${orderDiscType === 'AMOUNT' ? 'bg-white text-[#0F60B6] shadow-xs' : 'text-slate-600'}`}
                  >
                    VNĐ
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderDiscType('PERCENT')}
                    className={`flex-1 py-1 rounded-[4px] text-xs font-semibold cursor-pointer transition ${orderDiscType === 'PERCENT' ? 'bg-white text-[#0F60B6] shadow-xs' : 'text-slate-600'}`}
                  >
                    % (Phần trăm)
                  </button>
                </div>
                <div>
                  <input
                    type="number"
                    min={0}
                    max={orderDiscType === 'PERCENT' ? 100 : itemsSubTotal}
                    value={orderDiscVal || ''}
                    onChange={(e) => setOrderDiscVal(Math.max(0, Number(e.target.value) || 0))}
                    placeholder={orderDiscType === 'PERCENT' ? 'Nhập % giảm giá (vd: 10)' : 'Nhập số tiền VNĐ'}
                    className="w-full h-8 px-2.5 rounded border border-slate-300 font-mono font-bold text-xs outline-none focus:border-[#0F60B6]"
                    autoFocus
                  />
                </div>
                {orderDiscType === 'PERCENT' && (
                  <div className="flex gap-1">
                    {[0, 5, 10, 15, 20].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setOrderDiscVal(p)}
                        className="flex-1 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-[#0F60B6] rounded text-[10px] font-semibold border border-slate-200 cursor-pointer"
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex justify-end gap-1.5 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setOrderDiscOpen(false)}
                    className="px-2.5 py-1 text-slate-500 hover:bg-slate-100 rounded text-xs cursor-pointer"
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const amount = orderDiscType === 'PERCENT'
                        ? Math.round(itemsSubTotal * (orderDiscVal / 100))
                        : Math.min(itemsSubTotal, orderDiscVal);
                      if (onChangeOrderDiscount) {
                        onChangeOrderDiscount(orderDiscType, orderDiscVal, amount);
                      } else {
                        onChangeDiscountAmount(amount);
                      }
                      setOrderDiscOpen(false);
                    }}
                    className="px-3 py-1 bg-[#0F60B6] text-white rounded font-bold text-xs hover:bg-blue-700 cursor-pointer shadow-2xs"
                  >
                    Áp dụng
                  </button>
                </div>
              </div>
            }
            trigger="click"
            open={orderDiscOpen}
            onOpenChange={setOrderDiscOpen}
            placement="bottomLeft"
            getPopupContainer={(triggerNode) => triggerNode.parentElement || document.body}
          >
            <button
              type="button"
              className="font-medium flex items-center gap-1.5 hover:underline text-slate-700 hover:text-[#0F60B6] cursor-pointer"
              title="Nhấp để cài đặt giảm giá toàn đơn (% hoặc VNĐ)"
            >
              <span>Giảm giá hóa đơn:</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300 font-bold flex items-center gap-0.5">
                {order.discountType === 'PERCENT' ? `${order.discountValue || 0}%` : 'VNĐ'}
                <Edit3 size={10} className="text-slate-500" />
              </span>
            </button>
          </Popover>

          <span className="font-bold text-xs">
            {computedOrderDiscount > 0
              ? `- ${currencyFormatter.format(computedOrderDiscount)} đ`
              : '0 đ'}
          </span>
        </div>

        {/* Dòng Chiết khấu theo từng mặt hàng (nếu có) */}
        {itemLevelDiscount > 0 && (
          <div className="flex justify-between items-center text-rose-600 text-[11px]">
            <span className="font-medium text-slate-500">
              Chiết khấu sản phẩm ({order.priceBookName || 'từng món'}):
            </span>
            <span className="font-semibold">
              - {currencyFormatter.format(itemLevelDiscount)} đ
            </span>
          </div>
        )}

        {/* Chi phí giao hàng / Kỹ thuật */}
        <div className="flex justify-between items-center text-slate-500">
          <span className="font-medium">Chi phí giao hàng / Kỹ thuật:</span>
          <span className="font-semibold text-emerald-600 text-xs">
            Miễn phí
          </span>
        </div>

        {/* Khối Highlight Lớn: KHÁCH CẦN THANH TOÁN (AMT-008) */}
        <div className="p-3 rounded-[6px] bg-blue-50/60 border border-blue-200/80 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              KHÁCH CẦN THANH TOÁN
            </span>
            {totalDiscount > 0 ? (
              <span className="text-[10px] text-emerald-600 font-medium block">
                Đã áp dụng giảm giá & ưu đãi
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 block">
                Số tiền thực thu tại quầy
              </span>
            )}
          </div>

          <div className="text-right">
            <span className="text-2xl font-black text-[#0F60B6] tracking-tight block">
              {currencyFormatter.format(finalTotal)} đ
            </span>
          </div>
        </div>
      </div>

      {/* ─── 3. Lưới Phương Thức Thanh Toán (PAY-001 -> PAY-003) ─── */}
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

      {/* ─── 4. Thanh toán một phần & Công nợ (PAY-004 -> PAY-008) ─── */}
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
            <button
              type="button"
              onClick={() => onChangePrepaidAmount(20000000)}
              className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold cursor-pointer transition"
            >
              20 Tr
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

        {/* Tiền thừa trả khách (PAY-007) */}
        {changeAmount > 0 && (
          <div className="flex justify-between items-center text-[11px] pt-1 text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200">
            <span className="font-bold flex items-center gap-1">
              <CheckCircle2 size={13} className="text-emerald-600" />
              Tiền thừa trả lại khách:
            </span>
            <span className="font-black text-xs text-emerald-700">
              {currencyFormatter.format(changeAmount)} đ
            </span>
          </div>
        )}

        {/* Dòng Tính vào công nợ nếu còn thiếu */}
        {remainingDebt > 0 && (
          <div className="flex justify-between items-center text-[11px] pt-1">
            <div className="flex items-center gap-1.5 text-rose-700 font-medium">
              <input
                type="checkbox"
                checked={true}
                readOnly
                className="rounded text-[#0F60B6] w-3.5 h-3.5 accent-[#0F60B6]"
              />
              <span>Tính vào công nợ (30 ngày):</span>
            </div>
            <span className="font-bold text-rose-600 text-xs">
              {currencyFormatter.format(remainingDebt)} đ
            </span>
          </div>
        )}

        {/* Các cảnh báo ràng buộc nghiệp vụ (VR-01 -> VR-14, CUS, PAY, INV) */}
        {remainingDebt > 0 && isWalkIn && (
          <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-1.5">
            <AlertTriangle size={13} className="shrink-0 text-amber-600 mt-0.5" />
            <span>
              Khách lẻ tại quầy không được phép ghi nợ (PAY-009). Vui lòng chọn khách hàng có tài khoản hoặc thanh toán đủ 100%.
            </span>
          </div>
        )}

        {remainingDebt > 0 && !isWalkIn && creditLimit <= 0 && (
          <div className="p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-start gap-1.5">
            <AlertTriangle size={13} className="shrink-0 text-rose-600 mt-0.5" />
            <span>
              Khách hàng "{currentCustomer?.name}" chưa được cấp hạn mức tín dụng (Hạn mức: 0 đ). Không thể ghi nợ (CUS-007).
            </span>
          </div>
        )}

        {remainingDebt > 0 && !isWalkIn && creditLimit > 0 && isExceedingCredit && (
          <div className="p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-start gap-1.5">
            <AlertTriangle size={13} className="shrink-0 text-rose-600 mt-0.5" />
            <span>
              Vượt hạn mức nợ! Hạn mức còn lại: {currencyFormatter.format(availableCredit)} đ, Khoản cần nợ: {currencyFormatter.format(remainingDebt)} đ (CUS-009).
            </span>
          </div>
        )}

        {hasOutOfStockItem && (
          <div className="p-2 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-700 flex items-start gap-1.5">
            <AlertTriangle size={13} className="shrink-0 text-rose-600 mt-0.5" />
            <span>
              Giỏ hàng có sản phẩm vượt quá tồn kho khả dụng! Vui lòng điều chỉnh số lượng (POS-014).
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
          disabled={
            isSubmitting ||
            order.items.length === 0 ||
            hasOutOfStockItem ||
            (remainingDebt > 0 && !isCreditEligible)
          }
          className="w-full h-11 rounded-[6px] bg-[#0F60B6] hover:bg-blue-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          title="Thanh toán đơn hàng và in hóa đơn K80 (Phím tắt: F10)"
        >
          {isSubmitting ? (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
            <Printer size={18} />
          )}
          <span>
            {order.paymentMethod === 'CASH'
              ? 'THANH TOÁN TIỀN MẶT & IN (F10)'
              : order.paymentMethod === 'VIETQR'
              ? 'THANH TOÁN VIETQR & IN (F10)'
              : order.paymentMethod === 'POS_CARD'
              ? 'THANH TOÁN THẺ POS & IN (F10)'
              : 'GHI CÔNG NỢ & IN (F10)'}
          </span>
        </button>

        {/* Nút phụ: Lưu đơn tạm (F9) */}
        <div>
          <button
            type="button"
            onClick={() => onSubmitPayment('DRAFT')}
            disabled={isSubmitting || order.items.length === 0}
            className="w-full h-8 rounded-[5px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-50"
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
