# 02 – Requirement Traceability Matrix

- **Ngày lập:** 19/11/2026. **Người phụ trách:** Ninh. **Giai đoạn:** Phase 2 – Test Strategy & Test Design.
- **Sinh tự động** bằng `node specs/qa/test-design/generate.js` từ `specs/qa/test-design/data/*.js`. Sửa dữ liệu rồi chạy lại, không sửa tay file này.
- **Chưa test nào được chạy trong Phase 2.** Trạng thái "Not Run" nghĩa là đã thiết kế, chưa thực thi; không dùng làm bằng chứng đạt.
- **Nguồn yêu cầu:** Report 3 bản sửa 19/11/2026 (`docs/SEP_490_Group82(bản sao).docx`, bản đã chuẩn bị ở `01d`), kết luận đối chiếu code ở [01a](01a_UC_DOC_SPEC_CODE_MATRIX.md), endpoint ở [01b](01b_API_INVENTORY.md).
- **Cột Status** là trạng thái phủ test: `Đã thiết kế – Not Run` (có test case, chưa chạy), `Blocked` (chỉ có test bị chặn vì thiếu chức năng / điều kiện), `Skipped` (ngoài phạm vi), `CHƯA CÓ TEST`. Không cột nào ghi "Covered" vì Phase 2 chưa chạy test.

## Tổng hợp độ phủ

| Nhóm yêu cầu | Tổng | Đã thiết kế – Not Run | Blocked | Skipped | Chưa có test |
|---|---:|---:|---:|---:|---:|
| Use Case (UC-01 – UC-105) | 105 | 93 | 7 | 5 | 0 |
| Business Rule (dòng trong 5.1) | 61 | 57 | 2 | 2 | 0 |
| Yêu cầu phi chức năng (4.2) | 17 | 14 | 3 | 0 | 0 |
| Luồng liên module | 7 | 7 | 0 | 0 | 0 |
| Endpoint – test chức năng (ghi tên endpoint cụ thể) | 200 | 131 | 0 | 0 | 69 |
| Endpoint – test xác thực / phân quyền tham số hoá (API-SEC-001, API-SEC-003) | 200 | 200 | 0 | 0 | 0 |

## A. Use Case

