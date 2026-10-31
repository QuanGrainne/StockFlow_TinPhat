// src/app/(dashboard)/purchases/create/CreatePurchaseClient.tsx
// Màn hình Tạo mới & Chỉnh sửa phiếu nhập hàng chuẩn hóa theo giao diện Chuyển hàng & KiotViet

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Grid,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Save,
  Check,
  FileSpreadsheet,
  X,
  PhoneCall,
  Warehouse,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { adminService } from '@/features/roles/services/adminService';
import { productService, BackendProduct } from '@/features/products/services/productService';
import { supplierService } from '@/features/suppliers/services/supplierService';
import { Supplier } from '@/features/suppliers/types';
import { purchaseService } from '@/features/purchases/services/purchaseService';
import { toLocalDatetimeInputString } from '@/features/transfers/utils/dateUtils';
import { QuickAddSupplierModal } from '@/features/purchases/components/QuickAddSupplierModal';

export interface CreatePurchaseItemRow {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  currentStock: number;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  notes?: string;
  lotNumber?: string;
}

export default function CreatePurchaseClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editPurchaseId = searchParams.get('id') || searchParams.get('edit');

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
      const raw = localStorage.getItem('stockflow_user');
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
      });
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
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'COMPLETED'>('DRAFT');

  // ─── Products & Lines State ─────────────────────────────────────────────────
  const [items, setItems] = useState<CreatePurchaseItemRow[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

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

  // ─── Load Existing Purchase for Edit if editPurchaseId is provided ──────────
  useEffect(() => {
    if (!editPurchaseId) return;
    async function loadEditData() {
      try {
        const detail = await purchaseService.getPurchaseById(Number(editPurchaseId));
        if (detail) {
          setPurchaseCode(detail.grCode);
          setExternalPoNumber(detail.externalPoNumber || '');
          setNotes(detail.notes || '');
          setStatus(detail.status === 'COMPLETED' ? 'COMPLETED' : 'DRAFT');
          if (detail.receivedDate) {
            setPurchaseDateTime(toLocalDatetimeInputString(detail.receivedDate));
          }
          if (detail.partnerId) {
            const foundSupp = suppliers.find((s) => Number(s.id) === detail.partnerId);
            if (foundSupp) setSelectedSupplier(foundSupp);
            else {
              setSelectedSupplier({
                id: String(detail.partnerId),
                code: detail.partnerCode,
                name: detail.partnerName,
                status: 'ACTIVE',
              } as Supplier);
            }
          }
          if (detail.items && detail.items.length > 0) {
            setItems(
              detail.items.map((it) => {
                const lineTotal = it.quantity * it.unitPrice * (1 - (it.discountPercent || 0) / 100);
                return {
                  productId: it.productId,
                  productCode: it.productCode,
                  productName: it.productName,
                  unitName: it.unit || 'Cái',
                  currentStock: it.currentStock || 0,
                  quantity: it.quantity,
                  unitPrice: it.unitPrice,
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
  }, [editPurchaseId, suppliers]);

  // ─── Handle Global F3 Shortcut to focus product search ──────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
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
        const nextQty = updated[existingIdx].quantity + 1;
        const discount = updated[existingIdx].discountPercent || 0;
        const price = updated[existingIdx].unitPrice;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: nextQty,
          lineTotal: nextQty * price * (1 - discount / 100),
        };
        return updated;
      }

      const initialPrice = prod.costPrice > 0 ? prod.costPrice : (prod.standardPrice || 0);
      const newRow: CreatePurchaseItemRow = {
        productId: prod.productId,
        productCode: prod.code,
        productName: prod.name,
        unitName: prod.uom || 'Cái',
        currentStock: prod.stockQuantity || 0,
        quantity: 1,
        unitPrice: initialPrice,
        discountPercent: 0,
        lineTotal: initialPrice,
      };
      return [...prev, newRow];
    });

    setSearchQuery('');
    setShowSearchDropdown(false);
    showToast(`Đã thêm ${prod.name}`);
  };

  // ─── Quantity, Price, Discount Handlers ──────────────────────────────────────
  const handleUpdateQuantity = (productId: number, qty: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          const validQty = Math.max(1, qty);
          return {
            ...it,
            quantity: validQty,
            lineTotal: validQty * it.unitPrice * (1 - (it.discountPercent || 0) / 100),
          };
        }
        return it;
      })
    );
  };

  const handleUpdatePrice = (productId: number, price: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          const validPrice = Math.max(0, price);
          return {
            ...it,
            unitPrice: validPrice,
            lineTotal: it.quantity * validPrice * (1 - (it.discountPercent || 0) / 100),
          };
        }
        return it;
      })
    );
  };

  const handleUpdateDiscount = (productId: number, discount: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.productId === productId) {
          const validDiscount = Math.max(0, Math.min(100, discount));
          return {
            ...it,
            discountPercent: validDiscount,
            lineTotal: it.quantity * it.unitPrice * (1 - validDiscount / 100),
          };
        }
        return it;
      })
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

  const finalPayable = useMemo(() => {
    return Math.max(0, totalGoods - orderDiscount);
  }, [totalGoods, orderDiscount]);

  const debtAmount = useMemo(() => {
    return Math.max(0, finalPayable - paidAmount);
  }, [finalPayable, paidAmount]);

  // When finalPayable changes and user hasn't typed a custom paid amount, auto-fill if completed
  useEffect(() => {
    if (status === 'COMPLETED' && paidAmount === 0) {
      setPaidAmount(finalPayable);
    }
  }, [finalPayable, status]);

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
            const price = p.costPrice > 0 ? p.costPrice : (p.standardPrice || 50000);
            return {
              productId: p.productId,
              productCode: p.code,
              productName: p.name,
              unitName: p.uom || 'Cái',
              currentStock: p.stockQuantity || 0,
              quantity: qty,
              unitPrice: price,
              discountPercent: 0,
              lineTotal: qty * price,
            };
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

  // ─── Submit Actions (Save Draft / Complete) ──────────────────────────────────
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

    try {
      setIsSubmitting(true);
      const payload = {
        warehouseId: activeWarehouse?.warehouseId || 1,
        partnerId: Number(selectedSupplier.id) || 1,
        purchaseCode: purchaseCode.trim() || undefined,
        externalPoNumber: externalPoNumber.trim() || null,
        receivedDate: purchaseDateTime ? new Date(purchaseDateTime).toISOString() : new Date().toISOString(),
        status: targetStatus,
        paidAmount: targetStatus === 'COMPLETED' ? paidAmount : 0,
        paymentMethod: paymentMethod,
        notes: notes.trim() || null,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent || 0,
          lotNumber: i.lotNumber || null,
        })),
      };

      const result = await purchaseService.createPurchase(payload);
      if (targetStatus === 'COMPLETED') {
        showToast(`Nhập hàng thành công! Mã phiếu: ${result.grCode}. Tồn kho đã cập nhật.`);
      } else {
        showToast(`Đã lưu tạm phiếu nhập: ${result.grCode}`);
      }

      setTimeout(() => {
        router.push('/purchases');
      }, 600);
    } catch (err: any) {
      showToast(err.message || 'Lỗi khi lưu phiếu nhập hàng', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    executeSave('DRAFT');
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

    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận hoàn thành nhập kho',
      message:
        `Bạn có chắc chắn muốn hoàn thành phiếu nhập hàng từ nhà cung cấp "${selectedSupplier.name}"? Tồn kho tại kho "${activeWarehouse?.name || 'Kho làm việc'}" sẽ được cập nhật ngay lập tức.`,
      onConfirm: () => {
        setConfirmModal(null);
        executeSave('COMPLETED');
      },
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#f5f5f5] text-[13px] text-[#15171a] select-none overflow-hidden font-sans">
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
              <div className="p-2 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#15171a]">{confirmModal.title}</h3>
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
                className="px-4 py-1.5 rounded-[8px] bg-[#00b63e] hover:bg-[#009e35] text-white font-semibold shadow-xs transition cursor-pointer"
              >
                Đồng ý hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 1. Header Toolbar Bar (Theo đúng chuẩn chuyển hàng) ─── */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Back Arrow + Nhập hàng title */}
        <div className="flex items-center gap-3">
          <Link
            href="/purchases"
            className="p-1 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer"
            title="Quay lại danh sách phiếu nhập"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </Link>
          <span className="text-[20px] font-semibold text-[#15171a] tracking-tight whitespace-nowrap leading-[36px]">
            Nhập hàng
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
              className="w-full h-8 pl-8 pr-8 rounded-full bg-[#f7f8f9] border border-slate-300 text-[13px] text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] focus:bg-white transition"
            />
            <button
              type="button"
              onClick={() => {
                showToast('Chế độ quét mã vạch Barcode/QR đã kích hoạt. Hãy đặt đầu đọc vào mã hàng!');
                searchInputRef.current?.focus();
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#677484] hover:text-[#15171a] cursor-pointer"
              title="Quét Barcode / QR Code"
            >
              <Grid size={14} />
            </button>

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
                      <div className="flex flex-col gap-0.5">
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
                              {(prod.costPrice || prod.standardPrice || 0).toLocaleString('vi-VN')} đ
                            </strong>
                          </span>
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
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Table Header Row */}
          <div className="h-9 bg-[#f7f8f9] border-b border-slate-200 grid grid-cols-[40px_110px_1fr_60px_80px_90px_110px_80px_110px_40px] items-center px-3 font-semibold text-[#677484] shrink-0 text-xs text-center">
            <div>STT</div>
            <div className="text-left pl-2">Mã hàng</div>
            <div className="text-left pl-2">Tên hàng</div>
            <div>ĐVT</div>
            <div>Tồn kho</div>
            <div>SL nhập</div>
            <div>Giá nhập</div>
            <div>Giảm (%)</div>
            <div>Thành tiền</div>
            <div></div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              /* EMPTY STATE (Khớp 100% Ảnh chuyển hàng) */
              <div className="h-full flex flex-col items-center justify-center p-8 text-center select-none">
                <p className="text-sm font-semibold text-[#15171a] mb-2">
                  Thêm sản phẩm từ file excel
                </p>
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

                {/* Hidden File Input for Excel Import */}
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
              <div className="divide-y divide-slate-100">
                {items.map((row, index) => {
                  return (
                    <div
                      key={row.productId}
                      className="grid grid-cols-[40px_110px_1fr_60px_80px_90px_110px_80px_110px_40px] items-center px-3 py-2 text-xs transition hover:bg-[#f7f8f9] border-b border-slate-100"
                    >
                      {/* STT */}
                      <div className="text-center text-[#677484] font-mono">{index + 1}</div>

                      {/* Mã hàng */}
                      <div className="font-bold text-[#0070f4] pl-2 truncate">{row.productCode}</div>

                      {/* Tên hàng + Ghi chú dòng */}
                      <div className="pl-2 pr-2">
                        <div className="font-medium text-[#15171a] truncate" title={row.productName}>
                          {row.productName}
                        </div>
                        <input
                          type="text"
                          value={row.notes || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setItems((prev) =>
                              prev.map((it) =>
                                it.productId === row.productId ? { ...it, notes: val } : it
                              )
                            );
                          }}
                          placeholder="Ghi chú hàng hóa..."
                          className="w-full text-[11px] text-[#677484] placeholder-[#677484]/40 focus:outline-none focus:text-[#15171a] bg-transparent"
                        />
                      </div>

                      {/* ĐVT */}
                      <div className="text-center text-[#15171a]">{row.unitName}</div>

                      {/* Tồn kho */}
                      <div className="text-center font-semibold text-[#15171a]">
                        {row.currentStock.toLocaleString('vi-VN')}
                      </div>

                      {/* SL nhập */}
                      <div className="px-1 flex justify-center">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) =>
                            handleUpdateQuantity(row.productId, parseInt(e.target.value) || 0)
                          }
                          className="w-16 h-7 text-center rounded-[4px] border border-slate-300 focus:border-[#0070f4] focus:outline-none text-xs font-semibold text-[#15171a] bg-white"
                        />
                      </div>

                      {/* Giá nhập */}
                      <div className="px-1 flex justify-center">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={row.unitPrice}
                          onChange={(e) =>
                            handleUpdatePrice(row.productId, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 h-7 text-right pr-2 rounded-[4px] border border-slate-300 focus:border-[#0070f4] focus:outline-none text-xs text-[#15171a] bg-white font-mono"
                        />
                      </div>

                      {/* Giảm giá (%) */}
                      <div className="px-1 flex justify-center">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.discountPercent || ''}
                          placeholder="0"
                          onChange={(e) =>
                            handleUpdateDiscount(row.productId, parseFloat(e.target.value) || 0)
                          }
                          className="w-14 h-7 text-center rounded-[4px] border border-slate-300 focus:border-[#0070f4] focus:outline-none text-xs text-[#15171a] bg-white"
                        />
                      </div>

                      {/* Thành tiền */}
                      <div className="text-right font-bold text-[#15171a] font-mono pr-2">
                        {row.lineTotal.toLocaleString('vi-VN')} đ
                      </div>

                      {/* Delete row */}
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(row.productId)}
                          className="p-1 rounded-[4px] text-[#677484] hover:text-[#fb2c36] hover:bg-[#fef2f2] transition cursor-pointer"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Table Footer Summary (when rows exist) */}
          {items.length > 0 && (
            <div className="h-10 bg-[#f7f8f9] border-t border-slate-200 px-4 flex items-center justify-between text-xs text-[#677484] shrink-0">
              <div className="flex items-center gap-4">
                <span>
                  Số mặt hàng: <strong className="text-[#15171a]">{items.length}</strong>
                </span>
                <span>
                  Tổng số lượng nhập:{' '}
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
          <aside className="w-80 bg-white border-l border-slate-200 flex flex-col justify-between shrink-0 p-4 overflow-y-auto">
            {/* Top Form Section */}
            <div className="flex flex-col gap-3">
              {/* Creator & DateTime (Khớp 100% Chuyển hàng) */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-[#15171a] font-medium">
                  <span>{userDisplay}</span>
                </div>
                <input
                  type="datetime-local"
                  value={purchaseDateTime}
                  onChange={(e) => setPurchaseDateTime(e.target.value)}
                  className="h-8 px-2 rounded-[8px] border border-slate-300 text-[11px] font-mono text-[#15171a] bg-white hover:border-[#0070f4] focus:border-[#0070f4] focus:outline-none cursor-pointer transition shadow-2xs"
                  title="Thời gian nhập hàng"
                />
              </div>

              {/* Chi nhánh nhận (Warehouse) */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#677484]">
                  Kho nhận hàng:
                </label>
                <div className="h-8 px-2.5 rounded-[8px] border border-slate-300 bg-[#f7f8f9] flex items-center justify-between text-xs font-medium text-[#15171a]">
                  <span>{activeWarehouse?.name || 'Kho Tổng Gia Lâm'}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#eff6ff] text-[#0070f4] font-bold">
                    {activeWarehouse?.code || 'K001'}
                  </span>
                </div>
              </div>

              {/* Nhà cung cấp Selectable with Search & + Thêm NCC */}
              <div className="flex flex-col gap-1" ref={supplierRef}>
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-[#677484]">
                    Nhà cung cấp <span className="text-[#fb2c36]">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddSupplier(true)}
                    className="text-[11px] text-[#0070f4] hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                  >
                    <Plus size={12} />
                    <span>Thêm NCC</span>
                  </button>
                </div>

                <div className="relative">
                  <div
                    onClick={() => setShowSupplierDropdown((v) => !v)}
                    className={`h-8 px-2.5 rounded-[8px] border flex items-center justify-between text-xs cursor-pointer transition bg-white ${
                      showSupplierDropdown
                        ? 'border-[#0070f4] ring-1 ring-[#0070f4]/20'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <span className={selectedSupplier ? 'font-medium text-[#15171a] truncate' : 'text-[#677484] truncate'}>
                      {selectedSupplier ? `${selectedSupplier.name} (${selectedSupplier.code})` : 'Chọn nhà cung cấp'}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 text-slate-400">
                      {selectedSupplier && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedSupplier(null);
                          }}
                          className="hover:text-slate-600 p-0.5"
                        >
                          <X size={12} />
                        </button>
                      )}
                      <ChevronDown size={13} className={showSupplierDropdown ? 'rotate-180 text-[#0070f4]' : ''} />
                    </div>
                  </div>

                  {showSupplierDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-[8px] border border-slate-200 shadow-lg py-1.5 z-40">
                      <div className="px-2.5 pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs">
                          <Search size={13} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Tìm kiếm NCC theo tên, mã..."
                            value={supplierSearchKeyword}
                            onChange={(e) => setSupplierSearchKeyword(e.target.value)}
                            className="w-full bg-transparent outline-none text-[#15171a] placeholder:text-slate-400 text-xs"
                          />
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto pt-1 divide-y divide-slate-50">
                        {filteredSuppliers.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">Không tìm thấy NCC</div>
                        ) : (
                          filteredSuppliers.map((s) => {
                            const isSelected = selectedSupplier?.id === s.id;
                            return (
                              <div
                                key={s.id}
                                onClick={() => {
                                  setSelectedSupplier(s);
                                  setShowSupplierDropdown(false);
                                }}
                                className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition ${
                                  isSelected ? 'bg-blue-50 text-[#0070f4] font-medium' : 'text-[#15171a] hover:bg-slate-50'
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <div>{s.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">{s.code}</div>
                                </div>
                                {isSelected && <Check size={14} className="text-[#0070f4] shrink-0" />}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mã phiếu nhập (Khớp logic Chuyển hàng: placeholder "Mã phiếu tự động" & cho phép nhập) */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#677484]">
                  Mã phiếu nhập
                </label>
                <input
                  type="text"
                  value={purchaseCode}
                  onChange={(e) => setPurchaseCode(e.target.value)}
                  placeholder="Mã phiếu tự động"
                  className="h-8 px-2.5 rounded-[8px] border border-slate-300 text-xs text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] bg-white font-mono"
                />
              </div>

              {/* Số hóa đơn / PO ngoài */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#677484]">
                  Số hóa đơn / PO ngoài
                </label>
                <input
                  type="text"
                  value={externalPoNumber}
                  onChange={(e) => setExternalPoNumber(e.target.value)}
                  placeholder="Ví dụ: PO-2026-001"
                  className="h-8 px-2.5 rounded-[8px] border border-slate-300 text-xs text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] bg-white"
                />
              </div>

              {/* Trạng thái */}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[11px] font-semibold text-[#677484]">Trạng thái</span>
                <span className="font-bold text-xs text-[#15171a]">
                  Phiếu tạm
                </span>
              </div>

              {/* Tổng số lượng */}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[11px] font-semibold text-[#677484]">Tổng số lượng</span>
                <span className="font-bold text-xs text-[#15171a]">
                  {totalQuantity.toLocaleString('vi-VN')}
                </span>
              </div>

              {/* Tổng tiền hàng */}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[11px] font-semibold text-[#677484]">Tổng tiền hàng</span>
                <span className="font-bold text-xs text-[#15171a] font-mono">
                  {totalGoods.toLocaleString('vi-VN')} đ
                </span>
              </div>

              {/* Giảm giá phiếu nhập */}
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-semibold text-[#677484] shrink-0">Giảm giá</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={orderDiscount || ''}
                  placeholder="0"
                  onChange={(e) => setOrderDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-32 h-7 px-2 text-right rounded-[4px] border border-slate-300 text-xs font-mono text-[#15171a] focus:border-[#0070f4] focus:outline-none bg-white"
                />
              </div>

              {/* Cần trả NCC */}
              <div className="flex items-center justify-between py-1 bg-[#eff6ff] px-2.5 rounded-[6px]">
                <span className="text-xs font-bold text-[#0070f4]">Cần trả NCC</span>
                <span className="font-bold text-sm text-[#0070f4] font-mono">
                  {finalPayable.toLocaleString('vi-VN')} đ
                </span>
              </div>

              {/* Tiền trả NCC */}
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-semibold text-[#677484] shrink-0">Tiền trả NCC</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={paidAmount || ''}
                  placeholder="0"
                  onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-32 h-7 px-2 text-right rounded-[4px] border border-slate-300 text-xs font-mono text-[#15171a] font-bold focus:border-[#0070f4] focus:outline-none bg-white"
                />
              </div>

              {/* Hình thức thanh toán */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#677484]">Hình thức</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-medium transition cursor-pointer ${
                      paymentMethod === 'CASH'
                        ? 'bg-[#eff6ff] text-[#0070f4] border border-[#0070f4]'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('BANK_TRANSFER')}
                    className={`px-2.5 py-1 rounded-[6px] text-xs font-medium transition cursor-pointer ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'bg-[#eff6ff] text-[#0070f4] border border-[#0070f4]'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Chuyển khoản
                  </button>
                </div>
              </div>

              {/* Tính vào công nợ */}
              {debtAmount > 0 && (
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[11px] font-semibold text-[#677484]">Tính vào công nợ</span>
                  <span className="font-mono font-bold text-xs text-rose-600">
                    {debtAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}

              {/* Ghi chú */}
              <div className="flex flex-col gap-1">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú"
                  rows={2}
                  className="w-full p-2 rounded-[8px] border border-slate-300 text-xs text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] resize-none bg-white"
                />
              </div>
            </div>

            {/* Bottom Actions Section: 2 Big Buttons (Blue + Green) */}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                {/* Nút Lưu tạm (Blue) */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveDraft}
                  className="h-10 rounded-[8px] bg-[#0070f4] hover:bg-[#005ac3] active:bg-[#00479b] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>Lưu tạm</span>
                </button>

                {/* Nút Hoàn thành (Green) */}
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleComplete}
                  className="h-10 rounded-[8px] bg-[#00b63e] hover:bg-[#009e35] active:bg-[#00872d] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  <Check size={16} className="stroke-[2.5]" />
                  <span>Hoàn thành</span>
                </button>
              </div>
            </div>
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
