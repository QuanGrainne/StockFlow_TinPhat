// src/features/credit-requests/utils/creditRequestUtils.ts
// Nhãn trạng thái / loại duyệt và định dạng tiền dùng chung trong module duyệt hạn mức.

import type { CreditApprovalType, CreditRequest, CreditRequestStatus } from '../types';

export const formatVnd = (n: number | null | undefined): string =>
  n == null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n);

/** Nhãn + màu antd Tag theo trạng thái */
export const CREDIT_STATUS: Record<CreditRequestStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'gold' },
  APPROVED: { label: 'Đã duyệt', color: 'green' },
  REJECTED: { label: 'Từ chối', color: 'red' },
};

/** Màu nhãn trạng thái dạng viên thuốc, cùng kiểu nhãn trạng thái ở Xuất hủy / Chuyển hàng */
export const CREDIT_STATUS_CLS: Record<CreditRequestStatus, string> = {
  PENDING: 'bg-[#fffbeb] text-[#d97706] border-[#fde68a]',
  APPROVED: 'bg-[#e6f8ec] text-[#16a34a] border-[#bbf7d0]',
  REJECTED: 'bg-[#fef2f2] text-[#fb2c36] border-[#fecaca]',
};

/** ONE_TIME chỉ còn ở dữ liệu cũ (đã bỏ duyệt ngoại lệ một lần); duyệt mới luôn là NEW_LIMIT */
export const APPROVAL_TYPE_LABEL: Record<CreditApprovalType, string> = {
  ONE_TIME: 'Ngoại lệ một lần',
  NEW_LIMIT: 'Nâng hạn mức',
};


/** Phần vượt hạn mức hiện tại nếu duyệt theo hạn mức đề xuất */
export const exceedOverLimit = (r: CreditRequest): number =>
  Math.max(0, (r.requestedLimit ?? 0) - r.currentCreditLimit);

/** POS báo vượt hạn mức (CUS-008: hết hạn mức, CUS-009: nợ mới vượt phần còn lại) → mở hộp gửi yêu cầu */
export const isOverCreditLimitError = (msg: string): boolean => /\(CUS-00[89]\)/.test(msg);

// ── Thông báo theo SRS Report 3 revised, mục 5.2 System Messages ──

/** MSG22 – Popup (Warning): Current debt + new debt exceeds the customer's credit limit by {amount}. Increase the paid amount or request credit approval. */
export const msg22CreditExceeded = (amount: number): string =>
  `Dư nợ hiện tại + nợ mới vượt hạn mức tín dụng của khách hàng ${formatVnd(amount)} đ. Hãy tăng số tiền khách trả hoặc gửi yêu cầu duyệt tín dụng (MSG22).`;

/** MSG24 – Info: Credit request {code} has been approved. You can continue the transaction. */
export const msg24Approved = (code: string): string =>
  `Yêu cầu duyệt tín dụng ${code} đã được duyệt. Bạn có thể tiếp tục giao dịch (MSG24).`;

/** MSG25 – Info: Credit request {code} has been rejected. Reason: {reason}. */
export const msg25Rejected = (code: string, reason: string): string =>
  `Yêu cầu duyệt tín dụng ${code} đã bị từ chối. Lý do: ${reason} (MSG25).`;

/** E62.1 – từ chối không có lý do */
export const E62_1_REJECT_REASON = 'Vui lòng nhập lý do từ chối (E62.1).';