| Requirement ID | Module | Use Case | Feature | Kết luận code (01a) | Test Case ID | Test Type | Status |
|---|---|---|---|---|---|---|---|
| UC-01 | Xác thực | UC-01 | Login | Cần chạy thử | API-AUTH-001, API-AUTH-002, API-AUTH-004, ST-AUTH-001 | API, System | Đã thiết kế – Not Run |
| UC-02 | Xác thực | UC-02 | Logout | Một phần | API-SEC-009, ST-AUTH-001 | API, System | Đã thiết kế – Not Run |
| UC-03 | Xác thực | UC-03 | Change Password | Khớp | UT-VAL-008, API-AUTH-003, ST-AUTH-002 | Unit, API, System | Đã thiết kế – Not Run |
| UC-04 | Tài khoản | UC-04 | Manage Accounts | Một phần | API-ACC-005, ST-RBAC-001 | API, System | Đã thiết kế – Not Run |
| UC-05 | Tài khoản | UC-05 | View Accounts | Cần chạy thử | API-ACC-005, ST-RBAC-001 | API, System | Đã thiết kế – Not Run |
| UC-06 | Tài khoản | UC-06 | Search Accounts | Cần chạy thử | API-ACC-005, ST-RBAC-001 | API, System | Đã thiết kế – Not Run |
| UC-07 | Tài khoản | UC-07 | Add New Account | Cần chạy thử | UT-VAL-007, API-ACC-001, API-ACC-002 | Unit, API | Đã thiết kế – Not Run |
| UC-08 | Tài khoản | UC-08 | Update Account | Lỗi | API-ACC-003, RT-N01 | API, Regression | Đã thiết kế – Not Run |
| UC-09 | Tài khoản | UC-09 | Activate / Deactivate Account | Cần chạy thử | IT-SEC-003, API-ACC-004 | Integration, API | Đã thiết kế – Not Run |
| UC-10 | Vai trò & quyền | UC-10 | Manage Roles & Permissions | Một phần | ST-RBAC-001 | System | Đã thiết kế – Not Run |
| UC-11 | Vai trò & quyền | UC-11 | View Roles | Cần chạy thử | API-ROLE-003, ST-RBAC-001 | API, System | Đã thiết kế – Not Run |
| UC-12 | Vai trò & quyền | UC-12 | Create / Update Role | Khớp | API-ROLE-001 | API | Đã thiết kế – Not Run |
| UC-13 | Vai trò & quyền | UC-13 | Configure Role Permissions | Cần chạy thử | IT-SEC-002, API-SEC-004, API-ROLE-003 | Integration, API | Đã thiết kế – Not Run |
| UC-14 | Vai trò & quyền | UC-14 | Assign Roles to User | Khớp | API-ROLE-003, ST-RBAC-001 | API, System | Đã thiết kế – Not Run |
| UC-15 | Quyền kho | UC-15 | Manage Warehouse Access | Một phần | API-WHA-001, ST-RBAC-001 | API, System | Đã thiết kế – Not Run |
| UC-16 | Quyền kho | UC-16 | View Warehouse Access | Cần chạy thử | API-WHA-002, ST-RBAC-001 | API, System | Đã thiết kế – Not Run |
| UC-17 | Quyền kho | UC-17 | Assign Warehouse Access | Cần chạy thử | API-WHA-001 | API | Đã thiết kế – Not Run |
| UC-18 | Đặt hàng (booking) | UC-18 | Manage Pending Orders | Khớp | API-BKG-001, ST-SAL-002 | API, System | Đã thiết kế – Not Run |
| UC-19 | Đặt hàng (booking) | UC-19 | Create Pending Order | Cần chạy thử | UT-VAL-006, API-BKG-001, API-BKG-002, ST-SAL-002 | Unit, API, System | Đã thiết kế – Not Run |
| UC-20 | Đặt hàng (booking) | UC-20 | View Pending Orders | Cần chạy thử | ST-SAL-002 | System | Đã thiết kế – Not Run |
| UC-21 | Đặt hàng (booking) | UC-21 | Update Pending Order | Cần chạy thử | IT-CONC-006, API-BKG-003 | Integration, API | Đã thiết kế – Not Run |
| UC-22 | Đặt hàng (booking) | UC-22 | Cancel Pending Order | Cần chạy thử | API-BKG-003, API-BKG-005, RT-N07 | API, Regression | Đã thiết kế – Not Run |
| UC-23 | Bán hàng POS | UC-23 | Consolidate Orders & Process Sales Invoice | Cần chạy thử | UT-VAL-005, IT-SAL-001, IT-SAL-006, IT-SAL-007, IT-SAL-008, IT-SAL-010, IT-CONC-002, ST-SAL-001, ST-SAL-002, RT-N05 | Unit, Integration, System, Regression | Đã thiết kế – Not Run |
| UC-24 | Đặt hàng (booking) | UC-24 | Select Orders to Consolidate | Cần chạy thử | API-BKG-004, ST-SAL-002 | API, System | Đã thiết kế – Not Run |
| UC-25 | Bán hàng POS | UC-25 | Record Customer Payment | Cần chạy thử | IT-SAL-001, API-POS-001, ST-SAL-001 | Integration, API, System | Đã thiết kế – Not Run |
| UC-26 | Bán hàng POS | UC-26 | Generate Payment QR Code | Chưa có code | ST-SAL-004 | System | Blocked |
| UC-27 | Tín dụng & công nợ KH | UC-27 | Request Credit Approval | Khớp | IT-SAL-006, IT-CRD-001, API-CRD-001, ST-SAL-003 | Integration, API, System | Đã thiết kế – Not Run |
| UC-28 | Trả hàng bán | UC-28 | Create Sales Return | Khớp | IT-RET-001, IT-RET-002, IT-RET-003, IT-RET-005, API-RET-001, ST-RET-001 | Integration, API, System | Đã thiết kế – Not Run |
| UC-29 | Tín dụng & công nợ KH | UC-29 | View Customer Debt | Một phần | ST-FIN-001, RT-N14 | System, Regression | Đã thiết kế – Not Run |
| UC-30 | Đặt hàng nhập | UC-30 | Manage Purchase Orders | Khớp | UT-VAL-004, IT-PO-001, IT-PO-002, IT-PO-003, API-PO-001, API-PO-002, ST-PUR-001, RT-N07 | Unit, Integration, API, System, Regression | Đã thiết kế – Not Run |
| UC-31 | Nhập hàng | UC-31 | Process Inbound Goods Receipt | Lệch | IT-INV-001, IT-INV-003, IT-INV-004, IT-INV-005, IT-PO-001, API-GR-001, API-GR-002, ST-PUR-001 | Integration, API, System | Đã thiết kế – Not Run |
| UC-32 | Nhập hàng | UC-32 | Record Defective / Missing Goods | Một phần | IT-INV-002, ST-PUR-001 | Integration, System | Đã thiết kế – Not Run |
| UC-33 | Trả hàng NCC | UC-33 | Return Goods to Supplier | Khớp | IT-PR-001, ST-PUR-002 | Integration, System | Đã thiết kế – Not Run |
| UC-34 | Nhập hàng | UC-34 | Allocate Inbound Costs | Ngoài phạm vi | API-OOS-001 | API | Skipped |
| UC-35 | Bán hàng POS | UC-35 | Process Sales Stock Issue | Cần chạy thử | IT-SAL-001, IT-SAL-002, IT-SAL-003, IT-SAL-004, IT-SAL-005, IT-SAL-009, IT-SAL-011, IT-CONC-001, API-POS-002, ST-SAL-001, RT-N03, RT-N04 | Integration, API, System, Regression | Đã thiết kế – Not Run |
| UC-36 | Bán hàng POS | UC-36 | Adjust Actual Sales Issue Quantity | Cần chạy thử | IT-SAL-007, ST-SAL-002 | Integration, System | Đã thiết kế – Not Run |
| UC-37 | Chuyển kho | UC-37 | Process Stock Transfer | Cần chạy thử | UT-STS-001, UT-STS-002, UT-STS-003, IT-TRF-001, IT-TRF-004, IT-TRF-005, IT-CONC-004, API-TRF-001, ST-TRF-001, RT-N08, RT-N15 | Unit, Integration, API, System, Regression | Đã thiết kế – Not Run |
| UC-38 | Chuyển kho | UC-38 | Record Transfer Discrepancy | Lỗi | IT-TRF-002, IT-TRF-003, ST-TRF-001, RT-N02 | Integration, System, Regression | Đã thiết kế – Not Run |
| UC-39 | Kiểm kê | UC-39 | Conduct Stocktake | Khớp | IT-STK-001, IT-STK-002, IT-STK-003, IT-STK-004, API-STK-001, ST-INV-001 | Integration, API, System | Đã thiết kế – Not Run |
| UC-40 | Kiểm kê | UC-40 | Record Stocktake Discrepancy | Khớp | IT-STK-001, ST-INV-001 | Integration, System | Đã thiết kế – Not Run |
| UC-41 | Trả hàng bán | UC-41 | Process Customer Returns | Một phần | IT-RET-001, IT-RET-004, ST-RET-001 | Integration, System | Đã thiết kế – Not Run |
| UC-42 | Trả hàng bán | UC-42 | Categorize Return Items | Ngoài phạm vi | API-OOS-001 | API | Skipped |
| UC-43 | Huỷ hàng | UC-43 | Process Inventory Disposal | Khớp | UT-STS-004, UT-VAL-010, IT-STK-002, IT-DSP-001, IT-DSP-002, IT-DSP-003, API-DSP-001, ST-INV-001 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| UC-44 | Sản xuất | UC-44 | View Production Orders | Khớp | ST-PRO-001 | System | Đã thiết kế – Not Run |
| UC-45 | Sản xuất | UC-45 | View Material Requirement & Issue Status | Khớp | ST-PRO-001 | System | Đã thiết kế – Not Run |
| UC-46 | Sản xuất | UC-46 | Process Material Stock Issue | Khớp | IT-STK-002, IT-PRO-001, IT-PRO-002, IT-PRO-007, ST-PRO-001 | Integration, System | Đã thiết kế – Not Run |
| UC-47 | Sản xuất | UC-47 | Issue Supplementary Materials | Cần chạy thử | IT-PRO-003, ST-PRO-001 | Integration, System | Đã thiết kế – Not Run |
| UC-48 | Sản xuất | UC-48 | Adjust Actual Material Issue Quantity | Cần chạy thử | IT-PRO-007 | Integration | Đã thiết kế – Not Run |
| UC-49 | Sản xuất | UC-49 | Record Finished Goods Receipt | Khớp | IT-STK-002, IT-PRO-001, IT-PRO-004, API-PRD-002, ST-PRO-001 | Integration, API, System | Đã thiết kế – Not Run |
| UC-50 | Sản xuất | UC-50 | Record Defective Finished Goods | Khớp | ST-PRO-001 | System | Đã thiết kế – Not Run |
| UC-51 | Danh mục | UC-51 | Manage Master Data | Một phần | ST-MST-001 | System | Đã thiết kế – Not Run |
| UC-52 | Danh mục | UC-52 | Manage Product / Material | Một phần | UT-VAL-003, API-SEC-010, API-MST-001, ST-MST-001 | Unit, API, System | Đã thiết kế – Not Run |
| UC-53 | Danh mục | UC-53 | Manage Unit / Conversion | Một phần | ST-MST-001 | System | Đã thiết kế – Not Run |
| UC-54 | Danh mục | UC-54 | Manage Customer / Supplier | Cần chạy thử | API-MST-004, ST-MST-001 | API, System | Đã thiết kế – Not Run |
| UC-55 | Tín dụng & công nợ KH | UC-55 | Set Credit Limit | Khớp | API-CRD-002 | API | Đã thiết kế – Not Run |
| UC-56 | Danh mục | UC-56 | Manage Warehouse & Location | Lệch | ST-MST-001 | System | Đã thiết kế – Not Run |
| UC-57 | Sản xuất | UC-57 | Manage BOM / Material Norm | Khớp | API-MST-003, ST-MST-001 | API, System | Đã thiết kế – Not Run |
| UC-58 | Sản xuất | UC-58 | Manage Production | Khớp | UT-STS-005, API-PRD-001, ST-PRO-001 | Unit, API, System | Đã thiết kế – Not Run |
| UC-59 | Sản xuất | UC-59 | Manage Production Order (extends UC-58) | Khớp | UT-VAL-011, IT-PRO-005, IT-PRO-006 | Unit, Integration | Đã thiết kế – Not Run |
| UC-60 | Sản xuất | UC-60 | Track Production Materials | Cần chạy thử | ST-PRO-001 | System | Đã thiết kế – Not Run |
| UC-61 | Sản xuất | UC-61 | Track Finished Goods Receipt | Khớp | ST-PRO-001 | System | Đã thiết kế – Not Run |
| UC-62 | Tín dụng & công nợ KH | UC-62 | Manage Sales & Credit | Một phần | ST-SAL-003 | System | Đã thiết kế – Not Run |
| UC-63 | Bán hàng POS | UC-63 | Track Sales Orders | Cần chạy thử | API-POS-003, ST-SAL-001 | API, System | Đã thiết kế – Not Run |
| UC-64 | Tín dụng & công nợ KH | UC-64 | Approve Credit Request | Khớp | UT-STS-007, UT-VAL-009, IT-CRD-001, IT-CRD-002, API-CRD-001, ST-SAL-003 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| UC-65 | Bán hàng POS | UC-65 | Track Outbound Fulfillment | Cần chạy thử | ST-SAL-002 | System | Đã thiết kế – Not Run |
| UC-66 | Tín dụng & công nợ KH | UC-66 | View Customer Debt & Overdue | Một phần | ST-FIN-001, RT-N14 | System, Regression | Đã thiết kế – Not Run |
| UC-67 | Nhập hàng | UC-67 | Purchasing & Receiving | Một phần | ST-PUR-001 | System | Đã thiết kế – Not Run |
| UC-68 | Đặt hàng nhập | UC-68 | Track Purchase Orders & Receipts | Cần chạy thử | ST-PUR-001 | System | Đã thiết kế – Not Run |
| UC-69 | Nhập hàng | UC-69 | Track Defective / Returned Goods | Một phần | ST-PUR-002 | System | Đã thiết kế – Not Run |
| UC-70 | Nhập hàng | UC-70 | Track Landed Cost & MAC | Khớp | ST-PUR-001 | System | Đã thiết kế – Not Run |
| UC-71 | Nhà cung cấp | UC-71 | View Supplier Payable | Một phần | ST-PUR-001 | System | Đã thiết kế – Not Run |
| UC-72 | Tồn kho | UC-72 | Manage Inventory | Một phần | ST-INV-001 | System | Đã thiết kế – Not Run |
| UC-73 | Tồn kho | UC-73 | View Multi-Warehouse Inventory | Khớp | API-INV-001, ST-INV-001 | API, System | Đã thiết kế – Not Run |
| UC-74 | Chuyển kho | UC-74 | Track Stock Transfers | Khớp | ST-TRF-001 | System | Đã thiết kế – Not Run |
| UC-75 | Kiểm kê | UC-75 | Approve Stocktake Adjustment | Ngoài phạm vi | API-OOS-001 | API | Skipped |
| UC-76 | Huỷ hàng | UC-76 | Approve Inventory Disposal | Ngoài phạm vi | API-OOS-001 | API | Skipped |
| UC-77 | Tồn kho | UC-77 | View Reorder Point Alerts | Một phần | API-INV-002 | API | Đã thiết kế – Not Run |
| UC-78 | Tồn kho | UC-78 | View Expiry Alerts | Chưa có code | API-INV-003 | API | Blocked |
| UC-79 | Trả hàng bán | UC-79 | Manage Returns | Một phần | ST-RET-001 | System | Đã thiết kế – Not Run |
| UC-80 | Trả hàng bán | UC-80 | Track Return Requests | Khớp | ST-RET-001 | System | Đã thiết kế – Not Run |
| UC-81 | Trả hàng bán | UC-81 | Track Restock / Repair / Scrap | Ngoài phạm vi | API-OOS-001 | API | Skipped |
| UC-82 | Trả hàng bán | UC-82 | Track Refund / Debt Adjustment | Cần chạy thử | IT-RET-004, ST-RET-001 | Integration, System | Đã thiết kế – Not Run |
| UC-83 | Tài chính & báo cáo | UC-83 | Manage Finance & Reports | Một phần | ST-FIN-001 | System | Đã thiết kế – Not Run |
| UC-84 | Tài chính & báo cáo | UC-84 | Create Receipt Voucher | Khớp | IT-FIN-001, IT-FIN-002, IT-FIN-003, IT-CONC-005, ST-FIN-001 | Integration, System | Đã thiết kế – Not Run |
| UC-85 | Nhà cung cấp | UC-85 | Create Payment Voucher | Cần chạy thử | IT-FIN-004, API-SUP-001, API-SUP-002, ST-FIN-001, RT-N07 | Integration, API, System, Regression | Đã thiết kế – Not Run |
| UC-86 | Tài chính & báo cáo | UC-86 | View Debt Report | Chưa có code | API-FIN-001 | API | Blocked |
| UC-87 | Tài chính & báo cáo | UC-87 | View Inventory Report | Chưa có code | API-FIN-001 | API | Blocked |
| UC-88 | Tài chính & báo cáo | UC-88 | View Revenue & Profit Report | Chưa có code | API-FIN-001 | API | Blocked |
| UC-89 | Tài chính & báo cáo | UC-89 | View Cost Report | Chưa có code | API-FIN-001 | API | Blocked |
| UC-90 | Tài chính & báo cáo | UC-90 | View Management Dashboard | Chưa có code | API-FIN-002 | API | Blocked |
| UC-91 | Bảng giá | UC-91 | Manage Price Books | Khớp | UT-VAL-013, API-PB-001 | Unit, API | Đã thiết kế – Not Run |
| UC-92 | Kế hoạch sản xuất | UC-92 | Manage Production Plans | Khớp | UT-PLN-001, UT-STS-006, IT-PRO-001, API-PLN-001 | Unit, Integration, API | Đã thiết kế – Not Run |
| UC-93 | Kế hoạch sản xuất | UC-93 | Create & Submit Production Plan | Khớp | UT-PLN-001, API-PLN-001, ST-PRO-001 | Unit, API, System | Đã thiết kế – Not Run |
| UC-94 | Kế hoạch sản xuất | UC-94 | Approve / Reject Production Plan | Khớp | UT-PLN-001, API-PLN-001, ST-PRO-001 | Unit, API, System | Đã thiết kế – Not Run |
| UC-95 | Kế hoạch sản xuất | UC-95 | Create Production Orders from Plan | Khớp | UT-PLN-001, IT-PRO-001, API-PLN-001, API-PLN-002, ST-PRO-001 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| UC-96 | Kế hoạch sản xuất | UC-96 | Close / Cancel Production Plan | Lệch | UT-PLN-001, API-PLN-001, API-PLN-002, API-PLN-003, API-PLN-004, RT-N07 | Unit, API, Regression | Đã thiết kế – Not Run |
| UC-97 | Cài đặt | UC-97 | Configure Order & Debt-warning Settings | Khớp | UT-CODE-001, IT-SAL-004, IT-RET-005, IT-SET-001, API-SEC-005, API-BKG-002, API-SET-001, ST-SET-001 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| UC-98 | Tài chính & báo cáo | UC-98 | Adjust Customer / Supplier Debt | Khớp | UT-VAL-012, IT-FIN-005, ST-FIN-001 | Unit, Integration, System | Đã thiết kế – Not Run |
| UC-99 | Danh mục | UC-99 | Import Products & Adjust Stock | Khớp | API-MST-002, ST-MST-002 | API, System | Đã thiết kế – Not Run |
| UC-100 | MRP | UC-100 | Plan Material Requirements (MRP) | Khớp (thêm 19/11) | UT-MRP-001, API-MRP-001, API-MRP-002, ST-MRP-001 | Unit, API, System | Đã thiết kế – Not Run |
| UC-101 | MRP | UC-101 | Run MRP | Khớp (thêm 19/11) | UT-MRP-001, UT-VAL-001, UT-VAL-002, IT-MRP-001, API-MRP-001, ST-MRP-001 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| UC-102 | MRP | UC-102 | View Material Requirements by Period | Khớp (thêm 19/11) | API-MRP-001, ST-MRP-001 | API, System | Đã thiết kế – Not Run |
| UC-103 | MRP | UC-103 | View Material Shortages | Khớp (thêm 19/11) | API-MRP-001, ST-MRP-001 | API, System | Đã thiết kế – Not Run |
| UC-104 | MRP | UC-104 | View Projected Stock | Khớp (thêm 19/11) | UT-MRP-001, API-MRP-001, ST-MRP-001 | Unit, API, System | Đã thiết kế – Not Run |
| UC-105 | MRP | UC-105 | Order Materials from MRP Suggestions | Khớp (thêm 19/11) | API-MRP-001, ST-MRP-001 | API, System | Đã thiết kế – Not Run |

