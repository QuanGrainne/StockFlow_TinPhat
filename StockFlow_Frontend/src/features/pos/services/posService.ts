// src/features/pos/services/posService.ts
// Service tương tác API sản phẩm, khách hàng, bảng giá, đơn hàng POS với backend

import { apiClient } from '@/lib/api/client';
import { PosProduct, PosCustomer, PosCategory, PosPriceBook } from '../types';
import { parseSaleUnits } from '@/lib/products/saleUnits';

export interface OrderFilterParams {
  search?: string;
  status?: string;
  warehouseId?: number;
  fromDate?: string;
  toDate?: string;
  returnStatus?: string;
  paymentMethod?: string;
  priceBookName?: string;
  page?: number;
  pageSize?: number;
}

/** Dữ liệu gửi khi thanh toán 1 hóa đơn POS (POST /api/orders/pos) */
export interface PosSaleRequest {
  /** 0 = Khách lẻ */
  partnerId: number;
  warehouseId: number;
  paymentMethod: 'CASH' | 'VIETQR';
  subTotal: number;
  discountType: 'AMOUNT' | 'PERCENT';
  discountValue: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  notes?: string;
  clientRequestId: string;
  /** Thời gian bán (ISO); bỏ trống = giờ hiện tại. Không được ở tương lai. */
  orderDate?: string;
  /** Hóa đơn giao hàng tạo từ đơn đặt hàng: server trừ tiền khách đã trả trước của đơn */
  bookingOrderId?: number;
  /** Hóa đơn từ đơn, khách lấy thiếu: true = tạo đơn đặt mới (Phiếu tạm) cho phần còn lại */
  createRemainderBooking?: boolean;
  /** Tiền khách trả thừa: RETURN_CASH = trả lại khách; RECORD_DEBT = trừ vào nợ cũ của khách */
  excessAction?: 'RETURN_CASH' | 'RECORD_DEBT';
  items: {
    productId: number;
    /** Số lượng theo đơn vị bán */
    quantity: number;
    unitId: number;
    /** Đơn vị bán (bán theo đơn vị quy đổi); trống = đơn vị cơ bản */
    unitName?: string;
    /** Đơn giá (theo bảng giá) */
    originalPrice: number;
    /** Giá bán sau giảm giá dòng */
    unitPrice: number;
    discountType: 'AMOUNT' | 'PERCENT';
    /** Giảm trên 1 đơn vị: VNĐ hoặc % */
    discountValue: number;
    discountAmount: number;
  }[];
}

export interface PosSaleResult {
  orderId: number;
  orderCode: string;
  totalAmount: number;
  paidAmount: number;
  changeAmount: number;
  outstandingAmount: number;
  /** Tiền trả trước của đơn đặt hàng đã trừ vào hóa đơn */
  depositAmount?: number;
  /** Đơn đặt mới tạo cho phần khách chưa lấy */
  remainderBookingId?: number | null;
  remainderBookingCode?: string | null;
  /** Tiền thừa đã trừ vào nợ cũ (Tính vào công nợ) và dư nợ khách sau thanh toán */
  debtPaymentAmount?: number;
  customerCurrentDebt?: number;
  message?: string;
}

