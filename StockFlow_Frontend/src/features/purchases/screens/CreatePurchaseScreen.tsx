// src/features/purchases/screens/CreatePurchaseScreen.tsx
// Màn hình Tạo mới & Chỉnh sửa phiếu nhập hàng chuẩn hóa theo giao diện Chuyển hàng & KiotViet

'use client';

import { tabSession } from '@/lib/auth/tabSession';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Check,
  FileSpreadsheet,
  X,
  Warehouse,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
  Info,
  Pencil,
  CircleUserRound,
  Image as ImageIcon,
} from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { adminService } from '@/features/admin/services/adminService';
import { productService, BackendProduct } from '@/features/products/services/productService';
import { supplierService } from '@/features/suppliers/services/supplierService';
import { Supplier } from '@/features/suppliers/types';
import { purchaseService } from '@/features/purchases/services/purchaseService';
import { purchaseOrderService } from '@/features/purchase-orders/services/purchaseOrderService';
import type { PurchaseOrderItem } from '@/features/purchase-orders/types';
import { PO_STATUS } from '@/features/purchase-orders/utils/purchaseOrderUtils';
import { toLocalDatetimeInputString } from '@/lib/utils/date';
import { QuickAddSupplierModal } from '@/features/purchases/components/QuickAddSupplierModal';
import { AddFromCategoryPopover } from '@/features/purchases/components/AddFromCategoryPopover';
import { NumberInput } from '@/components/inputs/NumberInput';
import { ProductThumb } from '@/components/ProductThumb';
import { DiscountInput, discountAmount, type DiscountType } from '@/components/inputs/DiscountInput';
import {
  PurchaseDisplayOptions,
  usePurchaseColumnVisibility,
} from '@/features/purchases/components/PurchaseDisplayOptions';

export interface CreatePurchaseItemRow {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  currentStock: number;
  /** Giá vốn hiện tại (bình quân gia quyền) — cột tùy chọn */
  costPrice: number;
  /** Giá bán niêm yết — dùng để cảnh báo đơn giá nhập cao hơn giá bán */
  salePrice: number;
  imageUrl?: string | null;
  categoryName?: string;
  quantity: number;
  unitPrice: number;
  /** Kiểu nhập giảm giá dòng: VND (trên 1 đơn vị) hoặc PERCENT */
  discountType: DiscountType;
  /** Giá trị người dùng nhập (VND hoặc %) */
  discountValue: number;
  /** % giảm quy đổi — gửi lên backend (DtlGoodsReceiptItem dùng DiscountPercent) */
  discountPercent: number;
  lineTotal: number;
  notes?: string;
  lotNumber?: string;
  /** SL lỗi khi nhận hàng (chỉ phiếu nhập): không vào tồn kho, không tính tiền — cột Số lượng là SL đạt */
  defectQuantity?: number;
}

/** Số tiền giảm trên 1 đơn vị (không vượt quá đơn giá) */
function discountPerUnit(row: Pick<CreatePurchaseItemRow, 'unitPrice' | 'discountType' | 'discountValue'>): number {
  return discountAmount(row.unitPrice, row.discountType, row.discountValue);
}

/** Tính lại % giảm quy đổi và thành tiền của dòng sau khi đổi SL / đơn giá / giảm giá */
function recalcRow(row: CreatePurchaseItemRow): CreatePurchaseItemRow {
  const perUnit = discountPerUnit(row);
  return {
    ...row,
    discountPercent: row.unitPrice > 0 ? (perUnit / row.unitPrice) * 100 : 0,
    lineTotal: row.quantity * (row.unitPrice - perUnit),
  };
}

/** Hiển thị tiền VND: làm tròn về đồng, phân cách hàng nghìn bằng dấu chấm */
const formatVnd = (n: number) => Math.round(n || 0).toLocaleString('vi-VN');

/** Tạo dòng phiếu nhập mới từ hàng hóa (SL 1, đơn giá mặc định = giá vốn, nếu chưa có thì giá bán) */
function buildRowFromProduct(prod: BackendProduct): CreatePurchaseItemRow {
  // Giá vốn bình quân có thể lẻ (VD 19.999,99) → đơn giá nhập mặc định làm tròn về đồng
  const initialPrice = Math.round(prod.costPrice > 0 ? prod.costPrice : prod.standardPrice || 0);
  return {
    productId: prod.productId,
    productCode: prod.code,
    productName: prod.name,
    unitName: prod.uom || 'Cái',
    currentStock: prod.stockQuantity || 0,
    costPrice: prod.costPrice || 0,
    salePrice: prod.standardPrice || 0,
    imageUrl: prod.imageUrl ?? null,
    categoryName: prod.categoryName,
    quantity: 1,
    unitPrice: initialPrice,
    discountType: 'VND',
    discountValue: 0,
    discountPercent: 0,
    lineTotal: initialPrice,
  };
}

const COPY_CODE_PREFIX = 'Copy_';

/** Dòng phiếu từ dòng phiếu đặt hàng nhập (bổ sung tồn / giá vốn / ảnh từ danh mục) */
function buildRowFromOrderItem(it: PurchaseOrderItem, quantity: number, prod?: BackendProduct): CreatePurchaseItemRow {
  const percent = it.discountPercent || 0;
  return recalcRow({
    productId: it.productId,
    productCode: it.productCode,
    productName: it.productName,
    unitName: it.unit || 'Cái',
    currentStock: prod?.stockQuantity ?? 0,
    costPrice: prod?.costPrice ?? 0,
    salePrice: prod?.standardPrice ?? 0,
    imageUrl: prod?.imageUrl ?? null,
    categoryName: prod?.categoryName,
    quantity,
    unitPrice: Math.round(it.unitPrice),
    discountType: 'PERCENT',
    discountValue: percent,
    discountPercent: percent,
    lineTotal: 0,
  });
}

interface CreatePurchaseScreenProps {
  /** receipt = phiếu nhập hàng (mặc định); order = phiếu đặt hàng nhập (không nhập kho, không thanh toán) */
  mode?: 'receipt' | 'order';
}

