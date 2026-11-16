# 07 — Review chức năng Lập kế hoạch sản xuất và kế hoạch sửa

- **Ngày:** 15/11/2026. **Phiên bản review:** nhánh `feature/production-planning`, commit `7c39693` (đã push; cây làm việc không có thay đổi code).
- **Phạm vi:** backend (`ProductionPlansController`, các command / query kế hoạch, `ProductionPlanRules`, `ProductionPlanReader`, phần sửa ở `ProductionOrderRules`, `UpdateProductionOrderCommand`, migration), frontend (`ProductionPlansScreen`, `ProductionPlanDetailPanel`, `ProductionPlanFormModal`, `CreateOrderFromPlanModal`, `productionPlanFormat`), tài liệu và kiểm thử.
- **Cách làm:** đọc lại code, đối chiếu luật đã chốt (BR-PP, Q1–Q12, Q-V1–Q-V8), dò các đường đi dữ liệu khác thường. **Không sửa code.** Các kết luận có số dòng được kiểm trên commit `7c39693`.

## 1. Tóm tắt

| Mức | Số lượng | Ý nghĩa |
|---|---|---|
| Cao | 2 | Chặn merge theo Definition of Done (quy trình, không phải lỗi code) |
| Trung bình | 6 | Lỗi nghiệp vụ / trải nghiệm có thể gặp khi dùng thật |
| Thấp | 9 | Nên sửa, ảnh hưởng nhỏ hoặc hiếm |
| Ngoài phạm vi | 4 | Lỗi ở code có sẵn, ghi nhận, không sửa trong việc này |

**Không tìm thấy lỗi làm sai số liệu tồn kho hay số đã lập lệnh.** Các luật quan trọng nhất (không lập lệnh vượt số còn lại, chống lập trùng khi đồng thời, chỉ lập lệnh từ kế hoạch đã duyệt, phân quyền người lập / người duyệt) đều có ở backend và đã có kiểm thử chạy thật.

### Điểm làm tốt (đã kiểm)

- **Phân quyền nhiều lớp:** `[RequirePermission]` + `[RequireFeature]` ở controller; luật theo trạng thái trong `ProductionPlanPermissions.Check*`. Cùng một hàm vừa chặn ở command vừa sinh `actions` cho frontend, nên frontend không tự quyết định.
- **Đồng thời:** mọi thao tác ghi lên một kế hoạch và việc sửa lệnh thuộc kế hoạch dùng chung khóa `production-plan:{id}`. Đã kiểm 5 request song song, 2 người cùng lập lệnh, 2 người cùng duyệt.
- **Chống trùng và phát hiện sửa đè:** `clientRequestId` có unique index; mã phiên bản `updated_at`.
- **Giao dịch:** lỗi giữa chừng không để lại lệnh hay nhu cầu NVL dở dang (IT-03).
- **Validation khớp hai phía:** `SaveProductionPlanRequestValidator` và `validatePlanForm`; có 82 ca unit và 96 ca API.
- **Không phá chức năng cũ:** lập / sửa lệnh trực tiếp vẫn chạy (PP-53, PP-54); lệnh từ kế hoạch đi tiếp xuất NVL → nhập thành phẩm → hoàn thành (IT-07).

## 2. Các phát hiện

### Mức Cao (quy trình)

| ID | Vấn đề | Vị trí | Ảnh hưởng | Đề xuất |
|---|---|---|---|---|
| R-01 | **Giao diện chưa được bấm thử trên trình duyệt.** Mọi kiểm thử hiện có là unit + gọi API | Toàn bộ `src/features/production/*Plan*` | Lỗi hiển thị / thao tác (bố cục, focus, `onBlur`, thông báo) chưa được phát hiện | Một thành viên chạy kịch bản tay ở mục 5 trước khi tạo PR |
| R-02 | **Definition of Done chưa đủ:** chưa có mã UC / BR chính thức trong Report 3 (đang dùng mã tạm UC-PP / BR-PP); chưa có test case trong Report 5; tài liệu ERD (`database/stockflow.sql`, PlantUML) chưa có 2 bảng kế hoạch, 3 cột mới, 2 sequence; chưa có người khác review | `docs/`, `database/` | Reviewer không duyệt được PR theo `30-definition-of-done.md` | Nhóm cấp mã; chuyển 82 + 96 ca sang Report 5; cập nhật ERD; phân công review |

### Mức Trung bình

