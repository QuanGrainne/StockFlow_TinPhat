// src/features/roles/components/manager/screens/ProductionOrdersScreen.tsx
// Màn hình Quản lý lệnh sản xuất theo giao diện AI Studio Ảnh 3

import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sliders,
  Plus,
  Calendar,
  Warehouse,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { managerService } from '../../../services/managerService';
import { ManagerProductionPlan } from '../../../types';

interface ProductionOrdersScreenProps {
  onNavigate?: (screenId: string) => void;
}

export const ProductionOrdersScreen: React.FC<ProductionOrdersScreenProps> = ({
  onNavigate,
}) => {
  const [orders, setOrders] = useState<ManagerProductionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Tạo Lệnh Sản Xuất
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [productName, setProductName] = useState('Tấm ốp Nano PVC vân đá 9mm');
  const [bomCode, setBomCode] = useState('BOM-NANO-01 (v2.1)');
  const [workshop, setWorkshop] = useState('Xưởng Đùn Tấm 1 - Đông Anh');
  const [targetQty, setTargetQty] = useState(500);
  const [dueDate, setDueDate] = useState('28/10/2026');
  const [sourceWarehouse, setSourceWarehouse] = useState('Kho Đông Anh');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await managerService.getManagerProductionPlans();
      setOrders(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const newPlan = await managerService.createProductionPlan({
      orderCode: `LSX-2026-0${Math.floor(Math.random() * 90) + 10}`,
      productName,
      bomCode,
      status: 'Đang sản xuất',
      workshop,
      manager: 'Hoàng Thị E (Quản đốc)',
      sourceWarehouse,
      dueDate,
      targetQty: Number(targetQty),
      materials: [
        { name: 'Hạt nhựa PVC SG5', needed: `Cần: ${Math.round(targetQty * 3.2)} Kg`, status: 'Đủ vật tư' },
        { name: 'Bột đá Canxi Cacbonat', needed: `Cần: ${Math.round(targetQty * 4.5)} Kg`, status: 'Đủ vật tư' },
      ],
    });

    setOrders([newPlan, ...orders]);
    setCreateModalOpen(false);
    showToast(`Đã tạo lệnh sản xuất ${newPlan.orderCode} thành công!`);
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý lệnh sản xuất
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Giám sát tiến độ gia công xưởng và tự động tính toán nhu cầu vật tư theo định mức BOM
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('manager-bom')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <Sliders size={14} className="text-slate-500" />
            <span>Định mức BOM</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
          >
            <Plus size={14} />
            <span>+ Tạo lệnh sản xuất</span>
          </button>
        </div>
      </div>

      {/* Production Orders List */}
      <div className="space-y-5">
        {orders.map((order) => {
          const isCompleted = order.status === 'Chờ nhập kho' || order.status === 'Hoàn thành';

          return (
            <div
              key={order.id}
              className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 hover:border-blue-200 transition space-y-4"
            >
              {/* Order Header */}
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-xs font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-50 border border-blue-100">
                  {order.orderCode}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {order.productName}
                </span>
                <span className="font-mono text-xs text-slate-500 px-2 py-0.5 rounded bg-slate-100 font-semibold">
                  {order.bomCode}
                </span>
                {order.status === 'Đang sản xuất' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    Đang sản xuất
                  </span>
                )}
                {order.status === 'Chờ nhập kho' && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                    Chờ nhập kho
                  </span>
                )}
              </div>

              {/* Sub-info Row */}
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                <div>
                  <span className="text-slate-400 font-medium">Phân xưởng:</span>{' '}
                  <span className="font-semibold text-slate-700">{order.workshop}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Quản đốc:</span>{' '}
                  <span className="font-semibold text-slate-700">{order.manager}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Kho cấp vật tư:</span>{' '}
                  <span className="font-semibold text-slate-700">{order.sourceWarehouse}</span>
                </div>
                <div className="flex items-center gap-1 text-slate-600">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Hạn nộp: <strong className="text-slate-800">{order.dueDate}</strong></span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-600">
                    Tiến độ sản lượng: <strong className="text-slate-900">{order.actualQty} / {order.targetQty} cái</strong>
                  </span>
                  <span className="font-bold text-blue-700">{order.progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-purple-600' : 'bg-[#1E56A0]'
                    }`}
                    style={{ width: `${order.progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Materials Requirements Box */}
              <div className="p-3.5 rounded-lg bg-slate-50/75 border border-slate-200/60 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  NHU CẦU NGUYÊN VẬT LIỆU THEO ĐỊNH MỨC BOM:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {order.materials.map((mat, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-800">{mat.name}</div>
                        <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                          {mat.needed}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-[4px] bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold whitespace-nowrap">
                        {mat.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: Tạo lệnh sản xuất mới (Màn hình 3.2.2.5 • Tính toán nhu cầu vật tư) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
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

            <form onSubmit={handleCreateOrder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chọn thành phẩm & Công thức BOM <span className="text-rose-500">*</span>
                </label>
                <select
                  value={productName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProductName(val);
                    if (val.includes('Nano')) {
                      setBomCode('BOM-NANO-01 (v2.1)');
                      setWorkshop('Xưởng Đùn Tấm 1 - Đông Anh');
                      setSourceWarehouse('Kho Đông Anh');
                    } else if (val.includes('Phào')) {
                      setBomCode('BOM-PHAO-02 (v1.4)');
                      setWorkshop('Xưởng Phào PU - Gia Lâm');
                      setSourceWarehouse('Kho Tổng Gia Lâm');
                    } else {
                      setBomCode('BOM-NEP-03 (v1.0)');
                      setWorkshop('Xưởng Cơ khí Anode - Hà Đông');
                      setSourceWarehouse('Kho Hà Đông');
                    }
                  }}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Tấm ốp Nano PVC vân đá 9mm — BOM-NANO-01 (v2.1)">
                    Tấm ốp Nano PVC vân đá 9mm — BOM-NANO-01 (v2.1)
                  </option>
                  <option value="Phào chỉ cổ trần PU dát vàng 8cm — BOM-PHAO-02 (v1.4)">
                    Phào chỉ cổ trần PU dát vàng 8cm — BOM-PHAO-02 (v1.4)
                  </option>
                  <option value="Nẹp nhôm chữ T mạ Anode — BOM-NEP-03 (v1.0)">
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
                    min={1}
                    required
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
                    value={workshop}
                    onChange={(e) => setWorkshop(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500 bg-white"
                  >
                    <option value="Xưởng Đùn Tấm 1 - Đông Anh">Xưởng Đùn Tấm 1 - Đông Anh</option>
                    <option value="Xưởng Đùn Tấm 2 - Đông Anh">Xưởng Đùn Tấm 2 - Đông Anh</option>
                    <option value="Xưởng Phào PU - Gia Lâm">Xưởng Phào PU - Gia Lâm</option>
                    <option value="Xưởng Cơ khí Anode - Hà Đông">Xưởng Cơ khí Anode - Hà Đông</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hạn hoàn thành <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      placeholder="30/10/2026"
                      className="w-full h-9 px-3 pr-8 rounded-lg border border-slate-200 text-xs focus:outline-none focus:border-blue-500"
                    />
                    <Calendar size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kho cấp vật tư <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={sourceWarehouse}
                    onChange={(e) => setSourceWarehouse(e.target.value)}
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
                {productName.includes('Nano') ? (
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
                ) : productName.includes('Phào') ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Hạt nhựa PU polyol</span>
                      <span className="font-bold text-blue-700">{Math.round(targetQty * 0.82).toLocaleString('vi-VN')} Kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Chất đóng rắn Isocyanate</span>
                      <span className="font-bold text-blue-700">{Math.round(targetQty * 0.36).toLocaleString('vi-VN')} Kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Lá vàng công nghiệp 24K</span>
                      <span className="font-bold text-blue-700">{Math.round(targetQty * 4.1).toLocaleString('vi-VN')} lá</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Phôi nhôm định hình 6063</span>
                      <span className="font-bold text-blue-700">{(targetQty * 0.46).toFixed(1)} Kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Hóa chất xi mạ Anode</span>
                      <span className="font-bold text-blue-700">{(targetQty * 0.053).toFixed(2)} Lít</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
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
                  <Plus size={14} />
                  <span>Tạo lệnh sản xuất</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
