// src/features/sales-bookings/index.ts
// Cổng công khai của feature sales-bookings (rule 20): feature khác chỉ import những gì export ở đây.
// POS in đơn đặt hàng ngay sau khi lưu đơn (tùy chọn "In sau khi hoàn thành").
export { printSalesBooking } from './utils/printSalesBooking';