## B. Business Rule

| Requirement ID | Nội dung (rút gọn) | Use Case | Test Case ID | Test Type | Status |
|---|---|---|---|---|---|
| BR-01 | Only Active accounts can log in. | UC-01, UC-09, UC-02 | API-AUTH-001, API-AUTH-002, API-ACC-004, ST-AUTH-001 | API, System | Đã thiết kế – Not Run |
| BR-02 | Every function is controlled by permissions (RBAC). | UC-13, UC-22, UC-30, UC-85, UC-96, UC-100, UC-04, UC-05, UC-06, UC-10, UC-11, UC-14, UC-15, UC-16 | IT-SEC-002, API-SEC-001, API-SEC-003, API-SEC-004, API-BKG-005, API-PO-002, API-SUP-001, API-PLN-003, API-MRP-002, ST-RBAC-001, ST-RBAC-002, ST-RBAC-003, ST-RBAC-004, ST-RBAC-005, RT-N07 | Integration, API, System, Regression | Đã thiết kế – Not Run |
| BR-03 | Only the Admin can create or update roles, add or remove functions of a role, set the role of an account, assign warehouses to an account and maint… | UC-11, UC-13, UC-14, UC-07, UC-12, UC-15, UC-17, UC-04, UC-05, UC-06, UC-10, UC-16 | API-SEC-003, API-ROLE-003, API-ACC-002, API-ROLE-001, API-ROLE-002, API-WHA-001, ST-RBAC-001, ST-RBAC-002 | API, System | Đã thiết kế – Not Run |
| BR-04 | A user can view and process warehouse data (inventory, receipts, issues, transfers, stocktakes, returns, disposals) only for the warehouses assigne… | UC-37, UC-08, UC-63, UC-31, UC-49, UC-38, UC-74 | IT-TRF-005, IT-SEC-001, API-SEC-006, API-ACC-003, API-POS-003, API-GR-001, API-PRD-002, ST-RBAC-006, ST-TRF-001, RT-N01 | Integration, API, System, Regression | Đã thiết kế – Not Run |
| BR-05 | Passwords must have at least 8 characters including uppercase, lowercase, digit and special character and are stored only as salted hashes. | UC-07, UC-03, UC-09, UC-01, UC-02 | UT-VAL-007, UT-VAL-008, IT-SEC-003, IT-SEC-004, API-SEC-002, API-AUTH-003, API-ACC-004, ST-AUTH-001, ST-AUTH-002 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| BR-06 | Codes that must be unique (product, partner, warehouse, order, voucher codes...) must not be duplicated. | UC-97, UC-07, UC-15, UC-17, UC-85, UC-52, UC-99, UC-54, UC-51, UC-53, UC-56, UC-57 | UT-CODE-001, IT-SET-001, API-ACC-001, API-WHA-001, API-SUP-002, API-MST-001, API-MST-002, API-MST-004, API-SET-001, ST-MST-001 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| BR-07 | Customers and suppliers do not use StockFlow. | UC-01 | API-AUTH-004 | API | Đã thiết kế – Not Run |
| BR-08 | Customer orders received by phone, Zalo or in person are entered by the Sales Accountant as bookings. | UC-19, UC-35, UC-18, UC-20, UC-23, UC-24, UC-36, UC-65 | UT-VAL-006, IT-SAL-005, API-BKG-001, ST-SAL-002 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| BR-09 | Only bookings that have not been delivered (Draft or Confirmed) can be updated or canceled. | UC-21, UC-22, UC-18, UC-19, UC-20, UC-23, UC-24, UC-36, UC-65 | API-BKG-003, API-BKG-005, ST-SAL-002 | API, System | Đã thiết kế – Not Run |
| BR-10 | Only bookings of the same customer and the same processing warehouse can be consolidated into one booking. | UC-24, UC-18, UC-19, UC-20, UC-23, UC-36, UC-65 | API-BKG-004, ST-SAL-002 | API, System | Đã thiết kế – Not Run |
| BR-11 | The unit price of an order line is taken from the applicable price book (by default the general price book) and may be adjusted by the Sales Accoun… | UC-18, UC-19, UC-91, UC-23, UC-25, UC-35, UC-63 | API-BKG-001, API-PB-001, ST-SAL-001 | API, System | Đã thiết kế – Not Run |
| BR-12 | A sales invoice can be completed only if Current Debt + (Invoice Total − Paid Amount) ≤ Credit Limit, or if the Manager has approved a credit reque… | UC-23, UC-27, UC-25, UC-35, UC-63, UC-62, UC-64, UC-97 | IT-SAL-006, ST-SAL-001, ST-SAL-003, ST-SET-001 | Integration, System | Đã thiết kế – Not Run |
| BR-13 | Credit requests are decided by the Manager (consulting the Director when required by company policy). | UC-64, UC-27, UC-55, UC-62 | UT-STS-007, IT-CRD-001, IT-CRD-002, API-CRD-001, API-CRD-002, ST-SAL-003 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| BR-14 | The paid amount of a transaction must be between 0 and the total value. | UC-23, UC-25, UC-35, UC-63, UC-26 | UT-VAL-005, IT-SAL-001, API-POS-001, ST-SAL-001, ST-SAL-004 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| BR-15 | Customer receivable increases by the unpaid amount of a sales invoice when the invoice is completed, and decreases by receipts, completed returns a… | UC-31, UC-23, UC-25, UC-35, UC-84, UC-98, UC-63, UC-29, UC-66, UC-83, UC-85 | IT-INV-005, IT-SAL-001, IT-SAL-009, IT-FIN-001, IT-FIN-005, ST-SAL-001, ST-FIN-001 | Integration, System | Đã thiết kế – Not Run |
| BR-16 | The quantity of an invoice line must not exceed the available stock (on-hand quantity minus quantities reserved by other bookings) unless negative … | UC-23, UC-25, UC-35, UC-97, UC-63 | UT-VAL-005, IT-SAL-001, IT-SAL-002, IT-SAL-003, IT-SAL-004, IT-SAL-005, IT-SAL-011, IT-CONC-001, ST-SAL-001, ST-SET-001, RT-N03, RT-N04 | Unit, Integration, System, Regression | Đã thiết kế – Not Run |
| BR-17 | If an invoice delivers less than the remaining quantity of a booking, the booking becomes Delivering and keeps the remaining quantity; | UC-23, UC-36, UC-18, UC-19, UC-20, UC-24, UC-65 | IT-SAL-007, IT-SAL-008, ST-SAL-002 | Integration, System | Đã thiết kế – Not Run |
| BR-18 | The due date of a receivable is the stock issue date plus the customer's payment term (days). | UC-29, UC-66 | RT-N14 | Regression | Đã thiết kế – Not Run |
| BR-19 | A sales return must reference a Completed invoice, except a quick return without invoice. | UC-28, UC-41, UC-79, UC-80, UC-82 | IT-RET-001, IT-RET-002, IT-RET-003, API-RET-001, ST-RET-001 | Integration, API, System | Đã thiết kế – Not Run |
| BR-20 | Removed (19/11/2026): returned items are not categorized; | UC-34, UC-42, UC-75, UC-76, UC-81 | API-OOS-001 | API | Skipped |
| BR-21 | When a return is completed, the returned goods are added back to inventory and the customer debt is reduced by the return value minus the return fee. | UC-28, UC-41, UC-82, UC-79, UC-80 | IT-RET-001, IT-RET-004, ST-RET-001 | Integration, System | Đã thiết kế – Not Run |
| BR-22 | A purchase order must have a supplier, a receiving warehouse and at least one item with quantity > 0 and unit price ≥ 0. | UC-30, UC-31, UC-32, UC-67, UC-68, UC-70, UC-71 | IT-PO-002, IT-PO-003, API-PO-001, API-PO-002, ST-PUR-001 | Integration, API, System | Đã thiết kế – Not Run |
| BR-23 | A goods receipt may reference a purchase order in status Ordered or Partially Received. | UC-31, UC-30, UC-32, UC-67, UC-68, UC-70, UC-71 | IT-INV-001, IT-INV-004, IT-PO-001, ST-PUR-001 | Integration, System | Đã thiết kế – Not Run |
| BR-24 | Only accepted quantities are added to inventory and paid. | UC-31, UC-32, UC-33, UC-30, UC-67, UC-68, UC-70, UC-71, UC-69 | IT-INV-001, IT-INV-002, IT-PR-001, ST-PUR-001, ST-PUR-002 | Integration, System | Đã thiết kế – Not Run |
| BR-25 | Supplier payable increases by the unpaid amount of a completed receipt (accepted quantity × unit price − discounts − paid amount) and decreases by … | UC-31, UC-33, UC-85, UC-98, UC-30, UC-32, UC-67, UC-68, UC-70, UC-71, UC-69, UC-29, UC-66, UC-83, UC-84 | IT-INV-001, IT-INV-005, IT-PR-001, IT-FIN-004, IT-FIN-005, API-SUP-001, ST-PUR-001, ST-PUR-002, ST-FIN-001 | Integration, API, System | Đã thiết kế – Not Run |
| BR-26 | Quantities entered in another unit are converted to the product's base unit using the configured conversion factor. | UC-51, UC-52, UC-53, UC-54, UC-56, UC-57 | ST-MST-001 | System | Đã thiết kế – Not Run |
| BR-27 | For products tracked by lot/expiry, the lot number and expiry date must be entered when the goods are received. | UC-31 | API-GR-002 | API | Blocked |
| BR-28 | Removed (19/11/2026): landed cost allocation is out of scope. | UC-34, UC-42, UC-75, UC-76, UC-81 | API-OOS-001 | API | Skipped |
| BR-29 | Moving Average Cost is recalculated at each confirmed purchase receipt: New MAC = (On-hand Qty × Current MAC + Added Cost) / (On-hand Qty + Added Q… | UC-31, UC-99, UC-30, UC-32, UC-67, UC-68, UC-70, UC-71 | UT-COST-001, UT-COST-002, UT-COST-003, UT-COST-004, UT-COST-005, IT-INV-001, API-MST-002, ST-PUR-001 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| BR-30 | A production order can be created only for a finished good that has an Active BOM. | UC-92, UC-95, UC-46, UC-49, UC-59, UC-57, UC-51, UC-52, UC-53, UC-54, UC-56, UC-44, UC-45, UC-47, UC-50, UC-58, UC-60, UC-61, UC-93, UC-94 | IT-PRO-001, IT-PRO-005, API-MST-003, ST-MST-001, ST-PRO-001 | Integration, API, System | Đã thiết kế – Not Run |
| BR-31 | Material requirement = Planned Quantity × Standard Quantity per Unit × (1 + Wastage Rate). | UC-92, UC-95, UC-46, UC-49, UC-44, UC-45, UC-47, UC-50, UC-58, UC-60, UC-61, UC-93, UC-94 | UT-PRD-001, UT-PRD-002, UT-PRD-003, UT-PRD-004, UT-PRD-008, IT-PRO-001, ST-PRO-001 | Unit, Integration, System | Đã thiết kế – Not Run |
| BR-32 | Every material issue must reference a production order code. | UC-92, UC-95, UC-46, UC-49, UC-48, UC-44, UC-45, UC-47, UC-50, UC-58, UC-60, UC-61, UC-93, UC-94 | UT-PRD-005, IT-PRO-001, IT-PRO-007, ST-PRO-001 | Unit, Integration, System | Đã thiết kế – Not Run |
| BR-33 | Material inventory is deducted by the actual issued quantity confirmed by the Production Accountant. | UC-92, UC-95, UC-46, UC-49, UC-48 | IT-PRO-001, IT-PRO-002, IT-PRO-007 | Integration | Đã thiết kế – Not Run |
| BR-34 | A supplementary issue that makes the cumulative issued quantity exceed the requirement must have a reason. | UC-47, UC-44, UC-45, UC-46, UC-49, UC-50, UC-58, UC-60, UC-61, UC-93, UC-94, UC-95 | IT-PRO-003, ST-PRO-001 | Integration, System | Đã thiết kế – Not Run |
| BR-35 | The finished goods quantity is recorded from the warehouse checker's count. | UC-49, UC-44, UC-45, UC-46, UC-47, UC-50, UC-58, UC-60, UC-61, UC-93, UC-94, UC-95 | IT-PRO-004, ST-PRO-001 | Integration, System | Đã thiết kế – Not Run |
| BR-36 | Accepted finished goods are added to the finished goods warehouse when the receipt is confirmed. | UC-92, UC-95, UC-46, UC-49, UC-44, UC-45, UC-47, UC-50, UC-58, UC-60, UC-61, UC-93, UC-94 | IT-PRO-001, ST-PRO-001 | Integration, System | Đã thiết kế – Not Run |
| BR-37 | If the received finished goods need more material than has been issued according to the BOM, the system shows a warning, requires a note and flags … | UC-49 | UT-PRD-006, UT-PRD-007, IT-PRO-004 | Unit, Integration | Đã thiết kế – Not Run |
| BR-38 | Production order status: Not Started → In Progress (first material issue) → Completed (the Manager approves completion, or the received quantity re… | UC-58, UC-92, UC-95, UC-46, UC-49, UC-44, UC-45, UC-47, UC-50, UC-60, UC-61, UC-93, UC-94 | UT-STS-005, IT-PRO-001, API-PRD-001, ST-PRO-001 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| BR-39 | Production Accountants cannot view purchase prices, costs, MAC or selling prices. | — | API-SEC-007, ST-RBAC-005 | API, System | Đã thiết kế – Not Run |
| BR-40 | A transfer must have different source and destination warehouses and at least one item. | UC-37, UC-38, UC-74 | UT-STS-001, UT-STS-002, UT-STS-003, IT-TRF-001, IT-TRF-003, IT-TRF-004, IT-CONC-004, API-TRF-001, ST-TRF-001, RT-N02, RT-N08, RT-N15 | Unit, Integration, API, System, Regression | Đã thiết kế – Not Run |
| BR-41 | If the received quantity of a transfer line is lower than the transferred quantity, the destination warehouse must enter a receiving note explainin… | UC-38, UC-37, UC-74 | IT-TRF-002, ST-TRF-001 | Integration, System | Đã thiết kế – Not Run |
| BR-42 | While a stocktake of a warehouse is in Draft, material issues, finished goods receipts, completion approvals and disposals of the items in its scop… | UC-39, UC-43, UC-46, UC-49, UC-40, UC-72, UC-73 | IT-STK-002, ST-INV-001 | Integration, System | Đã thiết kế – Not Run |
| BR-43 | Inventory is adjusted to the counted quantity when the Warehouse Accountant completes the stocktake; | UC-39, UC-40, UC-43, UC-72, UC-73 | IT-STK-001, IT-STK-003, API-STK-001, ST-INV-001 | Integration, API, System | Đã thiết kế – Not Run |
| BR-44 | A disposal must have a quantity not exceeding the available quantity and a reason. | UC-43, UC-39, UC-40, UC-72, UC-73 | UT-STS-004, UT-VAL-010, IT-DSP-001, IT-DSP-002, IT-DSP-003, API-DSP-001, ST-INV-001 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| BR-45 | All amounts in StockFlow are net values excluding VAT. | UC-23, UC-25, UC-35 | IT-SAL-001 | Integration | Đã thiết kế – Not Run |
| BR-46 | A voucher amount must be greater than 0 and not greater than the outstanding balance. | UC-84, UC-85, UC-29, UC-66, UC-83, UC-98 | IT-FIN-001, IT-FIN-002, IT-FIN-003, IT-FIN-004, IT-CONC-005, API-SUP-002, ST-FIN-001 | Integration, API, System | Đã thiết kế – Not Run |
| BR-47 | Reports are generated only from confirmed transactions. | UC-86, UC-87, UC-88, UC-89 | API-FIN-001 | API | Blocked |
| BR-48 | A reorder alert is raised when the on-hand quantity is at or below the product's reorder point. | UC-77, UC-78 | API-INV-002, API-INV-003 | API | Đã thiết kế – Not Run |
| BR-49 | Changes of accounts, roles, permissions, warehouse access, credit limits, credit decisions, inventory adjustments, disposals and vouchers are recor… | UC-55 | API-CRD-002, ST-NFR-008 | API, System | Đã thiết kế – Not Run |
| BR-50 | Every approval decision records the approver, time and note. | UC-64, UC-27, UC-62 | UT-STS-007, UT-VAL-009, IT-CRD-001, API-CRD-001, ST-SAL-003 | Unit, Integration, API, System | Đã thiết kế – Not Run |
| BR-51 | The Manager may adjust the material norms of an open production order with a reason. | UC-59 | UT-PRD-008, UT-VAL-011, IT-PRO-006 | Unit, Integration | Đã thiết kế – Not Run |
| BR-52 | A material can be removed from a production order only if nothing has been issued for it. | UC-59 | UT-VAL-011, IT-PRO-006 | Unit, Integration | Đã thiết kế – Not Run |
| BR-PP-01 – BR-PP-08 | A production plan has a system-generated unique code, a name, a period and at least one line. | UC-92, UC-93, UC-94, UC-95, UC-96 | UT-PLN-001, API-PLN-001 | Unit, API | Đã thiết kế – Not Run |
| BR-PP-09 – BR-PP-15 | A plan can be submitted and approved only if every finished good has an active BOM. | UC-92, UC-93, UC-94, UC-95, UC-96 | UT-PLN-001, UT-STS-006, API-PLN-001 | Unit, API | Đã thiết kế – Not Run |
| BR-PP-16 – BR-PP-21 | Production orders can be created only from an Approved plan. | UC-92, UC-93, UC-94, UC-95, UC-96 | UT-PLN-001, API-PLN-001, API-PLN-002, API-PLN-004 | Unit, API | Đã thiết kế – Not Run |
| BR-PP-22 – BR-PP-24 | A rejection must have a reason; | UC-92, UC-93, UC-94, UC-95, UC-96 | UT-PLN-001, UT-STS-006, API-PLN-001, API-PLN-002, API-PLN-004 | Unit, API | Đã thiết kế – Not Run |
| BR-MRP-01 – BR-MRP-09 | Demand: the requirement of a material is calculated from the active BOM with BR-31. | UC-100, UC-101, UC-104, UC-102, UC-103, UC-105 | UT-MRP-001, API-MRP-001, ST-MRP-001 | Unit, API, System | Đã thiết kế – Not Run |
| BR-MRP-10 – BR-MRP-17 | Supply: the opening stock is the on-hand quantity of the selected warehouses, excluding lots expired before today. | UC-100, UC-101, UC-104, UC-102, UC-103, UC-105 | UT-MRP-001, API-MRP-001, ST-MRP-001 | Unit, API, System | Đã thiết kế – Not Run |
| BR-MRP-18 – BR-MRP-22 | Netting and allocation: for each material and date, Before = Projected stock of the previous date + Scheduled receipt − Gross requirement; | UC-100, UC-101, UC-104, UC-102, UC-103, UC-105 | UT-MRP-001, API-MRP-001, ST-MRP-001 | Unit, API, System | Đã thiết kế – Not Run |
| BR-MRP-23 – BR-MRP-29 | Purchase suggestions: the lead time is taken from the goods (calendar days). | UC-100, UC-101, UC-104, UC-102, UC-103, UC-105 | UT-MRP-001, API-MRP-001, ST-MRP-001 | Unit, API, System | Đã thiết kế – Not Run |
| BR-MRP-30 – BR-MRP-33 | Runs: a run covers today to the selected period end (at most 366 days) and 1 to 20 active warehouses that the user can access; | UC-101, UC-52, UC-30, UC-100, UC-102, UC-103, UC-104, UC-105 | UT-VAL-001, UT-VAL-002, UT-VAL-003, UT-VAL-004, IT-PO-002, IT-MRP-001, API-PO-001, API-MRP-001, API-MRP-002, ST-MRP-001 | Unit, Integration, API, System | Đã thiết kế – Not Run |

## C. Yêu cầu phi chức năng

| Requirement ID | Mục Report 3 | Nội dung | Test Case ID | Test Type | Status |
|---|---|---|---|---|---|
| NFR-PERF-01 | 4.2.2 | 95% yêu cầu thường (không phải báo cáo) hoàn tất ≤ 2 giây | ST-NFR-001 | System | Đã thiết kế – Not Run |
| NFR-PERF-02 | 4.2.2 | Giao dịch thường (lưu đơn đặt, hoàn tất POS, phiếu nhập, xuất NVL, nhập thành phẩm, kiểm kê) ≤ 3 giây | ST-NFR-002 | System | Đã thiết kế – Not Run |
| NFR-PERF-03 | 4.2.2 | Tìm kiếm hàng hoá, đơn, khách hàng, tồn kho ≤ 2 giây | ST-NFR-003 | System | Đã thiết kế – Not Run |
| NFR-PERF-04 | 4.2.2 | Báo cáo chuẩn ≤ 5 giây | ST-NFR-004 | System | Blocked |
| NFR-PERF-05 | 4.2.2 | ≥ 100 người dùng đăng nhập đồng thời không suy giảm chức năng | ST-NFR-005 | System | Blocked |
| NFR-REL-01 | 4.2.3 | Toàn vẹn dữ liệu: tồn kho, công nợ, tiến độ SX nhất quán, không bản ghi trùng / mâu thuẫn | IT-SAL-011, IT-CONC-001, IT-CONC-003, API-INV-001, RT-N03, RT-SUITE-01 | Integration, API, Regression | Đã thiết kế – Not Run |
| NFR-REL-02 | 4.2.3 | Mọi biến động kho cập nhật tồn và thẻ kho trong cùng một transaction; lỗi không cập nhật dở dang | IT-INV-001, IT-INV-003, IT-MRP-001, IT-CONC-003 | Integration | Đã thiết kế – Not Run |
| NFR-REL-03 | 4.2.3 | Lưu thất bại thì báo lỗi rõ, không báo hoàn tất; bấm thanh toán nhiều lần không tạo hoá đơn trùng | IT-INV-003, IT-SAL-010, IT-CONC-002, RT-N05 | Integration, Regression | Đã thiết kế – Not Run |
| NFR-REL-04 | 4.2.3 | Sao lưu dữ liệu ít nhất hằng ngày, có quy trình khôi phục đã thử | ST-NFR-007 | System | Đã thiết kế – Not Run |
| NFR-SEC-01 | 4.2.4 | Mọi API được bảo vệ bằng phân quyền theo vai trò và cô lập kho; ẩn nút trên giao diện không được coi là đủ | IT-SEC-001, API-SEC-001, API-SEC-003, API-SEC-005, API-SEC-006, API-SEC-008, API-SEC-010, ST-RBAC-006 | Integration, API, System | Đã thiết kế – Not Run |
| NFR-SEC-02 | 4.2.4 | Quyền đọc từ database ở mỗi request, đổi quyền có hiệu lực ngay | IT-SEC-002, API-SEC-004 | Integration, API | Đã thiết kế – Not Run |
| NFR-SEC-03 | 4.2.4 | Mật khẩu lưu bằng thuật toán băm có salt, không lưu bản rõ | IT-SEC-004 | Integration | Đã thiết kế – Not Run |
| NFR-SEC-04 | 4.2.4 | Token ký số, thời hạn cố định; tài khoản bị khoá mất quyền ở request tiếp theo | IT-SEC-003, API-SEC-002, API-SEC-009, ST-AUTH-001 | Integration, API, System | Đã thiết kế – Not Run |
| NFR-SEC-05 | 4.2.4 | Dữ liệu tài chính (công nợ, giá vốn, doanh thu, thanh toán) chỉ vai trò được phép mới xem (BR-39) | API-SEC-005, API-SEC-007 | API | Đã thiết kế – Not Run |
| NFR-SEC-06 | 4.2.4 | Thao tác nhạy cảm ghi nhật ký kiểm toán (BR-49) | ST-NFR-008 | System | Blocked |
| NFR-SEC-07 | 4.2.4 | Mọi quyết định duyệt / từ chối ghi người duyệt, thời gian, ghi chú (BR-50) | IT-CRD-001, ST-SAL-003 | Integration, System | Đã thiết kế – Not Run |
| NFR-COMP-01 | 4.2.5 | Chạy được trên Chrome, Edge, Firefox bản ổn định trên máy bàn | ST-NFR-006 | System | Đã thiết kế – Not Run |

## D. Luồng liên module (System Test)

| Requirement ID | Luồng | Test Case ID | Test Type | Status |
|---|---|---|---|---|
| FLOW-01 | Mua hàng → Nhập kho → Tồn kho → Công nợ NCC | IT-INV-001, ST-PUR-001 | Integration, System | Đã thiết kế – Not Run |
| FLOW-02 | Đặt hàng → POS → Phiếu xuất → Tồn kho → Công nợ khách hàng | IT-SAL-001, ST-SAL-001 | Integration, System | Đã thiết kế – Not Run |
| FLOW-03 | Kế hoạch SX → BOM → MRP → Đặt hàng nhập → Nhập kho → Xuất NVL → Nhập thành phẩm | IT-PRO-001, ST-PRO-001, ST-MRP-001 | Integration, System | Đã thiết kế – Not Run |
| FLOW-04 | Chuyển kho → Tồn kho nguồn → Tồn kho đích | IT-TRF-001, ST-TRF-001 | Integration, System | Đã thiết kế – Not Run |
| FLOW-05 | Hoá đơn → Trả hàng bán → Tồn kho → Công nợ / hoàn tiền | IT-RET-001, ST-RET-001 | Integration, System | Đã thiết kế – Not Run |
| FLOW-06 | Đặt hàng nhập → Nhập kho → Trả hàng NCC → Tồn kho → Công nợ NCC | IT-PR-001, ST-PUR-002 | Integration, System | Đã thiết kế – Not Run |
| FLOW-07 | Phân quyền → Quyền kho → Tồn kho / Bán hàng / Mua hàng | IT-TRF-005, IT-SEC-001, API-SEC-006, ST-RBAC-001, ST-RBAC-002, ST-RBAC-003, ST-RBAC-004, ST-RBAC-005, ST-RBAC-006 | Integration, API, System | Đã thiết kế – Not Run |

## E. Endpoint

Mọi endpoint còn được API-SEC-001, API-SEC-003 kiểm 401 / 403 theo ma trận quyền. Cột "Test chức năng" chỉ tính test case ghi đúng endpoint đó.

| Controller | Method + đường dẫn | Quyền | Test chức năng | Có API test (HTTP) |
|---|---|---|---|---|
| Auth | `POST /api/auth/login` | ANON | API-AUTH-001, API-AUTH-002, API-AUTH-004 | Có |
| Auth | `GET /api/auth/me` | đăng nhập | API-SEC-002, API-SEC-009 | Có |
| Auth | `POST /api/auth/change-password` | đăng nhập | API-AUTH-003 | Có |
| Auth | `GET /api/auth/permissions` | đăng nhập | — | Không |
| CreditRequests | `POST /api/credit-requests` | SALES_CREATE | IT-CRD-001, API-CRD-001 | Có |
| CreditRequests | `GET /api/credit-requests/mine` | SALES_READ | — | Không |
| CreditRequests | `GET /api/credit-requests` | SALES_APPROVE | — | Không |
| CreditRequests | `GET /api/credit-requests/{id:int}` | SALES_APPROVE | — | Không |
| CreditRequests | `GET /api/credit-requests/{id:int}/customer-history` | SALES_APPROVE | API-CRD-001 | Có |
| CreditRequests | `POST /api/credit-requests/{id:int}/approve` | SALES_APPROVE | IT-CRD-001, IT-CRD-002, API-CRD-001 | Có |
| CreditRequests | `POST /api/credit-requests/{id:int}/reject` | SALES_APPROVE | API-CRD-001 | Có |
| Customers | `GET /api/customers` | PARTNER_READ | API-SEC-008 | Có |
| Customers | `GET /api/customers/stats` | PARTNER_READ | — | Không |
| Customers | `GET /api/customers/{id}` | PARTNER_READ | — | Không |
| Customers | `GET /api/customers/{id}/receipts/{code}` | PARTNER_READ | — | Không |
| Customers | `PUT /api/customers/{id}/receipts/{code}` | FIN_UPDATE | IT-FIN-003 | Không |
| Customers | `POST /api/customers/{id}/receipts/{code}/cancel` | FIN_UPDATE | IT-FIN-003 | Không |
| Customers | `POST /api/customers` | PARTNER_CREATE | API-SEC-008, API-AUTH-004, API-MST-004 | Có |
| Customers | `POST /api/customers/{id}/payments` | FIN_CREATE | IT-FIN-001, IT-FIN-002, IT-CONC-005 | Không |
| Customers | `POST /api/customers/{id}/debt-adjustments` | FIN_CREATE | IT-FIN-005 | Không |
| Customers | `GET /api/customers/{id}/debt-adjustments/{code}` | PARTNER_READ | — | Không |
| Customers | `PUT /api/customers/{id}/debt-adjustments/{code}` | FIN_UPDATE | — | Không |
| Customers | `POST /api/customers/{id}/debt-adjustments/{code}/cancel` | FIN_UPDATE | IT-FIN-005 | Không |
| Customers | `PUT /api/customers/{id}` | PARTNER_UPDATE | API-MST-004 | Có |
| Customers | `PATCH /api/customers/{id}/toggle-status` | PARTNER_UPDATE | — | Không |
| Customers | `PATCH /api/customers/batch-status` | PARTNER_UPDATE | API-MST-004 | Có |
| Customers | `PATCH /api/customers/{id:int}/credit-limit` | SALES_APPROVE | API-CRD-002 | Có |
| Customers | `PATCH /api/customers/credit-limit/batch` | SALES_APPROVE | API-CRD-002 | Có |
| Customers | `GET /api/customers/{id:int}/credit-limit-history` | PARTNER_READ | API-CRD-002 | Có |
| Customers | `DELETE /api/customers/{id}` | PARTNER_DELETE | — | Không |
| DebtWarningSettings | `GET /api/settings/debt-warning` | PARTNER_READ | API-SET-001 | Có |
| DebtWarningSettings | `PUT /api/settings/debt-warning` | SALES_APPROVE | API-SET-001 | Có |
| Disposals | `GET /api/disposals` | STOCK_READ | — | Không |
| Disposals | `GET /api/disposals/{id:int}` | STOCK_READ | API-SEC-006 | Có |
| Disposals | `POST /api/disposals` | STOCK_CREATE | IT-STK-002, IT-DSP-001, IT-DSP-002, IT-SEC-001, IT-CONC-003, API-DSP-001 | Có |
| Disposals | `GET /api/disposals/staff-options` | STOCK_READ | — | Không |
| Disposals | `PUT /api/disposals/{id:int}/info` | STOCK_UPDATE | API-DSP-001 | Có |
| Disposals | `DELETE /api/disposals/{id:int}` | STOCK_UPDATE | IT-DSP-003 | Không |
| Disposals | `PUT /api/disposals/{id:int}` | STOCK_UPDATE | API-DSP-001 | Có |
| Health | `GET /api/health` | ANON | — | Không |
| Mrp | `POST /api/production/mrp/runs` | PROD_UPDATE | IT-MRP-001, IT-SEC-001, API-SEC-004, API-MRP-001, API-MRP-002 | Có |
| Mrp | `GET /api/production/mrp/runs` | PROD_READ | API-MRP-001 | Có |
| Mrp | `GET /api/production/mrp/runs/{id:int}` | PROD_READ | API-SEC-006, API-MRP-001, API-MRP-002 | Có |
| Mrp | `GET /api/production/mrp/runs/{id:int}/daily-requirements` | PROD_READ | API-MRP-001 | Có |
| Mrp | `GET /api/production/mrp/runs/{id:int}/monthly-demand` | PROD_READ | API-MRP-001 | Có |
| Mrp | `GET /api/production/mrp/runs/{id:int}/shortages` | PROD_READ | API-MRP-001 | Có |
| Mrp | `GET /api/production/mrp/runs/{id:int}/materials/{materialId:int}/projection` | PROD_READ | API-MRP-001 | Có |
| Mrp | `GET /api/production/mrp/runs/{id:int}/purchase-suggestions` | PROD_READ | API-MRP-001 | Có |
| OrderSettings | `GET /api/order-settings` | đăng nhập | API-SEC-005, API-SET-001 | Có |
| OrderSettings | `PUT /api/order-settings` | SALES_APPROVE | IT-SAL-004, API-BKG-002, API-SET-001 | Có |
| Orders | `GET /api/orders` | SALES_READ | API-SEC-002, API-POS-003 | Có |
| Orders | `GET /api/orders/{id}` | SALES_READ | API-SEC-006, API-POS-003 | Có |
| Orders | `POST /api/orders/pos` | SALES_CREATE | IT-SAL-001, IT-SAL-002, IT-SAL-003, IT-SAL-004, IT-SAL-005, IT-SAL-006, IT-SAL-007, IT-SAL-008, IT-SAL-010, IT-SAL-011, IT-SEC-001, IT-SET-001, IT-CONC-001, IT-CONC-002, IT-CONC-003, API-SEC-004, API-POS-001 | Có |
| Orders | `PUT /api/orders/{id}` | SALES_UPDATE | — | Không |
| Orders | `POST /api/orders/{id:int}/cancel` | SALES_UPDATE | IT-SAL-009, API-POS-002 | Có |
| PriceBooks | `GET /api/price-books` | GOODS_READ | — | Không |
| PriceBooks | `GET /api/price-books/customer-options` | GOODS_READ | — | Không |
| PriceBooks | `GET /api/price-books/{id:int}` | GOODS_READ | — | Không |
| PriceBooks | `POST /api/price-books` | GOODS_CREATE | API-PB-001 | Có |
| PriceBooks | `PUT /api/price-books/{id:int}` | GOODS_UPDATE | API-PB-001 | Có |
| PriceBooks | `DELETE /api/price-books/{id:int}` | GOODS_DELETE | — | Không |
| PriceBooks | `GET /api/price-books/matrix` | GOODS_READ | API-PB-001 | Có |
| PriceBooks | `PUT /api/price-books/{id:int}/prices` | GOODS_UPDATE | API-PB-001 | Có |
| PriceBooks | `POST /api/price-books/{id:int}/apply-formula` | GOODS_UPDATE | API-PB-001 | Có |
| ProductionBoms | `GET /api/production/boms` | BOM_READ | — | Không |
| ProductionBoms | `GET /api/production/boms/{id:int}` | BOM_READ | — | Không |
| ProductionBoms | `POST /api/production/boms` | BOM_CREATE | API-MST-003 | Có |
| ProductionBoms | `PUT /api/production/boms/{id:int}` | BOM_UPDATE | — | Không |
| ProductionBoms | `POST /api/production/boms/{id:int}/activate` | BOM_APPROVE | API-MST-003 | Có |
| ProductionBoms | `POST /api/production/boms/{id:int}/deactivate` | BOM_APPROVE | — | Không |
| ProductionBoms | `DELETE /api/production/boms/{id:int}` | BOM_DELETE | API-MST-003 | Có |
| Production | `GET /api/production/orders` | PROD_READ | — | Không |
| Production | `GET /api/production/orders/{id:int}` | PROD_READ | IT-PRO-007, API-SEC-006, API-SEC-007 | Có |
| Production | `GET /api/production/orders/requirement-preview` | PROD_READ | — | Không |
| Production | `POST /api/production/orders/{id:int}/cancel` | PROD_DELETE | API-PRD-001 | Có |
| Production | `POST /api/production/orders/{id:int}/close` | PROD_APPROVE | API-PRD-001 | Có |
| Production | `POST /api/production/orders/{id:int}/approve` | PROD_APPROVE | IT-STK-002, API-PRD-001 | Có |
| Production | `POST /api/production/orders/{id:int}/adjust-norms` | PROD_APPROVE | IT-PRO-006, API-PLN-004 | Có |
| Production | `GET /api/production/material-issues` | PROD_READ | — | Không |
| Production | `POST /api/production/material-issues` | PROD_UPDATE | IT-STK-002, IT-PRO-001, IT-PRO-002, IT-PRO-003, IT-PRO-007, IT-SEC-001, API-PRD-001 | Có |
| Production | `GET /api/production/finished-goods-receipts` | PROD_READ | — | Không |
| Production | `GET /api/production/finished-goods-receipts/check` | PROD_READ | IT-PRO-004 | Không |
| Production | `POST /api/production/finished-goods-receipts` | PROD_UPDATE | IT-STK-002, IT-PRO-001, IT-PRO-004, IT-SEC-001, API-PRD-002 | Có |
| Production | `GET /api/production/lookups/products` | PROD_READ | API-SEC-007 | Có |
| Production | `GET /api/production/lookups/locations` | PROD_READ | — | Không |
| ProductionPlans | `GET /api/production/plans` | PROD_READ | — | Không |
| ProductionPlans | `GET /api/production/plans/{id:int}` | PROD_READ | — | Không |
| ProductionPlans | `POST /api/production/plans` | PROD_UPDATE | IT-PRO-001, API-PLN-001 | Có |
| ProductionPlans | `PUT /api/production/plans/{id:int}` | PROD_UPDATE | API-PLN-001 | Có |
| ProductionPlans | `POST /api/production/plans/{id:int}/submit` | PROD_UPDATE | IT-PRO-001, API-PLN-001 | Có |
| ProductionPlans | `POST /api/production/plans/{id:int}/approve` | PROD_APPROVE | IT-PRO-001, API-PLN-001 | Có |
| ProductionPlans | `POST /api/production/plans/{id:int}/reject` | PROD_APPROVE | API-PLN-001 | Có |
| ProductionPlans | `POST /api/production/plans/{id:int}/cancel` | PROD_UPDATE | API-PLN-001, API-PLN-002, API-PLN-003 | Có |
| ProductionPlans | `POST /api/production/plans/{id:int}/close` | PROD_APPROVE | API-PLN-001, API-PLN-003, API-PLN-004 | Có |
| ProductionPlans | `GET /api/production/plans/{id:int}/material-requirements` | PROD_READ | — | Không |
| ProductionPlans | `POST /api/production/plans/material-requirements/preview` | PROD_READ | API-PLN-001 | Có |
| ProductionPlans | `POST /api/production/plans/{id:int}/orders` | PROD_CREATE | IT-PRO-001, IT-PRO-005, API-PLN-001, API-PLN-002, API-PLN-004 | Có |
| Products | `GET /api/products` | GOODS_READ | API-SEC-007, API-SEC-008, API-INV-002 | Có |
| Products | `GET /api/products/{id}` | GOODS_READ | API-SEC-007 | Có |
| Products | `GET /api/products/{id}/stock-card` | GOODS_READ | API-INV-001 | Có |
| Products | `POST /api/products` | GOODS_CREATE | API-SEC-010, API-MST-001 | Có |
| Products | `POST /api/products/import` | GOODS_CREATE | API-MST-002 | Có |
| Products | `PUT /api/products/{id}` | GOODS_UPDATE | API-SEC-010 | Có |
| Products | `POST /api/products/{id}/stock-adjustments` | STOCK_UPDATE | API-MST-002 | Có |
| Products | `PATCH /api/products/{id}/toggle-status` | GOODS_UPDATE | API-MST-001 | Có |
| Products | `DELETE /api/products/{id}` | GOODS_DELETE | API-MST-001 | Có |
| Products | `GET /api/products/categories` | GOODS_READ | — | Không |
| Products | `POST /api/products/categories` | GOODS_CREATE | — | Không |
| Products | `GET /api/products/units` | GOODS_READ | — | Không |
| PurchaseOrders | `GET /api/purchase-orders` | PURCHASE_READ | — | Không |
| PurchaseOrders | `GET /api/purchase-orders/{id:int}` | PURCHASE_READ | — | Không |
| PurchaseOrders | `GET /api/purchase-orders/by-code/{code}` | PURCHASE_READ | — | Không |
| PurchaseOrders | `POST /api/purchase-orders` | PURCHASE_CREATE | IT-PO-001, API-PO-001 | Có |
| PurchaseOrders | `PUT /api/purchase-orders/{id:int}` | PURCHASE_UPDATE | IT-PO-003, API-PO-002 | Có |
| PurchaseOrders | `POST /api/purchase-orders/{id:int}/cancel` | PURCHASE_UPDATE | IT-PO-003, API-PO-002 | Có |
| PurchaseOrders | `POST /api/purchase-orders/{id:int}/finish` | PURCHASE_UPDATE | API-PO-002 | Có |
| PurchaseOrders | `POST /api/purchase-orders/{id:int}/receive` | PURCHASE_CREATE | IT-PO-001 | Không |
| PurchaseOrders | `PATCH /api/purchase-orders/{id:int}/notes` | PURCHASE_UPDATE | — | Không |
| PurchaseOrders | `POST /api/purchase-orders/merge` | PURCHASE_UPDATE | IT-PO-002, API-PO-002 | Có |
| PurchaseReturns | `GET /api/purchasereturns` | PURCHASE_READ | — | Không |
| PurchaseReturns | `GET /api/purchasereturns/{id:int}` | PURCHASE_READ | — | Không |
| PurchaseReturns | `GET /api/purchasereturns/source/{grId:int}` | PURCHASE_READ | — | Không |
| PurchaseReturns | `POST /api/purchasereturns` | PURCHASE_CREATE | IT-PR-001 | Không |
| PurchaseReturns | `PUT /api/purchasereturns/{id:int}` | PURCHASE_UPDATE | — | Không |
| PurchaseReturns | `POST /api/purchasereturns/{id:int}/refunds` | FIN_CREATE | IT-PR-001, API-SUP-001 | Có |
| PurchaseReturns | `PATCH /api/purchasereturns/{id:int}/cancel` | PURCHASE_UPDATE | — | Không |
| Purchases | `GET /api/purchases` | PURCHASE_READ | — | Không |
| Purchases | `GET /api/purchases/{id}` | PURCHASE_READ | API-SEC-006 | Có |
| Purchases | `POST /api/purchases` | PURCHASE_CREATE | IT-INV-001, IT-INV-002, IT-INV-003, IT-INV-004, IT-SEC-001, IT-CONC-003, API-GR-001, API-GR-002 | Có |
| Purchases | `PUT /api/purchases/{id}` | PURCHASE_UPDATE | — | Không |
| Purchases | `PATCH /api/purchases/{id}/complete` | PURCHASE_CREATE | IT-INV-004 | Không |
| Purchases | `PATCH /api/purchases/{id}/cancel` | PURCHASE_UPDATE | IT-INV-005 | Không |
| Roles | `GET /api/roles/feature-matrix` | ADMIN | API-ROLE-003 | Có |
| Roles | `PUT /api/roles/feature-matrix` | ADMIN | API-SEC-004 | Có |
| Roles | `GET /api/roles/my-features` | đăng nhập | — | Không |
| Roles | `GET /api/roles` | AUTH_READ | API-ROLE-003 | Có |
| Roles | `POST /api/roles` | ADMIN | API-ROLE-001 | Có |
| Roles | `GET /api/roles/{roleCode}/permissions` | ADMIN | API-ROLE-003 | Có |
| Roles | `PUT /api/roles/{roleIdOrCode}` | ADMIN | API-ROLE-001 | Có |
| Roles | `DELETE /api/roles/{roleIdOrCode}` | ADMIN | API-ROLE-001 | Có |
| Roles | `PUT /api/roles/{roleCode}/permissions` | ADMIN | IT-SEC-002, API-ROLE-002 | Có |
| SalesBookings | `GET /api/sales-bookings` | SALES_READ | — | Không |
| SalesBookings | `GET /api/sales-bookings/reserved` | SALES_READ | API-BKG-001 | Có |
| SalesBookings | `GET /api/sales-bookings/{id:int}` | SALES_READ | — | Không |
| SalesBookings | `POST /api/sales-bookings` | SALES_CREATE | IT-SAL-005, IT-SAL-007, API-BKG-001, API-BKG-002 | Có |
| SalesBookings | `PUT /api/sales-bookings/{id:int}` | SALES_UPDATE | IT-CONC-006, API-BKG-003 | Có |
| SalesBookings | `PATCH /api/sales-bookings/{id:int}/info` | SALES_UPDATE | — | Không |
| SalesBookings | `POST /api/sales-bookings/{id:int}/cancel` | SALES_DELETE | API-BKG-003, API-BKG-005 | Có |
| SalesBookings | `POST /api/sales-bookings/merge` | SALES_UPDATE | API-BKG-004 | Có |
| SalesReturns | `GET /api/sales-returns` | SALES_READ | — | Không |
| SalesReturns | `GET /api/sales-returns/{id:int}` | SALES_READ | API-SEC-006 | Có |
| SalesReturns | `GET /api/sales-returns/source/{invoiceId:int}` | SALES_READ | API-RET-001 | Có |
| SalesReturns | `POST /api/sales-returns` | SALES_CREATE | IT-RET-001, IT-RET-002, IT-RET-003, IT-RET-005, IT-SEC-001, API-RET-001 | Có |
| SalesReturns | `POST /api/sales-returns/{id:int}/cancel` | SALES_DELETE | — | Không |
| SalesReturns | `POST /api/sales-returns/{id:int}/refunds` | SALES_UPDATE | IT-RET-004 | Không |
| SalesReturns | `PATCH /api/sales-returns/{id:int}/notes` | SALES_UPDATE | — | Không |
| Staff | `GET /api/staff` | AUTH_READ | API-ACC-005 | Có |
| Staff | `POST /api/staff` | ADMIN | IT-SEC-004, API-ACC-001, API-ACC-002 | Có |
| Staff | `PUT /api/staff/{id}` | ADMIN | API-ROLE-003, API-ACC-003 | Có |
| Staff | `PUT /api/staff/{id}/toggle-status` | ADMIN | IT-SEC-003, API-ACC-004 | Có |
| Staff | `POST /api/staff/{id}/reset-password` | ADMIN | API-ACC-004 | Có |
| Stocktakes | `GET /api/stocktakes` | STOCK_READ | — | Không |
| Stocktakes | `GET /api/stocktakes/{id:int}` | STOCK_READ | API-SEC-006 | Có |
| Stocktakes | `POST /api/stocktakes` | STOCK_CREATE | IT-STK-001, IT-STK-002, IT-SEC-001, API-STK-001 | Có |
| Stocktakes | `PUT /api/stocktakes/{id:int}` | STOCK_UPDATE | API-STK-001 | Có |
| Stocktakes | `POST /api/stocktakes/{id:int}/cancel` | STOCK_UPDATE | IT-STK-003 | Không |
| Stocktakes | `POST /api/stocktakes/merge` | STOCK_CREATE | IT-STK-004 | Không |
| Suppliers | `GET /api/suppliers` | PARTNER_READ | — | Không |
| Suppliers | `GET /api/suppliers/warehouses` | đăng nhập | API-SEC-005 | Có |
| Suppliers | `GET /api/suppliers/{id}` | PARTNER_READ | — | Không |
| Suppliers | `POST /api/suppliers` | PARTNER_CREATE | API-MST-004 | Có |
| Suppliers | `PUT /api/suppliers/{id}` | PARTNER_UPDATE | — | Không |
| Suppliers | `PATCH /api/suppliers/{id}/toggle-status` | PARTNER_UPDATE | — | Không |
| Suppliers | `POST /api/suppliers/{id}/payments` | FIN_CREATE | IT-FIN-004, API-SUP-001, API-SUP-002 | Có |
| Suppliers | `POST /api/suppliers/{id}/debt-adjustments` | FIN_CREATE | IT-FIN-005 | Không |
| Suppliers | `GET /api/suppliers/{id}/debt-adjustments/{code}` | PARTNER_READ | — | Không |
| Suppliers | `PUT /api/suppliers/{id}/debt-adjustments/{code}` | FIN_UPDATE | — | Không |
| Suppliers | `POST /api/suppliers/{id}/debt-adjustments/{code}/cancel` | FIN_UPDATE | — | Không |
| Suppliers | `DELETE /api/suppliers/{id}` | PARTNER_DELETE | API-SUP-002 | Có |
| Transfers | `GET /api/transfers` | STOCK_READ | — | Không |
| Transfers | `GET /api/transfers/products-for-transfer` | STOCK_READ | — | Không |
| Transfers | `GET /api/transfers/{id}` | STOCK_READ | API-SEC-006 | Có |
| Transfers | `POST /api/transfers` | STOCK_CREATE | IT-TRF-001, IT-SEC-001, API-TRF-001 | Có |
| Transfers | `PUT /api/transfers/{id}` | STOCK_UPDATE | — | Không |
| Transfers | `PUT /api/transfers/{id}/notes` | STOCK_UPDATE | — | Không |
| Transfers | `POST /api/transfers/{id}/complete` | STOCK_UPDATE | IT-TRF-001, IT-TRF-005, IT-CONC-004 | Không |
| Transfers | `POST /api/transfers/{id}/receive` | STOCK_UPDATE | IT-TRF-001, IT-TRF-002, IT-TRF-003, IT-TRF-005, IT-CONC-004, API-TRF-001 | Có |
| Transfers | `POST /api/transfers/{id}/cancel` | STOCK_UPDATE | IT-TRF-004, API-TRF-001 | Có |
| WarehousePermissions | `GET /api/warehousepermissions` | AUTH_READ | API-WHA-002 | Có |
| WarehousePermissions | `GET /api/warehousepermissions/facilities` | đăng nhập | API-SEC-005, API-WHA-002 | Có |
| WarehousePermissions | `PUT /api/warehousepermissions/{userId}` | ADMIN | API-ROLE-002, API-WHA-001 | Có |
| WarehousePermissions | `POST /api/warehousepermissions/facilities` | ADMIN | — | Không |
| WarehousePermissions | `PUT /api/warehousepermissions/facilities/{warehouseId}` | ADMIN | — | Không |
| Warehouses | `GET /api/warehouses` | đăng nhập | API-SEC-005 | Có |
| Warehouses | `GET /api/warehouses/my-warehouses` | đăng nhập | — | Không |
| Warehouses | `GET /api/warehouses/{id}` | đăng nhập | API-SEC-005 | Có |
| Warehouses | `POST /api/warehouses` | ADMIN | API-ROLE-002, API-WHA-001 | Có |
| Warehouses | `PUT /api/warehouses/{id}` | ADMIN | API-ROLE-002 | Có |
| Warehouses | `PATCH /api/warehouses/{id}/toggle-status` | ADMIN | — | Không |
| Warehouses | `DELETE /api/warehouses/{id}` | ADMIN | — | Không |

## F. Yêu cầu chưa có test

- Không có. Mọi UC, BR, NFR, luồng đều có ít nhất một test case (kể cả Blocked / Skipped có lý do).

Endpoint chưa có test chức năng riêng: 69 / 200 (chủ yếu GET danh sách, tra cứu). Chúng vẫn được kiểm xác thực / phân quyền; test chức năng bổ sung ở Phase 5 theo ưu tiên.

