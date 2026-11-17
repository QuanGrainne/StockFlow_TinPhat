# 09 — Lộ trình triển khai (Phase 7)

Chưa bắt đầu code. Lộ trình chỉ có hiệu lực sau khi tài liệu này được duyệt và các câu hỏi ở file 03 mục 7 được trả lời.

Đường dẫn backend tính từ `StockFlow_Backend/`, frontend từ `StockFlow_Frontend/src/`.

## 1. Các gói việc

### WP01 — Chuẩn bị dữ liệu và hệ thống hiện có

| Mục | Nội dung |
|---|---|
| Phạm vi | Thêm thời gian giao cho hàng hóa; thêm ngày giao dự kiến cho đơn đặt; entity và bảng lần chạy MRP; chức năng phân quyền |
| File tạo | Migration mới; `Domain/Entities/TrxMrpRun.cs`, `DtlMrpRunLine.cs` |
| File sửa | `Domain/Entities/MstProduct.cs`, `TrxPurchaseOrder.cs`; `IStockFlowDbContext.cs`; `StockFlowDbContext.cs`; `Features/Products` (DTO, tạo, sửa, đọc); `Features/PurchaseOrders` (DTO, command, query); `FeatureConstants.cs`; `TransactionCodeGenerator.cs`; frontend: form hàng hóa, form đơn đặt (`CreatePurchaseScreen.tsx`), `permissionService.ts` |
| Phụ thuộc | Trả lời Q6, Q8, Q10 |
| Sản phẩm | Nhập và xem được thời gian giao, ngày giao dự kiến; bảng mới có trong database |
| Tiêu chí nghiệm thu | Migration lên, xuống, lên lại được trên database tạm; dữ liệu cũ không đổi; đơn đặt và hàng hóa cũ vẫn tạo, sửa được khi không nhập trường mới |
| Xung đột có thể có | `StockFlowDbContext.cs` và snapshot migration là file dùng chung cả nhóm; `CreatePurchaseScreen.tsx` vừa có xung đột khi gộp `dev`. Gói này nên do **một người** làm và gộp sớm |

### WP02 — Bộ tính MRP

| Mục | Nội dung |
|---|---|
| Phạm vi | Phép tính thuần: nhu cầu theo ngày, tồn dự phóng, nhu cầu ròng, phân bổ, ngày đặt, gom tháng / tuần |
| File tạo | `Domain/Services/MrpPolicy.cs`; ca kiểm thử trong console harness |
| File sửa | Không |
| Phụ thuộc | Trả lời Q1, Q4, Q5, Q9. **Không phụ thuộc WP01** (đầu vào là danh sách số liệu, không cần database) |
| Sản phẩm | Bộ tính chạy đúng bốn trường hợp ở file 03 mục 6 |
| Tiêu chí nghiệm thu | Mọi ca tầng Unit ở file 08 đạt; không tham chiếu EF, DbContext hay đồng hồ hệ thống |
| Xung đột có thể có | Không, toàn file mới |

### WP03 — API và tích hợp backend

| Mục | Nội dung |
|---|---|
| Phạm vi | Đọc nhu cầu và nguồn từ database; lệnh chạy MRP; các truy vấn xem kết quả |
| File tạo | `Features/Production/Helpers/MrpDemandReader.cs`, `MrpSupplyReader.cs`; `Commands/RunMrpCommand.cs`; `Queries/GetMrp*.cs`; `DTOs/MrpDtos.cs`; `API/Controllers/MrpController.cs`; script kiểm thử API |
| File sửa | Không sửa command sản xuất đang có. Chỉ đọc `ProductionPlanRules`, `ProductionPolicy` |
| Phụ thuộc | WP01 (entity, cột mới), WP02 (bộ tính). Hợp đồng DTO ở file 07 phải chốt trước để WP04 làm song song |
| Sản phẩm | 8 endpoint ở file 07 |
| Tiêu chí nghiệm thu | Ca tầng Tích hợp và API ở file 08 đạt trên database tạm; không có lỗi 500; mọi action có `[RequirePermission]` và kiểm quyền kho |
| Xung đột có thể có | Thấp. Người làm phần Lệnh sản xuất có thể đang sửa `ProductionOrderRules.cs`; WP03 chỉ đọc, không sửa file đó |

### WP04 — Giao diện và báo cáo

