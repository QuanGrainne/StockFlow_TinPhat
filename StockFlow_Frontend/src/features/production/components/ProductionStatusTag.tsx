'use client';

import React from 'react';
import type { ProductionOrderStatus } from '../types';
import { ORDER_STATUS_CLS, ORDER_STATUS_LABEL } from '../utils/productionFormat';

export function ProductionStatusTag({ status }: { status: ProductionOrderStatus }) {
  return (
    <span
      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${
        ORDER_STATUS_CLS[status] ?? 'bg-slate-50 text-slate-600 border-slate-200'
      }`}
    >
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** Nhãn nhỏ dạng thẻ (Đủ NVL / Thiếu NVL / Cần xem xét / Bổ sung...) */
export function SmallTag({ tone, children, title }: { tone: 'green' | 'amber' | 'red' | 'blue' | 'gray'; children: React.ReactNode; title?: string }) {
  const cls = {
    green: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]',
    amber: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]',
    red: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]',
    blue: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25',
    gray: 'bg-slate-50 text-slate-600 border-slate-200',
  }[tone];
  return (
    <span title={title} className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${cls}`}>
      {children}
    </span>
  );
}

/** Thanh tiến độ sản xuất (SL đã nhập / kế hoạch) */
export function ProgressBar({ percent }: { percent: number }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="flex items-center gap-2 min-w-[110px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
        <div className={`h-full rounded-full ${p >= 100 ? 'bg-[#16a34a]' : 'bg-[#0070f4]'}`} style={{ width: `${p}%` }} />
      </div>
      <span className="text-[11px] text-[#677484] w-10 text-right">{p.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%</span>
    </div>
  );
}
