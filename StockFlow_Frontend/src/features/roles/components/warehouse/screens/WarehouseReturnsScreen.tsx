// src/features/roles/components/warehouse/screens/WarehouseReturnsScreen.tsx
// Màn hình 3.2.5.11: Nhập Biên bản Tiếp nhận Hàng Trả lại (BBTH từ Đại lý / Khách hàng)
// Đã loại bỏ vị trí ô kệ theo yêu cầu

import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Printer,
  Edit3,
  X,
  RotateCcw,
  Check,
  Calendar,
  Save,
} from 'lucide-react';

interface ReturnProfile {
  id: string;
  code: string;
  paperCode: string;
  customerName: string;
  invoiceOrigin: string;
  customerReason: string;
  totalQty: number;
  statusBadge: string;
  items: ReturnItem[];
}

interface ReturnItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  requestQty: number;
  restockQty: number;
  scrapQty: number;
  inspectionNotes: string;
}

const INITIAL_RETURNS: ReturnProfile[] = [
  {
    id: 'YCTH-01',
    code: 'YCTH-2026-001',
    paperCode: 'Biên bản nhận hàng trả lại số 05/BBTH',
    customerName: 'Công ty Cổ phần Xây Dựng Nam Hà',
    invoiceOrigin: 'PXK-2026-095',
    customerReason: 'Khách hàng thừa quy cách thi công công trình, xin trả lại hàng nguyên đai nguyên kiện.',
    totalQty: 20,
    statusBadge: 'Đã nhập kho 18 tấm, từ chối 2 tấm dơ',
    items: [
      {
        id: 'RI-1',
        sku: 'TP-SP01',
        name: 'Tấm ốp Nano PVC vân đá 9mm',
        unit: 'Tấm',
        requestQty: 20,
        restockQty: 18,
        scrapQty: 2,
        inspectionNotes: '18 tấm còn nguyên màng bọc PE, 2 tấm trầy mặt không tái nhập',
      },
    ],
  },
];

