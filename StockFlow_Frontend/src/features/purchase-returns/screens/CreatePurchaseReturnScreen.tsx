'use client';

// Màn Trả hàng nhập (trả hàng cho nhà cung cấp) — bố cục giống màn Nhập hàng (theo KiotViet):
// - ?grId=<id>  : trả theo phiếu nhập (NCC + kho theo phiếu nhập, SL trả ≤ SL còn được trả "/x")
// - ?grId=<id>&type=defect : trả hàng lỗi ghi nhận trên phiếu nhập (BR-24) — SL ≤ SL lỗi chưa trả,
//                            không trừ tồn kho, không tính tiền (hàng lỗi chưa vào kho, chưa trả tiền NCC)
// - ?edit=<id>  : mở lại phiếu tạm để sửa / hoàn thành
// - không tham số: trả hàng tự do (chọn NCC + tìm hàng hóa trong kho làm việc)

import { tabSession } from '@/lib/auth/tabSession';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Image as ImageIcon,
  Info,
  Search,
  Trash2,
  Warehouse,
  X,
} from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { productService, type BackendProduct } from '@/features/products/services/productService';
import { supplierService } from '@/features/suppliers/services/supplierService';
import type { Supplier } from '@/features/suppliers/types';
import { purchaseReturnService } from '@/features/purchase-returns/services/purchaseReturnService';
import type { PurchaseReturnType, ReturnSource, SavePurchaseReturnPayload } from '@/features/purchase-returns/types';
import { toLocalDatetimeInputString } from '@/lib/utils/date';
import { NumberInput } from '@/components/inputs/NumberInput';
import { ProductThumb } from '@/components/ProductThumb';
import { DiscountInput, discountAmount, type DiscountType } from '@/components/inputs/DiscountInput';

interface ReturnRow {
  /** Khóa dòng: gr-<grItemId> (theo phiếu nhập) hoặc p-<productId> (trả tự do) */
  key: string;
  productId: number;
  grItemId?: number;
  productCode: string;
  productName: string;
  unitName: string;
  imageUrl?: string | null;
  currentStock: number;
  /** SL tối đa được trả (chỉ khi trả theo phiếu nhập) */
  maxQty?: number;
  quantity: number;
  importPrice: number;
  returnPrice: number;
  /** Giá vốn thực của dòng phiếu nhập (đã trừ giảm giá phiếu) — chỉ khi trả theo phiếu nhập */
  landedCost?: number;
}

interface SelectedPartner {
  id: number;
  code: string;
  name: string;
  currentPayable: number;
}

const formatVnd = (n: number) => Math.round(n || 0).toLocaleString('vi-VN');

const lineTotal = (r: ReturnRow) => Math.round(r.quantity * r.returnPrice);

