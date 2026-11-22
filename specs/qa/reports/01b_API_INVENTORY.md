# Phụ lục 01b – Danh sách API (sinh tự động từ controller)

- **Nguồn:** `StockFlow_Backend/StockFlow.API/Controllers/*.cs`, nhánh `chore/xoa-bang-chua-dung` (= `origin/dev` `3c864d7` + 2 commit xoá 3 bảng), ngày 19/11/2026.
- **Cách sinh:** đọc thuộc tính `[Route]`, `[Http*]`, `[RequirePermission]`, `[RequireAdmin]`, `[RequireFeature]`, `[AllowAnonymous]` của từng action. Quyền khai ở mức lớp được áp cho action không khai riêng.
- **Tổng:** 200 endpoint trong 26 controller.
- Cột **Quyền** trống và **Khác** trống: endpoint chỉ cần đăng nhập (FallbackPolicy), không khai quyền riêng.

| Controller | Số endpoint |
|---|---:|
| Customers | 19 |
| Production | 14 |
| Suppliers | 12 |
| Products | 12 |
| ProductionPlans | 12 |
| PurchaseOrders | 10 |
| Transfers | 9 |
| Roles | 9 |
| PriceBooks | 9 |
| SalesBookings | 8 |
| Mrp | 8 |
| Warehouses | 7 |
| SalesReturns | 7 |
| PurchaseReturns | 7 |
| ProductionBoms | 7 |
| Disposals | 7 |
| CreditRequests | 7 |
| Stocktakes | 6 |
| Purchases | 6 |
| WarehousePermissions | 5 |
| Staff | 5 |
| Orders | 5 |
| Auth | 4 |
| OrderSettings | 2 |
| DebtWarningSettings | 2 |
| Health | 1 |


## Auth

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | POST | `/api/auth/login` |  | ANON |  |
| 2 | GET | `/api/auth/me` |  |  |  |
| 3 | POST | `/api/auth/change-password` |  |  |  |
| 4 | GET | `/api/auth/permissions` |  |  |  |

## CreditRequests

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | POST | `/api/credit-requests` | SALES_CREATE |  | feat-pos |
| 2 | GET | `/api/credit-requests/mine` | SALES_READ |  | feat-pos |
| 3 | GET | `/api/credit-requests` | SALES_APPROVE |  | feat-credit-approvals |
| 4 | GET | `/api/credit-requests/{id:int}` | SALES_APPROVE |  | feat-credit-approvals |
| 5 | GET | `/api/credit-requests/{id:int}/customer-history` | SALES_APPROVE |  | feat-credit-approvals |
| 6 | POST | `/api/credit-requests/{id:int}/approve` | SALES_APPROVE |  | feat-credit-approvals |
| 7 | POST | `/api/credit-requests/{id:int}/reject` | SALES_APPROVE |  | feat-credit-approvals |

## Customers

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/customers` | PARTNER_READ |  | feat-customers, feat-pos, feat-invoices |
| 2 | GET | `/api/customers/stats` | PARTNER_READ |  | feat-customers |
| 3 | GET | `/api/customers/{id}` | PARTNER_READ |  | feat-customers, feat-invoices |
| 4 | GET | `/api/customers/{id}/receipts/{code}` | PARTNER_READ |  | feat-customers |
| 5 | PUT | `/api/customers/{id}/receipts/{code}` | FIN_UPDATE |  | feat-customers |
| 6 | POST | `/api/customers/{id}/receipts/{code}/cancel` | FIN_UPDATE |  | feat-customers |
| 7 | POST | `/api/customers` | PARTNER_CREATE |  | feat-customers, feat-pos |
| 8 | POST | `/api/customers/{id}/payments` | FIN_CREATE |  | feat-customers |
| 9 | POST | `/api/customers/{id}/debt-adjustments` | FIN_CREATE |  | feat-customers |
| 10 | GET | `/api/customers/{id}/debt-adjustments/{code}` | PARTNER_READ |  | feat-customers |
| 11 | PUT | `/api/customers/{id}/debt-adjustments/{code}` | FIN_UPDATE |  | feat-customers |
| 12 | POST | `/api/customers/{id}/debt-adjustments/{code}/cancel` | FIN_UPDATE |  | feat-customers |
| 13 | PUT | `/api/customers/{id}` | PARTNER_UPDATE |  | feat-customers |
| 14 | PATCH | `/api/customers/{id}/toggle-status` | PARTNER_UPDATE |  | feat-customers |
| 15 | PATCH | `/api/customers/batch-status` | PARTNER_UPDATE |  | feat-customers |
| 16 | PATCH | `/api/customers/{id:int}/credit-limit` | SALES_APPROVE |  | feat-credit-approvals |
| 17 | PATCH | `/api/customers/credit-limit/batch` | SALES_APPROVE |  | feat-credit-approvals |
| 18 | GET | `/api/customers/{id:int}/credit-limit-history` | PARTNER_READ |  | feat-customers |
| 19 | DELETE | `/api/customers/{id}` | PARTNER_DELETE |  | feat-customers |

## DebtWarningSettings

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/settings/debt-warning` | PARTNER_READ |  | feat-customers, feat-pos, feat-invoices, feat-credit-approvals |
| 2 | PUT | `/api/settings/debt-warning` | SALES_APPROVE |  | feat-credit-approvals |

