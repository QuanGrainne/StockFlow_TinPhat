'use client';

import {
  CalendarOutlined,
  CloudDownloadOutlined,
  FilterOutlined,
  InboxOutlined,
  MenuOutlined,
  PlusOutlined,
  SearchOutlined,
  StarOutlined,
  StarFilled,
  DeleteOutlined,
  CopyOutlined,
  PrinterOutlined,
  MoreOutlined,
  EditOutlined as EditActionOutlined,
  SortAscendingOutlined,
  TagsOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Input,
  Pagination,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ChevronDown, PackagePlus, Wrench, Boxes, Filter } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import CreateProductModal from '@/components/CreateProductModal';
import CreateCategoryModal from '@/components/CreateCategoryModal';
import ColumnCustomizerPopover, {
  defaultColumnVisibility,
  type ColumnVisibility,
} from '@/components/ColumnCustomizerPopover';
import ProductFilterSidebar, {
  FilterSidebarState,
} from '@/components/ProductFilterSidebar';

type Product = {
  key: number;
  code: string;
  barcode?: string;
  name: string;
  category: string;
  location: string;
  type?: string;
  brand?: string;
  supplier?: string;
  unit: string;
  salePrice: number;
  costPrice: number;
  stock: number;
  minStock: number;
  maxStock?: number;
  customerOrder?: number;
  createdAt?: string;
  expectedOutOfStock?: string;
  status: 'Đang kinh doanh' | 'Ngừng kinh doanh';
  color: string;
  size: string;
  directSale?: boolean;
};

type ProductDetailProps = {
  product: Product;
  onEdit: () => void;
};

