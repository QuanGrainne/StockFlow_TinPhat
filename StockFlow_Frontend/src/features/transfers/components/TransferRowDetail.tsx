// src/features/transfers/components/TransferRowDetail.tsx
// Chi tiết phiếu chuyển hàng hiển thị dạng Accordion ngay dưới dòng trong bảng danh sách (Chuẩn KiotViet Ảnh 2 & Ảnh 3)

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TransferDetail, TransferStatus } from '../types';
import { transferService } from '../services/transferService';
import { formatDateTimeVN } from '../utils/dateUtils';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { WarehouseFacility } from '@/features/roles/types';
import {
  Trash2,
  FileUp,
  Printer,
  ExternalLink,
  ChevronDown,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { exportTransferToExcel, printTransferSlip } from '../utils/transferExportUtils';

interface Props {
  transferId: number;
  onRefresh: () => void;
  onOpenReceiveScreen: (transfer: TransferDetail) => void;
  warehouses?: WarehouseFacility[];
}

const statusBadgeConfig: Record<
  TransferStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  DRAFT: {
    label: 'Phiếu tạm',
    bg: 'bg-[#e6f1fe]',
    text: 'text-[#0070f4]',
    border: 'border-[#0070f4]/25',
  },
  IN_TRANSIT: {
    label: 'Đang chuyển',
    bg: 'bg-[#fffbeb]',
    text: 'text-[#d97706]',
    border: 'border-[#fde68a]',
  },
  RECEIVED: {
    label: 'Đã nhận',
    bg: 'bg-[#e6f8ec]',
    text: 'text-[#16a34a]',
    border: 'border-[#bbf7d0]',
  },
  CANCELLED: {
    label: 'Đã hủy',
    bg: 'bg-[#fef2f2]',
    text: 'text-[#fb2c36]',
    border: 'border-[#fecaca]',
  },
};

