// src/app/(dashboard)/orders/[id]/components/StockIssueCard.tsx
// Card hiển thị thông tin phiếu xuất kho liên kết với đơn hàng

import React from 'react';
import Link from 'next/link';
import { Truck, Building2, Calendar, User, ExternalLink, CheckCircle2 } from 'lucide-react';
import { OrderStockIssue } from '@/features/orders/types';

interface StockIssueCardProps {
  stockIssues: OrderStockIssue[];
}

export const StockIssueCard: React.FC<StockIssueCardProps> = ({ stockIssues }) => {
  return (
    <div className="bg-white rounded-[8px] border border-slate-200 overflow-hidden shadow-2xs space-y-0">
      {/* Header */}
      <div className="p-3.5 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
          <Truck size={15} className="text-[#0F60B6]" />
          <span>THÔNG TIN XUẤT KHO ({stockIssues.length} PHIẾU XUẤT)</span>
        </div>
      </div>

      {stockIssues.length === 0 ? (
        <div className="p-6 text-center text-slate-400 text-xs">
          <Truck size={28} className="mx-auto text-slate-300 mb-1.5" />
          <p className="font-semibold text-slate-600">Đơn hàng chưa phát sinh phiếu xuất kho</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Mặt hàng chưa được trừ kho hoặc đang lưu ở trạng thái chờ tiếp nhận.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-150">
          {stockIssues.map((si) => {
            const dateStr = si.issueDate
              ? new Date(si.issueDate).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })
              : '—';

            return (
              <div key={si.stockIssueId} className="p-3.5 px-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      #{si.issueCode}
                    </span>
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      <span>{si.status === 'COMPLETED' ? 'Đã xuất kho' : si.status}</span>
                    </span>
                  </div>

                  <Link
                    href={`/inventory?search=${si.issueCode}`}
                    className="text-[11px] text-[#0F60B6] font-bold hover:underline flex items-center gap-1"
                  >
                    <span>Xem trong Quản lý kho</span>
                    <ExternalLink size={11} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600 bg-slate-50/70 p-2 rounded-[5px]">
                  <div>
                    <span className="text-slate-400 text-[11px]">Kho xuất:</span>{' '}
                    <strong className="text-slate-800">{si.warehouseName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Thời gian xuất:</span>{' '}
                    <strong className="text-slate-800 font-mono">{dateStr}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px]">Người thực hiện:</span>{' '}
                    <strong className="text-slate-800">{si.processedByName}</strong>
                  </div>
                </div>

                {/* Danh sách mặt hàng xuất */}
                {si.items.length > 0 && (
                  <div className="border border-slate-200 rounded-[5px] overflow-hidden mt-2">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase">
                          <th className="py-1.5 px-2.5">Sản phẩm</th>
                          <th className="py-1.5 px-2 text-center">ĐVT</th>
                          <th className="py-1.5 px-2.5 text-right">SL yêu cầu</th>
                          <th className="py-1.5 px-2.5 text-right">Thực xuất</th>
                          <th className="py-1.5 px-2.5 text-center">Lô / HSD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 text-[11px]">
                        {si.items.map((item, iIdx) => (
                          <tr key={iIdx} className="hover:bg-slate-50/60">
                            <td className="py-1.5 px-2.5">
                              <span className="font-semibold text-slate-800">
                                {item.productName}
                              </span>
                              {item.productCode && (
                                <span className="text-slate-400 font-mono ml-1.5">
                                  ({item.productCode})
                                </span>
                              )}
                            </td>
                            <td className="py-1.5 px-2 text-center text-slate-600">
                              {item.unitName}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono text-slate-600">
                              {item.requestedQty}
                            </td>
                            <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900">
                              {item.actualIssuedQty}
                            </td>
                            <td className="py-1.5 px-2.5 text-center text-slate-500 font-mono">
                              {item.lotNumber ? `${item.lotNumber} (${item.expiryDate || '—'})` : '—'}
                            </td>
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

