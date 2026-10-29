// src/features/roles/components/warehouse/screens/WarehouseInboundScreen.tsx
// Màn hình 3.2.5.2 & 3.2.5.3: Nhập kho từ Chứng từ Giấy (List + Popup Modal)
// Tích hợp Phân quyền kho (Data Isolation) & Cập nhật Tồn kho Master Data + Ghi Thẻ Kho

import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Plus,
  Building,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { warehouseService } from '../../../services/warehouseService';
import { WarehouseFacility } from '../../../types';
import { GoodsItem } from '../../common/GoodsCatalogScreen';

interface InboundProfile {
  id: string;
  code: string;
  paperCode: string;
  sourceType: 'PO' | 'LSX';
  sourceCode: string;
  supplier: string;
  warehouse: string;
  totalQty: number;
  isLocked?: boolean;
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
    warehouse: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    totalQty: 500,
    isLocked: false,
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
    warehouse: 'WH-HN-02 (Kho Đông Anh)',
    totalQty: 1000,
    isLocked: false,
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
    warehouse: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    totalQty: 450,
    isLocked: false,
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

  // Phân quyền kho & Catalog
  const [permittedFacilities, setPermittedFacilities] = useState<WarehouseFacility[]>([]);
  const [catalogItems, setCatalogItems] = useState<GoodsItem[]>([]);

  // Edit item modal (Đối chiếu chứng từ)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InboundItem | null>(null);
  const [inputPaperCode, setInputPaperCode] = useState('Phiếu nhập kho số 123 / PO-NCC-088');
  const [inputDate, setInputDate] = useState('2026-10-18');
  const [inputBinLocation, setInputBinLocation] = useState('Khu A - Tầng 1');
  const [inputActualQty, setInputActualQty] = useState<number>(298);
  const [inputDefectiveQty, setInputDefectiveQty] = useState<number>(2);
  const [inputNotes, setInputNotes] = useState<string>('2 tấm nứt góc lúc dỡ hàng từ xe tải NCC');

