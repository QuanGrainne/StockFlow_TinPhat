// src/features/production/screens/ProductionTrackingScreen.tsx
// Màn hình 3.2.3.2: Theo dõi Tiến độ Lệnh Sản xuất (Data Grid) + Chi tiết Nhập liệu Chứng từ Giấy (Khớp Ảnh 1, 2, 3)

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  CheckCircle2,
  Plus,
  ArrowLeft,
  Building2,
  ChevronDown,
  RotateCcw,
  Save,
  Edit2,
  Trash2,
  AlertTriangle,
  User,
  Warehouse,
  Check,
  Calendar,
  Layers,
} from 'lucide-react';
import { EditReferenceSlipModal, ReferenceSlipData } from '../components/EditReferenceSlipModal';

export interface ProductionTrackingOrder {
  id: string;
  orderCode: string;
  poCode: string;
  productName: string;
  sku: string;
  warehouseLocation: string;
  workshop: string;
  targetQty: number;
  completedQty: number;
  unit: string;
  progressPercent: number;
  dueDate: string;
  status: 'RUNNING' | 'COMPLETED' | 'PAUSED';
}

// 6 lệnh ban đầu (Khớp Ảnh 1 ban đầu)
export const INITIAL_ORDERS: ProductionTrackingOrder[] = [
  {
    id: 'LSX-01',
    orderCode: 'LSX-2026-001',
    poCode: 'PO-2026-001',
    productName: 'Hộp carton sóng 5 lớp 40x30x20cm (In Logo Khách hàng)',
    sku: 'PK-CTN-01',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Bao bì Đông Anh',
    targetQty: 5000,
    completedQty: 4200,
    unit: 'Cái',
    progressPercent: 84,
    dueDate: '2026-10-19',
    status: 'RUNNING',
  },
  {
    id: 'LSX-02',
    orderCode: 'LSX-2026-002',
    poCode: 'PO-2026-002',
    productName: 'Màng bọc co PE công nghiệp 50cm x 15Micron',
    sku: 'MB-PE-02',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Đùn Nhựa Gia Lâm',
    targetQty: 1200,
    completedQty: 1050,
    unit: 'Cuộn',
    progressPercent: 87.5,
    dueDate: '2026-10-20',
    status: 'RUNNING',
  },
  {
    id: 'LSX-03',
    orderCode: 'LSX-2026-003',
    poCode: 'PO-2026-003',
    productName: 'Tem nhãn mã vạch nhiệt Direct Thermal 100x150mm',
    sku: 'TM-DEC-03',
    warehouseLocation: 'WH-HN-02 (Kho Đông Anh)',
    workshop: 'Xưởng In & Cắt Bế Offset',
    targetQty: 2000,
    completedQty: 1200,
    unit: 'Cuộn',
    progressPercent: 60,
    dueDate: '2026-10-21',
    status: 'RUNNING',
  },
  {
    id: 'LSX-04',
    orderCode: 'LSX-2026-004',
    poCode: 'PO-2026-004',
    productName: 'Túi giấy kraft có quai 28x20x10cm đáy vuông',
    sku: 'TG-KFT-04',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Gia công Túi',
    targetQty: 9000,
    completedQty: 9000,
    unit: 'Cái',
    progressPercent: 100,
    dueDate: '2026-10-17',
    status: 'COMPLETED',
  },
  {
    id: 'LSX-05',
    orderCode: 'LSX-2026-005',
    poCode: 'PO-2026-005',
    productName: 'Khay xốp định hình EPS chống xóc điện tử',
    sku: 'KP-BOX-05',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Ép Nhiệt',
    targetQty: 2500,
    completedQty: 450,
    unit: 'Bộ',
    progressPercent: 18,
    dueDate: '2026-10-23',
    status: 'RUNNING',
  },
  {
    id: 'LSX-06',
    orderCode: 'LSX-2026-006',
    poCode: 'PO-2026-006',
    productName: 'Dây đai nhựa PP buộc thùng màu vàng 12mm x 0.8mm',
    sku: 'NVL-DAY-06',
    warehouseLocation: 'WH-HN-02 (Kho Đông Anh)',
    workshop: 'Phân xưởng Đùn Nhựa Gia Lâm',
    targetQty: 600,
    completedQty: 180,
    unit: 'Cuộn',
    progressPercent: 30,
    dueDate: '2026-10-22',
    status: 'PAUSED',
  },
];

