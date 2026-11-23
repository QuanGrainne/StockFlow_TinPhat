'use client';

// Cài đặt giao dịch (nút cài đặt cạnh avatar). Từ 24/11/2026 chỉ còn 2 tuỳ chọn, mặc định đều cho phép:
// - Cho phép bán hàng vượt tồn kho (POS)
// - Cho phép chuyển hàng khi âm kho (xuất chuyển khi tồn kho xuất không đủ)
// Các tuỳ chọn cũ đã bỏ: hệ thống luôn nhận đơn đặt hàng, luôn cho chọn thời gian giao dịch (không ở tương lai),
// mã chứng từ luôn theo số thứ tự. Ai được mở / lưu: chức năng "Cài đặt" trong ma trận phân quyền.

import React, { useEffect, useState } from 'react';
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle2, ShieldCheck, Calendar, ShoppingBag, Truck } from 'lucide-react';
import { orderSettingsService } from '../services/orderSettingsService';
import type { OrderSettings } from '../types';

interface OrderSettingsScreenProps {
  onNavigate?: (screenId: string) => void;
}

const DEFAULT_SETTINGS: OrderSettings = {
  settingId: 1,
  allowNegativeStockSale: true,
  allowNegativeStockTransfer: true,
};

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleRow({ icon, title, description, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 hover:border-slate-300 transition bg-white">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-[#e8f2ff] text-[#0071BA] shrink-0">{icon}</div>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-slate-800">{title}</div>
          <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
        </div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0071BA]" />
      </label>
    </div>
  );
}

export function OrderSettingsScreen({ onNavigate }: OrderSettingsScreenProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [settings, setSettings] = useState<OrderSettings>(DEFAULT_SETTINGS);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadSettings = async () => {
    try {
      setLoading(true);
      setSettings(await orderSettingsService.getSettings());
    } catch {
      showToast('error', 'Không thể tải cài đặt.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    orderSettingsService
      .getSettings()
      .then((data) => {
        if (alive) setSettings(data);
      })
      .catch(() => {
        if (alive) showToast('error', 'Không thể tải cài đặt.');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await orderSettingsService.updateSettings({
        allowNegativeStockSale: settings.allowNegativeStockSale,
        allowNegativeStockTransfer: settings.allowNegativeStockTransfer,
      });
      setSettings(updated);
      showToast('success', 'Đã lưu cài đặt.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu cài đặt.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent py-20">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#0071BA] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">Đang tải cài đặt...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-transparent">
      {toast && (
        <div className="fixed top-20 right-6 z-50">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2.5 ${
              toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
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

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#e8f2ff] text-[#0071BA] rounded-xl">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Cài đặt</h1>
              <p className="text-xs text-slate-500 mt-0.5">Quy tắc tồn kho khi bán hàng và chuyển hàng, áp dụng cho toàn hệ thống</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('orders')}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer"
              >
                Quay lại
              </button>
            )}
            <button
              type="button"
              onClick={() => void loadSettings()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              Tải lại
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#0071BA] hover:bg-[#005a94] text-white text-xs font-semibold shadow-sm transition cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Đang lưu...' : 'Lưu cài đặt'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <ToggleRow
            icon={<ShoppingBag className="w-4 h-4" />}
            title="Cho phép bán hàng vượt tồn kho"
            description={
              <>
                Bật: bán hàng (POS) được cả khi tồn kho không đủ, tồn kho có thể âm. Tắt: chặn bán khi số lượng bán vượt tồn kho
                còn lại sau khi trừ hàng khách đã đặt.
              </>
            }
            checked={settings.allowNegativeStockSale}
            onChange={(v) => setSettings({ ...settings, allowNegativeStockSale: v })}
          />
          <ToggleRow
            icon={<Truck className="w-4 h-4" />}
            title="Cho phép chuyển hàng khi âm kho"
            description={
              <>
                Bật: xuất chuyển hàng được cả khi tồn kho chi nhánh xuất không đủ (hệ thống cảnh báo và hỏi xác nhận), tồn kho xuất có
                thể âm. Tắt: chặn xuất chuyển khi số lượng chuyển vượt tồn kho.
              </>
            }
            checked={settings.allowNegativeStockTransfer}
            onChange={(v) => setSettings({ ...settings, allowNegativeStockTransfer: v })}
          />
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              Cập nhật bởi: <strong className="text-slate-800">{settings.updatedByName || '—'}</strong>
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
