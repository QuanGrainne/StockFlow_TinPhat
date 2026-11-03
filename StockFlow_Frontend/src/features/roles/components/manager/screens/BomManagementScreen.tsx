// src/features/roles/components/manager/screens/BomManagementScreen.tsx
// Màn hình 3.2.2.8: Quản lý định mức vật tư (BOM) theo thiết kế chuẩn AI Studio Ảnh 4 & Ảnh 5

import React, { useState } from 'react';
import {
  Sliders,
  Plus,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Cpu,
  Layers,
  Save,
} from 'lucide-react';

interface BomMaterialItem {
  id: string;
  code: string;
  name: string;
  uom: string;
  baseQty: number;
  scrapPercent: number;
  standardQty: number;
}

interface BomDefinition {
  id: string;
  code: string;
  version: string;
  productName: string;
  materialCount: number;
  effectiveDate: string;
  status: 'ACTIVE' | 'DRAFT';
  description: string;
  items: BomMaterialItem[];
}

const INITIAL_BOM_LIST: BomDefinition[] = [
  {
    id: 'BOM-01',
    code: 'BOM-NANO-01',
    version: 'v2.1',
    productName: 'Tấm ốp Nano PVC vân đá 9mm',
    materialCount: 4,
    effectiveDate: '01/08/2026',
    status: 'ACTIVE',
    description:
      'Công thức đùn tấm Nano thế hệ mới gia cường bột đá chịu lực và phủ màng UV bóng gương.',
    items: [
      {
        id: 'MAT-01',
        code: 'TP-NV01',
        name: 'Hạt nhựa PVC nguyên sinh SG5',
        uom: 'Kg',
        baseQty: 3.2,
        scrapPercent: 2.5,
        standardQty: 3.28,
      },
      {
        id: 'MAT-02',
        code: 'TP-NV02',
        name: 'Bột đá siêu mịn Canxi Cacbonat',
        uom: 'Kg',
        baseQty: 4.5,
        scrapPercent: 1.8,
        standardQty: 4.58,
      },
      {
        id: 'MAT-03',
        code: 'TP-NV03',
        name: 'Màng Film PVC vân gỗ/đá',
        uom: 'm²',
        baseQty: 1.25,
        scrapPercent: 3.0,
        standardQty: 1.29,
      },
      {
        id: 'MAT-04',
        code: 'TP-NV04',
        name: 'Keo dán PUR nóng chảy',
        uom: 'g',
        baseQty: 65,
        scrapPercent: 2.0,
        standardQty: 66.3,
      },
    ],
  },
  {
    id: 'BOM-02',
    code: 'BOM-PHAO-02',
    version: 'v1.4',
    productName: 'Phào chỉ cổ trần PU dát vàng 8cm',
    materialCount: 3,
    effectiveDate: '15/07/2026',
    status: 'ACTIVE',
    description:
      'Định mức đúc phào PU mật độ cao chống co ngót và phủ lá quỳ vàng nano công nghiệp.',
    items: [
      {
        id: 'MAT-05',
        code: 'TP-NV05',
        name: 'Hợp chất Polyol & Isocyanate',
        uom: 'Kg',
        baseQty: 0.88,
        scrapPercent: 2.0,
        standardQty: 0.9,
      },
      {
        id: 'MAT-06',
        code: 'TP-NV06',
        name: 'Lá quỳ vàng dát công nghiệp',
        uom: 'Lá',
        baseQty: 25,
        scrapPercent: 4.0,
        standardQty: 26,
      },
      {
        id: 'MAT-07',
        code: 'TP-NV07',
        name: 'Sơn lót phủ bề mặt PU',
        uom: 'ml',
        baseQty: 40,
        scrapPercent: 3.5,
        standardQty: 41.4,
      },
    ],
  },
];

