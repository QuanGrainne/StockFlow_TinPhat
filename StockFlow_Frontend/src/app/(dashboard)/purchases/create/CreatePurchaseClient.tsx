'use client';

import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Grid2X2,
  Info,
  Plus,
  Printer,
  Search,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { message, Modal, Tooltip, Spin } from 'antd';
import { supplierService } from '@/features/suppliers/services/supplierService';
import { Supplier } from '@/features/suppliers/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PurchaseItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

interface ProductCatalogItem {
  code: string;
  name: string;
  unit: string;
  costPrice: number;
}

interface SupplierItem {
  code: string;
  name: string;
  phone?: string;
  currentPayable?: number;
}

// ─── Mock Catalogs ────────────────────────────────────────────────────────────

const SAMPLE_PRODUCTS: ProductCatalogItem[] = [
  { code: 'SP000001', name: 'Hạt dẻ tẩm vị mật ong 100g', unit: 'Gói', costPrice: 25000 },
  { code: 'SP000002', name: 'Thùng carton 50x40x30 3 lớp sóng B', unit: 'Cái', costPrice: 8500 },
  { code: 'SP000003', name: 'Túi zip bạc đáy đứng 15x22 (khoảng 70 túi/kg)', unit: 'Kg', costPrice: 65000 },
  { code: 'SP000004', name: 'Băng dính đóng hàng vàng đục 500g', unit: 'Cuộn', costPrice: 18000 },
  { code: 'SP000005', name: 'Màng PE quấn pallet khổ 50cm 2.4kg', unit: 'Cuộn', costPrice: 95000 },
  { code: 'SP000006', name: 'Hộp carton nắp cài 20x15x10 carton trắng', unit: 'Cái', costPrice: 4200 },
  { code: 'SP000007', name: 'Giấy in nhiệt bọc màng K80 phi 45', unit: 'Cuộn', costPrice: 6800 },
  { code: 'SP000008', name: 'Xốp bóp nổ chống sốc 50cm x 100m', unit: 'Cuộn', costPrice: 120000 },
];

const SAMPLE_SUPPLIERS: SupplierItem[] = [
  { code: 'NCC000009', name: 'cty cp bao bì 3D', phone: '0912 345 678' },
  { code: 'NCC000007', name: 'kiểm kho', phone: '0988 777 666' },
  { code: 'NCC000011', name: 'mua lẻ', phone: '0903 111 222' },
  { code: 'NCC000017', name: 'xưởng may', phone: '0977 444 555' },
  { code: 'NCC000002', name: 'Trung Quốc', phone: '+86 138 0000' },
  { code: 'NCC000014', name: 'Công ty TNHH Nhựa Tiền Phong', phone: '024 3823 4567' },
];

