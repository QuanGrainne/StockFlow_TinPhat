// src/features/purchases/hooks/usePurchaseForm.ts
// Custom hook tách biệt toàn bộ nghiệp vụ & state của màn hình Tạo phiếu nhập hàng

'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { message } from 'antd';
import { supplierService } from '@/features/suppliers/services/supplierService';
import { Supplier } from '@/features/suppliers/types';
import { productService, BackendProduct } from '@/features/products/services/productService';
import { purchaseService } from '@/features/purchases/services/purchaseService';
import { useActiveWarehouse } from '@/lib/warehouse/useActiveWarehouse';
import { TablePurchaseItem } from '@/features/purchases/types';

function formatDateTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function usePurchaseForm() {
  const router = useRouter();
  const { activeWarehouse, setActiveWarehouse, warehouses } = useActiveWarehouse();

  // State
  const [items, setItems] = useState<TablePurchaseItem[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [dateTimeStr] = useState<string>(() => formatDateTime(new Date()));
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [username] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Quản trị viên';
    try {
      const raw = localStorage.getItem('stockflow_user');
      if (raw) {
        const u = JSON.parse(raw);
        return u.fullName || u.username || 'Quản trị viên';
      }
    } catch {
      // ignore
    }
    return 'Quản trị viên';
  });

  // Data lists
  const [productsList, setProductsList] = useState<BackendProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Form fields
  const [externalPoNumber, setExternalPoNumber] = useState('');
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);

  // 1. Tải danh sách Nhà cung cấp
  useEffect(() => {
    let isMounted = true;
    async function loadSuppliers() {
      try {
        setLoadingSuppliers(true);
        const data = await supplierService.getSuppliers({ status: 'ACTIVE' });
        if (isMounted && data.length > 0) {
          setSuppliersList(data);
        }
      } catch (err) {
        console.warn('Lỗi tải NCC:', err);
      } finally {
        if (isMounted) setLoadingSuppliers(false);
      }
    }
    loadSuppliers();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Tải danh mục sản phẩm theo kho
  const loadWarehouseProducts = useCallback(async (warehouseId: number) => {
    try {
      setLoadingProducts(true);
      const data = await productService.getProducts({ warehouseId, status: 'ACTIVE' });
      setProductsList(data);

      setItems((prev) => {
        if (prev.length === 0) return prev;
        const prodMap = new Map(data.map((p) => [p.productId, p]));
        return prev.map((item) => {
          const matched = prodMap.get(item.productId);
          return matched
            ? { ...item, currentStock: matched.stockQuantity, currentUnitCost: matched.costPrice }
            : item;
        });
      });
    } catch (err) {
      console.warn('Lỗi tải sản phẩm:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    if (activeWarehouse?.warehouseId) {
      loadWarehouseProducts(activeWarehouse.warehouseId);
    }
  }, [activeWarehouse?.warehouseId, loadWarehouseProducts]);

  // Calculations
  const totalGoods = useMemo(() => {
    return items.reduce((sum, item) => {
      const lineTotal = item.quantity * item.unitPrice * (1 - item.discountPercent / 100);
      return sum + Math.max(0, lineTotal);
    }, 0);
  }, [items]);

  const finalPayable = useMemo(() => {
    return Math.max(0, totalGoods - orderDiscount);
  }, [totalGoods, orderDiscount]);

  const debtAmount = useMemo(() => {
    return Math.max(0, finalPayable - paidAmount);
  }, [finalPayable, paidAmount]);

  // Handlers
  const handleSelectProduct = useCallback((prod: BackendProduct) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.productId === prod.productId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: updated[existingIdx].quantity + 1,
        };
        return updated;
      }
      const initialPrice = prod.costPrice > 0 ? prod.costPrice : prod.standardPrice;
      const newItem: TablePurchaseItem = {
        id: `${prod.code}-${Date.now()}`,
        productId: prod.productId,
        code: prod.code,
        name: prod.name,
        unit: prod.uom || 'Cái',
        quantity: 1,
        unitPrice: initialPrice,
        discountPercent: 0,
        currentStock: prod.stockQuantity,
        currentUnitCost: prod.costPrice,
      };
      return [...prev, newItem];
    });
    message.success(`Đã thêm hàng hóa: ${prod.name}`);
  }, []);

  const handleUpdateItem = useCallback((id: string, field: keyof TablePurchaseItem | string, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleFileImport = useCallback((file: File) => {
    message.loading({ content: `Đang xử lý ${file.name}...`, key: 'imp' });
    setTimeout(() => {
      if (productsList.length > 0) {
        const slice = productsList.slice(0, 3).map((p, idx) => ({
          id: `imp-${p.productId}-${idx}`,
          productId: p.productId,
          code: p.code,
          name: p.name,
          unit: p.uom || 'Cái',
          quantity: (idx + 1) * 10,
          unitPrice: p.costPrice > 0 ? p.costPrice : p.standardPrice,
          discountPercent: 0,
          currentStock: p.stockQuantity,
          currentUnitCost: p.costPrice,
        }));
        setItems(slice);
        message.success({ content: `Đã nhập ${slice.length} mặt hàng từ file!`, key: 'imp' });
      }
    }, 500);
  }, [productsList]);

  const handleSubmit = useCallback(async (targetStatus: 'DRAFT' | 'COMPLETED') => {
    if (items.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 mặt hàng vào phiếu nhập.');
      searchInputRef.current?.focus();
      return;
    }
    if (!selectedSupplier) {
      message.warning('Vui lòng chọn Nhà cung cấp.');
      setSidebarOpen(true);
      return;
    }
    const invalidItem = items.find((i) => i.quantity <= 0);
    if (invalidItem) {
      message.error(`Số lượng của mặt hàng "${invalidItem.name}" phải lớn hơn 0.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        warehouseId: activeWarehouse.warehouseId,
        partnerId: Number(selectedSupplier.id) || 1,
        externalPoNumber: externalPoNumber.trim() || null,
        status: targetStatus,
        paidAmount: targetStatus === 'COMPLETED' ? paidAmount : 0,
        paymentMethod: paymentMethod,
        notes: notes.trim() || null,
        items: items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent,
          lotNumber: i.lotNumber || null,
        })),
      };

      const result = await purchaseService.createPurchase(payload);
      if (targetStatus === 'COMPLETED') {
        message.success(`Nhập hàng thành công! Mã phiếu: ${result.grCode}. Tồn kho tại ${activeWarehouse.name} đã được cập nhật.`);
      } else {
        message.success(`Đã lưu tạm phiếu nhập hàng: ${result.grCode}.`);
      }
      router.push('/purchases');
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi lưu phiếu nhập hàng');
    } finally {
      setIsSubmitting(false);
    }
  }, [items, selectedSupplier, activeWarehouse, externalPoNumber, paidAmount, paymentMethod, notes, router]);

  // Shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handleSubmit('DRAFT');
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleSubmit('COMPLETED');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  return {
    activeWarehouse,
    setActiveWarehouse,
    warehouses,
    items,
    sidebarOpen,
    setSidebarOpen,
    dateTimeStr,
    username,
    searchInputRef,
    productsList,
    loadingProducts,
    suppliersList,
    loadingSuppliers,
    selectedSupplier,
    setSelectedSupplier,
    externalPoNumber,
    setExternalPoNumber,
    orderDiscount,
    setOrderDiscount,
    paidAmount,
    setPaidAmount,
    paymentMethod,
    setPaymentMethod,
    debtAmount,
    notes,
    setNotes,
    isSubmitting,
    totalGoods,
    finalPayable,
    showAddProductModal,
    setShowAddProductModal,
    showAddSupplierModal,
    setShowAddSupplierModal,
    handleSelectProduct,
    handleUpdateItem,
    handleRemoveItem,
    handleFileImport,
    handleSubmit,
  };
}
