// src/features/roles/components/manager/screens/ReportsScreen.tsx
// Màn hình 3.2.2.15: Báo cáo quản trị doanh nghiệp (Tồn kho MAC, Công nợ AR, Doanh thu lợi nhuận)

import React, { useState } from 'react';
import {
  Layers,
  DollarSign,
  TrendingUp,
  Calendar,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  ChevronDown,
  BarChart3,
  PieChart,
  Activity,
  ArrowUpRight,
  Bell,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Send,
  X,
  Search,
  Filter,
  Sparkles,
  PhoneCall,
  MessageSquare,
  Lock,
  Unlock,
  Award,
  FileText,
  CreditCard,
  Building,
  Check,
  AlertCircle,
  Eye,
  Package,
  Boxes,
  History,
  Calculator,
  RefreshCw,
  Info,
} from 'lucide-react';

interface ReportsScreenProps {
  onNavigate?: (screenId: string) => void;
}

export interface CustomerCreditItem {
  id: string;
  partnerCode: string;
  partnerName: string;
  phone: string;
  address: string;
  contactPerson: string;
  creditLimit: number;
  currentDebt: number;
  creditRating: 'AAA' | 'AA' | 'A' | 'BBB' | 'C';
  creditScore: number; // 0 - 100
  onTimePaymentRate: number; // %
  annualRevenue: number;
  avgPaymentDays: number;
  collateral: string;
  loanRecommendation: string;
  dueDate: string;
  dueAmount: number;
  daysRemaining: number; // >0: còn ngày; =0: hôm nay; <0: quá hạn
  statusText: string;
  lastNotified?: string;
  isCreditLocked: boolean;
}

export interface MacHistoryEntry {
  date: string;
  docCode: string;
  type: 'NHAP_KHO' | 'SAN_XUAT' | 'XUAT_KHO';
  typeName: string;
  qtyChange: number;
  balanceQty: number;
  unitPrice: number;
  macAfter: number;
  note: string;
}

export interface MacInventoryItem {
  code: string;
  name: string;
  unit: string;
  category: 'Thành phẩm' | 'Nguyên vật liệu';
  warehouse: string;
  stockQty: number;
  minSafeStock: number;
  maxSafeStock: number;
  macPrice: number;
  lastImportPrice: number;
  priceTrendPercent: number; // %
  totalValuation: number;
  stockSharePercent: number; // %
  history: MacHistoryEntry[];
}

const MAC_INVENTORY_DATA: MacInventoryItem[] = [
  {
    code: 'TP-SP01',
    name: 'Tấm ốp Nano PVC vân đá 9mm',
    unit: 'Tấm',
    category: 'Thành phẩm',
    warehouse: 'Kho Tổng Gia Lâm',
    stockQty: 1250,
    minSafeStock: 500,
    maxSafeStock: 3000,
    macPrice: 112000,
    lastImportPrice: 115000,
    priceTrendPercent: 2.7,
    totalValuation: 140000000,
    stockSharePercent: 19.5,
    history: [
      {
        date: '15/10/2026',
        docCode: 'NK-2026-042',
        type: 'SAN_XUAT',
        typeName: 'Nhập kho sản xuất (Xưởng)',
        qtyChange: 500,
        balanceQty: 1250,
        unitPrice: 115000,
        macAfter: 112000,
        note: 'Lệnh sản xuất MO-2026-001 hoàn thành 500 tấm hoàn thiện',
      },
      {
        date: '10/10/2026',
        docCode: 'XK-2026-089',
        type: 'XUAT_KHO',
        typeName: 'Xuất kho bán hàng B2B',
        qtyChange: -200,
        balanceQty: 750,
        unitPrice: 110000,
        macAfter: 110000,
        note: 'Xuất giao đại lý An Phát theo đơn hàng SO-029',
      },
      {
        date: '02/10/2026',
        docCode: 'NK-2026-031',
        type: 'SAN_XUAT',
        typeName: 'Nhập kho sản xuất đợt 1',
        qtyChange: 950,
        balanceQty: 950,
        unitPrice: 110000,
        macAfter: 110000,
        note: 'Nhập thành phẩm lô K3 xưởng đùn tấm',
      },
    ],
  },
  {
    code: 'TP-SP02',
    name: 'Phào chỉ cổ trần PU dát vàng 8cm',
    unit: 'Cây 2.4m',
    category: 'Thành phẩm',
    warehouse: 'Kho Tổng Gia Lâm',
    stockQty: 280,
    minSafeStock: 100,
    maxSafeStock: 800,
    macPrice: 58000,
    lastImportPrice: 58000,
    priceTrendPercent: 0,
    totalValuation: 16240000,
    stockSharePercent: 2.3,
    history: [
      {
        date: '12/10/2026',
        docCode: 'PN-2026-082',
        type: 'NHAP_KHO',
        typeName: 'Nhập kho hàng nhập khẩu',
        qtyChange: 150,
        balanceQty: 280,
        unitPrice: 58000,
        macAfter: 58000,
        note: 'Nhập lô phào chỉ PU xuất xứ Đài Loan',
      },
      {
        date: '05/10/2026',
        docCode: 'XK-2026-075',
        type: 'XUAT_KHO',
        typeName: 'Xuất kho công trình',
        qtyChange: -50,
        balanceQty: 130,
        unitPrice: 58000,
        macAfter: 58000,
        note: 'Xuất công trình biệt thự Starlake',
      },
    ],
  },
  {
    code: 'TP-SP03',
    name: 'Nẹp nhôm chữ T mạ Anode',
    unit: 'Thanh 2.5m',
    category: 'Thành phẩm',
    warehouse: 'Kho Đông Anh',
    stockQty: 640,
    minSafeStock: 300,
    maxSafeStock: 1500,
    macPrice: 26000,
    lastImportPrice: 26500,
    priceTrendPercent: 1.9,
    totalValuation: 16640000,
    stockSharePercent: 2.3,
    history: [
      {
        date: '14/10/2026',
        docCode: 'PN-2026-086',
        type: 'NHAP_KHO',
        typeName: 'Nhập mua hàng NCC Tân Á',
        qtyChange: 300,
        balanceQty: 640,
        unitPrice: 26500,
        macAfter: 26000,
        note: 'Phân bổ chi phí vận chuyển Landed Cost 500đ/thanh',
      },
    ],
  },
  {
    code: 'TP-NV01',
    name: 'Hạt nhựa PVC nguyên sinh SG5',
    unit: 'Kg',
    category: 'Nguyên vật liệu',
    warehouse: 'Kho Tổng Gia Lâm',
    stockQty: 18500,
    minSafeStock: 5000,
    maxSafeStock: 30000,
    macPrice: 28500,
    lastImportPrice: 29000,
    priceTrendPercent: 1.8,
    totalValuation: 527250000,
    stockSharePercent: 73.5,
    history: [
      {
        date: '14/10/2026',
        docCode: 'PN-2026-088',
        type: 'NHAP_KHO',
        typeName: 'Nhập cảng Hải Phòng (Landed Cost)',
        qtyChange: 10000,
        balanceQty: 18500,
        unitPrice: 29000,
        macAfter: 28500,
        note: 'Nhập khẩu 10 tấn hạt nhựa PVC Formosa, cộng phí lưu kho CFS',
      },
      {
        date: '06/10/2026',
        docCode: 'XK-NV-034',
        type: 'XUAT_KHO',
        typeName: 'Xuất lệnh sản xuất MO-002',
        qtyChange: -5000,
        balanceQty: 8500,
        unitPrice: 28000,
        macAfter: 28000,
        note: 'Xuất cấp nguyên liệu xưởng đùn tấm ốp',
      },
      {
        date: '28/09/2026',
        docCode: 'PN-2026-071',
        type: 'NHAP_KHO',
        typeName: 'Nhập mua NCC Đông Á',
        qtyChange: 13500,
        balanceQty: 13500,
        unitPrice: 28000,
        macAfter: 28000,
        note: 'Nhập lô hàng nguyên sinh theo hợp đồng quý 3',
      },
    ],
  },
  {
    code: 'TP-NV02',
    name: 'Bột đá Canxi Cacbonat CaCO3',
    unit: 'Tấn',
    category: 'Nguyên vật liệu',
    warehouse: 'Kho Đông Anh',
    stockQty: 12,
    minSafeStock: 15,
    maxSafeStock: 50,
    macPrice: 1450000,
    lastImportPrice: 1420000,
    priceTrendPercent: 2.1,
    totalValuation: 17400000,
    stockSharePercent: 2.4,
    history: [
      {
        date: '08/10/2026',
        docCode: 'PN-2026-079',
        type: 'NHAP_KHO',
        typeName: 'Nhập kho NCC Khoáng sản Yên Bái',
        qtyChange: 8,
        balanceQty: 12,
        unitPrice: 1420000,
        macAfter: 1450000,
        note: 'Cước vận tải đường sắt tăng nhẹ 30.000đ/tấn',
      },
      {
        date: '01/10/2026',
        docCode: 'XK-NV-028',
        type: 'XUAT_KHO',
        typeName: 'Xuất phối trộn mẻ 14',
        qtyChange: -6,
        balanceQty: 4,
        unitPrice: 1500000,
        macAfter: 1500000,
        note: 'Phục vụ ca sản xuất ép phôi nano',
      },
    ],
  },
];

