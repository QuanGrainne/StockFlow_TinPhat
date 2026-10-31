// src/app/pos/page.tsx
// Màn hình bán hàng StockFlow POS chuẩn KiotViet Desktop-First (Đã loại bỏ các trường chưa có trong ERD)

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { message, Modal } from 'antd';
import { PosHeader } from '@/features/pos/components/PosHeader';
import { PosProductSearch } from '@/features/pos/components/PosProductSearch';
import { PosCartTable } from '@/features/pos/components/PosCartTable';
import { PosCartFooter } from '@/features/pos/components/PosCartFooter';
import { PosPaymentPanel } from '@/features/pos/components/PosPaymentPanel';
import { PosFooter } from '@/features/pos/components/PosFooter';
import { QuickSelectProductModal } from '@/features/pos/components/QuickSelectProductModal';
import { ReceiptPrintModal } from '@/features/pos/components/ReceiptPrintModal';
import { CustomerFormModal } from '@/features/customers/components/CustomerFormModal';
import { customerService } from '@/features/customers/services/customerService';
import { posService } from '@/features/pos/services/posService';
import {
  PosProduct,
  PosCategory,
  PosCustomer,
  PosOrderTab,
  CartItem,
} from '@/features/pos/types';

export default function PosPage() {
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // Quản lý đa hóa đơn (Multi-tab orders độc lập)
  const [tabs, setTabs] = useState<PosOrderTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('order-1');

  // Trạng thái chung
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickSelectOpen, setQuickSelectOpen] = useState(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [lastOrderCode, setLastOrderCode] = useState('HD00001');

  // Refs cho phím tắt
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);

  // 1. Tải danh mục, sản phẩm và khách hàng ban đầu từ backend
  useEffect(() => {
    const initializePos = async () => {
      try {
        const [cats, prods, custs] = await Promise.all([
          posService.getCategories(),
          posService.getProducts(),
          posService.getCustomers(),
        ]);

        setCategories(cats);
        setProducts(prods);
        setCustomers(custs);

        // Khách hàng mẫu: Nam Á (KH00892)
        const namACustomer = custs.find((c) => c.code === 'KH00892') || custs[0] || null;

        // Tìm 4 sản phẩm mẫu từ danh sách sản phẩm
        const ciscoSwitch = prods.find((p) => p.code === 'SP-10294') || prods[0];
        const samsungSsd = prods.find((p) => p.code === 'SP-20411') || prods[1];
        const commScope = prods.find((p) => p.code === 'SP-08832') || prods[2];
        const dellPower = prods.find((p) => p.code === 'SP-33019') || prods[3];

        const initialCartItems: CartItem[] = [];

        if (ciscoSwitch) {
          initialCartItems.push({
            stt: 1,
            productId: ciscoSwitch.productId,
            code: ciscoSwitch.code,
            name: ciscoSwitch.name,
            imageUrl: ciscoSwitch.imageUrl,
            uom: ciscoSwitch.uom,
            unitId: ciscoSwitch.baseUnitId,
            unitPrice: ciscoSwitch.standardPrice,
            quantity: 2,
            stockQuantity: ciscoSwitch.stockQuantity,
            minSafeStock: ciscoSwitch.minSafeStock,
            total: 2 * ciscoSwitch.standardPrice,
          });
        }

        if (samsungSsd) {
          initialCartItems.push({
            stt: 2,
            productId: samsungSsd.productId,
            code: samsungSsd.code,
            name: samsungSsd.name,
            imageUrl: samsungSsd.imageUrl,
            uom: samsungSsd.uom,
            unitId: samsungSsd.baseUnitId,
            unitPrice: samsungSsd.standardPrice,
            quantity: 4,
            stockQuantity: samsungSsd.stockQuantity,
            minSafeStock: samsungSsd.minSafeStock,
            total: 4 * samsungSsd.standardPrice,
          });
        }

        if (commScope) {
          initialCartItems.push({
            stt: 3,
            productId: commScope.productId,
            code: commScope.code,
            name: commScope.name,
            imageUrl: commScope.imageUrl,
            uom: commScope.uom,
            unitId: commScope.baseUnitId,
            unitPrice: commScope.standardPrice,
            quantity: 3,
            stockQuantity: commScope.stockQuantity,
            minSafeStock: commScope.minSafeStock,
            total: 3 * commScope.standardPrice,
          });
        }

        if (dellPower) {
          initialCartItems.push({
            stt: 4,
            productId: dellPower.productId,
            code: dellPower.code,
            name: dellPower.name,
            imageUrl: dellPower.imageUrl,
            uom: dellPower.uom,
            unitId: dellPower.baseUnitId,
            unitPrice: dellPower.standardPrice,
            quantity: 1,
            stockQuantity: dellPower.stockQuantity,
            minSafeStock: dellPower.minSafeStock || 5,
            total: 1 * dellPower.standardPrice,
          });
        }

        // Tạo 2 tab ban đầu: Hóa đơn 1 (Đang xử lý) và Hóa đơn 2 (Chờ)
        const tab1: PosOrderTab = {
          id: 'order-1',
          code: 'Hóa đơn 1',
          status: 'PROCESSING',
          items: initialCartItems,
          selectedCustomer: namACustomer,
          autoPrintK80: true,
          warehouseId: 3,
          warehouseName: 'Kho Tổng Hà Nội',
          notes: 'Giao trước 17h, kèm biên bản bàn giao & CO/CQ',
          paymentMethod: 'VIETQR',
          prepaidAmount: 20000000,
          discountAmount: 500000, // Số tiền giảm giá nhập tay
        };

        const tab2: PosOrderTab = {
          id: 'order-2',
          code: 'Hóa đơn 2',
          status: 'WAITING',
          items: [],
          selectedCustomer: null,
          autoPrintK80: true,
          warehouseId: 3,
          warehouseName: 'Kho Tổng Hà Nội',
          notes: '',
          paymentMethod: 'CASH',
          prepaidAmount: 0,
          discountAmount: 0,
        };

        setTabs([tab1, tab2]);
        setActiveTabId('order-1');
      } catch (err) {
        console.error('Khởi tạo POS thất bại:', err);
      }
    };

    initializePos();
  }, []);

  // Tab hiện tại đang thao tác
  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Cập nhật thuộc tính của tab hiện tại
  const updateCurrentTab = (updater: (prevTab: PosOrderTab) => PosOrderTab) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === activeTabId ? updater(t) : t))
    );
  };

  // 2. Các hành động trên giỏ hàng của tab hiện tại
  const handleAddToCart = (product: PosProduct) => {
    updateCurrentTab((tab) => {
      const existingIndex = tab.items.findIndex((i) => i.productId === product.productId);

      if (existingIndex >= 0) {
        const updated = [...tab.items];
        const cur = updated[existingIndex];
        const newQty = cur.quantity + 1;
        updated[existingIndex] = {
          ...cur,
          quantity: newQty,
          total: cur.unitPrice * newQty,
        };
        return { ...tab, items: updated };
      } else {
        const newItem: CartItem = {
          stt: tab.items.length + 1,
          productId: product.productId,
          code: product.code,
          name: product.name,
          imageUrl: product.imageUrl,
          uom: product.uom,
          unitId: product.baseUnitId,
          unitPrice: product.standardPrice,
          quantity: 1,
          stockQuantity: product.stockQuantity,
          minSafeStock: product.minSafeStock,
          total: product.standardPrice,
        };
        return { ...tab, items: [...tab.items, newItem] };
      }
    });

    message.success(`Đã thêm "${product.name}" vào giỏ hàng`);
  };

  const handleUpdateQuantity = (productId: number, newQty: number) => {
    updateCurrentTab((tab) => {
      const updated = tab.items.map((i) => {
        if (i.productId === productId) {
          return {
            ...i,
            quantity: newQty,
            total: i.unitPrice * newQty,
          };
        }
        return i;
      });
      return { ...tab, items: updated };
    });
  };

  const handleRemoveItem = (productId: number) => {
    updateCurrentTab((tab) => {
      const updated = tab.items
        .filter((i) => i.productId !== productId)
        .map((item, idx) => ({ ...item, stt: idx + 1 }));
      return { ...tab, items: updated };
    });
  };

  const handleClearCart = () => {
    Modal.confirm({
      title: 'Xác nhận xóa giỏ hàng',
      content: 'Bạn có chắc chắn muốn xóa toàn bộ sản phẩm trong hóa đơn này?',
      okText: 'Xóa giỏ',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: () => {
        updateCurrentTab((tab) => ({ ...tab, items: [] }));
        message.info('Đã xóa toàn bộ sản phẩm trong giỏ');
      },
    });
  };

  // 3. Quản lý Tab hóa đơn
  const handleAddTab = () => {
    const newIdx = tabs.length + 1;
    const newTab: PosOrderTab = {
      id: `order-${Date.now()}`,
      code: `Hóa đơn ${newIdx}`,
      status: 'PROCESSING',
      items: [],
      selectedCustomer: null,
      autoPrintK80: true,
      warehouseId: 3,
      warehouseName: 'Kho Tổng Hà Nội',
      notes: '',
      paymentMethod: 'CASH',
      prepaidAmount: 0,
      discountAmount: 0,
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId: string) => {
    const tabToClose = tabs.find((t) => t.id === tabId);
    if (!tabToClose) return;

    if (tabToClose.items.length > 0) {
      Modal.confirm({
        title: 'Xác nhận đóng hóa đơn',
        content: `"${tabToClose.code}" đang có ${tabToClose.items.length} sản phẩm chưa thanh toán. Bạn có muốn xóa đơn này?`,
        okText: 'Đóng đơn',
        okType: 'danger',
        cancelText: 'Giữ lại',
        onOk: () => {
          performCloseTab(tabId);
        },
      });
    } else {
      performCloseTab(tabId);
    }
  };

  const performCloseTab = (tabId: string) => {
    const remaining = tabs.filter((t) => t.id !== tabId);
    setTabs(remaining);
    if (activeTabId === tabId && remaining.length > 0) {
      setActiveTabId(remaining[0].id);
    }
  };

  // 4. Xử lý thanh toán và tạo đơn
  const handleSubmitPayment = async (type: 'PAY_AND_PRINT' | 'STOCK_ISSUE_ONLY' | 'DRAFT') => {
    if (!currentTab || currentTab.items.length === 0) {
      message.warning('Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán.');
      return;
    }

    try {
      setIsSubmitting(true);
      const statusOverride = type === 'DRAFT' ? 'DRAFT' : 'COMPLETED';
      const res = await posService.createPosOrder(currentTab, statusOverride);

      const generatedCode = res?.orderCode || `HD${Math.floor(10000 + Math.random() * 90000)}`;
      setLastOrderCode(generatedCode);

      if (type === 'DRAFT') {
        message.success(`Đã lưu đơn tạm [${generatedCode}] thành công!`);
      } else {
        message.success(`Thanh toán đơn hàng [${generatedCode}] thành công!`);

        // Mở modal in hóa đơn nếu chọn PAY_AND_PRINT hoặc có bật autoPrintK80
        if (type === 'PAY_AND_PRINT' || currentTab.autoPrintK80) {
          setPrintModalOpen(true);
        }
      }

      // Làm mới lại tab hiện tại
      updateCurrentTab((tab) => ({
        ...tab,
        items: [],
        prepaidAmount: 0,
        discountAmount: 0,
        notes: '',
      }));
    } catch (err: any) {
      message.error(err?.message || 'Có lỗi xảy ra khi tạo đơn hàng POS.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Đăng ký phím tắt POS chuẩn KiotViet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Thêm đơn mới
      if (e.key === 'F1') {
        e.preventDefault();
        handleAddTab();
      }
      // F2: Reset danh mục
      else if (e.key === 'F2') {
        e.preventDefault();
        setSelectedCategoryId(null);
      }
      // F3: Focus ô tìm kiếm sản phẩm / Barcode
      else if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
      // F4: Focus ô tìm kiếm khách hàng
      else if (e.key === 'F4') {
        e.preventDefault();
        customerSearchRef.current?.focus();
        customerSearchRef.current?.select();
      }
      // F7: Xóa giỏ
      else if (e.key === 'F7') {
        e.preventDefault();
        if (currentTab && currentTab.items.length > 0) {
          handleClearCart();
        }
      }
      // F9: Lưu đơn tạm
      else if (e.key === 'F9') {
        e.preventDefault();
        if (currentTab && currentTab.items.length > 0 && !isSubmitting) {
          handleSubmitPayment('DRAFT');
        }
      }
      // F10: Thanh toán & In
      else if (e.key === 'F10') {
        e.preventDefault();
        if (currentTab && currentTab.items.length > 0 && !isSubmitting) {
          handleSubmitPayment('PAY_AND_PRINT');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, currentTab, isSubmitting]);

  if (!currentTab) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100 text-slate-500 text-sm">
        Đang tải giao diện StockFlow POS...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F3F4F6] overflow-hidden">
      {/* ─── VÙNG A: Thanh điều hướng phía trên ─── */}
      <PosHeader
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={(id) => setActiveTabId(id)}
        onAddTab={handleAddTab}
        onCloseTab={handleCloseTab}
        autoPrintK80={currentTab.autoPrintK80}
        onToggleAutoPrint={(val) => updateCurrentTab((t) => ({ ...t, autoPrintK80: val }))}
        onOpenHistory={() => message.info('Mở lịch sử các đơn hàng POS gần đây')}
        onOpenShiftClose={() => message.info('Mở tính năng kết ca và chốt tiền mặt thu ngân')}
      />

      {/* ─── THÂN MÀN HÌNH BÁN HÀNG: Chia làm VÙNG B (Trái 66%) và VÙNG C (Phải 34%) ─── */}
      <main className="flex-1 p-2.5 overflow-hidden flex gap-2.5 min-h-0">
        {/* ─── VÙNG B: Khu vực Sản phẩm và Giỏ hàng (Bên trái) ─── */}
        <section className="flex-1 flex flex-col justify-between gap-2 min-w-0 overflow-hidden">
          {/* Thanh tìm kiếm Barcode & Danh mục sản phẩm */}
          <PosProductSearch
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={(catId) => setSelectedCategoryId(catId)}
            products={products}
            onAddToCart={handleAddToCart}
            onOpenQuickSelect={() => setQuickSelectOpen(true)}
            searchRef={searchInputRef}
          />

          {/* Bảng chi tiết đơn hàng (Thành tiền thay cho Chiết khấu) */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-0.5">
            <PosCartTable
              items={currentTab.items}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
            />
          </div>

          {/* Thanh công cụ dưới bảng (Tổng số SP, Xóa giỏ, Ghi chú, Kho xuất) */}
          <PosCartFooter
            totalProducts={currentTab.items.length}
            totalItemsCount={currentTab.items.reduce((sum, item) => sum + item.quantity, 0)}
            onClearCart={handleClearCart}
            notes={currentTab.notes}
            onChangeNotes={(txt) => updateCurrentTab((t) => ({ ...t, notes: txt }))}
            warehouseName={currentTab.warehouseName}
          />
        </section>

        {/* ─── VÙNG C: Khu vực Khách hàng, Tổng tiền và Thanh toán (Bên phải 34%) ─── */}
        <aside className="w-[380px] xl:w-[420px] shrink-0 h-full overflow-y-auto no-scrollbar">
          <PosPaymentPanel
            order={currentTab}
            allCustomers={customers}
            onSelectCustomer={(cust) => updateCurrentTab((t) => ({ ...t, selectedCustomer: cust }))}
            onOpenAddCustomerModal={() => setAddCustomerModalOpen(true)}
            onChangePaymentMethod={(pm) => updateCurrentTab((t) => ({ ...t, paymentMethod: pm }))}
            onChangePrepaidAmount={(amt) => updateCurrentTab((t) => ({ ...t, prepaidAmount: amt }))}
            onChangeDiscountAmount={(amt) => updateCurrentTab((t) => ({ ...t, discountAmount: amt }))}
            onSubmitPayment={handleSubmitPayment}
            isSubmitting={isSubmitting}
            customerSearchRef={customerSearchRef}
          />
        </aside>
      </main>

      {/* ─── VÙNG D: Thanh trạng thái dưới cùng ─── */}
      <PosFooter />

      {/* ─── Modals hỗ trợ bán hàng ─── */}
      {/* Modal Chọn nhanh sản phẩm dạng ô lưới */}
      <QuickSelectProductModal
        open={quickSelectOpen}
        onClose={() => setQuickSelectOpen(false)}
        products={products}
        categories={categories}
        onAddToCart={handleAddToCart}
      />

      {/* Modal Xem trước & In hóa đơn K80 nhiệt */}
      <ReceiptPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        order={currentTab}
        orderCode={lastOrderCode}
      />

      {/* Modal Thêm nhanh khách hàng mới ngay tại quầy POS (Tuân thủ VR-01 -> VR-14) */}
      <CustomerFormModal
        open={addCustomerModalOpen}
        onCancel={() => setAddCustomerModalOpen(false)}
        onSuccess={async (newCust) => {
          const created = await customerService.createCustomer(newCust);
          const updatedCusts = await posService.getCustomers();
          setCustomers(updatedCusts);
          const matched = updatedCusts.find((c) => c.id === created.id) || null;
          updateCurrentTab((t) => ({ ...t, selectedCustomer: matched }));
          setAddCustomerModalOpen(false);
          message.success(`Đã thêm khách hàng "${created.name}" thành công!`);
        }}
      />
    </div>
  );
}
