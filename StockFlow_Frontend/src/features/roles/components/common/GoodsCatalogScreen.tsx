// src/features/roles/components/common/GoodsCatalogScreen.tsx
// Màn hình Danh mục Hàng hóa & Tồn kho Master Data cho toàn bộ các Role trong hệ thống
// Hỗ trợ thiết kế Tạo hàng hóa StockFlow chuẩn với Đơn vị tính, Thuộc tính và Ma trận biến thể
// Hỗ trợ cả TỰ NHẬP (free text) và TỰ CHỌN (dropdown suggestions) cho tất cả các trường dữ liệu

import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  Minus,
  MoreHorizontal,
  ExternalLink,
  MapPin,
  Store,
  ArrowDownToLine,
  Globe,
  Inbox,
} from 'lucide-react';
import { productService } from '../../services/productService';
import { adminService } from '../../services/adminService';
import { WarehouseFacility } from '../../types';
import { SkuAnalyticsModal } from './SkuAnalyticsModal';
import { TIN_PHAT_WAREHOUSES, getActiveWarehouse, setActiveWarehouseGlobal } from '@/lib/warehouse/useActiveWarehouse';
import ViewPriceBooksModal from './ViewPriceBooksModal';
import GoodsExportModal from './GoodsExportModal';
import GoodsExportDownloadDock from './GoodsExportDownloadDock';
import GoodsImportModal from './GoodsImportModal';
import ProductFilterSidebar, {
  FilterSidebarState,
  INITIAL_FILTER_STATE,
} from '@/components/ProductFilterSidebar';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

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

// ─── Component Dropdown Nhóm hàng / Thương hiệu Chuẩn KiotViet (Kính lúp & Tạo mới) ───────────
interface KiotSelectWithSearchProps {
  label: string;
  required?: boolean;
  onCreateNew?: () => void;
  createButtonText?: string;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  allowClear?: boolean;
  onQuickCreate?: (val: string) => void;
  className?: string;
}

