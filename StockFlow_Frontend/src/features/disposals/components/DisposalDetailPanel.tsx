'use client';

// Chi tiết phiếu xuất hủy (mở rộng dưới dòng trong bảng danh sách) — cùng bố cục chi tiết Chuyển hàng:
// 1. Tiêu đề (mã phiếu + trạng thái) + lưới thông tin: Người tạo, Người xuất hủy (chọn), Ngày xuất hủy
//    (chọn ngày giờ — chỉ phiếu tạm), Chi nhánh
// 2. Bảng hàng hủy có ô lọc theo mã / tên hàng: Mã hàng, Tên hàng, ĐVT, SL hủy, Giá vốn, Giá trị hủy
// 3. Ghi chú / lý do (sửa được) + khung tổng (số mặt hàng, SL hủy, giá trị hủy)
// 4. Thanh nút: Hủy · Sao chép · Xuất file | (Mở phiếu khi là phiếu tạm) · Lưu · In

import React, { useEffect, useMemo, useState } from 'react';
import { message } from 'antd';
import { AlertTriangle, Copy, ExternalLink, FileDown, Printer, Save, Trash2, X } from 'lucide-react';
import { formatDateTimeVN } from '@/lib/utils/date';
import { ProductCodeLink } from '@/components/links/EntityLinks';
import { disposalService } from '../services/disposalService';
import { exportDisposalExcel, printDisposal } from '../utils/disposalDocs';
import { DISPOSAL_STATUS_LABEL, type DisposalDetail, type DisposalStaffOption, type DisposalStatus } from '../types';
import { formatCost } from '@/lib/utils/cost';

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const qty = (n: number) => n.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

const STATUS_CLS: Record<DisposalStatus, string> = {
  DRAFT: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]',
  COMPLETED: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]',
  CANCELLED: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]',
};

