// src/features/roles/components/warehouse/screens/WarehouseOverviewScreen.tsx
// Màn hình 3.2.5.1: Bảng Tổng quan Nhập liệu Chứng từ Giấy & Quản lý Tồn kho (Desktop Data Entry)
// Tích hợp Phân quyền kho (Data Isolation), Cảnh báo Đỏ Tồn Thấp To Rõ Ràng & Bảng Hàng Hóa Cần Nhập Gấp

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  ClipboardList,
  ChevronDown,
  Plus,
  ArrowRight,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Building,
  ShieldCheck,
  AlertCircle,
  Repeat,
} from 'lucide-react';
import { warehouseService } from '../../../services/warehouseService';
import { WarehouseFacility } from '../../../types';

interface WarehouseOverviewScreenProps {
  onNavigate?: (screenId: string) => void;
}

export const WarehouseOverviewScreen: React.FC<WarehouseOverviewScreenProps> = ({
  onNavigate,
}) => {
  const [facilities, setFacilities] = useState<WarehouseFacility[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<{ fullName?: string; staffCode?: string; role?: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Tải danh sách kho được phân quyền và thông tin tài khoản người dùng
  useEffect(() => {
    // Đọc user đang đăng nhập
    if (typeof window !== 'undefined') {
      try {
        const u = localStorage.getItem('stockflow_user');
        if (u) setCurrentUser(JSON.parse(u));
      } catch (e) {
        console.warn('Error reading user:', e);
      }
    }

    // Tải kho phân quyền
    const loadFacilities = async () => {
      try {
        const permitted = await warehouseService.getPermittedWarehouses();
        setFacilities(permitted);
        if (permitted.length > 0) {
          const storedBranch = typeof window !== 'undefined' ? localStorage.getItem('stockflow_selected_branch') : null;
          const match = permitted.find(
            (f) =>
              f.code === storedBranch ||
              f.name === storedBranch ||
              (storedBranch && (storedBranch.includes(f.code) || storedBranch.includes(f.name)))
          );
          const initialCode = match ? `${match.code} • ${match.name}` : `${permitted[0].code} • ${permitted[0].name}`;
          setSelectedWarehouse(initialCode);
        }
      } catch (e) {
        console.error('Error loading permitted warehouses:', e);
      }
    };

    loadFacilities();

    // Lắng nghe cập nhật hàng hóa / tồn kho thời gian thực
    const handleGoodsUpdated = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener('stockflow_goods_updated', handleGoodsUpdated);
    return () => window.removeEventListener('stockflow_goods_updated', handleGoodsUpdated);
  }, []);

  const handleWarehouseChange = (val: string) => {
    setSelectedWarehouse(val);
    if (typeof window !== 'undefined') {
      const matched = facilities.find((f) => val.includes(f.code) || val.includes(f.name));
      if (matched) {
        localStorage.setItem('stockflow_selected_branch', matched.code);
      } else {
        localStorage.setItem('stockflow_selected_branch', val);
      }
    }
    showToast(`Đã chuyển làm việc tại: ${val}`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Tính toán KPI thực tế từ Danh mục Hàng hóa Master Data theo kho đang chọn
  const kpiData = useMemo(() => {
    if (!selectedWarehouse) {
      return { totalItems: 0, totalStock: 0, lowStockCount: 0, capacityRate: 71.4 };
    }
    return warehouseService.getWarehouseOverviewKpi(selectedWarehouse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouse, refreshTrigger]);

  // Danh sách các mặt hàng tồn thấp / dưới định mức an toàn tại kho này
  const lowStockItems = useMemo(() => {
    if (!selectedWarehouse) return [];
    return warehouseService.getLowStockItemsInWarehouse(selectedWarehouse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWarehouse, refreshTrigger]);

  const outOfStockCount = useMemo(() => lowStockItems.filter((i) => i.isOutOfStock).length, [lowStockItems]);
  const warningStockCount = useMemo(() => lowStockItems.filter((i) => !i.isOutOfStock).length, [lowStockItems]);

  const staffDisplayName = currentUser?.fullName || 'Phạm Văn D';
  const staffDisplayCode = currentUser?.staffCode || 'TP-WH004';

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wider mb-2 border border-blue-100">
            <span>VĂN PHÒNG QUẢN TRỊ TỒN KHO & NHẬP LIỆU</span>
            <span>•</span>
            <span className="font-normal text-blue-600">Đặc tả 3.2.5 (Desktop Data Entry)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Bảng Tổng quan Nhập liệu Chứng từ Giấy & Quản lý Tồn kho
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Nhân viên phụ trách: <strong className="text-slate-800 font-semibold">{staffDisplayName} ({staffDisplayCode})</strong> • Nhiệm vụ: Đối chiếu và nhập số liệu từ biên bản, phiếu giao hàng, hóa đơn giấy cứng vào hệ thống
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Warehouse Selector (Phân quyền dữ liệu kho) */}
          {facilities.length > 1 ? (
            <div className="relative">
              <select
                value={selectedWarehouse}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                className="h-9 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer appearance-none"
              >
                {facilities.map((fac) => (
                  <option key={fac.id} value={`${fac.code} • ${fac.name}`}>
                    {fac.code} • {fac.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          ) : facilities.length === 1 ? (
            <div className="h-9 px-3.5 rounded-lg border border-blue-200 bg-blue-50/70 text-xs font-bold text-blue-800 flex items-center gap-1.5 shadow-2xs">
              <Building size={14} className="text-blue-600" />
              <span>{facilities[0].code} • {facilities[0].name}</span>
              <span className="text-[10px] bg-blue-200/70 px-1.5 py-0.2 rounded text-blue-900 ml-1">Được giao</span>
            </div>
          ) : (
            <div className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-500 flex items-center">
              Đang tải danh sách kho...
            </div>
          )}

          {/* Button: Nhập chứng từ giấy mới */}
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('warehouse-inbound')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Nhập chứng từ giấy mới</span>
          </button>
        </div>
      </div>

      {/* ⚠️ CẢNH BÁO ĐỎ TỒN THẤP NỔI BẬT NẾU CÓ MẶT HÀNG GẦN HẾT HÀNG */}
      {lowStockItems.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 via-red-50 to-amber-50 rounded-xl border-2 border-rose-500 ring-4 ring-rose-500/10 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <AlertTriangle size={26} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded bg-rose-600 text-white font-black text-[11px] tracking-wide uppercase shadow-2xs animate-pulse">
                  🚨 CẢNH BÁO ĐỎ NGUY CẤP TỒN KHO
                </span>
                <h2 className="text-sm font-black text-rose-950">
                  KHO CÓ {lowStockItems.length} MẶT HÀNG CHẠM ĐÁY HOẶC ĐÃ HẾT HÀNG!
                </h2>
              </div>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                Tồn thực tế tại <strong className="underline font-bold text-rose-900">{selectedWarehouse}</strong>:{' '}
                {outOfStockCount > 0 && (
                  <strong className="text-rose-900 bg-rose-100 px-2 py-0.5 rounded mr-1">
                    🚨 {outOfStockCount} mặt hàng ĐÃ HẾT (Tồn = 0)
                  </strong>
                )}
                {warningStockCount > 0 && (
                  <strong className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                    ⚠️ {warningStockCount} mặt hàng DƯỚI ĐỊNH MỨC AN TOÀN
                  </strong>
                )}
                . Cần lập chứng từ Nhập kho bổ sung hoặc Lệnh điều chuyển từ kho khác gấp.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ArrowDownToLine size={14} />
              <span>Nhập hàng gấp</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-transfer')}
              className="px-3.5 py-2 rounded-lg border-2 border-rose-300 bg-white hover:bg-rose-50 text-rose-800 text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
            >
              <Repeat size={14} />
              <span>Điều chuyển kho</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Four KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Phiếu nhập chờ gõ máy */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-blue-200 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                PHIẾU NHẬP CHỜ GÕ MÁY
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <ArrowDownToLine size={16} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              3 <span className="text-xs font-semibold text-slate-500">chứng từ PO / LSX</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 truncate">PNK-2026-001 đang chờ</span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Nhập đối chiếu</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Card 2: Lệnh xuất chờ đối chiếu */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-blue-200 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                LỆNH XUẤT CHỜ ĐỐI CHIẾU
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <ArrowUpFromLine size={16} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              2 <span className="text-xs font-semibold text-slate-500">lệnh giao hàng</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 truncate">LXK-2026-088 ưu tiên gấp</span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-outbound')}
              className="font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Đối chiếu</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Card 3: Tỷ lệ lấp đầy kho & Cảnh báo tồn thấp */}
        <div className={`bg-white rounded-xl border shadow-2xs p-4 flex flex-col justify-between transition ${
          kpiData.lowStockCount > 0 ? 'border-rose-400 bg-rose-50/25' : 'border-slate-200/90 hover:border-blue-200'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                TỒN KHO & LẤP ĐẦY KHO
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers size={16} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              {kpiData.totalStock.toLocaleString('vi-VN')}{' '}
              <span className="text-xs font-semibold text-slate-500">SP lưu trữ ({kpiData.capacityRate}%)</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">{kpiData.totalItems} mặt hàng</span>
            {kpiData.lowStockCount > 0 ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 text-white font-extrabold text-xs shadow-xs animate-pulse">
                <AlertTriangle size={13} />
                {kpiData.lowStockCount} CẢNH BÁO ĐỎ TỒN THẤP
              </span>
            ) : (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <ShieldCheck size={12} />
                Tồn ổn định
              </span>
            )}
          </div>
        </div>

        {/* Card 4: BB kiểm kê & trả hàng */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between hover:border-blue-200 transition">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                BB KIỂM KÊ & TRẢ HÀNG
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <ClipboardList size={16} />
              </div>
            </div>
            <div className="text-xl font-extrabold text-slate-900">
              1 <span className="text-xs font-semibold text-slate-500">đợt kiểm kê đang mở</span>
            </div>
          </div>
          <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
            <span className="text-slate-500 truncate">Biên bản số 08/BBKK</span>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-audit')}
              className="font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <span>Nhập đếm</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ⚠️ BẢNG MẶT HÀNG TỒN THẤP CẦN XỬ LÝ GẤP TẠI KHO (NẾU CÓ) */}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-rose-300 shadow-2xs overflow-hidden animate-in fade-in">
          <div className="p-3.5 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
              <h3 className="text-xs font-extrabold text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-rose-600" />
                DANH SÁCH MẶT HÀNG TỒN THẤP / CẦN BỔ SUNG GẤP TẠI KHO ({lowStockItems.length})
              </h3>
            </div>
            <span className="text-[11px] font-extrabold text-rose-700 bg-white px-2.5 py-0.5 rounded border border-rose-300 shadow-2xs">
              Mức độ ưu tiên: KHẨN CẤP
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-center">STT</th>
                  <th className="py-2.5 px-3">MÃ SKU</th>
                  <th className="py-2.5 px-4">TÊN MẶT HÀNG</th>
                  <th className="py-2.5 px-3">ĐVT</th>
                  <th className="py-2.5 px-3 text-right">TỒN THỰC TẾ</th>
                  <th className="py-2.5 px-3 text-right">ĐỊNH MỨC AN TOÀN</th>
                  <th className="py-2.5 px-3 text-center">TÌNH TRẠNG</th>
                  <th className="py-2.5 px-3 text-center">HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {lowStockItems.map((entry, idx) => (
                  <tr
                    key={entry.item.id || entry.item.code}
                    className={`transition border-b border-slate-100 ${
                      entry.isOutOfStock
                        ? 'bg-rose-100/60 hover:bg-rose-100/90 border-l-4 border-l-rose-600 font-medium'
                        : 'bg-amber-50/50 hover:bg-amber-50/80 border-l-4 border-l-amber-500 font-medium'
                    }`}
                  >
                    <td className="py-3 px-3 text-center text-slate-500 font-mono">{idx + 1}</td>
                    <td className="py-3 px-3 font-mono font-bold text-rose-700">{entry.item.code}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{entry.item.name}</td>
                    <td className="py-3 px-3 text-slate-700 font-medium">{entry.item.uom}</td>
                    <td className="py-3 px-3 text-right font-mono font-black text-rose-700 text-sm">
                      {entry.actualStock.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-600 font-bold">
                      {entry.minSafeStock.toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {entry.isOutOfStock ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-rose-600 text-white font-black text-[11px] animate-pulse shadow-xs">
                          <AlertCircle size={13} /> 🚨 HẾT HÀNG (0)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100 border border-amber-300 text-amber-900 font-black text-[11px] shadow-2xs">
                          <AlertTriangle size={13} className="text-amber-600" /> ⚠️ TỒN THẤP ({entry.actualStock}/{entry.minSafeStock})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => onNavigate && onNavigate('warehouse-inbound')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        <Plus size={13} />
                        <span>Nhập hàng</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Bottom Two Split Columns: Inbound Worklist & Outbound Worklist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Card: Chứng từ Nhập kho cần gõ máy hôm nay */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Chứng từ Nhập kho cần gõ máy hôm nay
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Đối chiếu số liệu hóa đơn đỏ và phiếu giao hàng cứng
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Vào danh sách chứng từ</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Item 1 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                  PNK-2026-001
                </span>
                <span className="text-[11px] text-slate-400">18/10/2026 08:30</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Phiếu nhập kho số 123 / PO-NCC-088
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Công ty Cổ phần Nhựa Tiền Phong (NCC)
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  500 SP
                </span>
              </div>
            </div>

            {/* Item 2 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                  PNK-2026-002
                </span>
                <span className="text-[11px] text-slate-400">17/10/2026 15:40</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Biên bản bàn giao xưởng số 45/BBBG-ĐA
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Phân xưởng Bao bì Đông Anh
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  1000 SP
                </span>
              </div>
            </div>

            {/* Item 3 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-inbound')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                  PNK-2026-003
                </span>
                <span className="text-[11px] text-slate-400">18/10/2026 09:15</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Hóa đơn GTGT số 004812 / NCC Nhựa Hà Nội
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    TNHH Hóa Chất & Nhựa Thăng Long
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  450 SP
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Lệnh Xuất kho & Phiếu Giao hàng hôm nay */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">
                  Lệnh Xuất kho & Phiếu Giao hàng hôm nay
                </h2>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Lệnh xuất kho đang chờ thủ kho đóng gói và đối chiếu chứng từ
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('warehouse-outbound')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Vào danh sách lệnh xuất</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Outbound Item 1 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-outbound')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-100">
                  LXK-2026-088
                </span>
                <span className="text-[11px] text-slate-400">18/10/2026 10:15</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Phiếu xuất kho số 456 / HĐ-2026-88
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Công ty TNHH Nội Thất Minh Quân
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  190 SP
                </span>
              </div>
            </div>

            {/* Outbound Item 2 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-outbound')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-700 px-2 py-0.5 rounded bg-amber-50 border border-amber-100">
                  LXK-2026-089
                </span>
                <span className="text-[11px] text-slate-400">18/10/2026 14:00</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Phiếu xuất kho số 457 / Đơn DC-2026-092
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Đại lý Vật liệu Xây dựng Thăng Long
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  75 SP
                </span>
              </div>
            </div>

            {/* Outbound Item 3 */}
            <div
              onClick={() => onNavigate && onNavigate('warehouse-transfer')}
              className="p-3.5 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/20 transition cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-purple-700 px-2 py-0.5 rounded bg-purple-50 border border-purple-100">
                  CK-2026-001
                </span>
                <span className="text-[11px] text-slate-400">18/10/2026 16:30</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Phiếu điều chuyển kho số 14/CK-TP
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    WH-HN-01 (Kho Tổng Gia Lâm) → WH-HN-02 (Kho Đông Anh)
                  </p>
                </div>
                <span className="font-mono text-xs font-bold text-slate-800 px-2.5 py-1 rounded bg-slate-100">
                  230 SP
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