// Helper to format date & time matching screenshot: "DD/MM/YYYY HH:mm"
function formatDateTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export default function CreatePurchaseClient() {
  // ─── State ──────────────────────────────────────────────────────────────────
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Right sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dateTimeStr] = useState<string>(() => formatDateTime(new Date()));
  const [username, setUsername] = useState<string>(() => {
    if (typeof window === 'undefined') return 'ngân';
    try {
      const raw = localStorage.getItem('stockflow_user');
      if (raw) {
        const u = JSON.parse(raw) as { fullName?: string; username?: string };
        return u.fullName || u.username || 'ngân';
      }
    } catch {
      // ignore
    }
    return 'ngân';
  });
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Supplier state
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const supplierBoxRef = useRef<HTMLDivElement>(null);

  // Form fields
  const [orderCode, setOrderCode] = useState('');
  const [purchaseOrderCode, setPurchaseOrderCode] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Quick Add Product Modal
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUnit, setNewProductUnit] = useState('Cái');
  const [newProductPrice, setNewProductPrice] = useState<number>(0);

  // Quick Add Supplier Modal
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');

  // Load active suppliers from PostgreSQL database
  useEffect(() => {
    let isMounted = true;
    async function loadSuppliers() {
      try {
        setLoadingSuppliers(true);
        const data = await supplierService.getSuppliers({ status: 'ACTIVE' });
        if (isMounted && data && data.length > 0) {
          setSuppliersList(data);
        }
      } catch (err) {
        console.warn('Không thể tải danh sách NCC từ API, chuyển sang mẫu dự phòng:', err);
      } finally {
        if (isMounted) setLoadingSuppliers(false);
      }
    }
    loadSuppliers();
    return () => {
      isMounted = false;
    };
  }, []);

  // ─── Initialization & Listeners ─────────────────────────────────────────────
  useEffect(() => {
    // F3 keyboard shortcut to focus search input

    // F3 keyboard shortcut to focus search input
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setProductDropdownOpen(true);
      }
    }
    window.addEventListener('keydown', handleKeyDown);

    // Click outside listeners
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setProductDropdownOpen(false);
      }
      if (supplierBoxRef.current && !supplierBoxRef.current.contains(e.target as Node)) {
        setSupplierDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // ─── Calculations ───────────────────────────────────────────────────────────
  const totalGoods = useMemo(() => {
    return items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice - item.discount;
      return sum + Math.max(0, lineTotal);
    }, 0);
  }, [items]);

  const finalPayable = useMemo(() => {
    return Math.max(0, totalGoods - orderDiscount);
  }, [totalGoods, orderDiscount]);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleSelectProduct(catalogItem: ProductCatalogItem) {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.code === catalogItem.code);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      }
      const newItem: PurchaseItem = {
        id: `${catalogItem.code}-${Date.now()}`,
        code: catalogItem.code,
        name: catalogItem.name,
        unit: catalogItem.unit,
        quantity: 1,
        unitPrice: catalogItem.costPrice,
        discount: 0,
      };
      return [...prev, newItem];
    });
    setProductSearch('');
    setProductDropdownOpen(false);
    message.success(`Đã thêm hàng hóa: ${catalogItem.name}`);
  }

  function handleUpdateItem(id: string, field: keyof PurchaseItem, value: number) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            [field]: Math.max(0, value),
          };
        }
        return item;
      })
    );
  }

  function handleRemoveItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      message.loading({ content: `Đang xử lý file ${file.name}...`, key: 'import_excel' });
      setTimeout(() => {
        // Load mock products from sample
        setItems([
          {
            id: 'imp-1',
            code: SAMPLE_PRODUCTS[0].code,
            name: SAMPLE_PRODUCTS[0].name,
            unit: SAMPLE_PRODUCTS[0].unit,
            quantity: 50,
            unitPrice: SAMPLE_PRODUCTS[0].costPrice,
            discount: 0,
          },
          {
            id: 'imp-2',
            code: SAMPLE_PRODUCTS[1].code,
            name: SAMPLE_PRODUCTS[1].name,
            unit: SAMPLE_PRODUCTS[1].unit,
            quantity: 200,
            unitPrice: SAMPLE_PRODUCTS[1].costPrice,
            discount: 50000,
          },
          {
            id: 'imp-3',
            code: SAMPLE_PRODUCTS[2].code,
            name: SAMPLE_PRODUCTS[2].name,
            unit: SAMPLE_PRODUCTS[2].unit,
            quantity: 20,
            unitPrice: SAMPLE_PRODUCTS[2].costPrice,
            discount: 0,
          },
        ]);
        message.success({ content: `Đã nhập 3 sản phẩm từ file ${file.name} thành công!`, key: 'import_excel' });
      }, 700);
    }
  }

  function handleDownloadSample() {
    message.info('Đang tải về file mẫu nhập hàng Excel: mau_nhap_hang_tinphat.xlsx');
  }

  function handleSaveDraft() {
    message.success('Lưu tạm phiếu nhập hàng thành công!');
  }

  function handleCreateQuickProduct() {
    if (!newProductName.trim()) {
      message.error('Vui lòng nhập tên hàng hóa');
      return;
    }
    const newCode = `SP${String(Math.floor(100000 + Math.random() * 900000))}`;
    const newItem: PurchaseItem = {
      id: `${newCode}-${Date.now()}`,
      code: newCode,
      name: newProductName.trim(),
      unit: newProductUnit || 'Cái',
      quantity: 1,
      unitPrice: newProductPrice || 0,
      discount: 0,
    };
    setItems((prev) => [...prev, newItem]);
    setShowAddProductModal(false);
    setNewProductName('');
    setNewProductPrice(0);
    message.success(`Đã tạo và thêm hàng hóa: ${newItem.name}`);
  }

  async function handleCreateQuickSupplier() {
    if (!newSupplierName.trim()) {
      message.error('Vui lòng nhập tên nhà cung cấp');
      return;
    }
    try {
      setIsSubmittingSupplier(true);
      const created = await supplierService.createSupplier({
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || undefined,
      });
      setSuppliersList((prev) => [created, ...prev]);
      setSelectedSupplier({
        code: created.code,
        name: created.name,
        phone: created.phone || '',
        currentPayable: created.currentPayable,
      });
      setShowAddSupplierModal(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
      message.success(`Đã lưu và chọn nhà cung cấp: ${created.name} (${created.code})`);
    } catch (err: any) {
      console.warn('Lỗi lưu NCC lên hệ thống, tạo tạm tại chỗ:', err);
      const fallbackSupplier: SupplierItem = {
        code: `NCC${String(Math.floor(100000 + Math.random() * 900000))}`,
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim() || 'Chưa có',
      };
      setSelectedSupplier(fallbackSupplier);
      setShowAddSupplierModal(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
      message.warning(`Đã tạo tạm NCC: ${fallbackSupplier.name}`);
    } finally {
      setIsSubmittingSupplier(false);
    }
  }

  const filteredCatalog = useMemo(() => {
    if (!productSearch.trim()) return SAMPLE_PRODUCTS;
    const q = productSearch.toLowerCase();
    return SAMPLE_PRODUCTS.filter(
      (p) => p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    );
  }, [productSearch]);

  const filteredSuppliers = useMemo(() => {
    const source: SupplierItem[] = suppliersList.length > 0 ? suppliersList : SAMPLE_SUPPLIERS;
    if (!supplierSearch.trim()) return source;
    const q = supplierSearch.toLowerCase();
    return source.filter(
      (s) =>
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.toLowerCase().includes(q))
    );
  }, [suppliersList, supplierSearch]);

  return (
    <div className="flex-1 flex flex-col bg-[#f4f6f8] min-h-[calc(100vh-56px)] select-none">

      {/* ─── Top Sub-header Bar (Matches media screenshot) ─── */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3 shrink-0 shadow-2xs">

        {/* Left: Back button + Title + Product Search */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href="/purchases"
            className="p-1 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-md transition cursor-pointer flex items-center justify-center shrink-0"
            title="Quay lại danh sách nhập hàng"
          >
            <ArrowLeft size={18} />
          </Link>

          <h1 className="text-base font-semibold text-slate-800 shrink-0">
            Nhập hàng
          </h1>

          {/* Search Product Bar */}
          <div className="relative flex-1 max-w-[420px]" ref={searchBoxRef}>
            <div
              className={`h-9 px-2.5 bg-white border rounded-[6px] flex items-center gap-2 transition ${
                productDropdownOpen
                  ? 'border-blue-500 ring-2 ring-blue-100'
                  : 'border-slate-300 hover:border-slate-400'
              }`}
            >
              <Search size={15} className="text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Tìm hàng hóa theo mã hoặc tên (F3)"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value);
                  setProductDropdownOpen(true);
                }}
                onFocus={() => setProductDropdownOpen(true)}
                className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none"
              />

              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch('')}
                  className="text-slate-400 hover:text-slate-600 shrink-0"
                >
                  <X size={14} />
                </button>
              )}

              {/* Barcode icon */}
              <button
                type="button"
                onClick={() => {
                  // Quick add a random sample product simulating barcode scanner
                  const randomProd = SAMPLE_PRODUCTS[Math.floor(Math.random() * SAMPLE_PRODUCTS.length)];
                  handleSelectProduct(randomProd);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition shrink-0"
                title="Quét mã vạch"
              >
                <Grid2X2 size={16} />
              </button>

              {/* Quick Add Product Button */}
              <button
                type="button"
                onClick={() => setShowAddProductModal(true)}
                className="text-slate-500 hover:text-[#0071BA] p-0.5 rounded transition shrink-0"
                title="Thêm mới hàng hóa"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Product Autocomplete Dropdown */}
            {productDropdownOpen && (
              <div className="absolute top-full left-0 mt-1.5 w-full min-w-[380px] sm:min-w-[480px] bg-white rounded-lg border border-slate-200 shadow-xl py-1.5 z-50 max-h-[320px] overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  Gợi ý hàng hóa ({filteredCatalog.length})
                </div>
                {filteredCatalog.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    Không tìm thấy hàng hóa phù hợp.
                    <button
                      type="button"
                      onClick={() => {
                        setProductDropdownOpen(false);
                        setShowAddProductModal(true);
                      }}
                      className="block mx-auto mt-2 text-[#0071BA] font-medium hover:underline cursor-pointer"
                    >
                      + Thêm hàng hóa mới
                    </button>
                  </div>
                ) : (
                  filteredCatalog.map((prod) => (
                    <div
                      key={prod.code}
                      onClick={() => handleSelectProduct(prod)}
                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-b-0 transition"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="text-xs font-semibold text-slate-800 truncate">
                          {prod.name}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-blue-600">{prod.code}</span>
                          <span>•</span>
                          <span>ĐVT: {prod.unit}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-semibold text-slate-700">
                          {prod.costPrice.toLocaleString('vi-VN')} đ
                        </div>
                        <div className="text-[10px] text-slate-400">Giá nhập</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right sub-header utility icons (Photo 1) */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip title="Mẫu in & thiết lập bảng">
            <button
              type="button"
              className="p-1.5 rounded-[6px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <SlidersHorizontal size={17} />
            </button>
          </Tooltip>

          <Tooltip title="In phiếu tạm">
            <button
              type="button"
              onClick={() => message.info('Đang chuẩn bị bản in phiếu nhập hàng...')}
              className="p-1.5 rounded-[6px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <Printer size={17} />
            </button>
          </Tooltip>

          <Tooltip title="Xem trước phiếu">
            <button
              type="button"
              onClick={() => message.info('Chế độ xem trước phiếu nhập')}
              className="p-1.5 rounded-[6px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <Eye size={17} />
            </button>
          </Tooltip>

          <Tooltip title="Trợ giúp / Hướng dẫn">
            <button
              type="button"
              onClick={() => message.info('Nhấn F3 để tìm nhanh hàng hóa. Chọn file Excel để nhập hàng loạt.')}
              className="p-1.5 rounded-[6px] text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            >
              <AlertCircle size={17} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ─── Main Two-Column Layout ─── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── Left Workspace: Products Table / Empty State ── */}
        <div className="flex-1 flex flex-col bg-white overflow-y-auto">

          {/* Table Header Row (Matches screenshot: light blue #e8f2ff) */}
          <div className="bg-[#e8f2ff] border-b border-[#d4e5f9] h-9 px-4 flex items-center text-xs font-semibold text-slate-700 shrink-0 sticky top-0 z-10">
            <div className="w-12 text-center">STT</div>
            <div className="w-28 px-2 text-left">Mã hàng</div>
            <div className="flex-1 px-2 text-left">Tên hàng</div>
            <div className="w-20 text-center">ĐVT</div>
            <div className="w-24 px-2 text-right">Số lượng</div>
            <div className="w-28 px-2 text-right">Đơn giá</div>
            <div className="w-24 px-2 text-right">Giảm giá</div>
            <div className="w-32 px-2 text-right">Thành tiền</div>
            {items.length > 0 && <div className="w-10 text-center"></div>}
          </div>

          {/* Table Content */}
          {items.length === 0 ? (
            /* Empty State: EXACT match to media screenshot */
            <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-[460px]">
              <div className="text-center max-w-md">
                <h2 className="text-[15px] font-semibold text-slate-800">
                  Thêm sản phẩm từ file excel
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  (Tải về file mẫu:{' '}
                  <button
                    type="button"
                    onClick={handleDownloadSample}
                    className="text-[#0071BA] hover:underline font-medium cursor-pointer"
                  >
                    Excel file
                  </button>
                  )
                </p>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-[#0071BA] hover:bg-[#005f9d] text-white rounded-[6px] text-sm font-medium transition cursor-pointer shadow-xs"
                >
                  <FileText size={16} />
                  <span>Chọn file dữ liệu</span>
                </button>
              </div>
            </div>
          ) : (
            /* Product rows */
            <div className="divide-y divide-slate-100 flex-1">
              {items.map((item, index) => {
                const lineTotal = item.quantity * item.unitPrice - item.discount;
                return (
                  <div
                    key={item.id}
                    className="px-4 py-2 flex items-center text-xs text-slate-800 hover:bg-slate-50 transition"
                  >
                    <div className="w-12 text-center text-slate-400 font-medium">
                      {index + 1}
                    </div>

                    <div className="w-28 px-2 text-left font-mono font-medium text-blue-600 truncate">
                      {item.code}
                    </div>

                    <div className="flex-1 px-2 text-left font-medium text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </div>

                    <div className="w-20 text-center text-slate-600">
                      {item.unit}
                    </div>

                    {/* Quantity input */}
                    <div className="w-24 px-2 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full text-right bg-white border border-slate-200 rounded px-1.5 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                      />
                    </div>

                    {/* Unit price input */}
                    <div className="w-28 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={item.unitPrice}
                        onChange={(e) => handleUpdateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)}
                        className="w-full text-right bg-white border border-slate-200 rounded px-1.5 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                      />
                    </div>

                    {/* Discount input */}
                    <div className="w-24 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={item.discount}
                        onChange={(e) => handleUpdateItem(item.id, 'discount', parseInt(e.target.value) || 0)}
                        className="w-full text-right bg-white border border-slate-200 rounded px-1.5 py-1 text-xs focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                      />
                    </div>

                    {/* Line total */}
                    <div className="w-32 px-2 text-right font-semibold text-slate-800">
                      {Math.max(0, lineTotal).toLocaleString('vi-VN')}
                    </div>

                    {/* Action */}
                    <div className="w-10 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 transition cursor-pointer"
                        title="Xóa hàng này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add more row helper */}
              <div className="p-3 bg-slate-50/50 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Tổng số: <strong className="text-slate-800">{items.length}</strong> mặt hàng
                </span>
                <button
                  type="button"
                  onClick={() => searchInputRef.current?.focus()}
                  className="text-xs text-[#0071BA] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Thêm mặt hàng khác (F3)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar toggle button — always visible outside the sidebar ── */}
        <button
          type="button"
          onClick={() => setSidebarOpen((v) => !v)}
          className="self-center shrink-0 w-6 h-6 rounded-full bg-white border border-sky-400 text-sky-500 shadow-sm flex items-center justify-center cursor-pointer hover:bg-sky-50 transition z-30"
          style={{ marginLeft: sidebarOpen ? '-12px' : '0', marginRight: sidebarOpen ? '0' : '-12px' }}
          title={sidebarOpen ? 'Thu gọn thông tin' : 'Mở rộng thông tin'}
        >
          {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* ── Right Sidebar: Form Details (Matches screenshot) ── */}
        <div
          className={`relative bg-white border-l border-slate-200 transition-all duration-300 flex flex-col justify-between shrink-0 ${
            sidebarOpen ? 'w-[360px]' : 'w-0 overflow-hidden border-l-0'
          }`}
        >
          {/* Sidebar Inner Content */}
          <div className="p-3.5 space-y-3 overflow-y-auto flex-1">

            {/* Top row: User dropdown + Date time (Photo 1) */}
            <div className="grid grid-cols-2 gap-2">
              {/* User Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((v) => !v)}
                  className="w-full h-8 px-2 bg-white border border-slate-200 rounded-[6px] text-xs text-slate-700 flex items-center justify-between hover:border-slate-300 transition cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <User size={13} className="text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{username}</span>
                  </div>
                  <ChevronDown size={13} className="text-slate-400 shrink-0" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-md border border-slate-200 shadow-lg py-1 z-40 text-xs">
                    {['ngân', 'Admin', 'Thủ kho A', 'Kế toán B'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setUsername(u);
                          setUserDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-1.5 text-left hover:bg-blue-50 ${
                          username === u ? 'font-semibold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Date & Time */}
              <div className="h-8 px-2 bg-white border border-slate-200 rounded-[6px] text-xs text-slate-700 flex items-center justify-center font-mono">
                {dateTimeStr || '17/10/2026 02:14'}
              </div>
            </div>

            {/* Supplier Search Input (Photo 1) */}
            <div className="relative" ref={supplierBoxRef}>
              <div
                className={`h-8 px-2.5 bg-white border rounded-[6px] flex items-center justify-between gap-1 transition ${
                  supplierDropdownOpen
                    ? 'border-blue-500 ring-2 ring-blue-100'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {selectedSupplier ? (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-medium text-slate-800 truncate">
                      {selectedSupplier.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSupplier(null)}
                      className="text-slate-400 hover:text-slate-600 ml-1"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      placeholder="Tìm nhà cung cấp"
                      value={supplierSearch}
                      onChange={(e) => {
                        setSupplierSearch(e.target.value);
                        setSupplierDropdownOpen(true);
                      }}
                      onFocus={() => setSupplierDropdownOpen(true)}
                      className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddSupplierModal(true)}
                      className="text-slate-500 hover:text-[#0071BA] p-0.5 rounded transition shrink-0"
                      title="Thêm nhà cung cấp mới"
                    >
                      <Plus size={15} />
                    </button>
                  </>
                )}
              </div>

              {/* Supplier Dropdown */}
              {supplierDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white rounded-lg border border-slate-200 shadow-xl py-1 z-40 max-h-[260px] overflow-y-auto">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
                    <span>Nhà cung cấp ({filteredSuppliers.length})</span>
                    {loadingSuppliers && <span className="text-[10px] text-blue-500 font-normal">Đang tải...</span>}
                  </div>
                  {filteredSuppliers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      Không tìm thấy nhà cung cấp.
                      <button
                        type="button"
                        onClick={() => {
                          setSupplierDropdownOpen(false);
                          setShowAddSupplierModal(true);
                        }}
                        className="block mx-auto mt-1.5 text-[#0071BA] font-medium hover:underline cursor-pointer"
                      >
                        + Thêm NCC mới
                      </button>
                    </div>
                  ) : (
                    filteredSuppliers.map((supp) => (
                      <div
                        key={supp.code}
                        onClick={() => {
                          setSelectedSupplier(supp);
                          setSupplierDropdownOpen(false);
                        }}
                        className="px-3 py-1.5 hover:bg-blue-50 cursor-pointer flex items-center justify-between border-b border-slate-50 last:border-b-0"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium text-slate-800 truncate">{supp.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {supp.code} {supp.phone ? ` - ${supp.phone}` : ''}
                          </div>
                        </div>
                        {typeof supp.currentPayable === 'number' && supp.currentPayable > 0 && (
                          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-mono shrink-0">
                            Nợ: {supp.currentPayable.toLocaleString('vi-VN')} đ
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Form Fields: Compact layout matching screenshot */}
            <div className="space-y-2 pt-1 text-xs">

              {/* Mã phiếu nhập */}
              <div className="flex items-center justify-between gap-2">
                <label className="text-slate-600 shrink-0">Mã phiếu nhập</label>
                <input
                  type="text"
                  placeholder="Mã phiếu tự động"
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value)}
                  className="w-[180px] h-7 px-2 bg-slate-50 text-slate-400 placeholder:text-slate-400 border border-slate-200 rounded text-xs outline-none"
                />
              </div>

              {/* Mã đặt hàng nhập */}
              <div className="flex items-center justify-between gap-2">
                <label className="text-slate-600 shrink-0">Mã đặt hàng nhập</label>
                <input
                  type="text"
                  placeholder=""
                  value={purchaseOrderCode}
                  onChange={(e) => setPurchaseOrderCode(e.target.value)}
                  className="w-[180px] h-7 px-2 bg-white text-slate-800 border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
                />
              </div>

              {/* Trạng thái */}
              <div className="flex items-center justify-between gap-2 py-0.5">
                <label className="text-slate-600 shrink-0">Trạng thái</label>
                <span className="text-slate-800 font-medium">Phiếu tạm</span>
              </div>

              {/* Số hóa đơn đầu vào */}
              <div className="flex items-center justify-between gap-2">
                <label className="text-slate-600 shrink-0">Số hóa đơn đầu vào</label>
                <input
                  type="text"
                  placeholder="Nhập số hóa đơn đầu ..."
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-[180px] h-7 px-2 bg-white text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
                />
              </div>

              {/* Tổng tiền hàng */}
              <div className="flex items-center justify-between gap-2 py-0.5">
                <div className="flex items-center gap-1 text-slate-600">
                  <span>Tổng tiền hàng</span>
                  <Tooltip title="Tổng giá trị các mặt hàng chưa trừ giảm giá">
                    <Info size={13} className="text-slate-400 cursor-pointer" />
                  </Tooltip>
                </div>
                <span className="font-semibold text-slate-800 text-sm">
                  {totalGoods.toLocaleString('vi-VN')}
                </span>
              </div>

              {/* Giảm giá */}
              <div className="flex items-center justify-between gap-2">
                <label className="text-slate-600 shrink-0">Giảm giá</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(parseInt(e.target.value) || 0)}
                  className="w-[180px] h-7 px-2 bg-white text-slate-800 text-right border border-slate-200 rounded text-xs outline-none focus:border-blue-400"
                />
              </div>

              {/* Cần trả nhà cung cấp */}
              <div className="flex items-center justify-between gap-2 py-1 border-t border-slate-100">
                <label className="font-semibold text-slate-800 shrink-0">
                  Cần trả nhà cung cấp
                </label>
                <span className="font-bold text-base text-[#0071BA]">
                  {finalPayable.toLocaleString('vi-VN')}
                </span>
              </div>
            </div>

            {/* Notes textarea */}
            <div className="pt-1">
              <textarea
                placeholder="Ghi chú"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full p-2 bg-white border border-slate-200 rounded-[6px] text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-400 resize-none"
              />
            </div>
          </div>

          {/* Bottom CTA (Matches photo: white button with blue border #0071BA) */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="w-full h-10 rounded-lg border border-[#0071BA] bg-white text-[#0071BA] hover:bg-blue-50 font-medium text-sm transition cursor-pointer flex items-center justify-center shadow-2xs"
            >
              Lưu tạm
            </button>
          </div>
        </div>
      </div>

      {/* ─── Modal: Quick Add Product ─── */}
      <Modal
        title="Thêm nhanh hàng hóa"
        open={showAddProductModal}
        onCancel={() => setShowAddProductModal(false)}
        onOk={handleCreateQuickProduct}
        okText="Thêm vào phiếu"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#0071BA' } }}
      >
        <div className="space-y-3 py-2 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Tên hàng hóa *</label>
            <input
              type="text"
              placeholder="Ví dụ: Băng dính đóng hàng 500g"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Đơn vị tính</label>
              <input
                type="text"
                placeholder="Cái, Cuộn, Kg, Hộp..."
                value={newProductUnit}
                onChange={(e) => setNewProductUnit(e.target.value)}
                className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Giá nhập dự kiến</label>
              <input
                type="number"
                min="0"
                step="1000"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(parseInt(e.target.value) || 0)}
                className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── Modal: Quick Add Supplier ─── */}
      <Modal
        title="Thêm nhanh nhà cung cấp"
        open={showAddSupplierModal}
        onCancel={() => setShowAddSupplierModal(false)}
        onOk={handleCreateQuickSupplier}
        confirmLoading={isSubmittingSupplier}
        okText="Lưu & Chọn NCC"
        cancelText="Hủy"
        okButtonProps={{ style: { backgroundColor: '#0071BA' } }}
      >
        <div className="space-y-3 py-2 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Tên nhà cung cấp *</label>
            <input
              type="text"
              placeholder="Ví dụ: Công ty Bao Bì Miền Bắc"
              value={newSupplierName}
              onChange={(e) => setNewSupplierName(e.target.value)}
              className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-slate-700 font-medium mb-1">Số điện thoại</label>
            <input
              type="text"
              placeholder="0912 345 678"
              value={newSupplierPhone}
              onChange={(e) => setNewSupplierPhone(e.target.value)}
              className="w-full h-8 px-2.5 border border-slate-300 rounded text-xs outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