const INITIAL_AR_CREDIT_DATA: CustomerCreditItem[] = [
  {
    id: 'AR-01',
    partnerCode: 'KH-001',
    partnerName: 'Công ty Cổ phần Nội thất An Phát',
    phone: '024 3888 9999',
    address: 'Tầng 8 Tòa nhà Viglacera, Từ Liêm, Hà Nội',
    contactPerson: 'Nguyễn Văn An (Giám đốc dự án)',
    creditLimit: 350000000,
    currentDebt: 320000000,
    creditRating: 'AA',
    creditScore: 88,
    onTimePaymentRate: 94,
    annualRevenue: 3850000000,
    avgPaymentDays: 24,
    collateral: 'Hợp đồng thương mại nguyên tắc & Ký quỹ 50.000.000 đ',
    loanRecommendation: 'Đủ điều kiện cấp thêm hạn mức khi hoàn tất thanh toán đợt này',
    dueDate: '25/10/2026',
    dueAmount: 120000000,
    daysRemaining: 5,
    statusText: 'Sắp đến hạn',
    lastNotified: '18/10/2026',
    isCreditLocked: false,
  },
  {
    id: 'AR-02',
    partnerCode: 'KH-002',
    partnerName: 'Đại lý Trang trí Hoàng Gia',
    phone: '0903 222 333',
    address: 'Số 102 Đường Nguyễn Trãi, Thanh Xuân, Hà Nội',
    contactPerson: 'Trần Hoàng Gia (Chủ đại lý)',
    creditLimit: 150000000,
    currentDebt: 145000000,
    creditRating: 'BBB',
    creditScore: 68,
    onTimePaymentRate: 72,
    annualRevenue: 1250000000,
    avgPaymentDays: 38,
    collateral: 'Bảo lãnh cá nhân & Hóa đơn VAT gối đầu',
    loanRecommendation: 'Cần theo dõi sát, tạm hoãn xét duyệt vay thêm vốn đơn mới',
    dueDate: '15/10/2026',
    dueAmount: 85000000,
    daysRemaining: -5,
    statusText: 'Quá hạn 5 ngày',
    lastNotified: '16/10/2026',
    isCreditLocked: false,
  },
  {
    id: 'AR-03',
    partnerCode: 'KH-003',
    partnerName: 'Công ty TNHH Xây dựng Minh Khang',
    phone: '0915 666 777',
    address: 'Khu Đô thị Mỗ Lao, Hà Đông, Hà Nội',
    contactPerson: 'Lê Minh Khang (Tổng Giám đốc)',
    creditLimit: 200000000,
    currentDebt: 78000000,
    creditRating: 'AAA',
    creditScore: 96,
    onTimePaymentRate: 99,
    annualRevenue: 4600000000,
    avgPaymentDays: 16,
    collateral: 'Thư bảo lãnh ngân hàng BIDV trị giá 500.000.000 đ',
    loanRecommendation: 'Ưu tiên cấp tín dụng mức tối đa, đối tác chiến lược hạng Vàng',
    dueDate: '10/11/2026',
    dueAmount: 78000000,
    daysRemaining: 21,
    statusText: 'Trong hạn mức',
    isCreditLocked: false,
  },
  {
    id: 'AR-04',
    partnerCode: 'KH-004',
    partnerName: 'Công ty Cổ phần Xây dựng & Thương mại Hải Đăng',
    phone: '0988 555 123',
    address: 'Số 45 Đại lộ Thăng Long, Nam Từ Liêm, Hà Nội',
    contactPerson: 'Phạm Hải Đăng (Trưởng phòng Vật tư)',
    creditLimit: 200000000,
    currentDebt: 200000000,
    creditRating: 'C',
    creditScore: 45,
    onTimePaymentRate: 48,
    annualRevenue: 850000000,
    avgPaymentDays: 52,
    collateral: 'Không có tài sản bảo đảm',
    loanRecommendation: 'Khóa quyền mua chịu, yêu cầu chuyển khoản 100% trước khi xuất hàng',
    dueDate: '06/10/2026',
    dueAmount: 145000000,
    daysRemaining: -14,
    statusText: 'Quá hạn 14 ngày',
    lastNotified: '12/10/2026',
    isCreditLocked: true,
  },
  {
    id: 'AR-05',
    partnerCode: 'KH-005',
    partnerName: 'Đại lý Trang trí Nội thất Minh Đức',
    phone: '0977 444 888',
    address: 'Số 88 Phố Huế, Hai Bà Trưng, Hà Nội',
    contactPerson: 'Đỗ Minh Đức (Chủ cơ sở)',
    creditLimit: 120000000,
    currentDebt: 65000000,
    creditRating: 'A',
    creditScore: 82,
    onTimePaymentRate: 88,
    annualRevenue: 1800000000,
    avgPaymentDays: 26,
    collateral: 'Hợp đồng cam kết tiến độ thanh toán từng đợt',
    loanRecommendation: 'Đủ điều kiện cho vay nợ đơn hàng mới',
    dueDate: '20/10/2026',
    dueAmount: 65000000,
    daysRemaining: 0,
    statusText: 'Đáo hạn hôm nay',
    lastNotified: '19/10/2026',
    isCreditLocked: false,
  },
];

