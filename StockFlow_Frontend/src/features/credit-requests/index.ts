// src/features/credit-requests/index.ts
// Cổng công khai: POS (features/pos) dùng các hàm nhận diện/nhãn để mở hộp "Vượt hạn mức → gửi yêu cầu"
// và chọn ngoại lệ đã duyệt; không import thẳng vào utils của module này.

export {
  APPROVAL_TYPE_LABEL,
  CREDIT_STATUS,
  formatVnd as formatCreditVnd,
  isOverCreditLimitError,
  msg22CreditExceeded,
  msg24Approved,
  msg25Rejected,
} from './utils/creditRequestUtils';
