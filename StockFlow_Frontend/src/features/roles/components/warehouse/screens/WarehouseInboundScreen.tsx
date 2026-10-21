// src/features/roles/components/warehouse/screens/WarehouseInboundScreen.tsx
// Màn hình 3.2.5.2 & 3.2.5.3: Nhập kho từ Chứng từ Giấy (List + Popup Modal)
// Đã loại bỏ cột Vị trí ô kệ theo yêu cầu

import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Printer,
  Edit3,
  X,
  Lock,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';

interface InboundProfile {
  id: string;
  code: string;
  paperCode: string;
  sourceType: 'PO' | 'LSX';
  sourceCode: string;
  supplier: string;
  warehouse: string;
  totalQty: number;
  items: InboundItem[];
}

interface InboundItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  paperQty: number;
  actualQty: number;
  defectiveQty: number;
  notes: string;
}

const INITIAL_PROFILES: InboundProfile[] = [
  {
    id: 'PNK-01',
    code: 'PNK-2026-001',
    paperCode: 'Phiếu nhập kho số 123 / PO-NCC-088',
    sourceType: 'PO',
    sourceCode: 'PO-2026-001',
    supplier: 'Công ty Cổ phần Nhựa Tiền Phong (NCC)',
    warehouse: 'Kho Tổng Gia Lâm - Khu Lưu Trữ Chính',
    totalQty: 500,
    items: [
      {
        id: 'ITEM-1',
        sku: 'TP-SP01',
        name: 'Tấm ốp Nano PVC vân đá 9mm',
        unit: 'Tấm',
        paperQty: 300,
        actualQty: 298,
        defectiveQty: 2,
        notes: '2 tấm nứt góc lúc dỡ hàng',
      },
      {
        id: 'ITEM-2',
        sku: 'TP-SP04',
        name: 'Keo dán chuyên dụng T-Bond 300ml',
        unit: 'Chai',
        paperQty: 200,
        actualQty: 200,
        defectiveQty: 0,
        notes: 'Đầy đủ niêm phong thùng',
      },
    ],
  },
  {
    id: 'PNK-02',
    code: 'PNK-2026-002',
    paperCode: 'Biên bản bàn giao xưởng số 45/BBBG-ĐA',
    sourceType: 'LSX',
    sourceCode: 'LSX-2026-001',
    supplier: 'Phân xưởng Bao bì Đông Anh',
    warehouse: 'Kho Đông Anh - Thành phẩm xuất xưởng',
    totalQty: 1000,
    items: [
      {
        id: 'ITEM-3',
        sku: 'TP-NV03',
        name: 'Màng Film PVC vân gỗ sồi đỏ',
        unit: 'm²',
        paperQty: 1000,
        actualQty: 1000,
        defectiveQty: 0,
        notes: 'Giao chuẩn theo lệnh sản xuất ca sáng',
      },
    ],
  },
  {
    id: 'PNK-03',
    code: 'PNK-2026-003',
    paperCode: 'Hóa đơn GTGT số 004812 / NCC Nhựa Hà Nội',
    sourceType: 'PO',
    sourceCode: 'PO-2026-003',
    supplier: 'TNHH Hóa Chất & Nhựa Thăng Long',
    warehouse: 'Kho Tổng Gia Lâm - Nguyên vật liệu',
    totalQty: 450,
    items: [
      {
        id: 'ITEM-4',
        sku: 'TP-NV01',
        name: 'Hạt nhựa PVC nguyên sinh SG5',
        unit: 'Kg',
        paperQty: 450,
        actualQty: 450,
        defectiveQty: 0,
        notes: 'Bao bì nguyên vẹn, chứng chỉ CO/CQ đạt',
      },
    ],
  },
];

export const WarehouseInboundScreen: React.FC = () => {
  const [profiles, setProfiles] = useState<InboundProfile[]>(INITIAL_PROFILES);
  const [selectedId, setSelectedId] = useState<string>('PNK-01');
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal edit item (Khớp 100% Ảnh 1)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InboundItem | null>(null);
  const [inputPaperCode, setInputPaperCode] = useState('Phiếu nhập kho số 123 / PO-NCC-088');
  const [inputDate, setInputDate] = useState('2026-10-18');
  const [inputBinLocation, setInputBinLocation] = useState('Kệ A1-01');
  const [inputActualQty, setInputActualQty] = useState<number>(298);
  const [inputDefectiveQty, setInputDefectiveQty] = useState<number>(2);
  const [inputNotes, setInputNotes] = useState<string>('2 tấm nứt góc lúc dỡ hàng từ xe tải NCC');

  const currentProfile = profiles.find((p) => p.id === selectedId) || profiles[0];

  const filteredProfiles = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.code.toLowerCase().includes(q) ||
      p.paperCode.toLowerCase().includes(q) ||
      p.supplier.toLowerCase().includes(q)
    );
  });

  const totalPaperQty = currentProfile.items.reduce((s, i) => s + i.paperQty, 0);
  const totalActualQty = currentProfile.items.reduce((s, i) => s + i.actualQty, 0);
  const totalDefectiveQty = currentProfile.items.reduce((s, i) => s + i.defectiveQty, 0);
  const diffQty = totalActualQty - totalPaperQty;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenEdit = (item: InboundItem) => {
    setEditingItem(item);
    setInputPaperCode(currentProfile.paperCode || 'Phiếu nhập kho số 123 / PO-NCC-088');
    setInputDate('2026-10-18');
    setInputBinLocation('Kệ A1-01');
    setInputActualQty(item.actualQty);
    setInputDefectiveQty(item.defectiveQty);
    setInputNotes(item.notes || '2 tấm nứt góc lúc dỡ hàng từ xe tải NCC');
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
                  defectiveQty: Number(inputDefectiveQty),
                  notes: inputNotes,
                }
              : it
          ),
        };
      })
    );

    showToast(`Đã lưu đối chiếu hàng hóa ${editingItem.sku}!`);
    setEditModalOpen(false);
  };

  const handleLockInbound = () => {
    showToast(`Đã khóa & hoàn tất nhập kho ${currentProfile.code} thành công!`);
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
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wider mb-2 border border-blue-100">
            <span>NHẬP LIỆU CHỨNG TỪ GIẤY (DESKTOP)</span>
            <span>•</span>
            <span className="font-normal text-blue-600">Đặc tả 3.2.5.2 & 3.2.5.3</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Nhập kho từ Chứng từ Giấy (List + Popup Modal)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách hàng hóa hiển thị dưới dạng Bảng chỉ đọc (Read-only Table). Nhấp vào dòng hoặc bấm nút Sửa để mở Popup nhập Số lượng thực nhận, Số lượng lỗi và Mã chứng từ giấy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleLockInbound}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Lock size={14} />
            <span>Khóa & Hoàn tất Nhập kho</span>
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
            TỔNG SL CHỨNG TỪ
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
            {totalPaperQty.toLocaleString('vi-VN')} SP
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TỔNG SL THỰC NHẬN
          </div>
          <div className="text-xl font-extrabold text-blue-700 font-mono mt-1">
            {totalActualQty.toLocaleString('vi-VN')} SP
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            HÀNG LỖI / HỎNG
          </div>
          <div className="text-xl font-extrabold text-amber-600 font-mono mt-1">
            {totalDefectiveQty.toLocaleString('vi-VN')} SP
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            CHÊNH LỆCH ĐỐI CHIẾU
          </div>
          <div
            className={`text-xl font-extrabold font-mono mt-1 ${
              diffQty < 0 ? 'text-rose-600' : diffQty > 0 ? 'text-emerald-600' : 'text-slate-900'
            }`}
          >
            {diffQty > 0 ? `+${diffQty}` : diffQty} SP
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Left List Profiles & Right Read-Only Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Hồ sơ phiếu nhập */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              HỒ SƠ PHIẾU NHẬP ({filteredProfiles.length})
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Đối chiếu giấy</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã phiếu, PO-2026-001, NCC..."
              className="w-full h-8.5 pl-8.5 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Profiles List */}
          <div className="space-y-2.5">
            {filteredProfiles.map((prof) => {
              const isSelected = prof.id === selectedId;
              return (
                <div
                  key={prof.id}
                  onClick={() => setSelectedId(prof.id)}
                  className={`p-3.5 rounded-lg border transition cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50/50 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                      {prof.code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                        prof.sourceType === 'PO'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {prof.sourceType === 'PO' ? 'Đơn PO' : 'Lệnh SX'}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {prof.paperCode}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {prof.supplier}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100/80">
                    <span>Nguồn: {prof.sourceCode}</span>
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
                <FileText size={16} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  CHỨNG TỪ GIẤY ĐỐI CHIẾU: {currentProfile.paperCode}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-blue-700 px-2.5 py-0.5 rounded bg-blue-50 border border-blue-100">
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
                <span className="text-slate-400 block text-[11px]">NGUỒN ĐƠN HÀNG:</span>
                <span className="font-mono font-bold text-blue-700 block">
                  {currentProfile.sourceCode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">NHÀ CUNG CẤP / XƯỞNG:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.supplier}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">KHO & NHÂN VIÊN NHẬP:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.warehouse}
                </span>
              </div>
            </div>
          </div>

          {/* Table: Danh sách hàng hóa (Bảng chỉ đọc - nhấp dòng để sửa) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  DANH SÁCH HÀNG HÓA (BẢNG CHỈ ĐỌC - NHẤP DÒNG ĐỂ SỬA)
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
                    <th className="py-3 px-3 text-right">SL THỰC NHẬN</th>
                    <th className="py-3 px-3 text-right">SL LỖI/HỎNG</th>
                    <th className="py-3 px-3 text-right">CHÊNH LỆCH</th>
                    <th className="py-3 px-4">GHI CHÚ BIÊN BẢN</th>
                    <th className="py-3 px-3 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentProfile.items.map((item, idx) => {
                    const diff = item.actualQty - item.paperQty;
                    return (
                      <tr
                        key={item.id}
                        onDoubleClick={() => handleOpenEdit(item)}
                        className="hover:bg-blue-50/40 transition cursor-pointer group"
                      >
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-blue-700">
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
                        <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                          {item.actualQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-600">
                          {item.defectiveQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold">
                          {diff === 0 ? (
                            <span className="text-emerald-600">✓ 0</span>
                          ) : (
                            <span className="text-rose-600">{diff}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 text-[11px]">
                          {item.notes || '—'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(item);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 text-xs font-semibold transition cursor-pointer"
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
              <span>* Nhấp đúp vào dòng hoặc bấm nút Sửa để mở Popup nhập liệu từ chứng từ giấy</span>
              <span className="font-semibold text-slate-700">
                {currentProfile.items.length} SKU đã đối chiếu
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Cập nhật Nhập liệu Hàng hóa (Popup Form - Khớp 100% Ảnh 1) */}
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
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E56A0] flex items-center justify-center border border-blue-100 shrink-0">
                <Edit3 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cập nhật Nhập liệu Hàng hóa (Popup Form)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  SKU: <strong className="font-mono text-blue-700">{editingItem.sku}</strong> • Nguồn:{' '}
                  <strong className="font-mono text-slate-700">{currentProfile.sourceCode}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Product Info Box */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 text-xs space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  TÊN HÀNG HÓA:
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {editingItem.name}
                </div>
                <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                  <span>SL trên chứng từ gốc:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {editingItem.paperQty} {editingItem.unit}
                  </span>
                </div>
              </div>

              {/* Field: Mã chứng từ giấy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã chứng từ giấy (Paper Reference Code) <span className="text-rose-500">*</span>
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
                    className="w-full h-9 pl-7 pr-3 rounded-lg border border-amber-400 bg-white font-mono font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Số hiệu in trên chứng từ giấy dùng để đối chiếu
                </p>
              </div>

              {/* Row 2 cols: Ngày ghi trên giấy & Vị trí Ô Kệ lưu trữ */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày ghi trên giấy
                  </label>
                  <input
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vị trí Ô Kệ lưu trữ
                  </label>
                  <input
                    type="text"
                    value={inputBinLocation}
                    onChange={(e) => setInputBinLocation(e.target.value)}
                    placeholder="Kệ A1-01"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 2 cols: Số lượng thực nhận & Số lượng lỗi / hỏng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng thực nhận ({editingItem.unit}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={inputActualQty}
                    onChange={(e) => setInputActualQty(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-blue-400 bg-white font-mono font-bold text-blue-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng lỗi / hỏng ({editingItem.unit})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={inputDefectiveQty}
                    onChange={(e) => setInputDefectiveQty(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-amber-400 bg-white font-mono font-bold text-amber-600 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Field: Ghi chú đối chiếu biên bản giấy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú đối chiếu biên bản giấy
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={inputNotes}
                    onChange={(e) => setInputNotes(e.target.value)}
                    className="w-full p-2.5 pr-8 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-white"
                  />
                  <Edit3
                    size={14}
                    className="absolute right-2.5 bottom-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Calculation Box: Chênh lệch so với chứng từ gốc */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600">Chênh lệch so với chứng từ gốc:</span>
                <span className={`font-mono font-bold text-xs ${
                  inputActualQty - editingItem.paperQty < 0
                    ? 'text-rose-600'
                    : inputActualQty - editingItem.paperQty > 0
                    ? 'text-blue-600'
                    : 'text-emerald-600'
                }`}>
                  {inputActualQty - editingItem.paperQty < 0
                    ? `Thiếu ${inputActualQty - editingItem.paperQty} ${editingItem.unit}`
                    : inputActualQty - editingItem.paperQty > 0
                    ? `Thừa +${inputActualQty - editingItem.paperQty} ${editingItem.unit}`
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
                  className="px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#16437E] text-xs font-bold text-white cursor-pointer shadow-xs"
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