export function DisposalStatusTag({ status }: { status: DisposalStatus }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap ${STATUS_CLS[status] ?? ''}`}>
      {DISPOSAL_STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** ISO (giờ Việt Nam từ server) → giá trị ô datetime-local */
function toInputValue(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function nowInputValue(): string {
  return toInputValue(new Date().toISOString());
}

/** Định dạng thông tin Người tạo: luôn có số điện thoại, không để trống (fallback an toàn) */
function formatCreatorInfo(s: { createdByName?: string | null; createdByPhone?: string | null; createdBy?: number | null }): string {
  const name = s.createdByName?.trim() || '';
  const phone = s.createdByPhone?.trim() || '';
  if (name && phone && !name.includes(phone)) {
    return `${name} - ${phone}`;
  }
  if (name) return name;
  if (phone) return `NV${s.createdBy ?? ''} - ${phone}`;
  return 'Quản trị viên Hệ thống';
}

interface Props {
  detail: DisposalDetail;
  /** Phiếu thay đổi sau Lưu / Hủy → cập nhật lại dòng trong danh sách */
  onChanged: (detail: DisposalDetail) => void;
  onCopy: () => void;
  /** Mở lại phiếu tạm ở form lập phiếu (sửa hàng hóa, Hoàn thành) */
  onOpenDraft: () => void;
}

export function DisposalDetailPanel({ detail, onChanged, onCopy, onOpenDraft }: Props) {
  const s = detail.summary;
  const isDraft = s.status === 'DRAFT';
  const isCancelled = s.status === 'CANCELLED';

  const [processedBy, setProcessedBy] = useState<number>(s.processedBy);
  const [dateValue, setDateValue] = useState<string>(() => toInputValue(s.disposalDate));
  const [reason, setReason] = useState<string>(s.reason ?? '');
  const [staff, setStaff] = useState<DisposalStaffOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchName, setSearchName] = useState('');

  // Danh sách nhân viên của kho phiếu cho ô "Người xuất hủy"
  useEffect(() => {
    let alive = true;
    disposalService
      .getStaffOptions(s.warehouseId)
      .then((list) => alive && setStaff(list))
      .catch(() => alive && setStaff([]));
    return () => {
      alive = false;
    };
  }, [s.warehouseId]);

  // Luôn có người đang ghi trên phiếu trong danh sách chọn (kể cả khi đã mất quyền kho)
  const staffOptions = useMemo(() => {
    if (staff.some((u) => u.userId === s.processedBy)) return staff;
    return [{ userId: s.processedBy, fullName: s.processedByName || `NV${s.processedBy}` }, ...staff];
  }, [staff, s.processedBy, s.processedByName]);

  const dirty =
    processedBy !== s.processedBy ||
    (reason.trim() || '') !== (s.reason ?? '') ||
    (isDraft && dateValue !== toInputValue(s.disposalDate));

  async function handleSave() {
    if (!dirty || saving) return;
    if (isDraft && dateValue && dateValue > nowInputValue()) {
      message.error('Ngày xuất hủy không được ở tương lai.');
      return;
    }
    setSaving(true);
    try {
      const updated = await disposalService.updateInfo(s.disposalId, {
        processedBy,
        // Phiếu đã hoàn thành không đổi ngày (đã ghi thẻ kho)
        disposalDate: isDraft && dateValue ? new Date(dateValue).toISOString() : null,
        reason: reason.trim() || null,
      });
      message.success(`Đã lưu phiếu ${updated.summary.disposalCode}`);
      onChanged(updated);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không lưu được phiếu xuất hủy');
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setSaving(true);
    try {
      let updated: DisposalDetail;
      try {
        updated = await disposalService.cancel(s.disposalId);
      } catch (err: unknown) {
        // Fallback sang endpoint DELETE nếu môi trường chưa cập nhật route /cancel
        if (err instanceof Error && (err.message.includes('404') || err.message.includes('Not Found'))) {
          updated = await disposalService.delete(s.disposalId);
        } else {
          throw err;
        }
      }
      message.success(`Đã hủy phiếu ${updated.summary.disposalCode}`);
      setConfirmCancel(false);
      onChanged(updated);
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Không hủy được phiếu xuất hủy');
    } finally {
      setSaving(false);
    }
  }

  const compactInputCls =
    'h-7 px-2 rounded-[6px] border border-slate-300 text-xs font-medium text-slate-800 bg-white focus:outline-none focus:border-[#0070f4]';

  // Lọc dòng hàng theo ô tìm mã / tên (giống chi tiết Chuyển hàng)
  const code = searchCode.trim().toLowerCase();
  const name = searchName.trim().toLowerCase();
  const items = detail.items.filter(
    (it) => (!code || it.productCode.toLowerCase().includes(code)) && (!name || it.productName.toLowerCase().includes(name))
  );

  return (
    <>
      {/* 1. Tiêu đề + thông tin chung */}
      <div className="mb-4">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="text-base font-bold font-mono">{s.disposalCode}</span>
          <DisposalStatusTag status={s.status} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 min-h-7 min-w-0" title={formatCreatorInfo(s)}>
            <span className="text-slate-400 shrink-0">Người tạo:</span>
            <span className="font-medium text-slate-800 truncate">{formatCreatorInfo(s)}</span>
          </div>
          <div className="flex items-center gap-1.5 min-h-7 min-w-0">
            <span className="text-slate-400 shrink-0">Người xuất hủy:</span>
            {isCancelled ? (
              <span className="font-medium text-slate-800 truncate">{s.processedByName || '—'}</span>
            ) : (
              <select
                value={processedBy}
                onChange={(e) => setProcessedBy(Number(e.target.value))}
                className={`${compactInputCls} flex-1 min-w-0 max-w-64 cursor-pointer`}
              >
                {staffOptions.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-1.5 min-h-7 min-w-0">
            <span className="text-slate-400 shrink-0">Ngày xuất hủy:</span>
            {isDraft ? (
              <input
                type="datetime-local"
                value={dateValue}
                max={nowInputValue()}
                onChange={(e) => setDateValue(e.target.value)}
                title="Ngày xuất hủy"
                className={`${compactInputCls} flex-1 min-w-0 max-w-56 cursor-pointer`}
              />
            ) : (
              <span className="font-medium text-slate-800">{formatDateTimeVN(s.disposalDate)}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 min-h-7 min-w-0">
            <span className="text-slate-400 shrink-0">Chi nhánh:</span>
            <span className="font-semibold text-slate-800 truncate">{s.warehouseName}</span>
          </div>
        </div>
      </div>

      {/* 2. Bảng hàng hủy (lọc theo mã / tên hàng) */}
      <div className="border border-slate-200 rounded-[8px] overflow-x-auto mb-3">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-[#f7f8f9] border-b border-slate-200 font-semibold text-[#677484]">
            <tr>
              <th className="py-2 px-3 w-10 text-center">STT</th>
              <th className="py-2 px-3 w-36">Mã hàng</th>
              <th className="py-2 px-3">Tên hàng</th>
              <th className="py-2 px-3 w-16 text-center">ĐVT</th>
              <th className="py-2 px-3 w-24 text-right">SL hủy</th>
              <th className="py-2 px-3 w-28 text-right">Giá vốn</th>
              <th className="py-2 px-3 w-32 text-right">Giá trị hủy</th>
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
              <th colSpan={4} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-slate-400">
                  Không có mặt hàng nào phù hợp
                </td>
              </tr>
            ) : (
              items.map((it, i) => (
                <tr key={it.disposalItemId} className="hover:bg-slate-50/70">
                  <td className="py-2 px-3 text-center text-slate-400">{i + 1}</td>
                  <td className="py-2 px-3 font-mono font-semibold">
                    <ProductCodeLink code={it.productCode} productId={it.productId} />
                  </td>
                  <td className="py-2 px-3 font-medium">
                    {it.productName}
                    {it.reason && <div className="text-[11px] italic font-normal text-[#677484]">({it.reason})</div>}
                  </td>
                  <td className="py-2 px-3 text-center text-slate-500">{it.unit}</td>
                  <td className="py-2 px-3 text-right">{qty(it.quantity)}</td>
                  <td className="py-2 px-3 text-right">{formatCost(it.unitCost)}</td>
                  <td className="py-2 px-3 text-right font-semibold">{money.format(it.value)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 3. Ghi chú / lý do xuất hủy (sửa được, bấm Lưu) + tổng */}
      <div className="flex flex-col md:flex-row items-start gap-6 mb-4">
        <div className="flex-1 w-full">
          <textarea
            value={reason}
            maxLength={500}
            disabled={isCancelled}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Ghi chú / Lý do xuất hủy"
            className="w-full p-2.5 text-xs border border-slate-300 rounded-[8px] bg-white resize-none focus:outline-none focus:border-[#0070f4] disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          />
          {isDraft && <p className="text-[11px] text-slate-400 mt-1">Phiếu tạm: giá trị tính theo giá vốn hiện tại, chưa trừ tồn kho.</p>}
          {isCancelled && (
            <p className="text-[11px] text-slate-400 mt-1">Phiếu đã hủy: tồn kho đã được hoàn lại (nếu phiếu từng hoàn thành).</p>
          )}
        </div>
        <div className="w-full md:w-72 shrink-0 space-y-1.5 text-xs bg-slate-50/60 p-3 rounded-[8px] border border-slate-200">
          <div className="flex justify-between text-slate-600">
            <span>Tổng số mặt hàng:</span>
            <span className="font-semibold text-slate-800">{s.itemCount}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Tổng SL hủy:</span>
            <span className="font-semibold text-slate-800">{qty(s.totalQuantity)}</span>
          </div>
          <div className="flex justify-between text-slate-700 border-t border-slate-200 pt-1.5 font-bold">
            <span>Tổng giá trị hủy:</span>
            <span>{money.format(s.totalValue)}</span>
          </div>
        </div>
      </div>

      {/* 4. Thanh nút (trái: Hủy, Sao chép, Xuất file; phải: Mở phiếu, Lưu, In) */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {!isCancelled && (
            <button
              type="button"
              disabled={saving}
              onClick={() => setConfirmCancel(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-[8px] border border-rose-200 bg-white cursor-pointer disabled:opacity-50"
            >
              <Trash2 size={13} />
              <span>Hủy</span>
            </button>
          )}
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#15171a] hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer"
            title="Tạo phiếu xuất hủy mới từ phiếu này"
          >
            <Copy size={13} />
            <span>Sao chép</span>
          </button>
          <button
            type="button"
            onClick={() => exportDisposalExcel(detail)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#15171a] hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer"
          >
            <FileDown size={13} />
            <span>Xuất file</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDraft && (
            <button
              type="button"
              onClick={onOpenDraft}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0070f4] hover:bg-[#005ac3] text-white rounded-[8px] font-semibold cursor-pointer"
              title="Sửa hàng hóa / Hoàn thành phiếu"
            >
              <ExternalLink size={13} />
              <span>Mở phiếu</span>
            </button>
          )}
          {!isCancelled && (
            <button
              type="button"
              disabled={!dirty || saving}
              onClick={() => void handleSave()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={dirty ? 'Lưu người xuất hủy / ngày xuất hủy / ghi chú' : 'Chưa có thay đổi'}
            >
              <Save size={13} />
              <span>{saving ? 'Đang lưu...' : 'Lưu'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => printDisposal(detail)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 hover:bg-[#f7f8f9] rounded-[8px] border border-slate-300 bg-white cursor-pointer"
          >
            <Printer size={13} />
            <span>In</span>
          </button>
        </div>
      </div>

      {confirmCancel && (
        <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-[8px] shadow-lg max-w-md w-full border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[15px] font-bold">Hủy phiếu xuất hủy</h3>
              <button type="button" onClick={() => setConfirmCancel(false)} className="text-[#677484] hover:text-[#15171a] cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-4 text-[13px] flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <span>
                {s.status === 'COMPLETED'
                  ? `Phiếu ${s.disposalCode} đã hoàn thành. Hủy phiếu sẽ hoàn lại ${qty(s.totalQuantity)} sản phẩm vào tồn kho ${s.warehouseName}. Bạn có chắc chắn muốn hủy?`
                  : `Bạn có chắc chắn muốn hủy phiếu tạm ${s.disposalCode}?`}
              </span>
            </div>
            <div className="px-5 py-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="px-4 h-8 text-xs rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] cursor-pointer"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleCancel()}
                className="px-4 h-8 text-xs rounded-[8px] bg-rose-600 hover:bg-rose-700 text-white font-semibold cursor-pointer disabled:opacity-60"
              >
                {saving ? 'Đang xử lý...' : 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