## Disposals

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/disposals` | STOCK_READ |  | feat-disposal |
| 2 | GET | `/api/disposals/{id:int}` | STOCK_READ |  | feat-disposal, feat-goods |
| 3 | POST | `/api/disposals` | STOCK_CREATE |  | feat-disposal |
| 4 | GET | `/api/disposals/staff-options` | STOCK_READ |  | feat-disposal |
| 5 | PUT | `/api/disposals/{id:int}/info` | STOCK_UPDATE |  | feat-disposal |
| 6 | DELETE | `/api/disposals/{id:int}` | STOCK_UPDATE |  | feat-disposal |
| 7 | PUT | `/api/disposals/{id:int}` | STOCK_UPDATE |  | feat-disposal |

## Health

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/health` |  | ANON |  |

## Mrp

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | POST | `/api/production/mrp/runs` | PROD_UPDATE |  | MrpFeature, ProductionPlans, ProductionPlanApproval |
| 2 | GET | `/api/production/mrp/runs` | PROD_READ |  | MrpFeature, ProductionPlans, ProductionPlanApproval |
| 3 | GET | `/api/production/mrp/runs/{id:int}` | PROD_READ |  | MrpFeature, ProductionPlans, ProductionPlanApproval |
| 4 | GET | `/api/production/mrp/runs/{id:int}/daily-requirements` | PROD_READ |  | MrpFeature, ProductionPlans, ProductionPlanApproval |
| 5 | GET | `/api/production/mrp/runs/{id:int}/monthly-demand` | PROD_READ |  | MrpFeature, ProductionPlans, ProductionPlanApproval |
| 6 | GET | `/api/production/mrp/runs/{id:int}/shortages` | PROD_READ |  | MrpFeature, ProductionPlans, ProductionPlanApproval |
| 7 | GET | `/api/production/mrp/runs/{id:int}/materials/{materialId:int}/projection` | PROD_READ |  | MrpFeature, ProductionPlans, ProductionPlanApproval |
| 8 | GET | `/api/production/mrp/runs/{id:int}/purchase-suggestions` | PROD_READ |  | MrpFeature, ProductionPlans, ProductionPlanApproval |

## OrderSettings

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/order-settings` |  |  |  |
| 2 | PUT | `/api/order-settings` | SALES_APPROVE |  | feat-invoices, feat-pos |

## Orders

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/orders` | SALES_READ |  | feat-invoices, feat-pos, feat-sales-returns |
| 2 | GET | `/api/orders/{id}` | SALES_READ |  | feat-invoices, feat-pos, feat-customers, feat-goods |
| 3 | POST | `/api/orders/pos` | SALES_CREATE |  | feat-pos |
| 4 | PUT | `/api/orders/{id}` | SALES_UPDATE |  | feat-invoices |
| 5 | POST | `/api/orders/{id:int}/cancel` | SALES_UPDATE |  | feat-invoices |

