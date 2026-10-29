// src/features/transfers/utils/dateUtils.ts
// Tiện ích xử lý ngày giờ chuẩn múi giờ địa phương Việt Nam (Local Timezone Safe)

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Chuyển đổi Date / ISO string sang format chuẩn cho <input type="datetime-local" />: "YYYY-MM-DDTHH:mm"
 * Sử dụng getFullYear(), getMonth(), getDate(), getHours(), getMinutes() theo giờ địa phương của người dùng (tránh lỗi lệch 7 tiếng của UTC toISOString)
 */
export function toLocalDatetimeInputString(input?: Date | string | null): string {
  const d = input ? (typeof input === 'string' ? new Date(input) : input) : new Date();
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Hiển thị ngày giờ theo định dạng chuẩn Việt Nam: "DD/MM/YYYY HH:mm"
 */
export function formatDateTimeVN(input?: Date | string | null): string {
  if (!input) return '—';
  try {
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return String(input);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '—';
  }
}

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
