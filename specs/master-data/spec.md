# SPEC — Danh mục: hàng hóa, đơn vị, đối tác, hạn mức, kho, BOM

- **Module:** `master-data`  •  **Use Case:** UC-51 – UC-57
- **Nguồn yêu cầu (Expected):** Report 3 bản revised (Google Doc của nhóm, tab `Report3_revised`).
- **Nguồn hiện trạng (Existing):** mã nguồn nhánh `dev`, commit `dbb58c0`, đọc tĩnh ngày 12/11/2026. Chưa chạy thử trừ khi ghi rõ.
- **Quy ước:** cột "Hiện trạng" dùng: Có, Một phần, Khác tài liệu, Chưa có, Ngoài tài liệu (code có nhưng Report 3 không mô tả).

## 1. Overview

Manager duy trì danh mục: hàng hóa và nguyên vật liệu, đơn vị và quy đổi, khách hàng và nhà cung cấp, hạn mức tín dụng, kho và vị trí, BOM.

## 2. Scope

**Trong phạm vi**
- Hàng hóa / nguyên vật liệu (UC-52)
- Đơn vị / quy đổi (UC-53)
- Khách hàng / nhà cung cấp (UC-54)
- Hạn mức tín dụng (UC-55)
- Kho và vị trí (UC-56)
- BOM (UC-57)
- Ngừng hoạt động dữ liệu

**Ngoài phạm vi**
- Bảng giá bán (có trong code, SRS không mô tả)

## 3. Actors and Permissions

| Actor | Quyền | Ghi chú |
|---|---|---|
| Manager | GOODS_*, PARTNER_*; kho: [RequireAdmin] | SRS giao Manager quản lý kho; code chỉ cho Admin |

## 4. Preconditions and Postconditions

**Preconditions**
- Manager đã đăng nhập và có quyền danh mục

**Postconditions**
- Dữ liệu được tạo, sửa hoặc ngừng hoạt động
- Thất bại: dữ liệu không đổi

## 5. Business Rules

Mã BR giữ nguyên theo Report 3 để truy vết.

| Mã | Quy tắc |
|---|---|
| BR-06 | Mã duy nhất; dữ liệu đã dùng trong giao dịch chỉ được ngừng hoạt động, không xóa. |
| BR-18 | Kỳ hạn thanh toán của khách dùng để tính hạn nợ. |
| BR-26 | Quy đổi đơn vị theo hệ số cấu hình. |
| BR-27 | Hàng theo dõi lô phải nhập lô, hạn dùng khi nhận. |
| BR-30 | Mỗi thành phẩm tối đa một BOM Active. |
| BR-48 | Cảnh báo điểm đặt hàng lại và hạn dùng. |
| BR-49 | Thay đổi hạn mức ghi audit. |

## 6. Functional Requirements

| Mã | Yêu cầu (Expected) | Hiện trạng | Hành vi hiện tại (Existing) |
|---|---|---|---|
| FR-MD-01 | Hàng hóa: mã, tên, loại, nhóm, đơn vị cơ sở, giá bán, điểm đặt hàng lại, theo dõi lô / hạn dùng | Một phần | Đủ trừ cờ theo dõi lô; có thêm ảnh, mã vạch, nhập từ file, tồn đầu kỳ |
| FR-MD-02 | Đơn vị và hệ số quy đổi theo hàng | Một phần | Đơn vị tự tạo từ form hàng hóa; không có màn riêng; hệ số không được dùng ở chứng từ |
| FR-MD-03 | Khách hàng / nhà cung cấp: mã, tên, loại, liên hệ, kỳ hạn thanh toán | Một phần | Không có kỳ hạn thanh toán; có thêm hồ sơ khách (giới tính, ngày sinh…) |
| FR-MD-04 | Đặt hạn mức tín dụng, hiện dư nợ, ghi audit | Một phần | Lưu được qua sửa khách hàng; không kiểm tra số âm khi sửa; không audit |
| FR-MD-05 | Kho và vị trí lưu trữ | Một phần | Có CRUD kho (chỉ Admin); không có vị trí |
| FR-MD-06 | BOM: phiên bản, vật tư, định mức (tối đa 4 số lẻ), hao hụt; lọc đúng loại hàng (FINISHED / RAW_MATERIAL + bật chọn bán thành phẩm); kích hoạt & tạo phiên bản mới | Có | Đã có CRUD BOM (`/api/production/boms`), lọc theo loại mặt hàng, định mức 4 số lẻ, tạo phiên bản mới |
| FR-MD-07 | Ngừng hoạt động thay cho xóa khi dữ liệu đã dùng | Có | Hàng hóa, khách, nhà cung cấp, kho đều có kiểm tra |
| FR-MD-08 | (Existing) Sửa trực tiếp dư nợ khách và công nợ nhà cung cấp qua API cập nhật | Ngoài tài liệu | Trái BR-15, BR-25, BR-46 |

