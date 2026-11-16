# 08 — Review đối chiếu spec và code: Lập kế hoạch sản xuất

- **Ngày:** 15/11/2026. **Phiên bản code:** nhánh `feature/production-planning`, commit `7c39693` cộng phần R-05 chưa commit (`ApproveProductionPlanCommand`, `SubmitProductionPlanCommand`, `ProductionPlanRules.ValidateReadyForApprovalAsync`).
- **Spec dùng để đối chiếu:**
  - `specs/production-planning-analysis/03..07`: quy trình, UC-PP-01..06, BR-PP-01..24, trạng thái, Q1–Q12, ERD G2..G10.
  - `specs/production-planning-implementation/00..07`: quyết định K1–K10, Q-V1..Q-V8 (file 06), Q-R2 (file 07).
- **Cách làm:** đi từng bước của Use Case, từng BR, từng quyết định; tìm chỗ code tương ứng; ghi kết luận. **Không sửa code.**
- **Ký hiệu:**
  - **Khớp:** code làm đúng spec.
  - **Lệch:** code làm khác spec.
  - **Thiếu:** spec có, code chưa làm.
  - **Spec cũ:** tài liệu chưa cập nhật theo quyết định hoặc code đã đổi sau đó.
  - **Spec mâu thuẫn:** hai chỗ trong spec nói khác nhau.

## 1. Tóm tắt

| Nhóm | Số mục |
|---|---|
| Khớp (mục 4) | 6 UC, 24 BR, Q1–Q12 trừ Q12, Q-V1..Q-V8, K1–K9 |
| Code lệch / thiếu so với spec (mục 2) | 10 (Trung bình 3, Thấp 7) |
| Spec cũ / mâu thuẫn (mục 3) | 11 |

**Kết luận chung:**
- Các luật lõi khớp spec: vòng đời trạng thái, ai được làm gì, số đã lập / còn lại, chặn lập vượt, khóa đồng thời, kiểm BOM khi gửi duyệt và khi duyệt.
- Lệch đáng chú ý nhất là **S-01**: sửa lệnh thuộc kế hoạch đã Đóng vẫn tăng được số lượng, trái UC-PP-06 ("phần chưa lập lệnh bị bỏ, không lập thêm lệnh").
- Phần lớn mục còn lại là spec phân tích chưa được cập nhật sau các quyết định Q-V và R-05. Cần cập nhật trước khi đưa vào Report 3.

## 2. Code lệch hoặc thiếu so với spec

### Mức Trung bình

| ID | Spec | Code hiện tại | Kịch bản | Đề xuất |
|---|---|---|---|---|
| S-01 | UC-PP-06 luồng 1b–1c: đóng kế hoạch thì "số còn lại chưa lập lệnh sẽ bị bỏ", "không lập thêm lệnh từ kế hoạch này được nữa". BR-PP-20: không vượt số còn lại | `UpdateProductionOrderCommand.cs:95–100` chỉ gọi `ValidateOrderQuantitiesAsync` (so với số còn lại), **không kiểm trạng thái kế hoạch** | Kế hoạch 100 cái, lập lệnh A 60 (Chưa bắt đầu), Manager đóng kế hoạch (bỏ 40). Sau đó sửa lệnh A lên 100, hoặc thêm thành phẩm khác của kế hoạch vào lệnh A → **được lưu**. Phần "đã bỏ" bị lập lệnh lại | Khi kế hoạch của lệnh không còn Đã duyệt: lệnh chỉ được giữ hoặc giảm số lượng từng thành phẩm, không thêm thành phẩm. Cần xác nhận (Q-S1) |
| S-02 | Q12 (đã chốt): kho nhận ở dòng kế hoạch là **gợi ý cho phiếu nhập thành phẩm** khi lập lệnh từ kế hoạch. ERD G10: "dùng làm gợi ý trên màn nhập thành phẩm, tra ngược qua `production_plan_id` và sản phẩm" | Kho nhận chỉ được lưu và hiện ở chi tiết kế hoạch (`ProductionPlanReader.DetailAsync`). DTO lệnh không mang kho này; màn nhập thành phẩm không tra kế hoạch (grep `ProductionPlan` trong phần nhập thành phẩm: 0 kết quả). Báo cáo 03, 05 **không ghi** đây là hạn chế | Người lập chọn kho nhận K002 cho dòng FG1. Lệnh lập từ kế hoạch đi tới bước nhập thành phẩm thì kho vẫn là kho mặc định, không gợi ý K002 | Hoặc làm gợi ý (cần sửa màn / API nhập thành phẩm UC-49 của module khác), hoặc ghi rõ là hạn chế và sửa Q12. Cần xác nhận (Q-S2) |
| S-03 | UC-PP-05 bước 3–4: mở **form lập lệnh đang có (UC-59)** điền sẵn; Manager "**xem nhu cầu vật tư của lệnh**" rồi lưu | `CreateOrderFromPlanModal.tsx` là modal riêng: chọn dòng, số lượng, hạn, xưởng, ghi chú. **Không có bảng nhu cầu NVL**, không điều chỉnh định mức. Báo cáo 03 (F2) chỉ ghi thiếu phần điều chỉnh định mức, không ghi thiếu phần xem nhu cầu | Manager lập lệnh 60 cái mà không thấy lệnh cần bao nhiêu NVL, thiếu gì; phải lưu xong rồi mở lệnh mới biết | Thêm bảng nhu cầu NVL vào modal, dùng lại API xem trước của kế hoạch. Nếu làm vậy thì `POST /plans/material-requirements/preview` cần nhận thêm `feat-prod-plan`. Hoặc sửa UC-PP-05 cho đúng cách đã làm. Cần xác nhận (Q-S3) |

