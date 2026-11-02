// src/app/pos/page.tsx
// Màn hình bán hàng StockFlow POS chuẩn KiotViet Desktop-First (Có chọn bảng giá và chọn kho/chi nhánh)

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
import { orderSettingsService } from '@/features/settings/services/orderSettingsService';
import { OrderSettings } from '@/features/settings/types';
import {
  PosProduct,
  PosCategory,
  PosCustomer,
  PosPriceBook,
  PosWarehouse,
  PosOrderTab,
  CartItem,
} from '@/features/pos/types';

// Các khóa lưu trữ cục bộ LocalStorage cho POS (chống mất đơn khi F5/reload)
const POS_STORAGE_TABS_KEY = 'stockflow_pos_tabs';
const POS_STORAGE_ACTIVE_TAB_KEY = 'stockflow_pos_active_tab_id';
const POS_STORAGE_WAREHOUSE_KEY = 'stockflow_pos_warehouse_id';

export default function PosPage() {
  const [categories, setCategories] = useState<PosCategory[]>([]);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [customers, setCustomers] = useState<PosCustomer[]>([]);
  const [priceBooks, setPriceBooks] = useState<PosPriceBook[]>([]);
  const [warehouses, setWarehouses] = useState<PosWarehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(3);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [priceMatrix, setPriceMatrix] = useState<Record<number, Record<number, number>>>({});

  // Quản lý đa hóa đơn (Multi-tab orders độc lập)
  const [tabs, setTabs] = useState<PosOrderTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('order-1');

  // Trạng thái chung
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quickSelectOpen, setQuickSelectOpen] = useState(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printOrderData, setPrintOrderData] = useState<PosOrderTab | null>(null);
  const [lastOrderCode, setLastOrderCode] = useState('HD00001');
  const [orderSettings, setOrderSettings] = useState<OrderSettings | null>(null);

  // Refs cho phím tắt
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerSearchRef = useRef<HTMLInputElement>(null);

  // 1. Tải danh mục, sản phẩm, bảng giá, kho và khách hàng từ backend
  useEffect(() => {
    const initializePos = async () => {
      try {
        let initialWhId = 3;
        try {
          const savedWhId = localStorage.getItem(POS_STORAGE_WAREHOUSE_KEY);
          if (savedWhId && Number(savedWhId) > 0) {
            initialWhId = Number(savedWhId);
          }
        } catch {}

        const [cats, prods, custs, pbs, whs, pMatrix, ordSettings] = await Promise.all([
          posService.getCategories(),
          posService.getProducts(undefined, undefined, initialWhId),
          posService.getCustomers(),
          posService.getPriceBooks(),
          posService.getWarehouses(),
          posService.getPriceMatrix([1, 2, 3, 4]),
          orderSettingsService.getSettings().catch(() => null),
        ]);

        if (ordSettings) {
          setOrderSettings(ordSettings);
        }

        setCategories(cats);
        setProducts(prods);
        setCustomers(custs);
        setPriceBooks(pbs);
        setWarehouses(whs);
        setPriceMatrix(pMatrix);

        const defaultWh =
          whs.find((w) => w.warehouseId === initialWhId) ||
          whs.find((w) => w.warehouseId === 3) ||
          whs[0] || {
            warehouseId: 3,
            code: 'K001',
            name: 'Kho Tổng Gia Lâm',
            branchName: 'Chi nhánh chính - Hà Nội',
            status: 'ACTIVE',
          };
        setSelectedWarehouseId(defaultWh.warehouseId);

        const defaultPb = pbs.find((p) => p.isDefault) || pbs[0] || {
          priceBookId: 1,
          priceBookCode: 'BG000001',
          priceBookName: 'Bảng giá chung',
          isActive: true,
          isDefault: true,
        };

        // Bảng giá Đại lý C1 cho Nam Á
        const pbDaiLy = pbs.find((p) => p.priceBookName.toLowerCase().includes('đại lý')) || defaultPb;

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
            standardPrice: ciscoSwitch.standardPrice,
            unitPrice: 8281000,
            quantity: 2,
            stockQuantity: ciscoSwitch.stockQuantity,
            minSafeStock: ciscoSwitch.minSafeStock,
            discountPercent: 2,
            discountAmount: 169000,
            total: 2 * 8450000 - 169000,
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
            standardPrice: samsungSsd.standardPrice,
            unitPrice: 2650000,
            quantity: 4,
            stockQuantity: samsungSsd.stockQuantity,
            minSafeStock: samsungSsd.minSafeStock,
            discountPercent: 0,
            discountAmount: 0,
            total: 4 * 2650000,
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
            standardPrice: commScope.standardPrice,
            unitPrice: 2042500,
            quantity: 3,
            stockQuantity: commScope.stockQuantity,
            minSafeStock: commScope.minSafeStock,
            discountPercent: 5,
            discountAmount: 322500,
            total: 3 * 2150000 - 322500,
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
            standardPrice: dellPower.standardPrice,
            unitPrice: 3890000,
            quantity: 1,
            stockQuantity: dellPower.stockQuantity,
            minSafeStock: dellPower.minSafeStock || 5,
            discountPercent: 0,
            discountAmount: 0,
            total: 1 * 3890000,
          });
        }

        // Khôi phục giỏ hàng từ LocalStorage nếu đã có dữ liệu trước đó (chống mất đơn khi F5)
        let restoredTabs: PosOrderTab[] | null = null;
        let restoredActiveTabId: string | null = null;

        try {
          const savedTabsJson = localStorage.getItem(POS_STORAGE_TABS_KEY);
          if (savedTabsJson) {
            const parsed = JSON.parse(savedTabsJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              restoredTabs = parsed;
            }
          }
          const savedActiveId = localStorage.getItem(POS_STORAGE_ACTIVE_TAB_KEY);
          if (savedActiveId) {
            restoredActiveTabId = savedActiveId;
          }
          const savedWhId = localStorage.getItem(POS_STORAGE_WAREHOUSE_KEY);
          if (savedWhId && whs.some((w) => w.warehouseId === Number(savedWhId))) {
            setSelectedWarehouseId(Number(savedWhId));
          }
        } catch (e) {
          console.warn('Lỗi đọc LocalStorage:', e);
        }

        if (restoredTabs && restoredTabs.length > 0) {
          // Cập nhật lại số lượng tồn kho mới nhất theo kho hiện tại từ backend và tắt VAT
          const updatedTabs = restoredTabs.map((t) => ({
            ...t,
            vatRate: 0,
            applyVat: false,
            items: t.items.map((item) => {
              const matched = prods.find((p) => p.productId === item.productId);
              return {
                ...item,
                stockQuantity: matched ? matched.stockQuantity : item.stockQuantity,
              };
            }),
          }));
          setTabs(updatedTabs);
          const activeExists = updatedTabs.some((t) => t.id === restoredActiveTabId);
          setActiveTabId(activeExists && restoredActiveTabId ? restoredActiveTabId : updatedTabs[0].id);
        } else {
          // Tạo 2 tab ban đầu nếu LocalStorage trống (Không áp dụng thuế VAT)
          const tab1: PosOrderTab = {
            id: 'order-1',
            code: 'Hóa đơn 1',
            status: 'PROCESSING',
            items: initialCartItems,
            selectedCustomer: namACustomer,
            priceBookId: pbDaiLy.priceBookId,
            priceBookName: pbDaiLy.priceBookName,
            autoPrintK80: true,
            warehouseId: defaultWh.warehouseId,
            warehouseName: defaultWh.name,
            notes: 'Giao trước 17h, kèm biên bản bàn giao & CO/CQ',
            paymentMethod: 'VIETQR',
            prepaidAmount: 20000000,
            discountAmount: 0,
            vatRate: 0,
            applyVat: false,
          };

          const tab2: PosOrderTab = {
            id: 'order-2',
            code: 'Hóa đơn 2',
            status: 'WAITING',
            items: [],
            selectedCustomer: null,
            priceBookId: defaultPb.priceBookId,
            priceBookName: defaultPb.priceBookName,
            autoPrintK80: true,
            warehouseId: defaultWh.warehouseId,
            warehouseName: defaultWh.name,
            notes: '',
            paymentMethod: 'CASH',
            prepaidAmount: 0,
            discountAmount: 0,
            vatRate: 0,
            applyVat: false,
          };

          setTabs([tab1, tab2]);
          setActiveTabId('order-1');
          try {
            localStorage.setItem(POS_STORAGE_TABS_KEY, JSON.stringify([tab1, tab2]));
            localStorage.setItem(POS_STORAGE_ACTIVE_TAB_KEY, 'order-1');
          } catch (e) {
            console.warn('Lỗi lưu LocalStorage ban đầu:', e);
          }
        }
      } catch (err) {
        console.error('Khởi tạo POS thất bại:', err);
      }
    };

    initializePos();
  }, []);

  // Tự động đồng bộ giỏ hàng và danh sách tabs vào LocalStorage mỗi khi có thay đổi
  useEffect(() => {
    if (tabs.length > 0) {
      try {
        localStorage.setItem(POS_STORAGE_TABS_KEY, JSON.stringify(tabs));
      } catch (err) {
        console.warn('Lỗi đồng bộ tabs vào LocalStorage:', err);
      }
    }
  }, [tabs]);

  // Tự động lưu tab đang chọn vào LocalStorage
  useEffect(() => {
    if (activeTabId) {
      try {
        localStorage.setItem(POS_STORAGE_ACTIVE_TAB_KEY, activeTabId);
      } catch (err) {
        console.warn('Lỗi lưu activeTabId vào LocalStorage:', err);
      }
    }
  }, [activeTabId]);

  // Tự động lưu kho đang chọn vào LocalStorage
  useEffect(() => {
    if (selectedWarehouseId) {
      try {
        localStorage.setItem(POS_STORAGE_WAREHOUSE_KEY, selectedWarehouseId.toString());
      } catch (err) {
        console.warn('Lỗi lưu warehouseId vào LocalStorage:', err);
      }
    }
  }, [selectedWarehouseId]);

  // Tab hiện tại đang thao tác
  const currentTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Hàm cập nhật tab hiện tại
  const updateCurrentTab = (updater: (tab: PosOrderTab) => PosOrderTab) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === activeTabId ? updater(t) : t))
    );
  };

  // Chuyển đổi Chi nhánh / Kho xuất bán hàng trên header (Tự động cập nhật tồn kho theo đúng chi nhánh)
  const handleSelectWarehouse = async (wh: PosWarehouse) => {
    setSelectedWarehouseId(wh.warehouseId);
    try {
      const updatedProds = await posService.getProducts(undefined, selectedCategoryId || undefined, wh.warehouseId);
      setProducts(updatedProds);

      updateCurrentTab((tab) => ({
        ...tab,
        warehouseId: wh.warehouseId,
        warehouseName: wh.name,
        items: tab.items.map((item) => {
          const matched = updatedProds.find((p) => p.productId === item.productId);
          return {
            ...item,
            stockQuantity: matched ? matched.stockQuantity : 0,
          };
        }),
      }));
    } catch (err) {
      console.error('Lỗi khi tải lại tồn kho theo kho mới:', err);
      updateCurrentTab((tab) => ({
        ...tab,
        warehouseId: wh.warehouseId,
        warehouseName: wh.name,
      }));
    }
    message.success(`Đã chuyển sang ${wh.name} (${wh.branchName})`);
  };

  // Hàm tính toán giá bán và chiết khấu cho 1 sản phẩm theo bảng giá đang chọn
  const computePricing = (
    prod: { productId: number; standardPrice: number },
    quantity: number,
    pbId: number,
    matrix: Record<number, Record<number, number>> = priceMatrix
  ) => {
    const basePrice = prod.standardPrice;
    let effectivePrice = basePrice;

    if (matrix[prod.productId] && matrix[prod.productId][pbId] !== undefined) {
      effectivePrice = matrix[prod.productId][pbId];
    }

    let discountPercent = 0;
    let discountAmount = 0;

    if (effectivePrice < basePrice) {
      discountAmount = (basePrice - effectivePrice) * quantity;
      discountPercent = Math.round(((basePrice - effectivePrice) / basePrice) * 100);
    }

    return {
      standardPrice: basePrice,
      unitPrice: effectivePrice,
      quantity,
      discountPercent,
      discountAmount,
      total: effectivePrice * quantity,
    };
  };

  // Chọn khách hàng (Tự động liên kết bảng giá nếu khách có nhóm đặc thù)
  const handleSelectCustomer = (cust: PosCustomer | null) => {
    updateCurrentTab((tab) => {
      let pbId = tab.priceBookId;
      let pbName = tab.priceBookName;

      if (cust) {
        const lowerName = cust.name.toLowerCase();
        if (cust.code === 'KH00892' || lowerName.includes('đại lý') || lowerName.includes('nam á')) {
          const pbDaiLy = priceBooks.find((p) => p.priceBookName.toLowerCase().includes('đại lý'));
          if (pbDaiLy) {
            pbId = pbDaiLy.priceBookId;
            pbName = pbDaiLy.priceBookName;
          }
        }
      }

      // Tự động tính toán lại giá cho tất cả sản phẩm trong giỏ theo bảng giá mới
      const recalculatedItems = tab.items.map((item) => {
        const pricing = computePricing(
          { productId: item.productId, standardPrice: item.standardPrice || item.unitPrice },
          item.quantity,
          pbId,
          priceMatrix
        );
        return {
          ...item,
          ...pricing,
        };
      });

      return {
        ...tab,
        selectedCustomer: cust,
        priceBookId: pbId,
        priceBookName: pbName,
        items: recalculatedItems,
      };
    });
  };

  // Đổi bảng giá bán (Tự động tính lại đơn giá, chiết khấu và tổng thanh toán của từng sản phẩm)
  const handleChangePriceBook = (pbId: number) => {
    const matched = priceBooks.find((p) => p.priceBookId === pbId);
    if (!matched) return;

    updateCurrentTab((tab) => {
      const recalculatedItems = tab.items.map((item) => {
        const pricing = computePricing(
          { productId: item.productId, standardPrice: item.standardPrice || item.unitPrice },
          item.quantity,
          pbId,
          priceMatrix
        );
        return {
          ...item,
          ...pricing,
        };
      });

      return {
        ...tab,
        priceBookId: matched.priceBookId,
        priceBookName: matched.priceBookName,
        items: recalculatedItems,
      };
    });

    message.info(`Đã áp dụng ${matched.priceBookName}`);
  };

  // 2. Thao tác giỏ hàng
  const handleAddToCart = (product: PosProduct, customQty: number = 1) => {
    if (!currentTab) return;

    updateCurrentTab((tab) => {
      const existingIdx = tab.items.findIndex((i) => i.productId === product.productId);
      let updatedItems: CartItem[];

      if (existingIdx >= 0) {
        updatedItems = tab.items.map((item, idx) => {
          if (idx === existingIdx) {
            const nextQty = item.quantity + customQty;
            const pricing = computePricing(
              { productId: item.productId, standardPrice: item.standardPrice || product.standardPrice },
              nextQty,
              tab.priceBookId,
              priceMatrix
            );
            return {
              ...item,
              ...pricing,
            };
          }
          return item;
        });
      } else {
        const pricing = computePricing(
          { productId: product.productId, standardPrice: product.standardPrice },
          customQty,
          tab.priceBookId,
          priceMatrix
        );
        const newItem: CartItem = {
          stt: tab.items.length + 1,
          productId: product.productId,
          code: product.code,
          name: product.name,
          imageUrl: product.imageUrl,
          uom: product.uom,
          unitId: product.baseUnitId,
          stockQuantity: product.stockQuantity,
          minSafeStock: product.minSafeStock,
          ...pricing,
        };
        updatedItems = [...tab.items, newItem];
      }

      return { ...tab, items: updatedItems };
    });

    message.success(`Đã thêm "${product.name}" vào giỏ hàng`);
  };

  const handleUpdateQuantity = (productId: number, newQty: number) => {
    updateCurrentTab((tab) => {
      const updated = tab.items.map((i) => {
        if (i.productId === productId) {
          const pricing = computePricing(
            { productId: i.productId, standardPrice: i.standardPrice },
            newQty,
            tab.priceBookId,
            priceMatrix
          );
          return {
            ...i,
            ...pricing,
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

  // Cập nhật chiết khấu từng mặt hàng (chuẩn KiotViet: % hoặc VNĐ)
  const handleUpdateItemDiscount = (productId: number, type: 'PERCENT' | 'AMOUNT', value: number) => {
    updateCurrentTab((tab) => {
      const updatedItems = tab.items.map((item) => {
        if (item.productId === productId) {
          const basePrice = item.standardPrice || item.unitPrice;
          const clampedVal = Math.max(0, value);
          let unitDiscount = 0;
          if (type === 'PERCENT') {
            const pct = Math.min(100, clampedVal);
            unitDiscount = Math.round(basePrice * (pct / 100));
          } else {
            unitDiscount = Math.min(basePrice, clampedVal);
          }
          const effectivePrice = Math.max(0, basePrice - unitDiscount);
          const totalDiscount = (basePrice - effectivePrice) * item.quantity;
          const discountPercent = basePrice > 0 ? Math.round(((basePrice - effectivePrice) / basePrice) * 100) : 0;
          return {
            ...item,
            discountType: type,
            discountValue: clampedVal,
            discountPercent,
            discountAmount: totalDiscount,
            unitPrice: effectivePrice,
            total: effectivePrice * item.quantity,
          };
        }
        return item;
      });
      return { ...tab, items: updatedItems };
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
    const defaultPb = priceBooks.find((p) => p.isDefault) || priceBooks[0] || {
      priceBookId: 1,
      priceBookName: 'Bảng giá chung',
    };
    const currentWh = warehouses.find((w) => w.warehouseId === selectedWarehouseId);

    const newTab: PosOrderTab = {
      id: `order-${Date.now()}`,
      code: `Hóa đơn ${newIdx}`,
      status: 'PROCESSING',
      items: [],
      selectedCustomer: null,
      priceBookId: currentTab?.priceBookId || defaultPb.priceBookId,
      priceBookName: currentTab?.priceBookName || defaultPb.priceBookName,
      autoPrintK80: true,
      warehouseId: selectedWarehouseId,
      warehouseName: currentWh?.name || 'Kho Tổng Gia Lâm',
      notes: '',
      paymentMethod: 'CASH',
      prepaidAmount: 0,
      discountAmount: 0,
      vatRate: 0,
      applyVat: false,
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
    if (remaining.length === 0) {
      const defaultPb = priceBooks.find((p) => p.isDefault) || priceBooks[0] || {
        priceBookId: 1,
        priceBookName: 'Bảng giá chung',
      };
      const currentWh = warehouses.find((w) => w.warehouseId === selectedWarehouseId);
      const freshTab: PosOrderTab = {
        id: `order-${Date.now()}`,
        code: 'Hóa đơn 1',
        status: 'PROCESSING',
        items: [],
        selectedCustomer: null,
        priceBookId: defaultPb.priceBookId,
        priceBookName: defaultPb.priceBookName,
        autoPrintK80: true,
        warehouseId: selectedWarehouseId,
        warehouseName: currentWh?.name || 'Kho Tổng Gia Lâm',
        notes: '',
        paymentMethod: 'CASH',
        prepaidAmount: 0,
        discountAmount: 0,
        vatRate: 0,
        applyVat: false,
      };
      setTabs([freshTab]);
      setActiveTabId(freshTab.id);
    } else {
      setTabs(remaining);
      if (activeTabId === tabId) {
        setActiveTabId(remaining[0].id);
      }
    }
  };

  // Chuyển đổi tab và đồng bộ kho hàng theo tab đang chọn
  const handleSwitchTab = async (tabId: string) => {
    setActiveTabId(tabId);
    const targetTab = tabs.find((t) => t.id === tabId);
    if (targetTab && targetTab.warehouseId && targetTab.warehouseId !== selectedWarehouseId) {
      setSelectedWarehouseId(targetTab.warehouseId);
      try {
        const updatedProds = await posService.getProducts(undefined, selectedCategoryId || undefined, targetTab.warehouseId);
        setProducts(updatedProds);
      } catch (err) {
        console.error('Lỗi khi đổi kho theo tab:', err);
      }
    }
  };

  // 4. Xử lý thanh toán và tạo đơn (Đồng bộ validation với Backend)
  const handleSubmitPayment = async (type: 'PAY_AND_PRINT' | 'STOCK_ISSUE_ONLY' | 'DRAFT') => {
    if (!currentTab || currentTab.items.length === 0) {
      message.warning('Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán (AMT-001).');
      return;
    }

    const subTotal = currentTab.items.reduce((sum, item) => sum + item.total, 0);
    const discount = Math.min(subTotal, Math.max(0, currentTab.discountAmount || 0));
    const finalTotal = Math.max(0, subTotal - discount);
    const isCompleted = type !== 'DRAFT';

    // 4.1. Kiểm tra số lượng hợp lệ (POS-005, POS-006)
    const invalidQtyItem = currentTab.items.find((i) => !i.quantity || i.quantity <= 0);
    if (invalidQtyItem) {
      Modal.error({
        title: 'Số lượng sản phẩm không hợp lệ',
        content: `Sản phẩm "${invalidQtyItem.name}" có số lượng không hợp lệ. Vui lòng nhập số lượng lớn hơn 0 (POS-005).`,
      });
      return;
    }

    // 4.2. Kiểm tra tồn kho trước khi thanh toán hoàn tất (POS-014, INV-006, Group B1)
    if (isCompleted && !orderSettings?.allowNegativeStockSale) {
      const outOfStockItems = currentTab.items.filter((i) => i.quantity > i.stockQuantity);
      if (outOfStockItems.length > 0) {
        const itemNames = outOfStockItems
          .map((i) => `"${i.name}" (Tồn hiện tại: ${i.stockQuantity}, Yêu cầu: ${i.quantity})`)
          .join('\n- ');
        Modal.error({
          title: 'Không đủ tồn kho xuất bán (POS-014, INV-006)',
          content: (
            <div className="text-xs space-y-1">
              <p>Các sản phẩm sau không đủ tồn kho tại <strong>{currentTab.warehouseName}</strong>:</p>
              <pre className="p-2 bg-slate-50 border rounded text-[11px] whitespace-pre-wrap font-sans text-rose-700">
                - {itemNames}
              </pre>
              <p className="text-slate-500">Vui lòng giảm số lượng hoặc chuyển sang kho xuất khác.</p>
            </div>
          ),
        });
        return;
      }
    }

    // 4.3. Kiểm tra công nợ và khách hàng (CUS-007 -> CUS-009, PAY-009)
    const prepaid = Math.max(0, currentTab.prepaidAmount || 0);
    const actualPaid = Math.min(prepaid, finalTotal);
    const remainingDebt = Math.max(0, finalTotal - actualPaid);

    if (isCompleted && remainingDebt > 0) {
      const cust = currentTab.selectedCustomer;
      const isWalkIn = !cust || cust.code === 'KH00000' || cust.name.includes('Khách lẻ');

      if (isWalkIn) {
        Modal.warning({
          title: 'Khách lẻ không được ghi nợ (PAY-009)',
          content: 'Khách lẻ tại quầy bắt buộc phải thanh toán đủ 100% bằng Tiền mặt, VietQR hoặc Thẻ POS.',
        });
        return;
      }

      const creditLimit = cust.creditLimit || 0;
      const currentDebt = cust.currentDebt || 0;

      if (creditLimit <= 0) {
        Modal.error({
          title: 'Khách hàng chưa được cấp hạn mức tín dụng (CUS-007)',
          content: `Khách hàng "${cust.name}" chưa được cấp hạn mức tín dụng (Hạn mức: 0 đ). Vui lòng thanh toán đủ trước khi xuất bán.`,
        });
        return;
      }

      if (currentDebt + remainingDebt > creditLimit) {
        const excess = currentDebt + remainingDebt - creditLimit;
        Modal.error({
          title: 'Vượt hạn mức tín dụng (CUS-009)',
          content: `Khoản nợ phát sinh ${new Intl.NumberFormat('vi-VN').format(remainingDebt)} đ khiến khách hàng vượt quá hạn mức tín dụng cho phép ${new Intl.NumberFormat('vi-VN').format(excess)} đ. (Hạn mức: ${new Intl.NumberFormat('vi-VN').format(creditLimit)} đ, Dư nợ: ${new Intl.NumberFormat('vi-VN').format(currentDebt)} đ).`,
        });
        return;
      }
    }

    const executePayment = async () => {
      try {
        setIsSubmitting(true);
        const isDraft = type === 'DRAFT';
        const clientRequestId = `${currentTab.id}-${Date.now()}`;
        const result = await posService.createPosOrder(
          currentTab,
          isDraft ? 'DRAFT' : 'COMPLETED',
          clientRequestId
        );

        const generatedCode = result?.orderCode || `HD${Math.floor(10000 + Math.random() * 90000)}`;
        setLastOrderCode(generatedCode);

        if (isDraft) {
          message.success(`Đã lưu tạm đơn hàng ${generatedCode}`);
          updateCurrentTab((t) => ({ ...t, status: 'WAITING' }));
        } else {
          message.success(`Thanh toán thành công đơn hàng ${generatedCode}!`);

          // Lưu bản chụp chi tiết hóa đơn trước khi dọn giỏ hàng
          setPrintOrderData({
            ...currentTab,
            code: generatedCode,
            items: [...currentTab.items],
          });

          if (type === 'PAY_AND_PRINT' || currentTab.autoPrintK80) {
            setPrintModalOpen(true);
          }

          // Đánh dấu đơn hoàn thành và làm mới giỏ hàng
          updateCurrentTab((t) => ({
            ...t,
            status: 'COMPLETED',
            items: [],
            prepaidAmount: 0,
            discountAmount: 0,
          }));

          // Làm mới số lượng tồn kho sau khi xuất bán thành công
          try {
            const freshProds = await posService.getProducts(undefined, selectedCategoryId || undefined, currentTab.warehouseId);
            setProducts(freshProds);
          } catch (e) {
            console.warn('Lỗi làm mới tồn kho:', e);
          }
        }
      } catch (err: any) {
        console.error('Lỗi khi thanh toán đơn hàng:', err);
        const errorMsg =
          err.response?.data?.message ||
          err.response?.data?.title ||
          err.message ||
          'Không thể tạo đơn hàng POS. Vui lòng kiểm tra lại!';
        Modal.error({
          title: 'Lỗi tạo đơn hàng POS',
          content: errorMsg,
        });
      } finally {
        setIsSubmitting(false);
      }
    };

    // Group B3: Hộp thoại xác nhận trước khi hoàn tất giao dịch POS
    if (isCompleted && orderSettings?.confirmBeforeCompleteOrder) {
      Modal.confirm({
        title: 'Xác nhận hoàn tất đơn hàng',
        content: (
          <div className="text-xs space-y-2 py-2">
            <p className="text-slate-600">Vui lòng kiểm tra lại thông tin trước khi hoàn tất giao dịch và xuất kho:</p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 font-sans">
              <div className="flex justify-between">
                <span className="text-slate-500">Kho xuất hàng:</span>
                <span className="font-semibold text-slate-800">{currentTab.warehouseName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khách hàng:</span>
                <span className="font-semibold text-slate-800">{currentTab.selectedCustomer?.name || 'Khách lẻ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Số lượng mặt hàng:</span>
                <span className="font-semibold text-slate-800">
                  {currentTab.items.length} sản phẩm ({currentTab.items.reduce((s, i) => s + i.quantity, 0)} cái)
                </span>
              </div>
              <div className="border-t border-slate-200 my-1"></div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng tiền hàng:</span>
                <span className="font-bold text-slate-900">
                  {new Intl.NumberFormat('vi-VN').format(finalTotal)} đ
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Khách thanh toán:</span>
                <span className="font-bold text-emerald-600">
                  {new Intl.NumberFormat('vi-VN').format(actualPaid)} đ ({currentTab.paymentMethod})
                </span>
              </div>
              {remainingDebt > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Ghi nhận công nợ:</span>
                  <span className="font-bold text-rose-600">
                    {new Intl.NumberFormat('vi-VN').format(remainingDebt)} đ
                  </span>
                </div>
              )}
            </div>
          </div>
        ),
        okText: 'Xác nhận & Hoàn tất',
        cancelText: 'Quay lại kiểm tra',
        okButtonProps: { className: 'bg-[#1E56A0] hover:bg-[#16437E]' },
        onOk: async () => {
          await executePayment();
        },
      });
      return;
    }

    await executePayment();
  };

  // Group B2: In bảng báo giá tạm tính cho khách hàng
  const handlePrintQuotation = () => {
    if (!currentTab || currentTab.items.length === 0) {
      message.warning('Vui lòng thêm sản phẩm vào giỏ trước khi in báo giá.');
      return;
    }
    const quoteCode = `BG-${Date.now().toString().slice(-6)}`;
    setLastOrderCode(quoteCode);
    setPrintOrderData({
      ...currentTab,
      code: quoteCode,
      items: [...currentTab.items],
    });
    setPrintModalOpen(true);
  };

  // Mở xem trước hóa đơn bán hàng Tín Phát
  const handleOpenReceiptPreview = () => {
    if (!currentTab || currentTab.items.length === 0) {
      message.warning('Vui lòng thêm sản phẩm vào giỏ trước khi xem hóa đơn.');
      return;
    }
    setLastOrderCode(currentTab.code || lastOrderCode);
    setPrintOrderData({
      ...currentTab,
      items: [...currentTab.items],
    });
    setPrintModalOpen(true);
  };

  // 5. Quản lý phím tắt toàn màn hình (F1, F2, F3, F4, F7, F8, F9, F10)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        handleAddTab();
      } else if (e.key === 'F2') {
        e.preventDefault();
        customerSearchRef.current?.focus();
      } else if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F4') {
        e.preventDefault();
        customerSearchRef.current?.focus();
      } else if (e.key === 'F7') {
        e.preventDefault();
        handleClearCart();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleSubmitPayment('DRAFT');
      } else if (e.key === 'F10') {
        e.preventDefault();
        handleSubmitPayment('PAY_AND_PRINT');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTab, tabs]);

  if (!currentTab) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100 text-slate-500">
        Đang khởi động hệ thống StockFlow POS...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F3F4F6] overflow-hidden">
      {/* ─── VÙNG A: Thanh điều hướng phía trên (Có chọn Chi nhánh / Kho) ─── */}
      <PosHeader
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={handleSwitchTab}
        onAddTab={handleAddTab}
        onCloseTab={handleCloseTab}
        autoPrintK80={currentTab.autoPrintK80}
        onToggleAutoPrint={(val) => updateCurrentTab((t) => ({ ...t, autoPrintK80: val }))}
        onOpenHistory={() => message.info('Mở lịch sử các đơn hàng POS gần đây')}
        onOpenShiftClose={() => message.info('Mở tính năng kết ca và chốt tiền mặt thu ngân')}
        warehouses={warehouses}
        selectedWarehouseId={selectedWarehouseId}
        onSelectWarehouse={handleSelectWarehouse}
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
            currentPriceBookId={currentTab.priceBookId}
            priceMatrix={priceMatrix}
          />

          {/* Bảng chi tiết đơn hàng */}
          <div className="flex-1 overflow-y-auto min-h-0 pr-0.5">
            <PosCartTable
              items={currentTab.items}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onUpdateItemDiscount={handleUpdateItemDiscount}
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

        {/* ─── VÙNG C: Khu vực Khách hàng, Bảng giá bán (Ngang hàng với tìm khách +), Tổng tiền và Thanh toán (Bên phải 34%) ─── */}
        <aside className="w-[380px] xl:w-[420px] shrink-0 h-full overflow-y-auto no-scrollbar">
          <PosPaymentPanel
            order={currentTab}
            allCustomers={customers}
            priceBooks={priceBooks}
            onSelectCustomer={handleSelectCustomer}
            onOpenAddCustomerModal={() => setAddCustomerModalOpen(true)}
            onChangePriceBook={handleChangePriceBook}
            onChangePaymentMethod={(pm) => updateCurrentTab((t) => ({ ...t, paymentMethod: pm }))}
            onChangePrepaidAmount={(amt) => updateCurrentTab((t) => ({ ...t, prepaidAmount: amt }))}
            onChangeDiscountAmount={(amt) => updateCurrentTab((t) => ({ ...t, discountAmount: amt }))}
            onChangeOrderDiscount={(type, val, amt) => updateCurrentTab((t) => ({ ...t, discountType: type, discountValue: val, discountAmount: amt }))}
            onSubmitPayment={handleSubmitPayment}
            onOpenReceiptPreview={handleOpenReceiptPreview}
            onPrintQuotation={handlePrintQuotation}
            enablePrintQuotation={orderSettings?.enablePrintQuotation ?? true}
            allowNegativeStockSale={orderSettings?.allowNegativeStockSale ?? false}
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
        currentPriceBookId={currentTab.priceBookId}
        priceMatrix={priceMatrix}
      />

      {/* Modal Xem trước & In hóa đơn K80 nhiệt */}
      <ReceiptPrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        order={printOrderData || currentTab}
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
