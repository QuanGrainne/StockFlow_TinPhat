// src/features/roles/components/warehouse/screens/WarehouseTransferScreen.tsx
// Màn hình 3.2.5.6 & 3.2.5.7: Phiếu Điều chuyển Kho theo Giấy (List + Popup Modal)
// Đã loại bỏ vị trí ô kệ theo yêu cầu

import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Printer,
  Edit3,
  X,
  Repeat,
  ArrowRight,
  Truck,
} from 'lucide-react';

interface TransferProfile {
  id: string;
  code: string;
  paperCode: string;
  fromWarehouse: string;
  toWarehouse: string;
  driverInfo: string;
  statusText: string;
  items: TransferItem[];
}

interface TransferItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  paperQty: number;
  actualQty: number;
  notes?: string;
}

const INITIAL_TRANSFERS: TransferProfile[] = [
  {
    id: 'CK-01',
    code: 'CK-2026-001',
    paperCode: 'Phiếu điều chuyển kho số 14/CK-TP',
    fromWarehouse: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    toWarehouse: 'WH-HN-02 (Kho Đông Anh)',
    driverInfo: 'Nguyễn Văn Tiến (Xe tải 2.5 tấn) (29H-842.15)',
    statusText: 'Đang vận chuyển (Đã ký xuất)',
    items: [
      {
        id: 'TR-1',
        sku: 'TP-SP01',
        name: 'Tấm ốp Nano PVC vân đá 9mm',
        unit: 'Tấm',
        paperQty: 150,
        actualQty: 150,
        notes: 'Kiểm đếm đủ 15 bó',
      },
      {
        id: 'TR-2',
        sku: 'TP-SP04',
        name: 'Keo dán chuyên dụng T-Bond 300ml',
        unit: 'Chai',
        paperQty: 80,
        actualQty: 80,
        notes: '4 thùng x 20 chai niêm phong',
      },
    ],
  },
];