function ProductDetail({ product, onEdit }: ProductDetailProps) {
  const [tab, setTab] = useState('Thông tin');
  const tabs = ['Thông tin', 'Mô tả, ghi chú', 'Thẻ kho', 'Tồn kho', 'Liên kết kênh bán'];
  const value = (text?: string | number) => text === undefined || text === '' ? 'Chưa có' : text;

  return (
    <div className="border-t border-blue-100 bg-[#f8fbff] px-4 py-4 sm:px-8">
      <div className="mb-4 flex gap-5 overflow-x-auto border-b border-blue-100">
        {tabs.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`whitespace-nowrap border-b-2 px-1 pb-2 text-xs font-medium ${tab === item ? 'border-[#0071BA] text-[#0071BA]' : 'border-transparent text-slate-500'}`}>
            {item}
          </button>
        ))}
      </div>
      {tab === 'Thông tin' ? (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <ProductThumbnail category={product.category} />
            <div className="mr-2">
              <div className="font-semibold text-slate-800">{product.name}</div>
              <div className="mt-1 text-xs text-slate-500">Nhóm hàng: {product.category}</div>
            </div>
            <Tag color="blue">Hàng hóa thường</Tag>
            {product.directSale && <Tag color="green">Bán trực tiếp</Tag>}
            <Tag>Không tích điểm</Tag>
          </div>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Mã hàng', product.code],
              ['Mã vạch', product.barcode],
              ['Tồn kho', stockFormatter.format(product.stock)],
              ['Định mức tồn', `${product.minStock} - ${product.maxStock ?? '—'}`],
              ['Giá vốn', formatCurrency(product.costPrice)],
              ['Giá bán', formatCurrency(product.salePrice)],
              ['Thương hiệu', product.brand],
              ['Vị trí', product.location],
              ['Trọng lượng', undefined],
            ].map(([label, item]) => (
              <div key={label} className="text-xs">
                <div className="text-slate-400">{label}</div>
                <div className={`mt-1 font-medium ${item === undefined ? 'text-slate-300' : 'text-slate-700'}`}>{value(item)}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 border-t border-blue-100 pt-4 sm:grid-cols-2">
            <div><div className="text-xs text-slate-400">Nhà cung cấp</div><div className="mt-1 text-xs text-slate-600">{value(product.supplier)}</div></div>
            <button type="button" className="justify-self-start text-xs font-medium text-blue-600 hover:underline">+ Thêm thuộc tính</button>
          </div>
          <div className="mt-5 overflow-hidden rounded-lg border border-blue-100 bg-white">
            <div className="border-b border-blue-100 bg-blue-50/50 px-3 py-2 text-xs font-semibold text-slate-700">
              ({product.stock}) {product.code} / {product.category}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-xs">
                <thead className="bg-slate-50 text-left text-slate-500">
                  <tr>{['Mã hàng', 'Tên hàng', 'Giá bán', 'Giá vốn', 'Tồn kho', 'Khách đặt', 'Thời gian tạo', 'Dự kiến hết hàng'].map((label) => <th key={label} className="px-3 py-2 font-medium">{label}</th>)}</tr>
                </thead>
                <tbody>
                  {[product, { ...product, key: product.key + 10000, code: `${product.code}-01`, name: `${product.name} - biến thể`, stock: Math.max(0, Math.floor(product.stock / 2)) }].map((item, index) => (
                    <tr key={item.key} className="border-t border-slate-100">
                      <td className="px-3 py-2 pl-6 font-mono">{item.code}</td><td className="px-3 py-2">{index === 0 ? item.name : <span className="text-slate-600">↳ {item.name}</span>}</td><td className="px-3 py-2 text-right">{formatCurrency(item.salePrice)}</td><td className="px-3 py-2 text-right">{formatCurrency(item.costPrice)}</td><td className="px-3 py-2 text-right">{stockFormatter.format(item.stock)}</td><td className="px-3 py-2 text-right">{item.customerOrder ?? 0}</td><td className="px-3 py-2">{item.createdAt || 'Chưa có'}</td><td className="px-3 py-2">{item.expectedOutOfStock || 'Chưa có'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between border-t border-slate-100 px-3 py-2">
              <Button size="small" icon={<CopyOutlined />}>Sao chép</Button>
              <Button size="small" type="primary" icon={<PlusOutlined />}>Thêm hàng hóa cùng loại</Button>
            </div>
          </div>
        </>
      ) : <div className="py-8 text-center text-sm text-slate-400">Chưa có dữ liệu {tab.toLowerCase()}</div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-blue-100 pt-3">
        <div className="flex gap-2"><Button size="small" icon={<DeleteOutlined />}>Xóa</Button><Button size="small" icon={<CopyOutlined />}>Sao chép</Button></div>
        <div className="flex gap-2"><Button size="small" type="primary" icon={<EditActionOutlined />} onClick={onEdit}>Chỉnh sửa</Button><Button size="small" icon={<PrinterOutlined />}>In tem mã</Button><Button size="small" icon={<MoreOutlined />} aria-label="Thêm thao tác" /></div>
      </div>
    </div>
  );
}

const initialProducts: Product[] = [
  {
    key: 1,
    code: 'TP-TC-200-15',
    barcode: '893601234501',
    name: 'Thang cáp 200×100×2500 dày 1.5mm',
    category: 'Thành phẩm',
    location: 'Kho thành phẩm',
    type: 'Hàng hóa',
    brand: 'Tín Phát',
    supplier: 'Công ty TNHH Tín Phát',
    unit: 'Cây',
    salePrice: 485000,
    costPrice: 320000,
    stock: 1450,
    minStock: 100,
    maxStock: 2000,
    customerOrder: 120,
    status: 'Đang kinh doanh',
    color: 'Ghi sáng',
    size: '200×100',
    directSale: true,
  },
  {
    key: 2,
    code: 'TP-MC-300-ST',
    barcode: '893601234502',
    name: 'Máng cáp 300×100×2500 sơn tĩnh điện',
    category: 'Thành phẩm',
    location: 'Kho thành phẩm',
    type: 'Hàng hóa',
    brand: 'Tín Phát',
    supplier: 'Công ty TNHH Tín Phát',
    unit: 'Cây',
    salePrice: 625000,
    costPrice: 435000,
    stock: 85,
    minStock: 50,
    maxStock: 500,
    customerOrder: 30,
    status: 'Đang kinh doanh',
    color: 'Ghi sáng',
    size: '300×100',
    directSale: true,
  },
  {
    key: 3,
    code: 'NVL-TON-15',
    barcode: '893601234503',
    name: 'Tôn cuộn mạ kẽm dày 1.5mm',
    category: 'Nguyên vật liệu',
    location: 'Kho nguyên vật liệu',
    type: 'Hàng hóa',
    brand: 'Hoa Sen',
    supplier: 'Tập đoàn Hoa Sen',
    unit: 'Cuộn',
    salePrice: 0,
    costPrice: 18500000,
    stock: 34,
    minStock: 10,
    maxStock: 50,
    status: 'Đang kinh doanh',
    color: 'Mạ kẽm',
    size: '1.5mm',
    directSale: false,
  },
  {
    key: 4,
    code: 'NVL-TON-12',
    barcode: '893601234504',
    name: 'Tôn cuộn mạ kẽm dày 1.2mm',
    category: 'Nguyên vật liệu',
    location: 'Kho nguyên vật liệu',
    type: 'Hàng hóa',
    brand: 'Hòa Phát',
    supplier: 'Thép Hòa Phát',
    unit: 'Cuộn',
    salePrice: 0,
    costPrice: 15900000,
    stock: 8,
    minStock: 20,
    maxStock: 60,
    status: 'Đang kinh doanh',
    color: 'Mạ kẽm',
    size: '1.2mm',
    directSale: false,
  },
  {
    key: 5,
    code: 'NVL-SON-GHI',
    barcode: '893601234505',
    name: 'Bột sơn tĩnh điện màu ghi sáng',
    category: 'Nguyên vật liệu',
    location: 'Kho nguyên vật liệu',
    type: 'Hàng hóa',
    brand: 'AkzoNobel',
    supplier: 'Sơn AkzoNobel Việt Nam',
    unit: 'Kg',
    salePrice: 0,
    costPrice: 85000,
    stock: 200,
    minStock: 50,
    maxStock: 1000,
    status: 'Đang kinh doanh',
    color: 'Ghi sáng',
    size: 'Tiêu chuẩn',
    directSale: false,
  },
  {
    key: 6,
    code: 'TP-KT-100-10',
    barcode: '893601234506',
    name: 'Khay cáp 100×50×2500 dày 1.0mm',
    category: 'Thành phẩm',
    location: 'Kho thành phẩm',
    type: 'Hàng hóa',
    brand: 'Tín Phát',
    supplier: 'Công ty TNHH Tín Phát',
    unit: 'Cây',
    salePrice: 245000,
    costPrice: 165000,
    stock: 0,
    minStock: 80,
    maxStock: 1200,
    status: 'Đang kinh doanh',
    color: 'Ghi sáng',
    size: '100×50',
    directSale: true,
  },
  {
    key: 7,
    code: 'TP-KT-200-15',
    barcode: '893601234507',
    name: 'Khay cáp 200×100×2500 dày 1.5mm',
    category: 'Thành phẩm',
    location: 'Kho thành phẩm',
    type: 'Hàng hóa',
    brand: 'Tín Phát',
    supplier: 'Công ty TNHH Tín Phát',
    unit: 'Cây',
    salePrice: 485000,
    costPrice: 325000,
    stock: 610,
    minStock: 80,
    maxStock: 1000,
    status: 'Đang kinh doanh',
    color: 'Ghi sáng',
    size: '200×100',
    directSale: true,
  },
  {
    key: 8,
    code: 'NVL-SON-TRANG',
    barcode: '893601234508',
    name: 'Bột sơn tĩnh điện màu trắng',
    category: 'Nguyên vật liệu',
    location: 'Kho nguyên vật liệu',
    type: 'Hàng hóa',
    brand: 'AkzoNobel',
    supplier: 'Sơn AkzoNobel Việt Nam',
    unit: 'Kg',
    salePrice: 0,
    costPrice: 92000,
    stock: 46,
    minStock: 50,
    maxStock: 500,
    status: 'Ngừng kinh doanh',
    color: 'Trắng',
    size: 'Tiêu chuẩn',
    directSale: false,
  },
];

const currencyFormatter = new Intl.NumberFormat('vi-VN');
const stockFormatter = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return value ? `${currencyFormatter.format(value)} ₫` : '—';
}

function ProductThumbnail({ category }: { category: string }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border ${
        category === 'Thành phẩm'
          ? 'border-blue-100 bg-blue-50 text-[#0071BA]'
          : 'border-amber-100 bg-amber-50 text-amber-600'
      }`}
    >
      {category === 'Thành phẩm' ? <TagsOutlined /> : <InboxOutlined />}
    </div>
  );
}

export default function ProductsPage() {
  const [products] = useState<Product[]>(initialProducts);
  const [query, setQuery] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [favoriteKeys, setFavoriteKeys] = useState<number[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<React.Key[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isReady, setIsReady] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalMode, setCreateModalMode] = useState<'product' | 'combo' | 'service'>('product');
  const [createCategoryModalOpen, setCreateCategoryModalOpen] = useState(false);
  const [columnPopoverOpen, setColumnPopoverOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(defaultColumnVisibility);

  // Categories list for sidebar & modal
  const [categoriesList, setCategoriesList] = useState<string[]>([
    'Thành phẩm',
    'Nguyên vật liệu',
    'Thang cáp',
    'Máng cáp',
    'Khay cáp',
    'Tôn cuộn',
    'Bột sơn tĩnh điện',
    'Phụ kiện liên kết',
  ]);

  // Sidebar Filter State
  const [sidebarState, setSidebarState] = useState<FilterSidebarState>({
    category: undefined,
    stockCriteria: 'all',
    expectedOutOfStockType: 'all',
    expectedOutOfStockPeriod: 'Toàn thời gian',
    createdDateType: 'all',
    createdPeriod: 'Toàn thời gian',
    attrType: '',
    attrColor: '',
    attrSize: '',
    attrKg: '',
    attrKho: '',
    attrThung: '',
    supplier: undefined,
    location: undefined,
    productType: undefined,
    directSale: 'all',
    businessStatus: 'active', // Default: "Hàng đang kinh doanh" as in user screenshot!
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  function handleFilterChange(patch: Partial<FilterSidebarState>) {
    setSidebarState((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function handleAddCategorySuccess(newCat: string) {
    if (!categoriesList.includes(newCat)) {
      setCategoriesList((prev) => [...prev, newCat]);
    }
    setSidebarState((prev) => ({ ...prev, category: newCat }));
  }

  // Filter products by search query and sidebar state
  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const attrTypeNorm = sidebarState.attrType.trim().toLowerCase();
    const attrColorNorm = sidebarState.attrColor.trim().toLowerCase();
    const attrSizeNorm = sidebarState.attrSize.trim().toLowerCase();
    const attrKgNorm = (sidebarState.attrKg ?? '').trim().toLowerCase();
    const attrKhoNorm = (sidebarState.attrKho ?? '').trim().toLowerCase();
    const attrThungNorm = (sidebarState.attrThung ?? '').trim().toLowerCase();

    return products.filter((product) => {
      // 1. Search Query
      const matchesQuery =
        !normalizedQuery ||
        product.code.toLowerCase().includes(normalizedQuery) ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        (product.barcode && product.barcode.toLowerCase().includes(normalizedQuery));

      // 2. Nhóm hàng (Category)
      const matchesCategory =
        !sidebarState.category || product.category === sidebarState.category;

      // 3. Tồn kho (Stock Criteria)
      let matchesStock = true;
      switch (sidebarState.stockCriteria) {
        case 'below_min':
          matchesStock = product.stock <= product.minStock;
          break;
        case 'above_max':
          matchesStock = product.maxStock
            ? product.stock > product.maxStock
            : product.stock > 1000;
          break;
        case 'in_stock':
          matchesStock = product.stock > 0;
          break;
        case 'out_of_stock':
          matchesStock = product.stock <= 0;
          break;
        case 'custom':
          if (
            sidebarState.customStockMin !== undefined &&
            product.stock < sidebarState.customStockMin
          ) {
            matchesStock = false;
          }
          if (
            sidebarState.customStockMax !== undefined &&
            product.stock > sidebarState.customStockMax
          ) {
            matchesStock = false;
          }
          break;
        case 'all':
        default:
          matchesStock = true;
          break;
      }

      // 4. Thuộc tính (LOẠI, MÀU, SIZE, KG, KHỔ, THÙNG)
      const matchesAttrType =
        !attrTypeNorm ||
        (product.type?.toLowerCase().includes(attrTypeNorm) ?? false) ||
        product.category.toLowerCase().includes(attrTypeNorm);

      const matchesAttrColor =
        !attrColorNorm || product.color.toLowerCase().includes(attrColorNorm);

      const matchesAttrSize =
        !attrSizeNorm || product.size.toLowerCase().includes(attrSizeNorm);

      const matchesAttrKg =
        !attrKgNorm ||
        product.name.toLowerCase().includes(attrKgNorm) ||
        product.unit.toLowerCase().includes(attrKgNorm);

      const matchesAttrKho =
        !attrKhoNorm ||
        product.name.toLowerCase().includes(attrKhoNorm) ||
        product.size.toLowerCase().includes(attrKhoNorm);

      const matchesAttrThung =
        !attrThungNorm ||
        product.name.toLowerCase().includes(attrThungNorm) ||
        product.unit.toLowerCase().includes(attrThungNorm);

      // 5. Nhà cung cấp
      const matchesSupplier =
        !sidebarState.supplier || product.supplier === sidebarState.supplier;

      // 6. Vị trí
      const matchesLocation =
        !sidebarState.location || product.location === sidebarState.location;

      // 7. Loại hàng
      const matchesProductType =
        !sidebarState.productType || product.type === sidebarState.productType;

      // 8. Bán trực tiếp
      const matchesDirectSale =
        sidebarState.directSale === 'all' ||
        (sidebarState.directSale === 'yes' && product.directSale !== false) ||
        (sidebarState.directSale === 'no' && product.directSale === false);

      // 9. Trạng thái kinh doanh
      const matchesStatus =
        sidebarState.businessStatus === 'all' ||
        (sidebarState.businessStatus === 'active' &&
          product.status === 'Đang kinh doanh') ||
        (sidebarState.businessStatus === 'inactive' &&
          product.status === 'Ngừng kinh doanh');

      return (
        matchesQuery &&
        matchesCategory &&
        matchesStock &&
        matchesAttrType &&
        matchesAttrColor &&
        matchesAttrSize &&
        matchesAttrKg &&
        matchesAttrKho &&
        matchesAttrThung &&
        matchesSupplier &&
        matchesLocation &&
        matchesProductType &&
        matchesDirectSale &&
        matchesStatus
      );
    });
  }, [products, query, sidebarState]);

  const allColumns: Array<{ key: keyof ColumnVisibility; column: NonNullable<ColumnsType<Product>>[number] }> = [
    {
      key: 'image',
      column: {
        title: 'Hình ảnh',
        key: 'image',
        width: 76,
        render: (_, record) => <ProductThumbnail category={record.category} />,
      },
    },
    {
      key: 'name',
      column: {
        title: 'Hàng hóa',
        dataIndex: 'name',
        key: 'name',
        width: 320,
        render: (_, record) => (
          <div className="flex min-w-0 items-center gap-3">
            <ProductThumbnail category={record.category} />
            <div className="min-w-0">
              <div className="truncate font-medium text-[#1f2937]">{record.name}</div>
              <div className="mt-0.5 text-xs text-[#8c8c8c] flex items-center gap-2">
                <span>{record.unit}</span>
                {record.supplier && (
                  <span className="text-slate-400">· {record.supplier}</span>
                )}
              </div>
            </div>
          </div>
        ),
      },
    },
    {
      key: 'code',
      column: {
        title: 'Mã hàng',
        dataIndex: 'code',
        key: 'code',
        width: 140,
        render: (value: string) => <span className="font-mono text-xs text-[#595959]">{value}</span>,
      },
    },
    {
      key: 'barcode',
      column: {
        title: 'Mã vạch',
        dataIndex: 'barcode',
        key: 'barcode',
        width: 130,
        render: (value?: string) => <span className="text-xs text-[#595959]">{value || '—'}</span>,
      },
    },
    {
      key: 'category',
      column: {
        title: 'Nhóm hàng',
        dataIndex: 'category',
        key: 'category',
        width: 140,
        render: (value: string) => (
          <Tag color={value === 'Thành phẩm' ? 'blue' : 'gold'}>{value}</Tag>
        ),
      },
    },
    {
      key: 'type',
      column: {
        title: 'Loại hàng',
        dataIndex: 'type',
        key: 'type',
        width: 110,
        render: (value?: string) => <span className="text-xs text-[#595959]">{value || 'Hàng hóa'}</span>,
      },
    },
    {
      key: 'salePrice',
      column: {
        title: 'Giá bán',
        dataIndex: 'salePrice',
        key: 'salePrice',
        align: 'right',
        width: 130,
        render: (value: number) => <span className="text-[#262626] font-medium">{formatCurrency(value)}</span>,
      },
    },
    {
      key: 'costPrice',
      column: {
        title: 'Giá vốn',
        dataIndex: 'costPrice',
        key: 'costPrice',
        align: 'right',
        width: 130,
        render: (value: number) => <span className="text-[#595959]">{formatCurrency(value)}</span>,
      },
    },
    {
      key: 'brand',
      column: {
        title: 'Thương hiệu',
        dataIndex: 'brand',
        key: 'brand',
        width: 120,
        render: (value?: string) => <span className="text-xs text-[#595959]">{value || '—'}</span>,
      },
    },
    {
      key: 'stock',
      column: {
        title: 'Tồn kho',
        dataIndex: 'stock',
        key: 'stock',
        align: 'right',
        width: 130,
        render: (value: number, record) => (
          <span
            className={
              value <= 0
                ? 'font-semibold text-rose-600'
                : value <= record.minStock
                ? 'font-semibold text-amber-600'
                : 'text-[#262626]'
            }
          >
            {stockFormatter.format(value)}
          </span>
        ),
      },
    },
    {
      key: 'customerOrder',
      column: {
        title: 'Khách đặt',
        dataIndex: 'customerOrder',
        key: 'customerOrder',
        align: 'right',
        width: 110,
        render: (value?: number) => <span className="text-xs text-[#595959]">{value ? stockFormatter.format(value) : '0'}</span>,
      },
    },
    {
      key: 'minStock',
      column: {
        title: 'Định mức tồn',
        dataIndex: 'minStock',
        key: 'minStock',
        align: 'right',
        width: 120,
        render: (value: number, record) => (
          <span className="text-xs text-[#8c8c8c]">
            {value} - {record.maxStock || '—'}
          </span>
        ),
      },
    },
    {
      key: 'expectedOutOfStock',
      column: {
        title: 'Dự kiến hết hàng',
        dataIndex: 'expectedOutOfStock',
        key: 'expectedOutOfStock',
        width: 130,
        render: (value?: string) => <span className="text-xs text-[#8c8c8c]">{value || '—'}</span>,
      },
    },
    {
      key: 'createdAt',
      column: {
        title: <span className="inline-flex items-center gap-1">Thời gian tạo <SortAscendingOutlined className="text-slate-400" /></span>,
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 140,
        render: (value?: string) => <span className="text-xs text-[#8c8c8c]">{value || '—'}</span>,
      },
    },
    {
      key: 'status',
      column: {
        title: 'Trạng thái',
        dataIndex: 'status',
        key: 'status',
        width: 130,
        render: (value: string) => (
          <Tag color={value === 'Đang kinh doanh' ? 'success' : 'default'}>
            {value}
          </Tag>
        ),
      },
    },
    {
      key: 'color',
      column: {
        title: 'Màu sắc',
        dataIndex: 'color',
        key: 'color',
        width: 110,
        render: (value: string) => <span className="text-xs text-[#595959]">{value || '—'}</span>,
      },
    },
    {
      key: 'size',
      column: {
        title: 'Kích thước',
        dataIndex: 'size',
        key: 'size',
        width: 110,
        render: (value: string) => <span className="text-xs text-[#595959]">{value || '—'}</span>,
      },
    },
    {
      key: 'location',
      column: {
        title: 'Vị trí',
        dataIndex: 'location',
        key: 'location',
        width: 140,
        render: (value: string) => <span className="text-xs text-[#595959]">{value}</span>,
      },
    },
  ];

  const minimalColumnKeys: Array<keyof ColumnVisibility> = [
    'code',
    'name',
    'salePrice',
    'costPrice',
    'stock',
    'customerOrder',
    'createdAt',
    'expectedOutOfStock',
  ];

  const columns: ColumnsType<Product> = [
    {
      title: '',
      key: 'favorite',
      width: 42,
      render: (_: unknown, record: Product) => {
        const favorite = favoriteKeys.includes(record.key);
        return (
          <button
            type="button"
            aria-label={favorite ? 'Bỏ yêu thích' : 'Thêm yêu thích'}
            onClick={() => setFavoriteKeys((current) => favorite ? current.filter((key) => key !== record.key) : [...current, record.key])}
            className="text-amber-400 hover:text-amber-500"
          >
            {favorite ? <StarFilled /> : <StarOutlined />}
          </button>
        );
      },
    },
    ...minimalColumnKeys.flatMap((key) => {
      const entry = allColumns.find((item) => item.key === key);
      return entry ? [entry.column] : [];
    }),
  ].map((column) => ({
    ...column,
    onHeaderCell: () => ({ className: 'stockflow-table-header' }),
  }));

  const totalStock = filteredProducts.reduce((total, product) => total + product.stock, 0);

  return (
    <div className="flex-1 w-full min-h-[calc(100vh-56px)] bg-[#f7f9fa] text-[#262626]">
      <div className="flex min-h-[calc(100vh-56px)]">
        {/* Desktop Left Sidebar (Exact layout matching user's screenshots) */}
        <div className="hidden lg:block">
          <ProductFilterSidebar
            state={sidebarState}
            onChange={handleFilterChange}
            onCreateCategory={() => setCreateCategoryModalOpen(true)}
            categoriesList={categoriesList}
          />
        </div>

        {/* Mobile Filter Drawer / Toggle */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-black/40 backdrop-blur-xs">
            <div className="relative w-[280px] max-w-[85vw] bg-white h-full overflow-y-auto">
              <ProductFilterSidebar
                state={sidebarState}
                onChange={handleFilterChange}
                onCreateCategory={() => {
                  setMobileFilterOpen(false);
                  setCreateCategoryModalOpen(true);
                }}
                categoriesList={categoriesList}
              />
            </div>
            <div
              className="flex-1 h-full"
              onClick={() => setMobileFilterOpen(false)}
            />
          </div>
        )}

        {/* Main Goods Management Table & Action Bar */}
        <main className="min-w-0 flex-1 flex flex-col bg-white">
          {/* Top Actions Bar */}
          <div className="border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Mobile filter toggle & Status */}
              <div className="flex items-center gap-3">
                <Button
                  className="lg:hidden"
                  icon={<Filter size={15} />}
                  onClick={() => setMobileFilterOpen(true)}
                >
                  Bộ lọc
                </Button>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    Danh sách hàng hóa
                  </span>
                  <span className="text-xs text-slate-400">
                    ({filteredProducts.length} kết quả)
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Button
                    icon={<MenuOutlined />}
                    onClick={() => setColumnPopoverOpen((value) => !value)}
                  >
                    Tùy chỉnh cột
                  </Button>
                  <ColumnCustomizerPopover
                    open={columnPopoverOpen}
                    value={columnVisibility}
                    onChange={setColumnVisibility}
                    onClose={() => setColumnPopoverOpen(false)}
                  />
                </div>
                <Button icon={<UploadOutlined />}>Import file</Button>
                <Button icon={<CloudDownloadOutlined />}>Xuất file</Button>

                <div className="relative">
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setCreateMenuOpen((value) => !value)}
                    className="!bg-[#0071BA] hover:!bg-blue-700 font-medium"
                  >
                    Tạo mới <ChevronDown size={14} className="ml-1 inline" />
                  </Button>
                  {createMenuOpen && (
                    <div className="absolute right-0 top-full z-30 mt-1.5 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                      <button
                        type="button"
                        onClick={() => {
                          setCreateMenuOpen(false);
                          setCreateModalMode('product');
                          setCreateModalOpen(true);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <PackagePlus size={16} className="text-[#0071BA]" />
                        <span>
                          <strong className="block font-medium">Hàng hóa</strong>
                          <small className="text-xs text-slate-400">Tạo sản phẩm mới</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateMenuOpen(false);
                          setCreateModalMode('service');
                          setCreateModalOpen(true);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <Wrench size={16} className="text-[#0071BA]" />
                        <span>
                          <strong className="block font-medium">Dịch vụ</strong>
                          <small className="text-xs text-slate-400">Tạo dịch vụ mới</small>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCreateMenuOpen(false);
                          setCreateModalMode('combo');
                          setCreateModalOpen(true);
                        }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition"
                      >
                        <Boxes size={16} className="text-[#0071BA]" />
                        <span>
                          <strong className="block font-medium">Combo - đóng gói</strong>
                          <small className="text-xs text-slate-400">Tạo combo sản phẩm</small>
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search bar & Table Area */}
          <div className="p-5 flex-1 flex flex-col bg-[#f8fafc]">
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
              <Input
                allowClear
                prefix={<SearchOutlined className="text-[#8c8c8c]" />}
                placeholder="Tìm theo mã hàng hoặc tên hàng"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-[380px] h-[36px] rounded-[6px]"
              />

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Tổng tồn: <strong className="text-slate-800">{stockFormatter.format(totalStock)}</strong></span>
                <span>·</span>
                <span>Hiển thị <strong>{filteredProducts.length}</strong> hàng hóa</span>
              </div>
            </div>

            {/* Antd Table */}
            <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-xs">
              <Table<Product>
                className="stockflow-products-table"
                rowSelection={{
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                  columnWidth: 48,
                }}
                columns={columns}
                dataSource={filteredProducts}
                expandable={{
                  expandedRowKeys,
                  onExpandedRowsChange: (keys) => setExpandedRowKeys(Array.from(keys)),
                  expandedRowRender: (record) => (
                    <ProductDetail product={record} onEdit={() => {
                      setCreateModalMode('product');
                      setCreateModalOpen(true);
                    }} />
                  ),
                  expandRowByClick: true,
                }}
                pagination={false}
                scroll={{ x: 1250 }}
                size="middle"
                rowClassName={(record) =>
                  record.stock <= 0
                    ? 'bg-rose-50/40 hover:bg-rose-50/70'
                    : record.stock <= record.minStock
                    ? 'bg-[#fffbe6] hover:bg-amber-50/70'
                    : ''
                }
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row className="!bg-[#f8fafc] font-medium text-xs">
                      <Table.Summary.Cell index={0} />
                      <Table.Summary.Cell index={1} colSpan={3}>
                        <span className="font-semibold text-slate-800">Tổng tồn kho (danh sách lọc)</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        <span className="font-bold text-[#0071BA] text-sm">
                          {stockFormatter.format(totalStock)}
                        </span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} colSpan={4} />
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </div>

            {/* Pagination & Status Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-4 mt-auto">
              <div className="text-xs text-slate-500">
                {selectedRowKeys.length > 0
                  ? `Đã chọn ${selectedRowKeys.length} hàng hóa`
                  : 'Chọn hàng hóa để thao tác hàng loạt'}
              </div>
              <Pagination
                current={page}
                pageSize={pageSize}
                total={filteredProducts.length}
                showSizeChanger
                showQuickJumper
                onChange={(nextPage, nextPageSize) => {
                  setPage(nextPage);
                  setPageSize(nextPageSize);
                }}
                showTotal={(total, range) => `${range[0]}-${range[1]} trên ${total}`}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Modals */}
      <CreateProductModal
        open={createModalOpen}
        mode={createModalMode}
        onClose={() => setCreateModalOpen(false)}
      />
      <CreateCategoryModal
        open={createCategoryModalOpen}
        onClose={() => setCreateCategoryModalOpen(false)}
        onSuccess={handleAddCategorySuccess}
      />
    </div>
  );
}
