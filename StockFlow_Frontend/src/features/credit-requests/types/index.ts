// src/features/credit-requests/types/index.ts
// Kiểu dữ liệu yêu cầu duyệt vượt hạn mức công nợ (HM-01, UC-27, UC-64) — khớp CreditRequestDtos.cs ở backend.

/** Trạng thái lưu trong DB (CreditRequestStatus.cs) */
export type CreditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Loại duyệt (CreditApprovalType.cs): ngoại lệ một lần / nâng hạn mức */
export type CreditApprovalType = 'ONE_TIME' | 'NEW_LIMIT';

export interface CreditRequest {
  requestId: number;
  requestCode: string | null;
  partnerId: number;
  partnerCode: string | null;
  partnerName: string | null;
  /** Dư nợ hiện tại của khách (đọc lúc xem) */
  currentDebt: number;
  /** Hạn mức hiện tại của khách (đọc lúc xem) */
  currentCreditLimit: number;
  /** Hạn mức của khách lúc gửi yêu cầu */
  limitAtRequest: number | null;
  /** Số Sales đề xuất (dư nợ tối đa cần có sau hóa đơn) */
  requestedLimit: number | null;
  /** Số Kế toán trưởng duyệt: ONE_TIME = dư nợ tối đa sau hóa đơn; NEW_LIMIT = hạn mức mới */
  approvedLimit: number | null;
  reason: string | null;
  status: CreditRequestStatus;
  approvalType: CreditApprovalType | null;
  requestedBy: number;
  requestedByName: string | null;
  requestDate: string | null;
  approvedBy: number | null;
  approvedByName: string | null;
  approvalDate: string | null;
  /** Ghi chú duyệt hoặc lý do từ chối */
  approvalNotes: string | null;
  salesOrderId: number | null;
  salesOrderCode: string | null;
  isUsed: boolean;
}

export interface CreditRequestList {
  items: CreditRequest[];
  /** Số yêu cầu đang chờ duyệt (số trên tab) */
  pendingCount: number;
}

export interface CreditRequestActionResult {
  request: CreditRequest;
  message: string;
}

export interface CreateCreditRequestPayload {
  partnerId: number;
  /** Nợ mới dự kiến của hóa đơn bị chặn */
  expectedNewDebt: number;
  /** Hạn mức đề xuất (không bắt buộc) */
  requestedLimit?: number;
  reason: string;
}

export interface ApproveCreditRequestPayload {
  approvalType: CreditApprovalType;
  /** Mức Kế toán trưởng duyệt (bỏ trống = theo đề xuất của Sales) */
  approvedLimit?: number;
  notes?: string;
}

/** Thông tin khách để xét duyệt (A62.2): tổng quan mua hàng + lịch sử thanh toán */
export interface CustomerCreditHistory {
  partnerId: number;
  partnerCode: string | null;
  partnerName: string | null;
  phone: string | null;
  customerSince: string | null;
  currentDebt: number;
  creditLimit: number;
  invoiceCountAll: number;
  totalPurchaseAll: number;
  invoiceCount12M: number;
  totalPurchase12M: number;
  averageInvoice12M: number;
  firstPurchaseDate: string | null;
  lastPurchaseDate: string | null;
  monthlyPurchases: { month: string; invoiceCount: number; purchase: number; paid: number }[];
  recentInvoices: { orderId: number; orderCode: string; orderDate: string | null; total: number; paid: number; outstanding: number }[];
  totalPaidAll: number;
  totalPaid12M: number;
  paymentCount12M: number;
  lastPaymentDate: string | null;
  lastPaymentAmount: number | null;
  totalReturns12M: number;
  recentPayments: { code: string; date: string | null; amount: number; paymentMethod: string | null; orderCode: string | null }[];
}

/** Bộ lọc trạng thái trên Approval Inbox ('' = tất cả) */
export type CreditRequestStatusFilter = CreditRequestStatus | '';