| ID | Vấn đề | Vị trí | Kịch bản lỗi | Đề xuất |
|---|---|---|---|---|
| R-03 | **Lịch sử từ chối / hủy sửa được, xóa được.** Lý do được nối vào `notes`; form sửa nạp toàn bộ `notes` vào ô Ghi chú và lưu đè | FE `ProductionPlanFormModal.tsx:76`; BE `UpdateProductionPlanCommand.cs:115` | Kế hoạch bị từ chối → người lập mở Sửa, xóa dòng "[Từ chối … ] lý do" rồi gửi duyệt lại → mất vết lần từ chối trước. Thêm vào đó, khi `notes` đầy 500 ký tự thì phần đầu bị cắt (K7) | (a) Không đổi DB: backend giữ nguyên các dòng có dạng `[Từ chối …]` / `[Hủy …]` đang có, chỉ thay phần ghi chú người dùng; form tách hai phần, phần lịch sử chỉ đọc. (b) Đổi DB: thêm cột hoặc bảng lịch sử duyệt. **Cần quyết định** (Q-R1) |
| R-04 | **Sửa kế hoạch bị chặn vì dữ liệu cũ không liên quan.** Khi sửa, backend kiểm lại thành phẩm và kho nhận của **mọi** dòng, kể cả dòng không đổi | `UpdateProductionPlanCommand.cs:70` → `ProductionPlanRules.ValidateReferencesAsync` | (1) Kế hoạch đã duyệt có thành phẩm đã lập lệnh, sau đó thành phẩm bị ngừng kinh doanh → không xóa được dòng (đã có lệnh) cũng không giữ được (ngừng hoạt động) → **kế hoạch không sửa được nữa**, chỉ còn cách đóng. (2) Dòng có kho nhận do người khác chọn mà người sửa không có quyền kho đó → không lưu được thay đổi nào, kể cả ghi chú | Chỉ kiểm thành phẩm cho dòng **mới thêm**; chỉ kiểm kho cho dòng **đổi** kho nhận. Gửi duyệt vẫn kiểm đủ (V-08) |
| R-05 | ~~**Duyệt không kiểm lại thành phẩm / BOM.**~~ **Đã sửa 15/11/2026** (Q-R2: chặn) | `ApproveProductionPlanCommand.cs`; hàm dùng chung `ProductionPlanRules.ValidateReadyForApprovalAsync` (gửi duyệt cũng dùng) | Trước khi sửa: BOM bị ngừng hoặc thành phẩm bị khóa trong lúc chờ duyệt → vẫn duyệt được, đến lúc lập lệnh mới lỗi | Duyệt nay chặn khi thành phẩm mất BOM đang áp dụng, ngừng hoạt động hoặc không còn là thành phẩm / bán thành phẩm; thông báo "Không duyệt được kế hoạch. …" nêu mã hàng; kế hoạch vẫn Chờ duyệt và vẫn từ chối được. Kiểm thử `api-tests/pptest5.ps1` RT-01..06 đạt; chạy lại 96 ca API cũ đạt |
| R-06 | **Modal lập lệnh chọn sẵn cả dòng chưa có BOM** | `CreateOrderFromPlanModal.tsx:31` | Kế hoạch đã duyệt có 1 dòng mất BOM → modal mặc định chọn hết → bấm Lập lệnh, **cả lệnh** bị từ chối; người dùng phải tự đoán bỏ dòng nào | Không chọn sẵn và khóa ô chọn của dòng chưa có BOM, ghi rõ lý do |
| R-07 | **Gặp xung đột phiên bản thì phải đóng form và nhập lại.** Frontend chỉ hiện thông báo; form vẫn giữ dữ liệu cũ, không có nút tải lại | FE `ProductionPlanFormModal.tsx:211`; BE trả 400 chung | Hai người cùng sửa → người sau thấy "Vui lòng tải lại", nhưng nếu bấm Lưu lại vẫn lỗi; phải đóng, mở lại và nhập lại thay đổi | Backend trả mã lỗi riêng (VD `code: PLAN_VERSION_CONFLICT`); frontend hiện nút "Tải bản mới" và giữ nội dung đang nhập để người dùng đối chiếu |
| R-08 | **Chờ khóa kế hoạch không có giới hạn thời gian** | `StockFlowDbContext.cs:2384` (`pg_advisory_xact_lock`) | Một giao dịch giữ khóa lâu (VD lập lệnh nhiều thành phẩm trên máy chủ chậm) → request khác chờ tới hết thời gian chờ của lệnh SQL (mặc định 30 giây) rồi **lỗi 500** | `SET LOCAL lock_timeout` (VD 5 giây) trước khi lấy khóa; hết thời gian thì trả "Kế hoạch đang được người khác cập nhật, vui lòng thử lại" |

### Mức Thấp

