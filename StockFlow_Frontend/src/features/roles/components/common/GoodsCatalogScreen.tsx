// src/features/roles/components/common/GoodsCatalogScreen.tsx
// Màn hình Danh mục Hàng hóa & Tồn kho Master Data cho toàn bộ các Role trong hệ thống

import React, { useState } from 'react';
import {
  Package,
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit2,
  Trash2,
  Plus,
  ArrowUpRight,
  Building,
  Layers,
  FileSpreadsheet,
  Printer,
  X,
  Sparkles,
  ShieldCheck,
  Tag,
  Warehouse,
  Clock,
  ChevronRight,
  TrendingUp,
  History,
  QrCode,
} from 'lucide-react';

export interface GoodsItem {
  id: string;
  code: string;
  name: string;
  category: 'Thành phẩm' | 'Nguyên vật liệu';
  subCategory: string;
  uom: string;
  specification: string;
  warehouse: string;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minSafeStock: number;
  maxSafeStock: number;
  standardPrice: number;
  costPrice: number;
  barcode: string;
  status: 'ACTIVE' | 'DISCONTINUED';
  stockByWarehouse: {
    warehouseName: string;
    actualStock: number;
    availableStock: number;
  }[];
  stockCardRecent: {
    date: string;
    docCode: string;
    type: 'NHAP' | 'XUAT' | 'CHUYEN';
    typeName: string;
    qtyChange: number;
    balance: number;
    partnerOrDept: string;
  }[];
}