export const BomManagementScreen: React.FC = () => {
  const [boms, setBoms] = useState<BomDefinition[]>(INITIAL_BOM_LIST);
  const [selectedBomId, setSelectedBomId] = useState<string>('BOM-01');

  // Modal State (Ảnh 5 - Bên trái chuẩn)
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formProductName, setFormProductName] = useState('Nẹp nhôm chữ T mạ Anode');
  const [formVersion, setFormVersion] = useState('v1.0');
  const [formDescription, setFormDescription] = useState(
    'Công thức định mức phôi nhôm 6063 và mạ điện phân Anode tạo màu.'
  );
  const [modalItems, setModalItems] = useState([
    {
      code: 'TP-AL01',
      name: 'Phôi nhôm định hình 606',
      uom: 'Kg',
      baseQty: 0.45,
      scrapPercent: 2,
      totalQty: 0.46,
    },
    {
      code: 'TP-CH02',
      name: 'Hóa chất xi mạ Anode',
      uom: 'Lít',
      baseQty: 0.05,
      scrapPercent: 3,
      totalQty: 0.052,
    },
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const selectedBom = boms.find((b) => b.id === selectedBomId) || boms[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenCreateModal = () => {
    setFormProductName('Nẹp nhôm chữ T mạ Anode');
    setFormVersion('v1.0');
    setFormDescription('Công thức định mức phôi nhôm 6063 và mạ điện phân Anode tạo màu.');
    setModalItems([
      {
        code: 'TP-AL01',
        name: 'Phôi nhôm định hình 606',
        uom: 'Kg',
        baseQty: 0.45,
        scrapPercent: 2,
        totalQty: 0.46,
      },
      {
        code: 'TP-CH02',
        name: 'Hóa chất xi mạ Anode',
        uom: 'Lít',
        baseQty: 0.05,
        scrapPercent: 3,
        totalQty: 0.052,
      },
    ]);
    setCreateModalOpen(true);
  };

  const handleAddItem = () => {
    setModalItems([
      ...modalItems,
      {
        code: `TP-NV0${modalItems.length + 5}`,
        name: 'Vật tư phụ gia gia công',
        uom: 'Kg',
        baseQty: 0.1,
        scrapPercent: 2,
        totalQty: 0.102,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setModalItems(modalItems.filter((_, i) => i !== index));
  };

  const handleSaveBom = (e: React.FormEvent) => {
    e.preventDefault();
    const newBom: BomDefinition = {
      id: `BOM-${Date.now()}`,
      code: `BOM-AL-${Math.floor(Math.random() * 90) + 10}`,
      version: formVersion,
      productName: formProductName,
      materialCount: modalItems.length,
      effectiveDate: '20/10/2026',
      status: 'ACTIVE',
      description: formDescription,
      items: modalItems.map((m, idx) => ({
        id: `M-${idx}`,
        code: m.code,
        name: m.name,
        uom: m.uom,
        baseQty: m.baseQty,
        scrapPercent: m.scrapPercent,
        standardQty: m.totalQty,
      })),
    };

    setBoms([...boms, newBom]);
    setSelectedBomId(newBom.id);
    setCreateModalOpen(false);
    showToast(`Đã lưu định mức BOM mới: ${newBom.code} (${newBom.productName})`);
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

      {/* Screen Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý định mức vật tư (BOM)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Thiết lập công thức sản xuất, tỷ lệ hao hụt và định mức tiêu hao nguyên vật liệu
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
        >
          <Plus size={14} />
          <span>+ Thêm định mức BOM</span>
        </button>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Danh sách BOM hiện hành */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              DANH SÁCH BOM HIỆN HÀNH
            </h2>
            <span className="text-xs font-semibold text-slate-500">
              {boms.length} công thức
            </span>
          </div>

          <div className="space-y-2.5">
            {boms.map((bom) => {
              const isSelected = bom.id === selectedBomId;

              return (
                <div
                  key={bom.id}
                  onClick={() => setSelectedBomId(bom.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'border-blue-400 bg-blue-50/30 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`font-mono text-xs font-bold ${
                        isSelected ? 'text-blue-700' : 'text-slate-800'
                      }`}
                    >
                      {bom.code}
                    </span>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                      {bom.version}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    {bom.productName}
                  </h3>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100/80">
                    <span>{bom.materialCount} nguyên vật liệu</span>
                    <span>Hiệu lực: {bom.effectiveDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Chi tiết công thức BOM đã chọn */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-5">
          {/* Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                  {selectedBom.code}
                </span>
                <span className="font-mono text-xs font-semibold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                  Phiên bản {selectedBom.version}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Đang áp dụng
                </span>
              </div>

              <h2 className="text-base font-bold text-slate-900">
                {selectedBom.productName}
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                {selectedBom.description}
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs shrink-0"
            >
              <Pencil size={13} className="text-slate-500" />
              <span>Sửa công thức</span>
            </button>
          </div>

          {/* BOM Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">MÃ VẬT TƯ</th>
                  <th className="py-2.5 px-3 min-w-[200px]">TÊN NGUYÊN VẬT LIỆU</th>
                  <th className="py-2.5 px-3 text-center">ĐVT</th>
                  <th className="py-2.5 px-3 text-right">ĐỊNH MỨC GỐC / SP</th>
                  <th className="py-2.5 px-3 text-right">TỶ LỆ HAO HỤT</th>
                  <th className="py-2.5 px-3 text-right">TIÊU HAO CHUẨN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {selectedBom.items.map((mat) => (
                  <tr key={mat.id} className="hover:bg-blue-50/20 transition">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {mat.code}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {mat.name}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-600 font-medium whitespace-nowrap">
                      {mat.uom}
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                      {mat.baseQty}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-amber-600 whitespace-nowrap">
                      +{mat.scrapPercent}%
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {mat.standardQty} {mat.uom}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: Tạo mới định mức BOM (Ảnh 5 - Bên trái chuẩn) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl p-6 relative">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Sliders size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Tạo mới định mức BOM (3.2.2.8)
                </h3>
                <p className="text-xs text-slate-500">
                  Cấu hình chi tiết thành phần nguyên vật liệu
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveBom} className="space-y-4">
              {/* Product & Version Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Thành phẩm áp dụng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formProductName}
                    onChange={(e) => setFormProductName(e.target.value)}
                    placeholder="Vd: Nẹp nhôm chữ T mạ Anode"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Phiên bản BOM <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    placeholder="v1.0"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả / Ghi chú sản xuất
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Mô tả công thức, kỹ thuật ép đùn hoặc tiêu chuẩn bề mặt..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Materials Table Inside Modal */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    Danh sách nguyên vật liệu thành phần ({modalItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Thêm nguyên vật liệu</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                        <th className="py-2 px-2.5">MÃ</th>
                        <th className="py-2 px-2.5 min-w-[150px]">TÊN VẬT LIỆU</th>
                        <th className="py-2 px-2 text-center">ĐVT</th>
                        <th className="py-2 px-2 text-right">ĐỊNH MỨC</th>
                        <th className="py-2 px-2 text-right">HAO HỤT %</th>
                        <th className="py-2 px-2 text-right">TỔNG TIÊU HAO</th>
                        <th className="py-2 px-2 text-center">XÓA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {modalItems.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-2.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                            <input
                              type="text"
                              value={item.code}
                              onChange={(e) => {
                                const newItems = [...modalItems];
                                newItems[idx].code = e.target.value;
                                setModalItems(newItems);
                              }}
                              className="w-20 h-7 px-1.5 rounded border border-slate-200 font-mono text-xs"
                            />
                          </td>
                          <td className="py-2 px-2.5">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const newItems = [...modalItems];
                                newItems[idx].name = e.target.value;
                                setModalItems(newItems);
                              }}
                              className="w-full h-7 px-2 rounded border border-slate-200 text-xs"
                            />
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <input
                              type="text"
                              value={item.uom}
                              onChange={(e) => {
                                const newItems = [...modalItems];
                                newItems[idx].uom = e.target.value;
                                setModalItems(newItems);
                              }}
                              className="w-12 h-7 px-1 text-center rounded border border-slate-200 text-xs"
                            />
                          </td>
                          <td className="py-2 px-2 text-right whitespace-nowrap">
                            <input
                              type="number"
                              step="any"
                              value={item.baseQty}
                              onChange={(e) => {
                                const newItems = [...modalItems];
                                const b = Number(e.target.value);
                                newItems[idx].baseQty = b;
                                newItems[idx].totalQty =
                                  Math.round(b * (1 + newItems[idx].scrapPercent / 100) * 1000) /
                                  1000;
                                setModalItems(newItems);
                              }}
                              className="w-16 h-7 px-1 text-right rounded border border-slate-200 text-xs"
                            />
                          </td>
                          <td className="py-2 px-2 text-right whitespace-nowrap">
                            <input
                              type="number"
                              step="any"
                              value={item.scrapPercent}
                              onChange={(e) => {
                                const newItems = [...modalItems];
                                const s = Number(e.target.value);
                                newItems[idx].scrapPercent = s;
                                newItems[idx].totalQty =
                                  Math.round(newItems[idx].baseQty * (1 + s / 100) * 1000) / 1000;
                                setModalItems(newItems);
                              }}
                              className="w-12 h-7 px-1 text-right rounded border border-slate-200 text-xs text-amber-600 font-semibold"
                            />
                          </td>
                          <td className="py-2 px-2 text-right font-bold text-slate-800 whitespace-nowrap">
                            {item.totalQty}
                          </td>
                          <td className="py-2 px-2 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-rose-500 hover:text-rose-700 transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer shadow-xs"
                >
                  <Save size={14} />
                  <span>Lưu định mức BOM</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