  // Modal tạo chứng từ nhập kho giấy mới
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPaperCode, setNewPaperCode] = useState('');
  const [newSourceType, setNewSourceType] = useState<'PO' | 'LSX'>('PO');
  const [newSourceCode, setNewSourceCode] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [newWarehouse, setNewWarehouse] = useState('');
  const [newSelectedSku, setNewSelectedSku] = useState('');
  const [newPaperQty, setNewPaperQty] = useState<number>(100);

  useEffect(() => {
    const loadData = async () => {
      try {
        const whs = await warehouseService.getPermittedWarehouses();
        setPermittedFacilities(whs);
        if (whs.length > 0) {
          setNewWarehouse(`${whs[0].code} (${whs[0].name})`);
        }
      } catch (e) {
        console.error('Error loading permitted warehouses for inbound:', e);
      }
    };

    loadData();
    setCatalogItems(warehouseService.getGoodsCatalog());
  }, []);

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
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenEdit = (item: InboundItem) => {
    setEditingItem(item);
    setInputPaperCode(currentProfile.paperCode || 'Phiếu nhập kho số 123 / PO-NCC-088');
    setInputDate('2026-10-18');
    setInputBinLocation('Khu A - Tầng 1');
    setInputActualQty(item.actualQty);
    setInputDefectiveQty(item.defectiveQty);
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

  // Khóa & Cập nhật tồn kho Master Data + Ghi thẻ kho
  const handleLockInbound = () => {
    if (currentProfile.isLocked) {
      showToast(`Phiếu nhập kho ${currentProfile.code} đã được khóa và cập nhật tồn trước đó!`);
      return;
    }

    const success = warehouseService.executeInboundReceiptLock({
      receiptCode: currentProfile.code,
      paperCode: currentProfile.paperCode,
      warehouseCodeOrName: currentProfile.warehouse,
      supplier: currentProfile.supplier,
      items: currentProfile.items.map((it) => ({
        sku: it.sku,
        actualQty: it.actualQty,
        defectiveQty: it.defectiveQty,
        notes: it.notes,
      })),
    });

    if (success) {
      setProfiles((prev) =>
        prev.map((p) => (p.id === currentProfile.id ? { ...p, isLocked: true } : p))
      );
      showToast(
        `Thành công: Đã khóa và cập nhật tăng tồn kho tại ${currentProfile.warehouse} và ghi nhận Thẻ kho!`
      );
    } else {
      showToast(`Không thể cập nhật Master Data hàng hóa. Vui lòng kiểm tra lại.`);
    }
  };

  // Tạo chứng từ nhập kho mới
  const handleCreateInbound = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `PNK-${String(profiles.length + 1).padStart(2, '0')}`;
    const newCode = `PNK-2026-${String(profiles.length + 1).padStart(3, '0')}`;

    const selectedProd = catalogItems.find((p) => p.code === newSelectedSku);
    const itemName = selectedProd ? selectedProd.name : 'Vật tư nhập kho theo hóa đơn';
    const itemUnit = selectedProd ? selectedProd.uom : 'SP';

    const newProfile: InboundProfile = {
      id: newId,
      code: newCode,
      paperCode: newPaperCode.trim() || `Hóa đơn GTGT số 00${Date.now().toString().slice(-4)}`,
      sourceType: newSourceType,
      sourceCode: newSourceCode.trim() || `${newSourceType}-2026-${String(profiles.length + 1).padStart(3, '0')}`,
      supplier: newSupplier.trim() || 'Nhà cung cấp Vật tư Hà Nội',
      warehouse: newWarehouse,
      totalQty: Number(newPaperQty),
      isLocked: false,
      items: [
        {
          id: `ITEM-${Date.now()}`,
          sku: newSelectedSku || 'TP-SP01',
          name: itemName,
          unit: itemUnit,
          paperQty: Number(newPaperQty),
          actualQty: Number(newPaperQty),
          defectiveQty: 0,
          notes: 'Kiểm tra đạt chuẩn quy cách CO/CQ',
        },
      ],
    };

    setProfiles((prev) => [newProfile, ...prev]);
    setSelectedId(newId);
    setCreateModalOpen(false);
    showToast(`Đã tạo thành công chứng từ nhập kho mới ${newCode}!`);
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
            Nhập kho từ Chứng từ Giấy & Cập nhật Tồn kho
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đối chiếu số lượng hóa đơn, phiếu giao hàng với thực nhận. Bấm Khóa để tăng tồn kho thực tế và ghi Thẻ kho.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-xs font-bold text-blue-800 transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Nhập Chứng từ Mới</span>
          </button>

          <button
            type="button"
            onClick={handleLockInbound}
            disabled={currentProfile.isLocked}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition cursor-pointer shadow-xs whitespace-nowrap ${
              currentProfile.isLocked
                ? 'bg-slate-400 cursor-not-allowed opacity-90'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            <Lock size={14} />
            <span>{currentProfile.isLocked ? 'Đã Khóa & Hoàn Tất' : 'Khóa & Hoàn tất Nhập kho'}</span>
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
          <div className="text-xl font-extrabold font-mono mt-1">
            {diffQty === 0 ? (
              <span className="text-emerald-600">Khớp 100%</span>
            ) : diffQty < 0 ? (
              <span className="text-rose-600">{diffQty} SP</span>
            ) : (
              <span className="text-blue-600">+{diffQty} SP</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Danh sách chứng từ */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              CHỨNG TỪ NHẬP KHO ({filteredProfiles.length})
            </h2>
            <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              {permittedFacilities.length} kho phân quyền
            </span>
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã phiếu, PO, nhà cung cấp..."
              className="w-full h-8.5 pl-8 pr-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-2.5">
            {filteredProfiles.map((prof) => {
              const isSelected = prof.id === selectedId;
              return (
                <div
                  key={prof.id}
                  onClick={() => setSelectedId(prof.id)}
                  className={`p-3.5 rounded-lg border transition cursor-pointer space-y-1.5 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                      {prof.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
                        {prof.sourceCode}
                      </span>
                      {prof.isLocked && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Đã khóa
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 leading-snug">
                    {prof.paperCode}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {prof.supplier}
                  </p>

                  <div className="pt-1 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100/80">
                    <span className="truncate max-w-[170px]">{prof.warehouse}</span>
                    <span className="font-mono font-bold text-slate-700">{prof.totalQty.toLocaleString('vi-VN')} SP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Detailed Document Header & Read-only Table */}
        <div className="lg:col-span-8 space-y-4">
          {/* Thông báo Hoàn tất khi đã Khóa Nhập kho */}
          {currentProfile.isLocked && (
            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                    <span>CHỨNG TỪ ĐÃ KHÓA & TĂNG TỒN KHO THÀNH CÔNG!</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">ĐÃ CẬP NHẬT THẺ KHO</span>
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Số lượng thực nhận đã được cộng vào tồn kho Master Data tại <strong>{currentProfile.warehouse}</strong> và ghi nhận Thẻ kho "Nhập kho mua hàng".
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CẢNH BÁO ĐỎ: Hàng lỗi / hỏng nổi bật */}
          {totalDefectiveQty > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 via-red-50 to-rose-100 border-2 border-rose-500 ring-4 ring-rose-500/10 text-rose-950 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm animate-in fade-in">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs animate-pulse">
                  <AlertTriangle size={26} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-rose-600 text-white font-black text-[11px] uppercase tracking-wider shadow-2xs animate-pulse">
                      🚨 CẢNH BÁO ĐỎ: HÀNG LỖI / HỎNG QUY CÁCH
                    </span>
                    <h3 className="text-sm font-black text-rose-950">
                      PHÁT HIỆN {totalDefectiveQty} SẢN PHẨM HỎNG TRONG ĐỢT NHẬP NÀY!
                    </h3>
                  </div>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                    Hàng lỗi/hỏng đã được tự động cách ly riêng và <strong>không cộng vào tồn kho khả dụng</strong> để xuất bán. Đề nghị lập biên bản đổi trả hàng với Nhà cung cấp.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* CẢNH BÁO: Nhà cung cấp giao thiếu hàng so với chứng từ PO/hóa đơn */}
          {totalActualQty < totalPaperQty && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100 border-2 border-amber-500 ring-4 ring-amber-500/10 text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm animate-in fade-in">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <AlertCircle size={26} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-amber-600 text-white font-black text-[11px] uppercase tracking-wider shadow-2xs">
                      ⚠️ CẢNH BÁO: GIAO THIẾU {totalPaperQty - totalActualQty} SẢN PHẨM
                    </span>
                    <h3 className="text-sm font-black text-amber-950">
                      SỐ LƯỢNG THỰC NHẬN ({totalActualQty}) ÍT HƠN CHỨNG TỪ PO ({totalPaperQty})!
                    </h3>
                  </div>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Nhân viên kho cần xác nhận với người giao hàng, ghi chú vào biên bản giao nhận để bộ phận Thu mua / Kế toán đối trừ công nợ hoặc yêu cầu giao bù.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header Info Banner */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  HỒ SƠ CHỨNG TỪ: {currentProfile.paperCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {currentProfile.isLocked && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck size={12} />
                    Đã tăng tồn kho Master Data
                  </span>
                )}
                <span className="font-mono text-xs font-bold text-blue-700 px-2.5 py-0.5 rounded bg-blue-50 border border-blue-200">
                  {currentProfile.code}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">MÃ CHỨNG TỪ GIẤY:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.paperCode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">NGUỒN HÀNG:</span>
                <span className="font-mono font-bold text-slate-700 block">
                  {currentProfile.sourceCode} ({currentProfile.sourceType})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">NHÀ CUNG CẤP / XƯỞNG:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.supplier}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">KHO TIẾP NHẬN:</span>
                <span className="font-semibold text-blue-800 truncate block">
                  {currentProfile.warehouse}
                </span>
              </div>
            </div>
          </div>

          {/* Table: Chi tiết hàng hóa đối chiếu */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  CHI TIẾT MẶT HÀNG ĐỐI CHIẾU
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
                    <th className="py-3 px-3 text-center">SL HỎNG / LỖI</th>
                    <th className="py-3 px-4">GHI CHÚ KIỂM HÀNG</th>
                    <th className="py-3 px-3 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentProfile.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      onDoubleClick={() => !currentProfile.isLocked && handleOpenEdit(item)}
                      className={`transition cursor-pointer group border-b border-slate-100 ${
                        item.defectiveQty > 0
                          ? 'bg-rose-100/60 hover:bg-rose-100/90 border-l-4 border-l-rose-600 font-medium'
                          : item.actualQty < item.paperQty
                          ? 'bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-l-amber-500'
                          : 'hover:bg-blue-50/30'
                      }`}
                    >
                      <td className="py-3 px-3 text-center text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-700">
                        {item.sku}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {item.name}
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-medium">
                        {item.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        {item.paperQty.toLocaleString('vi-VN')}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                        <div className="font-black text-sm">{item.actualQty.toLocaleString('vi-VN')}</div>
                        {item.actualQty < item.paperQty && (
                          <span className="inline-block px-1.5 py-0.5 rounded bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-black mt-0.5">
                            ⚠️ Thiếu {item.paperQty - item.actualQty}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {item.defectiveQty > 0 ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-600 text-white font-black text-xs animate-pulse shadow-xs">
                            <AlertTriangle size={13} />
                            🚨 {item.defectiveQty} {item.unit} HỎNG
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono font-semibold">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        {item.notes || '—'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          disabled={currentProfile.isLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(item);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                            currentProfile.isLocked
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 cursor-pointer'
                          }`}
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
              <span>* Nhấp đúp vào dòng hoặc bấm nút Sửa để mở Popup cập nhật số lượng nhập</span>
              <span className="font-semibold text-slate-700">
                Tổng thực nhận: {totalActualQty.toLocaleString('vi-VN')} / {totalPaperQty.toLocaleString('vi-VN')} SP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Cập nhật Hàng Nhập kho (Popup Form) */}
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
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
                <Edit3 size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cập nhật Đối chiếu Nhập kho
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  SKU: <strong className="font-mono text-blue-700">{editingItem.sku}</strong> • Vị trí:{' '}
                  <strong className="font-mono text-slate-700">{inputBinLocation}</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Product Info Box */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/90 text-xs space-y-1.5">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  TÊN HÀNG HÓA NHẬP KHO:
                </div>
                <div className="text-sm font-bold text-slate-900">
                  {editingItem.name}
                </div>
                <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-slate-600">
                  <span>SL Theo chứng từ gốc:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {editingItem.paperQty.toLocaleString('vi-VN')} {editingItem.unit}
                  </span>
                </div>
              </div>

              {/* Field: Mã chứng từ giấy */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã chứng từ giấy đối chiếu <span className="text-rose-500">*</span>
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
                    className="w-full h-9 pl-7 pr-3 rounded-lg border border-blue-400 bg-white font-mono font-bold text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Row 2 cols: Ngày chứng từ & Số lượng thực nhận */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày trên chứng từ
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
              </div>

              {/* Row 2 cols: Số lượng lỗi & Vị trí tiếp nhận */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng hỏng / lỗi ({editingItem.unit})
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={inputDefectiveQty}
                    onChange={(e) => setInputDefectiveQty(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-amber-700 font-bold bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vị trí xếp dỡ
                  </label>
                  <input
                    type="text"
                    value={inputBinLocation}
                    onChange={(e) => setInputBinLocation(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-800 bg-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú đối chiếu / Biên bản hư hỏng
                </label>
                <textarea
                  rows={2}
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  placeholder="Ghi chú về tình trạng niêm phong, vỡ mép, thiếu hàng..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none bg-white"
                />
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
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white cursor-pointer shadow-xs"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nhập Chứng Từ Mới */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-md"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
                <Plus size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Nhập Chứng Từ Giấy Nhập Kho Mới
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kho tiếp nhận phải là kho bạn có quyền thao tác (Phân quyền kho)
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateInbound} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã chứng từ giấy / Hóa đơn đỏ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPaperCode}
                  onChange={(e) => setNewPaperCode(e.target.value)}
                  placeholder="VD: Hóa đơn GTGT số 004899"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* 2 Cols: Nguồn gốc & Mã Đơn/LSX */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nguồn nhập hàng
                  </label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as 'PO' | 'LSX')}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="PO">Đơn mua hàng (PO)</option>
                    <option value="LSX">Lệnh sản xuất (LSX)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã đơn tham chiếu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSourceCode}
                    onChange={(e) => setNewSourceCode(e.target.value)}
                    placeholder="VD: PO-2026-004"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* 2 Cols: Nhà cung cấp & Kho tiếp nhận */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nhà cung cấp / Phân xưởng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSupplier}
                    onChange={(e) => setNewSupplier(e.target.value)}
                    placeholder="VD: Công ty TNHH Nhựa Tiền Phong"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kho tiếp nhận (Phân quyền) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newWarehouse}
                    onChange={(e) => setNewWarehouse(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-blue-400 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {permittedFacilities.map((fac) => (
                      <option key={fac.id} value={`${fac.code} (${fac.name})`}>
                        {fac.code} - {fac.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Chọn mặt hàng từ Master Data */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mặt hàng nhập kho <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newSelectedSku}
                    onChange={(e) => setNewSelectedSku(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- Chọn mặt hàng từ kho --</option>
                    {catalogItems.map((prod) => (
                      <option key={prod.id || prod.code} value={prod.code}>
                        {prod.code} - {prod.name} ({prod.uom})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Số lượng chứng từ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newPaperQty}
                    onChange={(e) => setNewPaperQty(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-bold text-blue-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold text-white cursor-pointer shadow-xs"
                >
                  Lưu Chứng Từ Nhập Kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