## PriceBooks

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/price-books` | GOODS_READ |  | feat-price-books, feat-pos, feat-invoices, feat-goods |
| 2 | GET | `/api/price-books/customer-options` | GOODS_READ |  | feat-price-books |
| 3 | GET | `/api/price-books/{id:int}` | GOODS_READ |  | feat-price-books |
| 4 | POST | `/api/price-books` | GOODS_CREATE |  | feat-price-books |
| 5 | PUT | `/api/price-books/{id:int}` | GOODS_UPDATE |  | feat-price-books |
| 6 | DELETE | `/api/price-books/{id:int}` | GOODS_DELETE |  | feat-price-books |
| 7 | GET | `/api/price-books/matrix` | GOODS_READ |  | feat-price-books, feat-pos, feat-invoices, feat-goods |
| 8 | PUT | `/api/price-books/{id:int}/prices` | GOODS_UPDATE |  | feat-price-books |
| 9 | POST | `/api/price-books/{id:int}/apply-formula` | GOODS_UPDATE |  | feat-price-books |

## ProductionBoms

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/production/boms` | BOM_READ |  | feat-bom, feat-prod-plan |
| 2 | GET | `/api/production/boms/{id:int}` | BOM_READ |  | feat-bom, feat-prod-plan |
| 3 | POST | `/api/production/boms` | BOM_CREATE |  | feat-bom |
| 4 | PUT | `/api/production/boms/{id:int}` | BOM_UPDATE |  | feat-bom |
| 5 | POST | `/api/production/boms/{id:int}/activate` | BOM_APPROVE |  | feat-bom |
| 6 | POST | `/api/production/boms/{id:int}/deactivate` | BOM_APPROVE |  | feat-bom |
| 7 | DELETE | `/api/production/boms/{id:int}` | BOM_DELETE |  | feat-bom |

## Production

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/production/orders` | PROD_READ |  | feat-prod, feat-prod-plan, feat-prod-issue, feat-prod-receipt |
| 2 | GET | `/api/production/orders/{id:int}` | PROD_READ |  | feat-prod, feat-prod-plan, feat-prod-issue, feat-prod-receipt |
| 3 | GET | `/api/production/orders/requirement-preview` | PROD_READ |  | feat-prod-plan |
| 4 | POST | `/api/production/orders/{id:int}/cancel` | PROD_DELETE |  | feat-prod-plan |
| 5 | POST | `/api/production/orders/{id:int}/close` | PROD_APPROVE |  | feat-prod-plan |
| 6 | POST | `/api/production/orders/{id:int}/approve` | PROD_APPROVE |  | feat-prod-plan |
| 7 | POST | `/api/production/orders/{id:int}/adjust-norms` | PROD_APPROVE |  | feat-prod-plan |
| 8 | GET | `/api/production/material-issues` | PROD_READ |  | feat-prod-issue, feat-prod |
| 9 | POST | `/api/production/material-issues` | PROD_UPDATE |  | feat-prod-issue |
| 10 | GET | `/api/production/finished-goods-receipts` | PROD_READ |  | feat-prod-receipt, feat-prod |
| 11 | GET | `/api/production/finished-goods-receipts/check` | PROD_READ |  | feat-prod-receipt |
| 12 | POST | `/api/production/finished-goods-receipts` | PROD_UPDATE |  | feat-prod-receipt |
| 13 | GET | `/api/production/lookups/products` | PROD_READ |  | feat-bom, feat-prod-plan, feat-production-plans, feat-production-plan-approval |
| 14 | GET | `/api/production/lookups/locations` | PROD_READ |  | feat-prod-receipt, feat-prod-plan |

## ProductionPlans

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/production/plans` | PROD_READ |  | Plans, Approval, CreateOrders |
| 2 | GET | `/api/production/plans/{id:int}` | PROD_READ |  | Plans, Approval, CreateOrders |
| 3 | POST | `/api/production/plans` | PROD_UPDATE |  | Plans, Approval |
| 4 | PUT | `/api/production/plans/{id:int}` | PROD_UPDATE |  | Plans, Approval |
| 5 | POST | `/api/production/plans/{id:int}/submit` | PROD_UPDATE |  | Plans, Approval |
| 6 | POST | `/api/production/plans/{id:int}/approve` | PROD_APPROVE |  | Approval |
| 7 | POST | `/api/production/plans/{id:int}/reject` | PROD_APPROVE |  | Approval |
| 8 | POST | `/api/production/plans/{id:int}/cancel` | PROD_UPDATE |  | Plans, Approval |
| 9 | POST | `/api/production/plans/{id:int}/close` | PROD_APPROVE |  | Approval |
| 10 | GET | `/api/production/plans/{id:int}/material-requirements` | PROD_READ |  | Plans, Approval, CreateOrders |
| 11 | POST | `/api/production/plans/material-requirements/preview` | PROD_READ |  | Plans, Approval |
| 12 | POST | `/api/production/plans/{id:int}/orders` | PROD_CREATE |  | CreateOrders |

