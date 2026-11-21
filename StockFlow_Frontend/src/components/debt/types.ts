// Kiểu dữ liệu phiếu điều chỉnh công nợ (DC...) dùng chung cho Khách hàng và Nhà cung cấp

/** Dữ liệu gửi lên khi tạo / sửa phiếu điều chỉnh */
export interface DebtAdjustPayload {
  /** Công nợ sau điều chỉnh (âm = chiều ngược lại, 0 = hết nợ) */
  newDebt: number;
  /** ISO; null = server lấy giờ hiện tại (tạo mới) / giữ giờ cũ (sửa) */
  adjustDate: string | null;
  description: string | null;
}

export interface DebtAdjustResult {
  code: string;
  oldDebt: number;
  newDebt: number;
  difference: number;
}

/** Phiếu điều chỉnh đã có (popup khi bấm mã DC...) */
export interface DebtAdjustmentDetail {
  code: string;
  adjustDate: string | null;
  /** Chênh lệch ghi vào sổ */
  amount: number;
  /** Giá trị nợ điều chỉnh = công nợ ngay sau phiếu */
  debtAfter: number;
  description: string | null;
  createdByName: string | null;
}

export interface DebtAdjustApi {
  get: (code: string) => Promise<DebtAdjustmentDetail>;
  create: (payload: DebtAdjustPayload) => Promise<DebtAdjustResult>;
  update: (code: string, payload: DebtAdjustPayload) => Promise<void>;
  cancel: (code: string) => Promise<void>;
}

/**
 * Phiếu thu / chi khi công nợ đang ở chiều ngược lại (không qua phiếu trả hàng):
 * - Nhà cung cấp đang nợ cửa hàng → phiếu thu PT... (POST /api/Suppliers/{id}/refunds)
 * - Cửa hàng đang nợ khách → phiếu chi PC... (POST /api/customers/{id}/refunds)
 */
export interface DebtRefundPayload {
  amount: number;
  /** ISO; null = server lấy giờ hiện tại */
  date: string | null;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  notes: string | null;
}

export interface DebtRefundResult {
  voucherCode: string;
  amount: number;
  /** Công nợ sau phiếu (âm = vẫn còn nợ ngược chiều) */
  remainingDebt: number;
}

/** Chi tiết phiếu thu / chi công nợ (PT..., PC...) — xem từ sổ công nợ NCC / khách hàng */
export interface DebtVoucherLine {
  /** GOODS_RECEIPT | PURCHASE_RETURN | SALES_RETURN; null = không gắn chứng từ */
  documentType: 'GOODS_RECEIPT' | 'PURCHASE_RETURN' | 'SALES_RETURN' | null;
  documentId: number | null;
  documentCode: string | null;
  documentDate: string | null;
  amount: number;
}

export interface DebtVoucherDetail {
  code: string;
  /** RECEIPT = phiếu thu (tiền vào); PAYMENT = phiếu chi (tiền ra) */
  voucherType: 'RECEIPT' | 'PAYMENT';
  typeLabel: string;
  transactionDate: string | null;
  createdByName: string | null;
  paymentMethod: string;
  amount: number;
  description: string | null;
  status: string;
  partnerCode: string;
  partnerName: string;
  lines: DebtVoucherLine[];
  /** Chỉ phiếu thu / chi độc lập (không gắn chứng từ) mới hủy được */
  canCancel: boolean;
}
