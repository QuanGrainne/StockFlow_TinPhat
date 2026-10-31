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

/**
 * Định dạng ngày dạng ISO: "YYYY-MM-DD"
 */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Hiển thị chỉ ngày theo định dạng Việt Nam: "DD/MM/YYYY"
 */
export function formatDateOnlyVN(input?: Date | string | null): string {
  if (!input) return '--/--/----';
  try {
    if (typeof input === 'string') {
      const parts = input.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const d = typeof input === 'string' ? new Date(input) : input;
    if (isNaN(d.getTime())) return String(input);
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  } catch {
    return '--/--/----';
  }
}

/**
 * Parse an ISO date "YYYY-MM-DD" to local Date
 */
export function parseISODate(s?: string | null): Date {
  if (!s) return new Date();
  const datePart = s.split('T')[0];
  const parts = datePart.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Lấy khoảng ngày chuẩn theo các preset lọc (bỏ âm lịch và bỏ quý)
 */
export function getDateRangeForPreset(presetKey: string): { from: string; to: string; label: string } {
  const now = new Date();

  switch (presetKey) {
    case 'today': {
      const todayStr = toISODate(now);
      return { from: todayStr, to: todayStr, label: 'Hôm nay' };
    }
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = toISODate(y);
      return { from: yStr, to: yStr, label: 'Hôm qua' };
    }
    case 'this_week': {
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: toISODate(mon), to: toISODate(sun), label: 'Tuần này' };
    }
    case 'last_week': {
      const day = now.getDay();
      const diffToMon = (day === 0 ? -6 : 1 - day) - 7;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return { from: toISODate(mon), to: toISODate(sun), label: 'Tuần trước' };
    }
    case 'last_7_days': {
      const past = new Date(now);
      past.setDate(now.getDate() - 6);
      return { from: toISODate(past), to: toISODate(now), label: '7 ngày qua' };
    }
    case 'this_month': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toISODate(start), to: toISODate(end), label: 'Tháng này' };
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toISODate(start), to: toISODate(end), label: 'Tháng trước' };
    }
    case 'last_30_days': {
      const past = new Date(now);
      past.setDate(now.getDate() - 29);
      return { from: toISODate(past), to: toISODate(now), label: '30 ngày qua' };
    }
    case 'this_year': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return { from: toISODate(start), to: toISODate(end), label: 'Năm nay' };
    }
    case 'last_year': {
      const start = new Date(now.getFullYear() - 1, 0, 1);
      const end = new Date(now.getFullYear() - 1, 11, 31);
      return { from: toISODate(start), to: toISODate(end), label: 'Năm trước' };
    }
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toISODate(start), to: toISODate(end), label: 'Tháng này' };
    }
  }
}