const KiotSelectWithSearch: React.FC<KiotSelectWithSearchProps> = ({
  label,
  required = false,
  onCreateNew,
  createButtonText = 'Tạo mới',
  value,
  onChange,
  options,
  placeholder = 'Chọn...',
  searchPlaceholder = 'Tìm kiếm...',
  allowClear = true,
  onQuickCreate,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const filteredOptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, searchQuery]);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Header dòng trên: Nhãn & Nút 'Tạo mới' màu xanh chuẩn KiotViet */}
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-slate-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {onCreateNew && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCreateNew();
            }}
            className="text-xs text-[#0070F3] hover:text-blue-700 font-normal hover:underline cursor-pointer transition select-none"
          >
            {createButtonText}
          </button>
        )}
      </div>

      {/* Hộp chọn Trigger chuẩn KiotViet */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-9 px-3 rounded-lg border text-xs flex items-center justify-between cursor-pointer bg-white transition select-none ${
          isOpen ? 'border-blue-500 ring-2 ring-blue-500/15' : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={`truncate ${value ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`}
        />
      </div>

      {/* Dropdown Menu nổi (Nổi bật - Không bị đè / không bị cắt) */}
      {isOpen && (
        <div className="absolute z-[999] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 ring-1 ring-black/10 min-w-[280px]">
          {/* Thanh tìm kiếm bên trong dropdown có icon kính lúp 🔍 */}
          <div className="p-2.5 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={13} />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-8 pl-8 pr-3 text-xs bg-white rounded-md border border-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-slate-800 placeholder-slate-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Danh sách lựa chọn cuộn (Chiều cao thoải mái, hiển thị rõ ràng) */}
          <div className="max-h-60 min-h-[100px] overflow-y-auto divide-y divide-slate-50">
            {/* Lựa chọn xóa / mặc định: Chọn nhóm hàng (Bắt buộc) */}
            {allowClear && (
              <div
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className={`px-3 py-2 cursor-pointer transition flex items-center justify-between ${
                  !value ? 'bg-blue-50/70 text-blue-700 font-medium' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                <span>{placeholder}</span>
                {!value && <Check size={13} className="text-blue-600" />}
              </div>
            )}

            {/* Các tùy chọn lọc theo từ khóa */}
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                const isSelected = value === opt;
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      onChange(opt);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2 cursor-pointer transition flex items-center justify-between ${
                      isSelected ? 'bg-blue-50/70 text-blue-700 font-bold' : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && <Check size={13} className="text-blue-600 flex-shrink-0" />}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-slate-400 text-xs">
                <div className="mb-1 text-slate-500">Không tìm thấy kết quả</div>
                {searchQuery.trim() && onQuickCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      onQuickCreate(searchQuery.trim());
                      setIsOpen(false);
                    }}
                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium hover:underline mt-1 cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Tạo mới &ldquo;{searchQuery.trim()}&rdquo;</span>
                  </button>
                )}
              </div>
            )}
          </div>
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
  createdAt?: string;
  isStarred?: boolean;
  supplier?: string;
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
    warehouseCode?: string;
    actualStock: number;
    availableStock: number;
    costPrice?: number;
    standardPrice?: number;
    minSafeStock?: number;
    maxSafeStock?: number;
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
    supplier: 'xưởng sỉ',
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
    imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80',
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
      { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: 120, availableStock: 120 },
      { warehouseName: 'Kho Đông Anh', warehouseCode: 'K002', actualStock: 50, availableStock: 50 },
      { warehouseName: 'Kho Hà Đông', warehouseCode: 'K003', actualStock: 20, availableStock: 20 },
      { warehouseName: 'Kho Hoàn Kiếm', warehouseCode: 'K004', actualStock: 10, availableStock: 10 },
    ],
    stockCardRecent: [
      { date: '23/09/2026 10:28', docCode: 'NK-2026-099', type: 'NHAP', typeName: 'Nhập kho sản xuất', qtyChange: 120, balance: 200, partnerOrDept: 'Kho Tổng Gia Lâm' },
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
    imageUrl: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&auto=format&fit=crop&q=80',
    units: [
      { name: 'Tấm', conversionRate: 1, isBase: true, isDirectSale: true },
      { name: 'Kiện (10 Tấm)', conversionRate: 10, isBase: false, isDirectSale: true },
    ],
    attributes: [
      { name: 'MÀU SẮC', values: ['Trắng Vân Mây', 'Đá Carrara', 'Xám Bê Tông'] },
    ],
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: 950, availableStock: 850 },
      { warehouseName: 'Kho Đông Anh', warehouseCode: 'K002', actualStock: 180, availableStock: 120 },
      { warehouseName: 'Kho Hà Đông', warehouseCode: 'K003', actualStock: 80, availableStock: 50 },
      { warehouseName: 'Kho Hoàn Kiếm', warehouseCode: 'K004', actualStock: 40, availableStock: 30 },
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
    imageUrl: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&auto=format&fit=crop&q=80',
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: 180, availableStock: 150 },
      { warehouseName: 'Kho Đông Anh', warehouseCode: 'K002', actualStock: 60, availableStock: 50 },
      { warehouseName: 'Kho Hà Đông', warehouseCode: 'K003', actualStock: 25, availableStock: 25 },
      { warehouseName: 'Kho Hoàn Kiếm', warehouseCode: 'K004', actualStock: 15, availableStock: 15 },
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
    imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=80',
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: 180, availableStock: 150 },
      { warehouseName: 'Kho Đông Anh', warehouseCode: 'K002', actualStock: 360, availableStock: 320 },
      { warehouseName: 'Kho Hà Đông', warehouseCode: 'K003', actualStock: 60, availableStock: 50 },
      { warehouseName: 'Kho Hoàn Kiếm', warehouseCode: 'K004', actualStock: 40, availableStock: 40 },
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
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&auto=format&fit=crop&q=80',
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: 280, availableStock: 250 },
      { warehouseName: 'Kho Đông Anh', warehouseCode: 'K002', actualStock: 90, availableStock: 80 },
      { warehouseName: 'Kho Hà Đông', warehouseCode: 'K003', actualStock: 30, availableStock: 25 },
      { warehouseName: 'Kho Hoàn Kiếm', warehouseCode: 'K004', actualStock: 20, availableStock: 15 },
    ],
    stockCardRecent: [
      { date: '08/10/2026', docCode: 'NK-2026-038', type: 'NHAP', typeName: 'Nhập kho thành phẩm sản xuất', qtyChange: 200, balance: 420, partnerOrDept: 'Phân xưởng định hình số 2' },
    ],
  },
  {
    id: 'G-05',
    code: 'TP-KE001',
    name: 'Keo dán chuyên dụng Tín Phát 300ml',
    category: 'Thành phẩm',
    subCategory: 'Keo dán & Phụ liệu',
    brand: 'Tín Phát Bond',
    uom: 'Tuýp',
    specification: 'Tuýp 300ml keo dán đa năng siêu dính cho tấm ốp và phào chỉ',
    warehouse: 'Kho Tổng Gia Lâm',
    stockQuantity: 280,
    reservedQuantity: 0,
    availableQuantity: 280,
    minSafeStock: 30,
    maxSafeStock: 999999999,
    standardPrice: 51300,
    costPrice: 38000,
    barcode: '8936009682245',
    status: 'ACTIVE',
    weight: 350,
    locationName: 'Kệ A-02-T1',
    isDirectSale: true,
    hasRewardPoints: true,
    imageUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&auto=format&fit=crop&q=80',
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: 150, availableStock: 150 },
      { warehouseName: 'Kho Đông Anh', warehouseCode: 'K002', actualStock: 80, availableStock: 80 },
      { warehouseName: 'Kho Hà Đông', warehouseCode: 'K003', actualStock: 30, availableStock: 30 },
      { warehouseName: 'Kho Hoàn Kiếm', warehouseCode: 'K004', actualStock: 20, availableStock: 20 },
    ],
    stockCardRecent: [
      { date: '23/09/2026 10:28', docCode: 'NK-2026-099', type: 'NHAP', typeName: 'Nhập kho từ NCC', qtyChange: 80, balance: 280, partnerOrDept: 'Kho Đông Anh' },
      { date: '15/09/2026 14:10', docCode: 'NK-2026-054', type: 'NHAP', typeName: 'Nhập kho lô đầu', qtyChange: 200, balance: 200, partnerOrDept: 'Kho Tổng Gia Lâm' },
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
    imageUrl: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80',
    stockByWarehouse: [
      { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: 12000, availableStock: 9000 },
      { warehouseName: 'Kho Đông Anh', warehouseCode: 'K002', actualStock: 4500, availableStock: 3500 },
      { warehouseName: 'Kho Hà Đông', warehouseCode: 'K003', actualStock: 1500, availableStock: 800 },
      { warehouseName: 'Kho Hoàn Kiếm', warehouseCode: 'K004', actualStock: 500, availableStock: 200 },
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

export const DEFAULT_SUPPLIER_OPTIONS = [
  'xưởng sỉ',
  'Ba Vì Milk',
  'Tập đoàn Tôn Hoa Sen',
  'Nhà máy Posco',
  'Formosa Plastics',
  'Công ty Cổ phần Nhựa Tiền Phong',
  'Tổng kho Tân Bình',
  'Xưởng may Kim Động',
  'Nhà máy Giấy Bãi Bằng',
  'Công ty TNHH Cơ Khí & Vật Tư Xây Dựng Hà Nội',
];

// Khóa lưu trữ LocalStorage cho Danh mục Hàng hóa
export const STOCKFLOW_GOODS_STORAGE_KEY = 'stockflow_goods_catalog_v1';

// Quy tắc sinh mã hàng hóa tự động chuẩn SP + 6 chữ số tuần tự (SP000001, SP000002, ...)
export const getNextProductCode = (items: GoodsItem[]): string => {
  let maxNum = 0;
  for (const item of items) {
    if (!item.code) continue;
    const match = item.code.trim().match(/^SP(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum > 0 ? maxNum + 1 : 1;
  let code = `SP${String(nextNum).padStart(6, '0')}`;
  let counter = nextNum;
  while (items.some((i) => i.code?.toUpperCase() === code.toUpperCase())) {
    counter++;
    code = `SP${String(counter).padStart(6, '0')}`;
  }
  return code;
};

// Định dạng ngày giờ tạo sản phẩm theo thời gian thực chuẩn Việt Nam (DD/MM/YYYY HH:mm)
export const formatRealDateTime = (dateInput?: string | Date | null): string => {
  if (!dateInput) {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  if (typeof dateInput === 'string' && /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(dateInput)) {
    return dateInput;
  }
  try {
    let d: Date;
    if (typeof dateInput === 'string') {
      let isoStr = dateInput.trim();
      // Nếu là ISO string (e.g. "2026-10-22T20:48:04.69192") từ C# UTC nhưng không có 'Z',
      // bổ sung 'Z' để Date() chuyển đổi chính xác sang múi giờ địa phương của client (GMT+7 Việt Nam).
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(isoStr) && !isoStr.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(isoStr)) {
        isoStr += 'Z';
      }
      d = new Date(isoStr);
      if (isNaN(d.getTime())) {
        d = new Date(dateInput);
      }
    } else {
      d = dateInput;
    }
    if (isNaN(d.getTime())) return String(dateInput);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return String(dateInput);
  }
};

// Định dạng hiển thị số với dấu phẩy ngăn cách hàng nghìn (VD: 50,000; 500,000; 999,999,999)
export const formatNumberWithCommas = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  const str = String(val).replace(/\D/g, '');
  if (!str) return '';
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// Chuyển chuỗi định dạng có dấu phẩy về số nguyên an toàn
export const parseCleanNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  const str = String(val).replace(/\D/g, '');
  return str ? Number(str) : 0;
};

// Lấy thời gian tạo chuẩn: từ item.createdAt, hoặc suy từ timestamp của ID, hoặc thời gian thực hiện tại
export const getItemCreatedTime = (item: GoodsItem): string => {
  if (item.createdAt && item.createdAt !== '23/09/2026 10:28') {
    return formatRealDateTime(item.createdAt);
  }
  if (item.id && /^G-\d{10,}$/.test(item.id)) {
    const ts = parseInt(item.id.replace('G-', ''), 10);
    if (!isNaN(ts)) {
      const formatted = formatRealDateTime(new Date(ts));
      item.createdAt = formatted;
      return formatted;
    }
  }
  // Nếu là mặt hàng mới tạo hoặc chưa lưu thời gian tạo, gán thời gian thực ngay tại thời điểm này
  const nowTime = formatRealDateTime(new Date());
  item.createdAt = nowTime;
  return nowTime;
};

// Chuyển chuỗi ngày (DD/MM/YYYY hoặc ISO YYYY-MM-DD) sang Date để so sánh khoảng thời gian
const parseDateToComparable = (str?: string): Date | null => {
  if (!str) return null;
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    return new Date(year, month, day);
  }
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    return new Date(year, month, day);
  }
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

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

  const [goods, setGoods] = useState<GoodsItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STOCKFLOW_GOODS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Sắp xếp hàng hóa mới tạo sau luôn ở trên cùng (ID lớn hơn / mới hơn ở trên)
            parsed.sort((a: any, b: any) => {
              const numA = a.productId || (Number(a.id) ? Number(a.id) : 0);
              const numB = b.productId || (Number(b.id) ? Number(b.id) : 0);
              if (numA !== numB) return numB - numA;
              return (b.id || '').localeCompare(a.id || '');
            });
            return parsed;
          }
        }
      } catch {}
    }
    return INITIAL_GOODS_LIST;
  });
  const suggestedProductCode = getNextProductCode(goods);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'LOW_STOCK' | 'STARRED'>('ALL');
  const [dbReloadTrigger, setDbReloadTrigger] = useState<number>(0);

  // Bộ lọc bên trái nâng cao kiểu StockFlow (Ảnh 2 & 3)
  const [filterSidebarState, setFilterSidebarState] = useState<FilterSidebarState>(INITIAL_FILTER_STATE);
  const [isFilterSidebarCollapsed, setIsFilterSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('stockflow_goods_filter_collapsed');
        if (stored !== null) return stored === 'true';
      } catch {}
    }
    return false; // Mặc định mở rộng để thấy ngay bộ lọc như ảnh 2 & 3
  });

  const handleToggleSidebar = () => {
    setIsFilterSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('stockflow_goods_filter_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const handleResetSidebarFilters = () => {
    setFilterSidebarState(INITIAL_FILTER_STATE);
    showToast('Đã đặt lại tất cả bộ lọc');
  };

  // Đếm số lượng tiêu chí lọc nâng cao đang áp dụng
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterSidebarState.category || (filterSidebarState.categories?.length ?? 0) > 0) count++;
    if (filterSidebarState.stockCriteria !== 'all') count++;
    if (filterSidebarState.expectedOutOfStockType !== 'all' || (filterSidebarState.expectedOutOfStockPeriod && filterSidebarState.expectedOutOfStockPeriod !== 'Toàn thời gian')) count++;
    if (filterSidebarState.createdDateType !== 'all' || (filterSidebarState.createdPeriod && filterSidebarState.createdPeriod !== 'Toàn thời gian')) count++;
    if (filterSidebarState.attrType?.trim()) count++;
    if (filterSidebarState.attrColor?.trim()) count++;
    if (filterSidebarState.attrSize?.trim()) count++;
    if ((filterSidebarState.suppliers?.length ?? 0) > 0 || filterSidebarState.supplier?.trim()) count++;
    if ((filterSidebarState.locations?.length ?? 0) > 0 || filterSidebarState.location?.trim()) count++;
    if ((filterSidebarState.productTypes?.length ?? 0) > 0 || filterSidebarState.productType?.trim()) count++;
    if (filterSidebarState.directSale !== 'all') count++;
    if (filterSidebarState.businessStatus !== 'all') count++;
    return count;
  }, [filterSidebarState]);

  // Danh sách các danh mục, nhà cung cấp, vị trí trích xuất tự động từ dữ liệu thực
  // Quản lý danh mục & thương hiệu bổ sung linh hoạt (Chuẩn KiotViet)
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customBrands, setCustomBrands] = useState<string[]>([]);
  const [isQuickCategoryModalOpen, setIsQuickCategoryModalOpen] = useState(false);
  const [isQuickBrandModalOpen, setIsQuickBrandModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  // Tải danh mục hiện có từ backend database
  useEffect(() => {
    productService.getCategories().then((cats) => {
      if (Array.isArray(cats) && cats.length > 0) {
        const names = cats.map((c: any) => c.categoryName || c.name).filter(Boolean);
        setCustomCategories((prev) => Array.from(new Set([...prev, ...names])));
      }
    }).catch(() => {});
  }, [dbReloadTrigger]);

  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    goods.forEach((g) => {
      if (g.category) set.add(g.category);
      if (g.subCategory) set.add(g.subCategory);
    });
    customCategories.forEach((c) => set.add(c));
    DEFAULT_SUBCATEGORY_OPTIONS.forEach((c) => set.add(c));
    return Array.from(set).filter(Boolean);
  }, [goods, customCategories]);

  const brandsList = useMemo(() => {
    const set = new Set<string>();
    goods.forEach((g) => {
      if (g.brand) set.add(g.brand);
    });
    customBrands.forEach((b) => set.add(b));
    DEFAULT_BRAND_OPTIONS.forEach((b) => set.add(b));
    return Array.from(set).filter(Boolean);
  }, [goods, customBrands]);

  const suppliersList = useMemo(() => {
    const set = new Set<string>();
    goods.forEach((g) => {
      if (g.supplier) set.add(g.supplier);
    });
    DEFAULT_SUPPLIER_OPTIONS.forEach((s) => set.add(s));
    return Array.from(set).filter(Boolean);
  }, [goods]);

  // Quản lý vị trí kho tùy chỉnh (Chuẩn KiotViet - Ảnh 2)
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  const [isQuickLocationModalOpen, setIsQuickLocationModalOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationDesc, setNewLocationDesc] = useState('');

  const locationsList = useMemo(() => {
    const set = new Set<string>();
    goods.forEach((g) => {
      if (g.locationName) set.add(g.locationName);
    });
    customLocations.forEach((l) => set.add(l));
    DEFAULT_LOCATION_OPTIONS.forEach((l) => set.add(l));
    return Array.from(set).filter(Boolean);
  }, [goods, customLocations]);

  // Thống kê số lượng sản phẩm theo từng nhóm hàng (Ảnh 1)
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    goods.forEach((g) => {
      const cat = g.subCategory || g.category;
      if (cat) {
        map[cat] = (map[cat] || 0) + 1;
      }
    });
    return map;
  }, [goods]);
  // Quản lý tích ô vuông các mặt hàng được chọn
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  // Menu thao tác hàng loạt
  const [bulkActionMenuOpen, setBulkActionMenuOpen] = useState(false);

  // Modal Tùy chọn cột xuất Excel & Floating Dock (Ảnh 1, 2, 3)
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [itemsToExport, setItemsToExport] = useState<GoodsItem[]>([]);
  const [lastExportedFile, setLastExportedFile] = useState<{
    fileName: string;
    workbook: any;
  } | null>(null);
  const [isExportDockOpen, setIsExportDockOpen] = useState(false);

  // Modal Nhập hàng hóa từ file dữ liệu (Ảnh 2, 3)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Đồng bộ chi nhánh kho từ Header / useActiveWarehouse / localStorage (Mặc định kho vật lý cụ thể, KHÔNG dùng "ALL")
  const [warehouseFilter, setWarehouseFilter] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const activeWh = getActiveWarehouse();
      if (activeWh && activeWh.name) return activeWh.name;
      const stored = localStorage.getItem('stockflow_selected_branch');
      if (stored && stored !== 'ALL') return stored;
    }
    return 'Kho Tổng Gia Lâm';
  });

  // Danh sách các cơ sở kho thực tế (lấy động từ Database qua adminService)
  const [facilities, setFacilities] = useState<WarehouseFacility[]>([]);
  const [userWarehouseAccess, setUserWarehouseAccess] = useState<string[]>([]);

  // Modal Nhập kho / Điều chỉnh tồn kho theo chi nhánh (Ảnh 1 & 4)
  const [inboundModalOpen, setInboundModalOpen] = useState(false);
  const [inboundItem, setInboundItem] = useState<GoodsItem | null>(null);
  const [inboundTargetWarehouse, setInboundTargetWarehouse] = useState<string>('Kho Tổng Gia Lâm');
  const [inboundQty, setInboundQty] = useState<number | string>(50);
  const [inboundType, setInboundType] = useState<'ADD' | 'SET'>('ADD');
  const [inboundNote, setInboundNote] = useState<string>('Nhập hàng từ nhà cung cấp');

  // Phân bổ tồn kho theo chi nhánh trong Form Thêm/Sửa
  const [formWarehouseStocks, setFormWarehouseStocks] = useState<Record<string, number>>({});

  // Master-Detail Row Expansion (Ảnh 5)
  const [expandedRowId, setExpandedRowId] = useState<string | null>('G-00');
  const [expandedTab, setExpandedTab] = useState<'info' | 'desc' | 'stockCard' | 'stockByWh' | 'variants'>('info');
  const [hoveredImageId, setHoveredImageId] = useState<string | null>(null);

  // Modal Chi tiết & Thẻ kho (Pop-up cũ vẫn hỗ trợ)
  const [selectedItem, setSelectedItem] = useState<GoodsItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Modal 1: Thêm mới / Chỉnh sửa Hàng hóa (Chuẩn StockFlow - Ảnh 1)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [modalTab, setModalTab] = useState<'info' | 'desc' | 'branch'>('info');
  const [editingItem, setEditingItem] = useState<GoodsItem | null>(null);

  // Modal Xác nhận phạm vi áp dụng giá vốn (Chuẩn StockFlow - Ảnh 2)
  const [costConfirmModalOpen, setCostConfirmModalOpen] = useState(false);
  const [costScope, setCostScope] = useState<'ALL' | 'BRANCH'>('ALL');
  const [costSelectedBranches, setCostSelectedBranches] = useState<string[]>(['Kho Tổng Gia Lâm']);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [pendingKeepOpen, setPendingKeepOpen] = useState(false);
  const [editInitialSnapshot, setEditInitialSnapshot] = useState<any>(null);
  const [costBranchSearch, setCostBranchSearch] = useState('');
  const branchSelectDropdownRef = useRef<HTMLDivElement>(null);

  // Form Fields - Modal 1 (Hỗ trợ TỰ NHẬP tự do hoặc TỰ CHỌN từ danh sách)
  const [formCode, setFormCode] = useState('');
  const isProductCodeDuplicate =
    modalMode === 'create' && formCode.trim()
      ? goods.some((g) => g.code?.toUpperCase() === formCode.trim().toUpperCase())
      : false;
  const [formBarcode, setFormBarcode] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'Thành phẩm' | 'Nguyên vật liệu'>('Thành phẩm');
  const [formSubCategory, setFormSubCategory] = useState('');
  const [formBrand, setFormBrand] = useState('');
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
  const [formSupplier, setFormSupplier] = useState<string>('xưởng sỉ');
  const [analyticsItem, setAnalyticsItem] = useState<GoodsItem | null>(null);
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

  // Modal 2: Thiết lập đơn vị tính & thuộc tính (Chuẩn StockFlow - Ảnh 2, 3, 4)
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
  const [viewingPriceBookItem, setViewingPriceBookItem] = useState<GoodsItem | null>(null);

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
          // Sắp xếp hàng hóa mới tạo sau luôn ở trên cùng
          parsed.sort((a: any, b: any) => {
            const numA = a.productId || (Number(a.id) ? Number(a.id) : 0);
            const numB = b.productId || (Number(b.id) ? Number(b.id) : 0);
            if (numA !== numB) return numB - numA;
            return (b.id || '').localeCompare(a.id || '');
          });
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
          let parsedSupplier = p.supplier;
          if (p.variantsJson) {
            try {
              const vObj = JSON.parse(p.variantsJson);
              if (vObj.supplier) {
                parsedSupplier = vObj.supplier;
              }
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
            createdAt: p.createdAt ? formatRealDateTime(p.createdAt) : undefined,
            supplier: p.supplier || parsedSupplier,
            weight: Number(p.weight) || 0,
            dimensions: parsedDims,
            locationName: p.locationName || undefined,
            isDirectSale: p.isDirectSale ?? true,
            imageUrl: (() => {
              if (p.imageUrl) return p.imageUrl;
              const code = (p.code || p.productCode || '').toUpperCase();
              if (code.includes('KE001')) return 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=400&auto=format&fit=crop&q=80';
              if (code.includes('SP01')) return 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&auto=format&fit=crop&q=80';
              if (code.includes('SP02')) return 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&auto=format&fit=crop&q=80';
              if (code.includes('SP03')) return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&auto=format&fit=crop&q=80';
              if (code.includes('SP04')) return 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&auto=format&fit=crop&q=80';
              if (code.includes('NV01')) return 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&auto=format&fit=crop&q=80';
              if (code.includes('SP652365')) return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80';
              return undefined;
            })(),
            units: parsedUnits,
            attributes: parsedAttributes,
            variants: parsedVariants,
            stockByWarehouse: (() => {
              const total = Number(p.stockQuantity) || 0;
              const code = (p.code || p.productCode || '').toUpperCase();
              if (code === 'TP-KE001') {
                return [
                  { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: 200, availableStock: 200 },
                  { warehouseName: 'Kho Đông Anh', warehouseCode: 'K002', actualStock: 80, availableStock: 80 },
                ];
              }
              if (code === 'TP-SP01') {
                return [
                  { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: 350, availableStock: 350 },
                  { warehouseName: 'Kho Đông Anh', warehouseCode: 'K002', actualStock: 100, availableStock: 100 },
                ];
              }
              if (code === 'TP-SP02') {
                return [
                  { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: 120, availableStock: 120 },
                ];
              }
              if (code === 'TP-SP03') {
                return [
                  { warehouseName: 'Kho Đông Anh', warehouseCode: 'K002', actualStock: 200, availableStock: 200 },
                ];
              }
              return [
                { warehouseName: 'Kho Tổng Gia Lâm', warehouseCode: 'K001', actualStock: total, availableStock: total },
              ];
            })(),
            stockCardRecent: (() => {
              const code = (p.code || p.productCode || '').toUpperCase();
              if (code === 'TP-KE001') {
                return [
                  { date: '23/09/2026 10:28', docCode: 'NK-2026-099', type: 'NHAP' as const, typeName: 'Nhập kho từ NCC', qtyChange: 80, balance: 280, partnerOrDept: 'Kho Đông Anh' },
                  { date: '15/09/2026 14:10', docCode: 'NK-2026-054', type: 'NHAP' as const, typeName: 'Nhập kho lô đầu', qtyChange: 200, balance: 200, partnerOrDept: 'Kho Tổng Gia Lâm' },
                ];
              }
              return [];
            })(),
          };
        });

        if (dbItems.length > 0) {
          // Nạp dữ liệu từ localStorage để merge phân bổ kho & sản phẩm mới (không bị đè mất kho vừa tạo)
          const storedStr = typeof window !== 'undefined' ? localStorage.getItem(STOCKFLOW_GOODS_STORAGE_KEY) : null;
          const localItemsMap = new Map<string, GoodsItem>();
          if (storedStr) {
            try {
              const parsed = JSON.parse(storedStr);
              if (Array.isArray(parsed)) {
                parsed.forEach((it: GoodsItem) => {
                  if (it.code) localItemsMap.set(it.code.toUpperCase(), it);
                  if (it.id) localItemsMap.set(String(it.id), it);
                  if (it.productId) localItemsMap.set(String(it.productId), it);
                });
              }
            } catch {}
          }

          const mergedDbItems: GoodsItem[] = dbItems.map((dbItem): GoodsItem => {
            const localMatch =
              localItemsMap.get(dbItem.code.toUpperCase()) ||
              localItemsMap.get(String(dbItem.id)) ||
              (dbItem.productId ? localItemsMap.get(String(dbItem.productId)) : undefined);

            const finalCreatedAt = dbItem.createdAt || (localMatch?.createdAt && localMatch.createdAt !== '23/09/2026 10:28' ? localMatch.createdAt : undefined);
            const isStarred = localMatch?.isStarred ?? dbItem.isStarred ?? false;
            const finalSupplier = dbItem.supplier || localMatch?.supplier;

            if (localMatch) {
              return {
                ...dbItem,
                supplier: finalSupplier,
                createdAt: finalCreatedAt || dbItem.createdAt,
                isStarred,
                stockByWarehouse: localMatch.stockByWarehouse && localMatch.stockByWarehouse.length > 0
                  ? localMatch.stockByWarehouse
                  : dbItem.stockByWarehouse,
                costPrice: localMatch.costPrice || dbItem.costPrice,
                standardPrice: (dbItem.standardPrice !== undefined && dbItem.standardPrice !== null && dbItem.standardPrice > 0) ? dbItem.standardPrice : (localMatch.standardPrice || 0),
                stockQuantity: localMatch.stockQuantity || dbItem.stockQuantity,
                availableQuantity: localMatch.availableQuantity || dbItem.availableQuantity,
              };
            }
            return {
              ...dbItem,
              supplier: finalSupplier,
              createdAt: finalCreatedAt || dbItem.createdAt,
              isStarred,
            };
          });

          // Giữ lại các sản phẩm được lưu ở localStorage mà database backend chưa kịp trả về
          if (storedStr) {
            try {
              const parsed = JSON.parse(storedStr);
              if (Array.isArray(parsed)) {
                parsed.forEach((sIt: GoodsItem) => {
                  const already = mergedDbItems.some(
                    (m) =>
                      m.id === sIt.id ||
                      (m.code && sIt.code && m.code.toUpperCase() === sIt.code.toUpperCase()) ||
                      (m.productId && sIt.productId && m.productId === sIt.productId)
                  );
                  if (!already) {
                    mergedDbItems.push(sIt);
                  }
                });
              }
            } catch {}
          }

          // SẮP XẾP SẢN PHẨM MỚI TẠO SAU LUÔN Ở TRÊN CÙNG (ProductId hoặc Id lớn hơn nằm trước)
          mergedDbItems.sort((a, b) => {
            const numA = a.productId || (Number(a.id) ? Number(a.id) : 0);
            const numB = b.productId || (Number(b.id) ? Number(b.id) : 0);
            if (numA !== numB) {
              return numB - numA;
            }
            return (b.id || '').localeCompare(a.id || '');
          });

          setGoods(mergedDbItems);
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(mergedDbItems));
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

    // Trích xuất danh sách kho được phân quyền của user từ storage
    const extractUserWarehouses = (userObj: any): string[] => {
      if (!userObj) return [];
      const list: string[] = [];
      if (Array.isArray(userObj.warehouses)) {
        userObj.warehouses.forEach((w: any) => {
          if (typeof w === 'string') list.push(w);
          else {
            if (w.warehouseName) list.push(w.warehouseName);
            if (w.warehouseCode) list.push(w.warehouseCode);
            if (w.name) list.push(w.name);
            if (w.code) list.push(w.code);
            if (w.warehouseId) list.push(String(w.warehouseId));
          }
        });
      }
      if (Array.isArray(userObj.assignedWarehouses)) {
        userObj.assignedWarehouses.forEach((w: any) => {
          if (typeof w === 'string') list.push(w);
        });
      }
      return Array.from(new Set(list));
    };

    const rawUser = typeof window !== 'undefined' ? localStorage.getItem('stockflow_user') : null;
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        setUserWarehouseAccess(extractUserWarehouses(u));
      } catch (e) {
        console.error('Failed to parse user in GoodsCatalogScreen:', e);
      }
    }

    // Tải danh sách cơ sở kho thực tế từ DB/Cache
    adminService.getWarehouseFacilities().then((facs) => {
      if (facs && facs.length > 0) {
        setFacilities(facs);
      }
    });

    // Lắng nghe sự kiện đổi chi nhánh từ Header và useActiveWarehouse
    const handleBranchSync = (e: any) => {
      const branchName = e.detail?.name || e.detail?.branch;
      if (branchName && branchName !== 'ALL') {
        setWarehouseFilter(branchName);
      }
      const curUserRaw = typeof window !== 'undefined' ? localStorage.getItem('stockflow_user') : null;
      if (curUserRaw) {
        try {
          const curU = JSON.parse(curUserRaw);
          setUserWarehouseAccess(extractUserWarehouses(curU));
        } catch {}
      }
    };
    window.addEventListener('stockflow_branch_changed', handleBranchSync);
    window.addEventListener('stockflow:warehouse-changed', handleBranchSync);

    return () => {
      isMounted = false;
      window.removeEventListener('stockflow_branch_changed', handleBranchSync);
      window.removeEventListener('stockflow:warehouse-changed', handleBranchSync);
    };
  }, []);

  // Xác định quyền Admin
  const rawRole = typeof window !== 'undefined' ? localStorage.getItem('stockflow_current_role') : null;
  const rawUserStr = typeof window !== 'undefined' ? localStorage.getItem('stockflow_user') : null;
  let parsedUser: any = null;
  try {
    if (rawUserStr) parsedUser = JSON.parse(rawUserStr);
  } catch {}

  const isAdmin =
    rawRole?.toUpperCase() === 'ADMIN' ||
    parsedUser?.roles?.some((r: string) => String(r).toUpperCase().includes('ADMIN')) ||
    parsedUser?.code === 'NV-ADMIN' ||
    parsedUser?.username?.toLowerCase() === 'admin';

  // Danh sách kho ĐƯỢC PHÂN QUYỀN (Data Isolation)
  const permittedFacilities = useMemo(() => {
    if (facilities.length === 0) return [];
    if (isAdmin) return facilities;

    const allowed = userWarehouseAccess.map((s) => s.trim().toLowerCase());
    if (allowed.length === 0) return [];

    return facilities.filter((fac) => {
      const nameMatch = allowed.includes(fac.name.trim().toLowerCase());
      const codeMatch = allowed.includes(fac.code.trim().toLowerCase());
      const idMatch = fac.id ? allowed.includes(fac.id.trim().toLowerCase()) : false;
      return nameMatch || codeMatch || idMatch;
    });
  }, [facilities, isAdmin, userWarehouseAccess]);

  // Auto-validate và đồng bộ warehouseFilter theo danh sách kho có quyền
  useEffect(() => {
    if (facilities.length === 0 || permittedFacilities.length === 0) return;

    const isValid = permittedFacilities.some(
      (f) =>
        f.name === warehouseFilter ||
        f.code === warehouseFilter ||
        (warehouseFilter && (warehouseFilter.includes(f.name) || warehouseFilter.includes(f.code)))
    );

    if (!isValid) {
      const firstBranch = permittedFacilities[0].name;
      setWarehouseFilter(firstBranch);
      if (typeof window !== 'undefined') {
        localStorage.setItem('stockflow_selected_branch', firstBranch);
      }
    }
  }, [permittedFacilities, facilities.length, warehouseFilter]);

  // Đóng dropdown chọn nhiều chi nhánh khi bấm ra ngoài
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (branchSelectDropdownRef.current && !branchSelectDropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Helper tính toán số lượng tồn kho và giá vốn theo chi nhánh kho đang chọn
  const getProductStockForWarehouse = (item: GoodsItem, whCodeOrName: string) => {
    const targetWh = (!whCodeOrName || whCodeOrName === 'ALL')
      ? (warehouseFilter && warehouseFilter !== 'ALL' ? warehouseFilter : 'Kho Tổng Gia Lâm')
      : whCodeOrName;

    const norm = targetWh.trim().toLowerCase();
    const entry = item.stockByWarehouse?.find((w) => {
      const wName = (w.warehouseName || '').trim().toLowerCase();
      const wCode = (w.warehouseCode || '').trim().toLowerCase();
      if (wName === norm || wCode === norm) return true;
      if (norm.includes('gia lâm') && (wName.includes('gia lâm') || wCode === 'k001')) return true;
      if (norm.includes('đông anh') && (wName.includes('đông anh') || wCode === 'k002')) return true;
      if (norm.includes('hà đông') && (wName.includes('hà đông') || wCode === 'k003')) return true;
      if (norm.includes('hoàn kiếm') && (wName.includes('hoàn kiếm') || wCode === 'k004')) return true;
      return false;
    });

    const isCreationWh = norm === (item.warehouse || '').trim().toLowerCase();
    const hasWarehouseList = item.stockByWarehouse && item.stockByWarehouse.length > 0;
    const actual = entry
      ? Number(entry.actualStock) || 0
      : (!hasWarehouseList && isCreationWh ? Number(item.stockQuantity) || 0 : 0);
    const available = entry
      ? Number(entry.availableStock) || 0
      : (!hasWarehouseList && isCreationWh ? Number(item.availableQuantity ?? item.stockQuantity) || 0 : 0);
    const reserved = Math.max(0, actual - available);
    // Nếu kho này chưa có tồn kho và không có giá vốn riêng, giá vốn = 0 theo chuẩn kho độc lập
    const costPrice = entry?.costPrice !== undefined
      ? Number(entry.costPrice) || 0
      : (actual > 0 ? (item.costPrice || 0) : 0);
    const standardPrice = entry?.standardPrice !== undefined
      ? Number(entry.standardPrice) || 0
      : (item.standardPrice || 0);

    // Định mức tồn kho: chỉ áp dụng cho kho tạo/kho được thiết lập, các kho khác mặc định = 0
    const minSafe = isCreationWh
      ? (entry?.minSafeStock !== undefined ? Number(entry.minSafeStock) || 0 : (item.minSafeStock || 0))
      : (entry?.minSafeStock !== undefined && entry.minSafeStock !== item.minSafeStock ? Number(entry.minSafeStock) || 0 : 0);
    const maxSafe = isCreationWh
      ? (entry?.maxSafeStock !== undefined ? Number(entry.maxSafeStock) || 999999999 : (item.maxSafeStock || 999999999))
      : (entry?.maxSafeStock !== undefined && entry.maxSafeStock !== item.maxSafeStock ? Number(entry.maxSafeStock) || 999999999 : 999999999);

    return {
      actual,
      available,
      reserved,
      costPrice,
      standardPrice,
      minSafe,
      maxSafe,
      isAll: false,
      warehouseName: entry ? entry.warehouseName : targetWh,
      breakdown: item.stockByWarehouse || [],
    };
  };

  // Đồng bộ thay đổi kho với Header và localStorage
  const handleWarehouseFilterChange = (val: string) => {
    setWarehouseFilter(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('stockflow_selected_branch', val);
      const fac = (permittedFacilities.length > 0 ? permittedFacilities : facilities).find(
        (f) => f.code === val || f.name === val
      );
      const branchName = fac ? fac.name : val === 'ALL' ? 'Tất cả các kho' : val;
      window.dispatchEvent(
        new CustomEvent('stockflow_branch_changed', {
          detail: {
            branch: val,
            branchName,
          },
        })
      );
      const matchingWh = TIN_PHAT_WAREHOUSES.find(
        (w) =>
          w.name.toLowerCase() === branchName.toLowerCase() ||
          (fac?.code && w.code.toLowerCase() === fac.code.toLowerCase()) ||
          (fac?.name && w.name.toLowerCase() === fac.name.toLowerCase())
      );
      if (matchingWh) {
        setActiveWarehouseGlobal(matchingWh);
      }
    }
  };

  // Mở modal nhập hàng nhanh vào 1 kho cụ thể
  const handleOpenInboundModal = (item: GoodsItem, whName?: string) => {
    setInboundItem(item);
    const validFacs = permittedFacilities.length > 0 ? permittedFacilities : facilities;
    const isTargetValid = whName && validFacs.some((f) => f.name === whName || f.code === whName);
    const isFilterValid = warehouseFilter && warehouseFilter !== 'ALL' && validFacs.some((f) => f.name === warehouseFilter || f.code === warehouseFilter);
    const defaultWh = isTargetValid
      ? whName
      : (isFilterValid ? warehouseFilter : (validFacs[0]?.name || 'Kho Tổng Gia Lâm'));

    setInboundTargetWarehouse(defaultWh);
    setInboundQty(50);
    setInboundType('ADD');
    setInboundNote('Nhập bổ sung hàng vào kho');
    setInboundModalOpen(true);
  };

  // Xác nhận nhập hàng / cân chỉnh tồn kho tại kho được chọn
  const handleConfirmInbound = () => {
    if (!inboundItem) return;
    const numQty = parseCleanNumber(inboundQty);
    if (numQty <= 0 && inboundType === 'ADD') {
      alert('Vui lòng nhập số lượng hợp lệ lớn hơn 0!');
      return;
    }

    setGoods((prevGoods) => {
      const updated = prevGoods.map((g) => {
        if (g.id !== inboundItem.id && g.code !== inboundItem.code) return g;

        const currentBreakdown = g.stockByWarehouse ? [...g.stockByWarehouse] : [];
        const existingIdx = currentBreakdown.findIndex(
          (w) => w.warehouseName.toLowerCase() === inboundTargetWarehouse.toLowerCase()
        );

        let newActual = 0;
        let delta = 0;

        if (existingIdx >= 0) {
          const oldStock = Number(currentBreakdown[existingIdx].actualStock) || 0;
          if (inboundType === 'ADD') {
            newActual = oldStock + numQty;
            delta = numQty;
          } else {
            newActual = numQty;
            delta = numQty - oldStock;
          }
          currentBreakdown[existingIdx] = {
            ...currentBreakdown[existingIdx],
            actualStock: newActual,
            availableStock: newActual,
          };
        } else {
          newActual = numQty;
          delta = numQty;
          currentBreakdown.push({
            warehouseName: inboundTargetWarehouse,
            actualStock: newActual,
            availableStock: newActual,
          });
        }

        const newTotalActual = currentBreakdown.reduce((sum, w) => sum + (Number(w.actualStock) || 0), 0);
        const newTotalAvailable = currentBreakdown.reduce((sum, w) => sum + (Number(w.availableStock) || 0), 0);

        const newStockCardEntry = {
          date: `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
          docCode: `NK-${Date.now().toString().slice(-6)}`,
          type: 'NHAP' as const,
          typeName: inboundType === 'ADD' ? `Nhập hàng vào ${inboundTargetWarehouse}` : `Cân chỉnh tồn tại ${inboundTargetWarehouse}`,
          qtyChange: delta,
          balance: newTotalActual,
          partnerOrDept: inboundTargetWarehouse,
        };

        return {
          ...g,
          stockQuantity: newTotalActual,
          availableQuantity: newTotalAvailable,
          stockByWarehouse: currentBreakdown,
          stockCardRecent: [newStockCardEntry, ...(g.stockCardRecent || [])],
        };
      });

      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }

      return updated;
    });

    showToast(`Đã cập nhật tồn kho cho "${inboundItem.name}" tại ${inboundTargetWarehouse} thành công!`);
    setInboundModalOpen(false);
  };

  // Quyền hạn RBAC
  const canViewCostPrice = role === 'ADMIN' || role === 'MANAGER';
  const canViewSellingPrice = role === 'ADMIN' || role === 'MANAGER' || role === 'SALES';
  const canManageMaster = role === 'ADMIN' || role === 'MANAGER' || role === 'WAREHOUSE';
  const canDelete = true; // Mở nút xóa với cơ chế kiểm tra thông minh theo nghiệp vụ
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

  const handleSaveQuickCategory = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;

    setIsSavingCategory(true);
    try {
      await productService.createCategory({
        categoryName: name,
        description: newCategoryDesc.trim() || undefined,
      });
    } catch (err) {
      console.warn('Backend category creation fallback:', err);
    } finally {
      setIsSavingCategory(false);
    }

    setCustomCategories((prev) => Array.from(new Set([...prev, name])));
    setFormSubCategory(name);
    setFormCategory(name as any);
    setIsQuickCategoryModalOpen(false);
    setNewCategoryName('');
    setNewCategoryDesc('');
    setNewCategoryParent('');
    showToast('Đã tạo nhóm hàng "' + name + '" thành công!');
  };

  const handleQuickCreateCategoryDirect = async (name: string) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    try {
      await productService.createCategory({
        categoryName: trimmed,
      });
    } catch (err) {
      console.warn('Backend category creation fallback:', err);
    }
    setCustomCategories((prev) => Array.from(new Set([...prev, trimmed])));
    setFormSubCategory(trimmed);
    showToast('Đã tạo nhóm hàng "' + trimmed + '" thành công!');
  };

  const handleSaveQuickBrand = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newBrandName.trim();
    if (!name) return;

    setCustomBrands((prev) => Array.from(new Set([...prev, name])));
    setFormBrand(name);
    setIsQuickBrandModalOpen(false);
    setNewBrandName('');
    showToast('Đã tạo thương hiệu "' + name + '" thành công!');
  };

  const handleQuickCreateBrandDirect = (name: string) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    setCustomBrands((prev) => Array.from(new Set([...prev, trimmed])));
    setFormBrand(trimmed);
    showToast('Đã tạo thương hiệu "' + trimmed + '" thành công!');
  };

  const handleSaveQuickLocation = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newLocationName.trim();
    if (!name) return;

    setCustomLocations((prev) => Array.from(new Set([...prev, name])));
    setFormLocation(name);
    setIsQuickLocationModalOpen(false);
    setNewLocationName('');
    setNewLocationDesc('');
    showToast('Đã tạo vị trí "' + name + '" thành công!');
  };

  const handleQuickCreateLocationDirect = (name: string) => {
    if (!name.trim()) return;
    const trimmed = name.trim();
    setCustomLocations((prev) => Array.from(new Set([...prev, trimmed])));
    setFormLocation(trimmed);
    showToast('Đã tạo vị trí "' + trimmed + '" thành công!');
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingItem(null);
    setModalTab('info');
    setFormCode('');
    setFormBarcode('');
    setFormName('');
    setFormCategory('Thành phẩm');
    setFormSubCategory('');
    setFormBrand('');
    setFormUom('Hộp');
    setFormSpec('');
    const validFacs = permittedFacilities.length > 0 ? permittedFacilities : facilities;
    const activeWh = warehouseFilter && warehouseFilter !== 'ALL' && validFacs.some((f) => f.name === warehouseFilter || f.code === warehouseFilter)
      ? warehouseFilter
      : (validFacs[0]?.name || 'Kho Tổng Gia Lâm');
    setFormWarehouse(activeWh);
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
    setFormSupplier('xưởng sỉ');
    setFormImageUrl('');
    setFormImages([]);
    setFormDescription('');
    setFormUnits([{ name: 'Cái', conversionRate: 1, isBase: true, isDirectSale: true }]);
    setFormAttributes([]);
    setFormVariants([]);

    // Khởi tạo phân bổ tồn kho ban đầu cho từng kho có quyền = 0
    const initialStocks: Record<string, number> = {};
    validFacs.forEach((f) => {
      initialStocks[f.name] = 0;
    });
    setFormWarehouseStocks(initialStocks);
    setEditInitialSnapshot(null);
    setEditModalOpen(true);
  };

  // Đồng bộ số lượng nhập vào với kho hiện đang chọn
  const handleStockQuantityChange = (val: string | number) => {
    setFormStockQuantity(val);
    const num = Math.max(0, parseCleanNumber(val));
    const activeWh = formWarehouse || warehouseFilter || 'Kho Tổng Gia Lâm';
    setFormWarehouseStocks((prev) => ({
      ...prev,
      [activeWh]: num,
    }));
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

    // Xác định kho làm việc hiện tại mà người dùng đang đứng
    const activeWh = warehouseFilter && warehouseFilter !== 'ALL'
      ? warehouseFilter
      : (facilities[0]?.name || item.warehouse || 'Kho Tổng Gia Lâm');
    setFormWarehouse(activeWh);

    // Lấy thông tin tồn kho và giá vốn riêng biệt của chi nhánh kho này
    const match = item.stockByWarehouse?.find(
      (w) =>
        w.warehouseName.trim().toLowerCase() === activeWh.trim().toLowerCase() ||
        (w.warehouseCode && w.warehouseCode.trim().toLowerCase() === activeWh.trim().toLowerCase())
    );

    const branchStock = match ? Number(match.actualStock) || 0 : 0;
    // Nếu kho này chưa nhập tồn (tồn 0), giá vốn hiển thị về 0 đúng thực tế từng kho
    const branchCost = match?.costPrice !== undefined
      ? Number(match.costPrice) || 0
      : (branchStock > 0 ? (item.costPrice || 0) : 0);
    // Giá bán: đồng bộ theo giá bán chung chuẩn của sản phẩm (30.000đ ở mọi kho)
    setFormStandardPrice(item.standardPrice || 0);
    setFormCostPrice(branchCost);
    setFormStockQuantity(branchStock);

    // Định mức tồn kho: ở các kho khác ngoài kho tạo, định mức tồn về 0 theo yêu cầu người dùng
    const isCreationWh = activeWh.trim().toLowerCase() === (item.warehouse || '').trim().toLowerCase();
    const branchMinSafe = isCreationWh
      ? (match?.minSafeStock !== undefined ? Number(match.minSafeStock) || 0 : (item.minSafeStock || 0))
      : (match?.minSafeStock !== undefined && match.minSafeStock !== item.minSafeStock ? Number(match.minSafeStock) || 0 : 0);
    const branchMaxSafe = isCreationWh
      ? (match?.maxSafeStock !== undefined ? Number(match.maxSafeStock) || 999999999 : (item.maxSafeStock || 999999999))
      : (match?.maxSafeStock !== undefined && match.maxSafeStock !== item.maxSafeStock ? Number(match.maxSafeStock) || 999999999 : 999999999);

    setFormMinSafe(branchMinSafe);
    setFormMaxSafe(branchMaxSafe);
    setFormHasRewardPoints(item.hasRewardPoints ?? true);
    setFormIsDirectSale(item.isDirectSale ?? true);
    setFormLocation(item.locationName || '');
    setFormWeight(item.weight || 0);
    setFormWidth(item.dimensions?.width ?? '');
    setFormLength(item.dimensions?.length ?? '');
    setFormDimensionUnit((item.dimensions?.unit as any) || 'm');
    setFormSupplier(item.supplier || 'xưởng sỉ');
    setFormImageUrl(item.imageUrl || '');
    setFormImages(item.imageUrl ? [item.imageUrl] : []);
    setFormDescription(item.description || '');
    const curUnits = item.units && item.units.length > 0 ? item.units : [{ name: item.uom, conversionRate: 1, isBase: true, isDirectSale: true }];
    setFormUnits(curUnits);
    setFormAttributes(item.attributes || []);
    setFormVariants(item.variants || []);

    // Điền số lượng tồn kho từng kho vào form (chỉ kho có quyền)
    const currentStocks: Record<string, number> = {};
    const validFacs = permittedFacilities.length > 0 ? permittedFacilities : facilities;
    validFacs.forEach((f) => {
      const whMatch = item.stockByWarehouse?.find(
        (w) =>
          w.warehouseName.toLowerCase() === f.name.toLowerCase() ||
          (w.warehouseCode && w.warehouseCode.toLowerCase() === f.code.toLowerCase())
      );
      currentStocks[f.name] = whMatch ? Number(whMatch.actualStock) || 0 : 0;
    });
    currentStocks[activeWh] = branchStock;
    setFormWarehouseStocks(currentStocks);

    // Lưu snapshot dữ liệu gốc để nhận diện người dùng có thực sự thay đổi dữ liệu hay không
    setEditInitialSnapshot({
      name: item.name,
      code: item.code,
      barcode: item.barcode || '',
      category: item.category,
      subCategory: item.subCategory,
      brand: item.brand || '',
      supplier: item.supplier || 'xưởng sỉ',
      uom: item.uom,
      spec: item.specification,
      standardPrice: item.standardPrice || 0,
      costPrice: branchCost,
      stockQuantity: branchStock,
      minSafe: branchMinSafe,
      maxSafe: branchMaxSafe,
      hasRewardPoints: item.hasRewardPoints ?? true,
      isDirectSale: item.isDirectSale ?? true,
      location: item.locationName || '',
      weight: item.weight || 0,
      width: item.dimensions?.width ?? '',
      length: item.dimensions?.length ?? '',
      dimensionUnit: (item.dimensions?.unit as any) || 'm',
      imageUrl: item.imageUrl || '',
      description: item.description || '',
      units: curUnits,
      attributes: item.attributes || [],
      variants: item.variants || [],
      stocks: { ...currentStocks },
    });

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

  // Lưu hàng hóa: mở modal xác nhận phạm vi áp dụng giá vốn chuẩn StockFlow (Ảnh 2)
  const handleSaveItem = (e?: React.FormEvent, keepOpen = false) => {
    if (e) e.preventDefault();
    if (!formName.trim()) {
      alert('Vui lòng nhập Tên hàng hóa!');
      return;
    }
    if (isProductCodeDuplicate) {
      alert(`Mã hàng hóa '${formCode.trim().toUpperCase()}' đã tồn tại trong hệ thống! Vui lòng chọn mã khác.`);
      return;
    }

    // Khi chỉnh sửa:
    if (modalMode === 'edit' && editInitialSnapshot) {
      // 1. Kiểm tra giá vốn có thực sự bị thay đổi so với ban đầu hay không
      const currentEnteredCost = parseCleanNumber(formCostPrice);
      const initialCost = Number(editInitialSnapshot.costPrice ?? 0);
      const isCostPriceChanged = currentEnteredCost !== initialCost;

      // NẾU KHÔNG SỬA GIÁ VỐN: LƯU TRỰC TIẾP VÀO DATABASE, TUYỆT ĐỐI KHÔNG HIỆN POPUP ẢNH 2!
      if (!isCostPriceChanged) {
        executeSaveItem('KEEP_EXISTING', [], keepOpen);
        return;
      }
    }

    // Khi tạo mới: nếu giá vốn = 0 thì lưu trực tiếp, không cần hỏi xác nhận
    const currentCost = parseCleanNumber(formCostPrice);
    if (modalMode === 'create' && currentCost === 0) {
      executeSaveItem('ALL', [], keepOpen);
      return;
    }

    // CHỈ KHI NÀO SỬA GIÁ VỐN (hoặc tạo mới có giá vốn > 0): mới mở modal xác nhận phạm vi giá vốn (Ảnh 2)
    setCostScope('ALL');
    const defaultBranch = formWarehouse || warehouseFilter || 'Kho Tổng Gia Lâm';
    setCostSelectedBranches([defaultBranch]);
    setBranchDropdownOpen(false);
    setCostBranchSearch('');
    setPendingKeepOpen(keepOpen);
    setCostConfirmModalOpen(true);
  };

  const executeSaveItem = async (
    applyCostScope: 'ALL' | 'BRANCH' | 'KEEP_EXISTING',
    targetBranchesForCost: string[] = [],
    keepOpen = false
  ) => {
    setCostConfirmModalOpen(false);
    setBranchDropdownOpen(false);
    const finalCode = formCode.trim() ? formCode.trim().toUpperCase() : suggestedProductCode;
    const activeWh = formWarehouse || warehouseFilter || 'Kho Tổng Gia Lâm';
    const numEnteredStock = Math.max(0, parseCleanNumber(formStockQuantity));
    const numEnteredCost = Math.max(0, parseCleanNumber(formCostPrice));
    const numEnteredSalePrice = Math.max(0, parseCleanNumber(formStandardPrice));
    const numEnteredMinSafe = Math.max(0, parseCleanNumber(formMinSafe));
    const numEnteredMaxSafe = formMaxSafe === '' ? 999999999 : Math.max(0, parseCleanNumber(formMaxSafe));

    const targetFacilities = permittedFacilities.length > 0
      ? permittedFacilities
      : (facilities.length > 0
        ? facilities
        : [
            { code: 'K001', name: 'Kho Tổng Gia Lâm', address: 'Số 18 Đường Dệt May, Gia Lâm' },
            { code: 'K002', name: 'Kho Đông Anh', address: 'CCN Nguyên Khê, Đông Anh' },
          ]);

    const builtStockByWarehouse = targetFacilities.map((fac) => {
      const isCurrentActive =
        fac.name.trim().toLowerCase() === activeWh.trim().toLowerCase() ||
        (fac.code && fac.code.trim().toLowerCase() === activeWh.trim().toLowerCase());

      const existingEntry = editingItem?.stockByWarehouse?.find(
        (w) =>
          w.warehouseName.trim().toLowerCase() === fac.name.trim().toLowerCase() ||
          (w.warehouseCode && fac.code && w.warehouseCode.trim().toLowerCase() === fac.code.trim().toLowerCase())
      );

      // Số lượng tồn
      const qty = isCurrentActive
        ? numEnteredStock
        : (formWarehouseStocks[fac.name] !== undefined
            ? Number(formWarehouseStocks[fac.name]) || 0
            : (Number(existingEntry?.actualStock) || 0));

      // Giá vốn: Toàn hệ thống vs Chi nhánh vs Giữ nguyên
      let cost: number;
      if (applyCostScope === 'ALL') {
        cost = numEnteredCost;
      } else if (applyCostScope === 'BRANCH') {
        const isCostTarget = targetBranchesForCost.some(
          (b) =>
            b.trim().toLowerCase() === fac.name.trim().toLowerCase() ||
            (fac.code && b.trim().toLowerCase() === fac.code.trim().toLowerCase())
        );
        cost = isCostTarget
          ? numEnteredCost
          : (existingEntry?.costPrice ?? 0);
      } else {
        // KEEP_EXISTING: Không sửa giá vốn, giữ nguyên giá vốn từng kho như cũ
        cost = existingEntry?.costPrice ?? (editingItem?.costPrice ?? numEnteredCost);
      }

      // Giá bán: đồng bộ toàn hệ thống theo giá vừa cập nhật (30.000đ ở mọi kho)
      const price = numEnteredSalePrice;

      // Định mức tồn kho: ở các kho khác ngoài kho tạo, định mức tồn luôn set về 0
      const itemCreationWh = (editingItem?.warehouse || activeWh).trim().toLowerCase();
      const isWhCreation = fac.name.trim().toLowerCase() === itemCreationWh ||
        (fac.code && fac.code.trim().toLowerCase() === itemCreationWh);

      let minSafe: number;
      if (isCurrentActive) {
        minSafe = numEnteredMinSafe;
      } else if (isWhCreation) {
        minSafe = existingEntry?.minSafeStock !== undefined ? existingEntry.minSafeStock : (editingItem?.minSafeStock || 0);
      } else {
        minSafe = 0; // Các kho khác ngoài kho tạo luôn set về 0 theo yêu cầu người dùng
      }

      const maxSafe = isCurrentActive
        ? numEnteredMaxSafe
        : (isWhCreation ? (existingEntry?.maxSafeStock !== undefined ? existingEntry.maxSafeStock : 999999999) : 999999999);

      return {
        warehouseName: fac.name,
        warehouseCode: fac.code,
        actualStock: qty,
        availableStock: qty,
        costPrice: cost,
        standardPrice: price,
        minSafeStock: minSafe,
        maxSafeStock: maxSafe,
      };
    });

    // Tính lại tổng tồn kho toàn hệ thống
    const totalActualStock = builtStockByWarehouse.reduce((s, w) => s + w.actualStock, 0);

    const nowFormatted = formatRealDateTime(new Date());

    const savedItem: GoodsItem = {
      id: editingItem ? editingItem.id : `G-${Date.now()}`,
      code: finalCode,
      name: formName.trim(),
      category: formCategory,
      subCategory: formSubCategory.trim() || 'Hàng hóa thường',
      brand: formBrand.trim() || undefined,
      uom: formUom.trim() || 'Hộp',
      specification: formSpec.trim() || (formWidth && formLength ? `${formWidth}x${formLength} ${formDimensionUnit}` : 'Quy cách chuẩn'),
      warehouse: editingItem ? editingItem.warehouse : activeWh,
      stockQuantity: totalActualStock,
      reservedQuantity: editingItem ? editingItem.reservedQuantity : 0,
      availableQuantity: totalActualStock,
      minSafeStock: editingItem
        ? (activeWh.trim().toLowerCase() === (editingItem.warehouse || '').trim().toLowerCase()
            ? numEnteredMinSafe
            : editingItem.minSafeStock)
        : numEnteredMinSafe,
      maxSafeStock: numEnteredMaxSafe,
      standardPrice: numEnteredSalePrice,
      costPrice: applyCostScope === 'ALL'
        ? numEnteredCost
        : (applyCostScope === 'BRANCH'
            ? (targetBranchesForCost.some(
                (b) =>
                  b.trim().toLowerCase() === (editingItem?.warehouse || activeWh).trim().toLowerCase()
              )
                ? numEnteredCost
                : (editingItem?.costPrice ?? 0))
            : (editingItem?.costPrice ?? numEnteredCost)),
      barcode: formBarcode.trim() || `893600${Math.floor(1000000 + Math.random() * 9000000)}`,
      status: 'ACTIVE',
      createdAt: editingItem ? getItemCreatedTime(editingItem) : nowFormatted,
      supplier: formSupplier.trim() || undefined,
      weight: parseCleanNumber(formWeight),
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
      stockByWarehouse: builtStockByWarehouse,
      stockCardRecent: editingItem
        ? [
            {
              date: nowFormatted,
              docCode: `DC-${finalCode}`,
              type: 'NHAP' as const,
              typeName: `Cập nhật tồn kho tại ${formWarehouse || warehouseFilter}`,
              qtyChange: parseCleanNumber(formStockQuantity),
              balance: totalActualStock,
              partnerOrDept: formWarehouse || warehouseFilter,
            },
            ...(editingItem.stockCardRecent || []),
          ]
        : [
            {
              date: nowFormatted,
              docCode: `NK-${finalCode}`,
              type: 'NHAP' as const,
              typeName: `Khởi tạo tồn kho ban đầu tại ${formWarehouse || warehouseFilter}`,
              qtyChange: Number(formStockQuantity) || 0,
              balance: Number(formStockQuantity) || 0,
              partnerOrDept: formWarehouse || warehouseFilter,
            },
          ],
    };

    // Chuẩn bị payload chuẩn gửi đến backend ASP.NET Core & MediatR
    const activeFac: any = targetFacilities.find(
      (f) =>
        f.name.trim().toLowerCase() === activeWh.trim().toLowerCase() ||
        (f.code && f.code.trim().toLowerCase() === activeWh.trim().toLowerCase())
    );
    const numericWhId = activeFac?.warehouseId || (activeFac?.id && Number(String(activeFac.id).replace(/\D/g, '')) ? Number(String(activeFac.id).replace(/\D/g, '')) : undefined);

    const apiPayload: any = {
      code: savedItem.code,
      name: savedItem.name,
      type: savedItem.category === 'Nguyên vật liệu' ? 'RAW_MATERIAL' : 'FINISHED',
      categoryName: savedItem.subCategory || savedItem.category,
      uom: savedItem.uom,
      supplier: savedItem.supplier,
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
      initialWarehouseId: numericWhId,
      createdAt: new Date().toISOString(),
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
      let numericId = editingItem?.productId || (editingItem && Number(editingItem.id) ? Number(editingItem.id) : undefined);
      if (editingItem && !numericId) {
        try {
          const found = await productService.getProducts({ search: editingItem.code });
          const exact = found.find((p: any) => (p.code || p.productCode || '').toUpperCase() === editingItem.code.toUpperCase());
          if (exact) {
            numericId = (exact as any).productId || (Number(exact.id) ? Number(exact.id) : undefined);
          }
        } catch {}
      }

      if (editingItem && numericId) {
        try {
          const updateRes = await productService.updateProduct(numericId, apiPayload);
          if (updateRes) {
            savedItem.productId = (updateRes as any).productId || numericId;
            if ((updateRes as any).categoryName) {
              savedItem.subCategory = (updateRes as any).categoryName;
            }
          }
          showToast(`Đã cập nhật hàng hóa: ${savedItem.name}`);
        } catch (apiErr) {
          console.warn('API update fallback locally:', apiErr);
          showToast(`Đã lưu thay đổi: ${savedItem.name}`);
        }
      } else {
        try {
          const createRes = await productService.createProduct(apiPayload);
          if (createRes) {
            savedItem.id = String(createRes.id || (createRes as any).productId || savedItem.id);
            savedItem.productId = (createRes as any).productId || (Number(createRes.id) ? Number(createRes.id) : Date.now());
            if ((createRes as any).createdAt) {
              savedItem.createdAt = formatRealDateTime((createRes as any).createdAt);
            }
            if ((createRes as any).categoryName) {
              savedItem.subCategory = (createRes as any).categoryName;
            }
          }
          showToast(`Tạo mới hàng hóa thành công: ${savedItem.name}`);
        } catch (apiErr) {
          console.warn('API create fallback locally:', apiErr);
          if (!savedItem.productId) {
            savedItem.productId = Date.now();
          }
          showToast(`Đã tạo mới hàng hóa: ${savedItem.name}`);
        }
      }

      // Cập nhật React state và lưu cache LocalStorage
      let updatedList: GoodsItem[];
      if (editingItem) {
        updatedList = goods.map((g) => (g.id === editingItem.id || g.code.toUpperCase() === editingItem.code.toUpperCase() ? savedItem : g));
      } else {
        // Hàng hóa mới tạo sau luôn được đưa lên TRÊN CÙNG (index 0)
        updatedList = [savedItem, ...goods.filter((g) => g.id !== savedItem.id && g.code.toUpperCase() !== savedItem.code.toUpperCase())];
      }

      setGoods(updatedList);
      setExpandedRowId(savedItem.id);

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
    // 1. Kiểm tra nếu sản phẩm đang có khách đặt hàng
    const stockInfo = getProductStockForWarehouse(item, warehouseFilter);
    const reservedQty = stockInfo.reserved || item.reservedQuantity || 0;
    if (reservedQty > 0) {
      if (
        window.confirm(
          `Sản phẩm "${item.name}" (${item.code}) đang có đơn đặt hàng từ khách (Khách đặt: ${reservedQty.toLocaleString('vi-VN')} ${item.uom}).\n\n` +
          `Để bảo toàn dữ liệu sổ sách và lịch sử đơn hàng, hệ thống KHÔNG CHO PHÉP XÓA VĨNH VIỄN!\n\n` +
          `Bạn có muốn chuyển mặt hàng này sang trạng thái "Ngừng kinh doanh" để ẩn đi không?`
        )
      ) {
        try {
          const numericId = item.productId || (Number(item.id) ? Number(item.id) : undefined);
          if (numericId) {
            await productService.updateProduct(numericId, { isActive: false });
          }
          const updated = goods.map((g) => (g.id === item.id ? { ...g, status: 'DISCONTINUED' as const } : g));
          setGoods(updated);
          if (typeof window !== 'undefined') {
            localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(updated));
          }
          showToast(`Đã chuyển sản phẩm ${item.code} sang trạng thái Ngừng kinh doanh!`);
        } catch (err: any) {
          alert(`Lỗi khi cập nhật trạng thái: ${err?.message || 'Thao tác thất bại'}`);
        }
      }
      return;
    }

    // 2. Nếu là hàng mới tạo / test / rác: hỏi xác nhận xóa vĩnh viễn
    if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn mặt hàng "${item.name}" (${item.code}) khỏi cơ sở dữ liệu hệ thống?`)) {
      try {
        const numericId = item.productId || (Number(item.id) ? Number(item.id) : undefined);
        if (numericId) {
          await productService.deleteProduct(numericId);
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
        showToast(`Đã xóa vĩnh viễn hàng hóa ${item.code} khỏi cơ sở dữ liệu thành công!`);
      } catch (err: any) {
        console.error('Lỗi khi xóa khỏi CSDL:', err);
        const errMsg = err?.message || 'Thao tác xóa thất bại';
        if (
          window.confirm(
            `Không thể xóa vĩnh viễn: ${errMsg}\n\n` +
            `Bạn có muốn chuyển sang trạng thái "Ngừng kinh doanh" để ẩn mặt hàng này khỏi danh mục bán không?`
          )
        ) {
          try {
            const numericId = item.productId || (Number(item.id) ? Number(item.id) : undefined);
            if (numericId) {
              await productService.updateProduct(numericId, { isActive: false });
            }
            const updated = goods.map((g) => (g.id === item.id ? { ...g, status: 'DISCONTINUED' as const } : g));
            setGoods(updated);
            if (typeof window !== 'undefined') {
              localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(updated));
            }
            showToast(`Đã chuyển sản phẩm ${item.code} sang Ngừng kinh doanh!`);
          } catch {}
        }
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

  // Filtered List kết hợp cả thanh tìm kiếm + bộ lọc nâng cao StockFlow (Ảnh 2 & 3)
  const filteredGoods = goods.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.code.toLowerCase().includes(search.toLowerCase()) ||
      item.subCategory.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search) ||
      (item.brand && item.brand.toLowerCase().includes(search.toLowerCase()));

    if (!matchSearch) return false;

    // Header Category Filter Tabs (Tất cả, Đã gắn sao, Cảnh báo tồn thấp)
    if (categoryFilter === 'LOW_STOCK') {
      const stockInfo = getProductStockForWarehouse(item, warehouseFilter);
      if (stockInfo.minSafe <= 0 || stockInfo.actual >= stockInfo.minSafe) return false;
    }

    if (categoryFilter === 'STARRED') {
      if (!item.isStarred) return false;
    }

    // ─── 1. Nhóm hàng (Category / SubCategory) - Hỗ trợ chọn nhiều nhóm (Multi-select) ───
    const selectedCats = filterSidebarState.categories && filterSidebarState.categories.length > 0
      ? filterSidebarState.categories
      : (filterSidebarState.category?.trim() ? [filterSidebarState.category.trim()] : []);

    if (selectedCats.length > 0) {
      const matchCat = selectedCats.some((c) => {
        const catLower = c.trim().toLowerCase();
        return (
          (item.category && item.category.toLowerCase().includes(catLower)) ||
          (item.subCategory && item.subCategory.toLowerCase().includes(catLower))
        );
      });
      if (!matchCat) return false;
    }

    // ─── 2. Tồn kho (Tiêu chí tồn: below_min, above_max, in_stock, out_of_stock, custom) ───
    const itemStock = getProductStockForWarehouse(item, warehouseFilter);
    if (filterSidebarState.stockCriteria === 'below_min') {
      if (itemStock.minSafe <= 0 || itemStock.actual >= itemStock.minSafe) return false;
    } else if (filterSidebarState.stockCriteria === 'above_max') {
      if (itemStock.maxSafe <= 0 || itemStock.actual <= itemStock.maxSafe) return false;
    } else if (filterSidebarState.stockCriteria === 'in_stock') {
      if (itemStock.actual <= 0) return false;
    } else if (filterSidebarState.stockCriteria === 'out_of_stock') {
      if (itemStock.actual > 0) return false;
    } else if (filterSidebarState.stockCriteria === 'custom') {
      if (typeof filterSidebarState.customStockMin === 'number' && itemStock.actual < filterSidebarState.customStockMin) {
        return false;
      }
      if (typeof filterSidebarState.customStockMax === 'number' && itemStock.actual > filterSidebarState.customStockMax) {
        return false;
      }
    }

    // ─── 3. Dự kiến hết hàng ───
    if (filterSidebarState.expectedOutOfStockType === 'custom') {
      if (itemStock.actual > (itemStock.minSafe || 0)) return false;
    } else if (filterSidebarState.expectedOutOfStockPeriod && filterSidebarState.expectedOutOfStockPeriod !== 'Toàn thời gian') {
      const p = filterSidebarState.expectedOutOfStockPeriod;
      if (['Ngày mai', 'Ngày kia', '3 ngày tới'].includes(p)) {
        if (itemStock.actual > Math.max(0, itemStock.minSafe || 0) + 5) return false;
      } else if (['5 ngày tới', '7 ngày tới', 'Tuần này', 'Tuần tới'].includes(p)) {
        if (itemStock.actual > Math.max(0, itemStock.minSafe || 0) + 15) return false;
      } else if (['2 tuần tới', 'Tháng này', 'Tháng tới', '30 ngày tới', '2 tháng tới', '3 tháng tới'].includes(p)) {
        if (itemStock.actual > Math.max(0, itemStock.minSafe || 0) + 50) return false;
      }
    }

    // ─── 4. Thời gian tạo ───
    if (filterSidebarState.createdDateFrom || filterSidebarState.createdDateTo) {
      const itemDate = parseDateToComparable(item.createdAt);
      if (itemDate) {
        if (filterSidebarState.createdDateFrom) {
          const fromDate = parseDateToComparable(filterSidebarState.createdDateFrom);
          if (fromDate) {
            const startOfDay = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate(), 0, 0, 0, 0);
            if (itemDate < startOfDay) return false;
          }
        }
        if (filterSidebarState.createdDateTo) {
          const toDate = parseDateToComparable(filterSidebarState.createdDateTo);
          if (toDate) {
            const endOfDay = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999);
            if (itemDate > endOfDay) return false;
          }
        }
      }
    } else if (filterSidebarState.createdPeriod && filterSidebarState.createdPeriod !== 'Toàn thời gian') {
      const p = filterSidebarState.createdPeriod;
      const itemDate = parseDateToComparable(item.createdAt);
      if (itemDate) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (p === 'Hôm nay') {
          if (itemDate < startOfToday) return false;
        } else if (p === 'Hôm qua') {
          const yesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
          if (itemDate < yesterday || itemDate >= startOfToday) return false;
        } else if (p === 'Tuần này' || p === '7 ngày qua') {
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (itemDate < sevenDaysAgo) return false;
        } else if (p === 'Tháng này' || p === '30 ngày qua') {
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (itemDate < thirtyDaysAgo) return false;
        }
      }
    }

    // ─── 5. Thuộc tính (LOẠI, MÀU, SIZE) ───
    if (filterSidebarState.attrType && filterSidebarState.attrType.trim()) {
      const query = filterSidebarState.attrType.trim().toLowerCase();
      const matchAttr =
        item.specification?.toLowerCase().includes(query) ||
        item.attributes?.some((a) => a.name.toLowerCase().includes(query) || a.values.some((v) => v.toLowerCase().includes(query))) ||
        item.variants?.some((v) => v.attributeValue?.toLowerCase().includes(query));
      if (!matchAttr) return false;
    }

    if (filterSidebarState.attrColor && filterSidebarState.attrColor.trim()) {
      const query = filterSidebarState.attrColor.trim().toLowerCase();
      const matchColor =
        item.name.toLowerCase().includes(query) ||
        item.specification?.toLowerCase().includes(query) ||
        item.attributes?.some((a) => a.name.toLowerCase().includes('màu') && a.values.some((v) => v.toLowerCase().includes(query))) ||
        item.variants?.some((v) => v.attributeValue?.toLowerCase().includes(query));
      if (!matchColor) return false;
    }

    if (filterSidebarState.attrSize && filterSidebarState.attrSize.trim()) {
      const query = filterSidebarState.attrSize.trim().toLowerCase();
      const matchSize =
        item.name.toLowerCase().includes(query) ||
        item.specification?.toLowerCase().includes(query) ||
        item.attributes?.some((a) => a.name.toLowerCase().includes('size') && a.values.some((v) => v.toLowerCase().includes(query))) ||
        item.variants?.some((v) => v.attributeValue?.toLowerCase().includes(query));
      if (!matchSize) return false;
    }

    // ─── 6. Nhà cung cấp (Hỗ trợ chọn nhiều - Multi-select) ───
    const selectedSuppliers = (filterSidebarState.suppliers && filterSidebarState.suppliers.length > 0)
      ? filterSidebarState.suppliers
      : filterSidebarState.supplier?.trim() ? [filterSidebarState.supplier.trim()] : [];
    if (selectedSuppliers.length > 0) {
      const matchSup = selectedSuppliers.some(
        (s) => item.supplier && item.supplier.toLowerCase().includes(s.toLowerCase())
      );
      if (!matchSup) return false;
    }

    // ─── 7. Vị trí (Hỗ trợ chọn nhiều - Multi-select) ───
    const selectedLocations = (filterSidebarState.locations && filterSidebarState.locations.length > 0)
      ? filterSidebarState.locations
      : filterSidebarState.location?.trim() ? [filterSidebarState.location.trim()] : [];
    if (selectedLocations.length > 0) {
      const matchLoc = selectedLocations.some(
        (l) => item.locationName && item.locationName.toLowerCase().includes(l.toLowerCase())
      );
      if (!matchLoc) return false;
    }

    // ─── 8. Loại hàng (Hàng hóa, Dịch vụ, Combo - Hỗ trợ chọn nhiều) ───
    const selectedTypes = (filterSidebarState.productTypes && filterSidebarState.productTypes.length > 0)
      ? filterSidebarState.productTypes
      : filterSidebarState.productType?.trim() ? [filterSidebarState.productType.trim()] : [];
    if (selectedTypes.length > 0) {
      const matchPType = selectedTypes.some((pType) => {
        const query = pType.toLowerCase();
        return (
          (item.category && item.category.toLowerCase().includes(query)) ||
          (item.subCategory && item.subCategory.toLowerCase().includes(query))
        );
      });
      if (!matchPType) return false;
    }

    // ─── 9. Bán trực tiếp (Tất cả / Có / Không) ───
    if (filterSidebarState.directSale === 'yes' && item.isDirectSale === false) return false;
    if (filterSidebarState.directSale === 'no' && item.isDirectSale === true) return false;

    // ─── 10. Trạng thái hàng hóa (Hàng đang kinh doanh / Hàng ngừng kinh doanh / Tất cả) ───
    if (filterSidebarState.businessStatus === 'active' && item.status !== 'ACTIVE') return false;
    if (filterSidebarState.businessStatus === 'inactive' && item.status !== 'DISCONTINUED') return false;

    // Các mặt hàng hiển thị thì ở tất cả các kho đều giống nhau,
    // số lượng tồn kho sẽ thay đổi tương ứng theo chi nhánh được chọn.
    return true;
  });

  // KPI Metrics (Tính toán theo chi nhánh kho đang chọn)
  const totalSku = goods.length;
  const starredCount = goods.filter((g) => g.isStarred).length;
  const lowStockCount = goods.filter((g) => {
    const stockInfo = getProductStockForWarehouse(g, warehouseFilter);
    return stockInfo.minSafe > 0 && stockInfo.actual < stockInfo.minSafe;
  }).length;
  const totalAvailableQty = goods.reduce((sum, g) => {
    const stockInfo = getProductStockForWarehouse(g, warehouseFilter);
    return sum + stockInfo.available;
  }, 0);
  const totalReservedQty = goods.reduce((sum, g) => {
    const stockInfo = getProductStockForWarehouse(g, warehouseFilter);
    return sum + stockInfo.reserved;
  }, 0);

  // ─── Tích ô vuông (Checkbox Selection) ──────────────────────────────────
  const handleToggleSelectItem = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    if (selectedItemIds.length === filteredGoods.length && filteredGoods.length > 0) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredGoods.map((g) => g.id));
    }
  };

  const handleClearSelection = () => {
    setSelectedItemIds([]);
  };

  // ─── Đánh dấu sao vàng / cam (Star / Bookmark) ──────────────────────────
  const handleToggleStar = (itemId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setGoods((prevGoods) => {
      let isNowStarred = false;
      const updated = prevGoods.map((g) => {
        if (g.id === itemId) {
          isNowStarred = !g.isStarred;
          return { ...g, isStarred: isNowStarred };
        }
        return g;
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      showToast(isNowStarred ? 'Đã đánh dấu sao mặt hàng (Quan tâm)' : 'Đã bỏ đánh dấu sao mặt hàng');
      return updated;
    });
  };

  // Bulk actions cho các mặt hàng được tích chọn
  const handleBulkStar = (starVal: boolean) => {
    if (selectedItemIds.length === 0) return;
    setGoods((prevGoods) => {
      const updated = prevGoods.map((g) => {
        if (selectedItemIds.includes(g.id)) {
          return { ...g, isStarred: starVal };
        }
        return g;
      });
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    setBulkActionMenuOpen(false);
    showToast(starVal ? `Đã gắn sao cho ${selectedItemIds.length} mặt hàng` : `Đã bỏ gắn sao cho ${selectedItemIds.length} mặt hàng`);
  };

  const handleBulkDelete = async () => {
    if (selectedItemIds.length === 0) return;

    // Phân loại các sản phẩm đã chọn: có khách đặt vs chưa có khách đặt
    const itemsWithOrders = selectedItemIds
      .map((id) => goods.find((g) => g.id === id))
      .filter((g): g is GoodsItem => {
        if (!g) return false;
        const s = getProductStockForWarehouse(g, warehouseFilter);
        return (s.reserved || g.reservedQuantity || 0) > 0;
      });

    if (itemsWithOrders.length > 0) {
      const orderNames = itemsWithOrders.map((i) => `• ${i.code} - ${i.name}`).slice(0, 3).join('\n');
      const moreText = itemsWithOrders.length > 3 ? `\nvà ${itemsWithOrders.length - 3} sản phẩm khác` : '';
      alert(
        `Trong số các mặt hàng đã chọn, có ${itemsWithOrders.length} sản phẩm đang có đơn đặt hàng từ khách:\n${orderNames}${moreText}\n\n` +
        `Để bảo toàn chứng từ kế toán, hệ thống KHÔNG CHO PHÉP xóa các sản phẩm này!`
      );
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedItemIds.length} mặt hàng đã chọn khỏi cơ sở dữ liệu?`)) return;

    let successCount = 0;
    const failedItems: string[] = [];
    const deletedIds: string[] = [];

    for (const id of selectedItemIds) {
      const it = goods.find((g) => g.id === id);
      if (!it) continue;
      const numId = it.productId || (Number(it.id) ? Number(it.id) : undefined);
      if (numId) {
        try {
          await productService.deleteProduct(numId);
          deletedIds.push(id);
          successCount++;
        } catch {
          failedItems.push(it.code);
        }
      } else {
        deletedIds.push(id);
        successCount++;
      }
    }

    if (deletedIds.length > 0) {
      setGoods((prev) => {
        const updated = prev.filter((g) => !deletedIds.includes(g.id));
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(updated));
          } catch {}
        }
        return updated;
      });
    }

    setSelectedItemIds([]);
    setBulkActionMenuOpen(false);

    if (failedItems.length > 0) {
      alert(`Đã xóa ${successCount} mặt hàng. Có ${failedItems.length} mặt hàng không thể xóa do đã phát sinh giao dịch/chứng từ: ${failedItems.join(', ')}`);
    } else {
      showToast(`Đã xóa ${successCount} mặt hàng thành công!`);
    }
  };

  const handleBulkPrintBarcode = () => {
    if (selectedItemIds.length === 0) return;
    showToast(`Đang kết xuất và gửi lệnh in tem mã vạch cho ${selectedItemIds.length} mặt hàng...`);
  };

  const handleBulkExportExcel = () => {
    if (selectedItemIds.length === 0) return;
    const items = goods.filter((g) => selectedItemIds.includes(g.id));
    setItemsToExport(items);
    setIsExportModalOpen(true);
  };

  const handleExportSuccess = (result: { fileName: string; workbook: any }) => {
    setLastExportedFile(result);
    setIsExportDockOpen(true);
    showToast(`Đã xuất thành công tệp ${result.fileName}`);
  };

  const handleImportSuccess = (importedCount: number, fileName: string, newGoods: GoodsItem[]) => {
    setGoods(newGoods);
    try {
      localStorage.setItem(STOCKFLOW_GOODS_STORAGE_KEY, JSON.stringify(newGoods));
    } catch {}
    setLastExportedFile({ fileName: fileName, workbook: null });
    setIsExportDockOpen(true);
    showToast(`Nhập dữ liệu thành công! Đã xử lý ${importedCount} mặt hàng từ file.`);
  };

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
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#f5f5f5] overflow-hidden select-none text-[13px] text-[#15171a] font-sans relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Toolbar Bar (Chuẩn thiết kế KiotViet giống Chuyển hàng) */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Title & Search bar */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <h1 className="text-[20px] font-bold text-[#15171a] leading-7 tracking-tight whitespace-nowrap">
            Hàng hóa
          </h1>

          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Theo mã, tên hàng, mã vạch hoặc thương hiệu..."
              className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-200 text-[13px] text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {canManageMaster && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[13px] shadow-xs transition cursor-pointer"
            >
              <Plus size={15} className="stroke-[2.5]" />
              <span>Thêm mới</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] font-medium text-[13px] transition cursor-pointer bg-white"
          >
            <ArrowDownToLine size={14} className="text-[#677484]" />
            <span>Import file</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setItemsToExport(filteredGoods);
              setIsExportModalOpen(true);
            }}
            className="inline-flex items-center gap-1 px-3 h-8 rounded-[8px] border border-slate-300 hover:bg-[#f7f8f9] text-[#15171a] font-medium text-[13px] transition cursor-pointer bg-white"
          >
            <FileSpreadsheet size={14} className="text-[#677484]" />
            <span>Xuất file</span>
            <span className="text-[10px]">▾</span>
          </button>
        </div>
      </header>

      {/* 2. Main Workspace: Sidebar & Table */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* Sidebar bộ lọc bên trái */}
        <ProductFilterSidebar
          state={filterSidebarState}
          onChange={(patch) => setFilterSidebarState((prev) => ({ ...prev, ...patch }))}
          onCreateCategory={() => { setNewCategoryName(''); setNewCategoryDesc(''); setIsQuickCategoryModalOpen(true); }}
          onCreateLocation={() => { setNewLocationName(''); setNewLocationDesc(''); setIsQuickLocationModalOpen(true); }}
          categoriesList={categoriesList}
          categoryCounts={categoryCounts}
          suppliersList={suppliersList}
          locationsList={locationsList}
          isCollapsed={isFilterSidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
          onResetFilters={handleResetSidebarFilters}
        />

        {/* Data Table Workspace */}
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden bg-white">

          {/* Action Bar khi chọn ít nhất 1 dòng */}
          {selectedItemIds.length > 0 && (
            <div className="h-10 px-4 bg-[#e6f1fe] border-b border-blue-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-[#0070f4]">
                  Đã chọn {selectedItemIds.length} hàng hóa
                </span>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs text-[#677484] hover:text-[#15171a] underline cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkExportExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
                  title="Xuất file Excel"
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  <span>Xuất file</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkPrintBarcode}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
                  title="In tem mã"
                >
                  <Printer size={13} className="text-slate-600" />
                  <span>In tem mã</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const first = goods.find((g) => selectedItemIds.includes(g.id));
                    if (first) handleOpenInboundModal(first);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
                  title="Nhập hàng"
                >
                  <ArrowDownToLine size={13} className="text-[#0070f4]" />
                  <span>Nhập hàng</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-semibold text-rose-600 transition cursor-pointer shadow-2xs"
                  title="Xóa đã chọn"
                >
                  <Trash2 size={13} />
                  <span>Xóa đã chọn</span>
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="bg-[#f7f8f9] sticky top-0 z-20 border-b border-slate-200 text-[11px] font-bold text-[#677484] uppercase tracking-wider shadow-xs">
                <tr>
                  {/* 1. Tích ô vuông Header (Checkbox All / Indeterminate) */}
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-3 w-10 text-center select-none border-b border-slate-200">
                    {selectedItemIds.length > 0 && selectedItemIds.length < filteredGoods.length ? (
                      <div
                        onClick={handleToggleSelectAll}
                        className="w-4 h-4 rounded bg-[#0070f4] border border-[#0070f4] text-white mx-auto cursor-pointer flex items-center justify-center shadow-2xs transition"
                        title="Bỏ chọn tất cả"
                      >
                        <Minus size={12} strokeWidth={3} />
                      </div>
                    ) : selectedItemIds.length > 0 && selectedItemIds.length === filteredGoods.length ? (
                      <div
                        onClick={handleToggleSelectAll}
                        className="w-4 h-4 rounded bg-[#0070f4] border border-[#0070f4] text-white mx-auto cursor-pointer flex items-center justify-center shadow-2xs transition"
                        title="Bỏ chọn tất cả"
                      >
                        <Check size={12} strokeWidth={3} />
                      </div>
                    ) : (
                      <div
                        onClick={handleToggleSelectAll}
                        className="w-4 h-4 rounded border border-slate-300 hover:border-[#0070f4] bg-white mx-auto cursor-pointer transition"
                        title="Chọn tất cả"
                      />
                    )}
                  </th>

                  {/* 2. Dấu sao Header (☆ ▾) - Filter / Toggle Starred items */}
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-2 w-10 text-center select-none border-b border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter(categoryFilter === 'STARRED' ? 'ALL' : 'STARRED');
                      }}
                      className="inline-flex items-center gap-0.5 text-[#677484] hover:text-amber-500 transition cursor-pointer p-0.5 rounded"
                      title={categoryFilter === 'STARRED' ? "Hiển thị tất cả hàng hóa" : "Chỉ lọc hàng hóa đã đánh dấu sao quan tâm"}
                    >
                      <Star
                        size={14}
                        className={categoryFilter === 'STARRED' ? "text-amber-500 fill-amber-400" : "text-[#677484] hover:text-amber-400"}
                      />
                      <ChevronDown size={11} className={categoryFilter === 'STARRED' ? "text-amber-600" : "text-[#677484]"} />
                    </button>
                  </th>

                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-2 w-12 text-center border-b border-slate-200" title="Hình ảnh sản phẩm"></th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-4 min-w-[200px] border-b border-slate-200">MÃ HÀNG</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-4 min-w-[240px] border-b border-slate-200">TÊN HÀNG</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-4 text-right min-w-[120px] border-b border-slate-200">GIÁ BÁN</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-4 text-right min-w-[120px] border-b border-slate-200">GIÁ VỐN</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-4 text-right min-w-[110px] border-b border-slate-200">TỒN KHO</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-4 text-right min-w-[90px] border-b border-slate-200">KHÁCH ĐẶT</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-4 min-w-[130px] border-b border-slate-200">THỜI GIAN TẠO</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-4 text-center min-w-[110px] border-b border-slate-200">DỰ KIẾN HẾT</th>
                  <th className="sticky top-0 z-20 bg-[#f7f8f9] py-2.5 px-4 text-center min-w-[90px] border-b border-slate-200">THAO TÁC</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredGoods.map((item) => {
                const isExpanded = expandedRowId === item.id;
                const isSelected = selectedItemIds.includes(item.id);
                const hasVariants = item.variants && item.variants.length > 0;
                const variantCount = hasVariants ? item.variants!.length : 0;
                const itemStock = getProductStockForWarehouse(item, warehouseFilter);
                const isOutOfStock = itemStock.actual <= 0;
                const isLowStock = !isOutOfStock && itemStock.minSafe > 0 && itemStock.actual < itemStock.minSafe;

                return (
                  <React.Fragment key={item.id}>
                    {/* Dòng Hàng Hóa Chính */}
                    <tr
                      className={`hover:bg-blue-50/40 transition cursor-pointer select-none ${
                        isSelected ? 'bg-blue-50/50 hover:bg-blue-50/70 border-l-2 border-l-blue-600' : ''
                      } ${
                        isExpanded ? 'bg-blue-50/25 border-b border-blue-200/60' : ''
                      } ${
                        isLowStock ? 'bg-amber-50/30 hover:bg-amber-50/50' : isOutOfStock ? 'bg-rose-50/20 hover:bg-rose-50/40' : ''
                      }`}
                      onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                    >
                      {/* Checkbox dòng */}
                      <td className="py-3 px-3 text-center" onClick={(e) => handleToggleSelectItem(item.id, e)}>
                        {isSelected ? (
                          <div className="w-4 h-4 rounded bg-blue-600 border border-blue-600 text-white mx-auto cursor-pointer flex items-center justify-center shadow-2xs">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border border-slate-300 hover:border-blue-500 bg-white mx-auto cursor-pointer transition" />
                        )}
                      </td>

                      {/* Icon Ngôi sao / Bookmark vàng */}
                      <td className="py-3 px-2 text-center" onClick={(e) => handleToggleStar(item.id, e)}>
                        <button
                          type="button"
                          title={item.isStarred ? "Bỏ đánh dấu sao quan tâm" : "Đánh dấu sao quan tâm / yêu thích"}
                          className="p-1 rounded hover:bg-amber-50/80 transition cursor-pointer"
                        >
                          <Star
                            size={16}
                            className={
                              item.isStarred
                                ? "text-amber-500 fill-amber-400 hover:text-amber-600 transition scale-110 drop-shadow-xs"
                                : "text-slate-300 hover:text-amber-400 transition"
                            }
                          />
                        </button>
                      </td>

                      {/* Ảnh Thumbnail Nhỏ Cạnh Tên / Mã Hàng (Chuẩn 100% Ảnh Chụp StockFlow) */}
                      <td
                        className="py-2.5 px-2 text-center w-12 relative"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          className="relative inline-flex items-center justify-center group"
                          onMouseEnter={() => setHoveredImageId(item.id)}
                          onMouseLeave={() => setHoveredImageId(null)}
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-9 h-9 object-cover rounded-lg border border-slate-200 shadow-2xs group-hover:border-blue-500 group-hover:ring-2 group-hover:ring-blue-100 transition cursor-pointer bg-white"
                              onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                            />
                          ) : (
                            <div
                              onClick={() => setExpandedRowId(isExpanded ? null : item.id)}
                              className="w-9 h-9 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200/80 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-300 transition cursor-pointer"
                              title="Click xem chi tiết"
                            >
                              <ImageIcon size={16} />
                            </div>
                          )}

                          {/* Popup Phóng To Ảnh Khi Rê Chuột (Chuẩn 100% Ảnh chụp của người dùng) */}
                          {hoveredImageId === item.id && item.imageUrl && (
                            <div className="absolute left-11 top-1/2 -translate-y-1/2 z-50 p-2 bg-white rounded-2xl shadow-2xl border border-slate-200/90 pointer-events-none animate-in fade-in zoom-in-95 duration-150 flex flex-col items-center min-w-[150px]">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-36 h-36 object-cover rounded-xl shadow-inner bg-slate-50"
                              />
                              <div className="mt-1.5 text-[11px] font-bold text-slate-800 truncate max-w-[144px] text-center">
                                {item.name}
                              </div>
                              <div className="text-[10px] text-blue-600 font-mono font-bold">
                                {item.code}
                              </div>
                            </div>
                          )}
                        </div>
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
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {item.standardPrice > 0 ? `${item.standardPrice.toLocaleString('vi-VN')}` : '---'}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingPriceBookItem(item);
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-0.5 mt-0.5 cursor-pointer font-medium"
                          title="Xem các bảng giá khác của sản phẩm này"
                        >
                          <span>Thiết lập giá</span>
                        </button>
                      </td>

                      {/* Giá Vốn */}
                      <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                        {canViewCostPrice ? (
                          (itemStock.costPrice || 0) > 0 ? (
                            `${itemStock.costPrice.toLocaleString('vi-VN')}`
                          ) : (
                            '0'
                          )
                        ) : (
                          <span className="text-slate-300 italic">Bảo mật</span>
                        )}
                      </td>

                      {/* Tồn Kho */}
                      <td className="py-3 px-4 text-right">
                        <div>
                          <div className="flex items-center justify-end gap-1">
                            {isOutOfStock ? (
                              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Đã hết hàng" />
                            ) : isLowStock ? (
                              <span title="Tồn kho dưới định mức an toàn">
                                <AlertTriangle size={12} className="text-amber-500 shrink-0 animate-pulse" />
                              </span>
                            ) : null}
                            <span
                              className={`font-mono font-extrabold text-xs ${
                                isOutOfStock
                                  ? 'text-rose-600'
                                  : isLowStock
                                  ? 'text-amber-600'
                                  : itemStock.actual > 0
                                  ? 'text-slate-900'
                                  : 'text-slate-400'
                              }`}
                            >
                              {itemStock.actual.toLocaleString('vi-VN')}
                            </span>
                          </div>

                          {isOutOfStock ? (
                            <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-bold">
                              <span>Hết hàng</span>
                            </div>
                          ) : isLowStock ? (
                            <div className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-800 text-[10px] font-bold shadow-2xs">
                              <span>Tồn thấp ({itemStock.actual}/{itemStock.minSafe})</span>
                            </div>
                          ) : (
                            <div
                              className={`text-[10px] font-medium truncate max-w-[130px] ml-auto ${
                                itemStock.actual > 0 ? 'text-blue-600 font-bold' : 'text-slate-400'
                              }`}
                              title={`Tồn kho thực tế tại ${warehouseFilter}`}
                            >
                              tại {warehouseFilter.replace(/^Kho\s*/i, '')}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Khách Đặt */}
                      <td className="py-3 px-4 text-right font-mono text-xs">
                        {itemStock.reserved > 0 ? (
                          <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {itemStock.reserved.toLocaleString('vi-VN')}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>

                      {/* Thời Gian Tạo (Thời gian thực chuẩn) */}
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {getItemCreatedTime(item)}
                      </td>

                      {/* Dự Kiến Hết Hàng */}
                      <td className="py-3 px-4 text-center text-xs">
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px] bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <AlertTriangle size={11} /> Hết hàng
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1 text-amber-700 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Clock size={11} /> Cần nhập gấp
                          </span>
                        ) : (
                          <span className="text-slate-400">---</span>
                        )}
                      </td>

                      {/* Thao Tác Nhanh */}
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            title="Chỉnh sửa hàng hóa"
                            className="p-1 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition cursor-pointer"
                          >
                            <Edit2 size={13} />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              title={itemStock.reserved > 0 ? "Sản phẩm có đơn đặt hàng (chỉ cho phép ngừng kinh doanh)" : "Xóa hàng hóa"}
                              className={`p-1 rounded-md transition cursor-pointer ${
                                itemStock.reserved > 0
                                  ? 'hover:bg-amber-50 text-slate-400 hover:text-amber-600'
                                  : 'hover:bg-rose-50 text-slate-400 hover:text-rose-600'
                              }`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* DÒNG EXPAND CHI TIẾT SẢN PHẨM & MA TRẬN BIẾN THỂ (ẢNH 5 StockFlow) */}
                    {isExpanded && (
                      <tr className="bg-slate-50/60 border-b border-slate-200">
                        <td colSpan={12} className="p-0">
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
                                onClick={() => setExpandedTab('stockByWh')}
                                className={`pb-2 -mb-2 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                                  expandedTab === 'stockByWh'
                                    ? 'border-blue-600 text-blue-600 font-bold'
                                    : 'border-transparent hover:text-slate-900'
                                }`}
                              >
                                <Warehouse size={13} />
                                <span>Tồn kho / Thẻ kho</span>
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
                                        onClick={() => setAnalyticsItem(item)}
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
                                        <div className="text-[11px] text-slate-400">
                                          Tồn tại {warehouseFilter.replace(/^Kho\s*/i, '')}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className={`font-mono font-extrabold text-sm ${itemStock.actual > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                                            {itemStock.actual.toLocaleString('vi-VN')}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-medium" title="Tổng tồn trên toàn bộ các kho">
                                            (Tổng: {item.stockQuantity})
                                          </span>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-[11px] text-slate-400">Định mức tồn</div>
                                        <div className="font-mono text-slate-700 mt-0.5">{item.minSafeStock} - {item.maxSafeStock.toLocaleString('vi-VN')}</div>
                                      </div>

                                      <div>
                                        <div className="text-[11px] text-slate-400">
                                          Giá vốn tại {warehouseFilter.replace(/^Kho\s*/i, '')}
                                        </div>
                                        <div className="font-mono font-semibold text-slate-800 mt-0.5">
                                          {canViewCostPrice ? `${(itemStock.costPrice || 0).toLocaleString('vi-VN')} đ` : '***'}
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

                                    {/* Khối Nhà cung cấp chuẩn theo ảnh thiết kế người dùng yêu cầu (Ảnh 1) */}
                                    <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                                      <div className="text-[11px] font-semibold text-slate-700">Nhà cung cấp</div>
                                      <div className="text-sm font-medium text-slate-800 mt-1">
                                        {item.supplier || 'xưởng sỉ'}
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
                                      onClick={() => handleOpenInboundModal(item, warehouseFilter)}
                                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition cursor-pointer shadow-2xs"
                                      title="Nhập thêm hàng hoặc cân chỉnh tồn kho tại chi nhánh"
                                    >
                                      <Plus size={13} className="text-emerald-700" />
                                      <span>Nhập kho / Cân chỉnh</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(item)}
                                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-xs font-semibold text-white transition cursor-pointer shadow-xs"
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

                            {/* Tab 4: TỒN KHO & THẺ KHO CHI TIẾT TỪNG CHI NHÁNH */}
                            {expandedTab === 'stockByWh' && (() => {
                              const standardFacilities = [
                                { code: 'K001', name: 'Kho Tổng Gia Lâm', address: 'Số 18 Đường Dệt May, Gia Lâm, Hà Nội' },
                                { code: 'K002', name: 'Kho Đông Anh', address: 'CCN Nguyên Khê, Đông Anh, Hà Nội' },
                                { code: 'K003', name: 'Kho Hà Đông', address: 'Km14 Quốc lộ 6, Yên Nghĩa, Hà Đông, Hà Nội' },
                                { code: 'K004', name: 'Kho Hoàn Kiếm', address: '42 Phố Trần Hưng Đạo, Hoàn Kiếm, Hà Nội' },
                              ];

                              const facList = (permittedFacilities.length >= 4 ? permittedFacilities : standardFacilities);

                              const stockRows = facList.map((fac) => {
                                const entry = item.stockByWarehouse?.find((w) => {
                                  const wName = (w.warehouseName || '').trim().toLowerCase();
                                  const wCode = (w.warehouseCode || '').trim().toLowerCase();
                                  const fName = (fac.name || '').trim().toLowerCase();
                                  const fCode = (fac.code || '').trim().toLowerCase();
                                  return (
                                    wName === fName ||
                                    wCode === fCode ||
                                    (fName.includes('gia lâm') && (wName.includes('gia lâm') || wCode === 'k001')) ||
                                    (fName.includes('đông anh') && (wName.includes('đông anh') || wCode === 'k002')) ||
                                    (fName.includes('hà đông') && (wName.includes('hà đông') || wCode === 'k003')) ||
                                    (fName.includes('hoàn kiếm') && (wName.includes('hoàn kiếm') || wCode === 'k004'))
                                  );
                                });

                                const actual = entry ? Number(entry.actualStock) || 0 : 0;
                                const available = entry ? Number(entry.availableStock) || 0 : 0;
                                const costPrice = entry?.costPrice !== undefined ? Number(entry.costPrice) || 0 : (item.costPrice || 0);
                                const isCurrentFilter = warehouseFilter.toLowerCase().includes(fac.name.toLowerCase()) ||
                                  fac.name.toLowerCase().includes(warehouseFilter.toLowerCase()) ||
                                  warehouseFilter.toUpperCase() === fac.code.toUpperCase();

                                return {
                                  ...fac,
                                  actual,
                                  available,
                                  costPrice,
                                  isCurrentFilter,
                                };
                              });

                              const totalActual = stockRows.reduce((sum, r) => sum + r.actual, 0);
                              const totalAvailable = stockRows.reduce((sum, r) => sum + r.available, 0);
                              const totalValue = stockRows.reduce((sum, r) => sum + r.actual * r.costPrice, 0);
                              const currentStockRow = stockRows.find((r) => r.isCurrentFilter) || stockRows[0];

                              return (
                                <div className="space-y-4">
                                  {/* 1. Header Banner */}
                                  <div className="p-3.5 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex items-center gap-3">
                                      <div className="w-9 h-9 rounded-lg bg-[#0071BA] text-white flex items-center justify-center shrink-0 shadow-xs">
                                        <Warehouse size={18} />
                                      </div>
                                      <div>
                                        <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                                          <span>Tổng tồn toàn hệ thống:</span>
                                          <span className="font-mono text-base font-extrabold text-[#0071BA]">
                                            {totalActual.toLocaleString('vi-VN')} {item.uom}
                                          </span>
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                          Chi nhánh đang kích hoạt: <strong className="text-blue-700">{currentStockRow.name}</strong> (Tồn kho: <strong className="font-mono text-slate-800">{currentStockRow.actual.toLocaleString('vi-VN')} {item.uom}</strong>)
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenInboundModal(item, warehouseFilter)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0071BA] hover:bg-[#005f9d] text-white font-semibold text-xs transition cursor-pointer shadow-2xs"
                                      >
                                        <Plus size={14} />
                                        <span>Nhập thêm hàng vào chi nhánh</span>
                                      </button>
                                    </div>
                                  </div>

                                  {/* 2. BẢNG TỒN KHO CHI TIẾT TỪNG CHI NHÁNH (Chuẩn StockFlow Requirement 5.2) */}
                                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                          Chi tiết tồn kho tại các cơ sở chi nhánh
                                        </span>
                                        <span className="text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-semibold border border-blue-200">
                                          {stockRows.length} cơ sở kho
                                        </span>
                                      </div>
                                      <div className="text-[11px] text-slate-400">
                                        Đơn vị tính: <strong className="text-slate-700">{item.uom}</strong>
                                      </div>
                                    </div>

                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                          <th className="py-2.5 px-4 min-w-[200px]">Cơ sở chi nhánh</th>
                                          <th className="py-2.5 px-3 w-24">Mã kho</th>
                                          <th className="py-2.5 px-4 text-right min-w-[120px]">Tồn thực tế</th>
                                          <th className="py-2.5 px-4 text-right min-w-[120px]">Khả dụng</th>
                                          {canViewCostPrice && (
                                            <>
                                              <th className="py-2.5 px-4 text-right min-w-[120px]">Giá vốn BQ</th>
                                              <th className="py-2.5 px-4 text-right min-w-[140px]">Giá trị tồn kho</th>
                                            </>
                                          )}
                                          <th className="py-2.5 px-4 text-center w-28">Trạng thái</th>
                                          <th className="py-2.5 px-4 text-center w-36">Thao tác</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100">
                                        {stockRows.map((r) => {
                                          const isOutOfStock = r.actual <= 0;
                                          return (
                                            <tr
                                              key={r.code}
                                              className={`transition ${
                                                r.isCurrentFilter
                                                  ? 'bg-blue-50/40 font-medium'
                                                  : 'hover:bg-slate-50/70'
                                              }`}
                                            >
                                              <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                  <Store size={14} className={r.isCurrentFilter ? 'text-[#0071BA]' : 'text-slate-400'} />
                                                  <div>
                                                    <span className={`font-bold ${r.isCurrentFilter ? 'text-[#0071BA]' : 'text-slate-800'}`}>
                                                      {r.name}
                                                    </span>
                                                    {r.isCurrentFilter && (
                                                      <span className="ml-2 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-[#0071BA]">
                                                        Đang chọn
                                                      </span>
                                                    )}
                                                    <div className="text-[10px] text-slate-400 truncate max-w-xs">{r.address}</div>
                                                  </div>
                                                </div>
                                              </td>
                                              <td className="py-3 px-3">
                                                <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                                  {r.code}
                                                </span>
                                              </td>
                                              <td className="py-3 px-4 text-right">
                                                <span className={`font-mono text-sm font-extrabold ${isOutOfStock ? 'text-slate-400' : 'text-slate-900'}`}>
                                                  {r.actual.toLocaleString('vi-VN')}
                                                </span>{' '}
                                                <span className="text-[11px] text-slate-400">{item.uom}</span>
                                              </td>
                                              <td className="py-3 px-4 text-right">
                                                <span className="font-mono text-xs font-semibold text-slate-600">
                                                  {r.available.toLocaleString('vi-VN')}
                                                </span>{' '}
                                                <span className="text-[11px] text-slate-400">{item.uom}</span>
                                              </td>
                                              {canViewCostPrice && (
                                                <>
                                                  <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                                                    {r.costPrice > 0 ? `${r.costPrice.toLocaleString('vi-VN')} đ` : '---'}
                                                  </td>
                                                  <td className="py-3 px-4 text-right font-mono text-xs font-bold text-slate-800">
                                                    {(r.actual * r.costPrice) > 0 ? `${(r.actual * r.costPrice).toLocaleString('vi-VN')} đ` : '0 đ'}
                                                  </td>
                                                </>
                                              )}
                                              <td className="py-3 px-4 text-center">
                                                <span
                                                  className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    r.actual > 0
                                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                      : 'bg-rose-50 text-rose-600 border border-rose-200'
                                                  }`}
                                                >
                                                  {r.actual > 0 ? 'Còn hàng' : 'Hết hàng'}
                                                </span>
                                              </td>
                                              <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-center gap-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={() => handleWarehouseFilterChange(r.name)}
                                                    className={`px-2 py-1 rounded text-[11px] font-semibold transition cursor-pointer ${
                                                      r.isCurrentFilter
                                                        ? 'bg-blue-600 text-white shadow-2xs'
                                                        : 'bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700'
                                                    }`}
                                                    title={`Đổi kho active sang ${r.name}`}
                                                  >
                                                    {r.isCurrentFilter ? 'Đang kích hoạt' : 'Chọn kho'}
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={() => handleOpenInboundModal(item, r.name)}
                                                    className="p-1 rounded bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition cursor-pointer"
                                                    title={`Nhập hàng vào ${r.name}`}
                                                  >
                                                    <Plus size={13} />
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                      <tfoot>
                                        <tr className="bg-blue-50/60 font-bold border-t-2 border-blue-200 text-xs">
                                          <td colSpan={2} className="py-3 px-4 text-blue-950 font-bold uppercase tracking-wider">
                                            Tổng tồn toàn hệ thống
                                          </td>
                                          <td className="py-3 px-4 text-right font-mono text-sm font-extrabold text-[#0071BA]">
                                            {totalActual.toLocaleString('vi-VN')} {item.uom}
                                          </td>
                                          <td className="py-3 px-4 text-right font-mono text-xs font-bold text-slate-800">
                                            {totalAvailable.toLocaleString('vi-VN')} {item.uom}
                                          </td>
                                          {canViewCostPrice && (
                                            <>
                                              <td className="py-3 px-4 text-right text-slate-400 text-[11px]">
                                                Bình quân
                                              </td>
                                              <td className="py-3 px-4 text-right font-mono text-xs font-extrabold text-blue-900">
                                                {totalValue.toLocaleString('vi-VN')} đ
                                              </td>
                                            </>
                                          )}
                                          <td colSpan={2} className="py-3 px-4 text-right text-[11px] text-slate-500 font-normal">
                                            Tất cả {stockRows.length} chi nhánh
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>

                                  {/* 3. LỊCH SỬ BIẾN ĐỘNG THẺ KHO GẦN ĐÂY CỦA SẢN PHẨM */}
                                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <Clock size={14} className="text-slate-500" />
                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                          Nhật ký thẻ kho gần đây
                                        </span>
                                      </div>
                                      <span className="text-[11px] text-slate-400">
                                        Hiển thị {item.stockCardRecent.length} giao dịch phát sinh gần nhất
                                      </span>
                                    </div>
                                    {item.stockCardRecent.length > 0 ? (
                                      <table className="w-full text-left border-collapse text-xs">
                                        <thead>
                                          <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase">
                                            <th className="py-2.5 px-4 w-36">Thời gian</th>
                                            <th className="py-2.5 px-3 w-32">Mã chứng từ</th>
                                            <th className="py-2.5 px-4">Loại giao dịch</th>
                                            <th className="py-2.5 px-4 text-right w-28">Biến động</th>
                                            <th className="py-2.5 px-4 text-right w-28">Tồn sau GD</th>
                                            <th className="py-2.5 px-4">Đối tác / Kho liên quan</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {item.stockCardRecent.map((sc, scIdx) => (
                                            <tr key={scIdx} className="hover:bg-slate-50/80">
                                              <td className="py-2.5 px-4 text-slate-500">{sc.date}</td>
                                              <td className="py-2.5 px-3 font-mono font-bold text-[#0071BA]">{sc.docCode}</td>
                                              <td className="py-2.5 px-4 text-slate-700 font-medium">{sc.typeName}</td>
                                              <td className={`py-2.5 px-4 text-right font-mono font-bold ${sc.qtyChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {sc.qtyChange > 0 ? `+${sc.qtyChange}` : sc.qtyChange} {item.uom}
                                              </td>
                                              <td className="py-2.5 px-4 text-right font-mono font-extrabold text-slate-900">{sc.balance} {item.uom}</td>
                                              <td className="py-2.5 px-4 text-slate-600">{sc.partnerOrDept}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    ) : (
                                      <div className="py-6 text-center text-slate-400 text-xs">
                                        Chưa phát sinh giao dịch nhập / xuất kho cho mặt hàng này.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

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
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-xs font-semibold text-white transition cursor-pointer"
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

              {filteredGoods.length === 0 && (
                <tr>
                  <td colSpan={12} className="py-24 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-[#e6f1fe] text-[#0070f4] flex items-center justify-center mb-3">
                        <Inbox size={32} className="stroke-[1.5]" />
                      </div>
                      <h3 className="font-bold text-[#15171a] text-sm mb-1">
                        Không tìm thấy hàng hóa phù hợp
                      </h3>
                      <p className="text-xs text-[#677484] max-w-sm mb-3">
                        Vui lòng thay đổi từ khóa tìm kiếm hoặc đặt lại các bộ lọc.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          handleResetSidebarFilters();
                          setCategoryFilter('ALL');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white text-xs font-semibold transition cursor-pointer shadow-xs"
                      >
                        <RotateCcw size={13} />
                        <span>Đặt lại bộ lọc</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Bar */}
        <footer className="h-10 bg-white border-t border-slate-200 px-4 flex items-center justify-between text-[12px] text-[#677484] shrink-0">
          <div>
            Hiển thị <strong className="text-[#15171a] font-bold">{filteredGoods.length}</strong> trên{' '}
            <strong className="text-[#15171a] font-bold">{goods.length}</strong> hàng hóa
          </div>
          {selectedItemIds.length > 0 && (
            <span className="text-[#0070f4] font-medium">(Đã chọn {selectedItemIds.length})</span>
          )}
        </footer>
      </div>
    </div>

      {/* 5. MODAL 1: TẠO HÀNG HÓA MỚI / CHỈNH SỬA (CHÍNH XÁC THEO ẢNH 1) */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl relative max-h-[92vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900">
                  {modalMode === 'edit' ? 'Chỉnh sửa hàng hóa' : 'Tạo hàng hóa'}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                  📍 {formWarehouse || warehouseFilter}
                </span>
              </div>
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
            <div className="p-6 pb-36 overflow-y-auto space-y-5 text-xs flex-1">
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
                            className={`w-full h-9 px-3 rounded-lg border text-xs placeholder-slate-400 focus:outline-none focus:bg-white font-mono uppercase transition ${
                              isProductCodeDuplicate
                                ? 'border-rose-400 text-rose-700 focus:border-rose-500 bg-rose-50/20'
                                : 'border-slate-200 text-slate-800 focus:border-blue-500 bg-slate-50'
                            }`}
                          />
                          <p className="text-[10px] text-slate-400 mt-1">
                            {isProductCodeDuplicate ? (
                              <span className="text-rose-500 font-semibold">Mã hàng hóa đã tồn tại trong hệ thống, vui lòng chọn mã khác</span>
                            ) : (
                              'Để trống hệ thống sẽ tự động tạo mã'
                            )}
                          </p>
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

                      {/* Nhóm hàng & Thương hiệu Chuẩn KiotViet (Ảnh 2) */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <KiotSelectWithSearch
                            label="Nhóm hàng"
                            required
                            onCreateNew={() => {
                              setNewCategoryName('');
                              setNewCategoryDesc('');
                              setNewCategoryParent('');
                              setIsQuickCategoryModalOpen(true);
                            }}
                            createButtonText="Tạo mới"
                            value={formSubCategory}
                            onChange={(val) => {
                              setFormSubCategory(val);
                              setFormCategory(val as any);
                            }}
                            options={categoriesList}
                            placeholder="Chọn nhóm hàng (Bắt buộc)"
                            searchPlaceholder="Tìm kiếm nhóm hàng..."
                            allowClear={true}
                            onQuickCreate={handleQuickCreateCategoryDirect}
                          />
                        </div>

                        <div>
                          <KiotSelectWithSearch
                            label="Thương hiệu"
                            onCreateNew={() => {
                              setNewBrandName('');
                              setIsQuickBrandModalOpen(true);
                            }}
                            createButtonText="Tạo mới"
                            value={formBrand}
                            onChange={setFormBrand}
                            options={brandsList}
                            placeholder="Chọn thương hiệu"
                            searchPlaceholder="Tìm kiếm thương hiệu..."
                            allowClear={true}
                            onQuickCreate={handleQuickCreateBrandDirect}
                          />
                        </div>
                      </div>

                      {/* Đơn vị tính cơ bản & Nhà cung cấp */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Đơn vị tính cơ bản <span className="text-red-500">*</span>
                            </label>
                          </div>
                          <CustomCombobox
                            value={formUom}
                            onChange={(val) => {
                              setFormUom(val);
                              setFormUnits((prev) =>
                                prev.map((u) => (u.isBase ? { ...u, name: val } : u))
                              );
                            }}
                            options={DEFAULT_UOM_OPTIONS}
                            placeholder="Nhập hoặc chọn ĐVT (VD: Hộp, Tấm, Kg, Cái...)"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-slate-700">
                              Nhà cung cấp
                            </label>
                          </div>
                          <CustomCombobox
                            value={formSupplier}
                            onChange={setFormSupplier}
                            options={suppliersList}
                            placeholder="Nhập hoặc chọn NCC (VD: xưởng sỉ)..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cột Phải: Khung Upload Ảnh từ Máy Tính (Chuẩn Ảnh 1 StockFlow) */}
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

                      {/* 3 Thumbnails Nhỏ bên cạnh (Ảnh 1 StockFlow) */}
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

                  {/* Accordion 1: Giá vốn, giá bán (Ảnh 1 - Hỗ trợ overflow-visible để dropdown nổi hoàn toàn) */}
                  <div className={`border border-slate-200 rounded-xl shadow-2xs ${priceAccordionOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
                    <button
                      type="button"
                      onClick={() => setPriceAccordionOpen(!priceAccordionOpen)}
                      className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer select-none"
                    >
                      <span>Giá vốn, giá bán</span>
                      {priceAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {priceAccordionOpen && (
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white border-t border-slate-100 overflow-visible">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Giá vốn tại {formWarehouse || warehouseFilter} (VNĐ)
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNumberWithCommas(formCostPrice)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              setFormCostPrice(raw === '' ? '' : Number(raw));
                            }}
                            onBlur={() => {
                              if (formCostPrice === '') setFormCostPrice(0);
                            }}
                            placeholder="0"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="font-semibold text-slate-700">Giá bán (VNĐ)</label>
                            <button
                              type="button"
                              onClick={() => {
                                setViewingPriceBookItem(editingItem || ({
                                  id: 'temp',
                                  name: formName || 'Sản phẩm mới',
                                  code: formCode,
                                  standardPrice: Number(formStandardPrice) || 0,
                                  costPrice: Number(formCostPrice) || 0,
                                  uom: formUom || 'Cái',
                                } as any));
                              }}
                              className="text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 font-medium text-[11px] cursor-pointer"
                            >
                              <RefreshCw size={11} />
                              <span>Thiết lập giá</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNumberWithCommas(formStandardPrice)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              setFormStandardPrice(raw === '' ? '' : Number(raw));
                            }}
                            onBlur={() => {
                              if (formStandardPrice === '') setFormStandardPrice(0);
                            }}
                            placeholder="0"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono font-bold text-blue-700 text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Tồn kho (Ảnh 1) */}
                  <div className={`border border-slate-200 rounded-xl shadow-2xs ${stockAccordionOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
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
                      <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border-t border-slate-100 overflow-visible">
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Tồn kho tại {formWarehouse || warehouseFilter}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={formatNumberWithCommas(formStockQuantity)}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                handleStockQuantityChange(raw === '' ? '' : Number(raw));
                              }}
                              onBlur={() => {
                                if (formStockQuantity === '') handleStockQuantityChange(0);
                              }}
                              placeholder="0"
                              className="w-full h-9 pl-3 pr-8 rounded-lg border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:outline-none focus:border-blue-500"
                            />
                            <Warehouse size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Định mức tồn thấp nhất</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNumberWithCommas(formMinSafe)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              setFormMinSafe(raw === '' ? '' : Number(raw));
                            }}
                            onBlur={() => {
                              if (formMinSafe === '') setFormMinSafe(0);
                            }}
                            placeholder="0"
                            className="w-full h-9 px-3 rounded-lg border border-slate-200 font-mono text-xs focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">Định mức tồn cao nhất</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={formatNumberWithCommas(formMaxSafe)}
                            onChange={(e) => {
                              const raw = e.target.value.replace(/\D/g, '');
                              setFormMaxSafe(raw === '' ? '' : Number(raw));
                            }}
                            onBlur={() => {
                              if (formMaxSafe === '') setFormMaxSafe(999999999);
                            }}
                            placeholder="999,999,999"
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

                  {/* Accordion 3: Vị trí, trọng lượng, kích thước (Ảnh 1 - Hỗ trợ overflow-visible để dropdown nổi hoàn toàn) */}
                  <div className={`border border-slate-200 rounded-xl shadow-2xs ${specAccordionOpen ? 'overflow-visible' : 'overflow-hidden'}`}>
                    <button
                      type="button"
                      onClick={() => setSpecAccordionOpen(!specAccordionOpen)}
                      className="w-full px-4 py-3 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-800 cursor-pointer select-none"
                    >
                      <div className="text-left">
                        <div>Vị trí, trọng lượng</div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          Quản lý việc sắp xếp kho, vị trí bán hàng hoặc trọng lượng hàng hóa
                        </div>
                      </div>
                      {specAccordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {specAccordionOpen && (
                      <div className="p-4 space-y-3 bg-white border-t border-slate-100 overflow-visible">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <KiotSelectWithSearch
                              label="Vị trí"
                              onCreateNew={() => {
                                setNewLocationName('');
                                setNewLocationDesc('');
                                setIsQuickLocationModalOpen(true);
                              }}
                              createButtonText="Tạo mới"
                              value={formLocation}
                              onChange={setFormLocation}
                              options={locationsList}
                              placeholder="Chọn vị trí"
                              searchPlaceholder="Tìm kiếm vị trí..."
                              allowClear={true}
                              onQuickCreate={handleQuickCreateLocationDirect}
                            />
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">Trọng lượng</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumberWithCommas(formWeight)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, '');
                                  setFormWeight(raw === '' ? '' : Number(raw));
                                }}
                                onBlur={() => {
                                  if (formWeight === '') setFormWeight(0);
                                }}
                                placeholder="0"
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
                <div className="space-y-4">
                  <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-800 text-xs">
                        Phân bổ số lượng tồn kho theo từng chi nhánh kho
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Mặt hàng sẽ có mặt ở tất cả các kho. Bạn có thể nhập tồn kho ban đầu riêng cho từng cơ sở.
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-slate-400 font-medium">Tổng tồn các kho:</div>
                      <div className="font-mono font-extrabold text-blue-700 text-sm">
                        {(permittedFacilities.length > 0 ? permittedFacilities : facilities).reduce((sum, f) => sum + (Number(formWarehouseStocks[f.name]) || 0), 0).toLocaleString('vi-VN')} {formUom}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {(permittedFacilities.length > 0
                      ? permittedFacilities
                      : (facilities.length > 0
                        ? facilities
                        : [
                            { code: 'K001', name: 'Kho Tổng Gia Lâm', address: 'Số 18 Đường Dệt May, Gia Lâm' },
                            { code: 'K002', name: 'Kho Đông Anh', address: 'CCN Nguyên Khê, Đông Anh' },
                          ])
                    ).map((fac) => {
                      const curQty = formWarehouseStocks[fac.name] ?? 0;
                      return (
                        <div
                          key={fac.code || fac.name}
                          className="p-3 rounded-xl border border-slate-200 bg-white hover:border-blue-300 transition flex items-center justify-between gap-4 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                              {fac.code ? fac.code.slice(0, 4) : 'KHO'}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-800 text-xs truncate">{fac.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {fac.address || 'Cơ sở kho hệ thống'}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] text-slate-500 font-medium">Tồn tại kho:</span>
                            <div className="relative w-28">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumberWithCommas(curQty)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, '');
                                  const val = raw === '' ? 0 : Number(raw);
                                  const updated = {
                                    ...formWarehouseStocks,
                                    [fac.name]: val,
                                  };
                                  setFormWarehouseStocks(updated);
                                  if (fac.name.trim().toLowerCase() === (formWarehouse || warehouseFilter).trim().toLowerCase()) {
                                    setFormStockQuantity(val);
                                  }
                                }}
                                className="w-full h-8 pl-2.5 pr-8 rounded-lg border border-slate-200 text-xs font-mono font-bold text-right focus:outline-none focus:border-blue-500"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                {formUom}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                  className="px-6 py-2 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-xs font-bold text-white transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw size={12} className="animate-spin" />}
                  <span>{isSaving ? 'Đang lưu CSDL...' : 'Lưu'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5b. MODAL XÁC NHẬN PHẠM VI ÁP DỤNG GIÁ VỐN (PHIÊN BẢN MỚI RỘNG RÃI & CHUYÊN NGHIỆP) */}
      {costConfirmModalOpen && (() => {
        const allFacilitiesList = permittedFacilities.length > 0
          ? permittedFacilities
          : (facilities.length > 0
            ? facilities
            : [
                { code: 'K001', name: 'Kho Tổng Gia Lâm', address: 'Số 18 Đường Dệt May, Gia Lâm' },
                { code: 'K002', name: 'Kho Đông Anh', address: 'CCN Nguyên Khê, Đông Anh' },
                { code: 'K003', name: 'Kho Ninh Bình', address: 'KCN Gián Khẩu, Ninh Bình' },
              ]);

        const filteredFacilities = allFacilitiesList.filter(
          (fac) =>
            fac.name.toLowerCase().includes(costBranchSearch.toLowerCase()) ||
            (fac.code && fac.code.toLowerCase().includes(costBranchSearch.toLowerCase()))
        );

        return (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-2xl flex flex-col my-auto animate-in zoom-in-95 duration-150">
              {/* Header Modal */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-linear-to-r from-blue-50/50 via-white to-slate-50/50 rounded-t-3xl">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-100/70 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/70 shadow-2xs">
                    <Building size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Xác nhận áp dụng Giá vốn
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Bạn muốn áp dụng giá vốn cho sản phẩm này trên phạm vi nào?
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCostConfirmModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 transition p-2 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Modal */}
              <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[70vh]">
                {/* 2 Thẻ tùy chọn lớn: Toàn hệ thống vs Tùy chọn chi nhánh */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Thẻ 1: Toàn hệ thống */}
                  <div
                    onClick={() => setCostScope('ALL')}
                    className={`p-4.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between gap-3 select-none ${
                      costScope === 'ALL'
                        ? 'border-blue-600 bg-blue-50/60 ring-4 ring-blue-500/10 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                        costScope === 'ALL' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Globe size={18} />
                      </div>
                      <input
                        type="radio"
                        name="costScopeRadio"
                        checked={costScope === 'ALL'}
                        onChange={() => setCostScope('ALL')}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer mt-1"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Toàn hệ thống</div>
                      <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Áp dụng mức giá vốn đồng bộ cho toàn bộ tất cả chi nhánh kho trong hệ thống
                      </div>
                    </div>
                  </div>

                  {/* Thẻ 2: Tùy chọn chi nhánh kho */}
                  <div
                    onClick={() => {
                      setCostScope('BRANCH');
                      if (costSelectedBranches.length === 0) {
                        setCostSelectedBranches([formWarehouse || warehouseFilter || 'Kho Tổng Gia Lâm']);
                      }
                    }}
                    className={`p-4.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between gap-3 select-none ${
                      costScope === 'BRANCH'
                        ? 'border-blue-600 bg-blue-50/60 ring-4 ring-blue-500/10 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                        costScope === 'BRANCH' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <Warehouse size={18} />
                      </div>
                      <input
                        type="radio"
                        name="costScopeRadio"
                        checked={costScope === 'BRANCH'}
                        onChange={() => {
                          setCostScope('BRANCH');
                          if (costSelectedBranches.length === 0) {
                            setCostSelectedBranches([formWarehouse || warehouseFilter || 'Kho Tổng Gia Lâm']);
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer mt-1"
                      />
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">Theo chi nhánh kho</div>
                      <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Chọn một hoặc nhiều kho riêng biệt để cập nhật giá vốn, các kho khác giữ nguyên
                      </div>
                    </div>
                  </div>
                </div>

                {/* Danh sách chọn kho khi chọn Chi nhánh: Rộng rãi, hiển thị dạng Grid 2 cột */}
                {costScope === 'BRANCH' && (
                  <div className="border border-slate-200 rounded-2xl p-4.5 bg-slate-50/60 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200/80">
                      {/* Ô tìm kiếm kho */}
                      <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          value={costBranchSearch}
                          onChange={(e) => setCostBranchSearch(e.target.value)}
                          placeholder="Tìm nhanh kho / chi nhánh..."
                          className="w-full h-8.5 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                        />
                        {costBranchSearch && (
                          <button
                            type="button"
                            onClick={() => setCostBranchSearch('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>

                      {/* Toolbar Thao tác nhanh */}
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-xs shadow-2xs">
                          Đã chọn: <b className="text-blue-600 font-bold">{costSelectedBranches.length}</b>/{allFacilitiesList.length} kho
                        </span>
                        <button
                          type="button"
                          onClick={() => setCostSelectedBranches(allFacilitiesList.map((f) => f.name))}
                          className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setCostSelectedBranches([])}
                          className="px-2 py-1 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    {/* Lưới các kho: 2 CỘT RỘNG RÃI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {filteredFacilities.map((fac) => {
                        const isChecked = costSelectedBranches.some(
                          (b) => b.trim().toLowerCase() === fac.name.trim().toLowerCase()
                        );
                        return (
                          <div
                            key={fac.code || fac.name}
                            onClick={() => {
                              if (isChecked) {
                                setCostSelectedBranches(
                                  costSelectedBranches.filter(
                                    (b) => b.trim().toLowerCase() !== fac.name.trim().toLowerCase()
                                  )
                                );
                              } else {
                                setCostSelectedBranches([...costSelectedBranches, fac.name]);
                              }
                            }}
                            className={`p-3 rounded-xl border-2 transition cursor-pointer flex items-center justify-between gap-3 select-none ${
                              isChecked
                                ? 'border-blue-500 bg-white ring-2 ring-blue-500/15 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition ${
                                  isChecked
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-slate-300 bg-white'
                                }`}
                              >
                                {isChecked && <Check size={13} strokeWidth={3} />}
                              </div>
                              <div className="min-w-0">
                                <div className={`text-xs truncate ${isChecked ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                  {fac.name}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">
                                  {fac.code || 'KHO'} {fac.address ? `• ${fac.address}` : ''}
                                </div>
                              </div>
                            </div>

                            {isChecked && (
                              <span className="shrink-0 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                Đã chọn
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {filteredFacilities.length === 0 && (
                      <div className="text-center py-6 text-slate-400 text-xs italic">
                        Không tìm thấy chi nhánh kho phù hợp với từ khóa &ldquo;{costBranchSearch}&rdquo;
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-between px-6 py-4 bg-slate-50/90 border-t border-slate-100 rounded-b-3xl">
                <div className="text-xs text-slate-500">
                  {costScope === 'ALL' ? (
                    <span>Phạm vi: <b className="text-slate-800">Toàn bộ chi nhánh trong hệ thống</b></span>
                  ) : (
                    <span>Phạm vi: <b className="text-blue-600">{costSelectedBranches.length} chi nhánh đã chọn</b></span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCostConfirmModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 transition cursor-pointer shadow-2xs"
                  >
                    Bỏ qua
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (costScope === 'BRANCH' && costSelectedBranches.length === 0) {
                        alert('Vui lòng chọn ít nhất 1 chi nhánh kho để áp dụng giá vốn!');
                        return;
                      }
                      executeSaveItem(costScope, costSelectedBranches, pendingKeepOpen);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white transition cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && <RefreshCw size={14} className="animate-spin" />}
                    <span>Đồng ý & Áp dụng</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
                                type="text"
                                inputMode="numeric"
                                value={formatNumberWithCommas(v.costPrice)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, '');
                                  handleUpdateVariantRow(v.id, 'costPrice', raw === '' ? 0 : Number(raw));
                                }}
                                className="w-full h-8 px-2 rounded border border-slate-200 text-xs font-mono"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatNumberWithCommas(v.salePrice)}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, '');
                                  handleUpdateVariantRow(v.id, 'salePrice', raw === '' ? 0 : Number(raw));
                                }}
                                className="w-full h-8 px-2 rounded border border-slate-200 text-xs font-mono font-bold text-blue-700"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <div className="relative">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={formatNumberWithCommas(v.stock)}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, '');
                                    handleUpdateVariantRow(v.id, 'stock', raw === '' ? 0 : Number(raw));
                                  }}
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
                className="px-6 py-2 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-xs font-bold text-white transition cursor-pointer shadow-xs"
              >
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Nhập hàng nhanh / Cân chỉnh tồn kho theo từng chi nhánh */}
      {inboundModalOpen && inboundItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <ArrowDownToLine size={17} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Nhập hàng / Cân chỉnh tồn kho</h3>
                  <p className="text-[11px] text-slate-500">Cập nhật số lượng tại chi nhánh được chỉ định</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInboundModalOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              {/* Thông tin mặt hàng */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="font-mono font-bold text-blue-700 text-xs">{inboundItem.code}</div>
                  <div className="font-bold text-slate-800 text-xs mt-0.5">{inboundItem.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Đơn vị tính: {inboundItem.uom}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Tổng tồn hệ thống:</div>
                  <div className="font-mono font-extrabold text-base text-slate-900">
                    {inboundItem.stockQuantity.toLocaleString('vi-VN')} {inboundItem.uom}
                  </div>
                </div>
              </div>

              {/* Chọn chi nhánh kho nhận hàng */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Chi nhánh kho nhận hàng / cân chỉnh <span className="text-rose-500">*</span>
                </label>
                {(permittedFacilities.length > 0 ? permittedFacilities : facilities).length <= 1 ? (
                  <div className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-blue-600">📍</span>
                      <span className="truncate">{(permittedFacilities[0] || facilities[0])?.name || inboundTargetWarehouse}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal shrink-0">(Kho làm việc cố định)</span>
                  </div>
                ) : (
                  <select
                    value={inboundTargetWarehouse}
                    onChange={(e) => setInboundTargetWarehouse(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white font-medium text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    {permittedFacilities.map((fac) => (
                      <option key={fac.code || fac.name} value={fac.name}>
                        📍 {fac.name} ({fac.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Hình thức: Nhập thêm hoặc Đặt lại số tồn */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Loại nghiệp vụ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInboundType('ADD')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      inboundType === 'ADD'
                        ? 'border-emerald-500 bg-emerald-50/60 text-emerald-900 font-bold shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Plus size={13} className="text-emerald-600" />
                      <span>Nhập thêm vào kho (+)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Cộng dồn thêm vào tồn kho hiện tại
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInboundType('SET')}
                    className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                      inboundType === 'SET'
                        ? 'border-blue-500 bg-blue-50/60 text-blue-900 font-bold shadow-2xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <RefreshCw size={13} className="text-blue-600" />
                      <span>Cân chỉnh lại số tồn (=)</span>
                    </div>
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Thiết lập lại số lượng kiểm kê thực tế
                    </div>
                  </button>
                </div>
              </div>

              {/* Số lượng */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  {inboundType === 'ADD' ? 'Số lượng nhập thêm' : 'Số lượng tồn thực tế sau kiểm kê'}{' '}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatNumberWithCommas(inboundQty)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setInboundQty(raw === '' ? '' : Number(raw));
                    }}
                    onBlur={() => {
                      if (inboundQty === '') setInboundQty(0);
                    }}
                    placeholder="Nhập số lượng..."
                    className="w-full h-9 pl-3 pr-12 rounded-lg border border-slate-200 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-xs">
                    {inboundItem.uom}
                  </span>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú chứng từ</label>
                <input
                  type="text"
                  value={inboundNote}
                  onChange={(e) => setInboundNote(e.target.value)}
                  placeholder="Ví dụ: Nhập bổ sung từ NCC, Kiểm kê kho định kỳ..."
                  className="w-full h-8 px-3 rounded-lg border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Khung tính toán xem trước */}
              {(() => {
                const curTargetEntry = inboundItem.stockByWarehouse?.find(
                  (w) => w.warehouseName.toLowerCase() === inboundTargetWarehouse.toLowerCase()
                );
                const currentBranchStock = curTargetEntry ? Number(curTargetEntry.actualStock) || 0 : 0;
                const num = parseCleanNumber(inboundQty);
                const newBranchStock = inboundType === 'ADD' ? currentBranchStock + num : num;
                const delta = inboundType === 'ADD' ? num : num - currentBranchStock;
                const newTotalStock = inboundItem.stockQuantity + delta;

                return (
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1.5 text-[11px]">
                    <div className="font-bold text-emerald-900 flex items-center justify-between">
                      <span>Tồn kho tại {inboundTargetWarehouse}:</span>
                      <span className="font-mono text-xs">
                        {currentBranchStock} &rarr; <span className="font-bold text-emerald-700">{newBranchStock}</span> {inboundItem.uom}
                      </span>
                    </div>
                    <div className="text-emerald-800 flex items-center justify-between pt-1 border-t border-emerald-200/60">
                      <span>Tổng tồn toàn bộ các kho sau cập nhật:</span>
                      <span className="font-mono font-bold text-xs text-slate-900">
                        {newTotalStock.toLocaleString('vi-VN')} {inboundItem.uom}
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-slate-200 bg-slate-50/50">
              <button
                type="button"
                onClick={() => setInboundModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmInbound}
                className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Check size={14} />
                <span>Xác nhận nhập kho</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Biểu Đồ Phân Tích Chuyên Sâu SKU Hàng Hóa */}
      {analyticsItem && (
        <SkuAnalyticsModal
          item={analyticsItem}
          isOpen={!!analyticsItem}
          onClose={() => setAnalyticsItem(null)}
          selectedWarehouse={warehouseFilter !== 'ALL' ? warehouseFilter : 'Toàn hệ thống'}
          canViewCostPrice={canViewCostPrice}
        />
      )}

      {/* MODAL XEM BẢNG GIÁ SẢN PHẨM (CHỈ XEM) */}
      <ViewPriceBooksModal
        item={viewingPriceBookItem}
        isOpen={!!viewingPriceBookItem}
        onClose={() => setViewingPriceBookItem(null)}
      />

      {/* MODAL TÙY CHỌN CỘT XUẤT FILE EXCEL (ẢNH 1 & 3) */}
      <GoodsExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        items={itemsToExport}
        onExportSuccess={handleExportSuccess}
      />

      {/* MODAL NHẬP HÀNG HÓA TỪ FILE DỮ LIỆU (ẢNH 2 & 3) */}
      <GoodsImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        existingGoods={goods}
        onImportSuccess={handleImportSuccess}
      />

      {/* FLOATING DOCK DOWNLOAD FILE ĐÃ KẾT XUẤT (ẢNH 2) */}
      <GoodsExportDownloadDock
        isOpen={isExportDockOpen}
        onClose={() => setIsExportDockOpen(false)}
        fileName={lastExportedFile?.fileName || ''}
        workbook={lastExportedFile?.workbook || null}
      />

      {/* QUICK MODAL: TẠO MỚI NHÓM HÀNG CHUẨN KIOTVIET (ẢNH 2) */}
      {isQuickCategoryModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Tag size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Tạo mới nhóm hàng</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCategoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickCategory} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Tên nhóm hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="VD: Phào chỉ trang trí, Tấm PVC cao cấp, Sữa..."
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Nhóm cha (Tùy chọn)
                </label>
                <select
                  value={newCategoryParent}
                  onChange={(e) => setNewCategoryParent(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-medium bg-white"
                >
                  <option value="">-- Là nhóm gốc (Không có nhóm cha) --</option>
                  {categoriesList.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Ghi chú / Mô tả
                </label>
                <textarea
                  rows={2}
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="Mô tả tóm tắt về nhóm hàng này..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-normal resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickCategoryModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingCategory ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Lưu nhóm hàng</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MODAL: TẠO MỚI VỊ TRÍ KHO (ẢNH 2) */}
      {isQuickLocationModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Tạo mới vị trí</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickLocationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickLocation} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Tên vị trí <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="VD: Kệ A-01-T2, Khu Vực B, Dãy C..."
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Ghi chú / Mô tả vị trí
                </label>
                <textarea
                  rows={2}
                  value={newLocationDesc}
                  onChange={(e) => setNewLocationDesc(e.target.value)}
                  placeholder="Mô tả chi tiết về vị trí này..."
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 font-normal resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickLocationModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={13} />
                  <span>Lưu vị trí</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK MODAL: TẠO MỚI THƯƠNG HIỆU (ẢNH 2) */}
      {isQuickBrandModalOpen && (
        <div className="fixed inset-0 z-[1000] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Tạo mới thương hiệu</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickBrandModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickBrand} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Tên thương hiệu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="VD: Vinamilk, Ba Vì Milk, Tín Phát..."
                  required
                  className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsQuickBrandModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium transition cursor-pointer"
                >
                  Bỏ qua
                </button>
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check size={13} />
                  <span>Lưu thương hiệu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
