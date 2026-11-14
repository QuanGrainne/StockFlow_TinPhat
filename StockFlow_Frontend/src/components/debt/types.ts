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
