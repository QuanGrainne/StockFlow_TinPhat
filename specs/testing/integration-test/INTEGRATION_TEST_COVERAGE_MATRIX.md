# Integration Test – Ma trận bao phủ

> Ngày: 23/11/2026. Lấy từ code test và TRX lượt chạy toàn bộ (2026-11-23 09:16:57 → 2026-11-23 09:34:36). Chưa ghi Round 1 vào workbook (chờ duyệt).

| Người | TC | Đã triển khai | Đã chạy | Passed | Failed | N/A (E2E) | Đạt / chạy được |
|---|---|---|---|---|---|---|---|
| DatTD | 40 | 40 | 40 | 33 | 7 | 0 | 82.50% |
| NinhHQ | 40 | 40 | 40 | 36 | 4 | 0 | 90.00% |
| LucDT | 102 | 102 | 101 | 84 | 17 | 1 | 83.17% |
| TamDM | 42 | 42 | 42 | 32 | 10 | 0 | 76.19% |
| QuanDN | 27 | 27 | 25 | 24 | 1 | 2 | 96.00% |
| **Tổng** | **251** | **251** | **248** | **209** | **39** | **3** | **84.27%** |
| Ca bổ sung | 10 | 10 | 10 | 10 | 0 | 0 | 100.00% |