| ID | Vấn đề | Vị trí | Đề xuất |
|---|---|---|---|
| R-09 | Kiểm mã phiên bản **trước** kiểm quyền → người không có quyền sửa vẫn biết ai sửa gần nhất, lúc nào | `UpdateProductionPlanCommand.cs:62–68` | Đổi thứ tự: kiểm quyền trước |
| R-10 | `ExpectedUpdatedAt` là tùy chọn → client không gửi thì bỏ qua phát hiện sửa đè | `ProductionPlanDtos.cs` (`SaveProductionPlanRequest`) | Bắt buộc khi sửa (frontend đã luôn gửi); cập nhật script kiểm thử |
| R-11 | "Hôm nay" ở frontend lấy theo giờ máy người dùng, backend theo giờ Việt Nam → máy đặt múi giờ khác có thể lệch 1 ngày ở luật kỳ quá khứ (Q-V1) và hạn hoàn thành | `ProductionPlanFormModal.tsx:103`, `CreateOrderFromPlanModal.tsx:41` (`todayIso`) | Tính hôm nay theo UTC+7 ở frontend (đặt trong `lib/utils/date.ts`) |
| R-12 | Danh sách kế hoạch tải toàn bộ, không phân trang | `ProductionPlansScreen.tsx:77`, `GetProductionPlansQuery` | Giữ như các danh sách sản xuất khác; thêm phân trang phía server khi dữ liệu lớn |
| R-13 | Controller lặp chuỗi mã chức năng thay vì dùng hằng `FeatureConstants.ProductionPlans` / `ProductionPlanApproval` | `ProductionPlansController.cs:25–27` | Dùng hằng có sẵn để đổi tên một chỗ |
| R-14 | Tên index `IX_trx_production_plans_updated_by` (EF tự đặt) không theo quy ước tên của dự án | Migration `20261115032001…:37` | Đặt tên tường minh (`ix_trx_production_plans_updated_by`) ở lần đổi schema sau; không cần migration riêng |
| R-15 | Nhu cầu NVL gom theo (NVL, đơn vị) nhưng tồn lấy theo NVL → nếu cùng NVL có 2 đơn vị thì tồn bị so hai lần. Hiện BOM luôn dùng đơn vị cơ sở (`BomRules.cs:79`) nên gần như không xảy ra | `ProductionPlanReader.cs:220` | Gom theo NVL hoặc ghi chú giả định |
| R-16 | Không có unique (kế hoạch, thành phẩm) ở DB; chỉ dựa validator + khóa | `dtl_production_plan_items` | Thêm unique index ở lần đổi schema sau (cần duyệt ERD) |
| R-17 | Script kiểm thử: `pptest.ps1`, `pptest3.ps1` dùng ngày cố định 15/11 – 31/12/2026 (sau 31/12/2026 sẽ vướng luật kỳ quá khứ); unit test chạy bằng console ngoài CI | `specs/production-planning-implementation/api-tests`, `unit-tests` | Đổi sang ngày tương đối; khi nhóm duyệt xUnit thì chuyển sang project test |

### Ngoài phạm vi (code có sẵn, không sửa trong việc này)

| ID | Vấn đề | Vị trí |
|---|---|---|
| X-1 | Điều chỉnh định mức (UC-59 / BR-51) chưa chặn tràn `numeric(18,2)` → định mức lớn trên lệnh lập từ kế hoạch vẫn có thể gây **lỗi 500** (V-04 mới sửa lập / sửa lệnh) | `AdjustMaterialNormCommand.cs:104`, `:135` |
| X-2 | Sửa lệnh: đọc lệnh và kiểm `CanUpdate()` **trước** khi mở transaction → có thể lọt khi đồng thời xuất NVL | `UpdateProductionOrderCommand.cs:54–59` |
| X-3 | Sinh mã kiểu DATETIME dùng `DateTime.UtcNow` thay vì giờ Việt Nam; kiểu RANDOM kiểm trùng trên bảng hóa đơn cho mọi loại chứng từ | `TransactionCodeGenerator.cs` |
| X-4 | Xem trước nhu cầu NVL của lệnh (UC-59) im lặng bỏ tồn khi kho không có quyền, còn API kế hoạch báo lỗi — hai cách khác nhau | `GetRequirementPreviewQuery.cs` |

## 3. Kế hoạch sửa (chờ cho phép)

### Đợt 1 — không cần quyết định, không đổi DB