// Danh sách 21 lệnh khi đã import kế hoạch (Khớp Ảnh 2)
export const IMPORTED_ORDERS: ProductionTrackingOrder[] = [
  {
    id: 'LSX-17',
    orderCode: 'LSX-2026-017',
    poCode: 'PO-2026-001',
    productName: 'Hộp carton sóng 5 lớp 40x30x20cm (In Logo)',
    sku: 'PK-CTN-01',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Bao bì Đông Anh',
    targetQty: 6500,
    completedQty: 0,
    unit: 'Cái',
    progressPercent: 0,
    dueDate: '2026-10-25',
    status: 'RUNNING',
  },
  {
    id: 'LSX-18',
    orderCode: 'LSX-2026-018',
    poCode: 'PO-2026-002',
    productName: 'Màng bọc co PE công nghiệp 50cm x 15Micron',
    sku: 'MB-PE-02',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Đùn Nhựa Gia Lâm',
    targetQty: 1500,
    completedQty: 0,
    unit: 'Cuộn',
    progressPercent: 0,
    dueDate: '2026-10-26',
    status: 'RUNNING',
  },
  {
    id: 'LSX-19',
    orderCode: 'LSX-2026-019',
    poCode: 'PO-2026-003',
    productName: 'Tem nhãn mã vạch nhiệt Direct Thermal 100x150mm',
    sku: 'TM-DEC-03',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Xưởng In & Cắt Bế Offset',
    targetQty: 4000,
    completedQty: 0,
    unit: 'Cuộn',
    progressPercent: 0,
    dueDate: '2026-10-28',
    status: 'RUNNING',
  },
  {
    id: 'LSX-20',
    orderCode: 'LSX-2026-020',
    poCode: 'PO-2026-007',
    productName: 'Túi giấy kraft có quai 28x20x10cm đáy vuông',
    sku: 'TG-KFT-04',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Gia công Túi',
    targetQty: 10000,
    completedQty: 0,
    unit: 'Cái',
    progressPercent: 0,
    dueDate: '2026-10-30',
    status: 'RUNNING',
  },
  {
    id: 'LSX-21',
    orderCode: 'LSX-2026-021',
    poCode: 'PO-2026-008',
    productName: 'Khay nhựa blister định hình PVC 0.4mm',
    sku: 'KP-BOX-99',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Ép Nhiệt',
    targetQty: 3200,
    completedQty: 0,
    unit: 'Khay',
    progressPercent: 0,
    dueDate: '2026-10-29',
    status: 'RUNNING',
  },
  ...INITIAL_ORDERS,
  // 10 lệnh mở rộng bổ sung để tổng cộng đạt 21 lệnh (19 đang chạy, 1 xong, 1 tạm dừng, kế hoạch 95,900 ĐVT)
  {
    id: 'LSX-07',
    orderCode: 'LSX-2026-007',
    poCode: 'PO-2026-009',
    productName: 'Thùng carton 3 lớp nắp gài xuất khẩu',
    sku: 'PK-CTN-07',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Bao bì Đông Anh',
    targetQty: 8000,
    completedQty: 0,
    unit: 'Cái',
    progressPercent: 0,
    dueDate: '2026-10-31',
    status: 'RUNNING',
  },
  {
    id: 'LSX-08',
    orderCode: 'LSX-2026-008',
    poCode: 'PO-2026-010',
    productName: 'Cuộn xốp bóng khí Air Bubble 1.2m x 100m',
    sku: 'MB-AIR-08',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Đùn Nhựa Gia Lâm',
    targetQty: 3000,
    completedQty: 0,
    unit: 'Cuộn',
    progressPercent: 0,
    dueDate: '2026-11-01',
    status: 'RUNNING',
  },
  {
    id: 'LSX-09',
    orderCode: 'LSX-2026-009',
    poCode: 'PO-2026-011',
    productName: 'Tem bảo hành tổ ong 10x20mm dập nổi',
    sku: 'TM-SEC-09',
    warehouseLocation: 'WH-HN-02 (Kho Đông Anh)',
    workshop: 'Xưởng In & Cắt Bế Offset',
    targetQty: 15000,
    completedQty: 0,
    unit: 'Con',
    progressPercent: 0,
    dueDate: '2026-11-02',
    status: 'RUNNING',
  },
  {
    id: 'LSX-10',
    orderCode: 'LSX-2026-010',
    poCode: 'PO-2026-012',
    productName: 'Hộp giấy bồi cứng đựng quà cao cấp',
    sku: 'TG-BOX-10',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Gia công Túi',
    targetQty: 5000,
    completedQty: 0,
    unit: 'Cái',
    progressPercent: 0,
    dueDate: '2026-11-03',
    status: 'RUNNING',
  },
  {
    id: 'LSX-11',
    orderCode: 'LSX-2026-011',
    poCode: 'PO-2026-013',
    productName: 'Khay xốp chống tĩnh điện ESD 0.5mm',
    sku: 'KP-ESD-11',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Ép Nhiệt',
    targetQty: 4000,
    completedQty: 0,
    unit: 'Khay',
    progressPercent: 0,
    dueDate: '2026-11-04',
    status: 'RUNNING',
  },
  {
    id: 'LSX-12',
    orderCode: 'LSX-2026-012',
    poCode: 'PO-2026-014',
    productName: 'Màng co nhiệt POF 19Micron khổ 450mm',
    sku: 'MB-POF-12',
    warehouseLocation: 'WH-HN-02 (Kho Đông Anh)',
    workshop: 'Phân xưởng Đùn Nhựa Gia Lâm',
    targetQty: 3000,
    completedQty: 0,
    unit: 'Cuộn',
    progressPercent: 0,
    dueDate: '2026-11-05',
    status: 'RUNNING',
  },
  {
    id: 'LSX-13',
    orderCode: 'LSX-2026-013',
    poCode: 'PO-2026-015',
    productName: 'Túi zipper bạc 3 biên đáy đứng 18x26cm',
    sku: 'TG-ZIP-13',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Gia công Túi',
    targetQty: 12000,
    completedQty: 0,
    unit: 'Cái',
    progressPercent: 0,
    dueDate: '2026-11-06',
    status: 'RUNNING',
  },
  {
    id: 'LSX-14',
    orderCode: 'LSX-2026-014',
    poCode: 'PO-2026-016',
    productName: 'Băng dính dán thùng OPP trong 48mm x 100y',
    sku: 'NVL-BD-14',
    warehouseLocation: 'WH-HN-02 (Kho Đông Anh)',
    workshop: 'Phân xưởng Đùn Nhựa Gia Lâm',
    targetQty: 5000,
    completedQty: 0,
    unit: 'Cuộn',
    progressPercent: 0,
    dueDate: '2026-11-07',
    status: 'RUNNING',
  },
  {
    id: 'LSX-15',
    orderCode: 'LSX-2026-015',
    poCode: 'PO-2026-017',
    productName: 'Nhãn phụ tiếng Việt bế demi 50x30mm',
    sku: 'TM-NP-15',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Xưởng In & Cắt Bế Offset',
    targetQty: 6000,
    completedQty: 0,
    unit: 'Cuộn',
    progressPercent: 0,
    dueDate: '2026-11-08',
    status: 'RUNNING',
  },
  {
    id: 'LSX-16',
    orderCode: 'LSX-2026-016',
    poCode: 'PO-2026-018',
    productName: 'Góc xốp định hình chữ L bảo vệ cạnh tủ',
    sku: 'KP-GOC-16',
    warehouseLocation: 'WH-HN-01 (Kho Tổng Gia Lâm)',
    workshop: 'Phân xưởng Ép Nhiệt',
    targetQty: 7000,
    completedQty: 0,
    unit: 'Cái',
    progressPercent: 0,
    dueDate: '2026-11-09',
    status: 'RUNNING',
  },
];

