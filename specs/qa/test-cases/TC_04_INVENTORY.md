# Test case – Danh mục, tồn kho, kiểm kê, huỷ hàng, chuyển kho

- **Ngày lập:** 19/11/2026. **Người phụ trách:** Ninh. **Giai đoạn:** Phase 2 – Test Strategy & Test Design.
- **Sinh tự động** bằng `node specs/qa/test-design/generate.js` từ `specs/qa/test-design/data/*.js`. Sửa dữ liệu rồi chạy lại, không sửa tay file này.
- **Chưa test nào được chạy trong Phase 2.** Trạng thái "Not Run" nghĩa là đã thiết kế, chưa thực thi; không dùng làm bằng chứng đạt.
- **Số test case:** 38.
- Ma trận truy vết: [02_REQUIREMENT_TRACEABILITY_MATRIX.md](../reports/02_REQUIREMENT_TRACEABILITY_MATRIX.md). Chiến lược: [03_TEST_STRATEGY.md](../reports/03_TEST_STRATEGY.md).

## Danh sách

| ID | Tên | Module | Loại | Ưu tiên | Trạng thái |
|---|---|---|---|---|---|
| [UT-STS-001](#ut-sts-001) | Phiếu chuyển kho DRAFT: được sửa, xuất, huỷ; chưa được nhận | Chuyển kho | Unit | Critical | Not Run |
| [UT-STS-002](#ut-sts-002) | Phiếu chuyển kho IN_TRANSIT: được nhận, huỷ; không sửa, không xuất lại | Chuyển kho | Unit | Critical | Not Run |
| [UT-STS-003](#ut-sts-003) | Phiếu chuyển kho RECEIVED không được huỷ | Chuyển kho | Unit | High | Not Run |
| [UT-STS-004](#ut-sts-004) | Phiếu huỷ hàng: DRAFT sửa được; COMPLETED chỉ sửa thông tin, huỷ được; CANCELLED không thao tác | Huỷ hàng | Unit | High | Not Run |
| [UT-VAL-003](#ut-val-003) | Thời gian giao hàng của hàng hoá: biên 0 – 365 | Danh mục | Unit | High | Not Run |
| [UT-VAL-010](#ut-val-010) | CreateDisposalCommandValidator: số lượng, lý do khi hoàn thành | Huỷ hàng | Unit | High | Not Run |
| [IT-TRF-001](#it-trf-001) | Chuyển kho: xuất trừ kho nguồn, nhận cộng kho đích | Chuyển kho | Integration | Critical | Not Run |
| [IT-TRF-002](#it-trf-002) | Nhận thiếu phải có ghi chú | Chuyển kho | Integration | High | Not Run |
| [IT-TRF-003](#it-trf-003) | Nhận nhiều hơn số đã xuất bị chặn | Chuyển kho | Integration | High | Not Run |
| [IT-TRF-004](#it-trf-004) | Huỷ phiếu đang chuyển hoàn tồn kho nguồn | Chuyển kho | Integration | High | Not Run |
| [IT-TRF-005](#it-trf-005) | Quyền kho: xuất cần kho nguồn, nhận cần kho đích | Chuyển kho | Integration | High | Not Run |
| [IT-STK-001](#it-stk-001) | Hoàn thành kiểm kê điều chỉnh tồn bằng SL đếm | Kiểm kê | Integration | Critical | Not Run |
| [IT-STK-002](#it-stk-002) | Kiểm kê đang Draft chặn xuất NVL, nhập TP, duyệt hoàn thành, huỷ hàng cùng hàng, cùng kho | Kiểm kê | Integration | Critical | Not Run |
| [IT-STK-003](#it-stk-003) | Huỷ phiếu kiểm kê đã cân bằng đảo điều chỉnh | Kiểm kê | Integration | High | Not Run |
| [IT-STK-004](#it-stk-004) | Gộp các phiếu kiểm kê nháp cùng kho | Kiểm kê | Integration | Medium | Not Run |
| [IT-DSP-001](#it-dsp-001) | Hoàn thành huỷ hàng trừ tồn theo giá vốn | Huỷ hàng | Integration | Critical | Not Run |
| [IT-DSP-002](#it-dsp-002) | SL huỷ vượt tồn bị chặn | Huỷ hàng | Integration | High | Not Run |
| [IT-DSP-003](#it-dsp-003) | Huỷ phiếu huỷ hàng đã hoàn thành hoàn lại tồn đúng lô | Huỷ hàng | Integration | High | Not Run |
| [IT-CONC-003](#it-conc-003) | Nhiều request nhập / xuất cùng hàng song song giữ tồn đúng | Tồn kho | Integration | Critical | Not Run |
| [IT-CONC-004](#it-conc-004) | Hai request xuất (hoặc nhận) cùng một phiếu chuyển kho | Chuyển kho | Integration | High | Not Run |
| [API-SEC-010](#api-sec-010) | Tải ảnh hàng hoá sai định dạng hoặc lớn hơn 2 MB | Danh mục | API | Medium | Not Run |
| [API-MST-001](#api-mst-001) | Hàng hoá: mã trùng, xoá hàng đã có giao dịch, ngừng kinh doanh | Danh mục | API | High | Not Run |
| [API-MST-002](#api-mst-002) | Nhập hàng hoá từ Excel và điều chỉnh tồn | Danh mục | API | High | Not Run |
| [API-MST-003](#api-mst-003) | BOM: chỉ một bản active; không xoá BOM đã dùng cho lệnh | Danh mục | API | High | Not Run |
| [API-MST-004](#api-mst-004) | Khách hàng / NCC: mã trùng, ngừng hoạt động hàng loạt | Danh mục | API | Medium | Not Run |
| [API-INV-001](#api-inv-001) | Thẻ kho đúng thứ tự thời gian, số dư chạy khớp tồn | Tồn kho | API | High | Not Run |
| [API-INV-002](#api-inv-002) | Lọc hàng dưới định mức tồn | Tồn kho | API | Medium | Not Run |
| [API-INV-003](#api-inv-003) | Cảnh báo lô sắp hết hạn | Tồn kho | API | Medium | Blocked |
| [API-STK-001](#api-stk-001) | Kiểm kê: SL đếm âm, không có hàng, sửa phiếu đã cân bằng | Kiểm kê | API | High | Not Run |
| [API-DSP-001](#api-dsp-001) | Huỷ hàng: hoàn thành thiếu lý do; sửa phiếu đã hoàn thành | Huỷ hàng | API | High | Not Run |
| [API-TRF-001](#api-trf-001) | Chuyển kho: cùng kho, không có dòng, nhận phiếu chưa xuất, huỷ phiếu đã nhận | Chuyển kho | API | High | Not Run |
| [ST-MST-001](#st-mst-001) | Danh mục: nhóm hàng, hàng hoá (đơn vị quy đổi, thời gian giao, ảnh), khách hàng, NCC, kho, BOM | Danh mục | System | High | Not Run |
| [ST-MST-002](#st-mst-002) | Nhập hàng hoá từ Excel và điều chỉnh tồn một hàng | Danh mục | System | Medium | Not Run |
| [ST-TRF-001](#st-trf-001) | Chuyển kho hai tài khoản: xuất ở kho nguồn, nhận thiếu có ghi chú ở kho đích | Chuyển kho | System | Critical | Not Run |
| [ST-INV-001](#st-inv-001) | Kiểm kê lưu tạm chặn nghiệp vụ, hoàn thành; huỷ hàng; đối chiếu tồn và thẻ kho | Kiểm kê | System | High | Not Run |
| [RT-N02](#rt-n02) | Tái hiện N-02: nhận vượt số xuất bị chặn | Chuyển kho | Regression | High | Not Run |
| [RT-N08](#rt-n08) | Tái hiện N-08: không huỷ phiếu chuyển đã nhận | Chuyển kho | Regression | Medium | Not Run |
| [RT-N15](#rt-n15) | Xác minh N-15: lô sau khi chuyển kho | Chuyển kho | Regression | Low | Not Run |

## Danh mục

### UT-VAL-003

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-003 |
| Test Name | Thời gian giao hàng của hàng hoá: biên 0 – 365 |
| Module | Danh mục |
| Requirement ID | BR-MRP-30..33 |
| Use Case ID | UC-52 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | — |
| Preconditions | — |
| Test Data | −1, 0, 365, 366, rỗng |
| Test Steps | 1. Gọi kiểm tra ProductLeadTime với từng giá trị |
| Expected Result | • −1 và 366 lỗi MSG80<br>• 0, 365, rỗng đạt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-SEC-010

| Trường | Nội dung |
|---|---|
| Test Case ID | API-SEC-010 |
| Test Name | Tải ảnh hàng hoá sai định dạng hoặc lớn hơn 2 MB |
| Module | Danh mục |
| Requirement ID | NFR-SEC-01 |
| Use Case ID | UC-52 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Giá trị biên, Bảo mật |
| API liên quan | POST /api/products; PUT /api/products/{id} |
| Preconditions | — |
| Test Data | File .exe đổi đuôi .jpg; ảnh 2,1 MB; ảnh 2 MB |
| Test Steps | 1. Lưu hàng hoá với từng ảnh |
| Expected Result | • Hai file đầu bị từ chối<br>• Ảnh 2 MB được lưu |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-MST-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-MST-001 |
| Test Name | Hàng hoá: mã trùng, xoá hàng đã có giao dịch, ngừng kinh doanh |
| Module | Danh mục |
| Requirement ID | BR-06 |
| Use Case ID | UC-52 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | POST /api/products; DELETE /api/products/{id}; PATCH /api/products/{id}/toggle-status |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo mã trùng<br>2. Xoá hàng đã bán<br>3. Ngừng kinh doanh hàng đó |
| Expected Result | • MSG09<br>• MSG17<br>• 200 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-MST-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-MST-002 |
| Test Name | Nhập hàng hoá từ Excel và điều chỉnh tồn |
| Module | Danh mục |
| Requirement ID | BR-06, BR-29 |
| Use Case ID | UC-99 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/products/import; POST /api/products/{id}/stock-adjustments |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Nhập file có dòng trùng mã khác tên<br>2. Nhập file hợp lệ<br>3. Điều chỉnh tồn thêm 0<br>4. Điều chỉnh tồn thực tế −1<br>5. Điều chỉnh tồn thực tế 15 |
| Expected Result | • MSG01, dừng nhập<br>• MSG72 (số mới / cập nhật)<br>• MSG01<br>• MSG01<br>• Tồn = 15; tạo phiếu kiểm kê BALANCED |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-MST-003

| Trường | Nội dung |
|---|---|
| Test Case ID | API-MST-003 |
| Test Name | BOM: chỉ một bản active; không xoá BOM đã dùng cho lệnh |
| Module | Danh mục |
| Requirement ID | BR-30 |
| Use Case ID | UC-57 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | POST /api/production/boms; POST /api/production/boms/{id:int}/activate; DELETE /api/production/boms/{id:int} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Kích hoạt bản v2 khi v1 đang active<br>2. Xoá v1 đã dùng |
| Expected Result | • v2 active, v1 ngừng<br>• MSG17 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-MST-004

| Trường | Nội dung |
|---|---|
| Test Case ID | API-MST-004 |
| Test Name | Khách hàng / NCC: mã trùng, ngừng hoạt động hàng loạt |
| Module | Danh mục |
| Requirement ID | BR-06 |
| Use Case ID | UC-54 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Kiểm thử âm |
| API liên quan | POST /api/customers; PATCH /api/customers/batch-status; POST /api/suppliers; PUT /api/customers/{id} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo trùng mã<br>2. Ngừng 3 khách<br>3. Sửa khách và gửi kèm dư nợ khác |
| Expected Result | • MSG09<br>• 3 khách ngừng<br>• Dư nợ không đổi qua API sửa thông tin |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-MST-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-MST-001 |
| Test Name | Danh mục: nhóm hàng, hàng hoá (đơn vị quy đổi, thời gian giao, ảnh), khách hàng, NCC, kho, BOM |
| Module | Danh mục |
| Requirement ID | BR-06, BR-26, BR-30 |
| Use Case ID | UC-51, UC-52, UC-53, UC-54, UC-56, UC-57 |
| Test Type | System |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo nhóm hàng<br>2. Tạo NVL có đơn vị quy đổi, thời gian giao 7 ngày, ảnh<br>3. Tạo thành phẩm và BOM, kích hoạt<br>4. Tạo khách hàng, NCC<br>5. Admin tạo kho<br>6. Sửa hàng hoá, ngừng kinh doanh |
| Expected Result | • Dữ liệu lưu đúng; mã trùng bị chặn<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-MST-002

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-MST-002 |
| Test Name | Nhập hàng hoá từ Excel và điều chỉnh tồn một hàng |
| Module | Danh mục |
| Requirement ID | — |
| Use Case ID | UC-99 |
| Test Type | System |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Nhập file mẫu 20 dòng<br>2. Điều chỉnh tồn H1 tại K001 |
| Expected Result | • MSG72 với số mới / cập nhật đúng<br>• Tồn đổi; có phiếu kiểm kê BALANCED |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Tồn kho

### IT-CONC-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-CONC-003 |
| Test Name | Nhiều request nhập / xuất cùng hàng song song giữ tồn đúng |
| Module | Tồn kho |
| Requirement ID | NFR-REL-01, NFR-REL-02 |
| Use Case ID | — |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Đồng thời |
| API liên quan | POST /api/purchases; POST /api/orders/pos; POST /api/disposals |
| Preconditions | — |
| Test Data | H1 tồn 100; song song: 10 phiếu nhập × 5, 10 hoá đơn × 3, 5 phiếu huỷ × 1 |
| Test Steps | 1. Gửi đồng thời 25 request<br>2. Đối chiếu tồn và thẻ kho |
| Expected Result | • Tồn = 100 + 50 − 30 − 5 = 115<br>• Σ quantity của trx_inventory_transactions (hàng, kho) = quantity trong trx_inventory_balances |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-INV-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-INV-001 |
| Test Name | Thẻ kho đúng thứ tự thời gian, số dư chạy khớp tồn |
| Module | Tồn kho |
| Requirement ID | NFR-REL-01 |
| Use Case ID | UC-73 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | GET /api/products/{id}/stock-card |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Sau IT-CONC-003, đọc thẻ kho H1 tại K001 |
| Expected Result | • Số dư dòng cuối = tồn hiện tại; mỗi dòng có loại, chứng từ, người |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-INV-002

| Trường | Nội dung |
|---|---|
| Test Case ID | API-INV-002 |
| Test Name | Lọc hàng dưới định mức tồn |
| Module | Tồn kho |
| Requirement ID | BR-48 |
| Use Case ID | UC-77 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Giá trị biên |
| API liên quan | GET /api/products |
| Preconditions | — |
| Test Data | H1 tồn 5 điểm đặt 5; H2 tồn 6 điểm đặt 5 |
| Test Steps | 1. Lọc "Dưới định mức tồn" |
| Expected Result | • Có H1, không có H2 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-INV-003

| Trường | Nội dung |
|---|---|
| Test Case ID | API-INV-003 |
| Test Name | Cảnh báo lô sắp hết hạn |
| Module | Tồn kho |
| Requirement ID | BR-48 |
| Use Case ID | UC-78 |
| Test Type | API |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Mở cảnh báo hạn dùng |
| Expected Result | • Liệt kê lô hết hạn trong số ngày cấu hình |
| Actual Result | — |
| Status | Blocked |
| Evidence | — |
| Ghi chú | Chưa có chức năng và không thu hạn dùng (UC-78 "Chưa có code"). |

## Kiểm kê

### IT-STK-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-STK-001 |
| Test Name | Hoàn thành kiểm kê điều chỉnh tồn bằng SL đếm |
| Module | Kiểm kê |
| Requirement ID | BR-43 |
| Use Case ID | UC-39, UC-40 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/stocktakes |
| Preconditions | — |
| Test Data | H1 hệ thống 10 đếm 8; H2 hệ thống 5 đếm 7 |
| Test Steps | 1. Tạo và hoàn thành phiếu kiểm kê |
| Expected Result | • Tồn H1 = 8, H2 = 7<br>• Thẻ kho STOCKTAKE_OUT −2, STOCKTAKE_IN +2<br>• Phiếu BALANCED, lưu chênh lệch SL và giá trị từng dòng<br>• Σ quantity của trx_inventory_transactions (hàng, kho) = quantity trong trx_inventory_balances |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-STK-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-STK-002 |
| Test Name | Kiểm kê đang Draft chặn xuất NVL, nhập TP, duyệt hoàn thành, huỷ hàng cùng hàng, cùng kho |
| Module | Kiểm kê |
| Requirement ID | BR-42 |
| Use Case ID | UC-39, UC-43, UC-46, UC-49 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Bảng quyết định |
| API liên quan | POST /api/stocktakes; POST /api/production/material-issues; POST /api/production/finished-goods-receipts; POST /api/production/orders/{id:int}/approve; POST /api/disposals |
| Preconditions | Phiếu kiểm kê DRAFT tại K001 có H1, TP1 |
| Test Data | — |
| Test Steps | 1. Xuất NVL H1 tại K001<br>2. Nhập TP1 tại K001<br>3. Duyệt hoàn thành lệnh nhận TP1 tại K001<br>4. Huỷ hàng H1 tại K001<br>5. Xuất NVL H1 tại K002 |
| Expected Result | • Bốn thao tác đầu bị chặn MSG50<br>• Thao tác ở K002 thành công |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-STK-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-STK-003 |
| Test Name | Huỷ phiếu kiểm kê đã cân bằng đảo điều chỉnh |
| Module | Kiểm kê |
| Requirement ID | BR-43 |
| Use Case ID | UC-39 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | POST /api/stocktakes/{id:int}/cancel |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Huỷ phiếu của IT-STK-001 |
| Expected Result | • Tồn H1 = 10, H2 = 5; thẻ kho có dòng đảo |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-STK-004

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-STK-004 |
| Test Name | Gộp các phiếu kiểm kê nháp cùng kho |
| Module | Kiểm kê |
| Requirement ID | — |
| Use Case ID | UC-39 |
| Test Type | Integration |
| Priority | Medium |
| Kỹ thuật | Phân lớp tương đương, Kiểm thử âm |
| API liên quan | POST /api/stocktakes/merge |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Gộp 2 phiếu DRAFT cùng K001<br>2. Gộp phiếu K001 với K002 |
| Expected Result | • Lần 1: 1 phiếu chứa dòng của cả hai<br>• Lần 2 bị từ chối |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-STK-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-STK-001 |
| Test Name | Kiểm kê: SL đếm âm, không có hàng, sửa phiếu đã cân bằng |
| Module | Kiểm kê |
| Requirement ID | BR-43 |
| Use Case ID | UC-39 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/stocktakes; PUT /api/stocktakes/{id:int} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. SL đếm −1<br>2. Không có dòng<br>3. Sửa phiếu BALANCED |
| Expected Result | • MSG01<br>• MSG01<br>• MSG17 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### ST-INV-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-INV-001 |
| Test Name | Kiểm kê lưu tạm chặn nghiệp vụ, hoàn thành; huỷ hàng; đối chiếu tồn và thẻ kho |
| Module | Kiểm kê |
| Requirement ID | BR-42, BR-43, BR-44 |
| Use Case ID | UC-39, UC-40, UC-43, UC-72, UC-73 |
| Test Type | System |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Tạo kiểm kê nháp có NVL1<br>2. Thử xuất NVL1<br>3. Hoàn thành kiểm kê<br>4. Tạo phiếu huỷ hàng, hoàn thành<br>5. Đối chiếu tồn và thẻ kho |
| Expected Result | • Xuất bị chặn MSG50<br>• Tồn = SL đếm<br>• Tồn trừ SL huỷ<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Huỷ hàng

### UT-STS-004

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-STS-004 |
| Test Name | Phiếu huỷ hàng: DRAFT sửa được; COMPLETED chỉ sửa thông tin, huỷ được; CANCELLED không thao tác |
| Module | Huỷ hàng |
| Requirement ID | BR-44 |
| Use Case ID | UC-43 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái, Bảng quyết định |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Lần lượt đặt Status = DRAFT, COMPLETED, CANCELLED và kiểm CanEdit, CanEditInfo, CanCancel |
| Expected Result | • DRAFT: cả ba true<br>• COMPLETED: CanEdit false, CanEditInfo true, CanCancel true<br>• CANCELLED: cả ba false |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-VAL-010

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-VAL-010 |
| Test Name | CreateDisposalCommandValidator: số lượng, lý do khi hoàn thành |
| Module | Huỷ hàng |
| Requirement ID | BR-44 |
| Use Case ID | UC-43 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Phân lớp tương đương, Bảng quyết định |
| API liên quan | — |
| Preconditions | — |
| Test Data | SL 0; hoàn thành không lý do; lưu tạm không lý do |
| Test Steps | 1. Validate từng request |
| Expected Result | • SL 0 lỗi<br>• Hoàn thành không lý do lỗi MSG40<br>• Lưu tạm không lý do đạt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-DSP-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-DSP-001 |
| Test Name | Hoàn thành huỷ hàng trừ tồn theo giá vốn |
| Module | Huỷ hàng |
| Requirement ID | BR-44 |
| Use Case ID | UC-43 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Phân lớp tương đương |
| API liên quan | POST /api/disposals |
| Preconditions | — |
| Test Data | H1 tồn 10, MAC 100; huỷ 3, lý do "hỏng" |
| Test Steps | 1. Tạo và hoàn thành phiếu |
| Expected Result | • Tồn = 7; giá trị phiếu 300; thẻ kho −3; COMPLETED |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-DSP-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-DSP-002 |
| Test Name | SL huỷ vượt tồn bị chặn |
| Module | Huỷ hàng |
| Requirement ID | BR-44 |
| Use Case ID | UC-43 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Giá trị biên |
| API liên quan | POST /api/disposals |
| Preconditions | — |
| Test Data | Tồn 3, huỷ 4 |
| Test Steps | 1. Hoàn thành phiếu |
| Expected Result | • Bị từ chối MSG54; tồn không đổi |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-DSP-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-DSP-003 |
| Test Name | Huỷ phiếu huỷ hàng đã hoàn thành hoàn lại tồn đúng lô |
| Module | Huỷ hàng |
| Requirement ID | BR-44 |
| Use Case ID | UC-43 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | DELETE /api/disposals/{id:int} |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Huỷ phiếu của IT-DSP-001 |
| Expected Result | • Tồn = 10 (đúng kho, vị trí, lô cũ); CANCELLED |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-DSP-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-DSP-001 |
| Test Name | Huỷ hàng: hoàn thành thiếu lý do; sửa phiếu đã hoàn thành |
| Module | Huỷ hàng |
| Requirement ID | BR-44 |
| Use Case ID | UC-43 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái, Kiểm thử âm |
| API liên quan | POST /api/disposals; PUT /api/disposals/{id:int}; PUT /api/disposals/{id:int}/info |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Hoàn thành không lý do<br>2. Sửa dòng phiếu COMPLETED<br>3. Sửa ghi chú phiếu COMPLETED |
| Expected Result | • MSG40<br>• Bị từ chối<br>• 200 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

## Chuyển kho

### UT-STS-001

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-STS-001 |
| Test Name | Phiếu chuyển kho DRAFT: được sửa, xuất, huỷ; chưa được nhận |
| Module | Chuyển kho |
| Requirement ID | BR-40 |
| Use Case ID | UC-37 |
| Test Type | Unit |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | — |
| Preconditions | TrxStockTransfer.Status = DRAFT |
| Test Data | — |
| Test Steps | 1. Kiểm CanEdit, CanIssue, CanReceive, CanCancel<br>2. Gọi MarkInTransit |
| Expected Result | • CanEdit = CanIssue = CanCancel = true; CanReceive = false<br>• Status = IN_TRANSIT |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-STS-002

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-STS-002 |
| Test Name | Phiếu chuyển kho IN_TRANSIT: được nhận, huỷ; không sửa, không xuất lại |
| Module | Chuyển kho |
| Requirement ID | BR-40 |
| Use Case ID | UC-37 |
| Test Type | Unit |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | — |
| Preconditions | Status = IN_TRANSIT |
| Test Data | — |
| Test Steps | 1. Kiểm CanEdit, CanIssue, CanReceive, CanCancel<br>2. Gọi MarkReceived |
| Expected Result | • CanReceive = CanCancel = true; CanEdit = CanIssue = false<br>• Status = RECEIVED |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### UT-STS-003

| Trường | Nội dung |
|---|---|
| Test Case ID | UT-STS-003 |
| Test Name | Phiếu chuyển kho RECEIVED không được huỷ |
| Module | Chuyển kho |
| Requirement ID | BR-40 |
| Use Case ID | UC-37 |
| Test Type | Unit |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái, Kiểm thử âm |
| API liên quan | — |
| Preconditions | Status = RECEIVED |
| Test Data | — |
| Test Steps | 1. Kiểm CanCancel |
| Expected Result | • CanCancel = false (A37.2: chỉ huỷ phiếu Draft hoặc In Transit) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Dự đoán Failed: code cho CanCancel = true khi RECEIVED (TrxStockTransfer.Status.cs). Nghi vấn N-08. |

### IT-TRF-001

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-TRF-001 |
| Test Name | Chuyển kho: xuất trừ kho nguồn, nhận cộng kho đích |
| Module | Chuyển kho |
| Requirement ID | BR-40, FLOW-04 |
| Use Case ID | UC-37 |
| Test Type | Integration |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | POST /api/transfers; POST /api/transfers/{id}/complete; POST /api/transfers/{id}/receive |
| Preconditions | K001: H1 = 10; K002: H1 = 0 |
| Test Data | Chuyển H1 × 6 từ K001 sang K002 |
| Test Steps | 1. Tạo phiếu DRAFT<br>2. Hoàn thành (xuất)<br>3. Nhận đủ 6 |
| Expected Result | • DRAFT: không đổi tồn<br>• Xuất: K001 = 4, IN_TRANSIT<br>• Nhận: K002 = 6, RECEIVED<br>• Thẻ kho hai kho đều có dòng tham chiếu phiếu<br>• Σ quantity của trx_inventory_transactions (hàng, kho) = quantity trong trx_inventory_balances |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-TRF-002

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-TRF-002 |
| Test Name | Nhận thiếu phải có ghi chú |
| Module | Chuyển kho |
| Requirement ID | BR-41 |
| Use Case ID | UC-38 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Giá trị biên, Bảng quyết định |
| API liên quan | POST /api/transfers/{id}/receive |
| Preconditions | — |
| Test Data | Xuất 6, nhận 5 không ghi chú; rồi nhận 5 có ghi chú |
| Test Steps | 1. Nhận không ghi chú<br>2. Nhận có ghi chú |
| Expected Result | • Lần 1 bị từ chối MSG49<br>• Lần 2: K002 + 5, ghi nhận chênh lệch 1 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-TRF-003

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-TRF-003 |
| Test Name | Nhận nhiều hơn số đã xuất bị chặn |
| Module | Chuyển kho |
| Requirement ID | BR-40 |
| Use Case ID | UC-38 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Giá trị biên, Kiểm thử âm |
| API liên quan | POST /api/transfers/{id}/receive |
| Preconditions | — |
| Test Data | Xuất 6, nhận 7 |
| Test Steps | 1. Nhận 7 |
| Expected Result | • Bị từ chối; tồn K002 không đổi |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Nghi vấn N-02 (ReceiveTransferCommand.cs:63, 99 không chặn). |

### IT-TRF-004

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-TRF-004 |
| Test Name | Huỷ phiếu đang chuyển hoàn tồn kho nguồn |
| Module | Chuyển kho |
| Requirement ID | BR-40 |
| Use Case ID | UC-37 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | POST /api/transfers/{id}/cancel |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Huỷ phiếu IN_TRANSIT |
| Expected Result | • K001 tăng lại 6; CANCELLED; thẻ kho có dòng đảo |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-TRF-005

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-TRF-005 |
| Test Name | Quyền kho: xuất cần kho nguồn, nhận cần kho đích |
| Module | Chuyển kho |
| Requirement ID | BR-04, FLOW-07 |
| Use Case ID | UC-37 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Bảng quyết định |
| API liên quan | POST /api/transfers/{id}/complete; POST /api/transfers/{id}/receive |
| Preconditions | U1 chỉ có K001; U2 chỉ có K002 |
| Test Data | — |
| Test Steps | 1. U2 xuất phiếu K001 → K002<br>2. U1 xuất<br>3. U1 nhận<br>4. U2 nhận |
| Expected Result | • U2 xuất: MSG04<br>• U1 xuất: thành công<br>• U1 nhận: MSG04<br>• U2 nhận: thành công |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### IT-CONC-004

| Trường | Nội dung |
|---|---|
| Test Case ID | IT-CONC-004 |
| Test Name | Hai request xuất (hoặc nhận) cùng một phiếu chuyển kho |
| Module | Chuyển kho |
| Requirement ID | BR-40 |
| Use Case ID | UC-37 |
| Test Type | Integration |
| Priority | High |
| Kỹ thuật | Đồng thời |
| API liên quan | POST /api/transfers/{id}/complete; POST /api/transfers/{id}/receive |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Gửi song song 2 lệnh xuất<br>2. Gửi song song 2 lệnh nhận |
| Expected Result | • Mỗi cặp chỉ 1 thành công; tồn chỉ trừ / cộng một lần |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### API-TRF-001

| Trường | Nội dung |
|---|---|
| Test Case ID | API-TRF-001 |
| Test Name | Chuyển kho: cùng kho, không có dòng, nhận phiếu chưa xuất, huỷ phiếu đã nhận |
| Module | Chuyển kho |
| Requirement ID | BR-40 |
| Use Case ID | UC-37 |
| Test Type | API |
| Priority | High |
| Kỹ thuật | Chuyển trạng thái, Kiểm thử âm |
| API liên quan | POST /api/transfers; POST /api/transfers/{id}/receive; POST /api/transfers/{id}/cancel |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Nguồn = đích<br>2. Không dòng hàng<br>3. Nhận phiếu DRAFT<br>4. Huỷ phiếu RECEIVED |
| Expected Result | • MSG46<br>• MSG46<br>• MSG17<br>• MSG17 (A37.2) |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | Ca 4 – nghi vấn N-08. |

### ST-TRF-001

| Trường | Nội dung |
|---|---|
| Test Case ID | ST-TRF-001 |
| Test Name | Chuyển kho hai tài khoản: xuất ở kho nguồn, nhận thiếu có ghi chú ở kho đích |
| Module | Chuyển kho |
| Requirement ID | BR-40, BR-41, BR-04, FLOW-04 |
| Use Case ID | UC-37, UC-38, UC-74 |
| Test Type | System |
| Priority | Critical |
| Kỹ thuật | Chuyển trạng thái |
| API liên quan | — |
| Preconditions | U1 có K001, U2 có K002 |
| Test Data | — |
| Test Steps | 1. U1 tạo, xuất phiếu 10<br>2. U2 thấy phiếu đến, nhận 9 không ghi chú<br>3. U2 nhận 9 có ghi chú<br>4. Manager xem theo dõi chuyển kho |
| Expected Result | • K001 −10 khi xuất<br>• MSG49<br>• K002 +9; chênh lệch 1 hiện trên phiếu<br>• Trạng thái cuối khớp giữa giao diện, API và database |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### RT-N02

| Trường | Nội dung |
|---|---|
| Test Case ID | RT-N02 |
| Test Name | Tái hiện N-02: nhận vượt số xuất bị chặn |
| Module | Chuyển kho |
| Requirement ID | BR-40 |
| Use Case ID | UC-38 |
| Test Type | Regression |
| Priority | High |
| Kỹ thuật | Theo rủi ro |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy IT-TRF-003 |
| Expected Result | • Sau sửa: đạt; chạy lại IT-TRF-*, API-TRF-001, ST-TRF-001 |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### RT-N08

| Trường | Nội dung |
|---|---|
| Test Case ID | RT-N08 |
| Test Name | Tái hiện N-08: không huỷ phiếu chuyển đã nhận |
| Module | Chuyển kho |
| Requirement ID | BR-40 |
| Use Case ID | UC-37 |
| Test Type | Regression |
| Priority | Medium |
| Kỹ thuật | Theo rủi ro |
| API liên quan | — |
| Preconditions | — |
| Test Data | — |
| Test Steps | 1. Chạy UT-STS-003, API-TRF-001 ca 4 |
| Expected Result | • Sau sửa: đạt |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |

### RT-N15

| Trường | Nội dung |
|---|---|
| Test Case ID | RT-N15 |
| Test Name | Xác minh N-15: lô sau khi chuyển kho |
| Module | Chuyển kho |
| Requirement ID | BR-40 |
| Use Case ID | UC-37 |
| Test Type | Regression |
| Priority | Low |
| Kỹ thuật | Đoán lỗi |
| API liên quan | — |
| Preconditions | TP1 lô L1 tại K001 |
| Test Data | — |
| Test Steps | 1. Chuyển TP1 sang K002<br>2. Xem tồn theo lô tại K002 |
| Expected Result | • Ghi nhận lô có được giữ hay không (tài liệu chưa quy định); báo nhóm |
| Actual Result | — |
| Status | Not Run |
| Evidence | — |
| Ghi chú | — |
