// src/features/production/screens/ProductionReferenceLogsScreen.tsx
// Màn hình 3.2.3.3: Sổ Nhật ký Phiếu tham chiếu (Reference Slip Logs)

import React, { useState } from 'react';
import {
  FileText,
  Search,
  Download,
  AlertTriangle,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Plus,
  User,
  Calendar,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { EditReferenceSlipModal } from '../components/EditReferenceSlipModal';

interface ReferenceSlip {
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

const INITIAL_SLIPS: ReferenceSlip[] = [
  {
    id: 'ptc-1',
    slipCode: 'PTC-0910',
    orderCode: 'LSX-2026-001',
    poCode: 'PO-2026-001',
    reportDate: '2026-10-18',
    shift: 'Ca 1 (06:00 - 14:00)',
    goodQty: 850,
    scrapQty: 12,
    signerName: 'Trịnh Văn Quý (Tổ trưởng)',
    note: 'Biên bản nghiệm thu giấy giao nhận lúc 14:15. Đã đối chiếu phiếu gốc PTC-0910.',
  },
  {
    id: 'ptc-2',
    slipCode: 'PTC-0908',
    orderCode: 'LSX-2026-001',
    poCode: 'PO-2026-001',
    reportDate: '2026-10-17',
    shift: 'Ca 2 (14:00 - 22:00)',
    goodQty: 1350,
    scrapQty: 25,
    signerName: 'Nguyễn Văn Đạt (KCS xưởng)',
    note: 'KCS đã ký biên bản bàn giao thành phẩm ...',
  },
  {
    id: 'ptc-3',
    slipCode: 'PTC-0905',
    orderCode: 'LSX-2026-001',
    poCode: 'PO-2026-001',
    reportDate: '2026-10-16',
    shift: 'Ca 1 (06:00 - 14:00)',
    goodQty: 50,
    scrapQty: 8,
    signerName: 'Trịnh Văn Quý (Tổ trưởng)',
    note: 'Phiếu giao nhận đợt đầu',
    hasWarning: true,
    warningNote:
      'Cảnh báo: Nhân viên nhập nhầm 500 thành 50 theo phiếu giấy PTC-0905 (Cần sửa lại số liệu)',
  },
  {
    id: 'ptc-4',
    slipCode: 'PTC-0899',
    orderCode: 'LSX-2026-002',
    poCode: 'PO-2026-002',
    reportDate: '2026-10-18',
    shift: 'Ca 1 (06:00 - 14:00)',
    goodQty: 320,
    scrapQty: 5,
    signerName: 'Trần Văn T (Tổ phó)',
    note: 'Phiếu báo cáo bàn giao ca ngày 18/10, đã...',
  },
  {
    id: 'ptc-5',
    slipCode: 'PTC-0870',
    orderCode: 'LSX-2026-003',
    poCode: 'PO-2026-003',
    reportDate: '2026-10-17',
    shift: 'Ca 2 (14:00 - 22:00)',
    goodQty: 600,
    scrapQty: 24,
    signerName: 'Lê Văn Nam',
    note: 'Báo cáo giấy có chữ ký duyệt của Trưởng...',
  },
];

interface ProductionReferenceLogsScreenProps {
  onOpenNewReportModal?: () => void;
}

export const ProductionReferenceLogsScreen: React.FC<ProductionReferenceLogsScreenProps> = ({
  onOpenNewReportModal,
}) => {
  const [slips, setSlips] = useState<ReferenceSlip[]>(INITIAL_SLIPS);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShift, setSelectedShift] = useState('ALL');
  const [editingSlip, setEditingSlip] = useState<ReferenceSlip | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form states when editing
  const [editGoodQty, setEditGoodQty] = useState<number>(0);
  const [editScrapQty, setEditScrapQty] = useState<number>(0);
  const [editNote, setEditNote] = useState<string>('');
  const [editSigner, setEditSigner] = useState<string>('');

  const handleStartEdit = (slip: ReferenceSlip) => {
    setEditingSlip(slip);
    setEditGoodQty(slip.goodQty);
    setEditScrapQty(slip.scrapQty);
    setEditNote(slip.note);
    setEditSigner(slip.signerName);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlip) return;

    setSlips((prev) =>
      prev.map((item) => {
        if (item.id === editingSlip.id) {
          // If editing the warning slip to 500, clear warning
          const resolved = item.slipCode === 'PTC-0905' && editGoodQty >= 500;
          return {
            ...item,
            goodQty: editGoodQty,
            scrapQty: editScrapQty,
            note: editNote,
            signerName: editSigner,
            hasWarning: resolved ? false : item.hasWarning,
          };
        }
        return item;
      })
    );

    setSuccessToast(`Đã cập nhật số liệu phiếu ${editingSlip.slipCode} thành công!`);
    setEditingSlip(null);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleDelete = (id: string, slipCode: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phiếu ${slipCode} khỏi hệ thống không?`)) {
      setSlips((prev) => prev.filter((s) => s.id !== id));
      setSuccessToast(`Đã xóa phiếu ${slipCode}`);
      setTimeout(() => setSuccessToast(null), 2500);
    }
  };

  const handleExportExcel = () => {
    setSuccessToast('Đang trích xuất Sổ Nhật ký Phiếu tham chiếu (Excel)...');
    setTimeout(() => setSuccessToast(null), 2500);
  };

  // Compute metrics
  const totalSlips = slips.length;
  const totalGoodQty = slips.reduce((acc, curr) => acc + (Number(curr.goodQty) || 0), 0);
  const totalScrapQty = slips.reduce((acc, curr) => acc + (Number(curr.scrapQty) || 0), 0);

  // Filter list
  const filteredSlips = slips.filter((slip) => {
    const matchesSearch =
      slip.slipCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.poCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slip.signerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesShift =
      selectedShift === 'ALL' ||
      slip.shift.toLowerCase().includes(selectedShift.toLowerCase());

    return matchesSearch && matchesShift;
  });

  return (
    <div className="p-6 bg-transparent min-h-full text-slate-800 space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={20} />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Screen Sub-Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 uppercase tracking-wider border border-blue-200">
              SỔ NHẬT KÝ BÁO CÁO GIẤY • Đặc tả 3.2.3.3
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Sổ Nhật ký Phiếu tham chiếu (Reference Slip Logs)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Toàn bộ các phiếu báo cáo giấy cứng từ phân xưởng gửi lên đã được nhân viên văn phòng nhập vào hệ thống. Tìm kiếm theo Mã phiếu tham chiếu (PTC), mã đơn PO hoặc sửa lại khi có sai sót gõ nhầm.
          </p>
        </div>

        {/* Action Button Top Right */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
          >
            <Download size={14} className="text-slate-500" />
            <span>Xuất sổ báo cáo Excel</span>
          </button>
        </div>
      </div>

      {/* 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Tổng số phiếu */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TỔNG SỐ PHIẾU THAM CHIẾU
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {totalSlips}
            </span>
            <span className="text-xs font-medium text-slate-500">phiếu đã nhập</span>
          </div>
        </div>

        {/* Card 2: Tổng sản lượng thành phẩm */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TỔNG SẢN LƯỢNG THÀNH PHẨM
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 font-mono">
              +{totalGoodQty.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs font-medium text-emerald-700">ĐVT</span>
          </div>
        </div>

        {/* Card 3: Phế phẩm ghi nhận */}
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            PHẾ PHẨM GHI NHẬN
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 font-mono">
              +{totalScrapQty.toLocaleString('vi-VN')}
            </span>
            <span className="text-xs font-medium text-amber-700">ĐVT</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm mã phiếu (PTC-0910), đơn PO, mã LSX..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="relative">
            <select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
              className="appearance-none h-9 pl-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 focus:outline-none focus:border-blue-500 transition cursor-pointer"
            >
              <option value="ALL">Tất cả các ca</option>
              <option value="Ca 1">Ca 1 (06:00 - 14:00)</option>
              <option value="Ca 2">Ca 2 (14:00 - 22:00)</option>
              <option value="Ca 3">Ca 3 (22:00 - 06:00)</option>
            </select>
            <ChevronDown
              size={13}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
      </div>

      {/* Reference Slips Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">MÃ PHIẾU THAM CHIẾU</th>
                <th className="py-3 px-3">MÃ LỆNH SX</th>
                <th className="py-3 px-3">MÃ ĐƠN PO</th>
                <th className="py-3 px-4">NGÀY & CA</th>
                <th className="py-3 px-3 text-center">SL ĐẠT CHUẨN</th>
                <th className="py-3 px-3 text-center">SL PHẾ PHẨM</th>
                <th className="py-3 px-4">NGƯỜI KÝ TẠI XƯỞNG</th>
                <th className="py-3 px-4">GHI CHÚ ĐỐI CHIẾU GIẤY</th>
                <th className="py-3 px-3 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSlips.map((slip) => {
                return (
                  <tr
                    key={slip.id}
                    className={`transition ${
                      slip.hasWarning ? 'bg-amber-50/30' : 'hover:bg-blue-50/20'
                    }`}
                  >
                    {/* Mã phiếu tham chiếu */}
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                        # {slip.slipCode}
                      </span>
                    </td>

                    {/* Mã Lệnh SX */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {slip.orderCode}
                    </td>

                    {/* Mã Đơn PO */}
                    <td className="py-3 px-3 font-mono text-slate-600">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 text-[11px]">
                        {slip.poCode}
                      </span>
                    </td>

                    {/* Ngày & Ca */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">{slip.reportDate}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{slip.shift}</div>
                    </td>

                    {/* SL đạt chuẩn */}
                    <td className="py-3 px-3 text-center font-mono">
                      {slip.hasWarning ? (
                        <span className="font-bold text-amber-600 underline decoration-amber-500 decoration-2">
                          +{slip.goodQty.toLocaleString('vi-VN')}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-600">
                          +{slip.goodQty.toLocaleString('vi-VN')}
                        </span>
                      )}
                    </td>

                    {/* SL phế phẩm */}
                    <td className="py-3 px-3 text-center font-mono font-medium text-amber-700">
                      +{slip.scrapQty.toLocaleString('vi-VN')}
                    </td>

                    {/* Người ký tại xưởng */}
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {slip.signerName}
                    </td>

                    {/* Ghi chú đối chiếu giấy */}
                    <td className="py-3 px-4 max-w-sm">
                      {slip.hasWarning ? (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200/90 text-amber-800 text-[11px] flex items-start gap-1.5 font-medium leading-relaxed">
                          <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                          <span>{slip.warningNote}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] line-clamp-2">
                          {slip.note}
                        </span>
                      )}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(slip)}
                          title="Sửa phiếu"
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(slip.id, slip.slipCode)}
                          title="Xóa phiếu"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Sửa Báo cáo & Phiếu tham chiếu khớp 100% Ảnh 3 */}
      <EditReferenceSlipModal
        isOpen={!!editingSlip}
        onClose={() => setEditingSlip(null)}
        slip={editingSlip}
        onSave={(updated) => {
          setSlips((prev) =>
            prev.map((s) => (s.id === updated.id ? updated : s))
          );
          setSuccessToast(`Đã cập nhật số liệu phiếu #${updated.slipCode} thành công!`);
          setEditingSlip(null);
          setTimeout(() => setSuccessToast(null), 3000);
        }}
      />
    </div>
  );
};

