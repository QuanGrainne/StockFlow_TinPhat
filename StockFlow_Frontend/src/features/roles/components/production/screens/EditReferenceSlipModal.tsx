// src/features/roles/components/production/screens/EditReferenceSlipModal.tsx
// Modal Sửa Báo cáo & Phiếu tham chiếu khớp 100% Ảnh 3

import React, { useState, useEffect } from 'react';
import { FileText, X, User, Edit3, Calendar } from 'lucide-react';

export interface ReferenceSlipData {
  id: string;
  slipCode: string;
  orderCode: string;
  poCode: string;
  reportDate: string;
  shift: string;
  goodQty: number;
  scrapQty: number;
  signerName: string;
  note: string;
  hasWarning?: boolean;
  warningNote?: string;
}

interface EditReferenceSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  slip: ReferenceSlipData | null;
  onSave: (updatedSlip: ReferenceSlipData) => void;
}

export const EditReferenceSlipModal: React.FC<EditReferenceSlipModalProps> = ({
  isOpen,
  onClose,
  slip,
  onSave,
}) => {
  const [slipCode, setSlipCode] = useState('');
  const [reportDate, setReportDate] = useState('2026-10-18');
  const [shift, setShift] = useState('Ca 1 (06:00 - 14:00)');
  const [goodQty, setGoodQty] = useState<number>(850);
  const [scrapQty, setScrapQty] = useState<number>(12);
  const [signerName, setSignerName] = useState('Trịnh Văn Quý (Tổ trưởng)');
  const [note, setNote] = useState(
    'Biên bản nghiệm thu giấy giao nhận lúc 14:15. Đã đối chiếu phiếu gốc PTC-0910.'
  );

  useEffect(() => {
    if (slip) {
      setSlipCode(slip.slipCode || 'PTC-0910');
      setReportDate(slip.reportDate || '2026-10-18');
      setShift(slip.shift || 'Ca 1 (06:00 - 14:00)');
      setGoodQty(slip.goodQty ?? 850);
      setScrapQty(slip.scrapQty ?? 12);
      setSignerName(slip.signerName || 'Trịnh Văn Quý (Tổ trưởng)');
      setNote(
        slip.note ||
          'Biên bản nghiệm thu giấy giao nhận lúc 14:15. Đã đối chiếu phiếu gốc PTC-0910.'
      );
    }
  }, [slip]);

  if (!isOpen || !slip) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isWarningResolved = slip.hasWarning && goodQty >= 500;
    onSave({
      ...slip,
      slipCode,
      reportDate,
      shift,
      goodQty: Number(goodQty),
      scrapQty: Number(scrapQty),
      signerName,
      note,
      hasWarning: isWarningResolved ? false : slip.hasWarning,
      warningNote: isWarningResolved ? undefined : slip.warningNote,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E56A0] flex items-center justify-center border border-blue-100 shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Sửa Báo cáo & Phiếu tham chiếu
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Lệnh: <strong className="font-mono text-slate-800">{slip.orderCode || 'LSX-2026-001'}</strong> • Đơn:{' '}
                <strong className="font-mono text-slate-800">{slip.poCode || 'PO-2026-001'}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Field: Mã phiếu tham chiếu */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã phiếu tham chiếu (Reference Slip Code) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                #
              </span>
              <input
                type="text"
                required
                value={slipCode}
                onChange={(e) => setSlipCode(e.target.value)}
                className="w-full h-9 pl-7 pr-3 rounded-lg border border-slate-300 font-mono font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Số hiệu in trên chứng từ giấy xưởng gửi lên để đối chiếu
            </p>
          </div>

          {/* Row: Ngày báo cáo & Ca sản xuất */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày báo cáo trên phiếu
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ca sản xuất
              </label>
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="Ca 1 (06:00 - 14:00)">Ca 1 (06:00 - 14:00)</option>
                <option value="Ca 2 (14:00 - 22:00)">Ca 2 (14:00 - 22:00)</option>
                <option value="Ca 3 (22:00 - 06:00)">Ca 3 (22:00 - 06:00)</option>
              </select>
            </div>
          </div>

          {/* Row: Số lượng thành phẩm đạt & Số lượng phế phẩm */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số lượng thành phẩm đạt <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={0}
                required
                value={goodQty}
                onChange={(e) => setGoodQty(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số lượng phế phẩm / hủy
              </label>
              <input
                type="number"
                min={0}
                value={scrapQty}
                onChange={(e) => setScrapQty(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono font-medium text-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Field: Người ký xác nhận tại xưởng */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Người ký xác nhận tại xưởng
            </label>
            <div className="relative">
              <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Trịnh Văn Quý (Tổ trưởng)"
                className="w-full h-9 pl-8.5 pr-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* Field: Ghi chú đối chiếu / Lý do đính chính */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú đối chiếu / Lý do đính chính
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full p-2.5 pr-8 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-white leading-relaxed"
              />
              <Edit3
                size={14}
                className="absolute right-2.5 bottom-3 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Cập nhật số liệu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
