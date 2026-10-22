// src/features/products/ProductsScreen.tsx
// Màn hình Hàng hóa chuẩn kiến trúc Frontend (Read-only Table + Popup Thêm/Sửa theo AI_CODING_RULES)

'use client';

import React, { useState, useEffect } from 'react';
import { Product } from '@/features/roles/types';
import { salesService } from '@/features/roles/services/salesService';
import { DataTable, Column } from '@/features/roles/components/common/DataTable';
import { Modal } from '@/features/roles/components/common/Modal';
import { Header } from '@/features/roles/components/common/Header';
import { Sidebar } from '@/features/roles/components/common/Sidebar';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Boxes,
  Layers,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'FINISHED' | 'RAW_MATERIAL'>('FINISHED');
  const [formUom, setFormUom] = useState('Cây');
  const [formStandardPrice, setFormStandardPrice] = useState<number>(0);
  const [formCostPrice, setFormCostPrice] = useState<number>(0);
  const [formStockQuantity, setFormStockQuantity] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await salesService.getProducts();
      setProducts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingProductId(null);
    setFormCode(`TP-SP-${String(products.length + 1).padStart(3, '0')}`);
    setFormName('');
    setFormType('FINISHED');
    setFormUom('Cây');
    setFormStandardPrice(0);
    setFormCostPrice(0);
    setFormStockQuantity(0);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProductId(prod.id);
    setFormCode(prod.code);
    setFormName(prod.name);
    setFormType(prod.type as any);
    setFormUom(prod.uom);
    setFormStandardPrice(prod.standardPrice);
    setFormCostPrice(prod.costPrice);
    setFormStockQuantity(prod.stockQuantity);
    setFormError('');
    setModalOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!formName.trim()) {
      setFormError('Vui lòng nhập tên hàng hóa');
      return;
    }
    if (!formCode.trim()) {
      setFormError('Vui lòng nhập mã hàng hóa');
      return;
    }

    setIsSaving(true);
    setFormError('');

    try {
      if (editingProductId) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProductId
              ? {
                  ...p,
                  code: formCode,
                  name: formName,
                  type: formType,
                  uom: formUom,
                  standardPrice: Number(formStandardPrice),
                  costPrice: Number(formCostPrice),
                  stockQuantity: Number(formStockQuantity),
                }
              : p
          )
        );
      } else {
        const newProd: Product = {
          id: `PROD-${Date.now()}`,
          code: formCode,
          name: formName,
          type: formType,
          uom: formUom,
          standardPrice: Number(formStandardPrice),
          costPrice: Number(formCostPrice),
          stockQuantity: Number(formStockQuantity),
        };
        setProducts((prev) => [newProd, ...prev]);
      }

      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu sản phẩm');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = (prodId: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      setProducts((prev) => prev.filter((p) => p.id !== prodId));
    }
  };

  // Lọc sản phẩm
  const filteredProducts = products.filter((p) => {
    return (
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const totalStockCount = filteredProducts.reduce((sum, p) => sum + p.stockQuantity, 0);

  const columns: Column<Product>[] = [
    {
      header: 'Mã hàng hóa',
      accessor: 'code',
      width: '150px',
      render: (row) => (
        <span className="font-mono font-bold text-[#2B6CB0]">{row.code}</span>
      ),
    },
    {
      header: 'Tên hàng hóa / Quy cách',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.name}</div>
          <div className="text-[11px] text-slate-400 font-mono">Đơn vị tính: {row.uom}</div>
        </div>
      ),
    },
    {
      header: 'Giá bán (VND)',
      accessor: 'standardPrice',
      align: 'right',
      width: '140px',
      render: (row) => (
        <span className="font-medium text-slate-800">
          {row.standardPrice.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Giá vốn (VND)',
      accessor: 'costPrice',
      align: 'right',
      width: '140px',
      render: (row) => (
        <span className="text-slate-500 font-mono">
          {row.costPrice.toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      header: 'Tồn kho',
      accessor: 'stockQuantity',
      align: 'right',
      width: '130px',
      render: (row) => {
        const isOutOfStock = row.stockQuantity <= 0;
        return (
          <span
            className={`font-bold text-sm ${
              isOutOfStock ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {row.stockQuantity.toLocaleString('vi-VN')} {row.uom}
          </span>
        );
      },
    },
    {
      header: 'Thao tác',
      align: 'center',
      width: '110px',
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="p-1 text-slate-500 hover:text-[#2B6CB0] hover:bg-blue-50 rounded-[4px] transition cursor-pointer"
            title="Chỉnh sửa hàng hóa"
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleDeleteProduct(row.id)}
            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-[4px] transition cursor-pointer"
            title="Xóa hàng hóa"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7FAFC] flex flex-col font-sans">
      {/* Header Role Switcher */}
      <Header
        currentRole="MANAGER"
        onRoleChange={() => {}}
        userName="Quản lý Hệ thống (Tín Phát)"
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div className="flex-1 flex min-h-[calc(100vh-56px)] overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentRole="MANAGER"
          activeScreen="manager-products"
          onNavigate={() => {}}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-5">
            {/* Page Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Quản lý Danh mục Hàng hóa & Nguyên vật liệu
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Danh mục sản phẩm cơ khí (Máng cáp, Khay cáp) và Nguyên vật liệu (Tôn cuộn, Bột sơn)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/roles"
                  className="h-9 px-3.5 rounded-[8px] border border-[#2B6CB0] text-[#2B6CB0] bg-white hover:bg-blue-50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Chuyển phân hệ Sales / Manager</span>
                  <ArrowRight size={14} />
                </Link>

                <button
                  type="button"
                  onClick={openCreateModal}
                  className="h-9 px-4 rounded-[8px] bg-[#2B6CB0] hover:bg-[#23568c] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                >
                  <Plus size={16} />
                  <span>Thêm hàng hóa mới</span>
                </button>
              </div>
            </div>

            {/* Main DataTable */}
            <DataTable
              columns={columns}
              data={filteredProducts}
              keyField="id"
              isLoading={loading}
              searchPlaceholder="Tìm theo mã hàng hóa, tên quy cách..."
              searchValue={search}
              onSearchChange={setSearch}
            />
          </div>
        </main>
      </div>

      {/* Modal Thêm / Sửa Hàng Hóa (Chuẩn UX Popup đè lên trang) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProductId ? 'Chỉnh sửa thông tin hàng hóa' : 'Thêm mới hàng hóa / nguyên vật liệu'}
        subtitle="Mọi thay đổi sẽ được cập nhật trực tiếp vào danh mục Master Data của hệ thống"
        onSave={handleSaveProduct}
        saveText={editingProductId ? 'Lưu thay đổi' : 'Thêm hàng hóa'}
        isSaving={isSaving}
        maxWidth="lg"
      >
        {formError && (
          <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{formError}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Mã hàng hóa (SKU) <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formCode}
            onChange={(e) => setFormCode(e.target.value)}
            placeholder="Vd: TP-MC-300-ST"
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 font-mono font-bold focus:outline-none focus:border-[#2B6CB0]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Tên hàng hóa & Quy cách kỹ thuật <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Vd: Máng cáp 300x100x2500 sơn tĩnh điện..."
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đơn vị tính (UOM)
            </label>
            <select
              value={formUom}
              onChange={(e) => setFormUom(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            >
              <option value="Cây">Cây</option>
              <option value="Cuộn">Cuộn</option>
              <option value="Kg">Kg</option>
              <option value="Mét">Mét</option>
              <option value="Cái">Cái</option>
              <option value="Bộ">Bộ</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Giá bán tiêu chuẩn
            </label>
            <input
              type="number"
              step={1000}
              value={formStandardPrice}
              onChange={(e) => setFormStandardPrice(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Giá vốn định mức
            </label>
            <input
              type="number"
              step={1000}
              value={formCostPrice}
              onChange={(e) => setFormCostPrice(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Số lượng tồn kho ban đầu
          </label>
          <input
            type="number"
            min="0"
            value={formStockQuantity}
            onChange={(e) => setFormStockQuantity(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 font-semibold focus:outline-none focus:border-[#2B6CB0]"
          />
        </div>
      </Modal>
    </div>
  );
}
