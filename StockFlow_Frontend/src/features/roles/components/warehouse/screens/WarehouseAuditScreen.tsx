// src/features/roles/components/warehouse/screens/WarehouseAuditScreen.tsx
// Màn hình 3.2.5.9 & 3.2.5.10: Nhập Biên bản Kiểm kê Giấy (List + Popup Modal)
// Tích hợp Phân quyền kho (Data Isolation) & Cân chỉnh Tồn kho Master Data + Ghi Thẻ Kho

import React, { useState, useEffect, useMemo } from 'react';
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
  Plus,
  Building,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { warehouseService } from '../../../services/warehouseService';
import { WarehouseFacility } from '../../../types';
import { GoodsItem } from '../../common/GoodsCatalogScreen';

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
  isCompleted?: boolean;
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
    isCompleted: false,
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

  // Phân quyền kho & Master Data hàng hóa
  const [permittedFacilities, setPermittedFacilities] = useState<WarehouseFacility[]>([]);
  const [catalogItems, setCatalogItems] = useState<GoodsItem[]>([]);

  // Edit item modal (Khớp 100% Đặc tả)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AuditItem | null>(null);
  const [inputPaperCode, setInputPaperCode] = useState('Biên bản kiểm kê số 08/BBKK-ĐA');
  const [inputDate, setInputDate] = useState('2026-10-17');
  const [inputBinLocation, setInputBinLocation] = useState('Khu A - Tầng 1');
  const [inputActualQty, setInputActualQty] = useState<number>(848);
  const [inputExplanation, setInputExplanation] = useState<string>('2 tấm hỏng góc lúc vận chuyển, đề nghị xuất huỷ');

  // Modal tạo đợt kiểm kê mới
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newAuditName, setNewAuditName] = useState('');
  const [newPaperCode, setNewPaperCode] = useState('');
  const [newWarehouseCode, setNewWarehouseCode] = useState('');
  const [newZone, setNewZone] = useState('ZONE_A (Khu vực Lưu trữ)');
  const [newAuditor, setNewAuditor] = useState('Nguyễn Văn Tuấn (Thủ kho phụ trách)');

  useEffect(() => {
    const loadData = async () => {
      try {
        const whs = await warehouseService.getPermittedWarehouses();
        setPermittedFacilities(whs);
        if (whs.length > 0) {
          setNewWarehouseCode(whs[0].code);
        }
      } catch (e) {
        console.error('Error loading permitted warehouses for audit:', e);
      }
    };

    loadData();
    const goods = warehouseService.getGoodsCatalog();
    setCatalogItems(goods);

    // Đồng bộ tồn sổ sách từ Catalog vào đợt kiểm kê nếu có SKU tương ứng
    if (goods && goods.length > 0) {
      setProfiles((prev) =>
        prev.map((prof) => ({
          ...prof,
          items: prof.items.map((it) => {
            const foundProd = goods.find(
              (p) => p.code?.toLowerCase() === it.sku.toLowerCase() || p.id === it.sku
            );
            if (foundProd) {
              const realStock = warehouseService.getItemStockInWarehouse(foundProd, prof.warehouseCode);
              if (realStock > 0) {
                return { ...it, bookQty: realStock };
              }
            }
            return it;
          }),
        }))
      );
    }
  }, []);

  const currentProfile = profiles.find((p) => p.id === selectedId) || profiles[0];

  const totalBookQty = currentProfile.items.reduce((s, i) => s + i.bookQty, 0);
  const totalActualQty = currentProfile.items.reduce((s, i) => s + i.actualQty, 0);
  const diffSkus = currentProfile.items.filter((i) => i.actualQty !== i.bookQty).length;

  const shortageItems = useMemo(() => currentProfile.items.filter((i) => i.actualQty < i.bookQty), [currentProfile]);
  const surplusItems = useMemo(() => currentProfile.items.filter((i) => i.actualQty > i.bookQty), [currentProfile]);
  const totalShortageQty = useMemo(() => shortageItems.reduce((acc: number, i: AuditItem) => acc + (i.bookQty - i.actualQty), 0), [shortageItems]);
  const totalSurplusQty = useMemo(() => surplusItems.reduce((acc: number, i: AuditItem) => acc + (i.actualQty - i.bookQty), 0), [surplusItems]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenEdit = (item: AuditItem) => {
    setEditingItem(item);
    setInputPaperCode(currentProfile.paperCode || 'Biên bản kiểm kê số 08/BBKK-ĐA');
    setInputDate(currentProfile.auditDate || '2026-10-17');
    setInputBinLocation('Khu A - Tầng 1');
    setInputActualQty(item.actualQty);
    setInputExplanation(item.explanation || '');
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

    showToast(`Đã lưu kết quả kiểm kê đếm ${editingItem.sku}: ${inputActualQty} ${editingItem.unit}!`);
    setEditModalOpen(false);
  };

  // Trình duyệt lệch kho tới Quản lý
  const handleSubmitAudit = () => {
    showToast(`Đã gửi trình duyệt biên bản lệch kho ${currentProfile.code} tới Trưởng kho & Ban Quản lý!`);
  };

  // Cân chỉnh Tồn kho thực tế vào Thẻ kho & Danh mục Master Data
  const handleSyncInventoryAdjustment = () => {
    if (currentProfile.isCompleted) {
      showToast(`Đợt kiểm kê ${currentProfile.code} đã hoàn tất cân chỉnh trước đó!`);
      return;
    }

    const success = warehouseService.executeAuditAdjustment({
      auditCode: currentProfile.code,
      paperCode: currentProfile.paperCode,
      warehouseCodeOrName: currentProfile.warehouseCode,
      items: currentProfile.items.map((it) => ({
        sku: it.sku,
        bookQty: it.bookQty,
        actualQty: it.actualQty,
        explanation: it.explanation,
      })),
    });

    if (success) {
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === currentProfile.id
            ? { ...p, statusText: 'Đã hoàn tất & Cân chỉnh tồn kho', isCompleted: true }
            : p
        )
      );
      showToast(
        `Thành công: Đã cân chỉnh tồn kho tại ${currentProfile.warehouseCode} và ghi nhận Thẻ kho cho các SKU chênh lệch!`
      );
    } else {
      showToast(`Không thể cập nhật danh mục tồn kho. Vui lòng thử lại.`);
    }
  };

  // Xử lý tạo đợt kiểm kê mới
  const handleCreateAudit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `KK-${String(profiles.length + 1).padStart(2, '0')}`;
    const newCode = `KK-2026-${String(profiles.length + 1).padStart(3, '0')}`;

    // Lấy 3 sản phẩm mẫu từ kho được chọn
    const sampleItems = catalogItems.slice(0, 3).map((prod, idx) => {
      const stock = warehouseService.getItemStockInWarehouse(prod, newWarehouseCode);
      return {
        id: `AUD-${Date.now()}-${idx}`,
        sku: prod.code,
        name: prod.name,
        unit: prod.uom,
        bookQty: stock > 0 ? stock : 100,
        actualQty: stock > 0 ? stock : 100,
        explanation: 'Khớp 100% với số lượng kiểm đếm',
      };
    });

    const newProfile: AuditProfile = {
      id: newId,
      code: newCode,
      paperCode: newPaperCode.trim() || `Biên bản kiểm kê số ${profiles.length + 9}/BBKK`,
      auditName: newAuditName.trim() || `Kiểm kê đột xuất ${newWarehouseCode}`,
      auditDate: new Date().toISOString().split('T')[0],
      auditZone: newZone,
      leadAuditor: newAuditor,
      warehouseCode: newWarehouseCode || 'WH-HN-01',
      statusText: 'Đang nhập số liệu kiểm kê từ phiếu giấy',
      isCompleted: false,
      items: sampleItems.length > 0 ? sampleItems : INITIAL_AUDITS[0].items,
    };

    setProfiles((prev) => [newProfile, ...prev]);
    setSelectedId(newId);
    setCreateModalOpen(false);
    showToast(`Đã tạo thành công đợt kiểm kê mới ${newCode}!`);
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
            Nhập Biên bản Kiểm kê Giấy & Cân chỉnh Tồn kho
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đối chiếu số liệu kiểm đếm thực tế với Tồn sổ sách hệ thống. Cân chỉnh tự động ghi nhận biến động Thẻ kho.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-xs font-bold text-purple-800 transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Tạo Đợt Kiểm kê Mới</span>
          </button>

          <button
            type="button"
            onClick={handleSyncInventoryAdjustment}
            disabled={currentProfile.isCompleted}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition cursor-pointer shadow-xs whitespace-nowrap ${
              currentProfile.isCompleted
                ? 'bg-emerald-600 cursor-not-allowed opacity-90'
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            <Sliders size={14} />
            <span>{currentProfile.isCompleted ? 'Đã Cân chỉnh Tồn kho' : 'Cân chỉnh Tồn kho Hệ thống'}</span>
          </button>

          <button
            type="button"
            onClick={handleSubmitAudit}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <Send size={14} className="text-purple-600" />
            <span>Gửi Trình duyệt</span>
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

      {/* ⚠️ CẢNH BÁO ĐỎ NỔI BẬT NẾU CÓ CHÊNH LỆCH KIỂM KÊ */}
      {diffSkus > 0 && !currentProfile.isCompleted && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 rounded-xl border-2 border-rose-500 ring-4 ring-rose-500/10 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <AlertTriangle size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-rose-600 text-white font-black text-[11px] tracking-wide uppercase shadow-2xs animate-pulse">
                  🚨 CẢNH BÁO ĐỎ LỆCH TỒN SỔ SÁCH
                </span>
                <h2 className="text-sm font-black text-rose-950">
                  PHÁT HIỆN {diffSkus} MẶT HÀNG LỆCH KHO TẠI {currentProfile.warehouseCode}!
                </h2>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                Chi tiết:{' '}
                {shortageItems.length > 0 && (
                  <strong className="text-rose-900 bg-rose-100 px-2 py-0.5 rounded mr-1">
                    🚨 THIẾU {shortageItems.length} SKU (-{totalShortageQty} SP thất thoát/chưa ghi nhận)
                  </strong>
                )}
                {surplusItems.length > 0 && (
                  <strong className="text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                    ⚠️ THỪA {surplusItems.length} SKU (+{totalSurplusQty} SP dôi dư)
                  </strong>
                )}
                . Vui lòng kiểm tra biên bản giải trình và bấm <strong>"Cân chỉnh Tồn kho Hệ thống"</strong> để đồng bộ Master Data và sinh Thẻ kho.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncInventoryAdjustment}
            className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-sm shrink-0 cursor-pointer flex items-center gap-1.5 whitespace-nowrap animate-pulse"
          >
            <Sliders size={15} />
            <span>Cân chỉnh tồn kho ngay</span>
          </button>
        </div>
      )}

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

        <div className={`rounded-xl border-2 shadow-2xs p-4 transition ${
          diffSkus > 0 ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-300/40' : 'bg-white border-slate-200/90'
        }`}>
          <div className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
            diffSkus > 0 ? 'text-rose-700' : 'text-slate-500'
          }`}>
            {diffSkus > 0 && <AlertTriangle size={14} className="animate-pulse text-rose-600" />}
            SỐ MẶT HÀNG LỆCH
          </div>
          <div className="text-2xl font-black text-rose-600 font-mono mt-1 flex items-baseline gap-1.5">
            <span>{diffSkus}</span>
            <span className="text-xs font-bold text-rose-700">SKU</span>
            {diffSkus > 0 && (
              <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded font-black uppercase animate-pulse ml-auto">
                LỆCH KHO
              </span>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            TRẠNG THÁI CÂN CHỈNH
          </div>
          <div className="text-sm font-extrabold text-emerald-600 mt-2 flex items-center gap-1">
            {currentProfile.isCompleted ? (
              <>
                <ShieldCheck size={16} />
                <span>Đã ghi nhận Thẻ kho</span>
              </>
            ) : (
              <span className="text-amber-600">Chờ xác nhận cân chỉnh</span>
            )}
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
            <span className="text-[11px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
              {permittedFacilities.length} kho phân quyền
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
                      ? 'border-purple-500 bg-purple-50/40 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-700 px-2 py-0.5 rounded bg-purple-50 border border-purple-200">
                      {prof.code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        prof.isCompleted
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-purple-50 text-purple-800 border-purple-200'
                      }`}
                    >
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
                    <span className="font-semibold text-slate-600">{prof.warehouseCode}</span>
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
              <div className="flex items-center gap-2">
                {currentProfile.isCompleted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <ShieldCheck size={12} />
                    Đã cân chỉnh Master Data
                  </span>
                )}
                <span className="font-mono text-xs font-bold text-purple-700 px-2.5 py-0.5 rounded bg-purple-50 border border-purple-200">
                  {currentProfile.code}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">MÃ BIÊN BẢN GIẤY:</span>
                <span className="font-semibold text-slate-800 truncate block">
                  {currentProfile.paperCode}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">KHO KIỂM KÊ (PHÂN QUYỀN):</span>
                <span className="font-mono font-bold text-purple-800 block">
                  {currentProfile.warehouseCode}
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
                  CHI TIẾT KIỂM KÊ HÀNG HÓA (ĐỐI CHIẾU SỔ SÁCH VÀ THỰC ĐẾM)
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
                    <th className="py-3 px-3 text-center">CHÊNH LỆCH ĐỐI CHIẾU</th>
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
                        onDoubleClick={() => !currentProfile.isCompleted && handleOpenEdit(item)}
                        className={`transition cursor-pointer group border-b border-slate-100 ${
                          diff < 0
                            ? 'bg-rose-100/60 hover:bg-rose-100/90 border-l-4 border-l-rose-600 font-medium'
                            : diff > 0
                            ? 'bg-blue-50/60 hover:bg-blue-50/90 border-l-4 border-l-blue-500 font-medium'
                            : 'hover:bg-purple-50/30'
                        }`}
                      >
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-purple-700">
                          {item.sku}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                          {item.bookQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-purple-700 text-sm">
                          {item.actualQty.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-bold">
                          {diff === 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-300">
                              ✓ Khớp 100%
                            </span>
                          ) : diff < 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-600 text-white font-black text-xs shadow-xs animate-pulse">
                              <AlertTriangle size={13} />
                              🚨 THIẾU {Math.abs(diff)} {item.unit}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-600 text-white font-black text-xs shadow-xs">
                              + THỪA {diff} {item.unit}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-700 text-[11px] font-medium">
                          {item.explanation || '—'}
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
                                : 'bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 cursor-pointer'
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
              <span>* Nhấp đúp vào dòng hoặc bấm nút Sửa để mở Popup cập nhật số lượng kiểm kê</span>
              <span className="font-semibold text-slate-700">
                {currentProfile.items.length} mặt hàng
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: Cập nhật Số liệu Kiểm kê Giấy (Popup Form) */}
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
                  Cập nhật Số liệu Kiểm kê Giấy (Đối chiếu Thực tế)
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
                  <span>Tồn sổ sách hệ thống: <strong className="font-mono text-slate-900">{editingItem.bookQty.toLocaleString('vi-VN')} {editingItem.unit}</strong></span>
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
                    placeholder="VD: Hao hụt tự nhiên, gãy vỡ khi xếp kệ, thừa do chưa nhập phiếu..."
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

      {/* MODAL: Tạo Đợt Kiểm Kê Mới */}
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
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200 shrink-0">
                <Building size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Tạo Đợt Kiểm Kê Kho Mới
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn kho bạn được phân quyền để đối chiếu và kiểm đếm thực tế
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateAudit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên đợt kiểm kê <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAuditName}
                  onChange={(e) => setNewAuditName(e.target.value)}
                  placeholder="VD: Kiểm kê đột xuất định kỳ cuối tháng"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mã biên bản giấy (Ref Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPaperCode}
                  onChange={(e) => setNewPaperCode(e.target.value)}
                  placeholder="VD: Biên bản số 12/BBKK-TP"
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              {/* 2 Cols: Kho & Khu vực */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kho kiểm kê (Được phân quyền) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newWarehouseCode}
                    onChange={(e) => setNewWarehouseCode(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-purple-400 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  >
                    {permittedFacilities.map((fac) => (
                      <option key={fac.id} value={fac.code}>
                        {fac.code} - {fac.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Khu vực kiểm kê
                  </label>
                  <input
                    type="text"
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tổ trưởng / Người chịu trách nhiệm kiểm đếm
                </label>
                <input
                  type="text"
                  value={newAuditor}
                  onChange={(e) => setNewAuditor(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
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
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 font-bold text-white cursor-pointer shadow-xs"
                >
                  Tạo Đợt Kiểm Kê
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
