// src/app/(dashboard)/orders/[id]/components/PaymentHistoryCard.tsx
// Card hiển thị bảng lịch sử các giao dịch thanh toán của đơn hàng

import React from 'react';
import { CreditCard, CheckCircle2, Clock, FileText } from 'lucide-react';
import { OrderPaymentTransaction } from '@/features/orders/types';

interface PaymentHistoryCardProps {
  transactions: OrderPaymentTransaction[];
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentStatus: string;
}

const currencyFormatter = new Intl.NumberFormat('vi-VN');

export const PaymentHistoryCard: React.FC<PaymentHistoryCardProps> = ({
  transactions,
  totalAmount,
  paidAmount,
  outstandingAmount,
  paymentStatus,
}) => {
  return (
    <div className="bg-white rounded-[8px] border border-slate-200 overflow-hidden shadow-2xs space-y-0">
      {/* Header */}
      <div className="p-3.5 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
          <CreditCard size={15} className="text-[#0F60B6]" />
          <span>LỊCH SỬ THANH TOÁN ({transactions.length} GIAO DỊCH)</span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span>
            Đã thanh toán:{' '}
            <strong className="text-emerald-700 font-bold font-mono">
              {currencyFormatter.format(paidAmount)} đ
            </strong>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            Còn nợ:{' '}
            <strong
              className={`font-bold font-mono ${outstandingAmount > 0 ? 'text-rose-600' : 'text-slate-700'}`}
            >
              {currencyFormatter.format(outstandingAmount)} đ
            </strong>
          </span>
        </div>
      </div>

      {/* Danh sách giao dịch */}
      {transactions.length === 0 ? (
        <div className="p-6 text-center text-slate-400 text-xs">
          <CreditCard size={28} className="mx-auto text-slate-300 mb-1.5" />
          <p className="font-semibold text-slate-600">Chưa có giao dịch thu tiền phát sinh</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {paymentStatus === 'DEBT'
              ? 'Đơn hàng được bán theo hình thức ghi nợ đại lý 100%.'
              : 'Đơn hàng chưa ghi nhận khoản thanh toán tiền mặt hoặc chuyển khoản nào.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3">MÃ GIAO DỊCH</th>
                <th className="py-2.5 px-3">THỜI GIAN</th>
                <th className="py-2.5 px-3">PHƯƠNG THỨC</th>
                <th className="py-2.5 px-3 text-right">SỐ TIỀN</th>
                <th className="py-2.5 px-3">NGƯỜI GHI NHẬN</th>
                <th className="py-2.5 px-3 text-center">TRẠNG THÁI</th>
                <th className="py-2.5 px-3">GHI CHÚ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-150">
              {transactions.map((tx) => {
                const dateStr = tx.transactionDate
                  ? new Date(tx.transactionDate).toLocaleString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })
                  : '—';

                let methodLabel = tx.paymentMethod;
                if (methodLabel === 'CASH') methodLabel = 'Tiền mặt';
                else if (methodLabel === 'VIETQR') methodLabel = 'Chuyển khoản VietQR';
                else if (methodLabel === 'POS_CARD') methodLabel = 'Quẹt thẻ máy POS';
                else if (methodLabel === 'DEBT') methodLabel = 'Ghi nợ đại lý';

                return (
                  <tr key={tx.txId} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#0F60B6]">
                      {tx.txCode}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {dateStr}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-[#0F60B6] border border-blue-200">
                        {methodLabel}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right font-black text-emerald-700 font-mono">
                      {currencyFormatter.format(tx.amount)} đ
                    </td>

                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {tx.createdByName}
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                        {tx.status === 'COMPLETED' ? 'Thành công' : tx.status}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-500 text-[11px] max-w-[200px] truncate">
                      {tx.description || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

