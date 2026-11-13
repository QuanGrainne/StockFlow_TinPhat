'use client';

// Chọn lệnh sản xuất khi tạo phiếu từ màn Xuất NVL / Nhập thành phẩm (UC-46 bước 1, UC-49 bước 1).

import React, { useEffect, useState } from 'react';
import { RefreshCcw, Search } from 'lucide-react';
import { productionService } from '../services/productionService';
import type { ProductionOrderStatus, ProductionOrderSummary } from '../types';
import { errorText, fmtDate, fmtQty } from '../utils/productionFormat';
import { ProductionDialog, btnSecondary } from './ProductionDialog';
import { ProductionStatusTag, SmallTag } from './ProductionStatusTag';

interface OrderPickerDialogProps {
  title: string;
  statuses: ProductionOrderStatus[];
  emptyText: string;
  onClose: () => void;
  onPick: (order: ProductionOrderSummary) => void;
}

export function OrderPickerDialog({ title, statuses, emptyText, onClose, onPick }: OrderPickerDialogProps) {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState<{ key: string; items: ProductionOrderSummary[]; error?: string }>({ key: '', items: [] });
  const requestKey = JSON.stringify({ statuses, search: search.trim() });
  const loading = result.key !== requestKey;

  useEffect(() => {
    let stale = false;
    const timer = setTimeout(() => {
      productionService
        .getOrders({ statuses, search })
        .then((items) => {
          if (!stale) setResult({ key: requestKey, items });
        })
        .catch((err: unknown) => {
          if (!stale) setResult({ key: requestKey, items: [], error: errorText(err, 'Không tải được lệnh sản xuất') });
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // requestKey gom đủ tham số tìm kiếm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  return (
    <ProductionDialog
      title={title}
      onClose={onClose}
      widthClass="max-w-3xl"
      footer={
        <button type="button" onClick={onClose} className={btnSecondary}>
          Đóng
        </button>
      }
    >
      <div className="relative mb-3">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo mã lệnh, mã / tên thành phẩm, xưởng"
          className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
        />
      </div>
      <div className="border border-slate-200 rounded-[8px] overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
            <tr>
              <th className="py-2 px-3">Mã lệnh</th>
              <th className="py-2 px-3">Thành phẩm</th>
              <th className="py-2 px-3 text-right">Kế hoạch</th>
              <th className="py-2 px-3 text-right">Đã nhập</th>
              <th className="py-2 px-3">Hạn</th>
              <th className="py-2 px-3 text-center">NVL</th>
              <th className="py-2 px-3 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  <RefreshCcw size={16} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
                  Đang tải lệnh sản xuất...
                </td>
              </tr>
            ) : result.items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  {result.error ?? emptyText}
                </td>
              </tr>
            ) : (
              result.items.map((o) => (
                <tr key={o.productionOrderId} onClick={() => onPick(o)} className="cursor-pointer hover:bg-[#eff6ff]">
                  <td className="py-2 px-3 font-mono font-semibold text-[#0070f4]">{o.code}</td>
                  <td className="py-2 px-3">
                    <div className="font-medium">{o.productName}</div>
                    <div className="text-[11px] text-slate-400">{o.productCode}</div>
                  </td>
                  <td className="py-2 px-3 text-right">{fmtQty(o.plannedQuantity)}</td>
                  <td className="py-2 px-3 text-right">{fmtQty(o.receivedQuantity)}</td>
                  <td className="py-2 px-3 whitespace-nowrap">{fmtDate(o.deadline)}</td>
                  <td className="py-2 px-3 text-center">
                    {o.materialStatus === 'FULL' ? <SmallTag tone="green">Đủ</SmallTag> : <SmallTag tone="amber">Thiếu</SmallTag>}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <ProductionStatusTag status={o.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ProductionDialog>
  );
}