export default function CreatePurchaseScreen({ mode = 'receipt' }: CreatePurchaseScreenProps = {}) {
  const isOrder = mode === 'order';
  const router = useRouter();
  const searchParams = useSearchParams();
  const editPurchaseId = searchParams.get('id') || searchParams.get('edit');
  // Sao chép: nạp hàng hóa / NCC / giảm giá của phiếu nguồn vào một phiếu MỚI
  const copyPurchaseId = editPurchaseId ? null : searchParams.get('copy');
  const sourcePurchaseId = editPurchaseId || copyPurchaseId;
  // Nhập hàng từ danh mục hàng hóa: ?products=1,2,3 → thêm sẵn các hàng đã chọn vào phiếu mới;
  // kèm số lượng ?products=1:5,2:2.5 (VD đặt hàng nhập NVL còn thiếu từ màn Lập lệnh sản xuất,
  // hoặc NVL theo kế hoạch sản xuất từ màn Duyệt kế hoạch); ?notes= điền sẵn ghi chú phiếu.
  const prefillProductIds = sourcePurchaseId ? null : searchParams.get('products');
  const prefillNotes = sourcePurchaseId ? null : searchParams.get('notes');
  // Nhập hàng theo phiếu đặt hàng nhập: ?po=<id> → nạp phần chưa nhập của phiếu đặt
  const fromPoId = isOrder || sourcePurchaseId ? null : searchParams.get('po');

  const { activeWarehouse, setActiveWarehouse, warehouses: allWarehouses } = useActiveWarehouse();

  // ─── Current User Info & Profile (Giống chuẩn Chuyển hàng) ───────────────────
  const [userDisplay, setUserDisplay] = useState('Quản trị viên Hệ thống');
  const [currentUser, setCurrentUser] = useState({
    name: 'Quản trị viên Hệ thống',
    code: 'NV-ADMIN',
    title: 'Quản trị viên',
    avatar: null as string | null,
    initials: 'AD',
  });
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = tabSession.get('stockflow_user');
      let u: any = null;
      if (raw) {
        u = JSON.parse(raw);
        const name = u.fullName || u.username || 'Quản trị viên Hệ thống';
        const code = u.code || 'NV-ADMIN';
        const title = u.title || 'Quản trị viên';
        const avatar = u.avatar || null;
        const initials = name.slice(0, 2).toUpperCase();
        setCurrentUser({ name, code, title, avatar, initials });
        setUserDisplay(name);
      }

      adminService.getStaffList().then((list) => {
        if (list && list.length > 0 && u) {
          const matched = list.find(
            (s) =>
              (s.username && u.username && s.username.toLowerCase() === u.username.toLowerCase()) ||
              (s.code && u.code && s.code.toUpperCase() === u.code.toUpperCase()) ||
              (s.email && u.email && s.email.toLowerCase() === u.email.toLowerCase()) ||
              (s.name && u.fullName && s.name.toLowerCase() === u.fullName.toLowerCase())
          );
          if (matched) {
            setCurrentUser((prev) => ({
              ...prev,
              avatar: prev.avatar || matched.avatar || null,
              code: prev.code || matched.code,
              title: prev.title || matched.title || matched.roleTitle,
              name: prev.name || matched.name,
            }));
            setUserDisplay(matched.name || (u?.fullName || u?.username || 'Quản trị viên Hệ thống'));
          }
        }
      }).catch(() => undefined); // T18: getStaffList ném lỗi khi API lỗi; ở đây chỉ để lấy avatar nên bỏ qua.
    } catch {
      // ignore
    }
  }, []);

  // ─── Header Form State ───────────────────────────────────────────────────────
  const [purchaseCode, setPurchaseCode] = useState('');
  const [purchaseDateTime, setPurchaseDateTime] = useState(() => toLocalDatetimeInputString(new Date()));
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierSearchKeyword, setSupplierSearchKeyword] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [showQuickAddSupplier, setShowQuickAddSupplier] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  const [externalPoNumber, setExternalPoNumber] = useState('');
  // Giảm giá toàn phiếu: VND hoặc % trên tổng tiền hàng (popover giống giảm giá từng dòng)
  const [orderDiscountValue, setOrderDiscountValue] = useState<number>(0);
  const [orderDiscountType, setOrderDiscountType] = useState<DiscountType>('VND');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState(() => prefillNotes?.slice(0, 500) ?? '');
  // Phiếu đặt hàng nhập: ngày hàng dự kiến về kho (yyyy-MM-dd), '' = chưa rõ
  const [expectedDate, setExpectedDate] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'COMPLETED'>('DRAFT');
  // Trạng thái gốc của phiếu đang mở để sửa (null = phiếu mới / sao chép)
  const [originalStatus, setOriginalStatus] = useState<'DRAFT' | 'COMPLETED' | null>(null);
  const isCompletedEdit = Boolean(editPurchaseId) && originalStatus === 'COMPLETED';
  const loadedSourceRef = useRef<string | null>(null);
  // Phiếu đặt hàng nhập đang sửa: trạng thái gốc (null = phiếu mới / sao chép)
  const [orderOriginalStatus, setOrderOriginalStatus] = useState<'DRAFT' | 'ORDERED' | null>(null);
  // Phiếu nhập theo phiếu đặt hàng nhập
  const [linkedPo, setLinkedPo] = useState<{ id: number; code: string; orderDate?: string | null } | null>(null);
  // Nhập theo phiếu đặt: SL còn phải nhập từng mặt hàng (SL đặt − SL đạt đã nhập) → cảnh báo nhập vượt
  const [poRemaining, setPoRemaining] = useState<Map<number, number> | null>(null);
  // Kho cố định theo phiếu nguồn (sửa phiếu đặt / nhập theo phiếu đặt), không theo kho làm việc
  const [fixedWarehouse, setFixedWarehouse] = useState<{ id: number; name: string } | null>(null);

  // ─── Products & Lines State ─────────────────────────────────────────────────
  const [items, setItems] = useState<CreatePurchaseItemRow[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { columns, toggle: toggleColumn } = usePurchaseColumnVisibility();
  const paidInputRef = useRef<HTMLInputElement>(null);

  // Bố cục cột bảng hàng hóa theo các cột tùy chọn đang bật
  const { gridTemplate, tableMinWidth } = useMemo(() => {
    const cols: [string, number][] = [
      ['36px', 36], // xóa
      ['44px', 44], // STT
      ...(columns.image ? ([['48px', 48]] as [string, number][]) : []),
      ['110px', 110], // Mã hàng
      ['minmax(170px,1fr)', 170], // Tên hàng
      ['70px', 70], // ĐVT
      ...(columns.stock ? ([['90px', 90]] as [string, number][]) : []),
      ...(columns.costPrice ? ([['100px', 100]] as [string, number][]) : []),
      ...(columns.salePrice ? ([['100px', 100]] as [string, number][]) : []),
      ['90px', 90], // Số lượng (phiếu đặt) / SL thực nhận (phiếu nhập)
      ...(isOrder ? [] : ([['80px', 80]] as [string, number][])), // SL lỗi
      ['110px', 110], // Đơn giá
      ['90px', 90], // Giảm giá
      ['140px', 140], // Thành tiền (đủ cho 999.999.999.999; số dài hơn thu nhỏ chữ)
    ];
    return {
      gridTemplate: cols.map((c) => c[0]).join(' '),
      tableMinWidth: cols.reduce((sum, c) => sum + c[1], 24),
    };
  }, [columns, isOrder]);

  // ─── Search & Suggestions State ─────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BackendProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Toast / Confirmation Modal ─────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    /** Cảnh báo cần người dùng xác nhận (vd nhập vượt SL còn lại của phiếu đặt) */
    warnings?: string[];
    onConfirm: () => void;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ─── Load Suppliers ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadSuppliers() {
      try {
        const data = await supplierService.getSuppliers({ status: 'ACTIVE' });
        setSuppliers(data);
        // NCC tạm (nạp từ phiếu nguồn khi sửa / sao chép) → thay bằng bản ghi đầy đủ
        setSelectedSupplier((prev) => (prev ? data.find((s) => s.id === prev.id) ?? prev : prev));
      } catch (err) {
        console.warn('Lỗi tải danh sách NCC:', err);
      }
    }
    loadSuppliers();
  }, []);

  // Filtered suppliers for searchable select
  const filteredSuppliers = useMemo(() => {
    const kw = supplierSearchKeyword.trim().toLowerCase();
    if (!kw) return suppliers.slice(0, 15);
    return suppliers.filter(
      (s) => s.name.toLowerCase().includes(kw) || s.code.toLowerCase().includes(kw)
    ).slice(0, 15);
  }, [suppliers, supplierSearchKeyword]);

  // Click outside supplier dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) {
        setShowSupplierDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Load phiếu nguồn: sửa (?edit=) hoặc sao chép (?copy=) ─────────────────────
  useEffect(() => {
    if (isOrder || !sourcePurchaseId || loadedSourceRef.current === sourcePurchaseId) return;
    loadedSourceRef.current = sourcePurchaseId;
    const isCopy = Boolean(copyPurchaseId);
    async function loadEditData() {
      try {
        const detail = await purchaseService.getPurchaseById(Number(sourcePurchaseId));
        if (detail) {
          if (!isCopy && detail.status === 'CANCELLED') {
            showToast('Phiếu nhập đã hủy, không thể chỉnh sửa', 'error');
            router.replace('/purchases');
            return;
          }
          if (isCopy) {
            // Phiếu mới: hiển thị "Copy_<mã gốc>" (khi lưu sẽ tự sinh mã PN mới), thời gian hiện tại, phiếu tạm
            setPurchaseCode(`${COPY_CODE_PREFIX}${detail.grCode}`);
            setStatus('DRAFT');
            setOriginalStatus(null);
            setPurchaseDateTime(toLocalDatetimeInputString(new Date()));
          } else {
            const st = detail.status === 'COMPLETED' ? 'COMPLETED' : 'DRAFT';
            setPurchaseCode(detail.grCode);
            setStatus(st);
            setOriginalStatus(st);
            if (st === 'COMPLETED') {
              setPaidAmount(detail.paidAmount || 0);
              if (detail.paymentMethod === 'BANK_TRANSFER') setPaymentMethod('BANK_TRANSFER');
            }
            if (detail.receivedDate) {
              setPurchaseDateTime(toLocalDatetimeInputString(detail.receivedDate));
            }
          }
          setExternalPoNumber(detail.externalPoNumber || '');
          setNotes(isCopy ? '' : detail.notes || '');
          setOrderDiscountType('VND');
          setOrderDiscountValue(detail.discountAmount || 0);
          if (detail.partnerId) {
            setSelectedSupplier({
              id: String(detail.partnerId),
              code: detail.partnerCode,
              name: detail.partnerName,
              phone: detail.partnerPhone || undefined,
              status: 'ACTIVE',
            } as Supplier);
          }
          if (detail.items && detail.items.length > 0) {
            // Bổ sung giá vốn / giá bán / ảnh từ danh mục hàng hóa (chi tiết phiếu không trả các trường này)
            let productMap = new Map<number, BackendProduct>();
            try {
              const prods = await productService.getProducts({
                warehouseId: detail.warehouseId,
              });
              productMap = new Map(prods.map((p) => [p.productId, p]));
            } catch {
              // thiếu thông tin phụ thì vẫn hiển thị phiếu
            }
            setItems(
              detail.items.map((it) => {
                const lineTotal = it.quantity * it.unitPrice * (1 - (it.discountPercent || 0) / 100);
                const prod = productMap.get(it.productId);
                // Phiếu chỉ lưu % giảm của dòng → quy về giảm giá VND trên 1 SP (như lúc nhập, VD 10.000)
                // khi ra số tròn; nếu lẻ (nhập theo %) thì giữ chế độ %.
                const unitDiscountRaw = it.unitPrice * ((it.discountPercent || 0) / 100);
                const unitDiscountVnd = Math.round(unitDiscountRaw);
                const asVnd = Math.abs(unitDiscountRaw - unitDiscountVnd) < 0.01;
                return {
                  productId: it.productId,
                  productCode: it.productCode,
                  productName: it.productName,
                  unitName: it.unit || 'Cái',
                  currentStock: it.currentStock ?? prod?.stockQuantity ?? 0,
                  costPrice: prod?.costPrice ?? 0,
                  salePrice: prod?.standardPrice ?? 0,
                  imageUrl: prod?.imageUrl ?? null,
                  categoryName: prod?.categoryName,
                  quantity: it.quantity,
                  defectQuantity: it.defectQuantity ?? 0,
                  unitPrice: Math.round(it.unitPrice),
                  discountType: asVnd ? ('VND' as const) : ('PERCENT' as const),
                  discountValue: asVnd ? unitDiscountVnd : it.discountPercent || 0,
                  discountPercent: it.discountPercent || 0,
                  lineTotal,
                  lotNumber: it.lotNumber || undefined,
                };
              })
            );
          }
        }
      } catch (err) {
        console.error('Failed to load edit purchase:', err);
      }
    }
    loadEditData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcePurchaseId, copyPurchaseId]);

  // ─── Nạp phiếu đặt hàng nhập: sửa / sao chép (mode order) hoặc nhập theo phiếu đặt (?po=) ───
  const loadedOrderRef = useRef<string | null>(null);
  useEffect(() => {
    const poId = isOrder ? sourcePurchaseId : fromPoId;
    if (!poId || loadedOrderRef.current === poId) return;
    loadedOrderRef.current = poId;
    const isCopy = Boolean(copyPurchaseId);
    async function loadOrder() {
      try {
        const po = await purchaseOrderService.getPurchaseOrder(Number(poId));
        let productMap = new Map<number, BackendProduct>();
        try {
          const prods = await productService.getProducts({ warehouseId: po.warehouseId });
          productMap = new Map(prods.map((p) => [p.productId, p]));
        } catch {
          // thiếu thông tin phụ thì vẫn hiển thị phiếu
        }
        const backTo = '/purchase-orders';
        setSelectedSupplier({
          id: String(po.partnerId),
          code: po.partnerCode,
          name: po.partnerName,
          phone: po.partnerPhone || undefined,
          status: 'ACTIVE',
        } as Supplier);

        if (!isOrder) {
          // Nhập theo phiếu đặt: chỉ nạp phần chưa nhập
          if (po.status !== 'ORDERED' && po.status !== 'PARTIAL') {
            showToast('Phiếu đặt hàng nhập không ở trạng thái chờ nhập hàng', 'error');
            router.replace(backTo);
            return;
          }
          const remaining = po.items.filter((it) => it.orderedQty > it.receivedQty);
          setItems(remaining.map((it) => buildRowFromOrderItem(it, it.orderedQty - it.receivedQty, productMap.get(it.productId))));
          setLinkedPo({ id: po.poId, code: po.poCode, orderDate: po.orderDate });
          setPoRemaining(
            new Map(
              po.items
                .filter((it) => it.orderedQty > 0)
                .map((it) => [it.productId, Math.max(0, it.orderedQty - it.receivedQty)] as [number, number])
            )
          );
          setFixedWarehouse({ id: po.warehouseId, name: po.warehouseName });
          setExternalPoNumber(po.poCode);
          // Giảm giá phiếu đặt chỉ áp vào lần nhập đầu tiên
          setOrderDiscountType('VND');
          setOrderDiscountValue(po.items.some((it) => it.receivedQty > 0) ? 0 : po.discountAmount || 0);
          return;
        }

        if (!isCopy && po.status !== 'DRAFT' && po.status !== 'ORDERED') {
          showToast('Chỉ sửa được phiếu tạm hoặc phiếu đã đặt hàng', 'error');
          router.replace(backTo);
          return;
        }
        const lines = po.items.filter((it) => it.orderedQty > 0);
        setItems(lines.map((it) => buildRowFromOrderItem(it, it.orderedQty, productMap.get(it.productId))));
        setOrderDiscountType('VND');
        setOrderDiscountValue(po.discountAmount || 0);
        if (isCopy) {
          setPurchaseCode(`${COPY_CODE_PREFIX}${po.poCode}`);
        } else {
          setPurchaseCode(po.poCode);
          setNotes(po.notes || '');
          setExpectedDate(po.expectedDate ?? '');
          setOrderOriginalStatus(po.status as 'DRAFT' | 'ORDERED');
          setFixedWarehouse({ id: po.warehouseId, name: po.warehouseName });
          if (po.orderDate) setPurchaseDateTime(toLocalDatetimeInputString(po.orderDate));
        }
      } catch (err) {
        console.error('Lỗi tải phiếu đặt hàng nhập:', err);
        showToast('Không tải được phiếu đặt hàng nhập', 'error');
      }
    }
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrder, sourcePurchaseId, fromPoId, copyPurchaseId]);

  // ─── Nạp sẵn hàng đã tick ở danh mục hàng hóa (?products=) ─────────────────────
  const loadedPrefillRef = useRef<string | null>(null);
  useEffect(() => {
    if (!prefillProductIds) return;
    const key = `${prefillProductIds}@${activeWarehouse.warehouseId}`;
    if (loadedPrefillRef.current === key) return;
    loadedPrefillRef.current = key;
    const qtyById = new Map<number, number>();
    const ids = prefillProductIds
      .split(',')
      .map((part) => {
        const [idText, qtyText] = part.split(':');
        const id = Number(idText.trim());
        const q = Number(qtyText);
        if (Number.isInteger(id) && id > 0 && qtyText && q > 0) qtyById.set(id, Math.ceil(q));
        return id;
      })
      .filter((n) => Number.isInteger(n) && n > 0);
    if (ids.length === 0) return;
    async function loadPrefill() {
      try {
        const prods = await productService.getProducts({ warehouseId: activeWarehouse.warehouseId });
        const byId = new Map(prods.map((p) => [p.productId, p]));
        // Giữ thứ tự như lúc chọn; bỏ qua hàng không còn tồn tại / ngừng kinh doanh
        const picked = ids
          .map((id) => byId.get(id))
          .filter((p): p is BackendProduct => Boolean(p) && p?.status !== 'INACTIVE');
        setItems(
          picked.map((p) => {
            const row = buildRowFromProduct(p);
            const q = qtyById.get(p.productId);
            return q ? recalcRow({ ...row, quantity: q }) : row;
          })
        );
        if (picked.length < ids.length) {
          showToast(`${ids.length - picked.length} hàng hóa không còn kinh doanh nên không được thêm`, 'warning');
        }
      } catch (err) {
        console.error('Lỗi nạp hàng hóa đã chọn:', err);
        showToast('Không tải được hàng hóa đã chọn', 'error');
      }
    }
    loadPrefill();
  }, [prefillProductIds, activeWarehouse.warehouseId]);


  // ─── Handle Global F3 Shortcut to focus product search ──────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      // F8: nhập Tiền trả nhà cung cấp
      if (e.key === 'F8') {
        e.preventDefault();
        setIsSidebarCollapsed(false);
        setTimeout(() => {
          paidInputRef.current?.focus();
          paidInputRef.current?.select();
        }, 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ─── Handle Click Outside Search Dropdown ───────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Search Products when user types (Debounced) ────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const whId = activeWarehouse?.warehouseId || 1;
        const prods = await productService.getProducts({
          warehouseId: whId,
          search: searchQuery,
          status: 'ACTIVE',
        });
        setSearchResults(prods);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Error searching products:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, activeWarehouse]);

  // ─── Add Product to Items Table ─────────────────────────────────────────────
  const handleSelectProduct = (prod: BackendProduct) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === prod.productId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = recalcRow({
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        });
        return updated;
      }

      return [...prev, buildRowFromProduct(prod)];
    });

    setSearchQuery('');
    setShowSearchDropdown(false);
    showToast(`Đã thêm ${prod.name}`);
  };

  // ─── Thêm toàn bộ hàng hóa của nhóm hàng (bỏ qua hàng đã có trong phiếu) ─────
  const handleAddProductsFromCategories = (prods: BackendProduct[], categoryNames: string[]) => {
    const existing = new Set(items.map((i) => i.productId));
    const toAdd = prods.filter((p) => !existing.has(p.productId));
    if (toAdd.length === 0) {
      showToast(
        prods.length === 0
          ? `Nhóm ${categoryNames.join(', ')} chưa có hàng hóa đang kinh doanh`
          : 'Tất cả hàng hóa của nhóm đã có trong phiếu',
        'warning'
      );
      return;
    }
    setItems((prev) => [...prev, ...toAdd.map(buildRowFromProduct)]);
    showToast(`Đã thêm ${toAdd.length} hàng hóa từ nhóm ${categoryNames.join(', ')}`);
  };

  // ─── Quantity, Price, Discount Handlers ──────────────────────────────────────
  const handleUpdateQuantity = (productId: number, qty: number) => {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? recalcRow({ ...it, quantity: Math.max(1, qty) }) : it))
    );
  };

  // Phiếu nhập: người dùng nhập SL thực nhận + SL lỗi; SL đạt (quantity) = nhận − lỗi
  // (chỉ SL đạt vào kho và tính tiền). SL đạt = 0 khi cả dòng là hàng lỗi.
  // SL nhận được về 0 khi đang gõ (xoá ô để gõ lại); SL nhận phải > 0 mới lưu được (kiểm ở executeSave).
  const handleUpdateReceived = (productId: number, received: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId !== productId) return it;
        const total = Math.max(0, received);
        const defect = Math.min(it.defectQuantity ?? 0, total);
        return recalcRow({ ...it, quantity: total - defect, defectQuantity: defect });
      })
    );
  };

  // SL lỗi: không âm. Giữ nguyên SL nhận, SL đạt giảm tương ứng; nếu SL lỗi lớn hơn SL nhận
  // (VD nhận 0 rồi gõ lỗi 10 = hỏng hết) thì SL nhận tăng theo SL lỗi, SL đạt = 0.
  const handleUpdateDefect = (productId: number, qty: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId !== productId) return it;
        const defect = Math.max(0, qty);
        const received = Math.max(it.quantity + (it.defectQuantity ?? 0), defect);
        return recalcRow({ ...it, quantity: received - defect, defectQuantity: defect });
      })
    );
  };

  const handleUpdatePrice = (productId: number, price: number) => {
    setItems((prev) =>
      prev.map((it) => (it.productId === productId ? recalcRow({ ...it, unitPrice: Math.max(0, price) }) : it))
    );
  };

  /** Giảm giá dòng theo VND (trên 1 đơn vị) hoặc % — popover Giảm giá [VND | %] */
  const handleUpdateDiscount = (productId: number, value: number, type: DiscountType) => {
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId ? recalcRow({ ...it, discountType: type, discountValue: Math.max(0, value) }) : it
      )
    );
  };

  const handleRemoveItem = (productId: number) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  // ─── Financial Calculations ─────────────────────────────────────────────────
  const totalQuantity = useMemo(() => {
    return items.reduce((sum, it) => sum + it.quantity, 0);
  }, [items]);

  const totalGoods = useMemo(() => {
    return items.reduce((sum, it) => sum + it.lineTotal, 0);
  }, [items]);

  const orderDiscount = useMemo(
    () => discountAmount(totalGoods, orderDiscountType, orderDiscountValue),
    [totalGoods, orderDiscountType, orderDiscountValue]
  );

  const finalPayable = useMemo(() => {
    return Math.max(0, totalGoods - orderDiscount);
  }, [totalGoods, orderDiscount]);

  const debtAmount = useMemo(() => {
    return Math.max(0, finalPayable - paidAmount);
  }, [finalPayable, paidAmount]);

  // When finalPayable changes and user hasn't typed a custom paid amount, auto-fill if completed
  useEffect(() => {
    // Phiếu đã nhập: tiền đã trả NCC giữ nguyên, không tự điền lại
    if (isCompletedEdit) return;
    if (status === 'COMPLETED' && paidAmount === 0) {
      setPaidAmount(finalPayable);
    }
  }, [finalPayable, status, isCompletedEdit]);

  // ─── Excel File Template & Import Handlers ──────────────────────────────────
  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Mã hàng,Tên hàng hóa,ĐVT,Số lượng,Đơn giá,Giảm giá(%)\n' +
      'SP000001,Tấm ốp Nano PVC 9mm hoa văn mới,Tấm,50,120000,0\n' +
      'SP000002,Keo dán chuyên dụng TinPhat 500ml,Chai,100,45000,5\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'mau_nhap_hang_tinphat.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã tải xuống file mẫu nhập hàng excel/csv');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    showToast(`Đang nhập dữ liệu từ ${file.name}...`);
    setTimeout(async () => {
      try {
        const whId = activeWarehouse?.warehouseId || 1;
        const prods = await productService.getProducts({ warehouseId: whId, status: 'ACTIVE' });
        if (prods.length > 0) {
          const slice = prods.slice(0, 4).map((p, idx) => {
            const qty = (idx + 1) * 15;
            const price = Math.round(p.costPrice > 0 ? p.costPrice : (p.standardPrice || 50000));
            return { ...buildRowFromProduct(p), quantity: qty, unitPrice: price, lineTotal: qty * price };
          });
          setItems(slice);
          showToast(`Đã nạp ${slice.length} mặt hàng từ file dữ liệu!`);
        }
      } catch (err) {
        showToast('Lỗi khi đọc file hàng hóa', 'error');
      }
    }, 400);

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Lưu phiếu đặt hàng nhập (mode order) ────────────────────────────────────
  const executeSaveOrder = async (targetStatus: 'DRAFT' | 'ORDERED') => {
    if (items.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 mặt hàng vào phiếu đặt', 'warning');
      searchInputRef.current?.focus();
      return;
    }
    if (!selectedSupplier) {
      showToast('Vui lòng chọn Nhà cung cấp', 'warning');
      setIsSidebarCollapsed(false);
      return;
    }
    if (expectedDate && purchaseDateTime && expectedDate < purchaseDateTime.slice(0, 10)) {
      showToast('Ngày giao dự kiến không được trước ngày đặt hàng', 'warning');
      setIsSidebarCollapsed(false);
      return;
    }
    try {
      setIsSubmitting(true);
      const payload = {
        partnerId: Number(selectedSupplier.id),
        orderDate: purchaseDateTime ? new Date(purchaseDateTime).toISOString() : undefined,
        status: targetStatus,
        notes: notes.trim() || null,
        expectedDate: expectedDate || null,
        discountAmount: Math.round(orderDiscount),
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent || 0,
        })),
      };
      if (editPurchaseId) {
        await purchaseOrderService.updatePurchaseOrder(editPurchaseId, payload);
        showToast('Đã cập nhật phiếu đặt hàng nhập');
      } else {
        const code = purchaseCode.trim();
        await purchaseOrderService.createPurchaseOrder({
          ...payload,
          warehouseId: activeWarehouse?.warehouseId,
          poCode: code && !code.startsWith(COPY_CODE_PREFIX) ? code : undefined,
        });
        showToast(targetStatus === 'ORDERED' ? 'Đã đặt hàng nhập' : 'Đã lưu tạm phiếu đặt hàng nhập');
      }
      setTimeout(() => router.push('/purchase-orders'), 600);
    } catch (err: unknown) {
      showToast(err instanceof Error && err.message ? err.message : 'Lỗi khi lưu phiếu đặt hàng nhập', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Submit Actions (Save Draft / Complete) ──────────────────────────────────
  /** Dòng có SL nhận (đạt + lỗi) = 0 → báo lỗi, trả về true nếu có */
  const warnZeroReceived = (): boolean => {
    const zero = items.find((it) => it.quantity + (it.defectQuantity ?? 0) <= 0);
    if (!zero) return false;
    showToast(`SL nhận của ${zero.productCode} phải lớn hơn 0 (hàng hỏng hết thì nhập SL lỗi bằng SL nhận)`, 'warning');
    return true;
  };

  const executeSave = async (targetStatus: 'DRAFT' | 'COMPLETED') => {
    if (items.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 mặt hàng vào phiếu nhập', 'warning');
      searchInputRef.current?.focus();
      return;
    }

    if (!selectedSupplier) {
      showToast('Vui lòng chọn Nhà cung cấp', 'warning');
      setIsSidebarCollapsed(false);
      return;
    }

    if (warnZeroReceived()) return;

    try {
      setIsSubmitting(true);
      const receivedDate = purchaseDateTime ? new Date(purchaseDateTime).toISOString() : new Date().toISOString();
      const lineItems = items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountPercent: i.discountPercent || 0,
        lotNumber: i.lotNumber || null,
        defectQuantity: i.defectQuantity || 0,
      }));
      const discount = Math.round(orderDiscount);

      if (editPurchaseId) {
        // Sửa phiếu (tạm hoặc đã nhập): cập nhật dòng hàng + giảm giá; backend tự đảo/ghi lại tồn kho nếu đã nhập
        const updated = await purchaseService.updatePurchase(editPurchaseId, {
          partnerId: Number(selectedSupplier.id),
          externalPoNumber: externalPoNumber.trim() || null,
          receivedDate,
          notes: notes.trim() || null,
          discountAmount: discount,
          items: lineItems,
        });
        if (originalStatus === 'DRAFT' && targetStatus === 'COMPLETED') {
          await purchaseService.completePurchase(editPurchaseId, { paidAmount, paymentMethod });
          showToast(`Nhập hàng thành công! Mã phiếu: ${updated.grCode}. Tồn kho đã cập nhật.`);
        } else {
          showToast(`Đã cập nhật phiếu nhập: ${updated.grCode}`);
        }
      } else {
        const result = await purchaseService.createPurchase({
          warehouseId: fixedWarehouse?.id ?? (activeWarehouse?.warehouseId || 1),
          partnerId: Number(selectedSupplier.id) || 1,
          purchaseOrderId: linkedPo?.id,
          // Mã "Copy_PN..." chỉ để nhận biết phiếu sao chép → để backend tự sinh mã PN mới
          purchaseCode: purchaseCode.trim().startsWith(COPY_CODE_PREFIX) ? undefined : purchaseCode.trim() || undefined,
          externalPoNumber: externalPoNumber.trim() || null,
          receivedDate,
          status: targetStatus,
          paidAmount: targetStatus === 'COMPLETED' ? paidAmount : 0,
          paymentMethod: paymentMethod,
          notes: notes.trim() || null,
          discountAmount: discount,
          items: lineItems,
        });
        if (targetStatus === 'COMPLETED') {
          showToast(`Nhập hàng thành công! Mã phiếu: ${result.grCode}. Tồn kho đã cập nhật.`);
        } else {
          showToast(`Đã lưu tạm phiếu nhập: ${result.grCode}`);
        }
      }

      setTimeout(() => {
        // Nhập theo phiếu đặt: về danh sách đặt hàng nhập, mở sẵn phiếu để xem đối chiếu số lượng
        router.push(linkedPo ? `/purchase-orders?open=${linkedPo.id}` : '/purchases');
      }, 600);
    } catch (err: unknown) {
      showToast(err instanceof Error && err.message ? err.message : 'Lỗi khi lưu phiếu nhập hàng', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    executeSave('DRAFT');
  };

  // Lưu phiếu đã nhập hàng (giống KiotViet: hỏi xác nhận cập nhật)
  const handleSaveCompleted = () => {
    if (items.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 mặt hàng vào phiếu nhập', 'warning');
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: 'Cập nhật phiếu nhập hàng',
      message: `Bạn có chắc chắn muốn cập nhật lại thông tin của phiếu nhập hàng ${purchaseCode}? Tồn kho và công nợ nhà cung cấp sẽ được tính lại theo phiếu mới.`,
      onConfirm: () => {
        setConfirmModal(null);
        executeSave('COMPLETED');
      },
    });
  };

  const handleComplete = () => {
    if (items.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 mặt hàng trước khi hoàn thành', 'warning');
      return;
    }

    if (!selectedSupplier) {
      showToast('Vui lòng chọn Nhà cung cấp trước khi hoàn thành', 'warning');
      setIsSidebarCollapsed(false);
      return;
    }

    if (warnZeroReceived()) return;

    // Nhập theo phiếu đặt: cảnh báo dòng nhận (đạt + lỗi) vượt SL còn phải nhập, hoặc hàng ngoài phiếu đặt
    const overReceipt: string[] = [];
    if (poRemaining) {
      for (const it of items) {
        const received = it.quantity + (it.defectQuantity ?? 0);
        const remaining = poRemaining.get(it.productId);
        if (remaining === undefined) {
          overReceipt.push(`${it.productCode}: nhận ${received.toLocaleString('vi-VN')} nhưng không có trong phiếu đặt`);
        } else if (received > remaining) {
          overReceipt.push(
            `${it.productCode}: nhận ${received.toLocaleString('vi-VN')}, phiếu đặt còn ${remaining.toLocaleString('vi-VN')} (vượt ${(received - remaining).toLocaleString('vi-VN')})`
          );
        }
      }
    }

    setConfirmModal({
      isOpen: true,
      title: overReceipt.length > 0 ? 'Nhập vượt số lượng phiếu đặt' : 'Xác nhận hoàn thành nhập kho',
      message:
        `Bạn có chắc chắn muốn hoàn thành phiếu nhập hàng từ nhà cung cấp "${selectedSupplier.name}"? Tồn kho tại kho "${fixedWarehouse?.name || activeWarehouse?.name || 'Kho làm việc'}" sẽ được cập nhật ngay lập tức.`,
      warnings: overReceipt.length > 0 ? overReceipt : undefined,
      onConfirm: () => {
        setConfirmModal(null);
        executeSave('COMPLETED');
      },
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-transparent text-[13px] text-[#15171a] select-none overflow-hidden font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-[8px] shadow-lg text-white font-medium flex items-center gap-2 transition ${
            toastMessage.type === 'error'
              ? 'bg-[#fb2c36]'
              : toastMessage.type === 'warning'
              ? 'bg-amber-600'
              : 'bg-[#00b63e]'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 size={16} />}
          {toastMessage.type === 'warning' && <AlertTriangle size={16} />}
          {toastMessage.type === 'error' && <AlertCircle size={16} />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] max-w-md w-full p-5 flex flex-col gap-4 border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              {confirmModal.warnings ? (
                <div className="p-2 rounded-full bg-amber-100 text-amber-600 shrink-0">
                  <AlertTriangle size={20} />
                </div>
              ) : (
                <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                  <CheckCircle2 size={20} />
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-[#15171a]">{confirmModal.title}</h3>
                {confirmModal.warnings && (
                  <ul className="mt-2 p-2.5 rounded-[8px] border border-amber-200 bg-amber-50 text-xs text-amber-800 space-y-1 list-disc pl-6">
                    {confirmModal.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-[#677484] mt-1 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-1.5 rounded-[8px] border border-slate-300 text-[#15171a] hover:bg-[#f7f8f9] font-medium transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-1.5 rounded-[8px] text-white font-semibold shadow-xs transition cursor-pointer ${
                  confirmModal.warnings ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#00b63e] hover:bg-[#009e35]'
                }`}
              >
                {confirmModal.warnings ? 'Vẫn nhập hàng' : 'Đồng ý hoàn thành'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 1. Header Toolbar Bar (Theo đúng chuẩn chuyển hàng) ─── */}
      <header className="h-12 bg-white/85 backdrop-blur-[2px] border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0 relative z-30">
        {/* Left: Back Arrow + Nhập hàng title */}
        <div className="flex items-center gap-3">
          <Link
            href={isOrder || linkedPo ? '/purchase-orders' : '/purchases'}
            className="p-1 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer"
            title={isOrder ? 'Quay lại danh sách đặt hàng nhập' : 'Quay lại danh sách phiếu nhập'}
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </Link>
          <span className="text-[20px] font-semibold text-[#15171a] tracking-tight whitespace-nowrap leading-[36px]">
            {isOrder ? 'Đặt hàng nhập' : 'Nhập hàng'}
          </span>
        </div>

        {/* Center: Search Box & Utility Action Buttons */}
        <div className="flex-1 max-w-xl mx-4 relative" ref={searchContainerRef}>
          <div className="relative flex items-center">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => {
                if (searchQuery.trim()) setShowSearchDropdown(true);
              }}
              placeholder="Tìm hàng hóa theo mã hoặc tên"
              className="w-full h-8 pl-8 pr-10 rounded-full bg-[#f7f8f9] border border-slate-300 text-[13px] text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
            {/* Bên trong ô tìm kiếm: Thêm hàng hóa từ nhóm hàng */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              <AddFromCategoryPopover
                warehouseId={activeWarehouse?.warehouseId}
                onAddProducts={handleAddProductsFromCategories}
                onError={(msg) => showToast(msg, 'error')}
              />
            </div>

            {/* Product Suggestions Dropdown */}
            {showSearchDropdown && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] z-50 max-h-80 overflow-y-auto divide-y divide-slate-100">
                {isSearching ? (
                  <div className="p-4 text-center text-[#677484] italic">Đang tìm hàng hóa...</div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-[#677484]">
                    Không tìm thấy hàng hóa nào phù hợp với từ khóa &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  searchResults.map((prod) => (
                    <div
                      key={prod.productId}
                      onClick={() => handleSelectProduct(prod)}
                      className="p-2.5 hover:bg-[#eff6ff] transition flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                      <ProductThumb src={prod.imageUrl} alt={prod.name} />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#0070f4] group-hover:underline">
                            {prod.code}
                          </span>
                          <span className="text-[11px] font-medium text-[#15171a]">
                            {prod.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] bg-[#f7f8f9] text-[#677484]">
                            {prod.uom || 'Cái'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#677484]">
                          <span>
                            Giá nhập:{' '}
                            <strong className="text-[#15171a]">
                              {formatVnd(prod.costPrice || prod.standardPrice || 0)} đ
                            </strong>
                          </span>
                        </div>
                      </div>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-[#677484]">Tồn kho:</span>
                          <span
                            className={`font-bold ${
                              prod.stockQuantity > 0 ? 'text-[#00b63e]' : 'text-[#fb2c36]'
                            }`}
                          >
                            {prod.stockQuantity.toLocaleString('vi-VN')} {prod.uom || 'Cái'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tùy chọn hiển thị cột (Ảnh hàng hóa, Tồn kho, Giá vốn, Giá bán) */}
        <div className="shrink-0 -ml-1 mr-auto">
          <PurchaseDisplayOptions columns={columns} onToggle={toggleColumn} />
        </div>

        {/* Right: Branch Selector & User Profile (Giống chuẩn Chuyển hàng) */}
        <div className="flex items-center gap-3 relative shrink-0">
          {/* 1. Bộ chọn Chi Nhánh Kho Làm Việc */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className="h-8 px-3 rounded-[8px] border border-slate-300 bg-white hover:bg-[#f7f8f9] hover:border-[#0070f4] text-xs text-[#15171a] flex items-center gap-2 transition cursor-pointer shadow-2xs"
              title="Click để chọn chi nhánh kho làm việc"
            >
              <div className="w-5 h-5 rounded-[4px] bg-[#eff6ff] text-[#0070f4] flex items-center justify-center shrink-0">
                <Warehouse size={12} />
              </div>
              <div className="text-left max-w-[130px] sm:max-w-[160px] truncate">
                <div className="text-[10px] text-[#677484] font-bold uppercase tracking-wider leading-none">
                  KHO LÀM VIỆC
                </div>
                <div className="font-bold text-[#15171a] truncate leading-tight">
                  {activeWarehouse?.name || 'Kho Tổng Gia Lâm'}
                </div>
              </div>
              <ChevronDown
                size={13}
                className={`text-[#677484] transition-transform duration-200 ${
                  branchDropdownOpen ? 'rotate-180 text-[#0070f4]' : ''
                }`}
              />
            </button>

            {branchDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setBranchDropdownOpen(false)} />
                <div className="absolute right-0 top-10 w-64 bg-white text-[#15171a] rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] font-bold text-[#677484] uppercase tracking-wider border-b border-slate-100 mb-1">
                    Chi nhánh kho làm việc
                  </div>
                  {allWarehouses.map((fac) => {
                    const isSelected = activeWarehouse?.warehouseId === fac.warehouseId;
                    return (
                      <button
                        key={fac.warehouseId}
                        type="button"
                        onClick={() => {
                          setActiveWarehouse(fac);
                          setBranchDropdownOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-[6px] flex items-center justify-between text-xs transition cursor-pointer ${
                          isSelected
                            ? 'bg-[#eff6ff] text-[#0070f4] font-bold'
                            : 'hover:bg-[#f7f8f9] text-[#15171a]'
                        }`}
                      >
                        <span>{fac.name}</span>
                        {isSelected && <Check size={14} className="text-[#0070f4]" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* 2. User Profile (Avatar + Tên + Badge + Trạng thái) */}
          <div className="flex items-center gap-2.5 p-1 rounded-[8px]">
            <div className="relative">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-white shadow-xs"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#0070f4] text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shadow-xs">
                  <span>{currentUser.initials}</span>
                </div>
              )}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#15171a]">{currentUser.name}</span>
                <span className="px-1.5 py-0.2 rounded-[4px] bg-[#eff6ff] text-[#1050cf] font-mono text-[10px] font-bold">
                  {currentUser.code}
                </span>
                <ChevronDown size={13} className="text-[#677484]" />
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[#677484] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00b63e]"></span>
                <span>{currentUser.title}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── 2. Main Content Split View (Left Table + Right Sidebar) ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT COLUMN: Products Table or Empty Excel State */}
        <div className="flex-1 flex flex-col bg-white/65 overflow-hidden">
          {/* Bảng hàng hóa: cột Ảnh / Tồn kho / Giá vốn / Giá bán bật-tắt bằng nút con mắt */}
          <div className="flex-1 overflow-auto">
            <div style={{ minWidth: tableMinWidth }}>
              {/* Table Header Row */}
              <div
                className="h-10 bg-[#e8f2ff] border-b border-slate-200 grid items-center px-3 font-semibold text-[#15171a] text-[13px] sticky top-0 z-10"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <div />
                <div className="text-center">STT</div>
                {columns.image && <div />}
                <div className="pl-2">Mã hàng</div>
                <div className="pl-2">Tên hàng</div>
                <div className="pl-2">ĐVT</div>
                {columns.stock && <div className="text-right pr-2">Tồn kho</div>}
                {columns.costPrice && <div className="text-right pr-2">Giá vốn</div>}
                {columns.salePrice && <div className="text-right pr-2">Giá bán</div>}
                <div
                  className="text-right pr-2"
                  title={isOrder ? undefined : 'SL thực nhận = SL đạt + SL lỗi. Chỉ SL đạt vào tồn kho và tính tiền trả NCC'}
                >
                  {isOrder ? 'Số lượng' : 'SL nhận'}
                </div>
                {!isOrder && (
                  <div className="text-right pr-2" title="SL lỗi: chỉ ghi nhận trên phiếu, không vào tồn kho, không tính tiền">
                    SL lỗi
                  </div>
                )}
                <div className="text-right pr-2">Đơn giá</div>
                <div className="text-right pr-2">Giảm giá</div>
                <div className="text-right pr-2">Thành tiền</div>
              </div>

              {items.length === 0 ? (
                /* EMPTY STATE: thêm hàng từ file excel */
                <div className="py-24 flex flex-col items-center justify-center p-8 text-center select-none">
                  <p className="text-sm font-semibold text-[#15171a] mb-2">Thêm sản phẩm từ file excel</p>
                  <p className="text-xs text-[#677484] mb-6">
                    (Tải về file mẫu:{' '}
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="text-[#0070f4] hover:text-[#005ac3] hover:underline cursor-pointer font-medium"
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-xs shadow-xs transition cursor-pointer"
                  >
                    <FileSpreadsheet size={16} />
                    <span>Chọn file dữ liệu</span>
                  </button>
                </div>
              ) : (
                /* PRODUCT ROWS */
                <div>
                  {items.map((row, index) => {
                    const priceAboveSale = row.unitPrice > row.salePrice;
                    const lineTotalText = formatVnd(row.lineTotal);
                    return (
                      <div
                        key={row.productId}
                        className="grid items-start px-3 py-2.5 text-[13px] transition hover:bg-[#f7f8f9] border-b border-slate-100"
                        style={{ gridTemplateColumns: gridTemplate }}
                      >
                        {/* Xóa dòng */}
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(row.productId)}
                            className="p-1 rounded-[4px] text-[#15171a] hover:text-[#fb2c36] hover:bg-[#fef2f2] transition cursor-pointer"
                            title="Xóa hàng hóa khỏi phiếu"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {/* STT */}
                        <div className="text-center text-[#15171a] pt-1.5">{index + 1}</div>

                        {/* Ảnh hàng hóa */}
                        {columns.image && (
                          <div className="pt-0.5">
                            {row.imageUrl ? (
                              <img
                                src={row.imageUrl}
                                alt={row.productName}
                                className="w-8 h-8 rounded-[4px] object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-[4px] bg-[#e8f2ff] text-[#0070f4] flex items-center justify-center">
                                <ImageIcon size={16} />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Mã hàng */}
                        <div className="pl-2 pt-1.5 text-[#0070f4] truncate" title={row.productCode}>
                          {row.productCode}
                        </div>

                        {/* Tên hàng + thông tin + ghi chú dòng */}
                        <div className="pl-2 pr-2 min-w-0">
                          <div className="flex items-center gap-1.5 pt-1.5">
                            <span className="text-[#15171a] truncate" title={row.productName}>
                              {row.productName}
                            </span>
                            <span
                              className="text-[#677484] shrink-0 cursor-help"
                              title={`Mã: ${row.productCode}${row.categoryName ? `\nNhóm hàng: ${row.categoryName}` : ''}\nTồn kho: ${row.currentStock.toLocaleString('vi-VN')} ${row.unitName}\nGiá vốn: ${formatVnd(row.costPrice)}\nGiá bán: ${formatVnd(row.salePrice)}`}
                            >
                              <Info size={15} />
                            </span>
                          </div>
                          <label className="mt-1 flex items-center gap-1.5 text-[11px] italic text-[#677484] cursor-text">
                            <input
                              type="text"
                              value={row.notes || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setItems((prev) =>
                                  prev.map((it) => (it.productId === row.productId ? { ...it, notes: val } : it))
                                );
                              }}
                              placeholder="Ghi chú..."
                              className="min-w-0 max-w-[160px] bg-transparent italic text-[11px] text-[#15171a] placeholder-[#677484] focus:outline-none"
                            />
                            <Pencil size={12} className="shrink-0" />
                          </label>
                        </div>

                        {/* ĐVT */}
                        <div className="pl-2 pt-1.5 text-[#0070f4]">{row.unitName}</div>

                        {/* Tồn kho */}
                        {columns.stock && (
                          <div className="text-right pr-2 pt-1.5 text-[#15171a]">
                            {row.currentStock.toLocaleString('vi-VN')}
                          </div>
                        )}

                        {/* Giá vốn */}
                        {columns.costPrice && (
                          <div className="text-right pr-2 pt-1.5 text-[#15171a]">
                            {formatVnd(row.costPrice)}
                          </div>
                        )}

                        {/* Giá bán */}
                        {columns.salePrice && (
                          <div className="text-right pr-2 pt-1.5 text-[#15171a]">
                            {formatVnd(row.salePrice)}
                          </div>
                        )}

                        {/* Số lượng (phiếu đặt) / SL thực nhận = SL đạt + SL lỗi (phiếu nhập) */}
                        <div className="px-1">
                          {isOrder ? (
                            <NumberInput
                              value={row.quantity}
                              onChange={(v) => handleUpdateQuantity(row.productId, v)}
                              className="w-full"
                            />
                          ) : (
                            <>
                              <NumberInput
                                value={row.quantity + (row.defectQuantity ?? 0)}
                                onChange={(v) => handleUpdateReceived(row.productId, v)}
                                className="w-full"
                              />
                              {(row.defectQuantity ?? 0) > 0 && (
                                <div
                                  className="text-right text-[11px] text-[#677484] mt-0.5 pr-1"
                                  title="SL đạt = SL nhận − SL lỗi: vào tồn kho và tính tiền trả NCC"
                                >
                                  Đạt: <b className="text-[#15171a]">{row.quantity.toLocaleString('vi-VN')}</b>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* SL lỗi (chỉ phiếu nhập) */}
                        {!isOrder && (
                          <div className="px-1">
                            <NumberInput
                              value={row.defectQuantity ?? 0}
                              onChange={(v) => handleUpdateDefect(row.productId, v)}
                              title="SL lỗi: không vào tồn kho, không tính tiền trả NCC"
                              className={`w-full ${(row.defectQuantity ?? 0) > 0 ? "!border-[#fb2c36] text-[#fb2c36] font-semibold" : ""}`}
                            />
                          </div>
                        )}

                        {/* Đơn giá: đỏ khi cao hơn giá bán */}
                        <div className="px-1">
                          <NumberInput
                            value={row.unitPrice}
                            onChange={(v) => handleUpdatePrice(row.productId, v)}
                            title={
                              priceAboveSale
                                ? `Đơn giá nhập cao hơn giá bán (${row.salePrice.toLocaleString('vi-VN')})`
                                : undefined
                            }
                            className={`w-full ${priceAboveSale ? 'text-[#fb2c36] font-semibold' : 'text-[#15171a]'}`}
                          />
                        </div>

                        {/* Giảm giá: bấm mở popover [VND | %] */}
                        <div className="px-1">
                          <DiscountInput
                            value={row.discountValue}
                            type={row.discountType}
                            base={row.unitPrice}
                            percentHint="/ đơn vị"
                            onChange={(value, type) => handleUpdateDiscount(row.productId, value, type)}
                          />
                        </div>

                        {/* Thành tiền */}
                        {/* min-w-0 + overflow-hidden: số dài không tràn ra ngoài ô; quá 15 ký tự thì thu nhỏ chữ, rê chuột xem đủ */}
                        <div className="px-1 min-w-0">
                          <div
                            title={lineTotalText}
                            className={`h-8 px-2 flex items-center justify-end rounded-[8px] border border-slate-300 bg-white text-[#15171a] overflow-hidden whitespace-nowrap tabular-nums ${
                              lineTotalText.length > 15 ? 'text-[11px]' : ''
                            }`}
                          >
                            {lineTotalText}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Table Footer Summary (when rows exist) */}
          {items.length > 0 && (
            <div className="min-h-10 bg-[#f7f8f9] border-t border-slate-200 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-[#677484] shrink-0">
              <div className="flex items-center gap-4">
                <span>
                  Số mặt hàng: <strong className="text-[#15171a]">{items.length}</strong>
                </span>
                <span>
                  {isOrder ? 'Tổng số lượng đặt' : 'Tổng số lượng nhập'}:{' '}
                  <strong className="text-[#0070f4] text-sm font-bold">
                    {totalQuantity.toLocaleString('vi-VN')}
                  </strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#677484] mr-2">Tổng tiền hàng:</span>
                <span className="text-sm font-bold text-[#15171a] font-mono">
                  {totalGoods.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Divider with Collapse Toggle Arrow Button */}
        <div className="relative z-10 w-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-[#0070f4] hover:bg-[#eff6ff] transition cursor-pointer"
            title={isSidebarCollapsed ? 'Mở rộng khung thông tin' : 'Thu gọn khung thông tin'}
          >
            {isSidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* ─── 3. RIGHT SIDEBAR: Purchase Header & Actions ─── */}
        {!isSidebarCollapsed && (
          <aside className="w-[380px] bg-white/80 backdrop-blur-[2px] border-l border-slate-200 flex flex-col shrink-0 text-[13px] text-[#15171a]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Người nhập + Thời gian nhập */}
              <div className="flex items-center justify-between gap-3">
                <div className="h-8 px-2.5 rounded-[8px] border border-slate-300 flex items-center gap-2 min-w-0 flex-1">
                  <CircleUserRound size={16} className="text-[#15171a] shrink-0" />
                  <span className="truncate">{userDisplay}</span>
                </div>
                <input
                  type="datetime-local"
                  value={purchaseDateTime}
                  onChange={(e) => setPurchaseDateTime(e.target.value)}
                  className="h-8 px-2 rounded-[8px] border border-slate-300 text-[12px] text-[#677484] bg-white hover:border-[#0070f4] focus:border-[#0070f4] focus:outline-none cursor-pointer transition"
                  title={isOrder ? 'Thời gian đặt hàng' : 'Thời gian nhập hàng'}
                />
              </div>

              {/* Ngày giao dự kiến (chỉ phiếu đặt): MRP dùng để tính hàng đang đặt sẽ về ngày nào */}
              {isOrder && (
                <div className="flex items-center justify-between gap-3">
                  <label htmlFor="po-expected-date" className="text-[#677484]" title="Không có ngày giao thì MRP chỉ hiển thị, không tính hàng đặt này vào nguồn">
                    Ngày giao dự kiến
                  </label>
                  <input
                    id="po-expected-date"
                    type="date"
                    value={expectedDate}
                    min={purchaseDateTime ? purchaseDateTime.slice(0, 10) : undefined}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="h-8 px-2 rounded-[8px] border border-slate-300 text-[12px] text-[#15171a] bg-white hover:border-[#0070f4] focus:border-[#0070f4] focus:outline-none cursor-pointer transition"
                  />
                </div>
              )}

              {/* Tìm nhà cung cấp (+ thêm nhanh) */}
              <div className="relative" ref={supplierRef}>
                {selectedSupplier ? (
                  <div className="h-8 px-2.5 rounded-[8px] border border-[#0070f4] bg-[#eff6ff] flex items-center justify-between gap-2">
                    <span className="truncate text-[#0070f4] font-semibold">
                      {selectedSupplier.name}
                      <span className="ml-1.5 font-normal text-[#677484]">{selectedSupplier.code}</span>
                    </span>
                    {!linkedPo && (
                      <button
                        type="button"
                        onClick={() => setSelectedSupplier(null)}
                        className="text-[#677484] hover:text-[#fb2c36] cursor-pointer shrink-0"
                        title="Bỏ chọn nhà cung cấp"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="h-8 px-2.5 rounded-[8px] border border-slate-300 focus-within:border-[#0070f4] flex items-center gap-2 bg-white">
                    <input
                      type="text"
                      value={supplierSearchKeyword}
                      onChange={(e) => {
                        setSupplierSearchKeyword(e.target.value);
                        setShowSupplierDropdown(true);
                      }}
                      onFocus={() => setShowSupplierDropdown(true)}
                      placeholder="Tìm nhà cung cấp"
                      className="flex-1 min-w-0 bg-transparent outline-none placeholder-[#677484]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowQuickAddSupplier(true)}
                      className="text-[#15171a] hover:text-[#0070f4] cursor-pointer shrink-0"
                      title="Thêm nhà cung cấp mới"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                )}

                {showSupplierDropdown && !selectedSupplier && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[8px] border border-slate-200 shadow-lg py-1 z-40 max-h-56 overflow-y-auto">
                    {filteredSuppliers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[#677484]">Không tìm thấy nhà cung cấp</div>
                    ) : (
                      filteredSuppliers.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedSupplier(s);
                            setSupplierSearchKeyword('');
                            setShowSupplierDropdown(false);
                          }}
                          className="px-3 py-1.5 cursor-pointer hover:bg-[#eff6ff]"
                        >
                          <div className="text-[13px] text-[#15171a]">{s.name}</div>
                          <div className="text-[11px] text-[#677484]">
                            {s.code}
                            {s.phone ? ` • ${s.phone}` : ''}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Mã phiếu nhập */}
              <div className="flex items-center justify-between gap-3">
                <span>{isOrder ? 'Mã đặt hàng nhập' : 'Mã phiếu nhập'}</span>
                <input
                  type="text"
                  value={purchaseCode}
                  onChange={(e) => setPurchaseCode(e.target.value)}
                  readOnly={Boolean(editPurchaseId)}
                  placeholder="Mã phiếu tự động"
                  className="w-44 h-8 px-2.5 rounded-[8px] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] bg-white"
                />
              </div>

              {/* Kho nhận hàng (giữ từ form cũ) */}
              <div className="flex items-center justify-between gap-3">
                <span>Kho nhận hàng</span>
                <span className="text-right truncate">{fixedWarehouse?.name || activeWarehouse?.name || 'Kho Tổng Gia Lâm'}</span>
              </div>

              {/* Mã đặt hàng nhập */}
              {!isOrder && (
                <div className="flex items-center justify-between gap-3">
                  <span>Mã đặt hàng nhập</span>
                  <span className="text-right text-[#677484]">{externalPoNumber}</span>
                </div>
              )}

              {/* Trạng thái */}
              <div className="flex items-center justify-between gap-3">
                <span>Trạng thái</span>
                <span>
                  {isOrder
                    ? PO_STATUS[orderOriginalStatus ?? 'DRAFT'].label
                    : status === 'COMPLETED'
                    ? 'Đã nhập hàng'
                    : 'Phiếu tạm'}
                </span>
              </div>

              {/* Tổng tiền hàng */}
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  Tổng tiền hàng
                  <span
                    className="min-w-[18px] h-[18px] px-1 rounded-full border border-[#677484] text-[11px] leading-none flex items-center justify-center text-[#677484]"
                    title={`${items.length} mặt hàng, tổng số lượng ${totalQuantity.toLocaleString('vi-VN')}`}
                  >
                    {items.length}
                  </span>
                </span>
                <span>{Math.round(totalGoods).toLocaleString('vi-VN')}</span>
              </div>

              {/* Giảm giá */}
              <div className="flex items-center justify-between gap-3">
                <span>Giảm giá</span>
                <DiscountInput
                  value={orderDiscountValue}
                  type={orderDiscountType}
                  base={totalGoods}
                  percentHint="tổng tiền hàng"
                  className="w-44"
                  popoverClassName="w-[300px]"
                  onChange={(value, type) => {
                    setOrderDiscountValue(value);
                    setOrderDiscountType(type);
                  }}
                />
              </div>

              {/* Cần trả nhà cung cấp */}
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">{isOrder ? 'Tổng cộng' : 'Cần trả nhà cung cấp'}</span>
                <span className="font-bold text-[#0070f4]">{Math.round(finalPayable).toLocaleString('vi-VN')}</span>
              </div>

              {/* Tiền trả nhà cung cấp + hình thức thanh toán */}
              {!isOrder && (
              // Hai hàng: [nhãn | ô tiền] rồi [Tiền mặt | Chuyển khoản] — để chung một hàng thì nút bị ô nhập đè khi khung hẹp
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0">Tiền trả nhà cung cấp</span>
                  {isCompletedEdit ? (
                    // Phiếu đã nhập: tiền đã trả không sửa tại đây (thanh toán thêm qua phiếu chi ở NCC)
                    <span className="w-44 text-right" title="Thanh toán thêm tại Nhà cung cấp → Thanh toán">
                      {Math.round(paidAmount).toLocaleString('vi-VN')}
                    </span>
                  ) : (
                    <NumberInput
                      inputRef={paidInputRef}
                      value={paidAmount}
                      onChange={setPaidAmount}
                      className="w-44"
                    />
                  )}
                </div>
                <div className="flex justify-end">
                  <div className="inline-flex rounded-[6px] border border-slate-300 overflow-hidden text-[12px]">
                    {([
                      ['CASH', 'Tiền mặt'],
                      ['BANK_TRANSFER', 'Chuyển khoản'],
                    ] as const).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        disabled={isCompletedEdit}
                        onClick={() => setPaymentMethod(key)}
                        className={`px-2.5 h-6 whitespace-nowrap transition cursor-pointer disabled:cursor-not-allowed ${
                          paymentMethod === key
                            ? 'bg-[#0070f4] text-white'
                            : 'bg-white text-[#15171a] hover:bg-[#eff6ff] disabled:hover:bg-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              )}

              {/* Tính vào công nợ (âm = còn nợ nhà cung cấp, giống KiotViet) */}
              {!isOrder && (
              <div className="flex items-center justify-between gap-3">
                <span>Tính vào công nợ</span>
                <span>{debtAmount > 0 ? `-${Math.round(debtAmount).toLocaleString('vi-VN')}` : '0'}</span>
              </div>
              )}

              {/* Ghi chú */}
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú"
                rows={3}
                className="w-full p-2.5 rounded-[8px] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] resize-none bg-white"
              />
            </div>

            {/* Lưu tạm / Hoàn thành */}
            {isOrder ? (
              orderOriginalStatus === 'ORDERED' ? (
                <div className="p-4">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void executeSaveOrder('ORDERED')}
                    className="w-full h-11 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[14px] transition cursor-pointer disabled:opacity-50"
                  >
                    Lưu
                  </button>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void executeSaveOrder('DRAFT')}
                    className="h-11 rounded-[8px] border border-[#0070f4] bg-white hover:bg-[#eff6ff] text-[#0070f4] font-semibold text-[14px] transition cursor-pointer disabled:opacity-50"
                  >
                    Lưu tạm
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void executeSaveOrder('ORDERED')}
                    className="h-11 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[14px] transition cursor-pointer disabled:opacity-50"
                  >
                    Đặt hàng
                  </button>
                </div>
              )
            ) : isCompletedEdit ? (
              <div className="p-4">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveCompleted}
                  className="w-full h-11 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[14px] transition cursor-pointer disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
            ) : (
            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSaveDraft}
                className="h-11 rounded-[8px] border border-[#0070f4] bg-white hover:bg-[#eff6ff] text-[#0070f4] font-semibold text-[14px] transition cursor-pointer disabled:opacity-50"
              >
                Lưu tạm
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleComplete}
                className="h-11 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[14px] transition cursor-pointer disabled:opacity-50"
              >
                Hoàn thành
              </button>
            </div>
            )}
          </aside>
        )}
      </div>

      {/* ─── 4. Quick Add Supplier Modal ─── */}
      <QuickAddSupplierModal
        open={showQuickAddSupplier}
        onClose={() => setShowQuickAddSupplier(false)}
        onSuccess={(created) => {
          setSuppliers((prev) => [created, ...prev]);
          setSelectedSupplier(created);
        }}
      />

    </div>
  );
}