### Mức Thấp

| ID | Spec | Code hiện tại | Đề xuất |
|---|---|---|---|
| S-04 | UC-PP-01 bước 5: bấm mã lệnh để mở chi tiết lệnh | Mã lệnh ở tab Lệnh sản xuất là chữ thường (`ProductionPlanDetailPanel.tsx:237`). Đã ghi ở báo cáo 03 (F3) | Giữ là hạn chế đã biết, hoặc làm khi màn Lệnh sản xuất nhận tham số mở theo mã |
| S-05 | UC-PP-04 ngoại lệ: kế hoạch không ở đúng trạng thái (VD người khác vừa duyệt) thì "báo lỗi, **tải lại**" | `ProductionPlansScreen.tsx:136–151` (`run`): lỗi chỉ hiện thông báo, hộp thoại vẫn mở, chi tiết không tải lại → các nút thao tác vẫn theo dữ liệu cũ | Trong `catch`: đóng hộp thoại và gọi `reload()` |
| S-06 | UC-PP-04 luồng 3a: kế hoạch có vật tư thiếu thì "hệ thống **hiện cảnh báo**, Manager vẫn duyệt được" | Hộp xác nhận Duyệt (`ProductionPlansScreen.tsx:360–380`) chỉ có câu chung "nên xem tab Nhu cầu NVL". Cảnh báo thiếu chỉ hiện khi Manager tự mở tab đó và chọn kho | Hộp xác nhận tải nhu cầu theo kho đang chọn và nêu số NVL thiếu; hoặc sửa spec thành "cảnh báo ở tab Nhu cầu NVL" |
| S-07 | Q8 (đã chốt): "hiển thị tồn thực tế **kèm ghi chú**" (chưa trừ NVL các lệnh đang mở) | `PlanMaterialRequirementsPanel.tsx` không có dòng ghi chú này trên giao diện; chỉ có trong chú thích code | Thêm một dòng ghi chú dưới tiêu đề bảng |
| S-08 | Q-V1: kỳ đã qua thì bắt buộc **ghi lý do** vào ghi chú | `RequiresPastPeriodNote` (`ProductionPlanRules.cs:196`, dùng ở validator dòng 59 và `SubmitProductionPlanCommand.cs:55`) chỉ kiểm ghi chú không rỗng. Kế hoạch bị từ chối đã có dòng "[Từ chối …]" trong ghi chú nên qua được luật mà không có lý do thật | Làm cùng R-03 (tách ghi chú người dùng và lịch sử): chỉ kiểm phần ghi chú người dùng |
| S-09 | UC-PP-04 bước 2 / ngoại lệ: không cho gửi duyệt, "**nêu tên** thành phẩm" | Thông báo nêu **mã** hàng (`ProductionPlanRules.cs:292`, `ValidatePlanProductsAsync`) | Sửa spec thành "nêu mã thành phẩm" (mã ngắn, không trùng), hoặc ghi "mã – tên" |
| S-10 | Q-V7: số lượng mỗi dòng tối đa 999.999.999,99 | Validator của xem trước nhu cầu (`PreviewPlanMaterialRequirementsQuery.cs:24–30`) không có giới hạn này. `ProductionPlanReader` dùng `CalculateRequirement`, không dùng `TryCalculateRequirement` → gọi thẳng API với số rất lớn có thể làm tràn `decimal`, trả **lỗi 500** (frontend đã chặn nên người dùng không gặp) | Thêm `LessThanOrEqualTo(MaxPlannedQuantity)` vào validator xem trước |
| S-11 | R-05 / BR-PP-09 (sau khi sửa): kế hoạch thiếu BOM không được gửi duyệt **và không được duyệt** | Nút Gửi duyệt / Duyệt vẫn hiện khi có dòng thiếu BOM (`actions` chỉ theo trạng thái và chức năng, đúng K8); thẻ cảnh báo ghi "Cần thiết lập BOM trước khi gửi duyệt" (`ProductionPlanDetailPanel.tsx:88`) | Đổi chữ thẻ thành "trước khi gửi duyệt / duyệt". Giữ nút (backend báo lỗi rõ, nêu mã) |