## Products

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/products` | GOODS_READ |  |  |
| 2 | GET | `/api/products/{id}` | GOODS_READ |  |  |
| 3 | GET | `/api/products/{id}/stock-card` | GOODS_READ |  | feat-goods |
| 4 | POST | `/api/products` | GOODS_CREATE |  | feat-goods, feat-purchase, feat-purchase-orders |
| 5 | POST | `/api/products/import` | GOODS_CREATE |  | feat-goods |
| 6 | PUT | `/api/products/{id}` | GOODS_UPDATE |  | feat-goods |
| 7 | POST | `/api/products/{id}/stock-adjustments` | STOCK_UPDATE |  | feat-goods |
| 8 | PATCH | `/api/products/{id}/toggle-status` | GOODS_UPDATE |  | feat-goods |
| 9 | DELETE | `/api/products/{id}` | GOODS_DELETE |  | feat-goods |
| 10 | GET | `/api/products/categories` | GOODS_READ |  |  |
| 11 | POST | `/api/products/categories` | GOODS_CREATE |  | feat-goods, feat-purchase, feat-purchase-orders |
| 12 | GET | `/api/products/units` | GOODS_READ |  |  |

## PurchaseOrders

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/purchase-orders` | PURCHASE_READ |  | feat-purchase-orders |
| 2 | GET | `/api/purchase-orders/{id:int}` | PURCHASE_READ |  | feat-purchase-orders, feat-purchase |
| 3 | GET | `/api/purchase-orders/by-code/{code}` | PURCHASE_READ |  | feat-purchase-orders, feat-purchase |
| 4 | POST | `/api/purchase-orders` | PURCHASE_CREATE |  | feat-purchase-orders |
| 5 | PUT | `/api/purchase-orders/{id:int}` | PURCHASE_UPDATE |  | feat-purchase-orders |
| 6 | POST | `/api/purchase-orders/{id:int}/cancel` | PURCHASE_UPDATE |  | feat-purchase-orders |
| 7 | POST | `/api/purchase-orders/{id:int}/finish` | PURCHASE_UPDATE |  | feat-purchase-orders |
| 8 | POST | `/api/purchase-orders/{id:int}/receive` | PURCHASE_CREATE |  | feat-purchase-orders, feat-purchase |
| 9 | PATCH | `/api/purchase-orders/{id:int}/notes` | PURCHASE_UPDATE |  | feat-purchase-orders |
| 10 | POST | `/api/purchase-orders/merge` | PURCHASE_UPDATE |  | feat-purchase-orders |

## PurchaseReturns

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/purchasereturns` | PURCHASE_READ |  | feat-purchase-returns |
| 2 | GET | `/api/purchasereturns/{id:int}` | PURCHASE_READ |  | feat-purchase-returns, feat-purchase, feat-suppliers, feat-goods |
| 3 | GET | `/api/purchasereturns/source/{grId:int}` | PURCHASE_READ |  | feat-purchase-returns |
| 4 | POST | `/api/purchasereturns` | PURCHASE_CREATE |  | feat-purchase-returns |
| 5 | PUT | `/api/purchasereturns/{id:int}` | PURCHASE_UPDATE |  | feat-purchase-returns |
| 6 | POST | `/api/purchasereturns/{id:int}/refunds` | FIN_CREATE |  | feat-purchase-returns |
| 7 | PATCH | `/api/purchasereturns/{id:int}/cancel` | PURCHASE_UPDATE |  | feat-purchase-returns |

## Purchases

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/purchases` | PURCHASE_READ |  | feat-purchase |
| 2 | GET | `/api/purchases/{id}` | PURCHASE_READ |  | feat-purchase, feat-purchase-orders, feat-purchase-returns, feat-suppliers, feat-goods |
| 3 | POST | `/api/purchases` | PURCHASE_CREATE |  | feat-purchase, feat-purchase-orders |
| 4 | PUT | `/api/purchases/{id}` | PURCHASE_UPDATE |  | feat-purchase, feat-purchase-orders |
| 5 | PATCH | `/api/purchases/{id}/complete` | PURCHASE_CREATE |  | feat-purchase, feat-purchase-orders |
| 6 | PATCH | `/api/purchases/{id}/cancel` | PURCHASE_UPDATE |  | feat-purchase |