export const posService = {
  /** Thanh toán hóa đơn POS: trừ tồn, ghi thẻ kho, công nợ, phiếu thu */
  submitSale(req: PosSaleRequest): Promise<PosSaleResult> {
    return apiClient.post<PosSaleResult>('/api/orders/pos', {
      ...req,
      excessAction: req.excessAction ?? 'RETURN_CASH',
      vatAmount: 0,
      deliveryFee: 0,
      deliveryType: 'COUNTER',
      status: 'COMPLETED',
      issueStockNow: true,
    });
  },

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
          units: parseSaleUnits(item.variantsJson, item.uom || 'Cái', item.code || ''),
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
   * Danh sách bảng giá từ database.
   * forSale = true: chỉ bảng giá dùng được lúc này cho chi nhánh + khách (đang áp dụng, trong hiệu lực, đúng phạm vi);
   * bảng giá chung luôn có. Lỗi thì trả rỗng (không dùng dữ liệu giả).
   */
  async getPriceBooks(params?: { warehouseId?: number; customerId?: number; forSale?: boolean }): Promise<PosPriceBook[]> {
    type PriceBookApi = {
      priceBookId: number;
      priceBookCode: string | null;
      priceBookName: string | null;
      isActive: boolean;
      isDefault: boolean;
      scopeCustomerType: string | null;
      scopeCustomerIds: number[] | null;
    };
    const qs = new URLSearchParams();
    if (params?.forSale) qs.set('forSale', 'true');
    if (params?.warehouseId) qs.set('warehouseId', String(params.warehouseId));
    if (params?.customerId) qs.set('customerId', String(params.customerId));
    try {
      const data = await apiClient.get<PriceBookApi[]>(`/api/price-books${qs.toString() ? `?${qs.toString()}` : ''}`);
      return (Array.isArray(data) ? data : []).map((pb) => ({
        priceBookId: Number(pb.priceBookId),
        priceBookCode: pb.priceBookCode || '',
        priceBookName: pb.priceBookName || '',
        isActive: Boolean(pb.isActive),
        isDefault: Boolean(pb.isDefault),
        scopeCustomerType: pb.scopeCustomerType === 'SPECIFIC' ? 'SPECIFIC' : 'ALL',
        scopeCustomerIds: Array.isArray(pb.scopeCustomerIds) ? pb.scopeCustomerIds : [],
      }));
    } catch {
      return [];
    }
  },

  /**
   * Ma trận giá bán: productId → { priceBookId: giá } của mọi bảng giá đang chọn (mặc định: mọi bảng giá đang hoạt động).
   * allProducts=true: lấy cả hàng chưa thêm vào bảng giá tự tạo; tải đủ các trang (API tối đa 100 hàng/trang).
   */
  async getPriceMatrix(priceBookIds?: number[]): Promise<Record<number, Record<number, number>>> {
    type MatrixPage = { items?: { productId: number; prices?: Record<string, number | null> }[]; totalCount?: number };
    try {
      const ids = priceBookIds && priceBookIds.length > 0
        ? priceBookIds
        : (await this.getPriceBooks()).filter((b) => b.isActive).map((b) => b.priceBookId);
      const pageSize = 100;
      const fetchPage = (page: number) => {
        const qs = new URLSearchParams({ pageSize: String(pageSize), page: String(page), allProducts: 'true' });
        if (ids.length > 0) qs.set('priceBookIds', ids.join(','));
        return apiClient.get<MatrixPage>(`/api/price-books/matrix?${qs.toString()}`);
      };
      const first = await fetchPage(1);
      const pages = Math.ceil((first.totalCount ?? 0) / pageSize);
      const rest = pages > 1 ? await Promise.all(Array.from({ length: pages - 1 }, (_, i) => fetchPage(i + 2))) : [];

      const priceMap: Record<number, Record<number, number>> = {};
      for (const data of [first, ...rest]) {
        for (const item of data.items ?? []) {
          const pId = Number(item.productId);
          priceMap[pId] = priceMap[pId] ?? {};
          for (const [pbIdStr, priceVal] of Object.entries(item.prices ?? {})) {
            if (priceVal !== null && priceVal !== undefined) priceMap[pId][Number(pbIdStr)] = Number(priceVal);
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
          debtWarning: cust.debtWarning ?? null,
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
   * Lấy lịch sử các đơn hàng POS (hỗ trợ đầy đủ bộ lọc và phân trang)
   */
  async getRecentOrders(params?: OrderFilterParams): Promise<any> {
    try {
      const sp = new URLSearchParams();
      if (params?.search && params.search.trim()) sp.append('search', params.search.trim());
      if (params?.status && params.status !== 'ALL') sp.append('status', params.status);
      if (params?.warehouseId && params.warehouseId > 0) sp.append('warehouseId', params.warehouseId.toString());
      if (params?.fromDate) sp.append('fromDate', params.fromDate);
      if (params?.toDate) sp.append('toDate', params.toDate);
      if (params?.returnStatus && params.returnStatus !== 'ALL') sp.append('returnStatus', params.returnStatus);
      if (params?.paymentMethod && params.paymentMethod !== 'ALL') sp.append('paymentMethod', params.paymentMethod);
      if (params?.priceBookName && params.priceBookName !== 'ALL') sp.append('priceBookName', params.priceBookName);
      if (params?.page) sp.append('page', params.page.toString());
      if (params?.pageSize) sp.append('pageSize', params.pageSize.toString());

      const qs = sp.toString() ? `?${sp.toString()}` : '';
      return await apiClient.get<any>(`/api/orders${qs}`);
    } catch (e) {
      console.error('Lỗi khi tải đơn hàng POS:', e);
      return { items: [], totalCount: 0 };
    }
  },
};
