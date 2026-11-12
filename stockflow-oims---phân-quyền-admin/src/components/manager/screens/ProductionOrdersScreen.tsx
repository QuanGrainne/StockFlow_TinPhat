// src/components/manager/screens/ProductionOrdersScreen.tsx
// Màn hình Lập và Quản lý Kế hoạch Sản xuất (Manager - Production Orders)

import React, { useState, useEffect } from 'react';
import { ProductionOrder, BomFormula } from '../../../types';
import { managerService } from '../../../services/managerService';
import { DataTable, Column } from '../../common/DataTable';
import { Modal } from '../../common/Modal';
import {
  Plus,
  GitMerge,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Cpu,
} from 'lucide-react';

export const ProductionOrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [boms, setBoms] = useState<BomFormula[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBomId, setSelectedBomId] = useState('');
  const [targetQuantity, setTargetQuantity] = useState<number>(100);
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedWorkshop, setAssignedWorkshop] = useState('Xưởng Cắt & Chấn dập 1');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordList, bomList] = await Promise.all([
        managerService.getProductionOrders(),
        managerService.getBoms(),
      ]);
      setOrders(ordList);
      setBoms(bomList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setSelectedBomId(boms[0]?.id || '');
    setTargetQuantity(100);
    setStartDate(new Date().toISOString().split('T')[0]);
    setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
    setAssignedWorkshop('Xưởng Cắt & Chấn dập 1');
    setNotes('');
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleCreateOrder = async () => {
    if (!selectedBomId) {
      setErrorMsg('Vui lòng chọn công thức định mức BOM sản phẩm');
      return;
    }
    if (!targetQuantity || targetQuantity <= 0) {
      setErrorMsg('Số lượng sản xuất mục tiêu phải lớn hơn 0');
      return;
    }

    const bom = boms.find((b) => b.id === selectedBomId);
    if (!bom) return;

    setIsSaving(true);
    setErrorMsg('');

    try {
      await managerService.createProductionOrder({
        bomId: bom.id,
        finishedProductId: bom.finishedProductId,
        finishedProductName: bom.finishedProductName,
        targetQuantity: Number(targetQuantity),
        startDate: startDate || '20/10/2026',
        dueDate: dueDate || '28/10/2026',
        assignedWorkshop,
        notes,
      });

      setModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi tạo lệnh sản xuất');
    } finally {
      setIsSaving(false);
    }
  };

  const columns: Column<ProductionOrder>[] = [
    {
      header: 'Mã lệnh sản xuất',
      accessor: 'mfgOrderCode',
      width: '140px',
      render: (row) => (
        <span className="font-mono font-bold text-[#2B6CB0]">{row.mfgOrderCode}</span>
      ),
    },
    {
      header: 'Thành phẩm cần sản xuất',
      accessor: 'finishedProductName',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-800">{row.finishedProductName}</div>
          <div className="text-[11px] text-slate-400 font-mono">Định mức: {row.bomId}</div>
        </div>
      ),
    },
    {
      header: 'Tiến độ hoàn thành',
      align: 'center',
      width: '180px',
      render: (row) => {
        const percent = Math.min(
          100,
          Math.round((row.completedQuantity / (row.targetQuantity || 1)) * 100)
        );

        return (
          <div className="w-full max-w-[140px] mx-auto space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-slate-700">
              <span>{row.completedQuantity} / {row.targetQuantity} cây</span>
              <span>{percent}%</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  percent === 100 ? 'bg-emerald-500' : 'bg-[#2B6CB0]'
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      header: 'Xưởng thực hiện',
      accessor: 'assignedWorkshop',
      width: '160px',
      render: (row) => <span className="text-slate-700">{row.assignedWorkshop}</span>,
    },
    {
      header: 'Thời gian thực hiện',
      width: '160px',
      render: (row) => (
        <div className="text-slate-600 text-[11px]">
          <div>Bắt đầu: {row.startDate}</div>
          <div className="text-slate-400">Hạn giao: {row.dueDate}</div>
        </div>
      ),
    },
    {
      header: 'Trạng thái',
      accessor: 'status',
      align: 'center',
      width: '130px',
      render: (row) => {
        switch (row.status) {
          case 'PLANNED':
            return (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                Đã lên lịch
              </span>
            );
          case 'IN_PROGRESS':
            return (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#2B6CB0] border border-blue-200">
                Đang gia công
              </span>
            );
          case 'COMPLETED':
            return (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Hoàn thành
              </span>
            );
          default:
            return <span>{row.status}</span>;
        }
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Kế hoạch & Lệnh sản xuất (Production Orders)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quyền hạn Quản lý: Lập kế hoạch sản xuất dựa trên BOM và điều phối đến các phân xưởng
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="h-9 px-4 rounded-[8px] bg-[#2B6CB0] hover:bg-[#23568c] text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
        >
          <Plus size={16} />
          <span>Lập lệnh sản xuất mới</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        keyField="id"
        isLoading={loading}
        searchPlaceholder="Tìm theo mã lệnh SX, tên sản phẩm..."
      />

      {/* Modal Lập Lệnh SX */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Lập lệnh sản xuất mới (Manufacturing Order)"
        subtitle="Hệ thống tự động tính toán nhu cầu nguyên vật liệu dựa trên công thức BOM"
        onSave={handleCreateOrder}
        saveText="Tạo lệnh sản xuất"
        isSaving={isSaving}
        maxWidth="lg"
      >
        {errorMsg && (
          <div className="p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Cpu size={14} className="text-[#2B6CB0]" />
            <span>Chọn công thức định mức sản phẩm (BOM Formula) <span className="text-rose-500">*</span></span>
          </label>
          <select
            value={selectedBomId}
            onChange={(e) => setSelectedBomId(e.target.value)}
            className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          >
            {boms.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bomCode} — {b.finishedProductName} ({b.version})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số lượng sản xuất mục tiêu <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(Number(e.target.value))}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 font-bold focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Phân xưởng thực hiện
            </label>
            <select
              value={assignedWorkshop}
              onChange={(e) => setAssignedWorkshop(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            >
              <option value="Xưởng Cắt & Chấn dập 1">Xưởng Cắt & Chấn dập 1</option>
              <option value="Xưởng Đột dập CNC">Xưởng Đột dập CNC</option>
              <option value="Xưởng Sơn tĩnh điện tự động">Xưởng Sơn tĩnh điện tự động</option>
              <option value="Tổ Lắp ráp & Đóng gói">Tổ Lắp ráp & Đóng gói</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Hạn giao hàng</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-9 px-3 rounded-[6px] border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú lệnh sản xuất</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Yêu cầu kiểm tra phôi, gắp hàng, đóng bao bì..."
            className="w-full p-2.5 border border-slate-300 rounded-[6px] text-xs resize-none text-slate-800 focus:outline-none focus:border-[#2B6CB0]"
          />
        </div>
      </Modal>
    </div>
  );
};
