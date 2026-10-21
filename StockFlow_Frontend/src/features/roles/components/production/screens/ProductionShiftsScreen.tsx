// src/features/roles/components/production/screens/ProductionShiftsScreen.tsx
// Màn hình Ghi nhận Sản lượng Ca & Báo cáo Hao hụt (Production Staff)

import React, { useState, useEffect } from 'react';
import { ProductionWorkShift, ProductionOrder } from '../../../types';
import { productionService } from '../../../services/productionService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import {
  Factory,
  Plus,
  PlayCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
} from 'lucide-react';

export const ProductionShiftsScreen: React.FC = () => {
  const [shifts, setShifts] = useState<ProductionWorkShift[]>([]);
  const [activeOrders, setActiveOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ProductionWorkShift | null>(null);

  // Form State
  const [formOrderCode, setFormOrderCode] = useState('MO-2026-001');
  const [formProductName, setFormProductName] = useState('Máng cáp Trunking 300x100 dày 1.5mm');
  const [formShiftName, setFormShiftName] = useState<ProductionWorkShift['shiftName']>('Ca 1 (Sáng)');
  const [formTargetQty, setFormTargetQty] = useState(100);
  const [formActualQty, setFormActualQty] = useState(98);
  const [formDefectQty, setFormDefectQty] = useState(2);
  const [formOperator, setFormOperator] = useState('Nguyễn Văn Hùng (Tổ trưởng)');
  const [formWorkshop, setFormWorkshop] = useState('Xưởng Đột dập CNC');
  const [formScrapNotes, setFormScrapNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [shiftData, orderData] = await Promise.all([
        productionService.getWorkShifts(search),
        productionService.getActiveOrders(),
      ]);
      setShifts(shiftData);
      setActiveOrders(orderData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleOpenCreate = () => {
    setFormOrderCode(activeOrders[0]?.mfgOrderCode || 'MO-2026-001');
    setFormProductName(activeOrders[0]?.finishedProductName || 'Máng cáp Trunking 300x100 dày 1.5mm');
    setFormShiftName('Ca 1 (Sáng)');
    setFormTargetQty(100);
    setFormActualQty(95);
    setFormDefectQty(2);
    setFormOperator('Nguyễn Văn Hùng (Tổ trưởng)');
    setFormWorkshop('Xưởng Đột dập CNC');
    setFormScrapNotes('');
    setModalOpen(true);
  };

  const handleSaveShift = async () => {
    setIsSaving(true);
    try {
      await productionService.createWorkShift({
        orderCode: formOrderCode,
        finishedProductName: formProductName,
        shiftName: formShiftName,
        targetQty: Number(formTargetQty),
        actualQty: Number(formActualQty),
        defectQty: Number(formDefectQty),
        operator: formOperator,
        workshop: formWorkshop,
        status: 'COMPLETED',
        scrapReportNotes: formScrapNotes,
      });

      setModalOpen(false);
      await loadData();
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<ProductionWorkShift>[] = [
    {
      header: 'Lệnh sản xuất',
      accessor: 'orderCode',
      width: '130px',
      render: (row) => (
        <span className="font-mono font-bold text-[#2B6CB0]">{row.orderCode}</span>
      ),
    },
    {
      header: 'Thành phẩm',
      accessor: 'finishedProductName',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.finishedProductName}</div>
          <div className="text-[11px] text-slate-500 font-mono">
            {row.workshop} | {row.operator}
          </div>
        </div>
      ),
    },
    {
      header: 'Ca làm việc',
      accessor: 'shiftName',
      width: '130px',
      render: (row) => (
        <span className="px-2.5 py-1 rounded-[6px] bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200">
          {row.shiftName}
        </span>
      ),
    },
    {
      header: 'Chỉ tiêu',
      accessor: 'targetQty',
      align: 'right',
      width: '100px',
      render: (row) => (
        <span className="text-slate-600 font-medium">{row.targetQty} cây</span>
      ),
    },
    {
      header: 'Đạt ca',
      accessor: 'actualQty',
      align: 'right',
      width: '110px',
      render: (row) => (
        <span className="font-bold text-emerald-700">{row.actualQty} cây</span>
      ),
    },
    {
      header: 'Hao hụt / Lỗi',
      accessor: 'defectQty',
      align: 'right',
      width: '110px',
      render: (row) => (
        <span
          className={`font-bold ${
            row.defectQty > 0 ? 'text-rose-600' : 'text-slate-400'
          }`}
        >
          {row.defectQty} cây
        </span>
      ),
    },
    {
      header: 'Thời gian ghi',
      accessor: 'recordedAt',
      width: '140px',
      render: (row) => <span className="text-slate-500 text-xs">{row.recordedAt}</span>,
    },
    {
      header: 'Chi tiết',
      align: 'center',
      width: '80px',
      render: (row) => (
        <button
          type="button"
          onClick={() => {
            setSelectedShift(row);
            setDetailModalOpen(true);
          }}
          className="p-1.5 text-slate-500 hover:text-[#2B6CB0] hover:bg-blue-50 rounded-[6px] transition cursor-pointer"
          title="Xem biên bản ca"
        >
          <FileText size={16} />
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
            <Factory className="text-[#2B6CB0]" size={22} />
            <span>Ghi nhận Sản lượng & Báo cáo Hao hụt Ca (Production)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân hệ công nhân/tổ trưởng cập nhật tiến độ gia công máng cáp, sơn và báo cáo phôi lỗi
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="h-9 px-4 rounded-[8px] bg-[#2B6CB0] hover:bg-[#23568c] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus size={16} />
          <span>Ghi nhận sản lượng ca</span>
        </button>
      </div>

      {/* Main DataTable */}
      <DataTable
        columns={columns}
        data={shifts}
        keyField="id"
        isLoading={isLoading}
        searchPlaceholder="Tìm theo lệnh MO, sản phẩm, xưởng, công nhân..."
        searchValue={search}
        onSearchChange={setSearch}
      />

      {/* Modal Báo Cáo Sản Lượng Ca */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Báo cáo sản lượng ca làm việc"
        subtitle="Ghi nhận số lượng thành phẩm đạt và phôi hao hụt cho lệnh sản xuất"
        onSave={handleSaveShift}
        saveText="Gửi báo cáo ca"
        isSaving={isSaving}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lệnh sản xuất (Manufacturing Order) <span className="text-rose-500">*</span>
            </label>
            <select
              value={formOrderCode}
              onChange={(e) => {
                const code = e.target.value;
                setFormOrderCode(code);
                const order = activeOrders.find((o) => o.mfgOrderCode === code);
                if (order) setFormProductName(order.finishedProductName);
              }}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
            >
              {activeOrders.map((o) => (
                <option key={o.id} value={o.mfgOrderCode}>
                  {o.mfgOrderCode} - {o.finishedProductName} (Mục tiêu: {o.targetQuantity})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ca làm việc
              </label>
              <select
                value={formShiftName}
                onChange={(e) => setFormShiftName(e.target.value as any)}
                className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
              >
                <option value="Ca 1 (Sáng)">Ca 1 (Sáng: 06h - 14h)</option>
                <option value="Ca 2 (Chiều)">Ca 2 (Chiều: 14h - 22h)</option>
                <option value="Ca 3 (Đêm)">Ca 3 (Đêm: 22h - 06h)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Xưởng thực hiện
              </label>
              <input
                type="text"
                value={formWorkshop}
                onChange={(e) => setFormWorkshop(e.target.value)}
                className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chỉ tiêu ca
              </label>
              <input
                type="number"
                value={formTargetQty}
                onChange={(e) => setFormTargetQty(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-emerald-700 mb-1">
                Thực tế hoàn thành
              </label>
              <input
                type="number"
                value={formActualQty}
                onChange={(e) => setFormActualQty(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-[8px] border border-emerald-300 text-xs text-emerald-800 font-semibold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-600 mb-1">
                Số lượng hỏng / lỗi
              </label>
              <input
                type="number"
                value={formDefectQty}
                onChange={(e) => setFormDefectQty(Number(e.target.value))}
                className="w-full h-9 px-3 rounded-[8px] border border-rose-300 text-xs text-rose-700 font-semibold focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Người vận hành / Tổ trưởng phụ trách
            </label>
            <input
              type="text"
              value={formOperator}
              onChange={(e) => setFormOperator(e.target.value)}
              className="w-full h-9 px-3 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nguyên nhân hao hụt / Ghi chú kỹ thuật
            </label>
            <textarea
              rows={2}
              value={formScrapNotes}
              onChange={(e) => setFormScrapNotes(e.target.value)}
              className="w-full p-2.5 rounded-[8px] border border-slate-300 text-xs focus:outline-none focus:border-[#2B6CB0]"
              placeholder="Vd: Lỗi lệch góc chấn CNC do phôi tôn dày không đều..."
            />
          </div>
        </div>
      </Modal>

      {/* Modal Xem Chi Tiết Ca */}
      {selectedShift && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Chi tiết ca: ${selectedShift.orderCode} - ${selectedShift.shiftName}`}
          subtitle={`Thời gian ghi nhận: ${selectedShift.recordedAt}`}
          maxWidth="md"
        >
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-[8px] border border-slate-200 space-y-1.5">
              <div><strong>Thành phẩm:</strong> {selectedShift.finishedProductName}</div>
              <div><strong>Xưởng gia công:</strong> {selectedShift.workshop}</div>
              <div><strong>Tổ trưởng phụ trách:</strong> {selectedShift.operator}</div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-[8px] bg-slate-50 border border-slate-200">
              <div>
                <div className="text-slate-400">Mục tiêu</div>
                <div className="text-sm font-bold text-slate-800">{selectedShift.targetQty}</div>
              </div>
              <div>
                <div className="text-slate-400">Đạt</div>
                <div className="text-sm font-bold text-emerald-700">{selectedShift.actualQty}</div>
              </div>
              <div>
                <div className="text-slate-400">Lỗi/Hỏng</div>
                <div className="text-sm font-bold text-rose-600">{selectedShift.defectQty}</div>
              </div>
            </div>

            {selectedShift.scrapReportNotes && (
              <div className="p-3 bg-rose-50 text-rose-800 rounded-[8px] border border-rose-200">
                <strong>Báo cáo nguyên nhân hao hụt:</strong>
                <p className="mt-1">{selectedShift.scrapReportNotes}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
