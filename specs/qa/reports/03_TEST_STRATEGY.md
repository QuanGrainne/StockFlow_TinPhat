# 03 – Test Strategy

- **Dự án:** StockFlow (SEP490-G82). **Ngày lập:** 19/11/2026. **Người phụ trách:** Ninh (dùng Claude Code).
- **Giai đoạn:** Phase 2 – Test Strategy & Test Design.
  - Chưa viết code test, chưa chạy test, chưa cài package.
  - Mọi trạng thái hiện là "Not Run", "Blocked" hoặc "Skipped".
- **Tài liệu đi kèm:**

| Tài liệu | Nội dung |
|---|---|
| [01_SYSTEM_DISCOVERY.md](01_SYSTEM_DISCOVERY.md) | Khảo sát hệ thống, kèm các phụ lục 01a – 01d |
| [02_REQUIREMENT_TRACEABILITY_MATRIX.md](02_REQUIREMENT_TRACEABILITY_MATRIX.md) | Ma trận truy vết |
| [04_TEST_CASES_SUMMARY.md](04_TEST_CASES_SUMMARY.md) | Thống kê test case |
| [../test-cases/](../test-cases/) | 204 test case đủ trường, kèm bản CSV |
| [../test-design/](../test-design/) | Dữ liệu và script sinh tài liệu |

---

## 1. Mục tiêu và căn cứ

1. **Mục tiêu:** xác minh StockFlow đúng với Report 3 về:
   - nghiệp vụ;
   - toàn vẹn dữ liệu kho, công nợ, sản xuất;
   - phân quyền, cô lập kho;
   - các ngưỡng phi chức năng ghi trong mục 4.2.
2. **Căn cứ kết quả mong đợi**, theo thứ tự ưu tiên:
   1. Report 3 bản sửa ngày 19/11/2026 (quyết định D1 – D3, O1 – O4 trong [01d](01d_REPORT3_CHANGES.md)).
   2. Kết luận đối chiếu code trong [01a](01a_UC_DOC_SPEC_CODE_MATRIX.md).
   3. Thư mục `specs/` chỉ dùng để tham khảo (đã cũ hơn Report 3).

   Chỗ tài liệu không quy định thì test case ghi "theo code, cần nhóm xác nhận", ví dụ UT-COST-004 và IT-RET-005.
3. **Không sửa code hay tài liệu để test đạt.** Khi lệch thì ghi lỗi hoặc nghi vấn, rồi chờ nhóm quyết định.

## 2. Phạm vi

| Trong phạm vi | Ngoài phạm vi |
|---|---|
| 17 module của [01 mục B](01_SYSTEM_DISCOVERY.md), 105 UC (UC-01 – UC-105), 61 dòng BR, 17 NFR, 7 luồng liên module, 200 endpoint | UC-34, UC-42, UC-75, UC-76, UC-81, BR-20, BR-28 (đã bỏ ngày 19/11; ca API-OOS-001 = Skipped) |
| Backend .NET 9, frontend Next.js 16, PostgreSQL | Thiết bị quét mã vạch, mobile, MISA, VAT, hoá đơn điện tử (Report 3 mục 5.3) |
| Phân quyền, cô lập kho, đồng thời, rollback, hiệu năng theo ngưỡng 4.2.2 | Kiểm thử xâm nhập ngoài môi trường được phép; tải thật trên VPS triển khai |

Các UC đã "Chưa có code" vẫn có test case nhưng ở trạng thái **Blocked** kèm lý do, để báo cáo phạm vi chưa đạt cho trung thực:
- UC-26 (QR thanh toán).
- UC-78 (cảnh báo hạn dùng).
- UC-86 – UC-90 (báo cáo, dashboard).
- BR-49 (nhật ký kiểm toán).

## 3. Các cấp test

