# 04 – Test Cases Summary

- **Ngày lập:** 19/11/2026. **Người phụ trách:** Ninh. **Giai đoạn:** Phase 2 – Test Strategy & Test Design.
- **Sinh tự động** bằng `node specs/qa/test-design/generate.js` từ `specs/qa/test-design/data/*.js`. Sửa dữ liệu rồi chạy lại, không sửa tay file này.
- **Chưa test nào được chạy trong Phase 2.** Trạng thái "Not Run" nghĩa là đã thiết kế, chưa thực thi; không dùng làm bằng chứng đạt.
- Chi tiết từng test case: thư mục [test-cases](../test-cases/). Bản CSV: [testcases.csv](../test-cases/testcases.csv).

## 1. Theo loại test và trạng thái

| Test Type | Total | Passed | Failed | Blocked | Skipped | Not Run |
|---|---:|---:|---:|---:|---:|---:|
| Unit Test | 36 | 0 | 0 | 0 | 0 | 36 |
| Integration Test | 63 | 0 | 0 | 0 | 0 | 63 |
| API Test | 64 | 0 | 0 | 4 | 1 | 59 |
| System Test | 31 | 0 | 0 | 4 | 0 | 27 |
| Regression Test | 10 | 0 | 0 | 0 | 0 | 10 |
| **Tổng** | **204** | **0** | **0** | **8** | **1** | **195** |

Passed / Failed = 0 vì Phase 2 chỉ thiết kế, chưa chạy.

## 2. Theo module

| Module | Unit | Integration | API | System | Regression | Tổng |
|---|---:|---:|---:|---:|---:|---:|
| Xác thực | 1 | 0 | 5 | 2 | 0 | 8 |
| Tài khoản | 1 | 0 | 5 | 0 | 1 | 7 |
| Vai trò & quyền | 0 | 0 | 3 | 0 | 0 | 3 |
| Quyền kho | 0 | 0 | 2 | 0 | 0 | 2 |
| Bảo mật & phân quyền | 0 | 4 | 8 | 9 | 2 | 23 |
| Đặt hàng (booking) | 1 | 3 | 5 | 1 | 0 | 10 |
| Bán hàng POS | 1 | 10 | 3 | 2 | 3 | 19 |
| Tín dụng & công nợ KH | 2 | 3 | 2 | 1 | 1 | 9 |
| Bảng giá | 1 | 0 | 1 | 0 | 0 | 2 |
| Trả hàng bán | 0 | 5 | 1 | 1 | 0 | 7 |
| Đặt hàng nhập | 1 | 3 | 2 | 1 | 0 | 7 |
| Nhập hàng | 5 | 5 | 2 | 0 | 0 | 12 |
| Trả hàng NCC | 0 | 1 | 0 | 1 | 0 | 2 |
| Nhà cung cấp | 0 | 0 | 2 | 0 | 0 | 2 |
| Danh mục | 1 | 0 | 5 | 2 | 0 | 8 |
| Tồn kho | 0 | 1 | 3 | 0 | 0 | 4 |
| Kiểm kê | 0 | 4 | 1 | 1 | 0 | 6 |
| Huỷ hàng | 2 | 3 | 1 | 0 | 0 | 6 |
| Chuyển kho | 3 | 6 | 1 | 1 | 3 | 14 |
| Sản xuất | 10 | 7 | 2 | 1 | 0 | 20 |
| Kế hoạch sản xuất | 2 | 0 | 4 | 0 | 0 | 6 |
| MRP | 3 | 1 | 2 | 1 | 0 | 7 |
| Tài chính & báo cáo | 1 | 6 | 2 | 1 | 0 | 10 |
| Cài đặt | 1 | 1 | 1 | 1 | 0 | 4 |
| Hiệu năng | 0 | 0 | 0 | 5 | 0 | 5 |
| Ngoài phạm vi | 0 | 0 | 1 | 0 | 0 | 1 |

## 3. Theo mức ưu tiên

| Priority | Định nghĩa | Số test case |
|---|---|---:|
| Critical | Có thể làm sai dữ liệu kho, tài chính hoặc phá nghiệp vụ chính | 58 |
| High | Chức năng nghiệp vụ quan trọng không hoạt động | 112 |
| Medium | Chức năng sai trong một số điều kiện | 31 |
| Low | Lỗi giao diện, ảnh hưởng nhỏ | 3 |

## 4. Kỹ thuật thiết kế đã dùng

| Kỹ thuật | Số test case |
|---|---:|
| Phân lớp tương đương (EP) | 52 |
| Giá trị biên (BVA) | 51 |
| Bảng quyết định (DT) | 22 |
| Chuyển trạng thái (ST) | 41 |
| Kiểm thử âm (NEG) | 41 |
| Đoán lỗi (EG) | 10 |
| Đồng thời (CONC) | 11 |
| Bảo mật (SEC) | 27 |
| Theo rủi ro (RISK) | 10 |
| Hiệu năng (PERF) | 5 |

## 5. Bộ test có sẵn (tính là 1 test case đại diện mỗi bộ)

| Test case đại diện | Bộ | Số ca bên trong | Lần chạy gần nhất (trước Phase 2) |
|---|---|---:|---|
| UT-MRP-001 | specs/mrp/unit-tests (MU-01..38) | 38 | 18/11/2026: 38/38 |
| UT-PLN-001 | specs/production-planning-implementation/unit-tests | 79 | 15/11/2026: 79/79 |
| API-PLN-001 | specs/production-planning-implementation/api-tests (pptest*.ps1) | 101 | 15–16/11/2026: 101 ca ghi đạt trong results*.json |
| API-MRP-001 | specs/mrp/api-tests/mrptest.ps1 (MT-01..37) | 37 | 18/11/2026: 37/37 |

