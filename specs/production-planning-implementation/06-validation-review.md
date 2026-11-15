# 06 — Rà soát bộ Validation kế hoạch sản xuất và kế hoạch bổ sung

- **Ngày:** 15/11/2026. **Phạm vi:** đối chiếu danh sách ca kiểm thử validation do Ninh đưa ra (mục 1–4 và 6) với code hiện tại trên nhánh `feature/production-planning`.
- **Chỉ phân tích, chưa sửa source code.** Mọi thay đổi ở mục 5 chờ được cho phép.
- **Bằng chứng:** đọc code, và chạy thử 9 ca thăm dò (P1–P9) gọi API thật trên DB tạm `stockflow_verify_pp` (đã xóa sau khi chạy).

Ký hiệu cột Hiện trạng: **Đạt** = đúng kỳ vọng; **Thiếu** = chưa chặn / chưa làm; **Sai** = có làm nhưng kết quả sai; **Cần quyết định** = kỳ vọng mâu thuẫn với nghiệp vụ đã chốt hoặc chưa có quy tắc.

## 1. Tóm tắt

| Nhóm | Số ca | Đạt | Thiếu / Sai | Cần quyết định |
|---|---|---|---|---|
| 1. Thông tin chung | 7 | 6 | 1 (nhỏ, #4) | 0 |
| 2. Ngày tháng | 14 | 10 | 3 (#1, #2, #14) | 1 (#9) |
| 3. Thành phẩm | 11 | 10 | 1 (#9, cách sửa phụ thuộc Q-V2) | 0 |
| 4. Số lượng | 10 | 8 | 1 (#7) | 1 (#1) |
| 6. Nghiệp vụ lưu / gửi duyệt | 14 | 10 | 2 (#13, #14) | 2 (#3, #9) |
| **Tổng** | **56** | **44** | **8** | **4** |

Mỗi ca chỉ tính vào một cột. Ca "Đạt" vẫn có thể có điểm cần bổ sung nhỏ (ghi ở cột Ghi chú). Ngoài 56 ca còn 3 lỗi phát hiện thêm không có trong danh sách: số `1.000`, năm 0001 / 9999, hạn hoàn thành mặc định trong quá khứ khi lập lệnh.

**Lỗi thật đã chạy ra được (không phụ thuộc quyết định nghiệp vụ):**

| Mã | Lỗi | Bằng chứng | Mức |
|---|---|---|---|
| E1 | Gửi JSON thiếu ngày kỳ / ngày dòng → backend **vẫn lưu** với ngày `0001-01-01` (PostgreSQL lưu thành `-infinity`) | P1: 200, `period_start = -infinity` | Cao |
| E2 | Số lượng vượt `numeric(18,2)` → **lỗi 500** thay vì báo lỗi | P3: 500 khi lưu kế hoạch 1e17 | Cao |
| E3 | Số lượng hợp lệ khi lưu (1e15) nhưng nhu cầu NVL tràn `required_qty numeric(18,2)` → **lỗi 500 khi lập lệnh** | P4: 500 ở `/plans/{id}/orders`. Cùng lỗi có ở lập lệnh trực tiếp UC-59 (dùng chung `PopulateItemsAndRequirementsAsync`) | Cao |
| E4 | Hai người sửa cùng kế hoạch: người lưu sau **ghi đè im lặng** thay đổi của người trước | P6: A đổi SL 5→10, B lưu bản cũ → DB còn SL 5, mất thay đổi của A | Trung bình – Cao |
| E5 | Gửi 2 request lập kế hoạch cùng lúc → **tạo 2 kế hoạch** | P5: 200, 200, 2 bản ghi | Trung bình |
| E6 | Frontend đọc `1.000` thành **1** (dấu chấm là phần thập phân), người dùng VN hay gõ dấu chấm phân cách hàng nghìn | Đọc `parseQty` (`productionFormat.ts`) | Trung bình |

## 2. Đối chiếu từng ca

### 2.1 Thông tin chung

| # | Ca | Frontend | Backend | Hiện trạng | Ghi chú |
|---|---|---|---|---|---|
| 1 | Tên trống | Báo "Vui lòng nhập tên kế hoạch." | Validator chặn | Đạt | |
| 2 | Tên chỉ có dấu cách | Báo lỗi (kiểm sau `trim`) | `IsNullOrWhiteSpace` chặn | Đạt | |
| 3 | Khoảng trắng đầu / cuối | Gửi bản đã `trim` | Handler `Trim()` trước khi lưu | Đạt | |
| 4 | Tên > 150 | Ô nhập giới hạn 150 + báo lỗi | Chặn | Đạt, **có lỗi nhỏ** | Backend đếm độ dài **trước** khi trim: 150 ký tự + 2 dấu cách bị từ chối dù sau trim hợp lệ (P9). Frontend luôn trim nên người dùng không gặp; chỉ lệch khi gọi API trực tiếp |
| 5 | Tiếng Việt, số, ký tự đặc biệt | Cho phép | Cho phép | Đạt | React tự escape khi hiển thị nên không có rủi ro XSS |
| 6 | Ghi chú trống | Cho phép | Lưu `null` | Đạt | |
| 7 | Ghi chú > 500 | Ô nhập giới hạn 500 | Chặn | Đạt | |

### 2.2 Ngày tháng

| # | Ca | Frontend | Backend | Hiện trạng | Ghi chú |
|---|---|---|---|---|---|
| 1 | Thiếu ngày bắt đầu | Báo "Vui lòng chọn kỳ kế hoạch." | **Không chặn** — lưu `0001-01-01` | **Sai (E1)** | Frontend chặn được; gọi API trực tiếp thì lọt |
| 2 | Thiếu ngày kết thúc | Như trên | Như trên | **Sai (E1)** | |
| 3 | Bắt đầu = kết thúc | Cho phép | Cho phép | Đạt | UT-27 |
| 4 | Bắt đầu < kết thúc | Cho phép | Cho phép | Đạt | |
| 5 | Bắt đầu > kết thúc | Báo lỗi | Chặn | Đạt | UT-14, PP-08 |
| 6–8 | Bắt đầu hôm qua / hôm nay / tương lai | Cho phép | Cho phép | Đạt | Không có quy tắc chặn ngày quá khứ |
| 9 | Cả kỳ nằm trong quá khứ | Không cảnh báo | Không kiểm | **Cần quyết định** | Quy tắc **mới**, chưa có trong BR-PP đã chốt. Xem Q-V1 |
| 10 | Ngày bắt đầu dòng < ngày bắt đầu kỳ | Báo lỗi | Chặn | Đạt | UT-21 |
| 11 | Ngày kết thúc dòng > ngày kết thúc kỳ | Báo lỗi | Chặn | Đạt | UT-22 |
| 12 | Bắt đầu dòng > kết thúc dòng | Báo lỗi | Chặn | Đạt | UT-20 |
| 13 | Ngày dòng nằm trong kỳ | Cho phép | Cho phép | Đạt | |
| 14 | Ngày không hợp lệ (31/02, sai định dạng) | Ô `type="date"` của trình duyệt không cho nhập ngày không tồn tại; nhập dở thì giá trị rỗng → báo "Vui lòng chọn…" | Trả 400 nhưng **thông báo tiếng Anh kỹ thuật** ("The JSON value could not be converted…") | **Thiếu (nhỏ)** | P2 |
| — | *(bổ sung)* Năm vô lý (0001, 9999) | Ô ngày cho nhập năm tùy ý | Chấp nhận | **Thiếu** | P8. Xem V-07 |

### 2.3 Thành phẩm

| # | Ca | Frontend | Backend | Hiện trạng | Ghi chú |
|---|---|---|---|---|---|
| 1 | Không có thành phẩm | Báo "Kế hoạch phải có ít nhất một thành phẩm." | Chặn | Đạt | |
| 2–3 | Một / nhiều thành phẩm | Cho phép | Cho phép | Đạt | IT-01 (25 thành phẩm) |
| 4 | Thêm trùng | Ô tìm **ẩn** thành phẩm đã chọn | Chặn "Mỗi thành phẩm chỉ được có một dòng…" | Đạt | |
| 5–6 | Tìm theo mã / tên | API tra cứu tìm cả mã và tên | — | Đạt | `SearchProductionProductsQuery` |
| 7 | Tìm không có kết quả | "Không tìm thấy hàng hóa phù hợp" | — | Đạt | |
| 8 | Hàng ngừng kinh doanh | Ô tìm không trả hàng `is_active = false` | Chặn "Vui lòng chọn thành phẩm đang hoạt động." | Đạt, **cần bổ sung** | (a) Thông báo không nói thành phẩm nào; (b) hàng bị ngừng **sau khi** đã có trên kế hoạch thì Gửi duyệt không kiểm lại, chỉ tới lúc lập lệnh mới lỗi. Xem V-08 |
| 9 | Không phải thành phẩm sản xuất được | Ô tìm chỉ lọc `FINISHED` | **Không kiểm loại hàng** — NVL lưu được qua API (P7) | **Thiếu** + **Cần quyết định** | Hệ thống có `FINISHED`, `RAW_MATERIAL` và (frontend admin) `SEMI_FINISHED`. Chưa chốt loại nào được sản xuất. Xem Q-V2 |
| 10 | Xóa một dòng | Xóa đúng theo mã thành phẩm | Xóa dòng không còn trong request | Đạt | Kế hoạch đã duyệt: không xóa được dòng đã có lệnh (PP-39) |
| 11 | Xóa dòng cuối cùng | Không cho lưu khi rỗng | Chặn | Đạt | |

### 2.4 Số lượng

| # | Ca | Frontend | Backend | Hiện trạng | Ghi chú |
|---|---|---|---|---|---|
| 1 | Để trống số lượng — "báo lỗi khi gửi duyệt" | Báo lỗi ngay **khi lưu** | Chặn khi lưu | **Cần quyết định** | Khác kỳ vọng. Xem Q-V3. Thông báo hiện tại là "phải lớn hơn 0…", nên đổi thành "Vui lòng nhập số lượng." cho ô trống |
| 2 | = 0 | Báo lỗi | Chặn | Đạt | |
| 3 | Âm | Báo lỗi | Chặn | Đạt | |
| 4 | Thập phân ≤ 2 chữ số | Cho phép (nhận cả `,` lẫn `.`) | Cho phép | Đạt | |
| 5 | 3 chữ số thập phân | Báo lỗi | Chặn | Đạt | |
| 6 | Nhập chữ | Báo lỗi (`NaN`) | Không nhận được (frontend chặn) | Đạt, **có lỗi nhỏ** | `1e3` được hiểu là 1000 (ký hiệu khoa học lọt qua) |
| 7 | Vượt `DECIMAL(18,2)` | **Không chặn**; số > 9.007.199.254.740.991 còn bị JavaScript làm tròn sai | **Lỗi 500** (E2); số nhỏ hơn nhưng đủ lớn gây tràn nhu cầu NVL → 500 khi lập lệnh (E3) | **Sai** | Xem V-04 |
| 8 | Có khoảng trắng | Bỏ mọi khoảng trắng: `"1 000"` → 1000 | — | Đạt | |
| 9 | Hợp lệ | Cho phép | Cho phép | Đạt | |
| 10 | Xóa số sau khi nhập | Kiểm lại ngay (form tính lại lỗi mỗi lần đổi) | — | Đạt | |
| — | *(bổ sung)* `1.000` (ý là một nghìn) | Hiểu thành **1** | — | **Sai (E6)** | Xem V-05 |

### 2.5 Nghiệp vụ khi lưu và gửi duyệt

| # | Ca | Hiện trạng | Ghi chú |
|---|---|---|---|
| 1 | Lưu kế hoạch hợp lệ | Đạt | PP-11 |
| 2 | Lưu kế hoạch thiếu BOM | Đạt | Lưu nháp kèm cảnh báo (BR-PP-09), PP-12 |
| 3 | Lưu thiếu số lượng "có thể lưu nháp" | **Cần quyết định** | Hiện **không** cho lưu. Xem Q-V3 |
| 4 | Gửi duyệt thiếu tên | Đạt (gián tiếp) | Không lưu được kế hoạch thiếu tên nên không thể gửi. Gửi duyệt **không kiểm lại** toàn bộ dữ liệu; nếu sau này nới quy tắc lưu nháp thì phải thêm |
| 5 | Gửi duyệt không có sản phẩm | Đạt | Handler kiểm số dòng |
| 6 | Gửi duyệt có dòng số lượng 0 | Đạt (gián tiếp) | Như ca 4 |
| 7 | Gửi duyệt khi có thành phẩm không có BOM | Đạt | PP-13 |
| 8 | Không có quyền tạo | Đạt | PP-01, IT-15 |
| 9 | Không có quyền gửi duyệt | Đạt một phần + **Cần quyết định** | Không có quyền "gửi duyệt" riêng: ai sửa được thì gửi được. Ai có chức năng Kế hoạch SX đều **sửa và gửi duyệt được kế hoạch nháp của người khác**, trong khi hủy thì chỉ người lập. Xem Q-V4 |
| 10 | Gửi duyệt lại kế hoạch đã gửi | Đạt | PP-16, UT-35 |
| 11 | Sửa kế hoạch đã duyệt | Đạt | Theo Q5: Manager sửa hạn chế (PP-36..41). Chưa lưu vết ai sửa, lúc nào (G3) |
| 12 | Hủy kế hoạch đã có lệnh | Đạt | Chặn khi còn lệnh chưa hủy; không xóa lịch sử (PP-42, PP-49) |
| 13 | Hai người cùng sửa | **Thiếu (E4)** | Khóa hiện tại chỉ cho chạy tuần tự, **không phát hiện** bản đã cũ. Xem V-02 |
| 14 | Nhấn Lưu nhiều lần | Frontend: nút khóa khi đang lưu. Backend: **không chống trùng** (E5) | **Thiếu** | Cùng vấn đề ở "Lập lệnh từ kế hoạch" với số lượng nhỏ hơn số còn lại: bấm 2 lần tạo 2 lệnh. Xem V-03 |

## 3. Nhận xét về chính bộ ca kiểm thử

| # | Ca | Vấn đề | Đề xuất sửa kỳ vọng |
|---|---|---|---|
| K-1 | 4.1 "Để trống số lượng → báo lỗi khi gửi duyệt" và 6.3 "Lưu thiếu số lượng → có thể lưu nháp" | Mâu thuẫn với BR-PP-03 đã chốt ngày 14/11 ("mỗi dòng số lượng > 0") và cột `planned_quantity NOT NULL` | Giữ "báo lỗi khi lưu" (khuyến nghị), hoặc chốt lại Q-V3 |
| K-2 | 2.9 "Kỳ trong quá khứ → cảnh báo, yêu cầu lý do" | Quy tắc mới; chưa rõ "lý do" lưu ở đâu, kiểm lúc nào | Xem Q-V1 |
| K-3 | 1.4, 1.7 "Báo lỗi **hoặc** giới hạn nhập" | Không kiểm được vì có hai kết quả chấp nhận | Ghi rõ: frontend giới hạn ô nhập, backend trả lỗi khi gọi thẳng API |
| K-4 | 3.4, 3.8 "Cảnh báo **hoặc** không cho…" | Như trên | Ghi rõ: không cho thêm (ô tìm không hiện) + backend chặn |
| K-5 | 3.9 "Không phải thành phẩm có thể sản xuất" | Chưa định nghĩa "có thể sản xuất" | Theo Q-V2 |
| K-6 | 6.13 "Phát hiện xung đột" | Thiếu kết quả cụ thể cho người lưu sau | "Người lưu sau nhận thông báo kế hoạch đã bị người khác sửa, tải lại; không ghi đè" |
| K-7 | Thiếu nhóm 5 | Danh sách nhảy từ nhóm 4 sang nhóm 6 | Kiểm tra lại có bỏ sót nhóm (ví dụ kho nhận, nhu cầu NVL, lập lệnh từ kế hoạch) |
| K-8 | Chưa có ca | Kho nhận thành phẩm; lập lệnh từ kế hoạch (vượt số còn lại, hạn hoàn thành); số lượng `1.000`; ngày năm 0001 / 9999 | Bổ sung theo mục 4 |

## 4. Validation cần bổ sung

| Mã | Nội dung | Nơi sửa | Liên quan | Cần quyết định trước? |
|---|---|---|---|---|
| V-01 | Ngày kỳ và ngày dòng **bắt buộc có trong request**; thiếu → "Vui lòng chọn kỳ kế hoạch / ngày…" | Backend: đổi kiểu ngày trong `SaveProductionPlanRequest` / `SaveProductionPlanItemInput` sang `DateOnly?` + `NotNull()` trong validator | E1, 2.2#1–2 | Không |
| V-02 | Phát hiện sửa đồng thời: chi tiết kế hoạch trả một **mã phiên bản**; khi sửa / gửi duyệt / duyệt, client gửi lại; khác thì báo "Kế hoạch đã được người khác cập nhật, vui lòng tải lại" | Backend + frontend | E4, 6.13 | **Có** — chọn cách (Q-V5) |
| V-03 | Chống tạo trùng khi bấm nhiều lần: (a) frontend khóa thêm bằng `useRef`; (b) backend nhận mã yêu cầu `clientRequestId` (cách màn POS đang làm) | Frontend (a); backend (b) | E5, 6.14 | (a) không; (b) **có** — cần nơi lưu mã (Q-V6) |
| V-04 | Giới hạn số lượng tối đa mỗi dòng (đề xuất 999.999.999,99) ở cả frontend và backend; và kiểm **nhu cầu NVL tính ra không vượt `numeric(18,2)`** trước khi lưu lệnh, trả lỗi rõ thay vì 500 | Backend validator kế hoạch + `ProductionOrderRules` (dùng chung với UC-59); frontend `validatePlanForm`, `CreateOrderFromPlanModal` | E2, E3, 4#7 | **Có** — con số tối đa (Q-V7). Phần chống 500 thì không |
| V-05 | Nhập số lượng kiểu Việt Nam: chỉ chấp nhận **một** dấu thập phân; nếu chuỗi giống phân cách hàng nghìn (`1.000`, `12.500`) thì báo "Số lượng không rõ: dùng dấu phẩy cho phần thập phân" hoặc hiện giá trị đã hiểu ngay dưới ô; chặn ký hiệu khoa học (`1e3`) | Frontend (`productionPlanFormat.ts`, không đụng `parseQty` dùng chung) | E6, 4#6 | Không (chọn cách hiển thị) |
| V-06 | Ô số lượng trống → thông báo "Vui lòng nhập số lượng." | Frontend | 4#1 | Không |
| V-07 | Giới hạn năm hợp lý (đề xuất 2000–2100) cho ngày kỳ và ngày dòng | Backend validator + frontend | P8 | Có — khoảng năm (Q-V8) |
| V-08 | Gửi duyệt kiểm lại thành phẩm còn hoạt động; thông báo lỗi nêu **mã** thành phẩm ngừng hoạt động | Backend `SubmitProductionPlanCommand`, `ProductionPlanRules.ValidateReferencesAsync` | 3#8 | Không |
| V-09 | Chặn loại hàng không sản xuất được ở backend (giữ lọc ở frontend) | Backend `ValidateReferencesAsync` | P7, 3#9 | **Có** (Q-V2) |
| V-10 | Đếm độ dài tên / ghi chú **sau khi trim** ở backend | Backend validator | P9, 1#4 | Không |
| V-11 | Ngày / số sai định dạng: frontend dịch lỗi 400 dạng `$.field` của ASP.NET sang "Dữ liệu ngày hoặc số không đúng định dạng." | Frontend `planErrorText` | P2, 2.2#14 | Không |
| V-12 | Lập lệnh từ kế hoạch: nếu ngày kết thúc dòng đã qua thì **bắt buộc** nhập hạn hoàn thành (hiện tại modal gợi ý một ngày quá khứ rồi backend báo lỗi) | Frontend `CreateOrderFromPlanModal` | Phát hiện thêm | Không |
| V-13 | Kỳ kế hoạch hoàn toàn trong quá khứ: cảnh báo + bắt buộc ghi chú (lý do) | Frontend + backend | 2.2#9 | **Có** (Q-V1) |
| V-14 | Sửa / gửi duyệt kế hoạch nháp chỉ cho người lập hoặc người duyệt (đồng bộ với luật hủy) | Backend `ProductionPlanPermissions` + `actions` | 6#9 | **Có** (Q-V4) |
| V-15 | Lưu nháp cho phép thiếu số lượng; gửi duyệt mới bắt buộc | Backend + frontend | 4#1, 6#3 | **Có** (Q-V3) — đổi BR-PP-03 đã chốt |

## 5. Kế hoạch sửa (chờ cho phép)

### Đợt 1 — lỗi thật, không cần quyết định nghiệp vụ

| Thứ tự | Việc | File dự kiến | Kiểm thử thêm |
|---|---|---|---|
| 1 | V-01 ngày bắt buộc | `DTOs/ProductionPlanDtos.cs`, `Helpers/ProductionPlanRules.cs` (validator), các command dùng `.Value`; frontend không đổi (đã gửi đủ) | API thiếu ngày → 400 tiếng Việt; UT validator |
| 2 | V-04 phần **chống lỗi 500**: kiểm nhu cầu NVL tràn trước khi lưu lệnh | `Helpers/ProductionOrderRules.cs` (ảnh hưởng cả UC-59 — cần nêu trong PR) | P3, P4 → 400 |
| 3 | V-10 trim trước khi đếm | validator | UT tên 150 + dấu cách |
| 4 | V-08 kiểm hàng còn hoạt động khi gửi duyệt, nêu mã | `SubmitProductionPlanCommand.cs`, `ProductionPlanRules.cs` | API: ngừng hàng sau khi lưu → gửi duyệt báo mã |
| 5 | V-05, V-06, V-11, V-12 (frontend) | `utils/productionPlanFormat.ts`, `ProductionPlanFormModal.tsx`, `CreateOrderFromPlanModal.tsx` | lint, build, thử tay |
| 6 | V-03(a) khóa bấm lặp ở frontend | `ProductionPlanFormModal.tsx`, `CreateOrderFromPlanModal.tsx` | thử tay |

Không cần migration. Ước lượng: nhỏ, khoảng 10 file.

### Đợt 2 — cần quyết định trước

| Việc | Phụ thuộc | Có thể cần ERD / migration |
|---|---|---|
| V-02 phát hiện sửa đồng thời | Q-V5 | Có nếu chọn cột `updated_at` (cũng giải quyết G3 lưu vết) ; không nếu dùng mã phiên bản tính từ dữ liệu |
| V-03(b) chống trùng ở backend | Q-V6 | Có (cột `client_request_id` + unique) hoặc chấp nhận chỉ chống ở frontend |
| V-04 giới hạn số lượng tối đa | Q-V7 | Không |
| V-07 khoảng năm | Q-V8 | Không |
| V-09 loại hàng sản xuất được | Q-V2 | Không |
| V-13 kỳ quá khứ cần lý do | Q-V1 | Không (ghi vào `notes`) |
| V-14 chỉ người lập sửa / gửi | Q-V4 | Không |
| V-15 nháp thiếu số lượng | Q-V3 | Không nếu lưu 0 = "chưa nhập"; có nếu muốn cột cho phép rỗng |

### Kiểm thử sẽ bổ sung khi sửa

- Thêm vào `unit-tests/`: thiếu ngày, năm ngoài khoảng, tên trim, số lượng tối đa, (nếu chốt) kỳ quá khứ cần ghi chú.
- Thêm vào `api-tests/`: P1–P9 thành ca kiểm thử chính thức (kỳ vọng mới); lập lệnh từ kế hoạch bấm 2 lần với số lượng nhỏ hơn số còn lại; hai người sửa cùng kế hoạch.

## 6. Câu hỏi cần xác nhận

| # | Câu hỏi | Đề xuất mặc định | Lý do |
|---|---|---|---|
| Q-V1 | Kỳ kế hoạch hoàn toàn trong quá khứ: chỉ cảnh báo, hay bắt buộc nhập lý do? Kiểm lúc lưu, lúc gửi duyệt, hay cả hai? | Cảnh báo + bắt buộc ghi chú khi **lưu và gửi duyệt** nếu ngày kết thúc kỳ < hôm nay | Nháp lập cho tương lai có thể "thành quá khứ" khi chờ lâu, nên kiểm cả lúc gửi |
| Q-V2 | Loại hàng nào được đưa vào kế hoạch: chỉ `FINISHED`, hay cả `SEMI_FINISHED`? | `FINISHED` và `SEMI_FINISHED`; chặn `RAW_MATERIAL` | Bán thành phẩm cũng có BOM và được sản xuất |
| Q-V3 | Có cho lưu nháp khi thiếu số lượng không? | **Không** (giữ BR-PP-03) | DB không cho rỗng; lưu 0 làm lẫn "chưa nhập" với "bằng 0"; form đã báo lỗi ngay |
| Q-V4 | Kế toán SX có được sửa / gửi duyệt kế hoạch nháp **của người khác** không? | Không; chỉ người lập hoặc người có quyền duyệt (giống luật hủy) | Tránh sửa nhầm kế hoạch của người khác |
| Q-V5 | Phát hiện sửa đồng thời bằng cách nào? (a) thêm cột `updated_at`, `updated_by` (cần migration, có thêm lưu vết); (b) mã phiên bản tính từ dữ liệu kế hoạch, không đổi DB | (a) nếu nhóm đồng ý đổi ERD; nếu không thì (b) | (a) đơn giản, giải quyết luôn G3 |
| Q-V6 | Chống tạo trùng ở backend có cần không, hay chỉ khóa nút ở frontend? | Chỉ frontend cho lập kế hoạch (trùng kế hoạch nháp dễ hủy); với lập lệnh từ kế hoạch thì nên có `clientRequestId` | Lệnh trùng ảnh hưởng xuất NVL |
| Q-V7 | Số lượng tối đa mỗi dòng? | 999.999.999,99 | Đủ cho sản xuất; tránh tràn nhu cầu NVL và giới hạn số của JavaScript |
| Q-V8 | Khoảng năm hợp lệ? | 2000–2100 | Chặn năm nhập nhầm |

## 7. Tự kiểm

- **(a) Giả định:** nhóm 5 trong danh sách bị bỏ sót khi dán; các ca "hoặc" được hiểu là chấp nhận một trong hai kết quả.
- **(b) Cần hỏi:** Q-V1..Q-V8.
- **(c) Chỗ không chắc:** ca 6.14 ở frontend: nút đã khóa trong lúc lưu, chưa bấm thử trên trình duyệt để xác nhận không lọt request thứ hai.
- **(d) UC/BR:** UC-PP-02, UC-PP-04, UC-PP-05; BR-PP-02..09, BR-PP-13, BR-PP-20; ảnh hưởng UC-59 (V-04).

## 8. Kết quả triển khai (15/11/2026)

Ninh yêu cầu "làm theo đề xuất": áp dụng **phương án mặc định** của Q-V1..Q-V8 và làm cả đợt 1 lẫn đợt 2.

### 8.1 Quyết định đã áp dụng

| # | Quyết định |
|---|---|
| Q-V1 | Kỳ kết thúc trước hôm nay → bắt buộc ghi chú (lý do), kiểm khi **lưu** và khi **gửi duyệt** |
| Q-V2 | Chỉ `FINISHED`, `SEMI_FINISHED` (hàng chưa có loại coi là thành phẩm); chặn `RAW_MATERIAL` |
| Q-V3 | **Không** cho lưu nháp thiếu số lượng (giữ BR-PP-03) — V-15 không làm |
| Q-V4 | Kế hoạch chưa duyệt: chỉ người lập hoặc người có quyền duyệt được sửa / gửi duyệt / hủy |
| Q-V5 | Thêm cột `trx_production_plans.updated_at`, `updated_by` (lưu vết + mã phiên bản) |
| Q-V6 | Lập kế hoạch: chỉ chặn bấm lặp ở frontend. Lập lệnh từ kế hoạch: `clientRequestId` + cột `trx_production_orders.client_request_id` (unique) |
| Q-V7 | Số lượng tối đa mỗi dòng 999.999.999,99 |
| Q-V8 | Năm hợp lệ 2000 – 2100 |

### 8.2 Trạng thái từng việc

| Mã | Trạng thái | Nơi sửa |
|---|---|---|
| V-01 Ngày bắt buộc | Xong | `ProductionPlanDtos.cs` (ngày `DateOnly?`), validator, các command |
| V-02 Phát hiện sửa đồng thời | Xong | Entity + DbContext + migration `AddPlanAuditAndOrderClientRequestId`; `UpdateProductionPlanCommand` so `ExpectedUpdatedAt`; mọi thao tác ghi gọi `Touch`; frontend gửi `expectedUpdatedAt`, hiện "Cập nhật lần cuối" |
| V-03(a) Chặn bấm lặp ở frontend | Xong | `useRef` trong form kế hoạch, modal lập lệnh, các hộp xác nhận |
| V-03(b) Chống trùng lập lệnh từ kế hoạch | Xong | `CreateProductionOrderFromPlanCommand` (gửi lại cùng mã → trả lệnh cũ), cột + unique index |
| V-04 Giới hạn số lượng, chống lỗi 500 | Xong | Validator kế hoạch; `ProductionPolicy.TryCalculateRequirement` + `MaxStoredQuantity`; `ProductionOrderRules` và `UpdateProductionOrderCommand` (**có ảnh hưởng UC-59**: lập / sửa lệnh trực tiếp nay trả 400 thay vì 500 khi tràn) |
| V-05 Số lượng kiểu Việt Nam | Xong | `parsePlanQty` (`productionPlanFormat.ts`), gợi ý "Hiểu là: …" dưới ô; không đổi `parseQty` dùng chung |
| V-06 Thông báo ô số lượng trống | Xong | `parsePlanQty` |
| V-07 Năm 2000 – 2100 | Xong | Validator + `min` / `max` của ô ngày + `validatePlanForm` |
| V-08 Kiểm lại hàng khi gửi duyệt, nêu mã | Xong | `ProductionPlanRules.ValidatePlanProductsAsync`, `SubmitProductionPlanCommand` |
| V-09 Loại hàng | Xong | `ValidatePlanProductsAsync`; API tra cứu thêm tham số tùy chọn `productTypes`; ô tìm hiện nhãn "Bán TP" |
| V-10 Trim trước khi đếm | Xong | Validator |
| V-11 Dịch lỗi định dạng | Xong | `planErrorText` |
| V-12 Hạn hoàn thành mặc định đã qua | Xong | `CreateOrderFromPlanModal` |
| V-13 Kỳ quá khứ cần lý do | Xong | Validator, `SubmitProductionPlanCommand`, cảnh báo + ô ghi chú bắt buộc ở form |
| V-14 Chỉ người lập / người duyệt | Xong | `ProductionPlanPermissions.CheckEdit / CheckSubmit / CheckCancel` (và `actions`) |
| V-15 Nháp thiếu số lượng | Không làm (Q-V3) | — |
| V-16 Ngày kết thúc không bao giờ trước ngày bắt đầu (bổ sung theo yêu cầu 15/11) | Xong | Backend: validator đã chặn kỳ và dòng (thêm UT-39..41: bằng nhau hợp lệ, trước 1 ngày bị chặn). Frontend `ProductionPlanFormModal`: ô ngày có `min`/`max` theo ngày còn lại; gõ tay vượt ràng buộc thì khi rời ô đặt ngày kết thúc = ngày bắt đầu và cảnh báo; ngày các dòng được kéo vào trong kỳ khi rời ô ngày của kỳ (không làm trong `onChange` để tránh phá dữ liệu lúc đang gõ năm) |

### 8.3 Kiểm thử

| Bộ | Kết quả |
|---|---|
| Unit (`unit-tests/`) | **79/79** đạt (57 cũ, sửa UT-26 theo giới hạn mới, thêm 22 ca) |
| API Phase 2 + 4 chạy lại (`pptest.ps1`, `pptest2.ps1`, `pptest3.ps1`) | **74/74** đạt (PP-07 đổi điều kiện so khớp theo thông báo mới có mã hàng) |
| API validation mới (`pptest4.ps1`, VT-01..22) | **22/22** đạt: thiếu ngày, ngày 31/02, năm 0001/9999, số 1e17, tràn nhu cầu (từ kế hoạch và lập lệnh trực tiếp), tên trim, NVL bị chặn, bán thành phẩm được, kỳ quá khứ (lưu + gửi duyệt), chỉ người lập sửa / gửi, hai người sửa (người sau bị từ chối, không ghi đè), hàng ngừng hoạt động khi gửi duyệt, chống trùng lập lệnh (đồng thời + gửi lại + mã dùng cho kế hoạch khác) |
| Migration mới | Lên / xuống / lên lại đạt trên DB tạm |
| Log API | 0 unhandled exception; 0 deadlock / vi phạm unique |
| Backend build (Release) | 0 lỗi, 0 cảnh báo. Không build được bản Debug vì **API của Ninh đang chạy debug trong Visual Studio** (PID 18496, cổng 5000) khóa file |
| Frontend | `tsc` 0 lỗi mới; `eslint` file sửa 0 lỗi; `npm run lint` 238 = đường cơ sở; `npm run build` 46/46 |

### 8.4 Lưu ý

- Khi Ninh khởi động lại API trong Visual Studio, migration mới (`20261115032001_AddPlanAuditAndOrderClientRequestId`) tự chạy vào `stockflow_dev`: thêm 3 cột cho phép rỗng + 1 unique index có điều kiện, không đổi dữ liệu cũ.
- Tài liệu ERD (`database/stockflow.sql`, PlantUML) chưa có các cột mới.
- Kiểm thử API dùng ngày tương đối (hôm nay + N); `pptest.ps1` / `pptest3.ps1` còn dùng kỳ cố định 15/11 – 31/12/2026 nên sau 31/12/2026 sẽ vướng Q-V1 (kỳ quá khứ) — cần đổi sang ngày tương đối khi chạy lại năm sau.
