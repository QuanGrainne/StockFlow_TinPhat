'use client';

// Tồn dự phóng theo ngày của một NVL trong một lần chạy MRP (AC-03, BR-MRP-18..25).
// "Tồn nếu không mua" có thể âm; "Tồn sau đề xuất" = tồn nếu không mua + đề xuất lũy kế.

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, ShieldAlert, X } from 'lucide-react';
import { mrpService } from '../services/mrpService';
import { fmtQty } from '../utils/productionFormat';
import { fmtDateOnly, planErrorText } from '../utils/productionPlanFormat';
import type { MrpProjection } from '../types';

interface MrpProjectionModalProps {
  runId: number;
  materialId: number;
  onClose: () => void;
}

export function MrpProjectionModal({ runId, materialId, onClose }: MrpProjectionModalProps) {
  const requestKey = `${runId}:${materialId}`;
  const [state, setState] = useState<{ key: string; data: MrpProjection | null; error: string | null }>({
    key: '',
    data: null,
    error: null,
  });
  const loading = state.key !== requestKey;
  const projection = loading ? null : state.data;

  useEffect(() => {
    let stale = false;
    mrpService
      .getMaterialProjection(runId, materialId)
      .then((data) => {
        if (!stale) setState({ key: requestKey, data, error: null });
      })
      .catch((err: unknown) => {
        if (!stale) setState({ key: requestKey, data: null, error: planErrorText(err, 'Không tải được tồn dự phóng') });
      });
    return () => {
      stale = true;
    };
  }, [runId, materialId, requestKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-[12px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold">Tồn dự phóng NVL</h3>
              {projection && (
                <span className="rounded bg-[#e6f1fe] px-2 py-0.5 font-mono text-xs font-semibold text-[#0070f4]">{projection.material.productCode}</span>
              )}
            </div>
            {projection && (
              <p className="text-xs text-[#677484]">
                {projection.material.productName} · ĐVT: {projection.unitName}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-[6px] p-1.5 text-slate-400 hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 text-[13px]">
          {loading && (
            <div className="flex h-48 items-center justify-center">
              <Loader2 size={28} className="animate-spin text-[#0070f4]" />
            </div>
          )}

          {!loading && state.error && (
            <div className="flex items-start gap-2 rounded-[8px] border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              {state.error}
            </div>
          )}

          {projection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ['Tồn đầu kỳ', `${fmtQty(projection.openingBalance)} ${projection.unitName}`],
                  ['Thời gian giao', projection.leadTimeDays != null ? `${projection.leadTimeDays} ngày` : 'Chưa khai báo'],
                  ['Số mốc ngày', String(projection.rows.length)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-[8px] border border-slate-200 bg-slate-50/60 px-3 py-2">
                    <div className="text-[11px] text-[#677484]">{k}</div>
                    <div className="font-bold">{v}</div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto rounded-[8px] border border-slate-200">
                <table className="w-full min-w-[860px] border-collapse text-left text-xs">
                  <thead className="bg-[#f7f8f9] font-semibold text-[#677484]">
                    <tr>
                      <th className="px-3 py-2">Ngày</th>
                      <th className="px-3 py-2 text-right">Nhu cầu</th>
                      <th className="px-3 py-2 text-right">Hàng về</th>
                      <th className="px-3 py-2 text-right">Tồn nếu không mua</th>
                      <th className="px-3 py-2 text-right">Thiếu</th>
                      <th className="px-3 py-2 text-right">Đề xuất nhận</th>
                      <th className="px-3 py-2 text-right">Tồn sau đề xuất</th>
                      <th className="px-3 py-2">Hạn đặt hàng</th>
                      <th className="px-3 py-2 text-center">Tình trạng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projection.rows.map((row) => (
                      <tr key={row.date} className={row.netRequirement > 0 ? 'bg-red-50/40' : ''}>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{fmtDateOnly(row.date)}</td>
                        <td className="px-3 py-2 text-right text-rose-600">{row.grossRequirement > 0 ? `−${fmtQty(row.grossRequirement)}` : '–'}</td>
                        <td className="px-3 py-2 text-right text-emerald-600">{row.scheduledReceipt > 0 ? `+${fmtQty(row.scheduledReceipt)}` : '–'}</td>
                        <td className={`px-3 py-2 text-right font-semibold ${row.projectedBalance < 0 ? 'text-red-600' : ''}`}>{fmtQty(row.projectedBalance)}</td>
                        <td className="px-3 py-2 text-right font-bold text-red-600">{row.netRequirement > 0 ? fmtQty(row.netRequirement) : '–'}</td>
                        <td className="px-3 py-2 text-right text-[#0070f4]">{row.plannedReceipt > 0 ? `+${fmtQty(row.plannedReceipt)}` : '–'}</td>
                        <td className="px-3 py-2 text-right">{fmtQty(row.projectedBalanceAfterPlan)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{fmtDateOnly(row.plannedReleaseDate) || '–'}</td>
                        <td className="px-3 py-2 text-center">
                          {row.netRequirement <= 0 ? (
                            <span className="text-slate-400">Đủ</span>
                          ) : row.isLate ? (
                            <span className="inline-flex items-center gap-1 rounded bg-red-100 px-2 py-0.5 font-semibold text-red-800">
                              <ShieldAlert size={12} /> Trễ
                            </span>
                          ) : row.plannedReleaseDate ? (
                            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">
                              <CheckCircle2 size={12} /> Kịp đặt
                            </span>
                          ) : (
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-amber-800">Chưa có thời gian giao</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-[#677484]">
                Hạn đặt hàng = ngày cần − thời gian giao (ngày lịch). Tồn kho là tồn thực tế các kho của lần chạy, đã trừ lô hết hạn.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
