// src/features/transfers/components/TransferRowDetail.tsx
// Chi tiết phiếu chuyển hàng hiển thị ngay dưới dòng trong bảng danh sách.
// Bố cục thống nhất với chi tiết Nhập hàng / Trả hàng nhập: tiêu đề + trạng thái, lưới thông tin,
// bảng hàng hóa, ghi chú + khung tổng, thanh nút (trái: Hủy, Xuất file; phải: thao tác chính, In).

'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { AlertTriangle, Copy, ExternalLink, FileDown, NotebookPen, Save, PackageCheck, Printer, RefreshCcw, Trash2, X } from 'lucide-react';
import type { TransferDetail, TransferStatus } from '../types';
import { transferService } from '../services/transferService';
import { formatDateTimeVN } from '../utils/dateUtils';
import { exportTransferToExcel, printTransferSlip } from '../utils/transferExportUtils';
import type { WarehouseFacility } from '@/features/roles/types';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { ProductCodeLink } from '@/components/links/EntityLinks';

interface Props {
  transferId: number;
  onRefresh: () => void;
  onOpenReceiveScreen: (transfer: TransferDetail) => void;
  warehouses?: WarehouseFacility[];
}

type DetailTab = 'info' | 'receive';

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const qtyFmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('vi-VN', { maximumFractionDigits: 3 });

const STATUS_TAG: Record<TransferStatus, { label: string; cls: string }> = {
  DRAFT: { label: 'Phiếu tạm', cls: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]' },
  IN_TRANSIT: { label: 'Đang chuyển', cls: 'bg-[#e6f1fe] text-[#0070f4] border-[#0070f4]/25' },
  RECEIVED: { label: 'Đã nhận', cls: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]' },
  CANCELLED: { label: 'Đã hủy', cls: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]' },
};

