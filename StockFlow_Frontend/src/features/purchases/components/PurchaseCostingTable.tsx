'use client';

// Tab "Giá vốn BQ" của phiếu nhập đã hoàn thành: diễn giải cách tính giá vốn bình quân gia quyền từng mặt hàng
//   Giá vốn sau = (Tồn trước × Giá vốn trước + SL nhập × Giá nhập) / (Tồn trước + SL nhập)
// Số liệu lấy từ thẻ kho tại thời điểm nhập (tồn / giá vốn trước và sau của đúng kho nhận).

import React from 'react';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import type { PurchaseCosting } from '../types';

const money = (v: number) => (v || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
const qty = (v: number) => (v || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 });

export default function PurchaseCostingTable({ costing, status }: { costing?: PurchaseCosting[]; status: string }) {
  if (status !== 'COMPLETED') {
    return <div className="py-6 text-center text-xs text-slate-400">Giá vốn chỉ được tính khi phiếu nhập đã hoàn thành.</div>;
  }
  if (!costing || costing.length === 0) {
    return <div className="py-6 text-center text-xs text-slate-400">Không tìm thấy dữ liệu thẻ kho của phiếu nhập này.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-[8px] border border-[#0070f4]/25 bg-[#e6f1fe] px-4 py-2.5 text-xs text-[#15171a]">
        <span className="font-semibold">Giá vốn bình quân gia quyền</span> = (Tồn trước × Giá vốn trước + SL nhập × Giá nhập) / (Tồn trước + SL
        nhập). Giá nhập đã trừ giảm giá dòng và phần giảm giá phiếu được phân bổ; SL lỗi không vào kho nên không tính.
      </div>
      <div className="border border-slate-200 rounded-[8px] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[900px]">
          <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
            <tr>
              <th className="py-2 px-3 w-28">Mã hàng</th>
              <th className="py-2 px-3">Tên hàng hóa</th>
              <th className="py-2 px-3 w-20 text-right">Tồn trước</th>
              <th className="py-2 px-3 w-28 text-right">Giá vốn trước</th>
              <th className="py-2 px-3 w-20 text-right">SL nhập</th>
              <th className="py-2 px-3 w-28 text-right">Giá nhập</th>
              <th className="py-2 px-3 w-20 text-right">Tồn sau</th>
              <th className="py-2 px-3 w-28 text-right">Giá vốn sau</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {costing.map((c, i) => (
              <React.Fragment key={`${c.productId}-${i}`}>
                <tr>
                  <td className="py-2 px-3 font-mono font-semibold">
                    <ProductCodeLink code={c.productCode} productId={c.productId} />
                  </td>
                  <td className="py-2 px-3 font-medium">{c.productName}</td>
                  <td className="py-2 px-3 text-right font-mono">{qty(c.qtyBefore)}</td>
                  <td className="py-2 px-3 text-right font-mono">{money(c.costBefore)}</td>
                  <td className="py-2 px-3 text-right font-mono">{qty(c.qtyIn)}</td>
                  <td className="py-2 px-3 text-right font-mono">{money(c.priceIn)}</td>
                  <td className="py-2 px-3 text-right font-mono">{qty(c.qtyAfter)}</td>
                  <td className="py-2 px-3 text-right font-mono font-semibold text-[#0070f4]">{money(c.costAfter)}</td>
                </tr>
                <tr className="bg-slate-50/60">
                  <td />
                  <td colSpan={7} className="py-1.5 px-3 font-mono text-[11px] text-[#677484]">
                    {c.qtyBefore > 0 && c.costBefore > 0
                      ?`(${qty(c.qtyBefore)} × ${money(c.costBefore)} + ${qty(c.qtyIn)} × ${money(c.priceIn)}) / (${qty(c.qtyBefore)} + ${qty(c.qtyIn)}) = ${money(c.costAfter)}`
                      : `Chưa có tồn / giá vốn trước (hoặc tồn ≤ 0) → Giá vốn sau = Giá nhập = ${money(c.costAfter)}`}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