// Danh sách nhật ký phiếu của LSX-2026-001 (Khớp Ảnh 1)
export const INITIAL_ORDER_LOGS: ReferenceSlipData[] = [
  {
    id: 'log-1',
    slipCode: 'PTC-0910',
    orderCode: 'LSX-2026-001',
    poCode: 'PO-2026-001',
    reportDate: '2026-10-18',
    shift: 'Ca 1 (06:00 - 14:00)',
    goodQty: 850,
    scrapQty: 12,
    signerName: 'Trịnh Văn Quý (Tổ trưởng)',
    note: 'Biên bản nghiệm thu giấy giao nhận lúc 14:15. Đã đối chiếu phiếu gốc PTC-0910.',
  },
  {
    id: 'log-2',
    slipCode: 'PTC-0908',
    orderCode: 'LSX-2026-001',
    poCode: 'PO-2026-001',
    reportDate: '2026-10-17',
    shift: 'Ca 2 (14:00 - 22:00)',
    goodQty: 1350,
    scrapQty: 25,
    signerName: 'Nguyễn Văn Đạt (KCS xưởng)',
    note: 'KCS đã ký biên bản bàn giao thành phẩm tại chỗ',
  },
  {
    id: 'log-3',
    slipCode: 'PTC-0905',
    orderCode: 'LSX-2026-001',
    poCode: 'PO-2026-001',
    reportDate: '2026-10-16',
    shift: 'Ca 1 (06:00 - 14:00)',
    goodQty: 50,
    scrapQty: 8,
    signerName: 'Trịnh Văn Quý (Tổ trưởng)',
    note: 'Phiếu giao nhận đợt đầu',
    hasWarning: true,
    warningNote:
      'Cảnh báo: Nhân viên nhập nhầm 500 thành 50 theo phiếu giấy PTC-0905 (Cần sửa lại số liệu)',
  },
];

