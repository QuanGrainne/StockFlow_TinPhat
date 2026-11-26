// src/features/orders/index.ts
// Cổng công khai của feature orders (T24, rule 20): feature khác chỉ import những gì export ở đây,
// không import thẳng vào components/ hay screens/ của orders.
export { default as InvoicePreviewModal, invoiceLinkHref } from './components/InvoicePreviewModal';
// POS in hóa đơn ngay sau khi thanh toán (tùy chọn "In sau khi hoàn thành")
export { printInvoice } from './utils/invoiceUtils';
