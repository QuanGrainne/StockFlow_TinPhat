// src/features/transfers/components/ReceiveTransferModal.tsx
// Modal nhận hàng cho thủ kho chi nhánh đích kiểm đếm số lượng thực tế

import React, { useState } from 'react';
import { TransferDetail } from '../types';
import { transferService } from '../services/transferService';
import { X, Truck, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  transfer: TransferDetail | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReceiveTransferModal: React.FC<Props> = ({
  transfer,
  onClose,
  onSuccess,
}) => {
  if (!transfer) return null;

  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    transfer.items.forEach((it) => {
      init[it.productId] = it.transferQuantity;
    });
    return init;
  });

  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleQtyChange = (productId: number, val: number) => {
    setReceivedQtys((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const itemsPayload = transfer.items.map((it) => ({
        productId: it.productId,
        receivedQuantity: receivedQtys[it.productId] ?? it.transferQuantity,
      }));

      await transferService.receiveTransfer(transfer.id, {
        receivedDate,
        notes,
        items: itemsPayload,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi xác nhận nhận hàng');
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasDifference = transfer.items.some(
    (it) => (receivedQtys[it.productId] ?? it.transferQuantity) !== it.transferQuantity
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-xs text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Truck size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Xác nhận nhận hàng chuyển kho
              </h3>
              <p className="text-[11px] text-slate-500">
                Mã phiếu: <strong className="text-blue-700 font-mono">{transfer.code}</strong> • Tới: {transfer.destWarehouseName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
            {error}
          </div>
        )}

        {hasDifference && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg flex items-start gap-2">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
            <div>
              <strong>Lưu ý:</strong> Số lượng thực nhận có sự chênh lệch so với số lượng xuất chuyển đi. Hệ thống sẽ lưu lại đối soát cho cả 2 chi nhánh.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Ngày nhận hàng:
              </label>
              <input
                type="date"
                required
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Ghi chú kiểm đếm:
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Vd: Đã nhận đủ hàng, không móp méo..."
                className="w-full h-8 px-2.5 rounded-lg border border-slate-300 text-xs bg-slate-50 focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {/* Table kiểm đếm */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] font-bold text-slate-500">
                <tr>
                  <th className="py-2 px-3">Mã hàng</th>
                  <th className="py-2 px-3">Tên hàng</th>
                  <th className="py-2 px-3 text-center">ĐVT</th>
                  <th className="py-2 px-3 text-right">SL chuyển</th>
                  <th className="py-2 px-3 text-right w-28">SL nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfer.items.map((it) => {
                  const currentQty = receivedQtys[it.productId] ?? it.transferQuantity;
                  const isDiff = currentQty !== it.transferQuantity;
                  return (
                    <tr key={it.productId} className={isDiff ? 'bg-amber-50/40' : ''}>
                      <td className="py-2 px-3 font-mono font-semibold text-blue-700">
                        {it.productCode}
                      </td>
                      <td className="py-2 px-3 font-medium text-slate-800">
                        {it.productName}
                      </td>
                      <td className="py-2 px-3 text-center text-slate-500">
                        {it.unitName}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-700">
                        {it.transferQuantity}
                      </td>
                      <td className="py-1.5 px-3 text-right">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={currentQty}
                          onChange={(e) =>
                            handleQtyChange(it.productId, Number(e.target.value))
                          }
                          className={`w-20 h-7 px-2 text-right rounded border text-xs font-bold ${
                            isDiff
                              ? 'border-amber-400 bg-amber-50 text-amber-900'
                              : 'border-slate-300 bg-white text-slate-900'
                          } focus:outline-none focus:border-blue-500`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50 shadow-xs"
            >
              <CheckCircle2 size={14} />
              <span>{isSubmitting ? 'Đang lưu...' : 'Xác nhận nhập kho'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
