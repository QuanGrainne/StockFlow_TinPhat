// src/components/manager/screens/BomManagementScreen.tsx
// Màn hình Quản lý Định mức Sản xuất (Gộp luồng BOM vào 1 màn hình quản lý chung theo ràng buộc)

import React, { useState, useEffect } from 'react';
import { BomFormula, Product, BomItem } from '../../../types';
import { managerService } from '../../../services/managerService';
import { salesService } from '../../../services/salesService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import {
  Plus,
  Cpu,
  Layers,
  Edit2,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const BomManagementScreen: React.FC = () => {
  const [boms, setBoms] = useState<BomFormula[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedBomId, setExpandedBomId] = useState<string | null>('BOM-001');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBomId, setEditingBomId] = useState<string | null>(null);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [notes, setNotes] = useState('');
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [bomList, prodList] = await Promise.all([
        managerService.getBoms(search),
        salesService.getProducts(),
      ]);
      setBoms(bomList);
      setProducts(prodList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  // Lọc sản phẩm thành phẩm vs nguyên vật liệu
  const finishedProducts = products.filter((p) => p.type === 'FINISHED');
  const rawMaterials = products.filter((p) => p.type === 'RAW_MATERIAL');

  const openCreateModal = () => {
    setEditingBomId(null);
    setSelectedProductId(finishedProducts[0]?.id || '');
    setVersion('v1.0');
    setNotes('');
    setBomItems([]);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (bom: BomFormula) => {
    setEditingBomId(bom.id);
    setSelectedProductId(bom.finishedProductId);
    setVersion(bom.version);
    setNotes(bom.notes || '');
    setBomItems([...bom.items]);
    setFormError('');
    setModalOpen(true);
  };

  const handleAddMaterial = (materialId: string) => {
    const mat = rawMaterials.find((m) => m.id === materialId);
    if (!mat) return;

    if (bomItems.some((i) => i.materialId === materialId)) {
      setFormError('Nguyên vật liệu này đã có trong công thức BOM');
      return;
    }

    setBomItems([
      ...bomItems,
      {
        id: `BI-${Date.now()}`,
        materialId: mat.id,
        materialCode: mat.code,
        materialName: mat.name,
        uom: mat.uom,
        standardQuantity: 1,
        scrapPercent: 3.0,
      },
    ]);
    setFormError('');
  };

  const handleUpdateItem = (
    index: number,
    field: 'standardQuantity' | 'scrapPercent',
    value: number
  ) => {
    const next = [...bomItems];
    next[index] = { ...next[index], [field]: value };
    setBomItems(next);
  };

  const handleRemoveItem = (index: number) => {
    setBomItems(bomItems.filter((_, i) => i !== index));
  };

  const handleSaveBom = async () => {
    if (!selectedProductId) {
      setFormError('Vui lòng chọn thành phẩm đầu ra');
      return;
    }
    if (bomItems.length === 0) {
      setFormError('BOM phải chứa ít nhất 1 nguyên vật liệu cấu thành');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setIsSaving(true);
    setFormError('');

    try {
      if (editingBomId) {
        await managerService.updateBom(editingBomId, {
          finishedProductId: prod.id,
          finishedProductCode: prod.code,
          finishedProductName: prod.name,
          finishedProductUom: prod.uom,
          version,
          notes,
          items: bomItems,
        });
      } else {
        await managerService.createBom({
          finishedProductId: prod.id,
          finishedProductCode: prod.code,
          finishedProductName: prod.name,
          finishedProductUom: prod.uom,
          version,
          status: 'ACTIVE',
          items: bomItems,
          notes,
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || 'Lỗi khi lưu định mức BOM');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<BomFormula>[] = [
    {
      header: 'Mã BOM',
      accessor: 'bomCode',
      width: '140px',
      render: (row) => (
        <span className="font-mono font-bold text-[#2B6CB0]">{row.bomCode}</span>
      ),
    },
    {
      header: 'Thành phẩm đầu ra',
      accessor: 'finishedProductName',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.finishedProductName}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            Mã: {row.finishedProductCode} | ĐVT: {row.finishedProductUom}
          </div>
        </div>
      ),
    },
    {
      header: 'Phiên bản',
      accessor: 'version',
      align: 'center',
      width: '100px',
      render: (row) => (
        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-700">
          {row.version}
        </span>
      ),
    },
    {
      header: 'Số NVL cấu thành',
      align: 'center',
      width: '140px',
      render: (row) => (
        <span className="font-semibold text-slate-700">
          {row.items.length} nguyên liệu
        </span>
      ),
    },
    {
      header: 'Cập nhật',
      accessor: 'updatedAt',
      width: '120px',
      render: (row) => <span className="text-slate-500">{row.updatedAt}</span>,
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      align: 'center',
      width: '120px',
      render: (row) => (
        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Đang áp dụng
        </span>
      ),
    },
    {
      header: 'Thao tác',
      align: 'center',
      width: '130px',
      render: (row) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => setExpandedBomId(expandedBomId === row.id ? null : row.id)}
            className="p-1 text-slate-500 hover:text-[#2B6CB0] hover:bg-blue-50 rounded-[4px] transition cursor-pointer"
            title="Xem chi tiết nguyên liệu"
          >
            {expandedBomId === row.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="p-1 text-slate-500 hover:text-[#2B6CB0] hover:bg-blue-50 rounded-[4px] transition cursor-pointer"
            title="Sửa công thức BOM"
          >
            <Edit2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý Định mức Sản xuất (BOM Hub)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gộp luồng quản lý công thức Bill of Materials, định mức tiêu hao nguyên vật liệu và tỉ lệ hao hụt (%)
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="h-9 px-4 rounded-[8px] bg-[#2B6CB0] hover:bg-[#23568c] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus size={16} />
          <span>Thêm định mức BOM mới</span>
        </button>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={boms}
        keyField="id"
        isLoading={loading}
        searchPlaceholder="Tìm theo mã BOM, tên thành phẩm..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Detail Panel: Xem chi tiết các nguyên vật liệu của BOM đang mở */}
      {expandedBomId && (
        (() => {
          const activeBom = boms.find((b) => b.id === expandedBomId);
          if (!activeBom) return null;

          return (
            <div className="bg-white rounded-[8px] border border-blue-200 p-5 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Cpu size={18} className="text-[#2B6CB0]" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Chi tiết công thức định mức cho 1 {activeBom.finishedProductUom}: {activeBom.finishedProductName}
                  </h3>
                </div>
                <span className="font-mono text-xs font-semibold text-[#2B6CB0]">
                  {activeBom.bomCode} ({activeBom.version})
                </span>
              </div>

              <div className="border border-slate-200 rounded-[6px] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F7FAFC] border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-3 py-2.5">Mã NVL</th>
                      <th className="px-3 py-2.5">Tên nguyên vật liệu</th>
                      <th className="px-3 py-2.5 text-center">ĐVT</th>
                      <th className="px-3 py-2.5 text-right">Định mức tiêu hao chuẩn</th>
                      <th className="px-3 py-2.5 text-right">Tỉ lệ hao hụt (%)</th>
                      <th className="px-3 py-2.5 text-right">Tổng định mức tính toán</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeBom.items.map((item) => {
                      const totalWithScrap = item.standardQuantity * (1 + item.scrapPercent / 100);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-mono text-slate-500">{item.materialCode}</td>
                          <td className="px-3 py-2 font-medium text-slate-800">{item.materialName}</td>
                          <td className="px-3 py-2 text-center text-slate-600">{item.uom}</td>
                          <td className="px-3 py-2 text-right font-semibold">{item.standardQuantity}</td>
                          <td className="px-3 py-2 text-right text-amber-600 font-semibold">+{item.scrapPercent}%</td>
                          <td className="px-3 py-2 text-right font-bold text-[#2B6CB0]">
                            {totalWithScrap.toFixed(3)} {item.uom}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {activeBom.notes && (
                <div className="mt-3 text-xs text-slate-500 italic">
                  Ghi chú kỹ thuật: {activeBom.notes}
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* Modal Tạo / Sửa BOM */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBomId ? 'Cập nhật công thức định mức BOM' : 'Tạo mới công thức định mức BOM'}
        subtitle="Chọn thành phẩm và cấu hình danh mục nguyên vật liệu cấu thành kèm tỉ lệ hao hụt"
        onSave={handleSaveBom}
        isSaving={isSaving}
        maxWidth="4xl"
      >
        {formError && (
          <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Thành phẩm đầu ra <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            >
              {finishedProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name} ({p.uom})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phiên bản công thức
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="v1.0"
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 font-mono focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>
        </div>

        {/* Section thêm nguyên vật liệu */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Nguyên vật liệu cấu thành (BOM Items)
            </span>
            <select
              className="h-8 px-2 text-xs border border-slate-300 rounded-[6px] bg-white text-slate-800"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleAddMaterial(e.target.value);
                  e.target.value = '';
                }
              }}
            >
              <option value="" disabled>+ Chọn NVL thêm vào công thức</option>
              {rawMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} - {m.name} ({m.uom})
                </option>
              ))}
            </select>
          </div>

          <div className="border border-slate-200 rounded-[6px] overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7FAFC] border-b border-slate-200 text-slate-600 font-semibold text-[11px]">
                <tr>
                  <th className="px-3 py-2">Nguyên vật liệu</th>
                  <th className="px-3 py-2 text-center w-20">ĐVT</th>
                  <th className="px-3 py-2 text-center w-36">Định mức chuẩn</th>
                  <th className="px-3 py-2 text-center w-32">Hao hụt (%)</th>
                  <th className="px-2 py-2 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bomItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Chưa có nguyên vật liệu. Chọn từ danh sách phía trên để cấu hình.
                    </td>
                  </tr>
                ) : (
                  bomItems.map((item, idx) => (
                    <tr key={item.materialId}>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-800">{item.materialName}</div>
                        <div className="font-mono text-[10px] text-slate-400">{item.materialCode}</div>
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-slate-600">
                        {item.uom}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="number"
                          step={0.1}
                          min={0.01}
                          value={item.standardQuantity}
                          onChange={(e) =>
                            handleUpdateItem(idx, 'standardQuantity', Number(e.target.value))
                          }
                          className="w-24 h-7 px-2 border border-slate-300 rounded text-center text-xs font-semibold"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step={0.5}
                            min={0}
                            value={item.scrapPercent}
                            onChange={(e) =>
                              handleUpdateItem(idx, 'scrapPercent', Number(e.target.value))
                            }
                            className="w-16 h-7 px-2 border border-slate-300 rounded text-center text-xs font-semibold"
                          />
                          <span>%</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Ghi chú kỹ thuật / Hướng dẫn sản xuất
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Yêu cầu kích thước dập, quy cách sơn, độ bóng..."
            className="w-full p-2.5 border border-slate-300 rounded-[6px] text-xs resize-none text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          />
        </div>
      </Modal>
    </div>
  );
};
