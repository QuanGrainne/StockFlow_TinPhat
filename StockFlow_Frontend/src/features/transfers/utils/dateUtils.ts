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

    // Ô nhập giờ chỉ giữ đến phút, nên phải so theo phút: "bây giờ" sau giờ chuyển vài giây mà cùng phút
    // thì giá trị gợi ý bị cắt giây sẽ bằng giờ chuyển và bị chặn (DEF-E2E-01).
    const MINUTE = 60 * 1000;
    const nowMinute = Math.floor(now.getTime() / MINUTE);
    const transferMinute = Math.floor(tDate.getTime() / MINUTE);
    if (nowMinute > transferMinute) {
      return toLocalDatetimeInputString(now);
    }

    // Cùng phút hoặc giờ chuyển ở tương lai -> gợi ý phút ngay sau giờ chuyển
    return toLocalDatetimeInputString(new Date((transferMinute + 1) * MINUTE));
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
