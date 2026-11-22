# Test case – Đặt hàng, POS, tín dụng, bảng giá, trả hàng bán

- **Ngày lập:** 19/11/2026. **Người phụ trách:** Ninh. **Giai đoạn:** Phase 2 – Test Strategy & Test Design.
- **Sinh tự động** bằng `node specs/qa/test-design/generate.js` từ `specs/qa/test-design/data/*.js`. Sửa dữ liệu rồi chạy lại, không sửa tay file này.
- **Chưa test nào được chạy trong Phase 2.** Trạng thái "Not Run" nghĩa là đã thiết kế, chưa thực thi; không dùng làm bằng chứng đạt.
- **Số test case:** 47.
- Ma trận truy vết: [02_REQUIREMENT_TRACEABILITY_MATRIX.md](../reports/02_REQUIREMENT_TRACEABILITY_MATRIX.md). Chiến lược: [03_TEST_STRATEGY.md](../reports/03_TEST_STRATEGY.md).

## Danh sách

| ID | Tên | Module | Loại | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| [UT-STS-007](#ut-sts-007) | Yêu cầu tín dụng chỉ duyệt / từ chối khi PENDING | Tín dụng & công nợ KH | Unit | High | Not Run |
| [UT-VAL-005](#ut-val-005) | CreatePosOrderCommandValidator: dòng hàng, số lượng, tiền khách trả | Bán hàng POS | Unit | High | Not Run |
| [UT-VAL-006](#ut-val-006) | SaveSalesBookingCommandValidator: khách hàng, kho, dòng hàng | Đặt hàng (booking) | Unit | High | Not Run |
| [UT-VAL-009](#ut-val-009) | RejectCreditRequestCommandValidator: từ chối phải có lý do | Tín dụng & công nợ KH | Unit | High | Not Run |
| [UT-VAL-013](#ut-val-013) | CreatePriceBookCommandValidator: ngày hiệu lực bắt đầu sau ngày kết thúc | Bảng giá | Unit | Medium | Not Run |
| [IT-SAL-001](#it-sal-001) | Hoàn tất hoá đơn POS: phiếu xuất, tồn, thẻ kho, thanh toán, công nợ | Bán hàng POS | Integration | Critical | Not Run |
| [IT-SAL-002](#it-sal-002) | Không đủ tồn và không cho bán âm thì từ chối, không tạo dữ liệu | Bán hàng POS | Integration | Critical | Not Run |
| [IT-SAL-003](#it-sal-003) | Biên tồn: bán đúng bằng tồn khả dụng | Bán hàng POS | Integration | High | Not Run |
| [IT-SAL-004](#it-sal-004) | Cho bán âm trong cài đặt thì hoàn tất, tồn âm | Bán hàng POS | Integration | High | Not Run |
| [IT-SAL-005](#it-sal-005) | Tồn khả dụng trừ số đã giữ cho đơn đặt khác | Bán hàng POS | Integration | High | Not Run |
| [IT-SAL-006](#it-sal-006) | Kiểm hạn mức tín dụng khi thanh toán (bảng quyết định) | Tín dụng & công nợ KH | Integration | Critical | Not Run |
| [IT-SAL-007](#it-sal-007) | Giao một phần đơn đặt: DELIVERING giữ số còn lại; giao nốt: FINISHED | Đặt hàng (booking) | Integration | Critical | Not Run |
| [IT-SAL-008](#it-sal-008) | Không giao vượt số còn lại của đơn đặt | Đặt hàng (booking) | Integration | Critical | Not Run |
| [IT-SAL-009](#it-sal-009) | Huỷ hoá đơn đảo tồn, công nợ, thanh toán | Bán hàng POS | Integration | High | Not Run |
| [IT-SAL-010](#it-sal-010) | Gửi lại cùng ClientRequestId không tạo hoá đơn thứ hai | Bán hàng POS | Integration | High | Not Run |
| [IT-SAL-011](#it-sal-011) | Bán thành phẩm có tồn ở nhiều lô | Bán hàng POS | Integration | High | Not Run |
| [IT-RET-001](#it-ret-001) | Trả hàng theo hoá đơn: tồn tăng, công nợ giảm theo giá trị trả − phí | Trả hàng bán | Integration | Critical | Not Run |
| [IT-RET-002](#it-ret-002) | Trả nhiều lần không vượt SL đã bán − đã trả | Trả hàng bán | Integration | Critical | Not Run |
| [IT-RET-003](#it-ret-003) | Trả hàng nhanh không hoá đơn | Trả hàng bán | Integration | High | Not Run |
| [IT-RET-004](#it-ret-004) | Hoàn tiền sau cho phiếu trả | Trả hàng bán | Integration | High | Not Run |
| [IT-RET-005](#it-ret-005) | Trả hàng sau thời hạn trả hàng trong cài đặt | Trả hàng bán | Integration | Medium | Not Run |
| [IT-CRD-001](#it-crd-001) | Duyệt yêu cầu tín dụng: ngoại lệ một lần, hạn mức mới (có lịch sử) | Tín dụng & công nợ KH | Integration | Critical | Not Run |
| [IT-CRD-002](#it-crd-002) | Hai Manager duyệt cùng một yêu cầu đồng thời | Tín dụng & công nợ KH | Integration | High | Not Run |
| [IT-CONC-001](#it-conc-001) | Hai người cùng bán sản phẩm cuối cùng | Bán hàng POS | Integration | Critical | Not Run |
| [IT-CONC-002](#it-conc-002) | Bấm thanh toán hai lần đồng thời (cùng ClientRequestId) | Bán hàng POS | Integration | Critical | Not Run |
| [IT-CONC-006](#it-conc-006) | Hai người cùng sửa một đơn đặt | Đặt hàng (booking) | Integration | Medium | Not Run |
| [API-BKG-001](#api-bkg-001) | Tạo đơn đặt không đổi tồn, tăng số giữ chỗ | Đặt hàng (booking) | API | Critical | Not Run |
| [API-BKG-002](#api-bkg-002) | Tắt nhận đơn đặt mới trong cài đặt | Đặt hàng (booking) | API | High | Not Run |
| [API-BKG-003](#api-bkg-003) | Sửa / huỷ đơn đặt đã giao bị chặn | Đặt hàng (booking) | API | High | Not Run |
| [API-BKG-004](#api-bkg-004) | Gộp đơn đặt khác khách hoặc khác kho bị chặn | Đặt hàng (booking) | API | High | Not Run |
| [API-BKG-005](#api-bkg-005) | Sales Accountant huỷ đơn đặt của mình | Đặt hàng (booking) | API | High | Not Run |
| [API-POS-001](#api-pos-001) | Số tiền khách trả ngoài khoảng [0, tổng]; chuyển khoản thiếu mã tham chiếu | Bán hàng POS | API | High | Not Run |
| [API-POS-002](#api-pos-002) | Huỷ hoá đơn đã huỷ | Bán hàng POS | API | High | Not Run |
| [API-POS-003](#api-pos-003) | Danh sách và chi tiết hoá đơn chỉ thuộc kho được gán | Bán hàng POS | API | Medium | Not Run |
| [API-CRD-001](#api-crd-001) | Gửi, duyệt, từ chối yêu cầu tín dụng: các lỗi nghiệp vụ | Tín dụng & công nợ KH | API | High | Not Run |
| [API-CRD-002](#api-crd-002) | Đặt hạn mức một / nhiều khách có lý do, lưu lịch sử | Tín dụng & công nợ KH | API | High | Not Run |
| [API-PB-001](#api-pb-001) | Bảng giá: ngày hiệu lực, công thức tham chiếu chính nó, áp giá | Bảng giá | API | Medium | Not Run |
| [API-RET-001](#api-ret-001) | Trả hàng từ hoá đơn chưa hoàn tất / đã huỷ; không dòng nào có SL > 0 | Trả hàng bán | API | High | Not Run |
| [ST-SAL-001](#st-sal-001) | Bán hàng hoàn chỉnh tại POS | Bán hàng POS | System | Critical | Not Run |
| [ST-SAL-002](#st-sal-002) | Đặt hàng → gộp → xử lý hoá đơn giao một phần → giao nốt | Đặt hàng (booking) | System | Critical | Not Run |
| [ST-SAL-003](#st-sal-003) | Bán chịu vượt hạn mức → yêu cầu tín dụng → Manager duyệt → hoàn tất | Tín dụng & công nợ KH | System | Critical | Not Run |
| [ST-SAL-004](#st-sal-004) | Thanh toán chuyển khoản hiển thị mã QR đúng số tiền và mã giao dịch | Bán hàng POS | System | Medium | Blocked |
| [ST-RET-001](#st-ret-001) | Hoá đơn → trả hàng một phần, trả lần hai, trả vượt → tồn, công nợ, hoàn tiền | Trả hàng bán | System | Critical | Not Run |
| [RT-N03](#rt-n03) | Tái hiện N-03: bán đồng thời không vượt tồn | Bán hàng POS | Regression | Critical | Not Run |
| [RT-N04](#rt-n04) | Tái hiện N-04: bán hàng nhiều lô | Bán hàng POS | Regression | High | Not Run |
| [RT-N05](#rt-n05) | Tái hiện N-05: thanh toán trùng đồng thời | Bán hàng POS | Regression | High | Not Run |
| [RT-N14](#rt-n14) | Xác minh N-14: kỳ hạn nợ và nợ quá hạn | Tín dụng & công nợ KH | Regression | Medium | Not Run |

## Đặt hàng (booking)

### UT-VAL-006

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-006 |
| Test Name | SaveSalesBookingCommandValidator: khách hàng, kho, dòng hàng |
| Module | Đặt hàng (booking) |
| Requirement ID | BR-08 |
| Use Case ID | UC-19 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Kiểm thử âm |
| API liên quan | — |
| Preconditions | — |
| Test Data | Thiếu khách; thiếu kho; SL 0 |
| Test Steps | 1. Validate từng request |
| Expected Result | • Lỗi MSG01 cho từng trường hợp (E18.2) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-007

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-007 |
| Test Name | Giao một phần đơn đặt: DELIVERING giữ số còn lại; giao nốt: FINISHED |
| Module | Đặt hàng (booking) |
| Requirement ID | BR-17 |
| Use Case ID | UC-23, UC-36 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | POST /api/sales-bookings; POST /api/orders/pos |
| Preconditions | — |
| Test Data | Đơn đặt H1 × 10; hoá đơn 1 giao 4; hoá đơn 2 giao 6 |
| Test Steps | 1. Xử lý đơn đặt thành hoá đơn 1<br>2. Xử lý tiếp hoá đơn 2 |
| Expected Result | • Sau 1: đơn đặt DELIVERING, còn 6, giữ chỗ 6<br>• Sau 2: FINISHED, giữ chỗ 0 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-008

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-008 |
| Test Name | Không giao vượt số còn lại của đơn đặt |
| Module | Đặt hàng (booking) |
| Requirement ID | BR-17 |
| Use Case ID | UC-23 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/orders/pos |
| Preconditions | — |
| Test Data | Đơn đặt còn 6; hoá đơn giao 7 |
| Test Steps | 1. Gửi hoá đơn từ đơn đặt |
| Expected Result | • Bị từ chối, hoặc phần vượt không trừ vào đơn đặt theo quy định; đơn đặt không âm số còn lại |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Audit 13/11 ghi code chưa chặn; cần chạy để xác nhận. |

### IT-CONC-006

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-CONC-006 |
| Test Name | Hai người cùng sửa một đơn đặt |
| Module | Đặt hàng (booking) |
| Requirement ID | — |
| Use Case ID | UC-21 |
| Test Type | Integration |
| Priority | Medium |
| Kỹ thuật | Đồng thời |
| API liên quan | PUT /api/sales-bookings/{id:int} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Gửi song song 2 bản sửa khác nhau |
| Expected Result | • Đơn sau cùng nhất quán (đúng một bản), không trùng hoặc mất dòng hàng |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Tài liệu chưa quy định khoá lạc quan; ghi nhận hành vi thực tế. |

### API-BKG-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-BKG-001 |
| Test Name | Tạo đơn đặt không đổi tồn, tăng số giữ chỗ |
| Module | Đặt hàng (booking) |
| Requirement ID | BR-08, BR-11 |
| Use Case ID | UC-18, UC-19 |
| Test Type | API |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/sales-bookings; GET /api/sales-bookings/reserved |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo đơn đặt H1 × 5<br>2. Đọc tồn và số giữ chỗ |
| Expected Result | • Tồn không đổi; giữ chỗ H1 + 5; đơn giá lấy từ bảng giá áp dụng |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-BKG-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-BKG-002 |
| Test Name | Tắt nhận đơn đặt mới trong cài đặt |
| Module | Đặt hàng (booking) |
| Requirement ID | — |
| Use Case ID | UC-19, UC-97 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảng quyết định |
| API liên quan | PUT /api/order-settings; POST /api/sales-bookings |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tắt nhận đơn mới<br>2. Tạo đơn đặt |
| Expected Result | • MSG66 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-BKG-003

| Trường | Nội dung |
|---|---|
| Test Case ID | API-BKG-003 |
| Test Name | Sửa / huỷ đơn đặt đã giao bị chặn |
| Module | Đặt hàng (booking) |
| Requirement ID | BR-09 |
| Use Case ID | UC-21, UC-22 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái, Kiểm thử âm |
| API liên quan | PUT /api/sales-bookings/{id:int}; POST /api/sales-bookings/{id:int}/cancel |
| Preconditions | Đơn đặt DELIVERING |
| Test Data | — |
| Test Steps | 1. Sửa dòng hàng<br>2. Huỷ |
| Expected Result | • MSG17 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-BKG-004

| Trường | Nội dung |
|---|---|
| Test Case ID | API-BKG-004 |
| Test Name | Gộp đơn đặt khác khách hoặc khác kho bị chặn |
| Module | Đặt hàng (booking) |
| Requirement ID | BR-10 |
| Use Case ID | UC-24 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảng quyết định |
| API liên quan | POST /api/sales-bookings/merge |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Gộp 2 đơn khác khách<br>2. Gộp 2 đơn khác kho<br>3. Gộp 2 đơn cùng khách cùng kho |
| Expected Result | • MSG20<br>• MSG20<br>• Đơn mới; hai đơn nguồn CANCELLED, liên kết đơn mới |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-BKG-005

| Trường | Nội dung |
|---|---|
| Test Case ID | API-BKG-005 |
| Test Name | Sales Accountant huỷ đơn đặt của mình |
| Module | Đặt hàng (booking) |
| Requirement ID | BR-09, BR-02 |
| Use Case ID | UC-22 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Bảo mật |
| API liên quan | POST /api/sales-bookings/{id:int}/cancel |
| Preconditions | Đơn đặt DRAFT do sales01 tạo |
| Test Data | — |
| Test Steps | 1. sales01 huỷ đơn |
| Expected Result | • 200; đơn CANCELLED; giữ chỗ giảm |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-07: endpoint cần SALES_DELETE, quyền mặc định SalesStaff không có. |

### ST-SAL-002

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-SAL-002 |
| Test Name | Đặt hàng → gộp → xử lý hoá đơn giao một phần → giao nốt |
| Module | Đặt hàng (booking) |
| Requirement ID | BR-08, BR-09, BR-10, BR-17 |
| Use Case ID | UC-18, UC-19, UC-20, UC-23, UC-24, UC-36, UC-65 |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo 2 đơn đặt cùng khách cùng kho, trả trước một phần<br>2. Gộp<br>3. Xử lý thành hoá đơn giao 60%<br>4. Giao nốt |
| Expected Result | • Đơn gộp; đơn nguồn huỷ<br>• DELIVERING giữ phần còn lại; tiền trả trước trừ đúng<br>• FINISHED<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Bán hàng POS

### UT-VAL-005

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-005 |
| Test Name | CreatePosOrderCommandValidator: dòng hàng, số lượng, tiền khách trả |
| Module | Bán hàng POS |
| Requirement ID | BR-14, BR-16 |
| Use Case ID | UC-23 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Kiểm thử âm |
| API liên quan | — |
| Preconditions | — |
| Test Data | Không dòng hàng; SL 0; SL −1; tiền trả âm |
| Test Steps | 1. Validate từng request |
| Expected Result | • Mỗi request trả lỗi VALIDATION_FAILED (MSG01) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-001 |
| Test Name | Hoàn tất hoá đơn POS: phiếu xuất, tồn, thẻ kho, thanh toán, công nợ |
| Module | Bán hàng POS |
| Requirement ID | BR-14, BR-15, BR-16, BR-45, FLOW-02 |
| Use Case ID | UC-23, UC-25, UC-35 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/orders/pos |
| Preconditions | K001: H1 tồn 10; khách KH1 nợ 0, hạn mức 10.000.000 |
| Test Data | H1 × 3, giá 100.000, trả 200.000 tiền mặt |
| Test Steps | 1. Gửi hoá đơn<br>2. Đọc lại đơn, phiếu xuất, tồn, thẻ kho, công nợ |
| Expected Result | • trx_orders INVOICE COMPLETED, đã trả 200.000<br>• trx_stock_issues + dòng SL 3<br>• Tồn H1 = 7; thẻ kho ISSUE_SALE −3 tham chiếu STOCK_ISSUE<br>• Công nợ KH1 = 100.000<br>• Tổng tiền không cộng VAT (BR-45)<br>• Σ quantity của trx_inventory_transactions (hàng, kho) = quantity trong trx_inventory_balances |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-002 |
| Test Name | Không đủ tồn và không cho bán âm thì từ chối, không tạo dữ liệu |
| Module | Bán hàng POS |
| Requirement ID | BR-16 |
| Use Case ID | UC-35 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/orders/pos |
| Preconditions | Cài đặt không cho bán âm; H1 tồn 2 |
| Test Data | H1 × 3 |
| Test Steps | 1. Gửi hoá đơn |
| Expected Result | • Bị từ chối MSG28<br>• Không có đơn, phiếu xuất; tồn vẫn 2 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-003 |
| Test Name | Biên tồn: bán đúng bằng tồn khả dụng |
| Module | Bán hàng POS |
| Requirement ID | BR-16 |
| Use Case ID | UC-35 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | POST /api/orders/pos |
| Preconditions | — |
| Test Data | H1 tồn 3, bán 3 |
| Test Steps | 1. Gửi hoá đơn |
| Expected Result | • Hoàn tất; tồn = 0 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-004

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-004 |
| Test Name | Cho bán âm trong cài đặt thì hoàn tất, tồn âm |
| Module | Bán hàng POS |
| Requirement ID | BR-16 |
| Use Case ID | UC-35, UC-97 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Bảng quyết định |
| API liên quan | PUT /api/order-settings; POST /api/orders/pos |
| Preconditions | Bật cho bán âm; H1 tồn 2 |
| Test Data | H1 × 5 |
| Test Steps | 1. Gửi hoá đơn |
| Expected Result | • Hoàn tất; tồn = −3; thẻ kho −5 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-005

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-005 |
| Test Name | Tồn khả dụng trừ số đã giữ cho đơn đặt khác |
| Module | Bán hàng POS |
| Requirement ID | BR-08, BR-16 |
| Use Case ID | UC-35 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Bảng quyết định |
| API liên quan | POST /api/sales-bookings; POST /api/orders/pos |
| Preconditions | H1 tồn 10; đơn đặt của KH2 giữ 8; không cho bán âm |
| Test Data | Hoá đơn lẻ H1 × 3 |
| Test Steps | 1. Gửi hoá đơn |
| Expected Result | • Bị từ chối MSG28 (khả dụng 2) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-009

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-009 |
| Test Name | Huỷ hoá đơn đảo tồn, công nợ, thanh toán |
| Module | Bán hàng POS |
| Requirement ID | BR-15 |
| Use Case ID | UC-35 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | POST /api/orders/{id:int}/cancel |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Huỷ hoá đơn của IT-SAL-001 |
| Expected Result | • Tồn H1 về 10; công nợ KH1 về 0; thẻ kho có dòng đảo; đơn CANCELLED |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-010

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-010 |
| Test Name | Gửi lại cùng ClientRequestId không tạo hoá đơn thứ hai |
| Module | Bán hàng POS |
| Requirement ID | NFR-REL-03 |
| Use Case ID | UC-23 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Đoán lỗi |
| API liên quan | POST /api/orders/pos |
| Preconditions | — |
| Test Data | Cùng request, ClientRequestId = R1, gửi tuần tự 2 lần |
| Test Steps | 1. Gửi 2 lần |
| Expected Result | • Chỉ 1 hoá đơn; lần 2 trả hoá đơn đã có hoặc MSG67 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-011

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-011 |
| Test Name | Bán thành phẩm có tồn ở nhiều lô |
| Module | Bán hàng POS |
| Requirement ID | BR-16, NFR-REL-01 |
| Use Case ID | UC-35 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Đoán lỗi, Theo rủi ro |
| API liên quan | POST /api/orders/pos |
| Preconditions | Thành phẩm TP1 tại K001: lô L1 = 5, lô L2 = 5 (nhập từ 2 lệnh sản xuất) |
| Test Data | Bán TP1 × 8 |
| Test Steps | 1. Gửi hoá đơn<br>2. Đối chiếu tồn từng lô và thẻ kho |
| Expected Result | • Hoàn tất (tổng tồn 10 ≥ 8)<br>• Tổng tồn TP1 = 2; tồn từng lô không âm<br>• Σ quantity của trx_inventory_transactions (hàng, kho) = quantity trong trx_inventory_balances |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-04: POS chỉ kiểm / trừ một dòng tồn mỗi hàng. |

### IT-CONC-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-CONC-001 |
| Test Name | Hai người cùng bán sản phẩm cuối cùng |
| Module | Bán hàng POS |
| Requirement ID | BR-16, NFR-REL-01 |
| Use Case ID | UC-35 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Đồng thời, Theo rủi ro |
| API liên quan | POST /api/orders/pos |
| Preconditions | Không cho bán âm; H1 tồn 1 |
| Test Data | — |
| Test Steps | 1. sales01 và manager01 gửi song song hoá đơn H1 × 1 |
| Expected Result | • Đúng 1 hoá đơn hoàn tất, request kia MSG28<br>• Tồn H1 = 0, không âm<br>• Σ quantity của trx_inventory_transactions (hàng, kho) = quantity trong trx_inventory_balances |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-03: không có khoá tồn kho. |

### IT-CONC-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-CONC-002 |
| Test Name | Bấm thanh toán hai lần đồng thời (cùng ClientRequestId) |
| Module | Bán hàng POS |
| Requirement ID | NFR-REL-03 |
| Use Case ID | UC-23 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Đồng thời |
| API liên quan | POST /api/orders/pos |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Gửi song song 2 request giống hệt, cùng ClientRequestId |
| Expected Result | • Chỉ 1 hoá đơn, 1 phiếu xuất, 1 lần trừ tồn và cộng nợ |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-05: chống trùng bằng kiểm tra ghi chú rồi mới ghi, không có ràng buộc unique. |

### API-POS-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-POS-001 |
| Test Name | Số tiền khách trả ngoài khoảng [0, tổng]; chuyển khoản thiếu mã tham chiếu |
| Module | Bán hàng POS |
| Requirement ID | BR-14 |
| Use Case ID | UC-25 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/orders/pos |
| Preconditions | — |
| Test Data | Trả −1; trả tổng + 1 (không phải tiền thừa); chuyển khoản không có mã tham chiếu |
| Test Steps | 1. Gửi từng hoá đơn |
| Expected Result | • Hai ca đầu bị từ chối<br>• Ca 3 bị từ chối (BR-14 bắt buộc mã tham chiếu) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Audit 13/11 ghi chưa có mã tham chiếu chuyển khoản. |

### API-POS-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-POS-002 |
| Test Name | Huỷ hoá đơn đã huỷ |
| Module | Bán hàng POS |
| Requirement ID | — |
| Use Case ID | UC-35 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái, Kiểm thử âm |
| API liên quan | POST /api/orders/{id:int}/cancel |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Huỷ lần 1<br>2. Huỷ lần 2 |
| Expected Result | • Lần 2: MSG17; tồn chỉ hoàn một lần |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-POS-003

| Trường | Nội dung |
|---|---|
| Test Case ID | API-POS-003 |
| Test Name | Danh sách và chi tiết hoá đơn chỉ thuộc kho được gán |
| Module | Bán hàng POS |
| Requirement ID | BR-04 |
| Use Case ID | UC-63 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Bảo mật |
| API liên quan | GET /api/orders; GET /api/orders/{id} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. sales01 (chỉ K001) lấy danh sách hoá đơn không lọc kho |
| Expected Result | • Chỉ có hoá đơn K001 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-SAL-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-SAL-001 |
| Test Name | Bán hàng hoàn chỉnh tại POS |
| Module | Bán hàng POS |
| Requirement ID | BR-11, BR-12, BR-14, BR-15, BR-16, FLOW-02 |
| Use Case ID | UC-23, UC-25, UC-35, UC-63 |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đăng nhập sales01<br>2. Mở POS, tìm hàng (F3), chọn khách (F4)<br>3. Thêm 2 hàng, đổi số lượng<br>4. Kiểm giá theo bảng giá, chiết khấu, tổng<br>5. Thanh toán một phần tiền mặt<br>6. Hoàn tất<br>7. Mở hoá đơn, tồn, công nợ, thẻ kho |
| Expected Result | • Giá, chiết khấu, tổng đúng<br>• Hoá đơn COMPLETED; tồn trừ đúng; công nợ = phần chưa trả<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-SAL-004

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-SAL-004 |
| Test Name | Thanh toán chuyển khoản hiển thị mã QR đúng số tiền và mã giao dịch |
| Module | Bán hàng POS |
| Requirement ID | BR-14 |
| Use Case ID | UC-26 |
| Test Type | System |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chọn chuyển khoản tại POS |
| Expected Result | • Hiện QR chứa đúng số tiền và mã giao dịch |
| Actual Result | — |
| Status | Blocked |
| Evidence | — |
| Ghi chú | Chưa có chức năng (POS hiện "Chưa cấu hình tài khoản ngân hàng…"). |

### RT-N03

| Trường | Nội dung |
|---|---|
| Test Case ID | RT-N03 |
| Test Name | Tái hiện N-03: bán đồng thời không vượt tồn |
| Module | Bán hàng POS |
| Requirement ID | BR-16, NFR-REL-01 |
| Use Case ID | UC-35 |
| Test Type | Regression |
| Priority | Critical |
| Kỹ thuật | Theo rủi ro, Đồng thời |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy IT-CONC-001 20 lần |
| Expected Result | • Không lần nào tồn âm khi không cho bán âm; chạy lại IT-SAL-*, IT-CONC-003, ST-SAL-001 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### RT-N04

| Trường | Nội dung |
|---|---|
| Test Case ID | RT-N04 |
| Test Name | Tái hiện N-04: bán hàng nhiều lô |
| Module | Bán hàng POS |
| Requirement ID | BR-16 |
| Use Case ID | UC-35 |
| Test Type | Regression |
| Priority | High |
| Kỹ thuật | Theo rủi ro |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy IT-SAL-011 |
| Expected Result | • Sau sửa: đạt; chạy lại IT-SAL-*, IT-PRO-001 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### RT-N05

| Trường | Nội dung |
|---|---|
| Test Case ID | RT-N05 |
| Test Name | Tái hiện N-05: thanh toán trùng đồng thời |
| Module | Bán hàng POS |
| Requirement ID | NFR-REL-03 |
| Use Case ID | UC-23 |
| Test Type | Regression |
| Priority | High |
| Kỹ thuật | Theo rủi ro, Đồng thời |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy IT-CONC-002 20 lần |
| Expected Result | • Luôn chỉ 1 hoá đơn |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Tín dụng & công nợ KH

### UT-STS-007

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-STS-007 |
| Test Name | Yêu cầu tín dụng chỉ duyệt / từ chối khi PENDING |
| Module | Tín dụng & công nợ KH |
| Requirement ID | BR-13, BR-50 |
| Use Case ID | UC-64 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Với PENDING, APPROVED, REJECTED kiểm CanApprove, CanReject<br>2. Gọi MarkApproved("ONE_TIME", 0) và MarkApproved("NEW_LIMIT", 50.000.000) |
| Expected Result | • Chỉ PENDING trả true<br>• Status = APPROVED, lưu loại duyệt và hạn mức được duyệt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-VAL-009

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-009 |
| Test Name | RejectCreditRequestCommandValidator: từ chối phải có lý do |
| Module | Tín dụng & công nợ KH |
| Requirement ID | BR-50 |
| Use Case ID | UC-64 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Kiểm thử âm |
| API liên quan | — |
| Preconditions | — |
| Test Data | Lý do rỗng, khoảng trắng, có nội dung |
| Test Steps | 1. Validate |
| Expected Result | • Rỗng và khoảng trắng lỗi MSG40<br>• Có nội dung đạt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-SAL-006

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-SAL-006 |
| Test Name | Kiểm hạn mức tín dụng khi thanh toán (bảng quyết định) |
| Module | Tín dụng & công nợ KH |
| Requirement ID | BR-12 |
| Use Case ID | UC-23, UC-27 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Bảng quyết định, Giá trị biên |
| API liên quan | POST /api/orders/pos |
| Preconditions | KH1 hạn mức 1.000.000, nợ 600.000 |
| Test Data | Bảng: (a) còn nợ mới 400.000 → nợ = hạn mức; (b) 400.001; (c) 500.000 có yêu cầu tín dụng được duyệt ONE_TIME; (d) 500.000 và cài đặt cho nợ vượt hạn mức |
| Test Steps | 1. Gửi hoá đơn với từng tổ hợp |
| Expected Result | • (a) hoàn tất<br>• (b) bị chặn, gợi ý gửi yêu cầu tín dụng<br>• (c) hoàn tất 1 lần, yêu cầu được dùng<br>• (d) hoàn tất |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-CRD-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-CRD-001 |
| Test Name | Duyệt yêu cầu tín dụng: ngoại lệ một lần, hạn mức mới (có lịch sử) |
| Module | Tín dụng & công nợ KH |
| Requirement ID | BR-13, BR-50, NFR-SEC-07 |
| Use Case ID | UC-27, UC-64 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Bảng quyết định |
| API liên quan | POST /api/credit-requests; POST /api/credit-requests/{id:int}/approve |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Duyệt yêu cầu A loại ONE_TIME<br>2. Duyệt yêu cầu B loại NEW_LIMIT 5.000.000 |
| Expected Result | • A: hoá đơn vượt hạn mức hoàn tất được 1 lần, lần sau bị chặn lại<br>• B: hạn mức khách = 5.000.000; trx_credit_limit_histories có dòng cũ / mới / lý do<br>• Cả hai ghi người duyệt, thời gian, ghi chú |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-CRD-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-CRD-002 |
| Test Name | Hai Manager duyệt cùng một yêu cầu đồng thời |
| Module | Tín dụng & công nợ KH |
| Requirement ID | BR-13 |
| Use Case ID | UC-64 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Đồng thời |
| API liên quan | POST /api/credit-requests/{id:int}/approve |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Gửi song song 2 lệnh duyệt / từ chối cùng yêu cầu |
| Expected Result | • Chỉ 1 thành công; lệnh còn lại MSG57 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-CRD-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-CRD-001 |
| Test Name | Gửi, duyệt, từ chối yêu cầu tín dụng: các lỗi nghiệp vụ |
| Module | Tín dụng & công nợ KH |
| Requirement ID | BR-13, BR-50 |
| Use Case ID | UC-27, UC-64 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Giá trị biên, Chuyển trạng thái |
| API liên quan | POST /api/credit-requests; POST /api/credit-requests/{id:int}/approve; POST /api/credit-requests/{id:int}/reject; GET /api/credit-requests/{id:int}/customer-history |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Từ chối không lý do<br>2. Duyệt hạn mức mới = 0<br>3. Duyệt hợp lệ<br>4. Duyệt lại yêu cầu đã duyệt |
| Expected Result | • MSG40<br>• MSG40<br>• 200, ghi người duyệt<br>• MSG57 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-CRD-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-CRD-002 |
| Test Name | Đặt hạn mức một / nhiều khách có lý do, lưu lịch sử |
| Module | Tín dụng & công nợ KH |
| Requirement ID | BR-13, BR-49 |
| Use Case ID | UC-55 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Giá trị biên |
| API liên quan | PATCH /api/customers/{id:int}/credit-limit; PATCH /api/customers/credit-limit/batch; GET /api/customers/{id:int}/credit-limit-history |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Đặt hạn mức 1 khách<br>2. Tăng 10% cho 3 khách<br>3. Đặt hạn mức âm |
| Expected Result | • Lịch sử có giá trị cũ / mới / lý do / người sửa<br>• Hạn mức âm bị từ chối |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-SAL-003

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-SAL-003 |
| Test Name | Bán chịu vượt hạn mức → yêu cầu tín dụng → Manager duyệt → hoàn tất |
| Module | Tín dụng & công nợ KH |
| Requirement ID | BR-12, BR-13, BR-50, NFR-SEC-07 |
| Use Case ID | UC-27, UC-62, UC-64 |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Bảng quyết định |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. sales01 bán chịu vượt hạn mức<br>2. Gửi yêu cầu tín dụng<br>3. manager01 duyệt ngoại lệ một lần<br>4. sales01 hoàn tất<br>5. Thử bán chịu vượt hạn mức lần nữa |
| Expected Result | • Bị chặn, gợi ý gửi yêu cầu<br>• Sau duyệt hoàn tất được<br>• Lần sau bị chặn lại |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### RT-N14

| Trường | Nội dung |
|---|---|
| Test Case ID | RT-N14 |
| Test Name | Xác minh N-14: kỳ hạn nợ và nợ quá hạn |
| Module | Tín dụng & công nợ KH |
| Requirement ID | BR-18 |
| Use Case ID | UC-29, UC-66 |
| Test Type | Regression |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | Khách có kỳ hạn 30 ngày; hoá đơn xuất 31 ngày trước còn nợ |
| Test Data | — |
| Test Steps | 1. Mở công nợ khách |
| Expected Result | • Hiện ngày đến hạn = ngày xuất + 30, đánh dấu quá hạn |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Bảng giá

### UT-VAL-013

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-013 |
| Test Name | CreatePriceBookCommandValidator: ngày hiệu lực bắt đầu sau ngày kết thúc |
| Module | Bảng giá |
| Requirement ID | — |
| Use Case ID | UC-91 |
| Test Type | Unit |
| Priority | Medium |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Validate bảng giá có From > To |
| Expected Result | • Lỗi MSG68 (E91.1) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-PB-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-PB-001 |
| Test Name | Bảng giá: ngày hiệu lực, công thức tham chiếu chính nó, áp giá |
| Module | Bảng giá |
| Requirement ID | BR-11 |
| Use Case ID | UC-91 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Giá trị biên, Phân lớp tương đương |
| API liên quan | POST /api/price-books; PUT /api/price-books/{id:int}; POST /api/price-books/{id:int}/apply-formula; PUT /api/price-books/{id:int}/prices; GET /api/price-books/matrix |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo bảng giá From > To<br>2. Tạo công thức dựa trên chính nó<br>3. Tạo hợp lệ và áp công thức<br>4. Bán hàng cho khách thuộc phạm vi bảng giá |
| Expected Result | • MSG68<br>• MSG68<br>• Giá đúng công thức<br>• Đơn giá dòng hoá đơn lấy từ bảng giá đó |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Trả hàng bán

### IT-RET-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-RET-001 |
| Test Name | Trả hàng theo hoá đơn: tồn tăng, công nợ giảm theo giá trị trả − phí |
| Module | Trả hàng bán |
| Requirement ID | BR-19, BR-21, FLOW-05 |
| Use Case ID | UC-28, UC-41 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/sales-returns |
| Preconditions | Hoá đơn HĐ1: H1 × 5 × 100.000, khách còn nợ 500.000 |
| Test Data | Trả 2, phí trả 20.000 |
| Test Steps | 1. Tạo phiếu trả<br>2. Đọc tồn, công nợ |
| Expected Result | • Phiếu COMPLETED<br>• Tồn kho nhận +2<br>• Công nợ khách = 500.000 − (200.000 − 20.000) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-RET-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-RET-002 |
| Test Name | Trả nhiều lần không vượt SL đã bán − đã trả |
| Module | Trả hàng bán |
| Requirement ID | BR-19 |
| Use Case ID | UC-28 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Giá trị biên |
| API liên quan | POST /api/sales-returns |
| Preconditions | — |
| Test Data | HĐ1 bán 5: trả 2, trả 3, trả 1 |
| Test Steps | 1. Gửi 3 phiếu trả |
| Expected Result | • Hai lần đầu thành công<br>• Lần 3 bị từ chối MSG31 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-RET-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-RET-003 |
| Test Name | Trả hàng nhanh không hoá đơn |
| Module | Trả hàng bán |
| Requirement ID | BR-19 |
| Use Case ID | UC-28 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/sales-returns |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo phiếu trả nhanh |
| Expected Result | • Phiếu COMPLETED, tồn tăng, không giảm công nợ hoá đơn nào |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-RET-004

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-RET-004 |
| Test Name | Hoàn tiền sau cho phiếu trả |
| Module | Trả hàng bán |
| Requirement ID | BR-21 |
| Use Case ID | UC-41, UC-82 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/sales-returns/{id:int}/refunds |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Ghi hoàn tiền 180.000 |
| Expected Result | • Phiếu tài chính hoàn tiền; số đã hoàn của phiếu trả tăng |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-RET-005

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-RET-005 |
| Test Name | Trả hàng sau thời hạn trả hàng trong cài đặt |
| Module | Trả hàng bán |
| Requirement ID | — |
| Use Case ID | UC-28, UC-97 |
| Test Type | Integration |
| Priority | Medium |
| Kỹ thuật | Giá trị biên |
| API liên quan | POST /api/sales-returns |
| Preconditions | Cài đặt thời hạn trả 7 ngày; hoá đơn lập 8 ngày trước |
| Test Data | — |
| Test Steps | 1. Tạo phiếu trả |
| Expected Result | • Bị từ chối hoặc cảnh báo theo cài đặt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Tài liệu có cài đặt "return time limit" (OrderSetting) nhưng chưa ghi rõ hành vi; cần xác nhận trước khi chạy. |

### API-RET-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-RET-001 |
| Test Name | Trả hàng từ hoá đơn chưa hoàn tất / đã huỷ; không dòng nào có SL > 0 |
| Module | Trả hàng bán |
| Requirement ID | BR-19 |
| Use Case ID | UC-28 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | POST /api/sales-returns; GET /api/sales-returns/source/{invoiceId:int} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Trả từ hoá đơn đã huỷ<br>2. Mọi dòng SL 0 |
| Expected Result | • MSG17<br>• MSG31 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-RET-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-RET-001 |
| Test Name | Hoá đơn → trả hàng một phần, trả lần hai, trả vượt → tồn, công nợ, hoàn tiền |
| Module | Trả hàng bán |
| Requirement ID | BR-19, BR-21, FLOW-05 |
| Use Case ID | UC-28, UC-41, UC-79, UC-80, UC-82 |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Trả 2 / 5 từ hoá đơn<br>2. Trả 3<br>3. Trả thêm 1<br>4. Hoàn tiền |
| Expected Result | • Hai lần đầu thành công, tồn và công nợ đổi đúng<br>• Lần 3: MSG31<br>• Hoàn tiền ghi nhận; Manager xem được trên danh sách trả hàng<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |
