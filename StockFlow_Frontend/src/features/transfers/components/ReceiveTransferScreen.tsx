// src/features/transfers/components/ReceiveTransferScreen.tsx
// Màn hình Nhận hàng (Phiếu nhận hàng) mở khi bấm nút [Mở phiếu] từ Bên kho nhận (Khớp 100% Ảnh 4)

'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TransferDetail } from '../types';
import { transferService } from '../services/transferService';
import {
  toLocalDatetimeInputString,
  formatDateTimeVN,
  getDefaultReceiveDate,
  validateReceiveAfterTransfer,
} from '../utils/dateUtils';
import {
  ArrowLeft,
  Search,
  Calendar,
  Clock,
  User,
  Info,
  Pencil,
  Save,
  Check,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface Props {
  transfer: TransferDetail;
  onClose: () => void;
  onSuccess: () => void;
}

type FilterTab = 'ALL' | 'MATCH' | 'DIFF' | 'UNRECEIVED';

/** Bản kiểm đếm tạm của phiếu nhận (lưu trên trình duyệt; phiếu Đang chuyển không sửa được trên hệ thống) */
interface ReceiveDraft {
  receivedQtys: Record<number, number>;
  itemNotes: Record<number, string>;
  receiveNotes: string;
}

const receiveDraftKey = (transferId: number) => `stockflow_transfer_receive_draft_${transferId}`;

function loadReceiveDraft(transferId: number): ReceiveDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(receiveDraftKey(transferId));
    return raw ? (JSON.parse(raw) as ReceiveDraft) : null;
  } catch {
    return null;
  }
}