| TC | UC / BR | Module | Người | File test | Phương thức | Triển khai | Thực thi | Kết quả | Phân loại khi Fail | s |
|---|---|---|---|---|---|---|---|---|---|---|
| INT-PRD-01-01 | UC-52, UC-73 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_01_01_AddStock | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-PRD-01-02 | UC-52, UC-73 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_01_02_SetLower | Đã triển khai | Đã chạy | Passed |  | 0.9 |
| INT-PRD-01-03 | UC-52, UC-73 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_01_03_SetSame | Đã triển khai | Đã chạy | Passed |  | 0.7 |
| INT-PRD-01-04 | UC-52, UC-73 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_01_04_Negative | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-PRD-01-05 | UC-52, UC-73 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_01_05_WarehouseNotAssigned | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 0.4 |
| INT-PRD-01-06 | UC-52, UC-73 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_01_06_StockCard | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-PRD-02-01 | UC-52 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_02_01_ImportNew | Đã triển khai | Đã chạy | Passed (phần backend) |  | 0.9 |
| INT-PRD-02-02 | UC-52 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_02_02_UpdateExisting | Đã triển khai | Đã chạy | Passed (phần backend) |  | 0.7 |
| INT-PRD-02-03 | UC-52 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_02_03_SameCodeDifferentName | Đã triển khai | Đã chạy | Passed (phần backend) |  | 0.5 |
| INT-PRD-02-04 | UC-52 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_02_04_EmptyFile | Đã triển khai | Đã chạy | Passed |  | 0.1 |
| INT-PRD-02-05 | UC-52 | MasterData – Hàng hóa | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRD_02_05_NoPermission | Đã triển khai | Đã chạy | Passed |  | 0.2 |
| INT-PRB-03-01 | UC-52 (price books | MasterData – Bảng giá | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRB_03_01_Create | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 0.2 |
| INT-PRB-03-02 | UC-52 (price books | MasterData – Bảng giá | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRB_03_02_StartAfterEnd | Đã triển khai | Đã chạy | Passed |  | 0.1 |
| INT-PRB-03-03 | UC-52 (price books | MasterData – Bảng giá | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRB_03_03_ApplyFormula | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 1.0 |
| INT-PRB-03-04 | UC-52 (price books | MasterData – Bảng giá | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRB_03_04_NegativeValue | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 0.8 |
| INT-PRB-03-05 | UC-52 (price books | MasterData – Bảng giá | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRB_03_05_PosUsesPriceBook | Đã triển khai | Đã chạy | Passed (phần backend) |  | 1.0 |
| INT-PRB-03-06 | UC-52 (price books | MasterData – Bảng giá | DatTD | `MasterData/ProductAndPriceBookTests.cs` | INT_PRB_03_06_DeleteDefault | Đã triển khai | Đã chạy | Passed |  | 0.2 |
| INT-FIN-04-01 | UC-84, UC-29 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_04_01_ReceiptAllocated | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 1.4 |
| INT-FIN-04-02 | UC-84, UC-29 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_04_02_ReceiptAboveDebt | Đã triển khai | Đã chạy | Passed |  | 1.2 |
| INT-FIN-04-03 | UC-84, UC-29 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_04_03_AllocationAbove | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-FIN-04-04 | UC-84, UC-29 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_04_04_CancelReceipt | Đã triển khai | Đã chạy | Passed |  | 1.9 |
| INT-FIN-04-05 | UC-84, UC-29 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_04_05_CancelTwice | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-FIN-04-06 | UC-84, UC-29 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_04_06_DebtAdjustment | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-FIN-05-01 | UC-85, UC-71 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_05_01_PayPart | Đã triển khai | Đã chạy | Passed |  | 1.2 |
| INT-FIN-05-02 | UC-85, UC-71 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_05_02_PayFull | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-FIN-05-03 | UC-85, UC-71 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_05_03_Overpay | Đã triển khai | Đã chạy | Passed |  | 0.9 |
| INT-FIN-05-04 | UC-85, UC-71 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_05_04_PaidReceiptCannotBeCancelled | Đã triển khai | Đã chạy | Passed |  | 1.9 |
| INT-FIN-05-05 | UC-85, UC-71 | Finance – Công nợ | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_FIN_05_05_SameValueAdjustment | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-CRD-06-01 | UC-27, UC-64, BR-12, BR-13 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_06_01_PosBlocked | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 1.0 |
| INT-CRD-06-02 | UC-27, UC-64, BR-12, BR-13 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_06_02_SendRequest | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-CRD-06-03 | UC-27, UC-64, BR-12, BR-13 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_06_03_RequestNotNeeded | Đã triển khai | Đã chạy | Passed |  | 0.4 |
| INT-CRD-06-04 | UC-27, UC-64, BR-12, BR-13 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_06_04_ManagerApproves | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 0.8 |
| INT-CRD-06-05 | UC-27, UC-64, BR-12, BR-13 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_06_05_PosAfterApproval | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-CRD-06-06 | UC-27, UC-64, BR-12, BR-13 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_06_06_RejectWithoutReason | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-CRD-06-07 | UC-27, UC-64, BR-12, BR-13 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_06_07_DecisionTwice | Đã triển khai | Đã chạy | Passed |  | 1.5 |
| INT-CRD-07-01 | UC-55, UC-66 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_07_01_SetLimit | Đã triển khai | Đã chạy | Passed |  | 0.4 |
| INT-CRD-07-02 | UC-55, UC-66 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_07_02_BatchPercent | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-CRD-07-03 | UC-55, UC-66 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_07_03_MissingReason | Đã triển khai | Đã chạy | Passed |  | 0.1 |
| INT-CRD-07-04 | UC-55, UC-66 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_07_04_DefaultLimitForNewCustomers | Đã triển khai | Đã chạy | Passed |  | 0.7 |
| INT-CRD-07-05 | UC-55, UC-66 | Finance – Hạn mức tín dụng | DatTD | `Finance/FinanceAndCreditTests.cs` | INT_CRD_07_05_InvalidWarningDays | Đã triển khai | Đã chạy | Passed |  | 0.2 |
| INT-POS-08-01 | UC-35 (POS | Sales – POS | NinhHQ | `Sales/Pos/PosCashSaleTests.cs` | INT_POS_08_01_CashSale | Đã triển khai | Đã chạy | Passed |  | 1.3 |
| INT-POS-08-02 | UC-35 (POS | Sales – POS | NinhHQ | `Sales/Pos/PosCashSaleTests.cs` | INT_POS_08_02_VietQrSale | Đã triển khai | Đã chạy | Passed (phần backend) |  | 1.0 |
| INT-POS-08-03 | UC-35 (POS | Sales – POS | NinhHQ | `Sales/Pos/PosCashSaleTests.cs` | INT_POS_08_03_WalkInOnDebt | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-POS-08-04 | UC-35 (POS | Sales – POS | NinhHQ | `Sales/Pos/PosCashSaleTests.cs` | INT_POS_08_04_ProductStopped | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-POS-08-05 | UC-35 (POS | Sales – POS | NinhHQ | `Sales/Pos/PosCashSaleTests.cs` | INT_POS_08_05_WarehouseNotAssigned | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 0.6 |
| INT-POS-08-06 | UC-35 (POS | Sales – POS | NinhHQ | `Sales/Pos/PosCashSaleTests.cs` | INT_POS_08_06_CancelInvoice | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-POS-09-01 | BR-12, UC-29 | Sales – POS | NinhHQ | `Sales/Pos/PosDebtSaleTests.cs` | INT_POS_09_01_DebtSaleWithinLimit | Đã triển khai | Đã chạy | Passed |  | 1.2 |
| INT-POS-09-02 | BR-12, UC-29 | Sales – POS | NinhHQ | `Sales/Pos/PosDebtSaleTests.cs` | INT_POS_09_02_PartialPayment | Đã triển khai | Đã chạy | Passed |  | 1.2 |
| INT-POS-09-03 | BR-12, UC-29 | Sales – POS | NinhHQ | `Sales/Pos/PosDebtSaleTests.cs` | INT_POS_09_03_CustomerLimitZero | Đã triển khai | Đã chạy | Passed |  | 0.9 |
| INT-POS-09-04 | BR-12, UC-29 | Sales – POS | NinhHQ | `Sales/Pos/PosDebtSaleTests.cs` | INT_POS_09_04_LimitUsedUp | Đã triển khai | Đã chạy | Passed |  | 0.9 |
| INT-POS-09-05 | BR-12, UC-29 | Sales – POS | NinhHQ | `Sales/Pos/PosDebtSaleTests.cs` | INT_POS_09_05_AboveRemainingLimit | Đã triển khai | Đã chạy | Passed |  | 0.9 |
| INT-POS-09-06 | BR-12, UC-29 | Sales – POS | NinhHQ | `Sales/Pos/PosDebtSaleTests.cs` | INT_POS_09_06_InactiveCustomer | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-POS-10-01 | UC-73, Order settings A2/A3 | Sales – POS | NinhHQ | `Sales/Pos/PosStockPolicyTests.cs` | INT_POS_10_01_SellWithinAvailable | Đã triển khai | Đã chạy | Passed |  | 1.5 |
| INT-POS-10-02 | UC-73, Order settings A2/A3 | Sales – POS | NinhHQ | `Sales/Pos/PosStockPolicyTests.cs` | INT_POS_10_02_SellReservedQuantity | Đã triển khai | Đã chạy | Passed |  | 1.3 |
| INT-POS-10-03 | UC-73, Order settings A2/A3 | Sales – POS | NinhHQ | `Sales/Pos/PosStockPolicyTests.cs` | INT_POS_10_03_OutOfStock | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 1.6 |
| INT-POS-10-04 | UC-73, Order settings A2/A3 | Sales – POS | NinhHQ | `Sales/Pos/PosStockPolicyTests.cs` | INT_POS_10_04_ReservedQuantityApi | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-POS-10-05 | UC-73, Order settings A2/A3 | Sales – POS | NinhHQ | `Sales/Pos/PosStockPolicyTests.cs` | INT_POS_10_05_SettingAllowsOutOfStock | Đã triển khai | Đã chạy | Passed |  | 1.8 |
| INT-SBK-11-01 | UC-18..UC-22, BR-08 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/SalesBookingDepositTests.cs` | INT_SBK_11_01_CreateBookingWithDeposit | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-SBK-11-02 | UC-18..UC-22, BR-08 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/SalesBookingDepositTests.cs` | INT_SBK_11_02_DepositAboveTotal | Đã triển khai | Đã chạy | Passed |  | 0.7 |
| INT-SBK-11-03 | UC-18..UC-22, BR-08 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/SalesBookingDepositTests.cs` | INT_SBK_11_03_EditBooking | Đã triển khai | Đã chạy | Passed |  | 1.8 |
| INT-SBK-11-04 | UC-18..UC-22, BR-08 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/SalesBookingDepositTests.cs` | INT_SBK_11_04_ChangeCustomerAfterDeposit | Đã triển khai | Đã chạy | Passed |  | 1.1 |
| INT-SBK-11-05 | UC-18..UC-22, BR-08 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/SalesBookingDepositTests.cs` | INT_SBK_11_05_CancelAndRefund | Đã triển khai | Đã chạy | Passed |  | 1.3 |
| INT-SBK-11-06 | UC-18..UC-22, BR-08 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/SalesBookingDepositTests.cs` | INT_SBK_11_06_BranchNotAssigned | Đã triển khai | Đã chạy | Passed |  | 1.5 |
| INT-SBK-12-01 | UC-23, UC-24, BR-09 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/MergeSalesBookingsTests.cs` | INT_SBK_12_01_MergeTwoBookings | Đã triển khai | Đã chạy | Passed |  | 2.0 |
| INT-SBK-12-02 | UC-23, UC-24, BR-09 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/MergeSalesBookingsTests.cs` | INT_SBK_12_02_DifferentCustomers | Đã triển khai | Đã chạy | Passed |  | 2.2 |
| INT-SBK-12-03 | UC-23, UC-24, BR-09 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/MergeSalesBookingsTests.cs` | INT_SBK_12_03_DifferentBranches | Đã triển khai | Đã chạy | Passed |  | 2.1 |
| INT-SBK-12-04 | UC-23, UC-24, BR-09 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/MergeSalesBookingsTests.cs` | INT_SBK_12_04_OnlyOneBooking | Đã triển khai | Đã chạy | Passed |  | 1.5 |
| INT-SBK-12-05 | UC-23, UC-24, BR-09 | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/MergeSalesBookingsTests.cs` | INT_SBK_12_05_BookingAlreadyInvoiced | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 2.3 |
| INT-SBK-13-01 | UC-35, UC-36 (as implemented | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/BookingToInvoiceTests.cs` | INT_SBK_13_01_InvoiceWholeBooking | Đã triển khai | Đã chạy | Passed (phần backend) |  | 1.7 |
| INT-SBK-13-02 | UC-35, UC-36 (as implemented | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/BookingToInvoiceTests.cs` | INT_SBK_13_02_InvoiceForAnotherCustomer | Đã triển khai | Đã chạy | Passed |  | 1.5 |
| INT-SBK-13-03 | UC-35, UC-36 (as implemented | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/BookingToInvoiceTests.cs` | INT_SBK_13_03_InvoiceFromAnotherBranch | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 1.0 |
| INT-SBK-13-04 | UC-35, UC-36 (as implemented | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/BookingToInvoiceTests.cs` | INT_SBK_13_04_CancelledBooking | Đã triển khai | Đã chạy | Passed |  | 1.6 |
| INT-SBK-13-05 | UC-35, UC-36 (as implemented | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/BookingToInvoiceTests.cs` | INT_SBK_13_05_DepositReceiptLocked | Đã triển khai | Đã chạy | Passed |  | 1.9 |
| INT-SRT-14-01 | UC-41, UC-79..UC-82, BR-18, BR-19 | Sales – Trả hàng | NinhHQ | `Sales/Returns/SalesReturnRefundTests.cs` | INT_SRT_14_01_ReturnPartOfInvoice | Đã triển khai | Đã chạy | Passed |  | 1.9 |
| INT-SRT-14-02 | UC-41, UC-79..UC-82, BR-18, BR-19 | Sales – Trả hàng | NinhHQ | `Sales/Returns/SalesReturnRefundTests.cs` | INT_SRT_14_02_ReturnAboveRemaining | Đã triển khai | Đã chạy | Passed |  | 2.1 |
| INT-SRT-14-03 | UC-41, UC-79..UC-82, BR-18, BR-19 | Sales – Trả hàng | NinhHQ | `Sales/Returns/SalesReturnRefundTests.cs` | INT_SRT_14_03_ProductNotInInvoice | Đã triển khai | Đã chạy | Passed |  | 2.0 |
| INT-SRT-14-04 | UC-41, UC-79..UC-82, BR-18, BR-19 | Sales – Trả hàng | NinhHQ | `Sales/Returns/SalesReturnRefundTests.cs` | INT_SRT_14_04_RefundToWalkIn | Đã triển khai | Đã chạy | Passed |  | 2.0 |
| INT-SRT-14-05 | UC-41, UC-79..UC-82, BR-18, BR-19 | Sales – Trả hàng | NinhHQ | `Sales/Returns/SalesReturnRefundTests.cs` | INT_SRT_14_05_RefundLater | Đã triển khai | Đã chạy | Passed |  | 1.9 |
| INT-SRT-14-06 | UC-41, UC-79..UC-82, BR-18, BR-19 | Sales – Trả hàng | NinhHQ | `Sales/Returns/SalesReturnRefundTests.cs` | INT_SRT_14_06_CancelReturn | Đã triển khai | Đã chạy | Passed |  | 2.1 |
| INT-SRT-14-07 | UC-41, UC-79..UC-82, BR-18, BR-19 | Sales – Trả hàng | NinhHQ | `Sales/Returns/SalesReturnRefundTests.cs` | INT_SRT_14_07_InvoiceWithActiveReturn | Đã triển khai | Đã chạy | Passed |  | 1.9 |
| INT-TRF-40-01 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TwoStepTransferTests.cs` | INT_TRF_40_01_CreateDraft | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-TRF-40-02 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TwoStepTransferTests.cs` | INT_TRF_40_02_FullFlow | Đã triển khai | Đã chạy | Passed |  | 2.6 |
| INT-TRF-40-03 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TwoStepTransferTests.cs` | INT_TRF_40_03_DispatchTwice | Đã triển khai | Đã chạy | Passed |  | 1.3 |
| INT-TRF-40-04 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TwoStepTransferTests.cs` | INT_TRF_40_04_ReceiveDraft | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-TRF-40-05 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TwoStepTransferTests.cs` | INT_TRF_40_05_DispatchWithoutSourceAccess | Đã triển khai | Đã chạy | Passed |  | 1.1 |
| INT-TRF-40-06 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TwoStepTransferTests.cs` | INT_TRF_40_06_ReceiveWithoutDestAccess | Đã triển khai | Đã chạy | Passed |  | 1.6 |
| INT-TRF-40-07 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TwoStepTransferTests.cs` | INT_TRF_40_07_ReceivedDateBeforeTransferDate | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-TRF-40-08 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TwoStepTransferTests.cs` | INT_TRF_40_08_SameWarehouse | Đã triển khai | Đã chạy | Passed |  | 0.4 |
| INT-TRF-41-01 | UC-38, BR-41 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_41_01_ShortWithNote | Đã triển khai | Đã chạy | Passed |  | 1.9 |
| INT-TRF-41-02 | UC-38, BR-41 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_41_02_ShortWithoutNote | Đã triển khai | Đã chạy | Passed |  | 1.4 |
| INT-TRF-41-03 | UC-38, BR-41 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_41_03_ShortWithWhitespaceNote | Đã triển khai | Đã chạy | Passed |  | 1.3 |
| INT-TRF-41-04 | UC-38, BR-41 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_41_04_ShortByOne | Đã triển khai | Đã chạy | Passed |  | 1.4 |
| INT-TRF-41-05 | UC-38, BR-41 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_41_05_EqualNoNote | Đã triển khai | Đã chạy | Passed |  | 2.0 |
| INT-TRF-41-06 | UC-38, BR-41 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_41_06_ZeroWithNote | Đã triển khai | Đã chạy | Passed |  | 2.2 |
| INT-TRF-41-07 | UC-38, BR-41 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_41_07_Negative | Đã triển khai | Đã chạy | Failed | APPLICATION_BUG / DEF-IT-03 | 1.8 |
| INT-TRF-42-01 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_42_01_AboveDispatched | Đã triển khai | Đã chạy | Failed | APPLICATION_BUG / DEF-IT-02 | 2.2 |
| INT-TRF-42-02 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_42_02_DecimalAbove | Đã triển khai | Đã chạy | Failed | APPLICATION_BUG / DEF-IT-02 | 1.9 |
| INT-TRF-42-03 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_42_03_Equal | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-TRF-42-04 | UC-37, BR-40 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferReceiptQuantityTests.cs` | INT_TRF_42_04_OneLineAbove | Đã triển khai | Đã chạy | Failed | APPLICATION_BUG / DEF-IT-02 | 2.8 |
| INT-TRF-43-01 | team decision 10/11/2026 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_43_01_DispatchAboveStock | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 1.3 |
| INT-TRF-43-02 | team decision 10/11/2026 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_43_02_DispatchFromZero | Đã triển khai | Đã chạy | Passed |  | 1.4 |
| INT-TRF-43-03 | team decision 10/11/2026 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_43_03_EqualStock | Đã triển khai | Đã chạy | Passed |  | 1.3 |
| INT-TRF-43-04 | team decision 10/11/2026 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_43_04_ScreenWarning | Có (Skip – E2E) | Không chạy (E2E) | N/A |  | 0.0 |
| INT-TRF-43-05 | team decision 10/11/2026 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_43_05_CancelAfterOverDispatch | Đã triển khai | Đã chạy | Passed |  | 1.8 |
| INT-TRF-44-01 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_44_01_CancelDraft | Đã triển khai | Đã chạy | Passed |  | 1.2 |
| INT-TRF-44-02 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_44_02_CancelInTransit | Đã triển khai | Đã chạy | Passed |  | 1.8 |
| INT-TRF-44-03 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_44_03_CancelReceived | Đã triển khai | Đã chạy | Passed |  | 2.4 |
| INT-TRF-44-04 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_44_04_CancelShortReceived | Đã triển khai | Đã chạy | Passed |  | 2.8 |
| INT-TRF-44-05 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_44_05_CancelTwice | Đã triển khai | Đã chạy | Passed |  | 1.8 |
| INT-TRF-44-06 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_44_06_CancelWithoutSourceAccess | Đã triển khai | Đã chạy | Passed |  | 1.4 |
| INT-TRF-44-07 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_44_07_CancelReceivedWithoutDestAccess | Đã triển khai | Đã chạy | Passed |  | 2.1 |
| INT-TRF-44-08 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/TransferDispatchAndCancelTests.cs` | INT_TRF_44_08_CancelReasonSaved | Đã triển khai | Đã chạy | Passed |  | 2.2 |
| INT-TRF-45-01 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/ConcurrentTransferTests.cs` | INT_TRF_45_01_TwoReceipts | Đã triển khai | Đã chạy | Failed | TRANSACTION_BUG / DEF-IT-01 | 1.8 |
| INT-TRF-45-02 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/ConcurrentTransferTests.cs` | INT_TRF_45_02_ReceiveAndCancel | Đã triển khai | Đã chạy | Failed | TRANSACTION_BUG / DEF-IT-01 | 2.0 |
| INT-TRF-45-03 | UC-37 | Warehouse – Chuyển kho | LucDT | `Inventory/Transfers/ConcurrentTransferTests.cs` | INT_TRF_45_03_TwoDispatches | Đã triển khai | Đã chạy | Failed | TRANSACTION_BUG / DEF-IT-01 | 1.5 |
| INT-STK-46-01 | UC-39, UC-40 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_46_01_SaveDraft | Đã triển khai | Đã chạy | Passed |  | 0.7 |
| INT-STK-46-02 | UC-39, UC-40 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_46_02_BalanceSurplus | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-STK-46-03 | UC-39, UC-40 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_46_03_BalanceShortage | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-STK-46-04 | UC-39, UC-40 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_46_04_NoDiscrepancy | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-STK-46-05 | UC-39, UC-40 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_46_05_ActualZero | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-STK-46-06 | UC-39, UC-40 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_46_06_SeveralProducts | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-STK-46-07 | UC-39, UC-40 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_46_07_NegativeActual | Đã triển khai | Đã chạy | Passed |  | 0.4 |
| INT-STK-46-08 | UC-39, UC-40 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_46_08_EditBalanced | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-STK-46-09 | UC-39, UC-40 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_46_09_VarianceWithoutReason | Đã triển khai | Đã chạy | Failed | NOT_IMPLEMENTED / DEF-IT-07 | 0.6 |
| INT-STK-46-10 | UC-39, UC-40 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_46_10_NoWarehouseAccess | Đã triển khai | Đã chạy | Passed |  | 0.5 |
| INT-STK-47-01 | UC-39 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_47_01_CancelSurplus | Đã triển khai | Đã chạy | Passed |  | 0.9 |
| INT-STK-47-02 | UC-39 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_47_02_CancelShortage | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-STK-47-03 | UC-39 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_47_03_CancelTwice | Đã triển khai | Đã chạy | Passed |  | 1.1 |
| INT-STK-47-04 | UC-39 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_47_04_CancelDraft | Đã triển khai | Đã chạy | Passed |  | 0.9 |
| INT-STK-47-05 | UC-39 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_47_05_StockChangedAfterBalancing | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-STK-47-06 | UC-39 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/StocktakeTests.cs` | INT_STK_47_06_NoWarehouseAccess | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-STK-48-01 | BR-42 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | INT_STK_48_01_GoodsReceipt | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH / DEF-IT-08 | 1.1 |
| INT-STK-48-02 | BR-42 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | INT_STK_48_02_CompleteDraftReceipt | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH / DEF-IT-08 | 1.7 |
| INT-STK-48-03 | BR-42 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | INT_STK_48_03_PosSale | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH / DEF-IT-08 | 1.7 |
| INT-STK-48-04 | BR-42 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | INT_STK_48_04_TransferDispatch | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH / DEF-IT-08 | 1.8 |
| INT-STK-48-05 | BR-42 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | INT_STK_48_05_TransferReceipt | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH / DEF-IT-08 | 2.2 |
| INT-STK-48-06 | BR-42 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | INT_STK_48_06_PurchaseReturn | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH / DEF-IT-08 | 2.2 |
| INT-STK-48-07 | BR-42 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | INT_STK_48_07_ItemOutsideContinues | Đã triển khai | Đã chạy | Passed |  | 1.6 |
| INT-STK-48-08 | BR-42 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | INT_STK_48_08_OtherWarehouseContinues | Đã triển khai | Đã chạy | Passed |  | 1.5 |
| INT-STK-48-09 | BR-42 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | INT_STK_48_09_AllowedAfterBalancing | Đã triển khai | Đã chạy | Passed |  | 2.0 |
| INT-STK-48-10 | BR-42 | Inventory – Kiểm kho | LucDT | `Inventory/Stocktakes/ActiveStocktakeBlocksMovesTests.cs` | INT_STK_48_10_AllowedAfterCancelling | Đã triển khai | Đã chạy | Passed |  | 1.8 |
| INT-SEC-49-01 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_49_01_ValidToken | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-SEC-49-02 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_49_02_MissingToken | Đã triển khai | Đã chạy | Passed |  | 0.0 |
| INT-SEC-49-03 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_49_03_MalformedToken | Đã triển khai | Đã chạy | Passed |  | 0.0 |
| INT-SEC-49-04 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_49_04_ChangedSignature | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-SEC-49-05 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_49_05_ExpiredToken | Đã triển khai | Đã chạy | Passed |  | 0.0 |
| INT-SEC-49-06 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_49_06_WriteWithoutToken | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-SEC-49-07 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_49_07_LoginWithoutToken | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-SEC-50-01 | BR-02, BR-03 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_50_01_PermissionGranted | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-SEC-50-02 | BR-02, BR-03 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_50_02_CreateWithoutPermission | Đã triển khai | Đã chạy | Passed |  | 0.7 |
| INT-SEC-50-03 | BR-02, BR-03 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_50_03_ReadOnlyCannotUpdate | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-SEC-50-04 | BR-02, BR-03 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_50_04_FeatureNotGranted | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 0.4 |
| INT-SEC-50-05 | BR-02, BR-03 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_50_05_NonAdminCallsAdminApi | Đã triển khai | Đã chạy | Passed |  | 0.4 |
| INT-SEC-50-06 | BR-02, BR-03 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_50_06_AdminCallsAdminApi | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-SEC-50-07 | BR-02, BR-03 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_50_07_SeveralRolesCombined | Đã triển khai | Đã chạy | Passed |  | 2.0 |
| INT-SEC-51-01 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_51_01_RemovePermission | Đã triển khai | Đã chạy | Passed |  | 0.9 |
| INT-SEC-51-02 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_51_02_GrantPermission | Đã triển khai | Đã chạy | Passed |  | 1.4 |
| INT-SEC-51-03 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_51_03_ChangeRole | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-SEC-51-04 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_51_04_LockAccount | Đã triển khai | Đã chạy | Passed |  | 0.5 |
| INT-SEC-51-05 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_51_05_LockedCannotLogin | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-SEC-51-06 | BR-02 | Authorization – API / quyền kho | LucDT | `Authorization/ApiSecurityTests.cs` | INT_SEC_51_06_UnlockAccount | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-SEC-52-01 | BR-04, team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_52_01_ListAssignedOnly | Đã triển khai | Đã chạy | Passed |  | 3.6 |
| INT-SEC-52-02 | BR-04, team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_52_02_OpenOtherWarehouseDoc | Đã triển khai | Đã chạy | Passed |  | 3.1 |
| INT-SEC-52-03 | BR-04, team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_52_03_CreateInOtherWarehouse | Đã triển khai | Đã chạy | Passed |  | 3.6 |
| INT-SEC-52-04 | BR-04, team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_52_04_UpdateOtherWarehouseDoc | Đã triển khai | Đã chạy | Passed |  | 3.5 |
| INT-SEC-52-05 | BR-04, team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_52_05_OnlyDestinationAssigned | Đã triển khai | Đã chạy | Passed |  | 2.3 |
| INT-SEC-52-06 | BR-04, team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_52_06_AdminOnlyTicked | Đã triển khai | Đã chạy | Passed |  | 4.1 |
| INT-SEC-52-07 | BR-04, team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_52_07_InactiveWarehouseHidden | Đã triển khai | Đã chạy | Passed |  | 2.7 |
| INT-SEC-53-01 | team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_53_01_RevokeOne | Đã triển khai | Đã chạy | Passed |  | 2.9 |
| INT-SEC-53-02 | team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_53_02_OpenAfterRevocation | Đã triển khai | Đã chạy | Passed |  | 3.2 |
| INT-SEC-53-03 | team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_53_03_AccountWithNoWarehouse | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-SEC-53-04 | team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_53_04_RevokeLastPurchases | Đã triển khai | Đã chạy | Failed | AUTHORIZATION_BUG / DEF-IT-04 | 90.3 |
| INT-SEC-53-05 | team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_53_05_RevokeLastOtherLists | Đã triển khai | Đã chạy | Passed |  | 4.0 |
| INT-SEC-53-06 | team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_53_06_NoWarehouseCreate | Đã triển khai | Đã chạy | Passed |  | 0.4 |
| INT-SEC-53-07 | team decision 10/11/2026 | Authorization – API / quyền kho | LucDT | `Warehouse/WarehouseIsolationTests.cs` | INT_SEC_53_07_GrantedAgain | Đã triển khai | Đã chạy | Passed |  | 3.1 |
| INT-DSP-29-01 | UC-43, BR-42 | Inventory – Xuất hủy | LucDT | `Inventory/Disposals/InventoryDisposalTests.cs` | INT_DSP_29_01_SaveDraft | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-DSP-29-02 | UC-43, BR-42 | Inventory – Xuất hủy | LucDT | `Inventory/Disposals/InventoryDisposalTests.cs` | INT_DSP_29_02_Complete | Đã triển khai | Đã chạy | Passed |  | 1.4 |
| INT-DSP-29-03 | UC-43, BR-42 | Inventory – Xuất hủy | LucDT | `Inventory/Disposals/InventoryDisposalTests.cs` | INT_DSP_29_03_AboveStock | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-DSP-29-04 | UC-43, BR-42 | Inventory – Xuất hủy | LucDT | `Inventory/Disposals/InventoryDisposalTests.cs` | INT_DSP_29_04_CompleteWithoutReason | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-DSP-29-05 | UC-43, BR-42 | Inventory – Xuất hủy | LucDT | `Inventory/Disposals/InventoryDisposalTests.cs` | INT_DSP_29_05_CancelCompleted | Đã triển khai | Đã chạy | Passed |  | 1.1 |
| INT-DSP-29-06 | UC-43, BR-42 | Inventory – Xuất hủy | LucDT | `Inventory/Disposals/InventoryDisposalTests.cs` | INT_DSP_29_06_WarehouseNotAssigned | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-DSP-29-07 | UC-43, BR-42 | Inventory – Xuất hủy | LucDT | `Inventory/Disposals/InventoryDisposalTests.cs` | INT_DSP_29_07_ActiveStocktakeBlocks | Đã triển khai | Đã chạy | Passed |  | 0.9 |
| INT-PUR-30-01 | UC-30, UC-31, UC-32, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_30_01_ReceivePart | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-PUR-30-02 | UC-30, UC-31, UC-32, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_30_02_ReceiveRest | Đã triển khai | Đã chạy | Passed |  | 2.8 |
| INT-PUR-30-03 | UC-30, UC-31, UC-32, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_30_03_OnlyDefective | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 1.5 |
| INT-PUR-30-04 | UC-30, UC-31, UC-32, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_30_04_ProductNotInOrder | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-PUR-30-05 | UC-30, UC-31, UC-32, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_30_05_FinishPartial | Đã triển khai | Đã chạy | Passed |  | 1.8 |
| INT-PUR-30-06 | UC-30, UC-31, UC-32, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_30_06_PayableIncreases | Đã triển khai | Đã chạy | Passed |  | 1.7 |
| INT-PUR-31-01 | UC-31, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_31_01_SaveDraft | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-PUR-31-02 | UC-31, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_31_02_CompleteDraft | Đã triển khai | Đã chạy | Passed |  | 1.1 |
| INT-PUR-31-03 | UC-31, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_31_03_CompleteTwice | Đã triển khai | Đã chạy | Passed |  | 1.1 |
| INT-PUR-31-04 | UC-31, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_31_04_CancelCompleted | Đã triển khai | Đã chạy | Passed |  | 1.2 |
| INT-PUR-31-05 | UC-31, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_31_05_CancelWithReturn | Đã triển khai | Đã chạy | Passed |  | 1.4 |
| INT-PUR-31-06 | UC-31, BR-26 | Purchasing – Nhập hàng | TamDM | `Purchasing/PurchasingTests.cs` | INT_PUR_31_06_NegativePrice | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-PRT-32-01 | UC-33 | Purchasing – Trả hàng nhập | TamDM | `Purchasing/PurchasingTests.cs` | INT_PRT_32_01_ReturnPart | Đã triển khai | Đã chạy | Passed |  | 1.6 |
| INT-PRT-32-02 | UC-33 | Purchasing – Trả hàng nhập | TamDM | `Purchasing/PurchasingTests.cs` | INT_PRT_32_02_ReturnAboveReceived | Đã triển khai | Đã chạy | Passed |  | 1.5 |
| INT-PRT-32-03 | UC-33 | Purchasing – Trả hàng nhập | TamDM | `Purchasing/PurchasingTests.cs` | INT_PRT_32_03_ReturnFromDraft | Đã triển khai | Đã chạy | Passed |  | 0.8 |
| INT-PRT-32-04 | UC-33 | Purchasing – Trả hàng nhập | TamDM | `Purchasing/PurchasingTests.cs` | INT_PRT_32_04_SupplierRefund | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 1.5 |
| INT-PRT-32-05 | UC-33 | Purchasing – Trả hàng nhập | TamDM | `Purchasing/PurchasingTests.cs` | INT_PRT_32_05_RefundAboveRemaining | Đã triển khai | Đã chạy | Passed |  | 1.3 |
| INT-PRT-32-06 | UC-33 | Purchasing – Trả hàng nhập | TamDM | `Purchasing/PurchasingTests.cs` | INT_PRT_32_06_CancelReturn | Đã triển khai | Đã chạy | Passed |  | 2.0 |
| INT-BOM-33-01 | UC-57, BR-06, BR-30 | Production – BOM | TamDM | `Production/ProductionTests.cs` | INT_BOM_33_01_CreateBom | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-BOM-33-02 | UC-57, BR-06, BR-30 | Production – BOM | TamDM | `Production/ProductionTests.cs` | INT_BOM_33_02_ActivateBom | Đã triển khai | Đã chạy | Passed |  | 1.0 |
| INT-BOM-33-03 | UC-57, BR-06, BR-30 | Production – BOM | TamDM | `Production/ProductionTests.cs` | INT_BOM_33_03_ActivateEmptyBom | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 0.2 |
| INT-BOM-33-04 | UC-57, BR-06, BR-30 | Production – BOM | TamDM | `Production/ProductionTests.cs` | INT_BOM_33_04_DuplicateVersion | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 0.7 |
| INT-BOM-33-05 | UC-57, BR-06, BR-30 | Production – BOM | TamDM | `Production/ProductionTests.cs` | INT_BOM_33_05_EditUsedBom | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 3.7 |
| INT-BOM-33-06 | UC-57, BR-06, BR-30 | Production – BOM | TamDM | `Production/ProductionTests.cs` | INT_BOM_33_06_DeleteUsedBom | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 3.2 |
| INT-PLN-34-01 | UC-58, UC-59 | Production – Kế hoạch | TamDM | `Production/ProductionTests.cs` | INT_PLN_34_01_CreatePlan | Đã triển khai | Đã chạy | Passed |  | 1.9 |
| INT-PLN-34-02 | UC-58, UC-59 | Production – Kế hoạch | TamDM | `Production/ProductionTests.cs` | INT_PLN_34_02_Submit | Đã triển khai | Đã chạy | Passed |  | 1.9 |
| INT-PLN-34-03 | UC-58, UC-59 | Production – Kế hoạch | TamDM | `Production/ProductionTests.cs` | INT_PLN_34_03_ApproveWithoutPermission | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 1.9 |
| INT-PLN-34-04 | UC-58, UC-59 | Production – Kế hoạch | TamDM | `Production/ProductionTests.cs` | INT_PLN_34_04_Approve | Đã triển khai | Đã chạy | Passed |  | 2.5 |
| INT-PLN-34-05 | UC-58, UC-59 | Production – Kế hoạch | TamDM | `Production/ProductionTests.cs` | INT_PLN_34_05_RejectWithReason | Đã triển khai | Đã chạy | Passed |  | 2.4 |
| INT-PLN-34-06 | UC-58, UC-59 | Production – Kế hoạch | TamDM | `Production/ProductionTests.cs` | INT_PLN_34_06_BomDeactivated | Đã triển khai | Đã chạy | Passed |  | 2.5 |
| INT-PLN-34-07 | UC-58, UC-59 | Production – Kế hoạch | TamDM | `Production/ProductionTests.cs` | INT_PLN_34_07_OrderFromPlan | Đã triển khai | Đã chạy | Passed |  | 2.8 |
| INT-MFG-35-01 | UC-44..UC-48, BR-32, BR-35 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_35_01_IssueMaterials | Đã triển khai | Đã chạy | Passed |  | 4.3 |
| INT-MFG-35-02 | UC-44..UC-48, BR-32, BR-35 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_35_02_IssueAboveRequirement | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 3.8 |
| INT-MFG-35-03 | UC-44..UC-48, BR-32, BR-35 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_35_03_IssueAboveStock | Đã triển khai | Đã chạy | Passed |  | 4.1 |
| INT-MFG-35-04 | UC-44..UC-48, BR-32, BR-35 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_35_04_CancelAfterIssue | Đã triển khai | Đã chạy | Passed |  | 4.2 |
| INT-MFG-35-05 | UC-44..UC-48, BR-32, BR-35 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_35_05_IssueToCompletedOrder | Đã triển khai | Đã chạy | Passed |  | 5.1 |
| INT-MFG-35-06 | UC-44..UC-48, BR-32, BR-35 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_35_06_ActiveStocktakeBlocksIssue | Đã triển khai | Đã chạy | Passed |  | 4.1 |
| INT-MFG-36-01 | UC-49, UC-50, UC-61 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_36_01_ReceiveFinishedGoods | Đã triển khai | Đã chạy | Passed |  | 5.3 |
| INT-MFG-36-02 | UC-49, UC-50, UC-61 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_36_02_DefectWithoutReason | Đã triển khai | Đã chạy | Passed |  | 4.1 |
| INT-MFG-36-03 | UC-49, UC-50, UC-61 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_36_03_AboveOrderQuantity | Đã triển khai | Đã chạy | Failed | APPLICATION_BUG / DEF-IT-05 | 4.7 |
| INT-MFG-36-04 | UC-49, UC-50, UC-61 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_36_04_ApproveCompletion | Đã triển khai | Đã chạy | Failed | APPLICATION_BUG / DEF-IT-06 | 5.3 |
| INT-MFG-36-05 | UC-49, UC-50, UC-61 | Production – Lệnh sản xuất | TamDM | `Production/ProductionTests.cs` | INT_MFG_36_05_ApproveNotStarted | Đã triển khai | Đã chạy | Passed |  | 4.0 |
| INT-AUT-37-01 | UC-01, UC-02, BR-01 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_37_01_ValidLogin | Đã triển khai | Đã chạy | Passed |  | 0.5 |
| INT-AUT-37-02 | UC-01, UC-02, BR-01 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_37_02_WrongPassword | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-AUT-37-03 | UC-01, UC-02, BR-01 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_37_03_LockedAccount | Đã triển khai | Đã chạy | Passed |  | 0.2 |
| INT-AUT-37-04 | UC-01, UC-02, BR-01 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_37_04_NoToken | Đã triển khai | Đã chạy | Passed |  | 0.0 |
| INT-AUT-37-05 | UC-01, UC-02, BR-01 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_37_05_ExpiredSessionUi | Có (Skip – E2E) | Không chạy (E2E) | N/A |  | 0.0 |
| INT-AUT-37-06 | UC-01, UC-02, BR-01 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_37_06_TwoTabs | Có (Skip – E2E) | Không chạy (E2E) | N/A |  | 0.0 |
| INT-AUT-38-01 | UC-03, BR-35..BR-37 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_38_01_ChangePassword | Đã triển khai | Đã chạy | Passed (phần backend) |  | 1.3 |
| INT-AUT-38-02 | UC-03, BR-35..BR-37 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_38_02_WrongCurrent | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-AUT-38-03 | UC-03, BR-35..BR-37 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_38_03_WeakPassword | Đã triển khai | Đã chạy | Passed |  | 0.0 |
| INT-AUT-38-04 | UC-03, BR-35..BR-37 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_38_04_SameAsCurrent | Đã triển khai | Đã chạy | Passed |  | 0.0 |
| INT-AUT-38-05 | UC-03, BR-35..BR-37 | Authorization – Đăng nhập | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_AUT_38_05_ConfirmationMismatch | Đã triển khai | Đã chạy | Passed |  | 0.0 |
| INT-ADM-39-01 | UC-04..UC-09, UC-14 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_39_01_CreateStaff | Đã triển khai | Đã chạy | Passed |  | 0.9 |
| INT-ADM-39-02 | UC-04..UC-09, UC-14 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_39_02_DuplicateUsername | Đã triển khai | Đã chạy | Passed |  | 0.6 |
| INT-ADM-39-03 | UC-04..UC-09, UC-14 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_39_03_LockAccount | Đã triển khai | Đã chạy | Passed |  | 1.1 |
| INT-ADM-39-04 | UC-04..UC-09, UC-14 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_39_04_LockAdmin | Đã triển khai | Đã chạy | Passed |  | 0.2 |
| INT-ADM-39-05 | UC-04..UC-09, UC-14 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_39_05_ResetPassword | Đã triển khai | Đã chạy | Passed |  | 1.1 |
| INT-ADM-39-06 | UC-04..UC-09, UC-14 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_39_06_NonAdminCallsStaffApi | Đã triển khai | Đã chạy | Passed |  | 0.5 |
| INT-ADM-40-01 | UC-10..UC-13, BR-02 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_40_01_RemovePermission | Đã triển khai | Đã chạy | Passed |  | 0.7 |
| INT-ADM-40-02 | UC-10..UC-13, BR-02 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_40_02_GiveBack | Đã triển khai | Đã chạy | Passed |  | 1.8 |
| INT-ADM-40-03 | UC-10..UC-13, BR-02 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_40_03_FeatureMatrix | Đã triển khai | Đã chạy | Passed (phần backend) |  | 0.6 |
| INT-ADM-40-04 | UC-10..UC-13, BR-02 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_40_04_DuplicateRole | Đã triển khai | Đã chạy | Passed |  | 0.2 |
| INT-ADM-40-05 | UC-10..UC-13, BR-02 | Authorization – Quản trị | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_ADM_40_05_DeleteRoleInUse | Đã triển khai | Đã chạy | Passed |  | 0.3 |
| INT-SET-41-01 | UC-51 (order settings | Settings – Thiết lập đơn hàng | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_SET_41_01_ChangeCodeRule | Đã triển khai | Đã chạy | Passed |  | 1.3 |
| INT-SET-41-02 | UC-51 (order settings | Settings – Thiết lập đơn hàng | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_SET_41_02_InvalidRule | Đã triển khai | Đã chạy | Passed |  | 0.2 |
| INT-SET-41-03 | UC-51 (order settings | Settings – Thiết lập đơn hàng | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_SET_41_03_PrefixTooLong | Đã triển khai | Đã chạy | Passed |  | 0.2 |
| INT-SET-41-04 | UC-51 (order settings | Settings – Thiết lập đơn hàng | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_SET_41_04_StopNewBookings | Đã triển khai | Đã chạy | Failed | SPEC_CODE_MISMATCH | 1.0 |
| INT-SET-41-05 | UC-51 (order settings | Settings – Thiết lập đơn hàng | QuanDN | `Authorization/AccountAdminSettingsTests.cs` | INT_SET_41_05_NonAdminChangesSettings | Đã triển khai | Đã chạy | Passed |  | 0.2 |
| INT-CRD-06-S01 | Bổ sung | Finance – Hạn mức tín dụng | NinhHQ | `Finance/FinanceAndCreditTests.cs` | INT_CRD_06_S01_ApproveNewLimit | Đã triển khai | Đã chạy | Passed | | 1.0 |
| INT-POS-08-S01 | Bổ sung | Sales – POS | NinhHQ | `Sales/Pos/PosCashSaleTests.cs` | INT_POS_08_S01_RollbackOnFailure | Đã triển khai | Đã chạy | Passed | | 1.3 |
| INT-PRB-03-S01 | Bổ sung | MasterData – Bảng giá | NinhHQ | `MasterData/ProductAndPriceBookTests.cs` | INT_PRB_03_S01_FormulaStoredOnPriceBook | Đã triển khai | Đã chạy | Passed | | 0.9 |
| INT-PRB-03-S02 | Bổ sung | MasterData – Bảng giá | NinhHQ | `MasterData/ProductAndPriceBookTests.cs` | INT_PRB_03_S02_NegativeValueOnSave | Đã triển khai | Đã chạy | Passed | | 0.1 |
| INT-SBK-11-S01 | Bổ sung | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/SalesBookingDepositTests.cs` | INT_SBK_11_S01_RollbackOnDepositFailure | Đã triển khai | Đã chạy | Passed | | 0.8 |
| INT-SBK-12-S01 | Bổ sung | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/MergeSalesBookingsTests.cs` | INT_SBK_12_S01_RollbackOnMergeFailure | Đã triển khai | Đã chạy | Passed | | 2.0 |
| INT-SBK-13-S01 | Bổ sung | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/BookingToInvoiceTests.cs` | INT_SBK_13_S01_RollbackOnInvoiceFailure | Đã triển khai | Đã chạy | Passed | | 1.7 |
| INT-SBK-13-S02 | Bổ sung | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/BookingToInvoiceTests.cs` | INT_SBK_13_S02_DebtConsistency | Đã triển khai | Đã chạy | Passed | | 1.7 |
| INT-SBK-13-S03 | Bổ sung | Sales – Đặt hàng | NinhHQ | `Sales/Bookings/BookingToInvoiceTests.cs` | INT_SBK_13_S03_AnotherBranchWithBothWarehouses | Đã triển khai | Đã chạy | Passed | | 1.6 |
| INT-SRT-14-S01 | Bổ sung | Sales – Trả hàng | NinhHQ | `Sales/Returns/SalesReturnRefundTests.cs` | INT_SRT_14_S01_RollbackOnReturnFailure | Đã triển khai | Đã chạy | Passed | | 1.6 |
