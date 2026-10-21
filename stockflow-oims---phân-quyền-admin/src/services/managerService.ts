// src/services/managerService.ts
// Service xử lý API cho phân hệ Manager (sẵn sàng tích hợp NestJS / REST Backend)

import {
  BomFormula,
  ProductionOrder,
  CashFlowVoucher,
  Customer,
  CreditLimitRequest,
} from '../types';
import {
  INITIAL_BOMS,
  INITIAL_PRODUCTION_ORDERS,
  INITIAL_VOUCHERS,
  INITIAL_CUSTOMERS,
  INITIAL_CREDIT_REQUESTS,
} from '../data/mockData';

let boms = [...INITIAL_BOMS];
let productionOrders = [...INITIAL_PRODUCTION_ORDERS];
let vouchers = [...INITIAL_VOUCHERS];
let customers = [...INITIAL_CUSTOMERS];
let creditRequests = [...INITIAL_CREDIT_REQUESTS];

export const managerService = {
  // ─── Executive Dashboard ─────────────────────────────────────────────────
  async getDashboardKpis() {
    await new Promise((resolve) => setTimeout(resolve, 150));
    const totalReceivables = customers.reduce((sum, c) => sum + c.currentDebt, 0);
    const totalReceipts = vouchers
      .filter((v) => v.type === 'RECEIPT')
      .reduce((sum, v) => sum + v.amount, 0);
    const totalPayments = vouchers
      .filter((v) => v.type === 'PAYMENT')
      .reduce((sum, v) => sum + v.amount, 0);

    return {
      totalReceivables,
      totalReceipts,
      totalPayments,
      netCashFlow: totalReceipts - totalPayments,
      pendingApprovalsCount: creditRequests.filter((r) => r.status === 'PENDING').length,
      activeProductionOrders: productionOrders.filter((p) => p.status === 'IN_PROGRESS').length,
      activeBomsCount: boms.filter((b) => b.status === 'ACTIVE').length,
    };
  },

  // ─── Approval Inbox (Duyệt nới hạn mức nợ) ───────────────────────────────
  async getPendingApprovals(): Promise<CreditLimitRequest[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return [...creditRequests];
  },

  async processApproval(
    requestId: string,
    action: 'APPROVE' | 'REJECT',
    securityPin: string,
    reviewNotes: string,
    reviewedBy: string
  ): Promise<CreditLimitRequest> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Kiểm tra mã PIN bảo mật theo Report 3 (mục 3.1.5.2 Screen #8)
    if (securityPin !== '1234' && securityPin !== 'admin' && securityPin.length < 4) {
      throw new Error('Mã PIN bảo mật xác thực không hợp lệ (Mặc định: 1234)');
    }

    const request = creditRequests.find((r) => r.id === requestId);
    if (!request) throw new Error('Không tìm thấy yêu cầu xét duyệt');

    request.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    request.reviewedBy = reviewedBy;
    request.reviewedAt = new Date().toLocaleString('vi-VN');
    request.reviewNotes = reviewNotes;

    // Nếu Approve, cập nhật ngay hạn mức mới cho khách hàng
    if (action === 'APPROVE') {
      const customer = customers.find((c) => c.id === request.customerId);
      if (customer) {
        customer.creditLimit = request.requestedCreditLimit;
      }
    }

    return request;
  },

  // ─── BOM Management (Gộp luồng BOM vào 1 màn hình chung) ──────────────────
  async getBoms(search?: string): Promise<BomFormula[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (!search) return [...boms];
    const q = search.toLowerCase();
    return boms.filter(
      (b) =>
        b.bomCode.toLowerCase().includes(q) ||
        b.finishedProductName.toLowerCase().includes(q)
    );
  },

  async createBom(payload: Omit<BomFormula, 'id' | 'bomCode' | 'updatedAt'>): Promise<BomFormula> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newCode = `BOM-${String(boms.length + 1).padStart(3, '0')}`;
    const newBom: BomFormula = {
      ...payload,
      id: `BOM-${Date.now()}`,
      bomCode: newCode,
      updatedAt: new Date().toLocaleDateString('vi-VN'),
    };

    boms = [newBom, ...boms];
    return newBom;
  },

  async updateBom(bomId: string, payload: Partial<BomFormula>): Promise<BomFormula> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const index = boms.findIndex((b) => b.id === bomId);
    if (index === -1) throw new Error('Không tìm thấy định mức BOM');

    const updated = {
      ...boms[index],
      ...payload,
      updatedAt: new Date().toLocaleDateString('vi-VN'),
    };
    boms[index] = updated;
    return updated;
  },

  // ─── Cash Flow Voucher (Gộp Phiếu thu/chi thành 1 popup) ─────────────────
  async getCashFlowVouchers(type?: 'RECEIPT' | 'PAYMENT' | 'ALL'): Promise<CashFlowVoucher[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    if (!type || type === 'ALL') return [...vouchers];
    return vouchers.filter((v) => v.type === type);
  },

  async createCashFlowVoucher(
    payload: Omit<CashFlowVoucher, 'id' | 'voucherCode'>
  ): Promise<CashFlowVoucher> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const prefix = payload.type === 'RECEIPT' ? 'PT' : 'PC';
    const newCode = `${prefix}-2026-${String(vouchers.length + 1).padStart(3, '0')}`;

    const newVoucher: CashFlowVoucher = {
      ...payload,
      id: `VCH-${Date.now()}`,
      voucherCode: newCode,
    };

    vouchers = [newVoucher, ...vouchers];

    // Cập nhật nợ khách hàng nếu là phiếu thu tiền khách
    if (payload.type === 'RECEIPT' && payload.partnerId) {
      const customer = customers.find((c) => c.id === payload.partnerId);
      if (customer) {
        customer.currentDebt = Math.max(0, customer.currentDebt - payload.amount);
      }
    }

    return newVoucher;
  },

  // ─── Production Orders (Lệnh sản xuất) ───────────────────────────────────
  async getProductionOrders(): Promise<ProductionOrder[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return [...productionOrders];
  },

  async createProductionOrder(
    payload: Omit<ProductionOrder, 'id' | 'mfgOrderCode' | 'completedQuantity' | 'status'>
  ): Promise<ProductionOrder> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newCode = `MO-2026-${String(productionOrders.length + 1).padStart(3, '0')}`;
    const newOrder: ProductionOrder = {
      ...payload,
      id: `MO-${Date.now()}`,
      mfgOrderCode: newCode,
      completedQuantity: 0,
      status: 'PLANNED',
    };

    productionOrders = [newOrder, ...productionOrders];
    return newOrder;
  },

  // ─── Partner & Credit Limits (Hạn mức tín dụng đối tác) ─────────────────
  async getCustomers(): Promise<Customer[]> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return [...customers];
  },

  async updateCustomerCreditLimit(
    customerId: string,
    creditLimit: number,
    paymentTermDays: number
  ): Promise<Customer> {
    await new Promise((resolve) => setTimeout(resolve, 250));
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) throw new Error('Không tìm thấy đối tác');

    customer.creditLimit = creditLimit;
    customer.paymentTermDays = paymentTermDays;
    return customer;
  },
};
