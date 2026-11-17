'use client';

// Nhu cầu NVL dự kiến của kế hoạch (UC-PP-03): tổng theo BOM đang áp dụng, so với tồn tại kho NVL đang chọn.
// Thiếu NVL chỉ cảnh báo, không chặn gửi duyệt / duyệt (BR-PP-15). Tồn chưa trừ phần các lệnh đang mở sẽ dùng (Q8).

import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import type { WarehouseItem } from '@/lib/warehouse/useActiveWarehouse';
import type { PlanMaterialRequirements } from '../types';
import { fmtQty } from '../utils/productionFormat';
import { planErrorText } from '../utils/productionPlanFormat';

interface PlanMaterialRequirementsPanelProps {
  /** Hàm tải nhu cầu theo kho; đổi hàm (VD đổi dòng kế hoạch) thì tải lại */
  load: (warehouseId: number | null) => Promise<PlanMaterialRequirements>;
  /** Khóa thay đổi khi dữ liệu nguồn đổi, để tải lại */
  reloadKey: string;
  warehouses: WarehouseItem[];
  defaultWarehouseId: number | null;
  /** Có số đã lập lệnh: cho chọn xem theo số còn lại (mặc định) hoặc tổng kế hoạch (UC-PP-03 luồng 2a) */
  showRemainingToggle?: boolean;
}

export function PlanMaterialRequirementsPanel({
  load,
  reloadKey,
  warehouses,
  defaultWarehouseId,
  showRemainingToggle,
}: PlanMaterialRequirementsPanelProps) {
  const [warehouseId, setWarehouseId] = useState<number | null>(defaultWarehouseId);
  const [byRemaining, setByRemaining] = useState(true);
  const requestKey = `${reloadKey}:${warehouseId ?? ''}`;
  const [state, setState] = useState<{ key: string; data: PlanMaterialRequirements | null; error: string | null }>({
    key: '',
    data: null,
    error: null,
  });
  const loading = state.key !== requestKey;

  useEffect(() => {
    let stale = false;
    load(warehouseId)
      .then((data) => {
        if (!stale) setState({ key: requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (!stale) setState({ key: requestKey, data: null, error: planErrorText(err, 'Không tải được nhu cầu nguyên vật liệu') });
      });
    return () => {
      stale = true;
    };
    // requestKey gom đủ tham số (reloadKey + kho)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const data = state.data;
  const useRemaining = !!showRemainingToggle && byRemaining;
  const shortageCount = data ? (useRemaining ? data.remainingShortageCount : data.shortageCount) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <div className="text-xs font-semibold text-[#15171a]">Nhu cầu nguyên vật liệu dự kiến (theo BOM đang áp dụng)</div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#677484]">
          {showRemainingToggle && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={byRemaining}
                onChange={(e) => setByRemaining(e.target.checked)}
                className="w-4 h-4 accent-[#0070f4] cursor-pointer"
              />
              Chỉ tính số còn lại chưa lập lệnh
            </label>
          )}
          <label className="flex items-center gap-2">
            Tồn tại kho
            <select
              value={warehouseId ?? ''}
              onChange={(e) => setWarehouseId(e.target.value ? Number(e.target.value) : null)}
              className="h-7 px-2 text-xs border border-slate-300 rounded-[6px] bg-white focus:outline-none focus:border-[#0070f4] cursor-pointer"
            >
              <option value="">Không so tồn</option>
              {warehouses.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.name}
                </option>
              ))}
            </select>
          </label>
          {loading && <RefreshCcw size={13} className="animate-spin text-[#0070f4]" />}
        </div>
      </div>

      {state.error && !loading && <div className="mb-2 text-xs text-[#fb2c36]">{state.error}</div>}

      {data && data.productsWithoutBom.length > 0 && (
        <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-[8px] border border-[#fde68a] bg-[#fffbeb] text-xs text-[#92400e]">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[#d97706]" />
          <span>
            Chưa có BOM đang áp dụng, không tính vào nhu cầu:{' '}
            <b>{data.productsWithoutBom.map((p) => p.productCode).join(', ')}</b>. Cần thiết lập BOM trước khi gửi duyệt.
          </span>
        </div>
      )}
      {data && warehouseId && shortageCount > 0 && (
        <div className="mb-2 flex items-start gap-2 px-3 py-2 rounded-[8px] border border-[#fecaca] bg-[#fef2f2] text-xs text-[#b91c1c]">
          <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[#fb2c36]" />
          <span>
            Có <b>{shortageCount}</b> nguyên vật liệu thiếu so với tồn kho hiện tại. Đây là cảnh báo, kế hoạch vẫn được gửi duyệt / duyệt.
          </span>
        </div>
      )}

      <div className="border border-slate-200 rounded-[8px] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[640px]">
          <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
            <tr>
              <th className="py-1.5 px-3 w-10 text-center">STT</th>
              <th className="py-1.5 px-3 w-32">Mã NVL</th>
              <th className="py-1.5 px-3">Tên nguyên vật liệu</th>
              <th className="py-1.5 px-3 w-16 text-center">ĐVT</th>
              <th className="py-1.5 px-3 w-28 text-right">Nhu cầu</th>
              <th className="py-1.5 px-3 w-28 text-right">Tồn kho</th>
              <th className="py-1.5 px-3 w-28 text-right">Thiếu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {!data ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  {loading ? 'Đang tính nhu cầu nguyên vật liệu...' : 'Không có dữ liệu'}
                </td>
              </tr>
            ) : data.materials.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  Chưa có nguyên vật liệu nào (chưa có thành phẩm có BOM đang áp dụng)
                </td>
              </tr>
            ) : (
              data.materials.map((m, idx) => {
                const required = useRemaining ? m.remainingRequiredQty : m.requiredQty;
                const shortage = useRemaining ? m.remainingShortageQty : m.shortageQty;
                return (
                  <tr key={`${m.materialId}:${m.unitName}`} className={shortage && shortage > 0 ? 'bg-[#fef2f2]/60' : ''}>
                    <td className="py-1.5 px-3 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-1.5 px-3 font-mono font-semibold">{m.materialCode}</td>
                    <td className="py-1.5 px-3">{m.materialName}</td>
                    <td className="py-1.5 px-3 text-center text-slate-500">{m.unitName}</td>
                    <td className="py-1.5 px-3 text-right font-semibold">{fmtQty(required)}</td>
                    <td className="py-1.5 px-3 text-right">{m.availableQty === null ? '—' : fmtQty(m.availableQty)}</td>
                    <td className={`py-1.5 px-3 text-right font-semibold ${shortage && shortage > 0 ? 'text-[#fb2c36]' : 'text-slate-400'}`}>
                      {shortage === null ? '—' : fmtQty(shortage)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
