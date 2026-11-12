// src/features/transfers/utils/dateUtils.ts
// Hàm ngày giờ dùng chung đã chuyển sang @/lib/utils/date (T16); file này re-export để các import cũ không phải sửa.
// Phần còn lại ở đây là luật riêng của chuyển kho (thời gian nhận hàng).

import { formatDateTimeVN, toLocalDatetimeInputString } from '@/lib/utils/date';

export * from '@/lib/utils/date';

/**
 * Tính toán thời gian nhận hàng mặc định hợp lý:
 * Đảm bảo thời gian nhận hàng > thời gian chuyển hàng ít nhất 1 - 5 phút
 */
export function getDefaultReceiveDate(transferDateInput?: Date | string | null): string {
  const now = new Date();
  if (!transferDateInput) return toLocalDatetimeInputString(now);

  try {
    const tDate = typeof transferDateInput === 'string' ? new Date(transferDateInput) : transferDateInput;
    if (isNaN(tDate.getTime())) return toLocalDatetimeInputString(now);

    // Nếu thời gian hiện tại đã sau thời gian chuyển hàng -> Dùng thời gian hiện tại
    if (now.getTime() > tDate.getTime()) {
      return toLocalDatetimeInputString(now);
    }

    // Nếu thời gian hiện tại <= thời gian chuyển hàng (vd chuyển hàng vừa bấm tạo cùng phút hoặc hẹn trước)
    // -> Tự động gợi ý thời gian nhận = thời gian chuyển + 5 phút
    const afterTransfer = new Date(tDate.getTime() + 5 * 60 * 1000);
    return toLocalDatetimeInputString(afterTransfer);
  } catch {
    return toLocalDatetimeInputString(now);
  }
}

/**
 * Kiểm tra tính hợp lệ logic nghiệp vụ: Thời gian nhận hàng phải sau thời gian chuyển hàng
 */
export function validateReceiveAfterTransfer(
  transferDateInput?: Date | string | null,
  receiveDateInput?: Date | string | null
): { isValid: boolean; message?: string } {
  if (!transferDateInput || !receiveDateInput) return { isValid: true };

  try {
    const t = new Date(transferDateInput).getTime();
    const r = new Date(receiveDateInput).getTime();

    if (isNaN(t) || isNaN(r)) return { isValid: true };

    if (r <= t) {
      return {
        isValid: false,
        message: `Thời gian nhận hàng (${formatDateTimeVN(receiveDateInput)}) phải sau thời gian chuyển hàng (${formatDateTimeVN(transferDateInput)})!`,
      };
    }
  } catch {
    return { isValid: true };
  }

  return { isValid: true };
}