function getUserDisplay(): string {
  try {
    const raw = tabSession.get('stockflow_user');
    if (!raw) return 'Người dùng';
    const u = JSON.parse(raw) as { fullName?: string; username?: string };
    return u.fullName || u.username || 'Người dùng';
  } catch {
    return 'Người dùng';
  }
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function CreatePurchaseReturnScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const grIdParam = searchParams.get('grId');
  const editId = searchParams.get('edit');
  const typeParam = searchParams.get('type');

  // Loại phiếu: trả hàng lỗi (?type=defect hoặc phiếu tạm DEFECT khi sửa) / trả hàng đã nhập kho
  const [returnType, setReturnType] = useState<PurchaseReturnType>(
    typeParam === 'defect' && !editId ? 'DEFECT' : 'STOCK'
  );
  const isDefect = returnType === 'DEFECT';

  const { activeWarehouse } = useActiveWarehouse();
  const [userDisplay] = useState(getUserDisplay);

  // ─── Phiếu nguồn ────────────────────────────────────────────────────────────
  const [source, setSource] = useState<ReturnSource | null>(null);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [warehouseName, setWarehouseName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(Boolean(grIdParam || editId));
  const loadedRef = useRef<string | null>(null);

  // ─── Form ───────────────────────────────────────────────────────────────────
  const [returnCode, setReturnCode] = useState('');
  const [returnDateTime, setReturnDateTime] = useState(() => toLocalDatetimeInputString(new Date()));
  const [partner, setPartner] = useState<SelectedPartner | null>(null);
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState<DiscountType>('VND');
  // false: Giảm giá tự lấy theo phần giảm giá phiếu nhập phân bổ cho hàng trả; true: người dùng đã tự nhập
  const [discountTouched, setDiscountTouched] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── NCC (trả tự do) ────────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierKeyword, setSupplierKeyword] = useState('');
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  // ─── Tìm hàng hóa ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<BackendProduct[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // ─── Toast + xác nhận ───────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const showToast = (text: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3500);
  };

  const isReceiptMode = Boolean(source);
  const effectiveWarehouseId = warehouseId ?? activeWarehouse?.warehouseId ?? null;
  const effectiveWarehouseName = warehouseName || activeWarehouse?.name || '';

  // ─── Nạp phiếu nhập gốc / phiếu tạm ─────────────────────────────────────────
  useEffect(() => {
    const key = `${grIdParam ?? ''}|${editId ?? ''}|${typeParam ?? ''}`;
    if ((!grIdParam && !editId) || loadedRef.current === key) return;
    loadedRef.current = key;

    // Trả hàng lỗi: mặc định trả hết SL lỗi còn lại (thường trả cả lô lỗi cho NCC)
    const toSourceRows = (src: ReturnSource): ReturnRow[] =>
      src.items.map((it) => ({
        key: `gr-${it.grItemId}`,
        productId: it.productId,
        grItemId: it.grItemId,
        productCode: it.productCode,
        productName: it.productName,
        unitName: it.unit,
        imageUrl: it.imageUrl,
        currentStock: it.currentStock,
        maxQty: it.remainingQty,
        quantity: src.returnType === 'DEFECT' ? it.remainingQty : 0,
        importPrice: it.importPrice,
        returnPrice: src.returnType === 'DEFECT' ? 0 : it.importPrice,
        landedCost: it.landedCost,
      }));

    const applySource = (src: ReturnSource) => {
      setSource(src);
      setWarehouseId(src.warehouseId);
      setWarehouseName(src.warehouseName);
      setPartner({
        id: src.partnerId,
        code: src.partnerCode,
        name: src.partnerName,
        currentPayable: src.partnerCurrentPayable,
      });
    };

    (async () => {
      try {
        if (editId) {
          const detail = await purchaseReturnService.getById(editId);
          if (detail.status !== 'DRAFT') {
            showToast('Chỉ sửa được phiếu trả hàng nhập ở trạng thái Phiếu tạm', 'error');
            router.replace('/purchase-returns');
            return;
          }
          setReturnCode(detail.returnCode);
          const detailType: PurchaseReturnType = detail.returnType === 'DEFECT' ? 'DEFECT' : 'STOCK';
          setReturnType(detailType);
          if (detail.returnDate) setReturnDateTime(toLocalDatetimeInputString(detail.returnDate));
          setDiscountType('VND');
          setDiscountValue(detail.discountAmount || 0);
          setDiscountTouched(true);
          setNotes(detail.notes || '');
          if (detail.paymentMethod === 'BANK_TRANSFER') setPaymentMethod('BANK_TRANSFER');
          setWarehouseId(detail.warehouseId);
          setWarehouseName(detail.warehouseName);
          setPartner({
            id: detail.partnerId,
            code: detail.partnerCode,
            name: detail.partnerName,
            currentPayable: detail.partnerCurrentPayable,
          });

          if (detail.grId) {
            const src = await purchaseReturnService.getSource(detail.grId, detail.purchaseReturnId, detailType);
            applySource(src);
            const saved = new Map(detail.items.map((i) => [i.grItemId ?? -1, i]));
            setRows(
              toSourceRows(src).map((r) => {
                const s = saved.get(r.grItemId ?? -2);
                // Phiếu tạm: dòng chưa có trong phiếu thì để SL 0 (kể cả trả hàng lỗi)
                return s ? { ...r, quantity: s.quantity, returnPrice: s.returnPrice } : { ...r, quantity: 0 };
              })
            );
          } else {
            setRows(
              detail.items.map((i) => ({
                key: `p-${i.productId}`,
                productId: i.productId,
                productCode: i.productCode,
                productName: i.productName,
                unitName: i.unit,
                currentStock: 0,
                quantity: i.quantity,
                importPrice: i.importPrice,
                returnPrice: i.returnPrice,
              }))
            );
          }
        } else if (grIdParam) {
          const defect = typeParam === 'defect';
          const src = await purchaseReturnService.getSource(grIdParam, undefined, defect ? 'DEFECT' : undefined);
          applySource(src);
          setRows(toSourceRows(src));
          if (src.items.every((i) => i.remainingQty <= 0)) {
            showToast(
              defect ? `Phiếu nhập ${src.grCode} không còn hàng lỗi chưa trả` : `Phiếu nhập ${src.grCode} đã được trả hết hàng`,
              'warning'
            );
          }
        }
      } catch (err) {
        showToast(errorMessage(err, 'Không tải được dữ liệu phiếu'), 'error');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grIdParam, editId, typeParam]);

  // NCC cho chế độ trả tự do
  useEffect(() => {
    supplierService
      .getSuppliers({ status: 'ACTIVE' })
      .then((data) => setSuppliers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const filteredSuppliers = useMemo(() => {
    const kw = supplierKeyword.trim().toLowerCase();
    const list = kw
      ? suppliers.filter((s) => s.name.toLowerCase().includes(kw) || s.code.toLowerCase().includes(kw))
      : suppliers;
    return list.slice(0, 15);
  }, [suppliers, supplierKeyword]);

  // Đóng dropdown khi bấm ra ngoài
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setShowSupplierDropdown(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearchDropdown(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Tìm hàng hóa: theo phiếu nhập → lọc các dòng của phiếu đã bị xóa khỏi bảng; trả tự do → tìm trong kho
  const receiptSuggestions = useMemo(() => {
    if (!source) return [];
    const kw = searchQuery.trim().toLowerCase();
    const inTable = new Set(rows.map((r) => r.grItemId));
    return source.items.filter(
      (i) =>
        !inTable.has(i.grItemId) &&
        (!kw || i.productCode.toLowerCase().includes(kw) || i.productName.toLowerCase().includes(kw))
    );
  }, [source, rows, searchQuery]);

  useEffect(() => {
    if (source) return;
    const kw = searchQuery.trim();
    if (!kw) return;
    const timer = setTimeout(async () => {
      try {
        const prods = await productService.getProducts({
          warehouseId: effectiveWarehouseId ?? undefined,
          search: kw,
          status: 'ACTIVE',
        });
        setSearchResults(prods.slice(0, 20));
        setShowSearchDropdown(true);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, source, effectiveWarehouseId]);

  const addFreeProduct = (p: BackendProduct) => {
    setRows((prev) => {
      const existing = prev.find((r) => r.productId === p.productId);
      if (existing) {
        return prev.map((r) => (r.productId === p.productId ? { ...r, quantity: r.quantity + 1 } : r));
      }
      const price = Math.round(p.costPrice || 0);
      return [
        ...prev,
        {
          key: `p-${p.productId}`,
          productId: p.productId,
          productCode: p.code,
          productName: p.name,
          unitName: p.uom || 'Cái',
          imageUrl: p.imageUrl,
          currentStock: p.stockQuantity,
          quantity: 1,
          importPrice: price,
          returnPrice: price,
        },
      ];
    });
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const addReceiptLine = (grItemId: number) => {
    const it = source?.items.find((i) => i.grItemId === grItemId);
    if (!it) return;
    setRows((prev) => [
      ...prev,
      {
        key: `gr-${it.grItemId}`,
        productId: it.productId,
        grItemId: it.grItemId,
        productCode: it.productCode,
        productName: it.productName,
        unitName: it.unit,
        imageUrl: it.imageUrl,
        currentStock: it.currentStock,
        maxQty: it.remainingQty,
        quantity: isDefect ? it.remainingQty : 0,
        importPrice: it.importPrice,
        returnPrice: isDefect ? 0 : it.importPrice,
      },
    ]);
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const updateRow = (key: string, patch: Partial<ReturnRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const setQuantity = (row: ReturnRow, qty: number) => {
    if (row.maxQty !== undefined && qty > row.maxQty) {
      showToast(`Chỉ được trả tối đa ${row.maxQty.toLocaleString('vi-VN')} ${row.unitName} cho ${row.productCode}`, 'warning');
      updateRow(row.key, { quantity: row.maxQty });
      return;
    }
    updateRow(row.key, { quantity: Math.max(0, qty) });
  };

  // ─── Tổng tiền ──────────────────────────────────────────────────────────────
  const activeRows = rows.filter((r) => r.quantity > 0);
  const totalGoods = activeRows.reduce((s, r) => s + lineTotal(r), 0);
  const totalQty = activeRows.reduce((s, r) => s + r.quantity, 0);
  // Phiếu nhập có giảm giá cả phiếu → giá vốn thực mỗi SP thấp hơn Giá nhập; phần chênh × SL trả được
  // gợi ý làm Giảm giá để NCC không bị ghi có nhiều hơn số tiền thực tế mình đã mua.
  const suggestedDiscount = Math.min(
    totalGoods,
    activeRows.reduce(
      (s, r) => s + (r.landedCost !== undefined ? Math.round(r.quantity * Math.max(0, r.importPrice - r.landedCost)) : 0),
      0
    )
  );
  const effDiscountValue = discountTouched ? discountValue : suggestedDiscount;
  const effDiscountType: DiscountType = discountTouched ? discountType : 'VND';
  const orderDiscount = Math.round(discountAmount(totalGoods, effDiscountType, effDiscountValue));
  const supplierMustPay = Math.max(0, totalGoods - orderDiscount);
  const refund = Math.min(refundAmount, supplierMustPay);
  const debtChange = supplierMustPay - refund;

  // ─── Lưu ────────────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    if (!partner) {
      showToast('Vui lòng chọn nhà cung cấp', 'warning');
      setIsSidebarCollapsed(false);
      return false;
    }
    if (activeRows.length === 0) {
      showToast('Vui lòng nhập số lượng trả cho ít nhất 1 mặt hàng', 'warning');
      return false;
    }
    if (!effectiveWarehouseId) {
      showToast('Vui lòng chọn kho làm việc', 'warning');
      return false;
    }
    return true;
  };

  const save = async (status: 'DRAFT' | 'COMPLETED') => {
    if (!validate() || !partner) return;
    const payload: SavePurchaseReturnPayload = {
      partnerId: partner.id,
      warehouseId: effectiveWarehouseId ?? undefined,
      grId: source?.grId ?? null,
      returnCode: returnCode.trim() || null,
      returnDate: returnDateTime ? new Date(returnDateTime).toISOString() : new Date().toISOString(),
      status,
      // Trả hàng lỗi: không tính tiền (hàng lỗi chưa trả tiền NCC)
      discountAmount: isDefect ? 0 : orderDiscount,
      refundAmount: status === 'COMPLETED' && !isDefect ? refund : 0,
      paymentMethod,
      notes: notes.trim() || null,
      returnType,
      items: activeRows.map((r) => ({
        productId: r.productId,
        quantity: r.quantity,
        returnPrice: isDefect ? 0 : r.returnPrice,
        grItemId: r.grItemId ?? null,
      })),
    };

    try {
      setIsSubmitting(true);
      const result = editId
        ? await purchaseReturnService.update(editId, payload)
        : await purchaseReturnService.create(payload);
      showToast(
        status === 'COMPLETED'
          ? isDefect
            ? `Đã trả hàng lỗi cho NCC. Mã phiếu: ${result.returnCode}.`
            : `Trả hàng thành công! Mã phiếu: ${result.returnCode}. Tồn kho và công nợ đã cập nhật.`
          : `Đã lưu tạm phiếu ${isDefect ? 'trả hàng lỗi' : 'trả hàng nhập'}: ${result.returnCode}`
      );
      setTimeout(() => router.push('/purchase-returns'), 700);
    } catch (err) {
      showToast(errorMessage(err, 'Lỗi khi lưu phiếu trả hàng nhập'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Trả hàng lỗi: bỏ cột Giá trả lại / Thành tiền (không tính tiền)
  const gridTemplate = isDefect
    ? '36px 44px 48px 110px minmax(180px,1fr) 70px 120px 110px'
    : '36px 44px 48px 110px minmax(180px,1fr) 70px 120px 110px 120px 120px';

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-transparent text-[13px] text-[#15171a] select-none overflow-hidden font-sans">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-[8px] shadow-lg text-white font-medium flex items-center gap-2 ${
            toast.type === 'error' ? 'bg-[#fb2c36]' : toast.type === 'warning' ? 'bg-amber-600' : 'bg-[#00b63e]'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          {toast.type === 'warning' && <AlertTriangle size={16} />}
          {toast.type === 'error' && <AlertCircle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Xác nhận hoàn thành */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] max-w-md w-full p-5 flex flex-col gap-4 border border-slate-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#15171a]">
                  {isDefect ? 'Xác nhận trả hàng lỗi' : 'Xác nhận trả hàng nhập'}
                </h3>
                {isDefect ? (
                  <p className="text-xs text-[#677484] mt-1 leading-relaxed">
                    Trả {totalQty.toLocaleString('vi-VN')} sản phẩm lỗi của phiếu nhập {source?.grCode} cho nhà cung cấp
                    &quot;{partner?.name}&quot;. Hàng lỗi chưa nhập kho và chưa tính tiền nên tồn kho và công nợ NCC không
                    thay đổi.
                  </p>
                ) : (
                  <p className="text-xs text-[#677484] mt-1 leading-relaxed">
                    Trả {totalQty.toLocaleString('vi-VN')} sản phẩm cho nhà cung cấp &quot;{partner?.name}&quot;. Tồn kho tại
                    &quot;{effectiveWarehouseName}&quot; sẽ bị trừ và công nợ phải trả NCC giảm{' '}
                    <strong className="text-[#15171a]">{formatVnd(debtChange)}</strong>.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="px-3.5 py-1.5 rounded-[8px] border border-slate-300 text-[#15171a] hover:bg-[#f7f8f9] font-medium cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  save('COMPLETED');
                }}
                className="px-4 py-1.5 rounded-[8px] bg-[#00b63e] hover:bg-[#009e35] text-white font-semibold cursor-pointer"
              >
                Đồng ý hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 1. Header ─── */}
      <header className="h-12 bg-white/85 backdrop-blur-[2px] border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0 relative z-30">
        <div className="flex items-center gap-3">
          <Link
            href="/purchase-returns"
            className="p-1 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer"
            title="Quay lại danh sách trả hàng nhập"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </Link>
          <span className="text-[20px] font-semibold text-[#15171a] tracking-tight whitespace-nowrap leading-[36px]">
            {isDefect ? 'Trả hàng lỗi' : 'Trả hàng nhập'}
          </span>
        </div>

        {/* Tìm hàng hóa */}
        <div className="flex-1 max-w-xl mx-4 mr-auto relative" ref={searchRef}>
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#677484] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (source) setShowSearchDropdown(true);
            }}
            onFocus={() => {
              if (source || searchQuery.trim()) setShowSearchDropdown(true);
            }}
            placeholder={source ? `Tìm hàng hóa trong phiếu nhập ${source.grCode}` : 'Tìm hàng hóa theo mã hoặc tên'}
            className="w-full h-8 pl-8 pr-3 rounded-full bg-[#f7f8f9] border border-slate-300 text-[13px] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
          />
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-[8px] shadow-[rgba(169,180,203,0.32)_0px_8px_20px_0px] z-50 max-h-80 overflow-y-auto divide-y divide-slate-100">
              {source ? (
                receiptSuggestions.length === 0 ? (
                  <div className="p-4 text-center text-[#677484]">Tất cả hàng hóa của phiếu nhập đã có trong bảng</div>
                ) : (
                  receiptSuggestions.map((it) => (
                    <button
                      key={it.grItemId}
                      type="button"
                      onClick={() => addReceiptLine(it.grItemId)}
                      className="w-full text-left p-2.5 hover:bg-[#eff6ff] flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <ProductThumb src={it.imageUrl} alt={it.productName} />
                        <span>
                          <span className="font-bold text-[#0070f4] mr-2">{it.productCode}</span>
                          {it.productName}
                        </span>
                      </span>
                      <span className="text-[11px] text-[#677484]">
                        {isDefect ? 'Hàng lỗi chưa trả' : 'Còn được trả'}: <strong className="text-[#15171a]">{it.remainingQty.toLocaleString('vi-VN')}</strong>
                      </span>
                    </button>
                  ))
                )
              ) : !searchQuery.trim() ? (
                <div className="p-4 text-center text-[#677484]">Nhập mã hoặc tên hàng hóa để tìm</div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-[#677484]">
                  Không tìm thấy hàng hóa phù hợp với &quot;{searchQuery}&quot;
                </div>
              ) : (
                searchResults.map((p) => (
                  <button
                    key={p.productId}
                    type="button"
                    onClick={() => addFreeProduct(p)}
                    className="w-full text-left p-2.5 hover:bg-[#eff6ff] flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <ProductThumb src={p.imageUrl} alt={p.name} />
                      <span>
                        <span className="font-bold text-[#0070f4] mr-2">{p.code}</span>
                        {p.name}
                        <span className="ml-2 text-[11px] text-[#677484]">Giá vốn: {formatVnd(p.costPrice)}</span>
                      </span>
                    </span>
                    <span className="text-[11px] text-[#677484]">
                      Tồn: <strong className={p.stockQuantity > 0 ? 'text-[#00b63e]' : 'text-[#fb2c36]'}>{p.stockQuantity.toLocaleString('vi-VN')}</strong>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Kho trả hàng */}
        <div className="h-8 px-3 rounded-[8px] border border-slate-300 bg-white text-xs flex items-center gap-2 shrink-0" title="Kho xuất trả hàng">
          <div className="w-5 h-5 rounded-[4px] bg-[#eff6ff] text-[#0070f4] flex items-center justify-center shrink-0">
            <Warehouse size={12} />
          </div>
          <div className="text-left">
            <div className="text-[10px] text-[#677484] font-bold uppercase tracking-wider leading-none">Kho trả hàng</div>
            <div className="font-bold text-[#15171a] leading-tight">{effectiveWarehouseName || '—'}</div>
          </div>
        </div>
      </header>

      {/* ─── 2. Bảng hàng + sidebar ─── */}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col bg-white/65 overflow-hidden">
          <div className="flex-1 overflow-auto">
            <div style={{ minWidth: 980 }}>
              <div
                className="h-10 bg-[#e8f2ff] border-b border-slate-200 grid items-center px-3 font-semibold text-[13px] sticky top-0 z-10"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <div />
                <div className="text-center">STT</div>
                <div />
                <div className="pl-2">Mã hàng</div>
                <div className="pl-2">Tên hàng</div>
                <div className="pl-2">ĐVT</div>
                <div className="text-right pr-2" title={isDefect ? 'SL hàng lỗi trả NCC / SL lỗi chưa trả' : undefined}>
                  {isDefect ? 'SL lỗi trả' : 'Số lượng'}
                </div>
                <div className="text-right pr-2">Giá nhập</div>
                {!isDefect && <div className="text-right pr-2">Giá trả lại</div>}
                {!isDefect && <div className="text-right pr-2">Thành tiền</div>}
              </div>

              {loading ? (
                <div className="py-24 text-center text-[#677484]">Đang tải dữ liệu phiếu...</div>
              ) : rows.length === 0 ? (
                <div className="py-24 text-center text-[#677484]">
                  {isDefect
                    ? 'Phiếu nhập không có hàng lỗi để trả'
                    : source
                      ? 'Phiếu nhập không còn hàng hóa để trả'
                      : 'Tìm và chọn hàng hóa cần trả cho nhà cung cấp'}
                </div>
              ) : (
                rows.map((row, index) => (
                  <div
                    key={row.key}
                    className="grid items-start px-3 py-2.5 text-[13px] hover:bg-[#f7f8f9] border-b border-slate-100"
                    style={{ gridTemplateColumns: gridTemplate }}
                  >
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))}
                        className="p-1 rounded-[4px] hover:text-[#fb2c36] hover:bg-[#fef2f2] cursor-pointer"
                        title="Bỏ hàng hóa khỏi phiếu"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="text-center pt-1.5">{index + 1}</div>
                    <div className="pt-0.5">
                      {row.imageUrl ? (
                        <img src={row.imageUrl} alt={row.productName} className="w-8 h-8 rounded-[4px] object-cover border border-slate-200" />
                      ) : (
                        <div className="w-8 h-8 rounded-[4px] bg-[#e8f2ff] text-[#0070f4] flex items-center justify-center">
                          <ImageIcon size={16} />
                        </div>
                      )}
                    </div>
                    <div className="pl-2 pt-1.5 text-[#0070f4] truncate" title={row.productCode}>
                      {row.productCode}
                    </div>
                    <div className="pl-2 pr-2 pt-1.5 min-w-0 flex items-center gap-1.5">
                      <span className="truncate" title={row.productName}>{row.productName}</span>
                      <span
                        className="text-[#677484] shrink-0 cursor-help"
                        title={`Mã: ${row.productCode}\nTồn kho: ${row.currentStock.toLocaleString('vi-VN')} ${row.unitName}\nGiá nhập: ${formatVnd(row.importPrice)}`}
                      >
                        <Info size={15} />
                      </span>
                    </div>
                    <div className="pl-2 pt-1.5 text-[#0070f4]">{row.unitName}</div>
                    <div className="px-1">
                      <NumberInput value={row.quantity} onChange={(v) => setQuantity(row, v)} className="w-full" />
                      {row.maxQty !== undefined && (
                        <div className="text-right text-[12px] text-[#677484] mt-0.5 pr-1">
                          /{row.maxQty.toLocaleString('vi-VN')}
                        </div>
                      )}
                    </div>
                    <div className="text-right pr-2 pt-1.5">{formatVnd(row.importPrice)}</div>
                    {!isDefect && (
                      <div className="px-1">
                        <NumberInput
                          value={row.returnPrice}
                          onChange={(v) => updateRow(row.key, { returnPrice: Math.max(0, v) })}
                          className="w-full"
                        />
                      </div>
                    )}
                    {!isDefect && (
                      <div className="text-right pr-2 pt-1.5 font-medium">{formatVnd(lineTotal(row))}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <div className="min-h-10 bg-[#f7f8f9] border-t border-slate-200 px-3 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs text-[#677484] shrink-0">
              <span>
                Số mặt hàng trả: <strong className="text-[#15171a]">{activeRows.length}</strong>
                <span className="ml-4">
                  Tổng số lượng trả: <strong className="text-[#0070f4] text-sm">{totalQty.toLocaleString('vi-VN')}</strong>
                </span>
              </span>
              {!isDefect && (
                <span>
                  Tổng tiền hàng: <strong className="text-sm text-[#15171a]">{formatVnd(totalGoods)} đ</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Thu gọn / mở rộng sidebar */}
        <div className="relative z-10 w-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed((v) => !v)}
            className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-slate-300 shadow-xs flex items-center justify-center text-[#0070f4] hover:bg-[#eff6ff] cursor-pointer"
            title={isSidebarCollapsed ? 'Mở rộng khung thông tin' : 'Thu gọn khung thông tin'}
          >
            {isSidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {/* ─── 3. Sidebar thông tin phiếu ─── */}
        {!isSidebarCollapsed && (
          <aside className="w-[380px] bg-white/80 backdrop-blur-[2px] border-l border-slate-200 flex flex-col shrink-0">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Người tạo + thời gian */}
              <div className="flex items-center justify-between gap-3">
                <div className="h-8 px-2.5 rounded-[8px] border border-slate-300 flex items-center gap-2 min-w-0 flex-1">
                  <CircleUserRound size={16} className="shrink-0" />
                  <span className="truncate">{userDisplay}</span>
                </div>
                <input
                  type="datetime-local"
                  value={returnDateTime}
                  onChange={(e) => setReturnDateTime(e.target.value)}
                  className="h-8 px-2 rounded-[8px] border border-slate-300 text-[12px] text-[#677484] bg-white hover:border-[#0070f4] focus:border-[#0070f4] focus:outline-none cursor-pointer"
                  title="Thời gian trả hàng"
                />
              </div>

              {/* Nợ hiện tại với NCC */}
              {partner && (
                <div className="text-[#15171a]">
                  Nợ: <strong>{formatVnd(partner.currentPayable)}</strong>
                </div>
              )}

              {/* Nhà cung cấp */}
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0">Nhà cung cấp</span>
                {isReceiptMode || editId ? (
                  <span className="text-right truncate">{partner?.name}</span>
                ) : (
                  <div className="relative w-52" ref={supplierRef}>
                    {partner ? (
                      <div className="h-8 px-2.5 rounded-[8px] border border-[#0070f4] bg-[#eff6ff] flex items-center justify-between gap-2">
                        <span className="truncate text-[#0070f4] font-semibold">{partner.name}</span>
                        <button
                          type="button"
                          onClick={() => setPartner(null)}
                          className="text-[#677484] hover:text-[#fb2c36] cursor-pointer shrink-0"
                          title="Bỏ chọn nhà cung cấp"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={supplierKeyword}
                        onChange={(e) => {
                          setSupplierKeyword(e.target.value);
                          setShowSupplierDropdown(true);
                        }}
                        onFocus={() => setShowSupplierDropdown(true)}
                        placeholder="Tìm nhà cung cấp"
                        className="w-full h-8 px-2.5 rounded-[8px] border border-slate-300 placeholder-[#677484] focus:outline-none focus:border-[#0070f4]"
                      />
                    )}
                    {showSupplierDropdown && !partner && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-[8px] shadow-lg z-40 max-h-64 overflow-y-auto">
                        {filteredSuppliers.length === 0 ? (
                          <div className="px-3 py-2 text-[#677484]">Không tìm thấy nhà cung cấp</div>
                        ) : (
                          filteredSuppliers.map((s) => (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => {
                                setPartner({
                                  id: Number(s.id),
                                  code: s.code,
                                  name: s.name,
                                  currentPayable: s.currentPayable ?? 0,
                                });
                                setSupplierKeyword('');
                                setShowSupplierDropdown(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-[#eff6ff] cursor-pointer"
                            >
                              <div>{s.name}</div>
                              <div className="text-[11px] text-[#677484]">{s.code}</div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mã trả hàng nhập */}
              <div className="flex items-center justify-between gap-3">
                <span>Mã trả hàng nhập</span>
                <input
                  type="text"
                  value={returnCode}
                  onChange={(e) => setReturnCode(e.target.value)}
                  readOnly={Boolean(editId)}
                  placeholder="Mã phiếu tự động"
                  className="w-44 h-8 px-2.5 rounded-[8px] border border-slate-300 placeholder-[#677484] focus:outline-none focus:border-[#0070f4] bg-white"
                />
              </div>

              {/* Phiếu nhập gốc */}
              {source && (
                <div className="flex items-center justify-between gap-3">
                  <span>Phiếu nhập</span>
                  <span className="text-[#0070f4]">{source.grCode}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <span>Trạng thái</span>
                <span>Phiếu tạm</span>
              </div>

              {isDefect && (
                <div className="flex items-start gap-2 p-2.5 rounded-[8px] border border-amber-200 bg-amber-50 text-[12px] text-amber-800 leading-snug">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Hàng lỗi ghi nhận lúc nhận hàng chưa nhập kho và chưa tính tiền NCC. Phiếu trả hàng lỗi không trừ tồn
                    kho và không thay đổi công nợ; phiếu đặt (nếu có) vẫn chờ NCC giao bù phần lỗi.
                  </span>
                </div>
              )}

              {!isDefect && (
              <>
              {/* Tổng tiền hàng */}
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5">
                  Tổng tiền hàng
                  <span className="min-w-[18px] h-[18px] px-1 rounded-full border border-[#677484] text-[11px] leading-none flex items-center justify-center text-[#677484]">
                    {activeRows.length}
                  </span>
                </span>
                <span>{formatVnd(totalGoods)}</span>
              </div>

              {/* Giảm giá */}
              <div className="flex items-center justify-between gap-3">
                <span>Giảm giá</span>
                <DiscountInput
                  value={effDiscountValue}
                  type={effDiscountType}
                  base={totalGoods}
                  percentHint="tổng tiền hàng"
                  className="w-44"
                  popoverClassName="w-[300px]"
                  onChange={(value, type) => {
                    setDiscountTouched(true);
                    setDiscountValue(value);
                    setDiscountType(type);
                  }}
                />
              </div>
              {suggestedDiscount > 0 && (
                <div className="-mt-1 text-[11px] text-[#677484] leading-snug">
                  Giảm giá phiếu nhập phân bổ cho hàng trả: <b>{formatVnd(suggestedDiscount)}</b>
                  {discountTouched && orderDiscount !== suggestedDiscount && (
                    <button
                      type="button"
                      onClick={() => setDiscountTouched(false)}
                      className="ml-1 text-[#0070f4] hover:underline cursor-pointer"
                    >
                      Áp dụng
                    </button>
                  )}
                </div>
              )}

              {/* Nhà cung cấp cần trả */}
              <div className="flex items-center justify-between gap-3">
                <span className="font-bold">Nhà cung cấp cần trả</span>
                <span className="font-bold text-[#0070f4]">{formatVnd(supplierMustPay)}</span>
              </div>

              {/* Tiền nhà cung cấp trả + hình thức — hai hàng: [nhãn | ô tiền] rồi [Tiền mặt | Chuyển khoản]
                  (để chung một hàng thì nút bị ô nhập đè khi khung hẹp, giống màn Nhập hàng) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="shrink-0">Tiền nhà cung cấp trả</span>
                  <NumberInput
                    value={refundAmount}
                    onChange={(v) => setRefundAmount(Math.min(Math.max(0, v), supplierMustPay))}
                    className="w-44"
                  />
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
                        onClick={() => setPaymentMethod(key)}
                        className={`px-2.5 h-6 whitespace-nowrap cursor-pointer transition ${
                          paymentMethod === key ? 'bg-[#0070f4] text-white' : 'bg-white hover:bg-[#eff6ff]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tính vào công nợ: phần NCC chưa trả lại → trừ vào nợ phải trả NCC */}
              <div className="flex items-center justify-between gap-3">
                <span>Tính vào công nợ</span>
                <span>{formatVnd(debtChange)}</span>
              </div>
              </>
              )}

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú"
                rows={3}
                className="w-full p-2.5 rounded-[8px] border border-slate-300 placeholder-[#677484] focus:outline-none focus:border-[#0070f4] resize-none bg-white"
              />
            </div>

            <div className="p-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting || loading}
                onClick={() => save('DRAFT')}
                className="h-11 rounded-[8px] border border-[#0070f4] bg-white hover:bg-[#eff6ff] text-[#0070f4] font-semibold text-[14px] cursor-pointer disabled:opacity-50"
              >
                Lưu tạm
              </button>
              <button
                type="button"
                disabled={isSubmitting || loading}
                onClick={() => {
                  if (validate()) setConfirmOpen(true);
                }}
                className="h-11 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] text-white font-semibold text-[14px] cursor-pointer disabled:opacity-50"
              >
                Hoàn thành
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
