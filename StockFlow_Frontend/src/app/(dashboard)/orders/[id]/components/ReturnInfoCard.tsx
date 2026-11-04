// src/app/(dashboard)/orders/[id]/components/ReturnInfoCard.tsx
// Card hiển thị thông tin phiếu trả hàng từ khách hàng (nếu có)

import React from 'react';
import { RotateCcw, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import { OrderReturnRequest } from '@/features/orders/types';

interface ReturnInfoCardProps {
  returnRequests: OrderReturnRequest[];
}

export const ReturnInfoCard: React.FC<ReturnInfoCardProps> = ({ returnRequests }) => {
  return (
    <div className="bg-white rounded-[8px] border border-slate-200 overflow-hidden shadow-2xs space-y-0">
      {/* Header */}
      <div className="p-3.5 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
          <RotateCcw size={15} className="text-[#0F60B6]" />
          <span>THÔNG TIN TRẢ HÀNG ({returnRequests.length} PHIẾU TRẢ)</span>
        </div>
      </div>

      {returnRequests.length === 0 ? (
        <div className="p-5 text-center text-slate-400 text-xs">
          <p className="font-semibold text-slate-600">Đơn hàng không có trả hàng</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Khách hàng chưa phát sinh yêu cầu hoàn trả hoặc đổi sản phẩm nào cho hóa đơn này.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-150">
          {returnRequests.map((rr) => {
            const dateStr = rr.requestDate
              ? new Date(rr.requestDate).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '—';

            return (
              <div key={rr.returnRequestId} className="p-3.5 px-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      #{rr.returnCode}
                    </span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-orange-100 text-orange-800">
                      {rr.status}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">{dateStr}</span>
                </div>

                <div className="text-xs text-slate-600">
                  <span className="font-semibold text-slate-700">Lý do:</span> {rr.reason}
                </div>

                {rr.items.length > 0 && (
                  <div className="border border-slate-200 rounded-[5px] overflow-hidden mt-2">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                          <th className="py-1.5 px-2.5">Sản phẩm</th>
                          <th className="py-1.5 px-2.5 text-right">Số lượng trả</th>
                          <th className="py-1.5 px-2.5">Tình trạng</th>
                          <th className="py-1.5 px-2.5">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-[11px]">
                        {rr.items.map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="py-1.5 px-2.5 font-semibold text-slate-800">
                              {it.productName}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                              {it.quantity}
                            </td>
                            <td className="py-1.5 px-2.5">
                              <span
                                className={`px-1.5 py-0.2 rounded font-bold text-[10px] ${
                                  it.condition === 'Tốt'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {it.condition}
                              </span>
                            </td>
                            <td className="py-1.5 px-2.5 text-slate-500">{it.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