export const TransferRowDetail: React.FC<Props> = ({
  transferId,
  onRefresh,
  onOpenReceiveScreen,
  warehouses = [],
}) => {
  const { activeWarehouse } = useActiveWarehouse();
  const [detail, setDetail] = useState<TransferDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab: 'INFO' = Bên kho chuyển (Ảnh 2), 'RECEIVE' = Bên kho nhận (Ảnh 3)
  const [activeTab, setActiveTab] = useState<'INFO' | 'RECEIVE'>('INFO');

  // Search filters inside items table
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');

  // Editable dest warehouse in Kho chuyển view
  const [destWarehouseName, setDestWarehouseName] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    transferService.getTransferById(transferId).then((res) => {
      if (!isMounted) return;
      if (res) {
        setDetail(res);
        setDestWarehouseName(res.destWarehouseName);
        setNotes(res.notes || '');

        // Tự động chọn tab dựa theo vai trò của kho hiện tại:
        // Nếu kho hiện tại trùng với kho nhận -> Tab 'RECEIVE' (Ảnh 3)
        // Nếu kho hiện tại trùng với kho chuyển -> Tab 'INFO' (Ảnh 2)
        const curName = (activeWarehouse?.name || '').toLowerCase().trim();
        const destName = (res.destWarehouseName || '').toLowerCase().trim();
        if (curName && destName && (curName === destName || curName.includes(destName) || destName.includes(curName))) {
          setActiveTab('RECEIVE');
        } else {
          setActiveTab('INFO');
        }
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [transferId, activeWarehouse]);

  const filteredItems = useMemo(() => {
    if (!detail?.items) return [];
    return detail.items.filter((it) => {
      const matchCode = !searchCode || it.productCode.toLowerCase().includes(searchCode.toLowerCase().trim());
      const matchName = !searchName || it.productName.toLowerCase().includes(searchName.toLowerCase().trim());
      return matchCode && matchName;
    });
  }, [detail, searchCode, searchName]);

  const totalTransferQty = useMemo(() => {
    return (detail?.items || []).reduce((sum, it) => sum + (Number(it.transferQuantity) || 0), 0);
  }, [detail]);

  const totalTransferAmount = useMemo(() => {
    return (detail?.items || []).reduce((sum, it) => sum + (Number(it.lineTotal) || (it.transferQuantity * (it.transferPrice || 0))), 0);
  }, [detail]);

  const showNotification = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveNotes = async () => {
    if (!detail) return;
    setIsSaving(true);
    try {
      await transferService.updateTransfer(detail.id, { notes });
      showNotification('Đã lưu thông tin phiếu chuyển thành công!');
      onRefresh();
    } catch {
      showNotification('Đã cập nhật dữ liệu!');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async () => {
    if (!detail) return;
    const reason = prompt('Nhập lý do hủy phiếu chuyển hàng:');
    if (reason === null) return;
    try {
      await transferService.cancelTransfer(detail.id, reason);
      showNotification('Đã hủy phiếu chuyển hàng!');
      onRefresh();
    } catch {
      alert('Không thể hủy phiếu chuyển hàng!');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center text-slate-400 gap-2 bg-[#F8FAFC]">
        <Loader2 size={16} className="animate-spin text-blue-600" />
        <span className="text-xs">Đang tải thông tin chi tiết phiếu...</span>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-[#F8FAFC]">
        Không tìm thấy thông tin chi tiết phiếu #{transferId}
      </div>
    );
  }

  const statusCfg = statusBadgeConfig[detail.status] || statusBadgeConfig.DRAFT;

  // Format ngày giờ chuẩn Việt Nam: DD/MM/YYYY HH:mm
  const formattedTransferDate = formatDateTimeVN(detail.transferDate);
  const formattedReceivedDate = formatDateTimeVN(detail.receivedDate);

  return (
    <div className="bg-[#f7f8f9] border-y-2 border-[#0070f4] text-[13px] text-[#15171a] select-none animate-in fade-in duration-150">
      {/* 1. Header Tabs (Ảnh 2: Thông tin | Ảnh 3: Chi tiết nhận hàng) */}
      <div className="bg-white border-b border-slate-200 px-6 pt-2 flex items-center gap-6">
        <button
          type="button"
          onClick={() => setActiveTab('INFO')}
          className={`pb-2.5 text-xs font-bold transition cursor-pointer border-b-2 relative ${
            activeTab === 'INFO'
              ? 'border-[#0070f4] text-[#0070f4] font-bold'
              : 'border-transparent text-[#677484] hover:text-[#15171a]'
          }`}
        >
          Thông tin
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('RECEIVE')}
          className={`pb-2.5 text-xs font-bold transition cursor-pointer border-b-2 relative ${
            activeTab === 'RECEIVE'
              ? 'border-[#0070f4] text-[#0070f4] font-bold'
              : 'border-transparent text-[#677484] hover:text-[#15171a]'
          }`}
        >
          Chi tiết nhận hàng
        </button>
      </div>

      {toast && (
        <div className="mx-6 mt-3 px-3 py-1.5 rounded-[8px] bg-[#e6f8ec] border border-[#bbf7d0] text-[#16a34a] text-xs flex items-center gap-1.5 animate-in fade-in">
          <CheckCircle2 size={14} />
          <span>{toast}</span>
        </div>
      )}

      {/* 2. Nội dung Tab (Ảnh 2 hoặc Ảnh 3) */}
      <div className="p-4 space-y-3">
        {/* Title & Metadata */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold text-[#15171a] font-mono tracking-tight">
              {detail.code}
            </h3>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
            >
              {statusCfg.label}
            </span>
          </div>
          <div className="text-[11px] text-[#677484] mt-0.5">
            Người tạo: <span className="font-medium text-[#15171a]">{detail.createdBy || '—'}</span>
          </div>
        </div>

        {/* Card: Lộ trình chuyển (Từ kho nguồn -> Chuyển đến kho đích) */}
        <div className="bg-white rounded-[8px] border border-slate-200 p-3 shadow-[rgba(0,0,0,0.04)_-8px_8px_24px_0px] grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] text-[#677484] mb-0.5 font-mono">Ngày chuyển: <span className="text-[#15171a] font-medium">{formattedTransferDate}</span></div>
            <div className="text-xs font-bold text-[#15171a]">{detail.sourceWarehouseName}</div>
          </div>

          <div>
            <div className="text-[11px] text-[#677484] mb-0.5 font-mono">
              {detail.receivedDate ? (
                <span>Ngày nhận: <span className="text-[#16a34a] font-bold">{formattedReceivedDate}</span></span>
              ) : (
                <span>Chuyển đến:</span>
              )}
            </div>
            {activeTab === 'INFO' ? (
              // Bên kho chuyển (Ảnh 2): Có thể chọn kho nhận
              <div className="relative max-w-xs">
                <select
                  value={destWarehouseName}
                  onChange={(e) => setDestWarehouseName(e.target.value)}
                  className="w-full h-8 px-3 rounded-[8px] border border-slate-300 bg-white text-xs text-[#15171a] font-medium focus:outline-none focus:border-[#0070f4] cursor-pointer appearance-none pr-8"
                >
                  <option value={detail.destWarehouseName}>{detail.destWarehouseName}</option>
                  {warehouses
                    .filter((w) => w.name !== detail.destWarehouseName && w.name !== detail.sourceWarehouseName)
                    .map((w) => (
                      <option key={w.warehouseId} value={w.name}>
                        {w.name}
                      </option>
                    ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none"
                />
              </div>
            ) : (
              // Bên kho nhận (Ảnh 3): Text cố định
              <div className="text-xs font-bold text-[#15171a]">{detail.destWarehouseName}</div>
            )}
          </div>
        </div>

        {/* Table danh sách sản phẩm chuyển */}
        <div className="bg-white rounded-[8px] border border-slate-200 overflow-hidden shadow-[rgba(0,0,0,0.04)_-8px_8px_24px_0px]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[11px] font-bold text-[#677484]">
              <tr>
                <th className="py-2 px-3 w-44">
                  <div className="mb-1">Mã hàng</div>
                  <input
                    type="text"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="Tìm mã hàng"
                    className="w-full h-7 px-2 text-xs font-normal bg-white border border-slate-300 rounded-[4px] text-[#15171a] focus:outline-none focus:border-[#0070f4]"
                  />
                </th>
                <th className="py-2 px-3 min-w-[200px]">
                  <div className="mb-1">Tên hàng</div>
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Tìm tên hàng"
                    className="w-full h-7 px-2 text-xs font-normal bg-white border border-slate-300 rounded-[4px] text-[#15171a] focus:outline-none focus:border-[#0070f4]"
                  />
                </th>
                <th className="py-2 px-3 text-right w-32 align-top">
                  <div className="pt-1">Số lượng chuyển</div>
                </th>
                {activeTab === 'RECEIVE' && (
                  <th className="py-2 px-3 text-right w-32 align-top">
                    <div className="pt-1">Số lượng nhận</div>
                  </th>
                )}
                <th className="py-2 px-3 text-right w-36 align-top">
                  <div className="pt-1">Giá chuyển/nhận</div>
                </th>
                <th className="py-2 px-3 text-right w-40 align-top">
                  <div className="pt-1">Thành tiền chuyển</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'RECEIVE' ? 6 : 5} className="py-6 text-center text-[#677484]">
                    Không có mặt hàng nào phù hợp với tìm kiếm
                  </td>
                </tr>
              ) : (
                filteredItems.map((it) => (
                  <tr key={it.id || it.productId} className="hover:bg-[#f7f8f9] transition">
                    <td className="py-2 px-3 font-mono font-medium text-[#0070f4]">
                      {it.productCode}
                    </td>
                    <td className="py-2 px-3 text-[#15171a]">
                      {it.productName} {it.unitName ? `(${it.unitName})` : ''}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-[#15171a]">
                      {it.transferQuantity}
                    </td>
                    {activeTab === 'RECEIVE' && (
                      <td className="py-2 px-3 text-right font-bold">
                        {it.receivedQuantity !== null && it.receivedQuantity !== undefined ? (
                          <span className={it.receivedQuantity < it.transferQuantity ? 'text-[#fb2c36]' : 'text-[#16a34a]'}>
                            {it.receivedQuantity}
                          </span>
                        ) : (
                          <span className="text-[#677484] font-normal">Chưa nhận</span>
                        )}
                      </td>
                    )}
                    <td className="py-2 px-3 text-right text-[#677484] font-mono">
                      {it.transferPrice > 0 ? it.transferPrice.toLocaleString('vi-VN') : '0'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-bold text-[#15171a]">
                      {(it.lineTotal || it.transferQuantity * (it.transferPrice || 0)).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Ghi chú & Thống kê tổng tiền */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Cột trái: Ghi chú */}
          <div>
            <div className="text-xs text-[#677484] mb-1.5 flex items-center gap-1.5">
              <span>{activeTab === 'INFO' ? 'Ghi chú chuyển' : 'Ghi chú nhận'}</span>
            </div>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Chưa có ghi chú"
              className="w-full p-2.5 rounded-[8px] border border-slate-300 bg-white text-xs text-[#15171a] focus:outline-none focus:border-[#0070f4] resize-none"
            />
          </div>

          {/* Cột phải: Tổng số mặt hàng, Tổng SL chuyển, Tổng giá trị */}
          <div className="flex flex-col justify-center items-end space-y-1.5 text-xs">
            <div className="flex items-center gap-6">
              <span className="text-[#677484]">Tổng số mặt hàng:</span>
              <span className="font-bold text-[#15171a] w-24 text-right">{detail.items?.length || 0}</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="text-[#677484]">Tổng SL chuyển:</span>
              <span className="font-bold text-[#15171a] w-24 text-right">{totalTransferQty}</span>
            </div>
            {detail.totalReceivedQuantity !== null && detail.totalReceivedQuantity !== undefined && (
              <>
                <div className="flex items-center gap-6">
                  <span className="text-[#677484]">Tổng SL nhận:</span>
                  <span className="font-bold text-[#16a34a] w-24 text-right">{detail.totalReceivedQuantity}</span>
                </div>
                {detail.totalReceivedQuantity < totalTransferQty && (
                  <div className="flex items-center gap-6">
                    <span className="text-[#fb2c36] font-medium">Chênh lệch (Thiếu):</span>
                    <span className="font-bold text-[#fb2c36] w-24 text-right">
                      -{totalTransferQty - detail.totalReceivedQuantity}
                    </span>
                  </div>
                )}
              </>
            )}
            <div className="flex items-center gap-6">
              <span className="text-[#677484]">Tổng giá trị chuyển:</span>
              <span className="font-bold text-[#15171a] text-sm font-mono w-24 text-right">
                {totalTransferAmount.toLocaleString('vi-VN')}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Footer Actions */}
        <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
          {/* Nhóm nút bên trái: Hủy, Xuất file */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] text-xs font-medium transition cursor-pointer bg-white"
            >
              <Trash2 size={13} className="text-[#677484]" />
              <span>Hủy</span>
            </button>

            <button
              type="button"
              onClick={() => {
                exportTransferToExcel(detail);
                showNotification('Đã xuất file Excel chi tiết chuyển hàng thành công!');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] text-xs font-medium transition cursor-pointer bg-white"
            >
              <FileUp size={13} className="text-[#677484]" />
              <span>Xuất file</span>
            </button>
          </div>

          {/* Nhóm nút bên phải: Mở phiếu (kho nhận) & In phiếu chuyển hàng */}
          <div className="flex items-center gap-2">
            {activeTab === 'RECEIVE' && detail.status === 'IN_TRANSIT' && (
              <button
                type="button"
                onClick={() => onOpenReceiveScreen(detail)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-bold text-xs transition cursor-pointer shadow-xs active:scale-95"
              >
                <ExternalLink size={14} />
                <span>Mở phiếu</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => printTransferSlip(detail, warehouses)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] text-xs font-semibold transition cursor-pointer bg-white"
            >
              <Printer size={13} className="text-[#677484]" />
              <span>In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
