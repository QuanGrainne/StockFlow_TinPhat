// src/features/purchases/index.ts
// Cổng công khai của feature purchases (T24, rule 20): feature khác chỉ import những gì export ở đây,
// không import thẳng vào components/ hay screens/ của purchases.
export { default as PurchaseFilterSidebar } from './components/PurchaseFilterSidebar';
export { AddFromCategoryPopover } from './components/AddFromCategoryPopover';