| Cấp | Đối tượng | Cách làm | Số test case |
|---|---|---|---:|
| **Unit** | Domain thuần (`CostingPolicy`, `ProductionPolicy`, `MrpPolicy`), chuyển trạng thái `Can*` / `Mark*`, validator FluentValidation, định dạng mã chứng từ | Không database, không mock tầng dữ liệu | 36 |
| **Integration** | Handler + `StockFlowDbContext` + PostgreSQL thật | Database tạm dựng bằng migration; kiểm dữ liệu sau commit, rollback, đồng thời, cô lập kho. **Không dùng EF InMemory** | 63 |
| **API** | HTTP thật vào API | Mã trạng thái, thông báo (MSG), schema, tác dụng lên database; ma trận 401 / 403 tham số hoá cho mọi endpoint | 64 |
| **System / E2E** | Frontend + API + database | Thao tác như người dùng theo vai trò; mỗi kịch bản kiểm giao diện, API và database; 7 luồng liên module; phi chức năng | 31 |
| **Regression** | Tái hiện nghi vấn N-xx, bộ hồi quy theo module | Chạy trước và sau khi sửa | 10 |

Số liệu chi tiết: [04](04_TEST_CASES_SUMMARY.md).

**Bộ có sẵn** (MRP 38 + 37 ca, kế hoạch sản xuất 79 + 101 ca):
- Mỗi bộ được tính là **một** test case đại diện.
- Phase 3 / 5 chuyển các bộ này vào bộ test chung, không viết lại.

## 4. Công cụ (chờ duyệt Q1)

Theo quy tắc dự án (`.claude/rules/00-principles.md` mục 4), **mọi package mới phải được nhóm duyệt**.

| Cấp | Đề xuất (cần duyệt) | Phương án nếu không duyệt (không thêm package) |
|---|---|---|
| Unit | Project `StockFlow_Backend/tests/StockFlow.UnitTests` dùng **xUnit**, có trong `StockFlow.sln` | Chương trình console như `specs/mrp/unit-tests` |
| Integration | Project `StockFlow.IntegrationTests` (**xUnit**), dùng `StockFlowDbContext` thật với PostgreSQL tại máy | Như trên, console + database tạm |
| API | **`Microsoft.AspNetCore.Mvc.Testing` 9.x** (WebApplicationFactory + HttpClient) trong `StockFlow.ApiTests` | Script PowerShell gọi API Release ở cổng 5196 (như `mrptest.ps1`) |
| System / E2E | **`@playwright/test`** trong `StockFlow_Frontend/e2e` (hoặc `tests/e2e`) | Chạy tay theo kịch bản trong `test-cases`, chụp màn hình làm bằng chứng |
| Hiệu năng | Đo thời gian bằng script PowerShell / Playwright. NFR-PERF-05 (100 người dùng) cần công cụ tải; chờ duyệt | NFR-PERF-05 giữ Blocked |

**Không dùng:**
- Testcontainers, vì máy dev không có Docker.
- EF InMemory cho integration.
- Thư viện mock cho tầng dữ liệu. FluentAssertions và Moq là tuỳ chọn, chỉ thêm nếu nhóm duyệt.

## 5. Môi trường test

**Database:** PostgreSQL 18.6 tại máy. Mỗi lượt chạy dùng **một database tạm** `stockflow_qa_<thời điểm>`:
- Dựng bằng `dotnet ef database update` hoặc để API tự migrate.
- Xoá database sau khi chạy.
- Script đặt biến môi trường theo kiểu `specs/production-planning-implementation/api-tests/env.ps1`, và **từ chối `stockflow_dev`**.

**Backend:**
- Build `dotnet build -c Release`.
- Chạy `bin/Release/net9.0/StockFlow.API.dll` ở cổng 5196 với `ConnectionStrings__StockFlowDb` trỏ database tạm.
- Không dùng cổng 5000 (API đang debug của người dùng).

**Frontend:**
- Build `npm run build` với `NEXT_PUBLIC_API_URL` trỏ API test và `NEXT_PUBLIC_DEV_AUTO_LOGIN=false`.
- Chạy `npm start` ở cổng 3100 (không dùng 3000 của `next dev`).

