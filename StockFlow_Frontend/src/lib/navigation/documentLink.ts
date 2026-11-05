// src/lib/navigation/documentLink.ts
// Link mở thẳng 1 chứng từ / đối tác trên màn danh sách (VD từ Thẻ kho):
//   /purchases?code=PN000021&id=21&date=2026-11-04&wh=3
// Màn danh sách đọc link 1 lần khi mở: điền ô tìm kiếm theo mã, lọc đúng ngày + chi nhánh của phiếu,
// mở sẵn dòng chi tiết và cuộn tới dòng đó.

export interface DocumentLink {
  code: string;
  id: number | null;
  /** Ngày chứng từ YYYY-MM-DD (để bộ lọc thời gian chứa được phiếu) */
  date: string | null;
  warehouseId: number | null;
}

interface SearchParamsLike {
  get(name: string): string | null;
}

const toPositiveInt = (v: string | null): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export function readDocumentLink(params: SearchParamsLike | null | undefined): DocumentLink | null {
  const code = params?.get('code')?.trim();
  if (!code) return null;
  const date = params?.get('date')?.trim() ?? null;
  return {
    code,
    id: toPositiveInt(params?.get('id') ?? null),
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    warehouseId: toPositiveInt(params?.get('wh') ?? null),
  };
}

/** Lấy phần ngày YYYY-MM-DD từ chuỗi ngày giờ của API */
export function toLinkDate(value?: string | null): string | null {
  const m = value?.match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function documentLinkHref(
  path: string,
  link: { code: string; id?: number | null; date?: string | null; warehouseId?: number | null }
): string {
  const qs = new URLSearchParams({ code: link.code });
  if (link.id) qs.set('id', String(link.id));
  if (link.date) qs.set('date', link.date);
  if (link.warehouseId) qs.set('wh', String(link.warehouseId));
  return `${path}?${qs.toString()}`;
}

/** Bộ lọc thời gian "tùy chỉnh" đúng ngày của chứng từ; không có ngày → toàn thời gian */
export function linkDateFilter(date: string | null): {
  timeRange: string;
  dateFrom?: string;
  dateTo?: string;
  periodLabel: string;
} {
  if (!date) return { timeRange: 'custom', dateFrom: undefined, dateTo: undefined, periodLabel: 'Toàn thời gian' };
  const [y, m, d] = date.split('-');
  return { timeRange: 'custom', dateFrom: date, dateTo: date, periodLabel: `${d}/${m}/${y}` };
}

/** Chờ dòng xuất hiện (dữ liệu tải xong) rồi cuộn tới giữa màn hình; trả về hàm hủy */
export function scrollToWhenReady(selector: string, timeoutMs = 8000): () => void {
  if (typeof window === 'undefined') return () => {};
  const started = Date.now();
  const timer = window.setInterval(() => {
    const el = document.querySelector(selector);
    if (el) {
      window.clearInterval(timer);
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (Date.now() - started > timeoutMs) {
      window.clearInterval(timer);
    }
  }, 200);
  return () => window.clearInterval(timer);
}