export const ReceiveTransferScreen: React.FC<Props> = ({
  transfer,
  onClose,
  onSuccess,
}) => {
  // State quản lý số lượng nhận cho từng mặt hàng (mặc định bằng SL chuyển)
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>(() => {
    const draft = loadReceiveDraft(transfer.id);
    if (draft?.receivedQtys) return draft.receivedQtys;
    const init: Record<number, number> = {};
    (transfer.items || []).forEach((it) => {
      init[it.productId] = it.receivedQuantity !== null && it.receivedQuantity !== undefined
        ? it.receivedQuantity
        : it.transferQuantity;
    });
    return init;
  });

  const [itemNotes, setItemNotes] = useState<Record<number, string>>(() => {
    const draft = loadReceiveDraft(transfer.id);
    if (draft?.itemNotes) return draft.itemNotes;
    const init: Record<number, string> = {};
    (transfer.items || []).forEach((it) => {
      if (it.receiveNotes) init[it.productId] = it.receiveNotes;
    });
    return init;
  });

  // Header Search & Tab filter
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');

  // Sidebar state: Thời gian nhận hàng (mặc định đảm bảo > thời gian chuyển hàng)
  const [receiveDate, setReceiveDate] = useState(() => {
    return getDefaultReceiveDate(transfer.transferDate);
  });

  // Tối thiểu thời gian nhận hàng phải sau thời gian chuyển hàng (ít nhất 1 phút)
  const minReceiveDate = useMemo(() => {
    if (!transfer.transferDate) return undefined;
    const t = new Date(transfer.transferDate);
    if (isNaN(t.getTime())) return undefined;
    return toLocalDatetimeInputString(new Date(t.getTime() + 60 * 1000));
  }, [transfer.transferDate]);
  // Ghi chú nhận: bản lưu tạm trên máy → ghi chú nhận đã lưu ở chi tiết phiếu (lúc đang chuyển) → trống
  const [receiveNotes, setReceiveNotes] = useState(
    () => loadReceiveDraft(transfer.id)?.receiveNotes ?? transfer.receiveNotes ?? ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Phím tắt F3 focus ô tìm kiếm
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleQtyChange = (productId: number, val: number) => {
    setReceivedQtys((prev) => ({
      ...prev,
      // Giữ nguyên số âm để báo lỗi khi lưu (SYS-TRF-N03), không lặng lẽ đổi thành 0 rồi nhận 0
      [productId]: isNaN(val) ? 0 : val,
    }));
  };

  // Thống kê phân loại theo Tab: Khớp / Lệch / Chưa nhận
  const stats = useMemo(() => {
    const items = transfer.items || [];
    let matchCount = 0;
    let diffCount = 0;
    let unreceivedCount = 0;

    items.forEach((it) => {
      const rec = receivedQtys[it.productId] ?? it.transferQuantity;
      if (rec === 0) {
        unreceivedCount++;
      } else if (rec === it.transferQuantity) {
        matchCount++;
      } else {
        diffCount++;
      }
    });

    return {
      total: items.length,
      match: matchCount,
      diff: diffCount,
      unreceived: unreceivedCount,
    };
  }, [transfer.items, receivedQtys]);

  // Danh sách hiển thị sau khi lọc qua tab và ô tìm kiếm F3
  const displayedItems = useMemo(() => {
    let list = transfer.items || [];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (it) =>
          it.productCode.toLowerCase().includes(q) ||
          it.productName.toLowerCase().includes(q)
      );
    }

    if (activeTab === 'MATCH') {
      list = list.filter(
        (it) => (receivedQtys[it.productId] ?? it.transferQuantity) === it.transferQuantity
      );
    } else if (activeTab === 'DIFF') {
      list = list.filter((it) => {
        const rec = receivedQtys[it.productId] ?? it.transferQuantity;
        return rec !== it.transferQuantity && rec > 0;
      });
    } else if (activeTab === 'UNRECEIVED') {
      list = list.filter(
        (it) => (receivedQtys[it.productId] ?? it.transferQuantity) === 0
      );
    }

    return list;
  }, [transfer.items, receivedQtys, searchQuery, activeTab]);

  const totalTransferQty = useMemo(() => {
    return (transfer.items || []).reduce((sum, it) => sum + it.transferQuantity, 0);
  }, [transfer.items]);

  const totalReceivedQty = useMemo(() => {
    return (transfer.items || []).reduce(
      (sum, it) => sum + (receivedQtys[it.productId] ?? it.transferQuantity),
      0
    );
  }, [transfer.items, receivedQtys]);

  // Kiểm tra có mặt hàng nào nhận thiếu (SL_Nhận < SL_Chuyển)
  const hasShortage = useMemo(() => {
    return (transfer.items || []).some((it) => {
      const rec = receivedQtys[it.productId] ?? it.transferQuantity;
      return rec < it.transferQuantity;
    });
  }, [transfer.items, receivedQtys]);

  // Mặt hàng nhập SL nhận lớn hơn SL chuyển (không cho phép, backend cũng chặn)
  const overReceivedItems = useMemo(
    () =>
      (transfer.items || []).filter(
        (it) => (receivedQtys[it.productId] ?? it.transferQuantity) > it.transferQuantity
      ),
    [transfer.items, receivedQtys]
  );

  // Thông báo cùng câu với backend: "Hàng <mã> - <tên>: số lượng nhận (x) không được lớn hơn số lượng chuyển (y)."
  const overReceivedMessage = (): string | null => {
    // Số âm: cùng câu với backend "Hàng <mã> - <tên>: số lượng nhận không được âm." (DEF-IT-03)
    const negative = (transfer.items || []).find((it) => (receivedQtys[it.productId] ?? it.transferQuantity) < 0);
    if (negative) return `Hàng ${negative.productCode} - ${negative.productName}: số lượng nhận không được âm.`;
    if (overReceivedItems.length === 0) return null;
    const first = overReceivedItems[0];
    const more = overReceivedItems.length > 1 ? ` (và ${overReceivedItems.length - 1} mặt hàng khác)` : '';
    return `Hàng ${first.productCode} - ${first.productName}: số lượng nhận (${receivedQtys[first.productId]}) không được lớn hơn số lượng chuyển (${first.transferQuantity})${more}.`;
  };

  // Hành động: Lưu tạm phiếu nhận
  const handleSaveDraft = () => {
    const overMsg = overReceivedMessage();
    if (overMsg) {
      showToast(overMsg, 'error');
      return;
    }
    try {
      const draft: ReceiveDraft = { receivedQtys, itemNotes, receiveNotes };
      localStorage.setItem(receiveDraftKey(transfer.id), JSON.stringify(draft));
      showToast('Đã lưu tạm số lượng kiểm đếm trên máy này. Phiếu vẫn ở trạng thái Đang chuyển cho tới khi bấm Nhận hàng.');
    } catch {
      showToast('Không lưu tạm được trên trình duyệt này.', 'error');
    }
  };

  // Hành động: Bấm Nhận hàng (Hoàn tất nhập kho)
  const handleConfirmReceive = async () => {
    // Logic thời gian: Thời gian nhận hàng > Thời gian chuyển hàng
    const dateCheck = validateReceiveAfterTransfer(transfer.transferDate, receiveDate);
    if (!dateCheck.isValid) {
      showToast(dateCheck.message || 'Thời gian nhận hàng phải sau thời gian chuyển hàng!', 'error');
      return;
    }

    // Số lượng nhận không được lớn hơn số lượng chuyển
    const overMsg = overReceivedMessage();
    if (overMsg) {
      showToast(overMsg, 'error');
      return;
    }

    // Quy tắc 1: Nếu nhận thiếu hàng, BẮT BUỘC phải ghi chú
    if (hasShortage && !receiveNotes.trim()) {
      showToast(
        'Phát hiện nhận thiếu hàng! Bắt buộc phải nhập ghi chú lý do thiếu hàng trước khi xác nhận Nhận hàng.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const itemsPayload = (transfer.items || []).map((it) => ({
        transferItemId: it.id,
        productId: it.productId,
        receivedQuantity: receivedQtys[it.productId] ?? it.transferQuantity,
        notes: itemNotes[it.productId]?.trim() || undefined,
      }));

      await transferService.receiveTransfer(transfer.id, {
        receivedDate: receiveDate
          ? (receiveDate.length === 16 ? `${receiveDate}:00` : receiveDate)
          : undefined,
        notes: receiveNotes,
        items: itemsPayload,
      });

      try {
        localStorage.removeItem(receiveDraftKey(transfer.id));
      } catch {
        // bỏ qua
      }
      showToast(`Đã nhận hàng thành công cho phiếu ${transfer.code}!`, 'success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 800);
    } catch (err) {
      console.error('Lỗi nhận hàng:', err);
      showToast(err instanceof Error ? err.message : 'Có lỗi xảy ra khi xác nhận nhận hàng!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format ngày chuyển chuẩn Việt Nam: DD/MM/YYYY HH:mm
  const formattedTransferDate = formatDateTimeVN(transfer.transferDate);

  return (
    <div className="fixed inset-0 z-50 stockflow-brand-bg flex flex-col text-[13px] text-[#15171a] select-none animate-in fade-in duration-200 font-sans">
      {/* 1. Thanh Topbar Navigation */}
      <header className="h-12 bg-white/85 backdrop-blur-[2px] border-b border-slate-200 px-4 flex items-center relative shrink-0 shadow-2xs">
        {/* Nút quay lại & Tiêu đề */}
        <div className="flex items-center gap-3 z-10">
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-[8px] hover:bg-[#f7f8f9] flex items-center justify-center text-[#677484] hover:text-[#15171a] transition cursor-pointer"
            title="Quay lại danh sách"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-[16px] font-bold text-[#15171a] tracking-tight">
            Chuyển hàng
          </h1>
        </div>

        {/* Ô tìm kiếm căn chính giữa màn hình giống tạo phiếu chuyển */}
        <div className="absolute left-1/2 -translate-x-1/2 w-full max-w-xl px-4 pointer-events-auto">
          <div className="relative w-full">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none">
              <Search size={14} />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm hàng hóa theo mã hoặc tên"
              className="w-full h-8 pl-8 pr-4 rounded-full border border-slate-300 bg-[#f7f8f9] text-[13px] text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white shadow-2xs transition"
            />
          </div>
        </div>
      </header>

      {/* Thông báo Toast */}
      {toastMessage && (
        <div
          className={`fixed top-14 right-6 z-60 px-4 py-2.5 rounded-[8px] shadow-lg border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 ${
            toastMessage.type === 'success'
              ? 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]'
              : 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={16} className="text-[#16a34a]" />
          ) : (
            <AlertCircle size={16} className="text-[#fb2c36]" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 2. Thân màn hình: 2 Cột (Trái: Bảng kiểm đếm | Phải: Thông tin phiếu & Nút Nhận hàng) */}
      <div className="flex-1 flex overflow-hidden">
        {/* CỘT TRÁI: Tabs & Bảng sản phẩm kiểm đếm */}
        <main className="flex-1 flex flex-col bg-white/65 overflow-hidden border-r border-slate-200">
          {/* Tabs: Tất cả | Khớp | Lệch | Chưa nhận */}
          <div className="h-10 border-b border-slate-200 px-4 flex items-center gap-6 bg-white/80 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`h-full text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'ALL'
                  ? 'border-[#0070f4] text-[#0070f4]'
                  : 'border-transparent text-[#677484] hover:text-[#15171a]'
              }`}
            >
              <span>Tất cả</span>
              <span className="text-[11px] font-semibold text-[#677484]">({stats.total})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('MATCH')}
              className={`h-full text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'MATCH'
                  ? 'border-[#0070f4] text-[#0070f4]'
                  : 'border-transparent text-[#677484] hover:text-[#15171a]'
              }`}
            >
              <span>Khớp</span>
              <span className="text-[11px] font-semibold text-[#677484]">({stats.match})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DIFF')}
              className={`h-full text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'DIFF'
                  ? 'border-[#0070f4] text-[#0070f4]'
                  : 'border-transparent text-[#677484] hover:text-[#15171a]'
              }`}
            >
              <span>Lệch</span>
              <span className="text-[11px] font-semibold text-[#677484]">({stats.diff})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('UNRECEIVED')}
              className={`h-full text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'UNRECEIVED'
                  ? 'border-[#0070f4] text-[#0070f4]'
                  : 'border-transparent text-[#677484] hover:text-[#15171a]'
              }`}
            >
              <span>Chưa nhận</span>
              <span className="text-[11px] font-semibold text-[#677484]">({stats.unreceived})</span>
            </button>
          </div>

          {/* Cảnh báo nhận thiếu hàng (Quy tắc 1) */}
          {hasShortage && (
            <div className="mx-4 mt-3 mb-1 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-3 text-xs text-amber-900 shadow-2xs animate-in fade-in duration-200">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <AlertTriangle size={16} />
              </div>
              <div className="flex-1">
                <span className="font-bold">Lưu ý nhận thiếu hàng: </span>
                Số lượng nhận thực tế ít hơn số lượng chuyển. Bạn <span className="font-bold underline text-amber-950">bắt buộc phải nhập ghi chú</span> lý do thiếu hàng ở khung bên phải trước khi xác nhận &quot;Nhận hàng&quot;.
              </div>
            </div>
          )}

          {/* Bảng sản phẩm kiểm đếm */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#f7f8f9] border-b border-slate-200 text-[11px] font-bold text-[#677484] sticky top-0 z-10">
                <tr>
                  <th className="py-2 px-3 w-12 text-center">STT</th>
                  <th className="py-2 px-3 w-28">Mã hàng</th>
                  <th className="py-2 px-3 min-w-[220px]">Tên hàng</th>
                  <th className="py-2 px-3 w-20 text-center">ĐVT</th>
                  <th className="py-2 px-3 w-20 text-right">Tồn kho</th>
                  <th className="py-2 px-3 w-24 text-right">SL chuyển</th>
                  <th className="py-2 px-3 w-28 text-right">SL nhận</th>
                  <th className="py-2 px-3 w-28 text-right">Giá chuyển</th>
                  <th className="py-2 px-3 w-32 text-right">Thành tiền nhận</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-[#677484]">
                      Không có sản phẩm nào trong danh mục hiển thị
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((it, idx) => {
                    const currentRecQty = receivedQtys[it.productId] ?? it.transferQuantity;
                    const isDiff = currentRecQty !== it.transferQuantity;
                    // Vượt số chuyển hoặc âm: tô đỏ, bấm Nhận hàng sẽ bị chặn kèm thông báo
                    const isOver = currentRecQty > it.transferQuantity || currentRecQty < 0;
                    const currentLineTotal = currentRecQty * (it.transferPrice || 0);

                    return (
                      <tr
                        key={it.id || it.productId}
                        className={`hover:bg-[#f7f8f9] transition ${
                          isDiff ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center text-[#677484] font-medium">
                          {idx + 1}
                        </td>

                        <td className="py-2.5 px-3 font-mono font-medium text-[#0070f4]">
                          {it.productCode}
                        </td>

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1 font-medium text-[#15171a]">
                            <span>{it.productName}</span>
                            <Info size={12} className="text-[#677484] cursor-pointer" />
                          </div>
                          {it.notes && (
                            <div className="text-[11px] italic text-[#677484] mt-0.5" title="Ghi chú của chi nhánh chuyển">
                              ({it.notes})
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-[11px] text-[#677484] mt-0.5">
                            <input
                              type="text"
                              value={itemNotes[it.productId] || ''}
                              onChange={(e) =>
                                setItemNotes((prev) => ({
                                  ...prev,
                                  [it.productId]: e.target.value,
                                }))
                              }
                              placeholder="Ghi chú..."
                              className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#0070f4] focus:outline-none text-[11px] text-[#15171a] w-36"
                            />
                            <Pencil size={10} className="text-[#677484]" />
                          </div>
                        </td>

                        <td className="py-2.5 px-3 text-center text-[#0070f4] font-medium">
                          {it.unitName || 'cái'}
                        </td>

                        <td className="py-2.5 px-3 text-right text-[#677484]">
                          {it.destStock !== undefined ? it.destStock : 0}
                        </td>

                        <td className="py-2.5 px-3 text-right font-bold text-[#15171a]">
                          {it.transferQuantity}
                        </td>

                        {/* Ô nhập SL nhận */}
                        <td className="py-2 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={it.transferQuantity}
                            step={1}
                            value={currentRecQty}
                            onChange={(e) =>
                              handleQtyChange(it.productId, Number(e.target.value))
                            }
                            title={
                              currentRecQty < 0
                                ? 'Số lượng nhận không được âm'
                                : isOver
                                  ? `Số lượng nhận không được lớn hơn số lượng chuyển (${it.transferQuantity})`
                                  : undefined
                            }
                            className={`w-20 h-7 px-2 text-right rounded-[6px] border text-xs font-bold transition focus:outline-none ${
                              isOver
                                ? 'border-[#fb2c36] bg-[#fef2f2] text-[#fb2c36] focus:ring-1 focus:ring-[#fb2c36]'
                                : isDiff
                                ? 'border-amber-400 bg-amber-50 text-amber-900 focus:ring-1 focus:ring-amber-500'
                                : 'border-slate-300 bg-white text-[#15171a] focus:border-[#0070f4]'
                            }`}
                          />
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-[#677484]">
                          {(it.transferPrice || 0).toLocaleString('vi-VN')}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#15171a]">
                          {currentLineTotal.toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </main>

        {/* CỘT PHẢI: Sidebar Thông tin phiếu & Nút Nhận hàng */}
        <aside className="w-80 bg-white/80 backdrop-blur-[2px] flex flex-col justify-between shrink-0 shadow-xs border-l border-slate-200">
          <div className="p-4 space-y-3.5 overflow-y-auto">
            {/* User & Date picker */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1.5 text-xs text-[#15171a] font-medium">
                <User size={13} className="text-[#677484]" />
                <span>{transfer.createdBy || 'Quản trị viên'}</span>
              </div>

              <div className="flex items-center gap-1 text-xs text-[#677484]">
                <input
                  type="datetime-local"
                  value={receiveDate}
                  min={minReceiveDate}
                  onChange={(e) => setReceiveDate(e.target.value)}
                  className="h-8 px-2 rounded-[8px] border border-slate-300 text-[11px] font-mono text-[#15171a] bg-white hover:border-[#0070f4] focus:border-[#0070f4] focus:outline-none cursor-pointer transition shadow-2xs"
                  title="Thời gian nhận hàng (phải sau thời gian chuyển hàng)"
                />
              </div>
            </div>

            {/* Thông tin phiếu chuyển */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#677484]">Mã chuyển hàng</span>
                <span className="font-mono font-bold text-[#15171a]">{transfer.code}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#677484]">Trạng thái</span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e6f1fe] text-[#0070f4] border border-[#0070f4]/25">
                  {transfer.status === 'RECEIVED' ? 'Đã nhận' : 'Đang chuyển'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#677484]">Chi nhánh gửi</span>
                <span className="font-medium text-[#15171a] text-right">{transfer.sourceWarehouseName}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#677484]">Ngày chuyển</span>
                <span className="font-mono text-[#677484]">{formattedTransferDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#677484] shrink-0">Ghi chú chuyển</span>
                <span className="text-[#15171a] text-right ml-3">{transfer.notes || '—'}</span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-[#677484]">Tổng số lượng chuyển</span>
                <span className="font-bold text-[#15171a]">{totalTransferQty}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#677484]">Tổng số lượng nhận</span>
                <span className="font-bold text-[#15171a] text-sm">{totalReceivedQty}</span>
              </div>
            </div>

            {/* Ô ghi chú nhận hàng */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs text-[#15171a] font-medium">
                  <Pencil size={12} className="text-[#677484]" />
                  <span>Ghi chú nhận</span>
                </div>
                {hasShortage && (
                  <span className="text-[10px] font-bold text-[#fb2c36] bg-[#fef2f2] px-1.5 py-0.5 rounded border border-[#fecaca] animate-pulse">
                    * Bắt buộc khi nhận thiếu
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={receiveNotes}
                onChange={(e) => setReceiveNotes(e.target.value)}
                placeholder={
                  hasShortage
                    ? "Nhập lý do nhận thiếu hàng (bắt buộc)..."
                    : "Nhập ghi chú kiểm đếm..."
                }
                className={`w-full p-2.5 rounded-[8px] border text-xs text-[#15171a] placeholder-[#677484] focus:outline-none transition resize-none ${
                  hasShortage && !receiveNotes.trim()
                    ? "border-[#fb2c36] bg-[#fef2f2]/40 focus:border-[#fb2c36] focus:ring-1 focus:ring-[#fb2c36]"
                    : "border-slate-300 focus:border-[#0070f4]"
                }`}
              />
            </div>
          </div>

          {/* Action Buttons: Lưu tạm (Xanh dương) & Nhận hàng (Secondary Accent) */}
          <div className="p-4 border-t border-slate-200 bg-white grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSaveDraft}
              className="h-9 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
            >
              <Save size={14} />
              <span>Lưu tạm</span>
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleConfirmReceive}
              className="h-9 rounded-[8px] bg-[#005ac3] hover:bg-[#00479b] text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50 active:scale-98"
            >
              {isSubmitting ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Check size={16} className="stroke-[2.5]" />
              )}
              <span>Nhận hàng</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