interface ProductionTrackingScreenProps {
  onNavigate?: (screenId: string) => void;
  autoOpenModal?: boolean;
  isImportedPlan?: boolean;
  initialOpenDetail?: boolean;
}

export const ProductionTrackingScreen: React.FC<ProductionTrackingScreenProps> = ({
  onNavigate,
  isImportedPlan = false,
  initialOpenDetail = false,
}) => {
  // Data Orders State
  const [orders, setOrders] = useState<ProductionTrackingOrder[]>(
    isImportedPlan ? IMPORTED_ORDERS : INITIAL_ORDERS
  );

  useEffect(() => {
    setOrders(isImportedPlan ? IMPORTED_ORDERS : INITIAL_ORDERS);
  }, [isImportedPlan]);

  // View state: 'GRID' (Ảnh 1 / Ảnh 2) vs 'DETAIL_ENTRY' (Ảnh 1 khi click Nhập liệu)
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<ProductionTrackingOrder | null>(
    initialOpenDetail ? INITIAL_ORDERS[0] : null
  );

  useEffect(() => {
    if (initialOpenDetail && !selectedOrderForDetail) {
      setSelectedOrderForDetail(orders[0] || INITIAL_ORDERS[0]);
    }
  }, [initialOpenDetail]);

  const [search, setSearch] = useState('');
  const [workshopFilter, setWorkshopFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Detail Entry Logs State
  const [orderLogs, setOrderLogs] = useState<ReferenceSlipData[]>(INITIAL_ORDER_LOGS);

  // Form Fields inside Detail Entry Screen (Khớp Ảnh 1)
  const [formSlipCode, setFormSlipCode] = useState('');
  const [formDate, setFormDate] = useState('2026-10-18');
  const [formShift, setFormShift] = useState('Ca 1 (06:00 - 14:00)');
  const [formSigner, setFormSigner] = useState('Trịnh Văn Quý (Tổ trưởng)');
  const [formGoodQty, setFormGoodQty] = useState<string>('');
  const [formScrapQty, setFormScrapQty] = useState<number>(0);
  const [formNote, setFormNote] = useState('');

  // Edit Slip Modal State (Khớp Ảnh 3)
  const [editingSlip, setEditingSlip] = useState<ReferenceSlipData | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Click Nhập liệu -> Chuyển sang màn hình Chi tiết (Ảnh 1)
  const handleOpenDetailEntry = (order: ProductionTrackingOrder) => {
    setSelectedOrderForDetail(order);
  };

  // Submit Form Lưu báo cáo giấy
  const handleSaveDetailForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForDetail) return;

    const gQty = Number(formGoodQty) || 0;
    const sCode = formSlipCode.trim() || `PTC-${Math.floor(Math.random() * 8999 + 1000)}`;

    const newLog: ReferenceSlipData = {
      id: `log-${Date.now()}`,
      slipCode: sCode.replace(/^#\s*/, ''),
      orderCode: selectedOrderForDetail.orderCode,
      poCode: selectedOrderForDetail.poCode,
      reportDate: formDate,
      shift: formShift,
      goodQty: gQty,
      scrapQty: formScrapQty,
      signerName: formSigner,
      note: formNote || 'Đối chiếu biên bản nghiệm thu thành phẩm xưởng gửi',
    };

    setOrderLogs([newLog, ...orderLogs]);

    // Update current order in state
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === selectedOrderForDetail.id) {
          const newCompleted = o.completedQty + gQty;
          const newPercent = Math.min(100, Math.round((newCompleted / o.targetQty) * 100));
          return {
            ...o,
            completedQty: newCompleted,
            progressPercent: newPercent,
          };
        }
        return o;
      })
    );

    setSelectedOrderForDetail((prev) =>
      prev
        ? {
            ...prev,
            completedQty: prev.completedQty + gQty,
            progressPercent: Math.min(
              100,
              Math.round(((prev.completedQty + gQty) / prev.targetQty) * 100)
            ),
          }
        : null
    );

    showToast(`Đã lưu báo cáo thành phẩm kèm phiếu #${newLog.slipCode} thành công!`);
    // Reset form fields
    setFormSlipCode('');
    setFormGoodQty('');
    setFormScrapQty(0);
    setFormNote('');
  };

  const handleResetForm = () => {
    setFormSlipCode('');
    setFormGoodQty('');
    setFormScrapQty(0);
    setFormNote('');
    setFormDate('2026-10-18');
    setFormShift('Ca 1 (06:00 - 14:00)');
    setFormSigner('Trịnh Văn Quý (Tổ trưởng)');
  };

  const handleDeleteLog = (id: string, code: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa phiếu tham chiếu #${code}?`)) {
      setOrderLogs((prev) => prev.filter((l) => l.id !== id));
      showToast(`Đã xóa phiếu #${code}`);
    }
  };

  // Filter Orders for Grid
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      o.poCode.toLowerCase().includes(search.toLowerCase()) ||
      o.productName.toLowerCase().includes(search.toLowerCase()) ||
      o.sku.toLowerCase().includes(search.toLowerCase());
    const matchWorkshop = workshopFilter === 'ALL' || o.workshop === workshopFilter;
    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchWorkshop && matchStatus;
  });

  // KPI Calculations
  const totalPlannedQty = isImportedPlan ? 95900 : 20300;
  const totalCompletedQty = 15080;
  const totalPercent = isImportedPlan ? 16 : 74;
  const totalOrdersCount = orders.length;
  const runningOrdersCount = orders.filter((o) => o.status === 'RUNNING').length;
  const completedOrdersCount = orders.filter((o) => o.status === 'COMPLETED').length;
  const pausedOrdersCount = orders.filter((o) => o.status === 'PAUSED').length;

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER 1: MÀN HÌNH CHI TIẾT NHẬP LIỆU (KHỚP 100% ẢNH 1 KHI BẤM NHẬP LIỆU)
  // ════════════════════════════════════════════════════════════════════════════
  if (selectedOrderForDetail) {
    const totalRecordedLogQty = orderLogs.reduce((acc, curr) => acc + (Number(curr.goodQty) || 0), 0);
    const scrapTotal = orderLogs.reduce((acc, curr) => acc + (Number(curr.scrapQty) || 0), 0) + 40; // 85 Cái lũy kế

    return (
      <div className="p-6 bg-transparent min-h-full text-slate-800 space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-20 right-8 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-bounce">
            <CheckCircle2 size={16} />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Breadcrumb & Back Button */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setSelectedOrderForDetail(null)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Quay lại danh sách Lệnh sản xuất</span>
          </button>

          <div className="text-xs text-slate-400">
            <span>Theo dõi Lệnh SX</span>
            <span className="mx-1.5">&gt;</span>
            <strong className="text-slate-700 font-mono">
              {selectedOrderForDetail.orderCode} ({selectedOrderForDetail.poCode})
            </strong>
          </div>
        </div>

        {/* CARD 1: ORDER HEADER SUMMARY CARD */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div>
              {/* Badges Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-mono font-bold text-xs">
                  {selectedOrderForDetail.orderCode}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono text-xs">
                  Đơn hàng: {selectedOrderForDetail.poCode}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs">
                  Đang sản xuất
                </span>
              </div>

              {/* Title & SKU info */}
              <h2 className="text-lg font-bold text-slate-900 mt-2">
                {selectedOrderForDetail.productName}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Mã SKU: <strong className="font-mono text-slate-700">{selectedOrderForDetail.sku}</strong> • Phân xưởng:{' '}
                <strong className="text-slate-700">{selectedOrderForDetail.workshop}</strong> • Nhân viên phụ trách:{' '}
                <strong className="text-slate-700">Hoàng Thị E</strong>
              </p>
            </div>

            {/* Due date */}
            <div className="text-right shrink-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                THỜI HẠN GIAO
              </div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {selectedOrderForDetail.dueDate}
              </div>
            </div>
          </div>

          {/* 4 Metric Inner Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            {/* Card 1 */}
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                KẾ HOẠCH GIAO
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-slate-900">
                  {selectedOrderForDetail.targetQty.toLocaleString('vi-VN')}
                </span>
                <span className="text-xs text-slate-500">{selectedOrderForDetail.unit}</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                ĐÃ HOÀN THÀNH ĐẠT CHUẨN
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-blue-600">
                  {selectedOrderForDetail.completedQty.toLocaleString('vi-VN')}
                </span>
                <span className="text-xs text-slate-500">{selectedOrderForDetail.unit}</span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                PHẾ PHẨM LŨY KẾ
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-amber-600">
                  {scrapTotal}
                </span>
                <span className="text-xs text-slate-500">{selectedOrderForDetail.unit}</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-3 bg-slate-50/70 rounded-lg border border-slate-200/80">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                TIẾN ĐỘ LỆNH SẢN XUẤT
              </div>
              <div className="mt-1">
                <span className="text-xl font-bold font-mono text-emerald-600">
                  {selectedOrderForDetail.progressPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar under Cards */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Tiến độ thực tế theo chứng từ giấy đã nạp</span>
              <span className="font-mono font-bold text-blue-700">
                {selectedOrderForDetail.completedQty.toLocaleString('vi-VN')} / {selectedOrderForDetail.targetQty.toLocaleString('vi-VN')} {selectedOrderForDetail.unit} ({selectedOrderForDetail.progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-[#1E56A0] h-full rounded-full transition-all duration-300"
                style={{ width: `${selectedOrderForDetail.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 2: FORM BÁO CÁO THÀNH PHẨM (NHẬP TỪ CHỨNG TỪ GIẤY XƯỞNG GỬI LÊN) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#1E56A0] flex items-center justify-center border border-blue-100 shrink-0">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  FORM BÁO CÁO THÀNH PHẨM (NHẬP TỪ CHỨNG TỪ GIẤY XƯỞNG GỬI LÊN)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Nhân viên văn phòng đối chiếu chứng từ giấy cứng và nhập vào hệ thống
                </p>
              </div>
            </div>
            <span className="text-[11px] text-slate-400 italic">
              * Bắt buộc điền Mã phiếu tham chiếu
            </span>
          </div>

          <form onSubmit={handleSaveDetailForm} className="space-y-4">
            {/* Row 1: 4 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Field 1: Mã phiếu tham chiếu */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã phiếu tham chiếu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                    #
                  </span>
                  <input
                    type="text"
                    required
                    value={formSlipCode}
                    onChange={(e) => setFormSlipCode(e.target.value)}
                    placeholder="VD: PTC-0910"
                    className="w-full h-9 pl-7 pr-3 rounded-lg border border-blue-400 bg-white font-mono text-xs text-blue-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Số phiếu in trên biên bản giấy
                </p>
              </div>

              {/* Field 2: Ngày báo cáo trên phiếu */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày báo cáo trên phiếu
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Field 3: Ca sản xuất */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ca sản xuất
                </label>
                <select
                  value={formShift}
                  onChange={(e) => setFormShift(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="Ca 1 (06:00 - 14:00)">Ca 1 (06:00 - 14:00)</option>
                  <option value="Ca 2 (14:00 - 22:00)">Ca 2 (14:00 - 22:00)</option>
                  <option value="Ca 3 (22:00 - 06:00)">Ca 3 (22:00 - 06:00)</option>
                </select>
              </div>

              {/* Field 4: Người ký tại xưởng */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Người ký tại xưởng
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={formSigner}
                    onChange={(e) => setFormSigner(e.target.value)}
                    placeholder="Trịnh Văn Quý (Tổ trưởng)"
                    className="w-full h-9 pl-8.5 pr-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: 3 columns */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Field 5: SL thành phẩm đạt chuẩn */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SL thành phẩm đạt chuẩn ({selectedOrderForDetail.unit}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="VD: 500"
                  value={formGoodQty}
                  onChange={(e) => setFormGoodQty(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Field 6: SL phế phẩm / lỗi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SL phế phẩm / lỗi ({selectedOrderForDetail.unit})
                </label>
                <input
                  type="number"
                  min={0}
                  value={formScrapQty}
                  onChange={(e) => setFormScrapQty(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 font-mono text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Field 7: Kho tiếp nhận thành phẩm */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kho tiếp nhận thành phẩm
                </label>
                <div className="relative">
                  <Warehouse size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    readOnly
                    value="WH-HN-01 (Kho Tổng Gia Lâm)"
                    className="w-full h-9 pl-8.5 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Ghi chú đối chiếu giấy / Giải trình */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú đối chiếu giấy / Giải trình
              </label>
              <input
                type="text"
                placeholder="Nhập ghi chú hoặc diễn giải biên bản đối chiếu..."
                value={formNote}
                onChange={(e) => setFormNote(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Form Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-[11px] text-slate-400">
                Mẹo phím tắt: Nhấn <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono font-bold text-slate-600">Tab</kbd> để di chuyển ô và <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono font-bold text-slate-600">Enter</kbd> để lưu
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  <RotateCcw size={13} />
                  <span>Làm mới</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#16437E] text-white text-xs font-bold transition shadow-2xs cursor-pointer"
                >
                  <Save size={14} />
                  <span>Lưu báo cáo vào hệ thống</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* CARD 3: BẢNG LỊCH SỬ NHẬP LIỆU (PRODUCTION LOG) - LSX-2026-001 */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Card 3 Header */}
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                  BẢNG LỊCH SỬ NHẬP LIỆU (PRODUCTION LOG) - {selectedOrderForDetail.orderCode}
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                  {orderLogs.length} lần nhập
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Liệt kê các lần báo cáo thành phẩm theo chứng từ giấy. Nhân viên có thể bấm Sửa hoặc Xóa để điều chỉnh nếu gõ nhầm số liệu.
              </p>
            </div>

            <div className="text-right shrink-0 text-xs text-slate-500">
              Tổng sản lượng đã ghi nhận:{' '}
              <strong className="text-blue-700 font-mono text-sm">
                {totalRecordedLogQty.toLocaleString('vi-VN')} {selectedOrderForDetail.unit}
              </strong>
            </div>
          </div>

          {/* Table Logs */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3.5 text-center">STT</th>
                  <th className="py-3 px-3">NGÀY BÁO CÁO</th>
                  <th className="py-3 px-3.5">MÃ PHIẾU THAM CHIẾU</th>
                  <th className="py-3 px-3.5">CA LÀM VIỆC</th>
                  <th className="py-3 px-3 text-center">SL ĐẠT CHUẨN</th>
                  <th className="py-3 px-3 text-center">SL PHẾ PHẨM</th>
                  <th className="py-3 px-4">NGƯỜI KÝ TẠI XƯỞNG</th>
                  <th className="py-3 px-4">GHI CHÚ ĐỐI CHIẾU</th>
                  <th className="py-3 px-3 text-center">HÀNH ĐỘNG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderLogs.map((log, index) => (
                  <tr
                    key={log.id}
                    className={`transition ${
                      log.hasWarning ? 'bg-amber-50/20' : 'hover:bg-blue-50/20'
                    }`}
                  >
                    <td className="py-3 px-3.5 text-center font-mono text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {log.reportDate}
                    </td>
                    <td className="py-3 px-3.5">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-xs">
                        # {log.slipCode}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 font-medium">
                      {log.shift}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {log.hasWarning ? (
                        <span className="text-amber-600 underline decoration-amber-500 decoration-2">
                          +{log.goodQty.toLocaleString('vi-VN')} {selectedOrderForDetail.unit}
                        </span>
                      ) : (
                        <span className="text-emerald-600">
                          +{log.goodQty.toLocaleString('vi-VN')} {selectedOrderForDetail.unit}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-semibold text-amber-700">
                      +{log.scrapQty}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {log.signerName}
                    </td>
                    <td className="py-3 px-4 max-w-sm">
                      {log.hasWarning ? (
                        <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-1.5 font-medium leading-relaxed">
                          <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
                          <span>{log.warningNote}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] leading-snug">
                          {log.note}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingSlip(log)}
                          title="Sửa báo cáo & phiếu tham chiếu (Khớp Ảnh 3)"
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLog(log.id, log.slipCode)}
                          title="Xóa phiếu"
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Sửa Báo cáo & Phiếu tham chiếu (Khớp Ảnh 3) */}
        <EditReferenceSlipModal
          isOpen={!!editingSlip}
          onClose={() => setEditingSlip(null)}
          slip={editingSlip}
          onSave={(updated) => {
            setOrderLogs((prev) =>
              prev.map((item) => (item.id === updated.id ? updated : item))
            );
            showToast(`Đã cập nhật số liệu phiếu #${updated.slipCode} thành công!`);
            setEditingSlip(null);
          }}
        />
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER 2: MÀN HÌNH THEO DÕI LỆNH SẢN XUẤT (DATA GRID - KHỚP ẢNH 1 & ẢNH 2)
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 bg-transparent min-h-full text-slate-800 space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] uppercase tracking-wider mb-2 border border-blue-100">
            <span>THEO DÕI SẢN XUẤT & NHẬP LIỆU</span>
            <span>•</span>
            <span className="font-normal text-blue-600">Đặc tả 3.2.3.2</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Theo dõi Tiến độ Lệnh Sản xuất (Data Grid)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Giao diện máy tính bàn dành cho nhân viên văn phòng nhập liệu báo cáo từ phiếu giấy xưởng gửi lên. Bấm vào lệnh để mở Form Báo cáo kèm Mã phiếu tham chiếu và Lịch sử nhập liệu.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('production-import')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#16437E] text-xs font-semibold text-white transition cursor-pointer shadow-xs whitespace-nowrap"
          >
            <Plus size={14} />
            <span>Import Kế hoạch mới</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Stat Badges Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số lệnh SX */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TỔNG SỐ LỆNH SX
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
              {totalOrdersCount} <span className="text-xs font-medium text-slate-500">lệnh</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            {runningOrdersCount} đang chạy • {completedOrdersCount} đã xong • {pausedOrdersCount} tạm dừng
          </div>
        </div>

        {/* Card 2: Sản lượng kế hoạch */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              SẢN LƯỢNG KẾ HOẠCH
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">
              {totalPlannedQty.toLocaleString('vi-VN')} <span className="text-xs font-medium text-slate-500">ĐVT</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Tổng sản lượng toàn bộ lệnh
          </div>
        </div>

        {/* Card 3: Đã báo cáo hoàn thành */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ĐÃ BÁO CÁO HOÀN THÀNH
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 font-mono mt-1">
              {totalCompletedQty.toLocaleString('vi-VN')} <span className="text-xs font-medium text-slate-500">ĐVT</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Tổng hợp từ phiếu tham chiếu
          </div>
        </div>

        {/* Card 4: Tỷ lệ hoàn thành chung */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-4 flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TỶ LỆ HOÀN THÀNH CHUNG
            </div>
            <div className="text-2xl font-extrabold text-blue-700 font-mono mt-1">
              {totalPercent}%
            </div>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
            <div
              className="bg-[#1E56A0] h-full rounded-full transition-all duration-300"
              style={{ width: `${totalPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-3 w-full">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã LSX, mã đơn PO (PO-2026-001), sản phẩm..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Workshop Filter */}
          <div className="relative">
            <select
              value={workshopFilter}
              onChange={(e) => setWorkshopFilter(e.target.value)}
              className="h-9 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none"
            >
              <option value="ALL">Tất cả phân xưởng</option>
              <option value="Phân xưởng Bao bì Đông Anh">Phân xưởng Bao bì Đông Anh</option>
              <option value="Phân xưởng Đùn Nhựa Gia Lâm">Phân xưởng Đùn Nhựa Gia Lâm</option>
              <option value="Xưởng In & Cắt Bế Offset">Xưởng In & Cắt Bế Offset</option>
              <option value="Phân xưởng Gia công Túi">Phân xưởng Gia công Túi</option>
              <option value="Phân xưởng Ép Nhiệt">Phân xưởng Ép Nhiệt</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer appearance-none"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="RUNNING">Đang chạy</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="PAUSED">Tạm dừng</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <span className="text-xs text-slate-400 whitespace-nowrap">
          Hiển thị {filteredOrders.length} / {orders.length} lệnh
        </span>
      </div>

      {/* 4. Main Data Grid */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3">MÃ LỆNH SX</th>
                <th className="py-3 px-3">MÃ ĐƠN PO</th>
                <th className="py-3 px-4 min-w-[240px]">SẢN PHẨM & QUY CÁCH</th>
                <th className="py-3 px-3">PHÂN XƯỞNG</th>
                <th className="py-3 px-3 text-right">KẾ HOẠCH</th>
                <th className="py-3 px-3 text-right">ĐÃ XONG</th>
                <th className="py-3 px-4 min-w-[130px]">THANH TIẾN ĐỘ</th>
                <th className="py-3 px-3 text-center">THỜI HẠN</th>
                <th className="py-3 px-3 text-center">TRẠNG THÁI</th>
                <th className="py-3 px-3 text-center">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredOrders.map((ord) => (
                <tr
                  key={ord.id}
                  onDoubleClick={() => handleOpenDetailEntry(ord)}
                  className="hover:bg-slate-50/70 transition cursor-pointer group"
                >
                  <td className="py-3.5 px-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                    {ord.orderCode}
                  </td>
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <span className="font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                      {ord.poCode}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 leading-snug">
                      {ord.productName}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      SKU: <span className="font-mono text-slate-500">{ord.sku}</span> • {ord.warehouseLocation}
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Building2 size={13} className="text-slate-400 shrink-0" />
                      <span>{ord.workshop}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                    {ord.targetQty.toLocaleString('vi-VN')} <span className="text-[11px] font-normal text-slate-500">{ord.unit}</span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                    {ord.completedQty.toLocaleString('vi-VN')} <span className="text-[11px] font-normal text-slate-500">{ord.unit}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            ord.progressPercent === 100 ? 'bg-emerald-600' : 'bg-[#1E56A0]'
                          }`}
                          style={{ width: `${ord.progressPercent}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] font-semibold text-slate-600 w-10 text-right">
                        {ord.progressPercent}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                    {ord.dueDate}
                  </td>
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    {ord.status === 'COMPLETED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <Check size={12} />
                        Hoàn thành
                      </span>
                    ) : ord.status === 'PAUSED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        Tạm dừng
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Đang chạy
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetailEntry(ord);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-[#1E56A0] hover:bg-blue-100 font-semibold text-[11px] border border-blue-200 transition cursor-pointer"
                      >
                        <FileText size={12} />
                        <span>Nhập liệu</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
