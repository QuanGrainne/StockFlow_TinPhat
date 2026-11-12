// src/features/roles/components/manager/screens/ManagerDashboard.tsx
// Màn hình Tổng quan tồn kho & Định mức an toàn (Manager Dashboard) theo giao diện AI Studio Ảnh 1

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Briefcase,
  Layers,
  FileCheck,
  Search,
  Filter,
  Warehouse,
  AlertTriangle,
  Sliders,
  Plus,
  CheckCircle2,
  X,
  Building2,
} from 'lucide-react';
import { managerService } from '../../../services/managerService';
import { ManagerInventoryProduct } from '../../../types';

interface ManagerDashboardProps {
  onNavigate: (screenId: string) => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<ManagerInventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modal Tạo Lệnh Sản Xuất Nhanh
  const [createOrderModalOpen, setCreateOrderModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ManagerInventoryProduct | null>(null);
  const [targetQty, setTargetQty] = useState(500);
  const [assignedWorkshop, setAssignedWorkshop] = useState('Xưởng Đùn Tấm 1 - Đông Anh');
  const [dueDate, setDueDate] = useState('25/10/2026');
  const [orderSuccess, setOrderSuccess] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await managerService.getInventory(
        search,
        categoryFilter,
        warehouseFilter,
        lowStockOnly
      );
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, categoryFilter, warehouseFilter, lowStockOnly]);

  const handleOpenCreateOrder = (product?: ManagerInventoryProduct) => {
    if (product) {
      setSelectedProduct(product);
    } else {
      setSelectedProduct(products[0] || null);
    }
    setTargetQty(500);
    setOrderSuccess(false);
    setCreateOrderModalOpen(true);
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    await managerService.createProductionPlan({
      orderCode: `LSX-2026-0${Math.floor(Math.random() * 90) + 10}`,
      productName: selectedProduct.name,
      bomCode: 'BOM-NANO-01 (v2.1)',
      status: 'Đang sản xuất',
      workshop: assignedWorkshop,
      manager: 'Hoàng Thị E (Quản đốc)',
      sourceWarehouse: 'Kho Đông Anh',
      dueDate,
      targetQty: Number(targetQty),
      materials: [
        { name: 'Hạt nhựa PVC SG5', needed: 'Cần: 1800 Kg', status: 'Đủ vật tư' },
        { name: 'Bột đá Canxi Cacbonat', needed: 'Cần: 2500 Kg', status: 'Đủ vật tư' },
      ],
    });

    setOrderSuccess(true);
    setTimeout(() => {
      setOrderSuccess(false);
      setCreateOrderModalOpen(false);
      onNavigate('manager-production');
    }, 1000);
  };

  const formatCurrency = (val: number | null) => {
    if (val === null || val === undefined) return '—';
    return val.toLocaleString('vi-VN') + ' đ';
  };

  const lowStockCount = products.filter((p) => p.safeStockStatus === 'LOW').length;

  return (
    <div className="space-y-6">
      {/* 1. 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Khoản phải thu (AR) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Khoản phải thu (AR)
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                $
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              543.000.000 đ
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Công nợ khách hàng</span>
            <span className="font-semibold text-emerald-600 px-1.5 py-0.5 rounded bg-emerald-50 text-[11px]">
              Trong hạn
            </span>
          </div>
        </div>

        {/* Card 2: Khoản phải trả (AP) */}
        <div
          onClick={() => onNavigate('suppliers')}
          className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between cursor-pointer hover:border-[#0071BA] hover:shadow-md transition group"
          title="Nhấn để xem chi tiết danh sách Nhà cung cấp & Công nợ"
        >
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500 group-hover:text-[#0071BA] transition">
                Khoản phải trả (AP)
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-[#0071BA] transition">
                <Briefcase size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 tracking-tight">
              605.000.000 đ
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Nợ nhà cung cấp</span>
            <span className="text-[#0071BA] font-semibold flex items-center gap-1 group-hover:underline">
              Xem NCC &rarr;
            </span>
          </div>
        </div>

        {/* Card 3: Giá trị tồn kho (MAC) */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Giá trị tồn kho (MAC)
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Layers size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 tracking-tight">
              717.530.000 đ
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Bình quân di động</span>
            <span className="font-semibold text-emerald-700 px-1.5 py-0.5 rounded bg-emerald-50 text-[11px]">
              Chuẩn VAS / IFRS
            </span>
          </div>
        </div>

        {/* Card 4: Yêu cầu chờ duyệt */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                Yêu cầu chờ duyệt
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <FileCheck size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">4</span>
              <span className="text-xs font-medium text-slate-600">cần xử lý</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Hạn mức & kiểm kê</span>
            <button
              type="button"
              onClick={() => onNavigate('manager-approvals')}
              className="font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
            >
              Mở hộp thư
            </button>
          </div>
        </div>
      </div>

      {/* 2. Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Danh mục tồn kho và định mức an toàn
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi số lượng tồn thực tế, giá vốn MAC và cảnh báo ngưỡng nhập
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('suppliers')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-xs font-semibold text-[#0071BA] transition cursor-pointer shadow-2xs"
            title="Xem danh sách hồ sơ Nhà cung cấp và quản lý công nợ"
          >
            <Building2 size={14} className="text-[#0071BA]" />
            <span>Nhà cung cấp</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('manager-bom')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <Sliders size={14} className="text-slate-500" />
            <span>Cấu hình BOM</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateOrder()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>+ Tạo lệnh sản xuất</span>
          </button>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã hoặc tên sản phẩm..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
          />
        </div>

        {/* Category Filter */}
        <div className="relative w-full md:w-52">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
          >
            <option value="ALL">Tất cả danh mục ({products.length})</option>
            <option value="Thành phẩm">Thành phẩm</option>
            <option value="Nguyên vật liệu">Nguyên vật liệu</option>
            <option value="Combo gói">Combo gói</option>
          </select>
        </div>

        {/* Warehouse Filter */}
        <div className="relative w-full md:w-52">
          <Warehouse size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white cursor-pointer"
          >
            <option value="ALL">Tất cả kho lưu trữ</option>
            <option value="Kho Tổng Gia Lâm">Kho Tổng Gia Lâm</option>
            <option value="Kho Đông Anh">Kho Đông Anh</option>
            <option value="Kho Hà Đông">Kho Hà Đông</option>
          </select>
        </div>

        {/* Alert Cần bổ sung button */}
        <button
          type="button"
          onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer shrink-0 ${
            lowStockOnly
              ? 'bg-rose-500 text-white border-rose-500 shadow-xs'
              : 'border-rose-200 bg-rose-50/60 text-rose-700 hover:bg-rose-100'
          }`}
        >
          <AlertTriangle size={13} />
          <span>Cần bổ sung ({lowStockCount})</span>
        </button>
      </div>

      {/* 4. Inventory DataTable */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">MÃ HÀNG</th>
                <th className="py-3 px-4 min-w-[220px]">TÊN MẶT HÀNG</th>
                <th className="py-3 px-4 text-center">PHÂN LOẠI</th>
                <th className="py-3 px-4 text-center">ĐVT</th>
                <th className="py-3 px-4 text-right">TỒN THỰC TẾ</th>
                <th className="py-3 px-4 text-right">GIÁ BÁN NET</th>
                <th className="py-3 px-4 text-right">GIÁ VỐN MAC</th>
                <th className="py-3 px-4 text-center">ĐỊNH MỨC AN TOÀN</th>
                <th className="py-3 px-4 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {products.map((item) => {
                const isLow = item.safeStockStatus === 'LOW';

                return (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition">
                    {/* Mã hàng */}
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {item.code}
                    </td>

                    {/* Tên mặt hàng & vị trí kho */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {item.locationDetail}
                      </div>
                    </td>

                    {/* Phân loại badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.category === 'Thành phẩm' && (
                        <span className="px-2.5 py-0.5 rounded-[4px] bg-blue-50 text-blue-700 font-semibold text-[11px] border border-blue-100">
                          Thành phẩm
                        </span>
                      )}
                      {item.category === 'Nguyên vật liệu' && (
                        <span className="px-2.5 py-0.5 rounded-[4px] bg-amber-50 text-amber-700 font-semibold text-[11px] border border-amber-100">
                          Nguyên vật liệu
                        </span>
                      )}
                      {item.category === 'Combo gói' && (
                        <span className="px-2.5 py-0.5 rounded-[4px] bg-purple-50 text-purple-700 font-semibold text-[11px] border border-purple-100">
                          Combo gói
                        </span>
                      )}
                    </td>

                    {/* ĐVT */}
                    <td className="py-3.5 px-4 text-center font-medium text-slate-600 whitespace-nowrap">
                      {item.uom}
                    </td>

                    {/* Tồn thực tế */}
                    <td className="py-3.5 px-4 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {item.actualStock.toLocaleString('vi-VN')}
                    </td>

                    {/* Giá bán NET */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-600 whitespace-nowrap">
                      {formatCurrency(item.netPrice)}
                    </td>

                    {/* Giá vốn MAC */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
                      {formatCurrency(item.macCost)}
                    </td>

                    {/* Định mức an toàn badge */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-[11px] font-semibold">
                          <AlertTriangle size={11} />
                          <span>{item.thresholdText}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold">
                          <CheckCircle2 size={11} />
                          <span>{item.thresholdText}</span>
                        </span>
                      )}
                    </td>

                    {/* Thao tác button */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.category === 'Thành phẩm' ? (
                        <button
                          type="button"
                          onClick={() => handleOpenCreateOrder(item)}
                          className="px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition cursor-pointer"
                        >
                          Tạo lệnh sản xuất
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onNavigate('manager-bom')}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold text-xs transition cursor-pointer"
                        >
                          Xem định mức
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Tạo lệnh sản xuất mới (Màn hình 3.2.2.5 • Tính toán nhu cầu vật tư) */}
      {createOrderModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setCreateOrderModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Plus size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Tạo lệnh sản xuất mới</h3>
                <p className="text-xs text-slate-500">Màn hình 3.2.2.5 • Tính toán nhu cầu vật tư</p>
              </div>
            </div>

            {orderSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
                <p className="text-sm font-bold text-slate-800">Tạo lệnh sản xuất thành công!</p>
              </div>
            ) : (
              <form onSubmit={handleCreateOrderSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chọn thành phẩm & Công thức BOM <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedProduct.name}
                    onChange={(e) => {
                      const found = products.find((p) => p.name === e.target.value);
                      if (found) setSelectedProduct(found);
                    }}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Tấm ốp Nano PVC vân đá 9mm">
                      Tấm ốp Nano PVC vân đá 9mm — BOM-NANO-01 (v2.1)
                    </option>
                    <option value="Phào chỉ cổ trần PU dát vàng 8cm">
                      Phào chỉ cổ trần PU dát vàng 8cm — BOM-PHAO-02 (v1.4)
                    </option>
                    <option value="Nẹp nhôm chữ T mạ Anode">
                      Nẹp nhôm chữ T mạ Anode — BOM-NEP-03 (v1.0)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Số lượng sản xuất <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={targetQty}
                      onChange={(e) => setTargetQty(Number(e.target.value))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phân xưởng gia công <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={assignedWorkshop}
                      onChange={(e) => setAssignedWorkshop(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="Xưởng Đùn Tấm 1 - Đông Anh">Xưởng Đùn Tấm 1 - Đông Anh</option>
                      <option value="Xưởng Đùn Tấm 2 - Đông Anh">Xưởng Đùn Tấm 2 - Đông Anh</option>
                      <option value="Xưởng Phào PU - Gia Lâm">Xưởng Phào PU - Gia Lâm</option>
                      <option value="Xưởng Đột dập CNC - Gia Lâm">Xưởng Đột dập CNC - Gia Lâm</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hạn hoàn thành <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      placeholder="30/10/2026"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kho cấp vật tư <span className="text-rose-500">*</span>
                    </label>
                    <select
                      defaultValue="Kho Đông Anh"
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="Kho Đông Anh">Kho Đông Anh</option>
                      <option value="Kho Tổng Gia Lâm">Kho Tổng Gia Lâm</option>
                      <option value="Kho Hà Đông">Kho Hà Đông</option>
                    </select>
                  </div>
                </div>

                {/* Dự toán vật tư tiêu hao */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="text-xs font-semibold text-slate-600">
                    Dự toán vật tư tiêu hao ({targetQty} sản phẩm):
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Hạt nhựa PVC nguyên sinh SG5</span>
                      <span className="font-bold text-blue-700">{Math.round(targetQty * 3.28).toLocaleString('vi-VN')} Kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Bột đá siêu mịn Canxi Cacbonat</span>
                      <span className="font-bold text-blue-700">{Math.round(targetQty * 4.6).toLocaleString('vi-VN')} Kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Màng Film PVC vân gỗ/đá</span>
                      <span className="font-bold text-blue-700">{Math.round(targetQty * 1.29).toLocaleString('vi-VN')} m²</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Keo dán PUR nóng chảy</span>
                      <span className="font-bold text-blue-700">{Math.round(targetQty * 66.3).toLocaleString('vi-VN')} g</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCreateOrderModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white cursor-pointer shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Tạo lệnh sản xuất</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
