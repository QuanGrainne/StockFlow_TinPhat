// src/app/(dashboard)/orders/[id]/components/OrderTimeline.tsx
// Thẻ Lịch sử hành trình / Nhật ký xử lý đơn hàng theo chuẩn KiotViet

'use client';

import React from 'react';
import {
  History,
  ShoppingBag,
  CreditCard,
  Truck,
  RotateCcw,
  CheckCircle2,
  Info,
  User,
  Clock,
} from 'lucide-react';
import { OrderTimelineEvent } from '@/features/orders/types';

interface OrderTimelineProps {
  events: OrderTimelineEvent[];
}

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ events }) => {
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getEventMeta = (eventType: OrderTimelineEvent['eventType']) => {
    switch (eventType) {
      case 'CREATED':
        return {
          icon: <ShoppingBag size={14} className="text-blue-600" />,
          dotBg: 'bg-blue-100 border-blue-400',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
          typeLabel: 'Tạo đơn',
        };
      case 'PAYMENT':
        return {
          icon: <CreditCard size={14} className="text-emerald-600" />,
          dotBg: 'bg-emerald-100 border-emerald-400',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          typeLabel: 'Thanh toán',
        };
      case 'ISSUE':
        return {
          icon: <Truck size={14} className="text-purple-600" />,
          dotBg: 'bg-purple-100 border-purple-400',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
          typeLabel: 'Xuất kho',
        };
      case 'RETURN':
        return {
          icon: <RotateCcw size={14} className="text-rose-600" />,
          dotBg: 'bg-rose-100 border-rose-400',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          typeLabel: 'Trả hàng',
        };
      case 'STATUS':
        return {
          icon: <CheckCircle2 size={14} className="text-amber-600" />,
          dotBg: 'bg-amber-100 border-amber-400',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          typeLabel: 'Trạng thái',
        };
      default:
        return {
          icon: <Info size={14} className="text-slate-600" />,
          dotBg: 'bg-slate-100 border-slate-400',
          badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
          typeLabel: 'Thông tin',
        };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 flex items-center justify-center">
            <History size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Nhật ký xử lý đơn hàng</h3>
            <p className="text-[11px] text-slate-500">Lịch sử sự kiện, chứng từ kho & giao dịch thanh toán</p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
          {events.length} sự kiện
        </span>
      </div>

      {events.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          Chưa có nhật ký ghi nhận cho đơn hàng này.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
          {events.map((ev, idx) => {
            const meta = getEventMeta(ev.eventType);
            return (
              <div key={idx} className="relative group">
                {/* Dot */}
                <div
                  className={`absolute -left-[27px] top-0.5 w-6 h-6 rounded-full border-2 ${meta.dotBg} bg-white flex items-center justify-center shadow-2xs`}
                >
                  {meta.icon}
                </div>

                {/* Event Content */}
                <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/70 rounded-lg p-3 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{ev.title}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}>
                        {meta.typeLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                      <Clock size={11} />
                      <span>{formatDateTime(ev.timestamp)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 mb-2 leading-relaxed">{ev.description}</p>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <User size={12} className="text-slate-400" />
                    <span>Người thực hiện:</span>
                    <strong className="text-slate-700 font-medium">{ev.actor || 'Hệ thống'}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

