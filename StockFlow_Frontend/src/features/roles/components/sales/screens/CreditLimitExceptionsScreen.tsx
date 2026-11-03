// src/features/roles/components/sales/screens/CreditLimitExceptionsScreen.tsx
// Màn hình Ngoại lệ công nợ (Ảnh 1) - Tích hợp Modal Cảnh báo vượt hạn mức & Đề xuất nâng hạn mức

import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  X,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface CreditLimitExceptionsScreenProps {
  onNavigate?: (screenId: string) => void;
}

export const CreditLimitExceptionsScreen: React.FC<CreditLimitExceptionsScreenProps> = () => {
  const [activeTab, setActiveTab] = useState<1 | 2>(1);
  const [modalOpen, setModalOpen] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // Form proposal state
  const [requestedLimit, setRequestedLimit] = useState(180000000);
  const [reason, setReason] = useState(
    'Khách hàng chuẩn bị hoàn thiện công trình dự án lớn, cam kết thanh toán dứt điểm dư nợ cũ trong vòng 7 ngày làm việc.'
  );

  return (
    <div className="space-y-5">
      {/* Background Page Content */}
      <div className="bg-white p-6 rounded-[8px] border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-[#2B6CB0] flex items-center gap-1.5 uppercase tracking-wide">
            <span>KIỂM SOÁT TÍN DỤNG</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400 normal-case font-normal">Màn hình 3.2.4.9</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Ngoại lệ công nợ & Xin nới hạn mức tín dụng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách đối chiếu công nợ các đại lý vượt trần bảo lãnh (Quy tắc MSG20) và quản lý tờ trình phê duyệt
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setModalOpen(true);
          }}
          className="h-9 px-4 rounded-[8px] bg-[#1E56A0] hover:bg-[#184682] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
        >
          <Shield size={16} />
          <span>Mở bảng đối soát vượt trần</span>
        </button>
      </div>

      {/* Summary Card */}
      <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-[4px] bg-rose-50 text-rose-700 font-bold font-mono text-xs border border-rose-200">
              MSG20
            </span>
            <strong className="text-xs font-bold text-slate-800">
              Đại lý Trang trí Hoàng Gia (KH-HG03)
            </strong>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Chờ Quản lý phê duyệt
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400">Hạn mức hiện tại:</span>
            <div className="font-bold text-slate-900 font-mono mt-0.5">150.000.000 đ</div>
          </div>
          <div>
            <span className="text-slate-400">Dư nợ hiện tại:</span>
            <div className="font-bold text-amber-600 font-mono mt-0.5">145.000.000 đ</div>
          </div>
          <div>
            <span className="text-slate-400">Tổng nợ dự kiến sau đơn:</span>
            <div className="font-bold text-rose-600 font-mono mt-0.5">167.300.000 đ</div>
          </div>
          <div>
            <span className="text-slate-400">Số tiền vượt hạn mức:</span>
            <div className="font-bold text-rose-600 font-mono mt-0.5">17.300.000 đ</div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          MODAL: CẢNH BÁO VƯỢT HẠN MỨC & ĐỀ XUẤT NÂNG HẠN MỨC (Chuẩn Ảnh 1)
      ───────────────────────────────────────────────────────────────────────────── */}
      {modalOpen && (
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
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-[6px] text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs: 1. Bảng đối soát vượt trần (MSG20) / 2. Trình duyệt Quản lý (Approval) */}
            <div className="flex items-center border-b border-slate-200 px-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab(1)}
                className={`py-3 px-4 border-b-2 transition cursor-pointer ${
                  activeTab === 1
                    ? 'border-[#2B6CB0] text-[#2B6CB0] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Bảng đối soát vượt trần (MSG20)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(2)}
                className={`py-3 px-4 border-b-2 transition cursor-pointer ${
                  activeTab === 2
                    ? 'border-[#2B6CB0] text-[#2B6CB0] font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Trình duyệt Quản lý (Approval)
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs">
              {activeTab === 1 ? (
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
                  {submitted ? (
                    <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-[8px] border border-emerald-200 text-emerald-800">
                      <CheckCircle2 size={32} className="text-emerald-600 mx-auto" />
                      <div className="font-bold text-sm">Đã gửi tờ trình phê duyệt thành công!</div>
                      <p className="text-[11px] text-emerald-700">
                        Tờ trình số <strong>CLR-2026-001</strong> đã được chuyển đến hộp thư của Giám đốc Vận hành. Bạn sẽ nhận được thông báo ngay khi có kết quả.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Mức hạn mức tạm thời đề xuất (VNĐ) <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="number"
                          value={requestedLimit}
                          onChange={(e) => setRequestedLimit(Number(e.target.value))}
                          className="w-full h-9 px-3 rounded-[6px] border border-slate-300 font-mono font-bold text-xs focus:outline-none focus:border-[#2B6CB0]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Lý do đề xuất nới hạn mức tín dụng <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={3}
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          className="w-full p-2.5 rounded-[6px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
                        />
                      </div>
                      <div className="p-3 rounded-[6px] bg-blue-50 border border-blue-200 text-blue-800 text-[11px]">
                        * Tờ trình sẽ được gửi trực tiếp đến hộp thư phê duyệt của Giám đốc Vận hành (Manager).
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="h-9 px-4 rounded-[6px] border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
              >
                Đóng thông báo
              </button>
              {activeTab === 1 ? (
                <button
                  type="button"
                  onClick={() => setActiveTab(2)}
                  className="h-9 px-4 rounded-[6px] bg-[#1E56A0] hover:bg-[#184682] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <span>Lập tờ trình Quản lý</span>
                  <TrendingUp size={14} />
                </button>
              ) : (
                !submitted && (
                  <button
                    type="button"
                    onClick={() => setSubmitted(true)}
                    className="h-9 px-5 rounded-[6px] bg-[#1E56A0] hover:bg-[#184682] text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <span>Gửi tờ trình</span>
                    <ArrowRight size={14} />
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
