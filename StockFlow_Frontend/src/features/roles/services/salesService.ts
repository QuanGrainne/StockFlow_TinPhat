// src/services/salesService.ts
// Service xử lý API cho phân hệ Sales (sẵn sàng tích hợp NestJS / REST Backend)

import {
  PendingOrder,
  CreditLimitRequest,
  Customer,
  Product,
  ConsolidateOrdersPayload,
  ReturnClaim,
} from '../types';
import {
  INITIAL_CUSTOMERS,
  INITIAL_PRODUCTS,
  INITIAL_PENDING_ORDERS,
  INITIAL_CREDIT_REQUESTS,
  INITIAL_RETURN_CLAIMS,
} from '../data/mockData';

// In-memory data store for live simulation
let customers = [...INITIAL_CUSTOMERS];
let products = [...INITIAL_PRODUCTS];
let pendingOrders = [...INITIAL_PENDING_ORDERS];
let creditRequests = [...INITIAL_CREDIT_REQUESTS];
let returnClaims = [...INITIAL_RETURN_CLAIMS];

export const salesService = {
  // ─── Master Data for Sales ───────────────────────────────────────────────
  async getCustomers(): Promise<Customer[]> {
    // Giả lập latency 150ms như khi gọi NestJS /customers
    await new Promise((resolve) => setTimeout(resolve, 150));
    return [...customers];
  },

  async getProducts(): Promise<Product[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return [...products];
  },

  // ─── Pending Orders (Đơn hàng chờ xử lý) ──────────────────────────────────
  async getPendingOrders(search?: string, status?: string): Promise<PendingOrder[]> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    let result = [...pendingOrders];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (o) =>
          o.orderCode.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q)
      );
    }

    if (status && status !== 'ALL') {
      result = result.filter((o) => o.status === status);
    }

    return result;
  },

  async createPendingOrder(
    payload: Omit<PendingOrder, 'id' | 'orderCode' | 'status' | 'remainingAmount'>
  ): Promise<PendingOrder> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newCode = `SO-2026-${String(pendingOrders.length + 1).padStart(3, '0')}`;
    const remainingAmount = payload.totalAmount - payload.paidAmount;

    const newOrder: PendingOrder = {
      ...payload,
      id: `ORD-${Date.now()}`,
      orderCode: newCode,
      status: 'PENDING',
      remainingAmount,
    };

    pendingOrders = [newOrder, ...pendingOrders];
    return newOrder;
  },

  async updatePendingOrder(
    orderId: string,
    payload: Partial<PendingOrder>
  ): Promise<PendingOrder> {
    await new Promise((resolve) => setTimeout(resolve, 250));

    const index = pendingOrders.findIndex((o) => o.id === orderId);
    if (index === -1) throw new Error('Không tìm thấy đơn hàng cần cập nhật');

    const updated = {
      ...pendingOrders[index],
      ...payload,
      remainingAmount:
        (payload.totalAmount ?? pendingOrders[index].totalAmount) -
        (payload.paidAmount ?? pendingOrders[index].paidAmount),
    };

    pendingOrders[index] = updated;
    return updated;
  },

  async cancelPendingOrder(orderId: string): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const order = pendingOrders.find((o) => o.id === orderId);
    if (order) {
      order.status = 'CANCELLED';
      return true;
    }
    return false;
  },

  // ─── Consolidate Orders (Gộp đơn hàng xuất kho) ──────────────────────────
  async consolidateOrders(payload: ConsolidateOrdersPayload): Promise<{
    success: boolean;
    issueNoteCode: string;
    message: string;
  }> {
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Kiểm tra các đơn có thuộc cùng khách hàng không
    const selectedOrders = pendingOrders.filter((o) =>
      payload.selectedOrderIds.includes(o.id)
    );

    const hasDifferentCustomer = selectedOrders.some(
      (o) => o.customerId !== payload.customerId
    );
    if (hasDifferentCustomer) {
      throw new Error('Các đơn hàng được chọn phải thuộc về cùng một khách hàng!');
    }

    // Kiểm tra nợ và hạn mức tín dụng của khách hàng
    const customer = customers.find((c) => c.id === payload.customerId);
    if (!customer) throw new Error('Khách hàng không tồn tại');

    const totalOrderAmount = selectedOrders.reduce(
      (sum, o) => sum + o.remainingAmount,
      0
    );
    const expectedDebt = customer.currentDebt + totalOrderAmount;

    if (expectedDebt > customer.creditLimit) {
      throw new Error(
        `Vượt hạn mức tín dụng! Nợ hiện tại (${customer.currentDebt.toLocaleString()} đ) + Đơn mới (${totalOrderAmount.toLocaleString()} đ) = ${expectedDebt.toLocaleString()} đ > Hạn mức (${customer.creditLimit.toLocaleString()} đ). Vui lòng gửi yêu cầu duyệt tăng hạn mức!`
      );
    }

    // Đánh dấu các đơn là CONSOLIDATED
    selectedOrders.forEach((o) => {
      o.status = 'CONSOLIDATED';
    });

    // Cập nhật nợ tạm tính của khách hàng
    customer.currentDebt = expectedDebt;

    const issueNoteCode = `GDN-2026-${String(Date.now()).slice(-4)}`;
    return {
      success: true,
      issueNoteCode,
      message: `Gộp ${selectedOrders.length} đơn hàng thành công! Đã tạo Phiếu yêu cầu xuất kho ${issueNoteCode}.`,
    };
  },

  // ─── Credit Limit Request (Xin tăng hạn mức nợ) ──────────────────────────
  async getCreditLimitRequests(): Promise<CreditLimitRequest[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return [...creditRequests];
  },

  async createCreditLimitRequest(payload: {
    customerId: string;
    requestedCreditLimit: number;
    pendingOrderCode: string;
    reason: string;
    requestedBy: string;
  }): Promise<CreditLimitRequest> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const customer = customers.find((c) => c.id === payload.customerId);
    if (!customer) throw new Error('Khách hàng không tồn tại');

    const newCode = `CLR-2026-${String(creditRequests.length + 1).padStart(3, '0')}`;
    const newReq: CreditLimitRequest = {
      id: `CLR-${Date.now()}`,
      requestCode: newCode,
      customerId: customer.id,
      customerName: customer.name,
      currentDebt: customer.currentDebt,
      currentCreditLimit: customer.creditLimit,
      requestedCreditLimit: payload.requestedCreditLimit,
      pendingOrderCode: payload.pendingOrderCode,
      expectedNewDebt: customer.currentDebt + 50000000,
      reason: payload.reason,
      status: 'PENDING',
      requestedBy: payload.requestedBy,
      requestedAt: new Date().toLocaleString('vi-VN'),
    };

    creditRequests = [newReq, ...creditRequests];
    return newReq;
  },

  // ─── Return Claims (Quản lý hàng trả lại) ─────────────────────────────────
  async getReturnClaims(search?: string, status?: string): Promise<ReturnClaim[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    let result = [...returnClaims];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.claimCode.toLowerCase().includes(q) ||
          c.pxkCode.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q)
      );
    }

    if (status && status !== 'ALL') {
      result = result.filter((c) => c.qcStatus === status);
    }

    return result;
  },

  async createReturnClaim(
    payload: Omit<ReturnClaim, 'id' | 'claimCode' | 'submittedAt' | 'qcStatus'>
  ): Promise<ReturnClaim> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const newCode = `YCTH-2026-${String(returnClaims.length + 1).padStart(3, '0')}`;
    const newClaim: ReturnClaim = {
      ...payload,
      id: `RC-${Date.now()}`,
      claimCode: newCode,
      qcStatus: 'CHO_KIEM_TRA',
      submittedAt: new Date().toLocaleString('vi-VN'),
    };
    returnClaims = [newClaim, ...returnClaims];
    return newClaim;
  },
};
