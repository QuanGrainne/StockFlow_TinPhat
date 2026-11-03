// src/features/roles/components/warehouse/screens/StockInventoryScreen.tsx
// Màn hình Tồn kho & Định vị vị trí giá kệ Bin Location (Warehouse Staff)

import React, { useState, useEffect } from 'react';
import { StockInventoryItem } from '../../../types';
import { warehouseService } from '../../../services/warehouseService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import { Boxes, Edit3, MapPin, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const StockInventoryScreen: React.FC = () => {
  const [items, setItems] = useState<StockInventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockInventoryItem | null>(null);
  const [formBinLocation, setFormBinLocation] = useState('');
  const [formQtyOnHand, setFormQtyOnHand] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await warehouseService.getStockInventory(search);
      setItems(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleOpenEdit = (item: StockInventoryItem) => {
    setSelectedItem(item);
    setFormBinLocation(item.binLocation);
    setFormQtyOnHand(item.quantityOnHand);
    setEditModalOpen(true);
  };

  const handleSave = async () => {
    if (!selectedItem) return;
    setIsSaving(true);
    try {
      await warehouseService.updateStockLocation(
        selectedItem.id,
        formBinLocation,
        Number(formQtyOnHand)
      );
      setEditModalOpen(false);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<StockInventoryItem>[] = [
    {
      header: 'Mã hàng',
      accessor: 'productCode',
      width: '130px',
      render: (row) => (
        <span className="font-mono font-bold text-[#2B6CB0]">{row.productCode}</span>
      ),
    },
    {
      header: 'Tên vật tư / Thành phẩm',
      accessor: 'productName',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.productName}</div>
          <div className="text-[11px] text-slate-400 font-mono">
            Kho: {row.warehouseName}
          </div>
        </div>
      ),
    },
    {
      header: 'Vị trí Bin Location',
      accessor: 'binLocation',
      width: '160px',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] bg-slate-100 font-mono text-xs font-semibold text-slate-800 border border-slate-200">
          <MapPin size={13} className="text-[#2B6CB0]" />
          {row.binLocation}
        </span>
      ),
    },
    {
      header: 'Số Lô (Lot)',
      accessor: 'lotNumber',
      width: '150px',
      render: (row) => (
        <span className="font-mono text-xs text-slate-600">{row.lotNumber}</span>
      ),
    },
    {
      header: 'Thực tồn',
      accessor: 'quantityOnHand',
      align: 'right',
      width: '110px',
      render: (row) => (
        <span className="font-bold text-slate-900">
          {row.quantityOnHand.toLocaleString('vi-VN')} {row.uom}
        </span>
      ),
    },
    {
      header: 'Đã phân bổ',
      accessor: 'quantityAllocated',
      align: 'right',
      width: '110px',
      render: (row) => (
        <span className="text-slate-500 font-medium">
          {row.quantityAllocated.toLocaleString('vi-VN')} {row.uom}
        </span>
      ),
    },
    {
      header: 'Khả dụng',
      accessor: 'quantityAvailable',
      align: 'right',
      width: '120px',
      render: (row) => {
        const isLow = row.quantityAvailable <= 10;
        return (
          <span
            className={`font-bold ${
              isLow ? 'text-amber-600' : 'text-emerald-600'
            }`}
          >
            {row.quantityAvailable.toLocaleString('vi-VN')} {row.uom}
          </span>
        );
      },
    },
    {
      header: 'Điều chuyển',
      align: 'center',
      width: '100px',
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenEdit(row)}
          className="p-1.5 text-slate-500 hover:text-[#2B6CB0] hover:bg-blue-50 rounded-[6px] transition cursor-pointer"
          title="Điều chuyển vị trí hoặc cập nhật tồn kho"
        >
          <Edit3 size={15} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Boxes className="text-[#2B6CB0]" size={22} />
            <span>Tra cứu Tồn kho theo Vị trí (Bin Location)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi chi tiết tồn kho thực tế, số lượng đã phân bổ đơn hàng và vị trí lưu trữ
          </p>
        </div>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={items}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Tìm theo mã hàng, tên sản phẩm, vị trí Bin, số Lô..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Modal Điều Chuyển Vị Trí Lưu Kho */}
      {selectedItem && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={`Điều chuyển vị trí: ${selectedItem.productCode}`}
          subtitle={selectedItem.productName}
          onSave={handleSave}
          saveText="Lưu điều chuyển"
          isSaving={isSaving}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vị trí giá kệ lưu kho mới (Bin Location) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formBinLocation}
                onChange={(e) => setFormBinLocation(e.target.value)}
                className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs font-mono focus:outline-none focus:border-[#2B6CB0]"
                placeholder="Vd: KHO-A-DAY-2"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Quy ước mã vị trí: Kho - Dãy/Kệ - Tầng (Vd: KHO-A-KE-B2)
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số lượng thực tế tại kho ({selectedItem.uom})
              </label>
              <input
                type="number"
                value={formQtyOnHand}
                onChange={(e) => setFormQtyOnHand(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
              />
            </div>

            <div className="p-3 rounded-[8px] bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
              <div>Số lượng đang giữ cho đơn hàng: <strong>{selectedItem.quantityAllocated} {selectedItem.uom}</strong></div>
              <div>Số Lô quản lý: <strong className="font-mono">{selectedItem.lotNumber}</strong></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