**Giờ:**
- Cố định múi giờ máy test là `SE Asia Standard Time` (UTC+7), vì database lưu giờ Việt Nam không kèm múi giờ.
- Ca biên ngày (00:00, cuối tháng, tuần ISO) chạy với ngày tương đối so với hôm nay, như `mrptest.ps1`.

**Dọn dẹp:** xoá database tạm và dừng đúng tiến trình đã khởi động (theo PID), không đụng tiến trình khác.

## 6. Dữ liệu test

1. **Từ seeder:**
   - 5 vai trò, 5 tài khoản: `admin`, `manager01`, `sales01`, `whstaff01`, `prodstaff01`.
   - Kho K001 – K004 (id 3 – 6).
   - Mật khẩu `TinPhat@2026`.
2. **Tạo riêng cho từng nhóm ca:**
   - Hàng hoá, NVL, BOM, khách hàng, NCC, tồn đầu tạo qua API hoặc handler.
   - Mã có tiền tố riêng (`QA-<mã ca>-…`) để các ca không ảnh hưởng nhau và không phụ thuộc thứ tự chạy.
3. **Quyền kho:** tài khoản thử quyền kho (U1 chỉ K001, U2 chỉ K002) do Admin tạo ở bước chuẩn bị.
4. **Ca đồng thời:** gửi request song song thật (nhiều HttpClient / runspace), lặp nhiều lần (ví dụ 20 lần) để giảm may rủi.
5. **Bộ dữ liệu hiệu năng:** cần nhóm chốt quy mô "dataset dự kiến" (mục 4.2.2 không ghi số). Đề xuất: 10.000 hàng hoá, 2.000 khách hàng, 50.000 dòng thẻ kho.

## 7. Thiết kế test case

- **Kỹ thuật:** phân lớp tương đương, giá trị biên, bảng quyết định, chuyển trạng thái, kiểm thử âm, đoán lỗi, đồng thời, bảo mật, theo rủi ro. Số ca theo từng kỹ thuật: [04 mục 4](04_TEST_CASES_SUMMARY.md).
- **Trường của mỗi test case:** ID, tên, module, Requirement ID, Use Case ID, loại, ưu tiên, kỹ thuật, API, điều kiện trước, dữ liệu, bước, kết quả mong đợi, kết quả thực tế, trạng thái, bằng chứng, ghi chú.
- **Mức ưu tiên:**

| Mức | Định nghĩa |
|---|---|
| Critical | Sai dữ liệu kho, tài chính, hoặc phá nghiệp vụ chính |
| High | Chức năng quan trọng không chạy |
| Medium | Sai trong một số điều kiện |
| Low | Giao diện, ít ảnh hưởng |

- **Thứ tự thực thi theo rủi ro:**
  1. Toàn vẹn tồn kho và công nợ.
  2. Đồng thời.
  3. Phân quyền và cô lập kho.
  4. Luồng liên module.
  5. Từng module.
  6. Phi chức năng.

## 8. Tiêu chí vào / ra

| Phase | Vào | Ra |
|---|---|---|
| 3 Unit | Q1 đã trả lời; bộ test case được duyệt | Mọi ca Unit đã chạy; Failed có defect |
| 4 Integration | Hạ tầng database tạm chạy được | Mọi ca Critical / High đã chạy |
| 5 API | Ma trận quyền mặc định được nhóm chốt (nghi vấn N-07) | API-SEC-001 / 003 chạy hết 200 endpoint |
| 6 System | Frontend build được với API test | 7 luồng liên module đã chạy |
| 7 Regression | Có defect đã sửa | Bộ hồi quy của module bị ảnh hưởng đạt |
| 10 Nghiệm thu | Tất cả phase trên | Không còn defect Critical / High mở; ≥ 95% ca Critical / High đã chạy và đạt; mọi Blocked / Skipped có lý do được nhóm chấp nhận |

## 9. Quản lý lỗi

1. **Nghi vấn và lỗi khác nhau:**
   - Nghi vấn (**N-xx**, [04 mục 7](04_TEST_CASES_SUMMARY.md)) là điểm thấy khi đọc code.
   - Nghi vấn chỉ thành lỗi (**D-xx**, ghi vào `10_DEFECT_REPORT.md`) khi đã chạy và tái hiện được.
