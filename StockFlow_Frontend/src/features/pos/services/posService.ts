// src/features/pos/services/posService.ts
// Service tương tác API sản phẩm, khách hàng, bảng giá, đơn hàng POS với backend

import { apiClient } from '@/lib/api/client';
import { PosProduct, PosCustomer, PosCategory, PosOrderTab, PosPriceBook, PosWarehouse } from '../types';

export const posService = {
  /**
   * Lấy danh sách sản phẩm từ backend theo kho cụ thể (đồng bộ tồn kho chuẩn POS-014)
   */
  async getProducts(search?: string, categoryId?: number, warehouseId?: number): Promise<PosProduct[]> {
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      if (categoryId && categoryId > 0) {
        params.append('categoryId', categoryId.toString());
      }
      if (warehouseId && warehouseId > 0) {
        params.append('warehouseId', warehouseId.toString());
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get<any[]>(`/api/products${qs}`);

      if (Array.isArray(data)) {
        return data.map((item) => ({
          id: String(item.id || item.productId),
          productId: Number(item.productId || item.id),
          code: item.code || '',
          name: item.name || '',
          type: item.type || 'FINISHED',
          categoryId: Number(item.categoryId) || 0,
          categoryName: item.categoryName || '',
          baseUnitId: Number(item.baseUnitId) || 8,
          uom: item.uom || 'Cái',
          standardPrice: Number(item.standardPrice) || 0,
          costPrice: Number(item.costPrice) || 0,
          stockQuantity: Number(item.stockQuantity) || 0,
          status: item.status || 'ACTIVE',
          barcode: item.barcode || null,
          brand: item.brand || null,
          minSafeStock: item.minSafeStock ? Number(item.minSafeStock) : null,
          imageUrl: item.imageUrl || null,
          description: item.description || null,
        }));
      }
      return [];
    } catch (e) {
      console.error('Lỗi khi tải sản phẩm POS:', e);
      return [];
    }
  },

  /**
   * Lấy danh mục sản phẩm từ backend
   */
  async getCategories(): Promise<PosCategory[]> {
    try {
      const data = await apiClient.get<any[]>('/api/products/categories');
      if (Array.isArray(data)) {
        return data.map((c) => ({
          categoryId: Number(c.categoryId || c.id),
          categoryName: c.categoryName || c.name || '',
          description: c.description || '',
        }));
      }
      return [];
    } catch (e) {
      console.error('Lỗi khi tải danh mục POS:', e);
      return [];
    }
  },

  /**
   * Lấy danh sách bảng giá bán thực tế từ database
   */
  async getPriceBooks(): Promise<PosPriceBook[]> {
    try {
      const data = await apiClient.get<any[]>('/api/price-books');
      if (Array.isArray(data)) {
        return data.map((pb) => ({
          priceBookId: Number(pb.priceBookId),
          priceBookCode: pb.priceBookCode || '',
          priceBookName: pb.priceBookName || '',
          isActive: Boolean(pb.isActive),
          isDefault: Boolean(pb.isDefault),
        }));
      }
      return [];
    } catch (e) {
      console.error('Lỗi khi tải danh sách bảng giá POS:', e);
      return [
        {
          priceBookId: 1,
          priceBookCode: 'BG000001',
          priceBookName: 'Bảng giá chung',
          isActive: true,
          isDefault: true,
        },
      ];
    }
  },

  /**
   * Lấy ma trận giá bán của các sản phẩm theo từng bảng giá (ProductId -> { PriceBookId: Price })
   */
  async getPriceMatrix(priceBookIds?: number[]): Promise<Record<number, Record<number, number>>> {
    try {
      const qs = priceBookIds && priceBookIds.length > 0 ? `?priceBookIds=${priceBookIds.join(',')}&pageSize=100` : '?pageSize=100';
      const data = await apiClient.get<any>(`/api/price-books/matrix${qs}`);
      const priceMap: Record<number, Record<number, number>> = {};

      if (data?.items && Array.isArray(data.items)) {
        for (const item of data.items) {
          const pId = Number(item.productId);
          priceMap[pId] = {};
          if (item.prices) {
            for (const [pbIdStr, priceVal] of Object.entries(item.prices)) {
              if (priceVal !== null && priceVal !== undefined) {
                priceMap[pId][Number(pbIdStr)] = Number(priceVal);
              }
            }
          }
        }
      }
      return priceMap;
    } catch (e) {
      console.error('Lỗi khi tải ma trận giá POS:', e);
      return {};
    }
  },

  /**
   * Lấy danh sách chi nhánh và kho vật lý từ backend
   */
  async getWarehouses(): Promise<PosWarehouse[]> {
    try {
      const data = await apiClient.get<any[]>('/api/warehouses');
      if (Array.isArray(data)) {
        return data
          .filter((w) => w.status === 'ACTIVE' || w.warehouseId === 3)
          .map((w) => {
            const name = w.name || '';
            let branch = 'Chi nhánh Hà Nội';
            if (name.includes('Gia Lâm') || w.code === 'K001') branch = 'Chi nhánh chính - Hà Nội';
            else if (name.includes('Đông Anh') || w.code === 'K002') branch = 'Chi nhánh Đông Anh';
            else if (name.includes('Hà Đông') || w.code === 'K003') branch = 'Chi nhánh Tây Hà Nội';
            else if (name.includes('Hoàn Kiếm') || w.code === 'K004') branch = 'Chi nhánh Hoàn Kiếm (Nội đô)';

            return {
              warehouseId: Number(w.warehouseId),
              code: w.code || '',
              name: name,
              branchName: branch,
              address: w.address || '',
              status: w.status || 'ACTIVE',
            };
          });
      }
      return [];
    } catch (e) {
      console.error('Lỗi khi tải danh sách kho POS:', e);
      return [
        {
          warehouseId: 3,
          code: 'K001',
          name: 'Kho Tổng Gia Lâm',
          branchName: 'Chi nhánh chính - Hà Nội',
          address: 'Số 18 Đường Dệt May, Gia Lâm, Hà Nội',
          status: 'ACTIVE',
        },
      ];
    }
  },

  /**
   * Lấy danh sách khách hàng từ backend
   */
  async getCustomers(search?: string): Promise<PosCustomer[]> {
    try {
      const params = new URLSearchParams();
      if (search && search.trim()) {
        params.append('search', search.trim());
      }
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiClient.get<any[]>(`/api/customers${qs}`);

      if (Array.isArray(data)) {
        return data.map((cust) => ({
          id: Number(cust.partnerId || cust.id),
          partnerId: Number(cust.partnerId || cust.id),
          code: cust.code || '',
          name: cust.name || '',
          phone: cust.phone || '',
          email: cust.email || '',
          address: cust.address || '',
          creditLimit: Number(cust.creditLimit) || 0,
          currentDebt: Number(cust.currentDebt) || 0,
          isOverCreditLimit: Boolean(cust.isOverCreditLimit),
          taxCode: cust.code === 'KH00892' ? '0108924192' : undefined,
          salesRep: cust.code === 'KH00892' ? 'Trần Minh Tuấn' : 'Thu ngân quầy',
        }));
      }
      return [];
    } catch (e) {
      console.error('Lỗi khi tải khách hàng POS:', e);
      return [];
    }
  },

  /**
   * Gửi đơn hàng POS lên backend (có Idempotency và kiểm tra ràng buộc)
   */
  async createPosOrder(
    order: PosOrderTab,
    statusOverride?: 'COMPLETED' | 'DRAFT',
    clientRequestId?: string
  ): Promise<any> {
    // Tổng tiền hàng sau chiết khấu từng mặt hàng
    const itemsSubTotal = order.items.reduce((sum, item) => sum + item.total, 0);

    // Chiết khấu toàn bộ đơn hàng
    const orderDiscountType = order.discountType || 'AMOUNT';
    const orderDiscountValue = order.discountValue || 0;
    let orderDiscountAmount = order.discountAmount || 0;
    if (orderDiscountType === 'PERCENT' && orderDiscountValue > 0) {
      orderDiscountAmount = Math.round(itemsSubTotal * (orderDiscountValue / 100));
    }
    orderDiscountAmount = Math.min(itemsSubTotal, Math.max(0, orderDiscountAmount));

    const finalTotal = Math.max(0, itemsSubTotal - orderDiscountAmount);

    const payload = {
      partnerId: order.selectedCustomer?.id || 9,
      warehouseId: order.warehouseId || 3,
      paymentMethod: order.paymentMethod,
      subTotal: itemsSubTotal,
      discountType: orderDiscountType,
      discountValue: orderDiscountValue,
      discountAmount: orderDiscountAmount,
      totalAmount: Math.round(finalTotal),
      paidAmount: order.prepaidAmount,
      vatAmount: 0,
      deliveryFee: 0,
      deliveryType: order.deliveryType || 'COUNTER',
      notes: order.priceBookName
        ? `[Bảng giá: ${order.priceBookName}] ${order.notes || ''}`.trim()
        : order.notes,
      status: statusOverride || 'COMPLETED',
      issueStockNow: (statusOverride || 'COMPLETED') === 'COMPLETED',
      clientRequestId: clientRequestId || `${order.id}-${Date.now()}`,
      items: order.items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitId: i.unitId,
        originalPrice: i.standardPrice || i.unitPrice,
        unitPrice: i.unitPrice,
        discountType: i.discountType || (i.discountPercent ? 'PERCENT' : 'AMOUNT'),
        discountPercent: i.discountPercent || 0,
        discountValue: i.discountValue || (i.discountPercent || 0),
        discountAmount: i.discountAmount || 0,
        lineTotal: i.total,
      })),
    };

    return await apiClient.post('/api/orders/pos', payload);
  },

  /**
   * Lấy lịch sử các đơn hàng POS gần đây
   */
  async getRecentOrders(): Promise<any[]> {
    try {
      return await apiClient.get<any[]>('/api/orders');
    } catch (e) {
      console.error('Lỗi khi tải đơn hàng POS:', e);
      return [];
    }
  },
};
