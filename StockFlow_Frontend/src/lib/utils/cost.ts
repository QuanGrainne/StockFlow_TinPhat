// src/lib/utils/cost.ts
// Định dạng giá vốn dùng chung: giá vốn bình quân luôn hiện đủ 3 chữ số thập phân kiểu VN (VD 33.257,062),
// khác đơn giá / thành tiền (làm tròn về đồng). Backend làm tròn giá vốn 3 số lẻ (CostingPolicy.CostDecimals).

const COST_FORMAT = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

/** Giá vốn 3 chữ số thập phân: 33257.0617 → "33.257,062"; null/undefined/NaN → "0,000" */
export function formatCost(value: number | null | undefined): string {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  return COST_FORMAT.format(n);
}