## Roles

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/roles/feature-matrix` |  | ADMIN |  |
| 2 | PUT | `/api/roles/feature-matrix` |  | ADMIN |  |
| 3 | GET | `/api/roles/my-features` |  |  |  |
| 4 | GET | `/api/roles` | AUTH_READ |  | feat-roles, feat-role-matrix, feat-staff, feat-dashboard |
| 5 | POST | `/api/roles` |  | ADMIN |  |
| 6 | GET | `/api/roles/{roleCode}/permissions` |  | ADMIN |  |
| 7 | PUT | `/api/roles/{roleIdOrCode}` |  | ADMIN |  |
| 8 | DELETE | `/api/roles/{roleIdOrCode}` |  | ADMIN |  |
| 9 | PUT | `/api/roles/{roleCode}/permissions` |  | ADMIN |  |

## SalesBookings

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/sales-bookings` | SALES_READ |  | feat-sales-booking, feat-pos |
| 2 | GET | `/api/sales-bookings/reserved` | SALES_READ |  | feat-sales-booking, feat-pos |
| 3 | GET | `/api/sales-bookings/{id:int}` | SALES_READ |  | feat-sales-booking, feat-pos, feat-invoices, feat-customers |
| 4 | POST | `/api/sales-bookings` | SALES_CREATE |  | feat-sales-booking |
| 5 | PUT | `/api/sales-bookings/{id:int}` | SALES_UPDATE |  | feat-sales-booking |
| 6 | PATCH | `/api/sales-bookings/{id:int}/info` | SALES_UPDATE |  | feat-sales-booking |
| 7 | POST | `/api/sales-bookings/{id:int}/cancel` | SALES_DELETE |  | feat-sales-booking |
| 8 | POST | `/api/sales-bookings/merge` | SALES_UPDATE |  | feat-sales-booking |

## SalesReturns

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/sales-returns` | SALES_READ |  | feat-sales-returns |
| 2 | GET | `/api/sales-returns/{id:int}` | SALES_READ |  | feat-sales-returns, feat-invoices, feat-customers, feat-goods |
| 3 | GET | `/api/sales-returns/source/{invoiceId:int}` | SALES_READ |  | feat-sales-returns |
| 4 | POST | `/api/sales-returns` | SALES_CREATE |  | feat-sales-returns |
| 5 | POST | `/api/sales-returns/{id:int}/cancel` | SALES_DELETE |  | feat-sales-returns |
| 6 | POST | `/api/sales-returns/{id:int}/refunds` | SALES_UPDATE |  | feat-sales-returns |
| 7 | PATCH | `/api/sales-returns/{id:int}/notes` | SALES_UPDATE |  | feat-sales-returns |

## Staff

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/staff` | AUTH_READ |  | feat-staff, feat-dashboard, feat-price-books, feat-warehouse-perms |
| 2 | POST | `/api/staff` |  | ADMIN |  |
| 3 | PUT | `/api/staff/{id}` |  | ADMIN |  |
| 4 | PUT | `/api/staff/{id}/toggle-status` |  | ADMIN |  |
| 5 | POST | `/api/staff/{id}/reset-password` |  | ADMIN |  |

