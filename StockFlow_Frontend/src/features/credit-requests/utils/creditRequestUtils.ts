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

export const APPROVAL_TYPE_LABEL: Record<CreditApprovalType, string> = {
  ONE_TIME: 'Ngoại lệ một lần',
  NEW_LIMIT: 'Nâng hạn mức',
};

/** Ngoại lệ một lần đã duyệt, chưa gắn hóa đơn → POS dùng được */
export const isUsableOneTime = (r: CreditRequest): boolean =>
  r.status === 'APPROVED' && r.approvalType === 'ONE_TIME' && !r.isUsed;

/** Phần vượt hạn mức hiện tại nếu duyệt theo hạn mức đề xuất */
export const exceedOverLimit = (r: CreditRequest): number =>
  Math.max(0, (r.requestedLimit ?? 0) - r.currentCreditLimit);

/** POS báo vượt hạn mức (CUS-008: hết hạn mức, CUS-009: nợ mới vượt phần còn lại) → mở hộp gửi yêu cầu */
export const isOverCreditLimitError = (msg: string): boolean => /\(CUS-00[89]\)/.test(msg);
