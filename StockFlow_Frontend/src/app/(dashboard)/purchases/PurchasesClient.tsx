'use client';

import {
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';
import { message, Tag } from 'antd';
import {
  AlignJustify,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  FileDown,
  Filter,
  HelpCircle,
  Info,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import PurchaseFilterSidebar from '@/components/PurchaseFilterSidebar';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PurchaseStatus = 'draft' | 'completed' | 'canceled';

export type Purchase = {
  key: number;
  code: string;           // Mã nhập hàng: PN002040
  createdAt: string;      // Thời gian: "16/10/2026 09:51"
  supplierCode: string;   // Mã NCC: NCC000009
  supplierName: string;   // Nhà cung cấp: "cty cp bao bì 3D"
  debt: number;           // Cần trả NCC
  status: PurchaseStatus;
  favorite: boolean;
};

export type PurchaseFilterState = {
  statuses: PurchaseStatus[];
  timeRange: 'this_month' | 'custom';
  periodLabel?: string;
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  invoiceCode?: string;
  importedBy?: string;
};

type PurchaseDetailItem = {
  code: string;
  name: string;
  qty: number;
  unitPrice: number;
  discount: number;
  costPrice: number;
};

type PriceSettingItem = {
  id: string;
  name: string;
  costPrice: number;
  lastPurchasePrice: number;
  salePrice: number;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_PURCHASES: Purchase[] = [
  { key: 1,  code: 'PN002040', createdAt: '16/10/2026 09:51', supplierCode: 'NCC000009', supplierName: 'cty cp bao bì 3D',       debt: 0, status: 'completed', favorite: false },
  { key: 2,  code: 'PN002024', createdAt: '16/10/2026 09:38', supplierCode: 'NCC000007', supplierName: 'kiểm kho',                debt: 0, status: 'completed', favorite: false },
  { key: 3,  code: 'PN002039', createdAt: '16/10/2026 09:13', supplierCode: 'NCC000011', supplierName: 'mua lẻ',                  debt: 0, status: 'completed', favorite: false },
  { key: 4,  code: 'PN002023', createdAt: '15/10/2026 15:02', supplierCode: 'NCC000007', supplierName: 'kiểm kho',                debt: 0, status: 'completed', favorite: false },
  { key: 5,  code: 'PN002022', createdAt: '15/10/2026 14:42', supplierCode: 'NCC000007', supplierName: 'kiểm kho',                debt: 0, status: 'completed', favorite: false },
  { key: 6,  code: 'PN002055', createdAt: '15/10/2026 00:00', supplierCode: 'NCC000017', supplierName: 'xưởng may',               debt: 0, status: 'completed', favorite: false },
  { key: 7,  code: 'PN002038', createdAt: '15/10/2026 00:00', supplierCode: 'NCC000011', supplierName: 'mua lẻ',                  debt: 0, status: 'completed', favorite: false },
  { key: 8,  code: 'PN002037', createdAt: '15/10/2026 00:00', supplierCode: 'NCC000002', supplierName: 'Trung Quốc',              debt: 0, status: 'completed', favorite: false },
  { key: 9,  code: 'PN002035', createdAt: '15/10/2026 00:00', supplierCode: 'NCC000013', supplierName: 'xưởng laze',              debt: 0, status: 'completed', favorite: false },
  { key: 10, code: 'PN002034', createdAt: '15/10/2026 00:00', supplierCode: 'NCC000054', supplierName: 'xưởng laze xả vải',      debt: 0, status: 'completed', favorite: false },
  { key: 11, code: 'PN002033', createdAt: '14/10/2026 17:30', supplierCode: 'NCC000003', supplierName: 'Công ty Hoa Sen',         debt: 156264600, status: 'draft', favorite: false },
  { key: 12, code: 'PN002032', createdAt: '14/10/2026 11:00', supplierCode: 'NCC000005', supplierName: 'Thép Hòa Phát',           debt: 0, status: 'canceled', favorite: false },
];

const PURCHASE_DETAILS: Record<string, { items: PurchaseDetailItem[]; note: string }> = {
  PN002040: {
    note: '',
    items: [
      {
        code: 'SP000161',
        name: 'vỏ thùng phật 80 đỏ mã vạch (phụ thường) kt 805*300*510 (cái)',
        qty: 750,
        unitPrice: 0,
        discount: 0,
        costPrice: 0,
      },
    ],
  },
  PN002039: {
    note: '',
    items: [
      {
        code: 'SP005708',
        name: 'màng PVC (cuộn) - 1031.2kg',
        qty: 30,
        unitPrice: 0,
        discount: 0,
        costPrice: 0,
      },
    ],
  },
  PN002023: {
    note: 'xưởng laze',
    items: [
      { code: 'SP005686', name: 'Laze - Hình tròn Vạn sự như ý (cái)', qty: 400, unitPrice: 0, discount: 0, costPrice: 0 },
      { code: 'SP005685', name: 'Laze - Chúc mừng năm mới (cái)', qty: 833, unitPrice: 0, discount: 0, costPrice: 0 },
      { code: 'SP005684', name: 'Laze - Thọ (cái)', qty: 630, unitPrice: 0, discount: 0, costPrice: 0 },
      { code: 'SP005683', name: 'Laze - Vạn sự như ý (cái)', qty: 990, unitPrice: 0, discount: 0, costPrice: 0 },
    ],
  },
  PN002055: {
    note: '',
    items: [
      {
        code: 'SP005314',
        name: 'xưởng may: nhồi bông túi tiền - Tài (túi)',
        qty: 1000,
        unitPrice: 0,
        discount: 0,
        costPrice: 0,
      },
    ],
  },
  PN002038: {
    note: '',
    items: [
      { code: 'SP004730', name: 'hoa trang nguyên đỏ (bồng)', qty: 2700, unitPrice: 0, discount: 0, costPrice: 0 },
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const currencyFormatter = new Intl.NumberFormat('vi-VN');



function statusTag(status: PurchaseStatus) {
  switch (status) {
    case 'completed': return <Tag color="success">Đã nhập hàng</Tag>;
    case 'draft':     return <Tag color="warning">Phiếu tạm</Tag>;
    case 'canceled':  return <Tag color="error">Đã hủy</Tag>;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PurchasesClient() {
  const [purchases, setPurchases] = useState<Purchase[]>(INITIAL_PURCHASES);
  const [query, setQuery] = useState('');
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchSupplier, setSearchSupplier] = useState('');
  const [exportOpen, setExportOpen] = useState(false);

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedRowKey, setExpandedRowKey] = useState<number | null>(null);
  const [priceDialogOpen, setPriceDialogOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState('Bảng giá chung');
  const [priceValues, setPriceValues] = useState<Record<string, string>>({});
  const [priceSettingItems, setPriceSettingItems] = useState<PriceSettingItem[]>([]);

  const [filterState, setFilterState] = useState<PurchaseFilterState>({
    statuses: ['draft', 'completed'],
    timeRange: 'this_month',
  });

  function handleRowClick(record: Purchase) {
    setExpandedRowKey((prev) => (prev === record.key ? null : record.key));
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchDropdownOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleFilterChange(patch: Partial<PurchaseFilterState>) {
    setFilterState((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  function toggleFavorite(key: number) {
    setPurchases((prev) =>
      prev.map((p) => (p.key === key ? { ...p, favorite: !p.favorite } : p))
    );
  }

  // ─── Filter logic ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const codeQ = searchCode.trim().toLowerCase();
    const prodQ = searchProduct.trim().toLowerCase();
    const suppQ = searchSupplier.trim().toLowerCase();

    return purchases.filter((p) => {
      const matchesQuery =
        !q ||
        p.code.toLowerCase().includes(q) ||
        p.supplierCode.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q);

      const matchesCode = !codeQ || p.code.toLowerCase().includes(codeQ);
      const matchesProd = !prodQ || p.code.toLowerCase().includes(prodQ) || p.supplierName.toLowerCase().includes(prodQ);
      const matchesSupp = !suppQ || p.supplierCode.toLowerCase().includes(suppQ) || p.supplierName.toLowerCase().includes(suppQ);

      const matchesStatus =
        filterState.statuses.length === 0 ||
        filterState.statuses.includes(p.status);

      let matchesDate = true;
      const [datePart] = p.createdAt.split(' ');
      const itemDate = datePart
        ? (() => {
            const [d, m, y] = datePart.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          })()
        : '';

      if (filterState.timeRange === 'custom') {
        if (itemDate) {
          if (filterState.dateFrom && itemDate < filterState.dateFrom) matchesDate = false;
          if (filterState.dateTo && itemDate > filterState.dateTo) matchesDate = false;
        }
      } else if (filterState.timeRange === 'this_month' && filterState.periodLabel) {
        if (filterState.periodLabel === 'Hôm qua') {
          if (itemDate !== '2026-10-16') matchesDate = false;
        } else if (filterState.periodLabel === 'Hôm nay') {
          if (itemDate !== '2026-10-17') matchesDate = false;
        } else if (filterState.periodLabel === 'Tháng trước') {
          if (!itemDate.startsWith('2026-09')) matchesDate = false;
        } else if (filterState.periodLabel === 'Tháng này') {
          if (!itemDate.startsWith('2026-10')) matchesDate = false;
        }
      }

      return matchesQuery && matchesCode && matchesProd && matchesSupp && matchesStatus && matchesDate;
    });
  }, [purchases, query, searchCode, searchProduct, searchSupplier, filterState]);

  const totalDebt = filtered.reduce((sum, p) => sum + p.debt, 0);

  // Paginated items (used in custom table renderer)
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const rangeStart = filtered.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filtered.length);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 w-full min-h-[calc(100vh-56px)] bg-[#f7f9fa] text-[#262626]">
      <div className="flex min-h-[calc(100vh-56px)]">

        {/* ── Left Sidebar (Desktop) ── */}
        <div className="hidden lg:flex relative shrink-0">
          <PurchaseFilterSidebar
            state={filterState}
            onChange={handleFilterChange}
            isCollapsed={sidebarCollapsed}
          />
          <button
            type="button"
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
            className="absolute right-0 top-1/2 z-20 flex h-5 w-5 translate-x-1/2 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500 shadow-sm transition hover:border-slate-400 hover:text-slate-800"
            title={sidebarCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
            aria-label={sidebarCollapsed ? 'Mở rộng bộ lọc' : 'Thu gọn bộ lọc'}
          >
            {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* ── Mobile Filter Drawer ── */}
        {mobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden bg-black/40 backdrop-blur-sm">
            <div className="relative w-[280px] max-w-[85vw] bg-white h-full overflow-y-auto">
              <PurchaseFilterSidebar
                state={filterState}
                onChange={(patch) => {
                  handleFilterChange(patch);
                }}
              />
            </div>
            <div className="flex-1 h-full" onClick={() => setMobileFilterOpen(false)} />
          </div>
        )}

        {/* ── Main Content ── */}
        <main className="min-w-0 flex-1 flex flex-col bg-white">

          {/* Toolbar / Action Bar */}
          <div className="border-b border-[#e5e7eb] bg-white px-6 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-4">

              {/* Left: Mobile filter button + Search bar & Advanced search dropdown (Photo 1 & Photo 2) */}
              <div className="flex items-center gap-2 flex-1 max-w-[480px]">
                <button
                  type="button"
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden h-9 px-3 rounded-[6px] border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shrink-0"
                >
                  <Filter size={15} />
                  <span>Bộ lọc</span>
                </button>

                <div className="relative flex-1" ref={searchBoxRef}>
                  <div
                    className={`h-9 px-3 bg-white border rounded-[6px] flex items-center justify-between gap-2 transition ${
                      searchDropdownOpen
                        ? 'border-blue-500 ring-2 ring-blue-100 shadow-xs'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <Search size={16} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={query}
                      placeholder="Theo mã phiếu nhập"
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPage(1);
                      }}
                      onFocus={() => setSearchDropdownOpen(true)}
                      className="w-full bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none"
                    />
                    {query && (
                      <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="text-slate-400 hover:text-slate-600 shrink-0"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSearchDropdownOpen((v) => !v);
                      }}
                      className="text-slate-600 hover:text-slate-900 shrink-0 p-1 rounded hover:bg-slate-100 transition cursor-pointer"
                      title="Tìm kiếm chi tiết"
                    >
                      <SlidersHorizontal size={15} />
                    </button>
                  </div>

                  {/* Advanced Search Dropdown (Matches Photo 2) */}
                  {searchDropdownOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full left-0 mt-1.5 w-full min-w-[340px] sm:min-w-[420px] bg-white rounded-xl border border-slate-200 shadow-xl p-4 z-40 animate-in fade-in zoom-in-95 duration-100"
                    >
                      <div className="space-y-3">
                        <div>
                          <input
                            type="text"
                            placeholder="Theo mã phiếu nhập"
                            value={searchCode}
                            onChange={(e) => setSearchCode(e.target.value)}
                            className="h-9 w-full rounded-[6px] border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Theo mã, tên hàng"
                            value={searchProduct}
                            onChange={(e) => setSearchProduct(e.target.value)}
                            className="h-9 w-full rounded-[6px] border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Theo mã, tên NCC"
                            value={searchSupplier}
                            onChange={(e) => setSearchSupplier(e.target.value)}
                            className="h-9 w-full rounded-[6px] border border-slate-300 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                        </div>
                      </div>

                      {/* Action buttons (Photo 2) */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSearchCode('');
                            setSearchProduct('');
                            setSearchSupplier('');
                            setQuery('');
                          }}
                          className="h-8 px-4 rounded-[6px] border border-slate-300 text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition"
                        >
                          Mở rộng
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchDropdownOpen(false);
                            setPage(1);
                          }}
                          className="h-8 px-5 rounded-[6px] bg-[#0071BA] hover:bg-[#005f9d] text-sm font-medium text-white shadow-xs cursor-pointer transition"
                        >
                          Tìm kiếm
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Actions matching Photo 3 */}
              <div className="flex items-center gap-2.5 shrink-0">
                {/* + Nhập hàng button (Photo 3: white bg, blue border, blue text) */}
                <Link
                  href="/purchases/create"
                  className="h-9 px-4 rounded-[6px] border border-[#0071BA] bg-white text-[#0071BA] hover:bg-blue-50 font-medium text-sm flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Plus size={16} />
                  <span>Nhập hàng</span>
                </Link>

                {/* Xuất file Dropdown (Photo 3) */}
                <div className="relative" ref={exportRef}>
                  <button
                    type="button"
                    onClick={() => setExportOpen((v) => !v)}
                    className="h-9 px-3.5 rounded-[6px] border border-slate-300 bg-white text-slate-700 hover:border-slate-400 font-medium text-sm flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <FileDown size={15} className="text-slate-600" />
                    <span>Xuất file</span>
                    <ChevronDown size={14} className="text-slate-500" />
                  </button>

                  {exportOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-full left-0 mt-1.5 w-44 bg-white rounded-lg border border-slate-200 shadow-lg py-1.5 z-40 animate-in fade-in duration-100"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setExportOpen(false);
                          message.success('Đang xuất File tổng quan...');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition block"
                      >
                        File tổng quan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportOpen(false);
                          message.success('Đang xuất File chi tiết...');
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition block"
                      >
                        File chi tiết
                      </button>
                    </div>
                  )}
                </div>

                {/* Column Customizer button (Photo 3) */}
                <button
                  type="button"
                  title="Tùy chỉnh cột"
                  className="h-9 w-9 flex items-center justify-center rounded-[6px] border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer"
                >
                  <AlignJustify size={16} />
                </button>

                {/* Settings button (Photo 3) */}
                <button
                  type="button"
                  title="Cài đặt"
                  className="h-9 w-9 flex items-center justify-center rounded-[6px] border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer"
                >
                  <Settings size={16} />
                </button>

                {/* Help button (Photo 3) */}
                <button
                  type="button"
                  title="Hướng dẫn"
                  className="h-9 w-9 flex items-center justify-center rounded-[6px] border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition cursor-pointer"
                >
                  <HelpCircle size={16} />
                </button>
              </div>

            </div>
          </div>

          {/* Table Area */}
          <div className="p-5 flex-1 flex flex-col bg-[#f8fafc]">

            {/* Total debt summary row */}
            {totalDebt > 0 && (
              <div className="mb-2 flex justify-end pr-[140px] text-sm font-medium text-slate-700">
                {currencyFormatter.format(totalDebt)}
              </div>
            )}

            {/* Custom Table with inline expand row detail (matching image 3) */}
            <div className="overflow-hidden rounded-lg border border-[#e5e7eb] bg-white shadow-xs">
              {/* Table Header */}
              <div className="bg-[#fafafa] border-b border-[#e5e7eb] flex items-center px-3 py-2 text-xs font-semibold text-slate-500 select-none">
                <div className="w-10 flex items-center justify-center">
                  <input type="checkbox" className="accent-[#0071BA]"
                    checked={selectedRowKeys.length === pagedItems.length && pagedItems.length > 0}
                    onChange={(e) => setSelectedRowKeys(e.target.checked ? pagedItems.map(r => r.key) : [])}
                  />
                </div>
                <div className="w-10"></div>
                <div className="w-36 font-semibold text-[#0071BA]">Mã nhập hàng</div>
                <div className="w-44">Thời gian</div>
                <div className="w-36">Mã NCC</div>
                <div className="flex-1">Nhà cung cấp</div>
                <div className="w-36 shrink-0 pr-3 text-right">Cần trả NCC</div>
                <div className="w-36 shrink-0 pl-2">Trạng thái</div>
              </div>

              {/* Table Rows */}
              {pagedItems.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">Không có dữ liệu</div>
              ) : (
                pagedItems.map((record) => {
                  const isExpanded = expandedRowKey === record.key;
                  const detail = PURCHASE_DETAILS[record.code] ?? { items: [], note: '' };
                  const detailItems = detail.items;
                  const statusBg =
                    record.status === 'draft' ? 'bg-[#fffbe6]' :
                    record.status === 'canceled' ? 'bg-rose-50/40' : '';

                  return (
                    <React.Fragment key={record.key}>
                      {/* Main Row */}
                      <div
                        className={`flex items-center px-3 py-2.5 border-b border-[#f0f0f0] text-sm cursor-pointer transition hover:bg-blue-50/40 ${statusBg} ${isExpanded ? 'bg-blue-50/60 border-b-0' : ''}`}
                        onClick={() => handleRowClick(record)}
                      >
                        <div className="w-10 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="accent-[#0071BA]"
                            checked={selectedRowKeys.includes(record.key)}
                            onChange={(e) => {
                              setSelectedRowKeys(prev =>
                                e.target.checked ? [...prev, record.key] : prev.filter(k => k !== record.key)
                              );
                            }}
                          />
                        </div>
                        <div className="w-10 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => toggleFavorite(record.key)} className="text-amber-400 hover:text-amber-500">
                            {record.favorite ? <StarFilled /> : <StarOutlined />}
                          </button>
                        </div>
                        <div className="w-36 font-mono text-xs font-semibold text-[#0071BA]">{record.code}</div>
                        <div className="w-44 text-xs text-[#8c8c8c]">{record.createdAt}</div>
                        <div className="w-36 font-mono text-xs text-[#595959]">{record.supplierCode}</div>
                        <div className="flex-1 text-sm text-[#262626]">{record.supplierName}</div>
                        <div className={`w-36 shrink-0 pr-3 text-right text-sm font-medium ${record.debt > 0 ? 'text-rose-600' : 'text-[#262626]'}`}>
                          {record.debt > 0 ? currencyFormatter.format(record.debt) : '0'}
                        </div>
                        <div className="w-36 shrink-0 pl-2">{statusTag(record.status)}</div>
                      </div>

                      {/* Expanded Detail Panel (Image 3) */}
                      {isExpanded && (
                        <div className="border-b border-[#0071BA]/30 bg-white animate-in fade-in duration-150">
                          <div className="px-6 py-4">
                            {/* Tab Bar */}
                            <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
                              <button type="button" className="shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold text-[#0071BA] border-b-2 border-[#0071BA] -mb-px">
                                Thông tin
                              </button>
                            </div>

                            {/* Header Info Row */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="flex items-center gap-2.5 mb-1.5">
                                  <span className="text-base font-bold text-slate-900 font-mono">{record.code}</span>
                                  {statusTag(record.status)}
                                </div>
                                <div className="grid grid-cols-3 gap-x-8 gap-y-1 text-xs text-slate-600">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400">Người tạo:</span>
                                    <span className="font-medium text-slate-700">0947685599</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-slate-400">Người nhập:</span>
                                    <div className="relative">
                                      <select className="text-xs border border-slate-200 rounded px-2 py-0.5 text-slate-700 pr-6 appearance-none bg-white focus:outline-none focus:border-blue-400 cursor-pointer">
                                        <option>0947685599</option>
                                        <option>Quản trị viên</option>
                                      </select>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-slate-400">Ngày nhập:</span>
                                    <div className="flex items-center gap-1 border border-slate-200 rounded px-2 py-0.5 bg-white">
                                      <span className="text-slate-700 font-medium">{record.createdAt}</span>
                                      <Calendar size={12} className="text-slate-400" />
                                    </div>
                                  </div>
                                </div>
                                <div className="mt-1.5 text-xs text-slate-600 flex items-center gap-1.5">
                                  <span className="text-slate-400">Tên NCC:</span>
                                  <span className="text-[#0071BA] font-medium cursor-pointer hover:underline">{record.supplierName}</span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 font-medium">Chi nhánh trung tâm</div>
                            </div>

                            {/* Product Table in detail */}
                            <div className="border border-slate-200 rounded-lg overflow-hidden mb-3">
                              {/* Product Table Header */}
                              <div className="bg-slate-50 border-b border-slate-200 flex items-center px-3 py-2 text-xs font-semibold text-slate-500">
                                <div className="w-32">Mã hàng</div>
                                <div className="flex-1">Tên hàng</div>
                                <div className="w-24 text-center">Số lượng</div>
                                <div className="w-24 text-right">Đơn giá</div>
                                <div className="w-24 text-right">Giảm giá</div>
                                <div className="w-24 text-right">Giá nhập</div>
                                <div className="w-28 text-right">Thành tiền</div>
                                <div className="w-8"></div>
                              </div>
                              {/* Search row */}
                              <div className="border-b border-slate-100 flex items-center px-3 py-1.5 bg-white gap-2">
                                <input
                                  type="text"
                                  placeholder="Tìm mã hàng"
                                  className="w-32 h-7 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-400"
                                />
                                <input
                                  type="text"
                                  placeholder="Tìm tên hàng"
                                  className="w-44 h-7 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-400"
                                />
                                <div className="flex-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPriceSettingItems(
                                      detailItems.map((item) => ({
                                        id: item.code,
                                        name: item.name,
                                        costPrice: item.costPrice,
                                        lastPurchasePrice: item.unitPrice,
                                        salePrice: priceValues[item.code]
                                          ? Number(priceValues[item.code])
                                          : 0,
                                      }))
                                    );
                                    setPriceDialogOpen(true);
                                  }}
                                  className="text-xs text-[#0071BA] font-medium hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <Info size={12} />
                                  Thiết lập giá
                                </button>
                              </div>
                              {/* Product rows */}
                              {detailItems.map((item, i) => (
                                <div key={i} className="flex items-center px-3 py-2 text-xs text-slate-700 border-b border-slate-50 hover:bg-slate-50">
                                  <div className="w-32 font-mono text-[#0071BA] font-semibold">{item.code}</div>
                                  <div className="flex-1 font-medium">{item.name}</div>
                                  <div className="w-24 text-center">{item.qty.toLocaleString('vi-VN')}</div>
                                  <div className="w-24 text-right">{item.unitPrice}</div>
                                  <div className="w-24 text-right">{item.discount}</div>
                                  <div className="w-24 text-right">{item.costPrice}</div>
                                  <div className="w-28 text-right">{item.costPrice}</div>
                                  <div className="w-8 flex justify-center">
                                    <button type="button" className="text-slate-300 hover:text-slate-500 cursor-pointer">
                                      <X size={13} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Bottom area: Notes + Summary side by side */}
                            <div className="flex items-start gap-4 mb-4">
                              <textarea
                                placeholder="Ghi chú..."
                                rows={3}
                                defaultValue={detail.note}
                                className="flex-1 p-2 text-xs border border-slate-200 rounded-lg resize-none text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-blue-400"
                              />
                              <div className="w-64 shrink-0 space-y-1.5 text-xs">
                                <div className="flex justify-between text-slate-600">
                                  <span>Số lượng mặt hàng</span>
                                  <span className="font-medium text-slate-800">{detailItems.length}</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>Tổng tiền hàng ({detailItems.reduce((s, i) => s + i.qty, 0).toLocaleString('vi-VN')})</span>
                                  <span className="font-medium text-slate-800">0</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span className="flex items-center gap-1">Giảm giá <Info size={11} className="text-slate-400"/></span>
                                  <span className="font-medium text-slate-800">0</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                  <span>Tổng cộng</span>
                                  <span className="font-medium text-slate-800">0</span>
                                </div>
                                <div className="flex justify-between text-slate-600 border-t border-slate-100 pt-1.5">
                                  <span>Tiền đã trả NCC</span>
                                  <span className="font-medium text-slate-800">0</span>
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons (Image 3 bottom bar) */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => message.info('Hủy phiếu')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-[6px] transition cursor-pointer border border-slate-200 bg-white">
                                  <Trash2 size={13} />
                                  <span>Hủy</span>
                                </button>
                                <button type="button" onClick={() => message.info('Sao chép phiếu')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-[6px] transition cursor-pointer border border-slate-200 bg-white">
                                  <Copy size={13} />
                                  <span>Sao chép</span>
                                </button>
                                <button type="button" onClick={() => message.info('Xuất file phiếu')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-[6px] transition cursor-pointer border border-slate-200 bg-white">
                                  <FileDown size={13} />
                                  <span>Xuất file</span>
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => message.info('Mở phiếu để chỉnh sửa')} className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#0071BA] hover:bg-[#005f9d] text-white rounded-[6px] font-medium transition cursor-pointer shadow-xs">
                                  <Pencil size={13} />
                                  <span>Mở phiếu</span>
                                </button>
                                <button type="button" onClick={() => message.success('Đã lưu phiếu')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-[6px] transition cursor-pointer border border-slate-200 bg-white">
                                  <span>Lưu</span>
                                </button>
                                <button type="button" onClick={() => message.info('Trả hàng nhập')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-[6px] transition cursor-pointer border border-slate-200 bg-white">
                                  <RefreshCcw size={13} />
                                  <span>Trả hàng nhập</span>
                                </button>
                                <button type="button" onClick={() => message.info('In tem mã')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-[6px] transition cursor-pointer border border-slate-200 bg-white">
                                  <Printer size={13} />
                                  <span>In tem mã</span>
                                </button>
                                <button type="button" onClick={() => message.info('Thêm thao tác')} className="flex items-center px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-[6px] transition cursor-pointer border border-slate-200 bg-white">
                                  <MoreHorizontal size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </div>

            {/* Pagination Footer */}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 px-1 py-3">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <label htmlFor="purchase-page-size">Hiển thị</label>
                <select
                  id="purchase-page-size"
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-7 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value={15}>15 dòng</option>
                  <option value={30}>30 dòng</option>
                  <option value={50}>50 dòng</option>
                  <option value={100}>100 dòng</option>
                </select>
                {selectedRowKeys.length > 0 && (
                  <span className="text-slate-500">Đã chọn {selectedRowKeys.length} phiếu</span>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPage(1)}
                    disabled={page <= 1}
                    aria-label="Trang đầu"
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronsLeft size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    aria-label="Trang trước"
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="flex h-7 min-w-10 items-center justify-center rounded border border-slate-300 bg-white px-2 text-slate-800" aria-current="page">
                    {page}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                    disabled={page >= pageCount}
                    aria-label="Trang tiếp"
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage(pageCount)}
                    disabled={page >= pageCount}
                    aria-label="Trang cuối"
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronsRight size={14} />
                  </button>
                </div>
                <span>{rangeStart}-{rangeEnd} trong {filtered.length} giao dịch</span>
              </div>
            </div>
          </div>
        </main>
      </div>

      {priceDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-3 py-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPriceDialogOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-price-dialog-title"
            className="flex max-h-full w-full max-w-[1200px] flex-col overflow-hidden rounded-lg bg-white shadow-2xl"
          >
            <header className="flex items-center justify-between px-4 py-3">
              <h2 id="purchase-price-dialog-title" className="text-sm font-semibold text-slate-800">
                Thiết lập giá cho hàng nhập
              </h2>
              <button
                type="button"
                onClick={() => setPriceDialogOpen(false)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Đóng"
              >
                <X size={15} />
              </button>
            </header>

            <div className="flex items-center gap-2 border-y border-slate-200 px-4 py-2.5 text-xs">
              <label htmlFor="purchase-price-list" className="shrink-0 text-slate-600">
                Chọn bảng giá áp dụng
              </label>
              <select
                id="purchase-price-list"
                value={selectedPriceList}
                onChange={(event) => setSelectedPriceList(event.target.value)}
                className="h-7 min-w-0 rounded border border-slate-300 bg-white px-2 text-xs text-slate-700 outline-none focus:border-blue-500"
              >
                <option>Bảng giá chung</option>
                <option>Bảng giá bán lẻ</option>
                <option>Bảng giá đại lý</option>
              </select>
            </div>

            <div className="overflow-auto px-4">
              <table className="w-full min-w-[520px] table-fixed text-xs text-slate-700">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="w-[42%] py-2 pr-2 font-semibold">Tên hàng</th>
                    <th className="w-[18%] py-2 px-2 font-semibold">Giá vốn</th>
                    <th className="w-[20%] py-2 px-2 font-semibold">Giá nhập cuối</th>
                    <th className="w-[20%] py-2 pl-2 text-right font-semibold">Giá bán chung</th>
                  </tr>
                </thead>
                <tbody>
                  {priceSettingItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-200 last:border-b-0">
                      <td className="py-2 pr-2 leading-4">{item.name}</td>
                      <td className="px-2 py-2">{currencyFormatter.format(item.costPrice)}</td>
                      <td className="px-2 py-2">{currencyFormatter.format(item.lastPurchasePrice)}</td>
                      <td className="py-1.5 pl-2">
                        <input
                          type="number"
                          min="0"
                          value={priceValues[item.id] ?? String(item.salePrice)}
                          onChange={(event) => {
                            const value = event.target.value;
                            setPriceValues((current) => ({ ...current, [item.id]: value }));
                            setPriceSettingItems((current) =>
                              current.map((priceItem) =>
                                priceItem.id === item.id
                                  ? { ...priceItem, salePrice: Number(value) || 0 }
                                  : priceItem
                              )
                            );
                          }}
                          aria-label={`Giá bán chung: ${item.name}`}
                          className="h-[22px] w-full rounded border border-slate-300 px-2 text-right text-[11px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="flex justify-end gap-2 px-4 py-3">
              <button
                type="button"
                onClick={() => setPriceDialogOpen(false)}
                className="h-8 rounded border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-50"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => {
                  setPriceDialogOpen(false);
                  message.success(`Đã cập nhật giá theo ${selectedPriceList}`);
                }}
                className="h-8 rounded bg-[#0071BA] px-3 text-xs font-medium text-white hover:bg-[#005f9d]"
              >
                Xong
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