S-11 chỉ là chữ hiển thị nên không tính vào bảng tóm tắt.

## 3. Spec cũ hoặc mâu thuẫn (code đúng, tài liệu cần sửa)

| ID | Tài liệu | Nội dung đang ghi | Thực tế / quyết định sau đó | Sửa thành |
|---|---|---|---|---|
| D-01 | analysis `06` mục 1, bảng chuyển trạng thái | PENDING_APPROVAL → Duyệt: điều kiện "—" | R-05 (Q-R2, 15/11): duyệt kiểm lại thành phẩm còn hoạt động, đúng loại, có BOM đang áp dụng | Ghi điều kiện mới; thêm ngoại lệ tương ứng vào UC-PP-04 (file 05) |
| D-02 | analysis `06` mục 1 | Gửi duyệt: "Người lập" | Q-V4: người lập **hoặc** người có quyền duyệt; sửa toàn bộ cũng vậy | Cập nhật cột "Ai" |
| D-03 | analysis `06` mục 2 | BR-PP-05 "thành phẩm đang hoạt động"; BR-PP-09 "không được gửi duyệt" | Q-V2: thành phẩm **hoặc bán thành phẩm**, hàng chưa có loại coi là thành phẩm. R-05: cũng không được duyệt | Sửa BR-PP-05, BR-PP-09 |
| D-04 | analysis `05`, `06` | Chưa có luật nào từ Q-V1, Q-V4, Q-V5, Q-V6, Q-V7, Q-V8 | Đã code: kỳ đã qua phải ghi lý do; chỉ người lập / người duyệt sửa, gửi duyệt, hủy; phát hiện sửa đè (`updated_at`); chống lập lệnh trùng (`client_request_id`); số lượng tối đa; năm 2000–2100 | Thêm BR-PP-25 trở đi và các ngoại lệ vào UC-PP-02 / UC-PP-05 trước khi đưa vào Report 3 |
| D-05 | analysis `03` mục 2, câu 8 **mâu thuẫn** với BR-PP-22 và UC-PP-06 | Câu 8: hủy kế hoạch đã duyệt "chỉ khi không còn lệnh **đang mở**; lệnh đã hoàn thành vẫn giữ liên kết" | BR-PP-22, UC-PP-06 và code (`CancelProductionPlanCommand`): không hủy khi còn lệnh nào **khác Đã hủy**, kể cả lệnh Hoàn thành; khi đó dùng Đóng | Sửa câu 8 theo BR-PP-22 |
| D-06 | analysis `05` UC-PP-06 **mâu thuẫn** với bảng chuyển trạng thái file 06 | Actor: "người lập được hủy kế hoạch **DRAFT** của mình" | Bảng trạng thái và code: người lập hủy được kế hoạch Nháp, Bị từ chối, Chờ duyệt của mình | Sửa dòng Actor |
| D-07 | analysis `07` dòng cập nhật đầu file; implementation `01` mục 2 | "Thay đổi database duy nhất là sequence"; "Không thêm bảng, cột, index" | Migration `20261115032001_AddPlanAuditAndOrderClientRequestId` thêm `updated_at`, `updated_by`, `client_request_id` + FK + 2 index (Q-V5, Q-V6) | Thêm dòng "Cập nhật 15/11" trỏ tới file 06 mục 8 |
| D-08 | implementation `00` K10; `02` mục 7 | "Không lọc sản phẩm theo loại"; ghi là phát hiện ngoài phạm vi | Q-V2 đã chốt và đã code | Đánh dấu "đã thay bằng Q-V2" |
| D-09 | implementation `02` mục 1 (bảng API) | Duyệt: "Chỉ PENDING_APPROVAL"; gửi duyệt: "mọi thành phẩm có BOM"; "57/57" | Duyệt và gửi duyệt dùng `ValidateReadyForApprovalAsync`; PUT kiểm phiên bản và người lập; lập lệnh có `clientRequestId` | Cập nhật bảng hoặc ghi chú trỏ sang 06, 07 |
| D-10 | implementation `05` (nghiệm thu) | "chưa commit, chưa push"; "1 migration chỉ tạo sequence; không thêm bảng, cột"; "131/131 (57 unit, 74 API)"; R-07 file `features/roles` làm hỏng build | 3 commit đã push (`7c39693`); 2 migration; unit 82, API 102 (56 + 1 + 17 + 22 + 6); file `features/roles` đã xóa 15/11 | Viết lại mục 1, 3, 5, 6 theo số mới |
| D-11 | implementation `03` F5, mục 4; `06` mục 8.3; `07` mục 1 | Build phải tạm dời `features/roles` và `.next/dev`; "unit 79/79"; "82 unit + 96 API" | Đã xóa, build chạy thẳng; unit 82 (thêm UT-39..41); API 102 sau R-05 | Sửa số |

