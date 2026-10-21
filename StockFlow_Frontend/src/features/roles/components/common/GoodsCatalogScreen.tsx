// src/features/roles/components/common/GoodsCatalogScreen.tsx
// Màn hình Danh mục Hàng hóa & Tồn kho Master Data cho toàn bộ các Role trong hệ thống
// Hỗ trợ thiết kế Tạo hàng hóa KiotViet chuẩn với Đơn vị tính, Thuộc tính và Ma trận biến thể
// Hỗ trợ cả TỰ NHẬP (free text) và TỰ CHỌN (dropdown suggestions) cho tất cả các trường dữ liệu

import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
  TrendingUp,
  History,
  QrCode,
  Image as ImageIcon,
  Copy,
  Info,
  Check,
  Sliders,
  Camera,
  RefreshCw,
  Star,
  ExternalLink,
} from 'lucide-react';
import { productService } from '../../services/productService';

// ─── Component Combobox Đa Năng (Vừa Tự Nhập Vừa Tự Chọn) ──────────────────────
interface CustomComboboxProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

const CustomCombobox: React.FC<CustomComboboxProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Nhập hoặc chọn...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes((value || '').toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium bg-white transition ${className}`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition"
        >
          <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-52 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1 text-xs animate-in fade-in">
          {filtered.length > 0 ? (
            filtered.map((opt, idx) => (
              <div
                key={idx}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={`px-3 py-2 cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition flex items-center justify-between ${
                  value === opt ? 'bg-blue-50/70 text-blue-700 font-bold' : 'text-slate-700'
                }`}
              >
                <span>{opt}</span>
                {value === opt && <Check size={13} className="text-blue-600" />}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-slate-400 italic text-[11px]">
              Gõ tự do để sử dụng: &ldquo;{value}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export interface GoodsVariantItem {
  id: string;
  attributeValue?: string;
  unitName: string;
  conversionRate: number;
  code: string;
  barcode: string;
  costPrice: number;
  salePrice: number;
  stock: number;
}

export interface GoodsUnitConversion {
  name: string;
  conversionRate: number;
  isBase: boolean;
  isDirectSale: boolean;
}

export interface GoodsAttributeDef {
  name: string;
  values: string[];
}

export interface GoodsItem {
  id: string;
  productId?: number;
  code: string;
  name: string;
  category: 'Thành phẩm' | 'Nguyên vật liệu';
  subCategory: string;
  brand?: string;
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
  weight?: number;
  dimensions?: { width: number; length: number; unit: string };
  locationName?: string;
  isDirectSale?: boolean;
  hasRewardPoints?: boolean;
  imageUrl?: string;
  description?: string;
  units?: GoodsUnitConversion[];
  attributes?: GoodsAttributeDef[];
  variants?: GoodsVariantItem[];
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
    id: 'G-00',
    code: 'SP652365',
    name: 'Sữa tươi Ba Vì',
    category: 'Thành phẩm',
    subCategory: 'Sữa',
    brand: 'Ba Vì Milk',
    uom: 'Hộp',
    specification: 'Hộp tiệt trùng 180ml hương vị tự nhiên',
    warehouse: 'Kho Tổng Gia Lâm',
    stockQuantity: 200,
    reservedQuantity: 0,
    availableQuantity: 200,
    minSafeStock: 0,
    maxSafeStock: 999999999,
    standardPrice: 7000,
    costPrice: 5000,
    barcode: '8936001239999',
    status: 'ACTIVE',
    weight: 180,
    dimensions: { width: 5, length: 12, unit: 'cm' },
    locationName: 'Kệ A-01-T2',
    isDirectSale: true,
    hasRewardPoints: true,
    imageUrl: '',
    description: 'Sữa tươi Ba Vì tiệt trùng nguyên chất thơm ngon bổ dưỡng, bổ sung vitamin D & Canxi.',
    units: [
      { name: 'Hộp', conversionRate: 1, isBase: true, isDirectSale: true },
      { name: 'Lốc', conversionRate: 4, isBase: false, isDirectSale: true },
      { name: 'Thùng', conversionRate: 48, isBase: false, isDirectSale: true },
    ],
    attributes: [
      { name: 'HƯƠNG VỊ', values: ['Dâu', 'Vani'] },
    ],
    variants: [
      { id: 'V-01', attributeValue: 'Dâu', unitName: 'Hộp', conversionRate: 1, code: 'SP652365', barcode: '893600123901', costPrice: 5000, salePrice: 7000, stock: 100 },
      { id: 'V-02', attributeValue: 'Vani', unitName: 'Hộp', conversionRate: 1, code: 'SP652366', barcode: '893600123902', costPrice: 5000, salePrice: 7000, stock: 100 },
      { id: 'V-03', attributeValue: 'Dâu', unitName: 'Lốc', conversionRate: 4, code: 'SP652365-LOC', barcode: '893600123903', costPrice: 20000, salePrice: 27000, stock: 25 },
      { id: 'V-04', attributeValue: 'Vani', unitName: 'Lốc', conversionRate: 4, code: 'SP652366-LOC', barcode: '893600123904', costPrice: 20000, salePrice: 27000, stock: 25 },
      { id: 'V-05', attributeValue: 'Dâu', unitName: 'Thùng', conversionRate: 48, code: 'SP652365-THUNG', barcode: '893600123905', costPrice: 240000, salePrice: 320000, stock: 10 },
      { id: 'V-06', attributeValue: 'Vani', unitName: 'Thùng', conversionRate: 48, code: 'SP652366-THUNG', barcode: '893600123906', costPrice: 240000, salePrice: 320000, stock: 10 },
    ],
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', actualStock: 200, availableStock: 200 },
    ],
    stockCardRecent: [
      { date: '23/09/2026 10:28', docCode: 'NK-2026-099', type: 'NHAP', typeName: 'Nhập kho sản xuất', qtyChange: 200, balance: 200, partnerOrDept: 'Kho Ba Vì' },
    ],
  },
  {
    id: 'G-01',
    code: 'TP-SP01',
    name: 'Tấm ốp Nano PVC vân đá 9mm',
    category: 'Thành phẩm',
    subCategory: 'Tấm ốp Nano PVC',
    brand: 'Tín Phát Premium',
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
    weight: 4500,
    dimensions: { width: 0.4, length: 3, unit: 'm' },
    locationName: 'Khu A - Dãy 3',
    isDirectSale: true,
    hasRewardPoints: true,
    imageUrl: '',
    units: [
      { name: 'Tấm', conversionRate: 1, isBase: true, isDirectSale: true },
      { name: 'Kiện (10 Tấm)', conversionRate: 10, isBase: false, isDirectSale: true },
    ],
    attributes: [
      { name: 'MÀU SẮC', values: ['Trắng Vân Mây', 'Đá Carrara', 'Xám Bê Tông'] },
    ],
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
    brand: 'Tín Phát Classic',
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
    weight: 850,
    locationName: 'Khu B - Kệ 02',
    isDirectSale: true,
    hasRewardPoints: true,
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
    brand: 'Tân Á',
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
    brand: 'Tín Phát Eco',
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
    id: 'G-06',
    code: 'TP-NV01',
    name: 'Hạt nhựa PVC nguyên sinh SG5',
    category: 'Nguyên vật liệu',
    subCategory: 'Hạt nhựa công nghiệp',
    brand: 'Formosa Plastics',
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
      { date: '16/10/2026', docCode: 'PN-2026-088', type: 'NHAP', typeName: 'Nhập khẩu hạt nhựa nguyên sinh', qtyChange: 10000, balance: 18500, partnerOrDept: 'Tập đoàn Formosa' },
    ],
  },
];

// Danh sách gợi ý mặc định (người dùng vừa có thể chọn, vừa có thể gõ tự do bất kỳ chữ gì)
const DEFAULT_SUBCATEGORY_OPTIONS = [
  'Sữa',
  'Tấm ốp Nano PVC',
  'Phào chỉ PU',
  'Nẹp trang trí',
  'Lam sóng PVC',
  'Tấm than tre cao cấp',
  'Hạt nhựa công nghiệp',
  'Keo dán & Phụ kiện',
  'Vật tư xây dựng',
  'Bánh kẹo & Nước ngọt',
];

const DEFAULT_BRAND_OPTIONS = [
  'Ba Vì Milk',
  'Tín Phát Premium',
  'Tín Phát Classic',
  'Tân Á',
  'Formosa Plastics',
  'Vinamilk',
  'TH True Milk',
  'Hòa Phát',
  'Vật Liệu Xanh',
];

const DEFAULT_UOM_OPTIONS = [
  'Hộp',
  'Tấm',
  'Cái',
  'Cây 2.4m',
  'Thanh 3m',
  'Kg',
  'Tấn',
  'Bao 25kg',
  'Lon',
  'Chai',
  'Lít',
  'Cuộn',
  'Kiện',
  'Bộ',
];

const DEFAULT_ATTR_TYPE_OPTIONS = [
  'HƯƠNG VỊ',
  'MÀU SẮC',
  'SIZE',
  'CHẤT LIỆU',
  'LOẠI',
  'DUNG TÍCH',
  'TRỌNG LƯỢNG',
  'ĐỘ DÀY',
  'QUY CÁCH',
  'XUẤT XỨ',
];

const DEFAULT_LOCATION_OPTIONS = [
  'Kệ A-01-T2',
  'Kệ A-02-T1',
  'Khu B - Kệ 02',
  'Khu A - Dãy 3',
  'Kho Tổng Gia Lâm - Tầng 1',
  'Kho Đông Anh - Kệ 02',
  'Xưởng sản xuất số 1',
];

// Khóa lưu trữ LocalStorage cho Danh mục Hàng hóa
export const STOCKFLOW_GOODS_STORAGE_KEY = 'stockflow_goods_catalog_v1';

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

  // Master-Detail Row Expansion (Ảnh 5)
  const [expandedRowId, setExpandedRowId] = useState<string | null>('G-00');
  const [expandedTab, setExpandedTab] = useState<'info' | 'desc' | 'stockCard' | 'stockByWh' | 'variants'>('info');

  // Modal Chi tiết & Thẻ kho (Pop-up cũ vẫn hỗ trợ)
  const [selectedItem, setSelectedItem] = useState<GoodsItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Modal 1: Thêm mới / Chỉnh sửa Hàng hóa (Chuẩn KiotViet - Ảnh 1)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalTab, setModalTab] = useState<'info' | 'desc' | 'branch'>('info');
  const [editingItem, setEditingItem] = useState<GoodsItem | null>(null);

  // Form Fields - Modal 1 (Hỗ trợ TỰ NHẬP tự do hoặc TỰ CHỌN từ danh sách)
  const [formCode, setFormCode] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Thành phẩm' | 'Nguyên vật liệu'>('Thành phẩm');
  const [formSubCategory, setFormSubCategory] = useState('Sữa');
  const [formBrand, setFormBrand] = useState('Ba Vì Milk');
  const [formUom, setFormUom] = useState('Hộp');
  const [formSpec, setFormSpec] = useState('');
  const [formWarehouse, setFormWarehouse] = useState('Kho Tổng Gia Lâm');
  const [formCostPrice, setFormCostPrice] = useState<number | string>(0);
  const [formStandardPrice, setFormStandardPrice] = useState<number | string>(0);
  const [formStockQuantity, setFormStockQuantity] = useState<number | string>(0);
  const [formMinSafe, setFormMinSafe] = useState<number | string>(0);
  const [formMaxSafe, setFormMaxSafe] = useState<number | string>(999999999);
  const [formHasRewardPoints, setFormHasRewardPoints] = useState(true);
  const [formIsDirectSale, setFormIsDirectSale] = useState(true);
  const [formLocation, setFormLocation] = useState('');
  const [formWeight, setFormWeight] = useState<number | string>(0);
  const [formWeightUnit, setFormWeightUnit] = useState<string>('g');
  const [formWidth, setFormWidth] = useState<number | string>('');
  const [formLength, setFormLength] = useState<number | string>('');
  const [formDimensionUnit, setFormDimensionUnit] = useState<string>('m');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formImages, setFormImages] = useState<string[]>([]);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleProcessImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF, BMP)!');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Dung lượng ảnh vượt quá 2 MB! Vui lòng chọn ảnh có kích thước nhỏ hơn.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setFormImageUrl(dataUrl);
        setFormImages((prev) => {
          if (prev.includes(dataUrl)) return prev;
          return [dataUrl, ...prev].slice(0, 4);
        });
        showToast(`Đã tải ảnh "${file.name}" từ máy tính thành công!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessImageFile(e.target.files[0]);
    }
    e.target.value = '';
  };
  const [formDescription, setFormDescription] = useState('');

  // Accordion Toggles Modal 1
  const [priceAccordionOpen, setPriceAccordionOpen] = useState(true);
  const [stockAccordionOpen, setStockAccordionOpen] = useState(true);
  const [specAccordionOpen, setSpecAccordionOpen] = useState(true);

  // Modal 2: Thiết lập đơn vị tính & thuộc tính (Chuẩn KiotViet - Ảnh 2, 3, 4)
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [formUnits, setFormUnits] = useState<GoodsUnitConversion[]>([
    { name: 'Hộp', conversionRate: 1, isBase: true, isDirectSale: true },
  ]);
  const [formAttributes, setFormAttributes] = useState<GoodsAttributeDef[]>([]);
  const [formVariants, setFormVariants] = useState<GoodsVariantItem[]>([]);

  // State tạm bên trong Modal 2
  const [tempUnits, setTempUnits] = useState<GoodsUnitConversion[]>([]);
  const [tempAttributes, setTempAttributes] = useState<GoodsAttributeDef[]>([]);
  const [tempVariants, setTempVariants] = useState<GoodsVariantItem[]>([]);
  const [showAddUnitInline, setShowAddUnitInline] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitRate, setNewUnitRate] = useState<number>(4);
  const [activeQuickTagAttrIndex, setActiveQuickTagAttrIndex] = useState<number | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingDb, setIsLoadingDb] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // ─── 1. Khôi phục hàng hóa đã lưu từ LocalStorage khi mount component ───
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STOCKFLOW_GOODS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGoods(parsed);
          return;
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc hàng hóa từ localStorage:', e);
    }
  }, []);

  // ─── 2. Tự động đồng bộ và nạp trực tiếp toàn bộ hàng hóa từ Database Backend ASP.NET Core ───
  useEffect(() => {
    let isMounted = true;
    const fetchApiProducts = async () => {
      setIsLoadingDb(true);
      try {
        const apiProducts = await productService.getProducts();
        if (!isMounted || !apiProducts || apiProducts.length === 0) return;

        const dbItems: GoodsItem[] = apiProducts.map((p: any) => {
          let parsedUnits = p.units;
          let parsedAttributes = p.attributes;
          let parsedVariants = p.variants;
          if (p.variantsJson) {
            try {
              const vObj = JSON.parse(p.variantsJson);
              if (vObj.units) {
                parsedUnits = vObj.units.map((u: any) => ({
                  name: u.Name || u.name,
                  conversionRate: u.ConversionRate ?? u.conversionRate ?? 1,
                  isBase: u.IsBase ?? u.isBase ?? false,
                  isDirectSale: u.IsDirectSale ?? u.isDirectSale ?? true,
                }));
              }
              if (vObj.attributes) {
                parsedAttributes = vObj.attributes.map((a: any) => ({
                  name: a.Name || a.name,
                  values: a.Values || a.values || [],
                }));
              }
              if (vObj.variants) {
                parsedVariants = vObj.variants.map((v: any, idx: number) => ({
                  id: v.Id || v.id || `V-${idx + 1}`,
                  attributeValue: v.AttributeValue || v.attributeValue,
                  unitName: v.UnitName || v.unitName,
                  conversionRate: v.ConversionRate ?? v.conversionRate ?? 1,
                  code: v.Code || v.code,
                  barcode: v.Barcode || v.barcode,
                  costPrice: Number(v.CostPrice ?? v.costPrice) || 0,
                  salePrice: Number(v.SalePrice ?? v.salePrice) || 0,
                  stock: Number(v.Stock ?? v.stock) || 0,
                }));
              }
            } catch {}
          }

          let parsedDims = p.dimensions;
          if (typeof p.dimensions === 'string') {
            try {
              parsedDims = JSON.parse(p.dimensions);
            } catch {
              parsedDims = undefined;
            }
          }

          return {
            id: String(p.id || p.productId),
            productId: p.productId || (Number(p.id) ? Number(p.id) : undefined),
            code: p.code || p.productCode,
            name: p.name || p.productName,
            category: (p.type === 'RAW_MATERIAL' || p.categoryName === 'Nguyên vật liệu') ? 'Nguyên vật liệu' : 'Thành phẩm',
            subCategory: p.categoryName || 'Hàng hóa thường',
            brand: p.brand || undefined,
            uom: p.uom || 'Cái',
            specification: p.description || 'Quy cách chuẩn',
            warehouse: 'Kho Tổng Gia Lâm',
            stockQuantity: Number(p.stockQuantity) || 0,
            reservedQuantity: 0,
            availableQuantity: Number(p.stockQuantity) || 0,
            minSafeStock: Number(p.minSafeStock ?? p.reorderPoint) || 0,
            maxSafeStock: Number(p.maxSafeStock) || 999999999,
            standardPrice: Number(p.standardPrice) || 0,
            costPrice: Number(p.costPrice) || 0,
            barcode: p.barcode || '',
            status: p.status === 'INACTIVE' ? 'DISCONTINUED' : 'ACTIVE',
            weight: Number(p.weight) || 0,
            dimensions: parsedDims,
            locationName: p.locationName || undefined,
            isDirectSale: p.isDirectSale ?? true,
            hasRewardPoints: p.hasRewardPoints ?? true,
            imageUrl: p.imageUrl || undefined,
            description: p.description || undefined,
            units: parsedUnits,
            attributes: parsedAttributes,
            variants: parsedVariants,
            stockByWarehouse: [
              { warehouseName: 'Kho Tổng Gia Lâm', actualStock: Number(p.stockQuantity) || 0, availableStock: Number(p.stockQuantity) || 0 }
            ],
            stockCardRecent: [],
          };
        });

        if (dbItems.length > 0) {
          setGoods(dbItems);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(dbItems));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Lỗi lấy hàng hóa từ database:', err);
      } finally {
        if (isMounted) setIsLoadingDb(false);
      }
    };

    fetchApiProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Quyền hạn RBAC
  const canViewCostPrice = role === 'ADMIN' || role === 'MANAGER';
  const canViewSellingPrice = role === 'ADMIN' || role === 'MANAGER' || role === 'SALES';
  const canManageMaster = role === 'ADMIN' || role === 'MANAGER';
  const canDelete = role === 'ADMIN';
  const canViewStockCard = role === 'ADMIN' || role === 'MANAGER' || role === 'WAREHOUSE';

  // Hàm sinh ma trận biến thể tự động theo (Thuộc tính × Đơn vị tính)
  const generateVariantMatrix = (
    units: GoodsUnitConversion[],
    attrs: GoodsAttributeDef[],
    currentVars: GoodsVariantItem[],
    cost: number,
    price: number,
    stock: number,
    parentCode: string
  ): GoodsVariantItem[] => {
    const effectiveUnits = units.length > 0 ? units : [{ name: formUom || 'Cái', conversionRate: 1, isBase: true, isDirectSale: true }];
    const firstAttr = attrs.length > 0 ? attrs[0] : null;
    const attrVals = firstAttr && firstAttr.values.length > 0 ? firstAttr.values : [];

    const result: GoodsVariantItem[] = [];

    if (attrVals.length === 0) {
      effectiveUnits.forEach((u, uIdx) => {
        const existing = currentVars.find((v) => v.unitName === u.name && !v.attributeValue);
        const code = existing?.code || (u.isBase ? parentCode || 'SP' : `${parentCode || 'SP'}-${u.name.toUpperCase()}`);
        const cPrice = existing ? existing.costPrice : Math.round(cost * u.conversionRate);
        const sPrice = existing ? existing.salePrice : Math.round(price * u.conversionRate);
        const sStock = existing ? existing.stock : (u.isBase ? stock : Math.floor(stock / u.conversionRate));

        result.push({
          id: existing?.id || `VAR-${uIdx}-${Date.now()}`,
          unitName: u.name,
          conversionRate: u.conversionRate,
          code,
          barcode: existing?.barcode || '',
          costPrice: cPrice,
          salePrice: sPrice,
          stock: sStock,
        });
      });
    } else {
      attrVals.forEach((val, aIdx) => {
        effectiveUnits.forEach((u, uIdx) => {
          const existing = currentVars.find((v) => v.attributeValue === val && v.unitName === u.name);
          const sanitizedVal = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '').toUpperCase();
          const code = existing?.code || `${parentCode || 'SP'}-${sanitizedVal}-${u.name.toUpperCase()}`;
          const cPrice = existing ? existing.costPrice : Math.round(cost * u.conversionRate);
          const sPrice = existing ? existing.salePrice : Math.round(price * u.conversionRate);
          const sStock = existing ? existing.stock : (u.isBase ? Math.floor(stock / attrVals.length) : Math.floor(stock / (attrVals.length * u.conversionRate)));

          result.push({
            id: existing?.id || `VAR-${aIdx}-${uIdx}-${Date.now()}`,
            attributeValue: val,
            unitName: u.name,
            conversionRate: u.conversionRate,
            code,
            barcode: existing?.barcode || '',
            costPrice: cPrice,
            salePrice: sPrice,
            stock: sStock,
          });
        });
      });
    }

    return result;
  };

  const handleOpenDetail = (item: GoodsItem) => {
    setSelectedItem(item);
    setDetailModalOpen(true);
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingItem(null);
    setModalTab('info');
    setFormCode(`SP${Math.floor(100000 + Math.random() * 900000)}`);
    setFormBarcode('');
    setFormName('');
    setFormCategory('Thành phẩm');
    setFormSubCategory('Sữa');
    setFormBrand('Ba Vì Milk');
    setFormUom('Hộp');
    setFormSpec('');
    setFormWarehouse('Kho Tổng Gia Lâm');
    setFormStandardPrice(0);
    setFormCostPrice(0);
    setFormStockQuantity(0);
    setFormMinSafe(0);
    setFormMaxSafe(999999999);
    setFormHasRewardPoints(true);
    setFormIsDirectSale(true);
    setFormLocation('');
    setFormWeight(0);
    setFormWeightUnit('g');
    setFormWidth('');
    setFormLength('');
    setFormDimensionUnit('m');
    setFormImageUrl('');
    setFormImages([]);
    setFormDescription('');
    setFormUnits([{ name: 'Hộp', conversionRate: 1, isBase: true, isDirectSale: true }]);
    setFormAttributes([]);
    setFormVariants([]);
    setEditModalOpen(true);
  };

  const handleOpenEdit = (item: GoodsItem) => {
    setModalMode('edit');
    setEditingItem(item);
    setModalTab('info');
    setFormCode(item.code);
    setFormBarcode(item.barcode || '');
    setFormName(item.name);
    setFormCategory(item.category);
    setFormSubCategory(item.subCategory);
    setFormBrand(item.brand || '');
    setFormUom(item.uom);
    setFormSpec(item.specification);
    setFormWarehouse(item.warehouse);
    setFormStandardPrice(item.standardPrice);
    setFormCostPrice(item.costPrice);
    setFormStockQuantity(item.stockQuantity);
    setFormMinSafe(item.minSafeStock);
    setFormMaxSafe(item.maxSafeStock);
    setFormHasRewardPoints(item.hasRewardPoints ?? true);
    setFormIsDirectSale(item.isDirectSale ?? true);
    setFormLocation(item.locationName || '');
    setFormWeight(item.weight || 0);
    setFormWidth(item.dimensions?.width ?? '');
    setFormLength(item.dimensions?.length ?? '');
    setFormDimensionUnit((item.dimensions?.unit as any) || 'm');
    setFormImageUrl(item.imageUrl || '');
    setFormImages(item.imageUrl ? [item.imageUrl] : []);
    setFormDescription(item.description || '');
    setFormUnits(item.units && item.units.length > 0 ? item.units : [{ name: item.uom, conversionRate: 1, isBase: true, isDirectSale: true }]);
    setFormAttributes(item.attributes || []);
    setFormVariants(item.variants || []);
    setEditModalOpen(true);
  };

  // Mở Modal 2 Thiết lập ĐVT & Thuộc tính (Ảnh 2, 3, 4)
  const handleOpenConfigModal = () => {
    const curUnits = formUnits.length > 0 ? [...formUnits] : [{ name: formUom || 'Hộp', conversionRate: 1, isBase: true, isDirectSale: true }];
    const curAttrs = [...formAttributes];
    setTempUnits(curUnits);
    setTempAttributes(curAttrs);

    const generated = generateVariantMatrix(
      curUnits,
      curAttrs,
      formVariants,
      Number(formCostPrice) || 0,
      Number(formStandardPrice) || 0,
      Number(formStockQuantity) || 0,
      formCode || 'SP'
    );
    setTempVariants(generated);
    setShowAddUnitInline(false);
    setActiveQuickTagAttrIndex(null);
    setConfigModalOpen(true);
  };

  // Lưu Modal 2 trở lại Modal 1
  const handleApplyConfigModal = () => {
    setFormUnits(tempUnits);
    setFormAttributes(tempAttributes);
    setFormVariants(tempVariants);
    const baseU = tempUnits.find((u) => u.isBase);
    if (baseU) {
      setFormUom(baseU.name);
    }
    setConfigModalOpen(false);
    showToast('Đã lưu cấu hình đơn vị tính & thuộc tính!');
  };

  // Thêm đơn vị quy đổi mới trong Modal 2
  const handleAddUnit = () => {
    if (!newUnitName.trim()) {
      alert('Vui lòng nhập tên đơn vị tính!');
      return;
    }
    const updatedUnits: GoodsUnitConversion[] = [
      ...tempUnits,
      { name: newUnitName.trim(), conversionRate: Number(newUnitRate) || 1, isBase: false, isDirectSale: true },
    ];
    setTempUnits(updatedUnits);
    setNewUnitName('');
    setNewUnitRate(4);
    setShowAddUnitInline(false);

    // Tự sinh lại biến thể
    const gen = generateVariantMatrix(
      updatedUnits,
      tempAttributes,
      tempVariants,
      Number(formCostPrice) || 0,
      Number(formStandardPrice) || 0,
      Number(formStockQuantity) || 0,
      formCode || 'SP'
    );
    setTempVariants(gen);
  };

  // Thêm thuộc tính mới trong Modal 2
  const handleAddAttribute = () => {
    const updatedAttrs: GoodsAttributeDef[] = [
      ...tempAttributes,
      { name: tempAttributes.length === 0 ? 'HƯƠNG VỊ' : 'MÀU SẮC', values: [] },
    ];
    setTempAttributes(updatedAttrs);
  };

  // Thêm tag giá trị thuộc tính (vd: Dâu, Vani)
  const handleAddTagToAttribute = (attrIndex: number, tagValue: string) => {
    const val = tagValue.trim();
    if (!val) return;
    const updated = tempAttributes.map((attr, idx) => {
      if (idx !== attrIndex) return attr;
      if (attr.values.includes(val)) return attr;
      return { ...attr, values: [...attr.values, val] };
    });
    setTempAttributes(updated);

    const gen = generateVariantMatrix(
      tempUnits,
      updated,
      tempVariants,
      Number(formCostPrice) || 0,
      Number(formStandardPrice) || 0,
      Number(formStockQuantity) || 0,
      formCode || 'SP'
    );
    setTempVariants(gen);
  };

  // Xóa tag giá trị thuộc tính
  const handleRemoveTag = (attrIndex: number, tagVal: string) => {
    const updated = tempAttributes.map((attr, idx) => {
      if (idx !== attrIndex) return attr;
      return { ...attr, values: attr.values.filter((v) => v !== tagVal) };
    });
    setTempAttributes(updated);

    const gen = generateVariantMatrix(
      tempUnits,
      updated,
      tempVariants,
      Number(formCostPrice) || 0,
      Number(formStandardPrice) || 0,
      Number(formStockQuantity) || 0,
      formCode || 'SP'
    );
    setTempVariants(gen);
  };

  // Xóa một hàng thuộc tính
  const handleRemoveAttribute = (attrIndex: number) => {
    const updated = tempAttributes.filter((_, idx) => idx !== attrIndex);
    setTempAttributes(updated);
    const gen = generateVariantMatrix(
      tempUnits,
      updated,
      tempVariants,
      Number(formCostPrice) || 0,
      Number(formStandardPrice) || 0,
      Number(formStockQuantity) || 0,
      formCode || 'SP'
    );
    setTempVariants(gen);
  };

  // Cập nhật ô trong bảng hàng cùng loại ma trận
  const handleUpdateVariantRow = (varId: string, field: keyof GoodsVariantItem, value: any) => {
    setTempVariants((prev) =>
      prev.map((v) => (v.id === varId ? { ...v, [field]: value } : v))
    );
  };

  // Xóa một biến thể khỏi bảng ma trận
  const handleDeleteVariantRow = (varId: string) => {
    setTempVariants((prev) => prev.filter((v) => v.id !== varId));
  };

  // Lưu hàng hóa (Lưu hoặc Lưu & Tạo thêm hàng)
  const handleSaveItem = async (e?: React.FormEvent, keepOpen = false) => {
    if (e) e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng nhập Tên hàng hóa!');
      return;
    }
    const finalCode = formCode.trim() || `SP${Math.floor(100000 + Math.random() * 900000)}`;

    const savedItem: GoodsItem = {
      id: editingItem ? editingItem.id : `G-${Date.now()}`,
      code: finalCode,
      name: formName.trim(),
      category: formCategory,
      subCategory: formSubCategory.trim() || 'Hàng hóa thường',
      brand: formBrand.trim() || undefined,
      uom: formUom.trim() || 'Hộp',
      specification: formSpec.trim() || (formWidth && formLength ? `${formWidth}x${formLength} ${formDimensionUnit}` : 'Quy cách chuẩn'),
      warehouse: formWarehouse,
      stockQuantity: Number(formStockQuantity) || 0,
      reservedQuantity: editingItem ? editingItem.reservedQuantity : 0,
      availableQuantity: Number(formStockQuantity) || 0,
      minSafeStock: Number(formMinSafe) || 0,
      maxSafeStock: Number(formMaxSafe) || 999999999,
      standardPrice: Number(formStandardPrice) || 0,
      costPrice: Number(formCostPrice) || 0,
      barcode: formBarcode.trim() || `893600${Math.floor(1000000 + Math.random() * 9000000)}`,
      status: 'ACTIVE',
      weight: Number(formWeight) || 0,
      dimensions: {
        width: Number(formWidth) || 0,
        length: Number(formLength) || 0,
        unit: formDimensionUnit,
      },
      locationName: formLocation.trim() || undefined,
      isDirectSale: formIsDirectSale,
      hasRewardPoints: formHasRewardPoints,
      imageUrl: formImageUrl.trim() || undefined,
      description: formDescription.trim() || undefined,
      units: formUnits,
      attributes: formAttributes,
      variants: formVariants,
      stockByWarehouse: editingItem
        ? editingItem.stockByWarehouse
        : [{ warehouseName: formWarehouse, actualStock: Number(formStockQuantity) || 0, availableStock: Number(formStockQuantity) || 0 }],
      stockCardRecent: editingItem
        ? editingItem.stockCardRecent
        : [
            {
              date: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
              docCode: `NK-${finalCode}`,
              type: 'NHAP',
              typeName: 'Khởi tạo tồn kho ban đầu',
              qtyChange: Number(formStockQuantity) || 0,
              balance: Number(formStockQuantity) || 0,
              partnerOrDept: formWarehouse,
            },
          ],
    };

    // Chuẩn bị payload chuẩn gửi đến backend ASP.NET Core & MediatR
    const apiPayload: any = {
      code: savedItem.code,
      name: savedItem.name,
      type: savedItem.category === 'Nguyên vật liệu' ? 'RAW_MATERIAL' : 'FINISHED',
      categoryName: savedItem.subCategory || savedItem.category,
      uom: savedItem.uom,
      standardPrice: savedItem.standardPrice,
      costPrice: savedItem.costPrice,
      minSafeStock: savedItem.minSafeStock,
      maxSafeStock: savedItem.maxSafeStock,
      barcode: savedItem.barcode,
      brand: savedItem.brand,
      weight: savedItem.weight,
      dimensions: savedItem.dimensions ? JSON.stringify(savedItem.dimensions) : undefined,
      locationName: savedItem.locationName,
      isDirectSale: savedItem.isDirectSale,
      hasRewardPoints: savedItem.hasRewardPoints,
      imageUrl: savedItem.imageUrl,
      description: savedItem.description,
      initialStock: savedItem.stockQuantity,
      units: savedItem.units?.map((u) => ({
        name: u.name,
        conversionRate: u.conversionRate,
        isBase: u.isBase,
        isDirectSale: u.isDirectSale ?? true,
      })),
      attributes: savedItem.attributes?.map((a) => ({
        name: a.name,
        values: a.values,
      })),
      variants: savedItem.variants?.map((v) => ({
        attributeValue: v.attributeValue,
        unitName: v.unitName,
        conversionRate: v.conversionRate,
        code: v.code,
        barcode: v.barcode,
        costPrice: v.costPrice,
        salePrice: v.salePrice,
        stock: v.stock,
      })),
    };

    setIsSaving(true);
    try {
      const numericId = editingItem?.productId || (editingItem && Number(editingItem.id) ? Number(editingItem.id) : undefined);
      if (editingItem && numericId) {
        const updateRes = await productService.updateProduct(numericId, apiPayload);
        if (updateRes) {
          savedItem.productId = (updateRes as any).productId || numericId;
        }
        showToast(`Đã lưu cập nhật vào CSDL thành công: ${savedItem.name}`);
      } else {
        const createRes = await productService.createProduct(apiPayload);
        if (createRes) {
          savedItem.id = String(createRes.id || (createRes as any).productId || savedItem.id);
          savedItem.productId = (createRes as any).productId || (Number(createRes.id) ? Number(createRes.id) : undefined);
        }
        showToast(`Đã lưu hàng hóa vào CSDL thành công (ID: ${savedItem.productId || savedItem.id})!`);
      }

      // Cập nhật React state và lưu cache LocalStorage
      let updatedList: GoodsItem[];
      if (editingItem) {
        updatedList = goods.map((g) => (g.id === editingItem.id ? savedItem : g));
      } else {
        updatedList = [savedItem, ...goods];
        setExpandedRowId(savedItem.id);
      }
      setGoods(updatedList);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(updatedList));
        } catch (err) {
          console.warn('Lỗi ghi localStorage:', err);
        }
      }

      if (keepOpen) {
        handleOpenCreate();
      } else {
        setEditModalOpen(false);
      }
    } catch (err: any) {
      console.error('Lỗi lưu CSDL:', err);
      alert(`Lỗi khi lưu vào cơ sở dữ liệu: ${err?.message || 'Không thể kết nối máy chủ backend'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (item: GoodsItem) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa mặt hàng "${item.name}" khỏi cơ sở dữ liệu?`)) {
      try {
        const numericId = item.productId || (Number(item.id) ? Number(item.id) : undefined);
        if (numericId) {
          await productService.deleteProduct(numericId);
          showToast(`Đã xóa hàng hóa ${item.code} khỏi cơ sở dữ liệu thành công!`);
        }
        const updated = goods.filter((g) => g.id !== item.id);
        setGoods(updated);
        if (expandedRowId === item.id) setExpandedRowId(null);
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(updated));
          } catch (err) {
            console.warn('Lỗi ghi localStorage khi xóa:', err);
          }
        }
      } catch (err: any) {
        console.error('Lỗi khi xóa khỏi CSDL:', err);
        alert(`Lỗi khi xóa khỏi cơ sở dữ liệu: ${err?.message || 'Thao tác xóa thất bại'}`);
      }
    }
  };

  const handleResetToDefault = () => {
    if (window.confirm('Bạn có muốn đặt lại danh mục hàng hóa về dữ liệu mẫu ban đầu? (Tất cả sản phẩm đã tự tạo trước đó sẽ được khôi phục về danh mục gốc)')) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STOCKFLOW_GOODS_STORAGE_KEY);
      }
      setGoods(INITIAL_GOODS_LIST);
      showToast('Đã khôi phục danh mục mẫu ban đầu thành công!');
    }
  };

  // Filtered List
  const filteredGoods = goods.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.subCategory.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase()));

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

  // Quick tag suggestions for attribute modal
  const getQuickTagOptions = (attrName: string) => {
    const norm = attrName.toUpperCase();
    if (norm.includes('HƯƠNG') || norm.includes('VỊ') || norm.includes('FLAVOR')) {
      return ['Dâu', 'Vani', 'Socola', 'Cam', 'Táo', 'Nho', 'Chuối', 'Trà Xanh'];
    }
    if (norm.includes('MÀU') || norm.includes('COLOR')) {
      return ['Đỏ', 'Xanh Dương', 'Xanh Lá', 'Vàng', 'Trắng', 'Đen', 'Xám', 'Gỗ Sồi'];
    }
    if (norm.includes('SIZE') || norm.includes('CỠ')) {
      return ['S', 'M', 'L', 'XL', 'XXL', 'Freesize'];
    }
    if (norm.includes('CHẤT') || norm.includes('LIỆU')) {
      return ['Nano PVC', 'PU Dát Vàng', 'Nhôm Anode', 'Than Tre', 'Inox 304'];
    }
    return ['Loại 1', 'Loại 2', 'Cao cấp', 'Tiêu chuẩn'];
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Màn hình */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Danh mục Hàng hóa &amp; Tồn kho
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              Master Data • KiotViet Style
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản trị mã sản phẩm, đơn vị tính quy đổi, thuộc tính hương vị/màu sắc và ma trận hàng hóa cùng loại
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefault}
            title="Khôi phục danh mục hàng hóa mẫu ban đầu"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
          >
            <RefreshCw size={14} className="text-slate-500" />
            <span>Khôi phục mẫu</span>
          </button>

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

      {/* 2. Thẻ KPI Thống Kê Tổng Quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
                TỔNG DANH MỤC MẶT HÀNG
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Package size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-blue-700 font-mono">
              {totalSku} SKU
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Toàn bộ danh mục</span>
            <span className="font-semibold text-slate-700">100% đang quản lý</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-700">
                TỒN KHẢ DỤNG (ATP)
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-emerald-700 font-mono">
              {totalAvailableQty.toLocaleString('vi-VN')} Đơn vị
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Hàng tự do để bán ngay</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
              Sẵn sàng giao
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-amber-700">
                HÀNG ĐANG GIỮ CHỖ
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Boxes size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-slate-800 font-mono">
              {totalReservedQty.toLocaleString('vi-VN')} Đơn vị
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Đơn hàng chờ xuất kho</span>
            <span className="font-semibold text-amber-600">Đang khóa an toàn</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-rose-700">
                CẢNH BÁO TỒN THẤP (MIN)
              </span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-600 font-mono">
              {lowStockCount} SKU
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Chạm ngưỡng an toàn</span>
            <span className="text-rose-600 font-semibold cursor-pointer" onClick={() => setCategoryFilter('LOW_STOCK')}>
              Xem cảnh báo &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* 3. Thanh Bộ Lọc & Tìm Kiếm */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Theo mã, tên hàng, mã vạch hoặc thương hiệu..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                categoryFilter === 'ALL' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Tất cả ({totalSku})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('Thành phẩm')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                categoryFilter === 'Thành phẩm' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Thành phẩm ({finishedCount})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('Nguyên vật liệu')}
              className={`px-3 py-1 rounded-md transition cursor-pointer ${
                categoryFilter === 'Nguyên vật liệu' ? 'bg-white text-blue-700 shadow-2xs font-bold' : 'hover:text-slate-900'
              }`}
            >
              Nguyên vật liệu ({rawCount})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('LOW_STOCK')}
              className={`px-3 py-1 rounded-md transition cursor-pointer flex items-center gap-1 ${
                categoryFilter === 'LOW_STOCK' ? 'bg-white text-rose-700 shadow-2xs font-bold' : 'text-rose-600 hover:text-rose-700'
              }`}
            >
              <AlertTriangle size={13} className="text-rose-600" />
              <span>Tồn thấp ({lowStockCount})</span>
            </button>
          </div>
        </div>

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

      {/* 4. Bảng Danh Sách Hàng Hóa Chuẩn KiotViet Master-Detail (Ảnh 5) */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-3 w-10 text-center">
                  <input type="checkbox" className="rounded border-slate-300 text-blue-600 cursor-pointer" />
                </th>
                <th className="py-3 px-2 w-8 text-center"></th>
                <th className="py-3 px-4 min-w-[200px]">MÃ HÀNG</th>
                <th className="py-3 px-4 min-w-[240px]">TÊN HÀNG</th>
                <th className="py-3 px-4 text-right min-w-[120px]">GIÁ BÁN</th>
                <th className="py-3 px-4 text-right min-w-[120px]">GIÁ VỐN</th>
                <th className="py-3 px-4 text-right min-w-[110px]">TỒN KHO</th>
                <th className="py-3 px-4 text-right min-w-[90px]">KHÁCH ĐẶT</th>
                <th className="py-3 px-4 min-w-[130px]">THỜI GIAN TẠO</th>
                <th className="py-3 px-4 text-center min-w-[110px]">DỰ KIẾN HẾT</th>
                <th className="py-3 px-4 text-center min-w-[90px]">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredGoods.map((item) => {
                const isExpanded = expandedRowId === item.id;
                const hasVariants = item.variants && item.variants.length > 0;
                const variantCount = hasVariants ? item.variants!.length : 0;

                return (
                  <React.Fragment key={item.id}>
                    {/* Dòng Hàng Hóa Chính */}
                    <tr
                      className={`hover:bg-blue-50/40 transition cursor-pointer select-none ${
                        isExpanded ? 'bg-blue-50/25 border-b border-blue-200/60' : ''
                      }`}
                      onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" className="rounded border-slate-300 text-blue-600 cursor-pointer" />
                      </td>

                      {/* Icon Ngôi sao / Bookmark */}
                      <td className="py-3 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <Star size={14} className="text-slate-300 hover:text-amber-400 transition cursor-pointer" />
                      </td>

                      {/* Mã Hàng */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {hasVariants && (
                            <span className="font-mono text-[11px] font-semibold text-slate-500">
                              ({variantCount})
                            </span>
                          )}
                          <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-200/60">
                            {item.code}
                          </span>
                        </div>
                      </td>

                      {/* Tên Hàng */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800 text-xs hover:text-blue-600 transition flex items-center gap-1.5">
                          <span>{item.name}</span>
                          {isExpanded ? (
                            <ChevronUp size={14} className="text-blue-500 shrink-0" />
                          ) : (
                            <ChevronDown size={14} className="text-slate-400 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                          {item.subCategory} • {item.uom} {item.brand ? `• ${item.brand}` : ''}
                        </div>
                      </td>

                      {/* Giá Bán */}
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                        {item.standardPrice > 0 ? `${item.standardPrice.toLocaleString('vi-VN')}` : '---'}
                      </td>

                      {/* Giá Vốn */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                        {canViewCostPrice ? (
                          item.costPrice > 0 ? (
                            `${item.costPrice.toLocaleString('vi-VN')}`
                          ) : (
                            '0'
                          )
                        ) : (
                          <span className="text-slate-300 italic">Bảo mật</span>
                        )}
                      </td>

                      {/* Tồn Kho */}
                      <td className="py-3 px-4 text-right">
                        <span className="font-mono font-extrabold text-xs text-slate-900">
                          {item.stockQuantity.toLocaleString('vi-VN')}
                        </span>
                      </td>

                      {/* Khách Đặt */}
                      <td className="py-3 px-4 text-right font-mono text-slate-500 text-xs">
                        {item.reservedQuantity}
                      </td>

                      {/* Thời Gian Tạo */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        23/09/2026 10:28
                      </td>

                      {/* Dự Kiến Hết Hàng */}
                      <td className="py-3 px-4 text-center text-slate-400 text-xs">
                        {item.stockQuantity === 0 ? '0 ngày' : item.stockQuantity < item.minSafeStock ? '3 ngày' : '---'}
                      </td>

                      {/* Thao Tác Nhanh */}
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Chỉnh sửa Master Data"
                            className="p-1 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              title="Xóa hàng hóa"
                              className="p-1 rounded-md hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* DÒNG EXPAND CHI TIẾT SẢN PHẨM & MA TRẬN BIẾN THỂ (ẢNH 5 KIOTVIET) */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60 border-b border-slate-200">
                        <td colSpan={11} className="p-0">
                          <div className="p-4 sm:p-6 bg-slate-100/50 border-t border-slate-200/80 space-y-4">
                            {/* Tab Bar Con */}
                            <div className="flex items-center gap-6 border-b border-slate-200 pb-2 text-xs font-semibold text-slate-600">
                              <button
                                type="button"
                                onClick={() => setExpandedTab('info')}
                                className={`pb-2 -mb-2 border-b-2 transition cursor-pointer ${
                                  expandedTab === 'info'
                                    ? 'border-blue-600 text-blue-600 font-bold'
                                    : 'border-transparent hover:text-slate-900'
                                }`}
                              >
                                Thông tin
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedTab('desc')}
                                className={`pb-2 -mb-2 border-b-2 transition cursor-pointer ${
                                  expandedTab === 'desc'
                                    ? 'border-blue-600 text-blue-600 font-bold'
                                    : 'border-transparent hover:text-slate-900'
                                }`}
                              >
                                Mô tả, ghi chú
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedTab('stockCard')}
                                className={`pb-2 -mb-2 border-b-2 transition cursor-pointer ${
                                  expandedTab === 'stockCard'
                                    ? 'border-blue-600 text-blue-600 font-bold'
                                    : 'border-transparent hover:text-slate-900'
                                }`}
                              >
                                Thẻ kho
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedTab('stockByWh')}
                                className={`pb-2 -mb-2 border-b-2 transition cursor-pointer ${
                                  expandedTab === 'stockByWh'
                                    ? 'border-blue-600 text-blue-600 font-bold'
                                    : 'border-transparent hover:text-slate-900'
                                }`}
                              >
                                Tồn kho
                              </button>
                              <button
                                type="button"
                                onClick={() => setExpandedTab('variants')}
                                className={`pb-2 -mb-2 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                                  expandedTab === 'variants'
                                    ? 'border-blue-600 text-blue-600 font-bold'
                                    : 'border-transparent hover:text-slate-900'
                                }`}
                              >
                                <span>Hàng hóa cùng loại</span>
                                {hasVariants && (
                                  <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                                    {variantCount}
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => showToast('Tính năng liên kết sàn TMĐT đang được hoàn thiện.')}
                                className="border-transparent hover:text-slate-900 transition cursor-pointer pb-2 -mb-2"
                              >
                                Liên kết kênh bán
                              </button>
                            </div>

                            {/* Tab 1: THÔNG TIN CHI TIẾT (Chuẩn Ảnh 5) */}
                            {expandedTab === 'info' && (
                              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 space-y-5">
                                <div className="flex flex-col md:flex-row items-start gap-6">
                                  {/* Ảnh Hàng Hóa Lớn */}
                                  <div className="w-32 h-32 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400 shrink-0 overflow-hidden relative shadow-2xs">
                                    {item.imageUrl ? (
                                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                    ) : (
                                      <>
                                        <div className="w-14 h-14 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center mb-1">
                                          <ImageIcon size={28} />
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">Ảnh sản phẩm</span>
                                      </>
                                    )}
                                  </div>

                                  {/* Tiêu đề & Badges */}
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                                        {item.name}
                                      </h2>
                                      {item.attributes &&
                                        item.attributes.flatMap((a) => a.values).map((val, vIdx) => (
                                          <span
                                            key={vIdx}
                                            className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium"
                                          >
                                            {val}
                                          </span>
                                        ))}
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium">
                                        {item.uom}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                                      <span>Nhóm hàng: <strong className="text-slate-800">{item.subCategory}</strong></span>
                                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200 text-[10px]">
                                        Hàng hóa thường
                                      </span>
                                      {item.isDirectSale !== false && (
                                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 text-[10px]">
                                          Bán trực tiếp
                                        </span>
                                      )}
                                      {item.hasRewardPoints !== false && (
                                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200 text-[10px]">
                                          Tích điểm
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => showToast('Mở biểu đồ phân tích tiêu thụ SKU...')}
                                        className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 text-[11px] cursor-pointer"
                                      >
                                        <TrendingUp size={12} />
                                        <span>Xem phân tích</span>
                                      </button>
                                    </div>

                                    {/* Lưới 4 Cột Thông Số Kỹ Thuật (Ảnh 5) */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-3 gap-x-6 pt-3 border-t border-slate-100 text-xs">
                                      <div>
                                        <div className="text-[11px] text-slate-400">Mã hàng</div>
                                        <div className="font-mono font-bold text-slate-800 mt-0.5">{item.code}</div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-400">Mã vạch</div>
                                        <div className="font-mono text-slate-700 mt-0.5">{item.barcode || 'Chưa có'}</div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-400">Tồn kho</div>
                                        <div className="font-mono font-extrabold text-slate-900 mt-0.5">{item.stockQuantity}</div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-400">Định mức tồn</div>
                                        <div className="font-mono text-slate-700 mt-0.5">{item.minSafeStock} - {item.maxSafeStock.toLocaleString('vi-VN')}</div>
                                      </div>

                                      <div>
                                        <div className="text-[11px] text-slate-400">Giá vốn</div>
                                        <div className="font-mono font-semibold text-slate-800 mt-0.5">
                                          {canViewCostPrice ? `${item.costPrice.toLocaleString('vi-VN')} đ` : '***'}
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-400">Giá bán</div>
                                        <div className="font-mono font-bold text-blue-700 mt-0.5">{item.standardPrice.toLocaleString('vi-VN')} đ</div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-400">Thương hiệu</div>
                                        <div className="text-slate-700 font-medium mt-0.5">{item.brand || 'Chưa có'}</div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-400">Vị trí kho</div>
                                        <div className="text-slate-700 font-medium mt-0.5">{item.locationName || 'Chưa có'}</div>
                                      </div>

                                      <div>
                                        <div className="text-[11px] text-slate-400">Trọng lượng</div>
                                        <div className="text-slate-700 mt-0.5">{item.weight ? `${item.weight} g` : 'Chưa có'}</div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-400">Kích thước</div>
                                        <div className="text-slate-700 mt-0.5">
                                          {item.dimensions?.width && item.dimensions?.length
                                            ? `${item.dimensions.width} × ${item.dimensions.length} ${item.dimensions.unit}`
                                            : 'Chưa có'}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Thanh Thao Tác Chi Tiết (Ảnh 5) */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                                  <div className="flex items-center gap-2">
                                    {canDelete && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItem(item)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold transition cursor-pointer"
                                      >
                                        <Trash2 size={13} />
                                        <span>Xóa</span>
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(item.code);
                                        showToast(`Đã sao chép mã hàng: ${item.code}`);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                                    >
                                      <Copy size={13} />
                                      <span>Sao chép</span>
                                    </button>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(item)}
                                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
                                    >
                                      <Edit2 size={13} />
                                      <span>Chỉnh sửa</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => showToast(`Đang gửi lệnh in tem mã barcode cho ${item.code}...`)}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer"
                                    >
                                      <Printer size={13} />
                                      <span>In tem mã</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        handleOpenEdit(item);
                                        handleOpenConfigModal();
                                      }}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-semibold transition cursor-pointer"
                                    >
                                      <Plus size={13} />
                                      <span>Thêm hàng hóa cùng loại</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Tab 2: MÔ TẢ, GHI CHÚ */}
                            {expandedTab === 'desc' && (
                              <div className="bg-white rounded-xl border border-slate-200 p-5 text-xs text-slate-700 space-y-2">
                                <h4 className="font-bold text-slate-900">Mô tả đặc tính &amp; quy chuẩn hàng hóa:</h4>
                                <p className="leading-relaxed text-slate-600">
                                  {item.description || item.specification || 'Chưa cập nhật thông tin mô tả chi tiết cho mặt hàng này.'}
                                </p>
                              </div>
                            )}

                            {/* Tab 3: THẺ KHO GẦN NHẤT */}
                            {expandedTab === 'stockCard' && (
                              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                                      <th className="py-2.5 px-3">Thời gian</th>
                                      <th className="py-2.5 px-3">Chứng từ</th>
                                      <th className="py-2.5 px-3">Loại giao dịch</th>
                                      <th className="py-2.5 px-3 text-right">Biến động</th>
                                      <th className="py-2.5 px-3 text-right">Tồn sau</th>
                                      <th className="py-2.5 px-3">Đối tác / Phân xưởng</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {item.stockCardRecent.map((sc, scIdx) => (
                                      <tr key={scIdx} className="hover:bg-slate-50">
                                        <td className="py-2 px-3 text-slate-500">{sc.date}</td>
                                        <td className="py-2 px-3 font-mono font-bold text-blue-700">{sc.docCode}</td>
                                        <td className="py-2 px-3 text-slate-700">{sc.typeName}</td>
                                        <td className={`py-2 px-3 text-right font-mono font-bold ${sc.qtyChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {sc.qtyChange > 0 ? `+${sc.qtyChange}` : sc.qtyChange}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{sc.balance}</td>
                                        <td className="py-2 px-3 text-slate-600">{sc.partnerOrDept}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Tab 4: TỒN KHO PHÂN BỔ */}
                            {expandedTab === 'stockByWh' && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {item.stockByWarehouse.map((w, wIdx) => (
                                  <div key={wIdx} className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <Warehouse size={18} />
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-slate-800">{w.warehouseName}</div>
                                        <div className="text-[11px] text-slate-400">Khả dụng ATP: {w.availableStock} {item.uom}</div>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="font-mono font-extrabold text-base text-slate-900">{w.actualStock}</div>
                                      <div className="text-[10px] text-slate-400 font-medium">{item.uom}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Tab 5: HÀNG HÓA CÙNG LOẠI (DANH SÁCH BIẾN THỂ TƯƠNG ỨNG ẢNH 5) */}
                            {expandedTab === 'variants' && (
                              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs space-y-3 p-4">
                                <div className="flex items-center justify-between">
                                  <div className="text-xs font-bold text-slate-800">
                                    Biến thể hàng cùng loại ({variantCount} mặt hàng)
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleOpenEdit(item);
                                      handleOpenConfigModal();
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-semibold text-white transition cursor-pointer"
                                  >
                                    <Plus size={13} />
                                    <span>Thêm hàng hóa cùng loại</span>
                                  </button>
                                </div>

                                {hasVariants ? (
                                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                                          <th className="py-2.5 px-3">Mã hàng</th>
                                          <th className="py-2.5 px-3">Tên biến thể</th>
                                          <th className="py-2.5 px-3">Đơn vị quy đổi</th>
                                          <th className="py-2.5 px-3 text-right">Giá bán</th>
                                          <th className="py-2.5 px-3 text-right">Giá vốn</th>
                                          <th className="py-2.5 px-3 text-right">Tồn kho</th>
                                          <th className="py-2.5 px-3 text-center">Thao tác</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {item.variants!.map((v, vIdx) => (
                                          <tr key={v.id || vIdx} className="hover:bg-slate-50">
                                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{v.code}</td>
                                            <td className="py-2.5 px-3 font-medium text-slate-800">
                                              {item.name} - {v.attributeValue ? `${v.attributeValue} - ` : ''}{v.unitName}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500">
                                              1 {v.unitName} = {v.conversionRate} {item.uom}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                              {v.salePrice.toLocaleString('vi-VN')} đ
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                                              {canViewCostPrice ? `${v.costPrice.toLocaleString('vi-VN')} đ` : '***'}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                              {v.stock}
                                            </td>
                                            <td className="py-2.5 px-3 text-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  navigator.clipboard.writeText(v.code);
                                                  showToast(`Đã sao chép mã SKU: ${v.code}`);
                                                }}
                                                className="p-1 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                                                title="Sao chép SKU"
                                              >
                                                <Copy size={13} />
                                              </button>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className="text-center py-6 text-slate-400 text-xs">
                                    Chưa thiết lập biến thể cho sản phẩm này. Bấm nút phía trên để cấu hình Đơn vị tính &amp; Thuộc tính.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL 1: TẠO HÀNG HÓA MỚI / CHỈNH SỬA (CHÍNH XÁC THEO ẢNH 1) */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl relative max-h-[92vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {modalMode === 'edit' ? 'Chỉnh sửa hàng hóa' : 'Tạo hàng hóa'}
              </h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tab Bar (Ảnh 1) */}
            <div className="flex items-center gap-6 px-6 border-b border-slate-200 text-xs font-semibold text-slate-600">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`py-3 border-b-2 transition cursor-pointer ${
                  modalTab === 'info'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Thông tin
              </button>
              <button
                type="button"
                onClick={() => setModalTab('desc')}
                className={`py-3 border-b-2 transition cursor-pointer ${
                  modalTab === 'desc'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Mô tả
              </button>
              <button
                type="button"
                onClick={() => setModalTab('branch')}
                className={`py-3 border-b-2 transition cursor-pointer ${
                  modalTab === 'branch'
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                Chi nhánh kinh doanh
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {modalTab === 'info' && (
                <>
                  {/* Phần Thông Tin Cơ Bản & Khung Upload Ảnh (Ảnh 1) */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Cột Trái: Các trường thông tin (8 cols) */}
                    <div className="md:col-span-8 space-y-3.5">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Mã hàng</label>
                          <input
                            type="text"
                            value={formCode}
                            onChange={(e) => setFormCode(e.target.value)}
                            placeholder="Tự động"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Mã vạch</label>
                          <input
                            type="text"
                            value={formBarcode}
                            onChange={(e) => setFormBarcode(e.target.value)}
                            placeholder="Nhập mã vạch"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Tên hàng <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formName}
                          onChange={(e) => setFormName(e.target.value)}
                          placeholder="Bắt buộc"
                          required
                          className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-medium"
                        />
                      </div>

                      {/* Nhóm hàng & Thương hiệu hỗ trợ TỰ NHẬP tự do hoặc TỰ CHỌN */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700">
                              Nhóm hàng <span className="text-slate-400 font-normal">(Tự nhập / chọn)</span>
                            </label>
                            <span className="text-[10px] text-blue-600 font-medium">Gõ tự do</span>
                          </div>
                          <CustomCombobox
                            value={formSubCategory}
                            onChange={setFormSubCategory}
                            options={DEFAULT_SUBCATEGORY_OPTIONS}
                            placeholder="Nhập hoặc chọn nhóm hàng..."
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700">
                              Thương hiệu <span className="text-slate-400 font-normal">(Tự nhập / chọn)</span>
                            </label>
                            <span className="text-[10px] text-blue-600 font-medium">Gõ tự do</span>
                          </div>
                          <CustomCombobox
                            value={formBrand}
                            onChange={setFormBrand}
                            options={DEFAULT_BRAND_OPTIONS}
                            placeholder="Nhập hoặc chọn thương hiệu..."
                          />
                        </div>
                      </div>

                      {/* Đơn vị tính cơ bản */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700">
                              Đơn vị tính cơ bản <span className="text-slate-400 font-normal">(Tự nhập / chọn)</span>
                            </label>
                            <span className="text-[10px] text-blue-600 font-medium">ĐVT</span>
                          </div>
                          <CustomCombobox
                            value={formUom}
                            onChange={(val) => {
                              setFormUom(val);
                              // Đồng bộ tên đơn vị cơ bản trong units
                              setFormUnits((prev) =>
                                prev.map((u) => (u.isBase ? { ...u, name: val } : u))
                              );
                            }}
                            options={DEFAULT_UOM_OPTIONS}
                            placeholder="Nhập hoặc chọn ĐVT (VD: Hộp, Tấm, Kg...)"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Phân loại hàng</label>
                          <select
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value as any)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer font-medium bg-white"
                          >
                            <option value="Thành phẩm">Thành phẩm xuất bán</option>
                            <option value="Nguyên vật liệu">Nguyên vật liệu xưởng</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Cột Phải: Khung Upload Ảnh từ Máy Tính (Chuẩn Ảnh 1 KiotViet) */}
                    <div className="md:col-span-4 flex items-start gap-2.5">
                      {/* Input file ẩn trực tiếp mở cửa sổ chọn tệp từ máy tính */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
                        className="hidden"
                      />

                      {/* Khung tải ảnh chính (Hỗ trợ click hoặc kéo thả trực tiếp từ máy) */}
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingImage(true);
                        }}
                        onDragLeave={() => setIsDraggingImage(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingImage(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleProcessImageFile(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => {
                          if (!formImageUrl) {
                            fileInputRef.current?.click();
                          }
                        }}
                        className={`flex-1 h-44 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-3 text-center transition cursor-pointer relative group ${
                          isDraggingImage
                            ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
                            : formImageUrl
                            ? 'border-slate-200 bg-white'
                            : 'border-slate-300 bg-slate-50/60 hover:bg-slate-50 hover:border-blue-400'
                        }`}
                      >
                        {formImageUrl ? (
                          <div className="w-full h-full relative group flex items-center justify-center">
                            <img
                              src={formImageUrl}
                              alt="Product preview"
                              className="max-w-full max-h-full object-contain rounded-lg"
                            />
                            {/* Hover overlay thao tác */}
                            <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition rounded-lg flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  fileInputRef.current?.click();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-white text-slate-800 hover:bg-slate-100 text-[11px] font-bold flex items-center gap-1 shadow-md cursor-pointer"
                                title="Đổi ảnh khác từ máy tính"
                              >
                                <Camera size={13} className="text-blue-600" />
                                <span>Đổi ảnh</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setFormImageUrl('');
                                  setFormImages((prev) => prev.filter((img) => img !== formImageUrl));
                                }}
                                className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 text-xs shadow-md cursor-pointer"
                                title="Xóa ảnh"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition shadow-2xs">
                              <Camera size={20} />
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                fileInputRef.current?.click();
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs cursor-pointer mb-1"
                            >
                              <span>Thêm ảnh</span>
                            </button>
                            <span className="text-[10px] text-slate-500 font-medium">Bấm để chọn tệp từ máy tính</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">Mỗi ảnh không quá 2 MB</span>
                          </>
                        )}
                      </div>

                      {/* 3 Thumbnails Nhỏ bên cạnh (Ảnh 1 KiotViet) */}
                      <div className="flex flex-col gap-1.5">
                        {[0, 1, 2].map((slotIdx) => {
                          const slotImg = formImages[slotIdx + 1];
                          return (
                            <div
                              key={slotIdx}
                              onClick={() => {
                                if (slotImg) {
                                  setFormImageUrl(slotImg);
                                } else {
                                  fileInputRef.current?.click();
                                }
                              }}
                              className="w-12 h-12 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-300 transition cursor-pointer overflow-hidden relative group shadow-2xs"
                              title={slotImg ? 'Xem ảnh này' : 'Tải thêm ảnh từ máy'}
                            >
                              {slotImg ? (
                                <img src={slotImg} alt="Thumbnail" className="w-full h-full object-cover" />
                              ) : (
                                <ImageIcon size={15} className="group-hover:text-blue-500 transition" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Accordion 1: Giá vốn, giá bán (Ảnh 1) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setPriceAccordionOpen(!priceAccordionOpen)}
                      className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer select-none"
                    >
                      <span>Giá vốn, giá bán</span>
                      {priceAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {priceAccordionOpen && (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border-t border-slate-100">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Giá vốn (VNĐ)</label>
                          <input
                            type="number"
                            value={formCostPrice}
                            onChange={(e) => setFormCostPrice(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700">Giá bán (VNĐ)</label>
                            <button
                              type="button"
                              onClick={() => showToast('Mở bảng thiết lập giá đại lý / bán buôn')}
                              className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-medium text-[11px] cursor-pointer"
                            >
                              <RefreshCw size={11} />
                              <span>Thiết lập giá</span>
                            </button>
                          </div>
                          <input
                            type="number"
                            value={formStandardPrice}
                            onChange={(e) => setFormStandardPrice(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono font-bold text-blue-700 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Tồn kho (Ảnh 1) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setStockAccordionOpen(!stockAccordionOpen)}
                      className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer select-none"
                    >
                      <div className="text-left">
                        <div>Tồn kho</div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          Quản lý số lượng tồn kho và định mức tồn. Khi tồn kho chạm đến định mức, bạn sẽ nhận được cảnh báo từ hệ thống.
                        </div>
                      </div>
                      {stockAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {stockAccordionOpen && (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border-t border-slate-100">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Tồn kho ban đầu</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={formStockQuantity}
                              onChange={(e) => setFormStockQuantity(e.target.value)}
                              className="w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                            />
                            <Warehouse size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Định mức tồn thấp nhất</label>
                          <input
                            type="number"
                            value={formMinSafe}
                            onChange={(e) => setFormMinSafe(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Định mức tồn cao nhất</label>
                          <input
                            type="number"
                            value={formMaxSafe}
                            onChange={(e) => setFormMaxSafe(e.target.value)}
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Switch Toggle: Tích điểm (Ảnh 1) */}
                  <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">Tích điểm</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Cho phép áp dụng điểm thưởng cho khách hàng khi mua sản phẩm này
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormHasRewardPoints(!formHasRewardPoints)}
                      className={`w-11 h-6 rounded-full transition cursor-pointer relative p-0.5 ${
                        formHasRewardPoints ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-xs transition transform ${
                          formHasRewardPoints ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Accordion 3: Vị trí, trọng lượng, kích thước (Ảnh 1 - Hỗ trợ TỰ NHẬP tự do) */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setSpecAccordionOpen(!specAccordionOpen)}
                      className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer select-none"
                    >
                      <div className="text-left">
                        <div>Vị trí, trọng lượng, kích thước</div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          Quản lý việc sắp xếp kho, vị trí bán hàng hoặc quy cách giao hàng
                        </div>
                      </div>
                      {specAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {specAccordionOpen && (
                      <div className="p-4 space-y-3 bg-white border-t border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="font-semibold text-slate-700">Vị trí kho</label>
                              <span className="text-[10px] text-blue-600 font-medium">Tự nhập / chọn</span>
                            </div>
                            <CustomCombobox
                              value={formLocation}
                              onChange={setFormLocation}
                              options={DEFAULT_LOCATION_OPTIONS}
                              placeholder="Nhập hoặc chọn vị trí (VD: Kệ A-01-T2)..."
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Trọng lượng</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={formWeight}
                                onChange={(e) => setFormWeight(e.target.value)}
                                className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                              />
                              <div className="w-24 shrink-0">
                                <CustomCombobox
                                  value={formWeightUnit}
                                  onChange={setFormWeightUnit}
                                  options={['g', 'kg', 'mg', 'tấn']}
                                  placeholder="Đơn vị"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Kích thước</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={formWidth}
                              onChange={(e) => setFormWidth(e.target.value)}
                              placeholder="Rộng"
                              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-slate-400 font-bold">×</span>
                            <input
                              type="number"
                              value={formLength}
                              onChange={(e) => setFormLength(e.target.value)}
                              placeholder="Dài"
                              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-mono focus:outline-none focus:border-blue-500"
                            />
                            <div className="w-24 shrink-0">
                              <CustomCombobox
                                value={formDimensionUnit}
                                onChange={setFormDimensionUnit}
                                options={['m', 'cm', 'mm', 'inch']}
                                placeholder="Đơn vị"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section Quản lý theo đơn vị tính và thuộc tính (Ảnh 1) */}
                  <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 text-xs">
                        Quản lý theo đơn vị tính và thuộc tính
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Tạo nhiều hàng hóa khác đơn vị tính (chai, lốc, thùng) hoặc đặc điểm (hương vị, dung tích, màu sắc). Mỗi hàng hóa có 1 mã hàng riêng.
                      </div>
                      {formVariants.length > 0 && (
                        <div className="pt-1 flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                            {formUnits.length} Đơn vị tính
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            {formAttributes.length} Thuộc tính
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                            {formVariants.length} Biến thể cùng loại
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleOpenConfigModal}
                      className="shrink-0 px-4 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 font-bold text-xs transition cursor-pointer shadow-2xs"
                    >
                      Thiết lập
                    </button>
                  </div>
                </>
              )}

              {modalTab === 'desc' && (
                <div className="space-y-3">
                  <label className="block font-semibold text-slate-700">Mô tả chi tiết sản phẩm / hướng dẫn sử dụng</label>
                  <textarea
                    rows={6}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Nhập thông tin xuất xứ, thành phần, công dụng, hạn sử dụng..."
                    className="w-full p-3 rounded-lg border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {modalTab === 'branch' && (
                <div className="space-y-3">
                  <div className="font-bold text-slate-800">Chi nhánh / Kho hàng được phép phân phối:</div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" />
                      <div>
                        <div className="font-bold text-slate-800">Kho Tổng Gia Lâm</div>
                        <div className="text-[11px] text-slate-400">Kho trung tâm chính • Hà Nội</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50/50 cursor-pointer">
                      <input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" />
                      <div>
                        <div className="font-bold text-slate-800">Kho Đông Anh</div>
                        <div className="text-[11px] text-slate-400">Kho vật tư phụ &amp; phào nẹp</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Ảnh 1) */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formIsDirectSale}
                  onChange={(e) => setFormIsDirectSale(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-800 text-xs">Bán trực tiếp</span>
                <Info size={14} className="text-slate-400" />
              </label>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Bỏ qua
                </button>

                {modalMode === 'create' && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSaveItem(undefined, true)}
                    className="px-4 py-2 rounded-lg border border-blue-300 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 transition cursor-pointer shadow-2xs disabled:opacity-50"
                  >
                    {isSaving ? 'Đang lưu CSDL...' : 'Lưu & Tạo thêm hàng'}
                  </button>
                )}

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSaveItem(undefined, false)}
                  className="px-6 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-bold text-white transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw size={12} className="animate-spin" />}
                  <span>{isSaving ? 'Đang lưu CSDL...' : 'Lưu'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL 2: THIẾT LẬP ĐƠN VỊ TÍNH VÀ THUỘC TÍNH (CHÍNH XÁC THEO ẢNH 2, 3, 4 - HỖ TRỢ TỰ NHẬP TỰ DO) */}
      {configModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl relative max-h-[92vh] flex flex-col my-auto">
            {/* Header Modal 2 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                Thiết lập đơn vị tính và thuộc tính
              </h3>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body Scrollable Modal 2 */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
              {/* Phần 1: ĐƠN VỊ TÍNH (Ảnh 2) */}
              <div className="space-y-2.5">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Đơn vị tính</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Thêm đơn vị bán hoặc nhập như chai, lốc, thùng. Đặt công thức quy đổi để tính nhanh giá và tồn kho. Ví dụ: 1 lốc = 4 chai, 1 thùng = 20 lốc.
                  </div>
                </div>

                {/* Danh sách thẻ Đơn vị tính Pills (Ảnh 2) */}
                <div className="flex items-center gap-2.5 flex-wrap pt-1">
                  {tempUnits.map((u, uIdx) => (
                    <div
                      key={uIdx}
                      className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 font-medium ${
                        u.isBase
                          ? 'bg-blue-50 border-blue-200 text-blue-800'
                          : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                      }`}
                    >
                      <span className="font-bold">
                        {u.name} {u.isBase ? '(Đơn vị cơ bản)' : `(${u.conversionRate} ${tempUnits.find((x) => x.isBase)?.name || 'Cơ bản'})`}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const rate = prompt(`Nhập tỷ lệ quy đổi cho "${u.name}":`, u.conversionRate.toString());
                          if (rate && Number(rate) > 0) {
                            const updated = tempUnits.map((x, i) => (i === uIdx ? { ...x, conversionRate: Number(rate) } : x));
                            setTempUnits(updated);
                            const gen = generateVariantMatrix(
                              updated,
                              tempAttributes,
                              tempVariants,
                              Number(formCostPrice) || 0,
                              Number(formStandardPrice) || 0,
                              Number(formStockQuantity) || 0,
                              formCode || 'SP'
                            );
                            setTempVariants(gen);
                          }
                        }}
                        className="text-slate-400 hover:text-blue-600 transition cursor-pointer"
                        title="Chỉnh sửa quy đổi"
                      >
                        <Edit2 size={12} />
                      </button>
                      <span className="text-[10px] text-slate-400">• Bán trực tiếp</span>
                      {!u.isBase && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = tempUnits.filter((_, i) => i !== uIdx);
                            setTempUnits(updated);
                            const gen = generateVariantMatrix(
                              updated,
                              tempAttributes,
                              tempVariants,
                              Number(formCostPrice) || 0,
                              Number(formStandardPrice) || 0,
                              Number(formStockQuantity) || 0,
                              formCode || 'SP'
                            );
                            setTempVariants(gen);
                          }}
                          className="text-slate-300 hover:text-rose-500 transition cursor-pointer ml-1"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setShowAddUnitInline(true)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 font-bold text-xs transition cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Thêm đơn vị</span>
                  </button>
                </div>

                {/* Inline Form Thêm Đơn Vị Mới (Hỗ trợ TỰ NHẬP tên đơn vị tự do) */}
                {showAddUnitInline && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-3 animate-in fade-in flex-wrap">
                    <div className="w-48">
                      <CustomCombobox
                        value={newUnitName}
                        onChange={setNewUnitName}
                        options={['Lốc', 'Thùng', 'Kiện', 'Bao', 'Pallet', 'Bịch', 'Lon', 'Lô', 'Cuộn']}
                        placeholder="Tự nhập ĐVT (Lốc, Thùng...)"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-slate-600 text-xs">
                      <span>1 {newUnitName || 'Đơn vị'} =</span>
                      <input
                        type="number"
                        min={1}
                        value={newUnitRate}
                        onChange={(e) => setNewUnitRate(Number(e.target.value))}
                        className="w-16 h-9 px-2 rounded-lg border border-slate-200 bg-white font-mono text-center text-xs"
                      />
                      <span className="font-semibold text-slate-800">{tempUnits.find((u) => u.isBase)?.name || 'Cơ bản'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddUnit}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                    >
                      Lưu đơn vị
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddUnitInline(false)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-white text-xs transition cursor-pointer"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>

              {/* Phần 2: THUỘC TÍNH (Ảnh 2, 3, 4 - HỖ TRỢ TỰ NHẬP TÊN THUỘC TÍNH BẤT KỲ) */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div>
                  <div className="font-bold text-slate-900 text-xs">Thuộc tính</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Thêm đặc điểm như hương vị, dung tích, màu sắc. Tên thuộc tính có thể tự nhập bất kỳ (VD: Dung tích, Độ bóng,...) hoặc chọn gợi ý.
                  </div>
                </div>

                {/* Các dòng thuộc tính (Ảnh 3, 4) */}
                <div className="space-y-3">
                  {tempAttributes.map((attr, aIdx) => (
                    <div key={aIdx} className="space-y-2">
                      <div className="flex items-center gap-2.5">
                        {/* Combobox Loại thuộc tính: TỰ NHẬP tự do hoặc chọn gợi ý */}
                        <div className="w-52 shrink-0">
                          <CustomCombobox
                            value={attr.name}
                            onChange={(val) => {
                              const updated = tempAttributes.map((x, i) => (i === aIdx ? { ...x, name: val } : x));
                              setTempAttributes(updated);
                            }}
                            options={DEFAULT_ATTR_TYPE_OPTIONS}
                            placeholder="Tự nhập thuộc tính..."
                          />
                        </div>

                        {/* Ô Nhập Giá Trị Thuộc Tính Tags (Ảnh 4: Dâu x, Vani x) */}
                        <div className="flex-1 min-h-[36px] p-1.5 rounded-lg border border-slate-200 bg-white flex items-center gap-1.5 flex-wrap focus-within:border-blue-500">
                          {attr.values.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold text-xs border border-slate-200"
                            >
                              <span>{tag}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTag(aIdx, tag)}
                                className="text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}

                          <input
                            type="text"
                            placeholder={attr.values.length === 0 ? 'Nhập giá trị thuộc tính và enter' : 'Thêm tiếp...'}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddTagToAttribute(aIdx, (e.target as HTMLInputElement).value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }}
                            className="flex-1 min-w-[140px] h-6 px-1.5 text-xs text-slate-800 focus:outline-none placeholder-slate-400"
                          />
                        </div>

                        {/* Nút Chọn Nhanh (Ảnh 3, 4) */}
                        <button
                          type="button"
                          onClick={() => setActiveQuickTagAttrIndex(activeQuickTagAttrIndex === aIdx ? null : aIdx)}
                          className="px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition cursor-pointer shrink-0"
                        >
                          Chọn nhanh
                        </button>

                        {/* Xóa Thuộc Tính */}
                        <button
                          type="button"
                          onClick={() => handleRemoveAttribute(aIdx)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer shrink-0"
                          title="Xóa thuộc tính"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Popover Gợi Ý Chọn Nhanh Tags (Ảnh 3) */}
                      {activeQuickTagAttrIndex === aIdx && (
                        <div className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2 animate-in fade-in">
                          <div className="text-[11px] font-bold text-blue-900">
                            Gợi ý giá trị phổ biến cho &ldquo;{attr.name}&rdquo;:
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {getQuickTagOptions(attr.name).map((opt, oIdx) => (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleAddTagToAttribute(aIdx, opt)}
                                className="px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-800 hover:bg-blue-600 hover:text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
                              >
                                + {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddAttribute}
                    className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold text-xs cursor-pointer pt-1"
                  >
                    <Plus size={14} />
                    <span>Thêm thuộc tính</span>
                  </button>
                </div>
              </div>

              {/* Phần 3: HÀNG CÙNG LOẠI (MA TRẬN BIẾN THỂ - ẢNH 2, 4) */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">Hàng cùng loại</span>
                    <span className="text-[11px] text-slate-400 font-normal">
                      ({tempVariants.length} mặt hàng được tự động sinh)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => showToast('Mở bảng công thức thiết lập giá bán')}
                    className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-semibold text-xs cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    <span>Thiết lập giá</span>
                  </button>
                </div>

                {/* Bảng Ma Trận Biến Thể (Ảnh 2, 4) */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                          {tempAttributes.length > 0 && <th className="py-2.5 px-3 min-w-[120px]">Giá trị thuộc tính</th>}
                          <th className="py-2.5 px-3 min-w-[80px]">Đơn vị</th>
                          <th className="py-2.5 px-3 text-center min-w-[70px]">Quy đổi</th>
                          <th className="py-2.5 px-3 min-w-[130px]">Mã hàng</th>
                          <th className="py-2.5 px-3 min-w-[120px]">Mã vạch</th>
                          <th className="py-2.5 px-3 min-w-[110px]">Giá vốn</th>
                          <th className="py-2.5 px-3 min-w-[110px]">Giá bán</th>
                          <th className="py-2.5 px-3 min-w-[90px]">Tồn kho</th>
                          <th className="py-2.5 px-2 w-10 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {tempVariants.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50">
                            {tempAttributes.length > 0 && (
                              <td className="py-2 px-3 font-semibold text-slate-800">
                                {v.attributeValue || 'Mặc định'}
                              </td>
                            )}
                            <td className="py-2 px-3 font-medium text-slate-700">{v.unitName}</td>
                            <td className="py-2 px-3 text-center font-mono text-slate-500">{v.conversionRate}</td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={v.code}
                                onChange={(e) => handleUpdateVariantRow(v.id, 'code', e.target.value)}
                                placeholder="Tự động"
                                className="w-full h-8 px-2 rounded border border-slate-200 text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={v.barcode}
                                onChange={(e) => handleUpdateVariantRow(v.id, 'barcode', e.target.value)}
                                placeholder="Nhập mã vạch"
                                className="w-full h-8 px-2 rounded border border-slate-200 text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={v.costPrice}
                                onChange={(e) => handleUpdateVariantRow(v.id, 'costPrice', Number(e.target.value))}
                                className="w-full h-8 px-2 rounded border border-slate-200 text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={v.salePrice}
                                onChange={(e) => handleUpdateVariantRow(v.id, 'salePrice', Number(e.target.value))}
                                className="w-full h-8 px-2 rounded border border-slate-200 text-xs font-mono font-bold text-blue-700"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={v.stock}
                                  onChange={(e) => handleUpdateVariantRow(v.id, 'stock', Number(e.target.value))}
                                  className="w-full h-8 pl-2 pr-6 rounded border border-slate-200 text-xs font-mono"
                                />
                                <Warehouse size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400" />
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteVariantRow(v.id)}
                                className="p-1 text-slate-300 hover:text-rose-600 transition cursor-pointer"
                                title="Xóa dòng biến thể"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal 2 (Ảnh 2, 4) */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="px-5 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={handleApplyConfigModal}
                className="px-6 py-2 rounded-lg bg-[#1E56A0] hover:bg-[#184580] text-xs font-bold text-white transition cursor-pointer shadow-xs"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
