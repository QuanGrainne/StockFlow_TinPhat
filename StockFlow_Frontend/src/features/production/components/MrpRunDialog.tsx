// src/features/production/components/MrpRunDialog.tsx
// Hộp thoại khởi tạo lần chạy MRP (Hoạch định nhu cầu NVL)

'use client';

import React, { useState } from 'react';
import { Calendar, Warehouse, CheckSquare, Square, X, AlertCircle, Loader2 } from 'lucide-react';
import { useActiveWarehouse, useAuthorizedWarehouses } from '@/lib/warehouse/useActiveWarehouse';
import { mrpService } from '../services/mrpService';
import { todayIso } from '../utils/productionFormat';
import { planErrorText } from '../utils/productionPlanFormat';
import type { MrpRunSummary, RunMrpRequest } from '../types';

/** Kỳ tính tối đa (khớp RunMrpCommandValidator.MaxPeriodDays). */
const MAX_PERIOD_DAYS = 366;

/** Cộng ngày theo lịch máy, trả yyyy-MM-dd theo giờ địa phương (không dùng toISOString vì lệch sang ngày UTC). */
function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface MrpRunDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (summary: MrpRunSummary) => void;
}

export function MrpRunDialog({ isOpen, onClose, onSuccess }: MrpRunDialogProps) {
  const { activeWarehouse } = useActiveWarehouse();
  const { warehouses } = useAuthorizedWarehouses();

  // Mặc định kết thúc kỳ sau 30 ngày
  const [periodEnd, setPeriodEnd] = useState<string>(() => addDaysIso(todayIso(), 30));
  const [selectedWarehouseIds, setSelectedWarehouseIds] = useState<number[]>(() => {
    return activeWarehouse?.warehouseId ? [activeWarehouse.warehouseId] : [];
  });
  const [includePendingPlans, setIncludePendingPlans] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleWarehouse = (id: number) => {
    setSelectedWarehouseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllWarehouses = () => {
    if (selectedWarehouseIds.length === warehouses.length) {
      setSelectedWarehouseIds([]);
    } else {
      setSelectedWarehouseIds(warehouses.map((w) => w.warehouseId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    const todayStr = todayIso();
    if (!periodEnd || periodEnd < todayStr || periodEnd > addDaysIso(todayStr, MAX_PERIOD_DAYS)) {
      setError('Ngày cuối kỳ phải từ hôm nay và không quá 366 ngày.');
      return;
    }

    if (selectedWarehouseIds.length === 0) {
      setError('Vui lòng chọn ít nhất một kho áp dụng tính toán.');
      return;
    }

    setLoading(true);
    try {
      const payload: RunMrpRequest = {
        periodEnd,
        warehouseIds: selectedWarehouseIds,
        includePendingPlans,
      };
      const result = await mrpService.runMrp(payload);
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      setError(planErrorText(err, 'Không tính được MRP'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Chạy Hoạch định Nhu cầu NVL (MRP)</h3>
            <p className="text-xs text-gray-500">Tính toán nhu cầu từ KHSX & Lệnh sản xuất, đối chiếu tồn kho và PO</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-6">
            {error && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Ngày kết thúc kỳ */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Kỳ hoạch định tính đến ngày <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Calendar className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="date"
                  required
                  min={todayIso()}
                  max={addDaysIso(todayIso(), MAX_PERIOD_DAYS)}
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Kỳ tính toán bắt đầu từ hôm nay cho đến ngày được chọn.</p>
            </div>

            {/* Chọn kho */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Kho áp dụng <span className="text-red-500">*</span>
                </label>
                {warehouses.length > 1 && (
                  <button
                    type="button"
                    onClick={selectAllWarehouses}
                    className="text-xs font-medium text-blue-600 hover:text-blue-700"
                  >
                    {selectedWarehouseIds.length === warehouses.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                )}
              </div>

              <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-2.5">
                {warehouses.map((w) => {
                  const isChecked = selectedWarehouseIds.includes(w.warehouseId);
                  return (
                    <div
                      key={w.warehouseId}
                      onClick={() => toggleWarehouse(w.warehouseId)}
                      className={`flex cursor-pointer items-center justify-between rounded-md p-2 text-sm transition-colors ${
                        isChecked ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Warehouse className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{w.name}</span>
                        <span className="text-xs text-gray-400">({w.code})</span>
                      </div>
                      {isChecked ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-300" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bao gồm KHSX chờ duyệt */}
            <div className="pt-2">
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includePendingPlans}
                  onChange={(e) => setIncludePendingPlans(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-normal text-gray-700">
                  Bao gồm cả các Kế hoạch sản xuất đang chờ duyệt (Pending)
                </span>
              </label>
              <p className="ml-6 text-xs text-gray-500">
                Mặc định MRP chỉ tính các KHSX đã duyệt và các Lệnh sản xuất đang chạy/chưa bắt đầu.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-3.5 rounded-b-xl">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Đang tính toán...' : 'Bắt đầu tính toán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
