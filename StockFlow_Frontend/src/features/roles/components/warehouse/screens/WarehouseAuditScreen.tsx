// src/features/roles/components/warehouse/screens/WarehouseAuditScreen.tsx
// Màn hình 3.2.5.9 & 3.2.5.10: Nhập Biên bản Kiểm kê Giấy (List + Popup Modal)
// Đã loại bỏ vị trí ô kệ theo yêu cầu

import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Printer,
  Edit3,
  X,
  Send,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface AuditProfile {
  id: string;
  code: string;
  paperCode: string;
  auditName: string;
  auditDate: string;
  auditZone: string;
  leadAuditor: string;
  warehouseCode: string;
  statusText: string;
  items: AuditItem[];
}

interface AuditItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  bookQty: number;
  actualQty: number;
  explanation: string;
}

const INITIAL_AUDITS: AuditProfile[] = [
  {
    id: 'KK-01',
    code: 'KK-2026-001',
    paperCode: 'Biên bản kiểm kê số 08/BBKK-ĐA',
    auditName: 'Kiểm kê định kỳ giữa tháng 10/2026 - Khu A Tấm Ốp',
    auditDate: '2026-10-17',
    auditZone: 'ZONE_A (Khu A - Tấm ốp PVC)',
    leadAuditor: 'Lê Văn Nam (Tổ trưởng kiểm đếm tại kho)',
    warehouseCode: 'WH-HN-01',
    statusText: 'Đang nhập số liệu kiểm kê từ phiếu giấy',
    items: [
      {
        id: 'AUD-1',
        sku: 'TP-SP01',
        name: 'Tấm ốp Nano PVC vân đá 9mm',
        unit: 'Tấm',
        bookQty: 850,
        actualQty: 848,
        explanation: '2 tấm hỏng góc lúc vận chuyển, đề nghị thanh lý',
      },
      {
        id: 'AUD-2',
        sku: 'TP-SP01',
        name: 'Tấm ốp Nano PVC vân đá 9mm (Dự phòng)',
        unit: 'Tấm',
        bookQty: 520,
        actualQty: 520,
        explanation: 'Khớp 100% với số lượng thực đếm',
      },
      {
        id: 'AUD-3',
        sku: 'TP-SP02',
        name: 'Phào chỉ cổ trần PU dát vàng 8cm',
        unit: 'Cây 2.4m',
        bookQty: 280,
        actualQty: 280,
        explanation: 'Khớp 100%',
      },
      {
        id: 'AUD-4',
        sku: 'TP-SP04',
        name: 'Keo dán chuyên dụng T-Bond 300ml',
        unit: 'Chai',
        bookQty: 390,
        actualQty: 395,
        explanation: 'Thừa 5 chai chưa ghi nhận nhập từ phiếu giao',
      },
    ],
  },
];

