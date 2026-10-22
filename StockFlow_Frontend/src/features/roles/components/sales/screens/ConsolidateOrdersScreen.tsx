// src/features/roles/components/sales/screens/ConsolidateOrdersScreen.tsx
// Màn hình Gộp đơn hàng xuất kho (Ảnh 3, 4, 5 chuẩn theo thiết kế AI Studio)

import React, { useState } from 'react';
import {
  Check,
  AlertTriangle,
  CreditCard,
  QrCode,
  Banknote,
  X,
  ArrowRight,
  TrendingUp,
  Shield,
  Layers,
} from 'lucide-react';

interface ConsolidateOrdersScreenProps {
  onNavigate?: (screenId: string) => void;
}

export const ConsolidateOrdersScreen: React.FC<ConsolidateOrdersScreenProps> = ({ onNavigate }) => {
  // Selection state
  const [selectedCustomer, setSelectedCustomer] = useState<'AP01' | 'HG03'>('AP01');
  const [selectedOrders, setSelectedOrders] = useState<{ [key: string]: boolean }>({
    'DC-2026-001': true,
    'DC-2026-002': true,
  });

  // Modal 1: Thanh toán & Kiểm tra trần công nợ (Ảnh 4)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CREDIT' | 'VIETQR' | 'CASH'>('CREDIT');
  const [prepaidAmount, setPrepaidAmount] = useState<number>(0);

  // Modal 2: Cảnh báo vượt hạn mức & Đề xuất nâng hạn mức (Ảnh 5)
  const [creditLimitModalOpen, setCreditLimitModalOpen] = useState(false);
  const [activeTabCreditModal, setActiveTabCreditModal] = useState<1 | 2>(1);

  // Computed data for An Phat
  const isAP01 = selectedCustomer === 'AP01';
  const customerInfo = isAP01
    ? {
        name: 'Đại lý Nội thất An Phát',
        code: 'KH-AP01',
        phone: '024 3888 9999',
        approvedLimit: 350000000,
        currentDebt: 320000000,
        ratioPercent: 91.4,
      }
    : {
        name: 'Đại lý Trang trí Hoàng Gia',
        code: 'KH-HG03',
        phone: '0903 222 333',
        approvedLimit: 150000000,
        currentDebt: 145000000,
        ratioPercent: 96.6,
      };

  const totalSelectedNet =
    (selectedOrders['DC-2026-001'] ? 29400000 : 0) +
    (selectedOrders['DC-2026-002'] ? 7800000 : 0);

  const expectedDebt = customerInfo.currentDebt + totalSelectedNet;
  const exceededAmount = Math.max(0, expectedDebt - customerInfo.approvedLimit);

  const toggleOrder = (code: string) => {
    setSelectedOrders((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const selectAll = () => {
    setSelectedOrders({ 'DC-2026-001': true, 'DC-2026-002': true });
  };

  const deselectAll = () => {
    setSelectedOrders({ 'DC-2026-001': false, 'DC-2026-002': false });
  };

  return (
    <div className="space-y-5">
      {/* 1. Header Box */}
      <div className="bg-white p-6 rounded-[8px] border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2B6CB0] flex items-center gap-1.5 uppercase tracking-wide">
            <span>QUY TRÌNH GOM ĐƠN</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Gộp đơn hàng xuất kho
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gộp nhiều đơn hàng của cùng khách hàng để xuất cùng 1 chuyến xe và kiểm soát hạn mức tín dụng
          </p>
        </div>

        {/* Customer Select Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-600">Chọn khách hàng:</span>
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value as any)}
            className="h-9 px-3 pr-8 rounded-[6px] border border-slate-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:border-[#2B6CB0] shadow-2xs cursor-pointer"
          >
            <option value="AP01">KH-AP01 - Đại lý Nội thất An Phát</option>
            <option value="HG03">KH-HG03 - Đại lý Trang trí Hoàng Gia</option>
          </select>
        </div>
      </div>

      {/* 2. Four Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Đại lý tiếp nhận */}
        <div className="bg-white p-4 rounded-[8px] border border-slate-200 shadow-2xs">
          <div className="text-[11px] text-slate-400 font-medium">Đại lý tiếp nhận</div>
          <div className="text-xs font-bold text-slate-900 mt-1">{customerInfo.name}</div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">{customerInfo.phone}</div>
        </div>

        {/* Card 2: Hạn mức tín dụng được duyệt */}
        <div className="bg-white p-4 rounded-[8px] border border-slate-200 shadow-2xs">
          <div className="text-[11px] text-slate-400 font-medium">Hạn mức tín dụng được duyệt</div>
          <div className="text-xs font-bold text-slate-900 mt-1">
            {customerInfo.approvedLimit.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">Mã KH: {customerInfo.code}</div>
        </div>

        {/* Card 3: Dư nợ hiện tại trên hệ thống */}
        <div className="bg-white p-4 rounded-[8px] border border-slate-200 shadow-2xs">
          <div className="text-[11px] text-slate-400 font-medium">Dư nợ hiện tại trên hệ thống</div>
          <div className="text-xs font-bold text-amber-600 mt-1">
            {customerInfo.currentDebt.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Chiếm <strong className="text-amber-700">{customerInfo.ratioPercent}%</strong> trần
          </div>
        </div>

        {/* Card 4: Tình trạng sau gộp đơn */}
        <div className="bg-rose-50/60 p-4 rounded-[8px] border border-rose-200 shadow-2xs">
          <div className="text-[11px] text-rose-700 font-medium">Tình trạng sau gộp đơn</div>
          <div className="text-xs font-bold text-rose-600 mt-1">
            {expectedDebt.toLocaleString('vi-VN')} đ
          </div>
          <div className="text-[11px] text-rose-600 font-bold mt-0.5 flex items-center gap-1">
            <AlertTriangle size={12} />
            <span>Vượt trần: {exceededAmount.toLocaleString('vi-VN')} đ</span>
          </div>
        </div>
      </div>

      {/* 3. Main Workspace Grid: Two Columns (Left: Orders list, Right: Consolidated SKUs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column (5 cols): Đơn hàng chờ của khách */}
        <div className="lg:col-span-5 bg-white p-5 rounded-[8px] border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                ĐƠN HÀNG CHỜ CỦA KHÁCH (2 ĐƠN)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Chọn các đơn cần gộp chung chuyến xuất kho
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="text-[#2B6CB0] font-semibold hover:underline cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Order Item 1 */}
          <div
            onClick={() => toggleOrder('DC-2026-001')}
            className={`p-4 rounded-[8px] border transition cursor-pointer space-y-2 ${
              selectedOrders['DC-2026-001']
                ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!!selectedOrders['DC-2026-001']}
                  onChange={() => {}}
                  className="rounded text-[#2B6CB0] focus:ring-[#2B6CB0] cursor-pointer"
                />
                <span className="font-mono font-bold text-slate-900 text-xs">DC-2026-001</span>
                <span className="text-[11px] text-slate-500 font-medium">Zalo Chat</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900 font-mono text-xs">29.400.000 đ</div>
                <div className="text-[10px] text-slate-400">2 mặt hàng</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 pl-6">
              Đặt lúc: 18/10/2026 08:30
            </div>
            <div className="text-[11px] text-slate-500 pl-6 leading-relaxed">
              Ghi chú: Giao trong giờ hành chính, gọi trước cho anh Hưng kỹ thuật công trình 30 phút.
            </div>
          </div>

          {/* Order Item 2 */}
          <div
            onClick={() => toggleOrder('DC-2026-002')}
            className={`p-4 rounded-[8px] border transition cursor-pointer space-y-2 ${
              selectedOrders['DC-2026-002']
                ? 'border-blue-500 bg-blue-50/30 ring-1 ring-blue-500'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={!!selectedOrders['DC-2026-002']}
                  onChange={() => {}}
                  className="rounded text-[#2B6CB0] focus:ring-[#2B6CB0] cursor-pointer"
                />
                <span className="font-mono font-bold text-slate-900 text-xs">DC-2026-002</span>
                <span className="text-[11px] text-slate-500 font-medium">Điện thoại</span>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-900 font-mono text-xs">7.800.000 đ</div>
                <div className="text-[10px] text-slate-400">2 mặt hàng</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 pl-6">
              Đặt lúc: 18/10/2026 09:15
            </div>
            <div className="text-[11px] text-slate-500 pl-6 leading-relaxed">
              Ghi chú: Gom chung xe với đơn DC-2026-001 giao cùng chuyến để tiết kiệm cước vận chuyển.
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Tổng hợp vật tư gộp & Báo cáo hạn mức */}
        <div className="lg:col-span-7 bg-white p-5 rounded-[8px] border border-slate-200 shadow-2xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  TỔNG HỢP VẬT TƯ GỘP (4 SKU)
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Kho xuất mặc định: Kho Tổng Gia Lâm (WH-HN-01)
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-[4px] bg-blue-50 text-[#2B6CB0] font-semibold text-xs border border-blue-200">
                Đã chọn 2 đơn
              </span>
            </div>

            {/* Table of SKUs */}
            <div className="border border-slate-200 rounded-[6px] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">MÃ SKU</th>
                    <th className="py-2.5 px-3">TÊN SẢN PHẨM</th>
                    <th className="py-2.5 px-3 text-right">TỔNG SL</th>
                    <th className="py-2.5 px-3 text-right">TỔNG NET</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#2B6CB0]">TP-SP01</td>
                    <td className="py-2.5 px-3">Tấm ốp Nano PVC vân đá 9...</td>
                    <td className="py-2.5 px-3 text-right font-medium">150 Tấm</td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono">27.750.000 đ</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#2B6CB0]">TP-KE001</td>
                    <td className="py-2.5 px-3">Keo dán chuyên dụng Tín P...</td>
                    <td className="py-2.5 px-3 text-right font-medium">30 Tuýp 300ml</td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono">1.650.000 đ</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#2B6CB0]">TP-SP02</td>
                    <td className="py-2.5 px-3">Phào chỉ cổ trần PU dát vàn...</td>
                    <td className="py-2.5 px-3 text-right font-medium">60 Cây 2.4m</td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono">5.700.000 đ</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-mono font-semibold text-[#2B6CB0]">TP-SP03</td>
                    <td className="py-2.5 px-3">Nẹp nhôm chữ T mạ Anode</td>
                    <td className="py-2.5 px-3 text-right font-medium">50 Thanh 2.5m</td>
                    <td className="py-2.5 px-3 text-right font-bold font-mono">2.100.000 đ</td>
                  </tr>
                </tbody>
              </table>

              {/* Total Net Row */}
              <div className="bg-slate-50/90 px-4 py-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-800">
                <span>Tổng giá trị thuần đợt gộp:</span>
                <span className="font-mono text-sm text-[#1E56A0]">
                  {totalSelectedNet.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Red Alert Banner: Cảnh báo MSG20 */}
            <div className="p-4 rounded-[8px] bg-rose-50/70 border border-rose-200 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <AlertTriangle size={15} />
                <span>CẢNH BÁO MSG20: Vượt trần hạn mức tín dụng!</span>
              </div>
              <p className="text-xs text-rose-700/90 leading-relaxed">
                Dư nợ dự kiến sau gộp là <strong className="font-bold font-mono text-rose-900">{expectedDebt.toLocaleString('vi-VN')} đ</strong> vượt quá hạn mức được duyệt <strong className="font-bold font-mono">{customerInfo.approvedLimit.toLocaleString('vi-VN')} đ</strong> số tiền <strong className="font-bold font-mono text-rose-900">{exceededAmount.toLocaleString('vi-VN')} đ</strong>.
              </p>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCreditLimitModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-[6px] border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <TrendingUp size={13} />
                  <span>Xin tăng hạn mức</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer of Right Column */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Gộp đơn theo khách hàng</span>
            <button
              type="button"
              onClick={() => setPaymentModalOpen(true)}
              className="h-10 px-5 rounded-[8px] bg-[#1E56A0] hover:bg-[#184682] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-sm"
            >
              <span>Tiến hành thanh toán</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. MODAL 1: THANH TOÁN & KIỂM TRA TRẦN CÔNG NỢ (Ảnh 4)
      ───────────────────────────────────────────────────────────────────────────── */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[12px] shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-slate-800">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#2B6CB0] uppercase tracking-wider flex items-center gap-1.5">
                  <span>ĐỐI SOÁT HẠN MỨC</span>
                  <span className="text-slate-300">•</span>
                  <span className="text-slate-400 normal-case font-normal">Màn hình 3.2.4.5</span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  Thanh toán & Kiểm tra trần công nợ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="p-1 rounded-[6px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Customer summary card */}
              <div className="p-4 rounded-[8px] border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 text-[11px]">Khách hàng:</span>
                    <div className="font-bold text-slate-900 text-xs">
                      Đại lý Nội thất An Phát (KH-AP01)
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px]">Gộp từ 2 đơn hàng:</span>
                    <div className="font-mono font-bold text-[#2B6CB0] text-xs">
                      DC-2026-001, DC-2026-002
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-center">
                  <div>
                    <span className="text-slate-400 text-[10px]">Hạn mức được duyệt:</span>
                    <div className="font-bold text-slate-800 font-mono mt-0.5">350.000.000 đ</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Dư nợ hiện tại:</span>
                    <div className="font-bold text-amber-600 font-mono mt-0.5">320.000.000 đ</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Tổng tiền thuần đơn:</span>
                    <div className="font-bold text-[#1E56A0] font-mono mt-0.5">37.200.000 đ</div>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">Dư nợ dự kiến sau đơn:</span>
                    <div className="font-bold text-rose-600 font-mono mt-0.5">357.200.000 đ</div>
                  </div>
                </div>
              </div>

              {/* Red warning box */}
              <div className="p-4 rounded-[8px] bg-rose-50/70 border border-rose-200 space-y-2">
                <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                  <AlertTriangle size={15} />
                  <span>CẢNH BÁO MSG20: Vượt trần hạn mức tín dụng công nợ!</span>
                </div>
                <p className="text-rose-700 leading-relaxed text-[11px]">
                  Số tiền vượt trần hiện tại là <strong className="font-mono font-bold text-rose-900">7.200.000 đ</strong>. Khách hàng cần trả trước tối thiểu số tiền này qua VietQR/tiền mặt, hoặc nhân viên bán hàng phải gửi yêu cầu xin phê duyệt tăng hạn mức tạm thời đến Quản lý.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPrepaidAmount(7200000)}
                    className="px-3.5 py-1.5 rounded-[6px] bg-rose-600 hover:bg-rose-700 text-white font-bold transition cursor-pointer"
                  >
                    Thu trước 7.200.000 đ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentModalOpen(false);
                      setCreditLimitModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-[6px] border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 font-bold transition cursor-pointer"
                  >
                    Xin tăng hạn mức
                  </button>
                </div>
              </div>

              {/* Payment methods */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Phương thức thanh toán
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {/* Option 1: Ghi nợ công nợ */}
                  <div
                    onClick={() => setPaymentMethod('CREDIT')}
                    className={`p-3 rounded-[8px] border transition cursor-pointer ${
                      paymentMethod === 'CREDIT'
                        ? 'border-[#2B6CB0] bg-blue-50/40 ring-1 ring-[#2B6CB0]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <CreditCard size={15} className="text-[#2B6CB0]" />
                      <span>Ghi nợ công nợ</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Khấu trừ vào hạn mức đại lý</div>
                  </div>

                  {/* Option 2: Chuyển khoản VietQR */}
                  <div
                    onClick={() => setPaymentMethod('VIETQR')}
                    className={`p-3 rounded-[8px] border transition cursor-pointer ${
                      paymentMethod === 'VIETQR'
                        ? 'border-[#2B6CB0] bg-blue-50/40 ring-1 ring-[#2B6CB0]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <QrCode size={15} className="text-emerald-600" />
                      <span>Chuyển khoản VietQR</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Quét mã qua App Ngân hàng</div>
                  </div>

                  {/* Option 3: Tiền mặt */}
                  <div
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-3 rounded-[8px] border transition cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'border-[#2B6CB0] bg-blue-50/40 ring-1 ring-[#2B6CB0]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <Banknote size={15} className="text-amber-600" />
                      <span>Tiền mặt</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Thu trực tiếp tại quầy bán</div>
                  </div>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Số tiền khách thanh toán trước (VNĐ):
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Còn lại đưa vào công nợ:{' '}
                    <strong className="font-mono text-slate-800">
                      {Math.max(0, 37200000 - prepaidAmount).toLocaleString('vi-VN')} đ
                    </strong>
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    value={prepaidAmount}
                    onChange={(e) => setPrepaidAmount(Number(e.target.value))}
                    className="w-full h-10 px-3 pr-12 rounded-[8px] border border-slate-300 text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-[#2B6CB0]"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="h-9 px-4 rounded-[6px] border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="h-9 px-5 rounded-[6px] bg-blue-400 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-xs"
              >
                <span>Xác nhận xuất kho</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          5. MODAL 2: CẢNH BÁO VƯỢT HẠN MỨC & ĐỀ XUẤT NÂNG HẠN MỨC (Ảnh 5)
      ───────────────────────────────────────────────────────────────────────────── */}
      {creditLimitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-in fade-in duration-150">
          <div className="bg-white rounded-[12px] shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden text-slate-800">
            {/* Modal Header with Shield Icon */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 border border-rose-100">
                  <Shield size={18} />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1.5">
                    <span>KIỂM SOÁT TÍN DỤNG</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-400 normal-case font-normal">Màn hình 3.2.4.9</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Cảnh báo vượt hạn mức & Đề xuất nâng hạn mức
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreditLimitModalOpen(false)}
                className="p-1 rounded-[6px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs: 1. Bảng đối soát vượt trần (MSG20) / 2. Trình duyệt Quản lý (Approval) */}
            <div className="flex items-center border-b border-slate-200 px-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTabCreditModal(1)}
                className={`py-3 px-4 border-b-2 transition cursor-pointer ${
                  activeTabCreditModal === 1
                    ? 'border-[#2B6CB0] text-[#2B6CB0] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Bảng đối soát vượt trần (MSG20)
              </button>
              <button
                type="button"
                onClick={() => setActiveTabCreditModal(2)}
                className={`py-3 px-4 border-b-2 transition cursor-pointer ${
                  activeTabCreditModal === 2
                    ? 'border-[#2B6CB0] text-[#2B6CB0] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Trình duyệt Quản lý (Approval)
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs">
              {activeTabCreditModal === 1 ? (
                <>
                  {/* Warning banner */}
                  <div className="p-4 rounded-[8px] bg-rose-50/70 border border-rose-200 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="text-rose-600" />
                      <span className="px-1.5 py-0.5 rounded-[3px] bg-rose-100 text-rose-700 font-bold font-mono text-[10px]">
                        LỖI HỆ THỐNG: MSG20
                      </span>
                      <strong className="text-rose-800 font-bold">Vượt trần bảo lãnh công nợ</strong>
                    </div>
                    <p className="text-[11px] text-rose-700 leading-relaxed pl-6">
                      Tổng dư nợ của khách hàng sau khi gộp đơn mới vượt quá hạn mức tín dụng được duyệt. Hệ thống từ chối tự động sinh phiếu xuất kho cho đến khi được Quản lý phê duyệt hoặc thu tiền mặt/VietQR.
                    </p>
                  </div>

                  {/* THÔNG SỐ ĐỐI CHIẾU CÔNG NỢ KHÁCH HÀNG */}
                  <div className="p-4 rounded-[8px] border border-slate-200 space-y-3">
                    <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      THÔNG SỐ ĐỐI CHIẾU CÔNG NỢ KHÁCH HÀNG
                    </h4>

                    <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[11px]">Mã khách hàng:</span>
                        <div className="font-bold font-mono text-slate-900 text-xs mt-0.5">KH-HG03</div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px]">Tên khách hàng:</span>
                        <div className="font-bold text-slate-900 text-xs mt-0.5">Đại lý Trang trí Hoàng Gia</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 rounded-[6px] bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px]">Hạn mức tín dụng được duyệt:</span>
                        <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                          150.000.000 đ
                        </div>
                      </div>
                      <div className="p-3 rounded-[6px] bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px]">Dư nợ hiện tại:</span>
                        <div className="font-mono font-bold text-slate-900 text-sm mt-0.5">
                          145.000.000 đ
                        </div>
                      </div>
                      <div className="p-3 rounded-[6px] bg-slate-50 border border-slate-200">
                        <span className="text-slate-400 text-[10px]">Nợ phát sinh từ đơn mới:</span>
                        <div className="font-mono font-bold text-[#2B6CB0] text-sm mt-0.5">
                          22.300.000 đ
                        </div>
                      </div>
                      <div className="p-3 rounded-[6px] bg-rose-50/40 border border-rose-200">
                        <span className="text-rose-600 text-[10px]">Tổng nợ dự kiến sau đơn:</span>
                        <div className="font-mono font-bold text-rose-600 text-sm mt-0.5">
                          167.300.000 đ
                        </div>
                      </div>
                    </div>

                    {/* Số tiền vượt hạn mức highlight */}
                    <div className="p-3.5 rounded-[8px] bg-rose-50/80 border border-rose-200 flex items-center justify-between">
                      <span className="text-rose-800 font-semibold text-xs">
                        Số tiền vượt hạn mức (Exceeded Amount):
                      </span>
                      <span className="font-mono font-black text-rose-600 text-base">
                        17.300.000 đ
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* Tab 2: Trình duyệt Quản lý */
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Mức hạn mức tạm thời đề xuất (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      defaultValue={180000000}
                      className="w-full h-9 px-3 rounded-[6px] border border-slate-300 font-mono font-bold text-xs focus:outline-none focus:border-[#2B6CB0]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Lý do đề xuất nới hạn mức tín dụng <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={3}
                      defaultValue="Khách hàng chuẩn bị hoàn thiện công trình dự án lớn, cam kết thanh toán dứt điểm dư nợ cũ trong vòng 7 ngày làm việc."
                      className="w-full p-2.5 rounded-[6px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
                    />
                  </div>
                  <div className="p-3 rounded-[6px] bg-blue-50 border border-blue-200 text-blue-800 text-[11px]">
                    * Tờ trình sẽ được gửi trực tiếp đến hộp thư phê duyệt của Giám đốc Vận hành (Manager).
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCreditLimitModalOpen(false)}
                className="h-9 px-4 rounded-[6px] border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Đóng thông báo
              </button>
              <button
                type="button"
                onClick={() => setActiveTabCreditModal(2)}
                className="h-9 px-4 rounded-[6px] bg-[#1E56A0] hover:bg-[#184682] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              >
                <span>Lập tờ trình Quản lý</span>
                <TrendingUp size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
