// src/features/production/screens/ProductionPlanImportScreen.tsx
// Màn hình 3.2.3.1: Nhận & Import Kế hoạch Sản xuất (Excel / CSV)

import React, { useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Trash2,
  Check,
  X,
  FileCheck,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ProductionPlanImportScreenProps {
  onNavigate?: (screenId: string) => void;
  onApprovePlan?: () => void;
}

interface PlanItem {
  id: string;
  poCode: string;
  sku: string;
  productName: string;
  note: string;
  unit: string;
  plannedQty: number;
  deliveryDate: string;
  workshop: string;
  bomCode: string;
  status: 'VALID' | 'WARNING';
  warningMessage?: string;
}

const INITIAL_PLAN_ITEMS: PlanItem[] = [
  {
    id: 'item-1',
    poCode: 'PO-2026-001',
    sku: 'PK-CTN-01',
    productName: 'Hộp carton sóng 5 lớp 40x30x20cm (In Logo)',
    note: 'Theo đơn đặt hàng PO-2026-001 của Đại lý Bao Bì Miền Bắc',
    unit: 'Cái',
    plannedQty: 6500,
    deliveryDate: '2026-10-25',
    workshop: 'Phân xưởng Bao bì Đông Anh',
    bomCode: 'BOM-CTN-5L-V2',
    status: 'VALID',
  },
  {
    id: 'item-2',
    poCode: 'PO-2026-002',
    sku: 'MB-PE-02',
    productName: 'Màng bọc co PE công nghiệp 50cm x 15Micron',
    note: 'Quy cách cuộn lõi giấy 76mm, giao trước 17h',
    unit: 'Cuộn',
    plannedQty: 1500,
    deliveryDate: '2026-10-26',
    workshop: 'Phân xưởng Đùn Nhựa Gia Lâm',
    bomCode: 'BOM-PE-50CM-STD',
    status: 'VALID',
  },
  {
    id: 'item-3',
    poCode: 'PO-2026-003',
    sku: 'TM-DEC-03',
    productName: 'Tem nhãn mã vạch nhiệt Direct Thermal 100x150mm',
    note: 'Cuộn 500 nhãn/cuộn, chống ẩm',
    unit: 'Cuộn',
    plannedQty: 4000,
    deliveryDate: '2026-10-28',
    workshop: 'Xưởng In & Cắt Bế Offset',
    bomCode: 'BOM-DECAL-THERMAL',
    status: 'VALID',
  },
  {
    id: 'item-4',
    poCode: 'PO-2026-007',
    sku: 'TG-KFT-04',
    productName: 'Túi giấy kraft có quai 28x20x10cm đáy vuông',
    note: 'Định lượng giấy 120gsm',
    unit: 'Cái',
    plannedQty: 10000,
    deliveryDate: '2026-10-30',
    workshop: 'Phân xưởng Gia công Túi',
    bomCode: 'BOM-BAG-KRAFT-V1',
    status: 'VALID',
  },
  {
    id: 'item-5',
    poCode: 'PO-2026-008',
    sku: 'KP-BOX-99',
    productName: 'Khay nhựa blister định hình PVC 0.4mm',
    note: 'Cần kiểm tra định lượng phôi nhựa trước khi chạy',
    unit: 'Khay',
    plannedQty: 3200,
    deliveryDate: '2026-10-29',
    workshop: 'Phân xưởng Ép Nhiệt',
    bomCode: 'BOM-BLISTER-PVC',
    status: 'WARNING',
    warningMessage: 'Khuôn ép nhiệt có lịch kiểm định kỹ thuật ngày 24/10',
  },
];

export const ProductionPlanImportScreen: React.FC<ProductionPlanImportScreenProps> = ({
  onNavigate,
  onApprovePlan,
}) => {
  const [hasFile, setHasFile] = useState(true);
  const [fileName, setFileName] = useState('Ke_hoach_san_xuat_Tuan_43_2026_TinPhat.xlsx');
  const [fileSize, setFileSize] = useState('148.5 KB');
  const [planItems, setPlanItems] = useState<PlanItem[]>(INITIAL_PLAN_ITEMS);
  const [filterTab, setFilterTab] = useState<'ALL' | 'VALID' | 'WARNING'>('ALL');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Handle edit quantity directly
  const handleQtyChange = (id: string, val: number) => {
    setPlanItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, plannedQty: val } : item))
    );
  };

  // Handle edit delivery date
  const handleDateChange = (id: string, val: string) => {
    setPlanItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, deliveryDate: val } : item))
    );
  };

  const handleRemoveFile = () => {
    setHasFile(false);
  };

  const handleLoadSample = () => {
    setHasFile(true);
    setFileName('Ke_hoach_san_xuat_Tuan_43_2026_TinPhat.xlsx');
    setFileSize('148.5 KB');
    setPlanItems(INITIAL_PLAN_ITEMS);
    setSuccessToast('Đã tải lại tệp kế hoạch mẫu PO-2026-001');
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleApproveAndCreateOrders = () => {
    setSuccessToast(
      `Đã phê duyệt và khởi tạo thành công ${planItems.length} Lệnh sản xuất vào hệ thống!`
    );
    setTimeout(() => {
      setSuccessToast(null);
      if (onApprovePlan) {
        onApprovePlan();
      } else if (onNavigate) {
        onNavigate('production-orders');
      }
    }, 1200);
  };

  const validCount = planItems.filter((i) => i.status === 'VALID').length;
  const warningCount = planItems.filter((i) => i.status === 'WARNING').length;
  const totalQty = planItems.reduce((acc, curr) => acc + (Number(curr.plannedQty) || 0), 0);

  const filteredItems = planItems.filter((item) => {
    if (filterTab === 'VALID') return item.status === 'VALID';
    if (filterTab === 'WARNING') return item.status === 'WARNING';
    return true;
  });

  return (
    <div className="p-6 bg-slate-50/60 min-h-screen text-slate-800 space-y-6">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-bounce">
          <CheckCircle2 size={20} />
          <span className="text-sm font-medium">{successToast}</span>
        </div>
      )}

      {/* Screen Sub-Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 uppercase tracking-wider border border-blue-200">
              KẾ HOẠCH SẢN XUẤT • Đặc tả 3.2.3.1
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Nhận & Import Kế hoạch Sản xuất (Excel / CSV)
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Nhân viên văn phòng tải file kế hoạch được duyệt từ ban quản lý. Kéo thả file, kiểm tra thanh tiến độ và chỉnh sửa trực tiếp trên Data Table trước khi tạo Lệnh sản xuất.
          </p>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setSuccessToast('Đang tải file mẫu: Mau_Ke_Hoach_San_Xuat_TinPhat.xlsx');
              setTimeout(() => setSuccessToast(null), 2500);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-2xs"
          >
            <Download size={14} className="text-slate-500" />
            <span>Tải file Excel mẫu</span>
          </button>
          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-50 text-[#1E56A0] border border-blue-200 text-xs font-semibold hover:bg-blue-100 transition shadow-2xs"
          >
            <RotateCcw size={14} className="text-[#1E56A0]" />
            <span>Dữ liệu mẫu (PO-2026-001)</span>
          </button>
        </div>
      </div>

      {/* Upload Box Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50/50 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 text-[#1E56A0] flex items-center justify-center mb-3">
            <UploadCloud size={24} />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">
            Kéo thả file kế hoạch sản xuất vào đây
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Hỗ trợ định dạng bảng tính .XLSX, .XLS, .CSV (Dung lượng tối đa 25MB)
          </p>
          <div className="flex items-center gap-3 mt-4">
            <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-semibold cursor-pointer transition shadow-2xs">
              <FileSpreadsheet size={15} />
              <span>Chọn file từ máy tính</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setHasFile(true);
                    setFileName(e.target.files[0].name);
                    setFileSize(`${(e.target.files[0].size / 1024).toFixed(1)} KB`);
                  }
                }}
              />
            </label>
            {hasFile && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 text-xs font-medium transition"
              >
                Gỡ file
              </button>
            )}
          </div>
        </div>

        {/* Uploaded File Banner */}
        {hasFile && (
          <div className="mt-4 p-3.5 rounded-lg border border-emerald-200/90 bg-emerald-50/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">
                    {fileName}{' '}
                    <span className="text-slate-400 font-normal">({fileSize})</span>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span>Tải lên thành công lúc Vừa xong</span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold">Đã nạp {planItems.length} dòng dữ liệu</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-700 font-mono">100%</span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  title="Xóa tệp"
                  className="text-slate-400 hover:text-rose-600 transition"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            {/* 100% Progress Bar */}
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full w-full" />
            </div>
          </div>
        )}
      </div>

      {/* Data Table Preview Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Top Header with Badges & Filter Tabs */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-slate-900">
                Data Table Preview Kế hoạch ({planItems.length} sản phẩm)
              </h2>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {validCount} Hợp lệ
              </span>
              {warningCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  {warningCount} Cần lưu ý
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Nhân viên có thể điều chỉnh trực tiếp số lượng kế hoạch hoặc ngày giao dự kiến trước khi lưu
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setFilterTab('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                filterTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({planItems.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('VALID')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                filterTab === 'VALID'
                  ? 'bg-white text-emerald-700 shadow-2xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              Hợp lệ ({validCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('WARNING')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                filterTab === 'WARNING'
                  ? 'bg-white text-amber-700 shadow-2xs'
                  : 'text-slate-600 hover:text-amber-700'
              }`}
            >
              Lưu ý ({warningCount})
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-3.5">MÃ ĐƠN PO</th>
                <th className="py-3 px-3">MÃ SP / SKU</th>
                <th className="py-3 px-4">TÊN SẢN PHẨM & QUY CÁCH</th>
                <th className="py-3 px-3 text-center">ĐVT</th>
                <th className="py-3 px-3 text-center">SỐ LƯỢNG KH</th>
                <th className="py-3 px-3 text-center">HẠN GIAO HÀNG</th>
                <th className="py-3 px-3.5">PHÂN XƯỞNG PHỤ TRÁCH</th>
                <th className="py-3 px-3 text-center">MÃ ĐỊNH MỨC BOM</th>
                <th className="py-3 px-4 text-center">TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                return (
                  <tr key={item.id} className="hover:bg-blue-50/20 transition group">
                    {/* Mã PO */}
                    <td className="py-3 px-3.5 font-mono font-medium text-slate-700">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-slate-800">
                        {item.poCode}
                      </span>
                    </td>

                    {/* SKU */}
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {item.sku}
                    </td>

                    {/* Tên sản phẩm & Quy cách */}
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 leading-snug">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        {item.note}
                      </div>
                    </td>

                    {/* ĐVT */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded text-[11px]">
                        {item.unit}
                      </span>
                    </td>

                    {/* Số lượng KH (Editable input) */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min={1}
                        value={item.plannedQty}
                        onChange={(e) => handleQtyChange(item.id, Number(e.target.value))}
                        className="w-24 text-center h-8 rounded border border-slate-300 font-mono font-bold text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </td>

                    {/* Hạn giao hàng (Editable date) */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="date"
                        value={item.deliveryDate}
                        onChange={(e) => handleDateChange(item.id, e.target.value)}
                        className="h-8 px-2 rounded border border-slate-300 text-xs text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                      />
                    </td>

                    {/* Phân xưởng phụ trách */}
                    <td className="py-3 px-3.5">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Building2 size={13} className="text-slate-400 shrink-0" />
                        <span>{item.workshop}</span>
                      </div>
                    </td>

                    {/* Mã định mức BOM */}
                    <td className="py-3 px-3 text-center">
                      <span className="font-mono text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        {item.bomCode}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3 px-4 text-center">
                      {item.status === 'VALID' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} />
                          Hợp lệ
                        </span>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle size={12} />
                            Lưu ý
                          </span>
                          {item.warningMessage && (
                            <span className="text-[10px] text-amber-600 mt-0.5 font-medium max-w-[160px] leading-tight">
                              {item.warningMessage}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary & Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-slate-500">Tổng số mặt hàng:</span>{' '}
              <strong className="text-slate-800 font-mono">{planItems.length} mã</strong>
            </div>
            <span className="text-slate-300">|</span>
            <div>
              <span className="text-slate-500">Tổng sản lượng KH:</span>{' '}
              <strong className="text-blue-700 font-mono text-sm">
                {totalQty.toLocaleString('vi-VN')} ĐVT
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (onNavigate) onNavigate('production-orders');
              }}
              className="px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleApproveAndCreateOrders}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <FileCheck size={15} />
              <span>Phê duyệt & Khởi tạo Lệnh sản xuất ({planItems.length} lệnh) →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
