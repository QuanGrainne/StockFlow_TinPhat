// src/features/roles/components/warehouse/screens/WarehouseTransferScreen.tsx
// Màn hình 3.2.5.6 & 3.2.5.7: Phiếu Điều chuyển Kho theo Giấy (List + Popup Modal)
// Tích hợp Phân quyền kho (Data Isolation) & Đồng bộ Trừ/Cộng tồn kho Master Data + Ghi Thẻ Kho

import React, { useState, useEffect, useMemo } from 'react';
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
  Plus,
  AlertTriangle,
  Building,
  Package,
  ShieldCheck,
} from 'lucide-react';
import { warehouseService } from '../../../services/warehouseService';
import { WarehouseFacility } from '../../../types';
import { GoodsItem } from '../../common/GoodsCatalogScreen';

interface TransferProfile {
  id: string;
  code: string;
  paperCode: string;
  fromWarehouse: string;
  toWarehouse: string;
  driverInfo: string;
  statusText: string;
  isCompleted?: boolean;
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
    isCompleted: false,
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

  // Danh sách kho phân quyền và toàn hệ thống
  const [permittedFacilities, setPermittedFacilities] = useState<WarehouseFacility[]>([]);
  const [allFacilities, setAllFacilities] = useState<WarehouseFacility[]>([]);
  const [catalogItems, setCatalogItems] = useState<GoodsItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Edit modal (Cập nhật số lượng thực chuyển)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TransferItem | null>(null);
  const [inputPaperCode, setInputPaperCode] = useState('Phiếu điều chuyển kho số 14/CK-TP');
  const [inputDate, setInputDate] = useState('2026-10-18');
  const [inputFromBin, setInputFromBin] = useState('Kệ A1-02');
  const [inputToBin, setInputToBin] = useState('Kệ C2-01 (Đông Anh)');
  const [inputActualQty, setInputActualQty] = useState<number>(150);
  const [inputNotes, setInputNotes] = useState<string>('');

  // Create new transfer modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPaperCode, setNewPaperCode] = useState('');
  const [newFromWh, setNewFromWh] = useState('');
  const [newToWh, setNewToWh] = useState('');
  const [newDriverInfo, setNewDriverInfo] = useState('');
  const [newSelectedSku, setNewSelectedSku] = useState('');
  const [newQty, setNewQty] = useState<number>(50);
  const [newNotes, setNewNotes] = useState('');

  // 1. Tải phân quyền kho và danh mục hàng hóa
  useEffect(() => {
    const loadData = async () => {
      try {
        const [myWhs, allWhs] = await Promise.all([
          warehouseService.getPermittedWarehouses(),
          warehouseService.getAllWarehouses(),
        ]);
        setPermittedFacilities(myWhs);
        setAllFacilities(allWhs);
        if (myWhs.length > 0) {
          setNewFromWh(`${myWhs[0].code} (${myWhs[0].name})`);
        }
        if (allWhs.length > 1) {
          setNewToWh(`${allWhs[1].code} (${allWhs[1].name})`);
        } else if (allWhs.length > 0) {
          setNewToWh(`${allWhs[0].code} (${allWhs[0].name})`);
        }
      } catch (e) {
        console.error('Error loading warehouse facilities for transfer:', e);
      }
    };

    loadData();
    setCatalogItems(warehouseService.getGoodsCatalog());

    const handleGoodsUpdated = () => {
      setCatalogItems(warehouseService.getGoodsCatalog());
      setRefreshTrigger((prev) => prev + 1);
    };
    window.addEventListener('stockflow_goods_updated', handleGoodsUpdated);
    return () => window.removeEventListener('stockflow_goods_updated', handleGoodsUpdated);
  }, []);

  const currentProfile = profiles.find((p) => p.id === selectedId) || profiles[0];

