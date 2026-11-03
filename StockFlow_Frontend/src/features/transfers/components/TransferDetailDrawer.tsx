// src/features/transfers/components/TransferDetailDrawer.tsx
// Drawer xem chi tiết phiếu chuyển hàng & các thao tác nhanh (Nhận hàng, Hủy phiếu, In phiếu)

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TransferDetail, TransferStatus } from '../types';
import { transferService } from '../services/transferService';
import {
  X,
  Printer,
  Ban,
  CheckCircle,
  Truck,
  ArrowRight,
  Clock,
  User,
  MapPin,
  Building2,
  FileText,
  AlertCircle,
  Edit,
} from 'lucide-react';

interface Props {
  transferId: number | null;
  onClose: () => void;
  onRefresh: () => void;
  onOpenReceiveModal: (transfer: TransferDetail) => void;
}

const statusBadgeConfig: Record<
  TransferStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  DRAFT: {
    label: 'Phiếu tạm',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
  },
  IN_TRANSIT: {
    label: 'Đang chuyển',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  RECEIVED: {
    label: 'Đã nhận',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
};

export const TransferDetailDrawer: React.FC<Props> = ({
  transferId,
  onClose,
  onRefresh,
  onOpenReceiveModal,
}) => {
  const [detail, setDetail] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    if (!transferId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    transferService
      .getTransferById(transferId)
      .then((data) => setDetail(data))
      .finally(() => setLoading(false));
  }, [transferId]);

  if (!transferId) return null;

  const handleCompleteOut = async () => {
    if (!detail) return;
    if (!confirm(`Xác nhận hoàn thành xuất kho phiếu chuyển ${detail.code}?\nHàng sẽ được trừ tồn tại ${detail.sourceWarehouseName}.`)) {
      return;
    }
    setIsActionLoading(true);
    try {
      await transferService.completeTransfer(detail.id);
      const updated = await transferService.getTransferById(detail.id);
      setDetail(updated);
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể hoàn thành phiếu chuyển'}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!detail) return;
    const reason = prompt('Nhập lý do hủy phiếu chuyển hàng:');
    if (reason === null) return;

    setIsActionLoading(true);
    try {
      await transferService.cancelTransfer(detail.id, reason);
      const updated = await transferService.getTransferById(detail.id);
      setDetail(updated);
      onRefresh();
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể hủy phiếu chuyển'}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const statusConfig = detail ? statusBadgeConfig[detail.status] : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-slate-900/40 backdrop-blur-2xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col justify-between text-slate-800 text-xs animate-in slide-in-from-right duration-250">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">
                  {detail?.code || `Phiếu #${transferId}`}
                </h2>
                {statusConfig && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                  >
                    {statusConfig.label}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Chi tiết phiếu điều chuyển hàng hóa nội bộ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
              title="In phiếu chuyển kho"
            >
              <Printer size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Đang tải dữ liệu phiếu chuyển...</div>
          ) : !detail ? (
            <div className="py-20 text-center text-slate-400">Không tìm thấy thông tin phiếu</div>
          ) : (
            <>
              {/* Route Card: Từ kho -> Tới kho */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <Building2 size={12} className="text-blue-600" />
                    Chi nhánh chuyển đi
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {detail.sourceWarehouseName}
                  </div>
                  <div className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded inline-block">
                    {detail.sourceWarehouseCode}
                  </div>
                </div>

                <div className="space-y-1.5 md:border-l md:border-slate-200 md:pl-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide flex items-center gap-1">
                    <Truck size={12} className="text-emerald-600" />
                    Chi nhánh nhận về
                  </span>
                  <div className="font-bold text-slate-900 text-sm">
                    {detail.destWarehouseName}
                  </div>
                  <div className="font-mono text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                    {detail.destWarehouseCode}
                  </div>
                </div>
              </div>

              {/* Thông tin thời gian & Người lập */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-2xs">
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Ngày chuyển:</span>
                  <span className="font-medium text-slate-800">
                    {detail.transferDate ? new Date(detail.transferDate).toLocaleDateString('vi-VN') : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Ngày nhận:</span>
                  <span className="font-medium text-slate-800">
                    {detail.receivedDate ? new Date(detail.receivedDate).toLocaleDateString('vi-VN') : 'Chưa nhận'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Người tạo:</span>
                  <span className="font-medium text-slate-800">{detail.createdBy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block mb-0.5">Tổng số lượng:</span>
                  <span className="font-bold text-blue-600 text-sm">{detail.totalQuantity.toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {/* Ghi chú */}
              {detail.notes && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/60 text-amber-900 text-xs">
                  <strong>Ghi chú:</strong> {detail.notes}
                </div>
              )}

              {/* Bảng danh sách hàng hóa */}
              <div>
                <h3 className="font-bold text-slate-800 mb-2.5 text-xs uppercase tracking-wide">
                  Danh sách hàng hóa chuyển kho ({detail.items.length} mặt hàng)
                </h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                        <th className="py-2.5 px-3 text-center w-10">STT</th>
                        <th className="py-2.5 px-3">Mã hàng</th>
                        <th className="py-2.5 px-3">Tên hàng</th>
                        <th className="py-2.5 px-3 text-center">ĐVT</th>
                        <th className="py-2.5 px-3 text-right">SL chuyển</th>
                        {detail.status === 'RECEIVED' && (
                          <th className="py-2.5 px-3 text-right text-emerald-700">SL nhận</th>
                        )}
                        <th className="py-2.5 px-3 text-right">Đơn giá</th>
                        <th className="py-2.5 px-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detail.items.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-blue-700">{it.productCode}</td>
                          <td className="py-2.5 px-3 font-medium text-slate-800">
                            {it.productName}
                            {it.notes && <div className="text-[10px] text-slate-400 italic mt-0.5">{it.notes}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500">{it.unitName}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                            {it.transferQuantity.toLocaleString('vi-VN')}
                          </td>
                          {detail.status === 'RECEIVED' && (
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                              {(it.receivedQuantity ?? it.transferQuantity).toLocaleString('vi-VN')}
                            </td>
                          )}
                          <td className="py-2.5 px-3 text-right text-slate-600 font-mono">
                            {it.transferPrice.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 font-mono">
                            {it.lineTotal.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50/80 font-bold border-t border-slate-200">
                        <td colSpan={4} className="py-2.5 px-3 text-right text-slate-600">
                          Tổng cộng:
                        </td>
                        <td className="py-2.5 px-3 text-right text-blue-700">
                          {detail.totalQuantity.toLocaleString('vi-VN')}
                        </td>
                        {detail.status === 'RECEIVED' && (
                          <td className="py-2.5 px-3 text-right text-emerald-700">
                            {(detail.totalReceivedQuantity ?? detail.totalQuantity).toLocaleString('vi-VN')}
                          </td>
                        )}
                        <td className="py-2.5 px-3"></td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-mono text-sm">
                          {detail.totalAmount.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
          <div>
            {detail?.status !== 'RECEIVED' && detail?.status !== 'CANCELLED' && (
              <button
                type="button"
                disabled={isActionLoading}
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                <Ban size={14} />
                <span>Hủy phiếu</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
            >
              Đóng
            </button>

            {detail?.status === 'DRAFT' && (
              <>
                <Link
                  href={`/transfers/create?id=${detail.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 text-blue-600 font-semibold text-xs transition cursor-pointer"
                >
                  <Edit size={14} />
                  <span>Sửa phiếu</span>
                </Link>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleCompleteOut}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <CheckCircle size={14} />
                  <span>Hoàn thành (Xuất kho đi)</span>
                </button>
              </>
            )}

            {detail?.status === 'IN_TRANSIT' && (
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => {
                  onClose();
                  onOpenReceiveModal(detail);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Truck size={14} />
                <span>Nhận hàng</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