export const WarehouseReturnsScreen: React.FC = () => {
  const [profiles, setProfiles] = useState<ReturnProfile[]>(INITIAL_RETURNS);
  const [selectedId, setSelectedId] = useState<string>('YCTH-01');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit item modal (Khớp 100% Ảnh 5)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReturnItem | null>(null);
  const [inputPaperCode, setInputPaperCode] = useState('Biên bản nhận hàng trả lại số 05/BBTH');
  const [inputDate, setInputDate] = useState('2026-10-18');
  const [inputBinLocation, setInputBinLocation] = useState('Kệ A1-02');
  const [inputRestockQty, setInputRestockQty] = useState<number>(18);
  const [inputScrapQty, setInputScrapQty] = useState<number>(2);
  const [inputInspectionNotes, setInputInspectionNotes] = useState<string>('18 tấm còn nguyên màng bọc PE, 2 tấm trầy mặt không tái nhập');

  const currentProfile = profiles.find((p) => p.id === selectedId) || profiles[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenEdit = (item: ReturnItem) => {
    setEditingItem(item);
    setInputPaperCode(currentProfile.paperCode || 'Biên bản nhận hàng trả lại số 05/BBTH');
    setInputDate('2026-10-18');
    setInputBinLocation('Kệ A1-02');
    setInputRestockQty(item.restockQty);
    setInputScrapQty(item.scrapQty);
    setInputInspectionNotes(item.inspectionNotes || '18 tấm còn nguyên màng bọc PE, 2 tấm trầy mặt không tái nhập');
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
          statusBadge: `Đã nhập kho ${inputRestockQty} ${editingItem.unit}, từ chối ${inputScrapQty} ${editingItem.unit}`,
          items: prof.items.map((it) =>
            it.id === editingItem.id
              ? {
                  ...it,
                  restockQty: Number(inputRestockQty),
                  scrapQty: Number(inputScrapQty),
                  inspectionNotes: inputInspectionNotes,
                }
              : it
          ),
        };
      })
    );

    showToast(
      `[BR-16] Đã lưu cập nhật tiếp nhận hàng trả: "${currentProfile.paperCode}"`
    );
    setEditModalOpen(false);
  };

  const handleCompleteReturn = () => {
    showToast(`Đã duyệt hoàn tất nhập kho trả hàng phiếu ${currentProfile.code}!`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-8 z-50 bg-white border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Header & Actions */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold text-[10px] uppercase tracking-wider mb-2 border border-rose-200">
            <span>NHẬP HÀNG HOÀN TRẢ & ĐỔI HÀNG</span>
            <span>•</span>
            <span className="font-normal text-rose-600">Đặc tả 3.2.5.11 (List + Popup Modal)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Nhập Biên bản Tiếp nhận Hàng Trả lại (BBTH từ Đại lý / Khách hàng)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Bảng danh sách hàng hoàn trả dạng Bảng chỉ đọc (Read-only Table). Bấm nút Sửa hoặc nhấp dòng để mở Popup nhập Số lượng tái nhập và Mã chứng từ giấy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCompleteReturn}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Check size={14} />
            <span>Duyệt Hoàn Tất Trả Hàng</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Printer size={14} className="text-slate-500" />
            <span>In Biên bản</span>
          </button>
        </div>
      </div>

      {/* 2. Main Split View: Left Profiles & Right Detail Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Hồ sơ hàng trả */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              HỒ SƠ HÀNG TRẢ ({profiles.length})
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
                  className={`p-3.5 rounded-lg border transition cursor-pointer space-y-2 ${
                    isSelected
                      ? 'border-rose-400 bg-white ring-1 ring-rose-400 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {prof.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                      {prof.statusBadge}
                    </span>
                  </div>

                  <div className="flex items-start gap-1.5 text-xs font-bold text-slate-900 leading-snug">
                    <FileText size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span>{prof.paperCode}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 truncate">
                    {prof.customerName}
                  </p>

                  <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100">
                    <span>Gốc : {prof.invoiceOrigin}</span>
                    <span className="font-mono font-bold text-slate-700">{prof.totalQty} SP</span>
                  </div>
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
                <FileText size={16} className="text-rose-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  BIÊN BẢN GIẤY TRẢ HÀNG: {currentProfile.paperCode}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-slate-700 px-2.5 py-0.5 rounded bg-slate-100">
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
                <span className="text-slate-400 block text-[11px]">KHÁCH HÀNG:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.customerName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">HÓA ĐƠN XUẤT GỐC:</span>
                <span className="font-mono font-bold text-blue-700 block">
                  {currentProfile.invoiceOrigin}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">LÝ DO KHÁCH GHI:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.customerReason}
                </span>
              </div>
            </div>
          </div>

          {/* Table: Chi tiết hàng trả lại (Bảng chỉ đọc - nhấp dòng để sửa) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-600"></div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  CHI TIẾT HÀNG TRẢ LẠI (BẢNG CHỈ ĐỌC - NHẤP DÒNG ĐỂ SỬA)
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {currentProfile.items.length} sản phẩm trả
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">MÃ SP & TÊN HÀNG</th>
                    <th className="py-3 px-3 text-center">ĐVT</th>
                    <th className="py-3 px-3 text-center">SL ĐỀ NGHỊ</th>
                    <th className="py-3 px-3 text-center">SL TÁI NHẬP</th>
                    <th className="py-3 px-3 text-center">SL HỦY/HỎNG</th>
                    <th className="py-3 px-5">GHI CHÚ KIỂM ĐỊNH</th>
                    <th className="py-3 px-3 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentProfile.items.map((item) => (
                    <tr
                      key={item.id}
                      onDoubleClick={() => handleOpenEdit(item)}
                      className="hover:bg-rose-50/30 transition cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-blue-700">{item.sku}</div>
                        <div className="font-semibold text-slate-800 mt-0.5">{item.name}</div>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-600">
                        {item.unit}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {item.requestQty}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-600 text-sm">
                        {item.restockQty}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-rose-600 text-sm">
                        {item.scrapQty}
                      </td>
                      <td className="py-3 px-5 text-slate-600 text-[11px] leading-relaxed">
                        {item.inspectionNotes}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(item);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold transition cursor-pointer"
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
              <span>* Nhấp vào dòng hoặc bấm nút Sửa để mở Popup cập nhật số lượng nhập trả</span>
              <span className="font-semibold text-slate-700">
                Biên bản: {currentProfile.paperCode}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Sửa số lượng tiếp nhận hàng trả (Khớp 100% Ảnh 5) */}
      {editModalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl border border-rose-200 bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                <Edit3 size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  Cập nhật Tiếp nhận Hàng Trả (Popup Form)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  SKU: <span className="font-bold text-blue-600">{editingItem.sku}</span> • Đơn gốc:{' '}
                  <span className="font-semibold text-slate-700">
                    {currentProfile.invoiceOrigin || 'PXK-2026-095'}
                  </span>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Product Info Box */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                  MẶT HÀNG TRẢ LẠI:
                </div>
                <div className="text-sm font-bold text-slate-900">{editingItem.name}</div>
                <div className="border-t border-slate-100 my-2.5"></div>
                <div className="text-xs text-slate-600">
                  SL Khách đề nghị trả:{' '}
                  <span className="font-mono font-bold text-slate-900">
                    {editingItem.requestQty} {editingItem.unit}
                  </span>
                </div>
              </div>

              {/* Mã biên bản trả hàng giấy */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Mã biên bản trả hàng giấy (Paper Ref Code) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    #
                  </span>
                  <input
                    type="text"
                    required
                    value={inputPaperCode}
                    onChange={(e) => setInputPaperCode(e.target.value)}
                    className="w-full h-10 pl-8 pr-3 rounded-xl border border-rose-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-rose-500 shadow-xs"
                    placeholder="Biên bản nhận hàng trả lại số 05/BBTH"
                  />
                </div>
              </div>

              {/* 2 Cột: Ngày & Kệ */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày trên biên bản
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={inputDate}
                      onChange={(e) => setInputDate(e.target.value)}
                      className="w-full h-10 px-3 pr-9 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:border-rose-500"
                      placeholder="18/10/2026"
                    />
                    <Calendar
                      size={15}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kệ tái nhập kho
                  </label>
                  <input
                    type="text"
                    value={inputBinLocation}
                    onChange={(e) => setInputBinLocation(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-rose-500"
                    placeholder="Kệ A1-02"
                  />
                </div>
              </div>

              {/* 2 Cột: SL tái nhập đạt chuẩn & SL loại bỏ */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SL tái nhập đạt chuẩn ({editingItem.unit}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={editingItem.requestQty}
                    required
                    value={inputRestockQty}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setInputRestockQty(val);
                      setInputScrapQty(Math.max(0, editingItem.requestQty - val));
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-emerald-400 text-xs font-mono font-bold text-emerald-700 focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    SL loại bỏ / phế phẩm ({editingItem.unit})
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={editingItem.requestQty}
                    value={inputScrapQty}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setInputScrapQty(val);
                      setInputRestockQty(Math.max(0, editingItem.requestQty - val));
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-rose-300 text-xs font-mono font-bold text-rose-600 focus:outline-none focus:border-rose-500 shadow-xs"
                  />
                </div>
              </div>

              {/* Ghi chú kiểm định chất lượng */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Ghi chú kiểm định chất lượng
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={inputInspectionNotes}
                    onChange={(e) => setInputInspectionNotes(e.target.value)}
                    placeholder="18 tấm còn nguyên màng bọc PE, 2 tấm trầy mặt không tái nhập"
                    className="w-full p-2.5 pr-8 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-rose-500 resize-none"
                  />
                  <Edit3
                    size={14}
                    className="absolute right-2.5 bottom-2.5 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-[#BE123C] hover:bg-[#9F1239] text-xs font-bold text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
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
