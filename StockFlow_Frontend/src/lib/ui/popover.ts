// src/lib/ui/popover.ts
// Giữ popover dạng position: fixed (chọn thời gian, lịch tùy chỉnh ở các cột lọc) luôn nằm trong màn hình.
// Khi cửa sổ hẹp, popover mở sang phải cột lọc sẽ bị tràn ra ngoài → kéo lùi lại cho vừa.

const MARGIN = 8;

/** Vị trí left an toàn cho popover rộng `width` px, ưu tiên `desiredLeft` */
export function clampPopoverLeft(desiredLeft: number, width: number): number {
  if (typeof window === 'undefined') return desiredLeft;
  const maxLeft = window.innerWidth - Math.min(width, window.innerWidth - MARGIN * 2) - MARGIN;
  return Math.max(MARGIN, Math.min(desiredLeft, maxLeft));
}

/** Chiều rộng thực tế của popover lịch (580px) và chọn mốc thời gian (~480px) */
export const DATE_POPOVER_WIDTH = 580;
export const PRESET_POPOVER_WIDTH = 480;