  const totalPaperQty = currentProfile.items.reduce((s, i) => s + i.paperQty, 0);
  const totalActualQty = currentProfile.items.reduce((s, i) => s + i.actualQty, 0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Tính tồn kho thực tế tại kho xuất cho mặt hàng đang chỉnh sửa
  const originStockForEditingItem = useMemo(() => {
    if (!editingItem) return 0;
    const prod = catalogItems.find(
      (p) => p.code?.toLowerCase() === editingItem.sku.toLowerCase() || p.id === editingItem.sku
    );
    if (!prod) return 999;
    return warehouseService.getItemStockInWarehouse(prod, currentProfile.fromWarehouse);
  }, [editingItem, catalogItems, currentProfile.fromWarehouse, refreshTrigger]);

  // Danh sách các mặt hàng thực chuyển vượt quá tồn thực tế tại kho xuất
  const overStockItems = useMemo(() => {
    if (!currentProfile) return [];
    return currentProfile.items.filter((item) => {
      const originProd = catalogItems.find(
        (p) => p.code?.toLowerCase() === item.sku.toLowerCase() || p.id === item.sku
      );
      const stockInOrigin = originProd
        ? warehouseService.getItemStockInWarehouse(originProd, currentProfile.fromWarehouse)
        : 0;
      return item.actualQty > stockInOrigin;
    });
  }, [currentProfile, catalogItems, refreshTrigger]);

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

    showToast(`Đã lưu số lượng thực chuyển ${editingItem.sku}: ${inputActualQty} ${editingItem.unit}`);
    setEditModalOpen(false);
  };

