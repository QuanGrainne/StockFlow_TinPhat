'use client';

import React, { useEffect, useState } from 'react';
import {
  Settings,
  Save,
  RotateCcw,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Hash,
  ShoppingBag,
  Truck,
  FileText,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  Info,
} from 'lucide-react';
import { orderSettingsService } from '../services/orderSettingsService';
import { OrderSettings, OrderCodeRule } from '../types';

interface OrderSettingsScreenProps {
  onNavigate?: (screenId: string) => void;
}

export function OrderSettingsScreen({ onNavigate }: OrderSettingsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [settings, setSettings] = useState<OrderSettings>({
    settingId: 1,
    enableOrderPlacement: true,
    allowOrderWhenOutOfStock: true,
    allowSellingReservedStock: false,
    allowTransferringOrderBranch: true,
    allowNegativeStockSale: false,
    enablePrintQuotation: true,
    confirmBeforeCompleteOrder: false,
    enableReturnTimeLimit: true,
    returnTimeLimitDays: 30,
    lockTransactionTime: true,
    orderCodeRule: 'SEQUENTIAL',
    orderCodePrefix: 'HD',
    bookingCodePrefix: 'DH',
    returnCodePrefix: 'TH',
    transferCodePrefix: 'CK',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await orderSettingsService.getSettings();
      setSettings(data);
    } catch (err: any) {
      showToast('error', 'Không thể tải cấu hình thiết lập đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await orderSettingsService.updateSettings({
        enableOrderPlacement: settings.enableOrderPlacement,
        allowOrderWhenOutOfStock: settings.allowOrderWhenOutOfStock,
        allowSellingReservedStock: settings.allowSellingReservedStock,
        allowTransferringOrderBranch: settings.allowTransferringOrderBranch,
        allowNegativeStockSale: settings.allowNegativeStockSale,
        enablePrintQuotation: settings.enablePrintQuotation,
        confirmBeforeCompleteOrder: settings.confirmBeforeCompleteOrder,
        enableReturnTimeLimit: settings.enableReturnTimeLimit,
        returnTimeLimitDays: Number(settings.returnTimeLimitDays) || 0,
        lockTransactionTime: settings.lockTransactionTime,
        orderCodeRule: settings.orderCodeRule,
        orderCodePrefix: settings.orderCodePrefix.trim() || 'HD',
        bookingCodePrefix: settings.bookingCodePrefix.trim() || 'DH',
        returnCodePrefix: settings.returnCodePrefix.trim() || 'TH',
        transferCodePrefix: settings.transferCodePrefix.trim() || 'CK',
      });
      setSettings(updated);
      showToast('success', 'Đã lưu cấu hình thiết lập đơn hàng và quy tắc giao dịch thành công!');
    } catch (err: any) {
      showToast('error', err?.message || 'Có lỗi xảy ra khi lưu thiết lập.');
    } finally {
      setSaving(false);
    }
  };

  // Preview helper for code rule
  const getPreviewCode = (prefix: string, rule: OrderCodeRule) => {
    const p = prefix || 'HD';
    if (rule === 'DATETIME') return `${p}261101143001`;
    if (rule === 'RANDOM') return `${p}-A7K9M2P`;
    return `${p}000123`;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#1E56A0] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-slate-500 font-medium">Đang tải thiết lập đơn hàng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-transparent">
      {/* Toast alert */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in fade-in slide-in-from-top-4">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2.5 ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#1E56A0]/10 text-[#1E56A0] rounded-xl">
                <Settings className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  Thiết lập đơn hàng & Quy tắc giao dịch
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Quản lý các quy tắc nghiệp vụ đặt hàng, xuất kho, bán hàng và sinh mã chứng từ StockFlow
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('orders')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                title="Quay lại danh sách Quản lý đơn hàng"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>Quản lý đơn hàng</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadSettings}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Tải lại
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu thiết lập</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Group A: Đặt hàng */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="w-4 h-4 text-[#1E56A0]" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Nhóm A: Nghiệp vụ Đặt hàng (Order Placement)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">B2B & Đặt trước</span>
          </div>

          <div className="p-5 space-y-4">
            {/* A1 */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition bg-slate-50/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1E56A0] bg-blue-50 px-1.5 py-0.5 rounded">A1</span>
                  <span className="text-sm font-semibold text-slate-800">
                    Bật/tắt tiếp nhận đơn đặt hàng mới
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cho phép nhân viên kinh doanh tạo đơn đặt hàng mới (trạng thái Chờ xử lý / PENDING). Khi tắt, hệ thống từ chối tiếp nhận các đơn đặt hàng mới. (Đơn bán trực tiếp tại quầy POS vẫn hoạt động bình thường).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={settings.enableOrderPlacement}
                  onChange={(e) => setSettings({ ...settings, enableOrderPlacement: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E56A0]"></div>
              </label>
            </div>

            {/* A2 */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition bg-slate-50/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1E56A0] bg-blue-50 px-1.5 py-0.5 rounded">A2</span>
                  <span className="text-sm font-semibold text-slate-800">
                    Cho phép đặt hàng khi hết tồn kho
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cho phép khách hàng lên đơn đặt trước ngay cả khi sản phẩm trong kho đang có số lượng tồn bằng 0 (hàng chờ sản xuất hoặc chờ nhập về kho).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={settings.allowOrderWhenOutOfStock}
                  onChange={(e) => setSettings({ ...settings, allowOrderWhenOutOfStock: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E56A0]"></div>
              </label>
            </div>

            {/* A3 */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition bg-slate-50/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1E56A0] bg-blue-50 px-1.5 py-0.5 rounded">A3</span>
                  <span className="text-sm font-semibold text-slate-800">
                    Sử dụng hàng đang tạm giữ cho đơn đặt hàng khác
                  </span>
                  <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    Tồn tạm giữ
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Khi bật, nhân viên bán hàng hoặc điều chuyển được phép xuất bán cả lượng hàng đang được giữ cho các đơn đặt hàng trước. Khi tắt, hệ thống sẽ bảo vệ lượng hàng tạm giữ và chặn xuất vượt số lượng khả dụng.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={settings.allowSellingReservedStock}
                  onChange={(e) => setSettings({ ...settings, allowSellingReservedStock: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E56A0]"></div>
              </label>
            </div>

            {/* A4 */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition bg-slate-50/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#1E56A0] bg-blue-50 px-1.5 py-0.5 rounded">A4</span>
                  <span className="text-sm font-semibold text-slate-800">
                    Cho phép chuyển đơn đặt hàng sang chi nhánh/kho khác
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cho phép phân công điều chuyển đơn hàng giữa các kho (ví dụ: giao hàng từ kho trung tâm sang một chi nhánh khác).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={settings.allowTransferringOrderBranch}
                  onChange={(e) => setSettings({ ...settings, allowTransferringOrderBranch: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E56A0]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Group B: Bán hàng & POS */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Nhóm B: Bán hàng & Xuất kho (Sales & POS Execution)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Bán lẻ & POS</span>
          </div>

          <div className="p-5 space-y-4">
            {/* B1 */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition bg-slate-50/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">B1</span>
                  <span className="text-sm font-semibold text-slate-800">
                    Bán hàng vượt tồn kho (Bán âm kho)
                  </span>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                    settings.allowNegativeStockSale
                      ? 'bg-rose-50 border-rose-200 text-rose-700'
                      : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}>
                    {settings.allowNegativeStockSale ? 'Đang bật bán âm' : 'Chặn xuất âm'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Khi bật, thu ngân có thể bấm thanh toán và xuất hóa đơn ngay cả khi số lượng tồn kho trên phần mềm bằng 0 hoặc không đủ (hàng thực tế đã về kho nhưng chưa kịp nhập liệu). Khi tắt, hệ thống sẽ chặn giao dịch và báo lỗi tồn kho không đủ (POS-014, INV-006).
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={settings.allowNegativeStockSale}
                  onChange={(e) => setSettings({ ...settings, allowNegativeStockSale: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* B2 */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition bg-slate-50/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">B2</span>
                  <span className="text-sm font-semibold text-slate-800">
                    Bật nút in báo giá tại màn hình bán hàng (POS)
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hiển thị nút "In báo giá" tại thanh tác vụ POS, cho phép in phiếu báo giá tạm thời cho khách hàng trước khi bấm hoàn tất thanh toán.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={settings.enablePrintQuotation}
                  onChange={(e) => setSettings({ ...settings, enablePrintQuotation: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E56A0]"></div>
              </label>
            </div>

            {/* B3 */}
            <div className="flex items-start justify-between gap-4 p-3.5 rounded-lg border border-slate-100 hover:border-slate-200 transition bg-slate-50/30">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">B3</span>
                  <span className="text-sm font-semibold text-slate-800">
                    Hộp thoại xác nhận trước khi hoàn tất giao dịch POS
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hiển thị modal tóm tắt xác nhận (tổng tiền, số tiền khách trả, công nợ phát sinh) trước khi trừ kho và lưu đơn hàng, giúp tránh tình trạng bấm nhầm hoặc thao tác quá nhanh.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={settings.confirmBeforeCompleteOrder}
                  onChange={(e) => setSettings({ ...settings, confirmBeforeCompleteOrder: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E56A0]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Group C & D: Trả hàng & Thời gian */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Group C: Trả hàng */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="w-4 h-4 text-purple-600" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Nhóm C: Chính sách Trả hàng
                  </h2>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded">C1</span>
                      <span className="text-sm font-semibold text-slate-800">
                        Giới hạn thời gian đổi trả hàng
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Bật giới hạn ngày được phép tiếp nhận trả hàng kể từ ngày mua đơn gốc.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={settings.enableReturnTimeLimit}
                      onChange={(e) => setSettings({ ...settings, enableReturnTimeLimit: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {settings.enableReturnTimeLimit && (
                  <div className="p-3.5 rounded-lg border border-purple-100 bg-purple-50/30 space-y-2 animate-in fade-in">
                    <label className="block text-xs font-semibold text-slate-700">
                      Số ngày tối đa được phép đổi trả:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="365"
                        value={settings.returnTimeLimitDays}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            returnTimeLimitDays: Math.max(0, parseInt(e.target.value) || 0),
                          })
                        }
                        className="w-28 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#1E56A0]"
                      />
                      <span className="text-xs text-slate-600 font-medium">ngày kể từ ngày xuất đơn hàng</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Group D: Thời gian giao dịch */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col justify-between">
            <div>
              <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    Nhóm D: Thời gian giao dịch
                  </h2>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-slate-100 bg-slate-50/30">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">D1</span>
                      <span className="text-sm font-semibold text-slate-800">
                        Khóa ngày giao dịch (Thời gian thực)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Khi bật, nhân viên bán hàng không được chỉnh sửa ngày tạo đơn; chứng từ luôn ghi nhận theo thời gian thực (Server UTC+7). Khi tắt, cho phép chọn ngày lập chứng từ.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input
                      type="checkbox"
                      checked={settings.lockTransactionTime}
                      onChange={(e) => setSettings({ ...settings, lockTransactionTime: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
                  <Info className="w-4 h-4 text-[#1E56A0] shrink-0 mt-0.5" />
                  <span>
                    Chính sách khuyến nghị: <strong>Bật khóa ngày giao dịch</strong> để ngăn chặn gian lận lùi ngày doanh số hoặc sai lệch kỳ báo cáo tài chính kho.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Group E: Quy tắc sinh mã */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Hash className="w-4 h-4 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Nhóm E: Quy tắc sinh mã chứng từ (Code Generation Rules)
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">Định dạng & Tiền tố</span>
          </div>

          <div className="p-5 space-y-6">
            {/* Rule selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                1. Định dạng cấu trúc sinh mã
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* SEQUENTIAL */}
                <div
                  onClick={() => setSettings({ ...settings, orderCodeRule: 'SEQUENTIAL' })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    settings.orderCodeRule === 'SEQUENTIAL'
                      ? 'border-[#1E56A0] bg-blue-50/40 ring-1 ring-[#1E56A0]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">Tự tăng tuần tự (Mặc định)</span>
                    <input
                      type="radio"
                      name="orderCodeRule"
                      checked={settings.orderCodeRule === 'SEQUENTIAL'}
                      onChange={() => setSettings({ ...settings, orderCodeRule: 'SEQUENTIAL' })}
                      className="text-[#1E56A0]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Mã tăng dần liên tục theo số thứ tự (ví dụ: {settings.orderCodePrefix}000001, {settings.orderCodePrefix}000002).
                  </p>
                  <span className="text-xs font-mono font-bold text-[#1E56A0] bg-white px-2 py-1 rounded border border-slate-200 self-start">
                    {getPreviewCode(settings.orderCodePrefix, 'SEQUENTIAL')}
                  </span>
                </div>

                {/* DATETIME */}
                <div
                  onClick={() => setSettings({ ...settings, orderCodeRule: 'DATETIME' })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    settings.orderCodeRule === 'DATETIME'
                      ? 'border-[#1E56A0] bg-blue-50/40 ring-1 ring-[#1E56A0]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">Theo ngày giờ giao dịch</span>
                    <input
                      type="radio"
                      name="orderCodeRule"
                      checked={settings.orderCodeRule === 'DATETIME'}
                      onChange={() => setSettings({ ...settings, orderCodeRule: 'DATETIME' })}
                      className="text-[#1E56A0]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Ghép ngày giờ năm-tháng-ngày-giờ-phút kèm số thứ tự (ví dụ: {settings.orderCodePrefix}261101143001).
                  </p>
                  <span className="text-xs font-mono font-bold text-[#1E56A0] bg-white px-2 py-1 rounded border border-slate-200 self-start">
                    {getPreviewCode(settings.orderCodePrefix, 'DATETIME')}
                  </span>
                </div>

                {/* RANDOM */}
                <div
                  onClick={() => setSettings({ ...settings, orderCodeRule: 'RANDOM' })}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    settings.orderCodeRule === 'RANDOM'
                      ? 'border-[#1E56A0] bg-blue-50/40 ring-1 ring-[#1E56A0]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900">Chuỗi ngẫu nhiên (Bảo mật)</span>
                    <input
                      type="radio"
                      name="orderCodeRule"
                      checked={settings.orderCodeRule === 'RANDOM'}
                      onChange={() => setSettings({ ...settings, orderCodeRule: 'RANDOM' })}
                      className="text-[#1E56A0]"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Chuỗi ký tự ngẫu nhiên tránh khách đoán được quy mô đơn hàng (ví dụ: {settings.orderCodePrefix}-A7K9M2P).
                  </p>
                  <span className="text-xs font-mono font-bold text-[#1E56A0] bg-white px-2 py-1 rounded border border-slate-200 self-start">
                    {getPreviewCode(settings.orderCodePrefix, 'RANDOM')}
                  </span>
                </div>
              </div>
            </div>

            {/* Prefixes configuration */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
                2. Cấu hình tiền tố chứng từ (Prefixes)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Order prefix */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Hóa đơn bán hàng (POS)</label>
                    <span className="text-[10px] text-slate-400">Mặc định: HD</span>
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={settings.orderCodePrefix}
                    onChange={(e) => setSettings({ ...settings, orderCodePrefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-mono font-bold text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-[#1E56A0]"
                  />
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                    <span>Mẫu sinh:</span>
                    <span className="font-mono font-semibold text-[#1E56A0]">
                      {getPreviewCode(settings.orderCodePrefix, settings.orderCodeRule)}
                    </span>
                  </div>
                </div>

                {/* Booking prefix */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Đơn đặt hàng (Booking)</label>
                    <span className="text-[10px] text-slate-400">Mặc định: DH</span>
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={settings.bookingCodePrefix}
                    onChange={(e) => setSettings({ ...settings, bookingCodePrefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-mono font-bold text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-[#1E56A0]"
                  />
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                    <span>Mẫu sinh:</span>
                    <span className="font-mono font-semibold text-[#1E56A0]">
                      {getPreviewCode(settings.bookingCodePrefix, settings.orderCodeRule)}
                    </span>
                  </div>
                </div>

                {/* Return prefix */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Phiếu trả hàng (Return)</label>
                    <span className="text-[10px] text-slate-400">Mặc định: TH</span>
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={settings.returnCodePrefix}
                    onChange={(e) => setSettings({ ...settings, returnCodePrefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-mono font-bold text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-[#1E56A0]"
                  />
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                    <span>Mẫu sinh:</span>
                    <span className="font-mono font-semibold text-[#1E56A0]">
                      {getPreviewCode(settings.returnCodePrefix, settings.orderCodeRule)}
                    </span>
                  </div>
                </div>

                {/* Transfer prefix */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800">Phiếu chuyển kho (Transfer)</label>
                    <span className="text-[10px] text-slate-400">Mặc định: CK</span>
                  </div>
                  <input
                    type="text"
                    maxLength={10}
                    value={settings.transferCodePrefix}
                    onChange={(e) => setSettings({ ...settings, transferCodePrefix: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-sm font-mono font-bold text-slate-900 uppercase focus:outline-hidden focus:ring-2 focus:ring-[#1E56A0]"
                  />
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200">
                    <span>Mẫu sinh:</span>
                    <span className="font-mono font-semibold text-[#1E56A0]">
                      {getPreviewCode(settings.transferCodePrefix, settings.orderCodeRule)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Audit info card */}
        <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Bảng cấu hình đơn hàng duy nhất (Singleton Record ID: {settings.settingId}). Cập nhật bởi:{' '}
              <strong className="text-slate-800">{settings.updatedByName || 'Quản trị viên'}</strong>
            </span>
          </div>
          {settings.updatedAt && (
            <div className="flex items-center gap-1.5 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Cập nhật lần cuối: {new Date(settings.updatedAt).toLocaleString('vi-VN')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