Ngoài ra vẫn còn hai khoảng trống tài liệu đã nêu ở 07 (R-02):
- `database/stockflow.sql` và PlantUML chưa có bảng kế hoạch, 3 cột mới, 2 sequence (grep `production_plan`: 0 kết quả).
- Report 3 chưa có UC-PP / BR-PP.

## 4. Phần khớp (đã kiểm)

| Spec | Code | Kết luận |
|---|---|---|
| UC-PP-01: danh sách (mã, tên, kỳ, trạng thái, người lập, số dòng, % đã lập lệnh), lọc trạng thái / kỳ / từ khóa; chi tiết có người duyệt, thời điểm duyệt, đã lập, còn lại, đã nhập kho, danh sách lệnh; "Không tìm thấy kế hoạch sản xuất" | `GetProductionPlansQuery`, `ProductionPlanReader`, `ProductionPlansScreen`, `ProductionPlanDetailPanel` | Khớp (trừ S-04) |
| UC-PP-02: lưu Nháp, sinh mã KHSX, ghi người lập / ngày lập; cờ BOM từng dòng; Bị từ chối sửa xong vẫn Bị từ chối; sửa hạn chế khi Đã duyệt (không đổi tên, kỳ; số ≥ đã lập; không xóa dòng có lệnh; dòng mới phải có BOM); các ngoại lệ dữ liệu | `CreateProductionPlanCommand`, `UpdateProductionPlanCommand`, `SaveProductionPlanRequestValidator`, `validatePlanForm` | Khớp |
| UC-PP-03: chọn kho được phân quyền; cộng dồn theo BR-31; tô NVL thiếu, đếm số thiếu; mặc định theo số còn lại khi đã có lệnh; liệt kê riêng thành phẩm chưa có BOM; kho không có quyền báo lỗi | `GetPlanMaterialRequirementsQuery`, `PreviewPlanMaterialRequirementsQuery`, `MaterialRequirementsAsync`, `PlanMaterialRequirementsPanel` | Khớp (trừ S-07) |
| UC-PP-04: gửi duyệt kiểm BOM; duyệt ghi người và thời điểm; từ chối bắt buộc lý do, ghi vào ghi chú; không có rút lại (Q6); thiếu NVL không chặn (BR-PP-15); tự duyệt được (Q2) | `Submit/Approve/RejectProductionPlanCommand`, `ProductionPlanPermissions` | Khớp (trừ S-05, S-06) |
| UC-PP-05: chỉ từ kế hoạch Đã duyệt; một phần / toàn bộ, nhiều lần; mặc định = số còn lại; chặn vượt (Q7); hạn mặc định = ngày kết thúc muộn nhất; lệnh hủy trả số về kế hoạch (BR-PP-21); lệnh trực tiếp vẫn lập được (Q4) | `CreateProductionOrderFromPlanCommand`, `ValidateOrderQuantitiesAsync`, `OrderedQuantitiesAsync`, `CreateOrderFromPlanModal` | Khớp (trừ S-03) |
| UC-PP-06: hủy cần lý do; kế hoạch Đã duyệt chỉ hủy khi mọi lệnh đã hủy (BR-PP-22); đóng bằng tay (Q9), báo số còn lại bị bỏ; không đổi lệnh đã lập (BR-PP-23); không xóa kế hoạch (BR-PP-24) | `Cancel/CloseProductionPlanCommand`, hộp xác nhận Đóng | Khớp (trừ S-01 ở phía sửa lệnh) |
| K1–K3 phân quyền: 2 chức năng mới, mã quyền theo bảng; Manager có cả hai, Kế toán SX chỉ lập; lập lệnh cần `feat-prod-plan` + `PROD_CREATE` | `FeatureConstants`, `ProductionPlansController`, `permissionService.ts` | Khớp |
| K5 khóa theo kế hoạch; K6 lệnh đóng sớm vẫn tính đủ; K7 định dạng lý do, giữ 500 ký tự cuối; K8 `actions` do backend tính; K9 không phân trang | `AcquireTransactionLockAsync`, `AppendNote`, `DetailAsync` | Khớp |
| Q10 không giới hạn xem theo kho; Q11 không liên kết đơn khách | Danh sách không lọc kho; không có bảng liên kết | Khớp |
| Q-V1..Q-V8 (file 06 mục 8.1) | Validator, permissions, migration, `parsePlanQty`, `CreateOrderFromPlanModal` | Khớp (trừ S-08, S-10) |

