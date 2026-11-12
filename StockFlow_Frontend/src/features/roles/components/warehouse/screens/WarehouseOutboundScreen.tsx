// src/features/roles/components/warehouse/screens/WarehouseOutboundScreen.tsx
// Màn hình 3.2.5.4 & 3.2.5.5: Xuất kho theo Phiếu giấy (List + Popup Modal)
// Đã loại bỏ vị trí ô kệ theo yêu cầu

import React, { useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Printer,
  Edit3,
  X,
  Truck,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';

interface OutboundProfile {
  id: string;
  code: string;
  paperCode: string;
  customerName: string;
  pxkCode: string;
  warehouseStaff: string;
  totalQty: number;
  statusText: string;
  items: OutboundItem[];
}

interface OutboundItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  reqQty: number;
  actualQty: number;
  notes: string;
}

const INITIAL_OUTBOUND_PROFILES: OutboundProfile[] = [
  {
    id: 'LXK-01',
    code: 'LXK-2026-088',
    paperCode: 'Phiếu xuất kho số 456 / HĐ-2026-88',
    customerName: 'Công ty TNHH Nội Thất Minh Quân',
    pxkCode: 'PXK-2026-088',
    warehouseStaff: 'Phạm Văn D',
    totalQty: 190,
    statusText: 'Đang nhập liệu số lượng thực xuất',
    items: [
      {
        id: 'OUT-1',
        sku: 'TP-SP01',
        name: 'Tấm ốp Nano PVC vân đá 9mm',
        unit: 'Tấm',
        reqQty: 120,
        actualQty: 120,
        notes: 'Đã xuất đủ 12 bó x 10 tấm',
      },
      {
        id: 'OUT-2',
        sku: 'TP-SP02',
        name: 'Phào chỉ cổ trần PU dát vàng 8cm',
        unit: 'Cây 2.4m',
        reqQty: 30,
        actualQty: 30,
        notes: 'Kiểm tra cạnh mạ vàng không trầy xước',
      },
      {
        id: 'OUT-3',
        sku: 'TP-SP04',
        name: 'Keo dán chuyên dụng T-Bond 300ml',
        unit: 'Chai',
        reqQty: 40,
        actualQty: 38,
        notes: 'Thiếu 2 chai do vỡ bao bì ngoài, đã ghi nhận',
      },
    ],
  },
  {
    id: 'LXK-02',
    code: 'LXK-2026-089',
    paperCode: 'Phiếu xuất kho số 457 / Đơn DC-2026-092',
    customerName: 'Đại lý Vật liệu Xây dựng Thăng Long',
    pxkCode: 'PXK-2026-089',
    warehouseStaff: 'Phạm Văn D',
    totalQty: 75,
    statusText: 'Chờ nhập liệu số lượng thực xuất',
    items: [
      {
        id: 'OUT-4',
        sku: 'TP-SP03',
        name: 'Nẹp nhôm chữ T mạ Anode',
        unit: 'Thanh 2.5m',
        reqQty: 75,
        actualQty: 75,
        notes: 'Đóng thùng gỗ bảo vệ nẹp nhôm',
      },
    ],
  },
];