export const WarehouseAuditScreen: React.FC = () => {
  const [profiles, setProfiles] = useState<AuditProfile[]>(INITIAL_AUDITS);
  const [selectedId, setSelectedId] = useState<string>('KK-01');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit item modal (Khớp 100% Ảnh 4)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AuditItem | null>(null);
  const [inputPaperCode, setInputPaperCode] = useState('Biên bản kiểm kê số 08/BBKK-ĐA');
  const [inputDate, setInputDate] = useState('2026-10-17');
  const [inputBinLocation, setInputBinLocation] = useState('Kệ A1-01');
  const [inputActualQty, setInputActualQty] = useState<number>(848);
  const [inputExplanation, setInputExplanation] = useState<string>('2 tấm hỏng góc lúc vận chuyển, đề nghị xuất huỷ');

  const currentProfile = profiles.find((p) => p.id === selectedId) || profiles[0];

  const totalBookQty = currentProfile.items.reduce((s, i) => s + i.bookQty, 0);
  const totalActualQty = currentProfile.items.reduce((s, i) => s + i.actualQty, 0);
  const diffSkus = currentProfile.items.filter((i) => i.actualQty !== i.bookQty).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenEdit = (item: AuditItem) => {
    setEditingItem(item);
    setInputPaperCode(currentProfile.paperCode || 'Biên bản kiểm kê số 08/BBKK-ĐA');
    setInputDate('2026-10-17');
    setInputBinLocation('Kệ A1-01');
    setInputActualQty(item.actualQty);
    setInputExplanation(item.explanation || '2 tấm hỏng góc lúc vận chuyển, đề nghị xuất huỷ');
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
                  explanation: inputExplanation,
                }
              : it
          ),
        };
      })
    );

    showToast(`Đã lưu kết quả kiểm kê ${editingItem.sku}!`);
    setEditModalOpen(false);
  };

  const handleSubmitAudit = () => {
    showToast(`Đã gửi trình duyệt biên bản lệch kho ${currentProfile.code} tới Quản lý!`);
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
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px] uppercase tracking-wider mb-2 border border-purple-200">
            <span>KIỂM KÊ ĐỊNH KỲ & LỆCH KHO</span>
            <span>•</span>
            <span className="font-normal text-purple-600">Đặc tả 3.2.5.9 & 3.2.5.10</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Nhập Biên bản Kiểm kê Giấy (List + Popup Modal)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách mặt hàng kiểm kê dạng Bảng chỉ đọc (Read-only Table). Bấm nút Sửa hoặc nhấp dòng để mở Popup nhập Số lượng đếm thực tế và Mã biên bản giấy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSubmitAudit}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Send size={14} />
            <span>Gửi Trình duyệt Lệch kho</span>
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

      {/* 2. Stat Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TỒN SỔ SÁCH HỆ THỐNG
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
            {totalBookQty.toLocaleString('vi-VN')} SP
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            THỰC ĐẾM TRÊN GIẤY
          </div>
          <div className="text-xl font-extrabold text-purple-700 font-mono mt-1">
            {totalActualQty.toLocaleString('vi-VN')} SP
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            SỐ MẶT HÀNG LỆCH
          </div>
          <div className="text-xl font-extrabold text-rose-600 font-mono mt-1">
            {diffSkus} SKU
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            GIÁ TRỊ LỆCH ƯỚC TÍNH
          </div>
          <div className="text-xl font-extrabold text-rose-600 font-mono mt-1">
            -45.000 đ
          </div>
        </div>
      </div>

      {/* 3. Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Kỳ kiểm kê */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              KỲ KIỂM KÊ ({profiles.length})
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
                      ? 'border-purple-400 bg-purple-50/40 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-700 px-2 py-0.5 rounded bg-purple-50 border border-purple-200">
                      {prof.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                      {prof.statusText}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {prof.auditName}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {prof.paperCode}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100/80">
                    <span>{prof.warehouseCode}</span>
                    <span className="font-mono font-bold text-slate-700">{prof.items.length} SKU</span>
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
                <FileText size={16} className="text-purple-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  BIÊN BẢN GIẤY ĐỐI CHIẾU: {currentProfile.paperCode}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-purple-700 px-2.5 py-0.5 rounded bg-purple-50 border border-purple-200">
                {currentProfile.code}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">MÃ BIÊN BẢN GIẤY:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.paperCode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">NGÀY KIỂM KÊ GIẤY:</span>
                <span className="font-mono font-bold text-slate-700 block">
                  {currentProfile.auditDate}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">KHU VỰC KIỂM:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.auditZone}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">TỔ TRƯỞNG KIỂM:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.leadAuditor}
                </span>
              </div>
            </div>
          </div>

          {/* Table: Chi tiết kiểm kê hàng hóa */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  CHI TIẾT KIỂM KÊ HÀNG HÓA (BẢNG CHỈ ĐỌC - NHẤP DÒNG ĐỂ SỬA)
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
                    <th className="py-3 px-4">TÊN MẶT HÀNG & QUY CÁCH</th>
                    <th className="py-3 px-3">ĐVT</th>
                    <th className="py-3 px-3 text-right">SL SỔ SÁCH</th>
                    <th className="py-3 px-3 text-right">SL THỰC ĐẾM</th>
                    <th className="py-3 px-3 text-center">CHÊNH LỆCH</th>
                    <th className="py-3 px-4">GIẢI TRÌNH NGUYÊN NHÂN</th>
                    <th className="py-3 px-3 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentProfile.items.map((item, idx) => {
                    const diff = item.actualQty - item.bookQty;
                    return (
                      <tr
                        key={item.id}
                        onDoubleClick={() => handleOpenEdit(item)}
                        className="hover:bg-purple-50/30 transition cursor-pointer group"
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-purple-700">
                          {item.sku}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                          {item.bookQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-purple-700">
                          {item.actualQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {diff === 0 ? (
                            <span className="text-emerald-600">Khớp 100%</span>
                          ) : diff < 0 ? (
                            <span className="text-rose-600">{diff}</span>
                          ) : (
                            <span className="text-blue-600">+{diff}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {item.explanation || '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(item);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-xs font-semibold transition cursor-pointer"
                          >
                            <Edit3 size={12} />
                            <span>Sửa</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>* Nhấp đúp vào dòng hoặc bấm nút Sửa để mở Popup cập nhật số lượng kiểm kê</span>
              <span className="font-semibold text-slate-700">
                {currentProfile.items.length} mặt hàng
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Cập nhật Số liệu Kiểm kê Giấy (Popup Form - Khớp 100% Ảnh 4) */}
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
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
                <Edit3 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cập nhật Số liệu Kiểm kê Giấy (Popup Form)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  SKU: <strong className="font-mono text-purple-700">{editingItem.sku}</strong> • Vị trí:{' '}
                  <strong className="font-mono text-slate-700">{inputBinLocation}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Product Info Box */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 text-xs space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  TÊN MẶT HÀNG KIỂM KÊ:
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {editingItem.name}
                </div>
                <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                  <span>Tồn sổ sách hệ thống: <strong className="font-mono text-slate-900">{editingItem.bookQty} {editingItem.unit}</strong></span>
                  <span>Vị trí: <strong className="font-mono text-slate-900">{inputBinLocation}</strong></span>
                </div>
              </div>

              {/* Field: Mã biên bản kiểm kê giấy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã biên bản kiểm kê giấy (Paper Ref Code) <span className="text-rose-500">*</span>
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
                    className="w-full h-9 pl-7 pr-3 rounded-lg border border-purple-400 bg-white font-mono font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Row 2 cols: Ngày kiểm kê trên giấy & Số lượng đếm thực tế */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày kiểm kê trên giấy
                  </label>
                  <input
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng đếm thực tế ({editingItem.unit}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={inputActualQty}
                    onChange={(e) => setInputActualQty(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-purple-400 bg-white font-mono font-bold text-purple-700 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Field: Giải trình nguyên nhân chênh lệch */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Giải trình nguyên nhân chênh lệch
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={inputExplanation}
                    onChange={(e) => setInputExplanation(e.target.value)}
                    className="w-full p-2.5 pr-8 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none bg-white"
                  />
                  <Edit3
                    size={14}
                    className="absolute right-2.5 bottom-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Calculation Box: Chênh lệch so với sổ sách */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600">Chênh lệch so với sổ sách:</span>
                <span className={`font-mono font-bold text-xs ${
                  inputActualQty - editingItem.bookQty < 0
                    ? 'text-rose-600'
                    : inputActualQty - editingItem.bookQty > 0
                    ? 'text-blue-600'
                    : 'text-emerald-600'
                }`}>
                  {inputActualQty - editingItem.bookQty < 0
                    ? `Thiếu ${Math.abs(inputActualQty - editingItem.bookQty)} ${editingItem.unit}`
                    : inputActualQty - editingItem.bookQty > 0
                    ? `Thừa +${inputActualQty - editingItem.bookQty} ${editingItem.unit}`
                    : `Khớp 100%`}
                </span>
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
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white cursor-pointer shadow-xs"
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