| Thứ tự | Việc | File dự kiến | Kiểm thử thêm |
|---|---|---|---|
| 1 | R-04 chỉ kiểm dòng mới / dòng đổi | `UpdateProductionPlanCommand.cs`, `ProductionPlanRules.cs` | API: ngừng hàng sau khi duyệt → vẫn sửa được ghi chú / số lượng dòng khác; kho không có quyền ở dòng không đổi → vẫn lưu được |
| 2 | R-06 khóa dòng thiếu BOM trong modal | `CreateOrderFromPlanModal.tsx` | Thử tay |
| 3 | R-07 mã lỗi xung đột + nút tải lại | `ProductionPlanRules.cs` (mã lỗi), controller trả thêm `code`, `ProductionPlanFormModal.tsx` | API VT-16 kiểm `code`; thử tay |
| 4 | R-08 `lock_timeout` + thông báo thử lại | `StockFlowDbContext.cs` (`AcquireTransactionLockAsync`), các command bắt lỗi | API: giữ khóa bằng psql, gọi sửa → nhận thông báo, không 500 |
| 5 | R-09, R-10, R-13 | `UpdateProductionPlanCommand.cs`, DTO, controller, script kiểm thử | Unit + API chạy lại |
| 6 | R-11 hôm nay theo giờ VN | `lib/utils/date.ts`, 2 modal | Unit nhỏ cho hàm ngày |
| 7 | R-17 ngày tương đối trong script | `pptest.ps1`, `pptest3.ps1` | Chạy lại toàn bộ |

Ước lượng: khoảng 10 file, không migration.

### Đợt 2 — cần quyết định trước

| Việc | Phụ thuộc | Đổi DB? |
|---|---|---|
| R-03 bảo vệ lịch sử từ chối / hủy | Q-R1 | (a) Không; (b) Có |
| ~~R-05 kiểm lại khi duyệt~~ — **đã làm** (Q-R2: chặn) | — | Không |
| R-14, R-16 tên index, unique (kế hoạch, thành phẩm) | Gộp vào lần đổi schema sau | Có |
| X-1 chặn tràn khi điều chỉnh định mức | Q-R3 (sửa code UC-59 của người khác) | Không |

### Đợt 3 — quy trình trước khi PR (R-01, R-02)

1. Chạy tay trên trình duyệt (mục 5).
2. Nhóm cấp mã UC / BR trong Report 3; đưa ca kiểm thử vào Report 5.
3. Cập nhật `database/stockflow.sql` và PlantUML.
4. Người khác review PR.

## 4. Câu hỏi cần xác nhận

| # | Câu hỏi | Đề xuất mặc định |
|---|---|---|
| Q-R1 | Bảo vệ lịch sử từ chối / hủy bằng cách nào? (a) giữ trong `notes` nhưng khóa phần lịch sử; (b) thêm cột / bảng lịch sử (đổi ERD) | (a) — không đổi DB, làm được ngay |
| Q-R2 | Khi duyệt mà có thành phẩm mất BOM / ngừng hoạt động: chặn hay chỉ cảnh báo? | **Đã chốt 15/11/2026: chặn** (Ninh) |
| Q-R3 | Có sửa X-1 (điều chỉnh định mức, code UC-59) trong nhánh này không? | Có, vì lệnh lập từ kế hoạch đi qua đường này; ghi rõ trong PR |

## 5. Kịch bản thử tay đề xuất (R-01)

1. Đăng nhập `prodstaff01`: lập kế hoạch 2 thành phẩm; gõ tay ngày kết thúc trước ngày bắt đầu (kỳ và dòng) → rời ô thì ngày được sửa và có cảnh báo; gõ năm ở ô "Đến ngày" → ngày các dòng không bị kéo về năm lạ.
2. Nhập số lượng `1.000` → hiện "Hiểu là: 1000"; `10,123` → báo lỗi 2 chữ số thập phân.
3. Lưu → gửi duyệt; thử sửa kế hoạch của người khác (không được).
4. Đăng nhập `manager01`: mục "Duyệt kế hoạch sản xuất" thấy kế hoạch chờ duyệt; xem tab Nhu cầu NVL; từ chối có lý do → `prodstaff01` sửa, gửi lại → manager duyệt.
5. Lập lệnh một phần, bấm nút nhanh 2 lần → chỉ 1 lệnh; xem lệnh ở màn Lệnh sản xuất có mã kế hoạch.
6. Mở form sửa ở 2 tab, lưu tab 1 rồi tab 2 → tab 2 bị từ chối.
7. Đóng kế hoạch; hủy kế hoạch khác chưa có lệnh.

## 6. Tự kiểm

- **(a) Giả định:** review trên commit `7c39693`; mức độ đánh giá theo ảnh hưởng tới người dùng và số liệu.
- **(b) Cần hỏi:** Q-R1, Q-R2, Q-R3.
- **(c) Chỗ không chắc:** R-08 chưa tái hiện được bằng kiểm thử (cần giữ khóa bằng tay); R-11 chỉ xảy ra khi máy người dùng đặt múi giờ khác UTC+7.
- **(d) UC/BR:** UC-PP-01..06; BR-PP-09, BR-PP-13, BR-PP-17, BR-PP-20; UC-59, BR-51 (X-1).
