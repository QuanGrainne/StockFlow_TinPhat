// src/features/roles/components/warehouse/screens/InboundReceiptsScreen.tsx
// Màn hình Quản lý Nhập kho & Kiểm hàng thực tế (Warehouse Staff)

import React, { useState, useEffect } from 'react';
import { InboundReceipt, InboundReceiptItem } from '../../../types';
import { warehouseService } from '../../../services/warehouseService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import {
  Truck,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  MapPin,
  Package,
} from 'lucide-react';

export const InboundReceiptsScreen: React.FC = () => {
  const [receipts, setReceipts] = useState<InboundReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [viewDetailModalOpen, setViewDetailModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<InboundReceipt | null>(null);

  // Form State
  const [formPoCode, setFormPoCode] = useState('PO-2026-090');
  const [formSupplierName, setFormSupplierName] = useState('Tập đoàn Thép Hòa Phát');
  const [formWarehouseName, setFormWarehouseName] = useState('Kho Nguyên Liệu Tín Phát - Cụm A');
  const [formProductName, setFormProductName] = useState('Tôn cuộn mạ kẽm Z12 (Dày 1.5mm)');
  const [formUom, setFormUom] = useState('Cuộn');
  const [formOrderedQty, setFormOrderedQty] = useState(10);
  const [formReceivedQty, setFormReceivedQty] = useState(10);
  const [formDefectiveQty, setFormDefectiveQty] = useState(0);
  const [formBinLocation, setFormBinLocation] = useState('KHO-A-DAY-2');
  const [formLotNumber, setFormLotNumber] = useState(`LOT-HP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await warehouseService.getInboundReceipts(search, statusFilter);
      setReceipts(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, statusFilter]);

  const handleOpenCreate = () => {
    setFormPoCode(`PO-2026-0${Math.floor(Math.random() * 90 + 10)}`);
    setFormSupplierName('Tập đoàn Thép Hòa Phát');
    setFormWarehouseName('Kho Nguyên Liệu Tín Phát - Cụm A');
    setFormProductName('Tôn cuộn mạ kẽm Z12 (Dày 1.5mm)');
    setFormUom('Cuộn');
    setFormOrderedQty(10);
    setFormReceivedQty(10);
    setFormDefectiveQty(0);
    setFormBinLocation('KHO-A-DAY-2');
    setFormLotNumber(`LOT-HP-${Date.now().toString().slice(-6)}`);
    setFormNotes('');
    setModalOpen(true);
  };

  const handleSaveReceipt = async () => {
    setIsSaving(true);
    try {
      const acceptedQty = Math.max(0, formReceivedQty - formDefectiveQty);
      const items: InboundReceiptItem[] = [
        {
          id: `GRI-${Date.now()}`,
          productId: 'PROD-004',
          productCode: 'NVL-TON-15',
          productName: formProductName,
          uom: formUom,
          orderedQty: Number(formOrderedQty),
          receivedQty: Number(formReceivedQty),
          acceptedQty: acceptedQty,
          defectiveQty: Number(formDefectiveQty),
          binLocation: formBinLocation,
          lotNumber: formLotNumber,
        },
      ];

      const status =
        acceptedQty === Number(formOrderedQty)
          ? 'COMPLETED'
          : acceptedQty > 0
          ? 'PARTIALLY_RECEIVED'
          : 'DRAFT';

      await warehouseService.createInboundReceipt({
        poCode: formPoCode,
        supplierId: 'SUP-01',
        supplierName: formSupplierName,
        warehouseId: 'WH-01',
        warehouseName: formWarehouseName,
        receiptDate: new Date().toLocaleDateString('vi-VN'),
        status: status,
        totalReceivedValue: acceptedQty * 85000000,
        receivedBy: 'Vũ Đức Thủ Kho',
        notes: formNotes,
        items,
      });

      setModalOpen(false);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: InboundReceipt['status']) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} /> Đã nhập kho đủ
          </span>
        );
      case 'PARTIALLY_RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} /> Nhập một phần
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#2B6CB0] border border-blue-200">
            Đã xác nhận
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            Bản nháp
          </span>
        );
    }
  };

  const columns: Column<InboundReceipt>[] = [
    {
      header: 'Mã phiếu nhập',
      accessor: 'receiptCode',
      width: '130px',
      render: (row) => (
        <span className="font-mono font-bold text-[#2B6CB0]">{row.receiptCode}</span>
      ),
    },
    {
      header: 'Số đơn PO',
      accessor: 'poCode',
      width: '130px',
      render: (row) => <span className="font-mono text-slate-700">{row.poCode}</span>,
    },
    {
      header: 'Nhà cung cấp',
      accessor: 'supplierName',
      render: (row) => (
        <div>
          <div className="font-medium text-slate-800">{row.supplierName}</div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
            <MapPin size={11} /> {row.warehouseName}
          </div>
        </div>
      ),
    },
    {
      header: 'Ngày nhận',
      accessor: 'receiptDate',
      width: '110px',
      render: (row) => <span className="text-slate-600 text-xs">{row.receiptDate}</span>,
    },
    {
      header: 'Hàng hóa & Số lượng',
      width: '240px',
      render: (row) => (
        <div className="space-y-1">
          {row.items.map((item) => (
            <div key={item.id} className="text-xs">
              <span className="font-semibold text-slate-800">{item.productName}</span>
              <div className="text-[11px] text-slate-500 font-mono">
                Nhận: {item.receivedQty} | Đạt: {item.acceptedQty} | Lỗi: {item.defectiveQty} {item.uom}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      header: 'Vị trí lưu kho',
      width: '130px',
      render: (row) => (
        <span className="inline-block px-2 py-0.5 rounded-[4px] bg-slate-100 font-mono text-[11px] text-slate-700 border border-slate-200">
          {row.items[0]?.binLocation || 'Chưa xếp'}
        </span>
      ),
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      width: '140px',
      render: (row) => getStatusBadge(row.status),
    },
    {
      header: 'Chi tiết',
      align: 'center',
      width: '90px',
      render: (row) => (
        <button
          type="button"
          onClick={() => {
            setSelectedReceipt(row);
            setViewDetailModalOpen(true);
          }}
          className="p-1.5 text-slate-500 hover:text-[#2B6CB0] hover:bg-blue-50 rounded-[6px] transition cursor-pointer"
          title="Xem chi tiết phiếu nhập"
        >
          <Eye size={16} />
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
            <Truck className="text-[#2B6CB0]" size={22} />
            <span>Kiểm hàng & Nhập kho (Goods Receipts)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý việc kiểm tra chất lượng (QC), số lượng đạt/hỏng và gán vị trí lưu kho (Bin Location)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="h-9 px-4 rounded-[8px] bg-[#2B6CB0] hover:bg-[#23568c] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus size={16} />
          <span>Tạo phiếu kiểm hàng</span>
        </button>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={receipts}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Tìm theo mã phiếu GR, mã PO, nhà cung cấp..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Modal Tạo Phiếu Kiểm Hàng */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Tạo phiếu kiểm hàng nhập kho thực tế"
        subtitle="Ghi nhận số lượng đạt tiêu chuẩn, hàng lỗi/móp và chỉ định vị trí Bin Location"
        onSave={handleSaveReceipt}
        saveText="Lưu phiếu nhập kho"
        isSaving={isSaving}
        maxWidth="2xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số đơn đặt hàng PO <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formPoCode}
              onChange={(e) => setFormPoCode(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
              placeholder="Vd: PO-2026-088"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nhà cung cấp
            </label>
            <input
              type="text"
              value={formSupplierName}
              onChange={(e) => setFormSupplierName(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kho tiếp nhận
            </label>
            <input
              type="text"
              value={formWarehouseName}
              onChange={(e) => setFormWarehouseName(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Hàng hóa / Quy cách
            </label>
            <input
              type="text"
              value={formProductName}
              onChange={(e) => setFormProductName(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số lượng trên đơn PO
            </label>
            <input
              type="number"
              value={formOrderedQty}
              onChange={(e) => setFormOrderedQty(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số lượng thực nhận tại kho
            </label>
            <input
              type="number"
              value={formReceivedQty}
              onChange={(e) => setFormReceivedQty(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-rose-600 mb-1">
              Số lượng lỗi / móp / trầy xước
            </label>
            <input
              type="number"
              value={formDefectiveQty}
              onChange={(e) => setFormDefectiveQty(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-[8px] border border-rose-300 text-xs text-rose-700 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vị trí giá kệ lưu kho (Bin Location) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formBinLocation}
              onChange={(e) => setFormBinLocation(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
              placeholder="Vd: KHO-A-DAY-1"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số Lô quản lý (Lot Number)
            </label>
            <input
              type="text"
              value={formLotNumber}
              onChange={(e) => setFormLotNumber(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs font-mono focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú kiểm tra
            </label>
            <textarea
              rows={2}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              className="w-full p-2.5 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
              placeholder="Tình trạng xe tải, biên bản giao nhận..."
            />
          </div>
        </div>
      </Modal>

      {/* Modal Xem Chi Tiết Phiếu Nhập */}
      {selectedReceipt && (
        <Modal
          isOpen={viewDetailModalOpen}
          onClose={() => setViewDetailModalOpen(false)}
          title={`Chi tiết phiếu nhập: ${selectedReceipt.receiptCode}`}
          subtitle={`Đơn hàng tham chiếu: ${selectedReceipt.poCode} | Người nhận: ${selectedReceipt.receivedBy}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-[8px] border border-slate-200">
              <div>
                <span className="text-slate-400">Nhà cung cấp:</span>{' '}
                <strong className="text-slate-800">{selectedReceipt.supplierName}</strong>
              </div>
              <div>
                <span className="text-slate-400">Kho lưu trữ:</span>{' '}
                <strong className="text-slate-800">{selectedReceipt.warehouseName}</strong>
              </div>
              <div>
                <span className="text-slate-400">Ngày nhập:</span>{' '}
                <strong className="text-slate-800">{selectedReceipt.receiptDate}</strong>
              </div>
              <div>
                <span className="text-slate-400">Trạng thái:</span>{' '}
                {getStatusBadge(selectedReceipt.status)}
              </div>
            </div>

            <div className="border border-slate-200 rounded-[8px] overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Sản phẩm</th>
                    <th className="p-2.5 text-right">Đặt PO</th>
                    <th className="p-2.5 text-right">Thực nhận</th>
                    <th className="p-2.5 text-right text-emerald-700">Đạt (QC)</th>
                    <th className="p-2.5 text-right text-rose-600">Lỗi</th>
                    <th className="p-2.5 text-center">Vị trí (Bin)</th>
                    <th className="p-2.5">Số Lô</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedReceipt.items.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2.5 font-medium text-slate-800">
                        {it.productName}
                        <div className="text-[10px] text-slate-400">{it.productCode}</div>
                      </td>
                      <td className="p-2.5 text-right">{it.orderedQty} {it.uom}</td>
                      <td className="p-2.5 text-right font-semibold">{it.receivedQty} {it.uom}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700">{it.acceptedQty}</td>
                      <td className="p-2.5 text-right font-bold text-rose-600">{it.defectiveQty}</td>
                      <td className="p-2.5 text-center font-mono text-[11px] bg-slate-50">{it.binLocation}</td>
                      <td className="p-2.5 font-mono text-[11px] text-slate-600">{it.lotNumber}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedReceipt.notes && (
              <div className="text-xs text-slate-600 bg-amber-50 p-2.5 rounded-[6px] border border-amber-200">
                <strong>Ghi chú:</strong> {selectedReceipt.notes}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