export const WarehouseTransferScreen: React.FC = () => {
  const [profiles, setProfiles] = useState<TransferProfile[]>(INITIAL_TRANSFERS);
  const [selectedId, setSelectedId] = useState<string>('CK-01');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit modal (Khớp 100% Ảnh 3)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TransferItem | null>(null);
  const [inputPaperCode, setInputPaperCode] = useState('Phiếu điều chuyển kho số 14/CK-TP');
  const [inputDate, setInputDate] = useState('2026-10-18');
  const [inputFromBin, setInputFromBin] = useState('Kệ A1-02');
  const [inputToBin, setInputToBin] = useState('Kệ C2-01 (Đông Anh)');
  const [inputActualQty, setInputActualQty] = useState<number>(150);
  const [inputNotes, setInputNotes] = useState<string>('');

  const currentProfile = profiles.find((p) => p.id === selectedId) || profiles[0];

  const totalPaperQty = currentProfile.items.reduce((s, i) => s + i.paperQty, 0);
  const totalActualQty = currentProfile.items.reduce((s, i) => s + i.actualQty, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenEdit = (item: TransferItem) => {
    setEditingItem(item);
    setInputPaperCode(currentProfile.paperCode || 'Phiếu điều chuyển kho số 14/CK-TP');
    setInputDate('2026-10-18');
    setInputFromBin('Kệ A1-02');
    setInputToBin('Kệ C2-01 (Đông Anh)');
    setInputActualQty(item.actualQty);
    setInputNotes(item.notes || '');
    setEditModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setProfiles((prev) =>
      prev.map((prof) => {
        if (prof.id !== currentProfile.id) return prof;
        return {
          ...prof,
          items: prof.items.map((it) =>
            it.id === editingItem.id
              ? {
                  ...it,
                  actualQty: Number(inputActualQty),
                  notes: inputNotes,
                }
              : it
          ),
        };
      })
    );

    showToast(`Đã lưu số lượng điều chuyển ${editingItem.sku}!`);
    setEditModalOpen(false);
  };

  const handleCompleteTransfer = () => {
    showToast(`Đã xác nhận hoàn tất điều chuyển phiếu ${currentProfile.code}!`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-teal-50 text-teal-700 font-bold text-[10px] uppercase tracking-wider mb-2 border border-teal-200">
            <span>ĐIỀU CHUYỂN KHO NỘI BỘ (DESKTOP)</span>
            <span>•</span>
            <span className="font-normal text-teal-600">Đặc tả 3.2.5.6 & 3.2.5.7 (List + Popup Modal)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Phiếu Điều chuyển Kho theo Giấy (List + Popup Modal)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bảng hàng hóa điều chuyển dạng Bảng chỉ đọc (Read-only Table). Nhấp vào dòng hoặc bấm nút Sửa để mở Popup cập nhật Số lượng thực chuyển.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCompleteTransfer}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <CheckCircle2 size={14} />
            <span>Xác nhận Hoàn tất Điều chuyển</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Printer size={14} className="text-slate-500" />
            <span>In Phiếu</span>
          </button>
        </div>
      </div>

      {/* 2. Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Lệnh điều chuyển */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              LỆNH ĐIỀU CHUYỂN ({profiles.length})
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Đối chiếu giấy</span>
          </div>

          <div className="space-y-2.5">
            {profiles.map((prof) => {
              const isSelected = prof.id === selectedId;
              return (
                <div
                  key={prof.id}
                  onClick={() => setSelectedId(prof.id)}
                  className={`p-3.5 rounded-lg border transition cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'border-teal-400 bg-teal-50/40 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-700 px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                      {prof.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                      {prof.statusText}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {prof.paperCode}
                  </h3>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    {prof.fromWarehouse} → {prof.toWarehouse}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Document Header & Read-only Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Header Info Banner */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-teal-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  LỆNH ĐIỀU CHUYỂN GIẤY: {currentProfile.paperCode}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-teal-700 px-2.5 py-0.5 rounded bg-teal-50 border border-teal-200">
                {currentProfile.code}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">MÃ CHỨNG TỪ GIẤY:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.paperCode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">KHO XUẤT ĐI:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.fromWarehouse}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">KHO NHẬN ĐẾN:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.toWarehouse}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">LÁI XE & BIỂN SỐ:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.driverInfo}
                </span>
              </div>
            </div>
          </div>

          {/* Table: Chi tiết hàng hóa điều chuyển */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-600"></div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  CHI TIẾT HÀNG HÓA ĐIỀU CHUYỂN (BẢNG CHỈ ĐỌC - NHẤP DÒNG ĐỂ SỬA)
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {currentProfile.items.length} mặt hàng
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-3 text-center">STT</th>
                    <th className="py-3 px-3">MÃ SKU</th>
                    <th className="py-3 px-4">TÊN HÀNG HÓA & QUY CÁCH</th>
                    <th className="py-3 px-3">ĐVT</th>
                    <th className="py-3 px-3 text-right">SL CHỨNG TỪ</th>
                    <th className="py-3 px-3 text-right">SL THỰC CHUYỂN</th>
                    <th className="py-3 px-3 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentProfile.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      onDoubleClick={() => handleOpenEdit(item)}
                      className="hover:bg-teal-50/30 transition cursor-pointer group"
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-teal-700">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {item.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {item.paperQty.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-teal-700">
                        {item.actualQty.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(item);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 text-xs font-semibold transition cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>Sửa</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>* Nhấp đúp vào dòng hoặc bấm nút Sửa để mở Popup cập nhật số lượng điều chuyển</span>
              <span className="font-semibold text-slate-700">
                Tổng chuyển: {totalActualQty} / {totalPaperQty} SP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Cập nhật Hàng Điều Chuyển (Popup Form - Khớp 100% Ảnh 3) */}
      {editModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shrink-0">
                <Edit3 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cập nhật Hàng Điều Chuyển (Popup Form)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  SKU: <strong className="font-mono text-teal-700">{editingItem.sku}</strong> • Lệnh:{' '}
                  <strong className="font-mono text-slate-700">{currentProfile.code}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Product Info Box */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 text-xs space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  TÊN HÀNG ĐIỀU CHUYỂN:
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {editingItem.name}
                </div>
                <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                  <span>SL Theo chứng từ gốc:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {editingItem.paperQty} {editingItem.unit}
                  </span>
                </div>
              </div>

              {/* Field: Mã chứng từ giấy điều chuyển */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã chứng từ giấy điều chuyển <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                    #
                  </span>
                  <input
                    type="text"
                    required
                    value={inputPaperCode}
                    onChange={(e) => setInputPaperCode(e.target.value)}
                    className="w-full h-9 pl-7 pr-3 rounded-lg border border-teal-400 bg-white font-mono font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Row 2 cols: Ngày trên lệnh & Số lượng thực chuyển */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày trên lệnh
                  </label>
                  <input
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng thực chuyển ({editingItem.unit}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={inputActualQty}
                    onChange={(e) => setInputActualQty(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-teal-400 bg-white font-mono font-bold text-teal-700 text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Row 2 cols: Kệ xuất đi & Kệ nhận đến */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kệ xuất đi
                  </label>
                  <input
                    type="text"
                    value={inputFromBin}
                    onChange={(e) => setInputFromBin(e.target.value)}
                    placeholder="Kệ A1-02"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kệ nhận đến
                  </label>
                  <input
                    type="text"
                    value={inputToBin}
                    onChange={(e) => setInputToBin(e.target.value)}
                    placeholder="Kệ C2-01 (Đông Anh)"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white cursor-pointer shadow-xs"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
