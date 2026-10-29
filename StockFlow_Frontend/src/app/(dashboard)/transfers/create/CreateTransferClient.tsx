// src/app/(dashboard)/transfers/create/CreateTransferClient.tsx
// Màn hình 2: Tạo mới & Chỉnh sửa phiếu chuyển hàng theo đúng thiết kế KiotViet Ảnh 2

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Grid,
  Barcode,
  Printer,
  Eye,
  AlertCircle,
  User,
  Calendar,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Save,
  Check,
  FileSpreadsheet,
  Upload,
  X,
  PhoneCall,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Warehouse,
  ChevronDown,
} from 'lucide-react';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { adminService } from '@/features/roles/services/adminService';
import { WarehouseFacility } from '@/features/roles/types';
import { transferService } from '@/features/transfers/services/transferService';
import { ProductForTransfer, TransferItem } from '@/features/transfers/types';
import { toLocalDatetimeInputString } from '@/features/transfers/utils/dateUtils';

interface CreateItemRow {
  productId: number;
  productCode: string;
  productName: string;
  unitName: string;
  sourceStock: number;
  destStock: number;
  transferQuantity: number;
  transferPrice: number;
  lineTotal: number;
  notes?: string;
}

export default function CreateTransferClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editTransferId = searchParams.get('id');

  const { activeWarehouse, setActiveWarehouse, warehouses: allWarehouses } = useActiveWarehouse();
  const [facilities, setFacilities] = useState<WarehouseFacility[]>([]);

  // Current User Info & Profile matching Image 2
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

  // Form Header State
  const [transferCode, setTransferCode] = useState('');
  const [transferDateTime, setTransferDateTime] = useState(() => toLocalDatetimeInputString(new Date()));
  const [sourceWarehouseId, setSourceWarehouseId] = useState<number>(3); // Default Gia Lâm
  const [destWarehouseId, setDestWarehouseId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'DRAFT' | 'IN_TRANSIT'>('DRAFT');

  // Products & Lines State
  const [items, setItems] = useState<CreateItemRow[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Search & Suggestions State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductForTransfer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast / Confirmation Modal
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

  // Sync Source Warehouse from ActiveWarehouse hook
  useEffect(() => {
    if (activeWarehouse?.warehouseId) {
      setSourceWarehouseId(activeWarehouse.warehouseId);
    }
  }, [activeWarehouse]);

  // Load Warehouse Facilities
  useEffect(() => {
    async function loadFacilities() {
      try {
        const facs = await adminService.getWarehouseFacilities();
        setFacilities(facs);
      } catch (err) {
        console.error('Failed to load facilities:', err);
      }
    }
    loadFacilities();
  }, []);

  // Load Existing Transfer for Edit if editTransferId is provided
  useEffect(() => {
    if (!editTransferId) return;
    async function loadEditData() {
      try {
        const detail = await transferService.getTransferById(Number(editTransferId));
        if (detail) {
          setTransferCode(detail.code);
          setSourceWarehouseId(detail.sourceWarehouseId);
          setDestWarehouseId(detail.destWarehouseId);
          setNotes(detail.notes || '');
          setStatus(detail.status as any);
          if (detail.transferDate) {
            setTransferDateTime(toLocalDatetimeInputString(detail.transferDate));
          }
          if (detail.items && detail.items.length > 0) {
            setItems(
              detail.items.map((it) => ({
                productId: it.productId,
                productCode: it.productCode,
                productName: it.productName,
                unitName: it.unitName,
                sourceStock: it.sourceStock,
                destStock: it.destStock,
                transferQuantity: it.transferQuantity,
                transferPrice: it.transferPrice,
                lineTotal: it.lineTotal,
                notes: it.notes,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Failed to load edit transfer:', err);
      }
    }
    loadEditData();
  }, [editTransferId]);

  // Handle Global F3 Shortcut to focus product search
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

  // Handle Click Outside Search Dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search Products when user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const destId = destWarehouseId ? Number(destWarehouseId) : undefined;
        const prods = await transferService.getProductsForTransfer(sourceWarehouseId, destId, searchQuery);
        setSearchResults(prods);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error('Error searching products:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery, sourceWarehouseId, destWarehouseId]);

  // Tự động đồng bộ số lượng "Tồn kho nhận" khi người dùng chọn hoặc đổi chi nhánh nhận (destWarehouseId)
  useEffect(() => {
    if (items.length === 0) return;

    if (!destWarehouseId) {
      // Khi mục "Chuyển tới" là "Chọn chi nhánh", đặt tồn kho nhận = 0 để hiển thị '-'
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          destStock: 0,
        }))
      );
      return;
    }

    let isCancelled = false;
    async function updateWarehouseStocks() {
      try {
        const destId = Number(destWarehouseId);
        const prods = await transferService.getProductsForTransfer(sourceWarehouseId, destId);
        if (isCancelled) return;

        setItems((prev) =>
          prev.map((it) => {
            const match = prods.find(
              (p) =>
                p.productCode.toUpperCase() === it.productCode.toUpperCase() ||
                p.productId === it.productId
            );
            return {
              ...it,
              sourceStock: match ? match.sourceStock : it.sourceStock,
              destStock: match ? match.destStock : 0,
            };
          })
        );
      } catch (err) {
        console.error('Lỗi cập nhật tồn kho nhận theo chi nhánh:', err);
      }
    }

    updateWarehouseStocks();
    return () => {
      isCancelled = true;
    };
  }, [destWarehouseId, sourceWarehouseId]);

  // Add Product to transfer lines
  const handleSelectProduct = (product: ProductForTransfer) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (i) => i.productId === product.productId || i.productCode === product.productCode
      );
      if (existingIndex !== -1) {
        const updated = [...prev];
        const item = updated[existingIndex];
        const newQty = item.transferQuantity + 1;
        updated[existingIndex] = {
          ...item,
          transferQuantity: newQty,
          lineTotal: newQty * item.transferPrice,
        };
        return updated;
      }

      const initialPrice = product.costPrice > 0 ? product.costPrice : product.standardPrice;
      const newRow: CreateItemRow = {
        productId: product.productId,
        productCode: product.productCode,
        productName: product.productName,
        unitName: product.unitName || 'Cái',
        sourceStock: product.sourceStock,
        destStock: destWarehouseId ? product.destStock : 0,
        transferQuantity: 1,
        transferPrice: initialPrice,
        lineTotal: initialPrice * 1,
      };
      return [newRow, ...prev];
    });

    setSearchQuery('');
    setShowSearchDropdown(false);
    searchInputRef.current?.focus();
  };

  // Update item quantity
  const handleUpdateQuantity = (productId: number, val: number) => {
    const qty = Math.max(0, val);
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? {
              ...it,
              transferQuantity: qty,
              lineTotal: qty * it.transferPrice,
            }
          : it
      )
    );
  };

  // Update item price
  const handleUpdatePrice = (productId: number, val: number) => {
    const price = Math.max(0, val);
    setItems((prev) =>
      prev.map((it) =>
        it.productId === productId
          ? {
              ...it,
              transferPrice: price,
              lineTotal: it.transferQuantity * price,
            }
          : it
      )
    );
  };

  // Remove row
  const handleRemoveItem = (productId: number) => {
    setItems((prev) => prev.filter((it) => it.productId !== productId));
  };

  // Import mock Excel file
  const handleImportExcelClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Simulate Excel parsing with sample transfer items
    const sampleImportedItems: CreateItemRow[] = [
      {
        productId: 1,
        productCode: 'TP-MC200',
        productName: 'Máng cáp 200x100x1.5mm sơn tĩnh điện',
        unitName: 'Cây',
        sourceStock: 120,
        destStock: 30,
        transferQuantity: 20,
        transferPrice: 185000,
        lineTotal: 3700000,
      },
      {
        productId: 2,
        productCode: 'TP-KC150',
        productName: 'Khay cáp 150x75x1.2mm tôn ZAM',
        unitName: 'Cây',
        sourceStock: 80,
        destStock: 15,
        transferQuantity: 15,
        transferPrice: 140000,
        lineTotal: 2100000,
      },
      {
        productId: 4,
        productCode: 'TP-PK01',
        productName: 'Co vuông 90 độ cho máng cáp 200x100',
        unitName: 'Cái',
        sourceStock: 300,
        destStock: 50,
        transferQuantity: 10,
        transferPrice: 45000,
        lineTotal: 450000,
      },
    ];

    setItems((prev) => {
      // Merge imported items
      const existingIds = new Set(prev.map((i) => i.productId));
      const newlyAdded = sampleImportedItems.filter((i) => !existingIds.has(i.productId));
      return [...newlyAdded, ...prev];
    });

    showToast(`Đã import thành công danh sách từ file ${file.name}!`);
    e.target.value = '';
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      'Ma_Hang,Ten_Hang,DVT,So_Luong,Gia_Chuyen\n' +
      'TP-MC200,Máng cáp 200x100x1.5mm sơn tĩnh điện,Cây,20,185000\n' +
      'TP-KC150,Khay cáp 150x75x1.2mm tôn ZAM,Cây,15,140000\n' +
      'TP-PK01,Co vuông 90 độ cho máng cáp 200x100,Cái,10,45000\n';

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'mau_chuyen_hang_stockflow.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đang tải về file mẫu chuyển hàng...');
  };

  // Calculations
  const totalQuantity = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.transferQuantity) || 0), 0);
  }, [items]);

  const totalAmount = useMemo(() => {
    return items.reduce((acc, it) => acc + (Number(it.lineTotal) || 0), 0);
  }, [items]);

  // Destination Warehouses list (excluding source warehouse)
  const availableDestWarehouses = useMemo(() => {
    return allWarehouses.filter((w) => w.warehouseId !== sourceWarehouseId);
  }, [allWarehouses, sourceWarehouseId]);

  // Validation Before Save
  const validateForm = (): boolean => {
    if (!destWarehouseId) {
      showToast('Vui lòng chọn chi nhánh kho nhận hàng!', 'warning');
      return false;
    }
    if (items.length === 0) {
      showToast('Vui lòng thêm ít nhất một sản phẩm cần chuyển!', 'warning');
      return false;
    }
    if (items.some((it) => it.transferQuantity <= 0)) {
      showToast('Số lượng chuyển của sản phẩm phải lớn hơn 0!', 'warning');
      return false;
    }
    return true;
  };

  // Check Over Stock Warning
  const checkOverStock = (): boolean => {
    const overStockItems = items.filter((it) => it.transferQuantity > it.sourceStock);
    return overStockItems.length > 0;
  };

  // Execute Save Action
  const executeSave = async (submitStatus: 'DRAFT' | 'IN_TRANSIT') => {
    setIsSubmitting(true);
    try {
      const payload = {
        transferCode: transferCode.trim() || undefined,
        sourceWarehouseId: Number(sourceWarehouseId),
        destWarehouseId: Number(destWarehouseId),
        transferDate: transferDateTime
          ? (transferDateTime.length === 16 ? `${transferDateTime}:00` : transferDateTime)
          : `${toLocalDatetimeInputString(new Date())}:00`,
        notes: notes.trim() || undefined,
        status: submitStatus,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.transferQuantity,
          transferPrice: it.transferPrice,
          notes: it.notes,
        })),
      };

      const result = await transferService.createTransfer(payload);

      showToast(
        submitStatus === 'DRAFT'
          ? `Đã lưu tạm phiếu chuyển hàng ${result.code} thành công!`
          : `Đã hoàn thành xuất chuyển hàng ${result.code}! Trạng thái: Đang chuyển`,
        'success'
      );

      setTimeout(() => {
        router.push('/transfers');
      }, 900);
    } catch (err: any) {
      console.error('Error saving transfer:', err);
      showToast(err.message || 'Có lỗi xảy ra khi lưu phiếu chuyển hàng!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Lưu tạm (DRAFT)
  const handleSaveDraft = () => {
    if (!validateForm()) return;
    executeSave('DRAFT');
  };

  // Action: Hoàn thành (IN_TRANSIT)
  const handleComplete = () => {
    if (!validateForm()) return;

    const hasOverStock = checkOverStock();
    if (hasOverStock) {
      const overStockNames = items
        .filter((it) => it.transferQuantity > it.sourceStock)
        .map((it) => `${it.productCode} (SL: ${it.transferQuantity} / Tồn: ${it.sourceStock})`)
        .join(', ');

      setConfirmModal({
        isOpen: true,
        title: 'Cảnh báo tồn kho xuất chuyển',
        message: `Các sản phẩm sau có số lượng chuyển vượt tồn kho chi nhánh nguồn: ${overStockNames}. Bạn có chắc chắn muốn xuất chuyển không?`,
        onConfirm: () => {
          setConfirmModal(null);
          executeSave('IN_TRANSIT');
        },
      });
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận hoàn thành chuyển hàng',
      message:
        'Bạn có chắc chắn muốn hoàn thành phiếu chuyển này? Hàng hóa sẽ được xuất kho và chuyển sang trạng thái "Đang chuyển".',
      onConfirm: () => {
        setConfirmModal(null);
        executeSave('IN_TRANSIT');
      },
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-[#f5f5f5] text-[13px] text-[#15171a] select-none overflow-hidden font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-16 right-6 z-50 px-4 py-2.5 rounded-[8px] shadow-lg text-white font-medium flex items-center gap-2 animate-bounce transition ${
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
              <div className="p-2 rounded-full bg-amber-100 text-amber-600 shrink-0">
                <AlertTriangle size={20} />
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
                Đồng ý tiếp tục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 1. Header Toolbar Bar (Theo đúng thiết kế) ─── */}
      <header className="h-12 bg-white border-b border-slate-200 px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Back Arrow + Chuyển hàng title */}
        <div className="flex items-center gap-3">
          <Link
            href="/transfers"
            className="p-1 rounded-[8px] text-[#677484] hover:text-[#15171a] hover:bg-[#f7f8f9] transition cursor-pointer"
            title="Quay lại danh sách phiếu chuyển"
          >
            <ArrowLeft size={18} className="stroke-[2.5]" />
          </Link>
          <span className="text-[20px] font-semibold text-[#15171a] tracking-tight whitespace-nowrap leading-[36px]">
            Chuyển hàng
          </span>
        </div>

        {/* Center: Search Box & Utility Action Buttons */}
        <div className="flex items-center gap-2 flex-1 max-w-xl relative" ref={searchContainerRef}>
          <div className="relative flex-1">
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
                            {prod.productCode}
                          </span>
                          <span className="text-[11px] font-medium text-[#15171a]">
                            {prod.productName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-[4px] bg-[#f7f8f9] text-[#677484]">
                            {prod.unitName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[#677484]">
                          <span>
                            Giá chuyển:{' '}
                            <strong className="text-[#15171a]">
                              {(prod.costPrice || prod.standardPrice).toLocaleString('vi-VN')} đ
                            </strong>
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-4">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-[#677484]">Tồn kho chuyển:</span>
                          <span
                            className={`font-bold ${
                              prod.sourceStock > 0 ? 'text-[#00b63e]' : 'text-[#fb2c36]'
                            }`}
                          >
                            {prod.sourceStock.toLocaleString('vi-VN')} {prod.unitName}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-[#677484]">Tồn kho nhận:</span>
                          <span className="font-semibold text-[#677484]">
                            {destWarehouseId ? `${prod.destStock.toLocaleString('vi-VN')} ${prod.unitName}` : '-'}
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

        {/* Right: Branch Selector & User Profile (Khớp 100% Ảnh 2) */}
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
                          setSourceWarehouseId(fac.warehouseId);
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
          <div className="h-9 bg-[#f7f8f9] border-b border-slate-200 grid grid-cols-[40px_110px_1fr_60px_90px_90px_90px_110px_110px_40px] items-center px-3 font-semibold text-[#677484] shrink-0 text-xs text-center">
            <div>STT</div>
            <div className="text-left pl-2">Mã hàng</div>
            <div className="text-left pl-2">Tên hàng</div>
            <div>ĐVT</div>
            <div>Tồn kho</div>
            <div>Tồn kho nhận</div>
            <div>SL chuyển</div>
            <div>Giá chuyển</div>
            <div>Thành tiền</div>
            <div></div>
          </div>

          {/* Table Body */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              /* EMPTY STATE */
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
                  onClick={handleImportExcelClick}
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
                      className="grid grid-cols-[40px_110px_1fr_60px_90px_90px_90px_110px_110px_40px] items-center px-3 py-2 text-xs transition hover:bg-[#f7f8f9] border-b border-slate-100"
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

                      {/* Tồn kho (Source) */}
                      <div className="text-center font-semibold text-[#15171a]">
                        {row.sourceStock.toLocaleString('vi-VN')}
                      </div>

                      {/* Tồn kho nhận (Dest) */}
                      <div className="text-center text-[#677484]">
                        {destWarehouseId ? row.destStock.toLocaleString('vi-VN') : '-'}
                      </div>

                      {/* SL chuyển */}
                      <div className="px-1 flex justify-center">
                        <input
                          type="number"
                          min="1"
                          value={row.transferQuantity}
                          onChange={(e) =>
                            handleUpdateQuantity(row.productId, parseInt(e.target.value) || 0)
                          }
                          className="w-16 h-7 text-center rounded-[4px] border border-slate-300 focus:border-[#0070f4] focus:outline-none text-xs font-semibold text-[#15171a] bg-white"
                        />
                      </div>

                      {/* Giá chuyển */}
                      <div className="px-1 flex justify-center">
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={row.transferPrice}
                          onChange={(e) =>
                            handleUpdatePrice(row.productId, parseFloat(e.target.value) || 0)
                          }
                          className="w-24 h-7 text-right pr-2 rounded-[4px] border border-slate-300 focus:border-[#0070f4] focus:outline-none text-xs text-[#15171a] bg-white"
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
                  Tổng số lượng chuyển:{' '}
                  <strong className="text-[#0070f4] text-sm font-bold">
                    {totalQuantity.toLocaleString('vi-VN')}
                  </strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#677484] mr-2">Tổng giá trị:</span>
                <span className="text-sm font-bold text-[#15171a] font-mono">
                  {totalAmount.toLocaleString('vi-VN')} đ
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

        {/* ─── 3. RIGHT SIDEBAR: Transfer Header & Actions ─── */}
        {!isSidebarCollapsed && (
          <aside className="w-80 bg-white border-l border-slate-200 flex flex-col justify-between shrink-0 p-4 overflow-y-auto">
            {/* Top Form Section */}
            <div className="flex flex-col gap-3.5">
              {/* Creator & DateTime */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-[#15171a] font-medium">
                  <span>{userDisplay}</span>
                </div>
                <input
                  type="datetime-local"
                  value={transferDateTime}
                  onChange={(e) => setTransferDateTime(e.target.value)}
                  className="h-8 px-2 rounded-[8px] border border-slate-300 text-[11px] font-mono text-[#15171a] bg-white hover:border-[#0070f4] focus:border-[#0070f4] focus:outline-none cursor-pointer transition shadow-2xs"
                  title="Thời gian chuyển hàng"
                />
              </div>

              {/* Chi nhánh chuyển (Source Warehouse) */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#677484]">
                  Từ chi nhánh:
                </label>
                <div className="h-8 px-2.5 rounded-[8px] border border-slate-300 bg-[#f7f8f9] flex items-center justify-between text-xs font-medium text-[#15171a]">
                  <span>{activeWarehouse?.name || `Kho #${sourceWarehouseId}`}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-[4px] bg-[#eff6ff] text-[#0070f4] font-bold">
                    {activeWarehouse?.code || `K00${sourceWarehouseId}`}
                  </span>
                </div>
              </div>

              {/* Mã chuyển hàng */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#677484]">
                  Mã chuyển hàng
                </label>
                <input
                  type="text"
                  value={transferCode}
                  onChange={(e) => setTransferCode(e.target.value)}
                  placeholder="Mã phiếu tự động"
                  className="h-8 px-2.5 rounded-[8px] border border-slate-300 text-xs text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] bg-white"
                />
              </div>

              {/* Trạng thái */}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[11px] font-semibold text-[#677484]">Trạng thái</span>
                <span className="font-bold text-xs text-[#15171a]">
                  {status === 'DRAFT' ? 'Phiếu tạm' : 'Đang chuyển'}
                </span>
              </div>

              {/* Tổng số lượng */}
              <div className="flex items-center justify-between py-0.5">
                <span className="text-[11px] font-semibold text-[#677484]">Tổng số lượng</span>
                <span className="font-bold text-xs text-[#15171a]">
                  {totalQuantity.toLocaleString('vi-VN')}
                </span>
              </div>

              {/* Chuyển tới (Destination Warehouse) */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-[#677484]">
                  Chuyển tới <span className="text-[#fb2c36]">*</span>
                </label>
                <select
                  value={destWarehouseId}
                  onChange={(e) => setDestWarehouseId(e.target.value ? Number(e.target.value) : '')}
                  className="h-8 px-2 rounded-[8px] border border-slate-300 text-xs text-[#15171a] focus:outline-none focus:border-[#0070f4] bg-white cursor-pointer"
                >
                  <option value="">Chọn chi nhánh</option>
                  {availableDestWarehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ghi chú */}
              <div className="flex flex-col gap-1">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú"
                  rows={4}
                  className="w-full p-2.5 rounded-[8px] border border-slate-300 text-xs text-[#15171a] placeholder-[#677484] focus:outline-none focus:border-[#0070f4] resize-none bg-white"
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
    </div>
  );
}