## Stocktakes

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/stocktakes` | STOCK_READ |  | feat-stocktake |
| 2 | GET | `/api/stocktakes/{id:int}` | STOCK_READ |  | feat-stocktake, feat-goods |
| 3 | POST | `/api/stocktakes` | STOCK_CREATE |  | feat-stocktake |
| 4 | PUT | `/api/stocktakes/{id:int}` | STOCK_UPDATE |  | feat-stocktake |
| 5 | POST | `/api/stocktakes/{id:int}/cancel` | STOCK_UPDATE |  | feat-stocktake |
| 6 | POST | `/api/stocktakes/merge` | STOCK_CREATE |  | feat-stocktake |

## Suppliers

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/suppliers` | PARTNER_READ |  | feat-suppliers, feat-purchase, feat-purchase-orders, feat-purchase-returns |
| 2 | GET | `/api/suppliers/warehouses` |  |  |  |
| 3 | GET | `/api/suppliers/{id}` | PARTNER_READ |  | feat-suppliers |
| 4 | POST | `/api/suppliers` | PARTNER_CREATE |  | feat-suppliers, feat-purchase, feat-purchase-orders |
| 5 | PUT | `/api/suppliers/{id}` | PARTNER_UPDATE |  | feat-suppliers |
| 6 | PATCH | `/api/suppliers/{id}/toggle-status` | PARTNER_UPDATE |  | feat-suppliers |
| 7 | POST | `/api/suppliers/{id}/payments` | FIN_CREATE |  | feat-suppliers |
| 8 | POST | `/api/suppliers/{id}/debt-adjustments` | FIN_CREATE |  | feat-suppliers |
| 9 | GET | `/api/suppliers/{id}/debt-adjustments/{code}` | PARTNER_READ |  | feat-suppliers |
| 10 | PUT | `/api/suppliers/{id}/debt-adjustments/{code}` | FIN_UPDATE |  | feat-suppliers |
| 11 | POST | `/api/suppliers/{id}/debt-adjustments/{code}/cancel` | FIN_UPDATE |  | feat-suppliers |
| 12 | DELETE | `/api/suppliers/{id}` | PARTNER_DELETE |  | feat-suppliers |

## Transfers

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/transfers` | STOCK_READ |  | feat-transfers |
| 2 | GET | `/api/transfers/products-for-transfer` | STOCK_READ |  | feat-transfers, feat-stocktake, feat-disposal |
| 3 | GET | `/api/transfers/{id}` | STOCK_READ |  | feat-transfers, feat-goods |
| 4 | POST | `/api/transfers` | STOCK_CREATE |  | feat-transfers |
| 5 | PUT | `/api/transfers/{id}` | STOCK_UPDATE |  | feat-transfers |
| 6 | PUT | `/api/transfers/{id}/notes` | STOCK_UPDATE |  | feat-transfers |
| 7 | POST | `/api/transfers/{id}/complete` | STOCK_UPDATE |  | feat-transfers |
| 8 | POST | `/api/transfers/{id}/receive` | STOCK_UPDATE |  | feat-transfers |
| 9 | POST | `/api/transfers/{id}/cancel` | STOCK_UPDATE |  | feat-transfers |

## WarehousePermissions

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/warehousepermissions` | AUTH_READ |  | feat-warehouse-perms |
| 2 | GET | `/api/warehousepermissions/facilities` |  |  |  |
| 3 | PUT | `/api/warehousepermissions/{userId}` |  | ADMIN |  |
| 4 | POST | `/api/warehousepermissions/facilities` |  | ADMIN |  |
| 5 | PUT | `/api/warehousepermissions/facilities/{warehouseId}` |  | ADMIN |  |

## Warehouses

| # | Method | Đường dẫn | Quyền | Khác | Feature |
|---|---|---|---|---|---|
| 1 | GET | `/api/warehouses` |  |  |  |
| 2 | GET | `/api/warehouses/my-warehouses` |  |  |  |
| 3 | GET | `/api/warehouses/{id}` |  |  |  |
| 4 | POST | `/api/warehouses` |  | ADMIN |  |
| 5 | PUT | `/api/warehouses/{id}` |  | ADMIN |  |
| 6 | PATCH | `/api/warehouses/{id}/toggle-status` |  | ADMIN |  |
| 7 | DELETE | `/api/warehouses/{id}` |  | ADMIN |  |