  // Thực thi Xác nhận Hoàn tất Điều chuyển
  const handleCompleteTransfer = () => {
    if (currentProfile.isCompleted) {
      showToast(`Phiếu điều chuyển ${currentProfile.code} đã hoàn tất trước đó!`);
      return;
    }

    if (overStockItems.length > 0) {
      const confirmed = window.confirm(
        `⚠️ CẢNH BÁO ĐỎ: Có ${overStockItems.length} mặt hàng điều chuyển vượt quá tồn thực tế tại ${currentProfile.fromWarehouse}!\n\nNếu tiếp tục, tồn kho sẽ bị ÂM. Bạn có chắc chắn muốn xuất kho không?`
      );
      if (!confirmed) return;
    }

    // Thực thi trừ tồn kho xuất và cộng tồn kho nhận + Ghi thẻ kho
    const success = warehouseService.executeStockTransfer({
      transferCode: currentProfile.code,
      paperCode: currentProfile.paperCode,
      fromWarehouse: currentProfile.fromWarehouse,
      toWarehouse: currentProfile.toWarehouse,
      driverInfo: currentProfile.driverInfo,
      items: currentProfile.items.map((it) => ({
        sku: it.sku,
        actualQty: it.actualQty,
        name: it.name,
      })),
    });

    if (success) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === currentProfile.id
            ? { ...p, statusText: 'Đã hoàn tất (Đã nhập kho đích)', isCompleted: true }
            : p
        )
      );
      showToast(
        `Thành công: Đã trừ tồn kho tại ${currentProfile.fromWarehouse} và nhập tồn kho tại ${currentProfile.toWarehouse}!`
      );
    } else {
      showToast(`Không thể đồng bộ hàng hóa Master Data. Vui lòng kiểm tra lại danh mục.`);
    }
  };

  // Xử lý tạo Phiếu điều chuyển mới
  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFromWh || !newToWh) {
      showToast('Vui lòng chọn Kho xuất và Kho nhận');
      return;
    }

    const selectedProd = catalogItems.find((p) => p.code === newSelectedSku);
    const itemName = selectedProd ? selectedProd.name : 'Vật tư điều chuyển nội bộ';
    const itemUnit = selectedProd ? selectedProd.uom : 'SP';

    const newId = `CK-${String(profiles.length + 1).padStart(2, '0')}`;
    const newCode = `CK-2026-${String(profiles.length + 1).padStart(3, '0')}`;

    const newTransfer: TransferProfile = {
      id: newId,
      code: newCode,
      paperCode: newPaperCode.trim() || `Phiếu điều chuyển số ${profiles.length + 14}/CK-TP`,
      fromWarehouse: newFromWh,
      toWarehouse: newToWh,
      driverInfo: newDriverInfo.trim() || 'Tài xế nội bộ Tin Phat (29H-668.99)',
      statusText: 'Đang vận chuyển (Đã ký xuất)',
      isCompleted: false,
      items: [
        {
          id: `TR-${Date.now()}`,
          sku: newSelectedSku || 'TP-SP01',
          name: itemName,
          unit: itemUnit,
          paperQty: Number(newQty),
          actualQty: Number(newQty),
          notes: newNotes || 'Điều chuyển cấp bách theo kế hoạch',
        },
      ],
    };

    setProfiles((prev) => [newTransfer, ...prev]);
    setSelectedId(newId);
    setCreateModalOpen(false);
    showToast(`Đã tạo thành công lệnh điều chuyển mới ${newCode}!`);
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
            Phiếu Điều chuyển Kho theo Giấy & Cập nhật Thẻ kho
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Kho xuất đi bắt buộc thuộc danh sách kho được phân quyền. Bấm xác nhận hoàn tất để tự động trừ tồn kho xuất, cộng tồn kho nhận và ghi Thẻ kho.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-teal-200 bg-teal-50 hover:bg-teal-100 text-xs font-bold text-teal-800 transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Tạo Phiếu Điều chuyển Mới</span>
          </button>

          <button
            type="button"
            onClick={handleCompleteTransfer}
            disabled={currentProfile.isCompleted}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition cursor-pointer shadow-xs whitespace-nowrap ${
              currentProfile.isCompleted
                ? 'bg-emerald-600 cursor-not-allowed opacity-90'
                : 'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            <CheckCircle2 size={14} />
            <span>{currentProfile.isCompleted ? 'Đã Hoàn tất Nhập kho' : 'Xác nhận Hoàn tất Điều chuyển'}</span>
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
            <span className="text-[11px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
              {permittedFacilities.length} kho được giao
            </span>
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
                      ? 'border-teal-500 bg-teal-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-700 px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                      {prof.code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        prof.isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
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
          {/* CẢNH BÁO ĐỎ TO NỔI BẬT NẾU ĐIỀU CHUYỂN VƯỢT TỒN KHO XUẤT */}
          {overStockItems.length > 0 && !currentProfile.isCompleted && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 via-red-50 to-rose-100 border-2 border-rose-500 ring-4 ring-rose-500/10 shadow-sm text-rose-950 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                  <AlertTriangle size={26} />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded bg-rose-600 text-white font-black text-[11px] uppercase tracking-wider shadow-2xs animate-pulse">
                      🚨 CẢNH BÁO ĐỎ: VƯỢT TỒN KHO XUẤT!
                    </span>
                    <h3 className="text-sm font-black text-rose-950">
                      PHÁT HIỆN {overStockItems.length} MẶT HÀNG VƯỢT QUÁ TỒN THỰC TẾ TẠI {currentProfile.fromWarehouse}!
                    </h3>
                  </div>
                  <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                    Mặt hàng cảnh báo:{' '}
                    <strong className="text-rose-900 underline font-bold">
                      {overStockItems.map((i) => `${i.sku} (Thực chuyển: ${i.actualQty} ${i.unit})`).join(', ')}
                    </strong>
                    . Vui lòng nhấp đúp vào dòng để hạ số lượng thực chuyển trước khi hoàn tất để tránh làm âm kho Master Data!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Thông báo Hoàn tất Nổi bật khi đã xác nhận điều chuyển */}
          {currentProfile.isCompleted && (
            <div className="p-4 rounded-xl bg-emerald-50 border-2 border-emerald-400 text-emerald-950 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-emerald-950 flex items-center gap-2">
                    <span>LỆNH ĐIỀU CHUYỂN ĐÃ XÁC NHẬN HOÀN TẤT THÀNH CÔNG!</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-bold">ĐÃ KHÓA</span>
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Hệ thống đã tự động trừ tồn kho tại <strong>{currentProfile.fromWarehouse}</strong>, tăng tồn kho tại <strong>{currentProfile.toWarehouse}</strong> và ghi nhận đầy đủ 2 bút toán Thẻ kho.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Header Info Banner */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-teal-600" />
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  LỆNH ĐIỀU CHUYỂN GIẤY: {currentProfile.paperCode}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {currentProfile.isCompleted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck size={12} />
                    Đã cập nhật Thẻ kho
                  </span>
                )}
                <span className="font-mono text-xs font-bold text-teal-700 px-2.5 py-0.5 rounded bg-teal-50 border border-teal-200">
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
                <span className="text-slate-400 block text-[11px]">KHO XUẤT ĐI (PHÂN QUYỀN):</span>
                <span className="font-semibold text-teal-800 truncate block">
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
                  CHI TIẾT HÀNG HÓA ĐIỀU CHUYỂN (BẢNG ĐỐI CHIẾU THỰC CHUYỂN)
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
                    <th className="py-3 px-3 text-center">CẢNH BÁO TỒN KHO</th>
                    <th className="py-3 px-3 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {currentProfile.items.map((item, idx) => {
                    const originProd = catalogItems.find(
                      (p) => p.code?.toLowerCase() === item.sku.toLowerCase() || p.id === item.sku
                    );
                    const stockInOrigin = originProd
                      ? warehouseService.getItemStockInWarehouse(originProd, currentProfile.fromWarehouse)
                      : 0;
                    const isOverStock = item.actualQty > stockInOrigin;
                    const isLowStock = stockInOrigin <= (originProd?.minSafeStock ?? 10);

                    return (
                      <tr
                        key={item.id}
                        onDoubleClick={() => !currentProfile.isCompleted && handleOpenEdit(item)}
                        className={`transition cursor-pointer group border-b border-slate-100 ${
                          isOverStock
                            ? 'bg-rose-100/60 hover:bg-rose-100/90 border-l-4 border-l-rose-600 font-medium'
                            : isLowStock
                            ? 'bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-l-amber-500'
                            : 'hover:bg-teal-50/30'
                        }`}
                      >
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-teal-700">
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
                        <td className="py-3 px-3 text-right font-mono font-black text-teal-700 text-sm">
                          {item.actualQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {isOverStock ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-600 text-white font-black text-xs animate-pulse shadow-xs">
                              <AlertTriangle size={13} />
                              🚨 VƯỢT TỒN ({item.actualQty} &gt; {stockInOrigin})
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100 border border-amber-300 text-amber-900 font-bold text-[11px] shadow-2xs">
                              ⚠️ Tồn kho thấp ({stockInOrigin})
                            </span>
                          ) : (
                            <span className="text-xs text-emerald-700 font-bold">
                              ✓ Khả dụng ({stockInOrigin})
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            disabled={currentProfile.isCompleted}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(item);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition ${
                              currentProfile.isCompleted
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700 cursor-pointer'
                            }`}
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
              <span>* Nhấp đúp vào dòng hoặc bấm nút Sửa để mở Popup cập nhật số lượng điều chuyển</span>
              <span className="font-semibold text-slate-700">
                Tổng chuyển: {totalActualQty.toLocaleString('vi-VN')} / {totalPaperQty.toLocaleString('vi-VN')} SP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Cập nhật Hàng Điều Chuyển (Popup Form) */}
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
                  Cập nhật Hàng Điều Chuyển (Đối chiếu Thực tế)
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
                    {editingItem.paperQty.toLocaleString('vi-VN')} {editingItem.unit}
                  </span>
                </div>
                <div className="flex items-center justify-between text-teal-800">
                  <span>Tồn thực tế tại kho xuất ({currentProfile.fromWarehouse}):</span>
                  <span className="font-mono font-extrabold text-teal-700 text-sm">
                    {originStockForEditingItem.toLocaleString('vi-VN')} {editingItem.unit}
                  </span>
                </div>
              </div>

              {/* CẢNH BÁO ĐỎ TO NỔI BẬT NẾU VƯỢT TỒN KHO */}
              {inputActualQty > originStockForEditingItem ? (
                <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-500 text-rose-950 shadow-sm flex items-start gap-3 animate-in fade-in">
                  <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold shrink-0 animate-pulse">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <strong className="block text-rose-950 font-extrabold text-xs uppercase tracking-wide">
                      CẢNH BÁO ĐỎ: SỐ LƯỢNG ĐIỀU CHUYỂN VƯỢT TỒN KHO XUẤT!
                    </strong>
                    <p className="text-[11px] text-rose-800 mt-1 leading-relaxed">
                      Kho xuất <strong>{currentProfile.fromWarehouse}</strong> chỉ còn <strong>{originStockForEditingItem} {editingItem.unit}</strong> khả dụng. Số lượng thực chuyển bạn nhập là <strong>{inputActualQty} {editingItem.unit}</strong> (Vượt quá <strong>{inputActualQty - originStockForEditingItem} {editingItem.unit}</strong>). Thao tác này sẽ khiến kho bị âm tồn kho!
                    </p>
                  </div>
                </div>
              ) : originStockForEditingItem <= 10 ? (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <span>
                    <strong>Lưu ý:</strong> Hàng tại kho xuất sắp hết (chỉ còn {originStockForEditingItem} {editingItem.unit}). Sau khi chuyển sẽ còn {originStockForEditingItem - inputActualQty} {editingItem.unit}.
                  </span>
                </div>
              ) : null}

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
                    Vị trí xuất đi
                  </label>
                  <input
                    type="text"
                    value={inputFromBin}
                    onChange={(e) => setInputFromBin(e.target.value)}
                    placeholder="Khu A - Tầng 1"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vị trí nhận đến
                  </label>
                  <input
                    type="text"
                    value={inputToBin}
                    onChange={(e) => setInputToBin(e.target.value)}
                    placeholder="Khu B - Kệ 02"
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú kiểm đếm
                </label>
                <input
                  type="text"
                  value={inputNotes}
                  onChange={(e) => setInputNotes(e.target.value)}
                  placeholder="Ghi chú về quy cách, niêm phong thùng..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-xs font-bold text-white cursor-pointer shadow-xs"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tạo Phiếu Điều Chuyển Mới */}
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
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-200 shrink-0">
                <Repeat size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Lập Lệnh Điều Chuyển Kho Mới
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kho xuất đi phải là kho bạn có quyền thao tác (Phân quyền kho)
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateTransfer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Số phiếu / Chứng từ giấy <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPaperCode}
                  onChange={(e) => setNewPaperCode(e.target.value)}
                  placeholder="VD: Phiếu điều chuyển số 18/CK-TP"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* 2 Cols: Kho xuất & Kho nhận */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kho xuất (Được phân quyền) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newFromWh}
                    onChange={(e) => setNewFromWh(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-teal-400 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {permittedFacilities.map((fac) => (
                      <option key={fac.id} value={`${fac.code} (${fac.name})`}>
                        {fac.code} - {fac.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kho nhận đến <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newToWh}
                    onChange={(e) => setNewToWh(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  >
                    {allFacilities.map((fac) => (
                      <option key={fac.id} value={`${fac.code} (${fac.name})`}>
                        {fac.code} - {fac.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lái xe */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thông tin Lái xe & Biển số
                </label>
                <input
                  type="text"
                  value={newDriverInfo}
                  onChange={(e) => setNewDriverInfo(e.target.value)}
                  placeholder="VD: Trần Văn Hùng (Xe 1.5T) (29C-552.18)"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Chọn mặt hàng từ Master Data */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chọn mặt hàng điều chuyển <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newSelectedSku}
                    onChange={(e) => setNewSelectedSku(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
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
                    Số lượng <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 font-bold text-teal-700 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ghi chú lệnh điều chuyển
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Ghi chú thêm về điều kiện vận chuyển..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
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
                  className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 font-bold text-white cursor-pointer shadow-xs"
                >
                  Tạo Lệnh Điều Chuyển
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