const INITIAL_GOODS_LIST: GoodsItem[] = [
  {
    id: 'G-01',
    code: 'TP-SP01',
    name: 'Tấm ốp Nano PVC vân đá 9mm',
    category: 'Thành phẩm',
    subCategory: 'Tấm ốp Nano PVC',
    uom: 'Tấm',
    specification: '9mm × 400mm × 3000mm (Vân đá Carrara trắng)',
    warehouse: 'Kho Tổng Gia Lâm',
    stockQuantity: 1250,
    reservedQuantity: 200,
    availableQuantity: 1050,
    minSafeStock: 500,
    maxSafeStock: 3000,
    standardPrice: 145000,
    costPrice: 112000,
    barcode: '8936001230012',
    status: 'ACTIVE',
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', actualStock: 1150, availableStock: 950 },
      { warehouseName: 'Kho Đông Anh', actualStock: 100, availableStock: 100 },
    ],
    stockCardRecent: [
      { date: '15/10/2026', docCode: 'NK-2026-042', type: 'NHAP', typeName: 'Nhập kho sản xuất (Xưởng)', qtyChange: 500, balance: 1250, partnerOrDept: 'Xưởng đùn tấm K3' },
      { date: '10/10/2026', docCode: 'XK-2026-089', type: 'XUAT', typeName: 'Xuất kho bán hàng B2B', qtyChange: -200, balance: 750, partnerOrDept: 'Công ty Cổ phần Nội thất An Phát' },
      { date: '02/10/2026', docCode: 'NK-2026-031', type: 'NHAP', typeName: 'Nhập kho thành phẩm đợt 1', qtyChange: 950, balance: 950, partnerOrDept: 'Lệnh sản xuất MO-2026-001' },
    ],
  },
  {
    id: 'G-02',
    code: 'TP-SP02',
    name: 'Phào chỉ cổ trần PU dát vàng 8cm',
    category: 'Thành phẩm',
    subCategory: 'Phào chỉ PU',
    uom: 'Cây 2.4m',
    specification: 'Bản rộng 8cm, dài 2.4m hoa văn dát vàng hoàng gia',
    warehouse: 'Kho Tổng Gia Lâm',
    stockQuantity: 280,
    reservedQuantity: 40,
    availableQuantity: 240,
    minSafeStock: 100,
    maxSafeStock: 800,
    standardPrice: 85000,
    costPrice: 58000,
    barcode: '8936001230029',
    status: 'ACTIVE',
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', actualStock: 280, availableStock: 240 },
    ],
    stockCardRecent: [
      { date: '12/10/2026', docCode: 'PN-2026-082', type: 'NHAP', typeName: 'Nhập kho hàng nhập khẩu', qtyChange: 150, balance: 280, partnerOrDept: 'NCC Vật liệu Đài Loan' },
      { date: '05/10/2026', docCode: 'XK-2026-075', type: 'XUAT', typeName: 'Xuất kho công trình', qtyChange: -50, balance: 130, partnerOrDept: 'Biệt thự Starlake Tây Hồ' },
    ],
  },
  {
    id: 'G-03',
    code: 'TP-SP03',
    name: 'Nẹp nhôm chữ T mạ Anode',
    category: 'Thành phẩm',
    subCategory: 'Nẹp trang trí',
    uom: 'Thanh 2.5m',
    specification: 'Bản rộng 20mm, dài 2.5m mạ anode vàng bóng chống xước',
    warehouse: 'Kho Đông Anh',
    stockQuantity: 640,
    reservedQuantity: 80,
    availableQuantity: 560,
    minSafeStock: 300,
    maxSafeStock: 1500,
    standardPrice: 38000,
    costPrice: 26000,
    barcode: '8936001230036',
    status: 'ACTIVE',
    stockByWarehouse: [
      { warehouseName: 'Kho Đông Anh', actualStock: 640, availableStock: 560 },
    ],
    stockCardRecent: [
      { date: '14/10/2026', docCode: 'PN-2026-086', type: 'NHAP', typeName: 'Nhập mua hàng NCC Tân Á', qtyChange: 300, balance: 640, partnerOrDept: 'Công ty Nhôm Tân Á' },
    ],
  },
  {
    id: 'G-04',
    code: 'TP-SP04',
    name: 'Tấm ốp Lam sóng PVC 4 sóng thấp',
    category: 'Thành phẩm',
    subCategory: 'Lam sóng PVC',
    uom: 'Thanh 3m',
    specification: '15mm × 150mm × 3000mm (Màu vân gỗ sồi tự nhiên)',
    warehouse: 'Kho Tổng Gia Lâm',
    stockQuantity: 420,
    reservedQuantity: 50,
    availableQuantity: 370,
    minSafeStock: 200,
    maxSafeStock: 1200,
    standardPrice: 125000,
    costPrice: 92000,
    barcode: '8936001230043',
    status: 'ACTIVE',
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', actualStock: 420, availableStock: 370 },
    ],
    stockCardRecent: [
      { date: '08/10/2026', docCode: 'NK-2026-038', type: 'NHAP', typeName: 'Nhập kho thành phẩm sản xuất', qtyChange: 200, balance: 420, partnerOrDept: 'Phân xưởng định hình số 2' },
    ],
  },
  {
    id: 'G-05',
    code: 'TP-SP05',
    name: 'Tấm ốp than tre đa năng sợi kim loại',
    category: 'Thành phẩm',
    subCategory: 'Tấm than tre cao cấp',
    uom: 'Tấm',
    specification: '8mm × 1220mm × 2800mm (Bề mặt phay xước champagne)',
    warehouse: 'Kho Tổng Gia Lâm',
    stockQuantity: 180,
    reservedQuantity: 20,
    availableQuantity: 160,
    minSafeStock: 80,
    maxSafeStock: 500,
    standardPrice: 390000,
    costPrice: 285000,
    barcode: '8936001230050',
    status: 'ACTIVE',
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', actualStock: 180, availableStock: 160 },
    ],
    stockCardRecent: [
      { date: '11/10/2026', docCode: 'PN-2026-080', type: 'NHAP', typeName: 'Nhập mua hàng cao cấp', qtyChange: 100, balance: 180, partnerOrDept: 'Tập đoàn Vật liệu Xanh' },
    ],
  },
  {
    id: 'G-06',
    code: 'TP-NV01',
    name: 'Hạt nhựa PVC nguyên sinh SG5',
    category: 'Nguyên vật liệu',
    subCategory: 'Hạt nhựa công nghiệp',
    uom: 'Kg',
    specification: 'Bao 25kg, độ tinh khiết 99.8%, xuất xứ Formosa',
    warehouse: 'Kho Tổng Gia Lâm',
    stockQuantity: 18500,
    reservedQuantity: 5000,
    availableQuantity: 13500,
    minSafeStock: 5000,
    maxSafeStock: 30000,
    standardPrice: 0,
    costPrice: 28500,
    barcode: '8936001230104',
    status: 'ACTIVE',
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', actualStock: 18500, availableStock: 13500 },
    ],
    stockCardRecent: [
      { date: '14/10/2026', docCode: 'PN-2026-088', type: 'NHAP', typeName: 'Nhập cảng Hải Phòng (Landed Cost)', qtyChange: 10000, balance: 18500, partnerOrDept: 'Cảng Tân Vũ Hải Phòng' },
      { date: '06/10/2026', docCode: 'XK-NV-034', type: 'XUAT', typeName: 'Xuất xưởng sản xuất', qtyChange: -5000, balance: 8500, partnerOrDept: 'Lệnh sản xuất MO-2026-002' },
    ],
  },
  {
    id: 'G-07',
    code: 'TP-NV02',
    name: 'Bột đá Canxi Cacbonat siêu mịn CaCO3',
    category: 'Nguyên vật liệu',
    subCategory: 'Khoáng chất độn',
    uom: 'Tấn',
    specification: 'Bao Jumbo 1 tấn, độ mịn 1500 mesh tráng phủ axit béo',
    warehouse: 'Kho Đông Anh',
    stockQuantity: 12,
    reservedQuantity: 4,
    availableQuantity: 8,
    minSafeStock: 15,
    maxSafeStock: 50,
    standardPrice: 0,
    costPrice: 1450000,
    barcode: '8936001230203',
    status: 'ACTIVE',
    stockByWarehouse: [
      { warehouseName: 'Kho Đông Anh', actualStock: 12, availableStock: 8 },
    ],
    stockCardRecent: [
      { date: '08/10/2026', docCode: 'PN-2026-079', type: 'NHAP', typeName: 'Nhập kho NCC Yên Bái', qtyChange: 8, balance: 12, partnerOrDept: 'Công ty Khoáng sản Yên Bái' },
    ],
  },
  {
    id: 'G-08',
    code: 'TP-NV03',
    name: 'Màng Film PVC vân gỗ sồi đỏ',
    category: 'Nguyên vật liệu',
    subCategory: 'Màng cán nhiệt',
    uom: 'Cuộn 500m',
    specification: 'Khổ rộng 1260mm, dày 0.16mm, cuộn 500 mét dài',
    warehouse: 'Kho Đông Anh',
    stockQuantity: 45,
    reservedQuantity: 10,
    availableQuantity: 35,
    minSafeStock: 20,
    maxSafeStock: 100,
    standardPrice: 0,
    costPrice: 3200000,
    barcode: '8936001230302',
    status: 'ACTIVE',
    stockByWarehouse: [
      { warehouseName: 'Kho Đông Anh', actualStock: 45, availableStock: 35 },
    ],
    stockCardRecent: [
      { date: '16/10/2026', docCode: 'KK-2026-041', type: 'NHAP', typeName: 'Điều chỉnh kiểm kê thừa', qtyChange: 2, balance: 45, partnerOrDept: 'Kho Đông Anh' },
    ],
  },
];