## 7. Non-functional Requirements

- **NFR-01.** Giao diện web cho máy tính, độ phân giải tối thiểu 1366×768; hỗ trợ Chrome, Edge, Firefox bản ổn định (SRS 4.1, 4.2.5).
- **NFR-02.** 95% yêu cầu thường hoàn thành trong 2 giây; thao tác giao dịch trả kết quả trong 3 giây (SRS 4.2.2).
- **NFR-03.** Mọi API phải kiểm tra quyền chức năng và quyền kho ở server; ẩn nút trên giao diện không được coi là phân quyền (SRS 4.2.4, BR-02).
- **NFR-04.** Giao dịch lỗi không được cập nhật dở dang; chỉ báo thành công khi transaction đã commit (SRS 4.2.3).
- **NFR-05.** Thay đổi nhạy cảm phải có nhật ký audit gồm người thực hiện, thời gian, thao tác, giá trị trước và sau (BR-49). **Existing:** hệ thống chưa có bảng audit.
- **NFR-06.** Thông báo hệ thống: SRS yêu cầu tiếng Anh theo mã MSG01–MSG65. **Existing:** toàn bộ thông báo bằng tiếng Việt. Cần nhóm chốt (xem Open Questions).

## 8. Validation Rules

| Trường | Quy tắc (Expected) | Hiện trạng FE / BE |
|---|---|---|
| Mã hàng, mã đối tác, mã kho | Duy nhất | BE: kiểm tra + unique index |
| Hạn mức | ≥ 0 | BE: có khi tạo, không có khi sửa |
| Hệ số quy đổi | > 0 | Chưa xác minh |
| BOM | Có ít nhất một vật tư | Chưa có |
| Email, điện thoại đối tác | Đúng định dạng | BE: có |

## 9. Main Flow

1. Manager mở Danh mục
2. Hệ thống hiển thị các tab danh mục
3. Chọn thao tác
4. Hệ thống kiểm tra
5. Lưu và hiển thị kết quả

## 10. Alternative Flows

| Luồng | Mô tả |
|---|---|
| A51.1 – A51.6 | Thao tác trên từng loại danh mục |
| A51.7 Ngừng hoạt động | Giữ bản ghi cho lịch sử, ẩn khỏi giao dịch mới |

## 11. Exception Handling

| Mã | Nguyên nhân | Phản hồi mong đợi |
|---|---|---|
| E51.1 | Thiếu hoặc sai dữ liệu (hạn mức âm, hệ số ≤ 0, BOM không có vật tư) | MSG01 |
| E51.2 | Trùng mã | MSG09 |
| E51.3 | Xóa dữ liệu đã dùng | Đề nghị ngừng hoạt động; không xóa |

## 12. API Specification

Chỉ liệt kê API đang có trong code. Dòng "—" là yêu cầu chưa có API; SPEC này không đề xuất tên API mới.

| Method | Đường dẫn | Quyền | Mục đích | Hiện trạng |
|---|---|---|---|---|
| GET/POST/PUT/DELETE | /api/products… | GOODS_READ / CREATE / UPDATE / DELETE | Hàng hóa, nhóm hàng, đơn vị, thẻ kho, nhập từ file | Một phần |
| PATCH | /api/products/{id}/toggle-status | GOODS_UPDATE | Ngừng / mở kinh doanh | Có |
| GET/POST/PUT/DELETE | /api/customers… | PARTNER_* | Khách hàng | Một phần |
| GET/POST/PUT/DELETE | /api/suppliers… | PARTNER_* | Nhà cung cấp | Một phần |
| GET/POST/PUT/DELETE | /api/warehouses… | Đọc: đã đăng nhập. Ghi: RequireAdmin | Kho | Một phần |
| GET/POST/PUT/DELETE | /api/price-books… | GOODS_* | Bảng giá | Ngoài tài liệu |
| — | Vị trí kho, BOM | — | UC-56, UC-57 | Chưa có |