Các kết quả trên là của lần chạy trước, không phải của Phase 2. Phase 3 / Phase 5 chạy lại và chuyển chúng vào bộ test chung.

## 6. Test case Blocked / Skipped

| ID | Trạng thái | Lý do |
|---|---|---|
| API-GR-002 | Blocked | Chưa có cờ "theo dõi lô" trên hàng hoá và nhập hàng không ghi lô (nghi vấn N-10). |
| API-INV-003 | Blocked | Chưa có chức năng và không thu hạn dùng (UC-78 "Chưa có code"). |
| API-FIN-001 | Blocked | Chưa có API báo cáo (UC-86 – UC-89 "Chưa có code"). |
| API-FIN-002 | Blocked | /dashboard hiện là bảng quản trị của Admin. |
| API-OOS-001 | Skipped | D1, D2, O3 ngày 19/11/2026; Report 3 ghi "Removed". |
| ST-SAL-004 | Blocked | Chưa có chức năng (POS hiện "Chưa cấu hình tài khoản ngân hàng…"). |
| ST-NFR-004 | Blocked | Chưa có báo cáo (UC-86 – UC-90). |
| ST-NFR-005 | Blocked | Cần công cụ tải (chờ duyệt cùng Q1). |
| ST-NFR-008 | Blocked | Chưa có bảng / chức năng audit (nghi vấn N-11). |

## 7. Nghi vấn cần test xác nhận (chưa phải lỗi)

| Mã | Mức (dự kiến) | Nội dung | Yêu cầu | Chỗ trong code / tài liệu | Test xác nhận |
|---|---|---|---|---|---|
| N-01 | High | Sửa nhân viên không gửi danh sách kho thì mất hết quyền kho | UC-08 | UpdateStaffCommand.cs:163 | API-ACC-003 |
| N-02 | High | Nhận chuyển kho nhiều hơn số đã xuất không bị chặn | UC-38 | ReceiveTransferCommand.cs:63, 99 | IT-TRF-003 |
| N-03 | Critical | Hai người bán cùng lúc có thể bán vượt tồn (không khoá tồn kho) | UC-35 | CreatePosOrderCommand, InventoryLedger: không FOR UPDATE / concurrency token | IT-CONC-001 |
| N-04 | High | POS chỉ kiểm và trừ một dòng tồn mỗi hàng (hàng nhiều lô) | UC-35 | CreatePosOrderCommand.cs:307 | IT-SAL-011 |
| N-05 | High | Chống trùng hoá đơn bằng ClientRequestId kiểm rồi ghi, không ràng buộc unique | UC-23 | CreatePosOrderCommand.cs:102 | IT-CONC-002 |
| N-06 | Medium | Lệnh của kế hoạch đã đóng vẫn tăng được số lượng (S-01) – có thể đã hết | UC-96 | 08-spec-code-review.md S-01 | API-PLN-004 |
| N-07 | High | Quyền mặc định lệch vai trò trong Report 3: Warehouse thiếu PURCHASE_UPDATE, FIN_CREATE; Sales thiếu SALES_DELETE; Production huỷ được kế hoạch | UC-22, UC-30, UC-85, UC-96 | PermissionConstants.GetDefaultPermissionCodes | API-BKG-005, API-PO-002, API-SUP-001, API-PLN-003 |
| N-08 | Medium | Huỷ được phiếu chuyển kho đã nhận (trái A37.2) | UC-37 | TrxStockTransfer.Status.cs CanCancel | UT-STS-003, API-TRF-001 |
| N-09 | Medium | 10 endpoint chỉ cần đăng nhập, không khai quyền | NFR-SEC-01 | 01b_API_INVENTORY.md | API-SEC-005 |
| N-10 | Medium | Nhập hàng không ghi số lô, hạn dùng (BR-27) | UC-31 | PurchaseItemMapper.cs:61 | API-GR-002 |
| N-11 | Medium | Không có nhật ký kiểm toán (BR-49) | BR-49 | Không có bảng audit | ST-NFR-008 |
| N-12 | Low | Không sinh mã QR thanh toán | UC-26 | PosScreen.tsx:1768 | ST-SAL-004 |
| N-13 | Medium | Không có báo cáo và dashboard quản lý | UC-86 – UC-90 | Không có API báo cáo | API-FIN-001, API-FIN-002 |
| N-14 | Medium | Không có kỳ hạn nợ / quá hạn (BR-18) – chưa xác minh | UC-66 | Chưa thấy trong code | RT-N14 |
| N-15 | Low | Nhận chuyển kho cộng vào dòng tồn không lô (mất thông tin lô) | UC-37 | TransferStockOps.cs:93 | RT-N15 |
| N-16 | Low | Đăng xuất không thu hồi token phía server | UC-02 | Frontend chỉ xoá localStorage | API-SEC-009 |

## 8. Độ phủ thiết kế

| Loại độ phủ | Giá trị |
|---|---|
| Use Case có test case | 100% (105/105) – Đã thiết kế – Not Run: 93 · Blocked: 7 · Skipped: 5 |
| Business Rule có test case | 100% (61/61) – Đã thiết kế – Not Run: 57 · Skipped: 2 · Blocked: 2 |
| NFR có test case | 100% (17/17) – Đã thiết kế – Not Run: 14 · Blocked: 3 |
| Luồng liên module có System Test | 100% |
| Endpoint có test chức năng | 65.5% (131/200) |
| Endpoint có test xác thực / phân quyền | 100% (200/200, tham số hoá) |
| Test case đã thực thi | 0% (Phase 2 chưa chạy) |
| Code coverage | Chưa đo (cần công cụ, Phase 3) |