function StatusTag({ status }: { status: TransferStatus }) {
  const cfg = STATUS_TAG[status] ?? STATUS_TAG.DRAFT;
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${cfg.cls}`}>{cfg.label}</span>
  );
}

export const TransferRowDetail: React.FC<Props> = ({ transferId, onRefresh, onOpenReceiveScreen }) => {
  const router = useRouter();
  // Chi nhánh đang làm việc (chọn ở Header): chỉ kho nhận mới được nhận hàng
  const { activeWarehouse } = useActiveWarehouse();
  const [detail, setDetail] = useState<TransferDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<DetailTab>('info');
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [busy, setBusy] = useState(false);
  // Ghi chú đang sửa (undefined = chưa sửa, hiển thị giá trị đã lưu)
  const [noteEdits, setNoteEdits] = useState<{ notes?: string; receiveNotes?: string }>({});
  const [savingNotes, setSavingNotes] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    let alive = true;
    transferService
      .getTransferById(transferId)
      .then((res) => {
        if (!alive) return;
        setDetail(res);
        setLoadError(null);
        // Phiếu đã nhận thì mở sẵn tab Chi tiết nhận hàng
        if (res.status === 'RECEIVED') setTab('receive');
      })
      .catch((err: unknown) => {
        if (alive) setLoadError(err instanceof Error ? err.message : 'Không tải được chi tiết phiếu.');
      });
    return () => {
      alive = false;
    };
  }, [transferId]);

  const items = useMemo(() => {
    const code = searchCode.trim().toLowerCase();
    const name = searchName.trim().toLowerCase();
    return (detail?.items ?? []).filter(
      (it) => (!code || it.productCode.toLowerCase().includes(code)) && (!name || it.productName.toLowerCase().includes(name))
    );
  }, [detail, searchCode, searchName]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  if (loadError) {
    return <div className="px-6 py-8 text-center text-xs text-rose-600">{loadError}</div>;
  }

  if (!detail) {
    return (
      <div className="py-10 text-center text-xs text-slate-400">
        <RefreshCcw size={18} className="animate-spin mx-auto mb-2 text-[#0070f4]" />
        Đang tải chi tiết phiếu chuyển hàng...
      </div>
    );
  }

  const isReceiveTab = tab === 'receive';
  const hasReceived = detail.status === 'RECEIVED';
  const totalQty = detail.items.reduce((s, it) => s + (it.transferQuantity || 0), 0);
  const totalReceived = detail.items.reduce((s, it) => s + (it.receivedQuantity ?? 0), 0);
  const totalAmount = detail.items.reduce((s, it) => s + (it.lineTotal || 0), 0);
  const receivedAmount = detail.items.reduce((s, it) => s + (it.receivedQuantity ?? 0) * (it.transferPrice || 0), 0);
  const isAtDestWarehouse = activeWarehouse?.warehouseId === detail.destWarehouseId;
  // Hủy phiếu là thao tác của kho gửi
  const canCancel = detail.status !== 'CANCELLED' && activeWarehouse?.warehouseId === detail.sourceWarehouseId;

  const cancelHint =
    detail.status === 'IN_TRANSIT'
      ? 'Hàng đã xuất sẽ được hoàn lại tồn kho của kho chuyển.'
      : detail.status === 'RECEIVED'
        ? 'Hàng đã nhận sẽ bị trừ khỏi kho nhận và hoàn lại toàn bộ số lượng chuyển về kho chuyển.'
        : 'Phiếu tạm chưa làm thay đổi tồn kho.';

  // Ghi chú: giá trị hiển thị = đang sửa ?? đã lưu
  const transferNoteValue = noteEdits.notes ?? detail.notes ?? '';
  const receiveNoteValue = noteEdits.receiveNotes ?? detail.receiveNotes ?? '';
  const notesChanged =
    (noteEdits.notes !== undefined && noteEdits.notes.trim() !== (detail.notes ?? '').trim()) ||
    (noteEdits.receiveNotes !== undefined && noteEdits.receiveNotes.trim() !== (detail.receiveNotes ?? '').trim());

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const updated = await transferService.updateNotes(detail.id, {
        notes: noteEdits.notes,
        receiveNotes: noteEdits.receiveNotes,
      });
      setDetail(updated);
      setNoteEdits({});
      message.success('Cập nhật phiếu chuyển hàng thành công');
      onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không lưu được ghi chú.', 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCancel = async () => {
    setBusy(true);
    try {
      await transferService.cancelTransfer(detail.id, cancelReason.trim() || undefined);
      setCancelOpen(false);
      setCancelReason('');
      showToast(`Đã hủy phiếu ${detail.code}.`);
      setDetail(await transferService.getTransferById(detail.id));
      onRefresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể hủy phiếu chuyển hàng.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-6 py-4 text-[13px] text-[#15171a]">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
        {(
          [
            ['info', 'Thông tin'],
            ['receive', 'Chi tiết nhận hàng'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px cursor-pointer ${
              tab === key ? 'border-[#0070f4] text-[#0070f4] font-semibold' : 'border-transparent text-[#677484] hover:text-[#15171a]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {toast && (
        <div
          className={`mb-3 px-3 py-2 rounded-[8px] text-xs border ${
            toast.type === 'success' ? 'bg-[#e6f8ec] border-[#bbf7d0] text-[#16a34a]' : 'bg-[#fef2f2] border-[#fecaca] text-[#fb2c36]'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Tiêu đề + thông tin chung */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-base font-bold font-mono">{detail.code}</span>
          <StatusTag status={detail.status} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600">
          <div>
            <span className="text-slate-400">Người tạo: </span>
            <span className="font-medium text-slate-800">{detail.createdBy || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400">Ngày chuyển: </span>
            <span className="font-medium text-slate-800">{formatDateTimeVN(detail.transferDate) || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400">Ngày nhận: </span>
            <span className="font-medium text-slate-800">{formatDateTimeVN(detail.receivedDate) || '—'}</span>
          </div>
          <div>
            <span className="text-slate-400">Từ chi nhánh: </span>
            <span className="font-semibold text-slate-800">{detail.sourceWarehouseName}</span>
          </div>
          <div>
            <span className="text-slate-400">Tới chi nhánh: </span>
            <span className="font-semibold text-slate-800">{detail.destWarehouseName}</span>
          </div>
          {hasReceived && (
            <div>
              <span className="text-slate-400">Người nhận: </span>
              <span className="font-medium text-slate-800">{detail.receivedBy || '—'}</span>
            </div>
          )}
          {hasReceived && (
            <div>
              <span className="text-slate-400">Tình trạng nhận: </span>
              <span className={`font-semibold ${totalReceived === totalQty ? 'text-[#16a34a]' : 'text-[#fb2c36]'}`}>
                {totalReceived === totalQty ? 'Khớp' : 'Không khớp'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bảng hàng hóa */}
      <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-3">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
            <tr>
              <th className="py-2 px-3 w-10 text-center">STT</th>
              <th className="py-2 px-3 w-36">Mã hàng</th>
              <th className="py-2 px-3">Tên hàng</th>
              <th className="py-2 px-3 w-16 text-center">ĐVT</th>
              <th className="py-2 px-3 w-24 text-right">SL chuyển</th>
              {isReceiveTab && <th className="py-2 px-3 w-24 text-right">SL nhận</th>}
              {isReceiveTab && <th className="py-2 px-3 w-24 text-right">Chênh lệch</th>}
              <th className="py-2 px-3 w-28 text-right">Giá chuyển</th>
              <th className="py-2 px-3 w-32 text-right">{isReceiveTab ? 'Thành tiền nhận' : 'Thành tiền'}</th>
            </tr>
            <tr className="bg-white border-t border-slate-200">
              <th />
              <th className="py-1.5 px-3">
                <input
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Tìm mã hàng"
                  className="w-full h-7 px-2 text-xs font-normal border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
                />
              </th>
              <th className="py-1.5 px-3">
                <input
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Tìm tên hàng"
                  className="w-full h-7 px-2 text-xs font-normal border border-slate-300 rounded-[6px] focus:outline-none focus:border-[#0070f4]"
                />
              </th>
              <th colSpan={isReceiveTab ? 6 : 4} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={isReceiveTab ? 9 : 7} className="py-6 text-center text-slate-400">
                  Không có mặt hàng nào phù hợp
                </td>
              </tr>
            ) : (
              items.map((it, i) => {
                const received = it.receivedQuantity;
                const diff = received !== null && received !== undefined ? received - it.transferQuantity : null;
                return (
                  <tr key={it.id ?? it.productId} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                    <td className="py-2 px-3 font-mono font-semibold">
                      <ProductCodeLink code={it.productCode} productId={it.productId} />
                    </td>
                    <td className="py-2 px-3 font-medium">
                      {it.productName}
                      {it.notes && <div className="text-[11px] italic font-normal text-[#677484]">({it.notes})</div>}
                      {it.receiveNotes && (
                        <div className="text-[11px] italic font-normal text-[#677484]">({it.receiveNotes})</div>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center text-slate-500">{it.unitName}</td>
                    <td className="py-2 px-3 text-right">{qtyFmt(it.transferQuantity)}</td>
                    {isReceiveTab && (
                      <td className="py-2 px-3 text-right font-semibold">
                        {received !== null && received !== undefined ? qtyFmt(received) : <span className="font-normal text-slate-400">Chưa nhận</span>}
                      </td>
                    )}
                    {isReceiveTab && (
                      <td className={`py-2 px-3 text-right ${diff && diff < 0 ? 'text-[#fb2c36] font-semibold' : 'text-slate-500'}`}>
                        {diff === null ? '—' : diff === 0 ? '0' : qtyFmt(diff)}
                      </td>
                    )}
                    <td className="py-2 px-3 text-right">{money.format(it.transferPrice)}</td>
                    <td className="py-2 px-3 text-right font-semibold">
                      {money.format(isReceiveTab ? (received ?? 0) * it.transferPrice : it.lineTotal)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Ghi chú chuyển / ghi chú nhận (sửa được, bấm Lưu) + tổng */}
      <div className="flex flex-col md:flex-row items-start gap-6 mb-4">
        <div className="flex-1 w-full space-y-2">
          {isAtDestWarehouse ? (
            <>
              <div className="flex items-start gap-2 text-xs text-[#15171a]">
                <NotebookPen size={14} className="text-[#677484] shrink-0 mt-0.5" />
                <span>Ghi chú chuyển: {detail.notes || <span className="text-[#677484]">Chưa có ghi chú</span>}</span>
              </div>
              {(hasReceived || detail.status === 'IN_TRANSIT') && (
                <textarea
                  rows={3}
                  value={receiveNoteValue}
                  onChange={(e) => setNoteEdits((prev) => ({ ...prev, receiveNotes: e.target.value }))}
                  placeholder="Ghi chú nhận"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-[8px] bg-white focus:outline-none focus:border-[#0070f4] resize-none"
                />
              )}
            </>
          ) : (
            <>
              <textarea
                rows={3}
                value={transferNoteValue}
                onChange={(e) => setNoteEdits((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Ghi chú chuyển"
                className="w-full p-2.5 text-xs border border-slate-300 rounded-[8px] bg-white focus:outline-none focus:border-[#0070f4] resize-none"
              />
              {(hasReceived || !!detail.receiveNotes) && (
                <div className="flex items-start gap-2 text-xs text-[#15171a]">
                  <NotebookPen size={14} className="text-[#677484] shrink-0 mt-0.5" />
                  <span>Ghi chú nhận: {detail.receiveNotes || <span className="text-[#677484]">Chưa có ghi chú</span>}</span>
                </div>
              )}
            </>
          )}
        </div>
        <div className="w-full md:w-72 shrink-0 space-y-1.5 text-xs bg-slate-50/60 p-3 rounded-[8px] border border-slate-200">
          <div className="flex justify-between text-slate-600">
            <span>Tổng số mặt hàng:</span>
            <span className="font-semibold text-slate-800">{detail.items.length}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tổng SL chuyển:</span>
            <span className="font-semibold text-slate-800">{qtyFmt(totalQty)}</span>
          </div>
          {hasReceived && (
            <>
              <div className="flex justify-between text-slate-600">
                <span>Tổng SL nhận:</span>
                <span className="font-semibold text-[#16a34a]">{qtyFmt(totalReceived)}</span>
              </div>
              {totalReceived !== totalQty && (
                <div className="flex justify-between text-[#fb2c36]">
                  <span>Chênh lệch:</span>
                  <span className="font-semibold">{qtyFmt(totalReceived - totalQty)}</span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1.5 font-bold">
            <span>{isReceiveTab && hasReceived ? 'Tổng giá trị nhận:' : 'Tổng giá trị chuyển:'}</span>
            <span>{money.format(isReceiveTab && hasReceived ? receivedAmount : totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Thanh nút */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-[8px] border border-rose-200 bg-white cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Hủy</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => router.push(`/transfers/create?copy=${detail.id}`)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#15171a] hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer"
            title="Tạo phiếu chuyển mới từ phiếu này"
          >
            <Copy size={13} />
            <span>Sao chép</span>
          </button>
          <button
            type="button"
            onClick={() => exportTransferToExcel(detail)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#15171a] hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer"
          >
            <FileDown size={13} />
            <span>Xuất file</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {detail.status === 'DRAFT' && (
            <button
              type="button"
              onClick={() => router.push(`/transfers/create?id=${detail.id}`)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold cursor-pointer"
            >
              <ExternalLink size={13} />
              <span>Mở phiếu</span>
            </button>
          )}
          {detail.status === 'IN_TRANSIT' && !isAtDestWarehouse && (
            <span className="text-xs text-[#677484] italic mr-1">Chờ {detail.destWarehouseName} nhận hàng</span>
          )}
          {detail.status === 'IN_TRANSIT' && isAtDestWarehouse && (
            <button
              type="button"
              onClick={() => onOpenReceiveScreen(detail)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold cursor-pointer"
              title="Kho nhận kiểm đếm và xác nhận nhận hàng"
            >
              <PackageCheck size={14} />
              <span>Nhận hàng</span>
            </button>
          )}
          <button
            type="button"
            disabled={!notesChanged || savingNotes}
            onClick={handleSaveNotes}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={notesChanged ? 'Lưu ghi chú chuyển / ghi chú nhận' : 'Chưa có thay đổi ghi chú'}
          >
            <Save size={13} />
            <span>{savingNotes ? 'Đang lưu...' : 'Lưu'}</span>
          </button>
          <button
            type="button"
            onClick={() => printTransferSlip(detail)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer"
          >
            <Printer size={13} />
            <span>In</span>
          </button>
        </div>
      </div>

      {/* Xác nhận hủy phiếu (modal tự dựng) */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] shadow-lg max-w-md w-full border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-[#15171a]">Hủy phiếu chuyển hàng</h3>
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="text-[#677484] hover:text-[#15171a] cursor-pointer"
                title="Đóng"
              >
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3 text-[13px]">
              <div className="flex items-start gap-2.5 p-3 rounded-[8px] bg-[#fffbeb] border border-[#fde68a] text-[#92400e] text-xs">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Hủy phiếu <strong>{detail.code}</strong>? {cancelHint}
                </span>
              </div>
              <div>
                <label className="text-xs text-[#677484] block mb-1">Lý do hủy</label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Nhập lý do hủy (không bắt buộc)"
                  className="w-full p-2.5 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#0070f4] resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelOpen(false)}
                className="px-4 py-1.5 text-xs rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] cursor-pointer"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleCancel}
                className="px-4 py-1.5 text-xs rounded-[8px] bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer disabled:opacity-60"
              >
                {busy ? 'Đang hủy...' : 'Hủy phiếu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