## 13. Database Specification

Mọi bảng thuộc schema `stockflow`. SPEC này không đề xuất bảng hay cột mới.

| Bảng | Vai trò | Hiện trạng |
|---|---|---|
| mst_products, mst_product_categories, mst_product_images | Hàng hóa | Thiếu cờ theo dõi lô |
| mst_units, mst_unit_conversions | Đơn vị, quy đổi | Có |
| mst_business_partners | Đối tác, hạn mức, dư nợ | Thiếu kỳ hạn thanh toán, mã số thuế |
| mst_warehouses, mst_warehouse_locations | Kho, vị trí | Vị trí không có code |
| mst_boms, dtl_bom_items | BOM | Có bảng, không có code |
| mst_price_books, dtl_price_book_items | Bảng giá | Ngoài SRS |

## 14. Acceptance Criteria

- **AC-MD-01.** Trùng mã bị từ chối.
- **AC-MD-02.** Dữ liệu đã dùng không xóa được, chỉ ngừng hoạt động.
- **AC-MD-03.** Dữ liệu ngừng hoạt động không chọn được trong chứng từ mới nhưng vẫn hiện trong chứng từ cũ.
- **AC-MD-04.** Hạn mức mới áp dụng cho lần bán nợ kế tiếp.

## 15. Test Scenarios

| Mã | Kịch bản | Kết quả mong đợi | Mức test |
|---|---|---|---|
| TS-MD-01 | Tạo hàng trùng mã | Bị từ chối | Unit |
| TS-MD-02 | Xóa hàng đã có giao dịch | Bị từ chối, gợi ý ngừng kinh doanh | Integration |
| TS-MD-03 | Ngừng kinh doanh rồi bán | Bị từ chối | Integration |
| TS-MD-04 | Sửa hạn mức âm | Bị từ chối (hiện tại: lưu được) | Unit |
| TS-MD-05 | Gửi currentDebt trong API sửa khách | Bị bỏ qua (hiện tại: ghi đè dư nợ) | Integration |
| TS-MD-06 | Quản lý BOM, vị trí kho | Chưa kiểm thử được | System |

## 16. Dependencies and Constraints

- Mọi module giao dịch
- specs/production (BOM)
- Ràng buộc chung: backend ASP.NET Core 9, EF Core 9, PostgreSQL; frontend Next.js 16; không thêm package khi chưa được nhóm duyệt.

## Open Questions / Issues

1. API sửa khách hàng và nhà cung cấp ghi đè được dư nợ / công nợ (rủi ro nghiêm trọng về dữ liệu tài chính).
2. API sửa nhà cung cấp không kiểm tra loại đối tác.
3. Thiếu kỳ hạn thanh toán, cờ theo dõi lô, vị trí kho, BOM.
4. Quản lý kho chỉ dành cho Admin, khác SRS (Manager).
5. Bảng giá có trong code, không có trong SRS.

## Source code đã phân tích

**Backend**
- `StockFlow_Backend/StockFlow.Application/Features/Products/**`
- `StockFlow_Backend/StockFlow.Application/Features/Customers/Commands/*.cs`
- `StockFlow_Backend/StockFlow.Application/Features/Suppliers/Commands/*.cs`
- `StockFlow_Backend/StockFlow.Application/Features/WarehousePermissions/Commands/*WarehouseCommand.cs`
- `StockFlow_Backend/StockFlow.Application/Features/PriceBooks/**`

**Frontend**
- `StockFlow_Frontend/src/features/products/screens/GoodsCatalogScreen.tsx`
- `StockFlow_Frontend/src/features/customers/screens/CustomersScreen.tsx`
- `StockFlow_Frontend/src/features/suppliers/screens/SuppliersScreen.tsx`
- `StockFlow_Frontend/src/features/bom/screens/BomManagementScreen.tsx (dữ liệu giả)`