| Mục | Nội dung |
|---|---|
| Phạm vi | Màn MRP bảy tab; hộp thoại chạy; xuất Excel; mở đơn đặt điền sẵn |
| File tạo | `app/(dashboard)/production/mrp/page.tsx`; `features/production/screens/MrpScreen.tsx`; `features/production/components/Mrp*.tsx`; `features/production/services/mrpService.ts`; `features/production/types/mrp.ts` |
| File sửa | `lib/navigation/navbar.ts` (một mục), `components/layout/AppLayout.tsx` (một `case`) |
| Phụ thuộc | Hợp đồng DTO ở file 07. Có thể bắt đầu cùng lúc WP03 |
| Sản phẩm | Màn hình chạy với API thật, không dùng dữ liệu giả |
| Tiêu chí nghiệm thu | `tsc` không lỗi; lint không thêm lỗi; `npm run build` đạt, chỉ thêm một route; `check-structure.js --strict` không có vi phạm mới; đã bấm thử trên trình duyệt |
| Xung đột có thể có | `navbar.ts` và `AppLayout.tsx` là file dùng chung; mỗi file chỉ thêm vài dòng nên dễ gộp |

### WP05 — Kiểm thử và xác nhận

| Mục | Nội dung |
|---|---|
| Phạm vi | Chạy toàn bộ file 08; hồi quy sản xuất, mua hàng, chuyển kho; đưa ca kiểm thử vào Report 5 |
| File tạo | Script và kết quả trong `specs/mrp/`; báo cáo kiểm thử |
| File sửa | Không sửa code tính năng; lỗi tìm thấy trả về gói tương ứng |
| Phụ thuộc | WP03, WP04 |
| Sản phẩm | Báo cáo kiểm thử có số ca đạt, không đạt |
| Tiêu chí nghiệm thu | Mọi ca ưu tiên Cao đạt; ca không đạt có ghi nhận và quyết định xử lý |
| Xung đột có thể có | Không |

### WP06 — Tích hợp và nghiệm thu cuối

| Mục | Nội dung |
|---|---|
| Phạm vi | Gộp `dev`; cập nhật Report 3 (UC, BR), Report 4 (sơ đồ), ERD (`database/stockflow.sql`, PlantUML); nhật ký AI; review chéo |
| File sửa | Tài liệu; xử lý xung đột nếu có |
| Phụ thuộc | WP05 |
| Sản phẩm | PR vào `dev` đủ Definition of Done (`.claude/rules/30-definition-of-done.md`) |
| Tiêu chí nghiệm thu | File 10 |
| Xung đột có thể có | Xung đột khi gộp `dev` ở các file dùng chung của WP01 |

## 2. Thứ tự và làm song song

```
WP01 (dữ liệu) ──────────────┐
                             ├──► WP03 (API) ──┐
WP02 (bộ tính) ──────────────┘                 ├──► WP05 ──► WP06
                 WP04 (giao diện) ─────────────┘
                 (bắt đầu khi hợp đồng DTO đã chốt)
```

| Người | Gói | File chạm tới |
|---|---|---|
| A | WP01 | Entity, DbContext, migration, form hàng hóa và đơn đặt |
| B | WP02 rồi WP03 | `MrpPolicy`, reader, command, query, controller (toàn file mới) |
| C | WP04 | Màn hình MRP (toàn file mới) + hai dòng ở `navbar.ts`, `AppLayout.tsx` |
| Cả nhóm | WP05, WP06 | Kiểm thử, tài liệu |

Chỉ WP01 chạm vào file dùng chung nhiều; ba người không sửa cùng một file tính năng.

## 3. Độ phức tạp

| Gói | Mức | Lý do |
|---|---|---|
| WP01 | Thấp – Trung bình | Cột cho phép rỗng; phải sửa hai module của người khác |
| WP02 | Trung bình | Phép tính nhiều nhánh nhưng thuần, kiểm thử dễ |
| WP03 | Trung bình – Cao | Đọc từ 8–10 bảng; rủi ro chính là tính trùng |
| WP04 | Trung bình | Bảy tab, theo mẫu có sẵn |
| WP05 | Trung bình | Nhiều ca cần dựng dữ liệu nhiều bước |
| WP06 | Thấp | Chủ yếu tài liệu |

Không ước lượng theo ngày công vì phạm vi chưa được chốt.

## 4. Phương án rút gọn

Nếu thời gian đồ án không đủ, bỏ lưu lịch sử (không có hai bảng mới, không có tab Lịch sử): `RunMrpCommand` thành một truy vấn tính khi xem. Khi đó thay đổi database chỉ còn hai cột, và WP01 nhỏ đi rõ rệt. Phần mất đi: không xem lại được kết quả cũ và không báo được "lỗi thời".