export const ReportsScreen: React.FC<ReportsScreenProps> = () => {
  const [activeTab, setActiveTab] = useState<'mac' | 'ar' | 'profit'>('profit');
  const [selectedMonth, setSelectedMonth] = useState('Tháng 10/2026');
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ─── Quản lý Công nợ AR & Tín nhiệm Cho Vay ───
  const [arData, setArData] = useState<CustomerCreditItem[]>(INITIAL_AR_CREDIT_DATA);
  const [arSearch, setArSearch] = useState('');
  const [arFilter, setArFilter] = useState<'ALL' | 'DUE_SOON' | 'OVERDUE' | 'HIGH_CREDIT'>('ALL');

  // Modal Chi tiết tín nhiệm cho vay
  const [selectedCreditItem, setSelectedCreditItem] = useState<CustomerCreditItem | null>(null);
  const [creditModalOpen, setCreditModalOpen] = useState(false);

  // Modal Gửi cảnh báo / Thông báo đáo hạn
  const [selectedAlertItem, setSelectedAlertItem] = useState<CustomerCreditItem | null>(null);
  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [alertChannel, setAlertChannel] = useState<'ZALO' | 'SMS' | 'EMAIL'>('ZALO');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    showToast('Đang kết xuất và tải tệp Excel báo cáo quản trị...');
  };

  // Các handler xử lý cảnh báo & tín nhiệm
  const handleOpenAlert = (item: CustomerCreditItem) => {
    setSelectedAlertItem(item);
    setAlertModalOpen(true);
  };

  const handleConfirmSendAlert = () => {
    if (!selectedAlertItem) return;
    setArData((prev) =>
      prev.map((i) =>
        i.id === selectedAlertItem.id ? { ...i, lastNotified: 'Hôm nay (20/10/2026)' } : i
      )
    );
    const channelName =
      alertChannel === 'ZALO' ? 'Zalo ZNS' : alertChannel === 'SMS' ? 'SMS Brandname TINPHAT' : 'Email kế toán';
    showToast(`Đã gửi thông báo đáo hạn qua ${channelName} tới ${selectedAlertItem.partnerName}!`);
    setAlertModalOpen(false);
  };

  const handleBatchAlert = () => {
    setArData((prev) =>
      prev.map((i) =>
        i.daysRemaining <= 7 ? { ...i, lastNotified: 'Hôm nay (20/10/2026)' } : i
      )
    );
    showToast('Đã gửi thông báo đáo hạn tự động qua Zalo ZNS tới các khách hàng sắp đến hạn và quá hạn!');
  };

  const handleOpenCreditDetail = (item: CustomerCreditItem) => {
    setSelectedCreditItem(item);
    setCreditModalOpen(true);
  };

  const handleToggleCreditLock = (item: CustomerCreditItem) => {
    const newStatus = !item.isCreditLocked;
    setArData((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isCreditLocked: newStatus } : i))
    );
    if (selectedCreditItem?.id === item.id) {
      setSelectedCreditItem({ ...selectedCreditItem, isCreditLocked: newStatus });
    }
    showToast(
      newStatus
        ? `Đã kích hoạt KHÓA cấp quyền mua chịu đối với ${item.partnerName}`
        : `Đã MỞ KHÓA cấp hạn mức tín dụng cho ${item.partnerName}`
    );
  };

  // Tính toán số liệu thống kê AR
  const totalArDebt = arData.reduce((sum, item) => sum + item.currentDebt, 0);
  const totalCreditLimit = arData.reduce((sum, item) => sum + item.creditLimit, 0);
  const dueSoonTotal = arData
    .filter((item) => item.daysRemaining >= 0 && item.daysRemaining <= 7)
    .reduce((sum, item) => sum + item.dueAmount, 0);
  const overdueTotal = arData
    .filter((item) => item.daysRemaining < 0)
    .reduce((sum, item) => sum + item.dueAmount, 0);
  const availableCreditTotal = Math.max(0, totalCreditLimit - totalArDebt);

  const filteredArData = arData.filter((item) => {
    const matchSearch =
      item.partnerName.toLowerCase().includes(arSearch.toLowerCase()) ||
      item.partnerCode.toLowerCase().includes(arSearch.toLowerCase()) ||
      item.phone.includes(arSearch);

    if (!matchSearch) return false;

    if (arFilter === 'DUE_SOON') {
      return item.daysRemaining >= 0 && item.daysRemaining <= 7;
    }
    if (arFilter === 'OVERDUE') {
      return item.daysRemaining < 0;
    }
    if (arFilter === 'HIGH_CREDIT') {
      return item.creditRating === 'AAA' || item.creditRating === 'AA';
    }
    return true;
  });

  // ─── Quản lý Tồn kho Giá vốn MAC (BR-29 / BR-55) ───
  const [macData, setMacData] = useState<MacInventoryItem[]>(MAC_INVENTORY_DATA);
  const [macSearch, setMacSearch] = useState('');
  const [macCategoryFilter, setMacCategoryFilter] = useState<'ALL' | 'Thành phẩm' | 'Nguyên vật liệu' | 'LOW_STOCK'>('ALL');
  const [macWarehouseFilter, setMacWarehouseFilter] = useState<'ALL' | 'Kho Tổng Gia Lâm' | 'Kho Đông Anh'>('ALL');

  // Modal Chi tiết lịch sử biến động MAC
  const [selectedMacItem, setSelectedMacItem] = useState<MacInventoryItem | null>(null);
  const [macModalOpen, setMacModalOpen] = useState(false);

  const handleRecalculateMac = () => {
    showToast('Hệ thống đã tự động đối soát và đồng bộ lại đơn giá MAC bình quân di động cho 5/5 mã hàng!');
  };

  const handleOpenMacHistory = (item: MacInventoryItem) => {
    setSelectedMacItem(item);
    setMacModalOpen(true);
  };

  const filteredMacData = macData.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(macSearch.toLowerCase()) ||
      item.code.toLowerCase().includes(macSearch.toLowerCase()) ||
      item.unit.toLowerCase().includes(macSearch.toLowerCase());

    if (!matchSearch) return false;

    if (macCategoryFilter === 'Thành phẩm' || macCategoryFilter === 'Nguyên vật liệu') {
      if (item.category !== macCategoryFilter) return false;
    } else if (macCategoryFilter === 'LOW_STOCK') {
      if (item.stockQty >= item.minSafeStock) return false;
    }

    if (macWarehouseFilter !== 'ALL') {
      if (item.warehouse !== macWarehouseFilter) return false;
    }

    return true;
  });

  const totalMacValuation = macData.reduce(
    (sum, item) => sum + item.totalValuation,
    0
  );
  const finishedGoodsValuation = macData
    .filter((item) => item.category === 'Thành phẩm')
    .reduce((sum, item) => sum + item.totalValuation, 0);
  const rawMaterialsValuation = macData
    .filter((item) => item.category === 'Nguyên vật liệu')
    .reduce((sum, item) => sum + item.totalValuation, 0);
  const lowStockCount = macData.filter((item) => item.stockQty < item.minSafeStock).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header (Màn hình 3.2.2.15) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Báo cáo quản trị doanh nghiệp
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Màn hình 3.2.2.15 • Tổng hợp giá trị tồn kho theo MAC, công nợ phải thu và biên lợi nhuận kinh doanh
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Month Selector Dropdown (Khớp 100% Ảnh 1) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
            >
              <Calendar size={14} className="text-slate-400" />
              <span>{selectedMonth}</span>
              <ChevronDown
                size={14}
                className={`text-slate-400 transition-transform duration-150 ${
                  monthDropdownOpen ? 'rotate-180 text-blue-600' : ''
                }`}
              />
            </button>

            {monthDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setMonthDropdownOpen(false)}
                />
                <div className="absolute right-0 top-9 w-40 bg-white rounded-lg shadow-xl border border-slate-200 py-1 z-40 animate-in fade-in zoom-in-95 duration-100 overflow-hidden text-xs">
                  {['Tháng 10/2026', 'Quý 3/2026', 'Quý 2/2026', 'Năm 2026'].map((opt) => {
                    const isSelected = selectedMonth === opt;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          setSelectedMonth(opt);
                          setMonthDropdownOpen(false);
                          showToast(`Đã chuyển bộ lọc số liệu: ${opt}`);
                        }}
                        className={`w-full text-left px-3.5 py-2 transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#475569] text-white font-semibold'
                            : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* In báo cáo */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <Printer size={14} className="text-slate-500" />
            <span>In báo cáo</span>
          </button>

          {/* Xuất file Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
          >
            <FileSpreadsheet size={14} />
            <span>Xuất file Excel</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-tabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('mac')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
            activeTab === 'mac'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <Layers size={15} />
          <span>Tồn kho giá vốn MAC</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ar')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'ar'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <DollarSign size={15} />
          <span>Công nợ khách hàng (AR)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profit')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer ${
            activeTab === 'profit'
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
          }`}
        >
          <TrendingUp size={15} />
          <span>Doanh thu lợi nhuận</span>
        </button>
      </div>

      {/* TAB 1: TỒN KHO GIÁ VỐN MAC (BÌNH QUÂN DI ĐỘNG BR-29/BR-55) */}
      {activeTab === 'mac' && (
        <div className="space-y-5">
          {/* 4 Thẻ KPI Tổng Hợp Định Giá & Cơ Cấu Tồn Kho */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tổng giá trị định giá MAC */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-teal-800">
                    TỔNG ĐỊNH GIÁ TỒN KHO (MAC)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold">
                    <Layers size={16} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-teal-700 font-mono">
                  {totalMacValuation.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">5 nhóm SKU kho</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold flex items-center gap-0.5">
                  <ArrowUpRight size={11} />
                  <span>+4.8% vs tháng 9</span>
                </span>
              </div>
            </div>

            {/* Card 2: Thành phẩm thương mại */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700">
                    THÀNH PHẨM (FINISHED GOODS)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Package size={16} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-blue-700 font-mono">
                  {finishedGoodsValuation.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">2.170 SP (Tấm, Phào, Nẹp)</span>
                <span className="font-bold text-blue-700 font-mono text-[11px]">
                  24.1% giá trị kho
                </span>
              </div>
            </div>

            {/* Card 3: Nguyên vật liệu sản xuất */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700">
                    NGUYÊN VẬT LIỆU XƯỞNG
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Boxes size={16} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-slate-800 font-mono">
                  {rawMaterialsValuation.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">18.5T Nhựa SG5 & 12T Bột đá</span>
                <span className="font-bold text-amber-700 font-mono text-[11px]">
                  75.9% giá trị kho
                </span>
              </div>
            </div>

            {/* Card 4: Cảnh báo mức an toàn & Vòng quay */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-rose-700">
                    CẢNH BÁO MỨC TỒN AN TOÀN
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertTriangle size={16} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-rose-600 font-mono">
                  {lowStockCount} mặt hàng thấp
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Bột đá CaCO3 (12 &lt; 15 Tấn)</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                  Cần mua thêm
                </span>
              </div>
            </div>
          </div>

          {/* 2 Khối Phân Tích Chuyên Sâu: Phân bổ Kho Bãi & Nghiệp Vụ Công Thức MAC */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Khối 1: Phân bổ Kho bãi & Trực quan hóa */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Building size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Phân bổ giá trị tồn kho theo Kho lưu trữ
                      </h3>
                      <p className="text-[10px] text-slate-400">Cơ cấu định giá MAC trên 2 kho trung tâm</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                    2 Điểm kho
                  </span>
                </div>

                {/* Progress bar phân bổ kho */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                        <span>Kho Tổng Gia Lâm (Chứa Thành phẩm &amp; Hạt nhựa)</span>
                      </div>
                      <span className="font-mono text-blue-700 font-bold">
                        683.490.000 đ <span className="text-[11px] font-normal text-slate-500">(95.3%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '95.3%' }} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-800 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                        <span>Kho Đông Anh (Chứa Phào nẹp &amp; Bột đá CaCO3)</span>
                      </div>
                      <span className="font-mono text-teal-700 font-bold">
                        34.040.000 đ <span className="text-[11px] font-normal text-slate-500">(4.7%)</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full bg-teal-500 rounded-full" style={{ width: '4.7%' }} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Tỷ lệ lấp đầy kho trung bình: <strong className="text-slate-700 font-semibold">78.5% công suất</strong></span>
                <span className="text-emerald-600 font-medium">Đảm bảo an toàn PCCC &amp; bảo quản</span>
              </div>
            </div>

            {/* Khối 2: Công thức Nghiệp vụ MAC (BR-29) & Thao tác tự động */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <Calculator size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Công thức Giá vốn Bình quân Di động (BR-29)
                      </h3>
                      <p className="text-[10px] text-slate-400">Tự động cấu thành chi phí mua hàng Landed Cost</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 font-mono">
                    Chuẩn VAS / IFRS
                  </span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-mono text-slate-700 leading-relaxed space-y-1">
                  <div className="text-[11px] font-sans font-bold text-slate-500 uppercase">Công thức hạch toán tự động:</div>
                  <div className="text-blue-700 font-bold">
                    MAC mới = (Tồn cũ × MAC cũ + Lô nhập × Giá Landed Cost) / (Tồn cũ + Qty nhập)
                  </div>
                  <div className="text-[11px] font-sans text-slate-500 pt-1">
                    * Giá vốn xuất kho ghi nhận ngay theo MAC thời điểm xuất, không làm thay đổi đơn giá MAC của lượng hàng còn tồn.
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">Đồng bộ tự động từ module Mua hàng &amp; Sản xuất</span>
                <button
                  type="button"
                  onClick={handleRecalculateMac}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition cursor-pointer shadow-2xs"
                >
                  <RefreshCw size={13} />
                  <span>Đối soát lại MAC</span>
                </button>
              </div>
            </div>
          </div>

          {/* Thanh Tìm Kiếm, Bộ Lọc & Xuất Dữ Liệu */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
              {/* Input tìm kiếm */}
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={macSearch}
                  onChange={(e) => setMacSearch(e.target.value)}
                  placeholder="Tìm theo tên SP, mã TP-SP, đơn vị..."
                  className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:bg-white transition"
                />
              </div>

              {/* Bộ lọc phân loại */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setMacCategoryFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    macCategoryFilter === 'ALL'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({macData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMacCategoryFilter('Thành phẩm')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    macCategoryFilter === 'Thành phẩm'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Package size={12} />
                  <span>Thành phẩm (3)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMacCategoryFilter('Nguyên vật liệu')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    macCategoryFilter === 'Nguyên vật liệu'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Boxes size={12} />
                  <span>Nguyên vật liệu (2)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMacCategoryFilter('LOW_STOCK')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    macCategoryFilter === 'LOW_STOCK'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <AlertTriangle size={12} />
                  <span>Chạm ngưỡng thấp ({lowStockCount})</span>
                </button>
              </div>
            </div>

            {/* Filter Kho dropdown */}
            <div className="relative w-full sm:w-52 shrink-0">
              <select
                value={macWarehouseFilter}
                onChange={(e) => setMacWarehouseFilter(e.target.value as any)}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-teal-500 cursor-pointer font-medium"
              >
                <option value="ALL">Tất cả các kho lưu trữ</option>
                <option value="Kho Tổng Gia Lâm">Kho Tổng Gia Lâm</option>
                <option value="Kho Đông Anh">Kho Đông Anh</option>
              </select>
            </div>
          </div>

          {/* Bảng Danh Sách Sản Phẩm & Định Giá MAC Tối Tân */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">MẶT HÀNG &amp; PHÂN LOẠI</th>
                    <th className="py-3 px-4 min-w-[200px]">TỒN THỰC TẾ &amp; AN TOÀN</th>
                    <th className="py-3 px-4 text-right min-w-[190px]">ĐƠN GIÁ VỐN MAC</th>
                    <th className="py-3 px-4 text-right min-w-[200px]">TỔNG GIÁ TRỊ &amp; TỶ TRỌNG</th>
                    <th className="py-3 px-4 text-center">THAO TÁC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredMacData.map((item) => {
                    const isLow = item.stockQty < item.minSafeStock;
                    const safePercent = Math.min(100, Math.round((item.stockQty / item.maxSafeStock) * 100));

                    return (
                      <tr key={item.code} className="hover:bg-teal-50/30 transition group">
                        {/* 1. Mặt hàng & Phân loại */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-100">
                              {item.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                                item.category === 'Thành phẩm'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {item.category}
                            </span>
                          </div>
                          <div className="font-bold text-slate-900 mt-1">{item.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span className="text-slate-600 font-medium">{item.warehouse}</span>
                            <span>•</span>
                            <span>ĐVT: <strong className="text-slate-700">{item.unit}</strong></span>
                          </div>
                        </td>

                        {/* 2. Tồn thực tế & Mức an toàn */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-extrabold font-mono text-slate-900">
                              {item.stockQty.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-slate-500 font-medium text-xs">{item.unit}</span>
                          </div>

                          {/* Progress so với mức an toàn tối đa */}
                          <div className="w-36 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isLow ? 'bg-rose-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${safePercent}%` }}
                            />
                          </div>

                          <div className="mt-1 flex items-center gap-2">
                            {isLow ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                <AlertTriangle size={10} />
                                <span>Dưới ngưỡng ({item.minSafeStock} {item.unit})</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                An toàn (Tối thiểu {item.minSafeStock})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 3. Đơn giá vốn MAC */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-extrabold text-sm text-slate-900">
                            {item.macPrice.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            Lô gần nhất: {item.lastImportPrice.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Độ lệch: <span className="font-semibold text-emerald-600">+{item.priceTrendPercent}% (Phí Landed)</span>
                          </div>
                        </td>

                        {/* 4. Tổng giá trị tồn & Tỷ trọng */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-extrabold text-sm text-teal-700">
                            {item.totalValuation.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-[11px] font-semibold text-slate-600 font-mono mt-0.5">
                            Chiếm {item.stockSharePercent}% giá trị kho
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full mt-1.5 ml-auto overflow-hidden">
                            <div
                              className="h-full bg-teal-600 rounded-full"
                              style={{ width: `${Math.min(item.stockSharePercent * 1.3, 100)}%` }}
                            />
                          </div>
                        </td>

                        {/* 5. Thao tác */}
                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleOpenMacHistory(item)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50/70 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition cursor-pointer shadow-2xs"
                          >
                            <History size={13} />
                            <span>Lịch sử MAC</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CÔNG NỢ KHÁCH HÀNG (AR) & QUẢN TRỊ TÍN NHIỆM CHO VAY */}
      {activeTab === 'ar' && (
        <div className="space-y-5">
          {/* 4 Thẻ KPI Tổng Hợp Công Nợ & Tín Nhiệm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Tổng công nợ AR */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                    TỔNG CÔNG NỢ PHẢI THU (AR)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <DollarSign size={16} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-blue-700 font-mono">
                  {totalArDebt.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">{arData.length} đối tác B2B</span>
                <span className="font-semibold text-slate-700 font-mono">
                  Dùng {((totalArDebt / totalCreditLimit) * 100).toFixed(1)}% trần nợ
                </span>
              </div>
            </div>

            {/* Card 2: Cảnh báo sắp đến hạn */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700">
                    CẢNH BÁO SẮP ĐẾN HẠN (≤ 7 NGÀY)
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Bell size={16} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-amber-600 font-mono">
                  {dueSoonTotal.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">2 đối tác cần đôn đốc</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                  Cần thu hồi
                </span>
              </div>
            </div>

            {/* Card 3: Nợ quá hạn rủi ro */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-rose-700">
                    NỢ QUÁ HẠN NGUY HIỂM
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <AlertTriangle size={16} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-rose-600 font-mono">
                  {overdueTotal.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">2 đối tác quá hạn</span>
                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                  Khóa cấp nợ
                </span>
              </div>
            </div>

            {/* Card 4: Hạn mức khả dụng cho vay */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700">
                    HẠN MỨC KHẢ DỤNG CHO VAY
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <ShieldCheck size={16} />
                  </div>
                </div>
                <div className="text-2xl font-extrabold text-emerald-700 font-mono">
                  {availableCreditTotal.toLocaleString('vi-VN')} đ
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Sức cấp vốn còn trống</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  An toàn vốn
                </span>
              </div>
            </div>
          </div>

          {/* Thanh Công Cụ Tìm Kiếm, Bộ Lọc Nhanh & Gửi Cảnh Báo Hàng Loạt */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
              {/* Input tìm kiếm */}
              <div className="relative w-full sm:w-72">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={arSearch}
                  onChange={(e) => setArSearch(e.target.value)}
                  placeholder="Tìm đối tác, mã KH, số điện thoại..."
                  className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              {/* Bộ lọc trạng thái */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setArFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                    arFilter === 'ALL'
                      ? 'bg-slate-800 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Tất cả ({arData.length})
                </button>
                <button
                  type="button"
                  onClick={() => setArFilter('DUE_SOON')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    arFilter === 'DUE_SOON'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  <Bell size={12} />
                  <span>Sắp đến hạn (2)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setArFilter('OVERDUE')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    arFilter === 'OVERDUE'
                      ? 'bg-rose-600 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <AlertTriangle size={12} />
                  <span>Quá hạn nợ (2)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setArFilter('HIGH_CREDIT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    arFilter === 'HIGH_CREDIT'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Award size={12} />
                  <span>Tín nhiệm cao (2)</span>
                </button>
              </div>
            </div>

            {/* Nút hành động gửi thông báo đáo hạn hàng loạt */}
            <button
              type="button"
              onClick={handleBatchAlert}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs shrink-0"
            >
              <Send size={13} />
              <span>Gửi cảnh báo đáo hạn hàng loạt</span>
            </button>
          </div>

          {/* Bảng Chi Tiết Công Nợ, Tín Nhiệm & Cảnh Báo Đáo Hạn */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">ĐỐI TÁC KHÁCH HÀNG</th>
                    <th className="py-3 px-4 min-w-[190px]">HẠNG TÍN NHIỆM & ĐIỂM SỐ</th>
                    <th className="py-3 px-4 text-right min-w-[190px]">DƯ NỢ / HẠN MỨC</th>
                    <th className="py-3 px-4 min-w-[210px]">HẠN THANH TOÁN & ĐÁO HẠN</th>
                    <th className="py-3 px-4 text-center">THAO TÁC QUẢN LÝ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredArData.map((c) => {
                    const usageRate = Math.round((c.currentDebt / c.creditLimit) * 100);
                    const available = Math.max(0, c.creditLimit - c.currentDebt);

                    return (
                      <tr key={c.id} className="hover:bg-blue-50/30 transition">
                        {/* 1. Mã & Tên đối tác */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-100">
                              {c.partnerCode}
                            </span>
                            {c.isCreditLocked && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-0.5">
                                <Lock size={10} />
                                <span>Khóa nợ</span>
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-slate-900 mt-1">{c.partnerName}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <span>{c.contactPerson}</span>
                            <span>•</span>
                            <span className="font-mono text-slate-500">{c.phone}</span>
                          </div>
                        </td>

                        {/* 2. Hạng tín nhiệm & Điểm số */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${
                                c.creditRating === 'AAA'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : c.creditRating === 'AA'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : c.creditRating === 'A'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : c.creditRating === 'BBB'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              Hạng {c.creditRating}
                            </span>
                            <span className="text-xs font-bold text-slate-700 font-mono">
                              {c.creditScore}/100 đ
                            </span>
                          </div>

                          {/* Mini credit score progress */}
                          <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                c.creditScore >= 85
                                  ? 'bg-emerald-500'
                                  : c.creditScore >= 65
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${c.creditScore}%` }}
                            />
                          </div>

                          <div className="text-[10px] text-slate-500 mt-1">
                            Đúng hạn: <strong className="text-slate-700">{c.onTimePaymentRate}%</strong>
                            {' • '}
                            <span>DSO: {c.avgPaymentDays} ngày</span>
                          </div>
                        </td>

                        {/* 3. Dư nợ / Hạn mức */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-mono font-bold text-sm text-slate-900">
                            {c.currentDebt.toLocaleString('vi-VN')} đ
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Hạn mức: {c.creditLimit.toLocaleString('vi-VN')} đ
                          </div>

                          {/* Usage rate bar */}
                          <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-1.5 ml-auto overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                usageRate >= 95
                                  ? 'bg-rose-500'
                                  : usageRate >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(usageRate, 100)}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-emerald-600 font-medium mt-1">
                            Còn được vay: <strong className="font-mono font-bold">{available.toLocaleString('vi-VN')} đ</strong>
                          </div>
                        </td>

                        {/* 4. Hạn thanh toán & Cảnh báo đáo hạn */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <Clock size={13} className="text-slate-400" />
                            <span className="font-mono font-semibold">{c.dueDate}</span>
                            <span className="text-[11px] text-slate-500">
                              (Đến hạn: <strong className="text-slate-800 font-mono">{c.dueAmount.toLocaleString('vi-VN')} đ</strong>)
                            </span>
                          </div>

                          {/* Countdown Badge */}
                          <div className="mt-1 flex items-center gap-2">
                            {c.daysRemaining > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                                <Bell size={10} />
                                <span>Còn {c.daysRemaining} ngày nữa đáo hạn</span>
                              </span>
                            ) : c.daysRemaining === 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse flex items-center gap-1">
                                <AlertTriangle size={10} />
                                <span>Đáo hạn HÔM NAY</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
                                <AlertCircle size={10} />
                                <span>Quá hạn {Math.abs(c.daysRemaining)} ngày</span>
                              </span>
                            )}
                          </div>

                          <div className="text-[10px] text-slate-400 mt-1">
                            {c.lastNotified ? (
                              <span className="text-blue-600 font-medium">Đã nhắc: {c.lastNotified}</span>
                            ) : (
                              <span>Chưa gửi nhắc nợ</span>
                            )}
                          </div>
                        </td>

                        {/* 5. Thao tác */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Nút gửi thông báo đáo hạn */}
                            <button
                              type="button"
                              onClick={() => handleOpenAlert(c)}
                              title="Gửi thông báo đáo hạn / Nhắc nợ"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-800 text-[11px] font-semibold transition cursor-pointer"
                            >
                              <Bell size={12} />
                              <span>Báo đáo hạn</span>
                            </button>

                            {/* Nút xem chi tiết tín nhiệm */}
                            <button
                              type="button"
                              onClick={() => handleOpenCreditDetail(c)}
                              title="Xem chi tiết hồ sơ tín nhiệm để xét duyệt cho vay"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition cursor-pointer"
                            >
                              <Award size={12} />
                              <span>Tín nhiệm</span>
                            </button>

                            {/* Nút Khóa / Mở quyền bán nợ */}
                            <button
                              type="button"
                              onClick={() => handleToggleCreditLock(c)}
                              title={c.isCreditLocked ? 'Mở khóa hạn mức' : 'Khóa bán nợ tạm thời'}
                              className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                c.isCreditLocked
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'border-slate-200 text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50'
                              }`}
                            >
                              {c.isCreditLocked ? <Unlock size={13} /> : <Lock size={13} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DOANH THU LỢI NHUẬN (Kèm 3 biểu đồ: Cột, Viền/Đường, Tròn) */}
      {activeTab === 'profit' && (
        <div className="space-y-6">
          {/* 3 Cột Tổng Hợp KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    DOANH THU THUẦN
                  </div>
                  <div className="text-2xl font-extrabold text-blue-700 font-mono mt-1">
                    1.840.500.000 đ
                  </div>
                  <div className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                    <ArrowUpRight size={14} />
                    <span>+12.5% so với tháng trước</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <BarChart3 size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    GIÁ VỐN HÀNG BÁN (COGS)
                  </div>
                  <div className="text-2xl font-extrabold text-slate-800 font-mono mt-1">
                    1.196.325.000 đ
                  </div>
                  <div className="text-xs text-slate-500 mt-1 font-medium">
                    Tỷ trọng: <strong className="text-slate-700">65.0%</strong> doanh thu
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shrink-0">
                  <PieChart size={20} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    LỢI NHUẬN GỘP
                  </div>
                  <div className="text-2xl font-extrabold text-teal-700 font-mono mt-1">
                    644.175.000 đ
                  </div>
                  <div className="text-xs text-teal-600 mt-1 font-semibold">
                    Biên lợi nhuận gộp: <strong className="font-bold">35.0%</strong>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shrink-0">
                  <TrendingUp size={20} />
                </div>
              </div>
            </div>
          </div>

          {/* 3 CỘT BIỂU ĐỒ TRỰC QUAN HÓA: CỘT, VIỀN (ĐƯỜNG), TRÒN */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 1. BIỂU ĐỒ CỘT (Doanh thu & Giá vốn) */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                      <BarChart3 size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Biểu đồ cột
                      </h3>
                      <p className="text-[10px] text-slate-400">Doanh thu & Giá vốn 6 tháng</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 font-mono">
                    Triệu VNĐ
                  </span>
                </div>

                {/* SVG Bar Chart */}
                <div className="w-full h-48 py-2">
                  <svg viewBox="0 0 320 160" className="w-full h-full">
                    {/* Horizontal gridlines */}
                    <line
                      x1="25"
                      y1="20"
                      x2="310"
                      y2="20"
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="25"
                      y1="60"
                      x2="310"
                      y2="60"
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="25"
                      y1="100"
                      x2="310"
                      y2="100"
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line x1="25" y1="135" x2="310" y2="135" stroke="#e2e8f0" strokeWidth="1" />

                    {/* Y-axis labels */}
                    <text x="20" y="24" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                      2.0B
                    </text>
                    <text x="20" y="64" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                      1.5B
                    </text>
                    <text x="20" y="104" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                      1.0B
                    </text>
                    <text x="20" y="138" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                      0
                    </text>

                    {/* Bars data */}
                    {/* T5: 1450 & 950 */}
                    <rect x="38" y="55" width="14" height="80" rx="3" fill="#2563EB" opacity="0.9" />
                    <rect x="54" y="82" width="14" height="53" rx="3" fill="#94A3B8" opacity="0.75" />
                    <text
                      x="53"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold font-mono"
                    >
                      T5
                    </text>

                    {/* T6: 1580 & 1020 */}
                    <rect x="84" y="47" width="14" height="88" rx="3" fill="#2563EB" opacity="0.9" />
                    <rect x="100" y="78" width="14" height="57" rx="3" fill="#94A3B8" opacity="0.75" />
                    <text
                      x="99"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold font-mono"
                    >
                      T6
                    </text>

                    {/* T7: 1620 & 1060 */}
                    <rect x="130" y="44" width="14" height="91" rx="3" fill="#2563EB" opacity="0.9" />
                    <rect x="146" y="76" width="14" height="59" rx="3" fill="#94A3B8" opacity="0.75" />
                    <text
                      x="145"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold font-mono"
                    >
                      T7
                    </text>

                    {/* T8: 1710 & 1110 */}
                    <rect x="176" y="39" width="14" height="96" rx="3" fill="#2563EB" opacity="0.9" />
                    <rect x="192" y="73" width="14" height="62" rx="3" fill="#94A3B8" opacity="0.75" />
                    <text
                      x="191"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold font-mono"
                    >
                      T8
                    </text>

                    {/* T9: 1790 & 1160 */}
                    <rect x="222" y="34" width="14" height="101" rx="3" fill="#2563EB" opacity="0.9" />
                    <rect x="238" y="70" width="14" height="65" rx="3" fill="#94A3B8" opacity="0.75" />
                    <text
                      x="237"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold font-mono"
                    >
                      T9
                    </text>

                    {/* T10: 1840 & 1196 (Highlighted) */}
                    <rect x="268" y="30" width="14" height="105" rx="3" fill="#1D4ED8" />
                    <rect x="284" y="68" width="14" height="67" rx="3" fill="#64748B" />
                    <text
                      x="283"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-blue-700 font-bold font-mono"
                    >
                      T10
                    </text>
                  </svg>
                </div>
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-blue-600"></span>
                  <span className="text-slate-600 font-medium">Doanh thu (1.840 Tr)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-xs bg-slate-400"></span>
                  <span className="text-slate-600 font-medium">Giá vốn (1.196 Tr)</span>
                </div>
              </div>
            </div>

            {/* 2. BIỂU ĐỒ VIỀN / ĐƯỜNG (Biên lợi nhuận gộp) */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                      <TrendingUp size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Biểu đồ viền (đường)
                      </h3>
                      <p className="text-[10px] text-slate-400">Xu hướng biên lợi nhuận (%)</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-100 font-mono">
                    Đạt 35.0%
                  </span>
                </div>

                {/* SVG Line / Area Chart */}
                <div className="w-full h-48 py-2">
                  <svg viewBox="0 0 320 160" className="w-full h-full">
                    <defs>
                      <linearGradient id="tealGradientArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0D9488" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line
                      x1="25"
                      y1="20"
                      x2="310"
                      y2="20"
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="25"
                      y1="60"
                      x2="310"
                      y2="60"
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1="25"
                      y1="100"
                      x2="310"
                      y2="100"
                      stroke="#f1f5f9"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <line x1="25" y1="135" x2="310" y2="135" stroke="#e2e8f0" strokeWidth="1" />

                    {/* Y-axis labels */}
                    <text x="20" y="24" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                      40%
                    </text>
                    <text x="20" y="64" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                      30%
                    </text>
                    <text x="20" y="104" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                      20%
                    </text>
                    <text x="20" y="138" textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                      10%
                    </text>

                    {/* Area under curve */}
                    <path
                      d="M 45 105 C 85 96, 115 88, 145 78 C 175 68, 215 54, 255 42 C 275 36, 290 32, 295 30 L 295 135 L 45 135 Z"
                      fill="url(#tealGradientArea)"
                    />

                    {/* Glowing Stroke line */}
                    <path
                      d="M 45 105 C 85 96, 115 88, 145 78 C 175 68, 215 54, 255 42 C 275 36, 290 32, 295 30"
                      fill="none"
                      stroke="#0D9488"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />

                    {/* Data Points */}
                    <circle cx="45" cy="105" r="4" fill="#ffffff" stroke="#0D9488" strokeWidth="2.5" />
                    <text
                      x="45"
                      y="120"
                      textAnchor="middle"
                      className="text-[8px] fill-slate-500 font-bold font-mono"
                    >
                      28.5%
                    </text>

                    <circle cx="95" cy="92" r="4" fill="#ffffff" stroke="#0D9488" strokeWidth="2.5" />
                    <text
                      x="95"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold font-mono"
                    >
                      T6
                    </text>

                    <circle cx="145" cy="78" r="4" fill="#ffffff" stroke="#0D9488" strokeWidth="2.5" />
                    <text
                      x="145"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold font-mono"
                    >
                      T7
                    </text>

                    <circle cx="195" cy="62" r="4" fill="#ffffff" stroke="#0D9488" strokeWidth="2.5" />
                    <text
                      x="195"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold font-mono"
                    >
                      T8
                    </text>

                    <circle cx="245" cy="46" r="4" fill="#ffffff" stroke="#0D9488" strokeWidth="2.5" />
                    <text
                      x="245"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-500 font-semibold font-mono"
                    >
                      T9
                    </text>

                    <circle cx="295" cy="30" r="5" fill="#0D9488" stroke="#ffffff" strokeWidth="2" />
                    <text
                      x="295"
                      y="150"
                      textAnchor="middle"
                      className="text-[10px] fill-teal-700 font-bold font-mono"
                    >
                      T10
                    </text>
                  </svg>
                </div>
              </div>

              {/* Legend */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                  <span className="text-slate-600 font-medium">Tăng trưởng +6.5% trong 6T</span>
                </div>
                <span className="font-bold font-mono text-teal-700">Đạt đỉnh 35%</span>
              </div>
            </div>

            {/* 3. BIỂU ĐỒ TRÒN (Cơ cấu doanh thu & chi phí) */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <PieChart size={16} />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Biểu đồ tròn
                      </h3>
                      <p className="text-[10px] text-slate-400">Cơ cấu Doanh thu & Tỷ trọng</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-mono">
                    100%
                  </span>
                </div>

                {/* SVG Donut Chart */}
                <div className="w-full h-48 flex items-center justify-center">
                  <svg viewBox="0 0 200 180" className="w-48 h-48">
                    {/* Background track */}
                    <circle cx="100" cy="90" r="50" fill="none" stroke="#f1f5f9" strokeWidth="22" />

                    {/* Slice 1: Giá vốn COGS 65% (Blue #2563EB) */}
                    <circle
                      cx="100"
                      cy="90"
                      r="50"
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth="22"
                      strokeDasharray="204.2 314.16"
                      strokeDashoffset="0"
                      transform="rotate(-90 100 90)"
                      className="transition-all duration-500"
                    />

                    {/* Slice 2: Lợi nhuận gộp ròng 20% (Emerald #10B981) */}
                    <circle
                      cx="100"
                      cy="90"
                      r="50"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="22"
                      strokeDasharray="62.8 314.16"
                      strokeDashoffset="-204.2"
                      transform="rotate(-90 100 90)"
                      className="transition-all duration-500"
                    />

                    {/* Slice 3: Chi phí vận hành, kho 15% (Amber #F59E0B) */}
                    <circle
                      cx="100"
                      cy="90"
                      r="50"
                      fill="none"
                      stroke="#F59E0B"
                      strokeWidth="22"
                      strokeDasharray="47.1 314.16"
                      strokeDashoffset="-267.0"
                      transform="rotate(-90 100 90)"
                      className="transition-all duration-500"
                    />

                    {/* Center Text */}
                    <text
                      x="100"
                      y="85"
                      textAnchor="middle"
                      className="text-base font-extrabold fill-slate-900 font-mono"
                    >
                      1.84 Tỷ
                    </text>
                    <text
                      x="100"
                      y="100"
                      textAnchor="middle"
                      className="text-[10px] fill-slate-400 font-semibold uppercase tracking-wider"
                    >
                      Doanh thu
                    </text>
                  </svg>
                </div>
              </div>

              {/* Legend with percentages */}
              <div className="pt-3 border-t border-slate-100 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <span className="text-slate-600">Giá vốn (COGS)</span>
                  </div>
                  <span className="font-bold font-mono text-slate-800">65% (1.196 Tr)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span className="text-slate-600">Lợi nhuận ròng</span>
                  </div>
                  <span className="font-bold font-mono text-emerald-700">20% (368 Tr)</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span className="text-slate-600">Chi phí vận hành & kho</span>
                  </div>
                  <span className="font-bold font-mono text-amber-700">15% (276 Tr)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 1: GỬI THÔNG BÁO ĐÁO HẠN / CẢNH BÁO NHẮC NỢ */}
      {alertModalOpen && selectedAlertItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg p-6 relative">
            <button
              type="button"
              onClick={() => setAlertModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                <Bell size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Gửi thông báo đáo hạn & Nhắc nợ
                </h3>
                <p className="text-xs text-slate-500">
                  Gửi cảnh báo thanh toán tự động tới đối tác khách hàng
                </p>
              </div>
            </div>

            {/* Thông tin khoản nợ */}
            <div className="p-3.5 bg-amber-50/60 border border-amber-200/70 rounded-xl mb-4 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Khách hàng:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {selectedAlertItem.partnerCode} • {selectedAlertItem.partnerName}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Số tiền đến hạn đợt này:</span>
                <span className="font-extrabold text-amber-700 font-mono text-sm">
                  {selectedAlertItem.dueAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-medium">Hạn thanh toán:</span>
                <span className="font-semibold text-slate-800 font-mono">
                  {selectedAlertItem.dueDate}{' '}
                  {selectedAlertItem.daysRemaining > 0
                    ? `(Còn ${selectedAlertItem.daysRemaining} ngày)`
                    : selectedAlertItem.daysRemaining === 0
                    ? '(Đáo hạn hôm nay)'
                    : `(Quá hạn ${Math.abs(selectedAlertItem.daysRemaining)} ngày)`}
                </span>
              </div>
            </div>

            {/* Kênh gửi */}
            <div className="space-y-3 mb-4">
              <label className="block text-xs font-bold text-slate-700">
                Chọn phương thức gửi cảnh báo:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAlertChannel('ZALO')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                    alertChannel === 'ZALO'
                      ? 'border-blue-500 bg-blue-50/60 text-blue-700 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <MessageSquare size={16} />
                  <span>Zalo ZNS (OA)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAlertChannel('SMS')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                    alertChannel === 'SMS'
                      ? 'border-blue-500 bg-blue-50/60 text-blue-700 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <PhoneCall size={16} />
                  <span>SMS Brandname</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAlertChannel('EMAIL')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition cursor-pointer ${
                    alertChannel === 'EMAIL'
                      ? 'border-blue-500 bg-blue-50/60 text-blue-700 shadow-2xs'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText size={16} />
                  <span>Email kế toán</span>
                </button>
              </div>
            </div>

            {/* Xem trước mẫu thông báo (Preview) */}
            <div className="mb-5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Xem trước nội dung thông báo:</span>
                <span className="text-emerald-600 font-normal normal-case">Tự động gắn thông tin đối tác</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-sans space-y-2">
                <p>
                  <strong>Kính gửi:</strong> {selectedAlertItem.partnerName} (Người nhận: {selectedAlertItem.contactPerson} - {selectedAlertItem.phone})
                </p>
                <p>
                  Công ty TNHH Đầu tư Thương mại Xuất nhập khẩu Tín Phát trân trọng thông báo: Khoản công nợ gối đầu số tiền{' '}
                  <strong className="text-amber-700 font-mono font-bold">
                    {selectedAlertItem.dueAmount.toLocaleString('vi-VN')} đ
                  </strong>{' '}
                  sẽ đến hạn thanh toán vào ngày{' '}
                  <strong className="font-mono">{selectedAlertItem.dueDate}</strong>.
                </p>
                <p className="text-[11px] text-slate-500 bg-white p-2 rounded border border-slate-200 font-mono">
                  💳 STK: 1903.8888.9999 • Techcombank - Chi nhánh Thăng Long<br />
                  Chủ TK: CÔNG TY TNHH DT TM XNK TIN PHAT<br />
                  Nội dung: {selectedAlertItem.partnerCode} THANH TOAN CONG NO
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAlertModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSendAlert}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-xs font-semibold text-white transition cursor-pointer shadow-xs"
              >
                <Send size={13} />
                <span>Xác nhận gửi thông báo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CHI TIẾT HỒ SƠ TÍN NHIỆM & THẨM ĐỊNH CHO VAY */}
      {creditModalOpen && selectedCreditItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setCreditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <Award size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                      {selectedCreditItem.partnerCode}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedCreditItem.partnerName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hồ sơ xếp hạng tín nhiệm & Thẩm định trần hạn mức cho vay mua hàng nợ
                  </p>
                </div>
              </div>

              {/* Hạng tín nhiệm Badge */}
              <div
                className={`px-3 py-1.5 rounded-xl border text-center shrink-0 ${
                  selectedCreditItem.creditRating === 'AAA'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : selectedCreditItem.creditRating === 'AA'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : selectedCreditItem.creditRating === 'A'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : selectedCreditItem.creditRating === 'BBB'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider">HẠNG TÍN NHIỆM</div>
                <div className="text-lg font-black font-mono">HẠNG {selectedCreditItem.creditRating}</div>
              </div>
            </div>

            {/* Credit Score Summary Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/70 border border-blue-100/80 mb-5 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  ĐIỂM ĐÁNH GIÁ TÍN NHIỆM DOANH NGHIỆP
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black text-slate-900 font-mono">
                    {selectedCreditItem.creditScore}
                  </span>
                  <span className="text-xs text-slate-500 font-mono font-semibold">/ 100 Điểm</span>
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                      selectedCreditItem.creditScore >= 85
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedCreditItem.creditScore >= 65
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {selectedCreditItem.creditScore >= 85
                      ? 'Rủi ro rất thấp • Khả năng trả nợ xuất sắc'
                      : selectedCreditItem.creditScore >= 65
                      ? 'Rủi ro trung bình • Cần theo dõi'
                      : 'Rủi ro cao • Khuyến nghị chặn bán nợ'}
                  </span>
                </div>
              </div>

              <div className="w-24 text-right">
                <div className="text-[10px] text-slate-500">Mức độ an toàn</div>
                <div className="w-full h-2 rounded-full bg-slate-200 mt-1 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      selectedCreditItem.creditScore >= 85
                        ? 'bg-emerald-500'
                        : selectedCreditItem.creditScore >= 65
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${selectedCreditItem.creditScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 4 Trụ Cột Thẩm Định Tín Dụng & Cho Vay */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-5">
              {/* Tiêu chí 1: Lịch sử thanh toán đúng hạn */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="font-semibold">Lịch sử trả nợ đúng hạn</span>
                  <Check size={14} className="text-emerald-600" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900">
                  {selectedCreditItem.onTimePaymentRate}%
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tỷ lệ các kỳ thanh toán đúng hoặc trước hạn trong 12 tháng qua.
                </p>
              </div>

              {/* Tiêu chí 2: Doanh số mua hàng 12 tháng */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="font-semibold">Doanh số mua hàng lũy kế (12T)</span>
                  <TrendingUp size={14} className="text-blue-600" />
                </div>
                <div className="text-xl font-bold font-mono text-blue-700">
                  {selectedCreditItem.annualRevenue.toLocaleString('vi-VN')} đ
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Khách hàng đối tác lớn, đóng góp ổn định vào sản lượng xuất xưởng.
                </p>
              </div>

              {/* Tiêu chí 3: Số ngày nợ bình quân (DSO) */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="font-semibold">Thời gian công nợ trung bình (DSO)</span>
                  <Clock size={14} className="text-amber-600" />
                </div>
                <div className="text-xl font-bold font-mono text-slate-900">
                  {selectedCreditItem.avgPaymentDays} ngày
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Thời gian quay vòng công nợ thực tế (Trần tiêu chuẩn: ≤ 30 ngày).
                </p>
              </div>

              {/* Tiêu chí 4: Tài sản đảm bảo / Cam kết */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                  <span className="font-semibold">Biện pháp bảo đảm / Cam kết</span>
                  <ShieldCheck size={14} className="text-emerald-600" />
                </div>
                <div className="text-xs font-bold text-slate-800 line-clamp-2">
                  {selectedCreditItem.collateral}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Giá trị pháp lý hợp đồng bảo lãnh nợ đối với Tín Phát.
                </p>
              </div>
            </div>

            {/* Đánh Giá & Quyết Định Thẩm Định Cho Vay */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 mb-5 text-xs space-y-2">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                KẾT QUẢ THẨM ĐỊNH VÀ KHUYẾN NGHỊ CHO VAY
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1">
                <div>
                  <div className="text-slate-500 text-[11px]">Hạn mức hiện cấp:</div>
                  <div className="font-bold font-mono text-slate-800">
                    {selectedCreditItem.creditLimit.toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Dư nợ hiện tại:</div>
                  <div className="font-bold font-mono text-slate-900">
                    {selectedCreditItem.currentDebt.toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Sức vay còn lại:</div>
                  <div className="font-bold font-mono text-emerald-700">
                    {Math.max(0, selectedCreditItem.creditLimit - selectedCreditItem.currentDebt).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-start gap-2">
                <Sparkles size={15} className="text-blue-600 shrink-0 mt-0.5" />
                <span className="text-slate-700 leading-relaxed">
                  <strong>Khuyến nghị hệ thống:</strong> {selectedCreditItem.loanRecommendation}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleToggleCreditLock(selectedCreditItem)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  selectedCreditItem.isCreditLocked
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                {selectedCreditItem.isCreditLocked ? (
                  <>
                    <Unlock size={14} />
                    <span>Mở khóa cho vay nợ</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Khóa bán nợ tạm thời</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setCreditModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
              >
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CHI TIẾT BIẾN ĐỘNG GIÁ VỐN MAC QUA CÁC KỲ NHẬP XUẤT */}
      {macModalOpen && selectedMacItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setMacModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 shrink-0">
                  <Calculator size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                      {selectedMacItem.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedMacItem.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sổ theo dõi lịch sử biến động đơn giá vốn bình quân di động (Moving Average Cost)
                  </p>
                </div>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl border border-teal-200 bg-teal-50 text-right shrink-0">
                <div className="text-[10px] uppercase font-bold text-teal-800 tracking-wider">ĐƠN GIÁ MAC HIỆN TẠI</div>
                <div className="text-lg font-black font-mono text-teal-700">
                  {selectedMacItem.macPrice.toLocaleString('vi-VN')} đ
                </div>
              </div>
            </div>

            {/* Box minh họa công thức chốt MAC kỳ nhập gần nhất */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-teal-50/70 via-slate-50 to-blue-50/70 border border-teal-100 mb-4 text-xs space-y-2">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="flex items-center gap-1.5 text-teal-800">
                  <Sparkles size={14} className="text-teal-600" />
                  <span>Giải trình công thức chốt giá vốn kỳ gần nhất (BR-29):</span>
                </span>
                <span className="text-slate-500 font-mono text-[11px] font-normal">
                  Kho: {selectedMacItem.warehouse}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-1 font-mono">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-sans">Tồn trước nhập:</div>
                  <div className="font-bold text-slate-900">
                    {Math.max(0, selectedMacItem.stockQty - (selectedMacItem.history[0]?.qtyChange || 0)).toLocaleString('vi-VN')} {selectedMacItem.unit}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-[10px] text-slate-500 font-sans">Lô nhập mới nhất:</div>
                  <div className="font-bold text-blue-700">
                    +{selectedMacItem.history[0]?.qtyChange || 0} {selectedMacItem.unit} @ {selectedMacItem.lastImportPrice.toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-teal-200 bg-teal-50/50">
                  <div className="text-[10px] text-teal-800 font-sans">Đơn giá MAC chốt:</div>
                  <div className="font-extrabold text-teal-700">
                    = {selectedMacItem.macPrice.toLocaleString('vi-VN')} đ/{selectedMacItem.unit}
                  </div>
                </div>
              </div>
            </div>

            {/* Bảng lịch sử các kỳ nhập xuất */}
            <div className="space-y-2 mb-4">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                NHẬT KÝ BIẾN ĐỘNG THEO CHỨNG TỪ KHO
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3">NGÀY &amp; SỐ CHỨNG TỪ</th>
                      <th className="py-2.5 px-3">NGHIỆP VỤ</th>
                      <th className="py-2.5 px-3 text-right">SỐ LƯỢNG</th>
                      <th className="py-2.5 px-3 text-right">ĐƠN GIÁ LÔ</th>
                      <th className="py-2.5 px-3 text-right">MAC SAU GD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedMacItem.history.map((h, i) => (
                      <tr key={i} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-mono font-bold text-blue-700">{h.docCode}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{h.date}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-800">{h.typeName}</div>
                          <div className="text-[10px] text-slate-500">{h.note}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">
                          <span className={h.qtyChange > 0 ? 'text-emerald-600' : 'text-slate-600'}>
                            {h.qtyChange > 0 ? `+${h.qtyChange}` : h.qtyChange} {selectedMacItem.unit}
                          </span>
                          <div className="text-[10px] text-slate-400 font-normal">
                            Tồn: {h.balanceQty}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                          {h.unitPrice.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-teal-700 bg-teal-50/40">
                          {h.macAfter.toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setMacModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
              >
                Đóng sổ theo dõi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