interface GoodsCatalogScreenProps {
  onNavigate?: (screenId: string) => void;
  currentRole?: string;
}

export const GoodsCatalogScreen: React.FC<GoodsCatalogScreenProps> = ({
  onNavigate,
  currentRole = 'warehouse',
}) => {
  // Phân quyền theo vai trò (Role-Based Access Control - RBAC)
  const role = (currentRole || 'WAREHOUSE').toUpperCase();

  const [goods, setGoods] = useState<GoodsItem[]>(INITIAL_GOODS_LIST);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'Thành phẩm' | 'Nguyên vật liệu' | 'LOW_STOCK'>(
    role === 'SALES' ? 'Thành phẩm' : role === 'PRODUCTION' ? 'Nguyên vật liệu' : 'ALL'
  );
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');

  // Modal Chi tiết & Thẻ kho
  const [selectedItem, setSelectedItem] = useState<GoodsItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Modal Thêm mới / Chỉnh sửa
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GoodsItem | null>(null);
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Thành phẩm' | 'Nguyên vật liệu'>('Thành phẩm');
  const [formSubCategory, setFormSubCategory] = useState('');
  const [formUom, setFormUom] = useState('Tấm');
  const [formSpec, setFormSpec] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('Kho Tổng Gia Lâm');
  const [formStandardPrice, setFormStandardPrice] = useState(150000);
  const [formCostPrice, setFormCostPrice] = useState(110000);
  const [formMinSafe, setFormMinSafe] = useState(100);
  const [formMaxSafe, setFormMaxSafe] = useState(2000);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 1. Quyền xem Giá vốn MAC & Biên lợi nhuận (Chỉ Quản lý & Admin, bảo mật tuyệt đối với Sales/Kho/Sản xuất)
  const canViewCostPrice = role === 'ADMIN' || role === 'MANAGER';

  // 2. Quyền xem Giá bán niêm yết (Admin, Quản lý, Sales)
  const canViewSellingPrice = role === 'ADMIN' || role === 'MANAGER' || role === 'SALES';

  // 3. Quyền quản trị Master Data (Tạo mới SKU, chỉnh sửa thông số kỹ thuật)
  const canManageMaster = role === 'ADMIN' || role === 'MANAGER';

  // 4. Quyền xóa / vô hiệu hóa mã hàng khỏi danh mục hệ thống
  const canDelete = role === 'ADMIN';

  // 5. Quyền xem Sổ Thẻ kho điện tử (Kho, Quản lý, Admin)
  const canViewStockCard = role === 'ADMIN' || role === 'MANAGER' || role === 'WAREHOUSE';

  const handleOpenDetail = (item: GoodsItem) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormCode(`TP-SP0${goods.length + 1}`);
    setFormName('');
    setFormCategory('Thành phẩm');
    setFormSubCategory('Tấm ốp PVC');
    setFormUom('Tấm');
    setFormSpec('');
    setFormWarehouse('Kho Tổng Gia Lâm');
    setFormStandardPrice(150000);
    setFormCostPrice(110000);
    setFormMinSafe(200);
    setFormMaxSafe(2500);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (item: GoodsItem) => {
    setEditingItem(item);
    setFormCode(item.code);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormSubCategory(item.subCategory);
    setFormUom(item.uom);
    setFormSpec(item.specification);
    setFormWarehouse(item.warehouse);
    setFormStandardPrice(item.standardPrice);
    setFormCostPrice(item.costPrice);
    setFormMinSafe(item.minSafeStock);
    setFormMaxSafe(item.maxSafeStock);
    setEditModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      alert('Vui lòng điền đầy đủ Mã hàng và Tên hàng hóa!');
      return;
    }

    if (editingItem) {
      setGoods((prev) =>
        prev.map((g) =>
          g.id === editingItem.id
            ? {
                ...g,
                code: formCode,
                name: formName,
                category: formCategory,
                subCategory: formSubCategory,
                uom: formUom,
                specification: formSpec,
                warehouse: formWarehouse,
                standardPrice: Number(formStandardPrice),
                costPrice: Number(formCostPrice),
                minSafeStock: Number(formMinSafe),
                maxSafeStock: Number(formMaxSafe),
              }
            : g
        )
      );
      showToast(`Đã cập nhật hàng hóa: ${formName}`);
    } else {
      const newItem: GoodsItem = {
        id: `G-${Date.now()}`,
        code: formCode,
        name: formName,
        category: formCategory,
        subCategory: formSubCategory || 'Mặt hàng mới',
        uom: formUom,
        specification: formSpec || 'Quy cách chuẩn nhà máy Tín Phát',
        warehouse: formWarehouse,
        stockQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        minSafeStock: Number(formMinSafe),
        maxSafeStock: Number(formMaxSafe),
        standardPrice: Number(formStandardPrice),
        costPrice: Number(formCostPrice),
        barcode: `893600${Math.floor(1000000 + Math.random() * 9000000)}`,
        status: 'ACTIVE',
        stockByWarehouse: [{ warehouseName: formWarehouse, actualStock: 0, availableStock: 0 }],
        stockCardRecent: [],
      };
      setGoods((prev) => [newItem, ...prev]);
      showToast(`Đã thêm mới mặt hàng: ${formName}`);
    }
    setEditModalOpen(false);
  };

  const handleDeleteItem = (item: GoodsItem) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa mặt hàng "${item.name}" khỏi danh mục?`)) {
      setGoods((prev) => prev.filter((g) => g.id !== item.id));
      showToast(`Đã xóa mặt hàng ${item.code}`);
    }
  };

  // Filtered List
  const filteredGoods = goods.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.subCategory.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search);

    if (!matchSearch) return false;

    if (categoryFilter === 'Thành phẩm' || categoryFilter === 'Nguyên vật liệu') {
      if (item.category !== categoryFilter) return false;
    } else if (categoryFilter === 'LOW_STOCK') {
      if (item.stockQuantity >= item.minSafeStock) return false;
    }

    if (warehouseFilter !== 'ALL') {
      if (item.warehouse !== warehouseFilter) return false;
    }

    return true;
  });

  // KPI Metrics
  const totalSku = goods.length;
  const finishedCount = goods.filter((g) => g.category === 'Thành phẩm').length;
  const rawCount = goods.filter((g) => g.category === 'Nguyên vật liệu').length;
  const lowStockCount = goods.filter((g) => g.stockQuantity < g.minSafeStock).length;
  const totalAvailableQty = goods.filter((g) => g.category === 'Thành phẩm').reduce((sum, g) => sum + g.availableQuantity, 0);
  const totalReservedQty = goods.filter((g) => g.category === 'Thành phẩm').reduce((sum, g) => sum + g.reservedQuantity, 0);
  const totalValuationMac = goods.reduce((sum, g) => sum + g.stockQuantity * g.costPrice, 0);
  const totalRawStockQty = goods.filter((g) => g.category === 'Nguyên vật liệu').reduce((sum, g) => sum + g.stockQuantity, 0);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Danh mục Hàng hóa &amp; Tồn kho
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Master Data • Tín Phát
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị mã sản phẩm, thành phẩm xuất bán, nguyên vật liệu xưởng và định mức an toàn tồn kho
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => showToast('Đang kết xuất tệp Excel danh mục hàng hóa...')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet size={14} className="text-slate-500" />
            <span>Xuất file Excel</span>
          </button>

          {canManageMaster && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              <span>Thêm hàng hóa mới</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. 4 Thẻ KPI Thống Kê Tổng Quan (Biến đổi thông minh theo Role) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số SKU / Thành phẩm */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                {role === 'SALES'
                  ? 'THÀNH PHẨM XUẤT BÁN'
                  : role === 'PRODUCTION'
                  ? 'DANH MỤC VẬT TƯ XƯỞNG'
                  : 'TỔNG DANH MỤC MẶT HÀNG'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Package size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-blue-700 font-mono">
              {role === 'SALES' ? finishedCount : role === 'PRODUCTION' ? rawCount : totalSku} {role === 'PRODUCTION' ? 'vật tư' : 'SKU'}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {role === 'SALES' ? 'Mã hàng thương mại' : role === 'PRODUCTION' ? 'Cấp xưởng đùn ép' : 'Toàn bộ danh mục'}
            </span>
            <span className="font-semibold text-slate-700">
              {role === 'SALES' ? 'Kinh doanh B2B' : '100% đang quản lý'}
            </span>
          </div>
        </div>

        {/* Card 2: Thành phẩm / Tồn khả dụng ATP / Định giá MAC */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700">
                {role === 'SALES'
                  ? 'TỒN KHẢ DỤNG (ATP)'
                  : role === 'MANAGER'
                  ? 'ĐỊNH GIÁ TỒN THEO MAC'
                  : role === 'PRODUCTION'
                  ? 'THÀNH PHẨM THEO BOM'
                  : 'THÀNH PHẨM XUẤT BÁN'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono">
              {role === 'SALES'
                ? `${totalAvailableQty.toLocaleString('vi-VN')} Tấm`
                : role === 'MANAGER'
                ? `${(totalValuationMac / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr đ`
                : `${finishedCount} mặt hàng`}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {role === 'SALES'
                ? 'Hàng tự do để bán ngay'
                : role === 'MANAGER'
                ? 'Tổng giá trị vốn lưu động'
                : 'Tấm ốp, phào, nẹp'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              {role === 'SALES' ? 'Sẵn sàng giao' : role === 'MANAGER' ? 'Giá vốn bình quân' : 'Kinh doanh B2B'}
            </span>
          </div>
        </div>

        {/* Card 3: Nguyên vật liệu / Hàng giữ chỗ / Tồn kho NVL */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700">
                {role === 'SALES'
                  ? 'HÀNG ĐANG GIỮ CHỖ'
                  : role === 'PRODUCTION'
                  ? 'TỔNG TỒN VẬT TƯ ĐẦU VÀO'
                  : 'NGUYÊN VẬT LIỆU XƯỞNG'}
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Boxes size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono">
              {role === 'SALES'
                ? `${totalReservedQty.toLocaleString('vi-VN')} Tấm`
                : role === 'PRODUCTION'
                ? `${totalRawStockQty.toLocaleString('vi-VN')} ĐVT`
                : `${rawCount} loại vật tư`}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {role === 'SALES'
                ? 'Khóa theo đơn chờ xuất'
                : role === 'PRODUCTION'
                ? 'Sẵn sàng nạp máy đùn'
                : 'Hạt nhựa, bột đá, film'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
              {role === 'SALES' ? 'Đã gán đơn' : 'Cấp xưởng sản xuất'}
            </span>
          </div>
        </div>

        {/* Card 4: Cảnh báo mức an toàn */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-rose-700">
                CẢNH BÁO TỒN KHO THẤP
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 font-mono">
              {lowStockCount} mặt hàng chạm ngưỡng
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Dưới mức Min an toàn</span>
            <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
              Cần nhập / Ép thêm
            </span>
          </div>
        </div>
      </div>

      {/* 3. Thanh Tìm Kiếm, Bộ Lọc Nhanh & Lọc Kho */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto flex-1">
          {/* Input Search */}
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hàng, mã TP-SP, mã vạch..."
              className="w-full h-9 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Quick Filter Tabs (Segmented Control phong cách hiện đại, thanh thoát) */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl gap-1 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                categoryFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({goods.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('Thành phẩm')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === 'Thành phẩm'
                  ? 'bg-white text-blue-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package size={13} className="text-blue-600" />
              <span>Thành phẩm ({finishedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('Nguyên vật liệu')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === 'Nguyên vật liệu'
                  ? 'bg-white text-amber-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Boxes size={13} className="text-amber-600" />
              <span>Nguyên vật liệu ({rawCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                categoryFilter === 'LOW_STOCK'
                  ? 'bg-white text-rose-700 shadow-2xs font-bold'
                  : 'text-rose-600 hover:text-rose-700'
              }`}
            >
              <AlertTriangle size={13} className="text-rose-600" />
              <span>Tồn thấp ({lowStockCount})</span>
            </button>
          </div>
        </div>

        {/* Filter Warehouse Dropdown */}
        <div className="relative w-full sm:w-56 shrink-0">
          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer font-medium"
          >
            <option value="ALL">Tất cả các kho lưu trữ</option>
            <option value="Kho Tổng Gia Lâm">Kho Tổng Gia Lâm</option>
            <option value="Kho Đông Anh">Kho Đông Anh</option>
          </select>
        </div>
      </div>

      {/* 4. Bảng Danh Sách Hàng Hóa Chuẩn Enterprise (Giao diện tinh giản, thoáng đãng) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4 min-w-[240px]">MÃ &amp; TÊN SẢN PHẨM</th>
                <th className="py-3.5 px-4 min-w-[150px]">PHÂN LOẠI &amp; KHO</th>
                <th className="py-3.5 px-4 text-right min-w-[160px]">TỒN KHO &amp; KHẢ DỤNG</th>
                <th className="py-3.5 px-4 text-right min-w-[170px]">
                  {canViewCostPrice
                    ? 'GIÁ BÁN / GIÁ VỐN MAC'
                    : canViewSellingPrice
                    ? 'GIÁ BÁN NIÊM YẾT'
                    : 'QUY CÁCH KỸ THUẬT'}
                </th>
                <th className="py-3.5 px-4 text-center min-w-[130px]">TRẠNG THÁI</th>
                <th className="py-3.5 px-4 text-center min-w-[110px]">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredGoods.map((item) => {
                const isLow = item.stockQuantity < item.minSafeStock;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    {/* 1. Mã & Tên hàng */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200/60">
                          {item.code}
                        </span>
                        <span className="font-bold text-slate-800 text-xs">
                          {item.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                        {item.specification}
                      </div>
                    </td>

                    {/* 2. Phân loại & Kho */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.category === 'Thành phẩm'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {item.category}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">({item.uom})</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                        <Warehouse size={12} className="text-slate-400" />
                        <span>{item.warehouse}</span>
                      </div>
                    </td>

                    {/* 3. Tồn thực tế & Khả dụng (ATP) */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-extrabold text-sm text-slate-900">
                        {item.stockQuantity.toLocaleString('vi-VN')}{' '}
                        <span className="text-xs font-normal text-slate-400">{item.uom}</span>
                      </div>
                      <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                        Khả dụng: <span className="font-mono font-bold">{item.availableQuantity.toLocaleString('vi-VN')}</span>
                      </div>
                      {item.reservedQuantity > 0 && (
                        <div className="text-[10px] text-amber-600 font-mono mt-0.5">
                          (Giữ {item.reservedQuantity} {item.uom})
                        </div>
                      )}
                    </td>

                    {/* 4. Giá bán niêm yết / Giá vốn MAC theo RBAC */}
                    <td className="py-3.5 px-4 text-right">
                      {canViewCostPrice ? (
                        item.category === 'Thành phẩm' ? (
                          <>
                            <div className="font-bold text-slate-900 font-mono text-sm">
                              {item.standardPrice.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              MAC: {item.costPrice.toLocaleString('vi-VN')} đ{' '}
                              <span className="text-emerald-600 font-semibold">
                                (+{Math.round(((item.standardPrice - item.costPrice) / item.standardPrice) * 100)}%)
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-mono font-bold text-slate-800 text-sm">
                              {item.costPrice.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Giá vốn vật tư xưởng
                            </div>
                          </>
                        )
                      ) : canViewSellingPrice ? (
                        item.category === 'Thành phẩm' ? (
                          <>
                            <div className="font-bold text-slate-900 font-mono text-sm">
                              {item.standardPrice.toLocaleString('vi-VN')} đ
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              Giá niêm yết đại lý
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-400 italic">
                            Vật tư nội bộ xưởng
                          </div>
                        )
                      ) : (
                        <div>
                          <div className="font-medium text-slate-700 text-xs line-clamp-1">
                            {item.subCategory}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Quy chuẩn kho
                          </div>
                        </div>
                      )}
                    </td>

                    {/* 5. Trạng thái an toàn (Gọn gàng, dễ nhìn, không rối mắt) */}
                    <td className="py-3.5 px-4 text-center">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle size={12} className="text-rose-600" />
                          <span>Sắp hết (Min: {item.minSafeStock})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          <span>Đủ hàng</span>
                        </span>
                      )}
                    </td>

                    {/* 6. Thao tác */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          title="Xem chi tiết hàng hóa & thẻ kho"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-600 hover:text-blue-700 text-xs font-medium transition cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>Chi tiết</span>
                        </button>

                        {canManageMaster && (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Chỉnh sửa thông tin Master Data"
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-500 hover:text-blue-700 transition cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item)}
                            title="Xóa khỏi danh mục"
                            className="p-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL 1: CHI TIẾT HÀNG HÓA & THẺ KHO (PRODUCT STOCK CARD MODAL) */}
      {detailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setDetailModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                  <Package size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded">
                      {selectedItem.code}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        selectedItem.category === 'Thành phẩm'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {selectedItem.category}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-1">
                    {selectedItem.name}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedItem.specification}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-400">MÃ VẠCH QUY CHUẨN</div>
                <div className="font-mono font-bold text-xs text-slate-700 flex items-center gap-1 justify-end mt-0.5">
                  <QrCode size={14} className="text-slate-500" />
                  <span>{selectedItem.barcode}</span>
                </div>
              </div>
            </div>

            {/* 3 Thẻ Thông Số Tồn & Giá */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[11px] text-slate-500 font-medium">Tồn kho thực tế:</div>
                <div className="text-xl font-extrabold font-mono text-slate-900 mt-0.5">
                  {selectedItem.stockQuantity.toLocaleString('vi-VN')} {selectedItem.uom}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Kho chính: {selectedItem.warehouse}
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/70 rounded-xl">
                <div className="text-[11px] text-emerald-800 font-medium">Khả dụng xuất bán (ATP):</div>
                <div className="text-xl font-extrabold font-mono text-emerald-700 mt-0.5">
                  {selectedItem.availableQuantity.toLocaleString('vi-VN')} {selectedItem.uom}
                </div>
                <div className="text-[10px] text-amber-600 mt-1">
                  Đang giữ chỗ: {selectedItem.reservedQuantity} {selectedItem.uom}
                </div>
              </div>

              <div className="p-3.5 bg-blue-50/50 border border-blue-200/70 rounded-xl">
                <div className="text-[11px] text-blue-800 font-medium">
                  {canViewCostPrice
                    ? selectedItem.category === 'Thành phẩm'
                      ? 'Giá niêm yết bán:'
                      : 'Đơn giá vốn MAC:'
                    : canViewSellingPrice
                    ? 'Giá niêm yết bán buôn:'
                    : 'Quy cách kỹ thuật:'}
                </div>
                <div className="text-xl font-extrabold font-mono text-blue-700 mt-0.5">
                  {canViewCostPrice
                    ? selectedItem.category === 'Thành phẩm'
                      ? `${selectedItem.standardPrice.toLocaleString('vi-VN')} đ`
                      : `${selectedItem.costPrice.toLocaleString('vi-VN')} đ`
                    : canViewSellingPrice
                    ? selectedItem.category === 'Thành phẩm'
                      ? `${selectedItem.standardPrice.toLocaleString('vi-VN')} đ`
                      : 'Vật tư xưởng'
                    : selectedItem.uom}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {canViewCostPrice
                    ? selectedItem.category === 'Thành phẩm'
                      ? `Giá vốn MAC: ${selectedItem.costPrice.toLocaleString('vi-VN')} đ`
                      : 'Cấu thành Landed Cost'
                    : canViewSellingPrice
                    ? 'Bảng giá chuẩn đại lý'
                    : selectedItem.specification}
                </div>
              </div>
            </div>

            {/* Phân bổ tồn kho tại các kho */}
            <div className="space-y-2 mb-5">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                PHÂN BỔ TỒN KHO TẠI CÁC CƠ SỞ KHO
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {selectedItem.stockByWarehouse.map((w, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Warehouse size={16} className="text-blue-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">{w.warehouseName}</div>
                        <div className="text-[10px] text-slate-400">Khả dụng: {w.availableStock} {selectedItem.uom}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-slate-900">{w.actualStock}</div>
                      <div className="text-[10px] text-slate-500 font-medium">{selectedItem.uom}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sổ Thẻ Kho (Stock Card History) */}
            {canViewStockCard ? (
              <div className="space-y-2 mb-4">
                <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>NHẬT KÝ THẺ KHO GẦN NHẤT</span>
                  <span className="text-[10px] text-slate-400 normal-case font-normal">Tự động đồng bộ từ phiếu Nhập/Xuất</span>
                </div>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-2.5 px-3">NGÀY &amp; SỐ CHỨNG TỪ</th>
                        <th className="py-2.5 px-3">NGHIỆP VỤ</th>
                        <th className="py-2.5 px-3 text-right">BIẾN ĐỘNG</th>
                        <th className="py-2.5 px-3 text-right">TỒN CUỐI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedItem.stockCardRecent.length > 0 ? (
                        selectedItem.stockCardRecent.map((card, i) => (
                          <tr key={i} className="hover:bg-slate-50/60 transition">
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold text-blue-700">{card.docCode}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{card.date}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-800">{card.typeName}</div>
                              <div className="text-[10px] text-slate-500">{card.partnerOrDept}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              <span className={card.qtyChange > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                                {card.qtyChange > 0 ? `+${card.qtyChange}` : card.qtyChange} {selectedItem.uom}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-extrabold text-slate-900">
                              {card.balance.toLocaleString('vi-VN')} {selectedItem.uom}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400 text-xs">
                            Chưa có lịch sử phát sinh giao dịch cho mặt hàng này
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200/90 rounded-xl text-center mb-4">
                <div className="text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5">
                  <ShieldCheck size={15} className="text-blue-600" />
                  <span>Sổ Thẻ kho &amp; Biến động chứng từ</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Nhật ký chi tiết các lần Nhập / Xuất được phân quyền cách ly, chỉ hiển thị cho Thủ kho và Quản lý điều hành.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
              >
                Đóng chi tiết
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL 2: THÊM MỚI / CHỈNH SỬA HÀNG HÓA */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                <Tag size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingItem ? 'Chỉnh sửa Hàng hóa' : 'Thêm mới Hàng hóa / Vật tư'}
                </h3>
                <p className="text-xs text-slate-500">
                  Cập nhật danh mục hàng hóa chuẩn hệ thống Tín Phát
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mã hàng hóa <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    required
                    placeholder="VD: TP-SP09"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono font-bold text-blue-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phân loại <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Thành phẩm">Thành phẩm xuất bán</option>
                    <option value="Nguyên vật liệu">Nguyên vật liệu xưởng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên hàng hóa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="VD: Tấm ốp lam sóng 3 sóng cao"
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Đơn vị tính (ĐVT) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formUom}
                    onChange={(e) => setFormUom(e.target.value)}
                    required
                    placeholder="Tấm, Cây 2.4m, Kg, Tấn..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nhóm hàng hóa
                  </label>
                  <input
                    type="text"
                    value={formSubCategory}
                    onChange={(e) => setFormSubCategory(e.target.value)}
                    placeholder="VD: Tấm ốp Nano, Nẹp nhôm..."
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quy cách kỹ thuật / Kích thước
                </label>
                <input
                  type="text"
                  value={formSpec}
                  onChange={(e) => setFormSpec(e.target.value)}
                  placeholder="VD: 9mm × 400mm × 3000mm, phủ màng film chống ẩm..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kho mặc định lưu trữ
                  </label>
                  <select
                    value={formWarehouse}
                    onChange={(e) => setFormWarehouse(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Kho Tổng Gia Lâm">Kho Tổng Gia Lâm</option>
                    <option value="Kho Đông Anh">Kho Đông Anh</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Giá bán niêm yết (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={formStandardPrice}
                    onChange={(e) => setFormStandardPrice(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono font-bold focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mức tồn tối thiểu (Min)
                  </label>
                  <input
                    type="number"
                    value={formMinSafe}
                    onChange={(e) => setFormMinSafe(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Mức tồn tối đa (Max)
                  </label>
                  <input
                    type="number"
                    value={formMaxSafe}
                    onChange={(e) => setFormMaxSafe(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                >
                  {editingItem ? 'Lưu cập nhật' : 'Thêm hàng hóa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
