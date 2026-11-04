// src/app/(dashboard)/orders/OrdersClient.tsx
// Màn hình Quản lý Đơn hàng chuẩn Enterprise StockFlow Tín Phát với Bộ lọc KiotViet

'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  PlusCircle,
  Download,
  FileSpreadsheet,
  RotateCw,
  RotateCcw,
  Filter,
  Calendar,
  Printer,
  X,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  Tag,
  CreditCard,
  Layers,
  Inbox,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { posService, OrderFilterParams } from '@/features/pos/services/posService';
import { apiClient } from '@/lib/api/client';
import { message, Modal, Tooltip } from 'antd';
import { KiotVietOrderDetail } from '@/features/orders/components/KiotVietOrderDetail';

const currencyFormatter = new Intl.NumberFormat('vi-VN');

// Kiểu dữ liệu đơn hàng hiển thị
export interface OrderRecord {
  orderId: number;
  orderCode: string;
  isPinned: boolean;
  orderDate: string;
  orderTime: string;
  partnerName: string;
  partnerPhone: string;
  partnerGroup: 'VIP 1' | 'Đại lý 1' | 'Đại lý 2' | 'Dự án' | 'Bán buôn' | 'Bán lẻ';
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod: string;
  paymentStatus: 'PAID' | 'PARTIAL' | 'UNPAID' | 'DEBT';
  status: 'COMPLETED' | 'CANCELLED' | 'PENDING' | 'PROCESSING';
  hasReturn: boolean;
  totalItems: number;
  warehouseId?: number;
  warehouseName: string;
  salesRep: string;
}

// Interface Chi nhánh và Bảng giá
interface WarehouseOption {
  warehouseId: number;
  name: string;
  code?: string;
}

interface PriceBookOption {
  priceBookId: number;
  priceBookName: string;
}

// Dữ liệu mẫu fallback
const SAMPLE_MOCK_ORDERS: OrderRecord[] = [
  {
    orderId: 123,
    orderCode: '#HD000123',
    isPinned: true,
    orderDate: '31/10/2026',
    orderTime: '23:05:12',
    partnerName: 'Công ty CP Thiết bị CN Nam Á',
    partnerPhone: '0912 345 678',
    partnerGroup: 'VIP 1',
    totalAmount: 37840000,
    discountAmount: 491500,
    paidAmount: 20000000,
    outstandingAmount: 17840000,
    paymentMethod: 'Chuyển khoản (VietQR / Techcombank)',
    paymentStatus: 'PARTIAL',
    status: 'COMPLETED',
    hasReturn: false,
    totalItems: 4,
    warehouseId: 3,
    warehouseName: 'Kho Tổng Gia Lâm',
    salesRep: 'Trần Minh Tuấn',
  },
  {
    orderId: 122,
    orderCode: '#HD000122',
    isPinned: true,
    orderDate: '31/10/2026',
    orderTime: '21:40:08',
    partnerName: 'Tập Đoàn VT Song Long',
    partnerPhone: '0904 888 999',
    partnerGroup: 'Đại lý 1',
    totalAmount: 28500000,
    discountAmount: 0,
    paidAmount: 28500000,
    outstandingAmount: 0,
    paymentMethod: 'Chuyển khoản (VietQR / Techcombank)',
    paymentStatus: 'PAID',
    status: 'COMPLETED',
    hasReturn: false,
    totalItems: 3,
    warehouseId: 3,
    warehouseName: 'Kho Tổng Gia Lâm',
    salesRep: 'Nguyễn Văn Đức',
  },
  {
    orderId: 121,
    orderCode: '#HD000121',
    isPinned: false,
    orderDate: '31/10/2026',
    orderTime: '19:15:30',
    partnerName: 'Chi Nhánh Viettel Hà Nội',
    partnerPhone: '024 6266 0198',
    partnerGroup: 'Dự án',
    totalAmount: 84200000,
    discountAmount: 1200000,
    paidAmount: 50000000,
    outstandingAmount: 34200000,
    paymentMethod: 'Chuyển khoản (VietQR / Techcombank)',
    paymentStatus: 'PARTIAL',
    status: 'COMPLETED',
    hasReturn: true,
    totalItems: 8,
    warehouseId: 4,
    warehouseName: 'Kho Đông Anh',
    salesRep: 'Lê Hoàng Nam',
  },
  {
    orderId: 120,
    orderCode: '#HD000120',
    isPinned: false,
    orderDate: '31/10/2026',
    orderTime: '17:02:44',
    partnerName: 'Tin Học Việt (Anh Hoàng)',
    partnerPhone: '0988 123 456',
    partnerGroup: 'Bán buôn',
    totalAmount: 15620000,
    discountAmount: 150000,
    paidAmount: 15620000,
    outstandingAmount: 0,
    paymentMethod: 'Tiền mặt',
    paymentStatus: 'PAID',
    status: 'COMPLETED',
    hasReturn: false,
    totalItems: 2,
    warehouseId: 5,
    warehouseName: 'Kho Hà Đông',
    salesRep: 'Hoàng Lan Anh',
  },
  {
    orderId: 119,
    orderCode: '#HD000119',
    isPinned: false,
    orderDate: '31/10/2026',
    orderTime: '14:20:10',
    partnerName: 'Nguyễn Thị Mai (Bán lẻ)',
    partnerPhone: '0977 456 789',
    partnerGroup: 'Bán lẻ',
    totalAmount: 4200000,
    discountAmount: 0,
    paidAmount: 4200000,
    outstandingAmount: 0,
    paymentMethod: 'Tiền mặt',
    paymentStatus: 'PAID',
    status: 'COMPLETED',
    hasReturn: false,
    totalItems: 1,
    warehouseId: 3,
    warehouseName: 'Kho Tổng Gia Lâm',
    salesRep: 'Thu ngân quầy',
  },
];

interface OrdersClientProps {
  onNavigate?: (screenId: string) => void;
}

export default function OrdersClient({ onNavigate }: OrdersClientProps) {
  const router = useRouter();

  // Danh sách đơn hàng & Phân trang từ backend
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Phân trang
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Danh mục Chi nhánh & Bảng giá
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [priceBooks, setPriceBooks] = useState<PriceBookOption[]>([]);

  // ─── STATE BỘ LỌC KIOTVIET (DẢI NGANG TRÊN CÙNG) ───────────────────────────
  // 1.1 Chi nhánh (Kho)
  const [filterWarehouseId, setFilterWarehouseId] = useState<string>('ALL');

  // 1.2 Thời gian
  type TimePreset = 'THIS_MONTH' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'CUSTOM';
  const [timePreset, setTimePreset] = useState<TimePreset>('THIS_MONTH');
  const [customFromDate, setCustomFromDate] = useState<string>('');
  const [customToDate, setCustomToDate] = useState<string>('');
  const [dateError, setDateError] = useState<string | null>(null);

  // 1.3 Trạng thái đơn hàng (Đa chọn: COMPLETED, CANCELLED)
  const [statusCompleted, setStatusCompleted] = useState<boolean>(false);
  const [statusCancelled, setStatusCancelled] = useState<boolean>(false);

  // 1.4 Trạng thái trả hàng
  const [filterReturnStatus, setFilterReturnStatus] = useState<'ALL' | 'NO_RETURN' | 'HAS_RETURN'>('ALL');

  // 1.5 Phương thức thanh toán
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>('ALL');

  // 1.6 Bảng giá
  const [filterPriceBookName, setFilterPriceBookName] = useState<string>('ALL');

  // Snapshot điều kiện ĐANG ÁP DỤNG (chỉ thay đổi khi bấm "Lọc" hoặc "Đặt lại")
  const [appliedFilters, setAppliedFilters] = useState<{
    warehouseId: string;
    timePreset: TimePreset;
    fromDate?: string;
    toDate?: string;
    statuses: string[];
    returnStatus: string;
    paymentMethod: string;
    priceBookName: string;
  }>({
    warehouseId: 'ALL',
    timePreset: 'THIS_MONTH',
    statuses: [],
    returnStatus: 'ALL',
    paymentMethod: 'ALL',
    priceBookName: 'ALL',
  });

  // State chọn checkbox đơn hàng (Bulk selection)
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // ─── TẢI DANH MỤC CHI NHÁNH & BẢNG GIÁ ─────────────────────────────────────
  useEffect(() => {
    const fetchMasterData = async () => {
      // 1. Lấy danh sách kho
      try {
        let whData = await apiClient.get<any[]>('/api/warehouses/my-warehouses');
        if (!Array.isArray(whData) || whData.length === 0) {
          whData = await apiClient.get<any[]>('/api/warehouses');
        }
        if (Array.isArray(whData)) {
          setWarehouses(
            whData.map((w: any) => ({
              warehouseId: Number(w.warehouseId || w.id),
              name: w.name || w.warehouseName || `Kho #${w.warehouseId}`,
              code: w.code || w.warehouseCode || '',
            }))
          );
        }
      } catch (err) {
        console.warn('Dùng kho mặc định Tín Phát:', err);
        setWarehouses([
          { warehouseId: 3, name: 'Kho Tổng Gia Lâm', code: 'K001' },
          { warehouseId: 4, name: 'Kho Đông Anh', code: 'K002' },
          { warehouseId: 5, name: 'Kho Hà Đông', code: 'K003' },
          { warehouseId: 6, name: 'Kho Hoàn Kiếm', code: 'K004' },
        ]);
      }

      // 2. Lấy danh sách bảng giá
      try {
        const pbData = await apiClient.get<any[]>('/api/price-books');
        if (Array.isArray(pbData)) {
          setPriceBooks(
            pbData.map((p: any) => ({
              priceBookId: Number(p.priceBookId || p.id),
              priceBookName: p.priceBookName || p.name || `Bảng giá #${p.priceBookId}`,
            }))
          );
        }
      } catch (err) {
        console.warn('Lỗi tải bảng giá:', err);
      }
    };

    fetchMasterData();
  }, []);

  // ─── TÍNH TOÁN KHOẢNG NGÀY THEO PRESET ─────────────────────────────────────
  const computeDateRange = useCallback((preset: TimePreset, customFrom: string, customTo: string) => {
    const now = new Date();
    if (preset === 'TODAY') {
      const d = now.toISOString().split('T')[0];
      return { from: d, to: d };
    }
    if (preset === 'YESTERDAY') {
      const y = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const d = y.toISOString().split('T')[0];
      return { from: d, to: d };
    }
    if (preset === 'LAST_7_DAYS') {
      const s = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { from: s.toISOString().split('T')[0], to: now.toISOString().split('T')[0] };
    }
    if (preset === 'THIS_MONTH') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        from: startOfMonth.toISOString().split('T')[0],
        to: endOfMonth.toISOString().split('T')[0],
      };
    }
    if (preset === 'CUSTOM') {
      return {
        from: customFrom || undefined,
        to: customTo || undefined,
      };
    }
    return { from: undefined, to: undefined };
  }, []);

  // ─── TẢI DỮ LIỆU ĐƠN HÀNG TỪ BACKEND ───────────────────────────────────────
  const fetchOrdersFromBackend = useCallback(async (filters: typeof appliedFilters, page: number, pSize: number, searchKeyword: string) => {
    setLoading(true);
    try {
      const { from, to } = computeDateRange(filters.timePreset, filters.fromDate || '', filters.toDate || '');

      const params: OrderFilterParams = {
        search: searchKeyword.trim() || undefined,
        status: filters.statuses.length > 0 ? filters.statuses.join(',') : undefined,
        warehouseId: filters.warehouseId !== 'ALL' ? Number(filters.warehouseId) : undefined,
        fromDate: from,
        toDate: to,
        returnStatus: filters.returnStatus !== 'ALL' ? filters.returnStatus : undefined,
        paymentMethod: filters.paymentMethod !== 'ALL' ? filters.paymentMethod : undefined,
        priceBookName: filters.priceBookName !== 'ALL' ? filters.priceBookName : undefined,
        page,
        pageSize: pSize,
      };

      const res = await posService.getRecentOrders(params);

      let items: any[] = [];
      let total = 0;

      if (res && Array.isArray(res.items)) {
        items = res.items;
        total = Number(res.totalCount) || items.length;
      } else if (Array.isArray(res)) {
        items = res;
        total = items.length;
      }

      if (items.length > 0) {
        const mappedOrders: OrderRecord[] = items.map((o: any, idx: number) => {
          const d = o.orderDate ? new Date(o.orderDate) : new Date();
          const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
          const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;

          let group: OrderRecord['partnerGroup'] = 'Bán lẻ';
          if (o.partnerName?.includes('Nam Á')) group = 'VIP 1';
          else if (o.partnerName?.includes('Song Long') || o.partnerName?.includes('Á Âu')) group = 'Đại lý 1';
          else if (o.partnerName?.includes('Viettel')) group = 'Dự án';
          else if (o.partnerName?.includes('Hưng Thịnh') || o.partnerName?.includes('Ninh Ha')) group = 'Bán buôn';

          let methodLabel = o.paymentMethod || 'Tiền mặt';
          if (methodLabel === 'CASH') methodLabel = 'Tiền mặt';
          else if (methodLabel === 'VIETQR') methodLabel = 'Chuyển khoản (VietQR / Techcombank)';
          else if (methodLabel === 'POS_CARD') methodLabel = 'Quẹt thẻ máy POS';
          else if (methodLabel === 'DEBT') methodLabel = 'Ghi nợ đại lý';

          return {
            orderId: o.orderId,
            orderCode: o.orderCode?.startsWith('#') ? o.orderCode : `#${o.orderCode}`,
            isPinned: idx < 2,
            orderDate: dateStr,
            orderTime: timeStr,
            partnerName: o.partnerName || 'Khách lẻ tại quầy',
            partnerPhone: o.partnerPhone || '',
            partnerGroup: group,
            totalAmount: Number(o.totalAmount) || 0,
            discountAmount: Number(o.discountAmount) || 0,
            paidAmount: Number(o.paidAmount) || 0,
            outstandingAmount: Number(o.outstandingAmount) || 0,
            paymentMethod: methodLabel,
            paymentStatus: (o.paymentStatus as any) || 'PAID',
            status: (o.status as any) || 'COMPLETED',
            hasReturn: Boolean(o.hasReturn),
            totalItems: Number(o.totalItems) || 1,
            warehouseId: o.warehouseId,
            warehouseName: o.warehouseName || 'Kho Tổng Gia Lâm',
            salesRep: 'Trần Minh Tuấn',
          };
        });

        setOrders(mappedOrders);
        setTotalCount(total);
      } else {
        // Nếu không có dữ liệu khớp với bộ lọc
        setOrders([]);
        setTotalCount(0);
      }
    } catch (e: any) {
      console.warn('Lỗi khi tải đơn hàng:', e);
      message.error(e?.message || 'Không thể tải danh sách đơn hàng thực tế từ hệ thống.');
      setOrders([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [computeDateRange]);

  // Nạp dữ liệu lần đầu
  useEffect(() => {
    fetchOrdersFromBackend(appliedFilters, currentPage, pageSize, search);
  }, [fetchOrdersFromBackend, appliedFilters, currentPage, pageSize, search]);

  // Phím tắt F1 (Mở POS) và F3 (Focus tìm kiếm)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        if (onNavigate) {
          onNavigate('pos');
        } else {
          router.push('/pos');
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, onNavigate]);

  // ─── VALIDATION NGÀY TÙY CHỈNH ─────────────────────────────────────────────
  useEffect(() => {
    if (timePreset === 'CUSTOM' && customFromDate && customToDate) {
      if (new Date(customFromDate) > new Date(customToDate)) {
        setDateError('Ngày bắt đầu không được lớn hơn ngày kết thúc');
      } else {
        setDateError(null);
      }
    } else {
      setDateError(null);
    }
  }, [timePreset, customFromDate, customToDate]);

  // ─── ÁP DỤNG BỘ LỌC KHI BẤM NÚT "LỌC" ─────────────────────────────────────
  const handleApplyFilter = () => {
    if (timePreset === 'CUSTOM') {
      if (!customFromDate || !customToDate) {
        message.warning('Vui lòng chọn đầy đủ cả "Từ ngày" và "Đến ngày" khi sử dụng khoảng thời gian tùy chỉnh!');
        return;
      }
      if (new Date(customFromDate) > new Date(customToDate)) {
        message.error('Khoảng ngày không hợp lệ: Từ ngày phải nhỏ hơn hoặc bằng Đến ngày!');
        return;
      }
    }

    const stArr: string[] = [];
    if (statusCompleted) stArr.push('COMPLETED');
    if (statusCancelled) stArr.push('CANCELLED');

    const newApplied = {
      warehouseId: filterWarehouseId,
      timePreset,
      fromDate: customFromDate,
      toDate: customToDate,
      statuses: stArr,
      returnStatus: filterReturnStatus,
      paymentMethod: filterPaymentMethod,
      priceBookName: filterPriceBookName,
    };

    setAppliedFilters(newApplied);
    setCurrentPage(1); // Reset về trang 1 khi lọc mới
    message.success('Đã áp dụng bộ lọc đơn hàng');
  };

  // ─── ĐẶT LẠI TẤT CẢ ĐIỀU KIỆN LỌC VỀ MẶC ĐỊNH ────────────────────────────
  const handleResetFilters = () => {
    setFilterWarehouseId('ALL');
    setTimePreset('THIS_MONTH');
    setCustomFromDate('');
    setCustomToDate('');
    setDateError(null);
    setStatusCompleted(false);
    setStatusCancelled(false);
    setFilterReturnStatus('ALL');
    setFilterPaymentMethod('ALL');
    setFilterPriceBookName('ALL');
    setSearch('');

    const defaultApplied = {
      warehouseId: 'ALL',
      timePreset: 'THIS_MONTH' as TimePreset,
      statuses: [],
      returnStatus: 'ALL',
      paymentMethod: 'ALL',
      priceBookName: 'ALL',
    };

    setAppliedFilters(defaultApplied);
    setCurrentPage(1);
    message.info('Đã đặt lại toàn bộ điều kiện lọc về mặc định');
  };

  // ─── XÓA TỪNG THẺ ĐIỀU KIỆN LỌC (ACTIVE FILTER TAGS) ──────────────────────
  const handleRemoveFilterTag = (tagType: string) => {
    const updated = { ...appliedFilters };

    if (tagType === 'warehouse') {
      updated.warehouseId = 'ALL';
      setFilterWarehouseId('ALL');
    } else if (tagType === 'time') {
      updated.timePreset = 'THIS_MONTH';
      updated.fromDate = undefined;
      updated.toDate = undefined;
      setTimePreset('THIS_MONTH');
      setCustomFromDate('');
      setCustomToDate('');
    } else if (tagType === 'status_completed') {
      updated.statuses = updated.statuses.filter((s) => s !== 'COMPLETED');
      setStatusCompleted(false);
    } else if (tagType === 'status_cancelled') {
      updated.statuses = updated.statuses.filter((s) => s !== 'CANCELLED');
      setStatusCancelled(false);
    } else if (tagType === 'return') {
      updated.returnStatus = 'ALL';
      setFilterReturnStatus('ALL');
    } else if (tagType === 'payment') {
      updated.paymentMethod = 'ALL';
      setFilterPaymentMethod('ALL');
    } else if (tagType === 'pricebook') {
      updated.priceBookName = 'ALL';
      setFilterPriceBookName('ALL');
    }

    setAppliedFilters(updated);
    setCurrentPage(1);
  };

  // ─── TÍNH TOÁN DANH SÁCH THẺ ĐANG LỌC ĐỂ HIỂN THỊ ─────────────────────────
  const activeFilterTags = useMemo(() => {
    const tags: { id: string; label: string }[] = [];

    if (appliedFilters.warehouseId !== 'ALL') {
      const wh = warehouses.find((w) => String(w.warehouseId) === appliedFilters.warehouseId);
      tags.push({ id: 'warehouse', label: `Chi nhánh: ${wh ? wh.name : appliedFilters.warehouseId}` });
    }

    if (appliedFilters.timePreset === 'CUSTOM') {
      tags.push({
        id: 'time',
        label: `Thời gian: ${appliedFilters.fromDate || '...'} → ${appliedFilters.toDate || '...'}`,
      });
    } else if (appliedFilters.timePreset !== 'THIS_MONTH') {
      const labels: Record<string, string> = {
        TODAY: 'Hôm nay',
        YESTERDAY: 'Hôm qua',
        LAST_7_DAYS: '7 ngày qua',
      };
      tags.push({ id: 'time', label: `Thời gian: ${labels[appliedFilters.timePreset] || appliedFilters.timePreset}` });
    }

    if (appliedFilters.statuses.includes('COMPLETED')) {
      tags.push({ id: 'status_completed', label: 'Trạng thái: Hoàn thành' });
    }
    if (appliedFilters.statuses.includes('CANCELLED')) {
      tags.push({ id: 'status_cancelled', label: 'Trạng thái: Đã hủy' });
    }

    if (appliedFilters.returnStatus === 'NO_RETURN') {
      tags.push({ id: 'return', label: 'Trả hàng: Không trả hàng' });
    } else if (appliedFilters.returnStatus === 'HAS_RETURN') {
      tags.push({ id: 'return', label: 'Trả hàng: Có trả hàng' });
    }

    if (appliedFilters.paymentMethod !== 'ALL') {
      const methodMap: Record<string, string> = {
        CASH: 'Tiền mặt',
        VIETQR: 'Chuyển khoản (VietQR)',
        POS_CARD: 'Quẹt thẻ máy POS',
        DEBT: 'Ghi nợ đại lý',
      };
      tags.push({ id: 'payment', label: `Thanh toán: ${methodMap[appliedFilters.paymentMethod] || appliedFilters.paymentMethod}` });
    }

    if (appliedFilters.priceBookName !== 'ALL') {
      tags.push({ id: 'pricebook', label: `Bảng giá: ${appliedFilters.priceBookName}` });
    }

    return tags;
  }, [appliedFilters, warehouses]);

  // Xử lý chọn/bỏ chọn checkbox từng dòng
  const handleToggleSelectRow = (orderId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Chọn/Bỏ chọn tất cả dòng
  const isAllSelected = orders.length > 0 && orders.every((o) => selectedOrderIds.includes(o.orderId));
  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(orders.map((o) => o.orderId));
    }
  };

  // Tính toán số liệu Bulk Action Bar
  const selectedOrdersData = useMemo(() => {
    const selected = orders.filter((o) => selectedOrderIds.includes(o.orderId));
    const totalVal = selected.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalDebt = selected.reduce((sum, o) => sum + o.outstandingAmount, 0);
    return {
      count: selected.length,
      totalVal,
      totalDebt,
    };
  }, [orders, selectedOrderIds]);

  // Tính toán tổng trang (Summary footer)
  const pageSummary = useMemo(() => {
    const sumTotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const sumDiscount = orders.reduce((sum, o) => sum + o.discountAmount, 0);
    const sumPaid = orders.reduce((sum, o) => sum + o.paidAmount, 0);
    const sumDebt = orders.reduce((sum, o) => sum + o.outstandingAmount, 0);
    return {
      displayedCount: orders.length,
      sumTotal,
      sumDiscount,
      sumPaid,
      sumDebt,
    };
  }, [orders]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="p-4 md:p-5 space-y-3 bg-[#F4F6F9] min-h-full text-slate-800 text-xs select-none">
      {/* ─── 1. Header Toolbar của trang Quản lý đơn hàng ─── */}
      <div className="bg-white rounded-[8px] border border-slate-200 p-3 px-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Bên trái: Icon + Tiêu đề + Huy hiệu số lượng + Tên công ty + Ô tìm kiếm F3 */}
        <div className="flex items-center gap-3.5 flex-1 min-w-[320px]">
          <div className="w-10 h-10 rounded-[8px] bg-blue-50 border border-blue-200/80 flex items-center justify-center text-[#0F60B6] shrink-0">
            <FileText size={20} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">
                Quản lý đơn hàng
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-[#0F60B6] font-bold text-[11px]">
                {totalCount.toLocaleString('vi-VN')}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Công ty TNHH Phân Phối Thiết Bị & Giải Pháp Số Tín Phát
            </p>
          </div>

          {/* Ô tìm kiếm nhanh với phím tắt F3 */}
          <div className="relative w-64 ml-4 hidden xl:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã đơn, tên khách, SĐT..."
              className="w-full h-8 pl-8 pr-8 rounded-[5px] border border-slate-250 bg-slate-50/60 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#0F60B6] focus:bg-white transition"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 bg-slate-200/80 px-1 py-0.2 rounded border border-slate-300 pointer-events-none">
              F3
            </span>
          </div>
        </div>

        {/* Bên phải: Nút Tạo đơn hàng F1, Nhập Excel, Xuất file, Nút làm mới */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (onNavigate) {
                onNavigate('pos');
              } else {
                router.push('/pos');
              }
            }}
            className="h-8 px-3.5 rounded-[5px] bg-[#0F60B6] hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs cursor-pointer transition active:scale-[0.98]"
            title="Mở màn hình bán hàng POS (Phím tắt: F1)"
          >
            <PlusCircle size={15} />
            <span>Tạo đơn hàng</span>
            <span className="bg-blue-800/80 text-white text-[10px] font-bold px-1.5 py-0.2 rounded ml-0.5">
              F1
            </span>
          </button>

          <button
            type="button"
            onClick={() => message.info('Tính năng Nhập đơn hàng từ Excel')}
            className="h-8 px-3 rounded-[5px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>Nhập Excel</span>
          </button>

          <button
            type="button"
            onClick={() => message.info(`Đang xuất danh sách ${totalCount} đơn hàng...`)}
            className="h-8 px-3 rounded-[5px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Download size={14} className="text-slate-600" />
            <span>Xuất file</span>
          </button>

          <button
            type="button"
            onClick={() => fetchOrdersFromBackend(appliedFilters, currentPage, pageSize, search)}
            className="h-8 w-8 rounded-[5px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition cursor-pointer shadow-2xs"
            title="Tải lại danh sách"
          >
            <RotateCw size={14} className={loading ? 'animate-spin text-[#0F60B6]' : ''} />
          </button>

          {/* Nút Cài đặt / Thiết lập đơn hàng (Settings) */}
          <Tooltip title="Thiết lập đơn hàng (settings/orders)">
            <button
              type="button"
              onClick={() => {
                if (onNavigate) {
                  onNavigate('/settings/orders');
                } else {
                  router.push('/settings/orders');
                }
              }}
              className="h-8 w-8 rounded-[5px] bg-white border border-slate-300 hover:bg-slate-50 hover:text-[#0F60B6] hover:border-blue-300 text-slate-600 flex items-center justify-center transition cursor-pointer shadow-2xs group"
              title="Thiết lập đơn hàng (settings/orders)"
              aria-label="Cài đặt đơn hàng"
            >
              <Settings size={15} className="group-hover:rotate-45 transition-transform duration-200" />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ─── 2. MAIN LAYOUT: BỘ LỌC BÊN TRÁI & NỘI DUNG BẢNG BÊN PHẢI ─── */}
      <div className="flex flex-col lg:flex-row items-start gap-3.5">
        {/* ─── CỘT TRÁI: BỘ LỌC TÌM KIẾM ĐƠN HÀNG (FILTER SIDEBAR) ─── */}
        <aside className="w-full lg:w-64 xl:w-72 shrink-0 bg-white rounded-[8px] border border-slate-200 p-3.5 shadow-2xs space-y-3.5 sticky top-3">
          {/* Header Bộ lọc + 2 Nút thao tác: "Đặt lại" & "Lọc" */}
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-150">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <Filter size={15} className="text-[#0F60B6]" />
              <span>BỘ LỌC ĐƠN HÀNG</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-7 px-2 rounded-[5px] bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold text-[11px] flex items-center gap-1 transition cursor-pointer"
                title="Khôi phục toàn bộ điều kiện về mặc định"
              >
                <RotateCcw size={11} />
                <span>Đặt lại</span>
              </button>

              <button
                type="button"
                onClick={handleApplyFilter}
                className="h-7 px-3 rounded-[5px] bg-[#0F60B6] hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-2xs transition cursor-pointer active:scale-95"
                title="Áp dụng các điều kiện lọc đã chọn"
              >
                <Search size={12} />
                <span>Lọc</span>
              </button>
            </div>
          </div>

          {/* 6 TRƯỜNG BỘ LỌC (Xếp theo chiều dọc) */}
          <div className="space-y-3">
            {/* 1.1 Chi nhánh (Kho) */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Building2 size={12} className="text-[#0F60B6]" />
                <span>Chi nhánh</span>
              </label>
              <select
                value={filterWarehouseId}
                onChange={(e) => setFilterWarehouseId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-[5px] border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-[#0F60B6] cursor-pointer"
              >
                <option value="ALL">Tất cả chi nhánh</option>
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={String(w.warehouseId)}>
                    {w.name} {w.code ? `(${w.code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 1.2 Thời gian */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Calendar size={12} className="text-[#0F60B6]" />
                <span>Thời gian</span>
              </label>
              <select
                value={timePreset}
                onChange={(e) => setTimePreset(e.target.value as TimePreset)}
                className="w-full h-8 px-2.5 rounded-[5px] border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-[#0F60B6] cursor-pointer"
              >
                <option value="THIS_MONTH">Tháng này</option>
                <option value="TODAY">Hôm nay</option>
                <option value="YESTERDAY">Hôm qua</option>
                <option value="LAST_7_DAYS">7 ngày qua</option>
                <option value="CUSTOM">Tùy chỉnh...</option>
              </select>

              {/* Ô CHỌN NGÀY TÙY CHỈNH (Hiện khi chọn timePreset === 'CUSTOM') */}
              {timePreset === 'CUSTOM' && (
                <div className="pt-2 space-y-1.5 bg-slate-50/80 p-2.5 rounded-[6px] border border-slate-200 mt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">Từ ngày:</span>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => setCustomFromDate(e.target.value)}
                      className="w-full h-7 px-2 rounded border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-[#0F60B6] mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium">Đến ngày:</span>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(e) => setCustomToDate(e.target.value)}
                      className="w-full h-7 px-2 rounded border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-[#0F60B6] mt-0.5"
                    />
                  </div>
                  {dateError && (
                    <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-1 pt-0.5">
                      <AlertCircle size={11} />
                      <span>{dateError}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 1.3 Trạng thái đơn hàng */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Tag size={12} className="text-[#0F60B6]" />
                <span>Trạng thái đơn</span>
              </label>
              <div className="p-2.5 rounded-[5px] border border-slate-300 bg-white flex flex-col gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={statusCompleted}
                    onChange={(e) => setStatusCompleted(e.target.checked)}
                    className="rounded text-[#0F60B6] accent-[#0F60B6] cursor-pointer"
                  />
                  <span>Hoàn thành</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-slate-900">
                  <input
                    type="checkbox"
                    checked={statusCancelled}
                    onChange={(e) => setStatusCancelled(e.target.checked)}
                    className="rounded text-[#0F60B6] accent-[#0F60B6] cursor-pointer"
                  />
                  <span>Đã hủy</span>
                </label>
              </div>
            </div>

            {/* 1.4 Trạng thái trả hàng */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <RotateCw size={12} className="text-[#0F60B6]" />
                <span>Trả hàng</span>
              </label>
              <select
                value={filterReturnStatus}
                onChange={(e) => setFilterReturnStatus(e.target.value as any)}
                className="w-full h-8 px-2.5 rounded-[5px] border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-[#0F60B6] cursor-pointer"
              >
                <option value="ALL">Tất cả</option>
                <option value="NO_RETURN">Không trả hàng</option>
                <option value="HAS_RETURN">Có trả hàng</option>
              </select>
            </div>

            {/* 1.5 Phương thức thanh toán */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <CreditCard size={12} className="text-[#0F60B6]" />
                <span>Phương thức TT</span>
              </label>
              <select
                value={filterPaymentMethod}
                onChange={(e) => setFilterPaymentMethod(e.target.value)}
                className="w-full h-8 px-2.5 rounded-[5px] border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-[#0F60B6] cursor-pointer"
              >
                <option value="ALL">Tất cả phương thức</option>
                <option value="CASH">Tiền mặt</option>
                <option value="VIETQR">Chuyển khoản VietQR</option>
                <option value="POS_CARD">Quẹt thẻ máy POS</option>
                <option value="DEBT">Ghi nợ đại lý</option>
              </select>
            </div>

            {/* 1.6 Bảng giá */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Layers size={12} className="text-[#0F60B6]" />
                <span>Bảng giá</span>
              </label>
              <select
                value={filterPriceBookName}
                onChange={(e) => setFilterPriceBookName(e.target.value)}
                className="w-full h-8 px-2.5 rounded-[5px] border border-slate-300 bg-white text-xs text-slate-800 outline-none focus:border-[#0F60B6] cursor-pointer"
              >
                <option value="ALL">Tất cả bảng giá</option>
                {priceBooks.map((pb) => (
                  <option key={pb.priceBookId} value={pb.priceBookName}>
                    {pb.priceBookName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Nút Áp dụng bộ lọc ở chân panel */}
     
        </aside>

        {/* ─── CỘT PHẢI: DẢI THẺ ĐIỀU KIỆN + BẢNG DỮ LIỆU ĐƠN HÀNG ─── */}
        <section className="flex-1 min-w-0 space-y-3">
          {/* DẢI THẺ ĐIỀU KIỆN LỌC ĐANG ÁP DỤNG (ACTIVE FILTER TAGS) */}
          {activeFilterTags.length > 0 && (
            <div className="bg-white rounded-[8px] border border-slate-200 p-2.5 px-3.5 shadow-2xs flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Đang lọc theo:</span>
              {activeFilterTags.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[#0F60B6] text-[11px] font-semibold animate-in fade-in"
                >
                  <span>{t.label}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFilterTag(t.id)}
                    className="hover:bg-blue-200/80 rounded-full p-0.5 transition cursor-pointer text-[#0F60B6]"
                    title="Gỡ điều kiện này"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[11px] text-rose-600 hover:underline font-semibold ml-1 cursor-pointer"
              >
                Xóa tất cả
              </button>
            </div>
          )}

      {/* ─── 3. BẢNG DANH SÁCH ĐƠN HÀNG TOÀN CHIỀU RỘNG (FULL WIDTH) ─── */}
      <div className="space-y-0">
        {/* Thanh thao tác Bulk Action Bar khi có đơn hàng được chọn */}
        {selectedOrdersData.count > 0 ? (
          <div className="bg-[#0B4B8C] text-white p-2.5 px-3.5 rounded-t-[8px] flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-[11px] shadow-2xs">
                {selectedOrdersData.count}
              </span>
              <span className="font-bold text-white">Đơn hàng được chọn</span>
              <span className="text-white/40">|</span>
              <span>
                Tổng giá trị đơn:{' '}
                <strong className="text-white font-black underline decoration-emerald-400 decoration-2">
                  {currencyFormatter.format(selectedOrdersData.totalVal)} đ
                </strong>
              </span>
              <span className="text-white/80 text-[11px]">
                (Công nợ còn lại: {currencyFormatter.format(selectedOrdersData.totalDebt)} đ)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => message.info(`Đang tạo lệnh in ${selectedOrdersData.count} đơn hàng...`)}
                className="h-7 px-2.5 rounded bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Printer size={13} />
                <span>In hàng loạt</span>
              </button>

              <button
                type="button"
                onClick={() => message.success(`Đã xuất ${selectedOrdersData.count} đơn hàng ra file Excel!`)}
                className="h-7 px-2.5 rounded bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Download size={13} />
                <span>Xuất Excel</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  Modal.confirm({
                    title: 'Xác nhận hủy đơn hàng',
                    content: `Bạn có chắc chắn muốn hủy ${selectedOrdersData.count} đơn hàng đang chọn?`,
                    okText: 'Xác nhận hủy',
                    okType: 'danger',
                    cancelText: 'Đóng',
                    onOk: () => {
                      message.warning(`Đã hủy ${selectedOrdersData.count} đơn hàng được chọn.`);
                      setSelectedOrderIds([]);
                    },
                  });
                }}
                className="h-7 px-2.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 transition cursor-pointer shadow-xs"
              >
                <X size={13} />
                <span>Hủy đơn</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="text-white/80 hover:text-white text-xs underline cursor-pointer ml-1"
              >
                Bỏ chọn
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100/90 text-slate-600 p-2 px-3.5 rounded-t-[8px] flex items-center justify-between text-xs border-t border-x border-slate-200">
            <span className="italic text-[11px]">Tick chọn các ô để thao tác hàng loạt</span>
            <span className="text-slate-500 text-[11px] font-medium">
              Hiển thị <strong>{orders.length}</strong> / <strong>{totalCount}</strong> đơn hàng
            </span>
          </div>
        )}

        {/* Bảng Dữ Liệu Chi Tiết */}
        <div className="bg-white border-x border-b border-slate-200 overflow-x-auto shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded text-[#0F60B6] accent-[#0F60B6] cursor-pointer"
                  />
                </th>

                <th className="py-2.5 px-2 w-8 text-center">
                  <Star size={13} className="text-slate-400 mx-auto" />
                </th>

                <th className="py-2.5 px-3">MÃ ĐƠN HÀNG</th>
                <th className="py-2.5 px-3">THỜI GIAN</th>
                <th className="py-2.5 px-3">KHÁCH HÀNG</th>
                <th className="py-2.5 px-3 text-right">TỔNG TIỀN</th>
                <th className="py-2.5 px-3 text-right">CHIẾT KHẤU</th>
                <th className="py-2.5 px-3 text-right">ĐÃ THU</th>
                <th className="py-2.5 px-3 text-center">TRẠNG THÁI</th>
                <th className="py-2.5 px-3 text-center">TRẢ HÀNG</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-150">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw size={22} className="animate-spin text-[#0F60B6]" />
                      <span className="text-xs font-medium">Đang tải danh sách đơn hàng...</span>
                    </div>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox size={32} className="text-slate-300" />
                      <span className="text-xs font-semibold text-slate-600">
                        Không tìm thấy đơn hàng nào phù hợp với bộ lọc hiện tại.
                      </span>
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-1 text-xs text-[#0F60B6] font-bold hover:underline cursor-pointer"
                      >
                        Bấm vào đây để đặt lại bộ lọc tìm kiếm
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((ord) => {
                  const isChecked = selectedOrderIds.includes(ord.orderId);
                  const isExpanded = expandedOrderId === ord.orderId;

                  return (
                    <React.Fragment key={ord.orderId}>
                      <tr
                        className={`transition cursor-pointer select-none ${
                          isExpanded
                            ? 'bg-blue-50/80 border-l-4 border-l-[#0F60B6]'
                            : isChecked
                            ? 'bg-blue-50/40 hover:bg-blue-50/60'
                            : 'hover:bg-slate-50/80'
                        }`}
                        onClick={() => setExpandedOrderId(isExpanded ? null : ord.orderId)}
                      >
                        {/* Checkbox dòng */}
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelectRow(ord.orderId)}
                            className="rounded text-[#0F60B6] accent-[#0F60B6] cursor-pointer"
                          />
                        </td>

                        {/* Sao ghim */}
                        <td className="py-2.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <Star
                            size={13}
                            className={`cursor-pointer mx-auto ${ord.isPinned ? 'text-amber-400 fill-amber-400' : 'text-slate-300 hover:text-slate-400'}`}
                          />
                        </td>

                        {/* Mã đơn hàng */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-bold text-[#0F60B6] hover:underline font-mono"
                              title="Bấm để xem chi tiết đơn hàng"
                            >
                              {ord.orderCode}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{ord.totalItems} sản phẩm</div>
                        </td>

                        {/* Thời gian */}
                        <td className="py-2.5 px-3 text-slate-600">
                          <div className="font-semibold text-slate-800">{ord.orderDate}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{ord.orderTime}</div>
                        </td>

                        {/* Khách hàng */}
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{ord.partnerName}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                                ord.partnerGroup === 'VIP 1'
                                  ? 'bg-amber-100 text-amber-800'
                                  : ord.partnerGroup.includes('Đại lý')
                                  ? 'bg-purple-100 text-purple-800'
                                  : ord.partnerGroup === 'Dự án'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {ord.partnerGroup}
                            </span>
                            {ord.partnerPhone && (
                              <span className="text-[11px] text-slate-500 font-mono">{ord.partnerPhone}</span>
                            )}
                          </div>
                        </td>

                        {/* Tổng tiền hàng */}
                        <td className="py-2.5 px-3 text-right">
                          <span className="font-bold text-slate-900">
                            {currencyFormatter.format(ord.totalAmount)} đ
                          </span>
                        </td>

                        {/* Chiết khấu */}
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {ord.discountAmount > 0 ? (
                            <span className="text-amber-700 font-medium">
                              {currencyFormatter.format(ord.discountAmount)} đ
                            </span>
                          ) : (
                            <span className="text-slate-400">0 đ</span>
                          )}
                        </td>

                        {/* Đã thu */}
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                          {currencyFormatter.format(ord.paidAmount)} đ
                        </td>

                        {/* Trạng thái đơn */}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-[4px] font-bold text-[10px] inline-block ${
                              ord.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {ord.status === 'COMPLETED'
                              ? 'Hoàn thành'
                              : ord.status === 'CANCELLED'
                              ? 'Đã hủy'
                              : 'Đang xử lý'}
                          </span>
                        </td>

                        {/* Trạng thái trả hàng */}
                        <td className="py-2.5 px-3 text-center">
                          {ord.hasReturn ? (
                            <span className="px-2 py-0.5 rounded-[4px] font-bold text-[10px] inline-block bg-orange-100 text-orange-800">
                              Có trả hàng
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Không</span>
                          )}
                        </td>
                      </tr>

                      {/* CHI TIẾT ĐƠN HÀNG MỞ RỘNG (EXPANDABLE ROW CHUẨN KIOTVIET) */}
                      {isExpanded && (
                        <tr key={`${ord.orderId}-detail`} className="bg-white">
                          <td colSpan={10} className="p-0 border-b-2 border-[#0F60B6]/40">
                            <KiotVietOrderDetail
                              orderId={ord.orderId}
                              orderCode={ord.orderCode}
                              onClose={() => setExpandedOrderId(null)}
                              onReloadList={() => fetchOrdersFromBackend(appliedFilters, currentPage, pageSize, search)}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── TỔNG TRANG (SUMMARY FOOTER) ─── */}
        <div className="p-3 px-4 bg-white border-x border-b border-slate-200 space-y-1 text-xs text-slate-700">
          <div className="flex items-center gap-6">
            <span className="font-black text-slate-900 uppercase">
              TỔNG TRANG ({pageSummary.displayedCount} DÒNG):
            </span>
            <span>
              Tiền hàng:{' '}
              <strong className="text-slate-900 font-black">
                {currencyFormatter.format(pageSummary.sumTotal)} đ
              </strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              Chiết khấu:{' '}
              <strong className="text-slate-900 font-bold">
                {currencyFormatter.format(pageSummary.sumDiscount)} đ
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-6 text-[11px]">
            <span>
              Đã thu:{' '}
              <strong className="text-emerald-700 font-bold">
                {currencyFormatter.format(pageSummary.sumPaid)} đ
              </strong>
            </span>
          </div>
        </div>

        {/* ─── PHÂN TRANG (PAGINATION) ─── */}
        <div className="p-3 px-4 bg-white rounded-b-[8px] border-x border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-2">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-7 px-2 rounded border border-slate-300 bg-white text-slate-800 text-xs outline-none cursor-pointer"
            >
              <option value={5}>5 dòng / trang</option>
              <option value={10}>10 dòng / trang</option>
              <option value={20}>20 dòng / trang</option>
              <option value={50}>50 dòng / trang</option>
            </select>
          </div>

          <div className="text-[11px] text-slate-500">
            Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong> (Tổng số{' '}
            <strong className="text-slate-800">{totalCount.toLocaleString('vi-VN')}</strong> đơn hàng)
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-7 w-7 rounded border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 disabled:opacity-40 cursor-pointer"
              title="Trang đầu"
            >
              <ChevronsLeft size={13} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-7 w-7 rounded border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 disabled:opacity-40 cursor-pointer"
              title="Trang trước"
            >
              <ChevronLeft size={13} />
            </button>

            <span className="h-7 px-2.5 rounded bg-[#0F60B6] text-white font-bold flex items-center justify-center shadow-2xs text-xs">
              {currentPage}
            </span>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="h-7 w-7 rounded border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 disabled:opacity-40 cursor-pointer"
              title="Trang sau"
            >
              <ChevronRight size={13} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage >= totalPages}
              className="h-7 w-7 rounded border border-slate-300 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 disabled:opacity-40 cursor-pointer"
              title="Trang cuối"
            >
              <ChevronsRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</div>
  );
}