2. **Mỗi lỗi ghi:** ID, tiêu đề, module, severity, priority, môi trường, điều kiện trước, bước tái hiện, kết quả mong đợi / thực tế, bằng chứng (response, ảnh, truy vấn database), nguyên nhân nếu biết, test case liên quan, trạng thái, đề xuất sửa.
3. **Không tự sửa code nghiệp vụ.** Lỗi được báo cho người phụ trách module. Sửa xong thì chạy ca tái hiện (RT-Nxx) và bộ hồi quy của module.

## 10. Bộ hồi quy theo module

| Khi sửa | Chạy lại |
|---|---|
| Bán hàng / POS | `*-POS-*`, `*-BKG-*`, `*-CRD-*`, IT-CONC-001/002/003, IT-SAL-*, ST-SAL-*, ST-RET-001, API-SEC-003 |
| Nhập hàng / đặt hàng nhập / NCC | `*-GR-*`, `*-PO-*`, `*-PR-*`, `*-SUP-*`, UT-COST-*, ST-PUR-*, ST-MRP-001 |
| Tồn kho (ledger, chuyển kho, kiểm kê, huỷ hàng) | IT-INV-*, IT-TRF-*, IT-STK-*, IT-DSP-*, IT-CONC-003/004, ST-TRF-001, ST-INV-001, toàn bộ ca có kiểm "Σ thẻ kho = tồn" |
| Sản xuất / kế hoạch / MRP | UT-PRD-*, UT-STS-005/006, UT-MRP-001, UT-PLN-001, IT-PRO-*, IT-MRP-001, API-PLN-*, API-MRP-*, ST-PRO-001, ST-MRP-001 |
| Phân quyền / tài khoản / quyền kho | API-SEC-*, IT-SEC-*, API-ACC-*, API-ROLE-*, ST-RBAC-* |
| Tài chính / công nợ | IT-FIN-*, IT-CONC-005, ST-FIN-001, ca POS có công nợ |

## 11. Báo cáo

Theo phase: 05 Integration, 06 API, 07 System, 08 Unit, 09 Regression, 10 Defect, 11 Final.
- **Số liệu tách theo loại:** Total / Passed / Failed / Blocked / Skipped / Not Run.
- **Độ phủ tách riêng:** yêu cầu, UC, API, test case đã chạy, code coverage. Không dùng code coverage thay độ phủ yêu cầu.
- **Kết quả thực tế và bằng chứng** ghi theo ID test case, nằm trong báo cáo thực thi. Nguồn dữ liệu test case (`test-design/data`) chỉ chứa thiết kế.

## 12. Câu hỏi và giả định

| # | Nội dung | Đề xuất mặc định |
|---|---|---|
| Q1 | Duyệt package: xUnit, `Microsoft.AspNetCore.Mvc.Testing` 9.x, `@playwright/test`; công cụ tải cho NFR-PERF-05 | Duyệt 3 package đầu; công cụ tải để sau |
| Q6 | Ma trận quyền mặc định lệch Report 3 (N-07): theo tài liệu hay theo code? | Theo tài liệu (mục 2.1); sửa `GetDefaultPermissionCodes` |
| Q7 | Quy mô bộ dữ liệu hiệu năng | Như mục 6.5 |
| Q8 | Hành vi khi trả hàng quá thời hạn cài đặt (IT-RET-005); lô sau chuyển kho (RT-N15); MAC khi tồn âm (UT-COST-004) | Ghi nhận theo code, nhóm xác nhận khi xem kết quả |
| Q9 | Quy trình sao lưu / khôi phục của bản triển khai (ST-NFR-007) | Người phụ trách deploy cung cấp |

**Giả định:**
- Tài khoản và quyền mặc định lấy từ seeder.
- Report 3 bản sửa ngày 19/11 là căn cứ, dù file trong `docs` chưa được thay (Word đang mở file) và Google Doc chưa cập nhật.
