'use client';

// Chọn hóa đơn để trả hàng (BR-18: phiếu trả phải gắn với hóa đơn bán gốc).
// Tìm theo mã hóa đơn / khách hàng / điện thoại trong các hóa đơn đã hoàn thành.

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Search, X } from 'lucide-react';
import { orderService } from '@/features/orders/services/orderService';
import type { OrderListItem } from '@/features/orders/types';
import { formatDateTimeVN } from '@/lib/utils/date';
import { formatVnd } from '../utils/salesReturnUtils';

interface Props {
  open: boolean;
  /** Chi nhánh đang làm việc: chỉ trả hàng của hóa đơn bán tại chi nhánh này */
  warehouseId: number;
  onClose: () => void;
  onSelect: (orderId: number) => void;
  /** Khách quên hóa đơn: trả hàng không theo hóa đơn */
  onQuickReturn: () => void;
}

export default function SelectInvoiceModal({ open, warehouseId, onClose, onSelect, onQuickReturn }: Props) {
  const [keyword, setKeyword] = useState('');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ key: string; items: OrderListItem[] }>({ key: '', items: [] });
  const requestKey = `${warehouseId}|${query}`;
  const loading = open && result.key !== requestKey;

  useEffect(() => {
    const t = setTimeout(() => setQuery(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    orderService
      .getOrders({ search: query || undefined, warehouseId, status: 'COMPLETED' })
      .then((items) => alive && setResult({ key: requestKey, items: items.slice(0, 50) }))
      .catch(() => alive && setResult({ key: requestKey, items: [] }));
    return () => {
      alive = false;
    };
  }, [open, query, warehouseId, requestKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[900] bg-slate-900/40 flex items-start justify-center p-4 sm:p-10 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[960px] bg-white rounded-xl shadow-2xl border border-slate-200 text-[13px] text-[#15171a]">
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <h3 className="text-[16px] font-bold">Chọn hóa đơn trả hàng</h3>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer" aria-label="Đóng">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 pb-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
            <input
              autoFocus
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Theo mã hóa đơn, tên hoặc điện thoại khách hàng"
              className="w-full h-9 pl-9 pr-3 rounded-[8px] border border-slate-300 placeholder-[#677484] focus:outline-none focus:border-[#0070f4]"
            />
          </div>
        </div>

        <div className="px-5 pb-5">
          <div className="rounded-[8px] border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[12px] font-semibold text-[#677484]">
                <tr>
                  <th className="py-2 px-3">Mã hóa đơn</th>
                  <th className="py-2 px-3">Thời gian</th>
                  <th className="py-2 px-3">Khách hàng</th>
                  <th className="py-2 px-3 text-right">Tổng cộng</th>
                  <th className="py-2 px-3 w-24" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#677484]">
                      <Loader2 size={16} className="inline animate-spin mr-2 text-[#0070f4]" />
                      Đang tải hóa đơn...
                    </td>
                  </tr>
                ) : result.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-[#677484]">
                      Không tìm thấy hóa đơn đã hoàn thành phù hợp tại chi nhánh đang làm việc
                    </td>
                  </tr>
                ) : (
                  result.items.map((o) => (
                    <tr key={o.orderId} className="hover:bg-[#f7f8f9]">
                      <td className="py-2.5 px-3 font-semibold text-[#0070f4] whitespace-nowrap">{o.orderCode}</td>
                      <td className="py-2.5 px-3 whitespace-nowrap">{formatDateTimeVN(o.orderDate)}</td>
                      <td className="py-2.5 px-3">
                        {o.partnerName}
                        {o.partnerPhone && <span className="text-[#677484]"> • {o.partnerPhone}</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatVnd(o.totalAmount)}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => onSelect(o.orderId)}
                          className="h-7 px-3 rounded-[8px] border border-[#0070f4] text-[#0070f4] font-semibold hover:bg-[#eff6ff] cursor-pointer"
                        >
                          Chọn
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onQuickReturn}
              title="Khách quên hóa đơn: tự chọn hàng và khách để trả"
              className="h-9 px-5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold cursor-pointer"
            >
              Trả nhanh
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