export const WarehouseOutboundScreen: React.FC = () => {
  const [profiles, setProfiles] = useState<OutboundProfile[]>(INITIAL_OUTBOUND_PROFILES);
  const [selectedId, setSelectedId] = useState<string>('LXK-01');
  const [search, setSearch] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit item modal (Khớp 100% Ảnh 2)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OutboundItem | null>(null);
  const [inputPaperCode, setInputPaperCode] = useState('Phiếu xuất kho số 456 / HĐ-2026-88');
  const [inputDate, setInputDate] = useState('2026-10-18');
  const [inputBinLocation, setInputBinLocation] = useState('Kệ A1-01');
  const [inputActualQty, setInputActualQty] = useState<number>(120);
  const [inputNotes, setInputNotes] = useState<string>('Đã xuất đủ 12 bó x 10 tấm');

  const currentProfile = profiles.find((p) => p.id === selectedId) || profiles[0];

  const filteredProfiles = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.code.toLowerCase().includes(q) ||
      p.paperCode.toLowerCase().includes(q) ||
      p.customerName.toLowerCase().includes(q)
    );
  });

  const totalReqQty = currentProfile.items.reduce((s, i) => s + i.reqQty, 0);
  const totalActualQty = currentProfile.items.reduce((s, i) => s + i.actualQty, 0);
  const diffQty = totalActualQty - totalReqQty;
  const fulfillPercent = totalReqQty > 0 ? Math.round((totalActualQty / totalReqQty) * 100) : 100;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenEdit = (item: OutboundItem) => {
    setEditingItem(item);
    setInputPaperCode(currentProfile.paperCode || 'Phiếu xuất kho số 456 / HĐ-2026-88');
    setInputDate('2026-10-18');
    setInputBinLocation('Kệ A1-01');
    setInputActualQty(item.actualQty);
    setInputNotes(item.notes || 'Đã xuất đủ 12 bó x 10 tấm');
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

    showToast(`Đã cập nhật thực xuất cho ${editingItem.sku}!`);
    setEditModalOpen(false);
  };

  const handleCompleteOutbound = () => {
    showToast(`Đã hoàn tất xuất kho & giao hàng phiếu ${currentProfile.code}!`);
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
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-amber-50 text-amber-700 font-bold text-[10px] uppercase tracking-wider mb-2 border border-amber-200">
            <span>XUẤT KHO & GIAO HÀNG (DESKTOP)</span>
            <span>•</span>
            <span className="font-normal text-amber-600">Đặc tả 3.2.5.4 & 3.2.5.5</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Xuất kho theo Phiếu giấy (List + Popup Modal)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Danh sách hàng xuất hiển thị dưới dạng Bảng chỉ đọc (Read-only Table). Bấm nút Sửa hoặc nhấp vào dòng để mở Popup nhập Số lượng thực xuất và Mã chứng từ giấy.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCompleteOutbound}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Truck size={14} />
            <span>Hoàn tất Xuất kho & Giao</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Printer size={14} className="text-slate-500" />
            <span>In Phiếu Xuất</span>
          </button>
        </div>
      </div>

      {/* 2. Stat Badges Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            SL YÊU CẦU XUẤT
          </div>
          <div className="text-xl font-extrabold text-slate-900 font-mono mt-1">
            {totalReqQty.toLocaleString('vi-VN')} SP
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            SL THỰC XUẤT
          </div>
          <div className="text-xl font-extrabold text-amber-700 font-mono mt-1">
            {totalActualQty.toLocaleString('vi-VN')} SP
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TỶ LỆ XUẤT ĐỦ
          </div>
          <div className="text-xl font-extrabold text-emerald-600 font-mono mt-1">
            {fulfillPercent}%
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TRẠNG THÁI ĐỐI CHIẾU
          </div>
          <div
            className={`text-xl font-extrabold font-mono mt-1 ${
              diffQty < 0 ? 'text-rose-600' : diffQty === 0 ? 'text-emerald-600' : 'text-slate-900'
            }`}
          >
            {diffQty < 0 ? `Lệch ${diffQty} SP` : diffQty === 0 ? 'Khớp 100%' : `Thừa +${diffQty} SP`}
          </div>
        </div>
      </div>

      {/* 3. Main Split View: Left List Profiles & Right Read-Only Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Lệnh xuất kho */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              LỆNH XUẤT KHO ({filteredProfiles.length})
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
              placeholder="Tìm mã lệnh, khách hàng, chứng từ..."
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
                      ? 'border-amber-400 bg-amber-50/40 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-200">
                      {prof.code}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      {prof.statusText}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {prof.paperCode}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    KH: {prof.customerName}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100/80">
                    <span>Phiếu XK: {prof.pxkCode}</span>
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
                <FileText size={16} className="text-amber-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  CHỨNG TỪ GIẤY XUẤT KHO: {currentProfile.paperCode}
                </span>
              </div>
              <span className="font-mono text-xs font-bold text-amber-700 px-2.5 py-0.5 rounded bg-amber-50 border border-amber-200">
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
                <span className="text-slate-400 block text-[11px]">KHÁCH HÀNG NHẬN:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.customerName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">PHIẾU XUẤT KHO GỐC:</span>
                <span className="font-mono font-bold text-blue-700 block">
                  {currentProfile.pxkCode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">NHÂN VIÊN KHO XUẤT:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.warehouseStaff}
                </span>
              </div>
            </div>
          </div>

          {/* Table: Danh sách hàng xuất (Bảng chỉ đọc - nhấp dòng để sửa) */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-600"></div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  DANH SÁCH HÀNG XUẤT (BẢNG CHỈ ĐỌC - NHẤP DÒNG ĐỂ SỬA)
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
                    <th className="py-3 px-4">TÊN HÀNG HÓA XUẤT</th>
                    <th className="py-3 px-3">ĐVT</th>
                    <th className="py-3 px-3 text-right">SL YÊU CẦU</th>
                    <th className="py-3 px-3 text-right">SL THỰC XUẤT</th>
                    <th className="py-3 px-3 text-center">KHỚP LỆNH</th>
                    <th className="py-3 px-4">GHI CHÚ TÌNH TRẠNG XUẤT</th>
                    <th className="py-3 px-3 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentProfile.items.map((item, idx) => {
                    const isFull = item.actualQty === item.reqQty;
                    const diff = item.actualQty - item.reqQty;
                    return (
                      <tr
                        key={item.id}
                        onDoubleClick={() => handleOpenEdit(item)}
                        className="hover:bg-amber-50/30 transition cursor-pointer group"
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
                          {item.reqQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-amber-700">
                          {item.actualQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isFull ? (
                            <span className="font-semibold text-emerald-600">Đủ 100%</span>
                          ) : (
                            <span className="font-semibold text-rose-600">Thiếu {Math.abs(diff)}</span>
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-700 text-xs font-semibold transition cursor-pointer"
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
              <span>* Nhấp đúp vào dòng hoặc bấm nút Sửa để mở Popup cập nhật số lượng xuất</span>
              <span className="font-semibold text-slate-700">
                {currentProfile.items.length} mặt hàng xuất
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Cập nhật Xuất kho từ Chứng từ (Popup Form - Khớp 100% Ảnh 2) */}
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
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shrink-0">
                <Edit3 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cập nhật Xuất kho từ Chứng từ (Popup Form)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  SKU: <strong className="font-mono text-amber-700">{editingItem.sku}</strong> • Vị trí:{' '}
                  <strong className="font-mono text-slate-700">{inputBinLocation}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Product Info Box */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 text-xs space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  TÊN HÀNG HÓA XUẤT:
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {editingItem.name}
                </div>
                <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                  <span>SL Yêu cầu theo lệnh: <strong className="font-mono text-slate-900">{editingItem.reqQty} {editingItem.unit}</strong></span>
                  <span>Vị trí: <strong className="font-mono text-slate-900">{inputBinLocation}</strong></span>
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
              </div>

              {/* Row 2 cols: Ngày ghi trên phiếu xuất & Số lượng thực xuất */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày ghi trên phiếu xuất
                  </label>
                  <input
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng thực xuất ({editingItem.unit}) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={inputActualQty}
                    onChange={(e) => setInputActualQty(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-amber-400 bg-white font-mono font-bold text-amber-700 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Field: Ghi chú tình trạng xuất kho */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú tình trạng xuất kho
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={inputNotes}
                    onChange={(e) => setInputNotes(e.target.value)}
                    className="w-full p-2.5 pr-8 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none bg-white"
                  />
                  <Edit3
                    size={14}
                    className="absolute right-2.5 bottom-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              {/* Calculation Box: Đối soát số lượng xuất */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs">
                <span className="text-slate-600">Đối soát số lượng xuất:</span>
                <span className={`font-mono font-bold text-xs ${
                  inputActualQty >= editingItem.reqQty ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {inputActualQty >= editingItem.reqQty
                    ? 'Xuất đủ 100%'
                    : `Xuất thiếu: ${editingItem.reqQty - inputActualQty} ${editingItem.unit}`}
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
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-bold text-white cursor-pointer shadow-xs"
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