## 5. Câu hỏi cần xác nhận

| # | Câu hỏi | Đề xuất mặc định |
|---|---|---|
| Q-S1 | Kế hoạch đã Đóng: lệnh Chưa bắt đầu thuộc kế hoạch có được **tăng** số lượng hoặc thêm thành phẩm không? (S-01) | Không. Chỉ giữ hoặc giảm; thêm kiểm tra trong `UpdateProductionOrderCommand` (ảnh hưởng UC-59, ghi rõ trong PR) |
| Q-S2 | Kho nhận ở dòng kế hoạch: làm gợi ý ở màn nhập thành phẩm ngay, hay ghi là hạn chế? (S-02) | Ghi là hạn chế, sửa Q12 và báo cáo 03 / 05; làm sau cùng người phụ trách UC-49 vì phải sửa module của người khác |
| Q-S3 | Modal lập lệnh từ kế hoạch có cần bảng nhu cầu NVL không? (S-03) | Có. Dùng lại API xem trước của kế hoạch, cho thêm `feat-prod-plan`; không đổi DB |

## 6. Kế hoạch sửa (chờ cho phép)

1. **Tài liệu (D-01..D-11):** sửa file analysis 03, 05, 06, 07 và implementation 00..07 như mục 3. Không đụng code.
2. **Không cần quyết định:**
   - S-05: tải lại khi lỗi.
   - S-07: dòng ghi chú về tồn.
   - S-09: sửa spec.
   - S-10: giới hạn số lượng ở xem trước.
   - S-11: chữ trên thẻ cảnh báo.
   - Kiểm thử thêm: 1 ca API cho S-10; thử tay S-05.
3. **Sau khi có trả lời Q-S1..Q-S3:**
   - S-01: thêm ca API "đóng kế hoạch rồi sửa tăng lệnh → bị chặn".
   - S-02 và S-03.
4. **S-06, S-08:** gộp vào R-03 / R-07 ở file 07.

## 7. Tự kiểm

- **(a) Giả định:** spec chuẩn là các file trong `specs/` (Report 3 chưa có UC-PP). Khi hai file nói khác nhau, quyết định có ngày muộn hơn (Q-V, Q-R) được coi là đúng.
- **(b) Cần hỏi:** Q-S1, Q-S2, Q-S3.
- **(c) Chỗ không chắc:**
  - S-10 chưa chạy thử. Kết luận lỗi 500 suy ra từ việc `CalculateRequirement` không bắt tràn số.
  - S-02 kết luận từ grep: không có code nhập thành phẩm nào đọc kế hoạch.
- **(d) UC/BR:**
  - UC-PP-01..06.
  - BR-PP-05, 09, 13, 20, 22.
  - Q8, Q12, Q-V1, Q-V7, Q-R2.
  - Ảnh hưởng UC-59 (S-01) và UC-49 (S-02).
